# Homepage animation performance — 15 September 2026

The same 240 Blender frames per device variant are delivered as quality-82 WebP, at their original 1280×800 desktop and 640×800 mobile resolution. Desktop is approximately 4.54 MB (previously 13.07 MB); mobile is approximately 2.22 MB (previously 6.56 MB). The hero video is unchanged.

The loader warms up to 12 opening frames with two low-priority requests before the animation approaches the viewport. Within 1400 px it uses up to six concurrent requests, prioritises the current frame, and looks further ahead in the scrolling direction. Downloads outside the new window are cancelled when the visitor jumps ahead or reverses.

Decoded caches are bounded to 40 desktop frames or 32 mobile frames; devices reporting 4 GB or less use 22. This is approximately 156/63 MB of decoded pixel data (plus browser and canvas overhead), rather than decoding the entire sequence. Already-painted frames are not redrawn unnecessarily. A loading indicator is delayed by 450 ms and cleared when the current frame arrives. The final quote card does not depend on frame availability. Reduced-motion and data-saver modes make no sequence requests.

## Updating the animation

1. Render the existing Blender scene using the current build/render scripts. These produce JPEG intermediates, now ignored by Git.
2. Run `node scripts/optimize-journey-frames.mjs` with libwebp's `cwebp` installed. This converts all 480 JPEGs to the published WebP files without resizing. It deliberately leaves intermediates intact for review.
3. Compare representative frames and run `node --test tests/*.test.cjs`.
4. Archive the intermediate JPEGs after review. The previous JPEG set is recoverable under `cutitout-marketing-archive-2026-09-15/animation-jpeg-originals`, beside the project, with `desktop/` and `mobile/` subfolders.
5. Bump the frame URL version in `manufacturing-film.js` and its script version in `index.html` when replacing frame content.

Verification covers forward and reverse travel, cancelled obsolete requests, delayed downloads, early warm-up, breakpoint changes, page restoration, reduced motion/data saver, and the independent final quote card. Local browser checks are not a mobile-network benchmark; real-world performance still depends on connection and device speed.
