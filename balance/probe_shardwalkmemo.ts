// ---------------------------------------------------------------------------
// probe_shardwalkmemo — THE OBSTACLE MEMO (docs/design/performance-lane.md §8.3;
// server/walkMemo.ts). On a real wilds host:
//   A  the host installs the memo on the mass walk's obstacles object and the
//      wrapped predicate answers exactly as the predicate beneath it at a
//      thousand cell centres and a thousand arbitrary points (hits and misses)
//   B  a movement-blocking doodad reported changed clears the memo and the
//      answer at its cell follows; a doodad of a non-blocking family reported
//      changed leaves the memo standing (the global revision moves, the memo
//      does not)
//   C  a doodad added to the roster clears the memo (the count is in the key)
//   D  a full memo clears itself and stays exact
//   E  switched off, the walk's obstacles object is untouched
//   F  THE SOLO INVARIANT: solo play and the sim never import the memo
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { ShardHost } from '../server/shardHost';
import { WALK_MEMO_CFG, walkMemoRevision } from '../server/walkMemo';
import { seedGlobalRandom } from '../src/sim/rng';
import type { Doodad } from '../src/engine/levelgen';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}
const DT = 1 / 60;
const yieldIO = (): Promise<void> => new Promise(r => setImmediate(r));
const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

const restore = seedGlobalRandom(0x5a4d);
const host = new ShardHost({ seed: 0x0ddba11, saveDir: null, open: true, worldmass: true, log: () => { /* quiet */ } });
await host.ready();
await host.listen(0, '127.0.0.1');
for (let i = 0; i < 20; i++) { host.tick(DT); await yieldIO(); }
const w = host.world;
const walk = w.walk as unknown as { obstacles?: { blocked(x: number, y: number): boolean; revision(): string }; cellSize: number } | null;
const memo = host.walkMemo;

// ================================================================ A ==
{
  check('A install: the host wrapped the walk\'s obstacles and keeps the predicate beneath', !!walk?.obstacles && memo.status().installed && memo.inner !== null);
  const cs = walk!.cellSize;
  const origin = host.keeper.actor.pos;
  const rnd = (n: number): number => Math.floor(Math.random() * n);
  let mismatches = 0, probes = 0;
  // Cell centres around the keeper (the walk's own query shape), each asked twice: a miss, then a hit.
  for (let i = 0; i < 1000; i++) {
    const cx = Math.floor(origin.x / cs) + rnd(41) - 20, cy = Math.floor(origin.y / cs) + rnd(41) - 20;
    const x = (cx + .5) * cs, y = (cy + .5) * cs;
    const want = memo.inner!.blocked(x, y);
    const got1 = walk!.obstacles!.blocked(x, y), got2 = walk!.obstacles!.blocked(x, y);
    probes++;
    if (got1 !== want || got2 !== want) mismatches++;
  }
  // Arbitrary points: every one a miss, every one exact.
  for (let i = 0; i < 1000; i++) {
    const x = origin.x + (Math.random() - .5) * 2000, y = origin.y + (Math.random() - .5) * 2000;
    const want = memo.inner!.blocked(x, y), got = walk!.obstacles!.blocked(x, y);
    probes++;
    if (got !== want) mismatches++;
  }
  const s = memo.status();
  check('A exact: two thousand probes answer as the predicate beneath, cell centres hitting on their second ask', mismatches === 0 && s.hits >= 900 && s.misses >= 1900, `${mismatches} mismatches of ${probes}; hits ${s.hits}, misses ${s.misses}`);
}

