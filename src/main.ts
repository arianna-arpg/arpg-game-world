// ---------------------------------------------------------------------------
// Entry point: boots the world, runs the loop, and routes player input into
// the same skill pipeline the AI uses.
// ---------------------------------------------------------------------------

import { Input } from './core/input';
import { rollSeed } from './core/rng';
import { validateContent } from './data/validate';
import './data/clusters'; // side-effect: registers the data-driven cluster stamps
import './engine/landmarkBuilders'; // side-effect: registers the landmark shape builders
import './data/landmarks'; // side-effect: registers the geographic landmark recipes
import './engine/layoutRecipes'; // side-effect: registers the composed layout recipes
import { updateAI } from './engine/ai';
import { World } from './engine/world';
import { buildManifest, reconcileManifest, type ExpeditionManifest } from './packages/manifest';
import { mergeLedger } from './packages/ledger';
import { registerAllPackageFactions } from './packages/factionGen';
import { Renderer } from './render/renderer';
import { UI } from './ui/panels';
import { LocalTransport } from './net/local';
import { ScriptedInput, LocalCoopInput } from './net/scripted';
import type { PlayerInput, MetaAction } from './net/intent';
import type { NetTransport, StateSnapshot, PeerInfo, SessionMsg, ZoneMsg } from './net/transport';
import { serializeSnapshot, applySnapshot, serializeZone, applyZone } from './net/snapshot';
import { RemoteInput } from './net/remote';
import { WebRtcTransport } from './net/webrtc';
import { openCoopLobby } from './ui/lobby';
import { CLASSES, type ClassDef } from './data/classes';
import { DEV } from './config';
import { mountDevGemSpawner } from './dev/gemSpawner';
import { mountPassiveEditor } from './dev/passiveEditor';
import { applyCredits, creditsForDeath, isClassUnlocked, type Account } from './meta/account';
import {
  loadAccount, loadAccountAsync, loadSettings, loadSettingsAsync,
  saveAccount, saveAccountDurable, saveSettings, resetAccount,
} from './meta/persistence';
import {
  applySavedCharacter, clearCharacter, loadCharacter, loadCharacterAsync, saveCharacter,
  type CharacterSave,
} from './meta/character';
import type { Settings } from './meta/settings';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const input = new Input(canvas);

// The ACCOUNT and the keybind SETTINGS are loaded ONCE here and live in module
// scope — they outlive every character death and World recreation. World, UI,
// and the renderer hold the SAME references; they are never re-loaded mid-run.
const account: Account = loadAccount();
const settings: Settings = loadSettings();

const renderer = new Renderer(canvas, () => settings);

// Networking transport. LocalTransport runs single-player + local co-op (host
// with one machine); a WebRtcTransport (same NetTransport contract) swaps in for
// a real over-the-wire session. `let` so the lobby can replace it. `?coop` spawns
// a local stand-in ally so the multi-seat path plays/verifies with no networking.
let net: NetTransport = new LocalTransport();
const COOP_PARAMS = new URLSearchParams(location.search);
/** `?coophuman` = a second LOCAL HUMAN seat (arrow keys); `?coop` = a scripted one. */
const COOP_HUMAN = COOP_PARAMS.has('coophuman');
const COOP_ALLY = COOP_PARAMS.has('coop') || COOP_HUMAN;

// Host→client snapshot broadcast at a FIXED wire rate (decoupled from the host's
// render FPS), only ever while real peers are connected — single-player/local-only
// never builds one, so SP stays byte-identical.
const STATE_HZ = 20;
const SNAP_INTERVAL = 1 / STATE_HZ;   // seconds between host snapshots (interp basis)
let stateTimer = 0;
let snapTick = 0;
/** Latest + previous snapshots from the host (client only). The client renders
 *  entity positions interpolated PREV→LATEST over one snapshot interval, so motion
 *  is smooth ~60fps instead of stepping at the 20Hz wire rate. */
let latestSnapshot: StateSnapshot | null = null;
let prevSnapshot: StateSnapshot | null = null;
/** Seconds since the latest snapshot arrived — drives the interpolation alpha. */
let snapAccum = 0;
/** CLIENT: set when a newly-arrived snapshot carried OUR replicated seat meta, so
 *  the client re-renders its open build panels (skill book / tree / char sheet)
 *  exactly when the data changes — the HUD is always live via the renderer. */
let clientMetaDirty = false;
/** CLIENT: false while the latest snapshot's seatMeta delta hasn't been applied by
 *  a frame yet — so if a NEWER snapshot arrives first (coalescing), it carries the
 *  un-applied delta forward instead of dropping it. Set true once a frame applies. */
let metaApplied = true;
/** CLIENT: JSON of the last OWN-seat meta we triggered a panel re-render for — so
 *  the 1.5s heartbeat (which re-ships IDENTICAL meta) doesn't perpetually re-render
 *  the open build panels (which would yank a scrolled list back to the top). */
