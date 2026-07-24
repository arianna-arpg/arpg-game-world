// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE MOUNT FABRIC end to end on the real engine
// (docs/engine/mounts.md): the registry weave (rider defs carry mount,
// steed defs carry slots, looks + statuses stand), the pure laws (seat
// geometry incl. the facing frame + legacy offsetY, capacity, acceptance),
// spawn-time PAIRING through the lazy sweep (steed minted beneath its
// rider, paint order steed-then-rider, ghost snapshot state), the CREW
// lever (a steed arriving manned), the per-frame PIN (drawn == seated,
// bearing worn while idle), THE UNHORSED BEAT (steed dies → rider tumbles
// dazed and fights afoot), the WIDOW policies ('fight' keeps the brain,
// 'rout' breaks the nerve through the morale machinery), the REMOUNT rule
// (an unhorsed rider vaults onto a free saddle by pure data), the grab
// SEVER (a landed grip tears the rider loose), the willed-step dismount
// (moveActor quits the saddle), the saddle footwork gate (movement-tagged
// skills refuse from the seat), THE PEN's ambush laws (visible pack
// ambushers spring as ONE event on proximity or a wound), the no-orphans
// sweep, and determinism.
// Run: npx tsx balance/probe_mount.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { STATUS_DEFS } from '../src/engine/status';
import { mod } from '../src/engine/stats';
import {
  MOUNT_CFG, mountAccepts, seatCount, seatPos,
} from '../src/engine/mounts';
import type { GripHold } from '../src/engine/grab';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { updateAI } from '../src/engine/ai';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x4a11);

const DT = 1 / 60;
// The HOST frame loop, verbatim (sim/runner.ts order): AI per actor, then
// the world tick — w.update alone leaves every brain frozen.
const step = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};
// World ticks with every BRAIN frozen — isolates the sweep's own duties
// (pairing, pin, severance) from AI-driven verbs.
const tick = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) w.update(DT);
};

const spawn = (w: ReturnType<typeof makeSimWorld>, id: string, lvl = 5,
  team: 'enemy' | 'player' = 'enemy'): Actor => {
  const m = w.createMonster(id, lvl, team);
  w.actors.push(m);
  return m;
};
const steedOf = (w: ReturnType<typeof makeSimWorld>, r: Actor): Actor | undefined =>
  r.mountId !== undefined ? w.actors.find(a => a.id === r.mountId) : undefined;

// Scratch kin for the crew + rout rigs (runtime-registered — never part of
// the shipped registry probe_anatomy sweeps at its own runtime).
MONSTERS.probe_howdah = {
  id: 'probe_howdah', name: 'Probe Howdah', color: '#887766', shape: 'circle',
  radius: 20, base: { life: 220, moveSpeed: 80, accuracy: 100, mana: 30, manaRegen: 3 },
  skills: ['claw'], xp: 1, faction: 'demon',
  mountSlot: {
    kinds: ['probe_crewman'],
    seats: [{ dx: -0.2, lift: 0.9 }, { dx: 0.25, lift: 0.75 }],
    crew: { riders: ['probe_crewman'], count: [2, 2], chance: 1 },
    onRiderDeath: 'rout',
  },
  brain: { type: 'basic' },
};
MONSTERS.probe_crewman = {
  id: 'probe_crewman', name: 'Probe Crewman', color: '#cc8855', shape: 'triangle',
  radius: 9, base: { life: 40, moveSpeed: 140, accuracy: 100, mana: 30, manaRegen: 3 },
  skills: ['claw'], xp: 1, faction: 'demon',
  brain: { type: 'basic' },
};
MONSTERS.probe_walker = {
  id: 'probe_walker', name: 'Probe Walker', color: '#aabbcc', shape: 'circle',
  radius: 12, base: { life: 500, moveSpeed: 0, accuracy: 100, mana: 0 },
  skills: [], xp: 1, faction: 'demon',
  mountSlot: { kinds: ['probe_crewman'], offsetY: 14 },
  brain: { type: 'basic' },
};

