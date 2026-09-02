// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SCENE FABRIC (engine/scenes.ts + data/scenes.ts) on the
// real engine, headless: the PROLOGUE walked end to end the way a brand-new
// account lives it. Pins the laws the fabric swears:
//   • THE GATE — due only for a virgin account (no roster, no deaths, no
//     credits, no flask graduation), stamped at scene START so it can never
//     re-fire, grandfathering veterans with no migration write.
//   • THE OFF-GRAPH STAGE — the staging zone lives in caveMap, never in the
//     zone graph, never in a serialized save; a mid-scene save's player spot
//     resolves to the surface anchor (the ordinary wake), and teardown
//     deletes the mint outright.
//   • THE REWARD SEAL — every scene spawn is noBounty (a kill pays no xp,
//     no loot) on spoils-'none' ground; the drill counts the hero's own
//     footwork and casts; the assault pours already-hunting waves.
//   • THE COVENANT — a lethal blow FELLS bodily (the world's own downed
//     state: inputs, regeneration and re-kills all refused), never kills;
//     once no seat stands the script LANDS on the wake card after a funeral
//     beat — every stage between is skipped, so an early death NEVER
//     summons the Father (her ruling 2026-09-01: he is a wall reached
//     alive), and the wake's page speaks to what was actually seen.
//   • THE AGENCY RECKONING — the world is NEVER held: the commander stands
//     marked (the attention fabric's chevron), its kit banned, and after the
//     grace beat musters a TEN-second honest cast; THE ENRAGE answers a
//     commander bled below his floor (mortal, furied, the bar surging).
//   • THE WITNESS — the fire-off is ALWAYS seen: the eye walks to the
//     Father for the muster's last breaths and fires on screen, however far
//     the player has run, then comes home to the fallen body for the dark.
//   • THE FELLED FIELD — the blast's end is BODILY: every seat goes DOWN
//     through the world's own downed state (inputs refused, regeneration
//     refused, life honest zero) — the runner past the nova's rim included.
//   • THE FIELD-FALL SURGE — a field the tide fells MID-muster is played in
//     place: the live muster leaps to its last breaths and the horn still
//     ends the road on screen over the bodies.
//   • THE HOLLOW WAKE — the prologue ends in MU, not at the bedside: the
//     spirit stands as a wisp among the class apparitions, the completion
//     key stamps at the threshold, and the run begins only at the pick.
// Run: npx tsx balance/probe_scenes.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import {
  sceneDue, sceneBegin, sceneBegunKey, sceneCardAck, sceneNoteCast,
  muStageLive, muTakeClassRequest,
} from '../src/engine/scenes';
import {
  PROLOGUE_SCENE, type SceneAssaultStage, type SceneCardStage, type SceneReckoningStage,
} from '../src/data/scenes';
import { MU_CFG, APPARITION_PREFIX } from '../src/data/mu';
import { selectableSlotCount } from '../src/meta/account';
import { collectAttention } from '../src/world/attention';
import { vec } from '../src/core/math';
import type { PlayerInput } from '../src/net/intent';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const DT = 1 / 60;
const step = (w: World, s: number): void => {
  for (let t = 0; t < s; t += DT) w.update(DT);
};
/** Step until the condition holds (or the budget runs out) — the cinematic
 *  beats own their clocks; pins wait on STATE, never on stopwatch guesses. */
const until = (w: World, cond: () => boolean, maxSec: number): boolean => {
  for (let t = 0; t < maxSec; t += DT) {
    if (cond()) return true;
    w.update(DT);
  }
  return cond();
};
const ZID = `scene_${PROLOGUE_SCENE.id}`;
const sceneBodies = (w: World): Actor[] =>
  w.actors.filter(a => a.eventKey === `scene:${PROLOGUE_SCENE.id}`);
const stageKind = (w: World): string =>
  w.scene ? String(w.scene.def.stages[w.scene.stageIx]?.kind) : '(no scene)';