let lastMetaJson = '';
/** HOST: re-dirty every seat this often (s) as a self-healing safety net for a
 *  delta-replicated meta snapshot that was dropped (congested channel) or coalesced. */
const META_HEARTBEAT = 1.5;
let metaHeartbeat = 0;
/** CLIENT movement PREDICTION (Layer 3): a monotonic input seq + a ring of recent
 *  {seq,dx,dy,dt}. Each frame the own hero is anchored to the host's last-acked
 *  authoritative position and our UNACKED inputs are replayed forward — so the
 *  local player moves with ~zero input latency instead of waiting on the 20Hz
 *  snapshot round-trip. Reset per client session so seq realigns with the host. */
let inputSeq = 0;
const predictHistory: Array<{ seq: number; dx: number; dy: number; dt: number }> = [];
const PREDICT_BUFFER = 240;        // ~4s @ 60fps — caps replay cost + runaway
let predZoneId = '';               // zone change → discard stale (old-zone) inputs
/** Disposers for the client's onState / onZone subscriptions. */
let snapshotDispose: (() => void) | null = null;
let zoneDispose: (() => void) | null = null;
/** Host: the last zone id whose terrain we broadcast (resend on change). */
let lastSentZone = '';
/** Run-lifecycle (co-op) plumbing. sessionDispose tears down the onSession
 *  subscription on leave. HOST: pendingRejoins = peers who chose a class for the
 *  next run while the host wasn't yet in one (reseated when it starts). CLIENT:
 *  pendingRejoinClass = the class WE chose at the run-end screen (used when the
 *  host re-seats us via newRun). */
let sessionDispose: (() => void) | null = null;
const pendingRejoins = new Map<string, string>();
let pendingRejoinClass: ClassDef | null = null;
/** HOST: meta intents (point-spends, gem ops, drops) received from clients this
 *  frame, tagged with the sender's seat. Drained + applied just before world.update
 *  (so the change replicates in the SAME tick's snapshot). */
const pendingActions: Array<{ seat: string; action: MetaAction }> = [];

/** A LIVE over-the-wire co-op session with at least one connected peer. Gates the
 *  run-end broadcast + the keep-the-transport-alive restart path. */
function coopActive(): boolean {
  return net instanceof WebRtcTransport && net.peers().length > 1;
}

// Graft every content package's factions into the shared data registries BEFORE
// any World is built or the content validator runs (mutates FACTIONS/traits/…).
registerAllPackageFactions();

// A placeholder world until a run begins (the start menu is shown first); it is
// replaced wholesale by startGame / resumeGame with the run's frozen manifest.
let world = new World(account, Object.freeze(buildManifest(account, rollSeed())));
const ui = new UI(
  () => world, () => account, () => saveAccount(account),
  () => settings, () => saveSettings(settings),
  () => !net.isHost,        // a network co-op CLIENT (world is a render shell)
  () => leaveCoop(),        // tear down a co-op session → back to the menu
);

let running = false;
let deathShown = false;
let uiRefreshTimer = 0;
let autosaveTimer = 0;

function startGame(classDef: ClassDef, manifest?: ExpeditionManifest): void {
  // The manifest is the run-LOCKED package config. Phase 4's Expedition screen
  // passes a configured one; otherwise build it from the account's saved prefs.
  const m = manifest ?? buildManifest(account, rollSeed());
  world = new World(account, Object.freeze(m));
  world.createPlayer(classDef);
  lastSentZone = '';        // force a fresh terrain broadcast for (re)joining clients
  if (COOP_ALLY) spawnCoopAlly();
  saveCharacter(world);     // baseline snapshot so a fresh run is resumable
  ui.setContinueSave(null); // the previous run's continue cache is now stale
  deathShown = false;
  running = true;
}

/** Resume the saved in-progress character, or fall back to the start menu.
 *  `preloaded` is the disk/local save fetched at boot; without it we read sync. */
function resumeGame(preloaded?: CharacterSave | null): void {
  const save = preloaded ?? loadCharacter();
  const classDef = save && CLASSES.find(c => c.id === save.classId);
  // A saved character is always resumable — resume must NOT depend on the
  // (now random, slot-based) class-select roll. Only a missing/invalid save bails.
  if (!save || !classDef) {
    clearCharacter();
    ui.showStartMenu(startGame, resumeGame, openLobby);
    return;
  }
  // Rebuild the run-locked manifest from the save (tolerant of removed packages);
  // its stored seed makes the resumed world deterministic.
  const manifest = reconcileManifest(save.expedition, account, rollSeed());
  world = new World(account, Object.freeze(manifest));
  world.createPlayer(classDef);          // builds a valid skeleton in town…
  if (!applySavedCharacter(world, save)) { // …then the save overwrites the build
    clearCharacter();
    ui.showStartMenu(startGame, resumeGame, openLobby);
    return;
  }
  if (COOP_ALLY) spawnCoopAlly();
  deathShown = false;
  running = true;
}

