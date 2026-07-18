// ---------------------------------------------------------------------------
// THE TRAPWORKS KIT — the sunken city's mechanisms, as data.
//
// Rider rows (engine/tracks.ts registry) + tell/gap doodad rules for the
// trapworks fabric (engine/trapworks.ts). The debut kit is the JUNGLE
// SUNKEN RUIN set — the dead civilization whose defenses still run — but
// the grammar is open: a dwarven forge's piston row, a clockwork palace's
// scything pendulum are one row each, zero engine edits.
//
// DOCTRINE — the dead build no allegiance: NO faction spares on any payload
// here (contrast the Winter King's court, whose blades know their own).
// These machines predate every roster in the zone; the wardens survive them
// by READING them (imminentThreatTo), and baiting a pack into the mincer is
// the intended play. sparesAirborne stays default-true on everything — the
// leap over the rolling boulder is the whole fantasy.
//
// AGREEMENT CONTRACT (validation-pinned, the rime_flail doctrine): the
// ruin_fanblade's visual beamHw/beamHh (data/doodadVisuals.ts) mirror its
// rider surface hw/hh — the drawn arm IS the tested rect.
// ---------------------------------------------------------------------------

import { registerDoodadRule } from '../engine/levelgen';
import { registerTrackRider } from '../engine/tracks';

// --- THE RUIN SAWBLADE — the hallway buzzsaw --------------------------------
// A verdigris-bronze toothed wheel shuttling a carved groove down a corridor.
// Physical bite + bleed + a shove that matters mid-hall. Time the gap between
// blades or feed the pack to them.
registerTrackRider({
  id: 'ruin_sawblade',
  kind: 'ruin_sawblade',
  surface: { kind: 'circle', r: 24 },
  spin: 10,
  payload: {
    hit: { base: 22, perLevel: 7, type: 'physical' },
    status: { id: 'bleed', chance: 0.5 },
    impulse: 90,
    icdSec: 0.9,
  },
  warnAhead: 150,
  color: '#d0c084',
});

// --- THE RUIN FANBLADE — the room-spanning mincer ---------------------------
// A long bronze arm wheeling a hub (the rime flail's grammar at chamber
// scale): the whole room is the sweep, the safe ground is the hub's shadow
// and the corners. Heavy shove — the arm CARRIES bodies toward the walls.
registerTrackRider({
  id: 'ruin_fanblade',
  kind: 'ruin_fanblade',
  surface: { kind: 'rect', hw: 62, hh: 10 },
  orient: 'radial',
  payload: {
    hit: { base: 20, perLevel: 6, type: 'physical' },
    impulse: 300,
    icdSec: 0.8,
  },
  warnAhead: 170,
  color: '#d8c890',
});

// --- THE RUIN GREATBLADE — the ONE great arm --------------------------------
// A wheel that mounts a single enormous cleaver instead of a fan of arms:
// the room turns on one slow, unmistakable edge. Heavier bite, longer ICD,
// the longest warn arc in the kit — you always see it coming, and it still
// owns the floor it sweeps. (Mincer dial `greatBlade` swaps a wheel to this.)
registerTrackRider({
  id: 'ruin_greatblade',
  kind: 'ruin_greatblade',
  surface: { kind: 'rect', hw: 96, hh: 14 },
  orient: 'radial',
  payload: {
    hit: { base: 40, perLevel: 10, type: 'physical' },
    impulse: 360,
    icdSec: 1.2,
  },
  warnAhead: 260,
  color: '#e0d0a0',
});

// --- THE RUIN SWEEPARM — the arm that CARRIES -------------------------------
// A blunt bronze bar on the same wheeling grammar — the trap's OWN physics
// instead of its edge: push 'along' rides the lane's travel direction, so a
// caught body is batted AROUND the ring ahead of the bar (and everything
// pushActor already owns arrives free — weight scaling, wall wounds, pit
// lips WITH credit). Chip damage only; the ride is the payload.
registerTrackRider({
  id: 'ruin_sweeparm',
  kind: 'ruin_sweeparm',
  surface: { kind: 'rect', hw: 70, hh: 9 },
  orient: 'radial',
  payload: {
    hit: { base: 6, perLevel: 2, type: 'physical' },
    impulse: 480,
    push: 'along',
    icdSec: 0.7,
  },
  warnAhead: 190,
  color: '#b8a878',
});

