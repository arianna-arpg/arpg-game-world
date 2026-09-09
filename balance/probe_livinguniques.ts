import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { mod, ATTRIBUTES } from '../src/engine/stats';
import { makeSkillInstance } from '../src/engine/skills';
import { compileItemMods, describeItem, forgeItem, isKnownItemStat, rebuildItem, rollItem } from '../src/engine/itemgen';
import { resolveUniqueChoices, uniqueDefinitionLines } from '../src/engine/itemchoices';
import { syncAttributeBequests, bequestStat } from '../src/engine/bequests';
import { TRAIL_GRANTS, placeGrantedPockets, pocketGrantStat, throngMorphStat } from '../src/engine/fieldgrants';
import { WORN_THRONGS, wornThrongCap, wornThrongPeriod, wornThrongStat } from '../src/engine/throng';
import { UNIQUES } from '../src/data/uniques';
import { LIVING_UNIQUES, BORROWED_REFUGE } from '../src/data/uniques/living';
import { SKILLS } from '../src/data/skills';
import { ITEM_BASES } from '../src/data/itembases';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { setSimTap } from '../src/engine/tap';
import { GridWalkField } from '../src/world/gridWalk';
import { updateAI } from '../src/engine/ai';

let failed = 0;
const check = (name: string, pass: boolean, detail = ''): void => {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!pass) failed++;
};
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const step = (w: World, sec: number): void => { for (let i = 0; i < Math.ceil(sec * 60); i++) w.update(1 / 60); };
const rig = (seed: number): World => { const w = makeSimWorld('warrior', seed); seedGlobalRandom(seed); return w; };
const equip = (w: World, id: string): void => {
  const item = rollItem({ ilvl: 20, uniqueId: id })!;
  const category = ITEM_BASES[item.baseId].category;
  Object.assign(w.localSeat.meta.equipped, { [category === 'ring' ? 'ring1' : category]: item });
  w.recalcSeat(w.localSeat);
};
const strip = (w: World): void => { w.localSeat.meta.equipped = {}; w.recalcSeat(w.localSeat); step(w, 0.25); };
const body = (w: World, x: number, y: number, owner?: Actor): Actor => {
  const a = w.createMonster('zombie', 3, owner ? owner.team : 'enemy', owner);
  a.pos = vec(x, y); a.brain = undefined;
  a.sheet.setBase('life', 10000); a.fillResources();
  a.sheet.setSource('fixture', [mod('evasion', 'flat', -1e6), mod('armor', 'flat', -1e6)]);
  w.actors.push(a);
  return a;
};

