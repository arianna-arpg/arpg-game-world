// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PACK TEMPO (the alpha-strike discipline; the sibling of
// probe_chargegate's charge manners). Three data-dialed selection lanes
// (SkillPolicy.strike / .bands / .slack — brain.ts, folded in ai.ts pickSkill
// + chargeKernel), every one inert when absent:
//   THE DESYNC (strike.stagger): the 2nd+ body to freshly acquire one prey
//     inside packTempo.clusterWin rolls a hold before its BURST verbs fire —
//     a zone-entry pack spreads its charges instead of landing them as one
//     volley. Rig C (kernel), rig G2 (the pickSkill lane).
//   THE BUDGET (strike.inFlight): at most N burst verbs in flight against
//     one body — claims stamped dial-blind at every launch (kernel rushes,
//     dash/leap casts), swept as they expire. Rigs B (the planted 6-pack)
//     and G (the claim ledger itself).
//   RANGE BANDS (bands): the minRange step grown into a per-skill curve —
//     low near, peak mid, tapered far. Rig D (near < mid, the far taper
//     lives, and the un-banded control keeps full far weight).
//   CAST SLACK (slack): a rolled hold between a skill coming off cooldown
//     and the AI treating it castable — the warden's guard returns on a
//     human clock. Rig E (gap distributions, control on-cooldown-exact).
//   STUN TEMPERING (strike.stunWeight): a hard-CC'd (or freshly released)
//     prey reads stun-capable casts at a fraction of their weight — rare,
//     never refused. Rig F (collapse, the grace window, the undialed
//     control at full weight).
//   THE CENSUS (rig A): config shapes sane, the three debut wearers dialed
//     as authored, and NO other def in the registry carries a tempo dial —
//     the flat-zones law (absent == identical) at data grain.
// AI is CALLER-DRIVEN (updateAI per subject + w.update per frame — the
// chargegate idiom); subjects fight player-team POSTS with the hero parked
// out of acquisition range.
// Run: npx tsx balance/probe_packtempo.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { BEHAVIOR_CFG } from '../src/engine/brain';
import { burstClaimsLive, updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xFACE);

const DT = 1 / 60;

// --- A) THE CENSUS (before any probe def joins the registry) ----------------
{
  const cfg = BEHAVIOR_CFG.packTempo;
  check('census: packTempo config shapes are sane',
    cfg.clusterWin > 0 && cfg.claimSec > 0 && cfg.stunGraceSec > 0
    && cfg.deliveries.includes('dash') && cfg.deliveries.includes('leap')
    && cfg.stunStatuses.includes('stun'),
    `win ${cfg.clusterWin} claim ${cfg.claimSec} grace ${cfg.stunGraceSec}`);

  const wearers = Object.values(MONSTERS)
    .filter(m => {
      const su = m.brain?.skillUse;
      return !!(su?.strike || su?.bands || su?.slack);
    })
    .map(m => m.id).sort();
  check('census: EXACTLY the three debut wearers carry tempo dials (flat zones stay byte-identical)',
    wearers.join(',') === 'beastkin_gorer,gale_elemental,sylvan_warden',
    wearers.join(','));

  const gorer = MONSTERS.beastkin_gorer.brain?.skillUse;
  const gale = MONSTERS.gale_elemental.brain?.skillUse;
  const warden = MONSTERS.sylvan_warden.brain?.skillUse;
  const asc = (w?: [number, number]): boolean => !!w && w[0] >= 0 && w[1] > w[0];
  // The gorer's band curve keys its CARRIED rush — by kit membership, not a
  // hardcoded id (the charge-carry chip may rename the horn; the curve rides).
  const gorerBandRows = Object.entries(gorer?.bands ?? {})
    .filter(([sid]) => MONSTERS.beastkin_gorer.skills.includes(sid));
  check('census: the gorer wears all three strike lanes + a band curve on its carried rush',
    !!gorer?.strike && asc(gorer.strike.stagger)
    && (gorer.strike.inFlight ?? 0) >= 1
    && (gorer.strike.stunWeight ?? 0) > 0 && (gorer.strike.stunWeight ?? 1) < 1
    && gorerBandRows.length >= 1 && gorerBandRows.every(([, rows]) => rows.length >= 2),
    JSON.stringify(gorer?.strike));
  // No wearer's bands may name a skill its kit doesn't carry (a dead curve).
  const deadBands: string[] = [];
  for (const m of Object.values(MONSTERS)) {
    const bands = m.brain?.skillUse?.bands;
    if (!bands) continue;
    for (const sid of Object.keys(bands)) {
      if (!m.skills.includes(sid)) deadBands.push(`${m.id}:${sid}`);
    }
  }
  check('census: every band curve names a skill its wearer carries', deadBands.length === 0,
    deadBands.join(','));
  check('census: the gale names its clap a burst verb (burstSkills) + wears the stun temper',
    !!gale?.strike?.burstSkills?.includes('thunderclap')
    && (gale?.strike?.stunWeight ?? 0) > 0 && (gale?.strike?.stunWeight ?? 1) < 1
    && asc(gale?.strike?.stagger) && (gale?.bands?.thunderclap?.length ?? 0) >= 1,
    JSON.stringify(gale?.strike));
  check('census: the warden wears cast slack on its guard (the metronome complaint)',
    asc(warden?.slack?.shield_up) && asc(warden?.slack?.cleave),
    JSON.stringify(warden?.slack));

  // Band rows must ASCEND (bounded rows) and keep positive multipliers —
  // the fold reads the first matching row, so a shuffled curve would lie.
  const badBands: string[] = [];
  for (const m of Object.values(MONSTERS)) {
    const bands = m.brain?.skillUse?.bands;
    if (!bands) continue;
    for (const [sid, rows] of Object.entries(bands)) {
      let prev = -Infinity;
      for (const r of rows) {
        if (r.mul <= 0) badBands.push(`${m.id}:${sid} mul ${r.mul}`);
        if (r.to !== undefined) {
          if (r.to <= prev) badBands.push(`${m.id}:${sid} to ${r.to} out of order`);
          prev = r.to;
        }
      }
    }
  }
  check('census: every authored band curve ascends with positive multipliers',
    badBands.length === 0, badBands.join('; '));
}

