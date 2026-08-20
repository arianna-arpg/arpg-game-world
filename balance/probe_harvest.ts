// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE RESOURCE HARVEST (engine/harvest.ts + the World driver)
// end to end. Pins:
//   A. THE BOOT: biome-matched ground stands nodes on its own salted stream
//      (deterministic count + positions), placed in their standing faces.
//   B. THE SEEDED SEQUENCE: same node → same sequence across worlds and
//      re-derives (pure f(world seed × zone × spot)); different nodes
//      differ; every symbol is an enterable alphabet slot.
//   C. THE PAUSE LAW (solo): arming engages the 'harvest' hold — world
//      clock frozen, bodies undisturbed, the pause toggle's gate locked —
//      and the LAST correct press releases it the same call (unpause is
//      immediate), shatters the node to its husk and pays essence.
//   D. THE EXPIRY: a half-entered rite settles when the window closes, at
//      accrued accuracy — paid, spent, strictly less than perfect.
//   E. THE CO-OP BRANCH: with the hold policy refusing (allowHold false —
//      main.ts's co-op wiring), the rite runs UNPAUSED (world advances)
//      while THE INPUT LAW still holds: a bound slot press lands as a
//      SYMBOL, never a cast, and movement intent is swallowed; the pause
//      gate reports unlocked (no hold stands — the law's substance).
//   F. THE PAYOUT: monotone in accuracy (hits up, never less; misses up,
//      never more) AND difficulty (level up, never less); denominated
//      packets conserve the payout's Mortal-Essence worth exactly.
//   G. THE ONE-SHOT: leave-and-return re-places every node SPENT (husk
//      face, dwell never re-arms), and the FULL save round trip
//      (serializeWorldState → fresh world → adoptWorldState) cannot
//      re-arm a shattered node.
//   H. THE SEALS: spoils-'none' ground and sanctuaries stand NO nodes.
// Run: npx tsx balance/probe_harvest.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { ZONES, type ZoneDef } from '../src/data/zones';
import {
  HARVEST_CFG, harvestPayout, harvestPayoutValue, harvestSeqFor, harvestSeqLen,
} from '../src/engine/harvest';
import { HARVEST_HUSK_KIND, HARVEST_NODES } from '../src/data/harvest';
import { walletMortalValue, type EssenceId } from '../src/data/essences';
import { CLASSES } from '../src/data/classes';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x4a57e5);

// Force the stand roll + count certain: a seed-dependent branch pins nothing
// (the DROP_CFG idiom — the process exits, no restore needed).
(HARVEST_CFG as { chance: number }).chance = 1;
(HARVEST_CFG as { count: [number, number] }).count = [3, 3];

// ---------------------------------------------------------------- the ground
// cave_-namespaced ids ride the zone-memory serialize/adopt gates by
// construction (the sanctioned namespace), so rig G exercises the FULL save
// pipeline without standing a world web around the probe ground.
const PROBE_LEVEL = 12;
const mkGround = (id: string, opts?: { spoils?: 'none'; safe?: boolean }): ZoneDef => ({
  id, name: id, level: PROBE_LEVEL,
  size: { w: 1600, h: 1200 },
  theme: {
    floor: '#101010', grid: '#181818', border: '#3a3a3a',
    obstacle: '#2a2a2a', obstacleEdge: '#444444', accent: '#888888',
  },
  seed: 0x11a7, layout: [],
  objective: { kind: opts?.safe ? 'safe' : 'none' },
  exits: [],
  map: { x: 9500, y: 9500 },
  biome: 'field', // matches the shipped 'cropstone' row (data/harvest.ts)
  ...(opts?.spoils ? { spoils: opts.spoils } : {}),
});
ZONES['cave_probeharvest_a'] = mkGround('cave_probeharvest_a');
ZONES['cave_probeharvest_b'] = mkGround('cave_probeharvest_b');
ZONES['cave_probeharvest_sealed'] = mkGround('cave_probeharvest_sealed', { spoils: 'none' });
ZONES['cave_probeharvest_safe'] = mkGround('cave_probeharvest_safe', { safe: true });

