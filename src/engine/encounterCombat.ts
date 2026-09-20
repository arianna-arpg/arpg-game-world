import type { EncounterCueSpec } from '../data/warningCues';
import type { EncounterCue } from './warningCues';
import { dist } from '../core/math';
import type { Actor } from './actor';
import type { World } from './world';
import { castRemaining, type BrainTuning } from './brain';
import { ENCOUNTER_GROUPS } from '../data/encounterGroups';
import { ENCOUNTER_TACTICS, ENCOUNTER_COMBAT_CFG } from '../data/encounterTactics';

export interface EncounterCombatSpec {
  plans: string[];
  /** Map composition slots onto reusable tactical roles. */
  roles?: Record<string, string>;
  /** Local visual overrides on shared maneuvers (unknown styles fall back). */
  cues?: Record<string, EncounterCueSpec>;
  /** Legacy reference data; no gameplay emitter reads these strings. */
  signals?: Record<string, string>;
  minLevel?: number;
  thinkEvery?: number;
  /** Communication and observation range around the living leader. */
  radius?: number;
}
export type EncounterFact = 'distance' | 'injury' | 'pressure' | 'cluster' | 'casting' | 'count';
export interface EncounterConsideration {
  fact: EncounterFact;
  role?: string;
  /** pressure/cluster distance; casting returns remaining visible cast seconds. */
  radius?: number;
  min?: number; max?: number;
  weight?: number;
}
export interface EncounterAssignment {
  roles: string[];
  max?: number;
  use: BrainTuning;
  focus?: boolean;
  ward?: string;
}
export interface EncounterTactic {
  id: string; name: string; color: string;
  cue?: EncounterCueSpec;
  /** Legacy reference text, never emitted during combat. */
  signal?: string;
  minLevel: number;
  /** A utility decision: gates admit plans, weighted facts rank them. */
  base: number;
  needs: Record<string, number>;
  when: EncounterConsideration[];
  score?: EncounterConsideration[];
  warning: number; duration: number; recovery: number; cooldown: number;
  assignments: EncounterAssignment[];
  recover?: BrainTuning;
}
export interface EncounterOrder {
  group: number; recipe: string; plan: string; leader: number;
  phase: 'warning' | 'commit' | 'recover'; until: number;
  use?: BrainTuning; target?: number; ward?: number;
}
export interface EncounterObservation {
  members: Actor[]; roles: Map<Actor,string>; leader: Actor;
  targets: Actor[]; target: Actor;
}
interface PlanState {
  nextThink: number; cooldowns: Map<string,number>;
  plan?: EncounterTactic; phase?: EncounterOrder['phase']; until: number;
  target?: Actor; leader?: Actor; participants: Actor[];
}
const worlds = new WeakMap<World,{zone: World['zone']; groups: Map<number,PlanState>}>();
const fit = (a: Actor) => !a.dead && !a.downed && !a.passive && !a.owner && a.team === 'enemy';
const ready = (a: Actor, w: World) => fit(a) && !a.isStunned() && !a.burrow && !a.ambushArmed
  && (a.emergeUntil ?? 0) <= w.time && a.aiMoraleUntil <= w.time && w.timeflow.scaleFor(a) > 0;
const roleMembers = (o: EncounterObservation, role?: string) => role ? o.members.filter(a=>o.roles.get(a)===role) : o.members;

/** Facts refer only to the engaged group's currently visible quarry and its
 * own local members. No player inventory, build tags, input or future aim. */
