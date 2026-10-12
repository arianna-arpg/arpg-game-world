/** Shared native arena and AI transition bodies over actual local geometry and population. */
import {dist,rand,vec,type Vec2} from '../core/math';
import {Actor,type BrainPhase} from './actor';
import {type ArenaRadius} from './brain';
import {instanceDelivery} from './skills';
import {type Doodad,type PlacedSlot} from './levelgen';
import {GridWalkField} from '../world/gridWalk';
import type {World,ZoneExit} from './world';
export interface NativeSceneCombatArenaHost {
 selectCombatBirthOwner(parent:Actor,selectedOwner:Actor|undefined):Actor|undefined;
 actorById:World["actorById"];
 actors:World["actors"];
 airPockets:World["airPockets"];
 arena:World["arena"];
 arenaRadiusOf:World["arenaRadiusOf"];
 arenaSinks:World["arenaSinks"];
 bossRun:World["bossRun"];
 doodads:World["doodads"];
 dropGemAt:World["dropGemAt"];
 exits:World["exits"];
 finalizeGarrison:World["finalizeGarrison"];
 flashes:World["flashes"];
 garrisonSlotById:World["garrisonSlotById"];
 nearestExit:World["nearestExit"];
 notice:World["notice"];
 onBeastFleeBegin:World["onBeastFleeBegin"];
 paintSink:World["paintSink"];
 provenanceOf:World["provenanceOf"];
 sinkRecordOf:World["sinkRecordOf"];
 spawnMinion:World["spawnMinion"];
 structures:World["structures"];
 teleportActor:World["teleportActor"];
 text:World["text"];
 walk:World["walk"];
}

export function sceneClaimGarrisonSlot(host:NativeSceneCombatArenaHost,a: Actor, within = 700, kinds?: string[]): boolean {
    if (a.garrison) return true;
    let best: PlacedSlot | null = null;
    let bd = Infinity;
    for (const st of host.structures) {
      for (const slot of st.slots) {
        if (kinds && !kinds.includes(slot.kind)) continue;
        slot.occupants = slot.occupants.filter(id => {
          const o = host.actorById(id);
          return !!o && !o.dead && o.garrison?.slotId === slot.id;
        });
        if (slot.occupants.length >= slot.capacity) continue;
        const d = dist(a.pos, slot.pos);
        if (d <= (slot.leash ?? within) && d < bd) { bd = d; best = slot; }
      }
    }
    if (!best) return false;
    best.occupants.push(a.id);
    if ((best.entry ?? 'teleport') === 'teleport') {
      a.garrison = { slotId: best.id };
      host.teleportActor(a, vec(best.pos.x, best.pos.y), '#d0a0ff', { ignoreConfine: true });
      host.finalizeGarrison(a);
    } else {
      // entry 'walk': the claim is PENDING — the garrison kernel marches the
      // claimer to the perch and finalizes (anchor + mods) on arrival. Never
      // anchor here: freezing a monster 700px from its tower in the open field
      // is the opposite of taking it.
      a.garrison = { slotId: best.id, pending: true };
    }
    return true;
  }

export function sceneCrackArena(host:NativeSceneCombatArenaHost,actor: Actor, opts: { count: number; ring: ArenaRadius; radius?: number }): void {
    // SOVEREIGNTY: seat — cracks seated clear of bodies (the derived census, probe_tiers RIG T).
    const grid = host.walk instanceof GridWalkField ? host.walk : null;
    if (!grid) return;
    const rec = host.sinkRecordOf(actor);
    const rr = host.arenaRadiusOf(opts.ring, rec.rect);
    const cr = opts.radius ?? 58;
    for (let i = 0; i < opts.count; i++) {
      const ang = (i / opts.count) * Math.PI * 2 + 0.5;
      const cx = rec.anchor.x + Math.cos(ang) * rr;
      const cy = rec.anchor.y + Math.sin(ang) * rr;
      if (Math.hypot(cx - actor.pos.x, cy - actor.pos.y) < cr + actor.radius + 40) continue;
      grid.fillDisc(cx, cy, cr, 'void');
      rec.cracks.push({ x: cx, y: cy, r: cr });
      host.flashes.push({ pos: vec(cx, cy), radius: cr + 6, color: '#2a1038', life: 0.5, maxLife: 0.5 });
    }
    for (const a of host.actors) {
      if (a.dead) continue;
      if ((a.team === 'player' || a === actor) && !grid.isWalkable(a.pos.x, a.pos.y)) {
        const s = grid.snapToWalkable(a.pos);
        a.pos = vec(s.x, s.y);
      }
    }
  }

