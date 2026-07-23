// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WORN GRAFT end to end (engine/skills.ts slotGraftStat +
// World.recalcSeat injection + data/itemaffixes.ts SLOTGRAFT catalog +
// data/uniques.ts The Rote Hand). Pins:
//   - THE CATALOG: one suffix per (wild gem × bar seat), GENERATED — count,
//     registered stats, parse roundtrip, the CLASS_SKILL integer ladder
//     (T1 = Level 1; EXQUISITE = Level 2, blue-only), and the BUDGET LAW:
//     total pick mass ≈ familyWeight however many gems register, each row
//     weighted by its gem's own drop share (the shelf's odds, no parallel
//     valuation).
//   - THE INJECTION: a worn slotgraft stat mints the gem onto WHATEVER skill
//     is bound to that bar seat — through the real socket-time gate
//     (supportFitsInstOrCrew), visible to every reader via hostSockets and
//     instanceMods, and AIMED BY THE HAND: re-binding the bar moves it,
//     an unfitting occupant leaves it honestly dormant ('unfit'), an empty
//     seat waits ('empty').
//   - THE YIELD LAW: a real socketed copy of the same gem sends the worn
//     copy dormant ('duplicate' — the forward lane's no-second-copy law);
//     unsocketing wakes it again.
//   - THE LEVEL FOLD: multiple grantors SUM through the one stat engine;
//     clamped at MAX_SUPPORT_LEVEL; sub-1 grants nothing.
//   - THE ROTE HAND: unique fixed lines ride the same family (Multistrike →
//     Skill Slot 1, Splitting → Skill Slot 3) — on the warrior's default
//     bar one line runs and one sits dormant: the item that teaches the
//     fabric by being worn.
//   - DERIVED, NEVER SAVED: character saves carry no graft entries; a
//     reload re-derives the identical ledger from gear + bar; unlearning
//     strips grafts from the departing instance.
// Run: npx tsx balance/probe_slotgraft.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  BAR_SLOTS, MAX_SUPPORT_LEVEL, hostSockets, instanceMods, parseSlotGraftStat,
  slotGraftStat,
} from '../src/engine/skills';
import { STAT_DEFS, mod } from '../src/engine/stats';
import { ITEM_AFFIX_LIST } from '../src/data/itemaffixes';
import { SLOTGRAFT_CFG } from '../src/data/itemaffixes';
import { SUPPORT_LIST, SUPPORTS } from '../src/data/supports';
import { compileItemMods, describeItem, rollItem } from '../src/engine/itemgen';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5107);

const WILD = SUPPORT_LIST.filter(d => d.weight > 0);
const ROWS = ITEM_AFFIX_LIST.filter(a => a.id.startsWith('slotgraft_'));

// ------------------------------------------------------ A. THE CATALOG
check('A: one row per (wild gem × bar seat)', ROWS.length === WILD.length * BAR_SLOTS,
  `${ROWS.length} rows, ${WILD.length} wild gems × ${BAR_SLOTS} seats`);
check('A: every row stat registered + parses back to its own seat',
  ROWS.every(a => {
    const stat = a.lines[0].stat;
    const p = parseSlotGraftStat(stat);
    return !!STAT_DEFS[stat] && !!p && !!SUPPORTS[p.gemId]
      && a.id === `slotgraft_${p.slot + 1}_${p.gemId}`;
  }));
check('A: the CLASS_SKILL integer ladder (EX blue-only L2 above T1 L1)',
  ROWS.every(a =>
    a.tiers[0].magicOnly === true && a.tiers[0].ranges[0][0] === 2 && a.tiers[0].ranges[0][1] === 2
    && a.tiers[1].magicOnly === undefined && a.tiers[1].ranges[0][0] === 1 && a.tiers[1].ranges[0][1] === 1));
const mass = ROWS.reduce((s, a) => s + a.weight, 0);
check('A: THE BUDGET LAW — total mass ≈ familyWeight, every row > 0',
  Math.abs(mass - SLOTGRAFT_CFG.familyWeight) < 1e-6 && ROWS.every(a => a.weight > 0),
  `mass ${mass.toFixed(4)} vs budget ${SLOTGRAFT_CFG.familyWeight}`);