// Dev/debug handle (also keeps headless testing possible when rAF is paused).
declare global {
  interface Window {
    __game?: {
      world: () => World; ui: UI; ai: typeof updateAI; renderer: Renderer;
      account: () => Account; saveAccount: () => void; save: () => void;
      settings: () => Settings; saveSettings: () => void;
      addAlly: () => void;
      net: () => NetTransport;
      snapshot: () => StateSnapshot;
      applySnap: (s: StateSnapshot, prev?: StateSnapshot | null, alpha?: number) => void;
      subscribeToHost: () => void;
      unsubscribeFromHost: () => void;
      fakeJoin: (classId?: string) => string;
      fakeLeave: (id: string) => void;
      zoneMsg: () => ZoneMsg;
      applyZoneMsg: (z: ZoneMsg) => void;
      openLobby: () => void;
      leaveCoop: () => void;
      resetAccount: () => void;
    };
  }
}
window.__game = {
  world: () => world, ui, ai: updateAI, renderer,
  account: () => account, saveAccount: () => saveAccount(account),
  save: () => saveCharacter(world),
  settings: () => settings, saveSettings: () => saveSettings(settings),
  addAlly: () => spawnCoopAlly(),
  net: () => net,
  snapshot: () => serializeSnapshot(world, 0),
  applySnap: (s: StateSnapshot, prev?: StateSnapshot | null, alpha = 1) => applySnapshot(world, s, prev, alpha),
  subscribeToHost, unsubscribeFromHost,
  fakeJoin: (classId) => {
    const id = 'p' + world.seats.length;
    onRemoteJoin({ id, name: 'Remote', classId: classId ?? CLASSES[0].id, isHost: false });
    return id;
  },
  fakeLeave: (id) => onRemoteLeave(id),
  zoneMsg: () => serializeZone(world),
  applyZoneMsg: (z: ZoneMsg) => applyZone(world, z),
  openLobby, leaveCoop,
  resetAccount: () => { resetAccount(); location.reload(); },
};

// Cross-check the data files; authoring mistakes warn instead of failing silently.
validateContent();

// DEV: the gem spawner QA tool (config.ts DEV.gemSpawner). Off (0) = no-op.
if (DEV.gemSpawner) mountDevGemSpawner(() => world);
// DEV: the passive-tree editor (config.ts DEV.passiveTreeEditor). Off (0) = no-op.
if (DEV.passiveTreeEditor) mountPassiveEditor(ui);

// Boot: show the start menu immediately (built from the synchronous localStorage
// loaders so it appears instantly), THEN reconcile against the disk files in the
// background — the authoritative cross-session save. The disk loads warm the
// shared account/settings refs and enable Continue if a disk character exists.
ui.showStartMenu(startGame, resumeGame, openLobby);
ui.setContinueSave(loadCharacter());          // instant: localStorage cache
void (async (): Promise<void> => {
  const [a, s, c] = await Promise.all([loadAccountAsync(), loadSettingsAsync(), loadCharacterAsync()]);
  Object.assign(account, a);                  // mutate-in-place: shared refs stay valid
  Object.assign(settings, s);
  ui.setContinueSave(c);                       // disk save wins (re-renders the menu)
})();

/** Read the OS into the LOCAL seat's intent for this frame (or null when there's
 *  nothing to drive — dead/downed, or the pause menu is up). Pure input capture;
 *  it no longer touches the world directly — World.applyInputs does that, for
 *  every seat uniformly. `aim` is converted to WORLD space here so it's
 *  camera-independent (the one value that must survive the wire). */
function readLocalInput(): PlayerInput | null {
  const p = world.player;
  if (p.dead || p.downed) return null;
  if (ui.escapeMenuOpen) return null;

  const kb = settings.keybinds;
  let dx = 0, dy = 0;
  if (input.keys.has(kb.moveUp)) dy -= 1;
  if (input.keys.has(kb.moveDown)) dy += 1;
  if (input.keys.has(kb.moveLeft)) dx -= 1;
  if (input.keys.has(kb.moveRight)) dx += 1;
  const aim = renderer.toWorld(input.mouse);

  // Slots 0/1 are LMB/RMB (fixed); slots 2–7 are the rebindable keys.
  const skillKeys = [kb.skillSlot2, kb.skillSlot3, kb.skillSlot4, kb.skillSlot5, kb.skillSlot6, kb.skillSlot7];
  const held = [input.lmb, input.rmb, ...skillKeys.map(k => input.keys.has(k))];
  const edge = [input.lmbPressed, input.rmbPressed, ...skillKeys.map(k => input.justPressed(k))];
  // SHIFT is the META layer: shift+slot fires the slot skill's META-ACTION
  // (Detonate / Enrage / Attack!) INSTEAD of the skill — presses reroute
  // wholesale, so the mine never re-arms while you're detonating it.
  if (input.keys.has('shift')) {
    return {
      dx, dy, aim,
      held: held.map(() => false),
      edge: edge.map(() => false),
      metaEdge: edge,
    };
  }
  return { dx, dy, aim, held, edge };
}

