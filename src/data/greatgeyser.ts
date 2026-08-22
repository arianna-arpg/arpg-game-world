// ---------------------------------------------------------------------------
// THE GREAT GEYSER — THE SCALD BASIN's den (M3, the coda's first item; charter
// docs/design/scald-basin.md §0 card 4 RATIFIED — "THE GREAT GEYSER den with
// THE GEYSERMAW — beat-as-boss"; §2 the den row; §3 THE BEAT LAW + THE BROIL
// LAW; §8 the Geysermaw line; §8b THE NO-TAG LAW; §13 M3).
//
// The den lane, on the standing grammar (the lair fabric — engine/lairs.ts,
// data/lairs.ts; docs/engine/lairs.md "Authoring a new lair"), composed from
// registries — nothing here is machinery:
//   · registerLair        — WHERE: scald surface ground, level 8+ (DIAL), a
//                           modest chance (DIAL) — the den is a discovery;
//   · registerLandmark    — WHAT stands at the seat: THE MOUTH — a
//                           `vent_den_mouth` apron (this file's builder: the
//                           den_mouth grammar + ONE authored GREAT vent beside
//                           the door — the country's LOUDEST vent, so the den
//                           is FOUND by ear and eye: the broil and the plume,
//                           never a map mark), spoor-dressed in steam, sinter
//                           and crust;
//   · registerDoodadRule  — the mouth doodad (`geyser_maw`) + its visuals row;
//   · registerSidezone    — the minted den country behind the door: the
//                           `great_geyser` tileset (data/tilesets.ts) through
//                           the `ventcauldron` recipe (engine/ventcauldron.ts)
//                           — one great vent at the heart on a boss-tempo
//                           clock, the Geysermaw seated IN it (THE BOSS SEAT),
//                           the ask = the boss, noDeeper, the gateway ledger
//                           `great_geyser_entered` (run; merged to the account
//                           — the gleam_entered precedent);
//   · registerKillHandler — `geysermaw_slain` stamped run + account at the kill;
//   · registerZoneInfoSource — THE OMINOUS LINE (the colossal-lair doctrine):
//                           charted scald ground that SEATED the den murmurs
//                           one mechanics-quiet condition row — no map mark.
// The maw itself (MonsterDef.ventDweller — engine/ventDweller.ts) lives in
// data/monsters.ts / looks.ts / skills.ts; the recipe leaf in engine/.
// Every number is a DIAL (unblessed — she blesses via playthroughs).
// Docs: docs/engine/greatgeyser.md. Probe: balance/probe_den.ts.
// ---------------------------------------------------------------------------

import { vec } from '../core/math';
import { LAIR_CFG, registerLair } from '../engine/lairs';
import {
  registerDoodadRule, registerLandmark, registerLandmarkBuilder, type DoodadKind,
} from '../engine/levelgen';
import { Mask, bearingNoise, radial } from '../engine/genkit';
import { registerKillHandler } from '../engine/killHandlers';
import { registerSidezone } from './sidezones';
import { mintCave } from '../engine/worldgen';
import { registerZoneInfoSource } from '../world/zoneInfo';
import { DOODAD_VISUALS } from './doodadVisuals';
import type { GeyserClassId } from '../engine/geysers';
import type { World } from '../engine/world';

/** THE GREAT GEYSER's dials — all DIAL. */
export const GREAT_GEYSER_CFG = {
  /** The lair seat: scald surface ground, from this level (fading in below),
   *  at this per-zone chance (the den reads as a discovery, never a belt). */
  seat: { level: { from: 8, fadeIn: 3 }, chance: 0.14 },
  /** THE MOUTH: the door's body radius, the apron footprint band, and how
   *  far beside the door THE LOUDEST VENT stands (its great column (r 62)
   *  must clear the dwell spot; its burn rain rings the apron — entering
   *  the den means reading the beat). */
  mouth: { radius: 26, size: [230, 310] as [number, number], ventClear: 124 },
  /** The mouth-side vent's class + clock: a great metronome on its own
   *  band (the loudest vent in the country — period DIAL). */
  vent: { cls: 'great' as GeyserClassId, period: [70, 90] as [number, number] },
  /** The den's name (fixed — the frostmaw idiom) and the ledger keys
   *  (cross-file contracts: never rename). */
  name: 'the Great Geyser',
  ledgerEntered: 'great_geyser_entered',
  ledgerSlain: 'geysermaw_slain',
  /** The den's authored fauna (the NEST_FAUNA lesson — without rows a minted
   *  pocket grows plains wildlife): the shoal frenzies in the pools, newts
   *  sun at the prism rims. */
  fauna: [
    { id: 'kettle_minnow', chance: 0.85, count: [4, 8] as [number, number], near: 'sulphur_pool' },
    { id: 'pool_newt', chance: 0.6, count: [2, 4] as [number, number], near: 'prism_pool' },
  ],
} as const;

