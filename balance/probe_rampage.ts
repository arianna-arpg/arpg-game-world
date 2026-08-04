// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RAMPAGE FABRIC + THE SETTLED GROUND, end to end on the
// real engine (docs/engine/rampage.md).
//
// RIG A — the fell census: fellableDoodad's pure derivation over the live
//   rule registry (standing bodies fell; doors/wells/hollow seals/labels/
//   shore samples/pits/spans/seed-paired/brittle refuse STRUCTURALLY; the
//   wyrm's own coil wears the authored fell:false refusal), and the primeval
//   roster census (who plows, who is enthroned).
// RIG B — the plow: the real passing body marched through a planted picket
//   on a live world — movement crosses, pieces fell at true-surface contact,
//   and every tested channel (blocksMovement / blocksProjectiles /
//   blocksSightOf / sightShadowFrac / clampPos) reads DOWN at once.
// RIG C — the whole animal: a fresh piece planted ON a trailing segment's
//   seat falls to the SEGMENT sweep with the head far out of reach.
// RIG D — the hold + the staggered regrowth + the entomb law + THE
//   REVERSION GUARANTEE: while the cause stands, nothing regrows (the wake
//   is pushed, never pulled — with each piece's own jitter re-carried, so
//   the release is still piecewise); the cause removed, the country stands
//   back up staggered; a body parked on a seat defers ITS piece only; and
//   when the dust settles the planted ground is byte-identical to its
//   pre-rampage census.
// RIG E — the wire (co-op): applyNetFell's position-keyed reconcile — the
//   listed fell with the stamped progress driving face AND collision, the
//   unlisted stand back up, absence clears all (the wells idiom).
// RIG F — THE SETTLED GROUND (overlay-pure, the eventqa idiom): a serpent
//   driven wake → slither → settle on a synthetic ring view — venue
//   'ground' owes the engine NO mint and seats fightAt on the REST node;
//   venue 'arena' still requests/binds the classic pocket (the lane stays
//   data); an old save's already-minted arena is honored over the rest
//   seat; roads seal along the path and ALL fall open on the slaying; the
//   shipped package validates coherent (venue/arenaName/arenaBand).
// RIG G — THE SINK-AWAY SWEEP (engine half, live world): a sovereign whose
//   standing fight expired departs WHOLE — slipAway takes the body and the
//   despawnPartsOf sweep takes its still-standing composite parts with it,
//   spliced (never killed: no break effects fire on a departure). Green at
//   HEAD by construction and held green across the manual-loop fold — the
//   branch's BEHAVIOR is the pin, not its text.
//
// The engine-side materializer law (levelBonus on unminted ground — the
// !def.special read in materializeWorldBossFight) needs a full packaged run
// and is pinned by the LIVE client QA rig, not here.
// Run: npx tsx balance/probe_rampage.ts
// ---------------------------------------------------------------------------

import '../src/packages/defs/worldboss'; // wyrm_coil rule + the package rows

import { vec } from '../src/core/math';
import {
  blocksMovement, blocksProjectiles, blocksSightOf, doodadRuleOf,
  registerDoodadRule, sightShadowFrac, type Doodad,
} from '../src/engine/levelgen';
import { fellableDoodad, fellFace, fellProgress, RAMPAGE_CFG, rampageSpecOf } from '../src/engine/rampage';
import { MONSTERS } from '../src/data/monsters';
import { BIOMES } from '../src/world/biomes';
import type { ZoneDef } from '../src/data/zones';
import type { Actor } from '../src/engine/actor';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';
import { WorldBossField, type WorldBossSurge } from '../src/packages/overlays/worldboss';
import { WORLDBOSS, WORLDBOSS_SURGE } from '../src/packages/defs/worldboss';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';

let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};

seedGlobalRandom(0x7a3901);

bootSimEngine();

// QA kinds — one per refusal axis, registered against the REAL registry so
// the census tests the derivation, never a copy of it.
registerDoodadRule('qa_picket', { overlap: 'inert', blocksMove: true, blocksShot: true, blocksSight: true });
registerDoodadRule('qa_sightonly', { overlap: 'inert', blocksSight: true });
registerDoodadRule('qa_ground_rug', { overlap: 'ground' });
registerDoodadRule('qa_span', { overlap: 'ground', blocksMove: true, spans: true });
registerDoodadRule('qa_paired', { overlap: 'inert', blocksMove: true, seedPaired: true });
registerDoodadRule('qa_pot', { overlap: 'inert', blocksMove: true, brittle: { life: 1, on: ['hit'] } as never });
registerDoodadRule('qa_refuser', { overlap: 'inert', blocksMove: true, fell: false });
registerDoodadRule('qa_brush', { overlap: 'ground', fell: true });

