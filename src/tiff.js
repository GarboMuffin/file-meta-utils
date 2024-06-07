// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

const utils = require('./utils');

// Reference materials:
// https://www.cipa.jp/std/documents/e/CIPA_DC-X008-Translation-2016-E.pdf
// https://www.media.mit.edu/pia/Research/deepview/exif.html

/**
 * @typedef {Uint8Array|Int8Array|Uint16Array|Int16Array|Uint32Array|Int32Array|Uint32Array[]|Int32Array[]|Float32Array|Float64Array|string} IfdEntryValue
 */

/**
 * @typedef IfdEntry
 * @property {number} tag
 * @property {number} type
 * @property {IfdEntryValue} value
 */

/**
 * @typedef Ifd
 * @property {IfdEntry[]} entries
 */

/**
 * @typedef Tiff
 * @property {Ifd[]} ifds
 * @property {boolean} littleEndian
 */

// TIFF IFD entry types
const UINT8 = 1;
const ASCII = 2;
const UINT16 = 3;
const UINT32 = 4;
const URATIONAL = 5;
const INT8 = 6;
const UNDEFINED8 = 7;
const INT16 = 8;
const INT32 = 9;
const SRATIONAL = 10;
const SINGLE = 11;
const DOUBLE = 12;

/**
 * @param {number} type See constants above
 * @returns {number} Size in bytes
 */
const getTypeSize = (type) => {
    switch (type) {
        case UINT8: return 1;
        case ASCII: return 1;
        case UINT16: return 2;
        case UINT32: return 4;
        case URATIONAL: return 8;
        case INT8: return 1;
        case UNDEFINED8: return 1;
        case INT16: return 2;
        case INT32: return 4;
        case SRATIONAL: return 8;
        case SINGLE: return 4;
        case DOUBLE: return 8;
    }
    throw new Error(`Unknown type: ${type}`);
};

/**
 * @param {Uint8Array} data
 * @param {number} ptr
 * @param {boolean} littleEndian
 * @returns {Ifd}
 */
