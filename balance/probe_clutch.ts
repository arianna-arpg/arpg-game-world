// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE CLUTCH FABRIC end to end on the real engine
// (engine/clutch.ts; docs/engine/clutch.md). Pins:
//   - THE MORTAR: a mother's storm-lobbed shell BIRTHS at its landing —
//     force-cast vile_clutch through the ONE pipeline (useSkill) stands
//     vile_spawn up near the aim: bornOf-stamped, faction-inherited,
//     enemy-team, at HER level, noBounty by the conjured-stream law,
//   - THE CLUTCH CAP: the live bornOf census refuses past cap (no
//     eviction), and killing children re-opens the headroom,
//   - THE DIAL LAWS: bounty 'full' pays, `tag` stamps, caps hold — the
//     spec is configuration, never bespoke behavior,
//   - THE POOL BREATHES: gravecast's pool folds presence envelopes at the
//     CASTER'S level (a level-1 sexton can never raise the from-8 archer;
//     the young graves shamble),
//   - THE HIT GATE: cinderwisp's onHit birth mints ONLY where a blow
//     landed — a struck dummy leaves a sprite (an owned, mortal, capped
//     MINION through the standing summon law), an empty flight breeds
//     nothing,
//   - THE ROSTER LAW: player-lane births ride spawnMinion's evict-oldest
//     cap (never more than `cap` sprites alive),
//   - THE LANDING GEM: Broodbearer grafts a birth onto a birthless host —
//     a flight's end BEARS with no victim at all (the ground is the womb),
//     and the 'landing' mechanism refuses hosts with nowhere to stand,
//   - THE KINDRED RULE: a native birth wins the slot over the socketed
//     graft (instanceBirth resolves native-first).
// Run: npx tsx balance/probe_clutch.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec, dist } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { makeSkillInstance, supportFitsInst, instanceBirth, SUPPORT_MECHANISMS } from '../src/engine/skills';
import { CLUTCH_CFG, type BirthEffect } from '../src/engine/clutch';
import { TELL_SOURCES } from '../src/engine/tells';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { LOOKS } from '../src/data/looks';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};
const step = (w: World, n = 1): void => { for (let i = 0; i < n; i++) w.update(1 / 60); };
const kitInst = (a: Actor, id: string) => a.skills.find(s => s?.def.id === id)!;
// Seat a granted instance on the player's BAR (the throng-grant idiom):
// births are minions, and THE UNLEARN SWEEP dismisses any minion whose
// anchor skill is not on its owner's bar — the probe must hold the seat
// exactly as a learned skill would.
const seatInst = (w: World, inst: import('../src/engine/skills').SkillInstance): void => {
  const slot = w.player.skills.findIndex(s => !s);
  if (slot >= 0) w.player.skills[slot] = inst; else w.player.skills.push(inst);
  w.seats[0].meta.knownSkills.set(inst.def.id, inst);
};
const bornOfMother = (w: World, mother: Actor): Actor[] =>
  w.actors.filter(a => !a.dead && a.bornOf === mother.id);

