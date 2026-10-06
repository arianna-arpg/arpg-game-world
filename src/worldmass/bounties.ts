import { Rng } from '../core/rng';
import { BOUNTY_BOARD_CFG, registerBountyKind, type BountyPosting } from '../data/bountyboard';
import { rollBudgetBountyPay, ensureBountyRewardChoices } from '../data/bountyRewards';
import type { World } from '../engine/world';
import type { MassAddress } from './address';
import { address, localOffset } from './address';
import type { MassPlace } from './contracts';
import { isNativeMassHoldKind, type NativeMassHoldKind } from './objectives';
import { canonical, massHash } from './random';
import type { WorldMassRuntime, MassAdventureSave } from './runtime';
import { MASS_ZONE } from './preset';

export interface MassBountySpec { source: string; maxCandidates: number }
export interface MassBountyTarget { run: string; id: string; content: string; center: MassAddress;
  /** A born native objective carries its exact definition; a neighboring hold
   * or a later recipe cannot fulfill the posting. */
  objective?: { kind: NativeMassHoldKind; definitionHash: string };
}
export interface MassBountyDestination { target:MassBountyTarget; center:MassAddress; radius:number; name:string; level:number; place?:MassPlace }
export const MASS_BOUNTY_KINDS = ['country_visit', 'country_clear', 'country_cache', 'country_puzzle', 'country_objective'] as const;
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
    || typeof t.content !== 'string' || !t.content) return undefined;
  try {
  if(t.objective){
    if(!Array.isArray(save.geography?.owners)||!isNativeMassHoldKind(t.objective.kind)||typeof t.objective.definitionHash!=='string')return undefined;
    const row=save.geography.owners.find(r=>r?.owner?.id===t.id),c=Array.isArray(row?.controllers)?row.controllers.find(c=>c?.id==='objective:'+t.objective!.kind):undefined;
    if(!row||!c||c.definitionHash!==t.objective.definitionHash||c.source!==t.content||canonical(row.owner.center)!==canonical(t.center))return undefined;
  }else if(!save.config.content.some(c=>c.id===t.content&&c.site))return undefined;
    const center = address(t.center.dimension, t.center.cx, t.center.cy, t.center.x, t.center.y, save.config.terrain.addressSpan);
    if (canonical(center) !== canonical(t.center) || center.dimension !== save.origin.dimension) return undefined;
    localOffset(center, { ...save.origin, x: 0, y: 0 }, save.config.terrain.addressSpan);
    return { run: t.run, id: t.id, content: t.content, center, ...(t.objective?{objective:{...t.objective}}:{}) };
  } catch { return undefined; }
}
export function massBountyPlace(mass: WorldMassRuntime, target?: MassBountyTarget): MassPlace | undefined {
  if (!target || target.objective || target.run !== mass.generator.run.runId) return undefined;
  return mass.placesInCell(target.center).find(p => p.id === target.id && p.content === target.content
    && canonical(p.center) === canonical(target.center));
}
export function massBountyLocal(mass: WorldMassRuntime, place: MassPlace): { x: number; y: number } {
  return localOffset(place.center, { ...mass.origin, x: 0, y: 0 }, mass.config.terrain.addressSpan);
}
/** Resolve only already-born objective ownership or an actual generated site.
 * Reading a posting neither starts a controller nor claims exploration. */
