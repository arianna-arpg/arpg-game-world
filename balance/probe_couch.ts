// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE COUCH FABRIC headless on the real engine (data/couch.ts;
// docs/engine/couch.md). Pins:
//   - THE SOLO INVARIANT: no couch seats → no couch state anywhere (accessors
//     empty, confine null, the update sweep a no-op) — single-player is
//     byte-identical by construction,
//   - THE COUCH FRAME's pure laws (render/camera.ts couchFit): one hero
//     degenerates to the solo frame; the focus is the heroes' center; stretch
//     falls monotonically with spread, answers the fit EXACTLY while it can,
//     and floors at the cap; couchConfineRect derives the EDGE LAW's rect
//     from the drawn frame (drawn == confined by construction),
//   - THE EDGE LAW live (World.applyCouchConfine in the update tail): local
//     heroes clamp into the published rect whatever moved them; enemies are
//     never touched; an honestly HELD body (grab) is exempt; a null rect
//     (zone seam / solo) confines no one,
//   - seat lifecycle: the couch tag drives couchActive/couchSeats/
//     couchHeroes/localHumanSeats/accountSeat; adoptSeatMeta grafts a saved
//     build onto the GUEST seat and leaves the hero untouched,
//   - THE ACTION LATCH (world.uiActionSeatId): a stamped guest id routes
//     requestMeta to the guest's own seat; unstamped routing is the local
//     hero's, exactly as before,
//   - THE GUEST COVENANT (bankCouchWipe): a party wipe costs a persistent
//     guest vessel its own corpse (Seat.couchDeaths — the account ring is
//     untouched), the whole carry, and the stage advance; disposable
//     mortal-lane guests bank nothing,
//   - guest persistence shape (serializeCouchGuest): build + carry + mode +
//     own ring, NO world half, the dormant menagerie passed through
//     verbatim; rebuildSavedMeta round-trips it,
//   - the account-seat XP law: a couch guest's level milestones feed THIS
//     machine's run ledger (one account on the couch).
// Run: npx tsx balance/probe_couch.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec } from '../src/core/math';
import { NullInput } from '../src/net/intent';
import { CLASSES } from '../src/data/classes';
import { COUCH_CFG } from '../src/data/couch';
import { couchFit, couchConfineRect } from '../src/render/camera';
import { rebuildSavedMeta, serializeCharacter, serializeCouchGuest } from '../src/meta/character';
import { rollItem } from '../src/engine/itemgen';
import { PadState, type FakePad, type PadTuning } from '../src/core/gamepad';
import { CouchClaimSession, findRebindSlot } from '../src/net/couch';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const near = (a: number, b: number, tol = 1e-6): boolean => Math.abs(a - b) <= tol;

bootSimEngine();

const BASE_ZOOM = 1.3;
const CAM = COUCH_CFG.camera;

// -------------------------------------------------------- couchFit pure laws
{
  const one = couchFit([{ x: 500, y: 400 }], 1920, 1080, BASE_ZOOM, CAM);
  check('fit: one hero degenerates to the solo frame (stretch exactly 1, focus = hero)',
    one.stretch === 1 && one.focus.x === 500 && one.focus.y === 400);

  const pair = couchFit([{ x: 400, y: 600 }, { x: 1000, y: 200 }], 1920, 1080, BASE_ZOOM, CAM);
  check('fit: focus is the heroes\' center',
    near(pair.focus.x, 700) && near(pair.focus.y, 400));

  // Close together the fit exceeds base → clamped to 1 (never zooms IN).
  const close = couchFit([{ x: 500, y: 400 }, { x: 560, y: 420 }], 1920, 1080, BASE_ZOOM, CAM);
  check('fit: near-adjacent heroes keep the solo zoom (stretch 1)', close.stretch === 1);

  // Monotone: wider spread → smaller (or equal) stretch, down to the floor.
  let prev = 1;
  let mono = true;
  for (let sep = 200; sep <= 6000; sep += 200) {
    const f = couchFit([{ x: 0, y: 0 }, { x: sep, y: 0 }], 1920, 1080, BASE_ZOOM, CAM);
    if (f.stretch > prev + 1e-9) mono = false;
    prev = f.stretch;
  }
  check('fit: stretch falls monotonically with spread', mono);
  check('fit: a vast spread floors at the cap exactly',
    near(couchFit([{ x: 0, y: 0 }, { x: 99999, y: 0 }], 1920, 1080, BASE_ZOOM, CAM).stretch, CAM.maxStretch));

  // Fit exactness while above the floor: the governed axis's need fills the
  // screen at the returned zoom (screenW == zoom × needW).
  const sep = 1600; // wide enough to govern, mild enough to stay above the cap
  const f = couchFit([{ x: 0, y: 0 }, { x: sep, y: 0 }], 1920, 1080, BASE_ZOOM, CAM);
  if (f.stretch > CAM.maxStretch + 1e-9 && f.stretch < 1 - 1e-9) {
    const needW = sep + 2 * CAM.fitMarginWu;
    check('fit: while governing, the width need fills the screen exactly',
      near(BASE_ZOOM * f.stretch * needW, 1920, 1e-6), `zoom×need ${(BASE_ZOOM * f.stretch * needW).toFixed(4)}`);
  } else {
    check('fit: exactness probe landed in the governing band', false,
      `stretch ${f.stretch.toFixed(3)} hit a clamp — retune the probe separation`);
  }

  // THE EDGE LAW's rect derives from the drawn frame: cam top-left + view
  // dims inset by the confine margin — drawn == confined by construction.
  const rect = couchConfineRect({ x: 100, y: 50 }, 1000, 600, CAM);
  check('confine rect: the drawn frame inset by the margin',
    rect.x === 100 + CAM.confineMarginWu && rect.y === 50 + CAM.confineMarginWu
    && rect.w === 1000 - 2 * CAM.confineMarginWu && rect.h === 600 - 2 * CAM.confineMarginWu);
  check('confine margin leaves fit-margin slack (the wall only bites at the cap)',
    CAM.confineMarginWu < CAM.fitMarginWu);
}

