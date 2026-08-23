// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SKILL-MODE TREES, M1 (docs/design/skill-modes.md §3/§8:
// the tree fabric). Pins, in order:
//   A. THE AUTHORED ROW + THE GRAMMAR CENSUS: wild_strike carries the full
//      exemplar (2 branches × 3 rungs + the neutral — the exact-cover law
//      P = D + N), rung 1 keeps M0's measured payloads, and EVERY def
//      wearing a tree validates: the exact-cover grammar, unique node ids,
//      `over` on the audited whitelist (arcDeg/spreadDeg/channel.ramp/
//      channel.rampMove), node mods naming real stats, grafts naming live
//      supports. A stray M2 row fails here, never in a player's face.
//   B. THE LEVEL SEAL + THE FIELD DISCIPLINE: spends refuse below the
//      milestone, land in sanctuary (the workshop law), and refuse under
//      hot blood in the field through the standing swapRefusal words.
//   C. THE HARD LOCK + THE SPEND LAW: one point per node against the
//      bandPointsAt budget; the FIRST point into a branch SEALS the rival
//      (refusal words name the sealed path); the neutral is lock-exempt;
//      rungs chain in order; at cap the exact cover completes (3 + 1) and
//      nothing further spends. Refusals never mutate; hostile intents no-op.
//   D. THE RESOLVED VIEW REACHES THE CAST PATH (drawn == tested): delivery/
//      aim folds (M0's pins), the CHANNEL lane (instanceChannel folds
//      ramp/rampMove; unpicked returns the def's object BY REFERENCE), the
//      MODS lane (instanceInnateMods carries node mods into every sheet
//      read), and live episodes: the Long Point's held damage RAMPS where
//      the rampless branch stays flat, the Monsoon's held stride FREES
//      where the base drags, and M0's sector/arc geometry still measures
//      true under the real engine.
//   E. PERSISTENCE + THE M0 FOLD: multi-node spends survive the real
//      serializeCharacter → rebuildSkill round trip; an M0-era single-pick
//      row loads as a 1-point spend (costless by construction); orphans,
//      rival-branch picks, broken rung chains and over-budget tails drop
//      with console notes through the ONE validation seam.
//   F. THE TRANSPARENCY LAW: the full tree authored but UNPICKED is
//      byte-identical to the tree field deleted — same-seed fingerprints.
//   G. UNLEARN/RELEARN RETENTION: the instance travels whole to the bag
//      and back — spent points intact (the attunedForm idiom, now pinned).
//   H. THE MONSTER PIN CAPABILITY: a MonsterDef.skillTrees pin mints kit
//      instances with spent nodes, resolved through the views — the
//      telegraph's instanceDelivery fold shows the pinned arc (drawn ==
//      tested for enemy wedges). Capability only: the stamp is probe-local.
//   I. THE MILESTONE POPUP DISCIPLINE: a band completion banks a pip; the
//      popup request fires ONLY at the disciplined calm — never mid-combat.
//   J. THE GRAFT LANE: a node's graft injects at recalcSeat (socket-free,
//      derived, no-second-copy), and an unknown support grants silence.
//   K. THE CO-OP WIRE: treeNodes ride SkillInstW (tn) through the real
//      serializeSeatMeta → applySeatMeta round trip; hostile tn sanitizes.
//   L. THE CENSUS BRANCH AXIS: compatCensus enumerates `skill@branch`
//      terminal hosts (exactly two per moded skill), hostTreeNodes answers
//      the exact-cover allocation, parseHostId round-trips.
// Run: npx tsx balance/probe_skillmodes.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_CFG } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { seedGlobalRandom } from '../src/sim/rng';
import { starterBuild } from '../src/sim/data/builds';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { SUPPORTS } from '../src/data/supports';
import { START_ZONE } from '../src/data/zones';
import { STAT_DEFS } from '../src/engine/stats';
import {
  bandPointsAt, instanceAim, instanceChannel, instanceDelivery, instanceMods,
  skillContextTags, SKILL_LEVEL_BANDS, treeNodeOf, treeNodeRefusal,
  treePickOpen, treePointsSpent, treeSpentBranch, validTreeNodes,
  type SkillTreeSpec,
} from '../src/engine/skills';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
import { serializeSeatMeta, applySeatMeta } from '../src/net/snapshot';
import { compatCensus, hostIdOf, hostTreeNodes, ledgerSkillIds, parseHostId } from '../src/sim/compat';
import { emptyLedger, reconcileLedger } from '../src/sim/ledger';
import { setSimTap } from '../src/engine/tap';
import { updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';
import type { MetaAction, PlayerInput } from '../src/net/intent';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x50de);

const SPRINKLER = ['ws_sprinkler', 'ws_cloudburst', 'ws_monsoon'];
const DUELIST = ['ws_duelist', 'ws_firm_wrist', 'ws_long_point'];
const NEUTRAL = 'ws_economy';

// ------------------------------------------------- A. THE AUTHORED ROW ----
const WS = SKILLS.wild_strike;
const tree = WS.tree as SkillTreeSpec | undefined;
check('A: wild_strike carries the M1 exemplar tree', !!tree);
check('A: the pick opens at level 5 (the settled milestone)', tree?.level === 5);
check('A: two branches × three rungs + the neutral (the exact cover)',
  tree?.branches.length === 2
  && tree?.branches.every(b => b.rungs.length === SKILL_LEVEL_BANDS.length - 1)
  && tree?.neutral?.id === NEUTRAL);
