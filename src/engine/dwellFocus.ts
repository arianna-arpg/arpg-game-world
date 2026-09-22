/** Shared attention selection. Callers supply reachable candidates and their
 * own idle predicate; this fold knows nothing about NPCs, text or services. */
export interface DwellCandidate {
  id: number;
  distance: number;
  priority: number;
  dwellSec: number;
  /** Supplied only for eligible targets hit by an intentional pointer.
   * Lower scores win overlaps; absent means ordinary proximity selection. */
  pointerDistance?: number;
}

export interface DwellFocus {
  id: number;
  since: number | null;
  readAt: number;
  ready: boolean;
  /** A completed pointer choice persists while reachable (e.g. reading UI). */
  pointed?: boolean;
}

export interface DwellFocusTuning {
  /** A peer must be this much nearer before attention changes hands. */
  switchMargin: number;
  /** An unobserved gap cannot count as continuous dwelling. */
  staleSec: number;
}

/** Pointer intent first; otherwise priority, distance, then stable id. Completed focus stays
 * open until its target leaves or another wins; acting only resets a pending
 * dwell. Keeping the incumbent after it speaks prevents a crowd slideshow. */
export function dwellFocus(
  previous: DwellFocus | undefined, candidates: readonly DwellCandidate[],
  idle: boolean, now: number, tuning: DwellFocusTuning,
  interruptedAt = -Infinity,
): DwellFocus | undefined {
  const live = previous && now >= previous.readAt && now - previous.readAt <= tuning.staleSec
    ? previous : undefined;
  let best: DwellCandidate | undefined;
  for (const c of candidates) {
    if (!best || c.priority > best.priority
      || (c.priority === best.priority && (c.distance < best.distance
        || (c.distance === best.distance && c.id < best.id)))) best = c;
  }
  if (!best) return undefined;
  const incumbent = live && candidates.find(c => c.id === live.id);
  if (incumbent && incumbent.priority === best.priority
    && incumbent.distance <= best.distance + tuning.switchMargin) best = incumbent;
  let pointed: DwellCandidate | undefined;
  for (const c of candidates) {
    if (c.pointerDistance === undefined || !Number.isFinite(c.pointerDistance)) continue;
    if (!pointed || c.pointerDistance < pointed.pointerDistance!
      || (c.pointerDistance === pointed.pointerDistance && c.id < pointed.id)) pointed = c;
  }
  if (pointed) best = pointed;
  else if (incumbent && live?.ready && live.pointed) best = incumbent;
  const same = live?.id === best.id;
  const ready = !!(same && live.ready);
  const continuous = same && live.since !== null && interruptedAt < live.since;
  const since = ready ? live!.since : !idle ? null : continuous ? live!.since : now;
  return { id: best.id, since, readAt: now,
    pointed: !!pointed || !!(same && live.ready && live.pointed),
    ready: ready || (since !== null && now - since >= best.dwellSec) };
}
