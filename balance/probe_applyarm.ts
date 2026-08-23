// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE ARMED LIST (StatSheet.armedFamily, engine/stats.ts): the
// generated apply_<status> / minionApply_<status> families swept by what the
// layers NAME instead of by the whole ~130-id registry. The registry outgrew
// its loops (~30 ids when they were written): every landed hit resolved all of
// them, and a gemmed skill's instance mods pass as `extra`, which defeats the
// value memo (compute's `cacheable`) — so each of those ~130 lookups walked
// every modifier of every source in full.
//
// The whole point is that nothing else moves. Pins:
//   A. THE UNION — sheet layers (flat / increased / link / base override) ∪ the
//      ids the caller's `extra` names, EQUAL to the brute-force scan of every
//      status id with sheet.get(...) > 0; the ORDER LAW (STATUS_IDS order, so
//      the sweep's `chance()` rolls walk the identical RNG stream); an
//      uninvested sheet on a gemless skill visiting ZERO ids; prefix isolation
//      between the two families.
//   B. THE SUPERSET LAW — the derivation reads NAMES, never live values, so a
//      condition-gated / tag-filtered / gauge-zeroed / negative grant stays
//      armed. Adversarial: an id armed under a context where it resolves to
//      zero must still be armed when a DIFFERENT tag context wakes it (tags
//      never invalidate anything — a value-keyed list would drop the hit).
//      The universal invariant asserted throughout: no id with get(...) > 0 is
//      ever missing from the armed list.
//   C. INVALIDATION — the list re-derives after every one of the five
//      cache-clearing mutations (setSource, source swap, removeSource, setBase,
//      setConditions, setGauges), and is genuinely MEMOIZED between them (same
//      array identity out; a fresh one after each mutation).
//   D. THE NAMELESS ARMING ROADS — the two ways a stat stands non-zero with no
//      modifier naming it (a positive min clamp; a STAT_TRADES row whose gain
//      side targets the family) arm structurally, not by list.
//   E. THE LIVE LANE — the real player, a REAL socketed gem's instanceMods,
//      the live sheet: armed == brute force; a real swing still lands the
//      gem's ailment; an unarmed status never lands; and the minion bake's
//      minionApply_ carry still reaches the minion's own apply_ sheet.
// Run: npx tsx balance/probe_applyarm.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  gaugeMod, linkMod, mod, StatSheet, STAT_DEFS, STAT_TRADES,
  type Modifier, type SkillTag,
} from '../src/engine/stats';
import { STATUS_DEFS } from '../src/engine/status';
import { instanceMods, skillContextTags } from '../src/engine/skills';
import { SUPPORTS } from '../src/data/supports';
import { MONSTERS } from '../src/data/monsters';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const same = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((v, i) => v === b[i]);

bootSimEngine();
seedGlobalRandom(0xa2c3);

// THE canonical family order — derived exactly as world.ts derives STATUS_IDS.
const STATUS_IDS = Object.keys(STATUS_DEFS);

/** The brute-force sweep this replaces: every id, fully resolved. */
const brute = (
  sheet: StatSheet, prefix: string,
  tags?: ReadonlySet<SkillTag>, extra?: Modifier[],
): string[] => STATUS_IDS.filter(id => sheet.get(prefix + id, tags, extra) > 0);

/** THE UNIVERSAL INVARIANT: whatever else is true, the armed list may never
 *  MISS an id that resolves positive — a missed arm silently drops an ailment. */
const covers = (
  sheet: StatSheet, prefix: string,
  tags?: ReadonlySet<SkillTag>, extra?: Modifier[],
): boolean => {
  const armed = new Set(sheet.armedFamily(prefix, STATUS_IDS, extra));
  return brute(sheet, prefix, tags, extra).every(id => armed.has(id));
};

check('census: the family outgrew the loop it was written for',
  STATUS_IDS.length > 100 && STATUS_IDS.every(id => !!STAT_DEFS['apply_' + id]
    && !!STAT_DEFS['minionApply_' + id]),
  `${STATUS_IDS.length} status ids × 2 generated families`);

