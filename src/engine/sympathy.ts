// ============================================================================
// THE SYMPATHY FABRIC — gains echo to kin, as data.
//
// When an actor GAINS something — a flask pour, a scooped resource orb, a
// charge, a buff, a direct heal — registered SYMPATHY LINKS replicate a
// scaled copy of that gain onto RELATED actors: tamed companions, minions,
// the owner, party seats, nearby allies or NPCs, even enemies (the tradeoff
// lane). Think of a party-wide charge-sharing keystone, a tamer whose beasts
// drink when they drink, a den matron whose swig waters her whole pack — all
// the same fabric, all plain link defs.
//
// HOW IT RIDES THE ENGINE (no new pipelines):
//  - Events are the existing per-frame GAIN-EVENT sweep (Actor.gainEvents →
//    World.echoSympathy beside rollGainProcs). The event's CHAIN DEPTH is
//    the loop discipline: only sources at depth ≤ maxSourceDepth (+ the
//    holder's `sympathyDepth` stat) echo, and every echoed application lands
//    one link DEEPER — an echo never re-echoes unless a stat explicitly buys
//    the next rung. Structurally loop-free.
//  - Echo application goes through THE canonical gates only: healBy /
//    restore streams / gainCharge / addBuff — heal reduction, charge caps,
//    buff stacking rules all apply to the copy exactly as to an original.
//
// WHO HOLDS A LINK (all data, no bespoke wiring):
//  - The `sympathy_<linkId>` STAT FAMILY is the grant surface: passives,
//    affixes, statuses, SkillDef.equipMods (bar-slotted — the tame-bond
//    lane), and SUPPORT GEMS (skill-local mods; the event sweep scans the
//    holder's bar with each instance's own context, so a gem socketed into
//    Tame Beast subscribes its host's owner). Stat value = POTENCY: it
//    multiplies the link's scale; 0/absent = dormant.
//  - `MonsterDef.sympathy: string[]` stamps links onto monsters at creation
//    (folded as sympathy stats — the den-matron lane).
//
// DIRECTION IS DATA: `from` names whose gain the holder is listening to
// (default 'self'); `to` names the recipients — both drawn from the same
// open RELATION vocabulary. "My flask feeds my beasts" is from:'self' →
// to:['companions']; "when my beast is mended, so am I" is
// from:'companions' → to:['self'] — one def apart, zero engine edits.
//
// Docs: docs/engine/sympathy.md
// ============================================================================

import type { Actor } from './actor';
import type { World } from './world';
import type { SkillTag } from './stats';
import { dist } from '../core/math';

/** What KIND of gain a link can echo. Each channel replays through its
 *  canonical gate (see World.applySympathyEcho):
 *   'restore' — flask/fount POUR STREAMS (startRestoreStream): the recipient
 *               gets their own stream, same window, scaled total.
 *   'heal'    — direct heals (applyHeal, landed > 0): healBy on the copy.
 *   'charge'  — banked charges (gainCharge): the copy banks the same count
 *               against the charge's registry baseCap (+ recipient's own
 *               chargeCap_<id>); scale gates but never fractions a quantum.
 *   'buff'    — buff applications (addBuff): the copy wears the same
 *               BuffEffect, duration × scale.
 *   'orb'     — resource-orb pours (pourOrb): the orb's restore/charge
 *               payload replays at scale. */
export type SympathyChannel = 'restore' | 'heal' | 'charge' | 'buff' | 'orb';

/** The RELATION vocabulary — who counts as kin, relative to a link holder.
 *  Used on both faces of a link (`from` listens, `to` receives). Open:
 *  register new kinds via registerSympathyRelation. */
export type SympathyRelation =
  | 'self'        // the holder
  | 'owner'       // the holder's keeper (a pet listening to/feeding its tamer)
  | 'companions'  // TAMED beasts (Actor.companion) owned by the holder
  | 'minions'     // owned non-companion minions
  | 'party'       // other live seats (co-op partners, mercenaries)
  | 'allies'      // anything on the holder's team (radius required)
  | 'npcs'        // friendly actors with an npcRole (radius required)
  | 'pack'        // same team + same faction, unowned (radius required)
  | 'enemies'     // the hostile pool (radius required — the tradeoff lane)
  | 'bondmates';  // the holder's active bond pair (Actor.bond)

export interface SympathyLinkDef {
  id: string;
  /** Shown in float text / tooltips. */
  label: string;
  /** Whose GAIN the holder listens to (default 'self'). Only relations the
   *  event sweep can reach cheaply may listen: self, companions, minions,
   *  party, owner (the gainer's owner/seat-mates are consulted per event —
   *  broad kinds like 'allies' would mean scanning every actor's sheet on
   *  every gain and are refused by the validator). */
  from?: SympathyRelation;
  channels: SympathyChannel[];
  /** Recipients, relative to the HOLDER. Duplicates collapse; the gaining
   *  actor never receives its own echo. */
  to: SympathyRelation[];
  /** Echo magnitude as a fraction of the original (default SYMPATHY_CFG
   *  .scale), multiplied by the holder's sympathy_<id> stat (POTENCY).
   *  Charges treat scale > 0 as a gate (quanta never fraction). */
  scale?: number;
  /** Max distance between the GAINER and a recipient. Omitted = zone-wide
   *  (right for owner/pet bonds — the leash is the relation itself).
   *  Required for the broad relations (allies/npcs/pack/enemies). */
  radius?: number;
  /** Max recipients per echo, nearest-to-the-gainer first
   *  (default SYMPATHY_CFG.cap). */
  cap?: number;
  /** Only echo gains whose source skill carries ALL of these tags
   *  (e.g. ['flask'] — the bond drinks only what's drunk). */
  tags?: SkillTag[];
  /** Fine filters: only these charge ids / buff ids / orb kinds echo. */
  chargeIds?: string[];
  buffIds?: string[];
  orbKinds?: string[];
  /** Float-text tint for the echo (default a soft sympathetic blue). */
  color?: string;
}

