# Visual guidelines preview

Preview route: `/guidelines-visual/`. This is a local, noindex preview. The existing guidelines page and homepage have not been replaced or published by this work.

## Design and content

- Six chapters: stencil bridges, internal features, bolt clearance, file preparation, overall part size and a final checklist.
- Eight purpose-built Blender stills with consistent metal materials, real through-cut geometry and studio lighting. These include fragile-connection comparisons and a micro-joint close-up.
- A three-second, user-triggered stencil demonstration. The unconnected centre falls and moves clear so the result can be seen. This is an explanatory animation, not a physics or cutting simulation.
- Side-by-side comparisons remain visible without playing the animation. On small screens they stack; the play control sits directly under the animated example.
- File preparation uses vector diagrams for sharp lines, with keyboard-accessible tabs for cut paths, closed outlines, converting text to shapes, duplicate/overlapping paths and export scale/units.
- The single material/thickness selection updates both the internal-feature limit and the overall part-size limits.
- Numerical reference values match the existing local `guidelines/hole-sizes/`, `guidelines/bolt-hole-sizes/` and `guidelines/part-size-limits/` pages. These are not fetched from the quote service. The page labels them as guide values and directs customers to confirm in their quote.
- Permanent stencil bridges are distinguished from temporary manufacturing micro-joints. Fragile connections are explained without inventing a minimum bridge width.
- All nine material/thickness reference rows are available in an expandable, horizontally scrollable table on this page. The part-size chapter opens that reference directly. Links to the old guideline subpages have been removed from this preview; existing routes remain intact for compatibility.

## Files

- `guidelines-visual/index.html`: page and diagrams.
- `static/css/visual-guidelines.css`: isolated responsive styling.
- `static/css/visual-guidelines-theme.css`: Cut It Out blue-grey palette and shared-header integration. `shared-header.css` now provides the transparent white logo treatment across the marketing site.
- `static/js/visual-guidelines.js`: material controls, tabs, checklist, mobile menu, chapter indicator and optional animation.
- `build_visual_guidelines.py`: reproducible Blender asset builder.
- `visual-guidelines.blend`: editable master with eight named scenes.
- `static/img/guidelines/visual/`: final stills and 36 motion frames.

Build all assets using Blender in background mode with `--python build_visual_guidelines.py -- --stills --details --motion`. Use `--proof` for a stencil lighting proof. The website does not load Blender or any real-time 3D engine.

## Payload and behavior

- Eight still images total 358,819 bytes, excluding the reused logo, fonts and page files. Below-the-fold stills are lazy-loaded.
- Optional animation frames total 727,560 bytes. No animation frame is requested until the visitor presses Play.
- Pause, resume and replay are supported. Animation pauses if the page is hidden or the stencil section leaves view.
- Reduced-motion preference retains the still comparison and suppresses playback. Core guidance remains readable without JavaScript; the native expandable table provides all material values.
- The small mobile chapter strip scrolls horizontally; the document itself does not overflow.

## Verification

- All eight final stills and all 36 animation frames decode successfully.
- Browser checks at 1280 px desktop, 768 px tablet, and 390 px / 320 px phone widths; no document overflow at the tested widths.
- All nine material/thickness combinations produce the expected minimum internal feature and minimum/maximum part sizes.
- Bolt selection updates close and easy-fit results (M6 and M10 checked).
- File tabs respond to click, arrow keys and Home. Only the selected panel is shown.
- Mobile menu opens, closes and dismisses with Escape.
- Four checklist controls update their completion message, without blocking the quote link.
- The animation loads, pauses, resumes and reaches the completed loose-centre state in the browser. No browser warnings or errors were observed during these checks.
- HTML has no duplicate IDs, unresolved internal anchors or missing local links/assets. JavaScript syntax check passes.

This first build is ready for visual review. Production publishing and validation against the live quote service are separate from this preview.

## Brand integration

Following the user's review, the preview retains its spacious layout and Blender imagery while using the existing site's deep blue-grey, mist grey and pale-blue accents. Green remains a success indicator in the example comparisons. The header uses the homepage's logo treatment, shared stylesheet and full navigation (including Cart and account links). It stays available while browsing the guide, and the chapter strip offsets itself beneath the measured header height on desktop and mobile.

## White-logo rollout and added guidance — 15 September 2026

- The transparent white SVG replaces the white-backed black/blue image in all 16 marketing headers, including the homepage, test-home, guideline variants/subpages and standalone mobile header. Shared styling removes the old background/padding and keeps the dark header contrast.
- The offline fallback page also uses the white logo on a dark bar. Its own SVG is included in the standalone deployment folder, referenced from the domain root so nested fallback URLs resolve correctly.
- Browser verification confirmed the logo loads with a transparent background across all marketing pages. No document overflow on those desktop checks; homepage and guide checked at phone widths too.
- New tab keyboard navigation, reference deep-link opening and micro-joint disclosure verified. All internal anchors, tab targets, local links and still images pass validation; JavaScript syntax and diff whitespace checks pass.
- No production deployment or separate quoting-app source change is included. The existing `/guidelines/` route has not been replaced by this preview.
