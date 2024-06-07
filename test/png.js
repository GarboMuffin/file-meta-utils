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

test.test('tEXt chunks', t => {
    const original = fs.readFileSync(path.join(__dirname, 'dangocat.png'));
    const decoded = FMU.png.decodePng(original);

    assert.equal(FMU.png.getText(decoded, 'Test Key'), null);

    FMU.png.setText(decoded, 'Test Key', 'ABC123');
    assert.equal(FMU.png.getText(decoded, 'Test Key'), 'ABC123');
    assert.equal(decoded.chunks.filter(i => i.type === 'tEXt').length, 1);

    FMU.png.setText(decoded, 'Test Key', '123 ABC');
    assert.equal(FMU.png.getText(decoded, 'Test Key'), '123 ABC');
    assert.equal(decoded.chunks.filter(i => i.type === 'tEXt').length, 1);

    FMU.png.setText(decoded, 'Test Key 2', '?');
    assert.equal(FMU.png.getText(decoded, 'Test Key'), '123 ABC');
    assert.equal(FMU.png.getText(decoded, 'Test Key 2'), '?');
    assert.equal(decoded.chunks.filter(i => i.type === 'tEXt').length, 2);

    const reencoded = FMU.png.encodePng(decoded);
    const redecoded = FMU.png.decodePng(reencoded);
    assert.equal(FMU.png.getText(redecoded, 'Test Key'), '123 ABC');
});

test.test('good_text.png', t => {
    const decoded = FMU.png.decodePng(fs.readFileSync(path.join(__dirname, 'good_text.png')));
    assert.equal(FMU.png.getText(decoded, 'Author'), 'Project Nayuki');
    assert.equal(FMU.png.getText(decoded, 'Software'), 'Hex editor');
});
