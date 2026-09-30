const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { compareDimensions } = require('../static/js/dxf-scale.js');

test('scale comparison handles inch/mm inversions and a matching dimension', () => {
  assert.equal(compareDimensions(2540,100).factor,25.4);
  assert.ok(Math.abs(compareDimensions(100,2540).factor - 1/25.4) < 1e-12);
  assert.deepEqual(compareDimensions(100,100),{factor:1,percent:100});
  assert.equal(compareDimensions('100','50').percent,200);
});
test('scale comparison rejects invalid or unrepresentable values', () => {
  for (const input of ['',0,-1,'x',NaN,Infinity]) {
    assert.equal(compareDimensions(input,100),null);
    assert.equal(compareDimensions(100,input),null);
  }
  assert.equal(compareDimensions(1e308,1e-308),null);
  assert.equal(compareDimensions(1e-308,1e308),null);
});
function instrument(canonical='https://cutitout.uk/materials/mild-steel/') {
  const handlers={}; const window={dataLayer:[]};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../static/js/growth-events.js'),'utf8'),{
    URL,window,location:{href:'https://cutitout.uk/materials/mild-steel/?email=private'},
    document:{querySelector:()=>({href:canonical}),addEventListener:(name,fn)=>handlers[name]=fn}
  });
  return { handlers,window };
}
test('quote/workshop hooks strip sensitive parameters and do not change navigation', () => {
  const {handlers,window}=instrument();
  const link={href:'https://app.cutitout.uk/file-workshop?file=private-drawing',closest:()=>({id:'ordering'})};
  handlers.click({type:'click',button:0,target:{closest:()=>link},preventDefault:()=>assert.fail('Must not prevent navigation')});
  assert.deepEqual(JSON.parse(JSON.stringify(window.dataLayer)),[{event:'cio_workshop_cta_click',destination:'/file-workshop',cta_section:'ordering',page_path:'/materials/mild-steel/'}]);
  assert.doesNotMatch(JSON.stringify(window.dataLayer),/private|email|file=/);
});
test('ignore lookalike origins, private/noncanonical paths, unrelated routes and right clicks', () => {
  const {handlers,window}=instrument();
  for (const href of ['https://app.cutitout.uk.evil.test/quote','https://example.com/quote','https://app.cutitout.uk/cart']) {
    handlers.click({type:'click',button:0,target:{closest:()=>({href})}});
  }
  handlers.auxclick({type:'auxclick',button:2,target:{closest:()=>assert.fail('right click ignored')}});
  assert.equal(window.dataLayer.length,0);
  assert.deepEqual(Object.keys(instrument('https://app.cutitout.uk/quote/private').handlers),[]);
});
test('tool hook only records the allowlisted tool once and excludes entered dimensions', () => {
  const {handlers,window}=instrument();
  handlers['cio:tool-used']({detail:{tool:'unknown',filename:'private'}});
  handlers['cio:tool-used']({detail:{tool:'dxf_scale',intended:123}});
  handlers['cio:tool-used']({detail:{tool:'dxf_scale'}});
  assert.equal(window.dataLayer.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(window.dataLayer[0])),{event:'cio_tool_used',tool:'dxf_scale',page_path:'/materials/mild-steel/'});
});
