import assert from 'node:assert/strict';
// Import the shared memory lane first: it must not accept a cold foreign registrar/token.
const memory=await import('../src/engine/nativeCrusadeFixtureMemory');
assert(!('installNativeCrusadeFixtureRegistration' in memory));
for(const value of [{},Object.freeze({}),{kind:'furniture',owner:{},restore(){throw Error('foreign callback');}}]){assert.throws(()=>memory.bindNativeCrusadeFixtureMemory(value),/one-use/);assert.throws(()=>memory.bindNativeCrusadeDoorMemory(value),/one-use/);}
const {GridWalkField,beginNativeGridPaintReceipt,withoutNativeGridPaintReceipt,inheritNativeGridPaintReceipt}=await import('../src/world/gridWalk');
const g=new GridWalkField(120,120,30);g.fillRegion(0,0,119,119,'ground');const receipt=beginNativeGridPaintReceipt();g.fillRegion(30,30,59,59,'ground');withoutNativeGridPaintReceipt(()=>{g.fillRegion(60,60,89,89,'wall');g.fillRegion(60,60,89,89,'ground');});const grown=new GridWalkField(180,180,30);grown.fillRegion(0,0,179,179,'ground');inheritNativeGridPaintReceipt(g,grown);grown.fillDisc(105,105,1,'ground');const paints=receipt.finish();assert.deepEqual([...paints.get(g)!],[5]);assert.deepEqual([...paints.get(grown)!],[7,21]);const clean=beginNativeGridPaintReceipt();assert.equal(clean.finish().size,0);assert.equal(g.kindAt(45,45),'ground');
await import('../src/engine/world');
console.log(JSON.stringify({memoryFirstColdTokensRefused:true,noPublicRegistrar:true,sameValueWritesRecorded:true,temporaryDoorTopologyExcluded:true,growthCoordinatesPreserved:true,noReceiptLeak:true,worldImportAfterMemory:true}));
