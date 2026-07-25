// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SPENT AND THE ROOTED end to end on the real engine
// (docs/engine/reserves.md): the registry weave (every reserve row validates,
// every claim names live ground, the census names any body that spends or
// draws power invisibly), the pure resolvers (fill/stage/cost/spent laws),
// DRAWN == TESTED for every depletion tell against real live state, the
// BELLOWS END TO END on a real world (casts drain the real pool → the cast
// gate REFUSES when short → the vent window opens, punishes and refills),
// the WICK's one-way burn + its gauge-scaled damage curve, the LEAKING's
// travel drain, the CLAIMER's ground (membrane planted → rooted mods worn →
// heart killed → floor RECEDES → mods drop), the grace's anti-flicker law,
// the two slayer axes arming only when armed, and determinism.
// Run: npx tsx balance/probe_spent.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import {
  MONSTERS, NOCTURNE_UNFURL, ROOTED_FAVOR, ROOTED_THRIVE,
  SPOREBED_CLAIM, SPOREBED_COURT, WIND_PUFF,
} from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { SKILLS } from '../src/data/skills';
import { CREEPS } from '../src/engine/creep';
import { STATUS_DEFS } from '../src/engine/status';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { regionIds } from '../src/world/regions';
import {
  drainHolds, makeReserve, pipsOf, regenHolds, reserveCostOf,
  reserveFrac, reserveGauge, reserveSpent, stageAt, validateReserves,
  type ReserveSpec,
} from '../src/engine/reserves';
import { ROOTED_CFG, standsRooted, validateRooted } from '../src/engine/rooted';
import { resolveTell, type TellBody, type TellWorld } from '../src/engine/tells';
import { makeSkillInstance } from '../src/engine/skills';
import { mitigateTyped } from '../src/engine/damage';
import { mod } from '../src/engine/stats';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

const REGION_SET = new Set(regionIds());

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x5be7);

const DT = 1 / 60;
const tick = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) w.update(DT);
};
const spawn = (w: ReturnType<typeof makeSimWorld>, id: string, lvl = 5,
  team: 'enemy' | 'player' = 'enemy'): Actor => {
  const m = w.createMonster(id, lvl, team);
  w.actors.push(m);
  return m;
};

// Hand-built state for the pure rigs (TellBody is structural by design).
const body = (over?: Partial<TellBody>): TellBody => ({
  id: 7, life: 80, maxLife: () => 100, plies: 0, pliesMax: 0,
  drives: new Map<string, number>(), charges: new Map<string, number>(),
  statuses: [], buffs: new Map(), aggroed: false, aiMoraleUntil: 0,
  ...over,
});
const W: TellWorld = { time: 5, radiance: () => 0.4 };

