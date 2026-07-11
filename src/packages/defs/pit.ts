// ---------------------------------------------------------------------------
// THE PIT — a PURCHASED PLACE: the endless wave arena, re-dug beneath the town.
//
// The cellar under Lastlight's spare house exists for everyone; BUYING this
// package breaks open its floor — a stone maw (pit_entrance) is FURNISHED
// into the cellar at mint, and dwelling on it drops you into The Pit: a
// standalone, off-graph wave gauntlet whose level re-stamps from the
// CHARACTER on every entry (levelWith) and never ends. It is a room of the
// town's own stone (Lastlight's theme, lantern-lit), not a cave; off-graph
// means no events, no invasions, no weather, no encounters — the world
// cannot follow you down. The only way out is the way you came in.
//
// pressureless: owning The Pit shifts NO world-event pressure — it's a place,
// not an event, so it never joins the weight budget or dilutes the mix. No
// sliders either; the purchase itself is the unlock (defaultEnabled false +
// isConfigured = it enters the manifest ON once bought, toggleable per run).
// ---------------------------------------------------------------------------

import { registerSidezone } from '../../data/sidezones';
import { START_ZONE, ZONES } from '../../data/zones';
import type { ZoneDef } from '../../data/zones';
import { registerDoodadRule } from '../../engine/levelgen';
import type { ContentPackage } from '../types';

/** Everything tunable about the arena, in one place. */
const PIT_ARENA = {
  size: { w: 2300, h: 1550 },
  /** Boss cadence — the objective's own data (any arena declares its lord). */
  bossEveryWaves: 5,
  bossId: 'pit_lord',
  /** Dwelling the maw is a touch more deliberate than a cave mouth. */
  entryDwell: 0.7,
  /** Where the maw breaks the cellar floor (cellar space, on the slab). */
  maw: { x: 320, y: 168 },
};

function mintPit(parent: ZoneDef, seed: number, id: string, level: number): ZoneDef {
  return {
    id, name: 'The Pit',
    level: Math.max(1, level), // re-stamped from the hero on every entry (levelWith)
    size: { ...PIT_ARENA.size },
    // The town's own stone — lamplit earth tones, not cavern dark. The Pit is
    // a room UNDER Lastlight, and it reads like one.
    theme: { ...ZONES[START_ZONE].theme, dayLight: 0.9 },
    layout: [
      { kind: 'rocks', count: [6, 9], radius: [24, 44] },
      { kind: 'lantern_post', count: [4, 6] },
    ],
    // Endless waves; the lord every 5th. No packs — spawnWave escalates from
    // the flat WAVE_TABLE, and the wave rework reads zone.level (the hero's).
    objective: { kind: 'waves', waves: 0, bossEveryWaves: PIT_ARENA.bossEveryWaves, bossId: PIT_ARENA.bossId },
    exits: [{ to: parent.id, side: 'n' }], // the ONLY way out — back up to the cellar
    map: { x: parent.map.x, y: parent.map.y }, // off-graph; type-required
    seed,
    caveDepth: (parent.caveDepth ?? 0) + 1,
  };
}

// The maw is a sidezone entrance like any other (data/sidezones.ts): the
// registration is unconditional at boot, but the DOODAD only exists where the
// package furnished one — so an unpurchased run simply never has a maw.
// The doodad rule keeps the entrance a real TRIGGER (walk-through, spaced) —
// without it the validator flags a rule-less legend kind and future placement
// systems would stack clutter on the arena's only way in.
registerDoodadRule('pit_entrance', { overlap: 'trigger', spacing: 40 });
registerSidezone({
  kind: 'pit_entrance',
  dwell: PIT_ARENA.entryDwell,
  levelWith: 'character',
  mint: ({ parent, seed, id, playerLevel }) => mintPit(parent, seed, id, playerLevel),
});

export const PIT: ContentPackage = {
  id: 'pit',
  label: 'The Pit',
  blurb: 'Break open the cellar floor. Below it waits the old arena — endless waves that hunt as one pack, scaled to whoever dares them, the Pit Lord every fifth. Nothing of the world above follows you down; the only way out is the way in.',
  color: '#c8a84b',
  cost: 140,
  // DISCOVERY: finding the cellar surfaces the purchase (the delvers_seen
  // pattern) — you stood over the maw's ground before you could own it.
  unlock: {
    id: 'pit_unlock',
    label: 'Discover the cellar beneath Lastlight',
    test: (ctx) => (ctx.ledger.cellar_entered ?? 0) >= 1,
  },
  modifiers: [],          // no sliders — a place, not an event
  defaultWeight: 0,
  defaultStartLevel: 0,
  defaultEnabled: false,  // opt-in: the purchase IS the unlock
  pressureless: true,
  furnish: [{
    sidezone: 'cellar_hatch',
    fixture: { structure: 'pit_maw', x: PIT_ARENA.maw.x, y: PIT_ARENA.maw.y },
  }],
};