/** The prologue's wake card stage (the fall's landing) — its page objects
 *  are shared by reference into the resolved def, so identity pins which
 *  page the landing chose. */
const wakeStage = PROLOGUE_SCENE.stages.find(s => s.kind === 'card' && (s as SceneCardStage).fallCard) as SceneCardStage | undefined;
const castLeft = (a: Actor | undefined): number =>
  a?.casting ? a.casting.total - a.casting.elapsed : Infinity;
/** THE SLAIN LOCK rides standing law: applyInputs refuses a downed seat, so
 *  a pressed stick moves nothing (no update ticks — pure input refusal). */
const inputsRefused = (w: World, p: Actor): boolean => {
  const x0 = p.pos.x, y0 = p.pos.y;
  const shove: PlayerInput = { dx: 1, dy: 0, aim: vec(p.pos.x + 100, p.pos.y), held: [], edge: [] };
  for (let i = 0; i < 30; i++) w.applyInputs(new Map([[w.localSeat.id, shove]]), DT);
  return p.pos.x === x0 && p.pos.y === y0;
};

bootSimEngine();

/** Walk a fresh world to the reckoning ALIVE: the card, the drill sprinted
 *  (footwork, then the five noted strikes), the clash put down, and the
 *  assault's clock jumped to its end — every authored wave pours on the way
 *  out, the milling tide the Father will spend. */
function walkToReckoning(seed: number): { w: World; p: Actor } {
  const w = makeSimWorld('warrior', seed);
  const p = w.player;
  w.account.ledger['tutorial_faction:goblin'] = 1;
  sceneBegin(w, 'prologue');
  step(w, 0.2); // the card must be SET before an ack can land
  sceneCardAck(w);
  step(w, 0.3);
  for (let i = 0; i < 60 * 14; i++) { w.moveActor(p, 1, 0, DT); w.update(DT); }
  for (let i = 0; i < 5; i++) sceneNoteCast(w);
  step(w, 0.2);
  const g = w.actors.find(a => a.defId === 'goblin_skirmisher' && !a.dead);
  if (g) { g.life = 0; w.kill(g, false, p); }
  step(w, 3.0);
  if (w.scene && stageKind(w) === 'assault') {
    w.scene.stageT = (w.scene.def.stages[w.scene.stageIx] as SceneAssaultStage).surviveSec;
    step(w, 0.1);
  }
  return { w, p };
}

// === A) THE GATE ===========================================================
{
  const A = makeSimWorld('warrior', 31001);
  check('A1: a virgin account is DUE the prologue', sceneDue(A.account, 'prologue'));
  check('A2: an unknown scene id is never due', !sceneDue(A.account, 'no_such_scene'));
  const B = makeSimWorld('warrior', 31002);
  B.account.lifetimeCredits = 5;
  check('A3: lifetime credits grandfather the account (no migration write)',
    !sceneDue(B.account, 'prologue'));
  const C = makeSimWorld('warrior', 31003);
  C.account.deaths.push({} as never);
  check('A4: a recorded death grandfathers the account', !sceneDue(C.account, 'prologue'));
  const D = makeSimWorld('warrior', 31004);
  D.account.roster.push({} as never);
  check('A5: a roster vessel grandfathers the account', !sceneDue(D.account, 'prologue'));
  const E = makeSimWorld('warrior', 31005);
  E.account.ledger['mireille_flasks_filled'] = 1;
  check('A6: flask graduation grandfathers the account', !sceneDue(E.account, 'prologue'));
  // THE ABORT LAW: an account that BEGAN the scene stays due whatever the
  // aborted attempt drifted onto it (a roster vessel, a stray credit) —
  // only completion closes the door.
  const F = makeSimWorld('warrior', 31006);
  F.account.ledger[sceneBegunKey(PROLOGUE_SCENE)] = 1;
  F.account.roster.push({} as never);
  F.account.lifetimeCredits = 12;
  check('A7: a BEGUN-but-aborted scene stays due through any account drift',
    sceneDue(F.account, 'prologue'));
  F.account.ledger[PROLOGUE_SCENE.ledger] = 1;
  check('A7b: completion closes the door for good', !sceneDue(F.account, 'prologue'));
}

