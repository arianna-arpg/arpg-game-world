import { strict as assert } from 'node:assert';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { COMBAT_CUE_STYLES } from '../src/data/combatCues';
import { combatCueFlash, combatCueStyle, parryCueStrength } from '../src/engine/combatCues';
import { makeSkillInstance, type SkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import type { Actor } from '../src/engine/actor';
import type { World } from '../src/engine/world';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawEffectVoice } from '../src/render/vis/effectVoice';
import { drawParryReady, drawReflectedCue } from '../src/render/vis/combatCueLayer';

type Zone = World['zones'][number];
bootSimEngine(); seedGlobalRandom(0xc0ec);
let count = 0;
const check = (name: string, ok: boolean) => { assert.ok(ok, name); count++; console.log(`PASS ${name}`); };
function setup() {
  const w = makeSimWorld('warrior', 0xc0ec), p = w.player;
  const e = w.createMonster('zombie', 1, 'enemy');
  w.actors = [p, e]; p.pos = {x:500,y:500}; e.pos = {x:600,y:500};
  for (const a of [p,e]) {
    a.sheet.setSource('cue-rig', [
      ...['armor','evasion','blockChance','critChance','lifeRegen','energyShield','endurance','poise','fireRes'].map(s=>mod(s,'override',0)),
      mod('life','override',10000),mod('mana','override',10000),mod('accuracy','override',100000),
      mod('damage','override',1),mod('damageTaken','override',1),
    ]);
    a.fillResources(); a.skills=[]; a.casting=null;
  }
  const captions:string[]=[]; const emit=w.text.bind(w);
  w.text=(...args)=>{captions.push(args[1]);emit(...args);};
  const internal=w as unknown as {
    resolveHit(c:Actor,i:SkillInstance,t:Actor):void;
    tryGuardBlock(v:Actor,a:Actor,pos:{x:number;y:number},raw:number):boolean;
    updateCasting(a:Actor,dt:number):void;
    updateProjectiles(dt:number):void;
    applyHeal(c:Actor,i:SkillInstance,t:Actor,fx:{amount:number},mult?:number,quiet?:boolean):number;
    detonateFissureSegment(z:Zone,dmg:number,radius:number):boolean;
  };
  return {w,p,e,internal,captions};
}
const last=(w:World,style:string)=>w.flashes.filter(f=>f.combatCue?.style===style).at(-1);
const attack=()=>makeSkillInstance({...SKILLS.fireball,requirements:undefined,manaCost:0,
  baseDamage:{fire:[40,40]},effects:[{type:'damage'},{type:'status',status:'burn',chance:1,magnitude:0.5}],
  innateMods:[mod('critChance','override',0)]});
const forbidden=/^(PARRY!|evade|immune|resisted|Perfect!|Flawless!|Perfect release!|Flawless release!|On the spark!|crit mend!|crit affliction!|aftershock!)$/;
function captionFree(captions:string[]) { check('migrated outcomes emit no captions',!captions.some(c=>forbidden.test(c))); }

for(const kind of ['evade','immune','resist'] as const) {
  const {w,p,e,internal,captions}=setup();
  if(kind==='evade') e.sheet.setSource('refusal',[mod('hitImmune','override',1)]);
  if(kind==='immune') e.invulnerable=true;
  if(kind==='resist') e.sheet.setSource('refusal',[mod('ailmentResist','override',1)]);
  const life=e.life;
  internal.resolveHit(p,attack(),e);
  check(`${kind}: real resolution emits its own shape`,!!last(w,kind));
  check(`${kind}: cue remains at the affected body and incoming direction`,last(w,kind)!.pos.x===e.pos.x&&last(w,kind)!.combatCue!.facing===Math.PI);
  check(`${kind}: rejected ailment is absent`,!e.statuses.some(s=>s.id==='burn'));
  check(`${kind}: hit damage is preserved`,kind==='resist'?e.life<life:e.life===life);
  captionFree(captions);
}

