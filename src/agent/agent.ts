// ---------------------------------------------------------------------------
// THE AGENT — a mind behind a seat. It implements the same PlayerInputSource
// contract a keyboard, a pad or a remote peer does, so the engine cannot tell
// it from a person: every move and press it makes goes through
// World.applyInputs, every cast takes the player's path, every refusal is the
// player's refusal. Three layers, each replaceable:
//
//   PERCEPT    (perception.ts) — foes, the focus, clusters, the blast about to
//              land, own vitals. Public reads only.
//   DECISION   (this file)     — directives first (a scripted order queue:
//              capture choreography, a companion's command), else the
//              temperament's utility pick over the kit (kit.ts), with the
//              dodge read overriding movement when a telegraph will land.
//   HAND       (this file)     — turns an intent into held/edge per slot with
//              each cast mode's real gesture (tap, hold, charge to full,
//              toggle once, press again inside a timing window).
//
// The decision layer emits an abstract intent ({ move, press, aim }); only the
// hand speaks PlayerInput. A future body that is not a seat (a mercenary or a
// monster brain) can reuse perception + decision behind its own hand.
// Contract: docs/engine/agent.md.
// ---------------------------------------------------------------------------

import { AGENT_CFG, AGENT_PROFILES, type AgentProfile } from '../data/agent';
import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { PlayerInput, PlayerInputSource } from '../net/intent';
import { readKit, type KitSlot } from './kit';
import { bestCluster, countNear, perceive, type Percept, type Pt } from './perception';

/** Where an order aims. A point, a body by id, or a live read. */
export type AimSpec =
  | Pt
  | { actor: number }
  | { offset: Pt }         // relative to the agent's own position
  | 'nearest' | 'focus' | 'cluster' | 'self' | 'facing';

/** One scripted order. The queue runs front to back; an empty queue hands
 *  the seat back to the temperament. */
export type Directive =
  /** Walk to a point (or a body), optionally facing something on the way. */
  | { do: 'move'; to: Pt | { actor: number } | { offset: Pt }; within?: number; sec?: number; face?: AimSpec; slow?: number }
  /** Press a skill (slot index or skill id). `hold` keeps it down that long;
   *  `times` repeats the press with `gap` seconds between; `walk` keeps
   *  walking toward a point while pressing. */
  | { do: 'cast'; skill: string | number; at?: AimSpec; hold?: number; times?: number; gap?: number; walk?: Pt | { offset: Pt } }
  /** Stand (or walk a direction) for a while, facing something. */
  | { do: 'wait'; sec: number; face?: AimSpec; walk?: Pt }
  /** Hand the seat to the temperament for a while (or until no foe stands). */
  | { do: 'fight'; sec?: number; until?: 'clear' }
  /** Keep near a body. */
  | { do: 'follow'; actor: number; dist?: number; sec: number };

export interface AgentOptions {
  /** A profile id from AGENT_PROFILES, 'auto' (read from the bar), or a profile. */
  profile?: string | AgentProfile;
  /** Orders to run before the temperament takes over. */
  directives?: Directive[];
  /** Slots the temperament may press (default: every slot). */
  slots?: number[];
  /** Never move on its own (directives still move). */
  rooted?: boolean;
  /** Per-agent overrides over the chosen profile (e.g. { dodge: false }). */
  tune?: Partial<AgentProfile>;
}

/** What the decision layer wants this tick. */
interface Intent {
  move: Pt | null;           // a world point to walk toward, or null
  moveSpeed: number;         // 0..1 analog
  press: { slot: number; aim: Pt; hold: number } | null;
  aim: Pt;                   // where the cursor rests this tick
}

/** The live gesture on one slot. */
interface Gesture {
  slot: number;
  play: KitSlot['play'];
  aim: Pt;
  until: number;             // agent clock: release after this
  started: number;
  edged: boolean;
}

