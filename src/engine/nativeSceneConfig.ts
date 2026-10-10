/** Native scene generation tunables shared by retained areas and World. */
import {FIXTURE_IDS} from '../data/monsters';
import {registerGenPin} from './genPins';
/** Tags whose bearers are AMBIENT living-world texture, streamed through zones
 *  by overlay packages — NEVER part of the zone objective, so a waves/clear
 *  zone can't soft-lock behind them. Materializers tag their spawns; a new
 *  ambient package adds its tag here. */
/** THE STARFALL COURT's fielding knobs (materializeStarfall). The front
 *  itself is the whole gate — its strike/cadence knobs live on the weather
 *  registry row ('starfall'); these shape only what GROWS beneath it. */
export const STARFALL_CFG = {
  faction: 'starfall',
  heartDefId: FIXTURE_IDS.fallen_star,
  /** Chance the shower left a standing heart worth breaking. */
  heartChance: 0.6,
  packCount: [2, 3] as [number, number],
  packSize: [2, 4] as [number, number],
  color: '#9ad4e8',
};
export const AMALGAM_GRAVE_RING = 104;
/** The graft key the CONTAGION stamps on the parts it grows (the mutant
 *  strain's tentacle — Movement III): infectActorWith mints under it,
 *  the sweep's revert withers exactly it. One word, two sites. */
export const CONTAGION_GRAFT_KEY = 'contagion';
export const DEEPWINTER_FROZEN_LIQUID = 'ice';
// THE ENTRY FREEZE (World.materializeDeepwinter) — which liquids a standing
// frost front reads as frozen, named as GENKIT LIQUID IDS (engine/genkit.ts),
// never as doodad kinds. These are the same registry rows the MINT-TIME
// freeze names (layoutRecipes' `freezeAt` pours `frozenLiquid`, default
// 'ice'), so re-registering a row moves the mint path and the entry path
// together — and 'shallows' rides along because a ford is water too.
export const DEEPWINTER_THAWED_LIQUIDS = ['water', 'shallows'];
export const HARBORCOVE_LAYOUT = registerGenPin('layout', 'harborcove', 'every sea PORT zone is carved by it');
/** AMBIENT SCENERY-ACTOR tunables (World.bootScenery — ZoneDef.scenery
 *  rows: passive object-actors planted at load on their own salted
 *  stream). */
export const SCENERY_CFG = {
  /** Placement-stream salt over the zone seed (never moves layout rng;
   *  distinct from PUZZLE_CFG.salt so the lanes can't shift each other). */
  salt: 0x0f17c5,
  /** Door clearance a planted body keeps (interactSpot's clear). */
  portalClear: 200,
} as const;
/** CONVEX-ZONE NAV tunables (World.pathField): the lazy flow-field grid raked
 *  over a plains zone's blocking doodads, so AI routes around cliff pockets
 *  and chasm lips exactly as it routes through warren walls. */
export const NAV_CFG = {
  /** Blocker inflation (px): paths keep a shoulder's clearance off trunks
   *  and chasm lips. A gap the pad closes simply falls back to straight
   *  steering (pathStep null) — clampPos stays the collision authority. */
  pad: 10,
};
/** THE PARTY-LANDING LAW's default scatter (World.landPartyAt): how the
 *  travelling party fans out beside the hero when an arrival adjusts the
 *  party's stand after loadZone. Sites with their own flavor (the
 *  waypoint's wide ring, the quay's tight file) pass overrides — dials,
 *  never per-site copies of the loop. */
export const PARTY_LAND_CFG = {
  spread: 60,                            // sideways half-width of the scatter
  band: [30, 70] as readonly [number, number], // vertical scatter band (a step below the hero)
};
export const EVENT_SPACING = 240;
/** FNV-1a hash of a string → a stable per-zone seed offset (encounter placement). */
export function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
export const OPEN_SEA_LAYOUT = registerGenPin('layout', 'open_sea', 'the sailing zone the voyage mints');
export const GLACIAL_HEART_LM = registerGenPin('landmark', 'glacial_heart', 'deepwinter grafts it onto the crystallized heart zone');
export const FROZEN_LAKE_LM = registerGenPin('landmark', 'frozen_lake', 'the pre-graft heart scar old saves already wear');