// ------------------------------------------------------------- spec + census
{
  const birthOf = (skillId: string): BirthEffect | undefined =>
    SKILLS[skillId]?.effects.find((e): e is BirthEffect => e.type === 'birth');
  check('census: the three mothers\' mortars and Cinderwisp all carry `birth` rows',
    !!birthOf('vile_clutch') && !!birthOf('gravecast') && !!birthOf('whelp_toss') && !!birthOf('cinderwisp'));
  check('census: every birth id resolves to a registered MonsterDef',
    ['vile_clutch', 'whelp_toss', 'cinderwisp'].every(sid => !!MONSTERS[birthOf(sid)!.monsterId!])
    && (birthOf('gravecast')!.pool ?? []).every(r => !!MONSTERS[r.id]));
  check('census: Broodbearer carries the SupportDef.birth graft naming a real kind',
    !!SUPPORTS.broodbearer.birth && !!MONSTERS[SUPPORTS.broodbearer.birth.monsterId!]);
  check('census: the mothers stand in their war rosters + country tables (data seats)',
    !!MONSTERS.vile_broodmother && !!MONSTERS.barrow_gravemaker && !!MONSTERS.goblin_whelpsling
    && MONSTERS.vile_broodmother.faction === 'demon'
    && MONSTERS.barrow_gravemaker.faction === 'undead'
    && MONSTERS.goblin_whelpsling.faction === 'goblin');
  // THE LANDING MECHANISM: structural, by delivery shape.
  const landing = SUPPORT_MECHANISMS.landing;
  check('landing mechanism: flights, storms and ground land — auras and summons refuse',
    landing(makeSkillInstance(SKILLS.firebolt, 1)) === true
    && landing(makeSkillInstance(SKILLS.storm_call, 1)) === true
    && landing(makeSkillInstance(SKILLS.summon_skeleton, 1)) === false);
  check('landing gate: Broodbearer FITS a projectile and REFUSES a summon host',
    supportFitsInst(SUPPORTS.broodbearer, makeSkillInstance(SKILLS.firebolt, 1)) === true
    && supportFitsInst(SUPPORTS.broodbearer, makeSkillInstance(SKILLS.summon_skeleton, 1)) === false);
  check('landing gate: a flight that lives AT THE HAND has no landing (orbit + catch refuse)',
    landing(makeSkillInstance(SKILLS.orbital_blades, 1)) === false
    && landing(makeSkillInstance(SKILLS.whirlaxe, 1)) === false);
}

// ------------------------------------------------------ the mortar (pipeline)
{
  seedGlobalRandom(101);
  const w = makeSimWorld('warrior', 101);
  w.player.pos = vec(2200, 2200); // far — the mother's brain stays idle
  const mother = spawn(w, 'vile_broodmother', 6, 500, 500);
  const aim = vec(760, 500);
  const ok = w.useSkill(mother, kitInst(mother, 'vile_clutch'), aim);
  check('mortar: the mother casts her clutch through the ONE pipeline', ok === true);
  // The landing is a womb: watch the strikes land and the brood stand up.
  let sawEmergence = false;
  for (let i = 0; i < 200 && !bornOfMother(w, mother).length; i++) {
    step(w, 1);
    if (bornOfMother(w, mother).length && w.emergences.length) sawEmergence = true;
  }
  const brood = bornOfMother(w, mother);
  check('mortar: the shell\'s landing BIRTHS — vile spawn stand in the ring',
    brood.length >= 1 && brood.length <= 4, `born ${brood.length}`);
  check('mortar: children stand NEAR the aim (strike scatter + birth scatter + free-spot)',
    brood.every(c => dist(c.pos, aim) < 170),
    brood.map(c => dist(c.pos, aim).toFixed(0)).join(','));
  check('mortar: children are enemy-team kin at the MOTHER\'S level, faction-inherited',
    brood.every(c => c.team === 'enemy' && c.level === mother.level && c.faction === 'demon'));
  check('mortar: bornOf stamps the census; the conjured-stream law holds (noBounty)',
    brood.every(c => c.bornOf === mother.id && c.noBounty));
  check('mortar: the arrival plays the emergence grammar (the birth frame emerges)',
    sawEmergence);
}

// ----------------------------------------------- the clutch cap + the dials
{
  seedGlobalRandom(211);
  const w = makeSimWorld('warrior', 211);
  w.player.pos = vec(2200, 2200);
  const mother = spawn(w, 'vile_broodmother', 6, 500, 500);
  const inst = kitInst(mother, 'vile_clutch');
  const fx: BirthEffect = { type: 'birth', monsterId: 'vile_spawn', count: [1, 1], cap: 3 };
  for (let i = 0; i < 8; i++) w.birthAt(mother, inst, fx, vec(700, 500));
  check('cap: the live bornOf census refuses past cap — no eviction, no overflow',
    bornOfMother(w, mother).length === 3, `live ${bornOfMother(w, mother).length}`);
  // Killing children re-opens the headroom (the census reads the LIVING).
  bornOfMother(w, mother).slice(0, 2).forEach(c => { c.dead = true; });
  w.birthAt(mother, inst, fx, vec(700, 500));
  check('cap: the fallen free their seats — a later shell bears again',
    bornOfMother(w, mother).length === 2, `live ${bornOfMother(w, mother).length}`);
  // THE DIALS: bounty 'full' pays; `tag` stamps (the spec is configuration).
  const paid = w.birthAt(mother, inst,
    { type: 'birth', monsterId: 'vile_spawn', bounty: 'full', tag: 'critter', cap: 50 }, vec(900, 700));
  check('dials: bounty \'full\' opts a brood INTO paying; the tag stamps',
    paid.length === 1 && !paid[0].noBounty && paid[0].tag === 'critter');
}