const sprinkler = treeNodeOf(WS, 'ws_sprinkler');
const duelist = treeNodeOf(WS, 'ws_duelist');
check('A: rung 1 keeps the MEASURED identity payloads (30/130 vs 16/24)',
  sprinkler?.over?.arcDeg === 30 && sprinkler?.over?.spreadDeg === 130
  && duelist?.over?.arcDeg === 16 && duelist?.over?.spreadDeg === 24);
check('A: the deepening rungs RE-PIN their identity (the re-pin law)',
  DUELIST.every(id => treeNodeOf(WS, id)?.over?.arcDeg === 16)
  && SPRINKLER.every(id => treeNodeOf(WS, id)?.over?.arcDeg === 30));

// The grammar census: every tree-wearing def, hard-pinned (boot validation
// warns; this gate FAILS).
const OVER_KEYS = new Set(['arcDeg', 'spreadDeg', 'channel']);
const OVER_CHANNEL_KEYS = new Set(['ramp', 'rampMove']);
let censusBad = '';
let treeWearers = 0;
for (const def of Object.values(SKILLS)) {
  const t = def.tree;
  if (!t) continue;
  treeWearers++;
  if (t.level < 1) censusBad += ` ${def.id}:level<1`;
  if (t.branches.length !== 2) censusBad += ` ${def.id}:branches!=2`;
  if (!t.neutral) censusBad += ` ${def.id}:no-neutral`;
  const seen = new Set<string>();
  const all = [...t.branches.flatMap(b => b.rungs.map(n => ({ n, at: b.id }))),
    ...(t.neutral ? [{ n: t.neutral, at: 'neutral' }] : [])];
  for (const b of t.branches) {
    if (b.rungs.length !== SKILL_LEVEL_BANDS.length - 1) censusBad += ` ${def.id}/${b.id}:rungs!=${SKILL_LEVEL_BANDS.length - 1}`;
  }
  for (const { n, at } of all) {
    if (seen.has(n.id)) censusBad += ` ${def.id}/${n.id}:dup-node-id`;
    seen.add(n.id);
    for (const k of Object.keys(n.over ?? {})) {
      if (!OVER_KEYS.has(k)) censusBad += ` ${def.id}/${n.id}:over.${k}-off-whitelist`;
    }
    for (const k of Object.keys(n.over?.channel ?? {})) {
      if (!OVER_CHANNEL_KEYS.has(k)) censusBad += ` ${def.id}/${n.id}:over.channel.${k}-off-whitelist`;
    }
    for (const m of n.mods ?? []) {
      if (!STAT_DEFS[m.stat]) censusBad += ` ${def.id}/${n.id}:mod-stat-${m.stat}-unknown`;
    }
    if (n.graft && !SUPPORTS[n.graft.support]) censusBad += ` ${def.id}/${n.id}:graft-${n.graft.support}-unknown`;
    void at;
  }
}
check('A: the tree census — every wearer on the exact-cover grammar, whitelist clean',
  censusBad === '', censusBad || `${treeWearers} wearer(s)`);

// ------------------------- B. THE LEVEL SEAL + THE FIELD DISCIPLINE -------
const w: World = makeSimWorld('swashbuckler', 0x5eed);
const seat = w.localSeat;
const build = starterBuild('swashbuckler', 4); // gem level 2 — below the milestone
build.bar = ['wild_strike'];
const warns = applyBuild(w, build, 0x9ea7);
if (warns.length) console.log('  build warnings:', warns.join(' | '));
const inst = seat.meta.knownSkills.get('wild_strike')!;
const pick = (nodeId: string): void =>
  w.applyAction(seat, { t: 'pickTreeNode', skillId: 'wild_strike', nodeId });

check('B: the sim arena is sanctuary ground', w.zone.objective?.kind === 'safe');
check('B: below the milestone the row is sealed', !treePickOpen(inst) && inst.level < 5);
pick('ws_duelist');
check('B: a sealed spend refuses — state untouched', inst.treeNodes === undefined);
check('B: the refusal speaks the milestone', treeNodeRefusal(inst, 'ws_duelist') === 'the path opens at level 5');
inst.level = 5;
check('B: at level 5 the row opens with ONE point', treePickOpen(inst) && bandPointsAt(inst.level) === 1);
pick('ws_duelist');
check('B: the spend lands in sanctuary (the workshop law)',
  inst.treeNodes?.length === 1 && inst.treeNodes[0] === 'ws_duelist');
check('B: the bar instance IS the book instance (the spend reaches the cast path)',
  seat.actor.skills.some(s => s === inst));

// ------------------------ C. THE HARD LOCK + THE SPEND LAW ----------------
check('C: the branch is DERIVED from spent nodes', treeSpentBranch(inst)?.id === 'duelist');
pick('ws_sprinkler');
check('C: THE HARD LOCK — the rival branch refuses, state untouched',
  inst.treeNodes?.length === 1 && inst.treeNodes[0] === 'ws_duelist');
check('C: the lock speaks the sealed path\'s own name',
  treeNodeRefusal(inst, 'ws_sprinkler') === "The Sprinkler's path is sealed");
pick('ws_long_point');
check('C: the rung chain — rung 3 before rung 2 refuses',
  inst.treeNodes?.length === 1
  && treeNodeRefusal(inst, 'ws_long_point') === 'The Firm Wrist comes first');
pick('ws_firm_wrist');
check('C: one point at level 5 — the second spend refuses on the budget',
  inst.treeNodes?.length === 1
  && treeNodeRefusal(inst, 'ws_firm_wrist') === 'no Ability point free — the next comes at level 10');
