import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { WINDCHILL_CFG as C, type World } from '../src/engine/world';
import { STATUS_DEFS } from '../src/engine/status';
import { doodadRuleOf, type Doodad } from '../src/engine/levelgen';
import { dist, type Vec2 } from '../src/core/math';
import { dayCycle } from '../src/world/daynight';
import { NullInput } from '../src/net/intent';
import { nativeWorldCapabilities } from '../src/worldmass/nativeHost';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { canonical } from '../src/worldmass/random';
import type { ZoneDef } from '../src/data/zones';

type Thermal = {chillTimers:Map<number,number>;updateWindchill(dt:number):void};
const thermal=(w:World)=>w as unknown as Thermal;
const step=(w:World,dt:number)=>{w.time+=dt;thermal(w).updateWindchill(dt);};
const stacks=(w:World)=>w.player.statuses.find(s=>s.id==='chill')?.stacks??0;
const reset=(w:World)=>{for(const s of w.seats){for(const id of ['chill','frozen','hearthglow'])s.actor.endStatus(id);}thermal(w).chillTimers.clear();};
// Independent transcription of the pre-local-context finite driver. Its actor
// status and sheet operations remain real native operations, not mock counters.
function finiteOracle(w:World,dt:number):void{
  const dial=w.zone.theme.windchill??0;if(dial<=0)return;
  const temp=w.zoneMap[w.zone.id]?.geo?.climate?.temperature??.5;
  const cold=C.coldBase+C.coldGain*(1-temp),dark=dayCycle(w.time).light<C.nightBelow,wind=w.zoneWind();
  for(const {actor:a}of w.seats){
    if(a.dead||a.downed)continue;let t=(thermal(w).chillTimers.get(a.id)??0)+dt;
    let warm=a.sheet.get('windchillWard')>0||w.underRoofAt(a.pos);
    if(!warm)for(const d of w.doodadsNear(a.pos.x,a.pos.y,C.warmReach)){
      if(d.gone||d.felled)continue;const warms=doodadRuleOf(d.kind).warms;if(!warms)continue;
      if(dist(a.pos,d.pos)<=(warms===true?C.warmReach:warms)+a.radius*.5){warm=true;break;}
    }
    let strength=0;
    if(!warm&&wind&&wind.strength>=C.leeMinWind){const felt=w.windAt(a.pos,a.tier);if(!felt)warm=true;else strength=felt.strength;}
    const chill=a.statuses.find(s=>s.id==='chill');
    if(!warm){
      const every=C.stackEvery/(dial*cold*(1+C.windGain*strength)*(dark?C.nightMul:1));
      if(t>=every){t=0;a.applyStatus('chill',0,1,'the mountain cold');}
      if(chill&&chill.stacks>0)chill.remaining=Math.max(chill.remaining,C.holdTtl);
    }else if(chill&&t>=C.dwindleEvery){
      t=0;chill.stacks--;const def=STATUS_DEFS.chill;
      if(chill.stacks<=0){a.statuses.splice(a.statuses.indexOf(chill),1);a.sheet.removeSource('status:chill');}
      else if(def?.mods)a.sheet.setSource('status:chill',def.mods.map(m=>({...m,value:m.value*chill.stacks})));
    }else if(warm)t=Math.min(t,C.dwindleEvery);
    thermal(w).chillTimers.set(a.id,t);
  }
}
const undo=seedGlobalRandom(97131);
try{
  for(const mode of ['open','fire','ward','no-dial','dead','downed'] as const){
    const run=(oracle:boolean)=>{
      const w=makeSimWorld('warrior',97131);w.zone={...w.zone,theme:{...w.zone.theme,...(mode==='no-dial'?{}:{windchill:.75})}};
      w.zoneMap[w.zone.id]={...w.zone,geo:{climate:{temperature:.12}}};w.time=700;
      if(mode==='fire'){w.doodads.push({kind:'campfire',radius:10,pos:{x:w.player.pos.x+30,y:w.player.pos.y}});w.markDoodadsChanged();}
      if(mode==='ward')w.player.applyStatus('hearthglow',0,1,'native hearth');
      if(mode==='dead')w.player.dead=true;if(mode==='downed')w.player.downed=true;
      w.player.applyStatus('chill',0,2,'test cold');w.texts=[];w.flashes=[];
      const trace:unknown[]=[];for(const dt of [.25,.7,1.2,2.9,.016,4.7,1.1,10]){
        w.time+=dt;if(oracle)finiteOracle(w,dt);else thermal(w).updateWindchill(dt);
        trace.push({statuses:structuredClone(w.player.statuses),timer:thermal(w).chillTimers.get(w.player.id),move:w.player.sheet.get('moveSpeed')});
      }
      return{trace,words:w.texts,next:Math.random()};
    };
    const oldSeed=seedGlobalRandom(97139);let old:ReturnType<typeof run>;try{old=run(true);}finally{oldSeed();}
    const newSeed=seedGlobalRandom(97139);let now:ReturnType<typeof run>;try{now=run(false);}finally{newSeed();}
    assert.deepEqual(now,old,mode+' finite statuses/sheet/cadence/text/global RNG parity');
  }
  console.log('PASS independently transcribed finite windchill cadence, warmth, buildup, dead/downed and no-theme behavior retain native status/sheet/RNG output');

  const w=makeSimWorld('warrior',97132);w.startWorldMass(713);const mass=w.massRuntime!,geo=mass.geography!;
  type Site={at:Vec2;zone:Readonly<ZoneDef>};let cold:Site|undefined,warm:Site|undefined;
  // Pure geographic context selection, no fixture injection/source rewriting.
  // Finite bounds prevent a missing source from turning into an endless scan.
  for(let y=-5;y<=5&&!cold;y++)for(let x=-5;x<=5;x++){
    const at={x:x*21600+10800,y:y*21600+10800},zone=geo.contextAt(mass.walk.at(at.x,at.y));if(!zone)continue;
    if((zone.theme.windchill??0)>0&&zone.geo?.climate?.temperature!==undefined)cold={at,zone};
    else if(!warm)warm={at,zone};if(cold&&warm)break;
  }
  assert.ok(cold&&warm,'unchanged country must expose a native cold context and a non-cold context');
  const coldSite=cold,warmSite=warm,global=w.zone,globalData=canonical(w.zone);
  assert.equal(global.theme.windchill??0,0);w.player.pos={...coldSite.at};
  assert.equal(w.localZoneAt(w.player.pos).theme.windchill,coldSite.zone.theme.windchill,'actual World lookup retains cold source');
  // Calm controlled sky isolates native climate cadence; separate seat case
  // below supplies spatially distinct wind. Never replace context resolution.
  const nativeWind=w.zoneWind;w.zoneWind=()=>null;w.time=700;w.texts=[];
  const need=C.stackEvery/((coldSite.zone.theme.windchill??0)*(C.coldBase+C.coldGain*(1-coldSite.zone.geo!.climate!.temperature!))
    *(dayCycle(w.time).light<C.nightBelow?C.nightMul:1));
  step(w,need*.6);assert.equal(stacks(w),0);const bank=thermal(w).chillTimers.get(w.player.id)!;
  w.player.pos={...warmSite.at};step(w,10);assert.equal(stacks(w),0);assert.equal(thermal(w).chillTimers.get(w.player.id),bank,'warm country pauses native bank instead of erasing it');
  w.player.pos={x:coldSite.at.x+1351,y:coldSite.at.y};assert.equal(geo.contextAt(mass.walk.at(w.player.pos.x,w.player.pos.y))!.tileset,coldSite.zone.tileset);
  step(w,need*.41);assert.equal(stacks(w),1,'ordinary chunk crossing never restarts accrued native exposure');
  assert.equal(w.zone,global);assert.equal(canonical(w.zone),globalData);assert.equal(w.texts.length,0);
  console.log('PASS naturally selected '+coldSite.zone.tileset+' at '+JSON.stringify(coldSite.at)+' (warm '+JSON.stringify(warmSite.at)+') becomes cold under unchanged shell; crossings preserve bank without zone swap/narration');

  reset(w);const ally=w.addSeat('thermal-peer',w.meta.classDef,new NullInput(),{startingCompanions:false,startingFlasks:false});
  w.player.pos={...warmSite.at};ally.actor.pos={...coldSite.at};w.time=700;
  const sampled:Vec2[]=[];w.zoneWind=(pos=w.player.pos)=>{sampled.push({...pos});return pos.x===ally.actor.pos.x&&pos.y===ally.actor.pos.y?{nx:1,ny:0,strength:1}:null;};
  step(w,need/(1+C.windGain)+.01);
  assert.equal(stacks(w),0);assert.equal(ally.actor.statuses.find(s=>s.id==='chill')?.stacks,1);
  assert.ok(sampled.some(p=>p.x===ally.actor.pos.x&&p.y===ally.actor.pos.y),'wind sampled at cold peer rather than camera player');
  assert.equal(w.zone,global);w.seats.splice(w.seats.indexOf(ally),1);w.actors.splice(w.actors.indexOf(ally.actor),1);
  console.log('PASS simultaneous warm local hero and cold remote seat read their own climate and wind; one seat cannot borrow another seat\'s weather');

  w.player.pos={...coldSite.at};w.time=700;w.zoneWind=()=>({nx:1,ny:0,strength:1});
  for(const kind of ['campfire','roof','lee','ward','gone-fire'] as const){
    reset(w);w.player.applyStatus('chill',0,1,'test cold');w.player.applyStatus('chill',0,1,'test cold');assert.equal(stacks(w),2);
    let d:Doodad|undefined;
    if(kind==='campfire'||kind==='gone-fire')d={kind:'campfire',radius:10,pos:{x:w.player.pos.x+30,y:w.player.pos.y},...(kind==='gone-fire'?{gone:true}:{})};
    if(kind==='roof')d={kind:'sinter_overhang',radius:60,pos:{...w.player.pos}};
    if(kind==='lee')d={kind:'rock',radius:24,pos:{x:w.player.pos.x-36,y:w.player.pos.y}};
    if(kind==='ward')w.player.applyStatus('hearthglow',0,1,'native hearth');
    if(d){w.doodads.push(d);w.markDoodadsChanged();}
    if(kind==='roof')assert.ok(w.underRoofAt(w.player.pos),'native roof fixture must actually shelter');
    if(kind==='lee')assert.equal(w.windAt(w.player.pos),null,'real native body must carve a lee');
    step(w,C.dwindleEvery+.01);
    assert.equal(stacks(w),kind==='gone-fire'?2:1,kind+' native counterplay');
    if(d){w.doodads.splice(w.doodads.indexOf(d),1);w.markDoodadsChanged();}
  }
  w.zoneWind=nativeWind;
  console.log('PASS actual native campfire, roof, upwind rock and hearthglow shed chill; a gone fire provides no warmth');

  reset(w);w.player.applyStatus('chill',0,2,'the mountain cold');w.player.applyStatus('hearthglow',0,1,'native hearth');thermal(w).chillTimers.set(w.player.id,.73);
  const saved=serializeCharacter(w),next=makeSimWorld('warrior',97133);assert.ok(applySavedCharacter(next,saved));assert.ok(next.adoptWorldState(saved.world));next.startWorldMass(713,saved.world!.worldmass);
  assert.equal(next.player.statuses.some(s=>['chill','frozen','hearthglow'].includes(s.id)),false);
  assert.equal(thermal(next).chillTimers.size,0,'native transient player condition boundary is explicit; no claim of exact active cold Continue');
  assert.equal(canonical(next.massRuntime!.geography!.contextAt(next.massRuntime!.walk.at(coldSite.at.x,coldSite.at.y))),canonical(coldSite.zone));
  const caps=nativeWorldCapabilities();assert.equal(caps.has('context:windchill'),false);assert.equal(caps.has('doodad:hearth_crystal'),false);
  assert.equal(caps.has('doodad:haven_stone'),false);
  console.log('PASS CharacterSave retains frozen native climate while preserving main\'s transient player-status/timer reset; no unbound mountain/hearth/haven capability is admitted');
}finally{undo();}
