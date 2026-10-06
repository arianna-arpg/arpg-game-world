import { address, cellInteger, localOffset, type MassCell, type MassPoint } from './address';

/** This is a preflight/transaction primitive, not a live-world rebase switch.
 * Every native owner must explicitly inventory absolute coordinates. Direction,
 * velocity, offsets and authored geometry are NOT translated by shape/name. */
export interface MassLocalFrame { origin: MassCell; epoch: number }
export interface MassRebaseOwner {
  id: string;
  /** Mutable absolute positions in the CURRENT frame; aliases are allowed. */
  points: readonly MassPoint[];
  /** The owner's concrete reason it cannot transfer now. */
  refusal?: string;
}
/** A live integration must supply each owner; an empty list is a claim that
 * this owner has no live state, which its native adapter must establish. */
export const MASS_LIVE_REBASE_OWNERS = Object.freeze([
  'actors', 'skill-effects', 'native-controllers', 'terrain-scenery',
  'native-geometry', 'player-input', 'view', 'transit', 'derived-indices', 'dormant-frames',
]);
interface Shift { point: MassPoint; before: MassPoint; after: MassPoint }
export interface MassRebasePlan {
  readonly origin: MassCell; readonly destination: MassCell; readonly epoch: number;
  readonly delta: Readonly<MassPoint>; readonly pointCount: number; readonly owners: readonly string[];
}
export type MassRebaseResult = { ok:true; plan:MassRebasePlan } | {ok:false; reasons:readonly string[]};
export const MASS_REBASE_MAX_ERROR = 1e-7; // world units, far below a physics pixel
const plans = new WeakMap<MassRebasePlan, {frame:MassLocalFrame; shifts:Shift[]; committed:boolean}>();
const equalCell=(a:MassCell,b:MassCell)=>a.dimension===b.dimension&&a.cx===b.cx&&a.cy===b.cy;
const finitePoint=(p:MassPoint)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function writablePoint(p:MassPoint):boolean {
  return ['x','y'].every(key=>{const d=Object.getOwnPropertyDescriptor(p,key);return !!d&&'value' in d&&d.writable===true;});
}

/** Choose a nearby address cell without ever converting the global 64-bit
 * address to a JS number. The run's settlement origin remains a separate fact. */
export function massRebaseDestination(frame:Readonly<MassLocalFrame>,focus:MassPoint,span:number,thresholdCells=32):MassCell|null {
  if(!finitePoint(focus)||!Number.isSafeInteger(thresholdCells)||thresholdCells<1)throw Error('Invalid frame focus');
  const at=address(frame.origin.dimension,frame.origin.cx,frame.origin.cy,focus.x,focus.y,span);
  if(Math.abs(focus.x)<span*thresholdCells&&Math.abs(focus.y)<span*thresholdCells)return null;
  return {dimension:at.dimension,cx:at.cx,cy:at.cy};
}

/** Pure planning. A missing/opaque owner refuses the entire crossing; nobody
 * gets to shift the hero while leaving attacks, returns or scenery behind. */
export function planMassRebase(frame:MassLocalFrame,destination:MassCell,span:number,
  owners:readonly MassRebaseOwner[],required:readonly string[]=MASS_LIVE_REBASE_OWNERS):MassRebaseResult {
  const reasons:string[]=[],ids=new Set<string>();
  if(!Number.isSafeInteger(frame.epoch)||frame.epoch<0)return {ok:false,reasons:['Invalid frame epoch']};
  let delta:MassPoint;
  try {
    cellInteger(frame.origin.cx);cellInteger(frame.origin.cy);cellInteger(destination.cx);cellInteger(destination.cy);
    delta=localOffset({...frame.origin,x:0,y:0},{...destination,x:0,y:0},span);
  } catch {return {ok:false,reasons:['Frame origins cannot share a precise local transform']};}
  const shifts:Shift[]=[],seen=new Set<MassPoint>();
  for(const owner of owners){
    if(!owner.id||ids.has(owner.id)){reasons.push('Missing or duplicate owner identity');continue;}ids.add(owner.id);
    if(owner.refusal)reasons.push(owner.id+': '+owner.refusal);
    for(const point of owner.points){
      if(seen.has(point))continue;seen.add(point);
      if(!finitePoint(point)||!writablePoint(point)){reasons.push(owner.id+': unsupported coordinate storage');continue;}
      const after={x:point.x+delta.x,y:point.y+delta.y};
      if(!finitePoint(after)||Math.abs(after.x)>span*4096||Math.abs(after.y)>span*4096){
        reasons.push(owner.id+': coordinate exceeds exact local range');continue;
      }
      // The integer address is exact; the subpixel residual has an explicit
      // rounding bound. Never permit a different cell or invisible large drift.
      const beforeAddress=address(frame.origin.dimension,frame.origin.cx,frame.origin.cy,point.x,point.y,span);
      const afterAddress=address(destination.dimension,destination.cx,destination.cy,after.x,after.y,span);
      if(!equalCell(beforeAddress,afterAddress)||Math.abs(beforeAddress.x-afterAddress.x)>MASS_REBASE_MAX_ERROR
        ||Math.abs(beforeAddress.y-afterAddress.y)>MASS_REBASE_MAX_ERROR){
        reasons.push(owner.id+': translation loses address precision');continue;
      }
      shifts.push({point,before:{x:point.x,y:point.y},after});
    }
  }
  for(const id of required)if(!ids.has(id))reasons.push('Missing native owner: '+id);
  const originDesc=Object.getOwnPropertyDescriptor(frame,'origin'),epochDesc=Object.getOwnPropertyDescriptor(frame,'epoch');
  if(!originDesc?.writable||!epochDesc?.writable)reasons.push('Frame storage is immutable');
  if(reasons.length)return {ok:false,reasons};
  const plan:MassRebasePlan=Object.freeze({origin:Object.freeze({...frame.origin}),destination:Object.freeze({...destination}),
    epoch:frame.epoch,delta:Object.freeze({...delta}),pointCount:shifts.length,owners:Object.freeze([...ids])});
  plans.set(plan,{frame,shifts,committed:false});return {ok:true,plan};
}

/** Apply once only after all native owners have finished the current tick.
 * Stale plans refuse without touching any point; aliases move exactly once.
 * Setters are excluded during planning. Failure rolls back the whole frame. */
export function commitMassRebase(plan:MassRebasePlan):boolean {
  const state=plans.get(plan);if(!state||state.committed)return false;
  const {frame,shifts}=state;
  if(!Object.getOwnPropertyDescriptor(frame,'origin')?.writable||!Object.getOwnPropertyDescriptor(frame,'epoch')?.writable
    ||!Number.isSafeInteger(frame.epoch+1)||frame.epoch!==plan.epoch||!equalCell(frame.origin,plan.origin)
    ||shifts.some(s=>!writablePoint(s.point)||!Object.is(s.point.x,s.before.x)||!Object.is(s.point.y,s.before.y)))return false;
  const oldOrigin=frame.origin,oldEpoch=frame.epoch;
  try {
    for(const s of shifts){s.point.x=s.after.x;s.point.y=s.after.y;}
    frame.origin={...plan.destination};frame.epoch++;state.committed=true;return true;
  } catch {
    for(const s of shifts){s.point.x=s.before.x;s.point.y=s.before.y;}
    frame.origin=oldOrigin;frame.epoch=oldEpoch;return false;
  }
}