export function encounterFact(c: EncounterConsideration, o: EncounterObservation): number {
  const members = roleMembers(o,c.role);
  switch(c.fact) {
    case 'count': return members.length;
    case 'distance': return dist(o.leader.pos,o.target.pos);
    case 'injury': return Math.max(0,...members.map(a=>1-a.life/a.maxLife()));
    case 'pressure': return o.targets.filter(t=>members.some(a=>dist(a.pos,t.pos)<=(c.radius ?? 150))).length;
    case 'cluster': return o.targets.filter(t=>dist(t.pos,o.target.pos)<=(c.radius ?? 140)).length;
    case 'casting': return castRemaining(o.target);
  }
}
export function scoreEncounterTactic(p: EncounterTactic, o: EncounterObservation): number {
  if (o.leader.level < p.minLevel || Object.entries(p.needs).some(([r,n])=>roleMembers(o,r).length<n)) return -Infinity;
  if (p.when.some(c=>{ const v=encounterFact(c,o); return v<(c.min ?? -Infinity)||v>(c.max ?? Infinity); })) return -Infinity;
  return p.base+(p.score ?? []).reduce((s,c)=>s+encounterFact(c,o)*(c.weight ?? 1),0);
}
function observe(w: World, members: Actor[], spec: EncounterCombatSpec): EncounterObservation | undefined {
  const leader=members.find(a=>a.encounterGroup?.leader && ready(a,w));
  if (!leader) return;
  const radius=spec.radius ?? ENCOUNTER_COMBAT_CFG.radius;
  const local=members.filter(a=>ready(a,w) && a.tier===leader.tier && dist(a.pos,leader.pos)<=radius);
  const targets: Actor[]=[];
  for(const a of local) for(const id of [a.aiTargetId,a.aiHitById]) {
    if(id===undefined) continue;
    const t=w.actorById(id);
    if(!t || t.dead || t.downed || t.passive || t.untargetable || t.tier!==leader.tier || t.sheet.get('invisible')>0
      || dist(t.pos,leader.pos)>radius || !w.hostileTo(a,t)
      || !w.lineOfSight(a.pos,t.pos,a.tier,t.tier) || targets.includes(t)) continue;
    targets.push(t);
  }
  if(!targets.length) return;
  // Deterministic shared quarry: closest observed threat to the support line,
  // otherwise the leader. The commitment freezes its identity, not its aim.
  const roles=new Map(local.map(a=>[a,spec.roles?.[a.encounterGroup!.slot]
    ?? ENCOUNTER_GROUPS[a.encounterGroup!.recipe].members.find(m=>m.slot===a.encounterGroup!.slot)!.role]));
  const wards=local.filter(a=>roles.get(a)==='support');
  targets.sort((a,b)=>Math.min(...(wards.length?wards:[leader]).map(x=>dist(x.pos,a.pos)))
    -Math.min(...(wards.length?wards:[leader]).map(x=>dist(x.pos,b.pos))) || a.id-b.id);
  return {members:local,roles,leader,targets,target:targets[0]};
}
function release(s: PlanState): void {
  for(const a of s.participants) if(a.encounterOrder?.plan===s.plan?.id) a.encounterOrder=undefined;
  s.participants=[];
}
function recovery(w: World,s: PlanState): void {
  const p=s.plan!;
  s.phase='recover'; s.until=w.time+p.recovery;
  for(const a of s.participants) if(a.encounterOrder) a.encounterOrder={...a.encounterOrder,phase:'recover',until:s.until,use:p.recover,target:undefined,ward:undefined};
  // encounterCueOf follows the recovery clock, including disrupted conductors.
}
/** One bounded utility planner per group; no direct casts, teleports, stat
 * bonuses, resource refunds or replacement damage rules. */
