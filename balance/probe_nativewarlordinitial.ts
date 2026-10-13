import '../src/engine/world';
import assert from 'node:assert/strict';
import {clientSetup} from './nativeClientRuntimeFixture';
import {NativeClientRuntime} from '../src/worldmass/nativeClientRuntime';
import {withSeededRandom} from '../src/core/rng';
import {refuseWorldCombat,combatHash,writeCombatProof} from './probe_nativecombatcycle';
function course(real:boolean){return withSeededRandom(66022,()=>{
 const setup=clientSetup(45927),w=setup.writer,A=setup.definition,B=setup.destination,field=w.sim.warlord;
 for(const [z,power]of [[A,100],[B,90]]as const){w.sim.onNodeCharted(z,w.devOverlayView());const snap=w.sim.faction.snapshot() as {field:Record<string,Record<string,number>>};for(const f of Object.keys(snap.field[z.id]??{}))w.sim.faction.bleed(z.id,f,100);w.sim.faction.reinforce(z.id,'goblin',power);}
 if(real)field.update(0,w.devOverlayView());else field.lords.set('goblin',{faction:'goblin',capitalId:A.id,alive:true,suppressUntil:0});
 const lord=field.lords.get('goblin')!;assert(lord);assert.equal(!!field.crownOf(lord),real);
 return refuseWorldCombat([w],worldDrivers=>{const r=new NativeClientRuntime({writer:w,definition:A,geography:setup.geography.spec});r.install();const area=r.current,body=w.actors.find(a=>a.tag==='warlord'&&a.faction==='goblin');assert.equal(!!body,real);if(body){const ledger=w.ledger.warlords_killed??0;assert.equal(area.authority.require(body).combat,area.combat);area.combat.kill(body,false,w.player);assert.equal(w.ledger.warlords_killed,ledger+1);assert.equal(lord.alive,false);}r.retire();return{real,actualInitialBirth:real,tagRowDoesNotMintCrown:!real,worldDrivers};});
});}
const rows=[course(true),course(false)],report={scope:'First retained birth with a genuine WarlordField crown established by native territory APIs; counterpart injects only a public lord row and must create neither a private crown nor a boss. The real initial body kills through its exact area owner.',rows,receipt:combatHash(JSON.stringify(rows))};writeCombatProof('native-warlord-initial.json',report);console.log(JSON.stringify(report));
