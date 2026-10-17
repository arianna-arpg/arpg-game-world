import type { PlayerInput } from '../net/intent';

/** QA input must meet the same shape as the device reader. Fail before handing
 * an intent to the simulation; accepting NaN can poison facing/projectiles.
 * Empty/sparse slot arrays retain their ordinary false/unpressed meaning. */
export function assertScriptedInput(value: unknown): asserts value is PlayerInput | null {
  if(value===null)return;
  const v=value as Partial<PlayerInput>|undefined;
  const buttons=(a:unknown)=>Array.isArray(a)&&a.every(b=>typeof b==='boolean');
  if(!v||![v.dx,v.dy,v.aim?.x,v.aim?.y].every(Number.isFinite)
    ||!buttons(v.held)||!buttons(v.edge)||v.metaEdge!==undefined&&!buttons(v.metaEdge))
    throw Error('Invalid scripted input: use finite dx/dy and aim: {x, y}, with boolean held/edge slot arrays.');
}