// ------------------------------------------------------------ solo invariant
{
  seedGlobalRandom(7101);
  const w = makeSimWorld('warrior', 7101);
  check('solo: couchActive false, no couch seats, no confine rect',
    !w.couchActive() && w.couchSeats().length === 0 && w.couchConfine === null);
  check('solo: couchHeroes is exactly [the hero]',
    w.couchHeroes().length === 1 && w.couchHeroes()[0] === w.player);
  check('solo: localHumanSeats is exactly [the local seat]',
    w.localHumanSeats().length === 1 && w.localHumanSeats()[0] === w.localSeat);
  const at = vec(w.player.pos.x, w.player.pos.y);
  w.update(1 / 60);
  check('solo: the update sweep moves no one (confine null = no-op)',
    near(w.player.pos.x, at.x, 5) && near(w.player.pos.y, at.y, 5));
}

// --------------------------------------------- seat lifecycle + the accessors
{
  seedGlobalRandom(7102);
  const w = makeSimWorld('warrior', 7102);
  const cls = CLASSES.find(c => c.id !== w.meta.classDef.id) ?? CLASSES[0];
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right' };
  const ally = w.addSeat('p9', cls, new NullInput()); // a plain (non-couch) ally

  check('lifecycle: couchActive with a tagged guest', w.couchActive());
  check('lifecycle: couchSeats sees exactly the tagged guest',
    w.couchSeats().length === 1 && w.couchSeats()[0] === guest);
  check('lifecycle: couchHeroes = [hero, guest] (the plain ally is not framed)',
    w.couchHeroes().length === 2 && w.couchHeroes()[0] === w.player && w.couchHeroes()[1] === guest.actor);
  check('lifecycle: localHumanSeats = [local, guest], local first',
    w.localHumanSeats().length === 2 && w.localHumanSeats()[0] === w.localSeat && w.localHumanSeats()[1] === guest);
  check('lifecycle: accountSeat — local yes, guest yes, plain ally no',
    w.accountSeat(w.localSeat) && w.accountSeat(guest) && !w.accountSeat(ally));

  w.removeSeat('c1');
  check('lifecycle: guest removal restores the solo invariant (ally still up)',
    !w.couchActive() && w.couchSeats().length === 0 && w.seats.length === 2);
}

