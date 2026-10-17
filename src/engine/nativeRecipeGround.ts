import { dist, vec, type Vec2 } from '../core/math';
import { boundsOf, insideBounds } from '../world/shape';
import { GridWalkField, type NativeGridGroundClaim, type NativeGridGroundView } from '../world/gridWalk';
import type { Doodad, GenCtx, Reservation } from './levelgen';

export interface RecipeApron {
  dx: number; dy: number; ox: number; oy: number;
  n: Vec2; cell: number; edge: boolean;
}
export interface RecipeGroundHooks {
  cell: number; border: number; entryClear: number; exitClear: number;
  rectReserved(ctx: GenCtx, rect: { x: number; y: number; w: number; h: number }): boolean;
  inReserved(ctx: GenCtx, at: Vec2, radius: number): boolean;
  blocked(ctx: GenCtx, at: Vec2, radius: number): boolean;
  entryDoorEscape(ctx: GenCtx, from: Vec2, to: Vec2, bodyRadius: number,
    paddedRadius: number): Doodad | null;
  paintBlocked(ctx: GenCtx, rect: { x: number; y: number; w: number; h: number }): boolean;
  erases(ctx: GenCtx, rect: { x: number; y: number; w: number; h: number }): boolean;
  barrierRects(ctx: GenCtx): { x: number; y: number; w: number; h: number }[] | null;
  candidates(original: { x: number; y: number }, loX: number, hiX: number,
    loY: number, hiY: number): Iterable<{ x: number; y: number }>;
  admit(ctx: GenCtx, at: Vec2, w: number, h: number, aprons: RecipeApron[]): Vec2 | null;
  way(ctx: GenCtx, points: readonly Vec2[]): Reservation[];
}
export interface RecipeGroundFacts {
  terminal: string;
  considered: number;
  routeCells: number;
  paintedCells: number;
  firstRefusals: Record<string, number>;
}
interface RecipeOwner {
  readonly grid: GridWalkField;
  readonly claim: NativeGridGroundClaim;
  readonly ownReservations: Map<Reservation, () => boolean>;
  readonly interior?: true;
}
const owners = new WeakMap<GenCtx, RecipeOwner>();
const nativeArrayPush = Array.prototype.push;

/** Capture plain native records without executing an accessor or toJSON.
 * Identity and every descriptor/value are checked again after callback-capable
 * admission. Unsupported authored objects decline recovery, never fitting. */
function plainSeal(roots: readonly unknown[]): (() => boolean) | undefined {
  type Node = { value: object; proto: object | null; keys: PropertyKey[]; descriptors: PropertyDescriptor[] };
  const nodes: Node[] = [], seen = new Set<object>();
  let descriptorCount = 0;
  const visit = (value: unknown): boolean => {
    if (value === null || typeof value !== 'object') return true;
    if (seen.has(value)) return true;
    seen.add(value);
    const proto = Object.getPrototypeOf(value);
    if (proto !== null && proto !== Object.prototype && proto !== Array.prototype) return false;
    const keys = Reflect.ownKeys(value);
    descriptorCount += keys.length;
    if (nodes.length >= 65536 || descriptorCount > 262144) return false;
    const descriptors: PropertyDescriptor[] = [];
    for (const key of keys) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (!d || !('value' in d)) return false;
      descriptors.push(d);
    }
    nodes.push({ value, proto, keys, descriptors });
    return descriptors.every(d => visit(d.value));
  };
  if (!roots.every(visit)) return undefined;
  return () => nodes.every(node => {
    if (Object.getPrototypeOf(node.value) !== node.proto) return false;
    const keys = Reflect.ownKeys(node.value);
    if (keys.length !== node.keys.length || keys.some((k, i) => k !== node.keys[i])) return false;
    return keys.every((key, i) => {
      const a = node.descriptors[i], b = Object.getOwnPropertyDescriptor(node.value, key);
      return !!b && 'value' in b && Object.is(a.value, b.value)
        && a.writable === b.writable && a.enumerable === b.enumerable && a.configurable === b.configurable;
    });
  });
}

/** The collector is local to winding. A reservation is attested at its actual
 * construction, before the selected ctx.reserved.push can inspect or change it.
 * The receipt is opaque; an array tail or structural lookalike grants no right. */