check('the field biome carries a shipped harvest row',
  HARVEST_NODES.some(r => r.biomes.includes('field')));

interface WInternals {
  manifest: { seed: number };
  harvestSessions: {
    seatId: string; ix: number; seq: number[]; done: number; misses: number;
    left: number; window: number; held: boolean;
  }[];
  harvestNodes: { pos: { x: number; y: number }; spent: boolean; doodad: { kind: string } }[];
  drops: { item: { kind?: string; essence?: EssenceId; count?: number } }[];
  createMonster(defId: string, level: number, team: string): Actor;
  actors: Actor[];
}

const SEED = 0xd1e5;
const w = makeSimWorld(CLASSES[0].id, SEED) as World;
const W = w as unknown as WInternals;

const input = (slot: number | null, dx = 0) => {
  const held = Array(8).fill(false) as boolean[];
  const edge = Array(8).fill(false) as boolean[];
  if (slot !== null) { held[slot] = true; edge[slot] = true; }
  return { dx, dy: 0, aim: { x: w.player.pos.x + 40, y: w.player.pos.y }, held, edge };
};
const press = (slot: number | null, dx = 0): void => {
  w.applyInputs(new Map([['p0', input(slot, dx)]]), 0.05);
};
const standAt = (n: { x: number; y: number }): void => {
  w.player.pos.x = n.x + 20;
  w.player.pos.y = n.y;
};
const dwell = (ticks = 12): void => {
  for (let i = 0; i < ticks; i++) w.update(0.1);
};
// The arming gate rides the field discipline's calm law: no KIT-BEARING foe
// inside SWAP_DISCIPLINE_CFG.foeRadius (skill-less fauna — the field's own
// hares — are exempt, structurally). The ambient pour can roll a wolf beside
// a node, so every rig that dwells first BANISHES the armed ambients to a
// far in-arena corner (never killed: kills would stamp the calm clock).
const banishFoes = (world: World): void => {
  const ww = world as unknown as WInternals;
  for (const a of ww.actors as unknown as Actor[]) {
    if (a.team === 'enemy' && !a.dead && a.skills.some(s => s)) {
      a.pos.x = 60;
      a.pos.y = 60;
    }
  }
};

// ================================================================== A. boot
w.loadZone('cave_probeharvest_a');
const view0 = w.harvestView();
check('A1: biome-matched ground stands the forced count of nodes',
  (view0?.nodes.length ?? 0) === 3, `nodes=${view0?.nodes.length ?? 0}`);
check('A2: every node stands unspent in its row kind (not the husk)',
  !!view0 && view0.nodes.every(n => !n.spent)
  && W.harvestNodes.every(n => n.doodad.kind !== HARVEST_HUSK_KIND));

// ========================================================== B. the sequence
const nodesA = W.harvestNodes.map(n => ({ x: n.pos.x, y: n.pos.y }));
const seqOf = (seed: number, pos: { x: number; y: number }): number[] =>
  harvestSeqFor(seed, 'cave_probeharvest_a', pos, PROBE_LEVEL);
const seq0 = seqOf(W.manifest.seed, nodesA[0]);
check('B1: the sequence re-derives identically (pure function — no re-roll to chase)',
  JSON.stringify(seq0) === JSON.stringify(seqOf(W.manifest.seed, nodesA[0])));
check('B2: different nodes deal different sequences (this seed)',
  JSON.stringify(seq0) !== JSON.stringify(seqOf(W.manifest.seed, nodesA[1]))
  || JSON.stringify(seq0) !== JSON.stringify(seqOf(W.manifest.seed, nodesA[2])));
check('B3: every symbol is an enterable alphabet slot',
  seq0.every(s => HARVEST_CFG.alphabet.includes(s)));
check('B4: length rides the difficulty curve',
  seq0.length === harvestSeqLen(PROBE_LEVEL), `len=${seq0.length}`);

