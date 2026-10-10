import type { World } from '../engine/world';
import { PUZZLE_CFG, PUZZLE_KINDS, type PuzzleSpec, type PuzzleRun, type PuzzleCheckpoint } from '../engine/puzzles';
import { PUZZLES } from '../data/puzzles';
import { LOOT_TABLES } from '../data/loottables';
import { SKILLS } from '../data/skills';
import { DAMAGE_TYPES, ELEMENTAL_TYPES } from '../engine/stats';
import type { MassPlace } from './contracts';
import { canonical, massRandom } from './random';
import { siteOffset } from './sites';
import type { MassFieldResidency } from './fields';
import type { MassAddress } from './address';

export interface MassPuzzleSpec { id: string; source: string; x: number; y: number; spec: PuzzleSpec; instruction: string }
export interface MassPuzzleSave {
  id: string; progress: PuzzleCheckpoint;
  resident?: boolean; place?: {id:string;center:MassAddress}; status?: string;
}
/** Legacy fixtures keep their finite policy; repeated owners opt into residency.
 * Adding kinds still requires the native kind's exact progress codec. */
export const MASS_PUZZLE_LIMIT = 24;
export function nativeMassPuzzle(id: string, x: number, y: number, instruction: string, count?: number): MassPuzzleSpec {
  if (!PUZZLES[id]) throw Error('Unknown native puzzle');
  const s=PUZZLES[id], k=PUZZLE_KINDS[s.kind];
  if(k.geometry==='ring' && !Number.isSafeInteger(count))throw Error('Placed rings need a fixed node count');
  const layout=k.geometry==='grid' ? {grid:s.grid??[3,3],scramble:s.scramble??[3,6]}
    : {count:[count!,count!] as [number,number],...(s.kind==='accord'?{linger:s.linger??PUZZLE_CFG.accordLinger,tones:s.tones??[...ELEMENTAL_TYPES]}:{gutter:s.gutter??PUZZLE_CFG.emberGutter})};
  const spec={...s,...layout,spacing:s.spacing??k.spacing,
    who:s.who??k.who,knock:s.knock??k.knock??PUZZLE_CFG.knock,
    spill:s.spill??k.spill??PUZZLE_CFG.spill,hum:s.hum??k.hum??PUZZLE_CFG.hum};
  return { id, source: 'puzzles/' + id, x, y, instruction, spec: JSON.parse(canonical(spec)) };
}
export function puzzleSeats(row: MassPuzzleSpec): { x: number; y: number }[] {
  const kind=PUZZLE_KINDS[row.spec.kind], pitch=row.spec.spacing??kind?.spacing;
  if(kind?.geometry==='ring'){
    const count=row.spec.count?.[0]??0;
    return Array.from({length:count},(_,i)=>({x:Math.cos(i/count*Math.PI*2)*pitch,y:Math.sin(i/count*Math.PI*2)*pitch}));
  }
  const [w,h] = row.spec.grid ?? [3,3];
  return Array.from({length:w*h},(_,i)=>({x:(i%w-(w-1)/2)*pitch,y:(Math.floor(i/w)-(h-1)/2)*pitch}));
}
export function validateMassPuzzle(row: MassPuzzleSpec, radius: number): void {
  const s=row?.spec, k=s && PUZZLE_KINDS[s.kind], text=(v:string)=>typeof v==='string'&&v.length>0&&v.length<=256;
  // Persistent placement admits only kinds with owned geometry and progress.
  // Ring counts are exact descriptor data; no admission-order reroll.
  if (!row || !text(row.id) || !text(row.source) || !text(row.instruction)
    || ![row.x,row.y].every(Number.isFinite) || !k?.checkpoint || !['lattice','ember','accord'].includes(s.kind)
    || s.format!==undefined || s.node!==undefined || s.heart!==undefined
    || s.kind==='ember'&&(s.grid!==undefined||s.scramble!==undefined
      ||!Array.isArray(s.count)||s.count.length!==2||!Number.isSafeInteger(s.count[0])
      ||s.count[0]<3||s.count[0]>8||s.count[0]!==s.count[1]
      ||s.gutter===undefined||!Number.isFinite(s.gutter)||s.gutter<.5||s.gutter>60)
    || s.kind==='accord'&&(s.grid!==undefined||s.scramble!==undefined||s.gutter!==undefined
      ||!Array.isArray(s.count)||s.count.length!==2||!Number.isSafeInteger(s.count[0])
      ||s.count[0]<4||s.count[0]>8||s.count[0]%2!==0||s.count[0]!==s.count[1]
      ||s.linger===undefined||!Number.isFinite(s.linger)||s.linger<.5||s.linger>60
      ||s.tones!==undefined&&(!Array.isArray(s.tones)||!s.tones.length||s.tones.length>8
        ||s.tones.some(t=>!DAMAGE_TYPES.includes(t))))
    || s.grid!==undefined&&(!Array.isArray(s.grid)||s.grid.length!==2||s.grid.some(v=>!Number.isSafeInteger(v)||v<2||v>4))
    || s.spacing!==undefined&&(!Number.isFinite(s.spacing)||s.spacing<55||s.spacing>(k.geometry==='ring'?160:120))
    || s.scramble!==undefined&&(!Array.isArray(s.scramble)||s.scramble.length!==2
      ||s.scramble.some(v=>!Number.isSafeInteger(v)||v<1||v>32)||s.scramble[0]>s.scramble[1])
    || s.hum!==undefined&&(!Number.isFinite(s.hum)||s.hum<0||s.hum>30)
    || s.who!==undefined&&!['player','any'].includes(s.who)
    || s.spill!==undefined&&!['aim','all'].includes(s.spill)
    || s.knock!==undefined&&!['landed','wounding'].includes(s.knock)
    || s.reward!==undefined&&(!s.reward ||
      s.reward.table!==undefined&&!Object.hasOwn(LOOT_TABLES,s.reward.table)
      || s.reward.cast!==undefined&&!Object.hasOwn(SKILLS,s.reward.cast)
      || s.reward.gems!==undefined&&(!Number.isSafeInteger(s.reward.gems)||s.reward.gems<0||s.reward.gems>100)
      || s.reward.washFor!==undefined&&(!Number.isFinite(s.reward.washFor)||s.reward.washFor<0||s.reward.washFor>3600)))
    throw Error('Unsupported worldmass puzzle');
  if (puzzleSeats(row).some(p=>Math.hypot(row.x+p.x,row.y+p.y)+40>=radius))
    throw Error('Worldmass puzzle exceeds its site');
}
const puzzleId=(p:Pick<MassPlace,'id'>,r:MassPuzzleSpec)=>canonical([p.id,'puzzle',r.id]);
type Context={ rows: readonly MassPuzzleSpec[]; center: {x:number;y:number}; level:number };
type Owner={id:string;center:MassAddress};
export class MassPuzzles {
  private live=new Map<string,{run:PuzzleRun;place:string;row:MassPuzzleSpec}>();
  private saved=new Map<string,MassPuzzleSave>();
  private owners=new Map<string,Owner>();
  private expected=new Map<string,Set<string>>();
  constructor(saved:readonly MassPuzzleSave[]=[],readonly policy?:MassFieldResidency){
    if(!Array.isArray(saved)||!policy&&saved.length>MASS_PUZZLE_LIMIT)throw Error('Invalid worldmass puzzle count');
    for(const s of saved){
      if(!s||typeof s.id!=='string'||!s.id||this.saved.has(s.id)||!s.progress
        ||s.resident!==undefined&&(!policy||typeof s.resident!=='boolean')
        ||s.place!==undefined&&(!policy||!s.place||typeof s.place.id!=='string'||!s.place.id||!s.place.center)
        ||s.status!==undefined&&(!policy||typeof s.status!=='string'||s.status.length>4096))throw Error('Invalid worldmass puzzle checkpoint');
      this.saved.set(s.id,JSON.parse(canonical(s)));
    }
  }
  /** Identity, not a matching string or painted status, proves native completion. */
  completed(run:PuzzleRun):{source:string;place:string;center:MassAddress}|null{
    const own=this.live.get(run.id),owner=this.owners.get(run.id);
    return own?.run===run && run.done && owner ? {source:run.id,place:own.place,center:{...owner.center}} : null;
  }
  owns(place:string):boolean{return [...this.live.values()].some(r=>r.place===place);}
  visible(id:string,at:{x:number;y:number}):boolean{
    const r=this.live.get(id);return !r||Math.hypot(r.run.at.x-at.x,r.run.at.y-at.y)<PUZZLE_CFG.earshot;
  }
  get population():number{return [...this.live.values()].reduce((n,r)=>n+r.run.nodes.length,0);}
  missing(place:MassPlace,rows:readonly MassPuzzleSpec[]):number{
    return rows.reduce((n,r)=>n+(this.live.has(puzzleId(place,r))?0:puzzleSeats(r).length),0);
  }
  /** Existing dormant boards wake as retained owners, like sleeping native
   * bodies. The ambient population budget only admits newly born encounters. */
  retainedSeats(place:MassPlace,rows:readonly MassPuzzleSpec[]):number{
    return rows.reduce((n,r)=>n+(!this.live.has(puzzleId(place,r))&&this.saved.has(puzzleId(place,r))?puzzleSeats(r).length:0),0);
  }
  canAdmit(place:Pick<MassPlace,'id'>,rows:readonly MassPuzzleSpec[]):boolean{
    return this.live.size+rows.filter(r=>!this.live.has(puzzleId(place,r))).length<=(this.policy?.maxResident??MASS_PUZZLE_LIMIT);
  }
  private needed(world:World,run:PuzzleRun):boolean{
    if(!this.policy)return true;
    const tier=run.nodes[0]?.tier??0;
    if((world.player.tier??0)===tier&&Math.hypot(world.player.pos.x-run.at.x,world.player.pos.y-run.at.y)<=this.policy.retainRadius)return true;
    const nodes=new Set(run.nodes);
    return world.actors.some(a=>!a.dead&&!nodes.has(a)&&(a.tier??0)===tier
      &&run.nodes.some(n=>Math.hypot(a.pos.x-n.pos.x,a.pos.y-n.pos.y)<=a.radius+n.radius+160));
  }
  private remember(world:World,id:string,r:{run:PuzzleRun;place:string;row:MassPuzzleSpec}):MassPuzzleSave{
    const owner=this.owners.get(id);
    return {id,progress:world.capturePlacedPuzzle(r.run),...(this.policy&&owner?{resident:true,
      place:{id:owner.id,center:{...owner.center}},status:r.run.done?'Riddle resolved':r.run.kind.status(r.run)+' · '+r.row.instruction}:{})};
  }
  sync(world:World):void{
    if(!this.policy)return;
    for(const [id,r] of this.live){
      if(this.needed(world,r.run))continue;
      const saved=this.remember(world,id,r);
      if(!world.releasePlacedPuzzle(r.run))continue;
      this.saved.set(id,{...saved,resident:false});this.live.delete(id);
    }
  }
  private makeRun(world:World,place:MassPlace,row:MassPuzzleSpec,ctx:Context):PuzzleRun{
    const id=puzzleId(place,row);
    const off=siteOffset(place,row.x,row.y),at={x:ctx.center.x+off.x,y:ctx.center.y+off.y};
    // Native rectangular coordinates stay screen aligned, just as native zone
    // courts. Rotate the anchor with the site, never shuffle individual seats.
    const kind=PUZZLE_KINDS[row.spec.kind],nodes=puzzleSeats(row).map((p,i)=>{
      const n=world.createMonster(kind.nodeMonster,ctx.level,'enemy');
      n.pos={x:at.x+p.x,y:at.y+p.y};n.puzzleNode={id,idx:i};n.fillResources();return n;
    });
    return {id,spec:row.spec,kind,at,nodes,state:{},hums:new Map(),done:false,isObjective:false,rewardLevel:ctx.level};
  }
  private install(world:World,place:MassPlace,row:MassPuzzleSpec,ctx:Context,saved?:MassPuzzleSave):boolean{
    const id=puzzleId(place,row);if(this.live.has(id))return true;
    const run=this.makeRun(world,place,row,ctx);
    if((!saved||this.policy)&&run.nodes.some(n=>!world.walk?.isWalkable(n.pos.x,n.pos.y)||world.pointInSolid(n.pos.x,n.pos.y,n.radius)))return false;
    const rng=massRandom(world.massRuntime!.generator.run.seed,['puzzle',id,row.source]);
    world.installPlacedPuzzle(run,()=>rng.range(0,1),saved?.progress);
    this.owners.set(id,{id:place.id,center:{...place.center}});
    this.live.set(id,{run,place:place.id,row});return true;
  }
  restoreAdmitted(world:World,places:readonly MassPlace[],resolve:(p:MassPlace)=>Context,locate?:(owner:Owner)=>MassPlace|undefined):void{
    const known=new Map<string,{place:MassPlace;row:MassPuzzleSpec;ctx:Context}>();
    for(const place of places){const ctx=resolve(place);for(const row of ctx.rows)known.set(puzzleId(place,row),{place,row,ctx});}
    for(const s of this.saved.values()){
      if(s.place){
        const place=locate?.(s.place);
        if(!place||place.id!==s.place.id||canonical(place.center)!==canonical(s.place.center))throw Error('Unknown worldmass puzzle owner');
        const ctx=resolve(place),row=ctx.rows.find(r=>puzzleId(place,r)===s.id);
        if(!row)throw Error('Unknown worldmass puzzle');
        known.set(s.id,{place,row,ctx});
      }
      const owner=known.get(s.id);if(!owner)throw Error('Unknown worldmass puzzle');
      const {place,row,ctx}=owner;
      this.owners.set(s.id,{id:place.id,center:{...place.center}});
      this.expected.set(place.id,new Set(ctx.rows.map(r=>puzzleId(place,r))));
      if(!this.policy){this.install(world,place,row,ctx,s);continue;}
      // Dormant completion must pass the native codec before a board may read it.
      const run=this.makeRun(world,place,row,ctx),rng=massRandom(world.massRuntime!.generator.run.seed,['puzzle',s.id,row.source]);
      world.preparePlacedPuzzle(run,()=>rng.range(0,1),s.progress);
      s.status=run.done?'Riddle resolved':run.kind.status(run)+' · '+row.instruction;
      if(s.resident!==false&&this.needed(world,run)){
        if(!this.canAdmit(place,[row]))throw Error('Worldmass puzzle residency capacity exceeded');
        this.install(world,place,row,ctx,s);
      }
    }
  }
  admit(world:World,place:MassPlace,ctx:Context):void{
    if(!this.canAdmit(place,ctx.rows))throw Error('Worldmass puzzle capacity must be reserved before its encounter');
    this.expected.set(place.id,new Set(ctx.rows.map(r=>puzzleId(place,r))));
    for(const row of ctx.rows)this.install(world,place,row,ctx,this.saved.get(puzzleId(place,row)));
  }
  activity(place:string):{text:string;complete:boolean}|null{
    const rows=new Map<string,{text:string;complete:boolean}>();
    for(const [id,s] of this.saved)if(this.owners.get(id)?.id===place)
      rows.set(id,{text:s.status??(s.progress.done?'Riddle resolved':'Riddle unfinished'),complete:s.progress.done});
    for(const [id,{run,row,place:owner}] of this.live)if(owner===place)
      rows.set(id,{text:run.done?'Riddle resolved':run.kind.status(run)+' · '+row.instruction,complete:run.done});
    return rows.size?{text:[...rows.values()].map(r=>r.text).join(' · '),
      complete:[...rows.values()].every(r=>r.complete)&&[...(this.expected.get(place)??[])].every(id=>rows.has(id))}:null;
  }
  snapshot(world:World):MassPuzzleSave[]{
    const result=new Map(this.saved);for(const [id,r] of this.live)result.set(id,this.remember(world,id,r));
    return [...result.values()].map(s=>JSON.parse(canonical(s)) as MassPuzzleSave).sort((a,b)=>a.id.localeCompare(b.id));
  }
  get residentCount():number{return this.live.size;}
  residentOwners():Owner[]{return [...new Map([...this.live.keys()].map(id=>{const o=this.owners.get(id)!;return [o.id,{id:o.id,center:{...o.center}}] as const;})).values()];}
}
