import type { Actor } from './actor';
import type { MagicPackContext, MagicPackVisual } from './magicPackMechanics';
import type { Vec2 } from '../core/math';
import { sameStory } from './tiers';
import { mod } from './stats';

export interface MagicPackCycle { cooldown: number; initialDelay: number; warning: number; flash: number; breakDistance: number; }
/** A volley may propagate once per member, with a full warning on every hop. */
export interface MagicPackBurst extends MagicPackCycle {
  skill: string; radius: number; innerRadius?: number; chainRange?: number;
}
export interface MagicPackMend extends MagicPackCycle { range: number; fraction: number; below: number; }
export interface MagicPackRitual extends MagicPackCycle { skill: string; range: number; minArea: number; }
export interface MagicPackEventSpec { burst?: MagicPackBurst; mend?: MagicPackMend; ritual?: MagicPackRitual; }
interface Anchor extends Vec2 { slot: number; tier: number; }
interface Charge { anchors: Anchor[]; left: number; fired: boolean; }
export interface MagicPackEventState { left: number; cursor: number; charges: Charge[]; visited: number[]; }
export type MagicPackEvents = Partial<Record<keyof MagicPackEventSpec, MagicPackEventState>>;
const alive = (a: Actor): boolean => !a.dead && !a.owner && a.team === 'enemy' && a.rarity === 'magic' && !!a.magicPack;
const gap = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
const anchor = (a: Actor): Anchor => ({ ...a.pos, slot: a.magicPack!.slot!, tier: a.tier });
const cross = (a: Vec2, b: Vec2, c: Vec2): number => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
export function insideMagicPackTriangle(p: Vec2, points: readonly Vec2[]): boolean {
  const [a, b, c] = points, x = cross(a, b, p), y = cross(b, c, p), z = cross(c, a, p);
  return (x >= 0 && y >= 0 && z >= 0) || (x <= 0 && y <= 0 && z <= 0);
}

/** All event charges share the same lifecycle: select, warn, resolve once,
 * show the result, recover. Death/claim/story/LOS/displacement cancel charges.
 * New warnings never consume the frame that created them, including chains. */
