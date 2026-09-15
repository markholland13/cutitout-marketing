# Cut It Out shared header

Use **shared-header.html** to add the complete header to app.cutitout.uk. It contains the styles, markup, embedded white logo and mobile-menu script. It has no external dependencies.

## Add to the app

1. Replace the app's old header in its shared layout with the contents of `shared-header.html`. Insert immediately inside `<body>`, outside the app's padded or maximum-width content wrapper. Do not paste a second `<html>` or `<body>` element; the supplied file is a fragment.
2. Remove the old header's mobile-menu script. Include the new header only once per page. Its `cio-` classes are deliberately separate from the marketing site's legacy styles.
3. Keep your app's existing authentication behaviour for `/my-account`. The header doesn't implement login or invent logged-in state. Account can be adapted to your existing account control if required. Cart links to the real cart; no static item count is displayed.
4. With React, Vue or another component framework, translate the markup into the app's shared layout component and initialise the menu after mounting. A script inserted using an HTML string may not run. For client-side route changes, let the router update `aria-current="page"` on the relevant link. Avoid attaching duplicate handlers on each route change.
5. If the app has a strict Content Security Policy, put the CSS and JavaScript in approved local assets or apply your existing nonces. If `data:` images are blocked, copy the existing white SVG to the app and change the image source. Do not weaken the policy just to accommodate this fragment.

All marketing links use `https://cutitout.uk`; Account, Cart and Start a quote use `https://app.cutitout.uk`. The logo returns to the marketing homepage. The revamped visual guide now lives at the public `/guidelines` route. Old preview page files have been removed; optional host redirect rules are described in `PUBLIC-ROUTES.md`.

The bar is sticky, with a 73px overall desktop height and 65px mobile height. Below 1024px, navigation opens in a compact, right-aligned panel beneath the Menu button, without pushing page content down. Primary links use two columns; Account and Cart sit above a single full-width quote button. The panel is capped at 380px and scrolls internally on short screens. It is a non-modal disclosure, not a full-screen overlay. Escape closes it and returns focus to its button; clicking a link, clicking outside, leaving via keyboard or crossing the responsive breakpoint also closes it. Without JavaScript, the navigation stays visible within the header.

The website uses the same component. The visual guide measures the header height so its chapter navigation stays below it.

## Source files and updates

- `components/header.html` — shared markup template.
- `static/css/site-header.css` — scoped header styles only.
- `static/js/shared-header.js` — mobile disclosure and active-page behaviour.
- `scripts/sync-header.mjs` — updates the current marketing pages, standalone header preview and offline page, and regenerates `shared-header.html`.
- `scripts/normalize-links.mjs` — normalises cross-page navigation to the correct public domain and removes preview/subpage destinations. Same-page anchors and local asset paths are preserved.

After editing the source files, run `node scripts/sync-header.mjs`, then `node scripts/normalize-links.mjs`. Existing page content remains separate. The older `static/css/shared-header.css` is still loaded for legacy content-shell styling; **do not copy it into the app**.

Links in the local preview now deliberately point to the public domains too. Until deployment, following a cross-page link may show the previous live design. To inspect an unpublished page, open its `http://127.0.0.1:4173/<page>/` address directly. See `PUBLIC-ROUTES.md` for route and redirect details.

These changes are local. Neither the marketing site nor the separate quoting app has been deployed by this task.