// --- Probe bodies (registered AFTER the census — this process only) ---------
// Kernel chargers, PINNED (moveSpeed 0: a launched dash stands in place for
// its full window, so simultaneity is exactly countable); detection 3 covers
// the 280px stand. probe_pt_budget wears the budget alone (claimSec 1.3
// outlives the 1.2s pinned dash, so the cap is strict through the flight);
// probe_pt_stag wears the desync alone; probe_pt_kctrl wears nothing — the
// alpha-strike control.
MONSTERS.probe_pt_budget = {
  id: 'probe_pt_budget', name: 'Probe Budget', color: '#aa8855', shape: 'hexagon',
  radius: 14, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 30, manaRegen: 4 },
  skills: ['heavy_strike'], xp: 1, faction: 'beast', detection: 3,
  brain: {
    type: 'juggernaut', move: { style: 'charge', commitRange: 340, chargeSpeed: 2.4 },
    skillUse: { strike: { inFlight: 2, claimSec: 1.3 } },
  },
};
MONSTERS.probe_pt_stag = {
  id: 'probe_pt_stag', name: 'Probe Stagger', color: '#aa8855', shape: 'hexagon',
  radius: 14, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 30, manaRegen: 4 },
  skills: ['heavy_strike'], xp: 1, faction: 'beast', detection: 3,
  brain: {
    type: 'juggernaut', move: { style: 'charge', commitRange: 340, chargeSpeed: 2.4 },
    skillUse: { strike: { stagger: [0.4, 1.6] } },
  },
};
MONSTERS.probe_pt_kctrl = {
  id: 'probe_pt_kctrl', name: 'Probe Kernel Control', color: '#77aa88', shape: 'hexagon',
  radius: 14, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 30, manaRegen: 4 },
  skills: ['heavy_strike'], xp: 1, faction: 'beast', detection: 3,
  brain: {
    type: 'juggernaut', move: { style: 'charge', commitRange: 340, chargeSpeed: 2.4 },
  },
};
// The pick-lane pair: a banded kit vs its un-banded twin (charge + frostbolt,
// both usable across the whole tested span). The probe's own curve tapers
// far HARD (0.25) so the far-band divergence from the un-banded control is
// decisive at trial counts a fast probe can afford.
MONSTERS.probe_pt_band = {
  id: 'probe_pt_band', name: 'Probe Banded', color: '#8899cc', shape: 'octagon',
  radius: 14, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['charge', 'frostbolt'], xp: 1, faction: 'beast', detection: 3,
  brain: {
    type: 'basic',
    skillUse: {
      bands: { charge: [{ to: 140, mul: 0.15 }, { to: 300, mul: 1 }, { mul: 0.25 }] },
    },
  },
};
MONSTERS.probe_pt_bctrl = {
  id: 'probe_pt_bctrl', name: 'Probe Band Control', color: '#8899cc', shape: 'octagon',
  radius: 14, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['charge', 'frostbolt'], xp: 1, faction: 'beast', detection: 3,
  brain: { type: 'basic' },
};
// The slack pair: one cooldown skill, so inter-cast gaps read the readiness
// rhythm directly.
MONSTERS.probe_pt_slack = {
  id: 'probe_pt_slack', name: 'Probe Slack', color: '#cc99aa', shape: 'oval',
  radius: 12, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['thunderclap'], xp: 1, faction: 'beast', detection: 3,
  brain: { type: 'basic', skillUse: { slack: { thunderclap: [0.6, 1.4] } } },
};
MONSTERS.probe_pt_sctrl = {
  id: 'probe_pt_sctrl', name: 'Probe Slack Control', color: '#cc99aa', shape: 'oval',
  radius: 12, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['thunderclap'], xp: 1, faction: 'beast', detection: 3,
  brain: { type: 'basic' },
};
// The stun-temper pair: clap + claw at kiss range; the dialed mind reads a
// hard-CC'd prey and leans claw.
MONSTERS.probe_pt_stun = {
  id: 'probe_pt_stun', name: 'Probe Stun Temper', color: '#99ccaa', shape: 'oval',
  radius: 12, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['thunderclap', 'claw'], xp: 1, faction: 'beast', detection: 3,
  brain: { type: 'basic', skillUse: { strike: { stunWeight: 0.15 } } },
};
MONSTERS.probe_pt_nctrl = {
  id: 'probe_pt_nctrl', name: 'Probe Stun Control', color: '#99ccaa', shape: 'oval',
  radius: 12, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['thunderclap', 'claw'], xp: 1, faction: 'beast', detection: 3,
  brain: { type: 'basic' },
};
// The skill-lane charger (rig G/G2): the dash SKILL, no kernel.
MONSTERS.probe_pt_skl = {
  id: 'probe_pt_skl', name: 'Probe Skill Charger', color: '#ccaa77', shape: 'hexagon',
  radius: 14, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['charge'], xp: 1, faction: 'beast', detection: 3,
  brain: { type: 'basic' },
};
MONSTERS.probe_pt_sklstag = {
  id: 'probe_pt_sklstag', name: 'Probe Skill Stagger', color: '#ccaa77', shape: 'hexagon',
  radius: 14, base: { life: 400, moveSpeed: 0, accuracy: 100, mana: 200, manaRegen: 20 },
  skills: ['charge'], xp: 1, faction: 'beast', detection: 3,
  brain: { type: 'basic', skillUse: { strike: { stagger: [0.5, 1.2], burstSkills: ['charge'] } } },
};
// The standing prey.
MONSTERS.probe_pt_post = {
  id: 'probe_pt_post', name: 'Probe Post', color: '#8899aa', shape: 'circle',
  radius: 13, base: { life: 6000, moveSpeed: 0, accuracy: 100, mana: 0 },
  skills: ['heavy_strike'], xp: 1, faction: 'beast',
  brain: { type: 'basic' },
};

