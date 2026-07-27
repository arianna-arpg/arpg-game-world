// CO-OP SEED THREAD PROBE — a joining client's world is the HOST's world.
//
// A co-op client used to mint its render shell from a locally rolled seed
// (`buildManifest(account, rollSeed())` in startAsClient), while `manifest.seed`
// is exactly what drives the SHARED map: randomizeStarterWeb deals the wandering
// hub and its frontiers off it, and every later mint derives from
// `manifest.seed ^ …`. Host and client therefore disagreed about the world from
// frame one — the shell's zone graph, gate seeds and shelves all describing a
// different run than the authority whose snapshots it renders. THE SEED THREAD
// (src/net/transport.ts) carries the host's seed on both seating roads instead:
// the `welcome` (first join) and every `newRun` (a re-seat into the host's NEXT
// run, which has a freshly rolled manifest — hence its own seed rather than the
// welcome's).
//
// The WebRTC handlers themselves are not headless-testable (no RTCPeerConnection
// here), so this pins the two halves that ARE: the pure wire normalizer, and the
// world-level consequence the whole thread exists to guarantee.
//
//  A · WIRESEED, the untrusted-wire normalizer: a finite number folds to uint32,
//      seed 0 is KEPT (the falsy trap), and everything JSON can smuggle in —
//      missing, null, NaN, ±Infinity, string, object, boolean — takes the
//      caller's fallback instead of becoming a silent `NaN >>> 0` === 0 that
//      every mismatched client would share.
//  B · THE THREAD end to end: same seed → same starter web (determinism); the
//      seed genuinely DRIVES that web (so the pin is not vacuous); a client
//      built from the host's seed matches the host across the sample, while one
//      built from its own roll does not (the defect, witnessed); and a newRun
//      re-seat lands on the SECOND run's map, never the welcome's.
//
// Exit 1 on any failure.
//   npx tsx balance/probe_coopseed.ts

import { bootSimEngine } from '../src/sim/arena';
import { makeAccount } from '../src/meta/account';
import { buildManifest } from '../src/packages/manifest';
import { World } from '../src/engine/world';
import { START_ZONE, HUB_ZONE, type ZoneDef } from '../src/data/zones';
import { wireSeed } from '../src/net/transport';

bootSimEngine();

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// ---------------------------------------------------------------------------
// A · wireSeed — the one place a seed crosses from untrusted JSON into a manifest
// ---------------------------------------------------------------------------
console.log('\n== A · WIRESEED (the untrusted wire value) ==');

const FB = 0xfa11bac2;                     // a distinctive fallback ("fall back")
check('A1 a finite seed passes through', wireSeed(12345, FB) === 12345);
// The falsy trap: 0 is a perfectly good seed and must NOT read as "missing".
check('A2 seed 0 is KEPT, not read as missing', wireSeed(0, FB) === 0, `got ${wireSeed(0, FB)}`);

// Everything JSON can hand us in place of a number. A host on an older build
// sends no seed at all (undefined); a hostile/garbled peer can send anything.
const JUNK: Array<[string, unknown]> = [
  ['undefined', undefined], ['null', null], ['NaN', NaN],
  ['Infinity', Infinity], ['-Infinity', -Infinity],
  ['string', '12345'], ['object', { seed: 1 }], ['array', [1]],
  ['boolean', true], ['bigint-ish string', '0x1f'],
];
const junkBad = JUNK.filter(([, v]) => wireSeed(v, FB) !== FB).map(([n]) => n);
check('A3 every non-finite/wrong-typed wire value takes the fallback', junkBad.length === 0, junkBad.join(', '));
// The real hazard this closes: NOT the wrong map (that is the status quo the
// fallback restores) but a shared NaN>>>0 === 0 across every mismatched client.
const junkZero = JUNK.filter(([, v]) => wireSeed(v, FB) === 0).map(([n]) => n);
check('A4 no wire junk ever collapses to seed 0', junkZero.length === 0, junkZero.join(', '));
check('A5 nothing ever returns NaN', JUNK.every(([, v]) => Number.isFinite(wireSeed(v, FB))));

// The uint32 fold — the same one buildManifest applies, so a threaded seed and a
// locally built one agree on the value the world is actually grown from.
check('A6 negatives fold to uint32', wireSeed(-1, FB) === 0xffffffff, `got ${wireSeed(-1, FB)}`);
check('A7 floats truncate to uint32', wireSeed(7.9, FB) === 7, `got ${wireSeed(7.9, FB)}`);
check('A8 >2^32 wraps to uint32', wireSeed(0x1_0000_0005, FB) === 5, `got ${wireSeed(0x100000005, FB)}`);
check('A9 the fallback is folded too', wireSeed(undefined, -2) === 0xfffffffe, `got ${wireSeed(undefined, -2)}`);

