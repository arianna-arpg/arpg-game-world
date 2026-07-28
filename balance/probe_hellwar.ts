// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WAR BELOW's ROLLED TRUCE, the one shipped lever of
// packages/overlays/hellWar.ts that nothing automated ever exercised (it rolls
// at 35%, so a manual boot sees it one run in three). Pins:
//   - the CONFIG CENSUS: the shipped dials (chance 0.35, breakAfter [340,720])
//     are asserted here, so a silent retune is caught rather than absorbed,
//   - IGNITION by SEED SEARCH — the roll is a pure function of the overlay's
//     own Rng, so the probe finds a seed that lands it instead of touching the
//     shipped def (and measures the roll RATE over a fixed seed sweep: the
//     dial must actually drive the die),
//   - PUBLICATION: the truced pair reads 'ally' and every other seated pair
//     'hostile' through factionStance — the same layer setRunStances writes,
//     never the overlay's private field — and the pair the layer names is the
//     pair the snapshot names,
//   - THE FLOOR (the negative control that makes the shatter falsifiable): a
//     probe-owned stance layer BENEATH the war's says 'ally' for that pair, so
//     the static hostile table can never stand in for a republish. Post-shatter
//     'hostile' can only have come from applyStances() running again,
//   - THE SHATTER: the pact holds to breakAt, then flips the pair back to
//     hostile, clears peek().truce, and pushes the bulletin — on the beat,
//   - the DURABLE pledge: restore() republishes the pact into the layer,
//   - THE GUARD: a one-seat war never rolls a truce (the >= 2 short-circuit).
// Run: npx tsx balance/probe_hellwar.ts
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { factionStance, setRunStances, type FactionStance } from '../src/data/monsters';
import { HellWarField, WAR_CFG } from '../src/packages/overlays/hellWar';
import { allLords } from '../src/packages/lords';
import '../src/packages/defs/underworldWar'; // registers the lord pool the seats draw from
import type { ZoneDef } from '../src/data/zones';
import type { OverlayView } from '../src/world/overlay';
import type { PackageGate } from '../src/packages/types';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x4e11);

const GATE: PackageGate = { active: true, share: 1, pressure: 1, ignitionMul: 1, severityMul: 1, concurrencyMul: 1 };

const mkZone = (id: string, x: number, y: number): ZoneDef => ({
  id, name: id, map: { x, y }, exits: [], objective: { kind: 'clear' }, level: 20,
  dimension: 'underworld',
} as unknown as ZoneDef);

const mkView = (nodes: ZoneDef[], currentZoneId: string): OverlayView => ({
  nodes, byId: Object.fromEntries(nodes.map(n => [n.id, n])), allNodes: nodes,
  terrain: () => 'land', currentZoneId, time: 0, census: {}, charLevel: 30,
  gates: new Map(), visited: new Set(nodes.map(n => n.id)), surveyed: new Set<string>(),
});

const mkWar = (seed: number): HellWarField =>
  new HellWarField({ seed, gate: () => GATE, biomeSeed: 1, dimension: 'underworld' });

type TruceSnap = { a: number; b: number; breakAt: number } | null;
const snapTruce = (f: HellWarField): TruceSnap =>
  (f.snapshot() as { truce: TruceSnap }).truce;

/** Every seated pair's stance READ THROUGH THE PUBLISHED LAYER (factionStance
 *  → RUN_STANCE_LAYERS), never the overlay's own bookkeeping. */
const publishedPairs = (f: HellWarField): { i: number; j: number; stance: FactionStance }[] => {
  const lords = f.seatedLords();
  const out: { i: number; j: number; stance: FactionStance }[] = [];
  for (let i = 0; i < lords.length; i++) {
    for (let j = i + 1; j < lords.length; j++) {
      const a = lords[i], b = lords[j];
      if (!a || !b) continue;
      out.push({ i, j, stance: factionStance(a.faction, b.faction) });
    }
  }
  return out;
};

const factionAt = (f: HellWarField, seat: number): string => f.seatedLords()[seat]?.faction ?? '';

// --- A) THE CONFIG CENSUS (a silent retune must not pass unnoticed) ----------
const SHIPPED_SEATS = WAR_CFG.seats;
{
  check('A census: the truce still rolls at the shipped 35%',
    WAR_CFG.truce.chance === 0.35, `chance ${WAR_CFG.truce.chance}`);
  check('A census: the pact still shatters inside the shipped window [340,720]',
    WAR_CFG.truce.breakAfter[0] === 340 && WAR_CFG.truce.breakAfter[1] === 720,
    `[${WAR_CFG.truce.breakAfter.join(',')}]`);
  check('A census: the run seats enough lords for a pact to be possible',
    WAR_CFG.seats >= 2 && allLords().length >= 2,
    `${WAR_CFG.seats} seats from a pool of ${allLords().length}`);
}