const D = (kind: string, x = 0, y = 0, extra: Partial<Doodad> = {}): Doodad =>
  ({ pos: vec(x, y), radius: 22, kind, ...extra });

// --- RIG A: the fell census -----------------------------------------------------
{
  check('A1 a standing blocker fells (derived)', fellableDoodad(D('qa_picket')));
  check('A2 a sight-only stander fells (it walls eyes — it is a body)', fellableDoodad(D('qa_sightonly')));
  check('A3 ground overlay (a rug) never fells — not a standing body', !fellableDoodad(D('qa_ground_rug')));
  check('A4 authored opt-in fells a non-blocker (crushable brush)', fellableDoodad(D('qa_brush')));
  check('A5 authored refusal wins over the derivation', !fellableDoodad(D('qa_refuser')));
  check('A6 spans refuse (crushing the causeway strands)', !fellableDoodad(D('qa_span')));
  check('A7 seed-paired refuse (cave mouths are load-bearing)', !fellableDoodad(D('qa_paired')));
  check('A8 brittle refuse (breakables BREAK, with their spoils)', !fellableDoodad(D('qa_pot')));
  check('A9 doors refuse (live state)', !fellableDoodad(D('qa_picket', 0, 0, { door: { id: 'd', mode: 'dwell' } })));
  check('A10 pooled wells refuse (live state + wire identity)',
    !fellableDoodad(D('qa_picket', 0, 0, { well: { power: 1, max: 1, id: 7 } })));
  check('A11 hollow seals refuse (progression)', !fellableDoodad(D('qa_picket', 0, 0, { hollow: 'h1' })));
  check('A12 labeled markers refuse', !fellableDoodad(D('qa_picket', 0, 0, { label: 'beacon' })));
  check('A13 shore samples refuse', !fellableDoodad(D('qa_picket', 0, 0, { land: { biome: 'field', bridge: false } })));
  check('A14 fall-able pits refuse (a hole cannot be crushed)', !fellableDoodad(D('qa_picket', 0, 0, { fall: true })));
  check('A15 an already-felled piece refuses (down is down)',
    !fellableDoodad(D('qa_picket', 0, 0, { felled: { at: 0, wake: 9 } })));
  check('A16 the wyrm coil wears the authored refusal (overlay-owned state)',
    doodadRuleOf('wyrm_coil').fell === false && !fellableDoodad(D('wyrm_coil')));

  // The primeval roster: who plows, who is enthroned.
  for (const id of ['primeval_wyrm_head', 'primeval_wyrm_passing', 'primeval_cragmaw', 'primeval_ashvein', 'primeval_ironbell']) {
    check(`A17 ${id} wears the rampage`, !!rampageSpecOf(MONSTERS[id]));
  }
  check('A18 velketh does NOT (enthroned, anchored)', !rampageSpecOf(MONSTERS.primeval_velketh));
  check('A19 spec sugar: true normalizes to all-defaults', JSON.stringify(rampageSpecOf({ rampage: true })) === '{}');
}

