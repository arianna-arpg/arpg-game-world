import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { massAdventure, type MassAdventure } from '../src/worldmass/preset';
import { WorldMassRuntime } from '../src/worldmass/runtime';
import { MassJourney } from '../src/worldmass/journey';
import { massRoadNotices } from '../src/worldmass/roadGuide';
import { roadGuideHtml } from '../src/ui/roadGuide';
import { massMap } from '../src/worldmass/paint';
import { canonical } from '../src/worldmass/random';
import { serializeCharacter } from '../src/meta/character';

const restore = seedGlobalRandom(67401);
try {
 const w=makeSimWorld('warrior',42);w.startWorldMass(42);
 const m=w.massRuntime!,before=canonical([m.state.snapshot(),m.sites.discovered,w.activeQuests,w.actors.map(a=>a.id)]);
 const rows=massRoadNotices(m);
 assert.equal(rows.length,4);assert.deepEqual(rows.map(r=>r.departure),['west','east','north','south']);
 assert.ok(rows.find(r=>r.departure==='east')!.note.includes('lattice'));
 assert.equal(m.sites.discovered.length,0);
 for(const row of rows){
  const target=m.journey!.places.find(p=>p.recipe===row.id)!;
  assert.equal(row.name,m.config.content.find(c=>c.id===target.content)!.site!.name);
 }
 assert.equal((roadGuideHtml(m).match(/data-mass-road="/g)??[]).length,4);
 assert.ok(!massMap(m,w.player.pos).includes('Memorial Grove'),'road notes cannot reveal undiscovered map places');
 assert.equal(canonical([m.state.snapshot(),m.sites.discovered,w.activeQuests,w.actors.map(a=>a.id)]),before);
 const character=serializeCharacter(w),again=makeSimWorld('warrior',73);
 again.adoptWorldState(character.world);again.startWorldMass(42,character.world!.worldmass);
 assert.deepEqual(massRoadNotices(again.massRuntime!),rows,'Continue retains exact public accounts');
 console.log('PASS four attributed road choices, no discovery/admission/quest mutation, exact Continue');

 const changed:MassAdventure=JSON.parse(canonical(massAdventure()));
 changed.journey!.notices=[{destination:'east-camp',note:'<img src=x onerror="x"> & a different account'}];
 changed.content.find(c=>c.id==='memorial-grove')!.site!.name='A <modded> grove';
 const customWorld=makeSimWorld('warrior',5),custom=new WorldMassRuntime(2,'guide-mod',changed);custom.attach(customWorld);
 const html=roadGuideHtml(custom);
 assert.ok(html.includes('&lt;img')&&html.includes('&lt;modded&gt;')&&!html.includes('<img'));
 assert.equal(massRoadNotices(custom).length,1);
 delete changed.journey!.notices;
 const oldWorld=makeSimWorld('warrior',6),old=new WorldMassRuntime(2,'guide-old',changed);old.attach(oldWorld);
 assert.deepEqual(massRoadNotices(old),[],'omitted old descriptors stay omitted');
 const oldSave=old.snapshot(oldWorld),oldAgain=makeSimWorld('warrior',7);
 new WorldMassRuntime(2,'guide-old',oldSave.config,oldSave).attach(oldAgain,oldSave);
 assert.deepEqual(massRoadNotices(oldAgain.massRuntime!),[]);
 console.log('PASS mod-owned accounts/names escaped, omitted old descriptors and old Continue preserved');

 for(const notices of [null,{},[{destination:'missing',note:'Bad'}],[{destination:'east-camp',note:''}],
   [{destination:'east-camp',note:'x'.repeat(241)}],[{destination:'east-camp',note:'One'},{destination:'east-camp',note:'Two'}],
   [null]]){
  const spec={...m.journey!.spec,notices} as unknown as NonNullable<MassAdventure['journey']>;
  assert.throws(()=>new MassJourney(spec,m.settlement!,m.generator,m.walk),/Invalid frontier road notice/);
 }
 console.log('PASS malformed, duplicate, unknown, empty and oversized public notice refusal');
} finally { restore(); }