/** LOCAL-only UI input (the pause menu + panel toggles). Kept out of the intent
 *  pipeline — these are this client's screen, never gameplay sent to the host. */
function handleLocalPanels(): void {
  // Dead/downed suppresses ALL local UI input, exactly as the old single input
  // handler did (`if (p.dead) return`) — so escape/panels can't pop over the
  // death screen. (A downed local hero in co-op likewise can't toggle panels.)
  if (world.player.dead || world.player.downed) return;
  const kb = settings.keybinds;
  // Escape toggles the pause/menu (hardwired — never rebindable). While it's up,
  // gameplay intent is suppressed (readLocalInput returns null).
  if (input.justPressed('escape')) {
    if (ui.escapeMenuOpen) ui.hideEscapeMenu();
    else { ui.hideAll(); ui.showEscapeMenu(); }
    return;
  }
  if (ui.escapeMenuOpen) return;
  if (input.justPressed(kb.panelChar)) ui.toggleCharSheet();
  if (input.justPressed(kb.panelBook)) ui.toggleSkillBook();
  if (input.justPressed(kb.panelTree)) ui.toggleTree();
  if (input.justPressed(kb.panelMap)) ui.toggleMap();
}

/** Spawn a local stand-in ally (scripted: follow + auto-attack) to exercise the
 *  multi-seat co-op path without networking. Dev-only, gated by `?coop` or the
 *  `__game.addAlly()` console hook. Picks a class different from the local hero. */
function spawnCoopAlly(): void {
  if (world.seats.length >= 5) return;
  const own = world.localSeat.meta.classDef;
  const cls = CLASSES.find(c => c !== own) ?? own;
  const id = 'p' + world.seats.length;
  if (net instanceof LocalTransport) net.addLocalSeat({ id, name: cls.name, classId: cls.id });
  // `?coophuman` makes the second seat a LOCAL HUMAN on the arrow keys (test co-op
  // move/cast in one tab); otherwise it's a scripted follow-and-fight ally.
  world.addSeat(id, cls, COOP_HUMAN ? new LocalCoopInput(input.keys) : new ScriptedInput());
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (running) {
    if (net.isHost) {
      // ---- HOST (and single-player / local co-op): run the one real sim. ----
      // 1. Local UI (pause menu, panels) — never gameplay intent.
      handleLocalPanels();
      // 2. Gather this frame's per-seat intent into the transport. The local seat
      //    reads the OS; other LOCAL seats (the scripted ally) poll their source.
      //    A REMOTE seat's intent arrives through the transport's own pump.
      const li = readLocalInput();
      if (li) net.sendInput(net.self, li);
      for (const seat of world.seats) {
        if (seat.id === net.self) continue;
        const intent = seat.input.poll(seat.actor, world, dt);
        if (intent) net.sendInput(seat.id, intent);
      }
      // 3. Apply all seat intents (single path for every player-kind hero).
      world.applyInputs(net.drainInputs(), dt);
      // 3.5. Apply clients' META intents (point-spends, gem ops, drops) to their
      //      OWN seats BEFORE the sim ticks — so the change lands in this tick's
      //      drops/orbs pass and re-replicates in the same broadcast.
      drainMetaActions();

      for (const a of world.actors) updateAI(a, world, dt);
      world.update(dt);
      // The Caravanner dwell (in TOWN) asks to open the band-travel menu.
      if (world.caravanDwellRequested) {
        world.caravanDwellRequested = false;
        if (!ui.caravanOpen) ui.showCaravan();
      }
      // Dwelling by the return-Caravanner IN THE WILDS ports straight home — no menu.
      if (world.caravanReturnRequested) {
        world.caravanReturnRequested = false;
        world.startCaravan(0);
      }
      // (The dock dwell now CASTS OFF into the sailing mode directly — handled
      // inside world.updateSail; the Sail menu panel stays dormant.)
      // A Holdfast keeper (drop-to-choose) asks to open the toll bargain menu.
      if (world.holdfastTollRequested) {
        world.holdfastTollRequested = false;
        if (!ui.tollOpen) ui.showToll();
      }
      // Close a lingering toll menu if the wardens were slain / roused mid-bargain.
      if (ui.tollOpen && !world.holdfastParleyOpen()) ui.closeToll();
      renderer.render(world);

      // Broadcast to connected clients. Gated on a REAL wire (never LocalTransport),
      // so single-player AND local co-op (a stand-in ally is a LocalTransport peer)
      // never serialize anything — byte-identical SP / no wasted work.
      if (!(net instanceof LocalTransport) && net.peers().length > 1) {
        // Terrain: ship the (heavier) zone message ONCE per zone change.
        if (world.zone.id !== lastSentZone) {
          lastSentZone = world.zone.id;
          net.sendZone(serializeZone(world));
        }
        // META HEARTBEAT: seatMeta is delta-replicated (shipped once per change,
        // then cleared). If that one snapshot is ever dropped — a congested
        // channel skipped by fanOut, or coalesced past on the client — the delta
        // is lost with no retry. Periodically re-dirty every seat so any missed
        // build change self-heals within META_HEARTBEAT seconds.
        metaHeartbeat -= dt;
        if (metaHeartbeat <= 0) {
          metaHeartbeat = META_HEARTBEAT;
          for (const s of world.seats) world.markMetaDirty(s);
        }
        // State: the per-tick render snapshot at the fixed wire rate.
        stateTimer -= dt;
        if (stateTimer <= 0) {
          stateTimer = 1 / STATE_HZ;
          broadcastSnapshot();
        }
      }

      hostTail(dt);
    } else {
      // ---- CLIENT: run NO sim. Send local input, render the host's snapshot. ----
      handleLocalPanels();
      const li = readLocalInput();
      if (li) {
        // Stamp + buffer the input for prediction, THEN send it. The host echoes
        // the last-applied seq; predictOwnHero replays everything newer locally.
        li.seq = ++inputSeq;
        predictHistory.push({ seq: li.seq, dx: li.dx, dy: li.dy, dt });
        if (predictHistory.length > PREDICT_BUFFER) predictHistory.shift();
        net.sendInput(net.self, li);
      }
      clientApplyAndRender(dt);
    }
  }

  input.endFrame();
  requestAnimationFrame(frame);
}