// === B) BEGIN: the off-graph stage under black ==============================
const w = makeSimWorld('warrior', 31010);
const p = w.player;
const xp0 = w.meta.xp;
// PIN THE GOBLIN LANE: the tutorial-faction resolve (data/commanders.ts,
// loaded by the arena's census imports) rolls a legion per manifest — this
// rig walks the CANON goblin prologue, so pre-stamp the recall. The roll
// itself is probe_mu.ts section G's law.
w.account.ledger['tutorial_faction:goblin'] = 1;
check('B0: the fresh sim account is due', sceneDue(w.account, 'prologue'));
check('B1: sceneBegin takes', sceneBegin(w, 'prologue'));
check('B2: begin stamps the BEGUN mark only — the scene does not COUNT yet, so an abort stays due',
  (w.account.ledger[sceneBegunKey(PROLOGUE_SCENE)] ?? 0) >= 1
  && !(w.account.ledger[PROLOGUE_SCENE.ledger] ?? 0)
  && sceneDue(w.account, 'prologue'));
check('B3: the staging ground is CURRENT and OFF-GRAPH (caveMap, not the graph)',
  w.zone.id === ZID && !!w.caveMap[ZID] && !w.zoneMap[ZID]);
check('B4: the mint is sealed — spoils none, no ambient packs, no exits, authored cohort',
  w.zone.spoils === 'none' && w.zone.packDensity === 0
  && w.zone.cohort === 'authored' && w.zone.exits.length === 0);
check('B4b: the last mile has no edge — the stage arena is BOUNDLESS',
  w.arena.boundless === true);
check('B5: scripted ground holds NO uninvited hostiles',
  w.actors.every(a => a.team !== 'enemy'));
check('B6: born under black, first card pending after the hold',
  w.screenFade >= 1 && stageKind(w) === 'card');
step(w, 0.2);
check('B7: the card is up and the sim is held under it',
  w.scene?.card !== null && w.timeflow.heldBy('cinematic'));

// The serialization law, probed mid-scene: the save never knows the stage.
{
  const ws = w.serializeWorldState();
  check('B8: a mid-scene save carries NO staging zone',
    ws.zones.every(z => z.id !== ZID));
  check('B9: the player spot resolves to the surface anchor (the ordinary wake)',
    ws.player?.zoneId === SIM_ARENA_ID,
    `spot=${ws.player?.zoneId}`);
}

// === C) CARD → DRILL: teach-by-doing fills the one bar ======================
sceneCardAck(w);
step(w, 0.3);
check('C1: the continue releases the hold into the drill',
  stageKind(w) === 'drill' && !w.timeflow.heldBy('cinematic'));
check('C2: the drill prompts (bind tokens resolve at the draw surface)',
  (w.scene?.prompt ?? '').includes('{bind:'));
check('C2b: the teaching rides at the hero\'s eye (the drill takes the hero seat)',
  w.scene?.barAt === 'hero');
// Footwork: the count is the hero's own displacement — run EAST, for real,
// far past the authored span: the boundless ground never says no.
for (let i = 0; i < 60 * 14; i++) { w.moveActor(p, 1, 0, DT); w.update(DT); }
check('C3: footwork fills the first goal (bar past its share)',
  (w.scene?.bar?.frac ?? 0) >= 0.5, `frac=${w.scene?.bar?.frac?.toFixed(2)}`);
check('C3b: the runner is far past the authored span and still on ground (no edge, no clamp)',
  p.pos.x > w.arena.w + 400, `x=${p.pos.x.toFixed(0)} span=${w.arena.w}`);
// Strikes: the input artery's note, five times.
for (let i = 0; i < 5; i++) sceneNoteCast(w);
step(w, 0.2);
check('C4: five casts complete the drill into the clash',
  stageKind(w) === 'clash');