// ------------------------------------------------------- the pool breathes
{
  seedGlobalRandom(307);
  const w = makeSimWorld('warrior', 307);
  w.player.pos = vec(2200, 2200);
  const poolFx = SKILLS.gravecast.effects.find((e): e is BirthEffect => e.type === 'birth')!;
  const roll = (lv: number, casts: number): Set<string> => {
    const sexton = spawn(w, 'barrow_gravemaker', lv, 400, 400);
    const inst = kitInst(sexton, 'gravecast');
    const seen = new Set<string>();
    for (let i = 0; i < casts; i++) {
      const born = w.birthAt(sexton, inst, { ...poolFx, cap: 999 }, vec(600, 400));
      born.forEach(c => { seen.add(c.defId!); c.dead = true; });
    }
    sexton.dead = true;
    return seen;
  };
  const young = roll(1, 25);
  check('pool: a level-1 sexton NEVER raises the from-8 archer (the hard gate)',
    !young.has('skeleton_archer'), [...young].join(','));
  check('pool: the young graves SHAMBLE (zombies answer the early call)',
    young.has('zombie'), [...young].join(','));
  const deep = roll(12, 25);
  check('pool: a deep-country sexton raises worthier dead beside the shamble',
    [...deep].every(id => ['zombie', 'skeleton_warrior', 'skeleton_archer'].includes(id))
    && deep.size >= 2, [...deep].join(','));
}

// ---------------------------------------------- the hit gate (player lane)
{
  seedGlobalRandom(401);
  const w = makeSimWorld('warrior', 401);
  w.player.pos = vec(600, 500);
  const dummy = spawn(w, 'zombie', 1, 760, 500);
  const inst = makeSkillInstance(SKILLS.cinderwisp, 1);
  inst.granted = true; // the class-kit re-kindle idiom: the game's own gift
  seatInst(w, inst);   // learned = seated — the unlearn sweep must see the anchor
  check('hit gate: the cast fires', w.useSkill(w.player, inst, vec(760, 500)) === true);
  step(w, 150);
  const sprites = (): Actor[] => w.actors.filter(a => !a.dead && a.defId === 'cinder_sprite');
  check('hit gate: the LANDED ember births a sprite out of the wound',
    sprites().length === 1 && dummy.life < dummy.maxLife(),
    `sprites ${sprites().length}`);
  const sp = sprites()[0];
  check('hit gate: the sprite is an ORDINARY minion (owner, source skill, mortal, no bounty)',
    !!sp && sp.owner === w.player && sp.sourceSkillId === 'cinderwisp'
    && sp.lifespan > 0 && sp.noBounty && sp.team === 'player',
    `lifespan ${sp?.lifespan?.toFixed(1)}`);
  // The empty flight: aim past nothing — the ember dies in the dirt.
  const w2 = makeSimWorld('warrior', 403);
  w2.player.pos = vec(600, 500);
  const inst2 = makeSkillInstance(SKILLS.cinderwisp, 1);
  inst2.granted = true;
  seatInst(w2, inst2);
  w2.useSkill(w2.player, inst2, vec(1000, 500));
  step(w2, 200);
  check('hit gate: a flight that ends in the DIRT breeds nothing (onHit refuses)',
    w2.actors.every(a => a.defId !== 'cinder_sprite'));
}

// ------------------------------------------------- the roster law (minions)
{
  seedGlobalRandom(503);
  const w = makeSimWorld('warrior', 503);
  w.player.pos = vec(600, 500);
  const tough = spawn(w, 'zombie', 1, 760, 500);
  tough.sheet.setBase('life', 4000);
  tough.life = tough.maxLife(); // the raise fills the pool (three embers must all LAND)
  const inst = makeSkillInstance(SKILLS.cinderwisp, 1);
  inst.granted = true;
  seatInst(w, inst); // ONE seated instance pressed thrice — the real shape
  for (let c = 0; c < 3; c++) {
    w.player.mana = w.player.maxMana(); // the rig pays attention to caps, not costs
    w.useSkill(w.player, inst, vec(760, 500));
    step(w, 130);
  }
  const live = w.actors.filter(a => !a.dead && a.defId === 'cinder_sprite');
  check('roster law: player-lane births ride spawnMinion\'s cap (evict-oldest, never a pile)',
    live.length <= 2 && live.length >= 1, `live ${live.length}`);
}