export interface RecipeReservationReceipt { readonly token: object }
const reservationReceipts = new WeakMap<RecipeReservationReceipt, Map<Reservation, () => boolean>>();
export function beginRecipeReservations(): {
  capture(reservation: Reservation): void; finish(): RecipeReservationReceipt;
} {
  const receipt = Object.freeze({ token: Object.freeze({}) });
  const records = new Map<Reservation, () => boolean>();
  let done = false;
  reservationReceipts.set(receipt, records);
  return Object.freeze({
    capture(reservation: Reservation): void {
      if (done) throw Error('Native recipe reservation receipt is sealed');
      const seal = plainSeal([reservation]);
      if (!seal) throw Error('Native recipe reservation must be a plain record');
      records.set(reservation, seal);
    },
    finish(): RecipeReservationReceipt { done = true; return receipt; },
  });
}

/** Registered only by the actual winding producer after its negative paint.
 * Only exact originally sealed emitter records receive connector exemptions. */
export function installRecipeGround(ctx: GenCtx, grid: GridWalkField,
  claim: NativeGridGroundClaim, receipt: RecipeReservationReceipt): void {
  owners.get(ctx)?.claim.close();
  owners.delete(ctx);
  const records = reservationReceipts.get(receipt);
  reservationReceipts.delete(receipt);
  if (!records || [...records].some(([reservation, unchanged]) =>
    !ctx.reserved.includes(reservation) || !unchanged())) { claim.close(); return; }
  owners.set(ctx, { grid, claim, ownReservations: records });
}
/** The interior producer hands over only its factory's initial-wall claim.
 * Its rooms, corridors and themed wall pass have already consumed their cells.
 * No reservation or room-door bypass authority is conferred. */
export function installInteriorRecipeGround(ctx: GenCtx, grid: GridWalkField,
  claim: NativeGridGroundClaim): void {
  owners.get(ctx)?.claim.close();
  owners.delete(ctx);
  if (Object.getOwnPropertyDescriptor(ctx, 'walk')?.value !== grid) { claim.close(); return; }
  owners.set(ctx, { grid, claim, ownReservations: new Map(), interior: true });
}

export function closeRecipeGround(ctx: GenCtx): void {
  owners.get(ctx)?.claim.close();
  owners.delete(ctx);
}

/** Preserve the physical floor partition with ALL doors shut, independent of
 * their present open/broken flags, and all current ground-level movement
 * blockers present. Authored door cells and actual blocking shape bounds are
 * barriers. New ground may touch only entry's old component, and may not touch
 * a barrier cell; the conservative halo prevents a coarse blocked cell from
 * hiding a new side connection.
 * Every possible painted cell is screened, including the complete future
 * footprint and aprons, not merely selected connector endpoints. */
function interiorGroundPartition(ctx: GenCtx, view: NativeGridGroundView,
  hooks: RecipeGroundHooks): { paint(i: number): boolean; floor(i: number): boolean } | null {
  const { cols, rows, cell } = view.packed, total = cols * rows;
  const barrierRects = hooks.barrierRects(ctx);
  if (!barrierRects) return null;
  const barriers = new Uint8Array(total), labels = new Int32Array(total), queue = new Int32Array(total);
  labels.fill(-1);
  const validRect = (r: { x: number; y: number; w: number; h: number }): boolean =>
    [r.x, r.y, r.w, r.h, r.x + r.w, r.y + r.h].every(Number.isFinite) && r.w >= 0 && r.h >= 0;
  for (const r of barrierRects) {
    if (!validRect(r) || r.w <= 0 || r.h <= 0) return null;
    for (let y = Math.max(0, Math.floor(r.y / cell)); y < Math.min(rows, Math.ceil((r.y + r.h) / cell)); y++)
      for (let x = Math.max(0, Math.floor(r.x / cell)); x < Math.min(cols, Math.ceil((r.x + r.w) / cell)); x++)
        barriers[y * cols + x] = 1;
  }
  const adjacent = (i: number): number[] => {
    const x = i % cols, y = Math.floor(i / cols);
    return [x > 0 ? i - 1 : -1, x + 1 < cols ? i + 1 : -1,
      y > 0 ? i - cols : -1, y + 1 < rows ? i + cols : -1];
  };
  let component = 0;
  for (let start = 0; start < total; start++) {
    if (view.mask[start] !== 1 || barriers[start] || labels[start] >= 0) continue;
    let head = 0, tail = 1;
    queue[0] = start; labels[start] = component;
    while (head < tail) for (const next of adjacent(queue[head++])) {
      if (next < 0 || view.mask[next] !== 1 || barriers[next] || labels[next] >= 0) continue;
      labels[next] = component; queue[tail++] = next;
    }
    component++;
  }
  const ex = Math.floor(ctx.entry.x / cell), ey = Math.floor(ctx.entry.y / cell);
  if (ex < 0 || ey < 0 || ex >= cols || ey >= rows) return null;
  const entry = labels[ey * cols + ex];
  if (entry < 0) return null;
  // Structure metadata can protect real authored space even with no collision
  // paint (the native interior itself has an empty rect). Preserve its full
  // floor/roof/courtyard fields; decline unsupported zero-rect feature records.
  const protectedRects: { x: number; y: number; w: number; h: number }[] = [];
  for (const structure of ctx.structures ?? []) {
    if (!Array.isArray(structure.roofs) || !Array.isArray(structure.floors)
      || !Array.isArray(structure.courtyards) || !Array.isArray(structure.slots)) return null;
    const rects = [structure.rect, ...structure.roofs, ...structure.floors, ...structure.courtyards];
    if (rects.some(r => !r || !validRect(r))) return null;
    protectedRects.push(...rects.filter(r => r.w > 0 && r.h > 0));
    if ((!structure.rect.w || !structure.rect.h)
      && (structure.slots.length || structure.spawn || structure.rooms?.length || structure.storeys?.length)) return null;
  }
  return {
    floor: i => labels[i] === entry,
    paint: i => {
      if (barriers[i]) return false;
      const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
      if (protectedRects.some(r => x < r.x + r.w && x + cell > r.x && y < r.y + r.h && y + cell > r.y)) return false;
      return adjacent(i).every(next => next < 0 || !barriers[next]
        && (view.mask[next] !== 1 || labels[next] === entry));
    },
  };
}

