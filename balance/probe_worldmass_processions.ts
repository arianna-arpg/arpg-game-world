/** Independent native controller transcription and factory parity. */
import assert from 'node:assert/strict';
import type { Actor } from '../src/engine/actor';
import { Rng, withSeededRandom } from '../src/core/rng';
import { angleTo, dist, rand, randInt, type Vec2 } from '../src/core/math';
import type { World } from '../src/engine/world';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { ZONES, type PackTableEntry } from '../src/data/zones';
import { objectiveRewardXp } from '../src/data/objectiveRewards';
import { captureNativeActorState } from '../src/worldmass/dormancy';
import { address, localOffset } from '../src/worldmass/address';
import { layTraveledWay, hitSurfaceOf, bodyRadiusOf, type Doodad } from '../src/engine/levelgen';
import {
  nativeProcessionConfig, driveNativeProcession, rerallyNativeProcession,
  nativeProcessionSteering, validateNativeProcessionConfig,
  type NativeProcessionState, type NativeProcessionHost,
} from '../src/engine/processionObjectives';

type Driver = typeof driveNativeProcession;

/** Independent transcription of World's finite procession branch and ambush
 * prelude, with local text removed but its exact jitter draws retained. This MUST
 * NOT call the proposed shared ambush helper. The spawn mock deliberately
 * consumes draws so count/factory/next-deadline ordering is observable. */
const originalSilent: Driver = (dt, pr, c, h) => {
  if (pr.done || pr.lost || pr.cartId == null) return;
  const cart = h.actorById(pr.cartId);
  if (!cart || cart.dead) {
    pr.lost = true;
    h.lose();
    if (cart) {
      h.wreck(cart);
      h.flash({ ...cart.pos }, 90, c.smoke, 0.7);
    }
    pr.cartId = null;
    return;
  }
  if (!pr.rolling) {
    if (h.now - pr.enteredAt < c.entryGraceSec) { pr.dwellStart = 0; return; }
    const engaged = !h.player.dead && dist(h.player.pos, cart.pos) <= c.rallyRadius
      && h.reachable(h.player, cart, c.rallyReach);
    if (!engaged) { pr.dwellStart = 0; return; }
    if (pr.dwellStart === 0) pr.dwellStart = h.now;
    if (h.now - pr.dwellStart >= c.rallyDwell) {
      pr.rolling = true;
      pr.started = true;
      pr.puffAt = h.now + h.random.range(c.puffEvery[0], c.puffEvery[1]);
      cart.untargetable = false;
      cart.invulnerable = false;
      h.random.range(-10,10);
      h.flash({ ...cart.pos }, 80, c.accent, 0.5);
    }
    return;
  }
  h.lure(cart, c);
  const robbed = h.enemiesOf(cart).some(e => !e.dead && !e.passive && dist(e.pos, cart.pos) <= c.robRadius);
  if (!robbed) {
    const to = h.steering(cart, pr.dest);
    pr.heading = angleTo(cart.pos, to);
    cart.facing = pr.heading;
    h.move(cart, to.x - cart.pos.x, to.y - cart.pos.y, dt * c.speedMul);
  }
  if (h.now >= pr.puffAt) {
    pr.puffAt = h.now + h.random.range(c.puffEvery[0], c.puffEvery[1]);
    const alive = h.robbersAlive();
    if (alive < c.puffCap) {
      const n = Math.min(h.random.int(c.puffCount[0], c.puffCount[1]), c.puffCap - alive);
      if(h.spawnAmbush(cart, pr.heading, n, c)>0)h.random.range(-10,10);
    }
  }
  if (dist(cart.pos, pr.dest) <= c.arriveDist) {
    h.flash({ ...cart.pos }, 110, c.accent, 0.7);
    cart.dead = true;
    pr.cartId = null;
    // completeObjective owns its latch; mirroring done before calling it
    // would accidentally return before native XP/chest/quest completion.
    h.win(pr);
    pr.done = true;
  }
};

/** Narrow controller mock: every accessed field is supplied; none of the
 * Actor combat/factory/codec paths is purportedly tested through this cast. */
