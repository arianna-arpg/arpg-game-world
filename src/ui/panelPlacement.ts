export interface PanelBounds { left: number; right: number; top: number; bottom: number }

/** Find a stable horizontal berth without moving or merging the other panels.
 * Reserve the whole reading height so growing content cannot move its controls.
 * All inputs and outputs are in screen pixels; callers own UI-scale conversion. */
export function independentPanelSeat(viewport: PanelBounds, obstacles: readonly PanelBounds[],
  preferred: { left: number; top: number; width: number }, minWidth: number, gap: number) {
  const width = Math.min(preferred.width, viewport.right - viewport.left);
  const top = Math.max(viewport.top, Math.min(preferred.top, viewport.bottom));
  const blockers = obstacles.filter(r => r.bottom > top && r.top < viewport.bottom);
  let gaps = [{ left: viewport.left, right: viewport.right }];
  for (const r of blockers) gaps = gaps.flatMap(g => {
    const left = Math.max(g.left, r.left - gap), right = Math.min(g.right, r.right + gap);
    if (left >= right) return [g];
    return [{ left: g.left, right: left }, { left: right, right: g.right }].filter(s => s.right > s.left);
  });
  const clampLeft = (x: number, w: number, bounds: Pick<PanelBounds, 'left' | 'right'> = viewport) =>
    Math.max(bounds.left, Math.min(x, bounds.right - w));
  const fits = gaps.filter(g => g.right - g.left >= Math.min(width, minWidth))
    .map(g => ({ width: Math.min(width, g.right - g.left), left: clampLeft(preferred.left, Math.min(width, g.right - g.left), g) }))
    .sort((a, b) => b.width - a.width || Math.abs(a.left - preferred.left) - Math.abs(b.left - preferred.left));
  if (fits.length) return { ...fits[0], top, maxHeight: viewport.bottom - top };
  // Too narrow for all groups: minimize overlap and keep this pane on-screen.
  // Its independent stacking rung keeps its controls clickable in this fallback.
  const candidates = [preferred.left, viewport.left, viewport.right - width,
    ...blockers.flatMap(r => [r.left - gap - width, r.right + gap])].map(x => clampLeft(x, width));
  const overlap = (x: number) => blockers.reduce((n, r) =>
    n + Math.max(0, Math.min(x + width, r.right) - Math.max(x, r.left)), 0);
  candidates.sort((a, b) => overlap(a) - overlap(b) || Math.abs(a - preferred.left) - Math.abs(b - preferred.left));
  return { left: candidates[0], top, width, maxHeight: viewport.bottom - top };
}
