// ---------------------------------------------------------------------------
// THE MIMICRY FABRIC — bestiary-gated capture of enemy arts (the blue mage).
//
// Every monster skill is already an ordinary catalog SkillDef fired through
// the ONE useSkill pipeline, so stolen casts need no second pipeline — only
// a CAPTURE BANK, a SLOT, and POLICY, all data:
//   · CAPTURE: an enemy art that HITS a watching seat (World.resolveHit) —
//     or, with the mimicWitness lever, one merely SEEN cast nearby
//     (World.executeSkill) — enters the actor's bank, distinct by skill id,
//     capped, oldest-out. Knowledge gates the theft: only kinds studied to
//     MIMIC_CFG.studyGroup in the bestiary teach. The 'arts' tier is where
//     the book reveals a monster's moveset — the gate and the reveal are
//     the same fact: you can only steal what you UNDERSTAND.
//   · THE SLOT: a skill wearing SkillDef.mimic. Pressing it casts the
//     SELECTED captured art — minted at the slot's effective level with the
//     power factor stamped as instance extraMods (the meta/convert idiom;
//     World.useSkill redirects, slotFaceOf presents the captured face, and
//     the slot's sockets ride the face under ordinary tag admission).
//     Minted casts run the whole pipeline, so the cast ring records the
//     art's REAL tags (combo grammars hear stolen casts for free) and the
//     art's own cooldown paces it.
//   · POLICY: per-skill SkillDef.mimicable is the explicit allow/deny lane;
//     unset falls to the MIMIC_CFG tag/delivery/effect defaults. STRUCTURAL
//     refusals (a mimic slot, an invocation bank, a throng anchor) hold even
//     against an explicit allow — those skills are entangled with state the
//     stolen face cannot carry.
//
// The bank is combat-transient RAMP state (the castRing law): null until the
// first capture, cold on a fresh session, never saved. Non-mimic builds pay
// one throttled cached check per landed hit (the comboWatch idiom) and
// nothing else. Docs in docs/engine/mimicry.md; probe balance/probe_mimic.ts.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import { instanceMods, skillContextTags, type SkillDef, type SkillInstance } from './skills';
import { mod, type Modifier, type SkillTag } from './stats';
import { MONSTERS } from '../data/monsters';
import { bestiaryReveals } from '../data/bestiary';
import type { Account } from '../meta/account';

export const MIMIC_CFG = {
  /** Bestiary reveal group (BESTIARY_CFG.revealTiers) a kind must have
   *  reached before its arts can be captured — the knowledge gate. */
  studyGroup: 'arts',
  /** Base distinct arts the bank holds (+ the mimicBank stat, read off the
   *  slot — supports/passives widen the repertoire). Oldest-out past cap. */
  bankSize: 4,
  /** Seconds a captured art stays castable (0 = the whole session — the
   *  bank is already ramp state; a finite clock makes theft frantic). */
  expirySec: 0,
  /** MORE damage multiplier on mimic casts — THE balance lever over the
   *  whole stolen pool (SkillDef.mimic.powerFactor overrides per slot;
   *  sweep the captured pool via `npm run sim -- sweep skills`, whose
   *  rankings scale uniformly by this factor). */
  powerFactor: 0.85,
  /** Witness-lane reach at mimicWitness 1.0 (the stat scales it): studied
   *  arts CAST within this range of a watching seat — sight required —
   *  are captured without the blow. 0 stat = hit-capture only. */
  witnessRadius: 460,
  /** Seconds between cached has-a-mimic-slot re-evaluations at the capture
   *  sites (the comboWatch cadence): slotting Mimicry reaches the bank
   *  within a beat, and everyone else pays one cached boolean per hit. */
  watchRefresh: 1,
  /** TAG-DEFAULT policy: unset `mimicable` refuses skills carrying ANY of
   *  these. Summons steal poorly (the power factor scales damage, never
   *  bodies) — open one deliberately with `mimicable: true`. */
  denyTags: ['summon', 'minion'] as SkillTag[],
  /** Delivery-shape refusals (same unset-policy lane as denyTags). */
  denyDeliveries: ['summon'] as string[],
  /** Effect-shape refusals: arts that command a kit the thief lacks. */
  denyEffects: ['minionCast', 'commandMinions', 'recallMinions', 'tame',
    'whistleCompanion', 'detonateMinions'] as string[],
};

/** One captured art: the skill, the kind that taught it (its face — the
 *  portrait chip wears the SOURCE monster), and the capture clock. */
export interface MimicEntry {
  sid: string;
  src: string;
  at: number;
}

/** The narrow world surface capture needs — keeps the fabric testable and
 *  the dependency honest (the TrapHost idiom). */
export interface MimicHost {
  time: number;
  account: Account;
}

// --- policy ----------------------------------------------------------------

/** STRUCTURAL refusals — entangled skills no stolen face can carry. These
 *  hold even against an explicit `mimicable: true`. */
function mimicStructuralDeny(def: SkillDef): boolean {
  return !!def.mimic || !!def.invokes || !!def.throng
    || def.delivery.type === 'summon' && !!def.delivery.grimoire;
}

const mimicableCache = new WeakMap<SkillDef, boolean>();

/** May this art be captured? Explicit `mimicable` wins over the tag/
 *  delivery/effect defaults; structural refusals win over everything. */
export function skillMimicable(def: SkillDef): boolean {
  const hit = mimicableCache.get(def);
  if (hit !== undefined) return hit;
  let ok: boolean;
  if (mimicStructuralDeny(def)) ok = false;
  else if (def.mimicable !== undefined) ok = def.mimicable;
  else {
    ok = !def.tags.some(t => MIMIC_CFG.denyTags.includes(t))
      && !MIMIC_CFG.denyDeliveries.includes(def.delivery.type)
      && !def.effects.some(e => MIMIC_CFG.denyEffects.includes(e.type));
  }
  mimicableCache.set(def, ok);
  return ok;
}