// ---------------------------------------------------------------------------
// B · the world-level consequence: whose map does a client actually get?
// ---------------------------------------------------------------------------
console.log('\n== B · THE SEED THREAD (host map vs client map) ==');

/** The starter web a run grows: where the wandering hub landed and every exit
 *  randomizeStarterWeb deals off manifest.seed. This IS the shared-map identity
 *  a client must agree with — the World constructor grows it, no player needed. */
function starterWeb(seed: number): string {
  const w = new World(makeAccount(), Object.freeze(buildManifest(makeAccount(), seed)));
  const zm = (w as unknown as { zoneMap: Record<string, ZoneDef> }).zoneMap;
  const exits = (z: ZoneDef | undefined): string =>
    (z?.exits ?? []).map(e => `${e.side}>${e.to}${e.tileset ? ':' + e.tileset : ''}`).join(',');
  const hub = zm[HUB_ZONE];
  return `hub@${hub?.map.x},${hub?.map.y}|town[${exits(zm[START_ZONE])}]|hub[${exits(hub)}]`;
}

/** What startAsClient does with a seat's seed, exactly: normalize the wire value
 *  (falling back to the client's OWN roll) and grow a world from the result. */
const clientWeb = (wireValue: unknown, ownRoll: number): string => starterWeb(wireSeed(wireValue, ownRoll));

// Fixed seeds, so every verdict below is deterministic — never a sampled rate.
const HOST_SEEDS = [1, 2, 7, 1337, 0xbeef, 0x5eed, 99991, 0xc0ffee];
const CLIENT_ROLL = 0x11111111;            // the local roll the old code used

check('B1 same seed grows the same starter web twice',
  HOST_SEEDS.every(s => starterWeb(s) === starterWeb(s)));

// Guards against a vacuous probe: if the seed did NOT move the web, B3 would
// pass no matter what startAsClient did with it.
const distinct = new Set(HOST_SEEDS.map(starterWeb));
check('B2 the seed genuinely DRIVES the starter web', distinct.size >= 2,
  `${distinct.size} distinct webs over ${HOST_SEEDS.length} seeds`);

// THE FIX: threaded through wireSeed, a client lands on the host's map. Every
// seed, not a majority — this is a derivation, not a coincidence.
const threadedBad = HOST_SEEDS.filter(s => clientWeb(s, CLIENT_ROLL) !== starterWeb(s));
check('B3 a client seeded from the HOST matches the host, every seed',
  threadedBad.length === 0, threadedBad.map(s => '0x' + s.toString(16)).join(', '));

// THE DEFECT, witnessed: the old path ignored the host's seed entirely. With
// only four hub directions a single pair could agree by luck, so the witness is
// the whole fixed sample — at least one host must disagree with the local roll.
const ownRollMismatches = HOST_SEEDS.filter(s => starterWeb(CLIENT_ROLL) !== starterWeb(s));
check('B4 a client seeded from its OWN roll lands on a different map',
  ownRollMismatches.length > 0,
  `${ownRollMismatches.length}/${HOST_SEEDS.length} hosts disagree with the local roll`);

// The composition main.ts performs: the manifest a client freezes carries the
// HOST's seed, so every later `manifest.seed ^ …` derivation agrees too.
const manifestBad = HOST_SEEDS.filter(s =>
  buildManifest(makeAccount(), wireSeed(s, CLIENT_ROLL)).seed !== (s >>> 0));
check('B5 the client manifest carries the host seed (all mint derivations follow)',
  manifestBad.length === 0, manifestBad.join(', '));

// THE NEWRUN ROAD — the decision the arm records: `newRun` carries its OWN seed
// rather than the client re-using the welcome's, because the host's next run has
// a freshly rolled manifest. Re-seating must land on run TWO's map.
const RUN1 = HOST_SEEDS[0];
const RUN2 = HOST_SEEDS.find(s => starterWeb(s) !== starterWeb(RUN1))!;
check('B6 a newRun re-seat lands on the NEW run\'s map, not the welcome\'s',
  clientWeb(RUN2, CLIENT_ROLL) === starterWeb(RUN2) && starterWeb(RUN2) !== starterWeb(RUN1),
  `run1=0x${RUN1.toString(16)} run2=0x${RUN2.toString(16)}`);

// A host on an older build sends no seed: the client falls back to its OWN roll
// — the pre-thread status quo (a map that won't agree) rather than a silent
// collapse to seed 0 shared by every mismatched client. Only the fallback ROAD
// is asserted here; that it is never 0 is A4's job, pinned at the value where it
// is exact. (Comparing two starter webs could never say it: the hub has four
// directions, so distinct seeds agree by luck about a quarter of the time.)
check('B7 a seedless welcome falls back to the client\'s own roll',
  clientWeb(undefined, CLIENT_ROLL) === starterWeb(CLIENT_ROLL));

console.log(`\n${failed ? `FAILED (${failed})` : 'ALL PASS'}`);
process.exit(failed ? 1 : 0);
