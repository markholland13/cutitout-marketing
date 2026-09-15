# Customer manufacturing journey

## Story

The visitor follows one sample 600 × 360 × 2 mm flat steel component:

1. A DXF enters the Cut It Out quote interface, and its exact outline appears.
2. An enclosed fibre laser cuts four fixing holes, a slot and the outer contour.
3. The part lifts from a matching opening in the sheet, revealing serrated slats.
4. A conveyor carries it under an abrasive belt and finishing brush.
5. It is placed on protective kraft paper inside a hollow corrugated carton.
6. The four flaps close, tape and a Cut It Out label appear, then the film fades to black with a centred invitation and a large instant-quote button.

The animation is a sample manufacturing story, not a live simulation of a customer's uploaded file. Powder coating and bending are not part of this film. Other existing website service descriptions are unchanged.

## Sources and limits

- The user's IMG_8399.MOV informed the round black cutting-head body, flange, knurled collar, copper nozzle and local cutting light.
- Bodor's i-Series brochure supplied the i7's 3048 × 1524 mm bed reference: https://www.bodor.com/images/linkedIn/i.pdf
- The 22 Series product information supplied the belt/brush finishing principle: https://timesaversinc.com/product/22-series/
- The quote-interface structure was based on the previously inspected app.cutitout.uk/quote upload screen.
- Internal machine details and the pickup tool are visual interpretations, not verified engineering replicas of the user's exact equipment configuration.
- The finisher side panels use an intentional translucent cutaway so customers can follow the part through the belt and brush. This is a storytelling treatment, not a claim that the real enclosure is transparent.
- Cutting progress is scripted from the same contour geometry as the component; this is not a thermal or CAM simulation.

## Assets and editing

- `build_cinematic_journey.py` builds the new scene. It reuses the quote-vignette helpers in `build_cut_it_out_journey.py`; retain both files.
- `manufacturing-journey-cinematic.blend` is the editable master.
- `static/img/home/journey-film/desktop/frame-0001.jpg` through `frame-0240.jpg` are the desktop film.
- `static/img/home/journey-film/mobile/frame-0001.jpg` through `frame-0240.jpg` use a separate portrait framing.
- `static/img/home/journey-film/poster.jpg` is the independently available still fallback.
- `static/js/manufacturing-film.js` maps native page scrolling to the rendered frames and customer-facing copy.
- `static/css/manufacturing-film.css` controls the presentation.
- `render_cinematic_frames.py` resumes final finishing and mobile renders from the saved master without rebuilding the scene.

Generate proof images with Blender in background mode, the builder script, and arguments `-- --proof --photoreal`. Generate both complete sequences with `-- --deliver --photoreal`. To render a selected range use `-- --render desktop --start 98 --end 139 --photoreal` (or `mobile`).

The film is self-hosted, has no external 3D-library dependency, loads frames near the current scroll position and retains at most 28 decoded images. The skip link moves directly to the next section. Reduced-motion and data-saving preferences receive the still fallback and upload link.

The last portion of the scroll holds a fully black, centred end card. The primary action points to `https://app.cutitout.uk/quote`. Scrolling backwards restores the film and chapter captions. The finishing roller has individually modelled overlapping abrasive leaves and machined retaining hubs.

The end card reads “Upload your drawing. Get an instant quote.”, with “Let’s” and the supplied white Cut It Out SVG on a separate line. The logo is optically matched to the text height and has accessible alternative text. The quote button reads “Get Started”.

Current frame payloads total 13.07 MB desktop / 6.56 MB mobile, excluding the rest of the homepage. The first 11-frame batch is approximately 676 KB / 282 KB respectively. The 600 px preload margin can start that batch before the journey reaches the viewport; it does so on the checked 1280 × 720 homepage. These are asset sizes and implementation checks, not a live-site, throttled performance benchmark. The added SVG is 5.08 KB.

This work is a local preview. No deployment or publishing is performed by the builder.

## Verification

- All 240 desktop frames (1280 × 800) and 240 portrait frames (640 × 800) were rendered and checked for readable image files.
- Browser checks covered upload, cutting, release, finishing, packaging and the centred black end card on desktop and at 390 × 844 phone size.
- The end-card button was clicked and reached the real quote upload page without uploading a file or submitting an order.
- Automated checks cover the completed-parcel hold, fade, reverse scrolling, reduced-motion fallback and skip action. Run `node --test tests/manufacturing-film.test.cjs`.
