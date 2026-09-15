# Hero video compression — 15 September 2026

The homepage background video has been replaced with a 5,455,566-byte H.264 MP4 (previously 17,999,049 bytes): approximately 70% less to download.

- Full original clip: 647 frames at 30 fps, approximately 21.57 seconds.
- Resolution: 1280×898, down from 1540×1080, preserving the aspect ratio to the nearest even pixel dimension.
- Average target bitrate: 2 Mbps, High profile, keyframes at most two seconds apart.
- No audio track; the homepage always presents this as muted background footage.
- Fast-start layout, with playback metadata before media data.
- The existing dark overlay, poster, pause/play button, reduced-motion and data-saver behaviour remain unchanged.

Matching frames at 3, 10 and 17 seconds were extracted for comparison; the central laser and part remain clear, with some expected softening of fine background detail. This is a lossy web delivery copy, not a replacement for the original recording.

Original recording: `cutitout-marketing-archive-2026-09-15/video-originals/video.mp4`, beside the project. It is recoverable and retains audio and original resolution.

To reproduce on macOS, run `swift scripts/optimize-hero-video.swift SOURCE.mp4 OUTPUT.mp4`. The script refuses to overwrite an existing output. Always encode from the archived original, not the already-compressed website copy. It uses built-in AVFoundation and requires no separate video encoder installation.

When replacing footage again, update the source query version in `index.html` so browsers request the new file.
