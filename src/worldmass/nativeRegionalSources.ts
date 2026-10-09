import '../data/locales';
import '../data/adventureLocales';
import { ADVENTURE_LOCALE_IDS } from '../data/adventureLocales';
import { compileLocale, localeProgram, localeSeed, type LocalePlan } from '../world/locales';
import { generateLocale, type LocaleBuildContext, type LocaleReport } from '../engine/localeGen';
import { doodadRuleOf } from '../engine/levelgen';
import { nativeRegionalCapture, nativeRegionalRoutes, type NativeRegionalGeometry } from './nativeRegionalGeometry';
import { freezeData, massDigest } from './random';
import type { MassContent } from './preset';
import type { NativeRegionalPolicy, NativeRegionalSource } from './nativeRegional';

export const NATIVE_REGIONAL_SCALES = [3600, 4800] as const;
/** Scale is an input shared by every locale; corridor widths remain native.
 * Exact resolved choices, complete material cells and scenery are saved. */
export function captureNativeRegional(program:string,variant:string,width:number,seed:number):NativeRegionalSource {
  const def=localeProgram(program);
  if(!def||!Number.isSafeInteger(width)||width<2160||width>6000||width%30)throw Error('Invalid nativeRegional capture input');
  const plan:LocalePlan=compileLocale(def,seed,variant),height=Math.round(width*def.size.h/def.size.w/30)*30;
  plan.size={w:width,h:height};
  const ports=[{x:15,y:Math.floor(height/60)*30+15},{x:width-15,y:Math.floor(height/60)*30+15},
    {x:Math.floor(width/60)*30+15,y:15},{x:Math.floor(width/60)*30+15,y:height-15}];
  const ctx:LocaleBuildContext={arena:{w:width,h:height},entry:ports[0],exits:ports.slice(1),pois:[],doodads:[],caveSeeds:[]};
  generateLocale(ctx,plan);
  const geometry:NativeRegionalGeometry=nativeRegionalCapture(width,height,(x,y)=>ctx.walk!.regionAt!(x,y));
  const unsupported:string[]=[];
  if(ctx.caveSeeds.length)unsupported.push('native cave mouth and whole-sidearea owner');
  if(plan.underTier)unsupported.push('native covered tier owner');
  for(const d of ctx.doodads) {
    const rule=doodadRuleOf(d.kind);
    if(d.kind==='cave_entrance')continue;
    if(rule.brittle||rule.effect||d.effect||d.contactSource||d.door||d.well||d.hitbox||d.anchor)
      unsupported.push('native scenery gameplay owner: '+d.kind);
  }
  const report=ctx.localeReport as LocaleReport;
  const terminals=[...ports,...report.districts.map(d=>({x:Math.floor(d.center.x/30)*30+15,y:Math.floor(d.center.y/30)*30+15}))];
  if(!nativeRegionalRoutes(geometry,terminals,ctx.doodads))unsupported.push('complete player-width native route proof');
  const id=program+'/'+variant+'/'+width,body={id,program,variant,seed,plan,geometry,report,ports,terminals,
    doodads:ctx.doodads,sceneryRules:[...new Set(ctx.doodads.map(d=>d.kind))].map(kind=>({kind,rule:JSON.parse(JSON.stringify(doodadRuleOf(kind)))})),caveSeeds:ctx.caveSeeds,unsupported:[...new Set(unsupported)]};
  return freezeData({...body,hash:massDigest(body)});
}
const woodland=new Set(['sacred_groves','orchard_homesteads','braided_woodland','pond_gardens','rootbound_clearings']);
const highland=new Set(['upland_pass','abandoned_quarries','terraced_ridge','ravine_trails','scree_hollows']);
const waterside=new Set(['waterside_ward','canal_wards','reed_islands','millpond_paths']);
let cached:{policy:NativeRegionalPolicy;content:MassContent[]}|undefined;
let cachedLevels='';
/** Full audit, finite shipped captures. Unsupported output is never silently
 * stripped or replaced. The whole variant is absent from live admission. */
export function nativeRegionalSources(minLevel=1,maxLevel=24):{policy:NativeRegionalPolicy;content:MassContent[]} {
  if(!Number.isSafeInteger(minLevel)||!Number.isSafeInteger(maxLevel)||minLevel<1||maxLevel>100||minLevel>maxLevel)throw Error('Invalid nativeRegional level envelope');
  const levelsKey=minLevel+':'+maxLevel;if(cached&&cachedLevels===levelsKey)return cached;
  const sources:NativeRegionalSource[]=[],coverage:NativeRegionalPolicy['coverage'][number][]=[];
  for(const program of ADVENTURE_LOCALE_IDS) {
    const def=localeProgram(program)!;
    for(const [i,v] of def.variants.entries()) {
      const width=NATIVE_REGIONAL_SCALES[i%NATIVE_REGIONAL_SCALES.length];
      const source=captureNativeRegional(program,v.id,width,localeSeed('nativeRegional/v1/'+program+'/'+v.id));
      coverage.push({program,variant:v.id,width,sourceHash:source.hash,unsupported:source.unsupported});
      if(!source.unsupported.length)sources.push(source);
    }
  }
  const ids=(programs:Set<string>,invert=false)=>sources.filter(s=>programs.has(s.program)!==invert).map(s=>s.id);
  const urban=new Set(ADVENTURE_LOCALE_IDS.filter(id=>!woodland.has(id)&&!highland.has(id)&&!waterside.has(id)));
  const policy:NativeRegionalPolicy={source:'worldmass/nativeRegional-locales-v1',version:1,spacing:9600,chance:.48,jitter:.3,
    clearance:120,seats:16,sources,coverage,recipes:[
      {id:'nativeRegional-highland',biomes:['highland','mountain','tundra'],sources:ids(highland)},
      {id:'nativeRegional-woodland',biomes:['forest'],sources:ids(woodland)},
      {id:'nativeRegional-waterlands',biomes:['marsh'],sources:ids(waterside)},
      {id:'nativeRegional-country',biomes:['downs','desert'],sources:ids(urban)},
    ]};
  const content:MassContent[]=sources.map(s=>{
    const center={x:s.geometry.width/2,y:s.geometry.height/2};
    return {id:'nativeRegional/'+s.id,source:'main/adventureLocales/'+s.program,level:minLevel,count:0,table:[{id:'plains_wolf',weight:1}],
      levels:Array.from({length:maxLevel-minLevel+1},(_,i)=>({level:minLevel+i,table:[{id:'plains_wolf',weight:1}]})),
      site:{name:localeProgram(s.program)!.label,source:'nativeRegional/'+s.hash,fixtures:[],
        doodads:s.doodads.map(d=>({...structuredClone(d),pos:{x:d.pos.x-center.x,y:d.pos.y-center.y}}))}};
  });
  cachedLevels=levelsKey;
  return cached=freezeData({policy,content});
}
