import { Rng } from '../core/rng';
import type { Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import { sidezoneOf } from '../data/sidezones';
import { CAVE_FACE_IDS, TILESETS } from '../data/tilesets';
import { allFurnishSpecs } from '../packages/registry';
import { siteZoneExits } from '../engine/exitSiting';
import { PORTAL_EDGE_INSET } from '../engine/worldgen';
import { generateLayout, blocksMovement, hitSurfaceOf, doodadRuleOf, type GeneratedLayout } from '../engine/levelgen';
import { shapeContains } from '../engine/shapes';
import { GridWalkField, type PackedWalk } from '../world/gridWalk';
import { regionKind } from '../world/regions';
import { address, localOffset, moveAddress, type MassAddress } from './address';
import { nativeLayoutRequirements, type NativeFeatureEntrance } from './nativeFeatures';
import { massSideareaId, type MassSideareaRoot } from './sideareas';
import { canonical, freezeData, massDigest } from './random';
import { captureNativeGeneration, nativeGenerationRequirements, type NativeGenerationSidechannels } from './nativeGeneration';

/** A source compiler, not a second World and not a playable scene installer.
 * Native scene consumers must acquire explicit local ownership before this
 * output can replace the current loadZone crossing. No terrain is repainted. */
export interface NativeCaveStratumRequest {
  run: string; root: MassSideareaRoot; addressSpan: number;
  playerLevel: number; activePackages: readonly string[]; bodyRadius: number;
}
export interface NativeCaveStratumDescriptor {
  schema: 1; compiler: 'native-cave-stratum-v1'; run: string; root: MassSideareaRoot;
  addressSpan: number; playerLevel: number; activePackages: string[]; bodyRadius: number;
  /** Native caveAirFor presently identifies untouched packs by reference.
   * Keep that birth fact explicit through JSON; a blended pack has no witness. */
  source: { tileset: string | null; definition: unknown; packIdentityFace: string | null };
  /** Native mint and package furnish output, including every objective/theme row. */
  zone: ZoneDef;
  sidechannels: Readonly<NativeGenerationSidechannels>;
  geometry: { grid?: PackedWalk; layout: Omit<GeneratedLayout, 'walk'>; exit: Vec2; entry: Vec2 };
  entrances: NativeFeatureEntrance[];
  /** The actual entry-to-return landing was swept against native floor and shapes. */
  corridor: { clear: boolean; samples: number; length: number };
  requirements: string[]; unsupported: string[]; hash: string;
}
/** Exact physical address plus the owner whose enclosed floor occupies it.
 * The surface and cave doorway share x/y; owner changes, coordinates do not. */
export interface CaveStratumAddress { owner: string; at: MassAddress }
export interface NativeCaveStratumBlueprint {
  descriptor: Readonly<NativeCaveStratumDescriptor>;
  layout: GeneratedLayout; grid?: GridWalkField;
  addressOf(local: Vec2): CaveStratumAddress;
  localOf(at: CaveStratumAddress): Vec2;
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const LIMITS = Object.freeze({ cells: 262144, doodads: 20000, side: 16000 });
/** These are ownership dependencies, not capability claims by this compiler. */
export const NATIVE_CAVE_SCENE_DEPENDENCIES = Object.freeze([
  'scene:physical-crossing', 'scene:contextual-walk', 'scene:contextual-visibility',
  'scene:actor-ownership', 'scene:loot-ownership', 'scene:native-memory',
  'scene:native-package-entry', 'scene:native-source-context',
  'scene:cave-fauna-provenance',
]);

function validateRequest(r: NativeCaveStratumRequest): void {
  const root = r.root;
  if (!r.run || !root || !root.owner || root.id !== massSideareaId(r.run, root.owner, root.kind, root.seed)
    || !Number.isSafeInteger(root.seed) || !root.parent?.id || !root.parent.objective
    || !Number.isSafeInteger(r.playerLevel) || r.playerLevel < 1
    || !Number.isFinite(r.bodyRadius) || r.bodyRadius <= 0 || r.bodyRadius > 60
    || !Array.isArray(r.activePackages) || r.activePackages.some(id => typeof id !== 'string' || !id)
    || new Set(r.activePackages).size !== r.activePackages.length
    || canonical(address(root.at.dimension, root.at.cx, root.at.cy, root.at.x, root.at.y, r.addressSpan)) !== canonical(root.at))
    throw Error('Invalid native cave stratum ownership');
}
function nativeExit(zone: ZoneDef, parent: string): Vec2 {
  // This first seam handles the actual classic one-return rectangular cave.
  // Other native exits are refused intact; never flatten or trim a multi-mouth cave.
  if (zone.shape !== 'rect' || zone.field || zone.boundless || zone.exits.length !== 1 || zone.exits[0].to !== parent)
    throw Error('Native cave stratum needs the contextual multi-exit/bounds adapter');
  siteZoneExits(zone);
  const e = zone.exits[0], { w, h } = zone.size, inset = PORTAL_EDGE_INSET;
  const clamp = (n: number, max: number) => Math.max(inset, Math.min(max - inset, n));
  if (e.posFrac) return { x: clamp(w * e.posFrac.fx, w), y: clamp(h * e.posFrac.fy, h) };
  const t = e.at ?? .5;
  return e.side === 'n' ? { x: clamp(w * t, w), y: inset }
    : e.side === 's' ? { x: clamp(w * t, w), y: h - inset }
      : e.side === 'w' ? { x: inset, y: clamp(h * t, h) } : { x: w - inset, y: clamp(h * t, h) };
}
function entrancesOf(layout: GeneratedLayout, zone: ZoneDef): NativeFeatureEntrance[] {
  let classic = 0;
  return layout.doodads.flatMap((d, i) => {
    if (!sidezoneOf(d.kind)) return [];
    // World.loadZone's FNV-1a position seed. Keep its pre-clamp position input.
    const text = `${zone.id}:${d.kind}:${Math.round(d.pos.x)},${Math.round(d.pos.y)}`;
    let h = 0x811c9dc5;
    for (let j = 0; j < text.length; j++) { h ^= text.charCodeAt(j); h = Math.imul(h, 0x01000193); }
    const seed = d.kind === 'cave_entrance' ? layout.caveSeeds[classic++] : h >>> 0;
    if (seed === undefined) throw Error('Native cave mouth lost its paired seed');
    return [{ id: 'native-mouth/' + i, doodadIndex: i, kind: d.kind, seed,
      pos: { ...d.pos }, tier: d.tier ?? 0, rockBacked: false }];
  });
}
function corridorOf(layout: GeneratedLayout, grid: GridWalkField | undefined, exit: Vec2, entry: Vec2, radius: number) {
  const length = Math.hypot(entry.x - exit.x, entry.y - exit.y), steps = Math.max(1, Math.ceil(length / Math.min(6, radius / 2)));
  const solid = layout.doodads.filter(d => !d.gone && (d.tier ?? 0) === 0 && blocksMovement(d));
  const clear = !!grid && Array.from({ length: steps + 1 }, (_, i) => i / steps).every(t => {
    const p = { x: exit.x + (entry.x - exit.x) * t, y: exit.y + (entry.y - exit.y) * t };
    return [[0,0], [radius,0], [-radius,0], [0,radius], [0,-radius]].every(([dx,dy]) => grid.isWalkable(p.x + dx, p.y + dy))
      && !solid.some(d => shapeContains(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y, p.x, p.y, radius));
  });
  return { clear, samples: steps + 1, length };
}
/** Native registry mint -> native package furnishings -> native layout. The
 * caller must have bootstrapped the same registries as ordinary game loading. */
export function resolveNativeCaveStratum(request: NativeCaveStratumRequest): Readonly<NativeCaveStratumDescriptor> {
  validateRequest(request);
  const r = clone(request), root = r.root, kind = sidezoneOf(root.kind);
  if (!kind || root.kind !== 'cave_entrance') throw Error('Native cave stratum currently requires the classic rock mouth');
  const active = new Set(r.activePackages);
  const zone = kind.mint({ parent: clone(root.parent), seed: root.seed, id: root.id,
    pos: { x: root.at.x, y: root.at.y }, playerLevel: r.playerLevel, pkgActive: id => active.has(id) });
  for (const row of allFurnishSpecs()) if (row.sidezone === root.kind && active.has(row.packageId)
    && !zone.fixtures?.some(f => f.structure === row.fixture.structure && f.x === row.fixture.x && f.y === row.fixture.y))
    zone.fixtures = [...(zone.fixtures ?? []), clone(row.fixture)];
  if (kind.levelWith === 'character') zone.level = r.playerLevel;
  if (![zone.size.w, zone.size.h].every(n => Number.isFinite(n) && n >= 200 && n <= LIMITS.side))
    throw Error('Native cave stratum exceeds its geometry budget');
  const exit = nativeExit(zone, root.parent.id), dx = zone.size.w / 2 - exit.x, dy = zone.size.h / 2 - exit.y, length = Math.hypot(dx,dy);
  if (length <= 120) throw Error('Native cave stratum has no interior arrival corridor');
  const entry = { x: exit.x + dx / length * 120, y: exit.y + dy / length * 120 };
  const arena = { ...zone.size, shape: zone.shape!, ...(zone.annexes?.length ? { pieces: zone.annexes.map(p => ({ ...p, active: false })) } : {}) };
  const { value: layout, sidechannels } = captureNativeGeneration(zone,
    () => generateLayout(zone, arena, new Rng(zone.seed ?? root.seed), entry, [exit]));
  if (layout.doodads.length > LIMITS.doodads || layout.walk && !(layout.walk instanceof GridWalkField))
    throw Error('Native cave stratum needs a bounded serializable native walk field');
  const grid = layout.walk instanceof GridWalkField ? layout.walk : undefined;
  if (grid && grid.cols * grid.rows > LIMITS.cells) throw Error('Native cave stratum exceeds its cell budget');
  const entrances = entrancesOf(layout, zone), corridor = corridorOf(layout, grid, exit, entry, r.bodyRadius);
  const requirements = new Set([...nativeLayoutRequirements(layout, zone, entrances, true), ...nativeGenerationRequirements(sidechannels), ...NATIVE_CAVE_SCENE_DEPENDENCIES,
    'scene:objective:' + zone.objective.kind, 'scene:native-population']);
  if (zone.annexes?.length) requirements.add('annexes');
  if (zone.breach) requirements.add('scene:breach');
  if (kind.ledgerOnEnter) requirements.add('scene:discovery-ledger');
  if (kind.when || kind.indoorsOnly || kind.sealedBy || kind.traversal) requirements.add('scene:native-mouth-gates');
  if (kind.levelWith) requirements.add('scene:entry-level-policy');
  if (layout.pois.length) requirements.add('scene:native-poi');
  if (layout.doodads.some(d => doodadRuleOf(d.kind).effect)) requirements.add('doodad-effects');
  const { walk: _walk, ...data } = layout;
  const body = { schema: 1 as const, compiler: 'native-cave-stratum-v1' as const, run: r.run, root,
    addressSpan: r.addressSpan, playerLevel: r.playerLevel, activePackages: [...active].sort(), bodyRadius: r.bodyRadius,
    source: { tileset: zone.tileset ?? null, definition: clone(zone.tileset ? TILESETS[zone.tileset] ?? null : null),
      packIdentityFace: CAVE_FACE_IDS.find(id => TILESETS[id].packs === zone.packs) ?? null },
    zone: clone(zone), sidechannels, geometry: { ...(grid ? { grid: grid.pack() } : {}), layout: clone(data), exit, entry }, entrances, corridor,
    requirements: [...requirements].sort(), unsupported: [...(!grid ? ['native-convex-cave-walk-unbound'] : []),
      ...(!corridor.clear ? ['native-arrival-corridor-not-body-clear'] : [])] };
  return freezeData({ ...body, hash: massDigest(body) });
}
/** Rehydrate frozen native geometry without re-running mint, furnishings or
 * generation against changed registry definitions. No World state is touched. */
export function compileNativeCaveStratum(raw: Readonly<NativeCaveStratumDescriptor>): NativeCaveStratumBlueprint {
  const d = clone(raw), { hash, ...body } = d;
  if (d.schema !== 1 || d.compiler !== 'native-cave-stratum-v1' || hash !== massDigest(body))
    throw Error('Native cave stratum checkpoint identity mismatch');
  validateRequest(d);
  const p = d.geometry.grid;
  if (d.zone.id !== d.root.id || !Array.isArray(d.requirements) || !Array.isArray(d.unsupported)
    || !d.source || d.source.tileset !== (d.zone.tileset ?? null)
    || NATIVE_CAVE_SCENE_DEPENDENCIES.some(k => !d.requirements.includes(k))
    || d.geometry.layout.doodads.length > LIMITS.doodads
    || p && (![p.cols,p.rows,p.cell].every(n => Number.isSafeInteger(n) && n > 0)
      || p.cols * p.rows > LIMITS.cells || atob(p.kbits).length !== p.cols * p.rows || p.kinds.some(k => !regionKind(k))))
    throw Error('Invalid native cave stratum checkpoint');
  if (nativeGenerationRequirements(d.sidechannels).some(k => !d.requirements.includes(k)))
    throw Error('Native cave stratum lost a side-channel consumer');
  const grid = p ? GridWalkField.unpack(p) : undefined;
  const layout: GeneratedLayout = { ...clone(d.geometry.layout), ...(grid ? { walk: grid } : {}) };
  if (canonical(corridorOf(layout, grid, d.geometry.exit, d.geometry.entry, d.bodyRadius)) !== canonical(d.corridor))
    throw Error('Native cave stratum corridor checkpoint mismatch');
  const descriptor = freezeData(d);
  return { descriptor, layout, grid,
    addressOf(local) { return { owner: d.root.id, at: moveAddress(d.root.at,
      { x: local.x - d.geometry.exit.x, y: local.y - d.geometry.exit.y }, d.addressSpan) }; },
    localOf(position) {
      if (position.owner !== d.root.id) throw Error('Foreign cave stratum owner');
      const delta = localOffset(position.at, d.root.at, d.addressSpan);
      return { x: d.geometry.exit.x + delta.x, y: d.geometry.exit.y + delta.y };
    },
  };
}
/** Missing consumers only. Passing this comparison is NOT scene admission;
 * World currently has no independent native cave-scene binding. */
export function missingNativeCaveConsumers(d: Readonly<NativeCaveStratumDescriptor>, consumers: ReadonlySet<string>): string[] {
  return d.requirements.filter(r => !consumers.has(r));
}
