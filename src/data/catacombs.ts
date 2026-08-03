// ---------------------------------------------------------------------------
// THE CATACOMBS — the second under-country (batch 24: THE ROOTED WEB's proof
// of generality). The downs are barrow country: the turf is a lid, and the
// dead below keep their own architecture. This file is the WHOLE kit, and
// deliberately so — every seam it touches is a REGISTERED row on a fabric
// the garden debuted, so a third country is another file like this one and
// zero engine words:
//
//   · THE CRYPTS (the in-zone under-story): an UNDER_TIER_LANES row
//     (engine/tiers.ts — the sewer/roots vocabulary) sinking bone galleries
//     beneath the heath's own floor, entered in place down a lych stair.
//     Dialed per downs face via `underTier: 'crypts'` + `underTierChance`
//     (data/tilesets.ts — the barrowfield runs thickest, the grey tors
//     thinnest: stone country keeps fewer dead).
//   · THE NAMED DOOR (crypt_gate): the taproot_gate's law in downs tongue —
//     a scattered sidezone door DOWN into a minted catacombs pocket, pulled
//     into the crypt galleries by the lane's own deep-door relocation
//     (doorTier 'seat': drawn == dwelled from below).
//   · THE LYCH WAY (the cross-node span): an UnderSpanPolicy row
//     (data/underspans.ts) — the corpse-road of the old downs, one shared
//     under-zone with a mouth in several map nodes. The row carries the
//     country's WHOLE shape: its own mouth landmark, its own sealed-partner
//     kind (barrowheld, data/zoneKinds.ts), its own omen voice, and span
//     policy numbers that read nothing like the garden's — RARER (not every
//     mound is a door), LONGER (a processional strings barrows), OLDER
//     (the dead prefer standing ground to fresh), and mostly SEALED (the
//     vault-barrow set-piece is the norm, not the coin-flip).
//
// VOCABULARY LAW: the CRYPTS are the tier (galleries under this zone), the
// LYCH WAY is the span (the corpse-road crossing below), the CATACOMBS are
// the pocket (the under-country tileset both doors open — data/tilesets.ts,
// which also carries its banded caveFace claim on the downs' shallows).
// Docs: docs/engine/worldweb.md. Probes: balance/probe_tiers.ts RIG N2 +
// balance/probe_ugspan.ts section G.
// ---------------------------------------------------------------------------

import { registerDoodadRule, registerLandmark, registerStamp, stampSingle } from '../engine/levelgen';
import { mintCave } from '../engine/worldgen';
import { registerGenPin } from '../engine/genPins';
import { registerRegion } from '../world/regions';
import { registerUnderTier } from '../engine/tiers';
import { registerSidezone } from './sidezones';
import { registerUnderSpan, spanPocketMint } from './underspans';

// --- THE CRYPT REGIONS ----------------------------------------------------------
// The sewer/root family in bone: the heath above keeps its own face (no
// visual on the duct — the turf is the lid), the shelf-walled gallery below
// shows only through the tier veil. Tones from the ossuary's own palette so
// the drawn story reads as kept stone, not bored loam.
registerRegion({ id: 'crypt_duct', walkable: true, blocks: false, label: 'the crypts',
  tier: 1,
  tierVisual: { fill: '#16120c', edge: '#5a5142' } });
// LYCH WELL: the crypts' crossing — a slab-ringed descent between the turf
// and the gallery (walkable both tiers, flips on exit). Reads as a dark
// kerbed mouth from above.
registerRegion({ id: 'crypt_well', walkable: true, blocks: false, label: 'the lych well',
  tier: 1, tierLink: true,
  visual: { fill: '#1d1812', alpha: 0.95, edge: { color: '#5a5142', width: 4 } },
  tierVisual: { fill: '#241f16', edge: '#7a705c' } });

// --- THE CRYPTS LANE (the under-tier vocabulary's third row) ---------------------
// Same carver as the drains and the roots (engine/tiers.ts carveUnderTier);
// only the dress differs — and the dress is the whole point: counted bones,
// sealed urns, the odd cairn, cobwebs where the living never sweep. The
// dead stay dry: the forbid list keeps every gallery out of the wet (a pond
// keeps its floor; a chasm keeps its fall).
registerDoodadRule('crypt_stair', { overlap: 'inert', spacing: 40 });
registerUnderTier('crypts', {
  duct: 'crypt_duct', well: 'crypt_well', stairKind: 'crypt_stair',
  label: 'the crypts', packSplit: 0.3,
  forbid: ['water', 'bog', 'swamp', 'lava', 'chasm', 'ice'],
  deepDoorKinds: ['crypt_gate'], doorTier: 'seat', portClear: 150,
  kit: [
    { kind: 'bone_pile', count: [4, 8], radius: [10, 16] },
    { kind: 'burial_urn', count: [3, 6], radius: [9, 13] },
    { kind: 'bone_cairn', count: [1, 3], radius: [10, 14] },
    { kind: 'web', count: [1, 3], radius: [16, 28] },
    { kind: 'rubble', count: [1, 2], radius: [12, 20] },
  ],
});

