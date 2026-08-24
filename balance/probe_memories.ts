// ---------------------------------------------------------------------------
// PROBE: THE STONE (skill-items charter M2 — docs/design/skill-items.md
// §3/§3b/§4). The ROUGH MEMORY pouch + THE RECALL, headless:
//   - THE POUCH SHAPE: ground units vacuum-merge onto ONE standing 1×1 tile
//     (first pickup mints it; no second tile can ever form).
//   - THE FOREORDAINED CUT: a unit's grant is a pure function of its sealed
//     seed — twin worlds and re-mints replay it identically.
//   - THE LEAN LADDER under THE UNLOCKED-POOL LAW: kit ∩ unlocked leans at
//     MEMORY_CFG.kitMult, an unteaching kit falls to gemBias, neither falls
//     to the wide pool — and EVERY grant resolves inside the account's
//     unlocked pool (noDrop never crossed). An unlock flows through with
//     zero data churn (THE LIVE-REGISTRY MANDATE: the same stored units
//     re-lean the moment the account grows).
//   - THE MINT LAW: every recall stamps the drop index (gemdrop:<id> + the
//     total) — the Standing Order keeps counting.
//   - THE ROOM LAW: no free cell = no recall (nothing consumed) — but the
//     LAST unit's grant may land in the cell the retiring pouch frees.
//   - FIFO within a dropper group, deterministic.
//   - THE SAVE: units ride CharacterSave.items byte-faithfully.
//   - THE STREAM LAW: dropGemAt's memory lane consumes the gem lane's
//     exact global draws — GEM_DROP_CFG.memoryShare can never shift the
//     seeded sim stream (the baseline's guarantee, pinned here).
//   - THE CONVERSION LANE: the kill trickle converts at memoryShare; the
//     sweep + single salvage spare the pouch; card 9's carried-lean waiver.
// Run: npx tsx balance/probe_memories.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { START_ZONE } from '../src/data/zones';
import { SALVAGE_SITE } from '../src/data/townBuild';
import { FEATURE, LEDGER_GEMDROP_TOTAL, gemDropKey, isSkillUnlockedForDrop, isSupportUnlockedForDrop } from '../src/meta/account';
import { DROP_CFG, GEM_DROP_CFG } from '../src/engine/loot';
import { MEMORY_CFG, makeRoughMemoryItem, memoryGroups } from '../src/engine/memories';
import { autoPlace } from '../src/engine/inventory';
import { freeCellCount, makeSupportGemItem } from '../src/engine/gemitems';
import { serializeCharacter, rebuildSavedMeta } from '../src/meta/character';
import { vec } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { ItemInstance, RoughMemoryUnit } from '../src/engine/items';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5107e);

const w: World = makeSimWorld('warrior', 0x5107e);
const seat = w.localSeat;
const m = seat.meta;
const hero = seat.actor;

const pouches = (): ItemInstance[] => m.items.filter(i => i.mem);
const plantPouch = (units: RoughMemoryUnit[]): ItemInstance => {
  const it = makeRoughMemoryItem(units.map(u => ({ ...u })));
  if (!autoPlace(m.items, it)) throw new Error('probe bag full');
  return it;
};
const removeItem = (uid: number): void => {
  const at = m.items.findIndex(i => i.uid === uid);
  if (at >= 0) m.items.splice(at, 1);
};
/** Resolve one unit's foreordained grant in a PRISTINE twin world (fresh
 *  starter account — run this only while the main world's account is still
 *  pristine too, or the pools diverge by design). */
const resolveTwin = (unit: RoughMemoryUnit): { kind: string; id: string; rarity?: string } | null => {
  const w2 = makeSimWorld('warrior', 0x77aa);
  const p = makeRoughMemoryItem([{ ...unit }]);
  if (!autoPlace(w2.localSeat.meta.items, p)) return null;
  const r = w2.recallRoughMemory(w2.localSeat, p.uid, unit.d);
  return r ? { kind: r.kind, id: r.id, rarity: r.rarity } : null;
};

