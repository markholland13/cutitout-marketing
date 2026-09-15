# Services visual redesign

Local route: `/services/`. This updates the existing page, without publishing.

## Content and design

- Matches the visual guide's navy, pale-blue and light-grey palette, typography and spacious layout.
- Reuses the current shared header, compact mobile disclosure and complete footer destinations.
- Three sections: laser cutting, optional powder coating, and online ordering/repeats.
- Existing service scope is preserved: DXF upload, material/thickness/quantity selection, online payment, account progress/dispatch updates, saved quotes/past orders, and support for non-standard enquiries.
- Existing canonical, social-preview metadata and analytics are retained.
- No autoplay, video, animation frames or real-time 3D. One existing laser-cutting image plus two matching Blender stills.
- Finish buttons compare identical geometry, with a clear illustrative-finish disclaimer. Both figures remain available when JavaScript is unavailable. No colour availability or dimensional tolerance is invented.
- Additional guidance uses native expandable answers. All quote, material, guideline, contact and account destinations remain available.

## Sources

- `services/index.html`: redesigned page.
- `static/css/services-visual.css`: page layout and responsive rules.
- `static/js/services-visual.js`: finish comparison and section navigation.
- `build_services_visuals.py`: reuses the existing handbook studio helpers, then renders only the Services assets.
- `services-visual.blend`: editable Blender master.
- `static/img/services/visual/uncoated.jpg` and `coated.jpg`: same part, pose and lighting, with different surface materials.

## Textured coating correction

The user confirmed that only textured powder coat is stocked and supplied `IMG_3272.jpg` as the surface reference. The coated material now uses neutral black colour, stronger fine-grained bump and variable roughness rather than the previous satin-like graphite surface. Geometry and viewpoint are unchanged; no metallic glitter is added. The coating description, finish selector, caption, alternative text, FAQ and description metadata now identify textured powder coating. Other colours are not inferred from the black reference.

Re-render only the coated still with `Blender --background --python build_services_visuals.py -- --coated-only`. This also refreshes the editable Blender master, keeping the source and web image in sync.

## Checks

Local HTTP response successful. Local asset/link targets, section anchors, IDs, control labels and image decoding checked. Existing metadata/analytics preserved. JavaScript syntax and a small non-browser finish-selector check pass (default state, both selections, pressed states). Responsive CSS is provided; no browser interaction or viewport QA was performed in this turn.