// ===========================================================================
// 0) THE REGISTRY WEAVE
// ===========================================================================
{
  const faults = validateReserves(MONSTERS, {
    skill: id => !!SKILLS[id], status: id => !!STATUS_DEFS[id],
  });
  check('weave: every shipped reserve row validates (pools, costs, stages, vents, THE HONESTY LAW)',
    faults.length === 0, faults.slice(0, 3).join(' | '));

  const rootFaults = validateRooted(MONSTERS, {
    creep: id => !!CREEPS[id], ground: id => REGION_SET.has(id),
  });
  check('weave: every shipped rooted claim validates (live kinds, real mods, a visible tell)',
    rootFaults.length === 0, rootFaults.slice(0, 3).join(' | '));

  check('weave: both new gauge-limbs are registered painters',
    !!PART_PAINTERS.bellowsLung && !!PART_PAINTERS.wickTaper);

  // Each debut body stands, wears a look whose every part resolves, and
  // keeps the GAUGE'S SEAT BARE (the accumulator family's law: the live
  // meter must not fight a baked twin for the eye).
  const seats: [string, string][] = [
    ['fumelung', 'bellowsLung'], ['taperwight', 'wickTaper'],
    ['sapbleeder', 'fillSac'], ['bloom_matron', 'roots'],
  ];
  for (const [id, limb] of seats) {
    const look = LOOKS[MONSTERS[id]?.look ?? ''];
    check(`weave: ${id} stands (def + look, every part painted, ${limb} seat bare)`,
      !!MONSTERS[id] && !!look
      && look.parts.every(p => !!PART_PAINTERS[p.kind])
      && !look.parts.some(p => p.kind === limb));
  }
  check('weave: nightbloom stands (def + look, every part painted)',
    !!MONSTERS.nightbloom && !!LOOKS.nightbloom
    && LOOKS.nightbloom.parts.every(p => !!PART_PAINTERS[p.kind]));

  // THE SPOREBED joins the anchored-pocket lane — the fabric's least-fed
  // lever. Two tilesets grew standing pockets before this pass.
  check('weave: the sporebed creep kind is registered and taxes only intruders',
    !!CREEPS.sporebed
    && CREEPS.sporebed.grants?.length === 1
    && CREEPS.sporebed.grants[0].status === 'sporemired'
    && CREEPS.sporebed.grants![0].notFactions?.includes('fungal') === true);

  // THE COST/CLAIM CENSUS: a body whose casting is gated, whose power
  // burns down, or whose strength depends on ground MUST say so.
  const bare: string[] = [];
  for (const id in MONSTERS) {
    const def = MONSTERS[id];
    for (const r of def.reserves ?? []) {
      const told = def.tells?.some(t => t.source === reserveGauge(r.id) || t.source === 'spent')
        || def.brainVariants?.some(v => v.tells?.some(t => t.source === reserveGauge(r.id)));
      if (!told) bare.push(`${id}:${r.id}`);
    }
    if (def.rooted && !def.tells?.some(t => t.source === 'rooted')) bare.push(`${id}:rooted`);
  }
  check('weave: no body spends or draws power invisibly (census)', bare.length === 0, bare.join(','));

  // THE NOCTURNE CENSUS — the whole point of the retrofit half.
  const silent: string[] = [];
  for (const id in MONSTERS) {
    const def = MONSTERS[id];
    if (!def.nocturne) continue;
    const told = def.tells?.some(t => t.source === 'nocturne')
      || def.brainVariants?.some(v => v.tells?.some(t => t.source === 'nocturne'));
    if (!told) silent.push(id);
  }
  check('weave: every phase-worn body wears the unfurl (census)', silent.length === 0, silent.join(','));

  check('weave: NOCTURNE_UNFURL is colorless (one row serves every body\'s own tone)',
    NOCTURNE_UNFURL.every(r => r.source === 'nocturne')
    && NOCTURNE_UNFURL.some(r => r.channel.kind === 'glow'
      && (r.channel as { color?: string }).color === undefined));
  check('weave: WIND_PUFF reads the kite budget and its winded beat',
    WIND_PUFF.some(r => r.source === 'wind') && WIND_PUFF.some(r => r.source === 'winded'));

  // THE COURT ASYMMETRY (load-bearing): the matron pays a wilt off her own
  // floor; her kin — who range the whole world — never do.
  check('weave: the matron wilts off her claim, the court merely stops gaining',
    !!SPOREBED_CLAIM.off?.length && !SPOREBED_COURT.off
    && JSON.stringify(SPOREBED_CLAIM.mods) === JSON.stringify(SPOREBED_COURT.mods));
  check('weave: the court\'s tell shows the GAIN only (never implies an unpaid penalty)',
    ROOTED_FAVOR.length === 1 && ROOTED_FAVOR[0].band === undefined
    && ROOTED_THRIVE.some(r => r.band?.[0] === 1 && r.band?.[1] === 0));
  const court = ['fungal_sporeling', 'fungal_puffball', 'fungal_spitter', 'fungal_brute', 'fungal_tender', 'fungal_heartbloom'];
  check('weave: the whole Bloom court claims the matron\'s kind (the recede loop reaches all of them)',
    court.every(id => MONSTERS[id]?.rooted?.creep?.includes('sporebed'))
    && MONSTERS.bloom_matron?.creepSource?.kind === 'sporebed');

  // The bellows' gout LEADS its rotation and the BLADDER is the pacing:
  // canUse reads the price (the dry-magazine idiom), so the rotation
  // falls through to claw when the lungs cannot pay — the pool, not a
  // cooldown, is the clock the player reads.
  const fl = MONSTERS.fumelung;
  check('weave: the gout is priced and LEADS the rotation (the pool is the pacing)',
    reserveCostOf(fl.reserves![0], 'fume_gout') === 1
    && fl.brain?.skillUse?.mode === 'priority'
    && fl.brain?.skillUse?.order?.[0] === 'fume_gout'
    && fl.brain?.rules?.some(r => r.when.spent === true) === true);
  check('weave: AICondition.reserve keeps a live tenant (the wick\'s guttered pace-down)',
    MONSTERS.taperwight.brain?.rules?.some(r => r.when.reserve?.id === 'wick') === true);
  check('weave: the wick\'s damage curve rides its OWN fuel gauge (one number, two readers)',
    MONSTERS.taperwight.mods?.some(m => m.gauge === reserveGauge('wick') && m.stat === 'damage') === true
    && MONSTERS.taperwight.reserves?.[0].id === 'wick');
  check('weave: the leaker\'s trail and its drain are both keyed to TRAVEL',
    !!MONSTERS.sapbleeder.wake && (MONSTERS.sapbleeder.reserves?.[0].drainPerUnit ?? 0) > 0);
}