export class HeroAgent implements PlayerInputSource {
  readonly profile: AgentProfile;
  private queue: Directive[];
  private current: { d: Directive; t0: number; n: number; lastPress: number; anchor?: Pt } | null = null;
  private t = 0;
  private gesture: Gesture | null = null;
  private lastUse = new Map<number, number>();
  private toggled = new Set<number>();
  private kitKey = '';
  private kit: KitSlot[] = [];
  private lastPressAt = -9;
  /** Live switches a director may flip mid-shot. */
  paused = false;
  readonly slots: number[] | null;
  readonly rooted: boolean;
  /** The last decision, for debugging and capture logs. */
  lastIntent: Intent | null = null;
  /** The last autonomous pick's candidates (slot → score or the reason it sat out). */
  private lastScores: Record<string, number | string> = {};

  constructor(actor: Actor, opts: AgentOptions = {}) {
    this.queue = [...(opts.directives ?? [])];
    this.slots = opts.slots ?? null;
    this.rooted = !!opts.rooted;
    const p = opts.profile ?? 'auto';
    const base = typeof p === 'string' ? AGENT_PROFILES[p] ?? autoProfile(actor) : p;
    this.profile = opts.tune ? { ...base, ...opts.tune, weights: { ...base.weights, ...opts.tune.weights } } : base;
  }

  /** A readout for tuning: how each slot was read, and how the last
   *  autonomous pick scored it (or why it sat the pick out). */
  explain(): { kit: { slot: number; id: string; role: string; play: string; aim: string; reach: number; area: number }[]; scores: Record<string, number | string>; order: string | null } {
    return {
      kit: this.kit.map(k => ({ slot: k.slot, id: k.id, role: k.role, play: k.play, aim: k.aim, reach: Math.round(k.reach), area: Math.round(k.area) })),
      scores: { ...this.lastScores },
      order: this.current ? this.current.d.do : null,
    };
  }

  /** Append orders (a director's mid-shot cue, a companion command). */
  order(...ds: Directive[]): void { this.queue.push(...ds); }
  /** Drop every pending order (the temperament resumes). */
  clearOrders(): void { this.queue.length = 0; this.current = null; }
  /** True while scripted orders remain. */
  get busy(): boolean { return !!this.current || this.queue.length > 0; }

