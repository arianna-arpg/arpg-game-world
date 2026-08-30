// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE MU HUB (data/mu.ts + the 'mu' scene stage in
// engine/scenes.ts) on the real engine, headless. Pins the fabric's laws:
//   • THE TRANSIENT GATE — the standalone MU_SCENE stamps NOTHING (no
//     begun-mark, no completion key) and is re-enterable; sealed, boundless,
//     off-graph, empty-field like every scene ground.
//   • THE WISP — the hero stands guarded, kitless, small, and ethereal; the
//     HUD veil is up; nothing is ever restored (the pick rebuilds the world).
//   • THE HAND LAW — apparitions mirror the class screen's economy exactly:
//     dealt hand AWAKE (selectableSlotCount from the unlocked pool), the
//     unlocked remainder VEILED (named, refusing), the locked remainder as
//     capped FAINT unknown cowls (nameless — the discovery web keeps its
//     secrets); all passive + invulnerable + untargetable scenery.
//   • THE DWELL LATCH — a still linger by an awake vessel posts THAT class's
//     request once (consumed until step-out; step-out re-arms); veiled and
//     faint vessels refuse and post nothing.
//   • THE AGENCY RECKONING (the prologue's rewritten fall) — no hold, the
//     mark chevron, the ten-breath cast, interrupt re-arm (delay never
//     denial), the mercy floor, and the fall INTO Mu with the completion
//     key stamped at the threshold.
// Run: npx tsx balance/probe_mu.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import {
  sceneBegin, sceneBegunKey, sceneCardAck, sceneDue, muStageLive, muTakeClassRequest,
} from '../src/engine/scenes';
import { MU_SCENE, MU_CFG, APPARITION_PREFIX, APPARITION_UNKNOWN_ID, apparitionDefId } from '../src/data/mu';
import { PROLOGUE_SCENE, type SceneReckoningStage, type SceneClashStage, type SceneAssaultStage } from '../src/data/scenes';
import {
  TUTORIAL_FACTIONS, LEDGER_TUTORIAL_FACTION_PREFIX, tutorialFactionKey, tutorialFactionOf,
  rollTutorialFaction, prologueForFaction,
} from '../src/data/commanders';
import { CLASSES } from '../src/data/classes';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { TILESETS } from '../src/data/tilesets';
import { QUESTS } from '../src/quests/defs';
import { revengeCullId, revengeCommanderId, revengeTrailKey } from '../src/quests/revenge';
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
const until = (w: World, cond: () => boolean, maxSec: number): boolean => {
  for (let t = 0; t < maxSec; t += DT) {
    if (cond()) return true;
    w.update(DT);
  }
  return cond();
};
const apparitionsOf = (w: World): Actor[] =>
  w.actors.filter(a => !!a.defId
    && (a.defId.startsWith(APPARITION_PREFIX) || a.defId === APPARITION_UNKNOWN_ID));
const rankOf = (a: Actor): 'awake' | 'veiled' | 'faint' =>
  a.statuses.some(s => s.id === 'mu_faint') ? 'faint'
    : a.statuses.some(s => s.id === 'mu_veiled') ? 'veiled' : 'awake';

bootSimEngine();

// === A) THE TRANSIENT GATE ===================================================
// A graduated account with a LOCKED remainder: keep 6 classes unlocked so all
// three ranks stand (hand 3 / veiled 3 / faint = min(cap, the rest)).
const w = makeSimWorld('warrior', 47001);
w.account.ledger[PROLOGUE_SCENE.ledger] = 1; // a veteran: the tutorial is behind
const keep = new Set(CLASSES.slice(0, 6).map(c => c.id));
for (const id of [...w.account.unlockedClasses]) {
  if (!keep.has(id)) w.account.unlockedClasses.delete(id);
}
const p = w.player;
const heroLook = p.look;
check('A1: the standalone hub scene takes', sceneBegin(w, 'mu'));
check('A2: TRANSIENT stamps NOTHING — no begun-mark, no completion key',
  !(w.account.ledger[sceneBegunKey(MU_SCENE)] ?? 0)
  && !(w.account.ledger[MU_SCENE.ledger] ?? 0));
