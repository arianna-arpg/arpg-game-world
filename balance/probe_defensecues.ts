import { strict as assert } from 'node:assert';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { DEFENSE_CUE_STYLES } from '../src/data/defenseCues';
import { defenseCueFlash, defenseStyle } from '../src/engine/defenseCues';
import { makeSkillInstance, type SkillInstance, type GuardBashSpec } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { STATUS_DEFS } from '../src/engine/status';
import type { DamagePacket } from '../src/engine/damage';
import type { Actor } from '../src/engine/actor';
import { shellArcFactor } from '../src/engine/actor';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { drawEffectVoice } from '../src/render/vis/effectVoice';
import { statusBodyLean } from '../src/render/vis/defenseCueLayer';

bootSimEngine(); seedGlobalRandom(0xdefe);
const w = makeSimWorld('warrior', 0xdefe), p = w.player;
p.invulnerable = true;
const captions: string[] = [], emit = w.text.bind(w);
w.text = (...args) => { captions.push(args[1]); emit(...args); };
const internal = w as unknown as {
  tryShellPool(v: Actor, at: {x:number;y:number}, packet: DamagePacket, sg: Actor['shellGuard']): boolean;
  tryGuardBlock(v: Actor, attacker: Actor, at: {x:number;y:number}, raw: number): boolean;
  guardBash(a: Actor, inst: SkillInstance, bash: GuardBashSpec, shield: number): void;
};
const check = (name: string, ok: boolean) => { assert.ok(ok, name); console.log(`PASS ${name}`); };
const tick = (sec: number) => { for(let t=0;t<sec;t+=1/60) w.update(1/60); };
const spawn = (id: string) => {
  const a=w.createMonster(id,6,'enemy'); a.pos={x:p.pos.x+120,y:p.pos.y};
  a.facing=0; w.actors.push(a); return a;
};
const packet = (n: number): DamagePacket => ({ amounts:{physical:n*0.6,fire:n*0.4},crit:false,tags:new Set(['attack']),sourceName:'probe' });
const flashCount = (kind:string,event:string) => w.flashes.filter(f=>f.defenseCue?.kind===kind&&f.defenseCue.event===event).length;

check('unknown and omitted shell profiles have the universal fallback', defenseStyle('missing')===DEFENSE_CUE_STYLES.shell && defenseStyle(undefined)===DEFENSE_CUE_STYLES.shell);
check('object-property names cannot bypass the shell fallback', ['constructor','toString','__proto__'].every(id =>
  defenseStyle(id)===DEFENSE_CUE_STYLES.shell && defenseCueFlash(p,'shell','break','#fff',{style:id}).defenseCue.style==='shell'));
for(const [id,style] of [['garden_snail','spiral'],['shore_crab','carapace'],['rockgrub','shell']]) {
  const a=spawn(id),sg=a.shellGuard!,before=a.life;
  const at={x:a.pos.x+100,y:a.pos.y};
  if(sg.side!=='all') {
    const bypass=packet(10),count=w.flashes.length;
    check(`${id}: uncovered side neither absorbs nor flashes`, !internal.tryShellPool(a,{x:a.pos.x-100,y:a.pos.y},bypass,sg)&&w.flashes.length===count&&sg.pool===sg.max);
  }
  const light=packet(10);
  check(`${id}: covered blow still spends exactly its pool`,internal.tryShellPool(a,at,light,sg)&&sg.pool===sg.max-10&&a.life===before);
  check(`${id}: impact has source direction and authored style`,w.flashes.at(-1)?.defenseCue?.style===style&&w.flashes.at(-1)?.defenseCue?.event==='impact'&&w.flashes.at(-1)?.defenseCue?.facing===0);
  const remaining=sg.pool,heavy=packet(remaining+20);
  check(`${id}: breaking blow preserves typed overflow`,!internal.tryShellPool(a,at,heavy,sg)&&sg.broken&&sg.pool===0&&Math.abs(heavy.amounts.physical!-12)<1e-6&&Math.abs(heavy.amounts.fire!-8)<1e-6);
  check(`${id}: break uses the same visual profile`,w.flashes.at(-1)?.defenseCue?.style===style&&w.flashes.at(-1)?.defenseCue?.event==='break');
  const count=w.flashes.length;
  internal.tryShellPool(a,at,packet(100),sg);
  check(`${id}: already broken pool cannot emit repeated break events`,w.flashes.length===count);
  sg.regenDelay=0;sg.regenRate=sg.max;sg.reformFraction=0.5;
  tick(0.25);check(`${id}: partial regrowth leaves the shell open`,sg.broken&&sg.pool>0&&sg.pool<sg.max*0.5);
  tick(0.3);check(`${id}: actual reform threshold emits reconstruction`,!sg.broken&&flashCount('shell','reform')>0);
  a.dead=true;
}
// Explicitly unknown names cannot make a unique monster's break invisible.
const fallback=spawn('rockgrub'); fallback.shellGuard!.shellVisual='mod_missing';
internal.tryShellPool(fallback,{x:fallback.pos.x+80,y:fallback.pos.y},packet(500),fallback.shellGuard);
check('unknown authored profile resolves a real shell break',w.flashes.at(-1)?.defenseCue?.style==='shell');

