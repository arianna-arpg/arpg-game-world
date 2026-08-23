// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RESIDENCE (skill-items charter M1, engine/gemitems.ts +
// the world.ts flows). Loose gems are 1×1 bag wrapper items; this rig pins:
//   - THE WRAPPER: pack ↔ unpack is lossless for everything a save keeps
//     (level, rarity, sockets + their levels/locks, granted, treeNodes);
//     THE ONE LOCK (the wrapper's mark transfers to the instance at learn).
//   - LEARNED = SEATED: learnSkill(uid) consumes the bag item and takes a
//     rack seat in the one gesture; the gates carry verbatim (duplicate,
//     attribute requirements, the structural cap of eight); unlearn mints
//     the wrapper back and REFUSES BEFORE MUTATING on a full bag.
//   - THE REPLACE: learning onto an occupied seat unlearns the sitter into
//     the just-freed cell first — nothing is ever lost to the swap.
//   - THE SOCKET FLOWS: socketSupport consumes the wrapper; unsocket needs
//     bag room and refuses whole (the socket keeps its gem).
//   - THE BAGFULL REFUSALS: grants (rescue hatch included) refuse a full
//     bag; a vacuumed ground gem STAYS LYING when no cell will hold it.
//   - THE GROUND LAW: the bag speaks wrappers, the ground speaks bare gems
//     — discard unwraps, pickup re-wraps, levels intact.
//   - THE SAVE: wrappers ride CharacterSave.items verbatim; a pre-M1 save's
//     skillInv/inventory side arrays FOLD into wrapped bag items on load.
//   - THE SWEEP EXEMPTION: salvageBulk 'item' never eats gem wrappers.
// Run: npx tsx balance/probe_skillitems.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS, SKILL_LIST } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { START_ZONE } from '../src/data/zones';
import { SALVAGE_SITE } from '../src/data/townBuild';
import { FEATURE } from '../src/meta/account';
import { makeSkillGem, type SupportInstance } from '../src/engine/skills';
import {
  freeCellCount, makeSkillGemItem, makeSupportGemItem, packSkillGemPayload,
  skillGemPayloadOf, skillOfGemItem, supportOfGemItem,
} from '../src/engine/gemitems';
import { serializeCharacter, rebuildSavedMeta, applySavedCharacter, type CharacterSave } from '../src/meta/character';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9e51);

const w: World = makeSimWorld('warrior', 0x9e51);
const seat = w.localSeat;
const m = seat.meta;
const hero = seat.actor;
const bagGems = () => m.items.filter(i => i.gem);

// ----------------------------------------------------- A. THE WRAPPER
{
  const inst = makeSkillGem(SKILLS.fireball, 7, 'rare');
  inst.sockets[0] = { def: SUPPORTS.splitting, level: 3, locked: true } as SupportInstance;
  inst.locked = true;
  inst.attunedForm = 'dire_wolf';
  const item = makeSkillGemItem(inst);
  check('A: the wrapper is a 1×1 skill_gem named for its skill',
    item.baseId === 'skill_gem' && item.name === SKILLS.fireball.name);
  check('A: the keeper\'s mark rides the WRAPPER, never the payload',
    item.locked === true && !('locked' in (item.gem as object)));
  const back = skillOfGemItem(item)!;
  check('A: unpack rebuilds the live instance whole',
    back.level === 7 && back.rarity === 'rare' && back.locked === true
    && back.sockets.length === 3
    && back.sockets[0]?.def.id === 'splitting' && back.sockets[0]?.level === 3
    && back.sockets[0]?.locked === true && back.attunedForm === 'dire_wolf');
  check('A: pack(unpack(x)) is byte-identical (lossless round trip)',
    JSON.stringify(packSkillGemPayload(back)) === JSON.stringify(item.gem));
  const sup = makeSupportGemItem({ def: SUPPORTS.multistrike, level: 4 });
  const supBack = supportOfGemItem(sup)!;
  check('A: the support wrapper round-trips level + identity',
    sup.baseId === 'support_gem' && supBack.def.id === 'multistrike' && supBack.level === 4);
}

