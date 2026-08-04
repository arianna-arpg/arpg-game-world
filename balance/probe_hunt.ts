// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE HUNT, whole lifecycle on the real engine (the roving
// beast-hunt package: src/packages/defs/hunt.ts + overlays/hunt.ts + the
// World's hunt seams). Pins:
//   A  the PACKAGE CONTRACT: surge shape sane (trackStages ordered, dwell > 0,
//      seat envelope ordered), every HuntBeast row resolves (faction, def,
//      look, brain) and carries the CHASE CONTRACT (≥1 flee phase — a hunt
//      beast that never runs is a boss objective, not a hunt) with every flee
//      phase's damage-reduction survivable (< 1 — burst can still drop it),
//   B  IGNITE + THE SEAT LAW: the real maybeIgnite over the real charted web
//      seats the trail off the player's boots, on event-targetable ground,
//      never the standing zone; tracksTotal within the def band; the trail
//      marker (🐾) stands while unrevealed — and the whole ignite is
//      DETERMINISTIC at the overlay grain (same seed + same view ⇒ same
//      lair, same beast, same tracksTotal — the engine's adjacent-hop stays
//      an adjudicated fresh roll, the ~70-event-caller class),
//   C  THE TRAIL WALKED: entering the trail zone drops a readable footprint
//      (loadZone tail), the dwell advances the trail (relocate → an adjacent
//      non-cave non-safe zone; locate → revealed), an unread footprint
//      re-places on re-entry (no soft-lock), and the footprint object never
//      outlives its zone visit (cleared per loadZone — no immortal litter),
//   D  THE STAND + THE MIGRATION: the located beast materializes tagged, at
//      preserved health; a wound past a flee threshold enters the flee phase
//      (aiFleeing + goal); reaching the exit MIGRATES the hunt (health +
//      phase preserved, beast despawned); the next zone re-spawns it at the
//      remembered fraction and phase (no re-flee of a spent phase),
//   E  THE KILL: the tagged kill ends the hunt through the registered kill
//      rule (ledger bumps, XP paid), and a NEXT hunt can ignite with a fresh
//      id (the one-at-a-time gate re-opens; seq never collides),
//   F  THE REMEMBRANCE (snapshot/restore): a mid-chase save resumes exactly
//      (zone, life fraction, phase, trail progress); a dead quarry, an
//      unknown beast, and garbage all restore to NO hunt without a throw,
//   G  CLEANUP: ending the hunt clears the marker; pruning the chase's zone
//      ends the hunt (the lair pin alone is not a hunt),
//   H  TWO TRAIL SYSTEMS STAY TWO: the hunt's footprint dwell never prints
//      the watch fabric's scent trail (Actor.trail stays empty — the hunt
//      does not ride the print fabric, and no scent-watcher reads the
//      footprint).
// Run: npx tsx balance/probe_hunt.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, classById } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { resetActorIdCounter } from '../src/engine/actor';
import { updateAI } from '../src/engine/ai';
import { World } from '../src/engine/world';
import { buildManifest } from '../src/packages/manifest';
import { makeAccount } from '../src/meta/account';
import { HUNT } from '../src/packages/defs/hunt';
import { HuntField, type HuntSurge } from '../src/packages/overlays/hunt';
import type { OverlayBuildCtx, PackageGate } from '../src/packages/types';
import type { OverlayView } from '../src/world/overlay';
import { eventTargetable } from '../src/world/zonePolicy';
import { collectMarkers } from '../src/world/mapMarkers';
import { FACTIONS, MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { SKILLS } from '../src/data/skills';
import { START_ZONE, type ZoneDef } from '../src/data/zones';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { WEATHER_DEFS, validateWeather } from '../src/world/weather';
import { dressPlanFor } from '../src/engine/weatherDress';
import { eventFrontSourceIds } from '../src/engine/eventWeather';
import { regionKind } from '../src/world/regions';
import { massKindOf } from '../src/engine/massif';
import { pickSeat } from '../src/world/seats';
import { Rng } from '../src/core/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x8ea57);

// Read the def's surge through a throwaway field (the def keeps it private —
// surge() is the engine's own accessor, so the probe reads what the engine reads).
const SURGE: HuntSurge = (() => {
  const gate: PackageGate = { active: false, share: 0, pressure: 0, ignitionMul: 0, severityMul: 0, concurrencyMul: 1 };
  const f = HUNT.world!.overlay!({ seed: 1, gate: () => gate } as OverlayBuildCtx) as HuntField;
  return f.surge();
})();

// ------------------------------------------------------- A. package contract
{
  const [lo, hi] = SURGE.trackStages;
  check('A: trackStages ordered and ≥1 find', lo >= 1 && hi >= lo, `[${lo}, ${hi}]`);
  check('A: dwellSeconds positive', SURGE.dwellSeconds > 0, `${SURGE.dwellSeconds}`);
  const r = SURGE.seat.range ?? {};
  check('A: seat envelope ordered (off the boots, findable)',
    (r.min ?? 0) >= 0 && (r.max ?? Infinity) > (r.min ?? 0), `min ${r.min} max ${r.max}`);
  check('A: at least one quarry in the pool', SURGE.beasts.length >= 1, `${SURGE.beasts.length} beasts`);
  for (const b of SURGE.beasts) {
    const def = MONSTERS[b.defId];
    check(`A: beast '${b.defId}' resolves (faction/def/look/brain/weight)`,
      !!FACTIONS[b.faction] && !!def && !!def.look && !!LOOKS[def.look] && !!def.brain && b.weight > 0);
    if (!def) continue;
    const phases = def.brain?.phases ?? [];
    const flees = phases.filter(p => p.flee);
    check(`A: '${b.defId}' honors the CHASE CONTRACT (≥1 flee phase)`, flees.length >= 1,
      `${flees.length} flee phases`);
    // A flee phase's damage-taken mod must stay survivable-by-burst (< 100%
    // reduction) — the "huge burst can still drop it" promise is data, so a
    // typo'd -1.0 would make the runner literally unkillable mid-bolt.
    for (const p of flees) {
      const dt = (p.mods ?? []).find(m => m.stat === 'damageTaken');
      const red = dt ? -(dt.value) : 0;
      check(`A: '${b.defId}' flee @${p.atLifeFrac} damage-reduction < 1`, red < 1, `${red}`);
    }
  }
}

// --------------------------------------------- the probe's one hunting world
function makeHuntWorld(seed: number): World {
  resetActorIdCounter();
  const account = makeAccount();
  const manifest = buildManifest(account, seed);
  for (const p of manifest.packages) p.enabled = p.id === 'hunt';
  const world = new World(account, Object.freeze(manifest));
  world.createPlayer(classById('warrior'));
  world.player.level = 12; // past startLevel 8 — the gate opens
  world.loadZone(START_ZONE);
  // THE HALO SETTLE: the seat fabric draws from the forechart's minted halo,
  // which the background sweep grows on world beats — a just-booted web is two
  // nodes and seats nothing. Breathe in town until the halo stands (~10s sim).
  for (let s = 0; s < 60 * 30 && world.devOverlayView().nodes.length < 60; s++) world.update(1 / 60);
  return world;
}

/** Pump the REAL overlay ignition (0.5s steps) until a hunt stands. */
function igniteHunt(world: World, cap = 6000): number {
  const hf = world.sim.huntField!;
  let steps = 0;
  while (!hf.peek() && steps < cap) { hf.update(0.5, world.devOverlayView()); steps++; }
  return steps;
}

/** One REAL frame, the live loop's own order (main.ts / sim/runner.ts): every
 *  actor thinks, then the world resolves — a probe that skips updateAI tests a
 *  world where nothing schemes, and the flee phases never fire. */
function step(world: World, frames: number, dt = 1 / 60): void {
  for (let i = 0; i < frames; i++) {
    for (const a of world.actors) updateAI(a, world, dt);
    world.update(dt);
  }
}

/** Kill every hostile EXCEPT the hunt's own quarry — a clear room for the
 *  dwell/fight rigs without deleting the subject. */
function clearOthers(world: World): void {
  for (const a of [...world.actors]) {
    if (a.team === 'enemy' && !a.dead && a.tag !== 'hunt_beast') world.kill(a, false, world.player);
  }
}

/** Park the local hero on the footprint and tick real frames until the trail
 *  advances (the dwell), the fail-safe being a bounded frame budget. */
function dwellTrail(world: World): boolean {
  const fp = world.huntFootprintView();
  if (!fp) return false;
  world.player.pos.x = fp.pos.x;
  world.player.pos.y = fp.pos.y;
  for (let i = 0; i < 60 * 6 && world.huntFootprintView(); i++) step(world, 1);
  return !world.huntFootprintView();
}

const world = makeHuntWorld(0xbea57);
const hf = world.sim.huntField!;
check('B: the hunt overlay is mounted for the run', !!hf);

// ------------------------------------------------- B. ignite + the seat law
{
  const steps = igniteHunt(world);
  const h = hf.peek();
  check('B: a hunt ignites through the real trigger', !!h, `${steps} steps (${(steps * 0.5).toFixed(0)}s sim)`);
  if (h) {
    const [lo, hi] = SURGE.trackStages;
    check('B: the quarry comes from the surge pool', SURGE.beasts.some(b => b.defId === h.beastDefId), h.beastDefId);
    check('B: fresh remembrance (full life, no phase spent, unrevealed)',
      h.lifeFrac === 1 && h.phaseIdx === -1 && !h.revealed);
    const seat = world.zoneMap[h.currentZoneId];
    check('B: the trail seats OFF the standing zone', h.currentZoneId !== world.zone.id);
    check('B: the seat is event-targetable ground', !!seat && eventTargetable('hunt', seat));
    const tt = (hf as unknown as { hunt: { tracksTotal: number } }).hunt?.tracksTotal ?? -1;
    check('B: tracksTotal rolled inside the def band', tt >= lo && tt <= hi, `${tt}`);
    const mk = collectMarkers(world).find(m => m.id.startsWith('hunt-trail-'));
    check('B: the trail marker stands while unrevealed (🐾, always-fogged)',
      !!mk && mk.glyph === '🐾' && mk.fog === 'always' && mk.zoneId === h.currentZoneId);
  }
  // Overlay-grain determinism: same seed + same views ⇒ same seat, beast, total.
  const mkField = (): HuntField => {
    const gate: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
    return HUNT.world!.overlay!({ seed: 0xd0e5, gate: () => gate } as OverlayBuildCtx) as HuntField;
  };
  const va = world.devOverlayView();
  const fa = mkField(), fb = mkField();
  for (let i = 0; i < 4000 && !fa.peek(); i++) fa.update(0.5, va);
  for (let i = 0; i < 4000 && !fb.peek(); i++) fb.update(0.5, va);
  const pa = fa.peek(), pb = fb.peek();
  check('B: ignite is deterministic at the overlay grain (seed ⇒ seat/beast/total)',
    !!pa && !!pb && pa.lairZoneId === pb.lairZoneId && pa.beastDefId === pb.beastDefId
    && JSON.stringify(fa.snapshot()) === JSON.stringify(fb.snapshot()));
}

// ------------------------------------- B2. the quarry pool (bands + glyphs)
{
  // THE LEVEL BANDS: the pool reads as a progression — a level-8 hunter meets
  // only the unbanded founder and the early river-wyrm; by 30 the wyrm's band
  // has closed. Rolled through devIgnite on standalone fields (the real
  // pickBeast lane), many draws per rung.
  const gate: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
  const view = world.devOverlayView();
  const wildZone = view.nodes.find(z => eventTargetable('hunt', z) && z.id !== view.currentZoneId)!;
  const rollAt = (charLevel: number): Set<string> => {
    const seen = new Set<string>();
    for (let i = 0; i < 160; i++) {
      const f = HUNT.world!.overlay!({ seed: 0xb0b + i, gate: () => gate } as OverlayBuildCtx) as HuntField;
      if (f.devIgnite({ ...view, charLevel }, wildZone.id)) seen.add(f.peek()!.beastDefId);
    }
    return seen;
  };
  const at8 = rollAt(8);
  const inBand8 = new Set(SURGE.beasts.filter(b => !b.level || (8 >= b.level[0] && 8 <= b.level[1])).map(b => b.defId));
  check('B2: level-8 hunts roll only the level-8 band', [...at8].every(id => inBand8.has(id)),
    `saw ${[...at8].join(',')}`);
  check('B2: the early band is a real pool (>1 quarry at 8)', at8.size > 1, `${at8.size} distinct`);
  const at30 = rollAt(30);
  const inBand30 = new Set(SURGE.beasts.filter(b => !b.level || (30 >= b.level[0] && 30 <= b.level[1])).map(b => b.defId));
  check('B2: closed bands stay closed (a level-30 hunt never rolls an outgrown quarry)',
    [...at30].every(id => inBand30.has(id)), `saw ${[...at30].join(',')}`);
  // THE FALLBACK: authored bands may gap, but a hunt never dry-fires — a
  // surge whose every band misses the level falls back to the full pool.
  const banded = new HuntField({ seed: 0xfa11, gate: () => gate } as OverlayBuildCtx, {
    ...SURGE, beasts: [{ faction: 'wild', defId: 'wilds_behemoth', weight: 1, level: [90, 100] }],
  });
  check('B2: an emptied band falls back to the full pool (never a dry-fire)',
    banded.devIgnite({ ...view, charLevel: 10 }, wildZone.id) && banded.peek()!.beastDefId === 'wilds_behemoth');
  // Every authored band is ordered and every glyph row names a pool member —
  // and the located pin resolves the quarry's own glyph.
  for (const b of SURGE.beasts) {
    if (b.level) check(`B2: '${b.defId}' band ordered inside the leveling range`,
      b.level[0] >= 1 && b.level[1] >= b.level[0] && b.level[0] <= 100, `[${b.level}]`);
  }
}

// ------------------------------------------------------- C. the trail walked
{
  const h0 = hf.peek()!;
  world.loadZone(h0.currentZoneId);
  check('C: entering the trail zone drops the footprint (loadZone tail)', !!world.huntFootprintView());

  // Leave WITHOUT reading, come back: the track re-places (no soft-lock), and
  // the footprint object did not survive the hop (cleared per loadZone).
  world.loadZone(START_ZONE);
  check('C: the footprint never outlives its zone visit', !world.huntFootprintView());
  world.loadZone(h0.currentZoneId);
  check('C: an unread track re-places on re-entry', !!world.huntFootprintView());

  // Walk the whole trail: each read either relocates (adjacent, non-cave,
  // non-safe) or locates the beast; the counter converges inside tracksTotal.
  let hops = 0;
  const cap = 8;
  while (!hf.peek()!.revealed && hops < cap) {
    clearOthers(world); // a clear reading room — the dwell is the subject, not the melee
    const before = hf.peek()!.currentZoneId;
    const seen = (world.ledger as Record<string, number>).hunt_seen ?? 0;
    check(`C: hop ${hops} — the footprint stands in the trail zone`, !!world.huntFootprintView());
    const read = dwellTrail(world);
    check(`C: hop ${hops} — the dwell reads the trail`, read);
    const h = hf.peek()!;
    check(`C: hop ${hops} — the read is a ledger event (hunt_seen bumps)`,
      ((world.ledger as Record<string, number>).hunt_seen ?? 0) > seen);
    if (!h.revealed) {
      const dest = world.zoneMap[h.currentZoneId];
      check(`C: hop ${hops} — the trail RELOCATES to adjacent walkable ground`,
        !!dest && h.currentZoneId !== before && dest.caveDepth == null && dest.objective.kind !== 'safe'
        && world.zoneMap[before].exits.some(e => e.to === h.currentZoneId));
      world.loadZone(h.currentZoneId);
    }
    hops++;
  }
  check('C: the trail LOCATES the beast inside its rolled stages', hf.peek()!.revealed, `${hops} finds`);
  const mk = collectMarkers(world).find(m => m.id.startsWith('hunt-') && !m.id.startsWith('hunt-trail-'));
  const wantGlyph = SURGE.beasts.find(b => b.defId === hf.peek()!.beastDefId)?.glyph ?? '🐗';
  check('C: the marker flips to the QUARRY\'s own pin once located',
    !!mk && mk.glyph === wantGlyph, `${mk?.glyph} (want ${wantGlyph} for ${hf.peek()!.beastDefId})`);
}

// ------------------------------------------- D. the stand + the migration
{
  const h = hf.peek()!;
  if (world.zone.id !== h.currentZoneId) world.loadZone(h.currentZoneId);
  else world.devRematerialize(); // located in place — the live materializer's lane
  const beast = world.actors.find(a => a.tag === 'hunt_beast');
  check('D: the located beast materializes tagged', !!beast, beast?.name);
  if (beast) {
    check('D: first stand at full health', Math.abs(beast.life - beast.maxLife()) < 1);
    clearOthers(world); // the duel is the subject
    // Wound past the first flee threshold and let the brain answer.
    const phases = MONSTERS[h.beastDefId].brain!.phases!;
    const fleeAt = phases[0].atLifeFrac;
    beast.life = beast.maxLife() * (fleeAt - 0.06);
    world.player.pos.x = beast.pos.x + 60; // in perception — the fight is on
    world.player.pos.y = beast.pos.y;
    for (let i = 0; i < 60 * 4 && !beast.aiFleeing; i++) step(world, 1);
    check('D: the wound enters the flee phase (aiFleeing + a goal)', beast.aiFleeing && !!beast.aiFleeGoal);
    const lifeFracAtFlight = beast.life / beast.maxLife();
    // Let it reach its exit (teleport to the goal — arrival logic is the subject).
    if (beast.aiFleeGoal) { beast.pos.x = beast.aiFleeGoal.x; beast.pos.y = beast.aiFleeGoal.y; }
    for (let i = 0; i < 60 * 3 && world.actors.includes(beast); i++) step(world, 1);
    check('D: reaching the exit despawns the runner (no corpse, no credit)', !world.actors.includes(beast));
    const hm = hf.peek()!;
    const migrated = hm.currentZoneId !== h.currentZoneId;
    check('D: the hunt MIGRATES (or stands cornered on a dead end)',
      migrated || world.actors.some(a => a.tag === 'hunt_beast'));
    if (migrated) {
      check('D: the remembrance carries the wound and the spent phase',
        Math.abs(hm.lifeFrac - lifeFracAtFlight) < 0.05 && hm.phaseIdx === 0,
        `lifeFrac ${hm.lifeFrac.toFixed(3)} phase ${hm.phaseIdx}`);
      const dest = world.zoneMap[hm.currentZoneId];
      check('D: it fled to valid adjacent ground (never a cave, never the town)',
        !!dest && dest.caveDepth == null && dest.objective.kind !== 'safe'
        && !dest.eventOwned && !dest.pocket && !dest.floating);
      world.loadZone(hm.currentZoneId);
      const beast2 = world.actors.find(a => a.tag === 'hunt_beast');
      check('D: the next stand re-spawns it health-preserved', !!beast2
        && Math.abs(beast2.life / beast2.maxLife() - hm.lifeFrac) < 0.02,
        beast2 ? `${(beast2.life / beast2.maxLife()).toFixed(3)} vs ${hm.lifeFrac.toFixed(3)}` : '');
      check('D: the spent phase stays spent (no re-flee at the same threshold)',
        !!beast2 && beast2.aiPhaseIdx === 0);
    }
  }
}

// ----------------------------------------------------------- E. the kill
{
  const beast = world.actors.find(a => a.tag === 'hunt_beast');
  check('E: a beast stands for the kill', !!beast);
  if (beast) {
    const slainBefore = (world.ledger as Record<string, number>).hunt_beasts_slain ?? 0;
    const dropsBefore = world.drops.length;
    world.kill(beast, false, world.player);
    check('E: the tagged kill ends the hunt (the registered kill rule)', hf.peek() === null);
    check('E: the ledger pays (hunt_beasts_slain)',
      ((world.ledger as Record<string, number>).hunt_beasts_slain ?? 0) === slainBefore + 1);
    check('E: the payout lands (the kill rule\'s gem shower mints)',
      world.drops.length >= dropsBefore + 5, `${world.drops.length - dropsBefore} new drops`);
    check('E: the marker leaves with the hunt', !collectMarkers(world).some(m => m.id.startsWith('hunt-')));
  }
  // The one-at-a-time gate re-opens: a NEXT hunt ignites, and its id is fresh.
  const steps = igniteHunt(world);
  const h2 = hf.peek();
  check('E: the next hunt ignites after the kill', !!h2, `${steps} steps`);
  check('E: hunt ids never collide (the seq marches)', !!h2 && h2.id !== 'hunt_0', h2?.id);
}

// ------------------------------------------- F. the remembrance (save laws)
{
  const gate: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };
  const mk = (): HuntField => HUNT.world!.overlay!({ seed: 0xf00d, gate: () => gate } as OverlayBuildCtx) as HuntField;
  const a = mk();
  for (let i = 0; i < 4000 && !a.peek(); i++) a.update(0.5, world.devOverlayView());
  check('F: a standalone field ignites for the save rigs', !!a.peek());
  if (a.peek()) {
    // Sculpt a mid-chase state: located, wounded, one phase down, one find in.
    a.locateBeast(a.peek()!.currentZoneId);
    a.setLife(0.45);
    a.migrate(a.peek()!.currentZoneId, 1);
    const snap = JSON.stringify(a.snapshot());
    const b = mk();
    b.restore(JSON.parse(snap));
    check('F: a mid-chase save resumes exactly (zone, life, phase, trail)',
      JSON.stringify(b.snapshot()) === snap);
    check('F: the restored chase still answers beastIn at the remembered zone',
      !!b.beastIn(b.peek()!.currentZoneId) && b.beastIn(b.peek()!.currentZoneId)!.lifeFrac === 0.45);
    // Tolerance: a dead quarry, a foreign beast, and garbage all restore to
    // NO hunt — never a throw, never a zombie chase.
    const dead = mk();
    dead.restore(JSON.parse(snap.replace('"lifeFrac":0.45', '"lifeFrac":0')));
    check('F: a dead quarry stays dead through restore', dead.peek() === null);
    const foreign = mk();
    foreign.restore({ hunt: { ...(JSON.parse(snap) as { hunt: object }).hunt, beastDefId: 'no_such_beast' }, seq: 3 });
    check('F: a quarry whose def left the roster restores to no hunt', foreign.peek() === null);
    const garbage = mk();
    garbage.restore({ hunt: 42, seq: 'many' });
    check('F: garbage restores to no hunt without a throw', garbage.peek() === null);
    // The id counter survives every restore shape — resumed runs never collide.
    const c = mk();
    c.restore(JSON.parse(snap));
    check('F: the id counter rides the save (no colliding hunt ids after resume)',
      (JSON.parse(JSON.stringify(c.snapshot())) as { seq: number }).seq
      >= (JSON.parse(snap) as { seq: number }).seq);
  }
}