const actor = (id: number, pos: Vec2): Actor => ({ id, pos: { ...pos }, radius: 18,
  life: 197, dead: false, passive: false, untargetable: true, invulnerable: true,
  facing: 0, tier: 0 } as unknown as Actor);
interface Frame { at: number; playerDead?: boolean; far?: boolean; reach?: boolean; count?: number; cartDead?: boolean }
interface Scenario {
  name: string; state?: Partial<NativeProcessionState>;
  missing?: boolean; deadCart?: boolean; enemy?: 'live' | 'dead' | 'passive';
  frames: Frame[];
}
const config = nativeProcessionConfig({ kind: 'procession' });
assert.deepEqual([config.lifeBase, config.lifePerLevel, config.speedMul, config.arriveDist,
  config.entryGraceSec, config.rallyDwell, config.rallyRadius, config.robRadius,
  config.puffEvery, config.puffCount, config.puffCap], [220, 46, .62, 84, 2.5, .9, 96, 110, [7, 12], [2, 3], 9]);
assert(Object.isFrozen(config) && Object.isFrozen(config.robbers) && Object.isFrozen(config.fixation));

function run(driver: Driver, scenario: Scenario, seed: number) {
  const rng = new Rng(seed), trace: unknown[][] = [], cart = actor(17, { x: 0, y: 0 });
  const player = actor(1, { x: 20, y: 0 }), foe = actor(31, { x: 30, y: 0 });
  cart.dead = !!scenario.deadCart;
  foe.dead = scenario.enemy === 'dead'; foe.passive = scenario.enemy === 'passive';
  const state: NativeProcessionState = { cartId: cart.id, rolling: false, started: false,
    startPos: { ...cart.pos }, dest: { x: 1000, y: 0 }, destIdx: 2, dwellStart: 0,
    puffAt: 0, heading: 0, enteredAt: 0, done: false, lost: false, ...scenario.state };
  let sceneDone = state.done, sceneLost = state.lost, count = 0, canReach = true, xpPayments = 0, wrecks = 0;
  // Deliberately use a direct alias, the dangerous natural finite adapter.
  Object.defineProperty(state, 'done', { enumerable: true, get: () => sceneDone, set: v => { sceneDone = v; } });
  const host: NativeProcessionHost = {
    now: 0, player,
    random: {
      range: (lo, hi) => { const v = rng.range(lo, hi); trace.push(['beat', lo, hi, v]); return v; },
      int: (lo, hi) => { const v = rng.int(lo, hi); trace.push(['batch', lo, hi, v]); return v; },
    },
    actorById: id => !scenario.missing && id === cart.id ? cart : null,
    reachable: (_p, _c, reach) => { trace.push(['reach', reach]); return canReach; },
    enemiesOf: () => scenario.enemy ? [foe] : [],
    steering: (_c, dest) => ({ ...dest }),
    move: (a, dx, dy, dt) => {
      trace.push(['move', dx, dy, dt]);
      const scale = 70 * dt / Math.max(1, Math.hypot(dx, dy));
      a.pos.x += dx * scale; a.pos.y += dy * scale;
    },
    lure: (a, c) => { trace.push(['lure', { ...a.pos }, c.lureRadius, c.lurePace, c.lureStandoff, a.tier]); },
    robbersAlive: () => { trace.push(['census', count]); return count; },
    spawnAmbush: (a, heading, n) => {
      trace.push(['spawn', { ...a.pos }, heading, n]);
      // Representative mock factory consumption, NOT actual factory proof.
      for (let i = 0; i < n; i++) trace.push(['body-draws', rng.next(), rng.next(), rng.next()]);
      count += n;
      return n;
    },
    flash: (p, r, c, life) => { trace.push(['flash', { ...p }, r, c, life]); },
    wreck: a => { assert(sceneLost); wrecks++; trace.push(['wreck', a.id]); },
    lose: () => { sceneLost = true; trace.push(['lose']); },
    win: () => {
      trace.push(['win', sceneDone]);
      if (sceneDone) return; // Exact native completeObjective first guard.
      sceneDone = true; xpPayments++;
    },
  };
  for (const frame of scenario.frames) {
    host.now = frame.at;
    if (frame.playerDead !== undefined) player.dead = frame.playerDead;
    if (frame.far !== undefined) player.pos = { x: frame.far ? 900 : 20, y: 0 };
    if (frame.reach !== undefined) canReach = frame.reach;
    if (frame.count !== undefined) count = frame.count;
    if (frame.cartDead !== undefined) cart.dead = frame.cartDead;
    driver(1 / 30, state, config, host);
  }
  return { trace, state: { ...state }, cart: { pos: cart.pos, life: cart.life, dead: cart.dead,
    untargetable: cart.untargetable, invulnerable: cart.invulnerable, facing: cart.facing },
    count, sceneDone, sceneLost, xpPayments, wrecks, next: rng.next() };
}

