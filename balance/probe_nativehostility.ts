import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {bootSimEngine,makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import type {Actor} from '../src/engine/actor';
import {World} from '../src/engine/world';
import {captureNativeActorState,massDormancyPins} from '../src/worldmass/dormancy';
import {throngTravelProtected} from '../src/engine/throngEvolution';
import {clingBurrowed} from '../src/engine/cling';
import {normalizeBrain} from '../src/engine/brain';
import {STATUS_DEFS} from '../src/engine/status';
import {factionStance,setRunStances} from '../src/data/monsters';
import {dist} from '../src/core/math';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import * as core from '../src/engine/nativeHostility';
// Complete original source pinned inline: no Git or ignored-file dependency.
const archive = {
  "revision": "8dcfa9e1accb1d9fa90dc9e65416513e354befbe",
  "worldSHA256": "67d4fa4c23011c6ce4d684f3b218c17712f6fd3aaa8227c7c98b6b09f8b1bdfc",
  "methods": {
    "hostileTo": "hostileTo(a: Actor, b: Actor): boolean {\n    if (this.sanctuaryBlocksCombat(a,b)) return false;\n    if (throngTravelProtected(b)) return false;\n    // THE TIER LAW (engine/tiers.ts): layers share a screen, never a fight —\n    // a deck body and a valley body cannot target, strike, or threaten each\n    // other. Sitting in the ONE hostility gate, targeting, swings, threat\n    // and projectiles all agree for free. (Shoving a body OFF its layer is\n    // the honest way to bring a fight down — the rim fall in the push lane.)\n    // EXCEPT under RIM DUELS (ZoneTiers.rimDuels, open exposure): cross-tier\n    // hostility stands and SIGHT mediates — the butte walls' blocksSight\n    // already confine the fights to rims and spans, which is the fantasy.\n    if ((a.tier ?? 0) !== (b.tier ?? 0) && !this.zone.tiers?.rimDuels) return false;\n    // THE GUISE (the possession seam, engine/possess.ts): a seat wearing a\n    // body of faction F reads as KIN to team-enemy bodies of F while the\n    // guise holds — ONE-directional in the one hostility gate (their\n    // targeting, swings, threat and stray zones all pass the rider by; the\n    // rider's own targeting asks the other direction and stays live). The\n    // first harm the rider authors tears it for good (resolveHit).\n    if (b.possession?.guiseFaction && !b.possession.guiseBroken\n      && a.team === 'enemy' && a.faction === b.possession.guiseFaction) return false;\n    // THE BURROW (the latch fabric, engine/cling.ts): a rider sunk INSIDE\n    // the body it rides cannot be found BY that body — sitting in the one\n    // hostility gate, the host's targeting, swings, novas and stray zones\n    // all pass its own parasite by for free. ONE-directional like the\n    // guise: the rider's teeth ask the other direction and stay live, and\n    // every OTHER combatant still scrapes riders off normally. The host's\n    // honest answer is its shake clock — the pop-out (clingRelease\n    // 'shake') scatters the rider into a real vulnerability window.\n    if (b.clingTo?.id === a.id && clingBurrowed(b)) return false;\n    if (a.team !== b.team) return true;\n    // PREDATION (TargetSpec.prey): a hunter is hostile to its FOOD no matter\n    // whose side the food nominally stands on — and it's ONE-directional:\n    // the hare never wars back, it runs (MoraleSpec.skittish). Because this\n    // sits in the one hostility gate, targeting, swings, and projectiles all\n    // agree the wolf may eat.\n    if (this.isPrey(a, b)) return true;\n    // Faction grudges are LIVE wherever rivals share ground: a gnoll pack\n    // that stumbles into the risen dead doesn't wait for a war banner.\n    return !!(a.team === 'enemy'\n      && a.faction && b.faction\n      && factionStance(a.faction, b.faction) === 'hostile');\n  }",
    "isPrey": "private isPrey(a: Actor, b: Actor): boolean {\n    if (!a.brain || a === b || b.dead) return false;\n    const prey = a.aiPrey ?? normalizeBrain(a.brain).base.target?.prey;\n    if (!prey || !prey.length) return false;\n    if (b.defId === a.defId) return false;\n    if (a.squadId !== undefined && b.squadId === a.squadId) return false;\n    // THE SCENT LAW (StatusDef.smellsOfPrey — Scentcraft's mark): a body\n    // wearing prey-scent is FOOD to anything that already hunts. The list's\n    // CONTENTS stop mattering; its existence is the qualifier (a hunter's\n    // nose, fooled). The kin guards above still hold — nothing eats its\n    // own kind or its own squad, however it smells.\n    if (b.statuses.some(s => STATUS_DEFS[s.id]?.smellsOfPrey)) return true;\n    return prey.some(p => b.tag === p || b.faction === p || b.defId === p);\n  }",
    "seekPrey": "seekPrey(actor: Actor, range: number): Actor | null {\n    // SOVEREIGNTY: scent — hunger walks the crossing (the goal carries its story) (the derived census, probe_tiers RIG T).\n    let best: Actor | null = null;\n    let bd = range;\n    for (const b of this.actors) {\n      if (b.dead || b.passive || b.untargetable || !this.isPrey(actor, b)) continue;\n      const d = dist(actor.pos, b.pos);\n      if (d < bd) { bd = d; best = b; }\n    }\n    return best;\n  }",
    "enemiesOf": "enemiesOf(actor: Actor): Actor[] {\n    return this.actors.filter(a =>\n      (this.hostileTo(actor, a)\n        // BREAKABLE conjured objects join their OWNER's hostile pool — the\n        // owner's every damage path (swings, zones, projectiles) can find\n        // and demolish them, though the steering PICKS refuse to CHASE\n        // furniture (assistAim + the SEEKWORTHY homing gate). Never anyone\n        // else's pool: minions and allies see furniture, the owner sees a\n        // target.\n        || (a.construct?.breakable !== undefined && a.owner === actor))\n      && !a.dead && !a.untargetable && !a.downed);\n  }"
  },
  "methodsSHA256": "87985529c1ca2a39675f13757e501f1cb750b2b5d9a6172924c056aa0d41eb65"
};
assert.equal(createHash('sha256').update(JSON.stringify(archive.methods)).digest('hex'),'87985529c1ca2a39675f13757e501f1cb750b2b5d9a6172924c056aa0d41eb65');
const js=ts.transpileModule('class Archived {\n'+Object.values(archive.methods).join('\n')+'\n}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const baseline:core.NativeHostilitySources={throngTravelProtected,clingBurrowed,normalizeBrain,STATUS_DEFS,factionStance,dist};
const names=['hostileTo','isPrey','seekPrey','enemiesOf'] as const;
const printer=ts.createPrinter({removeComments:true}),oldAST=ts.createSourceFile('old.ts','class C{'+Object.values(archive.methods).join('\n')+'}',ts.ScriptTarget.Latest,true),newAST=ts.createSourceFile('new.ts',readFileSync(new URL('../src/engine/nativeHostility.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true);
for(const name of names){const om=(oldAST.statements[0] as ts.ClassDeclaration).members.find(m=>(m.name as ts.Identifier)?.text===name) as ts.MethodDeclaration;
 const nm=newAST.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='native'+name[0].toUpperCase()+name.slice(1)) as ts.FunctionDeclaration;
 const body=printer.printNode(ts.EmitHint.Unspecified,nm.body!,newAST).replace(/\(0, sources\.([A-Za-z0-9_]+)\)/g,'$1').replace(/sources\./g,'').replace(/host\./g,'this.');const norm=ts.createSourceFile('norm.ts','class C{f()'+body+'}',ts.ScriptTarget.Latest,true);
 assert.equal(printer.printNode(ts.EmitHint.Unspecified,((norm.statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration).body!,norm),printer.printNode(ts.EmitHint.Unspecified,om.body!,oldAST),name+' exact original body');}
bootSimEngine();seedGlobalRandom(719);const world=makeSimWorld('warrior',719),p=world.player;
const bodies=[p,...['orb_weaver','formic_soldier','goblin_brute','zombie','orb_weaver','gnatling','marrowgrub'].map(id=>world.createMonster(id,12,'enemy'))];
const hunter=bodies[1],victim=bodies[3],zombie=bodies[4],kin=bodies[5],gnat=bodies[6],grub=bodies[7];
for(let i=0;i<bodies.length;i++)bodies[i].pos={x:i*50,y:0};
const inst=makeSkillInstance(SKILLS.raise_gnatveil,1,3);inst.treeNodes=['battle_hatching','rich_hatch','burst_hatch'];p.skills.push(inst);gnat.owner=p;gnat.summonInst=inst;gnat.team='player';grub.owner=p;grub.team='player';
let blocked=false,rim=false,tape:string[]=[],pairs=0,wrapperPairs=0,entries=0;const branchResults:Record<string,unknown>={};
function execute(mode:'old'|'core'|'wrapper',method:typeof names[number],a:Actor,b:Actor|number){
 tape=[];const watched:any={};for(const [key,value]of Object.entries(baseline))watched[key]=typeof value==='function'?function(this:unknown,...args:any[]){assert.equal(this,undefined,'source receiver '+key);tape.push('source:'+key+':'+args.map(x=>x&&typeof x==='object'&&'id'in x?x.id:typeof x==='string'?x:typeof x).join(','));return (value as any)(...args);}:value;
 const Old=new Function(...Object.keys(watched),'"use strict";'+js+';return Archived;')(...Object.values(watched));
 const cache=new WeakMap<object,any>();const wrap=(x:any,path:string):any=>{if(!x||typeof x!=='object'||x instanceof Map||x instanceof Set)return x;if(cache.has(x))return cache.get(x);const q=new Proxy(x,{get(t,k,r){if(typeof k==='string')tape.push(path+'.'+k);const v=Reflect.get(t,k,r); // Native brain helper memo is source-owned; preserve its exact original key.
 return k==='brain'?v:wrap(v,path+'.'+String(k));}});cache.set(x,q);return q;};
 const hs:any={get actors(){tape.push('host.actors');return wrap(bodies,'actors');},get zone(){tape.push('host.zone');return wrap({tiers:{rimDuels:rim}},'zone');},
 sanctuaryBlocksCombat(x:Actor,y:Actor){assert.equal(this,hs);tape.push('sanctuary:'+x.id+':'+y.id);return blocked;},
 isPrey(x:Actor,y:Actor){assert.equal(this,hs);tape.push('host.isPrey');return mode==='old'?Old.prototype.isPrey.call(hs,x,y):mode==='wrapper'?(World.prototype as any).isPrey.call(hs,x,y):core.nativeIsPrey(watched,x,y);},
 hostileTo(x:Actor,y:Actor){assert.equal(this,hs);tape.push('host.hostileTo');return mode==='old'?Old.prototype.hostileTo.call(hs,x,y):mode==='wrapper'?World.prototype.hostileTo.call(hs,x,y):core.nativeHostileTo(hs,watched,x,y);}};
 Object.setPrototypeOf(hs,World.prototype);const originalProvider=(World as any).nativeHostilitySources;if(mode==='wrapper')(World as any).nativeHostilitySources=()=>watched;
 const aa=wrap(a,'a'),bb=typeof b==='number'?b:wrap(b,'b');let result:any;
 const random=Math.random;Math.random=()=>{throw Error('Hostility consumed RNG');};try{result=mode==='old'?Old.prototype[method].call(hs,aa,bb):mode==='wrapper'?(World.prototype as any)[method].call(hs,aa,bb):method==='hostileTo'?core.nativeHostileTo(hs,watched,aa,bb):method==='isPrey'?core.nativeIsPrey(watched,aa,bb):method==='seekPrey'?core.nativeSeekPrey(hs,watched,aa,bb):core.nativeEnemiesOf(hs,aa);}finally{Math.random=random;(World as any).nativeHostilitySources=originalProvider;}
 const value=Array.isArray(result)?result.map(a=>a.id):result&&typeof result==='object'?result.id:result;return {value,tape:tape.slice()};
}
function pair(method:typeof names[number],a:Actor,b:Actor|number){const old=execute('old',method,a,b),now=execute('core',method,a,b);assert.deepEqual(now,old,method);assert.deepEqual(execute('wrapper',method,a,b),old,method+' World');wrapperPairs++;pairs++;entries+=old.tape.length;return now.value;}
function all(label:string){const before=bodies.map(a=>captureNativeActorState(a));for(const a of bodies){for(const b of bodies){pair('hostileTo',a,b);pair('isPrey',a,b);}pair('enemiesOf',a,0);for(const range of [0,50,100,Infinity,NaN])pair('seekPrey',a,range);}assert.deepEqual(bodies.map(a=>captureNativeActorState(a)),before,'read-only bodies '+label);}
all('native');assert.equal(pair('hostileTo',zombie,gnat),false);branchResults.travel=true;
blocked=true;assert.equal(pair('hostileTo',p,zombie),false);all('sanctuary');blocked=false;
victim.applyStatus('prey_marked',0,1,'independent');assert.equal(pair('isPrey',hunter,victim),true);assert.equal(pair('isPrey',hunter,kin),false);all('scent');branchResults.scent=true;
hunter.aiPrey=[];assert.equal(pair('isPrey',hunter,victim),false);hunter.aiPrey=undefined;
victim.tier=1;assert.equal(pair('hostileTo',p,victim),false);rim=true;assert.equal(pair('hostileTo',p,victim),true);all('rim duels');rim=false;victim.tier=0;
victim.possession={guiseFaction:zombie.faction,guiseBroken:false} as any;assert.equal(pair('hostileTo',zombie,victim),false);victim.possession!.guiseBroken=true;all('guise broken');victim.possession=undefined;
grub.clingTo={id:zombie.id,ang:0,until:99,statusAt:0,gnawAt:99};assert.ok(clingBurrowed(grub));assert.equal(pair('hostileTo',zombie,grub),false);assert.equal(pair('hostileTo',grub,zombie),true);all('burrow');grub.clingTo=undefined;
const oldFaction=[hunter.faction,victim.faction];hunter.aiPrey=[];hunter.faction='review-native-A';victim.faction='review-native-B';setRunStances('independent-hostility-review',{'review-native-A|review-native-B':'hostile'});assert.equal(pair('hostileTo',hunter,victim),true);setRunStances('independent-hostility-review',{'review-native-A|review-native-B':'ally'});assert.equal(pair('hostileTo',hunter,victim),false);setRunStances('independent-hostility-review',{});[hunter.faction,victim.faction]=oldFaction;hunter.aiPrey=undefined;branchResults.liveDiplomacy=true;
victim.construct={breakable:{ownerMult:1}} as any;victim.owner=p;victim.team=p.team;blocked=true;assert.ok(pair('enemiesOf',p,0).includes(victim.id),'construct owner path precedes final census filters');victim.dead=true;assert.ok(!pair('enemiesOf',p,0).includes(victim.id));victim.dead=false;victim.untargetable=true;assert.ok(!pair('enemiesOf',p,0).includes(victim.id));victim.untargetable=false;victim.downed=true;assert.ok(!pair('enemiesOf',p,0).includes(victim.id));victim.downed=false;all('construct/sanctuary');blocked=false;branchResults.constructOwner=true;
// Kin and nearest-prey tie laws retain original zero/strict-distance behavior.
victim.construct=undefined;victim.owner=undefined;victim.team='enemy';victim.downed=false;
hunter.aiPrey=[victim.defId!,zombie.defId!];hunter.squadId=0;victim.squadId=0;assert.equal(pair('isPrey',hunter,victim),false);hunter.squadId=undefined;victim.squadId=undefined;
victim.pos={x:hunter.pos.x+100,y:hunter.pos.y};zombie.pos={...victim.pos};assert.equal(pair('seekPrey',hunter,100),null);assert.equal(pair('seekPrey',hunter,101),victim.id);
victim.passive=true;assert.equal(pair('seekPrey',hunter,101),zombie.id);victim.passive=false;victim.untargetable=true;assert.equal(pair('seekPrey',hunter,101),zombie.id);victim.untargetable=false;hunter.aiPrey=undefined;branchResults.squadZeroAndStrictTie=true;
// Early gates must not touch later throwing providers or foreign campaign state.
const refuse=()=>{throw Error('unexpected late source');};let early=0;
const s={...baseline,throngTravelProtected:refuse,clingBurrowed:refuse,normalizeBrain:refuse,factionStance:refuse};assert.equal(core.nativeHostileTo({sanctuaryBlocksCombat:()=>true,get zone():never{throw Error('foreign zone');},isPrey:refuse},s,p,zombie),false);early++;
const sourceNoPrey={...baseline,normalizeBrain:refuse};const savedBrain=hunter.brain;hunter.brain=undefined;assert.equal(core.nativeIsPrey(sourceNoPrey,hunter,victim),false);hunter.brain=savedBrain;early++;
// Provider-owned A/B/A diplomacy remains isolated without changing the classic source graph.
hunter.aiPrey=[];hunter.faction='A';victim.faction='B';victim.team=hunter.team;
function local(stance:'hostile'|'ally'){const sources={...baseline,factionStance:()=>stance};const host:any={actors:[hunter,victim],zone:{},sanctuaryBlocksCombat:()=>false,isPrey:(a:Actor,b:Actor)=>core.nativeIsPrey(sources,a,b),hostileTo:(a:Actor,b:Actor)=>core.nativeHostileTo(host,sources,a,b)};return core.nativeEnemiesOf(host,hunter).map(a=>a.id);}
const A=local('hostile');assert.notDeepEqual(local('ally'),A);assert.deepEqual(local('hostile'),A);
// Adapter identity is cached while every area/method/source read stays live.
const cached=(world as any).nativeHostilityHost();assert.equal((world as any).nativeHostilityHost(),cached);
assert.equal((World as any).nativeHostilitySources(),(World as any).nativeHostilitySources());
const savedZone=world.zone,savedActors=world.actors,savedEnemies=world.enemiesOf;
try{world.zone={...savedZone};world.actors=[hunter];world.enemiesOf=()=>[victim];assert.equal(cached.zone,world.zone);assert.equal(cached.actors,world.actors);assert.deepEqual(cached.enemiesOf(hunter),[victim]);}
finally{world.zone=savedZone;world.actors=savedActors;world.enemiesOf=savedEnemies;}
// An adapter cache is not a body-owning controller. The existing reflective
// dormancy scanner must still be able to put an otherwise unreferenced body away.
const priorCache=Object.getOwnPropertyDescriptor(world,'nativeHostilityView'),priorActors=world.actors;
try{Reflect.deleteProperty(world,'nativeHostilityView');const body=world.createMonster('zombie',10,'enemy');world.actors=[world.player,body];const owned=new Map([['body',body]]);
 assert.equal(massDormancyPins(world,owned).has(body),false);(world as any).nativeHostilityHost();
 assert.equal(Object.getOwnPropertyDescriptor(world,'nativeHostilityView')?.enumerable,false);
 assert.equal(massDormancyPins(world,owned).has(body),false,'cached view cannot pin the whole native population');}
finally{world.actors=priorActors;if(priorCache)Object.defineProperty(world,'nativeHostilityView',priorCache);else Reflect.deleteProperty(world,'nativeHostilityView');}
const result={pass:true,original:archive.revision,methodsSHA256:archive.methodsSHA256,astPairs:4,actualBodies:bodies.length,pairs,wrapperPairs,orderedEntries:entries,earlyControls:early,directLexicalReceivers:true,independentABA:true,branchResults,coreSHA256:createHash('sha256').update(readFileSync(new URL('../src/engine/nativeHostility.ts',import.meta.url))).digest('hex'),limits:'Exact shared native operation only. Trusted installed source helpers retain diplomacy/brain/skill memo ownership. No full area binding, geometry, promotion or runtime admission.'};console.log(JSON.stringify(result,null,2));
