// ---------------------------------------------------------------------------
// PROBE — THE PAIR STRIDE: the sight memo's pair key (World.losCached).
//
//   npx tsx balance/probe_loskey.ts
//
// The M6 plan (docs/design/shard-m6-plan.md §1.4) found the memo keyed an
// ordered pair as a.id * 1e6 + b.id, so two pairs shared one entry once
// actor ids passed a million, which a long-lived shard reaches (dormancy
// re-mints every woken native). The key is a.id * 2^26 + b.id now:
//   A  two pairs that collided under the old key hold two entries
//   B  a pair with an id at or past the stride is never memoized
//   C  a pair under a million ids keeps the pre-fix expiry offset (the
//      jitter hashes the old composite), so seeded runs stay byte-identical
// ---------------------------------------------------------------------------
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { HUB_ZONE } from '../src/data/zones';
import { LOS_PAIR_STRIDE } from '../src/engine/world';
import { LOS_CFG } from '../src/engine/los';
import type { Actor } from '../src/engine/actor';

let pass = 0, fail = 0;
function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (ok) pass++; else fail++;
}

bootSimEngine();
seedGlobalRandom(0x105e);
const w = makeSimWorld('warrior', 0x105e);
w.loadZone(HUB_ZONE);
const memo = (w as unknown as { losMemo: Map<number, { ok: boolean; until: number }> }).losMemo;
const body = (id: number, x: number, y: number): Actor =>
  ({ id, pos: { x, y }, tier: 0 } as unknown as Actor);
const p = w.player.pos;

// ------------------------------------------------ A. the old collision
{
  memo.clear();
  const a1 = body(1, p.x, p.y), b1 = body(1_000_005, p.x + 40, p.y);
  const a2 = body(2, p.x, p.y + 20), b2 = body(5, p.x + 60, p.y + 20);
  check('A: the old composite collided', 1 * 1_000_000 + 1_000_005 === 2 * 1_000_000 + 5);
  const k1 = 1 * LOS_PAIR_STRIDE + 1_000_005, k2 = 2 * LOS_PAIR_STRIDE + 5;
  check('A: the new keys differ', k1 !== k2 && Number.isSafeInteger(k1) && Number.isSafeInteger(k2));
  const r1 = w.losCached(a1, b1);
  check('A: the first pair takes its own entry', memo.size === 1 && memo.has(k1) && !memo.has(2_000_005), `size ${memo.size}`);
  memo.set(k1, { ok: !r1, until: Infinity }); // poison the first pair: a shared entry would answer the second with it
  const fresh2 = w.lineOfSight(a2.pos, b2.pos, a2.tier, b2.tier);
  const r2 = w.losCached(a2, b2);
  check('A: the second pair marches its own ray', r2 === fresh2 && memo.size === 2 && memo.has(k2), `size ${memo.size}`);
  check('A: the memo still answers by key', w.losCached(a1, b1) === !r1);
}

// ------------------------------------------------ B. beyond the stride
{
  memo.clear();
  const big = body(LOS_PAIR_STRIDE + 7, p.x, p.y), near = body(3, p.x + 40, p.y);
  const r = w.losCached(big, near);
  check('B: an id at or past the stride is never memoized', memo.size === 0 && r === w.lineOfSight(big.pos, near.pos, 0, 0), `size ${memo.size}`);
  const r2 = w.losCached(near, big);
  check('B: either side of the pair', memo.size === 0 && r2 === w.lineOfSight(near.pos, big.pos, 0, 0));
}

// ------------------------------------------------ C. the expiry offset
{
  memo.clear();
  const a = body(421, p.x, p.y), b = body(77_013, p.x + 50, p.y + 10);
  w.losCached(a, b);
  const entry = memo.get(421 * LOS_PAIR_STRIDE + 77_013);
  const j = LOS_CFG.memoJitter, legacy = 421 * 1_000_000 + 77_013;
  const ttl = j > 0 ? LOS_CFG.memoTtl * (1 - j / 2 + j * ((Math.imul(legacy, 0x9E3779B1) >>> 16) / 65536)) : LOS_CFG.memoTtl;
  check('C: the expiry offset hashes the old composite', !!entry && Math.abs(entry.until - (w.time + ttl)) < 1e-9,
    entry ? `until ${entry.until.toFixed(6)} vs ${(w.time + ttl).toFixed(6)}` : 'no entry');
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} pass / ${fail} fail`);
if (fail > 0) process.exit(2);