const scenarios: Scenario[] = [
  { name: 'grace/rally/no same-frame movement', frames: [{ at: 1 }, { at: 2.5 }, { at: 3 }, { at: 3.5 }] },
  { name: 'left ring resets dwell', frames: [{ at: 3 }, { at: 3.5, far: true }, { at: 4, far: false }, { at: 5 }] },
  { name: 'dead hero cannot rally', frames: [{ at: 3, playerDead: true }, { at: 5 }] },
  { name: 'story/reach refusal resets dwell', frames: [{ at: 3 }, { at: 3.5, reach: false }, { at: 5 }] },
  { name: 'normal march clock', state: { rolling: true, started: true, puffAt: 8 }, frames: [{ at: 7 }, { at: 8 }, { at: 30 }] },
  { name: 'robbed wheels still clock/lure', state: { rolling: true, puffAt: 3 }, enemy: 'live', frames: [{ at: 3 }, { at: 30 }] },
  { name: 'dead foe does not stop wheels', state: { rolling: true, puffAt: 100 }, enemy: 'dead', frames: [{ at: 3 }] },
  { name: 'passive foe does not stop wheels', state: { rolling: true, puffAt: 100 }, enemy: 'passive', frames: [{ at: 3 }] },
  { name: 'native cap-full advances beat/no batch', state: { rolling: true, puffAt: 3 }, frames: [{ at: 3, count: 9 }, { at: 30 }] },
  { name: 'native cap-one remaining', state: { rolling: true, puffAt: 3 }, frames: [{ at: 3, count: 8 }] },
  { name: 'dead cart wreck once', deadCart: true, frames: [{ at: 3 }, { at: 4 }] },
  { name: 'missing cart no invented wreck', missing: true, frames: [{ at: 3 }, { at: 4 }] },
  { name: 'native null cart id driver stays inert', state: { cartId: null }, frames: [{ at: 3 }, { at: 4 }] },
  { name: 'arrival due ambush first', state: { rolling: true, puffAt: 3, dest: { x: 80, y: 0 } }, frames: [{ at: 3 }, { at: 4 }] },
  { name: 'already near arrival while robbed', state: { rolling: true, puffAt: 100, dest: { x: 80, y: 0 } }, enemy: 'live', frames: [{ at: 3 }] },
  { name: 'dormant destination still needs rally', state: { dest: { x: 30, y: 0 } }, frames: [{ at: 3 }, { at: 4 }] },
  { name: 'completed inert', state: { done: true }, frames: [{ at: 3 }, { at: 100 }] },
  { name: 'lost inert', state: { lost: true }, frames: [{ at: 3 }, { at: 100 }] },
];
for (const scenario of scenarios) for (const seed of [1, 773, 19473])
  assert.deepEqual(run(driveNativeProcession, scenario, seed), run(originalSilent, scenario, seed), scenario.name);
const win = run(driveNativeProcession, scenarios.find(s => s.name === 'arrival due ambush first')!, 1);
assert.equal(win.xpPayments, 1, 'aliased done latch must not preempt native completion');
assert.equal(win.wrecks, 0);
assert(win.trace.findIndex(t => t[0] === 'spawn') < win.trace.findIndex(t => t[0] === 'win'));
const loss = run(driveNativeProcession, scenarios.find(s => s.name === 'dead cart wreck once')!, 1);
assert.equal(loss.wrecks, 1); assert.equal(loss.xpPayments, 0);

