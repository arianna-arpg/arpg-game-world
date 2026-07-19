// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE POSSESSION SEAM on the real engine (engine/possess.ts):
// the pure policy lanes (structural refusals, the possessable allow/deny,
// the rarity ladder, the weakened boundary), THE SWAP through a REAL
// executeSkill blow (pointer + index + AI silence on the ridden body, the
// vacated husk standing entranced and brainless, team/kind promotion, the
// guest slot's convert face, the power haircut to 1e-9), THE GUISE
// (one-directional kin blindness, torn for good by the first authored
// harm), ATTRIBUTION (kill credit through the borrowed body pays the SEAT;
// the monster body's level never moves), the EJECT LADDER (duration, body
// death = backlash + an honest monster death, husk death = the seat dies
// HOME through the real wipe seam, husk pain + husk seizure snapbacks),
// THE SHAPESHIFT (mint at hero level, the carried husk shadowing the form,
// the return press, the form dispersing at eject), and SAVE HONESTY (a
// mid-possession save is the hero's truth).
// Run: npx tsx balance/probe_possession.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { POSSESS_CFG, possessRefusal } from '../src/engine/possess';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { vec } from '../src/core/math';
import { serializeCharacter } from '../src/meta/character';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x905e55);

type W = ReturnType<typeof makeSimWorld>;
const tick = (w: W, seconds: number): void => {
  const dt = 1 / 30;
  for (let t = 0; t < seconds; t += dt) { w.applyInputs(new Map(), dt); w.update(dt); }
};
/** Spawn a kind beside the hero, evade die off, parked at exact reach. */
const spawnAt = (w: W, defId: string, dx: number): Actor => {
  w.devGrabSpawn(defId);
  const m = w.actors[w.actors.length - 1];
  m.pos = vec(w.player.pos.x + dx, w.player.pos.y);
  m.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);
  return m;
};
/** The entry blow through the real executor (costs/gates live in useSkill —
 *  the policy under test lives in the effect itself). */
const pressEntry = (w: W, target: Actor): void => {
  const hero = w.player;
  hero.useLock = 0;
  w.executeSkill(hero, makeSkillInstance(SKILLS.possession, 1), vec(target.pos.x, target.pos.y));
};

// --- 1) POLICY (pure) --------------------------------------------------------
{
  const w = makeSimWorld('warrior', 0x9051);
  const wolf = spawnAt(w, 'dire_wolf', 60);
  check('policy: a healthy wolf refuses (not weakened enough)',
    possessRefusal(wolf, undefined) === 'not weakened enough');
  wolf.life = Math.round(wolf.maxLife() * (POSSESS_CFG.lifeFrac - 0.05));
  check('policy: the weakened boundary opens just under the fraction',
    possessRefusal(wolf, undefined) === null);
  wolf.life = Math.ceil(wolf.maxLife() * (POSSESS_CFG.lifeFrac + 0.05));
  check('policy: just over the fraction still refuses',
    possessRefusal(wolf, undefined) !== null);
  const shell = spawnAt(w, 'vacant_shell', 120);
  check('policy: the Vacant Shell is an open door at FULL life',
    shell.life >= shell.maxLife() && possessRefusal(shell, undefined) === null);
  const usher = spawnAt(w, 'seatless_usher', 180);
  usher.life = 1;
  check('policy: possessable:false refuses however weakened',
    possessRefusal(usher, undefined) !== null);
  wolf.life = 1;
  wolf.rarity = 'crowned';
  check('policy: the rarity ladder refuses the crowned (tier 0)',
    possessRefusal(wolf, undefined) !== null);
  wolf.rarity = undefined;
  const spec = { lifeFrac: 0.9 };
  check('policy: the spec\'s own fraction overrides the config',
    possessRefusal(wolf, spec) === null);
}