/** Host-only end-of-frame work: live panels, autosave, and the permadeath/death
 *  screen flow. NONE of this runs on a client (no character to save/wipe). */
function hostTail(dt: number): void {
  // Keep open panels live (resource/stat values move constantly).
  uiRefreshTimer -= dt;
  if (uiRefreshTimer <= 0) {
    uiRefreshTimer = 0.5;
    ui.refreshCharSheet();
    ui.refreshMap();
  }

  // Autosave the in-progress character periodically (cheap; survives a crash
  // or an abrupt close). Skipped once dead (the run save is wiped on death).
  if (!world.gameOver) {
    autosaveTimer -= dt;
    if (autosaveTimer <= 0) { autosaveTimer = 20; saveCharacter(world); }
  }

  if (world.gameOver && !deathShown) {
    deathShown = true;
    // CO-OP: tell connected clients the run ended so they leave their (now-frozen)
    // render shell and offer a fresh class pick — no reload, the session lives on.
    if (coopActive()) net.sendSession({ t: 'runEnd' });
    ui.hideAll();
    // PERMADEATH: award account credits from how far the run got, persist the
    // account, and WIPE the character save (the account survives, the run doesn't).
    const earned = creditsForDeath(world.player.level, world.visited.size, world.kills);
    applyCredits(account, earned);
    // PERMANENT progression: fold this run's trigger counters (crowned_killed,
    // …) into the account ledger so package unlocks stick like credits do.
    mergeLedger(account.ledger, world.ledger);
    // CORPSE RUN: only an actual death (not a forfeit) records a reclaimable
    // corpse — captured BEFORE clearCharacter wipes the gems.
    if (world.runEndReason === 'death') world.recordDeath();
    // Durable write (sendBeacon) so the death record survives a tab-close on
    // the death screen, matching clearCharacter's durable wipe.
    saveAccountDurable(account);
    clearCharacter();
    ui.setContinueSave(null);   // the run is wiped — no Continue after death
    ui.resetClassRoster();      // the next run deals a fresh class hand
    // Co-op host KEEPS the live session (onDeathDismiss re-seats clients in the
    // next run); single-player resets the transport back to local.
    ui.showDeath(earned, onDeathDismiss);
    // PAUSE the host loop — the run is over, so it must stop ticking + broadcasting
    // the dead world. startGame / startAsClient re-enable it for the next run.
    running = false;
  }
}

/** Host: serialize the world and broadcast it to every connected client. */
function broadcastSnapshot(): void {
  net.sendState(serializeSnapshot(world, ++snapTick));
  // Per-seat META rides the snapshot only when its dirty flag is set; once a
  // snapshot carries it, the change is on the wire — clear so we don't re-ship it.
  world.metaDirty.clear();
}