const w2 = makeSimWorld(CLASSES[0].id, SEED) as World;
const W2 = w2 as unknown as WInternals;
w2.loadZone('cave_probeharvest_a');
check('B5: a reloaded world (same seed) stands the same nodes in the same spots',
  W2.harvestNodes.length === 3
  && W2.harvestNodes.every((n, i) => n.pos.x === nodesA[i].x && n.pos.y === nodesA[i].y));
check('B6: …and deals the same sequences (same world seed, same spots)',
  JSON.stringify(seqOf(W2.manifest.seed, { x: W2.harvestNodes[0].pos.x, y: W2.harvestNodes[0].pos.y }))
  === JSON.stringify(seq0));

// ======================================================= C. the solo freeze
// The undisturbed-witness foe parks at a far IN-ARENA corner — outside the
// arming gate's foeRadius, inside the confine (an out-of-bounds seat would
// clamp back to the rim beside the nodes on its first step).
const foe = W.createMonster('pit_mauler', PROBE_LEVEL, 'enemy');
foe.pos.x = 100;
foe.pos.y = 100;
W.actors.push(foe);

banishFoes(w);
standAt(nodesA[0]);
w.update(0.1); w.update(0.1);
check('C0: standing calm at a node stands the OFFER (the consent ask)',
  w.harvestView()?.nodes[0]?.offered === true);
w.applyAction(w.localSeat, { t: 'pickupItem' });
check('C1: the consent press begins the rite for the standing seat',
  W.harvestSessions.length === 1 && W.harvestSessions[0].seatId === 'p0');
const rite = W.harvestSessions[0];
check('C2: the rite deals the seeded sequence (the arm reveals, never rolls)',
  JSON.stringify(rite.seq) === JSON.stringify(seq0));
check('C3: the node is COMMITTED at arm (spent stamps before any entry)',
  W.harvestNodes[rite.ix].spent === true);
check('C4: solo, the world holds (the pause policy admits the freeze)',
  rite.held === true && w.timeflow.worldScale() === 0);
check('C5: the pause toggle\'s gate is LOCKED while the hold stands',
  w.harvestPauseLocked() === true);

const t0 = w.time;
const foeX = foe.pos.x, foeLife = foe.life, heroLife = w.player.life;
w.update(0.3); w.update(0.3); w.update(0.3);
check('C6: the held world\'s clock does not move', w.time === t0, `t ${t0} -> ${w.time}`);
check('C7: bodies stand undisturbed under the hold (foe + hero untouched)',
  foe.pos.x === foeX && foe.life === foeLife && w.player.life === heroLife);
check('C8: the rite\'s own window still burns (raw clock — no free reading time)',
  W.harvestSessions[0].left < W.harvestSessions[0].window);

const drops0 = W.drops.length;
for (const s of seq0) press(s);
check('C9: the exact entry completes and settles — the rite is gone',
  W.harvestSessions.length === 0);
check('C10: unpause is IMMEDIATE at completion (the same call released it)',
  w.timeflow.worldScale() === 1 && !w.harvestPauseLocked());
check('C11: the node shattered to its husk face',
  W.harvestNodes[0].doodad.kind === HARVEST_HUSK_KIND);
const essenceDrops = W.drops.slice(drops0).filter(d => d.item.kind === 'essence');
check('C12: the shatter paid essence through the standing drop path',
  essenceDrops.length > 0, `packets=${essenceDrops.length}`);
const perfectValue = harvestPayoutValue(PROBE_LEVEL, seq0.length, 0, seq0.length);
check('C13: the perfect entry\'s packets appraise at the perfect value exactly',
  walletMortalValue(Object.fromEntries(
    essenceDrops.map(d => [d.item.essence, d.item.count]))) === perfectValue,
  `value=${perfectValue}`);
const tAfter = w.time;
w.update(0.2);
check('C14: the released world breathes again', w.time > tAfter);

// ============================================================ D. the expiry
banishFoes(w);
standAt(nodesA[1]);
w.update(0.1); w.update(0.1);
w.applyAction(w.localSeat, { t: 'pickupItem' });
check('D1: the second node arms in turn', W.harvestSessions.length === 1);
const rite1 = W.harvestSessions[0];
const seq1 = rite1.seq.slice();
press(seq1[0]);                                  // one correct step
const wrong = HARVEST_CFG.alphabet.find(s => s !== seq1[1]) ?? seq1[0];
press(wrong);                                    // one miss
check('D2: the tally reads one step banked, one miss',
  rite1.done === 1 && rite1.misses === 1);
