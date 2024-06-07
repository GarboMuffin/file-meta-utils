const fs = require('fs');

const jpg = require('./src/jpg');
const png = require('./src/png');
const exif = require('./src/exif');

const decodedJpg = jpg.decodeJpg(fs.readFileSync('tests/481x361.jpg'));

// exif.updateJpgExif(decodedJpg, {
//     entries: [
//         {
//             tag: 0x9286,
//             type: 7,
//             value: new Uint8Array([
//                 // UNICODE character code, 8 bytes, null byte padded
//                 0x55, 0x4e, 0x49, 0x43, 0x4f, 0x44, 0x45, 0x00,
//                 // The actual data
//                 0x55, 0x4e, 0x49, 0x43, 0x4f, 0x44, 0x45
//             ])
//         }
//     ]
// });

exif.updateJpgExif(decodedJpg, {
    ExifVersion: "IIII",
    UserComment: "Test test, does this work? 123 123"
});

const decodedExif = exif.decodeJpgExif(decodedJpg);
console.log(decodedExif);

const encodedJpg = jpg.encodeJpg(decodedJpg);
fs.writeFileSync('tests/cat.out.jpg', encodedJpg);

// const decodedPng = png.decodePng(fs.readFileSync('tests/dice.png'));
// const encodedPng = png.encodePng(decodedPng);
// fs.writeFileSync('tests/dice.out.png', encodedPng);