// ------------------------------------------ A. THE DROP + THE POUCH MERGE
{
  const dropsBefore = w.drops.length;
  w.dropGemAt(hero.pos, undefined, false, 'crypt_lich');
  w.dropGemAt(hero.pos, undefined, false, 'crypt_lich');
  w.dropGemAt(hero.pos, undefined, false, 'zombie');
  const minted = w.drops.slice(dropsBefore);
  check('A: the memory lane mints GEAR drops carrying one unit each',
    minted.length === 3 && minted.every(d => d.item.kind === 'gear' && d.item.item.mem?.length === 1));
  // Vacuum them: the pouch merges onto ONE standing tile, gem-ring pickup.
  for (const d of minted) d.pos = vec(hero.pos.x, hero.pos.y);
  for (let i = 0; i < 5; i++) w.update(1 / 60);
  check('A: pickups merged onto ONE standing pouch tile (no second tile ever)',
    pouches().length === 1 && pouches()[0].mem!.length === 3);
  // Units append in PICKUP order (the law); a same-frame batch vacuums in
  // the drop sweep's reverse array order, so the zombie (minted last)
  // lands first here — the groups face just restates the units' truth.
  const groups = memoryGroups(pouches()[0].mem!);
  check('A: composition groups in first-appearance (pickup) order with counts',
    groups.length === 2 && groups[0].d === 'zombie' && groups[0].count === 1
    && groups[1].d === 'crypt_lich' && groups[1].count === 2);
  removeItem(pouches()[0].uid); // clean slate for the lettered rigs below
}

// ------------------------------------------------ B. THE FOREORDAINED CUT
{
  const unit: RoughMemoryUnit = { d: 'crypt_lich', s: 0x1234abc };
  const p1 = plantPouch([unit]);
  const r1 = w.recallRoughMemory(seat, p1.uid, 'crypt_lich');
  const twin = resolveTwin(unit);
  check('B: a twin world replays the identical grant from the sealed seed',
    !!r1 && !!twin && r1.kind === twin.kind && r1.id === twin.id && r1.rarity === twin.rarity,
    r1 ? `${r1.kind}:${r1.id}:${r1.rarity ?? ''}` : 'no grant');
  if (r1) removeItem(r1.itemUid);
  // Re-minting the SAME seed in the SAME world replays it too (reload-proof
  // means replay, never dedup).
  const p2 = plantPouch([unit]);
  const r2 = w.recallRoughMemory(seat, p2.uid, 'crypt_lich');
  check('B: the same seed re-minted replays the same grant (no dedup, no drift)',
    !!r1 && !!r2 && r1.kind === r2.kind && r1.id === r2.id && r1.rarity === r2.rarity);
  if (r2) removeItem(r2.itemUid);
}

// ------------------------------------------------------------- C. FIFO
{
  const u1: RoughMemoryUnit = { d: 'zombie', s: 111 };
  const u2: RoughMemoryUnit = { d: 'crypt_lich', s: 222 };
  const u3: RoughMemoryUnit = { d: 'zombie', s: 333 };
  const p = plantPouch([u1, u2, u3]);
  const expect = resolveTwin(u1);
  const r = w.recallRoughMemory(seat, p.uid, 'zombie');
  check('C: recall consumes the OLDEST unit of the group (FIFO) and grants ITS seed',
    !!r && !!expect && r.id === expect.id && r.rarity === expect.rarity
    && p.mem!.length === 2 && p.mem![0].s === 222 && p.mem![1].s === 333);
  if (r) removeItem(r.itemUid);
  const r2 = w.recallRoughMemory(seat, p.uid, 'zombie');
  check('C: the next zombie recall consumes the remaining zombie unit',
    !!r2 && p.mem!.length === 1 && p.mem![0].s === 222);
  if (r2) removeItem(r2.itemUid);
  removeItem(p.uid);
}

