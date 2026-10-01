// ---------------------------------------------------------------------------
// THE STAGE — a StagePlan made real in a World: the bare ground, the hero
// with the skill on the bar, the dummies (and whatever a setup borrows), the
// held camera, and THE DIRECTOR, the scripted hand that plays the skill
// through the ordinary input artery (World.applyInputs), so every cast takes
// the path a player's does. THE GATEKEEPER keeps whatever a cast spends or
// waits on ready at a demo pace. One frame = one tick(): input, AI, update,
// upkeep. Rendering is the caller's (the showcase engine, the recorder).
// Contract: docs/engine/skill-showcases.md.
// ---------------------------------------------------------------------------

import { SHOWCASE_CFG, SHOWCASE_STAGES } from '../data/skillShowcase';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import type { ZoneDef } from '../data/zones';
import type { Actor } from '../engine/actor';
import { updateAI } from '../engine/ai';
import { makeSkillGem, type SkillInstance } from '../engine/skills';
import type { Modifier } from '../engine/stats';
import type { World } from '../engine/world';
import type { PlayerInput } from '../net/intent';
import { dayCycle, DAY_LENGTH } from '../world/daynight';
import type { StagePlan, StagePoint } from './stagePlan';

/** What a surface asks to see: a skill, optionally as a particular gem
 *  (its level and socketed supports). */
export interface ShowcaseSpec {
  skillId: string;
  level?: number;
  supports?: { id: string; level?: number }[];
}

export interface StageReport {
  casts: number;
  /** Damage the dummies took (they are kept whole; this is what they lost). */
  dealt: number;
  statuses: number;
  actors: number;
  /** When nothing was cast: the engine's reason, if it gives one. */
  why: string | null;
}

export interface Stage {
  readonly plan: StagePlan;
  readonly world: World;
  /** The camera's world point and the stage width it frames. */
  readonly focus: StagePoint;
  readonly span: number;
  /** Seconds since the cycle began. */
  readonly t: number;
  tick(dt: number): void;
  report(): StageReport;
}

export const STAGE_ZONE_ID = 'skill_showcase_stage';
/** Where the hero stands on the stage zone (its far corners stay empty). */
const ORIGIN: StagePoint = { x: 1200, y: 800 };

/** The day's brightest hour (the stage plays at noon). */
export function brightestHour(): number {
  let best = 0;
  for (let t = 0; t < DAY_LENGTH; t++) if (dayCycle(t).light > dayCycle(best).light) best = t;
  return best;
}

function stageZone(level: number): ZoneDef {
  return {
    id: STAGE_ZONE_ID, name: 'The Stage', level,
    size: { w: 2400, h: 1600 },
    theme: SHOWCASE_STAGES[SHOWCASE_CFG.stage] ?? Object.values(SHOWCASE_STAGES)[0],
    seed: 31337,
    layout: [],
    objective: { kind: 'safe' },
    exits: [],
    map: { x: 9100, y: 9100 }, // far off every real chart
  };
}

/** Seat a skill as THE DEV GIFT (past the learn gate, never saved), with
 *  the spec's supports in its sockets. */
function seat(world: World, skillId: string, level: number, slot: number, supports: ShowcaseSpec['supports']): SkillInstance {
  const def = SKILLS[skillId];
  const p = world.player, known = world.localSeat.meta.knownSkills;
  const inst = makeSkillGem(def, level, 'rare');
  inst.granted = true;
  inst.devGift = true;
  (supports ?? []).forEach((s, i) => {
    const sd = SUPPORTS[s.id];
    if (sd && i < inst.sockets.length) inst.sockets[i] = { def: sd, level: s.level ?? level };
  });
  const prev = p.skills[slot];
  if (prev) known.delete(prev.def.id);
  known.set(skillId, inst);
  p.skills[slot] = inst;
  return inst;
}

/** Build the stage for a plan in a fresh world (makeSimWorld's: a hero of
 *  the plan's class, quiet, at the arena) and hand back its frame driver. */