check('C: the neutral is lock-exempt but still budget-bound',
  treeNodeRefusal(inst, NEUTRAL) === 'no Ability point free — the next comes at level 10');
inst.level = 10;
pick(NEUTRAL);
check('C: at level 10 the neutral lands beside the committed branch (2/2 spent)',
  inst.treeNodes?.length === 2 && inst.treeNodes[1] === NEUTRAL
  && treeSpentBranch(inst)?.id === 'duelist');
inst.level = 20;
pick('ws_firm_wrist');
pick('ws_long_point');
check('C: the exact cover completes at cap — the walked branch + the neutral',
  inst.treeNodes?.length === 4 && treePointsSpent(inst) === bandPointsAt(20));
check('C: at the cover every remaining node is sealed or spent',
  treeNodeRefusal(inst, 'ws_sprinkler') === "The Sprinkler's path is sealed"
  && treeNodeRefusal(inst, 'ws_cloudburst') === "The Sprinkler's path is sealed");
pick('ws_duelist');
check('C: a re-spend of a walked node no-ops', inst.treeNodes?.length === 4);
pick('no_such_node');
w.applyAction(seat, { t: 'pickTreeNode', skillId: 'wild_strike' } as unknown as MetaAction);
w.applyAction(seat, { t: 'pickTreeNode', skillId: 7, nodeId: 'ws_duelist' } as unknown as MetaAction);
w.applyAction(seat, { t: 'pickTreeNode', skillId: 'no_such_skill', nodeId: 'ws_duelist' } as unknown as MetaAction);
check('C: bogus/malformed/hostile intents no-op through the validator',
  inst.treeNodes?.length === 4);

// Into the field: the discipline bites the FIRST spend where sanctuary
// doesn't waive it (the hard lock means there is no re-pick to gate).
const field = Object.values(w.zoneMap).find(z =>
  z.id !== START_ZONE && !z.boundless && z.objective?.kind !== 'safe');
check('B: the chart offers unsafe ground', !!field, field?.id ?? 'none');
w.loadZone(field!.id);
for (const a of w.actors) if (a.team === 'enemy') a.dead = true;
inst.treeNodes = undefined; // a fresh tree for the field test
w.lastCombatAt = w.time; // hot blood
pick('ws_duelist');
check('B: hot blood refuses the first spend, in the standing words',
  inst.treeNodes === undefined
  && w.swapRefusal(seat, 'socket') === 'the blood is still hot');
w.time += 30; // the calm returns
pick('ws_duelist');
{
  // (a fresh read — tsc narrowed treeNodes to undefined through the
  // opaque applyAction mutation above)
  const now = seat.meta.knownSkills.get('wild_strike')!.treeNodes;
  check('B: the calm re-opens the hands — the spend lands',
    now?.length === 1 && now[0] === 'ws_duelist');
}

// ------------------------------- D. THE RESOLVED VIEW ---------------------
inst.treeNodes = ['ws_duelist'];
check('D: picked, instanceDelivery folds the arc (duelist 16)',
  (instanceDelivery(inst) as { arcDeg?: number }).arcDeg === 16);
check('D: picked, instanceAim folds the sector (duelist 24)',
  instanceAim(inst)?.random?.spreadDeg === 24);
inst.treeNodes = undefined;
check('D: UNPICKED, the resolvers return the def\'s own objects BY REFERENCE',
  instanceDelivery(inst) === WS.delivery && instanceAim(inst) === WS.aim
  && instanceChannel(inst) === WS.channel);
inst.treeNodes = [...DUELIST];
check('D: the Long Point folds a damage ramp into the resolved channel',
  instanceChannel(inst)?.ramp?.per === 0.06 && WS.channel?.ramp === undefined);
inst.treeNodes = [...SPRINKLER];
check('D: the Monsoon folds a stride ramp into the resolved channel',
  instanceChannel(inst)?.rampMove?.per === 0.08 && WS.channel?.rampMove === undefined);

// THE MODS LANE: node mods reach every sheet read via instanceInnateMods.
const tags = skillContextTags(WS);
const sheetOf = (stat: string): number =>
  seat.actor.sheet.get(stat, tags, instanceMods(inst));
inst.treeNodes = undefined;
const baseAtk = sheetOf('attackSpeed');
const baseCrit = sheetOf('critChance');
const baseMob = sheetOf('channelMobility');
inst.treeNodes = ['ws_sprinkler', 'ws_cloudburst'];
check('D: the Cloudburst\'s attackSpeed mod reaches the sheet (+0.12 on the increased lane)',
  Math.abs(sheetOf('attackSpeed') - baseAtk - 0.12) < 0.001,
  `${baseAtk.toFixed(3)} → ${sheetOf('attackSpeed').toFixed(3)}`);
inst.treeNodes = ['ws_duelist', 'ws_firm_wrist'];
check('D: the Firm Wrist\'s critChance mod reaches the sheet (+7% flat)',
  Math.abs(sheetOf('critChance') - baseCrit - 0.07) < 0.001,
  `${baseCrit.toFixed(3)} → ${sheetOf('critChance').toFixed(3)}`);
inst.treeNodes = [NEUTRAL];
check('D: the neutral\'s channelMobility mod reaches the sheet (+0.15 flat)',
  Math.abs(sheetOf('channelMobility') - baseMob - 0.15) < 0.001);
inst.treeNodes = undefined;

