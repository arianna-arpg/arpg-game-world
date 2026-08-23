// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PREVIEW FABRIC (engine/skillPreview.ts): the law that a
// number shown to the player is the number the engine will produce.
//
// The whole point of computing tooltips live is that they cannot drift, so the
// probe's job is to make drift LOUD. It does not re-derive anything: it runs
// the real roller thousands of times and asserts every hit lands inside the
// band the preview drew, then moves the build and asserts the band moved with
// it. A future edit that teaches the roller a new multiplier but forgets the
// preview (or vice versa) fails here rather than in a player's face.
//
// Rigs: A band containment (the core law) · B investment moves the band ·
// C support gems move the band · D cooldown parity with the STAMPER ·
// E cost parity with the payer · F the ailment-tuning lie (an incidental
// authored chance must display TUNED, never authored) · G statusChance moves
// the displayed odds · H durationOverride is NOT scaled by effectDuration ·
// I counts (projectiles / multiTarget) match what the cast actually makes ·
// J purity (the preview never touches the rng).
// Run: npx tsx balance/probe_skillpreview.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance, skillCooldownSeconds } from '../src/engine/skills';
import { rollSkillDamage, skillDamageBands } from '../src/engine/damage';
import { previewSkill } from '../src/engine/skillPreview';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { mod } from '../src/engine/stats';
import { tuneAilmentChance } from '../src/engine/status';
import { vec } from '../src/core/math';
import { rand } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import type { Actor } from '../src/engine/actor';
import type { SkillInstance } from '../src/engine/skills';

const DT = 1 / 60;
/** Advance the real loop — casts resolve on their own clock (a cooldown
 *  stamps when the swing COMPLETES unless the def says 'press'), so a probe
 *  that reads straight after the press reads a world mid-windup. */
const step = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;
const rowOf = (p: Actor, inst: SkillInstance, key: string) =>
  previewSkill(p, inst).rows.find(r => r.key === key);

bootSimEngine();
seedGlobalRandom(0x5eed);

/** Sum a rolled packet, undoing the crit multiplier so the result is
 *  comparable to the band (the preview reports crit as its own odds rather
 *  than baking it in — see skillPreview's damage section). */
function rolledTotal(p: Actor, inst: SkillInstance): number {
  const pk = rollSkillDamage(p, inst);
  const raw = (Object.values(pk.amounts) as number[]).reduce((s, v) => s + v, 0);
  if (!pk.crit) return raw;
  const multi = skillDamageBands(p, inst).critMulti;
  return multi > 0 ? raw / multi : raw;
}

/** THE CORE LAW, asserted by brute force: N real rolls, none outside the band. */
function containment(
  p: Actor, inst: SkillInstance, rolls: number,
): { out: number; min: number; max: number; mean: number; lo: number; hi: number } {
  const { total } = skillDamageBands(p, inst);
  let out = 0, min = Infinity, max = -Infinity, sum = 0;
  for (let i = 0; i < rolls; i++) {
    const t = rolledTotal(p, inst);
    // Floating-point slack only: a band edge is the same arithmetic the roll
    // ran, so anything beyond epsilon is a genuine divergence.
    if (t < total.lo - 1e-6 || t > total.hi + 1e-6) out++;
    min = Math.min(min, t); max = Math.max(max, t); sum += t;
  }
  return { out, min, max, mean: sum / rolls, lo: total.lo, hi: total.hi };
}

// --- A) BAND CONTAINMENT across a spread of skills --------------------------
// A melee swing, a spell with a wide die, a multi-type boss verb and a
// flat-only utility: different shapes through the same fold.
{
  const w = makeSimWorld('warrior', 0xa11);
  const p = w.player;
  for (const id of ['cleave', 'heavy_strike', 'ground_slam', 'frostbolt', 'firebolt']) {
    const def = SKILLS[id];
    if (!def) { check(`A: ${id} exists`, false); continue; }
    const inst = makeSkillInstance(def, 1);
    const r = containment(p, inst, 400);
    check(`A: ${id} — every roll inside the previewed band`, r.out === 0,
      `${r.out}/400 outside [${r.lo.toFixed(2)}, ${r.hi.toFixed(2)}], saw [${r.min.toFixed(2)}, ${r.max.toFixed(2)}]`);
    // And the band is TIGHT: over 400 rolls the observed spread should reach
    // most of it, or the preview is quoting a range far wider than reality.
    const span = r.hi - r.lo;
    if (span > 0.01) {
      check(`A: ${id} — the band is the real spread, not a loose bound`,
        (r.max - r.min) > span * 0.6,
        `observed ${(100 * (r.max - r.min) / span).toFixed(0)}% of the band`);
    }
  }
}