const w = makeSimWorld('warrior', 0xFACE1);
for (const a of w.actors) if (w.seatOf(a)) a.pos = vec(60, 60);
const C = vec(w.arena.w / 2, w.arena.h / 2);

const mkPost = (): Actor => {
  const p = w.createMonster('probe_pt_post', 6, 'player');
  p.pos = vec(C.x, C.y);
  w.actors.push(p);
  return p;
};
const despawn = (m: Actor): void => {
  const i = w.actors.indexOf(m);
  if (i >= 0) w.actors.splice(i, 1);
};
const spawnAt = (id: string, d: number): Actor => {
  const m = w.createMonster(id, 6, 'enemy');
  m.pos = vec(C.x + d, C.y);
  w.actors.push(m);
  return m;
};

// First skill the AI PICKS from a cold spawn at distance d ('' = none yet).
const firstPick = (id: string, d: number, post: Actor, frames = 120): string => {
  post.pos = vec(C.x, C.y);
  post.life = post.maxLife();
  const m = spawnAt(id, d);
  let picked = '';
  for (let f = 0; f < frames && !picked; f++) {
    updateAI(m, w, DT);
    w.update(DT);
    picked = m.aiLastSkill?.id ?? '';
  }
  despawn(m);
  return picked;
};

// Spawn a ring of kernel chargers and drive them; returns per-body first
// launch times + the max simultaneous dash count + total launches.
const packRun = (id: string, n: number, seconds: number):
  { firsts: number[]; maxSim: number; launches: number } => {
  const post = mkPost();
  const pack: Actor[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const m = w.createMonster(id, 6, 'enemy');
    m.pos = vec(C.x + Math.cos(ang) * 280, C.y + Math.sin(ang) * 280);
    w.actors.push(m);
    pack.push(m);
  }
  const firsts = new Array<number>(n).fill(-1);
  const wasDash = new Array<boolean>(n).fill(false);
  let maxSim = 0, launches = 0;
  for (let f = 0; f < seconds * 60; f++) {
    for (const m of pack) updateAI(m, w, DT);
    w.update(DT);
    let sim = 0;
    for (let i = 0; i < n; i++) {
      const dashing = !!pack[i].dash;
      if (dashing) sim++;
      if (dashing && !wasDash[i]) {
        launches++;
        if (firsts[i] < 0) firsts[i] = f * DT;
      }
      wasDash[i] = dashing;
      // Hold the ring: pinned bodies never travel, but the dash overshoot
      // math is position-fed — keep the geometry exact.
      const ang = (i / n) * Math.PI * 2;
      pack[i].pos = vec(C.x + Math.cos(ang) * 280, C.y + Math.sin(ang) * 280);
    }
    maxSim = Math.max(maxSim, sim);
    post.pos = vec(C.x, C.y);
    post.life = post.maxLife();
  }
  for (const m of pack) despawn(m);
  despawn(post);
  return { firsts, maxSim, launches };
};

