# Public URLs and guide migration

All cross-page navigation in the marketing pages, shared header and offline app page now uses explicit public URLs. Same-page `#anchors` stay local; asset URLs stay local to the marketing site. The portable app header still embeds its logo and styles.

## Destinations

- Marketing: `https://cutitout.uk/`, `/materials`, `/services`, `/guidelines`, `/contact`, `/company`, `/delivery-returns`, `/terms`, `/privacy`.
- App: `https://app.cutitout.uk/quote`, `/my-account`, `/cart`.
- The redesigned guide is now `guidelines/index.html`, canonical `https://cutitout.uk/guidelines`. It has normal indexable metadata, social tags and the original analytics configuration.
- Sitemap lists the canonical public pages only, not the retired guide subpages or preview variants.

## Public page files and optional legacy redirects

- `/guidelines-visual` and `/guidelines-2` → `/guidelines` on hosts supporting the redirect rules.
- `/guidelines/hole-sizes` → `/guidelines#holes`.
- `/guidelines/bolt-hole-sizes` → `/guidelines#bolts`.
- `/guidelines/part-size-limits` → `/guidelines#size`.
- Former main-guide anchors for scale, text, intersections, contours and FAQ remain as anchors within the consolidated guide.

Only the current public page files remain in the project. At the user's request, the preview folders, former guide subpage files and browser-side redirect script were removed during cleanup. Existing app links to `/guidelines`, `/materials`, `/services`, `/contact`, `/company`, `/delivery-returns`, `/terms` and `/privacy` reach the redesigned pages once deployed; they do not depend on old page files or an app update.

Root `_redirects` supplies optional permanent redirects for old bookmarks on compatible static hosts, without keeping old HTML pages. The actual marketing hosting configuration is not defined in this repository, so hosts that ignore `_redirects` will not redirect those obsolete URLs. A directory-based server may add a trailing slash in the browser; the advertised and canonical public URLs omit it. Avoid forcing a no-slash redirect against a directory server without verifying host routing, as that can create a loop.

## Updating and testing

1. `node scripts/sync-header.mjs`
2. `node scripts/normalize-links.mjs`
3. `node --test tests/public-routes.test.cjs tests/information-pages.test.cjs tests/materials-page.test.cjs`

Navigation remains cross-domain-safe even if copied into the app. Public links in localhost previews intentionally lead to the public site; open local page URLs directly when reviewing unpublished designs.

The app integration artifact is `shared-header.html`. The app repository itself was not modified, and no site was deployed. Deploy the marketing changes and replace the app's shared header as separate release steps. Live HTTP status codes and host-side redirect behaviour still require verification after deployment.
