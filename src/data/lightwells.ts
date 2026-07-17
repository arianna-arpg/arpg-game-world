// ---------------------------------------------------------------------------
// LIGHTWELL ROWS — which lights count as SURVIVAL infrastructure, as data.
//
// The fabric lives in engine/lightwells.ts (docs/engine/gloaming.md); these
// rows opt existing ambient light-source doodads into it. Per-kind data
// decides the bargain: today every ambient row burns WEAK BUT STEADY (no
// pool — a campfire is shelter, not a consumable), while the Gloaming's own
// spawned kindles and the player's wicks carry finite pools (registered
// beside their kinds). A future pooled AMBIENT kind is one `pool` field —
// but note pooled state is attached at spawnLightwell today, so opening that
// seam means answering the zone-load + co-op wire question for authored
// doodads first.
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
registerLightwell({ kind: 'jack_o_lantern', feed: 3 });
registerLightwell({ kind: 'star_lantern', feed: 3 });

// --- The POOLED kinds (runtime-spawned; state attached at spawnLightwell) ---

// THE GLOOMWELL — the Gloaming's own mercy: flares up through the murk on the
// event's cadence, feeds fast, and holds ~26 resident-seconds of burn. Two
// heroes drink it dry in half the time, and the snuffwicks drink it too.
registerLightwell({
  kind: 'gloomwell', feed: 9, pool: 26, dimExp: 0.5, minReachFrac: 0.25,
  out: { text: 'the light gutters out…', color: '#8a7ab8' },
});

// THE KINDLED WICK — the player-planted votive (the Kindle skill): smaller
// pool, humbler reach, yours to place. Caster investment scales the pool
// through spawnLightwell's poolMul (effectDuration folds in at plant time).
registerLightwell({
  kind: 'kindled_wick', feed: 7, pool: 18, dimExp: 0.5, minReachFrac: 0.25,
  out: { text: 'the wick is spent', color: '#c8b088' },
});

// --- Runtime doodad rules (the creeps.ts registerDoodadRule idiom — open
// string kinds, no KnownDoodadKind union edit): both are walk-over trigger
// bodies like the Descent's light_spot, never colliders. ---
registerDoodadRule('gloomwell', { overlap: 'trigger', spacing: 60 });
registerDoodadRule('kindled_wick', { overlap: 'trigger', spacing: 50 });