// ===========================================================================
// 1) THE PURE RESOLVERS
// ===========================================================================
{
  const spec: ReserveSpec = {
    id: 't', pool: 4, costs: { a: 2 }, perCast: 0.5,
    stages: [{ below: 0.25, status: 'guttered' }, { below: 0.6, status: 'sap_starved' }],
    vent: { forSec: 2 },
  };
  const st = makeReserve(spec);
  check('pure: a fresh row mints FULL at its pool', st.cur === 4 && st.max === 4 && reserveFrac(st) === 1);
  check('pure: start scales the mint', makeReserve({ id: 't', pool: 4, start: 0.25 }).cur === 1);
  check('pure: a named cost wins over perCast; unnamed skills pay perCast',
    reserveCostOf(spec, 'a') === 2 && reserveCostOf(spec, 'zzz') === 0.5);
  check('pure: an unpriced row is free', reserveCostOf({ id: 't', pool: 1 }, 'a') === 0);

  // Stage bands: rows checked IN ORDER, first match wins.
  check('pure: stages resolve first-match-in-order over the band',
    stageAt(spec, 0.1)?.status === 'guttered'
    && stageAt(spec, 0.4)?.status === 'sap_starved'
    && stageAt(spec, 0.9) === undefined);

  // SPENT: threshold OR an open vent window, and the window wins even
  // while a refill is pending (the slayer axis must arm through it).
  const s2 = makeReserve(spec);
  check('pure: a full row is not spent', !reserveSpent(spec, s2, 0));
  s2.cur = 0;
  check('pure: an empty row is spent', reserveSpent(spec, s2, 0));
  s2.cur = 4; s2.ventUntil = 10;
  check('pure: a VENTING row reads spent even at full (the window is the depletion)',
    reserveSpent(spec, s2, 5) && !reserveSpent(spec, s2, 11));
  check('pure: spentAt lifts the floor',
    reserveSpent({ ...spec, spentAt: 0.3 }, { ...makeReserve(spec), cur: 1 }, 0));

  // Drain / regen gates.
  check('pure: drainWhile gates the burn',
    drainHolds({ id: 't', pool: 1 }, { aggroed: false, moving: false })
    && !drainHolds({ id: 't', pool: 1, drainWhile: 'aggroed' }, { aggroed: false, moving: true })
    && drainHolds({ id: 't', pool: 1, drainWhile: 'moving' }, { aggroed: false, moving: true }));
  const rr: ReserveSpec = { id: 't', pool: 4, regen: 1, regenDelay: 1, regenWhile: 'calm' };
  const rs = makeReserve(rr); rs.lastSpendAt = 0;
  check('pure: regen waits out regenDelay, refuses while engaged under \'calm\', and never runs mid-vent',
    !regenHolds(rr, rs, 0.5, { aggroed: false })
    && regenHolds(rr, rs, 2, { aggroed: false })
    && !regenHolds(rr, rs, 2, { aggroed: true })
    && !regenHolds(rr, { ...rs, ventUntil: 9 }, 2, { aggroed: false }));
  check('pure: a row with no regen never recovers', !regenHolds({ id: 't', pool: 4 }, rs, 99, { aggroed: false }));

  check('pure: gauge pips are INTEGER (the quanta law — the sheet cache never churns on a float)',
    Number.isInteger(pipsOf(2.7)) && pipsOf(2.4) === 2 && pipsOf(0) === 0);

  // THE CLAIM predicate.
  const claim = { creep: ['sporebed'], ground: ['mud'], mods: [] };
  check('pure: standsRooted answers creep OR ground, and false on neither',
    standsRooted(claim, { x: 0, y: 0 }, { creepCover: () => 0.5 })
    && standsRooted(claim, { x: 0, y: 0 }, { groundKind: 'mud' })
    && !standsRooted(claim, { x: 0, y: 0 }, { groundKind: 'stone', creepCover: () => 0 }));
  check('pure: a claim with no matching kind is not satisfied by another kind',
    !standsRooted({ creep: ['sporebed'], mods: [] }, { x: 0, y: 0 },
      { creepCover: k => (k === 'caulflesh' ? 1 : 0) }));
}