check('A: a weight-0 gem never enters the rolled catalog',
  ROWS.every(a => (SUPPORTS[parseSlotGraftStat(a.lines[0].stat)!.gemId].weight ?? 0) > 0));

// ------------------------------------------------- B. ROLL + DESCRIBE
const glove = rollItem({
  ilvl: 20, rarity: 'magic', baseId: 'gloves_evasion',
  withFamily: 'slotgraft_1_multistrike',
});
const gloveMods = glove ? compileItemMods(glove) : [];
check('B: withFamily mints the graft line on an eligible base',
  !!glove && gloveMods.some(m2 => m2.stat === slotGraftStat(1, 'multistrike') && m2.value >= 1),
  gloveMods.filter(m2 => m2.stat.startsWith('slotgraft_')).map(m2 => `${m2.stat}=${m2.value}`).join(','));
check('B: the describer speaks the family label',
  !!glove && JSON.stringify(describeItem(glove!)).includes('Multistrike Graft (Skill Slot 1)'));

// ---------------------------------------------- C. THE LIVE INJECTION
const w: World = makeSimWorld('warrior', 0x51a7);
const seat = w.localSeat;
const hero = seat.actor;
const cleave = seat.meta.knownSkills.get('cleave')!;
check('C: a bare seat derives nothing (census hygiene)',
  cleave.grafts === undefined && seat.wornGrafts === undefined);
const bareModCount = instanceMods(cleave).length;
seat.meta.equipped['gloves'] = glove!;
w.recalcSeat(seat);
const liveRow = () => (seat.wornGrafts ?? []).find(r => r.def.id === 'multistrike');
// The tier the roll landed (T1 = L1, EXQUISITE = L2) is the glove's truth —
// the graft must wear exactly the rolled line's value.
const gloveLvl = Math.floor(gloveMods.find(m2 => m2.stat === slotGraftStat(1, 'multistrike'))!.value);
check('C: worn gloves graft Multistrike onto the skill seated at Slot 1, at the rolled level',
  cleave.grafts?.some(g => g.def.id === 'multistrike' && g.level === gloveLvl) === true
  && liveRow()?.state === 'live' && liveRow()?.skillId === 'cleave',
  `rolled L${gloveLvl}`);
check('C: hostSockets admits the worn graft (every reader sees it)',
  hostSockets(cleave).some(s => s.def.id === 'multistrike'));
check('C: instanceMods folds the granted gem',
  instanceMods(cleave).length > bareModCount,
  `${bareModCount} bare → ${instanceMods(cleave).length} worn`);

// ------------------------------------------------ D. AIMED BY THE HAND
w.bindSkill(1, 'cleave', seat);
check('D: re-binding the bar moves the grant off the seat',
  cleave.grafts === undefined && liveRow()?.state === 'empty');
w.bindSkill(0, 'cleave', seat);
check('D: and back onto it', cleave.grafts?.some(g => g.def.id === 'multistrike') === true);
w.bindSkill(0, 'war_cry', seat); // displaces cleave off the bar entirely
const warCry = seat.meta.knownSkills.get('war_cry')!;
check('D: an unfitting occupant leaves the graft honestly dormant',
  warCry.grafts === undefined && liveRow()?.state === 'unfit' && liveRow()?.skillId === 'war_cry');
w.bindSkill(0, 'cleave', seat);
w.bindSkill(2, 'war_cry', seat); // restore the default hand
check('D: restored hand rides again', liveRow()?.state === 'live');

// -------------------------------------------------- E. THE YIELD LAW
seat.meta.inventory.push({ def: SUPPORTS['multistrike'], level: 1 });
check('E: a real stone sockets', w.socketSupport(seat.meta.inventory.length - 1, 'cleave', seat));
check('E: the worn copy yields to it (no double-fold)',
  liveRow()?.state === 'duplicate'
  && cleave.grafts?.some(g => g.def.id === 'multistrike') !== true
  && cleave.sockets.some(s => s?.def.id === 'multistrike'));