// --- D. THE LEAN LADDER + THE UNLOCKED-POOL LAW + THE LIVE-REGISTRY MANDATE
{
  const p = plantPouch([
    { d: 'skeleton_warrior', s: 1 }, { d: 'crypt_lich', s: 2 }, { d: 'zombie', s: 3 }]);
  const view = w.memoryRecallView(seat, p.uid)!;
  const rungOf = (d: string): string => view.groups.find(g => g.d === d)!.rung;
  check('D: skeleton_warrior (kit = cleave, a starter) leans KIT out of the box',
    rungOf('skeleton_warrior') === 'kit'
    && view.groups.find(g => g.d === 'skeleton_warrior')!.kit.some(c => c.id === 'cleave' && c.mult === MEMORY_CFG.kitMult));
  check('D: crypt_lich (kit locked, gemBias authored) falls to the BIAS rung',
    rungOf('crypt_lich') === 'bias'
    && view.groups.find(g => g.d === 'crypt_lich')!.tags.includes('minion'));
  check('D: zombie (claw-only, no bias) falls to the WIDE pool',
    rungOf('zombie') === 'wide');
  check('D: the view arms (no standing refusal on open ground with room)', view.refusal === null);
  removeItem(p.uid);

  // THE UNLOCKED-POOL LAW: 36 lich units pre-unlock — every grant inside
  // the account pool, raise_dead structurally impossible.
  const lvl = Math.max(w.zone.level, hero.level);
  const legalSkill = (id: string): boolean => {
    const s = SKILLS[id];
    return !!s && !s.noDrop && isSkillUnlockedForDrop(w.account, id) && (s.minDropLevel ?? 0) <= lvl;
  };
  const sample = (n: number, base: number): { skills: string[]; supports: string[] } => {
    const pp = plantPouch(Array.from({ length: n }, (_, i) => ({ d: 'crypt_lich', s: base + i * 7919 })));
    const skills: string[] = [];
    const supports: string[] = [];
    for (let i = 0; i < n; i++) {
      const r = w.recallRoughMemory(seat, pp.uid, 'crypt_lich');
      if (!r) break;
      (r.kind === 'skill' ? skills : supports).push(r.id);
      removeItem(r.itemUid);
    }
    removeItem(pp.uid);
    return { skills, supports };
  };
  const pre = sample(36, 40_000);
  check('D: pre-unlock, EVERY skill grant is unlocked+droppable (the pool IS the wall)',
    pre.skills.length > 0 && pre.skills.every(legalSkill));
  check('D: pre-unlock, every support grant is unlocked', pre.supports.every(id => isSupportUnlockedForDrop(w.account, id)));
  check('D: pre-unlock, the locked kit NEVER leaks (no raise_dead, no claw)',
    !pre.skills.includes('raise_dead') && !pre.skills.includes('claw'));

  // THE UNLOCK FLOWS THROUGH: one Set.add — the SAME stored units re-lean.
  w.account.unlockedSkills.add('raise_dead');
  const p2 = plantPouch([{ d: 'crypt_lich', s: 9 }]);
  const view2 = w.memoryRecallView(seat, p2.uid)!;
  check('D: after unlockedSkills.add(raise_dead), the lich row flips to the KIT rung (zero data churn)',
    view2.groups[0].rung === 'kit'
    && view2.groups[0].kit.length === 1 && view2.groups[0].kit[0].id === 'raise_dead');
  removeItem(p2.uid);
  const post = sample(36, 40_000); // the SAME seeds — the pool grew, the lean bites
  const rd = post.skills.filter(id => id === 'raise_dead').length;
  check('D: the same seeds now lean the kit hard (raise_dead granted repeatedly)',
    rd >= 3, `raise_dead ×${rd} of ${post.skills.length} skill grants`);
  check('D: post-unlock grants still never leave the pool', post.skills.every(legalSkill));
}

// ----------------------------------------------------- E. THE MINT LAW
{
  const p = plantPouch([{ d: 'zombie', s: 777 }]);
  const totalBefore = w.account.ledger[LEDGER_GEMDROP_TOTAL] ?? 0;
  const r = w.recallRoughMemory(seat, p.uid, 'zombie')!;
  check('E: the recall stamps the drop index (gemdrop:<id> + the running total)',
    (w.account.ledger[gemDropKey(r.id)] ?? 0) >= 1
    && (w.account.ledger[LEDGER_GEMDROP_TOTAL] ?? 0) === totalBefore + 1);
  removeItem(r.itemUid);
}

