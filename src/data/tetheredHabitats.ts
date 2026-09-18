import { registerLair } from '../engine/lairs';
import { registerDoodadRule, registerLandmark } from '../engine/levelgen';
import { authoredZoneDef, registerAuthoredMap, type AuthoredMapDef } from '../engine/authoredMaps';
import { mintCave } from '../engine/worldgen';
import { registerSidezone } from './sidezones';

/** Exact encounter composition belongs to the existing authored-map grammar.
 * Posts are the hounds' spawn points; ordinary zone memory owns both deaths
 * and tether origins. No on-enter summons or special enemy-ID code. */
export const ASHEN_KENNELS: AuthoredMapDef = {
  id:'ashen_kennels',name:'the Ashen Kennels',tileset:'hell_steppes',
  cols:40,rows:34,
  grid:Array.from({length:34},(_,y)=>y===0||y===33?'#'.repeat(40):'#'+'.'.repeat(38)+'#'),
  doodads:[
    {kind:'brazier',x:180,y:240,r:16},{kind:'brazier',x:1020,y:240,r:16},
    {kind:'bone_pile',x:300,y:300,r:18},{kind:'bone_pile',x:900,y:300,r:18},
  ],
  spawns:[
    {id:'ashen_houndmaster',x:600,y:390,post:true,facing:Math.PI/2},
    {id:'stakebound_hound',x:360,y:540,facing:Math.PI/2},
    {id:'stakebound_hound',x:840,y:540,facing:Math.PI/2},
    {id:'stakebound_hound',x:600,y:270,facing:Math.PI/2},
  ],
  markers:[{kind:'entry',x:600,y:900},{kind:'poi',x:600,y:450}],
  objective:{kind:'clear',all:true},noFactionWar:true,
  notes:'Posted hounds cover the yard. Their keeper rallies them; killing him removes their proximity bond.',
  tags:['demon','kennel','tether'],
};
registerAuthoredMap(ASHEN_KENNELS);

registerDoodadRule('ashen_kennel_gate',{overlap:'trigger',spacing:60});
registerLandmark({
  id:'ashen_kennel_mouth',builder:'den_mouth',size:[180,240],clearSite:true,poi:true,mustReach:true,
  params:{mouthKind:'ashen_kennel_gate',floorKind:'mud',dress:[
    {kind:'bone_pile',count:[2,3],radius:[12,18]},
    {kind:'brazier',count:[1,2],radius:[12,16]},
  ]},
});
registerSidezone({
  kind:'ashen_kennel_gate',dwell:0.7,
  mint:({parent,seed,id})=>{
    const cave=mintCave(parent,seed,id,'hell_steppes',{noDeeper:true});
    const def=authoredZoneDef(ASHEN_KENNELS,{id,level:cave.level,seed,map:cave.map});
    return {...def,caveDepth:cave.caveDepth,noDeeper:true,anchor:cave.anchor,
      dimension:cave.dimension,geo:cave.geo,exits:cave.exits};
  },
});
registerLair({
  id:'ashen_kennels',landmark:'ashen_kennel_mouth',
  seat:{biomes:['steppes','volcanic'],place:'surface',level:{from:8},chance:0.24},
});
