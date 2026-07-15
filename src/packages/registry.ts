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
import { DESCENT } from './defs/descent';
import { DEMON_INVASION } from './defs/demonInvasion';
import { EXTRACTION } from './defs/extraction';
import { FACTION_POLITICS } from './defs/factionPolitics';
import { FRACTURES } from './defs/fractures';
import { HAUNTING } from './defs/haunting';
import { HOLDFAST } from './defs/holdfast';
import { HUNT } from './defs/hunt';
import { LONGCANDLE } from './defs/longcandle';
import { MIGRATION } from './defs/migration';
import { MIRRORKIN } from './defs/mirrorkin';
import { MYCELIA } from './defs/mycelia';
import { PIT } from './defs/pit';
import { STORM_FRONTS } from './defs/stormFronts';
import { VENDETTA } from './defs/vendetta';
import { VERMINFALL } from './defs/verminfall';
import { WARBANDS } from './defs/warbands';
import { WORLDBOSS } from './defs/worldboss';
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
  CONTAGION,
  HOLDFAST,
  BRIGANDS,
  MYCELIA,
  HAUNTING,
  VERMINFALL,
  MIRRORKIN,
  LONGCANDLE,
  VENDETTA,
  WORLDBOSS,
  PIT,
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
  contagion: 0xc047,
  holdfast: 0x401d,
  brigands: 0xb21a,
  mycelia: 0x14ce,
  vendetta: 0x0e4d,
  verminfall: 0x2a75,
  mirrorkin: 0x312a,
  longcandle: 0xca4d,
  pit: 0x9147,
  worldboss: 0xb055,
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
