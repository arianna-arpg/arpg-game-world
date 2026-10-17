import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { localOffset } from '../src/worldmass/address';
import { geographicAccessPoints } from '../src/worldmass/geographicAccess';
import { geographicPlanIdentity, prepareGeographicPlan, validateGeographicPreparation, type GeographicPlanInput, type GeographicPreparation } from '../src/worldmass/geographicPlan';

const undo=seedGlobalRandom(901743);
try {
  const w=makeSimWorld('warrior',901743);w.startWorldMass(901743);const m=w.massRuntime!,g=m.geography!;
  let input:Readonly<GeographicPlanInput>|undefined,prepared:GeographicPreparation|undefined;
  search:for(let radius=0;radius<=6;radius++)for(let y=-radius;y<=radius;y++)for(let x=-radius;x<=radius;x++){
    if(Math.max(Math.abs(x),Math.abs(y))!==radius)continue;
    const candidate=g.preparationInput(m.walk.at(x*5400+2700,y*5400+2700));if(!candidate)continue;
    const identity=geographicPlanIdentity(candidate),reply=prepareGeographicPlan({protocol:1,token:1,input:candidate,...identity,maxBytes:262144});
    if(reply.preparation?.plan){input=candidate;prepared=reply.preparation;break search;}
  }
  assert.ok(input&&prepared?.plan,'real geographic source must yield an accepted access proof');
  assert.ok(validateGeographicPreparation(input,prepared));
  const plan=prepared.plan,span=input.terrain.addressSpan;
  const far=geographicAccessPoints(plan.access).find(p=>plan.access.targets.every(t=>{const q=localOffset(t.at,plan.owner.center,span);return Math.hypot(p.x-q.x,p.y-q.y)>220;}));assert.ok(far);
  const routeBlocked=structuredClone(input);routeBlocked.reservations.circles.push({...far,radius:60});
  const coherent=(changed:GeographicPlanInput):GeographicPreparation=>({...structuredClone(prepared!),...geographicPlanIdentity(changed)});
  assert.throws(()=>validateGeographicPreparation(routeBlocked,coherent(routeBlocked)),
    'a structurally connected, coherently rehashed proof must still reject its path crossing a frozen reservation');
  const standBlocked=structuredClone(input),stand=localOffset(plan.positions[0],plan.owner.center,span);standBlocked.reservations.circles.push({...stand,radius:1});
  assert.throws(()=>validateGeographicPreparation(standBlocked,coherent(standBlocked)),
    'stand footprint must substantiate the same independent reservation rule as the compiler');
  const wet=structuredClone(input);for(const region of Object.values(wet.regions))region.dry=false;
  assert.throws(()=>validateGeographicPreparation(wet,coherent(wet)),
    'valid hashes and source headers cannot substitute for exact dry body-cell coverage');
  console.log('PASS real native geographic proof accepts its immutable source and rejects coherent invalid route, stand reservation and wet-terrain responses without rerunning A*');
} finally {undo();}