const braced=spawn('brute');braced.sheet.setSource('cue-rig',[mod('poise','override',50)]);braced.poise=50;
check('real poise drain opens broken state',braced.damagePoise(60,p)&&braced.poiseBroken);
w.sweepDefenseEvents(braced);
check('poise has its own break geometry and persistent state',w.flashes.at(-1)?.defenseCue?.kind==='poise'&&braced.poiseBroken);
const count=flashCount('poise','break');w.sweepDefenseEvents(braced);
check('poise event is consumed once',flashCount('poise','break')===count);
braced.gainPoise(50);tick(0.03);
check('real poise rearm closes broken state and emits reassembly',!braced.poiseBroken&&flashCount('poise','reform')>0);

const defender=spawn('skeleton_warrior');p.pos={x:defender.pos.x+40,y:defender.pos.y};
const guard=makeSkillInstance({...SKILLS.shield_up,requirements:undefined,manaCost:0,
  guard:{...SKILLS.shield_up.guard!,parry:undefined,bashOnBreak:false}},1);
check('guard raises through ordinary cast path',w.useSkill(defender,guard,p.pos,true));
defender.facing=0;const capacity=defender.casting!.shield!;
check('guard impact consumes real shield pool',internal.tryGuardBlock(defender,p,p.pos,1)&&defender.casting!.shield===capacity-1&&flashCount('guard','impact')>0);
check('guard break ends the real stance and stamps cooldown',internal.tryGuardBlock(defender,p,p.pos,capacity+1)&&!defender.casting&&(defender.cooldowns.get(guard.def.id)??0)>0&&flashCount('guard','break')>0);
internal.guardBash(defender,guard,guard.def.guard!.bash!,25);
check('bash wears forward shield motion',flashCount('guard','bash')>0);

for(const a of [p,defender]) {
  a.applyStatus('winded',0,0.2,'probe');
  check(`${a.name}: brief Winded affects real body posture`,statusBodyLean(a)>0&&a.aiWindedUntil<=w.time);
  a.endStatus('winded');check(`${a.name}: early cleanse immediately removes posture`,statusBodyLean(a)===0);
  a.applyStatus('winded',0,0.1,'probe');tick(0.2);
  check(`${a.name}: overridden duration clears on actual expiry`,statusBodyLean(a)===0);
}
check('brief Winded does not borrow generic sparkle or vulnerability',STATUS_DEFS.winded.voice===false&&!STATUS_DEFS.winded.mods?.some(m=>m.stat==='armor'||m.stat==='damageTaken'));

// Ordinary anatomical shell + poise + status + oriented event all survive
// the real snapshot. A second snapshot explicitly clears removed state.
fallback.dead=false;fallback.shellGuard!.breathe={period:2,minFrac:0.3};
fallback.shellGuard!.side='rear';fallback.shellGuard!.arcDeg=140;
fallback.poiseBroken=true;fallback.applyStatus('winded',0,1,'probe');
const cue=defenseCueFlash(fallback,'shell','break','#aabbcc',{style:'spiral',facing:1.25,arc:1.8});w.flashes.push(cue);
const snap=serializeSnapshot(w,1),client=makeSimWorld('warrior',123);applySnapshot(client,snap);
const mirrored=()=>client.actors[snap.actors.findIndex(a=>a.id===fallback.id)];
check('co-op carries ordinary anatomical pools and profile',JSON.stringify(mirrored().shellGuard)===JSON.stringify(fallback.shellGuard));
check('co-op agrees on breathing coverage',shellArcFactor(mirrored().shellGuard!,w.time)===shellArcFactor(fallback.shellGuard!,w.time));
check('co-op carries broken poise and brief Winded',mirrored().poiseBroken&&statusBodyLean(mirrored())>0);
check('co-op preserves exact directional break geometry',JSON.stringify(client.flashes.at(-1)?.defenseCue)===JSON.stringify(cue.defenseCue));
fallback.shellGuard=undefined;fallback.poiseBroken=false;fallback.endStatus('winded');
applySnapshot(client,serializeSnapshot(w,2));
check('next snapshot clears shell, poise and status cues',!mirrored().shellGuard&&!mirrored().poiseBroken&&statusBodyLean(mirrored())===0);
check('all migrated combat captions are absent',!captions.some(t=>/^(BROKEN!|POISED|guard broken!|blocked|block!|shield bash!|SHELL BREAKS!|shell|shell regrows)$/.test(t)));

// Painter smoke over actual event geometry, independent of color: every
// profile makes paths at birth/midlife/recovery with balanced canvas state.
for(const style of Object.keys(DEFENSE_CUE_STYLES)) for(const event of ['break','reform','impact','bash'] as const) {
  let paths=0,depth=0;
  const ctx=new Proxy({save:()=>{depth++;},restore:()=>{depth--;},beginPath:()=>{paths++;}},
    {get:(o,k)=>k in o?o[k as keyof typeof o]:()=>{}}) as unknown as CanvasRenderingContext2D;
  const f=defenseCueFlash(p,style==='poise'?'poise':style==='guard'?'guard':'shell',event,'#888888',{style});
  for(const t of [1,0.5,0.05]) assert.ok(drawEffectVoice(ctx,'defenseCue',f,t));
  check(`${style}/${event}: paints geometry and restores canvas state`,paths>0&&depth===0);
}
console.log('ALL PASS');