const cart = actor(84, { x: 190, y: 270 }); cart.invulnerable = cart.untargetable = false;
const old: NativeProcessionState = { cartId: 17, rolling: true, started: true,
  startPos: { x: 20, y: 40 }, dest: { x: 1000, y: 0 }, destIdx: 2,
  enteredAt: 0, dwellStart: 10, puffAt: 100, heading: 1, done: false, lost: false };
rerallyNativeProcession(old, cart, 200);
assert.deepEqual([cart.pos, cart.life, old.startPos, old.dest, old.started, old.destIdx],
  [{ x: 190, y: 270 }, 197, { x: 20, y: 40 }, { x: 1000, y: 0 }, true, 2]);
assert.deepEqual([old.cartId, old.rolling, old.dwellStart, old.puffAt, old.enteredAt,
  cart.invulnerable, cart.untargetable], [84, false, 0, 0, 200, true, true]);
assert.throws(() => rerallyNativeProcession({ ...old, lost: true }, cart, 201), /terminal/);
assert.throws(() => rerallyNativeProcession({ ...old, done: true }, cart, 201), /terminal/);
assert.deepEqual(nativeProcessionSteering(cart, old.dest, null), old.dest);
assert.deepEqual(nativeProcessionSteering(cart, old.dest, { lineWalkable: () => false, pathStep: () => null }), old.dest);
assert.deepEqual(nativeProcessionSteering(cart, old.dest, { lineWalkable: () => false, pathStep: () => ({ x: 200, y: 280 }) }), { x: 200, y: 280 });
console.log('PASS native controller transcription, RNG/event order, aliased completion latch and native rerally semantics');

// Full real World regression, independently transcribed from75bba196's finite
// updateObjective branch/spawn loop/completion. Unlike the narrow driver mock,
// this executes original World.text jitter and notice calls, real factories,
// movement, XP and drops. Local narration is excluded ONLY from the comparison.
type FiniteAccess={procession:NativeProcessionState;zoneEnteredAt:number;updateObjective(dt:number):void;
  weightedPick(table:readonly PackTableEntry[],level:number):string;clampNear(at:Vec2,radius:number):Vec2;
  pathField():Parameters<typeof nativeProcessionSteering>[2]};
