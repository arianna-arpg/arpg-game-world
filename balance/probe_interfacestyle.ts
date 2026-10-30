import assert from 'node:assert/strict';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';
import { DEFAULT_INTERFACE_STYLE, INTERFACE_STYLE_CATEGORIES, normalizeInterfaceStyle } from '../src/ui/interfaceStyleConfig';

const a = makeSettings(), b = makeSettings();
a.interfaceStyle.frame = 'astral';
assert.equal(b.interfaceStyle.frame, 'aether', 'new settings do not share mutable selections');
const old = serializeSettings(a); delete old.interfaceStyle;
assert.deepEqual(deserializeSettings(old)!.interfaceStyle, DEFAULT_INTERFACE_STYLE, 'old settings receive the approved default');
assert.deepEqual(normalizeInterfaceStyle({ frame: 'missing-mod', divider: 'runic', ribbon: 'silver' }),
  { frame: 'aether', divider: 'runic', ribbon: 'silver' }, 'only unavailable selections fall back');
for (const malformed of [null, false, 2, 'astral', [], { frame: {}, divider: '__proto__', ribbon: 'constructor' }]) {
  assert.deepEqual(normalizeInterfaceStyle(malformed), DEFAULT_INTERFACE_STYLE);
}
let combinations = 0;
for (const frame of INTERFACE_STYLE_CATEGORIES[0].choices) {
  for (const divider of INTERFACE_STYLE_CATEGORIES[1].choices) {
    for (const ribbon of INTERFACE_STYLE_CATEGORIES[2].choices) {
      a.interfaceStyle = { frame: frame.id, divider: divider.id, ribbon: ribbon.id };
      const saved = serializeSettings(a), loaded = deserializeSettings(saved)!;
      assert.deepEqual(loaded.interfaceStyle, a.interfaceStyle);
      assert.notEqual(saved.interfaceStyle, a.interfaceStyle, 'save is an independent snapshot');
      assert.equal(loaded.uiScale, a.uiScale);
      assert.deepEqual(loaded.keybinds, a.keybinds);
      combinations++;
    }
  }
}
console.log(`Interface styles: ${combinations} combinations round-trip; old, malformed and unavailable choices retain safe defaults.`);