  poll(actor: Actor, world: World, dt: number): PlayerInput | null {
    this.t += dt;
    if (actor.dead || actor.downed) return null;
    const n = actor.skills.length;
    const held = new Array<boolean>(n).fill(false);
    const edge = new Array<boolean>(n).fill(false);
    this.refreshKit(actor);
    const p = perceive(world, actor, this.profile.sight);
    const intent: Intent = this.paused ? idleIntent(actor) : this.decide(world, actor, p);
    if (!this.paused) this.dodge(world, actor, p, intent);
    this.lastIntent = intent;

    // ---- the hand ------------------------------------------------------
    if (intent.press && !this.gesture) this.begin(actor, intent.press);
    const g = this.gesture;
    let aim = intent.aim;
    if (g) {
      const k = this.kit.find(s => s.slot === g.slot);
      const cs = actor.casting;
      const mine = !!cs && actor.skills[g.slot] === cs.inst;
      aim = g.aim;
      if (!g.edged) { edge[g.slot] = true; held[g.slot] = true; g.edged = true; }
      else if (g.play === 'toggle') this.gesture = null;
      else if (g.play === 'charge') {
        const full = mine && cs!.mode === 'charge' && cs!.elapsed >= cs!.total;
        if (!full && this.t - g.started < AGENT_CFG.chargeMax) held[g.slot] = true;
        else this.gesture = null;
      } else if (g.play === 'timing') {
        held[g.slot] = true;
        if (mine && cs && !cs.pressUsed && cs.total > 0) {
          const frac = cs.elapsed / cs.total;
          if (cs.mode === 'perfect' && frac >= AGENT_CFG.perfectAt) edge[g.slot] = true;
          if (cs.mode === 'timed' && cs.indicatorAt !== undefined && frac >= cs.indicatorAt - 0.05) edge[g.slot] = true;
          if (cs.mode === 'multitude' && Math.round(this.t * 30) % 4 === 0) edge[g.slot] = true;
        }
        if (this.t >= g.until && !mine) this.gesture = null;
      } else {
        if (this.t < g.until) held[g.slot] = true;
        else this.gesture = null;
      }
      if (k?.aim === 'foe' && p.focus && g.play !== 'tap') aim = { x: p.focus.actor.pos.x, y: p.focus.actor.pos.y };
    } else if (this.profile.holdPrimary && !this.paused && !this.current) {
      // Fill time the way a person does: the basic attack held as a mouse button.
      const k0 = this.kit.find(s => s.slot === 0 && s.damaging && !s.passive);
      const f = p.focus ?? p.nearest;
      if (k0 && f && this.usable(world, actor, k0) && f.d <= k0.reach + AGENT_CFG.strikeSlack + f.actor.radius) {
        held[0] = true;
        aim = { x: f.actor.pos.x, y: f.actor.pos.y };
      }
    }

    // ---- movement --------------------------------------------------------
    let dx = 0, dy = 0;
    if (intent.move) {
      const vx = intent.move.x - actor.pos.x, vy = intent.move.y - actor.pos.y;
      const len = Math.hypot(vx, vy);
      if (len > AGENT_CFG.arrive * 0.5) {
        const dir = steer(world, actor, vx / len, vy / len);
        const s = Math.min(1, intent.moveSpeed) * (len < 40 ? Math.max(0.35, len / 40) : 1);
        dx = dir.x * s; dy = dir.y * s;
      }
    }
    return { dx, dy, aim: { x: aim.x, y: aim.y }, held, edge };
  }

  // ---------------------------------------------------------------- decide --

  private decide(world: World, actor: Actor, p: Percept): Intent {
    // Directives first.
    while (!this.current && this.queue.length) this.current = { d: this.queue.shift()!, t0: this.t, n: 0, lastPress: -9 };
    if (this.current) {
      const out = this.runDirective(world, actor, p);
      if (out) return out;
      this.current = null;
      return this.decide(world, actor, p);
    }
    return this.autonomous(world, actor, p);
  }