// --- 0) Registry weave ------------------------------------------------------
{
  check('registry: the goblin cavalry culture stands (rider mounts, steeds slotted)',
    MONSTERS.goblin_wolfrider?.mount?.on === 'warg'
    && !!MONSTERS.warg?.mountSlot && !!MONSTERS.cave_gnasher?.mountSlot
    && MONSTERS.gnasher_hopper?.mount?.on === 'cave_gnasher'
    && MONSTERS.goblin_warboss?.mount?.on === 'great_gnasher'
    && (MONSTERS.goblin_warboss.mount?.chance ?? 1) < 1
    && !!MONSTERS.great_gnasher?.mountSlot);
  check('registry: the demon towers seat two and arrive crewed',
    seatCount(MONSTERS.siege_hulk?.mountSlot) === 2
    && seatCount(MONSTERS.pyre_titan?.mountSlot) === 2
    && !!MONSTERS.siege_hulk?.mountSlot?.crew && !!MONSTERS.pyre_titan?.mountSlot?.crew);
  check('registry: the Host + winter court pairs stand',
    MONSTERS.barrow_lancer?.mount?.on === 'bone_steed' && !!MONSTERS.bone_steed?.mountSlot
    && MONSTERS.hoarfrost_lancer?.mount?.on === 'rime_hound' && !!MONSTERS.rime_hound?.mountSlot);
  check('registry: every new body wears a look whose parts resolve to painters',
    (['gnasher_hopper', 'bone_steed', 'barrow_lancer', 'hoarfrost_lancer', 'goblin_wolfrider'] as const)
      .every(id => !!LOOKS[id] && LOOKS[id].parts.every(p => !!PART_PAINTERS[p.kind])));
  check('registry: the unhorsed daze is a real status row (hard CC, power-inert)',
    STATUS_DEFS[MOUNT_CFG.unhorse.status]?.hardCC === true
    && STATUS_DEFS[MOUNT_CFG.unhorse.status]?.powerInert === true);
  check('registry: the remount rules ride plain data (mounted:false → the verb)',
    [MONSTERS.goblin_wolfrider, MONSTERS.gnasher_hopper, MONSTERS.barrow_lancer, MONSTERS.hoarfrost_lancer]
      .every(d => d.brain?.rules?.some(r =>
        r.when.mounted === false && r.actions?.some(a => a.do === 'mount'))));
}

// --- 1) Pure laws: seat geometry, capacity, acceptance ----------------------
{
  const steed = { pos: vec(100, 100), facing: 0, radius: 20 };
  const legacy = seatPos(steed, { kinds: [], offsetY: 14 }, 0);
  check('law: legacy offsetY keeps its exact geometry',
    legacy.x === 100 && legacy.y === 100 - 14);
  const dflt = seatPos(steed, { kinds: [] }, 0);
  check('law: the default seat perches at the config lift',
    dflt.x === 100 && Math.abs(dflt.y - (100 - 20 * MOUNT_CFG.defaultLift)) < 1e-9);
  const slot = { kinds: [], seats: [{ dx: 0.5, dy: 0, lift: 1 }] };
  const east = seatPos(steed, slot, 0);
  const north = seatPos({ ...steed, facing: -Math.PI / 2 }, slot, 0);
  check('law: seats ride the facing frame; lift stays screen-up',
    Math.abs(east.x - 110) < 1e-9 && Math.abs(east.y - 80) < 1e-9
    && Math.abs(north.x - 100) < 1e-9 && Math.abs(north.y - (100 - 10 - 20)) < 1e-9);
  check('law: capacity is the seat roster (legacy holds one)',
    seatCount({ kinds: [] }) === 1 && seatCount(slot) === 1
    && seatCount({ kinds: [], seats: [{}, {}, {}] }) === 3);
  check('law: acceptance reads tag / def id / faction',
    mountAccepts({ kinds: ['beast'] }, { tag: 'beast' })
    && mountAccepts({ kinds: ['warg'] }, { defId: 'warg' })
    && mountAccepts({ kinds: ['goblin'] }, { faction: 'goblin' })
    && !mountAccepts({ kinds: ['goblin'] }, { faction: 'undead' })
    && !mountAccepts(undefined, { tag: 'beast' }));
}

