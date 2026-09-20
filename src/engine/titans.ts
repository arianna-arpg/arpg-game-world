import { dist, type Vec2 } from '../core/math';
import { TitanField, type TitanJourney } from '../packages/overlays/titans';
import { bumpLedger } from '../packages/ledger';
import { GridWalkField } from '../world/gridWalk';
import type { Actor } from './actor';
import { blocksMovement, hitSurfaceOf, doodadRuleOf, type Doodad } from './levelgen';
import { shapeBoundR } from './shapes';
import type { World } from './world';

export interface TitanScenePiece { key: string; kind: string; x: number; y: number; r: number; rot: number }
interface Piece { d: Doodad; born: number }

/** Keep every previously connected pair of travel anchors connected. The
 * proposed scar includes the traveller's radius: a centre-only slit is not
 * an escape route. A refused piece becomes a natural crossing. */
export function titanScarAdmitted(base: GridWalkField, scar: GridWalkField, at: Vec2,
  radius: number, anchors: readonly Vec2[]): GridWalkField | null {
  const trial = GridWalkField.unpack(scar.pack());
  trial.fillDisc(at.x, at.y, radius, 'wall');
  for (let i = 0; i < anchors.length; i++) for (let k = i + 1; k < anchors.length; k++) {
    if (base.reachable(anchors[i], anchors[k]) && !trial.reachable(anchors[i], anchors[k])) return null;
  }
  return trial;
}

/** A smooth route THROUGH a zone. Entry and exit are the actual portals,
 * and the middle bends through the country rather than hugging its edge. */
export function titanRoute(start: Vec2, end: Vec2, center: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return { x: u * u * start.x + 2 * u * t * center.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * center.y + t * t * end.y };
}
export function titanGap(t: number, length: number, gaps: readonly number[] = [], width = 0, radius = 0): boolean {
  // Leave the FULL declared width between collision rims, not centres.
  return gaps.some(g => Math.abs(t - g) * length < width / 2 + radius);
}

/** Engine adapter: terrain is borrowed from the journey and reconciled by
 * stable keys. Saves own journeys, the repeated co-op wire owns local pieces.
 * All damage uses the ordinary contact-hazard pipeline and a real source. */