// --- B) THE BUDGET LAW: a planted 6-pack keeps ≤ N charges in flight --------
{
  const ctrl = packRun('probe_pt_kctrl', 6, 12);
  check('budget: the UNDIALED 6-pack alpha-strikes (≥ 4 simultaneous charges — the Rhoa moment reproduced)',
    ctrl.maxSim >= 4, `maxSim ${ctrl.maxSim}, launches ${ctrl.launches}`);
  const bud = packRun('probe_pt_budget', 6, 12);
  check('budget: the DIALED 6-pack never exceeds inFlight 2 against one body',
    bud.maxSim <= 2 && bud.maxSim >= 1, `maxSim ${bud.maxSim}`);
  check('budget: charges still FLOW as claims expire (≥ 4 launches over 12s — a cap, never a ban)',
    bud.launches >= 4, `${bud.launches} launches`);
}

// --- C) THE DESYNC: clustered acquisition spreads the kernel volley ---------
{
  const ctrl = packRun('probe_pt_kctrl', 6, 6);
  const cFirsts = ctrl.firsts.filter(t => t >= 0);
  const cSpread = Math.max(...cFirsts) - Math.min(...cFirsts);
  check('desync: the undialed pack launches as ONE volley (first-launch spread < 0.05s)',
    cFirsts.length === 6 && cSpread < 0.05, `spread ${cSpread.toFixed(3)}s`);
  const stag = packRun('probe_pt_stag', 6, 6);
  const sFirsts = stag.firsts.filter(t => t >= 0);
  const sSpread = Math.max(...sFirsts) - Math.min(...sFirsts);
  const distinct = new Set(sFirsts.map(t => Math.round(t * 60))).size;
  check('desync: the staggered pack SPREADS its volley (all 6 launch; spread ≥ 0.3s; ≥ 3 distinct beats)',
    sFirsts.length === 6 && sSpread >= 0.3 && distinct >= 3,
    `spread ${sSpread.toFixed(2)}s, ${distinct} beats`);
  check('desync: the first acquirer keeps its clean opening (min first-launch < 0.1s)',
    Math.min(...sFirsts) < 0.1, `min ${Math.min(...sFirsts).toFixed(3)}s`);
}

