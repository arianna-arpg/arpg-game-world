import { Actor } from '../engine/actor';
import { StatSheet } from '../engine/stats';
import type { World } from '../engine/world';

/** Dormancy freezes a settled native body; it never means a death or a new birth.
 * Live native dependencies are authoritative and veto retirement. This is not
 * an offscreen battle simulator, a universal actor serializer, or save paging. */
export interface MassDormancyPolicy {
  source: string; wakeRadius: number; sleepRadius: number; quietSeconds: number;
}
export function validateMassDormancy(p: MassDormancyPolicy, populationRadius = 0): void {
  if (!p || !p.source || ![p.wakeRadius,p.sleepRadius,p.quietSeconds].every(Number.isFinite)
    || p.wakeRadius < populationRadius || p.sleepRadius < p.wakeRadius + 256
    || p.sleepRadius > 16384 || p.quietSeconds < 5 || p.quietSeconds > 300)
    throw Error('Invalid worldmass population dormancy');
}

type Value = null | boolean | string | number | { ref: number } | { actor: number }
  | { entity: number } | { squad: number } | { special: 'undefined' | 'nan' | 'positive' | 'negative' };
interface Node { kind: 'object' | 'array' | 'map' | 'set' | 'float64' | 'sheet'; entries: [Value,Value][] }
export interface NativeActorState { version: 1; root: Value; nodes: Node[] }
interface PackedNode {kind:Node['kind']; entries:number[]}
interface PackedActorState { version: 2; root: Value; nodes: number[] }
/** Bound the first retirement pass; subsequent ticks finish distant cohorts. */
export const MASS_DORMANCY_RETIRE_BUDGET = 16;
export interface MassDormancySave {
  schema: 1; clock: number; playerId: number;
  dictionary: [Value,Value][];
  nodeDictionary: PackedNode[];
  identities: { id: string; actorId: number; squadId?: number }[];
  actors: { id: string; actorId: number; squadId?: number; state: PackedActorState }[];
  sleeping: string[];
  /** Resident bodies use the native scene-save policy, never an invented
   * resumable combat snapshot. Only sleepers receive exact state records. */
  unsupported: string[];
}

const entityKeys = new Set(['aiTargetId','aiHitById','lastFoeId','watchQuarryId','aiRingTarget',
  'mountId','patrolFollow','bornOf','lifelineId','gateLink','heldBy','casterId','targetId','ownerId',
  'sourceId','victimId','preyId','quarryId','orbitAnchorId','echoPrey','necroId','cartId']);
// Attribution histories are not live dependency leases. They still remap in saves.
const dependencyKeys = new Set([...entityKeys].filter(k=>!['aiHitById','lastFoeId'].includes(k)));
/** A certificate covers only deeply immutable, plain, dependency-free data.
 * Actor identities, numeric reference fields, accessors, mutable collections,
 * unknown classes and cycles always fall back to ordinary dependency scanning.
 * Weak membership neither retains terrain history nor needs a mutation epoch:
 * every property of a certified graph is a frozen data descriptor. */
const dependencyFreeData=new WeakSet<object>();
function isDependencyFreeData(value:object,active?:Set<object>,budget?:{left:number}):boolean {
  if(dependencyFreeData.has(value))return true;
  const proto=Object.getPrototypeOf(value);
  if(proto!==Object.prototype&&proto!==null&&proto!==Array.prototype||!Object.isFrozen(value))return false;
  active??=new Set<object>();budget??={left:4096};
  if(--budget.left<0||active.size>=64||active.has(value))return false;
  active.add(value);
  try {
    for(const [key,descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))){
      if(!descriptor.enumerable)continue;
      // Inspection never invokes getters. Fallback keeps the original scanner
      // semantics, including one ordinary read of an enumerable accessor.
      if(!('value' in descriptor))return false;
      const child:unknown=descriptor.value;
      // Reject possible IDs even before they belong to this owner. Otherwise a
      // future actor could make a formerly harmless frozen record a live lease.
      if(typeof child==='number'&&dependencyKeys.has(key))return false;
      if(child!==null&&typeof child==='object'&&!isDependencyFreeData(child,active,budget))return false;
    }
    dependencyFreeData.add(value);return true;
  } finally {active.delete(value);}
}
const rootExcluded = new Set(['id','statusRelay','gridSeq']);
const unsafeKeys = new Set(['__proto__','prototype','constructor']);
/** Captured class fields cannot replace prototype behavior or accessors. Read
 * descriptors rather than invoking a getter during the pure validation pass. */