// ===========================================================================
// 2) DRAWN == TESTED — every new tell source against real live state
// ===========================================================================
{
  const r = { cur: 3, max: 4, lastSpendAt: 0, ventUntil: 0, pips: 3 };
  const b = body({ reserves: new Map([['breath', r]]) });
  check('drawn: reserve: reads the live pool as a fraction, bounded, and unknown ids read 0',
    resolveTell({ source: 'reserve:breath', steps: 100, channel: { kind: 'glow' } }, b, W) === 0.75
    && resolveTell({ source: 'reserve:nope', channel: { kind: 'glow' } }, b, W) === 0);
  check('drawn: reserve: needs NO band (bounded by construction, unlike charge:)',
    resolveTell({ source: 'reserve:breath', steps: 4, channel: { kind: 'glow' } }, b, W) === 0.75);
  check('drawn: an inverted band turns the fill into a DRAIN read',
    resolveTell({ source: 'reserve:breath', band: [1, 0], steps: 100, channel: { kind: 'glow' } }, b, W) === 0.25);

  check('drawn: spent reads the one boolean the slayer axis arms off',
    resolveTell({ source: 'spent', steps: 1, channel: { kind: 'glow' } }, body({ spent: true }), W) === 1
    && resolveTell({ source: 'spent', steps: 1, channel: { kind: 'glow' } }, body({ spent: false }), W) === 0);

  check('drawn: wind reads the kite accumulator against its own cap',
    resolveTell({ source: 'wind', steps: 100, channel: { kind: 'glow' } },
      body({ aiKiteAcc: 1.6, aiKiteSpec: { kite: 3.2 } }), W) === 0.5
    // A tireless body (kite Infinity) never reads as tiring.
    && resolveTell({ source: 'wind', steps: 100, channel: { kind: 'glow' } },
      body({ aiKiteAcc: 99, aiKiteSpec: { kite: Infinity } }), W) === 0
    // And a body with no budget at all reads 0, never NaN.
    && resolveTell({ source: 'wind', steps: 100, channel: { kind: 'glow' } }, body({}), W) === 0);
  check('drawn: winded reads the live window against the world clock',
    resolveTell({ source: 'winded', steps: 1, channel: { kind: 'glow' } }, body({ aiWindedUntil: 9 }), W) === 1
    && resolveTell({ source: 'winded', steps: 1, channel: { kind: 'glow' } }, body({ aiWindedUntil: 1 }), W) === 0);

  for (const [src, key] of [['rooted', 'rootedHeld'], ['nocturne', 'nocturneHeld'], ['bonded', 'bondHeld']] as const) {
    check(`drawn: ${src} reads the exact held flag the stat sheet keys on`,
      resolveTell({ source: src, steps: 1, channel: { kind: 'glow' } }, body({ [key]: true } as Partial<TellBody>), W) === 1
      && resolveTell({ source: src, steps: 1, channel: { kind: 'glow' } }, body({ [key]: false } as Partial<TellBody>), W) === 0);
  }

  const cw: TellWorld = { time: 5, creepCoverAt: (k, x) => (k === 'sporebed' || k === undefined ? x / 100 : 0) };
  check('drawn: creep reads live cover under the body — bare (any kind) or one named kind',
    resolveTell({ source: 'creep', steps: 100, channel: { kind: 'glow' } }, body({ pos: { x: 40, y: 0 } }), cw) === 0.4
    && resolveTell({ source: 'creep:sporebed', steps: 100, channel: { kind: 'glow' } }, body({ pos: { x: 40, y: 0 } }), cw) === 0.4
    && resolveTell({ source: 'creep:caulflesh', steps: 100, channel: { kind: 'glow' } }, body({ pos: { x: 40, y: 0 } }), cw) === 0);

  // THE READ-ONLY LAW: a sweep may never move the state it reports.
  const before = JSON.stringify({ r, ...body() });
  for (const s of ['reserve:breath', 'spent', 'wind', 'winded', 'rooted', 'nocturne', 'bonded', 'creep']) {
    resolveTell({ source: s, band: [0, 1], channel: { kind: 'glow' } }, b, cw);
  }
  check('drawn: the sources are pure reads (state byte-identical after a full sweep)',
    JSON.stringify({ r, ...body() }) === before);
}