const finite=(w:World)=>w as unknown as FiniteAccess;
function archivedFinite(w:World,dt:number):void{
  const pr=finite(w).procession,c=config;
  if(w.objectiveDone||w.objectiveLost||!pr||pr.cartId==null)return;
  const cargo=w.actorById(pr.cartId);
  if(!cargo||cargo.dead){
    w.objectiveLost=true;
    if(cargo){w.dropGemAt(cargo.pos);w.flashes.push({pos:{...cargo.pos},radius:90,color:c.smoke,life:.7,maxLife:.7});}
    pr.cartId=null;w.notice('The caravan is lost — its bounty with it.','#d05050',16,'events');return;
  }
  if(!pr.rolling){
    if(w.time-finite(w).zoneEnteredAt<c.entryGraceSec){pr.dwellStart=0;return;}
    const engaged=!w.player.dead&&dist(w.player.pos,cargo.pos)<=c.rallyRadius&&w.massProcessionReachable(w.player,cargo,c.rallyReach);
    if(!engaged){pr.dwellStart=0;return;}if(pr.dwellStart===0)pr.dwellStart=w.time;
    if(w.time-pr.dwellStart>=c.rallyDwell){
      pr.rolling=true;pr.started=true;pr.puffAt=w.time+rand(c.puffEvery[0],c.puffEvery[1]);cargo.untargetable=false;cargo.invulnerable=false;
      w.text({x:cargo.pos.x,y:cargo.pos.y-40},'The procession sets out — see it through!',c.accent,15);
      w.flashes.push({pos:{...cargo.pos},radius:80,color:c.accent,life:.5,maxLife:.5});
    }return;
  }
  w.setLure('procession',cargo.pos,c.lureRadius,c.lurePace,c.lureStandoff,undefined,cargo.tier);
  if(!w.enemiesOf(cargo).some(a=>!a.dead&&!a.passive&&dist(a.pos,cargo.pos)<=c.robRadius)){
    const field=finite(w).pathField();let to=pr.dest;
    if(field?.pathStep&&!(field.lineWalkable?.(cargo.pos,pr.dest)??false))to=field.pathStep(cargo.pos,pr.dest)??pr.dest;
    pr.heading=angleTo(cargo.pos,to);cargo.facing=pr.heading;w.moveActor(cargo,to.x-cargo.pos.x,to.y-cargo.pos.y,dt*c.speedMul);
  }
  if(w.time>=pr.puffAt){
    pr.puffAt=w.time+rand(c.puffEvery[0],c.puffEvery[1]);
    const alive=w.actors.filter(a=>!a.dead&&a.tag==='procession_robber').length;
    if(alive<c.puffCap){
      const objective=w.zone.objective;assert.equal(objective.kind,'procession');if(objective.kind!=='procession')throw Error('fixture');
      const table=objective.robbers??JSON.parse(JSON.stringify(c.robbers)) as PackTableEntry[],lvl=Math.max(1,w.zone.level);
      const n=Math.min(randInt(c.puffCount[0],c.puffCount[1]),c.puffCap-alive),base={x:cargo.pos.x+Math.cos(pr.heading)*c.puffLead,y:cargo.pos.y+Math.sin(pr.heading)*c.puffLead};let spawned=0;
      for(let i=0;i<n;i++){
        const type=finite(w).weightedPick(table,lvl);if(!MONSTERS[type])continue;
        const a=w.createMonster(type,lvl,'enemy'),at={x:base.x+rand(-c.puffJitter,c.puffJitter),y:base.y+rand(-c.puffJitter,c.puffJitter)};
        a.pos=w.clampPos(w.findFreeSpot(at,a.radius+2)??finite(w).clampNear(cargo.pos,150),a.radius);a.tag='procession_robber';a.eventKey='procession:'+w.zone.id;
        const ag=a.defId?MONSTERS[a.defId]?.aggro:undefined;
        a.aiTuning={target:{prefer:'highestThreat',relentless:true,stickiness:c.fixation.stickiness,threat:{damage:ag?.fury??1,decay:c.fixation.decay*(ag?.waver??1)}}};
        a.addThreat(cargo.id,c.fixation.seedThreat*(ag?.fixation??1));a.aiTargetId=cargo.id;a.aggroed=true;a.aiAwakened=true;
        w.actors.push(a);w.flashes.push({pos:{...a.pos},radius:42,color:c.smoke,life:.5,maxLife:.5});spawned++;
      }
      if(spawned>0)w.text({x:base.x,y:base.y-30},'an ambush — they want the goods!',c.smoke,13);
    }
  }
  if(dist(cargo.pos,pr.dest)<=c.arriveDist){
    w.flashes.push({pos:{...cargo.pos},radius:110,color:c.accent,life:.7,maxLife:.7});cargo.dead=true;pr.cartId=null;
    if(w.objectiveDone)return;w.objectiveDone=true;
    if(w.completedObjectives.has(w.zone.id)){w.text({x:w.player.pos.x,y:w.player.pos.y-50},'already cleared','#9a9a9a',16);return;}
    w.completedObjectives.add(w.zone.id);w.grantXp(objectiveRewardXp(w.zone.level));
    w.text({x:w.player.pos.x,y:w.player.pos.y-50},'native completion','#ffd700',18);
  }
}
function realFinite(legacy:boolean,scenario:'rally'|'wave'|'cap'|'empty'|'arrival'|'reclear'|'dead'|'missing',seed:number){
  const w=makeSimWorld('warrior',seed),zone={...w.zone,id:'finite-stream-proof',level:11,
    objective:{kind:'procession' as const,...(scenario==='empty'?{robbers:[{id:'__unknown_procession_probe__',weight:1}]}:{})}};
  w.zone=zone;w.objectiveDone=false;w.objectiveLost=false;w.texts=[];w.flashes=[];w.notices=[];
  const cargo=w.createMassProcessionCart({owner:zone.id,zone,config,at:{x:900,y:900},seed:991});w.actors.push(cargo);w.player.pos={x:cargo.pos.x+20,y:cargo.pos.y};
  const active=scenario!=='rally';cargo.invulnerable=cargo.untargetable=!active;
  const arrival=scenario==='arrival'||scenario==='reclear',pr:NativeProcessionState={cartId:cargo.id,rolling:active,started:active,startPos:{...cargo.pos},
    dest:{x:cargo.pos.x+(arrival?50:1000),y:cargo.pos.y},destIdx:null,dwellStart:0,puffAt:scenario==='reclear'?100:3,heading:0,enteredAt:0,done:false,lost:false};
  finite(w).procession=pr;finite(w).zoneEnteredAt=0;
  if(scenario==='reclear')w.completedObjectives.add(zone.id);
  if(scenario==='dead')cargo.dead=true;
  if(scenario==='missing')w.actors=w.actors.filter(a=>a!==cargo);
  if(scenario==='cap')for(let i=0;i<9;i++){const a=withSeededRandom(seed+i,()=>w.createMonster('zombie',1,'enemy'));a.tag='procession_robber';a.pos={x:1600+i*20,y:1600};w.actors.push(a);}
  const restore=seedGlobalRandom(seed+701);
  try{
    for(const now of scenario==='rally'?[3,4,30,60]:[3,30]){w.time=now;if(legacy)archivedFinite(w,1/30);else finite(w).updateObjective(1/30);}
    const identities=new Map(w.actors.map((a,i)=>[a.id,i])),states=w.actors.filter(a=>a!==w.player).map(a=>{
      const state=captureNativeActorState(a);assert.ok(state,'native body graph '+a.defId+' in '+scenario);
      // Only actual actor reference encodings and the explicitly typed threat
      // map keys are normalized across the two freshly allocated Worlds.
      const root=state.nodes[(state.root as {ref:number}).ref],threat=root.entries.find(([k])=>k==='threat')?.[1];
      if(threat&&typeof threat==='object'&&'ref'in threat)for(const pair of state.nodes[threat.ref].entries)
        if(typeof pair[0]==='number')pair[0]=identities.get(pair[0])??pair[0];
      return JSON.parse(JSON.stringify(state,(_key,value)=>value&&typeof value==='object'&&'entity'in value?{entity:identities.get(value.entity)??value.entity}:
        value&&typeof value==='object'&&'actor'in value?{actor:identities.get(value.actor)??value.actor}:value));
    });
    const progress={...pr,cartId:pr.cartId===null?null:identities.get(pr.cartId)??'missing'};
    return{states,progress,done:w.objectiveDone,lost:w.objectiveLost,xp:w.meta.xp,level:w.player.level,points:w.meta.passivePoints,
      completed:[...w.completedObjectives],drops:JSON.parse(JSON.stringify(w.drops,(key,value)=>key==='uid'?undefined:value)),flashes:w.flashes,next:Math.random(),
      narration:legacy?[]:w.texts.filter(t=>/procession|ambush|caravan|native completion|already cleared/i.test(t.text))};
  }finally{restore();}
}
for(const scenario of ['rally','wave','cap','empty','arrival','reclear','dead','missing'] as const)
  for(const seed of [713,991])assert.deepEqual(realFinite(false,scenario,seed),realFinite(true,scenario,seed),'real finite World RNG/content parity: '+scenario);