// --- 2) Spawn-time pairing (the lazy sweep) ---------------------------------
{
  const w = makeSimWorld('summoner', 0x2201);
  const before = w.actors.length;
  const rider = spawn(w, 'goblin_wolfrider');
  rider.pos = vec(w.player.pos.x + 900, w.player.pos.y);
  tick(w, 0.1);
  const steed = steedOf(w, rider);
  check('pairing: the sweep mints the steed beneath its rider',
    w.actors.length === before + 2 && !!steed && steed.defId === 'warg'
    && steed.riderIds?.length === 1 && steed.riderIds[0] === rider.id
    && rider.mountSeat === 0);
  check('pairing: the steed inherits team + faction and never snapshots while paired',
    !!steed && steed.team === rider.team && steed.faction === 'goblin'
    && steed.fromZoneGen === false);
  check('pairing: paint order files the steed before its rider',
    !!steed && w.actors.indexOf(steed) < w.actors.indexOf(rider));
  check('pairing: the flag latches — no second steed on later sweeps',
    (tick(w, 0.5), w.actors.length === before + 2));
  if (steed) {
    const slot = MONSTERS.warg.mountSlot;
    const seat = seatPos(steed, slot, 0);
    check('pin: drawn == seated through the ONE resolver',
      Math.abs(rider.pos.x - seat.x) < 1e-6 && Math.abs(rider.pos.y - seat.y) < 1e-6);
    steed.facing = 1.1;
    tick(w, 0.05);
    const seat2 = seatPos(steed, slot, 0);
    check('pin: the seat swings with the steed and the idle rider wears its bearing',
      Math.abs(rider.pos.x - seat2.x) < 1e-6 && Math.abs(rider.pos.y - seat2.y) < 1e-6
      && rider.facing === steed.facing);
  }
}

// --- 3) The crew lever (arrive manned) + bounded depth ----------------------
{
  const w = makeSimWorld('summoner', 0x2301);
  const before = w.actors.length;
  const howdah = spawn(w, 'probe_howdah');
  howdah.pos = vec(w.player.pos.x + 900, w.player.pos.y + 100);
  tick(w, 0.1);
  const crew = w.actors.filter(a => a.mountId === howdah.id);
  check('crew: the steed arrives manned — two riders in two distinct seats',
    w.actors.length === before + 3 && crew.length === 2
    && howdah.riderIds?.length === 2
    && new Set(crew.map(c => c.mountSeat)).size === 2);
  check('crew: minted riders never pair further (depth bounded by construction)',
    crew.every(c => c.mountPaired === true && c.fromZoneGen === false));
  check('crew: riders file behind their steed in paint order',
    crew.every(c => w.actors.indexOf(c) > w.actors.indexOf(howdah)));
  const cap = w.mountFreeSeat(howdah, MONSTERS.probe_howdah.mountSlot);
  check('crew: a full saddle refuses more', cap === -1);
}

// --- 4) The unhorsed beat + the widow policies ------------------------------
{
  const w = makeSimWorld('summoner', 0x2401);
  const rider = spawn(w, 'goblin_wolfrider');
  rider.pos = vec(w.player.pos.x + 900, w.player.pos.y);
  tick(w, 0.1);
  const steed = steedOf(w, rider)!;
  w.kill(steed, false);
  tick(w, 0.05);
  check('unhorse: the steed dying under a live rider severs and dazes',
    rider.mountId === undefined && !rider.dead
    && rider.statuses.some(s => s.id === MOUNT_CFG.unhorse.status));
  check('unhorse: the rider fights on afoot (brain no longer saddle-held)',
    (step(w, 1.2), !rider.dead));

  // The widow, 'fight' face: the warg keeps its own war and turns real.
  const w2 = makeSimWorld('summoner', 0x2402);
  const rider2 = spawn(w2, 'goblin_wolfrider');
  rider2.pos = vec(w2.player.pos.x + 900, w2.player.pos.y);
  tick(w2, 0.1);
  const steed2 = steedOf(w2, rider2)!;
  w2.kill(rider2, false);
  tick(w2, 0.05);
  check("widow 'fight': the empty-saddle steed keeps its brain (no panic) and turns snapshot-real",
    steed2.riderIds === undefined && !steed2.dead
    && !steed2.statuses.some(s => s.id === 'horrified')
    && steed2.fromZoneGen === true);

  // The widow, 'rout' face: the scratch howdah's nerve breaks when the
  // LAST crewman falls — and only then.
  const w3 = makeSimWorld('summoner', 0x2403);
  const howdah = spawn(w3, 'probe_howdah');
  howdah.pos = vec(w3.player.pos.x + 900, w3.player.pos.y + 60);
  tick(w3, 0.1);
  const crew = w3.actors.filter(a => a.mountId === howdah.id);
  w3.kill(crew[0], false);
  tick(w3, 0.05);
  const early = howdah.statuses.some(s => s.id === 'horrified');
  w3.kill(crew[1], false);
  tick(w3, 0.05);
  check("widow 'rout': the nerve breaks only when the LAST saddle empties",
    !early && howdah.statuses.some(s => s.id === 'horrified'));
}

