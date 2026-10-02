// ---------------------------------------------------------------------------
// THE KIT READ — what each bar slot is FOR, derived from the skill instance's
// own resolved data (delivery, cast mode, targeting, tags, AI hint), never a
// per-skill table: a new skill is read the day it is authored. Pure, cheap,
// cached by the instance's identity by the caller. Contract:
// docs/engine/agent.md.
// ---------------------------------------------------------------------------

import { AGENT_CFG, type AgentRole } from '../data/agent';
import type { Actor } from '../engine/actor';
import {
  instanceCastMode, instanceDelivery, instanceTargeting, instanceTrigger,
  type SkillInstance,
} from '../engine/skills';

/** How the hand presses a slot. tap: press once per use; hold: keep it down
 *  (repeats, channels, guards); charge: hold until the bar is full, then
 *  release; toggle: one press flips it; timing: press, then press again in
 *  the window (perfect / timed / multitude). */
export type AgentPlay = 'tap' | 'hold' | 'charge' | 'toggle' | 'timing';

/** Where a press of this slot should aim. */
export type AgentAim = 'foe' | 'cluster' | 'self' | 'corpse' | 'ally' | 'travel';

export interface KitSlot {
  slot: number;
  inst: SkillInstance;
  id: string;
  role: AgentRole;
  play: AgentPlay;
  aim: AgentAim;
  /** How far from the caster the effect can land (world units). */
  reach: number;
  /** The footprint it covers where it lands (0 = one body / one line). */
  area: number;
  /** True for skills that cost no hand (trigger-socketed: never pressed). */
  passive: boolean;
  /** A reflex press (flasks): fires through casts without disturbing them. */
  reflex: boolean;
  /** The skill refuses a press while life is full (GateSpec.missing). */
  thirst: boolean;
  /** Deals damage (has a hit, a DoT, or a damaging minion). */
  damaging: boolean;
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Read one slot. */
export function readSlot(slot: number, inst: SkillInstance): KitSlot {
  const def = inst.def;
  const d = instanceDelivery(inst) as unknown as Record<string, unknown>;
  const type = String(d.type);
  const tags: readonly string[] = def.tags;
  const mode = instanceCastMode(inst);
  const tgt = instanceTargeting(inst) as unknown as Record<string, unknown> | undefined;
  const aiRange = num(def.ai?.range);
  const castRange = num(tgt?.castRange);
  const radius = num(d.radius) + num(d.grow);

  let role: AgentRole;
  let aim: AgentAim = 'foe';
  let reach = aiRange || castRange || num(d.range) || AGENT_CFG.defaultReach;
  let area = 0;
  switch (type) {
    case 'melee': case 'cone':
      role = 'strike';
      reach = num(d.range) || num(d.length) || aiRange || 70;
      area = type === 'cone' ? Math.max(30, reach * 0.5) : 0;
      break;
    case 'nova':
      role = 'nova'; aim = 'self';
      reach = radius || aiRange || 120; area = reach;
      break;
    case 'aura':
      role = 'aura'; aim = 'self'; reach = radius || 200; area = reach;
      break;
    case 'self':
      role = tags.includes('heal') || /flask/.test(def.id) ? 'heal' : 'buff';
      aim = 'self'; reach = radius || 0; area = radius;
      break;
    case 'ground': case 'storm': case 'detonate':
      role = 'area'; aim = num(d.castRange) === 0 && type === 'ground' && !castRange ? 'self' : 'cluster';
      area = radius || num(d.spread) || AGENT_CFG.defaultArea;
      if (aim === 'self') reach = area;
      break;
    case 'dash': case 'leap': case 'blink': case 'carom':
      reach = num(d.distance) || num(d.range) || aiRange || 240;
      area = radius;
      // A travelling blow (a dash strike, a leap slam) is an attack that
      // moves the body: aimed at the foe, scored like a strike at its reach.
      if (d.damage || tags.includes('attack') || (tags.includes('spell') && !!d.radius)) { role = 'strike'; aim = 'foe'; }
      else { role = 'move'; aim = 'travel'; }
      break;
    case 'summon':
      role = 'summon'; aim = 'cluster'; reach = aiRange || 200;
      break;
    case 'construct':
      role = 'construct';
      aim = d.kind === 'trap' || d.kind === 'mine' ? 'cluster' : 'foe';
      reach = aiRange || 220; area = num(d.range) || 80;
      break;
    default: // projectile, target, mark, detonateProjectile…
      role = 'shot';
      area = radius;
      break;
  }
  if (tgt?.target === 'corpse') aim = 'corpse';
  else if (tgt?.target === 'ally') { aim = 'ally'; role = role === 'shot' ? 'heal' : role; }
  if (def.ultimate) role = 'ultimate';

  let play: AgentPlay = 'tap';
  if (type === 'aura' && d.mode === 'toggle') play = 'toggle';
  else if (mode === 'channel' || mode === 'guard' || mode === 'overcharge' || mode === 'concentration' || def.concentration) play = 'hold';
  else if (mode === 'charge') play = 'charge';
  else if (mode === 'perfect' || mode === 'timed' || mode === 'multitude') play = 'timing';

  const damaging = !!(d.damage || d.dot || (d as { minion?: unknown }).minion || type === 'summon' || tags.includes('attack')
    || tags.includes('spell') && role !== 'buff' && role !== 'heal' && role !== 'aura');
  return {
    slot, inst, id: def.id, role, play, aim, reach, area,
    passive: !!instanceTrigger(inst),
    reflex: !!def.reflex,
    thirst: !!def.gate?.missing,
    damaging,
  };
}

/** Read the whole bar (null slots skipped). */
export function readKit(actor: Actor): KitSlot[] {
  const out: KitSlot[] = [];
  actor.skills.forEach((inst, i) => { if (inst) out.push(readSlot(i, inst)); });
  return out;
}
