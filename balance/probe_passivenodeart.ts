import assert from 'node:assert/strict';
import { PASSIVE_NODES } from '../src/data/passives';
import { VOCATIONS } from '../src/data/vocations';
import { VOCATION_NODE_ART } from '../src/data/vocationNodeArt';
import { ICON_SUBJECTS } from '../src/render/skillIconArt';
import { PASSIVE_NODE_ART, PASSIVE_NODE_SILHOUETTES, resolvePassiveNodeVisual } from '../src/ui/passiveNodeConfig';
import { passiveNodeMeaning } from '../src/data/passiveNodeSymbols';
import { passiveNodeArt } from '../src/ui/passiveNodeArt';
import { makeSettings, serializeSettings, deserializeSettings } from '../src/meta/settings';

assert.deepEqual(Object.keys(VOCATION_NODE_ART).sort(),Object.keys(VOCATIONS).sort());
const symbols=new Set<string>(),palettes=new Set<string>();let count=0;
for(const node of Object.values(PASSIVE_NODES)){
  const localId=node.vocation?node.id.slice(('voc_'+node.vocation+'_').length):undefined;
  const visual=resolvePassiveNodeVisual({id:node.id,kind:node.kind,node,localId,group:node.vocation?'vocation:'+node.vocation:undefined})!;
  assert(visual,node.id);assert(Object.hasOwn(ICON_SUBJECTS,visual.icon),node.id);assert(Object.hasOwn(PASSIVE_NODE_SILHOUETTES,visual.silhouette));
  if(node.vocation){assert.equal(visual.palette.accent,VOCATIONS[node.vocation].color);assert.equal(visual.silhouette,VOCATION_NODE_ART[node.vocation].silhouette);}
  else {assert.equal(visual.silhouette,'circle',node.id);assert.notEqual(visual.source,'fallback',node.id);symbols.add(visual.icon);palettes.add(visual.palette.accent);}
  if(node.vocation || node.choice || (node.kind!=='notable' && node.kind!=='keystone')) assert.equal(visual.motif,undefined,node.id);
  for(const allocated of [false,true]){
    const svg=passiveNodeArt(0,0,12,visual,{allocated,choice:!!node.choice,keystone:node.kind==='keystone'});
    assert(!/undefined|NaN/.test(svg),node.id);assert(svg.includes('pointer-events="none"'));
    assert(svg.includes(`data-passive-material="${allocated?'enamel':'luminous'}"`));
    assert.equal(svg.includes('passive-node-earned'),allocated);
    const inlay = !node.vocation && (node.kind === 'notable' ? 'studs' : node.kind === 'keystone' ? 'compass' : undefined);
    assert.equal(svg.includes('data-passive-inlay='), Boolean(inlay), node.id);
    if (inlay) assert(svg.includes(`data-passive-inlay="${inlay}"`), node.id);
    assert.equal(svg.includes('data-passive-motif='), Boolean(visual.motif), node.id);
    if (visual.motif) assert(svg.includes(`data-passive-motif="${visual.motif}"`), node.id);
  }
  count++;
}
assert(symbols.size>45);assert(palettes.size>=15);
const fire=passiveNodeMeaning({id:'example',kind:'small',mods:[{stat:'damage',kind:'increased',value:.1,tags:['spell','fire']}]});
assert.equal(fire.icon,'flame');
const themedGrant = (stat: string) => passiveNodeMeaning({id:'example',kind:'small',mods:[{stat,kind:'flat',value:1}]});
for (const [stat, icon] of Object.entries({projBounce:'ricochet', hitEchoDelay:'echo', staticDischargeMore:'capacitor',
  satelliteOrbit:'orbit', ailmentCrossSplice:'splice', fateDiceBonus:'die', solsticePower:'pendulum'}))
  assert.equal(themedGrant(stat).icon, icon, stat);