function nativePrototypeProperty(prototype: object, key: string): boolean {
  for (let p: object | null = prototype; p; p = Object.getPrototypeOf(p)) {
    const d = Object.getOwnPropertyDescriptor(p, key);
    if (d) return !!d.get || !!d.set || typeof d.value === 'function' || d.writable === false;
  }
  return false;
}

/** Exact data graph for the supported native classes. Unlike JSON.stringify,
 * this retains aliases, Maps, Sets, typed recency clocks and Infinity sentinels.
 * The native factory owns methods and statusRelay. Every other function or
 * class refuses the checkpoint; no opaque component is silently dropped. */
export function captureNativeActorState(actor: Actor): NativeActorState | null {
  const nodes: Node[] = [], seen = new Map<object,number>();
  const encode = (v: unknown, key = '', root = false, squad = false): Value => {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (v === undefined) return {special:'undefined'};
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) return {special:Number.isNaN(v)?'nan':v>0?'positive':'negative'};
      if (squad && key === 'id' || key === 'squadId') return {squad:v};
      if (entityKeys.has(key) && v >= 0) return {entity:v};
      return v;
    }
    if (typeof v !== 'object') throw Error('Unsupported native value');
    if (v instanceof Actor && !root) return {actor:v.id};
    const hit = seen.get(v); if (hit !== undefined) return {ref:hit};
    const kind: Node['kind'] = root ? 'object' : v instanceof StatSheet ? 'sheet'
      : Array.isArray(v) ? 'array' : v instanceof Map ? 'map' : v instanceof Set ? 'set'
      : v instanceof Float64Array ? 'float64' : Object.getPrototypeOf(v) === Object.prototype
        || Object.getPrototypeOf(v) === null ? 'object' : (()=>{throw Error('Unsupported native class');})();
    const index = nodes.length, node:Node = {kind,entries:[]}; nodes.push(node); seen.set(v,index);
    if (nodes.length > 16384) throw Error('Native checkpoint exceeds object budget');
    if (v instanceof Map) for (const [k,x] of v) node.entries.push([encode(k),encode(x)]);
    else if (v instanceof Set) for (const x of v) node.entries.push([null,encode(x)]);
    else if (v instanceof Float64Array) v.forEach((x,i)=>node.entries.push([i,encode(x)]));
    else for (const [k,x] of Object.entries(v)) {
      if (root && rootExcluded.has(k)) continue;
      if (unsafeKeys.has(k)) throw Error('Unsupported native property');
      node.entries.push([k,encode(x,k,false,v===actor.magicPack||v===actor.encounterGroup)]);
    }
    return {ref:index};
  };
  try { return {version:1,root:encode(actor,'',true),nodes}; } catch { return null; }
}

/** The decoder and streamed page preflight share this structural gate.
 * It inspects packed data without constructing an Actor or decoded graph. */
