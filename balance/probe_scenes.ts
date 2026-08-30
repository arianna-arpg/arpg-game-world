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
//   • THE COVENANT — a lethal blow FELLS (life 1, guarded, fast-forwarded
//     to the reckoning), never kills; the reckoning's verb resolves through
//     the real pipeline and spends the horde honestly (affects 'all').
//   • THE AGENCY RECKONING — the world is NEVER held: the commander stands
//     marked (the attention fabric's chevron), its kit banned, and after the
//     grace beat musters a TEN-second honest cast; the MERCY FLOOR makes it
//     immune below its life fraction (damage delays, never denies).
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
import { PROLOGUE_SCENE } from '../src/data/scenes';
import { MU_CFG, APPARITION_PREFIX } from '../src/data/mu';
import { selectableSlotCount } from '../src/meta/account';
import { collectAttention } from '../src/world/attention';
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

bootSimEngine();

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

// === F) THE COVENANT: a lethal blow fells, never kills ======================
p.life = 0;
w.kill(p);
check('F1: the hero is FELLED — alive at 1, guarded, never dead or downed',
  !p.dead && !p.downed && p.life === 1 && p.invulnerable && p.untargetable);
check('F2: the fall fast-forwards the script to the reckoning',
  stageKind(w) === 'reckoning');

// === G) THE AGENCY RECKONING: marked, mustered, the field unmade =============
// The tide as it stands BEFORE the blast — dead bodies leave the actor list,
// so the after-pin follows these ids, not the census.
const tideIds = sceneBodies(w)
  .filter(a => !a.dead && a.defId === 'goblin_skirmisher')
  .map(a => a.id);
step(w, 0.2);
const col = w.actors.find(a => a.defId === 'goblin_colossus');
check('G1: the Hordefather stands off in the dark (rewardless like all scene bodies)',
  !!col && col.noBounty && col.eventKey === `scene:${PROLOGUE_SCENE.id}`);
check('G2: THE HOLD IS DEAD — the world keeps running while the muster stands (agency, not cinema)',
  !w.timeflow.heldBy('cinematic') && w.scene?.focus === null);
check('G3: THE MARK stands — the chevron source points at the commander by name',
  w.scene?.mark?.id === col?.id
  && collectAttention(w).some(pt => pt.id === 'scene_mark' && pt.label === col?.name));
check('G4: the verb musters through the REAL pipeline after the grace beat',
  until(w, () => !!col && col.casting !== null, 6),
  `casting=${String(!!col?.casting)}`);
check('G4b: ten held breaths — the muster is a TEN-second honest cast bar',
  (col?.casting?.total ?? 0) >= 9.5,
  `total=${col?.casting?.total?.toFixed(1)}`);
// THE MERCY FLOOR, mid-cast: wound it below the floor and it goes immune —
// the player may bloody the muster, never stop it by damage.
if (col) col.life = col.maxLife() * ((w.scene?.def.stages[w.scene.stageIx] as { floorFrac?: number })?.floorFrac ?? 0.1) * 0.5;
step(w, 0.2);
check('G4c: THE MERCY FLOOR — below the floor the commander is immune outright',
  col?.invulnerable === true);
check('G5: the blast spends the horde honestly (affects all — the tide lies dead)',
  until(w, () => tideIds.length > 0
    && tideIds.every(id => w.actors.every(a => a.id !== id || a.dead)), 16),
  `tide=${tideIds.length}`);
check('G6: the fall card follows under black',
  until(w, () => stageKind(w) === 'card' && w.screenFade >= 0.995, 6));
check('G7: the fall card is pending',
  until(w, () => w.scene?.card != null, 2));

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

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
