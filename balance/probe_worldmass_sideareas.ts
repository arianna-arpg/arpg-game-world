import assert from 'node:assert/strict';
import { makeSimWorld, classById } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { townStationFeatures } from '../src/data/townBuild';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { MASS_ZONE } from '../src/worldmass/preset';
import { canonical } from '../src/worldmass/random';
import { savedMassSideareas } from '../src/worldmass/sideareas';
import { World, type ZoneExit } from '../src/engine/world';

type Mouth = { pos: {x:number;y:number}; kind:string; seed:number; mouthTier?:number };
type InteriorAccess = { caveStack:unknown[]; caveEntrances:Mouth[]; enterSidezone(cm:Mouth):void; travelThrough(e:ZoneExit):void };
const access = (w:World) => w as unknown as InteriorAccess;
const undo = seedGlobalRandom(93287);
const fresh = (seed:number) => { const w=makeSimWorld('warrior',seed); for(const f of townStationFeatures())w.account.features.add(f); w.startWorldMass(seed); return w; };
try {
 const w=fresh(42), hero=w.player, mass=w.massRuntime!;
 const mouth=access(w).caveEntrances.find(m=>m.kind==='cellar_hatch'); assert.ok(mouth,'real native settlement hatch');
 w.landPartyAt(mouth.pos); mass.update(w,true);
 const before=mass.snapshot(w), claims=canonical(before.state), country=w.zone.id;
 const beforePos={...mouth.pos};
 access(w).enterSidezone(mouth);
 assert.equal(w.player,hero,'native scene crossing retains the hero');
 assert.notEqual(w.zone.id,country); assert.ok(w.inCave); assert.equal(w.massRuntime,null);
 assert.ok(w.zone.id.startsWith('cave_mass_')); assert.equal(w.caveReturn!.zoneId,MASS_ZONE);
 assert.equal(w.graphWorkAvailable(),false,'an interior cannot re-enable disconnected graph work');
 const cave=w.zone.id, enemies=w.actors.filter(a=>a.team==='enemy'&&a.fromZoneGen&&!a.dead);
 if(enemies[0])enemies[0].life=Math.max(1,enemies[0].life*.6);
 const hurt=enemies[0]&&{id:enemies[0].defId,life:enemies[0].life,pos:{...enemies[0].pos}};
 w.player.life=Math.max(1,w.player.maxLife()*.63);
 const fauna=canonical(World.wildlifeTableFor(w.zone));
 const authored=canonical(w.zone.fauna??null);
 const save=serializeCharacter(w); assert.ok(save.world!.massSideareas?.active);
 const pinned=save.world!.massSideareas!.caves.find(z=>z.id===cave)!;
 assert.equal(canonical(pinned.fauna??null),authored,'saving ambient provenance cannot grant authored-fauna privileges');
 assert.equal(canonical(World.wildlifeTableFor(JSON.parse(JSON.stringify(pinned)))),fauna,'native cave fauna survives loss of packs reference identity');
 assert.equal(save.world!.worldmass!.player.x,before.player.x,'interior coords do not overwrite surface');
 assert.equal(save.world!.worldmass!.player.y,before.player.y);
 assert.equal(canonical(save.world!.worldmass!.state),claims);
 const n=fresh(51); assert.ok(n.adoptWorldState(save.world)); n.startWorldMass(42,save.world!.worldmass);
 assert.ok(n.restoreMassSideareas(save.world!.massSideareas));
 assert.equal(canonical(World.wildlifeTableFor(n.zone)),fauna,'Continue preserves the exact ambient fauna source');
 assert.equal(n.zone.id,cave); assert.equal(n.massRuntime,null); assert.ok(n.inCave);
 assert.equal(n.player.pos.x,w.player.pos.x); assert.equal(n.player.pos.y,w.player.pos.y);
 assert.ok(Math.abs(n.player.life/n.player.maxLife()-.63)<.000001);
 if(hurt)assert.ok(n.actors.some(a=>a.defId===hurt.id&&a.pos.x===hurt.pos.x&&a.pos.y===hurt.pos.y&&a.life===hurt.life),'native cave survivor memory');
 const exit=n.exits.find(e=>e.to===MASS_ZONE);assert.ok(exit);
 access(n).travelThrough(exit);
 assert.equal(n.zone.id,MASS_ZONE);assert.ok(n.massRuntime);assert.equal(n.inCave,false);
 assert.ok(Math.hypot(n.player.pos.x-beforePos.x,n.player.pos.y-beforePos.y)<90,'returns to exact physical hatch');
 assert.equal(canonical((n as World).massRuntime!.state.snapshot()),claims,'surface consequences survive roundtrip');
 const again=access(n).caveEntrances.find(m=>m.kind==='cellar_hatch');assert.ok(again);access(n).enterSidezone(again);
 assert.equal(n.zone.id,cave,'same physical mouth retains native pocket identity');
 if(hurt)assert.ok(n.actors.some(a=>a.defId===hurt.id&&a.life===hurt.life),'re-entry never rerolls surviving enemies');
 n.loadZone('lastlight'); assert.ok(n.massRuntime);assert.equal(n.inCave,false,'native wake restores country');
 const corrupt=JSON.parse(JSON.stringify(save.world!.massSideareas));corrupt.active.rungs[0].zoneId='foreign';
 assert.equal(savedMassSideareas(corrupt,save.world!.worldmass!),null);
 const wrongRun=JSON.parse(JSON.stringify(save.world!.massSideareas));wrongRun.run='foreign';
 assert.equal(savedMassSideareas(wrongRun,save.world!.worldmass!),null);
 console.log('PASS real native cellar descent, same hero, surface ownership, wounded cave Continue, exact return, re-entry, wake and malformed-chain refusal');
} finally { undo(); }

