import type { Vec2 } from '../core/math';
import type { ZoneDef } from '../data/zones';
import { STRUCTURES, type StructureDef } from '../data/structures';
import { GridWalkField } from '../world/gridWalk';
import type { Doodad, GenCtx, PlacedStructure } from './levelgen';
import type { RecipeGroundFacts } from './nativeRecipeGround';

export class RequiredStructureSeatError extends Error {}
interface Obligation { defId: string; mouth: string; placed?: PlacedStructure; mouths: Doodad[] }
const obligations = new WeakMap<GenCtx, Obligation[]>();

/** A selected gameplay feature is a promise. A [1,1] count alone is NOT:
 * optional structure rolls synthesize that count after their chance succeeds. */
export function requireStructure(ctx: GenCtx, def: StructureDef): Obligation | undefined {
  if (!def.requiredMouth) return undefined;
  const row: Obligation = { defId: def.id, mouth: def.requiredMouth, mouths: [] };
  let rows = obligations.get(ctx);
  if (!rows) obligations.set(ctx, rows = []);
  rows.push(row);
  return row;
}
export function completeRequiredStructure(ctx: GenCtx, row: Obligation | undefined,
  placed: PlacedStructure): void {
  if (!row) return;
  row.placed = placed;
  const r = placed.rect;
  row.mouths = ctx.doodads.filter(d => d.kind === row.mouth && (d.tier ?? 0) === 0
    && d.pos.x > r.x && d.pos.x < r.x + r.w && d.pos.y > r.y && d.pos.y < r.y + r.h);
  if (row.mouths.length !== 1)
    throw new RequiredStructureSeatError('required structure did not raise its one mouth: ' + row.defId);
}
export function verifyRequiredStructures(ctx: GenCtx, def: ZoneDef): void {
  const rows = obligations.get(ctx) ?? [];
  // A recipe that skipped an authored required row cannot silently satisfy it.
  // A lower bound adds no roll and does not reinterpret an optional roll.
  const minima = new Map<string, number>();
  if (!ctx.lite) for (const spec of def.layout) {
    if (spec.kind !== 'structure' || !spec.structure || !STRUCTURES[spec.structure]?.requiredMouth) continue;
    minima.set(spec.structure, (minima.get(spec.structure) ?? 0) + spec.count[0]);
  }
  for (const [id, minimum] of minima) {
    if (rows.filter(r => r.defId === id).length < minimum)
      throw new RequiredStructureSeatError('required authored structure row was not attempted: ' + id);
  }
  for (const row of rows) {
    if (!row.placed || row.placed.defId !== row.defId || !ctx.structures?.includes(row.placed))
      throw new RequiredStructureSeatError('required structure did not survive generation: ' + row.defId);
    // noDeeper deliberately strips sidezone entrances at the native chokepoint.
    const r = row.placed.rect;
    if (!def.noDeeper && row.mouths.some(d => !ctx.doodads.includes(d) || d.kind !== row.mouth
      || (d.tier ?? 0) !== 0 || d.pos.x <= r.x || d.pos.x >= r.x + r.w || d.pos.y <= r.y || d.pos.y >= r.y + r.h))
      throw new RequiredStructureSeatError('required structure mouth did not survive generation: ' + row.defId);
  }
}
export function closeRequiredStructures(ctx: GenCtx): void { obligations.delete(ctx); rollScopes.delete(ctx); }

/** Minimal F1/F2: source rows, actual attempts, resolved size/aprons, original
 * cursors, exact terminals, recovery aggregates and actual returned identities.
 * No grid paint log, per-cell history, or per-origin trace. Opt-in only. */
