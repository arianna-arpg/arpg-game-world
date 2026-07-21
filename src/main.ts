// ---------------------------------------------------------------------------
// Entry point: boots the world, runs the loop, and routes player input into
// the same skill pipeline the AI uses.
// ---------------------------------------------------------------------------

import { Input } from './core/input';
import { PAD_CFG, PadState, synthEscape, type FakePad, type PadTuning } from './core/gamepad';
import { COUCH_CFG } from './data/couch';
import { PadClaimScanner, PadSeatInput } from './net/couch';
import { CouchJoinOverlay, type CouchJoinChoice, type CouchJoinView } from './ui/couchJoin';
import { applyCursor } from './core/cursor';
import { assistAim, AIM_ASSIST } from './engine/aimassist';
import { PadPointer } from './ui/padpointer';
import { applyUiScale, installUiScaleStyles } from './ui/uiScale';
import { rollSeed } from './core/rng';
import { validateContent } from './data/validate';
import './data/clusters'; // side-effect: registers the data-driven cluster stamps
import './data/formations'; // side-effect: registers the patterned formation stamps
import './engine/landmarkBuilders'; // side-effect: registers the landmark shape builders
import './data/landmarks'; // side-effect: registers the geographic landmark recipes
import './engine/layoutRecipes'; // side-effect: registers the composed layout recipes
import './engine/interiorGen'; // side-effect: registers the interior layouts (dungeon/labyrinth/edifice) + room roles
import './data/massifs'; // side-effect: registers the massif mass kinds (+ the 'massif' recipe via engine/massif)
import './data/settled'; // side-effect: the settled-belt kit (+ the 'fields'/'district' recipes via engine/settled)
import './data/garden'; // side-effect: the Garden country kit (kinds, formations, compositions, the nest role pool)
import './data/grove'; // side-effect: the Grove country kit (lantern flora, the hollow way down)
import './data/compositions'; // side-effect: registers the whole-zone composition bundles
import './data/fog'; // side-effect: registers the living fog bank kinds
import './data/creeps'; // side-effect: registers the living creep kinds
import './data/traversals'; // side-effect: registers the vertical-crossing kinds (sky launch/fall)
import './data/glyphParts'; // side-effect: registers the shipped hand-drawn part kinds (the glyph roster)
import { updateAI } from './engine/ai';
import { World, type Seat } from './engine/world';
import { buildManifest, reconcileManifest, type ExpeditionManifest } from './packages/manifest';
import { bumpLedger, mergeLedger } from './packages/ledger';
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
import { DEV, GAME_TITLE } from './config';
import { mountDevPanel } from './dev/panel';
import { mountPassiveEditor } from './dev/passiveEditor';
import { mountEntityForge } from './dev/entityForge';
import { mountGlyphForge } from './dev/glyphForge';
import { loadWorkshopSync, reconcileWorkshopFromDisk } from './meta/workshop';
import { perfSweep, type PerfSweepOpts, type PerfSweepReport } from './dev/perf';
import { applyCredits, creditsForDeath, isClassUnlocked, LEDGER_ACCOUNT_DEATHS, type Account } from './meta/account';
import {
  loadAccount, loadAccountAsync, loadSettings, loadSettingsAsync,
  saveAccount, saveAccountDurable, saveSettings, resetAccount,
} from './meta/persistence';
import {
  applySavedCharacter, clearCharacter, loadCharacter, loadCharacterAsync,
  loadRosterSave, persistRun, persistRunDurable,
  rebuildSavedMeta, saveCouchGuest,
  type CharacterSave,
} from './meta/character';
import { resolveResumeSpawn } from './meta/worldstate';
import { freeRosterSlot, mintCharId, modeById, rosterCapacity, type RosterEntry } from './meta/modes';
import { healMercEngagements, releaseMercsOf } from './meta/mercs';
import type { Settings } from './meta/settings';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const input = new Input(canvas);

// The ACCOUNT and the keybind SETTINGS are loaded ONCE here and live in module
// scope — they outlive every character death and World recreation. World, UI,
// and the renderer hold the SAME references; they are never re-loaded mid-run.
const account: Account = loadAccount();
const settings: Settings = loadSettings();

// THE UI SCALE DIAL (ui/uiScale.ts): install the fabric stylesheet once, then
// stamp the saved scale — panels, tooltips, and the canvas HUD all wake at the
// player's size, not at 100% until they visit Options.
installUiScaleStyles();
applyUiScale(settings.uiScale);

const renderer = new Renderer(canvas, () => settings);
// The thematic cursor identity (style + tint) — applied at boot; the options
// view re-applies on change. The pad reticle shares the same tint.
applyCursor(settings.cursor);

// CONTROLLER: polled once at the top of each frame. Buttons ride the padBinds
// settings map; sticks feed movement/aim as axes. Feel numbers resolve here —
// PAD_CFG engine defaults overlaid by the player's persisted Settings.pad.
const padTuning = (): PadTuning => ({
  deadzone: settings.pad.deadzone,
  stickCurve: PAD_CFG.stickCurve,
  // The player's aim-sensitivity dial, resolved across the engine's exponent
  // span — 0.5 lands exactly on stickCurve (the classic feel).
  aimCurve: PAD_CFG.aimCurve.relaxed
    + (PAD_CFG.aimCurve.twitchy - PAD_CFG.aimCurve.relaxed) * settings.pad.aimSensitivity,
  triggerThreshold: PAD_CFG.triggerThreshold,
  aimMinRadius: PAD_CFG.aim.minRadius,
  aimMaxRadius: settings.pad.aimRadius,
  pointerSpeed: settings.pad.pointerSpeed,
  swapSticks: settings.pad.swapSticks,
});
const pad = new PadState(padTuning);
const padPointer = new PadPointer(pad, padTuning);
// AIM ARBITRATION: the last device to speak owns the reticle. Any right-stick
// deflection hands it to the pad instantly; the mouse must accumulate a
// DELIBERATE bit of travel (PAD_CFG.mouseReclaimPx) to take it back, so an
// idle arrow nudged by a desk bump can't yank targeting across the screen.
let aimSource: 'mouse' | 'pad' = 'mouse';
const lastMouse = { x: -1, y: -1 };
let mouseReclaim = 0;
// The game's visible aim: the assisted reticle point + the soft-lock target,
// refreshed by readLocalInput and fed to the renderer each frame.
let padLock: number | null = null;
let padAimView: { x: number; y: number; lockId: number | null } | null = null;
// MOUSE HANDOFF (PAD_CFG.mouseHandoff): when the mouse reclaims aim from the
// pad, this screen-space offset carries the reticle's position into the
// mouse's aim — aim = arrow + offset — so targeting continues from where the
// reticle truly was instead of flipping to wherever the arrow sat parked. It
// melts with mouse travel until arrow and aim are one and the arrow returns.
let mouseHandoff: { x: number; y: number } | null = null;

/** The one gate for drawing the in-world game reticle (and hiding the OS
 *  arrow): live play, no menus/pointer, a hero who can act. Both the renderer
 *  feed and the handoff's honesty rule (below) key off this. */
function reticleAllowed(): boolean {
  return running && !ui.uiBlocking() && !padPointer.active
    && !world.player.dead && !world.player.downed;
}

/** Feed the renderer this frame's aim view: the HUD mouse plus — while the
 *  PAD owns the reticle in live play, or a mouse HANDOFF is still carrying
 *  the pad's aim — the aim point (and soft-lock target) the in-world reticle
 *  draws at. The canvas hides the OS arrow whenever the reticle is the
 *  cursor; once the handoff melts (or a menu needs the arrow) it returns. */
