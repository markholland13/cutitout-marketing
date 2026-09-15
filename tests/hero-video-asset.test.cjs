const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('hero MP4 stays within budget and places playback metadata first', () => {
    const video = fs.readFileSync(path.join(__dirname, '../static/img/home/video.mp4'));
    assert.ok(video.length < 6_000_000, 'Background video should remain under 6 MB');
    const atoms = [];
    for (let offset=0; offset+8<=video.length;) {
        const size = video.readUInt32BE(offset);
        const type = video.toString('ascii', offset+4, offset+8);
        const length = size === 1 ? Number(video.readBigUInt64BE(offset+8)) : size || video.length-offset;
        assert.ok(length >= 8 && offset+length <= video.length, `Valid ${type} atom`);
        atoms.push(type); offset += length;
    }
    assert.ok(atoms.includes('ftyp') && atoms.includes('moov') && atoms.includes('mdat'));
    assert.ok(atoms.indexOf('moov') < atoms.indexOf('mdat'), 'Fast-start MP4 metadata precedes video data');
});
