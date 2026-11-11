import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../site/assets/home-theme.js', import.meta.url), 'utf8');
function visit(random) {
  const properties = {}, meta = {}, root = { dataset: {}, style: { setProperty: (key,value) => properties[key]=value } };
  const scope = { document: { documentElement: root, querySelector: () => meta } };
  vm.runInNewContext(source, { window: scope, Math: { random: () => random } });
  return { scope, root, properties, meta };
}
test('the first paint, fades and browser chrome share the selected palette', () => {
  for (const [random,theme,rgb,color] of [[0,'eigengrau','22,22,29','#16161d'],[.7499,'eigengrau','22,22,29','#16161d'],[.75,'charcoal','9,13,16','#090d10'],[.999,'charcoal','9,13,16','#090d10']]) {
    const state=visit(random);
    assert.equal(state.root.dataset.theme,theme);
    assert.equal(state.properties['--bg-rgb'],rgb);
    assert.equal(state.meta.content,color);
  }
});
test('Eigengrau is the majority theme while both palettes remain reachable', () => {
  const pick=visit(0).scope.HollowWakeTheme.choose;
  const counts={eigengrau:0,charcoal:0};
  for(let i=0;i<1000;i++)counts[pick(i/1000)]++;
  assert.deepEqual(counts,{eigengrau:750,charcoal:250});
});