// --- B) INVESTMENT MOVES THE BAND -------------------------------------------
// The preview must read the caster's live sheet with the skill's own tags, so
// a global "increased damage" lifts it and rolls stay contained afterwards.
{
  const w = makeSimWorld('warrior', 0xb22);
  const p = w.player;
  const inst = makeSkillInstance(SKILLS['cleave'], 1);
  const before = skillDamageBands(p, inst).total;
  p.sheet.setSource('probeDmg', [mod('damage', 'increased', 1)]);
  const after = skillDamageBands(p, inst).total;
  check('B: +100% increased damage lifts the previewed band',
    after.hi > before.hi * 1.5, `${before.hi.toFixed(1)} → ${after.hi.toFixed(1)}`);
  const r = containment(p, inst, 300);
  check('B: rolls stay inside the lifted band', r.out === 0, `${r.out}/300 outside`);

  // TAG SCOPING: a spell-only bonus must NOT move a melee attack's band.
  p.sheet.setSource('probeDmg', [mod('damage', 'increased', 5, ['spell'])]);
  const spellOnly = skillDamageBands(p, inst).total;
  check('B: a spell-tagged bonus leaves the melee band alone',
    near(spellOnly.hi, before.hi, 1e-6),
    `${before.hi.toFixed(3)} vs ${spellOnly.hi.toFixed(3)}`);
  p.sheet.setSource('probeDmg', []);
}

// --- C) A SOCKETED SUPPORT MOVES THE BAND -----------------------------------
// The instance's own mods (gems, levels) reach the preview through
// instanceMods — the lane a display copy reading only the global sheet misses.
{
  const w = makeSimWorld('warrior', 0xc33);
  const seat = w.seats[0];
  const p = w.player;
  const cleave = seat.meta.knownSkills.get('cleave');
  if (!cleave) {
    check('C: the warrior knows cleave', false);
  } else {
    const before = skillDamageBands(p, cleave).total.hi;
    const gemItem = w.grantSupportGemItem(seat, { def: SUPPORTS['brutality'] ?? SUPPORTS['added_fire'], level: 1 });
    const socketed = !!gemItem && w.socketSupport(gemItem.uid, 'cleave', seat);
    if (!socketed) {
      check('C: the test gem sockets into cleave', false);
    } else {
      const after = skillDamageBands(p, cleave).total.hi;
      check('C: socketing a damage gem moves the previewed band',
        Math.abs(after - before) > 1e-6, `${before.toFixed(2)} → ${after.toFixed(2)}`);
      const r = containment(p, cleave, 300);
      check('C: rolls stay inside the socketed band', r.out === 0, `${r.out}/300 outside`);
    }
  }
}

