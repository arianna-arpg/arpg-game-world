import { mod } from '../src/engine/stats';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { MONSTERS } from '../src/data/monsters';
import { angleDiff, vec } from '../src/core/math';
import { WATCH_CFG, watchFanVisible } from '../src/engine/watch';

/** Real host frames, including the idle post write between watch updates. */
export function watchGazeChecks(check: (name:string,ok:boolean,detail?:string)=>void): void {
  const restore=seedGlobalRandom(62410);
  try {
    for(const id of Object.keys(MONSTERS).filter(id=>MONSTERS[id].watch?.sweep)) {
      for(const hz of [30,60,144]) {
        const w=makeSimWorld('warrior',62410);
        w.player.pos=vec(60,60);w.player.sheet.setBase('detectability',0);
        const a=w.createMonster(id,5,'enemy');
        a.pos=vec(600,600);a.aiPost=vec(600,600);a.aiAnchor=vec(600,600);
        a.aiPostFacing=.4;a.facing=a.facingPrev=.4;w.actors.push(a);
        let bad=0,maxJump=0,moved=0,min=Infinity,max=-Infinity,first="";
        const duration=a.watch!.sweep!.sec+1;
        for(let i=0;i<duration*hz;i++) {
          const before=a.facing,dt=1/hz;
          updateAI(a,w,dt);const afterAI=a.facing;w.update(dt);
          const jump=Math.abs(angleDiff(before,a.facing));
          maxJump=Math.max(maxJump,jump);if(jump>WATCH_CFG.turnRadSec*dt+1e-6){bad++;first ||= JSON.stringify({i,before,afterAI,after:a.facing,t:w.time});}
          moved=Math.max(moved,Math.hypot(a.pos.x-600,a.pos.y-600));
          const relative=angleDiff(.4,a.facing);min=Math.min(min,relative);max=Math.max(max,relative);
        }
        check('gaze: '+id+' at '+hz+' Hz stays planted and turns continuously',bad===0&&moved<.01,
          'jumps='+bad+', max='+maxJump.toFixed(4)+' rad, moved='+moved.toFixed(3)+', first='+first);
        check('gaze: '+id+' still scans its authored arc at '+hz+' Hz',max-min>a.watch!.sweep!.arcDeg*Math.PI/180*.9);
      }
    }

    // Irregular frame pacing and stimulus transitions still spend one turn budget.
    {
      const w=makeSimWorld('warrior',62412),a=w.createMonster('stilt_strider',5,'enemy');
      w.player.pos=vec(60,60);w.player.sheet.setBase('detectability',0);
      a.pos=vec(600,600);a.aiPost=vec(600,600);a.aiAnchor=vec(600,600);
      a.aiPostFacing=0;a.facing=a.facingPrev=0;w.actors.push(a);
      const step=(dt:number)=>{updateAI(a,w,dt);w.update(dt);};
      let bad=0,closest=Infinity;
      for(let i=0;i<240;i++){
        const dt=[1/144,1/60,1/30,.08][i%4],before=a.facing;
        if(i>=60&&i<100){a.watchS=.45;a.watchFedAt=w.time;a.watchAt=vec(600,1000);}
        if(i===100){a.watchS=0;a.watchAt=undefined;}
        step(dt);
        if(Math.abs(angleDiff(before,a.facing))>WATCH_CFG.turnRadSec*dt+1e-6)bad++;
        if(i>=60&&i<100)closest=Math.min(closest,Math.abs(angleDiff(a.facing,Math.PI/2)));
      }
      check('gaze: uneven frames and stimulus handoffs stay continuous',bad===0&&closest<.05,
        'jumps='+bad+', stimulus error='+closest);
      const beforePause=a.facing;
      w.timeflow.hold({id:'watcher-pause',scale:0,kind:'menu'});
      for(let i=0;i<30;i++)step(1/60);
      check('gaze: a paused world does not turn',a.facing===beforePause);
      w.timeflow.release('watcher-pause');
      w.timeflow.hold({id:'watcher-stasis',scale:0,actors:{onlyTeam:'enemy'}});
      const beforeStasis=a.facing;for(let i=0;i<30;i++)step(1/60);
      check('gaze: actor stasis does not turn',a.facing===beforeStasis);
      w.timeflow.release('watcher-stasis');
      a.sheet.setSource('gaze-test:slow',[mod('aiTurnSpeed','more',-.9)]);
      const turnCap=a.sheet.get('aiTurnSpeed',undefined,undefined,a.turnSpeed);
      let tooFast=0;
      for(let i=0;i<120;i++){
        const before=a.facing;step(1/60);
        if(Math.abs(angleDiff(before,a.facing))>turnCap/60+1e-6)tooFast++;
      }
      check('gaze: the ordinary reduced turn-speed limit applies to scanning',tooFast===0&&turnCap<a.turnSpeed*.5);
      a.sheet.removeSource('gaze-test:slow');
      // A planted windup must keep its real attack aim, not resume idle scanning.
      const inst=a.skills.find(s=>s)!;
      a.facing=a.facingPrev=-1;
      a.casting={inst,mode:'cast',aim:vec(600+Math.cos(-1)*100,600+Math.sin(-1)*100),
        elapsed:0,total:10,held:true,baseMult:1};
      let castDrift=0;
      for(let i=0;i<30;i++){step(1/60);castDrift=Math.max(castDrift,Math.abs(angleDiff(-1,a.facing)));}
      check('gaze: a committed attack retains its aimed direction',castDrift<1e-6&&!!a.casting);
    }

    for(const id of ['stilt_strider','ushabti_sentinel']) {
      const w=makeSimWorld('warrior',62411),a=w.createMonster(id,5,'enemy');
      check('fan: ambient '+id+' keeps sensing without a displayed detection radius',
        !!a.watch?.sweep&&!watchFanVisible(a,a.watch));
    }
  } finally { restore(); }
}