// ------------------------------------------------------------- G. cleanup
{
  const h = hf.peek();
  check('G: a live hunt stands for the cleanup rig', !!h);
  if (h) {
    hf.pruneZones(id => id !== h.currentZoneId);
    check('G: pruning the chase\'s ground ends the hunt', hf.peek() === null);
    check('G: the marker leaves with it', !collectMarkers(world).some(m => m.id.startsWith('hunt-')));
  }
}

// ------------------------------------------- I. the beast's ground (part 3)
{
  // THE DRESS KINDS: both event-pinned weather rows register, validate clean
  // (never sky-born, every dress doodad a real registered kind), and resolve
  // full dress plans.
  const msgs = validateWeather(id => !!SKILLS[id], k => !!DOODAD_VISUALS[k]);
  check('I: the weather registry stays clean with the hunt rows aboard', msgs.length === 0, msgs.join(' | '));
  const spoor = WEATHER_DEFS.hunt_spoor, nest = WEATHER_DEFS.hunt_nest;
  check('I: spoor + nest are event-pinned kinds (never sky-born)',
    !!spoor?.eventOnly && !spoor?.skyWeight && !!nest?.eventOnly && !nest?.skyWeight);
  check('I: spawn-neutral presentation (the beast is the event, the sky is the look)',
    spoor?.countMul === 1 && Object.keys(spoor?.factionMul ?? { x: 1 }).length === 0
    && nest?.countMul === 1 && Object.keys(nest?.factionMul ?? { x: 1 }).length === 0);
  check('I: both kinds carry dress kits (the spoor light, the nest heavy)',
    (dressPlanFor('hunt_spoor')?.rows.length ?? 0) >= 2 && (dressPlanFor('hunt_nest')?.rows.length ?? 0) >= 3);
  check('I: the hunt front source is registered', eventFrontSourceIds().includes('hunt'));

  // THE PIN + THE PLANT + THE EVAPORATION, on the real world: stand a live
  // hunt's trail zone — the spoor front pins and the bone dress PLANTS; end
  // the hunt — the pin lifts and every piece dissolves (Doodad.evap). No
  // immortal litter, by the transience doctrine's own machinery.
  const steps = igniteHunt(world);
  const h = hf.peek();
  check('I: a hunt stands for the ground rig', !!h, `${steps} steps`);
  if (h) {
    world.loadZone(h.currentZoneId);
    world.devKillAll();
    const dressCount = (): number => world.zone && (world as unknown as { doodads: { weatherDress?: string }[] }).doodads
      ? (world as unknown as { doodads: { weatherDress?: string }[] }).doodads.filter(d => d.weatherDress).length : 0;
    for (let i = 0; i < 60 * 5 && dressCount() === 0; i++) step(world, 1);
    check('I: the spoor dress PLANTS on the trail ground (kill-site bones)', dressCount() > 0, `${dressCount()} pieces`);
    hf.endHunt();
    for (let i = 0; i < 60 * 12 && dressCount() > 0; i++) step(world, 1);
    check('I: ending the hunt EVAPORATES every piece (no immortal litter)', dressCount() === 0, `${dressCount()} left`);
  }

  // THE BONE MASSIF: the region row + both kinds stand registered, and every
  // dress/skirt/crest kind they name resolves a visual (the massif is
  // wireable vocabulary the moment a tileset seats it).
  const boneWall = regionKind('bone_wall');
  check('I: the bone_wall region resolves (blind cover: shots thread, sight stops)',
    !!boneWall && !boneWall.walkable && boneWall.blocks
    && boneWall.blocksShot === false && boneWall.blocksSight === true);
  for (const kid of ['bone_heap', 'charnel_ring']) {
    const k = massKindOf(kid);
    check(`I: mass kind '${kid}' registered on bone_wall`, k.id === kid && k.region === 'bone_wall');
    const kinds = [...(k.skirt ?? []), ...(k.crest ?? []), ...(k.inner ?? [])].map(r => r.kind);
    check(`I: every '${kid}' dressing kind resolves a visual`, kinds.every(dk => !!DOODAD_VISUALS[dk]),
      kinds.filter(dk => !DOODAD_VISUALS[dk]).join(','));
  }

  // THE SPAWN GEOGRAPHY (SeatTuning.biomeMul): the lean is real — a seat spec
  // weighted 1000× toward the fields picks the field zone on a synthetic
  // two-zone view — and ABSENT IS IDENTICAL: an empty biomeMul row folds ×1
  // everywhere, so the pick stream is byte-identical with and without it.
  const fake = (id: string, biome: string, x: number): ZoneDef =>
    ({ id, biome, map: { x, y: 0 }, exits: [], objective: { kind: 'cull' }, level: 10 } as unknown as ZoneDef);
  const nodes = [fake('qa_downs', 'downs', 200), fake('qa_field', 'field', 210)];
  const view = {
    nodes, byId: Object.fromEntries(nodes.map(z => [z.id, z])), allNodes: nodes,
    currentZoneId: 'qa_downs', time: 0, census: {}, charLevel: 10,
    gates: new Map(), visited: new Set<string>(), surveyed: new Set<string>(),
    terrain: () => 'land' as const,
  } as unknown as OverlayView;
  const centered = { ...view, byId: { ...((view as { byId: object }).byId as object), qa_downs: fake('qa_downs', 'downs', 0) } } as unknown as OverlayView;
  const lean = pickSeat(centered, { event: 'hunt', biomeMul: { field: 1000 } }, new Rng(11));
  check('I: the biome lean is real (1000× field wins the synthetic draw)', lean?.id === 'qa_field', lean?.id);
  const bare = pickSeat(centered, { event: 'hunt' }, new Rng(7));
  const empty = pickSeat(centered, { event: 'hunt', biomeMul: {} }, new Rng(7));
  check('I: an absent biome row is byte-identical to none', bare?.id === empty?.id, `${bare?.id} vs ${empty?.id}`);
  check('I: the hunt def carries the fields-and-downs lean',
    (SURGE.seat.biomeMul?.field ?? 0) > 1 && (SURGE.seat.biomeMul?.downs ?? 0) > 1);
}

// --------------------------------- H. two trail systems never read as one
{
  // The hunt trail (World.huntFootprint) and the watch fabric's scent prints
  // (Actor.trail) are separate fabrics: reading a footprint must not print a
  // scent trail, and a printless walk must still read the footprint. The
  // player prints Actor.trail ONLY while a scent-posture watcher stands —
  // this zone holds none (devKillAll), so a clean dwell pins the separation.
  const steps = igniteHunt(world);
  const h = hf.peek();
  check('H: a fresh hunt stands for the separation rig', !!h, `${steps} steps`);
  if (h) {
    world.loadZone(h.currentZoneId);
    world.devKillAll();
    if (world.huntFootprintView()) {
      const read = dwellTrail(world);
      check('H: the dwell reads the trail with no scent-watcher standing', read);
      check('H: the read printed NO scent trail (Actor.trail stays empty)',
        (world.player.trail ?? []).length === 0, `${(world.player.trail ?? []).length} prints`);
    } else {
      check('H: the footprint stands for the separation rig', false);
    }
  }
}

console.log(failed ? `\nprobe_hunt: ${failed} FAILED` : '\nprobe_hunt: all green');
process.exit(failed ? 1 : 0);