// ===========================================================================
// 3) THE BELLOWS END TO END — drain, refusal, vent, refill
// ===========================================================================
{
  const w = makeSimWorld('warrior', 0x5be70);
  const fl = spawn(w, 'fumelung', 6);
  const spec = MONSTERS.fumelung.reserves![0];
  const st = () => fl.reserves!.get('breath')!;
  check('bellows: the body arrives with its pool minted full',
    st().cur === 3 && st().max === 3 && !fl.spent);

  const gout = makeSkillInstance(SKILLS.fume_gout, 6);
  const aim = vec(fl.pos.x + 100, fl.pos.y);
  const fired: boolean[] = [];
  for (let i = 0; i < 4; i++) {
    fl.useLock = 0; fl.casting = null;
    fired.push(w.useSkill(fl, gout, aim));
  }
  check('bellows: THREE casts land and the FOURTH is refused — costs refuse, they never debt',
    fired[0] && fired[1] && fired[2] && !fired[3], JSON.stringify(fired));
  check('bellows: each landed cast drained exactly its price', st().cur === 0);
  check('bellows: the refusal lives in canUse (an AI rotation falls through to its next art)',
    !fl.canUse(gout));

  // The sweep opens the vent on the next beat.
  tick(w, 0.3);
  check('bellows: EMPTY opens the vent window (status worn, spent stamped)',
    st().ventUntil > w.time && fl.spent
    && fl.statuses.some(s => s.id === 'winded_gasp'));
  check('bellows: the vent cast fired its own pall (the telegraph is real ground)',
    w.zones.some(z => z.inst.def.id === 'fume_vent'),
    'zones=' + w.zones.map(z => z.inst.def.id).join(','));

  // Nothing recovers mid-window, and the pool refills exactly at its close.
  tick(w, 1.0);
  check('bellows: nothing knits back while the window stands', st().cur === 0 && fl.spent);
  tick(w, 2.2);
  check('bellows: the window closes and the pool comes back at the authored share',
    st().ventUntil === 0 && st().cur === 3 && !fl.spent);

  // THE REGEN DENIAL: spend one, and the pool must wait out regenDelay.
  fl.useLock = 0; fl.casting = null;
  w.useSkill(fl, gout, aim);
  const after = st().cur;
  tick(w, spec.regenDelay! * 0.5);
  check('bellows: regen waits out regenDelay (denying the pause denies the recovery)',
    Math.abs(st().cur - after) < 1e-6, `${after} -> ${st().cur}`);
  tick(w, spec.regenDelay! + 1.5);
  check('bellows: past the delay it knits back', st().cur > after);
}

