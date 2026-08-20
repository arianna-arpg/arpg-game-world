// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SKILL-MODE TREES, M0 (docs/design/skill-modes.md §9:
// the wild_strike spike). Pins, in order:
//   A. THE AUTHORED ROW + CENSUS: wild_strike carries the charter's two
//      rung-1 branches (Sprinkler arc 30/spread 130, Duelist arc 16/spread
//      24, pick at level 5) — and EVERY def wearing a tree validates: ≥2
//      branches, ≥1 rung each, node ids unique per def, `over` fields
//      inside the M0 whitelist (arcDeg/spreadDeg only). A future M2 wave
//      that authors a stray override field fails here, not in a player's
//      face.
//   B. THE LEVEL-5 SEAL + THE FIELD DISCIPLINE: the pick refuses below the
//      milestone (state untouched), lands at 5 in sanctuary (the workshop
//      law), refuses under hot blood / pressing foes in the field through
//      the standing swapRefusal words, and re-opens with the calm.
//   C. EXCLUSIVITY + THE UNTRUSTED LANE: one pick at a time BY
//      CONSTRUCTION (a re-pick replaces, never appends), bogus node ids
//      and malformed intents no-op.
//   D. THE RESOLVED VIEW REACHES THE CAST PATH (drawn == tested): the pure
//      reads fold the pick (instanceDelivery/instanceAim), an UNPICKED
//      instance returns the def's own objects BY REFERENCE, and the real
//      engine's rolled bearings + victim sets under both picks measure the
//      authored sector and arc through World.executeSkill itself.
//   E. PERSISTENCE (the attunedForm idiom): the pick survives the real
//      serializeCharacter → rebuildSkill round trip; an orphaned node id
//      drops with a console note; legacy rows load unchanged.
//   F. THE TRANSPARENCY LAW: with the tree authored but UNPICKED, a
//      same-seed episode is BYTE-IDENTICAL to one with the tree field
//      deleted from the def — the fabric is invisible until chosen. (The
//      committed smoke baseline is the macro twin of this pin.)
// Run: npx tsx balance/probe_skillmodes.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_CFG } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { seedGlobalRandom } from '../src/sim/rng';
import { starterBuild } from '../src/sim/data/builds';
import { SKILLS } from '../src/data/skills';
import { START_ZONE } from '../src/data/zones';
import {
  instanceAim, instanceDelivery, treeNodeOf, treePickOpen,
  type SkillTreeSpec,
} from '../src/engine/skills';
import { serializeCharacter, rebuildSkill } from '../src/meta/character';
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

// ------------------------------------------------- A. THE AUTHORED ROW ----
const WS = SKILLS.wild_strike;
const tree = WS.tree as SkillTreeSpec | undefined;
check('A: wild_strike carries the M0 tree', !!tree);
check('A: the pick opens at level 5 (the settled milestone)', tree?.level === 5);
check('A: two branches — the charter grammar', tree?.branches.length === 2);
const sprinkler = treeNodeOf(WS, 'ws_sprinkler');
const duelist = treeNodeOf(WS, 'ws_duelist');
check('A: the Sprinkler rung carries the measured payload (arc 30 / spread 130)',
  sprinkler?.over?.arcDeg === 30 && sprinkler?.over?.spreadDeg === 130);
check('A: the Duelist rung carries the measured payload (arc 16 / spread 24)',
  duelist?.over?.arcDeg === 16 && duelist?.over?.spreadDeg === 24);

