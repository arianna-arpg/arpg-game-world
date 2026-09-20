import type { Actor } from './actor';
import type { MagicPackDef } from './magicPacks';
import { MAGIC_PACKS, MAGIC_PACK_CFG } from '../data/magicPacks';
import { mod } from './stats';
import { sameStory } from './tiers';
import { pointSegDist, type Vec2 } from '../core/math';
import { stepMagicPackEvents, type MagicPackEvents } from './magicPackEvents';

export interface MagicPackBearer {
  /** False for an exposed leader whose followers do not have ward protection. */
  protectedOthers?: boolean;
  /** No timer means the exposed role passes only when its bearer leaves. */
  rotateEvery?: number;
  warning: number;
  onLoss: 'next' | 'end';
  /** A siphon: only nearby, visible original members contribute. */
  siphonRadius?: number;
  color: string;
}
export interface MagicPackBeam {
  skill: string; cooldown: number; initialDelay: number; warning: number;
  travel: number; pulseLength: number; halfWidth: number; range: number;
  /** Endpoints hold their feet. Forced displacement beyond this cancels. */
  breakDistance: number;
}
export interface MagicPackGrave {
  skill: string; warning: number; radius: number; halfWidth: number;
  spokes: number; turnSpeed: number; tick: number;
}
export interface MagicPackGraveState {
  slot: number; x: number; y: number; tier: number; angle: number; warmup: number; tickLeft: number;
}
interface MagicPackPulse {
  from: number; to: number; a: Vec2; b: Vec2; tier: number;
  elapsed: number; hits: number[];
}
export interface MagicPackRuntime {
  bearer?: number; retired?: boolean; rotateLeft: number;
  beamLeft: number; pairCursor: number; beam?: MagicPackPulse;
  graves: MagicPackGraveState[];
  events?: MagicPackEvents;
}
/** Host-produced geometry is also the wire/draw geometry. Width is HALF-width. */
export type MagicPackVisual = {
  kind: 'beam' | 'grave' | 'siphon' | 'burst' | 'mend' | 'ritual'; pack: number; color: string;
  ax: number; ay: number; bx: number; by: number; width: number;
  warning: boolean; progress: number; tier: number;
  cx?: number; cy?: number; radius?: number;
  innerRadius?: number; points?: Vec2[];
  /** Optional warning tether from a remote footprint to its actual caster. */
  sourceX?: number; sourceY?: number;
};
export interface MagicPackContext {
  enemies(a: Actor): Actor[];
  clear(a: Vec2, b: Vec2, tier: number): boolean;
  clip(a: Vec2, b: Vec2, tier: number): Vec2;
  hit(a: Actor, skill: string, victim: Actor): void;
}

function active(a: Actor): boolean {
  return !!a.magicPack && !a.dead && !a.owner && a.team === 'enemy' && a.rarity === 'magic';
}
function fresh(def: MagicPackDef): MagicPackRuntime {
  return { rotateLeft: def.bearer?.rotateEvery ?? 0, beamLeft: def.beam?.initialDelay ?? 0, pairCursor: 0, graves: [] };
}
const gap = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
const slot = (a: Actor): number => a.magicPack!.slot!;

/** Re-entry keeps roles, relative clocks and corpse positions, but re-arms all
 * danger with a fresh warning. Never resume an unseen already-firing beam. */
export function restoreMagicPackRuntime(raw: unknown, def: MagicPackDef, size: number): MagicPackRuntime | undefined {
  if (!raw || typeof raw !== 'object') return;
  const r = raw as Partial<MagicPackRuntime>, out = fresh(def);
  const validSlot = (n: unknown): n is number => Number.isSafeInteger(n) && (n as number) >= 0 && (n as number) < size;
  if (validSlot(r.bearer)) out.bearer = r.bearer;
  if (r.retired === true) out.retired = true;
  if (Number.isFinite(r.rotateLeft)) out.rotateLeft = Math.max(def.bearer?.warning ?? 0,
    Math.min(def.bearer?.rotateEvery ?? 0, r.rotateLeft!));
  if (Number.isSafeInteger(r.pairCursor) && r.pairCursor! >= 0) out.pairCursor = r.pairCursor! % (size * size);
  if (def.grave && Array.isArray(r.graves)) for (const g of r.graves.slice(0, size - 1)) {
    if (!g || !validSlot(g.slot) || out.graves.some(v => v.slot === g.slot)
      || ![g.x, g.y, g.angle].every(Number.isFinite) || !Number.isSafeInteger(g.tier) || g.tier < 0) continue;
    out.graves.push({ slot: g.slot, x: g.x, y: g.y, tier: g.tier,
      angle: g.angle % (Math.PI * 2), warmup: def.grave.warning, tickLeft: def.grave.tick });
  }
  return out;
}

