// ---------------------------------------------------------------------------
// AI ACTIONS — the choreography VERBS boss fights are written in.
//
// Phases, cadences and rules (brain.ts) fire lists of AIAction beats; this
// registry executes them against the world. Every verb is attributed to the
// ACTING monster — its level, stats and color scale and tint the results —
// so scripted violence obeys the same rules as everything else. A new verb
// is one union member (brain.ts) + one handler here; the content that USES
// it is pure data in the bestiary.
// ---------------------------------------------------------------------------

import { angleTo, dist, rand, vec, type Vec2 } from '../core/math';
import { SKILLS } from '../data/skills';
import { MONSTERS } from '../data/monsters';
import { makeSkillInstance, type SkillInstance } from './skills';
import type { Actor } from './actor';
import { alertScale, type AIAction } from './brain';
import type { World } from './world';

/** Mint (and cache) a skill instance for scripted casts — leveled like the
 *  monster's own kit (createMonster's formula), so choreography scales. */
function mintInst(actor: Actor, skillId: string): SkillInstance | null {
  const def = SKILLS[skillId];
  if (!def) return null;
  const cache = actor.aiActionInsts ??= new Map();
  const hit = cache.get(skillId);
  if (hit) return hit;
  const inst = makeSkillInstance(def, 1 + Math.floor((actor.level - 1) / 4));
  cache.set(skillId, inst);
  return inst;
}

/** Resolve a named choreography point against actor / target / anchor. */
function resolvePoint(
  actor: Actor, target: Actor | null,
  at: 'target' | 'self' | 'anchor' | 'behindTarget' | 'awayFromTarget' | 'randomNear' | undefined,
): Vec2 {
  switch (at) {
    case 'self': return vec(actor.pos.x, actor.pos.y);
    case 'anchor': return actor.aiAnchor ?? vec(actor.pos.x, actor.pos.y);
    case 'behindTarget':
      if (!target) break;
      return vec(
        target.pos.x + Math.cos(target.facing + Math.PI) * 60,
        target.pos.y + Math.sin(target.facing + Math.PI) * 60);
    case 'awayFromTarget': {
      // Directly away from the threat — the vulture's escape bearing.
      const ang = target ? angleTo(target.pos, actor.pos) : actor.facing + Math.PI;
      return vec(actor.pos.x + Math.cos(ang) * 380, actor.pos.y + Math.sin(ang) * 380);
    }
    case 'randomNear': {
      const ang = rand(0, Math.PI * 2);
      const r = rand(60, 220);
      return vec(actor.pos.x + Math.cos(ang) * r, actor.pos.y + Math.sin(ang) * r);
    }
    case 'target':
    default:
      break;
  }
  if (target) return vec(target.pos.x, target.pos.y);
  // Target-less fallback: ahead of the actor's facing, so beats stay sane
  // when scripted outside combat.
  return vec(
    actor.pos.x + Math.cos(actor.facing) * 200,
    actor.pos.y + Math.sin(actor.facing) * 200);
}

/** Snap a choreography point onto walkable ground (grid zones), clamped to
 *  the arena. */
function groundPoint(world: World, p: Vec2, radius: number): Vec2 {
  const snapped = world.walk ? world.walk.snapToWalkable(p) : p;
  return world.clampPos(vec(snapped.x, snapped.y), radius);
}

type Handler = (world: World, actor: Actor, act: AIAction, target: Actor | null) => void;

