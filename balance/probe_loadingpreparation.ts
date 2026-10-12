import assert from 'node:assert/strict';
import { prepareMassOpening, type PreparedMassOpening } from '../src/worldmass/openingPreparation';
import { MassGenerator, makeMassRun } from '../src/worldmass/generator';
import { reserveMassOpening } from '../src/worldmass/patchReservations';
import { massAdventure } from '../src/worldmass/preset';
import { address, moveAddress } from '../src/worldmass/address';
import { canonical } from '../src/worldmass/random';
import { cooperativePreparation } from '../src/loading/cooperative';

const seed = 713, runId = 'expedition:713', control = { isCurrent: () => true };
const opening = await prepareMassOpening({ seed, runId }, control);
const config = reserveMassOpening(seed, runId, massAdventure());
assert.equal(canonical(opening.config), canonical(config), 'background planning preserves the native default descriptor');
const direct = new MassGenerator(makeMassRun(seed, runId, config.terrain), config.terrain);
const prepared = new MassGenerator(opening.run, opening.config.terrain, opening);
prepared.adoptOpeningCache(opening);
const center = address(opening.origin.dimension, opening.origin.cx, opening.origin.cy, 800, 800, config.terrain.addressSpan);
for (const [x,y] of [[0,0],[-1920,-1920],[1920,1920],[-960,960],[6000,6000]]) {
  const at = moveAddress(center, {x,y}, config.terrain.addressSpan);
  assert.equal(canonical(prepared.terrainAt(at)), canonical(direct.terrainAt(at)));
  assert.equal(canonical(prepared.regionalPlacesInCell(at)), canonical(direct.regionalPlacesInCell(at)));
}
assert.ok(Object.isFrozen(opening) && Object.isFrozen(opening.config.terrain) && Object.isFrozen(opening.terrainCache));
const forged = structuredClone(opening) as PreparedMassOpening;
assert.throws(() => new MassGenerator(forged.run, forged.config.terrain, forged), /Foreign/);
assert.throws(() => prepared.adoptOpeningCache(forged), /Foreign/);
assert.throws(() => new MassGenerator({...opening.run,seed:714}, opening.config.terrain, opening), /Foreign/);
await assert.rejects(prepareMassOpening({seed,runId,config:{...config,pageRadius:100000}},control), /page budget/);
console.log('PASS worker-issued opening data preserves default terrain and refuses foreign/mutable cache admission');

let current = true, closed = false, scoped = false, ticks = 0;
const ticker = setInterval(() => { assert.equal(scoped, false, 'global policies must be released before yielding'); ticks++; current=false; }, 0);
function* work(): Generator<void,void> {
  try { for (let i=0;i<100;i++) { assert.ok(scoped); const end=performance.now()+1; while(performance.now()<end) {} yield; } }
  finally { closed=true; }
}
try {
  await assert.rejects(cooperativePreparation(work(), {isCurrent:()=>current}, next => {
    scoped=true; try { return next(); } finally { scoped=false; }
  }), {name:'AbortError'});
} finally { clearInterval(ticker); }
assert.ok(ticks>0 && closed && !scoped);
await assert.rejects(prepareMassOpening({seed,runId}, {isCurrent:()=>false}), {name:'AbortError'});
console.log('PASS preparation yields real tasks, restores policy scopes and closes cancelled generators');