console.log('PASS actual finite World versus archived branch: rally/wave/cap/unknown roster/arrival/re-clear/death/missing, full bodies/drop/XP and next RNG incl retired text draws; loss notice consumes none');

// Compare real Actor factories against the original finite construction loop.
// The registry selector is reused; the loop/order/config/body ownership below
// is independently transcribed, never routed through the extracted factory.
const restoreGlobal=seedGlobalRandom(510971);
try{
  const w=makeSimWorld('warrior',510971),zone={...structuredClone(ZONES.crossroads),level:11},owner='native-factory-proof';
  const native=w as unknown as {weightedPick(table:readonly PackTableEntry[],level:number):string;clampNear(p:Vec2,radius:number):Vec2};
  const request={owner,seed:713751,zone,config,at:{x:900,y:900}};
  const beforeActors=w.actors.length,beforeFlashes=w.flashes.length;
  const actualCart=w.createMassProcessionCart(request);
  const originalCart=withSeededRandom(request.seed,()=>{
    const a=w.createMonster(config.cartId,zone.level,'player'),pool=Math.round(config.lifeBase+Math.max(1,zone.level)*config.lifePerLevel);
    a.sheet.setSource('procession_cart',[{stat:'life',kind:'flat',value:Math.max(0,pool-a.maxLife())}]);a.fillResources();
    const at={x:request.at.x+rand(-26,26),y:request.at.y+44+rand(-10,10)};
    a.pos=w.clampPos(w.findFreeSpot(at,a.radius+2)??at,a.radius);a.untargetable=true;a.invulnerable=true;
    a.tag='procession_cart';a.eventKey='procession:'+owner;return a;
  });
  const state=(a:Actor)=>{const s=captureNativeActorState(a);assert.ok(s,'actual native factory is fully inspectable');return s;};
  assert.deepEqual(state(actualCart),state(originalCart),'native cart full sheet/resources/position/flags match original order');
  assert.equal(actualCart.team,'player');assert.equal(actualCart.driven,true);assert.equal(actualCart.radius,18);
  for(const seed of [1,773,19473])for(const count of [1,2,3]){
    const request={owner,sequence:0,seed,zone,config,at:{...actualCart.pos},cart:actualCart,heading:.72,count};
    const actual=w.createMassProcessionAmbush(request);
    const expected=withSeededRandom(seed,()=>{
      const out:Actor[]=[],base={x:request.at.x+Math.cos(request.heading)*config.puffLead,y:request.at.y+Math.sin(request.heading)*config.puffLead};
      for(let i=0;i<count;i++){
        const type=native.weightedPick(JSON.parse(JSON.stringify(config.robbers)) as PackTableEntry[],zone.level);if(!MONSTERS[type])continue;
        const a=w.createMonster(type,zone.level,'enemy'),at={x:base.x+rand(-config.puffJitter,config.puffJitter),y:base.y+rand(-config.puffJitter,config.puffJitter)};
        a.pos=w.clampPos(w.findFreeSpot(at,a.radius+2)??native.clampNear(actualCart.pos,150),a.radius);
        a.tag='procession_robber';a.eventKey='procession:'+owner;
        const ag=a.defId?MONSTERS[a.defId]?.aggro:undefined;
        a.aiTuning={target:{prefer:'highestThreat',relentless:true,stickiness:config.fixation.stickiness,
          threat:{damage:ag?.fury??1,decay:config.fixation.decay*(ag?.waver??1)}}};
        a.addThreat(actualCart.id,config.fixation.seedThreat*(ag?.fixation??1));a.aiTargetId=actualCart.id;a.aggroed=true;a.aiAwakened=true;
        a.fromZoneGen=true;out.push(a);
      }return out;
    });
    assert.deepEqual(actual.map(state),expected.map(state),'real species/stats/skills/positions/fixation retain native draw order');
  }
  assert.equal(w.actors.length,beforeActors,'factories stay detached before complete owner admission');
  assert.equal(w.flashes.length,beforeFlashes,'factories do not replay birth smoke during restoration');
  console.log('PASS actual detached native cart/ambush factories, full native body graphs, source level and original random ordering');
  const path=[{x:1200,y:1500},{x:1600,y:1500},{x:2000,y:1500}],roadSeed=7713;
  const road=w.createMassProcessionRoad(owner,roadSeed,path);
  const context={rng:new Rng(roadSeed),doodads:[] as Doodad[],reserved:[] as {pos:Vec2;radius:number}[],overgrowth:0};
  layTraveledWay(context,path,{overgrowth:0,reserve:true});assert.deepEqual(road,context.doodads);
  assert.ok(road.length>3&&road.every(d=>d.kind==='road'));
  const origin=address('surface','0','0',0,0,960),local=(at:ReturnType<typeof address>)=>localOffset(at,origin,960);
  const rows=road.map(({pos,...doodad})=>({at:address('surface','0','0',pos.x,pos.y,960),doodad}));
  const before=w.groundAt(road[0].pos),remove=w.installMassProcessionRoad(owner,rows,local);
  assert.equal(w.groundAt(road[0].pos)?.kind,'road','native ground sensing sees the published traveled way');
  const other=w.installMassProcessionRoad('other-owner',rows,local);remove();remove();
  assert.equal(w.groundAt(road[0].pos)?.kind,'road','exact owner removal preserves a foreign road');
  other();assert.deepEqual(w.groundAt(road[0].pos),before);
  console.log('PASS actual native kept-road emission and ground sensing, exact owner removal and idempotent disposal');
  const center={x:10000,y:10000},tree:Doodad={kind:'tree',pos:{x:10040,y:10070},radius:100},log:Doodad={kind:'hollow_log',pos:{x:10180,y:10060},radius:45,rot:Math.PI/3};
  const split:Doodad={kind:'rock',pos:{x:9900,y:9920},radius:30,hitbox:{kind:'multi',parts:[{dx:-40,dy:12,r:19},{dx:30,dy:-22,r:11}]}};
  const props:Doodad[]=[tree,log,split,{kind:'tree',pos:{x:10020,y:10030},radius:80,tier:1},{kind:'road',pos:{x:10000,y:10000},radius:80}];
  const sourceProps=structuredClone(props);w.doodads=props;w.markDoodadsChanged();const obstacles=w.massProcessionObstacles(center,500);assert.ok(obstacles);
  assert.equal(obstacles.circles.length,3,'only one real trunk and both collision lobes participate');
  assert.ok(obstacles.circles.some(c=>c.x===40&&c.y===70&&c.radius===bodyRadiusOf(tree)));
  assert.ok(bodyRadiusOf(tree)<tree.radius,'the canopy cannot become an invented road obstruction');
  assert.ok(obstacles.circles.some(c=>c.x===-140&&c.y===-68&&c.radius===19));
  assert.ok(obstacles.circles.some(c=>c.x===-70&&c.y===-102&&c.radius===11));
  assert.equal(obstacles.boxes.length,1);const shape=hitSurfaceOf(log,'move');assert.equal(shape.kind,'rect');
  if(shape.kind==='rect'){
    const angle:number=shape.rot??0,xs:readonly number[]=[-shape.hw,shape.hw],ys:readonly number[]=[-shape.hh,shape.hh];
    const box:{minX:number;minY:number;maxX:number;maxY:number;padding:number}=obstacles.boxes[0];
    for(const x of xs)for(const y of ys){
      const q:Vec2={x:180+x*Math.cos(angle)-y*Math.sin(angle),y:60+x*Math.sin(angle)+y*Math.cos(angle)};
      assert.ok(q.x>=box.minX-1e-8&&q.x<=box.maxX+1e-8&&q.y>=box.minY-1e-8&&q.y<=box.maxY+1e-8,'rotated physical corners lie inside the conservative compiler box');
    }
  }
  assert.deepEqual(props.map(({boundR:_memo,...d})=>d),sourceProps,'query does not remove, resize or move live scenery');
  w.doodads=[...props].reverse();w.markDoodadsChanged();assert.deepEqual(w.massProcessionObstacles(center,500),obstacles,'source reservation order is independent of spatial/index insertion order');
  console.log('PASS real trunk/multi-lobe/rotated native obstacle reservations; road and other-story exclusion, stable order and untouched scenery');
  validateNativeProcessionConfig(config);
  for(const bad of [{speedMul:-1},{puffEvery:[12,7]},{puffEvery:[null,12]},{puffCount:[2,2.5]},
    {lifeBase:0},{lureRadius:-1},{fixation:{stickiness:.6,decay:-.1,seedThreat:40}},{ambushFlare:{radius:42,life:0}}])
    assert.throws(()=>validateNativeProcessionConfig({...config,...bad} as unknown as typeof config),/frozen/);
  const historic={...config,speedMul:.47,puffEvery:[13,19] as const};validateNativeProcessionConfig(historic);
  console.log('PASS malformed frozen native tuning refused while valid historical source tuning remains authoritative');
}finally{restoreGlobal();}