// ------------------------------------------- B. LEARNED = SEATED (the flows)
// The rig raises baseAttrs to a giant's (every learn recalcs — the raise
// must live where recalc reads) so the flows themselves are what refuses,
// never a class's native attribute wall; rig C restores at its end.
const savedBase = { ...m.baseAttrs };
for (const k of Object.keys(m.baseAttrs)) (m.baseAttrs as Record<string, number>)[k] = 999;
w.recalcSeat(seat);
{
  const item = w.grantSkillGemItem(seat, makeSkillGem(SKILLS.fireball, 2, 'magic'))!;
  check('B: the grant lands in the bag with a real cell',
    m.items.some(i => i.uid === item.uid) && item.x !== undefined && item.y !== undefined);
  const seatsBefore = hero.skills.filter(s => s).length;
  check('B: learnSkill(uid) consumes the item and TAKES A SEAT (learn = seat)',
    w.learnSkill(item.uid, seat)
    && m.knownSkills.has('fireball')
    && !m.items.some(i => i.uid === item.uid)
    && hero.skills.filter(s => s).length === seatsBefore + 1
    && hero.skills.some(s => s?.def.id === 'fireball'));
  check('B: the learned instance wears the wrapper\'s cargo (level, rarity)',
    m.knownSkills.get('fireball')?.level === 2 && m.knownSkills.get('fireball')?.rarity === 'magic');
  const dupe = w.grantSkillGemItem(seat, makeSkillGem(SKILLS.fireball, 1, 'common'))!;
  check('B: the duplicate gate refuses (item stays bagged)',
    !w.learnSkill(dupe.uid, seat) && m.items.some(i => i.uid === dupe.uid));
  w.dropGearFromBag(seat, dupe.uid); // shed it (unwraps to the ground)
  // The requirement gate — attrs zeroed, the learn refuses whole. (A refused
  // learn never recalcs, so the direct m.attrs write holds for the read.)
  const reqSkill = SKILL_LIST.find(s => s.id !== 'fireball' && !m.knownSkills.has(s.id)
    && s.requirements && Object.values(s.requirements).some(n => (n ?? 0) > 0))!;
  const reqItem = w.grantSkillGemItem(seat, makeSkillGem(reqSkill, 1, 'common'))!;
  for (const k of Object.keys(m.attrs)) (m.attrs as Record<string, number>)[k] = 0;
  check('B: the attribute gate refuses a build below it',
    !w.learnSkill(reqItem.uid, seat) && m.items.some(i => i.uid === reqItem.uid),
    reqSkill.id);
  w.recalcSeat(seat); // restore the giant's attrs from baseAttrs
  w.dropGearFromBag(seat, reqItem.uid);
  // The structural cap: fill every seat, then the next learn refuses.
  const fillers = SKILL_LIST.filter(s => !m.knownSkills.has(s.id)).slice(0, 12);
  let fi = 0;
  while (hero.skills.some(s => s === null) && fi < fillers.length) {
    const it = w.grantSkillGemItem(seat, makeSkillGem(fillers[fi++], 1, 'common'))!;
    w.learnSkill(it.uid, seat);
  }
  check('B: the rack fills to exactly eight (the cap is structural)',
    hero.skills.every(s => s !== null) && m.knownSkills.size === hero.skills.length);
  const overflow = w.grantSkillGemItem(seat, makeSkillGem(fillers[fi] ?? SKILL_LIST[40], 1, 'common'))!;
  check('B: a ninth learn refuses — no free seat (item stays bagged)',
    !w.learnSkill(overflow.uid, seat) && m.items.some(i => i.uid === overflow.uid));
  w.dropGearFromBag(seat, overflow.uid);
}