// The census: every tree-wearing def validates — the M0 whitelist is a
// CLOSED vocabulary until M1's audit widens it field by adopted field.
const OVER_WHITELIST = new Set(['arcDeg', 'spreadDeg']);
let censusBad = '';
let treeWearers = 0;
for (const def of Object.values(SKILLS)) {
  const t = def.tree;
  if (!t) continue;
  treeWearers++;
  if (t.level < 1) censusBad += ` ${def.id}:level<1`;
  if (t.branches.length < 2) censusBad += ` ${def.id}:<2-branches`;
  const seen = new Set<string>();
  for (const b of t.branches) {
    if (b.rungs.length < 1) censusBad += ` ${def.id}/${b.id}:rungless`;
    for (const n of b.rungs) {
      if (seen.has(n.id)) censusBad += ` ${def.id}/${n.id}:dup-node-id`;
      seen.add(n.id);
      for (const k of Object.keys(n.over ?? {})) {
        if (!OVER_WHITELIST.has(k)) censusBad += ` ${def.id}/${n.id}:over.${k}-off-whitelist`;
      }
    }
  }
}
check('A: the tree census — every wearer on-grammar, overrides on the M0 whitelist',
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
check('B: a sealed pick refuses — state untouched', inst.treeNodes === undefined);
inst.level = 5;
check('B: at level 5 the row opens', treePickOpen(inst));
pick('ws_duelist');
check('B: the pick lands in sanctuary (the workshop law)',
  inst.treeNodes?.length === 1 && inst.treeNodes[0] === 'ws_duelist');
check('B: the bar instance IS the book instance (the pick reaches the cast path)',
  seat.actor.skills.some(s => s === inst));

// Into the field: the discipline bites where sanctuary doesn't waive it.
const field = Object.values(w.zoneMap).find(z =>
  z.id !== START_ZONE && !z.boundless && z.objective?.kind !== 'safe');
check('B: the chart offers unsafe ground', !!field, field?.id ?? 'none');
w.loadZone(field!.id);
for (const a of w.actors) if (a.team === 'enemy') a.dead = true;
w.lastCombatAt = w.time; // hot blood
pick('ws_sprinkler');
check('B: hot blood refuses the re-pick, in the standing words',
  inst.treeNodes?.[0] === 'ws_duelist'
  && w.swapRefusal(seat, 'socket') === 'the blood is still hot');
w.time += 30; // the calm returns
pick('ws_sprinkler');
check('B: the calm re-opens the hands — the re-pick lands (M0 has no hard lock)',
  inst.treeNodes?.length === 1 && inst.treeNodes[0] === 'ws_sprinkler');

// ------------------------ C. EXCLUSIVITY + THE UNTRUSTED LANE -------------
pick('ws_duelist');
pick('ws_sprinkler');
check('C: one pick at a time BY CONSTRUCTION — replace, never append',
  inst.treeNodes?.length === 1 && inst.treeNodes[0] === 'ws_sprinkler');
pick('no_such_node');
check('C: a bogus node id no-ops', inst.treeNodes?.[0] === 'ws_sprinkler');
w.applyAction(seat, { t: 'pickTreeNode', skillId: 'wild_strike' } as unknown as MetaAction);
w.applyAction(seat, { t: 'pickTreeNode', skillId: 7, nodeId: 'ws_duelist' } as unknown as MetaAction);
w.applyAction(seat, { t: 'pickTreeNode', skillId: 'no_such_skill', nodeId: 'ws_duelist' } as unknown as MetaAction);
check('C: malformed/hostile intents no-op through the validator',
  inst.treeNodes?.length === 1 && inst.treeNodes[0] === 'ws_sprinkler');

// ------------------------------- D. THE RESOLVED VIEW ---------------------
// The pure reads first: fold when picked, THE SAME OBJECTS back when not.
check('D: picked, instanceDelivery folds the arc (sprinkler 30)',
  (instanceDelivery(inst) as { arcDeg?: number }).arcDeg === 30);
check('D: picked, instanceAim folds the sector (sprinkler 130)',
  instanceAim(inst)?.random?.spreadDeg === 130);
inst.treeNodes = ['ws_duelist'];
check('D: picked, the duelist folds (arc 16 / spread 24)',
  (instanceDelivery(inst) as { arcDeg?: number }).arcDeg === 16
  && instanceAim(inst)?.random?.spreadDeg === 24);
inst.treeNodes = undefined;
check('D: UNPICKED, the resolvers return the def\'s own objects BY REFERENCE',
  instanceDelivery(inst) === WS.delivery && instanceAim(inst) === WS.aim);

// The cast path itself: rolled bearings + victims through the REAL engine.
// Ring: 5 immortal dummies at 0/±25/±50°, gap 70 (the batch-54 rig). The
// cone angle test is center-only, so with arc a/spread s a dummy at
// bearing b is touchable iff |b| ≤ s/2 + a/2: the duelist (16/24) can
// NEVER reach the ±25° centers (12 + 8 = 20 < 25) — victims == 1 exactly
// — while the sprinkler (30/130) reaches all five windows (~1e-12 miss
// odds over a 20s channel). Bearings prove the sector: duelist ≤ 12°+ε,
// sprinkler beyond 50° (the unpicked 90° sector cannot roll past 45°).
function castEpisode(nodeId: string | undefined, seed: number): {
  maxAbsBearingDeg: number; victims: number; casts: number;
} {
  const restore = seedGlobalRandom(seed);
  try {
    const ww = makeSimWorld('swashbuckler', seed);
    const b = starterBuild('swashbuckler', 20);
    b.bar = ['wild_strike'];
    if (nodeId) {
      b.skills = b.skills.map(s => s.id === 'wild_strike' ? { ...s, treeNodes: [nodeId] } : s);
    }
    applyBuild(ww, b, 0x9ea7);
    const st = ww.localSeat;
    const p = ww.player;
    const slot = p.skills.findIndex(s => s?.def.id === 'wild_strike');
    const gap = 70;
    const victims = new Set<number>();
    for (const bDeg of [0, -25, 25, -50, 50]) {
      const ang = bDeg * Math.PI / 180;
      const d = ww.createMonster('target_dummy', 1, 'enemy');
      d.pos = vec(p.pos.x + Math.cos(ang) * gap, p.pos.y + Math.sin(ang) * gap);
      ww.actors.push(d);
    }
    const aimAt = vec(p.pos.x + gap, p.pos.y);
    let casts = 0, frameCasts = 0, maxAbs = 0;
    setSimTap({
      onCast: (caster, i2) => {
        if (caster === p && i2.def.id === 'wild_strike') { casts++; frameCasts++; }
      },
      onHit: (attacker, target, result) => {
        if (attacker === p && target !== p && !result.evaded && !result.immune) victims.add(target.id);
      },
    });
    const dt = SIM_CFG.dt;
    const held = new Array(8).fill(false); held[slot] = true;
    const edge = new Array(8).fill(false);
    for (let tick = 0; tick < Math.round(20 / dt); tick++) {
      frameCasts = 0;
      const intent: PlayerInput = { dx: 0, dy: 0, aim: vec(aimAt.x, aimAt.y), held, edge };
      const inputs = new Map<string, PlayerInput>();
      inputs.set(st.id, intent);
      ww.applyInputs(inputs, dt);
      for (const a of ww.actors) updateAI(a, ww, dt);
      ww.update(dt);
      if (frameCasts > 0) {
        // A channeling actor cannot re-face — post-update facing IS the roll.
        const baseAng = Math.atan2(aimAt.y - p.pos.y, aimAt.x - p.pos.x);
        let rel = (p.facing - baseAng) % (Math.PI * 2);
        if (rel > Math.PI) rel -= Math.PI * 2;
        if (rel < -Math.PI) rel += Math.PI * 2;
        maxAbs = Math.max(maxAbs, Math.abs(rel) * 180 / Math.PI);
      }
    }
    setSimTap(null);
    return { maxAbsBearingDeg: maxAbs, victims: victims.size, casts };
  } finally {
    setSimTap(null);
    restore();
  }
}

const dueEp = castEpisode('ws_duelist', 0xd0e1);
check('D: the duelist\'s rolled bearings live inside its 24° sector',
  dueEp.casts > 60 && dueEp.maxAbsBearingDeg <= 12.5,
  `casts ${dueEp.casts}, max |bearing| ${dueEp.maxAbsBearingDeg.toFixed(1)}°`);
check('D: the duelist touches ONLY the dead-ahead body (arc 16 through the real cone test)',
  dueEp.victims === 1, `victims ${dueEp.victims}`);
const sprEp = castEpisode('ws_sprinkler', 0xd0e2);
check('D: the sprinkler\'s wander rolls beyond 50° (the 130° sector is live)',
  sprEp.casts > 60 && sprEp.maxAbsBearingDeg > 50,
  `casts ${sprEp.casts}, max |bearing| ${sprEp.maxAbsBearingDeg.toFixed(1)}°`);
check('D: the sprinkler rains on the whole ring (5/5 victims)',
  sprEp.victims === 5, `victims ${sprEp.victims}`);
const baseEp = castEpisode(undefined, 0xd0e3);
check('D: unpicked, the wander honors the base 90° sector (no roll past 45°)',
  baseEp.casts > 60 && baseEp.maxAbsBearingDeg <= 45.5,
  `casts ${baseEp.casts}, max |bearing| ${baseEp.maxAbsBearingDeg.toFixed(1)}°`);

// ------------------------------------ E. PERSISTENCE ----------------------
inst.treeNodes = ['ws_duelist'];
const save = serializeCharacter(w);
const savedRow = save.knownSkills.find(s => s.skillId === 'wild_strike');
check('E: the pick serializes sparse (the attunedForm idiom)',
  JSON.stringify(savedRow?.treeNodes) === JSON.stringify(['ws_duelist']));
check('E: unpicked rows stay silent on the wire',
  !save.knownSkills.some(s => s.skillId !== 'wild_strike' && 'treeNodes' in s));
const rebuilt = rebuildSkill(savedRow!);
check('E: the pick survives the rebuild', rebuilt?.treeNodes?.[0] === 'ws_duelist');
let noted = 0;
const realWarn = console.warn;
console.warn = (...args: unknown[]): void => {
  if (String(args[0] ?? '').includes('[skill tree]')) noted++;
  else realWarn(...args);
};
const orphaned = rebuildSkill({ ...savedRow!, treeNodes: ['ws_retired_node'] });
console.warn = realWarn;
check('E: an orphaned pick drops with a console note',
  orphaned !== null && orphaned!.treeNodes === undefined && noted === 1,
  `noted ${noted}`);
const legacy = rebuildSkill({
  skillId: 'wild_strike', level: 3, rarity: 'common', sockets: [null],
});
check('E: a legacy row (no treeNodes) loads unchanged', legacy !== null && legacy!.treeNodes === undefined);

// ------------------------------ F. THE TRANSPARENCY LAW -------------------
// Same seed, two arms: the tree AUTHORED but unpicked vs the tree field
// DELETED from the def. A real pack fights back so deaths, statuses and
// every rng-hungry system ride the stream; the fingerprint folds casts,
// hits, positions and mana. Any daylight = the fabric touched an unpicked
// cast. A third, PICKED arm must diverge (the fingerprint can see).
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

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
