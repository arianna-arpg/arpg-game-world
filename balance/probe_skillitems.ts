// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RESIDENCE (skill-items charter M1, engine/gemitems.ts +
// the world.ts flows). Loose gems are 1×1 bag wrapper items; this rig pins:
//   - THE WRAPPER: pack ↔ unpack is lossless for everything a save keeps
//     (level, rarity, sockets + their levels/locks, granted, treeNodes);
//     THE ONE LOCK (the wrapper's mark transfers to the instance at learn).
//   - LEARNED = SEATED: learnSkill(uid) consumes the bag item and takes a
//     rack seat in the one gesture; the gates carry verbatim (attribute
//     requirements, the structural cap of eight — a knownCopy SWAPS, never
//     refuses); unlearn mints the wrapper back and REFUSES BEFORE MUTATING
//     on a full bag.
//   - THE REPLACE: learning onto an occupied seat unlearns the sitter into
//     the just-freed cell first — nothing is ever lost to the swap.
//   - THE ONE-COPY SWAP (2026-09-16, rig J): a copy of a KNOWN skill is
//     never refused — the knownCopy leaves for the bag and the newcomer
//     takes the seat it is placed into (slotless = the copy's own seat);
//     a different sitter under the drop departs too; every departing body
//     is PRE-FLIGHTED (unlearnRefusal + room for every wrapper) so a
//     refused swap moves nothing; the cap never refuses a swap.
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
  // THE ONE-COPY SWAP (2026-09-16): a copy of a KNOWN skill is never
  // refused — slotless, the newcomer lands in the seat the knownCopy holds
  // and the known copy leaves for the bag as its wrapper, cargo intact.
  const fbSeat = hero.skills.findIndex(s => s?.def.id === 'fireball');
  const dupe = w.grantSkillGemItem(seat, makeSkillGem(SKILLS.fireball, 1, 'common'))!;
  const fbWrappers = () => m.items.filter(i => i.gem?.kind === 'skill' && i.gem.skillId === 'fireball');
  check('B: a known skill\'s copy SWAPS in place — the newcomer takes the known seat, one copy on the bar',
    w.learnSkill(dupe.uid, seat)
    && hero.skills[fbSeat]?.def.id === 'fireball'
    && m.knownSkills.get('fireball')?.level === 1 && m.knownSkills.get('fireball')?.rarity === 'common'
    && hero.skills.filter(s => s?.def.id === 'fireball').length === 1
    && !m.items.some(i => i.uid === dupe.uid));
  check('B: the known copy left for the bag as its wrapper, cargo intact (level 2, magic)',
    fbWrappers().length === 1
    && skillGemPayloadOf(fbWrappers()[0])?.level === 2 && skillGemPayloadOf(fbWrappers()[0])?.rarity === 'magic');
  check('B: swapping the upgrade back lands it in the same seat (one copy, ever)',
    w.learnSkill(fbWrappers()[0].uid, seat)
    && hero.skills[fbSeat]?.level === 2 && m.knownSkills.get('fireball')?.rarity === 'magic'
    && fbWrappers().length === 1 && skillGemPayloadOf(fbWrappers()[0])?.rarity === 'common');
  w.dropGearFromBag(seat, fbWrappers()[0].uid); // shed the common copy (unwraps to the ground)
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
  w.player.pos.x = w.townSeat('salvage').x;
  w.player.pos.y = w.townSeat('salvage').y;
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

