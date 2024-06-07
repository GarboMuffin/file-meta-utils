const fs = require('fs');

const jpg = require('./src/jpg');
const png = require('./src/png');
const exif = require('./src/exif');

const decodedJpg = jpg.decodeJpg(fs.readFileSync('tests/cat.jpg'));
const encodedJpg = jpg.encodeJpg(decodedJpg);
fs.writeFileSync('tests/cat.out.jpg', encodedJpg);

const decodedPng = png.decodePng(fs.readFileSync('tests/dice.png'));
const encodedPng = png.encodePng(decodedPng);
fs.writeFileSync('tests/dice.out.png', encodedPng);
