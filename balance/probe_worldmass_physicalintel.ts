import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { address, moveAddress } from '../src/worldmass/address';
import { MassHierarchy, type MassHierarchySave } from '../src/worldmass/hierarchy';
import { MassPhysicalIntel } from '../src/worldmass/physicalIntel';
import type { GeographicPlan } from '../src/worldmass/geographicPlan';
import { canonical, massDigest } from '../src/worldmass/random';
const undo=seedGlobalRandom(901743);
try{
 const world=makeSimWorld('warrior',901743);world.startWorldMass(901743);const mass=world.massRuntime!,geo=mass.geography!,h=geo.hierarchy,intel=geo.intel;
 const at=address('surface','0','0',-8100,8100,960),beacon=geo.plannedAt(at);assert.ok(beacon?.context.zone.objective.kind==='beacon');
 const context={...beacon.context,zone:{...beacon.context.zone,objective:{...beacon.context.zone.objective,revealCount:2}}};
 const {owner:beaconOwner,...beaconDefinition}=beacon;
 h.enroll(beaconOwner,'objective-access','worldmass/geographic-access-v1',{...beaconDefinition,context},null,0);
 const policy=intel.policy(beacon.owner,context.zone);
 const actors=[...world.actors],doodads=[...world.doodads],visited=canonical(mass.state.snapshot());
 const targets=[];
 for(const owner of intel.candidates(beacon.owner,policy)){
  const plan=geo.plannedAt(owner.center);if(!plan?.access||plan.context.zone.objective.kind==='beacon')continue;
  targets.push(intel.reserve(plan as GeographicPlan,10));if(targets.length===5)break;
 }
 assert.equal(targets.length,5);assert.equal(intel.knownTargets().length,0);
 assert.deepEqual(world.actors,actors);assert.deepEqual(world.doodads,doodads);assert.equal(canonical(mass.state.snapshot()),visited);
 assert.ok(targets.every(t=>!intel.visited(t.id)&&!geo.objectives.has(t.id)),'frozen future access cannot create visitation or population');
 intel.observe(targets[0].id,11);assert.ok(intel.known(targets[0].id)&&intel.visited(targets[0].id));
 intel.finish(beacon.owner,policy,targets,12);const frozen=canonical(intel.manifest(beacon.owner.id));
 const picked=intel.reveal(beacon.owner.id,20);assert.equal(picked.length,2);assert.ok(!picked.includes(targets[0].id));assert.ok(picked.every(id=>intel.known(id)&&!intel.visited(id)));
 assert.deepEqual(intel.reveal(beacon.owner.id,21),[]);assert.equal(canonical(intel.manifest(beacon.owner.id)),frozen);
 console.log('PASS actual geographic access reservation owns no actor/visit; native projected reveal excludes prior visits, caps seeded picks and never repays');
 const saved=h.snapshot(),restore=(s:MassHierarchySave)=>new MassPhysicalIntel(new MassHierarchy(h.run,h.seed,h.addressSpan,h.policy,[],s));
 const continued=restore(saved);assert.deepEqual(continued.knownTargets(),intel.knownTargets());assert.deepEqual(continued.reveal(beacon.owner.id,30),[]);
 continued.observe(picked[0],31);assert.ok(continued.visited(picked[0]));assert.ok(!continued.visited(picked[1]));
 assert.equal(canonical(continued.manifest(beacon.owner.id)),frozen);
 const targetRow=(s:MassHierarchySave,id=picked[0])=>s.owners.find(r=>r.owner.id===id)!.controllers.find(c=>c.id==='physical-intel')!;
 const surveyRow=(s:MassHierarchySave)=>s.owners.find(r=>r.owner.id===beacon.owner.id)!.controllers.find(c=>c.id==='beacon-survey')!;
 const reject=(label:string,edit:(s:MassHierarchySave)=>void)=>{const bad=structuredClone(saved);edit(bad);assert.throws(()=>restore(bad),label);};
 reject('missing frozen access',s=>{s.owners.find(r=>r.owner.id===picked[0])!.controllers=s.owners.find(r=>r.owner.id===picked[0])!.controllers.filter(c=>c.id!=='objective-access');});
 reject('changed target approach',s=>{const c=targetRow(s),d=c.definition as {approach:typeof at};d.approach=moveAddress(d.approach,{x:30,y:0},960);c.definitionHash=massDigest(d);});
 reject('duplicate complete manifest',s=>{const c=surveyRow(s),d=c.definition as {candidates:unknown[]};d.candidates.push(d.candidates[0]);c.definitionHash=massDigest(d);});
 reject('impossible visit timeline',s=>{const c=targetRow(s);c.state={knownAt:19,visitedAt:18};});
 reject('completion without revealed receipt',s=>{surveyRow(s).state={revealed:null,at:null};});
 console.log('PASS physical intel CharacterSave component continuity and coherent source/approach/duplicate/timeline/checkpoint refusal');
 // Rehashed, individually valid controller envelopes must not rewrite causality.
 reject('survey cannot reveal a target first learned after the survey',s=>{const c=targetRow(s);c.updatedAt=25;c.state={knownAt:25,visitedAt:null};});
 reject('coherent reveal count cannot replace native source',s=>{const c=surveyRow(s),d=c.definition as {policy:{count:number}};d.policy.count++;c.definitionHash=massDigest(d);});
 reject('coherent reveal seed cannot replace native source',s=>{const c=surveyRow(s),d=c.definition as {policy:{seed:number}};d.policy.seed++;c.definitionHash=massDigest(d);});
 reject('waiting knowledge cannot already be known',s=>{const c=targetRow(s);c.phase='waiting';});
 console.log('PASS cross-owner survey causality and knowledge lifecycle reject coherently malformed checkpoints');
}finally{undo();}
