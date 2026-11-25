/** Original Hollow Wake decoration. One activity law serves the game and its
 * live tuning preview. Runtime births use an independent visual random stream. */
export interface RuneFieldSpec {
  enabled: boolean;
  maxCount: number;
  activity: number;
  seconds: readonly [number, number];
  size: readonly [number, number];
  alpha: readonly [number, number];
  travelX: readonly [number, number];
  travelY: readonly [number, number];
}

export const RUNE_FIELD_ACTIVITY = {
  quiet: 15, lively: 50, torrent: 100,
  maxPerField: 64, populationCurve: 1.2, rateCurve: 1.5, minSeconds: .75,
} as const;

export const DEFAULT_RUNE_ACTIVITY = RUNE_FIELD_ACTIVITY.lively;

export function normalizeRuneActivity(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(RUNE_FIELD_ACTIVITY.torrent, Math.round(value)))
    : DEFAULT_RUNE_ACTIVITY;
}

export function runeFieldProfile(spec: RuneFieldSpec, requested = spec.activity) {
  const cfg = RUNE_FIELD_ACTIVITY;
  const activity = spec.enabled && Number.isFinite(requested) ? Math.max(0, Math.min(cfg.torrent, requested)) : 0;
  const capacity = Math.max(0, Math.min(cfg.maxPerField, Math.round(spec.maxCount)));
  const count = activity ? Math.max(1, Math.round(capacity * Math.pow(activity / cfg.torrent, cfg.populationCurve))) : 0;
  const speed = Math.pow(Math.max(1, activity / cfg.quiet), cfg.rateCurve);
  const seconds = spec.seconds.map(s => Math.max(cfg.minSeconds, s / speed)) as [number, number];
  return { activity, count: Math.min(count, capacity), seconds, birthsPerSecond: Math.min(count, capacity) / ((seconds[0] + seconds[1]) / 2) };
}

/** Markup stays stable through panel refreshes. The mounted controller owns
 * only children of this decorative, input-transparent host. */
export function runeFieldHtml(spec: RuneFieldSpec): string {
  if (!spec.enabled) return '';
  return `<div class="rune-field" aria-hidden="true" data-rune-field="${JSON.stringify(spec).replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></div>`;
}
