import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import type { NativePageRef, NativePageRoot, NativePageStorage } from '../meta/browserNativePages';
import type { MassCell } from './address';
import { cellKey, validSpan } from './address';
import { MassDormancy, captureNativeActorState, massDormancyPins, nativeDormancyRefusal, type MassDormancySave } from './dormancy';
import { canonical } from './random';
export interface PagedNativeDescriptor { id:string; monster:string; level:number; provenance:unknown }
export interface NativeCohortPage {
  schema:1;run:string;page:string;frame:MassCell;addressSpan:number;policy:MassDormancy['policy'];
  bodies:PagedNativeDescriptor[];checkpoint:MassDormancySave;
}
export interface NativeCohortLease { readonly body:string;readonly ids:readonly string[];revalidate():boolean }
const copy=<T>(v:T):T=>JSON.parse(canonical(v)) as T;
/** Only already settled, complete native cohorts qualify. No component is
 * removed to make serialization succeed; foreign graph references veto paging. */
export function stageNativeCohort(run:string,page:string,frame:MassCell,addressSpan:number,world:World,
  owned:ReadonlyMap<string,Actor>,ids:readonly string[],dormancy:MassDormancy,
  describe:(id:string,a:Actor)=>PagedNativeDescriptor):NativeCohortLease {
  validSpan(addressSpan);cellKey(frame);
  if(!run||!page||!ids.length||ids.length>96||new Set(ids).size!==ids.length)throw Error('Invalid native paging cohort');
  const members=new Map(ids.map(id=>{const a=owned.get(id);if(!a)throw Error('Missing native paging owner');return [id,a] as const;}));
  const actorIds=new Set([...members.values()].map(a=>a.id)),squads=new Set([...members.values()].map(a=>a.squadId).filter(id=>id!==undefined));
  const fingerprint=()=>canonical([...members].map(([id,a])=>[id,captureNativeActorState(a)]));
  const eligible=()=>{
    const pins=massDormancyPins(world,members);
    for(const [id,a]of members)if(owned.get(id)!==a||!dormancy.isSleeping(a)||world.actors.includes(a)||a.dead||pins.has(a)
      ||nativeDormancyRefusal(a,world,dormancy.policy.quietSeconds))return false;
    for(const [id,a]of owned)if(!members.has(id)&&a.squadId!==undefined&&squads.has(a.squadId))return false;
    const allIds=new Set([...owned.values()].map(a=>a.id));
    for(const a of owned.values())if(!actorIds.has(a.id)&&!world.actors.includes(a)&&!captureNativeActorState(a))return false;
    const values=(a:Actor)=>captureNativeActorState(a)?.nodes.flatMap(n=>n.entries.flat())??[];
    for(const a of owned.values())for(const v of values(a))if(v&&typeof v==='object'&&('actor'in v||'entity'in v)){
      const ref='actor'in v?v.actor:v.entity;
      if(actorIds.has(a.id)&&!actorIds.has(ref)&&ref!==world.player.id&&allIds.has(ref))return false;
      if(!actorIds.has(a.id)&&actorIds.has(ref))return false;
    }
    return true;
  };
  if(!eligible())throw Error('Native paging cohort is not quiescent and dependency-closed');
  const checkpoint=dormancy.snapshot(members,world);
  if(checkpoint.unsupported.length||checkpoint.sleeping.length!==members.size||checkpoint.actors.length!==members.size)
    throw Error('Native paging requires exact dormant checkpoints');
  // Capture the eligible live state again at THIS transaction boundary. The
  // dormancy cache predates a possible external mutation during an earlier
  // failed commit; writing that older frozen graph would silently lose it.
  checkpoint.dictionary=[];checkpoint.nodeDictionary=[];
  const entries=new Map<string,number>(),nodes=new Map<string,number>();
  for(const row of checkpoint.actors){const state=captureNativeActorState(members.get(row.id)!)!;
    row.state={version:2,root:state.root,nodes:state.nodes.map(n=>{
      const node={kind:n.kind,entries:n.entries.map(pair=>{const key=JSON.stringify(pair),hit=entries.get(key);if(hit!==undefined)return hit;
        const i=checkpoint.dictionary.length;checkpoint.dictionary.push(pair);entries.set(key,i);return i;})};
      const key=JSON.stringify(node),hit=nodes.get(key);if(hit!==undefined)return hit;
      const i=checkpoint.nodeDictionary.length;checkpoint.nodeDictionary.push(node);nodes.set(key,i);return i;
    })};}
  const bodies=[...members].map(([id,a])=>{const d=describe(id,a);
    if(d.id!==id||d.monster!==a.defId||d.level!==a.level)throw Error('Native paging descriptor disagrees with actor');return copy(d);});
  const data:NativeCohortPage={schema:1,run,page,frame:copy(frame),addressSpan,policy:copy(dormancy.policy),bodies,checkpoint};
  const signature=fingerprint(),body=canonical(data);
  return {body,ids:[...ids],revalidate:()=>eligible()&&signature===fingerprint()};
}
/** Page first, then the authoritative root, then recheck the live lease. The
 * caller's synchronous release must remove ALL actor/codec owner references.
 * A failed or stale commit never calls release. This is not runtime wiring. */