export function validateNativeActorState(saved: NativeActorState, expected: {
  monster: string; team: string; actors: ReadonlySet<number>; squads: ReadonlySet<number>;
  level?: number; life?: number; position?: { x: number; y: number };
}): void {
  const fail = (): never => { throw Error('Invalid native actor checkpoint'); };
  if (saved?.version !== 1 || !Array.isArray(saved.nodes) || !saved.nodes.length || saved.nodes.length > 16384) fail();
  const value = (v: Value, key = ''): void => {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return;
    if (typeof v === 'number') { if (!Number.isFinite(v)) fail(); return; }
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== 1) fail();
    if ('ref' in v) { if (!Number.isSafeInteger(v.ref) || v.ref < 0 || v.ref >= saved.nodes.length) fail(); return; }
    if ('actor' in v) { if (!Number.isSafeInteger(v.actor) || !expected.actors.has(v.actor)) fail(); return; }
    // Unresolved historical numeric IDs intentionally become negative sentinels.
    if ('entity' in v) { if (!Number.isSafeInteger(v.entity) || v.entity < 0 || dependencyKeys.has(key) && !expected.actors.has(v.entity)) fail(); return; }
    if ('squad' in v) { if (!Number.isSafeInteger(v.squad) || !expected.squads.has(v.squad)) fail(); return; }
    if ('special' in v && ['undefined', 'nan', 'positive', 'negative'].includes(v.special)) return;
    fail();
  };
  for (const node of saved.nodes) {
    if (!node || !['object', 'array', 'map', 'set', 'float64', 'sheet'].includes(node.kind) || !Array.isArray(node.entries)) fail();
    const properties = new Set<string>();
    for (let i = 0; i < node.entries.length; i++) {
      const pair = node.entries[i];
      if (!Array.isArray(pair) || pair.length !== 2) fail();
      const [key, v] = pair; value(v, typeof key === 'string' ? key : '');
      if (node.kind === 'map') value(key);
      else if (node.kind === 'set') { if (key !== null) fail(); }
      else if (node.kind === 'float64') {
        // The encoder emits one numeric index in order, and numbers only.
        // Named fields can target readonly accessors; refs/strings would invoke
        // numeric coercion during decode (possibly throwing or losing data).
        if (key !== i || typeof v !== 'number' && !(v && typeof v === 'object'
          && 'special' in v && ['nan', 'positive', 'negative'].includes(v.special))) fail();
      } else {
        // Object.entries emits string own keys. Array length is nonenumerable
        // and is never emitted, even for sparse arrays or named properties.
        if (typeof key !== 'string' || unsafeKeys.has(key) || properties.has(key)
          || node.kind === 'array' && key === 'length'
          || node.kind === 'sheet' && nativePrototypeProperty(StatSheet.prototype, key)) fail();
        properties.add(key as string);
      }
    }
  }
  value(saved.root);
  if (!saved.root || typeof saved.root !== 'object' || !('ref' in saved.root)) fail();
  const root = saved.nodes[(saved.root as { ref: number }).ref];
  if (root.kind !== 'object') fail();
  const fields = new Map(root.entries.map(([k, v]) => [String(k), v]));
  if (fields.size !== root.entries.length || fields.get('defId') !== expected.monster || fields.get('team') !== expected.team
    || typeof fields.get('life') !== 'number' || !Number.isFinite(fields.get('life')) || (fields.get('life') as number) <= 0
    || expected.level !== undefined && fields.get('level') !== expected.level
    || expected.life !== undefined && fields.get('life') !== expected.life) fail();
  const sheet = fields.get('sheet');
  if (!sheet || typeof sheet !== 'object' || !('ref' in sheet) || saved.nodes[sheet.ref]?.kind !== 'sheet') fail();
  if (expected.position) {
    const pos = fields.get('pos');
    if (!pos || typeof pos !== 'object' || !('ref' in pos) || saved.nodes[pos.ref]?.kind !== 'object') fail();
    const point = new Map(saved.nodes[(pos as { ref: number }).ref].entries);
    if (!Number.isFinite(expected.position.x) || !Number.isFinite(expected.position.y)
      || point.get('x') !== expected.position.x || point.get('y') !== expected.position.y) fail();
  }
  for (const key of fields.keys()) if (rootExcluded.has(key) || nativePrototypeProperty(Actor.prototype, key)) fail();
}

export function unpackNativeCheckpoint(saved: MassDormancySave, state: PackedActorState): NativeActorState {
  if (state?.version !== 2 || !Array.isArray(state.nodes)) throw Error('Invalid packed native checkpoint');
  return { version: 1, root: state.root, nodes: state.nodes.map(index => {
    if (!Number.isSafeInteger(index) || index < 0 || index >= saved.nodeDictionary.length) throw Error('Invalid native node dictionary reference');
    const node = saved.nodeDictionary[index];
    if (!node || !Array.isArray(node.entries)) throw Error('Invalid native node dictionary');
    return { kind: node.kind, entries: node.entries.map(i => {
      if (!Number.isSafeInteger(i) || i < 0 || i >= saved.dictionary.length) throw Error('Invalid native dictionary reference');
      return saved.dictionary[i];
    }) };
  }) };
}

