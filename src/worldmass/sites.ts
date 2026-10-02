import type { World } from '../engine/world';
import { structureDoodads, hasDoodadRule, type Doodad } from '../engine/levelgen';
import { STRUCTURES } from '../data/structures';
import { MONSTERS } from '../data/monsters';
import { address, type MassAddress } from './address';
import type { MassPlace } from './contracts';
import { canonical, massHash } from './random';
import { validateMassAltar, type MassAltarSpec } from './fields';

import { validateMassClearance, type MassClearanceSpec } from './clearance';

export interface MassSiteSpec {
  name: string; source: string;
  /** Optional once-per-place reward for its original native garrison. */
  completion?: MassClearanceSpec;
  /** Snapshot native scenery at the local origin; no hidden registry re-read on resume. */
  doodads: Doodad[];
  /** Native placed bodies. Explicit garrison roles join admission and clearance;
   * omitted roles preserve older scenery-only completion semantics. */
  fixtures: { monster: string; x: number; y: number; garrison?: boolean }[];
  cache?: { x: number; y: number; holdSeconds: number };
  /** Finite journey fields use native altar rules, snapshotted per expedition. */
  altars?: MassAltarSpec[];
}
export interface MassSiteDiscovery { id: string; content: string; center: MassAddress }
export type PieceState = Pick<Doodad, 'pos' | 'kind' | 'radius' | 'rot' | 'adorn' | 'gone' | 'felled' | 'hitbox'>;
export interface MassSiteSave {
  clock: number;
  found: MassSiteDiscovery[];
  changes: [string, PieceState | null][];
}
interface ResidentSite { place: MassPlace; pieces: { id: string; base: string; live: Doodad }[] }

/** Adapter for the native legacy structure family. Plan floors, doors, NPC
 * services and scripted effects require their own lifecycle adapters. */
export function nativeMassSite(id: string, name: string, cache?: MassSiteSpec['cache']): MassSiteSpec {
  const def = STRUCTURES[id];
  if (!def || def.plan || def.generator || def.storeys || def.npcs?.length || def.folk)
    throw new Error('Worldmass site needs an adapted native structure: ' + id);
  const doodads = structureDoodads(def, { x: 0, y: 0 });
  // Town station bindings belong to a service adapter, not a repeated prop.
  for (const d of doodads) delete d.anchor;
  return { name, source: 'structures/' + id, doodads,
    fixtures: (def.breakables ?? []).map(b => ({ monster: b.id, x: b.x, y: b.y })),
    ...(cache ? { cache } : {}) };
}
export function validateMassSite(site: MassSiteSpec, radius: number): void {
  if (!site.name || !site.source || !Array.isArray(site.doodads) || !Array.isArray(site.fixtures)
    || site.doodads.length > 256 || site.fixtures.length > 32) throw new Error('Invalid worldmass site');
  if(site.completion!==undefined)validateMassClearance(site.completion);
  const within = (x: number, y: number, r = 0) =>
    [x, y, r].every(Number.isFinite) && r >= 0 && Math.hypot(x, y) + r < radius;
  for (const d of site.doodads) {
    if (!hasDoodadRule(d.kind) || !within(d.pos.x, d.pos.y, d.radius) || d.radius <= 0
      || d.contactSource || d.effect || d.door || d.well || d.hitbox || d.anchor)
      throw new Error('Unsupported worldmass scenery or footprint');
  }
  if (site.altars && (!Array.isArray(site.altars) || site.altars.length > 4
    || new Set(site.altars.map(a=>a.id)).size !== site.altars.length)) throw new Error('Invalid worldmass site fields');
  for (const altar of site.altars ?? []) validateMassAltar(altar, radius);
  for (const f of site.fixtures) if (!MONSTERS[f.monster] || !within(f.x, f.y, 32)
    || f.garrison!==undefined && typeof f.garrison!=='boolean')
    throw new Error('Invalid worldmass site fixture');
  if (site.cache && (!within(site.cache.x, site.cache.y, 32)
    || !Number.isFinite(site.cache.holdSeconds) || site.cache.holdSeconds <= 0))
    throw new Error('Invalid worldmass site cache');
}
/** Namespaced quarter turns vary approaches without changing a site's identity. */
export function siteOffset(place: MassPlace, x: number, y: number): { x: number; y: number; angle: number } {
  const turns = massHash(place.id + '/orientation') % 4;
  for (let i = 0; i < turns; i++) [x, y] = [-y, x];
  return { x, y, angle: turns * Math.PI / 2 };
}
export function pieceState(d: Doodad): PieceState {
  // Deliberate static-scenery contract, not a serializer for actor-owned hazards.
  // The engine owns felling/regrowth; its clocks are translated on checkpoint load.
  return JSON.parse(JSON.stringify({ pos: d.pos, kind: d.kind, radius: d.radius,
    rot: d.rot, adorn: d.adorn, gone: d.gone, felled: d.felled, hitbox: d.hitbox })) as PieceState;
}

/** Bounded scenery residency with sparse mutations and independent discovery.
 * Owned objects retain identity while resident; unrelated effects are untouched. */