// ------------------------------------------------ G. THE SAVE ROUND TRIP
{
  const units: RoughMemoryUnit[] = [
    { d: 'crypt_lich', s: 424242 }, { d: 'zombie', s: 434343 }, { d: 'skeleton_warrior', s: 444444 }];
  const p = plantPouch(units);
  const save = serializeCharacter(w);
  const savedRow = save.items?.find(i => i.uid === p.uid);
  check('G: the pouch rides CharacterSave.items with its units byte-faithful',
    !!savedRow && JSON.stringify(savedRow.mem) === JSON.stringify(units));
  const rebuilt = rebuildSavedMeta(save);
  const back = rebuilt?.meta.items.find(i => i.mem);
  check('G: rebuildSavedMeta returns the pouch intact (order + seeds)',
    !!back && JSON.stringify(back.mem) === JSON.stringify(units));
  removeItem(p.uid);
}

// ----------------------------------------------------- H. THE SPOILS SEAL
{
  const p = plantPouch([{ d: 'zombie', s: 6161 }]);
  const prior = w.zone.spoils;
  (w.zone as { spoils?: 'none' }).spoils = 'none';
  const dropsBefore = w.drops.length;
  w.dropGemAt(hero.pos, undefined, false, 'zombie');
  check('H: sealed ground refuses the memory DROP mint (the gem lane\'s own seal)',
    w.drops.length === dropsBefore);
  const r = w.recallRoughMemory(seat, p.uid, 'zombie');
  check('H: sealed ground refuses the RECALL and consumes NOTHING',
    r === null && p.mem!.length === 1
    && w.texts.some(t => t.text === MEMORY_CFG.strings.sealed));
  (w.zone as { spoils?: typeof prior }).spoils = prior;
  removeItem(p.uid);
}

// ----------------------------------------------------- I. THE STREAM LAW
{
  const streamTail = (memoryFrom?: string): number => {
    seedGlobalRandom(0xbeef01);
    const ws = makeSimWorld('warrior', 0xbeef01);
    for (let i = 0; i < 12; i++) ws.dropGemAt(ws.player.pos, undefined, false, memoryFrom);
    return Math.random();
  };
  check('I: the memory lane consumes the gem lane\'s EXACT global draws (stream byte-identical)',
    streamTail(undefined) === streamTail('zombie'));
}

// ------------------------------------------------ J. THE CONVERSION LANE
{
  const origChance = DROP_CFG.killGemChance;
  const origShare = GEM_DROP_CFG.memoryShare;
  try {
    DROP_CFG.killGemChance = 1;
    const spawnAndKill = (): number => {
      const mm = w.createMonster('zombie', 1, 'enemy');
      mm.pos = vec(hero.pos.x + 400, hero.pos.y);
      w.actors.push(mm);
      const before = w.drops.length;
      w.kill(mm, false, hero);
      return before;
    };
    GEM_DROP_CFG.memoryShare = 1;
    let before = spawnAndKill();
    const memDrops = w.drops.slice(before).filter(d => d.item.kind === 'gear' && d.item.item.mem);
    check('J: memoryShare 1 converts the kill trickle into a Rough Memory of the DROPPER',
      memDrops.length === 1 && memDrops[0].item.kind === 'gear' && memDrops[0].item.item.mem![0].d === 'zombie');
    GEM_DROP_CFG.memoryShare = 0;
    before = spawnAndKill();
    const tail = w.drops.slice(before);
    check('J: memoryShare 0 keeps the trickle a DIRECT bare gem (lane 3 lives)',
      tail.some(d => d.item.kind === 'skill' || d.item.kind === 'support')
      && !tail.some(d => d.item.kind === 'gear' && d.item.item.mem));
  } finally {
    DROP_CFG.killGemChance = origChance;
    GEM_DROP_CFG.memoryShare = origShare;
    w.drops.length = 0;
  }
}