// --- 5) The remount rule (pure data, the mount verb) ------------------------
{
  const w = makeSimWorld('summoner', 0x2501);
  const p = w.player;
  p.sheet.setSource('probe', [
    mod('life', 'flat', 1e6), mod('armor', 'flat', 1e6), mod('evasion', 'flat', 1e6),
  ]);
  p.fillResources();
  const rider = spawn(w, 'goblin_wolfrider');
  rider.pos = vec(p.pos.x + 300, p.pos.y);
  tick(w, 0.1);
  const first = steedOf(w, rider)!;
  const spare = spawn(w, 'warg');
  spare.pos = vec(rider.pos.x + 160, rider.pos.y + 40);
  w.kill(first, false);
  tick(w, 0.05);
  check('remount: the tumble leaves him afoot beside a free saddle',
    rider.mountId === undefined && !rider.dead);
  let took = 0;
  for (let t = 0; t < 25 && rider.mountId === undefined && !rider.dead; t += 0.5) {
    step(w, 0.5);
    took = t + 0.5;
  }
  check('remount: the rider vaults onto the widowed saddle by pure data',
    rider.mountId === spare.id && spare.riderIds?.[0] === rider.id,
    `${took.toFixed(1)}s`);
}

// --- 6) Severance interplay: the grip, the willed step, the footwork gate ---
{
  const w = makeSimWorld('summoner', 0x2601);
  const rider = spawn(w, 'goblin_wolfrider');
  rider.pos = vec(w.player.pos.x + 900, w.player.pos.y);
  tick(w, 0.1);
  // A REAL hold (holder's gripping + victim's heldBy — anything less is
  // repaired away by the grab sweep's own orphan pass, correctly).
  w.player.gripping = {
    id: rider.id, verb: 'carry', until: w.time + 6, spec: { verb: 'carry' },
    struggle: 0, severed: 0, statusAt: 0, dotAcc: 0, bearing: 0,
  } as GripHold;
  rider.heldBy = w.player.id;
  tick(w, 0.05);
  check('interplay: a landed grip tears the rider from the saddle',
    rider.mountId === undefined);
  w.player.gripping = undefined;
  rider.heldBy = undefined;
  tick(w, 0.1);
  // The flag has latched — pair a fresh rider for the next two laws.
  const rider2 = spawn(w, 'goblin_wolfrider');
  rider2.pos = vec(w.player.pos.x + 900, w.player.pos.y + 200);
  tick(w, 0.1);
  const steed2 = steedOf(w, rider2)!;
  const dash = rider2.skills.find(s => s?.def.id === 'dash_strike');
  rider2.fillResources();
  check('interplay: the saddle refuses footwork (movement-tagged casts)',
    !!dash && w.useSkill(rider2, dash, vec(rider2.pos.x + 100, rider2.pos.y)) === false);
  check('interplay: a willed step quits the saddle first, then walks',
    (w.moveActor(rider2, 1, 0, DT), rider2.mountId === undefined
      && steed2.riderIds === undefined));
  check('interplay: afoot, the same footwork casts freely',
    !!dash && w.useSkill(rider2, dash, vec(rider2.pos.x + 100, rider2.pos.y)) === true);
}