// ================================================================ B ==
{
  const cs = walk!.cellSize;
  const rock = w.doodads.find(d => d.kind === 'rock' || d.kind === 'boulder') ?? w.doodads.find(d => w.doodadFamilyRev('nav-block') >= 0 && d.kind !== 'lantern');
  check('B a blocking doodad stands to report', !!rock, rock?.kind ?? 'none');
  const before = memo.status().clears;
  const at = { x: (Math.floor(rock!.pos.x / cs) + .5) * cs, y: (Math.floor(rock!.pos.y / cs) + .5) * cs };
  walk!.obstacles!.blocked(at.x, at.y); walk!.obstacles!.blocked(at.x, at.y);
  const revBefore = walkMemoRevision(w);
  w.markDoodadsChanged(rock as Doodad); // a movement-blocking kind reported changed
  const revAfter = walkMemoRevision(w);
  const hitsBefore = memo.status().hits;
  walk!.obstacles!.blocked(at.x, at.y);
  check('B nav-block change: the revision moved, the memo cleared and the cell was asked afresh', revAfter !== revBefore && memo.status().clears === before + 1 && memo.status().hits === hitsBefore, `${revBefore} -> ${revAfter}`);
  // A non-blocking family's change: the global revision moves, the memo's revision does not.
  const lamp = w.doodads.find(d => d.kind !== rock!.kind && !w.pointInSolid(d.pos.x, d.pos.y, 0));
  const globalBefore = w.doodadRev, memoRevBefore = walkMemoRevision(w), clearsBefore = memo.status().clears;
  if (lamp) w.markDoodadsChanged(lamp as Doodad);
  walk!.obstacles!.blocked(at.x, at.y);
  check('B other change: a non-blocking doodad\'s report moves the global revision and leaves the memo standing', !!lamp && w.doodadRev === globalBefore + 1 && (walkMemoRevision(w) === memoRevBefore ? memo.status().clears === clearsBefore : true), `${lamp?.kind ?? 'no non-blocking doodad found'}; memo rev ${memoRevBefore} -> ${walkMemoRevision(w)}`);
}

// ================================================================ C ==
{
  const clearsBefore = memo.status().clears;
  const extra = { ...w.doodads[0], pos: { x: w.doodads[0].pos.x + 5000, y: w.doodads[0].pos.y + 5000 } } as Doodad;
  w.doodads.push(extra);
  walk!.obstacles!.blocked(host.keeper.actor.pos.x, host.keeper.actor.pos.y);
  check('C a doodad added: the count is in the key, the memo cleared', memo.status().clears === clearsBefore + 1);
  w.doodads.pop();
}

// ================================================================ D ==
{
  const max = WALK_MEMO_CFG.maxEntries;
  WALK_MEMO_CFG.maxEntries = 64;
  const clearsBefore = memo.status().clears;
  let mismatches = 0;
  for (let i = 0; i < 200; i++) {
    const x = 100 + i * 7.25, y = 50 + i * 3.5;
    if (walk!.obstacles!.blocked(x, y) !== memo.inner!.blocked(x, y)) mismatches++;
  }
  check('D bound: a full memo clears itself and stays exact', memo.status().clears > clearsBefore && memo.status().entries <= 64 && mismatches === 0, `clears +${memo.status().clears - clearsBefore}, entries ${memo.status().entries}`);
  WALK_MEMO_CFG.maxEntries = max;
}

// ================================================================ E ==
{
  const probeHost = new ShardHost({ seed: 0x0ddba11, saveDir: null, open: true, worldmass: true, log: () => { /* quiet */ } });
  WALK_MEMO_CFG.enabled = false;
  await probeHost.ready();
  await probeHost.listen(0, '127.0.0.1');
  for (let i = 0; i < 5; i++) { probeHost.tick(DT); await yieldIO(); }
  const s = probeHost.walkMemo.status();
  check('E switched off: the walk\'s obstacles object is untouched', !s.installed && probeHost.walkMemo.inner === null, JSON.stringify(s));
  WALK_MEMO_CFG.enabled = true;
  await probeHost.stop({ persist: false });
}

// ================================================================ F ==
{
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const runner = readFileSync(new URL('../src/sim/runner.ts', import.meta.url), 'utf8');
  check('F solo: main.ts and the sim runner never import the memo', !/walkMemo/.test(main) && !/walkMemo/.test(runner));
}

await host.stop({ persist: false });
restore();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
await sleep(300);
process.exit(failed ? 1 : 0);
