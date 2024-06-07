// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

module.exports = {
    get exif() {
        return require('./src/exif');
    },
    get jpg() {
        return require('./src/jpg');
    },
    get png() {
        return require('./src/png');
    },
    get tiff() {
        return require('./src/tiff');
    },
    get utils() {
        return require('./src/utils');
    }
};