/** A fixed finite negative-ground annex. No random choice, plan resolution,
 * terrain reroll, public-version authority, or relaxed admission lives here. */
export function recoverRecipeGround(ctx: GenCtx, selected: Vec2, w: number, h: number,
  aprons: RecipeApron[], hooks: RecipeGroundHooks, facts?: RecipeGroundFacts): Vec2 | null {
  const owner = owners.get(ctx);
  if (!owner || Object.getOwnPropertyDescriptor(ctx, 'walk')?.value !== owner.grid || ctx.retainedFixtureFit) return null;
  const refused = (reason: string): false => {
    if (facts) facts.firstRefusals[reason] = (facts.firstRefusals[reason] ?? 0) + 1;
    return false;
  };
  for (const [reservation, unchanged] of owner.ownReservations) {
    if (!ctx.reserved.includes(reservation) || !unchanged()) return null;
  }
  const contextKeys = ['arena', 'entry', 'exits', 'doodads', 'reserved', 'pois', 'camps',
    'garrisons', 'npcs', 'breakables', 'mustReach', 'structures', 'ruleOver', 'gridEnsured', 'retainedFixtureFit'] as const;
  const descriptors = contextKeys.map(key => Object.getOwnPropertyDescriptor(ctx, key));
  if (descriptors.some(d => d && !('value' in d))) return null;
  // Recovery appends new native way records. Decline exotic append policies
  // before acquiring ground; ordinary placement keeps its selected methods.
  const canAppend = (): boolean =>
    Object.getOwnPropertyDescriptor(Array.prototype, 'push')?.value === nativeArrayPush
    && !Object.getOwnPropertyDescriptor(ctx.doodads, 'push')
    && !Object.getOwnPropertyDescriptor(ctx.reserved, 'push');
  if (!canAppend()) return null;
  const sealed = plainSeal(descriptors.map(d => d?.value));
  if (!sealed) return null;
  const unchanged = (): boolean => Object.getOwnPropertyDescriptor(ctx, 'walk')?.value === owner.grid && canAppend() && sealed() && contextKeys.every((key, i) => {
    const old = descriptors[i], now = Object.getOwnPropertyDescriptor(ctx, key);
    return old ? !!now && 'value' in now && Object.is(now.value, old.value)
      && now.writable === old.writable && now.enumerable === old.enumerable && now.configurable === old.configurable
      : now === undefined;
  });
  const view = owner.claim.snapshot();
  if (!view || view.packed.cell !== hooks.cell) return null;
  const { cols, rows, cell } = view.packed, total = cols * rows;
  if (!Number.isSafeInteger(total) || total <= 0 || total > 65536) return null;
  const original = GridWalkField.unpack(view.packed), owned = new Uint8Array(total);
  original.mask.set(view.mask);
  for (const i of view.owned) owned[i] = 1;
  const bounds = boundsOf(ctx.arena), backing = boundsOf({ w: cols * cell, h: rows * cell });
  const bodyR = cell / 2, edge = aprons.filter(a => a.edge);
  if (!edge.length) return null;
  const point = (i: number): Vec2 => vec((i % cols + .5) * cell, (Math.floor(i / cols) + .5) * cell);
  const index = (p: Vec2): number => {
    const x = Math.floor(p.x / cell), y = Math.floor(p.y / cell);
    return x >= 0 && y >= 0 && x < cols && y < rows ? y * cols + x : -1;
  };
  const foreign = { ...ctx, ruleOver: undefined, reserved: ctx.reserved.filter(r => !owner.ownReservations.has(r)) };
  const strict = { ...ctx, ruleOver: undefined };
  const partition = owner.interior ? interiorGroundPartition(ctx, view, hooks) : undefined;
  if (owner.interior && !partition) { if (facts) facts.terminal = 'interior-partition'; return null; }
  const allowed = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    const p = point(i);
    if (!owned[i] && !original.isWalkable(p.x, p.y)) continue;
    if (partition && !(owned[i] ? partition.paint(i) : partition.floor(i))) continue;
    // Repainting owns a complete cell square, not an inscribed body disc.
    // Reject foreign reservations and whole-shape overlap on every tier.
    if (owned[i]) {
      const cellRect = { x: p.x - bodyR, y: p.y - bodyR, w: cell, h: cell };
      if (hooks.rectReserved(foreign, cellRect) || hooks.paintBlocked(ctx, cellRect)) continue;
    }
    if (!insideBounds(p, bodyR, bounds) || !insideBounds(p, bodyR, backing)) continue;
    if (hooks.inReserved(foreign, p, bodyR) || hooks.blocked(ctx, p, bodyR)) continue;
    allowed[i] = 1;
  }
  const start = index(ctx.entry);
  if (start < 0 || !allowed[start] || !original.isWalkable(ctx.entry.x, ctx.entry.y)) return null;
  // Segment checks cover the whole body between cell centers, not just the
  // endpoints. Padding by half a sample step is conservative for native shapes.
  const segmentClear = (from: Vec2, to: Vec2, bodyContext: GenCtx = ctx): boolean => {
    const length = dist(from, to), n = Math.max(1, Math.ceil(length / 5)), r = bodyR + length / n / 2;
    for (let k = 0; k <= n; k++) {
      const p = vec(from.x + (to.x - from.x) * k / n, from.y + (to.y - from.y) * k / n);
      if (!insideBounds(p, bodyR, bounds) || hooks.inReserved(foreign, p, r) || hooks.blocked(bodyContext, p, r)) return false;
    }
    return true;
  };
  if (!segmentClear(ctx.entry, point(start))) {
    // Native arrival can begin with its body overlapping a door face while
    // its center already lies outside that slab. Only the inherited entry
    // stub may prove the same outward escape as native rectangle push-out.
    // Keep strict-success dispatch intact and never carry this exemption to
    // graph edges, another body, a candidate footprint, or native admission.
    if (!owner.interior || !unchanged() || !owner.claim.current(view)) return null;
    const end = point(start), length = dist(ctx.entry, end);
    const n = Math.max(1, Math.ceil(length / 5)), paddedR = bodyR + length / n / 2;
    const door = hooks.entryDoorEscape(ctx, ctx.entry, end, bodyR, paddedR);
    if (!door || !unchanged() || !owner.claim.current(view)) return null;
    const entryContext: GenCtx = { ...strict, doodads: [] };
    let matches = 0;
    // Keep every other exact record. Do not trust a selected array filter to
    // manufacture a more permissive obstacle view for this one stub.
    for (let i = 0; i < ctx.doodads.length; i++) {
      const d = ctx.doodads[i];
      if (d === door) matches++;
      else entryContext.doodads.push(d);
    }
    if (matches !== 1 || !segmentClear(ctx.entry, end, entryContext)
      || !unchanged() || !owner.claim.current(view)) return null;
  }
  // Entry may lie off a cell center: all ground under that short connector
  // must already exist. Recipe recovery never invents a new portal stand.
  const entryLoX = Math.floor((Math.min(ctx.entry.x, point(start).x) - bodyR) / cell);
  const entryHiX = Math.floor((Math.max(ctx.entry.x, point(start).x) + bodyR) / cell);
  const entryLoY = Math.floor((Math.min(ctx.entry.y, point(start).y) - bodyR) / cell);
  const entryHiY = Math.floor((Math.max(ctx.entry.y, point(start).y) + bodyR) / cell);
  for (let y = entryLoY; y <= entryHiY; y++) for (let x = entryLoX; x <= entryHiX; x++) {
    if (!original.isWalkable((x + .5) * cell, (y + .5) * cell)) return null;
  }
  // Cache exact admitted neighbor edges once. A candidate's route flood then
  // excludes its whole future footprint, so it cannot run through the walls
  // that stamping will raise. The cumulative flood work has an explicit cap.
  const edges = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (!allowed[i]) continue;
    const x = i % cols, y = Math.floor(i / cols);
    if (x + 1 < cols && allowed[i + 1] && segmentClear(point(i), point(i + 1))) {
      edges[i] |= 2; edges[i + 1] |= 1;
    }
    if (y + 1 < rows && allowed[i + cols] && segmentClear(point(i), point(i + cols))) {
      edges[i] |= 8; edges[i + cols] |= 4;
    }
  }
  const previous = new Int32Array(total), queue = new Int32Array(total);
  let routeVisits = 0, trials = 0;
  if (!unchanged() || !owner.claim.current(view)) return null;
  const minX = Math.min(0, ...edge.map(a => w / 2 + a.dx)), maxX = Math.max(w, ...edge.map(a => w / 2 + a.dx));
  const minY = Math.min(0, ...edge.map(a => h / 2 + a.dy)), maxY = Math.max(h, ...edge.map(a => h / 2 + a.dy));
  const span = ctx.arena.boundless ? { w: cols * cell, h: rows * cell } : ctx.arena;
  const margin = ctx.arena.boundless ? 0 : hooks.border;
  const loX = Math.ceil((margin - minX) / cell) * cell, hiX = Math.floor((span.w - margin - maxX) / cell) * cell;
  const loY = Math.ceil((margin - minY) / cell) * cell, hiY = Math.floor((span.h - margin - maxY) / cell) * cell;
  if (loX > hiX || loY > hiY) return null;
  const origin = { x: Math.round((selected.x - w / 2) / cell) * cell,
    y: Math.round((selected.y - h / 2) / cell) * cell };
  for (const site of hooks.candidates(origin, loX, hiX, loY, hiY)) {
    if (facts) facts.considered++;
    const rect = { x: site.x, y: site.y, w, h }, center = vec(site.x + w / 2, site.y + h / 2);
    const corners = [vec(rect.x, rect.y), vec(rect.x + w, rect.y), vec(rect.x, rect.y + h), vec(rect.x + w, rect.y + h)];
    if (corners.some(p => !insideBounds(p, 0, bounds) || !insideBounds(p, 0, backing))) { refused('bounds'); continue; }
    const nearest = (p: Vec2): number => dist(p, vec(Math.max(rect.x, Math.min(p.x, rect.x + w)), Math.max(rect.y, Math.min(p.y, rect.y + h))));
    if (nearest(ctx.entry) < hooks.entryClear || ctx.exits.some(p => nearest(p) < hooks.exitClear)) { refused('portals'); continue; }
    if (hooks.rectReserved(ctx, rect)) { refused('reservation'); continue; }
    // Match the original all-tier destructive site clear, including its
    // per-object 0.4-radius fringe. Recovery has no doodad-deletion authority.
    if (hooks.erases(ctx, rect)) { refused('site-clear'); continue; }
    const inFootprint = (i: number): boolean => {
      const p = point(i); return p.x > rect.x && p.x < rect.x + w && p.y > rect.y && p.y < rect.y + h;
    };
    const patch = new Set<number>(), route = new Set<number>();
    let valid = true;
    // A new building may consume only the recipe's untouched negative ground.
    // It cannot overwrite an existing floor, fixture, protected stand or body.
    for (let y = rect.y / cell; y < (rect.y + h) / cell && valid; y++) {
      for (let x = rect.x / cell; x < (rect.x + w) / cell; x++) {
        const i = y * cols + x;
        if (!owned[i] || !allowed[i]) { valid = false; refused('footprint'); break; }
        patch.add(i);
      }
    }
    if (!valid) continue;
    previous.fill(-1);
    let head = 0, tail = 1;
    queue[0] = start; previous[start] = start;
    while (head < tail) {
      if (++routeVisits > 1048576) { if (facts) facts.terminal = 'route-budget'; return null; }
      const i = queue[head++], bits = edges[i];
      const adjacent = [bits & 1 ? i - 1 : -1, bits & 2 ? i + 1 : -1,
        bits & 4 ? i - cols : -1, bits & 8 ? i + cols : -1];
      for (const next of adjacent) if (next >= 0 && previous[next] < 0 && !inFootprint(next)) {
        previous[next] = i; queue[tail++] = next;
      }
    }
    for (const a of edge) {
      const from = vec(center.x + a.ox, center.y + a.oy), end = vec(center.x + a.dx, center.y + a.dy);
      if (!insideBounds(from, bodyR, bounds) || !insideBounds(end, bodyR, bounds)
        || !insideBounds(from, bodyR, backing) || !insideBounds(end, bodyR, backing)
        || hooks.inReserved(strict, end, 20)) { valid = false; refused('apron'); break; }
      const left = Math.floor((Math.min(from.x, end.x) - bodyR) / cell), right = Math.floor((Math.max(from.x, end.x) + bodyR) / cell);
      const top = Math.floor((Math.min(from.y, end.y) - bodyR) / cell), bottom = Math.floor((Math.max(from.y, end.y) + bodyR) / cell);
      for (let y = top; y <= bottom && valid; y++) for (let x = left; x <= right; x++) {
        const dx = Math.max(x * cell - Math.max(from.x, end.x), 0, Math.min(from.x, end.x) - (x + 1) * cell);
        const dy = Math.max(y * cell - Math.max(from.y, end.y), 0, Math.min(from.y, end.y) - (y + 1) * cell);
        if (Math.hypot(dx, dy) >= bodyR) continue;
        const i = y * cols + x;
        if (x < 0 || y < 0 || x >= cols || y >= rows || !allowed[i]) { valid = false; refused('apron'); break; }
        if (owned[i]) patch.add(i);
        if (!inFootprint(i)) route.add(i);
      }
      let i = index(end), steps = 0;
      if (i < 0 || previous[i] < 0) { valid = false; refused('route'); break; }
      while (valid) {
        if (steps++ > total || inFootprint(i)) { valid = false; refused('route'); break; }
        route.add(i); if (owned[i]) patch.add(i);
        if (i === start) break;
        i = previous[i];
      }
      if (!valid) break;
    }
    if (!valid) continue;
    if (++trials > 64) { if (facts) facts.terminal = 'trial-budget'; return null; }
    const trial = GridWalkField.unpack(view.packed);
    trial.mask.set(view.mask);
    for (const i of patch) {
      const p = point(i);
      trial.fillRegion(p.x - cell / 2, p.y - cell / 2, p.x + cell / 2 - .01, p.y + cell / 2 - .01, 'ground');
    }
    const trialCtx: GenCtx = { ...ctx, walk: trial };
    const admitted = hooks.admit(trialCtx, center, w, h, aprons);
    if (!admitted || admitted.x !== center.x || admitted.y !== center.y) { refused('native-fit'); continue; }
    if (!unchanged() || !owner.claim.current(view)) return null;
    if (!owner.claim.paintGround(view, [...patch], unchanged)) return null;
    if (!unchanged()) throw Error('Native recipe recovery context changed during paint');
    const paintedView = owner.claim.snapshot();
    if (!paintedView) throw Error('Native recipe recovery ownership changed after paint');
    const live = hooks.admit(ctx, center, w, h, aprons);
    if (!live || live.x !== center.x || live.y !== center.y || !unchanged() || !owner.claim.current(paintedView))
      throw Error('Native recipe recovery failed its live admission');
    // The emitter gets detached output arrays. Its selected callbacks may fail,
    // but cannot use the expected append to hide a foreign mutation of ctx.
    const beforeWay = paintedView;
    const additions: GenCtx = { ...ctx, doodads: [], reserved: [] };
    const way = hooks.way(additions, [...route].map(point));
    if (!unchanged() || !owner.claim.current(beforeWay))
      throw Error('Native recipe recovery context changed during way emission');
    ctx.doodads.push(...additions.doodads);
    ctx.reserved.push(...way);
    for (const reservation of way) {
      const seal = plainSeal([reservation]);
      if (!seal) throw Error('Native recipe recovery produced an invalid reservation');
      owner.ownReservations.set(reservation, seal);
    }
    if (facts) { facts.terminal = 'applied'; facts.routeCells = route.size; facts.paintedCells = patch.size; }
    return center;
  }
  return null;
}