export async function commitNativeCohort(storage:NativePageStorage,lease:NativeCohortLease,
  root:{slot:string;run:string;body:string;pages:readonly NativePageRef[];expectedRevision:number},
  release:(ids:readonly string[])=>void):Promise<{root:NativePageRoot;page:NativePageRef;released:boolean}> {
  if(!lease.revalidate())throw Error('Stale native paging lease');
  const data=JSON.parse(lease.body) as NativeCohortPage;if(data.run!==root.run)throw Error('Foreign native paging run');
  const page=await storage.writePage(root.run,data.page,lease.body);
  if(!lease.revalidate())throw Error('Native changed during page staging');
  const pages=[...root.pages.filter(p=>p.page!==page.page),page];
  const committed=await storage.publish(root.slot,root.run,root.body,pages,root.expectedRevision);
  if(!lease.revalidate())return {root:committed,page,released:false};
  release(lease.ids);return {root:committed,page,released:true};
}
export interface NativePageHydrationHost {
  /** Factories must return DETACHED native bodies. Publication comes afterward. */
  create(descriptor:PagedNativeDescriptor):Actor;
  /** Native group owner allocates collision-free group IDs before decoding. */
  groups(identities:MassDormancySave['identities'],actors:ReadonlyMap<string,Actor>):void;
}
/** Missing/corrupt transport is rejected before any native factory runs. The
 * complete page decodes off-world; a malformed codec cannot partly mount it. */
export async function hydrateNativeCohort(storage:Pick<NativePageStorage,'readPage'>,ref:NativePageRef,frame:MassCell,addressSpan:number,
  player:Actor,host:NativePageHydrationHost):Promise<{page:NativeCohortPage;actors:Map<string,Actor>;dormancy:MassDormancy}>{
  const body=await storage.readPage(ref);const page=JSON.parse(body) as NativeCohortPage;
  if(page.schema!==1||page.run!==ref.run||page.page!==ref.page||canonical(page.frame)!==canonical(frame)||page.addressSpan!==addressSpan
    ||!Array.isArray(page.bodies)||!page.bodies.length||page.bodies.length>96||new Set(page.bodies.map(b=>b.id)).size!==page.bodies.length
    ||page.bodies.some(b=>!b.id||!b.monster||!Number.isFinite(b.level)||b.level<1)
    ||page.checkpoint?.unsupported?.length||page.checkpoint?.identities?.length!==page.bodies.length
    ||page.checkpoint?.sleeping?.length!==page.bodies.length||page.checkpoint?.actors?.length!==page.bodies.length
    ||page.bodies.some(b=>!page.checkpoint.identities.some(i=>i.id===b.id)))throw Error('Invalid or incompatible native cohort page');
  const actors=new Map(page.bodies.map(d=>{const a=host.create(d);if(a.defId!==d.monster||a.level!==d.level)throw Error('Wrong native page factory');return [d.id,a] as const;}));
  host.groups(page.checkpoint.identities,actors);
  const dormancy=new MassDormancy(page.policy);
  // The native codec only reads player and writes the actors/revision fields.
  // A detached restore view prevents partially decoded bodies entering World.
  const view={player,actors:[] as Actor[],actorGridRev:0} as World;
  dormancy.restore(page.checkpoint,actors,view);
  return {page,actors,dormancy};
}