function feedRendererAim(): void {
  renderer.hudMouse = input.mouse;
  const allowed = reticleAllowed();
  // HONESTY RULE: the moment the OS arrow must be visible (menus, pointer
  // mode, death), its position is truth again — a hidden handoff offset
  // would mean clicking one place and aiming another. Drop it.
  if (mouseHandoff && !allowed) mouseHandoff = null;
  const padOwns = aimSource === 'pad' && allowed;
  const handoffOwns = aimSource === 'mouse' && mouseHandoff !== null && allowed;
  renderer.padAim = (padOwns || handoffOwns) ? padAimView : null;
  const wantCursor = (padOwns || handoffOwns) ? 'none' : '';
  if (canvas.style.cursor !== wantCursor) canvas.style.cursor = wantCursor;
}

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

/** Stand a fresh World up with its SHELL POLICIES wired — the seam where the
 *  transport layer (which the engine can't see) parameterizes engine fabrics.
 *  Today: the timeflow's menu-hold gate — menus hard-pause the sim only when
 *  this machine owns the one real sim AND no live peer shares it (a co-op
 *  world is never one player's to stop; a client render-shell never holds). */
function adoptWorld(w: World): World {
  // (Couch guests count as live players too — a shared screen is never one
  // player's to stop, so a seated guest waives the menu hold like a peer.)
  w.timeflow.allowHold = () => net.isHost && !coopActive() && !w.couchActive();
  return w;
}

// Graft every content package's factions into the shared data registries BEFORE
// any World is built or the content validator runs (mutates FACTIONS/traits/…).
registerAllPackageFactions();

// A placeholder world until a run begins (the start menu is shown first); it is
// replaced wholesale by startGame / resumeGame with the run's frozen manifest.
let world = adoptWorld(new World(account, Object.freeze(buildManifest(account, rollSeed()))));
const ui = new UI(
  () => world, () => account, () => saveAccount(account),
  () => settings, () => saveSettings(settings),
  () => !net.isHost,        // a network co-op CLIENT (world is a render shell)
  () => leaveCoop(),        // tear down a co-op session → back to the menu
);
// The rebind view captures pad buttons through these (panels never touch the
// device layer directly — same altitude as its getSettings/saveSettings deps).
ui.armPadCapture = (cb) => pad.armCapture(cb);
ui.disarmPadCapture = () => pad.disarmCapture();
// DEVICE OF THE MOMENT: bind hints, '{bind:…}' prompt tokens, and slot labels
// all follow whichever device spoke last (the pad's recency window —
// PAD_CFG.activeWindow). One arbiter, injected at the same altitude as the
// settings getters: neither surface ever touches the device layer directly.
const padActiveNow = (): boolean => pad.activeRecently(performance.now() / 1000);
renderer.getPadActive = padActiveNow;
ui.getPadActive = padActiveNow;

let running = false;
let deathShown = false;
let uiRefreshTimer = 0;
let autosaveTimer = 0;

function startGame(classDef: ClassDef, manifest?: ExpeditionManifest, modeId?: string, name?: string): void {
  couchReset(); // a new world seats no ghosts — guests re-join from the menu
  // The LIFE-CONTRACT (meta/modes.ts): class select passes the sworn mode.
  // A roster mode binds an account VESSEL at creation — the character saves
  // cross-session into its own slot from its first breath.
  const mode = modeById(modeId);
  // THE NAME (Naming/Nemesis): player-given, else named for its class — the
  // thread the world's memory follows across runs.
  const charName = name?.trim() || classDef.name;
  // EVERY character gets an identity — mercenary engagements (and any future
  // cross-character bookkeeping) key off it, mortal or vessel alike.
  const charId = mintCharId();
  if (mode.save === 'roster') {
    const slot = freeRosterSlot(account, mode);
    if (slot == null) { toStartMenu(); return; } // picker greys full modes; this is the belt
    account.roster.push({
      charId, modeId: mode.id, slot, classId: classDef.id, name: charName,
      level: 1, stage: 0, savedAt: Date.now(),
    });
    saveAccount(account);
  }
  // A run-slot start OVERWRITES the previous run save — release any merc
  // contract that run held (its patron ceases to exist right here, not at
  // the next boot's self-heal).
  if (mode.save !== 'roster') {
    const prev = loadCharacter();
    if (prev?.charId && releaseMercsOf(account, prev.charId) > 0) saveAccount(account);
  }
  // The manifest is the run-LOCKED package config. Phase 4's Expedition screen
  // passes a configured one; otherwise build it from the account's saved prefs.
  const m = manifest ?? buildManifest(account, rollSeed());
  world = adoptWorld(new World(account, Object.freeze(m)));
  world.createPlayer(classDef, { modeId: mode.id, charId, name: charName });
  // A GRADUATED account (Mireille's flask lesson lived once, any character)
  // skips the re-walk: the flasks arrive learned, barred, and brimming at
  // first breath. No-op until that first graduation — and placed BEFORE
  // persistRun so the baseline snapshot already carries them.
  world.dealVeteranFlasks();
  lastSentZone = '';        // force a fresh terrain broadcast for (re)joining clients
  if (COOP_ALLY) spawnCoopAlly();
  persistRun(account, world); // baseline snapshot so a fresh run is resumable
  // A roster character never touches the shared run slot — the mortal
  // Continue stays valid beside it (the vessels are additional lives).
  if (mode.save !== 'roster') ui.setContinueSave(null);
  ui.resetRunView();        // a new world must not inherit the old run's map zoom/tabs/pin
  deathShown = false;
  running = true;
}

/** Class-select adapter: the picker hands back (class, sworn mode, name);
 *  startGame wants (class, manifest, mode, name). One arrow so no call site
 *  can transpose them. */
const startPicked = (d: ClassDef, modeId?: string, name?: string): void => startGame(d, undefined, modeId, name);

/** THE WAKEFUL WORLD: stand the saved world back up around a freshly-resumed
 *  character — adopt the save's world section (zone graph, discovery, clock,
 *  quests, zone memory, overlay snapshots), then wake per the resolved policy
 *  (mode pin ▷ player setting ▷ engine default). A save with NO adoptable
 *  world resumes fresh exactly as before worldstate existed — with its
 *  generated objective keys scrubbed, so a re-rolled world can't wake
 *  pre-cleared ground. Shared by both resume paths (run slot + roster). */
function restoreWorldState(world: World, save: CharacterSave): void {
  if (!save.world || !world.adoptWorldState(save.world)) {
    world.scrubStaleObjectives(); // fresh reroll — createPlayer already stood us in town
    return;
  }
  // THE SEALED SHORES reconcile: restored rivers rebuild their exits to the
  // dealt landings only and re-stamp their berths (an older save's
  // accumulated discovery roads rewire to the nearest port and heal away).
  world.reconcileSoulrivers();
  const mode = modeById(world.meta.modeId);
  world.resumeSpawn(resolveResumeSpawn(mode.resume, settings.resumeSpawn), save.world.player);
}

/** Resume an account-roster character (an Immortal vessel) from its own slot.
 *  Async (disk-first load); a missing/corrupt slot just returns to the menu —
 *  the entry stays listed, deletion is only ever the player's deliberate call. */
function resumeRosterChar(entry: RosterEntry): void {
  void (async (): Promise<void> => {
    couchReset();
    const save = await loadRosterSave(entry.slot);
    const classDef = save && CLASSES.find(c => c.id === save.classId);
    if (!save || !classDef) {
      ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);
      return;
    }
    const manifest = reconcileManifest(save.expedition, account, rollSeed());
    world = adoptWorld(new World(account, Object.freeze(manifest)));
    world.createPlayer(classDef, { modeId: entry.modeId, charId: entry.charId });
    if (!applySavedCharacter(world, save)) {
      ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);
      return;
    }
    // Identity drift heal: the save is the authority on mode/stage, the roster
    // card on charId — an old save missing its id re-adopts the card's.
    if (!world.meta.charId) world.meta.charId = entry.charId;
    restoreWorldState(world, save); // the vessel's world wakes with it
    lastSentZone = '';
    if (COOP_ALLY) spawnCoopAlly();
    ui.resetRunView();
    deathShown = false;
    running = true;
    ui.hideAll();
  })();
}