export class MassSites {
  private resident = new Map<string, ResidentSite>();
  private changes = new Map<string, PieceState | null>();
  private found = new Map<string, MassSiteDiscovery>();
  constructor(private readonly specFor: (content: string) => MassSiteSpec | undefined,
    private readonly toLocal: (center: MassAddress) => { x: number; y: number },
    private readonly span: number) {}

  restore(save: MassSiteSave | undefined, now: number): void {
    if (!save) return;
    if (!Number.isFinite(save.clock) || !Array.isArray(save.found) || !Array.isArray(save.changes))
      throw new Error('Invalid worldmass site checkpoint');
    const found = new Map<string, MassSiteDiscovery>(), changes = new Map<string, PieceState | null>();
    for (const row of save.found) {
      if (!row?.id || !this.specFor(row.content) || found.has(row.id)) throw new Error('Invalid site discovery');
      found.set(row.id, { ...row, center: address(row.center.dimension, row.center.cx, row.center.cy,
        row.center.x, row.center.y, this.span) });
    }
    for (const [id, state] of save.changes) {
      if (typeof id !== 'string' || !id || changes.has(id)) throw new Error('Invalid site mutation identity');
      if (state && (!hasDoodadRule(state.kind) || !Number.isFinite(state.pos?.x) || !Number.isFinite(state.pos?.y)
        || !Number.isFinite(state.radius) || state.radius <= 0
        || (state.felled && ![state.felled.at, state.felled.wake].every(Number.isFinite))))
        throw new Error('Invalid site mutation');
      const copy = state ? pieceState(state) : null;
      if (copy?.felled) { copy.felled.at += now - save.clock; copy.felled.wake += now - save.clock; }
      changes.set(id, copy);
    }
    this.found = found; this.changes = changes;
  }
  private remember(site: ResidentSite, present: Set<Doodad>): void {
    for (const piece of site.pieces) {
      const state = present.has(piece.live) && !piece.live.gone ? pieceState(piece.live) : null;
      if (state && canonical(state) === piece.base) this.changes.delete(piece.id);
      else this.changes.set(piece.id, state);
    }
  }
  sync(world: World, wanted: readonly MassPlace[]): void {
    const wantedById = new Map(wanted.filter(p => this.specFor(p.content)).map(p => [p.id, p]));
    const present = new Set(world.doodads), remove = new Set<Doodad>();
    for (const [id, site] of this.resident) {
      if (wantedById.has(id)) continue;
      // Let native regrowth finish on its own clock. Never detach an ongoing
      // actor-owned effect just because its scenery page leaves residency.
      const center = this.toLocal(site.place.center), reach = site.place.radius + 128;
      if (world.actors.some(a => !a.dead && Math.hypot(a.pos.x - center.x, a.pos.y - center.y) < reach)
        || world.projectiles.some(p => Math.hypot(p.pos.x - center.x, p.pos.y - center.y) < reach)) continue;
      if (site.pieces.some(p => present.has(p.live) && (p.live.felled || p.live.contactSource || p.live.evap))) continue;
      this.remember(site, present);
      for (const p of site.pieces) remove.add(p.live);
      this.resident.delete(id);
    }
    if (remove.size) world.doodads = world.doodads.filter(d => !remove.has(d));
    let changed = remove.size > 0;
    for (const place of wantedById.values()) {
      if (this.resident.has(place.id)) continue;
      const spec = this.specFor(place.content)!, center = this.toLocal(place.center);
      const pieces: ResidentSite['pieces'] = [];
      spec.doodads.forEach((template, index) => {
        const id = canonical([place.id, 'scenery', index]), offset = siteOffset(place, template.pos.x, template.pos.y);
        const live: Doodad = { ...JSON.parse(canonical(template)), pos: { x: center.x + offset.x, y: center.y + offset.y },
          rot: (template.rot ?? 0) + offset.angle };
        const base = canonical(pieceState(live));
        const saved = this.changes.get(id);
        if (saved === null) return;
        if (saved) Object.assign(live, JSON.parse(canonical(saved)));
        pieces.push({ id, live, base }); world.doodads.push(live); changed = true;
        if (live.felled) world.restoreDoodadFelling(live, live.felled);
      });
      this.resident.set(place.id, { place, pieces });
    }
    if (changed) world.markDoodadsChanged();
  }
  discover(hero: { x: number; y: number }): void {
    for (const { place } of this.resident.values()) {
      const q = this.toLocal(place.center);
      if (Math.hypot(q.x - hero.x, q.y - hero.y) <= place.radius && !this.found.has(place.id))
        this.found.set(place.id, { id: place.id, content: place.content, center: { ...place.center } });
    }
  }
  snapshot(world: World): MassSiteSave {
    const present = new Set(world.doodads);
    for (const site of this.resident.values()) this.remember(site, present);
    return JSON.parse(canonical({ clock: world.time, found: [...this.found.values()].sort((a, b) => a.id.localeCompare(b.id)),
      changes: [...this.changes].sort(([a], [b]) => a.localeCompare(b)) })) as MassSiteSave;
  }
  get discovered(): readonly MassSiteDiscovery[] { return [...this.found.values()]; }
  get residentCount(): number { return this.resident.size; }
}
