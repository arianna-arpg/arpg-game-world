import assert from 'node:assert/strict';
import { withSeededRandom } from '../src/core/rng';
import type { Doodad } from '../src/engine/levelgen';
import { GridWalkField } from '../src/world/gridWalk';
import { nativeCampaignFixture, birthActualNativeArea } from './nativeCombatRetainedFixture';
import { refuseWorldCombat } from './probe_nativecombatcycle';
import { PUSH_DAMPING } from '../src/engine/nativeSceneDisplacement';

withSeededRandom(281903, () => {
  const setup = nativeCampaignFixture(281903);
  refuseWorldCombat([setup.writer], drivers => {
    const { ongoing, campaign, coordinator } = birthActualNativeArea(setup);
    const { geometry, scene } = ongoing.assembly.input, hero = campaign.localSeat.actor;
    try {
      for (const actor of scene.actors) if (actor !== hero) actor.passive = true;
      hero.invulnerable = true; hero.tier = 0;
      geometry.walk = null; geometry.tierViews = null;
      const cx = geometry.arena.w / 2, cy = geometry.arena.h / 2;
      geometry.doodads = [
        [804.5665064221248,624.7950490587391,21.79984090430662],
        [864.7723651188426,613.915098500438,25.93121799454093],
        [760.6842267420143,594.2352787521668,36.75921646691859],
        [795.3123474866152,618.054571102839,17.114701353013515],
        [826.3512178114615,586.1246635811403,20.526845450978726],
      ].map(([x,y,r]) => ({kind:'tree',pos:{x:cx+x-800,y:cy+y-600},radius:r,hitbox:{kind:'circle',r}})) as Doodad[];
      geometry.markDoodadsChanged();
      hero.pos = {x:cx+17.3299944563769,y:cy+62.9393292940222};
      const vx=(805.7571451438348-817.3299944563769)*30,vy=(616.355328190755-662.9393292940222)*30;
      ongoing.combat.pushActor(hero,Math.atan2(vy,vx),Math.hypot(vx,vy)*hero.effectiveWeight()/PUSH_DAMPING);
      assert.ok(hero.push,'native displacement owns the issued knockback record');
      let maxTravel = 0;
      for (let i=0;i<32;i++) {
        const from={...hero.pos}; campaign.time+=1/30; ongoing.combat.campaignFrame.tick(1/30);
        maxTravel=Math.max(maxTravel,Math.hypot(hero.pos.x-from.x,hero.pos.y-from.y));
        assert.equal(geometry.pointInSolid(hero.pos.x,hero.pos.y,hero.radius-1e-4,hero.tier),null);
      }
      assert.ok(maxTravel<48.001,'native actor frames cannot create a collision rescue jump');
      const g=new GridWalkField(geometry.arena.w,geometry.arena.h);g.fillRect(0,0,geometry.arena.w-1,geometry.arena.h-1,true);
      geometry.walk=g; geometry.doodads=[{kind:'hay_bale',pos:{x:cx,y:cy},radius:35,hitbox:{kind:'rect',hw:30,hh:12,rot:.05}}] as Doodad[];
      geometry.markDoodadsChanged();
      assert.equal(geometry.pathField()!.isWalkable(cx,cy),false,'native navigation includes furniture');
      assert.ok(g.isWalkable(cx,cy),'native routing does not alter authoritative floor');
      assert.deepEqual(drivers,[],'native course cannot fall back to World combat');
      console.log('PASS native collision/shadow movement: 32 real frames, maximum step',maxTravel.toFixed(3));
    } finally { coordinator.retire(); }
  });
});
