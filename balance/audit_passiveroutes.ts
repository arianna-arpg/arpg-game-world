// Hold class, gear, skill bar, pilot, level and seeds fixed. Compare literal
// four-point paths, including the preserved old route. No changes to the
// reference-build picker or target bands to conceal a weak combination.
import { writeFileSync } from 'node:fs';
import { bootSimEngine } from '../src/sim/arena';
import { runScenario } from '../src/sim/runner';
import { starterBuild } from '../src/sim/data/builds';
import { parityPack } from '../src/sim/data/scenarios';
import { PASSIVE_NODES, PASSIVE_ADJACENCY } from '../src/data/passives';

bootSimEngine();
const paths={
  original:['node_130','node_131','node_85','sor_s1'],
  repeating:['node_130','node_131','node_85','route_int_pursuit_devotee'],
  distance:['node_130','node_131','node_85','route_int_pursuit_focus'],
  varied:['node_130','node_131','node_85','route_int_pursuit_weaver'],
};
const rows=[];
for(const [path,passives] of Object.entries(paths)) {
  const allocated=new Set(['int_start']);
  for(const id of passives) {
    if(!PASSIVE_NODES[id]||!PASSIVE_ADJACENCY[id].some(n=>allocated.has(n)))throw Error('Invalid four-point path: '+id);
    allocated.add(id);
  }
  const {report,episodes}=runScenario({...parityPack('magician',5),id:`route_magician_${path}`,build:{...starterBuild('magician',5),passives}},{seeds:30,baseSeed:659918});
  const row={path,passives,deaths:episodes.filter(e=>e.ended==='player_dead').length,episodes:episodes.length,metrics:report.metrics};
  rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync('balance/reports/passive-routes-opening-balance.json',JSON.stringify(rows,null,2));
