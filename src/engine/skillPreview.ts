// ---------------------------------------------------------------------------
// THE PREVIEW FABRIC — what a skill does FOR THIS BUILD, right now.
//
// A tooltip that prints authored numbers is a tooltip that lies the moment a
// player invests in anything: the gem says "35% chance to stun" while the
// sheet's statusChance has quietly made it 52%, or the def says 4s cooldown
// while recovery has it at 2.6s. Diagnosing that gap is the player's least
// favourite kind of homework, so this module removes the homework instead:
// every row here is READ THROUGH THE ENGINE'S OWN RESOLVER, never a display
// copy of the engine's arithmetic.
//
//   damage      -> damage.ts skillDamageBands (the roller's fold, resolved at
//                  each range's floor and ceiling instead of at the dice)
//   cost        -> Actor.skillCost           (already the cast-time resolver)
//   cast time   -> Actor.speedFactor         (likewise)
//   cooldown    -> skills.ts skillCooldownSeconds (the stamper's own formula)
//   everything  -> caster.sheet.get(stat, skillContextTags(def), instanceMods(inst))
//   else           — the identical query the cast site makes
//
// THE LAW: a number shown here must come from the function that produces it in
// play. Where no shared resolver existed, one was extracted rather than
// duplicated (skillCooldownSeconds), and where the fold is a roll, the roll was
// parameterized rather than re-implemented (foldSkillDamage's RangePick). If a
// future row cannot be sourced that way, it does not belong in this file —
// balance/probe_skillpreview.ts exists to make that violation loud.
//
// Rows are DATA (PreviewRow[]), so the panel, the HUD and the site can each
// render them their own way without re-deriving anything.
// ---------------------------------------------------------------------------

import type { Actor } from './actor';
import { skillDamageBands } from './damage';
import {
  instanceDelivery, instanceMods, skillContextTags, skillCooldownSeconds, socketSpec,
  type SkillInstance,
} from './skills';
import { STATUS_DEFS, tuneAilmentChance } from './status';
import { DAMAGE_TYPES, type DamageType } from './stats';

/** The apply_ sweep's id order, mirroring world.ts's own STATUS_IDS. */
const STATUS_IDS = Object.keys(STATUS_DEFS);

/** Which shelf a row sits on: the compact block, or behind the expander. */
export type PreviewGroup = 'headline' | 'detail';

export interface PreviewRow {
  /** Stable id (the panel keys off it; never shown). */
  key: string;
  label: string;
  /** Rendered value, already formatted for a player. */
  value: string;
  /** Optional clarifier shown small beside the value. */
  note?: string;
  group: PreviewGroup;
}

export interface SkillPreview {
  rows: PreviewRow[];
  /** True when at least one row sits behind the expander. */
  hasDetail: boolean;
}

// --- formatting -------------------------------------------------------------

/** Damage numbers: whole above 10, one decimal below (a 3.4 hit matters). */
const dmg = (n: number): string =>
  n >= 10 ? Math.round(n).toLocaleString() : (Math.round(n * 10) / 10).toString();

const band = (lo: number, hi: number): string =>
  Math.abs(hi - lo) < 0.05 ? dmg(lo) : `${dmg(lo)}–${dmg(hi)}`;

const pct = (frac: number): string => `${Math.round(frac * 100)}%`;

/** Seconds with the smallest honest precision (2s, 0.65s). */
const secs = (n: number): string =>
  `${n >= 10 ? Math.round(n) : Math.round(n * 100) / 100}s`;

/** "increased"/"reduced" against a base of 1 — for scalar dials like area. */
const deltaPct = (scale: number): string =>
  `${scale >= 1 ? '+' : ''}${Math.round((scale - 1) * 100)}%`;

const TYPE_LABEL: Record<DamageType, string> = {
  physical: 'Physical', fire: 'Fire', cold: 'Cold',
  lightning: 'Lightning', chaos: 'Chaos',
};

// --- the read ---------------------------------------------------------------

/**
 * Every computed fact about this instance in this caster's hands. Pure: it
 * rolls nothing, mutates nothing, and touches no rng, so a hover may call it
 * every frame.
 */