export function sceneOnBrainPhaseEnter(host:NativeSceneCombatArenaHost,actor: Actor, phase: BrainPhase): void {
    if (phase.announce) host.text(vec(actor.pos.x, actor.pos.y - 26), phase.announce, '#ffd700', 16);
    if (phase.rewardGems) for (let i = 0; i < phase.rewardGems; i++) host.dropGemAt(actor.pos, undefined, false, host.provenanceOf(actor));
    if (phase.flee) {
      const exit = host.nearestExit(actor.pos);
      actor.aiFleeing = true;
      actor.aiFleeGoal = exit ? vec(exit.pos.x, exit.pos.y) : undefined;
      host.onBeastFleeBegin(actor, exit); // Hunt hook (no-op unless it's the beast)
      host.flashes.push({ pos: vec(actor.pos.x, actor.pos.y), radius: actor.radius * 2.2, color: '#e8d44a', life: 0.4, maxLife: 0.4 });
    }
  }

export function sceneRestoreArena(host:NativeSceneCombatArenaHost,actor: Actor): void {
    const rec = host.arenaSinks.get(actor.id);
    const rect = rec?.rect
      ?? (host.bossRun && actor.defId === host.bossRun.bossId ? host.bossRun.rect : null);
    host.arenaSinks.delete(actor.id);
    host.airPockets = [];
    const grid = host.walk instanceof GridWalkField ? host.walk : null;
    if (grid && rect) {
      grid.fillRegion(rect.x0, rect.y0, rect.x1, rect.y1, 'ground');
      for (const ex of host.exits) grid.fillDisc(ex.pos.x, ex.pos.y, 110, 'ground');
    }
    if (host.bossRun && actor.defId === host.bossRun.bossId) host.bossRun = null;
  }

export function sceneShrinkArenaPockets(host:NativeSceneCombatArenaHost,actor: Actor, by: number, min: number): void {
    if (!host.airPockets.length) return;
    for (const ap of host.airPockets) ap.r = Math.max(min, ap.r - by);
    const rec = host.arenaSinks.get(actor.id);
    if (rec && rec.radius > 0) host.paintSink(actor, rec);
  }

export function sceneSinkArena(host:NativeSceneCombatArenaHost,actor: Actor, opts: {
    radius: ArenaRadius; mode: 'ground' | 'deep_water'; rectRadius?: number;
    dais?: number; pockets?: { count: number; radius: number; ringFrac?: number };
  }): void {
    if (!(host.walk instanceof GridWalkField)) return;
    const rec = host.sinkRecordOf(actor, opts.rectRadius);
    rec.radius = host.arenaRadiusOf(opts.radius, rec.rect);
    rec.mode = opts.mode;
    if (opts.dais !== undefined) rec.dais = opts.dais;
    if (opts.pockets) {
      host.airPockets = [];
      const ringR = rec.radius * (opts.pockets.ringFrac ?? 0.58);
      for (let i = 0; i < opts.pockets.count; i++) {
        const ang = (i / opts.pockets.count) * Math.PI * 2 + Math.PI / opts.pockets.count;
        host.airPockets.push({
          x: rec.anchor.x + Math.cos(ang) * ringR,
          y: rec.anchor.y + Math.sin(ang) * ringR,
          r: opts.pockets.radius,
        });
      }
    }
    host.paintSink(actor, rec);
  }

export function sceneSpawnSummonOffspring(host:NativeSceneCombatArenaHost,parent: Actor, act: Extract<import('./brain').AIAction, { do: 'summon' }>): void {
    const owner = host.selectCombatBirthOwner(parent,parent.owner), inst = parent.summonInst, shape = act.inheritSummon;
    if (!owner || owner.dead || !inst || !shape || parent.summonOffspring) return;
    const d = instanceDelivery(inst);
    if (d.type !== 'summon' || !owner.skills.includes(inst)) return;
    const count = Math.max(0, Math.round(act.count ?? 1));
    const base = rand(0, Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const angle = base + i / Math.max(1, count) * Math.PI * 2;
      host.spawnMinion(owner, inst, { monsterId: act.monster, offspring: shape,
        delivery: { ...d, persistent: undefined, poolGroup: undefined, exclusiveGroup: undefined, crewOnDeath: undefined,
          duration: act.lifespan ?? 8, shell: undefined },
        pos: vec(parent.pos.x + Math.cos(angle) * (act.ring ?? 28), parent.pos.y + Math.sin(angle) * (act.ring ?? 28)) });
    }
  }

export function sceneStartBurrow(host:NativeSceneCombatArenaHost,a: Actor, act: { kinds: string[]; range?: number; damageFrac?: number; emergeRadius?: number; announce?: string }, target: Actor): void {
    const on = host.doodads.some(d =>
      act.kinds.includes(d.kind) && !d.gone && dist(a.pos, d.pos) <= d.radius + a.radius * 0.5);
    if (!on) return;
    // Destination: the qualifying patch nearest the TARGET; emerge at the
    // target's own position when it stands inside the patch.
    let best: Doodad | null = null;
    let bd = Infinity;
    const reach = act.range ?? 800;
    for (const d of host.doodads) {
      if (!act.kinds.includes(d.kind) || d.gone) continue;
      if (dist(a.pos, d.pos) > reach) continue;
      const dd = dist(target.pos, d.pos);
      if (dd < bd) { bd = dd; best = d; }
    }
    if (!best) return;
    const dx = target.pos.x - best.pos.x, dy = target.pos.y - best.pos.y;
    const dl = Math.hypot(dx, dy) || 1;
    const inner = Math.max(0, best.radius - a.radius * 0.4);
    const to = dl <= inner
      ? { x: target.pos.x, y: target.pos.y }
      : { x: best.pos.x + (dx / dl) * inner, y: best.pos.y + (dy / dl) * inner };
    a.burrow = {
      phase: 'submerge', t: 0.35, to,
      speed: Math.max(150, a.sheet.get('moveSpeed') * 2.2),
      damageFrac: act.damageFrac ?? 0.22,
      emergeRadius: act.emergeRadius ?? 70,
      dustAcc: 0, color: '#c8b070',
    };
    a.untargetable = true;
    if (act.announce) host.text(vec(a.pos.x, a.pos.y - 20), act.announce, '#c8b070', 12);
  }