// --- 7) The pen's ambush laws (visible, pack, wound-spring) -----------------
{
  const w = makeSimWorld('summoner', 0x2701);
  const p = w.player;
  const pen = [spawn(w, 'cave_gnasher'), spawn(w, 'cave_gnasher'), spawn(w, 'cave_gnasher')];
  const spec = { radius: 150, visible: true, pack: 400, announce: 'the pen springs!' };
  pen.forEach((g, i) => {
    g.pos = vec(p.pos.x + 600 + i * 60, p.pos.y);
    g.ambushSpec = spec;
    w.armAmbush(g, spec);
  });
  tick(w, 0.3);
  check('pen: a visible armed herd waits in the open (targetable, unhidden)',
    pen.every(g => g.ambushArmed && !g.untargetable && g.sheet.get('invisible') === 0));
  p.pos = vec(pen[0].pos.x - 120, pen[0].pos.y);
  tick(w, 0.3);
  check('pen: straying to the fence springs the WHOLE herd as one event',
    pen.every(g => !g.ambushArmed));

  // Wound-spring: a tiny wake radius never fires by proximity; the arrow
  // does — and the pack law carries the spring to armed kin far away.
  const w2 = makeSimWorld('summoner', 0x2702);
  const near = spawn(w2, 'cave_gnasher');
  const far = spawn(w2, 'cave_gnasher');
  const spec2 = { radius: 1, visible: true, pack: 400 };
  near.pos = vec(w2.player.pos.x + 200, w2.player.pos.y);
  far.pos = vec(near.pos.x + 320, near.pos.y);
  for (const g of [near, far]) {
    g.ambushSpec = spec2;
    w2.armAmbush(g, spec2);
    g.sheet.setSource('probe', [mod('evasion', 'flat', -1e6)]); // the blow must land
  }
  const dog = spawn(w2, 'zombie', 5, 'player');
  dog.pos = vec(near.pos.x - 40, near.pos.y);
  step(w2, 4);
  check('pen: a wound springs the waiting body at once — and its far kin with it',
    !near.ambushArmed && !far.ambushArmed);
}

// --- 8) No orphans after mass death -----------------------------------------
{
  const w = makeSimWorld('summoner', 0x2801);
  const riders = [spawn(w, 'goblin_wolfrider'), spawn(w, 'barrow_lancer'), spawn(w, 'hoarfrost_lancer')];
  riders.forEach((r, i) => { r.pos = vec(w.player.pos.x + 800, w.player.pos.y + i * 120); });
  tick(w, 0.1);
  const steeds = riders.map(r => steedOf(w, r)!);
  check('mass: three pairs stand', steeds.every(s => !!s && !s.dead));
  w.kill(steeds[0], false);            // unhorse lane
  w.kill(riders[1], false);            // widow lane
  w.kill(riders[2], false); w.kill(steeds[2], false); // both fall
  tick(w, 0.2);
  const orphans = w.actors.filter(a =>
    (a.mountId !== undefined && !w.actors.some(m => m.id === a.mountId && !m.dead))
    || (a.riderIds?.some(id => !w.actors.some(r => r.id === id && !r.dead))));
  check('mass: every link self-heals — no orphan ids survive the sweep',
    orphans.length === 0, orphans.map(o => o.defId).join(','));
}

// --- 9) Determinism (the same seed writes the same cavalry) -----------------
{
  const script = (seed: number): string => {
    const w = makeSimWorld('summoner', seed);
    const rider = spawn(w, 'goblin_wolfrider');
    rider.pos = vec(w.player.pos.x + 700, w.player.pos.y);
    const howdah = spawn(w, 'probe_howdah');
    howdah.pos = vec(w.player.pos.x + 700, w.player.pos.y + 300);
    tick(w, 2);
    return w.actors.map(a => `${a.defId ?? 'hero'}:${a.pos.x.toFixed(2)},${a.pos.y.toFixed(2)}`).join('|');
  };
  seedGlobalRandom(0x77aa);
  const a = script(0x5eed);
  seedGlobalRandom(0x77aa);
  const b = script(0x5eed);
  check('determinism: the same seed writes the same pairs', a === b);
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