/** Client: apply the latest host snapshot — INTERPOLATED prev→latest over one
 *  snapshot interval — to the render-shell world and draw it (no sim runs here;
 *  the host owns the simulation). Actor POSITIONS + facing are smoothed via the
 *  prev→latest lerp; renderer effects keyed on performance.now() (aura/dome/font
 *  pulses, spins) advance locally; everything else sampled from the snapshot
 *  (cast-bar fill, item/orb bobs) steps at the 20Hz wire rate — acceptable for MVP. */
function clientApplyAndRender(dt: number): void {
  snapAccum += dt;
  const alpha = Math.min(1, snapAccum / SNAP_INTERVAL);
  if (latestSnapshot) applySnapshot(world, latestSnapshot, prevSnapshot, alpha);
  // PREDICTION: override the own hero's interpolated position with the locally
  // predicted one (anchor to the host's ack + replay unacked input) for responsive
  // movement. Other actors keep snapshot interpolation.
  predictOwnHero();
  // The latest snapshot's seatMeta delta (if any) is now applied — let the next
  // arriving snapshot stop carrying it forward (coalescing guard in onState).
  metaApplied = true;
  // Our replicated build changed (point spend, learn, drop, level-up) → re-render
  // any OPEN build panels now (they're not live like the HUD). refresh* methods
  // no-op when their panel is closed, so this is cheap.
  if (clientMetaDirty) {
    clientMetaDirty = false;
    ui.refreshCharSheet(); ui.refreshSkillBook(); ui.refreshTree();
  }
  // Resource/stat values on the char sheet + map drift every frame even with no
  // meta change — keep them live on the same 0.5s throttle the host uses.
  uiRefreshTimer -= dt;
  if (uiRefreshTimer <= 0) { uiRefreshTimer = 0.5; ui.refreshCharSheet(); ui.refreshMap(); }
  renderer.render(world);
}

/** CLIENT: position the OWN hero by PREDICTION instead of snapshot interpolation —
 *  anchor to the host's last-acked authoritative position, then REPLAY every input
 *  the host hasn't applied yet (moveActor, the SAME integrator + collision the host
 *  runs). The local player then moves with ~zero input latency; the reconciliation
 *  happens every frame, so a misprediction self-corrects on the next snapshot. The
 *  `rooted` flag (host says we're stun/cast/dash-locked) stops forward replay so the
 *  hero doesn't drift ahead while actually held in place. Other actors + ally seats
 *  keep snapshot interpolation. No-op for the host / single-player (never called). */
function predictOwnHero(): void {
  if (!latestSnapshot) return;
  const me = latestSnapshot.seats[world.clientSeatId];
  if (!me) return;
  const p = world.player;
  if (p.dead || p.downed) return;     // downed → the interpolated snapshot pos stands
  // A zone change teleports us; the buffered inputs are from the old zone → drop them.
  if (latestSnapshot.zoneId !== predZoneId) { predZoneId = latestSnapshot.zoneId; predictHistory.length = 0; }
  // Forget inputs the host has already applied.
  const ack = me.seq ?? 0;
  while (predictHistory.length && predictHistory[0].seq <= ack) predictHistory.shift();
  // Anchor to the authoritative position, then replay our unacked inputs forward.
  // Skip the replay while ROOTED (stun/cast/dash) or on SLIPPERY ground (ice momentum
  // the client can't reproduce) — anchor-only there avoids a prediction rubber-band.
  p.pos.x = me.pos[0]; p.pos.y = me.pos[1];
  if (!me.rooted && !me.slippery) {
    for (const h of predictHistory) world.moveActor(p, h.dx, h.dy, h.dt);
  }
}

/** Client: start applying the host's broadcasts (set up at join, torn down on Leave). */
function subscribeToHost(): void {
  snapshotDispose = net.onState(s => {
    // COALESCING GUARD: seatMeta is a delta shipped once. If an earlier snapshot's
    // delta hasn't been applied by a frame yet and a newer snapshot arrives first
    // (rAF slower than the 20Hz wire, GC hitch, backgrounded tab), carry the
    // un-applied delta forward onto this one so it isn't silently dropped.
    if (latestSnapshot?.seatMeta && !metaApplied) {
      s.seatMeta = { ...latestSnapshot.seatMeta, ...(s.seatMeta ?? {}) };
    }
    if (s.seatMeta) metaApplied = false;
    // Re-render the open build panels ONLY when our meta actually CHANGED — not on
    // the periodic heartbeat re-send of identical meta (which would churn the panel
    // and reset any scroll). Compare the serialized own-seat meta to the last one.
    const myMeta = s.seatMeta?.[world.clientSeatId];
    if (myMeta) {
      const json = JSON.stringify(myMeta);
      if (json !== lastMetaJson) { lastMetaJson = json; clientMetaDirty = true; }
    }
    prevSnapshot = latestSnapshot ?? s; latestSnapshot = s; snapAccum = 0;
  });
  zoneDispose = net.onZone(z => { applyZone(world, z); });
}
/** Client: stop applying broadcasts. */
function unsubscribeFromHost(): void {
  if (snapshotDispose) { snapshotDispose(); snapshotDispose = null; }
  if (zoneDispose) { zoneDispose(); zoneDispose = null; }
  latestSnapshot = null; prevSnapshot = null; snapAccum = 0; metaApplied = true; lastMetaJson = '';
}

