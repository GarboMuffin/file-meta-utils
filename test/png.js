const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const FMU = require('../index');

test.test('decode and encode', t => {
    const original = fs.readFileSync(path.join(__dirname, 'dangocat.png'));
    const decoded = FMU.png.decodePng(original);
    const reencoded = FMU.png.encodePng(decoded);
    assert.deepEqual(original, reencoded);
});
