// ---------------------------------------------------------------------------
// THE RING AUDIT: a census of what each body's own kit can do from where its
// movement kernel makes it rest, plus the skills its kit can never make usable.
//
// It reads definitions only, so it runs in milliseconds and can gate every commit.
// balance/probe_ringaudit.ts holds it against balance/baselines/ring_audit.json, so
// a new body parked out of its own reach fails until someone looks at it, and the
// probe also walks a sample of bodies to prove these bands match what the kernels do.
// docs/design/npc-ai-direction.md is the plan this measures.
// ---------------------------------------------------------------------------

import { MONSTERS } from '../data/monsters';
import { SKILLS } from '../data/skills';
import { skillCanHurt } from '../engine/ai';
import { normalizeBrain, type MoveSpec } from '../engine/brain';
import type { SkillDef } from '../engine/skills';
import { tuneAilmentChance } from '../engine/status';

export { skillCanHurt };

/** Where a kernel makes a body rest, from its own numbers. Null: it holds no ring at all. */
export function restBand(style: string, spec: MoveSpec, keep: number, desired: number, reach = 0): [number, number] | null {
  switch (style) {
    case 'approach': return keep > 0 ? [keep * 0.65, keep] : [0, desired];
    case 'direct': { const stop = desired * (spec.closeFrac ?? 1); return [stop * 0.92, stop]; }
    case 'orbit': { const ring = spec.ring ?? Math.max(desired, 46); return [ring * 0.8, ring * 1.15]; }
    case 'slideCast': { const ring = spec.ring ?? (keep > 0 ? keep : reach > 0 ? Math.min(240, reach * 0.9) : 240); return [ring * 0.7, ring * 1.2]; }
    case 'holdRange': {
      if (spec.hold !== undefined) return [spec.hold, spec.hold * (spec.band?.[1] ?? 1.4)];
      const hold = reach > 0 ? Math.min(Math.max(keep, 380), reach * 0.9) : Math.max(keep, 380);
      const far = hold * (spec.band?.[1] ?? 1.4);
      return [hold, reach > 0 ? Math.min(far, reach * 0.95) : far];
    }
    // With a warband it hangs back on purpose (spec.hover). Alone, it fights.
    case 'hoverAllies': return restBand(spec.alone ?? 'approach', spec, keep, desired, reach);
    case 'charge': return [0, desired]; // the charge itself closes
    default: return null; // hitAndRun, backstab, weave, skitter, lurk, juke and so on
  }
}

/** The bands this body rests in: where its kit asks to stand, and, if that can ever
 *  release, where it stands once nothing asking for distance can fire. */
export function restBandsOf(id: string): [number, number][] {
  const def = MONSTERS[id];
  const kit = kitOf(def?.skills);
  const spec = normalizeBrain(def?.brain ?? {}).base.move ?? {};
  const style = spec.style ?? 'approach';
  const keep = Math.max(0, ...kit.map(s => s.ai!.keepDistance ?? 0));
  const minRange = kit.length ? Math.min(...kit.map(s => s.ai!.range)) : 40;
  const reach = Math.max(0, ...kit.filter(s => skillCanHurt(s) && !s.ai!.deployed).map(s => s.ai!.range));
  const open = restBand(style, spec, 0, Math.max(20, minRange * 0.8), reach);
  const held = restBand(style, spec, keep, keep > 0 ? keep : Math.max(20, minRange * 0.8), reach);
  return [held, open].filter((b): b is [number, number] => !!b);
}

export interface RingRow {
  id: string;
  kernel: string;
  band: [number, number];
  /** The body's damaging skills that cannot reach from the near edge of the band. */
  outOfReach: string[];
  /** Every damaging skill it has is out of reach, so it never fires from where it rests. */
  none: boolean;
}

export interface StrandedRow {
  monster: string;
  skill: string;
  /** What the target must already carry. */
  needs: string[];
}

export interface HeldRow {
  monster: string;
  keep: number;
  /** Which skill sets the ring, and the melee skills it holds out of reach. */
  keptBy: string;
  melee: string[];
}

export interface RingAudit {
  active: number;
  withLegs: number;
  ringKernels: number;
  rows: RingRow[];
  stranded: StrandedRow[];
  held: HeldRow[];
}

type Kit = SkillDef[];
const kitOf = (skills: readonly unknown[] | undefined): Kit =>
  (skills ?? []).map(s => (typeof s === 'string' ? SKILLS[s] : undefined)).filter((s): s is SkillDef => !!s?.ai);

/** Does another skill in this kit really put this status on a target? Its own payload
 *  cannot count, and the chance must be the tuned one: an authored 50% bleed is zero. */