// === D) CLASH: one scripted goblin, rewardless ==============================
step(w, 0.1);
const clash = sceneBodies(w);
check('D1: the clash pours exactly its authored row (one skirmisher)',
  clash.length === 1 && clash[0].defId === 'goblin_skirmisher',
  `bodies=[${clash.map(a => a.defId).join(',')}]`);
check('D2: every scene spawn is stamped rewardless (noBounty)',
  clash.every(a => a.noBounty));
check('D3: the wave overlay has it already hunting', clash[0].aggroed === true);
clash[0].life = 0;
w.kill(clash[0], false, p);
step(w, 0.2);
check('D4: the kill pays NOTHING — no xp moved on rewardless ground',
  w.meta.xp === xp0, `xp ${xp0} -> ${w.meta.xp}`);
step(w, 3.0); // the authored breather
check('D5: the cleared clash breathes, then the assault begins',
  stageKind(w) === 'assault');

// === E) ASSAULT: the tide, already hunting ==================================
step(w, 1.0);
const wave1 = sceneBodies(w).filter(a => !a.dead);
check('E1: the first wave pours on its clock (4 skirmishers)',
  wave1.length >= 4 && wave1.every(a => a.defId === 'goblin_skirmisher'),
  `alive=${wave1.length}`);
check('E2: the whole tide is rewardless', wave1.every(a => a.noBounty));
check('E3: the survival bar climbs', (w.scene?.bar?.frac ?? 0) > 0);
check('E3b: the dawn clock hangs over the field (the assault takes the top seat)',
  w.scene?.barAt === 'top');

// === F) THE EARLY FALL: the covenant lands the script on the wake ===========
// Her ruling 2026-09-01: a death BEFORE the Father is met never summons him.
// The seat goes down bodily on the spot, the world breathes over the body
// for the funeral beat, the dark rises, and the wake's page speaks to what
// was actually seen — the reckoning stage never plays.
const tideAtFall = sceneBodies(w).filter(a => !a.dead).length;
p.life = 0;
w.kill(p);
check('F1: THE BODILY FALL — the hero goes DOWN (downed, life 0, never dead)',
  !p.dead && p.downed && p.life === 0 && p.casting === null);
check('F2: the script LANDS on the wake card — the reckoning is skipped whole',
  stageKind(w) === 'card' && w.scene?.landed === true && w.scene?.fallBeat === true);
check('F2b: the Father is never summoned by a death',
  !w.actors.some(a => a.defId === 'goblin_colossus'));
step(w, 0.6);
check('F3: THE FUNERAL BEAT — the world stays in view over the body (no dark yet, the tide still milling)',
  w.screenFade < 0.05 && w.scene?.card === null
  && sceneBodies(w).filter(a => !a.dead).length === tideAtFall,
  `fade=${w.screenFade.toFixed(2)} tide=${sceneBodies(w).filter(a => !a.dead).length}/${tideAtFall}`);
check('F3b: the body is honestly dead under the beat — no regeneration, guarded from the tide',
  p.downed && p.life === 0 && p.invulnerable && p.untargetable);
check('F3c: the fallen seat\'s inputs are refused whole', inputsRefused(w, p));
check('F4: past the beat the dark rises and the wake card waits',
  until(w, () => w.scene?.card != null && w.screenFade >= 0.995, 6));
check('F5: the landing shows THE EARLY FALL\'s page — no horn was ever heard',
  !!wakeStage && w.scene?.card === wakeStage.fallCard,
  `line0="${w.scene?.card?.lines[0]?.slice(0, 28)}"`);

// === H) THE HOLLOW WAKE: Mu, the wisp, the vessels, the pick ================
sceneCardAck(w);
check('H1: the spirit arrives in MU (off-graph like every scene ground)',
  until(w, () => w.zone.id === 'scene_mu', 4)
  && !!w.caveMap['scene_mu'] && !w.zoneMap['scene_mu']);
step(w, 2.5); // the fade-in runs out
check('H2: the scene is STILL RUNNING — Mu never completes on its own',
  w.scene !== null && muStageLive(w) && w.screenFade <= 0.01);