// ------------------------------------------------ the landing gem (no victim)
{
  seedGlobalRandom(601);
  const w = makeSimWorld('warrior', 601);
  w.player.pos = vec(600, 500);
  const inst = makeSkillInstance(SKILLS.firebolt, 1);
  inst.granted = true;
  inst.sockets[0] = { def: SUPPORTS.broodbearer, level: 1 };
  seatInst(w, inst); // the graft's brood answers to the HOST's bar seat
  w.useSkill(w.player, inst, vec(1000, 500)); // empty air — no victim anywhere
  step(w, 200);
  const brood = w.actors.filter(a => !a.dead && a.defId === 'broodling' && a.owner === w.player);
  check('landing gem: the flight\'s end BEARS with no victim at all (the ground is the womb)',
    brood.length === 1, `broodlings ${brood.length}`);
  check('landing gem: the graft\'s brood is an owned, mortal minion',
    brood.every(b => b.lifespan > 0 && b.sourceSkillId === 'firebolt'));
}

// ------------------------------------------------------- the kindred rule
{
  const inst = makeSkillInstance(SKILLS.vile_clutch, 1);
  inst.sockets[0] = { def: SUPPORTS.broodbearer, level: 1 };
  const resolved = instanceBirth(inst);
  check('kindred: a native birth WINS the slot over the socketed graft',
    resolved?.monsterId === 'vile_spawn');
  const bare = makeSkillInstance(SKILLS.firebolt, 1);
  bare.sockets[0] = { def: SUPPORTS.broodbearer, level: 1 };
  check('kindred: a birthless host reads the graft (the gem\'s whole purpose)',
    instanceBirth(bare)?.monsterId === 'broodling');
}

// ------------------------------------------------ the orphan fates (Card 2)
{
  seedGlobalRandom(701);
  const w = makeSimWorld('warrior', 701);
  w.player.pos = vec(2200, 2200);
  const mother = spawn(w, 'vile_broodmother', 6, 500, 500);
  const inst = kitInst(mother, 'vile_clutch');
  const lay = (fx: Partial<BirthEffect>, x: number): Actor[] =>
    w.birthAt(mother, inst,
      { type: 'birth', monsterId: 'vile_spawn', count: [1, 1], cap: 9, ...fx }, vec(x, 520));
  const raging = lay({ orphan: 'frenzy' }, 640);
  const routing = lay({ orphan: 'rout', monsterId: 'gnasher_whelp' }, 680);
  const fading = lay({ orphan: 'wither' }, 720);
  const stopping = lay({ orphan: 'die' }, 760);
  const persisting = lay({}, 800);
  check('orphans: five births stand, each wearing its OWN authored fate',
    [raging, routing, fading, stopping, persisting].every(b => b.length === 1));
  w.kill(mother);
  check('orphans: "it depends on the mother" — frenzy rages, rout panics, wither fades, die stops, absent persists',
    !!raging[0].buffs.get('orphan_frenzy')
    && routing[0].statuses.some(s => s.id === CLUTCH_CFG.orphan.rout.status)
    && fading[0].lifespan === CLUTCH_CFG.orphan.witherSec && !fading[0].dead
    && stopping[0].dead
    && !persisting[0].dead && !persisting[0].buffs.get('orphan_frenzy')
    && persisting[0].lifespan === 0,
    `frenzy=${!!raging[0].buffs.get('orphan_frenzy')} rout=${routing[0].statuses.map(s => s.id).join('/')} wither=${fading[0].lifespan} die=${stopping[0].dead}`);
  check('orphans: THE LAST CLUTCH — her death itself births (the onDeath spasm)',
    w.actors.filter(a => !a.dead && a.defId === 'vile_spawn' && a.bornOf === undefined).length >= 2);
}

