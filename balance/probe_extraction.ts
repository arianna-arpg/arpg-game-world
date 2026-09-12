// ---------------------------------------------------------------------------
// ONE-OFF PROBE — EXTRACTION's TEMPERS + THE POT (her ruling 2026-09-11):
//   A. the def stands its temper rows; every row rolls on the encounter
//      stream by weight; a placed seam carries one roll.
//   B. THE WARY TEMPER (the default): every swarmer spawns with hero threat
//      ABOVE its node threat — the swarm comes for the defender first; the
//      node's seed reads seedThreat × the body's fixation × focus.
//   C. THE RAVENOUS TEMPER: no hero threat, node seed × focus above one.
//   D. THE CLASSIC FALLBACK: a spec without rows wears CLASSIC_EXTRACT_TEMPER.
//   E. THE POT: a shallow seam drained at level 10 beats a harvest node's
//      perfect payout; a primeval one dwarfs it; more seconds stood = more
//      pot; a harder temper pays more; a broken stand pays less than full.
//   npx tsx balance/probe_extraction.ts
// ---------------------------------------------------------------------------

import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { allEncounterSpecs } from '../src/packages/registry';
import { CLASSIC_EXTRACT_TEMPER, type EncounterDef, type ExtractSpec } from '../src/packages/encounters';
import { vec, type Vec2 } from '../src/core/math';
import type { ActiveEncounter } from '../src/engine/encounter';
import type { Actor } from '../src/engine/actor';
import { MONSTERS } from '../src/data/monsters';
import { harvestPayoutValue, harvestSeqLen } from '../src/engine/harvest';
import { walletMortalValue, type EssenceId } from '../src/data/essences';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

interface WorldInternals {
  encounters: ActiveEncounter[];
  drops: { item: { kind: string; essence?: string; count?: number } }[];
  clampPos(p: Vec2, r: number): Vec2;
  materializeExtractionNode(e: ActiveEncounter): void;
  armExtraction(e: ActiveEncounter): void;
  spawnExtractionSwarm(e: ActiveEncounter, n: number): void;
  payExtraction(e: ActiveEncounter, frac: number, full: boolean): void;
  extractTemperOf(e: ActiveEncounter): { id: string; focus: number; heroThreat: number; yieldMul: number };
  rollExtractTemper(spec: ExtractSpec): { id: string };
  actorById(id: number): Actor | null;
}

seedGlobalRandom(7717);
const world = makeSimWorld('juggernaut', 7717);
const w = world as unknown as WorldInternals;
world.player.invulnerable = true;
const def = allEncounterSpecs().find(e => e.extract) as EncounterDef;
const spec = def.extract!;
const tempers = spec.swarm.tempers ?? [];
check('A1 the extraction def stands at least three tempers, ids unique',
  tempers.length >= 3 && new Set(tempers.map(t => t.id)).size === tempers.length);
check('A2 the default temper (the heaviest weight) is player-first: focus below one, hero threat above zero',
  (() => { const top = [...tempers].sort((a, b) => b.weight - a.weight)[0]; return top.focus < 1 && top.heroThreat > 0; })());
const seen = new Set<string>();
for (let i = 0; i < 400; i++) seen.add(w.rollExtractTemper(spec).id);
check('A3 every temper rolls on the encounter stream', tempers.every(t => seen.has(t.id)), [...seen].join(','));

const stand = (scaleIx: number): ActiveEncounter => {
  const scale = def.scales[scaleIx];
  const enc = {
    def, scale, pos: w.clampPos(vec(world.player.pos.x + 220, world.player.pos.y), 24),
    phase: 'dormant', radius: scale.startRadius, timer: 0, maxTimer: 0, spawnTimer: 0,
    kills: 0, bonusUsed: 0, spawned: new Set<number>(),
  } as unknown as ActiveEncounter;
  w.encounters.push(enc);
  w.materializeExtractionNode(enc);
  return enc;
};
const threatOf = (a: Actor, id: number): number => a.threat.get(id) ?? 0;
const nodeSeedOf = (a: Actor, focus: number): number =>
  spec.swarm.seedThreat * ((a.defId ? MONSTERS[a.defId]?.aggro?.fixation : undefined) ?? 1) * focus;

const e1 = stand(0);
check('A4 a placed seam carries one rolled temper', tempers.some(t => t.id === e1.ex?.temper), String(e1.ex?.temper));