check('H3: COMPLETION stamps at the threshold — the tutorial never replays, Mu does',
  (w.account.ledger[PROLOGUE_SCENE.ledger] ?? 0) >= 1 && !sceneDue(w.account, 'prologue'));
check('H4: THE WISP — the hero stands as a small guarded light with no kit',
  p.look === MU_CFG.wisp.look && p.radius === MU_CFG.wisp.radius
  && p.invulnerable && p.untargetable && p.skills.every(s => s === null));
check('H4a: the felled field\'s exit — the wisp is neither dead nor downed (inputs live again)',
  !p.dead && !p.downed);
check('H4b: THE HUD VEIL is up (a spirit carries no orbs, no flasks, no bar)',
  w.scene?.hudVeil === true);
// THE ROSTER OF VESSELS: the dealt hand stands awake, the rest of the
// unlocked pool veiled (the sim account force-unlocks every class, so no
// faint cowls here — probe_mu.ts covers the locked remainder).
const apparitions = w.actors.filter(a => a.defId?.startsWith(APPARITION_PREFIX));
const awakeN = apparitions.filter(a => !a.statuses.some(s => s.id === 'mu_veiled' || s.id === 'mu_faint')).length;
check('H5: the vessels stand — hand awake per the class screen\'s own law',
  awakeN === selectableSlotCount(w.account),
  `awake=${awakeN} want=${selectableSlotCount(w.account)} total=${apparitions.length}`);
check('H5b: every apparition is scenery with a name — passive, guarded, untargetable',
  apparitions.length > 0 && apparitions.every(a => a.untargetable && a.invulnerable && a.team === 'player'));
// THE PICK: drift onto an awake vessel, be still, and the class request posts.
{
  const awake = apparitions.find(a => !a.statuses.some(s => s.id === 'mu_veiled'));
  check('H6a: an awake vessel stands to be asked', !!awake);
  if (awake) {
    p.pos.x = awake.pos.x; p.pos.y = awake.pos.y + awake.radius + 8;
    step(w, MU_CFG.dwell.sec + 0.6);
    const req = muTakeClassRequest(w);
    check('H6: the still linger posts THAT class\'s request',
      req !== null && `${APPARITION_PREFIX}${req}` === awake.defId, `req=${req}`);
    check('H6b: the request is consumed whole (no double card)',
      muTakeClassRequest(w) === null);
  }
}
check('H7: no enemy followed the spirit into Mu',
  w.actors.every(a => a.team !== 'enemy'));

