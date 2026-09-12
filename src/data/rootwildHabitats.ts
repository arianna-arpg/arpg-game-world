import { registerLair } from '../engine/lairs';
import { registerDoodadRule, registerLandmark } from '../engine/levelgen';
import { mintCave } from '../engine/worldgen';
import { registerSidezone } from './sidezones';

/** A real place to find the whole faction, reached through the ordinary
 * lair/sidezone fabric. The Rhizarch is confined to this boss objective. */
registerDoodadRule('rootwild_seedbed_gate',{overlap:'trigger',spacing:60});
registerLandmark({
  id:'rootwild_seedbed_mouth',builder:'den_mouth',size:[180,240],
  clearSite:true,poi:true,mustReach:true,
  params:{mouthKind:'rootwild_seedbed_gate',floorKind:'mud',dress:[
    {kind:'seed_pod',count:[2,3],radius:[10,15]},
    {kind:'strangler_root',count:[2,3],radius:[12,17]},
    {kind:'leaf_mulch',count:[2,3],radius:[13,19]},
  ]},
});
registerSidezone({
  kind:'rootwild_seedbed_gate',dwell:0.7,ledgerOnEnter:'rootwild_seedbed_entered',
  mint:({parent,seed,id})=>{
    const def=mintCave(parent,seed,id,'rootways',{
      rollVariant:true,name:'the Seedbed Hollow',
      objective:{kind:'boss',id:'rootwild_rhizarch'},noDeeper:true,
    });
    def.packs={count:[3,4],size:[2,3],table:[
      {id:'rootwild_burrling',weight:3},{id:'rootwild_thornfan',weight:2},
      {id:'rootwild_hingejaw',weight:2},{id:'rootwild_pitcher',weight:1},
      {id:'rootwild_sundew',weight:1},{id:'rootwild_hookvine',weight:1},
      {id:'rootwild_brambleback',weight:1},
      {id:'rootwild_windseed',weight:1},{id:'rootwild_coppice',weight:1},
    ]};
    def.fauna=[{id:'rootwild_nectar_bell',chance:1,count:[1,1]}];
    return def;
  },
});
registerLair({
  id:'rootwild_seedbed',landmark:'rootwild_seedbed_mouth',
  seat:{biomes:['forest','grove','marsh','jungle'],place:'surface',level:{from:14},chance:0.2},
});

/** Smaller feeding patches offer a mixed fight before the boss den. */
registerLandmark({
  id:'rootwild_feeding_patch',builder:'pit',size:[220,290],
  clearSite:true,poi:true,mustReach:true,
  params:{rimRegion:'wall',floorKind:'mud',gapArc:1.15,inner:[
    {kind:'seed_pod',count:[1,2],radius:[10,13]},
    {kind:'leaf_mulch',count:[2,3],radius:[12,18]},
  ]},
  spawns:{table:[{id:'rootwild_burrling',weight:2},{id:'rootwild_thornfan',weight:2},
    {id:'rootwild_hingejaw',weight:1},{id:'rootwild_nectar_bell',weight:1}],
    count:[3,4],where:'interior'},
});
registerLair({
  id:'rootwild_feeding_patch',landmark:'rootwild_feeding_patch',
  seat:{biomes:['forest','grove','jungle'],place:'surface',level:{from:8},chance:0.16},
});
