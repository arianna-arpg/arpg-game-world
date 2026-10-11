import { LIGHTNING_STYLE as C } from '../data/lightningVisuals';
export interface LightningTrace {
  skillId: string; width: number; clock: number;
  points: { x: number; y: number; at: number }[];
}
export function extendLightningTrace(trace: LightningTrace, from: { x: number; y: number }, to: { x: number; y: number }, clock: number): void {
  trace.clock = clock;
  trace.points = trace.points.filter(p => clock - p.at <= C.tailSeconds);
  if (!trace.points.length) trace.points.push({ ...from, at: clock });
  trace.points.push({ ...to, at: clock });
  if (trace.points.length > C.maxPoints) trace.points.splice(0, trace.points.length - C.maxPoints);
}
export function cloneLightningTrace(trace?: LightningTrace): LightningTrace | undefined {
  return trace && { ...trace, points: trace.points.map(p => ({ ...p })) };
}