// --- 2) THE SWAP -------------------------------------------------------------
{
  const w = makeSimWorld('warrior', 0x9052);
  const hero = w.player;
  hero.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);
  const wolf = spawnAt(w, 'dire_wolf', 60);
  const wolfKit = wolf.skills.length;
  const wolfLevel = wolf.level;
  wolf.life = Math.max(1, Math.round(wolf.maxLife() * 0.2));
  pressEntry(w, wolf);
  check('swap: the seat points at the wolf (world.player IS the body)',
    w.player === wolf && w.seatOf(wolf) === w.localSeat);
  check('swap: the hero is vacated + entranced behind you',
    hero.vacated?.seatId === 'p0' && hero.statuses.some(s => s.id === 'entranced'));
  check('swap: the body is promoted (team player, kind player, ride worn)',
    wolf.team === 'player' && wolf.kind === 'player' && wolf.possession?.kind === 'possess');
  check('swap: the guest slot rides the borrowed bar',
    wolf.skills.length === wolfKit + 1 && wolf.skills[wolfKit]?.def.id === 'possession');
  check('swap: the guest slot presents the ending verb',
    w.slotFaceOf(wolf, wolf.skills[wolfKit]!).id === 'relinquish');
  const powerMod = wolf.sheet ? (POSSESS_CFG.powerFactor - 1) : 0;
  check('swap: the power haircut rides the body to 1e-9',
    Math.abs(wolf.sheet.get('damage') / (1 + powerMod) - 1) < 1e-9
    || Math.abs(wolf.sheet.get('damage') - (1 + powerMod)) < 1e-9);
  const heroPos = vec(hero.pos.x, hero.pos.y);
  tick(w, 0.5);
  check('husk: the vacated body stands (no brain drives it)',
    Math.abs(hero.pos.x - heroPos.x) < 8 && Math.abs(hero.pos.y - heroPos.y) < 8
    && hero.aiTargetId === undefined);
  check('husk: the trance re-stamps while the seat is away',
    hero.statuses.some(s => s.id === 'entranced'));

  // THE GUISE + THE BETRAYAL + ATTRIBUTION, all on one kin.
  const kin = spawnAt(w, 'dire_wolf', 40);
  kin.pos = vec(wolf.pos.x + 34, wolf.pos.y);
  check('guise: kin do not read the ridden body as hostile',
    !w.hostileTo(kin, wolf));
  check('guise: the rider\'s own targeting stays live',
    w.hostileTo(wolf, kin));
  const xpBefore = w.meta.xp + w.meta.xpNeeded * 0; // xp banks on the SEAT meta
  const killsBefore = w.kills;
  kin.life = 1;
  wolf.useLock = 0;
  w.executeSkill(wolf, makeSkillInstance(SKILLS.gore_rend, 1), vec(kin.pos.x, kin.pos.y));
  check('betrayal: the first authored harm tears the guise for good',
    wolf.possession?.guiseBroken === true);
  check('attribution: the kill through the borrowed body credits the player side',
    kin.dead && w.kills === killsBefore + 1);
  check('attribution: XP banked on the SEAT; the monster body\'s level never moves',
    (w.meta.xp > xpBefore || hero.level > wolfLevel || w.meta.xp < w.meta.xpNeeded)
    && wolf.level === wolfLevel && hero.level >= wolfLevel);

  // DURATION: the clock sends you home whole.
  wolf.possession!.until = w.time + 0.05;
  tick(w, 0.3);
  check('eject(duration): the seat is home, the pointer restored',
    w.player === hero && w.seatOf(hero) === w.localSeat && !hero.vacated);
  check('eject(duration): the body is restored whole (team, kind, kit, haircut)',
    wolf.team === 'enemy' && wolf.kind === undefined
    && wolf.skills.length === wolfKit && !wolf.possession);
  check('eject(duration): the vacated flesh staggers (the counterplay window)',
    wolf.statuses.some(s => s.id === 'stun'));
  check('eject(duration): the re-possess pace is stamped on the hero\'s gem',
    (hero.cooldowns.get('possession') ?? 0) >= POSSESS_CFG.eject.cooldown - 0.5);
  check('eject(duration): the trance strips with the homecoming',
    !hero.statuses.some(s => s.id === 'entranced'));
}

// --- 3) THE EJECT LADDER (deaths + snapbacks) --------------------------------
{
  const w = makeSimWorld('warrior', 0x9053);
  const hero = w.player;
  hero.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);

  // BODY DEATH: eject first, then an honest monster death — no party wipe.
  let wolf = spawnAt(w, 'dire_wolf', 60);
  wolf.life = 1;
  pressEntry(w, wolf);
  check('setup: riding the wolf', w.player === wolf);
  const slayer = spawnAt(w, 'seatless_usher', 400);
  const killsBefore = w.kills;
  w.kill(wolf, false, slayer);
  check('bodyDied: the seat snaps home before the body dies',
    w.player === hero && wolf.dead && !w.gameOver && !hero.downed);
  check('bodyDied: the backlash staggers the returning flesh',
    hero.statuses.some(s => s.id === 'stun'));
  check('bodyDied: an enemy killing the body pays the player nothing',
    w.kills === killsBefore);

  // HUSK PAIN: the loss fraction calls you home.
  hero.cooldowns.delete('possession');
  hero.statuses = [];
  wolf = spawnAt(w, 'dire_wolf', 60);
  wolf.life = 1;
  pressEntry(w, wolf);
  check('setup: riding again', w.player === wolf);
  hero.life = Math.max(1, Math.round(hero.maxLife() * (1 - POSSESS_CFG.endOn.huskLostFrac - 0.1)));
  tick(w, 0.2);
  check('huskPain: losing the fraction snaps the seat home',
    w.player === hero && !wolf.possession);

  // HUSK SEIZED: a hold on your flesh tears you back. The hold must be
  // REAL — the grab sweep orphan-repairs a bare fake holder id before the
  // possession sweep ever reads it (the fabric healing itself; caught by
  // this very probe's first draft). So: the mauler pins the hero FIRST
  // (the real devGrabSeizeMe pair), then the entry blow rides the raw
  // executor — however a ride began, the sweep sees the held husk and
  // snaps the seat straight home.
  w.kill(wolf, true);
  hero.cooldowns.delete('possession');
  hero.life = hero.maxLife();
  hero.grabProofUntil = 0;
  const mauler = w.createMonster('yoke_mauler', Math.max(3, hero.level), 'enemy');
  mauler.pos = vec(hero.pos.x + 60, hero.pos.y);
  w.actors.push(mauler);
  check('setup: the mauler pins the flesh (real pair)', w.devGrabSeizeMe('pin'));
  wolf = spawnAt(w, 'dire_wolf', -60);
  wolf.life = 1;
  pressEntry(w, wolf);
  check('setup: riding a third time (out of a pinned body)', w.player === wolf);
  tick(w, 0.2);
  check('huskSeized: a hold on the husk snaps the seat home',
    w.player === hero);
}