{
  const {w,p,e,internal,captions}=setup();
  const guard=makeSkillInstance({...SKILLS.shield_up,requirements:undefined,manaCost:0,
    guard:{...SKILLS.shield_up.guard!,parry:{window:0.4,counterMult:1},endOnParry:false}});
  check('guard raises through ordinary skill pipeline',w.useSkill(p,guard,e.pos,true));
  check('parry opening begins at full strength',parryCueStrength(p)===1);
  p.casting!.channelTime=0.4;
  check('exact inclusive parry boundary remains visibly open',parryCueStrength(p)>0);
  const shield=p.casting!.shield,life=e.life;
  internal.tryGuardBlock(p,e,e.pos,40);
  check('successful parry preserves shield and retaliates once',p.casting!.shield===shield&&Math.abs(life-e.life-40)<1e-6);
  check('parry cross lands on the weapon edge',last(w,'parry')!.pos.x>p.pos.x+p.radius);
  internal.tryGuardBlock(p,e,{x:p.pos.x+100,y:p.pos.y+40},40);
  check('off-axis contact stays at incoming surface despite riposte turning toward attacker',
    Math.abs(last(w,'parry')!.combatCue!.facing-Math.atan2(40,100))<1e-9);
  p.casting!.channelTime=0.401;
  check('parry cue ends at actual expiry',parryCueStrength(p)===0);
  w.flashes=[]; internal.tryGuardBlock(p,e,e.pos,1);
  check('late guard blocks without a parry cross',!last(w,'parry')&&p.casting!.shield!<shield!);
  p.casting!.channelTime=0.1;
  const snap=serializeSnapshot(w,1),client=makeSimWorld('warrior',8); applySnapshot(client,snap);
  const mirror=()=>client.actors[snap.actors.findIndex(a=>a.id===p.id)];
  check('co-op receives resolved opening even with minimal casting data',parryCueStrength(mirror())===parryCueStrength(p));
  p.casting=null;applySnapshot(client,serializeSnapshot(w,2));
  check('cancellation clears remote opening',parryCueStrength(mirror())===0);
  const supported=makeSkillInstance({...SKILLS.shield_up,requirements:undefined,manaCost:0,
    guard:{...SKILLS.shield_up.guard!,parry:undefined}});
  p.sheet.setSource('grafted-opening',[mod('guardParry','override',0.7)]);
  p.casting={inst:supported,mode:'guard',aim:e.pos,elapsed:0,total:1,held:true,baseMult:1,channelTime:0.35,shield:10,maxShield:10};
  check('stat-granted parry uses the same resolved opening',Math.abs(parryCueStrength(p)-0.6)<1e-9);
  p.casting.shield=0;check('empty guard has no opening',parryCueStrength(p)===0);
  captionFree(captions);
}

{
  const {w,p,e,internal}=setup();
  const guard=makeSkillInstance({...SKILLS.shield_up,requirements:undefined,manaCost:0,
    guard:{...SKILLS.shield_up.guard!,parry:{window:1,counterMult:1},endOnParry:true}});
  w.useSkill(e,guard,p.pos,true);
  const inst=attack(); w.spawnProjectile(p,inst,{...p.pos},0);
  const flight=w.projectiles.at(-1)!;
  for(let i=0;i<60&&!flight.parryDamage;i++){w.time+=1/60;internal.updateProjectiles(1/60);}
  check('actual reflected projectile changes ownership and direction',flight.caster===e&&!!flight.parryDamage&&Math.abs(flight.dir)>3);
  check('end-on-parry cancels the opening immediately',!e.casting&&parryCueStrength(e)===0);
  const snap=serializeSnapshot(w,1),client=makeSimWorld('warrior',8); applySnapshot(client,snap);
  check('co-op return-flight cue preserves original projectile body',client.projectiles[0].reflectedCue===true&&client.projectiles[0].shape===flight.shape&&client.projectiles[0].color===flight.color&&client.projectiles[0].dir===flight.dir);
  check('co-op cross preserves captured contact direction',JSON.stringify(client.flashes.find(f=>f.combatCue)?.combatCue)===JSON.stringify(w.flashes.find(f=>f.combatCue)?.combatCue));
  w.projectiles=[];w.flashes=[];applySnapshot(client,serializeSnapshot(w,2));
  check('expired reflection and impact disappear remotely',client.projectiles.length===0&&!client.flashes.some(f=>f.combatCue));
}