// -------------------------------------------------- adoptSeatMeta: the graft
{
  seedGlobalRandom(7103);
  // A DONOR world builds a levelled character; its save grafts onto a guest
  // seat in the HOST world — the couch join's exact path.
  const donor = makeSimWorld('rogue', 7103);
  donor.grantXp(4000);
  const save = serializeCharacter(donor);

  const w = makeSimWorld('warrior', 7104);
  const heroLevel = w.player.level;
  const cls = CLASSES.find(c => c.id === save.classId)!;
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right' };
  const built = rebuildSavedMeta(save);
  check('graft: rebuildSavedMeta stands the save back up', !!built);
  if (built) {
    w.adoptSeatMeta(guest, built.meta, save.bar, save.level);
    check('graft: the guest wears the donor build (level + class + skills)',
      guest.actor.level === save.level && guest.meta.classDef.id === save.classId
      && guest.meta.knownSkills.size === save.knownSkills.length,
      `level ${guest.actor.level} skills ${guest.meta.knownSkills.size}`);
    check('graft: the guest bar rebound from the save',
      guest.actor.skills.filter(s => s).length === save.bar.filter(s => s).length);
    check('graft: the HERO is untouched (separation)',
      w.player.level === heroLevel && w.meta.classDef.id === 'warrior');
  }
}

// ------------------------------------------------------- THE EDGE LAW (live)
{
  seedGlobalRandom(7105);
  const w = makeSimWorld('warrior', 7105);
  const cls = CLASSES.find(c => c.id !== w.meta.classDef.id) ?? CLASSES[0];
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right' };
  const foe = w.createMonster('plains_wolf', 3, 'enemy');
  foe.pos = vec(60, 60);
  w.actors.push(foe);

  w.couchConfine = { x: 400, y: 400, w: 200, h: 200 };
  w.player.pos = vec(100, 100);
  guest.actor.pos = vec(900, 900);
  const foeAt = vec(foe.pos.x, foe.pos.y);
  w.update(1 / 60);
  const inRect = (p: { x: number; y: number }): boolean =>
    p.x >= 400 && p.x <= 600 && p.y >= 400 && p.y <= 600;
  check('edge law: both local heroes clamp into the published rect',
    inRect(w.player.pos) && inRect(guest.actor.pos),
    `hero (${w.player.pos.x.toFixed(0)},${w.player.pos.y.toFixed(0)}) guest (${guest.actor.pos.x.toFixed(0)},${guest.actor.pos.y.toFixed(0)})`);
  check('edge law: enemies are never confined',
    near(foe.pos.x, foeAt.x, 40) && near(foe.pos.y, foeAt.y, 40));

  // An honestly HELD body is exempt — its seat wins the frame. Probed at the
  // law's own sweep (a full update's grab ladder would first HEAL this
  // synthetic dangling hold — correct engine behavior, not the law under test).
  guest.actor.pos = vec(900, 900);
  guest.actor.heldBy = foe.id;
  (w as unknown as { applyCouchConfine(): void }).applyCouchConfine();
  check('edge law: a grabbed hero is exempt (the hold wins the frame)',
    !inRect(guest.actor.pos));
  guest.actor.heldBy = undefined;

  w.couchConfine = null;
  w.player.pos = vec(100, 100);
  w.update(1 / 60);
  check('edge law: a null rect confines no one (zone seam / solo)',
    w.player.pos.x < 200);
}

// ----------------------------------------------------- THE ACTION LATCH
{
  seedGlobalRandom(7106);
  const w = makeSimWorld('warrior', 7106);
  const donor = makeSimWorld('rogue', 7107);
  const save = serializeCharacter(donor);
  const built = rebuildSavedMeta(save)!;
  const cls = CLASSES.find(c => c.id === save.classId)!;
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right' };
  w.adoptSeatMeta(guest, built.meta, save.bar, save.level);

  const skillId = [...guest.meta.knownSkills.keys()][0];
  const heroSlot3 = w.player.skills[3]?.def.id ?? null;
  w.uiActionSeatId = 'c1';
  w.requestMeta({ t: 'bindSkill', slot: 3, skillId });
  w.uiActionSeatId = null;
  check('latch: a stamped guest id routes the bind to the GUEST bar',
    guest.actor.skills[3]?.def.id === skillId);
  check('latch: the hero bar is untouched by the guest routing',
    (w.player.skills[3]?.def.id ?? null) === heroSlot3);

  const heroSkill = [...w.meta.knownSkills.keys()][0];
  w.requestMeta({ t: 'bindSkill', slot: 4, skillId: heroSkill });
  check('latch: unstamped routing stays the local hero\'s (solo path intact)',
    w.player.skills[4]?.def.id === heroSkill);
}

