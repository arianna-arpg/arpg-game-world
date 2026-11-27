import type { Seat, World } from '../engine/world';
import { summonedSkillPreview, type SummonedRoster } from '../engine/summonedSkillPreview';
import type { SessionMsg } from './transport';

type Request = Extract<SessionMsg,{t:'inspectSummon'}>;
type Result = Extract<SessionMsg,{t:'summonInspection'}>;
export type InspectionRoster = SummonedRoster & { pending?: boolean };
type Mirror = { send: (request: Request) => void; last?: Request; sentAt: number; result?: InspectionRoster };
const mirrors = new WeakMap<World, Mirror>();
const lastServed = new WeakMap<Seat, number>();
let nextRequest = 0;

export function connectSkillInspection(world: World, send: Mirror['send']): void {
  mirrors.set(world,{send,sentAt:0});
}

/** Read on demand, separately from the frequent motion snapshots. Only one body's loadout travels. */
export function inspectSummons(world: World, seat: Seat, skill: string, body?: number): InspectionRoster | undefined {
  const mirror = mirrors.get(world);
  if (!mirror) return summonedSkillPreview(world.minionsOfSkill(world.seatHero(seat),skill),body);
  const sameSkill = mirror.last?.skill === skill;
  const changed = !sameSkill || mirror.last?.body !== body;
  const now = performance.now();
  if (changed || now - mirror.sentAt >= 700) {
    if (!sameSkill) mirror.result = undefined;
    else if (changed && mirror.result && body !== mirror.result.selected?.id) mirror.result = {bodies:mirror.result.bodies,pending:true};
    const request: Request = {t:'inspectSummon',seq:changed || !mirror.last ? ++nextRequest : mirror.last.seq,skill,body};
    mirror.last = request;
    mirror.sentAt = now;
    mirror.send(request);
  }
  return mirror.result;
}

export function answerSkillInspection(world: World, peer: string, request: Request): Result | undefined {
  const seat = world.seats.find(s => s.id === peer);
  if (!seat || !seat.meta.knownSkills.has(request.skill) || !Number.isSafeInteger(request.seq)) return;
  const now = performance.now();
  if (now - (lastServed.get(seat) ?? -Infinity) < 100) return;
  lastServed.set(seat,now);
  return {t:'summonInspection',seq:request.seq,
    roster:summonedSkillPreview(world.minionsOfSkill(world.seatHero(seat),request.skill),request.body)};
}

export function receiveSkillInspection(world: World, reply: Result): void {
  const mirror = mirrors.get(world);
  if (mirror?.last?.seq === reply.seq) mirror.result = reply.roster;
}
