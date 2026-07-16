// ---------------------------------------------------------------------------
// HOLDFAST FIELD — the persistent per-zone lock-state store (pure overlay).
//
// When the player first enters an UNCHARTED zone, this field decides ONCE (a seeded,
// gated roll) whether that zone raises a fortified LOCKED bonus exit, which guardian
// holds it (a HoldfastDef from the registry — only guardians whose `dims` band
// claims the zone's dimension may roll), and where the exit sits (a randomized
// off-cardinal locale). It then REMEMBERS that decision + the live lock state
// (sealed → open, or slaughtered → failed) for the whole run, surviving leaving the
// zone AND the Campfire refresh — the only home that does (mirrors ConclaveField).
//
// PURE of the engine: it owns the decision + the durable state; the engine reads
// infoFor()/isLocked() to append the exit, raise the gate + wardens, and resolve the
// dwell-pay / kill, calling unlock()/markFailed() back. It never spawns or mints —
// the pocket behind the gate mints through the ORDINARY frontier path (World
// .mintHoldfastPocket via chartFrontier), on the same eager/lazy timing as any exit.
// ---------------------------------------------------------------------------

import { clamp } from '../../core/math';
import { Rng } from '../../core/rng';
import type { ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import { META_CURRENCY_LABEL } from '../../meta/account';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import type { OverlayBuildCtx, PackageGate } from '../types';
import { holdfastTollCost, unlockImplemented, type HoldfastDef, type HoldfastSurge } from '../holdfast';

/** FNV-1a string hash (per-zone seed salt; mirrors registry.ts hashId). */
function hashStr(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** The durable per-zone holdfast state (one per hosting zone). */
export interface HoldfastInfo {
  /** Which guardian def this zone rolled (HoldfastDef.id). */
  defId: string;
  /** The lock id stamped on the bonus exit (matched in isExitLocked). */
  lockId: string;
  /** The bonus exit's rolled cardinal side + off-center position (the randomized locale). */
  side: 'n' | 's' | 'e' | 'w';
  at: number;
  /** Sealed (true) until the toll is met. */
  locked: boolean;
  /** sealed → open (paid/forced) | failed (slaughtered, sealed forever). */
  resolved: 'sealed' | 'open' | 'failed';
  /** The engine has appended the bonus ZoneExitDef + recorded its index (once). */
  exitAppended: boolean;
  exitDefIndex: number;
  /** The discovery ledger was bumped (once per holdfast, not per re-muster). */
  seenBumped?: boolean;
  /** The KEPT-ROAD roll (once, stable across re-musters and reloads): whether
   *  this holdfast's zone annotates its exit with the guardian's road spec, so
   *  generation carves a traveled way to the gate (World.exitRoadAnnotations). */
  decorRoad: boolean;
}

export class HoldfastField implements WorldOverlay {
  readonly id = 'holdfast';
  /** Durable: the lock LEDGER is the whole feature — a paid toll stays paid
   *  and a slaughtered gate stays sealed across relaunches (snapshot below). */
  readonly persistence = 'durable' as const;

  private readonly seed: number;
  private readonly gate: () => PackageGate;
  private readonly cfg: HoldfastSurge;
  /** Every guardian's neutralTag (the engine's ambient/objective exclusions
   *  read this — a new guardian def is ambient-exempt with zero engine edits). */
  private readonly tags: Set<string>;
  /** zoneId → decided info, or null = "rolled, no holdfast here" (so it never re-rolls). */
  private infos = new Map<string, HoldfastInfo | null>();

  constructor(ctx: OverlayBuildCtx, surge: HoldfastSurge) {
    this.seed = ctx.seed;
    this.gate = ctx.gate;
    this.cfg = surge;
    this.tags = new Set(surge.defs.map(d => d.guardian.neutralTag));
  }

  // --- WorldOverlay (this field is a STATE STORE; the engine drives the runtime) ---
  update(): void { /* the roll is lazy (ensureRolled on first entry); nothing ticks */ }
  onNodeCharted(): void { /* the engine rolls on first loadZone, not at chart time */ }
  affectSpawns(): SpawnBias { return NO_BIAS; } // wardens are engine-materialized
  renderMap(): MapLayer { return { under: '', over: '' }; } // the marker rides registerMarkerSource

  // --- engine-facing API -----------------------------------------------------

  /** Live config (the engine reads the guardian defs + reward knobs). */
  surge(): HoldfastSurge { return this.cfg; }

  /** A guardian def by id. */
  def(defId: string): HoldfastDef | undefined { return this.cfg.defs.find(d => d.id === defId); }

  /** Every registered guardian's neutralTag — the engine's ambient-tag and
   *  rouse-rule fabrics consult this instead of hardcoding tag literals. */
  guardianTags(): ReadonlySet<string> { return this.tags; }

  /** DECIDE ONCE whether this zone hosts a holdfast (seeded + gated). Returns the
   *  durable info (a mutable ref the engine records the appended exit index onto), or
   *  null. Re-entry returns the same stored decision — never a re-roll. `density` is
   *  the zone's encounter-density lever (a sparse zone raises fewer). */
  ensureRolled(zone: ZoneDef, density: number): HoldfastInfo | null {
    const existing = this.infos.get(zone.id);
    if (existing !== undefined) return existing;
    let info: HoldfastInfo | null = null;
    const g = this.gate();
    const rng = new Rng((this.seed ^ hashStr(zone.id)) >>> 0);
    if (g.active && rng.chance(clamp(this.cfg.openChance * g.ignitionMul * density, 0, 1))) {
      const def = this.pickDef(zone, rng);
      if (def) {
        const side = (['n', 's', 'e', 'w'] as const)[rng.int(0, 3)];
        const at = rng.pick(this.cfg.exitLocales); // OFF-CENTER — the randomized, non-cardinal locale
        info = {
          defId: def.id, lockId: `holdfast:${zone.id}`, side, at, locked: true, resolved: 'sealed',
          exitAppended: false, exitDefIndex: -1,
          decorRoad: rng.chance(def.road?.chance ?? 0),
        };
      }
    }
    this.infos.set(zone.id, info);
    return info;
  }

  infoFor(zoneId: string): HoldfastInfo | null { return this.infos.get(zoneId) ?? null; }

  /** Event-activity fed to the bloom (WorldOverlay.activityAt): a still-sealed
   *  holdfast keeps its zone restless. */
  activityAt(zoneId: string): number { return this.infoFor(zoneId)?.locked ? 1 : 0; }

  /** Is the holdfast exit in this zone still sealed? (Optionally match the lock id.) */
  isLocked(zoneId: string, lockId?: string): boolean {
    const i = this.infos.get(zoneId);
    return !!i && i.locked && (!lockId || i.lockId === lockId);
  }

  /** Open the gate (toll met). */
  unlock(zoneId: string): void {
    const i = this.infos.get(zoneId);
    if (!i || !i.locked) return;
    i.locked = false;
    i.resolved = 'open';
  }

  /** The wardens were slaughtered and the gate did NOT burst — sealed for the run. */
  markFailed(zoneId: string): void {
    const i = this.infos.get(zoneId);
    if (i && i.locked) i.resolved = 'failed';
  }

  /** Read-only snapshot of SEALED holdfasts for the map markers / zone-info / tests. */
  sealed(): ReadonlyArray<{ zoneId: string; def: HoldfastDef }> {
    const out: { zoneId: string; def: HoldfastDef }[] = [];
    for (const [zid, info] of this.infos) {
      if (!info || !info.locked || info.resolved === 'failed') continue; // a slaughtered gate is gone — no marker
      const def = this.def(info.defId);
      if (def) out.push({ zoneId: zid, def });
    }
    return out;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: every rolled decision, INCLUDING the nulls ("rolled, nothing
   *  here") — the no-re-roll memory is as durable as the locks. No zones are
   *  minted by this field, so no ownedZones claim rides (the bonus exit's
   *  destination mints through the ordinary frontier path). */
  snapshot(): unknown {
    return { infos: [...this.infos.entries()] };
  }

  /** Rebuild tolerantly: a row whose guardian def was unregistered since the
   *  save degrades to null (the zone simply hosts nothing — never a re-roll
   *  into a DIFFERENT guardian, which could double-append an exit); malformed
   *  rows drop. exitAppended/exitDefIndex ride verbatim — the zone graph that
   *  carries the appended exit is saved/restored alongside us. (An old save's
   *  decorCampfire / destOverride keys are simply ignored — the campfire is
   *  gate dress now, and the retired gem-bargain no longer steers the mint.) */
  restore(snap: unknown): void {
    const s = snap as { infos?: unknown } | null;
    if (!s || !Array.isArray(s.infos)) return;
    const SIDES = new Set(['n', 's', 'e', 'w']);
    const RESOLVED = new Set(['sealed', 'open', 'failed']);
    this.infos.clear();
    for (const row of s.infos) {
      if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== 'string') continue;
      const [zid, raw] = row as [string, unknown];
      if (raw === null) { this.infos.set(zid, null); continue; }
      const i = raw as Partial<HoldfastInfo>;
      if (!i || typeof i !== 'object') continue;
      if (typeof i.defId !== 'string' || !this.def(i.defId)) { this.infos.set(zid, null); continue; }
      if (typeof i.lockId !== 'string' || !SIDES.has(i.side as string)) continue;
      if (typeof i.at !== 'number' || !Number.isFinite(i.at)) continue;
      if (!RESOLVED.has(i.resolved as string)) continue;
      this.infos.set(zid, {
        defId: i.defId, lockId: i.lockId, side: i.side as HoldfastInfo['side'], at: i.at,
        locked: !!i.locked, resolved: i.resolved as HoldfastInfo['resolved'],
        exitAppended: !!i.exitAppended,
        exitDefIndex: typeof i.exitDefIndex === 'number' && Number.isFinite(i.exitDefIndex) ? i.exitDefIndex : -1,
        ...(i.seenBumped ? { seenBumped: true } : {}),
        decorRoad: !!i.decorRoad,
      });
    }
  }

  pruneZones(has: (zoneId: string) => boolean): void {
    for (const zid of [...this.infos.keys()]) if (!has(zid)) this.infos.delete(zid);
  }

  /** DEV: force a fresh sealed holdfast in this zone regardless of the gate/roll (QA).
   *  The engine then appends the exit + raises the gate (World.devForceHoldfast). */
  devForce(zone: ZoneDef): HoldfastInfo | null {
    const existing = this.infos.get(zone.id);
    if (existing && existing.locked) return existing; // re-pressing reuses the live gate (no duplicate exit)
    const rng = new Rng((this.seed ^ hashStr(zone.id) ^ 0x77) >>> 0);
    // QA may skip the LEVEL band (force a gate anywhere useful) but never the
    // DIMENSION law — a bandit palisade forced into hell would QA a state the
    // real roll can never produce. No def claims this plane → nothing forces.
    const dim = zone.dimension ?? 'surface';
    const def = this.pickDef(zone, rng)
      ?? this.cfg.defs.find(d => unlockImplemented(d.unlock) && (d.dims ?? ['surface']).includes(dim));
    if (!def) return null;
    const side = (['n', 's', 'e', 'w'] as const)[rng.int(0, 3)];
    const at = rng.pick(this.cfg.exitLocales);
    const info: HoldfastInfo = {
      defId: def.id, lockId: `holdfast:${zone.id}`, side, at, locked: true, resolved: 'sealed',
      exitAppended: false, exitDefIndex: -1,
      decorRoad: !!def.road, // QA shows the full thing: any def with a road spec lays it
    };
    this.infos.set(zone.id, info);
    return info;
  }

  // --- internals -------------------------------------------------------------

  /** Weighted pick from the guardian defs whose DIMENSION band + level band fit
   *  this zone. Only defs whose unlock + reward kinds are IMPLEMENTED roll
   *  (unlockImplemented — the one shared predicate): a future half-wired
   *  guardian stays dormant rather than failing open. Fail SAFE, not open —
   *  and a plane no def claims never raises a gate at all. */
  private pickDef(zone: ZoneDef, rng: Rng): HoldfastDef | null {
    const dim = zone.dimension ?? 'surface';
    const pool = this.cfg.defs.filter(d =>
      unlockImplemented(d.unlock) && d.reward.kind === 'open-exit'
      && (d.dims ?? ['surface']).includes(dim)
      && zone.level >= d.minLevel && (d.maxLevel === undefined || zone.level <= d.maxLevel));
    if (!pool.length) return null;
    let total = 0;
    for (const d of pool) total += d.weight;
    let r = rng.next() * total;
    for (const d of pool) { r -= d.weight; if (r <= 0) return d; }
    return pool[pool.length - 1];
  }
}

// --- map marker + zone-info (registered on import — zero panel edits) ----------
//
// A sealed holdfast pins its guardian banner on the charted zone node (fog:'charted'
// — only once you've been there, since it's an in-zone discovery, not a far event).
registerMarkerSource((world: World): MapMarker[] => {
  const hf = world.sim.holdfastField;
  if (!hf) return [];
  return hf.sealed().map(s => ({
    id: `holdfast-${s.zoneId}`, zoneId: s.zoneId,
    glyph: s.def.marker?.glyph ?? '⚑', fill: '#241c10',
    stroke: s.def.marker?.color ?? '#c8a04a', text: '#f0dca0', r: 9,
    title: `${s.def.name} — a sealed bonus path`, fog: 'charted', z: 16,
  }));
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.holdfastField?.infoFor(zoneId);
  if (!info || !info.locked || info.resolved === 'failed') return [];
  const def = world.sim.holdfastField?.def(info.defId);
  // Price the toll on the panel (an essence gate advertises its ask — the
  // player weighs the purse against the pocket before walking back), and
  // PITCH the rolled form (World.holdfastPocketPitch — the same resolver the
  // keeper prompt speaks through): what the ask actually buys.
  const level = world.zoneMap[zoneId]?.level ?? 1;
  const ask = def && def.unlock.kind === 'pay-currency' && def.unlock.currency === 'mortal'
    ? `the wardens ask ${holdfastTollCost(def, level)} ${META_CURRENCY_LABEL}`
    : 'deal with the guardians';
  const pitch = world.holdfastPocketPitch(zoneId, info.lockId);
  return [{
    kind: 'event', icon: def?.marker?.glyph ?? '⚑', color: def?.marker?.color ?? '#c8a04a',
    label: def?.name ?? 'Holdfast',
    detail: `${pitch ?? 'a sealed side-pocket'} — ${ask}`, z: 12,
  }];
});