/** Actual deaths alone plant anchors. Silent retirement/ownership never does. */
export function magicPackFallen(a: Actor, actors: readonly Actor[]): void {
  const p = a.magicPack, def = p && MAGIC_PACKS[p.mechanic];
  if (!p || !def?.grave || a.owner || a.team !== 'enemy' || a.rarity !== 'magic') return;
  const living = actors.filter(b => active(b) && b.magicPack!.id === p.id && b.magicPack!.mechanic === p.mechanic);
  if (!living.length) return;
  const state = p.runtime ?? living[0].magicPack!.runtime ?? fresh(def);
  const member = p.slot ?? 0;
  if (!state.graves.some(g => g.slot === member) && state.graves.length < p.size - 1) {
    state.graves.push({ slot: member, x: a.pos.x, y: a.pos.y, tier: a.tier,
      angle: a.facing, warmup: def.grave.warning, tickLeft: def.grave.tick });
  }
  for (const b of living) b.magicPack!.runtime = state;
}

/** Single live fold for roles, drains and dangerous geometry. No recipe-id
 * branches; new recipes combine bearer/rule/beam/grave specs as data. */
export function stepMagicPackMechanics(actors: readonly Actor[], dt: number, ctx: MagicPackContext): MagicPackVisual[] {
  const visuals: MagicPackVisual[] = [];
  const groups = new Map<number, Actor[]>();
  for (const a of actors) {
    a.magicPackRole = undefined; a.magicPackPending = 0; a.magicPackDonors = 0;
    if (!active(a)) {
      if (a.sheet.getSourceMods('magicPack:beamChannel')) a.sheet.removeSource('magicPack:beamChannel');
      if (a.sheet.getSourceMods('magicPack:eventChannel')) a.sheet.removeSource('magicPack:eventChannel');
      continue;
    }
    const p = a.magicPack!;
    const group = groups.get(p.id);
    if (group) group.push(a); else groups.set(p.id, [a]);
  }
  for (const group of groups.values()) {
    const def = MAGIC_PACKS[group[0].magicPack!.mechanic];
    if (!def?.beam) for (const a of group) {
      if (a.sheet.getSourceMods('magicPack:beamChannel')) a.sheet.removeSource('magicPack:beamChannel');
    }
    if (!def?.burst && !def?.mend && !def?.ritual) for (const a of group) {
      if (a.sheet.getSourceMods('magicPack:eventChannel')) a.sheet.removeSource('magicPack:eventChannel');
    }
    if (!def || (!def.bearer && !def.beam && !def.grave && !def.burst && !def.mend && !def.ritual)) continue;
    // Pre-mechanic saves had no slots. Assign once; new cohorts mint them.
    const used = new Set(group.map(a => a.magicPack!.slot).filter(n => n !== undefined));
    for (const a of group) if (a.magicPack!.slot === undefined) {
      let i = 0; while (used.has(i)) i++; a.magicPack!.slot = i; used.add(i);
    }
    group.sort((a, b) => slot(a) - slot(b));
    const state = group[0].magicPack!.runtime ?? fresh(def);
    for (const a of group) a.magicPack!.runtime = state;
    const kin = (a: Actor, b: Actor): boolean => sameStory(a, b) && a.faction === b.faction
      && a.magicPack!.mechanic === b.magicPack!.mechanic;
    const engaged = group.some(a => ctx.enemies(a).some(e => !e.dead && sameStory(a, e)
      && gap(a.pos, e.pos) <= MAGIC_PACK_CFG.engageRadius));
    // Encounter clocks pause when nobody is nearby. Existing ground keeps
    // turning locally, even when survivors have been kited away from it.
    const elapsed = engaged ? Math.max(0, dt) : 0;
    if (def.burst || def.mend || def.ritual) stepMagicPackEvents(group, def, state.events ??= {}, dt, engaged, def.color, ctx, visuals);
    if (def.bearer && !state.retired) {
      let bearer = group.find(a => slot(a) === state.bearer);
      const successor = (): Actor => group.find(a => slot(a) > (state.bearer ?? -1)) ?? group[0];
      if (!bearer && state.bearer !== undefined && def.bearer.onLoss === 'end') state.retired = true;
      if (!state.retired) {
        if (!bearer) { bearer = successor(); state.bearer = slot(bearer); state.rotateLeft = def.bearer.rotateEvery ?? 0; }
        if (def.bearer.rotateEvery && group.length > 1) {
          state.rotateLeft -= elapsed;
          if (state.rotateLeft <= 0) { bearer = successor(); state.bearer = slot(bearer); state.rotateLeft = def.bearer.rotateEvery; }
          if (state.rotateLeft <= def.bearer.warning) successor().magicPackPending = 1 - state.rotateLeft / def.bearer.warning;
        }
        for (const a of group) a.magicPackRole = a === bearer ? 'bearer' : 'member';
        if (def.bearer.siphonRadius) for (const a of group) {
          if (a === bearer || !kin(a, bearer) || gap(a.pos, bearer.pos) > def.bearer.siphonRadius
            || !ctx.clear(a.pos, bearer.pos, a.tier)) continue;
          a.magicPackRole = 'donor'; bearer.magicPackDonors++;
          visuals.push({ kind: 'siphon', pack: a.magicPack!.id, color: def.color, ax: a.pos.x, ay: a.pos.y,
            bx: bearer.pos.x, by: bearer.pos.y, width: 2, warning: false, progress: 0, tier: a.tier });
        }
      }
    }
    const beam = def.beam;
    if (beam) {
      if (!engaged) { state.beam = undefined; state.beamLeft = beam.initialDelay; }
      let pulse = state.beam;
      if (pulse) {
        const a = group.find(a => slot(a) === pulse!.from), b = group.find(a => slot(a) === pulse!.to);
        if (!a || !b || !kin(a, b) || gap(a.pos, pulse.a) > beam.breakDistance
          || gap(b.pos, pulse.b) > beam.breakDistance || !ctx.clear(pulse.a, pulse.b, pulse.tier)) {
          pulse = state.beam = undefined; state.beamLeft = beam.cooldown;
        }
      } else if (engaged) {
        state.beamLeft -= elapsed;
        if (state.beamLeft <= 0) {
          const pairs = group.flatMap((a, i) => group.slice(i + 1).filter(b => kin(a, b)
            && gap(a.pos, b.pos) <= beam.range && gap(a.pos, b.pos) > a.radius + b.radius
            && ctx.clear(a.pos, b.pos, a.tier)).map(b => [a, b] as const));
          const pair = pairs[state.pairCursor++ % Math.max(1, pairs.length)];
          if (pair) {
            const [a, b] = pair;
            pulse = state.beam = { from: slot(a), to: slot(b), a: { ...a.pos }, b: { ...b.pos }, tier: a.tier, elapsed: 0, hits: [] };
          } else state.beamLeft = beam.initialDelay;
        }
      }
      if (pulse) {
        // A newly created warning never consumes the frame that created it.
        const previous = pulse.elapsed;
        if (previous > 0 || state.beamLeft > 0) pulse.elapsed += elapsed;
        else { state.beamLeft = beam.cooldown; }
        const warning = pulse.elapsed < beam.warning;
        const fraction = Math.max(0, Math.min(1, (pulse.elapsed - beam.warning) / beam.travel));
        const length = gap(pulse.a, pulse.b);
        const head = fraction * (length + beam.pulseLength);
        const tail = Math.max(0, head - beam.pulseLength), tip = Math.min(length, head);
        const point = (d: number): Vec2 => ({ x: pulse!.a.x + (pulse!.b.x - pulse!.a.x) * d / length,
          y: pulse!.a.y + (pulse!.b.y - pulse!.a.y) * d / length });
        const start = warning ? pulse.a : point(Math.min(length, tail));
        const end = warning ? pulse.b : point(Math.max(0, tip));
        visuals.push({ kind: 'beam', pack: group[0].magicPack!.id, color: def.color,
          ax: start.x, ay: start.y, bx: end.x, by: end.y, width: beam.halfWidth,
          warning, progress: warning ? pulse.elapsed / beam.warning : fraction, tier: pulse.tier });
        const caster = group.find(a => slot(a) === pulse!.from)!;
        if (!warning && elapsed > 0) {
          // Swept tail catches a fast pulse between frames; each body is hit once.
          const previousHead = Math.max(0, (previous - beam.warning) / beam.travel) * (length + beam.pulseLength);
          const sweepStart = point(Math.min(length, Math.max(0, previousHead - beam.pulseLength)));
          for (const target of ctx.enemies(caster)) {
            if (!active(caster)) break;
            if (target.dead || target.untargetable || !sameStory(target, pulse) || pulse.hits.includes(target.id)
              || pointSegDist(target.pos.x, target.pos.y, sweepStart.x, sweepStart.y, end.x, end.y) > beam.halfWidth + target.radius) continue;
            pulse.hits.push(target.id); ctx.hit(caster, beam.skill, target);
          }
        }
        if (pulse.elapsed >= beam.warning + beam.travel) { state.beam = undefined; state.beamLeft = beam.cooldown; }
      }
      for (const a of group) {
        const held = !!state.beam && (slot(a) === state.beam.from || slot(a) === state.beam.to);
        if (held && !a.sheet.getSourceMods('magicPack:beamChannel')) a.sheet.setSource('magicPack:beamChannel', [mod('moveSpeed', 'more', -1)]);
        if (!held && a.sheet.getSourceMods('magicPack:beamChannel')) a.sheet.removeSource('magicPack:beamChannel');
      }
    }
    const grave = def.grave;
    if (grave) for (const g of state.graves) {
      const graveElapsed = Math.max(0, dt);
      const warning = g.warmup > 0;
      if (warning) g.warmup = Math.max(0, g.warmup - graveElapsed);
      else g.angle = (g.angle + grave.turnSpeed * graveElapsed) % (Math.PI * 2);
      g.tickLeft -= warning ? 0 : graveElapsed;
      const strike = !warning && graveElapsed > 0 && g.tickLeft <= 0;
      if (strike) g.tickLeft = grave.tick;
      const caster = group.find(a => a.tier === g.tier);
      const hit = new Set<number>();
      for (let i = 0; i < grave.spokes; i++) {
        const angle = g.angle + i * Math.PI * 2 / grave.spokes;
        const a = { x: g.x, y: g.y }, rawEnd = { x: g.x + Math.cos(angle) * grave.radius, y: g.y + Math.sin(angle) * grave.radius };
        const end = ctx.clip(a, rawEnd, g.tier);
        visuals.push({ kind: 'grave', pack: group[0].magicPack!.id, color: def.color,
          ax: g.x, ay: g.y, bx: end.x, by: end.y, width: grave.halfWidth,
          cx: g.x, cy: g.y, radius: grave.radius, warning, progress: 1 - g.warmup / grave.warning, tier: g.tier });
        if (strike && caster) for (const target of ctx.enemies(caster)) {
          if (!active(caster)) break;
          if (target.dead || target.untargetable || !sameStory(target, g) || hit.has(target.id)
            || pointSegDist(target.pos.x, target.pos.y, g.x, g.y, end.x, end.y) > grave.halfWidth + target.radius
            || !ctx.clear(a, target.pos, g.tier)) continue;
          hit.add(target.id); ctx.hit(caster, grave.skill, target);
        }
      }
    }
  }
  const livePacks = new Set(actors.filter(active).map(a => a.magicPack!.id));
  return visuals.filter(v => livePacks.has(v.pack));
}
