import { Rng } from '../core/rng';
import { BOUNTY_BOARD_CFG, registerBountyKind, type BountyPosting } from '../data/bountyboard';
import { rollBudgetBountyPay, ensureBountyRewardChoices } from '../data/bountyRewards';
import type { World } from '../engine/world';
import type { MassAddress } from './address';
import { address, localOffset } from './address';
import type { MassPlace } from './contracts';
import { canonical, massHash } from './random';
import type { WorldMassRuntime, MassAdventureSave } from './runtime';
import { MASS_ZONE } from './preset';

export interface MassBountySpec { source: string; maxCandidates: number }
export interface MassBountyTarget { run: string; id: string; content: string; center: MassAddress }
export const MASS_BOUNTY_KINDS = ['country_visit', 'country_clear', 'country_cache', 'country_puzzle'] as const;
type Kind = typeof MASS_BOUNTY_KINDS[number];
export function validateMassBounties(spec: MassBountySpec): void {
  if (!spec || typeof spec.source !== 'string' || !spec.source || !Number.isSafeInteger(spec.maxCandidates)
    || spec.maxCandidates < 16 || spec.maxCandidates > 256) throw Error('Invalid country bounty policy');
}
export function massBountiesAvailable(world: World, board: string = BOUNTY_BOARD_CFG.boardId): boolean {
  return !!world.massRuntime?.config.bounties && board === BOUNTY_BOARD_CFG.boardId;
}
/** Save sanitation validates identity shape without creating a second runtime.
 * The live resolver then requires the exact generated place before any action. */