// --- the watch cache (null-cost for non-mimic builds) ----------------------

/** The actor's mimic SLOT, if one rides the bar. Cached on the actor and
 *  re-evaluated at most once per watchRefresh at the capture sites — the
 *  comboWatch idiom, so builds without the slot pay a boolean. */
export function mimicRefreshWatch(a: Actor, time: number): void {
  if (time - a.mimicWatchAt < MIMIC_CFG.watchRefresh && a.mimicWatchAt !== 0) return;
  a.mimicWatchAt = time;
  let slot: SkillInstance | null = null;
  for (const inst of a.skills) {
    if (inst?.def.mimic) { slot = inst; break; }
  }
  a.mimicWatch = !!slot;
  if (slot) {
    // The witness lever: a plain stat (passives, gear) or a support socketed
    // into the slot itself (instance mods) — value 1 = the config radius.
    const w = a.sheet.get('mimicWitness', skillContextTags(slot.def), instanceMods(slot));
    a.mimicWitnessR = w > 0 ? w * MIMIC_CFG.witnessRadius : 0;
  } else {
    a.mimicWitnessR = 0;
    // An unslotted mimic releases its bank — ramp state, never a leak
    // (the castRing rule). Re-slotting starts the study cold.
    if (a.mimicBank) { a.mimicBank = null; a.mimicSel = null; }
  }
}

// --- the bank --------------------------------------------------------------

/** Bank capacity: the config base + the mimicBank stat read off the slot
 *  (so Understudy-style supports widen the repertoire per-slot). */
export function mimicBankCap(a: Actor): number {
  let extra = 0;
  for (const inst of a.skills) {
    if (inst?.def.mimic) {
      extra = a.sheet.get('mimicBank', skillContextTags(inst.def), instanceMods(inst));
      break;
    }
  }
  return Math.max(1, Math.round(MIMIC_CFG.bankSize + extra));
}

/** Live entries, oldest first (expiry pruned in place when configured). */
export function mimicEntries(a: Actor, time: number): MimicEntry[] {
  const bank = a.mimicBank;
  if (!bank) return [];
  if (MIMIC_CFG.expirySec > 0) {
    for (let i = bank.length - 1; i >= 0; i--) {
      if (time - bank[i].at > MIMIC_CFG.expirySec) bank.splice(i, 1);
    }
    if (a.mimicSel && !bank.some(e => e.sid === a.mimicSel)) a.mimicSel = null;
  }
  return bank;
}

/** The selected art, self-healing: a missing selection falls to the NEWEST
 *  live capture (the freshest lesson is the default weapon). */
export function mimicSelected(a: Actor, time: number): MimicEntry | null {
  const live = mimicEntries(a, time);
  if (!live.length) return null;
  const sel = a.mimicSel ? live.find(e => e.sid === a.mimicSel) : undefined;
  if (sel) return sel;
  const newest = live[live.length - 1];
  a.mimicSel = newest.sid;
  return newest;
}

/** Select an art by id (UI chip / co-op intent) or CYCLE by step (the
 *  slot's meta press). Returns the now-selected entry, if any. */
export function mimicSelect(a: Actor, time: number, pick: string | number): MimicEntry | null {
  const live = mimicEntries(a, time);
  if (!live.length) return null;
  if (typeof pick === 'string') {
    const e = live.find(x => x.sid === pick);
    if (e) a.mimicSel = e.sid;
    return e ?? mimicSelected(a, time);
  }
  const cur = mimicSelected(a, time);
  const idx = cur ? live.findIndex(e => e.sid === cur.sid) : -1;
  const next = live[((idx + pick) % live.length + live.length) % live.length];
  a.mimicSel = next.sid;
  return next;
}

/**
 * Try to capture one art into the actor's bank. The caller has already
 * established the cheap frame facts (a watching seat, a hostile source);
 * this settles policy, the bestiary gate, dedupe and eviction. Returns
 * true only for a NEW capture (the caller's toast) — a re-hit of a known
 * art silently refreshes its clock and its face.
 */
export function mimicCapture(host: MimicHost, a: Actor, source: Actor, def: SkillDef): boolean {
  if (!skillMimicable(def)) return false;
  const kindId = source.defId;
  if (!kindId) return false;
  const kind = MONSTERS[kindId];
  if (!kind) return false;
  // THE KNOWLEDGE GATE: the book must already show this kind's moveset.
  if (!bestiaryReveals(host.account, kind, MIMIC_CFG.studyGroup)) return false;
  const bank = (a.mimicBank ??= []);
  const known = bank.find(e => e.sid === def.id);
  if (known) {
    known.at = host.time;
    known.src = kindId;
    return false;
  }
  const cap = mimicBankCap(a);
  while (bank.length >= cap) {
    // Oldest-out — but never the held selection while another can go.
    const idx = bank.findIndex(e => e.sid !== a.mimicSel);
    bank.splice(idx >= 0 ? idx : 0, 1);
  }
  bank.push({ sid: def.id, src: kindId, at: host.time });
  if (!a.mimicSel) a.mimicSel = def.id;
  return true;
}

// --- the cast stamp --------------------------------------------------------

/** The power factor as instance-local mods, stamped onto every minted mimic
 *  cast (idempotent assignment — the mint cache re-stamps freely). */
export function mimicPowerMods(spec: { powerFactor?: number } | undefined): Modifier[] {
  const factor = spec?.powerFactor ?? MIMIC_CFG.powerFactor;
  return factor === 1 ? [] : [mod('damage', 'more', factor - 1)];
}