// ------------------------------------------------------- A. THE UNION
{
  // A spread of grants across several layers, each on its own status id.
  const pick = (n: number): string => STATUS_IDS[n % STATUS_IDS.length];
  const [sFlat, sInc, sLink, sBase, sExtra, sMinion, sDup] =
    [3, 17, 41, 68, 96, 12, 55].map(pick);

  const sheet = new StatSheet();
  sheet.setSource('class', [mod('apply_' + sFlat, 'flat', 0.25)]);
  sheet.setSource('gear', [
    mod('apply_' + sInc, 'flat', 0.1), mod('apply_' + sInc, 'increased', 0.5),
    mod('apply_' + sDup, 'flat', 0.2),
  ]);
  // A LINK arms its TARGET (the mod names apply_<id>, the siphon names the source).
  sheet.setSource('passive', [
    mod('evasion', 'flat', 200), linkMod('apply_' + sLink, 'evasion', 0.002),
  ]);
  sheet.setBase('apply_' + sBase, 0.15);
  // The other family, on its own layer — it must never bleed across.
  sheet.setSource('vocation', [mod('minionApply_' + sMinion, 'flat', 0.3)]);

  // The caller's skill-local mods: one status the SHEET never mentions, one it
  // already carries, one plain non-family mod, one from the sibling family.
  const extra: Modifier[] = [
    mod('apply_' + sExtra, 'flat', 0.4),
    mod('apply_' + sDup, 'increased', 0.5),
    mod('damage', 'increased', 0.2),
    mod('minionApply_' + sMinion, 'flat', 0.1),
  ];

  const armed = sheet.armedFamily('apply_', STATUS_IDS, extra);
  const ref = brute(sheet, 'apply_', undefined, extra);
  check('A1: the armed union EQUALS the brute-force scan of every status id',
    same(armed, ref),
    `armed [${armed.join(',')}] vs brute [${ref.join(',')}]`);
  check('A1: and it is the whole spread — every layer + the extra-only id',
    armed.length === 6 && [sFlat, sInc, sLink, sBase, sExtra, sDup]
      .every(id => armed.includes(id)),
    `${armed.length} armed`);

  // THE ORDER LAW — strictly ascending in STATUS_IDS, which is what keeps the
  // sweep's per-id chance() rolls on the identical RNG stream.
  const idx = armed.map(id => STATUS_IDS.indexOf(id));
  check('A2: THE ORDER LAW — the union walks STATUS_IDS order',
    idx.every((v, i) => i === 0 || v > idx[i - 1]), `[${idx.join(',')}]`);

  // The sheet's OWN half stands without the caller's mods.
  const bare = sheet.armedFamily('apply_', STATUS_IDS);
  check('A3: a gemless cast sees only what the sheet itself carries',
    same(bare, brute(sheet, 'apply_')) && !bare.includes(sExtra),
    `[${bare.join(',')}]`);

  // PREFIX ISOLATION — the two families never read each other's grants.
  const mArmed = sheet.armedFamily('minionApply_', STATUS_IDS, extra);
  check('A4: prefix isolation — minionApply_ carries its own grant and nothing else',
    same(mArmed, [sMinion]) && same(mArmed, brute(sheet, 'minionApply_', undefined, extra))
    && !armed.includes(sMinion),
    `[${mArmed.join(',')}]`);

  // THE ZERO CASE — the whole point of the chip.
  const clean = new StatSheet();
  check('A5: an uninvested sheet on a gemless skill visits ZERO ids',
    clean.armedFamily('apply_', STATUS_IDS).length === 0
    && clean.armedFamily('minionApply_', STATUS_IDS).length === 0
    && brute(clean, 'apply_').length === 0);
  check('A5: and stays empty under mods that name neither family',
    clean.armedFamily('apply_', STATUS_IDS, [mod('damage', 'more', 1)]).length === 0);
}

