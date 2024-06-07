// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

const utils = require('./utils');

// Reference material:
// https://en.wikipedia.org/wiki/JPEG#Syntax_and_structure

/**
 * @typedef JpgSegment
 * @property {number} type Second byte in the payload header (0xFF ..)
 * @property {Uint8Array} data All data in the payload, including length
 */

/**
 * @typedef Jpg
 * @property {JpgSegment[]} segments
 */

/**
 * @param {Uint8Array} data
 * @returns {Jpg}
 */
const decodeJpg = (data) => {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let ptr = 0;

    /**
     * @returns {JpgSegment}
     */
    const parseSegment = () => {
        if (view.getUint8(ptr) !== 0xFF) {
            throw new Error('Invalid section signature');
        }

        ptr++;
        const payloadType = view.getUint8(ptr);
        ptr++;

        // Payloads that contain no data
        if (
            // Start of image
            payloadType === 0xD8 ||
            // Restart
            (payloadType >= 0xD0 && payloadType <= 0xD7) ||
            // End of image
            payloadType === 0xD9
        ) {
            return {
                type: payloadType,
                data: new Uint8Array()
            };
        }

        // Payloads with length header
        if (
            // Start of frame (baseline DCT)
            payloadType === 0xC0 ||
            // Start of frame (progressive DCT)
            payloadType === 0xC2 ||
            // Define huffman tables
            payloadType === 0xC4 ||
            // Define quantization tables
            payloadType === 0xDB ||
            // Application specific
            (payloadType >= 0xE0 && payloadType <= 0xEF) ||
            // Comment
            payloadType === 0xFE
        ) {
            const length = view.getUint16(ptr, false);
            ptr += length;
            return {
                type: payloadType,
                data: data.subarray(ptr - length, ptr)
            };
        }

        // Define restart interval is fixed 4 byte length
        if (payloadType === 0xDD) {
            ptr += 4;
            return {
                type: payloadType,
                data: data.subarray(ptr - 4, ptr)
            };
        }

        // Start of scan is followed by entropy-coded data
        if (payloadType === 0xDA) {
            // Length does not include the following entropy-coded data
            const payloadLength = view.getUint16(ptr, false);
            const start = ptr;
            ptr += payloadLength;

            // 0xFF followed by 0xFF means a raw 0xFF in the entropy-coded data.
            // Anything else is a new payload.
            for (; ptr < data.length - 1; ptr++) {
                if (view.getUint8(ptr) === 0xFF) {
                    const markerType = view.getUint8(ptr + 1);
                    // [0xD0, 0xD7] are internal markers within the entropy-coded data
                    // that we won't treat specially
                    if (markerType !== 0x00 && (markerType < 0xD0 || markerType > 0xD7)) {
                        break;
                    }
                }
            }

            return {
                type: payloadType,
                data: data.subarray(start, ptr)
            };
        }

        throw new Error('Unrecognized section header');
    };

    /**
     * @returns {JpgSegment[]}
     */
    const parseAllSegments = () => {
        const sections = [];
        while (ptr < data.byteLength) {
            const next = parseSegment();
            sections.push(next);
        }
        return sections;
    };

    try {
        return {
            segments: parseAllSegments()
        };
    } catch (e) {
        utils.addErrorTrace(e, data, ptr);
        throw e;
    }
};

/**
 * @param {Jpg} jpg
 * @returns {Uint8Array}
 */
const encodeJpg = (jpg) => {
    let resultLength = 0;
    for (const segment of jpg.segments) {
        resultLength += 2 + segment.data.byteLength;
    }

    const result = new Uint8Array(resultLength);

    let ptr = 0;
    for (const segment of jpg.segments) {
        result[ptr] = 0xFF;
        ptr++;

        result[ptr] = segment.type;
        ptr++;

        result.set(segment.data, ptr);
        ptr += segment.data.byteLength;
    }

    return result;
};

module.exports = {
    decodeJpg,
    encodeJpg
};