// Native package-owned second rung: a real furnished mouth, never a fabricated ladder.
const nestedUndo=seedGlobalRandom(94242);
try {
const create=(seed:number)=>{const base=makeSimWorld('warrior',seed);base.account.packageUnlocks.add('pit');for(const f of townStationFeatures())base.account.features.add(f);
 const manifest={...base.sim.manifest,packages:[...base.sim.manifest.packages.filter(p=>p.id!=='pit'),{id:'pit',enabled:true,weight:0,startLevel:0}]};
 const w=new World(base.account,manifest);w.createPlayer(classById('warrior'),{startingCompanions:false});w.startWorldMass(seed);return w;};
const w=create(42),hero=w.player,m=w.massRuntime!,hatch=access(w).caveEntrances.find(e=>e.kind==='cellar_hatch');assert.ok(hatch);
w.landPartyAt(hatch.pos);m.update(w,true);const surface=m.snapshot(w);access(w).enterSidezone(hatch);const cellar=w.zone.id;
const pit=access(w).caveEntrances.find(e=>e.kind==='pit_entrance');assert.ok(pit,'native purchased package must actually furnish a deeper mouth');
w.landPartyAt(pit.pos);access(w).enterSidezone(pit);assert.equal(w.player,hero);assert.equal(w.zone.name,'The Pit');assert.equal(w.caveReturn!.zoneId,cellar);assert.equal(access(w).caveStack.length,1);
const save=serializeCharacter(w);assert.equal(save.world!.massSideareas!.active!.rungs.length,2);assert.equal(canonical(save.world!.worldmass!.state),canonical(surface.state));assert.ok(savedMassSideareas(save.world!.massSideareas,surface));
const n=create(51);assert.ok(applySavedCharacter(n,save));assert.ok(n.adoptWorldState(save.world));n.startWorldMass(42,save.world!.worldmass);assert.ok(n.restoreMassSideareas(save.world!.massSideareas));assert.equal(n.zone.name,'The Pit');assert.equal(n.massRuntime,null);assert.equal(access(n).caveStack.length,1);
access(n).travelThrough(n.exits.find(e=>e.to===cellar)!);assert.equal(n.zone.id,cellar);assert.equal(n.massRuntime,null);assert.equal(access(n).caveStack.length,0);assert.equal(n.caveReturn!.zoneId,MASS_ZONE);assert.ok(Math.hypot(n.player.pos.x-pit.pos.x,n.player.pos.y-pit.pos.y)<90);
access(n).travelThrough(n.exits.find(e=>e.to===MASS_ZONE)!);assert.ok(n.massRuntime);assert.equal(n.zone.id,MASS_ZONE);assert.equal(canonical((n as World).massRuntime!.state.snapshot()),canonical(surface.state));assert.ok(Math.hypot(n.player.pos.x-hatch.pos.x,n.player.pos.y-hatch.pos.y)<90);
console.log('PASS real purchased cellar-to-Pit native nested ladder, saved deep Continue, one-rung climb and exact held surface return');} finally { nestedUndo(); }