check('A3: sceneDue never applies to a transient scene', !sceneDue(w.account, 'mu'));
check('A4: Mu is CURRENT and OFF-GRAPH (caveMap, not the graph)',
  w.zone.id === 'scene_mu' && !!w.caveMap['scene_mu'] && !w.zoneMap['scene_mu']);
check('A5: the ground is sealed — spoils none, no packs, no exits, boundless',
  w.zone.spoils === 'none' && w.zone.packDensity === 0
  && w.zone.exits.length === 0 && w.arena.boundless === true);
check('A6: the mu stage is LIVE and never a completed scene', muStageLive(w));

// === B) THE WISP =============================================================
step(w, 0.3);
check('B1: the hero stands as the wisp — look swapped, small, pale',
  p.look === MU_CFG.wisp.look && p.radius === MU_CFG.wisp.radius && p.look !== heroLook);
check('B2: guarded whole — invulnerable, untargetable, vitals full',
  p.invulnerable && p.untargetable && p.life === p.maxLife());
check('B3: kitless — every bar slot stripped', p.skills.every(s => s === null));
check('B4: THE HUD VEIL is up', w.scene?.hudVeil === true);
check('B5: the prompt speaks the hub', w.scene?.prompt === MU_CFG.prompt);

// === C) THE HAND LAW =========================================================
const apps = apparitionsOf(w);
const awake = apps.filter(a => rankOf(a) === 'awake');
const veiled = apps.filter(a => rankOf(a) === 'veiled');
const faint = apps.filter(a => rankOf(a) === 'faint');
const pool = CLASSES.filter(c => w.account.unlockedClasses.has(c.id));
check('C1: the dealt hand stands AWAKE (the class screen\'s own hand size)',
  awake.length === Math.min(selectableSlotCount(w.account), pool.length),
  `awake=${awake.length}`);
check('C2: the unlocked remainder stands VEILED',
  veiled.length === pool.length - awake.length, `veiled=${veiled.length}`);
check('C3: the locked remainder is FAINT unknown cowls, capped',
  faint.length === Math.min(MU_CFG.faintCap, CLASSES.length - pool.length)
  && faint.every(a => a.defId === APPARITION_UNKNOWN_ID),
  `faint=${faint.length}`);
check('C4: every vessel is guarded scenery on the player team',
  apps.length > 0 && apps.every(a => a.invulnerable && a.untargetable && a.team === 'player'));
check('C5: awake + veiled wear their CLASS\'s own face (def per class)',
  [...awake, ...veiled].every(a => pool.some(c => apparitionDefId(c.id) === a.defId)));
check('C6: the unknown cowls are NAMELESS (no npcRole — no nameplate to leak)',
  faint.every(a => a.defId === APPARITION_UNKNOWN_ID));

// === D) THE DWELL LATCH ======================================================
{
  const v = awake[0];
  p.pos.x = v.pos.x; p.pos.y = v.pos.y + v.radius + 8;
  step(w, MU_CFG.dwell.sec + 0.6);
  const req = muTakeClassRequest(w);
  check('D1: the still linger posts THAT class\'s request',
    req !== null && apparitionDefId(req) === v.defId, `req=${req}`);
  check('D2: the request is consumed whole (no double card)',
    muTakeClassRequest(w) === null);
  step(w, MU_CFG.dwell.sec + 0.6);
  check('D3: the latch stays consumed while standing (a closed card never re-pops in place)',
    muTakeClassRequest(w) === null);
  // Step out, come back: the latch re-arms (the Dwell law's step-out).
  p.pos.x = v.pos.x + 400; p.pos.y = v.pos.y + 400;
  step(w, 0.3);
  p.pos.x = v.pos.x; p.pos.y = v.pos.y + v.radius + 8;
  step(w, MU_CFG.dwell.sec + 0.6);
  check('D4: step-out re-arms — the next linger asks again',
    muTakeClassRequest(w) !== null);
}