// --- D) COOLDOWN PARITY WITH THE STAMPER ------------------------------------
// The preview prints skillCooldownSeconds; the engine stamps with it. Cast for
// real and read the clock the world actually set.
{
  const w = makeSimWorld('warrior', 0xd44);
  const p = w.player;
  const inst = makeSkillInstance(SKILLS['heavy_strike'], 1);
  p.mana = p.maxMana();
  // SCOPED, not global: the formula divides the skill-scoped recovery by the
  // GLOBAL one because updateTimers already ticks at the global rate — so a
  // global bonus cancels itself here by design, and only tag-scoped
  // investment moves a particular skill's clock.
  p.sheet.setSource('probeCd', [mod('cooldownRecovery', 'increased', 1, ['melee'])]);
  const shown = skillCooldownSeconds(p, inst);
  check('D: melee-scoped recovery shortens the previewed cooldown',
    shown < SKILLS['heavy_strike'].cooldown - 1e-6,
    `base ${SKILLS['heavy_strike'].cooldown}s → ${shown.toFixed(3)}s`);
  w.useSkill(p, inst, vec(p.pos.x + 50, p.pos.y));
  step(w, 1.2);   // let the swing land: the clock stamps on completion
  // cooldownTotals is the STAMPED value (the HUD's own denominator); the
  // cooldowns entry has already been ticking down during the steps above.
  const stamped = p.cooldownTotals.get(inst.def.id) ?? 0;
  check('D: the stamped clock IS the previewed one',
    near(stamped, shown, 1e-6), `stamped ${stamped.toFixed(4)} vs shown ${shown.toFixed(4)}`);
  const row = rowOf(p, inst, 'cooldown');
  check('D: and the row reports it, not the authored base',
    !!row && row.value !== `${SKILLS['heavy_strike'].cooldown}s`, row?.value ?? 'no row');
  p.sheet.setSource('probeCd', []);
}

// --- E) COST PARITY WITH THE PAYER ------------------------------------------
{
  const w = makeSimWorld('magician', 0xe55);
  const p = w.player;
  const inst = makeSkillInstance(SKILLS['firebolt'], 1);
  p.sheet.setSource('probeCost', [mod('manaCost', 'increased', 0.5)]);
  const cost = p.skillCost(inst);
  const row = rowOf(p, inst, 'cost');
  check('E: the cost row quotes the payer\'s own resolver',
    !!row && row.value.startsWith(`${cost.mana} mana`),
    `row "${row?.value}" vs skillCost ${cost.mana}`);
  p.sheet.setSource('probeCost', []);
}

// --- F) THE AILMENT-TUNING LIE ----------------------------------------------
// An authored sub-identity chance is SCALED at the roll site. A tooltip
// printing the authored figure is the exact failure this fabric exists to
// prevent, so pin that the displayed odds are the tuned ones.
{
  const w = makeSimWorld('warrior', 0xf66);
  const p = w.player;
  let pinned = false;
  for (const id of Object.keys(SKILLS)) {
    const def = SKILLS[id];
    const fx = def.effects?.find(e => e.type === 'status'
      && e.chance > 0 && tuneAilmentChance(e.status, e.chance) < e.chance - 1e-9);
    if (!fx || fx.type !== 'status') continue;
    const inst = makeSkillInstance(def, 1);
    const row = rowOf(p, inst, `status_${fx.status}`);
    const tuned = tuneAilmentChance(fx.status, fx.chance);
    if (!row) continue;
    const shownPct = parseInt(row.value, 10);
    check(`F: ${id} shows the TUNED ${fx.status} chance, not the authored one`,
      !Number.isNaN(shownPct) && Math.abs(shownPct - Math.round(tuned * 100)) <= 1,
      `authored ${Math.round(fx.chance * 100)}%, tuned ${Math.round(tuned * 100)}%, shown "${row.value}"`);
    pinned = true;
    break;
  }
  check('F: the census found a tuned-down authored ailment to pin', pinned);
}

// --- G) statusChance MOVES THE DISPLAYED ODDS -------------------------------
{
  const w = makeSimWorld('warrior', 0x977);
  const p = w.player;
  const inst = makeSkillInstance(SKILLS['heavy_strike'], 1);
  const before = rowOf(p, inst, 'status_stun')?.value;
  p.sheet.setSource('probeSc', [mod('statusChance', 'flat', 0.25)]);
  const after = rowOf(p, inst, 'status_stun')?.value;
  check('G: +25% statusChance raises the shown stun odds',
    !!before && !!after && parseInt(after, 10) - parseInt(before, 10) >= 24,
    `${before} → ${after}`);
  p.sheet.setSource('probeSc', []);
}

