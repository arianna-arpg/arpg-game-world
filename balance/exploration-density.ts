/** Quantitative ambient reference for seamless integration. This invokes the
 * actual native population owner, not a second formula for native body counts.
 * Open reference geometry excludes additional native event/site populations.
 * Run: npx tsx balance/exploration-density.ts */
import {makeSimWorld} from '../src/sim/arena';
import {seedGlobalRandom} from '../src/sim/rng';
import {TILESETS} from '../src/data/tilesets';
import {unionArea} from '../src/world/shape';
import {massAdventure} from '../src/worldmass/preset';

const undo=seedGlobalRandom(86422),w=makeSimWorld('warrior',86422);
w.walk=null;w.doodads=[];w.arena={w:1900,h:1300,shape:'rect'};w.player.pos={x:30,y:30};
try {
 for(const biome of ['downs','forest','marsh','desert','tundra']) {
  const levels=[];
  for(const level of [1,12,24]) {
   const counts:number[]=[];
   for(let seed=1;seed<=24;seed++) {
    const restore=seedGlobalRandom(seed*771+level);
    try {
     w.actors=[w.player];
     w.zone={...w.zone,id:'native-density/'+biome,level,biome,packs:TILESETS[biome].packs,
      theme:TILESETS[biome].theme,objective:{kind:'clear'}};
     Reflect.get(w,'spawnPacks').call(w,w.zone);
     counts.push(w.actors.filter(a=>a.team==='enemy').length);
    } finally {restore();}
   }
   const mean=counts.reduce((a,b)=>a+b,0)/counts.length;
   levels.push({level,min:Math.min(...counts),max:Math.max(...counts),mean,perMillion:mean/unionArea(w.arena)*1e6});
  }
  console.log(JSON.stringify({method:'native ambient reference',biome,seeds:24,area:unionArea(w.arena),levels}));
 }
 const c=massAdventure();
 for(const recipe of c.terrain.places.filter(p=>p.landformHabitat)) {
  const content=c.content.find(row=>row.id===recipe.content)!;
  console.log(JSON.stringify({method:'ordinary seamless recipe before exclusions, formation replacements and additional sites',
   recipe:recipe.id,period:recipe.period,chance:recipe.chance,count:content.count,
   perMillion:content.count*recipe.chance/recipe.period**2*1e6}));
 }
} finally {undo();}