// --- RIGS B-E: the live world ----------------------------------------------------
{
  const w = makeSimWorld('warrior', 771177);
  const cy = w.arena.h / 2;
  w.player.pos.x = 120; w.player.pos.y = 120; // out of the marching lane

  // The picket: seven standing blockers strung across the lane at x=900
  // (the sim arena is 1600×1200 — the march must clear the line AND stay
  // shy of the zone bound, which is a wall no rampage may crush).
  const laneX = 900;
  const picket: Doodad[] = [];
  for (let i = 0; i < 7; i++) {
    const p = D('qa_picket', laneX, cy - 240 + i * 80, { rot: i * 0.7 });
    picket.push(p);
    w.doodads.push(p);
  }
  w.markDoodadsChanged();
  const census = picket.map(p => JSON.stringify({ k: p.kind, x: p.pos.x, y: p.pos.y, r: p.radius, rot: p.rot }));

  const before = w.clampPos(vec(laneX, cy), 10);
  check('B1 the picket BLOCKS before the rampage (clampPos pushes)',
    Math.hypot(before.x - laneX, before.y - cy) > 1);

  // The debut body: the passing glimpse-worm, driven by hand door-to-door.
  const m = w.createMonster('primeval_wyrm_passing', 12, 'enemy');
  m.pos = vec(250, cy);
  w.actors.push(m);
  const step = (secs: number, drive = false): void => {
    const dt = 0.1;
    for (let t = 0; t < secs; t += dt) {
      w.update(dt);
      if (drive && m.pos.x < 1440) w.moveActor(m, 1, 0, dt);
    }
  };
  step(16, true);
  check('B2 the plow CROSSES the picket line (never queued behind it)', m.pos.x > laneX + 180, `x=${m.pos.x.toFixed(0)}`);
  const lane = picket.filter(p => Math.abs(p.pos.y - cy) < 100);
  const offLane = picket.filter(p => Math.abs(p.pos.y - cy) >= 160);
  check('B3 lane pieces FELLED at true-surface contact', lane.length >= 2 && lane.every(p => !!p.felled),
    `${lane.filter(p => p.felled).length}/${lane.length}`);
  check('B4 far pieces STAND (the crush is a footprint, not a zone wipe)',
    offLane.length >= 2 && offLane.every(p => !p.felled));
  const f0 = lane[0];
  check('B5 down is down on EVERY channel',
    !blocksMovement(f0) && !blocksProjectiles(f0) && !blocksSightOf(f0) && sightShadowFrac(f0) === 0);
  const after = w.clampPos(vec(f0.pos.x, f0.pos.y), 10);
  check('B6 clampPos walks the crushed gap', Math.hypot(after.x - f0.pos.x, after.y - f0.pos.y) < 1);
  check('B7 the felled face reads crushed (squash + fade)', (() => {
    const face = fellFace(f0.felled!, w.time);
    return face.sy < 0.5 && face.alpha < 0.7;
  })());
  check('B8 the cause key rides the piece (the hold will match it)', f0.felled!.k === 'def:primeval_wyrm_passing');

  // RIG C — the whole animal: a fresh piece ON a trailing coil's seat.
  const segs = (m as Actor).worm!.segments;
  const seat = segs[8];
  const cPiece = D('qa_picket', seat.x, seat.y);
  w.doodads.push(cPiece);
  w.markDoodadsChanged();
  step(0.3);
  const headGap = Math.hypot(m.pos.x - seat.x, m.pos.y - seat.y);
  check('C1 a trailing SEGMENT crushes it (head far out of reach)', !!cPiece.felled && headGap > 200,
    `head ${headGap.toFixed(0)}u away`);

  // RIG D — the hold: park the living cause and outwait every clock.
  step(RAMPAGE_CFG.delaySec + RAMPAGE_CFG.jitterSec + RAMPAGE_CFG.regrowSec + 15);
  check('D1 THE HOLD: nothing regrows while the cause stands (wake pushed, never pulled)',
    lane.every(p => !!p.felled) && !!cPiece.felled);

  // The cause leaves (the pass slips away) — the release begins.
  w.actors.splice(w.actors.indexOf(m), 1);
  const felledSet = [...lane, cPiece];
  const standTimes = new Map<Doodad, number>();
  const t0 = w.time;
  // Park the player ON one seat — the entomb law must defer THAT piece only.
  const parked = lane[0];
  w.player.pos.x = parked.pos.x; w.player.pos.y = parked.pos.y;
  for (let s = 0; s < 90 && standTimes.size < felledSet.length - 1; s += 0.5) {
    step(0.5);
    for (const p of felledSet) {
      if (!p.felled && !standTimes.has(p)) standTimes.set(p, w.time - t0);
    }
  }
  const freeTimes = felledSet.filter(p => p !== parked).map(p => standTimes.get(p)).filter((v): v is number => v != null);
  check('D2 the release re-stands the country (all unblocked pieces)', freeTimes.length === felledSet.length - 1);
  check('D3 …STAGGERED (per-piece jitter survives the hold)',
    freeTimes.length >= 2 && Math.max(...freeTimes) - Math.min(...freeTimes) >= 3,
    `spread ${(Math.max(...freeTimes) - Math.min(...freeTimes)).toFixed(1)}s`);
  check('D4 THE ENTOMB LAW: the parked seat defers while a body stands on it', !!parked.felled);
  w.player.pos.x = 120; w.player.pos.y = 120;
  step(RAMPAGE_CFG.sweepSec * 4 + 0.5);
  check('D5 …and completes the beat they move', !parked.felled);
  check('D6 THE REVERSION GUARANTEE: the ground is byte-identical to its pre-rampage census',
    picket.every((p, i) => JSON.stringify({ k: p.kind, x: p.pos.x, y: p.pos.y, r: p.radius, rot: p.rot }) === census[i]
      && !p.felled && !p.gone && blocksMovement(p)));
  check('D7 the sweep list runs dry (nothing leaks)', !w.rampageActive());

  // RIG E — the wire: position-keyed reconcile, the wells idiom.
  const a = D('qa_picket', 300, 300), b = D('qa_picket', 400, 400);
  w.doodads.push(a, b);
  w.markDoodadsChanged();
  check('E1 host-side felling speaks through the one chokepoint', w.fellDoodad(a, 'qa') && !!a.felled);
  w.applyNetFell([{ x: 400, y: 400, p: -1 }]);
  check('E2 the listed FELL with the stamped progress', !!b.felled && b.felled.p === -1 && !blocksMovement(b));
  check('E3 the unlisted STAND back up (absence = standing)', !a.felled && blocksMovement(a));
  w.applyNetFell([{ x: 400, y: 400, p: 0.6 }]);
  check('E4 progress restates in place (face mid-swell, still a ghost)', (() => {
    const face = fellFace(b.felled!, 0);
    return b.felled!.p === 0.6 && face.sy > 0.5 && face.sy < 1 && !blocksMovement(b);
  })());
  check('E5 the wire progress WINS over any local clock', fellProgress(b.felled!, 1e9) === 0.6);
  w.applyNetFell(undefined);
  check('E6 an empty wire clears the ground whole', !b.felled && blocksMovement(b) && !w.rampageActive());
}

