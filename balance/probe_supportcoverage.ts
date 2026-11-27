import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { auditSupports } from '../scripts/hotbar-study/supportCoverage';
import { SUPPORTS } from '../src/data/supports';
import { SKILLS } from '../src/data/skills';
import { ROLE_DESTINATIONS } from '../src/data/supportVisuals';
import { makeSkillGem, supportFitsInst, crewSkillsServed } from '../src/engine/skills';
import { supportMarks, supportMeters } from '../src/engine/supportPresentation';
import { makeSimWorld } from '../src/sim/arena';

const rows=auditSupports(), world=makeSimWorld('warrior',7632);
const hosts=Object.values(SKILLS).map(d=>{
  const inst=makeSkillGem(d,1,'legendary');
  return {inst,crew:world.summonCrewSkills(inst)};
});
let totalCuts=0, levelCases=0, hostPairs=0, crewPairs=0;
const faces=new Map<string,string>();
const report=rows.map(row=>{
  const def=SUPPORTS[row.id];
  const variants=row.variants.map(v=>{
    totalCuts++;
    levelCases+=v.levels.length;
    const {rolled,levels}=v;
    const expected=levels[0].readings;
    const destinations=new Set(levels.flatMap(l=>l.roles.map(r=>ROLE_DESTINATIONS[r])));
    let serving=0, aboard=0, components=0, withCounter=0;
    for (const r of levels.flatMap(l=>l.readings)) {
      assert.ok(r.counter);
      const owner=faces.get(r.counter);
      assert.ok(!owner || owner===row.id,'Counter art collision '+r.counter);
      faces.set(r.counter,row.id);
    }
    for (const {inst:bare,crew} of hosts) {
      const direct=supportFitsInst(def,bare,rolled);
      if (!direct && !crewSkillsServed(def,bare,crew)) continue;
      const host=makeSkillGem(bare.def,1,'legendary');
      host.sockets[0]={def,level:1,rolled};
      const [m]=supportMarks(world,world.player,host);
      assert.equal(m?.id,def.id);
      const meters=supportMeters([m]);
      if (m.serving) {
        assert.ok(direct,def.id+' displayed as a host mechanic on '+bare.def.id+' through crew admission');
        serving++;
        if (m.useBank || meters.length) withCounter++;
        for (const reading of meters) {
          assert.ok(expected.some(r=>r.counter===reading.counter),row.id+' unexpected face on '+bare.def.id);
          assert.ok(Number.isFinite(reading.meter!.count) && Number.isFinite(reading.meter!.cap));
        }
      } else {
        assert.ok(!m.useBank && !meters.length,'A forwarded socket cannot paint a player bank');
        if (m.routedTo==='crew') aboard++; else {assert.equal(m.routedTo,'component');components++;}
      }
    }
    hostPairs+=serving+components;crewPairs+=aboard;
    return {rolled,destinations:[...destinations],example:levels[0].host,requiredLinks:levels[0].links,
      levels:levels.map(l=>({level:l.level,readings:l.readings})),baseHosts:{serving,withCounter,crewOnly:aboard,componentOnly:components}};
  });
  return {id:row.id,name:row.name,variants};
});
const summary={supports:rows.length,configurations:totalCuts,levelCases,hostPairs,crewOnlyPairs:crewPairs,
  counterSupports:new Set(faces.values()).size,counterFaces:faces.size};
if (process.argv.includes('--report')) {
  mkdirSync('balance/reports',{recursive:true});
  writeFileSync('balance/reports/support-coverage.json',JSON.stringify({summary,supports:report},null,2)+'\n');
}
console.log('PASS support placement sweep',summary);