// === G) THE AGENCY RECKONING: reached ALIVE, marked, mustered, the field unmade
{
  const { w: w2, p: p2 } = walkToReckoning(31020);
  check('G0: the Father is reached ALIVE — the assault run out, no fall on the way',
    stageKind(w2) === 'reckoning' && !p2.downed && !p2.dead && w2.scene?.fell === false,
    `stage=${stageKind(w2)} downed=${String(p2.downed)}`);
  const col = w2.actors.find(a => a.defId === 'goblin_colossus');
  // THE RIG'S GUARD: the sim hero holds the field so the muster can be
  // watched whole (the poured tide beats on a guarded body); the guard comes
  // OFF for the last breaths below, so the horn itself ends a mortal hero.
  p2.invulnerable = true;
  p2.untargetable = true;
  // Thin the poured tide to four skirmishers — the after-pin follows these
  // ids (dead bodies leave the actor list).
  {
    let kept = 0;
    for (const a of [...w2.actors]) {
      if (a.team !== 'enemy' || a.dead || a === col || a.partLink) continue;
      if (a.defId === 'goblin_skirmisher' && kept < 4) { kept++; continue; }
      a.life = 0;
      w2.kill(a, true);
    }
  }
  const tideIds = w2.actors.filter(a => !a.dead && a.defId === 'goblin_skirmisher').map(a => a.id);
  step(w2, 0.2);
  check('G1: the Hordefather stands off in the dark (rewardless like all scene bodies)',
    !!col && col.noBounty && col.eventKey === `scene:${PROLOGUE_SCENE.id}`);
  check('G2: THE HOLD IS DEAD — the world keeps running while the muster stands (agency, not cinema)',
    !w2.timeflow.heldBy('cinematic') && w2.scene?.focus === null);
  check('G3: THE MARK stands — the chevron source points at the commander by name',
    w2.scene?.mark?.id === col?.id
    && collectAttention(w2).some(pt => pt.id === 'scene_mark' && pt.label === col?.name));
  check('G4: the verb musters through the REAL pipeline after the grace beat',
    until(w2, () => !!col && col.casting !== null, 6),
    `casting=${String(!!col?.casting)}`);
  check('G4b: ten held breaths — the muster is a TEN-second honest cast bar',
    (col?.casting?.total ?? 0) >= 9.5,
    `total=${col?.casting?.total?.toFixed(1)}`);
  // THE ENRAGE, mid-cast (show, never tell): bled below the floor he stays
  // honestly MORTAL — no immunity, no refusal prints — but a visible fury
  // takes him and the bar SURGES to its last breaths.
  const reck = w2.scene?.def.stages[w2.scene.stageIx] as SceneReckoningStage | undefined;
  if (col) col.life = col.maxLife() * (reck?.floorFrac ?? 0.1) * 0.5;
  step(w2, 0.2);
  check('G4c: THE ENRAGE — below the floor he stays mortal, furies, and the bar surges',
    col?.invulnerable === false
    && !!col?.statuses.some(s => s.id === 'rally')
    && castLeft(col) <= 1.5,
    `left=${castLeft(col).toFixed(2)}s`);
  // THE HONEST BLOW: the rig's guard comes off for the last breaths — the
  // horn must end a MORTAL hero itself, through the kill path.
  p2.invulnerable = false;
  p2.untargetable = false;
  // THE WITNESS: the surge dropped the muster inside the pan's lead — the eye
  // engages, and by the travel's end it sits ON the Father (the lerp's k=1 is
  // his live seat, so drawn == scripted exactly).
  check('G4d: THE WITNESS — the eye walks out for the last breaths',
    until(w2, () => w2.scene?.focus !== null, 2));
  step(w2, 0.8); // past travelSec — the pan lands (the dwell holds it if the horn already fired)
  check('G4e: the eye sits on the Father for the fire-off',
    !!w2.scene?.focus && !!col
    && Math.hypot(w2.scene.focus.x - col.pos.x, w2.scene.focus.y - col.pos.y) < 24,
    `d=${w2.scene?.focus && col ? Math.hypot(w2.scene.focus.x - col.pos.x, w2.scene.focus.y - col.pos.y).toFixed(1) : '—'}`);
  check('G5: the blast spends the horde honestly (affects all — the tide lies dead)',
    until(w2, () => tideIds.length > 0
      && tideIds.every(id => w2.actors.every(a => a.id !== id || a.dead)), 16),
    `tide=${tideIds.length}`);
  step(w2, 0.1); // the director's next tick runs the felled-field sweep
  check('G5a: the horn itself ended the hero — the kill path names the Father',
    (w2 as unknown as { lastPlayerKiller: Actor | null }).lastPlayerKiller === col);
  check('G5b: THE FELLED FIELD — the blast leaves the hero BODILY down (downed, life 0, guarded)',
    p2.downed && p2.life === 0 && p2.invulnerable && p2.untargetable && w2.scene?.fell === true,
    `downed=${String(p2.downed)} life=${p2.life.toFixed(0)}`);
  check('G5c: THE SLAIN LOCK — a downed seat\'s inputs are refused whole', inputsRefused(w2, p2));
  step(w2, 1.2);
  check('G5d: the un-death is dead — no regeneration under the sinking dark',
    p2.life === 0, `life=${p2.life.toFixed(2)}`);
  check('G6: the fall card follows under black',
    until(w2, () => stageKind(w2) === 'card' && w2.scene?.card != null && w2.screenFade >= 0.995, 6));
  check('G6b: the AUTHORED page — the horn was heard, so the wake says so',
    !!wakeStage && w2.scene?.card === wakeStage.card);
}

