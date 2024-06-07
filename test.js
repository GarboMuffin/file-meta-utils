const fs = require('fs');

const FMU = require('.');

const decodedJpg = FMU.jpg.decodeJpg(fs.readFileSync('tests/no-exif.jpg'));
FMU.exif.updateJpgExif(decodedJpg, {
    UserComment: "Test test, does this work? 123 123"
});

const decodedExif = FMU.exif.decodeJpgExif(decodedJpg);
console.log(decodedExif);

const encodedJpg = FMU.jpg.encodeJpg(decodedJpg);
fs.writeFileSync('tests/out.jpg', encodedJpg);