  private runDirective(world: World, actor: Actor, p: Percept): Intent | null {
    const c = this.current!;
    const d = c.d;
    const el = this.t - c.t0;
    const base = idleIntent(actor);
    switch (d.do) {
      case 'move': {
        // An offset is measured from where the order STARTED, not from the body
        // each tick (that mark would walk ahead of it forever).
        c.anchor ??= { x: actor.pos.x, y: actor.pos.y };
        const to = 'offset' in d.to ? { x: c.anchor.x + d.to.offset.x, y: c.anchor.y + d.to.offset.y } : this.point(world, actor, p, d.to);
        if (!to) return null;
        const left = Math.hypot(to.x - actor.pos.x, to.y - actor.pos.y);
        if (left <= (d.within ?? AGENT_CFG.arrive) || (d.sec !== undefined && el >= d.sec)) return null;
        return { ...base, move: to, moveSpeed: d.slow ?? 1, aim: d.face ? this.aimAt(world, actor, p, d.face) : to };
      }
      case 'wait': {
        if (el >= d.sec) return null;
        const aim = d.face ? this.aimAt(world, actor, p, d.face) : base.aim;
        return { ...base, move: d.walk ? { x: actor.pos.x + d.walk.x * 100, y: actor.pos.y + d.walk.y * 100 } : null, moveSpeed: 1, aim };
      }
      case 'cast': {
        const slot = typeof d.skill === 'number' ? d.skill : actor.skills.findIndex(s => s?.def.id === d.skill);
        const times = d.times ?? 1;
        if (slot < 0 || !actor.skills[slot]) return null;
        if (c.n >= times && !this.gesture && !actor.casting) return null;
        const aim = this.aimAt(world, actor, p, d.at ?? defaultAimFor(this.kit.find(s => s.slot === slot)));
        const walk = d.walk ? ('offset' in d.walk ? { x: actor.pos.x + d.walk.offset.x, y: actor.pos.y + d.walk.offset.y } : d.walk) : null;
        const ks = this.kit.find(s => s.slot === slot);
        const ready = !this.gesture && (c.n === 0 || el - c.lastPress >= (d.gap ?? 0.35))
          && (actor.canAct() || !!ks?.reflex)
          && (!ks || this.usable(world, actor, ks));
        if (ready && c.n < times) {
          c.n++; c.lastPress = el;
          return { ...base, move: walk, moveSpeed: 1, aim, press: { slot, aim, hold: d.hold ?? 0.1 } };
        }
        // Wait out the body (the cast bar, the lockout) before the next press
        // or before the order counts as done.
        if (c.n >= times && (actor.casting || this.gesture)) return { ...base, move: walk, moveSpeed: 1, aim };
        if (el > 12) return null; // a press the engine keeps refusing: give up
        return { ...base, move: walk, moveSpeed: 1, aim };
      }
      case 'fight': {
        if (d.sec !== undefined && el >= d.sec) return null;
        if (d.until === 'clear' && !p.foes.length) return null;
        return this.autonomous(world, actor, p);
      }
      case 'follow': {
        if (el >= d.sec) return null;
        const who = world.actorById(d.actor);
        if (!who || who.dead) return null;
        const gap = Math.hypot(who.pos.x - actor.pos.x, who.pos.y - actor.pos.y);
        const auto = this.autonomous(world, actor, p);
        if (gap > (d.dist ?? 110)) auto.move = { x: who.pos.x, y: who.pos.y };
        return auto;
      }
    }
    return null;
  }

  private autonomous(world: World, actor: Actor, p: Percept): Intent {
    const prof = this.profile;
    const out = idleIntent(actor);
    const f = p.focus ?? p.nearest;
    if (f) out.aim = { x: f.actor.pos.x, y: f.actor.pos.y };

    // Movement by stance.
    if (f && !this.rooted) {
      const ranged = this.kit.filter(k => k.damaging && !k.passive && (k.role === 'shot' || k.role === 'area' || k.role === 'construct'));
      const reachBest = ranged.length ? Math.max(...ranged.map(k => k.reach)) : 0;
      const touch = actor.radius + f.actor.radius;
      if (prof.stance === 'close' || !reachBest) {
        const melee = this.kit.filter(k => k.role === 'strike' || k.role === 'nova');
        const want = touch + (melee.length ? Math.min(...melee.map(k => Math.max(8, k.reach * 0.6))) : prof.meleeGap);
        if (f.d > want) out.move = { x: f.actor.pos.x, y: f.actor.pos.y };
      } else if (prof.stance === 'band') {
        const band = Math.min(prof.band, reachBest * 0.9);
        if (f.d > band * prof.bandHigh) out.move = { x: f.actor.pos.x, y: f.actor.pos.y };
        else if (f.d < band * prof.bandLow) out.move = away(actor.pos, f.actor.pos, 120);
      }
      if (prof.retreat > 0 && p.lifeFrac < prof.retreat) out.move = away(actor.pos, f.actor.pos, 160);
    }

    // The pick.
    if (!this.gesture && this.t - this.lastPressAt >= prof.pace) {
      let best: { k: KitSlot; score: number; aim: Pt; hold: number } | null = null;
      const why = this.lastScores = {} as Record<string, number | string>;
      for (const k of this.kit) {
        const tag = k.slot + ':' + k.id;
        if (k.passive) { why[tag] = 'trigger'; continue; }
        if (this.slots && !this.slots.includes(k.slot)) { why[tag] = 'slot off'; continue; }
        if (k.slot === 0 && prof.holdPrimary && k.damaging && (k.role === 'strike' || k.role === 'shot')) { why[tag] = 'held basic'; continue; }
        if (!this.usable(world, actor, k)) { why[tag] = 'unusable'; continue; }
        if (!actor.canAct() && !k.reflex) { why[tag] = 'busy:' + busyReason(actor); continue; }
        const sc = this.score(world, actor, p, k);
        why[tag] = sc ? +sc.score.toFixed(2) : 'no use now';
        if (sc && (!best || sc.score > best.score)) best = { k, ...sc };
      }
      if (best && best.score > 0) out.press = { slot: best.k.slot, aim: best.aim, hold: best.hold };
    }
    return out;
  }

