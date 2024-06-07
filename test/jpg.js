const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const FMU = require('../index');

test.test('decode and encode', t => {
    const original = fs.readFileSync(path.join(__dirname, 'dangocat.jpg'));
    const decoded = FMU.jpg.decodeJpg(original);
    const reencoded = FMU.jpg.encodeJpg(decoded);
    assert.deepEqual(original, reencoded);
});