for(const mode of ['perfect','timed'] as const) {
  const {w,p,e,internal,captions}=setup();
  const inst=makeSkillInstance({...SKILLS.fireball,requirements:undefined,manaCost:0,castMode:mode,
    overcharge:{stages:3,time:1,perStage:0.2,window:0.2},effects:[]});
  const cast=(elapsed:number)=>({inst,mode,aim:{...e.pos},elapsed,total:1,held:true,baseMult:1,indicatorAt:0.5});
  p.casting=cast(0.1);w.castPress(p);
  check(`${mode}: mistimed press creates no success`,!w.flashes.some(f=>f.combatCue));
  p.casting=cast(mode==='perfect'?0.8:0.5);w.castPress(p);
  const style=mode==='perfect'?'perfect':'flawless';
  check(`${mode}: successful press keeps original empowerment`,p.casting.empowered===(mode==='perfect'?1.7:2.2));
  check(`${mode}: success locks at casting edge`,last(w,style)!.pos.x>p.pos.x+p.radius&&last(w,style)!.pos.y===p.pos.y);
  const n=w.flashes.length;w.castPress(p);check(`${mode}: repeated presses cannot replay cue`,w.flashes.length===n);
  w.flashes=[]; p.casting={...cast(mode==='perfect'?0.8:0.5),mode:'overcharge',held:false,stage:1,sinceStage:0,sparkWindow:0.2};
  internal.updateCasting(p,0);
  check(`${mode}: actual release emits timing and spark with no lingering cast`,!!last(w,style)&&!!last(w,'spark')&&!p.casting);
  captionFree(captions);
}

{
  const {w,p,e,internal,captions}=setup();
  p.sheet.setSource('critical',[mod('critChance','override',1),mod('critMulti','override',2),mod('dotCrit','override',1)]);
  const inst=makeSkillInstance({...SKILLS.fireball,requirements:undefined,manaCost:0,innateMods:[],
    baseDamage:{fire:[40,40]},effects:[{type:'damage'},{type:'status',status:'burn',chance:1,magnitude:0.5}]});
  p.life-=1000; const healed=internal.applyHeal(p,inst,p,{amount:10});
  check('critical mend retains doubled healing and recipient cue',healed===20&&last(w,'mend')?.pos.x===p.pos.x);
  w.flashes=[];internal.applyHeal(p,inst,p,{amount:10},1,true);
  check('quiet periodic mend does not spam critical cue',!last(w,'mend'));
  internal.resolveHit(p,inst,e);
  check('critical damaging affliction gets inward barbs in its material',!!last(w,'affliction')&&e.statuses.some(s=>s.id==='burn'&&s.dps>0));
  captionFree(captions);
}

{
  const {w,p,e,internal,captions}=setup();
  const z={caster:p,inst:attack(),pos:{...p.pos},radius:80,shape:0,facing:0,color:'#888',
    dmgMult:1,depth:0,flatBonus:0,struck:new Set<number>(),affects:'enemies'} as unknown as Zone;
  p.pos.x+=500;
  check('unstepped fissure makes no aftershock cue',!internal.detonateFissureSegment(z,1,0.5)&&!last(w,'aftershock'));
  p.pos={...z.pos};e.pos={x:p.pos.x+20,y:p.pos.y};const life=e.life;
  check('real fissure step detonates',internal.detonateFissureSegment(z,1,0.5));
  check('aftershock cue matches the actual scaled blast radius',last(w,'aftershock')?.radius===40&&last(w,'aftershock')?.pos.x===z.pos.x);
  check('aftershock still damages the actual nearby target',e.life<life);
  captionFree(captions);
}

for(const style of [...Object.keys(COMBAT_CUE_STYLES),'missing','constructor','__proto__']) {
  let paths=0,depth=0;
  const ctx=new Proxy({save:()=>{depth++;},restore:()=>{depth--;},beginPath:()=>{paths++;}},
    {get:(o,k)=>k in o?o[k as keyof typeof o]:()=>{}}) as unknown as CanvasRenderingContext2D;
  const f=combatCueFlash({x:3,y:7},style,20,1.25,'#888');
  for(const t of [1,0.5,0.05])assert.ok(drawEffectVoice(ctx,'combatCue',f,t));
  check(`${style}: monochrome geometry paints and restores state`,paths>0&&depth===0);
  if(!Object.hasOwn(COMBAT_CUE_STYLES,style))check(`${style}: universal profile fallback`,combatCueStyle(style)===COMBAT_CUE_STYLES.parry);
}
{
  let paths=0,depth=0;
  const ctx=new Proxy({save:()=>{depth++;},restore:()=>{depth--;},beginPath:()=>{paths++;}},
    {get:(o,k)=>k in o?o[k as keyof typeof o]:()=>{}}) as unknown as CanvasRenderingContext2D;
  const {p}=setup();drawParryReady(ctx,p);
  check('unguarded body has no fake readiness',paths===0);
  drawReflectedCue(ctx,{pos:{x:1,y:2},radius:4,dir:1});
  check('return marker renders independently of projectile cosmetics',paths===2&&depth===0);
}
console.log(`ALL PASS (${count} assertions)`);
