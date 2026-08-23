// ---------------------------------------------------------------------------
// ONE-OFF PROBE — M-NEWS, THE NEWS MOVE (docs/design/show-dont-tell.md §3h):
// world news speaks on THE NOTICE FEED (world/bulletins.ts — screen-anchored,
// channel-muted), never as a floater over the hero's head. Pins:
//   A. World.notice lands a channelled entry on world.notices (the feed's own
//      push/prune laws; the default channel is 'world').
//   B. The kill-rule ctx carries `notice` (the event epilogues' seam).
//   C. THE MOVE CENSUS (source-lint): the world-news carriers no longer float
//      at the player's head — the moved lines are notice() calls with a
//      channel; the theater arrivals and the package epilogues likewise.
// Run: npx tsx balance/probe_newsmove.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { NOTICE_CFG } from '../src/world/bulletins';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
bootSimEngine();
seedGlobalRandom(0x9e3d5);
const w = makeSimWorld('warrior', 0x9e3d5);

// ------------------------------------------------- A. the feed
{
  const before = w.notices.length;
  w.notice('qa: the tide turns', '#ffffff', 14, 'events');
  w.notice('qa: a writ is posted');
  const a = w.notices[w.notices.length - 2], b = w.notices[w.notices.length - 1];
  check('A1 World.notice lands channelled entries on the feed (events; default world), stamped at the world clock',
    w.notices.length === before + 2 && a?.text === 'qa: the tide turns' && a.channel === 'events' && a.color === '#ffffff' && a.size === 14
    && b?.text === 'qa: a writ is posted' && b.channel === 'world' && Math.abs(b.bornAt - w.time) < 1e-9);
  for (let i = 0; i < NOTICE_CFG.keep + 4; i++) w.notice('qa: flood ' + i);
  check('A2 the feed keeps its own cap (NOTICE_CFG.keep — the oldest lines shift out)', w.notices.length === NOTICE_CFG.keep);
}

// ------------------------------------------------- B. the kill-rule seam (type-level + the world build)
{
  const src = readFileSync('src/engine/world.ts', 'utf8');
  check('B1 the world builds the kill ctx with `notice` beside `text`', /notice: \(msg, color, size, channel\) => this\.notice\(msg, color, size, channel\)/.test(src));
  const kh = readFileSync('src/engine/killHandlers.ts', 'utf8');
  check('B2 KillCtx declares notice(msg, color?, size?, channel?)', /notice\(msg: string, color\?: string, size\?: number, channel\?: string\): void;/.test(kh));
}

// ------------------------------------------------- C. the move census (source-lint)
{
  const src = readFileSync('src/engine/world.ts', 'utf8');
  const moved = (src.match(/this\.notice\(/g) ?? []).length;
  check('C1 the world-news carriers speak through notice() (≥ 80 calls moved off the head)', moved >= 80, `${moved}`);
  const headNews = ['The Necropolis crumbles behind you', 'hunters spring the ambush!', 'An undead tide pours into', 'word comes: ${def.name} is under siege',
    'The brigands drift on', 'Quest complete: ${q.offerLabel}!', 'The chart is inked'];
  const stillFloat = headNews.filter(s => { const i = src.indexOf(s); if (i < 0) return false; const head = src.lastIndexOf('this.', i); return src.slice(head, i).startsWith('this.text('); });
  check('C2 none of the sampled world-news lines float at the head any more', stillFloat.length === 0, stillFloat.join(' | '));
  const theater = ['src/data/theater.ts', 'src/data/pilgrimage.ts', 'src/data/warfront.ts'].map(f => readFileSync(f, 'utf8')).join('\n');
  check('C3 the theater arrivals ride the feed (no w.text at the head; w.notice with a channel)', !/w\.text\(vec\(w\.player\.pos/.test(theater) && (theater.match(/w\.notice\(/g) ?? []).length >= 8);
  const pk = ['deepwinter', 'longNight', 'wraithsail', 'verminfall', 'unsealing', 'crusade'].map(n => readFileSync(`src/packages/defs/${n}.ts`, 'utf8')).join('\n');
  check('C4 the event epilogues ride the feed (ctx.notice with a channel)', (pk.match(/ctx\.notice\(/g) ?? []).length >= 8 && /ctx\.notice\([^;]*'war'\)/.test(pk) && /ctx\.notice\([^;]*'events'\)/.test(pk));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
