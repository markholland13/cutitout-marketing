/* A comparison only; no drawing access, upload, storage or file edits. */
(() => {
  'use strict';
  function compareDimensions(intended, imported) {
    const wanted = Number(intended), shown = Number(imported);
    if (!Number.isFinite(wanted) || !Number.isFinite(shown) || wanted <= 0 || shown <= 0) return null;
    const factor = wanted / shown;
    const percent = factor * 100;
    if (!Number.isFinite(factor) || !Number.isFinite(percent) || factor <= 0 || percent <= 0) return null;
    return { factor, percent };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { compareDimensions };
  if (typeof document === 'undefined') return;
  const form = document.getElementById('dxf-scale-form');
  if (!form) return;
  const intended = document.getElementById('dxf-intended');
  const imported = document.getElementById('dxf-imported');
  const result = document.getElementById('dxf-scale-result');
  const format = value => String(Number(value.toPrecision(7)));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const comparison = compareDimensions(intended.value, imported.value);
    result.dataset.error = String(!comparison);
    intended.setAttribute('aria-invalid', String(!Number.isFinite(Number(intended.value)) || Number(intended.value) <= 0));
    imported.setAttribute('aria-invalid', String(!Number.isFinite(Number(imported.value)) || Number(imported.value) <= 0));
    if (!comparison) {
      result.textContent = 'Enter a number greater than zero in each box, in millimetres. Check the measurements if either number is unusually large or small.';
      return;
    }
    result.textContent = comparison.factor === 1
      ? 'These measurements match, so no scale change is needed for this measurement. Check the width, height and a hole size too.'
      : `To change ${format(Number(imported.value))} mm to ${format(Number(intended.value))} mm, scale the drawing to ${format(comparison.percent)}% of its current size (multiply by ${format(comparison.factor)}). Check a second measurement before changing your file. This calculator has not changed it.`;
    document.dispatchEvent(new CustomEvent('cio:tool-used', { detail: { tool: 'dxf_scale' } }));
  });
})();