// --- D) RANGE BANDS: near collapses, mid peaks, the far taper lives ---------
{
  const share = (id: string, d: number, trials: number): number => {
    const post = mkPost();
    let charges = 0, none = 0;
    for (let i = 0; i < trials; i++) {
      const p = firstPick(id, d, post);
      if (p === 'charge') charges++;
      else if (p === '') none++;
    }
    despawn(post);
    if (none > 0) check(`bands: no-pick at d=${d} for ${id}`, false, `${none} empty`);
    return charges / trials;
  };
  const near = share('probe_pt_band', 50, 200);
  const mid = share('probe_pt_band', 220, 200);
  const far = share('probe_pt_band', 340, 200);
  const ctrlFar = share('probe_pt_bctrl', 340, 200);
  check('bands: near-band charge frequency sits measurably BELOW mid-band (the commission)',
    near < 0.25 && mid > 0.38, `near ${(near * 100).toFixed(0)}% mid ${(mid * 100).toFixed(0)}%`);
  check('bands: the far taper lives (far share below mid — the overshoot is a choice, not the habit)',
    far < mid - 0.08, `far ${(far * 100).toFixed(0)}%`);
  check('bands: the un-banded twin keeps FULL far weight (absent == identical past the legacy step)',
    ctrlFar > 0.38 && ctrlFar > far + 0.08,
    `control far ${(ctrlFar * 100).toFixed(0)}% vs banded ${(far * 100).toFixed(0)}%`);
}

// --- E) CAST SLACK: readiness gets a human beat, control stays a metronome --
{
  const gaps = (id: string, seconds: number): number[] => {
    const post = mkPost();
    const m = spawnAt(id, 60);
    const casts: number[] = [];
    let lastAt = -1;
    for (let f = 0; f < seconds * 60; f++) {
      updateAI(m, w, DT);
      w.update(DT);
      const at = m.aiLastSkill?.at ?? -1;
      if (at >= 0 && at !== lastAt) { casts.push(at); lastAt = at; }
      m.pos = vec(C.x + 60, C.y);
      post.pos = vec(C.x, C.y);
      post.life = post.maxLife();
    }
    despawn(m); despawn(post);
    const out: number[] = [];
    for (let i = 1; i < casts.length; i++) out.push(casts[i] - casts[i - 1]);
    return out;
  };
  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const cg = gaps('probe_pt_sctrl', 60);
  const sg = gaps('probe_pt_slack', 60);
  check('slack: the control drums on-cooldown-exact (min gap ≈ the 3s cooldown)',
    cg.length >= 8 && Math.min(...cg) < 3.45, `${cg.length} gaps, min ${Math.min(...cg).toFixed(2)}s`);
  check('slack: every dialed gap waits out the rolled hold (min ≥ cooldown + slack floor − a beat)',
    sg.length >= 6 && Math.min(...sg) >= 3.45, `${sg.length} gaps, min ${Math.min(...sg).toFixed(2)}s`);
  check('slack: the dialed rhythm drifts later on average (mean shift ≥ 0.4s — spread, not schedule)',
    mean(sg) - mean(cg) >= 0.4,
    `control ${mean(cg).toFixed(2)}s → slack ${mean(sg).toFixed(2)}s`);
}