// ------------------------------------------------ B. THE SUPERSET LAW
{
  const pick = (n: number): string => STATUS_IDS[n % STATUS_IDS.length];
  const [sWhen, sTag, sGauge, sNeg, sLive] = [7, 23, 50, 84, 101].map(pick);
  const sheet = new StatSheet();
  sheet.setSource('gear', [
    mod('apply_' + sWhen, 'flat', 0.3, undefined, 'lowLife'),
    mod('apply_' + sTag, 'flat', 0.3, ['fire']),
    gaugeMod('apply_' + sGauge, 'flat', 0.3, 'status:poison'),
    mod('apply_' + sNeg, 'flat', -0.3),
    mod('apply_' + sLive, 'flat', 0.3),
  ]);

  const armed = sheet.armedFamily('apply_', STATUS_IDS);
  check('B1: names, not values — an inert grant stays armed (the superset law)',
    [sWhen, sTag, sGauge, sNeg, sLive].every(id => armed.includes(id))
    && armed.length === 5,
    `[${armed.join(',')}]`);
  check('B1: and the sweep still skips them: only the live one resolves positive',
    same(brute(sheet, 'apply_'), [sLive].filter(id => STATUS_IDS.includes(id))),
    `brute [${brute(sheet, 'apply_').join(',')}]`);
  check('B1: the invariant holds — nothing positive is missing', covers(sheet, 'apply_'));

  // THE TAG TRAP: the armed list is derived ONCE and is context-FREE, so a
  // different tag context on the same generation must still find the id armed.
  // (A list keyed on resolved values would have to invalidate per context —
  // and tags clear nothing.)
  const fire = new Set<SkillTag>(['fire']);
  const armedAfterCold = sheet.armedFamily('apply_', STATUS_IDS); // derived above, no tags
  check('B2: a tag-filtered grant is armed for EVERY context, not the one it derived under',
    armedAfterCold.includes(sTag)
    && sheet.get('apply_' + sTag, fire) > 0
    && covers(sheet, 'apply_', fire),
    `fire-context value ${sheet.get('apply_' + sTag, fire).toFixed(2)}`);

  // The condition and gauge roads wake through their own invalidating seams.
  sheet.setConditions(['lowLife']);
  check('B3: a condition flip wakes the gated grant — still armed, now firing',
    sheet.armedFamily('apply_', STATUS_IDS).includes(sWhen)
    && sheet.get('apply_' + sWhen) > 0 && covers(sheet, 'apply_'));
  sheet.setGauges([['status:poison', 2]]);
  check('B3: a gauge flip likewise', sheet.armedFamily('apply_', STATUS_IDS).includes(sGauge)
    && sheet.get('apply_' + sGauge) > 0 && covers(sheet, 'apply_'));
}

// ------------------------------------------------- C. INVALIDATION
{
  const pick = (n: number): string => STATUS_IDS[n % STATUS_IDS.length];
  const [a, b, c] = [5, 33, 77].map(pick);
  const sheet = new StatSheet();
  sheet.setSource('gear', [mod('apply_' + a, 'flat', 0.3)]);

  const first = sheet.armedFamily('apply_', STATUS_IDS);
  check('C0: MEMOIZED — a second ask on the same generation re-derives nothing',
    sheet.armedFamily('apply_', STATUS_IDS) === first);

  // 1) setSource ADDS an arm.
  sheet.setSource('buff', [mod('apply_' + b, 'flat', 0.2)]);
  const afterAdd = sheet.armedFamily('apply_', STATUS_IDS);
  check('C1: setSource — the new source arms, and the memo was dropped',
    afterAdd !== first && same(afterAdd, brute(sheet, 'apply_'))
    && afterAdd.includes(a) && afterAdd.includes(b));

  // 2) A source SWAP drops an arm (same name, emptied).
  sheet.setSource('buff', []);
  check('C2: source swap — the departed grant disarms',
    same(sheet.armedFamily('apply_', STATUS_IDS), brute(sheet, 'apply_'))
    && !sheet.armedFamily('apply_', STATUS_IDS).includes(b));

  // 3) setBase arms with no modifier at all.
  sheet.setBase('apply_' + c, 0.4);
  check('C3: setBase — a base override arms its stat (no modifier names it)',
    sheet.armedFamily('apply_', STATUS_IDS).includes(c)
    && same(sheet.armedFamily('apply_', STATUS_IDS), brute(sheet, 'apply_')));
  sheet.setBase('apply_' + c, 0);

  // 4) removeSource.
  sheet.removeSource('gear');
  check('C4: removeSource — the whole layer\'s arms leave with it',
    !sheet.armedFamily('apply_', STATUS_IDS).includes(a)
    && same(sheet.armedFamily('apply_', STATUS_IDS), brute(sheet, 'apply_')));

  // 5) + 6) the condition / gauge seams re-derive (they clear the value cache,
  // so they must clear the armed lists with it — one seam, both derivations).
  sheet.setSource('gear', [mod('apply_' + a, 'flat', 0.3)]);
  const preCond = sheet.armedFamily('apply_', STATUS_IDS);
  sheet.setConditions(['lowLife']);
  check('C5: setConditions re-derives (the shared invalidate seam)',
    sheet.armedFamily('apply_', STATUS_IDS) !== preCond
    && same(sheet.armedFamily('apply_', STATUS_IDS), brute(sheet, 'apply_')));
  const preGauge = sheet.armedFamily('apply_', STATUS_IDS);
  sheet.setGauges([['charge:fury', 3]]);
  check('C6: setGauges re-derives',
    sheet.armedFamily('apply_', STATUS_IDS) !== preGauge
    && same(sheet.armedFamily('apply_', STATUS_IDS), brute(sheet, 'apply_')));
  // A no-op mutation changes nothing (the early-return guards keep the memo).
  const held = sheet.armedFamily('apply_', STATUS_IDS);
  sheet.setGauges([['charge:fury', 3]]);
  sheet.setConditions(['lowLife']);
  check('C7: a no-op condition/gauge write keeps the memo (no churn)',
    sheet.armedFamily('apply_', STATUS_IDS) === held);
}