// The cast path itself: rolled bearings + victims through the REAL engine
// (M0's geometry pins — rung 1 alone, the identity payloads).
function castEpisode(nodes: string[] | undefined, seed: number, opts?: {
  moveX?: boolean; seconds?: number;
}): {
  maxAbsBearingDeg: number; victims: number; casts: number;
  earlyHit: number; lateHit: number; earlyDx: number; lateDx: number;
} {
  const restore = seedGlobalRandom(seed);
  try {
    const ww = makeSimWorld('swashbuckler', seed);
    const b = starterBuild('swashbuckler', 20);
    b.bar = ['wild_strike'];
    if (nodes) {
      b.skills = b.skills.map(s => s.id === 'wild_strike' ? { ...s, treeNodes: [...nodes] } : s);
    }
    applyBuild(ww, b, 0x9ea7);
    const st = ww.localSeat;
    const p = ww.player;
    const slot = p.skills.findIndex(s => s?.def.id === 'wild_strike');
    const gap = 70;
    const victims = new Set<number>();
    const seconds = opts?.seconds ?? 20;
    for (const bDeg of [0, -25, 25, -50, 50]) {
      const ang = bDeg * Math.PI / 180;
      const d = ww.createMonster('target_dummy', 1, 'enemy');
      d.pos = vec(p.pos.x + Math.cos(ang) * gap, p.pos.y + Math.sin(ang) * gap);
      ww.actors.push(d);
    }
    let casts = 0, frameCasts = 0, maxAbs = 0;
    let earlyHit = 0, earlyN = 0, lateHit = 0, lateN = 0;
    let t = 0;
    setSimTap({
      onCast: (caster, i2) => {
        if (caster === p && i2.def.id === 'wild_strike') { casts++; frameCasts++; }
      },
      onHit: (attacker, target, result) => {
        if (attacker !== p || target === p || result.evaded || result.immune) return;
        victims.add(target.id);
        if (t >= 1 && t <= 5) { earlyHit += result.total; earlyN++; }
        if (t >= seconds - 6 && t <= seconds) { lateHit += result.total; lateN++; }
      },
    });
    const dt = SIM_CFG.dt;
    const held = new Array(8).fill(false); held[slot] = true;
    const edge = new Array(8).fill(false);
    // Stride windows accumulate per-tick |displacement| over RANGES (no
    // exact-tick float matching): early = [0.5, 3.5), late = the last 3s.
    // The walk PING-PONGS every 2s so the arena wall never clamps a window
    // (a one-way run hits the east wall at ~785px and reads zero late).
    let earlyDx = 0, lateDx = 0;
    for (let tick = 0; tick < Math.round(seconds / dt); tick++) {
      t = tick * dt;
      frameCasts = 0;
      const prevX = p.pos.x;
      const aimAt = vec(p.pos.x + gap, p.pos.y);
      const dir = Math.floor(t / 2) % 2 === 0 ? 1 : -1;
      const intent: PlayerInput = {
        dx: opts?.moveX ? dir : 0, dy: 0, aim: aimAt, held, edge,
      };
      const inputs = new Map<string, PlayerInput>();
      inputs.set(st.id, intent);
      ww.applyInputs(inputs, dt);
      for (const a of ww.actors) updateAI(a, ww, dt);
      ww.update(dt);
      const step = Math.abs(p.pos.x - prevX);
      if (t >= 0.5 && t < 3.5) earlyDx += step;
      if (t >= seconds - 3.5 && t < seconds - 0.5) lateDx += step;
      if (frameCasts > 0 && !opts?.moveX) {
        const baseAng = Math.atan2(aimAt.y - p.pos.y, aimAt.x - p.pos.x);
        let rel = (p.facing - baseAng) % (Math.PI * 2);
        if (rel > Math.PI) rel -= Math.PI * 2;
        if (rel < -Math.PI) rel += Math.PI * 2;
        maxAbs = Math.max(maxAbs, Math.abs(rel) * 180 / Math.PI);
      }
    }
    setSimTap(null);
    return {
      maxAbsBearingDeg: maxAbs, victims: victims.size, casts,
      earlyHit: earlyN ? earlyHit / earlyN : 0, lateHit: lateN ? lateHit / lateN : 0,
      earlyDx, lateDx,
    };
  } finally {
    setSimTap(null);
    restore();
  }
}

const dueEp = castEpisode(['ws_duelist'], 0xd0e1);
check('D: the duelist\'s rolled bearings live inside its 24° sector',
  dueEp.casts > 60 && dueEp.maxAbsBearingDeg <= 12.5,
  `casts ${dueEp.casts}, max |bearing| ${dueEp.maxAbsBearingDeg.toFixed(1)}°`);
check('D: the duelist touches ONLY the dead-ahead body (arc 16 through the real cone test)',
  dueEp.victims === 1, `victims ${dueEp.victims}`);
const sprEp = castEpisode(['ws_sprinkler'], 0xd0e2);
check('D: the sprinkler\'s wander rolls beyond 50° (the 130° sector is live)',
  sprEp.casts > 60 && sprEp.maxAbsBearingDeg > 50,
  `casts ${sprEp.casts}, max |bearing| ${sprEp.maxAbsBearingDeg.toFixed(1)}°`);
check('D: the sprinkler rains on the whole ring (5/5 victims)',
  sprEp.victims === 5, `victims ${sprEp.victims}`);
