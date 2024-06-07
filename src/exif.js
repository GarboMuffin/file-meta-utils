// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

const utils = require('./utils');
const tiff = require('./tiff');

// Reference materials:
// https://www.cipa.jp/std/documents/e/CIPA_DC-X008-Translation-2016-E.pdf
// https://www.media.mit.edu/pia/Research/deepview/exif.html

/**
 * @typedef Exif
 * @property {Uint8Array} [ExifVersion]
 * @property {string} [UserComment]
 */

/**
 * @param {Uint8Array} data
 * @returns {Exif}
 */
const decodeExif = (data) => {
    /** @type {Exif} */
    const exif = {};

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let ptr = 0;

    const checkHeader = () => {
        // EXIF also contains a size field in its header. Let's check that it matches what
        // we saw from the containing image.
        const size = view.getUint16(ptr, false);
        if (size !== data.byteLength) {
            throw new Error('EXIF header size does not match actual');
        }
        ptr += 2;

        // Validate 'Exif' header, followed by 2 null bytes
        if (
            data[ptr] != 0x45 ||
            data[ptr + 1] != 0x78 ||
            data[ptr + 2] != 0x69 ||
            data[ptr + 3] != 0x66 ||
            data[ptr + 4] != 0x00 ||
            data[ptr + 5] != 0x00
        ) {
            throw new Error('Exif header mismatch');
        }
        ptr += 6;
    };

    /**
     * @param {import('./tiff').Ifd} ifd
     */
    const readExifIfd = (ifd) => {
        for (const entry of ifd.entries) {
            if (entry.tag === 0x9000 && entry.type === tiff.UNDEFINED8 && entry.value.length === 4) {
                exif.ExifVersion = utils.decoder.decode(entry.value);
            }

            if (entry.tag === 0x9286 && entry.type === tiff.UNDEFINED8) {
                // First 8 bytes indicating the encoding.
                // For our needs it's good enough to just assume unicode.
                exif.UserComment = utils.decoder.decode(entry.value.subarray(8));
            }
        }
    };

    /**
     * @param {Uint8Array} tiffData
     * @param {import('./tiff').Tiff} decodedTiff
     */
    const readTiff = (tiffData, decodedTiff) => {
        if (decodedTiff.ifds.length === 0) {
            return;
        }

        const ifd0 = decodedTiff.ifds[0];
        const exifIfdEntry = ifd0.entries.find(i => i.tag === 0x8769);
        if (
            !exifIfdEntry ||
            exifIfdEntry.type !== tiff.UINT32 ||
            exifIfdEntry.value.length !== 1
        ) {
            return null;
        }

        const exifIfd = tiff.decodeIfd(tiffData, exifIfdEntry.value[0], decodedTiff.littleEndian);
        readExifIfd(exifIfd);
    };

    try {
        checkHeader();

        const tiffData = data.subarray(ptr);
        const decodedTiff = tiff.decodeTiff(tiffData);
        readTiff(tiffData, decodedTiff);

        return exif;
    } catch (e) {
        utils.addErrorTrace(e, data, ptr);
        throw e;
    }
};

/**
 * @param {Exif} exif
 * @returns {Uint8Array}
 */
const encodeExif = (exif) => {
    /** @type {import('./tiff').Ifd} */
    const exifIfd = {
        entries: []
    };

    if (utils.hasOwn(exif, 'ExifVersion')) {
        const encoded = utils.encoder.encode(exif.ExifVersion);
        if (encoded.byteLength !== 4) {
            throw new Error('Invalid ExifVersion size');
        }

        exifIfd.entries.push({
            tag: 0x9000,
            type: tiff.UNDEFINED8,
            value: encoded
        });
    }

    if (utils.hasOwn(exif, 'UserComment')) {
        // We will assume it is just ASCII
        const encoded = new Uint8Array(exif.UserComment.length + 8);

        // ASCII header, null padded to 8 bytes
        encoded[0] = 0x41;
        encoded[1] = 0x53;
        encoded[2] = 0x43;
        encoded[3] = 0x49;
        encoded[4] = 0x49;

        for (let i = 0; i < exif.UserComment.length; i++) {
            encoded[i + 8] = exif.UserComment.charCodeAt(i);
        }

        exifIfd.entries.push({
            tag: 0x9286,
            type: tiff.UNDEFINED8,
            value: encoded
        });
    }

    return tiff.encodeTiff({
        littleEndian: true,
        ifds: [
            {
                entries: [
                    {
                        tag: 0x8769,
                        type: tiff.UINT32,
                        value: exifIfd
                    }
                ]
            }
        ]
    });
};

/**
 * @param {import("./jpg").Jpg} jpg
 * @returns {Exif}
 */
const decodeJpgExif = (jpg) => {
    const segment = jpg.segments.find(i => i.type === 0xE1);
    if (!segment) {
        return {};
    }
    return decodeExif(segment.data);
};

/**
 * @param {import("./jpg").Jpg} jpg Modified in-place.
 * @param {Exif} exif
 * @returns {void}
 */
const updateJpgExif = (jpg, exif) => {
    const segment = jpg.segments.find(i => i.type === 0xE1);
    if (!segment) {
        return;
    }

    const encodedTiff = encodeExif(exif);

    const exifSize = encodedTiff.byteLength + 8; // Size, 'Exif', 2 null bytes
    const exifData = new Uint8Array(exifSize);
    const exifView = new DataView(exifData.buffer, exifData.byteOffset, exifData.byteLength);

    exifView.setUint16(0, exifSize, false);
    exifData[2] = 0x45;
    exifData[3] = 0x78;
    exifData[4] = 0x69;
    exifData[5] = 0x66;
    exifData[6] = 0x00;
    exifData[7] = 0x00;
    exifData.set(encodedTiff, 8);

    segment.data = exifData;
};

module.exports = {
    decodeExif,
    encodeExif,

    decodeJpgExif,
    updateJpgExif
};
