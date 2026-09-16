// ---------------------------------------------------------------------------
// THE COMPANION STANCES (engine half) — the standing order beneath every order.
//
// A stance is a COMMAND KIND the beast wears permanently: `Actor.standingOrder`
// is consulted by the AI pipeline exactly where an issued `aiCommand` would be,
// but only while NO issued order stands — so the Assault gem's meta, the
// Rallying Whistle's charge and a Pack Crescendo lunge all outrank it for their
// moment, and the stance resumes the instant they lapse (the order fabric's
// own expiry). Conduct handlers live in STANCE_CONDUCTS (open); the data rows
// (data/companionStances.ts) name one each. Three ship:
//   aggressive — fall through to the beast's own mind (the pre-stance reading,
//                byte for byte: nearest foe in sight, heel when none);
//   defensive  — answer only the KEEPER's fights: whatever wounded the keeper,
//                whatever the keeper wounded (the caster-side `lastFoeId` stamp
//                resolveHit lays beside the victim-side `aiHitById`), or
//                whatever bit the beast itself — nearest first, held until it
//                dies or leaves the leash around the keeper; otherwise heel;
//   passive    — heel, never strike of its own accord.
// The keeper's choice lives per bond skill on PlayerMeta.stances (saved,
// wired); the meta button on the tame skill shifts it (companion_stance — an
// honest cast, so cast procs and the meta CHAIN both see it), a rebindable
// action cycles every bond on the bar, and the meta button is CLICKABLE.
// Dials in COMPANION_STANCE_CFG. Docs: docs/design/tame-beast.md.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { World } from './world';
import type { CommandState } from './brain';
import type { SkillInstance } from './skills';
import { angleTo, dist } from '../core/math';
import { registerCommandKind, aiMoveToward, aiHeelRecall } from './ai';
import { registerMetaFace } from './skills';
import { sameStory } from './tiers';
import { COMPANION_STANCES, companionStanceIds, type CompanionStanceDef } from '../data/companionStances';

export const COMPANION_STANCE_CFG = {
  /** The stance a bond wears until the keeper shifts it. 'aggressive' is the
   *  pre-stance conduct byte for byte (every standing rig reads it). */
  default: 'aggressive',
  /** Heel tolerance around the keeper (the classic minion heel is 90px). */
  heelDist: 90,
  /** DEFENSIVE: how far from the KEEPER a quarry may stand (or be chased)
   *  before the beast drops it and heels — the bond's leash. */
  leash: 520,
  /** DEFENSIVE: seconds a landed blow on (or by) the keeper — or on the
   *  beast — counts as "the keeper's fight". A held quarry outlives the
   *  window; it is the FRESH answer that reads it. */
  engageWindow: 4,
  /** Every stance registers `<kindPrefix><id>` in COMMAND_KINDS. */
  kindPrefix: 'stance:',
  /** The stance-shift payload skill (data/companionSkills.ts). */
  skillId: 'companion_stance',
};

/** A conduct: one tick of the beast's own mind under a stance — the command
 *  kind's own contract ('consumed' skips the pipeline, an Actor aims it,
 *  undefined falls through unaimed; 'done' is meaningless for a standing
 *  order and reads as undefined). */
export type StanceConduct = (actor: Actor, world: World, cmd: CommandState, dt: number)
  => 'consumed' | 'done' | Actor | undefined;

/** The open conduct registry — a new way of minding = a new entry. */
export const STANCE_CONDUCTS: Record<string, StanceConduct> = {};
export function registerStanceConduct(id: string, conduct: StanceConduct): void {
  STANCE_CONDUCTS[id] = conduct;
  // A stance row naming this conduct may already exist (data before engine) —
  // (re)seat its command kind now.
  for (const s of Object.values(COMPANION_STANCES)) if (s.conduct === id) seatStanceKind(s);
}

export function stanceKindId(stanceId: string): string {
  return COMPANION_STANCE_CFG.kindPrefix + stanceId;
}

function seatStanceKind(s: CompanionStanceDef): void {
  const conduct = STANCE_CONDUCTS[s.conduct];
  if (!conduct) return;
  registerCommandKind({ id: stanceKindId(s.id), step: conduct });
}

/** The stance id a keeper holds for one bond skill — unknown/absent reads the
 *  default (a renamed row simply drops to it). */
export function companionStanceIdOf(stances: Record<string, string> | undefined, skillId: string): string {
  const id = stances?.[skillId];
  return id && COMPANION_STANCES[id] ? id : defaultStanceId();
}

export function defaultStanceId(): string {
  return COMPANION_STANCES[COMPANION_STANCE_CFG.default]
    ? COMPANION_STANCE_CFG.default : companionStanceIds()[0];
}

export function companionStanceDef(id: string): CompanionStanceDef {
  return COMPANION_STANCES[id] ?? COMPANION_STANCES[defaultStanceId()];
}