const baseEp = castEpisode(undefined, 0xd0e3);
check('D: unpicked, the wander honors the base 90° sector (no roll past 45°)',
  baseEp.casts > 60 && baseEp.maxAbsBearingDeg <= 45.5,
  `casts ${baseEp.casts}, max |bearing| ${baseEp.maxAbsBearingDeg.toFixed(1)}°`);

// THE RAMP EPISODE: the Long Point's held line bites deeper late in the
// hold; the rampless rung-2 build stays flat (the A/B inside the pin).
const rampEp = castEpisode([...DUELIST], 0xd0e4);
const flatEp = castEpisode(['ws_duelist', 'ws_firm_wrist'], 0xd0e4);
const rampRatio = rampEp.earlyHit > 0 ? rampEp.lateHit / rampEp.earlyHit : 0;
const flatRatio = flatEp.earlyHit > 0 ? flatEp.lateHit / flatEp.earlyHit : 0;
check('D: the Long Point\'s held damage RAMPS (late/early grows past the flat control)',
  rampRatio > flatRatio + 0.1 && rampRatio > 1.12,
  `ramp ${rampRatio.toFixed(2)} vs flat ${flatRatio.toFixed(2)}`);

// THE STRIDE EPISODE: the Monsoon frees the held stride; the rampless
// sprinkler drags at the channel's own factor throughout.
const runEp = castEpisode([...SPRINKLER], 0xd0e5, { moveX: true, seconds: 12 });
const dragEp = castEpisode(['ws_sprinkler', 'ws_cloudburst'], 0xd0e5, { moveX: true, seconds: 12 });
const runGrowth = runEp.earlyDx > 1 ? runEp.lateDx / runEp.earlyDx : 0;
const dragGrowth = dragEp.earlyDx > 1 ? dragEp.lateDx / dragEp.earlyDx : 0;
check('D: the Monsoon\'s held stride FREES (late window outruns early; the control stays flat)',
  runGrowth > dragGrowth + 0.15 && runGrowth > 1.2,
  `monsoon ${runGrowth.toFixed(2)}× vs control ${dragGrowth.toFixed(2)}×`);

// ------------------------------------ E. PERSISTENCE ----------------------
inst.treeNodes = [...DUELIST, NEUTRAL];
inst.level = 20;
const save = serializeCharacter(w);
const savedRow = save.knownSkills.find(s => s.skillId === 'wild_strike');
check('E: the full spend serializes sparse (the attunedForm idiom)',
  JSON.stringify(savedRow?.treeNodes) === JSON.stringify([...DUELIST, NEUTRAL]));
check('E: unpicked rows stay silent on the wire',
  !save.knownSkills.some(s => s.skillId !== 'wild_strike' && 'treeNodes' in s));
const rebuilt = rebuildSkill(savedRow!);
check('E: the spends survive the rebuild whole',
  JSON.stringify(rebuilt?.treeNodes) === JSON.stringify([...DUELIST, NEUTRAL]));

let noted = 0;
const realWarn = console.warn;
const countNotes = <T>(fn: () => T): T => {
  noted = 0;
  console.warn = (...args: unknown[]): void => {
    if (String(args[0] ?? '').includes('[skill tree]')) noted++;
    else realWarn(...args);
  };
  try { return fn(); } finally { console.warn = realWarn; }
};

// THE M0 FOLD: a single rung-1 pick at level ≥5 loads as a 1-point spend —
// no trim, no note, costless by construction (bandPointsAt(7) = 1).
const m0row = countNotes(() => rebuildSkill({
  skillId: 'wild_strike', level: 7, rarity: 'common', sockets: [null],
  treeNodes: ['ws_sprinkler'],
}));
check('E: THE M0 FOLD — a spike-era single pick loads as a costless 1-point spend',
  m0row?.treeNodes?.length === 1 && m0row.treeNodes[0] === 'ws_sprinkler' && noted === 0);

const orphaned = countNotes(() => rebuildSkill({ ...savedRow!, treeNodes: ['ws_retired_node'] }));
check('E: an orphaned pick drops with a console note',
  orphaned !== null && orphaned!.treeNodes === undefined && noted === 1, `noted ${noted}`);
const rival = countNotes(() => validTreeNodes(WS, ['ws_duelist', 'ws_sprinkler'], 20));
check('E: a rival-branch id drops through the one seam (the lock survives loading)',
  JSON.stringify(rival) === JSON.stringify(['ws_duelist']) && noted === 1);
const chainless = countNotes(() => validTreeNodes(WS, ['ws_long_point', 'ws_duelist'], 20));
check('E: a broken rung chain drops its stray (order enforced in id order)',
  JSON.stringify(chainless) === JSON.stringify(['ws_duelist']) && noted === 1);
const trimmed = countNotes(() => validTreeNodes(WS, ['ws_duelist', 'ws_firm_wrist', NEUTRAL], 5));
check('E: the budget trims the over-spent tail against the LEVEL (1 point at 5)',
  JSON.stringify(trimmed) === JSON.stringify(['ws_duelist']) && noted === 2);
const legacy = rebuildSkill({
  skillId: 'wild_strike', level: 3, rarity: 'common', sockets: [null],
});
check('E: a legacy row (no treeNodes) loads unchanged', legacy !== null && legacy!.treeNodes === undefined);
inst.treeNodes = undefined;