const msIdx = cleave.sockets.findIndex(s => s?.def.id === 'multistrike');
check('E: unsocketing wakes the worn copy again',
  w.unsocketSupport('cleave', msIdx, seat)
  && liveRow()?.state === 'live'
  && cleave.grafts?.some(g => g.def.id === 'multistrike') === true);
seat.meta.inventory.pop(); // drop the loose stone; the worn graft stays

// ------------------------------------------------- F. THE LEVEL FOLD
const ring = rollItem({
  ilvl: 20, rarity: 'magic', baseId: 'ring_coral',
  withFamily: 'slotgraft_1_multistrike',
});
const ringLvl = Math.floor(compileItemMods(ring!).find(m2 => m2.stat === slotGraftStat(1, 'multistrike'))!.value);
seat.meta.equipped['ring1'] = ring!;
w.recalcSeat(seat);
const summed = Math.min(MAX_SUPPORT_LEVEL, gloveLvl + ringLvl);
check('F: two grantors SUM through the one stat engine',
  cleave.grafts?.some(g => g.def.id === 'multistrike' && g.level === summed) === true,
  `glove L${gloveLvl} + ring L${ringLvl} → L${summed}`);
hero.sheet.setSource('probe', [mod(slotGraftStat(1, 'multistrike'), 'flat', 99)]);
w.recalcSeat(seat);
check('F: the fold clamps at MAX_SUPPORT_LEVEL',
  cleave.grafts?.some(g => g.def.id === 'multistrike' && g.level === MAX_SUPPORT_LEVEL) === true);
hero.sheet.removeSource('probe');
delete seat.meta.equipped['ring1'];
w.recalcSeat(seat);

// --------------------------------------------------- G. THE ROTE HAND
const rote = rollItem({ ilvl: 20, uniqueId: 'rote_hand' });
const roteMods = rote ? compileItemMods(rote) : [];
check('G: the legend carries both fixed graft lines at whole levels',
  roteMods.some(m2 => m2.stat === slotGraftStat(1, 'multistrike') && m2.value === 1)
  && roteMods.some(m2 => m2.stat === slotGraftStat(3, 'splitting') && m2.value === 1));
check('G: the unique speaks its own line',
  !!rote && JSON.stringify(describeItem(rote!)).includes('The skill in Skill Slot 1 is granted Level 1 Multistrike'));
seat.meta.equipped['gloves'] = rote!;
w.recalcSeat(seat);
const rows = seat.wornGrafts ?? [];
check('G: worn, it teaches — Multistrike rides the primary, Splitting sits dormant',
  rows.some(r => r.def.id === 'multistrike' && r.state === 'live' && r.skillId === 'cleave')
  && rows.some(r => r.def.id === 'splitting' && r.state === 'unfit' && r.skillId === 'war_cry'),
  rows.map(r => `${r.def.id}@${r.slot}:${r.state}`).join(' '));

// --------------------------------------- H. DERIVED, NEVER SAVED
const save = serializeCharacter(w);
check('H: the save carries NO graft entries (sockets stay the player\'s stones)',
  !JSON.stringify(save.knownSkills).includes('multistrike')
  && !JSON.stringify(save.knownSkills).includes('splitting'));
const w2: World = makeSimWorld('warrior', 0x51a8);
check('H: the save adopts', applySavedCharacter(w2, save));
const rows2 = w2.localSeat.wornGrafts ?? [];
check('H: a reload re-derives the identical ledger from gear + bar',
  rows2.length === rows.length
  && rows.every(r => rows2.some(r2 =>
    r2.slot === r.slot && r2.def.id === r.def.id && r2.level === r.level && r2.state === r.state)));
check('H: the reloaded skill wears the graft live',
  w2.localSeat.meta.knownSkills.get('cleave')?.grafts?.some(g => g.def.id === 'multistrike') === true);

// ------------------------------------------------ I. THE UNLEARN STRIP
const w2cleave = w2.localSeat.meta.knownSkills.get('cleave')!;
check('I: unlearning strips derived grafts from the departing instance',
  w2.unlearnSkill('cleave', w2.localSeat)
  && w2cleave.grafts === undefined
  && w2.localSeat.meta.skillInv.includes(w2cleave));

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
