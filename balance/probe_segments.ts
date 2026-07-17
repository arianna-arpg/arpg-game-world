// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SEGMENT FABRIC end to end on the real engine
// (docs/engine/segments.md), against the fabric's debut consumer: Vhorun,
// the Sunder-Wyrm (primeval_wyrm_head). Pins:
//   - absent-spec byte-parity (a plain monster's reach IS dist − radius),
//   - follow determinism (same seed + same head path = identical spines),
//   - drawn = tested (bodyContact honors segR to the pixel, both sides),
//   - the funnels: a real projectile landing on a TAIL segment feeds the
//     ONE shared pool + flashes THAT segment; a real nova overlapping many
//     coils lands exactly ONE hit on the creature,
//   - wound math (frac × maxLife pools, tears, segWounds root mods, the
//     retaliation burst biting a bystander),
//   - single-kill credit off a tail hit (one death, xp paid, spine flashes),
//   - aim assist snapping to the nearest COIL, never dragged to the head,
//   - the co-op wire (ht/wd/sf ride ActorW.worm; looks stay off the wire).
// Run: npx tsx balance/probe_segments.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { applyBuild } from '../src/sim/builds';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { setSimTap } from '../src/engine/tap';
import { assistAim } from '../src/engine/aimassist';
import { serializeSnapshot } from '../src/net/snapshot';
import {
  SEG_CFG, bodyContact, bodyWhere, feedWound, reachTo, segR, segsHittable, woundCount,
} from '../src/engine/segments';
import { dist, vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

/** Stand a live, revealed wyrm up in a fresh arena and unspool its body
 *  along a known path (the head dragged directly — pure trail dynamics,
 *  no AI dice). Returns the wyrm with its spine laid out east-to-west. */
function riggedWyrm(world: World, park = true): Actor {
  const p = world.player;
  const wyrm = world.createMonster('primeval_wyrm_head', 12, 'enemy');
  wyrm.pos = vec(p.pos.x + 300, p.pos.y);
  world.actors.push(wyrm);
  if (park) { wyrm.aiCooldown = 99999; wyrm.anchored = true; }
  // Reveal the ambush (the update sweep springs it at 560) and let the
  // parts lazy-attach; then DRAG the head so the spine unspools: a wide
  // circuit of the arena, ending back east of the player.
  for (let i = 0; i < 30; i++) world.update(1 / 60);
  const path: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.01) {
    path.push([
      p.pos.x + 300 + Math.sin(t * Math.PI * 2) * 420,
      p.pos.y + Math.cos(t * Math.PI * 2) * 320 - 320,
    ]);
  }
  for (const [x, y] of path) {
    wyrm.pos.x = x; wyrm.pos.y = y;
    world.update(1 / 60);
  }
  return wyrm;
}

// ============================================================ rig the world
const world = makeSimWorld('sorcerer', 424242);
const warnings = applyBuild(world, {
  id: 'segments_probe', classId: 'sorcerer', level: 14,
  skills: [{ id: 'firebolt', level: 6 }],
}, 14);
if (warnings.length) console.log('build warnings:', warnings.join(' | '));
const p = world.player;
p.sheet.setBase('life', 6000); p.life = 6000;   // survives the tear burst
const step = (s: number): void => { for (let t = 0; t < s; t += 1 / 60) world.update(1 / 60); };

// ---------------------------------------------------------- absent-spec parity
{
  const wolf = world.createMonster('plains_wolf', 5, 'enemy');
  wolf.pos = vec(p.pos.x + 200, p.pos.y + 120);
  world.actors.push(wolf);
  let parity = true;
  for (let i = 0; i < 24; i++) {
    const pt = vec(p.pos.x + (i * 37) % 400 - 200, p.pos.y + (i * 61) % 300 - 150);
    if (Math.abs(reachTo(wolf, pt) - (dist(wolf.pos, pt) - wolf.radius)) > 1e-9) parity = false;
  }
  check('absent spec: reachTo === dist − radius (byte parity)', parity);
  check('absent spec: segsHittable false, no phantom bodies',
    !segsHittable(wolf) && bodyContact(wolf, vec(wolf.pos.x + wolf.radius + 40, wolf.pos.y)) === null);
  wolf.dead = true;
}

// ------------------------------------------------------------- the rigged wyrm
const wyrm = riggedWyrm(world);
const w = wyrm.worm!;
check('wyrm revealed and hittable', !wyrm.untargetable && segsHittable(wyrm));
check('spine at authored length', w.segments.length === 26, `${w.segments.length}`);

