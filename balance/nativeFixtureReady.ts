import assert from 'node:assert/strict';
import type { World } from '../src/engine/world';

/** Match the client gate: loading bytes must not advance the simulation clock. */
export async function awaitNativeFixtureReady(world: World): Promise<void> {
  const runtime=world.massRuntime;assert.ok(runtime);
  const deadline=Date.now()+30000;
  for(;;){
    const ready=runtime.nativeReadiness(world);
    if(ready.status==='ready')return;
    assert.notEqual(ready.status,'refused',ready.error??'Native fixture pages refused');
    assert.ok(Date.now()<deadline,'Native fixture pages timed out: '+JSON.stringify(ready));
    await new Promise(resolve=>setTimeout(resolve,10));
  }
}
