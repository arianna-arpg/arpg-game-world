import { Renderer } from '../src/render/renderer';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { updateAI } from '../src/engine/ai';
import { angleDiff } from '../src/core/math';
import { drawWatchSense, WATCH_FAN_DEV } from '../src/render/vis/watchLayer';

export function run() {
  const checks:{name:string;ok:boolean;detail?:unknown}[]=[];
  const check=(name:string,ok:boolean,detail?:unknown)=>checks.push({name,ok,detail});
  const restore=seedGlobalRandom(62419),w=makeSimWorld('warrior',62419);
  w.player.pos={x:600,y:650};w.player.sheet.setBase('detectability',0);
  w.actors=[w.player];w.doodads=[];w.exits=[];w.structures=[];w.flashes=[];
  w.zone.theme={...w.zone.theme,ambientDark:.12};w.markDoodadsChanged();
  const kinds=['stilt_strider','ushabti_sentinel'];
  const actors=kinds.map((id,i)=>{
    const a=w.createMonster(id,5,'enemy');a.pos={x:440+i*320,y:560};
    a.aiPost={...a.pos};a.aiAnchor={...a.pos};a.aiPostFacing=0;a.facing=a.facingPrev=0;
    w.actors.push(a);return a;
  });
  const canvas=document.createElement('canvas');document.body.append(canvas);
  const renderer=new Renderer(canvas);renderer.worldOnly=true;renderer.setCaptureViewport({w:1000,h:620});
  let jumps=0,maxJump=0;
  const shots:string[]=[];
  for(let frame=0;frame<240;frame++){
    const before=actors.map(a=>a.facing);
    for(const a of actors)updateAI(a,w,1/60);
    w.update(1/60);renderer.render(w);
    for(const [i,a]of actors.entries()){
      const turn=Math.abs(angleDiff(before[i],a.facing));maxJump=Math.max(maxJump,turn);
      if(turn>3.4/60+1e-6)jumps++;
    }
    if(frame===30||frame===90||frame===150)shots.push(canvas.toDataURL());
  }
  check('240 real rendered frames have no stationary facing jumps',jumps===0,{jumps,maxJump});
  for(const [i,a]of actors.entries())check(kinds[i]+' remains at its post',Math.hypot(a.pos.x-(440+i*320),a.pos.y-560)<.01);
  const fan=document.createElement('canvas');fan.width=1400;fan.height=1000;
  const ctx=fan.getContext('2d',{willReadFrequently:true})!;
  w.player.sheet.setBase('detectability',1);
  function painted(){
    const pixels=ctx.getImageData(0,0,fan.width,fan.height).data;
    let n=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i])n++;return n;
  }
  for(const a of actors){
    w.actors=[w.player,a];ctx.clearRect(0,0,fan.width,fan.height);
    drawWatchSense(ctx,w,w.player);const ordinary=painted();
    WATCH_FAN_DEV.all=true;ctx.clearRect(0,0,fan.width,fan.height);
    drawWatchSense(ctx,w,w.player);const debug=painted();WATCH_FAN_DEV.all=false;
    check(a.defId+' paints no ambient radius but retains the developer overlay',ordinary===0&&debug>100,{ordinary,debug});
    check(a.defId+' retains a real sensing reach',a.senseDetect>100);
  }
  w.actors=[w.player,...actors];w.player.sheet.setBase('detectability',0);
  restore();
  return {checks,failures:checks.filter(c=>!c.ok),shots};
}
Object.assign(window,{watcherGazeQA:{run}});
