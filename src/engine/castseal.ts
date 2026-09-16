// ---------------------------------------------------------------------------
// THE CAST SEAL — a ground's law over what may be CAST on it, as data.
//
// Her ask (2026-09-16): the wisp in Mu could swing THE UNARMED FLOOR — an
// empty slot's improvised strike, arriving through the one cast pipeline
// exactly as designed — and a hub where the only act is choosing a vessel
// must not answer a button as if there were something else to do. The fix
// is a LAW OF THE GROUND, never a hard-coded Mu lockout: `ZoneDef.castSeal`
// (the spoils law's shape — one optional row on a zone, stamped by whoever
// mints it: a scene's SceneZoneSpec through sealStageZone, an authored
// pocket's def literal, a future tileset roll) resolved by ONE pure fold
// here and ONE World read (`World.castSealed`) that the press (useSkill's
// first word), the bar (skillUsable), the AI (pressUsable), the trigger
// artery and the replenishment sweep all share — so the button, the grey
// slot and the brain never disagree about what the ground allows.
//
// THE VOCABULARY (every field optional — `{}` is a whole seal):
//   mode   'shut' (default: a SEAL — nothing casts but what `open` names)
//          | 'open' (a ground that forbids only what `shut` names).
//   open   CastMatch — casts that stay OPEN under a shut ground.
//   shut   CastMatch — casts that are SHUT under an open ground.
//   binds  'all' (default — THE SAME DOOR: every caster through the one
//          pipeline, monsters and minions included) | 'seats' (player-kind
//          bodies only; the wild keeps its kit).
//   line   the refusal a SEAT's press hears (rate-limited, the failNote
//          lane — R-axis precision: a reason, never a caption). Omitted =
//          SILENT: the ground simply does not answer — Mu's word, where a
//          spoken refusal would itself imply there was something to do.
//
// A CastMatch names casts three ways, any-of: `ids` (skill ids — a minted
// meta/convert face also answers to its HOST's id through hostSkillId, so a
// row naming the bar entry opens what its press becomes), `tags` (the
// skill's context tags — registry-folded, so 'construct'/'conjure' work),
// and `laws` — REGISTERED PREDICATES (`registerCastLaw`) evaluated LIVE at
// every read, the open seam for what no list can name ("only while a vessel
// is engaged", "only the keeper's own companion arts"). THE HARD LOCK: a
// `shut` row that matches beats an `open` row that also matches (the
// skill-tree `excludes` precedent). Unknown ids and unregistered laws match
// nothing and are named by `castSealIssues` at content validation.
//
// Built-in law: 'reflex' — the caster's reflex lane (flasks and every
// `reflex`-granted instant); a ground that wants "no fighting, but drink"
// writes `open: { laws: ['reflex'] }`. Registered here so the vocabulary
// ships with one honest entry; nothing wears it by default.
//
// Docs: docs/engine/castseal.md. Probe: balance/probe_mu.ts B7–B19.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import type { SkillTag } from './stats';
import { skillContextTags, type SkillInstance } from './skills';
import type { World } from './world';

/** What a registered cast law reads — the live world, the body pressing,
 *  the instance it would cast, and whether that body is a player-kind SEAT
 *  (`World.seatOf`): the body a `binds: 'seats'` seal reaches. */
export interface CastLawCtx {
  world: World;
  caster: Actor;
  inst: SkillInstance;
  seated: boolean;
}

/** A registered predicate a seal's `laws` row may name — evaluated at every
 *  read, so a seal can open or shut on live state no list could name. */
export type CastLaw = (ctx: CastLawCtx) => boolean;

/** Which casts a row names (any-of across the three lanes). */
export interface CastMatch {
  /** Skill ids; a minted meta/convert face also answers to its host's id. */
  ids?: readonly string[];
  /** Skill context tags (registry-folded — 'construct' and 'conjure' work). */
  tags?: readonly SkillTag[];
  /** Registered cast-law ids (`registerCastLaw`). */
  laws?: readonly string[];
}

/** THE CAST SEAL — one optional row on a zone (`ZoneDef.castSeal`). */
export interface CastSealSpec {
  /** Default verdict for a cast no row names: 'shut' (a seal) or 'open'. */
  mode?: 'shut' | 'open';
  /** Casts that stay OPEN under a shut ground. */
  open?: CastMatch;
  /** Casts that are SHUT under an open ground — THE HARD LOCK, wins ties. */
  shut?: CastMatch;
  /** Who the seal binds: every caster (default) or player-kind seats only. */
  binds?: 'all' | 'seats';
  /** The refusal a seat's press hears; omitted = silent. */
  line?: string;
}

const CAST_LAWS = new Map<string, CastLaw>();

/** Register a cast law by id (re-registering replaces — the workshop idiom). */
export function registerCastLaw(id: string, law: CastLaw): void {
  CAST_LAWS.set(id, law);
}

/** Is a law id registered? (Validation and the probes read it.) */
export function castLawKnown(id: string): boolean {
  return CAST_LAWS.has(id);
}

/** Every registered law id, for census and validation prints. */
export function castLawIds(): string[] {
  return [...CAST_LAWS.keys()];
}

/** Does a row name this cast? Any lane may claim it. */
export function castMatches(m: CastMatch | undefined, ctx: CastLawCtx): boolean {
  if (!m) return false;
  const def = ctx.inst.def;
  if (m.ids && (m.ids.includes(def.id)
    || (ctx.inst.hostSkillId !== undefined && m.ids.includes(ctx.inst.hostSkillId)))) return true;
  if (m.tags && m.tags.length) {
    const tags = skillContextTags(ctx.inst);
    for (const t of m.tags) if (tags.has(t)) return true;
  }
  if (m.laws) {
    for (const id of m.laws) {
      const law = CAST_LAWS.get(id);
      if (law && law(ctx)) return true;
    }
  }
  return false;
}

/** THE ONE FOLD: does this seal hold the cast SHUT? Pure — the World read
 *  (`World.castSealed`) supplies the context and returns the seal itself. */
export function castSealShuts(spec: CastSealSpec, ctx: CastLawCtx): boolean {
  if ((spec.binds ?? 'all') === 'seats' && !ctx.seated) return false;
  if (castMatches(spec.shut, ctx)) return true; // THE HARD LOCK
  if (castMatches(spec.open, ctx)) return false;
  return (spec.mode ?? 'shut') === 'shut';
}

/** Content-validation lint: rows naming no skill or no registered law would
 *  seal or open nothing they meant to, silently — name them. */
export function castSealIssues(spec: CastSealSpec, skillKnown: (id: string) => boolean): string[] {
  const out: string[] = [];
  const rows: ReadonlyArray<readonly [string, CastMatch | undefined]> = [['open', spec.open], ['shut', spec.shut]];
  for (const [row, m] of rows) {
    if (!m) continue;
    for (const id of m.ids ?? []) if (!skillKnown(id)) out.push(`${row}.ids names no skill '${id}'`);
    for (const id of m.laws ?? []) if (!CAST_LAWS.has(id)) out.push(`${row}.laws names no registered law '${id}'`);
  }
  if (spec.mode === 'open' && !spec.shut) out.push("mode 'open' with no shut row seals nothing — drop the seal");
  return out;
}

// The one built-in law: the caster's reflex lane ("flasks are never locked
// out" is the REFLEX fabric's own doctrine; a ground opts into it by name).
registerCastLaw('reflex', ctx => ctx.caster.isReflex(ctx.inst));