// === B. THE WARY TEMPER =======================================================
const wary = [...tempers].sort((a, b) => b.weight - a.weight)[0];
e1.ex!.temper = wary.id;
w.armExtraction(e1);
w.spawnExtractionSwarm(e1, 4);
const bodies1 = [...e1.spawned].map(id => w.actorById(id)).filter((a): a is Actor => !!a);
check('B1 the pulse fielded bodies', bodies1.length >= 3, `bodies=${bodies1.length}`);
check('B2 wary: every swarmer carries HERO threat above its node threat (the defender comes first)',
  bodies1.every(a => threatOf(a, world.player.id) === wary.heroThreat && threatOf(a, world.player.id) > threatOf(a, e1.ex!.nodeId)));
check('B3 wary: the node seed reads seedThreat × fixation × focus',
  bodies1.every(a => Math.abs(threatOf(a, e1.ex!.nodeId) - nodeSeedOf(a, wary.focus)) < 1e-6));

// === C. THE RAVENOUS TEMPER ===================================================
const rav = [...tempers].sort((a, b) => b.focus - a.focus)[0];
const e2 = stand(0);
e2.ex!.temper = rav.id;
w.armExtraction(e2);
w.spawnExtractionSwarm(e2, 4);
const bodies2 = [...e2.spawned].map(id => w.actorById(id)).filter((a): a is Actor => !!a);
check('C1 ravenous: no hero threat, the node outranks the defender', rav.focus > 1 && rav.heroThreat === 0
  && bodies2.length >= 3 && bodies2.every(a => threatOf(a, world.player.id) === 0));
check('C2 ravenous: the node seed reads seedThreat × fixation × focus',
  bodies2.every(a => Math.abs(threatOf(a, e2.ex!.nodeId) - nodeSeedOf(a, rav.focus)) < 1e-6));

// === D. THE CLASSIC FALLBACK ==================================================
const bare = { ...e1, def: { ...def, extract: { ...spec, swarm: { ...spec.swarm, tempers: undefined } } } } as ActiveEncounter;
const t = w.extractTemperOf(bare);
check('D1 a spec without temper rows wears the classic fixation (the borough pour, byte for byte)',
  t.id === CLASSIC_EXTRACT_TEMPER.id && t.focus === 1 && t.heroThreat === 0 && t.yieldMul === 1);

// === E. THE POT ===============================================================
(world.zone as { level: number }).level = 10;
const len10 = harvestSeqLen(10);
const node10 = harvestPayoutValue(10, len10, 0, len10);
const potOf = (scaleIx: number, temperId: string, stood: number, frac: number, full: boolean): number => {
  const e = stand(scaleIx);
  e.ex!.temper = temperId;
  e.ex!.stood = stood;
  const d0 = w.drops.length;
  w.payExtraction(e, frac, full);
  const wallet: Partial<Record<EssenceId, number>> = {};
  for (const d of w.drops.slice(d0)) {
    if (d.item.kind !== 'essence' || !d.item.essence) continue;
    const id = d.item.essence as EssenceId;
    wallet[id] = (wallet[id] ?? 0) + (d.item.count ?? 0);
  }
  return walletMortalValue(wallet as Record<EssenceId, number>);
};
const shallowFull = potOf(0, wary.id, def.scales[0].baseTime, 1, true);
const primevalFull = potOf(def.scales.length - 1, wary.id, def.scales[def.scales.length - 1].baseTime, 1, true);
check('E1 a shallow seam drained at level 10 beats a harvest node perfect payout',
  shallowFull >= node10 * 1.4, `seam=${shallowFull} node=${node10}`);
check('E2 a primeval seam drained dwarfs it', primevalFull >= node10 * 5, `seam=${primevalFull} node=${node10}`);
const stoodShort = potOf(0, wary.id, 10, 1, true), stoodLong = potOf(0, wary.id, 40, 1, true);
check('E3 more seconds stood = more pot (the persistence term)', stoodLong > stoodShort, `${stoodShort} < ${stoodLong}`);
const ravFull = potOf(0, rav.id, def.scales[0].baseTime, 1, true);
check('E4 a harder temper pays more for the same stand', ravFull > shallowFull, `${shallowFull} < ${ravFull}`);
const broken = potOf(0, wary.id, def.scales[0].baseTime * 0.5, 0.5, false);
check('E5 a broken stand pays less than a full one, and still pays above the floor',
  broken < shallowFull && broken > 0, `${broken} < ${shallowFull}`);
check('E6 the persistence dial is data and non-negative', spec.yield.potPerSec >= 0);

console.log(`\nprobe_extraction: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