export function stepMagicPackEvents(group: Actor[], spec: MagicPackEventSpec, states: MagicPackEvents,
  dt: number, engaged: boolean, color: string, ctx: MagicPackContext, visuals: MagicPackVisual[]): void {
  const held = new Set<Actor>();
  const find = (p: Anchor): Actor | undefined => group.find(a => alive(a) && a.magicPack!.slot === p.slot && a.tier === p.tier);
  const kin = (a: Actor, b: Actor): boolean => alive(a) && alive(b) && sameStory(a, b) && a.faction === b.faction
    && a.magicPack!.mechanic === b.magicPack!.mechanic;
  const charge = (members: Actor[], rule: MagicPackCycle): Charge => ({ anchors: members.map(anchor), left: rule.warning, fired: false });
  const candidates = (): Actor[] => group.filter(alive);
  for (const kind of ['burst', 'mend', 'ritual'] as const) {
    const rule = spec[kind]; if (!rule) continue;
    const state = states[kind] ??= { left: rule.initialDelay, cursor: 0, charges: [], visited: [] };
    if (!engaged) { state.charges = []; state.visited = []; state.left = rule.initialDelay; continue; }
    const elapsed = Math.max(0, dt), pending: Charge[] = [];
    if (!state.charges.length) {
      state.left -= elapsed;
      if (state.left <= 0) {
        const members = candidates();
        if (kind === 'burst') {
          const burst = spec.burst!;
          const starters = burst.chainRange ? [members[state.cursor++ % members.length]].filter(Boolean) : members;
          pending.push(...starters.map(a => charge([a], rule))); state.visited = starters.map(a => a.magicPack!.slot!);
        } else if (kind === 'mend') {
          const mend = spec.mend!;
          const wounded = members.filter(a => a.life / a.maxLife() < mend.below)
            .sort((a, b) => a.life / a.maxLife() - b.life / b.maxLife());
          for (const target of wounded) {
            const donor = members.find(a => a !== target && kin(a, target) && gap(a.pos, target.pos) <= mend.range
              && ctx.clear(a.pos, target.pos, a.tier));
            if (donor) { pending.push(charge([donor, target], rule)); break; }
          }
        } else {
          const ritual = spec.ritual!;
          const trios: Actor[][] = [];
          for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) for (let k = j + 1; k < members.length; k++) {
            const trio = [members[i], members[j], members[k]];
            if (Math.abs(cross(...trio.map(a => a.pos) as [Vec2, Vec2, Vec2])) / 2 < ritual.minArea) continue;
            if (trio.every((a, n) => trio.slice(n + 1).every(b => kin(a, b) && gap(a.pos, b.pos) <= ritual.range
              && ctx.clear(a.pos, b.pos, a.tier)))) trios.push(trio);
          }
          const trio = trios[state.cursor++ % Math.max(1, trios.length)];
          if (trio) pending.push(charge(trio, rule));
        }
        state.left = pending.length ? rule.cooldown : Math.min(rule.initialDelay, rule.cooldown);
      }
    }
    for (const c of state.charges) {
      c.left -= elapsed;
      const bodies = c.anchors.map(find);
      const first = bodies[0];
      const valid = !!first && bodies.every((a, i) => a && kin(first, a)
        && (c.fired || gap(a.pos, c.anchors[i]) <= rule.breakDistance || (kind === 'mend' && i === 1)))
        && bodies.every((a, i) => bodies.slice(i + 1).every(b => a && b && ctx.clear(a.pos, b.pos, a.tier)));
      const linked = kind !== 'mend' || (!!first && !!bodies[1] && gap(first.pos, bodies[1].pos) <= spec.mend!.range);
      if (!valid || !linked || (c.fired && c.left <= 0)) continue;
      if (kind === 'mend') c.anchors[1] = anchor(bodies[1]!);
      if (!c.fired && c.left <= 0 && elapsed > 0) {
        c.fired = true; c.left = rule.flash;
        if (kind === 'mend') {
          bodies[1]!.healBy(bodies[1]!.maxLife() * spec.mend!.fraction);
        } else {
          const skill = kind === 'burst' ? spec.burst!.skill : spec.ritual!.skill;
          for (const victim of ctx.enemies(first!)) {
            if (!alive(first!)) break;
            if (victim.dead || victim.untargetable || !sameStory(victim, c.anchors[0])) continue;
            if (kind === 'burst') {
              const b = spec.burst!, d = gap(victim.pos, c.anchors[0]);
              // The center point owns ring membership; this is exactly the
              // visible safe center. Outer contact includes the body radius.
              if (d < (b.innerRadius ?? 0) || d > b.radius + victim.radius) continue;
            } else if (!insideMagicPackTriangle(victim.pos, c.anchors)) continue;
            if (ctx.clear(c.anchors[0], victim.pos, victim.tier)) ctx.hit(first!, skill, victim);
          }
          if (kind === 'burst' && spec.burst!.chainRange && alive(first!)) {
            for (const a of candidates()) if (!state.visited.includes(a.magicPack!.slot!) && kin(first!, a)
              && gap(c.anchors[0], a.pos) <= spec.burst!.chainRange && ctx.clear(c.anchors[0], a.pos, a.tier)) {
              state.visited.push(a.magicPack!.slot!); pending.push(charge([a], rule));
            }
          }
        }
      }
      pending.push(c);
    }
    state.charges = pending;
    // Do not publish a charge whose member died to retaliation this frame.
    state.charges = state.charges.filter(c => c.anchors.every(p => !!find(p)));
    for (const c of state.charges) {
      const [a, b] = c.anchors;
      if (!c.fired) for (const p of (kind === 'mend' ? [a] : c.anchors)) { const body = find(p); if (body) held.add(body); }
      visuals.push({ kind: kind === 'burst' ? 'burst' : kind === 'mend' ? 'mend' : 'ritual', pack: group[0].magicPack!.id,
        color, ax: a.x, ay: a.y, bx: b?.x ?? a.x, by: b?.y ?? a.y, tier: a.tier, width: 2,
        warning: !c.fired, progress: c.fired ? 1 - c.left / rule.flash : 1 - c.left / rule.warning,
        radius: kind === 'burst' ? spec.burst!.radius : undefined,
        innerRadius: kind === 'burst' ? spec.burst!.innerRadius : undefined,
        points: kind === 'ritual' ? c.anchors.map(p => ({ x: p.x, y: p.y })) : undefined });
    }
  }
  for (const a of group) {
    if (held.has(a) && alive(a)) {
      if (!a.sheet.getSourceMods('magicPack:eventChannel')) a.sheet.setSource('magicPack:eventChannel', [mod('moveSpeed', 'more', -1)]);
    }
    else if (a.sheet.getSourceMods('magicPack:eventChannel')) a.sheet.removeSource('magicPack:eventChannel');
  }
}

export function magicPackEventErrors(spec: MagicPackEventSpec, skillExists?: (id: string) => boolean): string[] {
  const errors: string[] = [], positive = (n: number): boolean => Number.isFinite(n) && n > 0;
  for (const key of ['burst', 'mend', 'ritual'] as const) {
    const s = spec[key]; if (!s) continue;
    if (![s.cooldown, s.initialDelay, s.warning, s.flash, s.breakDistance].every(positive)) errors.push(`invalid ${key} cycle`);
  }
  for (const s of [spec.burst, spec.ritual]) if (s && (!s.skill || (skillExists && !skillExists(s.skill)))) errors.push('missing event skill');
  if (spec.burst) {
    const s = spec.burst;
    if (!positive(s.radius) || (s.chainRange !== undefined && !positive(s.chainRange))
      || (s.innerRadius !== undefined && (!positive(s.innerRadius) || s.innerRadius >= s.radius))) errors.push('invalid burst geometry');
  }
  if (spec.mend && (!positive(spec.mend.range) || !positive(spec.mend.fraction) || spec.mend.fraction > 1
    || !positive(spec.mend.below) || spec.mend.below > 1)) errors.push('invalid mend');
  if (spec.ritual && (!positive(spec.ritual.range) || !positive(spec.ritual.minArea))) errors.push('invalid ritual');
  return errors;
}