// === I) THE RUNNER'S END: the nova has a rim, the reckoning does not ========
// A hero who spends the whole muster RUNNING can stand past the blast's 2600
// radius when the horn fires (the boundless ground never says no). The story
// still ends: the sweep lays the runner bodily down, and THE WITNESS panned
// the fire-off to their eye however far they stood.
{
  const { w: w3, p: p3 } = walkToReckoning(31030);
  const col3 = w3.actors.find(a => a.defId === 'goblin_colossus');
  check('I1: the reckoning stands (Father posted, hero alive)',
    stageKind(w3) === 'reckoning' && !!col3 && !p3.downed);
  // THE RUN: far past the nova's own reach before the muster resolves.
  if (col3) { p3.pos.x = col3.pos.x + 4000; p3.pos.y = col3.pos.y; }
  const far = col3 ? Math.hypot(p3.pos.x - col3.pos.x, p3.pos.y - col3.pos.y) : 0;
  check('I2: the runner stands past the blast\'s rim', far > 3000, `d=${far.toFixed(0)}`);
  let sawEye = false;
  const ended = until(w3, () => {
    if (w3.scene?.focus) sawEye = true;
    return p3.downed;
  }, 20);
  check('I3: the sweep fells the runner the nova never reached (downed, life 0)',
    ended && p3.life === 0 && w3.scene?.fell === true,
    `downed=${String(p3.downed)} life=${p3.life.toFixed(0)}`);
  check('I4: THE WITNESS reached them — the eye walked out for the fire-off',
    sawEye);
  check('I5: the fall card still follows under black',
    until(w3, () => stageKind(w3) === 'card' && w3.screenFade >= 0.995, 6));
}

// === J) THE FIELD-FALL SURGE: the tide fells the field mid-muster ============
// The Father is standing, the horn half-wound, and the tide takes the last
// hero anyway. The covenant plays the fall IN PLACE (bodily down, the stage
// unmoved), the live muster leaps to its last breaths — a dead field is
// never made to wait ten breaths — and the horn still ends the road on
// screen; the wake then says the horn was heard, because it was.
{
  const { w: w4, p: p4 } = walkToReckoning(31040);
  const col4 = w4.actors.find(a => a.defId === 'goblin_colossus');
  check('J1: the muster opens over a living field',
    until(w4, () => !!col4?.casting, 6) && !p4.downed, `left=${castLeft(col4).toFixed(1)}`);
  p4.life = 0;
  w4.kill(p4);
  check('J2: the fall is played IN PLACE — bodily down, the reckoning still the stage, the Father standing',
    p4.downed && p4.life === 0 && stageKind(w4) === 'reckoning' && !!col4 && !col4.dead,
    `stage=${stageKind(w4)}`);
  step(w4, 0.1);
  const reck4 = w4.scene?.def.stages[w4.scene.stageIx] as SceneReckoningStage | undefined;
  check('J3: THE FIELD-FALL SURGE — the live muster leaps to its last breaths',
    castLeft(col4) <= (reck4?.enrageLeftSec ?? 1.2) + 0.2, `left=${castLeft(col4).toFixed(2)}s`);
  let sawEye4 = false;
  const fired = until(w4, () => {
    if (w4.scene?.focus) sawEye4 = true;
    return (w4.scene?.state as { blastAt?: number | null } | undefined)?.blastAt != null;
  }, 6);
  check('J4: the horn still fires on screen over the bodies (the witness walked out)',
    fired && sawEye4);
  check('J5: the authored wake follows — the horn WAS heard',
    until(w4, () => stageKind(w4) === 'card' && w4.scene?.card != null && w4.screenFade >= 0.995, 8)
    && !!wakeStage && w4.scene?.card === wakeStage.card);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