// -------------------------------------------------- THE GUEST COVENANT
{
  seedGlobalRandom(7108);
  const w = makeSimWorld('warrior', 7108);
  const cls = CLASSES.find(c => c.id !== w.meta.classDef.id) ?? CLASSES[0];
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right', charId: 'vessel_test', rosterSlot: 11 };
  guest.meta.modeId = 'immortal';
  guest.meta.modeStage = 0;
  // A worn piece + carried essence: the covenant must corpse + strip it all.
  const item = rollItem({ ilvl: 8 });
  if (item) guest.meta.equipped.chest = item;
  check('covenant probe setup: an item rolled onto the vessel doll', !!item);
  guest.meta.essences.coarse = 25;
  const accountRing = w.account.deaths.length;

  const disposable = w.addSeat('c2', cls, new NullInput());
  disposable.couch = { pad: 2, side: 'left' }; // no charId — mortal-lane guest
  disposable.meta.essences.coarse = 9;

  (w as unknown as { bankCouchWipe(): void }).bankCouchWipe();

  check('covenant: the vessel banked its own corpse (Seat.couchDeaths)',
    (guest.couchDeaths?.length ?? 0) === 1
    && guest.couchDeaths![0].owner === 'c1');
  check('covenant: the account ring is untouched (own-ring stage)',
    w.account.deaths.length === accountRing);
  check('covenant: the carry stripped whole (doll + essences)',
    guest.meta.equipped.chest === undefined && (guest.meta.essences.coarse ?? 0) === 0);
  check('covenant: the stage advanced (SWORN → sealed)',
    guest.meta.modeStage === 1);
  check('covenant: the vessel flagged for prompt persistence', w.couchDirty);
  check('covenant: a disposable guest banks nothing',
    (disposable.couchDeaths?.length ?? 0) === 0 && disposable.meta.essences.coarse === 9
    && disposable.meta.modeStage === 0);
}

// ---------------------------------------- guest persistence shape (roundtrip)
{
  seedGlobalRandom(7109);
  const w = makeSimWorld('warrior', 7109);
  const cls = CLASSES.find(c => c.id !== w.meta.classDef.id) ?? CLASSES[0];
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right', charId: 'vessel_rt', rosterSlot: 11 };
  guest.meta.charId = 'vessel_rt';
  guest.meta.modeId = 'immortal';
  guest.couchDeaths = [];
  w.grantXp(2500); // both seats level; the guest banks its own meta

  const dormant = {
    companions: [{ defId: 'plains_wolf', level: 3, skillId: 'tame' }],
    throng: [],
    throngClaimed: ['pocket_a'],
  };
  const save = serializeCouchGuest(w, guest, dormant);
  check('persist: a guest save carries NO world half', save.world === undefined);
  check('persist: identity + mode ride whole',
    save.charId === 'vessel_rt' && save.modeId === 'immortal' && save.level === guest.actor.level);
  check('persist: the dormant menagerie passes through verbatim',
    (save.companions?.length ?? 0) === 1 && save.companions?.[0].defId === 'plains_wolf'
    && (save.throngClaimed?.length ?? 0) === 1);
  check('persist: the own ring rides the save', Array.isArray(save.deaths));
  const rebuilt = rebuildSavedMeta(save);
  check('persist: rebuildSavedMeta round-trips the guest save',
    !!rebuilt && rebuilt.meta.classDef.id === cls.id
    && rebuilt.meta.knownSkills.size === save.knownSkills.length);
}

// ------------------------------------------------ the account-seat XP law
{
  seedGlobalRandom(7110);
  const w = makeSimWorld('warrior', 7110);
  const cls = CLASSES.find(c => c.id !== w.meta.classDef.id) ?? CLASSES[0];
  const guest = w.addSeat('c1', cls, new NullInput());
  guest.couch = { pad: 1, side: 'right' };
  // Only the GUEST is alive to bank XP — the milestone must still stamp the
  // run ledger (one account on the couch), where a remote peer's never would.
  w.player.dead = true;
  w.grantXp(4000);
  w.player.dead = false;
  check('xp law: a guest crossing level 5 stamps the run ledger',
    guest.actor.level >= 5 && (w.ledger.reached_level_5 ?? 0) >= 1,
    `guest level ${guest.actor.level}`);
}

