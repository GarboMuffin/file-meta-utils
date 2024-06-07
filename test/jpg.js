const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const FMU = require('../index');

test.test('decode and encode', t => {
    const dangocat = fs.readFileSync(path.join(__dirname, 'dangocat.jpg'));
    const decoded = FMU.jpg.decodeJpg(dangocat);
    const reencoded = FMU.jpg.encodeJpg(decoded);
    assert.deepEqual(dangocat, reencoded);
});

test.test('read no EXIF', t => {
    const dangocat = fs.readFileSync(path.join(__dirname, 'dangocat.jpg'));
    const jpg = FMU.jpg.decodeJpg(dangocat);
    const exif = FMU.exif.decodeJpgExif(jpg);
    assert.deepEqual(exif, {});
});

test.test('update EXIF', t => {
    const dangocat = fs.readFileSync(path.join(__dirname, 'dangocat.jpg'));
    const jpg = FMU.jpg.decodeJpg(dangocat);

    FMU.exif.updateJpgExif(jpg, {});
    assert.deepEqual(FMU.exif.decodeJpgExif(jpg), {});

    FMU.exif.updateJpgExif(jpg, {
        UserComment: 'Test 123!'
    });
    assert.deepEqual(FMU.exif.decodeJpgExif(jpg), {
        UserComment: 'Test 123!'
    });

    FMU.exif.updateJpgExif(jpg, {
        UserComment: 'Test 1234!'
    });
    assert.deepEqual(FMU.exif.decodeJpgExif(jpg), {
        UserComment: 'Test 1234!'
    });

    const reencoded = FMU.jpg.encodeJpg(jpg);
    const redecoded = FMU.jpg.decodeJpg(reencoded);
    assert.deepEqual(FMU.exif.decodeJpgExif(redecoded), {
        UserComment: 'Test 1234!'
    });
});