// --------------------------------------------------- C. THE REPLACE + UNLEARN
{
  const slot = hero.skills.findIndex(s => s?.def.id === 'fireball');
  const incDef = SKILL_LIST.find(s => !m.knownSkills.has(s.id))!;
  const inc = w.grantSkillGemItem(seat, makeSkillGem(incDef, 3, 'common'))!;
  const incId = incDef.id;
  check('C: learning onto an OCCUPIED seat replaces — the sitter lands in the bag',
    w.learnSkill(inc.uid, seat, slot)
    && hero.skills[slot]?.def.id === incId
    && !m.knownSkills.has('fireball')
    && m.items.some(i => i.gem?.kind === 'skill' && i.gem.skillId === 'fireball'));
  check('C: the displaced sitter kept its cargo (level 2, magic — rig B\'s)',
    (() => {
      const p = skillGemPayloadOf(m.items.find(i => i.gem?.kind === 'skill' && i.gem.skillId === 'fireball')!)!;
      return p.level === 2 && p.rarity === 'magic';
    })());
  // Unlearn back to the bag, cargo intact.
  const known = m.knownSkills.get(incId)!;
  known.level = 9;
  check('C: unlearn mints the wrapper back (cargo rides: level 9)',
    w.unlearnSkill(incId, seat)
    && !m.knownSkills.has(incId)
    && skillGemPayloadOf(m.items.find(i => i.gem?.kind === 'skill' && i.gem.skillId === incId)!)?.level === 9);
  // THE ROOM LAW: a FULL bag refuses the unlearn before anything unwinds.
  while (freeCellCount(m.items) > 0) {
    w.grantSupportGemItem(seat, { def: SUPPORTS.multistrike, level: 1 });
  }
  const seated = hero.skills.find(s => s)!;
  check('C: a full bag REFUSES the unlearn — still learned, still seated',
    !w.unlearnSkill(seated.def.id, seat)
    && m.knownSkills.has(seated.def.id)
    && hero.skills.some(s => s?.def.id === seated.def.id));
  m.items = m.items.filter(i => !(i.gem?.kind === 'support')); // clear the packing
  Object.assign(m.baseAttrs, savedBase);
  w.recalcSeat(seat);
}

// ------------------------------------------------------- D. THE SOCKET FLOWS
{
  // Find a seated host multistrike actually fits (try each — the gate is
  // the engine's own; the warrior kit always fields a strike).
  const supItem = w.grantSupportGemItem(seat, { def: SUPPORTS.multistrike, level: 2 })!;
  let host = null as import('../src/engine/skills').SkillInstance | null;
  for (const s of hero.skills) {
    if (s && s.sockets.includes(null) && w.socketSupport(supItem.uid, s.def.id, seat)) { host = s; break; }
  }
  check('D: multistrike finds a seated host in the warrior kit', !!host, host?.def.id ?? 'none');
  if (host) {
    check('D: socketing consumed the wrapper into the skill',
      !m.items.some(i => i.uid === supItem.uid)
      && host.sockets.some(s => s?.def.id === 'multistrike' && s.level === 2));
    const si = host.sockets.findIndex(s => s?.def.id === 'multistrike');
    // Fill the bag: the unsocket must refuse whole.
    while (freeCellCount(m.items) > 0) w.grantSupportGemItem(seat, { def: SUPPORTS.splitting, level: 1 });
    check('D: a full bag REFUSES the unsocket — the socket keeps its gem',
      !w.unsocketSupport(host.def.id, si, seat) && host.sockets[si]?.def.id === 'multistrike');
    m.items = m.items.filter(i => i.gem?.kind !== 'support');
    check('D: with room, the unsocket mints the wrapper back (level intact)',
      w.unsocketSupport(host.def.id, si, seat)
      && m.items.some(i => i.gem?.kind === 'support' && (i.gem as { level: number }).level === 2));
    m.items = m.items.filter(i => i.gem?.kind !== 'support');
  }
}

// -------------------------------------------------- E. THE BAGFULL GRANTS
{
  while (freeCellCount(m.items) > 0) w.grantSupportGemItem(seat, { def: SUPPORTS.splitting, level: 1 });
  const gemsBefore = bagGems().length;
  check('E: a grant against a full bag returns null and mints NOTHING',
    w.grantSkillGemItem(seat, makeSkillGem(SKILLS.fireball, 1, 'common')) === null
    && bagGems().length === gemsBefore);
  // The vacuumed ground gem STAYS LYING on a full bag.
  const dropsBefore = w.drops.length;
  w.drops.push({ pos: { x: hero.pos.x, y: hero.pos.y }, item: { kind: 'skill', inst: makeSkillGem(SKILLS.fireball, 5, 'rare') }, bob: 0 });
  w.update(1 / 60);
  check('E: a ground gem stays lying when no cell will hold it',
    w.drops.length === dropsBefore + 1);
  m.items = m.items.filter(i => i.gem?.kind !== 'support');
  w.update(1 / 60);
  check('E: the same gem vacuums the moment room opens — re-wrapped, cargo intact',
    w.drops.length === dropsBefore
    && m.items.some(i => i.gem?.kind === 'skill' && i.gem.skillId === 'fireball'
      && (i.gem as { level: number }).level === 5));
}

