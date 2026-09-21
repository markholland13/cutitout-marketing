const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pages = ['index.html', 'materials/index.html', 'services/index.html', 'one-off-laser-cutting/index.html', 'guidelines/index.html', 'contact/index.html', 'company/index.html', 'delivery-returns/index.html', 'terms/index.html', 'privacy/index.html', 'shared-header.html', 'cloudflare_app_fallback/index.html'];
for (const file of pages) test(`${file}: navigation resolves to the correct host and route`, () => {
  const html = read(file);
  for (const [, href] of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    if (href.startsWith('#')) {
      assert.ok(html.includes(`id="${href.slice(1)}"`), `${file}: ${href}`);
      continue;
    }
    assert.ok(!href.startsWith('/'), `Non-portable navigation in ${file}: ${href}`);
    const url = new URL(href);
    assert.ok(!url.pathname.includes('guidelines-visual'));
    assert.ok(!url.pathname.includes('guidelines-2'));
    if (url.hostname === 'app.cutitout.uk') {
      assert.ok(['/quote', '/my-account', '/cart'].includes(url.pathname));
      continue;
    }
    if (url.hostname !== 'cutitout.uk') continue;
    assert.ok(url.pathname.endsWith('/'), href);
    const target = path.join(root, url.pathname, 'index.html');
    assert.ok(fs.existsSync(target), href);
    if (url.hash) assert.ok(fs.readFileSync(target, 'utf8').includes(`id="${url.hash.slice(1)}"`), href);
  }
});
test('visual guide is the indexable canonical guide and sitemap uses only public pages', () => {
  const html = read('guidelines/index.html');
  assert.ok(html.includes('id="stencil-image"'));
  assert.ok(html.includes('rel="canonical" href="https://cutitout.uk/guidelines/"'));
  assert.ok(html.includes('property="og:url" content="https://cutitout.uk/guidelines/"'));
  assert.ok(!html.includes('noindex'));
  const sitemap = read('sitemap.xml');
  assert.ok(!/guidelines-visual|guidelines-2|guidelines\/(?:hole-sizes|bolt-hole-sizes|part-size-limits)/.test(sitemap));
  const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url);
  assert.equal(listed.length, 10);
  for (const url of listed) {
    const parsed = new URL(url);
    assert.equal(parsed.hostname, 'cutitout.uk');
    assert.ok(parsed.pathname.endsWith('/'), url);
    const page = read(path.join(parsed.pathname, 'index.html'));
    assert.ok(page.includes(`rel="canonical" href="${url}"`), url);
  }
});
test('only current page files remain; optional host redirects target the new guide', () => {
  for (const old of ['guidelines-visual', 'guidelines-2', 'guidelines/hole-sizes', 'guidelines/bolt-hole-sizes', 'guidelines/part-size-limits', 'test-home']) {
    assert.ok(!fs.existsSync(path.join(root, old)), old);
  }
  const redirects = read('_redirects');
  assert.ok(redirects.includes('/guidelines-visual /guidelines/ 301'));
  assert.ok(redirects.includes('/guidelines/hole-sizes /guidelines/#holes 301'));
});
