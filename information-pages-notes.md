# Information pages refresh

Local changes only; not deployed.

## Pages and shared assets

- Company: workshop photo, origin story, purpose, verified existing business details, shared quote CTA.
- Delivery & Returns, Terms, Privacy: shared editorial layout with section navigation, existing summary points, full readable policy sections and contact links. All original policy paragraphs and four summary points on each page were compared against the pre-edit source and preserved verbatim. This was a visual refresh, not a legal review.
- Contact: visible address replaced with an email button. Company uses the same button.
- `static/css/information-visual.css` contains the new layouts and uses the Services foundation and complete footer. The existing global header remains unchanged.
- `static/js/email-contact.js` assembles a mailto destination on activation. It reduces exposure to basic HTML scrapers but is reversible client-side obfuscation, not robust anti-spam protection. JavaScript and a configured email app are required; no message is sent automatically. A no-JavaScript notice is provided.
- The app fallback page's two plain email links now point to the marketing Contact page, avoiding a dependency on the new script in the separate app fallback deployment.

## Checks

- `node --test tests/information-pages.test.cjs tests/materials-page.test.cjs`: 11 tests pass, covering links/assets/IDs, metadata, mail button behaviour and the existing Materials interactions.
- Syntax and whitespace checks pass.
- Browser layout checks on all five pages at 320, 768 and 1280 px found no document-level horizontal overflow.
- Normal-window visual checks completed for Contact, Company and all three policy pages; Delivery section navigation verified.
- No browser errors reported; temporary viewport override reset.
- No outgoing email was launched or sent during testing; mailto assembly was tested in isolation.

These changes cover the four requested information pages. Existing guideline preview routes and the separate app's internal pages were not migrated or redesigned by this update.