// === E) THE REFUSALS =========================================================
{
  const v = veiled[0];
  p.pos.x = v.pos.x; p.pos.y = v.pos.y + v.radius + 8;
  step(w, MU_CFG.dwell.sec + 0.8);
  check('E1: a VEILED vessel posts nothing (not this waking)',
    muTakeClassRequest(w) === null);
  const f = faint[0];
  if (f) {
    p.pos.x = f.pos.x; p.pos.y = f.pos.y + f.radius + 8;
    step(w, MU_CFG.dwell.sec + 0.8);
    check('E2: a FAINT cowl posts nothing (a shape not yet earned)',
      muTakeClassRequest(w) === null);
  }
}

// === F) THE AGENCY RECKONING (the prologue's rewritten fall) =================
{
  const v = makeSimWorld('warrior', 47002);
  const vp = v.player;
  check('F0: the virgin sim account is due the prologue', sceneDue(v.account, 'prologue'));
  check('F0b: the prologue begins', sceneBegin(v, 'prologue'));
  // Jump the director straight to the reckoning (the walk itself is
  // probe_scenes.ts's law — this rig owns the fall's mechanics).
  const sc = v.scene!;
  const ix = sc.def.stages.findIndex(s => s.kind === 'reckoning');
  check('F1: the prologue still ends through a reckoning', ix >= 0);
  sc.stageIx = ix;
  sc.begun = false;
  sc.fadeTarget = 0;
  v.screenFade = 0;
  step(v, 0.2);
  const spec = sc.def.stages[ix] as { def: string; graceSec: number; floorFrac: number };
  const col = v.actors.find(a => a.defId === spec.def);
  check('F2: the commander stands — and the world is NOT held (agency, not cinema)',
    !!col && !v.timeflow.heldBy('cinematic') && sc.focus === null);
  check('F3: THE MARK — the attention chevron names him',
    sc.mark?.id === col?.id && collectAttention(v).some(pt => pt.id === 'scene_mark'));
  check('F4: after the grace beat the muster is a live TEN-second cast',
    until(v, () => !!col?.casting, spec.graceSec + 2)
    && (col?.casting?.total ?? 0) >= 9.5,
    `total=${col?.casting?.total?.toFixed(1)}`);
  // THE INTERRUPT RE-ARM: a stun wipes the cast (the engine's own law); the
  // director re-orders the muster once the body is free — delay, never denial.
  // Break the poise first: applyStatus shrugs hard CC by the poiseCcAvoid
  // ROLL while poise stands (that roll is the live game's own guard on this
  // very muster) — the rig pins the director's re-arm, not the dice.
  col!.poise = 0;
  col!.applyStatus('stun', 0, 1, 'probe');
  step(v, 0.15);
  check('F5: a stun truly interrupts the cast (the player\'s honest little victory)',
    col!.casting === null);
  check('F6: the muster RE-ARMS the moment the body is free',
    until(v, () => !!col?.casting, 3), `casting=${String(!!col?.casting)}`);
  // THE MERCY FLOOR: below the floor the commander goes immune outright.
  col!.life = col!.maxLife() * spec.floorFrac * 0.5;
  step(v, 0.2);
  check('F7: THE MERCY FLOOR — immune below the floor, the cast resolves regardless',
    col!.invulnerable === true);
  check('F8: the blast fells the hero through the covenant (never a death)',
    until(v, () => sc.fell && !vp.dead && vp.invulnerable, 14),
    `fell=${String(sc.fell)} dead=${String(vp.dead)}`);
  check('F9: the fall card follows, and the ack drifts into MU',
    until(v, () => v.scene?.card != null, 8));
  sceneCardAck(v);
  check('F10: the spirit arrives in Mu with the tutorial stamped LIVED at the threshold',
    until(v, () => v.zone.id === 'scene_mu' && muStageLive(v), 5)
    && (v.account.ledger[PROLOGUE_SCENE.ledger] ?? 0) >= 1
    && !sceneDue(v.account, 'prologue'));
  check('F11: the wisp stands among the vessels',
    vp.look === MU_CFG.wisp.look && apparitionsOf(v).length > 0);
}