/** Resume the saved in-progress character, or fall back to the start menu.
 *  `preloaded` is the disk/local save fetched at boot; without it we read sync. */
function resumeGame(preloaded?: CharacterSave | null): void {
  couchReset();
  const save = preloaded ?? loadCharacter();
  const classDef = save && CLASSES.find(c => c.id === save.classId);
  // A saved character is always resumable — resume must NOT depend on the
  // (now random, slot-based) class-select roll. Only a missing/invalid save bails.
  if (!save || !classDef) {
    clearCharacter();
    ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);
    return;
  }
  // Rebuild the run-locked manifest from the save (tolerant of removed packages);
  // its stored seed makes the resumed world deterministic.
  const manifest = reconcileManifest(save.expedition, account, rollSeed());
  world = adoptWorld(new World(account, Object.freeze(manifest)));
  world.createPlayer(classDef);          // builds a valid skeleton in town…
  if (!applySavedCharacter(world, save)) { // …then the save overwrites the build
    clearCharacter();
    ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);
    return;
  }
  restoreWorldState(world, save);        // …and the world wakes around it
  if (COOP_ALLY) spawnCoopAlly();
  ui.resetRunView();        // same rule as startGame: fresh World, fresh view state
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
      pad: () => PadState;
      padPointer: () => PadPointer;
      fakePad: (p: FakePad | null) => void;
      step: (frames?: number, dtMs?: number) => void;
      devStartRun: (classId?: string) => string;
      perfFrames: (reset?: boolean) => { gap: number[]; sim: number[]; ren: number[] };
      perfSweep: (opts?: PerfSweepOpts) => Promise<PerfSweepReport>;
    };
  }
}
document.title = GAME_TITLE; // the one constant names every surface

window.__game = {
  world: () => world, ui, ai: updateAI, renderer,
  account: () => account, saveAccount: () => saveAccount(account),
  save: () => persistRun(account, world),
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
  // Controller state + the hardware stand-in (tests: __game.fakePad({axes,buttons})).
  pad: () => pad, padPointer: () => padPointer,
  fakePad: (p) => { window.__fakePad = p; },
  // Drive N frames synchronously — the antidote to rAF freezing in hidden
  // tabs; the ONLY way input polling (incl. the pad) runs under a harness.
  step: (frames = 1, dtMs = 16.7) => { for (let i = 0; i < frames; i++) tick(last + dtMs); },
  // DEV/QA: start a run headlessly (the perf harness's ignition) — the real
  // startGame path under the first (or named) class, menus dismissed.
  devStartRun: (classId?: string) => {
    const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];
    document.getElementById('start-menu')?.classList.add('hidden');
    document.getElementById('class-select')?.classList.add('hidden');
    startGame(cls);
    return cls.id;
  },
  // FRAME TELEMETRY readout: the ring buffers as plain arrays, oldest-first
  // (rAF gap = true pacing, sim ms, render ms). reset=true also clears —
  // how the perf sweep separates a zone's entry burst from its steady state.
  perfFrames: (reset = false) => {
    const n = perfCount, start = (perfIdx - n + PERF_RING) % PERF_RING;
    const out = { gap: new Array<number>(n), sim: new Array<number>(n), ren: new Array<number>(n) };
    for (let i = 0; i < n; i++) {
      const k = (start + i) % PERF_RING;
      out.gap[i] = perfGap[k]; out.sim[i] = perfSim[k]; out.ren[i] = perfRen[k];
    }
    if (reset) { perfIdx = 0; perfCount = 0; }
    return out;
  },
  perfSweep: (opts?: PerfSweepOpts) => perfSweep(opts),
};

// THE WORKSHOP (meta/workshop.ts): graft dev-authored entities from the
// localStorage mirror into the live registries BEFORE the content sweep, so
// a custom def answers to the exact same boot lint as shipped content.
loadWorkshopSync();
// Cross-check the data files; authoring mistakes warn instead of failing silently.
validateContent();

// DEV: the tabbed dev panel (config.ts DEV.panel). Off (0) = no-op.
if (DEV.panel) mountDevPanel(() => world);
// DEV: the passive-tree editor (config.ts DEV.passiveTreeEditor). Off (0) = no-op.
if (DEV.passiveTreeEditor) mountPassiveEditor(ui);
// DEV: the Entity Forge (config.ts DEV.entityForge) — start-menu button +
// full-screen editor; the dev panel's Forge tab rides it too. Off (0) = no-op.
// The Glyph Forge (draw kit-parts + doodad kinds) mounts SECOND so its
// start-menu hook chains behind the Entity Forge's.
if (DEV.entityForge) {
  mountEntityForge(ui, () => world);
  mountGlyphForge(ui, () => world);
}

// Boot: show the start menu immediately (built from the synchronous localStorage
// loaders so it appears instantly), THEN reconcile against the disk files in the
// background — the authoritative cross-session save. The disk loads warm the
// shared account/settings refs and enable Continue if a disk character exists.
ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);
ui.setContinueSave(loadCharacter());          // instant: localStorage cache
void (async (): Promise<void> => {
  const [a, s, c] = await Promise.all([loadAccountAsync(), loadSettingsAsync(), loadCharacterAsync()]);
  Object.assign(account, a);                  // mutate-in-place: shared refs stay valid
  Object.assign(settings, s);
  applyUiScale(settings.uiScale);             // the disk save may carry a different dial
  ui.setContinueSave(c);                       // disk save wins (re-renders the menu)
  // Workshop disk reconcile: the save file is the cross-session authority
  // (another machine, a cleared browser profile). When it changed anything,
  // re-run the content sweep so the adopted defs get linted too (rare — the
  // mirror matches the disk in steady state, so no double warnings normally).
  if (await reconcileWorkshopFromDisk()) validateContent();
  // SELF-HEAL: release merc engagements whose patron no longer exists anywhere
  // (a run save wiped without its death flow ever running).
  if (healMercEngagements(account, [c?.charId, ...account.roster.map(r => r.charId)]) > 0) {
    saveAccount(account);
  }
})();

/** Read the OS into the LOCAL seat's intent for this frame (or null when there's
 *  nothing to drive — dead/downed, or the pause menu is up). Pure input capture;
 *  it no longer touches the world directly — World.applyInputs does that, for
 *  every seat uniformly. `aim` is converted to WORLD space here so it's
 *  camera-independent (the one value that must survive the wire). */
