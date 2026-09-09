import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { mod, type DamageType } from '../src/engine/stats';
import { Actor } from '../src/engine/actor';
import { applyHit, mitigateTyped } from '../src/engine/damage';
import { receiveDamageAs, relayStatusStat, takenAsStat } from '../src/engine/reception';
import { compileItemMods, describeItem, forgeItem, isKnownItemStat, rebuildItem } from '../src/engine/itemgen';
import { resolveUniqueChoices, uniqueDefinitionLines } from '../src/engine/itemchoices';
import { makeSkillInstance, parseSlotGraftStat } from '../src/engine/skills';
import { setSimTap } from '../src/engine/tap';
import { UNIQUES } from '../src/data/uniques';
import { ITEM_BASES } from '../src/data/itembases';
import { SKILLS } from '../src/data/skills';
import { REACTIVE_UNIQUES } from '../src/data/uniques/reactive';
import type { World } from '../src/engine/world';
import { GridWalkField } from '../src/world/gridWalk';

let fails = 0;
const check = (name: string, ok: boolean): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) fails++; };
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const step = (w: World, sec: number): void => { for (let i = 0; i < Math.ceil(sec * 60); i++) w.update(1 / 60); };
const rig = (): World => { const w = makeSimWorld('warrior', 72831); seedGlobalRandom(72831); return w; };
const equip = (w: World, id: string): void => {
  const item = forgeItem({ uniqueId: id, ilvl: 20, quality: 1 })!;
  const cat = ITEM_BASES[item.baseId].category;
  Object.assign(w.localSeat.meta.equipped, { [cat === 'ring' ? 'ring1' : cat]: item });
  w.recalcSeat(w.localSeat);
};
const body = (w: World, owner?: Actor): Actor => {
  const a = w.createMonster('zombie', 10, owner ? owner.team : 'enemy', owner);
  a.pos = { x: w.player.pos.x + 35, y: w.player.pos.y }; a.brain = undefined;
  a.sheet.setSource('fixture', [mod('life', 'flat', 1e6), mod('evasion', 'flat', -1e6), mod('poise', 'flat', -1e6)]);
  a.fillResources(); w.actors.push(a); return a;
};
bootSimEngine();
for (const id of ['grounded_lattice', 'shared_cup', 'galewrights', 'rote_hand', ...REACTIVE_UNIQUES.map(u => u.id)]) {
  check(`${id}: base and all alternative stats resolve`, !!ITEM_BASES[UNIQUES[id].baseId]
    && uniqueDefinitionLines(UNIQUES[id]).every(l => isKnownItemStat(l.stat)));
  for (const ilvl of [10, 50, 100]) {
    const item = forgeItem({ uniqueId: id, ilvl })!;
    check(`${id}@${ilvl}: save and tooltip preserve finite rolls`,
      compileItemMods(item).every(m => Number.isFinite(m.value))
      && JSON.stringify(compileItemMods(item)) === JSON.stringify(compileItemMods(rebuildItem(JSON.parse(JSON.stringify(item)))!))
      && !/NaN|undefined|\{v/.test(JSON.stringify(describeItem(item))));
  }
}

// Simultaneous incoming conversion is conservative and precedes mitigation.
{
  const a = new Actor('receiver', 'player', { x: 0, y: 0 });
  a.sheet.setBase('armor', 0); a.sheet.setBase('energyShield', 0);
  a.sheet.setSource('conversion', [mod(takenAsStat('physical', 'lightning'), 'flat', 0.5), mod('lightningRes', 'flat', 0.5)]);
  check('receive-as: physical hit uses lightning resistance for the shifted half', close(mitigateTyped(a, { physical: 100 }), 75));
  a.sheet.setSource('conversion', [mod(takenAsStat('physical', 'lightning'), 'flat', 0.8),
    mod(takenAsStat('physical', 'fire'), 'flat', 0.8), mod(takenAsStat('lightning', 'cold'), 'flat', 1)]);
  const out = receiveDamageAs(a, { physical: 100, lightning: 20 });
  check('receive-as: competing routes normalize and never recurse', close(out.fire!, 50)
    && close(out.lightning!, 50) && close(out.cold!, 20) && close(Object.values(out).reduce((n, v) => n + v, 0), 120));
  a.sheet.removeSource('conversion'); const original = { physical: 100 };
  check('receive-as: absent stats preserve the original bundle', receiveDamageAs(a, original) === original);
  const e = new Actor('striker', 'enemy', { x: 0, y: 0 });
  a.sheet.setSource('conversion', [mod(takenAsStat('physical', 'lightning'), 'flat', 0.5)]);
  a.sheet.setBase('life', 1000); a.fillResources();
  const hit = applyHit(e, a, { amounts: { physical: 10 }, crit: false, tags: new Set(['spell']), sourceName: 'fixture' });
  check('receive-as: landed hit exposes received types', hit.receivedAmounts?.lightning === 5);
}

// Redirect BEFORE the owner wears the shock; preserve attribution and potency.
{
  const w = rig(), p = w.player; equip(w, 'grounded_lattice');
  const near = body(w), far = body(w); far.pos.x += 100;
  const upper = body(w); upper.pos.x = p.pos.x + 1; upper.tier = 1;
  near.sheet.setSource('mirror', [mod(relayStatusStat('grounding'), 'flat', 1)]);
  p.applyStatus('shock', 0, 2, 'fixture', { casterId: far.id, power: 1.7 });
  const s = near.statuses.find(s => s.id === 'shock');
  check('relay: nearest enemy receives the shock, never the wearer', !!s && !p.statuses.some(s => s.id === 'shock') && !far.statuses.some(s => s.id === 'shock'));
  check('relay: preserves potency and credits the relay owner', s?.power === 1.7 && s.casterId === p.id);
  check('relay: cannot jump stories or bounce back recursively', !upper.statuses.some(s => s.id === 'shock') && !p.statuses.some(s => s.id === 'shock'));
  near.pos.x += 1000; far.pos.x += 1000;
  p.applyStatus('shock', 0, 1, 'fixture');
  check('relay: no eligible recipient leaves the original shock intact', p.statuses.some(s => s.id === 'shock'));
}

// Real hits route the new typed trigger, including absorbed wounds. Echo depth stays bounded.
{
  const w = rig(), p = w.player; equip(w, 'grounded_lattice'); equip(w, 'storm_tithe');
  const e = body(w);
  p.sheet.setSource('fixture', [mod('proc_lattice_discharge', 'flat', 1), mod('life', 'flat', 1e6), mod('blockChance', 'flat', -1e6)]);
  p.fillResources(); p.absorb = 1e6; p.absorbTimer = 100;
  e.sheet.setSource('reply', [mod('proc_lattice_discharge', 'flat', 1)]);
  let mine = 0, theirs = 0, depth = 0;
  setSimTap({ onCast: (a, inst) => { if (inst.def.id === 'lattice_discharge') {
    if (a === p) { mine++; depth = inst.procChainDepth ?? 0; } else theirs++;
  } } });
  const strike = (type: DamageType): void => {
    const inst = makeSkillInstance({ id: 'fixture_hit', name: 'Fixture Hit', tags: ['spell'],
      description: 'A controlled incoming hit.', color: '#ffffff',
      manaCost: 0, cooldown: 0, useTime: 0, delivery: { type: 'nova', radius: 90 },
      baseDamage: { [type]: [10, 10] }, effects: [{ type: 'damage' }] }, 1);
    w.executeSkill(e, inst, p.pos); step(w, 0.1);
  };
  const hp = p.life;
  strike('cold'); check('lattice: unrelated cold hits do not discharge', mine === 0);
  for (let i = 0; i < 8 && !mine; i++) { strike('physical'); step(w, 1.6); }
  check('lattice: physical received as lightning can discharge through absorption', mine > 0 && close(p.life, hp));
  check('lattice: nova retains proc depth and cannot start a free counterchain', depth === 1 && theirs === 0);
  const before = mine; strike('physical'); strike('physical');
  check('lattice: simultaneous blows respect the internal cooldown', mine <= before + 1);
  setSimTap(null);
  equip(w, 'coal_remembered');
  p.sheet.setSource('coalFixture', [mod('proc_cinder_answer', 'flat', 1)]);
  p.ward = 0;
  for (let i = 0; i < 8 && p.ward === 0; i++) strike('cold');
  check('coal: cold received as fire can trigger the ward answer', p.ward > 0);
}

// The weaker bond reaches beyond the default eight recipients, without double-feeding companions.
{
  const w = rig(), p = w.player; equip(w, 'shared_cup');
  const pets = Array.from({ length: 12 }, () => body(w, p));
  const companion = body(w, p); companion.companion = true;
  for (const a of [...pets, companion]) a.life = a.maxLife() / 2;
  p.gainEvents.push({ kind: 'restore', depth: 0, id: 'life', n: 100, dur: 10, tags: ['flask'] });
  step(w, 0.02);
  const small = pets.map(a => a.restoreStreams.find(s => s.resource === 'life')?.perSec ?? 0);
  const large = companion.restoreStreams.find(s => s.resource === 'life')?.perSec ?? 0;
  check('cup: every minion gets the weaker flask bond', small.every(s => s > 0 && s < large));
  check('cup: companions receive only the stronger channel', close(large, 10 * p.sheet.get('sympathy_bond_flask'))
    && small.every(s => close(s, 10 * p.sheet.get('sympathy_cup_minion_flask'))));
  step(w, 0.1);
  check('cup: echoes do not recursively multiply', pets.every(a => a.restoreStreams.length === 1));
  for (const a of [...pets, companion]) { a.restoreStreams = []; a.sheet.setBase('lifeRegen', 0); a.life = a.maxLife() / 2; }
  const minionHp = pets[0].life, companionHp = companion.life;
  p.gainEvents.push({ kind: 'orb', id: 'life', depth: 0, n: 100 }); step(w, 0.02);
  check('cup: orb gains reach minions at lower strength too', pets.every(a => a.life > minionHp)
    && companion.life - companionHp > pets[0].life - minionHp);
}

// Random fingers keep identity, distinct supports, and legal slot addresses.
{
  const rng = new Rng(61923), counts = new Set<number>(), slots = new Set<number>(); let legal = true;
  for (let i = 0; i < 150; i++) {
    const item = forgeItem({ uniqueId: 'rote_hand', ilvl: 20, rng: () => rng.next() })!;
    const rows = compileItemMods(item).map(m => ({ graft: parseSlotGraftStat(m.stat), value: m.value })).filter(r => r.graft);
    counts.add(rows.length); rows.forEach(r => slots.add(r.graft!.slot));
    legal &&= rows.length >= 1 && rows.length <= 4 && rows.every(r => r.value === 1)
      && new Set(rows.map(r => r.graft!.gemId)).size === rows.length;
  }
  check('rote: one to four distinct supports roll across every skill slot', legal && counts.size === 4 && slots.size === 8);
  const old = forgeItem({ uniqueId: 'rote_hand', ilvl: 20 })!; delete old.uniqueChoices;
  check('rote: legacy migration is deterministic', JSON.stringify(resolveUniqueChoices(old, UNIQUES.rote_hand)) === JSON.stringify(resolveUniqueChoices(old, UNIQUES.rote_hand)));
  const saved = forgeItem({ uniqueId: 'rote_hand', ilvl: 20 })!, before = JSON.stringify(compileItemMods(saved));
  UNIQUES.rote_hand.choices![0].options.reverse();
  check('rote: reordering support options cannot reroll saved fingers', JSON.stringify(compileItemMods(saved)) === before);
  UNIQUES.rote_hand.choices![0].options.reverse();
}

// The periodic twister is a real moving, bounded projectile on the existing carom path.
{
  const w = rig(), p = w.player; equip(w, 'galewrights');
  step(w, 0.1);
  let twister = w.projectiles.find(p => p.inst.def.id === 'galewright_twister');
  if (!twister) { step(w, 4); twister = w.projectiles.find(p => p.inst.def.id === 'galewright_twister'); }
  check('galewrights: releases without a cast or movement', !!twister);
  if (twister) {
    const grid = new GridWalkField(w.arena.w, w.arena.h, 24);
    grid.fillRect(0, 0, w.arena.w, w.arena.h, true);
    grid.fillRegion(p.pos.x + 90, 0, p.pos.x + 140, w.arena.h, 'wall'); w.walk = grid;
    twister.dir = 0; const before = twister.pos.x;
    step(w, 0.7);
    check('twister: moves and rebounds from the environment', twister.pos.x !== before && Math.cos(twister.dir) < 0);
  }
  delete w.localSeat.meta.equipped.gloves; w.recalcSeat(w.localSeat); step(w, 5);
  check('galewrights: removal stops births and flights expire', !w.projectiles.some(p => p.inst.def.id === 'galewright_twister'));
  check('twister: enemy carom and finite life are explicit data', SKILLS.galewright_twister.delivery.type === 'projectile'
    && SKILLS.galewright_twister.delivery.trajectory?.caromOnHit === 1 && SKILLS.galewright_twister.delivery.duration === 3.5);
}
{
  const w = rig(), p = w.player, e = body(w); e.pos.x = p.pos.x + 90;
  const hp = e.life;
  w.executeSkill(p, makeSkillInstance(SKILLS.galewright_twister, 5), e.pos);
  const shot = w.projectiles[w.projectiles.length - 1];
  step(w, 0.45);
  check('twister: enemy impact damages and deflects instead of ending the flight',
    e.life < hp && shot.hits.has(e.id) && w.projectiles.includes(shot));
}

console.log(`Reactive uniques: ${fails ? `${fails} FAILED` : 'all passed'}`);
process.exitCode = fails ? 1 : 0;