// --- H) THE UNSCALABLE CLOCK -------------------------------------------------
// durationOverride bypasses effectDuration (the Flash Freeze rule): a status
// row carrying one must NOT stretch when duration investment lands, while an
// ordinary status row must.
{
  const w = makeSimWorld('warrior', 0xa88);
  const p = w.player;
  const fixed = makeSkillInstance(SKILLS['ironbell_toll'], 1);
  const fixedBefore = rowOf(p, fixed, 'status_stun')?.note;
  p.sheet.setSource('probeDur', [mod('effectDuration', 'increased', 1)]);
  const fixedAfter = rowOf(p, fixed, 'status_stun')?.note;
  check('H: a durationOverride status ignores effectDuration',
    !!fixedBefore && fixedBefore === fixedAfter, `${fixedBefore} → ${fixedAfter}`);
  // The ordinary lane still scales (proving the rig is not simply inert).
  const buffInst = makeSkillInstance(SKILLS['war_cry'], 1);
  const buffRow = previewSkill(p, buffInst).rows.find(r => r.key.startsWith('buff_'));
  check('H: an ordinary buff duration DOES scale with the same investment',
    !!buffRow && !!buffRow.note && buffRow.note.startsWith('base '),
    `${buffRow?.value} (${buffRow?.note})`);
  p.sheet.setSource('probeDur', []);
}

// --- I) COUNTS MATCH WHAT THE CAST ACTUALLY MAKES ----------------------------
{
  const w = makeSimWorld('ranger', 0xb99);
  const p = w.player;
  const arrow = SKILLS['power_shot'] ?? SKILLS['split_arrow'] ?? SKILLS['firebolt'];
  const inst = makeSkillInstance(arrow, 1);
  p.sheet.setSource('probeProj', [mod('projectileCount', 'flat', 2)]);
  const row = rowOf(p, inst, 'projectiles');
  if (arrow.delivery.type === 'projectile') {
    const before = w.projectiles.length;
    p.mana = p.maxMana();
    w.useSkill(p, inst, vec(p.pos.x + 120, p.pos.y));
    let fired = w.projectiles.length - before;
    // The volley leaves the hand when the cast completes, so watch the peak
    // across the windup rather than the instant after the press.
    for (let t = 0; t < 1.5 && fired <= 0; t += DT) {
      step(w, DT);
      fired = Math.max(fired, w.projectiles.length - before);
    }
    check('I: the projectile row equals what the cast puts in the air',
      !!row && parseInt(row.value, 10) === fired,
      `row "${row?.value}" vs ${fired} fired`);
  } else {
    check('I: a projectile skill was available to pin', false, arrow.id);
  }
  p.sheet.setSource('probeProj', []);

  // multiTarget: silent in authored text, surfaced as its own row.
  const t = makeSkillInstance(SKILLS['firebolt'], 1);
  check('I: multiTarget stays hidden at zero', !rowOf(p, t, 'multiTarget'));
  p.sheet.setSource('probeMt', [mod('multiTarget', 'flat', 2)]);
  check('I: and surfaces once granted', rowOf(p, t, 'multiTarget')?.value === '+2');
  p.sheet.setSource('probeMt', []);
}

// --- J) THE PREVIEW IS PURE --------------------------------------------------
// A hover may run every frame, so previewing must not advance the rng — if it
// did, opening a panel would change the game's dice.
{
  const w = makeSimWorld('warrior', 0xcaa);
  const p = w.player;
  const inst = makeSkillInstance(SKILLS['cleave'], 1);
  seedGlobalRandom(0x1234);
  const a = [rand(0, 1), rand(0, 1), rand(0, 1)];
  seedGlobalRandom(0x1234);
  for (let i = 0; i < 25; i++) previewSkill(p, inst);
  const b = [rand(0, 1), rand(0, 1), rand(0, 1)];
  check('J: previewing 25 times consumes no randomness',
    a.every((v, i) => near(v, b[i])), `${a.join(',')} vs ${b.join(',')}`);
  // Twice in a row must also agree — a preview that memoized against live
  // state would drift from the second read onward.
  const r1 = JSON.stringify(previewSkill(p, inst).rows);
  const r2 = JSON.stringify(previewSkill(p, inst).rows);
  check('J: two consecutive previews agree exactly', r1 === r2);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