const dropsD = W.drops.length;
for (let i = 0; i < 40 && W.harvestSessions.length; i++) w.update(0.4);
check('D3: the window closes the rite (expiry settles — armed is settled)',
  W.harvestSessions.length === 0 && W.harvestNodes[rite1.ix].doodad.kind === HARVEST_HUSK_KIND);
const expiryDrops = W.drops.slice(dropsD).filter(d => d.item.kind === 'essence');
const expiryValue = walletMortalValue(Object.fromEntries(
  expiryDrops.map(d => [d.item.essence, d.item.count])));
check('D4: the half entry still pays (the floor) — strictly under perfect',
  expiryValue >= 1 && expiryValue < perfectValue,
  `expiry=${expiryValue} perfect=${perfectValue}`);
check('D5: …and matches the pure fold at the banked tally',
  expiryValue === harvestPayoutValue(PROBE_LEVEL, 1, 1, seq1.length));

// ======================================================== E. the co-op lane
w.timeflow.allowHold = () => false;              // main.ts's co-op wiring
banishFoes(w);
standAt(nodesA[2]);
w.update(0.1); w.update(0.1);
w.applyAction(w.localSeat, { t: 'pickupItem' });
check('E1: the rite arms in co-op too', W.harvestSessions.length === 1);
const rite2 = W.harvestSessions[0];
check('E2: …but the world does NOT freeze (the solo-only policy refused)',
  rite2.held === false && w.timeflow.worldScale() === 1);
check('E3: no hold stands, so the pause gate reports unlocked (the law\'s substance)',
  w.harvestPauseLocked() === false);
const tCoop = w.time;
w.update(0.25);
check('E4: the unpaused world advances mid-rite', w.time > tCoop);

// THE INPUT LAW, pinned where the freeze can't mask it: a bound slot press
// lands as a SYMBOL, never a cast, and movement intent is swallowed.
const seq2 = rite2.seq.slice();
const heroX = w.player.pos.x;
const doneBefore = rite2.done;
press(seq2[0], 1);                               // press + full-tilt movement
check('E5: the press landed as a symbol (the rite advanced)',
  rite2.done === doneBefore + 1);
check('E6: no cast began off the sequence key (THE INPUT LAW)',
  w.player.casting == null);
check('E7: movement intent is swallowed mid-rite', w.player.pos.x === heroX);
for (let i = 1; i < seq2.length; i++) press(seq2[i]);
check('E8: completion settles the co-op rite', W.harvestSessions.length === 0);
press(2, 0);                                     // control: the same press, no rite
check('E9: THE CONTROL — the same press casts once the rite is gone',
  w.player.casting != null);
w.timeflow.allowHold = () => true;

// ========================================================== F. the payout
{
  let mono = true;
  for (let lvl = 1; lvl <= 40 && mono; lvl += 3) {
    const len = harvestSeqLen(lvl);
    for (let h = 0; h < len && mono; h++) {
      for (let m = 0; m <= 4 && mono; m++) {
        if (harvestPayoutValue(lvl, h + 1, m, len) < harvestPayoutValue(lvl, h, m, len)) mono = false;
        if (harvestPayoutValue(lvl, h, m + 1, len) > harvestPayoutValue(lvl, h, m, len)) mono = false;
      }
    }
  }
  check('F1: payout is monotone in accuracy (hits never pay less; misses never pay more)', mono);
  let monoLvl = true;
  for (let lvl = 1; lvl < 40 && monoLvl; lvl++) {
    // Difficulty compares at PERFECT entries — the ask grows with the level
    // (longer sequences), and so must the perfect purse.
    const a = harvestPayoutValue(lvl, harvestSeqLen(lvl), 0, harvestSeqLen(lvl));
    const b = harvestPayoutValue(lvl + 1, harvestSeqLen(lvl + 1), 0, harvestSeqLen(lvl + 1));
    if (b < a) monoLvl = false;
  }
  check('F2: payout is monotone in difficulty (a deeper country never pays less)', monoLvl);
  let conserved = true;
  for (let lvl = 1; lvl <= 40 && conserved; lvl += 2) {
    const len = harvestSeqLen(lvl);
    for (let h = 0; h <= len && conserved; h++) {
      const packets = harvestPayout(lvl, h, 1, len);
      const value = harvestPayoutValue(lvl, h, 1, len);
      const wallet: Partial<Record<EssenceId, number>> = {};
      for (const p of packets) wallet[p.essence] = (wallet[p.essence] ?? 0) + p.count;
      if (walletMortalValue(wallet) !== value) conserved = false;
    }
  }
  check('F3: denominated packets conserve the payout\'s worth to the unit', conserved);
}