// --- THE MOUTH (the door doodad + its drawn face) ---------------------------

registerDoodadRule('geyser_maw', { overlap: 'trigger', spacing: 60 });
// The parameterized caveMouth painter reskinned (the frostmaw_maw idiom —
// fixed palette on purpose: a lair mouth reads as ITSELF anywhere): a sinter
// throat, travertine lips, the steam-glow of the throat beneath.
DOODAD_VISUALS['geyser_maw'] = {
  painter: 'caveMouth', order: 55,
  params: {
    color: '#8a9a92', edge: '#e4eee8', material: 'stone',
    glow: '#9fe0e8', throat: '#1a2a30', teeth: {},
  },
  light: { radius: -2, color: '#9fe0e8', intensity: 0.32, flicker: 2.4 },
};

// --- THE VENT DEN MOUTH builder --------------------------------------------
// The den_mouth grammar (engine/landmarkBuilders.ts): a trodden apron, the
// spoor ring on its outer band, the mouth centered — PLUS one authored GREAT
// vent beside the door through the geyser fabric's authoring seam
// (GenCtx.authoredVents → World.bootGeysers anchors it on its OWN band: the
// metronome law). The seat is the builder's promise: it stands `ventClear`
// from the mouth along a rolled bearing, inside the apron (clearSite keeps
// the footprint clean, so bootGeysers' clearSeat finds the ground walkable
// and solid-free); the apron is reserved so later rolls route around it.
registerLandmarkBuilder('vent_den_mouth', (b) => {
  const { rng, r } = b;
  const apron = Mask.forRect(b.rect.x, b.rect.y, b.rect.w, b.rect.h);
  radial(apron, b.center.x, b.center.y, (a) => r * 0.82 + bearingNoise(a, 0.1 * r, rng.int(0, 1 << 30)));
  const ventClear = b.param('ventClear', GREAT_GEYSER_CFG.mouth.ventClear);
  const ventCls = b.param<GeyserClassId>('ventCls', GREAT_GEYSER_CFG.vent.cls);
  const periodBand = b.param<[number, number]>('ventPeriod', GREAT_GEYSER_CFG.vent.period);
  // THE LOUDEST VENT: its bearing + clock roll first (the draw-order contract).
  const ventAng = rng.range(0, Math.PI * 2);
  const ventPeriod = rng.range(periodBand[0], periodBand[1]);
  const ventPhase = rng.next();
  const ventPos = vec(b.center.x + Math.cos(ventAng) * ventClear, b.center.y + Math.sin(ventAng) * ventClear);
  // The spoor: {kind, count, radius} rows on the apron's outer band — never
  // crowding the door OR the vent (the annulus keeps the dwell spot honest;
  // the vent's mouth disc stays clear for the seat).
  const dress = b.param('dress', [] as { kind: DoodadKind; count: [number, number]; radius: [number, number] }[]);
  for (const row of dress) {
    for (let i = 0, k = rng.int(row.count[0], row.count[1]); i < k; i++) {
      const a = rng.range(0, Math.PI * 2), d = rng.range(r * 0.42, r * 0.8);
      const pos = vec(b.center.x + Math.cos(a) * d, b.center.y + Math.sin(a) * d);
      const rad = rng.range(row.radius[0], row.radius[1]);
      if (Math.hypot(pos.x - ventPos.x, pos.y - ventPos.y) < 64 + rad) continue;
      b.ctx.doodads.push({ pos, radius: rad, kind: row.kind, rot: rng.range(0, Math.PI * 2) });
    }
  }
  const mouthKind = b.param<string | undefined>('mouthKind', undefined);
  if (mouthKind) {
    b.ctx.doodads.push({
      pos: vec(b.center.x, b.center.y),
      radius: b.param('mouthRadius', LAIR_CFG.mouth.radius),
      kind: mouthKind as DoodadKind, rot: 0,
    });
  } else {
    console.warn(`[greatgeyser] vent_den_mouth landmark '${b.def.id}' has no mouthKind param — an apron with no door`);
  }
  (b.ctx.authoredVents ??= []).push({ pos: ventPos, cls: ventCls, period: ventPeriod, phase: ventPhase });
  b.interior = apron;
});

