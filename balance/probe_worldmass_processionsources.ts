import assert from 'node:assert/strict';
import { TILESETS, type TilesetDef } from '../src/data/tilesets';
import { ZONES } from '../src/data/zones';
import { PROCESSION_CFG } from '../src/data/processions';
import { nativeMassHoldSources } from '../src/worldmass/objectives';
import { nativeMassProcessionSources, resolveMassProcessionContext } from '../src/worldmass/processionSources';
import { chooseNativeGeographicObjective, nativeGeographicSelectionReceipt, validateNativeGeographicSelection, type NativeGeographicObjectiveSource } from '../src/worldmass/geographicObjectiveChoice';
import { massAdventure } from '../src/worldmass/preset';
import { canonical, massRandom } from '../src/worldmass/random';

const spec=massAdventure(),country=spec.nativeCountry!,sources=nativeMassProcessionSources(country);
const pinned=(country.sources as {tilesets:{definition:TilesetDef}[]}).tilesets.map(t=>t.definition);
const expected=pinned.flatMap(t=>t.frontier===false||t.realm||t.boundless?[]:t.objectives.flatMap((row,i)=>row.kind==='procession'&&row.weight>0?[{id:'tilesets/'+t.id+'/objectives/'+i,source:'data/tilesets',tileset:t.id,weight:row.weight,totalWeight:t.objectives.reduce((n,o)=>n+Math.max(0,o.weight),0),objective:{kind:'procession'}}]:[])).sort((a,b)=>a.id.localeCompare(b.id));
assert.deepEqual(sources,expected);assert.ok(sources.length>0);assert.ok(sources.every(s=>s.totalWeight>s.weight));
const before=canonical(sources),first=sources[0],live=TILESETS[first.tileset!]!,old=live.objectives;
try{live.objectives=[];assert.equal(canonical(nativeMassProcessionSources(country)),before);}finally{live.objectives=old;}
assert.ok(Object.isFrozen(sources)&&Object.isFrozen(sources[0].objective));
console.log('PASS source inventory exactly follows frozen open native tile rows; live registry edits cannot rewrite an existing country');

const zone={...ZONES.crossroads,tileset:first.tileset!,objective:{kind:'procession'} as const};
const ctx=resolveMassProcessionContext(zone,first,12);
assert.equal(ctx.zone.level,12);assert.equal(ctx.config.speedMul,PROCESSION_CFG.speedMul);assert.equal(ctx.config.puffCap,PROCESSION_CFG.puffCap);
assert.deepEqual(ctx.config.robbers,PROCESSION_CFG.robbers);assert.ok(Object.isFrozen(ctx.config.road));
assert.throws(()=>resolveMassProcessionContext({...zone,aquatic:true},first,12));
assert.throws(()=>resolveMassProcessionContext({...zone,boundless:true},first,12));
assert.throws(()=>resolveMassProcessionContext(zone,{...first,source:'data/zones'},12));
assert.throws(()=>resolveMassProcessionContext(zone,first,1.5));
console.log('PASS resolved owner freezes actual native escort tuning and refuses aquatic, boundless, authored-campaign and invalid-level adapters');

const holds=nativeMassHoldSources(country),tilesets=[...new Set(holds.map(r=>r.tileset))];
let checked=0;
for(const tileset of tilesets){const rows=holds.filter(r=>r.source==='data/tilesets'&&r.tileset===tileset);if(!rows.length)continue;
 for(let i=0;i<80;i++){const owner='old-owner/'+i,rng=massRandom(961,[owner,'native-objective']);
  const oldChoice=rng.chance(rows.reduce((n,r)=>n+r.weight,0)/rows[0].totalWeight)?rng.weighted(rows):null;
  assert.equal(chooseNativeGeographicObjective(961,owner,rows)?.id??null,oldChoice?.id??null);checked++;
 }
}
assert.ok(checked>100);console.log('PASS '+checked+' historical hold-only catalogue draws retain exact old selection and unsupported native denominator');

const rows:NativeGeographicObjectiveSource[]=[...holds.filter(r=>r.source==='data/tilesets'&&r.tileset===first.tileset),...sources.filter(r=>r.tileset===first.tileset)].sort((a,b)=>a.id.localeCompare(b.id));
let caravans=0,other=0,none=0;
for(let i=0;i<3000;i++){const owner='combined/'+i,selected=chooseNativeGeographicObjective(1122,owner,rows),receipt=nativeGeographicSelectionReceipt(1122,owner,rows);
 validateNativeGeographicSelection(1122,owner,rows,receipt);assert.equal(receipt.selected,selected?.id??null);
 if(selected?.objective.kind==='procession')caravans++;else if(selected)other++;else none++;
}
assert.ok(caravans>0&&other>0&&none>0);
assert.throws(()=>chooseNativeGeographicObjective(1122,'duplicate',[...rows,rows[0]]));
assert.throws(()=>chooseNativeGeographicObjective(1122,'weights',rows.map((r,i)=>i? r:{...r,totalWeight:r.totalWeight+1})));
const receipt=nativeGeographicSelectionReceipt(1122,'proof',rows);
assert.throws(()=>validateNativeGeographicSelection(1122,'different-owner',rows,receipt));
assert.throws(()=>validateNativeGeographicSelection(1122,'proof',rows,{...receipt,selected:'invented'}));
console.log('PASS single shared selection spans caravans/holds/refusals with receipt identity and forged catalogue rejection', {caravans,other,none});