export function validateNativeDormancyCheckpoint(saved: MassDormancySave,
  bodies: readonly { id: string; monster: string; team?: string; level?: number; life?: number; x?: number; y?: number }[],
  requireSleeping = false, formations?: ReadonlyMap<string, number | undefined>): void {
  const fail = (): never => { throw Error('Invalid population dormancy checkpoint'); };
  if (saved?.schema !== 1 || !Number.isFinite(saved.clock) || !Number.isSafeInteger(saved.playerId)
    || !Array.isArray(saved.dictionary) || !Array.isArray(saved.nodeDictionary) || !Array.isArray(saved.identities)
    || !Array.isArray(saved.actors) || !Array.isArray(saved.sleeping) || !Array.isArray(saved.unsupported)) fail();
  const expected = new Map(bodies.map(b => [b.id, b]));
  if (expected.size !== bodies.length || saved.identities.length !== bodies.length) fail();
  const identities = new Map<string, MassDormancySave['identities'][number]>(), actors = new Set([saved.playerId]), squads = new Set<number>();
  for (const row of saved.identities) {
    if (!row || !expected.has(row.id) || identities.has(row.id) || !Number.isSafeInteger(row.actorId) || actors.has(row.actorId)
      || row.squadId !== undefined && !Number.isSafeInteger(row.squadId)) fail();
    if (formations && (!formations.has(row.id) || formations.get(row.id) !== row.squadId)) fail();
    identities.set(row.id, row); actors.add(row.actorId); if (row.squadId !== undefined) squads.add(row.squadId);
  }
  const exact = new Set<string>();
  for (const row of saved.actors) {
    const identity = identities.get(row.id), body = expected.get(row.id);
    if (!identity || !body || exact.has(row.id) || identity.actorId !== row.actorId || identity.squadId !== row.squadId) fail();
    exact.add(row.id);
    const state = unpackNativeCheckpoint(saved, row.state);
    validateNativeActorState(state, { monster: body!.monster, team: body!.team ?? 'enemy',
      actors, squads, ...(body!.level === undefined ? {} : { level: body!.level }), ...(body!.life === undefined ? {} : { life: body!.life }),
      ...(body!.x === undefined && body!.y === undefined ? {} : { position: { x: body!.x!, y: body!.y! } }) });
    const root = state.nodes[(state.root as { ref: number }).ref];
    const squad = root.entries.find(([key]) => key === 'squadId')?.[1];
    if (row.squadId === undefined ? squad !== undefined && !(squad && typeof squad === 'object' && 'special' in squad && squad.special === 'undefined')
      : !squad || typeof squad !== 'object' || !('squad' in squad) || squad.squad !== row.squadId) fail();
  }
  if (new Set(saved.sleeping).size !== saved.sleeping.length || saved.sleeping.some(id => !exact.has(id))
    || new Set(saved.unsupported).size !== saved.unsupported.length || saved.unsupported.some(id => !identities.has(id) || exact.has(id))
    || requireSleeping && (saved.unsupported.length || exact.size !== bodies.length || saved.sleeping.length !== bodies.length)) fail();
}

/** Decode completely before changing the live actor, so an invalid record never
 * leaves a half-restored sheet. IDs remap through the owner's recreated bodies;
 * absent historical targets remain absent, never alias a newly born actor. */
