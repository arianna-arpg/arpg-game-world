import type { ZoneDef } from '../data/zones';
import { address, localOffset, moveAddress, type MassAddress, type MassPoint } from './address';
import type { MassPlaceRef } from './regions';
import { canonical, freezeData, massDigest } from './random';

export interface MassContextSource { registry: string; id: string; version: number }
export interface MassWorldContextSpec {
  id: string; owner: MassPlaceRef; source: MassContextSource;
  /** Native layout's (0,0), explicitly distinct from its owning place center. */
  origin: MassAddress; addressSpan: number; zone: ZoneDef;
  requirements: readonly string[];
  anchors?: readonly { id: string; position: MassPoint; tier: number }[];
}
export interface MassWorldContext extends Readonly<MassWorldContextSpec> {
  definitionHash: string;
}

/** A saved native local context, never an entry in World.zoneMap. It preserves
 * every native field instead of manufacturing a weakened look-alike objective.
 * A descriptor is a plan; only real capability owners can admit it. */
export function createMassWorldContext(spec: MassWorldContextSpec): Readonly<MassWorldContext> {
  const zone = spec.zone;
  if (!spec.id || !spec.owner.run || !spec.owner.id || !spec.source.registry || !spec.source.id
    || !Number.isSafeInteger(spec.source.version) || spec.source.version < 1
    || !Number.isSafeInteger(spec.addressSpan) || spec.addressSpan < 1
    || spec.owner.center.dimension !== spec.origin.dimension
    || !zone?.id || !zone.objective || !Number.isFinite(zone.level) || zone.level < 1
    || !Number.isFinite(zone.size.w) || !Number.isFinite(zone.size.h) || zone.size.w <= 0 || zone.size.h <= 0
    || spec.requirements.some(r => typeof r !== 'string' || !r)) throw Error('Invalid native world context');
  for (const p of [spec.owner.center, spec.origin])
    if (canonical(address(p.dimension, p.cx, p.cy, p.x, p.y, spec.addressSpan)) !== canonical(p)) throw Error('Noncanonical context address');
  const anchors = spec.anchors ?? [];
  if (new Set(anchors.map(a => a.id)).size !== anchors.length || anchors.length > 256
    || anchors.some(a => !a.id || !Number.isFinite(a.position.x) || !Number.isFinite(a.position.y)
      || a.position.x < 0 || a.position.y < 0 || a.position.x > zone.size.w || a.position.y > zone.size.h
      || !Number.isSafeInteger(a.tier) || a.tier < 0)) throw Error('Invalid native context anchors');
  const requirements = new Set(spec.requirements);
  requirements.add('state');
  if (zone.objective.kind !== 'none' && zone.objective.kind !== 'safe') requirements.add('objective:' + zone.objective.kind);
  if (zone.packs?.table.length) requirements.add('population');
  if (zone.puzzles?.length) requirements.add('puzzles');
  if (zone.scenery?.length) requirements.add('scenery-actors');
  if (zone.tiers) requirements.add('tiers');
  const snapshot = JSON.parse(canonical({ ...spec, requirements: [...requirements].sort() })) as MassWorldContextSpec;
  return freezeData({ ...snapshot, definitionHash: massDigest(snapshot) });
}
export function massContextPosition(context: MassWorldContext, local: MassPoint): MassAddress {
  return moveAddress(context.origin, local, context.addressSpan);
}
export function massContextLocal(context: MassWorldContext, at: MassAddress): MassPoint {
  return localOffset(at, context.origin, context.addressSpan);
}

export interface MassContextCapability {
  id: string;
  /** Names of implemented native controller responsibilities, not UI flags. */
  provides: readonly string[];
  /** A real owner must check native variants/metadata it cannot execute. */
  refuses(context: Readonly<MassWorldContext>): string | null;
}
export interface MassContextAdmission {
  admissible: boolean; missing: readonly string[]; refusals: readonly string[]; owners: readonly string[];
}
/** Pure preflight. `admissible` is deliberately not a playable/completed receipt:
 * mounting and native lifecycle tests are still required by each caller. */