export interface NativeStructureAttempt {
  phase: 'attempt'; zoneId: string | null; ordinal: number; structureId: string;
  source: number | null; explicit: boolean; before: number; after?: number;
  resolved?: { w: number; h: number; cell: number; aprons: unknown[] };
  finder?: { tries: number; selected: Vec2 | null; before: number; after: number };
  nativeTerminal?: string; terminal: string; context?: unknown;
  recovery?: RecipeGroundFacts; placed?: { id: string; defId: string; rect: { x: number; y: number; w: number; h: number } };
}
type ProofRow = NativeStructureAttempt | { phase: string; [key: string]: unknown };
interface ProofState { rows: ProofRow[]; attempts: number }
let proof: ProofState | undefined;
const rollScopes = new WeakMap<GenCtx, number>();
export function beginNativeRequiredStructureReceipt(): { finish(): readonly ProofRow[] } {
  const prior = proof, state: ProofState = { rows: [], attempts: 0 };
  proof = state;
  let closed = false;
  return Object.freeze({ finish(): readonly ProofRow[] {
    if (!closed) {
      if (proof !== state) throw Error('Native required-structure receipt nesting changed');
      proof = prior; closed = true;
      const freeze = (value: unknown): void => {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return;
        for (const child of Object.values(value)) freeze(child);
        Object.freeze(value);
      };
      freeze(state.rows);
    }
    return state.rows;
  } });
}
export function nativeStructureCursor(ctx: GenCtx): number | undefined {
  return proof ? ctx.rng.snapshot() : undefined;
}
export function nativeStructureGeneration(ctx: GenCtx): void {
  if (proof) proof.rows.push({ phase: 'generation', zoneId: ctx.zoneId ?? null, cursor: ctx.rng.snapshot() });
}
export function nativeStructureRoll(ctx: GenCtx, source: 'layout' | 'structures', index: number,
  structure: string | undefined, before: number | undefined, hit: boolean, n: number): number | undefined {
  const prior = rollScopes.get(ctx);
  if (proof) {
    const row = proof.rows.length;
    proof.rows.push({ phase: 'roll', source, index, structure: structure ?? null, before,
      after: ctx.rng.snapshot(), hit, n });
    rollScopes.set(ctx, row);
  }
  return prior;
}
export function endNativeStructureRoll(ctx: GenCtx, prior: number | undefined): void {
  if (prior === undefined) rollScopes.delete(ctx); else rollScopes.set(ctx, prior);
}
export function nativeStructureAttempt(ctx: GenCtx, def: StructureDef, at?: Vec2): NativeStructureAttempt | undefined {
  if (!proof) return undefined;
  const row: NativeStructureAttempt = { phase: 'attempt', zoneId: ctx.zoneId ?? null,
    ordinal: proof.attempts++, structureId: def.id, source: rollScopes.get(ctx) ?? null,
    explicit: at !== undefined, before: ctx.rng.snapshot(), terminal: 'in-flight' };
  proof.rows.push(row);
  return row;
}
export function nativeStructureContext(ctx: GenCtx): unknown {
  const point = (p: Vec2): Vec2 => ({ x: p.x, y: p.y });
  return {
    arena: { ...ctx.arena }, entry: point(ctx.entry), exits: ctx.exits.map(point),
    gridEnsured: !!ctx.gridEnsured, retainedFixtureFit: !!ctx.retainedFixtureFit,
    reserved: ctx.reserved.map(r => 'rect' in r ? { rect: { ...r.rect }, margin: r.margin ?? 0 }
      : { pos: point(r.pos), radius: r.radius }),
    doodads: ctx.doodads.map(d => ({ kind: d.kind, pos: point(d.pos), radius: d.radius,
      tier: d.tier ?? 0, door: !!d.door })),
    structures: (ctx.structures ?? []).map(s => ({ id: s.id, defId: s.defId, rect: { ...s.rect } })),
    grid: ctx.walk instanceof GridWalkField ? ctx.walk.pack() : null,
  };
}
export function nativeStructureReturned(ctx: GenCtx): void {
  if (!proof) return;
  proof.rows.push({ phase: 'returned', cursor: ctx.rng.snapshot(),
    structures: (ctx.structures ?? []).map(s => ({ id: s.id, defId: s.defId })),
    required: (obligations.get(ctx) ?? []).map(r => ({ defId: r.defId,
      placed: !!r.placed && !!ctx.structures?.includes(r.placed),
      mouths: r.mouths.filter(d => ctx.doodads.includes(d)).length })),
    graveCount: (ctx.structures ?? []).filter(s => s.defId === 'sealed_grave').length,
    cryptMouthCount: ctx.doodads.filter(d => d.kind === 'lone_crypt_door').length });
}