bootSimEngine();
seedGlobalRandom(0x11a0);
for (const def of [...LIVING_UNIQUES, UNIQUES.gleaners_crown, UNIQUES.borrowed_breath]) {
  check(`${def.id}: every possible modifier and base resolves`, !!ITEM_BASES[def.baseId]
    && uniqueDefinitionLines(def).every(l => isKnownItemStat(l.stat)));
  for (const ilvl of [20, 60, 100]) {
    const item = rollItem({ ilvl, uniqueId: def.id })!;
    check(`${def.id}@${ilvl}: finite stats and readable tooltip`, compileItemMods(item).every(m => Number.isFinite(m.value))
      && describeItem(item).unique.every(s => !/NaN|undefined|\{v/.test(s)));
    check(`${def.id}@${ilvl}: save preserves all rolls`,
      JSON.stringify(compileItemMods(item)) === JSON.stringify(compileItemMods(rebuildItem(JSON.parse(JSON.stringify(item)))!)));
  }
}

// Alternative line groups: drop, forge, legacy migration and stable IDs.
for (const id of ['lineage_knot', 'gleaners_crown']) {
  const def = UNIQUES[id], group = def.choices![0];
  const choices = new Set<string>();
  for (const r of [0.05, 0.45, 0.95]) {
    const item = rollItem({ ilvl: 20, uniqueId: id, rng: () => r })!;
    choices.add(item.uniqueChoices![group.id].id);
    const before = JSON.stringify(compileItemMods(item));
    group.options.reverse();
    check(`${id}: saved choice survives option reorder`, JSON.stringify(compileItemMods(item)) === before);
    group.options.reverse();
  }
  check(`${id}: all authored alternatives can roll`, choices.size === group.options.length);
  const old = rollItem({ ilvl: 20, uniqueId: id })!;
  delete old.uniqueChoices;
  const first = resolveUniqueChoices(old, def);
  check(`${id}: legacy identity is deterministic`, JSON.stringify(first) === JSON.stringify(resolveUniqueChoices(old, def)));
  old.uniqueChoices = { [group.id]: { id: 'retired_choice', rolls: [NaN] } };
  check(`${id}: removed options migrate safely`, !!resolveUniqueChoices(old, def)?.[group.id]
    && compileItemMods(old).every(m => Number.isFinite(m.value)));
  const forged = forgeItem({ ilvl: 20, uniqueId: id, quality: 1 })?.uniqueChoices?.[group.id];
  check(`${id}: forge quality covers alternative lines`, !!forged && forged.rolls.every(r => r === 1));
}

// Walking and movement abilities both leave ordinary, attributed damage zones.
{
  const w = rig(0x11a1), p = w.player;
  equip(w, 'cinderstep');
  step(w, 0.5);
  check('trail: standing still leaves no patches', !w.zones.some(z => z.inst.def.id === 'cinderstep_trace'));
  for (let n = 0; n < 35; n++) { w.moveActor(p, 1, 0, 1 / 60); step(w, 1 / 60); }
  const patches = w.zones.filter(z => z.inst.def.id === 'cinderstep_trace');
  check('trail: ordinary walking leaves bounded fire', patches.length > 0 && patches.length <= TRAIL_GRANTS.cinderstep.maxPatches);
  const patch = patches[patches.length - 1];
  if (patch) {
    const foe = body(w, patch.pos.x, patch.pos.y), hp = foe.life;
    const otherStory = body(w, patch.pos.x, patch.pos.y); otherStory.tier = 1;
    const otherHp = otherStory.life;
    let credited = false;
    setSimTap({ onHit: (attacker, target) => { if (attacker === p && target === foe) credited = true; } });
    step(w, 1.5);
    check('trail: crossing enemies take damage credited to the wearer', foe.life < hp && credited);
    check('trail: ground fire cannot hit another story', otherStory.life === otherHp);
    setSimTap(null);
  }
  step(w, 3);
  const dash = makeSkillInstance(SKILLS.dash, 1); p.skills[7] = dash; p.mana = p.maxMana();
  check('trail: real dash starts', w.useSkill(p, dash, vec(p.pos.x + 200, p.pos.y)));
  step(w, 0.4);
  check('trail: a movement skill also leaves fire', w.zones.some(z => z.inst.def.id === 'cinderstep_trace'));
  strip(w);
  for (let n = 0; n < 180; n++) { w.moveActor(p, -1, 0, 1 / 60); step(w, 1 / 60); }
  check('trail: removal stops new patches and old ones expire', !w.zones.some(z => z.inst.def.id === 'cinderstep_trace'));
  equip(w, 'winter_after_you');
  for (let n = 0; n < 45; n++) { w.moveActor(p, 1, 0, 1 / 60); step(w, 1 / 60); }
  check('trail: second registered payload produces cold patches', w.zones.some(z => z.inst.def.id === 'rimeglass_trace'));
}

// The direct worn brood replenishes without a bar skill or walking to husks.
{
  const w = rig(0x11a2), p = w.player;
  equip(w, 'pale_watch');
  const def = WORN_THRONGS.pale_watch, rank = p.sheet.get(wornThrongStat(def.id));
  const cap = wornThrongCap(def, rank), period = wornThrongPeriod(def, rank);
  step(w, period * (cap + 1));
  const roster = () => w.throngBodiesOf(p, 'worn:pale_watch');
  check('watch: fills its ranked cap automatically', roster().length === cap, `${roster().length}/${cap}`);
  check('watch: bodies scale to keeper level and remain owned', roster().every(a => a.level === p.level && a.owner === p));
  const lost = roster()[0]; if (lost) w.kill(lost);
  step(w, period * 0.5);
  check('watch: a loss incurs a real replenishment wait', roster().length === cap - 1);
  step(w, period * 0.7 + 0.3);
  check('watch: loss is replaced after its timer', roster().length === cap);
  check('watch: higher ranks grow cap and shorten wait', wornThrongCap(def, rank + 4) > cap && wornThrongPeriod(def, rank + 4) < period);
  const foe = body(w, p.pos.x + 140, p.pos.y), foeLife = foe.life;
  for (let i = 0; i < 180; i++) {
    for (const minion of roster()) updateAI(minion, w, 1 / 60);
    w.update(1 / 60);
  }
  check('watch: the passive vanguard attacks without a player command', foe.life < foeLife);
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const restored = rig(0x11a3); applySavedCharacter(restored, saved);
  check('watch: save restores the owned roster', restored.throngBodiesOf(restored.player, 'worn:pale_watch').length === cap);
  strip(w); step(w, period * 2);
  check('watch: unequip dismisses roster without farmable husks', !roster().length && !w.actors.some(a => !a.dead && a.throngWild === 'phantasm'));
}

// Bequests work from ordinary modifiers, refresh live, and never compound.
{
  const w = rig(0x11a4), p = w.player;
  p.setAttributes({ ...w.localSeat.meta.attrs, strength: 100, prowess: 0, fortitude: 0 });
  p.sheet.setSource('fixtureBequest', [mod(bequestStat('might'), 'flat', 0.2)]);
  const pet = body(w, 500, 500, p), hp = pet.maxLife();
  const expected40 = pet.sheet.get('life', undefined, [mod('life', 'flat', 40)]);
  const expected80 = pet.sheet.get('life', undefined, [mod('life', 'flat', 80)]);
  const expected16 = pet.sheet.get('life', undefined, [mod('life', 'flat', 16)]);
  const companion = body(w, 600, 500, p); companion.companion = true;
  const wild = body(w, 700, 500), wildHp = wild.maxLife();
  syncAttributeBequests(pet); syncAttributeBequests(companion);
  check('bequest: the real attribute grammar feeds minion life', close(pet.maxLife(), expected40), `${pet.maxLife()} vs ${expected40}`);
  check('bequest: companions receive the same original attribute benefits', !!companion.bequestSignature);
  const once = pet.maxLife();
  for (let i = 0; i < 20; i++) syncAttributeBequests(pet);
  check('bequest: repeated refreshes do not compound', pet.maxLife() === once);
  p.setAttributes({ ...w.localSeat.meta.attrs, strength: 200, prowess: 0, fortitude: 0 });
  step(w, 0.1);
  check('bequest: changing the keeper refreshes existing minions', close(pet.maxLife(), expected80));
  check('bequest: unrelated bodies receive nothing', wild.maxLife() === wildHp && !wild.bequestSignature);
  syncAttributeBequests(pet, 0.2);
  check('bequest: throng batch divisor applies exactly once', close(pet.maxLife(), expected16));
  const grandchild = body(w, 800, 500, pet);
  pet.sheet.setSource('fixtureBequest', [mod(bequestStat('might'), 'flat', 0.2)]);
  syncAttributeBequests(grandchild);
  check('bequest: inherited attributes cannot propagate recursively', !grandchild.bequestSignature);
  p.sheet.removeSource('fixtureBequest'); step(w, 0.1);
  check('bequest: removing the source retracts inherited benefits', close(pet.maxLife(), hp) && !companion.bequestSignature);
  check('bequest: attribute definitions remain unchanged', ATTRIBUTES.strength.perPoint[0].value === 2);
  // Pooled bodies intentionally have no stat sheet. At a real interaction
  // boundary they promote and receive the same batch-scaled investment.
  p.sheet.setSource('fixtureBequest', [mod(bequestStat('might'), 'flat', 0.2)]);
  w.devThrongGrant('raise_gnatveil');
  const ki = w.liteKindOf('gnatling');
  const pi = w.lite.spawn(ki, p.pos.x, p.pos.y, 1, p.id, w.liteKinds[ki].plies0);
  const promoted = w.promoteLite(pi);
  check('bequest: promoted swarm bodies receive inherited benefits', !!promoted?.bequestSignature
    && (promoted.sheet.getSourceMods('bequest')?.length ?? 0) > 0);
}

// A changed kind stays in Gnatveil's roster, through command, cap and save.
{
  const w = rig(0x11a5), p = w.player;
  equip(w, 'gleaners_crown');
  const crown = w.localSeat.meta.equipped.helmet!;
  crown.uniqueChoices = { gathered_kind: { id: 'cinders', rolls: [1] } }; w.recalcSeat(w.localSeat);
  check('crown: tooltip speaks the persistent chosen kind', describeItem(crown).unique.some(s => s.includes('Cinderkin')));
  w.devThrongGrant('raise_gnatveil');
  p.sheet.setSource('fixtureMorph', [mod(throngMorphStat('cinders'), 'flat', 1)]);
  w.devThrongPocketHere('raise_gnatveil', 3);
  const husks = w.actors.filter(a => a.throngWild === 'gnatling');
  check('crown: Gnatveil finds can wear cinder bodies and keep their affinity', husks.length === 3 && husks.every(a => a.defId === 'cinderkin'));
  for (const h of husks) { p.pos = vec(h.pos.x, h.pos.y); step(w, 0.25); }
  const roster = w.throngBodiesOf(p, 'raise_gnatveil');
  check('crown: changed bodies join the ORIGINAL skill roster', roster.length === 3 && roster.every(a => a.defId === 'cinderkin'));
  const anchor = p.skills.find(s => s?.def.id === 'raise_gnatveil')!;
  p.mana = p.maxMana(); w.useSkill(p, anchor, vec(p.pos.x + 150, p.pos.y)); step(w, 0.3);
  check('crown: the original channel directs changed bodies', roster.some(a => a.aiCommand?.kind === 'assault'));
  const saved = JSON.parse(JSON.stringify(serializeCharacter(w)));
  const restored = rig(0x11a6); applySavedCharacter(restored, saved); step(restored, 2);
  check('crown: save and lite-demotion preserve the changed body kind',
    restored.throngBodiesOf(restored.player, 'raise_gnatveil').filter(a => a.defId === 'cinderkin').length === 3);
  const before = JSON.stringify(saved.throng);
  check('crown: save records both skill and body identities', before.includes('raise_gnatveil') && before.includes('cinderkin'));
  const tooMany = [{ skillId: 'raise_gnatveil', defId: 'cinderkin', level: 1, count: 999 },
    { skillId: 'raise_gnatveil', defId: 'palewisp', level: 1, count: 999 }];
  restored.restoreThrong(tooMany);
  const restoredAnchor = restored.player.skills.find(s => s?.def.id === 'raise_gnatveil')!;
  check('crown: mixed-kind save rows share ONE cap', restored.throngRosterCount(restored.player, restoredAnchor)
    <= restored.throngCapOf(restored.player, restoredAnchor));
}

// Granted terrain: deterministic circles, exclusive benefits, removal and wire.
{
  const w = rig(0x11a7), p = w.player;
  check('refuge: absent grant adds no pockets', !w.grantedPocketsFor(p).length);
  equip(w, 'borrowed_breath');
  const pockets = w.grantedPocketsFor(p), original = JSON.stringify(pockets);
  check('refuge: a normal dry zone gains air pockets', pockets.length > 0);
  const first = pockets[0];
  if (first) {
    p.pos = vec(first.x + first.r + 35, first.y); step(w, 0.1);
    const outsideDamage = p.sheet.get('damage'), outsideSpeed = p.sheet.get('moveSpeed');
    p.pos = vec(first.x, first.y); step(w, 0.1);
    check('refuge: inside grants more damage and trades away outside speed',
      close(p.sheet.get('damage') / outsideDamage, 1.25) && p.sheet.get('moveSpeed') < outsideSpeed);
    check('refuge: walking never moves the pockets', JSON.stringify(w.grantedPocketsFor(p)) === original);
    const bare = body(w, first.x, first.y);
    check('refuge: another actor does not inherit the wearer\'s pocket grant', !w.grantedPocketsFor(bare).length);
    const snap = serializeSnapshot(w, 1), replica = rig(0x11a8);
    applySnapshot(replica, JSON.parse(JSON.stringify(snap)));
    check('refuge: replica receives the exact authoritative circles',
      JSON.stringify(replica.syncedGrantedPockets?.[p.id]) === original);
    replica.appliedZoneId = snap.zoneId;
    applySnapshot(replica, { ...snap, zoneId: 'stale-zone', grantedPockets: undefined });
    check('refuge: stale zone snapshots cannot erase current fields',
      JSON.stringify(replica.syncedGrantedPockets?.[p.id]) === original);
    applySnapshot(replica, { ...snap, grantedPockets: undefined });
    check('refuge: the next empty snapshot removes a stale grant', !replica.grantedPocketsFor(replica.player).length);
    p.pos = vec(first.x + first.r + 1, first.y); step(w, 0.1);
    check('refuge: the drawn rim is the benefit boundary', close(p.sheet.get('damage'), outsideDamage));
    // Exercise the existing underwater region's real drain dispatch while
    // retaining this zone's already-determined refuge geometry.
    const originalWalk = w.walk;
    const water = new GridWalkField(w.arena.w, w.arena.h, 24);
    water.fillRegion(0, 0, w.arena.w, w.arena.h, 'deep_water');
    w.walk = water;
    p.survival = new Map([['breath', 3]]);
    p.pos = vec(first.x, first.y); step(w, 0.5);
    const sheltered = p.survival.get('breath')!;
    check('refuge: an underwater air pocket actually restores breath', sheltered > 3);
    p.pos = vec(first.x + first.r + 10, first.y); step(w, 0.5);
    check('refuge: leaving the pocket resumes the eased breath drain', p.survival.get('breath')! < sheltered);
    w.walk = originalWalk;
  }
  strip(w);
  check('refuge: removing the amulet removes fields and bonuses', !w.grantedPocketsFor(p).length && !p.pocketGrantSignature);
  equip(w, 'borrowed_breath');
  check('refuge: re-equipping restores identical field locations', JSON.stringify(w.grantedPocketsFor(p)) === original);
  const blocked = placeGrantedPockets(BORROWED_REFUGE, 1, 0, 1600, 1200, () => false);
  check('refuge: impassable terrain cannot receive a fake refuge', blocked.length === 0);
  const corridor = () => placeGrantedPockets(BORROWED_REFUGE, 42, 0, 600, 400,
    (_x, y) => y >= 140 && y <= 205);
  const small = corridor();
  check('refuge: narrow interiors receive smaller, stable refuges', small.length > 0
    && small.every(p => p.r === BORROWED_REFUGE.minRadius)
    && JSON.stringify(small) === JSON.stringify(corridor()));
  check('refuge: base survival-easing stat is retained', p.sheet.get('survivalEase_breath') > 0 && p.sheet.get(pocketGrantStat('borrowed_air')) > 0);
}

console.log(`\nLiving uniques: ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exitCode = failed ? 1 : 0;