/** The stance after `id` in the shift cycle (wraps). */
export function nextStanceId(id: string): string {
  const ids = companionStanceIds();
  const i = ids.indexOf(id);
  return ids[(i + 1) % ids.length];
}

/** The standing order a beast wears for a stance — a command-shaped row that
 *  never expires; the AI reads it only while no issued order stands. */
export function standingOrderFor(stanceId: string): CommandState {
  return { kind: stanceKindId(stanceId), pos: { x: 0, y: 0 }, until: Infinity, autonomous: true };
}

/** The stance id a standing order encodes, or undefined for a non-stance order. */
export function stanceOfOrder(order: CommandState | undefined): string | undefined {
  if (!order || !order.kind.startsWith(COMPANION_STANCE_CFG.kindPrefix)) return undefined;
  const id = order.kind.slice(COMPANION_STANCE_CFG.kindPrefix.length);
  return COMPANION_STANCES[id] ? id : undefined;
}

/** Load/wire tolerance: keep only string → KNOWN stance entries. */
export function sanitizeCompanionStances(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof k === 'string' && typeof v === 'string' && COMPANION_STANCES[v]) out[k] = v;
  }
  return out;
}

// --- the conducts -----------------------------------------------------------

/** Heel to the keeper: the classic minion heel (tolerance, the stuck-recall
 *  teleport), with the beast's own lock dropped — a heeling beast holds no
 *  grudge. Always consumes the tick: no cast leaves a heeling body. */
function heel(actor: Actor, world: World, dt: number): 'consumed' {
  actor.aiTargetId = undefined;
  actor.aggroed = false;
  const owner = actor.owner;
  if (owner && !owner.dead && dist(actor.pos, owner.pos) > COMPANION_STANCE_CFG.heelDist) {
    if (aiHeelRecall(actor, world, dt)) return 'consumed';
    actor.facing = angleTo(actor.pos, owner.pos);
    aiMoveToward(actor, world, { x: owner.pos.x, y: owner.pos.y, tier: owner.tier }, dt);
  } else actor.lastProgress = undefined; // standing at heel is not being stuck
  return 'consumed';
}

/** A legal defensive quarry: alive, hostile, targetable, on the beast's
 *  story, within the leash of the KEEPER. */
function legalQuarry(actor: Actor, world: World, keeper: Actor, e: Actor | undefined): e is Actor {
  return !!e && !e.dead && !e.downed && !e.untargetable && !e.passive
    && e !== actor && e !== keeper && world.hostileTo(actor, e)
    && e.sheet.get('invisible') <= 0 && sameStory(actor, e)
    && dist(e.pos, keeper.pos) <= COMPANION_STANCE_CFG.leash;
}

/** DEFENSIVE's answer: the held quarry while it stays legal; else the nearest
 *  legal body among the keeper's assailant, the keeper's last-struck foe and
 *  the beast's own assailant, each read inside the engage window. */
function defensiveQuarry(actor: Actor, world: World, keeper: Actor): Actor | undefined {
  const held = actor.aiTargetId !== undefined ? world.actorById(actor.aiTargetId) : undefined;
  if (legalQuarry(actor, world, keeper, held)) return held;
  const win = COMPANION_STANCE_CFG.engageWindow;
  const recent = (at: number) => at >= 0 && world.time - at <= win;
  const ids: number[] = [];
  if (recent(keeper.aiHitAt)) ids.push(keeper.aiHitById);
  if (recent(keeper.lastFoeAt)) ids.push(keeper.lastFoeId);
  if (recent(actor.aiHitAt)) ids.push(actor.aiHitById);
  let best: Actor | undefined, bd = Infinity;
  for (const id of ids) {
    if (id < 0) continue;
    const e = world.actorById(id);
    if (!legalQuarry(actor, world, keeper, e)) continue;
    const d = dist(actor.pos, e.pos);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

registerStanceConduct('aggressive', () => undefined);
registerStanceConduct('passive', (actor, world, _cmd, dt) => heel(actor, world, dt));
registerStanceConduct('defensive', (actor, world, _cmd, dt) => {
  const keeper = actor.owner;
  if (!keeper || keeper.dead || keeper.downed) return heel(actor, world, dt);
  return defensiveQuarry(actor, world, keeper) ?? heel(actor, world, dt);
});
for (const s of Object.values(COMPANION_STANCES)) seatStanceKind(s);

// --- the HUD face -----------------------------------------------------------
// The meta button on a tame skill wears the CURRENT stance (the tell): glyph
// + label in the stance's own ink, read off the pressing seat's held choice.
registerMetaFace(COMPANION_STANCE_CFG.skillId, (world: World, caster: Actor, host: SkillInstance) => {
  const seat = world.seatOf(caster);
  const st = companionStanceDef(companionStanceIdOf(seat?.meta.stances, host.def.id));
  return { label: `${st.glyph} ${st.label}`, color: st.color };
});