// === G) THE TUTORIAL FACTIONS (data/commanders.ts — the Fathers) =============
{
  // G1: table integrity — every row's bodies and verbs are REGISTERED, and
  // every commander is Ghorvane's true sibling: a voice part whose break
  // silences exactly the row's reckoning verb.
  let wired = true, voiced = true, tided = true;
  for (const row of TUTORIAL_FACTIONS) {
    const cmd = MONSTERS[row.commander];
    if (!cmd || !SKILLS[row.verb] || !MONSTERS[row.clash.def]) wired = false;
    if (!cmd?.skills.includes(row.verb)) wired = false;
    const voice = cmd?.parts?.some(p =>
      p.breakDisables?.includes(row.verb) && !!MONSTERS[p.monster]);
    if (!voice) voiced = false;
    for (const wave of row.waves) {
      for (const s of wave.spawns) if (!MONSTERS[s.def]) tided = false;
    }
    if (SKILLS[row.verb]?.useTime !== 10) wired = false;
  }
  check('G1: every legion is wired whole — commander, verb (ten breaths), clash, every wave body',
    wired, TUTORIAL_FACTIONS.map(r => r.id).join(','));
  check('G2: every Father carries a VOICE — the part whose break silences his reckoning',
    voiced);
  check('G3: every tide row names only registered kin', tided);
  // G4: the roll — deterministic per manifest, stamped once, recalled forever.
  const a = makeSimWorld('warrior', 47003);
  const b = makeSimWorld('warrior', 47003);
  const ra = rollTutorialFaction(a);
  const rb = rollTutorialFaction(b);
  check('G4: the roll is a pure function of the manifest seed', ra.id === rb.id, `roll=${ra.id}`);
  check('G5: the roll stamps the account (the tutorial_faction: presence key)',
    tutorialFactionOf(a.account.ledger) === ra.id
    && (a.account.ledger[tutorialFactionKey(ra.id)] ?? 0) >= 1);
  // The recall beats the dice: pre-stamp a DIFFERENT legion and the roll
  // must bow to it (an aborted tutorial replays the same war).
  const c = makeSimWorld('warrior', 47004);
  const other = TUTORIAL_FACTIONS.find(r => r.id !== rollTutorialFaction(makeSimWorld('warrior', 47004)).id)!;
  c.account.ledger[tutorialFactionKey(other.id)] = 1;
  check('G6: a standing stamp is RECALLED, never re-rolled',
    rollTutorialFaction(c).id === other.id);
  // G7: the resolve swaps exactly the war stages — cards, drill and the Mu
  // tail stay the base def's rows byte-identically.
  const row = TUTORIAL_FACTIONS.find(r => r.id === 'demon')!;
  const eff = prologueForFaction(row);
  const kinds = eff.stages.map(s => s.kind);
  const clash = eff.stages.find(s => s.kind === 'clash') as SceneClashStage;
  const assault = eff.stages.find(s => s.kind === 'assault') as SceneAssaultStage;
  const reck = eff.stages.find(s => s.kind === 'reckoning') as SceneReckoningStage;
  check('G7: the resolve keeps the walk\'s shape (same stage kinds, same id + ledger)',
    kinds.join(',') === PROLOGUE_SCENE.stages.map(s => s.kind).join(',')
    && eff.id === PROLOGUE_SCENE.id && eff.ledger === PROLOGUE_SCENE.ledger);
  check('G8: the war stages wear the legion — clash, tide and reckoning all re-dressed',
    clash.spawns[0].def === row.clash.def && assault.rows === row.waves
    && reck.def === row.commander && reck.verb === row.verb
    && (reck.floorFrac ?? 0) > 0);
  check('G9: the untouched stages are the base rows THEMSELVES (no silent forks)',
    eff.stages[0] === PROLOGUE_SCENE.stages[0]
    && eff.stages[eff.stages.length - 1] === PROLOGUE_SCENE.stages[PROLOGUE_SCENE.stages.length - 1]);
  // G10: a live sceneBegin resolves — the runtime walks the ROLLED legion
  // (the seam is armed everywhere via the arena's census imports;
  // probe_scenes pins its own lane by pre-stamping the goblin recall).
  const v = makeSimWorld('warrior', 47005);
  sceneBegin(v, 'prologue');
  const lived = tutorialFactionOf(v.account.ledger);
  const vReck = v.scene!.def.stages.find(s => s.kind === 'reckoning') as SceneReckoningStage;
  check('G10: sceneBegin walks the rolled legion\'s reckoning',
    lived !== null && vReck.def === TUTORIAL_FACTIONS.find(r => r.id === lived)!.commander,
    `legion=${lived}`);
  check('G11: the prefix scan finds exactly one stamped legion',
    Object.keys(v.account.ledger).filter(k => k.startsWith(LEDGER_TUTORIAL_FACTION_PREFIX)).length === 1);
}