// ===========================================================================
// 4) THE WICK — a one-way clock, and a damage curve made of its own fuel
// ===========================================================================
{
  const w = makeSimWorld('warrior', 0x5be71);
  const tw = spawn(w, 'taperwight', 6);
  const st = () => tw.reserves!.get('wick')!;
  const full = st().cur;
  check('wick: it arrives at full taper', full === 6);

  // The burn is the ENGAGEMENT's clock (drainWhile 'aggroed'): a wight
  // standing quiet in an unvisited vault keeps its taper.
  tick(w, 4);
  check('wick: an unengaged wight does not burn', st().cur === full);
  // Baseline damage read AFTER the settle — the pip gauge publishes on the
  // actor's own frame fold, so a pre-tick read would see 0 pips and the
  // curve would appear to RISE as the gauge first lands.
  const dmg0 = tw.sheet.get('damage');
  // Hold the fight open by hand (the sim runs no brains — aggro is ours
  // to stamp) and the taper starts spending.
  const burn = (sec: number): void => {
    for (let t = 0; t < sec; t += DT) { tw.aggroed = true; w.update(DT); }
  };
  burn(6);
  const mid = st().cur;
  check('wick: the fight burns it down with nothing else happening', mid < full && mid > 0, `${full} -> ${mid}`);

  const dmg1 = tw.sheet.get('damage');
  check('wick: the damage curve FALLS with the fuel (the gauge and the taper are one number)',
    dmg1 < dmg0, `${dmg0.toFixed(3)} -> ${dmg1.toFixed(3)}`);
  check('wick: the sheet reads INTEGER pips of what is left',
    Number.isInteger(st().pips) && st().pips === pipsOf(st().cur));

  // Burn it to the guttering band and confirm the stage lands + spent stamps.
  burn(22);
  check('wick: burned past its last quarter it wears the gutter stage',
    reserveFrac(st()) <= 0.25 && tw.statuses.some(s => s.id === 'guttered'),
    'frac=' + reserveFrac(st()).toFixed(3));
  burn(12);
  check('wick: the clock runs ONE way — it bottoms out and reads spent, never refilling',
    st().cur === 0 && tw.spent && st().ventUntil === 0);
  check('wick: a guttered wight is still alive (a burned-out clock is not a corpse)', !tw.dead);
}

// ===========================================================================
// 5) THE LEAKING — travel is the price
// ===========================================================================
{
  const w = makeSimWorld('warrior', 0x5be72);
  const sb = spawn(w, 'sapbleeder', 6);
  const st = () => sb.reserves!.get('sap')!;
  const full = st().cur;
  tick(w, 1.0); // settle the odometer anchor
  const parked = st().cur;
  tick(w, 3.0);
  check('leaking: a body standing still pays nothing (the trail IS the travel)',
    Math.abs(st().cur - parked) < 1e-6, `${parked} -> ${st().cur}`);

  // March it by hand — displacement is displacement, however it happened.
  // The chase holds the fight open (aggroed), which is what parks the
  // 'calm' regen: a leaker knits back only once it has genuinely lost you.
  const march = (frames: number): void => {
    for (let i = 0; i < frames; i++) { sb.aggroed = true; sb.pos.x += 6; w.update(DT); }
  };
  march(40);
  check('leaking: travel drains the reserve', st().cur < parked, `${parked} -> ${st().cur.toFixed(2)}`);
  const spec = MONSTERS.sapbleeder.reserves![0];
  const expected = full - 40 * 6 * spec.drainPerUnit!;
  check('leaking: the drain is exactly drainPerUnit × distance (the odometer banks every frame)',
    Math.abs(st().cur - expected) < 0.05,
    `${st().cur.toFixed(3)} vs ${expected.toFixed(3)}`);

  // THE CALM REGEN: still short, but the moment the chase is lost the
  // pool knits back — keeping it in sight is what starves it.
  const low = st().cur;
  sb.aggroed = false;
  tick(w, 2.5);
  check('leaking: losing the chase lets it knit back (regenWhile calm)',
    st().cur > low, `${low.toFixed(2)} -> ${st().cur.toFixed(2)}`);

  // Run it dry and confirm the catch.
  let sawWilt = false, sawSpent = false;
  for (let i = 0; i < 1500 && !(sawWilt && sawSpent); i++) {
    sb.aggroed = true; sb.pos.x += 6; w.update(DT);
    sawWilt ||= sb.statuses.some(s => s.id === 'wilted');
    sawSpent ||= sb.spent;
  }
  check('leaking: run dry it VENTS — the chase, not the burst, is the kill',
    sawWilt && sawSpent, 'cur=' + st().cur.toFixed(2));
}