/** HOST: a peer joined — spawn a wire-fed seat for them (their class, a
 *  RemoteInput drained from the transport). Idempotent on the seat id. */
function onRemoteJoin(peer: PeerInfo): void {
  if (world.seats.some(s => s.id === peer.id)) return;
  const cls = CLASSES.find(c => c.id === peer.classId) ?? CLASSES[0];
  world.addSeat(peer.id, cls, new RemoteInput(peer.id));
  // The joiner needs the current terrain immediately (not just on the next zone
  // change); re-broadcast it (harmless re-apply for existing peers).
  net.sendZone(serializeZone(world));
}

/** HOST: a peer left — despawn their seat (and its minions). */
function onRemoteLeave(id: string): void {
  world.removeSeat(id);
}

/** Wire the run-lifecycle channel onto the current (WebRTC) transport — done once
 *  when a co-op session is established (host or client); torn down on leave. */
function wireSession(): void {
  sessionDispose?.();
  sessionDispose = net.onSession(onSessionMsg);
}

/** Dispatch a run-lifecycle message. HOST handles `rejoin`; CLIENT handles
 *  `runEnd` + `newRun`. */
function onSessionMsg(msg: SessionMsg, from: string): void {
  if (net.isHost) {
    if (msg.t === 'rejoin') {
      // A client chose its class for the next run. Seat them now if we're already
      // mid-run, else queue until our new run begins (flushRejoins).
      if (running && !world.gameOver) reseatPeer(from, msg.classId);
      else pendingRejoins.set(from, msg.classId);
    } else if (msg.t === 'action') {
      // A client's meta intent for its OWN seat — queue for this frame's drain
      // (applyAction runs host-side with the channel-bound `from` seat, so a
      // client can only ever mutate its own build).
      pendingActions.push({ seat: from, action: msg.action });
    }
  } else if (msg.t === 'runEnd') {
    onClientRunEnd();
  } else if (msg.t === 'newRun') {
    onClientNewRun(msg.seat);
  }
}

/** HOST: apply this frame's queued client meta intents to their OWN seats. A seat
 *  that has since left is simply skipped. applyAction validates + re-replicates. */
function drainMetaActions(): void {
  if (!pendingActions.length) return;
  for (const { seat: seatId, action } of pendingActions) {
    const seat = world.seats.find(s => s.id === seatId);
    if (!seat) continue;
    // A client controls the action payload entirely — a malformed/hostile one
    // (bad index, prototype-chain key) must NEVER throw out of the frame loop
    // (that would permanently halt the host sim + freeze every client). One bad
    // action just no-ops. world.applyAction also validates before dispatch.
    try { world.applyAction(seat, action); }
    catch (e) { console.warn('[coop] dropped malformed meta action', action, e); }
  }
  pendingActions.length = 0;
}

/** HOST: (re)seat an already-connected peer into the CURRENT run and tell them to
 *  spin up their render shell for it (`newRun`) + ship the terrain. */
function reseatPeer(peerId: string, classId: string): void {
  const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];
  if (!world.seats.some(s => s.id === peerId)) world.addSeat(peerId, cls, new RemoteInput(peerId));
  net.sendSession({ t: 'newRun', seat: peerId }, peerId);
  net.sendZone(serializeZone(world));
}

/** HOST: after a fresh co-op run begins, seat every peer that already picked a
 *  class at the run-end screen (queued while the host was choosing its own). */
function flushRejoins(): void {
  for (const [peerId, classId] of pendingRejoins) reseatPeer(peerId, classId);
  pendingRejoins.clear();
}

/** CLIENT: the host's run ended — leave the (now-stale) render shell and offer a
 *  fresh class pick; choosing one asks the host to re-seat us in its next run. */
function onClientRunEnd(): void {
  running = false;          // stop rendering the dead run
  unsubscribeFromHost();    // drop the dead run's snapshot/zone subs + stale interp state
  pendingRejoinClass = null;
  ui.resetClassRoster();    // deal a fresh class hand for the rejoin pick
  ui.showClassSelect(cls => {
    pendingRejoinClass = cls;
    net.sendSession({ t: 'rejoin', classId: cls.id });
    ui.hideAll();           // the class pick is sent; wait for the host's newRun
  });
}

/** CLIENT: the host re-seated us in its new run — rebuild our render shell and
 *  re-subscribe to the host's broadcasts with a clean snapshot state. */
