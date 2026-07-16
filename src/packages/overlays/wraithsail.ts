// ---------------------------------------------------------------------------
// WRAITHSAIL FIELD — the sea's lone wanderer (pure overlay).
//
// ONE ghost ship drifts the OPEN OCEAN of the node map — the exact inverse of
// the Deadwake's land-bound tide (she reflects off the COAST from the sea
// side, is born over water, and never touches a zone by drifting). On calm
// seas she wanders sporadically (heading jitter, the odd becalmed drift);
// when a WEATHER FRONT overlaps her she aligns her heading to the front's own
// velocity and RIDES it — the Dutchman arrives WITH the storm (the engine
// bridges the weather field's fronts in via setFronts each tick; overlays
// can't see the weather themselves — the Long Night's markBloodmoon rule).
//
// She touches the world in exactly TWO ways, both engine-driven off this
// field's reads: a sailing player who CROSSES her (voyage interception —
// World.updateSailing arms a realm-gate dwell on her hull; boarding mints the
// deck chain) and a DOCKING — while the player idles at an isle/port zone
// with the ship near, a rolled chance she comes alongside for a while and the
// Drowned Court walks ashore (dockedOn() — the deadwake-stream materializer
// pattern; the ONLY landfall she ever makes: no pours, no floods, no fronts).
//
// Durable by pledge: the ship's position, mode, wake and every cooldown ride
// the overlay snapshot bag — a relaunch finds her where the sea left her.
// ---------------------------------------------------------------------------

import { Rng } from '../../core/rng';
import type { PackTableEntry, ZoneDef } from '../../data/zones';
import type { World } from '../../engine/world';
import type { MapCoord } from '../../world/coords';
import { registerMarkerSource, type MapMarker } from '../../world/mapMarkers';
import { registerZoneInfoSource, type ZoneInfoEntry } from '../../world/zoneInfo';
import { NO_BIAS, type MapLayer, type OverlayView, type SpawnBias, type WorldOverlay } from '../../world/overlay';
import { eventTargetable } from '../../world/zonePolicy';
import type { OverlayBuildCtx, PackageGate } from '../types';

const STEP = 0.5;
const GHOST_CYAN = '#7ad8d8';

/** A weather front as the ship sees it (bridged in by the sim each tick —
 *  position/velocity/radius in node space; never persisted). */
export interface SeaFront {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  intensity: number;
}

/** The whole Wraithsail mechanic as data — every number a knob. */
export interface WraithsailSurge {
  /** Node-units/sec under plain sail on a calm sea. */
  baseSpeed: number;
  /** Riding a front: her speed is the front's own × this (a ship on a storm
   *  outruns the storm's centre a little)… */
  rideSpeedMul: number;
  /** …but never below this — a crawling front still carries her at way. */
  minRideSpeed: number;
  /** Per-STEP chance of a sporadic heading change on calm seas. */
  turnChance: number;
  /** Per-STEP chance she's briefly BECALMED (drops way entirely). */
  becalmChance: number;
  becalmSeconds: [number, number];
  /** Seconds between ghost-wake points while she has way on. */
  wakeEvery: number;
  /** Wake points kept (the map trail's length). */
  wakeKeep: number;
  /** Node-units past the charted bounds she may roam. */
  boundsPad: number;
  /** Sailing within this of her hull arms the boarding dwell (node-units). */
  interceptRadius: number;
  /** Sailing within this sights her (the wraithsail_seen ledger + toast). */
  sightRadius: number;
  /** After a boarding resolves (fled or won) before she'll be boarded again. */
  boardCooldownSeconds: [number, number];
  /** Ship-to-port-node distance inside which a docking may roll. */
  dockRadius: number;
  /** Per-STEP docking chance while eligible (× the package's ignitionMul). */
  dockChance: number;
  /** How long she lies alongside once docked. */
  dockSeconds: [number, number];
  /** Between dockings anywhere. */
  dockCooldownSeconds: [number, number];
  /** After the Regent falls before a new Wraithsail rises. */
  respawnSeconds: [number, number];
  /** The shore party the docking walks ashore (presence-banded roster). */
  party: PackTableEntry[];
  partyCount: [number, number];
  partyLevelBonus: number;
  /** The party's champion (promoted rare, leads them up the strand). */
  heraldId: string;
  /** The boarding chain's tileset + the flagship boss. */
  tileset: string;
  regentId: string;
  /** Coffer breakables the hold deck plants (layoutParams passthrough). */
  cofferBand: [number, number];
  color: string;
}