// ------------------------------------- D. THE NAMELESS ARMING ROADS
{
  const pick = (n: number): string => STATUS_IDS[n % STATUS_IDS.length];
  const [sMin, sTrade] = [19, 62].map(pick);

  // ROAD 1 — a positive min clamp lifts an untouched stat off zero.
  const minStat = 'apply_' + sMin;
  const minDef = STAT_DEFS[minStat];
  const minWas = minDef.min;
  minDef.min = 0.1;
  const s1 = new StatSheet();
  check('D1: a positive min clamp arms with no modifier naming the stat',
    s1.armedFamily('apply_', STATUS_IDS).includes(sMin)
    && s1.get(minStat) > 0 && covers(s1, 'apply_'));
  minDef.min = minWas;

  // ROAD 2 — a STAT_TRADES row whose GAIN side targets the family: the rate
  // dial names the DIAL, so no modifier ever names the target.
  const tradeStat = 'apply_' + sTrade;
  STAT_DEFS['probeArmSource'] = { label: 'probe trade source', base: 0 };
  STAT_DEFS['probeArmRate'] = { label: 'probe trade rate', base: 0 };
  STAT_DEFS['probeArmForgo'] = { label: 'probe trade forgo', base: 0 };
  STAT_TRADES.push({
    from: 'probeArmSource', to: tradeStat,
    rateStat: 'probeArmRate', forgoStat: 'probeArmForgo',
  });
  const s2 = new StatSheet();
  s2.setSource('dials', [
    mod('probeArmSource', 'flat', 100), mod('probeArmRate', 'flat', 0.004),
  ]);
  check('D2: a trade\'s gain side arms structurally (the length key re-derives)',
    s2.armedFamily('apply_', STATUS_IDS).includes(sTrade)
    && s2.get(tradeStat) > 0 && covers(s2, 'apply_'),
    `${tradeStat} = ${s2.get(tradeStat).toFixed(3)}`);
  STAT_TRADES.pop();
  delete STAT_DEFS['probeArmSource'];
  delete STAT_DEFS['probeArmRate'];
  delete STAT_DEFS['probeArmForgo'];
  const s3 = new StatSheet();
  check('D3: the registry is restored (the probe leaves no trade behind)',
    STAT_TRADES.length === 3 && s3.armedFamily('apply_', STATUS_IDS).length === 0
    && STAT_DEFS[minStat].min === minWas);
}

