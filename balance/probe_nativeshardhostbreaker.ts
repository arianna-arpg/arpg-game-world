import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {NativeShardHost} from '../server/nativeShardHost';
import {NativeAreaSceneCampaignFrame} from '../src/worldmass/nativeAreaSceneCampaignFrame';
import {SHARD_CFG} from '../server/shardHost';
import {COOP_SCALING} from '../src/data/coop';
const dir=fs.mkdtempSync(path.resolve('balance/reports/native-host-breaker-')),tick=NativeAreaSceneCampaignFrame.prototype.tick,limit=SHARD_CFG.faultBreakerTicks,beat=SHARD_CFG.worldSaveSec,radius=COOP_SCALING.shareRadius,marker=new Error('actual selected campaign tick refusal');let host:NativeShardHost|undefined,closing:Promise<void>|undefined,calls=0,notified=0;
try {
 SHARD_CFG.faultBreakerTicks=1;SHARD_CFG.worldSaveSec=.001;
 NativeAreaSceneCampaignFrame.prototype.tick=function(){calls++;throw marker;};
 host=new NativeShardHost({seed:1231,saveDir:dir,log:()=>{}});const h=host;h.persist();const baseline=fs.readFileSync(h.savePath!);h.world.ledger.host_breaker_marker=9;
 h.onBroken=()=>{notified++;closing=h.stop({persist:false});};
 const result=h.tick(.02);assert(result.faults.some(f=>f.phase==='simulation'&&f.error===marker));assert.equal(calls,1);assert(h.broken);assert.equal(notified,1);await closing;
 const same=fs.readFileSync(h.savePath!).equals(baseline);console.log(JSON.stringify({selectedTickCalls:calls,broken:h.broken,notified,checkpointUntouched:same,closed:!h.runtime.ready,radiusRestored:COOP_SCALING.shareRadius===radius}));assert(same,'breaker tick must preserve the last good checkpoint when its save beat is due');assert.equal(h.runtime.ready,false);assert.equal(COOP_SCALING.shareRadius,radius);
}finally {NativeAreaSceneCampaignFrame.prototype.tick=tick;SHARD_CFG.faultBreakerTicks=limit;SHARD_CFG.worldSaveSec=beat;if(host)await host.stop({persist:false});}
