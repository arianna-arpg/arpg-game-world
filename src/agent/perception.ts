// ---------------------------------------------------------------------------
// THE PERCEPT — what a hero agent knows this tick, read only through the
// World's own public reads (enemiesOf, imminentThreatTo, the story gate).
// The agent never peeks at state a player could not see: foes are bodies in
// sight range, threats are the telegraphs the renderer paints. Contract:
// docs/engine/agent.md.
// ---------------------------------------------------------------------------

import { AGENT_CFG } from '../data/agent';
import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { MONSTERS } from '../data/monsters';

export interface Pt { x: number; y: number }

export interface FoeRead {
  actor: Actor;
  d: number;
  /** Ranking weight: rarity, level and whether it is casting at us. */
  threat: number;
}

export interface Percept {
  self: Actor;
  foes: FoeRead[];          // sorted nearest-first
  nearest: FoeRead | null;
  /** The agent's preferred target (highest threat within sight, nearest on a tie). */
  focus: FoeRead | null;
  /** The most imminent blast that will land on us, if any. */
  threat: { pos: Pt; radius: number; eta: number } | null;
  lifeFrac: number;
  manaFrac: number;
  allies: Actor[];
}

const RARITY_THREAT: Record<string, number> = { normal: 1, magic: 1.6, rare: 2.4, champion: 3.2, crowned: 4 };
/** An authored boss (MonsterDef.boss) outranks every rarity. */
const BOSS_THREAT = 6;

export function perceive(world: World, self: Actor, sight: number): Percept {
  const foes: FoeRead[] = [];
  for (const e of world.enemiesOf(self)) {
    if (e.passive) continue;
    if (e.tier !== self.tier) continue;
    const d = Math.hypot(e.pos.x - self.pos.x, e.pos.y - self.pos.y);
    if (d > sight) continue;
    const rar = e.defId && MONSTERS[e.defId]?.boss ? BOSS_THREAT : RARITY_THREAT[e.rarity ?? 'normal'] ?? 1;
    const casting = e.casting ? 0.6 : 0;
    foes.push({ actor: e, d, threat: rar + casting + Math.max(0, e.level - self.level) * 0.05 });
  }
  foes.sort((a, b) => a.d - b.d);
  let focus: FoeRead | null = null;
  for (const f of foes) {
    // Prefer threat, but a distant boss never outranks the blade at our throat.
    const score = f.threat - f.d / 400;
    if (!focus || score > focus.threat - focus.d / 400) focus = f;
  }
  const t = world.imminentThreatTo(self, AGENT_CFG.threatPad);
  const allies = world.actors.filter(a => a !== self && !a.dead && a.team === self.team && a.tier === self.tier);
  return {
    self, foes, nearest: foes[0] ?? null, focus,
    threat: t ? { pos: { x: t.pos.x, y: t.pos.y }, radius: t.radius, eta: t.eta } : null,
    lifeFrac: self.life / Math.max(1, self.maxLife()),
    manaFrac: self.mana / Math.max(1, self.availableMaxMana()),
    allies,
  };
}

/** The best place to land an area of `radius` within `reach` of `from`:
 *  the foe whose neighborhood holds the most bodies (centroid of that
 *  neighborhood). Returns null with no foe in reach. */
export function bestCluster(p: Percept, from: Pt, reach: number, radius: number): { pos: Pt; count: number } | null {
  let best: { pos: Pt; count: number } | null = null;
  const inReach = p.foes.filter(f => Math.hypot(f.actor.pos.x - from.x, f.actor.pos.y - from.y) <= reach + radius * 0.5);
  for (const f of inReach) {
    let n = 0, sx = 0, sy = 0;
    for (const g of p.foes) {
      const dd = Math.hypot(g.actor.pos.x - f.actor.pos.x, g.actor.pos.y - f.actor.pos.y);
      if (dd <= radius) { n++; sx += g.actor.pos.x; sy += g.actor.pos.y; }
    }
    if (!best || n > best.count) best = { pos: { x: sx / n, y: sy / n }, count: n };
  }
  return best;
}

/** Bodies within `radius` of a point. */
export function countNear(p: Percept, at: Pt, radius: number): number {
  let n = 0;
  for (const f of p.foes) if (Math.hypot(f.actor.pos.x - at.x, f.actor.pos.y - at.y) <= radius + f.actor.radius) n++;
  return n;
}