/** What the engine reads to pour a docked shore party. */
export interface WraithsailDockInfo {
  id: string;
  dockSeq: number;
  zoneId: string;
  party: PackTableEntry[];
  partyCount: [number, number];
  partyLevelBonus: number;
  heraldId: string;
  color: string;
}

interface ShipState {
  id: string;
  coord: MapCoord;
  heading: number;
  mode: 'running' | 'becalmed' | 'riding' | 'docked';
  becalmLeft: number;
  /** Coast-sheer grace: after reflecting off land, storm-riding waits this
   *  out before re-locking the heading (else she grinds the coast forever). */
  sheerLeft: number;
  /** A boarding in progress holds her in place (the decks ARE her). */
  holdLeft: number;
  wake: { x: number; y: number }[];
  wakeAcc: number;
  dockZoneId: string | null;
  dockLeft: number;
  dockSeq: number;
}

export class WraithsailField implements WorldOverlay {
  readonly id = 'wraithsail';
  /** Durable: a lone wanderer that forgot where she was on every relaunch
   *  would never read as ONE ship — position, mode and cooldowns persist. */
  readonly persistence = 'durable' as const;
  readonly mapLabel = 'The Wraithsail';

  private rng: Rng;
  private readonly gate: () => PackageGate;
  private readonly cfg: WraithsailSurge;
  private ship: ShipState | null = null;
  /** Seconds until a new ship may rise (starts open; set on the Regent's fall). */
  private respawnLeft = 0;
  private boardCooldownLeft = 0;
  private dockCooldownLeft = 0;
  private seq = 0;
  private acc = 0;
  /** Ephemeral — bridged in by the sim each tick, never persisted. */
  private fronts: SeaFront[] = [];

  constructor(ctx: OverlayBuildCtx, surge: WraithsailSurge) {
    this.rng = new Rng(ctx.seed);
    this.gate = ctx.gate;
    this.cfg = surge;
  }

  /** The sim's weather bridge (overlays can't see the weather field). */
  setFronts(fs: SeaFront[]): void {
    this.fronts = fs;
  }

  update(dt: number, view: OverlayView): void {
    const g = this.gate();
    this.respawnLeft = Math.max(0, this.respawnLeft - dt);
    this.boardCooldownLeft = Math.max(0, this.boardCooldownLeft - dt);
    this.dockCooldownLeft = Math.max(0, this.dockCooldownLeft - dt);
    const s = this.ship;
    if (!s) {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        if (g.active && this.respawnLeft <= 0) this.trySpawn(view);
      }
      return;
    }
    s.becalmLeft = Math.max(0, s.becalmLeft - dt);
    s.sheerLeft = Math.max(0, s.sheerLeft - dt);
    s.holdLeft = Math.max(0, s.holdLeft - dt);

    // DOCKED: she lies alongside until the layover ends (or the party breaks).
    if (s.mode === 'docked') {
      s.dockLeft = Math.max(0, s.dockLeft - dt);
      if (s.dockLeft <= 0) this.undock(s, view);
      return;
    }
    if (s.holdLeft > 0) return; // boarded — the decks are her; she holds

    // STORM-RIDING: the strongest front over her hull sets her heading —
    // she arrives WITH the storm. A fresh coast-sheer suspends the lock.
    const front = this.strongestFrontOver(s.coord);
    let speed: number;
    if (front && s.sheerLeft <= 0) {
      const fv = Math.hypot(front.vx, front.vy);
      if (fv > 0.01) s.heading = Math.atan2(front.vy, front.vx);
      speed = Math.max(this.cfg.minRideSpeed, fv * this.cfg.rideSpeedMul);
      s.mode = 'riding';
      s.becalmLeft = 0; // no calm inside a storm
    } else if (s.becalmLeft > 0) {
      s.mode = 'becalmed';
      speed = 0;
    } else {
      s.mode = 'running';
      speed = this.cfg.baseSpeed;
    }

    // Sporadic wander + docking rolls on the fixed step (seed-stable).
    this.acc += dt;
    while (this.acc >= STEP) {
      this.acc -= STEP;
      if (s.mode === 'running') {
        if (this.rng.chance(this.cfg.turnChance)) s.heading += this.rng.range(-1.3, 1.3);
        if (this.rng.chance(this.cfg.becalmChance)) {
          s.becalmLeft = this.rng.range(this.cfg.becalmSeconds[0], this.cfg.becalmSeconds[1]);
        }
      }
      this.maybeDock(s, view, g);
    }