  /** Score one slot against the situation; null = not now. */
  private score(world: World, actor: Actor, p: Percept, k: KitSlot): { score: number; aim: Pt; hold: number } | null {
    const prof = this.profile;
    const w = prof.weights[k.role] ?? 1;
    const f = p.focus ?? p.nearest;
    const since = this.t - (this.lastUse.get(k.slot) ?? -99);
    const hold = k.play === 'hold' ? AGENT_CFG.channelHold : k.play === 'charge' ? AGENT_CFG.chargeMax : 0.1;
    const self = { x: actor.pos.x, y: actor.pos.y };
    switch (k.role) {
      case 'heal': {
        const need = k.reflex || k.thirst ? AGENT_CFG.flaskBelow : prof.hurt;
        if (k.aim === 'ally') {
          const hurt = p.allies.filter(a => a.life < a.maxLife() * 0.7).sort((a, b) => a.life / a.maxLife() - b.life / b.maxLife())[0];
          return hurt ? { score: w, aim: { x: hurt.pos.x, y: hurt.pos.y }, hold } : null;
        }
        return p.lifeFrac < need ? { score: w * (1 + (need - p.lifeFrac) * 2), aim: self, hold } : null;
      }
      case 'aura':
        if (this.toggled.has(k.slot)) return null;
        return { score: w, aim: self, hold };
      case 'buff':
        if (!f || since < prof.upkeep) return null;
        return { score: w * (p.lifeFrac < prof.hurt ? 2 : 1), aim: f ? { x: f.actor.pos.x, y: f.actor.pos.y } : self, hold };
      case 'summon': {
        if (!f || since < prof.upkeep) return null;
        const at = f ? lerp(self, f.actor.pos, 0.5) : self;
        return { score: w, aim: at, hold };
      }
      case 'move': {
        if (!f || prof.stance !== 'close') return null;
        if (f.d < k.reach * 0.55 || f.d > k.reach * 1.2) return null;
        return { score: w, aim: { x: f.actor.pos.x, y: f.actor.pos.y }, hold };
      }
      case 'strike': {
        if (!f || f.d > k.reach + AGENT_CFG.strikeSlack + f.actor.radius) return null;
        const extra = k.area ? Math.max(0, countNear(p, f.actor.pos, k.area) - 1) : 0;
        return { score: w + extra * prof.perExtraTarget, aim: { x: f.actor.pos.x, y: f.actor.pos.y }, hold };
      }
      case 'nova': {
        const n = countNear(p, self, k.area);
        if (!n) return null;
        return { score: w + (n - 1) * prof.perExtraTarget, aim: f ? { x: f.actor.pos.x, y: f.actor.pos.y } : self, hold };
      }
      case 'area': case 'construct': {
        if (k.aim === 'self') {
          const n = countNear(p, self, k.area);
          return n ? { score: w + (n - 1) * prof.perExtraTarget, aim: self, hold } : null;
        }
        const cl = bestCluster(p, self, k.reach, Math.max(k.area, AGENT_CFG.clusterRadius * 0.6));
        if (!cl) return null;
        if (k.role === 'construct' && since < prof.upkeep * 0.5) return null;
        return { score: w + (cl.count - 1) * prof.perExtraTarget, aim: cl.pos, hold };
      }
      case 'ultimate': {
        const n = f ? countNear(p, f.actor.pos, 220) : 0;
        const boss = !!f && f.threat >= 4;
        if (n < 3 && !boss) return null;
        const at = k.aim === 'self' ? self : bestCluster(p, self, k.reach, 160)?.pos ?? (f ? f.actor.pos : self);
        return { score: w + n * 0.5, aim: { x: at.x, y: at.y }, hold };
      }
      case 'shot': default: {
        if (k.aim === 'corpse') {
          const c = world.corpses.filter(c => c.tier === actor.tier).sort((a, b) => dist(a.pos, self) - dist(b.pos, self))[0];
          if (!c || dist(c.pos, self) > k.reach) return null;
          return { score: w, aim: { x: c.pos.x, y: c.pos.y }, hold };
        }
        if (!f || f.d > k.reach) return null;
        const extra = k.area ? Math.max(0, countNear(p, f.actor.pos, k.area) - 1) : 0;
        return { score: w + extra * prof.perExtraTarget, aim: { x: f.actor.pos.x, y: f.actor.pos.y }, hold };
      }
    }
  }

