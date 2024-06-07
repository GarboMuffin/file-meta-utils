// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * @param {Uint8Array} data
 */
const decodeExif = (data) => {
};

const encodeExif = () => {

};

/**
 * @param {import("./jpg").Jpg} jpg
 * @returns {import("./jpg").JpgSegment|null}
 */
const findJpgExifSegment = (jpg) => {
    return jpg.segments.find(i => i.type === 0xE1) || null;
};

module.exports = {
    decodeExif,
    encodeExif,
    findJpgExifSegment
};