export function restoreNativeActorState(actor: Actor, saved: NativeActorState,
  actors: ReadonlyMap<number,Actor>, squads: ReadonlyMap<number,number> = new Map()): void {
  validateNativeActorState(saved, { monster: actor.defId!, team: actor.team, actors: new Set(actors.keys()), squads: new Set(squads.keys()) });
  const objects: unknown[] = saved.nodes.map(n=> {
    if (!n || !Array.isArray(n.entries)) throw Error('Invalid native checkpoint node');
    switch(n.kind) {
      case 'object': return {};
      case 'array': return [];
      case 'map': return new Map();
      case 'set': return new Set();
      case 'float64': return new Float64Array(n.entries.length);
      case 'sheet': return new StatSheet();
      default: throw Error('Unsupported native checkpoint node');
    }
  });
  const decode = (v:Value): unknown => {
    if (v===null || typeof v==='string' || typeof v==='boolean' || typeof v==='number') return v;
    if (!v || typeof v!=='object') throw Error('Invalid native checkpoint value');
    if ('ref' in v) {
      if (!Number.isSafeInteger(v.ref)||v.ref<0||v.ref>=objects.length) throw Error('Invalid native checkpoint reference');
      return objects[v.ref];
    }
    if ('actor' in v) {
      const a=actors.get(v.actor); if(!a)throw Error('Missing native actor dependency'); return a;
    }
    if ('entity' in v) return actors.get(v.entity)?.id ?? (-1000000-Math.abs(v.entity));
    if ('squad' in v) { const id=squads.get(v.squad); if(id===undefined)throw Error('Missing native squad dependency');return id; }
    if ('special' in v) switch(v.special) {
      case 'undefined': return undefined;
      case 'nan': return NaN;
      case 'positive': return Infinity;
      case 'negative': return -Infinity;
    }
    throw Error('Invalid native checkpoint tag');
  };
  saved.nodes.forEach((n,i)=> {
    const target=objects[i];
    for(const pair of n.entries) {
      if(!Array.isArray(pair)||pair.length!==2)throw Error('Invalid native checkpoint entry');
      const [key,value]=pair, x=decode(value);
      if(target instanceof Map)target.set(decode(key),x);
      else if(target instanceof Set)target.add(x);
      else {
        if(typeof key!=='string'&&typeof key!=='number'||unsafeKeys.has(String(key)))throw Error('Invalid native checkpoint property');
        (target as Record<string,unknown>)[String(key)]=x;
      }
    }
  });
  const next=decode(saved.root);
  if(!next||typeof next!=='object'||Array.isArray(next)||!(Reflect.get(next,'sheet') instanceof StatSheet)
    || Reflect.get(next,'defId')!==actor.defId || Reflect.get(next,'team')!==actor.team
    || !Number.isFinite(Reflect.get(next,'life')) || Reflect.get(next,'life')<=0)
    throw Error('Invalid native checkpoint body');
  for(const key of Object.keys(next))if(rootExcluded.has(key)||typeof Reflect.get(actor,key)==='function')
    throw Error('Native checkpoint cannot replace identity or behavior');
  for(const key of Object.keys(actor))if(!rootExcluded.has(key))Reflect.deleteProperty(actor,key);
  Object.assign(actor,next);
}

/** Reflection is used only for dependency discovery, never to mutate native
 * controllers. Unknown native classes are traversed as owners; weak actor-keyed
 * ledgers can veto with has(actor). The two spatial caches are derived queries,
 * and the owned map is already the input to this pass. */
export function massDormancyPins(world: World, owned: ReadonlyMap<string,Actor>,
  excludedOwners: ReadonlySet<object> = new Set()): Set<Actor> {
  const native=new Set(owned.values()), ids=new Map([...native].map(a=>[a.id,a]));
  const pinned=new Set<Actor>(), seen=new Set<object>([world]);
  const visit=(value:unknown,key=''):void=> {
    if(typeof value==='number' && dependencyKeys.has(key)) {const a=ids.get(value);if(a)pinned.add(a);return;}
    if(!value||typeof value!=='object'||seen.has(value)||excludedOwners.has(value))return;
    if(value instanceof Actor){if(native.has(value))pinned.add(value);return;}
    seen.add(value);
    if(isDependencyFreeData(value))return;
    if(value instanceof WeakMap||value instanceof WeakSet){for(const a of native)if(value.has(a))pinned.add(a);return;}
    if(value instanceof Map){for(const [k,v]of value){if(typeof k==='number'){const a=ids.get(k);if(a)pinned.add(a);}else visit(k);visit(v);}return;}
    if(value instanceof Set){for(const v of value){if(typeof v==='number'){const a=ids.get(v);if(a)pinned.add(a);}else visit(v);}return;}
    for(const [k,v]of Object.entries(value))visit(v,k);
  };
  for(const [key,value] of Object.entries(world)) {
    if(['actors','massRuntime','actorGrid','actorGridBuiltFor'].includes(key))continue;
    visit(value,key);
  }
  // Actors outside this owner can still aim at, carry, bind or depend on it.
  for(const a of world.actors)if(!native.has(a))for(const [k,v]of Object.entries(a))visit(v,k);
  return pinned;
}

const linked = ['owner','partLink','partActors','worm','surf','construct','summonShell','summonShells',
  'puzzleNode','mountId','riderIds','bornOf','eggHatch','burrow','gripping','heldBy','possession','vacated',
  'lifelineId','gateLink','clingTo','hiveForm','lifeDamageInterceptors','assaultPreparation','assaultLockedTarget',
  'aiDodgeRef','frameLockRect','reserves','rootedSpec','shellGuard','volatile','contagion','wake','throngUnits','ironWard','bond','bondFrom',
  'aiCommand','standingOrder','encounterOrder','aiCrossfire','movementTether','ambushSpec','garrison','nemesis',
  'summonReform','underflowSince','survivalHeldAt','wornConduits','hauntSeat'];