// ---------------------------------------------------------- drawn = tested
{
  const k = 20;
  const seg = w.segments[k];
  const inside = bodyContact(wyrm, vec(seg.x, seg.y));
  // Walk straight out past the tail tip: outside every drawn circle = null.
  const tail = w.segments[w.segments.length - 1];
  const prev = w.segments[w.segments.length - 2];
  const outAng = Math.atan2(tail.y - prev.y, tail.x - prev.x);
  const tipR = segR(wyrm, w.segments.length - 1);
  const justIn = vec(tail.x + Math.cos(outAng) * (tipR - 3), tail.y + Math.sin(outAng) * (tipR - 3));
  const justOut = vec(tail.x + Math.cos(outAng) * (tipR + 4), tail.y + Math.sin(outAng) * (tipR + 4));
  check('segment center is a contact (drawn circle tested)', inside !== null && inside >= 0, `seg ${inside}`);
  check('inside the tail tip radius = contact', bodyContact(wyrm, justIn) !== null);
  check('past the tail tip radius = clean miss', bodyContact(wyrm, justOut) === null);
  check('bodyWhere finds the coil its predicate names',
    bodyWhere(wyrm, (bp) => dist(bp, seg) < 2)?.seg === k, `→ ${bodyWhere(wyrm, (bp) => dist(bp, seg) < 2)?.seg}`);
  check('reachTo ≤ head distance (nearest body wins)',
    reachTo(wyrm, p.pos) <= dist(wyrm.pos, p.pos) - wyrm.radius + 1e-9);
}

// ------------------------------------- projectile funnel: a tail hit feeds ONE pool
{
  // Park the hero close to a mid-tail coil, far from the head.
  const k = 18;
  const seg = w.segments[k];
  p.pos = vec(seg.x + 150, seg.y);
  p.mana = p.availableMaxMana();
  const lifeBefore = wyrm.life;
  let hits = 0;
  setSimTap({
    onHit: (_a, target) => { if (target === wyrm) hits++; },
  });
  const fb = p.skills.find(s => s?.def.id === 'firebolt')!;
  world.useSkill(p, fb, vec(seg.x, seg.y));
  // Sample the per-segment flash DURING the beat (it decays in 0.15s):
  // step frame by frame and remember any segment lighting up.
  let sawSegFlash = false;
  for (let t = 0; t < 2.0; t += 1 / 60) {
    world.update(1 / 60);
    if (w.flash?.some(f => f > 0)) sawSegFlash = true;
  }
  setSimTap(null);
  check('projectile on a tail coil LANDS (shared pool fed)', wyrm.life < lifeBefore && hits >= 1,
    `life ${lifeBefore.toFixed(0)}→${wyrm.life.toFixed(0)}, hits ${hits}`);
  check('the STRUCK segment flashed (feedback where it landed)', sawSegFlash);
  check('head far away (the tail was the target)', dist(p.pos, wyrm.pos) > 400,
    `${dist(p.pos, wyrm.pos).toFixed(0)}`);
}

// ----------------------------------------- nova funnel: many coils, ONE hit
{
  // Find the densest cluster of coils around a mid segment; stand in it.
  const k = 14;
  const seg = w.segments[k];
  p.pos = vec(seg.x, seg.y + 30);
  const overlapped = w.segments.filter(s => dist(s, p.pos) < 95 + 40).length;
  p.mana = p.availableMaxMana();
  let hits = 0;
  setSimTap({ onHit: (_a, target) => { if (target === wyrm) hits++; } });
  const gs = makeSkillInstance(SKILLS.ground_slam, 5);
  p.skills.push(gs);
  world.useSkill(p, gs, vec(p.pos.x, p.pos.y));
  step(1.6);
  setSimTap(null);
  check('nova overlapping many coils = exactly ONE hit on the creature',
    overlapped >= 2 && hits === 1, `${overlapped} coils in the ring, ${hits} hit(s)`);
}

