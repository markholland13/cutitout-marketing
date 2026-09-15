const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const pages = ['contact', 'company', 'delivery-returns', 'terms', 'privacy'];

for (const page of pages) {
  test(`${page}: assets, anchors, shared navigation and metadata`, () => {
    const html = fs.readFileSync(path.join(root, page, 'index.html'), 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.equal((html.match(/<main\b/g) || []).length, 1);
    assert.ok(html.includes('data-cio-header'));
    assert.ok(html.includes('footer-complete'));
    assert.ok(html.includes(`https://cutitout.uk/${page}`));
    assert.ok(html.includes('AW-18042857892'));
    assert.ok(!html.includes('admin@cutitout.uk'));
    assert.ok(!html.includes('mailto:'));
    for (const [, url] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (url.startsWith('#')) assert.ok(ids.includes(url.slice(1)), url);
      if (!url.startsWith('/') || url.startsWith('//')) continue;
      let file = path.join(root, url.split('?')[0]);
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      assert.ok(fs.existsSync(file), url);
    }
  });
}

test('email address is assembled only on activation', () => {
  const button = { hidden: true, addEventListener(name, fn) { this[name] = fn; } };
  const window = { location: { href: '' } };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'static/js/email-contact.js'), 'utf8'), {
    document: { querySelectorAll: () => [button] }, window
  });
  assert.equal(button.hidden, false);
  assert.equal(window.location.href, '');
  button.click();
  assert.equal(window.location.href, 'mailto:admin@cutitout.uk');
});