// --------------------------- K. CARD 9 — THE CARRIED LEAN WAIVED AT THE CUT
{
  const origCarried = GEM_DROP_CFG.carriedMult;
  try {
    GEM_DROP_CFG.carriedMult = 0;
    // The warrior's bar carries cleave/shield_up/war_cry — at carriedMult 0
    // the DIRECT roller can never surface them…
    const carried = ['cleave', 'shield_up', 'war_cry'];
    let directHit = false;
    for (let i = 0; i < 40; i++) if (carried.includes(w.rollSkillGem().def.id)) directHit = true;
    check('K: carriedMult 0 blanks carried gems on the DIRECT lane (the control)', !directHit);
    // …while THE CUT waives the carried lean entirely (duplicates are merge
    // currency now) — fixed seeds land carried gems at full weight.
    const p = plantPouch(Array.from({ length: 40 }, (_, i) => ({ d: 'zombie', s: 90_000 + i * 104_729 })));
    let cutHit = 0;
    for (let i = 0; i < 40; i++) {
      const r = w.recallRoughMemory(seat, p.uid, 'zombie');
      if (!r) break;
      if (r.kind === 'skill' && carried.includes(r.id)) cutHit++;
      removeItem(r.itemUid);
    }
    removeItem(p.uid);
    check('K: the recall WAIVES the carried lean (carried gems still granted)', cutHit >= 1, `×${cutHit}`);
  } finally {
    GEM_DROP_CFG.carriedMult = origCarried;
  }
}

// ----------------------------------------------------- L. THE ROOM LAW
{
  const p = plantPouch([{ d: 'zombie', s: 3001 }, { d: 'zombie', s: 3002 }]);
  // Pack the bag solid with junk supports (1×1s take any hole).
  const junkUids: number[] = [];
  for (;;) {
    const j = makeSupportGemItem({ def: SUPPORTS.arcing, level: 1 });
    if (!autoPlace(m.items, j)) break;
    junkUids.push(j.uid);
  }
  check('L: the bag stands solid (zero free cells)', freeCellCount(m.items) === 0);
  const r = w.recallRoughMemory(seat, p.uid, 'zombie');
  check('L: no free cell → the recall REFUSES and consumes NOTHING',
    r === null && p.mem!.length === 2
    && w.texts.some(t => t.text === MEMORY_CFG.strings.noRoom));
  // THE LAST unit's grant may land in the cell the retiring pouch frees:
  p.mem = [p.mem![0]];
  const r2 = w.recallRoughMemory(seat, p.uid, 'zombie');
  check('L: the LAST unit recalls into the pouch\'s own freed cell (bag solid again after)',
    !!r2 && !m.items.some(i => i.uid === p.uid)
    && m.items.some(i => i.uid === r2!.itemUid) && freeCellCount(m.items) === 0);
  if (r2) removeItem(r2.itemUid);
  for (const uid of junkUids) removeItem(uid);
}

// ------------------------------------------------ M. THE SWEEP IMMUNITY
{
  // Stand at the real bench (the M1 probe's own dance) so the gear sweep
  // genuinely RUNS — and still spares the pouch; the single-item lane
  // refuses it outright.
  w.account.features.add(FEATURE.SALVAGE_STATION);
  w.loadZone(START_ZONE);
  w.player.pos.x = SALVAGE_SITE.x;
  w.player.pos.y = SALVAGE_SITE.y;
  check('M: the bench answers', w.nearSalvage());
  const p = plantPouch([{ d: 'crypt_lich', s: 8888 }]);
  w.salvageBulk(seat, 'item', undefined, 'break');
  check('M: the GEAR sweep runs but spares the pouch', m.items.some(i => i.uid === p.uid));
  w.salvageItem(seat, p.uid, 'break');
  check('M: the single salvage refuses the pouch (units are potential, not steel)',
    m.items.some(i => i.uid === p.uid) && p.mem!.length === 1
    && w.texts.some(t => t.text === MEMORY_CFG.strings.noSalvage));
  removeItem(p.uid);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