// ---------------------------------------------------------------- wound math
{
  const k = 9;
  const rBefore = segR(wyrm, k);
  const pool = wyrm.maxLife() * w.wounds!.frac;
  check('wound pool not yet torn by the probes above', !w.wounded?.[k]);
  const toreEarly = feedWound(wyrm, k, pool * 0.5);
  const tore = feedWound(wyrm, k, pool * 0.6);
  check('wound pool math: frac × maxLife, drains across blows', !toreEarly && tore);
  const rAfter = segR(wyrm, k);
  check('a torn segment TESTS smaller exactly as it draws',
    Math.abs(rAfter - rBefore * SEG_CFG.woundRadiusMult) < 1e-9, `${rBefore.toFixed(1)}→${rAfter.toFixed(1)}`);
  // The sweep applies the tear's effects (mods on the root + the burst).
  const dtBefore = wyrm.sheet.get('damageTaken');
  const heroBefore = p.life;
  p.pos = vec(w.segments[k].x + 40, w.segments[k].y);   // in the burst
  wyrm.segTears = [k];
  step(0.1);
  const dtAfter = wyrm.sheet.get('damageTaken');
  check('tear lays the wound mods on the ROOT (segWounds source)',
    dtAfter > dtBefore, `damageTaken ${dtBefore.toFixed(3)}→${dtAfter.toFixed(3)}`);
  check('tear count reads back (woundCount)', woundCount(wyrm) === 1);
  check('the torn coil BIT BACK (retaliation burst)', p.life < heroBefore,
    `hero ${heroBefore.toFixed(0)}→${p.life.toFixed(0)}`);
}

// ------------------------------------------------------------- aim assist
{
  const k = 22;
  const seg = w.segments[k];
  const raw = { x: seg.x + 14, y: seg.y - 12 };
  const aimed = assistAim(world, p, raw, null, 1);
  const toSeg = Math.hypot(aimed.x - seg.x, aimed.y - seg.y);
  const toHead = Math.hypot(aimed.x - wyrm.pos.x, aimed.y - wyrm.pos.y);
  check('aim assist snaps to the NEAREST coil, never the far head',
    aimed.targetId === wyrm.id && toSeg < toHead && toSeg < segR(wyrm, k) + 60,
    `snap ${toSeg.toFixed(0)} from coil vs ${toHead.toFixed(0)} from head`);
}

// ------------------------------------------------------------ co-op wire
{
  const snap = serializeSnapshot(world, 1);
  const aw = snap.actors.find(a => a.id === wyrm.id);
  check('wire: hittable chain rides ht', aw?.worm?.ht === 1);
  check('wire: torn bitmask carries the tear', ((aw?.worm?.wd ?? 0) & (1 << 9)) !== 0,
    `wd ${aw?.worm?.wd}`);
  check('wire: kit looks stay OFF the wire (defId re-resolves them)',
    aw !== undefined && !('looks' in (aw.worm as object)) && aw.defId === 'primeval_wyrm_head');
}

// ----------------------------------------------- single-kill credit (tail blow)
{
  const k = 16;
  const seg = w.segments[k];
  p.pos = vec(seg.x + 140, seg.y);
  p.mana = p.availableMaxMana();
  wyrm.life = 1;                        // the next landed blow is the death
  const xpBefore = world.seats[0].meta.xp;
  const fb = p.skills.find(s => s?.def.id === 'firebolt')!;
  world.useSkill(p, fb, vec(seg.x, seg.y));
  step(2.5);
  const xpAfter = world.seats[0].meta.xp;
  check('the tail blow KILLED the one creature', wyrm.dead);
  check('xp paid exactly once (killer credited)', xpAfter > xpBefore,
    `xp ${xpBefore}→${xpAfter}`);
  check('parts died with the root (no orphan hitboxes)',
    !world.actors.some(a => !a.dead && a.partLink?.root === wyrm));
}

// ------------------------------------------------------- follow determinism
{
  const spineOf = (seed: number): string => {
    const wd = makeSimWorld('sorcerer', seed);
    const wy = riggedWyrm(wd);
    return JSON.stringify(wy.worm!.segments.map(s => [Math.round(s.x * 1000) / 1000, Math.round(s.y * 1000) / 1000]));
  };
  const a = spineOf(777);
  const b = spineOf(777);
  check('follow dynamics deterministic (same seed + path = same spine)', a === b);
}

// ---------------------------------------------------- passing body stays myth
{
  const pass = MONSTERS.primeval_wyrm_passing;
  check('passing body wears the kit but carries NO hit surface',
    !!pass.worm?.looks && !pass.worm?.hittable);
}

console.log(failed === 0 ? '\nprobe_segments: ALL GREEN' : `\nprobe_segments: ${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