// --- F) STUN TEMPERING: a bound prey tempers the clap; the grace holds ------
{
  // FRESH post per trial: the subject's own clap can stun the post (30%),
  // and a shared post would smuggle that CC into the next trial's read —
  // the calm batch must actually be calm.
  const share = (id: string, prep: (post: Actor) => void, trials: number): number => {
    let claps = 0;
    for (let i = 0; i < trials; i++) {
      const post = mkPost();
      prep(post);
      const p = firstPick(id, 45, post);
      if (p === 'thunderclap') claps++;
      despawn(post);
    }
    return claps / trials;
  };
  const freshly = (post: Actor): void => { post.aiStunSeenAt = w.time; };
  const calm = share('probe_pt_stun', () => {}, 150);
  const bound = share('probe_pt_stun', p => p.applyStatus('stun', 0, 4, 'probe'), 150);
  const grace = share('probe_pt_stun', freshly, 150);
  const ctrlBound = share('probe_pt_nctrl', p => p.applyStatus('stun', 0, 4, 'probe'), 150);
  check('stun: a calm prey reads the clap at full weight', calm > 0.38,
    `${(calm * 100).toFixed(0)}%`);
  check('stun: a HARD-CC\'d prey collapses the clap share (tempered, never refused)',
    bound < 0.25 && bound > 0, `${(bound * 100).toFixed(0)}%`);
  check('stun: the freshly-un-stunned grace holds the temper (observer stamp inside the window)',
    grace < 0.25, `${(grace * 100).toFixed(0)}%`);
  check('stun: the UNDIALED twin claps a bound prey at full weight (absent == identical)',
    ctrlBound > 0.38, `${(ctrlBound * 100).toFixed(0)}%`);
  // The observer stamp WRITES: after a dialed pick against a live stun, the
  // prey carries aiStunSeenAt (the grace clock's anchor).
  const post = mkPost();
  post.applyStatus('stun', 0, 4, 'probe');
  post.aiStunSeenAt = -1;
  firstPick('probe_pt_stun', 45, post);
  check('stun: the pick stamps the prey\'s aiStunSeenAt (drawn == tested for the grace read)',
    post.aiStunSeenAt >= 0, `${post.aiStunSeenAt.toFixed(2)}`);
  despawn(post);
}

// --- G) The claim ledger: dash SKILL casts claim, and claims expire ---------
{
  const post = mkPost();
  const m = spawnAt('probe_pt_skl', 200);
  let castAt = -1;
  for (let f = 0; f < 240 && castAt < 0; f++) {
    updateAI(m, w, DT);
    w.update(DT);
    if (m.aiLastSkill?.id === 'charge') castAt = w.time;
    post.pos = vec(C.x, C.y); post.life = post.maxLife();
  }
  check('claims: a dash SKILL cast stamps the prey\'s in-flight ledger (dial-blind)',
    castAt >= 0 && burstClaimsLive(post, w.time) >= 1,
    `live ${burstClaimsLive(post, w.time)}`);
  despawn(m);
  for (let f = 0; f < Math.ceil((BEHAVIOR_CFG.packTempo.claimSec + 0.2) * 60); f++) w.update(DT);
  check('claims: the ledger DRAINS as claims expire (no immortal budget)',
    burstClaimsLive(post, w.time) === 0, `live ${burstClaimsLive(post, w.time)}`);
  despawn(post);
}

// --- G2) The pick-lane desync: a clustered 2nd acquirer holds its burst -----
{
  const run = (id: string): [number, number] => {
    const post = mkPost();
    const a = spawnAt(id, 200);
    const b = spawnAt(id, -200);
    let aAt = -1, bAt = -1;
    for (let f = 0; f < 300 && (aAt < 0 || bAt < 0); f++) {
      updateAI(a, w, DT); updateAI(b, w, DT);
      w.update(DT);
      if (aAt < 0 && a.aiLastSkill?.id === 'charge') aAt = f * DT;
      if (bAt < 0 && b.aiLastSkill?.id === 'charge') bAt = f * DT;
      post.pos = vec(C.x, C.y); post.life = post.maxLife();
    }
    despawn(a); despawn(b); despawn(post);
    return [aAt, bAt];
  };
  const [ca, cb] = run('probe_pt_skl');
  check('pick desync: the undialed pair casts its charges in the same breath',
    ca >= 0 && cb >= 0 && Math.abs(cb - ca) < 0.25, `Δ ${(cb - ca).toFixed(2)}s`);
  const [sa, sb] = run('probe_pt_sklstag');
  const later = Math.max(sa, sb), earlier = Math.min(sa, sb);
  check('pick desync: the staggered pair\'s SECOND body waits out its rolled hold (Δ ≥ 0.4s; both still fire)',
    sa >= 0 && sb >= 0 && later - earlier >= 0.4 && earlier < 0.3,
    `Δ ${(later - earlier).toFixed(2)}s, first ${earlier.toFixed(2)}s`);
}

console.log(failed ? `PROBE FAIL (${failed})` : 'PROBE OK');
process.exit(failed ? 1 : 0);