// ------------------------------------------------------ E. THE LIVE LANE
{
  const w: World = makeSimWorld('warrior', 0xa2c3);
  const seat = w.localSeat;
  const hero = seat.actor;
  const cleave = seat.meta.knownSkills.get('cleave')!;
  const tags = skillContextTags(cleave.def);

  check('E0: the hero\'s bare sheet arms nothing on a bare skill',
    hero.sheet.armedFamily('apply_', STATUS_IDS, instanceMods(cleave)).length === 0
    && brute(hero.sheet, 'apply_', tags, instanceMods(cleave)).length === 0);

  // A REAL socketed gem — instanceMods is exactly what resolveHit passes as
  // `extra`, so this is the live arming road, not a hand-built array.
  const gem = SUPPORTS['serrated_edge'];
  const gemStat = gem.mods.find(m => m.stat.startsWith('apply_'))!.stat;
  const gemStatus = gemStat.slice('apply_'.length);
  const gemItem = w.grantSupportGemItem(seat, { def: gem, level: 1 });
  const socketed = !!gemItem && w.socketSupport(gemItem.uid, 'cleave', seat);
  const extra = instanceMods(cleave);
  const armed = hero.sheet.armedFamily('apply_', STATUS_IDS, extra);
  check('E1: a REAL socketed gem arms its status through instanceMods',
    socketed && armed.includes(gemStatus)
    && same(armed, brute(hero.sheet, 'apply_', tags, extra)),
    `[${armed.join(',')}] vs brute [${brute(hero.sheet, 'apply_', tags, extra).join(',')}]`);

  // THE LIVE SWEEP: a real swing through resolveHit still lands the ailment.
  const defId = Object.keys(MONSTERS).find(id =>
    !MONSTERS[id].parts && !MONSTERS[id].lite && (MONSTERS[id].xp ?? 0) > 0)!;
  const wx = w as unknown as {
    createMonster(type: string, level: number, team: 'enemy'): Actor;
  };
  const step = (secs: number, dt = 0.1): void => {
    for (let t = 0; t < secs; t += dt) w.update(dt);
  };
  const dummy = wx.createMonster(defId, 1, 'enemy');
  w.actors.push(dummy);
  // Tank it through the SHEET — a raw `life` write is clamped to maxLife at
  // the next update, and a dead dummy takes no further hits to bleed.
  dummy.sheet.setSource('probeTank', [mod('life', 'flat', 1e6)]);
  dummy.life = dummy.maxLife();
  dummy.pos.x = hero.pos.x + 22; dummy.pos.y = hero.pos.y;
  let landed = false;
  for (let tries = 0; tries < 40 && !landed; tries++) {
    w.useSkill(hero, cleave, { x: dummy.pos.x, y: dummy.pos.y });
    step(0.6);
    landed = dummy.statuses.some(s => s.id === gemStatus);
  }
  check(`E2: a real swing still applies the armed ailment (${gemStatus})`, landed,
    `vs ${defId}`);
  // THE DETERMINISM PIN on the live lane: the sweep rolls chance() only where
  // the chance is positive, so the ids that FIRE — and their order — are the
  // whole of the RNG contract. Armed-then-filtered must equal the full scan.
  const fired = armed.filter(id => hero.sheet.get('apply_' + id, tags, extra) > 0);
  check('E3: the FIRING SUBSEQUENCE is identical — the rolls walk the same stream',
    same(fired, brute(hero.sheet, 'apply_', tags, extra)),
    `fires [${fired.join(',')}]`);

  // THE MINION CARRY — the second swept family, end to end through the bake.
  const owner = hero;
  const carryStatus = STATUS_IDS.find(id => id !== gemStatus)!;
  const minionA = wx.createMonster(defId, 1, 'enemy');
  owner.sheet.setSource('probeCarry', [mod('minionApply_' + carryStatus, 'flat', 0.4)]);
  w.bakeMinionOwnerStats(minionA, owner, cleave, 1);
  check('E4: the minion bake still carries minionApply_ onto the minion\'s apply_',
    minionA.sheet.get('apply_' + carryStatus) > 0,
    `${carryStatus} = ${minionA.sheet.get('apply_' + carryStatus).toFixed(2)}`);
  owner.sheet.removeSource('probeCarry');
  const minionB = wx.createMonster(defId, 1, 'enemy');
  w.bakeMinionOwnerStats(minionB, owner, cleave, 1);
  check('E5: an uninvested owner bakes NO carry (the empty sweep)',
    STATUS_IDS.every(id => minionB.sheet.get('apply_' + id) === 0)
    && owner.sheet.armedFamily('minionApply_', STATUS_IDS, instanceMods(cleave)).length === 0);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
