// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CLEAN WAKE (the stuck-stats bug). Two raw status
// removals bypassed the canonical splice + 'status:*' source-cleanup pair:
//   (1) performModeRespawn's sanctuary wake wiped `statuses.length = 0`
//       raw, so every MODDED status worn at death (chill's slow, shock's
//       damageTaken, curses) stayed stamped on the seat's sheet FOREVER —
//       invisibly, no icon — until the same status happened to be
//       re-applied and expire cleanly on its own.
//   (2) kill()'s death-rupture loop spliced blown kegs without the guarded
//       removeSource its sibling sites carry (the DOOM trio) — latent for
//       any body that survives its own kill() path (revived seats,
//       re-fielded persistents).
// Pins: the wake sheds ICON AND NUMBERS (sheet reads return to baseline,
// multi-status), the wake is silent (no rupture pops — the dispel lane's
// covenant), and a rupture-armed modded status killed off a body leaves
// the corpse's sheet clean.
// Run: npx tsx balance/probe_cleanwake.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

bootSimEngine();
seedGlobalRandom(0xc1ea);

// ---------------------------------------------- A. the sanctuary wake sheds
{
  const w: World = makeSimWorld('warrior', 0xc1ea);
  const hero = w.player;
  const baseMove = hero.sheet.get('moveSpeed');
  const baseTaken = hero.sheet.get('damageTaken');
  hero.applyStatus('chill', 0, 1, 'probe');
  hero.applyStatus('shock', 0, 1, 'probe');
  check('A: chill + shock land on the sheet (the wound is real)',
    hero.sheet.get('moveSpeed') < baseMove && hero.sheet.get('damageTaken') > baseTaken,
    `move ${hero.sheet.get('moveSpeed').toFixed(1)} < ${baseMove.toFixed(1)}`);

  // Die wearing the debuffs, wake in the sanctuary (the mode-respawn path).
  hero.dead = true;
  (w as unknown as { performModeRespawn(): void }).performModeRespawn();
  check('A: the wake stands the seat back up', !hero.dead && !hero.downed);
  check('A: the wake sheds the ICONS (statuses list empty)', hero.statuses.length === 0);
  check('A: THE BUG, DEAD — the wake sheds the NUMBERS too (sheet back to baseline)',
    near(hero.sheet.get('moveSpeed'), baseMove) && near(hero.sheet.get('damageTaken'), baseTaken),
    `move ${hero.sheet.get('moveSpeed').toFixed(1)} vs base ${baseMove.toFixed(1)}, `
    + `taken ${hero.sheet.get('damageTaken').toFixed(2)} vs base ${baseTaken.toFixed(2)}`);

  // Re-apply/expire round-trip stays clean after the wake (no double-remove
  // scars: the canonical lane is idempotent).
  hero.applyStatus('chill', 0, 1, 'probe');
  hero.endStatus('chill');
  check('A: a post-wake apply/dispel round-trip still lands and lifts cleanly',
    near(hero.sheet.get('moveSpeed'), baseMove));
}

// ------------------------------------- B. the wake is SILENT (no keg pops)
{
  const w: World = makeSimWorld('warrior', 0xc1eb);
  const hero = w.player;
  // An armed keg on the hero at death: the wake must NOT detonate it
  // (endStatus is the deliberate dispel lane — ruptures belong to real
  // expiries and to kill()). A pop would land in expiredStatuses/bursts.
  hero.applyStatus('chill', 0, 1, 'probe', { rupture: 500, ruptureType: 'cold' });
  hero.dead = true;
  (w as unknown as { performModeRespawn(): void }).performModeRespawn();
  check('B: the wake pops no kegs (no expiry side-effects on the dispel lane)',
    hero.statuses.length === 0 && hero.expiredStatuses.length === 0);
}

// --------------------------- C. the death-rupture splice cleans its source
{
  const w: World = makeSimWorld('warrior', 0xc1ec);
  const m = w.createMonster('zombie', 5, 'enemy');
  w.actors.push(m);
  const baseMove = m.sheet.get('moveSpeed');
  m.applyStatus('chill', 0, 1, 'probe', { rupture: 40, ruptureType: 'cold' });
  check('C: the rupture-armed chill binds the body', m.sheet.get('moveSpeed') < baseMove);
  w.kill(m, false);
  check('C: death blows the keg off the list', m.dead && !m.statuses.some(s => s.id === 'chill'));
  check('C: …and the corpse\'s sheet is clean (the DOOM trio everywhere)',
    near(m.sheet.get('moveSpeed'), baseMove),
    `move ${m.sheet.get('moveSpeed').toFixed(1)} vs base ${baseMove.toFixed(1)}`);
}

// ---------------- D. THE FIELD REPORT (die in the mud, wake in Lastlight)
{
  // The user's observed instance, verbatim: an Immortal death taken while
  // standing in MUD (regions.ts standStatus 'mired' — re-applied per tick
  // while stood in, −40% MORE move speed) woke in Lastlight with the slow
  // LOCKED ON as if it were the new base — no icon, just the numbers.
  const w: World = makeSimWorld('warrior', 0xc1ed);
  const hero = w.player;
  const base = hero.sheet.get('moveSpeed');
  hero.applyStatus('mired', 0, 1, 'the mud');
  const inMud = hero.sheet.get('moveSpeed');
  check('D: the mud binds the stride while stood in',
    inMud < base, `${inMud.toFixed(0)} down from ${base.toFixed(0)}`);
  hero.dead = true;
  (w as unknown as { performModeRespawn(): void }).performModeRespawn();
  check('D: THE FIELD REPORT, DEAD — the sanctuary wake frees the stride whole',
    near(hero.sheet.get('moveSpeed'), base) && !hero.statuses.some(s => s.id === 'mired'),
    `move ${hero.sheet.get('moveSpeed').toFixed(0)} vs base ${base.toFixed(0)}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
