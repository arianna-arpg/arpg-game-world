import assert from 'node:assert/strict';
const {NativeShardRuntime}=await import('../server/nativeShardRuntime');
const {makeAccount}=await import('../src/meta/account');
const runtime=new NativeShardRuntime({account:makeAccount(),seed:1231});
assert.equal(runtime.ready,false);assert.equal(runtime.writer.seats.length,0);assert.equal(runtime.writer.actors.length,0);
runtime.install();assert(runtime.ready);assert.equal(runtime.writer.seats.length,1);assert.equal(runtime.current.assembly.phase,'born');const time=runtime.writer.time;const step=runtime.step(.05);assert(step.ready);assert.equal(runtime.writer.time,time+.05);console.log(JSON.stringify({zone:runtime.current.assembly.input.scene.zone.id,actors:runtime.current.assembly.input.scene.actors.length,keeper:runtime.keeper.actor.name,step,retire:runtime.retire(),ready:runtime.ready}));
