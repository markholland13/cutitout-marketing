# Materials page refresh

Local page: `/materials/`. Not deployed.

## Design

Uses the Services page's typography, palette, buttons and complete footer, plus the shared site header. Existing material images are reused. Four visual sample links open a keyboard-accessible tabbed material view; the selector stays visible as a two-column grid on phones, not a dropdown. Stock thicknesses are plain labels, not order controls. A comparison table scrolls independently on small screens. All material panels remain readable without JavaScript and in print.

## Stock

- Mild steel: 1, 1.5, 2, 3, 4, 5, 6 mm.
- Stainless steel: 1, 1.5, 2, 3, 4 mm.
- Aluminium: 1, 1.5, 2, 3 mm. The user confirmed 1 mm; it is listed in both the panel and comparison table.
- Acrylic: retained existing 3 and 5 mm, in black, white, clear and dark grey tinted.
- Coating copy explicitly says only textured powder coat is stocked, on supported metal parts.

## Files

- `materials/index.html`: page markup, content and stock ranges; original metadata and analytics retained.
- `static/css/materials-visual.css`: Materials layout, alongside `services-visual.css` and `site-header.css`.
- `static/js/materials-visual.js`: progressive enhancement, material tabs, deep links and header offset.
- `tests/materials-page.test.cjs`: stock assertions, local links/assets, unique IDs, tab selection, keyboard behaviour and hash handling.

## Verification

Five automated tests pass with `node --test tests/materials-page.test.cjs`. JavaScript syntax and whitespace checks pass. Browser checks covered stock content, material tabs, keyboard arrows, hero-to-panel navigation, image loading and the shared menu/Escape behaviour. Responsive DOM checks at 320, 390, 768 and 1280 px found no document-level horizontal overflow after correcting the comparison table's positioning context. The table retains its own horizontal scroll. No browser errors reported. Temporary viewport override reset.

Browser screenshots with a viewport override were cropped/stitching incorrectly, so those images were not used as reliable full-page evidence. Normal-window screenshots were reviewed; responsive sizes were checked through layout measurements.
