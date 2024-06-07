// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

/**
 * @param {Uint8Array} data
 * @returns {string}
 */
const formatByteArray = (data) => {
    if (data.length === 0) {
        return '<nil>';
    }

    return Array.from(data)
        .map(i => i.toString(16).toUpperCase().padStart(2, '0'))
        .join(' ');
};

/**
 * @param {Uint8Array} data
 * @param {number} ptr
 * @returns {string}
 */
const trace = (data, ptr) => {
    const prev = data.subarray(Math.max(0, ptr - 5), ptr);
    const next = data.subarray(ptr, ptr + 5);
    return `at ${ptr} (${ptr.toString(16).toUpperCase()}), prev: ${formatByteArray(prev)}, next: ${formatByteArray(next)}`;
};

/**
 * @param {unknown} error May be modified in-place.
 * @param {Uint8Array} data
 * @param {number} ptr
 */
const addErrorTrace = (error, data, ptr) => {
    if (error && typeof error.message === 'string') {
        error.message += ` (${trace(data, ptr)})`;
    }
};

module.exports = {
    addErrorTrace
};