export function sceneArenaRadiusOf(host:NativeSceneCombatArenaHost,
    r: ArenaRadius, rect: { x0: number; y0: number; x1: number; y1: number },
  ): number {
    if (typeof r === 'number') return r;
    const halfMin = Math.min(rect.x1 - rect.x0, rect.y1 - rect.y0) / 2;
    return Math.max(r.min, halfMin * r.frac);
  }

export function sceneSinkRecordOf(host:NativeSceneCombatArenaHost,actor: Actor, rectRadius?: number) {
    let rec = host.arenaSinks.get(actor.id);
    if (rec) return rec;
    const anchor = actor.aiAnchor ?? vec(actor.pos.x, actor.pos.y);
    let rect: { x0: number; y0: number; x1: number; y1: number };
    if (host.bossRun && actor.defId === host.bossRun.bossId) {
      rect = { ...host.bossRun.rect };
    } else {
      const rr = rectRadius ?? 640;
      rect = {
        x0: Math.max(40, anchor.x - rr), y0: Math.max(40, anchor.y - rr),
        x1: Math.min(host.arena.w - 40, anchor.x + rr),
        y1: Math.min(host.arena.h - 40, anchor.y + rr),
      };
    }
    rec = {
      anchor: vec(anchor.x, anchor.y), rect,
      dais: 150, mode: 'ground', radius: 0, cracks: [],
    };
    host.arenaSinks.set(actor.id, rec);
    return rec;
  }

export function scenePaintSink(host:NativeSceneCombatArenaHost,actor: Actor, rec: {
    anchor: Vec2; rect: { x0: number; y0: number; x1: number; y1: number };
    dais: number; mode: 'ground' | 'deep_water'; radius: number;
    cracks: { x: number; y: number; r: number }[];
  }): void {
    const grid = host.walk instanceof GridWalkField ? host.walk : null;
    if (!grid) return;
    grid.fillRegion(rec.rect.x0, rec.rect.y0, rec.rect.x1, rec.rect.y1, 'void');
    grid.fillDisc(rec.anchor.x, rec.anchor.y, rec.radius, rec.mode);
    for (const ap of host.airPockets) grid.fillDisc(ap.x, ap.y, ap.r, 'air_pocket');
    if (rec.dais > 0) grid.fillDisc(rec.anchor.x, rec.anchor.y, rec.dais, 'ground');
    for (const c of rec.cracks) grid.fillDisc(c.x, c.y, c.r, 'void');
    // Snap the fight's participants off collapsed cells — the sinking boss
    // usually levitates (no fall damage), but stranded off-mesh it could
    // never path back; heroes and their minions likewise.
    for (const a of host.actors) {
      if (a.dead) continue;
      if ((a.team === 'player' || a === actor) && !grid.isWalkable(a.pos.x, a.pos.y)) {
        const s = grid.snapToWalkable(a.pos);
        a.pos = vec(s.x, s.y);
      }
    }
  }

export function sceneNearestExit(host:NativeSceneCombatArenaHost,from: Vec2): ZoneExit | null {
    let best: ZoneExit | null = null, bd = Infinity;
    for (const e of host.exits) {
      const d = dist(from, e.pos);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

export function sceneOnBeastFleeBegin(host:NativeSceneCombatArenaHost,actor: Actor, _exit: ZoneExit | null): void {
    if (actor.tag !== 'hunt_beast') return;
    host.notice('Beast Fleeing', '#d8a83a', 15, 'events');
  }

export function sceneFinalizeGarrison(host:NativeSceneCombatArenaHost,a: Actor): void {
    const slot = a.garrison ? host.garrisonSlotById(a.garrison.slotId) : null;
    if (!slot) { a.garrison = undefined; return; }
    a.garrison = { slotId: slot.id };
    a.anchored = true;
    a.sheet.setSource('garrison', slot.mods ?? []);
    host.text(vec(a.pos.x, a.pos.y - 22), 'takes the tower!', '#d0a0ff', 12);
  }

export function sceneGarrisonSlotById(host:NativeSceneCombatArenaHost,id: string): PlacedSlot | null {
    for (const st of host.structures) {
      for (const slot of st.slots) if (slot.id === id) return slot;
    }
    return null;
  }