// ---------------------- THE CLAIM PIN (the Steam Deck deadlock, pinned dead)
// Real pads compete for the hero's unbound read by TIMESTAMP (freshest wins).
// Pre-fix, the joining pad's very first Ⓐ press made it the hero's own pad
// in the same frame — and the claim scan, excluding the hero's live pad,
// could then never see it: the claim was structurally impossible on real
// hardware. Timestamped fakes reproduce hardware; the pin kills the race.
{
  // The pad layer reads window.* — stand a minimal one up for node.
  const G = globalThis as unknown as { window?: unknown };
  G.window ??= globalThis;
  const W = G.window as { __fakePads?: (FakePad | null | undefined)[] };
  const TUNE: PadTuning = {
    deadzone: 0.18, stickCurve: 1.5, aimCurve: 1.5, triggerThreshold: 0.35,
    aimMinRadius: 70, aimMaxRadius: 460, pointerSpeed: 1100, swapSticks: false,
  };
  const zeros = (): number[] => Array.from({ length: 17 }, () => 0);
  const aDown = (): number[] => { const b = zeros(); b[0] = 1; return b; };
  const pads: (FakePad | null | undefined)[] = [];
  W.__fakePads = pads;

  // The stage: P1's pad lives at slot 0 (stick chatter = fresh timestamps);
  // the joiner sits idle at slot 1 with an older stamp.
  pads[0] = { axes: [0.6, 0, 0, 0], buttons: zeros(), timestamp: 1000, id: 'padA' };
  pads[1] = { axes: [0, 0, 0, 0], buttons: zeros(), timestamp: 400, id: 'padB' };
  const hero = new PadState(() => TUNE);
  hero.poll(10.0);
  check('claim pin: the roam adopts the freshest pad (hardware semantics now IN the rig)',
    hero.connected && hero.sourceIndex === 0);

  const session = new CouchClaimSession(hero);
  session.arm();
  check('claim pin: arming freezes the hero read at its live slot',
    session.armed && session.heroSlot === 0 && hero.padPin === 0);

  // THE DECK MOMENT: the joining pad presses Ⓐ — now the freshest device on
  // the machine. The pinned hero read must not adopt or edge it.
  pads[0] = { axes: [0, 0, 0, 0], buttons: zeros(), timestamp: 1000, id: 'padA' };
  pads[1] = { axes: [0, 0, 0, 0], buttons: aDown(), timestamp: 2000, id: 'padB' };
  hero.poll(10.1);
  check('claim pin: the pinned hero read never adopts the joining press',
    hero.sourceIndex === 0 && !hero.pressed.has('pad:a') && !hero.isDown('pad:a'));
  const hit = session.scan('a', new Set());
  check('claim pin: THE CLAIM LANDS on the freshest-timestamp joiner (the Deck deadlock)',
    hit === 1, `hit ${hit}`);
  check('claim pin: the claim lifts the pin (the claimed pad must drive the pick pointer)',
    hero.padPin === null && !session.armed);

  // The adoption frame: the roam takes the claimed pad MID-HOLD — the very
  // press that claimed must not re-edge into the hero read (a stray pointer
  // click would pick a class nobody chose).
  hero.poll(10.2);
  check('claim pin: post-claim the roam adopts the claimed pad for the pick phase',
    hero.sourceIndex === 1);
  check('claim pin: the claiming press is swallowed on adoption (held, never an edge)',
    hero.isDown('pad:a') && !hero.pressed.has('pad:a'));
  pads[1] = { axes: [0, 0, 0, 0], buttons: zeros(), timestamp: 2100, id: 'padB' };
  hero.poll(10.3); // release clears the swallow on a stable read
  pads[1] = { axes: [0, 0, 0, 0], buttons: aDown(), timestamp: 2200, id: 'padB' };
  hero.poll(10.4);
  check('claim pin: the NEXT deliberate press edges normally (the pick click flows)',
    hero.pressed.has('pad:a'));

  // A keyboard hero (no recent pad activity) pins to NOTHING — every pad is
  // a joiner, and the hero's pad read stays dead while the scan is armed.
  const kb = new PadState(() => TUNE);
  const kbSession = new CouchClaimSession(kb);
  kbSession.arm();
  check('claim pin: a keyboard hero pins to none',
    kbSession.armed && kbSession.heroSlot === null && kb.padPin === 'none');
  kb.poll(20.1);
  check('claim pin: the none-pinned read reads no pad at all',
    !kb.connected && kb.sourceIndex === null);
  pads[0] = { axes: [0, 0, 0, 0], buttons: aDown(), timestamp: 3000, id: 'padA' };
  check('claim pin: with none pinned EVERY pad is a claimer',
    kbSession.scan('a', new Set()) === 0);
  kbSession.release();

  // The fallback law older probes rely on: no timestamps anywhere → the
  // first connected slot wins the roam, exactly the classic rig read.
  pads.length = 0;
  pads[0] = { axes: [0, 0, 0, 0], buttons: zeros() };
  pads[1] = { axes: [0.9, 0, 0, 0], buttons: zeros() };
  const h2 = new PadState(() => TUNE);
  h2.poll(30.0);
  check('claim pin: timestamp-less fakes keep the classic first-slot roam',
    h2.sourceIndex === 0);

  // THE DEAD-CLAIM GUARD — the keyboard-and-one-controller household
  // (minPads dialed to 1 / ?couchpads=1): the hero was JUST playing on the
  // only pad; pinning it would leave NOTHING to claim, so the pin falls to
  // none and the sole pad itself may join (Ⓐ hands it to the guest, the
  // hero plays on keys).
  pads.length = 0;
  pads[0] = { axes: [0.5, 0, 0, 0], buttons: zeros(), timestamp: 100, id: 'onlyPad' };
  const solo = new PadState(() => TUNE);
  solo.poll(40.0); // live on the sole pad
  const soloSession = new CouchClaimSession(solo);
  soloSession.arm();
  check('dead-claim guard: the sole-pad household arms to none (never a dead claim)',
    soloSession.armed && soloSession.heroSlot === null && solo.padPin === 'none');
  pads[0] = { axes: [0, 0, 0, 0], buttons: aDown(), timestamp: 200, id: 'onlyPad' };
  check('dead-claim guard: the sole pad itself claims (the hero falls to keys)',
    soloSession.scan('a', new Set()) === 0);

  // With a FREE second pad standing, the live slot pins exactly as before.
  pads[0] = { axes: [0.5, 0, 0, 0], buttons: zeros(), timestamp: 300, id: 'onlyPad' };
  pads[1] = { axes: [0, 0, 0, 0], buttons: zeros(), timestamp: 50, id: 'padB' };
  const duo = new PadState(() => TUNE);
  duo.poll(41.0);
  const duoSession = new CouchClaimSession(duo);
  duoSession.arm();
  check('dead-claim guard: a free second pad keeps the classic pin',
    duoSession.heroSlot === 0 && duo.padPin === 0);
  duoSession.release();

  // A second pad that is CLAIMED by a seat does not avert the guard.
  pads[0] = { axes: [0.5, 0, 0, 0], buttons: zeros(), timestamp: 400, id: 'onlyPad' };
  const trio = new PadState(() => TUNE);
  trio.poll(42.0);
  const trioSession = new CouchClaimSession(trio);
  trioSession.arm(new Set([1]));
  check('dead-claim guard: a claimed second pad does not avert it',
    trioSession.heroSlot === null && trio.padPin === 'none');
  trioSession.release();
  delete W.__fakePads;
}

