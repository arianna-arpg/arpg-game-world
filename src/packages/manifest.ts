// ---------------------------------------------------------------------------
// EXPEDITION MANIFEST — the IMMUTABLE per-run configuration (the run-lock).
//
// Built once at run start from the player's Expedition-screen choices (which
// live in account.packageDefaults), Object.frozen, stored INSIDE CharacterSave,
// and read-only every tick thereafter. Nothing reads live account state during
// a run, so a mid-run unlock (a Crowned kill that opens a slider) affects only
// the NEXT run — that IS the lock. It carries the run SEED too, so a resumed run
// is deterministic. Reconciliation is tolerant (drop unknown ids, clamp ranges)
// so a removed/renamed package never invalidates a live character.
// ---------------------------------------------------------------------------

import type { Account } from '../meta/account';
import { PACKAGES, PACKAGE_BY_ID } from './registry';
import { isConfigured } from './registry';
import { clampFrequency, type FrequencyProfile } from './frequency';
import type { ContentPackage, ModifierKind } from './types';

export const MANIFEST_SCHEMA_VERSION = 1;

export interface ManifestEntry {
  id: string;
  enabled: boolean;
  weight: number;
  startLevel: number;
}

export interface ExpeditionManifest {
  schemaVersion: number;
  seed: number;
  packages: ManifestEntry[];
  /** The run-locked GLOBAL event-frequency crank (see packages/frequency.ts).
   *  Defaults to 1/1/1 (no-op) unless the level-100 unlock is owned + tuned. */
  frequency: FrequencyProfile;
}

const clampInt = (v: number, lo: number, hi: number): number =>
  Math.round(v < lo ? lo : v > hi ? hi : v);

/** Bounds + default for a package's slider of `kind`, WIDENED by every owned
 *  investment tier (so the configurable range grows as the player invests). The
 *  base modifier range is the "minor" band granted by the base unlock. */
export function bound(pkg: ContentPackage, kind: ModifierKind, account: Account): { min: number; max: number; def: number } {
  const m = pkg.modifiers.find(mm => mm.kind === kind);
  const base = m
    ? { min: m.min, max: m.max, def: m.defaultValue }
    : kind === 'startLevel'
      ? { min: 0, max: 101, def: pkg.defaultStartLevel }
      : { min: 0, max: 100, def: pkg.defaultWeight };
  for (const t of pkg.tiers ?? []) {
    if (!account.packageUnlocks.has(t.id)) continue;
    const g = t.grants[kind];
    if (g) {
      if (g.min !== undefined) base.min = g.min;
      if (g.max !== undefined) base.max = g.max;
    }
  }
  return base;
}

/** The effective entry for a package, from the player's saved prefs or defaults.
 *  A package only reaches this at all via manifestPackages (defaultEnabled OR
 *  purchased) — so a PURCHASED opt-in package defaults ON: buying it is the
 *  opt-in (The Pit must exist the run after it's bought, not hide behind a
 *  second toggle). The Expedition screen can still park it per run. */
function entryFor(pkg: ContentPackage, account: Account): ManifestEntry {
  const pref = account.packageDefaults[pkg.id];
  const wB = bound(pkg, 'weight', account), sB = bound(pkg, 'startLevel', account);
  return {
    id: pkg.id,
    enabled: pref ? pref.enabled : (pkg.defaultEnabled || isConfigured(account, pkg.id)),
    weight: clampInt(pref?.weight ?? pkg.defaultWeight, wB.min, wB.max),
    startLevel: clampInt(pref?.startLevel ?? pkg.defaultStartLevel, sB.min, sB.max),
  };
}

/** Which packages belong in a run's manifest: every base-game feature plus any
 *  whose configuration the player has purchased. */
export function manifestPackages(account: Account): ContentPackage[] {
  return PACKAGES.filter(p => p.defaultEnabled || isConfigured(account, p.id));
}

/** Build the frozen run config from the account's current choices + a run seed.
 *  The caller freezes (Object.freeze) and stores it in the World/CharacterSave. */
export function buildManifest(account: Account, seed: number): ExpeditionManifest {
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    seed: seed >>> 0,
    packages: manifestPackages(account).map(p => entryFor(p, account)),
    frequency: clampFrequency(account.frequencyProfile),
  };
}

/** Rebuild a saved manifest tolerantly (resume): drop ids no longer in the
 *  registry, clamp out-of-range sliders. NEVER adds newly-introduced packages
 *  (they stay off for the locked run). Returns a fresh default manifest if the
 *  raw value is missing/garbage. */
export function reconcileManifest(raw: unknown, account: Account, fallbackSeed: number): ExpeditionManifest {
  const r = raw as Partial<ExpeditionManifest> | null | undefined;
  if (!r || typeof r !== 'object' || !Array.isArray(r.packages)) {
    return buildManifest(account, (r && typeof r.seed === 'number') ? r.seed : fallbackSeed);
  }
  const packages: ManifestEntry[] = [];
  for (const e of r.packages) {
    const pkg = e && PACKAGE_BY_ID[e.id];
    if (!pkg) continue; // package removed since the save — drop it
    const wB = bound(pkg, 'weight', account), sB = bound(pkg, 'startLevel', account);
    packages.push({
      id: pkg.id,
      enabled: !!e.enabled,
      weight: clampInt(typeof e.weight === 'number' ? e.weight : pkg.defaultWeight, wB.min, wB.max),
      startLevel: clampInt(typeof e.startLevel === 'number' ? e.startLevel : pkg.defaultStartLevel, sB.min, sB.max),
    });
  }
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    seed: (typeof r.seed === 'number' ? r.seed : fallbackSeed) >>> 0,
    packages,
    frequency: clampFrequency(r.frequency),
  };
}