// --- RIG F: THE SETTLED GROUND (overlay-pure) -------------------------------------
{
  const mkNode = (id: string, x: number, y: number, exits: string[]): ZoneDef => ({
    id, name: id, map: { x, y }, level: 12, biome: 'field',
    objective: { kind: 'hunt' }, exits: exits.map(to => ({ to })),
  } as unknown as ZoneDef);
  // A CHORDED ring of eight (±1 and ±2 neighbors): every node keeps side
  // roads, so a 3-edge blockade strands nobody and the BFS guard admits the
  // wake honestly. (A bare degree-2 ring correctly REFUSES every wake — the
  // path's interior nodes would lose both their roads; the guard works.)
  const N = 8;
  const nodes: ZoneDef[] = [];
  for (let i = 0; i < N; i++) {
    const ex = [1, 2, N - 1, N - 2].map(k => `n${(i + k) % N}`);
    nodes.push(mkNode(`n${i}`, Math.cos(i / N * Math.PI * 2) * 300, Math.sin(i / N * Math.PI * 2) * 300, ex));
  }
  const byId: Record<string, ZoneDef> = {};
  for (const z of nodes) byId[z.id] = z;
  const gate: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
  const view = {
    nodes, byId, allNodes: nodes, terrain: () => 'land', currentZoneId: 'n0',
    time: 0, census: {}, charLevel: 20, gates: new Map(),
    visited: new Set(nodes.map(z => z.id)), surveyed: new Set(),
  } as unknown as OverlayView;

  const mkSurge = (): WorldBossSurge => {
    const s = structuredClone(WORLDBOSS_SURGE) as WorldBossSurge;
    s.roamer.slitherSecondsPerEdge = 1;
    s.roamer.sealSeconds = 0.5;
    s.roamer.pathLen = [4, 4];
    return s;
  };
  const drive = (f: WorldBossField, secs: number): void => {
    for (let t = 0; t < secs; t += 0.25) {
      (view as { time: number }).time += 0.25;
      f.update(0.25, view);
    }
  };

  // The GROUND venue — the shipped default, Vhorun as authored.
  const fg = new WorldBossField({ seed: 99, gate: () => gate, biomeSeed: 99 }, mkSurge());
  check('F1 the wake takes (devIgnite on the ring)', fg.devIgnite(view, 'n0'));
  drive(fg, 8);
  const sg = fg.peekSerpents()[0];
  check('F2 it SETTLES', sg?.phase === 'settled');
  check('F3 venue ground owes the engine NO mint', fg.pendingMints().length === 0);
  const fight = fg.fightAt(sg.restZoneId);
  check('F4 the fight seats ON the rest node itself', !!fight && fight.archetype === 'roamer');
  check('F5 …and nowhere else', nodes.every(z => z.id === sg.restZoneId || !fg.fightAt(z.id)));
  check('F6 the map marker follows the rest seat (arenaZoneId stays null)', sg.arenaZoneId === null);
  const sealedNow = nodes.filter(z => z.exits.some(e => fg.edgeBlocked(z.id, e.to)));
  check('F7 the path roads SEAL behind it', sealedNow.length >= 2);

  // Old-save compat: an already-minted arena is HONORED over the rest seat.
  const snap = fg.snapshot() as { serpents: { arenaZoneId: string | null }[] };
  const oldSnap = structuredClone(snap);
  oldSnap.serpents[0].arenaZoneId = 'n3';
  const fOld = new WorldBossField({ seed: 99, gate: () => gate, biomeSeed: 99 }, mkSurge());
  fOld.restore(oldSnap);
  check('F8 an old save\'s minted arena is honored (the mint, once made, wins)',
    !!fOld.fightAt('n3') && !fOld.fightAt(fOld.peekSerpents()[0].restZoneId ?? '')
    || fOld.peekSerpents()[0].restZoneId === 'n3');

  // The slaying: every strangled road falls open at once.
  const slain = fg.onBossSlain(sg.id);
  check('F9 the slaying resolves the def', slain?.id === 'vhorun');
  check('F10 …and every road falls open', nodes.every(z => z.exits.every(e => !fg.edgeBlocked(z.id, e.to))));

  // The ARENA lane stays pure data.
  const surgeA = mkSurge();
  const vh = surgeA.defs.find(d => d.id === 'vhorun')!;
  vh.roam = { ...vh.roam!, venue: 'arena', arenaName: 'QA Coil' };
  const fa = new WorldBossField({ seed: 99, gate: () => gate, biomeSeed: 99 }, surgeA);
  fa.devIgnite(view, 'n0');
  drive(fa, 8);
  const sa = fa.peekSerpents()[0];
  const mints = fa.pendingMints();
  check('F11 venue arena still REQUESTS its pocket', sa.phase === 'settled'
    && mints.length === 1 && mints[0].kind === 'arena' && mints[0].zoneName === 'QA Coil');
  fa.bindMint(sa.id, 'qa_arena_zone');
  check('F12 …binds it, and the fight seats THERE, not on the rest node',
    !!fa.fightAt('qa_arena_zone') && !fa.fightAt(sa.restZoneId));

  // The shipped rows are coherent (venue/arenaName/arenaBand law).
  const look = { monster: (id: string) => !!MONSTERS[id], biome: (id: string) => !!BIOMES[id] };
  const problems = WORLDBOSS.validate?.(look as never) ?? [];
  check('F13 the shipped package validates clean', problems.length === 0, problems.join('; '));
  const vhShipped = WORLDBOSS_SURGE.defs.find(d => d.id === 'vhorun')!;
  check('F14 Vhorun ships venue ground, no dead arena knobs',
    vhShipped.roam?.venue === 'ground' && !vhShipped.roam?.arenaName && !vhShipped.arenaBand);
}

