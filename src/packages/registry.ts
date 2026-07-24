// ---------------------------------------------------------------------------
// PACKAGE REGISTRY — the single source of truth (mirrors UNLOCK_CATALOG).
//
// Adding a feature is one import + one array entry here. Everything downstream
// (the Vault, the Expedition screen, the world sim, save reconciliation) reads
// the registry, so a new package needs no edits to any of them.
// ---------------------------------------------------------------------------

import type { Account } from '../meta/account';
import { AMALGAMATION } from './defs/amalgamation';
import { BOROUGH } from './defs/borough';
import { BREACH } from './defs/breach';
import { BRIGANDS } from './defs/brigands';
import { CONCLAVE } from './defs/conclave';
import { CONTAGION } from './defs/contagion';
import { ASCENT } from './defs/ascent';
import { CRUSADE } from './defs/crusade';
import { DEADWAKE } from './defs/deadwake';
import { DEEPWINTER } from './defs/deepwinter';
import { DESCENT } from './defs/descent';
import { DEMON_INVASION } from './defs/demonInvasion';
import { DROVE } from './defs/drove';
import { EXTRACTION } from './defs/extraction';
import { FACTION_POLITICS } from './defs/factionPolitics';
import { FRACTURES } from './defs/fractures';
import { GLOAMING } from './defs/gloaming';
import { HAUNTING } from './defs/haunting';
import { HOLDFAST } from './defs/holdfast';
import { HUNT } from './defs/hunt';
import { LONGCANDLE } from './defs/longcandle';
import { LONG_NIGHT } from './defs/longNight';
import { MIGRATION } from './defs/migration';
import { MIRRORKIN } from './defs/mirrorkin';
import { MYCELIA } from './defs/mycelia';
import { PIT } from './defs/pit';
import { QUICKENING } from './defs/quickening';
import { STORM_FRONTS } from './defs/stormFronts';
import { STRAYING } from './defs/straying';
import { SWARMING } from './defs/swarming';
import { UNDERWORLD_WAR } from './defs/underworldWar';
import { UNSEALING } from './defs/unsealing';
import { VENDETTA } from './defs/vendetta';
import { VERMINFALL } from './defs/verminfall';
import { WARBANDS } from './defs/warbands';
import { WISPLIGHT } from './defs/wisplight';
import { WORLDBOSS } from './defs/worldboss';
import { WRAITHSAIL } from './defs/wraithsail';
import type { EncounterDef } from './encounters';
import type { HoldfastDef } from './holdfast';
import type { ContentPackage, FurnishSpec, UnlockRequirement } from './types';

export const PACKAGES: ContentPackage[] = [
  WARBANDS,
  STORM_FRONTS,
  DEMON_INVASION,
  BREACH,
  CRUSADE,
  HUNT,
  FRACTURES,
  CONCLAVE,
  AMALGAMATION,
  DESCENT,
  ASCENT,
  DEADWAKE,
  EXTRACTION,
  BOROUGH,
  MIGRATION,
  SWARMING,
  CONTAGION,
  DEEPWINTER,
  HOLDFAST,
  BRIGANDS,
  MYCELIA,
  HAUNTING,
  LONG_NIGHT,
  VERMINFALL,
  STRAYING,
  DROVE,
  WISPLIGHT,
  QUICKENING,
  MIRRORKIN,
  LONGCANDLE,
  GLOAMING,
  VENDETTA,
  WORLDBOSS,
  PIT,
  UNSEALING,
  UNDERWORLD_WAR,
  WRAITHSAIL,
  FACTION_POLITICS,
];

export const PACKAGE_BY_ID: Record<string, ContentPackage> =
  Object.fromEntries(PACKAGES.map(p => [p.id, p]));

/** Stable per-package seed XOR constants (so overlays seed deterministically,
 *  mirroring sim.ts's 0x5eed / 0x1a5e). Unknown ids fall back to an FNV hash. */
const PACKAGE_MAGIC: Record<string, number> = {
  warbands: 0x7a8b,
  storm_fronts: 0x5e3d,
  demon_invasion: 0xde11,
  faction_politics: 0xfac7,
  breach: 0xb1ea,
  crusade: 0xc205,
  hunt: 0x4117,
  fractures: 0xf2ac,
  conclave: 0xc04a,
  amalgamation: 0xa17a,
  descent: 0xde5c,
  ascent: 0xa5ce,
  deadwake: 0xdead,
  extraction: 0xe57a,
  borough: 0xb0f0,
  migration: 0x819a,
  swarming: 0x5a12,
  contagion: 0xc047,
  deepwinter: 0x1ce0,
  holdfast: 0x401d,
  brigands: 0xb21a,
  mycelia: 0x14ce,
  vendetta: 0x0e4d,
  verminfall: 0x2a75,
  straying: 0x57a9,
  drove: 0xd20e,
  wisplight: 0x8157,
  quickening: 0x901c,
  mirrorkin: 0x312a,
  longcandle: 0xca4d,
  long_night: 0x10c7,
  gloaming: 0x910a,
  pit: 0x9147,
  worldboss: 0xb055,
  unsealing: 0x5ea1,
  underworld_war: 0xbe10,
  wraithsail: 0xb0a7,
};

function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** Deterministic per-package seed from the run seed. */
export function packageSeed(base: number, id: string): number {
  return (base ^ (PACKAGE_MAGIC[id] ?? hashId(id))) >>> 0;
}

/** Every in-zone encounter across all packages (the World rolls placement of
 *  these each loadZone, gated by the package's pressure + start level). */
export function allEncounterSpecs(): EncounterDef[] {
  return PACKAGES.flatMap(p => p.encounters ?? []);
}

/** Every guardian-at-a-gate across all packages. The HoldfastField (built by the
 *  holdfast package's overlay factory) guards THIS aggregate, so any package's
 *  declared `holdfasts` join the roll — one def entry, no overlay code. */
export function allHoldfastDefs(): HoldfastDef[] {
  return PACKAGES.flatMap(p => p.holdfasts ?? []);
}

/** Every sidezone furnishing across all packages, tagged with its owner (the
 *  World applies these when a registered sidezone first mints, gated on the
 *  owning package's live gate — see FurnishSpec / applySidezoneFurnish). */
export function allFurnishSpecs(): (FurnishSpec & { packageId: string })[] {
  return PACKAGES.flatMap(p => (p.furnish ?? []).map(f => ({ packageId: p.id, ...f })));
}

/** Does this package's unlock requirement pass for the account? */
export function unlockMet(u: UnlockRequirement, account: Account): boolean {
  return u.test({ account, ledger: account.ledger });
}

/** Has the player purchased this package's configuration (its sliders)? */
export function isConfigured(account: Account, id: string): boolean {
  return account.packageUnlocks.has(id);
}

/** Packages whose configuration is purchasable in the Vault RIGHT NOW: unlock
 *  met, not yet bought, and not the always-on substrate. */
export function buyablePackages(account: Account): ContentPackage[] {
  return PACKAGES.filter(p => !p.alwaysOn && !isConfigured(account, p.id) && unlockMet(p.unlock, account));
}