/** An owning feature may prove its one settled native garrison slot. This never
 * excludes the body, its sheet, foreign dependencies, or any other component. */
export interface NativeDormancyOwnership { garrisonSlot?: string }
export function nativeDormancyRefusal(a:Actor,world:World,quietSeconds:number, captured?:NativeActorState|null,
  ownership?:NativeDormancyOwnership): string | null {
  if(a.dead||a.team!=='enemy'||!a.fromZoneGen||a.companion||a.downed)return 'not a living native enemy';
  return nativeActorQuietRefusal(a,world,quietSeconds,captured,ownership);
}

/** Shared native quiet-state proof only. The caller must first prove its own
 * supported body kind, identity and ownership. This grants no team/factory
 * eligibility and does not discard any action, timer or dependency. */
export function nativeActorQuietRefusal(a:Actor,world:World,quietSeconds:number, captured?:NativeActorState|null,
  ownership?:NativeDormancyOwnership): string | null {
  if(a.aggroed||a.aiTargetId!==undefined||a.aiTargetRef||a.threat.size||a.aiPhase==='leash_home'
    ||world.time-Math.max(a.lastCombatAt,a.aiHitAt,a.aiEngagedAt)<quietSeconds)return 'engaged or returning';
  if(a.casting||a.dash||a.push||a.leap||a.caromRun||a.onTierLink||a.useLock>0||a.reflexLock>0)return 'committed movement or action';
  if(a.statuses.length||a.expiredStatuses.length||a.buffs.size||a.activeAuras.size||a.restoreStreams.length
    ||a.primedPours.length||a.stagger||a.decay||a.lifespan>0||a.undyingTime>0)return 'live native timer';
  if(a.aiCadenceAt?.some(t=>t>world.time)||a.aiRuleState?.some(r=>r.until>world.time||r.readyAt>world.time)
    ||[...a.procReadyAt.values(),...(a.aiSlackUntil?.values()??[])].some(t=>t>world.time))return 'native scheduled deadline';
  if(a.charges.size||a.absorbLayers.size||a.absorbTimer>0||a.ward>0||Object.keys(a.overdrive).length
    ||a.gainEvents.length||a.condRose.length||[...a.skillChargeState.values()].some(s=>s.timer>0||s.reloading))return 'native resource or event clock';
  if(a.venting.size||a.skillRecoveryLocks.size||a.lastGaspCd>0||a.comboCondLeft>0||a.gasped||a.healedSince
    ||a.esBroke||a.poiseJustBroke||a.poiseJustRearmed||a.poiseBracketHits.length||a.esRechargeJustStarted||a.esJustFilled)
    return 'pending native resource or event';
  if(a.cooldowns.size&&[...a.cooldowns.values()].some(t=>t>0)||a.strobes.size||a.hexToggles.size||a.summonToggles.size)return 'live native skill';
  // Common use receipts are history. Every other nonempty skill runtime needs
  // its own admission proof: gauges, combo chains, anchors and brood clocks
  // cannot be treated as harmless simply because no cast bar is present.
  const history=new Set(['lastUseAt','pressAt','treeAwokeAt','gaugePower','seqDepth']);
  for(const inst of a.skills)if(inst?.state&&Object.entries(inst.state).some(([k,v])=>
    history.has(k)?typeof v==='number'&&k.endsWith('At')&&v>world.time:v!==undefined&&v!==null&&v!==false&&v!==0))
    return 'native stateful skill';
  for(const key of linked)if(Reflect.get(a,key)!==undefined&&Reflect.get(a,key)!==null){
    if(key==='garrison'&&ownership?.garrisonSlot===a.garrison?.slotId&&!a.garrison?.pending)continue;
    return 'native component '+key;
  }
  if(a.magicPack?.runtime)return 'native magic-pack runtime';
  if(a.aiPhase && a.aiPhase!=='idle' && a.aiPhase!=='wander')return 'native AI phase';
  // Remaining absolute deadlines must complete under native authority first.
  for(const [k,v]of Object.entries(a))if(typeof v==='number'&&/(At|Until)$/.test(k)&&v>world.time)return 'native deadline '+k;
  if(!(captured===undefined?captureNativeActorState(a):captured))return 'unsupported native state';
  return null;
}