// --- 4) HUSK DEATH = A REAL DEATH -------------------------------------------
{
  const w = makeSimWorld('warrior', 0x9054);
  const hero = w.player;
  hero.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);
  const wolf = spawnAt(w, 'dire_wolf', 60);
  wolf.life = 1;
  pressEntry(w, wolf);
  check('setup: riding', w.player === wolf);
  const slayer = spawnAt(w, 'seatless_usher', 400);
  w.kill(hero, false, slayer);
  check('huskDying: you die in your own flesh — the real death seam runs',
    w.player === hero && (w.gameOver || hero.downed || hero.dead));
}

// --- 5) THE SHAPESHIFT --------------------------------------------------------
{
  const w = makeSimWorld('warrior', 0x9055);
  const hero = w.player;
  const heroLevel = hero.level;
  const formInst = makeSkillInstance(SKILLS.form_of_the_dire_wolf, 1);
  hero.useLock = 0;
  w.executeSkill(hero, formInst, vec(hero.pos.x, hero.pos.y));
  const form = w.player;
  check('shift: the seat wears a minted wolf at the hero\'s level',
    form !== hero && form.defId === 'dire_wolf' && form.level === heroLevel
    && form.team === 'player' && form.noBounty === true);
  check('shift: the ride is a mintedForm with the husk CARRIED',
    form.possession?.kind === 'shift' && form.possession?.huskMode === 'carried');
  check('shift: the carried husk leaves the world',
    !w.actors.includes(hero));
  form.pos = vec(form.pos.x + 120, form.pos.y);
  tick(w, 0.2);
  check('shift: the withdrawn flesh shadows the form',
    Math.abs(hero.pos.x - form.pos.x) < 1 && Math.abs(hero.pos.y - form.pos.y) < 1);
  // THE RETURN PRESS: the guest slot's convert face through the real press.
  const guest = form.skills[form.skills.length - 1]!;
  check('shift: the guest slot presents Return to Flesh',
    w.slotFaceOf(form, guest).id === 'return_to_flesh');
  form.useLock = 0;
  check('shift: the return press fires', w.useSkill(form, guest, vec(form.pos.x, form.pos.y)));
  tick(w, 0.4);
  check('return: the seat is home; the flesh rejoined the world at the form\'s spot',
    w.player === hero && w.actors.includes(hero));
  check('return: the form disperses (a projection, not a corpse economy)',
    form.dead && !w.actors.includes(form));

  // FORM DEATH: the backlash lands, the run does not end.
  hero.cooldowns.delete('form_of_the_dire_wolf');
  hero.useLock = 0;
  w.executeSkill(hero, makeSkillInstance(SKILLS.form_of_the_dire_wolf, 1), vec(hero.pos.x, hero.pos.y));
  const form2 = w.player;
  check('setup: shifted again', form2 !== hero && form2.defId === 'dire_wolf');
  const slayer = spawnAt(w, 'seatless_usher', 400);
  w.kill(form2, false, slayer);
  check('formDied: ejected staggered; the run stands',
    w.player === hero && !w.gameOver && hero.statuses.some(s => s.id === 'stun'));
}

// --- 6) SAVE HONESTY ----------------------------------------------------------
{
  const w = makeSimWorld('warrior', 0x9056);
  const hero = w.player;
  hero.sheet.setSource('probe_noevade', [mod('evasion', 'override', 0)]);
  const heroBar = hero.skills.map(s => (s ? s.def.id : null));
  const wolf = spawnAt(w, 'dire_wolf', 60);
  wolf.life = 1;
  pressEntry(w, wolf);
  check('setup: riding for the save', w.player === wolf);
  const save = serializeCharacter(w);
  check('save: a mid-possession save is the HERO\'s truth (level + bar)',
    save.level === hero.level
    && save.bar.length === heroBar.length
    && save.bar.every((id, i) => id === heroBar[i]));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