// ===========================================================================
// 6) THE CLAIMER — plant, thrive, kill the heart, watch the floor recede
// ===========================================================================
{
  const w = makeSimWorld('warrior', 0x5be73);
  const mat = spawn(w, 'bloom_matron', 8);
  tick(w, 1.2);
  check('claimer: the heart plants its own membrane', !!w.creep && w.creep.sources.length > 0);
  const cover = () => w.creepCoverAt('sporebed', mat.pos.x, mat.pos.y);
  check('claimer: she stands on the floor she laid', cover() > 0);
  check('claimer: standing on her claim she WEARS it (rootedHeld + the sheet source)',
    mat.rootedHeld && mat.sheet.get('damageTaken') < 1,
    `held=${mat.rootedHeld} dt=${mat.sheet.get('damageTaken').toFixed(3)}`);

  // A court member on her mat gains; the same body off it does not.
  const kin = spawn(w, 'fungal_sporeling', 8);
  kin.pos.x = mat.pos.x; kin.pos.y = mat.pos.y;
  tick(w, 0.6);
  check('claimer: her court gains on her floor', kin.rootedHeld);
  const kinOn = kin.sheet.get('damageTaken');
  kin.pos.x = mat.pos.x + 4000;
  tick(w, ROOTED_CFG.grace + 0.5);
  check('claimer: carried clear of the mat the gain drops (and the court pays no wilt)',
    !kin.rootedHeld && kin.sheet.get('damageTaken') > kinOn
    && Math.abs(kin.sheet.get('damageTaken') - 1) < 1e-6,
    `on=${kinOn.toFixed(3)} off=${kin.sheet.get('damageTaken').toFixed(3)}`);

  // THE GRACE: a step off and straight back never flickers the sheet.
  const before = mat.rootedHeld;
  mat.pos.x += 4000; w.update(DT); w.update(DT);
  check('claimer: THE GRACE holds the claim across a brief step off (no sheet flicker)',
    mat.rootedHeld === before);
  mat.pos.x -= 4000;
  tick(w, 0.4);
  check('claimer: stepping back on is instant (the reward half never waits)', mat.rootedHeld);

  // THE LOOP: kill the heart and the floor recedes out from under the court.
  const coverBefore = cover();
  w.kill(mat, false);
  tick(w, 4);
  check('claimer: killing the heart RECEDES the floor',
    cover() < coverBefore * 0.5, `${coverBefore.toFixed(3)} -> ${cover().toFixed(3)}`);
}

// ===========================================================================
// 7) THE SLAYER AXES — armed only when armed
// ===========================================================================
{
  const w = makeSimWorld('warrior', 0x5be74);
  const hero = w.player;
  // Mitigation is STATEFUL (the poise skim spends the bar) — every read
  // gets a FRESH victim, so the A/B measures the stat and nothing else
  // (the probe_anatomy limbreaver idiom). No ticks in this section: no
  // sweep ever moves the flags we set by hand.
  const read = (id: string, arm?: (t: Actor) => void): number => {
    const t = spawn(w, id, 6);
    arm?.(t);
    return mitigateTyped(t, { physical: 100 }, { attacker: hero, tags: new Set(['attack']) });
  };

  const baseFl = read('fumelung');
  hero.sheet.setSource('probe_spentbane', [mod('spentbane', 'flat', 1)]);
  check('slayer: spentbane is INERT against a full body (exact — same rungs, no fold)',
    Math.abs(read('fumelung') - baseFl) < 1e-6);
  const armed = read('fumelung', t => { t.spent = true; });
  check('slayer: spentbane arms against a SPENT body at exactly (1 + v)',
    Math.abs(armed / baseFl - 2) < 1e-6, `ratio ${(armed / baseFl).toFixed(4)}`);
  hero.sheet.setSource('probe_spentbane', []);

  const baseMat = read('bloom_matron');
  hero.sheet.setSource('probe_uprooter', [mod('uprooter', 'flat', 1)]);
  check('slayer: uprooter is INERT while the body stands on its claim',
    Math.abs(read('bloom_matron', t => { t.rootedHeld = true; }) - baseMat) < 1e-6);
  check('slayer: uprooter arms at exactly (1 + v) once it is OFF its ground',
    Math.abs(read('bloom_matron', t => { t.rootedHeld = false; }) / baseMat - 2) < 1e-6);
  const basePlain = read('fen_hound');
  hero.sheet.setSource('probe_uprooter', []);
  hero.sheet.setSource('probe_uprooter2', [mod('uprooter', 'flat', 1)]);
  check('slayer: a body with NO claim can never read as uprooted (presence IS the gate)',
    MONSTERS.fen_hound.rooted === undefined
    && Math.abs(read('fen_hound') - basePlain) < 1e-6);
  hero.sheet.setSource('probe_uprooter2', []);
}

