const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const walk = dir => fs.readdirSync(dir, {withFileTypes:true}).flatMap(entry => entry.name.startsWith('.') ? [] : entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);

test('static asset references from every HTML, CSS and JavaScript file exist', () => {
  for (const file of walk(root).filter(file => /\.(html|css|js)$/.test(file))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/\/static\/[^\s"'`<>)]*/g)) {
      const asset = decodeURIComponent(match[0].split('?')[0]);
      // Runtime frame-template URLs are tested exhaustively below.
      if (asset.includes('${')) continue;
      assert.ok(fs.existsSync(path.join(root, asset)), `${path.relative(root, file)}: ${asset}`);
    }
  }
});

test('all dynamically loaded film and stencil frames remain available', () => {
  for (const variant of ['desktop', 'mobile']) {
    for (let frame = 1; frame <= 240; frame++) {
      assert.ok(fs.existsSync(path.join(root, `static/img/home/journey-film/${variant}/frame-${String(frame).padStart(4, '0')}.webp`)));
    }
  }
  for (let frame = 1; frame <= 36; frame++) {
    assert.ok(fs.existsSync(path.join(root, `static/img/guidelines/visual/stencil-motion/frame-${String(frame).padStart(3, '0')}.jpg`)));
  }
});

test('current Blender masters and build dependencies remain', () => {
  for (const file of ['manufacturing-journey-cinematic.blend', 'visual-guidelines.blend', 'services-visual.blend', 'build_cinematic_journey.py', 'build_cut_it_out_journey.py', 'render_cinematic_frames.py', 'build_visual_guidelines.py', 'build_services_visuals.py', 'static/img/home/cut-it-out-logo.png']) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
});