// --- B) IGNITION BY SEED SEARCH (the shipped def is never touched) -----------
// The roll is a pure function of the overlay's Rng, so a seed that lands it is
// found, not forced. The same sweep measures the RATE: the dial must be the
// thing driving the die (a chance silently pinned to 0 or 1 shows up here).
let truceSeed = -1;
{
  let hits = 0;
  const SWEEP = 400;
  for (let seed = 1; seed <= SWEEP; seed++) {
    const rolled = mkWar(seed).peek().truce;
    if (rolled) { hits++; if (truceSeed < 0) truceSeed = seed; }
  }
  const rate = hits / SWEEP;
  check('B ignition: a truce-rolling seed EXISTS (the lever is reachable)',
    truceSeed > 0, `first at seed ${truceSeed}`);
  check('B the die: the roll rate over a fixed 400-seed sweep tracks the dial',
    rate > WAR_CFG.truce.chance - 0.1 && rate < WAR_CFG.truce.chance + 0.1,
    `${(rate * 100).toFixed(1)}% vs ${(WAR_CFG.truce.chance * 100).toFixed(0)}%`);
}
if (truceSeed < 0) {
  console.log('\nno truce-rolling seed found — the rest of the rig cannot run');
  console.log(`\n${failed || 1} CHECK(S) FAILED`);
  process.exit(1);
}

// =============================================================================
// THE LIVE PACT — one war, seeded to roll its truce, run to the shatter.
// (Constructed LAST of the sweep so IT owns the 'underworld_war' stance layer:
// every construction republishes the namespace wholesale.)
// =============================================================================
const zones = [
  mkZone('hellgate', 0, 0), mkZone('h_a', 190, 40), mkZone('h_b', -160, 120),
  mkZone('h_c', 90, -210), mkZone('h_d', 300, 260),
];
const war = mkWar(truceSeed);
const view = mkView(zones, 'hellgate');

/** The world's own bulletin source SPLICES the queue each tick; do the same so
 *  the 8-line cap can never evict the line we came to read. */
const heard: string[] = [];
const pump = (): void => { heard.push(...war.bulletins.splice(0).map(b => b.text)); };
let clock = 0;
const tick = (): void => { war.update(0.5, view); clock += 0.5; pump(); };

// --- C) THE PUBLISHED PACT ---------------------------------------------------
const truce = snapTruce(war);
let allyPair: { i: number; j: number } | null = null;
{
  check('C ignition: peek() reports a standing truce over >= 2 seats',
    war.peek().truce === true && war.peek().seats.length >= 2,
    `${war.peek().seats.length} seats, truce=${war.peek().truce}`);
  const pairs = publishedPairs(war);
  const allies = pairs.filter(p => p.stance === 'ally');
  const hostiles = pairs.filter(p => p.stance === 'hostile');
  allyPair = allies[0] ?? null;
  check('C publication: EXACTLY ONE seated pair reads ally through the stance layer',
    allies.length === 1, `${allies.length} ally / ${hostiles.length} hostile of ${pairs.length} pairs`);
  check('C publication: every other seated pair reads hostile (the eternal struggle)',
    pairs.length >= 2 && hostiles.length === pairs.length - 1);
  // The banked pair is UNORDERED (b is drawn to skip a, so b < a happens) —
  // applyStances/isTruced both test it order-insensitively, so the agreement
  // check compares seat SETS, not tuples.
  check('C agreement: the pair the LAYER names is the pair the overlay banked',
    !!truce && !!allyPair && Math.min(truce.a, truce.b) === allyPair.i
    && Math.max(truce.a, truce.b) === allyPair.j,
    truce && allyPair ? `snapshot {${truce.a},${truce.b}} vs layer {${allyPair.i},${allyPair.j}}` : 'no truce');
  check('C the window: breakAt was rolled inside the shipped window',
    !!truce && truce.breakAt >= WAR_CFG.truce.breakAfter[0] && truce.breakAt <= WAR_CFG.truce.breakAfter[1],
    truce ? `breakAt ${truce.breakAt}s` : 'null');
}
if (!truce || !allyPair) {
  console.log('\nthe pact did not publish — the shatter cannot be measured');
  console.log(`\n${failed || 1} CHECK(S) FAILED`);
  process.exit(1);
}
const PACT_A = factionAt(war, truce.a), PACT_B = factionAt(war, truce.b);
const preSnap = JSON.parse(JSON.stringify(war.snapshot())) as unknown;

// --- D) THE ANCHOR + the pact bulletin ---------------------------------------
{
  tick(); // the field fixes its geometry the first time hell exists
  check('D anchor: the thrones take their seats and the war announces itself',
    war.peek().anchored === true && heard.some(t => /thrones/i.test(t)));
  check('D anchor: the rolled pact is announced too (an uneasy one)',
    heard.some(t => /uneasy pact/i.test(t)),
    heard.filter(t => /pact/i.test(t)).join(' | ') || 'no pact line');
}