export class TitanRuntime {
  private pieces = new Map<string, Piece>();
  private owned = new Set<Doodad>();
  private sources = new Map<string, Actor>();
  private heads = new Map<string, Actor>();
  private combatUntil = new Map<string, number>();
  private acc = 0;
  private ground?: GridWalkField;
  private scarGround?: GridWalkField;
  private anchors: Vec2[] = [];
  private crossings = new Set<string>();
  constructor(private world: World) {}
  field(): TitanField | undefined { return this.world.sim?.overlayFor<TitanField>('titans') ?? undefined; }
  owns(d: Doodad): boolean { return this.owned.has(d); }
  reset(): void {
    const f = this.field();
    for (const [id, a] of this.heads) {
      const j = f?.journeys.find(j => j.id === id);
      if (j && !a.dead) j.life = Math.max(0.00001, Math.min(1, a.life / a.maxLife()));
      f?.engage(id, false);
    }
    this.pieces.clear(); this.owned.clear(); this.sources.clear(); this.heads.clear(); this.acc = 0;
    this.combatUntil.clear();
    this.ground = undefined; this.scarGround = undefined; this.anchors = []; this.crossings.clear();
  }
  private route(j: TitanJourney) {
    const w = this.world, i = j.path.indexOf(w.zone.id);
    const entry = w.exits.find(e => e.to === j.path[i - 1]);
    const exit = w.exits.find(e => e.to === j.path[i + 1]);
    const center = { x: w.arena.w * 0.5, y: w.arena.h * 0.5 };
    const end = exit?.pos ?? { x: w.arena.w * 0.82, y: w.arena.h * 0.72 };
    const start = entry?.pos ?? { x: w.arena.w - end.x, y: w.arena.h - end.y };
    const point = (t: number) => titanRoute(start, end, center, t);
    let length = 0, last = point(0);
    for (let n = 1; n <= 40; n++) { const p = point(n / 40); length += dist(last, p); last = p; }
    return { i, point, length: Math.max(1, length) };
  }
  update(dt: number): void {
    const w = this.world, f = this.field();
    if (!f) return;
    // Capture wounds every tick, including a final tick before departure.
    for (const [id, a] of this.heads) {
      const j = f.journeys.find(j => j.id === id);
      if (j && !a.dead) {
        const life = Math.max(0.00001, Math.min(1, a.life / a.maxLife()));
        if (life < j.life) this.combatUntil.set(id, w.time + f.tuning.combatHoldSeconds);
        j.life = life;
        f.engage(id, (this.combatUntil.get(id) ?? 0) > w.time && dist(w.player.pos, a.pos) < f.tuning.combatRadius);
      }
    }
    this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0;
    const wanted = new Set<string>();
    const liveHeads = new Set<string>();
    let changed = false;
    const journeys = f.at(w.zone.id);
    if (journeys.length && !this.ground) {
      const nav = w.pathField();
      if (nav instanceof GridWalkField) {
        this.ground = GridWalkField.unpack(nav.pack());
        // Grid layouts price their base floor separately from props. Include
        // standing surfaces in this conservative, one-visit safety model.
        if (w.walk) for (const d of w.doodads) if (!this.owns(d) && blocksMovement(d)) {
          this.ground.fillDisc(d.pos.x, d.pos.y, shapeBoundR(hitSurfaceOf(d, 'move')), 'wall');
        }
        this.scarGround = GridWalkField.unpack(this.ground.pack());
        this.anchors = [w.player.pos, ...w.exits.map(e => e.pos),
          ...journeys.map(j => this.route(j).point(0.6))].map(p => this.ground!.snapToWalkable(p));
      }
    }
    for (const j of journeys) {
      const def = f.def(j), route = this.route(j);
      let source = this.sources.get(j.id);
      if (!source) {
        // Attribution object, deliberately not a spawned combatant. It can
        // own damage in an old scar zone while the real head is miles away.
        source = w.createMonster(def.monster, w.zone.level + def.levelBonus, 'enemy');
        source.tag = 'titan_wake'; source.eventKey = j.id;
        this.sources.set(j.id, source);
      }
      const head = j.head - route.i, tail = j.tail - route.i;
      if (head >= 0 && head < 1) {
        liveHeads.add(j.id);
        let a = this.heads.get(j.id);
        if (!a) {
          a = w.createMonster(def.monster, w.zone.level + def.levelBonus, 'enemy');
          a.worm = undefined; // the cross-zone solid body is this journey's projection
          a.tag = 'titan_head'; a.eventKey = j.id;
          a.life = a.maxLife() * j.life;
          this.heads.set(j.id, a); w.actors.push(a);
        }
        const p = route.point(head), ahead = route.point(Math.min(1, head + 0.01));
        a.pos = w.clampPos(p, a.radius);
        a.facing = Math.atan2(ahead.y - p.y, ahead.x - p.x);
      }
      const offer = (key: string, kind: string, pos: Vec2, radius: number, rot = 0) => {
        if (this.crossings.has(key)) return;
        wanted.add(key);
        let piece = this.pieces.get(key);
        if (!piece) {
          const d: Doodad = { pos: { ...pos }, radius, kind: 'titan_warning', rot,
            contactSource: source, contactGroup: `${j.id}:${kind}` };
          piece = { d, born: w.time };
          this.pieces.set(key, piece); this.owned.add(d); w.doodads.push(d); changed = true;
        }
        const d = piece.d;
        if (dist(d.pos, pos) > 1) { d.pos = { ...pos }; w.markDoodadsChanged(d); }
        d.rot = rot;
        if (d.kind === 'titan_warning' && w.time - piece.born >= f.tuning.warningSeconds) {
          const blocked = doodadRuleOf(kind).blocksMove && w.actors.some(a =>
            !a.dead && !a.flying && a.tag !== 'titan_head' && a.partLink?.root.tag !== 'titan_head' &&
            dist(a.pos, d.pos) < a.radius + radius + 12);
          if (!blocked) {
            if (key.includes(':wake:') && doodadRuleOf(kind).blocksMove) {
              const trial = this.ground && this.scarGround && titanScarAdmitted(this.ground,
                this.scarGround, pos, radius + w.player.radius + 12,
                [...this.anchors, this.ground.snapToWalkable(w.player.pos)]);
              // A field without connectivity answers cannot promise a safe
              // permanent wall. Keep its wake's other layers and crossings.
              if (!trial) { this.crossings.add(key); wanted.delete(key); return; }
              this.scarGround = trial;
            }
            d.kind = kind; w.markDoodadsChanged(d); changed = true;
          }
        }
        if (dist(w.player.pos, pos) < f.tuning.discoveryRadius && f.discover(j.id, w.zone.id)) {
          bumpLedger(w.ledger, 'titans_seen');
          w.text(w.player.pos, `The wake of ${def.name}. Follow the devastation.`, def.color, 16);
        }
        // Crush eligible scenery without deleting or altering its definition.
        // Hold only our own fallen pieces; release into safe native regrowth.
        for (const terrain of w.doodads) {
          if (this.owns(terrain) || dist(terrain.pos, pos) > radius + terrain.radius) continue;
          if (!terrain.felled) w.fellDoodad(terrain, j.id, { quiet: true });
          if (terrain.felled?.k === j.id) terrain.felled.wake = Math.max(terrain.felled.wake, w.time + 2);
        }
      };
      const count = Math.max(2, Math.ceil(route.length / def.body.spacing));
      for (let n = 0; n <= count; n++) {
        const t = n / count;
        // Leave space for the targetable head and its weak points.
        if (t < Math.max(0, tail) || t > Math.min(1, head - def.body.radius * 1.7 / route.length)) continue;
        const p = route.point(t), q = route.point(Math.min(1, t + 0.01));
        offer(`${j.id}:body:${n}`, def.body.kind, p, def.body.radius, Math.atan2(q.y - p.y, q.x - p.x));
      }
      for (let layer = 0; layer < def.wake.length; layer++) {
        const wake = def.wake[layer], count = Math.max(2, Math.ceil(route.length / wake.spacing));
        for (let n = 0; n <= count; n++) {
          const t = n / count;
          // The exposed wake follows the tail. Clear portal approaches so
          // scars force local detours without permanently sealing a hunt.
          if (t > tail || Math.min(t, 1 - t) * route.length < wake.radius + 100 ||
            titanGap(t, route.length, wake.gaps, wake.gapWidth, wake.radius)) continue;
          const pos = route.point(t);
          if (wake.drift) {
            const angle = w.time * Math.PI * 2 / wake.drift.period + n;
            pos.x += Math.cos(angle) * wake.drift.radius;
            pos.y += Math.sin(angle) * wake.drift.radius;
          }
          offer(`${j.id}:wake:${layer}:${n}`, wake.kind, pos, wake.radius);
        }
      }
    }
    for (const [key, p] of this.pieces) if (!wanted.has(key)) {
      p.d.gone = true;
      const i = w.doodads.indexOf(p.d); if (i >= 0) w.doodads.splice(i, 1);
      this.pieces.delete(key); this.owned.delete(p.d); w.markDoodadsChanged(p.d); changed = true;
    }
    for (const [id, a] of this.heads) if (!liveHeads.has(id)) {
      // Departure is not death: splice the whole anatomy without corpses,
      // part-break effects or kill credit (wounds already live on the journey).
      w.actors = w.actors.filter(b => b !== a && b.partLink?.root !== a);
      this.heads.delete(id); f.engage(id, false);
      this.combatUntil.delete(id);
    }
    for (const id of this.sources.keys()) if (!f.journeys.some(j => j.id === id)) this.sources.delete(id);
    if (!journeys.length) {
      this.ground = undefined; this.scarGround = undefined; this.anchors = []; this.crossings.clear();
    }
    if (changed) { w.collectContactHazards(); w.rebuildClientTerrain(); }
  }
  scene(): TitanScenePiece[] | undefined {
    if (!this.pieces.size) return;
    return [...this.pieces].map(([key, p]) => ({ key, kind: p.d.kind, x: p.d.pos.x,
      y: p.d.pos.y, r: p.d.radius, rot: p.d.rot ?? 0 }));
  }
  applyNet(scene: TitanScenePiece[] = []): void {
    const w = this.world, keys = new Set(scene.map(p => p.key));
    let changed = false;
    for (const [key, p] of this.pieces) if (!keys.has(key)) {
      const i = w.doodads.indexOf(p.d); if (i >= 0) w.doodads.splice(i, 1);
      w.markDoodadsChanged(p.d); this.pieces.delete(key); this.owned.delete(p.d); changed = true;
    }
    for (const row of scene) {
      let p = this.pieces.get(row.key);
      if (!p || !w.doodads.includes(p.d)) {
        p = { d: { pos: { x: row.x, y: row.y }, kind: row.kind, radius: row.r }, born: 0 };
        this.pieces.set(row.key, p); this.owned.add(p.d); w.doodads.push(p.d); changed = true;
      }
      if (p.d.kind !== row.kind || p.d.pos.x !== row.x || p.d.pos.y !== row.y || p.d.radius !== row.r) {
        p.d.kind = row.kind; p.d.pos = { x: row.x, y: row.y }; p.d.radius = row.r;
        w.markDoodadsChanged(p.d); changed = true;
      }
      p.d.rot = row.rot;
    }
    if (changed) w.rebuildClientTerrain();
  }
}