// ------------------------------ F. THE TRANSPARENCY LAW -------------------
function fingerprint(arm: 'authored' | 'stripped' | 'picked', seed: number): number {
  const savedTree = WS.tree;
  if (arm === 'stripped') delete (WS as { tree?: SkillTreeSpec }).tree;
  const restore = seedGlobalRandom(seed);
  let h = 0x811c9dc5 >>> 0;
  const mix = (n: number): void => {
    h ^= (Math.round(n * 1000) + 0x9e3779b9) >>> 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  try {
    const ww = makeSimWorld('swashbuckler', seed);
    const b = starterBuild('swashbuckler', 8);
    b.bar = ['wild_strike'];
    if (arm === 'picked') {
      b.skills = b.skills.map(s => s.id === 'wild_strike' ? { ...s, treeNodes: ['ws_duelist'] } : s);
    }
    applyBuild(ww, b, 0x9ea7);
    const st = ww.localSeat;
    const p = ww.player;
    const slot = p.skills.findIndex(s => s?.def.id === 'wild_strike');
    for (let i = 0; i < 3; i++) {
      const z = ww.createMonster('zombie', 8, 'enemy');
      z.pos = vec(p.pos.x + 90 + i * 30, p.pos.y + (i - 1) * 40);
      ww.actors.push(z);
    }
    setSimTap({
      onCast: (caster, i2) => { if (caster === p) mix(i2.def.id === 'wild_strike' ? 1 : 2); },
      onHit: (attacker, target, result) => {
        mix(result.total); mix(target.id); mix(attacker.id);
      },
    });
    const dt = SIM_CFG.dt;
    const held = new Array(8).fill(false); held[slot] = true;
    const edge = new Array(8).fill(false);
    for (let tick = 0; tick < Math.round(12 / dt); tick++) {
      const intent: PlayerInput = {
        dx: 0, dy: 0, aim: vec(p.pos.x + 90, p.pos.y), held, edge,
      };
      const inputs = new Map<string, PlayerInput>();
      inputs.set(st.id, intent);
      ww.applyInputs(inputs, dt);
      for (const a of ww.actors) updateAI(a, ww, dt);
      ww.update(dt);
      if (tick % 20 === 0) {
        mix(p.pos.x); mix(p.pos.y); mix(p.facing); mix(p.mana); mix(p.life);
        for (const a of ww.actors) { if (!a.dead) { mix(a.pos.x); mix(a.pos.y); } }
      }
    }
    setSimTap(null);
    return h;
  } finally {
    setSimTap(null);
    restore();
    if (arm === 'stripped') WS.tree = savedTree;
  }
}

for (const seed of [0xfab1e, 0x51de]) {
  const authored = fingerprint('authored', seed);
  const stripped = fingerprint('stripped', seed);
  check(`F: unpicked ≡ no-tree-at-all, byte-identical (seed 0x${seed.toString(16)})`,
    authored === stripped, `0x${authored.toString(16)} vs 0x${stripped.toString(16)}`);
}
{
  const authored = fingerprint('authored', 0xfab1e);
  const picked = fingerprint('picked', 0xfab1e);
  check('F: the picked arm DIVERGES — the fingerprint can see',
    authored !== picked, `both 0x${authored.toString(16)}`);
}

// --------------------- G. UNLEARN / RELEARN RETENTION ---------------------
w.loadZone(START_ZONE); // back to sanctuary — the discipline waives
inst.treeNodes = ['ws_duelist', 'ws_firm_wrist'];
inst.level = 10;
{
  const ok = w.unlearnSkill('wild_strike', seat);
  // THE RESIDENCE (M1): unlearning mints the bag WRAPPER item — the whole
  // progression truth (level, picks) rides its payload; instance identity
  // retired with the side array, payload fidelity is the new law.
  const baggedItem = seat.meta.items.find(i => i.gem?.kind === 'skill' && i.gem.skillId === 'wild_strike');
  const payload = baggedItem?.gem?.kind === 'skill' ? baggedItem.gem : null;
  check('G: unlearn moves the WHOLE gem to the bag — spends ride along',
    ok && !!payload && payload.level === 10
    && JSON.stringify(payload.treeNodes) === JSON.stringify(['ws_duelist', 'ws_firm_wrist']));
  const learned = !!baggedItem && w.learnSkill(baggedItem.uid, seat);
  const back = seat.meta.knownSkills.get('wild_strike');
  check('G: relearn rebuilds the gem whole — the picks survive the round trip',
    learned && back?.level === 10 && JSON.stringify(back?.treeNodes) === JSON.stringify(['ws_duelist', 'ws_firm_wrist']));
}

// --------------------- H. THE MONSTER PIN CAPABILITY ----------------------
{
  const dervish = MONSTERS.nettle_dervish;
  check('H: the capability subject carries the moded skill in its kit',
    !!dervish && dervish.skills.includes('wild_strike'));
  const saved = dervish.skillTrees;
  dervish.skillTrees = { wild_strike: ['ws_duelist'] };
  try {
    const pinned = w.createMonster('nettle_dervish', 10, 'enemy');
    const kit = pinned.skills.find(s => s?.def.id === 'wild_strike');
    check('H: the kit mints with the pinned spend (the one validation seam)',
      kit?.treeNodes?.length === 1 && kit.treeNodes[0] === 'ws_duelist');
    check('H: the TELEGRAPH view folds the pinned arc — drawn == tested for enemy wedges',
      !!kit && (instanceDelivery(kit) as { arcDeg?: number }).arcDeg === 16);
    check('H: the def itself stays frozen (the fold is per-instance)',
      (WS.delivery as { arcDeg?: number }).arcDeg === 30);
    const bare = w.createMonster('nettle_dervish', 10, 'enemy');
    dervish.skillTrees = undefined;
    const unpinned = w.createMonster('nettle_dervish', 10, 'enemy');
    const bareKit = unpinned.skills.find(s => s?.def.id === 'wild_strike');
    check('H: an unpinned kit stays bare — the capability costs nothing unused',
      bareKit?.treeNodes === undefined);
    void bare;
  } finally {
    dervish.skillTrees = saved;
  }
}

// --------------------- I. THE MILESTONE POPUP DISCIPLINE ------------------
{
  w.loadZone(field!.id);
  for (const a of w.actors) if (a.team === 'enemy') a.dead = true;
  const inst2 = seat.meta.knownSkills.get('wild_strike')!;
  inst2.level = 4;
  inst2.treeNodes = undefined;
  w.grantAbilityEssence(seat, 1, 50);
  // Mid-combat: a live hostile at arm's reach + hot blood.
  const foe = w.createMonster('zombie', 8, 'enemy');
  foe.pos = vec(seat.actor.pos.x + 100, seat.actor.pos.y);
  w.actors.push(foe);
  w.lastCombatAt = w.time;
  const leveled = w.levelUpSkill('wild_strike', seat);
  check('I: the band completion banks the pip (level 5 crossed)',
    leveled && inst2.level === 5 && bandPointsAt(5) === 1);
  w.treePopupRequested = false;
  for (let i = 0; i < 40; i++) w.update(SIM_CFG.dt);
  check('I: mid-combat the popup NEVER offers (the disciplined-calm law)',
    !w.treePopupRequested && w.swapRefusal(seat, 'socket') !== null);
  foe.dead = true;
  w.time += 30; // the calm returns
  for (let i = 0; i < 40; i++) w.update(SIM_CFG.dt);
  check('I: the calm fires the offer once, naming the skill',
    w.treePopupRequested && w.treePopupSkillId === 'wild_strike'
    && w.treePopupSeatId === seat.id);
  w.treePopupRequested = false;
  for (let i = 0; i < 40; i++) w.update(SIM_CFG.dt);
  check('I: the consumed pip never re-offers', !w.treePopupRequested);
}

// ------------------------------- J. THE GRAFT LANE ------------------------
{
  const inst3 = seat.meta.knownSkills.get('wild_strike')!;
  const neutral = WS.tree!.neutral!;
  const savedGraft = neutral.graft;
  const anySupport = Object.keys(SUPPORTS)[0];
  neutral.graft = { support: anySupport, level: 2 };
  try {
    inst3.level = 20;
    inst3.treeNodes = ['ws_duelist', NEUTRAL];
    w.recalcSeat(seat);
    check('J: a spent node\'s graft injects at recalcSeat (socket-free, derived)',
      inst3.grafts?.some(g => g.def.id === anySupport && g.level === 2) === true,
      `grafts: ${inst3.grafts?.map(g => g.def.id).join(',') ?? 'none'}`);
    inst3.treeNodes = ['ws_duelist'];
    w.recalcSeat(seat);
    check('J: the graft unmakes with the spend (derived, never saved)',
      !inst3.grafts?.some(g => g.def.id === anySupport));
    neutral.graft = { support: 'no_such_support_xyz', level: 1 };
    inst3.treeNodes = ['ws_duelist', NEUTRAL];
    w.recalcSeat(seat);
    check('J: an unknown support grants SILENCE (the warn-degrade idiom)',
      !inst3.grafts?.length || !inst3.grafts.some(g => g.def.id === 'no_such_support_xyz'));
  } finally {
    neutral.graft = savedGraft;
    inst3.treeNodes = undefined;
    w.recalcSeat(seat);
  }
}

// ------------------------------- K. THE CO-OP WIRE ------------------------
{
  const inst4 = seat.meta.knownSkills.get('wild_strike')!;
  inst4.level = 20;
  inst4.treeNodes = [...DUELIST, NEUTRAL];
  const wire = serializeSeatMeta(seat);
  check('K: the wire ships tn on the picked row alone (the sparse idiom)',
    JSON.stringify(wire.known.wild_strike?.tn) === JSON.stringify([...DUELIST, NEUTRAL])
    && Object.entries(wire.known).every(([id, row]) => id === 'wild_strike' || row.tn === undefined));
  applySeatMeta(w, seat, wire);
  const applied = seat.meta.knownSkills.get('wild_strike');
  check('K: the client rebuild carries the spends through the one seam',
    JSON.stringify(applied?.treeNodes) === JSON.stringify([...DUELIST, NEUTRAL]));
  const hostileWire = { ...wire, known: { ...wire.known } };
  hostileWire.known.wild_strike = {
    ...wire.known.wild_strike!,
    tn: ['ws_duelist', 'ws_sprinkler', 'no_such_node'],
  };
  const kept = countNotes(() => { applySeatMeta(w, seat, hostileWire); return seat.meta.knownSkills.get('wild_strike'); });
  check('K: hostile tn sanitizes (rival + orphan drop; the panels can never render what the host refuses)',
    JSON.stringify(kept?.treeNodes) === JSON.stringify(['ws_duelist']) && noted === 2);
}

// ------------------------- L. THE CENSUS BRANCH AXIS ----------------------
{
  const census = compatCensus('wild_strike', 'brutality');
  const hosts = new Set(census.rows.map(r => r.skillId));
  check('L: the census enumerates the bare host AND both branch terminals',
    hosts.has('wild_strike') && hosts.has('wild_strike@sprinkler') && hosts.has('wild_strike@duelist'),
    [...hosts].join(', '));
  check('L: exactly two extra hosts per moded skill (the exact-cover determinism)',
    hosts.size === 3);
  check('L: hostTreeNodes answers the terminal allocation (walked branch + neutral)',
    JSON.stringify(hostTreeNodes('wild_strike@duelist')) === JSON.stringify([...DUELIST, NEUTRAL])
    && JSON.stringify(hostTreeNodes('wild_strike@sprinkler')) === JSON.stringify([...SPRINKLER, NEUTRAL])
    && hostTreeNodes('wild_strike') === undefined);
  check('L: parseHostId round-trips the convention',
    JSON.stringify(parseHostId(hostIdOf('wild_strike', 'duelist'))) === JSON.stringify({ skillId: 'wild_strike', branchId: 'duelist' })
    && JSON.stringify(parseHostId('wild_strike')) === JSON.stringify({ skillId: 'wild_strike' }));
  check('L: terminal hosts pass the fit gate like their base (no census hole)',
    census.rows.filter(r => r.skillId.includes('@')).every(r => r.fit !== undefined));

  // THE REGISTRY GUARD (the 2026-08-20 gather-slice bite): a reconcile's
  // idsGone check must read the ledger universe through ledgerSkillIds —
  // raw SKILLS keys would delete every `skill@branch` row as a dead id.
  const ids = ledgerSkillIds();
  check('L: ledgerSkillIds carries the branch hosts beside the registry',
    ids.has('wild_strike') && ids.has('wild_strike@sprinkler') && ids.has('wild_strike@duelist')
    && !ids.has('wild_strike@no_such_branch'));
  const guardLedger = emptyLedger();
  guardLedger.pairs.push(
    { skill: 'wild_strike@sprinkler', support: 'brutality', kind: 'inert', status: 'open', since: '2026-08-20' },
    { skill: 'retired_skill_xyz', support: 'brutality', kind: 'inert', status: 'open', since: '2026-08-20' },
  );
  const rec = reconcileLedger(guardLedger, { probed: [], census }, '2026-08-20',
    { skills: ids, supports: new Set(Object.keys(SUPPORTS)) });
  check('L: a reconcile KEEPS the branch row and retires only the truly-dead id',
    rec.ledger.pairs.some(r => r.skill === 'wild_strike@sprinkler')
    && !rec.ledger.pairs.some(r => r.skill === 'retired_skill_xyz')
    && rec.removed.length === 1);
}

// --------------------------- M. THE GATHER'S STRIDE -----------------------
// (ruled 2026-08-20, the quirk the M1 audit surfaced): a Gathered Casting
// conversion's synthesized ChannelSpec binds MOVEMENT exactly as it binds
// the pulse clock — `cs.gather ?? instanceChannel(...)` at movementLocked
// and moveActor. A gathering caster walks its authored 'slowed' 0.5 (the
// channel bargain the conversion trades the bar's rooting for), never
// free and never rooted. The pin rides this rig's stride machinery
// because the audit that surfaced the dead fields lives here; the law is
// the support fabric's.
{
  function gatherStride(heldSlot: boolean, seed: number): { pxPerSec: number; castingTicks: number; ticks: number } {
    const restore = seedGlobalRandom(seed);
    try {
      const ww = makeSimWorld('magician', seed);
      const b = starterBuild('magician', 20);
      b.bar = ['firebolt'];
      b.skills = b.skills.map(s => s.id === 'firebolt'
        ? { ...s, supports: [{ id: 'gathered_casting', level: 1 }] } : s);
      applyBuild(ww, b, 0x9ea7);
      const st = ww.localSeat;
      const p = ww.player;
      const slot = p.skills.findIndex(s => s?.def.id === 'firebolt');
      const dt = SIM_CFG.dt;
      const held = new Array(8).fill(false); held[slot] = heldSlot;
      const edge = new Array(8).fill(false);
      const seconds = 8;
      let px = 0, castingTicks = 0, ticks = 0;
      for (let tick = 0; tick < Math.round(seconds / dt); tick++) {
        const t = tick * dt;
        const prevX = p.pos.x;
        const dir = Math.floor(t / 2) % 2 === 0 ? 1 : -1; // the arena-wall ping-pong
        const intent: PlayerInput = { dx: dir, dy: 0, aim: vec(p.pos.x + 200, p.pos.y), held, edge };
        const inputs = new Map<string, PlayerInput>();
        inputs.set(st.id, intent);
        ww.applyInputs(inputs, dt);
        for (const a of ww.actors) updateAI(a, ww, dt);
        ww.update(dt);
        px += Math.abs(p.pos.x - prevX);
        ticks++;
        if (p.casting?.mode === 'channel') castingTicks++;
      }
      return { pxPerSec: px / seconds, castingTicks, ticks };
    } finally {
      restore();
    }
  }
  const free = gatherStride(false, 0x9a7e);
  const held = gatherStride(true, 0x9a7e);
  check('M: the gather actually stands through the window (the rig is live)',
    held.castingTicks > held.ticks * 0.6 && free.castingTicks === 0,
    `held ${held.castingTicks}/${held.ticks} channel ticks`);
  const ratio = free.pxPerSec > 1 ? held.pxPerSec / free.pxPerSec : 0;
  check('M: THE GATHER\'S STRIDE — the synthesized spec binds the walk (slowed ≈ 0.5×, never free, never rooted)',
    ratio > 0.3 && ratio < 0.7,
    `held ${held.pxPerSec.toFixed(1)} px/s vs free ${free.pxPerSec.toFixed(1)} px/s = ${ratio.toFixed(2)}×`);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
