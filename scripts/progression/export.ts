import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { bootSimEngine } from '../../src/sim/arena';
import { allUnlockables, UNLOCK_CATALOG, CLASS_BUNDLES, SLOT_TIERS } from '../../src/meta/unlocks';
import { gateRowLabel } from '../../src/meta/gates';
import { PACKAGES } from '../../src/packages/registry';
import { makeAccount, FEATURE, STARTER_CLASSES, STARTER_SKILLS, STARTER_SUPPORTS } from '../../src/meta/account';
import { CLASSES } from '../../src/data/classes';
import { MEMORY_UNLOCK_CFG, MEMORY_UNLOCKS } from '../../src/data/memoryUnlocks';
import { memoryCatalog } from '../../src/meta/memoryUnlocks';
import { VOCATION_LIST } from '../../src/data/vocations';
import { QUESTS } from '../../src/quests/defs';
import * as modes from '../../src/meta/modes';
import '../../src/data/cosmetics';
import { COSMETICS } from '../../src/engine/cosmetics';
import { POWER_PROGRESSION } from '../../src/data/powerProgression';
import { VENDOR_CFG } from '../../src/data/vendors';
bootSimEngine();
const snapshot = {
  captured: new Date().toISOString(),
  power: POWER_PROGRESSION,
  commissionFinds: VENDOR_CFG.commission.need,
  starters: { classes: STARTER_CLASSES, skills: STARTER_SKILLS, supports: STARTER_SUPPORTS },
  features: FEATURE, slots: SLOT_TIERS, classes: CLASSES, bundles: CLASS_BUNDLES,
  rows: allUnlockables(makeAccount()).map(u => ({ ...u, anyLabels: u.reqAnyOf?.map(gateRowLabel) })),
  legacyRows: UNLOCK_CATALOG.filter(u => u.kind === 'skill' || u.kind === 'support'),
  packages: PACKAGES.map(p => ({...p, hooks: undefined, monsters: undefined, skills: undefined,
    unlock: p.unlock ? {...p.unlock, predicate: String(p.unlock.test)} : null,
    tiers: p.tiers?.map(t => ({...t, predicate: String(t.test)}))})),
  memories: {config: MEMORY_UNLOCK_CFG, purchases: MEMORY_UNLOCKS,
    counts: { skills: memoryCatalog().filter(c => c.kind === 'skill').length, supports: memoryCatalog().filter(c => c.kind === 'support').length }},
  vocations: VOCATION_LIST, quests: Object.values(QUESTS).map(q => ({...q, gate: q.gate ? String(q.gate) : undefined})),
  cosmetics: Object.values(COSMETICS).filter(c => c.acquire.kind !== 'starter').map(c => ({id:c.id,name:c.name,acquire:c.acquire,consume:c.consume,description:c.description,labels:c.acquire.kind==='achievement'?c.acquire.rows.map(gateRowLabel):[]})),
  modes,
};
const output = resolve(process.argv[2] || 'balance/reports/progression-refresh');
mkdirSync(output, {recursive:true});
writeFileSync(join(output, 'progression-snapshot.json'), JSON.stringify(snapshot, (k,v)=>typeof v==='function' ? String(v) : v, 2));
console.log(JSON.stringify({rows: snapshot.rows.length, packages: PACKAGES.length, classes: CLASSES.length, vocations: VOCATION_LIST.length, quests: snapshot.quests.length, modes: Object.keys(modes), kinds: Object.fromEntries([...new Set(snapshot.rows.map(r=>r.kind))].map(k=>[k,snapshot.rows.filter(r=>r.kind===k).length]))},null,2));