export function admitMassWorldContext(context: MassWorldContext, capabilities: readonly MassContextCapability[]): Readonly<MassContextAdmission> {
  if (new Set(capabilities.map(c => c.id)).size !== capabilities.length || capabilities.some(c => !c.id || c.provides.some(p => !p)))
    throw Error('Invalid context capability owners');
  const missing: string[] = [], refusals: string[] = [], owners = new Set<string>();
  const decisions = new Map<string, string | null>();
  for (const requirement of context.requirements) {
    let supplied = false;
    for (const owner of capabilities.filter(c => c.provides.includes(requirement))) {
      if (!decisions.has(owner.id)) decisions.set(owner.id, owner.refuses(context));
      const refusal = decisions.get(owner.id);
      if (refusal !== null) continue;
      supplied = true; owners.add(owner.id);
    }
    if (!supplied) {
      missing.push(requirement);
      for (const owner of capabilities.filter(c => c.provides.includes(requirement))) {
        const reason = decisions.get(owner.id);
        if (reason) refusals.push(`${owner.id}: ${reason}`);
      }
    }
  }
  return freezeData({ admissible: !missing.length, missing, refusals: [...new Set(refusals)].sort(), owners: [...owners].sort() });
}

export type MassActivityPhase = 'waiting' | 'active' | 'dormant' | 'complete' | 'failed';
export interface MassActivityReceipt {
  run: string; context: string; id: string; source: string; subject: string; kind: string;
}
export interface MassActivitySave {
  schema: 1; run: string; context: string; definitionHash: string;
  revision: number; phase: MassActivityPhase; receipts: MassActivityReceipt[];
}
const NEXT: Record<MassActivityPhase, readonly MassActivityPhase[]> = {
  waiting: ['active'], active: ['dormant', 'complete', 'failed'], dormant: ['active'], complete: [], failed: [],
};
/** Sparse ownership receipts. Native controllers supply the facts; this store
 * never infers objective success from an empty scene or merely visited place. */
export class MassActivityState {
  private state: MassActivitySave;
  constructor(readonly context: Readonly<MassWorldContext>, saved?: MassActivitySave) {
    this.state = { schema: 1, run: context.owner.run, context: context.id, definitionHash: context.definitionHash,
      revision: 0, phase: 'waiting', receipts: [] };
    if (saved) {
      if (saved.schema !== 1 || saved.run !== context.owner.run || saved.context !== context.id
        || saved.definitionHash !== context.definitionHash || !Object.hasOwn(NEXT, saved.phase)
        || !Number.isSafeInteger(saved.revision) || saved.revision < 0 || !Array.isArray(saved.receipts)
        || saved.receipts.length > 4096 || new Set(saved.receipts.map(r => r.id)).size !== saved.receipts.length
        || saved.receipts.some(r => !validReceipt(r) || r.run !== context.owner.run || r.context !== context.id))
        throw Error('Invalid native activity checkpoint');
      this.state = JSON.parse(canonical(saved)) as MassActivitySave;
    }
  }
  get phase(): MassActivityPhase { return this.state.phase; }
  get revision(): number { return this.state.revision; }
  transition(next: MassActivityPhase, expectedRevision: number): boolean {
    if (expectedRevision !== this.state.revision || !NEXT[this.state.phase].includes(next)) return false;
    this.state.phase = next; this.state.revision++; return true;
  }
  record(receipt: MassActivityReceipt, expectedRevision: number): boolean {
    if (!validReceipt(receipt)) throw Error('Invalid native activity receipt');
    if (receipt.run !== this.context.owner.run || receipt.context !== this.context.id
      || this.state.phase !== 'active' || this.state.revision !== expectedRevision
      || this.state.receipts.some(r => r.id === receipt.id) || this.state.receipts.length >= 4096) return false;
    this.state.receipts.push({ ...receipt }); this.state.revision++; return true;
  }
  has(id: string): boolean { return this.state.receipts.some(r => r.id === id); }
  snapshot(): MassActivitySave { return JSON.parse(canonical(this.state)) as MassActivitySave; }
}
function validReceipt(r: MassActivityReceipt): boolean {
  return !!r && [r.run, r.context, r.id, r.source, r.subject, r.kind].every(v => typeof v === 'string' && !!v && v.length <= 4096);
}