function kitSupplies(kit: Kit, self: SkillDef, needs: readonly string[]): boolean {
  return kit.some(other => other !== self && other.effects.some(e =>
    e.type === 'status' && needs.includes(e.status) && tuneAilmentChance(e.status, e.chance ?? 1) > 0));
}

export function ringAudit(): RingAudit {
  const rows: RingRow[] = [];
  const stranded: StrandedRow[] = [];
  const held: HeldRow[] = [];
  let active = 0, withLegs = 0, ringKernels = 0;
  for (const [id, def] of Object.entries(MONSTERS)) {
    if (def.passive) continue;
    active++;
    const kit = kitOf(def.skills);
    for (const skill of kit) {
      const req = skill.targeting?.requiresStatus;
      const needs = !req ? [] : Array.isArray(req) ? req : [req];
      if (needs.length && skill.targeting?.target !== 'ally' && !kitSupplies(kit, skill, needs)) {
        stranded.push({ monster: id, skill: skill.id, needs: [...needs] });
      }
    }
    if (def.base?.moveSpeed === 0) continue;
    withLegs++;
    const spec = normalizeBrain(def.brain ?? {}).base.move ?? {};
    const style = spec.style ?? 'approach';
    let keep = 0, minRange = Infinity;
    let keptBy = '';
    for (const s of kit) {
      if ((s.ai!.keepDistance ?? 0) > keep) { keep = s.ai!.keepDistance!; keptBy = s.id; }
      minRange = Math.min(minRange, s.ai!.range);
    }
    if (minRange === Infinity) minRange = 40;
    const desired = keep > 0 ? keep : Math.max(20, minRange * 0.8);
    const melee = kit.filter(s => s.delivery.type === 'melee');
    // The ready ring opens whenever nothing asking for distance can fire, so only a skill
    // that can always fire holds a body out for good: no cooldown, no price, no target to find.
    const opens = !kit.some(s => (s.ai!.keepDistance ?? 0) > 0 && !s.cooldown && !s.manaCost
      && !s.chargeCost && !s.targeting?.requiresStatus && (s.targeting?.target ?? 'enemy') === 'enemy');
    if (keep > 0 && !opens && melee.length && melee.every(s => s.ai!.range < keep)) {
      held.push({ monster: id, keep, keptBy, melee: melee.map(s => s.id) });
    }
    const damaging = kit.filter(skillCanHurt);
    const reach = Math.max(0, ...damaging.filter(s => !s.ai!.deployed).map(s => s.ai!.range));
    const band = opens && keep > 0
      ? restBand(style, spec, 0, Math.max(20, minRange * 0.8), reach)
      : restBand(style, spec, keep, desired, reach);
    if (!band) continue;
    ringKernels++;
    const outOfReach = damaging.filter(s => s.ai!.range < band[0] && !s.ai!.deployed);
    if (outOfReach.length) {
      rows.push({ id, kernel: style, band, outOfReach: outOfReach.map(s => s.id), none: outOfReach.length === damaging.length });
    }
  }
  const byId = <T extends { id?: string; monster?: string }>(a: T, b: T): number =>
    String(a.id ?? a.monster).localeCompare(String(b.id ?? b.monster));
  return { active, withLegs, ringKernels, rows: rows.sort(byId), stranded: stranded.sort(byId), held: held.sort(byId) };
}

/** The ledger's shape: the rows someone has looked at, by key, each with a reason. */
export interface RingLedger {
  version: 1;
  /** Bodies whose damage cannot reach from where they rest. */
  noReach: Record<string, { kernel: string; note: string }>;
  /** Skills the kit can never make usable by itself. */
  stranded: Record<string, { needs: string[]; note: string }>;
}

export const strandedKey = (r: StrandedRow): string => `${r.monster}:${r.skill}`;

/** What differs between tonight's census and the ledger: new rows fail until adjudicated. */
export function checkRingLedger(audit: RingAudit, ledger: RingLedger): { newNoReach: string[]; goneNoReach: string[]; newStranded: string[]; goneStranded: string[] } {
  const noReach = new Set(audit.rows.filter(r => r.none).map(r => r.id));
  const stranded = new Set(audit.stranded.map(strandedKey));
  return {
    newNoReach: [...noReach].filter(k => !ledger.noReach[k]).sort(),
    goneNoReach: Object.keys(ledger.noReach).filter(k => !noReach.has(k)).sort(),
    newStranded: [...stranded].filter(k => !ledger.stranded[k]).sort(),
    goneStranded: Object.keys(ledger.stranded).filter(k => !stranded.has(k)).sort(),
  };
}