export function updateEncounterCombat(w: World): void {
  if(w.clientActionHook || w.gameOver) return;
  let runtime=worlds.get(w);
  if(!runtime || runtime.zone!==w.zone) {
    if(runtime) for(const s of runtime.groups.values()) release(s);
    runtime={zone:w.zone,groups:new Map()}; worlds.set(w,runtime);
  }
  const groups=new Map<number,Actor[]>();
  for(const a of w.actors) {
    const g=a.encounterGroup;
    if(!g || !fit(a) || a.faction!==ENCOUNTER_GROUPS[g.recipe]?.faction) { a.encounterOrder=undefined; continue; }
    if(!ENCOUNTER_GROUPS[g.recipe].encounterCombat) continue;
    const list=groups.get(g.id) ?? []; list.push(a); groups.set(g.id,list);
  }
  for(const [id,s] of runtime.groups) if(!groups.has(id)) { release(s); runtime.groups.delete(id); }
  for(const [id,members] of groups) {
    const recipe=members[0].encounterGroup!.recipe, spec=ENCOUNTER_GROUPS[recipe].encounterCombat!;
    let s=runtime.groups.get(id);
    if(!s) { s={nextThink:w.time+ENCOUNTER_COMBAT_CFG.initialDelay,cooldowns:new Map(),until:0,participants:[]}; runtime.groups.set(id,s); }
    if(s.phase==='recover') {
      if(w.time<s.until) continue;
      release(s); s.plan=undefined; s.phase=undefined;
      s.nextThink=w.time+(spec.thinkEvery ?? ENCOUNTER_COMBAT_CFG.thinkEvery); continue;
    }
    // Losing or interrupting the conductor breaks coordination immediately.
    if(s.plan && (!s.leader || !members.includes(s.leader) || !ready(s.leader,w)
      || !s.target || s.target.dead || s.target.downed || s.target.tier!==s.leader.tier
      || s.participants.some(a=>!members.includes(a)))) { recovery(w,s); continue; }
    if(w.time<s.nextThink && (!s.phase || w.time<s.until)) continue;
    s.nextThink=w.time+(spec.thinkEvery ?? ENCOUNTER_COMBAT_CFG.thinkEvery);
    const o=observe(w,members,spec);
    if(s.plan) {
      if(!o || !o.targets.includes(s.target!) || Object.entries(s.plan.needs).some(([r,n])=>roleMembers(o,r).length<n)) { recovery(w,s); continue; }
      if(w.time<s.until) continue;
      if(s.phase==='commit') { recovery(w,s); continue; }
      s.phase='commit'; s.until=w.time+s.plan.duration;
      for(const a of s.participants) if(a.encounterOrder) a.encounterOrder={...a.encounterOrder,phase:'commit',until:s.until};
      continue;
    }
    if(!o || o.leader.level<(spec.minLevel ?? 1)) continue;
    let chosen:EncounterTactic|undefined, best=-Infinity;
    for(const key of spec.plans) {
      const p=ENCOUNTER_TACTICS[key]; if(!p || (s.cooldowns.get(key) ?? 0)>w.time) continue;
      const score=scoreEncounterTactic(p,o);
      if(score>best) {best=score;chosen=p;}
    }
    if(!chosen) continue;
    s.plan=chosen; s.phase='warning'; s.until=w.time+chosen.warning; s.target=o.target; s.leader=o.leader;
    s.cooldowns.set(chosen.id,w.time+chosen.warning+chosen.duration+chosen.recovery+chosen.cooldown);
    for(const assignment of chosen.assignments) {
      const ward=assignment.ward ? roleMembers(o,assignment.ward).sort((a,b)=>a.life/a.maxLife()-b.life/b.maxLife())[0] : undefined;
      for(const a of o.members.filter(a=>assignment.roles.includes(o.roles.get(a)!)).sort((a,b)=>a.id-b.id).slice(0,assignment.max ?? Infinity)) {
        if(s.participants.includes(a)) continue;
        s.participants.push(a);
        a.encounterOrder={group:id,recipe,plan:chosen.id,leader:o.leader.id,phase:'warning',until:s.until,
          use:assignment.use,target:assignment.focus?o.target.id:undefined,ward:ward?.id};
      }
    }
    // Presentation reads this bounded plan directly; no detached warning flash.
  }
}
function order(a: Actor,w: World): EncounterOrder | undefined {
  const o=a.encounterOrder;
  if(!o || !fit(a) || a.aiCommand || a.standingOrder || !a.encounterGroup || o.group!==a.encounterGroup.id || o.recipe!==a.encounterGroup.recipe || o.until<=w.time) return;
  const leader=w.actorById(o.leader);
  if(o.phase!=='recover' && (!leader || !ready(leader,w) || leader.encounterGroup?.id!==o.group)) return;
  if(leader && (a.tier!==leader.tier || dist(a.pos,leader.pos)>(ENCOUNTER_GROUPS[o.recipe]?.encounterCombat?.radius ?? ENCOUNTER_COMBAT_CFG.radius))) return;
  return o;
}
export function encounterOrderTuning(a: Actor,w: World): BrainTuning | undefined {
  const o=order(a,w); return o && o.phase!=='warning' ? o.use : undefined;
}
export function encounterOrderTarget(a: Actor,w: World): Actor | undefined {
  const o=order(a,w); if(o?.phase!=='commit' || o.target===undefined) return;
  const t=w.actorById(o.target);
  if(t && !t.dead && !t.downed && !t.passive && !t.untargetable && t.sheet.get('invisible')<=0 && t.tier===a.tier
    && w.hostileTo(a,t) && w.lineOfSight(a.pos,t.pos,a.tier,t.tier)) return t;
}
export function encounterOrderWard(a: Actor,w: World): Actor | undefined {
  const o=order(a,w); if(o?.phase!=='commit' || o.ward===undefined) return;
  const ward=w.actorById(o.ward);
  if(ward && fit(ward) && ward.encounterGroup?.id===o.group && ward.tier===a.tier
    && dist(a.pos,ward.pos)<=(ENCOUNTER_GROUPS[o.recipe]?.encounterCombat?.radius ?? ENCOUNTER_COMBAT_CFG.radius)) return ward;
}
export function encounterCombatErrors(): string[] {
  const errors:string[]=[];
  for(const [id,p] of Object.entries(ENCOUNTER_TACTICS)) {
    const bad=(s:string)=>errors.push(`encounterCombat ${id}: ${s}`);
    if(id!==p.id || !Number.isFinite(p.base) || !Number.isFinite(p.minLevel) || p.minLevel<1) bad('invalid identity/score/level');
    for(const key of ['warning','duration','recovery','cooldown'] as const) if(!Number.isFinite(p[key]) || p[key]<=0) bad(`invalid ${key}`);
    for(const [r,n] of Object.entries(p.needs)) if(!r || !Number.isInteger(n)||n<1) bad('invalid required role');
    for(const c of [...p.when,...p.score??[]]) {
      if(!['distance','injury','pressure','cluster','casting','count'].includes(c.fact)) bad('unknown fact');
      if(c.min!==undefined && !Number.isFinite(c.min) || c.max!==undefined && !Number.isFinite(c.max)
        || c.weight!==undefined && !Number.isFinite(c.weight) || c.radius!==undefined && (!Number.isFinite(c.radius)||c.radius<=0)
        || (c.min??-Infinity)>(c.max??Infinity)) bad('invalid consideration');
    }
    if(!p.assignments.length) bad('empty assignments');
    for(const a of p.assignments) if(!a.roles.length || a.max!==undefined && (!Number.isInteger(a.max)||a.max<1)) bad('invalid role assignment');
  }
  for(const g of Object.values(ENCOUNTER_GROUPS)) if(g.encounterCombat) {
    const c=g.encounterCombat;
    for(const id of c.plans) if(!ENCOUNTER_TACTICS[id]) errors.push(`encounterCombat ${g.id}: unknown plan ${id}`);
    for(const slot of Object.keys(c.roles??{})) if(!g.members.some(m=>m.slot===slot)) errors.push(`encounterCombat ${g.id}: unknown slot ${slot}`);
    for(const [key,v] of Object.entries(c.cues??{})) if(!c.plans.includes(key)||!v.style) errors.push(`encounterCombat ${g.id}: invalid cue ${key}`);
    for(const key of Object.keys(c.signals??{})) if(!c.plans.includes(key)||!c.signals![key]) errors.push(`encounterCombat ${g.id}: invalid signal ${key}`);
    const capacity=(role:string)=>g.members.filter(m=>(c.roles?.[m.slot]??m.role)===role).reduce((n,m)=>n+(m.count?.[1]??1),0);
    for(const id of c.plans) for(const [role,n] of Object.entries(ENCOUNTER_TACTICS[id]?.needs??{}))
      if(capacity(role)<n) errors.push(`encounterCombat ${g.id}: ${id} cannot fill role ${role}`);
    for(const n of [c.thinkEvery,c.radius,c.minLevel]) if(n!==undefined && (!Number.isFinite(n)||n<=0)) errors.push(`encounterCombat ${g.id}: invalid timing/range/level`);
  }
  return errors;
}