export function savedMassBounty(raw: unknown, save?: MassAdventureSave): MassBountyTarget | undefined {
  const t = raw as MassBountyTarget;
  if (!save?.config.bounties || !t || t.run !== save.state.run.runId || typeof t.id !== 'string' || !t.id
    || typeof t.content !== 'string' || !save.config.content.some(c => c.id === t.content && c.site)) return undefined;
  try {
    const center = address(t.center.dimension, t.center.cx, t.center.cy, t.center.x, t.center.y, save.config.terrain.addressSpan);
    if (canonical(center) !== canonical(t.center) || center.dimension !== save.origin.dimension) return undefined;
    localOffset(center, { ...save.origin, x: 0, y: 0 }, save.config.terrain.addressSpan);
    return { run: t.run, id: t.id, content: t.content, center };
  } catch { return undefined; }
}
export function massBountyPlace(mass: WorldMassRuntime, target?: MassBountyTarget): MassPlace | undefined {
  if (!target || target.run !== mass.generator.run.runId) return undefined;
  return mass.placesInCell(target.center).find(p => p.id === target.id && p.content === target.content
    && canonical(p.center) === canonical(target.center));
}
export function massBountyLocal(mass: WorldMassRuntime, place: MassPlace): { x: number; y: number } {
  return localOffset(place.center, { ...mass.origin, x: 0, y: 0 }, mass.config.terrain.addressSpan);
}
function capable(mass: WorldMassRuntime, place: MassPlace, kind: string): boolean {
  const site = mass.config.content.find(c => c.id === place.content)?.site;
  return !!site && (kind === 'country_visit' || kind === 'country_clear' && !!site.completion
    || kind === 'country_cache' && !!site.cache || kind === 'country_puzzle' && !!site.puzzles?.length);
}
export function massBountyDone(world: World, p: BountyPosting): boolean {
  const mass = world.massRuntime, place = mass && massBountyPlace(mass, p.massBounty);
  if (!mass || !place || !capable(mass, place, p.kind)) return false;
  switch (p.kind) {
    case 'country_visit': return mass.sites.discovered.some(s => s.id === place.id);
    case 'country_clear': return mass.siteCleared(place.id);
    case 'country_cache': return mass.siteSearched(place.id);
    case 'country_puzzle': return mass.puzzles.activity(place.id)?.complete === true;
    default: return false;
  }
}
export function massBountyRoute(world: World, p: BountyPosting): string {
  const mass = world.massRuntime, place = mass && massBountyPlace(mass, p.massBounty);
  if (!mass || !place) return 'Destination unavailable in this expedition';
  const at = massBountyLocal(mass, place), dx = at.x - world.player.pos.x, dy = at.y - world.player.pos.y;
  const direction = Math.hypot(dx, dy) <= place.radius ? 'here'
    : ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast']
      [(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
  const site = mass.config.content.find(c => c.id === place.content)!.site!;
  return `${site.name} · Lv ${mass.populationFor(place).level} · ${direction}`;
}
export function massBountyAccept(world: World, p: BountyPosting): string | null {
  const mass = world.massRuntime, place = mass && massBountyPlace(mass, p.massBounty);
  if (!mass || !massBountiesAvailable(world, p.boardId) || !place || !capable(mass, place, p.kind))
    return 'the country destination no longer belongs to this expedition';
  return null;
}
/** The candidate frontier contains the connected opening and places actually
 * reached in this life. No unbounded world scan, detached island promise, or
 * terrain discovery is caused by reading the board. */
export function massBountyCandidates(world: World, slate = 'standing'): MassPlace[] {
  const mass = world.massRuntime;
  if (!mass?.config.bounties) return [];
  const result = new Map<string, MassPlace>();
  for (const p of mass.journey?.places ?? []) result.set(p.id, p);
  // Spent destinations never consume the finite frontier budget. Rotate a
  // large unfinished frontier deterministically with the native slate, so an
  // old alphabetical prefix cannot permanently hide newly explored country.
  const pending = mass.sites.discovered.filter(found => {
    if (result.has(found.id)) return false;
    const site = mass.config.content.find(c => c.id === found.content)?.site;
    return !!site && (site.completion && !mass.siteCleared(found.id)
      || site.cache && !mass.siteSearched(found.id)
      || site.puzzles?.length && mass.puzzles.activity(found.id)?.complete !== true);
  }).sort((a, b) => massHash(slate + a.id) - massHash(slate + b.id) || a.id.localeCompare(b.id));
  for (const found of pending.slice(0, Math.max(0, mass.config.bounties.maxCandidates - result.size))) {
    const p = mass.placesInCell(found.center).find(p => p.id === found.id && p.content === found.content);
    if (p) result.set(p.id, p);
  }
  return [...result.values()].filter(p => {
    const at = massBountyLocal(mass, p);
    return !!mass.config.content.find(c => c.id === p.content)?.site && !mass.settlement?.reserves(at.x, at.y, p.radius);
  }).sort((a, b) => a.id.localeCompare(b.id)).slice(0, mass.config.bounties.maxCandidates);
}
export function dealMassBounties(world: World, board: string, beat: number, sequence: number,
  standing: boolean, pickGemId: (level: number, rng: Rng) => string | null): BountyPosting[] {
  const mass = world.massRuntime!;
  const current = world.bountyOffers.filter(p => p.boardId === board && p.massBounty);
  const hands = world.bountyHands.filter(p => p.boardId === board);
  if (standing && (current.length || hands.length)) return current;
  const offers = current.filter(p => p.locked && p.massBounty);
  const preserved = new Set(offers.map(p => p.id));
  const occupied = new Set([...offers, ...hands].map(p => p.massBounty?.id));
  const rng = new Rng(massHash(canonical([mass.generator.run.seed, mass.config.bounties!.source, board, beat, sequence])));
  const weights = BOUNTY_BOARD_CFG.lanes.weights;
  const candidates = massBountyCandidates(world, canonical([beat, sequence])).filter(p => !occupied.has(p.id)
    && mass.populationFor(p).level <= world.player.level + BOUNTY_BOARD_CFG.routes.challengeAbove);
  // Rotate ask families per slate, then take distinct physical destinations.
  const kinds: Kind[] = [...MASS_BOUNTY_KINDS];
  const start = rng.int(0, kinds.length - 1);
  for (let i = 0; offers.length < BOUNTY_BOARD_CFG.offers && i < BOUNTY_BOARD_CFG.offers * kinds.length; i++) {
    const kind = kinds[(start + i) % kinds.length];
    const pool = candidates.filter(place => !occupied.has(place.id) && capable(mass, place, kind)
      && !massBountyDone(world, { kind, massBounty: targetOf(mass, place) } as BountyPosting));
    if (!pool.length) continue;
    const manageable = pool.filter(p => mass.populationFor(p).level <= world.player.level);
    const place = rng.pick(offers.length < BOUNTY_BOARD_CFG.routes.manageableSeats && manageable.length ? manageable : pool);
    const level = mass.populationFor(place).level;
    const massBounty = targetOf(mass, place);
    offers.push({ id: 'country_bounty:' + canonical([mass.generator.run.runId, board, beat, sequence, kind, place.id]),
      boardId: board, zoneId: MASS_ZONE, beat, kind, massBounty,
      pay: rollBudgetBountyPay({ pickGemId }, rng, level, weights) });
    occupied.add(place.id);
  }
  ensureBountyRewardChoices(offers, preserved, { pickGemId }, rng, weights);
  return offers;
}
function targetOf(mass: WorldMassRuntime, place: MassPlace): MassBountyTarget {
  return { run: mass.generator.run.runId, id: place.id, content: place.content, center: { ...place.center } };
}
for (const kind of MASS_BOUNTY_KINDS) registerBountyKind({
  id: kind, weight: 0, available: () => false, roll: () => null,
  accept: massBountyAccept, target: () => null, route: massBountyRoute, done: massBountyDone,
  annulled: (world, p) => world.massRuntime ? massBountyAccept(world, p) : null,
  copy: (world, p) => {
    const place = world.massRuntime && massBountyPlace(world.massRuntime, p.massBounty);
    const name = place && world.massRuntime!.config.content.find(c => c.id === place.content)?.site?.name || 'the country destination';
    const verbs: Record<Kind, [string, string]> = {
      country_visit: ['Scout', 'Reach and discover'], country_clear: ['Secure', 'Defeat the original garrison at'],
      country_cache: ['Recover', 'Search the cache at'], country_puzzle: ['Resolve', 'Solve the riddle at'],
    };
    return { title: `${verbs[kind][0]} ${name}`, ask: `${verbs[kind][1]} ${name}. Return to the issuing Bounty Board.` };
  },
});
