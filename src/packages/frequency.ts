// ---------------------------------------------------------------------------
// FREQUENCY PROFILE — the GLOBAL event-volume framework.
//
// Three INDEPENDENT, attributable levers on how much "world event" the run
// produces, each a plain multiplier defaulting to 1.0 (a no-op — at the default
// the engine behaves byte-for-byte as before):
//
//   • rate        — multiplies every event's IGNITION chance (how OFTEN events
//                   start: invasions, crusades, fractures, hunts, rituals,
//                   breaches, weather fronts, warband launches).
//   • concurrency — multiplies the per-kind concurrency CAPS (how MANY of a kind
//                   can run at once — without this, a higher rate just saturates
//                   against maxConcurrent and you never SEE more).
//   • severity    — multiplies event SEVERITY (storm radius, meteor rate, crusade
//                   spread speed, …). Wired through the whole engine but kept at
//                   1.0 by the shipped unlock; a future unlock/tier/dev-knob
//                   turns it up with zero new plumbing.
//
// The profile is RUN-LOCKED: frozen into the ExpeditionManifest at run start, so
// a mid-run change only takes effect next run (the manifest invariant) and a
// resumed/co-op run stays deterministic. It flows into every overlay through the
// PackageGate (gate().ignitionMul / severityMul / concurrencyMul) — one source
// of truth, no per-overlay constants. Reduce below 1 to thin events out, raise
// above 1 to crank them up. This is the spine the level-100 meta-meta unlock (and
// the dev Event tab's live sliders) drive.
// ---------------------------------------------------------------------------

export interface FrequencyProfile {
  rate: number;
  concurrency: number;
  severity: number;
}

export const DEFAULT_FREQUENCY: FrequencyProfile = { rate: 1, concurrency: 1, severity: 1 };

/** Framework bounds. Generous so the dev/testing crank can go hard; the Vault
 *  slider enforces its own (narrower) player-facing range on top. 0 = fully off. */
export const FREQ_MIN = 0;
export const FREQ_MAX = 10;

const clamp1 = (v: unknown, def: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : def;
  return n < FREQ_MIN ? FREQ_MIN : n > FREQ_MAX ? FREQ_MAX : n;
};

/** Coerce a possibly-partial / out-of-range / garbage value into a safe profile
 *  (missing axes default to 1.0). Used at save load + manifest build/reconcile. */
export function clampFrequency(p: Partial<FrequencyProfile> | null | undefined): FrequencyProfile {
  return { rate: clamp1(p?.rate, 1), concurrency: clamp1(p?.concurrency, 1), severity: clamp1(p?.severity, 1) };
}

/** Scale a concurrency cap by the profile's concurrency mul, never below 1 (so a
 *  reduction can't zero out a single-of-a-kind event, only the rate thins it). */
export function scaledCap(base: number, concurrencyMul: number): number {
  return Math.max(1, Math.round(base * concurrencyMul));
}
