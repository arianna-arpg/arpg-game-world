import { Rng } from '../core/rng';
import { ADVENTURE_DISTRICTS } from '../engine/adventureDistricts';
import { EXPLORATION_DISTRICTS } from '../engine/explorationDistricts';
import { GridWalkField } from '../world/gridWalk';
import type { MassLandformPolicy, MassLandformShape } from './landforms';
import { freezeData } from './random';

/** Capture actual main-branch district bodies, not hand-recreated silhouettes.
 * A fresh run pins these cells; Continue never calls a mutable builder registry.
 * Native locales use the very same functions via localeGen registration. */
export function captureLandformShape(builder:string, variant:number, envelope:'precinct'|'natural'='precinct'): MassLandformShape {
  const build=ADVENTURE_DISTRICTS[builder]??EXPLORATION_DISTRICTS[builder];
  if(!build)throw Error('Unknown regional district source');
  const cell=30,bypass=120,body=variant?1140:900,size=body+bypass*2;
  const grid=new GridWalkField(size,size,cell),center={x:size/2,y:size/2};
  const params={rows:variant?4:2,spokes:variant?7:4,cuts:variant?3:2,lobes:variant?4:2,
    pools:variant?5:2,branches:variant?4:2,bridges:variant?3:1,breach:variant?1:0,bearing:variant?Math.PI/3:0};
  build({grid,center,w:body,h:body,params,rng:new Rng(713+variant)});
  // Join four native walkable stands to the surrounding land. The selected
  // stand is nearest its boundary, then nearest the axis; no central cross is
  // bulldozed through the motif. Internal builder topology survives intact.
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let stand:{x:number;y:number}|undefined,score=Infinity;
    for(let y=bypass+cell/2;y<size-bypass;y+=cell)for(let x=bypass+cell/2;x<size-bypass;x+=cell) {
      if(!grid.isWalkable(x,y))continue;
      const d=(dx?dx<0?x:size-x:dy<0?y:size-y)*10+Math.abs(dx?y-center.y:x-center.x);
      if(d<score){score=d;stand={x,y};}
    }
    if(!stand)throw Error('Regional builder has no native approach');
    grid.carveCorridor(stand.x,stand.y,dx<0?0:dx>0?size:stand.x,dy<0?0:dy>0?size:stand.y,60);
  }
  const rows:string[]=[];
  for(let y=0;y<size;y+=cell) {
    let row='';for(let x=0;x<size;x+=cell) {
      const cx=x+cell/2,cy=y+cell/2;
      // A rounded physical envelope, not a surrounding bounded-zone wall.
      const qx=Math.max(bypass+90-cx,0,cx-(size-bypass-90)),qy=Math.max(bypass+90-cy,0,cy-(size-bypass-90));
      const a=Math.atan2(cy-center.y,cx-center.x),radial=body*(.44+.025*Math.sin(a*3+variant)+.025*Math.cos(a*5-variant));
      if(cx<bypass || cy<bypass || cx>=size-bypass || cy>=size-bypass
        || (envelope==='natural' ? Math.hypot(cx-center.x,cy-center.y)>radial : Math.hypot(qx,qy)>90)) {row+='.';continue;}
      const region=grid.regionAt(cx,cy);
      row+=region==='water'?'w':region==='locale_bridge'?'c':grid.isWalkable(cx,cy)?'g':'b';
    }
    rows.push(row);
  }
  return freezeData({id:builder+'/'+variant,source:'main/district-builders/'+builder,builder,params,rows});
}
export function massLandformPolicy(): MassLandformPolicy {
  const sources: {builder:string; envelope:'precinct'|'natural'; variants?:number[]}[] = [
    ...['arcade_rows','terraced_homes','cloister_walk','sunken_channels','settlement_blocks','crypt_wings'].map(builder=>({builder,envelope:'precinct' as const})),
    ...['ossuary_spokes','braided_thickets','stepping_pools','ridge_spurs'].map(builder=>({builder,envelope:'natural' as const})),
    {builder:'grove_ring',envelope:'natural',variants:[0]},
  ];
  const shapes=sources.flatMap(s=>(s.variants??[0,1]).map(v=>captureLandformShape(s.builder,v,s.envelope)));
  const ids=(...builders:string[])=>[0,1].flatMap(v=>builders.map(b=>b+'/'+v)).filter(id=>shapes.some(s=>s.id===id));
  return freezeData({source:'worldmass/native-district-landforms-v1',version:1,cell:30,spacing:2880,jitter:.24,chance:.9,bypass:120,
    interiorRegions:['ground','sand','firm_sand','ice','wall'],bypassRegions:['ground','sand','firm_sand','ice'],shapes,
    recipes:[
      {id:'highland-passages',biomes:['highland','mountain','tundra','downs','forest'],when:[{field:'elevation',min:.42}],
        shapes:ids('ridge_spurs','terraced_homes','ossuary_spokes'),barrier:{region:'crag',color:'#57584d'}},
      {id:'frozen-ridges',biomes:['tundra'],when:[],shapes:ids('ridge_spurs','cloister_walk','crypt_wings'),barrier:{region:'crag',color:'#69787a'}},
      {id:'woodland-passages',biomes:['forest'],when:[],shapes:ids('braided_thickets','grove_ring','stepping_pools'),barrier:{region:'hedgewall',color:'#2d4225'}},
      {id:'wetland-crossings',biomes:['marsh'],when:[],shapes:ids('sunken_channels','stepping_pools','grove_ring'),barrier:{region:'hedgewall',color:'#334633'}},
      {id:'desert-precincts',biomes:['desert'],when:[],shapes:ids('terraced_homes','ossuary_spokes','arcade_rows'),barrier:{region:'sandstone',color:'#736149'}},
      {id:'country-precincts',biomes:['downs'],when:[],shapes:ids('settlement_blocks','arcade_rows','cloister_walk','crypt_wings'),barrier:{region:'drystone',color:'#595345'}},
    ]});
}