const decodeIfd = (data, ptr, littleEndian) => {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    /**
     * @param {number} dataPtr Offset in data
     * @param {number} type See constants
     * @param {number} count How many
     * @returns {IfdEntryValue}
     */
    const readEntryValue = (dataPtr, type, count) => {
        switch (type) {
            case UINT8:
            case UNDEFINED8: {
                const result = new Uint8Array(count);
                for (let i = 0; i < count; i++, dataPtr++) {
                    result[i] = view.getUint8(dataPtr);
                }
                return result;
            }

            case ASCII: {
                // Count includes the null terminator, so subtract 1.
                return utils.decoder.decode(data.subarray(dataPtr, dataPtr + count - 1));
            }

            case UINT16: {
                const result = new Uint16Array(count);
                for (let i = 0; i < count; i++, dataPtr += 2) {
                    result[i] = view.getUint16(dataPtr, littleEndian);
                }
                return result;
            }

            case UINT32: {
                const result = new Uint32Array(count);
                for (let i = 0; i < count; i++, dataPtr += 4) {
                    result[i] = view.getUint32(dataPtr, littleEndian);
                }
                return result;
            }

            case URATIONAL: {
                const result = [];
                for (let i = 0; i < count; i++, dataPtr += 8) {
                    const arr = new Uint32Array(2);
                    arr[0] = view.getUint32(dataPtr, littleEndian);
                    arr[1] = view.getUint32(dataPtr + 4, littleEndian);
                    result.push(arr);
                }
                return result;
            }

            case INT8: {
                const result = new Int8Array(count);
                for (let i = 0; i < count; i++, dataPtr++) {
                    result[i] = view.getInt8(dataPtr);
                }
                return result;
            }

            case INT16: {
                const result = new Int16Array(count);
                for (let i = 0; i < count; i++, dataPtr += 2) {
                    result[i] = view.getInt16(dataPtr, littleEndian);
                }
                return result;
            }

            case INT32: {
                const result = new Int32Array(count);
                for (let i = 0; i < count; i++, dataPtr += 4) {
                    result[i] = view.getInt32(dataPtr, littleEndian);
                }
                return result;
            }

            case SRATIONAL: {
                const result = [];
                for (let i = 0; i < count; i++, dataPtr += 8) {
                    const arr = new Int32Array(2);
                    arr[0] = view.getUint32(dataPtr, littleEndian);
                    arr[1] = view.getUint32(dataPtr + 4, littleEndian);
                    result.push(arr);
                }
                return result;
            }

            case SINGLE: {
                const result = new Float32Array(count);
                for (let i = 0; i < count; i++, dataPtr += 4) {
                    result[i] = view.getFloat32(dataPtr, littleEndian);
                }
                return result;
            }

            case DOUBLE: {
                const result = new Float64Array(count);
                for (let i = 0; i < count; i++, dataPtr += 8) {
                    result[i] = view.getFloat32(dataPtr, littleEndian);
                }
                return result;
            }
        }
        throw new Error(`Unknown type: ${type}`);
    };

    /**
     * @returns {IfdEntry}
     */
    const readEntry = () => {
        const tag = view.getUint16(ptr, littleEndian);
        ptr += 2;

        const type = view.getUint16(ptr, littleEndian);
        ptr += 2;

        const count = view.getUint32(ptr, littleEndian);
        ptr += 4;

        const typeSize = getTypeSize(type);
        const dataByteLength = typeSize * count;

        let dataPtr;
        if (dataByteLength <= 4) {
            // Data fits in the value field
            dataPtr = ptr;
        } else {
            // Data does not fit, so value is actually an offset
            dataPtr = view.getUint32(ptr, littleEndian);
        }
        ptr += 4;

        const value = readEntryValue(dataPtr, type, count);

        return {
            tag,
            type,
            value
        };
    };

    /**
     * @returns {IfdEntry[]}
     */
    const readEntries = () => {
        const entries = [];
        const numEntries = view.getUint16(ptr, littleEndian);
        ptr += 2;

        for (let i = 0; i < numEntries; i++) {
            const entry = readEntry();
            entries.push(entry);
        }

        // Last value in the IFD is offset from TIFF start for the next IFD
        ptr = view.getUint32(ptr, littleEndian);

        return entries;
    };

    try {
        const entries = readEntries();
        return {
            entries
        };
    } catch (e) {
        utils.addErrorTrace(e, data, ptr);
        throw e;
    }
};

/**
 * @param {Uint8Array} data
 * @returns {Tiff}
 */
const decodeTiff = (data) => {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let ptr = 0;

    // Initialized in the try/catch below
    let littleEndian = true;

    const readEndianness = () => {
        // Intel format (little endian), stored as "II" then 2A 00
        if (
            data[0] === 0x49 &&
            data[1] === 0x49 &&
            data[2] === 0x2A &&
            data[3] === 0x00
        ) {
            ptr += 4;
            return true;
        }

        // Motorolla format (big endian), stored as "MM" then 00 2A
        if (
            data[0] === 0x4D &&
            data[1] === 0x4D &&
            data[2] === 0x00 &&
            data[3] === 0x2A
        ) {
            ptr += 4;
            return false;
        }

        throw new Error('Could not read endianness header');
    };

    /**
     * @returns {Ifd[]}
     */
    const readAllIfds = () => {
        const ifds = [];

        // Jump to the first IFD.
        // (This will basically always be 8)
        ptr = view.getUint32(ptr, littleEndian);

        while (ptr != 0) {
            const ifd = decodeIfd(data, ptr, littleEndian);
            ifds.push(ifd);

            const ifdSize = 2 + ifd.entries.length * 12;
            ptr = view.getUint32(ptr + ifdSize, littleEndian);
        }

        return ifds;
    };

    try {
        littleEndian = readEndianness();

        return {
            ifds: readAllIfds(),
            littleEndian
        };
    } catch (e) {
        utils.addErrorTrace(e, data, ptr);
        throw e;
    }
};

/**
 * @param {Tiff} tiff
 * @returns {Uint8Array}
 */
const encodeTiff = () => {

};

module.exports = {
    decodeTiff,
    decodeIfd,
    encodeTiff
};