export function previewSkill(caster: Actor, inst: SkillInstance): SkillPreview {
  const def = inst.def;
  const tags = skillContextTags(def);
  const extra = instanceMods(inst);
  const get = (stat: string): number => caster.sheet.get(stat, tags, extra);
  const rows: PreviewRow[] = [];
  const push = (
    key: string, label: string, value: string,
    group: PreviewGroup = 'headline', note?: string,
  ): void => { rows.push({ key, label, value, note, group }); };

  // ---- damage -------------------------------------------------------------
  const dmgPreview = skillDamageBands(caster, inst);
  const live = DAMAGE_TYPES.filter(t => dmgPreview.bands[t]);
  if (live.length) {
    push('damage', 'Damage per hit', band(dmgPreview.total.lo, dmgPreview.total.hi),
      'headline', 'before the target\'s defenses');
    // Per-type split only when it says something the total does not.
    if (live.length > 1) {
      for (const t of live) {
        const b = dmgPreview.bands[t]!;
        push(`damage_${t}`, TYPE_LABEL[t], band(b.lo, b.hi), 'detail');
      }
    }
    if (dmgPreview.critChance > 0) {
      push('crit', 'Critical strike', pct(dmgPreview.critChance), 'headline',
        `${Math.round(dmgPreview.critMulti * 100)}% damage`);
    }
  }

  // ---- cost & cadence -----------------------------------------------------
  const cost = caster.skillCost(inst);
  if (cost.mana > 0 || cost.life > 0) {
    const parts: string[] = [];
    if (cost.mana > 0) parts.push(`${cost.mana} mana`);
    if (cost.life > 0) parts.push(`${cost.life} life`);
    push('cost', 'Cost', parts.join(' + '));
  }
  if (def.useTime > 0) {
    const speed = caster.speedFactor(inst);
    push('castTime', tags.has('attack') ? 'Attack time' : 'Cast time',
      secs(def.useTime / Math.max(0.01, speed)), 'headline',
      Math.abs(speed - 1) > 0.005 ? `base ${secs(def.useTime)}` : undefined);
  }
  if (def.cooldown > 0) {
    const cd = skillCooldownSeconds(caster, inst);
    push('cooldown', 'Cooldown', secs(cd), 'headline',
      Math.abs(cd - def.cooldown) > 0.005 ? `base ${secs(def.cooldown)}` : undefined);
  }

  // ---- how many things this cast puts in the world -------------------------
  // Each mirrors its cast site's own expression (world.ts useSkill), so a
  // support that bumps the count moves this row by exactly what it will move
  // in play. (Skill-mode audit: the resolved view — a picked branch's
  // folded fields preview as they will fire.)
  const d = instanceDelivery(inst);
  if (d.type === 'projectile') {
    const bonus = Math.round(get('projectileCount'));
    const baseCount = typeof d.count === 'number' ? d.count : undefined;
    if (baseCount !== undefined || bonus > 0) {
      const total = (baseCount ?? 1) + bonus;
      push('projectiles', 'Projectiles', String(total), 'headline',
        bonus > 0 && baseCount !== undefined ? `base ${baseCount}` : undefined);
    }
    const pierce = (d.pierce ?? 0) + Math.round(get('pierceCount'));
    if (pierce > 0) push('pierce', 'Pierces', `${pierce} target${pierce === 1 ? '' : 's'}`, 'detail');
    const chains = Math.round(get('chainCount'));
    if (chains > 0) push('chains', 'Chains', `${chains} time${chains === 1 ? '' : 's'}`, 'detail');
  }
  // THE EXTRA VICTIMS (Forked Focus and kin) — invisible in authored text,
  // and precisely the "does this even do anything for me?" row.
  const multi = Math.round(get('multiTarget'));
  if (multi > 0) {
    push('multiTarget', 'Extra targets', `+${multi}`, 'headline',
      'the cast also strikes this many more nearby');
  }

  // ---- area ---------------------------------------------------------------
  // Scale, never raw engine radii: the number a player can act on is how much
  // WIDER their investment made it.
  const aoe = get('aoeRadius');
  if (Math.abs(aoe - 1) > 0.005 && ('radius' in d || 'arcDeg' in d)) {
    push('area', 'Area', deltaPct(aoe), 'detail');
  }

  // ---- statuses this cast can inflict --------------------------------------
  // Authored rows first, through the SAME tuning + statusChance fold the hit
  // rolls (world.ts resolveHit), so an incidental bleed reads as the sliver it
  // actually is rather than the authored figure the engine never uses.
  const bonusChance = get('statusChance');
  const durScale = get('effectDuration');
  const seen = new Set<string>();
  for (const fx of def.effects) {
    if (fx.type !== 'status') continue;
    seen.add(fx.status);
    const sdef = STATUS_DEFS[fx.status];
    const eff = Math.min(1, tuneAilmentChance(fx.status, fx.chance) + bonusChance);
    if (eff <= 0) continue;
    // THE UNSCALABLE CLOCK: durationOverride bypasses both the status's own
    // duration AND the caster's effectDuration (the Flash Freeze rule), so
    // showing it multiplied would misreport exactly the skills that authored
    // a fixed window on purpose.
    const dur = fx.durationOverride !== undefined
      ? fx.durationOverride
      : (sdef?.duration ?? 0) * durScale;
    push(`status_${fx.status}`, sdef?.label ?? fx.status,
      eff >= 1 ? 'always' : pct(eff), 'detail', dur > 0 ? secs(dur) : undefined);
  }
  // Then the GRANTED ones (gems, gear, passives: the apply_ family), which no
  // authored description could ever have known about.
  for (const sid of caster.sheet.armedFamily('apply_', STATUS_IDS, extra)) {
    if (seen.has(sid)) continue;
    const ch = get('apply_' + sid);
    if (ch <= 0) continue;
    push(`apply_${sid}`, STATUS_DEFS[sid]?.label ?? sid,
      pct(Math.min(1, ch + bonusChance)), 'detail', 'granted');
  }

  // ---- buff / minion shape -------------------------------------------------
  for (const fx of def.effects) {
    if (fx.type !== 'buff' || !fx.duration) continue;
    push(`buff_${fx.id}`, 'Effect duration', secs(fx.duration * durScale), 'detail',
      Math.abs(durScale - 1) > 0.005 ? `base ${secs(fx.duration)}` : undefined);
  }
  if (d.type === 'summon') {
    const cap = Math.max(1, Math.round(get('minionMaxCount') || d.maxActive));
    push('minionCap', 'Minions at once', String(cap), 'headline',
      cap !== d.maxActive ? `base ${d.maxActive}` : undefined);
    const per = d.count + Math.round(get('summonCount'));
    if (per !== 1) push('minionPer', 'Summoned per cast', String(per), 'detail');
    const plies = Math.round(get('minionPlies'));
    if (plies > 0) push('minionPlies', 'Minion plies', `+${plies}`, 'detail',
      'each ply eats one landed blow whole');
  }

  // ---- use charges (the magazine) ------------------------------------------
  const charges = socketSpec(inst, 'useChargeGraft');
  if (charges) {
    const cap = Math.round(get('chargeCap'));
    if (cap > 0) push('charges', 'Charges', String(cap), 'detail');
  }

  return { rows, hasDetail: rows.some(r => r.group === 'detail') };
}
