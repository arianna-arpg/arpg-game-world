import assert from 'node:assert/strict';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';
import { DEFAULT_INTERFACE_STYLE, INTERFACE_STYLE_CATEGORIES, INTERFACE_TEMPLATES, matchingInterfaceTemplate, normalizeInterfaceStyle, type InterfaceStyle } from '../src/ui/interfaceStyleConfig';

const a = makeSettings(), b = makeSettings();
a.interfaceStyle.frame = 'astral';
assert.equal(b.interfaceStyle.frame, 'aether', 'new settings do not share mutable selections');
const old = serializeSettings(a); delete old.interfaceStyle;
assert.deepEqual(deserializeSettings(old)!.interfaceStyle, DEFAULT_INTERFACE_STYLE, 'old settings receive the approved default');
assert.deepEqual(normalizeInterfaceStyle({ frame: 'missing-mod', divider: 'runic', ribbon: 'silver' }),
  { ...DEFAULT_INTERFACE_STYLE, divider: 'runic', ribbon: 'silver' }, 'older styles keep valid selections and independent defaults');
assert.deepEqual(normalizeInterfaceStyle({palette:'midnight',finish:'missing',marks:'struck',runeActivity:0}),
  {...DEFAULT_INTERFACE_STYLE,palette:'midnight',marks:'struck',runeActivity:0});
for (const t of INTERFACE_TEMPLATES) {
  const draft = { ...DEFAULT_INTERFACE_STYLE, runeActivity:73, typeface:'book', ...t.appearance };
  assert.deepEqual(normalizeInterfaceStyle(draft), draft, t.id);
  assert.equal(matchingInterfaceTemplate(draft)?.id, t.id);
}
assert.equal(matchingInterfaceTemplate({ ...DEFAULT_INTERFACE_STYLE, marks:'outline' }), undefined);
for (const [saved, expected] of [[0, 0], [73.4, 73], [150, 100], [-4, 0], [NaN, 50], [null, 50], ['0', 50]] as const) {
  const style = normalizeInterfaceStyle({ frame: 'astral', runeActivity: saved });
  assert.equal(style.runeActivity, expected);
  assert.equal(style.frame, 'astral');
}
for (const malformed of [null, false, 2, 'astral', [], { frame: {}, divider: '__proto__', ribbon: 'constructor' }]) {
  assert.deepEqual(normalizeInterfaceStyle(malformed), DEFAULT_INTERFACE_STYLE);
}
let combinations = 0;
function roundTrip(style: InterfaceStyle, index: number): void {
  const category = INTERFACE_STYLE_CATEGORIES[index];
  if (category) {
    for (const choice of category.choices) roundTrip({ ...style, [category.key]:choice.id }, index + 1);
    return;
  }
  a.interfaceStyle = { ...style, runeActivity:combinations % 101 };
  const saved = serializeSettings(a), loaded = deserializeSettings(saved)!;
  assert.deepEqual(loaded.interfaceStyle, a.interfaceStyle);
  assert.notEqual(saved.interfaceStyle, a.interfaceStyle, 'save is an independent snapshot');
  assert.equal(loaded.uiScale, a.uiScale);
  assert.deepEqual(loaded.keybinds, a.keybinds);
  combinations++;
}
roundTrip({ ...DEFAULT_INTERFACE_STYLE }, 0);
console.log(`Interface styles: ${combinations} combinations round-trip; old, malformed and unavailable choices retain safe defaults.`);