    if (speed > 0) {
      this.drift(s, speed, dt, this.visibleBounds(view), view.terrain);
      s.wakeAcc += dt;
      if (s.wakeAcc >= this.cfg.wakeEvery) {
        s.wakeAcc = 0;
        s.wake.push({ x: s.coord.x, y: s.coord.y });
        if (s.wake.length > this.cfg.wakeKeep) s.wake.splice(0, s.wake.length - this.cfg.wakeKeep);
      }
    }
  }

  onNodeCharted(): void { /* the sea needs no seeding */ }

  affectSpawns(): SpawnBias {
    // The ship reweights nothing ambient — her presence is the boarding and
    // the docking, both materialized by the engine off this field's reads.
    return NO_BIAS;
  }

  activityAt(zid: string): number {
    const s = this.ship;
    return s && s.mode === 'docked' && s.dockZoneId === zid ? 0.6 : 0;
  }

  renderMap(): MapLayer {
    const s = this.ship;
    if (!s) return { under: '', over: '' };
    // The GHOST WAKE: a fading trail of cold rings behind her — a single
    // ship tracing the sea, never a front, never a blob.
    let under = '';
    for (let i = 0; i < s.wake.length; i++) {
      const w = s.wake[i];
      const t = (i + 1) / s.wake.length; // old → new
      under += `<circle cx="${w.x.toFixed(1)}" cy="${w.y.toFixed(1)}" r="${(1.2 + t * 2.2).toFixed(1)}" `
        + `fill="none" stroke="${GHOST_CYAN}" stroke-opacity="${(0.06 + t * 0.22).toFixed(3)}" stroke-width="1.1"/>`;
    }
    const over = `<circle cx="${s.coord.x.toFixed(1)}" cy="${s.coord.y.toFixed(1)}" r="9" `
      + `fill="none" stroke="${GHOST_CYAN}" stroke-opacity="0.35" stroke-width="1.4">`
      + `<animate attributeName="r" values="7;12;7" dur="3.2s" repeatCount="indefinite"/></circle>`;
    return { under, over };
  }

  // --- engine reads ------------------------------------------------------------

  surge(): WraithsailSurge { return this.cfg; }

  /** Where she is (node space) — null when the sea is empty. */
  shipInfo(): { id: string; x: number; y: number; heading: number; mode: ShipState['mode'] } | null {
    const s = this.ship;
    return s ? { id: s.id, x: s.coord.x, y: s.coord.y, heading: s.heading, mode: s.mode } : null;
  }

  /** May a sailing player board her right now? */
  boardable(): boolean {
    const s = this.ship;
    return !!s && s.mode !== 'docked' && s.holdLeft <= 0 && this.boardCooldownLeft <= 0 && this.gate().active;
  }

  /** The docking the engine materializes ashore (null = she isn't alongside). */
  dockedOn(zoneId: string): WraithsailDockInfo | null {
    const s = this.ship;
    if (!s || s.mode !== 'docked' || s.dockZoneId !== zoneId) return null;
    return {
      id: s.id, dockSeq: s.dockSeq, zoneId,
      party: this.cfg.party, partyCount: this.cfg.partyCount,
      partyLevelBonus: this.cfg.partyLevelBonus, heraldId: this.cfg.heraldId,
      color: this.cfg.color,
    };
  }

  /** A boarding began: hold her in place (the decks ARE her) and arm the
   *  re-board cooldown for when it resolves. */
  onBoarded(): void {
    const s = this.ship;
    if (!s) return;
    s.holdLeft = 1800; // released by onBoardingLeft/onRegentSlain
    s.becalmLeft = 0;
  }

  /** The boarder left her decks (fled, or looted and gone) — she sails on. */
  onBoardingLeft(): void {
    const s = this.ship;
    if (!s) return;
    s.holdLeft = 0;
    this.boardCooldownLeft = this.rng.range(this.cfg.boardCooldownSeconds[0], this.cfg.boardCooldownSeconds[1]);
  }

  /** The Regent fell in his great cabin: the Wraithsail goes down with him.
   *  Returns true if a ship actually sank (ledger gates ride this). */
  onRegentSlain(): boolean {
    if (!this.ship) return false;
    this.ship = null;
    this.respawnLeft = this.rng.range(this.cfg.respawnSeconds[0], this.cfg.respawnSeconds[1]);
    return true;
  }

  /** The shore party was broken to the last — she slips her mooring early.
   *  Returns true if she was in fact docked here. */
  onPartyBroken(zoneId: string): boolean {
    const s = this.ship;
    if (!s || s.mode !== 'docked' || s.dockZoneId !== zoneId) return false;
    s.dockLeft = 0; // the next tick's undock path handles the seaward turn
    return true;
  }

  /** Read-only snapshot for markers/QA. */
  peek(): { id: string; x: number; y: number; mode: ShipState['mode']; dockZoneId: string | null } | null {
    const s = this.ship;
    return s ? { id: s.id, x: s.coord.x, y: s.coord.y, mode: s.mode, dockZoneId: s.dockZoneId } : null;
  }

  // --- worldstate (the persistence pledge) -----------------------------------

  /** Pure JSON: the ship (wake included), the three cooldowns, the counter. */
  snapshot(): unknown {
    return {
      ship: this.ship ? { ...this.ship, coord: { ...this.ship.coord }, wake: this.ship.wake.map(w => ({ ...w })) } : null,
      respawnLeft: this.respawnLeft,
      boardCooldownLeft: this.boardCooldownLeft,
      dockCooldownLeft: this.dockCooldownLeft,
      seq: this.seq,
    };
  }

  restore(snap: unknown): void {
    const s = snap as {
      ship?: Partial<ShipState> | null; respawnLeft?: unknown;
      boardCooldownLeft?: unknown; dockCooldownLeft?: unknown; seq?: unknown;
    } | null;
    if (!s || typeof s !== 'object') return;
    const num = (v: unknown, def: number): number =>
      typeof v === 'number' && Number.isFinite(v) ? v : def;
    this.respawnLeft = Math.max(0, num(s.respawnLeft, 0));
    this.boardCooldownLeft = Math.max(0, num(s.boardCooldownLeft, 0));
    this.dockCooldownLeft = Math.max(0, num(s.dockCooldownLeft, 0));
    if (typeof s.seq === 'number' && Number.isFinite(s.seq)) this.seq = Math.max(this.seq, Math.floor(s.seq));
    this.ship = null;
    const raw = s.ship;
    if (raw && typeof raw === 'object' && typeof raw.id === 'string'
      && raw.coord && [raw.coord.x, raw.coord.y].every(n => typeof n === 'number' && Number.isFinite(n))) {
      const mode = raw.mode === 'running' || raw.mode === 'becalmed' || raw.mode === 'riding' || raw.mode === 'docked'
        ? raw.mode : 'running';
      const wake: { x: number; y: number }[] = [];
      if (Array.isArray(raw.wake)) {
        for (const w of raw.wake) {
          if (w && typeof w === 'object' && [(w as { x: unknown }).x, (w as { y: unknown }).y]
            .every(n => typeof n === 'number' && Number.isFinite(n))) {
            wake.push({ x: (w as { x: number }).x, y: (w as { y: number }).y });
          }
        }
      }
      this.ship = {
        id: raw.id,
        coord: { x: raw.coord.x, y: raw.coord.y },
        heading: num(raw.heading, 0),
        mode,
        becalmLeft: Math.max(0, num(raw.becalmLeft, 0)),
        sheerLeft: Math.max(0, num(raw.sheerLeft, 0)),
        holdLeft: Math.max(0, num(raw.holdLeft, 0)),
        wake: wake.slice(-this.cfg.wakeKeep),
        wakeAcc: Math.max(0, num(raw.wakeAcc, 0)),
        dockZoneId: typeof raw.dockZoneId === 'string' ? raw.dockZoneId : null,
        dockLeft: Math.max(0, num(raw.dockLeft, 0)),
        dockSeq: Math.max(0, Math.floor(num(raw.dockSeq, 0))),
      };
      // A docked ship must still have a dock to be docked AT.
      if (this.ship.mode === 'docked' && !this.ship.dockZoneId) this.ship.mode = 'running';
    }
  }

  /** A culled port can't host her mooring — she casts off in place. */
  pruneZones(has: (zoneId: string) => boolean): void {
    const s = this.ship;
    if (s && s.dockZoneId && !has(s.dockZoneId)) {
      s.dockZoneId = null;
      s.dockLeft = 0;
      if (s.mode === 'docked') s.mode = 'running';
    }
  }

  // --- dev seams ---------------------------------------------------------------

  /** DEV: summon (or move) the ship onto open water near the given zone. */
  devSummon(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z) return false;
    const at = this.oceanNear(z.map, view);
    if (!at) return false;
    if (this.ship) {
      this.ship.coord = at;
      this.ship.mode = 'running';
      this.ship.dockZoneId = null; this.ship.dockLeft = 0; this.ship.holdLeft = 0;
    } else {
      this.ship = this.mintShip(at);
    }
    return true;
  }

  /** DEV: force her alongside the given port zone right now. */
  devDock(view: OverlayView, zoneId: string): boolean {
    const z = view.byId[zoneId];
    if (!z || !this.dockableZone(z)) return false;
    if (!this.ship) {
      const at = this.oceanNear(z.map, view);
      if (!at) return false;
      this.ship = this.mintShip(at);
    }
    this.dock(this.ship, z);
    return true;
  }

  // --- internals -----------------------------------------------------------------

  /** Where may she lie alongside? Ports only, under the shared event policy
   *  (never safe ground, never event-owned arenas — towns keep their peace). */
  private dockableZone(z: ZoneDef): boolean {
    return !!z.port && eventTargetable(this.id, z);
  }

  private strongestFrontOver(c: MapCoord): SeaFront | null {
    let best: SeaFront | null = null;
    let bestS = 0.05;
    for (const f of this.fronts) {
      const d = Math.hypot(f.x - c.x, f.y - c.y);
      if (d > f.radius) continue;
      const s = f.intensity * (1 - d / f.radius);
      if (s > bestS) { bestS = s; best = f; }
    }
    return best;
  }

  private maybeDock(s: ShipState, view: OverlayView, g: PackageGate): void {
    if (!g.active || this.dockCooldownLeft > 0 || s.holdLeft > 0) return;
    const here = view.byId[view.currentZoneId];
    if (!here || !this.dockableZone(here)) return;
    if (Math.hypot(here.map.x - s.coord.x, here.map.y - s.coord.y) > this.cfg.dockRadius) return;
    if (!this.rng.chance(this.cfg.dockChance * g.ignitionMul)) return;
    this.dock(s, here);
  }

  private dock(s: ShipState, z: ZoneDef): void {
    s.mode = 'docked';
    s.dockZoneId = z.id;
    s.dockLeft = this.rng.range(this.cfg.dockSeconds[0], this.cfg.dockSeconds[1]);
    s.dockSeq++;
    s.becalmLeft = 0;
    // She noses in beside the node — the map shows her AT the port.
    s.coord = { x: z.map.x + this.rng.range(-6, 6), y: z.map.y + this.rng.range(-6, 6) };
  }

  private undock(s: ShipState, view: OverlayView): void {
    s.mode = 'running';
    s.dockZoneId = null;
    s.dockLeft = 0;
    this.dockCooldownLeft = this.rng.range(this.cfg.dockCooldownSeconds[0], this.cfg.dockCooldownSeconds[1]);
    // Seaward: probe eight bearings and take the first that reads ocean a
    // step out (jittered so she doesn't always leave the same way).
    const start = this.rng.int(0, 7);
    for (let i = 0; i < 8; i++) {
      const a = ((start + i) % 8) / 8 * Math.PI * 2;
      const probe = { x: s.coord.x + Math.cos(a) * 14, y: s.coord.y + Math.sin(a) * 14 };
      if (view.terrain(probe) === 'ocean') {
        s.heading = a;
        s.coord = probe;
        return;
      }
    }
    s.heading = this.rng.range(0, Math.PI * 2); // landlocked oddity — drift free
  }

  /** THE INVERTED DRIFT: the Deadwake reflects off the sea; the Wraithsail
   *  reflects off the LAND — same axis-mirror idiom, opposite element. A
   *  reflection arms a short sheer so storm-riding can't grind her back
   *  into the coast on the very next tick. */
  private drift(s: ShipState, speed: number, dt: number,
    bounds: { minX: number; minY: number; maxX: number; maxY: number } | null,
    terrain: (c: MapCoord) => 'land' | 'ocean' | 'bridge'): void {
    const nx = s.coord.x + Math.cos(s.heading) * speed * dt;
    const ny = s.coord.y + Math.sin(s.heading) * speed * dt;
    if (terrain({ x: nx, y: ny }) !== 'ocean') {
      const landX = terrain({ x: nx, y: s.coord.y }) !== 'ocean';
      const landY = terrain({ x: s.coord.x, y: ny }) !== 'ocean';
      if (landX) s.heading = Math.PI - s.heading;
      if (landY) s.heading = -s.heading;
      if (!landX && !landY) s.heading += Math.PI; // a corner cove — come about
      s.sheerLeft = 5;
      if (s.mode === 'riding') s.mode = 'running';
      return; // hold this step; the next tick moves along the new heading
    }
    s.coord.x = nx;
    s.coord.y = ny;
    if (!bounds) return;
    if (s.coord.x < bounds.minX) { s.coord.x = bounds.minX; s.heading = Math.PI - s.heading; }
    else if (s.coord.x > bounds.maxX) { s.coord.x = bounds.maxX; s.heading = Math.PI - s.heading; }
    if (s.coord.y < bounds.minY) { s.coord.y = bounds.minY; s.heading = -s.heading; }
    else if (s.coord.y > bounds.maxY) { s.coord.y = bounds.maxY; s.heading = -s.heading; }
  }

  /** Charted-world bounding box, padded — she roams the known sea's margins
   *  (the deadwake idiom, wider: the ocean runs past the coast). */
  private visibleBounds(view: OverlayView): { minX: number; minY: number; maxX: number; maxY: number } | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let any = false;
    for (const n of view.nodes) {
      if (!view.visited.has(n.id) || n.caveDepth != null) continue;
      any = true;
      minX = Math.min(minX, n.map.x); maxX = Math.max(maxX, n.map.x);
      minY = Math.min(minY, n.map.y); maxY = Math.max(maxY, n.map.y);
    }
    if (!any) return null;
    const pad = this.cfg.boundsPad;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  /** Birth over open water inside the charted margins (inverse deadwake:
   *  born AT SEA, never ashore). No ocean in the box yet = no ship yet. */
  private trySpawn(view: OverlayView): void {
    const bounds = this.visibleBounds(view);
    if (!bounds) return;
    for (let i = 0; i < 24; i++) {
      const at = {
        x: this.rng.range(bounds.minX, bounds.maxX),
        y: this.rng.range(bounds.minY, bounds.maxY),
      };
      if (view.terrain(at) !== 'ocean') continue;
      this.ship = this.mintShip(at);
      return;
    }
  }

  /** Open water near a node (dev seams): ring-probe outward. */
  private oceanNear(c: MapCoord, view: OverlayView): MapCoord | null {
    for (let r = 24; r <= 160; r += 24) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const at = { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
        if (view.terrain(at) === 'ocean') return at;
      }
    }
    return null;
  }

  private mintShip(at: MapCoord): ShipState {
    return {
      id: `wraithsail_${this.seq++}`,
      coord: { x: at.x, y: at.y },
      heading: this.rng.range(0, Math.PI * 2),
      mode: 'running',
      becalmLeft: 0, sheerLeft: 0, holdLeft: 0,
      wake: [], wakeAcc: 0,
      dockZoneId: null, dockLeft: 0, dockSeq: 0,
    };
  }
}

// --- map marker + zone-info (registered on import) -----------------------------
registerMarkerSource((world: World): MapMarker[] => {
  const wf = world.sim.wraithsailField;
  const s = wf?.peek();
  if (!wf || !s) return [];
  return [{
    id: `wraithsail-${s.id}`, coord: { x: s.x, y: s.y },
    glyph: '⛵',
    fill: '#0a1a1e', stroke: GHOST_CYAN, text: '#bfe8ec', r: 8,
    title: s.mode === 'docked' ? 'The WRAITHSAIL lies alongside — the Drowned Court walks ashore'
      : s.mode === 'riding' ? 'The Wraithsail RIDES THE STORM — she arrives with the weather'
        : 'The Wraithsail — the sea\'s lone wanderer (cross her under sail to board)',
    fog: 'always', z: 19,
  }];
});

registerZoneInfoSource((world: World, zoneId: string): ZoneInfoEntry[] => {
  const info = world.sim.wraithsailField?.dockedOn(zoneId);
  if (!info) return [];
  return [{
    kind: 'event', icon: '⛵', color: info.color,
    label: 'The Wraithsail Alongside',
    detail: 'the ghost ship lies at this harbor — the Drowned Court is ashore until she slips her mooring',
    z: 15,
  }];
});