// --- THE NAMED DOOR (crypt_gate → the catacombs pocket) --------------------------
// The taproot_gate's seam in downs tongue: every gate keeps its own vault
// forever (position-hash seed), each mint rolls its own face, and
// 'catacombs_entered' is the gateway seam (the sewers_entered pattern) for
// future packages, unlock doors and bounty lines. Planted by the downs'
// common rows (data/tilesets.ts) — whatever face the heath shows, somewhere
// the turf has a door in it.
registerDoodadRule('crypt_gate', { overlap: 'trigger', spacing: 420 });
registerStamp('crypt_gate', stampSingle('crypt_gate', [15, 19]));
registerSidezone({
  kind: 'crypt_gate',
  dwell: 0.7,
  ledgerOnEnter: 'catacombs_entered',
  mint: ({ parent, seed, id }) => mintCave(parent, seed, id, 'catacombs', { rollVariant: true }),
});

// --- THE LYCH WAY MOUTH -----------------------------------------------------------
// The span's floor-door: kerbstones and old markers round a descent, kin to
// the crypt gate but a DIFFERENT kind on purpose — this mouth CROSSES, and
// the player should learn the difference at a glance (the rootway_gate law).
// Planted by the den_mouth builder as a forced landmark, one roll per span
// membership — no static row names it, so the id is pinned (genPins, the
// windlass_ring precedent); the span pass stamps rolls by the policy row's
// `mouth` field below.
registerDoodadRule('lychway_gate', { overlap: 'trigger', spacing: 300 });

export const LYCHWAY_MOUTH_LANDMARK = registerGenPin('landmark', 'lychway_mouth',
  'the rooted web, second country: World.underSpanPass forces one roll per downs span membership');

registerLandmark({
  id: LYCHWAY_MOUTH_LANDMARK, builder: 'den_mouth', size: [150, 210],
  clearSite: true, poi: true, mustReach: true,
  params: {
    mouthKind: 'lychway_gate',
    dress: [
      { kind: 'tombstone', count: [2, 4], radius: [10, 15] },
      { kind: 'bone_pile', count: [1, 3], radius: [10, 16] },
      { kind: 'burial_urn', count: [0, 2], radius: [9, 12] },
    ],
  },
});

// The span mouth opens the ONE shared catacombs pocket — the fabric's own
// pocket law (seat-canonical, one exit per member, objective 'none' forced:
// no seal may hold a crossing shut), through the exported helper so this row
// can never drift from the garden's.
registerSidezone({
  kind: 'lychway_gate',
  dwell: 0.8,
  ledgerOnEnter: 'lychway_entered',
  spanMouth: true,
  mint: spanPocketMint('catacombs', 'the ways of the dead'),
});

// --- THE DOWNS ROW (the corpse-road policy) ---------------------------------------
// The jungle test in numbers, against the garden's {0.22, [1,2], 150, 0.55,
// 0.5}: the lych ways are RARER (one mound in six), run FARTHER (reach 2-3
// members over ~3.3× the downs' 92u spacing — a processional, never a
// dooryard), prefer STANDING ground (fresh 0.4 — the dead were buried where
// the living already walked), and seal MOST of what they mint fresh
// (exitless 0.75 — the vault-barrow whose only door is below is the downs'
// signature discovery, where the garden flips a coin).
registerUnderSpan({
  biome: 'downs',
  chance: 0.16,
  reach: [2, 3],
  radius: 300,
  fresh: 0.4,
  exitless: 0.75,
  mouth: LYCHWAY_MOUTH_LANDMARK,
  heldKind: 'barrowheld',
  omen: {
    color: '#c8bfa8',
    lines: [
      'the old processional runs deeper than the turf…',
      'the dead of this mound were carried somewhere else…',
      'a corpse-road threads below, mound to mound…',
    ],
  },
});