export function massBountyDestination(mass:WorldMassRuntime,target?:MassBountyTarget):MassBountyDestination|undefined{
  if(!target||target.run!==mass.generator.run.runId)return;
  try{
  if(target.objective){
    const row=mass.geography?.objectives.target(target.id);
    if(!row||row.kind!==target.objective.kind||row.definitionHash!==target.objective.definitionHash
      ||row.source!==target.content||canonical(row.center)!==canonical(target.center))return;
    return {target,center:row.center,radius:1200,name:row.name,level:row.level};
  }
  const place=massBountyPlace(mass,target),site=place&&mass.config.content.find(c=>c.id===place.content)?.site;
  return place&&site?{target,center:place.center,radius:place.radius,name:site.name,level:mass.populationFor(place).level,place}:undefined;
  }catch{return undefined;}
}
function destinationCapable(mass:WorldMassRuntime,d:MassBountyDestination,kind:string):boolean{
  return d.target.objective?kind==='country_objective':!!d.place&&capable(mass,d.place,kind);
}
function capable(mass: WorldMassRuntime, place: MassPlace, kind: string): boolean {
  const site = mass.config.content.find(c => c.id === place.content)?.site;
  return !!site && (kind === 'country_visit' || kind === 'country_clear' && !!site.completion
    || kind === 'country_cache' && !!site.cache || kind === 'country_puzzle' && !!site.puzzles?.length);
}
export function massBountyDone(world: World, p: BountyPosting): boolean {
  const mass=world.massRuntime,d=mass&&massBountyDestination(mass,p.massBounty);
  if(!mass||!d||!destinationCapable(mass,d,p.kind))return false;
  if(p.kind==='country_objective')return mass.geography?.objectives.target(d.target.id)?.complete===true;
  const place=d.place!;
  switch (p.kind) {
    case 'country_visit': return mass.sites.discovered.some(s => s.id === place.id);
    case 'country_clear': return mass.siteCleared(place.id);
    case 'country_cache': return mass.siteSearched(place.id);
    case 'country_puzzle': return mass.puzzles.activity(place.id)?.complete === true;
    default: return false;
  }
}
export function massBountyRoute(world:World,p:BountyPosting):string{
  const mass=world.massRuntime,d=mass&&massBountyDestination(mass,p.massBounty);
  if(!mass||!d)return 'Destination unavailable in this expedition';
  const at=localOffset(d.center,{...mass.origin,x:0,y:0},mass.config.terrain.addressSpan);
  const dx=at.x-world.player.pos.x,dy=at.y-world.player.pos.y;
  const direction=Math.hypot(dx,dy)<=d.radius?'here':
    ['east','southeast','south','southwest','west','northwest','north','northeast'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];
  return d.name+' · Lv '+d.level+' · '+direction;
}
export function massBountyAccept(world:World,p:BountyPosting):string|null{
  const mass=world.massRuntime,d=mass&&massBountyDestination(mass,p.massBounty);
  if(!mass||!massBountiesAvailable(world,p.boardId)||!d||!destinationCapable(mass,d,p.kind))
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
  const slate=canonical([beat,sequence]),limit=mass.config.bounties!.maxCandidates;
  const destinations=massBountyCandidates(world,slate).map(place=>massBountyDestination(mass,targetOf(mass,place))!);
  for(const row of mass.geography?.objectives.targets(Math.min(128,limit),slate)??[]){
    const target:MassBountyTarget={run:mass.generator.run.runId,id:row.owner,content:row.source,center:{...row.center},
      objective:{kind:row.kind,definitionHash:row.definitionHash}};
    const d=massBountyDestination(mass,target);if(d)destinations.push(d);
  }
  const candidates=destinations.filter(d=>!occupied.has(d.target.id)&&d.level<=world.player.level+BOUNTY_BOARD_CFG.routes.challengeAbove)
    .sort((a,b)=>massHash(slate+a.target.id)-massHash(slate+b.target.id)||a.target.id.localeCompare(b.target.id)).slice(0,limit);
  // Rotate ask families per slate, then take distinct physical destinations.
  const kinds: Kind[] = [...MASS_BOUNTY_KINDS];
  const start = rng.int(0, kinds.length - 1);
  for (let i = 0; offers.length < BOUNTY_BOARD_CFG.offers && i < BOUNTY_BOARD_CFG.offers * kinds.length; i++) {
    const kind = kinds[(start + i) % kinds.length];
    const pool=candidates.filter(d=>!occupied.has(d.target.id)&&destinationCapable(mass,d,kind)
      &&!massBountyDone(world,{kind,massBounty:d.target} as BountyPosting));
    if (!pool.length) continue;
    const manageable = pool.filter(p => p.level <= world.player.level);
    const place = rng.pick(offers.length < BOUNTY_BOARD_CFG.routes.manageableSeats && manageable.length ? manageable : pool);
    const level = place.level;
    const massBounty = place.target;
    offers.push({ id: 'country_bounty:' + canonical([mass.generator.run.runId, board, beat, sequence, kind, place.target.id]),
      boardId: board, zoneId: MASS_ZONE, beat, kind, massBounty,
      pay: rollBudgetBountyPay({ pickGemId }, rng, level, weights) });
    occupied.add(place.target.id);
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
    const destination=world.massRuntime&&massBountyDestination(world.massRuntime,p.massBounty);
    const name=destination?.name??'the country destination';
    const verbs: Record<Kind, [string, string]> = {
      country_visit: ['Scout', 'Reach and discover'], country_clear: ['Secure', 'Defeat the original garrison at'],
      country_cache: ['Recover', 'Search the cache at'], country_puzzle: ['Resolve', 'Solve the riddle at'],
      country_objective: p.massBounty?.objective?.kind==='pyres'?['Kindle','Light every pyre in']:
        p.massBounty?.objective?.kind==='rifts'?['Seal','Seal every rift in']:
        p.massBounty?.objective?.kind==='beacon'?['Attune','Attune every survey stone in']:['Unearth','Open every burial mound in'],
    };
    return { title: `${verbs[kind][0]} ${name}`, ask: `${verbs[kind][1]} ${name}. Return to the issuing Bounty Board.` };
  },
});