  /** Step out of a blast that is about to land (the dodge read). */
  private dodge(world: World, actor: Actor, p: Percept, intent: Intent): void {
    if (!this.profile.dodge || !p.threat) return;
    const th = p.threat;
    const d = Math.hypot(actor.pos.x - th.pos.x, actor.pos.y - th.pos.y);
    if (d >= th.radius) return;
    const out = d > 1 ? away(actor.pos, th.pos, th.radius - d + 40) : { x: actor.pos.x + th.radius + 40, y: actor.pos.y };
    intent.move = out; intent.moveSpeed = 1;
    if (this.profile.dodgeWithSkills && th.eta < AGENT_CFG.dodgeSkillEta && !this.gesture) {
      const mv = this.kit.find(k => k.role === 'move' && this.usable(world, actor, k));
      if (mv) intent.press = { slot: mv.slot, aim: out, hold: 0.06 };
    }
  }

  // ------------------------------------------------------------------ hand --

  private begin(actor: Actor, press: NonNullable<Intent['press']>): void {
    const k = this.kit.find(s => s.slot === press.slot);
    const play = k?.play ?? 'tap';
    this.gesture = { slot: press.slot, play, aim: press.aim, started: this.t, edged: false,
      until: this.t + (play === 'tap' ? Math.max(0.05, press.hold) : press.hold) };
    this.lastUse.set(press.slot, this.t);
    this.lastPressAt = this.t;
    if (play === 'toggle') this.toggled.add(press.slot);
    void actor;
  }

  // --------------------------------------------------------------- helpers --

  private refreshKit(actor: Actor): void {
    const key = actor.skills.map(s => s ? s.def.id + ':' + s.level : '-').join(',');
    if (key === this.kitKey) return;
    this.kitKey = key;
    this.kit = readKit(actor);
  }

  private usable(world: World, actor: Actor, k: KitSlot): boolean {
    if ((actor.cooldowns.get(k.id) ?? 0) > 0) return false;
    if (!world.skillUsable(actor, k.inst)) return false;
    if (world.castReqRefusal(actor, k.inst)) return false;
    if (!actor.canAfford(actor.skillCost(k.inst))) return false;
    if (k.thirst && actor.life >= actor.maxLife() * 0.999) return false;
    return true;
  }

  private point(world: World, actor: Actor, _p: Percept, to: Pt | { actor: number } | { offset: Pt }): Pt | null {
    if ('actor' in to) { const a = world.actorById(to.actor); return a ? { x: a.pos.x, y: a.pos.y } : null; }
    if ('offset' in to) return { x: actor.pos.x + to.offset.x, y: actor.pos.y + to.offset.y };
    return to;
  }

