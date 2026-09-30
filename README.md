# Cut It Out marketing website

Static marketing pages for `https://cutitout.uk`. Quote, File Workshop, account and checkout run in the separate application at `https://app.cutitout.uk`.

## Build and verify

Run from this repository:

```sh
python3 scripts/build_growth_pages.py
python3 scripts/check_site.py
node --test tests/growth-tools.test.cjs
```

The four troubleshooting guides share `content/growth/guide-template.html`, a metadata list and separate body files. Edit those sources and rebuild. The builder reuses the established DXF export guide header and footer. Other pages remain hand-authored.

The checker validates public sitemap URLs, metadata, JSON-LD, local links and fragments, images, assets and incoming links. It also checks the seven legacy redirect fallbacks. It does not certify Google rich-result eligibility or production HTTP status codes.

## Local review and publishing

Serve the folder locally and review phone and desktop widths. Keep canonical URLs on the production non-www host. Do not duplicate the existing `/materials/` pages under a new hierarchy.

`_redirects` supplies HTTP 301 mappings on hosts that support it. The build creates tiny instant-refresh HTML fallbacks for hosts that ignore it; those are not HTTP 301 responses. They have noindex, point directly to the replacement and stay outside the sitemap. Prefer supported server redirects when the hosting configuration permits them.

`docs/growth/` is an ignored local audit and review folder. It may contain private business reporting. Do not force-add it, upload the entire working folder or include it in deployment artifacts. Publish the tracked public website files only. Source templates, scripts and tests are maintenance files, not landing pages.

After publishing, verify actual HTTP redirects, sitemap delivery and canonicals. Review the new URLs in Search Console. Keep existing manufacturing limits, pricing and application logic separate from marketing edits.

## Marketing instrumentation

`static/js/growth-events.js` adds bounded quote, File Workshop and scale-tool events to the local dataLayer. It does not send them to a reporting service or add cookies. A real reporting destination and consent integration are needed before acquisition-to-order reporting is complete. Do not insert an invented analytics ID or place campaign tags on internal links.
