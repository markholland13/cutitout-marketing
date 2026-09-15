const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'materials/index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'static/js/materials-visual.js'), 'utf8');
const ids = ['mild-steel', 'stainless-steel', 'aluminium', 'acrylic'];

test('confirmed stock ranges are shown exactly, including 1 mm aluminium', () => {
  const expected = [[1, 1.5, 2, 3, 4, 5, 6], [1, 1.5, 2, 3, 4], [1, 1.5, 2, 3], [3, 5]];
  ids.forEach((id, index) => {
    const panel = html.match(new RegExp(`<article[^>]*id="${id}"[\\s\\S]*?</article>`))[0];
    const values = [...panel.matchAll(/<li>([\d.]+)<small>mm<\/small><\/li>/g)].map(match => Number(match[1]));
    assert.deepEqual(values, expected[index]);
    assert.ok(!panel.match(/^<article[^>]*\bhidden\b/));
  });
  assert.ok(!html.includes('Ask about 1 millimetre aluminium'));
  const aluminiumRow = html.match(/<tr><th scope="row">Aluminium<\/th>([\s\S]*?)<\/tr>/)[1];
  assert.equal((aluminiumRow.match(/class="mt-available"/g) || []).length, 4);
});

test('local assets, page links and anchors resolve; IDs are unique', () => {
  const pageIds = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(pageIds).size, pageIds.length);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (url.startsWith('#')) assert.ok(pageIds.includes(url.slice(1)), url);
    if (!url.startsWith('/') || url.startsWith('//')) continue;
    const [pathname, fragment] = url.split('?')[0].split('#');
    let file = path.join(root, pathname);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    assert.ok(fs.existsSync(file), url);
    if (fragment) assert.ok(fs.readFileSync(file, 'utf8').includes(`id="${fragment}"`), url);
  }
  assert.match(html, /data-material-picker[^>]* hidden/);
});

function setup(hash = '') {
  let active;
  const tabs = ids.map(id => ({
    attributes: { 'aria-controls': id }, events: {},
    getAttribute(key) { return this.attributes[key]; },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(event, handler) { this.events[event] = handler; },
    focus() { active = id; }
  }));
  const panels = ids.map(id => ({ id, hidden: false }));
  const jumps = ids.map(id => ({ hash: `#${id}`, events: {}, addEventListener(e, fn) { this.events[e] = fn; } }));
  const picker = { hidden: true, querySelectorAll: () => tabs };
  const location = { hash };
  const window = { events: {}, addEventListener(e, fn) { this.events[e] = fn; } };
  const document = {
    querySelector: selector => selector === '[data-material-picker]' ? picker : { getBoundingClientRect: () => ({ height: 73 }) },
    querySelectorAll: selector => selector === '[data-material-panel]' ? panels : jumps,
    documentElement: { style: { setProperty() {} } }
  };
  vm.runInNewContext(script, { document, location, window });
  return { tabs, panels, jumps, picker, location, window, active: () => active };
}

test('picker defaults to steel and selects exactly one material', () => {
  const state = setup();
  assert.equal(state.picker.hidden, false);
  assert.deepEqual(state.panels.filter(p => !p.hidden).map(p => p.id), ['mild-steel']);
  state.tabs[2].events.click();
  assert.deepEqual(state.panels.filter(p => !p.hidden).map(p => p.id), ['aluminium']);
  assert.equal(state.tabs[2].attributes['aria-selected'], 'true');
  assert.equal(state.tabs.filter(t => t.tabIndex === 0).length, 1);
});

test('keyboard arrows wrap; Home and End move focus and selection', () => {
  const state = setup();
  const press = (index, key) => state.tabs[index].events.keydown({ key, preventDefault() {} });
  press(0, 'ArrowLeft');
  assert.equal(state.active(), 'acrylic');
  press(3, 'ArrowRight');
  assert.equal(state.active(), 'mild-steel');
  press(0, 'End');
  assert.equal(state.active(), 'acrylic');
  press(3, 'Home');
  assert.equal(state.active(), 'mild-steel');
});

test('deep links, hero links and hash changes reveal the correct panel', () => {
  const state = setup('#stainless-steel');
  assert.equal(state.panels[1].hidden, false);
  state.jumps[3].events.click();
  assert.equal(state.panels[3].hidden, false);
  state.location.hash = '#aluminium';
  state.window.events.hashchange();
  assert.equal(state.panels[2].hidden, false);
  state.location.hash = '#top';
  state.window.events.hashchange();
  assert.equal(state.panels[2].hidden, false);
});