  private aimAt(world: World, actor: Actor, p: Percept, a: AimSpec): Pt {
    const self = { x: actor.pos.x, y: actor.pos.y };
    if (typeof a === 'string') {
      const f = p.focus ?? p.nearest;
      switch (a) {
        case 'self': return self;
        case 'facing': return { x: actor.pos.x + Math.cos(actor.facing) * 80, y: actor.pos.y + Math.sin(actor.facing) * 80 };
        case 'nearest': return p.nearest ? { ...p.nearest.actor.pos } : self;
        case 'focus': return f ? { ...f.actor.pos } : self;
        case 'cluster': {
          const cl = bestCluster(p, self, 520, AGENT_CFG.clusterRadius);
          return cl ? cl.pos : f ? { ...f.actor.pos } : self;
        }
      }
    }
    if ('actor' in a) { const t = world.actorById(a.actor); return t ? { x: t.pos.x, y: t.pos.y } : self; }
    if ('offset' in a) return { x: actor.pos.x + a.offset.x, y: actor.pos.y + a.offset.y };
    return a;
  }
}

// ------------------------------------------------------------------ pure ---

/** Why canAct() refuses, for the readout. */
function busyReason(a: Actor): string {
  if (a.dead) return 'dead';
  if (a.casting) return 'casting ' + a.casting.inst.def.id;
  if (a.dash) return 'dashing';
  if (a.useLock > 0) return 'lockout ' + a.useLock.toFixed(2);
  if (a.isStunned()) return 'stunned';
  return '?';
}

function idleIntent(actor: Actor): Intent {
  return { move: null, moveSpeed: 1, press: null,
    aim: { x: actor.pos.x + Math.cos(actor.facing) * 80, y: actor.pos.y + Math.sin(actor.facing) * 80 } };
}

function defaultAimFor(k: KitSlot | undefined): AimSpec {
  if (!k) return 'focus';
  if (k.aim === 'self') return 'self';
  if (k.aim === 'cluster') return 'cluster';
  return 'focus';
}

const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function away(from: Pt, threat: Pt, by: number): Pt {
  const vx = from.x - threat.x, vy = from.y - threat.y, l = Math.hypot(vx, vy) || 1;
  return { x: from.x + vx / l * by, y: from.y + vy / l * by };
}

/** Whisker steering: keep the straight line when it is clear, else try the
 *  nearest open bearing. Cheap and stateless; enough for open ground. */
function steer(world: World, actor: Actor, ux: number, uy: number): Pt {
  const L = AGENT_CFG.whisker;
  const clear = (x: number, y: number): boolean => !world.pointInSolid(actor.pos.x + x * L, actor.pos.y + y * L, actor.radius, actor.tier);
  if (clear(ux, uy)) return { x: ux, y: uy };
  for (const a of AGENT_CFG.whiskerAngles) {
    const c = Math.cos(a), s = Math.sin(a);
    const x = ux * c - uy * s, y = ux * s + uy * c;
    if (clear(x, y)) return { x, y };
  }
  return { x: ux, y: uy };
}

/** A temperament read off the bar: summons → summoner, melee-led → brawler,
 *  spells → caster, otherwise a skirmisher. */
export function autoProfile(actor: Actor): AgentProfile {
  const kit = readKit(actor);
  const by = (r: KitSlot['role']): number => kit.filter(k => k.role === r).length;
  if (by('summon') >= 2) return AGENT_PROFILES.summoner;
  const melee = by('strike') + by('nova');
  const ranged = by('shot') + by('area');
  if (melee > ranged) return AGENT_PROFILES.brawler;
  if (kit.some(k => (k.inst.def.tags as readonly string[]).includes('spell'))) return AGENT_PROFILES.caster;
  return AGENT_PROFILES.skirmisher;
}