export class MassDormancy {
  private asleep=new Set<Actor>();
  private frozen=new Map<Actor,NativeActorState>();
  /** A refused prefix must never starve eligible later cohorts. */
  private retireCursor=0;
  constructor(readonly policy: MassDormancyPolicy) {validateMassDormancy(policy);}
  isSleeping(a:Actor):boolean{return this.asleep.has(a);}
  /** Caller has committed an exact page and revalidated its dependency lease. */
  release(actors: readonly Actor[]): void {
    if(actors.some(a=>!this.asleep.has(a)))throw Error('Cannot release an awake native');
    for(const a of actors){this.asleep.delete(a);this.frozen.delete(a);}
  }
  /** Validate the entire detached cohort before publishing any owner here. */
  adoptSleeping(actors: readonly Actor[]): void {
    const states=actors.map(a=>captureNativeActorState(a));
    if(states.some(s=>!s))throw Error('Cannot adopt inexact dormant native');
    actors.forEach((a,i)=>{this.asleep.add(a);this.frozen.set(a,states[i]!);});
  }
  activeCount(owned:ReadonlyMap<string,Actor>):number {let n=0;for(const a of owned.values())if(!a.dead&&!this.asleep.has(a))n++;return n;}
  update(world:World,owned:ReadonlyMap<string,Actor>):{slept:number;woke:number} {
    const groups=new Map<string,Actor[]>();
    for(const [id,a]of owned){const key=a.squadId===undefined?'body:'+id:'squad:'+a.squadId;const group=groups.get(key)??[];group.push(a);groups.set(key,group);}
    const pins=massDormancyPins(world,owned), remove=new Set<Actor>();let slept=0,woke=0,checked=0;
    const observers=world.actors.filter(a=>!a.dead&&a.team!=='enemy');
    const near=(a:Actor,r:number)=>observers.some(o=>Math.hypot(a.pos.x-o.pos.x,a.pos.y-o.pos.y)<=r);
    const cohorts=[...groups.values()];let nextCursor=this.retireCursor;
    for(let i=0;i<cohorts.length;i++){
      const index=(this.retireCursor+i)%cohorts.length,group=cohorts[index];
      if(group.some(a=>this.asleep.has(a))){
        if(group.some(a=>near(a,this.policy.wakeRadius)||pins.has(a)))for(const a of group){
          if(this.asleep.delete(a)&&!a.dead){this.frozen.delete(a);if(!world.actors.includes(a))world.actors.push(a);woke++;}
        }
        continue;
      }
      if(group.some(a=>near(a,this.policy.sleepRadius)||pins.has(a)))continue;
      if(checked>=MASS_DORMANCY_RETIRE_BUDGET)continue;checked+=group.length;nextCursor=(index+1)%cohorts.length;
      const states=new Map(group.map(a=>[a,captureNativeActorState(a)]));
      if(group.some(a=>nativeDormancyRefusal(a,world,this.policy.quietSeconds,states.get(a))))continue;
      // A live native outside the squad is an inbound dependency as well.
      const members=new Set(group),memberIds=new Set(group.map(a=>a.id));let foreign=false;
      for(const a of group){const state=states.get(a);
        if(!state||state.nodes.some(n=>n.entries.some(pair=>pair.some(v=>v!==null&&typeof v==='object'&&'actor' in v&&!memberIds.has(v.actor)))))foreign=true;}
      for(const a of owned.values())if(!members.has(a)&&!this.asleep.has(a)){
        if(group.some(g=>a.aiTargetId===g.id||a.owner===g||a.magicPackFrom===g||a.bondFrom===g))foreign=true;
      }
      if(foreign)continue;
      for(const a of group){this.asleep.add(a);this.frozen.set(a,states.get(a)!);remove.add(a);slept++;}
    }
    this.retireCursor=nextCursor;
    if(remove.size)world.actors=world.actors.filter(a=>!remove.has(a));
    if(slept||woke)world.actorGridRev++;
    for(const a of this.asleep)if(a.dead){this.asleep.delete(a);this.frozen.delete(a);}
    return {slept,woke};
  }
  snapshot(owned:ReadonlyMap<string,Actor>,world:World):MassDormancySave {
    const actors:MassDormancySave['actors']=[],identities:MassDormancySave['identities']=[],unsupported:string[]=[],sleeping:string[]=[];
    const dictionary:[Value,Value][]=[],interned=new Map<string,number>();
    const nodeDictionary:PackedNode[]=[],nodeInterned=new Map<string,number>();
    const pack=(state:NativeActorState):PackedActorState=>({version:2,root:state.root,nodes:state.nodes.map(n=>{
      const node:PackedNode={kind:n.kind,entries:n.entries.map(pair=>{
        const key=JSON.stringify(pair),hit=interned.get(key);if(hit!==undefined)return hit;
        const index=dictionary.length;dictionary.push(pair);interned.set(key,index);return index;})};
      const key=JSON.stringify(node),hit=nodeInterned.get(key);if(hit!==undefined)return hit;
      const index=nodeDictionary.length;nodeDictionary.push(node);nodeInterned.set(key,index);return index;
    })});
    const knownIds=new Set([world.player.id,...[...owned.values()].map(a=>a.id)]);
    for(const [id,a]of owned){
      if(a.dead)continue;
      const identity={id,actorId:a.id,...(a.squadId===undefined?{}:{squadId:a.squadId})};identities.push(identity);
      if(!this.asleep.has(a)){unsupported.push(id);continue;}
      let state=this.frozen.get(a)??captureNativeActorState(a);
      if(state&&state.nodes.some(n=>n.entries.some(pair=>pair.some(v=>v!==null&&typeof v==='object'&&'actor' in v&&!knownIds.has(v.actor)))))state=null;
      if(!state){if(this.asleep.has(a))throw Error('Dormant native lost its exact checkpoint');unsupported.push(id);continue;}
      actors.push({id,actorId:a.id,...(a.squadId===undefined?{}:{squadId:a.squadId}),state:pack(state)});
      if(this.asleep.has(a))sleeping.push(id);
    }
    return {schema:1,clock:world.time,playerId:world.player.id,dictionary,nodeDictionary,identities,actors,sleeping,unsupported};
  }
  restore(saved:MassDormancySave,owned:ReadonlyMap<string,Actor>,world:World):void {
    if(saved?.schema!==1||!Number.isFinite(saved.clock)||!Array.isArray(saved.dictionary)||!Array.isArray(saved.nodeDictionary)||!Array.isArray(saved.identities)||!Array.isArray(saved.actors)||!Array.isArray(saved.sleeping)
      ||!Array.isArray(saved.unsupported)||new Set(saved.actors.map(r=>r.id)).size!==saved.actors.length
      ||new Set(saved.identities.map(r=>r.id)).size!==saved.identities.length
      ||new Set(saved.sleeping).size!==saved.sleeping.length)throw Error('Invalid population dormancy checkpoint');
    const actors=new Map<number,Actor>([[saved.playerId,world.player]]),squads=new Map<number,number>();
    for(const row of saved.identities){const a=owned.get(row.id);if(!a)throw Error('Unknown native checkpoint owner');if(actors.has(row.actorId))throw Error('Duplicate native checkpoint actor identity');actors.set(row.actorId,a);
      if(row.squadId!==undefined){if(a.squadId===undefined)throw Error('Missing native formation');const prior=squads.get(row.squadId);if(prior!==undefined&&prior!==a.squadId)throw Error('Split native formation');squads.set(row.squadId,a.squadId);}}
    for(const row of saved.actors){const identity=saved.identities.find(r=>r.id===row.id);
      if(!identity||identity.actorId!==row.actorId||identity.squadId!==row.squadId)throw Error('Inconsistent native checkpoint identity');}
    for(const row of saved.actors)restoreNativeActorState(owned.get(row.id)!,unpackNativeCheckpoint(saved,row.state),actors,squads);
    for(const id of saved.sleeping){const a=owned.get(id);if(!a||!saved.actors.some(r=>r.id===id))throw Error('Unknown dormant native');this.asleep.add(a);const state=captureNativeActorState(a);if(!state)throw Error('Unrestorable dormant native');this.frozen.set(a,state);}
    world.actors=world.actors.filter(a=>!this.asleep.has(a));world.actorGridRev++;
  }
}