const HANDLERS: Record<AIAction['do'], Handler> = {

  announce: (world, actor, act) => {
    if (act.do !== 'announce') return;
    world.text(vec(actor.pos.x, actor.pos.y - 26),
      act.text, act.color ?? '#ffd700', act.size ?? 16);
  },

  // A scripted cast flows through the SAME pipeline the player uses — the
  // actor's stats, costs and cast bars all apply. `force` is the reliability
  // valve for choreography that must never fizzle: no cost, no cooldown, no
  // bar — the beat simply HAPPENS (executeSkill).
  cast: (world, actor, act, target) => {
    if (act.do !== 'cast') return;
    const inst = mintInst(actor, act.skill);
    if (!inst) return;
    const aim = resolvePoint(actor, target, act.at);
    if (act.force) {
      actor.aimPos = vec(aim.x, aim.y); // guided payloads chase the scripted mark
      world.executeSkill(actor, inst, aim, { noCooldown: true, dmgMult: act.mult ?? 1 });
    } else {
      world.useSkill(actor, inst, aim);
    }
  },

  summon: (world, actor, act) => {
    if (act.do !== 'summon') return;
    const count = act.count ?? 1;
    const ring = act.ring ?? 140;
    const base = rand(0, Math.PI * 2);
    const around = act.at === 'anchor'
      ? (actor.aiAnchor ?? actor.pos) : actor.pos;
    for (let i = 0; i < count; i++) {
      const m = world.createMonster(act.monster, actor.level, actor.team);
      const ang = base + (i / count) * Math.PI * 2;
      m.pos = groundPoint(world,
        vec(around.x + Math.cos(ang) * ring, around.y + Math.sin(ang) * ring),
        m.radius);
      if (act.tag) m.tag = act.tag;
      if (act.lifespan) m.lifespan = act.lifespan;
      if (act.rarity) world.promoteMonster(m, act.rarity);
      world.actors.push(m);
      world.flashes.push({
        pos: vec(m.pos.x, m.pos.y), radius: m.radius * 2,
        color: actor.color, life: 0.4, maxLife: 0.4,
      });
    }
    if (act.announce) {
      world.text(vec(actor.pos.x, actor.pos.y - 26), act.announce, '#ffd700', 16);
    }
  },

  // CLAIM a structure garrison slot (the tower-imp verb): World owns the slot
  // ledger (host-authoritative, self-healing occupancy); a failed claim is a
  // graceful no-op — the rule's `use` falls back through the garrison kernel.
  garrison: (world, actor, act) => {
    if (act.do !== 'garrison') return;
    world.claimGarrisonSlot(actor, act.within, act.kinds);
  },

  // MOUNT the nearest free same-team beast whose mountSlot accepts this
  // actor: teleport to the saddle; World.updateMounts carries the rider
  // from here (position pinned, dash/push stilled) until either dies.
  mount: (world, actor, act) => {
    if (act.do !== 'mount') return;
    if (actor.mountId !== undefined) return; // already in a saddle
    const reach = act.within ?? 480;
    let best: Actor | null = null;
    let bd = Infinity;
    for (const m of world.actors) {
      if (m === actor || m.dead || m.team !== actor.team || m.riderId !== undefined) continue;
      const slot = m.defId ? MONSTERS[m.defId]?.mountSlot : undefined;
      if (!slot) continue;
      if (!slot.kinds.some(k => actor.tag === k || actor.defId === k || actor.faction === k)) continue;
      const d = dist(actor.pos, m.pos);
      if (d <= reach && d < bd) { bd = d; best = m; }
    }
    if (!best) return; // nothing to ride — graceful no-op
    actor.mountId = best.id;
    best.riderId = actor.id;
    world.teleportActor(actor, vec(best.pos.x, best.pos.y - best.radius), '#d8b0ff');
  },

  dismount: (world, actor, act) => {
    if (act.do !== 'dismount') return;
    if (actor.mountId === undefined) return;
    const m = world.actorById(actor.mountId);
    if (m && m.riderId === actor.id) m.riderId = undefined;
    actor.mountId = undefined;
    const ang = rand(0, Math.PI * 2);
    world.teleportActor(actor, vec(
      actor.pos.x + Math.cos(ang) * 50, actor.pos.y + Math.sin(ang) * 50), '#d8b0ff');
  },

  teleport: (world, actor, act, target) => {
    if (act.do !== 'teleport') return;
    let dest: Vec2 | null = null;
    switch (act.to) {
      case 'anchor':
        dest = actor.aiAnchor ?? null;
        break;
      case 'awayFromTarget':
        if (target) {
          const ang = angleTo(target.pos, actor.pos);
          const r = act.range ?? 420;
          dest = vec(actor.pos.x + Math.cos(ang) * r, actor.pos.y + Math.sin(ang) * r);
        } else {
          dest = actor.aiAnchor ?? null;
        }
        break;
      case 'behindTarget':
        if (target) {
          const off = target.radius + actor.radius + (act.range ?? 12);
          dest = vec(
            target.pos.x + Math.cos(target.facing + Math.PI) * off,
            target.pos.y + Math.sin(target.facing + Math.PI) * off);
        }
        break;
      case 'nearTarget':
        if (target) {
          const ang = rand(0, Math.PI * 2);
          const r = act.range ?? 160;
          dest = vec(target.pos.x + Math.cos(ang) * r, target.pos.y + Math.sin(ang) * r);
        }
        break;
    }
    if (!dest) return;
    world.teleportActor(actor, groundPoint(world, dest, actor.radius), '#b8a0e0');
  },

  // The add-gate: untargetable until no live actor carries the tag — the
  // ward WATCHER in ai.ts shatters it (flash + the promised announce).
  ward: (world, actor, act) => {
    if (act.do !== 'ward') return;
    actor.untargetable = true;
    actor.aiWardTag = act.tag;
    actor.aiWardNote = act.announce;
    world.flashes.push({
      pos: vec(actor.pos.x, actor.pos.y), radius: 170,
      color: '#d060e0', life: 0.7, maxLife: 0.7,
    });
  },

  buff: (world, actor, act) => {
    if (act.do !== 'buff') return;
    actor.addBuff(act.buff);
  },

  // The callout: kin within the radius snap to alert toward my prey.
  shout: (world, actor, act, target) => {
    if (act.do !== 'shout') return;
    const from = target ? vec(target.pos.x, target.pos.y) : vec(actor.pos.x, actor.pos.y);
    for (const a of world.actors) {
      if (a.dead || a === actor || a.team !== actor.team || a.passive || a.construct) continue;
      if (dist(a.pos, actor.pos) > act.radius) continue;
      a.alertUntil = Math.max(a.alertUntil, world.time + (act.duration ?? 6) * alertScale(a));
      a.alertFrom ??= from;
    }
  },

  push: (world, actor, act) => {
    if (act.do !== 'push') return;
    const from = act.from === 'anchor' ? (actor.aiAnchor ?? actor.pos) : actor.pos;
    for (const e of world.enemiesOf(actor)) {
      if (e.passive || dist(e.pos, from) > act.radius) continue;
      const dir = act.inward ? angleTo(e.pos, from) : angleTo(from, e.pos);
      world.pushActor(e, dir, act.strength, actor);
    }
    world.shake = Math.max(world.shake, Math.min(6, act.strength / 40));
  },

  // Telegraphed ground-blast ring(s) rippling outward — the meteor-volley
  // grammar, attributed to the actor (its stats roll the damage; zones hit
  // the ACTOR'S enemies, so a boss never shells its own guard).
  ring: (world, actor, act, target) => {
    if (act.do !== 'ring') return;
    const inst = mintInst(actor, act.skill);
    if (!inst) return;
    const center = resolvePoint(actor, target, act.at ?? 'self');
    const waves = act.waves ?? 1;
    const a0 = world.time; // rotates each cast (deterministic on the host)
    for (let w = 0; w < waves; w++) {
      const r = act.radius * (w + 1);
      const n = act.count + w * 2;
      for (let i = 0; i < n; i++) {
        const ang = a0 + (i / n) * Math.PI * 2 + w * 0.3;
        const at = groundPoint(world,
          vec(center.x + Math.cos(ang) * r, center.y + Math.sin(ang) * r), 12);
        const zr = act.zoneRadius ?? 82;
        world.zones.push({
          pos: at, radius: zr, caster: actor, inst,
          color: actor.color,
          delay: (act.delay ?? 1.0) + w * (act.waveGap ?? 0.5),
          exploded: false, linger: 0, tickInterval: 0, tickTimer: 0,
          shape: 0, facing: 0, dmgMult: 1, depth: 1, meteor: true,
          onImpact: act.push ? () => impactPush(world, actor, at, zr, act.push!) : undefined,
        });
      }
    }
  },

  nova: (world, actor, act, target) => {
    if (act.do !== 'nova') return;
    const inst = mintInst(actor, act.skill);
    if (!inst) return;
    const at = groundPoint(world, resolvePoint(actor, target, act.at ?? 'self'), 12);
    const zr = act.zoneRadius ?? 90;
    world.zones.push({
      pos: at, radius: zr, caster: actor, inst,
      color: actor.color, delay: act.delay ?? 0.9,
      exploded: false, linger: 0, tickInterval: 0, tickTimer: 0,
      shape: 0, facing: 0, dmgMult: 1, depth: 1, meteor: true,
      onImpact: act.push ? () => impactPush(world, actor, at, zr, act.push!) : undefined,
    });
  },

  // --- ARENA TERRAIN: the sinking-vault grammar (grid zones; no-ops on
  // plains). World owns the paint + the per-boss sink record; these are the
  // data-facing doors.
  arenaSink: (world, actor, act) => {
    if (act.do !== 'arenaSink') return;
    world.sinkArena(actor, act);
  },
  voidCrack: (world, actor, act) => {
    if (act.do !== 'voidCrack') return;
    world.crackArena(actor, act);
  },
  shrinkPockets: (world, actor, act) => {
    if (act.do !== 'shrinkPockets') return;
    world.shrinkArenaPockets(actor, act.by, act.min);
  },
  arenaRestore: (world, actor, act) => {
    if (act.do !== 'arenaRestore') return;
    world.restoreArena(actor);
  },

  heal: (world, actor, act) => {
    if (act.do !== 'heal') return;
    const landed = actor.healBy(actor.maxLife() * act.frac);
    if (landed > 0) {
      world.text(vec(actor.pos.x, actor.pos.y - 16), `+${Math.round(landed)}`, '#7ec88a', 13);
      world.flashes.push({
        pos: vec(actor.pos.x, actor.pos.y), radius: actor.radius * 1.8,
        color: '#7ec88a', life: 0.35, maxLife: 0.35,
      });
    }
  },

  shake: (world, _actor, act) => {
    if (act.do !== 'shake') return;
    world.shake = Math.max(world.shake, act.amount);
  },

  wash: (world, _actor, act) => {
    if (act.do !== 'wash') return;
    world.arenaWash = act.intensity > 0
      ? { color: act.color, intensity: act.intensity } : null;
  },

  reward: (world, actor, act) => {
    if (act.do !== 'reward') return;
    for (let i = 0; i < act.gems; i++) world.dropGemAt(actor.pos);
  },

  // The transient retreat: rides the SAME seam ladder flee-phases use, so
  // exit choice, Hunt migration, and the escape flash all come along.
  flee: (world, actor, act) => {
    if (act.do !== 'flee') return;
    world.onBrainPhaseEnter(actor, { atLifeFrac: 0, flee: true });
  },

  dash: (world, actor, act, target) => {
    if (act.do !== 'dash') return;
    const at = target ? angleTo(actor.pos, target.pos) : actor.facing;
    actor.dash = {
      dir: act.toward === 'away' ? at + Math.PI : at,
      speed: act.speed ?? 620,
      remaining: act.duration ?? 0.25,
    };
  },
};

/** A blast's impact knockback: everyone hostile in the disc is thrown
 *  radially from its center (or sucked in). */
function impactPush(
  world: World, actor: Actor, at: Vec2, radius: number,
  push: { strength: number; inward?: boolean },
): void {
  for (const e of world.enemiesOf(actor)) {
    if (e.passive || dist(e.pos, at) > radius + e.radius) continue;
    const dir = push.inward ? angleTo(e.pos, at) : angleTo(at, e.pos);
    world.pushActor(e, dir, push.strength, actor);
  }
  world.shake = Math.max(world.shake, Math.min(6, push.strength / 40));
}

/** Execute a beat list against the world, attributed to `actor`. `target`
 *  is the actor's current prey (null out of combat) — points resolve
 *  against it. `allowDead` lets DEATH RATTLES run with the corpse as
 *  author (kill() passes it); otherwise a beat that kills its own author
 *  (fuses, recoil) stops the list. */
export function runAIActions(
  world: World, actor: Actor, actions: AIAction[], target: Actor | null = null,
  opts?: { allowDead?: boolean },
): void {
  for (const act of actions) {
    if (actor.dead && !opts?.allowDead) return;
    HANDLERS[act.do]?.(world, actor, act, target);
  }
}
