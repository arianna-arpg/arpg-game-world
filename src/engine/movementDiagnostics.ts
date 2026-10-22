/** Opt-in local evidence for unexpected movement. No browser or renderer
 * dependency; ordinary simulation does not allocate a trace. */
export const movementDiagnosticsEnabled = typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('lightingDiagnostics') === '1';
type Point = { x:number; y:number };
type Host = { time:number; player:object };
type Movement = { time:number; reason:string; from:Point; to:Point; detail?:unknown };
const histories = new WeakMap<object, { events:Movement[]; dropped:number }>();
export function recordMovement(world:Host, actor:object, reason:string, from:Point, to:Point, detail?:unknown): void {
  if (!movementDiagnosticsEnabled || actor !== world.player || Math.hypot(to.x-from.x,to.y-from.y)<1e-6) return;
  let h=histories.get(world);if(!h){h={events:[],dropped:0};histories.set(world,h);}
  if(h.events.length>=128){h.events.shift();h.dropped++;}
  h.events.push({time:world.time,reason,from:{...from},to:{...to},detail});
}
export function takeMovementRecords(world:object) {
  const h=histories.get(world);histories.delete(world);return h ?? {events:[],dropped:0};
}