function onClientNewRun(seat: string): void {
  startAsClient(pendingRejoinClass ?? CLASSES[0], seat);
  subscribeToHost();        // fresh onState/onZone for the new run (torn down at runEnd)
}

/** Where the death screen's "Rise Again" leads: a live co-op host KEEPS the
 *  session + deals a fresh class hand for the next run (re-seating clients via
 *  flushRejoins); single-player returns to the start menu. */
function onDeathDismiss(): void {
  if (coopActive()) {
    ui.showClassSelect(cls => { startGame(cls); flushRejoins(); });
  } else {
    toStartMenu();
  }
}

/** Open the co-op lobby (copy-paste WebRTC signaling). HOST keeps running the sim
 *  and accepts joiners; a JOINER becomes a render-only client of the host. */
function openLobby(): void {
  // Class choice is restricted to what THIS player has unlocked in their own
  // Vault (the host gates by the host's account, each joiner by their own) — a
  // real gameplay choice, not a free pick of every class.
  const unlocked = CLASSES.filter(c => isClassUnlocked(account, c.id));
  openCoopLobby({
    classes: (unlocked.length ? unlocked : CLASSES).map(c => ({ id: c.id, name: c.name, color: c.color, description: c.description })),
    host: async (classId) => {
      const rtc = new WebRtcTransport();
      try {
        rtc.onPeerJoin(onRemoteJoin);
        rtc.onPeerLeave(onRemoteLeave);
        await rtc.host({ name: 'Host', classId });
        const invite = await rtc.createInvite();   // fallible WebRTC work FIRST
        net = rtc;                                 // commit globals only on success
        wireSession();                             // run-lifecycle channel (runEnd/rejoin/newRun)
        startGame(CLASSES.find(c => c.id === classId) ?? CLASSES[0]); // host plays its own seat
        // newInvite mints a FRESH offer for the NEXT joiner (star topology — each
        // peer gets its own RTCPeerConnection), so >2-player co-op actually works.
        return { invite, accept: (resp: string) => rtc.acceptAnswer(resp), newInvite: () => rtc.createInvite() };
      } catch (e) { rtc.leave(); throw e; }        // net + world stay untouched on failure
    },
    join: async (offer, classId) => {
      const rtc = new WebRtcTransport();
      const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];
      try {
        net = rtc;
        subscribeToHost();
        wireSession();                             // run-lifecycle channel (runEnd/newRun)
        const { answer, joined } = await rtc.createAnswer(offer, { name: 'Joiner', classId });
        const connected = joined.then(({ self }) => startAsClient(cls, self));
        return { answer, connected };
      } catch (e) { resetToLocal(); throw e; }     // a bad paste must revert net to LocalTransport
    },
    onClose: () => { /* host keeps playing; a non-started joiner just closes */ },
  });
}

/** Become a render-only CLIENT of a host: a shell World backs the camera/HUD/
 *  getters, but it never simulates — the frame loop's client branch applies the
 *  host's snapshots and renders. clientSeatId anchors the camera on OUR hero. */
function startAsClient(classDef: ClassDef, selfSeat: string): void {
  world = new World(account, Object.freeze(buildManifest(account, rollSeed())));
  world.createPlayer(classDef);   // a local shell (getters/camera/HUD) — not the authority
  world.clientSeatId = selfSeat;
  // META mutations on a client are INTENTS: ship them to the host (which owns every
  // mutation) instead of applying to the throwaway render shell. requestMeta routes
  // through this; the host applies it to our seat and replicates the result back.
  world.clientActionHook = (action) => net.sendSession({ t: 'action', action });
  // Reset movement-prediction state so our input seq realigns with the host's fresh
  // per-seat ack (a new run = a fresh World on the host = an empty lastInputSeq).
  inputSeq = 0; predictHistory.length = 0; predZoneId = '';
  deathShown = false;
  running = true;
  ui.hideAll();
}

/** Drop any co-op transport back to a fresh LocalTransport, so the NEXT run is
 *  plain single-player (never serializes). Idempotent. */
function resetToLocal(): void {
  unsubscribeFromHost();
  sessionDispose?.(); sessionDispose = null;
  pendingRejoins.clear(); pendingRejoinClass = null;
  pendingActions.length = 0;
  net.leave();
  net = new LocalTransport();
  lastSentZone = '';
}

/** Return to the start menu, always resetting the transport to local first — so
 *  a co-op host's death or a client's Leave can't strand a stale WebRtcTransport. */
function toStartMenu(): void {
  resetToLocal();
  running = false;
  ui.showStartMenu(startGame, resumeGame, openLobby);
}

/** Leave a co-op session and return to the menu (client or host). */
function leaveCoop(): void { toStartMenu(); }
requestAnimationFrame(frame);