/** Fabric-wide dials (a link def overrides per-link where a field exists). */
export const SYMPATHY_CFG = {
  /** Events deeper than this never echo (0 = only real play echoes; the
   *  holder's `sympathyDepth` stat buys extra rungs, procDepth-style). */
  maxSourceDepth: 0,
  /** Default echo fraction when a link names none. */
  scale: 1,
  /** Default recipient cap when a link names none. */
  cap: 8,
  /** Echoes reach DOWNED companions (they cannot act on most gains and the
   *  revive dwell is the intended way back — off by default). */
  reachDowned: false,
  /** Float a small label on recipients of visible channels
   *  (restore/heal/orb; charge and buff already show on pips and bars). */
  text: true,
};

// --- The registries ---------------------------------------------------------

export const SYMPATHY_LINKS: Record<string, SympathyLinkDef> = {};

export function registerSympathyLink(def: SympathyLinkDef): void {
  SYMPATHY_LINKS[def.id] = def;
}

/** The stat that grants (and scales) a link: `sympathy_<linkId>`. */
export function sympathyStat(linkId: string): string {
  return 'sympathy_' + linkId;
}

/** Runtime predicates the engine wires at boot (world module scope) so this
 *  module never imports data registries — the registerConvertRule pattern. */
export const SYMPATHY_HOOKS = {
  /** Is this actor a friendly NPC (npcRole)? World assigns the real read. */
  isNpc: (_a: Actor) => false,
};

// --- Relation resolution -----------------------------------------------------

/** The relation OTHER holds toward HOLDER, restricted to the kinds a link's
 *  `from` may listen to (see SympathyLinkDef.from). Most specific wins:
 *  a tamed beast is 'companions', never merely 'minions'. */
export function sympathyRelationOf(holder: Actor, other: Actor, w: World): SympathyRelation | null {
  if (holder === other) return 'self';
  if (other.owner === holder) return other.companion ? 'companions' : 'minions';
  if (holder.owner === other) return 'owner';
  if (w.seats.some(s => s.actor === holder) && w.seats.some(s => s.actor === other)) return 'party';
  return null;
}

/** `from` kinds the per-event holder set can actually reach (the gainer, its
 *  owner, the seats). The validator refuses broader listeners. */
export const SYMPATHY_LISTENABLE: readonly SympathyRelation[] =
  ['self', 'owner', 'companions', 'minions', 'party'];

/** Relations that MUST carry a link radius (unbounded would mean zone-wide
 *  broadcast over the whole actor list). */
export const SYMPATHY_RADIUS_REQUIRED: readonly SympathyRelation[] =
  ['allies', 'npcs', 'pack', 'enemies'];

type RelationGather = (w: World, holder: Actor) => Actor[];

/** One gatherer per relation kind — an OPEN registry: a new kind of kinship
 *  is one entry here plus the union member. Gatherers return candidates;
 *  the echo path applies the dead/downed/self/radius/cap discipline. */
export const SYMPATHY_RELATIONS: Record<SympathyRelation, RelationGather> = {
  self: (_w, holder) => [holder],
  owner: (_w, holder) => (holder.owner ? [holder.owner] : []),
  companions: (w, holder) =>
    w.actors.filter(a => a.companion && a.owner === holder),
  minions: (w, holder) =>
    w.actors.filter(a => !a.companion && a.owner === holder),
  party: (w, holder) =>
    w.seats.filter(s => s.actor !== holder).map(s => s.actor),
  allies: (w, holder) =>
    w.actors.filter(a => a !== holder && a.team === holder.team && !a.passive),
  npcs: (w, holder) =>
    w.actors.filter(a => a !== holder && a.team === holder.team && SYMPATHY_HOOKS.isNpc(a)),
  pack: (w, holder) =>
    w.actors.filter(a => a !== holder && a.team === holder.team
      && !a.owner && a.faction !== undefined && a.faction === holder.faction),
  enemies: (w, holder) => w.enemiesOf(holder),
  bondmates: (w, holder) => {
    if (!holder.bond) return [];
    const mate = w.actors.find(a => a.id === holder.bond!.targetId && !a.dead);
    return mate ? [mate] : [];
  },
};

export function registerSympathyRelation(kind: string, gather: RelationGather): void {
  (SYMPATHY_RELATIONS as Record<string, RelationGather>)[kind] = gather;
}

/** Resolve a link's recipients for one echo: gather every `to` relation from
 *  the holder, dedup, drop the gainer itself and the dead (downed unless the
 *  fabric allows), clamp to the link radius around the GAINER (the echo
 *  travels from the event), nearest-to-the-gainer first, capped. */
export function gatherSympathyRecipients(
  w: World, holder: Actor, link: SympathyLinkDef, gainer: Actor,
): Actor[] {
  const seen = new Set<Actor>();
  const out: Actor[] = [];
  for (const kind of link.to) {
    const gather = SYMPATHY_RELATIONS[kind];
    if (!gather) continue;
    for (const a of gather(w, holder)) {
      if (seen.has(a)) continue;
      seen.add(a);
      if (a === gainer || a.dead) continue;
      if (a.downed && !SYMPATHY_CFG.reachDowned) continue;
      if (link.radius !== undefined && dist(gainer.pos, a.pos) > link.radius) continue;
      out.push(a);
    }
  }
  out.sort((a, b) => dist(gainer.pos, a.pos) - dist(gainer.pos, b.pos));
  const cap = link.cap ?? SYMPATHY_CFG.cap;
  return out.length > cap ? out.slice(0, cap) : out;
}
