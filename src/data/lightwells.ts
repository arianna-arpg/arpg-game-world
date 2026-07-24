// ---------------------------------------------------------------------------
// LIGHTWELL ROWS — which lights count as SURVIVAL infrastructure, as data.
//
// The fabric lives in engine/lightwells.ts (docs/engine/gloaming.md); these
// rows opt existing ambient light-source doodads into it. Per-kind data
// decides the bargain: the hearth rows burn WEAK BUT STEADY (no pool — a
// campfire is shelter, not a consumable), while finite pools ride the
// Gloaming's spawned kindles, the player's wicks, and any AMBIENT kind that
// declares one: authored doodads whose row carries pool/burst get their well
// state attached at zone load (World.attachZoneWells — host/solo only; co-op
// clients ADOPT the state onto their ZoneMsg doodads through the 20 Hz wells
// wire, matched by kind + position). Within the zone-memory TTL a drained
// gourd stays drained and a guttered one stays gone; when the world forgets
// the zone, the lights are lit again.
//
// Feed rates are tuned against the Gloaming's drain (GLOAMING_SURGE): a
// full-gloom drain of ~6/s means a campfire refills you at ~+1 net while
// the street-lamp's wide dim pool only slows the bleed — lamplight is a
// road, not a home. Outside a darkness event no LIGHT meter exists, so
// every row here is inert (the sweep feeds only meters that exist).
// ---------------------------------------------------------------------------

import { registerLightwell } from '../engine/lightwells';
import { registerDoodadRule } from '../engine/levelgen';

// Hearthfire — the strong holds: stand IN the fire's pool and the dark backs off.
registerLightwell({ kind: 'campfire', feed: 7 });
registerLightwell({ kind: 'brazier', feed: 6 });
registerLightwell({ kind: 'hearth', feed: 8 });

// Lamplight — wide, dim, civic: the lit road slows the bleed, it doesn't heal it.
registerLightwell({ kind: 'lantern_post', feed: 4 });
registerLightwell({ kind: 'lantern_totem', feed: 3.5 });

// Small flames — a gourd-grin or a starmoth cage is a candle against the tide.
// THE GOURD IS THE POOLED-AMBIENT DEBUT: a candle-stub in a pumpkin holds
// ~40 resident-seconds and then dies where it stands (attached at zone load,
// wire-adopted in co-op) — and the snuffwicks drink it too: defend the
// pumpkin or lose the porch light. No decay: only mouths empty it.
registerLightwell({
  kind: 'jack_o_lantern', feed: 3, pool: 40,
  out: { text: 'the gourd-light dies', color: '#e8a050' },
});
registerLightwell({ kind: 'star_lantern', feed: 3 });

// --- The POOLED kinds (runtime-spawned; state attached at spawnLightwell) ---

// THE GLOOMWELL — the Gloaming's own mercy: flares up through the murk on the
// event's cadence, feeds fast, and holds ~26 resident-seconds of burn. Two
// heroes drink it dry in half the time, and the snuffwicks drink it too.
// decayPerSec: an ABANDONED gloomwell gutters in ~75s — the dark reclaims
// its mercy, and a well nobody drinks stops hogging the event's spawn cap
// (the party outran their old lights; fresh ones can flare where they are).
registerLightwell({
  kind: 'gloomwell', feed: 9, pool: 26, drainPerResident: 1, decayPerSec: 0.35,
  dimExp: 0.5, minReachFrac: 0.25,
  out: { text: 'the light gutters out…', color: '#8a7ab8' },
});

// THE KINDLED WICK — the player-planted votive (the Kindle skill): smaller
// pool, humbler reach, yours to place. Caster investment scales the pool
// through spawnLightwell's poolMul (effectDuration folds in at plant time).
registerLightwell({
  kind: 'kindled_wick', feed: 7, pool: 18, dimExp: 0.5, minReachFrac: 0.25,
  out: { text: 'the wick is spent', color: '#c8b088' },
});

// THE GUTTERGLOW MOTE — the kill-shed light (the Gutterglow support gem's
// proc, data/procs.ts): a brief flame standing where the slain fell. Small
// pool, quick decay — an abandoned mote gutters in ~12s, so the fight is
// the lantern and the lantern follows the fight; no corpse-trail of lamps
// outlives the war that lit it (the transience doctrine in miniature).
registerLightwell({
  kind: 'gutterglow_mote', feed: 6, pool: 10, decayPerSec: 0.8,
  dimExp: 0.5, minReachFrac: 0.25,
  out: { text: 'the mote gutters', color: '#e8c078' },
});

// --- Runtime doodad rules (the creeps.ts registerDoodadRule idiom — open
// string kinds, no KnownDoodadKind union edit): both are walk-over trigger
// bodies like the Descent's light_spot, never colliders. ---
registerDoodadRule('gloomwell', { overlap: 'trigger', spacing: 60 });
registerDoodadRule('kindled_wick', { overlap: 'trigger', spacing: 50 });
registerDoodadRule('gutterglow_mote', { overlap: 'trigger', spacing: 24 });