// === H) THE REVENGE CHAIN (quests/revenge.ts) ================================
{
  let wired = true, gated = true, chained = true;
  const mkCtx = (ledger: Record<string, number>) =>
    ({ classId: 'warrior', vocations: [] as string[], runLedger: {}, accountLedger: ledger });
  for (const row of TUTORIAL_FACTIONS) {
    const cull = QUESTS[revengeCullId(row.id)];
    const cmd = QUESTS[revengeCommanderId(row.id)];
    if (!cull || !cmd) { wired = false; continue; }
    if (!TILESETS[cull.zone.tileset] || !TILESETS[cmd.zone.tileset]) wired = false;
    if (cmd.zone.objective.kind !== 'boss' || cmd.zone.objective.id !== row.commander) wired = false;
    if (!(cull.zone.packsOverride?.table.length ?? 0)) wired = false;
    if (cull.offerAtLevel !== 15 || cmd.offerAtLevel !== 15) wired = false;
    // THE CHAIN: the cull's field payout is the commander hunt's door.
    const trail = revengeTrailKey(row.id);
    if ((cull.reward.ledger?.[trail] ?? 0) < 1 || cmd.requiresLedger !== trail) chained = false;
    if (cull.turnIn || !cmd.turnIn) chained = false;
    // THE GATE: this legion's stamp lights exactly this chain…
    const stamped = mkCtx({ [tutorialFactionKey(row.id)]: 1 });
    if (!cull.gate?.(stamped) || !cmd.gate?.(stamped)) gated = false;
    // …and every OTHER legion's chain stays dark under it.
    for (const other of TUTORIAL_FACTIONS) {
      if (other.id === row.id) continue;
      if (QUESTS[revengeCullId(other.id)]?.gate?.(stamped)) gated = false;
    }
  }
  check('H1: every legion fields its whole chain — cull + commander hunt, real ground, real boss',
    wired);
  check('H2: THE GATE — the tutorial stamp lights exactly ONE legion\'s revenge', gated);
  check('H3: THE CHAIN — the cull pays the trail in the field; the hunt opens on it and turns in',
    chained);
  check('H4: an unstamped veteran gets the goblin canon (Ghorvane was always their opening)',
    QUESTS[revengeCullId('goblin')]?.gate?.(mkCtx({})) === true
    && QUESTS[revengeCullId('demon')]?.gate?.(mkCtx({})) === false);
  check('H5: the commander keeps his VOICE out here — the revenge fight\'s counterplay stands',
    TUTORIAL_FACTIONS.every(row =>
      MONSTERS[row.commander]?.parts?.some(p => p.breakDisables?.includes(row.verb))));
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL CHECKS PASS');
process.exit(failed ? 1 : 0);
