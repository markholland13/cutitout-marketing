// Keep page navigation portable between the marketing site and quoting app.
// Local asset paths and same-page fragments deliberately stay local.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = ['index.html', 'materials/index.html', 'services/index.html', 'contact/index.html', 'company/index.html', 'delivery-returns/index.html', 'privacy/index.html', 'terms/index.html', 'guidelines/index.html', 'mobile-header.html', 'shared-header.html', 'cloudflare_app_fallback/index.html'];
const aliases = new Map([
  ['/guidelines-visual', '/guidelines'], ['/guidelines-2', '/guidelines'],
  ['/guidelines/hole-sizes', '/guidelines#holes'],
  ['/guidelines/bolt-hole-sizes', '/guidelines#bolts'],
  ['/guidelines/part-size-limits', '/guidelines#size']
]);
for (const file of pages) {
  const full = path.join(root, file);
  const source = fs.readFileSync(full, 'utf8');
  const result = source.replace(/(<a\b[^>]*\bhref=")([^"]+)(")/g, (match, before, href, after) => {
    if (!(href.startsWith('/') && !href.startsWith('//')) && !href.startsWith('https://cutitout.uk/')) return match;
    const url = new URL(href, 'https://cutitout.uk');
    let pathname = url.pathname.replace(/\/$/, '') || '/';
    const alias = aliases.get(pathname);
    if (alias) {
      const destination = new URL(alias, url.origin);
      pathname = destination.pathname;
      if (destination.hash) url.hash = destination.hash;
    }
    if (pathname !== '/') pathname += '/';
    return before + url.origin + pathname + url.search + url.hash + after;
  });
  fs.writeFileSync(full, result);
}
console.log(`Normalised navigation on ${pages.length} pages/fragments.`);
