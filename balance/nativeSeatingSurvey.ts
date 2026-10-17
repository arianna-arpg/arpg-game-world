import {makeSimWorld} from '../src/sim/arena';
import {massAdventure} from '../src/worldmass/preset';
import {MassGenerator,makeMassRun} from '../src/worldmass/generator';
import {canonical,massDigest} from '../src/worldmass/random';
import type {MassSpec} from '../src/worldmass/contracts';
void makeSimWorld;
export function nativeSeatingSurvey(spec:MassSpec,seed:number,half=8){
 const gen=new MassGenerator(makeMassRun(seed,'nativeRegional-runtime',spec),spec),layer=gen.nativeRegional!;
 const accepted:{x:number;y:number;program:string;variant:string;width:number;recipe:string;hash:string}[]=[];
 const byRecipe:Record<string,number>={},byProgram:Record<string,number>={},byWidth:Record<string,number>={};
 const start=performance.now();
 for(let y=-half;y<half;y++)for(let x=-half;x<half;x++){
  const p=layer.candidate('surface',BigInt(x),BigInt(y));if(!p)continue;
  const s=p.source;accepted.push({x,y,program:s.program,variant:s.variant,width:s.geometry.width,recipe:p.recipe,hash:massDigest(p)});
  for(const [map,key] of [[byRecipe,p.recipe],[byProgram,s.program],[byWidth,String(s.geometry.width)]] as const)map[key]=(map[key]??0)+1;
 }
 return {seed,candidates:half*half*4,counters:{...layer.counters},reads:layer.counters.reads,elapsedMs:Math.round(performance.now()-start),byRecipe,byProgram,byWidth,accepted};
}
export function compareNativeSeating(seeds=[42,713,2026],half=8){
 const modern=massAdventure().terrain,historical=JSON.parse(canonical(modern)) as MassSpec;delete historical.nativeRegional!.seating;
 return seeds.map(seed=>({historical:nativeSeatingSurvey(historical,seed,half),sourceFit:nativeSeatingSurvey(modern,seed,half)}));
}
