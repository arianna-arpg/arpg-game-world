// ---------------------------------------------------------------------------
// MIGRATION — a living-world BEAST HERD that crosses the plains (a net-new package).
//
// On a slow tick a herd of the wild 'beast' faction gathers at one Field biome and
// GRAZES, then sets off MIGRATING toward another, far Field — a growing directional
// band drawn across the map (like a Stormfront anchored at one end that lengthens to
// the other). Any zone the band rolls over gets a constant directional FLOW of the
// herd ambling through. The herd is NEUTRAL until a member is struck — then the
// ADULTS gore while the YOUNG flee (the scaleVariance juvenile brains + the engine's
// group rouse). After it arrives the band CULLS from the origin end forward until the
// herd is gone: a minor, ambient bit of time pressure, the world living on its own.
//
// It fields a DEDICATED 'beast' faction (contexts:['migration'] keeps it out of all
// ordinary generation). Discovered in play (runs at defaults; the Vault unlock gates
// TUNING), like Deadwake / Descent / Hunt. The whole mechanic — ignition cadence,
// graze/march/cull timings, band radii, the herd roster, and the variants — is DATA
// on the surge below, so it tunes + extends without touching the engine.
// ---------------------------------------------------------------------------

import { MigrationField, type MigrationSurge } from '../overlays/migration';
import type { ContentPackage, FactionSpec } from '../types';

/** The whole Migration mechanic as data — every number is a knob. */
const MIGRATION_SURGE: MigrationSurge = {
  igniteChance: 0.02,        // per 0.5s step — an OCCASIONAL crossing (gated by ≥2 fields)
  maxConcurrent: 2,          // up to two herds crossing the map at once
  grazeSeconds: [40, 95],    // it lingers at the origin Field before setting off…
  marchSpeed: 7,             // …then crawls across the map (node-units/sec) — slow + vast
  cullDelaySeconds: 25,      // it dwells at the destination before the flow recedes…
  cullSpeed: 9,              // …then the band culls tail-first, a touch faster than it came
  radius: 60,                // default band half-width (a broad front; variants override)
  faction: 'beast',
  // The herd ROSTER — the three plains beasts (each rolls a SCALE: big adults gore,
  // small young flee). Aurochs + striders are the bulk; the great tuskers are rarer.
  roster: [
    { id: 'migration_aurochs', weight: 5 },
    { id: 'migration_strider', weight: 4 },
    { id: 'migration_tusker', weight: 2 },
  ],
  levelBonus: 0,             // at the zone's own level (the radial difficulty field stands)
  streamInterval: 1.1,       // a steady amble (slower than a hostile flood)…
  streamBatch: [1, 2],       // …1-2 beasts per pour
  rouseRadius: 240,          // strike a member ⇒ the ADULTS within this turn on you
  // The FLAVOURS a fresh crossing rolls — a sweeping Great Migration vs a small drove.
  variants: [
    { id: 'great', name: 'Great Migration', weight: 2, streamCap: 14, radius: 80, color: '#c69a52' },
    { id: 'herd', name: 'Roaming Herd', weight: 4, streamCap: 9, radius: 58, color: '#b08a4a' },
    { id: 'drove', name: 'Small Drove', weight: 3, streamCap: 6, radius: 44, color: '#9c7a40' },
  ],
  color: '#b08a4a',
  scoutMargin: 520,          // scout ~half a screen past charted ground for Field blobs
};

/** THE WILD HERDS — the plains 'beast' faction. contexts:['migration'] keeps them out
 *  of ordinary generation; they appear ONLY as a passing herd. No warlord, no
 *  relations — pure ambient content (seedWar auto-suppressed by factionGen). */
const BEAST_FACTION: FactionSpec = {
  id: 'beast',
  name: 'the Wild Herds',
  color: '#b08a4a',
  traits: { roaming: 0.8, aggression: 0.5, warlordHome: 'capital', contexts: ['migration'] },
  roster: [
    { id: 'migration_aurochs', weight: 5 },
    { id: 'migration_strider', weight: 4 },
    { id: 'migration_tusker', weight: 2 },
  ],
};

export const MIGRATION: ContentPackage = {
  id: 'migration',
  label: 'Migration',
  blurb: 'The plains live and breathe on their own. Herds of wild beasts gather on the open Fields and migrate across the world toward distant grasslands, a great directional tide drawn over the map. Any ground they cross fills with a constant flow of ambling beasts — placid until you strike one, when the adults turn to gore and the young scatter. Give them room, or thin the herd; either way the world rolls on without you.',
  cost: 120,
  // DISCOVERED in play (runs at defaults from level 1); the Vault unlock gates TUNING,
  // surfacing once a migration has caught the player crossing a zone.
  unlock: {
    id: 'migration_unlock',
    label: 'Be caught in a migrating herd (they cross the plains from level 1)',
    test: (ctx) => (ctx.ledger.migration_seen ?? 0) >= 1,
  },
  // INVESTMENT LADDER — each owned tier widens the frequency slider so herds cross
  // more often (no surge edits).
  tiers: [
    { id: 'migration_drover', label: 'Drover', requirement: 'Witness 3 migrations', cost: 160,
      test: (ctx) => (ctx.ledger.migration_seen ?? 0) >= 3,
      grants: { weight: { min: 0, max: 80 } } },
    { id: 'migration_stampede', label: 'Stampede', requirement: 'Witness 8 migrations', cost: 240,
      test: (ctx) => (ctx.ledger.migration_seen ?? 0) >= 8,
      grants: { weight: { min: 0, max: 100 } } },
  ],
  modifiers: [
    { id: 'migration_start', kind: 'startLevel', label: 'Migrations begin at level', min: 1, max: 1, step: 1, defaultValue: 1 },
    { id: 'migration_weight', kind: 'weight', label: 'Migration frequency', min: 15, max: 50, step: 5, defaultValue: 35 },
  ],
  defaultWeight: 35,
  defaultStartLevel: 1,
  defaultEnabled: true,
  world: { overlay: (ctx) => new MigrationField(ctx, MIGRATION_SURGE) },
  factions: [BEAST_FACTION],
  validate: (look) =>
    MIGRATION_SURGE.roster.filter(e => !look.monster(e.id)).map(e => `herd monster '${e.id}' unknown`),
};
