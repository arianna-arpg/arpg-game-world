// ---------------------------------------------------------------------------
// THE MADNESS BANK (Maddening Miasma, 2026-09-30 — docs/engine/madden.md):
// madness is ONE dwell ledger per skill instance, banked per frame by every
// standing placement any cast of the skill lays, and spent by each madness.
// The gem gates on 'surface:standing'; the matrix measures it on THE HELD
// LANE (the stationary dummy, a stand-still pilot).
//   A  the gate: flash grounds refuse; standing grounds, pulse beats, crack
//      texture, curse fields and lingering lifts admit; bare 'surface' (the
//      sibling gems' gate) still admits a flash
//   B  the frame clock: a 9s-tick rune no longer maddens on first touch, and
//      a body arriving after its first tick still goes mad on time
//   C  every standing mint wears the one bank — crack segments (credited
//      once where several overlap), wall segments, march ripples, curse
//      fields
//   D  the bank spans casts (an exclusive crack's relocation keeps it), each
//      madness spends it, and it forgets the departed
//   E  the held lane: dwell pairs probe on the dummy with a stand-still
//      pilot (heal hosts yield their live rule, summons keep theirs), and
//      the madness reaches the fingerprint
//
// Run: npx tsx balance/probe_madden.ts
// ---------------------------------------------------------------------------
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance, mechanismHolds, supportFitsInst, type SkillInstance } from '../src/engine/skills';
import { mod, type Modifier } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { MADDEN_CFG, type MaddenBank, type World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { heldLaneFor, pairShapeFor, probeKindFor, probePolicyFor, probeScenario } from '../src/sim/compat';
import { runScenario } from '../src/sim/runner';

let failed = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${!ok && detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
}

const GEM = SUPPORTS.maddening_miasma;
const AFTER = GEM.madden!.after;
const DT = 1 / 60;
/** A madness lands within a few frames of the bank crossing `after`. */
const ON_TIME = 4 * DT;
const r2 = (x: number | null | undefined): string => x === null || x === undefined ? 'never' : x.toFixed(2);

const inst = (id: string, gems: string[]): SkillInstance => {
  const i = makeSkillInstance(SKILLS[id], 1, 4);
  gems.forEach((g, k) => { i.sockets[k] = { def: SUPPORTS[g], level: 1 }; });
  return i;
};
const withGem = (id: string, ...extra: string[]): SkillInstance => inst(id, ['maddening_miasma', ...extra]);
const fits = (id: string, ...extra: string[]): boolean => supportFitsInst(GEM, inst(id, extra));

/** A caster facing east with every gem's attributes waived; an optional
 *  sheet source shapes its effect duration / cascade for one rig. */
const arena = (seed: number, mods: Modifier[] = []): World => {
  const w = makeSimWorld('magician', seed);
  w.devIgnoreSkillAttributes = true;
  w.player.facing = 0;
  if (mods.length) w.player.sheet.setSource('madden-probe', mods);
  return w;
};
/** A held body: no brain, never dies, put back on its post every frame. */
const held = (w: World, dx: number, dy = 0): Actor => {
  const a = w.createMonster('plains_wolf', 1, 'enemy');
  a.aiCooldown = 9999;
  a.maxLife = () => 1e6; a.life = 1e6;
  a.pos = { x: w.player.pos.x + dx, y: w.player.pos.y + dy };
  w.actors.push(a);
  return a;
};
const mad = (a: Actor): boolean => a.statuses.some(s => s.id === 'maddened');
const zonesOf = (w: World, i: SkillInstance) => w.zones.filter(z => z.inst === i);
const bankOf = (w: World, i: SkillInstance): MaddenBank | undefined => zonesOf(w, i).find(z => z.madden)?.madden;
const aim = (w: World, dx: number, dy = 0) => ({ x: w.player.pos.x + dx, y: w.player.pos.y + dy });
type Posts = Map<Actor, { x: number; y: number }>;
const posts = (...bodies: Actor[]): Posts => new Map(bodies.map(b => [b, { x: b.pos.x, y: b.pos.y }]));

/** One frame with every post held and the caster's mana full. */
function frame(w: World, hold: Posts, clock: { now: number }): void {
  for (const [a, p] of hold) { a.pos.x = p.x; a.pos.y = p.y; }
  w.player.mana = w.player.availableMaxMana();
  w.update(DT);
  clock.now += DT;
}
/** Press until the cast is accepted, then step until it lays a placement
 *  that was not already standing; returns the frame it landed. */
function cast(w: World, i: SkillInstance, at: { x: number; y: number }, hold: Posts, clock: { now: number }): number {
  const before = new Set(zonesOf(w, i));
  for (let k = 0; k < 900 && !w.useSkill(w.player, i, at); k++) frame(w, hold, clock);
  for (let k = 0; k < 900; k++) {
    frame(w, hold, clock);
    if (zonesOf(w, i).some(z => !before.has(z) && z.exploded)) break;
  }
  return clock.now;
}
/** Step until the body goes mad (or the window closes); the madness time. */
function until(w: World, body: Actor, hold: Posts, clock: { now: number }, end: number): number | null {
  for (; clock.now < end; ) {
    frame(w, hold, clock);
    if (mad(body)) return clock.now;
  }
  return null;
}

seedGlobalRandom(0x5adde7);

// === A — the gate ============================================================
{
  for (const id of ['icy_comet', 'agony', 'contagion']) {
    const bare = inst(id, []);
    check(`A1 ${id}: a flash ground — bare 'surface' admits, 'surface:standing' refuses the gem`,
      mechanismHolds('surface', bare) && !mechanismHolds('surface:standing', bare) && !fits(id));
  }
  for (const id of ['caltrops', 'consecration', 'carillon', 'grasping_chasm']) {
    check(`A2 ${id}: a standing ground (own linger, innate pulse, or a lingering crack) admits the gem`, fits(id));
  }
  check('A3 the lifts stand a flash ground up: a pulse gem, a lingering field, a curse field',
    fits('icy_comet', 'buried_charge') && fits('icy_comet', 'no_mans_land') && fits('agony', 'miasmic_ground'));
  check('A4 a linger-less crack refuses bare and stands with a texture gem',
    !fits('fissure') && fits('fissure', 'volcanic_heart'));
  check('A5 the sibling surface gems keep the bare gate (Pulsing Hex still fits a flash ground)',
    supportFitsInst(SUPPORTS.pulsing_hex, inst('icy_comet', [])));
}

// === B — the frame clock on a 9s-tick rune ===================================
{
  const d = SKILLS.rune_of_power.delivery;
  const tick = d.type === 'ground' ? d.tickInterval ?? 0 : 0;
  check(`B0 the rig: the rune's tick (${tick}s) outlasts the threshold`, tick > AFTER);
  const w = arena(0xb1);
  const rune = withGem('rune_of_power');
  const at = aim(w, 100);
  const early = held(w, 100);
  const late = held(w, 600, 300);
  const hold = posts(early, late);
  const clock = { now: 0 };
  const landed = cast(w, rune, at, hold, clock);
  let earlyMad: number | null = null, lateMad: number | null = null, arrived = 0;
  while (clock.now < landed + 10) {
    // The second body walks in a beat and a half after the first tick fired.
    if (!arrived && clock.now >= landed + 1.5) { hold.set(late, { x: at.x, y: at.y + 20 }); arrived = clock.now; }
    frame(w, hold, clock);
    if (earlyMad === null && mad(early)) earlyMad = clock.now;
    if (lateMad === null && mad(late)) lateMad = clock.now;
  }
  check('B1 no first-touch madness: the body present at the first tick goes mad only after six seconds inside',
    earlyMad !== null && earlyMad - landed >= AFTER - ON_TIME && earlyMad - landed <= AFTER + ON_TIME,
    `${r2(earlyMad === null ? null : earlyMad - landed)}s after landing`);
  check('B2 a body arriving after the first tick still goes mad six seconds later (the tick ledger never did)',
    lateMad !== null && lateMad - arrived >= AFTER - ON_TIME && lateMad - arrived <= AFTER + ON_TIME,
    `${r2(lateMad === null ? null : lateMad - arrived)}s after arriving`);
}

// === C — every standing mint wears the one bank ==============================
const chasmStep = (): number => {
  const d = SKILLS.grasping_chasm.delivery;
  return d.type === 'ground' && d.fissure ? d.fissure.step ?? d.radius * 1.1 : 44;
};
{
  // C1 crack segments: one bank across the whole tear, credited once where
  // several segments overlap the same body.
  const w = arena(0xc1);
  const chasm = withGem('grasping_chasm');
  const step = chasmStep();
  const onSeg = held(w, step * 2.5);           // a segment's middle
  const onSeam = held(w, step * 4);            // where segments meet
  const hold = posts(onSeg, onSeam);
  const clock = { now: 0 };
  const landed = cast(w, chasm, aim(w, 150), hold, clock);
  let segs = 0, banks = new Set<MaddenBank | undefined>(), segMad: number | null = null;
  let firstCredit: number | null = null, seamDwell: number | null = null;
  while (clock.now < landed + 9) {
    frame(w, hold, clock);
    const live = zonesOf(w, chasm).filter(z => z.linger > 0);
    if (live.length > segs) { segs = live.length; banks = new Set(live.map(z => z.madden)); }
    const bank = bankOf(w, chasm);
    if (firstCredit === null && bank?.dwell.has(onSeam.id)) firstCredit = clock.now - DT;
    if (seamDwell === null && firstCredit !== null && clock.now >= firstCredit + 3) seamDwell = bank?.dwell.get(onSeam.id) ?? 0;
    if (segMad === null && mad(onSeg)) segMad = clock.now - landed;
  }
  check(`C1 every lingering crack segment wears the one bank (${segs} segments)`,
    segs >= 5 && banks.size === 1 && !banks.has(undefined));
  check('C1 a body on the crack goes mad (crack segments never carried a bank before)',
    segMad !== null && segMad <= AFTER + 1, `mad ${r2(segMad)}s after landing`);
  check('C1 a body on a seam banks once a frame, however many segments overlap it',
    seamDwell !== null && Math.abs(seamDwell - 3) <= 2 * DT, `${r2(seamDwell)}s banked in 3s`);
}
{
  // C2 wall segments (Flame Wall, given the duration to outlast six seconds).
  const w = arena(0xc2, [mod('effectDuration', 'increased', 0.5)]);
  const wall = withGem('flame_wall');
  const body = held(w, 150);
  const hold = posts(body);
  const clock = { now: 0 };
  const landed = cast(w, wall, aim(w, 150), hold, clock);
  const segs = zonesOf(w, wall);
  const at = until(w, body, hold, clock, landed + 9);
  check(`C2 every wall segment wears the one bank (${segs.length} segments), and the wall maddens on time`,
    segs.length >= 3 && new Set(segs.map(z => z.madden)).size === 1 && segs[0].madden !== undefined
      && at !== null && Math.abs(at - landed - AFTER) <= ON_TIME, `mad ${r2(at === null ? null : at - landed)}s after landing`);
}
{
  // C3 march ripples (the aoeCascade stat walks a native march on caltrops).
  const w = arena(0xc3, [mod('aoeCascade', 'flat', 2)]);
  const trap = withGem('caltrops');
  cast(w, trap, aim(w, 150), new Map(), { now: 0 });
  const placed = zonesOf(w, trap);
  check(`C3 the primary and its march ripples share one bank (${placed.length} placements)`,
    placed.length >= 3 && new Set(placed.map(z => z.madden)).size === 1 && placed[0].madden !== undefined);
}
for (const [gem, dx, label] of [['miasmic_ground', 150, 'the planted patch'], ['miasma', 80, 'the worn haze']] as const) {
  // C4 curse fields: Miasmic Ground's patch and Miasma's worn haze.
  const w = arena(0xc4);
  const curse = withGem('agony', gem);
  const body = held(w, dx);
  const hold = posts(body);
  const clock = { now: 0 };
  const landed = cast(w, curse, aim(w, dx), hold, clock);
  const at = until(w, body, hold, clock, landed + 8);
  check(`C4 ${label} (${gem}) wears the bank and maddens on time`,
    zonesOf(w, curse)[0]?.madden !== undefined && at !== null && Math.abs(at - landed - AFTER) <= ON_TIME,
    `mad ${r2(at === null ? null : at - landed)}s after landing`);
}

// === D — one bank across casts, spent by madness, forgetting the departed ====
{
  // D1 an EXCLUSIVE crack: the re-cast closes the old wound before six
  // seconds; the relocated crack keeps the skill's bank.
  const w = arena(0xd1);
  const chasm = withGem('grasping_chasm');
  const body = held(w, chasmStep() * 2.5);
  const hold = posts(body);
  const clock = { now: 0 };
  cast(w, chasm, aim(w, 150), hold, clock);
  const first = zonesOf(w, chasm);
  const relaid = cast(w, chasm, aim(w, 150), hold, clock); // waits out the cooldown
  const closed = first.every(z => !w.zones.includes(z));
  const carried = bankOf(w, chasm)?.dwell.get(body.id) ?? 0;
  const wasMad = mad(body);
  const at = until(w, body, hold, clock, relaid + 6);
  check('D1 the re-cast relocates the crack (the old wound closed) and the bank keeps its seconds',
    closed && !wasMad && carried > 3, `carried ${r2(carried)}s`);
  check('D1 the relocated crack finishes the madness on the carried seconds (a per-cast ledger would need six)',
    at !== null && at - relaid <= AFTER - carried + 1, `mad ${r2(at === null ? null : at - relaid)}s after the re-cast`);
}
{
  // D2/D3 caltrops re-laid on cooldown: overlapping placements credit once,
  // each madness spends the bank, and the bank forgets a body that dies.
  const w = arena(0xd2);
  const trap = withGem('caltrops');
  const at = aim(w, 150);
  const body = held(w, 150);
  const hold = posts(body);
  const clock = { now: 0 };
  const landed = cast(w, trap, at, hold, clock);
  const bank = bankOf(w, trap);
  const onsets: number[] = [];
  let spent: number | null = null, was = false;
  while (clock.now < landed + 14) {
    w.useSkill(w.player, trap, at); // re-lay whenever ready
    frame(w, hold, clock);
    const now = mad(body);
    if (now && !was) {
      onsets.push(clock.now);
      if (spent === null) spent = bank?.dwell.get(body.id) ?? null;
    }
    was = now;
  }
  const laid = new Set(w.zones.filter(z => z.inst === trap)).size;
  check('D2 overlapping placements credit once: the first madness lands six seconds in, not sooner',
    onsets.length > 0 && Math.abs(onsets[0] - landed - AFTER) <= ON_TIME, `first ${r2(onsets.length ? onsets[0] - landed : null)}s after landing`);
  check('D2 the madness spends the bank (it reads empty the frame the madness lands)',
    spent !== null && spent <= 2 * DT, `bank ${r2(spent)}`);
  check('D2 the next madness costs six more seconds (the bank refills through the four-second bout)',
    onsets.length >= 2 && Math.abs(onsets[1] - onsets[0] - AFTER) <= ON_TIME, `onsets ${onsets.map(x => (x - landed).toFixed(2)).join(', ')}`);
  check(`D2 the rig re-laid overlapping caltrops (${laid} standing at the end)`, laid >= 2);
  body.dead = true;
  for (let k = 0; k < 10 / DT; k++) frame(w, new Map(), clock);
  check('D3 the bank forgets the departed once the placements retire',
    bank !== undefined && zonesOf(w, trap).length === 0 && !bank.dwell.has(body.id) && !bank.credited.has(body.id));
  check('D4 the threshold forgives float drift (MADDEN_CFG.epsilon is a sliver of a frame)',
    MADDEN_CFG.epsilon > 0 && MADDEN_CFG.epsilon < DT / 100);
}

// === E — the held lane =======================================================
{
  const host = SKILLS.caltrops, heal = SKILLS.consecration, summon = SKILLS.raise_spectre;
  check('E1 a dwell payload probes on the dummy; heal hosts yield their live rule, summons keep theirs',
    heldLaneFor(GEM) && probeKindFor(host, GEM).kind === 'dummy'
      && probeKindFor(heal, GEM).kind === 'dummy' && probeKindFor(summon, GEM).kind === 'live');
  check('E1 a non-dwell gem on the heal host still routes live (the host rule stands for it)',
    !heldLaneFor(SUPPORTS.lingering) && probeKindFor(heal, SUPPORTS.lingering).kind === 'live');
  check('E2 the pair shape carries the held lane and the dwell window policy',
    pairShapeFor(host, GEM, 'host').held === true && probePolicyFor(GEM)?.name === 'dwell');
  const solo = probeScenario('caltrops', { id: GEM.id, level: 1 }, {});
  const escort = probeScenario('consecration', { id: GEM.id, level: 1 }, {});
  check('E3 a solo host stands still on the held lane; an escorted host keeps its pair pilot',
    solo.pilot?.kind === 'turret' && solo.id.endsWith('_held') && escort.pilot?.kind === 'pair' && escort.id.includes('_held'));
  const statusIds = (support: string | null): string => {
    const s = probeScenario('caltrops', support ? { id: support, level: 1 } : null, { duration: 20 },
      { probe: 'dummy', held: true });
    const r = runScenario(s, { seeds: 1, baseSeed: 0x5adde7 });
    setSimTap(null);
    return String(r.episodes[0].fingerprint.status_ids);
  };
  const bare = statusIds(null), pair = statusIds(GEM.id);
  check('E4 the madness reaches the fingerprint on the held lane (caltrops: bare vs gem)',
    !bare.split('|').includes('maddened') && pair.split('|').includes('maddened'), `bare '${bare}' pair '${pair}'`);
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
