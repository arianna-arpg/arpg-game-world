import assert from 'node:assert/strict';
/** The original runtime-birth corpus opens exactly the first Amalgamation quarry.
 * Stage-aware ownership added an explicit :0 to that marker. Reverse only this
 * known first-stage spelling; retain the entire census, callbacks and graph. */
export function beforeNativeRuntimeBirthStageZero<T>(input:T):T {
 const row=input as any;if(row.course?.method!=='placeAmalgamMiniboss')return input;
 assert.equal(row.course.mechanism,'native');assert(['repeat','factory-failure'].includes(row.course.kind));
 assert(Array.isArray(row.result?.stages));assert.equal(row.result.stages.length,row.course.kind==='repeat'?2:1);
 const out=structuredClone(input) as any;
 for(const stage of out.result.stages){const markers=stage.state?.materializedAmalgamMobs;
  assert(markers&&typeof markers==='object');assert.deepEqual(Object.keys(markers),['$set']);
  assert(Array.isArray(markers.$set));assert.equal(markers.$set.length,1);
  const marker=markers.$set[0];assert.equal(typeof marker,'string');
  assert(/^amalgam_0:0@gen_\d+$/.test(marker),'Only the actual first-stage fixture marker is historical');
  markers.$set[0]=marker.replace(':0@','@');
 }
 return out;
}
