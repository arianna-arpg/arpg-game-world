import type { World } from '../engine/world';
import { PUZZLE_CFG, PUZZLE_KINDS, type PuzzleSpec, type PuzzleRun, type PuzzleCheckpoint } from '../engine/puzzles';
import { PUZZLES } from '../data/puzzles';
import { LOOT_TABLES } from '../data/loottables';
import { SKILLS } from '../data/skills';
import type { MassPlace } from './contracts';
import { canonical, massRandom } from './random';
import { siteOffset } from './sites';

export interface MassPuzzleSpec { id: string; source: string; x: number; y: number; spec: PuzzleSpec; instruction: string }
export interface MassPuzzleSave { id: string; progress: PuzzleCheckpoint }
/** Finite fixtures share the native population budget; unbounded puzzle residency
 * needs its own dependency contract. Adding kinds requires a native progress codec. */
export const MASS_PUZZLE_LIMIT = 18;
export function nativeMassPuzzle(id: string, x: number, y: number, instruction: string, count?: number): MassPuzzleSpec {
  if (!PUZZLES[id]) throw Error('Unknown native puzzle');
  const s=PUZZLES[id], k=PUZZLE_KINDS[s.kind];
  if(k.geometry==='ring' && !Number.isSafeInteger(count))throw Error('Placed rings need a fixed node count');
  const layout=k.geometry==='grid' ? {grid:s.grid??[3,3],scramble:s.scramble??[3,6]}
    : {count:[count!,count!] as [number,number],gutter:s.gutter??PUZZLE_CFG.emberGutter};
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
    || ![row.x,row.y].every(Number.isFinite) || !k?.checkpoint || !['lattice','ember'].includes(s.kind)
    || s.format!==undefined || s.node!==undefined || s.heart!==undefined
    || s.kind==='ember'&&(s.grid!==undefined||s.scramble!==undefined
      ||!Array.isArray(s.count)||s.count.length!==2||!Number.isSafeInteger(s.count[0])
      ||s.count[0]<3||s.count[0]>8||s.count[0]!==s.count[1]
      ||s.gutter===undefined||!Number.isFinite(s.gutter)||s.gutter<.5||s.gutter>60)
    || s.grid!==undefined&&(!Array.isArray(s.grid)||s.grid.length!==2||s.grid.some(v=>!Number.isSafeInteger(v)||v<2||v>4))
    || s.spacing!==undefined&&(!Number.isFinite(s.spacing)||s.spacing<55||s.spacing>120)
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
export class MassPuzzles {
  private live=new Map<string,{run:PuzzleRun;place:string;row:MassPuzzleSpec}>();
  private saved=new Map<string,MassPuzzleSave>();
  constructor(saved:readonly MassPuzzleSave[]=[]){
    if(!Array.isArray(saved)||saved.length>MASS_PUZZLE_LIMIT)throw Error('Invalid worldmass puzzle count');
    for(const s of saved){
      if(!s||typeof s.id!=='string'||!s.id||this.saved.has(s.id)||!s.progress)throw Error('Invalid worldmass puzzle checkpoint');
      this.saved.set(s.id,JSON.parse(canonical(s)));
    }
  }
  owns(place:string):boolean{return [...this.live.values()].some(r=>r.place===place);}
  visible(id:string,at:{x:number;y:number}):boolean{
    const r=this.live.get(id);return !r||Math.hypot(r.run.at.x-at.x,r.run.at.y-at.y)<PUZZLE_CFG.earshot;
  }
  get population():number{return [...this.live.values()].reduce((n,r)=>n+r.run.nodes.length,0);}
  missing(place:MassPlace,rows:readonly MassPuzzleSpec[]):number{
    return rows.reduce((n,r)=>n+(this.live.has(puzzleId(place,r))?0:puzzleSeats(r).length),0);
  }
  private install(world:World,place:MassPlace,row:MassPuzzleSpec,ctx:Context,saved?:MassPuzzleSave):boolean{
    const id=puzzleId(place,row);if(this.live.has(id))return true;
    const off=siteOffset(place,row.x,row.y),at={x:ctx.center.x+off.x,y:ctx.center.y+off.y};
    // Native rectangular coordinates stay screen aligned, just as native zone
    // courts. Rotate the anchor with the site, never shuffle individual seats.
    const kind=PUZZLE_KINDS[row.spec.kind],nodes=puzzleSeats(row).map((p,i)=>{
      const n=world.createMonster(kind.nodeMonster,ctx.level,'enemy');
      n.pos={x:at.x+p.x,y:at.y+p.y};n.puzzleNode={id,idx:i};n.fillResources();return n;
    });
    if(!saved && nodes.some(n=>!world.walk?.isWalkable(n.pos.x,n.pos.y)||world.pointInSolid(n.pos.x,n.pos.y,n.radius)))return false;
    const run:PuzzleRun={id,spec:row.spec,kind,at,nodes,state:{},hums:new Map(),done:false,isObjective:false,rewardLevel:ctx.level};
    const rng=massRandom(world.massRuntime!.generator.run.seed,['puzzle',id,row.source]);
    world.installPlacedPuzzle(run,()=>rng.range(0,1),saved?.progress);
    this.live.set(id,{run,place:place.id,row});return true;
  }
  restoreAdmitted(world:World,places:readonly MassPlace[],resolve:(p:MassPlace)=>Context):void{
    const known=new Map<string,{place:MassPlace;row:MassPuzzleSpec;ctx:Context}>();
    for(const place of places){const ctx=resolve(place);for(const row of ctx.rows)known.set(puzzleId(place,row),{place,row,ctx});}
    for(const s of this.saved.values()){
      const owner=known.get(s.id);if(!owner)throw Error('Unknown worldmass puzzle');
      this.install(world,owner.place,owner.row,owner.ctx,s);
    }
  }
  admit(world:World,place:MassPlace,ctx:Context):void{
    for(const row of ctx.rows)this.install(world,place,row,ctx);
  }
  activity(place:string):{text:string;complete:boolean}|null{
    const rows=[...this.live.values()].filter(r=>r.place===place);
    return rows.length?{text:rows.map(({run,row})=>run.done?'Riddle resolved':run.kind.status(run)+' · '+row.instruction).join(' · '),
      complete:rows.every(r=>r.run.done)}:null;
  }
  snapshot(world:World):MassPuzzleSave[]{
    return [...this.live].map(([id,r])=>({id,progress:world.capturePlacedPuzzle(r.run)})).sort((a,b)=>a.id.localeCompare(b.id));
  }
}
