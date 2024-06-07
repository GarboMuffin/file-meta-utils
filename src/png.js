// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

const utils = require('./utils');

// Reference material:
// https://en.wikipedia.org/wiki/PNG#File_format

/**
 * @typedef PngChunk
 * @property {string} type 4 character ASCII string indicating type.
 * @property {Uint8Array} data Data inside the chunk, not including length, type, or CRC.
 */

/**
 * @typedef Png
 * @property {PngChunk[]} chunks
 */

const HEADER = new Uint8Array([
    0x89,
    0x50,
    0x4E,
    0x47,
    0x0D,
    0x0A,
    0x1A,
    0x0A
]);

const CRC32_TABLE = new Uint32Array(256);

const computeCrc32Table = () => {
    // It's shorter to just compute these than to include the array.
    if (CRC32_TABLE[0] === 0) {
        // Based on public domain code:
        // https://web.archive.org/web/20150825201508/http://upokecenter.dreamhosters.com/articles/png-image-encoder-in-c/
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) {
                if ((c & 1) === 1) {
                    c = 0xEDB88320 ^ ((c >>> 1) & 0x7FFFFFFF);
                } else {
                    c = ((c >>> 1) & 0x7FFFFFFF);
                }
            }
            CRC32_TABLE[n] = c;
        }
    }
};

/**
 * @param {Uint8Array} data
 * @returns {number}
 */
const computeCrc32 = (data) => {
    computeCrc32Table();
    let c = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        const idx = (c ^ data[i]) & 0xFF;
        c = (c >>> 8) ^ CRC32_TABLE[idx];
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
};

/**
 * @param {Uint8Array} data
 * @returns {Png}
 */
const decodePng = (data) => {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let ptr = 0;

    const checkHeader = () => {
        if (data.byteLength < HEADER.length) {
            throw new Error('Data is too short to fit header');
        }

        if (
            data[0] !== HEADER[0] ||
            data[1] !== HEADER[1] ||
            data[2] !== HEADER[2] ||
            data[3] !== HEADER[3] ||
            data[4] !== HEADER[4] ||
            data[5] !== HEADER[5] ||
            data[6] !== HEADER[6] ||
            data[7] !== HEADER[7]
        ) {
            throw new Error('Header mismatch');
        }

        ptr += 8;
    };

    /**
     * @returns {PngChunk}
     */
    const parseChunk = () => {
        const length = view.getUint32(ptr, false);
        ptr += 4;

        const type = utils.decoder.decode(data.subarray(ptr, ptr + 4));
        ptr += 4;

        const chunkData = data.subarray(ptr, ptr + length);
        ptr += length;

        const crc = view.getUint32(ptr, false);
        ptr += 4;

        return {
            type,
            data: chunkData
        };
    };

    /**
     * @returns {PngChunk[]}
     */
    const parseAllChunks = () => {
        const chunks = [];
        while (ptr < data.byteLength) {
            const chunk = parseChunk();
            chunks.push(chunk);
        }
        return chunks;
    };

    try {
        checkHeader();

        return {
            chunks: parseAllChunks()
        };
    } catch (e) {
        utils.addErrorTrace(e, data, ptr);
        throw e;
    }
};

/**
 * @param {Png} png
 * @returns {Uint8Array}
 */
const encodePng = (png) => {
    let resultLength = 8;
    for (const chunk of png.chunks) {
        resultLength += 12 + chunk.data.byteLength;
    }

    const result = new Uint8Array(resultLength);
    const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
    let ptr = 0;

    result.set(HEADER, 0);
    ptr += HEADER.byteLength;

    for (const chunk of png.chunks) {
        view.setUint32(ptr, chunk.data.byteLength, false);
        ptr += 4;

        const typeAndDataView = result.subarray(ptr, ptr + 4 + chunk.data.length);

        result.set(utils.encoder.encode(chunk.type), ptr);
        ptr += 4;

        result.set(chunk.data, ptr);
        ptr += chunk.data.length;

        const crc = computeCrc32(typeAndDataView);
        view.setUint32(ptr, crc, false);
        ptr += 4;
    }

    return result;
};

/**
 * @param {Png} png
 * @param {string} key Assumed to be Latin-1
 * @returns {PngChunk|null}
 */
const findTextSection = (png, key) => {
    for (const chunk of png.chunks) {
        if (chunk.type !== 'tEXt') {
            continue;
        }

        let matches = true;
        for (var i = 0; i < key.length; i++) {
            if (chunk.data[i] !== key.charCodeAt(i)) {
                matches = false;
                break;
            }
        }

        // Need null terminator
        if (matches && chunk.data[i] === 0) {
            return chunk;
        }
    }

    return null;
};

/**
 * @param {Png} png
 * @param {string} key Assumed to be Latin-1
 * @returns {string|null}
 */
const getText = (png, key) => {
    const section = findTextSection(png, key);
    if (!section) {
        return null;
    }

    let i = 0;
    for (; i < section.data.length && section.data[i] !== 0; i++);

    // Skip null
    i++;

    let string = '';
    for (; i < section.data.length; i++) {
        string += String.fromCharCode(section.data[i]);
    }
    return string;
};

/**
 * @param {Png} png
 * @param {string} key Assumed to be Latin-1
 * @param {string} value Assumed to be Latin-1
 */
const setText = (png, key, value) => {
    const encoded = new Uint8Array(key.length + value.length + 1);
    for (let i = 0; i < key.length; i++) {
        encoded[i] = key.charCodeAt(i);
    }

    for (let i = 0; i < value.length; i++) {
        encoded[key.length + 1 + i] = value.charCodeAt(i);
    }

    let chunk = findTextSection(png, key);
    if (chunk) {
        chunk.data = encoded;
    } else {
        chunk = {
            type: 'tEXt',
            data: encoded
        };
        png.chunks.splice(1, 0, chunk);
    }
};

module.exports = {
    decodePng,
    encodePng,
    getText,
    setText
};