// ---------------------------------------------------- the egg lane (Card 3)
{
  seedGlobalRandom(809);
  const w = makeSimWorld('warrior', 809);
  w.player.pos = vec(2200, 2200);
  const mother = spawn(w, 'vile_broodmother', 6, 500, 500);
  const inst = kitInst(mother, 'vile_clutch');
  const fx: BirthEffect = {
    type: 'birth', monsterId: 'vile_spawn', count: [1, 1], cap: 8,
    incubate: { sec: 0.8 },
  };
  const laid = w.birthAt(mother, inst, fx, vec(700, 500));
  check('egg: the landing lays a VESSEL, not the brood — and it holds a cap seat',
    laid.length === 1 && laid[0].defId === 'clutch_egg' && laid[0].bornOf === mother.id
    && !!laid[0].eggHatch && w.actors.every(a => a.defId !== 'vile_spawn'));
  step(w, 80); // past term + a sweep beat
  const hatched = w.actors.filter(a => !a.dead && a.defId === 'vile_spawn');
  check('egg: at term it bursts — the brood hatch as the EGG\'S own (free recursion, the Card-5 default)',
    laid[0].dead && hatched.length === 1 && hatched[0].bornOf === laid[0].id,
    `hatched ${hatched.length}, bornOf ${hatched[0]?.bornOf} vs egg ${laid[0].id}`);
  // The broken egg: nothing is ever born (the counterplay window).
  const laid2 = w.birthAt(mother, inst, fx, vec(760, 620));
  w.kill(laid2[0]);
  const before = w.actors.filter(a => !a.dead && a.defId === 'vile_spawn').length;
  step(w, 80);
  check('egg: broken before term, nothing is born',
    w.actors.filter(a => !a.dead && a.defId === 'vile_spawn').length === before);
}

// ---------------------------------------------------- the proc door (Card 4)
{
  seedGlobalRandom(907);
  const w = makeSimWorld('warrior', 907);
  w.player.pos = vec(600, 500);
  const dummy = spawn(w, 'zombie', 1, 700, 500);
  const procDef = {
    id: 'rig_birth', name: 'Rig Birth', color: '#ffffff', trigger: 'hit',
    effect: { type: 'birth', birth: { type: 'birth', monsterId: 'broodling', duration: 6, cap: 2 } },
  };
  const fire = (): void => (w as unknown as {
    executeProc(p: unknown, c: Actor, i: null, t: Actor, d: number): void;
  }).executeProc(procDef, w.player, null, dummy, 0);
  fire();
  const conscripts = (): Actor[] =>
    w.actors.filter(a => !a.dead && a.defId === 'broodling' && a.owner === w.player);
  check('proc door: a bare trigger births a capped, mortal minion for the keeper (no host skill)',
    conscripts().length === 1 && conscripts()[0].sourceSkillId === '__proc:rig_birth'
    && conscripts()[0].lifespan > 0);
  for (let i = 0; i < 5; i++) fire();
  check('proc door: the Forgebound census key holds the cap under a hammer',
    conscripts().length === 2, `live ${conscripts().length}`);
}

// -------------------------------------------------- the clutch tell (Card 6)
{
  seedGlobalRandom(1009);
  const w = makeSimWorld('warrior', 1009);
  w.player.pos = vec(2200, 2200);
  const slinger = spawn(w, 'goblin_whelpsling', 5, 500, 500);
  const inst = kitInst(slinger, 'whelp_toss');
  const fx = SKILLS.whelp_toss.effects.find((e): e is BirthEffect => e.type === 'birth')!;
  const litter = w.birthAt(slinger, inst, fx, vec(650, 500));
  const read = (): number =>
    TELL_SOURCES.clutch(slinger as never, w as never);
  check('clutch tell: the source reads the live litter off the SAME census the cap tests',
    litter.length >= 2 && read() === litter.length, `read ${read()} vs ${litter.length}`);
  w.kill(litter[0]);
  check('clutch tell: a fallen pup empties the crate honestly (the death seam restamps)',
    read() === litter.length - 1, `read ${read()}`);
  check('clutch tell: the def wears it and the look stays bare (the accumulator law)',
    (MONSTERS.goblin_whelpsling.tells ?? []).some(t => t.source === 'clutch')
    && !(LOOKS.goblin_whelpsling.parts ?? []).some(p => p.kind === 'crateBox'));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