export function buildStage(world: World, plan: StagePlan, spec: ShowcaseSpec): Stage {
  const level = spec.level ?? SHOWCASE_CFG.level;
  const p = world.player;
  const seatId = world.localSeat.id;
  world.devIgnoreSkillAttributes = true;
  world.zoneMap[STAGE_ZONE_ID] = stageZone(level);
  world.loadZone(STAGE_ZONE_ID);

  // A bare stage: no props, no weather, the day's brightest hour.
  world.actors = [p];
  world.projectiles = []; world.flashes = []; world.texts = []; world.zones = [];
  world.doodads = []; world.corpses = [];
  world.walk = null;
  world.markDoodadsChanged();
  world.sim.weather.spawnScale = 0;
  world.sim.weather.fronts.length = 0;
  world.time = brightestHour();

  // Only the stage's skills on the bar: the prep (if any) and the skill.
  for (let i = 0; i < p.skills.length; i++) p.skills[i] = null;
  const inst = seat(world, plan.skillId, level, 2, spec.supports);
  const prepInst = plan.prep && SKILLS[plan.prep.skill] ? seat(world, plan.prep.skill, level, 1, []) : null;
  const deep: Modifier[] = [
    { stat: 'accuracy', kind: 'flat', value: 100000 },
    { stat: 'mana', kind: 'flat', value: 100000 }, { stat: 'manaRegen', kind: 'flat', value: 10000 },
    { stat: 'life', kind: 'flat', value: 100000 }, { stat: 'lifeRegen', kind: 'flat', value: 10000 },
  ];
  p.sheet.setSource('showcase', deep);
  world.charDirty = true;
  world.recalcPlayer();
  p.fillResources();

  // Stage geometry, relative to the hero at the origin.
  const at = (v: StagePoint): StagePoint => ({ x: ORIGIN.x + v.x, y: ORIGIN.y + v.y });
  p.pos = at(plan.hero);
  p.facing = 0;
  const foes: Actor[] = plan.foes.map(f => {
    const m = world.createMonster(f.id, level, 'enemy');
    if (f.dummy) {
      // A PASSIVE body is scenery to every AI, homing shot and shove; the
      // stage wants a target. No skills, no brain, no feet: it still stands.
      m.skills = []; m.brain = undefined; m.passive = false;
      m.sheet.setSource('showcase', [{ stat: 'lifeRegen', kind: 'override', value: 0 }]);
    }
    m.pos = at(f); m.tier = p.tier; m.spawnedAt = -1;
    m.fillResources();
    if (f.lifeFrac) m.life = m.maxLife() * f.lifeFrac;
    world.actors.push(m);
    return m;
  });
  const dummies = foes.filter((_, i) => plan.foes[i].dummy);
  // An ally-targeted skill (a heal, a bond) finds a wounded companion at the
  // hero's side: still, so the cast reads on it.
  let ally: Actor | null = null;
  if (plan.ally) {
    ally = world.createMonster(plan.ally.id, level, 'player');
    ally.skills = []; ally.brain = undefined;
    ally.pos = at(plan.ally); ally.tier = p.tier; ally.spawnedAt = -1;
    ally.fillResources();
    ally.life = ally.maxLife() * 0.4;
    world.actors.push(ally);
  }
  const primary = ally ?? foes[0];
  // A gathered swarm (THE THRONG) arrives already claimed, ready to send.
  if (inst.def.throng) world.devThrongMint(inst.def.id, SHOWCASE_CFG.throng);
  // Corpse-fed skills find a body lying before each dummy, laid again
  // whenever one is spent.
  const graves = plan.corpse ? dummies.map(m => ({ x: m.pos.x - 34, y: m.pos.y })) : [];
  const corpseLife = plan.corpse ? world.createMonster(plan.corpse, level, 'enemy').maxLife() : 0;
  const lay = (): void => {
    for (const g of graves) {
      if (world.corpses.some(c => Math.hypot(c.pos.x - g.x, c.pos.y - g.y) < 12)) continue;
      world.corpses.push({ pos: { x: g.x, y: g.y }, defId: plan.corpse!, level, maxLife: corpseLife, remaining: 60, tier: p.tier });
    }
  };
  lay();

  // The held camera.
  const focus = at(plan.focus);
  world.frameLockFocus = () => focus;

  // THE DIRECTOR: the scripted hand on the local seat.
  let t = 0, casts = 0, dealt = 0, presses = 0, lastPress = -9, pressUntil = -1, flip = false;
  let pressAim: StagePoint | null = null;
  let phase: 'prep' | 'main' | 'wait' = 'prep', prepDone = 0, prepGone = -1;
  const home = { x: p.pos.x, y: p.pos.y };
  const cluster = at(plan.cluster);
  const aimOf = (): StagePoint => plan.aimMode === 'grave' && graves.length ? { ...graves[0] }
    : plan.aimMode === 'foe' && primary && !primary.dead ? { x: primary.pos.x, y: primary.pos.y }
    : plan.aimMode === 'cluster' ? cluster : at(plan.aim);
  const idle = (): boolean => !p.casting && p.useLock <= 0;
  const slot = p.skills.indexOf(inst), prepSlot = prepInst ? p.skills.indexOf(prepInst) : -1;
  const direct = (): PlayerInput => {
    const n = p.skills.length;
    const held = new Array<boolean>(n).fill(false), edge = new Array<boolean>(n).fill(false);
    let aim = plan.aimMode === 'foe' ? aimOf() : pressAim ?? aimOf();
    const press = (k: number, a: StagePoint): void => { held[k] = true; edge[k] = true; pressAim = a; aim = a; };
    const acting = t >= plan.start && t < plan.stop;
    if (acting && plan.prep && prepSlot >= 0) {
      // prep × presses → `then` after the last one leaves the hand → the
      // skill → wait for the body → again
      if (phase === 'prep' && idle() && prepDone < plan.prep.presses) {
        // a prep aims where the work is: the grave, else the primary target
        // (a ring's centre is the hero's own feet)
        press(prepSlot, plan.aimMode === 'grave' ? aimOf() : primary && !primary.dead ? { x: primary.pos.x, y: primary.pos.y } : cluster);
        prepDone++; lastPress = t; prepGone = -1;
      } else if (phase === 'prep' && prepDone >= plan.prep.presses) {
        if (prepGone < 0 && idle()) prepGone = t;
        if (prepGone >= 0 && t - prepGone >= plan.prep.then) phase = 'main';
      }
      if (phase === 'main' && idle()) {
        press(slot, aimOf()); presses++; lastPress = t; phase = 'wait';
      } else if (phase === 'wait' && idle() && t - lastPress >= plan.everySec) {
        phase = 'prep'; prepDone = 0;
      }
    } else if (acting) {
      if (plan.kind === 'hold') {
        held[slot] = true;
        if (presses === 0) { edge[slot] = true; presses++; }
        if (plan.mash && p.casting && Math.round(t * 30) % 4 === 0) edge[slot] = true;
      } else if (plan.kind === 'toggle') {
        if (presses === 0) { held[slot] = true; edge[slot] = true; presses++; }
      } else {
        // pulse / travel: press, hold for holdSec, let go, wait for the body.
        // A charge holds on until the bar is full (never past maxHold).
        const ready = t - lastPress >= plan.everySec && idle();
        const cs = p.casting;
        const charging = !!cs && cs.inst === inst && cs.mode === 'charge'
          && cs.elapsed < cs.total && t - lastPress < plan.maxHold;
        if (t < pressUntil || charging) held[slot] = true;
        else if (ready) {
          press(slot, plan.kind === 'travel' && flip ? { ...home } : aimOf());
          lastPress = t; pressUntil = t + plan.holdSec; presses++;
          if (plan.kind === 'travel') flip = !flip;
        }
      }
    }
    // The timing arts: press inside the golden end (perfect) or on the
    // indicator (timed), the way a practiced hand plays them.
    const cs = p.casting;
    if (cs && cs.inst === inst && !cs.pressUsed && cs.total > 0) {
      const frac = cs.elapsed / cs.total;
      if (cs.mode === 'perfect' && frac >= 0.78) edge[slot] = true;
      if (cs.mode === 'timed' && cs.indicatorAt !== undefined && frac >= cs.indicatorAt - 0.05) edge[slot] = true;
    }
    return { dx: 0, dy: 0, aim: { x: aim.x, y: aim.y }, held, edge };
  };

  // Count the casts that truly landed at the one artery.
  const useSkill = world.useSkill.bind(world);
  world.useSkill = (caster, i, a, pressed) => {
    const ok = useSkill(caster, i, a, pressed);
    if (ok && caster === p && i === inst) casts++;
    return ok;
  };

  // THE GATEKEEPER: whatever a cast spends or waits on (a damage pool, a
  // gauge, a charge bank, a thirst for missing life) is kept ready, at the
  // cooldown cap's pace, so the loop shows the skill rather than its bar.
  let refillAt = -9;
  const keep = (i: SkillInstance | null): void => {
    if (!i || t - refillAt < SHOWCASE_CFG.cooldownCap) return;
    const d = i.def;
    let filled = false;
    if (d.pool) {
      const want = Math.max(d.pool.min ?? 1, 1) * 4;
      if ((p.pools.get(d.pool.id) ?? 0) < want) { p.pools.set(d.pool.id, want); filled = true; }
    }
    if (d.gauge) {
      const eff = p.gaugeEff(i);
      if (eff) {
        const st = (i.state ??= {});
        if ((st.gauge ?? 0) < eff.need) { st.gauge = eff.need; filled = true; }
        if ((st.gaugeLock ?? 0) > SHOWCASE_CFG.cooldownCap) st.gaugeLock = SHOWCASE_CFG.cooldownCap;
      }
    }
    const cc = d.chargeCost;
    if (cc?.charge) {
      const need = cc.amount === 'all' ? Math.max(cc.minimum ?? 0, 3) : Math.max(cc.amount ?? 1, cc.minimum ?? 0);
      if ((p.charges.get(cc.charge) ?? 0) < need) { p.charges.set(cc.charge, need); filled = true; }
    }
    const g = p.unmetGate(i);
    if (g?.charge) { p.charges.set(g.charge.id, Math.max(g.charge.amount, p.charges.get(g.charge.id) ?? 0)); filled = true; }
    if (g?.missing) {
      p.life = Math.min(p.life, p.maxLife() * 0.5);
      p.mana = Math.min(p.mana, p.availableMaxMana() * 0.5);
      filled = true;
    }
    // an answering art (GateSpec.recentDamage): the wound clock reads fresh
    if (g?.recentDamage) { p.recentHurt = 0; filled = true; }
    if (filled) refillAt = t;
  };

  // Keep the dummies whole (no life bars flicker), keep a required status on
  // them, and walk a shoved dummy slowly back to its post once the shove is
  // spent. The ally stays wounded so a heal always has work.
  const posts = dummies.map(m => ({ x: m.pos.x, y: m.pos.y, lx: m.pos.x, ly: m.pos.y }));
  let layAt = 0;
  const upkeep = (dt: number): void => {
    dummies.forEach((m, k) => {
      if (m.dead) return;
      const max = m.maxLife();
      if (m.life < max) { dealt += max - m.life; m.life = max; }
      if (plan.keepStatus && !m.statuses.some(s => s.id === plan.keepStatus)) {
        try { m.applyStatus(plan.keepStatus, 0, 3, 'The Stage'); } catch { /* a status the body refuses */ }
      }
      const post = posts[k], moved = Math.hypot(m.pos.x - post.lx, m.pos.y - post.ly);
      const off = Math.hypot(m.pos.x - post.x, m.pos.y - post.y);
      if (moved < 0.5 && off > 2) {
        const step = Math.min(off, 70 * dt) / off;
        m.pos.x += (post.x - m.pos.x) * step; m.pos.y += (post.y - m.pos.y) * step;
      }
      post.lx = m.pos.x; post.ly = m.pos.y;
    });
    keep(inst); keep(prepInst);
    if (ally && !ally.dead && ally.life >= ally.maxLife() * 0.98) ally.life = ally.maxLife() * 0.4;
    if (graves.length && (layAt += dt) >= 0.6) { layAt = 0; lay(); }
  };

  const capCooldowns = (): void => {
    for (const i of [inst, prepInst]) {
      if (!i) continue;
      const cd = p.cooldowns.get(i.def.id);
      if (cd !== undefined && cd > SHOWCASE_CFG.cooldownCap) p.cooldowns.set(i.def.id, SHOWCASE_CFG.cooldownCap);
    }
  };

  return {
    plan, world, focus, span: plan.span,
    get t() { return t; },
    tick(dt: number): void {
      capCooldowns();
      world.applyInputs(new Map([[seatId, direct()]]), dt);
      if (!world.gameOver) for (const a of world.actors) updateAI(a, world, dt);
      world.update(dt);
      upkeep(dt);
      t += dt;
    },
    report(): StageReport {
      let why: string | null = null;
      if (!casts) {
        try { why = world.castReqRefusal(p, inst) ?? (world.skillUsable(p, inst) ? null : 'unusable') ?? (p.unmetGate(inst) ? 'gate' : null) ?? 'no cast'; }
        catch (e) { why = 'probe failed: ' + (e instanceof Error ? e.message : String(e)); }
      }
      return {
        casts, dealt: Math.round(dealt), why,
        statuses: foes.reduce((n, d) => n + d.statuses.length, 0),
        actors: world.actors.length,
      };
    },
  };
}

