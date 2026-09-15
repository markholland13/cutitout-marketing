# Homepage video and quote panel

- Home uses `static/img/company/workshop-team.webp`. Its bench and metal-part refinements preserve both people pixel-for-pixel from the approved portrait. Company keeps `family-workshop-final.webp`.
- Real cutting footage fills the opening section behind a dark gradient. Pause/play stays accessible. Reduced motion and data-saving preferences start with the existing cutting still; leaving the viewport pauses playback. Manual pause is retained.
- `static/js/journey-end-stop.js` catches one downward scrolling gesture at timeline frame 270, where the film is black and the quote action is fully visible. It absorbs momentum, releases on a fresh gesture, and has a 1.8-second safety release. Upward scrolling, Escape, keyboard navigation, explicit skip/continue, and scrollbar dragging can escape. It never locks body scrolling or moves focus automatically.
- The end card appears even while the final illustration frame is loading. A separate Continue exploring action moves focus to the next section.
- Reduced-motion/data-saving film mode has no scroll interception. History restoration and anchor navigation are not treated as scrolling gestures.
- Preview verified at desktop and narrow widths, including video pause/play and landing on the quote panel after a large scroll. Website changes remain local, not deployed.
