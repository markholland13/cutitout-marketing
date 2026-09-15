// Run after Blender renders JPEG intermediates: node scripts/optimize-journey-frames.mjs
// Requires the libwebp cwebp encoder. JPEGs are retained until reviewed/archived.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const jobs = ['desktop', 'mobile'].flatMap(variant => Array.from({length:240}, (_, i) =>
    path.join(root, 'static/img/home/journey-film', variant, `frame-${String(i+1).padStart(4,'0')}`)));
// Validate the complete source set before replacing any optimised outputs.
await Promise.all(jobs.map(base => stat(`${base}.jpg`)));
let before = 0, after = 0, index = 0;
await Promise.all(Array.from({length:4}, async () => {
    while (index < jobs.length) {
        const base = jobs[index++];
        await run('cwebp', ['-quiet', '-q', '82', '-m', '6', `${base}.jpg`, '-o', `${base}.webp`]);
        const [input, output] = await Promise.all([stat(`${base}.jpg`), stat(`${base}.webp`)]);
        before += input.size;
        after += output.size;
    }
}));
console.log(`480 frames: ${(before/1e6).toFixed(2)} MB → ${(after/1e6).toFixed(2)} MB (${Math.round((1-after/before)*100)}% smaller).`);