// ------------------------------------------ J. THE ONE-COPY SWAP (2026-09-16)
// Her ask: an upgrade of a SEATED skill lands in ONE gesture. A copy of a
// known skill is never refused — it SWAPS: the newcomer takes the seat it is
// placed into, the knownCopy leaves for the bag as its wrapper (cargo
// intact); a different sitter under the drop is replaced as ever (both
// depart — two cells); every gate is PRE-FLIGHTED (unlearnRefusal + room)
// so a refusal moves nothing. Duplicates stay impossible: one copy on the
// bar, ever.
{
  const w3: World = makeSimWorld('warrior', 0x9e53);
  const s3 = w3.localSeat;
  const m3 = s3.meta;
  const h3 = s3.actor;
  for (const k of Object.keys(m3.baseAttrs)) (m3.baseAttrs as Record<string, number>)[k] = 999;
  w3.recalcSeat(s3);
  const cleaves = () => h3.skills.filter(s => s?.def.id === 'cleave').length;
  const bagCleaves = () => m3.items.filter(i => i.gem?.kind === 'skill' && i.gem.skillId === 'cleave');
  const cleaveSeat = h3.skills.findIndex(s => s?.def.id === 'cleave');
  const starter = m3.knownSkills.get('cleave')!;
  check('J: the warrior wakes with Cleave seated', cleaveSeat >= 0 && !!starter);
  const starterCut = { level: starter.level, rarity: starter.rarity };
  // J1: onto its OWN seat — the in-place upgrade.
  const rare = w3.grantSkillGemItem(s3, makeSkillGem(SKILLS.cleave, 4, 'rare'))!;
  check('J1: the rare copy dropped onto the seated Cleave SWAPS in place (no refusal, one copy on the bar)',
    w3.learnSkill(rare.uid, s3, cleaveSeat)
    && h3.skills[cleaveSeat]?.def.id === 'cleave' && h3.skills[cleaveSeat]?.rarity === 'rare'
    && m3.knownSkills.get('cleave')?.level === 4 && cleaves() === 1
    && !m3.items.some(i => i.uid === rare.uid));
  check('J1: the known copy left for the bag as its wrapper, cargo intact (the starter cut)',
    bagCleaves().length === 1
    && skillGemPayloadOf(bagCleaves()[0])?.level === starterCut.level
    && skillGemPayloadOf(bagCleaves()[0])?.rarity === starterCut.rarity);
  // J2: slotless — the upgrade lands where the skill LIVES, not the first free seat.
  const firstFree = h3.skills.findIndex(s => s === null);
  check('J2: an empty seat stands beside it', firstFree >= 0 && firstFree !== cleaveSeat);
  check('J2: slotless, a known copy lands in the seat the skill holds (never the first free seat)',
    w3.learnSkill(bagCleaves()[0].uid, s3)
    && h3.skills[cleaveSeat]?.def.id === 'cleave' && h3.skills[cleaveSeat]?.rarity === starterCut.rarity
    && h3.skills[firstFree] === null && cleaves() === 1
    && bagCleaves().length === 1 && skillGemPayloadOf(bagCleaves()[0])?.rarity === 'rare');
  // J3: onto a DIFFERENT, EMPTY seat — the skill moves there with its copy.
  check('J3: dropped onto an empty seat, the skill MOVES there — the old seat empties, still one copy',
    w3.learnSkill(bagCleaves()[0].uid, s3, firstFree)
    && h3.skills[firstFree]?.def.id === 'cleave' && h3.skills[firstFree]?.rarity === 'rare'
    && h3.skills[cleaveSeat] === null && cleaves() === 1 && bagCleaves().length === 1);
  // J4: onto a seat holding ANOTHER skill — that sitter is replaced AND the
  // known copy retires (the replace + the one-copy law composed; two cells).
  const otherDef = SKILL_LIST.find(s => !m3.knownSkills.has(s.id))!;
  const otherItem = w3.grantSkillGemItem(s3, makeSkillGem(otherDef, 1, 'common'))!;
  check('J4: a second skill seats in the vacated seat',
    w3.learnSkill(otherItem.uid, s3, cleaveSeat) && h3.skills[cleaveSeat]?.def.id === otherDef.id, otherDef.id);
  const knownBefore = m3.knownSkills.size;
  check('J4: dropped onto another skill\'s seat, BOTH depart — sitter replaced, known copy retired, one copy on the bar',
    w3.learnSkill(bagCleaves()[0].uid, s3, cleaveSeat)
    && h3.skills[cleaveSeat]?.def.id === 'cleave' && h3.skills[cleaveSeat]?.rarity === starterCut.rarity
    && h3.skills[firstFree] === null
    && !m3.knownSkills.has(otherDef.id)
    && m3.items.some(i => i.gem?.kind === 'skill' && i.gem.skillId === otherDef.id)
    && bagCleaves().length === 1 && skillGemPayloadOf(bagCleaves()[0])?.rarity === 'rare'
    && cleaves() === 1 && m3.knownSkills.size === knownBefore - 1);
  // J5: ATOMICITY — a two-body swap with room for only ONE wrapper refuses WHOLE.
  const otherBack = m3.items.find(i => i.gem?.kind === 'skill' && i.gem.skillId === otherDef.id)!;
  check('J5: the other skill re-seats beside Cleave',
    w3.learnSkill(otherBack.uid, s3, firstFree) && h3.skills[firstFree]?.def.id === otherDef.id);
  const rareTile = bagCleaves()[0];
  while (freeCellCount(m3.items) > 0) w3.grantSupportGemItem(s3, { def: SUPPORTS.multistrike, level: 1 });
  const cell = { x: rareTile.x, y: rareTile.y };
  const barFace = () => h3.skills.map(s => (s ? s.def.id + ':' + s.rarity : '-')).join(',');
  const barBefore = barFace();
  check('J5: with room for ONE wrapper, a TWO-body swap refuses whole — tile in its cell, every seat standing',
    !w3.learnSkill(rareTile.uid, s3, firstFree)
    && barFace() === barBefore
    && m3.knownSkills.has(otherDef.id) && m3.knownSkills.get('cleave')?.rarity === starterCut.rarity
    && m3.items.some(i => i.uid === rareTile.uid && i.x === cell.x && i.y === cell.y));
  check('J5: the same tile onto the copy\'s OWN seat (one body) lands with that one cell',
    w3.learnSkill(rareTile.uid, s3, cleaveSeat)
    && h3.skills[cleaveSeat]?.rarity === 'rare' && cleaves() === 1
    && bagCleaves().length === 1 && skillGemPayloadOf(bagCleaves()[0])?.rarity === starterCut.rarity);
  m3.items = m3.items.filter(i => i.gem?.kind !== 'support'); // clear the packing
  // J6: THE CAP never refuses a swap — a full rack still upgrades in place.
  const fillers = SKILL_LIST.filter(s => !m3.knownSkills.has(s.id)).slice(0, 12);
  let fi = 0;
  while (h3.skills.some(s => s === null) && fi < fillers.length) {
    const it = w3.grantSkillGemItem(s3, makeSkillGem(fillers[fi++], 1, 'common'))!;
    w3.learnSkill(it.uid, s3);
  }
  check('J6: the rack stands full', h3.skills.every(s => s !== null) && m3.knownSkills.size === h3.skills.length);
  const magic = w3.grantSkillGemItem(s3, makeSkillGem(SKILLS.cleave, 2, 'magic'))!;
  check('J6: a full rack still swaps a known copy in place, slotless — eight seats, eight skills, one Cleave',
    w3.learnSkill(magic.uid, s3)
    && h3.skills[cleaveSeat]?.def.id === 'cleave' && h3.skills[cleaveSeat]?.rarity === 'magic'
    && h3.skills.every(s => s !== null) && m3.knownSkills.size === h3.skills.length && cleaves() === 1);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
