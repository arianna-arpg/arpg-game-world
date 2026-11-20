import assert from 'node:assert/strict';
import { VOCATIONS, vocationNodeId } from '../src/data/vocations';
import { VOCATION_NODE_ART } from '../src/data/vocationNodeArt';
import { ICON_SUBJECTS } from '../src/render/skillIconArt';
import { PASSIVE_NODE_ART, PASSIVE_NODE_PRESETS, PASSIVE_NODE_SILHOUETTES, DEFAULT_PASSIVE_NODE_STYLE, normalizePassiveNodeStyle, resolvePassiveNodeVisual } from '../src/ui/passiveNodeConfig';
import { passiveNodeArt } from '../src/ui/passiveNodeArt';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';

assert.deepEqual(Object.keys(VOCATION_NODE_ART).sort(),Object.keys(VOCATIONS).sort());
let count = 0;
for (const v of Object.values(VOCATIONS)) {
  const profile = VOCATION_NODE_ART[v.id];
  assert(Object.hasOwn(PASSIVE_NODE_SILHOUETTES,profile.silhouette),v.id);
  assert(Object.hasOwn(ICON_SUBJECTS,profile.emblem),v.id);
  assert.deepEqual(Object.keys(profile.nodes).sort(),v.tree.map(n => n.id).sort(),v.id+' covers stable node IDs');
  for (const node of [{id:'root',kind:'vocation'},...v.tree]) {
    const visual = resolvePassiveNodeVisual({id:vocationNodeId(v.id,node.id),localId:node.id,kind:node.kind,group:'vocation:'+v.id})!;
    assert.equal(visual.palette.accent,v.color);
    assert.equal(visual.icon,node.id === 'root' ? profile.emblem : profile.nodes[node.id]);
    assert(Object.hasOwn(ICON_SUBJECTS,visual.icon));
    assert.equal(visual.author,'Hollow Wake');
    for (const p of PASSIVE_NODE_PRESETS) {
      const svg = passiveNodeArt(0,0,9,visual,p.style,{allocated:true,choice:node.kind === 'choice'});
      assert(!/undefined|NaN/.test(svg));
      assert(svg.includes('pointer-events="none"'));
      assert(svg.includes('passive-node-earned'));
    }
    count++;
  }
}
// Same public resolver extends any ordinary passive: no Vocation-only renderer.
const custom = { ...PASSIVE_NODE_ART, kinds:{notable:{icon:'shield' as const,style:{material:'engraved'}}}, groups:{patron:{defaults:{silhouette:'leaf',style:{symbols:'outline'}},nodes:{gift:{icon:'flower' as const}}}},nodes:{gift:{palette:{accent:'#ffaaaa',ink:'#ffffff',dark:'#100000'},style:{material:'luminous'}}} };
const context = {id:'gift',kind:'notable',group:'patron'};
const frozen = JSON.stringify(custom);
const resolved = resolvePassiveNodeVisual(context,custom)!;
assert.equal(resolved.icon,'flower'); assert.equal(resolved.silhouette,'leaf'); assert.equal(resolved.palette.accent,'#ffaaaa');
assert.deepEqual(resolved.style,{material:'luminous',symbols:'outline'});
assert(passiveNodeArt(0,0,12,resolved,DEFAULT_PASSIVE_NODE_STYLE).includes('data-passive-material="luminous"'));
assert.equal(JSON.stringify(custom),frozen);
assert.equal(resolvePassiveNodeVisual({id:'unconfigured',kind:'small'}),undefined);
assert.equal(resolvePassiveNodeVisual({id:'constructor',group:'toString',kind:'__proto__'}),undefined);
const style = normalizePassiveNodeStyle({material:'luminous',silhouette:'toString',symbols:'outline',palette:'future'});
assert.deepEqual(style,{...DEFAULT_PASSIVE_NODE_STYLE,material:'luminous',symbols:'outline'});
assert.deepEqual(normalizePassiveNodeStyle(null),DEFAULT_PASSIVE_NODE_STYLE);
const settings = makeSettings(); settings.passiveNodeStyle = style;
assert.deepEqual(deserializeSettings(serializeSettings(settings))!.passiveNodeStyle,style);
const old = serializeSettings(settings); delete old.passiveNodeStyle;
assert.deepEqual(deserializeSettings(old)!.passiveNodeStyle,DEFAULT_PASSIVE_NODE_STYLE);
assert.equal(deserializeSettings(old)!.keybinds.panelTree,settings.keybinds.panelTree);
console.log(`PASS passive node art: ${count} identities, all presets, reusable overrides, safe fallback and old/new settings`);
