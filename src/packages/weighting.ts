// ---------------------------------------------------------------------------
// WEIGHTING — two pure gates, exactly as the brief frames them.
//
// (1) START-LEVEL GATE: a package is live only when enabled and the CHARACTER
//     level has reached its start level (0 = from frame one, 100 = only at 100,
//     101 = never — the off sentinel, since the cap is 100).
// (2) RELATIVE-WEIGHT BUDGET: the currently-active packages' weights normalize
//     into shares (0..1, for the UI mix bar). The engine applies `pressure`
//     (= share × active-count), which preserves total world pressure while
//     shifting the MIX — so equal weights reproduce today's cadence, and
//     "inundate Breach, trickle Warbands" falls out as a high vs low share.
//
// Inter-package relationships (amplifies / suppresses) fold into the raw weights
// before normalizing, so e.g. Breach amplifies Warbands while both are active.
// ---------------------------------------------------------------------------

import { PACKAGE_BY_ID, PACKAGES } from './registry';
import { DEFAULT_FREQUENCY } from './frequency';
import type { ExpeditionManifest, ManifestEntry } from './manifest';
import type { PackageGate } from './types';

export const INACTIVE_GATE: PackageGate = { active: false, share: 0, pressure: 0, ignitionMul: 0, severityMul: 0, concurrencyMul: 1 };

export function isStartGateOpen(e: ManifestEntry, charLevel: number): boolean {
  return e.enabled && e.startLevel <= 100 && charLevel >= e.startLevel;
}

/** Resolve every manifest package to a gate for the current character level. */
export function resolveGates(manifest: ExpeditionManifest, charLevel: number): Map<string, PackageGate> {
  const gates = new Map<string, PackageGate>();
  const raw = new Map<string, number>();
  // The run's GLOBAL frequency crank (run-locked on the manifest). The alwaysOn
  // SUBSTRATE (faction politics) is deliberately NOT scaled — it's the world's
  // baseline, not an "event" — so it keeps muls of 1.
  const freq = manifest.frequency ?? DEFAULT_FREQUENCY;

  for (const e of manifest.packages) {
    const pkg = PACKAGE_BY_ID[e.id];
    if (!pkg) continue;
    if (pkg.alwaysOn) { gates.set(e.id, { active: true, share: 0, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 }); continue; }
    if (isStartGateOpen(e, charLevel)) raw.set(e.id, Math.max(0, e.weight));
  }

  // Fold inter-package amplify/suppress among the ACTIVE packages only.
  for (const p of PACKAGES) {
    if (!p.relationships) continue;
    for (const rel of p.relationships) {
      if (rel.kind !== 'amplifies' && rel.kind !== 'suppresses') continue;
      if (!raw.has(rel.a) || !raw.has(rel.b)) continue;
      const f = rel.kind === 'amplifies' ? rel.strength : 1 / Math.max(1e-6, rel.strength);
      raw.set(rel.b, Math.max(0, (raw.get(rel.b) ?? 0) * f));
    }
  }

  const activeIds = [...raw.keys()];
  const total = activeIds.reduce((s, id) => s + (raw.get(id) ?? 0), 0) || 1;
  const count = activeIds.length;
  for (const id of activeIds) {
    const share = (raw.get(id) ?? 0) / total;
    const pressure = share * count;
    gates.set(id, {
      active: true, share, pressure,
      ignitionMul: pressure * freq.rate,
      severityMul: pressure * freq.severity,
      concurrencyMul: freq.concurrency,
    });
  }

  // Everything start-gated-closed (or zero-weight) is inactive.
  for (const e of manifest.packages) {
    if (!gates.has(e.id)) gates.set(e.id, { ...INACTIVE_GATE });
  }
  return gates;
}

export function gateOf(gates: ReadonlyMap<string, PackageGate>, id: string): PackageGate {
  return gates.get(id) ?? INACTIVE_GATE;
}