assert.equal(passiveNodeMeaning(PASSIVE_NODES.cross_str_mastery).icon, 'hammer');
assert.equal(passiveNodeMeaning(PASSIVE_NODES.cross_wis_mastery).icon, 'skull');
// Related mechanics carry the same action mark. The subject names the payoff.
for (const [id,icon,motif] of [
  ['exp_int_pyro_conv','flame','convert'], ['exp_prw_volt_strike','lightning','convert'],
  ['exp_for_grounded','sword','shelter'], ['exp_p5_prw_combo_elem','prism','gain'],
  ['weave_shieldweaver_ward_distiller','crystal','conduit'], ['route_int_technique_conduit','pillar','conduit'],
  ['spec_archer_formation','bow','formation'], ['spec_bone_formation','ribs','formation'],
  ['spec_skeleton_marrow','skull','gain'], ['spec_skeleton_cohort','skull','repeat'],
  ['spec_fire_fire_relay','snowflake','trigger'], ['spec_cold_cold_relay','lightning','trigger'],
  ['exp_p15_cha_long_memory_tail','clock','gain'], ['exp_p15_fin_short_memory_tail','clock','loss'],
] as const) {
  const meaning = passiveNodeMeaning(PASSIVE_NODES[id]);
  assert.deepEqual([meaning.icon,meaning.motif],[icon,motif],id);
}
for (const [id,icon] of Object.entries({exp_p7_int_deferred_tail:'echo', exp_p17_dex_wintry_hail:'ricochet',
  spec_close_focus:'innerReach', spec_middle_focus:'middleReach', spec_far_focus:'farReach',
  exp_p11_for_ossuary_aegis:'bladeWard', exp_p16_for_salvatory_counter:'bladeWard', sor_key:'glassCannon'}))
  assert.equal(passiveNodeMeaning(PASSIVE_NODES[id]).icon,icon,id);
const renamed = {...PASSIVE_NODES.exp_prw_volt_strike, id:'new_content'};
assert.equal(passiveNodeMeaning(renamed).motif,'convert');
assert.equal(passiveNodeMeaning({...renamed,kind:'small'}).motif,undefined);
const artContext = {node:renamed, id:renamed.id, kind:renamed.kind};
const restyled = resolvePassiveNodeVisual(artContext, {...PASSIVE_NODE_ART, nodes:{new_content:{icon:'prism',motif:'repeat'}}})!;
assert.deepEqual([restyled.icon,restyled.motif],['prism','repeat']);
const noMark = resolvePassiveNodeVisual(artContext, {...PASSIVE_NODE_ART, nodes:{new_content:{motif:null}}})!;
assert.equal(noMark.icon,'lightning');
assert(!passiveNodeArt(0,0,15,noMark).includes('data-passive-motif='));
assert.equal(passiveNodeMeaning({id:'scaled',kind:'notable',mods:[{stat:'damage',kind:'link',fromStat:'armor',value:.01}]}).icon,'plate');
assert.equal(passiveNodeMeaning({id:'scaled',kind:'small',mods:[{stat:'damage',kind:'increased',gauge:'harmony',value:.1}]}).icon,'tuningFork');
assert.equal(passiveNodeMeaning({id:'renamed',kind:'small',mods:[{stat:'life',kind:'increased',value:.1}]}).icon,'heart');
assert.equal(passiveNodeMeaning({id:'unknown',kind:'small',mods:[]}).source,'fallback');
const custom={...PASSIVE_NODE_ART,kinds:{notable:{icon:'shield' as const,style:{material:'engraved'}}},groups:{patron:{defaults:{silhouette:'leaf',style:{symbols:'outline'}},nodes:{gift:{icon:'flower' as const}}}},nodes:{gift:{palette:{accent:'#ffaaaa',ink:'#ffffff',dark:'#100000'},style:{material:'luminous'}}}};
const frozen=JSON.stringify(custom),resolved=resolvePassiveNodeVisual({id:'gift',kind:'notable',group:'patron'},custom)!;
assert.equal(resolved.icon,'flower');assert.equal(resolved.silhouette,'leaf');assert.equal(resolved.palette.accent,'#ffaaaa');
assert.deepEqual(resolved.style,{material:'luminous',symbols:'outline'});assert.equal(JSON.stringify(custom),frozen);
assert.equal(resolvePassiveNodeVisual({id:'constructor',group:'toString',kind:'__proto__'}),undefined);
const settings=makeSettings(),old={...serializeSettings(settings),passiveNodeStyle:{material:'engraved',silhouette:'shield'}};
const restored=deserializeSettings(old)!;
assert(!Object.hasOwn(restored,'passiveNodeStyle'));assert(!Object.hasOwn(serializeSettings(restored),'passiveNodeStyle'));
assert.equal(restored.keybinds.panelTree,settings.keybinds.panelTree);
console.log(`PASS passive node art: ${count} identities, ${symbols.size} standard symbols, ${palettes.size} palettes, shared allocation states, reusable overrides, legacy preference ignored`);
