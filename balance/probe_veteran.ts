// ---------------------------------------------------------------------------
// THE VETERAN PILOT (src/sim/pilots.ts VeteranPilot; decision C19): the balance
// harness's mobile facet, a player who does not stand and trade. Pinned on the
// real engine, always against the plain pilot with the same hands and seeds:
//   A. It leaves a telegraphed blast that hurts: pit_lord wounds it less.
//   B. It does not give up its swing for a telegraph that cannot hurt it or cannot be
//      escaped: gnoll_colossus's room-wide rally cry leaves its fight unchanged.
//   C. Surrounded, it walks out: six crawlers kill the plain warrior more often.
//   D. A melee hand stands and swings at a training dummy exactly as the plain one does,
//      and a ranged hand sidesteps.
//   E. Same seed, same fight.
//   F. The bestiary reads it: every monster's sweep carries a veteran duel per stick.
// Run: npx tsx balance/probe_veteran.ts
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { runEpisode } from '../src/sim/runner';
import { bestiaryDefs } from '../src/sim/sweeps';
import { dummyDps, matchupDuel, pilotFor, veteranPilotFor } from '../src/sim/data/scenarios';
import { ensureTierBuild } from '../src/sim/data/builds';
import type { PilotSpec, ScenarioDef } from '../src/sim/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
const SEEDS = [1, 2, 3, 4, 5, 6];
const warrior = ensureTierBuild('geared', 'warrior', 12);
const taken = (pilot: PilotSpec, monster: string): number => SEEDS.reduce((s, seed) => {
  const m = runEpisode(matchupDuel(warrior, monster, { level: 12, duration: 25, pilot, idTag: 'vetprobe' }), seed).metrics;
  return s + m.dps_in - (m.untapped_in ?? 0);
}, 0) / SEEDS.length;
const same = (a: ReturnType<typeof runEpisode>, b: ReturnType<typeof runEpisode>): boolean =>
  JSON.stringify(a.fingerprint) === JSON.stringify(b.fingerprint);

// --- A) It leaves a blast that hurts ------------------------------------------------------
{
  const plain = taken(pilotFor('warrior'), 'pit_lord'), vet = taken(veteranPilotFor('warrior'), 'pit_lord');
  check('a warrior who dodges takes less from pit_lord than one who stands', vet < plain * 0.95, `${plain.toFixed(1)} → ${vet.toFixed(1)} per s`);
}

// --- B) Nothing to dodge, nothing given up --------------------------------------------------
{
  const plain = taken(pilotFor('warrior'), 'gnoll_colossus'), vet = taken(veteranPilotFor('warrior'), 'gnoll_colossus');
  check('a room-wide rally cry costs the veteran no swings', Math.abs(vet - plain) <= plain * 0.05, `${plain.toFixed(1)} → ${vet.toFixed(1)} per s`);
}

// --- C) Surrounded, it walks out ----------------------------------------------------------------
{
  const pack = (pilot: PilotSpec, seed: number): boolean => runEpisode({
    id: 'vetprobe_crawlers', label: 'six crawlers', build: warrior, pilot, parityLevel: 12,
    waves: [{ monsters: [{ id: 'abyssal_crawler', level: 12, count: 6 }], distance: 260 }],
    duration: 40, stop: 'waves_dead',
  } as ScenarioDef, seed).ended === 'player_dead';
  const seeds = [11, 22, 33, 44, 55, 66];
  const plain = seeds.filter(s => pack(pilotFor('warrior'), s)).length;
  const vet = seeds.filter(s => pack(veteranPilotFor('warrior'), s)).length;
  check('six crawlers kill the veteran warrior less often than the plain one', vet < plain, `${plain} → ${vet} deaths of ${seeds.length}`);
}

// --- D) A melee hand stands and swings; a ranged hand sidesteps -------------------------------
{
  const dummy = (cls: string, pilot: PilotSpec) => runEpisode({ ...dummyDps(cls, 12, { tier: 'geared' }), pilot }, 7);
  check('at a training dummy the veteran warrior swings exactly as the plain one',
    same(dummy('warrior', pilotFor('warrior')), dummy('warrior', veteranPilotFor('warrior'))));
  check('and the veteran magician keeps moving', !same(dummy('magician', pilotFor('magician')), dummy('magician', veteranPilotFor('magician'))));
}

// --- E) Same seed, same fight ---------------------------------------------------------------------
{
  const run = () => runEpisode(matchupDuel(warrior, 'imp', { level: 12, duration: 20, pilot: veteranPilotFor('warrior'), idTag: 'vetprobe' }), 0x5e);
  check('the same seed fights the same fight', same(run(), run()));
}

// --- F) The bestiary reads it -----------------------------------------------------------------------
{
  const { defs } = bestiaryDefs({ levels: [12], classIds: ['warrior'], tier: 'geared', filter: 'imp' });
  const vets = defs.filter(d => d.id.startsWith('matchup_veteran_'));
  check('every monster in the bestiary sweep has a veteran duel', vets.length > 0 && vets.every(d => (d.pilot as { kind?: string }).kind === 'veteran'),
    `${vets.length} of ${defs.length} rows`);
}

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 2 : 0);