// -------------------------------------------------------- F. THE GROUND LAW
{
  const wrapper = m.items.find(i => i.gem?.kind === 'skill' && i.gem.skillId === 'fireball'
    && (i.gem as { level: number }).level === 5)!;
  const dropsBefore = w.drops.length;
  w.dropGearFromBag(seat, wrapper.uid);
  const last = w.drops[w.drops.length - 1];
  check('F: a discarded wrapper UNWRAPS — the ground speaks bare gems',
    w.drops.length === dropsBefore + 1 && last.item.kind === 'skill'
    && last.item.inst.level === 5 && last.item.inst.rarity === 'rare');
  w.drops.pop(); // tidy the stage
}

// ------------------------------------------------- G. THE SWEEP EXEMPTION
{
  // Stand at the real bench (the salvagemode probe's own dance) so the
  // gear sweep genuinely RUNS — and still spares every gem wrapper.
  w.account.features.add(FEATURE.SALVAGE_STATION);
  w.loadZone(START_ZONE);
  w.player.pos.x = SALVAGE_SITE.x;
  w.player.pos.y = SALVAGE_SITE.y;
  check('G: the bench answers', w.nearSalvage());
  const gemItem = m.items.find(i => i.gem?.kind === 'skill')
    ?? w.grantSkillGemItem(seat, makeSkillGem(SKILLS.fireball, 1, 'common'))!;
  const gemsBefore = bagGems().length;
  w.salvageBulk(seat, 'item', undefined, 'break');
  check('G: the GEAR sweep runs but spares every gem wrapper (their own categories sweep them)',
    bagGems().length === gemsBefore && m.items.some(i => i.uid === gemItem.uid));
}

// ------------------------------------------------------------ H. THE SAVE
{
  const save = serializeCharacter(w);
  const wrappersNow = bagGems().length;
  check('H: the save writes NO legacy side arrays',
    save.skillInv === undefined && save.inventory === undefined);
  const rebuilt = rebuildSavedMeta(save)!;
  check('H: gem wrappers ride items through the save verbatim',
    rebuilt.meta.items.filter(i => i.gem).length === wrappersNow
    && JSON.stringify(rebuilt.meta.items.filter(i => i.gem).map(i => i.gem))
      === JSON.stringify(m.items.filter(i => i.gem).map(i => i.gem)));
  // THE LEGACY FOLD: a pre-M1 save's side arrays wrap into bag items.
  const legacy: CharacterSave = JSON.parse(JSON.stringify(save)) as CharacterSave;
  legacy.items = [];
  legacy.skillInv = [{ skillId: 'fireball', level: 6, rarity: 'rare', sockets: [null, { supportId: 'splitting', level: 2 }, null], locked: true } as never];
  legacy.inventory = [{ supportId: 'multistrike', level: 3, locked: true } as never];
  const folded = rebuildSavedMeta(legacy)!;
  const fSkill = folded.meta.items.find(i => i.gem?.kind === 'skill');
  const fSup = folded.meta.items.find(i => i.gem?.kind === 'support');
  check('H: legacy skillInv rows fold into wrapped bag items (cargo + lock intact)',
    !!fSkill && fSkill.locked === true
    && (fSkill.gem as { level: number }).level === 6
    && (fSkill.gem as { sockets: unknown[] }).sockets.length === 3);
  check('H: legacy inventory rows fold too',
    !!fSup && fSup.locked === true && (fSup.gem as { level: number }).level === 3);
}

// -------------------------------------------------- I. THE SEATED HEAL
{
  const save = serializeCharacter(w);
  // Tamper: unseat one known id from the saved bar (an M0-era save shape).
  const knownIds = save.knownSkills.map(s => s.skillId);
  const victim = knownIds[0];
  save.bar = save.bar.map(id => (id === victim ? null : id));
  const w2: World = makeSimWorld('warrior', 0x9e52);
  check('I: applySavedCharacter stands', applySavedCharacter(w2, save));
  check('I: a known-but-unbarred skill HEALS into a free seat on resume (learned = seated)',
    w2.seatHero(w2.localSeat).skills.some(s => s?.def.id === victim), victim);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