// --- RIG G: THE SINK-AWAY SWEEP (engine half) -------------------------------------
// The standing-fight branch of updateWorldBosses: a boss whose fight is no
// longer on the field's books sinks away via slipAway, and the ONE
// despawnPartsOf sweep (world.ts, beside slipAway) takes its composite
// parts with it. A real composite on a live sim world; the field injected
// with no fight standing, so the expiry branch is the only road taken.
{
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = makeSimWorld('warrior', 771233) as any;
  const boss = w.createMonster('hunt_chimera', 12, 'enemy') as Actor;
  boss.pos = vec(500, 500);
  w.actors.push(boss);
  w.updateParts(); // the composite lazy-attach tick (parts join the world)
  const parts: Actor[] = boss.partActors ?? [];
  check('G1 the composite stands with its parts attached (the lazy-attach law)',
    parts.length === 2 && parts.every(p => w.actors.includes(p)), `parts=${parts.length}`);
  // A field with NO standing fight for this zone — the sovereign's stay is over.
  const gGate: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
  const wbSinkField = new WorldBossField({ seed: 7, gate: () => gGate, biomeSeed: 7 },
    structuredClone(WORLDBOSS_SURGE) as WorldBossSurge);
  w.sim.worldBossField = wbSinkField;
  w.wbBoss = boss;
  w.wbBossKey = 'qaExpiredStay';
  const before = w.actors.length;
  w.updateWorldBosses(1 / 30);
  check('G2 the departed sovereign is GONE, silently (slipAway — no corpse, no credit)',
    !w.actors.includes(boss) && w.wbBoss === null && !boss.dead);
  check('G3 its parts sink WITH it — none left casting at the empty air',
    parts.length > 0 && parts.every(p => !w.actors.includes(p)));
  check('G4 spliced, never killed (a departure fires no break effects)',
    parts.every(p => !p.dead));
  check('G5 the sweep took exactly the file (root + parts, nobody else)',
    w.actors.length === before - 1 - parts.length,
    `actors ${before} -> ${w.actors.length}`);
}

console.log(fails ? `\nprobe_rampage: ${fails} FAILURE(S)` : '\nprobe_rampage: ALL PASS');
process.exit(fails ? 1 : 0);
