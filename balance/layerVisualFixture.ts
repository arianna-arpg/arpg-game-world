/** Browser pixel course against the production painters, with real engine objects. */
import { Renderer } from '../src/render/renderer';
import { LightLayer } from '../src/render/vis/lights';
import { makeSimWorld } from '../src/sim/arena';
import { GridWalkField } from '../src/world/gridWalk';
import { SKILLS } from '../src/data/skills';
import { makeSkillInstance } from '../src/engine/skills';
import { storyPointVisible } from '../src/render/vis/storyVisibility';

const w=makeSimWorld('warrior',1971),at={x:128,y:85};
w.zone={...w.zone,tiers:{kind:'over',levels:1,exposure:'covered'}};
w.player.pos={...at};w.actors=[w.player];w.doodads=[];w.exits=[];w.flashes=[];
w.markDoodadsChanged();w.rebuildClientTerrain();
const c=document.createElement('canvas');c.width=256;c.height=170;
const ctx=c.getContext('2d',{willReadFrequently:true})!;
const r=Object.assign(Object.create(Renderer.prototype),{canvas:c,ctx,cam:{x:0,y:0},
  stacked:[],hudMouse:{x:-1,y:-1},padAim:null});
Object.defineProperty(r,'zoom',{value:1});
w.spawnProjectile(w.player,makeSkillInstance(SKILLS.fireball),at,0);
w.projectiles[0].age=.2;
w.executeSkill(w.player,makeSkillInstance(SKILLS.toxic_cloud),at,{noCooldown:true,noRepeat:true});
w.zones[0].exploded=true;w.zones[0].delay=0;
w.drops=[{pos:{...at},bob:0,tier:0,item:{kind:'abilityEssence',tier:2,count:3}}];
w.chests=[{pos:{...at},tier:0,kind:'timed',mimic:false,opened:false,lockTime:0,maxLock:0}];
w.shrines=[{pos:{...at},tier:0,used:false,def:{id:'qa',name:'QA',duration:5,color:'#ffcc66',mods:[]}}];
const sheet=document.createElement('canvas');sheet.width=256*6;sheet.height=200*5;
const s=sheet.getContext('2d')!;s.fillStyle='#12191e';s.fillRect(0,0,sheet.width,sheet.height);
const failures:string[]=[],rows:unknown[]=[];
const methods=['drawProjectiles','drawZones','drawDrops','drawChests','drawShrines'];
const scenarios=['same floor','covered other','upstairs viewer','open cliff','inside building','stair link'];
for(let col=0;col<scenarios.length;col++) {
  w.player.tier=col===2?1:0;w.zone.tiers!.exposure=col===3||col===4?'open':'covered';
  const tier=col===0?0:1;
  for(const list of [w.projectiles,w.zones,w.drops,w.chests,w.shrines])for(const x of list)x.tier=tier;
  r.stacked=col===4?[{rect:{x:0,y:0,w:256,h:170}}]:[];
  w.walk=null;
  if(col===5){const grid=new GridWalkField(300,300);grid.fillRegion(0,0,299,299,'tier_ramp');w.walk=grid;}
  for(let row=0;row<methods.length;row++) {
    ctx.clearRect(0,0,c.width,c.height);r[methods[row]](w);
    const data=ctx.getImageData(0,0,c.width,c.height).data;let ink=0;
    for(let i=3;i<data.length;i+=4)if(data[i]>5)ink++;
    const visible=col!==1&&col!==4;
    if((ink>0)!==visible)failures.push(`${methods[row]} / ${scenarios[col]}: ${ink} pixels`);
    rows.push({painter:methods[row],scenario:scenarios[col],ink});
    s.drawImage(c,col*256,row*200+30);s.fillStyle='#eeeeee';s.font='12px sans-serif';
    s.fillText(`${methods[row].slice(4)}: ${scenarios[col]}`,col*256+8,row*200+18);
  }
}
// Lighting must not disclose an otherwise hidden source. Use the real collector;
// remove unrelated movers and ambient lanterns for an unambiguous count.
w.walk=null;w.zone.tiers!.exposure='covered';w.player.tier=0;w.player.dead=true;
w.zones=[];w.orbs=[];w.shrines=[];w.chests=[];w.drops=[];
w.projectiles[0].tier=1;
const lights=new LightLayer() as unknown as {collect:LightLayer['collect'];lights:unknown[]};
lights.collect(w,new Map(),0,0,256,170);
if(lights.lights.length)failures.push('hidden projectile leaks light');
w.projectiles[0].tier=0;lights.collect(w,new Map(),0,0,256,170);
if(!lights.lights.length)failures.push('visible projectile lost its light');
w.projectiles=[];w.doodads=[{pos:{...at},radius:12,kind:'campfire',tier:1}];w.markDoodadsChanged();
lights.collect(w,new Map(),0,0,256,170);
if(lights.lights.length)failures.push('hidden static lamp leaks light');
w.player.tier=1;lights.collect(w,new Map(),0,0,256,170);
if(!lights.lights.length)failures.push('lamp cache did not change with viewer floor');
const stair=new GridWalkField(300,300);stair.fillRegion(0,0,299,299,'tier_ramp');w.walk=stair;w.player.tier=0;
if(storyPointVisible(w,at,2))failures.push('ground-to-first-floor stair reveals the second floor');
(window as unknown as {layerQA:unknown}).layerQA={rows,failures,image:sheet.toDataURL('image/png')};