// ===========================================================================
// 8) THE VALIDATORS name real faults
// ===========================================================================
{
  const has = { skill: (id: string) => !!SKILLS[id], status: (id: string) => !!STATUS_DEFS[id] };
  const f = (rows: unknown): string[] =>
    validateReserves({ probe_bad: rows as never }, has);
  check('validate: names a pool that cannot pay its own cast',
    f({ reserves: [{ id: 'x', pool: 1, costs: { claw: 5 } }], tells: [{ source: 'reserve:x' }] })
      .some(m => m.includes('exceeds pool')));
  check('validate: names unknown skills and statuses',
    f({ reserves: [{ id: 'x', pool: 4, costs: { nope_skill: 1 }, stages: [{ status: 'nope_status' }] }], tells: [{ source: 'reserve:x' }] })
      .length >= 2);
  check('validate: names THE HIDDEN TIMER (a row that gates with no tell)',
    f({ reserves: [{ id: 'x', pool: 4, drain: 1 }] }).some(m => m.includes('hidden timer')));
  check('validate: an INERT row (no gate, no burn, no vent) is exempt from the honesty law',
    f({ reserves: [{ id: 'x', pool: 4 }] }).length === 0);
  check('validate: names a duplicate reserve id on one def',
    f({ reserves: [{ id: 'x', pool: 4 }, { id: 'x', pool: 2 }] }).some(m => m.includes('duplicate')));

  const rf = (rows: unknown): string[] =>
    validateRooted({ probe_bad: rows as never }, { creep: id => !!CREEPS[id], ground: id => REGION_SET.has(id) });
  check('validate: names a claim with no ground named',
    rf({ rooted: { mods: [{ stat: 'damage', kind: 'flat', value: 1 }] }, tells: [{ source: 'rooted' }] })
      .some(m => m.includes('names no claim')));
  check('validate: names a heart that plants a kind it does not claim',
    rf({
      rooted: { creep: ['caulflesh'], mods: [{ stat: 'damage', kind: 'flat', value: 1 }] },
      creepSource: { kind: 'sporebed' }, tells: [{ source: 'rooted' }],
    }).some(m => m.includes('does not claim')));
  check('validate: names ground-worn power with no tell',
    rf({ rooted: { creep: ['sporebed'], mods: [{ stat: 'damage', kind: 'flat', value: 1 }] } })
      .some(m => m.includes('cannot read the claim')));
}

// ===========================================================================
// 9) DETERMINISM — same seed, same burn
// ===========================================================================
{
  const run = (): string => {
    seedGlobalRandom(0x11cc);
    const w = makeSimWorld('warrior', 0x5be75);
    const fl = spawn(w, 'fumelung', 6);
    const tw = spawn(w, 'taperwight', 6);
    const sb = spawn(w, 'sapbleeder', 6);
    for (let i = 0; i < 600; i++) { sb.pos.x += 3; w.update(DT); }
    return [fl, tw, sb].map(a => [...a.reserves!.values()]
      .map(r => r.cur.toFixed(4) + ':' + r.pips + ':' + (a.spent ? 1 : 0)).join('/')).join('|');
  };
  const a = run(), b = run();
  check('determinism: the same seed burns byte-identically', a === b, a);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