function readLocalInput(dt: number): PlayerInput | null {
  const p = world.player;
  if (p.dead || p.downed) return null;
  if (ui.escapeMenuOpen) return null;

  const kb = settings.keybinds;
  const pb = settings.padBinds;
  // While the menu pointer owns the pad, its buttons/sticks are UI gestures,
  // not gameplay intent (Ⓐ under an inventory must never also swing a sword).
  // The keyboard/mouse half keeps flowing either way.
  const padLive = !padPointer.active;
  let dx = 0, dy = 0;
  if (input.keys.has(kb.moveUp) || (padLive && pad.isDown(pb.moveUp))) dy -= 1;
  if (input.keys.has(kb.moveDown) || (padLive && pad.isDown(pb.moveDown))) dy += 1;
  if (input.keys.has(kb.moveLeft) || (padLive && pad.isDown(pb.moveLeft))) dx -= 1;
  if (input.keys.has(kb.moveRight) || (padLive && pad.isDown(pb.moveRight))) dx += 1;
  // The move stick adds its ANALOG vector — deflection rides straight into
  // moveActor, so half-tilt is a slow stalk without any new movement path.
  if (padLive) { dx += pad.move.x; dy += pad.move.y; }
  // INVERTED MOVEMENT (Settings.invertMove): the player's own standard,
  // applied at the DEVICE layer — one flip for keys and stick alike,
  // before intent enters the wire (southpaw swaps WHICH stick moves; this
  // flips WHICH WAY movement goes). The widdershins hex flips again at the
  // engine's one mover, so a by-choice inverted hero who is hexed plays
  // STANDARD for the duration — two turns make a true; the XOR is the
  // design, not an accident.
  if (settings.invertMove) { dx = -dx; dy = -dy; }

  // Aim: the mouse cursor — unless the pad owns the reticle (last device to
  // speak wins). Pad aim is the stick's direction at deflection-scaled reach
  // from the hero, STICKY on release so the reticle holds where you left it,
  // then bent by the soft aim assist (engine/aimassist.ts) toward the held
  // target. The assisted point IS the reticle the renderer draws — what you
  // see is exactly what every castAtCursor skill receives.
  let aim = renderer.toWorld(input.mouse);
  if (aimSource === 'mouse' && mouseHandoff) {
    // A live HANDOFF: the pad's reticle handed the mouse this offset — aim
    // rides arrow+offset (melting in tick's motion block) so the switch
    // never flips facing toward a stale, parked arrow.
    aim = renderer.toWorld({
      x: input.mouse.x + mouseHandoff.x,
      y: input.mouse.y + mouseHandoff.y,
    });
    padAimView = { x: aim.x, y: aim.y, lockId: null };
  }
  if (aimSource === 'pad' && padLive) {
    const t = padTuning();
    const reach = pad.aimReach(pad.aimMag > 0 ? pad.aimMag : pad.lastAimMag, t);
    const raw = { x: p.pos.x + pad.lastAimDir.x * reach, y: p.pos.y + pad.lastAimDir.y * reach };
    // A zero-length frame (timer-resolution twins) must not re-run the
    // assist: the corrected glide strength would be exactly 0, and a
    // 0-strength assist reads as "free aim" — wiping the held lock and
    // flickering the view to raw for one frame. Deliver last frame's point
    // (buttons and movement below still read normally).
    if (dt <= 0 && padAimView) {
      aim = { x: padAimView.x, y: padAimView.y };
    } else {
      // Delivery mode (AIM_ASSIST_MODES; a held skill's def may someday
      // override this per skill). In 'cursor' mode with the stick at rest
      // the write-back below COMPOUNDS frame over frame — correct the blend
      // so the settle/track rate matches strength-per-frame at glideRefHz on
      // any monitor. A live stick frame is absolute (no compounding).
      const mode = settings.pad.assistMode;
      const sBase = settings.pad.aimAssist;
      const strength = (mode === 'cursor' && pad.aimMag === 0 && sBase < 1)
        ? 1 - Math.pow(1 - sBase, dt * AIM_ASSIST.glideRefHz)
        : sBase;
      const assisted = assistAim(world, p, raw, padLock, strength);
      padLock = assisted.targetId;
      aim = { x: assisted.x, y: assisted.y };
      if (mode === 'cursor' && padLock !== null) {
        // THE ASSIST MOVES THE CURSOR: fold the assisted point back into the
        // pad's sticky aim, so a broken lock (death, dash, wall) or a device
        // switch continues from where the reticle visibly is — never a snap
        // back to the pre-assist raw point. Hero-relative dir + reach is the
        // sticky aim's native space; reach inversion clamps to the player's
        // envelope (a target hugging the hero parks the cursor at min reach
        // in its direction — direction, and so facing, is always preserved).
        const dx = aim.x - p.pos.x, dy = aim.y - p.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1e-3) {
          const mag = (dist - t.aimMinRadius) / Math.max(1, t.aimMaxRadius - t.aimMinRadius);
          pad.setStickyAim({ x: dx / dist, y: dy / dist }, mag);
        }
      }
      padAimView = { x: aim.x, y: aim.y, lockId: padLock };
    }
  }

  // Slots 0/1 are LMB/RMB (fixed) — on a pad they're ordinary binds; slots
  // 2–7 merge the rebindable keys with their pad buttons. Keyboard OR pad,
  // per slot, per frame — the intent downstream can't tell which spoke.
  const slotActs = [
    'skillSlot0', 'skillSlot1', 'skillSlot2', 'skillSlot3',
    'skillSlot4', 'skillSlot5', 'skillSlot6', 'skillSlot7',
  ] as const;
  const skillKeys = [kb.skillSlot2, kb.skillSlot3, kb.skillSlot4, kb.skillSlot5, kb.skillSlot6, kb.skillSlot7];
  const held = [
    input.lmb || (padLive && pad.isDown(pb.skillSlot0)),
    input.rmb || (padLive && pad.isDown(pb.skillSlot1)),
    ...skillKeys.map((k, i) => input.keys.has(k) || (padLive && pad.isDown(pb[slotActs[i + 2]]))),
  ];
  const edge = [
    input.lmbPressed || (padLive && pad.justPressed(pb.skillSlot0)),
    input.rmbPressed || (padLive && pad.justPressed(pb.skillSlot1)),
    ...skillKeys.map((k, i) => {
      const fromKey = input.justPressed(k);
      const fromPad = padLive && pad.justPressed(pb[slotActs[i + 2]]);
      return fromKey || fromPad;
    }),
  ];
  // THE UNARMED-FLOOR opt-out (Settings.improvisedStrike): declined, an
  // EMPTY slot's press never leaves this client — the world's floor rule
  // (World.applyInputs' null-slot branch) stays universal; the refusal is
  // local input-shaping, exactly like a keybind. Each co-op peer's setting
  // shapes only their own hands.
  if (!settings.improvisedStrike) {
    for (let i = 0; i < held.length; i++) {
      if (!p.skills[i]) { held[i] = false; edge[i] = false; }
    }
  }
  // The META layer (rebindable; shift by default): modifier+slot fires the
  // slot skill's META-ACTION (Detonate / Enrage / Thrust!) INSTEAD of a new
  // press. HELD states survive the modifier — a raised guard or a running
  // channel must NOT drop because you reached for the meta button (the
  // shield-bash-on-shift bug); only fresh EDGES reroute.
  const metaKey = kb.metaModifier ?? 'shift';
  const metaEdgePressed = input.justPressed(metaKey)
    || (padLive && pad.justPressed(pb.metaModifier));
  if (input.keys.has(metaKey) || (padLive && pad.isDown(pb.metaModifier))) {
    const metaEdge = edge.map(() => false);
    for (let i = 0; i < edge.length; i++) if (edge[i]) metaEdge[i] = true;
    // HELD-CAST META (Phalanx while Shield Up): you can't re-press a
    // button you're already HOLDING — so during a held cast (guard /
    // channel / charge / overcharge), pressing the MODIFIER ALONE fires
    // the HELD skill's meta. Scoped to exactly that slot: three channel
    // skills on the bar never fire three metas — only the one in hand.
    if (metaEdgePressed && p.casting
      && ['guard', 'channel', 'charge', 'overcharge', 'concentration'].includes(p.casting.mode)) {
      const ci = p.skills.findIndex(s => s === p.casting!.inst);
      if (ci >= 0) metaEdge[ci] = true;
    }
    return { dx, dy, aim, held, edge: edge.map(() => false), metaEdge };
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
  // gameplay intent is suppressed (readLocalInput returns null). An open DWELL
  // dialog (caravan / toll / sail) is dismissed FIRST and the press stops there —
  // Esc on a dialog means "close this", not "pause the game on top of it".
  // ESCAPE is a strict, predictable CASCADE — every press does exactly ONE
  // legible thing, in order of how "modal" the thing is:
  //   0. a running crafting minigame owns the screen (Esc waits it out),
  //   1. the pause menu closes,
  //   2. an open DWELL dialog dismisses (their closes carry semantics —
  //      closing the vocation offer DECLINES it; one dialog per press),
  //   3. any ordinary panels (sheet/book/tree/map/inventory) all clear —
  //      Esc here means "give me my screen back", NEVER "pause on top",
  //   4. a clear screen: NOW Esc is the pause menu.
  if (input.justPressed('escape')) {
    if (ui.minigameRunning()) return;
    if (ui.escapeMenuOpen) { ui.hideEscapeMenu(); return; }
    // The couch join overlay dismisses like any dialog — one press, gone.
    if (ui.couchJoinOpen) { closeCouchJoin(); return; }
    // COUCH: the hero's Esc walks ITS OWN cascade — a guest's open panels
    // are the guest's business (their Ⓑ walks theirs). Solo falls through
    // to the classic global cascade below, byte-identically.
    if (couchActive()) {
      if (!ui.escCascadeFor(world.localSeat.id)) ui.showEscapeMenu();
      return;
    }
    if (ui.caravanOpen) { ui.closeCaravan(); return; }
    if (ui.vendorOpen) { ui.closeVendor(); return; }
    if (ui.salvageOpen) { ui.closeSalvage(); return; }
    if (ui.oracleOpen) { ui.closeOracle(); return; }
    if (ui.bestiaryOpen) { ui.closeBestiary(); return; }
    if (ui.sailOpen) { ui.closeSail(); return; }
    if (ui.mercOpen) { ui.closeMercMenu(); return; }
    if (ui.boroughOpen) { ui.closeBorough(); return; }
    // The vocation choice menu closes through its OWN close (not hideAll):
    // closeVocationMenu also DECLINES the offer, else the dwell re-pops the
    // menu the instant the pause menu comes down.
    if (ui.vocationOpen) { ui.closeVocationMenu(); return; }
    if (ui.anyPanelOpen()) { ui.hideAll(); return; }
    ui.hideAll();
    ui.showEscapeMenu();
    return;
  }
  if (ui.escapeMenuOpen) return;
  // Panel toggles answer to key OR pad bind — and the pad ones deliberately
  // stay live in pointer mode (the D-pad flips panels while browsing them).
  const pb = settings.padBinds;
  if (input.justPressed(kb.panelChar) || pad.justPressed(pb.panelChar)) ui.toggleCharSheet();
  if (input.justPressed(kb.panelTree) || pad.justPressed(pb.panelTree)) ui.toggleTree();
  if (input.justPressed(kb.panelMap) || pad.justPressed(pb.panelMap)) ui.toggleMap();
  if (input.justPressed(kb.panelInv) || pad.justPressed(pb.panelInv)) ui.toggleInventory();
  // GEAR pickup — a META intent (host-validated, co-op-replicated), not raw
  // world poking; the open bag re-renders so the grab appears instantly.
  if (input.justPressed(kb.pickup) || pad.justPressed(pb.pickup)) {
    world.requestMeta({ t: 'pickupItem' });
    if (ui.inventoryOpen) ui.refreshInventory();
  }
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

// ---------------------------------------------------------------------------
// THE COUCH SESSION (data/couch.ts) — a second LOCAL player on this screen.
// A guest is an ordinary Seat: its intent is a PadSeatInput on a claimed pad,
// its panels dock to its flank, its vessel (immortal lane) persists to its
// own roster slot. Everything here short-circuits to nothing with no guests
// seated — the solo invariant. main.ts owns the session (the world owns only
// the seats), exactly as it owns the net transport.
// ---------------------------------------------------------------------------
interface CouchGuestCtx {
  seatId: string;
  padIdx: number;
  gpad: PadState;
  source: PadSeatInput;
  pointer: PadPointer;
  /** Immortal-lane vessel context: the roster slot + the join-time save
   *  (its dormant menagerie rides back out verbatim at persist). */
  vessel?: { slot: number; save: CharacterSave };
}
const couchGuests = new Map<string, CouchGuestCtx>();
const couchPadSet = new Set<number>();
const couchScanner = new PadClaimScanner();
const couchOverlay = new CouchJoinOverlay();
let couchClaimPad: number | null = null;
let couchSeatSerial = 0;

function couchActive(): boolean { return couchGuests.size > 0; }

// The hero's merged pad read skips claimed guest pads (null = byte-identical
// classic read while no guest is seated).
pad.padExclude = () => (couchPadSet.size ? couchPadSet : null);

/** A guest's gameplay parks while a global surface is up or its own pointer
 *  owns its pad (its panels are open) — the guest twin of P1's padLive gate. */
function couchGuestSuspended(id: string): boolean {
  const g = couchGuests.get(id);
  return !g || ui.escapeMenuOpen || ui.couchJoinOpen || g.pointer.active;
}

/** The join overlay's claim exclusions: pads already claimed + the hero's own
 *  LIVE pad (recently spoken) — a pad P1 is actively holding never joins. */
function couchClaimExcluded(): ReadonlySet<number> {
  const out = new Set(couchPadSet);
  if (pad.sourceIndex !== null && pad.activeRecently(performance.now() / 1000)) {
    out.add(pad.sourceIndex);
  }
  return out;
}

/** THE LANE LAW: the guest joins the run's OWN lane — an immortal run seats
 *  another vessel from this account's roster (a second immortal slot must be
 *  unlocked); a mortal run seats a fresh, disposable hero (the net join's
 *  Tier-0 idiom). */
function couchLaneImmortal(): boolean { return modeById(world.meta.modeId).save === 'roster'; }

function couchChoices(): CouchJoinChoice[] {
  if (!couchLaneImmortal()) {
    return CLASSES.filter(c => isClassUnlocked(account, c.id)).map(c => ({
      key: 'class:' + c.id, title: c.name, sub: c.description, color: c.color,
    }));
  }
  const mode = modeById(world.meta.modeId);
  if (rosterCapacity(account, mode) < COUCH_CFG.join.immortalSlotsNeeded) {
    return [{
      key: 'none', title: 'A second Immortal slot is required', color: '#8a8678', sub: '',
      disabled: 'Unlock another Immortal vessel slot in the Vault to bring a second vessel to the couch.',
    }];
  }
  const rows = account.roster.filter(r => r.modeId === mode.id && r.charId !== world.meta.charId);
  if (!rows.length) {
    return [{
      key: 'none', title: 'No second vessel sworn', color: '#8a8678', sub: '',
      disabled: 'Swear another Immortal from the start menu first — the couch seats an existing vessel.',
    }];
  }
  return rows.map(r => ({
    key: 'vessel:' + r.charId,
    title: `${r.name} — Level ${r.level}`,
    sub: `${CLASSES.find(c => c.id === r.classId)?.name ?? r.classId} · ${mode.name}`,
    color: mode.color,
  }));
}

function couchJoinView(): CouchJoinView {
  const lane = couchLaneImmortal()
    ? 'Immortal run — a second VESSEL from this account joins.'
    : 'Mortal run — a fresh hero joins for this run (the run is the character).';
  return couchClaimPad === null
    ? {
      phase: 'claim', lane,
      message: 'Press Ⓐ on the JOINING controller to claim it.',
      choices: [], onPick: () => { /* no choices yet */ }, onCancel: closeCouchJoin,
    }
    : {
      phase: 'pick', lane,
      message: `Controller ${couchClaimPad + 1} claimed — choose who joins.`,
      choices: couchChoices(), onPick: couchJoin, onCancel: closeCouchJoin,
    };
}

function openCouchJoin(): void {
  if (!running || !net.isHost || !(net instanceof LocalTransport)) return;
  if (world.couchSeats().length >= COUCH_CFG.join.maxLocal - 1) return;
  couchClaimPad = null;
  couchScanner.reset();
  ui.couchJoinOpen = true;
  couchOverlay.show(couchJoinView());
}

function closeCouchJoin(): void {
  ui.couchJoinOpen = false;
  couchClaimPad = null;
  couchOverlay.hide();
}

/** Mint the guest seat: transport peer + PadState bound to the claimed pad +
 *  the PadSeatInput source + a pointer of its own, flank-tagged. */
function mintCouchSeat(padIdx: number, cls: ClassDef, vessel?: CouchGuestCtx['vessel']): Seat | null {
  if (!(net instanceof LocalTransport)) return null;
  const id = 'c' + (++couchSeatSerial);
  net.addLocalSeat({ id, name: vessel?.save.name ?? cls.name, classId: cls.id });
  const gpad = new PadState(padTuning);
  gpad.padIndex = padIdx;
  const source = new PadSeatInput(gpad, {
    tuning: padTuning,
    binds: () => settings.padBinds,
    assist: () => ({ mode: settings.pad.assistMode, strength: settings.pad.aimAssist }),
    improvisedStrike: () => settings.improvisedStrike,
    invertMove: () => settings.invertMove,
    suspended: () => couchGuestSuspended(id),
  });
  const seat = world.addSeat(id, cls, source);
  const side = COUCH_CFG.join.sides[
    Math.min(COUCH_CFG.join.sides.length - 1, world.couchSeats().length + 1)] ?? 'right';
  seat.couch = { pad: padIdx, side };
  const pointer = new PadPointer(gpad, padTuning);
  pointer.onCancel = () => couchGuestCancel(id);
  couchGuests.set(id, { seatId: id, padIdx, gpad, source, pointer, vessel });
  couchPadSet.add(padIdx);
  return seat;
}

/** The pick handler: 'class:<id>' seats a fresh mortal-lane hero; 'vessel:
 *  <charId>' loads + grafts the roster vessel (async disk-first read). */
function couchJoin(pick: string): void {
  if (couchClaimPad === null) return;
  const padIdx = couchClaimPad;
  if (pick.startsWith('class:')) {
    const cls = CLASSES.find(c => c.id === pick.slice('class:'.length));
    if (cls) mintCouchSeat(padIdx, cls);
    closeCouchJoin();
    return;
  }
  if (!pick.startsWith('vessel:')) return;
  const charId = pick.slice('vessel:'.length);
  const entry = account.roster.find(r => r.charId === charId);
  if (!entry) { closeCouchJoin(); return; }
  void (async (): Promise<void> => {
    const save = await loadRosterSave(entry.slot);
    const built = save && rebuildSavedMeta(save);
    const cls = save && CLASSES.find(c => c.id === save.classId);
    if (!save || !built || !cls) { closeCouchJoin(); return; }
    const seat = mintCouchSeat(padIdx, cls, { slot: entry.slot, save });
    if (seat) {
      world.adoptSeatMeta(seat, built.meta, save.bar, save.level);
      seat.couchDeaths = built.deaths;
      if (!seat.meta.charId) seat.meta.charId = entry.charId;
      seat.couch!.charId = seat.meta.charId;
      seat.couch!.rosterSlot = entry.slot;
    }
    closeCouchJoin();
  })();
}

/** Persist every seated guest VESSEL to its own roster slot (the persistRun
 *  sibling; disposable mortal-lane guests carry nothing to save). */
function persistCouchGuests(durable = false): void {
  for (const g of couchGuests.values()) {
    if (!g.vessel) continue;
    const seat = world.seats.find(s => s.id === g.seatId);
    if (!seat) continue;
    saveCouchGuest(account, world, seat, g.vessel.slot, g.vessel.save, durable);
  }
}

/** A guest leaves mid-run (the escape row): vessel saved, seat removed, pad
 *  released — the frame narrows back to the hero on its own smoothing. */
function couchLeave(id: string): void {
  const g = couchGuests.get(id);
  if (!g) return;
  persistCouchGuests();
  world.removeSeat(id);
  if (net instanceof LocalTransport) net.removeLocalSeat(id);
  g.pointer.dispose();
  couchGuests.delete(id);
  couchPadSet.delete(g.padIdx);
  renderer.couchAims = [];
}

/** Tear the whole couch session down (run end / menu). Persistence is the
 *  CALLER's duty first — this only drops the session machinery. */
function couchReset(): void {
  for (const g of couchGuests.values()) g.pointer.dispose();
  couchGuests.clear();
  couchPadSet.clear();
  renderer.couchAims = [];
  if (ui.couchJoinOpen) closeCouchJoin();
}

/** The guest's Ⓑ/cancel cascade — their panels first, then the shared pause. */
function couchGuestCancel(id: string): void {
  if (ui.couchJoinOpen) { closeCouchJoin(); return; }
  if (ui.escCascadeFor(id)) return;
  synthEscape();
}

/** Per-frame couch work, right after the hero's own device poll: guest pads
 *  poll on the same wall clock, guest pointers wake on THEIR OWN blocking
 *  surfaces, the join overlay runs its claim scan, and the renderer gets the
 *  guests' reticles in their class tints. No guests = nothing. */
function couchTick(dt: number, nowSec: number): void {
  for (const g of couchGuests.values()) {
    g.gpad.poll(nowSec);
    g.pointer.update(dt, ui.blockingFor(g.seatId) || !running, nowSec);
    // Guest START = the shared pause (either player may pause the couch).
    if (g.gpad.justPressed(PAD_CFG.escapeButton)) synthEscape();
  }
  if (ui.couchJoinOpen) {
    if (couchClaimPad === null) {
      const hit = couchScanner.scan(COUCH_CFG.join.claimButton, couchClaimExcluded());
      if (hit !== null) couchClaimPad = hit;
    }
    couchOverlay.update(couchJoinView());
  }
  if (couchGuests.size) {
    renderer.couchAims = [...couchGuests.values()].flatMap(g => {
      const seat = world.seats.find(s => s.id === g.seatId);
      const a = g.source.aimView();
      return seat && a && !seat.actor.dead && !seat.actor.downed
        ? [{ x: a.x, y: a.y, lockId: a.lockId, color: seat.meta.classDef.color }] : [];
    });
  }
}

/** Guest panel toggles + pickup, off the guest's OWN pad binds — the couch
 *  twin of handleLocalPanels (host branch only; guests exist only there). */
function handleCouchPanels(): void {
  if (ui.escapeMenuOpen || ui.couchJoinOpen) return;
  const pb = settings.padBinds;
  for (const g of couchGuests.values()) {
    const seat = world.seats.find(s => s.id === g.seatId);
    if (!seat || seat.actor.dead || seat.actor.downed) continue;
    if (g.gpad.justPressed(pb.panelChar)) ui.toggleCharSheet(g.seatId);
    if (g.gpad.justPressed(pb.panelTree)) ui.toggleTree(g.seatId);
    if (g.gpad.justPressed(pb.panelMap)) ui.toggleMap();
    if (g.gpad.justPressed(pb.panelInv)) ui.toggleInventory(g.seatId);
    if (g.gpad.justPressed(pb.pickup)) {
      world.applyAction(seat, { t: 'pickupItem' });
      if (ui.inventoryOpen) ui.refreshInventory();
    }
  }
}

// The pause-menu row (panels.ts gates it on pads + a free guest seat).
ui.onCouchJoin = openCouchJoin;
ui.onCouchLeave = () => {
  for (const id of [...couchGuests.keys()]) couchLeave(id);
};

// --- FRAME TELEMETRY (always on; read via __game.perfFrames) -----------------
// Three fixed ring buffers of per-frame wall-clock samples: the rAF GAP (true
// frame pacing — the jitter a player feels, compositor included), the SIM
// milliseconds (input + AI + world.update), and the RENDER milliseconds. Cost
// is two performance.now() calls and three float writes per frame — nothing.
// The perf harness (npm run perf → src/dev/perf.ts) reduces these to
// percentiles/hitch counts per zone; a future in-game FPS readout reads the
// same rings.
const PERF_RING = 2048;
const perfGap = new Float32Array(PERF_RING);
const perfSim = new Float32Array(PERF_RING);
const perfRen = new Float32Array(PERF_RING);
let perfIdx = 0, perfCount = 0;
function perfPush(gap: number, sim: number, ren: number): void {
  perfGap[perfIdx] = gap; perfSim[perfIdx] = sim; perfRen[perfIdx] = ren;
  perfIdx = (perfIdx + 1) % PERF_RING;
  if (perfCount < PERF_RING) perfCount++;
}

let last = performance.now();
/** The rAF pump: one tick, then re-arm. All work lives in tick() so tests can
 *  drive frames SYNCHRONOUSLY via __game.step() — a hidden tab freezes rAF
 *  entirely (the tab-throttle gotcha), which would otherwise freeze input
 *  polling, the pad, and the sim under any headless/backgrounded harness. */
function frame(now: number): void {
  tick(now);
  requestAnimationFrame(frame);
}
function tick(now: number): void {
  const frameGapMs = now - last; // true frame pacing, BEFORE the dt clamp
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // CONTROLLER, before anything reads input: poll the device, settle who owns
  // the reticle, run the menu pointer (it consumes Ⓐ/Ⓑ while active), and fire
  // the pad's hardwired Escape — a synthetic keystroke, so the entire close-
  // cascade stays single-sourced in handleLocalPanels.
  const nowSec = now / 1000;
  pad.poll(nowSec);
  if (input.mouse.x !== lastMouse.x || input.mouse.y !== lastMouse.y) {
    // The mouse reclaims aim only through DELIBERATE travel: motion
    // accumulates while the pad holds the reticle, and only past the
    // threshold does the arrow take over (then it owns aim on any motion).
    const moved = Math.hypot(input.mouse.x - lastMouse.x, input.mouse.y - lastMouse.y);
    lastMouse.x = input.mouse.x; lastMouse.y = input.mouse.y;
    if (aimSource === 'pad') {
      mouseReclaim += moved;
      if (mouseReclaim >= PAD_CFG.mouseReclaimPx) {
        aimSource = 'mouse'; mouseReclaim = 0;
        // THE RETICLE HANDS THE MOUSE THE CURSOR: the switch starts aiming
        // exactly where the reticle was (assist and all), not wherever the
        // arrow sat parked — the offset melts with travel (block below).
        // Only while the reticle was truly the cursor (live play): if the
        // arrow was visible (menus etc.), its own position is the truth.
        if (padAimView && reticleAllowed()) {
          const rs = renderer.toScreen(padAimView);
          mouseHandoff = { x: rs.x - input.mouse.x, y: rs.y - input.mouse.y };
        }
      }
    } else if (mouseHandoff) {
      // MELT the handoff with deliberate travel — each px of motion scales
      // the offset by (1 − px/mergePx); once it's within doneEps of zero,
      // arrow and aim are one and the honest OS arrow returns.
      const h = PAD_CFG.mouseHandoff;
      const k = Math.max(0, 1 - moved / h.mergePx);
      mouseHandoff.x *= k; mouseHandoff.y *= k;
      if (Math.hypot(mouseHandoff.x, mouseHandoff.y) < h.doneEps) mouseHandoff = null;
    }
  }
  // Any live aim-stick deflection reclaims the reticle for the pad (and ends
  // any mouse handoff — the pad's sticky cursor is absolute again).
  if (pad.aimMag > 0) { aimSource = 'pad'; mouseReclaim = 0; mouseHandoff = null; }
  // COUCH: the hero's pointer wakes only on surfaces that block THE HERO'S
  // hands (a guest's open bag must not flip P1 into menu mode); solo keeps
  // the classic any-surface gate byte-identically.
  padPointer.update(dt,
    (couchActive() ? ui.blockingFor(world.localSeat.id) : ui.uiBlocking()) || !running, nowSec);
  couchTick(dt, nowSec);
  if (pad.justPressed(PAD_CFG.escapeButton)) synthEscape();

  if (running) {
    if (net.isHost) {
      // ---- HOST (and single-player / local co-op): run the one real sim. ----
      const perfSimT0 = performance.now();
      // 1. Local UI (pause menu, panels) — never gameplay intent. The couch
      //    guests' panel toggles ride their own pads right behind.
      handleLocalPanels();
      handleCouchPanels();
      // 2. Gather this frame's per-seat intent into the transport. The local seat
      //    reads the OS; other LOCAL seats (the scripted ally) poll their source.
      //    A REMOTE seat's intent arrives through the transport's own pump.
      const li = readLocalInput(dt);
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
      // Mirror the gear-pickup feel preference onto the sim (Settings is a
      // UI concern the World can't import; a boolean crosses the seam).
      world.gearVacuum = settings.gearPickup !== 'key';
      world.update(dt);
      // DWELL → MENU polls. The world keeps simulating under the pause menu,
      // so a dwell can fire while it's up — HOLD the request (don't clear)
      // until the pause menu closes, else a station menu pops OVER the pause
      // screen and Escape starts fighting through stacked surprises.
      // The Caravanner dwell (in TOWN) asks to open the band-travel menu.
      if (world.caravanDwellRequested && !ui.escapeMenuOpen) {
        world.caravanDwellRequested = false;
        if (!ui.caravanOpen) ui.showCaravan();
      }
      // The salvage-bench dwell asks to open the break/craft menu.
      if (world.salvageDwellRequested && !ui.escapeMenuOpen) {
        world.salvageDwellRequested = false;
        if (!ui.salvageOpen) ui.showSalvage(world.salvageDwellSeatId);
      }
      // The HARBOR BOARD dwell (a port's notice board) asks to open the
      // harbor menu — hearsay, passage down the lanes, charts. (The dock
      // itself still casts off directly; the board is the harbor's EARS.)
      if (world.harborDwellRequested && !ui.escapeMenuOpen) {
        world.harborDwellRequested = false;
        if (!ui.sailOpen) ui.showSail();
      }
      // The MUSTER HORN dwell (a harborhold's gate post) asks to open the
      // hold panel — the town's standing, the muster, the restoration.
      if (world.holdDwellRequested && !ui.escapeMenuOpen) {
        world.holdDwellRequested = false;
        if (!ui.holdOpen) ui.showHold();
      }
      // The Oracle-stone dwell asks to open the communion menu.
      if (world.oracleDwellRequested && !ui.escapeMenuOpen) {
        world.oracleDwellRequested = false;
        if (!ui.oracleOpen) ui.showOracle(world.oracleDwellSeatId);
      }
      // The Tracker's-fire dwell asks to open the Bestiary.
      if (world.trackerDwellRequested && !ui.escapeMenuOpen) {
        world.trackerDwellRequested = false;
        if (!ui.bestiaryOpen) ui.showBestiary(world.trackerDwellSeatId);
      }
      // A stocked vendor counter's dwell asks to open the Vendor screen.
      if (world.vendorDwellRequested && !ui.escapeMenuOpen) {
        world.vendorDwellRequested = false;
        if (!ui.vendorOpen) ui.showVendor(world.vendorDwellSeatId);
      }
      // The quartermaster dwell with FRESH vocation chains on offer asks to open
      // the CHOICE menu (a subclass pick is deliberate — never auto-accepted).
      if (world.vocationOfferRequested && !ui.escapeMenuOpen) {
        world.vocationOfferRequested = false;
        if (!ui.vocationOpen) ui.showVocationMenu();
      }
      // The mercenary outpost's calm parley asks to open the hire/retire menu.
      if (world.mercOutpostRequested && !ui.escapeMenuOpen) {
        world.mercOutpostRequested = false;
        if (!ui.mercOpen) ui.showMercMenu();
      }
      // A borough villager's arming dwell asks to open the arming panel.
      if (world.boroughArmRequested && !ui.escapeMenuOpen) {
        world.boroughArmRequested = false;
        if (!ui.boroughOpen) ui.showBorough(world.boroughArmFolkId);
      }
      // The run wrote an ACCOUNT-scoped unlock (a vocation grant) — persist it
      // now, so closing the game without dying can't lose it.
      if (world.accountDirty) {
        world.accountDirty = false;
        saveAccount(account);
      }
      // Dwelling by the return-Caravanner IN THE WILDS ports straight home — no menu.
      if (world.caravanReturnRequested) {
        world.caravanReturnRequested = false;
        world.startCaravan(0);
      }
      // (The dock dwell now CASTS OFF into the sailing mode directly — handled
      // inside world.updateSail; the Sail menu panel stays dormant.)
      // (The Holdfast toll pays directly on the keeper dwell — an essence price
      // needs no bargain menu; the prompt over the keeper advertises the ask.)
      feedRendererAim();
      const perfRenT0 = performance.now();
      renderer.render(world);
      perfPush(frameGapMs, perfRenT0 - perfSimT0, performance.now() - perfRenT0);

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
      const li = readLocalInput(dt);
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
  pad.endFrame();
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
  // persistRun routes the write to the character's slot (run vs roster vessel)
  // and keeps the roster index card fresh alongside it.
  if (!world.gameOver) {
    autosaveTimer -= dt;
    if (autosaveTimer <= 0) { autosaveTimer = 20; persistRun(account, world); persistCouchGuests(); }
  }

  // The sim mutated character save-state OUTSIDE the autosave cadence — a mode
  // respawn banked a death (corpse/stage/strip), an own-ring corpse was
  // reclaimed. Persist immediately: the same promptness accountDirty gets.
  if (world.charDirty) {
    world.charDirty = false;
    persistRun(account, world);
  }
  // A couch guest's vessel banked something (the guest covenant on a wipe,
  // a meta mutation) — persist it with charDirty's promptness.
  if (world.couchDirty) {
    world.couchDirty = false;
    persistCouchGuests();
  }

  // A roster-saved character chose Save & Main Menu (their "End Run" — the
  // vessel persists; only a deliberate roster deletion ever discards it).
  if (world.menuExitRequested) {
    world.menuExitRequested = false;
    persistRun(account, world);
    persistCouchGuests();
    toStartMenu();
  }

  if (world.gameOver && !deathShown) {
    deathShown = true;
    // CO-OP: tell connected clients the run ended so they leave their (now-frozen)
    // render shell and offer a fresh class pick — no reload, the session lives on.
    if (coopActive()) net.sendSession({ t: 'runEnd' });
    // COUCH: guest vessels ride home before the world is torn down (mortal-
    // lane guests carry nothing); the session machinery drops with the run.
    persistCouchGuests();
    couchReset();
    ui.hideAll();
    // PERMADEATH: award account credits from how far the run got — at the
    // dying stage's payout rate (mortal = ×1, byte-identical; a future
    // reduced-tithe hardcore variant is pure mode data) — persist the
    // account, and WIPE the character save (the account survives, the run doesn't).
    const stage = world.modeStageDef();
    const earned = Math.floor(
      creditsForDeath(world.player.level, world.visited.size, world.kills) * stage.deathPayoutMult);
    applyCredits(account, earned);
    // PERMANENT progression: fold this run's trigger counters (crowned_killed,
    // …) into the account ledger so package unlocks stick like credits do —
    // unless the dying stage is sealed outside the account loop (mode policy).
    if (stage.metaProgression) mergeLedger(account.ledger, world.ledger);
    // CORPSE RUN + the lifetime death tally: only an actual death (not a
    // forfeit) records a corpse or counts toward death-gated unlocks — both
    // captured BEFORE clearCharacter wipes the gems.
    if (world.runEndReason === 'death') {
      world.recordDeath();
      if (stage.countsAccountDeath) bumpLedger(account.ledger, LEDGER_ACCOUNT_DEATHS);
    }
    // ANY conclusion — death, forfeit, retirement — ends the merc contract:
    // the veteran returns to the pool, waiting on some future outpost.
    releaseMercsOf(account, world.meta.charId);
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
    ui.refreshCharSheet(); ui.refreshInventory(); ui.refreshTree();
  }
  // Resource/stat values on the char sheet + map drift every frame even with no
  // meta change — keep them live on the same 0.5s throttle the host uses.
  uiRefreshTimer -= dt;
  if (uiRefreshTimer <= 0) { uiRefreshTimer = 0.5; ui.refreshCharSheet(); ui.refreshMap(); }
  feedRendererAim();
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
  // A peer arriving ends any solo menu-pause mid-hold: the shared world is
  // never one player's to stop (the allowHold policy refuses NEW holds in
  // co-op; this sweeps one already standing when the session became live).
  world.timeflow.releaseKind('menu');
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
  couchReset(); // a render shell hosts no couch — the pads are free again
  world = adoptWorld(new World(account, Object.freeze(buildManifest(account, rollSeed()))));
  world.createPlayer(classDef);   // a local shell (getters/camera/HUD) — not the authority
  world.clientSeatId = selfSeat;
  // META mutations on a client are INTENTS: ship them to the host (which owns every
  // mutation) instead of applying to the throwaway render shell. requestMeta routes
  // through this; the host applies it to our seat and replicates the result back.
  world.clientActionHook = (action) => net.sendSession({ t: 'action', action });
  // Reset movement-prediction state so our input seq realigns with the host's fresh
  // per-seat ack (a new run = a fresh World on the host = an empty lastInputSeq).
  inputSeq = 0; predictHistory.length = 0; predZoneId = '';
  ui.resetRunView();        // the client's shell world is new too — reset the view state
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
  couchReset(); // guest seats die with the world; the pads are free again
  running = false;
  ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);
}

/** Leave a co-op session and return to the menu (client or host). */
function leaveCoop(): void { toStartMenu(); }

// THE QUIT FLUSH: Alt-F4, the window ✕, a tab close — one last DURABLE save
// (sendBeacon, the same machinery the permadeath wipe trusts to survive a
// closing tab) so the worldstate captures the CLOSING MOMENT, not the last
// 20s autosave tick. This is what makes the 'exact' resume honest: quitting
// out of a bad fight relaunches into that same bad fight, position, wounds
// and all. Host-only (a co-op client owns no save); a dead run never flushes
// (its slot was durably wiped by the death flow — a late write would
// resurrect the corpse). pagehide AND beforeunload both fire on some paths,
// so a short debounce keeps it to one beacon.
let lastQuitFlush = -Infinity;
function quitFlush(): void {
  if (!running || world.gameOver || !net.isHost) return;
  const now = performance.now();
  if (now - lastQuitFlush < 1000) return;
  lastQuitFlush = now;
  persistRunDurable(account, world);
  persistCouchGuests(true); // guest vessels ride the same closing beacon
}
window.addEventListener('pagehide', quitFlush);
window.addEventListener('beforeunload', quitFlush);
requestAnimationFrame(frame);
