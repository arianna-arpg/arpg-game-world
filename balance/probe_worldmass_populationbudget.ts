import assert from 'node:assert/strict';
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {massAdventure} from '../src/worldmass/preset';
import {WorldMassRuntime} from '../src/worldmass/runtime';
import {canonical} from '../src/worldmass/random';
import type {MassFocus} from '../src/worldmass/foci';
const undo=seedGlobalRandom(70491),rows:unknown[]=[];
try{for(const reservation of [false,true]){
 const cfg=structuredClone(massAdventure());delete cfg.settlement;delete cfg.journey;delete cfg.ecology;delete cfg.progression;delete cfg.nativeCountry;delete cfg.geography;delete cfg.wildernessPaths;delete cfg.terrain.patches;delete cfg.terrain.landforms;delete cfg.terrain.regionalDiscoveries;delete cfg.terrain.nativeRegional;
 cfg.terrain.fields=[];cfg.terrain.surfaces=[{id:'land',priority:0,when:[],region:'ground',color:'#445522',biome:'downs'}];cfg.terrain.places=[{id:'focus',version:1,content:'focus',period:1800,radius:250,jitter:0,chance:1,when:[],priority:1}];cfg.content=[{id:'focus',source:'critic/foci',count:2,level:1,table:[{id:'skeleton_warrior',weight:1}],site:{name:'Focus clearing',source:'critic/foci',doodads:[],fixtures:[]}}];cfg.startRadius=0;cfg.populationRadius=600;cfg.maxPopulation=6;cfg.pageRadius=1;
 if(reservation){const {zone,source,apron,blend}=massAdventure().settlement!;cfg.settlement={zone,source,apron,blend};cfg.journey={source:'critic/reservations',width:90,color:'#665544',clearingColor:'#665544',reservePopulation:true,nearbyReservations:true,destinations:[{id:'opening',content:'focus',edge:'east',distance:1800,radius:250,jitter:0}]};}
 const w=makeSimWorld('warrior',15),m=new WorldMassRuntime(19,'critic:budget:'+reservation,cfg),a:MassFocus={id:'a',pos:reservation?{x:9900,y:9900}:{x:900,y:900},tier:0},b:MassFocus={id:'b',pos:reservation?{x:15300,y:9900}:{x:6300,y:900},tier:0};
 try{m.attach(w);w.player.pos={...a.pos};m.update(w,true,[a,b]);assert.equal(m.massFoci.groups.length,2);assert.equal(m.population,4);const bodies=[...w.actors],snapshot=canonical(m.snapshot(w)),land=canonical(m.generator.run),config=canonical(m.config);
 const places=[a,b].map(f=>m.placesInCell(m.walk.at(f.pos.x,f.pos.y)).find(p=>p.content==='focus')!);assert(places.every(Boolean));const owners=['',...places.map(p=>p.id)],points=[undefined,a.pos,b.pos];
 const reserved=Reflect.get(m,'reservedPopulation') as (owner:string,at?:{x:number;y:number})=>number;
 const original=owners.flatMap(owner=>points.map(at=>({owner,at,limit:m.populationLimit(owner,at),reserve:Reflect.apply(reserved,m,[owner,at])})));
 m.setPopulationBudget({total:8,floor:1});assert.deepEqual(m.populationStats().groups.map(g=>({members:g.members,live:g.live,limit:g.limit})),[{members:['a'],live:2,limit:4},{members:['b'],live:2,limit:4}]);
 const slots=m.massPopulationSlots(),unlocated=m.population-slots.reduce((n,s)=>n+s.count,0);for(const prior of original){assert.equal(Reflect.apply(reserved,m,[prior.owner,prior.at]),prior.reserve,'reservations unchanged');let expected:number;if(!prior.at)expected=8-prior.reserve;else{const near=(p:{x:number;y:number})=>Math.hypot(p.x-a.pos.x,p.y-a.pos.y)<=Math.hypot(p.x-b.pos.x,p.y-b.pos.y)?0:1;const local=slots.filter(s=>near(s.pos)===near(prior.at!)).reduce((n,s)=>n+s.count,0);expected=Math.min(8,m.population+4-local-unlocated-prior.reserve);}assert.equal(m.populationLimit(prior.owner,prior.at),expected,'independent public allowance '+JSON.stringify(prior));assert.equal(m.availablePopulation(prior.owner,prior.at),Math.max(0,expected-m.population));}
 assert.equal(canonical(m.snapshot(w)),snapshot);assert.equal(canonical(m.generator.run),land);assert.equal(canonical(m.config),config);assert.deepEqual(w.actors,bodies);
 m.setPopulationBudget({total:0,floor:0});for(const at of points)assert.equal(m.availablePopulation('',at),0);assert.deepEqual(w.actors,bodies);m.setPopulationBudget(null);for(const prior of original)assert.equal(m.populationLimit(prior.owner,prior.at),prior.limit);assert.equal(canonical(m.snapshot(w)),snapshot);
 rows.push({reservation,groups:2,live:4,observations:original.length,localAllowanceObserved:true,reservationsUnchanged:true,nullExact:true,saveLandExact:true});
 }finally{m.dispose();}
}}finally{undo();}
console.log(JSON.stringify({scope:'Independent actual population cohorts, both allowance branches with global cap nonbinding, original reservations and exact null/save/land behavior.',rows}));