// --- THE RUIN SCYTHE — the lattice's short arm ------------------------------
// A stubby wheeling blade for TILED floors (the bladeLattice archetype): each
// hub small enough that seams stay walkable, quick enough that the room
// reads as live machinery. Light bite + bleed; the danger is the FIELD.
registerTrackRider({
  id: 'ruin_scythe',
  kind: 'ruin_scythe',
  surface: { kind: 'rect', hw: 28, hh: 8 },
  orient: 'radial',
  payload: {
    hit: { base: 14, perLevel: 5, type: 'physical' },
    status: { id: 'bleed', chance: 0.35 },
    impulse: 120,
    icdSec: 0.8,
  },
  warnAhead: 130,
  color: '#d0c084',
});

// --- THE RUIN BOULDER — the loosed stone ------------------------------------
// One heavy mass on a ONCE-lane: the plate clicks, the cradle empties, the
// runway groove fills with rolling stone. Crushing bite + a real launch —
// bodies bowl down the hall ahead of it — then the far wall wins and the
// stone bursts (the once-lane terminal). Leap it, sidestep into a doorway,
// or let it clean the corridor for you.
registerTrackRider({
  id: 'ruin_boulder',
  kind: 'ruin_boulder',
  surface: { kind: 'circle', r: 30 },
  spin: 6,
  payload: {
    hit: { base: 34, perLevel: 9, type: 'physical' },
    impulse: 430,
    icdSec: 1.2,
  },
  warnAhead: 190,
  color: '#c0b088',
});

// --- THE RUIN DART — the volley's bolt --------------------------------------
// A quarrel on a fast once-lane. warnAhead 0 on purpose: the RAKE telegraph
// (the pending lane's full-path stroke) is the warning — once the bolts fly,
// they are consequence. Long ICD = one bite per body per bolt.
registerTrackRider({
  id: 'ruin_dart',
  kind: 'ruin_dart',
  surface: { kind: 'circle', r: 5 },
  payload: {
    hit: { base: 13, perLevel: 5, type: 'physical' },
    status: { id: 'poison', chance: 0.35 },
    icdSec: 2.0,
  },
  warnAhead: 0,
  color: '#d8cba0',
});

// --- Standing tells ---------------------------------------------------------
// The pressure plates: walk-through (overlap 'trigger') — a plate is floor,
// never furniture. The trapworks sweep owns the press (trapTriggerHit);
// these doodads are the TELL only.
registerDoodadRule('ruin_plate', { overlap: 'trigger' });
registerDoodadRule('ruin_plate_hidden', { overlap: 'trigger' });

// The sprung false floor — a TRUE pit: DoodadRule.fall routes everything
// after through the pitfall fabric (grasp at the lip, descend into the
// minted hollow, swallow with credit). blocksMove keeps gen parity and
// re-flows AI pathing around the fresh dark (the void_chasm convention:
// only the runtime mover knows the difference between stone and a long way
// down).
registerDoodadRule('ruin_floor_gap', { overlap: 'inert', blocksMove: true, fall: { region: 'chasm' } });

// The perched boulder at a runway's head — decor with a promise. The
// 'boulder' effect empties the cradle when the plate clicks.
registerDoodadRule('boulder_cradle', { overlap: 'trigger', spacing: 90 });

// The carved dart maw — the wall-face whose eye tracks the hall (the
// watcher-stone painter re-cut). Decor: the volley's rays are authored by
// the gen pass; the maw marks where they come from.
registerDoodadRule('dart_maw', { overlap: 'trigger', spacing: 60 });
