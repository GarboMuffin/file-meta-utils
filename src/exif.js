// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

const utils = require('./utils');
const tiff = require('./tiff');

// Reference materials:
// https://www.cipa.jp/std/documents/e/CIPA_DC-X008-Translation-2016-E.pdf
// https://www.media.mit.edu/pia/Research/deepview/exif.html

/**
 * @typedef {import('./tiff').Ifd} Exif
 */

/**
 * @param {Uint8Array} data
 * @returns {Exif|null}
 */
const decodeExif = (data) => {
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

    try {
        checkHeader();

        const tiffData = data.subarray(ptr);
        const decodedTiff = tiff.decodeTiff(tiffData);
        const ifd0 = decodedTiff.ifds[0];
        if (!ifd0) return null;

        const exifIfdEntry = ifd0.entries.find(i => i.tag === 0x8769);
        if (!exifIfdEntry) return null;

        const exifIfdOffset = exifIfdEntry.value[0];
        if (typeof exifIfdOffset !== 'number') return null;

        const exifIfd = tiff.decodeIfd(tiffData, exifIfdOffset, decodedTiff.littleEndian);
        return exifIfd;
    } catch (e) {
        utils.addErrorTrace(e, data, ptr);
        throw e;
    }
};

const encodeExif = () => {

};

/**
 * @param {import("./jpg").Jpg} jpg
 * @returns {Exif|null}
 */
const decodeJpgExif = (jpg) => {
    // EXIF is stored in the APP1 segment
    const segment = jpg.segments.find(i => i.type === 0xE1);
    if (!segment) {
        return null;
    }

    return decodeExif(segment.data);
};

/**
 * @param {import("./jpg").Jpg} jpg
 * @param {Exif} exif
 */
const updateJpgExif = (jpg, exif) => {

};

module.exports = {
    decodeExif,
    encodeExif,

    decodeJpgExif,
    updateJpgExif
};