registerLandmark({
  id: 'great_geyser_mouth_site', builder: 'vent_den_mouth', size: GREAT_GEYSER_CFG.mouth.size,
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'geyser_maw',
    mouthRadius: GREAT_GEYSER_CFG.mouth.radius,
    ventClear: GREAT_GEYSER_CFG.mouth.ventClear,
    // THE SPOOR (steam, sinter, crust): the den confesses itself from across
    // the ring — standing kinds only, the kit's own furniture.
    dress: [
      { kind: 'steam_pocket', count: [2, 4], radius: [18, 28] },
      { kind: 'sinter_cone', count: [1, 3], radius: [14, 22] },
      { kind: 'sinter_shelf', count: [2, 3], radius: [26, 38] },
      { kind: 'sulphur_crust', count: [1, 2], radius: [24, 34] },
    ],
  },
});

// --- THE DEN behind the door -----------------------------------------------

registerSidezone({
  kind: 'geyser_maw',
  dwell: LAIR_CFG.mouth.dwell,
  ledgerOnEnter: GREAT_GEYSER_CFG.ledgerEntered,
  mint: ({ parent, seed, id }) => {
    const def = mintCave(parent, seed, id, 'great_geyser', {
      rollVariant: true,
      name: GREAT_GEYSER_CFG.name,
      objective: { kind: 'boss', id: 'geysermaw' },
      noDeeper: true,
    });
    // THE OPEN-SKY CAULDRON (the roost's idiom): skyOf honors an explicit
    // def sky over the caveDepth derivation — the basin is a sunken bowl,
    // not a cave; steam rises to real weather.
    def.sky = 'open';
    def.fauna = GREAT_GEYSER_CFG.fauna.map(r => ({ ...r, count: [r.count[0], r.count[1]] as [number, number] }));
    return def;
  },
});

registerLair({
  id: 'great_geyser',
  landmark: 'great_geyser_mouth_site',
  seat: {
    biomes: ['scald'],
    place: 'surface',
    level: { from: GREAT_GEYSER_CFG.seat.level.from, fadeIn: GREAT_GEYSER_CFG.seat.level.fadeIn },
    chance: GREAT_GEYSER_CFG.seat.chance,
  },
});

// --- THE LEDGER: the maw's fall (run + account — knowledge that outlives
//     the run; the gleamhollow's gateway idiom on the kill side) -----------
registerKillHandler({
  id: 'geysermaw_fall',
  when: ctx => ctx.actor.defId === 'geysermaw',
  run: ctx => {
    ctx.bumpLedger(GREAT_GEYSER_CFG.ledgerSlain);
    ctx.bumpAccountLedger(GREAT_GEYSER_CFG.ledgerSlain, 1, true);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 44), 'The Geysermaw falls — and the great throat goes quiet.', '#9fe0e8', 15);
  },
});

// --- THE OMINOUS LINE (the colossal-lair doctrine: no map mark, no
//     world-graph node) — charted scald ground whose baked mint SEATED the
//     den roll murmurs one mechanics-quiet condition row. It never says
//     whether the chance landed the door; the beat you hear is the walk's.
registerZoneInfoSource((world: World, zoneId: string) => {
  if (!world.visited.has(zoneId)) return [];
  const def = world.zoneMap[zoneId];
  if (!def?.landmarks?.some(r => r.landmark === 'great_geyser_mouth_site')) return [];
  return [{
    kind: 'condition' as const, icon: '≋', color: '#9fe0e8',
    label: 'the ground here keeps a louder beat',
    detail: 'somewhere in this country a throat breathes slower and deeper than the rest',
    z: -1,
  }];
});