// -------------------------- THE IDENTITY RE-BIND (the Bluetooth sleep law)
// A claimed pad that vanishes may re-bind ONLY to a slot wearing the same
// device id that appeared AFTER the loss (the newcomer rule) — a standing
// pad, the hero's included, can never be stolen, even an identical twin.
{
  const W = (globalThis as unknown as { window: { __fakePads?: (FakePad | null | undefined)[] } }).window;
  const zeros = (): number[] => Array.from({ length: 17 }, () => 0);
  const pads: (FakePad | null | undefined)[] = [];
  W.__fakePads = pads;
  pads[0] = { axes: [0, 0, 0, 0], buttons: zeros(), id: 'padA' }; // the hero's, standing
  pads[1] = undefined; // the guest's claimed device just slept
  const lostSeen = new Set([0]); // the loss-frame census — the newcomer fence

  check('re-bind: nothing to adopt while only fenced strangers stand',
    findRebindSlot('padB', lostSeen, new Set()) === null);
  check('re-bind: a STANDING identical twin is never stolen (the newcomer rule)',
    findRebindSlot('padA', lostSeen, new Set()) === null);

  pads[2] = { axes: [0, 0, 0, 0], buttons: zeros(), id: 'padB' }; // the device returns
  check('re-bind: the returning identity re-binds at its newcomer slot',
    findRebindSlot('padB', lostSeen, new Set()) === 2);
  check('re-bind: a slot claimed by another seat is fenced',
    findRebindSlot('padB', lostSeen, new Set([2])) === null);
  check('re-bind: identity is the key — a stranger newcomer never matches',
    findRebindSlot('padC', lostSeen, new Set()) === null);
  check('re-bind: an unknown identity re-binds nowhere (parked, never a hijack)',
    findRebindSlot(null, lostSeen, new Set()) === null);
  delete W.__fakePads;
}

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 2);