/** Read the actual planner state without mutating AI. Leaders may conduct a
 * plan without receiving an assignment (e.g. the piper directing flankers). */
export function encounterCueOf(a: Actor,w: World): EncounterCue | undefined {
  if(!a.encounterGroup && !a.encounterCue) return;
  if(a.dead || a.downed || a.isStunned()) return;
  if(a.encounterCue) return a.encounterCue;
  const g=a.encounterGroup, runtime=worlds.get(w);
  if(!g || a.faction!==ENCOUNTER_GROUPS[g.recipe]?.faction || !runtime || runtime.zone!==w.zone || !ready(a,w) || a.aiCommand || a.standingOrder) return;
  const s=runtime.groups.get(g.id), spec=ENCOUNTER_GROUPS[g.recipe]?.encounterCombat;
  if(!s?.plan || !s.phase || !s.leader || !spec || s.until<=w.time) return;
  const conductor=a===s.leader;
  if(!conductor && !order(a,w)) return;
  if(s.phase!=='recover' && !ready(s.leader,w)) return;
  if(a.tier!==s.leader.tier || dist(a.pos,s.leader.pos)>(spec.radius ?? ENCOUNTER_COMBAT_CFG.radius)) return;
  const p=s.plan, cue=spec.cues?.[p.id] ?? p.cue;
  const span=s.phase==='warning'?p.warning:s.phase==='commit'?p.duration:p.recovery;
  return {group:g.id,leader:s.leader.id,plan:p.id,style:cue?.style ?? 'gather',color:cue?.color ?? p.color,
    phase:s.phase,progress:Math.max(0,Math.min(1,1-(s.until-w.time)/span)),conductor,facing:a.facing};
}
