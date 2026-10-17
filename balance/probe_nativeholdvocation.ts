import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeCampaignFixture,birthActualNativeArea} from './nativeCombatRetainedFixture';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat,writeCombatProof} from './probe_nativecombatcycle';
import {cellKind,continentSeedFrom} from '../src/world/continents';
import {clearSeaMemo,seaOfCell,type Sea} from '../src/world/seas';
import {HOLD_CLASSES} from '../src/data/harborholds';
import {holdStructureIn} from '../src/world/harborholds';
function firstSea(seed:number):Sea|null{const cont=continentSeedFrom(seed);for(let r=0;r<=12;r++)for(let y=-r;y<=r;y++)for(let x=-r;x<=r;x++){if(Math.max(Math.abs(x),Math.abs(y))!==r||cellKind(x,y,cont)!=='ocean')continue;const sea=seaOfCell(x,y,cont);if(sea.ports.length>=2)return sea;}return null;}
function course(retained:boolean){return withSeededRandom(0x40b701,()=>{
 const s=nativeCampaignFixture(0x40b701),w=s.writer;clearSeaMemo();const sea=firstSea(w.sim.biomeField.fieldSeed);assert(sea);const info=w.devEnsureSea(sea.ports[0].shore);assert(info);const anchors=info.ports.map(p=>w.zoneMap[p.id].holdAnchor).filter((id):id is string=>!!id);assert(anchors.length>0&&anchors.length<25);
 const run=(calls:string[])=>{const n=retained?birthActualNativeArea(s):null;const siteRows=()=>n?n.coordinator.published.assembly.input.sites.input.state.vocationSites:w['vocationSites'];
  const travel=(id:string)=>{if(n){const from=n.coordinator.published;n.coordinator.runFrom(from,()=>n.coordinator.loadZone(id,w.zone.id));}else w.loadZone(id,w.zone.id);};
  let selected:string|undefined;for(const id of anchors){travel(id);const def=w.zone;if(def.harborhold&&holdStructureIn(w.structures,HOLD_CLASSES[def.harborhold.cls].structure)){selected=id;break;}}
  assert(selected);const def=w.zone;assert.equal(def.harborhold?.state,'besieged');assert.equal(siteRows().some(s=>s.vocId==='harborwarden'),false);const horn=w.doodads.find(d=>d.kind==='muster_horn');assert(horn);w.player.pos={...horn.pos};
  const tick=()=>{if(n)n.coordinator.published.combat.campaignFrame.tick(.25);else w.update(.25);};
  if(n)n.coordinator.published.combat.campaignFrame.applyAction(w.localSeat,{t:'holdMuster'});else w.applyAction(w.localSeat,{t:'holdMuster'});
  assert(n?n.coordinator.published.combat.holdDefense:w['holdDefense'],'actual accepted muster');
  let kills=0,steps=0;for(;steps<1600&&def.harborhold!.state==='besieged';steps++){
   for(const a of [...w.actors])if(!a.dead&&a.tag==='hold_siege'){if(n)n.coordinator.published.combat.kill(a,true,w.player);else w['kill'](a,true,w.player);kills++;}
   tick();
  }
  const sites=siteRows().filter(s=>s.vocId==='harborwarden');assert.equal(def.harborhold?.state,'open');assert.equal(sites.length,1);const npc=sites[0].npc;assert(w.actors.includes(npc));tick();assert.equal(siteRows().filter(s=>s.vocId==='harborwarden').length,1);if(n)n.authority.assertFinalPhysical(n.coordinator.published.binding,[npc]);
  return{retained,anchor:selected,kills,steps,state:def.harborhold?.state,sites:sites.length,alive:!npc.dead,worldDrivers:calls};};return retained?refuseWorldCombat([w],run):run([]);
});}
const original=course(false),retained=course(true),report={scope:'Actual generated besieged hold, genuine nearby muster action, real siege updates and credited kills, live victory and Mooring Stone birth. Kill shortcut replaces combat damage only; no injected hold/wave/site or winner flag.',original,retained};assert.equal(original.anchor,retained.anchor);assert.deepEqual(retained.worldDrivers,[]);writeCombatProof('native-hold-vocation.json',{...report,receipt:createHash('sha256').update(JSON.stringify(report)).digest('hex')});console.log(JSON.stringify(report));
