// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SHIMMY LAW (engine/world.ts Dwell.rearmIfWilled +
// Seat.lastMovedAt; her ask 2026-09-11): a station dwell that fired stays
// spent while the seat merely STANDS there (closing the dialog alone never
// re-opens it), stays spent through an UNWILLED displacement (a gust, a
// shove — the body moved, the player did not), and RE-ARMS on a willed step
// taken in range, so the next still linger re-opens the dialog without
// walking out of range and back. The Font is the rig's station (Lastlight
// always raises one); every Dwell-class gate shares the law by construction.
//
//   npx tsx balance/probe_shimmy.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { START_ZONE } from '../src/data/zones';
import { SALVAGE_CFG } from '../src/data/essences';
import { TRANSITS, transitRing } from '../src/data/transit';
import { VENDORS } from '../src/data/vendors';

let pass = 0, fail = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
};

seedGlobalRandom(9111);
const w = makeSimWorld('warrior', 9111);
w.loadZone(START_ZONE);
const f = w.fonts[0];
check('A1 Lastlight raises the rig\'s station (a Font)', !!f);
if (f) {
  const poll = (dt: number): void => (w as unknown as { updateFont(dt: number): void }).updateFont(dt);
  const still = (): void => { w.player.push = null; w.player.casting = null; w.localSeat.lastActedAt = -100; };
  const linger = (): boolean => { w.fontDwellRequested = false; still(); poll(0); poll(SALVAGE_CFG.stationDwell + 0.1); return w.fontDwellRequested; };
  // The approach: from outside range (arms the station latch), onto the Font.
  w.player.pos = { x: f.pos.x + 500, y: f.pos.y }; poll(0);
  w.player.pos = { ...f.pos };
  check('A2 a deliberate linger at the Font asks for the dialog', linger());
  w.time += 1;
  check('A3 standing there, still, asks nothing more (closing the dialog alone never re-opens it)', !linger());
  // THE GUST: the body moves, the player did not — no stamp, no re-arm.
  w.time += 1;
  w.player.pos = { x: f.pos.x + 6, y: f.pos.y + 2 };
  check('A4 an unwilled displacement in range asks nothing (a gust is not a shimmy)', !linger());
  // THE SHIMMY: a willed step (moveActor — the input's own path) in range.
  w.time += 1;
  const before = w.localSeat.lastMovedAt;
  w.moveActor(w.player, 1, 0, 0.05);
  check('A5 a willed step stamps the seat\'s lastMovedAt', w.localSeat.lastMovedAt === w.time && w.localSeat.lastMovedAt > before);
  check('A6 the step alone does not fire (the linger must still end and build)', !w.fontDwellRequested);
  check('A7 …then a still linger re-opens the dialog without leaving range', linger());
  w.time += 1;
  check('A8 and the latch is spent again until the next willed step', !linger());
  // Out and back still works exactly as before.
  w.time += 1;
  w.player.pos = { x: f.pos.x + 500, y: f.pos.y }; poll(0);
  w.player.pos = { ...f.pos };
  check('A9 stepping out of range and back re-arms as it always did', linger());

  // === B) THE DWELL TELL (World.dwellTargetsView → dwellRingsView) ============
  // Every station/NPC in dwell range stands as a target with its linger's
  // fill, read off the SAME clock the gate fires on: empty on arrival, half
  // at half a linger, on the ONE ring feed, and empty again the moment the
  // latch fires (spent). Kinds are transit rows, every one its own.
  const target = (): { pos: { x: number; y: number }; frac: number; kind: string } | undefined =>
    w.dwellTargetsView().find(t => t.kind === 'station:font');
  w.time += 1;
  w.player.pos = { x: f.pos.x + 500, y: f.pos.y }; poll(0);
  check('B1 away from the Font, no Font target stands', target() === undefined);
  w.player.pos = { ...f.pos }; still(); w.fontDwellRequested = false; poll(0);
  const t0 = target();
  check('B2 at the Font the target stands ON the Font with an empty fill', !!t0 && t0.pos.x === f.pos.x && t0.pos.y === f.pos.y && t0.frac === 0);
  poll(SALVAGE_CFG.stationDwell * 0.5);
  const t1 = target();
  check('B3 half a linger in, the fill reads half', !!t1 && Math.abs(t1.frac - 0.5) < 0.05, `frac=${t1?.frac}`);
  check('B4 the fill rides the ONE ring feed', w.dwellRingsView().some(r => r.kind === 'station:font' && Math.abs(r.frac - 0.5) < 0.05));
  poll(SALVAGE_CFG.stationDwell);
  check('B5 the latch fired and the fill emptied while the target still stands',
    w.fontDwellRequested && target()?.frac === 0 && !w.dwellRingsView().some(r => r.kind === 'station:font'));
  const worldSrc = readFileSync(resolve(process.cwd(), 'src/engine/world.ts'), 'utf8');
  const kinds = [...new Set([...worldSrc.matchAll(/'((?:station|npc):[a-z_]+)'/g)].map(m => m[1]!))];
  check('B6 every station/npc kind the world names has its own transit row (never only the family fallback)',
    kinds.length >= 12 && kinds.every(k => !!TRANSITS[k]), kinds.filter(k => !TRANSITS[k]).join(','));
  check('B7 every counter\'s keeper role has its own npc row', VENDORS.every(v => !!TRANSITS[`npc:${v.npcRole}`]));
  check('B8 the family rows stand as the fallback for a new station or body', !!TRANSITS['station'] && !!TRANSITS['npc'] && transitRing('station:nope').radius === TRANSITS['station']!.ring.radius);
}

console.log(`\nprobe_shimmy: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