// ======================================================== G. the one-shot
w.loadZone('cave_probeharvest_b', 'cave_probeharvest_a');
w.loadZone('cave_probeharvest_a', 'cave_probeharvest_b');
check('G1: leave-and-return re-places every node SPENT in the husk face',
  W.harvestNodes.length === 3
  && W.harvestNodes.every(n => n.spent && n.doodad.kind === HARVEST_HUSK_KIND));
banishFoes(w);
standAt({ x: W.harvestNodes[0].pos.x, y: W.harvestNodes[0].pos.y });
dwell(20);
w.applyAction(w.localSeat, { t: 'pickupItem' });
check('G2: a spent node never re-arms (no offer stands, the press finds nothing)',
  W.harvestSessions.length === 0);

// The FULL save pipeline: capture (leave) → serialize → a fresh world adopts
// → the return finds the nodes still shattered.
w.loadZone('cave_probeharvest_b', 'cave_probeharvest_a');
const ws = w.serializeWorldState();
const w3 = makeSimWorld(CLASSES[0].id, SEED) as World;
const W3 = w3 as unknown as WInternals;
w3.adoptWorldState(ws);
w3.loadZone('cave_probeharvest_a');
check('G3: save → load cannot re-arm a shattered node (spent rides the save)',
  W3.harvestNodes.length === 3
  && W3.harvestNodes.every(n => n.spent && n.doodad.kind === HARVEST_HUSK_KIND));
banishFoes(w3);
w3.player.pos.x = W3.harvestNodes[0].pos.x + 20;
w3.player.pos.y = W3.harvestNodes[0].pos.y;
for (let i = 0; i < 20; i++) w3.update(0.1);
w3.applyAction(w3.localSeat, { t: 'pickupItem' });
check('G4: …and the adopted world\'s press finds nothing either',
  W3.harvestSessions.length === 0);

// ================================================ I. the dwell-mode letter
// The commission's own consent ('dwell'): standing armSec begins the rite
// with no press — one config word away (HARVEST_CFG.consent). The world
// stands in zone B, whose nodes were walked past but never armed.
(HARVEST_CFG as { consent: string }).consent = 'dwell';
banishFoes(w);
standAt({ x: W.harvestNodes[0].pos.x, y: W.harvestNodes[0].pos.y });
dwell();
check('I1: dwell consent arms with no press (the letter, one word away)',
  W.harvestSessions.length === 1);
check('I2: …and the solo hold engages as ever',
  w.timeflow.worldScale() === 0);
(HARVEST_CFG as { consent: string }).consent = 'press';

// =========================================================== H. the seals
w.loadZone('cave_probeharvest_sealed', 'cave_probeharvest_b');
check('H0: a rite never crosses a boundary (the load released rig I\'s hold)',
  w.timeflow.worldScale() === 1);
check('H1: spoils-sealed ground stands NO nodes (a sealed reward is a trap)',
  w.harvestView() === null);
w.loadZone('cave_probeharvest_safe', 'cave_probeharvest_sealed');
check('H2: sanctuaries stand NO nodes (rest is rest)',
  w.harvestView() === null);

console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL PASS');
process.exit(failed ? 1 : 0);