// --- E) THE FLOOR — the negative control that makes the shatter falsifiable --
// The static RELATIONS table already says the host factions are hostile, so a
// post-shatter 'hostile' read would pass even if applyStances() never ran
// again. A probe-owned layer BENEATH the war's says 'ally' for that pair,
// shadowing the static table: after this, 'hostile' can ONLY come from the
// war republishing. The control pair proves the floor really is beneath.
{
  const ctl = publishedPairs(war).find(p => p.stance === 'hostile');
  const ca = ctl ? factionAt(war, ctl.i) : '', cb = ctl ? factionAt(war, ctl.j) : '';
  setRunStances('probe_hellwar_floor', {
    [`${PACT_A}|${PACT_B}`]: 'ally',
    ...(ctl ? { [`${ca}|${cb}`]: 'ally' } : {}),
  });
  check('E the floor: the war\'s layer OUTRANKS it (a hostile control pair still reads hostile)',
    !!ctl && factionStance(ca, cb) === 'hostile',
    ctl ? `${ca}|${cb} → ${factionStance(ca, cb)}` : 'no hostile pair to control with');
  check('E the floor: the truced pair still reads ally (the pact stands)',
    factionStance(PACT_A, PACT_B) === 'ally');
}

// --- F) THE PACT HOLDS, then SHATTERS ON THE BEAT ----------------------------
{
  while (clock < truce.breakAt - 5) tick();
  check('F the hold: five seconds short of breakAt the pact still stands',
    war.peek().truce === true && factionStance(PACT_A, PACT_B) === 'ally',
    `t=${clock}s of ${truce.breakAt}s`);
  const mark = heard.length;
  let shatterAt = -1;
  for (let i = 0; i < 200 && shatterAt < 0; i++) {
    tick();
    if (!war.peek().truce) shatterAt = clock;
  }
  check('F the shatter: the truce clears at its own breakAt (within one beat)',
    shatterAt >= truce.breakAt && shatterAt < truce.breakAt + WAR_CFG.step + 1e-9,
    `cleared at ${shatterAt}s, breakAt ${truce.breakAt}s`);
  check('F the shatter: peek() reports no standing truce', war.peek().truce === false);
  check('F the shatter: the war banked it too (snapshot truce is null)', snapTruce(war) === null);
  const fresh = heard.slice(mark);
  check('F the bulletin: the pact shatters LOUDLY, naming both lords',
    fresh.some(t => /pact shatters/i.test(t)
      && t.includes(war.seatedLords()[truce.a]?.short ?? ' ')
      && t.includes(war.seatedLords()[truce.b]?.short ?? ' ')),
    fresh.filter(t => /shatter/i.test(t)).join(' | ') || `${fresh.length} other line(s)`);
  // THE REPUBLISH, read against the floor: 'hostile' is unreachable from the
  // static table now, so this can only be applyStances() having run again.
  check('F the republish: the pair turns HOSTILE in the published layer',
    factionStance(PACT_A, PACT_B) === 'hostile',
    `${PACT_A}|${PACT_B} → ${factionStance(PACT_A, PACT_B)}`);
  check('F the republish: and every seated pair now reads hostile',
    publishedPairs(war).every(p => p.stance === 'hostile'));
}

// --- G) THE DURABLE PLEDGE (restore republishes the pact) --------------------
{
  // Flip the floor to 'hostile': now an 'ally' read can only come from the
  // restored war's own publication (the static table says hostile as well).
  setRunStances('probe_hellwar_floor', { [`${PACT_A}|${PACT_B}`]: 'hostile' });
  const other = mkWar(truceSeed + 7919); // a different war, own seats, own layer
  check('G control: before the restore the pair reads hostile', factionStance(PACT_A, PACT_B) === 'hostile');
  other.restore(preSnap);
  check('G restore: a restored pact re-publishes ally into the stance layer',
    factionStance(PACT_A, PACT_B) === 'ally' && other.peek().truce === true,
    `stance ${factionStance(PACT_A, PACT_B)}, truce ${other.peek().truce}`);
  check('G restore: the seats and the pact round-trip exactly',
    JSON.stringify(other.snapshot()) === JSON.stringify(preSnap));
  setRunStances('probe_hellwar_floor', {});
}

// --- H) THE GUARD: a one-seat war never rolls a truce ------------------------
// The only dial this rig moves — restored and re-asserted below. With one seat
// the `seats.length >= 2` test short-circuits the die entirely; were it not
// there the roll would bank {a:0,b:1} against a seat that does not exist.
{
  WAR_CFG.seats = 1;
  let seated = 0, truces = 0, published = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const f = mkWar(seed);
    if (f.peek().seats.length === 1) seated++;
    if (f.peek().truce) truces++;
    if (publishedPairs(f).length) published++;
  }
  check('H guard: 200 one-seat wars, and not one of them rolls a truce',
    seated === 200 && truces === 0, `${seated}/200 single-seated, ${truces} truces`);
  check('H guard: a one-seat war publishes no pairs at all', published === 0);
  WAR_CFG.seats = SHIPPED_SEATS;
  check('H restored: the shipped seat count is back (this rig leaves no dial moved)',
    WAR_CFG.seats === SHIPPED_SEATS && WAR_CFG.truce.chance === 0.35,
    `seats ${WAR_CFG.seats}, chance ${WAR_CFG.truce.chance}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
