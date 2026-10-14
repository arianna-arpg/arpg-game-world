export interface NativeLoadingResponsivenessRow {file:string;rawBeforeHash:string;rawAfterHash:string;beforeHash:string;afterHash:string;crlfLines:number[];hunks:{before:string;after:string}[]}
export interface NativeLoadingResponsivenessArchive {parent:unknown;incoming:string;rows:NativeLoadingResponsivenessRow[];readers:{file:string;before:string;after:string;edits:{before:string;after:string}[];original:string;nonImportHash:string;assertionHash:string;assertions:number}[];archives:{file:string;sha256:string}[];runtime:{file:string;sha256:string}[];accepted:{file:string;sha256:string}[];unchanged:{file:string;sha256:string}[];probes:string[]}
export const nativeLoadingResponsivenessArchive:NativeLoadingResponsivenessArchive = {
  "parent": "fcbfefd748b055679a1ec5e54be72d7e96168c83",
  "incoming": "fcbfefd748b055679a1ec5e54be72d7e96168c83",
  "rows": [
    {
      "file": "CLAUDE.md",
      "rawBeforeHash": "fdc1361619d85b74f55cab4fa3dd1af91cc24e203ee69b5dc26e7b0bb68bbba6",
      "rawAfterHash": "161f8b4dc2fc3a401bc8a09214ab6e9ade0066893913ab08dc14254ec2618a62",
      "beforeHash": "fdc1361619d85b74f55cab4fa3dd1af91cc24e203ee69b5dc26e7b0bb68bbba6",
      "afterHash": "513cecf64384af62189451f13af63180f3bf3f21f284222a65ad07e350466a8c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "Seamless consolidation (2026-10-14): codex/seamless-world-foundation is the\ncanonical branch. Local 5a7eac00 and remote cbafcc5b join through genuine merge\nancestry; the pinned main a2fa4291 is already merged. Read",
          "after": "Firefox loading follow-up (2026-10-14): local retained fresh/Continue/Mu entry\nnow advances between completed native stages under the loading screen. Private\nfactory/resume receipts, campaign frames and borrowed policies stay synchronous;\nfinal adoption and saving have no intervening await. Keep exact account/slot\nleases and cancellation fences, native partial effects, full live geography\ndescriptor checks, independent reader state, and original synchronous APIs.\nImmutable geography reuse is bounded and must retain full prototype and native\nserializer provenance checks. Read docs/engine/native-loading-followup-20261014.md\nfor measured Firefox acceptance and remaining parity gates. Run its standalone\nchecks, original affected native/source probes, all four types, generation and\nreal browser/boot courses. Do not edit the historical probe roster, assertions,\narchives, thresholds or negative controls; the exact predecessor adapter preserves\ntheir original source boundary. No new branch or Shards integration is implied.\n\nSeamless consolidation (2026-10-14): codex/seamless-world-foundation is the\ncanonical branch. Local 5a7eac00 and remote cbafcc5b join through genuine merge\nancestry; the pinned main a2fa4291 is already merged. Read"
        }
      ]
    },
    {
      "file": "src/main.ts",
      "rawBeforeHash": "b37fd5d5ad8a3bfa615d6d7c77f028f1005a18415775c72ffb0d6b735b5cc5ec",
      "rawAfterHash": "713eafbcae62758b313532a43670e40c8d0a0fc4d9b1b615f933bea406470d94",
      "beforeHash": "b37fd5d5ad8a3bfa615d6d7c77f028f1005a18415775c72ffb0d6b735b5cc5ec",
      "afterHash": "d2d2dec9e7a55c811cf4434cdcac2a17a2a5f7141174f86690624cb2b58562b2",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { resolveResumeSpawn } from './meta/worldstate';\nimport { characterResumeFields } from './meta/characterResume';\nimport { prepareNativeCharacterContinue } from './worldmass/nativeClientContinue';\nimport { NativeClientStart } from './worldmass/nativeClientStart';\nimport { nativeClientRuntimeFor, type NativeClientRuntime } from './worldmass/nativeClientRuntime';\nimport type { HeroInputQuery, HeroInputSource } from './agent/perception';\nimport { DEFAULT_MODE_ID, freeRosterSlot, mintCharId, modeById, rosterCapacity, type RosterEntry } from './meta/modes';\nimport { healMercEngagements, releaseMercsOf } from './meta/mercs';\nimport type { Settings } from './meta/settings';\n\nconst canvas = document.getElementById('game') as HTMLCanvasElement;\nconst input = new Input(canvas);\nconst loadingScreen = new LoadingScreen(() => { input.clearForLoading(); barPress = null; });\nlet loadingGate: { world: World; lease: LoadingLease } | undefined;\n\n// ---------------------------------------------------------------------------\n// THE CRASH TRAP (game half — the early half is inline in index.html and owns\n// everything before this module evaluates). Installed FIRST, before the boot\n// work below, so a throw anywhere later still lands in the full trap. Every\n// uncaught error / unhandled rejection appends to the SAME ring the early\n// trap seeded (window.__bootErrors, cap 20); the FIRST fatal:\n//  1. stands the saves down (meta/persistence.ts suppressSaves — baseline,\n//     autosave, menu-exit, quit flush, durable wipes all refuse, so a crash\n//     mid-corruption can never overwrite the last good save),\n//  2. raises THE CRASH OVERLAY (ui/errorOverlay.ts — no auto-dismiss), and\n//  3. ends the rAF pump (frame() stops re-arming — a crashed sim is not\n//     ticked onward beneath the overlay; only a restart resumes).\n// DOCTRINE (start simple): EVERYTHING uncaught is fatal. If real noise ever\n// surfaces — say a transport's benign rejection — the refinement is to route\n// it to crashPush (ring-only, no latch) here, not to grow a taxonomy.\n// ---------------------------------------------------------------------------\nconst crashRing: CrashEntry[] = (window.__bootErrors ??= []);\nlet crashFatal: CrashEntry | null = null;\nfunction crashPush(kind: string, msg: string, stack?: string): CrashEntry {\n  const entry: CrashEntry = { t: Date.now(), kind, msg, stack };\n  if (crashRing.length >= 20) crashRing.shift();\n  crashRing.push(entry);\n  return entry;\n}\nfunction reportFatal(err: unknown, kind: string): void {\n  const e = err instanceof Error ? err : null;\n  const entry = crashPush(kind, e?.message ?? String(err ?? 'unknown error'), e?.stack);\n  if (crashFatal) return;   // the first fatal owns the screen; later ones just ring\n  crashFatal = entry;\n  loadingScreen.close();\n  console.error('[crash] fatal —', err);\n  suppressSaves(`fatal ${kind}: ${entry.msg}`);\n  try { showErrorOverlay(entry, crashRing); }\n  catch (overlayErr) { console.error('[crash] the overlay itself failed to raise', overlayErr); }\n}\nwindow.__gameBooted = true;   // the early trap's boot-failure fallback stands down\nif (window.__bootTrapTimer !== undefined) clearTimeout(window.__bootTrapTimer);\nwindow.onerror = (msg, _src, _line, _col, err): void => { reportFatal(err ?? msg, 'uncaught error'); };\nwindow.onunhandledrejection = (ev): void => { reportFatal(ev.reason, 'unhandled rejection'); };\n\n// The ACCOUNT and the keybind SETTINGS are loaded ONCE here and live in module\n// scope — they outlive every character death and World recreation. World, UI,\n// and the renderer hold the SAME references; they are never re-loaded mid-run.\nconst account: Account = loadAccount();\nreconcileClassBundleGems(account);\nconst settings: Settings = loadSettings();\n\n// THE UI SCALE DIAL (ui/uiScale.ts): install the fabric stylesheet once, then\n// stamp the saved scale — panels, tooltips, and the canvas HUD all wake at the\n// player's size, not at 100% until they visit Options.\ninstallUiScaleStyles();\napplyUiScale(settings.uiScale);\n// THE UI STACK LAW (ui/zorder.ts): seat every selector-delivered surface on\n// its rung before anything shows — activatable panels above every canvas.\ninstallUiStack();\n\nconst renderer = new Renderer(canvas, () => settings);\n// The thematic cursor identity (style + tint) — applied at boot; the options\n// view re-applies on change. The pad reticle shares the same tint.\napplyCursor(settings.cursor);\n\n// CONTROLLER: polled once at the top of each frame. Buttons ride the padBinds\n// settings map; sticks feed movement/aim as axes. Feel numbers resolve here —\n// PAD_CFG engine defaults overlaid by the player's persisted Settings.pad.\nconst padTuning = (): PadTuning => ({\n  deadzone: settings.pad.deadzone,\n  stickCurve: PAD_CFG.stickCurve,\n  // The player's aim-sensitivity dial, resolved across the engine's exponent\n  // span — 0.5 lands exactly on stickCurve (the classic feel).\n  aimCurve: PAD_CFG.aimCurve.relaxed\n    + (PAD_CFG.aimCurve.twitchy - PAD_CFG.aimCurve.relaxed) * settings.pad.aimSensitivity,\n  triggerThreshold: PAD_CFG.triggerThreshold,\n  aimMinRadius: PAD_CFG.aim.minRadius,\n  aimMaxRadius: settings.pad.aimRadius,\n  pointerSpeed: settings.pad.pointerSpeed,\n  swapSticks: settings.pad.swapSticks,\n});\nconst pad = new PadState(padTuning);\nconst padPointer = new PadPointer(pad, padTuning);\n// AIM ARBITRATION: the last device to speak owns the reticle. Any right-stick\n// deflection hands it to the pad instantly; the mouse must accumulate a\n// DELIBERATE bit of travel (PAD_CFG.mouseReclaimPx) to take it back, so an\n// idle arrow nudged by a desk bump can't yank targeting across the screen.\nlet aimSource: 'mouse' | 'pad' = 'mouse';\nconst lastMouse = { x: -1, y: -1 };\nlet mouseReclaim = 0;\n// The game's visible aim: the assisted reticle point + the soft-lock target,\n// refreshed by readLocalInput and fed to the renderer each frame.\nlet padLock: number | null = null;\nlet padAimView: { x: number; y: number; lockId: number | null } | null = null;\n// MOUSE HANDOFF (PAD_CFG.mouseHandoff): when the mouse reclaims aim from the\n// pad, this screen-space offset carries the reticle's position into the\n// mouse's aim — aim = arrow + offset — so targeting continues from where the\n// reticle truly was instead of flipping to wherever the arrow sat parked. It\n// melts with mouse travel until arrow and aim are one and the arrow returns.\nlet mouseHandoff: { x: number; y: number } | null = null;\n// THE PRESSABLE BAR (renderer.hudSlotRects — drawn == tested): a mouse press\n// that lands on the hero's own bar slot becomes THAT slot's press for as long\n// as the button stays down (held casts channel, guards hold), and the LMB's\n// own slot-0 contribution is withheld for the press — pressing a button must\n// never also swing the primary. The press AIMS where the hero faces, at the\n// pad's mid reach, bent by the aim assist at full strength (the stick's own\n// aim law: the cursor is on the bar, not on the battlefield). A touch rides\n// the same seam — a tap is a press — so the bar is the first HUD surface a\n// thumb can work (docs/design/mobile-touch.md).\nlet barPress: { slot: number; lock: number | null; meta?: boolean } | null = null;\n/** The LOCAL hero's bar slot under a CSS-pixel point, or null. */\nfunction hudSlotAt(cssX: number, cssY: number): number | null {\n  for (const r of renderer.hudSlotRects) {\n    if (r.seatId !== world.localSeat.id) continue;\n    if (cssX >= r.x && cssX < r.x + r.w && cssY >= r.y && cssY < r.y + r.h) return r.slot;\n  }\n  return null;\n}\n/** THE PRESSABLE META (renderer.hudMetaRects — drawn == tested): the LOCAL\n *  hero's slot whose META mini-button sits under a CSS-pixel point, or\n *  null. A plain click there IS that slot's meta press — no modifier, no\n *  primary swing — the stance shift's clickable door and every other\n *  meta's (Detonate, Recall, Thrust) alike. */\nfunction hudMetaSlotAt(cssX: number, cssY: number): number | null {\n  for (const r of renderer.hudMetaRects) {\n    if (r.seatId !== world.localSeat.id) continue;\n    if (cssX >= r.x && cssX < r.x + r.w && cssY >= r.y && cssY < r.y + r.h) return r.slot;\n  }\n  return null;\n}\n\n/** The one gate for drawing the in-world game reticle (and hiding the OS\n *  arrow): live play, no menus/pointer, a hero who can act. Both the renderer\n *  feed and the handoff's honesty rule (below) key off this. */\nfunction reticleAllowed(): boolean {\n  return running && !ui.uiBlocking() && !padPointer.active\n    && !world.player.dead && !world.player.downed;\n}\n\nlet speechPointerOnCanvas = false;\ncanvas.addEventListener('mousemove', () => { speechPointerOnCanvas = true; });\ncanvas.addEventListener('mouseleave', () => { speechPointerOnCanvas = false; });\nwindow.addEventListener('blur', () => { speechPointerOnCanvas = false; });\n\n/** Feed the renderer this frame's aim view: the HUD mouse plus — while the\n *  PAD owns the reticle in live play, or a mouse HANDOFF is still carrying\n *  the pad's aim — the aim point (and soft-lock target) the in-world reticle\n *  draws at. The canvas hides the OS arrow whenever the reticle is the\n *  cursor; once the handoff melts (or a menu needs the arrow) it returns. */\nfunction feedRendererAim(): void {\n  renderer.hudMouse = input.mouse;\n  const allowed = reticleAllowed();\n  // HONESTY RULE: the moment the OS arrow must be visible (menus, pointer\n  // mode, death), its position is truth again — a hidden handoff offset\n  // would mean clicking one place and aiming another. Drop it.\n  if (mouseHandoff && !allowed) mouseHandoff = null;\n  const padOwns = aimSource === 'pad' && allowed;\n  const handoffOwns = aimSource === 'mouse' && mouseHandoff !== null && allowed;\n  const speechMouse = { x: input.mouse.x / input.pointerScale, y: input.mouse.y / input.pointerScale };\n  renderer.speechPointerEnabled = allowed && aimSource === 'mouse' && !handoffOwns && speechPointerOnCanvas\n    && !renderer.hudClusterRects.some(r => speechMouse.x >= r.x && speechMouse.x <= r.x + r.w\n      && speechMouse.y >= r.y && speechMouse.y <= r.y + r.h);\n  renderer.padAim = (padOwns || handoffOwns) ? padAimView : null;\n  const wantCursor = (padOwns || handoffOwns) ? 'none' : '';\n  if (canvas.style.cursor !== wantCursor) canvas.style.cursor = wantCursor;\n}\n\n// Networking transport. LocalTransport runs single-player + local co-op (host\n// with one machine); a WebRtcTransport (same NetTransport contract) swaps in for\n// a real over-the-wire session. `let` so the lobby can replace it. `?coop` spawns\n// a local stand-in ally so the multi-seat path plays/verifies with no networking.\nlet net: NetTransport = new LocalTransport();\nconst COOP_PARAMS = new URLSearchParams(location.search);\n/** `?coophuman` = a second LOCAL HUMAN seat (arrow keys); `?coop` = a scripted one. */\nconst COOP_HUMAN = COOP_PARAMS.has('coophuman');\nconst COOP_ALLY = COOP_PARAMS.has('coop') || COOP_HUMAN;\n/** `?crashtest` — THE NEGATIVE CONTROL for the crash trap (dev-only, the\n *  `?prologue` idiom): one second after boot, tick() throws deliberately so\n *  the whole capture → overlay → save-stand-down path can be drilled and the\n *  refusals observed live. OFF (param absent) this is one always-false\n *  compare per frame — zero behavior change. */\nlet crashTestAt = COOP_PARAMS.has('crashtest') ? performance.now() + 1000 : Infinity;\n\n// Host→client snapshot broadcast at a FIXED wire rate (decoupled from the host's\n// render FPS), only ever while real peers are connected — single-player/local-only\n// never builds one, so SP stays byte-identical.\nconst STATE_HZ = 20;\nlet stateTimer = 0;\nlet snapTick = 0;\n/** THE SMOOTH SHELL (net/shell.ts, client only): the client's whole timeline. Each arriving\n *  snapshot is ADOPTED once (state, the own build under THE ECHO LAW); each frame places it\n *  (remote bodies on THE JITTER BUFFER's delayed clock, flights and telegraphs on the newest\n *  pair), predicts the own hero (THE HONEST INPUT, THE SOFT CORRECTION, THE PREDICTED ROOT)\n *  and watches the link (THE WATCHDOG). Reset per session. */\nconst shell = new WireShell();\n/** CLIENT: set when a newly-arrived snapshot carried OUR replicated seat meta, so\n *  the client re-renders its open build panels (skill book / tree / char sheet)\n *  exactly when the data changes — the HUD is always live via the renderer. */\nlet clientMetaDirty = false;\n/** CLIENT: JSON of the last OWN-seat meta we triggered a panel re-render for — so\n *  the 1.5s heartbeat (which re-ships IDENTICAL meta) doesn't perpetually re-render\n *  the open build panels (which would yank a scrolled list back to the top). */\nlet lastMetaJson = '';\n/** HOST: re-dirty every seat this often (s) as a self-healing safety net for a\n *  delta-replicated meta snapshot that was dropped (congested channel) or coalesced. */\nconst META_HEARTBEAT = 1.5;\nlet metaHeartbeat = 0;\n/** Disposers for the client's onState / onZone subscriptions. */\nlet snapshotDispose: (() => void) | null = null;\nlet zoneDispose: (() => void) | null = null;\n/** Host: the last zone id whose terrain we broadcast (resend on change). */\nlet lastSentZone = '';\n/** A new transport or client shell needs terrain before its first state. */\nconst hostedPublications = new WeakMap<NativeClientRuntime, { transport: NetTransport; publication: NativeHostedPublication }>();\n/** Run-lifecycle (co-op) plumbing. sessionDispose tears down the onSession\n *  subscription on leave. HOST: pendingRejoins = peers who chose a class for the\n *  next run while the host wasn't yet in one (reseated when it starts). CLIENT:\n *  pendingRejoinClass = the class WE chose at the run-end screen (used when the\n *  host re-seats us via newRun). */\nlet sessionDispose: (() => void) | null = null;\n/** CLIENT: tears down the onHostLost subscription on leave — and, because it is\n *  dropped BEFORE net.leave() closes the channels, keeps our own teardown from\n *  calling back into the host-gone landing. */\nlet hostLostDispose: (() => void) | null = null;\nconst pendingRejoins = new Map<string, string>();\nlet pendingRejoinClass: ClassDef | null = null;\n/** CLIENT, THE SHARD: the vessel link of the last shard session (heroSave\n *  mirrors, THE DEATH COVENANT's word, our own bodies' rows — meta/shardVessel.ts). */\nlet shardVessel: ShardVesselLink | null = null;\n/** HOST: meta intents (point-spends, gem ops, drops) received from clients this\n *  frame, tagged with the sender's seat. Drained + applied just before world.update\n *  (so the change replicates in the SAME tick's snapshot). */\nconst pendingActions: Array<{ seat: string; action: MetaAction; seq?: number }> = []; // seq: THE ECHO LAW\n\n/** A LIVE over-the-wire co-op session with at least one connected peer. Gates the\n *  run-end broadcast + the keep-the-transport-alive restart path. */\nfunction coopActive(): boolean {\n  return net instanceof WebRtcTransport && net.peers().length > 1;\n}\n\n/** Stand a fresh World up with its SHELL POLICIES wired — the seam where the\n *  transport layer (which the engine can't see) parameterizes engine fabrics.\n *  Today: the timeflow's menu-hold gate — menus hard-pause the sim only when\n *  this machine owns the one real sim AND no live peer shares it (a co-op\n *  world is never one player's to stop; a client render-shell never holds). */\nlet resumeRequest = 0;\nlet resumeController: AbortController | null = null;\n/** Only the still-pending connection is owned by this entry generation. */\nlet pendingShardEntry: { readonly request: number; readonly transport: WsTransport } | undefined;\nfunction cancelCharacterResume(): void {\n  resumeRequest++;\n  if (resumeController) { resumeController.abort(); ui.setContinuePending(false); }\n  resumeController = null;\n  const pending = pendingShardEntry;\n  if (pending) {\n    pendingShardEntry = undefined;\n    if (net === pending.transport) resetToLocal(); else pending.transport.leave();\n  }\n}\nconst nativeStarts = new WeakMap<Account, NativeClientStart>();\nfunction nativeStartFor(owner: Account): NativeClientStart {\n  let start = nativeStarts.get(owner);\n  if (!start) { start = new NativeClientStart(owner); nativeStarts.set(owner, start); }\n  return start;\n}\nfunction clientReadiness(w: World): { status: 'ready' | 'pending' | 'refused'; required?: number; error?: string } | undefined {\n  const retained = nativeClientRuntimeFor(w);\n  return retained ? { status: retained.ready ? 'ready' : 'pending' } : w.massRuntime?.nativeReadiness(w);\n}\nlet previousAdoptedWorld: World | undefined;\nfunction adoptWorld(w: World): World {\n  if (loadingGate && loadingGate.world !== w) { loadingGate.lease.finish(); loadingGate = undefined; }\n  cancelCharacterResume();\n  w.bindGlobalPolicies();\n  if (previousAdoptedWorld && previousAdoptedWorld !== w) {\n    const previous = nativeClientRuntimeFor(previousAdoptedWorld);\n    if (previous) previous.retire(); else previousAdoptedWorld.massRuntime?.dispose();\n  }\n  previousAdoptedWorld=w;\n  // (Couch guests count as live players too — a shared screen is never one\n  // player's to stop, so a seated guest waives the menu hold like a peer.)\n  w.timeflow.allowHold = () => net.isHost && !coopActive() && !w.couchActive();\n  return w;\n}\n\n// Graft every content package's factions into the shared data registries BEFORE\n// any World is built or the content validator runs (mutates FACTIONS/traits/…).\nregisterAllPackageFactions();\n\n// A placeholder world until a run begins (the start menu is shown first); it is\n// replaced wholesale by startGame / resumeGame with the run's frozen manifest.\nlet world = adoptWorld(new World(account, Object.freeze(buildManifest(account, rollSeed()))));\n// THE SKILL SHOWCASE (src/showcase/host.ts): any surface's data-skill-showcase\n// element becomes a live showcase of that skill, wherever it is shown.\ninstallSkillShowcases(document.body);\nconst ui = new UI(\n  () => world, () => account, () => saveAccount(account),\n  () => settings, () => saveSettings(settings),\n  () => !net.isHost,        // a network co-op CLIENT (world is a render shell)\n  () => leaveCoop(),        // tear down a co-op session → back to the menu\n);\n// The rebind view captures pad buttons through these (panels never touch the\n// device layer directly — same altitude as its getSettings/saveSettings deps).\nui.armPadCapture = (cb) => pad.armCapture(cb);\nui.disarmPadCapture = () => pad.disarmCapture();\n// DEVICE OF THE MOMENT: bind hints, '{bind:…}' prompt tokens, and slot labels\n// all follow whichever device spoke last (the pad's recency window —\n// PAD_CFG.activeWindow). One arbiter, injected at the same altitude as the\n// settings getters: neither surface ever touches the device layer directly.\nconst padActiveNow = (): boolean => pad.activeRecently(performance.now() / 1000);\nrenderer.getPadActive = padActiveNow;\nui.getPadActive = padActiveNow;\n// THE MENU BAR's 'bar' anchor seats off the hero's DRAWN HUD cluster — the\n// rect the renderer published this frame (drawn == seated).\nui.onCosmeticsChanged = () => {\n  if (!net.isHost) net.sendSession({ t: 'cosmetics', loadout: account.cosmetics.loadout });\n};\nui.hudCluster = () => renderer.hudClusterRects.find(c => c.seatId === world.localSeat.id) ?? null;\n// Tab is the menu's default bind: keep the browser's focus walk from riding\n// the same press (a text field keeps its own Tab).\nwindow.addEventListener('keydown', (e) => {\n  if (e.key !== 'Tab') return;\n  const t = document.activeElement;\n  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;\n  e.preventDefault();\n});\n// THE HERO'S ADDRESS: '{name}' tokens in world-authored talk resolve against\n// the live hero at the same display seam as '{bind:…}' (Renderer.resolveText\n// → resolveNameTokens) — the closure reads the CURRENT world, so a new run's\n// hero re-addresses every line the moment it seats. THE RENOWN GATE\n// (World.heroKnown — run-scope; the Odyssey's first arm will stamp it): an\n// UNKNOWN hero feeds the BLANK name, so every token site current and future\n// degrades to the resolver's own 'Traveller' fallback through this one seam\n// — no per-line churn, and no future line can leak a name the world has not\n// yet learned.\nrenderer.getPlayerName = () => world.heroKnown() ? world.meta.name : '';\n// THE OBSTRUCTION CENSUS: the open DOM panes' rects, handed to the speech\n// fabric's PLACEMENT LAW (drawSpeeches → dodgeSpeechBox) so a talk bubble\n// slides out from under an open inventory instead of being swallowed.\nrenderer.uiObstructions = () => ui.obstructionRects();\n\nlet running = false;\n// Local navigation only. Future progression actions register validated engine\n// commands here; the reader never writes quest, reward or alignment state.\nconst dialogueActions = new DialogueActions<DialogueActionContext>();\ndialogueActions.register('menu', {\n  refusal: (context, action) => context.world === world ? ui.dialogueMenuRefusal(action.target) : 'This conversation has ended.',\n  run: (_context, action) => ui.activateDialogueMenu(action.target),\n});\nconst dialogue: DialogueUI = new DialogueUI({\n  conversationTopFloor: () => ui.conversationTopFloor(),\n  ownerChanged: (id, active) => { ui.conversationSpeakerId = id; ui.conversationWorkspaceActive = id !== null && active; },\n  createWorkspace: (root, changed) => new NpcConversationUI(root, {\n    world: () => world,\n    available: () => renderer.npcDialogueAvailable() && dialogue.open,\n    inventory: () => { if (!ui.inventoryOpen) ui.toggleInventory(); },\n    slotLabels: () => ui.conversationSlotLabels(),\n    changed: () => ui.refreshInventory(),\n  }, changed),\n  settings: () => settings, padActive: padActiveNow,\n  hudTop: () => ui.hudCluster?.()?.y,\n  resolveText: text => renderer.resolveText(text),\n  actions: dialogueActions,\n  available: () => renderer.npcDialogueAvailable(),\n});\nrenderer.npcDialogueOwner = () => dialogue.session.reading?.offer.speakerId ?? null;\nrenderer.npcDialogueAvailable = () => running && !world.player?.dead && !world.player?.downed && ui.dialogueContext().available;\nrenderer.onNpcDialogue = (w, line, focusId) => {\n  dialogue.setAvailable(renderer.npcDialogueAvailable());\n  dialogue.sync(w, line, focusId);\n};\n// A consumed dialogue button stays out of gameplay until physically released,\n// including the frame in which Finish closes the reader.\nconst dialoguePadHeld = new Set<string>();\nlet deathShown = false;\nlet uiRefreshTimer = 0;\nlet autosaveTimer = 0;\n\n/** Legacy crossing for non-death conclusions; actual deaths use the shared\n *  deathPresentation timeline. Co-op and deliberate forfeits stay immediate. */\nconst RUN_END_FADE = { outSec: 1.15 };\n/** The booked epilogue; revealing it never re-books the death. */\nlet pendingDeathScreen: { open: (revealSec?: number) => void; opened?: boolean } | null = null;\n\nfunction startGame(\n  classDef: ClassDef, manifest?: ExpeditionManifest, modeId?: string, name?: string,\n  graftSkillId?: string | null, kitPicks?: Record<string, string>,\n): void {\n  couchReset(); // a new world seats no ghosts — guests re-join from the menu\n  // THE PROLOGUE GATE (engine/scenes.ts), read FIRST — before a roster mode\n  // pushes its vessel and muddies the virgin-account test: an account that\n  // has never played walks the one-time opening scene; everyone else starts\n  // at the bedside as always. `?prologue` re-runs it deliberately for this\n  // page load (the ?couchpads lever precedent) — a veteran re-watching the\n  // opening, or a dev testing it, without touching the account gate.\n  const prologueDue = sceneDue(account, 'prologue')\n    || new URLSearchParams(location.search).has('prologue');\n  // THE ONE CROSSING (net/crossing.ts): a server-bound wake mints its vessel on a World that\n  // stands no local town (no zone loads, nothing is drawn); the shard's hearth is the far side.\n  // THE DOOR (W7): the tab's persisted binding is what a wake travels to.\n  const door = readDoor();\n  const serverBound = !!door && !prologueDue;\n  if (!serverBound) {\n    const started = nativeStartFor(account).begin({ kind: 'run', classDef, manifest, modeId, name,\n      graftSkillId, kitPicks, prologue: prologueDue ? 'force' : 'skip',\n      onReady: made => { world = adoptWorld(made.writer); if (COOP_ALLY) spawnCoopAlly(); },\n    });\n    if (!started) { toStartMenu(); return; }\n    lastSentZone = '';\n    if (modeById(modeId).save !== 'roster') ui.setContinueSave(null);\n    ui.resetRunView(); deathShown = false; pendingDeathScreen = null; running = true;\n    return;\n  }\n  // The LIFE-CONTRACT (meta/modes.ts): class select passes the sworn mode.\n  // A roster mode binds an account VESSEL at creation — the character saves\n  // cross-session into its own slot from its first breath.\n  const mode = modeById(modeId);\n  // THE NAME (Naming/Nemesis): player-given, else named for its class — the\n  // thread the world's memory follows across runs.\n  const charName = name?.trim() || classDef.name;\n  // EVERY character gets an identity — mercenary engagements (and any future\n  // cross-character bookkeeping) key off it, mortal or vessel alike.\n  const charId = mintCharId();\n  if (mode.save === 'roster') {\n    const slot = freeRosterSlot(account, mode);\n    if (slot == null) { toStartMenu(); return; } // picker greys full modes; this is the belt\n    account.roster.push({\n      charId, modeId: mode.id, slot, classId: classDef.id, name: charName,\n      level: 1, stage: 0, savedAt: Date.now(),\n    });\n    saveAccount(account);\n  }\n  // A run-slot start OVERWRITES the previous run save — release any merc\n  // contract that run held (its patron ceases to exist right here, not at\n  // the next boot's self-heal).\n  if (mode.save !== 'roster') {\n    const previousPatron = savedCharacterPatronId();\n    if (previousPatron && releaseMercsOf(account, previousPatron) > 0) saveAccount(account);\n  }\n  // The manifest is the run-LOCKED package config. Phase 4's Expedition screen\n  // passes a configured one; otherwise build it from the account's saved prefs.\n  const m = manifest ?? buildManifest(account, rollSeed());\n  world = adoptWorld(new World(account, Object.freeze(m)));\n  // THE OPENING (meta/classkit.ts): the card's picks — remembered on the\n  // account for the next waking — resolve here against what the account\n  // actually OWNS (an unowned alternate falls back to its base; owned\n  // Master grants seat themselves): the engine wakes the resolved bar.\n  if (kitPicks) { rememberKitPicks(account, classDef, kitPicks); saveAccount(account); }\n  // A GRADUATED account (Mireille's flask lesson lived once, any character)\n  // skips the re-walk: the flasks arrive learned, barred, and brimming at\n  // first breath. No-op until that first graduation — and placed BEFORE\n  // persistRun so the baseline snapshot already carries them.\n  world.createPlayer(classDef, { modeId: mode.id, charId, name: charName, kit: resolveClassKit(account, classDef, kitPicks), load: !serverBound });\n  // THE LAB KIT (ULT_QA.grantArts — engine/ultimates.ts): iteration builds\n  // deal the ultimate + gauge debuts into the fresh bag, unlearned.\n  world.dealLabArts();\n  // THE SKILL GRAFT (meta/unlocks.ts kind 'graft'): the armed charge spends\n  // HERE — where the run truly begins — before the baseline save, so the\n  // snapshot carries the grafted gem from the first breath. A pick without\n  // a charge (or a charge without a pick) is a no-op by construction.\n  if (graftSkillId && account.skillGraft && world.applySkillGraft(graftSkillId)) {\n    account.skillGraft = false;\n    saveAccount(account);\n  }\n  lastSentZone = '';        // force a fresh terrain broadcast for (re)joining clients\n  if (COOP_ALLY) spawnCoopAlly();\n  // The baseline snapshot — EXCEPT under a due scene: the tutorial is not a\n  // run, so nothing persists until its 'home' stage writes the true first\n  // save at the bedside wake (a mid-tutorial quit = start a new game).\n  if (!prologueDue) persistRun(account, world); // baseline so a fresh run is resumable\n  // A roster character never touches the shared run slot — the mortal\n  // Continue stays valid beside it (the vessels are additional lives).\n  if (mode.save !== 'roster') ui.setContinueSave(null);\n  ui.resetRunView();        // a new world must not inherit the old run's map zoom/tabs/pin\n  deathShown = false;\n  pendingDeathScreen = null; // a torn-down run's fade never fires over a fresh world\n  // THE PROLOGUE (after the baseline save, so the snapshot is a clean\n  // bedside start): the scene stamps its ledger key the moment it begins —\n  // played once, ever — and its staging ground lives off-graph, so even a\n  // mid-scene autosave resumes at the ordinary wake.\n  if (prologueDue) sceneBegin(world, 'prologue');\n  running = !serverBound; // THE ONE CROSSING: the minting world is no run; the shard's shell starts the loop\n  // THE LOGIN THROUGH MU (card 22): a server-bound wake travels at once — the vessel\n  // just saved at the bedside is the one the shard seats, and this run stays its home.\n  // THE DOOR (W7) is the tab's persisted binding, so a reload or the menu in between\n  // never drops it; a hero woken for a world consents to leave its bedside world behind.\n  if (door && serverBound) {\n    crossingWake(); // THE ONE CROSSING: this wake's cover stands from the flush to the hero's streamed ground\n    const request = resumeRequest;\n    void (async () => {\n      try {\n        await flushCharacterSaves();\n        if (request !== resumeRequest || crossing.phase !== 'wake') return; // a cancelled/replaced wake never connects\n        await connectToShard(door.url, classDef.id, { charId }, { replaceSolo: true }, request); // THE WAKE'S WORD: this charId, mortal or roster\n      } catch (e) { if (request === resumeRequest && !crossingCancelled(e)) toStartMenu(doorWord(e)); }\n    })();\n  }\n}\n\n/** Loading cancellation does not save a partially prepared world. Reread only\n * the menu summary, which was cleared when a fresh run started. */\nfunction cancelLoadingToMenu(): void {\n  toStartMenu('The crossing was cancelled.');\n  const request = resumeRequest;\n  void readCharacterContinueSummary().then(summary => {\n    if (request === resumeRequest && !running) ui.setContinueSave(summary);\n  }).catch(() => { /* The menu stays available; a later Continue rereads storage. */ });\n}\n\n/** loadingScreen owns an independent foreground renderer. Await its first paint\n * before starting CPU work, and drain its input before exposing the ready world.\n * Native construction and save authority stay in their existing game process. */\nasync function withLoadingScreen(...args: Parameters<typeof startGame>): Promise<boolean> {\n  const lease = loadingScreen.begin({ kind: 'entry', label: 'Taking form', loadout: account.cosmetics.loadout,\n    cancel: cancelLoadingToMenu });\n  try {\n    await lease.paint(); if (!lease.current) return false;\n    wakeLease = lease; // THE ONE CROSSING: a server-bound wake keeps this cover to the far side\n    try { startGame(...args); } finally { wakeLease = null; }\n    if (crossingLease === lease) return true;\n    lease.update({ label: 'Opening the world' });\n    await lease.paint(); if (!lease.current) return false;\n    renderer.render(world);\n    // loadingScreen drains foreground actions before exposing the prepared world.\n    await lease.paint(); if (!lease.current) return false;\n    loadingGate = { world, lease };\n    return true;\n  } catch (error) { lease.finish(); reportFatal(error, 'world entry'); return false; }\n}\n\n/** Class-select adapter: the picker hands back (class, sworn mode, name);\n *  startGame wants (class, manifest, mode, name). One arrow so no call site\n *  can transpose them. THE SKILL GRAFT detour: an armed charge offers its\n *  pick between the class choice and the world's first breath — the\n *  deliberate selection rides into startGame and spends there; declining\n *  keeps the charge armed for a later run. */\nlet startPickPending = false;\nconst startPicked = async (d: ClassDef, modeId?: string, name?: string, kitPicks?: Record<string, string>): Promise<void> => {\n  if (startPickPending) return;\n  startPickPending = true;\n  cancelCharacterResume();\n  try {\n    // A browser root may live only in IndexedDB. Resolve the existing boot\n    // load before replacing its patron or mutating the authoritative account.\n    await diskHydrated;\n    if (account.skillGraft) {\n      ui.showSkillGraftPick(pick => { void withLoadingScreen(d, undefined, modeId, name, pick, kitPicks); });\n      return;\n    }\n    await withLoadingScreen(d, undefined, modeId, name, undefined, kitPicks);\n  } finally { startPickPending = false; }\n};\n\n/** THE MU BOOT (data/mu.ts): stand a PROVISIONAL world up and drift into the\n *  hub between lives — a transient scene on off-graph ground, so no run save\n *  ever exists for it (the scene stand-down covers every chokepoint) and no\n *  roster vessel is minted. The wisp strips the provisional class to nothing;\n *  taking a vessel calls startPicked, which discards this world wholesale. */\nfunction startMu(): void {\n  couchReset();\n  const started = nativeStartFor(account).begin({ kind: 'mu' });\n  if (!started) throw Error('The provisional vessel could not be prepared');\n  world = adoptWorld(started.writer);\n  lastSentZone = '';\n  ui.resetRunView();\n  deathShown = false;\n  pendingDeathScreen = null; // the dead run's fade is over — Mu owns the screen now\n  running = true;\n}\n\n/** THE BEGIN PRESS (the start menu's one primary button): a virgin account —\n *  or a deliberate ?prologue — walks the tutorial as the Warrior with no\n *  class screen at all; everyone else drifts into Mu, where the class roster\n *  stands IN the world. The legacy class screen remains beneath (co-op\n *  rejoin offers still call it directly). */\nasync function beginPressed(): Promise<void> {\n  cancelCharacterResume();\n  const request = resumeRequest;\n  await diskHydrated;\n  if (request !== resumeRequest) return;\n  const prologueDue = sceneDue(account, 'prologue')\n    || new URLSearchParams(location.search).has('prologue');\n  if (prologueDue) {\n    await startPicked(CLASSES.find(c => c.id === MU_CFG.provisionalClass) ?? CLASSES[0]);\n    return;\n  }\n  startMu();\n}\n// THE DOOR (W7): the menu's Begin is a solo road chosen; the tab forgets the world it was bound for.\nui.onBeginRun = () => { forgetDoor(); void beginPressed(); };\n// THE FRONT DOOR (W7): the menu's primary row on a page a world served (or a tab bound for one).\nui.serverDoor = frontDoor;\nui.onEnterWorld = door => { void enterTheWorld(door); };\n// THE HONEST LEAVING (W7): a hosted world's words and its Exit (the pause menu reads these).\nui.hostedWorld = () => (net instanceof WsTransport ? lastShardWorld ?? 'the world' : null);\nui.onExitWorld = () => { void exitWorld(); };\n\n/** Both Continue buttons reread their slot. The menu holds a label only; an\n * old cached character cannot replace a newer save or a reassigned vessel. */\nfunction resumeRosterChar(entry: RosterEntry): void {\n  if (entry.fallen) {\n    ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar,\n      `${entry.name} lies fallen — resurrect them in the Vault (${entry.fallen.fee} ${META_CURRENCY_LABEL}).`);\n    return;\n  }\n  void resumeCharacterSlot(entry.slot, { ...entry });\n}\nfunction resumeGame(): void { void resumeCharacterSlot(CHAR_SLOT); }\nasync function resumeCharacterSlot(slot: number, roster?: RosterEntry): Promise<void> {\n  cancelCharacterResume();\n  const request = resumeRequest, controller = new AbortController();\n  resumeController = controller;\n  ui.setContinuePending(true);\n  const current = (): boolean => request === resumeRequest && !controller.signal.aborted && loading.current;\n  const cardCurrent = (): boolean => !roster || !!account.roster.find(r => r.slot === slot\n    && r.charId === roster.charId && r.modeId === roster.modeId && !r.fallen\n    && modeById(r.modeId).save === 'roster');\n  const loading = loadingScreen.begin({ kind: 'entry', label: 'Recalling your vessel', loadout: account.cosmetics.loadout,\n    cancel: () => {\n      if (!current() && !(published && world === published && running && loading.current)) return;\n      cancelLoadingToMenu();\n    } });\n  let prepared: Awaited<ReturnType<typeof prepareNativeCharacterContinue>> | undefined;\n  let published: World | undefined;\n  try {\n    await loading.paint();\n    await diskHydrated;\n    if (!current()) return;\n    if (!cardCurrent()) throw Error('The selected vessel changed during Continue');\n    const read = await readCharacterResume(slot, { signal: controller.signal });\n    if (!current()) return;\n    if (!cardCurrent()) throw Error('The selected vessel changed during Continue');\n    if (read.status !== 'ready') {\n      if (read.status === 'stale') throw Error('The saved character changed. Please try Continue again');\n      throw Error(read.status === 'refused' ? read.reason : 'The saved character is unavailable');\n    }\n    const fields = characterResumeFields(read.resume);\n    if (roster && (fields.charId && fields.charId !== roster.charId\n      || fields.modeId && fields.modeId !== roster.modeId)\n      || !roster && modeById(fields.modeId ?? DEFAULT_MODE_ID).save === 'roster')\n      throw Error('The saved character belongs to a different slot');\n    // HOME SLOTS (W7): a hero bound to a hosted world RETURNS there (THE LOGIN THROUGH MU\n    // naming it); its world-less mirror never builds a solo world.\n    const route = continueRoute(fields);\n    if (route.kind === 'return') {\n      loading.update({ label: `Returning to ${worldNameOf(route.home)}` });\n      await loading.paint();\n      if (!current()) return;\n      await returnToWorld(route.home, route.charId ?? roster?.charId);\n      return;\n    }\n    forgetDoor(); // a solo road chosen at the menu: the tab is bound for no world\n    prepared = await prepareNativeCharacterContinue(account, read.resume, {\n      isCurrent: () => current() && cardCurrent(), signal: controller.signal,\n      loadingStage: async label => { loading.update({ label }); await loading.paint(); },\n      spawn: resolveResumeSpawn(modeById(fields.modeId ?? DEFAULT_MODE_ID).resume, settings.resumeSpawn),\n    });\n    if (!current() || !cardCurrent()) return;\n    const resumed = prepared.publish();\n    couchReset();\n    world = adoptWorld(resumed.writer);\n    published = world;\n    lastSentZone = '';\n    if (COOP_ALLY) spawnCoopAlly();\n    ui.resetRunView();\n    deathShown = false; pendingDeathScreen = null;\n    running = true; ui.hideAll();\n    // loadingScreen stays interactive through the actual first terrain/sprite bake.\n    loading.update({ label: 'Opening the world' });\n    await loading.paint();\n    if (world === resumed.writer && running && loading.current) { renderer.render(world); await loading.paint(); }\n  } catch (error) {\n    if (published && world === published && running) reportFatal(error, 'continued world entry');\n    else if (current()) ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar,\n      error instanceof Error ? error.message : 'The saved world could not be read');\n  } finally {\n    loading.finish();\n    prepared?.discard();\n    if (resumeController === controller) { resumeController = null; ui.setContinuePending(false); }\n  }\n}\n\n// Dev/debug handle (also keeps headless testing possible when rAF is paused).\ndeclare global {\n  interface Window {\n    /** THE CRASH TRAP's shared error ring — seeded by index.html's early trap. */\n    __bootErrors?: CrashEntry[];\n    /** The early trap's boot-failure fallback timer (cleared once we boot). */\n    __bootTrapTimer?: number;\n    /** Set the moment this module evaluates — the early fallback's stand-down. */\n    __gameBooted?: boolean;\n    __game?: {\n      world: () => World; retained: () => NativeClientRuntime | undefined; ui: UI; ai: typeof updateAI; renderer: Renderer;\n      account: () => Account; saveAccount: () => void; save: () => void; flushRunSave: () => Promise<void>;\n      settings: () => Settings; saveSettings: () => void;\n      addAlly: () => void;\n      net: () => NetTransport;\n      snapshot: () => StateSnapshot;\n      applySnap: (s: StateSnapshot, prev?: StateSnapshot | null, alpha?: number) => void;\n      subscribeToHost: () => void;\n      /** THE SMOOTH SHELL (net/shell.ts): the client timeline, for QA reads. */\n      wireShell: () => WireShell;\n      /** THE ONE CROSSING (net/crossing.ts): the hosted arrival's cover, for QA reads. */\n      crossing: () => ShardCrossing;\n      unsubscribeFromHost: () => void;\n      fakeJoin: (classId?: string) => string;\n      fakeLeave: (id: string) => void;\n      zoneMsg: () => ZoneMsg;\n      applyZoneMsg: (z: ZoneMsg) => void;\n      openLobby: () => void;\n      leaveCoop: () => void;\n      resetAccount: () => void;\n      /** THE LAB LEVER (ULT_QA): flip the ultimate iteration tune live. */\n      ultqa: (on?: boolean) => boolean;\n      pad: () => PadState;\n      padPointer: () => PadPointer;\n      fakePad: (p: FakePad | null) => void;\n      step: (frames?: number, dtMs?: number) => void;\n      pilot: (src: HeroInputSource | null) => void;\n      hold: (on: boolean) => void;\n      director: () => Director;\n      devStartRun: (classId?: string) => string;\n      loading: LoadingScreen;\n      devStartLoadingRun: (classId?: string) => Promise<void>;\n      devGrantSkill: (skillId: string, level?: number, slot?: number) => number;\n      devInput: (source: ((dt: number) => PlayerInput | null) | null) => void;\n      clipCatalog: () => {\n        skills: {\n          id: string; name: string; tags: string[]; castMode: string; aiRange?: number;\n          concentration: boolean; delivery: unknown; targeting?: unknown;\n        }[];\n        classes: { id: string; bar: string[] }[];\n        noon: number;\n      };\n      hydrated: () => Promise<void>;\n      perfFrames: (reset?: boolean) => {\n        gap: number[]; sim: number[]; ren: number[];\n        /** Pushes since last reset — pushed > gap.length = the ring wrapped. */\n        pushed: number;\n        /** THE PHASE LEDGER's window-worst slab (name over pre/head/sim/ren/tail). */\n        phase: { name: string; ms: number };\n      };\n      /** Size the frame rings to a sweep window (frames; clamped, resets). */\n      perfRingSize: (frames: number) => number;\n      /** performance.now() at the CURRENT frame's tick-callback entry — the\n       *  sweep's fine own-task anchor (vs the coarse vsync-anchored mark). */\n      perfTickT0: () => number;\n      perfSweep: (opts?: PerfSweepOpts) => Promise<PerfSweepReport>;\n      devPanel: () => void;\n      crash: () => {\n        fatal: CrashEntry | null; suppressed: string | null;\n        overlay: boolean; errors: CrashEntry[];\n      };\n    };\n  }\n}\ndocument.title = GAME_TITLE; // the one constant names every surface\n\nwindow.__game = {\n  world: () => world, retained: () => nativeClientRuntimeFor(world), ui, ai: updateAI, renderer,\n  account: () => account, saveAccount: () => saveAccount(account),\n  save: () => persistRun(account, world),\n  flushRunSave: flushCharacterSaves,\n  settings: () => settings, saveSettings: () => saveSettings(settings),\n  addAlly: () => spawnCoopAlly(),\n  net: () => net,\n  snapshot: () => serializeSnapshot(world, 0),\n  applySnap: (s: StateSnapshot, prev?: StateSnapshot | null, alpha = 1) => applySnapshot(world, s, prev, alpha),\n  subscribeToHost, unsubscribeFromHost,\n  wireShell: () => shell,\n  crossing: () => crossing,\n  fakeJoin: (classId) => {\n    const id = 'p' + world.seats.length;\n    onRemoteJoin({ id, name: 'Remote', classId: classId ?? CLASSES[0].id, isHost: false });\n    return id;\n  },\n  fakeLeave: (id) => onRemoteLeave(id),\n  zoneMsg: () => serializeZone(world),\n  applyZoneMsg: (z: ZoneMsg) => applyZone(world, z),\n  openLobby, leaveCoop,\n  resetAccount: () => { resetAccount(); location.reload(); },\n  // THE LAB LEVER's console twin (the dev panel's Lab tab is the door).\n  ultqa: (on = true) => { applyLab({ active: on }); return ULT_QA.active; },\n  // Controller state + the hardware stand-in (tests: __game.fakePad({axes,buttons})).\n  pad: () => pad, padPointer: () => padPointer,\n  fakePad: (p) => { window.__fakePad = p; },\n  // Drive N frames synchronously — the antidote to rAF freezing in hidden\n  // tabs; the ONLY way input polling (incl. the pad) runs under a harness.\n  // NOT sim-only: while a run is live the tick also RENDERS. Don't call\n  // renderer.render on top of step() in a QA cell — each frame then draws\n  // twice, so per-render probes read 2× (the sight veil's update runs once\n  // per pass; a doubled drive double-steps its frame counter and snaps\n  // stale actorShade fades early).\n  step: (frames = 1, dtMs = 16.7) => { for (let i = 0; i < frames; i++) tick(last + dtMs); },\n  pilot: (src) => { localPilot = src; if (src) devInputSource = null; },\n  hold: (on) => { directorHold = on; },\n  director: () => director ??= new Director({\n    world: () => world, renderer,\n    startRun: async (classId, signal) => {\n      await diskHydrated;\n      signal.throwIfAborted();\n      // The disk reconcile owns the ledger until hydration resolves.\n      account.ledger.prologue_lived = 1;\n      const cancel = () => { if (loadingScreen.active) cancelLoadingToMenu(); };\n      signal.addEventListener('abort', cancel, { once: true });\n      try {\n        const started = await withLoadingScreen(CLASSES.find(c => c.id === classId) ?? CLASSES[0]);\n        signal.throwIfAborted();\n        if (!started) throw new Error('Director entry was cancelled or failed.');\n        ui.hideAll();\n      } finally { signal.removeEventListener('abort', cancel); }\n    },\n    ready: waitDirectorReady,\n    step: (dtMs) => tick(last + dtMs),\n    setPilot: (src) => { localPilot = src; if (src) devInputSource = null; },\n    hold: (on) => { directorHold = on; },\n    ledger: () => account.ledger, ui: () => ui,\n  }),\n  // DEV/QA: start a run headlessly (the perf harness's ignition) — the real\n  // startGame path under the first (or named) class, menus dismissed.\n  loading: loadingScreen,\n  devStartLoadingRun: async (classId?: string) => { if (await withLoadingScreen(CLASSES.find(c => c.id === classId) ?? CLASSES[0])) ui.hideAll(); },\n  devStartRun: (classId?: string) => {\n    const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];\n    document.getElementById('start-menu')?.classList.add('hidden');\n    document.getElementById('class-select')?.classList.add('hidden');\n    startGame(cls);\n    return cls.id;\n  },\n  // DEV/QA: seat any catalog skill by id straight onto a bar slot as THE DEV\n  // GIFT (devThrongGrant's shape: past the learn gate, transient, never\n  // saved), replacing whatever sat there, so a harness can walk the whole\n  // catalog without filling the pack (balance/skill-showcase-ui.cjs mints its\n  // bag gems from it). Returns the slot, or -1.\n  devGrantSkill: (skillId: string, level = 1, slot = 2) => {\n    const def = CLIP_SKILLS[skillId];\n    const p = world.player, known = world.localSeat.meta.knownSkills;\n    if (!def || slot < 0 || slot >= p.skills.length) return -1;\n    const prev = p.skills[slot];\n    if (prev) known.delete(prev.def.id);\n    const inst = clipSkillGem(def, level, 'rare');\n    inst.granted = true;\n    inst.devGift = true;\n    known.set(skillId, inst);\n    p.skills[slot] = inst;\n    world.charDirty = true;\n    world.recalcPlayer();\n    return slot;\n  },\n  devInput: (source) => { devInputSource = source; if (source) localPilot = null; },\n  // DEV/QA: the skill-clip capture's catalog: every player skill (the\n  // database page's list; noDrop rows are monster kit), each class's\n  // opening bar (the body that films a skill) and the brightest hour.\n  clipCatalog: () => {\n    let noon = 0;\n    for (let t = 0; t < CLIP_DAY_LENGTH; t++) if (clipDayCycle(t).light > clipDayCycle(noon).light) noon = t;\n    return {\n      skills: Object.values(CLIP_SKILLS).filter(d => !d.noDrop).map(d => ({\n        id: d.id, name: d.name, tags: [...d.tags], castMode: d.castMode ?? 'cast',\n        aiRange: d.ai?.range, concentration: !!d.concentration,\n        delivery: JSON.parse(JSON.stringify(d.delivery)) as unknown,\n        targeting: d.targeting ? JSON.parse(JSON.stringify(d.targeting)) as unknown : undefined,\n      })),\n      classes: CLASSES.map(c => ({ id: c.id, bar: c.bar.filter((b): b is string => !!b) })),\n      noon,\n    };\n  },\n  // Resolves once the boot's disk reconcile below has landed: a harness\n  // starts its run after it, or the reconcile re-seats the account under it.\n  hydrated: () => diskHydrated,\n  // FRAME TELEMETRY readout: the ring buffers as plain arrays, oldest-first\n  // (rAF gap = true pacing, sim ms, render ms). reset=true also clears —\n  // how the perf sweep separates a zone's entry burst from its steady state.\n  perfFrames: (reset = false) => {\n    const n = perfCount, start = (perfIdx - n + perfRingN) % perfRingN;\n    const out = {\n      gap: new Array<number>(n), sim: new Array<number>(n), ren: new Array<number>(n),\n      // Pushes since the last reset: pushed > gap.length means the ring\n      // WRAPPED and the window's oldest frames are gone (perfRingSize doc).\n      pushed: perfPushed,\n      // THE PHASE LEDGER's window-worst slab rides the same reset boundary\n      // as the rings, so a sweep window's slab is that window's alone.\n      phase: { name: phaseWorstName, ms: phaseWorstMs },\n    };\n    for (let i = 0; i < n; i++) {\n      const k = (start + i) % perfRingN;\n      out.gap[i] = perfGap[k]; out.sim[i] = perfSim[k]; out.ren[i] = perfRen[k];\n    }\n    if (reset) { perfIdx = 0; perfCount = 0; perfPushed = 0; phaseWorstName = ''; phaseWorstMs = 0; }\n    return out;\n  },\n  perfRingSize,\n  perfTickT0: () => perfTickT0,\n  perfSweep: (opts?: PerfSweepOpts) => perfSweep(opts),\n  devPanel: () => mountDevPanel(() => world),\n  // CRASH TRAP state — the ?crashtest negative control's probe surface (is the\n  // latch flipped, why are saves refusing, did the overlay rise, the ring).\n  crash: () => ({\n    fatal: crashFatal, suppressed: saveSuppressed(),\n    overlay: errorOverlayShown(), errors: [...crashRing],\n  }),\n};\n\n// THE WORKSHOP (meta/workshop.ts): graft dev-authored entities from the\n// localStorage mirror into the live registries BEFORE the content sweep, so\n// a custom def answers to the exact same boot lint as shipped content.\nloadWorkshopSync();\n// THE ATLAS (meta/atlas.ts): the Map Forge's authored maps, grafted the same\n// way — before the sweep, so a custom map answers to the same boot lint.\nloadAtlasSync();\n// Cross-check the data files; authoring mistakes warn instead of failing silently.\nvalidateContent();\n\n// DEV: the tabbed dev panel (config.ts DEV.panel). Off (0) = no-op. Runtime\n// opt-ins beside the source flag — `?dev` on the URL or localStorage\n// 'dev_panel'='1' — so QA can raise the panel on any dev serve without a\n// source edit (and __game.devPanel() mounts it live in a RUNNING session,\n// no reload: mountDevPanel is idempotent).\nconst devPanelOptIn = ((): boolean => {\n  try {\n    return new URLSearchParams(location.search).has('dev')\n      || localStorage.getItem(storageKey('dev_panel')) === '1';\n  } catch { return false; }\n})();\nif (DEV.panel || devPanelOptIn) mountDevPanel(() => world);\n// DEV: the passive-tree editor (config.ts DEV.passiveTreeEditor). Off (0) = no-op.\nif (DEV.passiveTreeEditor) mountPassiveEditor(ui);\n// DEV: the Entity Forge (config.ts DEV.entityForge) — start-menu button +\n// full-screen editor; the dev panel's Forge tab rides it too. Off (0) = no-op.\n// The Glyph Forge (draw kit-parts + doodad kinds) mounts SECOND so its\n// start-menu hook chains behind the Entity Forge's.\nif (DEV.entityForge) {\n  mountEntityForge(ui, () => world);\n  mountGlyphForge(ui, () => world);\n}\n// DEV: the Map Forge (config.ts DEV.mapForge) — start-menu button + full-screen\n// map editor; the dev panel's Maps tab rides it too. Mounts THIRD so its\n// start-menu hook chains behind the forges'. The `?dev` opt-in raises it as\n// well: the panel's Maps tab is its in-game door (the lab-tab ruling — the\n// tooling lives inside the dev panel, never behind a URL param of its own).\nif (DEV.mapForge || devPanelOptIn) mountMapForge(ui, () => world);\n\n// Boot: show the start menu immediately (built from the synchronous localStorage\n// loaders so it appears instantly), THEN reconcile against the disk files in the\n// background — the authoritative cross-session save. The disk loads warm the\n// shared account/settings refs and enable Continue if a disk character exists.\nui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);\nui.setContinueSave(loadCharacter());          // instant: localStorage cache\nconst diskHydrated = (async (): Promise<void> => {\n  const bootRequest = resumeRequest;\n  const [a, s, c] = await Promise.all([loadAccountAsync(), loadSettingsAsync(), readCharacterContinueSummary()]);\n  Object.assign(account, a);                  // mutate-in-place: shared refs stay valid\n  reconcileClassBundleGems(account);\n  Object.assign(settings, s);\n  applyUiScale(settings.uiScale);             // the disk save may carry a different dial\n  if (bootRequest === resumeRequest) ui.setContinueSave(c); // a newer start/Continue owns the menu\n  ui.setStartMenuNotice(saveResetNotice());\n  // Workshop disk reconcile: the save file is the cross-session authority\n  // (another machine, a cleared browser profile). When it changed anything,\n  // re-run the content sweep so the adopted defs get linted too (rare — the\n  // mirror matches the disk in steady state, so no double warnings normally).\n  if (await reconcileWorkshopFromDisk()) validateContent();\n  if (await reconcileAtlasFromDisk()) validateContent();\n  // SELF-HEAL: release merc engagements whose patron no longer exists anywhere\n  // (a run save wiped without its death flow ever running).\n  if (healMercEngagements(account, [c?.charId, ...account.roster.map(r => r.charId)]) > 0) {\n    saveAccount(account);\n  }\n})();\n\n// THE RETURN after a reload (THE SMOOTH SHELL): a tab reloaded inside a hosted session's\n// window goes straight back to its seat (the token the page kept in sessionStorage) instead\n// of the start menu and a fresh join; a seat the world no longer holds lands on the menu.\n{\n  const back = rememberedShardSession();\n  if (back) {\n    const request = resumeRequest;\n    void (async () => {\n      await diskHydrated;\n      if (running || request !== resumeRequest) return; // a newer explicit route owns entry\n      try { await connectToShard(back.url, CLASSES[0].id, undefined, { resumeOnly: true }, request); }\n      catch (e) {\n        if (request !== resumeRequest || crossingCancelled(e)) return;\n        // THE RETURN (card 26 B, W7): the seat is gone (the reload grace ran out, a restart);\n        // a hero bound to this world logs back in where it logged out instead.\n        const route = continueRoute(await readCharacterContinueSummary().catch(() => null));\n        if (request !== resumeRequest) return;\n        if (route.kind === 'return' && sameWorld(route.home.url, back.url) && !running) { await returnToWorld(route.home, route.charId, request); return; }\n        toStartMenu(returnWord(worldNameOf(readDoor() ?? { url: back.url }), e instanceof Error ? e.message : ''));\n      }\n    })();\n  }\n}\n\n/** Read the OS into the LOCAL seat's intent for this frame (or null when there's\n *  nothing to drive — dead/downed, or the pause menu is up). Pure input capture;\n *  it no longer touches the world directly — World.applyInputs does that, for\n *  every seat uniformly. `aim` is converted to WORLD space here so it's\n *  camera-independent (the one value that must survive the wire). */\n/** DEV/QA: a scripted source for the LOCAL seat's intent (__game.devInput).\n *  While set it replaces the device read wholesale, so a harness drives\n *  casts through the real frame (the skill-clip capture's hands); null\n *  restores the devices. */\nlet devInputSource: ((dt: number) => PlayerInput | null) | null = null;\nfunction readLocalInput(dt: number): PlayerInput | null {\n  if (loadingScreen.active || loadingScreen.padQuarantined) return null;\n  if (!devInputSource && (world.player.dead || world.player.downed || ui.escapeMenuOpen || ui.couchJoinOpen)) return null;\n  // Select a pilot method before opening the finite query. A callback-capable\n  // method read may travel; the ensuing query belongs to the resulting body.\n  const pilot = devInputSource ? null : localPilot, poll = pilot?.poll;\n  const retained = net.isHost ? nativeClientRuntimeFor(world) : undefined;\n  return retained ? retained.readLocalInput((body, query) => readLocalInputFor(dt, body, query, pilot, poll))\n    : readLocalInputFor(dt, world.player, world, pilot, poll);\n}\nfunction readLocalInputFor(dt: number, p: World['player'], query: HeroInputQuery,\n  pilot: HeroInputSource | null, poll: HeroInputSource['poll'] | undefined): PlayerInput | null {\n  if (devInputSource) {\n    try {\n      const intent=devInputSource(dt);\n      assertScriptedInput(intent);\n      return intent;\n    } catch(error) {\n      devInputSource=null; // A failed harness read cannot poison later native frames.\n      throw error;\n    }\n  }\n  if (p.dead || p.downed) return null;\n  // The pause menu AND the couch join ceremony both take the hero's hands\n  // out of play (the world holds under either, solo — the timeflow law).\n  if (ui.escapeMenuOpen || ui.couchJoinOpen) return null;\n\n  if (pilot && poll) {\n    try {\n      const intent = Reflect.apply(poll, pilot, [p, query, dt]);\n      assertScriptedInput(intent);\n      return intent;\n    } catch (error) { localPilot = null; throw error; }\n  }\n  const kb = settings.keybinds;\n  const pb = settings.padBinds;\n  // While the menu pointer owns the pad, its buttons/sticks are UI gestures,\n  // not gameplay intent (Ⓐ under an inventory must never also swing a sword).\n  // The keyboard/mouse half keeps flowing either way.\n  const padLive = !padPointer.active;\n  const dialoguePadDown = (code: string): boolean => !dialoguePadHeld.has(code) && pad.isDown(code);\n  const dialoguePadPressed = (code: string): boolean => !dialoguePadHeld.has(code) && pad.justPressed(code);\n  // THE PRESSABLE BAR's press: armed on the mouse's down edge over a slot,\n  // released with the button. (CSS px = buffer px ÷ the render-scale seam.)\n  let barEdge = false;\n  if (input.lmbPressed) {\n    const cx = input.mouse.x / input.pointerScale, cy = input.mouse.y / input.pointerScale;\n    // THE PRESSABLE META first: the mini-button rides ABOVE its slot, so the\n    // two rects never overlap; a click there is an EDGE on the meta for the\n    // button's hold (withheld from the primary exactly like a slot press).\n    const metaHit = hudMetaSlotAt(cx, cy);\n    if (metaHit !== null) { barPress = { slot: metaHit, lock: null, meta: true }; barEdge = true; }\n    else {\n      const slotHit = hudSlotAt(cx, cy);\n      if (slotHit !== null) { barPress = { slot: slotHit, lock: null }; barEdge = true; }\n    }\n  }\n  if (barPress && !input.lmb) barPress = null;\n  let dx = 0, dy = 0;\n  if (input.keys.has(kb.moveUp) || (padLive && dialoguePadDown(pb.moveUp))) dy -= 1;\n  if (input.keys.has(kb.moveDown) || (padLive && dialoguePadDown(pb.moveDown))) dy += 1;\n  if (input.keys.has(kb.moveLeft) || (padLive && dialoguePadDown(pb.moveLeft))) dx -= 1;\n  if (input.keys.has(kb.moveRight) || (padLive && dialoguePadDown(pb.moveRight))) dx += 1;\n  // The move stick adds its ANALOG vector — deflection rides straight into\n  // moveActor, so half-tilt is a slow stalk without any new movement path.\n  if (padLive) { dx += pad.move.x; dy += pad.move.y; }\n  // INVERTED MOVEMENT (Settings.invertMove): the player's own standard,\n  // applied at the DEVICE layer — one flip for keys and stick alike,\n  // before intent enters the wire (southpaw swaps WHICH stick moves; this\n  // flips WHICH WAY movement goes). The widdershins hex flips again at the\n  // engine's one mover, so a by-choice inverted hero who is hexed plays\n  // STANDARD for the duration — two turns make a true; the XOR is the\n  // design, not an accident.\n  if (settings.invertMove) { dx = -dx; dy = -dy; }\n\n  // Aim: the mouse cursor — unless the pad owns the reticle (last device to\n  // speak wins). Pad aim is the stick's direction at deflection-scaled reach\n  // from the hero, STICKY on release so the reticle holds where you left it,\n  // then bent by the soft aim assist (engine/aimassist.ts) toward the held\n  // target. The assisted point IS the reticle the renderer draws — what you\n  // see is exactly what every castAtCursor skill receives.\n  let aim = renderer.toWorld(input.mouse);\n  if (aimSource === 'mouse' && mouseHandoff) {\n    // A live HANDOFF: the pad's reticle handed the mouse this offset — aim\n    // rides arrow+offset (melting in tick's motion block) so the switch\n    // never flips facing toward a stale, parked arrow.\n    aim = renderer.toWorld({\n      x: input.mouse.x + mouseHandoff.x,\n      y: input.mouse.y + mouseHandoff.y,\n    });\n    padAimView = { x: aim.x, y: aim.y, lockId: null };\n  }\n  if (aimSource === 'pad' && padLive) {\n    const t = padTuning();\n    const reach = pad.aimReach(pad.aimMag > 0 ? pad.aimMag : pad.lastAimMag, t);\n    const raw = { x: p.pos.x + pad.lastAimDir.x * reach, y: p.pos.y + pad.lastAimDir.y * reach };\n    // A zero-length frame (timer-resolution twins) must not re-run the\n    // assist: the corrected glide strength would be exactly 0, and a\n    // 0-strength assist reads as \"free aim\" — wiping the held lock and\n    // flickering the view to raw for one frame. Deliver last frame's point\n    // (buttons and movement below still read normally).\n    if (dt <= 0 && padAimView) {\n      aim = { x: padAimView.x, y: padAimView.y };\n    } else {\n      // Delivery mode (AIM_ASSIST_MODES; a held skill's def may someday\n      // override this per skill). In 'cursor' mode with the stick at rest\n      // the write-back below COMPOUNDS frame over frame — correct the blend\n      // so the settle/track rate matches strength-per-frame at glideRefHz on\n      // any monitor. A live stick frame is absolute (no compounding).\n      const mode = settings.pad.assistMode;\n      const sBase = settings.pad.aimAssist;\n      const strength = (mode === 'cursor' && pad.aimMag === 0 && sBase < 1)\n        ? 1 - Math.pow(1 - sBase, dt * AIM_ASSIST.glideRefHz)\n        : sBase;\n      const assisted = assistAim(query, p, raw, padLock, strength);\n      padLock = assisted.targetId;\n      aim = { x: assisted.x, y: assisted.y };\n      if (mode === 'cursor' && padLock !== null) {\n        // THE ASSIST MOVES THE CURSOR: fold the assisted point back into the\n        // pad's sticky aim, so a broken lock (death, dash, wall) or a device\n        // switch continues from where the reticle visibly is — never a snap\n        // back to the pre-assist raw point. Hero-relative dir + reach is the\n        // sticky aim's native space; reach inversion clamps to the player's\n        // envelope (a target hugging the hero parks the cursor at min reach\n        // in its direction — direction, and so facing, is always preserved).\n        const dx = aim.x - p.pos.x, dy = aim.y - p.pos.y;\n        const dist = Math.hypot(dx, dy);\n        if (dist > 1e-3) {\n          const mag = (dist - t.aimMinRadius) / Math.max(1, t.aimMaxRadius - t.aimMinRadius);\n          pad.setStickyAim({ x: dx / dist, y: dy / dist }, mag);\n        }\n      }\n      padAimView = { x: aim.x, y: aim.y, lockId: padLock };\n    }\n  }\n\n  // THE PRESSABLE BAR's aim: the cursor sits on the bar, so the press aims\n  // where the hero FACES at the pad's mid reach, bent by the assist at full\n  // strength (the held lock persists across the press, the pad's own law).\n  if (barPress && !(aimSource === 'pad' && padLive)) {\n    const t = padTuning();\n    const reach = pad.aimReach(0.5, t);\n    const raw = { x: p.pos.x + Math.cos(p.facing) * reach, y: p.pos.y + Math.sin(p.facing) * reach };\n    const assisted = assistAim(query, p, raw, barPress.lock, 1);\n    barPress.lock = assisted.targetId;\n    aim = { x: assisted.x, y: assisted.y };\n  }\n\n  // Slots 0/1 are LMB/RMB (fixed) — on a pad they're ordinary binds; slots\n  // 2–7 merge the rebindable keys with their pad buttons. Keyboard OR pad,\n  // per slot, per frame — the intent downstream can't tell which spoke.\n  const slotActs = [\n    'skillSlot0', 'skillSlot1', 'skillSlot2', 'skillSlot3',\n    'skillSlot4', 'skillSlot5', 'skillSlot6', 'skillSlot7',\n  ] as const;\n  const skillKeys = [kb.skillSlot2, kb.skillSlot3, kb.skillSlot4, kb.skillSlot5, kb.skillSlot6, kb.skillSlot7];\n  const held = [\n    (input.lmb && !barPress) || (padLive && dialoguePadDown(pb.skillSlot0)),\n    input.rmb || (padLive && dialoguePadDown(pb.skillSlot1)),\n    ...skillKeys.map((k, i) => input.keys.has(k) || (padLive && dialoguePadDown(pb[slotActs[i + 2]]))),\n  ];\n  const edge = [\n    (input.lmbPressed && !barPress) || (padLive && dialoguePadPressed(pb.skillSlot0)),\n    input.rmbPressed || (padLive && dialoguePadPressed(pb.skillSlot1)),\n    ...skillKeys.map((k, i) => {\n      const fromKey = input.justPressed(k);\n      const fromPad = padLive && dialoguePadPressed(pb[slotActs[i + 2]]);\n      return fromKey || fromPad;\n    }),\n  ];\n  // THE PRESSABLE BAR lands on its slot: held for the button's whole hold,\n  // an edge on the frame it went down (the same shape a key delivers).\n  let metaClick: number | null = null;\n  if (barPress && barPress.slot < held.length) {\n    if (barPress.meta) {\n      // A meta click is an EDGE on the mini-button: no hold, no primary.\n      if (barEdge) metaClick = barPress.slot;\n    } else {\n      held[barPress.slot] = true;\n      if (barEdge) edge[barPress.slot] = true;\n    }\n  }\n  // THE UNARMED-FLOOR opt-out (Settings.improvisedStrike): declined, an\n  // EMPTY slot's press never leaves this client — the world's floor rule\n  // (World.applyInputs' null-slot branch) stays universal; the refusal is\n  // local input-shaping, exactly like a keybind. Each co-op peer's setting\n  // shapes only their own hands.\n  if (!settings.improvisedStrike) {\n    for (let i = 0; i < held.length; i++) {\n      if (!p.skills[i]) { held[i] = false; edge[i] = false; }\n    }\n  }\n  // THE PRESSABLE META's landing: the clicked mini-button fires its slot's\n  // meta as an edge — the modifier lane's exact shape, no modifier needed.\n  if (metaClick !== null) {\n    const metaEdge = edge.map(() => false);\n    metaEdge[metaClick] = true;\n    return { dx, dy, aim, held, edge: edge.map(() => false), metaEdge };\n  }\n  // The META layer (rebindable; shift by default): modifier+slot fires the\n  // slot skill's META-ACTION (Detonate / Enrage / Thrust!) INSTEAD of a new\n  // press. HELD states survive the modifier — a raised guard or a running\n  // channel must NOT drop because you reached for the meta button (the\n  // shield-bash-on-shift bug); only fresh EDGES reroute.\n  const metaKey = kb.metaModifier ?? 'shift';\n  const metaEdgePressed = input.justPressed(metaKey)\n    || (padLive && dialoguePadPressed(pb.metaModifier));\n  if (input.keys.has(metaKey) || (padLive && dialoguePadDown(pb.metaModifier))) {\n    const metaEdge = edge.map(() => false);\n    for (let i = 0; i < edge.length; i++) if (edge[i]) metaEdge[i] = true;\n    // HELD-CAST META (Phalanx while Shield Up): you can't re-press a\n    // button you're already HOLDING — so during a held cast (guard /\n    // channel / charge / overcharge), pressing the MODIFIER ALONE fires\n    // the HELD skill's meta. Scoped to exactly that slot: three channel\n    // skills on the bar never fire three metas — only the one in hand.\n    if (metaEdgePressed && p.casting\n      && ['guard', 'channel', 'charge', 'overcharge', 'concentration'].includes(p.casting.mode)) {\n      const ci = p.skills.findIndex(s => s === p.casting!.inst);\n      if (ci >= 0) metaEdge[ci] = true;\n    }\n    return { dx, dy, aim, held, edge: edge.map(() => false), metaEdge };\n  }\n  return { dx, dy, aim, held, edge };\n}\n\n/** LOCAL-only UI input (the pause menu + panel toggles). Kept out of the intent\n *  pipeline — these are this client's screen, never gameplay sent to the host. */\nfunction handleLocalPanels(): void {\n  pressTheRelease(); // THE RELEASE (card 28): a downed hero on a hosted world gives up the wait\n  // Dead/downed suppresses ALL local UI input, exactly as the old single input\n  // handler did (`if (p.dead) return`) — so escape/panels can't pop over the\n  // death screen. (A downed local hero in co-op likewise can't toggle panels.)\n  if (world.player.dead || world.player.downed) return;\n  const kb = settings.keybinds;\n  if (dialogue.open && !padPointer.active) {\n    const next = settings.padBinds.dialogueAdvance, back = PAD_CFG.pointer.cancel;\n    const cancel = next !== back && pad.justPressed(back);\n    const advance = pad.justPressed(next);\n    if (cancel) dialoguePadHeld.add(back);\n    if (advance) dialoguePadHeld.add(next);\n    if (cancel) dialogue.close();\n    else if (advance) dialogue.advance();\n  }\n  // Escape toggles the pause/menu (hardwired — never rebindable). While it's up,\n  // gameplay intent is suppressed (readLocalInput returns null). An open DWELL\n  // dialog (caravan / toll / sail) is dismissed FIRST and the press stops there —\n  // Esc on a dialog means \"close this\", not \"pause the game on top of it\".\n  // ESCAPE is a strict, predictable CASCADE — every press does exactly ONE\n  // legible thing, in order of how \"modal\" the thing is:\n  //   0. a running crafting minigame owns the screen (Esc waits it out),\n  //   1. the pause menu closes,\n  //   2. an open DWELL dialog dismisses (their closes carry semantics —\n  //      closing the vocation offer DECLINES it; one dialog per press),\n  //   3. ordinary windows (sheet/map/inventory with its pages) all clear —\n  //      Esc here means \"give me my screen back\", NEVER \"pause on top\",\n  //   4. a clear screen: NOW Esc is the pause menu.\n  // THE ESCAPE POLICY (ui/escapeConfig.ts, Settings.escapeCloses) may fold\n  // steps 2–3 into ONE sweep; the modal steps above them never change.\n  if (input.justPressed('escape')) {\n    if (ui.minigameRunning()) return;\n    // THE FORGE's step-away (the steady hand): a tracing hand's Esc cancels\n    // the trace — the writ endures — before any menu opens over the bench.\n    if (world.traceActive(world.localSeat.id)) { world.requestMeta({ t: 'forgeCancel' }); return; }\n    if (ui.escapeMenuOpen) { ui.hideEscapeMenu(); return; }\n    // The couch join overlay dismisses like any dialog — one press, gone.\n    if (ui.couchJoinOpen) { closeCouchJoin(); return; }\n    if (dialogue.open && dialogue.close()) return;\n    // COUCH: the hero's Esc walks ITS OWN cascade — a guest's open panels\n    // are the guest's business (their Ⓑ walks theirs). Solo falls through\n    // to the classic global cascade below, byte-identically.\n    // THE MENU BAR's tray folds first — it is the topmost, lightest surface.\n    if (ui.menuTrayClose()) return;\n    if (couchActive()) {\n      if (!ui.escCascadeFor(world.localSeat.id)) ui.showEscapeMenu();\n      return;\n    }\n    if (ui.cancelSalvageMode(world.localSeat.id)) return;\n    // THE ESCAPE POLICY (ui/escapeConfig.ts): a sweep mode clears the whole\n    // screen in one press — every book through its leaves' own closes, the\n    // dialog belt, the ordinary panels (a kept page last) — and pauses only\n    // a clear screen; 'step' walks the classic cascade below.\n    const escMode = escapeModeOf(settings.escapeCloses);\n    if (escMode.id !== 'step') {\n      if (ui.escapeSweep(world.localSeat.id, escMode.keep)) return;\n      ui.hideAll();\n      ui.showEscapeMenu();\n      return;\n    }\n    // THE FOLIO (ui/folio.ts): a book closes its FRONT leaf first — the one\n    // on screen — through that leaf's own close; the fixed list below stays\n    // as the belt for any dialog not enrolled.\n    if (ui.folioCloseFront()) return;\n    if (ui.caravanOpen) { ui.closeCaravan(); return; }\n    if (ui.vendorOpen) { ui.closeVendor(); return; }\n    if (ui.salvageOpen) { ui.closeSalvage(); return; }\n    if (ui.fontOpen) { ui.closeFont(); return; }\n    if (ui.oracleOpen) { ui.closeOracle(); return; }\n    if (ui.bestiaryOpen) { ui.closeBestiary(); return; }\n    if (ui.sailOpen) { ui.closeSail(); return; }\n    if (ui.bountiesOpen) { ui.closeBounties(); return; }\n    if (ui.mercOpen) { ui.closeMercMenu(); return; }\n    if (ui.boroughOpen) { ui.closeBorough(); return; }\n    // The vocation choice menu closes through its OWN close (not hideAll):\n    // closeVocationMenu also DECLINES the offer, else the dwell re-pops the\n    // menu the instant the pause menu comes down.\n    if (ui.vocationOpen) { ui.closeVocationMenu(); return; }\n    if (ui.anyPanelOpen()) { ui.hideAll(); return; }\n    ui.hideAll();\n    ui.showEscapeMenu();\n    return;\n  }\n  if (ui.escapeMenuOpen) return;\n  if (!ui.blockingFor(world.localSeat.id) && (input.justPressed(kb.townPortal) || (!padPointer.active && pad.justPressed(settings.padBinds.townPortal)))) {\n    world.requestMeta({ t: 'townPortal' });\n  }\n  // THE COMPANION STANCE (engine/companionStances.ts): one press walks every\n  // bonded beast's conduct on the bar — host-judged like every meta intent.\n  if (!ui.blockingFor(world.localSeat.id) && (input.justPressed(kb.companionStance)\n    || (!padPointer.active && pad.justPressed(settings.padBinds.companionStance)))) {\n    world.requestMeta({ t: 'companionStance' });\n  }\n  // THE PING (card 17 A — engine/pings.ts, data/identityCues.ts PING_CUE): mark the\n  // ground under the aim for your party — host-judged like every meta intent; the\n  // pad's reticle when it owns the aim, else the mouse.\n  if (!ui.blockingFor(world.localSeat.id) && (input.justPressed(kb.ping)\n    || (!padPointer.active && pad.justPressed(settings.padBinds.ping)))) {\n    const at = renderer.padAim ?? renderer.toWorld(input.mouse);\n    world.requestMeta({ t: 'ping', x: at.x, y: at.y });\n  }\n  // Panel toggles answer to key OR pad bind — and the pad ones deliberately\n  // stay live in pointer mode (the D-pad flips panels while browsing them).\n  const pb = settings.padBinds;\n  if (input.justPressed(kb.panelChar) || pad.justPressed(pb.panelChar)) ui.toggleCharSheet();\n  if (input.justPressed(kb.panelTree) || pad.justPressed(pb.panelTree)) ui.toggleTree();\n  if (input.justPressed(kb.panelSkills) || pad.justPressed(pb.panelSkills)) ui.toggleBuildPanel();\n  if (input.justPressed(kb.panelMap) || pad.justPressed(pb.panelMap)) ui.toggleMap();\n  if (input.justPressed(kb.panelInv) || pad.justPressed(pb.panelInv)) ui.toggleInventory();\n  // THE MENU BAR's tray (ui/menubar.ts): the bind fans the pages. Its\n  // default key is Tab, which THE FOLIO also walks while a book of two or\n  // more leaves stands — the walk wins then (folioWalkArmed).\n  if ((input.justPressed(kb.panelMenu) || pad.justPressed(pb.panelMenu)) && !ui.folioWalkArmed()) ui.toggleMenu();\n  // GEAR pickup — a META intent (host-validated, co-op-replicated), not raw\n  // world poking; the open bag re-renders so the grab appears instantly.\n  if (input.justPressed(kb.pickup) || pad.justPressed(pb.pickup)) {\n    world.requestMeta({ t: 'pickupItem' });\n    if (ui.inventoryOpen) ui.refreshInventory();\n  }\n}\n\n/** Spawn a local stand-in ally (scripted: follow + auto-attack) to exercise the\n *  multi-seat co-op path without networking. Dev-only, gated by `?coop` or the\n *  `__game.addAlly()` console hook. Picks a class different from the local hero. */\nfunction spawnCoopAlly(): void {\n  if (world.seats.length >= 5) return;\n  const own = world.localSeat.meta.classDef;\n  const cls = CLASSES.find(c => c !== own) ?? own;\n  const id = 'p' + world.seats.length;\n  if (net instanceof LocalTransport) net.addLocalSeat({ id, name: cls.name, classId: cls.id });\n  // `?coophuman` makes the second seat a LOCAL HUMAN on the arrow keys (test co-op\n  // move/cast in one tab); otherwise it's a scripted follow-and-fight ally.\n  world.addSeat(id, cls, COOP_HUMAN ? new LocalCoopInput(input.keys) : new ScriptedInput());\n}\n\n// ---------------------------------------------------------------------------\n// THE COUCH SESSION (data/couch.ts) — a second LOCAL player on this screen.\n// A guest is an ordinary Seat: its intent is a PadSeatInput on a claimed pad,\n// its panels dock to its flank, its vessel (immortal lane) persists to its\n// own roster slot. Everything here short-circuits to nothing with no guests\n// seated — the solo invariant. main.ts owns the session (the world owns only\n// the seats), exactly as it owns the net transport.\n// ---------------------------------------------------------------------------\ninterface CouchGuestCtx {\n  seatId: string;\n  /** The claimed pad slot; -1 while the device is LOST (identity sweep). */\n  padIdx: number;\n  /** Device identity captured at claim — the re-bind's match key. */\n  padId: string | null;\n  /** Census snapshot from the frame the bound pad vanished: slots already\n   *  standing then may never be adopted (findRebindSlot's newcomer rule).\n   *  Undefined while the pad is alive. */\n  lostSeen?: Set<number>;\n  gpad: PadState;\n  source: PadSeatInput;\n  pointer: PadPointer;\n  /** Immortal-lane vessel context: the roster slot + the join-time save\n   *  (its dormant menagerie rides back out verbatim at persist). */\n  vessel?: { slot: number; save: CharacterSave };\n}\nconst couchGuests = new Map<string, CouchGuestCtx>();\nconst couchPadSet = new Set<number>();\nconst couchClaim = new CouchClaimSession(pad);\nconst couchOverlay = new CouchJoinOverlay();\nlet couchClaimPad: number | null = null;\nlet couchClaimId: string | null = null;\n/** A saved pick belongs to this ceremony, controller claim and run. */\nlet couchJoinGeneration = 0;\nlet couchSeatSerial = 0;\n/** Last frame's connected-pad census — the pause menu's couch row re-renders\n *  the moment it moves (a controller is invisible to the browser until its\n *  first button press; the row asks for that press, so it must reward it). */\nlet couchPadCensus = -1;\n\nfunction couchActive(): boolean { return couchGuests.size > 0; }\n\n// The hero's merged pad read skips claimed guest pads (null = byte-identical\n// classic read while no guest is seated).\npad.padExclude = () => (couchPadSet.size ? couchPadSet : null);\n\n/** A guest's gameplay parks while a global surface is up or its own pointer\n *  owns its pad (its panels are open) — the guest twin of P1's padLive gate. */\nfunction couchGuestSuspended(id: string): boolean {\n  const g = couchGuests.get(id);\n  return !g || ui.escapeMenuOpen || ui.couchJoinOpen || g.pointer.active;\n}\n\n/** THE IDENTITY RE-BIND (per guest, per frame): a claimed pad that vanishes\n *  (Bluetooth sleep, Steam Input device churn) releases its slot back to the\n *  hero's pool and parks the seat — the flank HUD says so — and when a pad\n *  wearing the SAME device id arrives at a NEWCOMER slot, the seat follows\n *  it there by itself (net/couch.ts findRebindSlot owns the match law). */\nfunction couchGuestPadSweep(g: CouchGuestCtx): void {\n  const atBound = g.padIdx >= 0 ? padIdAt(g.padIdx) : null;\n  if (atBound !== null && (g.padId === null || atBound === g.padId)) {\n    g.lostSeen = undefined; // the claimed device stands where we left it\n    return;\n  }\n  if (g.padIdx >= 0) {\n    // First frame of loss — or a STRANGER at the bound slot (that slot may\n    // be P1's own controller returning; the hero's roam must be free to\n    // take it). Release the claim and snapshot the census: only a slot\n    // appearing AFTER this moment may re-bind.\n    couchPadSet.delete(g.padIdx);\n    g.padIdx = -1;\n    g.gpad.padIndex = -1; // a bound read at -1 reads nothing — the seat parks\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (seat?.couch) seat.couch.pad = -1;\n    g.lostSeen = new Set(connectedPadIndices());\n  }\n  const slot = findRebindSlot(g.padId, g.lostSeen ?? new Set(), couchPadSet);\n  if (slot !== null) {\n    g.padIdx = slot;\n    g.gpad.padIndex = slot;\n    couchPadSet.add(slot);\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (seat?.couch) seat.couch.pad = slot;\n    g.lostSeen = undefined;\n  }\n}\n\n/** THE LANE LAW: the guest joins the run's OWN lane — an immortal run seats\n *  another vessel from this account's roster (a second immortal slot must be\n *  unlocked); a mortal run seats a fresh, disposable hero (the net join's\n *  Tier-0 idiom). */\nfunction couchLaneImmortal(): boolean { return modeById(world.meta.modeId).save === 'roster'; }\n\nfunction couchChoices(): CouchJoinChoice[] {\n  if (!couchLaneImmortal()) {\n    return CLASSES.filter(c => isClassUnlocked(account, c.id)).map(c => ({\n      key: 'class:' + c.id, title: c.name, sub: c.description, color: c.color,\n    }));\n  }\n  const mode = modeById(world.meta.modeId);\n  if (rosterCapacity(account, mode) < COUCH_CFG.join.immortalSlotsNeeded) {\n    return [{\n      key: 'none', title: 'A second Immortal slot is required', color: '#8a8678', sub: '',\n      disabled: 'Unlock another Immortal vessel slot in the Vault to bring a second vessel to the couch.',\n    }];\n  }\n  // THE FALLEN LOCK: a fallen vessel cannot couch-join — the covenant gates\n  // every entry into play, not just the solo resume.\n  const rows = account.roster.filter(r =>\n    r.modeId === mode.id && r.charId !== world.meta.charId && !r.fallen);\n  if (!rows.length) {\n    const fallenOnly = account.roster.some(r =>\n      r.modeId === mode.id && r.charId !== world.meta.charId && r.fallen);\n    return [{\n      key: 'none', color: '#8a8678', sub: '',\n      title: fallenOnly ? 'Every other vessel lies fallen' : 'No second vessel sworn',\n      disabled: fallenOnly\n        ? 'Resurrect a vessel in the Vault first — a fallen Immortal cannot take the couch.'\n        : 'Swear another Immortal from the start menu first — the couch seats an existing vessel.',\n    }];\n  }\n  return rows.map(r => ({\n    key: 'vessel:' + r.charId,\n    title: `${r.name} — Level ${r.level}`,\n    sub: `${CLASSES.find(c => c.id === r.classId)?.name ?? r.classId} · ${mode.name}`,\n    color: mode.color,\n  }));\n}\n\nfunction couchJoinView(): CouchJoinView {\n  const lane = couchLaneImmortal()\n    ? 'Immortal run — a second VESSEL from this account joins.'\n    : 'Mortal run — a fresh hero joins for this run (the run is the character).';\n  return couchClaimPad === null\n    ? {\n      phase: 'claim', lane,\n      message: 'Press Ⓐ on the JOINING controller to claim it.',\n      choices: [], onPick: () => { /* no choices yet */ }, onCancel: closeCouchJoin,\n    }\n    : {\n      phase: 'pick', lane,\n      message: `Controller ${couchClaimPad + 1} claimed — choose who joins.`,\n      choices: couchChoices(), onPick: couchJoin, onCancel: closeCouchJoin,\n    };\n}\n\nfunction openCouchJoin(): void {\n  if (!running || !net.isHost || !(net instanceof LocalTransport)) return;\n  if (world.couchSeats().length >= COUCH_CFG.join.maxLocal - 1) return;\n  couchJoinGeneration++;\n  couchClaimPad = null;\n  couchClaimId = null;\n  // Freeze the hero's roaming read where it stands: the claim scan and the\n  // roam must never race for the joining pad's first press (the Deck bug —\n  // the roam adopted the press and the scan then excluded it, forever).\n  couchClaim.arm(couchPadSet);\n  ui.couchJoinOpen = true;\n  // The ceremony is a menu: solo holds the world (the allowHold policy — a\n  // live couch keeps running, exactly like the pause law).\n  world.timeflow.holdSurface('menu:couchJoin');\n  couchOverlay.show(couchJoinView());\n}\n\nfunction closeCouchJoin(): void {\n  couchJoinGeneration++;\n  ui.couchJoinOpen = false;\n  couchClaimPad = null;\n  couchClaimId = null;\n  couchClaim.release();\n  world.timeflow.release('menu:couchJoin');\n  couchOverlay.hide();\n}\n\n/** Mint the guest seat: transport peer + PadState bound to the claimed pad +\n *  the PadSeatInput source + a pointer of its own, flank-tagged. */\nfunction mintCouchSeat(padIdx: number, cls: ClassDef, vessel?: CouchGuestCtx['vessel']): Seat | null {\n  if (!(net instanceof LocalTransport)) return null;\n  const id = 'c' + (++couchSeatSerial);\n  net.addLocalSeat({ id, name: vessel?.save.name ?? cls.name, classId: cls.id });\n  const gpad = new PadState(padTuning);\n  gpad.padIndex = padIdx;\n  const source = new PadSeatInput(gpad, {\n    tuning: padTuning,\n    binds: () => settings.padBinds,\n    assist: () => ({ mode: settings.pad.assistMode, strength: settings.pad.aimAssist }),\n    improvisedStrike: () => settings.improvisedStrike,\n    invertMove: () => settings.invertMove,\n    suspended: () => couchGuestSuspended(id),\n  });\n  const seat = world.addSeat(id, cls, source, { startingCompanions: !vessel, startingFlasks: !vessel });\n  const side = COUCH_CFG.join.sides[\n    Math.min(COUCH_CFG.join.sides.length - 1, world.couchSeats().length + 1)] ?? 'right';\n  seat.couch = { pad: padIdx, side };\n  const pointer = new PadPointer(gpad, padTuning);\n  pointer.onCancel = () => couchGuestCancel(id);\n  couchGuests.set(id, { seatId: id, padIdx, padId: padIdAt(padIdx), gpad, source, pointer, vessel });\n  couchPadSet.add(padIdx);\n  return seat;\n}\n\n/** The pick handler: 'class:<id>' seats a fresh mortal-lane hero; 'vessel:\n *  <charId>' loads + grafts the roster vessel (async disk-first read). */\nfunction couchJoin(pick: string): void {\n  if (couchClaimPad === null) return;\n  const padIdx = couchClaimPad;\n  if (pick.startsWith('class:')) {\n    const cls = CLASSES.find(c => c.id === pick.slice('class:'.length));\n    if (cls) mintCouchSeat(padIdx, cls);\n    closeCouchJoin();\n    return;\n  }\n  if (!pick.startsWith('vessel:')) return;\n  const charId = pick.slice('vessel:'.length);\n  const entry = account.roster.find(r => r.charId === charId);\n  if (!entry) { closeCouchJoin(); return; }\n  const request = ++couchJoinGeneration;\n  const joiningWorld = world, joiningNet = net;\n  const slot = entry.slot, modeId = entry.modeId, classId = entry.classId;\n  const hostCharId = joiningWorld.meta.charId, claimId = couchClaimId;\n  const ceremonyCurrent = (): boolean => request === couchJoinGeneration\n    && running && world === joiningWorld && net === joiningNet\n    && joiningNet instanceof LocalTransport && ui.couchJoinOpen\n    && couchClaimPad === padIdx && claimId !== null && couchClaimId === claimId\n    && padIdAt(padIdx) === claimId && !couchPadSet.has(padIdx);\n  const vesselCurrent = (): boolean => account.roster.includes(entry)\n    && entry.charId === charId && entry.slot === slot && entry.modeId === modeId\n    && entry.classId === classId && !entry.fallen\n    && joiningWorld.meta.charId === hostCharId && charId !== hostCharId\n    && joiningWorld.meta.modeId === modeId && modeById(modeId).save === 'roster'\n    && rosterCapacity(account, modeById(modeId)) >= COUCH_CFG.join.immortalSlotsNeeded\n    && joiningWorld.couchSeats().length < COUCH_CFG.join.maxLocal - 1;\n  if (!ceremonyCurrent() || !vesselCurrent()) { closeCouchJoin(); return; }\n  void (async (): Promise<void> => {\n    const save = await loadRosterSave(slot);\n    // A retired/replaced ceremony may not mint a seat OR close its successor.\n    if (!ceremonyCurrent()) return;\n    if (!vesselCurrent()) { closeCouchJoin(); return; }\n    const built = save && rebuildSavedMeta(save);\n    const cls = save && CLASSES.find(c => c.id === save.classId);\n    if (!save || !built || !cls || save.classId !== classId || built.meta.modeId !== modeId\n      || (save.charId && save.charId !== charId)) { closeCouchJoin(); return; }\n    if (!ceremonyCurrent()) return;\n    if (!vesselCurrent()) { closeCouchJoin(); return; }\n    const seat = mintCouchSeat(padIdx, cls, { slot, save });\n    if (seat) {\n      world.adoptSeatMeta(seat, built.meta, save.bar, save.level);\n      seat.couchDeaths = built.deaths;\n      if (!seat.meta.charId) seat.meta.charId = entry.charId;\n      seat.couch!.charId = seat.meta.charId;\n      seat.couch!.rosterSlot = entry.slot;\n    }\n    closeCouchJoin();\n  })();\n}\n\n/** Persist every seated guest VESSEL to its own roster slot (the persistRun\n *  sibling; disposable mortal-lane guests carry nothing to save). */\nfunction persistCouchGuests(durable = false): void {\n  for (const g of couchGuests.values()) {\n    if (!g.vessel) continue;\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (!seat) continue;\n    saveCouchGuest(account, world, seat, g.vessel.slot, g.vessel.save, durable);\n  }\n}\n\n/** A guest leaves mid-run (the escape row): vessel saved, seat removed, pad\n *  released — the frame narrows back to the hero on its own smoothing. */\nfunction couchLeave(id: string): void {\n  const g = couchGuests.get(id);\n  if (!g) return;\n  persistCouchGuests();\n  world.removeSeat(id);\n  if (net instanceof LocalTransport) net.removeLocalSeat(id);\n  g.pointer.dispose();\n  couchGuests.delete(id);\n  couchPadSet.delete(g.padIdx);\n  renderer.couchAims = [];\n  renderer.couchPadLost = [];\n}\n\n/** Tear the whole couch session down (run end / menu). Persistence is the\n *  CALLER's duty first — this only drops the session machinery. */\nfunction couchReset(): void {\n  couchJoinGeneration++;\n  for (const g of couchGuests.values()) g.pointer.dispose();\n  couchGuests.clear();\n  couchPadSet.clear();\n  renderer.couchAims = [];\n  renderer.couchPadLost = [];\n  if (ui.couchJoinOpen) closeCouchJoin();\n}\n\n/** The guest's Ⓑ/cancel cascade — their panels first, then the shared pause. */\nfunction couchGuestCancel(id: string): void {\n  if (ui.couchJoinOpen) { closeCouchJoin(); return; }\n  if (ui.escCascadeFor(id)) return;\n  synthEscape();\n}\n\n/** Per-frame couch work, right after the hero's own device poll: guest pads\n *  poll on the same wall clock, guest pointers wake on THEIR OWN blocking\n *  surfaces, the join overlay runs its claim scan, and the renderer gets the\n *  guests' reticles in their class tints. No guests = nothing. */\nfunction couchTick(dt: number, nowSec: number): void {\n  for (const g of couchGuests.values()) {\n    couchGuestPadSweep(g);\n    g.gpad.poll(nowSec);\n    g.pointer.update(dt, ui.blockingFor(g.seatId) || !running, nowSec);\n    // Guest START = the shared pause (either player may pause the couch).\n    if (g.gpad.justPressed(PAD_CFG.escapeButton)) synthEscape();\n  }\n  // The pause menu's couch row gates on the pad census — re-render it live\n  // as controllers announce themselves (a pad is invisible to the browser\n  // until its first button press; the disabled row asks for exactly that\n  // press, so the press must enable the row while the menu still shows).\n  const census = connectedPadIndices().length;\n  if (census !== couchPadCensus) {\n    couchPadCensus = census;\n    if (ui.escapeMenuOpen) ui.refreshEscapeCouchRow();\n  }\n  if (ui.couchJoinOpen) {\n    if (couchClaimPad !== null && (padIdAt(couchClaimPad) !== couchClaimId\n      || couchPadSet.has(couchClaimPad))) {\n      // Losing the selected device ends its pending pick, even if the same\n      // controller later returns at that slot. Its next press must claim anew.\n      couchJoinGeneration++;\n      couchClaimPad = null;\n      couchClaimId = null;\n      couchClaim.arm(couchPadSet);\n    }\n    if (couchClaimPad === null) {\n      const hit = couchClaim.scan(COUCH_CFG.join.claimButton, couchPadSet);\n      if (hit !== null) { couchClaimPad = hit; couchClaimId = padIdAt(hit); }\n    }\n    couchOverlay.update(couchJoinView());\n  }\n  if (couchGuests.size) {\n    // The flank banner: seats whose CONTROLLER left (identity sweep above).\n    renderer.couchPadLost = [...couchGuests.values()]\n      .filter(g => g.padIdx < 0).map(g => g.seatId);\n    renderer.couchAims = [...couchGuests.values()].flatMap(g => {\n      const seat = world.seats.find(s => s.id === g.seatId);\n      const a = g.source.aimView();\n      return seat && a && !seat.actor.dead && !seat.actor.downed\n        ? [{ x: a.x, y: a.y, lockId: a.lockId, color: seat.meta.classDef.color }] : [];\n    });\n  }\n}\n\n/** Guest panel toggles + pickup, off the guest's OWN pad binds — the couch\n *  twin of handleLocalPanels (host branch only; guests exist only there). */\nfunction handleCouchPanels(): void {\n  if (ui.escapeMenuOpen || ui.couchJoinOpen) return;\n  const pb = settings.padBinds;\n  for (const g of couchGuests.values()) {\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (!seat || seat.actor.dead || seat.actor.downed) continue;\n    if (!g.pointer.active && g.gpad.justPressed(pb.townPortal)) world.applyAction(seat, { t: 'townPortal' });\n    if (!g.pointer.active && g.gpad.justPressed(pb.companionStance)) world.applyAction(seat, { t: 'companionStance' });\n    if (g.gpad.justPressed(pb.panelChar)) ui.toggleCharSheet(g.seatId);\n    if (g.gpad.justPressed(pb.panelTree)) ui.toggleTree(g.seatId);\n    if (g.gpad.justPressed(pb.panelSkills)) ui.toggleBuildPanel(g.seatId);\n    if (g.gpad.justPressed(pb.panelMap)) ui.toggleMap();\n    if (g.gpad.justPressed(pb.panelInv)) ui.toggleInventory(g.seatId);\n    if (g.gpad.justPressed(pb.pickup)) {\n      world.applyAction(seat, { t: 'pickupItem' });\n      if (ui.inventoryOpen) ui.refreshInventory();\n    }\n  }\n}\n\n// --- THE CARAVAN's three seams (engine/world.ts updateCaravan) ---------------\n// The dwell is seat-scoped and the travel is host-authoritative, so every road\n// out of the Caravanner ends in the SAME caravanTo intent — the host mints the\n// route and loads the party, whoever asked.\n\n/** Ask the escort for band N (0 = home) for whichever LOCAL seat lingered.\n *  ALWAYS the intent lane, never startCaravan directly: on a co-op CLIENT\n *  requestMeta forwards caravanTo and applies nothing locally (a render shell\n *  never mints or loads a zone), and host-side a couch guest's ask must land on\n *  the GUEST's seat — startCaravan re-checks proximity per seat, so routing a\n *  guest's dwell through the distant hero would simply refuse. Solo the dwell\n *  seat IS the local seat: one requestMeta, exactly as before. */\nfunction caravanTo(band: number): void {\n  const seat = world.seats.find(s => s.id === world.caravanDwellSeatId);\n  if (seat?.couch) world.applyAction(seat, { t: 'caravanTo', band });\n  else world.requestMeta({ t: 'caravanTo', band });\n}\n\n/** The Caravanner's TOWN answer: open the band menu on the seat that lingered. */\nfunction pollCaravanMenu(): void {\n  if (world.caravanDwellRequested && !ui.escapeMenuOpen) {\n    world.caravanDwellRequested = false;\n    if (!ui.caravanOpen) ui.showCaravan(world.caravanDwellSeatId);\n  }\n}\n\n/** The Caravanner's WILDS answer: port straight home, no menu (so nothing pops\n *  up mid-combat) — through the intent, so a client's return works too. */\nfunction pollCaravanReturn(): void {\n  if (world.caravanReturnRequested) {\n    world.caravanReturnRequested = false;\n    caravanTo(0);\n  }\n}\n\n// The pause-menu row (panels.ts gates it on pads + a free guest seat).\nui.onCouchJoin = openCouchJoin;\nui.onCouchLeave = () => {\n  for (const id of [...couchGuests.keys()]) couchLeave(id);\n};\n\n// --- FRAME TELEMETRY (always on; read via __game.perfFrames) -----------------\n// Three fixed ring buffers of per-frame wall-clock samples: the rAF GAP (true\n// frame pacing — the jitter a player feels, compositor included), the SIM\n// milliseconds (input + AI + world.update), and the RENDER milliseconds. Cost\n// is two performance.now() calls and three float writes per frame — nothing.\n// The perf harness (npm run perf → src/dev/perf.ts) reduces these to\n// percentiles/hitch counts per zone; a future in-game FPS readout reads the\n// same rings.\nconst PERF_RING = 2048;\n// THE RING FIT (2026-08-02): the rings were a constant 2048 slots, and a\n// 240Hz display fills that in ~8.5s — a --seconds=12 sweep window WRAPPED,\n// silently dropping the window's OLDEST frames (exactly where bakes cluster),\n// so h40/gapMax undercounted while the sampler-side off40 kept counting\n// (gloamwood base2 2026-08-02: off40 5 vs h40 0 at frames=2048 exact). The\n// perf sweep now sizes the rings to its own window via perfRingSize\n// (requested seconds × measured refresh + margin); PERF_RING stays the floor\n// and the play-mode default — normal play never resizes. perfPushed counts\n// every push since the last reset: pushed > stored frames is the wrap\n// detector no sizing mistake can silently defeat.\nlet perfRingN = PERF_RING;\nlet perfGap = new Float32Array(perfRingN);\nlet perfSim = new Float32Array(perfRingN);\nlet perfRen = new Float32Array(perfRingN);\nlet perfIdx = 0, perfCount = 0, perfPushed = 0;\n/** The sampler's fine own-task anchor (__game.perfTickT0): performance.now()\n *  at the CURRENT frame's tick-callback entry. The coarse taskMax anchors on\n *  the vsync timestamp, so a foreign task overhanging the tick wears the\n *  frame's name — this mark lets the sweep separate the frame's OWN work\n *  from that overhang (src/dev/perf.ts walkPhase). */\nlet perfTickT0 = 0;\n/** Resize the frame rings — the perf harness's one-per-sweep call (normal\n *  play keeps the default). Clamped to [PERF_RING, 1<<17]; resets the rings. */\nfunction perfRingSize(frames: number): number {\n  const want = Math.max(PERF_RING, Math.min(1 << 17, Math.ceil(frames) || 0));\n  if (want !== perfRingN) {\n    perfRingN = want;\n    perfGap = new Float32Array(want);\n    perfSim = new Float32Array(want);\n    perfRen = new Float32Array(want);\n  }\n  perfIdx = 0; perfCount = 0; perfPushed = 0;\n  return perfRingN;\n}\nfunction perfPush(gap: number, sim: number, ren: number): void {\n  perfGap[perfIdx] = gap; perfSim[perfIdx] = sim; perfRen[perfIdx] = ren;\n  perfIdx = (perfIdx + 1) % perfRingN;\n  if (perfCount < perfRingN) perfCount++;\n  perfPushed++;\n  phaseMark('sim', sim); phaseMark('ren', ren); // the bracketed slabs join the ledger\n}\n\n// THE PHASE LEDGER (perf attribution, 2026-08-02): coarse wall-clock marks\n// around the frame's major slabs, folded to ONE window-worst (name, ms) that\n// perfFrames ships beside the rings — so a perf-sweep row whose gapMax ≈\n// taskMx with sim99/ren99 both tiny (the 2026-08-01 verdict sweep's\n// metropolis 367ms task, sim 8 / ren 6: a giant slab inside the frame task\n// but outside BOTH engine brackets) SELF-ATTRIBUTES instead of needing a\n// hand bisect. The slabs and their anchors:\n//   'pre'  — rAF timestamp → tick-callback entry. The ONLY mark anchored on\n//            the vsync timestamp (deliberately the same anchor as the\n//            sampler's coarse taskMax): a foreign task (GC, timer, idle\n//            autosave) overhanging the tick delays the whole callback batch\n//            and wears the frame's name in taskMax — this mark measures\n//            exactly that overhang, disambiguating the coarse-anchor trap.\n//            (step()-driven synthetic frames mint a bogus 'pre'; the ledger\n//            is only read by the perf sweep, which drives real rAF.)\n//   'head' — tick entry → the sim bracket (pad poll, pointer, couch tick).\n//   'sim'/'ren' — the standing brackets, folded at perfPush (same frame).\n//   'tail' — post-perfPush → end of the host branch (net broadcast +\n//            hostTail). A tail slab CANNOT flush before its own frame's\n//            perfPush by position (hostTail runs after it), so it CARRIES\n//            to the NEXT tick's fold — ≤1 frame late, and a window's last\n//            tail lands in the gap after it closes. Coarse by design.\n// Cost: three performance.now() calls + compares per frame; always on, like\n// the rings themselves.\nlet phaseWorstName = '', phaseWorstMs = 0, phasePendTail = 0;\nfunction phaseMark(name: string, ms: number): void {\n  if (ms > phaseWorstMs) { phaseWorstName = name; phaseWorstMs = ms; }\n}\n\n// --- THE RENDER-SCALE GOVERNOR (render/renderScale.ts; Settings.renderScale) --\n// 'auto' watches the SAME gap ring the Pulse tab and the perf harness read\n// and walks the notch ladder — down readily while sustained p95 sits past\n// the 30fps knee, up patiently once frames hold (the pure nextNotch law).\n// A manual number pins the scale. Runs every frame, judges every evalSec.\nlet rsNotch = 0, rsHotSec = 0, rsCoolSec = 0, rsNextEvalAt = 0;\nfunction renderScaleTick(nowMs: number): void {\n  const want = settings.renderScale;\n  if (want !== 'auto') {\n    renderer.setRenderScale(typeof want === 'number' ? want : 1);\n    rsNotch = 0; rsHotSec = 0; rsCoolSec = 0;\n    return;\n  }\n  if (nowMs < rsNextEvalAt) return;\n  const g = RENDER_SCALE_CFG.governor;\n  rsNextEvalAt = nowMs + g.evalSec * 1000;\n  const n = Math.min(perfCount, 300);\n  if (n < 60) return; // not enough frames to judge yet\n  const start = (perfIdx - n + perfRingN) % perfRingN;\n  const gaps: number[] = new Array(n);\n  for (let i = 0; i < n; i++) gaps[i] = perfGap[(start + i) % perfRingN];\n  gaps.sort((a, b) => a - b);\n  const p95 = gaps[Math.floor(n * 0.95)];\n  if (p95 > g.stepDownP95Ms) { rsHotSec += g.evalSec; rsCoolSec = 0; }\n  else if (p95 < g.stepUpP95Ms) { rsCoolSec += g.evalSec; rsHotSec = 0; }\n  else { rsHotSec = 0; rsCoolSec = 0; }\n  const next = nextNotch(rsNotch, rsHotSec, rsCoolSec);\n  if (next !== rsNotch) { rsNotch = next; rsHotSec = 0; rsCoolSec = 0; }\n  renderer.setRenderScale(RENDER_SCALE_CFG.notches[rsNotch]);\n}\n\nlet last = performance.now();\n// THE AGENT SEAT + THE DIRECTOR (src/agent/, src/director/): a capture rig or\n// a playtest bot may drive the local seat through the same artery the\n// keyboard does (the pilot is read inside the guarded local-input path), and HOLD the\n// rAF pump so only __game.step() advances the game (deterministic takes).\n// Both are null/false in ordinary play — the classic loop, byte for byte.\nlet localPilot: HeroInputSource | null = null;\nlet directorHold = false;\nlet director: Director | null = null;\n/** A held capture still waits on the actual loading lease and native page I/O.\n * Tick only through the loading gate; no scripted hand is installed yet. */\nasync function waitDirectorReady(signal: AbortSignal): Promise<void> {\n  const prepared = world;\n  const deadline = performance.now() + 60000;\n  const cancel = () => { if (loadingScreen.active && world === prepared) cancelLoadingToMenu(); };\n  signal.addEventListener('abort', cancel, { once: true });\n  try {\n    for (;;) {\n      signal.throwIfAborted();\n      if (world !== prepared || !running) throw new Error('Director world entry was replaced or cancelled.');\n      if (crashFatal) throw new Error('Director world entry failed: ' + crashFatal.msg);\n      const readiness = clientReadiness(world);\n      if (readiness?.status === 'refused') throw new Error(readiness.error ?? 'Director native pages were refused.');\n      if (!loadingScreen.active && (!readiness || readiness.status === 'ready')) return;\n      if (performance.now() >= deadline) throw new Error('Director world entry did not become ready.');\n      tick(last + 1000 / 60);\n      await new Promise<void>(resolve => setTimeout(resolve, 16));\n    }\n  } finally { signal.removeEventListener('abort', cancel); }\n}\n/** The rAF pump: one tick, then re-arm. All work lives in tick() so tests can\n *  drive frames SYNCHRONOUSLY via __game.step() — a hidden tab freezes rAF\n *  entirely (the tab-throttle gotcha), which would otherwise freeze input\n *  polling, the pad, and the sim under any headless/backgrounded harness.\n *  A throw out of tick() is a FATAL (the crash trap above): before this\n *  catch existed it silently KILLED the pump — the classic wedged canvas —\n *  and after a fatal the pump stands down deliberately (no re-arm): a\n *  crashed sim is not ticked onward beneath the overlay. */\nfunction frame(now: number): void {\n  if (crashFatal) return;\n  try { if (!directorHold) tick(now); } catch (e) { reportFatal(e, 'game loop'); }\n  if (!crashFatal) requestAnimationFrame(frame);\n}\nfunction tick(now: number): void {\n  // ?crashtest — the negative control's deliberate throw, from INSIDE the\n  // live loop (see the const by COOP_PARAMS; Infinity while the param is off).\n  if (now >= crashTestAt) {\n    crashTestAt = Infinity;\n    throw new Error('?crashtest — deliberate crash-trap drill from the rAF loop');\n  }\n  const frameGapMs = now - last; // true frame pacing, BEFORE the dt clamp\n  const tickT0 = performance.now(); // PHASE LEDGER anchor: callback start\n  perfTickT0 = tickT0; // the sampler's fine own-task anchor (__game.perfTickT0)\n  phaseMark('pre', tickT0 - now); // vsync→callback overhang (a foreign task)\n  phaseMark('tail', phasePendTail); phasePendTail = 0; // last frame's tail, carried\n  const dt = Math.min(0.05, (now - last) / 1000);\n  last = now;\n\n  // loading-screen: hold simulation, world rendering, menus and input while\n  // the independent toy frame continues. Native I/O advances in real time.\n  if (running && net.isHost && !world.gameOver && (!loadingScreen.active || loadingGate)) {\n    const readiness = clientReadiness(world);\n    if (readiness && readiness.status !== 'ready' && !loadingGate) {\n      loadingGate = { world, lease: loadingScreen.begin({ kind: 'travel', label: 'Crossing the veil',\n        loadout: account.cosmetics.loadout, cancel: cancelLoadingToMenu }) };\n    }\n    if (loadingGate) {\n      if (!readiness || readiness.status === 'ready') { loadingGate.lease.finish(); loadingGate = undefined; }\n      else if (readiness.status === 'refused') loadingGate.lease.fail(readiness.error ?? 'World pages are unavailable.',\n        () => { world.massRuntime?.retryNativePages(world); });\n      else loadingGate.lease.update({ label: 'Crossing the veil',\n        ...(readiness.required === undefined ? {} : { detail: readiness.required + ' nearby world pages remaining' }) });\n    }\n  }\n  // THE ONE CROSSING (net/crossing.ts): a hosted arrival or hand-off holds the world (no input\n  // leaves, nothing of it is drawn) while the shell places and streams beneath the cover; a\n  // hand-off's grace keeps the last frame and the hands' keys, then the screen rises. The\n  // frame that releases it is held too, so the shell places once a frame.\n  if (crossing.covered) {\n    crossingFrame(dt);\n    if (!loadingScreen.active) { pad.poll(now / 1000); pad.endFrame(); input.endFrame(); return; }\n  }\n  if (loadingScreen.active) { input.clearForLoading(); pad.poll(now / 1000); pad.endFrame(); net.drainInputs(); return; }\n\n  // THE RENDER SCALE: apply the dial/governor, and keep the pointer seam\n  // synced (CSS events map into buffer pixels through Input.pointerScale).\n  renderScaleTick(now);\n  input.pointerScale = renderer.pixelScale;\n\n  // CONTROLLER, before anything reads input: poll the device, settle who owns\n  // the reticle, run the menu pointer (it consumes Ⓐ/Ⓑ while active), and fire\n  // the pad's hardwired Escape — a synthetic keystroke, so the entire close-\n  // cascade stays single-sourced in handleLocalPanels.\n  const nowSec = now / 1000;\n  pad.poll(nowSec);\n  if (loadingScreen.padQuarantined) {\n    // Include panel toggles and the pad pointer, not only combat reads.\n    pad.move.x = pad.move.y = pad.aimStick.x = pad.aimStick.y = 0;\n    pad.moveMag = pad.aimMag = 0; pad.down.clear(); pad.pressed.clear();\n  }\n  for (const code of dialoguePadHeld) if (!pad.isDown(code)) dialoguePadHeld.delete(code);\n  if (!running || world.player?.dead || world.player?.downed) dialogue.reset();\n  dialogue.setAvailable(renderer.npcDialogueAvailable());\n  if (input.mouse.x !== lastMouse.x || input.mouse.y !== lastMouse.y) {\n    // The mouse reclaims aim only through DELIBERATE travel: motion\n    // accumulates while the pad holds the reticle, and only past the\n    // threshold does the arrow take over (then it owns aim on any motion).\n    const moved = Math.hypot(input.mouse.x - lastMouse.x, input.mouse.y - lastMouse.y);\n    lastMouse.x = input.mouse.x; lastMouse.y = input.mouse.y;\n    if (aimSource === 'pad') {\n      mouseReclaim += moved;\n      if (mouseReclaim >= PAD_CFG.mouseReclaimPx) {\n        aimSource = 'mouse'; mouseReclaim = 0;\n        // THE RETICLE HANDS THE MOUSE THE CURSOR: the switch starts aiming\n        // exactly where the reticle was (assist and all), not wherever the\n        // arrow sat parked — the offset melts with travel (block below).\n        // Only while the reticle was truly the cursor (live play): if the\n        // arrow was visible (menus etc.), its own position is the truth.\n        if (padAimView && reticleAllowed()) {\n          const rs = renderer.toScreen(padAimView);\n          mouseHandoff = { x: rs.x - input.mouse.x, y: rs.y - input.mouse.y };\n        }\n      }\n    } else if (mouseHandoff) {\n      // MELT the handoff with deliberate travel — each px of motion scales\n      // the offset by (1 − px/mergePx); once it's within doneEps of zero,\n      // arrow and aim are one and the honest OS arrow returns.\n      const h = PAD_CFG.mouseHandoff;\n      const k = Math.max(0, 1 - moved / h.mergePx);\n      mouseHandoff.x *= k; mouseHandoff.y *= k;\n      if (Math.hypot(mouseHandoff.x, mouseHandoff.y) < h.doneEps) mouseHandoff = null;\n    }\n  }\n  // Any live aim-stick deflection reclaims the reticle for the pad (and ends\n  // any mouse handoff — the pad's sticky cursor is absolute again).\n  if (pad.aimMag > 0) { aimSource = 'pad'; mouseReclaim = 0; mouseHandoff = null; }\n  // COUCH: the hero's pointer wakes only on surfaces that block THE HERO'S\n  // hands (a guest's open bag must not flip P1 into menu mode); solo keeps\n  // the classic any-surface gate byte-identically.\n  // THE FOLIO (ui/folio.ts): reconcile the books to every dialog's own open\n  // flag — whatever path opened or closed it — and seat the thumb indexes.\n  ui.folioSync();\n  dialogue.setAvailable(renderer.npcDialogueAvailable());\n  dialogue.syncLayout(); // only the reader; serviceWorkspace owns service geometry\n  // THE MENU BAR (ui/menubar.ts): shown for a live run — never over the\n  // flow screens, never under the Mu hub's HUD veil.\n  // THE MENU BUTTON IS THE SHELL'S DOOR (2026-09-11, her ask): it stands\n  // whenever the game runs, HUD veil or not — in Mu the pages read SEALED\n  // (THE PANEL SEAL) and the pause page stays one click away, so the main\n  // menu never depends on a remembered keybind. The veil hides the run HUD\n  // cluster; this button was never part of it.\n  ui.menuBarSync(dt, running);\n  padPointer.update(dt,\n    (couchActive() ? ui.blockingFor(world.localSeat.id) : ui.uiBlocking()) || dialogue.choosing || !running, nowSec);\n  couchTick(dt, nowSec);\n  const lockPad = [...couchGuests.values()].find(g => g.pointer.active && g.gpad.isDown(settings.padBinds.itemLock));\n  const boundLockPad = settings.padBinds.itemLock !== PAD_CFG.pointer.confirm;\n  ui.itemLockInput(running && (input.keys.has(settings.keybinds.itemLock)\n    || (boundLockPad && (padPointer.active && pad.isDown(settings.padBinds.itemLock) || !!lockPad))),\n    lockPad?.pointer.position() ?? (padPointer.active ? padPointer.position() : undefined));\n  if (pad.justPressed(PAD_CFG.escapeButton)) synthEscape();\n\n  if (running) {\n    if (net.isHost) {\n      // ---- HOST (and single-player / local co-op): run the one real sim. ----\n      const perfSimT0 = performance.now();\n      phaseMark('head', perfSimT0 - tickT0); // input/pad/pointer/couch slab\n      // 1. Local UI (pause menu, panels) — never gameplay intent. The couch\n      //    guests' panel toggles ride their own pads right behind.\n      handleLocalPanels();\n      handleCouchPanels();\n      // Missing nearby native pages hold the whole simulation before input or\n      // AI can step. Rendering, menus and durable saves remain available.\n      const retained = nativeClientRuntimeFor(world);\n      if (world.gameOver || (retained ? retained.ready : world.nativeWorldReady())) {\n        // 2. Gather this frame's per-seat intent into the transport. The local seat\n        //    reads the OS; other LOCAL seats (the scripted ally) poll their source.\n        //    A REMOTE seat's intent arrives through the transport's own pump.\n        const li = readLocalInput(dt);\n        if (li) net.sendInput(net.self, li);\n        for (const seat of world.seats) {\n          if (seat.id === net.self) continue;\n          const intent = retained ? retained.pollSeat(seat, dt) : seat.input.poll(seat.actor, world, dt);\n          if (intent) net.sendInput(seat.id, intent);\n        }\n        if (retained) {\n          const result = retained.dispatch({ dt, wallSeconds: frameGapMs / 1000, inputs: net.drainInputs(),\n            actions: pendingActions.splice(0).map(({ seat, action, seq }) => ({ seatId: seat, action, seq })),\n            gearVacuum: settings.gearPickup !== 'key',\n          });\n          for (const dropped of result.droppedActions) console.warn('[coop] dropped malformed meta action', dropped.seatId, dropped.error);\n        } else {\n          // 3. Apply all seat intents (single path for every player-kind hero).\n          // THE TIME BUDGET runs on the wall: the seconds this frame's dt clamp cut off\n          // still passed for a remote client's hands (World.passInputTime; a local seat\n          // sends no dt, so nothing of single player reads it).\n          world.passInputTime(frameGapMs / 1000 - dt);\n          world.applyInputs(net.drainInputs(), dt);\n          // 3.5. Apply clients' META intents (point-spends, gem ops, drops) to their\n          //      OWN seats BEFORE the sim ticks — so the change lands in this tick's\n          //      drops/orbs pass and re-replicates in the same broadcast.\n          drainMetaActions();\n\n          // The deathPresentation keeps ambience alive, but the settled run must\n          // never gain a late AI kill, cast, or reward behind its epilogue.\n          if (!world.gameOver) for (const a of world.actors) updateAI(a, world, dt);\n          // Mirror the gear-pickup feel preference onto the sim (Settings is a\n          // UI concern the World can't import; a boolean crosses the seam).\n          world.gearVacuum = settings.gearPickup !== 'key';\n          world.update(dt);\n        }\n      } else {\n        net.drainInputs(); // do not replay accumulated movement/casts on recovery\n      }\n      // DWELL → MENU polls. The world keeps simulating under the pause menu,\n      // so a dwell can fire while it's up — HOLD the request (don't clear)\n      // until the pause menu closes, else a station menu pops OVER the pause\n      // screen and Escape starts fighting through stacked surprises.\n      // The Caravanner dwell (in TOWN) asks to open the band-travel menu.\n      pollCaravanMenu();\n      // The salvage-bench dwell asks to open the break/craft menu.\n      if (world.salvageDwellRequested && !ui.escapeMenuOpen) {\n        world.salvageDwellRequested = false;\n        if (!ui.salvageOpen) ui.showSalvage(world.salvageDwellSeatId);\n      }\n      // A Sacrificial Font dwell asks to open the Font screen (Merge /\n      // Convert / Reset — skill-mode trees M1).\n      if (world.fontDwellRequested && !ui.escapeMenuOpen) {\n        world.fontDwellRequested = false;\n        if (!ui.fontOpen) ui.showFont(world.fontDwellSeatId);\n      }\n      // A banked Ability point's popup, offered at the disciplined calm the\n      // world's own sweep found (never mid-combat).\n      if (world.treePopupRequested && !ui.escapeMenuOpen) {\n        world.treePopupRequested = false;\n        ui.showTreePopup(world.treePopupSeatId, world.treePopupSkillId);\n      }\n      // The HARBOR BOARD dwell (a port's notice board) asks to open the\n      // harbor menu — hearsay, passage down the lanes, charts. (The dock\n      // itself still casts off directly; the board is the harbor's EARS.)\n      if (world.harborDwellRequested && !ui.escapeMenuOpen) {\n        world.harborDwellRequested = false;\n        if (!ui.sailOpen) ui.showSail();\n      }\n      // THE BOUNTY BOARD dwell (Lastlight's posting board) asks to open the\n      // postings panel — the beat's slate, the taken hand, the turn-in.\n      if (world.bountyDwellRequested && !ui.escapeMenuOpen) {\n        world.bountyDwellRequested = false;\n        if (!ui.bountiesOpen) ui.showBounties(world.bountyDwellSeatId, world.bountyDwellBoardId);\n      }\n      // The MUSTER HORN dwell (a harborhold's gate post) asks to open the\n      // hold panel — the town's standing, the muster, the restoration.\n      if (world.holdDwellRequested && !ui.escapeMenuOpen) {\n        world.holdDwellRequested = false;\n        if (!ui.holdOpen) ui.showHold();\n      }\n      // The Oracle-stone dwell asks to open the communion menu.\n      if (world.oracleDwellRequested && !ui.escapeMenuOpen) {\n        world.oracleDwellRequested = false;\n        if (!ui.oracleOpen) ui.showOracle(world.oracleDwellSeatId);\n      }\n      // The Tracker's-fire dwell asks to open the Bestiary.\n      if (world.trackerDwellRequested && !ui.escapeMenuOpen) {\n        world.trackerDwellRequested = false;\n        if (!ui.bestiaryOpen) ui.showBestiary(world.trackerDwellSeatId);\n      }\n      // A stocked vendor counter's dwell asks to open the Vendor screen.\n      if (world.vendorDwellRequested && !ui.escapeMenuOpen) {\n        world.vendorDwellRequested = false;\n        if (!ui.vendorOpen) ui.showVendor(world.vendorDwellSeatId);\n      }\n      // The quartermaster dwell with FRESH vocation chains on offer asks to open\n      // the CHOICE menu (a subclass pick is deliberate — never auto-accepted).\n      if (world.vocationOfferRequested && !ui.escapeMenuOpen) {\n        world.vocationOfferRequested = false;\n        if (!ui.vocationOpen) ui.showVocationMenu();\n      }\n      if (world.questRewardRequested && !ui.escapeMenuOpen) {\n        world.questRewardRequested = false;\n        // The speaker owns local rewards in reader mode; bubble mode keeps its journal fallback.\n        if (DIALOGUE_CFG.presentation !== 'dialogue' || !conversationHasRewards(world)) ui.showQuestReward();\n      }\n      // The mercenary outpost's calm parley asks to open the hire/retire menu.\n      if (world.mercOutpostRequested && !ui.escapeMenuOpen) {\n        world.mercOutpostRequested = false;\n        if (!ui.mercOpen) ui.showMercMenu();\n      }\n      // A borough villager's arming dwell asks to open the arming panel.\n      if (world.boroughArmRequested && !ui.escapeMenuOpen) {\n        world.boroughArmRequested = false;\n        if (!ui.boroughOpen) ui.showBorough(world.boroughArmFolkId);\n      }\n      // The run wrote an ACCOUNT-scoped unlock (a vocation grant) — persist it\n      // now, so closing the game without dying can't lose it.\n      if (world.accountDirty) {\n        world.accountDirty = false;\n        saveAccount(account);\n      }\n      // THE STORY CARD (engine/scenes.ts): the DOM shows whatever card the\n      // scene director holds pending, and the continue ACKS back into the\n      // engine — the DOM is a window on engine state, never the state.\n      if (world.scene?.card && !ui.storyCardOpen()) {\n        ui.showStoryCard(world.scene.card, () => sceneCardAck(world));\n      } else if (!world.scene?.card && ui.storyCardOpen()) {\n        ui.hideStoryCard();\n      }\n      // THE MU HUB (data/mu.ts): a still linger at an awake vessel posts a\n      // class request — take it only when the card can actually open (the\n      // pause menu's hold law), and let the pick start the run proper.\n      if (!ui.escapeMenuOpen && !ui.muCardOpen) {\n        const muReq = muTakeClassRequest(world);\n        // THE OFFERED CONTRACT (engine/muDeal.ts): the card opens pre-sworn\n        // to whatever contract the waking rolled onto this vessel (muOfferOf\n        // — the same seated row whose red ember the body wears), or plain.\n        if (muReq) ui.showMuClassCard(muReq, startPicked, muOfferOf(world, muReq));\n      }\n      // Dwelling by the return-Caravanner IN THE WILDS ports straight home — no menu.\n      pollCaravanReturn();\n      // (The dock dwell now CASTS OFF into the sailing mode directly — handled\n      // inside world.updateSail; the Sail menu panel stays dormant.)\n      // (The Holdfast toll pays directly on the keeper dwell — an essence price\n      // needs no bargain menu; the prompt over the keeper advertises the ask.)\n      feedRendererAim();\n      const perfRenT0 = performance.now();\n      renderer.render(world);\n      perfPush(frameGapMs, perfRenT0 - perfSimT0, performance.now() - perfRenT0);\n      const perfTailT0 = performance.now(); // PHASE LEDGER: the tail starts here\n\n      // Broadcast to connected clients. Gated on a REAL wire (never LocalTransport),\n      // so single-player AND local co-op (a stand-in ally is a LocalTransport peer)\n      // never serialize anything — byte-identical SP / no wasted work.\n      if (!(net instanceof LocalTransport) && net.peers().length > 1) {\n        // Terrain: ship the (heavier) zone message ONCE per zone change.\n        if (!nativeClientRuntimeFor(world) && world.zone.id !== lastSentZone) {\n          lastSentZone = world.zone.id;\n          net.sendZone(serializeZone(world));\n        }\n        // META HEARTBEAT: seatMeta is delta-replicated (shipped once per change,\n        // then cleared). If that one snapshot is ever dropped — a congested\n        // channel skipped by fanOut, or coalesced past on the client — the delta\n        // is lost with no retry. Periodically re-dirty every seat so any missed\n        // build change self-heals within META_HEARTBEAT seconds.\n        metaHeartbeat -= dt;\n        if (metaHeartbeat <= 0) {\n          metaHeartbeat = META_HEARTBEAT;\n          for (const s of world.seats) world.markMetaDirty(s);\n        }\n        // State: the per-tick render snapshot at the fixed wire rate.\n        stateTimer -= dt;\n        if (stateTimer <= 0) {\n          stateTimer = 1 / STATE_HZ;\n          broadcastSnapshot();\n        }\n      }\n\n      hostTail(dt);\n      phasePendTail = performance.now() - perfTailT0; // flushes at the NEXT tick's fold\n    } else {\n      // ---- CLIENT: run NO sim. Send local input, render the host's snapshot. ----\n      handleLocalPanels();\n      const li = readLocalInput(dt);\n      // Stamp + buffer the input for prediction, THEN send it (THE SMOOTH SHELL: the seq and\n      // dt of THE HONEST INPUT, THE WATCHDOG's still walk, THE PREDICTED ROOT's press). The\n      // host echoes the last-applied seq; the shell replays everything newer locally.\n      if (li) net.sendInput(net.self, shell.stampInput(li, dt, performance.now()));\n      clientApplyAndRender(dt);\n    }\n  }\n\n  input.endFrame();\n  pad.endFrame();\n}\n\n/** The 20s autosave beat, deferred into genuine idle slack when the runtime\n *  offers it (requestIdleCallback — always, on the Chromium we ship). hostTail\n *  runs AFTER perfPush, so work here lands in the NEXT frame's rAF gap,\n *  invisible to the sim/render brackets — the beat's serialize+write block\n *  (~7ms at a 415-zone chart, growing with the world) was a standing\n *  once-per-20s hitch by position. The deferral changes WHEN the snapshot is\n *  captured (a few idle ms later, timeout-capped), never what is written: the\n *  callback serializes synchronously through the same persistRun writer, and\n *  re-checks the beat's own preconditions plus run identity so a menu exit,\n *  death, or fresh run between schedule and fire is never clobbered by a\n *  stale capture (their own deliberate writes have landed by then — and a\n *  post-wipe resurrection is exactly what the gameOver guard refuses).\n *  Runtimes without rIC keep the synchronous beat byte-for-byte; probes and\n *  the sim harness drive persistRun directly and never see this seam. */\nlet idleSavePending = false;\nfunction idleAutosave(): void {\n  if (typeof window.requestIdleCallback !== 'function') {\n    persistRun(account, world);\n    persistCouchGuests();\n    return;\n  }\n  if (idleSavePending) return;\n  idleSavePending = true;\n  const w = world;\n  window.requestIdleCallback(() => {\n    idleSavePending = false;\n    if (!running || world !== w || world.gameOver || world.scene) return;\n    persistRun(account, world);\n    persistCouchGuests();\n  }, { timeout: 500 });\n}\n\n/** Host-only end-of-frame work: live panels, autosave, and the permadeath/death\n *  screen flow. NONE of this runs on a client (no character to save/wipe). */\nfunction hostTail(dt: number): void {\n  // The pendingDeathScreen owns presentation after the epilogue is booked.\n  // The body timeline reveals it over the dispersing shards; other endings\n  // retain their dark crossing. Starters also clear this pending callback.\n  if (pendingDeathScreen && world.gameOver) {\n    if (world.deathPresentation) {\n      const pose = deathPresentationPose(world.deathPresentation.elapsed);\n      world.screenFade = pose.fade;\n      if (pose.reveal && !pendingDeathScreen.opened) {\n        pendingDeathScreen.opened = true;\n        pendingDeathScreen.open(DEATH_PRESENTATION.revealSec);\n      }\n      if (pose.complete) { pendingDeathScreen = null; running = false; }\n      return;\n    }\n    world.screenFade = Math.min(1, world.screenFade + dt / RUN_END_FADE.outSec);\n    if (world.screenFade >= 1) {\n      const open = pendingDeathScreen.open;\n      pendingDeathScreen = null;\n      open();\n      running = false;\n    }\n    return;\n  }\n  // Keep open panels live (resource/stat values move constantly).\n  uiRefreshTimer -= dt;\n  if (uiRefreshTimer <= 0) {\n    uiRefreshTimer = 0.5;\n    ui.refreshCharSheet();\n    ui.refreshInventory(true);\n    ui.refreshMap();\n  }\n\n  // Autosave the in-progress character periodically (cheap; survives a crash\n  // or an abrupt close). Skipped once dead (the run save is wiped on death).\n  // persistRun routes the write to the character's slot (run vs roster vessel)\n  // and keeps the roster index card fresh alongside it.\n  // …and never while a SCENE plays (engine/scenes.ts): the tutorial is not\n  // a run — its ground never serializes and its abort must leave no save.\n  // The run's first write lands at the scene's 'home' stage via charDirty.\n  if (!world.gameOver && !world.scene) {\n    autosaveTimer -= dt;\n    if (autosaveTimer <= 0) { autosaveTimer = 20; idleAutosave(); }\n  }\n\n  // The sim mutated character save-state OUTSIDE the autosave cadence — a mode\n  // respawn banked a death (corpse/stage/strip), an own-ring corpse was\n  // reclaimed. Persist immediately: the same promptness accountDirty gets.\n  if (world.charDirty) {\n    world.charDirty = false;\n    persistRun(account, world);\n  }\n  // A couch guest's vessel banked something (the guest covenant on a wipe,\n  // a meta mutation) — persist it with charDirty's promptness.\n  if (world.couchDirty) {\n    world.couchDirty = false;\n    persistCouchGuests();\n  }\n\n  // A roster-saved character chose Save & Main Menu (their \"End Run\" — the\n  // vessel persists; only a deliberate roster deletion ever discards it).\n  if (world.menuExitRequested) {\n    world.menuExitRequested = false;\n    // A mid-scene exit is an ABANDON, not a save-and-quit: nothing persists,\n    // and the next New Game re-launches the scene from its first card.\n    if (!world.scene) { persistRun(account, world); persistCouchGuests(); }\n    toStartMenu();\n    return;\n  }\n\n  if (world.gameOver && !deathShown) {\n    cancelCharacterResume();\n    deathShown = true;\n    // CO-OP: tell connected clients the run ended so they leave their (now-frozen)\n    // render shell and offer a fresh class pick — no reload, the session lives on.\n    if (coopActive()) net.sendSession({ t: 'runEnd' });\n    // COUCH: guest vessels ride home before the world is torn down (mortal-\n    // lane guests carry nothing); the session machinery drops with the run.\n    persistCouchGuests();\n    couchReset();\n    ui.hideAll();\n    // THE RECKONING MINT: the run's carried essence — the local hero plus\n    // every couch vessel (one account, one harvest; mercs and remote guests\n    // never fold) — appraised WHOLE at the strict mortal exchange\n    // (data/essences.ts mortalWorth) × the dying stage's payout rate.\n    // Nothing is scored for distance any more: what the run still HOLDS is\n    // what the reckoning mints, and what it spent along the way was the\n    // price of getting there. Read before the wipe below; the wallets die\n    // with the run either way.\n    const stage = world.modeStageDef();\n    // THE FALL (runEndReason 'fall' — the resurrection covenant): the wallet\n    // was already stripped by the in-world banking, so the epilogue reads\n    // the appraisal beginModeFall stashed PRE-strip (rows honest, minted at\n    // the stage's own rate) instead of re-reckoning empty seats.\n    const fell = world.runEndReason === 'fall' && !!world.fallReckoning;\n    const reck = fell ? world.fallReckoning! : world.reckonRunEssence();\n    applyCredits(account, reck.minted);\n    // THE CHRONICLE: every meta-progressing conclusion is a row on the\n    // account's own leaderboard — the mint on one axis, the journey score\n    // (renownForRun — the old distance formula, kept as pure renown) on the\n    // other. A sealed stage's conclusion stays off the board exactly as it\n    // stays out of the ledger.\n    const renown = renownForRun(world.player.level, world.visited.size, world.kills);\n    let record: RunRecord | null = null;\n    if (stage.metaProgression) {\n      record = {\n        schema: RUN_RECORD_SCHEMA, at: Date.now(),\n        name: world.meta.name, classId: world.meta.classDef.id, level: world.player.level,\n        zones: world.visited.size, kills: world.kills,\n        reason: world.runEndReason, essence: reck.minted, renown,\n      };\n      recordRun(account, record);\n    }\n    // PERMANENT progression: fold this run's trigger counters (crowned_killed,\n    // …) into the account ledger so package unlocks stick like credits do —\n    // unless the dying stage is sealed outside the account loop (mode policy).\n    if (stage.metaProgression) mergeLedger(account.ledger, world.ledger);\n    // THE OBJECTIVE WEB's belt: the live sweep claims mid-run, but a deed\n    // whose last count merged only now (a play milestone stamped this run)\n    // lands here — before the reckoning's Vault renders it Owned.\n    if (stage.metaProgression) settleClassUnlocks(account);\n    // CORPSE RUN + the lifetime death tally: only an actual death (not a\n    // forfeit) records a corpse or counts toward death-gated unlocks — both\n    // captured BEFORE clearCharacter wipes the gems. A FALL already banked\n    // its corpse in-world (beginModeFall — pre-strip, own ring); only the\n    // tally arm applies here, stage-honest (moot for the sealed Undying).\n    if (world.runEndReason === 'death') {\n      world.recordDeath();\n      if (stage.countsAccountDeath) bumpLedger(account.ledger, LEDGER_ACCOUNT_DEATHS);\n    } else if (world.runEndReason === 'fall' && stage.countsAccountDeath) {\n      bumpLedger(account.ledger, LEDGER_ACCOUNT_DEATHS);\n    }\n    // ANY conclusion — death, forfeit, retirement — ends the merc contract:\n    // the veteran returns to the pool, waiting on some future outpost.\n    releaseMercsOf(account, world.meta.charId);\n    // Durable write (sendBeacon) so the death record survives a tab-close on\n    // the death screen, matching clearCharacter's durable wipe.\n    saveAccountDurable(account);\n    // THE VESSEL KEEPS (roster-saved modes): a fall ends the run but never\n    // the character — persist the sanctuary-standing vessel to its OWN slot\n    // (the fallen card beside it) and leave the shared Continue slot alone:\n    // it belongs to whatever mortal run is suspended there. Mortal\n    // conclusions keep the historical wipe.\n    if (modeById(world.meta.modeId).save === 'roster') {\n      persistRun(account, world);\n    } else {\n      clearCharacter();\n      ui.setContinueSave(null); // the run is wiped — no Continue after death\n    }\n    ui.resetClassRoster();      // the next run deals a fresh class hand\n    // THE RUN'S EPILOGUE: the death screen reads the appraisal, then leads\n    // STRAIGHT into the reckoning (the Vault as the run's closing prompt) —\n    // the seal there is what finally lands on the main menu. Co-op host\n    // KEEPS the live session (onDeathDismiss re-seats clients in the next\n    // run); single-player resets the transport back to local.\n    const openDeath = (revealSec = 0): void => ui.showDeath({\n      rows: reck.rows, carried: reck.carried, mult: reck.mult, minted: reck.minted,\n      renown, standing: record ? runStanding(account, record) : null,\n      ...(fell ? { zoneName: world.fallReckoning!.zoneName } : {}),\n    }, onDeathDismiss, revealSec);\n    if (coopActive() || world.runEndReason === 'forfeit') {\n      // Immediate lanes: a menu act owes no theater, and a shared session's\n      // clients are already being re-seated.\n      openDeath();\n      // PAUSE the host loop — the run is over, so it must stop ticking +\n      // broadcasting the dead world. startGame / startAsClient re-enable it.\n      running = false;\n    } else {\n      // The pendingDeathScreen is presentation only: everything above is\n      // already durable before the body performance or legacy dark crossing.\n      if (world.runEndReason === 'death' && !world.deathPresentation) {\n        openDeath(); // deathPresentation's disabled switch\n        running = false;\n      } else {\n        world.screenFade = world.deathPresentation ? 0 : Math.max(world.screenFade, 0.001);\n        pendingDeathScreen = { open: openDeath };\n      }\n    }\n  }\n}\n\n/** Reset delivery history when a peer receives a fresh render shell. */\nfunction resetHostedPublication(): void {\n  const runtime = nativeClientRuntimeFor(world);\n  if (runtime) hostedPublications.delete(runtime);\n}\n\n/** Each native recipient sees its actual area; the campaign writer stays put. */\nfunction publishHostedSnapshot(): boolean {\n  const runtime = nativeClientRuntimeFor(world);\n  if (!runtime) return false;\n  if (!runtime.ready) throw new Error('Native hosted publication needs a ready client runtime');\n  let cached = hostedPublications.get(runtime);\n  if (!cached || cached.transport !== net) {\n    cached = { transport: net, publication: new NativeHostedPublication(runtime.hosted, net) };\n    hostedPublications.set(runtime, cached);\n  }\n  const recipients = new Set(net.peers().filter(peer => !peer.isHost && peer.id !== net.self).map(peer => peer.id));\n  cached.publication.publish(++snapTick, world.seats.filter(seat => recipients.has(seat.id)));\n  return true;\n}\n\n/** Host: serialize actual recipient areas, or the original non-retained world. */\nfunction broadcastSnapshot(): void {\n  if (publishHostedSnapshot()) return;\n  net.sendState(serializeSnapshot(world, ++snapTick));\n  // Per-seat META rides the snapshot only when its dirty flag is set; once a\n  // snapshot carries it, the change is on the wire — clear so we don't re-ship it.\n  world.metaDirty.clear();\n}\n\n/** Client: place the host's adopted snapshots and draw (no sim runs here; the host owns\n *  the simulation). THE SMOOTH SHELL (net/shell.ts) does the frame's whole half: the own\n *  clocks run down, remote bodies glide on THE JITTER BUFFER's delayed clock, flights and\n *  telegraphs on the newest pair, the own seat's note and surge, and the own hero PREDICTED\n *  (anchored to the host's ack, every unacked input replayed, corrections glided out).\n *  Each snapshot was adopted once, when it arrived (subscribeToHost). */\nfunction clientApplyAndRender(dt: number): void {\n  const now = performance.now();\n  shell.frame(dt, now);\n  // THE WATCHDOG: a silent link strains the frame; past its patience THE RETURN begins.\n  renderer.linkStrain = shell.strain(now);\n  if (shell.phase(now) === 'lost') startReturn();\n  clientDeathBeat(dt); // THE ACTING SEAT: the death beat's presentation (hosted worlds)\n  // THE WILDS ON THE WIRE: stream the ground around our own hero every frame.\n  if (clientWilds && wildsShellActive(world)) wildsShellStream(world, world.player.pos);\n  // Our replicated build changed (point spend, learn, drop, level-up) → re-render\n  // any OPEN build panels now (they're not live like the HUD). refresh* methods\n  // no-op when their panel is closed, so this is cheap.\n  if (clientMetaDirty) {\n    clientMetaDirty = false;\n    ui.refreshCharSheet(); ui.refreshInventory(true); ui.refreshSkillTree(); ui.refreshTree();\n  }\n  // Resource/stat values on the char sheet + map drift every frame even with no\n  // meta change — keep them live on the same 0.5s throttle the host uses.\n  uiRefreshTimer -= dt;\n  if (uiRefreshTimer <= 0) { uiRefreshTimer = 0.5; ui.refreshCharSheet(); ui.refreshInventory(true); ui.refreshMap(); }\n  // THE CLIENT'S CARAVANNER: a render shell runs no sim, so the engine's dwell\n  // gates never tick here — drive the ONE whose answer is a pure INTENT the host\n  // performs (the escort is a client's only road between level bands, and the\n  // return-Caravanner its only way home). Positions are this frame's, applied\n  // just above, and the dwell clock is honest by construction: prediction\n  // replays our own moves through moveActor, which stamps the seat exactly as\n  // the host's own hands do — walking past still never pops the menu.\n  world.updateCaravan(dt);\n  pollCaravanMenu();\n  pollCaravanReturn();\n  pollClientCounters(dt); // THE CLIENT'S COUNTERS: the bench, the board, the Font, the Tracker, the Oracle, the counters\n  feedRendererAim();\n  renderer.render(world);\n}\n\n/** THE CLIENT'S COUNTERS (docs/engine/shard.md, THE COUNTERS AND THE JOURNAL): a hosted world's\n *  render shell lingers at its own stations the way it lingers at the Caravanner, and opens the\n *  same panels the host's own loop opens; every act inside them is a host-judged request. A\n *  reward waiting in its journal row opens the journal, as the host's dwell asks. */\nfunction pollClientCounters(dt: number): void {\n  world.updateClientCounters(dt);\n  if (ui.escapeMenuOpen) return;\n  if (world.salvageDwellRequested) { world.salvageDwellRequested = false; if (!ui.salvageOpen) ui.showSalvage(world.salvageDwellSeatId); }\n  if (world.fontDwellRequested) { world.fontDwellRequested = false; if (!ui.fontOpen) ui.showFont(world.fontDwellSeatId); }\n  if (world.bountyDwellRequested) { world.bountyDwellRequested = false; if (!ui.bountiesOpen) ui.showBounties(world.bountyDwellSeatId, world.bountyDwellBoardId); }\n  if (world.oracleDwellRequested) { world.oracleDwellRequested = false; if (!ui.oracleOpen) ui.showOracle(world.oracleDwellSeatId); }\n  if (world.trackerDwellRequested) { world.trackerDwellRequested = false; if (!ui.bestiaryOpen) ui.showBestiary(world.trackerDwellSeatId); }\n  if (world.vendorDwellRequested) { world.vendorDwellRequested = false; if (!ui.vendorOpen) ui.showVendor(world.vendorDwellSeatId); }\n  if (world.questRewardRequested) {\n    world.questRewardRequested = false;\n    if (DIALOGUE_CFG.presentation !== 'dialogue' || !conversationHasRewards(world)) ui.showQuestReward();\n  }\n}\n\n/** Client: start applying the host's broadcasts (set up at join, torn down on Leave).\n *  THE SMOOTH SHELL: each snapshot is ADOPTED once, on arrival (the shell's arrive: the\n *  ring, the render clock's line, the echo, the state); a frame only places it. */\nfunction subscribeToHost(): void {\n  snapshotDispose = net.onState(s => {\n    const { metaApplied } = shell.arrive(s, performance.now());\n    crossingSnapshot(s); // THE ONE CROSSING: the first snapshot holding the hero in its zone\n    // Re-render the open build panels ONLY when our meta actually CHANGED — not on\n    // the periodic heartbeat re-send of identical meta (which would churn the panel\n    // and reset any scroll). Compare the serialized own-seat meta to the last one.\n    const myMeta = metaApplied ? s.seatMeta?.[world.clientSeatId] : undefined;\n    if (myMeta) {\n      const json = JSON.stringify(myMeta);\n      if (json !== lastMetaJson) { lastMetaJson = json; clientMetaDirty = true; }\n    }\n  });\n  // THE ONE CROSSING: a zone message that beats the shell's standing waits for it (connectToShard\n  // paints the cover first), then lands in startAsClient.\n  zoneDispose = net.onZone(z => { if (shellRising && shellRising === net) crossingZoneHeld = z; else clientZone(z); });\n}\n/** Client: the host's zone message on the shell (the wilds shell's routing, else the classic\n *  one), and THE ONE CROSSING's word on it: a new zone on a live shell is a hand-off. */\nfunction clientZone(z: ZoneMsg): void {\n  const shown = world.appliedZoneId;\n  const surface = clientWilds ? wildsShellZone(world, z, clientWilds.seed) : (applyZone(world, z), false);\n  if (net instanceof WsTransport) { crossing.zoneMsg(z.zoneId, surface, shown, performance.now()); crossingCover(); }\n}\n\n/** THE ONE CROSSING (net/crossing.ts, docs/engine/shard.md): one cover over a hosted world's\n *  arrival (a server-bound wake, a direct join, a reload's return) and its hand-offs (a pocket\n *  and back), mirrored onto the Mu crossing until the hero stands on streamed ground. */\nconst crossing = new ShardCrossing();\n/** The screen the crossing shows: a wake's own entry cover, adopted, else its own. */\nlet crossingLease: LoadingLease | null = null;\n/** withLoadingScreen's cover while startGame runs (a server-bound wake adopts it). */\nlet wakeLease: LoadingLease | null = null;\n/** The transport whose shell is still rising (welcomed, startAsClient not yet run) and a\n *  zone message that landed meanwhile (applied the moment the shell stands). */\nlet shellRising: WsTransport | null = null;\nlet crossingZoneHeld: ZoneMsg | null = null;\nconst CROSSING_CANCELLED = 'the crossing was cancelled';\nfunction crossingCancelled(e: unknown): boolean { return e instanceof Error && e.message === CROSSING_CANCELLED; }\n/** Mirror the crossing's view onto the loading screen (begin, update or finish its lease). */\nfunction crossingCover(): void {\n  const v = crossing.view(performance.now());\n  if (!v.covered) { crossingLease?.finish(); crossingLease = null; return; }\n  if (!v.shown) return; // a hand-off's grace: the last frame stands\n  const status = { label: v.label, ...(v.detail ? { detail: v.detail } : {}),\n    ...(v.total ? { completed: v.completed, total: v.total } : {}) }; // the ring's pages: measured, never faked\n  if (crossingLease?.current) crossingLease.update(status);\n  else crossingLease = loadingScreen.begin({ kind: v.kind, ...status, loadout: account.cosmetics.loadout, cancel: cancelLoadingToMenu });\n}\nfunction crossingWake(): void {\n  crossing.wake(performance.now());\n  if (wakeLease?.current) crossingLease = wakeLease;\n  crossingCover();\n}\nfunction crossingEnd(): void {\n  crossing.end(); shellRising = null; crossingZoneHeld = null;\n  crossingCover();\n}\n/** The first snapshot holding our hero in the crossing's zone moves it on. */\nfunction crossingSnapshot(s: StateSnapshot): void {\n  if (crossing.covered && shell.world === world && net instanceof WsTransport) {\n    crossing.snapshot(s.zoneId, !!s.seats[world.clientSeatId]);\n    crossingCover();\n  }\n}\n/** One held frame: the shell places the hero where the shard has it and streams the ground\n *  around it, and the page ring may release the cover. */\nfunction crossingFrame(dt: number): void {\n  if (running && shell.world === world && net instanceof WsTransport) {\n    shell.frame(dt, performance.now());\n    if (clientWilds && wildsShellActive(world)) wildsShellStream(world, world.player.pos);\n    if (crossing.phase === 'ring') { const r = wildsShellRing(world); crossing.ring(r.ready, r.pending, r.total); }\n  }\n  crossingCover();\n}\n/** Client: stop applying broadcasts. */\nfunction unsubscribeFromHost(): void {\n  if (snapshotDispose) { snapshotDispose(); snapshotDispose = null; }\n  if (zoneDispose) { zoneDispose(); zoneDispose = null; }\n  shell.reset(); lastMetaJson = ''; // THE SMOOTH SHELL: the session's timeline goes with it\n  crossingEnd(); // THE ONE CROSSING: and its cover\n}\n\n/** HOST: a peer joined — spawn a wire-fed seat for them (their class, a\n *  RemoteInput drained from the transport). Idempotent on the seat id. */\nfunction onRemoteJoin(peer: PeerInfo): void {\n  resetHostedPublication();\n  if (world.seats.some(s => s.id === peer.id)) return;\n  // A peer arriving ends any solo menu-pause mid-hold: the shared world is\n  // never one player's to stop (the allowHold policy refuses NEW holds in\n  // co-op; this sweeps one already standing when the session became live).\n  world.timeflow.releaseKind('menu');\n  const cls = CLASSES.find(c => c.id === peer.classId) ?? CLASSES[0];\n  const cosmeticSeat = world.addSeat(peer.id, cls, new RemoteInput(peer.id));\n  cosmeticSeat.actor.cosmeticLoadout = sanitizeCosmeticLoadout(peer.cosmeticLoadout);\n  // The joiner needs its actual area before state; existing split peers keep theirs.\n  if (!publishHostedSnapshot()) net.sendZone(serializeZone(world));\n}\n\n/** HOST: a peer left — despawn their seat (and its minions). */\nfunction onRemoteLeave(id: string): void {\n  world.removeSeat(id);\n}\n\n/** Wire the run-lifecycle channel onto the current (WebRTC) transport — done once\n *  when a co-op session is established (host or client); torn down on leave. */\nfunction wireSession(): void {\n  sessionDispose?.();\n  sessionDispose = net.onSession(onSessionMsg);\n  // The OTHER road to the same ending: a host that vanishes without a goodbye.\n  // Wired for host and client alike (a host's transport never fires it) so the\n  // two subscriptions live and die together.\n  hostLostDispose?.();\n  // THE RETURN (THE SMOOTH SHELL): a hosted world's lost socket is reconnected in place first;\n  // only a return that fails lands on the start menu, with the same one word.\n  hostLostDispose = net.onHostLost(() => { if (net instanceof WsTransport) startReturn(); else onHostGone(HOST_LOST_WORD); });\n}\n\n/** The one word a lost session leaves on the start menu. */\nconst HOST_LOST_WORD = 'Connection to the host was lost.';\n/** THE RETURN in flight (one at a time). */\nlet returning = false;\n/** THE RETURN (THE SMOOTH SHELL, docs/engine/shard.md): the socket under a hosted world\n *  closed, or THE WATCHDOG lost patience with a silent one. Reconnect IN PLACE with THE\n *  RECONNECT TOKEN (WsTransport.resumeInPlace), the shell standing and straining meanwhile,\n *  retrying until the dormant window closes; only then the start menu, with the one word. */\nfunction startReturn(): void {\n  if (returning || !(net instanceof WsTransport)) return;\n  // THE RETURN'S WORD (W7): a hosted world's menu line names the world and carries the shard's own word.\n  const place = lastShardWorld ?? 'the world';\n  if (!running) { onHostGone(returnWord(place, '')); return; } // no shell to keep: the old road\n  const ws = net;\n  const deadline = performance.now() + WS_TRANSPORT_CFG.resumeWindowMs - Math.max(0, performance.now() - shell.lastArrivalMs);\n  returning = true;\n  void (async () => {\n    let word = '';\n    try {\n      for (let tries = 0; net === ws; tries++) {\n        const r = await ws.resumeInPlace();\n        if (net !== ws) return; // the player left meanwhile\n        if (r.ok) { shell.resumed(performance.now()); return; } // the same seat: the shell never left\n        word = r.word;\n        if (r.final || performance.now() >= deadline) break;\n        await new Promise(res => setTimeout(res, Math.min(2000, 250 * 2 ** tries)));\n      }\n      if (net !== ws) return;\n      // THE BUILD MISMATCH on a served page: the world was updated under us; the page reloads once.\n      if (lastShardUrl && reloadForBuild(lastShardUrl, new Error(word))) return;\n      onHostGone(returnWord(place, word)); // THE DOOR stays: the menu offers the way back\n    } finally { returning = false; }\n  })();\n}\n\n/** Dispatch a run-lifecycle message. HOST handles `rejoin`; CLIENT handles\n *  `runEnd` + `newRun`. */\nfunction onSessionMsg(msg: SessionMsg, from: string): void {\n  if (net.isHost) {\n    if (msg.t === 'rejoin') {\n      // A client chose its class for the next run. Seat them now if we're already\n      // mid-run, else queue until our new run begins (flushRejoins).\n      if (running && !world.gameOver) reseatPeer(from, msg.classId);\n      else pendingRejoins.set(from, msg.classId);\n    } else if (msg.t === 'cosmetics') {\n      const cosmeticLoadout = sanitizeCosmeticLoadout(msg.loadout);\n      const peer = net.peers().find(p => p.id === from);\n      if (peer) peer.cosmeticLoadout = cosmeticLoadout;\n      const seat = world.seats.find(s => s.id === from);\n      if (seat) (seat.home ?? seat.actor).cosmeticLoadout = cosmeticLoadout;\n    } else if (msg.t === 'action') {\n      // A client's meta intent for its OWN seat — queue for this frame's drain\n      // (applyAction runs host-side with the channel-bound `from` seat, so a\n      // client can only ever mutate its own build).\n      pendingActions.push({ seat: from, action: msg.action, seq: msg.seq }); // THE ECHO LAW: the client's seq rides along\n    }\n  } else if (msg.t === 'runEnd') {\n    onClientRunEnd();\n  } else if (msg.t === 'refused') {\n    onClientRefused(typeof msg.word === 'string' ? msg.word : '', msg.mu === true); // THE ACTING SEAT: a refused hero\n  } else if (msg.t === 'partyInvite') {\n    // THE PARTY: an invitation lands (one standing per inviter); THE PARTY THAT READS: it stands\n    // until its `until` (the shard's clock), wearing the Party pip and the beckon over the inviter.\n    PARTY_INBOX.land(msg, world.time);\n  } else if (msg.t === 'partyWord') {\n    partyWord = msg.word; // THE PARTY: the shard's one-line refusal, shown on the panel\n  } else if (msg.t === 'newRun') {\n    onClientNewRun(msg.seat, msg.seed);\n  } else if (msg.t === 'hostLeft') {\n    onHostGone('The host left the session.');\n  }\n}\n\n/** HOST: apply this frame's queued client meta intents to their OWN seats. A seat\n *  that has since left is simply skipped. applyAction validates + re-replicates. */\nfunction drainMetaActions(): void {\n  if (!pendingActions.length) return;\n  for (const { seat: seatId, action, seq } of pendingActions) {\n    const seat = world.seats.find(s => s.id === seatId);\n    if (!seat) continue;\n    // A client controls the action payload entirely — a malformed/hostile one\n    // (bad index, prototype-chain key) must NEVER throw out of the frame loop\n    // (that would permanently halt the host sim + freeze every client). One bad\n    // action just no-ops. world.applyAction also validates before dispatch.\n    noteActionEcho(world, seat, seq); // THE ECHO LAW: judged this tick (applied or refused), echoed on its build\n    try { world.applyAction(seat, action); }\n    catch (e) { console.warn('[coop] dropped malformed meta action', action, e); }\n  }\n  pendingActions.length = 0;\n}\n\n/** HOST: (re)seat an already-connected peer into the CURRENT run and tell them to\n *  spin up their render shell for it (`newRun`) + ship the terrain. */\nfunction reseatPeer(peerId: string, classId: string): void {\n  resetHostedPublication();\n  const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];\n  if (!world.seats.some(s => s.id === peerId)) {\n    const cosmeticSeat = world.addSeat(peerId, cls, new RemoteInput(peerId));\n    cosmeticSeat.actor.cosmeticLoadout = sanitizeCosmeticLoadout(net.peers().find(p => p.id === peerId)?.cosmeticLoadout);\n  }\n  // THE SEED THREAD: newRun carries the seed of the run we are seating them\n  // INTO — deliberately not the one their welcome carried. This is our NEXT run\n  // with a freshly rolled manifest, so a client re-using the join-time seed\n  // would build the PREVIOUS run's map; the seed rides every seating message.\n  net.sendSession({ t: 'newRun', seat: peerId, seed: world.manifest.seed }, peerId);\n  if (!publishHostedSnapshot()) net.sendZone(serializeZone(world));\n}\n\n/** HOST: after a fresh co-op run begins, seat every peer that already picked a\n *  class at the run-end screen (queued while the host was choosing its own). */\nfunction flushRejoins(): void {\n  for (const [peerId, classId] of pendingRejoins) reseatPeer(peerId, classId);\n  pendingRejoins.clear();\n}\n\n/** CLIENT: the host's run ended — leave the (now-stale) render shell and offer a\n *  fresh class pick; choosing one asks the host to re-seat us in its next run. */\nfunction onClientRunEnd(): void {\n  // THE ACTING SEAT (the death beat): a hosted world's fall plays its presentation\n  // from the first dead frame; the rendering runs on, frozen, until it completes.\n  const presenting = net instanceof WsTransport && !!world.deathPresentation;\n  if (!presenting) running = false; // stop rendering the dead run\n  unsubscribeFromHost();    // drop the dead run's snapshot/zone subs + stale interp state\n  pendingRejoinClass = null;\n  // THE LOGIN THROUGH MU (card 22): on a hosted world a fallen player reads the\n  // reckoning, then drifts back into Mu bound for the same server — the next vessel\n  // is a walk, and its wake travels. (Card 14 C: the fall is the run's end.)\n  if (net instanceof WsTransport) {\n    const url = lastShardUrl, name = lastShardWorld;\n    const toMu = (): void => { resetToLocal(); if (url) writeDoor({ url, ...(name ? { world: name } : {}) }); startMu(); }; // THE DOOR stays bound\n    const fell = shardVessel?.takeDeath(net, world);\n    const open = (revealSec = 0): void => { if (fell) ui.showDeath(fell.reck, toMu, revealSec); else toMu(); };\n    if (presenting) clientDeath = { open, opened: false }; // clientDeathBeat opens it at the presentation's reveal\n    else open();\n    return;\n  }\n  ui.resetClassRoster();    // deal a fresh class hand for the rejoin pick\n  const pickNextHero = (): void => ui.showClassSelect(cls => {\n    pendingRejoinClass = cls;\n    net.sendSession({ t: 'rejoin', classId: cls.id });\n    ui.hideAll();           // the class pick is sent; wait for the host's newRun\n  });\n  // THE DEATH COVENANT (THE SHARD — shardVessel): a vessel that fell on a\n  // hosted world reads its reckoning first (the death screen, the Vault),\n  // then picks the next hero; its body waits where it fell.\n  const fell = shardVessel?.takeDeath(net, world);\n  if (fell) ui.showDeath(fell.reck, pickNextHero); else pickNextHero();\n}\n\n/** THE IMMORTAL'S COVENANT ON A SHARD (card 30): presentation only, the shard decided and\n *  banked everything (and the link booked its word). THE CROSSING (a `stageDeath` word, then our\n *  body dead on the wire) plays the solo fade: the dark falls at the mode's own pace while the\n *  body lies dead, goes whole the frame the wake lands (our hero standing again, at the hearth,\n *  so the move is never seen), holds, then lifts. THE FALL (an Undying's body dead) plays the\n *  solo fall's dark, never the mortal's shatter; `runEnd` opens the screen over it. A crossing\n *  word with no death on screen (a late word at a join) is booked and never shown. True while it\n *  owns the frame. */\nconst COVENANT_FADE_CFG = {\n  /** A crossing word this old with no death on screen is a late word: booked, never shown (ms). */\n  staleMs: 3000,\n};\nlet clientCovenant: { kind: 'cross' | 'fall'; t: number; woke: number | null; fx: { fadeOutSec: number; holdSec: number; fadeInSec: number } } | null = null;\nfunction clientCovenantBeat(dt: number): boolean {\n  if (!(net instanceof WsTransport) || !shardVessel || shardVessel.net !== net) return false;\n  const me = shell.latest?.seats[world.clientSeatId];\n  const dead = !!me?.dead && world.player.dead;\n  if (!clientCovenant) {\n    const pending = shardVessel.crossingPending();\n    if (pending && dead) {\n      shardVessel.takeCrossing();\n      clientCovenant = { kind: 'cross', t: 0, woke: null, fx: shardVessel.fadePacing() };\n    } else if (pending && Date.now() - pending.at > COVENANT_FADE_CFG.staleMs) shardVessel.takeCrossing();\n    else if (dead && shardVessel.fallsOnDeath()) clientCovenant = { kind: 'fall', t: 0, woke: null, fx: shardVessel.fadePacing() };\n    if (!clientCovenant) return false;\n  }\n  const c = clientCovenant;\n  c.t += dt;\n  if (c.kind === 'fall') { world.screenFade = Math.min(1, c.t / RUN_END_FADE.outSec); return true; } // the solo fall's dark; runEnd opens the screen\n  if (c.woke === null && me && !me.dead) c.woke = c.t; // THE WAKE landed: the dark goes whole at once\n  if (c.woke === null) { world.screenFade = Math.min(1, c.t / Math.max(0.01, c.fx.fadeOutSec)); return true; }\n  const lift = Math.max(c.woke, c.fx.fadeOutSec) + c.fx.holdSec;\n  world.screenFade = c.t < lift ? 1 : Math.max(0, 1 - (c.t - lift) / Math.max(0.01, c.fx.fadeInSec));\n  if (c.t >= lift + c.fx.fadeInSec) { clientCovenant = null; world.screenFade = 0; }\n  return true;\n}\n\n/** THE ACTING SEAT (the death beat, docs/render/player-death.md): on a hosted world\n *  a fallen hero's body stands dead on the wire for VESSEL_CFG.deathBeatSec before\n *  `runEnd`, so the blow is seen. The presentation starts at the first frame our own\n *  seat reads dead, as in single player; `runEnd` hands onClientRunEnd's screen in\n *  (clientDeath), which opens at the presentation's reveal (at once if past it), and\n *  the frozen world stops rendering when the presentation completes. */\nlet clientDeath: { open: (revealSec?: number) => void; opened: boolean } | null = null;\nfunction clientDeathBeat(dt: number): void {\n  if (clientCovenantBeat(dt)) return; // THE IMMORTAL'S COVENANT ON A SHARD (card 30): the crossing's fade, the fall's dark\n  if (!(net instanceof WsTransport) || !DEATH_PRESENTATION.enabled) return;\n  if (!world.deathPresentation && world.player.dead && shell.latest?.seats[world.clientSeatId]?.dead) world.deathPresentation = { elapsed: 0 };\n  const dp = world.deathPresentation;\n  if (!dp) return;\n  dp.elapsed += dt;\n  const pose = deathPresentationPose(dp.elapsed);\n  world.screenFade = pose.fade;\n  if (clientDeath && pose.reveal && !clientDeath.opened) { clientDeath.opened = true; clientDeath.open(DEATH_PRESENTATION.revealSec); }\n  if (clientDeath?.opened && pose.complete) { clientDeath = null; running = false; }\n}\n\n/** CLIENT (THE ACTING SEAT, a refused hero): the shard would not seat the vessel we\n *  carried, and never seats a fresh hero in its place. A hero that cannot travel\n *  drifts back into Mu bound for the same world (wake another and it travels); a\n *  door word (this hero already walks there) lands on the start menu. */\nfunction onClientRefused(word: string, mu: boolean): void {\n  if (!(net instanceof WsTransport)) return;\n  running = false;\n  if (!mu) { toStartMenu(doorWord(word, 'the world would not seat this hero')); return; }\n  const url = lastShardUrl, name = lastShardWorld;\n  resetToLocal(); if (url) writeDoor({ url, ...(name ? { world: name } : {}) }); startMu(); // THE DOOR stays bound\n  if (word) world.text(world.player.pos, word, '#d8b87a', 13, undefined, 6);\n}\n\n/** CLIENT: the host re-seated us in its new run — rebuild our render shell and\n *  re-subscribe to the host's broadcasts with a clean snapshot state. */\nfunction onClientNewRun(seat: string, seed: number): void {\n  startAsClient(pendingRejoinClass ?? CLASSES[0], seat, seed);\n  subscribeToHost();        // fresh onState/onZone for the new run (torn down at runEnd)\n}\n\n/** Where the death screen's \"Rise Again\" leads: a live co-op host KEEPS the\n *  session + deals a fresh class hand for the next run (re-seating clients via\n *  flushRejoins); single-player returns to the start menu. */\nfunction onDeathDismiss(): void {\n  if (coopActive()) {\n    ui.showClassSelect(cls => { void withLoadingScreen(cls).then(started => { if (started) flushRejoins(); }); });\n  } else {\n    // THE LOOP CLOSES IN MU (data/mu.ts): a solo run's end drifts the player\n    // back into the hub between lives — the next vessel is a walk, not a\n    // menu. The main menu stays one Esc away from inside Mu.\n    startMu();\n  }\n}\n",
          "after": "import { resolveResumeSpawn } from './meta/worldstate';\nimport { characterResumeFields } from './meta/characterResume';\nimport { prepareNativeCharacterContinue } from './worldmass/nativeClientContinue';\nimport { NativeClientStart, type NativeClientStarted, type NativeClientStartRequest } from './worldmass/nativeClientStart';\nimport { nativeClientRuntimeFor, type NativeClientRuntime } from './worldmass/nativeClientRuntime';\nimport type { HeroInputQuery, HeroInputSource } from './agent/perception';\nimport { DEFAULT_MODE_ID, freeRosterSlot, mintCharId, modeById, rosterCapacity, type RosterEntry } from './meta/modes';\nimport { healMercEngagements, releaseMercsOf } from './meta/mercs';\nimport type { Settings } from './meta/settings';\n\nconst canvas = document.getElementById('game') as HTMLCanvasElement;\nconst input = new Input(canvas);\nconst loadingScreen = new LoadingScreen(() => { input.clearForLoading(); barPress = null; });\nlet loadingGate: { world: World; lease: LoadingLease } | undefined;\n\n// ---------------------------------------------------------------------------\n// THE CRASH TRAP (game half — the early half is inline in index.html and owns\n// everything before this module evaluates). Installed FIRST, before the boot\n// work below, so a throw anywhere later still lands in the full trap. Every\n// uncaught error / unhandled rejection appends to the SAME ring the early\n// trap seeded (window.__bootErrors, cap 20); the FIRST fatal:\n//  1. stands the saves down (meta/persistence.ts suppressSaves — baseline,\n//     autosave, menu-exit, quit flush, durable wipes all refuse, so a crash\n//     mid-corruption can never overwrite the last good save),\n//  2. raises THE CRASH OVERLAY (ui/errorOverlay.ts — no auto-dismiss), and\n//  3. ends the rAF pump (frame() stops re-arming — a crashed sim is not\n//     ticked onward beneath the overlay; only a restart resumes).\n// DOCTRINE (start simple): EVERYTHING uncaught is fatal. If real noise ever\n// surfaces — say a transport's benign rejection — the refinement is to route\n// it to crashPush (ring-only, no latch) here, not to grow a taxonomy.\n// ---------------------------------------------------------------------------\nconst crashRing: CrashEntry[] = (window.__bootErrors ??= []);\nlet crashFatal: CrashEntry | null = null;\nfunction crashPush(kind: string, msg: string, stack?: string): CrashEntry {\n  const entry: CrashEntry = { t: Date.now(), kind, msg, stack };\n  if (crashRing.length >= 20) crashRing.shift();\n  crashRing.push(entry);\n  return entry;\n}\nfunction reportFatal(err: unknown, kind: string): void {\n  const e = err instanceof Error ? err : null;\n  const entry = crashPush(kind, e?.message ?? String(err ?? 'unknown error'), e?.stack);\n  if (crashFatal) return;   // the first fatal owns the screen; later ones just ring\n  crashFatal = entry;\n  loadingScreen.close();\n  console.error('[crash] fatal —', err);\n  suppressSaves(`fatal ${kind}: ${entry.msg}`);\n  try { showErrorOverlay(entry, crashRing); }\n  catch (overlayErr) { console.error('[crash] the overlay itself failed to raise', overlayErr); }\n}\nwindow.__gameBooted = true;   // the early trap's boot-failure fallback stands down\nif (window.__bootTrapTimer !== undefined) clearTimeout(window.__bootTrapTimer);\nwindow.onerror = (msg, _src, _line, _col, err): void => { reportFatal(err ?? msg, 'uncaught error'); };\nwindow.onunhandledrejection = (ev): void => { reportFatal(ev.reason, 'unhandled rejection'); };\n\n// The ACCOUNT and the keybind SETTINGS are loaded ONCE here and live in module\n// scope — they outlive every character death and World recreation. World, UI,\n// and the renderer hold the SAME references; they are never re-loaded mid-run.\nconst account: Account = loadAccount();\nreconcileClassBundleGems(account);\nconst settings: Settings = loadSettings();\n\n// THE UI SCALE DIAL (ui/uiScale.ts): install the fabric stylesheet once, then\n// stamp the saved scale — panels, tooltips, and the canvas HUD all wake at the\n// player's size, not at 100% until they visit Options.\ninstallUiScaleStyles();\napplyUiScale(settings.uiScale);\n// THE UI STACK LAW (ui/zorder.ts): seat every selector-delivered surface on\n// its rung before anything shows — activatable panels above every canvas.\ninstallUiStack();\n\nconst renderer = new Renderer(canvas, () => settings);\n// The thematic cursor identity (style + tint) — applied at boot; the options\n// view re-applies on change. The pad reticle shares the same tint.\napplyCursor(settings.cursor);\n\n// CONTROLLER: polled once at the top of each frame. Buttons ride the padBinds\n// settings map; sticks feed movement/aim as axes. Feel numbers resolve here —\n// PAD_CFG engine defaults overlaid by the player's persisted Settings.pad.\nconst padTuning = (): PadTuning => ({\n  deadzone: settings.pad.deadzone,\n  stickCurve: PAD_CFG.stickCurve,\n  // The player's aim-sensitivity dial, resolved across the engine's exponent\n  // span — 0.5 lands exactly on stickCurve (the classic feel).\n  aimCurve: PAD_CFG.aimCurve.relaxed\n    + (PAD_CFG.aimCurve.twitchy - PAD_CFG.aimCurve.relaxed) * settings.pad.aimSensitivity,\n  triggerThreshold: PAD_CFG.triggerThreshold,\n  aimMinRadius: PAD_CFG.aim.minRadius,\n  aimMaxRadius: settings.pad.aimRadius,\n  pointerSpeed: settings.pad.pointerSpeed,\n  swapSticks: settings.pad.swapSticks,\n});\nconst pad = new PadState(padTuning);\nconst padPointer = new PadPointer(pad, padTuning);\n// AIM ARBITRATION: the last device to speak owns the reticle. Any right-stick\n// deflection hands it to the pad instantly; the mouse must accumulate a\n// DELIBERATE bit of travel (PAD_CFG.mouseReclaimPx) to take it back, so an\n// idle arrow nudged by a desk bump can't yank targeting across the screen.\nlet aimSource: 'mouse' | 'pad' = 'mouse';\nconst lastMouse = { x: -1, y: -1 };\nlet mouseReclaim = 0;\n// The game's visible aim: the assisted reticle point + the soft-lock target,\n// refreshed by readLocalInput and fed to the renderer each frame.\nlet padLock: number | null = null;\nlet padAimView: { x: number; y: number; lockId: number | null } | null = null;\n// MOUSE HANDOFF (PAD_CFG.mouseHandoff): when the mouse reclaims aim from the\n// pad, this screen-space offset carries the reticle's position into the\n// mouse's aim — aim = arrow + offset — so targeting continues from where the\n// reticle truly was instead of flipping to wherever the arrow sat parked. It\n// melts with mouse travel until arrow and aim are one and the arrow returns.\nlet mouseHandoff: { x: number; y: number } | null = null;\n// THE PRESSABLE BAR (renderer.hudSlotRects — drawn == tested): a mouse press\n// that lands on the hero's own bar slot becomes THAT slot's press for as long\n// as the button stays down (held casts channel, guards hold), and the LMB's\n// own slot-0 contribution is withheld for the press — pressing a button must\n// never also swing the primary. The press AIMS where the hero faces, at the\n// pad's mid reach, bent by the aim assist at full strength (the stick's own\n// aim law: the cursor is on the bar, not on the battlefield). A touch rides\n// the same seam — a tap is a press — so the bar is the first HUD surface a\n// thumb can work (docs/design/mobile-touch.md).\nlet barPress: { slot: number; lock: number | null; meta?: boolean } | null = null;\n/** The LOCAL hero's bar slot under a CSS-pixel point, or null. */\nfunction hudSlotAt(cssX: number, cssY: number): number | null {\n  for (const r of renderer.hudSlotRects) {\n    if (r.seatId !== world.localSeat.id) continue;\n    if (cssX >= r.x && cssX < r.x + r.w && cssY >= r.y && cssY < r.y + r.h) return r.slot;\n  }\n  return null;\n}\n/** THE PRESSABLE META (renderer.hudMetaRects — drawn == tested): the LOCAL\n *  hero's slot whose META mini-button sits under a CSS-pixel point, or\n *  null. A plain click there IS that slot's meta press — no modifier, no\n *  primary swing — the stance shift's clickable door and every other\n *  meta's (Detonate, Recall, Thrust) alike. */\nfunction hudMetaSlotAt(cssX: number, cssY: number): number | null {\n  for (const r of renderer.hudMetaRects) {\n    if (r.seatId !== world.localSeat.id) continue;\n    if (cssX >= r.x && cssX < r.x + r.w && cssY >= r.y && cssY < r.y + r.h) return r.slot;\n  }\n  return null;\n}\n\n/** The one gate for drawing the in-world game reticle (and hiding the OS\n *  arrow): live play, no menus/pointer, a hero who can act. Both the renderer\n *  feed and the handoff's honesty rule (below) key off this. */\nfunction reticleAllowed(): boolean {\n  return running && !ui.uiBlocking() && !padPointer.active\n    && !world.player.dead && !world.player.downed;\n}\n\nlet speechPointerOnCanvas = false;\ncanvas.addEventListener('mousemove', () => { speechPointerOnCanvas = true; });\ncanvas.addEventListener('mouseleave', () => { speechPointerOnCanvas = false; });\nwindow.addEventListener('blur', () => { speechPointerOnCanvas = false; });\n\n/** Feed the renderer this frame's aim view: the HUD mouse plus — while the\n *  PAD owns the reticle in live play, or a mouse HANDOFF is still carrying\n *  the pad's aim — the aim point (and soft-lock target) the in-world reticle\n *  draws at. The canvas hides the OS arrow whenever the reticle is the\n *  cursor; once the handoff melts (or a menu needs the arrow) it returns. */\nfunction feedRendererAim(): void {\n  renderer.hudMouse = input.mouse;\n  const allowed = reticleAllowed();\n  // HONESTY RULE: the moment the OS arrow must be visible (menus, pointer\n  // mode, death), its position is truth again — a hidden handoff offset\n  // would mean clicking one place and aiming another. Drop it.\n  if (mouseHandoff && !allowed) mouseHandoff = null;\n  const padOwns = aimSource === 'pad' && allowed;\n  const handoffOwns = aimSource === 'mouse' && mouseHandoff !== null && allowed;\n  const speechMouse = { x: input.mouse.x / input.pointerScale, y: input.mouse.y / input.pointerScale };\n  renderer.speechPointerEnabled = allowed && aimSource === 'mouse' && !handoffOwns && speechPointerOnCanvas\n    && !renderer.hudClusterRects.some(r => speechMouse.x >= r.x && speechMouse.x <= r.x + r.w\n      && speechMouse.y >= r.y && speechMouse.y <= r.y + r.h);\n  renderer.padAim = (padOwns || handoffOwns) ? padAimView : null;\n  const wantCursor = (padOwns || handoffOwns) ? 'none' : '';\n  if (canvas.style.cursor !== wantCursor) canvas.style.cursor = wantCursor;\n}\n\n// Networking transport. LocalTransport runs single-player + local co-op (host\n// with one machine); a WebRtcTransport (same NetTransport contract) swaps in for\n// a real over-the-wire session. `let` so the lobby can replace it. `?coop` spawns\n// a local stand-in ally so the multi-seat path plays/verifies with no networking.\nlet net: NetTransport = new LocalTransport();\nconst COOP_PARAMS = new URLSearchParams(location.search);\n/** `?coophuman` = a second LOCAL HUMAN seat (arrow keys); `?coop` = a scripted one. */\nconst COOP_HUMAN = COOP_PARAMS.has('coophuman');\nconst COOP_ALLY = COOP_PARAMS.has('coop') || COOP_HUMAN;\n/** `?crashtest` — THE NEGATIVE CONTROL for the crash trap (dev-only, the\n *  `?prologue` idiom): one second after boot, tick() throws deliberately so\n *  the whole capture → overlay → save-stand-down path can be drilled and the\n *  refusals observed live. OFF (param absent) this is one always-false\n *  compare per frame — zero behavior change. */\nlet crashTestAt = COOP_PARAMS.has('crashtest') ? performance.now() + 1000 : Infinity;\n\n// Host→client snapshot broadcast at a FIXED wire rate (decoupled from the host's\n// render FPS), only ever while real peers are connected — single-player/local-only\n// never builds one, so SP stays byte-identical.\nconst STATE_HZ = 20;\nlet stateTimer = 0;\nlet snapTick = 0;\n/** THE SMOOTH SHELL (net/shell.ts, client only): the client's whole timeline. Each arriving\n *  snapshot is ADOPTED once (state, the own build under THE ECHO LAW); each frame places it\n *  (remote bodies on THE JITTER BUFFER's delayed clock, flights and telegraphs on the newest\n *  pair), predicts the own hero (THE HONEST INPUT, THE SOFT CORRECTION, THE PREDICTED ROOT)\n *  and watches the link (THE WATCHDOG). Reset per session. */\nconst shell = new WireShell();\n/** CLIENT: set when a newly-arrived snapshot carried OUR replicated seat meta, so\n *  the client re-renders its open build panels (skill book / tree / char sheet)\n *  exactly when the data changes — the HUD is always live via the renderer. */\nlet clientMetaDirty = false;\n/** CLIENT: JSON of the last OWN-seat meta we triggered a panel re-render for — so\n *  the 1.5s heartbeat (which re-ships IDENTICAL meta) doesn't perpetually re-render\n *  the open build panels (which would yank a scrolled list back to the top). */\nlet lastMetaJson = '';\n/** HOST: re-dirty every seat this often (s) as a self-healing safety net for a\n *  delta-replicated meta snapshot that was dropped (congested channel) or coalesced. */\nconst META_HEARTBEAT = 1.5;\nlet metaHeartbeat = 0;\n/** Disposers for the client's onState / onZone subscriptions. */\nlet snapshotDispose: (() => void) | null = null;\nlet zoneDispose: (() => void) | null = null;\n/** Host: the last zone id whose terrain we broadcast (resend on change). */\nlet lastSentZone = '';\n/** A new transport or client shell needs terrain before its first state. */\nconst hostedPublications = new WeakMap<NativeClientRuntime, { transport: NetTransport; publication: NativeHostedPublication }>();\n/** Run-lifecycle (co-op) plumbing. sessionDispose tears down the onSession\n *  subscription on leave. HOST: pendingRejoins = peers who chose a class for the\n *  next run while the host wasn't yet in one (reseated when it starts). CLIENT:\n *  pendingRejoinClass = the class WE chose at the run-end screen (used when the\n *  host re-seats us via newRun). */\nlet sessionDispose: (() => void) | null = null;\n/** CLIENT: tears down the onHostLost subscription on leave — and, because it is\n *  dropped BEFORE net.leave() closes the channels, keeps our own teardown from\n *  calling back into the host-gone landing. */\nlet hostLostDispose: (() => void) | null = null;\nconst pendingRejoins = new Map<string, string>();\nlet pendingRejoinClass: ClassDef | null = null;\n/** CLIENT, THE SHARD: the vessel link of the last shard session (heroSave\n *  mirrors, THE DEATH COVENANT's word, our own bodies' rows — meta/shardVessel.ts). */\nlet shardVessel: ShardVesselLink | null = null;\n/** HOST: meta intents (point-spends, gem ops, drops) received from clients this\n *  frame, tagged with the sender's seat. Drained + applied just before world.update\n *  (so the change replicates in the SAME tick's snapshot). */\nconst pendingActions: Array<{ seat: string; action: MetaAction; seq?: number }> = []; // seq: THE ECHO LAW\n\n/** A LIVE over-the-wire co-op session with at least one connected peer. Gates the\n *  run-end broadcast + the keep-the-transport-alive restart path. */\nfunction coopActive(): boolean {\n  return net instanceof WebRtcTransport && net.peers().length > 1;\n}\n\n/** Stand a fresh World up with its SHELL POLICIES wired — the seam where the\n *  transport layer (which the engine can't see) parameterizes engine fabrics.\n *  Today: the timeflow's menu-hold gate — menus hard-pause the sim only when\n *  this machine owns the one real sim AND no live peer shares it (a co-op\n *  world is never one player's to stop; a client render-shell never holds). */\nlet resumeRequest = 0;\nlet resumeController: AbortController | null = null;\n/** Only the still-pending connection is owned by this entry generation. */\nlet pendingShardEntry: { readonly request: number; readonly transport: WsTransport } | undefined;\nfunction cancelCharacterResume(): void {\n  resumeRequest++;\n  if (resumeController) { resumeController.abort(); ui.setContinuePending(false); }\n  resumeController = null;\n  const pending = pendingShardEntry;\n  if (pending) {\n    pendingShardEntry = undefined;\n    if (net === pending.transport) resetToLocal(); else pending.transport.leave();\n  }\n}\nconst nativeStarts = new WeakMap<Account, NativeClientStart>();\nfunction nativeStartFor(owner: Account): NativeClientStart {\n  let start = nativeStarts.get(owner);\n  if (!start) { start = new NativeClientStart(owner); nativeStarts.set(owner, start); }\n  return start;\n}\nfunction clientReadiness(w: World): { status: 'ready' | 'pending' | 'refused'; required?: number; error?: string } | undefined {\n  const retained = nativeClientRuntimeFor(w);\n  return retained ? { status: retained.ready ? 'ready' : 'pending' } : w.massRuntime?.nativeReadiness(w);\n}\nlet previousAdoptedWorld: World | undefined;\nfunction adoptWorld(w: World): World {\n  if (loadingGate && loadingGate.world !== w) { loadingGate.lease.finish(); loadingGate = undefined; }\n  cancelCharacterResume();\n  w.bindGlobalPolicies();\n  if (previousAdoptedWorld && previousAdoptedWorld !== w) {\n    const previous = nativeClientRuntimeFor(previousAdoptedWorld);\n    if (previous) previous.retire(); else previousAdoptedWorld.massRuntime?.dispose();\n  }\n  previousAdoptedWorld=w;\n  // (Couch guests count as live players too — a shared screen is never one\n  // player's to stop, so a seated guest waives the menu hold like a peer.)\n  w.timeflow.allowHold = () => net.isHost && !coopActive() && !w.couchActive();\n  return w;\n}\n\n// Graft every content package's factions into the shared data registries BEFORE\n// any World is built or the content validator runs (mutates FACTIONS/traits/…).\nregisterAllPackageFactions();\n\n// A placeholder world until a run begins (the start menu is shown first); it is\n// replaced wholesale by startGame / resumeGame with the run's frozen manifest.\nlet world = adoptWorld(new World(account, Object.freeze(buildManifest(account, rollSeed()))));\n// THE SKILL SHOWCASE (src/showcase/host.ts): any surface's data-skill-showcase\n// element becomes a live showcase of that skill, wherever it is shown.\ninstallSkillShowcases(document.body);\nconst ui = new UI(\n  () => world, () => account, () => saveAccount(account),\n  () => settings, () => saveSettings(settings),\n  () => !net.isHost,        // a network co-op CLIENT (world is a render shell)\n  () => leaveCoop(),        // tear down a co-op session → back to the menu\n);\n// The rebind view captures pad buttons through these (panels never touch the\n// device layer directly — same altitude as its getSettings/saveSettings deps).\nui.armPadCapture = (cb) => pad.armCapture(cb);\nui.disarmPadCapture = () => pad.disarmCapture();\n// DEVICE OF THE MOMENT: bind hints, '{bind:…}' prompt tokens, and slot labels\n// all follow whichever device spoke last (the pad's recency window —\n// PAD_CFG.activeWindow). One arbiter, injected at the same altitude as the\n// settings getters: neither surface ever touches the device layer directly.\nconst padActiveNow = (): boolean => pad.activeRecently(performance.now() / 1000);\nrenderer.getPadActive = padActiveNow;\nui.getPadActive = padActiveNow;\n// THE MENU BAR's 'bar' anchor seats off the hero's DRAWN HUD cluster — the\n// rect the renderer published this frame (drawn == seated).\nui.onCosmeticsChanged = () => {\n  if (!net.isHost) net.sendSession({ t: 'cosmetics', loadout: account.cosmetics.loadout });\n};\nui.hudCluster = () => renderer.hudClusterRects.find(c => c.seatId === world.localSeat.id) ?? null;\n// Tab is the menu's default bind: keep the browser's focus walk from riding\n// the same press (a text field keeps its own Tab).\nwindow.addEventListener('keydown', (e) => {\n  if (e.key !== 'Tab') return;\n  const t = document.activeElement;\n  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) return;\n  e.preventDefault();\n});\n// THE HERO'S ADDRESS: '{name}' tokens in world-authored talk resolve against\n// the live hero at the same display seam as '{bind:…}' (Renderer.resolveText\n// → resolveNameTokens) — the closure reads the CURRENT world, so a new run's\n// hero re-addresses every line the moment it seats. THE RENOWN GATE\n// (World.heroKnown — run-scope; the Odyssey's first arm will stamp it): an\n// UNKNOWN hero feeds the BLANK name, so every token site current and future\n// degrades to the resolver's own 'Traveller' fallback through this one seam\n// — no per-line churn, and no future line can leak a name the world has not\n// yet learned.\nrenderer.getPlayerName = () => world.heroKnown() ? world.meta.name : '';\n// THE OBSTRUCTION CENSUS: the open DOM panes' rects, handed to the speech\n// fabric's PLACEMENT LAW (drawSpeeches → dodgeSpeechBox) so a talk bubble\n// slides out from under an open inventory instead of being swallowed.\nrenderer.uiObstructions = () => ui.obstructionRects();\n\nlet running = false;\n// Local navigation only. Future progression actions register validated engine\n// commands here; the reader never writes quest, reward or alignment state.\nconst dialogueActions = new DialogueActions<DialogueActionContext>();\ndialogueActions.register('menu', {\n  refusal: (context, action) => context.world === world ? ui.dialogueMenuRefusal(action.target) : 'This conversation has ended.',\n  run: (_context, action) => ui.activateDialogueMenu(action.target),\n});\nconst dialogue: DialogueUI = new DialogueUI({\n  conversationTopFloor: () => ui.conversationTopFloor(),\n  ownerChanged: (id, active) => { ui.conversationSpeakerId = id; ui.conversationWorkspaceActive = id !== null && active; },\n  createWorkspace: (root, changed) => new NpcConversationUI(root, {\n    world: () => world,\n    available: () => renderer.npcDialogueAvailable() && dialogue.open,\n    inventory: () => { if (!ui.inventoryOpen) ui.toggleInventory(); },\n    slotLabels: () => ui.conversationSlotLabels(),\n    changed: () => ui.refreshInventory(),\n  }, changed),\n  settings: () => settings, padActive: padActiveNow,\n  hudTop: () => ui.hudCluster?.()?.y,\n  resolveText: text => renderer.resolveText(text),\n  actions: dialogueActions,\n  available: () => renderer.npcDialogueAvailable(),\n});\nrenderer.npcDialogueOwner = () => dialogue.session.reading?.offer.speakerId ?? null;\nrenderer.npcDialogueAvailable = () => running && !world.player?.dead && !world.player?.downed && ui.dialogueContext().available;\nrenderer.onNpcDialogue = (w, line, focusId) => {\n  dialogue.setAvailable(renderer.npcDialogueAvailable());\n  dialogue.sync(w, line, focusId);\n};\n// A consumed dialogue button stays out of gameplay until physically released,\n// including the frame in which Finish closes the reader.\nconst dialoguePadHeld = new Set<string>();\nlet deathShown = false;\nlet uiRefreshTimer = 0;\nlet autosaveTimer = 0;\n\n/** Legacy crossing for non-death conclusions; actual deaths use the shared\n *  deathPresentation timeline. Co-op and deliberate forfeits stay immediate. */\nconst RUN_END_FADE = { outSec: 1.15 };\n/** The booked epilogue; revealing it never re-books the death. */\nlet pendingDeathScreen: { open: (revealSec?: number) => void; opened?: boolean } | null = null;\n\ntype StartGameArguments = [classDef: ClassDef, manifest?: ExpeditionManifest, modeId?: string, name?: string, graftSkillId?: string | null, kitPicks?: Record<string, string>];\nfunction startGame(\n  classDef: ClassDef, manifest?: ExpeditionManifest, modeId?: string, name?: string,\n  graftSkillId?: string | null, kitPicks?: Record<string, string>,\n  loadingStage?: (label: string) => Promise<void>,\n  loadingCurrent?: () => boolean,\n): void | Promise<void> {\n  couchReset(); // a new world seats no ghosts — guests re-join from the menu\n  // THE PROLOGUE GATE (engine/scenes.ts), read FIRST — before a roster mode\n  // pushes its vessel and muddies the virgin-account test: an account that\n  // has never played walks the one-time opening scene; everyone else starts\n  // at the bedside as always. `?prologue` re-runs it deliberately for this\n  // page load (the ?couchpads lever precedent) — a veteran re-watching the\n  // opening, or a dev testing it, without touching the account gate.\n  const prologueDue = sceneDue(account, 'prologue')\n    || new URLSearchParams(location.search).has('prologue');\n  // THE ONE CROSSING (net/crossing.ts): a server-bound wake mints its vessel on a World that\n  // stands no local town (no zone loads, nothing is drawn); the shard's hearth is the far side.\n  // THE DOOR (W7): the tab's persisted binding is what a wake travels to.\n  const door = readDoor();\n  const serverBound = !!door && !prologueDue;\n  if (!serverBound) {\n    const request: NativeClientStartRequest = { kind: 'run', classDef, manifest, modeId, name,\n      graftSkillId, kitPicks, prologue: prologueDue ? 'force' : 'skip',\n      onReady: made => { world = adoptWorld(made.writer); if (COOP_ALLY) spawnCoopAlly(); },\n    };\n    const finish = (started: NativeClientStarted | null): void => {\n    if (!started) { toStartMenu(); return; }\n    lastSentZone = '';\n    if (modeById(modeId).save !== 'roster') ui.setContinueSave(null);\n    ui.resetRunView(); deathShown = false; pendingDeathScreen = null; running = true;\n    };\n    if (loadingStage) {\n      const start = nativeStartFor(account);\n      return start.beginLoading(request, loadingStage).then(started => {\n        // A queued cancellation can run between adoption and Promise completion.\n        if (loadingCurrent?.() === false) return;\n        if (!started || start.current === started && world === started.writer && started.runtime.ready) finish(started);\n      });\n    }\n    finish(nativeStartFor(account).begin(request));\n    return;\n  }\n  // The LIFE-CONTRACT (meta/modes.ts): class select passes the sworn mode.\n  // A roster mode binds an account VESSEL at creation — the character saves\n  // cross-session into its own slot from its first breath.\n  const mode = modeById(modeId);\n  // THE NAME (Naming/Nemesis): player-given, else named for its class — the\n  // thread the world's memory follows across runs.\n  const charName = name?.trim() || classDef.name;\n  // EVERY character gets an identity — mercenary engagements (and any future\n  // cross-character bookkeeping) key off it, mortal or vessel alike.\n  const charId = mintCharId();\n  if (mode.save === 'roster') {\n    const slot = freeRosterSlot(account, mode);\n    if (slot == null) { toStartMenu(); return; } // picker greys full modes; this is the belt\n    account.roster.push({\n      charId, modeId: mode.id, slot, classId: classDef.id, name: charName,\n      level: 1, stage: 0, savedAt: Date.now(),\n    });\n    saveAccount(account);\n  }\n  // A run-slot start OVERWRITES the previous run save — release any merc\n  // contract that run held (its patron ceases to exist right here, not at\n  // the next boot's self-heal).\n  if (mode.save !== 'roster') {\n    const previousPatron = savedCharacterPatronId();\n    if (previousPatron && releaseMercsOf(account, previousPatron) > 0) saveAccount(account);\n  }\n  // The manifest is the run-LOCKED package config. Phase 4's Expedition screen\n  // passes a configured one; otherwise build it from the account's saved prefs.\n  const m = manifest ?? buildManifest(account, rollSeed());\n  world = adoptWorld(new World(account, Object.freeze(m)));\n  // THE OPENING (meta/classkit.ts): the card's picks — remembered on the\n  // account for the next waking — resolve here against what the account\n  // actually OWNS (an unowned alternate falls back to its base; owned\n  // Master grants seat themselves): the engine wakes the resolved bar.\n  if (kitPicks) { rememberKitPicks(account, classDef, kitPicks); saveAccount(account); }\n  // A GRADUATED account (Mireille's flask lesson lived once, any character)\n  // skips the re-walk: the flasks arrive learned, barred, and brimming at\n  // first breath. No-op until that first graduation — and placed BEFORE\n  // persistRun so the baseline snapshot already carries them.\n  world.createPlayer(classDef, { modeId: mode.id, charId, name: charName, kit: resolveClassKit(account, classDef, kitPicks), load: !serverBound });\n  // THE LAB KIT (ULT_QA.grantArts — engine/ultimates.ts): iteration builds\n  // deal the ultimate + gauge debuts into the fresh bag, unlearned.\n  world.dealLabArts();\n  // THE SKILL GRAFT (meta/unlocks.ts kind 'graft'): the armed charge spends\n  // HERE — where the run truly begins — before the baseline save, so the\n  // snapshot carries the grafted gem from the first breath. A pick without\n  // a charge (or a charge without a pick) is a no-op by construction.\n  if (graftSkillId && account.skillGraft && world.applySkillGraft(graftSkillId)) {\n    account.skillGraft = false;\n    saveAccount(account);\n  }\n  lastSentZone = '';        // force a fresh terrain broadcast for (re)joining clients\n  if (COOP_ALLY) spawnCoopAlly();\n  // The baseline snapshot — EXCEPT under a due scene: the tutorial is not a\n  // run, so nothing persists until its 'home' stage writes the true first\n  // save at the bedside wake (a mid-tutorial quit = start a new game).\n  if (!prologueDue) persistRun(account, world); // baseline so a fresh run is resumable\n  // A roster character never touches the shared run slot — the mortal\n  // Continue stays valid beside it (the vessels are additional lives).\n  if (mode.save !== 'roster') ui.setContinueSave(null);\n  ui.resetRunView();        // a new world must not inherit the old run's map zoom/tabs/pin\n  deathShown = false;\n  pendingDeathScreen = null; // a torn-down run's fade never fires over a fresh world\n  // THE PROLOGUE (after the baseline save, so the snapshot is a clean\n  // bedside start): the scene stamps its ledger key the moment it begins —\n  // played once, ever — and its staging ground lives off-graph, so even a\n  // mid-scene autosave resumes at the ordinary wake.\n  if (prologueDue) sceneBegin(world, 'prologue');\n  running = !serverBound; // THE ONE CROSSING: the minting world is no run; the shard's shell starts the loop\n  // THE LOGIN THROUGH MU (card 22): a server-bound wake travels at once — the vessel\n  // just saved at the bedside is the one the shard seats, and this run stays its home.\n  // THE DOOR (W7) is the tab's persisted binding, so a reload or the menu in between\n  // never drops it; a hero woken for a world consents to leave its bedside world behind.\n  if (door && serverBound) {\n    crossingWake(); // THE ONE CROSSING: this wake's cover stands from the flush to the hero's streamed ground\n    const request = resumeRequest;\n    void (async () => {\n      try {\n        await flushCharacterSaves();\n        if (request !== resumeRequest || crossing.phase !== 'wake') return; // a cancelled/replaced wake never connects\n        await connectToShard(door.url, classDef.id, { charId }, { replaceSolo: true }, request); // THE WAKE'S WORD: this charId, mortal or roster\n      } catch (e) { if (request === resumeRequest && !crossingCancelled(e)) toStartMenu(doorWord(e)); }\n    })();\n  }\n}\n\n/** Loading cancellation does not save a partially prepared world. Reread only\n * the menu summary, which was cleared when a fresh run started. */\nfunction cancelLoadingToMenu(): void {\n  toStartMenu('The crossing was cancelled.');\n  const request = resumeRequest;\n  void readCharacterContinueSummary().then(summary => {\n    if (request === resumeRequest && !running) ui.setContinueSave(summary);\n  }).catch(() => { /* The menu stays available; a later Continue rereads storage. */ });\n}\n\n/** loadingScreen owns an independent foreground renderer. Await its first paint\n * before starting CPU work, and drain its input before exposing the ready world.\n * Native construction and save authority stay in their existing game process. */\nasync function withLoadingScreen(...args: StartGameArguments): Promise<boolean> {\n  const lease = loadingScreen.begin({ kind: 'entry', label: 'Taking form', loadout: account.cosmetics.loadout,\n    cancel: cancelLoadingToMenu });\n  try {\n    await lease.paint(); if (!lease.current) return false;\n    wakeLease = lease; // THE ONE CROSSING: a server-bound wake keeps this cover to the far side\n    try { await startGame(args[0], args[1], args[2], args[3], args[4], args[5], async label => {\n      if (!lease.current) throw Error('Native client start cancelled');\n      lease.update({ label }); await lease.paint();\n      if (!lease.current) throw Error('Native client start cancelled');\n    }, () => lease.current); } finally { wakeLease = null; }\n    if (crossingLease === lease) return true;\n    lease.update({ label: 'Opening the world' });\n    await lease.paint(); if (!lease.current) return false;\n    const presenting = world;\n    if (!await renderer.renderLoading(presenting, () => lease.paint(),\n      () => lease.current && world === presenting && running && crossingLease !== lease)) return false;\n    // loadingScreen drains foreground actions before exposing the prepared world.\n    await lease.paint(); if (!lease.current) return false;\n    loadingGate = { world, lease };\n    return true;\n  } catch (error) { const active = lease.current; lease.finish(); if (active) reportFatal(error, 'world entry'); return false; }\n}\n\n/** Class-select adapter: the picker hands back (class, sworn mode, name);\n *  startGame wants (class, manifest, mode, name). One arrow so no call site\n *  can transpose them. THE SKILL GRAFT detour: an armed charge offers its\n *  pick between the class choice and the world's first breath — the\n *  deliberate selection rides into startGame and spends there; declining\n *  keeps the charge armed for a later run. */\nlet startPickPending = false;\nconst startPicked = async (d: ClassDef, modeId?: string, name?: string, kitPicks?: Record<string, string>): Promise<void> => {\n  if (startPickPending) return;\n  startPickPending = true;\n  cancelCharacterResume();\n  try {\n    // A browser root may live only in IndexedDB. Resolve the existing boot\n    // load before replacing its patron or mutating the authoritative account.\n    await diskHydrated;\n    if (account.skillGraft) {\n      ui.showSkillGraftPick(pick => { void withLoadingScreen(d, undefined, modeId, name, pick, kitPicks); });\n      return;\n    }\n    await withLoadingScreen(d, undefined, modeId, name, undefined, kitPicks);\n  } finally { startPickPending = false; }\n};\n\n/** THE MU BOOT (data/mu.ts): stand a PROVISIONAL world up and drift into the\n *  hub between lives — a transient scene on off-graph ground, so no run save\n *  ever exists for it (the scene stand-down covers every chokepoint) and no\n *  roster vessel is minted. The wisp strips the provisional class to nothing;\n *  taking a vessel calls startPicked, which discards this world wholesale. */\nasync function startMu(notice?: string): Promise<void> {\n  couchReset();\n  const lease = loadingScreen.begin({ kind: 'entry', label: 'Finding your way', loadout: account.cosmetics.loadout,\n    cancel: cancelLoadingToMenu });\n  try {\n    await lease.paint(); if (!lease.current) return;\n    const started = await nativeStartFor(account).beginLoading({ kind: 'mu', onReady: made => {\n      if (!lease.current) throw Error('Native client start cancelled');\n      world = adoptWorld(made.writer); lastSentZone = ''; ui.resetRunView();\n      deathShown = false; pendingDeathScreen = null; running = true;\n      if (notice) world.text(world.player.pos, notice, '#d8b87a', 13, undefined, 6);\n    } }, async label => {\n      if (!lease.current) throw Error('Native client start cancelled');\n      lease.update({ label }); await lease.paint();\n      if (!lease.current) throw Error('Native client start cancelled');\n    });\n    if (!lease.current) return;\n    if (!started || world !== started.writer || nativeStartFor(account).current !== started || !started.runtime.ready)\n      throw Error('The provisional vessel could not be prepared');\n    lease.update({ label: 'Opening the crossing' });\n    await lease.paint(); if (!lease.current) return;\n    if (world !== started.writer || nativeStartFor(account).current !== started || !started.runtime.ready)\n      throw Error('The provisional vessel changed before presentation');\n    if (!await renderer.renderLoading(started.writer, () => lease.paint(), () => lease.current &&\n      world === started.writer && running && nativeStartFor(account).current === started && started.runtime.ready)) return;\n    await lease.paint();\n  } catch (error) { if (lease.current) reportFatal(error, 'Mu entry'); }\n  finally { lease.finish(); }\n}\n\n/** THE BEGIN PRESS (the start menu's one primary button): a virgin account —\n *  or a deliberate ?prologue — walks the tutorial as the Warrior with no\n *  class screen at all; everyone else drifts into Mu, where the class roster\n *  stands IN the world. The legacy class screen remains beneath (co-op\n *  rejoin offers still call it directly). */\nasync function beginPressed(): Promise<void> {\n  cancelCharacterResume();\n  const request = resumeRequest;\n  await diskHydrated;\n  if (request !== resumeRequest) return;\n  const prologueDue = sceneDue(account, 'prologue')\n    || new URLSearchParams(location.search).has('prologue');\n  if (prologueDue) {\n    await startPicked(CLASSES.find(c => c.id === MU_CFG.provisionalClass) ?? CLASSES[0]);\n    return;\n  }\n  await startMu();\n}\n// THE DOOR (W7): the menu's Begin is a solo road chosen; the tab forgets the world it was bound for.\nui.onBeginRun = () => { forgetDoor(); void beginPressed(); };\n// THE FRONT DOOR (W7): the menu's primary row on a page a world served (or a tab bound for one).\nui.serverDoor = frontDoor;\nui.onEnterWorld = door => { void enterTheWorld(door); };\n// THE HONEST LEAVING (W7): a hosted world's words and its Exit (the pause menu reads these).\nui.hostedWorld = () => (net instanceof WsTransport ? lastShardWorld ?? 'the world' : null);\nui.onExitWorld = () => { void exitWorld(); };\n\n/** Both Continue buttons reread their slot. The menu holds a label only; an\n * old cached character cannot replace a newer save or a reassigned vessel. */\nfunction resumeRosterChar(entry: RosterEntry): void {\n  if (entry.fallen) {\n    ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar,\n      `${entry.name} lies fallen — resurrect them in the Vault (${entry.fallen.fee} ${META_CURRENCY_LABEL}).`);\n    return;\n  }\n  void resumeCharacterSlot(entry.slot, { ...entry });\n}\nfunction resumeGame(): void { void resumeCharacterSlot(CHAR_SLOT); }\nasync function resumeCharacterSlot(slot: number, roster?: RosterEntry): Promise<void> {\n  cancelCharacterResume();\n  const request = resumeRequest, controller = new AbortController();\n  resumeController = controller;\n  ui.setContinuePending(true);\n  const current = (): boolean => request === resumeRequest && !controller.signal.aborted && loading.current;\n  const cardCurrent = (): boolean => !roster || !!account.roster.find(r => r.slot === slot\n    && r.charId === roster.charId && r.modeId === roster.modeId && !r.fallen\n    && modeById(r.modeId).save === 'roster');\n  const loading = loadingScreen.begin({ kind: 'entry', label: 'Recalling your vessel', loadout: account.cosmetics.loadout,\n    cancel: () => {\n      if (!current() && !(published && world === published && running && loading.current)) return;\n      cancelLoadingToMenu();\n    } });\n  let prepared: Awaited<ReturnType<typeof prepareNativeCharacterContinue>> | undefined;\n  let published: World | undefined;\n  try {\n    await loading.paint();\n    await diskHydrated;\n    if (!current()) return;\n    if (!cardCurrent()) throw Error('The selected vessel changed during Continue');\n    const read = await readCharacterResume(slot, { signal: controller.signal });\n    if (!current()) return;\n    if (!cardCurrent()) throw Error('The selected vessel changed during Continue');\n    if (read.status !== 'ready') {\n      if (read.status === 'stale') throw Error('The saved character changed. Please try Continue again');\n      throw Error(read.status === 'refused' ? read.reason : 'The saved character is unavailable');\n    }\n    const fields = characterResumeFields(read.resume);\n    if (roster && (fields.charId && fields.charId !== roster.charId\n      || fields.modeId && fields.modeId !== roster.modeId)\n      || !roster && modeById(fields.modeId ?? DEFAULT_MODE_ID).save === 'roster')\n      throw Error('The saved character belongs to a different slot');\n    // HOME SLOTS (W7): a hero bound to a hosted world RETURNS there (THE LOGIN THROUGH MU\n    // naming it); its world-less mirror never builds a solo world.\n    const route = continueRoute(fields);\n    if (route.kind === 'return') {\n      loading.update({ label: `Returning to ${worldNameOf(route.home)}` });\n      await loading.paint();\n      if (!current()) return;\n      await returnToWorld(route.home, route.charId ?? roster?.charId);\n      return;\n    }\n    forgetDoor(); // a solo road chosen at the menu: the tab is bound for no world\n    prepared = await prepareNativeCharacterContinue(account, read.resume, {\n      isCurrent: () => current() && cardCurrent(), signal: controller.signal,\n      loadingStage: async label => { loading.update({ label }); await loading.paint(); },\n      spawn: resolveResumeSpawn(modeById(fields.modeId ?? DEFAULT_MODE_ID).resume, settings.resumeSpawn),\n    });\n    if (!current() || !cardCurrent()) return;\n    const resumed = prepared.publish();\n    couchReset();\n    world = adoptWorld(resumed.writer);\n    published = world;\n    lastSentZone = '';\n    if (COOP_ALLY) spawnCoopAlly();\n    ui.resetRunView();\n    deathShown = false; pendingDeathScreen = null;\n    running = true; ui.hideAll();\n    // loadingScreen stays interactive through the actual first terrain/sprite bake.\n    loading.update({ label: 'Opening the world' });\n    await loading.paint();\n    if (world === resumed.writer && running && loading.current) {\n      if (!await renderer.renderLoading(resumed.writer, () => loading.paint(),\n        () => world === resumed.writer && running && loading.current && resumed.runtime.ready)) return;\n      await loading.paint();\n    }\n  } catch (error) {\n    if (published && world === published && running) reportFatal(error, 'continued world entry');\n    else if (current()) ui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar,\n      error instanceof Error ? error.message : 'The saved world could not be read');\n  } finally {\n    loading.finish();\n    prepared?.discard();\n    if (resumeController === controller) { resumeController = null; ui.setContinuePending(false); }\n  }\n}\n\n// Dev/debug handle (also keeps headless testing possible when rAF is paused).\ndeclare global {\n  interface Window {\n    /** THE CRASH TRAP's shared error ring — seeded by index.html's early trap. */\n    __bootErrors?: CrashEntry[];\n    /** The early trap's boot-failure fallback timer (cleared once we boot). */\n    __bootTrapTimer?: number;\n    /** Set the moment this module evaluates — the early fallback's stand-down. */\n    __gameBooted?: boolean;\n    __game?: {\n      world: () => World; retained: () => NativeClientRuntime | undefined; ui: UI; ai: typeof updateAI; renderer: Renderer;\n      account: () => Account; saveAccount: () => void; save: () => void; flushRunSave: () => Promise<void>;\n      settings: () => Settings; saveSettings: () => void;\n      addAlly: () => void;\n      net: () => NetTransport;\n      snapshot: () => StateSnapshot;\n      applySnap: (s: StateSnapshot, prev?: StateSnapshot | null, alpha?: number) => void;\n      subscribeToHost: () => void;\n      /** THE SMOOTH SHELL (net/shell.ts): the client timeline, for QA reads. */\n      wireShell: () => WireShell;\n      /** THE ONE CROSSING (net/crossing.ts): the hosted arrival's cover, for QA reads. */\n      crossing: () => ShardCrossing;\n      unsubscribeFromHost: () => void;\n      fakeJoin: (classId?: string) => string;\n      fakeLeave: (id: string) => void;\n      zoneMsg: () => ZoneMsg;\n      applyZoneMsg: (z: ZoneMsg) => void;\n      openLobby: () => void;\n      leaveCoop: () => void;\n      resetAccount: () => void;\n      /** THE LAB LEVER (ULT_QA): flip the ultimate iteration tune live. */\n      ultqa: (on?: boolean) => boolean;\n      pad: () => PadState;\n      padPointer: () => PadPointer;\n      fakePad: (p: FakePad | null) => void;\n      step: (frames?: number, dtMs?: number) => void;\n      pilot: (src: HeroInputSource | null) => void;\n      hold: (on: boolean) => void;\n      director: () => Director;\n      devStartRun: (classId?: string) => string;\n      loading: LoadingScreen;\n      devStartLoadingRun: (classId?: string) => Promise<void>;\n      devGrantSkill: (skillId: string, level?: number, slot?: number) => number;\n      devInput: (source: ((dt: number) => PlayerInput | null) | null) => void;\n      clipCatalog: () => {\n        skills: {\n          id: string; name: string; tags: string[]; castMode: string; aiRange?: number;\n          concentration: boolean; delivery: unknown; targeting?: unknown;\n        }[];\n        classes: { id: string; bar: string[] }[];\n        noon: number;\n      };\n      hydrated: () => Promise<void>;\n      perfFrames: (reset?: boolean) => {\n        gap: number[]; sim: number[]; ren: number[];\n        /** Pushes since last reset — pushed > gap.length = the ring wrapped. */\n        pushed: number;\n        /** THE PHASE LEDGER's window-worst slab (name over pre/head/sim/ren/tail). */\n        phase: { name: string; ms: number };\n      };\n      /** Size the frame rings to a sweep window (frames; clamped, resets). */\n      perfRingSize: (frames: number) => number;\n      /** performance.now() at the CURRENT frame's tick-callback entry — the\n       *  sweep's fine own-task anchor (vs the coarse vsync-anchored mark). */\n      perfTickT0: () => number;\n      perfSweep: (opts?: PerfSweepOpts) => Promise<PerfSweepReport>;\n      devPanel: () => void;\n      crash: () => {\n        fatal: CrashEntry | null; suppressed: string | null;\n        overlay: boolean; errors: CrashEntry[];\n      };\n    };\n  }\n}\ndocument.title = GAME_TITLE; // the one constant names every surface\n\nwindow.__game = {\n  world: () => world, retained: () => nativeClientRuntimeFor(world), ui, ai: updateAI, renderer,\n  account: () => account, saveAccount: () => saveAccount(account),\n  save: () => persistRun(account, world),\n  flushRunSave: flushCharacterSaves,\n  settings: () => settings, saveSettings: () => saveSettings(settings),\n  addAlly: () => spawnCoopAlly(),\n  net: () => net,\n  snapshot: () => serializeSnapshot(world, 0),\n  applySnap: (s: StateSnapshot, prev?: StateSnapshot | null, alpha = 1) => applySnapshot(world, s, prev, alpha),\n  subscribeToHost, unsubscribeFromHost,\n  wireShell: () => shell,\n  crossing: () => crossing,\n  fakeJoin: (classId) => {\n    const id = 'p' + world.seats.length;\n    onRemoteJoin({ id, name: 'Remote', classId: classId ?? CLASSES[0].id, isHost: false });\n    return id;\n  },\n  fakeLeave: (id) => onRemoteLeave(id),\n  zoneMsg: () => serializeZone(world),\n  applyZoneMsg: (z: ZoneMsg) => applyZone(world, z),\n  openLobby, leaveCoop,\n  resetAccount: () => { resetAccount(); location.reload(); },\n  // THE LAB LEVER's console twin (the dev panel's Lab tab is the door).\n  ultqa: (on = true) => { applyLab({ active: on }); return ULT_QA.active; },\n  // Controller state + the hardware stand-in (tests: __game.fakePad({axes,buttons})).\n  pad: () => pad, padPointer: () => padPointer,\n  fakePad: (p) => { window.__fakePad = p; },\n  // Drive N frames synchronously — the antidote to rAF freezing in hidden\n  // tabs; the ONLY way input polling (incl. the pad) runs under a harness.\n  // NOT sim-only: while a run is live the tick also RENDERS. Don't call\n  // renderer.render on top of step() in a QA cell — each frame then draws\n  // twice, so per-render probes read 2× (the sight veil's update runs once\n  // per pass; a doubled drive double-steps its frame counter and snaps\n  // stale actorShade fades early).\n  step: (frames = 1, dtMs = 16.7) => { for (let i = 0; i < frames; i++) tick(last + dtMs); },\n  pilot: (src) => { localPilot = src; if (src) devInputSource = null; },\n  hold: (on) => { directorHold = on; },\n  director: () => director ??= new Director({\n    world: () => world, renderer,\n    startRun: async (classId, signal) => {\n      await diskHydrated;\n      signal.throwIfAborted();\n      // The disk reconcile owns the ledger until hydration resolves.\n      account.ledger.prologue_lived = 1;\n      const cancel = () => { if (loadingScreen.active) cancelLoadingToMenu(); };\n      signal.addEventListener('abort', cancel, { once: true });\n      try {\n        const started = await withLoadingScreen(CLASSES.find(c => c.id === classId) ?? CLASSES[0]);\n        signal.throwIfAborted();\n        if (!started) throw new Error('Director entry was cancelled or failed.');\n        ui.hideAll();\n      } finally { signal.removeEventListener('abort', cancel); }\n    },\n    ready: waitDirectorReady,\n    step: (dtMs) => tick(last + dtMs),\n    setPilot: (src) => { localPilot = src; if (src) devInputSource = null; },\n    hold: (on) => { directorHold = on; },\n    ledger: () => account.ledger, ui: () => ui,\n  }),\n  // DEV/QA: start a run headlessly (the perf harness's ignition) — the real\n  // startGame path under the first (or named) class, menus dismissed.\n  loading: loadingScreen,\n  devStartLoadingRun: async (classId?: string) => { if (await withLoadingScreen(CLASSES.find(c => c.id === classId) ?? CLASSES[0])) ui.hideAll(); },\n  devStartRun: (classId?: string) => {\n    const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];\n    document.getElementById('start-menu')?.classList.add('hidden');\n    document.getElementById('class-select')?.classList.add('hidden');\n    startGame(cls);\n    return cls.id;\n  },\n  // DEV/QA: seat any catalog skill by id straight onto a bar slot as THE DEV\n  // GIFT (devThrongGrant's shape: past the learn gate, transient, never\n  // saved), replacing whatever sat there, so a harness can walk the whole\n  // catalog without filling the pack (balance/skill-showcase-ui.cjs mints its\n  // bag gems from it). Returns the slot, or -1.\n  devGrantSkill: (skillId: string, level = 1, slot = 2) => {\n    const def = CLIP_SKILLS[skillId];\n    const p = world.player, known = world.localSeat.meta.knownSkills;\n    if (!def || slot < 0 || slot >= p.skills.length) return -1;\n    const prev = p.skills[slot];\n    if (prev) known.delete(prev.def.id);\n    const inst = clipSkillGem(def, level, 'rare');\n    inst.granted = true;\n    inst.devGift = true;\n    known.set(skillId, inst);\n    p.skills[slot] = inst;\n    world.charDirty = true;\n    world.recalcPlayer();\n    return slot;\n  },\n  devInput: (source) => { devInputSource = source; if (source) localPilot = null; },\n  // DEV/QA: the skill-clip capture's catalog: every player skill (the\n  // database page's list; noDrop rows are monster kit), each class's\n  // opening bar (the body that films a skill) and the brightest hour.\n  clipCatalog: () => {\n    let noon = 0;\n    for (let t = 0; t < CLIP_DAY_LENGTH; t++) if (clipDayCycle(t).light > clipDayCycle(noon).light) noon = t;\n    return {\n      skills: Object.values(CLIP_SKILLS).filter(d => !d.noDrop).map(d => ({\n        id: d.id, name: d.name, tags: [...d.tags], castMode: d.castMode ?? 'cast',\n        aiRange: d.ai?.range, concentration: !!d.concentration,\n        delivery: JSON.parse(JSON.stringify(d.delivery)) as unknown,\n        targeting: d.targeting ? JSON.parse(JSON.stringify(d.targeting)) as unknown : undefined,\n      })),\n      classes: CLASSES.map(c => ({ id: c.id, bar: c.bar.filter((b): b is string => !!b) })),\n      noon,\n    };\n  },\n  // Resolves once the boot's disk reconcile below has landed: a harness\n  // starts its run after it, or the reconcile re-seats the account under it.\n  hydrated: () => diskHydrated,\n  // FRAME TELEMETRY readout: the ring buffers as plain arrays, oldest-first\n  // (rAF gap = true pacing, sim ms, render ms). reset=true also clears —\n  // how the perf sweep separates a zone's entry burst from its steady state.\n  perfFrames: (reset = false) => {\n    const n = perfCount, start = (perfIdx - n + perfRingN) % perfRingN;\n    const out = {\n      gap: new Array<number>(n), sim: new Array<number>(n), ren: new Array<number>(n),\n      // Pushes since the last reset: pushed > gap.length means the ring\n      // WRAPPED and the window's oldest frames are gone (perfRingSize doc).\n      pushed: perfPushed,\n      // THE PHASE LEDGER's window-worst slab rides the same reset boundary\n      // as the rings, so a sweep window's slab is that window's alone.\n      phase: { name: phaseWorstName, ms: phaseWorstMs },\n    };\n    for (let i = 0; i < n; i++) {\n      const k = (start + i) % perfRingN;\n      out.gap[i] = perfGap[k]; out.sim[i] = perfSim[k]; out.ren[i] = perfRen[k];\n    }\n    if (reset) { perfIdx = 0; perfCount = 0; perfPushed = 0; phaseWorstName = ''; phaseWorstMs = 0; }\n    return out;\n  },\n  perfRingSize,\n  perfTickT0: () => perfTickT0,\n  perfSweep: (opts?: PerfSweepOpts) => perfSweep(opts),\n  devPanel: () => mountDevPanel(() => world),\n  // CRASH TRAP state — the ?crashtest negative control's probe surface (is the\n  // latch flipped, why are saves refusing, did the overlay rise, the ring).\n  crash: () => ({\n    fatal: crashFatal, suppressed: saveSuppressed(),\n    overlay: errorOverlayShown(), errors: [...crashRing],\n  }),\n};\n\n// THE WORKSHOP (meta/workshop.ts): graft dev-authored entities from the\n// localStorage mirror into the live registries BEFORE the content sweep, so\n// a custom def answers to the exact same boot lint as shipped content.\nloadWorkshopSync();\n// THE ATLAS (meta/atlas.ts): the Map Forge's authored maps, grafted the same\n// way — before the sweep, so a custom map answers to the same boot lint.\nloadAtlasSync();\n// Cross-check the data files; authoring mistakes warn instead of failing silently.\nvalidateContent();\n\n// DEV: the tabbed dev panel (config.ts DEV.panel). Off (0) = no-op. Runtime\n// opt-ins beside the source flag — `?dev` on the URL or localStorage\n// 'dev_panel'='1' — so QA can raise the panel on any dev serve without a\n// source edit (and __game.devPanel() mounts it live in a RUNNING session,\n// no reload: mountDevPanel is idempotent).\nconst devPanelOptIn = ((): boolean => {\n  try {\n    return new URLSearchParams(location.search).has('dev')\n      || localStorage.getItem(storageKey('dev_panel')) === '1';\n  } catch { return false; }\n})();\nif (DEV.panel || devPanelOptIn) mountDevPanel(() => world);\n// DEV: the passive-tree editor (config.ts DEV.passiveTreeEditor). Off (0) = no-op.\nif (DEV.passiveTreeEditor) mountPassiveEditor(ui);\n// DEV: the Entity Forge (config.ts DEV.entityForge) — start-menu button +\n// full-screen editor; the dev panel's Forge tab rides it too. Off (0) = no-op.\n// The Glyph Forge (draw kit-parts + doodad kinds) mounts SECOND so its\n// start-menu hook chains behind the Entity Forge's.\nif (DEV.entityForge) {\n  mountEntityForge(ui, () => world);\n  mountGlyphForge(ui, () => world);\n}\n// DEV: the Map Forge (config.ts DEV.mapForge) — start-menu button + full-screen\n// map editor; the dev panel's Maps tab rides it too. Mounts THIRD so its\n// start-menu hook chains behind the forges'. The `?dev` opt-in raises it as\n// well: the panel's Maps tab is its in-game door (the lab-tab ruling — the\n// tooling lives inside the dev panel, never behind a URL param of its own).\nif (DEV.mapForge || devPanelOptIn) mountMapForge(ui, () => world);\n\n// Boot: show the start menu immediately (built from the synchronous localStorage\n// loaders so it appears instantly), THEN reconcile against the disk files in the\n// background — the authoritative cross-session save. The disk loads warm the\n// shared account/settings refs and enable Continue if a disk character exists.\nui.showStartMenu(startPicked, resumeGame, openLobby, resumeRosterChar);\nui.setContinueSave(loadCharacter());          // instant: localStorage cache\nconst diskHydrated = (async (): Promise<void> => {\n  const bootRequest = resumeRequest;\n  const [a, s, c] = await Promise.all([loadAccountAsync(), loadSettingsAsync(), readCharacterContinueSummary()]);\n  Object.assign(account, a);                  // mutate-in-place: shared refs stay valid\n  reconcileClassBundleGems(account);\n  Object.assign(settings, s);\n  applyUiScale(settings.uiScale);             // the disk save may carry a different dial\n  if (bootRequest === resumeRequest) ui.setContinueSave(c); // a newer start/Continue owns the menu\n  ui.setStartMenuNotice(saveResetNotice());\n  // Workshop disk reconcile: the save file is the cross-session authority\n  // (another machine, a cleared browser profile). When it changed anything,\n  // re-run the content sweep so the adopted defs get linted too (rare — the\n  // mirror matches the disk in steady state, so no double warnings normally).\n  if (await reconcileWorkshopFromDisk()) validateContent();\n  if (await reconcileAtlasFromDisk()) validateContent();\n  // SELF-HEAL: release merc engagements whose patron no longer exists anywhere\n  // (a run save wiped without its death flow ever running).\n  if (healMercEngagements(account, [c?.charId, ...account.roster.map(r => r.charId)]) > 0) {\n    saveAccount(account);\n  }\n})();\n\n// THE RETURN after a reload (THE SMOOTH SHELL): a tab reloaded inside a hosted session's\n// window goes straight back to its seat (the token the page kept in sessionStorage) instead\n// of the start menu and a fresh join; a seat the world no longer holds lands on the menu.\n{\n  const back = rememberedShardSession();\n  if (back) {\n    const request = resumeRequest;\n    void (async () => {\n      await diskHydrated;\n      if (running || request !== resumeRequest) return; // a newer explicit route owns entry\n      try { await connectToShard(back.url, CLASSES[0].id, undefined, { resumeOnly: true }, request); }\n      catch (e) {\n        if (request !== resumeRequest || crossingCancelled(e)) return;\n        // THE RETURN (card 26 B, W7): the seat is gone (the reload grace ran out, a restart);\n        // a hero bound to this world logs back in where it logged out instead.\n        const route = continueRoute(await readCharacterContinueSummary().catch(() => null));\n        if (request !== resumeRequest) return;\n        if (route.kind === 'return' && sameWorld(route.home.url, back.url) && !running) { await returnToWorld(route.home, route.charId, request); return; }\n        toStartMenu(returnWord(worldNameOf(readDoor() ?? { url: back.url }), e instanceof Error ? e.message : ''));\n      }\n    })();\n  }\n}\n\n/** Read the OS into the LOCAL seat's intent for this frame (or null when there's\n *  nothing to drive — dead/downed, or the pause menu is up). Pure input capture;\n *  it no longer touches the world directly — World.applyInputs does that, for\n *  every seat uniformly. `aim` is converted to WORLD space here so it's\n *  camera-independent (the one value that must survive the wire). */\n/** DEV/QA: a scripted source for the LOCAL seat's intent (__game.devInput).\n *  While set it replaces the device read wholesale, so a harness drives\n *  casts through the real frame (the skill-clip capture's hands); null\n *  restores the devices. */\nlet devInputSource: ((dt: number) => PlayerInput | null) | null = null;\nfunction readLocalInput(dt: number): PlayerInput | null {\n  if (loadingScreen.active || loadingScreen.padQuarantined) return null;\n  if (!devInputSource && (world.player.dead || world.player.downed || ui.escapeMenuOpen || ui.couchJoinOpen)) return null;\n  // Select a pilot method before opening the finite query. A callback-capable\n  // method read may travel; the ensuing query belongs to the resulting body.\n  const pilot = devInputSource ? null : localPilot, poll = pilot?.poll;\n  const retained = net.isHost ? nativeClientRuntimeFor(world) : undefined;\n  return retained ? retained.readLocalInput((body, query) => readLocalInputFor(dt, body, query, pilot, poll))\n    : readLocalInputFor(dt, world.player, world, pilot, poll);\n}\nfunction readLocalInputFor(dt: number, p: World['player'], query: HeroInputQuery,\n  pilot: HeroInputSource | null, poll: HeroInputSource['poll'] | undefined): PlayerInput | null {\n  if (devInputSource) {\n    try {\n      const intent=devInputSource(dt);\n      assertScriptedInput(intent);\n      return intent;\n    } catch(error) {\n      devInputSource=null; // A failed harness read cannot poison later native frames.\n      throw error;\n    }\n  }\n  if (p.dead || p.downed) return null;\n  // The pause menu AND the couch join ceremony both take the hero's hands\n  // out of play (the world holds under either, solo — the timeflow law).\n  if (ui.escapeMenuOpen || ui.couchJoinOpen) return null;\n\n  if (pilot && poll) {\n    try {\n      const intent = Reflect.apply(poll, pilot, [p, query, dt]);\n      assertScriptedInput(intent);\n      return intent;\n    } catch (error) { localPilot = null; throw error; }\n  }\n  const kb = settings.keybinds;\n  const pb = settings.padBinds;\n  // While the menu pointer owns the pad, its buttons/sticks are UI gestures,\n  // not gameplay intent (Ⓐ under an inventory must never also swing a sword).\n  // The keyboard/mouse half keeps flowing either way.\n  const padLive = !padPointer.active;\n  const dialoguePadDown = (code: string): boolean => !dialoguePadHeld.has(code) && pad.isDown(code);\n  const dialoguePadPressed = (code: string): boolean => !dialoguePadHeld.has(code) && pad.justPressed(code);\n  // THE PRESSABLE BAR's press: armed on the mouse's down edge over a slot,\n  // released with the button. (CSS px = buffer px ÷ the render-scale seam.)\n  let barEdge = false;\n  if (input.lmbPressed) {\n    const cx = input.mouse.x / input.pointerScale, cy = input.mouse.y / input.pointerScale;\n    // THE PRESSABLE META first: the mini-button rides ABOVE its slot, so the\n    // two rects never overlap; a click there is an EDGE on the meta for the\n    // button's hold (withheld from the primary exactly like a slot press).\n    const metaHit = hudMetaSlotAt(cx, cy);\n    if (metaHit !== null) { barPress = { slot: metaHit, lock: null, meta: true }; barEdge = true; }\n    else {\n      const slotHit = hudSlotAt(cx, cy);\n      if (slotHit !== null) { barPress = { slot: slotHit, lock: null }; barEdge = true; }\n    }\n  }\n  if (barPress && !input.lmb) barPress = null;\n  let dx = 0, dy = 0;\n  if (input.keys.has(kb.moveUp) || (padLive && dialoguePadDown(pb.moveUp))) dy -= 1;\n  if (input.keys.has(kb.moveDown) || (padLive && dialoguePadDown(pb.moveDown))) dy += 1;\n  if (input.keys.has(kb.moveLeft) || (padLive && dialoguePadDown(pb.moveLeft))) dx -= 1;\n  if (input.keys.has(kb.moveRight) || (padLive && dialoguePadDown(pb.moveRight))) dx += 1;\n  // The move stick adds its ANALOG vector — deflection rides straight into\n  // moveActor, so half-tilt is a slow stalk without any new movement path.\n  if (padLive) { dx += pad.move.x; dy += pad.move.y; }\n  // INVERTED MOVEMENT (Settings.invertMove): the player's own standard,\n  // applied at the DEVICE layer — one flip for keys and stick alike,\n  // before intent enters the wire (southpaw swaps WHICH stick moves; this\n  // flips WHICH WAY movement goes). The widdershins hex flips again at the\n  // engine's one mover, so a by-choice inverted hero who is hexed plays\n  // STANDARD for the duration — two turns make a true; the XOR is the\n  // design, not an accident.\n  if (settings.invertMove) { dx = -dx; dy = -dy; }\n\n  // Aim: the mouse cursor — unless the pad owns the reticle (last device to\n  // speak wins). Pad aim is the stick's direction at deflection-scaled reach\n  // from the hero, STICKY on release so the reticle holds where you left it,\n  // then bent by the soft aim assist (engine/aimassist.ts) toward the held\n  // target. The assisted point IS the reticle the renderer draws — what you\n  // see is exactly what every castAtCursor skill receives.\n  let aim = renderer.toWorld(input.mouse);\n  if (aimSource === 'mouse' && mouseHandoff) {\n    // A live HANDOFF: the pad's reticle handed the mouse this offset — aim\n    // rides arrow+offset (melting in tick's motion block) so the switch\n    // never flips facing toward a stale, parked arrow.\n    aim = renderer.toWorld({\n      x: input.mouse.x + mouseHandoff.x,\n      y: input.mouse.y + mouseHandoff.y,\n    });\n    padAimView = { x: aim.x, y: aim.y, lockId: null };\n  }\n  if (aimSource === 'pad' && padLive) {\n    const t = padTuning();\n    const reach = pad.aimReach(pad.aimMag > 0 ? pad.aimMag : pad.lastAimMag, t);\n    const raw = { x: p.pos.x + pad.lastAimDir.x * reach, y: p.pos.y + pad.lastAimDir.y * reach };\n    // A zero-length frame (timer-resolution twins) must not re-run the\n    // assist: the corrected glide strength would be exactly 0, and a\n    // 0-strength assist reads as \"free aim\" — wiping the held lock and\n    // flickering the view to raw for one frame. Deliver last frame's point\n    // (buttons and movement below still read normally).\n    if (dt <= 0 && padAimView) {\n      aim = { x: padAimView.x, y: padAimView.y };\n    } else {\n      // Delivery mode (AIM_ASSIST_MODES; a held skill's def may someday\n      // override this per skill). In 'cursor' mode with the stick at rest\n      // the write-back below COMPOUNDS frame over frame — correct the blend\n      // so the settle/track rate matches strength-per-frame at glideRefHz on\n      // any monitor. A live stick frame is absolute (no compounding).\n      const mode = settings.pad.assistMode;\n      const sBase = settings.pad.aimAssist;\n      const strength = (mode === 'cursor' && pad.aimMag === 0 && sBase < 1)\n        ? 1 - Math.pow(1 - sBase, dt * AIM_ASSIST.glideRefHz)\n        : sBase;\n      const assisted = assistAim(query, p, raw, padLock, strength);\n      padLock = assisted.targetId;\n      aim = { x: assisted.x, y: assisted.y };\n      if (mode === 'cursor' && padLock !== null) {\n        // THE ASSIST MOVES THE CURSOR: fold the assisted point back into the\n        // pad's sticky aim, so a broken lock (death, dash, wall) or a device\n        // switch continues from where the reticle visibly is — never a snap\n        // back to the pre-assist raw point. Hero-relative dir + reach is the\n        // sticky aim's native space; reach inversion clamps to the player's\n        // envelope (a target hugging the hero parks the cursor at min reach\n        // in its direction — direction, and so facing, is always preserved).\n        const dx = aim.x - p.pos.x, dy = aim.y - p.pos.y;\n        const dist = Math.hypot(dx, dy);\n        if (dist > 1e-3) {\n          const mag = (dist - t.aimMinRadius) / Math.max(1, t.aimMaxRadius - t.aimMinRadius);\n          pad.setStickyAim({ x: dx / dist, y: dy / dist }, mag);\n        }\n      }\n      padAimView = { x: aim.x, y: aim.y, lockId: padLock };\n    }\n  }\n\n  // THE PRESSABLE BAR's aim: the cursor sits on the bar, so the press aims\n  // where the hero FACES at the pad's mid reach, bent by the assist at full\n  // strength (the held lock persists across the press, the pad's own law).\n  if (barPress && !(aimSource === 'pad' && padLive)) {\n    const t = padTuning();\n    const reach = pad.aimReach(0.5, t);\n    const raw = { x: p.pos.x + Math.cos(p.facing) * reach, y: p.pos.y + Math.sin(p.facing) * reach };\n    const assisted = assistAim(query, p, raw, barPress.lock, 1);\n    barPress.lock = assisted.targetId;\n    aim = { x: assisted.x, y: assisted.y };\n  }\n\n  // Slots 0/1 are LMB/RMB (fixed) — on a pad they're ordinary binds; slots\n  // 2–7 merge the rebindable keys with their pad buttons. Keyboard OR pad,\n  // per slot, per frame — the intent downstream can't tell which spoke.\n  const slotActs = [\n    'skillSlot0', 'skillSlot1', 'skillSlot2', 'skillSlot3',\n    'skillSlot4', 'skillSlot5', 'skillSlot6', 'skillSlot7',\n  ] as const;\n  const skillKeys = [kb.skillSlot2, kb.skillSlot3, kb.skillSlot4, kb.skillSlot5, kb.skillSlot6, kb.skillSlot7];\n  const held = [\n    (input.lmb && !barPress) || (padLive && dialoguePadDown(pb.skillSlot0)),\n    input.rmb || (padLive && dialoguePadDown(pb.skillSlot1)),\n    ...skillKeys.map((k, i) => input.keys.has(k) || (padLive && dialoguePadDown(pb[slotActs[i + 2]]))),\n  ];\n  const edge = [\n    (input.lmbPressed && !barPress) || (padLive && dialoguePadPressed(pb.skillSlot0)),\n    input.rmbPressed || (padLive && dialoguePadPressed(pb.skillSlot1)),\n    ...skillKeys.map((k, i) => {\n      const fromKey = input.justPressed(k);\n      const fromPad = padLive && dialoguePadPressed(pb[slotActs[i + 2]]);\n      return fromKey || fromPad;\n    }),\n  ];\n  // THE PRESSABLE BAR lands on its slot: held for the button's whole hold,\n  // an edge on the frame it went down (the same shape a key delivers).\n  let metaClick: number | null = null;\n  if (barPress && barPress.slot < held.length) {\n    if (barPress.meta) {\n      // A meta click is an EDGE on the mini-button: no hold, no primary.\n      if (barEdge) metaClick = barPress.slot;\n    } else {\n      held[barPress.slot] = true;\n      if (barEdge) edge[barPress.slot] = true;\n    }\n  }\n  // THE UNARMED-FLOOR opt-out (Settings.improvisedStrike): declined, an\n  // EMPTY slot's press never leaves this client — the world's floor rule\n  // (World.applyInputs' null-slot branch) stays universal; the refusal is\n  // local input-shaping, exactly like a keybind. Each co-op peer's setting\n  // shapes only their own hands.\n  if (!settings.improvisedStrike) {\n    for (let i = 0; i < held.length; i++) {\n      if (!p.skills[i]) { held[i] = false; edge[i] = false; }\n    }\n  }\n  // THE PRESSABLE META's landing: the clicked mini-button fires its slot's\n  // meta as an edge — the modifier lane's exact shape, no modifier needed.\n  if (metaClick !== null) {\n    const metaEdge = edge.map(() => false);\n    metaEdge[metaClick] = true;\n    return { dx, dy, aim, held, edge: edge.map(() => false), metaEdge };\n  }\n  // The META layer (rebindable; shift by default): modifier+slot fires the\n  // slot skill's META-ACTION (Detonate / Enrage / Thrust!) INSTEAD of a new\n  // press. HELD states survive the modifier — a raised guard or a running\n  // channel must NOT drop because you reached for the meta button (the\n  // shield-bash-on-shift bug); only fresh EDGES reroute.\n  const metaKey = kb.metaModifier ?? 'shift';\n  const metaEdgePressed = input.justPressed(metaKey)\n    || (padLive && dialoguePadPressed(pb.metaModifier));\n  if (input.keys.has(metaKey) || (padLive && dialoguePadDown(pb.metaModifier))) {\n    const metaEdge = edge.map(() => false);\n    for (let i = 0; i < edge.length; i++) if (edge[i]) metaEdge[i] = true;\n    // HELD-CAST META (Phalanx while Shield Up): you can't re-press a\n    // button you're already HOLDING — so during a held cast (guard /\n    // channel / charge / overcharge), pressing the MODIFIER ALONE fires\n    // the HELD skill's meta. Scoped to exactly that slot: three channel\n    // skills on the bar never fire three metas — only the one in hand.\n    if (metaEdgePressed && p.casting\n      && ['guard', 'channel', 'charge', 'overcharge', 'concentration'].includes(p.casting.mode)) {\n      const ci = p.skills.findIndex(s => s === p.casting!.inst);\n      if (ci >= 0) metaEdge[ci] = true;\n    }\n    return { dx, dy, aim, held, edge: edge.map(() => false), metaEdge };\n  }\n  return { dx, dy, aim, held, edge };\n}\n\n/** LOCAL-only UI input (the pause menu + panel toggles). Kept out of the intent\n *  pipeline — these are this client's screen, never gameplay sent to the host. */\nfunction handleLocalPanels(): void {\n  pressTheRelease(); // THE RELEASE (card 28): a downed hero on a hosted world gives up the wait\n  // Dead/downed suppresses ALL local UI input, exactly as the old single input\n  // handler did (`if (p.dead) return`) — so escape/panels can't pop over the\n  // death screen. (A downed local hero in co-op likewise can't toggle panels.)\n  if (world.player.dead || world.player.downed) return;\n  const kb = settings.keybinds;\n  if (dialogue.open && !padPointer.active) {\n    const next = settings.padBinds.dialogueAdvance, back = PAD_CFG.pointer.cancel;\n    const cancel = next !== back && pad.justPressed(back);\n    const advance = pad.justPressed(next);\n    if (cancel) dialoguePadHeld.add(back);\n    if (advance) dialoguePadHeld.add(next);\n    if (cancel) dialogue.close();\n    else if (advance) dialogue.advance();\n  }\n  // Escape toggles the pause/menu (hardwired — never rebindable). While it's up,\n  // gameplay intent is suppressed (readLocalInput returns null). An open DWELL\n  // dialog (caravan / toll / sail) is dismissed FIRST and the press stops there —\n  // Esc on a dialog means \"close this\", not \"pause the game on top of it\".\n  // ESCAPE is a strict, predictable CASCADE — every press does exactly ONE\n  // legible thing, in order of how \"modal\" the thing is:\n  //   0. a running crafting minigame owns the screen (Esc waits it out),\n  //   1. the pause menu closes,\n  //   2. an open DWELL dialog dismisses (their closes carry semantics —\n  //      closing the vocation offer DECLINES it; one dialog per press),\n  //   3. ordinary windows (sheet/map/inventory with its pages) all clear —\n  //      Esc here means \"give me my screen back\", NEVER \"pause on top\",\n  //   4. a clear screen: NOW Esc is the pause menu.\n  // THE ESCAPE POLICY (ui/escapeConfig.ts, Settings.escapeCloses) may fold\n  // steps 2–3 into ONE sweep; the modal steps above them never change.\n  if (input.justPressed('escape')) {\n    if (ui.minigameRunning()) return;\n    // THE FORGE's step-away (the steady hand): a tracing hand's Esc cancels\n    // the trace — the writ endures — before any menu opens over the bench.\n    if (world.traceActive(world.localSeat.id)) { world.requestMeta({ t: 'forgeCancel' }); return; }\n    if (ui.escapeMenuOpen) { ui.hideEscapeMenu(); return; }\n    // The couch join overlay dismisses like any dialog — one press, gone.\n    if (ui.couchJoinOpen) { closeCouchJoin(); return; }\n    if (dialogue.open && dialogue.close()) return;\n    // COUCH: the hero's Esc walks ITS OWN cascade — a guest's open panels\n    // are the guest's business (their Ⓑ walks theirs). Solo falls through\n    // to the classic global cascade below, byte-identically.\n    // THE MENU BAR's tray folds first — it is the topmost, lightest surface.\n    if (ui.menuTrayClose()) return;\n    if (couchActive()) {\n      if (!ui.escCascadeFor(world.localSeat.id)) ui.showEscapeMenu();\n      return;\n    }\n    if (ui.cancelSalvageMode(world.localSeat.id)) return;\n    // THE ESCAPE POLICY (ui/escapeConfig.ts): a sweep mode clears the whole\n    // screen in one press — every book through its leaves' own closes, the\n    // dialog belt, the ordinary panels (a kept page last) — and pauses only\n    // a clear screen; 'step' walks the classic cascade below.\n    const escMode = escapeModeOf(settings.escapeCloses);\n    if (escMode.id !== 'step') {\n      if (ui.escapeSweep(world.localSeat.id, escMode.keep)) return;\n      ui.hideAll();\n      ui.showEscapeMenu();\n      return;\n    }\n    // THE FOLIO (ui/folio.ts): a book closes its FRONT leaf first — the one\n    // on screen — through that leaf's own close; the fixed list below stays\n    // as the belt for any dialog not enrolled.\n    if (ui.folioCloseFront()) return;\n    if (ui.caravanOpen) { ui.closeCaravan(); return; }\n    if (ui.vendorOpen) { ui.closeVendor(); return; }\n    if (ui.salvageOpen) { ui.closeSalvage(); return; }\n    if (ui.fontOpen) { ui.closeFont(); return; }\n    if (ui.oracleOpen) { ui.closeOracle(); return; }\n    if (ui.bestiaryOpen) { ui.closeBestiary(); return; }\n    if (ui.sailOpen) { ui.closeSail(); return; }\n    if (ui.bountiesOpen) { ui.closeBounties(); return; }\n    if (ui.mercOpen) { ui.closeMercMenu(); return; }\n    if (ui.boroughOpen) { ui.closeBorough(); return; }\n    // The vocation choice menu closes through its OWN close (not hideAll):\n    // closeVocationMenu also DECLINES the offer, else the dwell re-pops the\n    // menu the instant the pause menu comes down.\n    if (ui.vocationOpen) { ui.closeVocationMenu(); return; }\n    if (ui.anyPanelOpen()) { ui.hideAll(); return; }\n    ui.hideAll();\n    ui.showEscapeMenu();\n    return;\n  }\n  if (ui.escapeMenuOpen) return;\n  if (!ui.blockingFor(world.localSeat.id) && (input.justPressed(kb.townPortal) || (!padPointer.active && pad.justPressed(settings.padBinds.townPortal)))) {\n    world.requestMeta({ t: 'townPortal' });\n  }\n  // THE COMPANION STANCE (engine/companionStances.ts): one press walks every\n  // bonded beast's conduct on the bar — host-judged like every meta intent.\n  if (!ui.blockingFor(world.localSeat.id) && (input.justPressed(kb.companionStance)\n    || (!padPointer.active && pad.justPressed(settings.padBinds.companionStance)))) {\n    world.requestMeta({ t: 'companionStance' });\n  }\n  // THE PING (card 17 A — engine/pings.ts, data/identityCues.ts PING_CUE): mark the\n  // ground under the aim for your party — host-judged like every meta intent; the\n  // pad's reticle when it owns the aim, else the mouse.\n  if (!ui.blockingFor(world.localSeat.id) && (input.justPressed(kb.ping)\n    || (!padPointer.active && pad.justPressed(settings.padBinds.ping)))) {\n    const at = renderer.padAim ?? renderer.toWorld(input.mouse);\n    world.requestMeta({ t: 'ping', x: at.x, y: at.y });\n  }\n  // Panel toggles answer to key OR pad bind — and the pad ones deliberately\n  // stay live in pointer mode (the D-pad flips panels while browsing them).\n  const pb = settings.padBinds;\n  if (input.justPressed(kb.panelChar) || pad.justPressed(pb.panelChar)) ui.toggleCharSheet();\n  if (input.justPressed(kb.panelTree) || pad.justPressed(pb.panelTree)) ui.toggleTree();\n  if (input.justPressed(kb.panelSkills) || pad.justPressed(pb.panelSkills)) ui.toggleBuildPanel();\n  if (input.justPressed(kb.panelMap) || pad.justPressed(pb.panelMap)) ui.toggleMap();\n  if (input.justPressed(kb.panelInv) || pad.justPressed(pb.panelInv)) ui.toggleInventory();\n  // THE MENU BAR's tray (ui/menubar.ts): the bind fans the pages. Its\n  // default key is Tab, which THE FOLIO also walks while a book of two or\n  // more leaves stands — the walk wins then (folioWalkArmed).\n  if ((input.justPressed(kb.panelMenu) || pad.justPressed(pb.panelMenu)) && !ui.folioWalkArmed()) ui.toggleMenu();\n  // GEAR pickup — a META intent (host-validated, co-op-replicated), not raw\n  // world poking; the open bag re-renders so the grab appears instantly.\n  if (input.justPressed(kb.pickup) || pad.justPressed(pb.pickup)) {\n    world.requestMeta({ t: 'pickupItem' });\n    if (ui.inventoryOpen) ui.refreshInventory();\n  }\n}\n\n/** Spawn a local stand-in ally (scripted: follow + auto-attack) to exercise the\n *  multi-seat co-op path without networking. Dev-only, gated by `?coop` or the\n *  `__game.addAlly()` console hook. Picks a class different from the local hero. */\nfunction spawnCoopAlly(): void {\n  if (world.seats.length >= 5) return;\n  const own = world.localSeat.meta.classDef;\n  const cls = CLASSES.find(c => c !== own) ?? own;\n  const id = 'p' + world.seats.length;\n  if (net instanceof LocalTransport) net.addLocalSeat({ id, name: cls.name, classId: cls.id });\n  // `?coophuman` makes the second seat a LOCAL HUMAN on the arrow keys (test co-op\n  // move/cast in one tab); otherwise it's a scripted follow-and-fight ally.\n  world.addSeat(id, cls, COOP_HUMAN ? new LocalCoopInput(input.keys) : new ScriptedInput());\n}\n\n// ---------------------------------------------------------------------------\n// THE COUCH SESSION (data/couch.ts) — a second LOCAL player on this screen.\n// A guest is an ordinary Seat: its intent is a PadSeatInput on a claimed pad,\n// its panels dock to its flank, its vessel (immortal lane) persists to its\n// own roster slot. Everything here short-circuits to nothing with no guests\n// seated — the solo invariant. main.ts owns the session (the world owns only\n// the seats), exactly as it owns the net transport.\n// ---------------------------------------------------------------------------\ninterface CouchGuestCtx {\n  seatId: string;\n  /** The claimed pad slot; -1 while the device is LOST (identity sweep). */\n  padIdx: number;\n  /** Device identity captured at claim — the re-bind's match key. */\n  padId: string | null;\n  /** Census snapshot from the frame the bound pad vanished: slots already\n   *  standing then may never be adopted (findRebindSlot's newcomer rule).\n   *  Undefined while the pad is alive. */\n  lostSeen?: Set<number>;\n  gpad: PadState;\n  source: PadSeatInput;\n  pointer: PadPointer;\n  /** Immortal-lane vessel context: the roster slot + the join-time save\n   *  (its dormant menagerie rides back out verbatim at persist). */\n  vessel?: { slot: number; save: CharacterSave };\n}\nconst couchGuests = new Map<string, CouchGuestCtx>();\nconst couchPadSet = new Set<number>();\nconst couchClaim = new CouchClaimSession(pad);\nconst couchOverlay = new CouchJoinOverlay();\nlet couchClaimPad: number | null = null;\nlet couchClaimId: string | null = null;\n/** A saved pick belongs to this ceremony, controller claim and run. */\nlet couchJoinGeneration = 0;\nlet couchSeatSerial = 0;\n/** Last frame's connected-pad census — the pause menu's couch row re-renders\n *  the moment it moves (a controller is invisible to the browser until its\n *  first button press; the row asks for that press, so it must reward it). */\nlet couchPadCensus = -1;\n\nfunction couchActive(): boolean { return couchGuests.size > 0; }\n\n// The hero's merged pad read skips claimed guest pads (null = byte-identical\n// classic read while no guest is seated).\npad.padExclude = () => (couchPadSet.size ? couchPadSet : null);\n\n/** A guest's gameplay parks while a global surface is up or its own pointer\n *  owns its pad (its panels are open) — the guest twin of P1's padLive gate. */\nfunction couchGuestSuspended(id: string): boolean {\n  const g = couchGuests.get(id);\n  return !g || ui.escapeMenuOpen || ui.couchJoinOpen || g.pointer.active;\n}\n\n/** THE IDENTITY RE-BIND (per guest, per frame): a claimed pad that vanishes\n *  (Bluetooth sleep, Steam Input device churn) releases its slot back to the\n *  hero's pool and parks the seat — the flank HUD says so — and when a pad\n *  wearing the SAME device id arrives at a NEWCOMER slot, the seat follows\n *  it there by itself (net/couch.ts findRebindSlot owns the match law). */\nfunction couchGuestPadSweep(g: CouchGuestCtx): void {\n  const atBound = g.padIdx >= 0 ? padIdAt(g.padIdx) : null;\n  if (atBound !== null && (g.padId === null || atBound === g.padId)) {\n    g.lostSeen = undefined; // the claimed device stands where we left it\n    return;\n  }\n  if (g.padIdx >= 0) {\n    // First frame of loss — or a STRANGER at the bound slot (that slot may\n    // be P1's own controller returning; the hero's roam must be free to\n    // take it). Release the claim and snapshot the census: only a slot\n    // appearing AFTER this moment may re-bind.\n    couchPadSet.delete(g.padIdx);\n    g.padIdx = -1;\n    g.gpad.padIndex = -1; // a bound read at -1 reads nothing — the seat parks\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (seat?.couch) seat.couch.pad = -1;\n    g.lostSeen = new Set(connectedPadIndices());\n  }\n  const slot = findRebindSlot(g.padId, g.lostSeen ?? new Set(), couchPadSet);\n  if (slot !== null) {\n    g.padIdx = slot;\n    g.gpad.padIndex = slot;\n    couchPadSet.add(slot);\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (seat?.couch) seat.couch.pad = slot;\n    g.lostSeen = undefined;\n  }\n}\n\n/** THE LANE LAW: the guest joins the run's OWN lane — an immortal run seats\n *  another vessel from this account's roster (a second immortal slot must be\n *  unlocked); a mortal run seats a fresh, disposable hero (the net join's\n *  Tier-0 idiom). */\nfunction couchLaneImmortal(): boolean { return modeById(world.meta.modeId).save === 'roster'; }\n\nfunction couchChoices(): CouchJoinChoice[] {\n  if (!couchLaneImmortal()) {\n    return CLASSES.filter(c => isClassUnlocked(account, c.id)).map(c => ({\n      key: 'class:' + c.id, title: c.name, sub: c.description, color: c.color,\n    }));\n  }\n  const mode = modeById(world.meta.modeId);\n  if (rosterCapacity(account, mode) < COUCH_CFG.join.immortalSlotsNeeded) {\n    return [{\n      key: 'none', title: 'A second Immortal slot is required', color: '#8a8678', sub: '',\n      disabled: 'Unlock another Immortal vessel slot in the Vault to bring a second vessel to the couch.',\n    }];\n  }\n  // THE FALLEN LOCK: a fallen vessel cannot couch-join — the covenant gates\n  // every entry into play, not just the solo resume.\n  const rows = account.roster.filter(r =>\n    r.modeId === mode.id && r.charId !== world.meta.charId && !r.fallen);\n  if (!rows.length) {\n    const fallenOnly = account.roster.some(r =>\n      r.modeId === mode.id && r.charId !== world.meta.charId && r.fallen);\n    return [{\n      key: 'none', color: '#8a8678', sub: '',\n      title: fallenOnly ? 'Every other vessel lies fallen' : 'No second vessel sworn',\n      disabled: fallenOnly\n        ? 'Resurrect a vessel in the Vault first — a fallen Immortal cannot take the couch.'\n        : 'Swear another Immortal from the start menu first — the couch seats an existing vessel.',\n    }];\n  }\n  return rows.map(r => ({\n    key: 'vessel:' + r.charId,\n    title: `${r.name} — Level ${r.level}`,\n    sub: `${CLASSES.find(c => c.id === r.classId)?.name ?? r.classId} · ${mode.name}`,\n    color: mode.color,\n  }));\n}\n\nfunction couchJoinView(): CouchJoinView {\n  const lane = couchLaneImmortal()\n    ? 'Immortal run — a second VESSEL from this account joins.'\n    : 'Mortal run — a fresh hero joins for this run (the run is the character).';\n  return couchClaimPad === null\n    ? {\n      phase: 'claim', lane,\n      message: 'Press Ⓐ on the JOINING controller to claim it.',\n      choices: [], onPick: () => { /* no choices yet */ }, onCancel: closeCouchJoin,\n    }\n    : {\n      phase: 'pick', lane,\n      message: `Controller ${couchClaimPad + 1} claimed — choose who joins.`,\n      choices: couchChoices(), onPick: couchJoin, onCancel: closeCouchJoin,\n    };\n}\n\nfunction openCouchJoin(): void {\n  if (!running || !net.isHost || !(net instanceof LocalTransport)) return;\n  if (world.couchSeats().length >= COUCH_CFG.join.maxLocal - 1) return;\n  couchJoinGeneration++;\n  couchClaimPad = null;\n  couchClaimId = null;\n  // Freeze the hero's roaming read where it stands: the claim scan and the\n  // roam must never race for the joining pad's first press (the Deck bug —\n  // the roam adopted the press and the scan then excluded it, forever).\n  couchClaim.arm(couchPadSet);\n  ui.couchJoinOpen = true;\n  // The ceremony is a menu: solo holds the world (the allowHold policy — a\n  // live couch keeps running, exactly like the pause law).\n  world.timeflow.holdSurface('menu:couchJoin');\n  couchOverlay.show(couchJoinView());\n}\n\nfunction closeCouchJoin(): void {\n  couchJoinGeneration++;\n  ui.couchJoinOpen = false;\n  couchClaimPad = null;\n  couchClaimId = null;\n  couchClaim.release();\n  world.timeflow.release('menu:couchJoin');\n  couchOverlay.hide();\n}\n\n/** Mint the guest seat: transport peer + PadState bound to the claimed pad +\n *  the PadSeatInput source + a pointer of its own, flank-tagged. */\nfunction mintCouchSeat(padIdx: number, cls: ClassDef, vessel?: CouchGuestCtx['vessel']): Seat | null {\n  if (!(net instanceof LocalTransport)) return null;\n  const id = 'c' + (++couchSeatSerial);\n  net.addLocalSeat({ id, name: vessel?.save.name ?? cls.name, classId: cls.id });\n  const gpad = new PadState(padTuning);\n  gpad.padIndex = padIdx;\n  const source = new PadSeatInput(gpad, {\n    tuning: padTuning,\n    binds: () => settings.padBinds,\n    assist: () => ({ mode: settings.pad.assistMode, strength: settings.pad.aimAssist }),\n    improvisedStrike: () => settings.improvisedStrike,\n    invertMove: () => settings.invertMove,\n    suspended: () => couchGuestSuspended(id),\n  });\n  const seat = world.addSeat(id, cls, source, { startingCompanions: !vessel, startingFlasks: !vessel });\n  const side = COUCH_CFG.join.sides[\n    Math.min(COUCH_CFG.join.sides.length - 1, world.couchSeats().length + 1)] ?? 'right';\n  seat.couch = { pad: padIdx, side };\n  const pointer = new PadPointer(gpad, padTuning);\n  pointer.onCancel = () => couchGuestCancel(id);\n  couchGuests.set(id, { seatId: id, padIdx, padId: padIdAt(padIdx), gpad, source, pointer, vessel });\n  couchPadSet.add(padIdx);\n  return seat;\n}\n\n/** The pick handler: 'class:<id>' seats a fresh mortal-lane hero; 'vessel:\n *  <charId>' loads + grafts the roster vessel (async disk-first read). */\nfunction couchJoin(pick: string): void {\n  if (couchClaimPad === null) return;\n  const padIdx = couchClaimPad;\n  if (pick.startsWith('class:')) {\n    const cls = CLASSES.find(c => c.id === pick.slice('class:'.length));\n    if (cls) mintCouchSeat(padIdx, cls);\n    closeCouchJoin();\n    return;\n  }\n  if (!pick.startsWith('vessel:')) return;\n  const charId = pick.slice('vessel:'.length);\n  const entry = account.roster.find(r => r.charId === charId);\n  if (!entry) { closeCouchJoin(); return; }\n  const request = ++couchJoinGeneration;\n  const joiningWorld = world, joiningNet = net;\n  const slot = entry.slot, modeId = entry.modeId, classId = entry.classId;\n  const hostCharId = joiningWorld.meta.charId, claimId = couchClaimId;\n  const ceremonyCurrent = (): boolean => request === couchJoinGeneration\n    && running && world === joiningWorld && net === joiningNet\n    && joiningNet instanceof LocalTransport && ui.couchJoinOpen\n    && couchClaimPad === padIdx && claimId !== null && couchClaimId === claimId\n    && padIdAt(padIdx) === claimId && !couchPadSet.has(padIdx);\n  const vesselCurrent = (): boolean => account.roster.includes(entry)\n    && entry.charId === charId && entry.slot === slot && entry.modeId === modeId\n    && entry.classId === classId && !entry.fallen\n    && joiningWorld.meta.charId === hostCharId && charId !== hostCharId\n    && joiningWorld.meta.modeId === modeId && modeById(modeId).save === 'roster'\n    && rosterCapacity(account, modeById(modeId)) >= COUCH_CFG.join.immortalSlotsNeeded\n    && joiningWorld.couchSeats().length < COUCH_CFG.join.maxLocal - 1;\n  if (!ceremonyCurrent() || !vesselCurrent()) { closeCouchJoin(); return; }\n  void (async (): Promise<void> => {\n    const save = await loadRosterSave(slot);\n    // A retired/replaced ceremony may not mint a seat OR close its successor.\n    if (!ceremonyCurrent()) return;\n    if (!vesselCurrent()) { closeCouchJoin(); return; }\n    const built = save && rebuildSavedMeta(save);\n    const cls = save && CLASSES.find(c => c.id === save.classId);\n    if (!save || !built || !cls || save.classId !== classId || built.meta.modeId !== modeId\n      || (save.charId && save.charId !== charId)) { closeCouchJoin(); return; }\n    if (!ceremonyCurrent()) return;\n    if (!vesselCurrent()) { closeCouchJoin(); return; }\n    const seat = mintCouchSeat(padIdx, cls, { slot, save });\n    if (seat) {\n      world.adoptSeatMeta(seat, built.meta, save.bar, save.level);\n      seat.couchDeaths = built.deaths;\n      if (!seat.meta.charId) seat.meta.charId = entry.charId;\n      seat.couch!.charId = seat.meta.charId;\n      seat.couch!.rosterSlot = entry.slot;\n    }\n    closeCouchJoin();\n  })();\n}\n\n/** Persist every seated guest VESSEL to its own roster slot (the persistRun\n *  sibling; disposable mortal-lane guests carry nothing to save). */\nfunction persistCouchGuests(durable = false): void {\n  for (const g of couchGuests.values()) {\n    if (!g.vessel) continue;\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (!seat) continue;\n    saveCouchGuest(account, world, seat, g.vessel.slot, g.vessel.save, durable);\n  }\n}\n\n/** A guest leaves mid-run (the escape row): vessel saved, seat removed, pad\n *  released — the frame narrows back to the hero on its own smoothing. */\nfunction couchLeave(id: string): void {\n  const g = couchGuests.get(id);\n  if (!g) return;\n  persistCouchGuests();\n  world.removeSeat(id);\n  if (net instanceof LocalTransport) net.removeLocalSeat(id);\n  g.pointer.dispose();\n  couchGuests.delete(id);\n  couchPadSet.delete(g.padIdx);\n  renderer.couchAims = [];\n  renderer.couchPadLost = [];\n}\n\n/** Tear the whole couch session down (run end / menu). Persistence is the\n *  CALLER's duty first — this only drops the session machinery. */\nfunction couchReset(): void {\n  couchJoinGeneration++;\n  for (const g of couchGuests.values()) g.pointer.dispose();\n  couchGuests.clear();\n  couchPadSet.clear();\n  renderer.couchAims = [];\n  renderer.couchPadLost = [];\n  if (ui.couchJoinOpen) closeCouchJoin();\n}\n\n/** The guest's Ⓑ/cancel cascade — their panels first, then the shared pause. */\nfunction couchGuestCancel(id: string): void {\n  if (ui.couchJoinOpen) { closeCouchJoin(); return; }\n  if (ui.escCascadeFor(id)) return;\n  synthEscape();\n}\n\n/** Per-frame couch work, right after the hero's own device poll: guest pads\n *  poll on the same wall clock, guest pointers wake on THEIR OWN blocking\n *  surfaces, the join overlay runs its claim scan, and the renderer gets the\n *  guests' reticles in their class tints. No guests = nothing. */\nfunction couchTick(dt: number, nowSec: number): void {\n  for (const g of couchGuests.values()) {\n    couchGuestPadSweep(g);\n    g.gpad.poll(nowSec);\n    g.pointer.update(dt, ui.blockingFor(g.seatId) || !running, nowSec);\n    // Guest START = the shared pause (either player may pause the couch).\n    if (g.gpad.justPressed(PAD_CFG.escapeButton)) synthEscape();\n  }\n  // The pause menu's couch row gates on the pad census — re-render it live\n  // as controllers announce themselves (a pad is invisible to the browser\n  // until its first button press; the disabled row asks for exactly that\n  // press, so the press must enable the row while the menu still shows).\n  const census = connectedPadIndices().length;\n  if (census !== couchPadCensus) {\n    couchPadCensus = census;\n    if (ui.escapeMenuOpen) ui.refreshEscapeCouchRow();\n  }\n  if (ui.couchJoinOpen) {\n    if (couchClaimPad !== null && (padIdAt(couchClaimPad) !== couchClaimId\n      || couchPadSet.has(couchClaimPad))) {\n      // Losing the selected device ends its pending pick, even if the same\n      // controller later returns at that slot. Its next press must claim anew.\n      couchJoinGeneration++;\n      couchClaimPad = null;\n      couchClaimId = null;\n      couchClaim.arm(couchPadSet);\n    }\n    if (couchClaimPad === null) {\n      const hit = couchClaim.scan(COUCH_CFG.join.claimButton, couchPadSet);\n      if (hit !== null) { couchClaimPad = hit; couchClaimId = padIdAt(hit); }\n    }\n    couchOverlay.update(couchJoinView());\n  }\n  if (couchGuests.size) {\n    // The flank banner: seats whose CONTROLLER left (identity sweep above).\n    renderer.couchPadLost = [...couchGuests.values()]\n      .filter(g => g.padIdx < 0).map(g => g.seatId);\n    renderer.couchAims = [...couchGuests.values()].flatMap(g => {\n      const seat = world.seats.find(s => s.id === g.seatId);\n      const a = g.source.aimView();\n      return seat && a && !seat.actor.dead && !seat.actor.downed\n        ? [{ x: a.x, y: a.y, lockId: a.lockId, color: seat.meta.classDef.color }] : [];\n    });\n  }\n}\n\n/** Guest panel toggles + pickup, off the guest's OWN pad binds — the couch\n *  twin of handleLocalPanels (host branch only; guests exist only there). */\nfunction handleCouchPanels(): void {\n  if (ui.escapeMenuOpen || ui.couchJoinOpen) return;\n  const pb = settings.padBinds;\n  for (const g of couchGuests.values()) {\n    const seat = world.seats.find(s => s.id === g.seatId);\n    if (!seat || seat.actor.dead || seat.actor.downed) continue;\n    if (!g.pointer.active && g.gpad.justPressed(pb.townPortal)) world.applyAction(seat, { t: 'townPortal' });\n    if (!g.pointer.active && g.gpad.justPressed(pb.companionStance)) world.applyAction(seat, { t: 'companionStance' });\n    if (g.gpad.justPressed(pb.panelChar)) ui.toggleCharSheet(g.seatId);\n    if (g.gpad.justPressed(pb.panelTree)) ui.toggleTree(g.seatId);\n    if (g.gpad.justPressed(pb.panelSkills)) ui.toggleBuildPanel(g.seatId);\n    if (g.gpad.justPressed(pb.panelMap)) ui.toggleMap();\n    if (g.gpad.justPressed(pb.panelInv)) ui.toggleInventory(g.seatId);\n    if (g.gpad.justPressed(pb.pickup)) {\n      world.applyAction(seat, { t: 'pickupItem' });\n      if (ui.inventoryOpen) ui.refreshInventory();\n    }\n  }\n}\n\n// --- THE CARAVAN's three seams (engine/world.ts updateCaravan) ---------------\n// The dwell is seat-scoped and the travel is host-authoritative, so every road\n// out of the Caravanner ends in the SAME caravanTo intent — the host mints the\n// route and loads the party, whoever asked.\n\n/** Ask the escort for band N (0 = home) for whichever LOCAL seat lingered.\n *  ALWAYS the intent lane, never startCaravan directly: on a co-op CLIENT\n *  requestMeta forwards caravanTo and applies nothing locally (a render shell\n *  never mints or loads a zone), and host-side a couch guest's ask must land on\n *  the GUEST's seat — startCaravan re-checks proximity per seat, so routing a\n *  guest's dwell through the distant hero would simply refuse. Solo the dwell\n *  seat IS the local seat: one requestMeta, exactly as before. */\nfunction caravanTo(band: number): void {\n  const seat = world.seats.find(s => s.id === world.caravanDwellSeatId);\n  if (seat?.couch) world.applyAction(seat, { t: 'caravanTo', band });\n  else world.requestMeta({ t: 'caravanTo', band });\n}\n\n/** The Caravanner's TOWN answer: open the band menu on the seat that lingered. */\nfunction pollCaravanMenu(): void {\n  if (world.caravanDwellRequested && !ui.escapeMenuOpen) {\n    world.caravanDwellRequested = false;\n    if (!ui.caravanOpen) ui.showCaravan(world.caravanDwellSeatId);\n  }\n}\n\n/** The Caravanner's WILDS answer: port straight home, no menu (so nothing pops\n *  up mid-combat) — through the intent, so a client's return works too. */\nfunction pollCaravanReturn(): void {\n  if (world.caravanReturnRequested) {\n    world.caravanReturnRequested = false;\n    caravanTo(0);\n  }\n}\n\n// The pause-menu row (panels.ts gates it on pads + a free guest seat).\nui.onCouchJoin = openCouchJoin;\nui.onCouchLeave = () => {\n  for (const id of [...couchGuests.keys()]) couchLeave(id);\n};\n\n// --- FRAME TELEMETRY (always on; read via __game.perfFrames) -----------------\n// Three fixed ring buffers of per-frame wall-clock samples: the rAF GAP (true\n// frame pacing — the jitter a player feels, compositor included), the SIM\n// milliseconds (input + AI + world.update), and the RENDER milliseconds. Cost\n// is two performance.now() calls and three float writes per frame — nothing.\n// The perf harness (npm run perf → src/dev/perf.ts) reduces these to\n// percentiles/hitch counts per zone; a future in-game FPS readout reads the\n// same rings.\nconst PERF_RING = 2048;\n// THE RING FIT (2026-08-02): the rings were a constant 2048 slots, and a\n// 240Hz display fills that in ~8.5s — a --seconds=12 sweep window WRAPPED,\n// silently dropping the window's OLDEST frames (exactly where bakes cluster),\n// so h40/gapMax undercounted while the sampler-side off40 kept counting\n// (gloamwood base2 2026-08-02: off40 5 vs h40 0 at frames=2048 exact). The\n// perf sweep now sizes the rings to its own window via perfRingSize\n// (requested seconds × measured refresh + margin); PERF_RING stays the floor\n// and the play-mode default — normal play never resizes. perfPushed counts\n// every push since the last reset: pushed > stored frames is the wrap\n// detector no sizing mistake can silently defeat.\nlet perfRingN = PERF_RING;\nlet perfGap = new Float32Array(perfRingN);\nlet perfSim = new Float32Array(perfRingN);\nlet perfRen = new Float32Array(perfRingN);\nlet perfIdx = 0, perfCount = 0, perfPushed = 0;\n/** The sampler's fine own-task anchor (__game.perfTickT0): performance.now()\n *  at the CURRENT frame's tick-callback entry. The coarse taskMax anchors on\n *  the vsync timestamp, so a foreign task overhanging the tick wears the\n *  frame's name — this mark lets the sweep separate the frame's OWN work\n *  from that overhang (src/dev/perf.ts walkPhase). */\nlet perfTickT0 = 0;\n/** Resize the frame rings — the perf harness's one-per-sweep call (normal\n *  play keeps the default). Clamped to [PERF_RING, 1<<17]; resets the rings. */\nfunction perfRingSize(frames: number): number {\n  const want = Math.max(PERF_RING, Math.min(1 << 17, Math.ceil(frames) || 0));\n  if (want !== perfRingN) {\n    perfRingN = want;\n    perfGap = new Float32Array(want);\n    perfSim = new Float32Array(want);\n    perfRen = new Float32Array(want);\n  }\n  perfIdx = 0; perfCount = 0; perfPushed = 0;\n  return perfRingN;\n}\nfunction perfPush(gap: number, sim: number, ren: number): void {\n  perfGap[perfIdx] = gap; perfSim[perfIdx] = sim; perfRen[perfIdx] = ren;\n  perfIdx = (perfIdx + 1) % perfRingN;\n  if (perfCount < perfRingN) perfCount++;\n  perfPushed++;\n  phaseMark('sim', sim); phaseMark('ren', ren); // the bracketed slabs join the ledger\n}\n\n// THE PHASE LEDGER (perf attribution, 2026-08-02): coarse wall-clock marks\n// around the frame's major slabs, folded to ONE window-worst (name, ms) that\n// perfFrames ships beside the rings — so a perf-sweep row whose gapMax ≈\n// taskMx with sim99/ren99 both tiny (the 2026-08-01 verdict sweep's\n// metropolis 367ms task, sim 8 / ren 6: a giant slab inside the frame task\n// but outside BOTH engine brackets) SELF-ATTRIBUTES instead of needing a\n// hand bisect. The slabs and their anchors:\n//   'pre'  — rAF timestamp → tick-callback entry. The ONLY mark anchored on\n//            the vsync timestamp (deliberately the same anchor as the\n//            sampler's coarse taskMax): a foreign task (GC, timer, idle\n//            autosave) overhanging the tick delays the whole callback batch\n//            and wears the frame's name in taskMax — this mark measures\n//            exactly that overhang, disambiguating the coarse-anchor trap.\n//            (step()-driven synthetic frames mint a bogus 'pre'; the ledger\n//            is only read by the perf sweep, which drives real rAF.)\n//   'head' — tick entry → the sim bracket (pad poll, pointer, couch tick).\n//   'sim'/'ren' — the standing brackets, folded at perfPush (same frame).\n//   'tail' — post-perfPush → end of the host branch (net broadcast +\n//            hostTail). A tail slab CANNOT flush before its own frame's\n//            perfPush by position (hostTail runs after it), so it CARRIES\n//            to the NEXT tick's fold — ≤1 frame late, and a window's last\n//            tail lands in the gap after it closes. Coarse by design.\n// Cost: three performance.now() calls + compares per frame; always on, like\n// the rings themselves.\nlet phaseWorstName = '', phaseWorstMs = 0, phasePendTail = 0;\nfunction phaseMark(name: string, ms: number): void {\n  if (ms > phaseWorstMs) { phaseWorstName = name; phaseWorstMs = ms; }\n}\n\n// --- THE RENDER-SCALE GOVERNOR (render/renderScale.ts; Settings.renderScale) --\n// 'auto' watches the SAME gap ring the Pulse tab and the perf harness read\n// and walks the notch ladder — down readily while sustained p95 sits past\n// the 30fps knee, up patiently once frames hold (the pure nextNotch law).\n// A manual number pins the scale. Runs every frame, judges every evalSec.\nlet rsNotch = 0, rsHotSec = 0, rsCoolSec = 0, rsNextEvalAt = 0;\nfunction renderScaleTick(nowMs: number): void {\n  const want = settings.renderScale;\n  if (want !== 'auto') {\n    renderer.setRenderScale(typeof want === 'number' ? want : 1);\n    rsNotch = 0; rsHotSec = 0; rsCoolSec = 0;\n    return;\n  }\n  if (nowMs < rsNextEvalAt) return;\n  const g = RENDER_SCALE_CFG.governor;\n  rsNextEvalAt = nowMs + g.evalSec * 1000;\n  const n = Math.min(perfCount, 300);\n  if (n < 60) return; // not enough frames to judge yet\n  const start = (perfIdx - n + perfRingN) % perfRingN;\n  const gaps: number[] = new Array(n);\n  for (let i = 0; i < n; i++) gaps[i] = perfGap[(start + i) % perfRingN];\n  gaps.sort((a, b) => a - b);\n  const p95 = gaps[Math.floor(n * 0.95)];\n  if (p95 > g.stepDownP95Ms) { rsHotSec += g.evalSec; rsCoolSec = 0; }\n  else if (p95 < g.stepUpP95Ms) { rsCoolSec += g.evalSec; rsHotSec = 0; }\n  else { rsHotSec = 0; rsCoolSec = 0; }\n  const next = nextNotch(rsNotch, rsHotSec, rsCoolSec);\n  if (next !== rsNotch) { rsNotch = next; rsHotSec = 0; rsCoolSec = 0; }\n  renderer.setRenderScale(RENDER_SCALE_CFG.notches[rsNotch]);\n}\n\nlet last = performance.now();\n// THE AGENT SEAT + THE DIRECTOR (src/agent/, src/director/): a capture rig or\n// a playtest bot may drive the local seat through the same artery the\n// keyboard does (the pilot is read inside the guarded local-input path), and HOLD the\n// rAF pump so only __game.step() advances the game (deterministic takes).\n// Both are null/false in ordinary play — the classic loop, byte for byte.\nlet localPilot: HeroInputSource | null = null;\nlet directorHold = false;\nlet director: Director | null = null;\n/** A held capture still waits on the actual loading lease and native page I/O.\n * Tick only through the loading gate; no scripted hand is installed yet. */\nasync function waitDirectorReady(signal: AbortSignal): Promise<void> {\n  const prepared = world;\n  const deadline = performance.now() + 60000;\n  const cancel = () => { if (loadingScreen.active && world === prepared) cancelLoadingToMenu(); };\n  signal.addEventListener('abort', cancel, { once: true });\n  try {\n    for (;;) {\n      signal.throwIfAborted();\n      if (world !== prepared || !running) throw new Error('Director world entry was replaced or cancelled.');\n      if (crashFatal) throw new Error('Director world entry failed: ' + crashFatal.msg);\n      const readiness = clientReadiness(world);\n      if (readiness?.status === 'refused') throw new Error(readiness.error ?? 'Director native pages were refused.');\n      if (!loadingScreen.active && (!readiness || readiness.status === 'ready')) return;\n      if (performance.now() >= deadline) throw new Error('Director world entry did not become ready.');\n      tick(last + 1000 / 60);\n      await new Promise<void>(resolve => setTimeout(resolve, 16));\n    }\n  } finally { signal.removeEventListener('abort', cancel); }\n}\n/** The rAF pump: one tick, then re-arm. All work lives in tick() so tests can\n *  drive frames SYNCHRONOUSLY via __game.step() — a hidden tab freezes rAF\n *  entirely (the tab-throttle gotcha), which would otherwise freeze input\n *  polling, the pad, and the sim under any headless/backgrounded harness.\n *  A throw out of tick() is a FATAL (the crash trap above): before this\n *  catch existed it silently KILLED the pump — the classic wedged canvas —\n *  and after a fatal the pump stands down deliberately (no re-arm): a\n *  crashed sim is not ticked onward beneath the overlay. */\nfunction frame(now: number): void {\n  if (crashFatal) return;\n  try { if (!directorHold) tick(now); } catch (e) { reportFatal(e, 'game loop'); }\n  if (!crashFatal) requestAnimationFrame(frame);\n}\nfunction tick(now: number): void {\n  // ?crashtest — the negative control's deliberate throw, from INSIDE the\n  // live loop (see the const by COOP_PARAMS; Infinity while the param is off).\n  if (now >= crashTestAt) {\n    crashTestAt = Infinity;\n    throw new Error('?crashtest — deliberate crash-trap drill from the rAF loop');\n  }\n  const frameGapMs = now - last; // true frame pacing, BEFORE the dt clamp\n  const tickT0 = performance.now(); // PHASE LEDGER anchor: callback start\n  perfTickT0 = tickT0; // the sampler's fine own-task anchor (__game.perfTickT0)\n  phaseMark('pre', tickT0 - now); // vsync→callback overhang (a foreign task)\n  phaseMark('tail', phasePendTail); phasePendTail = 0; // last frame's tail, carried\n  const dt = Math.min(0.05, (now - last) / 1000);\n  last = now;\n\n  // loading-screen: hold simulation, world rendering, menus and input while\n  // the independent toy frame continues. Native I/O advances in real time.\n  if (running && net.isHost && !world.gameOver && (!loadingScreen.active || loadingGate)) {\n    const readiness = clientReadiness(world);\n    if (readiness && readiness.status !== 'ready' && !loadingGate) {\n      loadingGate = { world, lease: loadingScreen.begin({ kind: 'travel', label: 'Crossing the veil',\n        loadout: account.cosmetics.loadout, cancel: cancelLoadingToMenu }) };\n    }\n    if (loadingGate) {\n      if (!readiness || readiness.status === 'ready') { loadingGate.lease.finish(); loadingGate = undefined; }\n      else if (readiness.status === 'refused') loadingGate.lease.fail(readiness.error ?? 'World pages are unavailable.',\n        () => { world.massRuntime?.retryNativePages(world); });\n      else loadingGate.lease.update({ label: 'Crossing the veil',\n        ...(readiness.required === undefined ? {} : { detail: readiness.required + ' nearby world pages remaining' }) });\n    }\n  }\n  // THE ONE CROSSING (net/crossing.ts): a hosted arrival or hand-off holds the world (no input\n  // leaves, nothing of it is drawn) while the shell places and streams beneath the cover; a\n  // hand-off's grace keeps the last frame and the hands' keys, then the screen rises. The\n  // frame that releases it is held too, so the shell places once a frame.\n  if (crossing.covered) {\n    crossingFrame(dt);\n    if (!loadingScreen.active) { pad.poll(now / 1000); pad.endFrame(); input.endFrame(); return; }\n  }\n  if (loadingScreen.active) { input.clearForLoading(); pad.poll(now / 1000); pad.endFrame(); net.drainInputs(); return; }\n\n  // THE RENDER SCALE: apply the dial/governor, and keep the pointer seam\n  // synced (CSS events map into buffer pixels through Input.pointerScale).\n  renderScaleTick(now);\n  input.pointerScale = renderer.pixelScale;\n\n  // CONTROLLER, before anything reads input: poll the device, settle who owns\n  // the reticle, run the menu pointer (it consumes Ⓐ/Ⓑ while active), and fire\n  // the pad's hardwired Escape — a synthetic keystroke, so the entire close-\n  // cascade stays single-sourced in handleLocalPanels.\n  const nowSec = now / 1000;\n  pad.poll(nowSec);\n  if (loadingScreen.padQuarantined) {\n    // Include panel toggles and the pad pointer, not only combat reads.\n    pad.move.x = pad.move.y = pad.aimStick.x = pad.aimStick.y = 0;\n    pad.moveMag = pad.aimMag = 0; pad.down.clear(); pad.pressed.clear();\n  }\n  for (const code of dialoguePadHeld) if (!pad.isDown(code)) dialoguePadHeld.delete(code);\n  if (!running || world.player?.dead || world.player?.downed) dialogue.reset();\n  dialogue.setAvailable(renderer.npcDialogueAvailable());\n  if (input.mouse.x !== lastMouse.x || input.mouse.y !== lastMouse.y) {\n    // The mouse reclaims aim only through DELIBERATE travel: motion\n    // accumulates while the pad holds the reticle, and only past the\n    // threshold does the arrow take over (then it owns aim on any motion).\n    const moved = Math.hypot(input.mouse.x - lastMouse.x, input.mouse.y - lastMouse.y);\n    lastMouse.x = input.mouse.x; lastMouse.y = input.mouse.y;\n    if (aimSource === 'pad') {\n      mouseReclaim += moved;\n      if (mouseReclaim >= PAD_CFG.mouseReclaimPx) {\n        aimSource = 'mouse'; mouseReclaim = 0;\n        // THE RETICLE HANDS THE MOUSE THE CURSOR: the switch starts aiming\n        // exactly where the reticle was (assist and all), not wherever the\n        // arrow sat parked — the offset melts with travel (block below).\n        // Only while the reticle was truly the cursor (live play): if the\n        // arrow was visible (menus etc.), its own position is the truth.\n        if (padAimView && reticleAllowed()) {\n          const rs = renderer.toScreen(padAimView);\n          mouseHandoff = { x: rs.x - input.mouse.x, y: rs.y - input.mouse.y };\n        }\n      }\n    } else if (mouseHandoff) {\n      // MELT the handoff with deliberate travel — each px of motion scales\n      // the offset by (1 − px/mergePx); once it's within doneEps of zero,\n      // arrow and aim are one and the honest OS arrow returns.\n      const h = PAD_CFG.mouseHandoff;\n      const k = Math.max(0, 1 - moved / h.mergePx);\n      mouseHandoff.x *= k; mouseHandoff.y *= k;\n      if (Math.hypot(mouseHandoff.x, mouseHandoff.y) < h.doneEps) mouseHandoff = null;\n    }\n  }\n  // Any live aim-stick deflection reclaims the reticle for the pad (and ends\n  // any mouse handoff — the pad's sticky cursor is absolute again).\n  if (pad.aimMag > 0) { aimSource = 'pad'; mouseReclaim = 0; mouseHandoff = null; }\n  // COUCH: the hero's pointer wakes only on surfaces that block THE HERO'S\n  // hands (a guest's open bag must not flip P1 into menu mode); solo keeps\n  // the classic any-surface gate byte-identically.\n  // THE FOLIO (ui/folio.ts): reconcile the books to every dialog's own open\n  // flag — whatever path opened or closed it — and seat the thumb indexes.\n  ui.folioSync();\n  dialogue.setAvailable(renderer.npcDialogueAvailable());\n  dialogue.syncLayout(); // only the reader; serviceWorkspace owns service geometry\n  // THE MENU BAR (ui/menubar.ts): shown for a live run — never over the\n  // flow screens, never under the Mu hub's HUD veil.\n  // THE MENU BUTTON IS THE SHELL'S DOOR (2026-09-11, her ask): it stands\n  // whenever the game runs, HUD veil or not — in Mu the pages read SEALED\n  // (THE PANEL SEAL) and the pause page stays one click away, so the main\n  // menu never depends on a remembered keybind. The veil hides the run HUD\n  // cluster; this button was never part of it.\n  ui.menuBarSync(dt, running);\n  padPointer.update(dt,\n    (couchActive() ? ui.blockingFor(world.localSeat.id) : ui.uiBlocking()) || dialogue.choosing || !running, nowSec);\n  couchTick(dt, nowSec);\n  const lockPad = [...couchGuests.values()].find(g => g.pointer.active && g.gpad.isDown(settings.padBinds.itemLock));\n  const boundLockPad = settings.padBinds.itemLock !== PAD_CFG.pointer.confirm;\n  ui.itemLockInput(running && (input.keys.has(settings.keybinds.itemLock)\n    || (boundLockPad && (padPointer.active && pad.isDown(settings.padBinds.itemLock) || !!lockPad))),\n    lockPad?.pointer.position() ?? (padPointer.active ? padPointer.position() : undefined));\n  if (pad.justPressed(PAD_CFG.escapeButton)) synthEscape();\n\n  if (running) {\n    if (net.isHost) {\n      // ---- HOST (and single-player / local co-op): run the one real sim. ----\n      const perfSimT0 = performance.now();\n      phaseMark('head', perfSimT0 - tickT0); // input/pad/pointer/couch slab\n      // 1. Local UI (pause menu, panels) — never gameplay intent. The couch\n      //    guests' panel toggles ride their own pads right behind.\n      handleLocalPanels();\n      handleCouchPanels();\n      // Missing nearby native pages hold the whole simulation before input or\n      // AI can step. Rendering, menus and durable saves remain available.\n      const retained = nativeClientRuntimeFor(world);\n      if (world.gameOver || (retained ? retained.ready : world.nativeWorldReady())) {\n        // 2. Gather this frame's per-seat intent into the transport. The local seat\n        //    reads the OS; other LOCAL seats (the scripted ally) poll their source.\n        //    A REMOTE seat's intent arrives through the transport's own pump.\n        const li = readLocalInput(dt);\n        if (li) net.sendInput(net.self, li);\n        for (const seat of world.seats) {\n          if (seat.id === net.self) continue;\n          const intent = retained ? retained.pollSeat(seat, dt) : seat.input.poll(seat.actor, world, dt);\n          if (intent) net.sendInput(seat.id, intent);\n        }\n        if (retained) {\n          const result = retained.dispatch({ dt, wallSeconds: frameGapMs / 1000, inputs: net.drainInputs(),\n            actions: pendingActions.splice(0).map(({ seat, action, seq }) => ({ seatId: seat, action, seq })),\n            gearVacuum: settings.gearPickup !== 'key',\n          });\n          for (const dropped of result.droppedActions) console.warn('[coop] dropped malformed meta action', dropped.seatId, dropped.error);\n        } else {\n          // 3. Apply all seat intents (single path for every player-kind hero).\n          // THE TIME BUDGET runs on the wall: the seconds this frame's dt clamp cut off\n          // still passed for a remote client's hands (World.passInputTime; a local seat\n          // sends no dt, so nothing of single player reads it).\n          world.passInputTime(frameGapMs / 1000 - dt);\n          world.applyInputs(net.drainInputs(), dt);\n          // 3.5. Apply clients' META intents (point-spends, gem ops, drops) to their\n          //      OWN seats BEFORE the sim ticks — so the change lands in this tick's\n          //      drops/orbs pass and re-replicates in the same broadcast.\n          drainMetaActions();\n\n          // The deathPresentation keeps ambience alive, but the settled run must\n          // never gain a late AI kill, cast, or reward behind its epilogue.\n          if (!world.gameOver) for (const a of world.actors) updateAI(a, world, dt);\n          // Mirror the gear-pickup feel preference onto the sim (Settings is a\n          // UI concern the World can't import; a boolean crosses the seam).\n          world.gearVacuum = settings.gearPickup !== 'key';\n          world.update(dt);\n        }\n      } else {\n        net.drainInputs(); // do not replay accumulated movement/casts on recovery\n      }\n      // DWELL → MENU polls. The world keeps simulating under the pause menu,\n      // so a dwell can fire while it's up — HOLD the request (don't clear)\n      // until the pause menu closes, else a station menu pops OVER the pause\n      // screen and Escape starts fighting through stacked surprises.\n      // The Caravanner dwell (in TOWN) asks to open the band-travel menu.\n      pollCaravanMenu();\n      // The salvage-bench dwell asks to open the break/craft menu.\n      if (world.salvageDwellRequested && !ui.escapeMenuOpen) {\n        world.salvageDwellRequested = false;\n        if (!ui.salvageOpen) ui.showSalvage(world.salvageDwellSeatId);\n      }\n      // A Sacrificial Font dwell asks to open the Font screen (Merge /\n      // Convert / Reset — skill-mode trees M1).\n      if (world.fontDwellRequested && !ui.escapeMenuOpen) {\n        world.fontDwellRequested = false;\n        if (!ui.fontOpen) ui.showFont(world.fontDwellSeatId);\n      }\n      // A banked Ability point's popup, offered at the disciplined calm the\n      // world's own sweep found (never mid-combat).\n      if (world.treePopupRequested && !ui.escapeMenuOpen) {\n        world.treePopupRequested = false;\n        ui.showTreePopup(world.treePopupSeatId, world.treePopupSkillId);\n      }\n      // The HARBOR BOARD dwell (a port's notice board) asks to open the\n      // harbor menu — hearsay, passage down the lanes, charts. (The dock\n      // itself still casts off directly; the board is the harbor's EARS.)\n      if (world.harborDwellRequested && !ui.escapeMenuOpen) {\n        world.harborDwellRequested = false;\n        if (!ui.sailOpen) ui.showSail();\n      }\n      // THE BOUNTY BOARD dwell (Lastlight's posting board) asks to open the\n      // postings panel — the beat's slate, the taken hand, the turn-in.\n      if (world.bountyDwellRequested && !ui.escapeMenuOpen) {\n        world.bountyDwellRequested = false;\n        if (!ui.bountiesOpen) ui.showBounties(world.bountyDwellSeatId, world.bountyDwellBoardId);\n      }\n      // The MUSTER HORN dwell (a harborhold's gate post) asks to open the\n      // hold panel — the town's standing, the muster, the restoration.\n      if (world.holdDwellRequested && !ui.escapeMenuOpen) {\n        world.holdDwellRequested = false;\n        if (!ui.holdOpen) ui.showHold();\n      }\n      // The Oracle-stone dwell asks to open the communion menu.\n      if (world.oracleDwellRequested && !ui.escapeMenuOpen) {\n        world.oracleDwellRequested = false;\n        if (!ui.oracleOpen) ui.showOracle(world.oracleDwellSeatId);\n      }\n      // The Tracker's-fire dwell asks to open the Bestiary.\n      if (world.trackerDwellRequested && !ui.escapeMenuOpen) {\n        world.trackerDwellRequested = false;\n        if (!ui.bestiaryOpen) ui.showBestiary(world.trackerDwellSeatId);\n      }\n      // A stocked vendor counter's dwell asks to open the Vendor screen.\n      if (world.vendorDwellRequested && !ui.escapeMenuOpen) {\n        world.vendorDwellRequested = false;\n        if (!ui.vendorOpen) ui.showVendor(world.vendorDwellSeatId);\n      }\n      // The quartermaster dwell with FRESH vocation chains on offer asks to open\n      // the CHOICE menu (a subclass pick is deliberate — never auto-accepted).\n      if (world.vocationOfferRequested && !ui.escapeMenuOpen) {\n        world.vocationOfferRequested = false;\n        if (!ui.vocationOpen) ui.showVocationMenu();\n      }\n      if (world.questRewardRequested && !ui.escapeMenuOpen) {\n        world.questRewardRequested = false;\n        // The speaker owns local rewards in reader mode; bubble mode keeps its journal fallback.\n        if (DIALOGUE_CFG.presentation !== 'dialogue' || !conversationHasRewards(world)) ui.showQuestReward();\n      }\n      // The mercenary outpost's calm parley asks to open the hire/retire menu.\n      if (world.mercOutpostRequested && !ui.escapeMenuOpen) {\n        world.mercOutpostRequested = false;\n        if (!ui.mercOpen) ui.showMercMenu();\n      }\n      // A borough villager's arming dwell asks to open the arming panel.\n      if (world.boroughArmRequested && !ui.escapeMenuOpen) {\n        world.boroughArmRequested = false;\n        if (!ui.boroughOpen) ui.showBorough(world.boroughArmFolkId);\n      }\n      // The run wrote an ACCOUNT-scoped unlock (a vocation grant) — persist it\n      // now, so closing the game without dying can't lose it.\n      if (world.accountDirty) {\n        world.accountDirty = false;\n        saveAccount(account);\n      }\n      // THE STORY CARD (engine/scenes.ts): the DOM shows whatever card the\n      // scene director holds pending, and the continue ACKS back into the\n      // engine — the DOM is a window on engine state, never the state.\n      if (world.scene?.card && !ui.storyCardOpen()) {\n        ui.showStoryCard(world.scene.card, () => sceneCardAck(world));\n      } else if (!world.scene?.card && ui.storyCardOpen()) {\n        ui.hideStoryCard();\n      }\n      // THE MU HUB (data/mu.ts): a still linger at an awake vessel posts a\n      // class request — take it only when the card can actually open (the\n      // pause menu's hold law), and let the pick start the run proper.\n      if (!ui.escapeMenuOpen && !ui.muCardOpen) {\n        const muReq = muTakeClassRequest(world);\n        // THE OFFERED CONTRACT (engine/muDeal.ts): the card opens pre-sworn\n        // to whatever contract the waking rolled onto this vessel (muOfferOf\n        // — the same seated row whose red ember the body wears), or plain.\n        if (muReq) ui.showMuClassCard(muReq, startPicked, muOfferOf(world, muReq));\n      }\n      // Dwelling by the return-Caravanner IN THE WILDS ports straight home — no menu.\n      pollCaravanReturn();\n      // (The dock dwell now CASTS OFF into the sailing mode directly — handled\n      // inside world.updateSail; the Sail menu panel stays dormant.)\n      // (The Holdfast toll pays directly on the keeper dwell — an essence price\n      // needs no bargain menu; the prompt over the keeper advertises the ask.)\n      feedRendererAim();\n      const perfRenT0 = performance.now();\n      renderer.render(world);\n      perfPush(frameGapMs, perfRenT0 - perfSimT0, performance.now() - perfRenT0);\n      const perfTailT0 = performance.now(); // PHASE LEDGER: the tail starts here\n\n      // Broadcast to connected clients. Gated on a REAL wire (never LocalTransport),\n      // so single-player AND local co-op (a stand-in ally is a LocalTransport peer)\n      // never serialize anything — byte-identical SP / no wasted work.\n      if (!(net instanceof LocalTransport) && net.peers().length > 1) {\n        // Terrain: ship the (heavier) zone message ONCE per zone change.\n        if (!nativeClientRuntimeFor(world) && world.zone.id !== lastSentZone) {\n          lastSentZone = world.zone.id;\n          net.sendZone(serializeZone(world));\n        }\n        // META HEARTBEAT: seatMeta is delta-replicated (shipped once per change,\n        // then cleared). If that one snapshot is ever dropped — a congested\n        // channel skipped by fanOut, or coalesced past on the client — the delta\n        // is lost with no retry. Periodically re-dirty every seat so any missed\n        // build change self-heals within META_HEARTBEAT seconds.\n        metaHeartbeat -= dt;\n        if (metaHeartbeat <= 0) {\n          metaHeartbeat = META_HEARTBEAT;\n          for (const s of world.seats) world.markMetaDirty(s);\n        }\n        // State: the per-tick render snapshot at the fixed wire rate.\n        stateTimer -= dt;\n        if (stateTimer <= 0) {\n          stateTimer = 1 / STATE_HZ;\n          broadcastSnapshot();\n        }\n      }\n\n      hostTail(dt);\n      phasePendTail = performance.now() - perfTailT0; // flushes at the NEXT tick's fold\n    } else {\n      // ---- CLIENT: run NO sim. Send local input, render the host's snapshot. ----\n      handleLocalPanels();\n      const li = readLocalInput(dt);\n      // Stamp + buffer the input for prediction, THEN send it (THE SMOOTH SHELL: the seq and\n      // dt of THE HONEST INPUT, THE WATCHDOG's still walk, THE PREDICTED ROOT's press). The\n      // host echoes the last-applied seq; the shell replays everything newer locally.\n      if (li) net.sendInput(net.self, shell.stampInput(li, dt, performance.now()));\n      clientApplyAndRender(dt);\n    }\n  }\n\n  input.endFrame();\n  pad.endFrame();\n}\n\n/** The 20s autosave beat, deferred into genuine idle slack when the runtime\n *  offers it (requestIdleCallback — always, on the Chromium we ship). hostTail\n *  runs AFTER perfPush, so work here lands in the NEXT frame's rAF gap,\n *  invisible to the sim/render brackets — the beat's serialize+write block\n *  (~7ms at a 415-zone chart, growing with the world) was a standing\n *  once-per-20s hitch by position. The deferral changes WHEN the snapshot is\n *  captured (a few idle ms later, timeout-capped), never what is written: the\n *  callback serializes synchronously through the same persistRun writer, and\n *  re-checks the beat's own preconditions plus run identity so a menu exit,\n *  death, or fresh run between schedule and fire is never clobbered by a\n *  stale capture (their own deliberate writes have landed by then — and a\n *  post-wipe resurrection is exactly what the gameOver guard refuses).\n *  Runtimes without rIC keep the synchronous beat byte-for-byte; probes and\n *  the sim harness drive persistRun directly and never see this seam. */\nlet idleSavePending = false;\nfunction idleAutosave(): void {\n  if (typeof window.requestIdleCallback !== 'function') {\n    persistRun(account, world);\n    persistCouchGuests();\n    return;\n  }\n  if (idleSavePending) return;\n  idleSavePending = true;\n  const w = world;\n  window.requestIdleCallback(() => {\n    idleSavePending = false;\n    if (!running || world !== w || world.gameOver || world.scene) return;\n    persistRun(account, world);\n    persistCouchGuests();\n  }, { timeout: 500 });\n}\n\n/** Host-only end-of-frame work: live panels, autosave, and the permadeath/death\n *  screen flow. NONE of this runs on a client (no character to save/wipe). */\nfunction hostTail(dt: number): void {\n  // The pendingDeathScreen owns presentation after the epilogue is booked.\n  // The body timeline reveals it over the dispersing shards; other endings\n  // retain their dark crossing. Starters also clear this pending callback.\n  if (pendingDeathScreen && world.gameOver) {\n    if (world.deathPresentation) {\n      const pose = deathPresentationPose(world.deathPresentation.elapsed);\n      world.screenFade = pose.fade;\n      if (pose.reveal && !pendingDeathScreen.opened) {\n        pendingDeathScreen.opened = true;\n        pendingDeathScreen.open(DEATH_PRESENTATION.revealSec);\n      }\n      if (pose.complete) { pendingDeathScreen = null; running = false; }\n      return;\n    }\n    world.screenFade = Math.min(1, world.screenFade + dt / RUN_END_FADE.outSec);\n    if (world.screenFade >= 1) {\n      const open = pendingDeathScreen.open;\n      pendingDeathScreen = null;\n      open();\n      running = false;\n    }\n    return;\n  }\n  // Keep open panels live (resource/stat values move constantly).\n  uiRefreshTimer -= dt;\n  if (uiRefreshTimer <= 0) {\n    uiRefreshTimer = 0.5;\n    ui.refreshCharSheet();\n    ui.refreshInventory(true);\n    ui.refreshMap();\n  }\n\n  // Autosave the in-progress character periodically (cheap; survives a crash\n  // or an abrupt close). Skipped once dead (the run save is wiped on death).\n  // persistRun routes the write to the character's slot (run vs roster vessel)\n  // and keeps the roster index card fresh alongside it.\n  // …and never while a SCENE plays (engine/scenes.ts): the tutorial is not\n  // a run — its ground never serializes and its abort must leave no save.\n  // The run's first write lands at the scene's 'home' stage via charDirty.\n  if (!world.gameOver && !world.scene) {\n    autosaveTimer -= dt;\n    if (autosaveTimer <= 0) { autosaveTimer = 20; idleAutosave(); }\n  }\n\n  // The sim mutated character save-state OUTSIDE the autosave cadence — a mode\n  // respawn banked a death (corpse/stage/strip), an own-ring corpse was\n  // reclaimed. Persist immediately: the same promptness accountDirty gets.\n  if (world.charDirty) {\n    world.charDirty = false;\n    persistRun(account, world);\n  }\n  // A couch guest's vessel banked something (the guest covenant on a wipe,\n  // a meta mutation) — persist it with charDirty's promptness.\n  if (world.couchDirty) {\n    world.couchDirty = false;\n    persistCouchGuests();\n  }\n\n  // A roster-saved character chose Save & Main Menu (their \"End Run\" — the\n  // vessel persists; only a deliberate roster deletion ever discards it).\n  if (world.menuExitRequested) {\n    world.menuExitRequested = false;\n    // A mid-scene exit is an ABANDON, not a save-and-quit: nothing persists,\n    // and the next New Game re-launches the scene from its first card.\n    if (!world.scene) { persistRun(account, world); persistCouchGuests(); }\n    toStartMenu();\n    return;\n  }\n\n  if (world.gameOver && !deathShown) {\n    cancelCharacterResume();\n    deathShown = true;\n    // CO-OP: tell connected clients the run ended so they leave their (now-frozen)\n    // render shell and offer a fresh class pick — no reload, the session lives on.\n    if (coopActive()) net.sendSession({ t: 'runEnd' });\n    // COUCH: guest vessels ride home before the world is torn down (mortal-\n    // lane guests carry nothing); the session machinery drops with the run.\n    persistCouchGuests();\n    couchReset();\n    ui.hideAll();\n    // THE RECKONING MINT: the run's carried essence — the local hero plus\n    // every couch vessel (one account, one harvest; mercs and remote guests\n    // never fold) — appraised WHOLE at the strict mortal exchange\n    // (data/essences.ts mortalWorth) × the dying stage's payout rate.\n    // Nothing is scored for distance any more: what the run still HOLDS is\n    // what the reckoning mints, and what it spent along the way was the\n    // price of getting there. Read before the wipe below; the wallets die\n    // with the run either way.\n    const stage = world.modeStageDef();\n    // THE FALL (runEndReason 'fall' — the resurrection covenant): the wallet\n    // was already stripped by the in-world banking, so the epilogue reads\n    // the appraisal beginModeFall stashed PRE-strip (rows honest, minted at\n    // the stage's own rate) instead of re-reckoning empty seats.\n    const fell = world.runEndReason === 'fall' && !!world.fallReckoning;\n    const reck = fell ? world.fallReckoning! : world.reckonRunEssence();\n    applyCredits(account, reck.minted);\n    // THE CHRONICLE: every meta-progressing conclusion is a row on the\n    // account's own leaderboard — the mint on one axis, the journey score\n    // (renownForRun — the old distance formula, kept as pure renown) on the\n    // other. A sealed stage's conclusion stays off the board exactly as it\n    // stays out of the ledger.\n    const renown = renownForRun(world.player.level, world.visited.size, world.kills);\n    let record: RunRecord | null = null;\n    if (stage.metaProgression) {\n      record = {\n        schema: RUN_RECORD_SCHEMA, at: Date.now(),\n        name: world.meta.name, classId: world.meta.classDef.id, level: world.player.level,\n        zones: world.visited.size, kills: world.kills,\n        reason: world.runEndReason, essence: reck.minted, renown,\n      };\n      recordRun(account, record);\n    }\n    // PERMANENT progression: fold this run's trigger counters (crowned_killed,\n    // …) into the account ledger so package unlocks stick like credits do —\n    // unless the dying stage is sealed outside the account loop (mode policy).\n    if (stage.metaProgression) mergeLedger(account.ledger, world.ledger);\n    // THE OBJECTIVE WEB's belt: the live sweep claims mid-run, but a deed\n    // whose last count merged only now (a play milestone stamped this run)\n    // lands here — before the reckoning's Vault renders it Owned.\n    if (stage.metaProgression) settleClassUnlocks(account);\n    // CORPSE RUN + the lifetime death tally: only an actual death (not a\n    // forfeit) records a corpse or counts toward death-gated unlocks — both\n    // captured BEFORE clearCharacter wipes the gems. A FALL already banked\n    // its corpse in-world (beginModeFall — pre-strip, own ring); only the\n    // tally arm applies here, stage-honest (moot for the sealed Undying).\n    if (world.runEndReason === 'death') {\n      world.recordDeath();\n      if (stage.countsAccountDeath) bumpLedger(account.ledger, LEDGER_ACCOUNT_DEATHS);\n    } else if (world.runEndReason === 'fall' && stage.countsAccountDeath) {\n      bumpLedger(account.ledger, LEDGER_ACCOUNT_DEATHS);\n    }\n    // ANY conclusion — death, forfeit, retirement — ends the merc contract:\n    // the veteran returns to the pool, waiting on some future outpost.\n    releaseMercsOf(account, world.meta.charId);\n    // Durable write (sendBeacon) so the death record survives a tab-close on\n    // the death screen, matching clearCharacter's durable wipe.\n    saveAccountDurable(account);\n    // THE VESSEL KEEPS (roster-saved modes): a fall ends the run but never\n    // the character — persist the sanctuary-standing vessel to its OWN slot\n    // (the fallen card beside it) and leave the shared Continue slot alone:\n    // it belongs to whatever mortal run is suspended there. Mortal\n    // conclusions keep the historical wipe.\n    if (modeById(world.meta.modeId).save === 'roster') {\n      persistRun(account, world);\n    } else {\n      clearCharacter();\n      ui.setContinueSave(null); // the run is wiped — no Continue after death\n    }\n    ui.resetClassRoster();      // the next run deals a fresh class hand\n    // THE RUN'S EPILOGUE: the death screen reads the appraisal, then leads\n    // STRAIGHT into the reckoning (the Vault as the run's closing prompt) —\n    // the seal there is what finally lands on the main menu. Co-op host\n    // KEEPS the live session (onDeathDismiss re-seats clients in the next\n    // run); single-player resets the transport back to local.\n    const openDeath = (revealSec = 0): void => ui.showDeath({\n      rows: reck.rows, carried: reck.carried, mult: reck.mult, minted: reck.minted,\n      renown, standing: record ? runStanding(account, record) : null,\n      ...(fell ? { zoneName: world.fallReckoning!.zoneName } : {}),\n    }, onDeathDismiss, revealSec);\n    if (coopActive() || world.runEndReason === 'forfeit') {\n      // Immediate lanes: a menu act owes no theater, and a shared session's\n      // clients are already being re-seated.\n      openDeath();\n      // PAUSE the host loop — the run is over, so it must stop ticking +\n      // broadcasting the dead world. startGame / startAsClient re-enable it.\n      running = false;\n    } else {\n      // The pendingDeathScreen is presentation only: everything above is\n      // already durable before the body performance or legacy dark crossing.\n      if (world.runEndReason === 'death' && !world.deathPresentation) {\n        openDeath(); // deathPresentation's disabled switch\n        running = false;\n      } else {\n        world.screenFade = world.deathPresentation ? 0 : Math.max(world.screenFade, 0.001);\n        pendingDeathScreen = { open: openDeath };\n      }\n    }\n  }\n}\n\n/** Reset delivery history when a peer receives a fresh render shell. */\nfunction resetHostedPublication(): void {\n  const runtime = nativeClientRuntimeFor(world);\n  if (runtime) hostedPublications.delete(runtime);\n}\n\n/** Each native recipient sees its actual area; the campaign writer stays put. */\nfunction publishHostedSnapshot(): boolean {\n  const runtime = nativeClientRuntimeFor(world);\n  if (!runtime) return false;\n  if (!runtime.ready) throw new Error('Native hosted publication needs a ready client runtime');\n  let cached = hostedPublications.get(runtime);\n  if (!cached || cached.transport !== net) {\n    cached = { transport: net, publication: new NativeHostedPublication(runtime.hosted, net) };\n    hostedPublications.set(runtime, cached);\n  }\n  const recipients = new Set(net.peers().filter(peer => !peer.isHost && peer.id !== net.self).map(peer => peer.id));\n  cached.publication.publish(++snapTick, world.seats.filter(seat => recipients.has(seat.id)));\n  return true;\n}\n\n/** Host: serialize actual recipient areas, or the original non-retained world. */\nfunction broadcastSnapshot(): void {\n  if (publishHostedSnapshot()) return;\n  net.sendState(serializeSnapshot(world, ++snapTick));\n  // Per-seat META rides the snapshot only when its dirty flag is set; once a\n  // snapshot carries it, the change is on the wire — clear so we don't re-ship it.\n  world.metaDirty.clear();\n}\n\n/** Client: place the host's adopted snapshots and draw (no sim runs here; the host owns\n *  the simulation). THE SMOOTH SHELL (net/shell.ts) does the frame's whole half: the own\n *  clocks run down, remote bodies glide on THE JITTER BUFFER's delayed clock, flights and\n *  telegraphs on the newest pair, the own seat's note and surge, and the own hero PREDICTED\n *  (anchored to the host's ack, every unacked input replayed, corrections glided out).\n *  Each snapshot was adopted once, when it arrived (subscribeToHost). */\nfunction clientApplyAndRender(dt: number): void {\n  const now = performance.now();\n  shell.frame(dt, now);\n  // THE WATCHDOG: a silent link strains the frame; past its patience THE RETURN begins.\n  renderer.linkStrain = shell.strain(now);\n  if (shell.phase(now) === 'lost') startReturn();\n  clientDeathBeat(dt); // THE ACTING SEAT: the death beat's presentation (hosted worlds)\n  // THE WILDS ON THE WIRE: stream the ground around our own hero every frame.\n  if (clientWilds && wildsShellActive(world)) wildsShellStream(world, world.player.pos);\n  // Our replicated build changed (point spend, learn, drop, level-up) → re-render\n  // any OPEN build panels now (they're not live like the HUD). refresh* methods\n  // no-op when their panel is closed, so this is cheap.\n  if (clientMetaDirty) {\n    clientMetaDirty = false;\n    ui.refreshCharSheet(); ui.refreshInventory(true); ui.refreshSkillTree(); ui.refreshTree();\n  }\n  // Resource/stat values on the char sheet + map drift every frame even with no\n  // meta change — keep them live on the same 0.5s throttle the host uses.\n  uiRefreshTimer -= dt;\n  if (uiRefreshTimer <= 0) { uiRefreshTimer = 0.5; ui.refreshCharSheet(); ui.refreshInventory(true); ui.refreshMap(); }\n  // THE CLIENT'S CARAVANNER: a render shell runs no sim, so the engine's dwell\n  // gates never tick here — drive the ONE whose answer is a pure INTENT the host\n  // performs (the escort is a client's only road between level bands, and the\n  // return-Caravanner its only way home). Positions are this frame's, applied\n  // just above, and the dwell clock is honest by construction: prediction\n  // replays our own moves through moveActor, which stamps the seat exactly as\n  // the host's own hands do — walking past still never pops the menu.\n  world.updateCaravan(dt);\n  pollCaravanMenu();\n  pollCaravanReturn();\n  pollClientCounters(dt); // THE CLIENT'S COUNTERS: the bench, the board, the Font, the Tracker, the Oracle, the counters\n  feedRendererAim();\n  renderer.render(world);\n}\n\n/** THE CLIENT'S COUNTERS (docs/engine/shard.md, THE COUNTERS AND THE JOURNAL): a hosted world's\n *  render shell lingers at its own stations the way it lingers at the Caravanner, and opens the\n *  same panels the host's own loop opens; every act inside them is a host-judged request. A\n *  reward waiting in its journal row opens the journal, as the host's dwell asks. */\nfunction pollClientCounters(dt: number): void {\n  world.updateClientCounters(dt);\n  if (ui.escapeMenuOpen) return;\n  if (world.salvageDwellRequested) { world.salvageDwellRequested = false; if (!ui.salvageOpen) ui.showSalvage(world.salvageDwellSeatId); }\n  if (world.fontDwellRequested) { world.fontDwellRequested = false; if (!ui.fontOpen) ui.showFont(world.fontDwellSeatId); }\n  if (world.bountyDwellRequested) { world.bountyDwellRequested = false; if (!ui.bountiesOpen) ui.showBounties(world.bountyDwellSeatId, world.bountyDwellBoardId); }\n  if (world.oracleDwellRequested) { world.oracleDwellRequested = false; if (!ui.oracleOpen) ui.showOracle(world.oracleDwellSeatId); }\n  if (world.trackerDwellRequested) { world.trackerDwellRequested = false; if (!ui.bestiaryOpen) ui.showBestiary(world.trackerDwellSeatId); }\n  if (world.vendorDwellRequested) { world.vendorDwellRequested = false; if (!ui.vendorOpen) ui.showVendor(world.vendorDwellSeatId); }\n  if (world.questRewardRequested) {\n    world.questRewardRequested = false;\n    if (DIALOGUE_CFG.presentation !== 'dialogue' || !conversationHasRewards(world)) ui.showQuestReward();\n  }\n}\n\n/** Client: start applying the host's broadcasts (set up at join, torn down on Leave).\n *  THE SMOOTH SHELL: each snapshot is ADOPTED once, on arrival (the shell's arrive: the\n *  ring, the render clock's line, the echo, the state); a frame only places it. */\nfunction subscribeToHost(): void {\n  snapshotDispose = net.onState(s => {\n    const { metaApplied } = shell.arrive(s, performance.now());\n    crossingSnapshot(s); // THE ONE CROSSING: the first snapshot holding the hero in its zone\n    // Re-render the open build panels ONLY when our meta actually CHANGED — not on\n    // the periodic heartbeat re-send of identical meta (which would churn the panel\n    // and reset any scroll). Compare the serialized own-seat meta to the last one.\n    const myMeta = metaApplied ? s.seatMeta?.[world.clientSeatId] : undefined;\n    if (myMeta) {\n      const json = JSON.stringify(myMeta);\n      if (json !== lastMetaJson) { lastMetaJson = json; clientMetaDirty = true; }\n    }\n  });\n  // THE ONE CROSSING: a zone message that beats the shell's standing waits for it (connectToShard\n  // paints the cover first), then lands in startAsClient.\n  zoneDispose = net.onZone(z => { if (shellRising && shellRising === net) crossingZoneHeld = z; else clientZone(z); });\n}\n/** Client: the host's zone message on the shell (the wilds shell's routing, else the classic\n *  one), and THE ONE CROSSING's word on it: a new zone on a live shell is a hand-off. */\nfunction clientZone(z: ZoneMsg): void {\n  const shown = world.appliedZoneId;\n  const surface = clientWilds ? wildsShellZone(world, z, clientWilds.seed) : (applyZone(world, z), false);\n  if (net instanceof WsTransport) { crossing.zoneMsg(z.zoneId, surface, shown, performance.now()); crossingCover(); }\n}\n\n/** THE ONE CROSSING (net/crossing.ts, docs/engine/shard.md): one cover over a hosted world's\n *  arrival (a server-bound wake, a direct join, a reload's return) and its hand-offs (a pocket\n *  and back), mirrored onto the Mu crossing until the hero stands on streamed ground. */\nconst crossing = new ShardCrossing();\n/** The screen the crossing shows: a wake's own entry cover, adopted, else its own. */\nlet crossingLease: LoadingLease | null = null;\n/** withLoadingScreen's cover while startGame runs (a server-bound wake adopts it). */\nlet wakeLease: LoadingLease | null = null;\n/** The transport whose shell is still rising (welcomed, startAsClient not yet run) and a\n *  zone message that landed meanwhile (applied the moment the shell stands). */\nlet shellRising: WsTransport | null = null;\nlet crossingZoneHeld: ZoneMsg | null = null;\nconst CROSSING_CANCELLED = 'the crossing was cancelled';\nfunction crossingCancelled(e: unknown): boolean { return e instanceof Error && e.message === CROSSING_CANCELLED; }\n/** Mirror the crossing's view onto the loading screen (begin, update or finish its lease). */\nfunction crossingCover(): void {\n  const v = crossing.view(performance.now());\n  if (!v.covered) { crossingLease?.finish(); crossingLease = null; return; }\n  if (!v.shown) return; // a hand-off's grace: the last frame stands\n  const status = { label: v.label, ...(v.detail ? { detail: v.detail } : {}),\n    ...(v.total ? { completed: v.completed, total: v.total } : {}) }; // the ring's pages: measured, never faked\n  if (crossingLease?.current) crossingLease.update(status);\n  else crossingLease = loadingScreen.begin({ kind: v.kind, ...status, loadout: account.cosmetics.loadout, cancel: cancelLoadingToMenu });\n}\nfunction crossingWake(): void {\n  crossing.wake(performance.now());\n  if (wakeLease?.current) crossingLease = wakeLease;\n  crossingCover();\n}\nfunction crossingEnd(): void {\n  crossing.end(); shellRising = null; crossingZoneHeld = null;\n  crossingCover();\n}\n/** The first snapshot holding our hero in the crossing's zone moves it on. */\nfunction crossingSnapshot(s: StateSnapshot): void {\n  if (crossing.covered && shell.world === world && net instanceof WsTransport) {\n    crossing.snapshot(s.zoneId, !!s.seats[world.clientSeatId]);\n    crossingCover();\n  }\n}\n/** One held frame: the shell places the hero where the shard has it and streams the ground\n *  around it, and the page ring may release the cover. */\nfunction crossingFrame(dt: number): void {\n  if (running && shell.world === world && net instanceof WsTransport) {\n    shell.frame(dt, performance.now());\n    if (clientWilds && wildsShellActive(world)) wildsShellStream(world, world.player.pos);\n    if (crossing.phase === 'ring') { const r = wildsShellRing(world); crossing.ring(r.ready, r.pending, r.total); }\n  }\n  crossingCover();\n}\n/** Client: stop applying broadcasts. */\nfunction unsubscribeFromHost(): void {\n  if (snapshotDispose) { snapshotDispose(); snapshotDispose = null; }\n  if (zoneDispose) { zoneDispose(); zoneDispose = null; }\n  shell.reset(); lastMetaJson = ''; // THE SMOOTH SHELL: the session's timeline goes with it\n  crossingEnd(); // THE ONE CROSSING: and its cover\n}\n\n/** HOST: a peer joined — spawn a wire-fed seat for them (their class, a\n *  RemoteInput drained from the transport). Idempotent on the seat id. */\nfunction onRemoteJoin(peer: PeerInfo): void {\n  resetHostedPublication();\n  if (world.seats.some(s => s.id === peer.id)) return;\n  // A peer arriving ends any solo menu-pause mid-hold: the shared world is\n  // never one player's to stop (the allowHold policy refuses NEW holds in\n  // co-op; this sweeps one already standing when the session became live).\n  world.timeflow.releaseKind('menu');\n  const cls = CLASSES.find(c => c.id === peer.classId) ?? CLASSES[0];\n  const cosmeticSeat = world.addSeat(peer.id, cls, new RemoteInput(peer.id));\n  cosmeticSeat.actor.cosmeticLoadout = sanitizeCosmeticLoadout(peer.cosmeticLoadout);\n  // The joiner needs its actual area before state; existing split peers keep theirs.\n  if (!publishHostedSnapshot()) net.sendZone(serializeZone(world));\n}\n\n/** HOST: a peer left — despawn their seat (and its minions). */\nfunction onRemoteLeave(id: string): void {\n  world.removeSeat(id);\n}\n\n/** Wire the run-lifecycle channel onto the current (WebRTC) transport — done once\n *  when a co-op session is established (host or client); torn down on leave. */\nfunction wireSession(): void {\n  sessionDispose?.();\n  sessionDispose = net.onSession(onSessionMsg);\n  // The OTHER road to the same ending: a host that vanishes without a goodbye.\n  // Wired for host and client alike (a host's transport never fires it) so the\n  // two subscriptions live and die together.\n  hostLostDispose?.();\n  // THE RETURN (THE SMOOTH SHELL): a hosted world's lost socket is reconnected in place first;\n  // only a return that fails lands on the start menu, with the same one word.\n  hostLostDispose = net.onHostLost(() => { if (net instanceof WsTransport) startReturn(); else onHostGone(HOST_LOST_WORD); });\n}\n\n/** The one word a lost session leaves on the start menu. */\nconst HOST_LOST_WORD = 'Connection to the host was lost.';\n/** THE RETURN in flight (one at a time). */\nlet returning = false;\n/** THE RETURN (THE SMOOTH SHELL, docs/engine/shard.md): the socket under a hosted world\n *  closed, or THE WATCHDOG lost patience with a silent one. Reconnect IN PLACE with THE\n *  RECONNECT TOKEN (WsTransport.resumeInPlace), the shell standing and straining meanwhile,\n *  retrying until the dormant window closes; only then the start menu, with the one word. */\nfunction startReturn(): void {\n  if (returning || !(net instanceof WsTransport)) return;\n  // THE RETURN'S WORD (W7): a hosted world's menu line names the world and carries the shard's own word.\n  const place = lastShardWorld ?? 'the world';\n  if (!running) { onHostGone(returnWord(place, '')); return; } // no shell to keep: the old road\n  const ws = net;\n  const deadline = performance.now() + WS_TRANSPORT_CFG.resumeWindowMs - Math.max(0, performance.now() - shell.lastArrivalMs);\n  returning = true;\n  void (async () => {\n    let word = '';\n    try {\n      for (let tries = 0; net === ws; tries++) {\n        const r = await ws.resumeInPlace();\n        if (net !== ws) return; // the player left meanwhile\n        if (r.ok) { shell.resumed(performance.now()); return; } // the same seat: the shell never left\n        word = r.word;\n        if (r.final || performance.now() >= deadline) break;\n        await new Promise(res => setTimeout(res, Math.min(2000, 250 * 2 ** tries)));\n      }\n      if (net !== ws) return;\n      // THE BUILD MISMATCH on a served page: the world was updated under us; the page reloads once.\n      if (lastShardUrl && reloadForBuild(lastShardUrl, new Error(word))) return;\n      onHostGone(returnWord(place, word)); // THE DOOR stays: the menu offers the way back\n    } finally { returning = false; }\n  })();\n}\n\n/** Dispatch a run-lifecycle message. HOST handles `rejoin`; CLIENT handles\n *  `runEnd` + `newRun`. */\nfunction onSessionMsg(msg: SessionMsg, from: string): void {\n  if (net.isHost) {\n    if (msg.t === 'rejoin') {\n      // A client chose its class for the next run. Seat them now if we're already\n      // mid-run, else queue until our new run begins (flushRejoins).\n      if (running && !world.gameOver) reseatPeer(from, msg.classId);\n      else pendingRejoins.set(from, msg.classId);\n    } else if (msg.t === 'cosmetics') {\n      const cosmeticLoadout = sanitizeCosmeticLoadout(msg.loadout);\n      const peer = net.peers().find(p => p.id === from);\n      if (peer) peer.cosmeticLoadout = cosmeticLoadout;\n      const seat = world.seats.find(s => s.id === from);\n      if (seat) (seat.home ?? seat.actor).cosmeticLoadout = cosmeticLoadout;\n    } else if (msg.t === 'action') {\n      // A client's meta intent for its OWN seat — queue for this frame's drain\n      // (applyAction runs host-side with the channel-bound `from` seat, so a\n      // client can only ever mutate its own build).\n      pendingActions.push({ seat: from, action: msg.action, seq: msg.seq }); // THE ECHO LAW: the client's seq rides along\n    }\n  } else if (msg.t === 'runEnd') {\n    onClientRunEnd();\n  } else if (msg.t === 'refused') {\n    onClientRefused(typeof msg.word === 'string' ? msg.word : '', msg.mu === true); // THE ACTING SEAT: a refused hero\n  } else if (msg.t === 'partyInvite') {\n    // THE PARTY: an invitation lands (one standing per inviter); THE PARTY THAT READS: it stands\n    // until its `until` (the shard's clock), wearing the Party pip and the beckon over the inviter.\n    PARTY_INBOX.land(msg, world.time);\n  } else if (msg.t === 'partyWord') {\n    partyWord = msg.word; // THE PARTY: the shard's one-line refusal, shown on the panel\n  } else if (msg.t === 'newRun') {\n    onClientNewRun(msg.seat, msg.seed);\n  } else if (msg.t === 'hostLeft') {\n    onHostGone('The host left the session.');\n  }\n}\n\n/** HOST: apply this frame's queued client meta intents to their OWN seats. A seat\n *  that has since left is simply skipped. applyAction validates + re-replicates. */\nfunction drainMetaActions(): void {\n  if (!pendingActions.length) return;\n  for (const { seat: seatId, action, seq } of pendingActions) {\n    const seat = world.seats.find(s => s.id === seatId);\n    if (!seat) continue;\n    // A client controls the action payload entirely — a malformed/hostile one\n    // (bad index, prototype-chain key) must NEVER throw out of the frame loop\n    // (that would permanently halt the host sim + freeze every client). One bad\n    // action just no-ops. world.applyAction also validates before dispatch.\n    noteActionEcho(world, seat, seq); // THE ECHO LAW: judged this tick (applied or refused), echoed on its build\n    try { world.applyAction(seat, action); }\n    catch (e) { console.warn('[coop] dropped malformed meta action', action, e); }\n  }\n  pendingActions.length = 0;\n}\n\n/** HOST: (re)seat an already-connected peer into the CURRENT run and tell them to\n *  spin up their render shell for it (`newRun`) + ship the terrain. */\nfunction reseatPeer(peerId: string, classId: string): void {\n  resetHostedPublication();\n  const cls = CLASSES.find(c => c.id === classId) ?? CLASSES[0];\n  if (!world.seats.some(s => s.id === peerId)) {\n    const cosmeticSeat = world.addSeat(peerId, cls, new RemoteInput(peerId));\n    cosmeticSeat.actor.cosmeticLoadout = sanitizeCosmeticLoadout(net.peers().find(p => p.id === peerId)?.cosmeticLoadout);\n  }\n  // THE SEED THREAD: newRun carries the seed of the run we are seating them\n  // INTO — deliberately not the one their welcome carried. This is our NEXT run\n  // with a freshly rolled manifest, so a client re-using the join-time seed\n  // would build the PREVIOUS run's map; the seed rides every seating message.\n  net.sendSession({ t: 'newRun', seat: peerId, seed: world.manifest.seed }, peerId);\n  if (!publishHostedSnapshot()) net.sendZone(serializeZone(world));\n}\n\n/** HOST: after a fresh co-op run begins, seat every peer that already picked a\n *  class at the run-end screen (queued while the host was choosing its own). */\nfunction flushRejoins(): void {\n  for (const [peerId, classId] of pendingRejoins) reseatPeer(peerId, classId);\n  pendingRejoins.clear();\n}\n\n/** CLIENT: the host's run ended — leave the (now-stale) render shell and offer a\n *  fresh class pick; choosing one asks the host to re-seat us in its next run. */\nfunction onClientRunEnd(): void {\n  // THE ACTING SEAT (the death beat): a hosted world's fall plays its presentation\n  // from the first dead frame; the rendering runs on, frozen, until it completes.\n  const presenting = net instanceof WsTransport && !!world.deathPresentation;\n  if (!presenting) running = false; // stop rendering the dead run\n  unsubscribeFromHost();    // drop the dead run's snapshot/zone subs + stale interp state\n  pendingRejoinClass = null;\n  // THE LOGIN THROUGH MU (card 22): on a hosted world a fallen player reads the\n  // reckoning, then drifts back into Mu bound for the same server — the next vessel\n  // is a walk, and its wake travels. (Card 14 C: the fall is the run's end.)\n  if (net instanceof WsTransport) {\n    const url = lastShardUrl, name = lastShardWorld;\n    const toMu = (): void => { resetToLocal(); if (url) writeDoor({ url, ...(name ? { world: name } : {}) }); void startMu(); }; // THE DOOR stays bound\n    const fell = shardVessel?.takeDeath(net, world);\n    const open = (revealSec = 0): void => { if (fell) ui.showDeath(fell.reck, toMu, revealSec); else toMu(); };\n    if (presenting) clientDeath = { open, opened: false }; // clientDeathBeat opens it at the presentation's reveal\n    else open();\n    return;\n  }\n  ui.resetClassRoster();    // deal a fresh class hand for the rejoin pick\n  const pickNextHero = (): void => ui.showClassSelect(cls => {\n    pendingRejoinClass = cls;\n    net.sendSession({ t: 'rejoin', classId: cls.id });\n    ui.hideAll();           // the class pick is sent; wait for the host's newRun\n  });\n  // THE DEATH COVENANT (THE SHARD — shardVessel): a vessel that fell on a\n  // hosted world reads its reckoning first (the death screen, the Vault),\n  // then picks the next hero; its body waits where it fell.\n  const fell = shardVessel?.takeDeath(net, world);\n  if (fell) ui.showDeath(fell.reck, pickNextHero); else pickNextHero();\n}\n\n/** THE IMMORTAL'S COVENANT ON A SHARD (card 30): presentation only, the shard decided and\n *  banked everything (and the link booked its word). THE CROSSING (a `stageDeath` word, then our\n *  body dead on the wire) plays the solo fade: the dark falls at the mode's own pace while the\n *  body lies dead, goes whole the frame the wake lands (our hero standing again, at the hearth,\n *  so the move is never seen), holds, then lifts. THE FALL (an Undying's body dead) plays the\n *  solo fall's dark, never the mortal's shatter; `runEnd` opens the screen over it. A crossing\n *  word with no death on screen (a late word at a join) is booked and never shown. True while it\n *  owns the frame. */\nconst COVENANT_FADE_CFG = {\n  /** A crossing word this old with no death on screen is a late word: booked, never shown (ms). */\n  staleMs: 3000,\n};\nlet clientCovenant: { kind: 'cross' | 'fall'; t: number; woke: number | null; fx: { fadeOutSec: number; holdSec: number; fadeInSec: number } } | null = null;\nfunction clientCovenantBeat(dt: number): boolean {\n  if (!(net instanceof WsTransport) || !shardVessel || shardVessel.net !== net) return false;\n  const me = shell.latest?.seats[world.clientSeatId];\n  const dead = !!me?.dead && world.player.dead;\n  if (!clientCovenant) {\n    const pending = shardVessel.crossingPending();\n    if (pending && dead) {\n      shardVessel.takeCrossing();\n      clientCovenant = { kind: 'cross', t: 0, woke: null, fx: shardVessel.fadePacing() };\n    } else if (pending && Date.now() - pending.at > COVENANT_FADE_CFG.staleMs) shardVessel.takeCrossing();\n    else if (dead && shardVessel.fallsOnDeath()) clientCovenant = { kind: 'fall', t: 0, woke: null, fx: shardVessel.fadePacing() };\n    if (!clientCovenant) return false;\n  }\n  const c = clientCovenant;\n  c.t += dt;\n  if (c.kind === 'fall') { world.screenFade = Math.min(1, c.t / RUN_END_FADE.outSec); return true; } // the solo fall's dark; runEnd opens the screen\n  if (c.woke === null && me && !me.dead) c.woke = c.t; // THE WAKE landed: the dark goes whole at once\n  if (c.woke === null) { world.screenFade = Math.min(1, c.t / Math.max(0.01, c.fx.fadeOutSec)); return true; }\n  const lift = Math.max(c.woke, c.fx.fadeOutSec) + c.fx.holdSec;\n  world.screenFade = c.t < lift ? 1 : Math.max(0, 1 - (c.t - lift) / Math.max(0.01, c.fx.fadeInSec));\n  if (c.t >= lift + c.fx.fadeInSec) { clientCovenant = null; world.screenFade = 0; }\n  return true;\n}\n\n/** THE ACTING SEAT (the death beat, docs/render/player-death.md): on a hosted world\n *  a fallen hero's body stands dead on the wire for VESSEL_CFG.deathBeatSec before\n *  `runEnd`, so the blow is seen. The presentation starts at the first frame our own\n *  seat reads dead, as in single player; `runEnd` hands onClientRunEnd's screen in\n *  (clientDeath), which opens at the presentation's reveal (at once if past it), and\n *  the frozen world stops rendering when the presentation completes. */\nlet clientDeath: { open: (revealSec?: number) => void; opened: boolean } | null = null;\nfunction clientDeathBeat(dt: number): void {\n  if (clientCovenantBeat(dt)) return; // THE IMMORTAL'S COVENANT ON A SHARD (card 30): the crossing's fade, the fall's dark\n  if (!(net instanceof WsTransport) || !DEATH_PRESENTATION.enabled) return;\n  if (!world.deathPresentation && world.player.dead && shell.latest?.seats[world.clientSeatId]?.dead) world.deathPresentation = { elapsed: 0 };\n  const dp = world.deathPresentation;\n  if (!dp) return;\n  dp.elapsed += dt;\n  const pose = deathPresentationPose(dp.elapsed);\n  world.screenFade = pose.fade;\n  if (clientDeath && pose.reveal && !clientDeath.opened) { clientDeath.opened = true; clientDeath.open(DEATH_PRESENTATION.revealSec); }\n  if (clientDeath?.opened && pose.complete) { clientDeath = null; running = false; }\n}\n\n/** CLIENT (THE ACTING SEAT, a refused hero): the shard would not seat the vessel we\n *  carried, and never seats a fresh hero in its place. A hero that cannot travel\n *  drifts back into Mu bound for the same world (wake another and it travels); a\n *  door word (this hero already walks there) lands on the start menu. */\nfunction onClientRefused(word: string, mu: boolean): void {\n  if (!(net instanceof WsTransport)) return;\n  running = false;\n  if (!mu) { toStartMenu(doorWord(word, 'the world would not seat this hero')); return; }\n  const url = lastShardUrl, name = lastShardWorld;\n  resetToLocal(); if (url) writeDoor({ url, ...(name ? { world: name } : {}) }); void startMu(word); // THE DOOR stays bound\n}\n\n/** CLIENT: the host re-seated us in its new run — rebuild our render shell and\n *  re-subscribe to the host's broadcasts with a clean snapshot state. */\nfunction onClientNewRun(seat: string, seed: number): void {\n  startAsClient(pendingRejoinClass ?? CLASSES[0], seat, seed);\n  subscribeToHost();        // fresh onState/onZone for the new run (torn down at runEnd)\n}\n\n/** Where the death screen's \"Rise Again\" leads: a live co-op host KEEPS the\n *  session + deals a fresh class hand for the next run (re-seating clients via\n *  flushRejoins); single-player returns to the start menu. */\nfunction onDeathDismiss(): void {\n  if (coopActive()) {\n    ui.showClassSelect(cls => { void withLoadingScreen(cls).then(started => { if (started) flushRejoins(); }); });\n  } else {\n    // THE LOOP CLOSES IN MU (data/mu.ts): a solo run's end drifts the player\n    // back into the hub between lives — the next vessel is a walk, not a\n    // menu. The main menu stays one Esc away from inside Mu.\n    void startMu();\n  }\n}\n"
        }
      ]
    },
    {
      "file": "src/world/captureGeography.ts",
      "rawBeforeHash": "1c11d46e9a8d67d74aec4977ba746d58650604077393d597f342421446605f29",
      "rawAfterHash": "42390342bebef841f6c21a657c1577cae2f548692f7e75183c931945e4bf1353",
      "beforeHash": "1c11d46e9a8d67d74aec4977ba746d58650604077393d597f342421446605f29",
      "afterHash": "de9b8615e679fd57ff7f5c4323434ed6e7a10f50aed5cd442c4481f41a453bc1",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { TILESETS, TILESETS_BY_BIOME, REALM_TILESETS_BY_BIOME } from '../data/tilesets';\nimport { snapshotNativeGeographyData, hydrateNativeGeographySource, type NativeGeographySource } from './geographySource';\n\nexport function captureNativeGeographySource(seed: number): Readonly<NativeGeographySource> {\n  // Copy registry containers before Object.entries can discard unsupported own\n  // descriptors, symbols or inherited state. The climate owner does the same\n  // before copying its private effective dimension overrides.\n  const biomes = snapshotNativeGeographyData(BIOMES), tilesets = snapshotNativeGeographyData(TILESETS);\n  const shared = snapshotNativeGeographyData(TILESETS_BY_BIOME), realms = snapshotNativeGeographyData(REALM_TILESETS_BY_BIOME);\n  const dimensions = captureDimensionDefinitions(snapshotNativeGeographyData);\n  return hydrateNativeGeographySource({ schema:1,algorithm:'native-geography-v1',seed,\n    continent:CONTINENT_CFG,climate:captureNativeClimateSource(),biomes:Object.entries(biomes),\n    field:{table:BIOME_FIELD,bands:BIOME_FIELD_BANDS,floors:BIOME_FLOORS,geometry:BIOME_FIELD_CFG,\n      oceanBiome:OCEAN_BIOME,marineMint:MARINE_MINT,portMint:PORT_MINT},\n    dimensions:Object.entries(dimensions),tilesets:Object.entries(tilesets),\n    pools:{shared:Object.entries(shared),realms:Object.entries(realms).map(([realm,pools])=>[realm,Object.entries(pools)])},\n  }).source;\n}\n",
          "after": "import { TILESETS, TILESETS_BY_BIOME, REALM_TILESETS_BY_BIOME } from '../data/tilesets';\nimport { snapshotNativeGeographyData, hydrateNativeGeographySource, type NativeGeographySource } from './geographySource';\n\n// Rows are pure assembly of our immutable registry snapshots. Live registry\n// descriptors and every child are still checked by snapshotNativeGeographyData\n// on every capture; a changed snapshot receives new rows. Hydration retains its\n// full prototype guard, semantic validation and private per-reader state.\nconst capturedRegistryRows = new WeakMap<object, unknown[]>();\nfunction registryRows<T>(snapshot: Record<string, T>): [string, T][] {\n  const known = capturedRegistryRows.get(snapshot);\n  if (known) return known as [string, T][];\n  const rows = snapshotNativeGeographyData(Object.entries(snapshot));\n  capturedRegistryRows.set(snapshot, rows);\n  return rows;\n}\n\n// Keep at most one complete captured source. Comparison sees only our owned\n// frozen copies; every live descriptor and child was checked before this point.\nlet previousCapture: { snapshot: unknown; source: Readonly<NativeGeographySource> } | undefined;\nfunction sameSnapshot(a: unknown, b: unknown): boolean {\n  if (Object.is(a, b)) return true;\n  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;\n  const keys = Reflect.ownKeys(a), prior = Reflect.ownKeys(b);\n  if (keys.length !== prior.length) return false;\n  for (let i = 0; i < keys.length; i++) {\n    if (keys[i] !== prior[i] || !sameSnapshot(Object.getOwnPropertyDescriptor(a, keys[i])!.value, Object.getOwnPropertyDescriptor(b, prior[i])!.value)) return false;\n  }\n  return true;\n}\n\nexport function captureNativeGeographySource(seed: number): Readonly<NativeGeographySource> {\n  // Copy registry containers before Object.entries can discard unsupported own\n  // descriptors, symbols or inherited state. The climate owner does the same\n  // before copying its private effective dimension overrides.\n  const biomes = snapshotNativeGeographyData(BIOMES), tilesets = snapshotNativeGeographyData(TILESETS);\n  const shared = snapshotNativeGeographyData(TILESETS_BY_BIOME), realms = snapshotNativeGeographyData(REALM_TILESETS_BY_BIOME);\n  const dimensions = captureDimensionDefinitions(snapshotNativeGeographyData);\n  const snapshot = snapshotNativeGeographyData({ schema:1 as const,algorithm:'native-geography-v1' as const,seed,\n    continent:CONTINENT_CFG,climate:captureNativeClimateSource(),biomes:registryRows(biomes),\n    field:{table:BIOME_FIELD,bands:BIOME_FIELD_BANDS,floors:BIOME_FLOORS,geometry:BIOME_FIELD_CFG,\n      oceanBiome:OCEAN_BIOME,marineMint:MARINE_MINT,portMint:PORT_MINT},\n    dimensions:registryRows(dimensions),tilesets:registryRows(tilesets),\n    pools:{shared:registryRows(shared),realms:registryRows(realms).map(([realm,pools])=>[realm,registryRows(pools)])},\n  });\n  const previous = previousCapture, matched = !!previous && sameSnapshot(snapshot, previous.snapshot);\n  const hydrated = hydrateNativeGeographySource(matched ? previous!.source : snapshot);\n  // A cold restored source has different immutable nodes from the live registry\n  // snapshot. Prove that pair once, then compare later live snapshots against\n  // their own prior tree. A guarded hydration fallback needs a fresh proof.\n  previousCapture = hydrated.identity.length * 2 <= 2 * 1024 * 1024\n    && (matched && hydrated.source === previous!.source || sameSnapshot(snapshot, hydrated.source))\n    ? { snapshot, source: hydrated.source } : undefined;\n  return hydrated.source;\n}\n"
        }
      ]
    },
    {
      "file": "src/world/geographySource.ts",
      "rawBeforeHash": "ebbd4ac772a208db6a30f9ed52f7aaf41607c7cbcc77111b2495d005c09e47d2",
      "rawAfterHash": "7309e41ca9573b061c63d79402fdc1ab3dd72e83cd19b0611179ba320c620068",
      "beforeHash": "ebbd4ac772a208db6a30f9ed52f7aaf41607c7cbcc77111b2495d005c09e47d2",
      "afterHash": "7033788b5c9d0333fe9de4fe018f486c3b5cd00fbbe51305d8a9fe0e508c9d53",
      "crlfLines": [],
      "hunks": [
        {
          "before": "// Hydration validates semantics separately and guards its own cache admission.\nconst geographySnapshots = new WeakSet<object>();\nconst geographySnapshotCopies = new WeakMap<object, object>();\nexport function snapshotNativeGeographyData<T>(input: T): T { return copyGeographyData(input, true); }\nfunction copyGeographyData<T>(input: T, immutable: boolean): T {\n  const visiting = new Set<object>();\n  const copy = (value: unknown, path: string): unknown => {\n    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;\n    if (typeof value === 'number') {\n      if (!Number.isFinite(value) || Object.is(value, -0)) fail(path, 'number must be finite and not negative zero');\n      return value;\n    }\n    if (!value || typeof value !== 'object') fail(path, 'unsupported non-JSON value');\n    if (immutable && geographySnapshots.has(value) && geographyPrototypeClean()) return value;\n    if (visiting.has(value)) fail(path, 'cycle');\n    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);\n    if (array ? proto !== Array.prototype : proto !== Object.prototype) fail(path, 'non-plain prototype');\n    // Even Object.prototype can acquire inherited enumerable state. It must not\n    // influence native for-in affinity multiplication outside the source bytes.\n    for (const key in value) if (!Object.hasOwn(value, key)) fail(path, 'inherited enumerable field');\n    const keys = Reflect.ownKeys(value);\n    if (keys.some(k => typeof k !== 'string')) fail(path, 'symbol field');\n    visiting.add(value);\n    try {\n      if (array) {\n        if (keys.length !== value.length + 1 || !keys.includes('length')) fail(path, 'sparse array or non-index array property');\n        const out: unknown[] = [];\n        for (let i = 0; i < value.length; i++) {\n          const d = Object.getOwnPropertyDescriptor(value, String(i));\n          if (!d || !d.enumerable || !('value' in d)) fail(`${path}[${i}]`, 'array slots must be own enumerable data');\n          out.push(copy(d.value, `${path}[${i}]`));\n        }\n        if (!immutable) return out;\n        const previous = geographySnapshotCopies.get(value);\n        const result = previous && Array.isArray(previous) && previous.length === out.length && out.every((entry, index) => Object.is(entry, previous[index])) ? previous : Object.freeze(out);\n        geographySnapshotCopies.set(value, result); geographySnapshots.add(result);\n        return result;\n      }\n      const entries: [string, unknown][] = [];\n      for (const key of keys as string[]) {\n        lookupKey(key,path);\n        const d = Object.getOwnPropertyDescriptor(value, key)!;\n        if (!d.enumerable || !('value' in d)) fail(`${path}.${key}`, 'fields must be own enumerable data');\n        entries.push([key, copy(d.value, `${path}.${key}`)]);\n      }\n      if (!immutable) return Object.fromEntries(entries);\n      const previous = geographySnapshotCopies.get(value), previousKeys = previous && Object.keys(previous);\n      const same = previous && !Array.isArray(previous) && previousKeys!.length === entries.length && entries.every(([key, entry], index) => previousKeys![index] === key && Object.is(Object.getOwnPropertyDescriptor(previous, key)!.value, entry));\n      const result = same ? previous : Object.freeze(Object.fromEntries(entries));\n      geographySnapshotCopies.set(value, result); geographySnapshots.add(result);\n      return result;\n    } finally { visiting.delete(value); }\n  };\n  return copy(input, '$') as T;\n}\nfunction freezeData<T>(value: T): T {\n  if (value && typeof value === 'object') { for (const child of Object.values(value)) freezeData(child); Object.freeze(value); }\n  return value;\n}\nfunction record(value: unknown, path: string): asserts value is Record<string, unknown> {\n  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected record');\n}\nfunction array(value: unknown, path: string): asserts value is unknown[] {\n  if (!Array.isArray(value)) fail(path, 'expected array');\n}\nfunction string(value: unknown, path: string): asserts value is string {\n  if (typeof value !== 'string') fail(path, 'expected string');\n}\nfunction number(value: unknown, path: string): asserts value is number {\n  if (typeof value !== 'number') fail(path, 'expected number');\n}\nfunction fields(value: Record<string, unknown>, required: readonly string[], optional: readonly string[], path: string): void {\n  for (const key of required) if (!Object.hasOwn(value, key)) fail(path, `missing ${key}`);\n  for (const key of Object.keys(value)) if (!required.includes(key) && !optional.includes(key)) fail(path, `unsupported ${key}`);\n}\nfunction numericFields(value: Record<string, unknown>, required: readonly string[], optional: readonly string[], path: string): void {\n  fields(value, required, optional, path);\n  for (const key of Object.keys(value)) number(value[key], `${path}.${key}`);\n}\nfunction envelope(value: unknown, path: string): void {\n  record(value, path); fields(value, [], ['from','to','fadeIn','fadeOut','stops','mul'], path);\n  for (const key of ['from','to','fadeIn','fadeOut','mul']) if (Object.hasOwn(value,key)) number(value[key], `${path}.${key}`);\n  if (Object.hasOwn(value,'stops')) {\n    array(value.stops, `${path}.stops`);\n    for (const [i,stop] of value.stops.entries()) { array(stop, `${path}.stops[${i}]`); if (stop.length !== 2) fail(path, 'invalid envelope stop'); stop.forEach(v=>number(v,path)); }\n  }\n}\nfunction affinity(value: unknown, path: string): void {\n  record(value, path);\n  for (const [axis,spec] of Object.entries(value)) {\n    lookupKey(axis,path); if (typeof spec === 'string') lookupKey(spec,path); else envelope(spec, `${path}.${axis}`);\n  }\n}\nfunction palette(value: unknown, path: string, empty: boolean): void {\n  array(value,path); if (!empty && !value.length) fail(path,'empty native candidate table');\n  for (const [i,row] of value.entries()) {\n    record(row,`${path}[${i}]`); fields(row,['biome'],['weight'],`${path}[${i}]`); string(row.biome,path); lookupKey(row.biome,path);\n    if (Object.hasOwn(row,'weight')) number(row.weight,path);\n  }\n}\n/** Tuple maps describe native own-key enumeration, never arbitrary Map order.\n * Ordinary records intentionally keep their native Object.prototype lookup\n * behavior for unknown caller keys; complete definitions remain own entries. */\nfunction rows(value: unknown, path: string, check: (v: unknown, path: string)=>void): void {\n  array(value,path); const seen = new Set<string>(), entries: [string,unknown][] = [];\n  for (const [i,row] of value.entries()) {\n    array(row,`${path}[${i}]`); if (row.length !== 2) fail(path,'expected key/definition tuple'); string(row[0],path); lookupKey(row[0],path);\n    if (seen.has(row[0])) fail(path,'duplicate registry key'); seen.add(row[0]); check(row[1],`${path}.${row[0]}`); entries.push([row[0],row[1]]);\n  }\n  if (Object.keys(Object.fromEntries(entries)).some((key,i)=>key !== entries[i][0])) fail(path,'tuple order cannot represent native own-key order');\n}\nfunction geometry(value: unknown, path: string): void {\n  record(value,path); fields(value,['cellSpan','jitter','renderCell','deepThreshold','regionScale','hillshade','warpFadePerSec'],[],path);\n  for (const key of ['cellSpan','jitter','renderCell','deepThreshold','warpFadePerSec']) number(value[key],`${path}.${key}`);\n  if ((value.cellSpan as number) <= 0 || (value.renderCell as number) <= 0) fail(path,'cell spans must be positive');\n  record(value.regionScale,path); fields(value.regionScale,['default','min','max','search'],[],path);\n  const scale = value.regionScale; for (const key of ['min','max','search']) number(scale[key],path);\n  array(scale.default,path); if (scale.default.length !== 2) fail(path,'region default needs two values'); scale.default.forEach(v=>number(v,path));\n  if ((scale.min as number) <= 0 || (scale.max as number) < (scale.min as number) || !Number.isSafeInteger(scale.search) || (scale.search as number) < 0) fail(path,'invalid region search/scale');\n  record(value.hillshade,path); numericFields(value.hillshade,['gain','peakFrom','peakGain','max'],[],path);\n}\nfunction validateSource(value: unknown): asserts value is NativeGeographySource {\n  record(value,'$'); fields(value,['schema','algorithm','seed','continent','climate','biomes','field','dimensions','tilesets','pools'],[],'$');\n  if (value.schema !== 1 || value.algorithm !== 'native-geography-v1') fail('$','unsupported schema/algorithm');\n  if (!Number.isInteger(value.seed) || (value.seed as number) < 0 || (value.seed as number) > 0xffffffff) fail('$.seed','expected uint32');\n  record(value.continent,'$.continent'); numericFields(value.continent,['cellSpan','jitter','oceanFrac','bridgeChance'],[],'$.continent');\n  if ((value.continent.cellSpan as number) <= 0) fail('$.continent','cell span must be positive');\n  // Existing climate hydration validates the exact native layers, envelopes and\n  // tagged anchors. The strict outer copy has already checked every descriptor.\n  const climate = hydrateNativeClimateSource(value.climate as NativeClimateSource);\n  const validLayers = (layers: readonly import('./climate').ClimateLayer[], path: string) => {\n    for (const layer of layers) {\n      if ('anchor' in layer && layer.anchor !== undefined) lookupKey(layer.anchor,path);\n      if ((layer.kind === 'noise' || layer.kind === 'ridge') && layer.cell <= 0) fail(path,'noise/ridge cell must be positive');\n      if ((layer.kind === 'radial' || layer.kind === 'basin') && layer.span <= 0) fail(path,'radial/basin span must be positive');\n    }\n  };\n  for (const [axis,def] of climate.source.axes) { lookupKey(axis,'$.climate.axes'); lookupKey(def.id,'$.climate.axes.id'); validLayers(def.layers,'$.climate.axes.'+axis); }\n  for (const [axis,bands] of climate.source.bands) { lookupKey(axis,'$.climate.bands'); for (const [name] of bands) lookupKey(name,'$.climate.bands'); }\n  for (const [anchor] of climate.source.anchors) lookupKey(anchor,'$.climate.anchors');\n  for (const [dim,overrides] of climate.source.dimensions) {\n    lookupKey(dim,'$.climate.dimensions'); for (const [axis,def] of overrides) { lookupKey(axis,'$.climate.dimensions');\n      if (def.layers) validLayers(def.layers,'$.climate.dimensions.'+dim+'.'+axis);\n    }\n  }\n  rows(value.biomes,'$.biomes',(def,path)=>{\n    record(def,path); for (const key of ['patronFaction','mapColor','label']) string(def[key],`${path}.${key}`);\n    if (Object.hasOwn(def,'climate')) affinity(def.climate,`${path}.climate`);\n    if (Object.hasOwn(def,'regionScale')) { array(def.regionScale,path); if (def.regionScale.length !== 2) fail(path,'region scale pair required'); def.regionScale.forEach(v=>number(v,path)); }\n  });\n  record(value.field,'$.field'); const field = value.field;\n  fields(field,['table','bands','floors','geometry','oceanBiome','marineMint','portMint'],[],'$.field');\n  palette(field.table,'$.field.table',false); geometry(field.geometry,'$.field.geometry'); string(field.oceanBiome,'$.field.oceanBiome');\n  array(field.bands,'$.field.bands');\n  for (const [i,band] of field.bands.entries()) {\n    const path = `$.field.bands[${i}]`; record(band,path); fields(band,['id','when','table'],['mode'],path); string(band.id,path);\n    if (Object.hasOwn(band,'mode') && band.mode !== 'replace' && band.mode !== 'tilt') fail(path,'unknown band mode');\n    record(band.when,path); fields(band.when,['axis','env'],[],path); string(band.when.axis,path); lookupKey(band.when.axis,path); envelope(band.when.env,path); palette(band.table,path,band.mode === 'tilt');\n  }\n  array(field.floors,'$.field.floors');\n  for (const [i,floor] of field.floors.entries()) {\n    const path = `$.field.floors[${i}]`; record(floor,path); fields(floor,['biome','discs'],[],path); string(floor.biome,path); lookupKey(floor.biome,path); array(floor.discs,path);\n    for (const disc of floor.discs) { record(disc,path); fields(disc,['anchor','r'],[],path); string(disc.anchor,path); lookupKey(disc.anchor,path); number(disc.r,path); if (disc.r < 0) fail(path,'negative floor radius'); }\n  }\n  record(field.marineMint,'$.field.marineMint'); fields(field.marineMint,['deepBiome','openShallowBiome'],[],'$.field.marineMint');\n  string(field.marineMint.deepBiome,'$.field.marineMint'); string(field.marineMint.openShallowBiome,'$.field.marineMint');\n  record(field.portMint,'$.field.portMint'); fields(field.portMint,['fallbackBiome'],[],'$.field.portMint'); string(field.portMint.fallbackBiome,'$.field.portMint');\n  rows(value.dimensions,'$.dimensions',(def,path)=>{\n    record(def,path); for (const key of ['id','label','color']) string(def[key],`${path}.${key}`);\n    if (Object.hasOwn(def,'biomes')) palette(def.biomes,`${path}.biomes`,true);\n  });\n  if (!(value.dimensions as [string,unknown][]).some(([key])=>key === 'surface')) fail('$.dimensions','surface fallback definition required');\n  rows(value.tilesets,'$.tilesets',(def,path)=>{\n    record(def,path);\n    // Retain the complete native definition and require its mandatory payload\n    // shape. This is source completeness, not layout compiler validation.\n    string(def.id,path); string(def.spawnerId,path); record(def.theme,path); record(def.packs,path);\n    for (const key of ['nameFirst','nameSecond']) { array(def[key],path); def[key].forEach(v=>string(v,path)); }\n    for (const key of ['sizeW','sizeH']) { array(def[key],path); if (def[key].length !== 2) fail(path,'tileset size pair required'); def[key].forEach(v=>number(v,path)); }\n    array(def.layout,path); array(def.objectives,path);\n    if (Object.hasOwn(def,'depthAffinity')) envelope(def.depthAffinity,`${path}.depthAffinity`);\n    if (Object.hasOwn(def,'geoAffinity')) affinity(def.geoAffinity,`${path}.geoAffinity`);\n  });\n  record(value.pools,'$.pools'); fields(value.pools,['shared','realms'],[],'$.pools');\n  const faceIds = new Set((value.tilesets as [string,unknown][]).map(([key])=>key));\n  const pool = (v: unknown,path:string) => {\n    array(v,path); for (const id of v) { string(id,path); lookupKey(id,path); if (!faceIds.has(id)) fail(path,'pool references an absent tileset source'); }\n  };\n  rows(value.pools.shared,'$.pools.shared',pool);\n  rows(value.pools.realms,'$.pools.realms',(v,path)=>rows(v,path,pool));\n}\n/** Supported work envelope for native-geography-v1. Refuse outside it; never\n * clamp native configuration or truncate a floor/region/landfall search. */\nexport const NATIVE_GEOGRAPHY_LIMITS = Object.freeze({\n  maxRegionSearch:16, maxFloorCandidateScans:262144, maxLandfallSteps:4096,\n});\nfunction safeInteger(value:number,path:string):void {\n  if (!Number.isSafeInteger(value) || value+1 === value || value-1 === value) fail(path,'lattice index cannot progress exactly');\n}\nfunction finite(value:number,path:string):void { if (!Number.isFinite(value)) fail(path,'nonfinite derived arithmetic'); }\nfunction pointData(at:MapCoord,path:string):MapCoord {\n  if (!at || typeof at !== 'object') fail(path,'expected coordinate data');\n  const x=Object.getOwnPropertyDescriptor(at,'x'),y=Object.getOwnPropertyDescriptor(at,'y');\n  if (!x || !y || !('value' in x) || !('value' in y) || typeof x.value !== 'number' || typeof y.value !== 'number') fail(path,'coordinates require own numeric data fields');\n  finite(x.value,path);finite(y.value,path);return {x:x.value,y:y.value};\n}\nfunction latticeRange(at:MapCoord,span:number,jitter:number,search:number,path:string):void {\n  for (const coordinate of [at.x,at.y]) {\n    const cell=Math.floor(coordinate/span);safeInteger(cell-search-1,path);safeInteger(cell+search+1,path);\n    for (const edge of [cell-search+.5-Math.abs(jitter)/2,cell+search+.5+Math.abs(jitter)/2]) {\n      const site=edge*span;finite(site,path);finite(2*((site-coordinate)**2),path);\n    }\n  }\n}\nfunction climateLayers(source:NativeGeographySource):import('./climate').ClimateLayer[] {\n  return [...source.climate.axes.flatMap(([,def])=>def.layers),\n    ...source.climate.dimensions.flatMap(([,axes])=>axes.flatMap(([,def])=>def.layers??[]))];\n}\nfunction anchorAt(source:NativeGeographySource,name:string|undefined):MapCoord|undefined {\n  if (name === undefined || name === 'origin') return source.climate.origin;\n  const value=source.climate.anchors.find(([key])=>key === name)?.[1];\n  return value?.state === 'point' ? value.point : undefined;\n}\nfunction checkPoint(source:NativeGeographySource,at:MapCoord,path:string):void {\n  const {geometry}=source.field;\n  latticeRange(at,geometry.cellSpan,geometry.jitter,geometry.regionScale.search,path+'.field');\n  latticeRange(at,source.continent.cellSpan,source.continent.jitter,1,path+'.continent');\n  for (const layer of climateLayers(source)) {\n    if (layer.kind === 'noise' || layer.kind === 'ridge') latticeRange(at,layer.cell,0,1,path+'.noise');\n    if (layer.kind === 'radial' || layer.kind === 'basin') {\n      // Unlike floor discs, an explicitly named climate anchor 'origin' is a\n      // registry lookup; only an omitted radial anchor means climate.origin.\n      const anchor=layer.anchor === undefined ? source.climate.origin\n        : source.climate.anchors.find(([key])=>key === layer.anchor)?.[1];\n      const p=anchor && 'state' in anchor ? (anchor.state === 'point' ? anchor.point : undefined) : anchor as MapCoord|undefined;\n      if (p) { const distance=Math.sqrt((at.x-p.x)**2+(at.y-p.y)**2);finite(distance,path+'.radial');finite((distance-(layer.innerRadius??0))/layer.span,path+'.radial'); }\n    }\n    if (layer.kind === 'coastal') for (let i=0;i<4;i++) {\n      const a=i/4*Math.PI*2,probe={x:at.x+Math.cos(a)*layer.probe,y:at.y+Math.sin(a)*layer.probe};\n      finite(probe.x,path+'.coastal');finite(probe.y,path+'.coastal');latticeRange(probe,source.continent.cellSpan,source.continent.jitter,1,path+'.coastal');\n    }\n  }\n}\nfunction validateExecutionDomain(source:NativeGeographySource):void {\n  if (source.field.geometry.regionScale.search > NATIVE_GEOGRAPHY_LIMITS.maxRegionSearch) fail('$.field.geometry.regionScale.search','unsupported region work budget');\n  checkPoint(source,pointData(source.climate.origin,'$.climate.origin'),'$.climate.origin');\n  for (const [name,anchor] of source.climate.anchors) if (anchor.state === 'point') checkPoint(source,pointData(anchor.point,'$.climate.anchors.'+name),'$.climate.anchors.'+name);\n  let scans=0;const {cellSpan:span,jitter}=source.field.geometry;\n  for (const floor of source.field.floors) for (const disc of floor.discs) {\n    const at=anchorAt(source,disc.anchor);if (!at) continue;\n    const x0=Math.floor((at.x-disc.r)/span)-1,x1=Math.floor((at.x+disc.r)/span)+1;\n    const y0=Math.floor((at.y-disc.r)/span)-1,y1=Math.floor((at.y+disc.r)/span)+1;\n    for (const n of [x0,x1,y0,y1]) safeInteger(n,'$.field.floors');\n    const cells=(x1-x0+1)*(y1-y0+1);scans+=cells;\n    if (!Number.isSafeInteger(cells) || !Number.isSafeInteger(scans) || scans>NATIVE_GEOGRAPHY_LIMITS.maxFloorCandidateScans) fail('$.field.floors','unsupported aggregate candidate scan budget');\n    // A site's full possible jitter extent must remain in the numeric domain\n    // of every continent/climate operation used by the native floor scan.\n    for (const gx of [x0+.5-Math.abs(jitter)/2,x1+.5+Math.abs(jitter)/2])\n      for (const gy of [y0+.5-Math.abs(jitter)/2,y1+.5+Math.abs(jitter)/2])\n        checkPoint(source,{x:gx*span,y:gy*span},'$.field.floors.site');\n  }\n}\n\n/** Exact serialized bytes are the source identity at this boundary. Nested\n * property order is retained; no canonical sorting or partial sampling hash. */\n// Only our fully validated, deeply frozen output can take this shortcut. Caller\n// objects, even frozen lookalikes, always pass the complete descriptor/domain\n// checks. Readers still build independent execution views and derived memos.\ntype HydratedGeography = Readonly<{source: Readonly<NativeGeographySource>; identity: string}>;\nconst hydratedGeography = new WeakMap<object, HydratedGeography>();\nconst restoredGeography = new Map<string, HydratedGeography>();\nlet restoredGeographyBytes = 0;\nconst RESTORED_GEOGRAPHY_MAX_BYTES = 2 * 1024 * 1024;\n// Frozen plain data still inherits the realm's prototypes. Validation also uses\n// non-enumerable inherited optional keys and JSON may consult toJSON. Compare\n// complete descriptors without invoking getters before reusing any validation.\nconst geographyPrototypes = [Object.prototype, Array.prototype].map(value => ({\n  value, parent: Object.getPrototypeOf(value), descriptors: Object.getOwnPropertyDescriptors(value), keys: Reflect.ownKeys(value),\n}));\nfunction geographyPrototypeClean(): boolean {\n  for (const row of geographyPrototypes) {\n    if (Object.getPrototypeOf(row.value) !== row.parent) return false;\n    const keys = Reflect.ownKeys(row.value);\n    if (keys.length !== row.keys.length || keys.some((key, index) => key !== row.keys[index])) return false;\n    for (const key of keys) {\n      const before = Object.getOwnPropertyDescriptor(row.descriptors, key)!.value as PropertyDescriptor;\n      const after = Object.getOwnPropertyDescriptor(row.value, key)!;\n      for (const field of ['value','writable','get','set','enumerable','configurable'] as const)\n        if (Object.hasOwn(before, field) !== Object.hasOwn(after, field) || before[field] !== after[field]) return false;\n    }\n  }\n  return true;\n}\nexport function hydrateNativeGeographySource(input: unknown) {\n  const clean = geographyPrototypeClean();\n  if (input && typeof input === 'object' && clean) {\n    const known = hydratedGeography.get(input); if (known) return known;\n  }\n  const source = snapshotNativeGeographyData(input);\n  const copiedClean = geographyPrototypeClean();\n  let exactIdentity: string | undefined;\n  if (clean && copiedClean && geographyPrototypeClean()) {\n    exactIdentity = JSON.stringify(source);\n    const known = restoredGeography.get(exactIdentity); if (known) return known;\n  }\n  // With changed prototypes keep original ordering: semantic refusal must occur\n  // before JSON could invoke an inherited toJSON on invalid source data.\n  validateSource(source); validateExecutionDomain(source);\n  const identity = exactIdentity ?? JSON.stringify(source);\n  freezeData(source);\n  const hydrated = Object.freeze({ source, identity });\n  if (clean && copiedClean && geographyPrototypeClean()) {\n    // Complete structural snapshot plus exact prior semantic identity, or fresh full validation.\n    const known = restoredGeography.get(identity);\n    if (known) return known;\n    hydratedGeography.set(source, hydrated); rememberGeography(hydrated);\n  }\n  return hydrated;\n}\nexport function restoreNativeGeographySource(bytes: string): Readonly<NativeGeographySource> {\n  if (typeof bytes !== 'string') fail('$','source bytes must be a string');\n  if (geographyPrototypeClean()) {\n    const known = restoredGeography.get(bytes);\n    if (known) { restoredGeography.delete(bytes); restoredGeography.set(bytes, known); return known.source; }\n  }\n  const hydrated = hydrateNativeGeographySource(JSON.parse(bytes) as unknown);\n  if (hydrated.identity !== bytes) fail('$','source bytes must be the exact native serialization');\n  return hydrated.source;\n}\nfunction rememberGeography(hydrated: HydratedGeography): void {\n  // Full bytes, never a sampling checksum. Bound entries and UTF-16 key storage.\n  // Larger inputs stay valid; existing reader lifetimes own their weak entries.\n  const bytes = hydrated.identity;\n  if (bytes.length * 2 > RESTORED_GEOGRAPHY_MAX_BYTES) return;\n  if (restoredGeography.has(bytes)) restoredGeographyBytes -= bytes.length * 2;\n  restoredGeography.delete(bytes); restoredGeography.set(bytes, hydrated); restoredGeographyBytes += bytes.length * 2;\n  while (restoredGeography.size > 4 || restoredGeographyBytes > RESTORED_GEOGRAPHY_MAX_BYTES) {\n    const oldest = restoredGeography.keys().next().value!;\n    restoredGeography.delete(oldest); restoredGeographyBytes -= oldest.length * 2;\n  }\n}\n/** Private execution views have own-only lookup, insulating native operations\n * from later Object.prototype data changes. Source bytes remain ordinary JSON.\n * Reserved prototype aliases are outside this new schema/API; classic wrappers\n * are unchanged. This does not defend against arbitrary intrinsic monkeypatches. */\nfunction ownData<T>(value: T): T {\n  if (Array.isArray(value)) return value.map(v=>ownData(v)) as T;\n  if (value && typeof value === 'object') {\n    const out = Object.create(null) as Record<string,unknown>;\n    for (const [key,child] of Object.entries(value)) out[key] = ownData(child);\n    return out as T;\n  }\n  return value;\n}\n// Only immutable execution data is shared. Climate home-cell/warning state,\n// field-choice memo tables, continent readers and query closures remain per reader.\nfunction makeGeographyExecution(source: Readonly<NativeGeographySource>) {\n  const runtime = freezeData(ownData(source));\n  const climateData = freezeData(ownData(hydrateNativeClimateSource(source.climate)));\n  const biomes = freezeData(ownData(Object.fromEntries(runtime.biomes)));\n  const dimensions = freezeData(ownData(Object.fromEntries(runtime.dimensions)));\n  const dimensionSource = freezeData(Object.assign(Object.create(null) as Record<string,DimensionDef>,Object.fromEntries(source.dimensions)));\n  const tilesets = freezeData(ownData(Object.fromEntries(runtime.tilesets)));\n  return Object.freeze({ runtime, climateData, biomes, dimensions, dimensionSource, tilesets });\n}\nconst geographyExecution = new WeakMap<object, ReturnType<typeof makeGeographyExecution>>();",
          "after": "// Hydration validates semantics separately and guards its own cache admission.\nconst geographySnapshots = new WeakSet<object>();\nconst geographySnapshotCopies = new WeakMap<object, object>();\nconst geographySnapshotKeys = new WeakMap<object, readonly string[]>();\nexport function snapshotNativeGeographyData<T>(input: T): T { return copyGeographyData(input, true); }\n// Shared validation avoids one closure per live object. Both checks still run\n// at their original boundaries, including after caller-controlled child traps.\nfunction assertInheritedGeography(value: object, proto: object, path: string): void {\n  if (Object.getPrototypeOf(value) !== proto) fail(path, 'prototype changed during copy');\n  for (const key in proto) if (!Object.hasOwn(value, key)) fail(path, 'inherited enumerable field');\n}\nfunction copyGeographyData<T>(input: T, immutable: boolean): T {\n  const visiting = new Set<object>();\n  const copy = (value: unknown, parent: string, key?: string | number): unknown => {\n    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;\n    // Valid primitive leaves do not need a diagnostic path allocation.\n    if (typeof value === 'number' && Number.isFinite(value) && !Object.is(value, -0)) return value;\n    const path = key === undefined ? parent : typeof key === 'number' ? parent + '[' + key + ']' : parent + '.' + key;\n    if (typeof value === 'number') fail(path, 'number must be finite and not negative zero');\n    if (!value || typeof value !== 'object') fail(path, 'unsupported non-JSON value');\n    if (immutable && geographySnapshots.has(value) && geographyPrototypeClean()) return value;\n    if (visiting.has(value)) fail(path, 'cycle');\n    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);\n    if (array ? proto !== Array.prototype : proto !== Object.prototype) fail(path, 'non-plain prototype');\n    const keys = Reflect.ownKeys(value);\n    for (let i = 0; i < keys.length; i++) if (typeof keys[i] !== 'string') fail(path, 'symbol field');\n    assertInheritedGeography(value, proto, path);\n    visiting.add(value);\n    try {\n      const previous = immutable ? geographySnapshotCopies.get(value) : undefined;\n      if (array) {\n        if (keys.length !== value.length + 1 || !keys.includes('length')) fail(path, 'sparse array or non-index array property');\n        const prior = previous && Array.isArray(previous) && previous.length === value.length ? previous : undefined;\n        let out: unknown[] | undefined = prior ? undefined : [];\n        for (let i = 0; i < value.length; i++) {\n          const d = Object.getOwnPropertyDescriptor(value, String(i));\n          if (!d || !d.enumerable || !('value' in d)) fail(`${path}[${i}]`, 'array slots must be own enumerable data');\n          const raw = d.value;\n          // Primitive leaves need no recursive frame or diagnostic path.\n          const child = raw === null || typeof raw === 'string' || typeof raw === 'boolean'\n            || typeof raw === 'number' && Number.isFinite(raw) && !Object.is(raw, -0) ? raw : copy(raw, path, i);\n          if (!out && !Object.is(child, prior![i])) { out = []; for (let j = 0; j < i; j++) out.push(prior![j]); }\n          if (out) out.push(child);\n        }\n        assertInheritedGeography(value, proto, path);\n        if (!immutable) return out!;\n        const result = out ? Object.freeze(out) : prior!;\n        if (out) { geographySnapshotCopies.set(value, result); geographySnapshots.add(result); }\n        return result;\n      }\n      const names = keys as string[], priorKeys = previous && geographySnapshotKeys.get(previous);\n      let same = !!previous && !Array.isArray(previous) && priorKeys?.length === names.length;\n      let out: Record<string, unknown> | undefined = same ? undefined : {};\n      for (let i = 0; i < names.length; i++) {\n        const key = names[i];lookupKey(key,path);\n        const d = Object.getOwnPropertyDescriptor(value, key)!;\n        if (!d.enumerable || !('value' in d)) fail(`${path}.${key}`, 'fields must be own enumerable data');\n        const raw = d.value;\n        // Primitive leaves need no recursive frame or diagnostic path.\n        const child = raw === null || typeof raw === 'string' || typeof raw === 'boolean'\n          || typeof raw === 'number' && Number.isFinite(raw) && !Object.is(raw, -0) ? raw : copy(raw, path, key);\n        if (same && (priorKeys![i] !== key || !Object.is((previous as Record<string, unknown>)[key], child))) {\n          same = false;out = {};\n          for (let j = 0; j < i; j++) Object.defineProperty(out,names[j],{value:(previous as Record<string, unknown>)[names[j]],enumerable:true,writable:true,configurable:true});\n        }\n        if (out) Object.defineProperty(out,key,{value:child,enumerable:true,writable:true,configurable:true});\n      }\n      assertInheritedGeography(value, proto, path);\n      if (!immutable) return out!;\n      const result = same ? previous! : Object.freeze(out!);\n      if (!same) {\n        geographySnapshotKeys.set(result, names);\n        geographySnapshotCopies.set(value, result); geographySnapshots.add(result);\n      }\n      return result;\n    } finally { visiting.delete(value); }\n  };\n  return copy(input, '$') as T;\n}\nfunction freezeData<T>(value: T): T {\n  if (value && typeof value === 'object') { for (const child of Object.values(value)) freezeData(child); Object.freeze(value); }\n  return value;\n}\nfunction record(value: unknown, path: string): asserts value is Record<string, unknown> {\n  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected record');\n}\nfunction array(value: unknown, path: string): asserts value is unknown[] {\n  if (!Array.isArray(value)) fail(path, 'expected array');\n}\nfunction string(value: unknown, path: string): asserts value is string {\n  if (typeof value !== 'string') fail(path, 'expected string');\n}\nfunction number(value: unknown, path: string): asserts value is number {\n  if (typeof value !== 'number') fail(path, 'expected number');\n}\nfunction fields(value: Record<string, unknown>, required: readonly string[], optional: readonly string[], path: string): void {\n  for (const key of required) if (!Object.hasOwn(value, key)) fail(path, `missing ${key}`);\n  for (const key of Object.keys(value)) if (!required.includes(key) && !optional.includes(key)) fail(path, `unsupported ${key}`);\n}\nfunction numericFields(value: Record<string, unknown>, required: readonly string[], optional: readonly string[], path: string): void {\n  fields(value, required, optional, path);\n  for (const key of Object.keys(value)) number(value[key], `${path}.${key}`);\n}\nfunction envelope(value: unknown, path: string): void {\n  record(value, path); fields(value, [], ['from','to','fadeIn','fadeOut','stops','mul'], path);\n  for (const key of ['from','to','fadeIn','fadeOut','mul']) if (Object.hasOwn(value,key)) number(value[key], `${path}.${key}`);\n  if (Object.hasOwn(value,'stops')) {\n    array(value.stops, `${path}.stops`);\n    for (const [i,stop] of value.stops.entries()) { array(stop, `${path}.stops[${i}]`); if (stop.length !== 2) fail(path, 'invalid envelope stop'); stop.forEach(v=>number(v,path)); }\n  }\n}\nfunction affinity(value: unknown, path: string): void {\n  record(value, path);\n  for (const [axis,spec] of Object.entries(value)) {\n    lookupKey(axis,path); if (typeof spec === 'string') lookupKey(spec,path); else envelope(spec, `${path}.${axis}`);\n  }\n}\nfunction palette(value: unknown, path: string, empty: boolean): void {\n  array(value,path); if (!empty && !value.length) fail(path,'empty native candidate table');\n  for (const [i,row] of value.entries()) {\n    record(row,`${path}[${i}]`); fields(row,['biome'],['weight'],`${path}[${i}]`); string(row.biome,path); lookupKey(row.biome,path);\n    if (Object.hasOwn(row,'weight')) number(row.weight,path);\n  }\n}\n/** Tuple maps describe native own-key enumeration, never arbitrary Map order.\n * Ordinary records intentionally keep their native Object.prototype lookup\n * behavior for unknown caller keys; complete definitions remain own entries. */\nfunction rows(value: unknown, path: string, check: (v: unknown, path: string)=>void): void {\n  array(value,path); const seen = new Set<string>(), entries: [string,unknown][] = [];\n  for (const [i,row] of value.entries()) {\n    array(row,`${path}[${i}]`); if (row.length !== 2) fail(path,'expected key/definition tuple'); string(row[0],path); lookupKey(row[0],path);\n    if (seen.has(row[0])) fail(path,'duplicate registry key'); seen.add(row[0]); check(row[1],`${path}.${row[0]}`); entries.push([row[0],row[1]]);\n  }\n  if (Object.keys(Object.fromEntries(entries)).some((key,i)=>key !== entries[i][0])) fail(path,'tuple order cannot represent native own-key order');\n}\nfunction geometry(value: unknown, path: string): void {\n  record(value,path); fields(value,['cellSpan','jitter','renderCell','deepThreshold','regionScale','hillshade','warpFadePerSec'],[],path);\n  for (const key of ['cellSpan','jitter','renderCell','deepThreshold','warpFadePerSec']) number(value[key],`${path}.${key}`);\n  if ((value.cellSpan as number) <= 0 || (value.renderCell as number) <= 0) fail(path,'cell spans must be positive');\n  record(value.regionScale,path); fields(value.regionScale,['default','min','max','search'],[],path);\n  const scale = value.regionScale; for (const key of ['min','max','search']) number(scale[key],path);\n  array(scale.default,path); if (scale.default.length !== 2) fail(path,'region default needs two values'); scale.default.forEach(v=>number(v,path));\n  if ((scale.min as number) <= 0 || (scale.max as number) < (scale.min as number) || !Number.isSafeInteger(scale.search) || (scale.search as number) < 0) fail(path,'invalid region search/scale');\n  record(value.hillshade,path); numericFields(value.hillshade,['gain','peakFrom','peakGain','max'],[],path);\n}\nfunction validateSource(value: unknown): asserts value is NativeGeographySource {\n  record(value,'$'); fields(value,['schema','algorithm','seed','continent','climate','biomes','field','dimensions','tilesets','pools'],[],'$');\n  if (value.schema !== 1 || value.algorithm !== 'native-geography-v1') fail('$','unsupported schema/algorithm');\n  if (!Number.isInteger(value.seed) || (value.seed as number) < 0 || (value.seed as number) > 0xffffffff) fail('$.seed','expected uint32');\n  record(value.continent,'$.continent'); numericFields(value.continent,['cellSpan','jitter','oceanFrac','bridgeChance'],[],'$.continent');\n  if ((value.continent.cellSpan as number) <= 0) fail('$.continent','cell span must be positive');\n  // Existing climate hydration validates the exact native layers, envelopes and\n  // tagged anchors. The strict outer copy has already checked every descriptor.\n  const climate = hydrateNativeClimateSource(value.climate as NativeClimateSource);\n  const validLayers = (layers: readonly import('./climate').ClimateLayer[], path: string) => {\n    for (const layer of layers) {\n      if ('anchor' in layer && layer.anchor !== undefined) lookupKey(layer.anchor,path);\n      if ((layer.kind === 'noise' || layer.kind === 'ridge') && layer.cell <= 0) fail(path,'noise/ridge cell must be positive');\n      if ((layer.kind === 'radial' || layer.kind === 'basin') && layer.span <= 0) fail(path,'radial/basin span must be positive');\n    }\n  };\n  for (const [axis,def] of climate.source.axes) { lookupKey(axis,'$.climate.axes'); lookupKey(def.id,'$.climate.axes.id'); validLayers(def.layers,'$.climate.axes.'+axis); }\n  for (const [axis,bands] of climate.source.bands) { lookupKey(axis,'$.climate.bands'); for (const [name] of bands) lookupKey(name,'$.climate.bands'); }\n  for (const [anchor] of climate.source.anchors) lookupKey(anchor,'$.climate.anchors');\n  for (const [dim,overrides] of climate.source.dimensions) {\n    lookupKey(dim,'$.climate.dimensions'); for (const [axis,def] of overrides) { lookupKey(axis,'$.climate.dimensions');\n      if (def.layers) validLayers(def.layers,'$.climate.dimensions.'+dim+'.'+axis);\n    }\n  }\n  rows(value.biomes,'$.biomes',(def,path)=>{\n    record(def,path); for (const key of ['patronFaction','mapColor','label']) string(def[key],`${path}.${key}`);\n    if (Object.hasOwn(def,'climate')) affinity(def.climate,`${path}.climate`);\n    if (Object.hasOwn(def,'regionScale')) { array(def.regionScale,path); if (def.regionScale.length !== 2) fail(path,'region scale pair required'); def.regionScale.forEach(v=>number(v,path)); }\n  });\n  record(value.field,'$.field'); const field = value.field;\n  fields(field,['table','bands','floors','geometry','oceanBiome','marineMint','portMint'],[],'$.field');\n  palette(field.table,'$.field.table',false); geometry(field.geometry,'$.field.geometry'); string(field.oceanBiome,'$.field.oceanBiome');\n  array(field.bands,'$.field.bands');\n  for (const [i,band] of field.bands.entries()) {\n    const path = `$.field.bands[${i}]`; record(band,path); fields(band,['id','when','table'],['mode'],path); string(band.id,path);\n    if (Object.hasOwn(band,'mode') && band.mode !== 'replace' && band.mode !== 'tilt') fail(path,'unknown band mode');\n    record(band.when,path); fields(band.when,['axis','env'],[],path); string(band.when.axis,path); lookupKey(band.when.axis,path); envelope(band.when.env,path); palette(band.table,path,band.mode === 'tilt');\n  }\n  array(field.floors,'$.field.floors');\n  for (const [i,floor] of field.floors.entries()) {\n    const path = `$.field.floors[${i}]`; record(floor,path); fields(floor,['biome','discs'],[],path); string(floor.biome,path); lookupKey(floor.biome,path); array(floor.discs,path);\n    for (const disc of floor.discs) { record(disc,path); fields(disc,['anchor','r'],[],path); string(disc.anchor,path); lookupKey(disc.anchor,path); number(disc.r,path); if (disc.r < 0) fail(path,'negative floor radius'); }\n  }\n  record(field.marineMint,'$.field.marineMint'); fields(field.marineMint,['deepBiome','openShallowBiome'],[],'$.field.marineMint');\n  string(field.marineMint.deepBiome,'$.field.marineMint'); string(field.marineMint.openShallowBiome,'$.field.marineMint');\n  record(field.portMint,'$.field.portMint'); fields(field.portMint,['fallbackBiome'],[],'$.field.portMint'); string(field.portMint.fallbackBiome,'$.field.portMint');\n  rows(value.dimensions,'$.dimensions',(def,path)=>{\n    record(def,path); for (const key of ['id','label','color']) string(def[key],`${path}.${key}`);\n    if (Object.hasOwn(def,'biomes')) palette(def.biomes,`${path}.biomes`,true);\n  });\n  if (!(value.dimensions as [string,unknown][]).some(([key])=>key === 'surface')) fail('$.dimensions','surface fallback definition required');\n  rows(value.tilesets,'$.tilesets',(def,path)=>{\n    record(def,path);\n    // Retain the complete native definition and require its mandatory payload\n    // shape. This is source completeness, not layout compiler validation.\n    string(def.id,path); string(def.spawnerId,path); record(def.theme,path); record(def.packs,path);\n    for (const key of ['nameFirst','nameSecond']) { array(def[key],path); def[key].forEach(v=>string(v,path)); }\n    for (const key of ['sizeW','sizeH']) { array(def[key],path); if (def[key].length !== 2) fail(path,'tileset size pair required'); def[key].forEach(v=>number(v,path)); }\n    array(def.layout,path); array(def.objectives,path);\n    if (Object.hasOwn(def,'depthAffinity')) envelope(def.depthAffinity,`${path}.depthAffinity`);\n    if (Object.hasOwn(def,'geoAffinity')) affinity(def.geoAffinity,`${path}.geoAffinity`);\n  });\n  record(value.pools,'$.pools'); fields(value.pools,['shared','realms'],[],'$.pools');\n  const faceIds = new Set((value.tilesets as [string,unknown][]).map(([key])=>key));\n  const pool = (v: unknown,path:string) => {\n    array(v,path); for (const id of v) { string(id,path); lookupKey(id,path); if (!faceIds.has(id)) fail(path,'pool references an absent tileset source'); }\n  };\n  rows(value.pools.shared,'$.pools.shared',pool);\n  rows(value.pools.realms,'$.pools.realms',(v,path)=>rows(v,path,pool));\n}\n/** Supported work envelope for native-geography-v1. Refuse outside it; never\n * clamp native configuration or truncate a floor/region/landfall search. */\nexport const NATIVE_GEOGRAPHY_LIMITS = Object.freeze({\n  maxRegionSearch:16, maxFloorCandidateScans:262144, maxLandfallSteps:4096,\n});\nfunction safeInteger(value:number,path:string):void {\n  if (!Number.isSafeInteger(value) || value+1 === value || value-1 === value) fail(path,'lattice index cannot progress exactly');\n}\nfunction finite(value:number,path:string):void { if (!Number.isFinite(value)) fail(path,'nonfinite derived arithmetic'); }\nfunction pointData(at:MapCoord,path:string):MapCoord {\n  if (!at || typeof at !== 'object') fail(path,'expected coordinate data');\n  const x=Object.getOwnPropertyDescriptor(at,'x'),y=Object.getOwnPropertyDescriptor(at,'y');\n  if (!x || !y || !('value' in x) || !('value' in y) || typeof x.value !== 'number' || typeof y.value !== 'number') fail(path,'coordinates require own numeric data fields');\n  finite(x.value,path);finite(y.value,path);return {x:x.value,y:y.value};\n}\nfunction latticeRange(at:MapCoord,span:number,jitter:number,search:number,path:string):void {\n  for (const coordinate of [at.x,at.y]) {\n    const cell=Math.floor(coordinate/span);safeInteger(cell-search-1,path);safeInteger(cell+search+1,path);\n    for (const edge of [cell-search+.5-Math.abs(jitter)/2,cell+search+.5+Math.abs(jitter)/2]) {\n      const site=edge*span;finite(site,path);finite(2*((site-coordinate)**2),path);\n    }\n  }\n}\nfunction climateLayers(source:NativeGeographySource):import('./climate').ClimateLayer[] {\n  return [...source.climate.axes.flatMap(([,def])=>def.layers),\n    ...source.climate.dimensions.flatMap(([,axes])=>axes.flatMap(([,def])=>def.layers??[]))];\n}\nfunction anchorAt(source:NativeGeographySource,name:string|undefined):MapCoord|undefined {\n  if (name === undefined || name === 'origin') return source.climate.origin;\n  const value=source.climate.anchors.find(([key])=>key === name)?.[1];\n  return value?.state === 'point' ? value.point : undefined;\n}\nfunction checkPoint(source:NativeGeographySource,at:MapCoord,path:string):void {\n  const {geometry}=source.field;\n  latticeRange(at,geometry.cellSpan,geometry.jitter,geometry.regionScale.search,path+'.field');\n  latticeRange(at,source.continent.cellSpan,source.continent.jitter,1,path+'.continent');\n  for (const layer of climateLayers(source)) {\n    if (layer.kind === 'noise' || layer.kind === 'ridge') latticeRange(at,layer.cell,0,1,path+'.noise');\n    if (layer.kind === 'radial' || layer.kind === 'basin') {\n      // Unlike floor discs, an explicitly named climate anchor 'origin' is a\n      // registry lookup; only an omitted radial anchor means climate.origin.\n      const anchor=layer.anchor === undefined ? source.climate.origin\n        : source.climate.anchors.find(([key])=>key === layer.anchor)?.[1];\n      const p=anchor && 'state' in anchor ? (anchor.state === 'point' ? anchor.point : undefined) : anchor as MapCoord|undefined;\n      if (p) { const distance=Math.sqrt((at.x-p.x)**2+(at.y-p.y)**2);finite(distance,path+'.radial');finite((distance-(layer.innerRadius??0))/layer.span,path+'.radial'); }\n    }\n    if (layer.kind === 'coastal') for (let i=0;i<4;i++) {\n      const a=i/4*Math.PI*2,probe={x:at.x+Math.cos(a)*layer.probe,y:at.y+Math.sin(a)*layer.probe};\n      finite(probe.x,path+'.coastal');finite(probe.y,path+'.coastal');latticeRange(probe,source.continent.cellSpan,source.continent.jitter,1,path+'.coastal');\n    }\n  }\n}\nfunction validateExecutionDomain(source:NativeGeographySource):void {\n  if (source.field.geometry.regionScale.search > NATIVE_GEOGRAPHY_LIMITS.maxRegionSearch) fail('$.field.geometry.regionScale.search','unsupported region work budget');\n  checkPoint(source,pointData(source.climate.origin,'$.climate.origin'),'$.climate.origin');\n  for (const [name,anchor] of source.climate.anchors) if (anchor.state === 'point') checkPoint(source,pointData(anchor.point,'$.climate.anchors.'+name),'$.climate.anchors.'+name);\n  let scans=0;const {cellSpan:span,jitter}=source.field.geometry;\n  for (const floor of source.field.floors) for (const disc of floor.discs) {\n    const at=anchorAt(source,disc.anchor);if (!at) continue;\n    const x0=Math.floor((at.x-disc.r)/span)-1,x1=Math.floor((at.x+disc.r)/span)+1;\n    const y0=Math.floor((at.y-disc.r)/span)-1,y1=Math.floor((at.y+disc.r)/span)+1;\n    for (const n of [x0,x1,y0,y1]) safeInteger(n,'$.field.floors');\n    const cells=(x1-x0+1)*(y1-y0+1);scans+=cells;\n    if (!Number.isSafeInteger(cells) || !Number.isSafeInteger(scans) || scans>NATIVE_GEOGRAPHY_LIMITS.maxFloorCandidateScans) fail('$.field.floors','unsupported aggregate candidate scan budget');\n    // A site's full possible jitter extent must remain in the numeric domain\n    // of every continent/climate operation used by the native floor scan.\n    for (const gx of [x0+.5-Math.abs(jitter)/2,x1+.5+Math.abs(jitter)/2])\n      for (const gy of [y0+.5-Math.abs(jitter)/2,y1+.5+Math.abs(jitter)/2])\n        checkPoint(source,{x:gx*span,y:gy*span},'$.field.floors.site');\n  }\n}\n\n/** Exact serialized bytes are the source identity at this boundary. Nested\n * property order is retained; no canonical sorting or partial sampling hash. */\n// Only our fully validated, deeply frozen output can take this shortcut. Caller\n// objects, even frozen lookalikes, always pass the complete descriptor/domain\n// checks. Readers still build independent execution views and derived memos.\ntype HydratedGeography = Readonly<{source: Readonly<NativeGeographySource>; identity: string}>;\nconst geographyStringify = JSON.stringify;\nconst serializedGeography = new WeakMap<object, string>();\nconst hydratedGeography = new WeakMap<object, HydratedGeography>();\n/** Exact serialization of an owned, fully validated immutable source. Changed\n * prototypes or serializer use the original JSON operation and its effects. */\nexport function serializeNativeGeographySource(source: Readonly<NativeGeographySource>): string {\n  if (JSON.stringify === geographyStringify && geographyPrototypeClean()) {\n    const known = serializedGeography.get(source); if (known !== undefined) return known;\n  }\n  return JSON.stringify(source);\n}\nconst restoredGeography = new Map<string, HydratedGeography>();\nlet restoredGeographyBytes = 0;\nconst RESTORED_GEOGRAPHY_MAX_BYTES = 2 * 1024 * 1024;\n// Frozen plain data still inherits the realm's prototypes. Validation also uses\n// non-enumerable inherited optional keys and JSON may consult toJSON. Compare\n// complete descriptors without invoking getters before reusing any validation.\nconst geographyPrototypes = [Object.prototype, Array.prototype].map(value => ({\n  value, parent: Object.getPrototypeOf(value), descriptors: Object.getOwnPropertyDescriptors(value), keys: Reflect.ownKeys(value),\n}));\nfunction geographyPrototypeClean(): boolean {\n  for (let i = 0; i < geographyPrototypes.length; i++) {\n    const row = geographyPrototypes[i];\n    if (Object.getPrototypeOf(row.value) !== row.parent) return false;\n    const keys = Reflect.ownKeys(row.value);\n    if (keys.length !== row.keys.length) return false;\n    for (let j = 0; j < keys.length; j++) if (keys[j] !== row.keys[j]) return false;\n    for (let j = 0; j < keys.length; j++) {\n      const key = keys[j];\n      const before = Reflect.get(row.descriptors, key) as PropertyDescriptor;\n      const after = Object.getOwnPropertyDescriptor(row.value, key)!;\n      if (before.enumerable !== after.enumerable || before.configurable !== after.configurable) return false;\n      // Intrinsic descriptors have exactly one of the two standard shapes.\n      // Compare only own fields so polluted optional descriptor names cannot\n      // execute inherited getters during this guard.\n      const data = Object.hasOwn(before, 'value');\n      if (data !== Object.hasOwn(after, 'value')) return false;\n      if (data ? before.value !== after.value || before.writable !== after.writable\n        : before.get !== after.get || before.set !== after.set) return false;\n    }\n  }\n  return true;\n}\nexport function hydrateNativeGeographySource(input: unknown) {\n  const clean = geographyPrototypeClean();\n  if (input && typeof input === 'object' && clean) {\n    const known = hydratedGeography.get(input); if (known) return known;\n  }\n  const source = snapshotNativeGeographyData(input);\n  const copiedClean = geographyPrototypeClean();\n  let exactIdentity: string | undefined, nativeIdentity = false;\n  if (clean && copiedClean && geographyPrototypeClean()) {\n    const native = JSON.stringify === geographyStringify;\n    exactIdentity = JSON.stringify(source);\n    nativeIdentity = native && JSON.stringify === geographyStringify;\n    const known = restoredGeography.get(exactIdentity); if (known) return known;\n  }\n  // With changed prototypes keep original ordering: semantic refusal must occur\n  // before JSON could invoke an inherited toJSON on invalid source data.\n  validateSource(source); validateExecutionDomain(source);\n  const native = JSON.stringify === geographyStringify;\n  const identity = exactIdentity ?? JSON.stringify(source);\n  if (exactIdentity === undefined) nativeIdentity = native && JSON.stringify === geographyStringify;\n  freezeData(source);\n  const hydrated = Object.freeze({ source, identity });\n  if (clean && copiedClean && geographyPrototypeClean()) {\n    // Complete structural snapshot plus exact prior semantic identity, or fresh full validation.\n    const known = restoredGeography.get(identity);\n    if (known) return known;\n    hydratedGeography.set(source, hydrated); rememberGeography(hydrated);\n    if (nativeIdentity) serializedGeography.set(source, identity);\n  }\n  return hydrated;\n}\nexport function restoreNativeGeographySource(bytes: string): Readonly<NativeGeographySource> {\n  if (typeof bytes !== 'string') fail('$','source bytes must be a string');\n  if (geographyPrototypeClean()) {\n    const known = restoredGeography.get(bytes);\n    if (known) { restoredGeography.delete(bytes); restoredGeography.set(bytes, known); return known.source; }\n  }\n  const hydrated = hydrateNativeGeographySource(JSON.parse(bytes) as unknown);\n  if (hydrated.identity !== bytes) fail('$','source bytes must be the exact native serialization');\n  return hydrated.source;\n}\nfunction rememberGeography(hydrated: HydratedGeography): void {\n  // Full bytes, never a sampling checksum. Bound entries and UTF-16 key storage.\n  // Larger inputs stay valid; existing reader lifetimes own their weak entries.\n  const bytes = hydrated.identity;\n  if (bytes.length * 2 > RESTORED_GEOGRAPHY_MAX_BYTES) return;\n  if (restoredGeography.has(bytes)) restoredGeographyBytes -= bytes.length * 2;\n  restoredGeography.delete(bytes); restoredGeography.set(bytes, hydrated); restoredGeographyBytes += bytes.length * 2;\n  while (restoredGeography.size > 4 || restoredGeographyBytes > RESTORED_GEOGRAPHY_MAX_BYTES) {\n    const oldest = restoredGeography.keys().next().value!;\n    restoredGeography.delete(oldest); restoredGeographyBytes -= oldest.length * 2;\n  }\n}\n/** Private execution views have own-only lookup, insulating native operations\n * from later Object.prototype data changes. Source bytes remain ordinary JSON.\n * Reserved prototype aliases are outside this new schema/API; classic wrappers\n * are unchanged. This does not defend against arbitrary intrinsic monkeypatches. */\nfunction ownData<T>(value: T): T {\n  if (Array.isArray(value)) return value.map(v=>ownData(v)) as T;\n  if (value && typeof value === 'object') {\n    const out = Object.create(null) as Record<string,unknown>;\n    for (const [key,child] of Object.entries(value)) out[key] = ownData(child);\n    return out as T;\n  }\n  return value;\n}\n// Only immutable execution data is shared. Climate home-cell/warning state,\n// field-choice memo tables, continent readers and query closures remain per reader.\nfunction makeGeographyExecution(source: Readonly<NativeGeographySource>) {\n  const runtime = freezeData(ownData(source));\n  const climateData = freezeData(ownData(hydrateNativeClimateSource(source.climate)));\n  const biomes = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(runtime.biomes)));\n  const dimensions = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(runtime.dimensions)));\n  const dimensionSource = freezeData(Object.assign(Object.create(null) as Record<string,DimensionDef>,Object.fromEntries(source.dimensions)));\n  const tilesets = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(runtime.tilesets)));\n  return Object.freeze({ runtime, climateData, biomes, dimensions, dimensionSource, tilesets });\n}\nconst geographyExecution = new WeakMap<object, ReturnType<typeof makeGeographyExecution>>();"
        }
      ]
    },
    {
      "file": "src/worldmass/random.ts",
      "rawBeforeHash": "4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d",
      "rawAfterHash": "7bbe6ccd96c6677082ffb62f4089a3e62a23dd03488a961255cd0b195fbc05bd",
      "beforeHash": "4a2a5d79ab39ed752804d7142a368f0e66f8526014128a2802d0dd2e6daf650d",
      "afterHash": "7bbe6ccd96c6677082ffb62f4089a3e62a23dd03488a961255cd0b195fbc05bd",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { Rng } from '../core/rng';\n// Only plain data recursively frozen HERE can be memoized. Object.freeze on an\n// outer record alone says nothing about its children or live accessor values.\nconst massFrozenData=new WeakSet<object>();\nconst massCanonicalMemo=new WeakMap<object,string>(),massDigestMemo=new WeakMap<object,string>();\nexport function isMassFrozenData(value:unknown):boolean{return !!value&&typeof value==='object'&&massFrozenData.has(value);}\n\n/** Stable manifest JSON. Non-JSON values are errors, never omitted identity inputs. */\nexport function canonical(value: unknown): string {\n  const seen = new Set<object>();\n  const visit = (v: unknown): string => {\n    if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);\n    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);\n    if (typeof v !== 'object' || v === null) throw new Error('Manifest must contain finite JSON data');\n    if(massFrozenData.has(v)){const cached=massCanonicalMemo.get(v);if(cached!==undefined)return cached;}",
          "after": "import {quoteCanonicalString} from './canonicalString';\nimport { Rng } from '../core/rng';\n// Only plain data recursively frozen HERE can be memoized. Object.freeze on an\n// outer record alone says nothing about its children or live accessor values.\nconst massFrozenData=new WeakSet<object>();\nconst massCanonicalMemo=new WeakMap<object,string>(),massDigestMemo=new WeakMap<object,string>();\nexport function isMassFrozenData(value:unknown):boolean{return !!value&&typeof value==='object'&&massFrozenData.has(value);}\n\n/** Stable manifest JSON. Non-JSON values are errors, never omitted identity inputs. */\nexport function canonical(value: unknown): string {\n  const seen = new Set<object>();\n  const visit = (v: unknown): string => {\n    if (typeof v === 'string') return v.length < 4096 ? JSON.stringify(v) : quoteCanonicalString(v);\n    if (v === null || typeof v === 'boolean') return JSON.stringify(v);\n    if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);\n    if (typeof v !== 'object' || v === null) throw new Error('Manifest must contain finite JSON data');\n    if(massFrozenData.has(v)){const cached=massCanonicalMemo.get(v);if(cached!==undefined)return cached;}"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaSourceSession.ts",
      "rawBeforeHash": "e14a95699ce2b8a3d351f8f8854a72016a91066664b3cfd492afc87811dd4731",
      "rawAfterHash": "5d989adcfde09500855c646e20c09217cfab974b3fe04adbdd6c591e883f9413",
      "beforeHash": "e14a95699ce2b8a3d351f8f8854a72016a91066664b3cfd492afc87811dd4731",
      "afterHash": "474150db5e4fa539883d3f05a8a8e8ea5f760710b3b8722b33df0baf1f37b0a8",
      "crlfLines": [],
      "hunks": [
        {
          "before": " * provenance only; they do not reserve terrain or authorize runtime publication. */\nimport type {ZoneDef} from '../data/zones';\nimport {captureNativeGeographySource} from '../world/captureGeography';\nimport {landmarkComplex} from '../world/landmarkComplexes';\nimport type {MapCoord} from '../world/coords';\nimport {MassNativeGeography,type MassNativeSourceAnchor} from './nativeGeography';\nimport {NativeAreaSceneGraph} from './nativeAreaSceneGraph';\n\ndeclare const sourceBrand:unique symbol;\n/** Session-local capability. Persist the native graph, not this process handle. */\nexport interface NativeAreaSource {readonly id:string;readonly [sourceBrand]:true}\nexport interface NativeAreaSourceView {\n readonly definition:ZoneDef;\n /** Complete complex family in actual campaign insertion order; otherwise one member. */\n readonly members:readonly ZoneDef[];\n /** Current graph positions. These are candidates, never physical reservations. */\n readonly positions:readonly {readonly id:string;readonly native:Readonly<MapCoord>;readonly physical:Readonly<MassNativeSourceAnchor>}[];\n}\ninterface SourceBinding {definition:ZoneDef;members:readonly ZoneDef[]}\n\nexport class NativeAreaSourceSession {\n readonly graph:NativeAreaSceneGraph;\n readonly geography:MassNativeGeography;\n readonly #campaign;\n readonly #zoneMap;\n readonly #caveMap;\n readonly #sim;\n readonly #manifest;\n readonly #tickets=new WeakMap<NativeAreaSource,SourceBinding>();\n constructor(graph:NativeAreaSceneGraph,geography:MassNativeGeography){\n  if(!(graph instanceof NativeAreaSceneGraph)||!(geography instanceof MassNativeGeography))throw Error('Native source session needs concrete graph and geography owners');\n  this.graph=graph;this.geography=geography;\n  this.#campaign=graph.input.campaign;\n  this.#zoneMap=this.#campaign.zoneMap;this.#caveMap=this.#campaign.caveMap;\n  this.#sim=this.#campaign.sim;this.#manifest=this.#campaign.manifest;\n  graph.withGenerationPolicies(()=>this.assertCampaign());\n  Object.freeze(this);\n }\n private assertCampaign():void {\n  const c=this.graph.input.campaign;\n  if(c.manifest!==c.sim.manifest)throw Error('Native source needs identical campaign manifest');\n  if(c!==this.#campaign||this.graph.input.coast.input.campaign!==c||c.zoneMap!==this.#zoneMap||c.caveMap!==this.#caveMap||c.sim!==this.#sim||c.manifest!==this.#manifest)throw Error('Native source campaign binding changed');\n  if(this.geography.seed!==c.sim.biomeField.fieldSeed)throw Error('Native source campaign seed differs from geography');\n  if(JSON.stringify(captureNativeGeographySource(this.geography.seed))!==this.geography.spec.sourceJson)throw Error('Native source installed geography differs from recorded source');\n }\n private definition(id:string):ZoneDef {\n  if(typeof id!=='string'||!id||id==='?')throw Error('Native source needs a resolved campaign identity');",
          "after": " * provenance only; they do not reserve terrain or authorize runtime publication. */\nimport type {ZoneDef} from '../data/zones';\nimport {captureNativeGeographySource} from '../world/captureGeography';\nimport {serializeNativeGeographySource} from '../world/geographySource';\nimport {landmarkComplex} from '../world/landmarkComplexes';\nimport type {MapCoord} from '../world/coords';\nimport {MassNativeGeography,type MassNativeSourceAnchor} from './nativeGeography';\nimport {NativeAreaSceneGraph} from './nativeAreaSceneGraph';\n\ndeclare const sourceBrand:unique symbol;\n/** Session-local capability. Persist the native graph, not this process handle. */\nexport interface NativeAreaSource {readonly id:string;readonly [sourceBrand]:true}\nexport interface NativeAreaSourceView {\n readonly definition:ZoneDef;\n /** Complete complex family in actual campaign insertion order; otherwise one member. */\n readonly members:readonly ZoneDef[];\n /** Current graph positions. These are candidates, never physical reservations. */\n readonly positions:readonly {readonly id:string;readonly native:Readonly<MapCoord>;readonly physical:Readonly<MassNativeSourceAnchor>}[];\n}\ninterface SourceBinding {definition:ZoneDef;members:readonly ZoneDef[]}\n\nexport class NativeAreaSourceSession {\n readonly graph:NativeAreaSceneGraph;\n readonly geography:MassNativeGeography;\n readonly #campaign;\n readonly #zoneMap;\n readonly #caveMap;\n readonly #sim;\n readonly #manifest;\n readonly #tickets=new WeakMap<NativeAreaSource,SourceBinding>();\n constructor(graph:NativeAreaSceneGraph,geography:MassNativeGeography){\n  if(!(graph instanceof NativeAreaSceneGraph)||!(geography instanceof MassNativeGeography))throw Error('Native source session needs concrete graph and geography owners');\n  this.graph=graph;this.geography=geography;\n  this.#campaign=graph.input.campaign;\n  this.#zoneMap=this.#campaign.zoneMap;this.#caveMap=this.#campaign.caveMap;\n  this.#sim=this.#campaign.sim;this.#manifest=this.#campaign.manifest;\n  graph.withGenerationPolicies(()=>this.assertCampaign());\n  Object.freeze(this);\n }\n private assertCampaign():void {\n  const c=this.graph.input.campaign;\n  if(c.manifest!==c.sim.manifest)throw Error('Native source needs identical campaign manifest');\n  if(c!==this.#campaign||this.graph.input.coast.input.campaign!==c||c.zoneMap!==this.#zoneMap||c.caveMap!==this.#caveMap||c.sim!==this.#sim||c.manifest!==this.#manifest)throw Error('Native source campaign binding changed');\n  if(this.geography.seed!==c.sim.biomeField.fieldSeed)throw Error('Native source campaign seed differs from geography');\n  if(serializeNativeGeographySource(captureNativeGeographySource(this.geography.seed))!==this.geography.spec.sourceJson)throw Error('Native source installed geography differs from recorded source');\n }\n private definition(id:string):ZoneDef {\n  if(typeof id!=='string'||!id||id==='?')throw Error('Native source needs a resolved campaign identity');"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaCharacterCreation.ts",
      "rawBeforeHash": "948788568ce35079894428f167efd9a3007bd8a93cec34367c70d3d5c2d57863",
      "rawAfterHash": "0be30b9baddb7f9ab5a6aa4fc587886d00b42b6058cbc7f15ba6b3552cba4ab1",
      "beforeHash": "948788568ce35079894428f167efd9a3007bd8a93cec34367c70d3d5c2d57863",
      "afterHash": "01d8dfffb4a104d9a95f29d2027dcef957155d5c9e26ddf70ad497e776b946f0",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from './nativeAreaCharacterResume';\n/** Actual native character construction. Receipts exist only at the private synchronous factory boundaries. */\nimport type {World,Seat} from '../engine/world';\nimport type {Actor} from '../engine/actor';\nimport {saveAccount} from '../meta/persistence';\nimport {CLASSES,type ClassDef} from '../data/classes';\nimport {START_ZONE,type ZoneDef} from '../data/zones';\nimport * as creation from '../engine/nativeCharacterCreation';\nimport {sceneIndexSeats} from '../engine/nativeSceneCombatControl';\nimport {sceneRestoreAccountRelics} from '../engine/nativeSceneCampaignLifecycle';\nimport {isNativeAreaScenePreparation,type NativeAreaScenePreparation} from './nativeAreaScenePreparation';\nimport type {MassNativeGeography} from './nativeGeography';\nimport type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';\nimport {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';\nexport type NativeFreshCharacterOptions=Omit<NonNullable<Parameters<World['createPlayer']>[1]>,'load'|'startingCompanions'|'startingFlasks'>;\nexport interface NativeFreshCharacter {readonly classDef:ClassDef;readonly options?:NativeFreshCharacterOptions;readonly labArts?:boolean;readonly graft?:string;readonly scene?:string;readonly provisionalMu?:true}\ntype Stage='construct'|'stats'|'deeds'|'birth'|'gifts';\ndeclare const characterReceipt:unique symbol;\nexport interface NativeCharacterCreationReceipt {readonly [characterReceipt]:true}\ninterface Receipt {readonly writer:World;readonly seat:Seat;readonly actor:Actor;readonly preparation:NativeAreaScenePreparation;readonly area:NativeAreaSceneOngoing|undefined;readonly stage:Stage;active:boolean}\nconst receipts=new WeakMap<object,Receipt>(),factories=new WeakSet<NativeAreaScenePreparation>();\nfunction own<T>(o:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native character needs ordinary data: '+String(key));return d.value as T;}\nexport function assertNativeCharacterReceipt(token:NativeCharacterCreationReceipt,stage:Stage):Readonly<Receipt>{const row=receipts.get(token);if(!row?.active||row.stage!==stage)throw Error('Native character factory receipt is expired or foreign');assertNativeRetainedMassState(row.writer);if(own(row.seat,'actor')!==row.actor||(row.area&&row.area.assembly.input.scene.player!==row.actor))throw Error('Native character body changed');if(stage!=='construct'&&own(row.writer,'localSeat')!==undefined&&own(row.writer,'localSeat')!==row.seat)throw Error('Native character local seat changed');return row;}\nexport function assertNativeEmptyCharacterCensus(token:NativeCharacterCreationReceipt,campaign:object,player:Actor,actors:readonly Actor[]):void {const r=assertNativeCharacterReceipt(token,'construct');if(r.preparation.input.session.campaign!==campaign||own(r.seat,'actor')!==player||own(r.writer,'actors')!==actors||actors.length!==0||own<Seat[]>(r.writer,'seats').length!==0||own(r.writer,'localSeat')!==undefined)throw Error('Native character construction must retain its actual empty census');r.preparation.input.authority.assertUnclaimed(player);}\nexport class NativeAreaCharacterCreation {\n readonly preparation:NativeAreaScenePreparation;readonly definition:ZoneDef;readonly geography:MassNativeGeography;\n readonly #writer:World;readonly #previousScale:PropertyDescriptor|undefined;\n readonly #scale:()=>void;\n #resume=false;#seat:Seat|undefined;#actor:Actor|undefined;#area:NativeAreaSceneOngoing|undefined;#running=false;#attempted=false;#retired=false;#signal:AbortSignal|undefined;\n constructor(preparation:NativeAreaScenePreparation,definition:ZoneDef,geography:MassNativeGeography){\n  if(!isNativeAreaScenePreparation(preparation)||factories.has(preparation))throw Error('Native character needs one actual preparation owner');this.preparation=preparation;this.definition=definition;this.geography=geography;this.#writer=preparation.input.session.writer;\n  if(definition.id!==START_ZONE||this.#writer.zoneMap[START_ZONE]!==definition)throw Error('Native fresh character requires the actual recorded starting town');this.#empty();\n  this.#previousScale=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(this.#previousScale&&!this.#previousScale.configurable)throw Error('Native character event service cannot replace a locked slot');\n  this.#scale=()=>{this.#live();const area=this.#area;if(!area)throw Error('Native party event has no actual character area');if(area.assembly.phase==='born')this.preparation.input.coordinator.current.combat.rescaleEnemies();else this.#with('stats',token=>area.combat.rescaleInitialCharacter(token));};\n  Object.defineProperty(this.#writer,'rescaleEnemies',{configurable:true,enumerable:false,writable:false,value:this.#scale});factories.add(preparation);\n }\n #empty():void {if(own<Seat[]>(this.#writer,'seats').length||own<Actor[]>(this.#writer,'actors').length||own(this.#writer,'localSeat')!==undefined)throw Error('Native character factory needs the actual empty writer');}\n #live():void {if(this.#retired)throw Error('Native character factory is retired');assertNativeRetainedMassState(this.#writer);if(this.#signal?.aborted)throw Error('Native character creation cancelled');}\n #with<T>(stage:Stage,action:(token:NativeCharacterCreationReceipt)=>T):T {this.#live();if(!this.#running||!this.#seat)throw Error('Native character factory is not active');const token=Object.freeze({}) as NativeCharacterCreationReceipt,row:Receipt={writer:this.#writer,seat:this.#seat,actor:this.#actor!,preparation:this.preparation,area:this.#area,stage,active:true};receipts.set(token,row);try{return action(token);}finally{row.active=false;}}\n #recalc(seat:Seat):void {\n  if(!this.#running)throw Error('Native character stats escaped creation');\n  if(!this.#seat){this.#seat=seat;this.#actor=own<Actor>(seat,'actor');this.#area=this.#with('construct',token=>this.preparation.constructInitialCharacter(token,this.definition.id,this.geography));}\n  if(this.#seat!==seat)throw Error('Native character stats selected a different seat');\n  this.#with('stats',token=>this.#area!.progression.recalcInitialCharacter(token));\n }\n createResume(token:NativeCharacterResumeReceipt,signal?:AbortSignal):NativeAreaSceneOngoing {const r=assertNativeCharacterResume(token,'shell');if(r.preparation!==this.preparation||r.writer!==this.#writer)throw Error('Native resume shell belongs to another factory');this.#resume=true;try{return this.#create({classDef:r.owner.classDef},signal);}finally{this.#resume=false;}}\n create(spec:NativeFreshCharacter,signal?:AbortSignal):NativeAreaSceneOngoing {return this.#create(spec,signal);}\n /** A dedicated keeper uses the genuine construction stages with native gifts disabled. */\n createKeeper(classDef:ClassDef,name:string,signal?:AbortSignal):NativeAreaSceneOngoing {if(typeof name!=='string')throw Error('Native keeper requires its server name');return this.#create({classDef,options:{name}},signal,true);}\n #create(spec:NativeFreshCharacter,signal?:AbortSignal,keeper=false):NativeAreaSceneOngoing {\n  this.#live();if(this.#attempted||!CLASSES.includes(spec.classDef))throw Error('Native character creation needs a fresh catalog class');this.#empty();if(spec.provisionalMu&&spec.scene!=='mu')throw Error('Native provisional character belongs to Mu');this.#attempted=true;this.#running=true;this.#signal=signal;\n  const self=this,writer=this.#writer;\n  const host:Parameters<typeof creation.sceneCreatePlayer>[0]={\n   get localSeat(){return writer.localSeat;},set localSeat(value){writer.localSeat=value;},get seats(){return writer.seats;},set seats(value){writer.seats=value;},get actors(){return writer.actors;},get arena(){return writer.arena;},get events(){return writer.events;},\n   makePlayerSeat:(...args)=>creation.sceneMakePlayerSeat({recalcSeat:seat=>self.#recalc(seat)},...args),\n   recalcSeat:seat=>self.#recalc(seat),bindCombatDeeds:()=>self.#with('deeds',token=>self.#area!.combat.campaignOwner.bindInitialCharacterDeeds(token)),\n   indexSeats:()=>sceneIndexSeats({get seatByActor(){return writer['seatByActor'];},get seats(){return writer.seats;}}),\n   restoreAccountRelics:seat=>sceneRestoreAccountRelics({get localSeat(){return writer.localSeat;},get clientActionHook(){return writer.clientActionHook;},get account(){return writer.account;},get manifest(){return writer.manifest;}},seat),\n   loadZone:zoneId=>{if(zoneId!==self.definition.id)throw Error('Native character load differs from recorded start');self.#with('birth',token=>self.preparation.prepareInitialCharacter(token));self.preparation.birthInitial(self.#area!);},\n   grantStartingCompanions:()=>self.#with('gifts',token=>self.#area!.combat.grantInitialCharacterCompanions(token)),\n   dealVeteranFlasks:()=>self.#with('gifts',token=>self.#area!.combat.dealInitialCharacterFlasks(token)),\n  };\n  try{creation.sceneCreatePlayer(host,spec.classDef,(spec.provisionalMu||this.#resume||keeper)?{...spec.options,startingCompanions:false,startingFlasks:false}:spec.options);if(!this.#area||this.#area.assembly.phase!=='born')throw Error('Native character did not complete its real birth');if(!spec.provisionalMu&&!this.#resume&&!keeper){const labArts=spec.labArts??false;this.#with('gifts',token=>this.#area!.combat.dealInitialCharacterLabArts(token,labArts));if(spec.graft&&writer.account.skillGraft&&this.#with('gifts',token=>this.#area!.combat.applyInitialCharacterGraft(token,spec.graft!))){writer.account.skillGraft=false;saveAccount(writer.account);}}if(spec.scene)this.#area.combat.campaignFrame.beginScene(spec.scene);this.#live();return this.#area;}finally{this.#running=false;this.#signal=undefined;}\n }\n retire():void {if(this.#retired)return;this.#retired=true;const current=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(current?.configurable&&current.value===this.#scale){if(this.#previousScale)Object.defineProperty(this.#writer,'rescaleEnemies',this.#previousScale);else Reflect.deleteProperty(this.#writer,'rescaleEnemies');}}\n}\n",
          "after": "import {copyNativeLoadingCharacter} from './nativeCharacterLoading';\nimport {assertNativeCharacterResume,type NativeCharacterResumeReceipt} from './nativeAreaCharacterResume';\n/** Actual native character construction. Receipts exist only at the private synchronous factory boundaries. */\nimport type {World,Seat} from '../engine/world';\nimport type {Actor} from '../engine/actor';\nimport {saveAccount} from '../meta/persistence';\nimport {CLASSES,type ClassDef} from '../data/classes';\nimport {START_ZONE,type ZoneDef} from '../data/zones';\nimport * as creation from '../engine/nativeCharacterCreation';\nimport {sceneIndexSeats} from '../engine/nativeSceneCombatControl';\nimport {sceneRestoreAccountRelics} from '../engine/nativeSceneCampaignLifecycle';\nimport {isNativeAreaScenePreparation,type NativeAreaScenePreparation} from './nativeAreaScenePreparation';\nimport type {MassNativeGeography} from './nativeGeography';\nimport type {NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';\nimport {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';\nexport type NativeFreshCharacterOptions=Omit<NonNullable<Parameters<World['createPlayer']>[1]>,'load'|'startingCompanions'|'startingFlasks'>;\nexport interface NativeFreshCharacter {readonly classDef:ClassDef;readonly options?:NativeFreshCharacterOptions;readonly labArts?:boolean;readonly graft?:string;readonly scene?:string;readonly provisionalMu?:true}\ntype Stage='construct'|'stats'|'deeds'|'birth'|'gifts';\ndeclare const characterReceipt:unique symbol;\nexport interface NativeCharacterCreationReceipt {readonly [characterReceipt]:true}\ninterface Receipt {readonly writer:World;readonly seat:Seat;readonly actor:Actor;readonly preparation:NativeAreaScenePreparation;readonly area:NativeAreaSceneOngoing|undefined;readonly stage:Stage;active:boolean}\nconst receipts=new WeakMap<object,Receipt>(),factories=new WeakSet<NativeAreaScenePreparation>();\nfunction own<T>(o:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native character needs ordinary data: '+String(key));return d.value as T;}\nexport function assertNativeCharacterReceipt(token:NativeCharacterCreationReceipt,stage:Stage):Readonly<Receipt>{const row=receipts.get(token);if(!row?.active||row.stage!==stage)throw Error('Native character factory receipt is expired or foreign');assertNativeRetainedMassState(row.writer);if(own(row.seat,'actor')!==row.actor||(row.area&&row.area.assembly.input.scene.player!==row.actor))throw Error('Native character body changed');if(stage!=='construct'&&own(row.writer,'localSeat')!==undefined&&own(row.writer,'localSeat')!==row.seat)throw Error('Native character local seat changed');return row;}\nexport function assertNativeEmptyCharacterCensus(token:NativeCharacterCreationReceipt,campaign:object,player:Actor,actors:readonly Actor[]):void {const r=assertNativeCharacterReceipt(token,'construct');if(r.preparation.input.session.campaign!==campaign||own(r.seat,'actor')!==player||own(r.writer,'actors')!==actors||actors.length!==0||own<Seat[]>(r.writer,'seats').length!==0||own(r.writer,'localSeat')!==undefined)throw Error('Native character construction must retain its actual empty census');r.preparation.input.authority.assertUnclaimed(player);}\nexport class NativeAreaCharacterCreation {\n readonly preparation:NativeAreaScenePreparation;readonly definition:ZoneDef;readonly geography:MassNativeGeography;\n readonly #writer:World;readonly #previousScale:PropertyDescriptor|undefined;\n readonly #scale:()=>void;\n #loading:Generator<string,NativeAreaSceneOngoing,void>|undefined;\n #loadingResumeOwner:ReturnType<typeof assertNativeCharacterResume>['owner']|undefined;\n #resume=false;#seat:Seat|undefined;#actor:Actor|undefined;#area:NativeAreaSceneOngoing|undefined;#running=false;#attempted=false;#retired=false;#signal:AbortSignal|undefined;\n constructor(preparation:NativeAreaScenePreparation,definition:ZoneDef,geography:MassNativeGeography){\n  if(!isNativeAreaScenePreparation(preparation)||factories.has(preparation))throw Error('Native character needs one actual preparation owner');this.preparation=preparation;this.definition=definition;this.geography=geography;this.#writer=preparation.input.session.writer;\n  if(definition.id!==START_ZONE||this.#writer.zoneMap[START_ZONE]!==definition)throw Error('Native fresh character requires the actual recorded starting town');this.#empty();\n  this.#previousScale=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(this.#previousScale&&!this.#previousScale.configurable)throw Error('Native character event service cannot replace a locked slot');\n  this.#scale=()=>{this.#live();const area=this.#area;if(!area)throw Error('Native party event has no actual character area');if(area.assembly.phase==='born')this.preparation.input.coordinator.current.combat.rescaleEnemies();else this.#with('stats',token=>area.combat.rescaleInitialCharacter(token));};\n  Object.defineProperty(this.#writer,'rescaleEnemies',{configurable:true,enumerable:false,writable:false,value:this.#scale});factories.add(preparation);\n }\n #empty():void {if(own<Seat[]>(this.#writer,'seats').length||own<Actor[]>(this.#writer,'actors').length||own(this.#writer,'localSeat')!==undefined)throw Error('Native character factory needs the actual empty writer');}\n #live():void {if(this.#retired)throw Error('Native character factory is retired');assertNativeRetainedMassState(this.#writer);if(this.#signal?.aborted)throw Error('Native character creation cancelled');}\n #with<T>(stage:Stage,action:(token:NativeCharacterCreationReceipt)=>T):T {this.#live();if(!this.#running||!this.#seat)throw Error('Native character factory is not active');const token=Object.freeze({}) as NativeCharacterCreationReceipt,row:Receipt={writer:this.#writer,seat:this.#seat,actor:this.#actor!,preparation:this.preparation,area:this.#area,stage,active:true};receipts.set(token,row);try{return action(token);}finally{row.active=false;}}\n #recalc(seat:Seat):void {\n  if(!this.#running)throw Error('Native character stats escaped creation');\n  if(!this.#seat){this.#seat=seat;this.#actor=own<Actor>(seat,'actor');this.#area=this.#with('construct',token=>this.preparation.constructInitialCharacter(token,this.definition.id,this.geography));}\n  if(this.#seat!==seat)throw Error('Native character stats selected a different seat');\n  this.#with('stats',token=>this.#area!.progression.recalcInitialCharacter(token));\n }\n createResume(token:NativeCharacterResumeReceipt,signal?:AbortSignal):NativeAreaSceneOngoing {const r=assertNativeCharacterResume(token,'shell');if(r.preparation!==this.preparation||r.writer!==this.#writer)throw Error('Native resume shell belongs to another factory');this.#resume=true;try{return this.#create({classDef:r.owner.classDef},signal);}finally{this.#resume=false;}}\n create(spec:NativeFreshCharacter,signal?:AbortSignal):NativeAreaSceneOngoing {return this.#create(spec,signal);}\n /** A dedicated keeper uses the genuine construction stages with native gifts disabled. */\n createKeeper(classDef:ClassDef,name:string,signal?:AbortSignal):NativeAreaSceneOngoing {if(typeof name!=='string')throw Error('Native keeper requires its server name');return this.#create({classDef,options:{name}},signal,true);}\n #create(spec:NativeFreshCharacter,signal?:AbortSignal,keeper=false):NativeAreaSceneOngoing {\n  this.#live();if(this.#attempted||!CLASSES.includes(spec.classDef))throw Error('Native character creation needs a fresh catalog class');this.#empty();if(spec.provisionalMu&&spec.scene!=='mu')throw Error('Native provisional character belongs to Mu');this.#attempted=true;this.#running=true;this.#signal=signal;\n  const self=this,writer=this.#writer;\n  const host:Parameters<typeof creation.sceneCreatePlayer>[0]={\n   get localSeat(){return writer.localSeat;},set localSeat(value){writer.localSeat=value;},get seats(){return writer.seats;},set seats(value){writer.seats=value;},get actors(){return writer.actors;},get arena(){return writer.arena;},get events(){return writer.events;},\n   makePlayerSeat:(...args)=>creation.sceneMakePlayerSeat({recalcSeat:seat=>self.#recalc(seat)},...args),\n   recalcSeat:seat=>self.#recalc(seat),bindCombatDeeds:()=>self.#with('deeds',token=>self.#area!.combat.campaignOwner.bindInitialCharacterDeeds(token)),\n   indexSeats:()=>sceneIndexSeats({get seatByActor(){return writer['seatByActor'];},get seats(){return writer.seats;}}),\n   restoreAccountRelics:seat=>sceneRestoreAccountRelics({get localSeat(){return writer.localSeat;},get clientActionHook(){return writer.clientActionHook;},get account(){return writer.account;},get manifest(){return writer.manifest;}},seat),\n   loadZone:zoneId=>{if(zoneId!==self.definition.id)throw Error('Native character load differs from recorded start');self.#with('birth',token=>self.preparation.prepareInitialCharacter(token));self.preparation.birthInitial(self.#area!);},\n   grantStartingCompanions:()=>self.#with('gifts',token=>self.#area!.combat.grantInitialCharacterCompanions(token)),\n   dealVeteranFlasks:()=>self.#with('gifts',token=>self.#area!.combat.dealInitialCharacterFlasks(token)),\n  };\n  try{creation.sceneCreatePlayer(host,spec.classDef,(spec.provisionalMu||this.#resume||keeper)?{...spec.options,startingCompanions:false,startingFlasks:false}:spec.options);if(!this.#area||this.#area.assembly.phase!=='born')throw Error('Native character did not complete its real birth');if(!spec.provisionalMu&&!this.#resume&&!keeper){const labArts=spec.labArts??false;this.#with('gifts',token=>this.#area!.combat.dealInitialCharacterLabArts(token,labArts));if(spec.graft&&writer.account.skillGraft&&this.#with('gifts',token=>this.#area!.combat.applyInitialCharacterGraft(token,spec.graft!))){writer.account.skillGraft=false;saveAccount(writer.account);}}if(spec.scene)this.#area.combat.campaignFrame.beginScene(spec.scene);this.#live();return this.#area;}finally{this.#running=false;this.#signal=undefined;}\n }\n\n get loadingActive():boolean {return this.#running;}\n /** Cooperative admission owns an inert copy; the original synchronous API\n  * keeps its exact caller-read and partial-effect semantics. Each advance ends\n  * every factory receipt and restores ambient policies before returning. */\n async createLoading(spec:NativeFreshCharacter,pause:(label:string)=>Promise<void>,signal?:AbortSignal):Promise<NativeAreaSceneOngoing> {\n  this.#beginLoading(spec,signal);\n  try { for(;;){const step=this.#advanceLoading();if(step.done)return step.value;await pause(step.value);this.#live();} }\n  finally {this.#closeLoading();}\n }\n /** The resume owner must issue a fresh shell receipt for every advance. No\n  * shell token, caller action or borrowed policy survives an outer pause. */\n advanceResumeLoading(token:NativeCharacterResumeReceipt,signal?:AbortSignal):IteratorResult<string,NativeAreaSceneOngoing> {\n  const r=assertNativeCharacterResume(token,'shell');\n  if(r.preparation!==this.preparation||r.writer!==this.#writer)throw Error('Native resume shell belongs to another factory');\n  if(!this.#loading){if(this.#loadingResumeOwner)throw Error('Native resume creation already completed');this.#loadingResumeOwner=r.owner;this.#beginLoading({classDef:r.owner.classDef},signal,true);}\n  if(this.#loadingResumeOwner!==r.owner)throw Error('Native loading shell owner changed');\n  return this.#advanceLoading();\n }\n #beginLoading(spec:NativeFreshCharacter,signal?:AbortSignal,resume=false):void {\n  this.#live();if(this.#attempted||this.#running)throw Error('Native character creation was already attempted');\n  this.#attempted=true;this.#signal=signal;\n  const copied=copyNativeLoadingCharacter(spec);this.#live();this.#empty();\n  if(!CLASSES.includes(copied.classDef)||copied.provisionalMu&&copied.scene!=='mu')throw Error('Invalid native loading character');\n  this.#loading=this.#loadingStages(copied,resume);\n }\n #advanceLoading():IteratorResult<string,NativeAreaSceneOngoing> {\n  this.#live();if(!this.#loading||this.#running)throw Error('Native character loading is absent or reentrant');\n  this.#running=true;\n  try {const step=this.#writer.withGlobalPolicies(()=>this.#loading!.next());this.#live();if(step.done)this.#closeLoading();return step;}\n  catch(error){this.#closeLoading();throw error;}\n  finally{this.#running=false;}\n }\n #closeLoading():void {const steps=this.#loading;this.#loading=undefined;this.#signal=undefined;steps?.return(undefined as never);}\n *#loadingStages(spec:NativeFreshCharacter,resume:boolean):Generator<string,NativeAreaSceneOngoing,void> {\n  const writer=this.#writer,self=this;\n  const host:Parameters<typeof creation.sceneCreatePlayer>[0]={\n   get localSeat(){return writer.localSeat;},set localSeat(value){writer.localSeat=value;},get seats(){return writer.seats;},set seats(value){writer.seats=value;},get actors(){return writer.actors;},get arena(){return writer.arena;},get events(){return writer.events;},\n   makePlayerSeat:(...args)=>creation.sceneMakePlayerSeat({recalcSeat:seat=>self.#recalc(seat)},...args),\n   recalcSeat:seat=>self.#recalc(seat),bindCombatDeeds:()=>self.#with('deeds',token=>self.#area!.combat.campaignOwner.bindInitialCharacterDeeds(token)),\n   indexSeats:()=>sceneIndexSeats({get seatByActor(){return writer['seatByActor'];},get seats(){return writer.seats;}}),\n   restoreAccountRelics:seat=>sceneRestoreAccountRelics({get localSeat(){return writer.localSeat;},get clientActionHook(){return writer.clientActionHook;},get account(){return writer.account;},get manifest(){return writer.manifest;}},seat),\n   loadZone:()=>{throw Error('Cooperative character layout belongs to its next stage');},\n   grantStartingCompanions:()=>{throw Error('Cooperative character gifts belong to their next stage');},\n   dealVeteranFlasks:()=>{throw Error('Cooperative character flasks belong to their next stage');},\n  };\n  creation.sceneCreatePlayer(host,spec.classDef,{...spec.options,load:false,startingCompanions:false,startingFlasks:false});\n  yield 'Preparing your starting ground';\n  if(this.#with('birth',token=>this.preparation.advanceInitialCharacterLoading(token)))throw Error('Native loading preparation skipped its source stage');\n  yield 'Laying out your starting ground';\n  if(!this.#with('birth',token=>this.preparation.advanceInitialCharacterLoading(token)))throw Error('Native loading preparation did not finish');\n  yield 'Bringing the starting ground to life';\n  this.preparation.birthInitial(this.#area!);\n  yield 'Preparing your companions';\n  if(!spec.provisionalMu&&!resume){\n   this.#with('gifts',token=>this.#area!.combat.grantInitialCharacterCompanions(token));\n   this.#with('gifts',token=>this.#area!.combat.dealInitialCharacterFlasks(token));\n   this.#with('gifts',token=>this.#area!.combat.dealInitialCharacterLabArts(token,spec.labArts??false));\n   if(spec.graft&&writer.account.skillGraft&&this.#with('gifts',token=>this.#area!.combat.applyInitialCharacterGraft(token,spec.graft!))){writer.account.skillGraft=false;saveAccount(writer.account);}\n  }\n  if(spec.scene)this.#area!.combat.campaignFrame.beginScene(spec.scene);\n  if(!this.#area||this.#area.assembly.phase!=='born')throw Error('Native character did not complete its real birth');\n  this.#live();return this.#area;\n }\n\n retire():void {if(this.#retired)return;if(this.#running&&this.#loading)throw Error('Native character cannot retire during loading dispatch');this.#retired=true;this.#closeLoading();const current=Object.getOwnPropertyDescriptor(this.#writer,'rescaleEnemies');if(current?.configurable&&current.value===this.#scale){if(this.#previousScale)Object.defineProperty(this.#writer,'rescaleEnemies',this.#previousScale);else Reflect.deleteProperty(this.#writer,'rescaleEnemies');}}\n}\n"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaCharacterResume.ts",
      "rawBeforeHash": "f8d3c427ab217aa22f5506b7f927d9389facfc5ebc945eed01250be25673b633",
      "rawAfterHash": "91ddace30eea7688d3110aafa53f504f62ba0327e99472533eb646c1737397ec",
      "beforeHash": "f8d3c427ab217aa22f5506b7f927d9389facfc5ebc945eed01250be25673b633",
      "afterHash": "91ddace30eea7688d3110aafa53f504f62ba0327e99472533eb646c1737397ec",
      "crlfLines": [],
      "hunks": [
        {
          "before": "export function isNativeAreaCharacterResume(value:unknown):value is NativeAreaCharacterResume{return !!value&&typeof value==='object'&&owners.has(value);}\nexport function assertNativeCharacterResume(token:NativeCharacterResumeReceipt,stage:Stage):Readonly<Receipt>{const r=receipts.get(token);if(!r?.active||r.stage!==stage)throw Error('Native saved-character stage is foreign or expired');assertNativeRetainedMassState(r.writer);if(stage==='seat'&&(!r.seat||own(r.seat,'actor')!==r.seatBody||own(r.seat,'id')!==r.seatId))throw Error('Native saved-seat factory relation changed');if(r.preparation.input.session.writer!==r.writer)throw Error('Native saved-character roots changed');return r;}\nexport class NativeAreaCharacterResume {\n readonly #calls={create:NativeAreaCharacterCreation.prototype.createResume,fields:NativeAreaSceneCombat.prototype.restoreCharacterFields,graph:NativeAreaSceneTransitionCoordinator.prototype.restoreCharacterGraph,reconcile:NativeAreaSceneCombat.prototype.reconcileRestoredGraph,arrival:NativeAreaSceneTransitionCoordinator.prototype.resumeCharacterArrival,recalc:NativeAreaSceneProgression.prototype.recalcRestoredSeat,claim:NativeAreaActorAuthority.prototype.claimInserted};\n readonly writer:World;readonly classDef:ClassDef;readonly record:NativeRetainedResumeRecord;readonly #save:CharacterSave;readonly #lease:CharacterResume|undefined;#rollback:(()=>void)|undefined;\n #preparation:NativeAreaScenePreparation|undefined;#area:NativeAreaSceneOngoing|undefined;#running=false;#attempted=false;#seat:Seat|undefined;#seatBody:Actor|undefined;#seatId:string|undefined;\n constructor(writer:World,save:CharacterSave,lease?:CharacterResume){if(lease&&(!characterResumeAuthority(lease)||lease.kind!=='inline'||lease.save!==save))throw Error('Native saved character needs its exact live storage lease');this.#lease=lease;if(!isNativeWorld(writer)||writers.has(writer))throw Error('Native resume needs its actual unused writer');assertNativeRetainedMassState(writer);const copied=JSON.parse(JSON.stringify(save)) as CharacterSave,record=readNativeRetainedSave(copied),classDef=CLASSES.find(c=>c.id===copied.classId);if(!classDef||canonical(record.manifest)!==canonical(writer.manifest))throw Error('Native resume class or recorded manifest differs');if(writer.seats.length||writer.actors.length||writer.localSeat!==undefined)throw Error('Native resume needs the genuine empty staged writer');this.writer=writer;this.classDef=classDef;this.record=Object.freeze({...record,manifest:freezeData(record.manifest),world:freezeData(record.world)});this.#save=copied;for(const key of ['writer','classDef','record'])Object.defineProperty(this,key,{writable:false,configurable:false});owners.add(this);writers.add(writer);}\n #with<T>(stage:Stage,action:(token:NativeCharacterResumeReceipt)=>T):T {if(!this.#running||!this.#preparation)throw Error('Native resume is not active');const token=Object.freeze({}) as NativeCharacterResumeReceipt,row:Receipt={owner:this,writer:this.writer,preparation:this.#preparation,area:this.#area,stage,seat:this.#seat,seatBody:this.#seatBody,seatId:this.#seatId,active:true};receipts.set(token,row);try{return action(token);}finally{row.active=false;}}\n install(preparation:NativeAreaScenePreparation,creation:NativeAreaCharacterCreation,policy:ResumeSpawn,signal?:AbortSignal):NativeAreaSceneOngoing {\n  if(this.#attempted||!isNativeAreaScenePreparation(preparation)||preparation.input.session.writer!==this.writer||creation.preparation!==preparation)throw Error('Native resume needs its exact one-time real preparation');this.#attempted=true;this.#preparation=preparation;this.#running=true;\n  const check=()=>{assertNativeRetainedMassState(this.writer);if(signal?.aborted)throw Error('Native Continue cancelled');};\n  try{check();this.#area=this.#with('shell',token=>Reflect.apply(this.#calls.create,creation,[token,signal]));check();this.#with('fields',token=>{if(!Reflect.apply(this.#calls.fields,this.#area!.combat,[token,this.#save]))throw Error('Saved character fields could not be restored');});check();this.#with('graph',token=>{Reflect.apply(this.#calls.graph,preparation.input.coordinator,[token,structuredClone(this.record.world)]);if(this.#lease)this.#rollback=bindCharacterResumePages(this.writer,this.#lease);Reflect.apply(this.#calls.reconcile,this.#area!.combat,[token]);});check();this.#with('arrival',token=>Reflect.apply(this.#calls.arrival,preparation.input.coordinator,[token,policy,this.record.world.player]));check();return preparation.input.coordinator.published;}finally{this.#running=false;}\n }\n discard():void {const rollback=this.#rollback;this.#rollback=undefined;rollback?.();}\n makeSeat(token:NativeCharacterResumeReceipt,...args:Parameters<World['makePlayerSeat']>):Seat {const r=assertNativeCharacterResume(token,'fields');if(r.owner!==this||!r.area||this.#seat)throw Error('Native saved-seat factory is busy or foreign');let created:Seat|undefined;try{const seat=sceneMakePlayerSeat({recalcSeat:row=>{if(created&&created!==row)throw Error('Native saved-seat identity changed');created=row;this.#seat=row;this.#seatBody=own<Actor>(row,'actor');this.#seatId=own<string>(row,'id');this.#with('seat',proof=>Reflect.apply(this.#calls.recalc,r.area!.progression,[proof]));}},...args);if(seat!==created||own(seat,'actor')!==this.#seatBody||own(seat,'id')!==this.#seatId)throw Error('Native saved-seat factory changed its result');return seat;}catch(error){this.#seat=undefined;this.#seatBody=undefined;this.#seatId=undefined;throw error;}}\n admitSeat(token:NativeCharacterResumeReceipt,seat:Seat):void {const r=assertNativeCharacterResume(token,'fields'),area=r.area;if(r.owner!==this||!area||seat!==this.#seat)throw Error('Native saved-seat insertion is foreign');const authority=r.preparation.input.authority,body=this.#seatBody,relay=area.assembly.input.population.factory.relayStatus;if(!body)throw Error('Native saved-seat factory body is absent');const rows=own<Seat[]>(r.writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native saved-seat needs its raw roster');let member=false;for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)member=true;if(!member||own(seat,'actor')!==body||own(seat,'id')!==this.#seatId)throw Error('Native saved-seat insertion lost the exact roster row');const descriptor=Object.getOwnPropertyDescriptor(body,'statusRelay');if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.writable)throw Error('Native saved-seat relay is not writable');assertNativeCharacterResume(token,'fields');Reflect.apply(this.#calls.claim,authority,[area.binding,body]);body.statusRelay=relay;this.#seat=undefined;this.#seatBody=undefined;this.#seatId=undefined;}",
          "after": "export function isNativeAreaCharacterResume(value:unknown):value is NativeAreaCharacterResume{return !!value&&typeof value==='object'&&owners.has(value);}\nexport function assertNativeCharacterResume(token:NativeCharacterResumeReceipt,stage:Stage):Readonly<Receipt>{const r=receipts.get(token);if(!r?.active||r.stage!==stage)throw Error('Native saved-character stage is foreign or expired');assertNativeRetainedMassState(r.writer);if(stage==='seat'&&(!r.seat||own(r.seat,'actor')!==r.seatBody||own(r.seat,'id')!==r.seatId))throw Error('Native saved-seat factory relation changed');if(r.preparation.input.session.writer!==r.writer)throw Error('Native saved-character roots changed');return r;}\nexport class NativeAreaCharacterResume {\n readonly #advanceCreation=NativeAreaCharacterCreation.prototype.advanceResumeLoading;\n readonly #calls={create:NativeAreaCharacterCreation.prototype.createResume,fields:NativeAreaSceneCombat.prototype.restoreCharacterFields,graph:NativeAreaSceneTransitionCoordinator.prototype.restoreCharacterGraph,reconcile:NativeAreaSceneCombat.prototype.reconcileRestoredGraph,arrival:NativeAreaSceneTransitionCoordinator.prototype.resumeCharacterArrival,recalc:NativeAreaSceneProgression.prototype.recalcRestoredSeat,claim:NativeAreaActorAuthority.prototype.claimInserted};\n readonly writer:World;readonly classDef:ClassDef;readonly record:NativeRetainedResumeRecord;readonly #save:CharacterSave;readonly #lease:CharacterResume|undefined;#rollback:(()=>void)|undefined;\n #preparation:NativeAreaScenePreparation|undefined;#area:NativeAreaSceneOngoing|undefined;#running=false;#attempted=false;#seat:Seat|undefined;#seatBody:Actor|undefined;#seatId:string|undefined;\n constructor(writer:World,save:CharacterSave,lease?:CharacterResume){if(lease&&(!characterResumeAuthority(lease)||lease.kind!=='inline'||lease.save!==save))throw Error('Native saved character needs its exact live storage lease');this.#lease=lease;if(!isNativeWorld(writer)||writers.has(writer))throw Error('Native resume needs its actual unused writer');assertNativeRetainedMassState(writer);const copied=JSON.parse(JSON.stringify(save)) as CharacterSave,record=readNativeRetainedSave(copied),classDef=CLASSES.find(c=>c.id===copied.classId);if(!classDef||canonical(record.manifest)!==canonical(writer.manifest))throw Error('Native resume class or recorded manifest differs');if(writer.seats.length||writer.actors.length||writer.localSeat!==undefined)throw Error('Native resume needs the genuine empty staged writer');this.writer=writer;this.classDef=classDef;this.record=Object.freeze({...record,manifest:freezeData(record.manifest),world:freezeData(record.world)});this.#save=copied;for(const key of ['writer','classDef','record'])Object.defineProperty(this,key,{writable:false,configurable:false});owners.add(this);writers.add(writer);}\n #with<T>(stage:Stage,action:(token:NativeCharacterResumeReceipt)=>T):T {if(!this.#running||!this.#preparation)throw Error('Native resume is not active');const token=Object.freeze({}) as NativeCharacterResumeReceipt,row:Receipt={owner:this,writer:this.writer,preparation:this.#preparation,area:this.#area,stage,seat:this.#seat,seatBody:this.#seatBody,seatId:this.#seatId,active:true};receipts.set(token,row);try{return action(token);}finally{row.active=false;}}\n install(preparation:NativeAreaScenePreparation,creation:NativeAreaCharacterCreation,policy:ResumeSpawn,signal?:AbortSignal):NativeAreaSceneOngoing {\n  if(this.#attempted||!isNativeAreaScenePreparation(preparation)||preparation.input.session.writer!==this.writer||creation.preparation!==preparation)throw Error('Native resume needs its exact one-time real preparation');this.#attempted=true;this.#preparation=preparation;this.#running=true;\n  const check=()=>{assertNativeRetainedMassState(this.writer);if(signal?.aborted)throw Error('Native Continue cancelled');};\n  try{check();this.#area=this.#with('shell',token=>Reflect.apply(this.#calls.create,creation,[token,signal]));check();this.#with('fields',token=>{if(!Reflect.apply(this.#calls.fields,this.#area!.combat,[token,this.#save]))throw Error('Saved character fields could not be restored');});check();this.#with('graph',token=>{Reflect.apply(this.#calls.graph,preparation.input.coordinator,[token,structuredClone(this.record.world)]);if(this.#lease)this.#rollback=bindCharacterResumePages(this.writer,this.#lease);Reflect.apply(this.#calls.reconcile,this.#area!.combat,[token]);});check();this.#with('arrival',token=>Reflect.apply(this.#calls.arrival,preparation.input.coordinator,[token,policy,this.record.world.player]));check();return preparation.input.coordinator.published;}finally{this.#running=false;}\n }\n\n get loadingActive():boolean {return this.#running;}\n /** Advance only between completed, synchronously revoked native receipts. */\n async installLoading(preparation:NativeAreaScenePreparation,creation:NativeAreaCharacterCreation,policy:ResumeSpawn,pause:(label:string)=>Promise<void>,signal?:AbortSignal):Promise<NativeAreaSceneOngoing> {\n  if(this.#attempted||!isNativeAreaScenePreparation(preparation)||preparation.input.session.writer!==this.writer||creation.preparation!==preparation)throw Error('Native resume needs its exact one-time real preparation');\n  this.#attempted=true;this.#preparation=preparation;\n  const check=()=>{assertNativeRetainedMassState(this.writer);if(signal?.aborted||this.#lease&&!characterResumeAuthority(this.#lease))throw Error('Native Continue cancelled');};\n  const stage=<T>(action:()=>T):T=>{check();if(this.#running)throw Error('Native resume cannot reenter');this.#running=true;try{return this.writer.withGlobalPolicies(action);}finally{this.#running=false;}};\n  const wait=async(label:string)=>{check();await pause(label);check();};\n  for(;;){const step=stage(()=>this.#with('shell',token=>Reflect.apply(this.#advanceCreation,creation,[token,signal])));check();if(step.done){this.#area=step.value;break;}await wait(step.value);}\n  await wait('Restoring your vessel');\n  stage(()=>this.#with('fields',token=>{if(!Reflect.apply(this.#calls.fields,this.#area!.combat,[token,this.#save]))throw Error('Saved character fields could not be restored');}));\n  await wait('Restoring your journey');\n  stage(()=>this.#with('graph',token=>{Reflect.apply(this.#calls.graph,preparation.input.coordinator,[token,structuredClone(this.record.world)]);if(this.#lease)this.#rollback=bindCharacterResumePages(this.writer,this.#lease);Reflect.apply(this.#calls.reconcile,this.#area!.combat,[token]);}));\n  await wait('Returning to your recorded ground');\n  stage(()=>this.#with('arrival',token=>Reflect.apply(this.#calls.arrival,preparation.input.coordinator,[token,policy,this.record.world.player])));\n  check();return preparation.input.coordinator.published;\n }\n\n discard():void {const rollback=this.#rollback;this.#rollback=undefined;rollback?.();}\n makeSeat(token:NativeCharacterResumeReceipt,...args:Parameters<World['makePlayerSeat']>):Seat {const r=assertNativeCharacterResume(token,'fields');if(r.owner!==this||!r.area||this.#seat)throw Error('Native saved-seat factory is busy or foreign');let created:Seat|undefined;try{const seat=sceneMakePlayerSeat({recalcSeat:row=>{if(created&&created!==row)throw Error('Native saved-seat identity changed');created=row;this.#seat=row;this.#seatBody=own<Actor>(row,'actor');this.#seatId=own<string>(row,'id');this.#with('seat',proof=>Reflect.apply(this.#calls.recalc,r.area!.progression,[proof]));}},...args);if(seat!==created||own(seat,'actor')!==this.#seatBody||own(seat,'id')!==this.#seatId)throw Error('Native saved-seat factory changed its result');return seat;}catch(error){this.#seat=undefined;this.#seatBody=undefined;this.#seatId=undefined;throw error;}}\n admitSeat(token:NativeCharacterResumeReceipt,seat:Seat):void {const r=assertNativeCharacterResume(token,'fields'),area=r.area;if(r.owner!==this||!area||seat!==this.#seat)throw Error('Native saved-seat insertion is foreign');const authority=r.preparation.input.authority,body=this.#seatBody,relay=area.assembly.input.population.factory.relayStatus;if(!body)throw Error('Native saved-seat factory body is absent');const rows=own<Seat[]>(r.writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native saved-seat needs its raw roster');let member=false;for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)member=true;if(!member||own(seat,'actor')!==body||own(seat,'id')!==this.#seatId)throw Error('Native saved-seat insertion lost the exact roster row');const descriptor=Object.getOwnPropertyDescriptor(body,'statusRelay');if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.writable)throw Error('Native saved-seat relay is not writable');assertNativeCharacterResume(token,'fields');Reflect.apply(this.#calls.claim,authority,[area.binding,body]);body.statusRelay=relay;this.#seat=undefined;this.#seatBody=undefined;this.#seatId=undefined;}"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeClientContinue.ts",
      "rawBeforeHash": "6f8cb1024fa243d53e96e2d607277a08b8b01a9d44aaf3e9b9328fdc7caddf60",
      "rawAfterHash": "c645dc33f6f43d397d4616ce481d205aa58c8e602e236830daac259c4c3cc8c9",
      "beforeHash": "6f8cb1024fa243d53e96e2d607277a08b8b01a9d44aaf3e9b9328fdc7caddf60",
      "afterHash": "c645dc33f6f43d397d4616ce481d205aa58c8e602e236830daac259c4c3cc8c9",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {NativeAreaCharacterResume} from './nativeAreaCharacterResume';\nimport {NativeClientRuntime} from './nativeClientRuntime';\nexport interface PreparedNativeCharacterWorld {readonly writer:World;readonly runtime:NativeClientRuntime;publish():Readonly<{writer:World;runtime:NativeClientRuntime}>;discard():void}\nconst install=NativeClientRuntime.prototype.install,retire=NativeClientRuntime.prototype.retire;\nexport async function prepareNativeCharacterContinue(account:Account,resume:CharacterResume,options:{readonly isCurrent:()=>boolean;readonly signal?:AbortSignal;readonly spawn:ResumeSpawn;readonly loadingStage?:(label:string)=>Promise<void>}):Promise<PreparedNativeCharacterWorld>{\n const baseline=JSON.stringify(serializeAccount(account));\n const current=()=>!options.signal?.aborted&&options.isCurrent()&&characterResumeAuthority(resume)&&JSON.stringify(serializeAccount(account))===baseline;\n if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');\n if(resume.kind!=='inline')throw Error('This save has no recorded retained geography envelope; migration is required and the save was not changed');\n const bound=soloResumeRefusal(resume.save);if(bound)throw Error(bound);\n const record=readNativeRetainedSave(resume.save);\n if(options.loadingStage)await options.loadingStage('Restoring the recorded world');if(!current())throw Error('Continue was superseded');\n const writer=World.staged(structuredClone(account),Object.freeze(record.manifest));let runtime:NativeClientRuntime|undefined,published=false,discarded=false;\n const discard=()=>{if(published||discarded)return;discarded=true;if(runtime)Reflect.apply(retire,runtime,[]);};\n try{\n  const restore=new NativeAreaCharacterResume(writer,resume.save,resume);runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:record.geography.spec,...record.catalog?{catalog:record.catalog.spec}:{},resume:restore,resumePolicy:options.spawn});\n  writer.withGlobalPolicies(()=>Reflect.apply(install,runtime!,[options.signal]));\n  if(options.loadingStage)await options.loadingStage('Restoring retained area ownership');\n  if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');\n  const ready=runtime;\n  return {writer,runtime:ready,discard,publish:()=>{if(discarded||published||!current())throw Error('Continue was superseded');if(!writer.publishResumeAccount(account,baseline))throw Error('The account changed during Continue');published=true;return Object.freeze({writer,runtime:ready});}};",
          "after": "import {NativeAreaCharacterResume} from './nativeAreaCharacterResume';\nimport {NativeClientRuntime} from './nativeClientRuntime';\nexport interface PreparedNativeCharacterWorld {readonly writer:World;readonly runtime:NativeClientRuntime;publish():Readonly<{writer:World;runtime:NativeClientRuntime}>;discard():void}\nconst installLoading=NativeClientRuntime.prototype.installLoading;\nconst install=NativeClientRuntime.prototype.install,retire=NativeClientRuntime.prototype.retire;\nexport async function prepareNativeCharacterContinue(account:Account,resume:CharacterResume,options:{readonly isCurrent:()=>boolean;readonly signal?:AbortSignal;readonly spawn:ResumeSpawn;readonly loadingStage?:(label:string)=>Promise<void>}):Promise<PreparedNativeCharacterWorld>{\n const baseline=JSON.stringify(serializeAccount(account));\n const current=()=>!options.signal?.aborted&&options.isCurrent()&&characterResumeAuthority(resume)&&JSON.stringify(serializeAccount(account))===baseline;\n if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');\n if(resume.kind!=='inline')throw Error('This save has no recorded retained geography envelope; migration is required and the save was not changed');\n const bound=soloResumeRefusal(resume.save);if(bound)throw Error(bound);\n const wait=async(label:string)=>{if(!current())throw Error('Continue was superseded');if(options.loadingStage)await options.loadingStage(label);if(!current())throw Error('Continue was superseded');};\n await wait('Reading the recorded world');\n const record=readNativeRetainedSave(resume.save);\n if(options.loadingStage)await options.loadingStage('Restoring the recorded world');if(!current())throw Error('Continue was superseded');\n const writer=World.staged(structuredClone(account),Object.freeze(record.manifest));let runtime:NativeClientRuntime|undefined,published=false,discarded=false;\n const discard=()=>{if(published||discarded)return;discarded=true;if(runtime)Reflect.apply(retire,runtime,[]);};\n try{\n  const restore=new NativeAreaCharacterResume(writer,resume.save,resume);\n  if(options.loadingStage)await wait('Preparing your recorded vessel');\n  runtime=new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography:record.geography.spec,...record.catalog?{catalog:record.catalog.spec}:{},resume:restore,resumePolicy:options.spawn});\n  if(options.loadingStage){await wait('Restoring your starting ground');await Reflect.apply(installLoading,runtime,[wait,options.signal]);}\n  else writer.withGlobalPolicies(()=>Reflect.apply(install,runtime!,[options.signal]));\n  if(options.loadingStage)await options.loadingStage('Restoring your journey');\n  if(!current()||!await characterResumeCurrent(resume)||!current())throw Error('Continue was superseded');\n  const ready=runtime;\n  return {writer,runtime:ready,discard,publish:()=>{if(discarded||published||!current())throw Error('Continue was superseded');if(!writer.publishResumeAccount(account,baseline))throw Error('The account changed during Continue');published=true;return Object.freeze({writer,runtime:ready});}};"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeClientRuntime.ts",
      "rawBeforeHash": "ec9b1181b6d6b5fbd2ada9d59fd62373e3555e043185cc92712e57096386b4fc",
      "rawAfterHash": "970d2b5e0a6999fd0919adedbbee61eeb1af83347d6b9457e1f3c4ec87a45837",
      "beforeHash": "ec9b1181b6d6b5fbd2ada9d59fd62373e3555e043185cc92712e57096386b4fc",
      "afterHash": "970d2b5e0a6999fd0919adedbbee61eeb1af83347d6b9457e1f3c4ec87a45837",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {NativeAreaScenePreparation} from './nativeAreaScenePreparation';\nimport type {NativeAreaOngoingRuntime,NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';\nconst serializeHosted=NativeAreaHostedSnapshots.prototype.serialize;\nconst installed=new WeakMap<World,NativeClientRuntime>(),handles=new WeakSet<object>();\nconst select=NativeAreaActorAuthority.prototype.selectActors,final=NativeAreaActorAuthority.prototype.assertFinalSelections,present=NativeAreaActorAuthority.prototype.isPresentActor,finalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;\nfunction own<T>(o:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native client needs ordinary actual data: '+String(key));return d.value as T;}\nfunction assertAuthorityRole(writer:World):void {for(const key of ['clientActionHook','shardWorld']){const d=Object.getOwnPropertyDescriptor(writer,key);if(!d||!Object.hasOwn(d,'value')||d.value!==undefined)throw Error('Native client authority cannot install or dispatch on a network render shell or legacy shard unit');}}\nfunction roster(writer:World):readonly Seat[]{const rows=own<Seat[]>(writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native client needs the actual raw roster');const n=own<number>(rows,'length');for(let i=0;i<n;i++)own(rows,i);return rows;}\nfunction member(rows:readonly Seat[],seat:Seat):boolean {for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)return true;return false;}\nfunction time(value:number):void {if(!Number.isFinite(value)||value<0)throw Error('Native client frame time must be finite and nonnegative');}\nexport interface NativeClientInstallation {readonly writer:World;readonly geography:MassNativeGeographySpec;readonly catalog?:NativeGeographyCatalogSpec;readonly definition:ZoneDef;readonly fresh?:NativeFreshCharacter;readonly resume?:NativeAreaCharacterResume;readonly resumePolicy?:ResumeSpawn}\nexport interface NativeClientMetaAction {readonly seatId:string;readonly action:MetaAction;readonly seq?:number}\nexport interface NativeClientFrame {readonly dt:number;readonly wallSeconds:number;readonly inputs:Map<string,PlayerInput>;readonly actions?:readonly NativeClientMetaAction[];readonly gearVacuum?:boolean}\nexport interface NativeClientFrameResult {readonly ready:boolean;readonly aiAreas:readonly string[];readonly droppedActions:readonly {seatId:string;error:unknown}[]}\ninterface SeatSelection {readonly seat:Seat;readonly id:string;readonly body:Actor;readonly rows:readonly Seat[];readonly selection:readonly NativeAreaActorSelection<NativeAreaOngoingRuntime>[];readonly area:NativeAreaSceneOngoing}\nexport function nativeClientRuntimeFor(writer:World):NativeClientRuntime|undefined {return installed.get(writer);}\nexport function isNativeClientRuntime(value:unknown):value is NativeClientRuntime{return !!value&&typeof value==='object'&&handles.has(value);}\nexport class NativeClientRuntime {\n readonly #retireAuthority=NativeAreaActorAuthority.prototype.retire;readonly #retireMemory=NativeAreaMemoryRegistry.prototype.retire;\n readonly #close=NativeAreaSceneTransitionCoordinator.prototype.retire;readonly #assertIdle=NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame;\n readonly hosted:NativeAreaHostedSnapshots;\n readonly writer:World;readonly geography:MassNativeGeography;readonly definition:ZoneDef;\n readonly #session:NativeAreaCampaignSession;readonly #authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #preparation:NativeAreaScenePreparation;\n readonly #installResume=NativeAreaCharacterResume.prototype.install;readonly #discardResume=NativeAreaCharacterResume.prototype.discard;\n readonly #resume:NativeAreaCharacterResume|undefined;readonly #resumePolicy:ResumeSpawn;\n readonly #creation:NativeAreaCharacterCreation|undefined;readonly #fresh:NativeFreshCharacter|undefined;\n readonly #createCharacter=NativeAreaCharacterCreation.prototype.create;readonly #retireCharacter=NativeAreaCharacterCreation.prototype.retire;\n #state:'prepared'|'installing'|'ready'|'retired'='prepared';#busy=false;\n constructor(input:NativeClientInstallation){\n  const writer=own<World>(input,'writer'),definition=own<ZoneDef>(input,'definition'),spec=own<MassNativeGeographySpec>(input,'geography');\n  if(!isNativeWorld(writer)||installed.has(writer))throw Error('Native client runtime needs its one actual writer');assertNativeRetainedMassState(writer);\n  if(hasNativeAreaCampaignSession(writer)||hasNativeAreaMemoryRegistry(writer)||hasNativeAreaSceneTransitionCoordinator(writer))throw Error('Native client cannot adopt already-owned campaign roots');\n  assertAuthorityRole(writer);\n  if((writer.zoneMap[definition.id]??writer.caveMap[definition.id])!==definition)throw Error('Native client definition must be the exact recorded campaign definition');\n  let geography=new MassNativeGeography(spec);if(geography.seed!==writer.manifest.seed)throw Error('Native client geography belongs to a different campaign seed');\n  const catalog=Object.hasOwn(input,'catalog')?new NativeGeographyCatalog(own<NativeGeographyCatalogSpec>(input,'catalog')):undefined;if(catalog){catalog.initial.assertCompatible(spec);geography=catalog.initial;}\n  const resume=Object.hasOwn(input,'resume')?own<NativeAreaCharacterResume>(input,'resume'):undefined;if(resume&&(!isNativeAreaCharacterResume(resume)||resume.writer!==writer||Object.hasOwn(input,'fresh')))throw Error('Native Continue owner differs');if(resume&&(catalog||resume.record.catalog)){if(!catalog||!resume.record.catalog)throw Error('Native Continue catalog differs');catalog.assertCompatible(resume.record.catalog.spec);geography.assertCompatible(resume.record.geography.spec);}this.#resume=resume;this.#resumePolicy=Object.hasOwn(input,'resumePolicy')?own<ResumeSpawn>(input,'resumePolicy'):'exact';const fresh=Object.hasOwn(input,'fresh')?own<NativeFreshCharacter>(input,'fresh'):undefined;this.#fresh=fresh;const rows=roster(writer),seat=own<Seat|undefined>(writer,'localSeat'),actors=own<Actor[]>(writer,'actors');\n  if((fresh||resume)?(rows.length!==0||actors.length!==0||seat!==undefined):(!seat||rows.length!==1||rows[0]!==seat||actors.length!==1||actors[0]!==own<Actor>(seat,'actor')))throw Error('Native client initial installation requires the genuine unplaced local character; companion/cohort hydration is a separate bootstrap step');\n  const banks=own<World['maddenBanks']>(writer,'maddenBanks');try{Reflect.apply(WeakMap.prototype.has,banks,[{}]);}catch{throw Error('Native client needs the actual madness ledger');}\n  this.writer=writer;this.geography=geography;this.definition=definition;\n  let acquired=false,coordinator:NativeAreaSceneTransitionCoordinator|undefined,memoryRegistry:NativeAreaMemoryRegistry|undefined,authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>|undefined;\n  try{\n  const session=this.#session=new NativeAreaCampaignSession(writer),campaign=session.campaign;acquired=true;authority=this.#authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(campaign);memoryRegistry=new NativeAreaMemoryRegistry(writer);memoryRegistry.bindRecordedGeography(geography,catalog);\n  coordinator=this.#coordinator=new NativeAreaSceneTransitionCoordinator({campaign,characterWriter:writer,authority,memoryRegistry});session.bindCoordinator(coordinator);\n  const maddenLedger=new NativeAreaMaddenLedger({campaign,authority,banks});\n  this.#preparation=new NativeAreaScenePreparation({session,coordinator,authority,maddenLedger,...catalog?{catalog}:{}});\n  this.#creation=(fresh||resume)?new NativeAreaCharacterCreation(this.#preparation,definition,geography):undefined;\n  this.hosted=new NativeAreaHostedSnapshots({writer,coordinator,authority});\n  for(const key of ['writer','geography','definition','hosted'])Object.defineProperty(this,key,{writable:false,configurable:false});installed.set(writer,this);handles.add(this);\n  }catch(error){if(!acquired)throw error;if(coordinator)Reflect.apply(this.#close,coordinator,[]);else{retireNativeRetainedWriter(writer);if(authority)Reflect.apply(this.#retireAuthority,authority,[]);if(memoryRegistry)Reflect.apply(this.#retireMemory,memoryRegistry,[]);}throw error;}\n }\n #live():void {if(this.#state==='retired')throw Error('Native client runtime is retired');if(installed.get(this.writer)!==this)throw Error('Native client runtime registration changed');assertNativeRetainedMassState(this.writer);assertAuthorityRole(this.writer);}\n #idle():void {this.#live();if(this.#busy)throw Error('Native client runtime cannot reenter');Reflect.apply(this.#assertIdle,this.#coordinator,[]);}\n #isReady():boolean {const ready=this.#state==='ready'&&this.#coordinator.nativeWorldReady();this.#live();return ready;}\n get ready():boolean {if(this.#state==='retired')return false;this.#idle();this.#busy=true;try{return this.#isReady();}finally{this.#busy=false;}}\n get current():NativeAreaSceneOngoing {this.#idle();this.#busy=true;try{if(!this.#isReady())throw Error('Native client runtime is not ready');return this.#coordinator.published;}finally{this.#busy=false;}}\n /** Final publication is synchronous. Caller checks loading generation before\n  * this entry; AbortSignal is rechecked after each native preparation boundary. */\n install(signal?:AbortSignal):void {\n  this.#idle();if(this.#state!=='prepared')throw Error('Native client initial installation was already attempted');\n  this.#busy=true;this.#state='installing';\n  try{if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();if(this.#creation&&this.#resume)Reflect.apply(this.#installResume,this.#resume,[this.#preparation,this.#creation,this.#resumePolicy,signal]);else if(this.#creation&&this.#fresh)Reflect.apply(this.#createCharacter,this.#creation,[this.#fresh,signal]);else{const area=this.#preparation.prepare(this.definition.id,this.geography);if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();this.#preparation.birthInitial(area);}if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();this.#state='ready';}\n  catch(error){this.#busy=false;this.#retire();throw error;}finally{this.#busy=false;}\n }\n /** Terminal: retained bindings, tickets, callbacks and memory registrations are\n  * revoked by their owners. Raw native gameplay state is not rolled back. */\n retire():readonly string[] {return this.#retire();}\n #retire():readonly string[] {if(this.#state==='retired')return Reflect.apply(this.#close,this.#coordinator,[]);if(this.#busy)throw Error('Native client runtime cannot retire during dispatch');const unrestored=Reflect.apply(this.#close,this.#coordinator,[]);if(this.#creation)Reflect.apply(this.#retireCharacter,this.#creation,[]);if(this.#resume)Reflect.apply(this.#discardResume,this.#resume,[]);this.#state='retired';return unrestored;}\n #seat(seat:Seat):SeatSelection {\n  this.#live();const rows=roster(this.writer);if(!member(rows,seat))throw Error('Native client input seat left campaign');const body=own<Actor>(seat,'actor'),id=own<string>(seat,'id');\n  const selection=Reflect.apply(select,this.#authority,[[body],false]);if(selection.length!==1)throw Error('Native client input requires one physical owner');const area=this.#coordinator.areaFor(selection[0].owner.combat);",
          "after": "import {NativeAreaScenePreparation} from './nativeAreaScenePreparation';\nimport type {NativeAreaOngoingRuntime,NativeAreaSceneOngoing} from './nativeAreaSceneOngoing';\nconst serializeHosted=NativeAreaHostedSnapshots.prototype.serialize;\nconst creationLoadingActive=Object.getOwnPropertyDescriptor(NativeAreaCharacterCreation.prototype,'loadingActive')!.get!,resumeLoadingActive=Object.getOwnPropertyDescriptor(NativeAreaCharacterResume.prototype,'loadingActive')!.get!;\nconst installed=new WeakMap<World,NativeClientRuntime>(),handles=new WeakSet<object>();\nconst select=NativeAreaActorAuthority.prototype.selectActors,final=NativeAreaActorAuthority.prototype.assertFinalSelections,present=NativeAreaActorAuthority.prototype.isPresentActor,finalPhysical=NativeAreaActorAuthority.prototype.assertFinalPhysical;\nfunction own<T>(o:object,key:PropertyKey):T {const d=Object.getOwnPropertyDescriptor(o,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native client needs ordinary actual data: '+String(key));return d.value as T;}\nfunction assertAuthorityRole(writer:World):void {for(const key of ['clientActionHook','shardWorld']){const d=Object.getOwnPropertyDescriptor(writer,key);if(!d||!Object.hasOwn(d,'value')||d.value!==undefined)throw Error('Native client authority cannot install or dispatch on a network render shell or legacy shard unit');}}\nfunction roster(writer:World):readonly Seat[]{const rows=own<Seat[]>(writer,'seats');if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype)throw Error('Native client needs the actual raw roster');const n=own<number>(rows,'length');for(let i=0;i<n;i++)own(rows,i);return rows;}\nfunction member(rows:readonly Seat[],seat:Seat):boolean {for(let i=0;i<own<number>(rows,'length');i++)if(own(rows,i)===seat)return true;return false;}\nfunction time(value:number):void {if(!Number.isFinite(value)||value<0)throw Error('Native client frame time must be finite and nonnegative');}\nexport interface NativeClientInstallation {readonly writer:World;readonly geography:MassNativeGeographySpec;readonly catalog?:NativeGeographyCatalogSpec;readonly definition:ZoneDef;readonly fresh?:NativeFreshCharacter;readonly resume?:NativeAreaCharacterResume;readonly resumePolicy?:ResumeSpawn}\nexport interface NativeClientMetaAction {readonly seatId:string;readonly action:MetaAction;readonly seq?:number}\nexport interface NativeClientFrame {readonly dt:number;readonly wallSeconds:number;readonly inputs:Map<string,PlayerInput>;readonly actions?:readonly NativeClientMetaAction[];readonly gearVacuum?:boolean}\nexport interface NativeClientFrameResult {readonly ready:boolean;readonly aiAreas:readonly string[];readonly droppedActions:readonly {seatId:string;error:unknown}[]}\ninterface SeatSelection {readonly seat:Seat;readonly id:string;readonly body:Actor;readonly rows:readonly Seat[];readonly selection:readonly NativeAreaActorSelection<NativeAreaOngoingRuntime>[];readonly area:NativeAreaSceneOngoing}\nexport function nativeClientRuntimeFor(writer:World):NativeClientRuntime|undefined {return installed.get(writer);}\nexport function isNativeClientRuntime(value:unknown):value is NativeClientRuntime{return !!value&&typeof value==='object'&&handles.has(value);}\nexport class NativeClientRuntime {\n readonly #retireAuthority=NativeAreaActorAuthority.prototype.retire;readonly #retireMemory=NativeAreaMemoryRegistry.prototype.retire;\n readonly #close=NativeAreaSceneTransitionCoordinator.prototype.retire;readonly #assertIdle=NativeAreaSceneTransitionCoordinator.prototype.assertIdleFrame;\n readonly hosted:NativeAreaHostedSnapshots;\n readonly writer:World;readonly geography:MassNativeGeography;readonly definition:ZoneDef;\n readonly #session:NativeAreaCampaignSession;readonly #authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;readonly #coordinator:NativeAreaSceneTransitionCoordinator;readonly #preparation:NativeAreaScenePreparation;\n readonly #installResumeLoading=NativeAreaCharacterResume.prototype.installLoading;\n readonly #createCharacterLoading=NativeAreaCharacterCreation.prototype.createLoading;\n readonly #installResume=NativeAreaCharacterResume.prototype.install;readonly #discardResume=NativeAreaCharacterResume.prototype.discard;\n readonly #resume:NativeAreaCharacterResume|undefined;readonly #resumePolicy:ResumeSpawn;\n readonly #creation:NativeAreaCharacterCreation|undefined;readonly #fresh:NativeFreshCharacter|undefined;\n readonly #createCharacter=NativeAreaCharacterCreation.prototype.create;readonly #retireCharacter=NativeAreaCharacterCreation.prototype.retire;\n #state:'prepared'|'installing'|'ready'|'retired'='prepared';#busy=false;\n constructor(input:NativeClientInstallation){\n  const writer=own<World>(input,'writer'),definition=own<ZoneDef>(input,'definition'),spec=own<MassNativeGeographySpec>(input,'geography');\n  if(!isNativeWorld(writer)||installed.has(writer))throw Error('Native client runtime needs its one actual writer');assertNativeRetainedMassState(writer);\n  if(hasNativeAreaCampaignSession(writer)||hasNativeAreaMemoryRegistry(writer)||hasNativeAreaSceneTransitionCoordinator(writer))throw Error('Native client cannot adopt already-owned campaign roots');\n  assertAuthorityRole(writer);\n  if((writer.zoneMap[definition.id]??writer.caveMap[definition.id])!==definition)throw Error('Native client definition must be the exact recorded campaign definition');\n  let geography=new MassNativeGeography(spec);if(geography.seed!==writer.manifest.seed)throw Error('Native client geography belongs to a different campaign seed');\n  const catalog=Object.hasOwn(input,'catalog')?new NativeGeographyCatalog(own<NativeGeographyCatalogSpec>(input,'catalog')):undefined;if(catalog){catalog.initial.assertCompatible(spec);geography=catalog.initial;}\n  const resume=Object.hasOwn(input,'resume')?own<NativeAreaCharacterResume>(input,'resume'):undefined;if(resume&&(!isNativeAreaCharacterResume(resume)||resume.writer!==writer||Object.hasOwn(input,'fresh')))throw Error('Native Continue owner differs');if(resume&&(catalog||resume.record.catalog)){if(!catalog||!resume.record.catalog)throw Error('Native Continue catalog differs');catalog.assertCompatible(resume.record.catalog.spec);geography.assertCompatible(resume.record.geography.spec);}this.#resume=resume;this.#resumePolicy=Object.hasOwn(input,'resumePolicy')?own<ResumeSpawn>(input,'resumePolicy'):'exact';const fresh=Object.hasOwn(input,'fresh')?own<NativeFreshCharacter>(input,'fresh'):undefined;this.#fresh=fresh;const rows=roster(writer),seat=own<Seat|undefined>(writer,'localSeat'),actors=own<Actor[]>(writer,'actors');\n  if((fresh||resume)?(rows.length!==0||actors.length!==0||seat!==undefined):(!seat||rows.length!==1||rows[0]!==seat||actors.length!==1||actors[0]!==own<Actor>(seat,'actor')))throw Error('Native client initial installation requires the genuine unplaced local character; companion/cohort hydration is a separate bootstrap step');\n  const banks=own<World['maddenBanks']>(writer,'maddenBanks');try{Reflect.apply(WeakMap.prototype.has,banks,[{}]);}catch{throw Error('Native client needs the actual madness ledger');}\n  this.writer=writer;this.geography=geography;this.definition=definition;\n  let acquired=false,coordinator:NativeAreaSceneTransitionCoordinator|undefined,memoryRegistry:NativeAreaMemoryRegistry|undefined,authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>|undefined;\n  try{\n  const session=this.#session=new NativeAreaCampaignSession(writer),campaign=session.campaign;acquired=true;authority=this.#authority=new NativeAreaActorAuthority<NativeAreaOngoingRuntime>(campaign);memoryRegistry=new NativeAreaMemoryRegistry(writer);memoryRegistry.bindRecordedGeography(geography,catalog);\n  coordinator=this.#coordinator=new NativeAreaSceneTransitionCoordinator({campaign,characterWriter:writer,authority,memoryRegistry});session.bindCoordinator(coordinator);\n  const maddenLedger=new NativeAreaMaddenLedger({campaign,authority,banks});\n  this.#preparation=new NativeAreaScenePreparation({session,coordinator,authority,maddenLedger,...catalog?{catalog}:{}});\n  this.#creation=(fresh||resume)?new NativeAreaCharacterCreation(this.#preparation,definition,geography):undefined;\n  this.hosted=new NativeAreaHostedSnapshots({writer,coordinator,authority});\n  for(const key of ['writer','geography','definition','hosted'])Object.defineProperty(this,key,{writable:false,configurable:false});installed.set(writer,this);handles.add(this);\n  }catch(error){if(!acquired)throw error;if(coordinator)Reflect.apply(this.#close,coordinator,[]);else{retireNativeRetainedWriter(writer);if(authority)Reflect.apply(this.#retireAuthority,authority,[]);if(memoryRegistry)Reflect.apply(this.#retireMemory,memoryRegistry,[]);}throw error;}\n }\n #live():void {if(this.#state==='retired')throw Error('Native client runtime is retired');if(installed.get(this.writer)!==this)throw Error('Native client runtime registration changed');assertNativeRetainedMassState(this.writer);assertAuthorityRole(this.writer);}\n #idle():void {this.#live();if(this.#busy)throw Error('Native client runtime cannot reenter');Reflect.apply(this.#assertIdle,this.#coordinator,[]);}\n #isReady():boolean {const ready=this.#state==='ready'&&this.#coordinator.nativeWorldReady();this.#live();return ready;}\n get ready():boolean {if(this.#state==='retired')return false;this.#idle();this.#busy=true;try{return this.#isReady();}finally{this.#busy=false;}}\n get current():NativeAreaSceneOngoing {this.#idle();this.#busy=true;try{if(!this.#isReady())throw Error('Native client runtime is not ready');return this.#coordinator.published;}finally{this.#busy=false;}}\n /** Final publication is synchronous. Caller checks loading generation before\n  * this entry; AbortSignal is rechecked after each native preparation boundary. */\n install(signal?:AbortSignal):void {\n  this.#idle();if(this.#state!=='prepared')throw Error('Native client initial installation was already attempted');\n  this.#busy=true;this.#state='installing';\n  try{if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();if(this.#creation&&this.#resume)Reflect.apply(this.#installResume,this.#resume,[this.#preparation,this.#creation,this.#resumePolicy,signal]);else if(this.#creation&&this.#fresh)Reflect.apply(this.#createCharacter,this.#creation,[this.#fresh,signal]);else{const area=this.#preparation.prepare(this.definition.id,this.geography);if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();this.#preparation.birthInitial(area);}if(signal?.aborted)throw Error('Native client installation cancelled');this.#live();this.#state='ready';}\n  catch(error){this.#busy=false;this.#retire();throw error;}finally{this.#busy=false;}\n }\n\n /** Browser preparation yields only after real native stages have returned.\n  * The installer remains unready and rejects a second installation throughout. */\n async installLoading(pause:(label:string)=>Promise<void>,signal?:AbortSignal):Promise<void> {\n  this.#idle();if(this.#state!=='prepared')throw Error('Native client initial installation was already attempted');this.#state='installing';\n  const check=()=>{this.#live();if(signal?.aborted)throw Error('Native client installation cancelled');};\n  const wait=async(label:string)=>{check();await pause(label);check();};\n  try {\n   check();\n   if(this.#creation&&this.#resume)await Reflect.apply(this.#installResumeLoading,this.#resume,[this.#preparation,this.#creation,this.#resumePolicy,wait,signal]);\n   else if(this.#creation&&this.#fresh)await Reflect.apply(this.#createCharacterLoading,this.#creation,[this.#fresh,wait,signal]);\n   else throw Error('Cooperative initial installation requires its fresh or resumed character owner');\n   check();this.#state='ready';\n  }catch(error){this.#retire();throw error;}\n }\n\n /** Terminal: retained bindings, tickets, callbacks and memory registrations are\n  * revoked by their owners. Raw native gameplay state is not rolled back. */\n retire():readonly string[] {return this.#retire();}\n #retire():readonly string[] {if(this.#state==='retired')return Reflect.apply(this.#close,this.#coordinator,[]);if(this.#busy||this.#creation&&Reflect.apply(creationLoadingActive,this.#creation,[])||this.#resume&&Reflect.apply(resumeLoadingActive,this.#resume,[]))throw Error('Native client runtime cannot retire during dispatch');const unrestored=Reflect.apply(this.#close,this.#coordinator,[]);if(this.#creation)Reflect.apply(this.#retireCharacter,this.#creation,[]);if(this.#resume)Reflect.apply(this.#discardResume,this.#resume,[]);this.#state='retired';return unrestored;}\n #seat(seat:Seat):SeatSelection {\n  this.#live();const rows=roster(this.writer);if(!member(rows,seat))throw Error('Native client input seat left campaign');const body=own<Actor>(seat,'actor'),id=own<string>(seat,'id');\n  const selection=Reflect.apply(select,this.#authority,[[body],false]);if(selection.length!==1)throw Error('Native client input requires one physical owner');const area=this.#coordinator.areaFor(selection[0].owner.combat);"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeClientStart.ts",
      "rawBeforeHash": "897f671f598fbd8955fef5416c9507048d1fc01ef29fcc3cb8b1f53e5899c7d1",
      "rawAfterHash": "f18a5977f32ca3d2f47c86567bcfe34b4656d65729018adf3d7fc4d6f4403d61",
      "beforeHash": "897f671f598fbd8955fef5416c9507048d1fc01ef29fcc3cb8b1f53e5899c7d1",
      "afterHash": "f18a5977f32ca3d2f47c86567bcfe34b4656d65729018adf3d7fc4d6f4403d61",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Account policy for a genuine local retained start. Browser menu/render shell and\n * cold Continue are separate entrypoints. Native prior writes survive failure. */\nimport {World} from '../engine/world';\nimport {sceneDue} from '../engine/scenes';\nimport {CLASSES,type ClassDef} from '../data/classes';\nimport {MU_CFG,MU_SCENE_ID} from '../data/mu';\nimport {START_ZONE} from '../data/zones';\nimport type {Account} from '../meta/account';\nimport {modeById,mintCharId,freeRosterSlot,DEFAULT_MODE_ID} from '../meta/modes';\nimport {savedCharacterPatronId,persistRun} from '../meta/character';\nimport {releaseMercsOf} from '../meta/mercs';\nimport {saveAccount} from '../meta/persistence';\nimport {rememberKitPicks,resolveClassKit} from '../meta/classkit';\nimport {buildManifest,type ExpeditionManifest} from '../packages/manifest';\nimport {rollSeed} from '../core/rng';\nimport {captureNativeGeographySource} from '../world/captureGeography';\nimport {createNativeGeographyReader} from '../world/geographySource';\nimport {makeMassNativeGeographySpec,validateMapping,type MassNativeMapping} from './nativeGeography';\nimport {makeNativeGeographyCatalogSpec,NativeGeographyCatalog} from './nativeGeographyCatalog';\nimport {NativeClientRuntime,type NativeClientInstallation} from './nativeClientRuntime';\nexport type NativeClientStartRequest={readonly kind:'mu';readonly manifest?:ExpeditionManifest}|{\n readonly kind:'run';readonly classDef:ClassDef;readonly manifest?:ExpeditionManifest;readonly modeId?:string;\n readonly name?:string;readonly graftSkillId?:string|null;readonly kitPicks?:Record<string,string>;\n /** Native profile may deliberately suppress the tutorial. This is a client policy, not geography. */\n readonly prologue?:'native-gate'|'force'|'skip';\n /** Synchronous shell adoption and initial guest joining, before the baseline save. */\n readonly onReady?:(started:NativeClientStarted)=>void;\n};\nexport interface NativeClientStarted {readonly writer:World;readonly runtime:NativeClientRuntime;readonly provisional:boolean;readonly prologue:boolean}\nconst starts=new WeakMap<Account,NativeClientStart>();\nconst install=NativeClientRuntime.prototype.install,retire=NativeClientRuntime.prototype.retire;\nconst installedReady=Object.getOwnPropertyDescriptor(NativeClientRuntime.prototype,'ready')!.get!;\n/** One loading generation for this actual account. A cancel during native work\n * takes effect at the next boundary; it does not roll back roster/gift writes. */\nexport class NativeClientStart {\n readonly #account:Account;readonly #mapping:MassNativeMapping|undefined;\n #busy=false;#generation=0;#controller:AbortController|undefined;#current:NativeClientStarted|undefined;\n constructor(account:Account,mapping?:MassNativeMapping){if(starts.has(account))throw Error('Native client start already owns this account');if(mapping!==undefined)validateMapping(mapping);this.#account=account;this.#mapping=mapping!==undefined?structuredClone(mapping):undefined;if(starts.has(account))throw Error('Native client start already owns this account');starts.set(account,this);}\n get current():NativeClientStarted|undefined{return this.#current;}\n get pending():boolean{return this.#busy;}\n cancel():void {this.#generation++;this.#controller?.abort();if(!this.#busy&&this.#current){Reflect.apply(retire,this.#current.runtime,[]);this.#current=undefined;}}\n begin(request:NativeClientStartRequest):NativeClientStarted|null {\n  if(this.#busy)throw Error('Native client start cannot reenter');this.#busy=true;const generation=++this.#generation,controller=this.#controller=new AbortController();\n  let runtime:NativeClientRuntime|undefined;",
          "after": "import {serializeAccount} from '../meta/account';\n/** Account policy for a genuine local retained start. Browser menu/render shell and\n * cold Continue are separate entrypoints. Native prior writes survive failure. */\nimport {World} from '../engine/world';\nimport {sceneDue} from '../engine/scenes';\nimport {CLASSES,type ClassDef} from '../data/classes';\nimport {MU_CFG,MU_SCENE_ID} from '../data/mu';\nimport {START_ZONE} from '../data/zones';\nimport type {Account} from '../meta/account';\nimport {modeById,mintCharId,freeRosterSlot,DEFAULT_MODE_ID} from '../meta/modes';\nimport {savedCharacterPatronId,persistRun} from '../meta/character';\nimport {releaseMercsOf} from '../meta/mercs';\nimport {saveAccount} from '../meta/persistence';\nimport {rememberKitPicks,resolveClassKit} from '../meta/classkit';\nimport {buildManifest,type ExpeditionManifest} from '../packages/manifest';\nimport {rollSeed} from '../core/rng';\nimport {captureNativeGeographySource} from '../world/captureGeography';\nimport {createNativeGeographyReader} from '../world/geographySource';\nimport {makeMassNativeGeographySpec,validateMapping,type MassNativeMapping} from './nativeGeography';\nimport {makeNativeGeographyCatalogSpec,NativeGeographyCatalog} from './nativeGeographyCatalog';\nimport {NativeClientRuntime,type NativeClientInstallation} from './nativeClientRuntime';\nexport type NativeClientStartRequest={readonly kind:'mu';readonly manifest?:ExpeditionManifest;readonly onReady?:(started:NativeClientStarted)=>void}|{\n readonly kind:'run';readonly classDef:ClassDef;readonly manifest?:ExpeditionManifest;readonly modeId?:string;\n readonly name?:string;readonly graftSkillId?:string|null;readonly kitPicks?:Record<string,string>;\n /** Native profile may deliberately suppress the tutorial. This is a client policy, not geography. */\n readonly prologue?:'native-gate'|'force'|'skip';\n /** Synchronous shell adoption and initial guest joining, before the baseline save. */\n readonly onReady?:(started:NativeClientStarted)=>void;\n};\nexport interface NativeClientStarted {readonly writer:World;readonly runtime:NativeClientRuntime;readonly provisional:boolean;readonly prologue:boolean}\nconst starts=new WeakMap<Account,NativeClientStart>();\nconst installLoading=NativeClientRuntime.prototype.installLoading;\nconst install=NativeClientRuntime.prototype.install,retire=NativeClientRuntime.prototype.retire;\nconst installedReady=Object.getOwnPropertyDescriptor(NativeClientRuntime.prototype,'ready')!.get!;\n/** One loading generation for this actual account. A cancel during native work\n * takes effect at the next boundary; it does not roll back roster/gift writes. */\nexport class NativeClientStart {\n readonly #account:Account;readonly #mapping:MassNativeMapping|undefined;\n #busy=false;#generation=0;#controller:AbortController|undefined;#current:NativeClientStarted|undefined;\n constructor(account:Account,mapping?:MassNativeMapping){if(starts.has(account))throw Error('Native client start already owns this account');if(mapping!==undefined)validateMapping(mapping);this.#account=account;this.#mapping=mapping!==undefined?structuredClone(mapping):undefined;if(starts.has(account))throw Error('Native client start already owns this account');starts.set(account,this);}\n get current():NativeClientStarted|undefined{return this.#current;}\n get pending():boolean{return this.#busy;}\n cancel():void {this.#generation++;this.#controller?.abort();if(!this.#busy&&this.#current){Reflect.apply(retire,this.#current.runtime,[]);this.#current=undefined;}}\n\n /** Browser entry owns a single pending generation. Pauses occur only after\n  * synchronous work has returned and restored the previous global policies. */\n async beginLoading(request:NativeClientStartRequest,pause:(label:string)=>Promise<void>):Promise<NativeClientStarted|null> {\n  if(this.#busy)throw Error('Native client start cannot reenter');this.#busy=true;\n  const generation=++this.#generation,controller=this.#controller=new AbortController();let runtime:NativeClientRuntime|undefined;\n  const check=()=>{if(generation!==this.#generation||controller.signal.aborted)throw Error('Native client start cancelled');};\n  const wait=async(label:string)=>{check();const baseline=JSON.stringify(serializeAccount(this.#account));await pause(label);check();if(JSON.stringify(serializeAccount(this.#account))!==baseline)throw Error('The account changed during native loading');};\n  try {\n   const account=this.#account,provisional=request.kind==='mu';\n   const classDef=provisional?(CLASSES.find(c=>c.id===MU_CFG.provisionalClass)??CLASSES[0]):request.classDef;\n   if(!CLASSES.includes(classDef))throw Error('Native client start requires an installed class');\n   const prologue=!provisional&&(request.prologue==='force'||(request.prologue!=='skip'&&sceneDue(account,'prologue')));\n   check();let character:NonNullable<NativeClientInstallation['fresh']>;\n   if(provisional)character={classDef,options:{modeId:DEFAULT_MODE_ID},scene:MU_SCENE_ID,provisionalMu:true};\n   else {\n    const mode=modeById(request.modeId),charName=request.name?.trim()||classDef.name,charId=mintCharId();\n    if(mode.save==='roster'){\n     const slot=freeRosterSlot(account,mode);if(slot==null)return null;\n     account.roster.push({charId,modeId:mode.id,slot,classId:classDef.id,name:charName,level:1,stage:0,savedAt:Date.now()});saveAccount(account);\n    }else{const previousPatron=savedCharacterPatronId();if(previousPatron&&releaseMercsOf(account,previousPatron)>0)saveAccount(account);}\n    character={classDef,options:{modeId:mode.id,charId,name:charName},graft:request.graftSkillId??undefined,scene:prologue?'prologue':undefined};\n   }\n   check();const manifest=structuredClone(request.manifest??buildManifest(account,rollSeed())),writer=World.staged(account,Object.freeze(manifest));\n   if(this.#current){Reflect.apply(retire,this.#current.runtime,[]);this.#current=undefined;}\n   if(!provisional){if(request.kitPicks){rememberKitPicks(account,classDef,request.kitPicks);saveAccount(account);}character={...character,options:{...character.options,kit:resolveClassKit(account,classDef,request.kitPicks)}};}\n   await wait('Reading the world geography');\n   const source=writer.withGlobalPolicies(()=>createNativeGeographyReader(captureNativeGeographySource(writer.manifest.seed)));\n   await wait('Preparing the world charts');\n   const catalogSpec=this.#mapping?undefined:makeNativeGeographyCatalogSpec(source.identity);\n   await wait('Preparing your world');\n   const catalog=catalogSpec?new NativeGeographyCatalog(catalogSpec):undefined;\n   const geography=this.#mapping?makeMassNativeGeographySpec(source.identity,this.#mapping):catalog!.initial.spec;\n   await wait('Preparing your vessel');\n   runtime=writer.withGlobalPolicies(()=>new NativeClientRuntime({writer,definition:writer.zoneMap[START_ZONE],geography,...catalog?{catalog:catalog.spec}:{},fresh:character}));\n   await wait('Taking form');\n   await Reflect.apply(installLoading,runtime,[wait,controller.signal]);check();\n   const checkInstalled=()=>{check();if(!Reflect.apply(installedReady,runtime!,[]))throw Error('Native client start runtime is no longer ready');check();};\n   const result=Object.freeze({writer,runtime,provisional,prologue});\n   // Final publication adopts the new policy owner permanently; restoring a\n   // borrowed predecessor here would overwrite onReady's actual adoption.\n   writer.bindGlobalPolicies();\n   const ready=request.onReady;checkInstalled();if(ready)ready(result);checkInstalled();\n   if(!provisional&&!prologue)persistRun(account,writer);checkInstalled();\n   this.#current=result;return result;\n  }catch(error){if(runtime)Reflect.apply(retire,runtime,[]);throw error;}\n  finally{this.#busy=false;if(this.#controller===controller)this.#controller=undefined;}\n }\n\n begin(request:NativeClientStartRequest):NativeClientStarted|null {\n  if(this.#busy)throw Error('Native client start cannot reenter');this.#busy=true;const generation=++this.#generation,controller=this.#controller=new AbortController();\n  let runtime:NativeClientRuntime|undefined;"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeGeography.ts",
      "rawBeforeHash": "95f80056a0d998250867072edfd4f02b4cfcdaf1bede59a8ee7da72fd65581f9",
      "rawAfterHash": "66a0790c977965e0fb71e660ecf6b3737c95a9eef515147f0468ea22d786f68e",
      "beforeHash": "95f80056a0d998250867072edfd4f02b4cfcdaf1bede59a8ee7da72fd65581f9",
      "afterHash": "66a0790c977965e0fb71e660ecf6b3737c95a9eef515147f0468ea22d786f68e",
      "crlfLines": [],
      "hunks": [
        {
          "before": "/** Explicit saved mapping from durable physical addresses to one frozen native source.\n * This module does not select a face, activate a preset or alter historical country policy. */\nimport {address,cellInteger,floorDiv,validSpan,type MassAddress} from './address';\nimport type {MapCoord} from '../world/coords';\nimport {copyNativeGeographyData,createNativeGeographyReader,restoreNativeGeographySource,type NativeGeographyReader} from '../world/geographySource';\nimport {canonical,freezeData,massDigest,streamSeed} from './random';\nexport interface PositiveRatio {numerator:string;denominator:string}\nexport interface MassNativeMapping {\n schema:1;algorithm:'bigint-relative-native-map-v1';\n addressSpan:number;\n physicalOrigin:MassAddress;\n nativeOrigin:MapCoord;\n physicalUnitsPerNativeUnit:PositiveRatio;\n nativeDimension:string;\n /** Inclusive native coordinate envelope. Exact rational results are tested before rounding. */\n nativeBounds:{minX:number;minY:number;maxX:number;maxY:number};\n /** No clamping, wrapping, modulo, floating-origin reset or distant reroll. */\n outsideDomain:'refuse';\n rounding:'nearest-binary64-ties-even-once';\n}\nexport interface ExactFraction {n:bigint;d:bigint}\nconst abs=(v:bigint)=>v<0n?-v:v;\nexport function gcd(a:bigint,b:bigint):bigint {a=abs(a);b=abs(b);while(b){const r=a%b;a=b;b=r;}return a;}\nexport function fraction(n:bigint,d=1n):ExactFraction {if(d===0n)throw RangeError('Zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}\nfunction plus(a:ExactFraction,b:ExactFraction):ExactFraction{return fraction(a.n*b.d+b.n*a.d,a.d*b.d);}\nfunction minus(a:ExactFraction,b:ExactFraction):ExactFraction{return plus(a,{n:-b.n,d:b.d});}\n/** Every finite JavaScript offset/origin is an exact binary rational. */\nexport function exactNumber(value:number):ExactFraction {\n if(!Number.isFinite(value))throw RangeError('Mapping input must be finite');if(value===0)return {n:0n,d:1n};\n const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value,false);const bits=view.getBigUint64(0,false);\n const negative=(bits>>63n)!==0n,exp=Number((bits>>52n)&0x7ffn),mantissa=bits&((1n<<52n)-1n);\n const significand=exp?((1n<<52n)|mantissa):mantissa,power=(exp?exp-1023:-1022)-52;\n return fraction((negative?-1n:1n)*significand*(power>0?1n<<BigInt(power):1n),power<0?1n<<BigInt(-power):1n);\n}\nfunction roundInteger(n:bigint,d:bigint):bigint {const q=n/d,r=n%d;return r*2n>d||(r*2n===d&&(q&1n)===1n)?q+1n:q;}\n/** Correctly round the complete rational once, without Number(largeCell).\n * The rounded result need not be exact as a rational; the arithmetic before\n * this explicit native-number boundary is exact. */\nexport function nativeNumber(value:ExactFraction):number {\n if(value.d<=0n)throw RangeError('Invalid denominator');if(value.n===0n)return 0;\n const negative=value.n<0n,n=abs(value.n),d=value.d;\n let exponent=n.toString(2).length-d.toString(2).length;\n if(exponent>=0?(n<(d<<BigInt(exponent))):((n<<BigInt(-exponent))<d))exponent--;\n if(exponent>1023)throw RangeError('Outside finite native-number domain');\n let magnitude:number;\n if(exponent < -1022){const q=roundInteger(n<<1074n,d);magnitude=Number(q)*2**-1074;}\n else {const shift=52-exponent;let q=shift>=0?roundInteger(n<<BigInt(shift),d):roundInteger(n,d<<BigInt(-shift));\n  if(q===(1n<<53n)){q>>=1n;exponent++;}if(exponent>1023)throw RangeError('Outside finite native-number domain');\n  magnitude=Number(q)*2**(exponent-52);\n }\n if(!Number.isFinite(magnitude))throw RangeError('Outside finite native-number domain');\n return magnitude===0?0:negative?-magnitude:magnitude;\n}\nfunction positiveRatio(value:PositiveRatio):[bigint,bigint] {\n const valid=(s:string)=>typeof s==='string'&&s.length<=20&&/^[1-9][0-9]*$/.test(s);\n if(!valid(value.numerator)||!valid(value.denominator))throw RangeError('Scale needs canonical positive integer strings');\n const p=BigInt(value.numerator),q=BigInt(value.denominator),max=(1n<<63n)-1n;\n if(p>max||q>max||gcd(p,q)!==1n)throw RangeError('Scale must be reduced positive signed64 integers');return[p,q];\n}\nfunction canonicalAddress(at:MassAddress,span:number):void {\n if(!at||typeof at!=='object'||Object.keys(at).length!==5||Object.keys(at).some(k=>!['dimension','cx','cy','x','y'].includes(k)))throw Error('Mapping needs exact durable address fields');\n const canonical=address(at.dimension,at.cx,at.cy,at.x,at.y,span);\n if(canonical.cx!==at.cx||canonical.cy!==at.cy||canonical.x!==at.x||canonical.y!==at.y)throw RangeError('Mapping needs a normalized durable address');\n}\nexport function validateMapping(spec:MassNativeMapping):void {\n if(spec.schema!==1||spec.algorithm!=='bigint-relative-native-map-v1'||spec.outsideDomain!=='refuse'||spec.rounding!=='nearest-binary64-ties-even-once')throw Error('Unsupported mapping policy');\n validSpan(spec.addressSpan);canonicalAddress(spec.physicalOrigin,spec.addressSpan);positiveRatio(spec.physicalUnitsPerNativeUnit);\n exactNumber(spec.nativeOrigin.x);exactNumber(spec.nativeOrigin.y);\n if(!spec.nativeDimension||spec.nativeDimension.length>128)throw Error('Explicit native dimension required');\n const b=spec.nativeBounds;\n if(!b||![b.minX,b.minY,b.maxX,b.maxY].every(Number.isFinite)||b.minX>=b.maxX||b.minY>=b.maxY)throw RangeError('Invalid native mapping envelope');\n if(spec.nativeOrigin.x<b.minX||spec.nativeOrigin.x>b.maxX||spec.nativeOrigin.y<b.minY||spec.nativeOrigin.y>b.maxY)throw RangeError('Native origin lies outside mapping envelope');\n}\n/** No conversion of an absolute address or large relative cell delta to Number. */\nexport function exactMappedPoint(spec:MassNativeMapping,at:MassAddress):{x:ExactFraction;y:ExactFraction} {\n validateMapping(spec);canonicalAddress(at,spec.addressSpan);if(at.dimension!==spec.physicalOrigin.dimension)throw Error('No mapping recorded for this physical dimension');\n const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(cell:string,offset:number,originCell:string,originOffset:number,nativeOrigin:number)=>{\n  const whole=(cellInteger(cell)-cellInteger(originCell))*span;\n  const delta=plus({n:whole,d:1n},minus(exactNumber(offset),exactNumber(originOffset)));\n  return plus(exactNumber(nativeOrigin),fraction(delta.n*q,delta.d*p));\n };\n return {x:axis(at.cx,at.x,spec.physicalOrigin.cx,spec.physicalOrigin.x,spec.nativeOrigin.x),y:axis(at.cy,at.y,spec.physicalOrigin.cy,spec.physicalOrigin.y,spec.nativeOrigin.y)};\n}\nfunction within(value:ExactFraction,min:number,max:number):boolean {const lo=exactNumber(min),hi=exactNumber(max);return value.n*lo.d>=lo.n*value.d&&value.n*hi.d<=hi.n*value.d;}\nfunction inEnvelope(spec:MassNativeMapping,point:{x:ExactFraction;y:ExactFraction}):void {const b=spec.nativeBounds;if(!within(point.x,b.minX,b.maxX)||!within(point.y,b.minY,b.maxY))throw RangeError('Address lies outside recorded native mapping envelope');}\nexport function mappedPoint(spec:MassNativeMapping,at:MassAddress):MapCoord {const exact=exactMappedPoint(spec,at);inEnvelope(spec,exact);return {x:nativeNumber(exact.x),y:nativeNumber(exact.y)};}\n/** This returns local geometric truth only. Its biome and depth are not\n * a stable face/area selection context and never overwrite a saved mint. */\nexport function sampleMappedPoint(spec:MassNativeMapping,reader:NativeGeographyReader,at:MassAddress) {\n const native=mappedPoint(spec,at),dimension=spec.nativeDimension;\n const climate=reader.climateAt(native,dimension); // actual reader numeric-domain guard\n if(dimension==='surface'){const region=reader.regionWinner(native);return {native,dimension,biome:reader.biomeAt(native),depth:region.depth,region,climate,continent:reader.continentAt(native)};}\n return {native,dimension,biome:reader.dimensionBiomeAt(dimension,native),depth:reader.dimensionBiomeDepth(dimension,native),climate};\n}\n\n/** Atlas/locale source resolution can supply a different authoritative native\n * anchor. Inverse-map that anchor before mint; never recenter a chosen face\n * by sampling geography again after physical placement jitter. */\nexport function physicalAnchorForNative(spec:MassNativeMapping,native:MapCoord):MassAddress {\n validateMapping(spec);inEnvelope(spec,{x:exactNumber(native.x),y:exactNumber(native.y)});const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(value:number,nativeOrigin:number,originCell:string,originOffset:number):[string,number]=>{\n  const nativeDelta=minus(exactNumber(value),exactNumber(nativeOrigin));\n  const absolute=plus(plus({n:cellInteger(originCell)*span,d:1n},exactNumber(originOffset)),fraction(nativeDelta.n*p,nativeDelta.d*q));\n  const cell=floorDiv(absolute.n,absolute.d*span),offset=fraction(absolute.n-cell*absolute.d*span,absolute.d);\n  return [cell.toString(),nativeNumber(offset)];\n };\n const [cx,x]=axis(native.x,spec.nativeOrigin.x,spec.physicalOrigin.cx,spec.physicalOrigin.x);\n const [cy,y]=axis(native.y,spec.nativeOrigin.y,spec.physicalOrigin.cy,spec.physicalOrigin.y);\n const at=address(spec.physicalOrigin.dimension,cx,cy,x,y,spec.addressSpan),projected=mappedPoint(spec,at);\n // The inverse crosses a second binary64 boundary at the physical local offset.\n // Authoritative native mint coordinates must survive that boundary exactly;\n // a nearest physical encoding which changes the native input cannot be used.\n // Refuse without tolerance or silently moving/resampling the native anchor.\n if(projected.x!==native.x||projected.y!==native.y)throw RangeError('Physical anchor cannot preserve the authoritative native coordinate');\n return at;\n}\n\n/** A derived source anchor may need more precision than a raw physics offset.\n * This separate JSON value never masquerades as a MassAddress and does not\n * change the recorded mapping, its rounding policy, or authoritative native map. */\nexport interface MassNativeRationalOffset {readonly numerator:string;readonly denominator:string}\nexport interface MassNativeRationalAnchor {\n readonly schema:1;readonly policy:'mass-native-rational-anchor';\n readonly dimension:string;readonly cx:string;readonly cy:string;\n readonly x:MassNativeRationalOffset;readonly y:MassNativeRationalOffset;\n}\nexport type MassNativeSourceAnchor=MassAddress|MassNativeRationalAnchor;\nfunction rationalOffset(value:MassNativeRationalOffset,span:number):ExactFraction {\n if(!value||typeof value!=='object')throw Error('Missing exact source offset');\n exactKeys(value,['numerator','denominator'],'exact source offset');\n // Binary64 origins/targets and the signed64 ratio need at most 360 decimal\n // digits after reduction; reject unbounded serialized integers before BigInt.\n const valid=(s:string,zero:boolean)=>typeof s==='string'&&s.length<=400&&(zero?/^(0|[1-9][0-9]*)$/:/^[1-9][0-9]*$/).test(s);\n if(!valid(value.numerator,true)||!valid(value.denominator,false))throw Error('Exact source offset needs canonical integer strings');\n const n=BigInt(value.numerator),d=BigInt(value.denominator);\n if(gcd(n,d)!==1n||n>=d*BigInt(span))throw RangeError('Exact source offset must be reduced and within its cell');\n return {n,d};\n}\n/** Preserve all representable v1 addresses byte-for-byte. Only an inverse which\n * cannot survive its binary64 physical offset uses the separate exact schema. */\nexport function sourceAnchorForNative(spec:MassNativeMapping,native:MapCoord):MassNativeSourceAnchor {\n validateMapping(spec);inEnvelope(spec,{x:exactNumber(native.x),y:exactNumber(native.y)});\n const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(value:number,nativeOrigin:number,originCell:string,originOffset:number)=>{\n  const delta=minus(exactNumber(value),exactNumber(nativeOrigin));\n  const absolute=plus(plus({n:cellInteger(originCell)*span,d:1n},exactNumber(originOffset)),fraction(delta.n*p,delta.d*q));\n  const cell=floorDiv(absolute.n,absolute.d*span),offset=fraction(absolute.n-cell*absolute.d*span,absolute.d);\n  cellInteger(cell.toString());return {cell,offset};\n };\n const x=axis(native.x,spec.nativeOrigin.x,spec.physicalOrigin.cx,spec.physicalOrigin.x),y=axis(native.y,spec.nativeOrigin.y,spec.physicalOrigin.cy,spec.physicalOrigin.y);\n const rounded=(a:typeof x):readonly [string,number]|undefined=>{\n  const value=nativeNumber(a.offset);\n  if(value===spec.addressSpan){if(a.cell===(1n<<63n)-1n)return undefined;return [(a.cell+1n).toString(),0];}\n  return [a.cell.toString(),value];\n };\n const rx=rounded(x),ry=rounded(y);\n if(rx&&ry){\n  const at=address(spec.physicalOrigin.dimension,rx[0],ry[0],rx[1],ry[1],spec.addressSpan),point=exactMappedPoint(spec,at),b=spec.nativeBounds;\n  if(within(point.x,b.minX,b.maxX)&&within(point.y,b.minY,b.maxY)&&nativeNumber(point.x)===native.x&&nativeNumber(point.y)===native.y)return at;\n }\n const data=(value:ExactFraction):MassNativeRationalOffset=>({numerator:value.n.toString(),denominator:value.d.toString()});\n return {schema:1,policy:'mass-native-rational-anchor',dimension:spec.physicalOrigin.dimension,cx:x.cell.toString(),cy:y.cell.toString(),x:data(x.offset),y:data(y.offset)};\n}\n/** Explicit source-position projection. Raw physical point APIs remain strict.\n * A rational anchor is data, not a source ticket or physical admission. */\nexport function mappedSourceAnchor(spec:MassNativeMapping,at:MassNativeSourceAnchor):MapCoord {\n if(!at||typeof at!=='object')throw Error('Missing source anchor');\n if(!Object.hasOwn(at,'policy'))return mappedPoint(spec,at as MassAddress);\n validateMapping(spec);exactKeys(at,['schema','policy','dimension','cx','cy','x','y'],'exact source anchor');\n const exact=at as MassNativeRationalAnchor;\n if(exact.schema!==1||exact.policy!=='mass-native-rational-anchor'||exact.dimension!==spec.physicalOrigin.dimension)throw Error('Unsupported exact source anchor policy or dimension');\n const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(cell:string,offset:MassNativeRationalOffset,originCell:string,originOffset:number,nativeOrigin:number)=>{\n  const delta=plus({n:(cellInteger(cell)-cellInteger(originCell))*span,d:1n},minus(rationalOffset(offset,spec.addressSpan),exactNumber(originOffset)));\n  return plus(exactNumber(nativeOrigin),fraction(delta.n*q,delta.d*p));\n };\n const point={x:axis(exact.cx,exact.x,spec.physicalOrigin.cx,spec.physicalOrigin.x,spec.nativeOrigin.x),y:axis(exact.cy,exact.y,spec.physicalOrigin.cy,spec.physicalOrigin.y,spec.nativeOrigin.y)};\n inEnvelope(spec,point);return {x:nativeNumber(point.x),y:nativeNumber(point.y)};\n}\n\n/** New opt-in policy only. Exact native bytes are saved once as a string so\n * parent manifest canonicalization cannot sort the native source's own keys. */\nexport interface MassNativeGeographySpec {\n schema:1;policy:'mass-native-geography';version:1;\n sourceJson:string;\n /** Sampling checksum, not a unique identity. Exact sourceJson remains authoritative. */\n sourceHash:string;\n mapping:MassNativeMapping;\n mappingHash:string;\n mintNamespace:'mass-native-area-mint-v1';\n}\nexport interface MassNativeOwnerContext {\n schema:1;policy:'mass-native-geography';version:1;\n sourceHash:string;mappingHash:string;\n ownerId:string;canonicalAnchor:MassAddress;\n nativeDimension:string;requestedTarget:MapCoord;requestedSeed:number;\n}\n/** Receipt from the complete native atlas/topology resolver before face draws.\n * nativeId and resolvedOwnerId need not equal the original candidate identity. */\nexport interface MassNativeMintResolution {\n resolvedOwnerId:string;resolutionKey:string;nativeId:string;\n resolvedTarget:MapCoord;resolvedSeed:number;\n}\nexport interface MassNativeResolvedOwnerContext extends MassNativeMintResolution {\n schema:1;request:MassNativeOwnerContext;physicalAnchor:MassAddress;\n nativeDimension:string;sourceHash:string;mappingHash:string;\n}\nconst SPEC_KEYS=['schema','policy','version','sourceJson','sourceHash','mapping','mappingHash','mintNamespace'];\nconst MAPPING_KEYS=['schema','algorithm','addressSpan','physicalOrigin','nativeOrigin','physicalUnitsPerNativeUnit','nativeDimension','nativeBounds','outsideDomain','rounding'];\nfunction exactKeys(value:object,keys:readonly string[],label:string):void {const own=Object.keys(value);if(own.length!==keys.length||own.some(k=>!keys.includes(k)))throw Error('Invalid '+label+' shape');}\nfunction mappingShape(mapping:MassNativeMapping):void {\n if(!mapping||typeof mapping!=='object')throw Error('Missing native mapping');exactKeys(mapping,MAPPING_KEYS,'mapping');\n exactKeys(mapping.physicalOrigin,['dimension','cx','cy','x','y'],'physical origin');exactKeys(mapping.nativeOrigin,['x','y'],'native origin');\n exactKeys(mapping.physicalUnitsPerNativeUnit,['numerator','denominator'],'scale');exactKeys(mapping.nativeBounds,['minX','minY','maxX','maxY'],'native envelope');validateMapping(mapping);\n}\nfunction stableId(value:string,label:string):void {if(typeof value!=='string'||!value||value.length>4096)throw Error('Invalid '+label);}\nfunction uint32(value:number,label:string):void {if(!Number.isInteger(value)||value<0||value>0xffffffff)throw Error('Invalid '+label);}\nfunction mappingChecksum(mapping:MassNativeMapping):string{return massDigest({algorithm:'bigint-relative-native-map-v1',mapping});}\nfunction checkedSpec(input:MassNativeGeographySpec):MassNativeGeographySpec {\n const spec=copyNativeGeographyData(input);exactKeys(spec,SPEC_KEYS,'native geography spec');\n if(spec.schema!==1||spec.policy!=='mass-native-geography'||spec.version!==1||spec.mintNamespace!=='mass-native-area-mint-v1')throw Error('Unsupported native geography policy');\n if(typeof spec.sourceJson!=='string'||massDigest(spec.sourceJson)!==spec.sourceHash)throw Error('Native source checksum mismatch');\n mappingShape(spec.mapping);if(mappingChecksum(spec.mapping)!==spec.mappingHash)throw Error('Native mapping checksum mismatch');return spec;\n}\nexport function makeMassNativeGeographySpec(sourceJson:string,mapping:MassNativeMapping):Readonly<MassNativeGeographySpec> {\n const cleanMapping=copyNativeGeographyData(mapping);\n const spec:MassNativeGeographySpec={schema:1,policy:'mass-native-geography',version:1,sourceJson,sourceHash:massDigest(sourceJson),mapping:cleanMapping,mappingHash:mappingChecksum(cleanMapping),mintNamespace:'mass-native-area-mint-v1'};\n // Construct once to verify exact serialized native source and both origins.\n return new MassNativeGeography(spec).spec;\n}",
          "after": "/** Explicit saved mapping from durable physical addresses to one frozen native source.\n * This module does not select a face, activate a preset or alter historical country policy. */\nimport {nativeSourceDigest} from './nativeSourceDigest';\nimport {address,cellInteger,floorDiv,validSpan,type MassAddress} from './address';\nimport type {MapCoord} from '../world/coords';\nimport {copyNativeGeographyData,createNativeGeographyReader,restoreNativeGeographySource,type NativeGeographyReader} from '../world/geographySource';\nimport {canonical,freezeData,massDigest,streamSeed} from './random';\nexport interface PositiveRatio {numerator:string;denominator:string}\nexport interface MassNativeMapping {\n schema:1;algorithm:'bigint-relative-native-map-v1';\n addressSpan:number;\n physicalOrigin:MassAddress;\n nativeOrigin:MapCoord;\n physicalUnitsPerNativeUnit:PositiveRatio;\n nativeDimension:string;\n /** Inclusive native coordinate envelope. Exact rational results are tested before rounding. */\n nativeBounds:{minX:number;minY:number;maxX:number;maxY:number};\n /** No clamping, wrapping, modulo, floating-origin reset or distant reroll. */\n outsideDomain:'refuse';\n rounding:'nearest-binary64-ties-even-once';\n}\nexport interface ExactFraction {n:bigint;d:bigint}\nconst abs=(v:bigint)=>v<0n?-v:v;\nexport function gcd(a:bigint,b:bigint):bigint {a=abs(a);b=abs(b);while(b){const r=a%b;a=b;b=r;}return a;}\nexport function fraction(n:bigint,d=1n):ExactFraction {if(d===0n)throw RangeError('Zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}\nfunction plus(a:ExactFraction,b:ExactFraction):ExactFraction{return fraction(a.n*b.d+b.n*a.d,a.d*b.d);}\nfunction minus(a:ExactFraction,b:ExactFraction):ExactFraction{return plus(a,{n:-b.n,d:b.d});}\n/** Every finite JavaScript offset/origin is an exact binary rational. */\nexport function exactNumber(value:number):ExactFraction {\n if(!Number.isFinite(value))throw RangeError('Mapping input must be finite');if(value===0)return {n:0n,d:1n};\n const view=new DataView(new ArrayBuffer(8));view.setFloat64(0,value,false);const bits=view.getBigUint64(0,false);\n const negative=(bits>>63n)!==0n,exp=Number((bits>>52n)&0x7ffn),mantissa=bits&((1n<<52n)-1n);\n const significand=exp?((1n<<52n)|mantissa):mantissa,power=(exp?exp-1023:-1022)-52;\n return fraction((negative?-1n:1n)*significand*(power>0?1n<<BigInt(power):1n),power<0?1n<<BigInt(-power):1n);\n}\nfunction roundInteger(n:bigint,d:bigint):bigint {const q=n/d,r=n%d;return r*2n>d||(r*2n===d&&(q&1n)===1n)?q+1n:q;}\n/** Correctly round the complete rational once, without Number(largeCell).\n * The rounded result need not be exact as a rational; the arithmetic before\n * this explicit native-number boundary is exact. */\nexport function nativeNumber(value:ExactFraction):number {\n if(value.d<=0n)throw RangeError('Invalid denominator');if(value.n===0n)return 0;\n const negative=value.n<0n,n=abs(value.n),d=value.d;\n let exponent=n.toString(2).length-d.toString(2).length;\n if(exponent>=0?(n<(d<<BigInt(exponent))):((n<<BigInt(-exponent))<d))exponent--;\n if(exponent>1023)throw RangeError('Outside finite native-number domain');\n let magnitude:number;\n if(exponent < -1022){const q=roundInteger(n<<1074n,d);magnitude=Number(q)*2**-1074;}\n else {const shift=52-exponent;let q=shift>=0?roundInteger(n<<BigInt(shift),d):roundInteger(n,d<<BigInt(-shift));\n  if(q===(1n<<53n)){q>>=1n;exponent++;}if(exponent>1023)throw RangeError('Outside finite native-number domain');\n  magnitude=Number(q)*2**(exponent-52);\n }\n if(!Number.isFinite(magnitude))throw RangeError('Outside finite native-number domain');\n return magnitude===0?0:negative?-magnitude:magnitude;\n}\nfunction positiveRatio(value:PositiveRatio):[bigint,bigint] {\n const valid=(s:string)=>typeof s==='string'&&s.length<=20&&/^[1-9][0-9]*$/.test(s);\n if(!valid(value.numerator)||!valid(value.denominator))throw RangeError('Scale needs canonical positive integer strings');\n const p=BigInt(value.numerator),q=BigInt(value.denominator),max=(1n<<63n)-1n;\n if(p>max||q>max||gcd(p,q)!==1n)throw RangeError('Scale must be reduced positive signed64 integers');return[p,q];\n}\nfunction canonicalAddress(at:MassAddress,span:number):void {\n if(!at||typeof at!=='object'||Object.keys(at).length!==5||Object.keys(at).some(k=>!['dimension','cx','cy','x','y'].includes(k)))throw Error('Mapping needs exact durable address fields');\n const canonical=address(at.dimension,at.cx,at.cy,at.x,at.y,span);\n if(canonical.cx!==at.cx||canonical.cy!==at.cy||canonical.x!==at.x||canonical.y!==at.y)throw RangeError('Mapping needs a normalized durable address');\n}\nexport function validateMapping(spec:MassNativeMapping):void {\n if(spec.schema!==1||spec.algorithm!=='bigint-relative-native-map-v1'||spec.outsideDomain!=='refuse'||spec.rounding!=='nearest-binary64-ties-even-once')throw Error('Unsupported mapping policy');\n validSpan(spec.addressSpan);canonicalAddress(spec.physicalOrigin,spec.addressSpan);positiveRatio(spec.physicalUnitsPerNativeUnit);\n exactNumber(spec.nativeOrigin.x);exactNumber(spec.nativeOrigin.y);\n if(!spec.nativeDimension||spec.nativeDimension.length>128)throw Error('Explicit native dimension required');\n const b=spec.nativeBounds;\n if(!b||![b.minX,b.minY,b.maxX,b.maxY].every(Number.isFinite)||b.minX>=b.maxX||b.minY>=b.maxY)throw RangeError('Invalid native mapping envelope');\n if(spec.nativeOrigin.x<b.minX||spec.nativeOrigin.x>b.maxX||spec.nativeOrigin.y<b.minY||spec.nativeOrigin.y>b.maxY)throw RangeError('Native origin lies outside mapping envelope');\n}\n/** No conversion of an absolute address or large relative cell delta to Number. */\nexport function exactMappedPoint(spec:MassNativeMapping,at:MassAddress):{x:ExactFraction;y:ExactFraction} {\n validateMapping(spec);canonicalAddress(at,spec.addressSpan);if(at.dimension!==spec.physicalOrigin.dimension)throw Error('No mapping recorded for this physical dimension');\n const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(cell:string,offset:number,originCell:string,originOffset:number,nativeOrigin:number)=>{\n  const whole=(cellInteger(cell)-cellInteger(originCell))*span;\n  const delta=plus({n:whole,d:1n},minus(exactNumber(offset),exactNumber(originOffset)));\n  return plus(exactNumber(nativeOrigin),fraction(delta.n*q,delta.d*p));\n };\n return {x:axis(at.cx,at.x,spec.physicalOrigin.cx,spec.physicalOrigin.x,spec.nativeOrigin.x),y:axis(at.cy,at.y,spec.physicalOrigin.cy,spec.physicalOrigin.y,spec.nativeOrigin.y)};\n}\nfunction within(value:ExactFraction,min:number,max:number):boolean {const lo=exactNumber(min),hi=exactNumber(max);return value.n*lo.d>=lo.n*value.d&&value.n*hi.d<=hi.n*value.d;}\nfunction inEnvelope(spec:MassNativeMapping,point:{x:ExactFraction;y:ExactFraction}):void {const b=spec.nativeBounds;if(!within(point.x,b.minX,b.maxX)||!within(point.y,b.minY,b.maxY))throw RangeError('Address lies outside recorded native mapping envelope');}\nexport function mappedPoint(spec:MassNativeMapping,at:MassAddress):MapCoord {const exact=exactMappedPoint(spec,at);inEnvelope(spec,exact);return {x:nativeNumber(exact.x),y:nativeNumber(exact.y)};}\n/** This returns local geometric truth only. Its biome and depth are not\n * a stable face/area selection context and never overwrite a saved mint. */\nexport function sampleMappedPoint(spec:MassNativeMapping,reader:NativeGeographyReader,at:MassAddress) {\n const native=mappedPoint(spec,at),dimension=spec.nativeDimension;\n const climate=reader.climateAt(native,dimension); // actual reader numeric-domain guard\n if(dimension==='surface'){const region=reader.regionWinner(native);return {native,dimension,biome:reader.biomeAt(native),depth:region.depth,region,climate,continent:reader.continentAt(native)};}\n return {native,dimension,biome:reader.dimensionBiomeAt(dimension,native),depth:reader.dimensionBiomeDepth(dimension,native),climate};\n}\n\n/** Atlas/locale source resolution can supply a different authoritative native\n * anchor. Inverse-map that anchor before mint; never recenter a chosen face\n * by sampling geography again after physical placement jitter. */\nexport function physicalAnchorForNative(spec:MassNativeMapping,native:MapCoord):MassAddress {\n validateMapping(spec);inEnvelope(spec,{x:exactNumber(native.x),y:exactNumber(native.y)});const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(value:number,nativeOrigin:number,originCell:string,originOffset:number):[string,number]=>{\n  const nativeDelta=minus(exactNumber(value),exactNumber(nativeOrigin));\n  const absolute=plus(plus({n:cellInteger(originCell)*span,d:1n},exactNumber(originOffset)),fraction(nativeDelta.n*p,nativeDelta.d*q));\n  const cell=floorDiv(absolute.n,absolute.d*span),offset=fraction(absolute.n-cell*absolute.d*span,absolute.d);\n  return [cell.toString(),nativeNumber(offset)];\n };\n const [cx,x]=axis(native.x,spec.nativeOrigin.x,spec.physicalOrigin.cx,spec.physicalOrigin.x);\n const [cy,y]=axis(native.y,spec.nativeOrigin.y,spec.physicalOrigin.cy,spec.physicalOrigin.y);\n const at=address(spec.physicalOrigin.dimension,cx,cy,x,y,spec.addressSpan),projected=mappedPoint(spec,at);\n // The inverse crosses a second binary64 boundary at the physical local offset.\n // Authoritative native mint coordinates must survive that boundary exactly;\n // a nearest physical encoding which changes the native input cannot be used.\n // Refuse without tolerance or silently moving/resampling the native anchor.\n if(projected.x!==native.x||projected.y!==native.y)throw RangeError('Physical anchor cannot preserve the authoritative native coordinate');\n return at;\n}\n\n/** A derived source anchor may need more precision than a raw physics offset.\n * This separate JSON value never masquerades as a MassAddress and does not\n * change the recorded mapping, its rounding policy, or authoritative native map. */\nexport interface MassNativeRationalOffset {readonly numerator:string;readonly denominator:string}\nexport interface MassNativeRationalAnchor {\n readonly schema:1;readonly policy:'mass-native-rational-anchor';\n readonly dimension:string;readonly cx:string;readonly cy:string;\n readonly x:MassNativeRationalOffset;readonly y:MassNativeRationalOffset;\n}\nexport type MassNativeSourceAnchor=MassAddress|MassNativeRationalAnchor;\nfunction rationalOffset(value:MassNativeRationalOffset,span:number):ExactFraction {\n if(!value||typeof value!=='object')throw Error('Missing exact source offset');\n exactKeys(value,['numerator','denominator'],'exact source offset');\n // Binary64 origins/targets and the signed64 ratio need at most 360 decimal\n // digits after reduction; reject unbounded serialized integers before BigInt.\n const valid=(s:string,zero:boolean)=>typeof s==='string'&&s.length<=400&&(zero?/^(0|[1-9][0-9]*)$/:/^[1-9][0-9]*$/).test(s);\n if(!valid(value.numerator,true)||!valid(value.denominator,false))throw Error('Exact source offset needs canonical integer strings');\n const n=BigInt(value.numerator),d=BigInt(value.denominator);\n if(gcd(n,d)!==1n||n>=d*BigInt(span))throw RangeError('Exact source offset must be reduced and within its cell');\n return {n,d};\n}\n/** Preserve all representable v1 addresses byte-for-byte. Only an inverse which\n * cannot survive its binary64 physical offset uses the separate exact schema. */\nexport function sourceAnchorForNative(spec:MassNativeMapping,native:MapCoord):MassNativeSourceAnchor {\n validateMapping(spec);inEnvelope(spec,{x:exactNumber(native.x),y:exactNumber(native.y)});\n const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(value:number,nativeOrigin:number,originCell:string,originOffset:number)=>{\n  const delta=minus(exactNumber(value),exactNumber(nativeOrigin));\n  const absolute=plus(plus({n:cellInteger(originCell)*span,d:1n},exactNumber(originOffset)),fraction(delta.n*p,delta.d*q));\n  const cell=floorDiv(absolute.n,absolute.d*span),offset=fraction(absolute.n-cell*absolute.d*span,absolute.d);\n  cellInteger(cell.toString());return {cell,offset};\n };\n const x=axis(native.x,spec.nativeOrigin.x,spec.physicalOrigin.cx,spec.physicalOrigin.x),y=axis(native.y,spec.nativeOrigin.y,spec.physicalOrigin.cy,spec.physicalOrigin.y);\n const rounded=(a:typeof x):readonly [string,number]|undefined=>{\n  const value=nativeNumber(a.offset);\n  if(value===spec.addressSpan){if(a.cell===(1n<<63n)-1n)return undefined;return [(a.cell+1n).toString(),0];}\n  return [a.cell.toString(),value];\n };\n const rx=rounded(x),ry=rounded(y);\n if(rx&&ry){\n  const at=address(spec.physicalOrigin.dimension,rx[0],ry[0],rx[1],ry[1],spec.addressSpan),point=exactMappedPoint(spec,at),b=spec.nativeBounds;\n  if(within(point.x,b.minX,b.maxX)&&within(point.y,b.minY,b.maxY)&&nativeNumber(point.x)===native.x&&nativeNumber(point.y)===native.y)return at;\n }\n const data=(value:ExactFraction):MassNativeRationalOffset=>({numerator:value.n.toString(),denominator:value.d.toString()});\n return {schema:1,policy:'mass-native-rational-anchor',dimension:spec.physicalOrigin.dimension,cx:x.cell.toString(),cy:y.cell.toString(),x:data(x.offset),y:data(y.offset)};\n}\n/** Explicit source-position projection. Raw physical point APIs remain strict.\n * A rational anchor is data, not a source ticket or physical admission. */\nexport function mappedSourceAnchor(spec:MassNativeMapping,at:MassNativeSourceAnchor):MapCoord {\n if(!at||typeof at!=='object')throw Error('Missing source anchor');\n if(!Object.hasOwn(at,'policy'))return mappedPoint(spec,at as MassAddress);\n validateMapping(spec);exactKeys(at,['schema','policy','dimension','cx','cy','x','y'],'exact source anchor');\n const exact=at as MassNativeRationalAnchor;\n if(exact.schema!==1||exact.policy!=='mass-native-rational-anchor'||exact.dimension!==spec.physicalOrigin.dimension)throw Error('Unsupported exact source anchor policy or dimension');\n const [p,q]=positiveRatio(spec.physicalUnitsPerNativeUnit),span=BigInt(spec.addressSpan);\n const axis=(cell:string,offset:MassNativeRationalOffset,originCell:string,originOffset:number,nativeOrigin:number)=>{\n  const delta=plus({n:(cellInteger(cell)-cellInteger(originCell))*span,d:1n},minus(rationalOffset(offset,spec.addressSpan),exactNumber(originOffset)));\n  return plus(exactNumber(nativeOrigin),fraction(delta.n*q,delta.d*p));\n };\n const point={x:axis(exact.cx,exact.x,spec.physicalOrigin.cx,spec.physicalOrigin.x,spec.nativeOrigin.x),y:axis(exact.cy,exact.y,spec.physicalOrigin.cy,spec.physicalOrigin.y,spec.nativeOrigin.y)};\n inEnvelope(spec,point);return {x:nativeNumber(point.x),y:nativeNumber(point.y)};\n}\n\n/** New opt-in policy only. Exact native bytes are saved once as a string so\n * parent manifest canonicalization cannot sort the native source's own keys. */\nexport interface MassNativeGeographySpec {\n schema:1;policy:'mass-native-geography';version:1;\n sourceJson:string;\n /** Sampling checksum, not a unique identity. Exact sourceJson remains authoritative. */\n sourceHash:string;\n mapping:MassNativeMapping;\n mappingHash:string;\n mintNamespace:'mass-native-area-mint-v1';\n}\nexport interface MassNativeOwnerContext {\n schema:1;policy:'mass-native-geography';version:1;\n sourceHash:string;mappingHash:string;\n ownerId:string;canonicalAnchor:MassAddress;\n nativeDimension:string;requestedTarget:MapCoord;requestedSeed:number;\n}\n/** Receipt from the complete native atlas/topology resolver before face draws.\n * nativeId and resolvedOwnerId need not equal the original candidate identity. */\nexport interface MassNativeMintResolution {\n resolvedOwnerId:string;resolutionKey:string;nativeId:string;\n resolvedTarget:MapCoord;resolvedSeed:number;\n}\nexport interface MassNativeResolvedOwnerContext extends MassNativeMintResolution {\n schema:1;request:MassNativeOwnerContext;physicalAnchor:MassAddress;\n nativeDimension:string;sourceHash:string;mappingHash:string;\n}\nconst SPEC_KEYS=['schema','policy','version','sourceJson','sourceHash','mapping','mappingHash','mintNamespace'];\nconst MAPPING_KEYS=['schema','algorithm','addressSpan','physicalOrigin','nativeOrigin','physicalUnitsPerNativeUnit','nativeDimension','nativeBounds','outsideDomain','rounding'];\nfunction exactKeys(value:object,keys:readonly string[],label:string):void {const own=Object.keys(value);if(own.length!==keys.length||own.some(k=>!keys.includes(k)))throw Error('Invalid '+label+' shape');}\nfunction mappingShape(mapping:MassNativeMapping):void {\n if(!mapping||typeof mapping!=='object')throw Error('Missing native mapping');exactKeys(mapping,MAPPING_KEYS,'mapping');\n exactKeys(mapping.physicalOrigin,['dimension','cx','cy','x','y'],'physical origin');exactKeys(mapping.nativeOrigin,['x','y'],'native origin');\n exactKeys(mapping.physicalUnitsPerNativeUnit,['numerator','denominator'],'scale');exactKeys(mapping.nativeBounds,['minX','minY','maxX','maxY'],'native envelope');validateMapping(mapping);\n}\nfunction stableId(value:string,label:string):void {if(typeof value!=='string'||!value||value.length>4096)throw Error('Invalid '+label);}\nfunction uint32(value:number,label:string):void {if(!Number.isInteger(value)||value<0||value>0xffffffff)throw Error('Invalid '+label);}\nfunction mappingChecksum(mapping:MassNativeMapping):string{return massDigest({algorithm:'bigint-relative-native-map-v1',mapping});}\nfunction checkedSpec(input:MassNativeGeographySpec):MassNativeGeographySpec {\n const spec=copyNativeGeographyData(input);exactKeys(spec,SPEC_KEYS,'native geography spec');\n if(spec.schema!==1||spec.policy!=='mass-native-geography'||spec.version!==1||spec.mintNamespace!=='mass-native-area-mint-v1')throw Error('Unsupported native geography policy');\n if(typeof spec.sourceJson!=='string'||nativeSourceDigest(spec.sourceJson)!==spec.sourceHash)throw Error('Native source checksum mismatch');\n mappingShape(spec.mapping);if(mappingChecksum(spec.mapping)!==spec.mappingHash)throw Error('Native mapping checksum mismatch');return spec;\n}\nexport function makeMassNativeGeographySpec(sourceJson:string,mapping:MassNativeMapping):Readonly<MassNativeGeographySpec> {\n const cleanMapping=copyNativeGeographyData(mapping);\n const spec:MassNativeGeographySpec={schema:1,policy:'mass-native-geography',version:1,sourceJson,sourceHash:nativeSourceDigest(sourceJson),mapping:cleanMapping,mappingHash:mappingChecksum(cleanMapping),mintNamespace:'mass-native-area-mint-v1'};\n // Construct once to verify exact serialized native source and both origins.\n return new MassNativeGeography(spec).spec;\n}"
        }
      ]
    },
    {
      "file": "balance/nativeSeamlessConsolidationFixture.ts",
      "rawBeforeHash": "6ea704179f6a2a8a4ee678a6d812f7b1f486f3db03f7e0ad2e3a7c530725dc8d",
      "rawAfterHash": "011fffd681dd578c53003d314b0e5fef59319db756ec61a2b57b1bb75551ace1",
      "beforeHash": "35bbd920671891369b1e1941437ae82212eb27c2de827008f12156f113155d65",
      "afterHash": "ab5ee89945d3496711e17adf371964dfdd41102439f4d29e63a7e6a1cffbed5e",
      "crlfLines": [
        40
      ],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeLoadingResponsivenessFS';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';"
        }
      ]
    },
    {
      "file": "balance/check_seamlessconsolidationsource.ts",
      "rawBeforeHash": "126bccab55703e7b46776fa78f83ee40d378f7c67c0c0c8cbc47454ad3cd9c59",
      "rawAfterHash": "e38138176fe62976cff6c6fb42d92f56e762042a4ece8a2c62d0cb9366aab8d9",
      "beforeHash": "a70b97b4b42770f91355b227fbb44545931877a53a85f3ab5bd8e1527c011eab",
      "afterHash": "bcfd5a7a521f7d50dbe230924249438959c3d2ea58e4c7029d9f6e151a66f402",
      "crlfLines": [
        53
      ],
      "hunks": [
        {
          "before": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';",
          "after": "import assert from 'node:assert/strict';\nimport * as fs from './nativeLoadingResponsivenessFS';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';"
        }
      ]
    },
    {
      "file": "src/worldmass/nativeAreaScenePreparation.ts",
      "rawBeforeHash": "7b154527e1334a0fa86ece835d12aba9441f1460163fc32f19c7f348cfca0269",
      "rawAfterHash": "a3f5fea49639570b974dc416b8f70cbd3929a871e1b903465db5b79a4957e6fb",
      "beforeHash": "7b154527e1334a0fa86ece835d12aba9441f1460163fc32f19c7f348cfca0269",
      "afterHash": "b4b9217c032f1a665ccb46c40b55e89a1f0dbf1b4c83656d18576d4ea6099f6c",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {nativeGroundCoordinatorCalls} from './nativeOdysseyGroundRegistration';\nimport {makeNativeAreaArena} from '../engine/nativeAreaArena';\nimport {hullOf} from '../world/shape';\nimport {assertNativeCharacterResume,type NativeCharacterResumeReceipt,type NativeAreaCharacterResume} from './nativeAreaCharacterResume';\nimport {assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';\nimport {foldNativeTownStations} from './nativeAreaTownStations';\nimport {START_ZONE} from '../data/zones';\n/** Concrete native source preparation. A prepared area has no physical runtime authority. */\nimport {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';\nimport {vec} from '../core/math';\nimport type {Actor} from '../engine/actor';\nimport {LEDGER_ZONES_EXPLORED} from '../meta/account';\nimport {sceneCampaignOceanBearing,sceneCampaignSeaNameOf} from '../engine/nativeSceneCampaignQueries';\nimport {NativeAreaCampaignSession,isNativeAreaCampaignSession} from './nativeAreaCampaignSession';\nimport {NativeAreaSceneTransitionCoordinator,isNativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';\nimport {NativeAreaSceneOngoing,freshAreaOngoingState,type NativeAreaOngoingRuntime,type NativeAreaOngoingInput} from './nativeAreaSceneOngoing';\nimport {NativeAreaActorAuthority} from './nativeAreaActorAuthority';\nimport {NativeAreaMaddenLedger,assertNativeMaddenLedger} from './nativeAreaMaddenLedger';\nimport {NativeAreaSceneMemory} from './nativeAreaSceneMemory';\nimport {MassNativeGeography} from './nativeGeography';\nimport {NativeGeographyCatalog} from './nativeGeographyCatalog';\nimport {installedNativeAreaSources,installedNativeAreaConfig} from './nativeAreaInstalledSources';\nexport interface NativeAreaPreparationInput {session:NativeAreaCampaignSession;coordinator:NativeAreaSceneTransitionCoordinator;authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;maddenLedger:NativeAreaMaddenLedger;catalog?:NativeGeographyCatalog}\nconst preparations=new WeakSet<object>();\nexport function isNativeAreaScenePreparation(value:unknown):value is NativeAreaScenePreparation{return !!value&&typeof value==='object'&&preparations.has(value);}\nexport class NativeAreaScenePreparation {\n readonly #prepareRealm:(area:NativeAreaSceneOngoing)=>void;\n #resumeOwner:NativeAreaCharacterResume|undefined;\n setProvisionalRestore(token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'graph');if(r.preparation!==this||this.#resumeOwner)throw Error('Native preparer already has a restore owner');this.#resumeOwner=r.owner;}\n finishProvisionalRestore(source:NativeAreaSceneOngoing,token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'arrival');if(r.preparation!==this||r.area!==source)throw Error('Foreign provisional restore completion');this.input.coordinator.assertProvisionalRestoreSource(r.owner,source);if(this.#areas.get(source.assembly.input.scene.zone.id)===source)this.#areas.delete(source.assembly.input.scene.zone.id);this.#geography.delete(source);}\n readonly input:Readonly<NativeAreaPreparationInput>;readonly #areas=new Map<string,NativeAreaSceneOngoing>();readonly #geography=new WeakMap<NativeAreaSceneOngoing,MassNativeGeography>();\n constructor(raw:NativeAreaPreparationInput){\n  const {session,coordinator,authority,maddenLedger}=raw;if(!isNativeAreaCampaignSession(session)||!isNativeAreaSceneTransitionCoordinator(coordinator)||coordinator.input.campaign!==session.campaign||coordinator.input.characterWriter!==session.writer||coordinator.input.authority!==authority||authority.campaign!==session.campaign)throw Error('Native preparation needs actual shared campaign roots');\n  assertNativeRetainedMassState(session.writer);assertNativeMaddenLedger(maddenLedger,session.campaign,authority);const catalogSlot=Object.getOwnPropertyDescriptor(raw,'catalog');if(catalogSlot&&!Object.hasOwn(catalogSlot,'value'))throw Error('Native preparation catalog needs actual data');const catalog=catalogSlot?.value as NativeGeographyCatalog|undefined;if(catalog!==undefined){if(!(catalog instanceof NativeGeographyCatalog)||catalog.initial.seed!==session.writer.manifest.seed)throw Error('Native preparation catalog belongs to another campaign');}this.input=Object.freeze({session,coordinator,authority,maddenLedger,...catalog?{catalog}:{}});Object.defineProperty(this,'input',{writable:false,configurable:false});preparations.add(this);this.#prepareRealm=coordinator.attachPreparation(this);\n }\n assertVoyagePreparation(area:NativeAreaSceneOngoing):void {if(this.#areas.get(area.assembly.input.scene.zone.id)!==area||!this.#geography.has(area))throw Error('Native voyage needs its actual prepared owner');}\n releaseVoyage(area:NativeAreaSceneOngoing):void {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertVoyageRetirement,this.input.coordinator,[area]);if(this.#areas.get(area.assembly.input.scene.zone.id)!==area)throw Error('Native voyage preparation owner changed');this.#areas.delete(area.assembly.input.scene.zone.id);this.#geography.delete(area);}\n releaseGround(area:NativeAreaSceneOngoing):void {nativeGroundCoordinatorCalls(this.input.coordinator).areaRetirement(area);if(this.#areas.get(area.assembly.input.scene.zone.id)!==area)throw Error('Native ground preparation owner changed');this.#areas.delete(area.assembly.input.scene.zone.id);this.#geography.delete(area);}\n /** Close preparation, including a failed destination never registered for play. */\n retire():readonly NativeAreaSceneOngoing[]{const areas=Object.freeze([...this.#areas.values()]);this.#areas.clear();return areas;}\n /** Select only an actual campaign definition and recorded geography. No callback\n  * can substitute a prebirthed scene, area, population, or landing coordinate. */\n prepare(zoneId:string,geography:MassNativeGeography,from?:string,representative?:Actor):NativeAreaSceneOngoing {\n  const {session}=this.input,campaign=session.campaign,writer=session.writer;assertNativeRetainedMassState(writer);\n  const definition=campaign.zoneMap[zoneId]??campaign.caveMap[zoneId];if(!definition||definition.id!==zoneId||this.#areas.has(zoneId)||!(geography instanceof MassNativeGeography))throw Error('Native preparation needs one actual unresolved area');\n  if(this.input.catalog){const selected=this.input.catalog.select(definition.dimension??'surface');selected.assertCompatible(geography.spec);geography=selected;}\n  if(zoneId===START_ZONE){writer['townLayoutChangedOnLoad']=false;foldNativeTownStations(writer);}\n  const player=representative??campaign.localSeat.actor;\n  const area=this.#construct(zoneId,geography,from,player);this.#layout(area,geography);return area;\n }\n #construct(zoneId:string,geography:MassNativeGeography,from:string|undefined,player:Actor,characterConstruction?:NativeCharacterCreationReceipt):NativeAreaSceneOngoing {\n  const {session,coordinator,authority,maddenLedger}=this.input,campaign=session.campaign,writer=session.writer,definition=campaign.zoneMap[zoneId]??campaign.caveMap[zoneId];\n  if(this.input.catalog){const selected=this.input.catalog.select(definition.dimension??'surface');selected.assertCompatible(geography.spec);geography=selected;}\n  const services:NativeAreaOngoingInput['services']={\n   geometry:{get seasSeen(){return writer['seasSeen'];},oceanBearing:at=>sceneCampaignOceanBearing(campaign,at),seaNameOf:z=>sceneCampaignSeaNameOf(campaign,z),get notice(){return campaign.notice;},get seatOf(){return campaign.seatOf;}},\n   residents:{get clientActionHook(){return campaign.clientActionHook;}},timeflow:campaign.timeflow,\n   ecology:{get throngClaimed(){return writer.throngClaimed;}},theater:{get notice(){return campaign.notice;}},\n   history:{get notice(){return campaign.notice;},get events(){return writer.events;}},\n  };\n  const carry={inCave:!campaign.zoneMap[zoneId],entryFrom:from??null,voyage:null,charBorn:writer['charBorn'],charRegrowAcc:writer['charRegrowAcc'],townTierIdx:writer['townTierIdx']};\n  const area=new NativeAreaSceneOngoing({definition,player,initialActors:characterConstruction?writer.actors:[player],characterConstruction,campaign,sources:installedNativeAreaSources(campaign),services,carry,config:installedNativeAreaConfig(),...freshAreaOngoingState(campaign.time),authority,maddenLedger,coordinator,characterWriter:writer});\n  area.combat.runtimeState.frame.townLayoutChangedOnLoad=zoneId===START_ZONE&&writer['townLayoutChangedOnLoad'];\n  this.#areas.set(zoneId,area);this.#geography.set(area,geography);\n  this.#prepareRealm(area);\n  return area;\n }\n #layout(area:NativeAreaSceneOngoing,geography:MassNativeGeography):void {\n  const {session}=this.input,campaign=session.campaign,definition=area.assembly.input.scene.zone,zoneId=definition.id,carry=area.assembly.transition;\n  session.duringPreparation(area,()=>{\n   const source=area.assembly.sourceSession(geography),ticket=source.issue(zoneId),firstVisit=!carry.inCave&&!campaign.visited.has(zoneId);\n   // Exact visit/deed/concealment statements at the original pre-layout point.\n   // Existing retained-area controller/realm handoff is a separate operation.\n   if(!carry.inCave){campaign.visited.add(zoneId);if(firstVisit&&area.assembly.objectiveController.metaProgressionActive()){campaign.account.ledger[LEDGER_ZONES_EXPLORED]=(campaign.account.ledger[LEDGER_ZONES_EXPLORED]??0)+1;campaign.accountDirty=true;}if(definition.concealed)definition.concealed=false;if(definition.veiled)definition.veiled=false;}\n   Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.prepareVoyageSurface,this.input.coordinator,[area]);\n   area.assembly.prepare(source,ticket,vec(definition.size.w/2,definition.size.h/2),firstVisit);\n  });\n }\n constructInitialCharacter(token:NativeCharacterCreationReceipt,zoneId:string,geography:MassNativeGeography):NativeAreaSceneOngoing {const r=assertNativeCharacterReceipt(token,'construct');if(r.preparation!==this||this.#areas.size||zoneId!==r.writer.zoneMap[zoneId]?.id||geography.seed!==r.writer.manifest.seed)throw Error('Native character needs its exact unprepared first area');return this.#construct(zoneId,geography,undefined,r.seat.actor,token);}\n prepareInitialCharacter(token:NativeCharacterCreationReceipt):void {const r=assertNativeCharacterReceipt(token,'birth'),area=r.area;if(r.preparation!==this||!area||this.#areas.get(area.assembly.input.scene.zone.id)!==area||area.assembly.phase!=='fresh')throw Error('Native character preparation differs');\n  // The original load follows party/join; account rewards acquired there belong in this first layout.\n  r.writer['townLayoutChangedOnLoad']=false;foldNativeTownStations(r.writer);assertNativeCharacterReceipt(token,'birth');\n  const {geometry,settlement,scene}=area.assembly.input;geometry.arena=makeNativeAreaArena(scene.zone);geometry.arenaHull=hullOf(geometry.arena);\n  settlement.input.state.townTierIdx=r.writer['townTierIdx'];area.combat.runtimeState.frame.townLayoutChangedOnLoad=r.writer['townLayoutChangedOnLoad'];\n  area.assembly.scenePresence.includeInitialCharacter(token);area.assembly.input.population.includeInitialCharacter(token);r.writer.zone=area.assembly.input.scene.zone;r.writer.zoneEnteredAt=r.writer.time;r.writer.arena=area.assembly.input.geometry.arena;this.#layout(area,this.#geography.get(area)!);}\n\n /** The coordinator selects this same source's recorded geography. Preparation\n  * returns its exact real area; no caller supplies a prebirthed destination. */",
          "after": "import {nativeGroundCoordinatorCalls} from './nativeOdysseyGroundRegistration';\nimport type {NativeAreaSource,NativeAreaSourceSession} from './nativeAreaSourceSession';\nimport {makeNativeAreaArena} from '../engine/nativeAreaArena';\nimport {hullOf} from '../world/shape';\nimport {assertNativeCharacterResume,type NativeCharacterResumeReceipt,type NativeAreaCharacterResume} from './nativeAreaCharacterResume';\nimport {assertNativeCharacterReceipt,type NativeCharacterCreationReceipt} from './nativeAreaCharacterCreation';\nimport {foldNativeTownStations} from './nativeAreaTownStations';\nimport {START_ZONE} from '../data/zones';\n/** Concrete native source preparation. A prepared area has no physical runtime authority. */\nimport {assertNativeRetainedMassState} from './nativeAreaRetainedMassState';\nimport {vec} from '../core/math';\nimport type {Actor} from '../engine/actor';\nimport {LEDGER_ZONES_EXPLORED} from '../meta/account';\nimport {sceneCampaignOceanBearing,sceneCampaignSeaNameOf} from '../engine/nativeSceneCampaignQueries';\nimport {NativeAreaCampaignSession,isNativeAreaCampaignSession} from './nativeAreaCampaignSession';\nimport {NativeAreaSceneTransitionCoordinator,isNativeAreaSceneTransitionCoordinator} from './nativeAreaSceneTransitionCoordinator';\nimport {NativeAreaSceneOngoing,freshAreaOngoingState,type NativeAreaOngoingRuntime,type NativeAreaOngoingInput} from './nativeAreaSceneOngoing';\nimport {NativeAreaActorAuthority} from './nativeAreaActorAuthority';\nimport {NativeAreaMaddenLedger,assertNativeMaddenLedger} from './nativeAreaMaddenLedger';\nimport {NativeAreaSceneMemory} from './nativeAreaSceneMemory';\nimport {MassNativeGeography} from './nativeGeography';\nimport {NativeGeographyCatalog} from './nativeGeographyCatalog';\nimport {installedNativeAreaSources,installedNativeAreaConfig} from './nativeAreaInstalledSources';\nexport interface NativeAreaPreparationInput {session:NativeAreaCampaignSession;coordinator:NativeAreaSceneTransitionCoordinator;authority:NativeAreaActorAuthority<NativeAreaOngoingRuntime>;maddenLedger:NativeAreaMaddenLedger;catalog?:NativeGeographyCatalog}\nconst preparations=new WeakSet<object>();\nexport function isNativeAreaScenePreparation(value:unknown):value is NativeAreaScenePreparation{return !!value&&typeof value==='object'&&preparations.has(value);}\nexport class NativeAreaScenePreparation {\n #loadingInitialAttempted=false;\n #loadingInitial:{area:NativeAreaSceneOngoing;source:NativeAreaSourceSession;ticket:NativeAreaSource;firstVisit:boolean;visited:boolean;definition:NativeAreaSceneOngoing['assembly']['input']['scene']['zone'];actor:Actor;inCave:boolean}|undefined;\n readonly #prepareRealm:(area:NativeAreaSceneOngoing)=>void;\n #resumeOwner:NativeAreaCharacterResume|undefined;\n setProvisionalRestore(token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'graph');if(r.preparation!==this||this.#resumeOwner)throw Error('Native preparer already has a restore owner');this.#resumeOwner=r.owner;}\n finishProvisionalRestore(source:NativeAreaSceneOngoing,token:NativeCharacterResumeReceipt):void {const r=assertNativeCharacterResume(token,'arrival');if(r.preparation!==this||r.area!==source)throw Error('Foreign provisional restore completion');this.input.coordinator.assertProvisionalRestoreSource(r.owner,source);if(this.#areas.get(source.assembly.input.scene.zone.id)===source)this.#areas.delete(source.assembly.input.scene.zone.id);this.#geography.delete(source);}\n readonly input:Readonly<NativeAreaPreparationInput>;readonly #areas=new Map<string,NativeAreaSceneOngoing>();readonly #geography=new WeakMap<NativeAreaSceneOngoing,MassNativeGeography>();\n constructor(raw:NativeAreaPreparationInput){\n  const {session,coordinator,authority,maddenLedger}=raw;if(!isNativeAreaCampaignSession(session)||!isNativeAreaSceneTransitionCoordinator(coordinator)||coordinator.input.campaign!==session.campaign||coordinator.input.characterWriter!==session.writer||coordinator.input.authority!==authority||authority.campaign!==session.campaign)throw Error('Native preparation needs actual shared campaign roots');\n  assertNativeRetainedMassState(session.writer);assertNativeMaddenLedger(maddenLedger,session.campaign,authority);const catalogSlot=Object.getOwnPropertyDescriptor(raw,'catalog');if(catalogSlot&&!Object.hasOwn(catalogSlot,'value'))throw Error('Native preparation catalog needs actual data');const catalog=catalogSlot?.value as NativeGeographyCatalog|undefined;if(catalog!==undefined){if(!(catalog instanceof NativeGeographyCatalog)||catalog.initial.seed!==session.writer.manifest.seed)throw Error('Native preparation catalog belongs to another campaign');}this.input=Object.freeze({session,coordinator,authority,maddenLedger,...catalog?{catalog}:{}});Object.defineProperty(this,'input',{writable:false,configurable:false});preparations.add(this);this.#prepareRealm=coordinator.attachPreparation(this);\n }\n assertVoyagePreparation(area:NativeAreaSceneOngoing):void {if(this.#areas.get(area.assembly.input.scene.zone.id)!==area||!this.#geography.has(area))throw Error('Native voyage needs its actual prepared owner');}\n releaseVoyage(area:NativeAreaSceneOngoing):void {Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.assertVoyageRetirement,this.input.coordinator,[area]);if(this.#areas.get(area.assembly.input.scene.zone.id)!==area)throw Error('Native voyage preparation owner changed');this.#areas.delete(area.assembly.input.scene.zone.id);this.#geography.delete(area);}\n releaseGround(area:NativeAreaSceneOngoing):void {nativeGroundCoordinatorCalls(this.input.coordinator).areaRetirement(area);if(this.#areas.get(area.assembly.input.scene.zone.id)!==area)throw Error('Native ground preparation owner changed');this.#areas.delete(area.assembly.input.scene.zone.id);this.#geography.delete(area);}\n /** Close preparation, including a failed destination never registered for play. */\n retire():readonly NativeAreaSceneOngoing[]{const areas=Object.freeze([...this.#areas.values()]);this.#areas.clear();this.#loadingInitial=undefined;return areas;}\n /** Select only an actual campaign definition and recorded geography. No callback\n  * can substitute a prebirthed scene, area, population, or landing coordinate. */\n prepare(zoneId:string,geography:MassNativeGeography,from?:string,representative?:Actor):NativeAreaSceneOngoing {\n  const {session}=this.input,campaign=session.campaign,writer=session.writer;assertNativeRetainedMassState(writer);\n  const definition=campaign.zoneMap[zoneId]??campaign.caveMap[zoneId];if(!definition||definition.id!==zoneId||this.#areas.has(zoneId)||!(geography instanceof MassNativeGeography))throw Error('Native preparation needs one actual unresolved area');\n  if(this.input.catalog){const selected=this.input.catalog.select(definition.dimension??'surface');selected.assertCompatible(geography.spec);geography=selected;}\n  if(zoneId===START_ZONE){writer['townLayoutChangedOnLoad']=false;foldNativeTownStations(writer);}\n  const player=representative??campaign.localSeat.actor;\n  const area=this.#construct(zoneId,geography,from,player);this.#layout(area,geography);return area;\n }\n #construct(zoneId:string,geography:MassNativeGeography,from:string|undefined,player:Actor,characterConstruction?:NativeCharacterCreationReceipt):NativeAreaSceneOngoing {\n  const {session,coordinator,authority,maddenLedger}=this.input,campaign=session.campaign,writer=session.writer,definition=campaign.zoneMap[zoneId]??campaign.caveMap[zoneId];\n  if(this.input.catalog){const selected=this.input.catalog.select(definition.dimension??'surface');selected.assertCompatible(geography.spec);geography=selected;}\n  const services:NativeAreaOngoingInput['services']={\n   geometry:{get seasSeen(){return writer['seasSeen'];},oceanBearing:at=>sceneCampaignOceanBearing(campaign,at),seaNameOf:z=>sceneCampaignSeaNameOf(campaign,z),get notice(){return campaign.notice;},get seatOf(){return campaign.seatOf;}},\n   residents:{get clientActionHook(){return campaign.clientActionHook;}},timeflow:campaign.timeflow,\n   ecology:{get throngClaimed(){return writer.throngClaimed;}},theater:{get notice(){return campaign.notice;}},\n   history:{get notice(){return campaign.notice;},get events(){return writer.events;}},\n  };\n  const carry={inCave:!campaign.zoneMap[zoneId],entryFrom:from??null,voyage:null,charBorn:writer['charBorn'],charRegrowAcc:writer['charRegrowAcc'],townTierIdx:writer['townTierIdx']};\n  const area=new NativeAreaSceneOngoing({definition,player,initialActors:characterConstruction?writer.actors:[player],characterConstruction,campaign,sources:installedNativeAreaSources(campaign),services,carry,config:installedNativeAreaConfig(),...freshAreaOngoingState(campaign.time),authority,maddenLedger,coordinator,characterWriter:writer});\n  area.combat.runtimeState.frame.townLayoutChangedOnLoad=zoneId===START_ZONE&&writer['townLayoutChangedOnLoad'];\n  this.#areas.set(zoneId,area);this.#geography.set(area,geography);\n  this.#prepareRealm(area);\n  return area;\n }\n #layout(area:NativeAreaSceneOngoing,geography:MassNativeGeography):void {\n  const {session}=this.input,campaign=session.campaign,definition=area.assembly.input.scene.zone,zoneId=definition.id,carry=area.assembly.transition;\n  session.duringPreparation(area,()=>{\n   const source=area.assembly.sourceSession(geography),ticket=source.issue(zoneId),firstVisit=!carry.inCave&&!campaign.visited.has(zoneId);\n   // Exact visit/deed/concealment statements at the original pre-layout point.\n   // Existing retained-area controller/realm handoff is a separate operation.\n   if(!carry.inCave){campaign.visited.add(zoneId);if(firstVisit&&area.assembly.objectiveController.metaProgressionActive()){campaign.account.ledger[LEDGER_ZONES_EXPLORED]=(campaign.account.ledger[LEDGER_ZONES_EXPLORED]??0)+1;campaign.accountDirty=true;}if(definition.concealed)definition.concealed=false;if(definition.veiled)definition.veiled=false;}\n   Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.prepareVoyageSurface,this.input.coordinator,[area]);\n   area.assembly.prepare(source,ticket,vec(definition.size.w/2,definition.size.h/2),firstVisit);\n  });\n }\n constructInitialCharacter(token:NativeCharacterCreationReceipt,zoneId:string,geography:MassNativeGeography):NativeAreaSceneOngoing {const r=assertNativeCharacterReceipt(token,'construct');if(r.preparation!==this||this.#areas.size||zoneId!==r.writer.zoneMap[zoneId]?.id||geography.seed!==r.writer.manifest.seed)throw Error('Native character needs its exact unprepared first area');return this.#construct(zoneId,geography,undefined,r.seat.actor,token);}\n prepareInitialCharacter(token:NativeCharacterCreationReceipt):void {const r=assertNativeCharacterReceipt(token,'birth'),area=r.area;if(r.preparation!==this||!area||this.#areas.get(area.assembly.input.scene.zone.id)!==area||area.assembly.phase!=='fresh')throw Error('Native character preparation differs');\n  // The original load follows party/join; account rewards acquired there belong in this first layout.\n  r.writer['townLayoutChangedOnLoad']=false;foldNativeTownStations(r.writer);assertNativeCharacterReceipt(token,'birth');\n  const {geometry,settlement,scene}=area.assembly.input;geometry.arena=makeNativeAreaArena(scene.zone);geometry.arenaHull=hullOf(geometry.arena);\n  settlement.input.state.townTierIdx=r.writer['townTierIdx'];area.combat.runtimeState.frame.townLayoutChangedOnLoad=r.writer['townLayoutChangedOnLoad'];\n  area.assembly.scenePresence.includeInitialCharacter(token);area.assembly.input.population.includeInitialCharacter(token);r.writer.zone=area.assembly.input.scene.zone;r.writer.zoneEnteredAt=r.writer.time;r.writer.arena=area.assembly.input.geometry.arena;this.#layout(area,this.#geography.get(area)!);}\n\n /** Only the loading factory uses these two advances. Source tickets are owned\n  * session handles; no factory receipt or borrowed campaign scope is retained. */\n advanceInitialCharacterLoading(token:NativeCharacterCreationReceipt):boolean {\n  const r=assertNativeCharacterReceipt(token,'birth'),area=r.area;\n  if(r.preparation!==this||!area||this.#areas.get(area.assembly.input.scene.zone.id)!==area||area.assembly.phase!=='fresh')throw Error('Native character preparation differs');\n  const {session}=this.input,campaign=session.campaign,definition=area.assembly.input.scene.zone,zoneId=definition.id,carry=area.assembly.transition;\n  if(!this.#loadingInitialAttempted){\n   this.#loadingInitialAttempted=true;\n   r.writer['townLayoutChangedOnLoad']=false;foldNativeTownStations(r.writer);assertNativeCharacterReceipt(token,'birth');\n   const {geometry,settlement,scene}=area.assembly.input;geometry.arena=makeNativeAreaArena(scene.zone);geometry.arenaHull=hullOf(geometry.arena);\n   settlement.input.state.townTierIdx=r.writer['townTierIdx'];area.combat.runtimeState.frame.townLayoutChangedOnLoad=r.writer['townLayoutChangedOnLoad'];\n   area.assembly.scenePresence.includeInitialCharacter(token);area.assembly.input.population.includeInitialCharacter(token);r.writer.zone=area.assembly.input.scene.zone;r.writer.zoneEnteredAt=r.writer.time;r.writer.arena=area.assembly.input.geometry.arena;\n   session.duringPreparation(area,()=>{\n    const source=area.assembly.sourceSession(this.#geography.get(area)!),ticket=source.issue(zoneId),visited=campaign.visited.has(zoneId),firstVisit=!carry.inCave&&!visited;\n    this.#loadingInitial={area,source,ticket,firstVisit,visited,definition,actor:r.actor,inCave:carry.inCave};\n   });\n   return false;\n  }\n  const pending=this.#loadingInitial;this.#loadingInitial=undefined;\n  if(!pending||pending.area!==area||pending.definition!==definition||(campaign.zoneMap[zoneId]??campaign.caveMap[zoneId])!==pending.definition||pending.actor!==r.actor||pending.inCave!==carry.inCave||pending.visited!==campaign.visited.has(zoneId))throw Error('Native loading preparation is completed, changed or foreign');\n  const {source,ticket,firstVisit}=pending;\n  session.duringPreparation(area,()=>{\n   if(!carry.inCave){campaign.visited.add(zoneId);if(firstVisit&&area.assembly.objectiveController.metaProgressionActive()){campaign.account.ledger[LEDGER_ZONES_EXPLORED]=(campaign.account.ledger[LEDGER_ZONES_EXPLORED]??0)+1;campaign.accountDirty=true;}if(definition.concealed)definition.concealed=false;if(definition.veiled)definition.veiled=false;}\n   Reflect.apply(NativeAreaSceneTransitionCoordinator.prototype.prepareVoyageSurface,this.input.coordinator,[area]);\n   area.assembly.prepare(source,ticket,vec(definition.size.w/2,definition.size.h/2),firstVisit);\n  });\n  return true;\n }\n\n /** The coordinator selects this same source's recorded geography. Preparation\n  * returns its exact real area; no caller supplies a prebirthed destination. */"
        }
      ]
    },
    {
      "file": "src/render/renderer.ts",
      "rawBeforeHash": "4d66a199592f38ecd5275d4426c0ce43f20dad57af633a8aba7ab52e51e8c0f6",
      "rawAfterHash": "c4014a28bfe98bb9c2bd523cdf3503c92f46175bd97c2fef7bea2d6d96f1b555",
      "beforeHash": "4d66a199592f38ecd5275d4426c0ce43f20dad57af633a8aba7ab52e51e8c0f6",
      "afterHash": "43892a1ad95504ac841f18f2f8156d62608d27341bb3992f75d43cba949813c5",
      "crlfLines": [],
      "hunks": [
        {
          "before": "    this.resize();\n  }\n\n  resize(): void {\n    const w = this.frameW, h = this.frameH;\n    // Buffer at the scaled size; the ELEMENT stays window-sized (CSS pins it\n    // — with no explicit style the element would shrink to the buffer).\n    this.canvas.width = Math.max(2, Math.round(w * this.pixelScale));\n    this.canvas.height = Math.max(2, Math.round(h * this.pixelScale));\n    this.canvas.style.width = (this.captureViewport ? window.innerWidth : w) + 'px';\n    this.canvas.style.height = (this.captureViewport ? window.innerHeight : h) + 'px';\n    // The crest overlay always carries NATIVE pixels (that is its point).\n    this.overlay.width = Math.max(2, w);\n    this.overlay.height = Math.max(2, h);\n    this.overlay.style.width = w + 'px';\n    this.overlay.style.height = h + 'px';\n  }\n\n  /** Run `fn` with this.ctx/this.canvas pointed at the crest overlay (the\n   *  draw methods destructure both, so the swap redirects their pixels AND\n   *  their dimension reads together). No-op passthrough when inactive. */\n  private onCrest(active: boolean, fn: () => void): void {\n    if (!active) { fn(); return; }\n    const c = this.ctx, cv = this.canvas;\n    this.ctx = this.octx; this.canvas = this.overlay;\n    try { fn(); } finally { this.ctx = c; this.canvas = cv; }\n  }\n\n  /** Screen -> world coordinates (for mouse aiming). Inverts scale·translate. */\n  toWorld(p: { x: number; y: number }): Vec2 {\n    return { x: p.x / this.zoom + this.cam.x, y: p.y / this.zoom + this.cam.y };\n  }\n\n  /** World -> screen coordinates — toWorld's exact inverse (used to hand the\n   *  reticle's position to the mouse on an aim-source switch). Uses the last\n   *  rendered camera, which is at most one frame stale. */\n  toScreen(p: { x: number; y: number }): Vec2 {\n    return { x: (p.x - this.cam.x) * this.zoom, y: (p.y - this.cam.y) * this.zoom };\n  }\n\n  /** The live UI-scale dial (Settings.uiScale), re-clamped to the fabric's\n   *  rails so a hand-edited save can't fold the HUD inside-out mid-frame. */\n  private uiScaleLive(): number {\n    const v = this.getSettings?.().uiScale ?? UI_SCALE_CFG.default;\n    return clamp(v, UI_SCALE_CFG.min, UI_SCALE_CFG.max);\n  }\n\n  /** One scaled screen-space widget pass: everything `draw` paints in\n   *  virtual (uiW×uiH) coordinates lands physically ×scale. Only for passes\n   *  that never project world coords — a projected point under a scaled ctx\n   *  lands off-target (the attention chevrons and descent shaft pip stay\n   *  physical for exactly that reason). */\n  private uiPass(scale: number, draw: () => void): void {\n    const { ctx } = this;\n    ctx.save();\n    ctx.scale(scale, scale);\n    draw();\n    ctx.restore();\n  }\n\n  /** The cache steward's boundary detectors (vis/caches.ts): which World\n   *  and which zone the last frame drew — identity flips fan out the trims. */\n  private stewardWorld: unknown = null;\n  private stewardZone: unknown = null;\n\n  /** This frame's collected status screen-fx (screenFx.ts) — gathered once\n   *  at the top of render() for the falter gate, reused by drawStatusFx. */\n  private frameFx: ActiveFx[] = [];\n  /** THE FALTER's scheduler (wall-clock ms): when the current held frame\n   *  releases, when the next hitch lands, and whether a falter-bearing fx\n   *  was live last frame (fresh activation re-arms firstDelaySec). */\n  private falterHoldUntil = 0;\n  private falterNextAt = 0;\n  private falterArmed = false;\n  private falterW = 0;\n  private falterH = 0;\n\n  render(world: World): void {\n    const { ctx, canvas } = this;\n    const w = canvas.width, h = canvas.height;\n\n    // THE CACHE STEWARD's boundaries (vis/caches.ts): a zone swap trims\n    // every registered cache to its post-swap posture; a NEW WORLD (menu →\n    // fresh run) releases the lot. Detected here — the renderer is the one\n    // place that sees both identities every frame — and fanned out before\n    // anything draws, so evictees re-bake on sight, never mid-use.\n    let boundary = false;\n    if (this.stewardWorld !== world) {\n      if (this.stewardWorld !== null) trimVisCaches('run');\n      this.stewardWorld = world;\n      this.stewardZone = world.zone;\n      boundary = true;\n    } else if (this.stewardZone !== world.zone) {\n      this.stewardZone = world.zone;\n      trimVisCaches('zone');\n      boundary = true;\n    }\n\n    // THE FALTER (screenFx.ScreenFxDef.falter × VIS_CFG.statusFx.falter):\n    // while a falter-bearing status rides the LOCAL hero, hold the whole\n    // presented frame on a jittered cadence — the deliberate fake lag spike\n    // (docs/render/falter.md). DESIGNED, not a defect: the sim keeps\n    // stepping, inputs keep landing, the co-op wire never pauses; only what\n    // the eye gets is briefly stale, exactly like the hitch it impersonates.\n    // Boundary frames (zone/world flip) and resizes always draw — a swap's\n    // first frame or a fresh backing store must never present stale pixels.\n    this.frameFx = world.player.dead || world.player.downed ? [] : collectActiveFx(world.player.statuses);\n    const resized = w !== this.falterW || h !== this.falterH;\n    this.falterW = w; this.falterH = h;\n    const falterK = (this.getSettings?.().statusFalter ?? true)\n      ? collectFalterK(this.frameFx) : 0;\n    if (falterK <= 0 || boundary || resized) {\n      // Not faltering (or must draw): disarm so the NEXT activation gets a\n      // fresh firstDelaySec beat instead of a mid-schedule leftover.\n      this.falterArmed = false;\n      this.falterHoldUntil = 0;\n    } else {\n      const nowMs = performance.now();\n      const F = VIS_CFG.statusFx.falter;\n      if (!this.falterArmed) {\n        this.falterArmed = true;\n        this.falterNextAt = nowMs + F.firstDelaySec * 1000;\n      }\n      if (nowMs < this.falterHoldUntil) return; // mid-hold: present the held frame\n      if (nowMs >= this.falterNextAt) {\n        const hold = F.holdMs[0] + (F.holdMs[1] - F.holdMs[0]) * falterK;\n        const period = (F.periodSec[0] + (F.periodSec[1] - F.periodSec[0]) * falterK) * 1000;\n        this.falterHoldUntil = nowMs + hold;\n        // Render-side jitter only — never the sim's streams.\n        this.falterNextAt = nowMs + hold + period * (1 + (Math.random() * 2 - 1) * F.jitter);\n        return; // the hold begins on this frame — keep what's presented\n      }\n    }\n\n    // Frame delta off the sim clock — the smoothing step for canopy/roof fades.\n    this.frameDt = clamp(world.time - this.lastRenderTime, 0, 0.1);\n    this.lastRenderTime = world.time;\n\n    // THE CAMERA (render/camera.ts): the mode registry decides how the view\n    // frames the hero — a ZoneDef.camera pin wins, then the player's Options\n    // pick, then the fabric default. Boundless zones (the Descent abyss)\n    // free-follow inside placeCamera regardless of mode: no frame to clamp to.\n    //\n    // THE COUCH FRAME rides in front: with guests seated, the frame's focus\n    // is the heroes' shared center and the zoom BREATHES down toward the fit\n    // (couchFit — smoothed, floored at the stretch cap); the frame actually\n    // drawn is then published back as THE EDGE LAW's rect (world.couchConfine)\n    // so drawn == confined by construction. Solo: stretch pins to 1, focus is\n    // the hero, the rect is null — byte-identical to the classic frame.\n    const couchEyes = world.couchActive() ? world.couchHeroes() : null;\n    const couchOn = !!couchEyes && couchEyes.length > 1;\n    // A DEGENERATE viewport (a minimized window, a zero-size boot frame)\n    // must never drive the fit — a 0-wide screen would slam the stretch to\n    // the cap and shrink the edge law's rect to a point-prison. Hold the\n    // frame where it stands and publish NO confine until pixels return.\n    const viewOk = w >= 64 && h >= 64;\n    // THE CINEMATIC EYE (engine/scenes.ts): a running scene may hand the\n    // camera a focus of its own — the reckoning's pan is the director\n    // lerping this point, so drawn == scripted with no easing forked here.\n    // THE FRAME LOCK (the fourth wall — StatusDef.frameLock): a stamped\n    // lock pins the follow point to its frozen walls' center — below the\n    // cinematic eye (a running scene owns the camera outright), above the\n    // couch fit and the ordinary follow. The couch zoom still breathes;\n    // the walls stand where the lock stamped them.\n    const lockFocus = world.scene?.focus ? null : world.frameLockFocus();\n    let focus: { x: number; y: number } = this.directorFocus ?? world.scene?.focus ?? lockFocus ?? world.player.pos;\n    if (couchOn && viewOk) {\n      // The fit sees the EFFECTIVE base zoom (× pixelScale): buffer dims and\n      // zoom scale together, so the stretch math is scale-invariant.\n      const fit = couchFit(couchEyes.map(a => a.pos), w, h, this.baseZoom * this.pixelScale, COUCH_CFG.camera);\n      this.couchStretch += (fit.stretch - this.couchStretch)\n        * Math.min(1, this.frameDt * COUCH_CFG.camera.zoomLerp);\n      if (!lockFocus) focus = fit.focus; // a locked frame beats the fit's follow\n    } else if (!couchOn) {\n      this.couchStretch = 1; // solo: pinned exactly — the classic frame\n    } // else: couch play under a degenerate view — hold the stretch as-is\n    // THE SMOOTH SHELL's follow: a client shell's frame chases its hero on a critically damped\n    // spring (a scene's eye and a frame lock still pin it; null everywhere else: the hard lock).\n    if (this.cameraFollow && !couchOn && !world.scene?.focus && !lockFocus) {\n      focus = springFollow(this.cameraFollow, focus, performance.now(), CAMERA_FOLLOW_CFG);\n    }\n    // The positional veils are single-eye fabrics — under a shared couch\n    // frame they suspend per COUCH_CFG.render (both players see what the\n    // camera sees); each veil's own fade handles the transition gracefully.\n    this.sightVeil.suspend = (couchOn && COUCH_CFG.render.sightVeil === 'off') || this.directorNoSightVeil;\n    this.roomVeil.suspend = couchOn && COUCH_CFG.render.roomVeil === 'off';\n    const z = this.zoom, vw = w / z, vh = h / z;\n    const az = world.arena;\n    const camMode = cameraModeOf(world.zone.camera ?? this.getSettings?.().cameraMode);\n    // THE COMPOSITE BOUND: the frame spans the ACTIVE union's hull, so the\n    // camera can rest over revealed annex ground — the base box exactly\n    // until a piece opens (piece-less zones pass the arena object untouched).\n    const azSpan = az.pieces?.length\n      ? { w: world.arenaHull.w, h: world.arenaHull.h, boundless: az.boundless }\n      : az;\n    const camAt = placeCamera(camMode, focus, vw, vh, azSpan);\n    this.cam.x = camAt.x;\n    this.cam.y = camAt.y;\n    world.couchConfine = couchOn && viewOk\n      ? couchConfineRect(camAt, vw, vh, COUCH_CFG.camera) : null;\n    // THE FOURTH WALL's publish (engine/fourthwall.ts): the frame actually\n    // drawn, handed back every rendered frame — drawn == tested for every\n    // consumer that banks off the edge of vision (the couchConfine idiom,\n    // generalized to solo). Degenerate viewports publish nothing; the\n    // engine's staleness grace degrades reads to the fallback instead.\n    if (viewOk) world.publishViewFrame(camAt.x, camAt.y, vw, vh);\n\n    // The clear IS the void: theme-tinted abyss ink (vis/voidFrame.ts), so\n    // whatever the frame exposes past the rim already wears the zone's dark.\n    ctx.fillStyle = voidBaseOf(world.zone.theme);\n    ctx.fillRect(0, 0, w, h);\n\n    // A LAUNCH in progress asks for its understory: capture the DEPARTURE\n    // zone's aerial while it is still live — the swap will hide it behind\n    // the veil, and the shelf above will look down on this very ground.\n    const trav = world.traversal;\n    if (trav?.capture && !this.understory.has(trav.capture.key)) {\n      this.understory.capture(world, trav.capture);\n    }\n\n    // Per-frame doodad culling: everything the ground/canopy doodad passes\n    // draw comes from this view-clipped, kind-grouped set (see cullDoodads).\n    this.cullDoodads(world, vw, vh);\n    // Gather this frame's light sources (data-declared doodad emissives,\n    // projectiles, flashes, exits, the hero's lantern) for the light layer.\n    this.lightLayer.collect(world, this.culled, this.cam.x, this.cam.y, vw, vh);\n\n    // THE ROOM VEIL resolves FIRST (state only — its sheet still composites\n    // after the world pass): the sight veil mid-pass yields to a wrapped\n    // frame, so the two darks never fight over one doorway.\n    // THE STOREY FABRIC (engine/storeys.ts): the stacked buildings standing\n    // in this zone, read once per frame for the story culls + the storey\n    // layer (empty everywhere a plan raised no floor above).\n    this.stacked = world.zone.tiers ? world.storeyedStructures() : [];\n    this.roomVeil.update(world, this.frameDt);\n    // Resolve visibility ONCE before any body, link or label queries it.\n    // Previously bodies read last frame's eye while the veil/labels read this\n    // frame's eye, flashing at corners and on zone or darkness changes.\n    this.updateRoofFades(world);\n    this.hullRects.length = 0;\n    for (const st of world.structures) {\n      if ((this.roofFade.get(st.id) ?? 1) <= VIS_CFG.sightVeil.hullGate) continue;\n      for (const r of st.roofs) this.hullRects.push(r);\n    }\n    this.sightVeil.userMul = this.getSettings?.().veilDarkness ?? 1;\n    this.sightVeil.update(world, this.roomVeil.frac(), vw, vh, this.hullRects);\n\n    ctx.save();\n    ctx.scale(z, z);\n    // Shared SCREEN-SHAKE: jitter the world transform by world.shake (decays in the\n    // sim). 0 when nothing sets it → byte-identical when no boss/impact is shaking.\n    const sh = world.shake;\n    const shx = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;\n    const shy = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;\n    ctx.translate(-this.cam.x + shx, -this.cam.y + shy);\n\n    this.drawFloor(world);\n    this.drawCollapseOverlay(world); // crumbling cloud cells: shiver, crack, let go\n    // THE LIVING FLUX (vis/fluxLayer.ts): shifting pads, carrier rafts,\n    // conjured clouds, gust streaks — ground, so under doodads and actors.\n    if ((world.flux || world.conjured?.live) && !VIS_ABLATE.has('flux')) {\n      drawFluxLayer(this.ctx, world, this.cam.x, this.cam.y,\n        this.canvas.width / this.zoom, this.canvas.height / this.zoom);\n    }\n    // THE CREEP (vis/creepLayer.ts): the living membrane — skin laid over\n    // the floor, so under doodads and actors; the drawn surface is the same\n    // geometry the fabric's grants read.\n    if (world.creep && !VIS_ABLATE.has('creep')) {\n      drawCreepLayer(this.ctx, world.creep, world.time, this.cam.x, this.cam.y, vw, vh);\n    }\n    // WALL EYES (vis/wallEyes.ts): seeking pupils over the baked sockets of\n    // any eyes-flagged wall region — wall-surface detail, so under doodads.\n    if (!VIS_ABLATE.has('doodads')) this.wallEyesPass.draw(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    // TRACK LANES (vis/trackLayer.ts): grooveless runtime lanes stroke their\n    // path here — ground detail, under doodads and riders alike.\n    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrackLanes(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE TIER VEIL (covered exposure) sits UNDER the doodad pass: the\n    // under-layer's own furniture (a duct's webs, the smugglers' caches)\n    // draws ON TOP of the tunnel floor it stands in.\n    this.drawTierVeil(world, vw, vh);\n    // THE STOREY LAYER (engine/storeys.ts) sits in the same slot: the floor\n    // above and its hanging walls, painted live over the ground bake while\n    // the hero stands the story; the understair closets while below.\n    this.drawStoreyLayer(world);\n    if (!VIS_ABLATE.has('doodads')) this.drawDoodads(world);\n    // THE DISSOLUTION GRAMMAR (vis/dissolveLayer.ts): the flying fragments of\n    // every live break — over the ground and the standing furniture, under\n    // bodies — plus the pre-crack growing on pressed give-way faces. Both gate\n    // on empty state first: zero cost while nothing breaks.\n    if (!VIS_ABLATE.has('doodads')) {\n      drawDissolves(this.ctx, world, this.cam.x, this.cam.y, vw, vh); // sweeps its set cache, then returns on an empty list\n      drawDissolveCracks(this.ctx, world);\n      drawEmergences(this.ctx, world, this.cam.x, this.cam.y, vw, vh, rec => {\n        if (rec.recoveryCueTier === undefined) return true;\n        const body = world.actorById(rec.actorId);\n        return !!body && !body.dead && this.anatomyCueVisible(body, world)\n          && this.companionCuePointVisible(rec.pos, rec.recoveryCueTier, world);\n      }); // Recovery ground shares obey the same body and story gates.\n    }\n    // TRACK RIDERS: the moving hazards, posed from the shared clock through\n    // the one painter registry — over the ground and grooves, under actors.\n    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrackRiders(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    if (!VIS_ABLATE.has('motionfx')) {\n      this.updateMotionFx(world);\n      this.drawMotionFx();   // wake ripples + snow pocks, over grounds, under actors\n    }\n    this.drawAirPockets(world);     // underwater: round air-pocket wash + rising bubbles\n    this.drawAltars(world);\n    this.drawShrines(world);\n    this.drawChests(world);\n    this.drawFonts(world);\n    this.drawWaypoint(world);\n    this.drawDownReads(world);     // THE PARTY THAT READS: a held down's wipe radius, its bleed-out, your own revive fill\n    this.drawHuntFootprint(world); // beast tracks to dwell on (the Hunt)\n    this.drawAmalgamPicks(world);  // the Bonewright's body-part choice spots\n    // Resolve attention once before both its ground cues and actor labels.\n    this.speechFocusLines.clear();\n    this.speechApproach = null;\n    this.dialogueVisibleSpeaker = null;\n    if (!VIS_ABLATE.has('actors')) {\n      for (const line of world.npcSpeechView(!this.dialogueReaderEnabled() || this.npcDialogueAvailable(),\n        this.speechPointerHits(world), this.dialogueReaderEnabled() ? this.npcDialogueOwner() : null)) this.speechFocusLines.set(line.a, line);\n      if (VIS_CFG.speechApproach.enabled && (!this.dialogueReaderEnabled() || this.npcDialogueAvailable())\n        && ![...this.speechFocusLines.values()].some(line => line.seatId === world.localSeat.id))\n        this.speechApproach = world.speechApproachHint();\n    }\n    this.drawDwellTells(world);    // THE DWELL TELL: the base ring on every station/NPC in dwell range\n    this.drawCampfireHint(world);  // \"linger to refresh\" prompt by the town campfire\n    this.drawExits(world);\n    // THE LIVING FOG, body pass (vis/fogLayer.ts): under actors and combat\n    // telegraphs — the terrain mists over, the fight stays readable.\n    if (world.fog && !VIS_ABLATE.has('fog')) {\n      drawFogLayer(this.ctx, world.fog, 'under', this.cam.x, this.cam.y, vw, vh);\n    }\n    this.drawZones(world);\n    drawMagicPackEffects(this.ctx, world.magicPackEffects, world.time);\n    // TRACK WARN ARCS: the approach telegraph — with the un-exploded discs,\n    // under actors, sampling the riders' ACTUAL future along their lanes.\n    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrackWarnArcs(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE BROIL (vis/geyserLayer.ts): the geyser fabric's drawn warning —\n    // the water itself roiling under actors, off the same pure clock the\n    // column sweep and the dodge-AI read (drawn == tested).\n    if (world.geysers && !VIS_ABLATE.has('geysers')) {\n      drawGeyserBroil(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE VENT-RIDE's broil (vis/ventRideLayer.ts — LeapDelivery.vent): a\n    // vent-leaper's wind-up roils the ground under its OWN feet — the same\n    // roil word the vents wear, the same read the dodge-minds take. Under\n    // actors like every ground telegraph; no geyser field required (a\n    // vent-rider carries its column anywhere — THE NO-LOCK LAW).\n    if (!VIS_ABLATE.has('geysers')) {\n      drawVentRideBroil(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // TRAPWORK TELLS (vis/trapLayer.ts): hidden triggers resolve close-up\n    // for the LOCAL hero — the keen eye at a walk spots the odd flagstone.\n    if (world.trapworks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrapworkTells(this.ctx, world, world.player.pos.x, world.player.pos.y);\n    }\n    this.drawDeathBursts(world);   // coalescing spore/orb gather + the tracking volatile orb\n    this.drawEncounters(world);    // breach diamonds + their growing fields (under actors)\n    this.drawFractures(world);     // fracture object / crawling fissure / chasm maw (under actors)\n    // THE WATCH FABRIC's drawn read (render/vis/watchLayer.ts): sense fans\n    // + followed trails, under bodies like every ground read. Reach folds\n    // vs the local hero; with no live seat there is nothing to fold against.\n    if (world.seats.length) {\n      drawWatchSense(this.ctx, world, world.player);\n      drawWatchTrails(this.ctx, world);\n    }\n    this.drawAuras(world);\n    this.drawCorpses(world);\n    this.drawPlayerCorpses(world);\n    this.drawMovementMarkers(world);\n    this.drawTownPortals(world);\n    this.drawDrops(world);\n    this.drawResourceOrbs(world);\n    this.drawResourceFlows(world);\n    this.drawRemnants(world);\n    for (const f of world.flashes) {\n      if (f.feedingCue && !this.feedingTransferVisible(f.pos, f.feedingCue, world)) continue;\n      const recoveryCueTier = f.recoveryCueTier ?? f.companionCue?.tier;\n      if (recoveryCueTier !== undefined && !this.companionCuePointVisible(f.pos, recoveryCueTier, world)) continue;\n      if (f.movement && f.movement.points.some(p => !this.companionCuePointVisible(p, recoveryCueTier ?? 0, world))) continue;\n      if (f.companionCue?.from && !this.companionCuePointVisible(f.companionCue.from, f.companionCue.from.tier, world)) continue;\n      this.drawTerrainFlash(f, world);\n    }\n    this.drawCompanionCues(world);\n    this.combatMeters.begin(world.time, this.getSettings?.().crowdedMeters ?? VIS_CFG.combatFocus.meters.enabled);\n    // THE PACK LAYER's drawn bonds (engine/pack.ts): the warden's lines to\n    // every body it is actually empowering — over the ground reads, UNDER\n    // the bodies they bind (a link is context for a silhouette, never a\n    // thing that occludes one). The sight veil composites above both, so a\n    // bond behind a wall hides exactly like the wardens holding it.\n    if (!VIS_ABLATE.has('actors')) {\n      this.drawPackLinks(world);\n      drawWardLinks(ctx, world.actors, world.player, world.time);\n      for (const a of world.actors) if (!a.dead) {\n        drawPayloadPlacements(ctx, payloadCueRows(a, world), p =>\n          p.tier === (world.player.tier ?? 0)\n          || (world.zone.tiers?.exposure !== 'covered' && !(this.stacked.length && this.inStack(p)))\n          || !!(world.walk?.regionAt && tierLinkOf(world.walk.regionAt(p.x, p.y))));\n      }\n    }\n    if (!VIS_ABLATE.has('actors')) {\n      // THE LITE TIER (engine/lite.ts): the crowd blits UNDER real bodies —\n      // one composited sprite per body, no per-body state churn.\n      this.drawLite(world, vw, vh);\n      for (const a of world.actors) if (!a.dead && a.worm) this.drawWormTail(a, world.time, world);\n      for (const a of world.actors) if (!a.dead) this.drawActor(a, world);\n      this.combatMeters.paint(ctx);\n      if (world.deathPresentation) drawPlayerDeath(this.ctx, world.player, world.deathPresentation, world.time);\n      // THE STATUS VOICE (vis/statusVoiceLayer.ts): what just LANDED on a\n      // body is drawn ON it — the frame-diff of each body's statuses plays\n      // the family voice over the body; off-screen landings stay silent.\n      drawStatusVoices(this.ctx, world, this.frameDt, this.cam.x, this.cam.y, vw, vh);\n      for (const a of world.actors) if (!a.dead && a.nemesis) this.drawNemesisMark(a);\n    }\n    drawCreepers(this.ctx, world);\n    drawSatellites(this.ctx, world);\n    drawGuardArts(this.ctx, world);\n    drawAuroras(this.ctx, world);\n    drawGuardians(this.ctx, world);\n    this.drawProjectiles(world);\n    // THE COLUMN + THE PLUME + THE LOB COMETS (vis/geyserLayer.ts): the\n    // spout wraps whoever stands in it, so it draws OVER bodies — and\n    // UNDER the sight veil, so a column behind a wall hides whole.\n    if (world.geysers && !VIS_ABLATE.has('geysers')) {\n      drawGeyserColumns(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE VENT-RIDE's jet (vis/ventRideLayer.ts): the steam column a rising\n    // vent-leaper left at its departure, drawn OVER bodies like the vents'\n    // own spouts, UNDER the veil.\n    if (!VIS_ABLATE.has('geysers')) {\n      drawVentRideJets(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE SIGHT VEIL (vis/sightVeil.ts): positional occlusion — everything\n    // the hero's eye cannot reach past a sight-blocking body veils dark with\n    // the ground it stands on. OVER actors/projectiles (what a wall hides is\n    // hidden whole), UNDER canopies (crowns stay lit). Roofs join through\n    // THE HULL LAW: every STANDING roof's rects read solid to the veil (an\n    // open doorway must not lance a wedge across a concealed interior), and\n    // drawRoofs re-composites the sheet over its own pixels (roofMul) so an\n    // occluded structure reads as ONE contiguous dark mass. Composites at\n    // identity through the same effective camera as the light layer.\n    // Visibility was resolved before the world pass; only pixels composite here.\n    this.sightVeil.draw(this.ctx, this.cam.x - shx, this.cam.y - shy, z, w, h);\n    if (!VIS_ABLATE.has('doodads')) this.drawRaisedDoodads(world);\n    if (!VIS_ABLATE.has('doodads')) this.drawCanopies(world); // fake-2D depth: crowns above actors, faded near the hero\n    if (!VIS_ABLATE.has('doodads')) this.drawCanopyEyes(world); // the roof's regard — gone wherever you're near\n    // THE LIVING FOG, tall pass: the lifted share of each bank wraps bodies\n    // walking deep inside — over crowns, still under roofs and labels.\n    if (world.fog && !VIS_ABLATE.has('fog')) {\n      drawFogLayer(this.ctx, world.fog, 'over', this.cam.x, this.cam.y, vw, vh);\n    }\n    this.drawRoofs(world);         // structure roofs: interiors reveal only when you're inside\n\n    ctx.restore();\n\n    // THE ROOM VEIL: interior confinement — inside a confining structure the\n    // world beyond the room is unseen (labels gate through veiledAt; the",
          "after": "    this.resize();\n  }\n\n  private resizeEpoch = 0;\n  private loadingRenderActive = false;\n\n  resize(): void {\n    this.resizeEpoch++;\n    const w = this.frameW, h = this.frameH;\n    // Buffer at the scaled size; the ELEMENT stays window-sized (CSS pins it\n    // — with no explicit style the element would shrink to the buffer).\n    this.canvas.width = Math.max(2, Math.round(w * this.pixelScale));\n    this.canvas.height = Math.max(2, Math.round(h * this.pixelScale));\n    this.canvas.style.width = (this.captureViewport ? window.innerWidth : w) + 'px';\n    this.canvas.style.height = (this.captureViewport ? window.innerHeight : h) + 'px';\n    // The crest overlay always carries NATIVE pixels (that is its point).\n    this.overlay.width = Math.max(2, w);\n    this.overlay.height = Math.max(2, h);\n    this.overlay.style.width = w + 'px';\n    this.overlay.style.height = h + 'px';\n  }\n\n  /** Run `fn` with this.ctx/this.canvas pointed at the crest overlay (the\n   *  draw methods destructure both, so the swap redirects their pixels AND\n   *  their dimension reads together). No-op passthrough when inactive. */\n  private onCrest(active: boolean, fn: () => void): void {\n    if (!active) { fn(); return; }\n    const c = this.ctx, cv = this.canvas;\n    this.ctx = this.octx; this.canvas = this.overlay;\n    try { fn(); } finally { this.ctx = c; this.canvas = cv; }\n  }\n\n  /** Screen -> world coordinates (for mouse aiming). Inverts scale·translate. */\n  toWorld(p: { x: number; y: number }): Vec2 {\n    return { x: p.x / this.zoom + this.cam.x, y: p.y / this.zoom + this.cam.y };\n  }\n\n  /** World -> screen coordinates — toWorld's exact inverse (used to hand the\n   *  reticle's position to the mouse on an aim-source switch). Uses the last\n   *  rendered camera, which is at most one frame stale. */\n  toScreen(p: { x: number; y: number }): Vec2 {\n    return { x: (p.x - this.cam.x) * this.zoom, y: (p.y - this.cam.y) * this.zoom };\n  }\n\n  /** The live UI-scale dial (Settings.uiScale), re-clamped to the fabric's\n   *  rails so a hand-edited save can't fold the HUD inside-out mid-frame. */\n  private uiScaleLive(): number {\n    const v = this.getSettings?.().uiScale ?? UI_SCALE_CFG.default;\n    return clamp(v, UI_SCALE_CFG.min, UI_SCALE_CFG.max);\n  }\n\n  /** One scaled screen-space widget pass: everything `draw` paints in\n   *  virtual (uiW×uiH) coordinates lands physically ×scale. Only for passes\n   *  that never project world coords — a projected point under a scaled ctx\n   *  lands off-target (the attention chevrons and descent shaft pip stay\n   *  physical for exactly that reason). */\n  private uiPass(scale: number, draw: () => void): void {\n    const { ctx } = this;\n    ctx.save();\n    ctx.scale(scale, scale);\n    draw();\n    ctx.restore();\n  }\n\n  /** The cache steward's boundary detectors (vis/caches.ts): which World\n   *  and which zone the last frame drew — identity flips fan out the trims. */\n  private stewardWorld: unknown = null;\n  private stewardZone: unknown = null;\n\n  /** This frame's collected status screen-fx (screenFx.ts) — gathered once\n   *  at the top of render() for the falter gate, reused by drawStatusFx. */\n  private frameFx: ActiveFx[] = [];\n  /** THE FALTER's scheduler (wall-clock ms): when the current held frame\n   *  releases, when the next hitch lands, and whether a falter-bearing fx\n   *  was live last frame (fresh activation re-arms firstDelaySec). */\n  private falterHoldUntil = 0;\n  private falterNextAt = 0;\n  private falterArmed = false;\n  private falterW = 0;\n  private falterH = 0;\n\n  render(world: World): void {\n    if (this.loadingRenderActive) throw Error('A loading frame already owns the renderer');\n    const stages = this.renderStages(world, false);\n    while (!stages.next().done) { /* Ordinary frames stay entirely synchronous. */ }\n  }\n\n  /** Local entry holds simulation and input under its loading lease. A complete\n   * world pass releases its canvas scope before yielding to the cover; the word\n   * and HUD passes then finish that same frame. Resizing/settings changes start\n   * a new frame, never a suffix over an erased or differently projected buffer. */\n  async renderLoading(world: World, pause: () => Promise<void>, current: () => boolean): Promise<boolean> {\n    if (this.loadingRenderActive) throw Error('A loading frame already owns the renderer');\n    this.loadingRenderActive = true;\n    let stages: Generator<void, void, unknown> | undefined;\n    let completed = false;\n    try {\n      const zone = world.zone, player = world.player, time = world.time, walk = world.walk, arena = world.arena;\n      const ownerCurrent = (): boolean => current() && world.zone === zone && world.player === player &&\n        world.time === time && world.walk === walk && world.arena === arena;\n      while (ownerCurrent()) {\n        const stamp = this.loadingPresentationStamp(), settings = this.getSettings, follow = this.cameraFollow;\n        stages = this.renderStages(world, true);\n        const first = stages.next();\n        if (first.done) throw Error('The loading frame did not release its world pass');\n        await pause();\n        if (!ownerCurrent()) return false;\n        if (stamp !== this.loadingPresentationStamp() || settings !== this.getSettings || follow !== this.cameraFollow) {\n          stages.return(); stages = undefined; this.clearLoadingWords();\n          continue;\n        }\n        if (!stages.next().done) throw Error('The loading frame has an unexpected extra stage');\n        stages = undefined;\n        completed = ownerCurrent();\n        return completed;\n      }\n      return false;\n    } finally {\n      stages?.return();\n      if (!completed) this.clearLoadingWords();\n      this.loadingRenderActive = false;\n    }\n  }\n\n  private loadingPresentationStamp(): string {\n    return JSON.stringify([this.resizeEpoch, this.frameW, this.frameH, this.pixelScale, this.captureBaseZoom,\n      this.captureViewport, this.worldOnly, this.directorFocus, this.directorClean, this.directorNoSightVeil,\n      this.directorCinematic, this.linkStrain, this.getSettings?.()]);\n  }\n\n  private clearLoadingWords(): void {\n    this.labels.length = 0; this.speeches.length = 0;\n    this.speechFocusLines.clear(); this.speechApproach = null; this.dialogueVisibleSpeaker = null;\n  }\n\n  private *renderStages(world: World, cooperative: boolean): Generator<void, void, unknown> {\n    const { ctx, canvas } = this;\n    const w = canvas.width, h = canvas.height;\n\n    // THE CACHE STEWARD's boundaries (vis/caches.ts): a zone swap trims\n    // every registered cache to its post-swap posture; a NEW WORLD (menu →\n    // fresh run) releases the lot. Detected here — the renderer is the one\n    // place that sees both identities every frame — and fanned out before\n    // anything draws, so evictees re-bake on sight, never mid-use.\n    let boundary = false;\n    if (this.stewardWorld !== world) {\n      if (this.stewardWorld !== null) trimVisCaches('run');\n      this.stewardWorld = world;\n      this.stewardZone = world.zone;\n      boundary = true;\n    } else if (this.stewardZone !== world.zone) {\n      this.stewardZone = world.zone;\n      trimVisCaches('zone');\n      boundary = true;\n    }\n\n    // THE FALTER (screenFx.ScreenFxDef.falter × VIS_CFG.statusFx.falter):\n    // while a falter-bearing status rides the LOCAL hero, hold the whole\n    // presented frame on a jittered cadence — the deliberate fake lag spike\n    // (docs/render/falter.md). DESIGNED, not a defect: the sim keeps\n    // stepping, inputs keep landing, the co-op wire never pauses; only what\n    // the eye gets is briefly stale, exactly like the hitch it impersonates.\n    // Boundary frames (zone/world flip) and resizes always draw — a swap's\n    // first frame or a fresh backing store must never present stale pixels.\n    this.frameFx = world.player.dead || world.player.downed ? [] : collectActiveFx(world.player.statuses);\n    const resized = w !== this.falterW || h !== this.falterH;\n    this.falterW = w; this.falterH = h;\n    const falterK = (this.getSettings?.().statusFalter ?? true)\n      ? collectFalterK(this.frameFx) : 0;\n    if (falterK <= 0 || boundary || resized || cooperative) {\n      // Not faltering (or must draw): disarm so the NEXT activation gets a\n      // fresh firstDelaySec beat instead of a mid-schedule leftover.\n      this.falterArmed = false;\n      this.falterHoldUntil = 0;\n    } else {\n      const nowMs = performance.now();\n      const F = VIS_CFG.statusFx.falter;\n      if (!this.falterArmed) {\n        this.falterArmed = true;\n        this.falterNextAt = nowMs + F.firstDelaySec * 1000;\n      }\n      if (nowMs < this.falterHoldUntil) return; // mid-hold: present the held frame\n      if (nowMs >= this.falterNextAt) {\n        const hold = F.holdMs[0] + (F.holdMs[1] - F.holdMs[0]) * falterK;\n        const period = (F.periodSec[0] + (F.periodSec[1] - F.periodSec[0]) * falterK) * 1000;\n        this.falterHoldUntil = nowMs + hold;\n        // Render-side jitter only — never the sim's streams.\n        this.falterNextAt = nowMs + hold + period * (1 + (Math.random() * 2 - 1) * F.jitter);\n        return; // the hold begins on this frame — keep what's presented\n      }\n    }\n\n    // Frame delta off the sim clock — the smoothing step for canopy/roof fades.\n    this.frameDt = clamp(world.time - this.lastRenderTime, 0, 0.1);\n    this.lastRenderTime = world.time;\n\n    // THE CAMERA (render/camera.ts): the mode registry decides how the view\n    // frames the hero — a ZoneDef.camera pin wins, then the player's Options\n    // pick, then the fabric default. Boundless zones (the Descent abyss)\n    // free-follow inside placeCamera regardless of mode: no frame to clamp to.\n    //\n    // THE COUCH FRAME rides in front: with guests seated, the frame's focus\n    // is the heroes' shared center and the zoom BREATHES down toward the fit\n    // (couchFit — smoothed, floored at the stretch cap); the frame actually\n    // drawn is then published back as THE EDGE LAW's rect (world.couchConfine)\n    // so drawn == confined by construction. Solo: stretch pins to 1, focus is\n    // the hero, the rect is null — byte-identical to the classic frame.\n    const couchEyes = world.couchActive() ? world.couchHeroes() : null;\n    const couchOn = !!couchEyes && couchEyes.length > 1;\n    // A DEGENERATE viewport (a minimized window, a zero-size boot frame)\n    // must never drive the fit — a 0-wide screen would slam the stretch to\n    // the cap and shrink the edge law's rect to a point-prison. Hold the\n    // frame where it stands and publish NO confine until pixels return.\n    const viewOk = w >= 64 && h >= 64;\n    // THE CINEMATIC EYE (engine/scenes.ts): a running scene may hand the\n    // camera a focus of its own — the reckoning's pan is the director\n    // lerping this point, so drawn == scripted with no easing forked here.\n    // THE FRAME LOCK (the fourth wall — StatusDef.frameLock): a stamped\n    // lock pins the follow point to its frozen walls' center — below the\n    // cinematic eye (a running scene owns the camera outright), above the\n    // couch fit and the ordinary follow. The couch zoom still breathes;\n    // the walls stand where the lock stamped them.\n    const lockFocus = world.scene?.focus ? null : world.frameLockFocus();\n    let focus: { x: number; y: number } = this.directorFocus ?? world.scene?.focus ?? lockFocus ?? world.player.pos;\n    if (couchOn && viewOk) {\n      // The fit sees the EFFECTIVE base zoom (× pixelScale): buffer dims and\n      // zoom scale together, so the stretch math is scale-invariant.\n      const fit = couchFit(couchEyes.map(a => a.pos), w, h, this.baseZoom * this.pixelScale, COUCH_CFG.camera);\n      this.couchStretch += (fit.stretch - this.couchStretch)\n        * Math.min(1, this.frameDt * COUCH_CFG.camera.zoomLerp);\n      if (!lockFocus) focus = fit.focus; // a locked frame beats the fit's follow\n    } else if (!couchOn) {\n      this.couchStretch = 1; // solo: pinned exactly — the classic frame\n    } // else: couch play under a degenerate view — hold the stretch as-is\n    // THE SMOOTH SHELL's follow: a client shell's frame chases its hero on a critically damped\n    // spring (a scene's eye and a frame lock still pin it; null everywhere else: the hard lock).\n    if (this.cameraFollow && !couchOn && !world.scene?.focus && !lockFocus) {\n      focus = springFollow(this.cameraFollow, focus, performance.now(), CAMERA_FOLLOW_CFG);\n    }\n    // The positional veils are single-eye fabrics — under a shared couch\n    // frame they suspend per COUCH_CFG.render (both players see what the\n    // camera sees); each veil's own fade handles the transition gracefully.\n    this.sightVeil.suspend = (couchOn && COUCH_CFG.render.sightVeil === 'off') || this.directorNoSightVeil;\n    this.roomVeil.suspend = couchOn && COUCH_CFG.render.roomVeil === 'off';\n    const z = this.zoom, vw = w / z, vh = h / z;\n    const az = world.arena;\n    const camMode = cameraModeOf(world.zone.camera ?? this.getSettings?.().cameraMode);\n    // THE COMPOSITE BOUND: the frame spans the ACTIVE union's hull, so the\n    // camera can rest over revealed annex ground — the base box exactly\n    // until a piece opens (piece-less zones pass the arena object untouched).\n    const azSpan = az.pieces?.length\n      ? { w: world.arenaHull.w, h: world.arenaHull.h, boundless: az.boundless }\n      : az;\n    const camAt = placeCamera(camMode, focus, vw, vh, azSpan);\n    this.cam.x = camAt.x;\n    this.cam.y = camAt.y;\n    world.couchConfine = couchOn && viewOk\n      ? couchConfineRect(camAt, vw, vh, COUCH_CFG.camera) : null;\n    // THE FOURTH WALL's publish (engine/fourthwall.ts): the frame actually\n    // drawn, handed back every rendered frame — drawn == tested for every\n    // consumer that banks off the edge of vision (the couchConfine idiom,\n    // generalized to solo). Degenerate viewports publish nothing; the\n    // engine's staleness grace degrades reads to the fallback instead.\n    if (viewOk) world.publishViewFrame(camAt.x, camAt.y, vw, vh);\n\n    // The clear IS the void: theme-tinted abyss ink (vis/voidFrame.ts), so\n    // whatever the frame exposes past the rim already wears the zone's dark.\n    ctx.fillStyle = voidBaseOf(world.zone.theme);\n    ctx.fillRect(0, 0, w, h);\n\n    // A LAUNCH in progress asks for its understory: capture the DEPARTURE\n    // zone's aerial while it is still live — the swap will hide it behind\n    // the veil, and the shelf above will look down on this very ground.\n    const trav = world.traversal;\n    if (trav?.capture && !this.understory.has(trav.capture.key)) {\n      this.understory.capture(world, trav.capture);\n    }\n\n    // Per-frame doodad culling: everything the ground/canopy doodad passes\n    // draw comes from this view-clipped, kind-grouped set (see cullDoodads).\n    this.cullDoodads(world, vw, vh);\n    // Gather this frame's light sources (data-declared doodad emissives,\n    // projectiles, flashes, exits, the hero's lantern) for the light layer.\n    this.lightLayer.collect(world, this.culled, this.cam.x, this.cam.y, vw, vh);\n\n    // THE ROOM VEIL resolves FIRST (state only — its sheet still composites\n    // after the world pass): the sight veil mid-pass yields to a wrapped\n    // frame, so the two darks never fight over one doorway.\n    // THE STOREY FABRIC (engine/storeys.ts): the stacked buildings standing\n    // in this zone, read once per frame for the story culls + the storey\n    // layer (empty everywhere a plan raised no floor above).\n    this.stacked = world.zone.tiers ? world.storeyedStructures() : [];\n    this.roomVeil.update(world, this.frameDt);\n    // Resolve visibility ONCE before any body, link or label queries it.\n    // Previously bodies read last frame's eye while the veil/labels read this\n    // frame's eye, flashing at corners and on zone or darkness changes.\n    this.updateRoofFades(world);\n    this.hullRects.length = 0;\n    for (const st of world.structures) {\n      if ((this.roofFade.get(st.id) ?? 1) <= VIS_CFG.sightVeil.hullGate) continue;\n      for (const r of st.roofs) this.hullRects.push(r);\n    }\n    this.sightVeil.userMul = this.getSettings?.().veilDarkness ?? 1;\n    this.sightVeil.update(world, this.roomVeil.frac(), vw, vh, this.hullRects);\n\n    ctx.save();\n    ctx.scale(z, z);\n    // Shared SCREEN-SHAKE: jitter the world transform by world.shake (decays in the\n    // sim). 0 when nothing sets it → byte-identical when no boss/impact is shaking.\n    const sh = world.shake;\n    const shx = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;\n    const shy = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;\n    ctx.translate(-this.cam.x + shx, -this.cam.y + shy);\n\n    this.drawFloor(world);\n    this.drawCollapseOverlay(world); // crumbling cloud cells: shiver, crack, let go\n    // THE LIVING FLUX (vis/fluxLayer.ts): shifting pads, carrier rafts,\n    // conjured clouds, gust streaks — ground, so under doodads and actors.\n    if ((world.flux || world.conjured?.live) && !VIS_ABLATE.has('flux')) {\n      drawFluxLayer(this.ctx, world, this.cam.x, this.cam.y,\n        this.canvas.width / this.zoom, this.canvas.height / this.zoom);\n    }\n    // THE CREEP (vis/creepLayer.ts): the living membrane — skin laid over\n    // the floor, so under doodads and actors; the drawn surface is the same\n    // geometry the fabric's grants read.\n    if (world.creep && !VIS_ABLATE.has('creep')) {\n      drawCreepLayer(this.ctx, world.creep, world.time, this.cam.x, this.cam.y, vw, vh);\n    }\n    // WALL EYES (vis/wallEyes.ts): seeking pupils over the baked sockets of\n    // any eyes-flagged wall region — wall-surface detail, so under doodads.\n    if (!VIS_ABLATE.has('doodads')) this.wallEyesPass.draw(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    // TRACK LANES (vis/trackLayer.ts): grooveless runtime lanes stroke their\n    // path here — ground detail, under doodads and riders alike.\n    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrackLanes(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE TIER VEIL (covered exposure) sits UNDER the doodad pass: the\n    // under-layer's own furniture (a duct's webs, the smugglers' caches)\n    // draws ON TOP of the tunnel floor it stands in.\n    this.drawTierVeil(world, vw, vh);\n    // THE STOREY LAYER (engine/storeys.ts) sits in the same slot: the floor\n    // above and its hanging walls, painted live over the ground bake while\n    // the hero stands the story; the understair closets while below.\n    this.drawStoreyLayer(world);\n    if (!VIS_ABLATE.has('doodads')) this.drawDoodads(world);\n    // THE DISSOLUTION GRAMMAR (vis/dissolveLayer.ts): the flying fragments of\n    // every live break — over the ground and the standing furniture, under\n    // bodies — plus the pre-crack growing on pressed give-way faces. Both gate\n    // on empty state first: zero cost while nothing breaks.\n    if (!VIS_ABLATE.has('doodads')) {\n      drawDissolves(this.ctx, world, this.cam.x, this.cam.y, vw, vh); // sweeps its set cache, then returns on an empty list\n      drawDissolveCracks(this.ctx, world);\n      drawEmergences(this.ctx, world, this.cam.x, this.cam.y, vw, vh, rec => {\n        if (rec.recoveryCueTier === undefined) return true;\n        const body = world.actorById(rec.actorId);\n        return !!body && !body.dead && this.anatomyCueVisible(body, world)\n          && this.companionCuePointVisible(rec.pos, rec.recoveryCueTier, world);\n      }); // Recovery ground shares obey the same body and story gates.\n    }\n    // TRACK RIDERS: the moving hazards, posed from the shared clock through\n    // the one painter registry — over the ground and grooves, under actors.\n    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrackRiders(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    if (!VIS_ABLATE.has('motionfx')) {\n      this.updateMotionFx(world);\n      this.drawMotionFx();   // wake ripples + snow pocks, over grounds, under actors\n    }\n    this.drawAirPockets(world);     // underwater: round air-pocket wash + rising bubbles\n    this.drawAltars(world);\n    this.drawShrines(world);\n    this.drawChests(world);\n    this.drawFonts(world);\n    this.drawWaypoint(world);\n    this.drawDownReads(world);     // THE PARTY THAT READS: a held down's wipe radius, its bleed-out, your own revive fill\n    this.drawHuntFootprint(world); // beast tracks to dwell on (the Hunt)\n    this.drawAmalgamPicks(world);  // the Bonewright's body-part choice spots\n    // Resolve attention once before both its ground cues and actor labels.\n    this.speechFocusLines.clear();\n    this.speechApproach = null;\n    this.dialogueVisibleSpeaker = null;\n    if (!VIS_ABLATE.has('actors')) {\n      for (const line of world.npcSpeechView(!this.dialogueReaderEnabled() || this.npcDialogueAvailable(),\n        this.speechPointerHits(world), this.dialogueReaderEnabled() ? this.npcDialogueOwner() : null)) this.speechFocusLines.set(line.a, line);\n      if (VIS_CFG.speechApproach.enabled && (!this.dialogueReaderEnabled() || this.npcDialogueAvailable())\n        && ![...this.speechFocusLines.values()].some(line => line.seatId === world.localSeat.id))\n        this.speechApproach = world.speechApproachHint();\n    }\n    this.drawDwellTells(world);    // THE DWELL TELL: the base ring on every station/NPC in dwell range\n    this.drawCampfireHint(world);  // \"linger to refresh\" prompt by the town campfire\n    this.drawExits(world);\n    // THE LIVING FOG, body pass (vis/fogLayer.ts): under actors and combat\n    // telegraphs — the terrain mists over, the fight stays readable.\n    if (world.fog && !VIS_ABLATE.has('fog')) {\n      drawFogLayer(this.ctx, world.fog, 'under', this.cam.x, this.cam.y, vw, vh);\n    }\n    this.drawZones(world);\n    drawMagicPackEffects(this.ctx, world.magicPackEffects, world.time);\n    // TRACK WARN ARCS: the approach telegraph — with the un-exploded discs,\n    // under actors, sampling the riders' ACTUAL future along their lanes.\n    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrackWarnArcs(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE BROIL (vis/geyserLayer.ts): the geyser fabric's drawn warning —\n    // the water itself roiling under actors, off the same pure clock the\n    // column sweep and the dodge-AI read (drawn == tested).\n    if (world.geysers && !VIS_ABLATE.has('geysers')) {\n      drawGeyserBroil(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE VENT-RIDE's broil (vis/ventRideLayer.ts — LeapDelivery.vent): a\n    // vent-leaper's wind-up roils the ground under its OWN feet — the same\n    // roil word the vents wear, the same read the dodge-minds take. Under\n    // actors like every ground telegraph; no geyser field required (a\n    // vent-rider carries its column anywhere — THE NO-LOCK LAW).\n    if (!VIS_ABLATE.has('geysers')) {\n      drawVentRideBroil(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // TRAPWORK TELLS (vis/trapLayer.ts): hidden triggers resolve close-up\n    // for the LOCAL hero — the keen eye at a walk spots the odd flagstone.\n    if (world.trapworks.length && !VIS_ABLATE.has('tracks')) {\n      drawTrapworkTells(this.ctx, world, world.player.pos.x, world.player.pos.y);\n    }\n    this.drawDeathBursts(world);   // coalescing spore/orb gather + the tracking volatile orb\n    this.drawEncounters(world);    // breach diamonds + their growing fields (under actors)\n    this.drawFractures(world);     // fracture object / crawling fissure / chasm maw (under actors)\n    // THE WATCH FABRIC's drawn read (render/vis/watchLayer.ts): sense fans\n    // + followed trails, under bodies like every ground read. Reach folds\n    // vs the local hero; with no live seat there is nothing to fold against.\n    if (world.seats.length) {\n      drawWatchSense(this.ctx, world, world.player);\n      drawWatchTrails(this.ctx, world);\n    }\n    this.drawAuras(world);\n    this.drawCorpses(world);\n    this.drawPlayerCorpses(world);\n    this.drawMovementMarkers(world);\n    this.drawTownPortals(world);\n    this.drawDrops(world);\n    this.drawResourceOrbs(world);\n    this.drawResourceFlows(world);\n    this.drawRemnants(world);\n    for (const f of world.flashes) {\n      if (f.feedingCue && !this.feedingTransferVisible(f.pos, f.feedingCue, world)) continue;\n      const recoveryCueTier = f.recoveryCueTier ?? f.companionCue?.tier;\n      if (recoveryCueTier !== undefined && !this.companionCuePointVisible(f.pos, recoveryCueTier, world)) continue;\n      if (f.movement && f.movement.points.some(p => !this.companionCuePointVisible(p, recoveryCueTier ?? 0, world))) continue;\n      if (f.companionCue?.from && !this.companionCuePointVisible(f.companionCue.from, f.companionCue.from.tier, world)) continue;\n      this.drawTerrainFlash(f, world);\n    }\n    this.drawCompanionCues(world);\n    this.combatMeters.begin(world.time, this.getSettings?.().crowdedMeters ?? VIS_CFG.combatFocus.meters.enabled);\n    // THE PACK LAYER's drawn bonds (engine/pack.ts): the warden's lines to\n    // every body it is actually empowering — over the ground reads, UNDER\n    // the bodies they bind (a link is context for a silhouette, never a\n    // thing that occludes one). The sight veil composites above both, so a\n    // bond behind a wall hides exactly like the wardens holding it.\n    if (!VIS_ABLATE.has('actors')) {\n      this.drawPackLinks(world);\n      drawWardLinks(ctx, world.actors, world.player, world.time);\n      for (const a of world.actors) if (!a.dead) {\n        drawPayloadPlacements(ctx, payloadCueRows(a, world), p =>\n          p.tier === (world.player.tier ?? 0)\n          || (world.zone.tiers?.exposure !== 'covered' && !(this.stacked.length && this.inStack(p)))\n          || !!(world.walk?.regionAt && tierLinkOf(world.walk.regionAt(p.x, p.y))));\n      }\n    }\n    if (!VIS_ABLATE.has('actors')) {\n      // THE LITE TIER (engine/lite.ts): the crowd blits UNDER real bodies —\n      // one composited sprite per body, no per-body state churn.\n      this.drawLite(world, vw, vh);\n      for (const a of world.actors) if (!a.dead && a.worm) this.drawWormTail(a, world.time, world);\n      for (const a of world.actors) if (!a.dead) this.drawActor(a, world);\n      this.combatMeters.paint(ctx);\n      if (world.deathPresentation) drawPlayerDeath(this.ctx, world.player, world.deathPresentation, world.time);\n      // THE STATUS VOICE (vis/statusVoiceLayer.ts): what just LANDED on a\n      // body is drawn ON it — the frame-diff of each body's statuses plays\n      // the family voice over the body; off-screen landings stay silent.\n      drawStatusVoices(this.ctx, world, this.frameDt, this.cam.x, this.cam.y, vw, vh);\n      for (const a of world.actors) if (!a.dead && a.nemesis) this.drawNemesisMark(a);\n    }\n    drawCreepers(this.ctx, world);\n    drawSatellites(this.ctx, world);\n    drawGuardArts(this.ctx, world);\n    drawAuroras(this.ctx, world);\n    drawGuardians(this.ctx, world);\n    this.drawProjectiles(world);\n    // THE COLUMN + THE PLUME + THE LOB COMETS (vis/geyserLayer.ts): the\n    // spout wraps whoever stands in it, so it draws OVER bodies — and\n    // UNDER the sight veil, so a column behind a wall hides whole.\n    if (world.geysers && !VIS_ABLATE.has('geysers')) {\n      drawGeyserColumns(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE VENT-RIDE's jet (vis/ventRideLayer.ts): the steam column a rising\n    // vent-leaper left at its departure, drawn OVER bodies like the vents'\n    // own spouts, UNDER the veil.\n    if (!VIS_ABLATE.has('geysers')) {\n      drawVentRideJets(this.ctx, world, this.cam.x, this.cam.y, vw, vh);\n    }\n    // THE SIGHT VEIL (vis/sightVeil.ts): positional occlusion — everything\n    // the hero's eye cannot reach past a sight-blocking body veils dark with\n    // the ground it stands on. OVER actors/projectiles (what a wall hides is\n    // hidden whole), UNDER canopies (crowns stay lit). Roofs join through\n    // THE HULL LAW: every STANDING roof's rects read solid to the veil (an\n    // open doorway must not lance a wedge across a concealed interior), and\n    // drawRoofs re-composites the sheet over its own pixels (roofMul) so an\n    // occluded structure reads as ONE contiguous dark mass. Composites at\n    // identity through the same effective camera as the light layer.\n    // Visibility was resolved before the world pass; only pixels composite here.\n    this.sightVeil.draw(this.ctx, this.cam.x - shx, this.cam.y - shy, z, w, h);\n    if (!VIS_ABLATE.has('doodads')) this.drawRaisedDoodads(world);\n    if (!VIS_ABLATE.has('doodads')) this.drawCanopies(world); // fake-2D depth: crowns above actors, faded near the hero\n    if (!VIS_ABLATE.has('doodads')) this.drawCanopyEyes(world); // the roof's regard — gone wherever you're near\n    // THE LIVING FOG, tall pass: the lifted share of each bank wraps bodies\n    // walking deep inside — over crowns, still under roofs and labels.\n    if (world.fog && !VIS_ABLATE.has('fog')) {\n      drawFogLayer(this.ctx, world.fog, 'over', this.cam.x, this.cam.y, vw, vh);\n    }\n    this.drawRoofs(world);         // structure roofs: interiors reveal only when you're inside\n\n    ctx.restore();\n    if (cooperative) yield;\n\n    // THE ROOM VEIL: interior confinement — inside a confining structure the\n    // world beyond the room is unseen (labels gate through veiledAt; the"
        }
      ]
    }
  ],
  "readers": [
    {
      "file": "balance/nativeSeamlessConsolidationFixture.ts",
      "before": "6ea704179f6a2a8a4ee678a6d812f7b1f486f3db03f7e0ad2e3a7c530725dc8d",
      "after": "011fffd681dd578c53003d314b0e5fef59319db756ec61a2b57b1bb75551ace1",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import * as fs from './nativeLoadingResponsivenessFS';"
        }
      ],
      "original": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport {nativeSeamlessConsolidationArchive as archive} from './nativeSeamlessConsolidationArchive';\nconst hash=(text:string)=>createHash('sha256').update(text).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n');\nconst rows=new Map(archive.rows.map(row=>[row.file,row]));\n// Only descriptors opened through this finite historical source view are\n// projected. Untracked descriptors remain native. Close view-owned descriptors\n// through this view: external close/reopen of the same file identity cannot be\n// distinguished by native fd APIs. Reuse for a different file is detected.\n// Reads consume the native descriptor position; partial/repeated source reads\n// fail the whole-source guard. No seek, reread or replacement descriptor occurs.\nconst descriptors=new Map<number,{key:string;dev:bigint;ino:bigint}>();\nexport const openNativeSeamlessConsolidation=((...args:Parameters<typeof fs.openSync>):number=>{\n const fd=fs.openSync(...args);descriptors.delete(fd);const key=sourceKey(args[0]);if(key&&rows.has(key)){const {dev,ino}=fs.fstatSync(fd,{bigint:true});descriptors.set(fd,{key,dev,ino});}return fd;\n}) as typeof fs.openSync;\nexport const closeNativeSeamlessConsolidation=((fd:number):void=>{\n try{fs.closeSync(fd);}finally{descriptors.delete(fd);}\n}) as typeof fs.closeSync;\n/** Exact pinned5a source view before all its unchanged historical checks. */\nexport function beforeNativeSeamlessConsolidation(file:string,input:string):string {\n const row=rows.get(file);if(!row)return input;\n let source=normal(input);if(hash(source)!==row.beforeHash){\n  assert.equal(hash(source),row.afterHash,'Unknown exact native seamless consolidation source: '+file);\n  for(const hunk of row.hunks){assert.equal(source.split(hunk.after).length,2,'Unique native seamless consolidation hunk');source=source.replace(hunk.after,()=>hunk.before);}\n  assert.equal(hash(source),row.beforeHash,'Complete pinned5a predecessor: '+file);\n }\n let line=0;return source.replace(/\\n/g,()=>row.crlfLines.includes(line++)?'\\r\\n':'\\n');\n}\nfunction sourceKey(file:fs.PathOrFileDescriptor):string|undefined {\n if(typeof file==='number'){const row=descriptors.get(file);if(!row)return undefined;const {dev,ino}=fs.fstatSync(file,{bigint:true});if(dev!==row.dev||ino!==row.ino){descriptors.delete(file);return undefined;}return row.key;}\n const value=typeof file==='string'?file:Buffer.isBuffer(file)?file.toString():fileURLToPath(file);\n return path.relative(fileURLToPath(new URL('../',import.meta.url)),path.resolve(value)).replaceAll('\\\\','/');\n}\nexport const readNativeSeamlessConsolidation=((file:fs.PathOrFileDescriptor,options?:BufferEncoding|{encoding?:BufferEncoding|null;flag?:string}|null):string|Buffer=>{\n const raw=fs.readFileSync(file,options),key=sourceKey(file);if(key===undefined||!rows.has(key))return raw;\n const encoding=typeof options==='string'?options:options?.encoding;assert(encoding==null||encoding==='utf8'||encoding==='utf-8','seamless consolidation source requires UTF-8 or raw bytes');\n const before=beforeNativeSeamlessConsolidation(key,Buffer.isBuffer(raw)?raw.toString('utf8'):raw);return Buffer.isBuffer(raw)?Buffer.from(before,'utf8'):before;\n}) as typeof fs.readFileSync;\r\n",
      "nonImportHash": "04b2b111e67128d2770628d390bbfa4b5c95b4bb5fd080ce4babd98ad39e9e47",
      "assertionHash": "3e08af064e3e3dfa91ba90198262ab392b5a9d83e82f176540b7c90b1ea3a567",
      "assertions": 4
    },
    {
      "file": "balance/check_seamlessconsolidationsource.ts",
      "before": "126bccab55703e7b46776fa78f83ee40d378f7c67c0c0c8cbc47454ad3cd9c59",
      "after": "e38138176fe62976cff6c6fb42d92f56e762042a4ece8a2c62d0cb9366aab8d9",
      "edits": [
        {
          "before": "import fs from 'node:fs';",
          "after": "import * as fs from './nativeLoadingResponsivenessFS';"
        }
      ],
      "original": "import assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {fileURLToPath} from 'node:url';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport * as oldFs from 'node:fs';\nimport * as boundaryFs from './nativeSeamlessConsolidationFS';\nimport {nativeSeamlessConsolidationArchive as archive} from './nativeSeamlessConsolidationArchive';\nimport {beforeNativeSeamlessConsolidation as before,readNativeSeamlessConsolidation as rawRead} from './nativeSeamlessConsolidationFixture';\nconst hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex'),normal=(text:string)=>text.replace(/\\r\\n?/g,'\\n'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');\nlet mutations=0,hunkMutations=0,duplicates=0,wrongFiles=0,eol=0,rawReads=0,assertions=0,exports=0;\nfor(const row of archive.rows){const source=read(row.file),parent=before(row.file,source);assert.equal(hash(source),row.rawAfterHash);assert.equal(hash(parent),row.rawBeforeHash);assert.equal(before(row.file,parent),parent);\n for(const variant of[normal(source),normal(source).replace(/\\n/g,'\\r\\n'),normal(parent),normal(parent).replace(/\\n/g,'\\r\\n')]){assert.equal(before(row.file,variant),parent);eol++;}\n for(const version of[source,parent])for(const at of[0,Math.floor(version.length/2),version.length]){assert.throws(()=>before(row.file,version.slice(0,at)+' unauthorized '+version.slice(at)),/Unknown exact/);mutations++;}\n for(const hunk of row.hunks)for(const at of[0,Math.floor(hunk.after.length/2),hunk.after.length]){const modified=hunk.after.slice(0,at)+' unauthorized '+hunk.after.slice(at);assert.throws(()=>before(row.file,normal(source).replace(hunk.after,()=>modified)),/Unknown exact/);hunkMutations++;}\n assert.throws(()=>before(row.file,source+source),/Unknown exact/);duplicates++;assert.equal(before('outside/'+row.file,source),source);\n const other=archive.rows.find(r=>r.file!==row.file&&r.afterHash!==row.afterHash&&r.beforeHash!==row.afterHash);assert(other);assert.throws(()=>before(other.file,source),/Unknown exact/);wrongFiles++;\n const url=new URL('../'+row.file,import.meta.url),file=fileURLToPath(url);for(const form of[url,file,Buffer.from(file)]){assert.equal(rawRead(form,'utf8'),parent);assert.equal(rawRead(form,'utf-8'),parent);assert.equal(rawRead(form,{encoding:'utf8'}),parent);assert.deepEqual(rawRead(form),Buffer.from(parent));rawReads+=4;}\n const fd=fs.openSync(file,'r');try{assert.equal(rawRead(fd,'utf8'),source);rawReads++;}finally{fs.closeSync(fd);}\n}\nfor(const row of archive.readers){const source=read(row.file);assert.equal(hash(source),row.after);let prior=source;for(const edit of[...row.edits].reverse()){assert.equal(prior.split(edit.after).length,2);prior=prior.replace(edit.after,edit.before);}assert.equal(prior,row.original,'Complete original source reader');assert.equal(hash(prior),row.before);\n const tree=ts.createSourceFile(row.file,source,99,true),nonImports=tree.statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>n.getText(tree)),calls:string[]=[];assert.equal(hash(JSON.stringify(nonImports)),row.nonImportHash);const visit=(node:ts.Node):void=>{if(ts.isCallExpression(node)&&/^(assert(?:\\.|$)|must$|check$)/.test(node.expression.getText(tree)))calls.push(node.getText(tree));ts.forEachChild(node,visit);};visit(tree);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assert.equal(calls.length,row.assertions);assertions+=calls.length;\n}\nassert(read('balance/probe_nativeamalgamationstagesource.ts').includes(\"import * as oldFs from 'node:fs';\"),'Historical source proof keeps its native identity oracle');\nfor(const row of archive.archives)assert.equal(hash(read(row.file)),row.sha256,'Unchanged prior archive '+row.file);\nfor(const row of archive.runtime)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Actual final runtime '+row.file);\nfor(const row of archive.accepted)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Exact accepted incoming target '+row.file);\nfor(const row of archive.unchanged)assert.equal(hash(fs.readFileSync(new URL('../'+row.file,import.meta.url))),row.sha256,'Unchanged pinned5a file '+row.file);\nconst roster=read('balance/proberoster.ts');for(const probe of archive.probes)assert.equal(roster.split(\"probe: '\"+probe+\"'\").length,2,'Single genuine probe enrollment');\nfor(const key of Object.keys(oldFs)){if(key==='default'||key==='readFileSync'||key==='openSync'||key==='closeSync')continue;assert.equal(Reflect.get(boundaryFs,key),Reflect.get(oldFs,key),'Unrelated native filesystem export '+key);exports++;}\n// The inherited source proof opens through this view; its fd and path reads\n// must observe the same exact parent, without changing its original assertion.\nfor(const row of archive.rows){const url=new URL('../'+row.file,import.meta.url),file=fileURLToPath(url),parent=before(row.file,read(row.file));\n for(const form of [url,file,Buffer.from(file)])for(const encoding of ['utf8','utf-8',{encoding:'utf8'},null] as const){\n  const fd=boundaryFs.openSync(form,'r');try{const got=rawRead(fd,encoding);assert.deepEqual(got,encoding?parent:Buffer.from(parent));assert.throws(()=>rawRead(fd,'utf8'),/Unknown exact/,'consumed source fd refuses a repeated partial source');}finally{boundaryFs.closeSync(fd);}\n }\n const partial=boundaryFs.openSync(file,'r');try{const one=Buffer.alloc(1);assert.equal(fs.readSync(partial,one,0,1,null),1);assert.throws(()=>rawRead(partial,'utf8'),/Unknown exact/,'partially consumed source is refused');assert.equal(fs.readSync(partial,one,0,1,null),0,'failed validation does not reset native fd position');}finally{boundaryFs.closeSync(partial);}\n}\nconst binary=new URL('./reports/native-seamless-consolidation.bin',import.meta.url),bytes=Buffer.from([0,255,128,254,13,10]);fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(binary,bytes);assert.deepEqual(rawRead(binary),bytes);assert.equal(rawRead(binary,'latin1'),bytes.toString('latin1'));assert.equal(before('outside','unchanged'),'unchanged');\nconst nativeBinary=boundaryFs.openSync(binary,'r');try{assert.deepEqual(rawRead(nativeBinary),bytes);}finally{boundaryFs.closeSync(nativeBinary);}\nconst trackedPath=new URL('../'+archive.rows[0].file,import.meta.url),closed=boundaryFs.openSync(trackedPath,'r');boundaryFs.closeSync(closed);\nassert.throws(()=>rawRead(closed),/EBADF/,'closed descriptor retains native failure');\nconst reused=fs.openSync(binary,'r');try{assert.deepEqual(rawRead(reused),bytes,'untracked descriptor after close is native');}finally{fs.closeSync(reused);}\nconst externallyClosed=boundaryFs.openSync(trackedPath,'r');fs.closeSync(externallyClosed);\nassert.throws(()=>boundaryFs.closeSync(externallyClosed),/EBADF/,'failed close retains native error');\nconst reusedAfterFailure=fs.openSync(binary,'r');try{assert.deepEqual(rawRead(reusedAfterFailure),bytes,'failed close clears only source-view tracking');}finally{fs.closeSync(reusedAfterFailure);}\n// Even when a caller bypasses the view's close, another file never inherits\n// its source projection when the OS recycles the numeric descriptor.\nlet externalReuse=0;for(const open of [boundaryFs.openSync,fs.openSync]){\n const tracked=boundaryFs.openSync(trackedPath,'r');fs.closeSync(tracked);\n const actual=open(binary,'r');try{if(actual===tracked)externalReuse++;assert.deepEqual(rawRead(actual),bytes,'external close and non-source reopen cannot inherit a source view');}finally{boundaryFs.closeSync(actual);}\n}\nassert.equal(externalReuse,2,'both genuine descriptor-reuse paths exercised');\nconst result={rows:archive.rows.length,mutations,hunkMutations,duplicates,wrongFiles,eol,rawReads,readers:archive.readers.length,originalAssertions:assertions,oldArchives:archive.archives.length,actualRuntime:archive.runtime.length,exactIncomingTargets:archive.accepted.length,unchangedParentFiles:archive.unchanged.length,enrolled:archive.probes.length,unrelatedFsExports:exports,unrelatedBinaryPreserved:true};fs.writeFileSync(new URL('./reports/native-seamless-consolidation-source.json',import.meta.url),JSON.stringify(result,null,2)+'\\n');console.log('PASS native seamless consolidation source',JSON.stringify(result));\r\n",
      "nonImportHash": "2c993dd1e69ce8452411e92d5d67d6ba8f885a7bd1b4005dc3e72bf0c3928b7a",
      "assertionHash": "5338c306539e85be2191c8a13d93e6bf0fdd9018aac4aae66b014627a9380f8c",
      "assertions": 44
    }
  ],
  "archives": [
    {
      "file": "balance/nativeActiveDescentArchive.ts",
      "sha256": "2cc00a0f0582cf2ff5273a2fcadcb4f6d77cfb677d9582112e1e5e5d78adfae8"
    },
    {
      "file": "balance/nativeAdmissionCompositionArchive.ts",
      "sha256": "4aa3ecff37b3f7d888299701b65647c0ca2eb4b4a4f46d0999c7c898b57d3b1d"
    },
    {
      "file": "balance/nativeAICompositionArchive.ts",
      "sha256": "9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f"
    },
    {
      "file": "balance/nativeAITargetContinuityArchive.ts",
      "sha256": "4743046af09dc6112165f47f6b399eec9d1bab644cf5f174a2d2068fbde31e0a"
    },
    {
      "file": "balance/nativeAmalgamationStageArchive.ts",
      "sha256": "48528ec62621be10c8fedcd035e32f3fc09b28147201ee5333b1ef5d0ff64f04"
    },
    {
      "file": "balance/nativeAreaMenuArchive.ts",
      "sha256": "0cbd9c2d9450dd3d9b653b391a718a8abf308b4d0defad541da08167d973b870"
    },
    {
      "file": "balance/nativeAreaPublicationArchive.ts",
      "sha256": "2af6f41679ef425c1a56aa8b837be289d2006ae7057c927e7fe99fc0842efa48"
    },
    {
      "file": "balance/nativeAreaUIActionArchive.ts",
      "sha256": "1b22b430fb8a9e5569656e3334b23563c8f2dbacea2bf15948326cc213e073a8"
    },
    {
      "file": "balance/nativeAreaViewQueryArchive.ts",
      "sha256": "12eaec6fe7d4de0d49a483dec51765f8a43d23ebfddd43c9aa8b4e2b7d9a8a31"
    },
    {
      "file": "balance/nativeArrivalCompositionArchive.ts",
      "sha256": "ef4411ee9b54d9608d2e6c7870e97f7c10328cbdbf5a3d09654b5b0493b9ce40"
    },
    {
      "file": "balance/nativeBirthLifetimeArchive.ts",
      "sha256": "321d3adac731c07ab921d65b243b507dbdb090f526fbf8ebfff9049337298a22"
    },
    {
      "file": "balance/nativeBirthLifetimeSourceArchive.ts",
      "sha256": "07c68824930c715eb9da12a6e060b39b01048456dbd33c52df7a3dcf4d45fb6c"
    },
    {
      "file": "balance/nativeBountyArrivalArchive.ts",
      "sha256": "37575f470131363aa00d387ab5f6b6707aed2dc740f441859d6b5bc6e48ffe5b"
    },
    {
      "file": "balance/nativeBrowserEntryCompositionArchive.ts",
      "sha256": "0c432b547b9aad768a2c950d7c9c9f080cca2e24b647a4755dd9d56c6f0e3918"
    },
    {
      "file": "balance/nativeBrowserHostedCompositionArchive.ts",
      "sha256": "00627e3c5c66e35bec3be42d0afac343a8335ef75d5ebaea31f1e8b3c31582e6"
    },
    {
      "file": "balance/nativeCampaignCompositionArchive.ts",
      "sha256": "435834a0d1ef0bfcebb3bcb35d328ac5c488e1d2cfcd456305c24de598ba460a"
    },
    {
      "file": "balance/nativeCaravanCompositionArchive.ts",
      "sha256": "3b17477db84246c21cd0c72aa1135e3776502f4480fbc77ad004bd8ae826ccb4"
    },
    {
      "file": "balance/nativeCaravanExtractedReadArchive.ts",
      "sha256": "bf891b3e2e85efb447bf2a6c2d16981d75dc9ca67e8f96ffa5571ad77be40ea0"
    },
    {
      "file": "balance/nativeCaravanNewsArchive.ts",
      "sha256": "c3bf9d38e69cd006feb52d4a208591486b2ad7aacbb87b5c6c3f7324c00bf37f"
    },
    {
      "file": "balance/nativeCarriedAdmissionFinalArchive.ts",
      "sha256": "48e5501c1cf3fb9c691c5c2b15ea946c95e7e42b2d2d887be4941c37ff10ad32"
    },
    {
      "file": "balance/nativeCarriedControlArchive.ts",
      "sha256": "a734e47ca7548e045b428221b03bce6c69ee167b68f58b67fd931597bcd36f66"
    },
    {
      "file": "balance/nativeClientConclusionCompositionArchive.ts",
      "sha256": "1c70e2bc5319ab015c52af1a950129a4a219097cc527fb5fa5de85221db07b41"
    },
    {
      "file": "balance/nativeClientContinueArchive.ts",
      "sha256": "0e4091d7c095fea24ec6e36d57f42118f856915721fdbbf1816e60f1296f4fb0"
    },
    {
      "file": "balance/nativeClientContinuityCompositionArchive.ts",
      "sha256": "acc61c797fa225b7760a6d2e1792d036db8eaf4fc760f4a9857cd3a1fdeac945"
    },
    {
      "file": "balance/nativeClientMenuCompositionArchive.ts",
      "sha256": "efd75a960bcc25da8cad27d8d5f0cb19132f60e0f07ac7b14b856b73f72de496"
    },
    {
      "file": "balance/nativeClientPublicationCompositionArchive.ts",
      "sha256": "e5a371c6b597b3d287e40633c221d921778088537156d27f9eb6916fbb96b34f"
    },
    {
      "file": "balance/nativeClientRuntimeArchive.ts",
      "sha256": "f2cc42ac508a641419bd762bca04c1b5376432570cf2fb8ece8f1b2b9ad6f30a"
    },
    {
      "file": "balance/nativeClientStartActionsCompositionArchive.ts",
      "sha256": "c396defb8e4c12c908481365c387877eadf21c325015949b53aebf20511c40e1"
    },
    {
      "file": "balance/nativeClientStartArchive.ts",
      "sha256": "f6d4685b778c1f0bfa5123a9ce6cb8ccf7fb52cbec978c4035265f151945345f"
    },
    {
      "file": "balance/nativeClientStartMenuCompositionArchive.ts",
      "sha256": "082eec02642c97233e58f9559a80792e81d4580c5437b46582973f6a591be9a1"
    },
    {
      "file": "balance/nativeCombatLeafVisualArchive.ts",
      "sha256": "bdb7b256c80fb2b3ae391cce76c70504506523c85b50f1e1bf3ca8092687f505"
    },
    {
      "file": "balance/nativeCombatPresentationArchive.ts",
      "sha256": "423d2ae8c65f92c34820c457fa666cd24dbec865127c6a163b24296ea1da315c"
    },
    {
      "file": "balance/nativeCompleteBirthArchive.ts",
      "sha256": "f30b214f0695f6121e0ec503f399af0a908975efb5520502c0baf47a3655f206"
    },
    {
      "file": "balance/nativeConclaveCompositionArchive.ts",
      "sha256": "48a1c1497986350fb1a5e0552684b5a607964325c0f72be5df9dde5c66d2f6bb"
    },
    {
      "file": "balance/nativeContinuityCompositionArchive.ts",
      "sha256": "fd76bb64e449e2b7401f62cb87effacf74966e8bdc585237c01996beea084405"
    },
    {
      "file": "balance/nativeCouchJoinLifetimeArchive.ts",
      "sha256": "322372701694276912e31418a83547b0903aa67c00f65aa0c7b3f22095ae619e"
    },
    {
      "file": "balance/nativeCrusadeTerrainArchive.ts",
      "sha256": "f093dfdad3fbdec6eabfb1471b246a52d372b7ec95e36cface0c5497cbe80f16"
    },
    {
      "file": "balance/nativeDelayedArrivalSourceArchive.ts",
      "sha256": "0e3542f31ff53651d5508f626e0367ba966e05d77791364170ae551238f3289d"
    },
    {
      "file": "balance/nativeDimensionCatalogArchive.ts",
      "sha256": "8d1c7d5bd6139cc1f5cb9bbd48560401e0ab88a742569cf3e09f17865679d107"
    },
    {
      "file": "balance/nativeDirectorBirthSourceArchive.ts",
      "sha256": "0038617d587101a650b2dadd757a1befd4263fa5e3635523a318f215afa8e112"
    },
    {
      "file": "balance/nativeEncounterArrivalSourceArchive.ts",
      "sha256": "6e8047eaa9ca5b269a1ba67822d18d885fcc7196d8e849c130decc09b554b3ed"
    },
    {
      "file": "balance/nativeEncounterInsertionSourceArchive.ts",
      "sha256": "9b35ac0c14cdac1a751c87a0d7b0a936e02d3352bcdf24585776d0f128c503e6"
    },
    {
      "file": "balance/nativeExactAnchorArchive.ts",
      "sha256": "b284b8a270d8db0c69cff2104e4e503ff791c99a2c8963e2525629bfeb78b49d"
    },
    {
      "file": "balance/nativeFractureCompositionArchive.ts",
      "sha256": "2feba0bba34ebfe31fa6979d4c223b392fdf04d78d548471a0863a4bb68c3eb6"
    },
    {
      "file": "balance/nativeFrameContactSourceArchive.ts",
      "sha256": "c75a7696e3a5e0097caeb6ce19158840f113b2ca0882d3c2a1c803e66c0edceb"
    },
    {
      "file": "balance/nativeFramePhysicalSeatsArchive.ts",
      "sha256": "2fe68045e1da5b1651b28d00d3819afc1b753506f15b798769436fc6760f24db"
    },
    {
      "file": "balance/nativeGraphArchive.ts",
      "sha256": "3d4391ed68d981594de329fe47620929953308584da7bb6801fdf5c72e6ed84e"
    },
    {
      "file": "balance/nativeGroundCurrentSourceArchive.ts",
      "sha256": "0dab06bf2a2e8030ad4687fe8e28ce6bb822df036af049cfc0e165645fbbbba5"
    },
    {
      "file": "balance/nativeGroundFollowUpsOwnerArchive.ts",
      "sha256": "f68e036be0fa1dd1adeed16e901d8cf13b210d4ce15d36611f361bf0b8d3d51b"
    },
    {
      "file": "balance/nativeHarborArrivalArchive.ts",
      "sha256": "187b2fcd938e020a007e625b7067a79417b147cc71c4c9c1c894bb5d25b49842"
    },
    {
      "file": "balance/nativeHarborServicesArchive.ts",
      "sha256": "4cea3e4ab48004810401c6383ecf7fe0aba47d5bcd2a40f68084528147ead2a8"
    },
    {
      "file": "balance/nativeHistoricalCleaveArchive.ts",
      "sha256": "baecb1b47520fae584f6e7f1f23e8a8cb155040aec49c7c75a335642f55b7ecd"
    },
    {
      "file": "balance/nativeHistoricalConcealmentArchive.ts",
      "sha256": "1749618f0aab8fb81bdc6fa982bf4a5176f945fd853913fd7052cc3f2c28f53c"
    },
    {
      "file": "balance/nativeHistoryArrivalArchive.ts",
      "sha256": "04b08574d23dd360dd6dfbc20fc3a9b7764f75e7a86c8c14780c657fe53ba450"
    },
    {
      "file": "balance/nativeHostClosureArchive.ts",
      "sha256": "9c79682e31cc6f743c25799e376668742526a9714fa0d1484962001ab6f4114e"
    },
    {
      "file": "balance/nativeHostedPublicationArchive.ts",
      "sha256": "8eaf39d21fd8a54a6d1f600c1fff912913e2ed3e14ca58a0591969aade473858"
    },
    {
      "file": "balance/nativeHostPerformanceArchive.ts",
      "sha256": "fa23475869c4d5a204aeeb45edfc8b16973e9db8541cf5196587681fe4a76607"
    },
    {
      "file": "balance/nativeHuntMigrationArchive.ts",
      "sha256": "be9e859a9ef5713ee23cb06d7dc715debdd48eccec9e3484811ef9ff8413d1d5"
    },
    {
      "file": "balance/nativeInstalledSourcesArchive.ts",
      "sha256": "5a7edcd9e8696e6a1387fdc120309e9be1cbbc50deb373584c1c14ced9629b16"
    },
    {
      "file": "balance/nativeJourneyCompositionArchive.ts",
      "sha256": "ad8a0fd9aa37cf34b9e29f73fe168735dc8cd88d0ab53bc21402b816c16c5e07"
    },
    {
      "file": "balance/nativeLiveSiteArchive.ts",
      "sha256": "fdf1af8f0add679d6787112999272e4126fe7afd9ee9432b2b89c30a4c5b57b8"
    },
    {
      "file": "balance/nativeLocalInputArchive.ts",
      "sha256": "b4def88aa507c45fa70882fbd4d08cce9e8f8bd4b6a491e617427d2dd04f355a"
    },
    {
      "file": "balance/nativeLocalInputFinalArchive.ts",
      "sha256": "4cc21d1012b1b0fc6dc8a3aa99bc635602048d0399fb1c115e571cc1707cee4f"
    },
    {
      "file": "balance/nativeMainCastSourceArchive.ts",
      "sha256": "fa34fce7eed513ec0394bcf5dca88fa68fe2df1ddaa6baa259e97a5984e118fe"
    },
    {
      "file": "balance/nativeMainContentArchive.ts",
      "sha256": "884c762fa9a0c4b54c0dd23185053763bab9d09aeed762bef55de0607f386604"
    },
    {
      "file": "balance/nativeMainHostCompositionArchive.ts",
      "sha256": "ce8cffeb63107d1cbb8a098ce55975beb27440a2afe0d7f92d29182be50e8c84"
    },
    {
      "file": "balance/nativeMainProofSourceArchive.ts",
      "sha256": "e946f50eaca9e98baea655f6b224bcbc4cb24dd1603a8370b296866c906bf441"
    },
    {
      "file": "balance/nativeMainRosterCancellationArchive.ts",
      "sha256": "7ca74e59120fcb55d685c89caed580a00430a195834c1df2d255a64e5baa9726"
    },
    {
      "file": "balance/nativeMainVisualSourceArchive.ts",
      "sha256": "336b4c66cbcbab84ef987cb559176fc62766da79943b32afe7a4c0c999e5e49d"
    },
    {
      "file": "balance/nativeNearScaleSelectionArchive.ts",
      "sha256": "536e486c5ebc7298de5072a93311b5bf98fec9e34b285197a2ae6c39a68f86c5"
    },
    {
      "file": "balance/nativeNemesisDepartureArchive.ts",
      "sha256": "4a5608bb4d572ec0bb08950c1408850465c86f9ba189c7d4147bc64c41d68e9c"
    },
    {
      "file": "balance/nativeOdysseyGroundAdmissionArchive.ts",
      "sha256": "9095fec65c4a2d8d90f9f2d3e8f59dfe265423bcf79c3d1fb79bd738dec82a92"
    },
    {
      "file": "balance/nativeOdysseyGroundArchive.ts",
      "sha256": "67ea0e0685bc04f90d1b978f5cb2b35a2b000dbd208772684e0db801d6eb1223"
    },
    {
      "file": "balance/nativeOdysseyHistoricalRescueArchive.ts",
      "sha256": "525e6dc6efa6c44ce16c7aa3c2c69a975fa4ae065cb61192bd276fd8296a57b4"
    },
    {
      "file": "balance/nativeOdysseyPressureArchive.ts",
      "sha256": "e106ad853f6a1a7328257860ad7caf363c24c8638c041ec894002897143ddfc1"
    },
    {
      "file": "balance/nativePartyArchive.ts",
      "sha256": "fd369d0b5060b2dfbd72e9e0c240c64d44915e09a6864976ccfbb456cb52b582"
    },
    {
      "file": "balance/nativePartyDeathArchive.ts",
      "sha256": "0c46f7d7e1add36add8a5c2303874b651bf4eeacd4e0f1ee754c52a4e89c981d"
    },
    {
      "file": "balance/nativeRealmContextArchive.ts",
      "sha256": "49c0c7a42e044f4cc03fe1dbfe695147675bbabb3c49ebe3d67a4a8f32621da6"
    },
    {
      "file": "balance/nativeRepeatEventArchive.ts",
      "sha256": "1c87579238125a790b59f430894d4786e9675927e3b099637713536ebef159e8"
    },
    {
      "file": "balance/nativeRescueAnchorArchive.ts",
      "sha256": "6572686b759dbbfb11f9dceee3fd72ff0236ad5b6b839091779a18b4c4bf5c05"
    },
    {
      "file": "balance/nativeRunConclusionArchive.ts",
      "sha256": "bbf69496104381ec9ffddc595831dc0686c3f0eb2b777d1b9097f93f8f6f920d"
    },
    {
      "file": "balance/nativeRuntimeBirthLifetimeArchive.ts",
      "sha256": "029c67b6bde5b515ec7a0e9557c6e5c44ec6eee6a8d429f7ed5d9304104c05e0"
    },
    {
      "file": "balance/nativeSaveWriteOrderArchive.ts",
      "sha256": "5899d18582e5a49d0b0f715a786a1d2c5801494998d25650b5a80d0d51d52b14"
    },
    {
      "file": "balance/nativeSceneAIArchive.ts",
      "sha256": "f4dd09eac0657d3ddc4ae5a36d90ebea962e88a3449d6746cb2dae18840bac7a"
    },
    {
      "file": "balance/nativeSceneCampaignFrameArchive.ts",
      "sha256": "543717c09b80875cb8f4c442120822f7a988630c508af0ac3f1531103a4970ad"
    },
    {
      "file": "balance/nativeSceneCampaignFrameAttendanceArchive.ts",
      "sha256": "4a2bdaaa534acaed565d04de385a9e116fe82bd6f48437b11e1b8680b5e83fd1"
    },
    {
      "file": "balance/nativeSceneCampaignFrameClosureArchive.ts",
      "sha256": "71cdc0f7a8e7d2aa674192274cbb2a41ff3125a4ef777e644ae6d03c92fb02eb"
    },
    {
      "file": "balance/nativeSceneCampaignTransitionsArchive.ts",
      "sha256": "d31a54e6c7177bf34df06c24aa1d184e018040f316680ece489212cae82a89da"
    },
    {
      "file": "balance/nativeSceneCastingPreparationArchive.ts",
      "sha256": "775a8850f3e03bb1b2a04fc3980f849c8073fb5c0866ac1565ff7aaeb8325b11"
    },
    {
      "file": "balance/nativeSceneCastingPreparationIntegrationArchive.ts",
      "sha256": "fe13fe988faedcac419c360438f845c521e7657c19651cecdc03fe993aa6d41a"
    },
    {
      "file": "balance/nativeSceneCombatCampaignArenaArchive.ts",
      "sha256": "192c5e134436bf3f628a60e7b5ed3dceb1e749e4d124c22b0a8c7c94c1a58160"
    },
    {
      "file": "balance/nativeSceneCombatHooksArchive.ts",
      "sha256": "e31a353e03e6e2ff16a18bbeb1b10b635d79f1661b48273cbb921a30bfcdc52e"
    },
    {
      "file": "balance/nativeSceneCombatKernelArchive.ts",
      "sha256": "bada0545f79d050bdb7e44bc5494348900acd334132550bb10517dd42d66e8af"
    },
    {
      "file": "balance/nativeSceneCombatMotionArchive.ts",
      "sha256": "e6ae0fa37ac1486d27efbcf9cdc272d6e1d2741709edfa6c9675c67a5ad1c69a"
    },
    {
      "file": "balance/nativeSceneCombatMotionHooksArchive.ts",
      "sha256": "dcd7676dfb0c3e9c89bf2ecb3dee5f61254637863327ea1df2a81cf2302ccc50"
    },
    {
      "file": "balance/nativeSceneCombatRecordSelectionArchive.ts",
      "sha256": "7437942fcc35bd859e0971c5934e4ad2663f341a729c0f9d166a12d395cc1a86"
    },
    {
      "file": "balance/nativeSceneCombatStateArchive.ts",
      "sha256": "ee2bc2ac3e89fd71d0eeed3d71ea5d8f83b4eb031c28d4133b2b7c61501c31df"
    },
    {
      "file": "balance/nativeSceneCombatStateIntegrationArchive.ts",
      "sha256": "7a8d0cb4acefe258a20e6b7822c932575ca6f21dc93913275e5d286b95871b22"
    },
    {
      "file": "balance/nativeSceneDefensePreparationArchive.ts",
      "sha256": "002e8c43fc805b7d3118f6f4ef1f55842a44b43590a939c5085f19981355837f"
    },
    {
      "file": "balance/nativeSceneDefensePreparationIntegrationArchive.ts",
      "sha256": "a62d978ae87d9474300403b5ee3aeb0db71877a04431868ec8d295f90aa91e02"
    },
    {
      "file": "balance/nativeSceneDisplacementArchive.ts",
      "sha256": "2891a29ea0ce99886e7ef9c36fc09a161ae597a10c0ba9a0052eb7ef0eb7f01a"
    },
    {
      "file": "balance/nativeSceneDisplacementIntegrationArchive.ts",
      "sha256": "b6c8afe0407a70b152fb1e7b37cbe016aa28b73f0cafa5bc1fd09c9951f3f8c2"
    },
    {
      "file": "balance/nativeSceneFrameArchive.ts",
      "sha256": "01134266002591568b9eabbbba6cb7dbe78602cf6481399331306e2b15dc2bba"
    },
    {
      "file": "balance/nativeSceneFrameAttendanceArchive.ts",
      "sha256": "6d3888269abd37eaf98165b0cc0248de83290971e1d5ea5f30c93378c4dcae71"
    },
    {
      "file": "balance/nativeSceneFrameCallbacksArchive.ts",
      "sha256": "19419cf13a54dca4e5e4420821645c957d45d0ab33a765e053cb35b4268844f0"
    },
    {
      "file": "balance/nativeSceneFrameClosureArchive.ts",
      "sha256": "d690f559cbfaf25045c37fae7058b22a86bdc955e18e39478f2c334a27f47c58"
    },
    {
      "file": "balance/nativeSceneFrameHooksArchive.ts",
      "sha256": "a874f9baafd85fa93e6f32272db2d3e18bfb16384df595d7f4d9b8eebd75e4b5"
    },
    {
      "file": "balance/nativeSceneFrameInterfacesArchive.ts",
      "sha256": "27cf07963bb4ea796de4217b8492a62cc07cdcb6fd9ed3a9955f4ae6c255dc77"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsArchive.ts",
      "sha256": "ac1e1765be90f0c04dc3a63f953f6b1dac664126f288ddf2e63b85835949e31c"
    },
    {
      "file": "balance/nativeSceneGroundFollowUpsIntegrationArchive.ts",
      "sha256": "f25d81b6680f7bc27391f5504d2bcd2cfa0d43d60fa6f35d0240faa5fec4b2d8"
    },
    {
      "file": "balance/nativeSceneInputArchive.ts",
      "sha256": "bef0e227ade30b6e4f64f6a10d22ce35ee56d2ed8cf5a4b34dc2270666b7e3b1"
    },
    {
      "file": "balance/nativeSceneKillAftermathArchive.ts",
      "sha256": "1ee10922ff568ef7f8537e9628298a4b69c3572d8534f209ce1ad7907fe80cf8"
    },
    {
      "file": "balance/nativeSceneKillAftermathIntegrationArchive.ts",
      "sha256": "b94e4d71694bee1bb2cd54c3a63c78c2d63dfab37f6d8a80c5cc5f7a35a8c7c7"
    },
    {
      "file": "balance/nativeSceneLootArchive.ts",
      "sha256": "c0aabffe690bd6c005f120b0305ad0544d09a113d94aaa0ac480ac5fa40dda20"
    },
    {
      "file": "balance/nativeSceneMemoryArchive.ts",
      "sha256": "184ccb97a58023fcf20eda1d47a40ae6a4e712baffa75f840f6609aa1c11ab5e"
    },
    {
      "file": "balance/nativeSceneObjectiveCompletionArchive.ts",
      "sha256": "b04f297e8543a496cb9df061640468d6659eb3d231db1695b250010128373cbe"
    },
    {
      "file": "balance/nativeSceneObjectiveWatchingArchive.ts",
      "sha256": "4cb5018b6f09bdd280a4df5e6087f18a31f8a2aa738ff9eda67104ccc3ea232d"
    },
    {
      "file": "balance/nativeSceneProgressionArchive.ts",
      "sha256": "25f3b69b5556b78c055c51cebc17cb4170084560b3b6fc503179249ade2d6a7f"
    },
    {
      "file": "balance/nativeSceneProjectileArchive.ts",
      "sha256": "4b693049351d73abd8b089ef37099e976373b301d4e294b5750c863648bf9b33"
    },
    {
      "file": "balance/nativeScenePuzzleArchive.ts",
      "sha256": "62f45e38950127f15c455e9ec99c3c54a30fd0e6f561ba4e97844f84a9ae0443"
    },
    {
      "file": "balance/nativeSceneQuestArchive.ts",
      "sha256": "b482df1bf726a1266f209ddf9ffc4147709c85885f3c0608c834a52ca4e0f12c"
    },
    {
      "file": "balance/nativeSceneQuestAuxArchive.ts",
      "sha256": "e869b8942bfb68eb0dfe3607f8c10290bdc926dab40515e83ce5534af20ab04a"
    },
    {
      "file": "balance/nativeSceneQuestInteractionArchive.ts",
      "sha256": "d747716c8691d549afe58302166dcc599bac1610d00e147933b3db194ba66062"
    },
    {
      "file": "balance/nativeSceneRestorationArchive.ts",
      "sha256": "a859c1c5558b2844645adff7ffc6f5e4882eed47dfc3dd8f41fb903776eef1b0"
    },
    {
      "file": "balance/nativeSceneRestorationIntegrationArchive.ts",
      "sha256": "334adceb41233a58f307c9497ddf850dca5ecb34020b28d9c70c6ef53c03e36b"
    },
    {
      "file": "balance/nativeSceneSummonPreparationArchive.ts",
      "sha256": "0caa0ae9bb250bea4c8a39b52e8baa2f3a2b712ef6063a46c0aa0b2900981c3c"
    },
    {
      "file": "balance/nativeSceneSummonPreparationIntegrationArchive.ts",
      "sha256": "0646c173036fe44562900ae35f740bdbabaaf236f6364e2c5260c2f5ccdbddca"
    },
    {
      "file": "balance/nativeSceneTetherArchive.ts",
      "sha256": "4fcf252ff97bed0954e2b0557a0b6ec310932f9047da336c916fab6ca897b101"
    },
    {
      "file": "balance/nativeSeamlessConsolidationArchive.ts",
      "sha256": "cd887e3ff558e684038a23ebbc64d6a436eab6ccccf88bc3a518031ff467ef9d"
    },
    {
      "file": "balance/nativeShardEntryLifetimeArchive.ts",
      "sha256": "1dbbf8def17126a7c530c862be8102e6ae103933cc6d56d4e62924a4abf683aa"
    },
    {
      "file": "balance/nativeShardFoundationArchive.ts",
      "sha256": "831898e76223802e8461fc15c2ab7b1bb057a55a825ac75bd2b243bec80ce17f"
    },
    {
      "file": "balance/nativeShardKeeperArchive.ts",
      "sha256": "a08f2ed82646d930961c296de3ce0c6dc5be0b02d209f311c5d7c6702d308518"
    },
    {
      "file": "balance/nativeShardKeeperCompositionArchive.ts",
      "sha256": "418acd51a60e2a991306fd874ef2a232490ba0c7b457f466bad6441bae10b4b8"
    },
    {
      "file": "balance/nativeShardMusterArchive.ts",
      "sha256": "1772daf966a45349a58c7e031d6eb5821091cec01f5dac89d64f673942a68837"
    },
    {
      "file": "balance/nativeShardPublicationArchive.ts",
      "sha256": "62a682cd93bc277f5950c2d3687825367e2ff93fe9a814eba61a20f2e0eebbc4"
    },
    {
      "file": "balance/nativeShardsCompositionArchive.ts",
      "sha256": "7b0b7ebc7b157a5413a4c0be69bd6c52163c665de5d7f07a65811ec9380d463b"
    },
    {
      "file": "balance/nativeShardSeatCompositionArchive.ts",
      "sha256": "1c1646e1eb1c61e459ea000ba8ac96ac386918703a7a1bfa2bc0e0c7350c0b01"
    },
    {
      "file": "balance/nativeShardSeatsArchive.ts",
      "sha256": "04fc1d4fab7a737b6f184fba895dbfe450db370288525c0d83de20539f8a589c"
    },
    {
      "file": "balance/nativeShardsLegacySourceArchive.ts",
      "sha256": "87f3b4efd01a469b5f0a582966e765c161ed0237b82ca7e129e1ac00a32ff8cd"
    },
    {
      "file": "balance/nativeSidezoneFurnishArchive.ts",
      "sha256": "66fbe4c4d9b0a998e7c2365237814be3376aad3c2576cb6b20dad769cfbdbc75"
    },
    {
      "file": "balance/nativeSkyArchive.ts",
      "sha256": "f0425ccfee92ddb795a0e2a946210c4af96f09543d9908c0b2dfe7eb073e745b"
    },
    {
      "file": "balance/nativeSummonAsyncBoundaryArchive.ts",
      "sha256": "e5b2b531a4c2bc951669a6ccf22dfcc12c8037192f79217e4c2effd021b5435b"
    },
    {
      "file": "balance/nativeSurfaceArrivalOrderArchive.ts",
      "sha256": "f3392161a4cc2b6028e82872ead8773503f9f440db0e6247df777ea8ac73bb0f"
    },
    {
      "file": "balance/nativeSurfaceArrivalSourceArchive.ts",
      "sha256": "febe4557c8c691b214766b4654d6bfaf88c4db763f9ef9c4ccfdcf06c81875d0"
    },
    {
      "file": "balance/nativeTitanAttendanceArchive.ts",
      "sha256": "1b7079001974f57cbe2f810da64ca5cffdaf3045e48490f5dbc74879f091d1d8"
    },
    {
      "file": "balance/nativeTitanReceiptArchive.ts",
      "sha256": "4df613a4eaef0b299c2949cb47fe8dcb7676fe14367f1f8f3e17704d5c1192cc"
    },
    {
      "file": "balance/nativeTownClientCompositionArchive.ts",
      "sha256": "14ec4f631c5dc08c78514472c721a34ed2b3b1be978b52f12939d696a86bea1b"
    },
    {
      "file": "balance/nativeTownConclusionCompositionArchive.ts",
      "sha256": "b6727accddc426fb52bdcc62a85703a89a100233be2e144c3f9de98be311b3ff"
    },
    {
      "file": "balance/nativeTownFreshFoldArchive.ts",
      "sha256": "3008a5027ed9a90a1d0d7457b498b2c111e116d129fc3dd4d4764e1cb176784f"
    },
    {
      "file": "balance/nativeTownLocalInputCompositionArchive.ts",
      "sha256": "30263bc28d23f49f4dfc1487be37eec302e49b26409602310fbe2fb9b2271da8"
    },
    {
      "file": "balance/nativeTownStationArchive.ts",
      "sha256": "1726a5c367697a8f7ca8600231976c49631242353e74faf8709b3dda9d0629d4"
    },
    {
      "file": "balance/nativeVendettaCompositionArchive.ts",
      "sha256": "b9dd6eb5354813c5fe9fd02cedc0b9420e6f82b47c9870ff150c9c4080c6dcc6"
    },
    {
      "file": "balance/nativeVoyageTransitionArchive.ts",
      "sha256": "66a6df59a10d0008767dcf40f93f4a17d72483f0da65681da9bffa7f7fd688ac"
    },
    {
      "file": "balance/nativeWarlordArrivalArchive.ts",
      "sha256": "035058712b0aad13a58f776fc855cd279c2cc2409f897f606860212f82c142b8"
    }
  ],
  "runtime": [
    {
      "file": "src/main.ts",
      "sha256": "713eafbcae62758b313532a43670e40c8d0a0fc4d9b1b615f933bea406470d94"
    },
    {
      "file": "src/world/captureGeography.ts",
      "sha256": "42390342bebef841f6c21a657c1577cae2f548692f7e75183c931945e4bf1353"
    },
    {
      "file": "src/world/geographySource.ts",
      "sha256": "7309e41ca9573b061c63d79402fdc1ab3dd72e83cd19b0611179ba320c620068"
    },
    {
      "file": "src/worldmass/random.ts",
      "sha256": "7bbe6ccd96c6677082ffb62f4089a3e62a23dd03488a961255cd0b195fbc05bd"
    },
    {
      "file": "src/worldmass/nativeAreaSourceSession.ts",
      "sha256": "5d989adcfde09500855c646e20c09217cfab974b3fe04adbdd6c591e883f9413"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterCreation.ts",
      "sha256": "0be30b9baddb7f9ab5a6aa4fc587886d00b42b6058cbc7f15ba6b3552cba4ab1"
    },
    {
      "file": "src/worldmass/nativeAreaCharacterResume.ts",
      "sha256": "91ddace30eea7688d3110aafa53f504f62ba0327e99472533eb646c1737397ec"
    },
    {
      "file": "src/worldmass/nativeClientContinue.ts",
      "sha256": "c645dc33f6f43d397d4616ce481d205aa58c8e602e236830daac259c4c3cc8c9"
    },
    {
      "file": "src/worldmass/nativeClientRuntime.ts",
      "sha256": "970d2b5e0a6999fd0919adedbbee61eeb1af83347d6b9457e1f3c4ec87a45837"
    },
    {
      "file": "src/worldmass/nativeClientStart.ts",
      "sha256": "f18a5977f32ca3d2f47c86567bcfe34b4656d65729018adf3d7fc4d6f4403d61"
    },
    {
      "file": "src/worldmass/nativeGeography.ts",
      "sha256": "66a0790c977965e0fb71e660ecf6b3737c95a9eef515147f0468ea22d786f68e"
    },
    {
      "file": "src/worldmass/nativeCharacterLoading.ts",
      "sha256": "b68c71160447b881448d02990b6736b070e4ebe793e3946f0b5b642431a6c369"
    },
    {
      "file": "src/worldmass/nativeSourceDigest.ts",
      "sha256": "bcdd71f540f7e33c4aa5a406aaee33f18e67ada7c93f8adb3dffcbbeb5e9f7e4"
    },
    {
      "file": "src/worldmass/canonicalString.ts",
      "sha256": "e294d192b8b3a66e489821110b4834e67c98ae8ad9860433088fb1d3be843589"
    },
    {
      "file": "balance/nativeLoadingResponsivenessFixture.ts",
      "sha256": "8b8931c38fd803b46b6cab19c3a373bfdf28671b95b788c031922faaeb152222"
    },
    {
      "file": "balance/nativeLoadingResponsivenessFS.ts",
      "sha256": "d38b6e00029a3a6bdb76cc45d99e262e8670b89907b158d460ad680d43bd6039"
    },
    {
      "file": "balance/check_nativeclientloading.ts",
      "sha256": "797cc5363f0f5dedfe6eaa0ef9377373ce761f79071f411e61022e144cf04b3b"
    },
    {
      "file": "balance/check_nativecontinueloading.ts",
      "sha256": "062852238628538351d6ef6d411aa9fd9883da952c7527f2081e9f3b6837c666"
    },
    {
      "file": "balance/check_captureloading.ts",
      "sha256": "7db87e8d39b4acc2692f6b4d8c9c73ac040583110675f0cc07b1dff6a2708db3"
    },
    {
      "file": "balance/check_canonicalstring.ts",
      "sha256": "4031e2f53867021cda18f9167271c48bc8f0d29d3a15b04b94dcab14095eb225"
    },
    {
      "file": "balance/check_geographyidentity.ts",
      "sha256": "b3b2eed0c94ac3da897867a09376e97da215a4e0b170f7128d64955249de65ca"
    },
    {
      "file": "balance/loading-native-cooperative-firefox.cjs",
      "sha256": "7041b0402e98fc448a8cdc6379792ebd486eb92f64b2602850c7f8caab795c27"
    },
    {
      "file": "src/worldmass/nativeAreaScenePreparation.ts",
      "sha256": "a3f5fea49639570b974dc416b8f70cbd3929a871e1b903465db5b79a4957e6fb"
    },
    {
      "file": "src/render/renderer.ts",
      "sha256": "c4014a28bfe98bb9c2bd523cdf3503c92f46175bd97c2fef7bea2d6d96f1b555"
    },
    {
      "file": "balance/check_loadingrender.ts",
      "sha256": "a96c2afdf174a58c17f5fb784189def9fd21fe40497d037e0bb085ade23ffa9f"
    }
  ],
  "accepted": [],
  "unchanged": [
    {
      "file": "balance/probe_abilityecon.ts",
      "sha256": "36210f928493d8f59fc8f4665ffdb0e9f8ad41f2a425f6915301ff3ee819684d"
    },
    {
      "file": "balance/probe_accountreliquary.ts",
      "sha256": "768caca4cae7e99f11bb7ef5b1ee683e86330064148a6c403313cbe25ec41d82"
    },
    {
      "file": "balance/probe_aether_countries.ts",
      "sha256": "226eb8762aac783c6468926627bbc91f09281d8de7ac635c287da8b5bdef7bfd"
    },
    {
      "file": "balance/probe_afflictioncues.ts",
      "sha256": "6e264f6ed8b75dbbc0fc6beea1184b5443aa2563cca05581b821bbc91103381c"
    },
    {
      "file": "balance/probe_agent.ts",
      "sha256": "5b62399d5fb32eff78cd7894737d5a9c16df373fdb6157182c43b06bd774c6e8"
    },
    {
      "file": "balance/probe_aiverbs.ts",
      "sha256": "7b535f1a350366bcab5b6ca79ed076565191c708460d8632bcfac0a9d8f50f60"
    },
    {
      "file": "balance/probe_altar_bodies.ts",
      "sha256": "9a8791a2bdec3198974c451250948f14a1ccf33d632d48589e87228d30231fd7"
    },
    {
      "file": "balance/probe_anatomy.ts",
      "sha256": "bc023586eb7f8b28c420bcfaaede91217c39d75cf288fb1ac4b3b3e26657f012"
    },
    {
      "file": "balance/probe_anatomycues.ts",
      "sha256": "2f1f17c76a829ac4b232c97833760ea591ea21d7ab48b5e71d1313a53cbe8b30"
    },
    {
      "file": "balance/probe_annex.ts",
      "sha256": "122bdf27432b986568580d889163f0b9dd4bda8fdff46f704aa61f22aa71aedb"
    },
    {
      "file": "balance/probe_annexgrammar.ts",
      "sha256": "9580fd25ee7d086821d5f279943411649589f73e18e3c5a912d39e89209116f4"
    },
    {
      "file": "balance/probe_applyarm.ts",
      "sha256": "284ab239e120be4e409415959bf1fe0953f283142da63515a500f90f29a4018a"
    },
    {
      "file": "balance/probe_arenabosses.ts",
      "sha256": "e0a8a69a495797ad951adaee72683909874af813546e498462bb8f1710b2e644"
    },
    {
      "file": "balance/probe_assault.ts",
      "sha256": "e82c7d191e939d3a634254e1a9f8a2b0ac26c84dc6498fbdb4fe2a9b30a3e839"
    },
    {
      "file": "balance/probe_atlas.ts",
      "sha256": "077cf89b2c7315410b07a403477d7f7782d33dc3856f5506219d58e18d30770f"
    },
    {
      "file": "balance/probe_atlasbudget.ts",
      "sha256": "7addd71a70608fd54baa9eda0040f99c8e003405ec140f27f7f42a646aed862b"
    },
    {
      "file": "balance/probe_atlasinheritance.ts",
      "sha256": "f03e0bb475e690537c6b02768b5f9ce428155d4de4bc82b80e57fd1c821d1c71"
    },
    {
      "file": "balance/probe_attunement.ts",
      "sha256": "d3341df9def29469208f6ebda545120146d6784da8271d46454500f75800280f"
    },
    {
      "file": "balance/probe_auroras.ts",
      "sha256": "a1a9e2b8af67e333280e2bc07e2817d6c73b5f2559e931984588932b0789bc77"
    },
    {
      "file": "balance/probe_authoredmaps.ts",
      "sha256": "a9d7dc254e19dcb01ea0f048b0a482cbef67c5af3c9f4a5463f4fc994e35d7a8"
    },
    {
      "file": "balance/probe_bagsort.ts",
      "sha256": "17682bcd35ae3b45c13eb8ee5140f16a73e6467ffe32be4933a1193a1c98a83f"
    },
    {
      "file": "balance/probe_bashclock.ts",
      "sha256": "339c7936fde7856beff2b88ff3005eccd4702b4f26d583f540b23c859d90c249"
    },
    {
      "file": "balance/probe_bashcontact.ts",
      "sha256": "b871075c417715d1b8199ef3ffb2743c8e699ef6e9a801e349a8b53ca5d8c2bc"
    },
    {
      "file": "balance/probe_bastionstartertrees.ts",
      "sha256": "a15215bacb6aaafc036cd5610850d0d42740cd34ee86e1dde6accc8d01efff33"
    },
    {
      "file": "balance/probe_biome_share.ts",
      "sha256": "d367ed3863c14d209e99871ea4d6462e5ad16156e87cac81444221765836b643"
    },
    {
      "file": "balance/probe_bodyvoices.ts",
      "sha256": "ef164e9e8d943f478ffeb766e06780c0fcbc4efafa58d16ffc0b015e273574ea"
    },
    {
      "file": "balance/probe_bodywalk.ts",
      "sha256": "a31bb9c80f7cc42875d0936cbecf2848057458d0b6b97511f70c6f00de6a6184"
    },
    {
      "file": "balance/probe_bondstartertrees.ts",
      "sha256": "552101da54db0af59553aed2fd008e93c78b0a04b233a03b995412ff380bb6b0"
    },
    {
      "file": "balance/probe_bore.ts",
      "sha256": "f727ae9653881203aed0064062c0a4119b28035e3485043f15558eb910a4c045"
    },
    {
      "file": "balance/probe_bountyboard.ts",
      "sha256": "e921be208186116e019a335201bdf557ffbdf5a335ac3f562e86943b3ecc5fc0"
    },
    {
      "file": "balance/probe_bountyquality.ts",
      "sha256": "5f5694ae0cd268384fbcf9d54c00da3cbe05c507e52abf1aa338bfc40ae38e45"
    },
    {
      "file": "balance/probe_bountyroutes.ts",
      "sha256": "7d037e05a13e0fbc15ab023e8ae065d8a8cf17058fb207b26e14e68ed00fa1bf"
    },
    {
      "file": "balance/probe_braintuning.ts",
      "sha256": "1d1f21ae2a111e4f937aae4b537630f4703968c550a47e3212efece0f19e7127"
    },
    {
      "file": "balance/probe_brandtprogression.ts",
      "sha256": "df0ee26c04fdaef2a92df099574f67c1a98d56e6b2791b3bae0f24fda72fd267"
    },
    {
      "file": "balance/probe_brandtquest.ts",
      "sha256": "a46cb06e96e1c36f3beb0c8498096c9cc9ab038f3637f1643c29e91aca1a3759"
    },
    {
      "file": "balance/probe_brushcover.ts",
      "sha256": "d8423e6f7570572105ec0e8651ec144d83fcf5bd9c4195afc64eed2e47236135"
    },
    {
      "file": "balance/probe_buffreadout.ts",
      "sha256": "76a06a85141cab65849b04d878ddcb70846ba57e03b2503bfbc357e7d5c25e3b"
    },
    {
      "file": "balance/probe_butteland.ts",
      "sha256": "7d623acc10c51d87051870bab5ff65580c3d78d4497b0707601c012b890550cc"
    },
    {
      "file": "balance/probe_camerazoom.ts",
      "sha256": "1898af670a9cb48c9d1c9ae3ae2f1a57d5c5eb49903fc54f01e9988b2c91a098"
    },
    {
      "file": "balance/probe_canopypresence.ts",
      "sha256": "1f01133f4c4f7b5013f4a8a614abb22ddfd47106ce548f607745c697cc668b91"
    },
    {
      "file": "balance/probe_castaim.ts",
      "sha256": "2f02fb41435b9d11c49a49a5de664367dbeecddc57d367f56e1741f694a3e6f0"
    },
    {
      "file": "balance/probe_castingcues.ts",
      "sha256": "7c3503fde97790a705de489d3bc55a3d3ff08a418cce85b050908867cf4f6728"
    },
    {
      "file": "balance/probe_castmovement.ts",
      "sha256": "ec84da88f28ff0da6481e0ddd64d161c867f621493961b8aa50e51705571206d"
    },
    {
      "file": "balance/probe_castreq.ts",
      "sha256": "dae57b1f318d8d8608e46bd728bd2a12e16effb83ba66ac8c8edd186d1042fe0"
    },
    {
      "file": "balance/probe_cathedral.ts",
      "sha256": "de739a83d370495fb59d727d9028a239ee9209a06764cfa242b52e782b392d3a"
    },
    {
      "file": "balance/probe_char.ts",
      "sha256": "abc46eb4a01ad72b4e0e4049ee0fcf2f380ca163d5fdf8fe67cacbda56e4157d"
    },
    {
      "file": "balance/probe_characterresume.ts",
      "sha256": "e087e7a1091babe980e5f6dff076b273dc716a0f9dbc0fcf822d788dd2107e2e"
    },
    {
      "file": "balance/probe_chargegate.ts",
      "sha256": "bb7a7bdbdc6055da77eba3b8b950f0a1cfd585fdb36cae0e08043da85c02783a"
    },
    {
      "file": "balance/probe_chestreadout.ts",
      "sha256": "242b7229b4317a89c3c3f7e7230dd4fa37e5c355e4a2e109b0bd08f9f28e434c"
    },
    {
      "file": "balance/probe_choices.ts",
      "sha256": "e2ec7d9cb4506765afb2ba0ee4761805ee567de73e90d929936d3831b88c71b5"
    },
    {
      "file": "balance/probe_cistern.ts",
      "sha256": "bfd45749fda6090db409e4424ec280fee1d0f2808ad1ceb28e7bb9531128eca7"
    },
    {
      "file": "balance/probe_civics.ts",
      "sha256": "0ad1d8d34f4ebc38ce98dbea1f9cd9b33818f4e7fba080ea583a7e2827b08128"
    },
    {
      "file": "balance/probe_classdeeds.ts",
      "sha256": "e1b59426c07e061c16b2ea020699ee65c4d198193d4d39a7ad839b93ba75d8cd"
    },
    {
      "file": "balance/probe_classmastery.ts",
      "sha256": "70eda3818a9e494544662c2d192f72bb371d900040ecfbe86226f4bcae397f0b"
    },
    {
      "file": "balance/probe_classopeners.ts",
      "sha256": "ad1ebf0e214025e2edd0779b10c0bc030024fe42abc73e73e09c16ae269f4edb"
    },
    {
      "file": "balance/probe_cleanwake.ts",
      "sha256": "412517c6ed31c87b5c4e5962822fa70ff2b3103639d05a08e91b2b03d1c1c809"
    },
    {
      "file": "balance/probe_cleave.ts",
      "sha256": "f4ff3454bad4ba10b7d98c059a54b2e4d955b81f1310d0ea7fe19c97f817c83b"
    },
    {
      "file": "balance/probe_cleavecomponents.ts",
      "sha256": "47027d52d733d0b9f56d4c7467167abc69bcee3ea9445948ceb1a4bf3a0843cb"
    },
    {
      "file": "balance/probe_climatecore.ts",
      "sha256": "52355b24c1da5b9ac53ec88ca9d6905fc3235c40d2dfb9919713d0fe938a2321"
    },
    {
      "file": "balance/probe_clingbalance.ts",
      "sha256": "d146df947ce98bb58774578d88b58678ec7b1aa3a9bf0a2cd9ec3fd5c4b627f4"
    },
    {
      "file": "balance/probe_clutch.ts",
      "sha256": "c1e94041a846c5bd60773145782edc2f4631bcd7f9e0871eef22a22dbc671f0e"
    },
    {
      "file": "balance/probe_coherence.ts",
      "sha256": "092f9eb79b777ff0bf94f9c033f81304666daa8176d8319f9a79f623592b9194"
    },
    {
      "file": "balance/probe_cohort.ts",
      "sha256": "83993a842889aa74182bdc76a5dfdf248b3b97f36c81b381d989092ac9a13678"
    },
    {
      "file": "balance/probe_combatcues.ts",
      "sha256": "f02f24bf6d58599d4cfe4b40c0de2a98de14bef90f07a4d73e889572478c82e2"
    },
    {
      "file": "balance/probe_combatfocus.ts",
      "sha256": "96727197ce1ab36f44e881f19063fc598a9007b5d707301e67c0125863db61d0"
    },
    {
      "file": "balance/probe_combatreadability.ts",
      "sha256": "ab05c31003c6513e1f4b0ac795a53ea3fe31ac2cc6749f22f4d63c82ca0037d7"
    },
    {
      "file": "balance/probe_combo.ts",
      "sha256": "8d80463f9aa02c190ea0fad02279e54f208dd472d215ff734970d3e9ae7e280b"
    },
    {
      "file": "balance/probe_comboconditions.ts",
      "sha256": "4c2d0ba4fe061f01834b3db9c444a946975739465ef9ab9b76f1e426e2cfaf58"
    },
    {
      "file": "balance/probe_combocues.ts",
      "sha256": "5143db83ff2cf5743140de36f02f587f2a26b67c8f19f6dc710bdc06b87ccd31"
    },
    {
      "file": "balance/probe_companioncues.ts",
      "sha256": "d8b0651179647f2c0ed6624dd02865eb93df46f2f9ff9c0d3235352af546997a"
    },
    {
      "file": "balance/probe_companioninheritance.ts",
      "sha256": "b61dfe8c32d45085da9c494355d3f7d99c1d9a5f0314a8a0f6427036c07d3afe"
    },
    {
      "file": "balance/probe_companionrecovery.ts",
      "sha256": "7d4e3ccc25a5c4c24ce835cbc3a826bf4a54caf296744306e95d6e61f06421eb"
    },
    {
      "file": "balance/probe_companionstance.ts",
      "sha256": "ae7c9154beb0c1c90d3b80506e0c487d395f10e02e68866dcecfddc6777be84f"
    },
    {
      "file": "balance/probe_complexes.ts",
      "sha256": "d80efc049f5988f0c981dcc700147a76fcec1218437f1cb70b78010cc17016ad"
    },
    {
      "file": "balance/probe_contagion2.ts",
      "sha256": "66fb4df052c09747742dc1f0e2f2c1bb2c12ab2d36777873ee1af4d16eb002e2"
    },
    {
      "file": "balance/probe_containerloot.ts",
      "sha256": "e35f2b2796b77123e7482c6305c2017589fdb783a72105baa562b745591ac62f"
    },
    {
      "file": "balance/probe_continentcore.ts",
      "sha256": "51fc044fe3381e3850e2c2074ecda26bf0a1bf149f14bcd9bb45214bd49ee4a7"
    },
    {
      "file": "balance/probe_controlstartertrees.ts",
      "sha256": "f1c13173e3144b8e30c3ff45491c88a20bc261bcbd1dae707816d785971eff98"
    },
    {
      "file": "balance/probe_conversation.ts",
      "sha256": "89ede44615a00519c4778aaae176a32c0ca357e2b21f4df2afe547f91ea60e30"
    },
    {
      "file": "balance/probe_conversions.ts",
      "sha256": "57862c49b77a8156a7b3c86c0ae5941bd4afbe62b9e682658b0133f0bf968e4c"
    },
    {
      "file": "balance/probe_coopseed.ts",
      "sha256": "c9a18599486ca0ceae792f7a295683cf064158c7f145689fbc988c8f34453cd6"
    },
    {
      "file": "balance/probe_corpse.ts",
      "sha256": "99dc6719dd444790a1d0805460c9462f89d5502603b73ecd7cf4ce1617b8cb5b"
    },
    {
      "file": "balance/probe_cosmetics.ts",
      "sha256": "ea9c339e70851b225baca5684b407e5fe5b0e6e0d180553419c4e5dcdfae34c0"
    },
    {
      "file": "balance/probe_costlevers.ts",
      "sha256": "e05967a6eaf4411d33fba2e70d19c7fe2caafc5a674978941d1f4e55487ce045"
    },
    {
      "file": "balance/probe_couch.ts",
      "sha256": "7f0eabb8701d9542fff5cec1bc3bf931456def1b32e77ddd03a0d35b4c30d6da"
    },
    {
      "file": "balance/probe_coursestages.ts",
      "sha256": "6d30070dcb91631389ae0ea7d733a1b2fce141275feb60985ada797f4518340a"
    },
    {
      "file": "balance/probe_creepers.ts",
      "sha256": "1ea6a37b0d7e0922673fac09d111d1dcf3458dbee4247d51cbcf139327a547be"
    },
    {
      "file": "balance/probe_criticcrusadecoldcapture.ts",
      "sha256": "7ce05a724fe6b21308a18a7e308f28caaa4bde0243d907c8500dec4da1831d41"
    },
    {
      "file": "balance/probe_criticcrusadeterraincold.ts",
      "sha256": "cba541c5a06e8cb271a3c2151f26dbe6a2f24b08b8b4d2c835a48109881e1773"
    },
    {
      "file": "balance/probe_criticcurrentcontinue175.ts",
      "sha256": "247c7d3171553c31ff7b8c5f6384989ba85563171a460a043e38822de2283d69"
    },
    {
      "file": "balance/probe_criticcurrentdoor183.ts",
      "sha256": "69e9fb3773a173d7a77c9c1b233e26dcee2c33c7f08ff6baf7e21875e1e0ffe8"
    },
    {
      "file": "balance/probe_criticcurrentevent175.ts",
      "sha256": "808a23fcb4d6ce1e49feeec34ea127fc7d983141ab6423ee6a58b8a2ab9ddbff"
    },
    {
      "file": "balance/probe_criticcurrentspent175.ts",
      "sha256": "fbc2756cc012fa061963344ece44194927614de69a9d87b8dbb8573d1be0a83d"
    },
    {
      "file": "balance/probe_criticvendettaselection201.ts",
      "sha256": "e3250970ae5f5c70d5f61c2d49e416dd5513cfb828f28989445b00457b8a54a1"
    },
    {
      "file": "balance/probe_crossjab.ts",
      "sha256": "7948c08cf1c1020a83caa79ebb6a7d2ffd76bd1e8932371843ff01d9224f5d96"
    },
    {
      "file": "balance/probe_crusade.ts",
      "sha256": "90f2e970ea52c5692212d68250702931c50aeec521631059f2e4222b8e77a2ea"
    },
    {
      "file": "balance/probe_cryvoices.ts",
      "sha256": "c318edb95faf4131d271d5f3a01289d6fdd18b3e52803ba13519ae8af0edaefa"
    },
    {
      "file": "balance/probe_deadface.ts",
      "sha256": "c1583833009a70afce92974c50eb159d9618296f5e9158c9480f36666e1aa8d9"
    },
    {
      "file": "balance/probe_deepwinter.ts",
      "sha256": "a9656a2955138a2aaa03c153eb207f37afaf638b289384b9dbbfc8d2584a3dcf"
    },
    {
      "file": "balance/probe_defensecues.ts",
      "sha256": "5065602ed2d0f657461f6f769a8a8ec34832f92c83f9718f7d2dafbc5b727ca4"
    },
    {
      "file": "balance/probe_defenses.ts",
      "sha256": "c0629065fe54671cc4d2eb5a746c068e4747f29ea2f3fdd52179237e41d41405"
    },
    {
      "file": "balance/probe_den.ts",
      "sha256": "11794e9f1a5cfd9ddcb94a89eedf85dd8c8607a40859d7aa88b25b61e9528b03"
    },
    {
      "file": "balance/probe_descent.ts",
      "sha256": "44a171a2abee9755f532f3ed69c6f0435efb453829db68b4ae9c6c3d826e97f9"
    },
    {
      "file": "balance/probe_destinationlabels.ts",
      "sha256": "367c96fc95389942fea9ccab8ee49ca68cad82c1774ac19204d20cc6dd99bd1a"
    },
    {
      "file": "balance/probe_deviceworkshop.ts",
      "sha256": "818b5688a3c4464b244999573614ee96bde276225b983f9993ed406025a33036"
    },
    {
      "file": "balance/probe_devmonsters.ts",
      "sha256": "75c1dc75d7f60a88bacde3ea1281ac9c68a4f6a62feb023c677adcf53bcd62fe"
    },
    {
      "file": "balance/probe_devotedstartertrees.ts",
      "sha256": "e1fe44f8eebcac9c0b0d7f65c2e0543b81d59ace3f646124d2baa5125eff3f9a"
    },
    {
      "file": "balance/probe_devprogression.ts",
      "sha256": "55b6fb7c880a8b31787fc06dfe50493ed0fa80548b041790cc39015bb34b27aa"
    },
    {
      "file": "balance/probe_dimensiongeometry.ts",
      "sha256": "59d87f3bcea36480aa2c9e35f180fc7c7893f3b0ee570177d95def8f9d132e30"
    },
    {
      "file": "balance/probe_dimensions.ts",
      "sha256": "dc2a8a9eb27640b00aec27b23dbed611809482e799e3df352309f0c132e8e59b"
    },
    {
      "file": "balance/probe_disciplinestartertrees.ts",
      "sha256": "b718521329c406472d6fcaa17e8af2fb980e2ff1c6483bd352253472851ff1bf"
    },
    {
      "file": "balance/probe_dissolve.ts",
      "sha256": "2018f4464301666aebf74cc57a5d54728d22b994cfc406040af44cbbc88f6c0f"
    },
    {
      "file": "balance/probe_doodadeffects.ts",
      "sha256": "e409c28855a24759b8297e9634fb1ba8ec6be54706f744160ef0b976156013ed"
    },
    {
      "file": "balance/probe_doodadfams.ts",
      "sha256": "3c141ff7daa21465b55aa1b93bd76b435f9656acdd114ccb2632264759d81ac9"
    },
    {
      "file": "balance/probe_doomcues.ts",
      "sha256": "0f348d27032b2bac31cdde3c73748d27e35cfbfe55da3a19b2b03fca91792e5f"
    },
    {
      "file": "balance/probe_doorpress.ts",
      "sha256": "45a9ae785de7633f86cbae70270571267e9c7b35aae36f604a46075dd25bb4bb"
    },
    {
      "file": "balance/probe_douse.ts",
      "sha256": "c2e24b76200263468676eaf080137b3efd64adb2cc73acf2be7e8a64c1a817bd"
    },
    {
      "file": "balance/probe_dressbudget.ts",
      "sha256": "63e3b7f794a41102f961562921710c84dc1cbd4127976494572eb03eb99bd676"
    },
    {
      "file": "balance/probe_dressfade.ts",
      "sha256": "779db654239928e024387f70304d01581b7e2a9bf504f18866f1c7118a8ea6af"
    },
    {
      "file": "balance/probe_drove.ts",
      "sha256": "ab3a1dd58c4951c670373025f16aa8d180294a8f84d6820f361603507c91fe39"
    },
    {
      "file": "balance/probe_dueliststartertrees.ts",
      "sha256": "f36e60e0510c4c0845f803ac0d5edd78f5dfa7b6a295abf94928e65bc711deda"
    },
    {
      "file": "balance/probe_echomark.ts",
      "sha256": "bb3dceb1410ecad311693a1f927ca32c3f568e2308f5d6392f09e8bfbf9f8642"
    },
    {
      "file": "balance/probe_effectvoice.ts",
      "sha256": "adf09cf7caf11fed30bf68dd205f40a1d114dc9c7185fc898a58e85c6c27d3e9"
    },
    {
      "file": "balance/probe_emerge.ts",
      "sha256": "9772b4f6d3f448b57f109e3f0f34745c2785ca791b00f19b30fb8825ccbda06b"
    },
    {
      "file": "balance/probe_emergentuniques.ts",
      "sha256": "0e22e9aef03db361b6dcb4c49d3487222b97316617cc8321a5236210857c921f"
    },
    {
      "file": "balance/probe_encountercombat.ts",
      "sha256": "dfade16db7e444706a3515fca9798b501469005bff67c74197b6b2445d3acd33"
    },
    {
      "file": "balance/probe_encountergroups.ts",
      "sha256": "b9faf9942228463de14255b8b922391722cc13192166c6d3a7a92aef2b713d9f"
    },
    {
      "file": "balance/probe_eventclock.ts",
      "sha256": "a8e78c33acd19360ae4d5f996a0199508845ae403a8007386a77bfe35c6a3f03"
    },
    {
      "file": "balance/probe_exhaustioncues.ts",
      "sha256": "9970916b6875a3c4854c7ec88486256c052789aaf526c92074ed5dbd26e63baa"
    },
    {
      "file": "balance/probe_extraction.ts",
      "sha256": "dd7a2a92c4846e13a9fcd90ac047e86fbf199ed2aa3007c888ca2a74b3f67a63"
    },
    {
      "file": "balance/probe_feedingcues.ts",
      "sha256": "868eba19070db2334ffded920dc2df77afcc2bb9775e2b4dcec39bc679a35bb1"
    },
    {
      "file": "balance/probe_fieldchoice.ts",
      "sha256": "4ff2d070cb3af62cca8347fb8cd0d1863a11f0d723f64069fff1a40ce71e8979"
    },
    {
      "file": "balance/probe_fielddiscipline.ts",
      "sha256": "d489d87fbc177f15f3152b73bfccf3d28a59dc302b86de8968ea3760c0f4b27b"
    },
    {
      "file": "balance/probe_firinglane.ts",
      "sha256": "5e0fee3a890e602d5a635e1427ffb18e5af257fc248663a2ae40eff9c0477982"
    },
    {
      "file": "balance/probe_flasktrees.ts",
      "sha256": "ba0b44989ad1ca2653b02ecfffc05288068e7378fb19fbf1278ee7a2a58aac23"
    },
    {
      "file": "balance/probe_fleshkit.ts",
      "sha256": "5921ff2db1757a272aa945721deb21a87cf8424a8b949130e630e57e0f26959a"
    },
    {
      "file": "balance/probe_folio.ts",
      "sha256": "bf533ab31d61b4d17187e806036325c4094721e712da0144e1e50d5e7cbebe23"
    },
    {
      "file": "balance/probe_foragercommitment.ts",
      "sha256": "447bff31cc36f475fa345a96aadab30081589097e253ae3c3edbf4292b8bb952"
    },
    {
      "file": "balance/probe_forechart.ts",
      "sha256": "a079176fa8994426dc0df4480831e27640f03f33f0fa5279355003006dac201d"
    },
    {
      "file": "balance/probe_fourthwall.ts",
      "sha256": "877be7fa69697abcc965b459a7f0568c44537dce9b298beeff13d1bdecd2ed29"
    },
    {
      "file": "balance/probe_frayingnerve.ts",
      "sha256": "0e749358165b328c8ad8093cf8403a574af255a06f2e40b40871808a8d17c9a9"
    },
    {
      "file": "balance/probe_front.ts",
      "sha256": "e2c40243e4f4cb662689545ca1c47b8738c6dd750b6d90faf9b1a0e0ad98d1b3"
    },
    {
      "file": "balance/probe_frontierstartertrees.ts",
      "sha256": "7f17209cf6f5d3a23400ed7fe7caad7649d9ad792bcc06adc96ceabbecfbe069"
    },
    {
      "file": "balance/probe_garden.ts",
      "sha256": "d89ebedbd5ef9b0b7df0f02a7bb6229b2804f4c32497d55765fbcd5e3cae0451"
    },
    {
      "file": "balance/probe_gauge.ts",
      "sha256": "94c230b379324d0166cfd99af3621fc18d8cc4fa2490a9af4ded07391c39e879"
    },
    {
      "file": "balance/probe_geography.ts",
      "sha256": "f054565bb028266f474faab45cfb18688386a3c80f64992c256713d562c047a2"
    },
    {
      "file": "balance/probe_geographysource.ts",
      "sha256": "fc3b70bc1b4c4bcc9bff5a2f412bda6425026d8fa7afb0aca83d51275fff0b75"
    },
    {
      "file": "balance/probe_geysers.ts",
      "sha256": "c5f0e1403e730f19a90f53c7961956f5edd92e221dc4dd9595cf8f442aaef557"
    },
    {
      "file": "balance/probe_gloaming.ts",
      "sha256": "b84b590d2c1367ae7086e1521367ca5286cc0fa82dcf76cc6cf4e16663ea7d63"
    },
    {
      "file": "balance/probe_gnatveil.ts",
      "sha256": "b88e79c0a03c6f6ef1f13aa015bfbf20ffd1808df180b98112fb1c7ddfb52f7e"
    },
    {
      "file": "balance/probe_goad.ts",
      "sha256": "ef58e16559bbc3077132e08c0841edd9177ead2116c27739459d0139efe722db"
    },
    {
      "file": "balance/probe_grab.ts",
      "sha256": "75697a634652987f6c4318ae3a8026c1fd8ab6b16bab1ebbbcebe33cbed206f4"
    },
    {
      "file": "balance/probe_groundjoins.ts",
      "sha256": "7c60557c92806e10229eccf6f0c89dc54e91b38edb1f3bc524d577c2feb75b37"
    },
    {
      "file": "balance/probe_groundlookup.ts",
      "sha256": "3d425563664437863b039c5aabca7259d1836bb2ce803276ffba272b064d68ce"
    },
    {
      "file": "balance/probe_groundsnap.ts",
      "sha256": "450501fe043c3e9d1f18921470547f2d6ab65e9c7776c7a358e3647f1e89e420"
    },
    {
      "file": "balance/probe_grove.ts",
      "sha256": "340ea66e2d75b15ae72a86be69dd8df477bc6cedc98ea3573395c70cf8711626"
    },
    {
      "file": "balance/probe_guardbash.ts",
      "sha256": "28f8a3b51fe58b4220772238e2aefc7e236d577c1e42784b2360280e013e69c3"
    },
    {
      "file": "balance/probe_guardians.ts",
      "sha256": "5f55a0d722dd7d9f66e0392d88025377463b556f0e04aadc83afebae7f871dd4"
    },
    {
      "file": "balance/probe_guardrecency.ts",
      "sha256": "53dace8574c414821a65b3389921a803126ba8a089d103d3523cf30579d93c82"
    },
    {
      "file": "balance/probe_handling.ts",
      "sha256": "64a104a28981a573ce4d73b9745fa4790b8dd20173fd441e43950e29dbf7f9c2"
    },
    {
      "file": "balance/probe_harassment.ts",
      "sha256": "bbe0606e8e527a12cfd9be3dc0c6abf1fed93f08f68020d7566b7bc6a925765d"
    },
    {
      "file": "balance/probe_harborholds.ts",
      "sha256": "0631772f5eb4d650ad55e770442bf5ae67a54f905d1e5b84182fd059669c1e73"
    },
    {
      "file": "balance/probe_harborwarden.ts",
      "sha256": "059a830b85b1776ea747338bca18c9e92381ab509d242bc654122d1de851016a"
    },
    {
      "file": "balance/probe_harvest.ts",
      "sha256": "b554f18914f5aabf4b332ff8bcb3234c0c627137ab7971d6b73e33f12e115824"
    },
    {
      "file": "balance/probe_hellwar.ts",
      "sha256": "9b206cea0f57d16701a83629ef5cb559e3037997972fa1b0736c41304b217226"
    },
    {
      "file": "balance/probe_highcourt.ts",
      "sha256": "874d9742465bb484f12275faf0621ad6af46e77e35609d1f63e69280b449f950"
    },
    {
      "file": "balance/probe_hivecall.ts",
      "sha256": "835cc6952dfb5d9198e814cabf5e9cfd4a8dd6ddbeaf193ec408ea9820a3e19e"
    },
    {
      "file": "balance/probe_holdfast_guardian.ts",
      "sha256": "424ac07315d36b753482ae1c01b6a9cc5cd264602a672d6c0a8f5008be847260"
    },
    {
      "file": "balance/probe_holdfast_pocket.ts",
      "sha256": "674b2c9f5dc2ef0ac2e3a5584831ad43d8de0e828f695f45122c9294f4bc445f"
    },
    {
      "file": "balance/probe_hollows.ts",
      "sha256": "2fc2767180a428f359433d53a944bd142356bf4f47ffd2a6d0dd09087366be62"
    },
    {
      "file": "balance/probe_hunt.ts",
      "sha256": "44e08c2f7268cc7b5592f2455a66792033d849840b1096a90aa69f25367b25e4"
    },
    {
      "file": "balance/probe_impactstartertrees.ts",
      "sha256": "f13c6951078ce4bd092cc07e331a24014e9f1d470c7885df2d2aca017b11e1a5"
    },
    {
      "file": "balance/probe_infostream.ts",
      "sha256": "4db701f9901ff0fcbd2e2f1d3d2531ebaf31b24e1d7448875ac95b943c867f8c"
    },
    {
      "file": "balance/probe_infrequents.ts",
      "sha256": "7f2e558cada034e758897bc5da6018bc68ba24cfbad53a8cf15a07d5a7975c46"
    },
    {
      "file": "balance/probe_ironbell.ts",
      "sha256": "c42412746b27de4b41023dde16ae6e67756d5fa19ff3edc461d6deb9f4f0d90f"
    },
    {
      "file": "balance/probe_itemreadability.ts",
      "sha256": "5719668105b59aab5becf3e61d49c02d0fe9dd1b9c45f14951669ab43d03bf19"
    },
    {
      "file": "balance/probe_lairs.ts",
      "sha256": "d9aa33ddab75e03f1c15d9b8db755664e33f84f8bf2679fa0db448944aa3af2d"
    },
    {
      "file": "balance/probe_lake.ts",
      "sha256": "5bfc7d25d936a4335135deafc6cd66f0bdb83267b046ed137a9f6643de51fd54"
    },
    {
      "file": "balance/probe_landforms.ts",
      "sha256": "fef8961394e7c0078bae8147bcdbad25b4b4131649cad2a9469879bc8a81da03"
    },
    {
      "file": "balance/probe_landslide.ts",
      "sha256": "55bff233e3308ad7d062e17a82a39ad64cf13dd5400022087dd194c153cbc0fe"
    },
    {
      "file": "balance/probe_layoutmetrics.ts",
      "sha256": "f1399f5b51a2f7d088d91ac71ee999cc4d9ee1b5dcefd21afc1c5a6507475b03"
    },
    {
      "file": "balance/probe_legends.ts",
      "sha256": "47702d3bd34c0601164ea80fb3e5194d4776a23133edf88dddff236a83cbb0ab"
    },
    {
      "file": "balance/probe_lightsight.ts",
      "sha256": "d9042c3deb2b7c19da138279a9709eefe9b071598c17ea2cd35955f941c98d8a"
    },
    {
      "file": "balance/probe_lite.ts",
      "sha256": "742fc55f4ce03470727cd0d6500a3ee84b3100015df249cde45cf91c19a5f5bb"
    },
    {
      "file": "balance/probe_liturgy.ts",
      "sha256": "2ce60435d7f2e644aaea89a2970dfc561c1fa46dad5cbc05dd7491c7384c1d79"
    },
    {
      "file": "balance/probe_livinguniques.ts",
      "sha256": "45e467539d6ca535bd9bbabe109dbf88e05561042a92b90ecea1421e196e0c57"
    },
    {
      "file": "balance/probe_locales.ts",
      "sha256": "32da45ed452452bba407018f7b4f3435e9eedbc94758ef192a85157bf0cf5178"
    },
    {
      "file": "balance/probe_lonecrypt.ts",
      "sha256": "43b6f716fc0f3183289fa8255a7ca7d3316e1a1053a5a2e137b4f83432368c17"
    },
    {
      "file": "balance/probe_loskey.ts",
      "sha256": "74ee3264e0f8002858d7fa69a0074a9cda1bcd1684b7d8038871e0be69db225b"
    },
    {
      "file": "balance/probe_madden.ts",
      "sha256": "3f434257ba06ae0350afd00233a2297f81b7bfb3fcb8fc800d8f861346235952"
    },
    {
      "file": "balance/probe_magicpackevents.ts",
      "sha256": "61f8801759a7bc97989e80012e68f26576f63ae2ca13e4e2f792c4797900fc50"
    },
    {
      "file": "balance/probe_magicpackmechanics.ts",
      "sha256": "db1940a96089e8ce95c16ff0e4723e02d681e45a3bd44a7cd98b106bdda83abc"
    },
    {
      "file": "balance/probe_magicpacks.ts",
      "sha256": "9a3edfaa2be73f7d9e4cc852afa24e72fcd7b266040c70a5b9d80a0ee9be0b8c"
    },
    {
      "file": "balance/probe_mass.ts",
      "sha256": "673a642e613a74ba19671d53f71fd16e7c6264b1645af6617aa16a5a856fb2cf"
    },
    {
      "file": "balance/probe_massif.ts",
      "sha256": "ff02f0852cd66d1b7979c78f822ed599c9cd75c90ccc857b255d266ac3f3651d"
    },
    {
      "file": "balance/probe_meadowmere.ts",
      "sha256": "dbbaba309f6832bf35f7bb7037f3407a3ecd35423a756484240da805ce7d2807"
    },
    {
      "file": "balance/probe_meleeread.ts",
      "sha256": "78093568b6de8e6b43537ccc4e1823060deb54195594e205bebf1ebf4751153d"
    },
    {
      "file": "balance/probe_memories.ts",
      "sha256": "1fa3ea87daede491eafaee2d01576adc0edad75585b77c2ade42ae4d0413a6a9"
    },
    {
      "file": "balance/probe_memorylesson.ts",
      "sha256": "afd3b6fc12563ae77e47cd51aa8f6e1f2e38989b2838697b368321c3d6ff4719"
    },
    {
      "file": "balance/probe_memoryunlocks.ts",
      "sha256": "ae6496cb3a49be6ab7ac9dfe9d26fe6d029e31e3b954b276b2c5f568968df8cb"
    },
    {
      "file": "balance/probe_menubar.ts",
      "sha256": "7b11692ffab6708f8fb24e507845830baeb6553ba4a83e984348fa77ce0a1ac6"
    },
    {
      "file": "balance/probe_mercs.ts",
      "sha256": "8c24dcda8ed9488a3bca0b2e9b0bebba107c143c7b21a42444a40c4901a1a0b0"
    },
    {
      "file": "balance/probe_metaslotinput.ts",
      "sha256": "ccf1767ed5ceb428857599b2308f8478ac303a61522039c3ef4660d3ffb198d1"
    },
    {
      "file": "balance/probe_mimic.ts",
      "sha256": "ef03da63abc0593b59ac29201171e5db385aff6a6470fe46b81d227063b60e5a"
    },
    {
      "file": "balance/probe_miniontargets.ts",
      "sha256": "1c8186ad56a1bbbc03586d3e328f0f99ca5ccdd720f045a5a4d76f945e23c752"
    },
    {
      "file": "balance/probe_mireille_lesson.ts",
      "sha256": "e83ec59e1448f61c307f6b7767b5f2955bcb256894b01da23085ee801ca298c4"
    },
    {
      "file": "balance/probe_mount.ts",
      "sha256": "60f2b117249e6de3c24d04fb87ba82d314181a23870123e565c95af39b254668"
    },
    {
      "file": "balance/probe_mountain.ts",
      "sha256": "013bdc819da9c1fcc7c7f55e91462502c5496f580bfafa89dd3c3aa9b23b3e41"
    },
    {
      "file": "balance/probe_movementtether.ts",
      "sha256": "ca793b25906d6e81562acc06f30dce0f969a966c42487f53b648a3c23b84aab5"
    },
    {
      "file": "balance/probe_movementvisuals.ts",
      "sha256": "ca6f1a5433bca179a10bfd829e1bf25a5d40ff36c923e076ad9151a3dbdf9d5e"
    },
    {
      "file": "balance/probe_mu.ts",
      "sha256": "4e4e6fbfbd9613c58d3c217ded919430281a054f7dc79d6fda90ef73d71358a5"
    },
    {
      "file": "balance/probe_mudwell.ts",
      "sha256": "b35c215fe183ad1a1f642c1e0e21e990692baf36ec693125e622173cacb3da49"
    },
    {
      "file": "balance/probe_muoffer.ts",
      "sha256": "251331128d575dab57da3b97e54d54e2c2d2bfa29ad03e4ca2526d78fb822290"
    },
    {
      "file": "balance/probe_murmuration.ts",
      "sha256": "eb0137eeaab8ecbb4b95577d652aa3c6611ca5f3cf0db02371e793092f08628d"
    },
    {
      "file": "balance/probe_myceliafront.ts",
      "sha256": "193b07aefbfb542eea78efd91f3f3c44a764dcc53d730f1e79afa5ba26869a9c"
    },
    {
      "file": "balance/probe_nan_hunt.ts",
      "sha256": "2fd36fa9ce405b0dfedbc7f83948153dc4b6d9d5198de94db61d9c36fb666a12"
    },
    {
      "file": "balance/probe_nativeactivedescent.ts",
      "sha256": "0eaf8e4340a51b23355af94bf59a5e944fbf5767150016305983bb538b410929"
    },
    {
      "file": "balance/probe_nativeactivedescentsource.ts",
      "sha256": "70ccb82d59611d297c3e2cb74d8af91ef1b2948462543bd4be19d9650782c989"
    },
    {
      "file": "balance/probe_nativeaisource.ts",
      "sha256": "238c0857045d5f9755b5fa7a802672b46593d38fe4093ecb17f5548987ecb360"
    },
    {
      "file": "balance/probe_nativeaitargetcontinuity.ts",
      "sha256": "04171cba6f8ef9b0ec6c1b4ddaaa1a68771724234cede7ff7b46da87ea27e4ca"
    },
    {
      "file": "balance/probe_nativeaitargetcontinuitysource.ts",
      "sha256": "e9fc7d0aad9011e38f4df253d0ac2f0a1e36a142d2f4fba884d360936015ed61"
    },
    {
      "file": "balance/probe_nativeamalgamationcold.ts",
      "sha256": "64c47ed11a9351d150182707d93a3250358f3398cafdefd321d98697b4e88730"
    },
    {
      "file": "balance/probe_nativeamalgamationpeers.ts",
      "sha256": "b66ca4eeaa32ae780da1ffe9ab3e9c7223d9906d6bd96cb5dfb1014adcb5d1d1"
    },
    {
      "file": "balance/probe_nativeamalgamationstages.ts",
      "sha256": "a21fbb780faf3a4247e29d770722334598aecbfb836e369b898dc56bb2a6ad6b"
    },
    {
      "file": "balance/probe_nativeamalgamationstagesource.ts",
      "sha256": "5d08a31bf0097e1a502a37394de13d2f90dddf27b70ed8e6945ed89286261c55"
    },
    {
      "file": "balance/probe_nativeambient.ts",
      "sha256": "3fa0f08141ed6882954585956d0e27a3288112292aaf16d2e45d35253faac73c"
    },
    {
      "file": "balance/probe_nativeareaai.ts",
      "sha256": "82a2385eb08d44d764ebe679bd587d91997139df82d857035ad3b082a9ac9595"
    },
    {
      "file": "balance/probe_nativeareaai_actions.ts",
      "sha256": "89d6725002d3fe3ba103e66f3cf4593335553b8d1dfe7bc07e0c42195d619df3"
    },
    {
      "file": "balance/probe_nativeareaai_gates.ts",
      "sha256": "972b22788ec7a6e7d6b4586287267fd316427f12bba2ab8c9b9d2b227b036820"
    },
    {
      "file": "balance/probe_nativeareaauthority.ts",
      "sha256": "8bb8625325b62367b17e7382529df8cbf4589982227069638746e509fa139d25"
    },
    {
      "file": "balance/probe_nativeareabirth.ts",
      "sha256": "fc28a6ae975af10c5019ca1c647408dd35448a67c72b6c0da5e2532511f30792"
    },
    {
      "file": "balance/probe_nativeareaboundaries.ts",
      "sha256": "9edf357e3394a3be1f32b48be8ec1e25dfff2ca076dcb4fdbe28643b6d4e55ec"
    },
    {
      "file": "balance/probe_nativeareainput.ts",
      "sha256": "c294f9a5a087c046b737058512e35c44488cb67050687aaf678c80e483101918"
    },
    {
      "file": "balance/probe_nativeareaisolation.ts",
      "sha256": "dbbe4248815939a9efbf8cf0d32e50192b95ae4fa994bc9d2f4b045299479230"
    },
    {
      "file": "balance/probe_nativeareamemory.ts",
      "sha256": "feeddf4c8cf1a873cde7d1c738cdbbce1adfa7f561de9656947938e6c9b0c060"
    },
    {
      "file": "balance/probe_nativeareamenucards.ts",
      "sha256": "4d95491b4c9557d96471c378bf33610812ea0a895d21ba682e2f05e5ed81dd5e"
    },
    {
      "file": "balance/probe_nativeareamenudwell.ts",
      "sha256": "0c743bb34ee3e7b966db4f52b16e5397f1c6060a264d487ebd8045154dc0e7f5"
    },
    {
      "file": "balance/probe_nativeareamenuqueries.ts",
      "sha256": "70645145feb77d820b05182ce38fe5668d464f6621f809cd2ebc08f52521a6ac"
    },
    {
      "file": "balance/probe_nativeareamenusource.ts",
      "sha256": "bf91cb5f4920038554eb01499386f5b84a8c807a2880606106999c8fb0fa524f"
    },
    {
      "file": "balance/probe_nativeareaongoing.ts",
      "sha256": "b122471bf96357b49f262465d6b25247e2d924965502ba5a13f2e41372280228"
    },
    {
      "file": "balance/probe_nativeareapresence.ts",
      "sha256": "948a45182c1897302aa85fdbbd64e92a3a1a69c7cc61b0889f680883b9cc5992"
    },
    {
      "file": "balance/probe_nativeareapublication.ts",
      "sha256": "f2edbeddfed836b426aa1bc6fd4967458e221ead54060140a49a881acf914362"
    },
    {
      "file": "balance/probe_nativeareapublicationsource.ts",
      "sha256": "0866443e0e8b65ac5b5c2633c79b77a90e2346640c644817ed55a3bd16fa3289"
    },
    {
      "file": "balance/probe_nativeareasourcesession.ts",
      "sha256": "a0e2de5bb87c1e911bb9f96a3cf382f60b0d682239f0e7ca96877aa3c9620399"
    },
    {
      "file": "balance/probe_nativeareauiactions.ts",
      "sha256": "62f4444a34af28e22b59087b494e3deca2413de1b8f981a238ecdd70eb8a1a61"
    },
    {
      "file": "balance/probe_nativeareauiactionssource.ts",
      "sha256": "3d0d7f4422023781469115313282c0428307afb82c992f09823fecc70a7bf6ef"
    },
    {
      "file": "balance/probe_nativeareauisailing.ts",
      "sha256": "de40771718a22f878eaf3617de09a022d248626545b02ec33d4a366afa9a394c"
    },
    {
      "file": "balance/probe_nativeareaviewqueries.ts",
      "sha256": "bc82acf9497369a69badc8cf6bfa425ee3bb1a612cc14958a5a81084ad4ed153"
    },
    {
      "file": "balance/probe_nativeareaviewqueriessource.ts",
      "sha256": "dbaabb88c6400e519b1305983c07bb66b3fe4e88ea6e5fdad10b1fdde00726e1"
    },
    {
      "file": "balance/probe_nativearrivalactorreceipt.ts",
      "sha256": "45352224cf7d88d39770ab339dd7c33abbc0aef2a4f2c408e65bd286f4dc29e2"
    },
    {
      "file": "balance/probe_nativearrivalcompositionsource.ts",
      "sha256": "81766caa0a7c8372e46b709e022c49c2c00011c2bc122d7519055064f40bd2a9"
    },
    {
      "file": "balance/probe_nativebirthadmission.ts",
      "sha256": "5b1b6108ac36f5560a68b3460d5a9553c59ce8c735eac0dc636a2a9adcf5a894"
    },
    {
      "file": "balance/probe_nativebirthlifetime.ts",
      "sha256": "94f9c0f3e93de43484ce157c99819ec807d88b74b6784d3bcadabe5e3e42b5b4"
    },
    {
      "file": "balance/probe_nativebirthlifetimesource.ts",
      "sha256": "db579f3f4114045b0ad1be9bc9be868633c270ec088ec7a9930129b6079d5eae"
    },
    {
      "file": "balance/probe_nativebountyarrivalcold.ts",
      "sha256": "35c3e253e68115b74b39a1c723a8e1b4cf1ced8c0526ffa2a765044209de5c4d"
    },
    {
      "file": "balance/probe_nativebountyarrivalgameplay.ts",
      "sha256": "28212f12d12dc85457f3001c5139a7853e83867327c89bf17ca167d67e2726d8"
    },
    {
      "file": "balance/probe_nativebountyarrivaloracle.ts",
      "sha256": "76cee856bf626db736211a4737afaa1c9e49f7da2529f402d603e89d197bde79"
    },
    {
      "file": "balance/probe_nativebountyarrivalsource.ts",
      "sha256": "f6860db5d4a34a49ab37a56b76eabf7378d43e7172d954ddccb1e8d5dc3b7a8c"
    },
    {
      "file": "balance/probe_nativebrowserentrycompositionsource.ts",
      "sha256": "2e746497ec23a80526b144aa345d91fc9a7fa5c154c7123e4651669612bdbfcb"
    },
    {
      "file": "balance/probe_nativebrowserhostedcompositionsource.ts",
      "sha256": "6a8ddec8585fdbe9376380bb62c9d7888b6fa74d03731b67ef3aac7de3b19bfc"
    },
    {
      "file": "balance/probe_nativebrowserstarthook.ts",
      "sha256": "5806aa038d35f047ec9f4b615c2d2521aca5f52e14329adcf89b9dbb23fc1d6d"
    },
    {
      "file": "balance/probe_nativecampaigncompositionsource.ts",
      "sha256": "128190f221ffcb389614992d305f9f197c24b34b87d8a2202ff26b77809933bb"
    },
    {
      "file": "balance/probe_nativecampaignframeclosuresource.ts",
      "sha256": "82fa7c7df9e39a3c93d2abe0731e05885e516847841fbb07a39fb372cee07137"
    },
    {
      "file": "balance/probe_nativecampaignframesource.ts",
      "sha256": "8f1a84043172c3cc69fe747b5be611356844a85b7c7f1337d43e266a4856d24f"
    },
    {
      "file": "balance/probe_nativecampaigntransitionssource.ts",
      "sha256": "2aa9c8c3b5e88e797e7bef14ace2395a34b7bdf554a3f9eec41f5aa28f2456f1"
    },
    {
      "file": "balance/probe_nativecaravancompositionsource.ts",
      "sha256": "c5e8096f94d8aaca8af939271ad2d9e250a2120d04e28621a8a9349995b88d16"
    },
    {
      "file": "balance/probe_nativecaravannews.ts",
      "sha256": "b6cf85f08e905434207be9bda6c75ef5f2b63dad3c6faf6cbb61a6cd12abf1a6"
    },
    {
      "file": "balance/probe_nativecaravannewssource.ts",
      "sha256": "6729d74e4652136e0147f6185f30e772a84f35437e330f1606c1d0a755ba5d05"
    },
    {
      "file": "balance/probe_nativecaravanrevisit.ts",
      "sha256": "59c25c0edcbf9131bbb431c47b0cd97765cbe063996911e50d425587e4f24209"
    },
    {
      "file": "balance/probe_nativecarriedadmissionfinal.ts",
      "sha256": "3cfb8c5a41190394f9aa965e9d6c6e7b5704fff7590ae746457bceee82610088"
    },
    {
      "file": "balance/probe_nativecarriedadmissionfinalsource.ts",
      "sha256": "2f555f94488933020bb1cabad406a7ce2783285ae503fcf11d24bfa481ad078b"
    },
    {
      "file": "balance/probe_nativecarriedbootstrap.ts",
      "sha256": "e050cec9127858616086b88c69dbe5c532742d61d553e7bd840998516b2824a4"
    },
    {
      "file": "balance/probe_nativecarriedcastcontinuation.ts",
      "sha256": "04cb0642c8094b715dfd7eec0b15838e1a862b94b2eb0355ab383bf729295846"
    },
    {
      "file": "balance/probe_nativecarriedcontrolsource.ts",
      "sha256": "4017ef5447f1e92608c29eea42f493aec7d2b2baff85f9d9fc49a382c1e612e5"
    },
    {
      "file": "balance/probe_nativecastingpreparation.ts",
      "sha256": "cd7d6a0e84ca0d63bc2d742fba9894c6f773359743dd1a674a7d4c4694f4d290"
    },
    {
      "file": "balance/probe_nativeclientboundaries.ts",
      "sha256": "bcaa220d04c093774d23051e67723d66956ff4fa1eef4c054276af34600ee6d5"
    },
    {
      "file": "balance/probe_nativeclientconclusioncomposition.ts",
      "sha256": "b6c50839b733271cada0fcccbda2b552841ea4c40b36982294d6ebe9466edb1c"
    },
    {
      "file": "balance/probe_nativeclientconclusioncompositionsource.ts",
      "sha256": "e08fd57a36153ff908a6f5f5313c088ac24722aa43f95d2963a55b808afae7ee"
    },
    {
      "file": "balance/probe_nativeclientconstructorcleanup.ts",
      "sha256": "db9d520b17a2fd4b4483c3443058f50984e5259b6f0bb1998a2952f9eaf4139f"
    },
    {
      "file": "balance/probe_nativeclientcontinue.ts",
      "sha256": "5260f385b5ce55f9dc5bb8334947fa07e0c5998bf93f23dcffde3e560315160e"
    },
    {
      "file": "balance/probe_nativeclientcontinueboundaries.ts",
      "sha256": "2c9a6906a0473db7b4dfdbead635d72ccf05fb9b09dcfd99ba68ad71d454d606"
    },
    {
      "file": "balance/probe_nativeclientcontinuecold.ts",
      "sha256": "e2a8d636a8fbd82b33f66f981ddaa9e46f35ebae976db99f037954a0e88b9a29"
    },
    {
      "file": "balance/probe_nativeclientcontinuemercs.ts",
      "sha256": "708ae29966d339a1f20254250c35fd68b8794db9991bb9332a89ad38a90c9019"
    },
    {
      "file": "balance/probe_nativeclientcontinuesource.ts",
      "sha256": "e3511892c4378ccdd0e799eafd1fc34a02626f054bd3390a73a7760383c94431"
    },
    {
      "file": "balance/probe_nativeclientcontinuethrong.ts",
      "sha256": "f3c680a6f23d14ad98c5d7682c4aff5f4048bd200c459a4b1d586da1304b3617"
    },
    {
      "file": "balance/probe_nativeclientcontinuity.ts",
      "sha256": "43b265854754bcc4af0dfa5202dd071f4089f2108a72974851255104dd5f9d89"
    },
    {
      "file": "balance/probe_nativeclientcontinuitysource.ts",
      "sha256": "143d5949351931b0623330193956d70392e8d1b4bf52679b447d023831cee595"
    },
    {
      "file": "balance/probe_nativeclientdispatch.ts",
      "sha256": "2fb281ef29bf9f44f6c4c57747c241d96509f1f1ddd5e9e935572d2391c8596f"
    },
    {
      "file": "balance/probe_nativeclientgeographysave.ts",
      "sha256": "853593839644a19103fd32a35927130a70df01cc58748d5d57c90b947b057dd3"
    },
    {
      "file": "balance/probe_nativeclientlifecycle.ts",
      "sha256": "3c2f88b68344ed845e7e36c8e12c00b876fdbaf77e12a92fbfa8a41e50969257"
    },
    {
      "file": "balance/probe_nativeclientmenucomposition.ts",
      "sha256": "981a8849721995fa925d8ac11ed70332be5f219117c17571a12cb65f744e029d"
    },
    {
      "file": "balance/probe_nativeclientmenucompositionsource.ts",
      "sha256": "df7c4a75f051d330915f6ff3d61064428817fef425128833ac701ebbde327062"
    },
    {
      "file": "balance/probe_nativeclientpublicationcomposition.ts",
      "sha256": "92ff675ce5d34305fd70b39cc78619fce5e223ba43b3662c3779c8ef05e346b0"
    },
    {
      "file": "balance/probe_nativeclientpublicationcompositionsource.ts",
      "sha256": "d4898aba7cb77e0a0b948b3e4bba43270c4db81c60d5c80c7e604c90da6bed44"
    },
    {
      "file": "balance/probe_nativeclientrestoreowner.ts",
      "sha256": "b9ac1c0e08e7b4785521c78ea90ae5616fa8ce3b34fdb0fed87bed440ea0c939"
    },
    {
      "file": "balance/probe_nativeclientrole.ts",
      "sha256": "9082786903108f34914b0586deb78728ecb4037d134a40c0f3d94c82bcd0c4f8"
    },
    {
      "file": "balance/probe_nativeclientruntime.ts",
      "sha256": "63169355b96a67940df862d2f9aea9bbe85dd2785b8d7c8d6bf4bf3c82ed9b67"
    },
    {
      "file": "balance/probe_nativeclientruntimesource.ts",
      "sha256": "45701f6c31918fb9cd499bdcf00f128bd87ecd019a771cb5196391b7cc20bd81"
    },
    {
      "file": "balance/probe_nativeclientstart.ts",
      "sha256": "089d57990b8d199d1ae6dbdbe3f652a1bef6d3bd631e0d7c44232733978a91b5"
    },
    {
      "file": "balance/probe_nativeclientstartactionscomposition.ts",
      "sha256": "61459d48aea4a6851816f06e984f5cf4b990536127fb08561c72ee2f1a69902e"
    },
    {
      "file": "balance/probe_nativeclientstartactionscompositionsource.ts",
      "sha256": "eac71c88d473c80a95a2887c375278b1c2ecb9692516214a33276ff82b30a1f6"
    },
    {
      "file": "balance/probe_nativeclientstartboundaries.ts",
      "sha256": "3c1bb9b2cbec1072877c0049ae1c3bb545b5cfe6aed49900f1371bf0d0d0f0a4"
    },
    {
      "file": "balance/probe_nativeclientstartmenucomposition.ts",
      "sha256": "875781145398c5d4cba14ce4d9a7df24d6442799dad53b4f897617ee47b550e4"
    },
    {
      "file": "balance/probe_nativeclientstartmenucompositionsource.ts",
      "sha256": "45503412e347481f879a4cb87f0454e4b84e7985809f90043b5fea9ce3d65f1f"
    },
    {
      "file": "balance/probe_nativeclientstartowner.ts",
      "sha256": "1e6c6c7c30077114e76eb8e6acd6589a95621be19119b3a61f6a1011d1427352"
    },
    {
      "file": "balance/probe_nativeclientstartownership.ts",
      "sha256": "693ddb20be81abdb3ef045273f39397242b2d5ae6b550f7b697688ac1e576ec4"
    },
    {
      "file": "balance/probe_nativeclientstartscenes.ts",
      "sha256": "c0861c1298192beef5df0e24e29c20661ecddd82566993ef3a4af892fe73887b"
    },
    {
      "file": "balance/probe_nativeclientstartsource.ts",
      "sha256": "622d4602764a51d1b025f60eda00184cecb623c75396b4232e9adc5388e013b2"
    },
    {
      "file": "balance/probe_nativeclientstarttown.ts",
      "sha256": "fbbfa707acf526f1f18d8ea4344bb12dc7d4e3650c03546aeb1b70e15211ee59"
    },
    {
      "file": "balance/probe_nativecoldfactory.ts",
      "sha256": "4880f400d415af53d160f5b74d67a60163dd10983a30a4a33b5c3843a801c7d2"
    },
    {
      "file": "balance/probe_nativecombatabsentobjective.ts",
      "sha256": "6569377fa1d093c9cfdbab22116e380dd00ca4fc0e1fa89d20355903fe04c85a"
    },
    {
      "file": "balance/probe_nativecombatacceptance.ts",
      "sha256": "7344d0356d69b71d2ff025629d70cb0bf12af550117ab5eff98223db53561260"
    },
    {
      "file": "balance/probe_nativecombatbuyerscope.ts",
      "sha256": "b09ceded37db47452ae42c6c0e5a7d2dff9f1b31013f6c4c6c283ec8a72011c6"
    },
    {
      "file": "balance/probe_nativecombatcampaignarenasource.ts",
      "sha256": "8517315f41004aa279348457f2e6cf396ed5a42f9af09fc02b096757ec74400d"
    },
    {
      "file": "balance/probe_nativecombatcarriedstats.ts",
      "sha256": "98fe6f195bf9b57749c27656a6f5acc5fd436b0e4f241b2c89a5073a7ae8e63b"
    },
    {
      "file": "balance/probe_nativecombatcarrytravel.ts",
      "sha256": "fb26f865488d208bec49b3f8077883d5ba3e211f1db963554f680b54de273323"
    },
    {
      "file": "balance/probe_nativecombatconstruction.ts",
      "sha256": "d2e2a21dc0cdf6b2afb7ac0523edf6057591515836ed623ad67a84da0c293982"
    },
    {
      "file": "balance/probe_nativecombatcycle.ts",
      "sha256": "35d1738fe9892cb3b0cb39959587639c0e800b00379f2b02e2f2e3efb45afa8d"
    },
    {
      "file": "balance/probe_nativecombatdeparture.ts",
      "sha256": "44feaedaa4e6b2b790b12f1695de2b2409070eb2d43ae852d13e0563fe150edf"
    },
    {
      "file": "balance/probe_nativecombatdetached.ts",
      "sha256": "03c39cc951ae44db52014985bdfb706351521842889d4a8a45aa33f07aa97216"
    },
    {
      "file": "balance/probe_nativecombatdirector.ts",
      "sha256": "68eb70953e365e309d5c90e9e765bb159823e7b5181a1a7d81d7ccc07b0aa223"
    },
    {
      "file": "balance/probe_nativecombatdirectory.ts",
      "sha256": "8f815ce80ab6aa3b73d4a7bbf90c1e496e8cef893cfaa6044e2df18a2a84352f"
    },
    {
      "file": "balance/probe_nativecombatdirectorysave.ts",
      "sha256": "42df90f30df8f3c82d91e93f2d7a6e7ec10fc54655a26b314a4a983279e4da3a"
    },
    {
      "file": "balance/probe_nativecombatentrybinding.ts",
      "sha256": "8240bc6d7640a18eb8103054e44652239e8631a9d3151f8513b82cdc206dada4"
    },
    {
      "file": "balance/probe_nativecombatframelifetimes.ts",
      "sha256": "8377d982c4a733f6803661d16a6c9cac7af079882d91720deb06638f25fe6e40"
    },
    {
      "file": "balance/probe_nativecombatfullframe.ts",
      "sha256": "33941c4b9dccac548598f8dfc167cc9b91db3957c599e8adfdb3d2cd1c015eec"
    },
    {
      "file": "balance/probe_nativecombathostedframe.ts",
      "sha256": "bb53512f3444d81a98e6a60907bf3d8e7a1f23d83803b116dcb8ec60f1f618de"
    },
    {
      "file": "balance/probe_nativecombatkernelhooks.ts",
      "sha256": "52b1b601a8c709bb31b0251b754d1dba10a4c7bd60c6cd348fee66cc5000e5ee"
    },
    {
      "file": "balance/probe_nativecombatkernelsource.ts",
      "sha256": "14adf5ad7b327a03b8690a9ea5ea6ec99107444d19480805caab25f0bd7a773a"
    },
    {
      "file": "balance/probe_nativecombatlifetimes.ts",
      "sha256": "2558c98480bc7b954bda586eb0790f7c02cd9d42d58bfe51ff6dab9b05fac1af"
    },
    {
      "file": "balance/probe_nativecombatlocalframe.ts",
      "sha256": "8150207e1e1b786414dfabfef873c99c1a99d3e164356c77981b59f4c1ba135a"
    },
    {
      "file": "balance/probe_nativecombatmassguard.ts",
      "sha256": "f65dd526d5d115cf7f084e1c9746997a43d5c1661bd8ad3f945bd14f4d2d850a"
    },
    {
      "file": "balance/probe_nativecombatmotionsource.ts",
      "sha256": "dc4022c5836417b8f9edfd29e9b8f2f7ed008c5521ae4543aac8579e5fcab52b"
    },
    {
      "file": "balance/probe_nativecombatobservationbootstrap.ts",
      "sha256": "4c6e58503742693a136b4ea018881ec38e53d7944bd29847da6147813749cccf"
    },
    {
      "file": "balance/probe_nativecombatongoingmass.ts",
      "sha256": "bbaa55a7367b9cdb391e8975b898f6d59bcf311381fe3a8ad2bb1a3777f08273"
    },
    {
      "file": "balance/probe_nativecombatoracleagreement.ts",
      "sha256": "03b71fb7cfb40a0fb5e9b73f116c9cd03419588150f1f1c2420604980a5e99ef"
    },
    {
      "file": "balance/probe_nativecombatportalabsence.ts",
      "sha256": "e7fa929ee8febbcf3da30bc8185118608128b5399e529e2d7ca4218add5a54e9"
    },
    {
      "file": "balance/probe_nativecombatpresentation.ts",
      "sha256": "18db328ec169e2dbb5fb1a8d69bb198611df381ca03aa65956d77649eb442a00"
    },
    {
      "file": "balance/probe_nativecombatpresentationsource.ts",
      "sha256": "0021f4e123d3e09932627e6b340eeb59e263ae133ce0cc6bc763c76efd616bde"
    },
    {
      "file": "balance/probe_nativecombatqueuebinding.ts",
      "sha256": "f667eb7d253416d6bbd2b998099a7c43d5c599a99289bbc22a0fddefce72cbe7"
    },
    {
      "file": "balance/probe_nativecombatrecordselection.ts",
      "sha256": "f48f62ca1242380114f46c3328412186fda1a4a05b1d053a8f7ccc925d22c1ed"
    },
    {
      "file": "balance/probe_nativecombatrescueattendance.ts",
      "sha256": "22ec4931514df5eb13d5ad58af0411b48c2825c5e61a53aa1350c72271ba500e"
    },
    {
      "file": "balance/probe_nativecombatroadcohort.ts",
      "sha256": "d88a1140cc24ed79ba38f09a3b8f6ff864760b99d6dbf7018a35ee746a35b02e"
    },
    {
      "file": "balance/probe_nativecombatroadfinalcheck.ts",
      "sha256": "281a7ae378697cc0eea0f94d0a5d823848c8598aa7fbcb9e89bac68c8b127944"
    },
    {
      "file": "balance/probe_nativecombatroadidentity.ts",
      "sha256": "67d2a778e059d1f97979e99744d742816fc53d3c6bf97815ee0203c07bbd4c68"
    },
    {
      "file": "balance/probe_nativecombatroadqueue.ts",
      "sha256": "d3af43a9ca554be679b003caaef8ba2365d555e7f0b4d5d2758b94edab183941"
    },
    {
      "file": "balance/probe_nativecombatscenecarry.ts",
      "sha256": "d4e653c720035021271be98725f422615a49de4938564a7e0eea887f55945ab7"
    },
    {
      "file": "balance/probe_nativecombatsharedstate.ts",
      "sha256": "46f8ae6ca6ec99f25bf0017c447c97726c7cc0f35a777fc83fd7a99daf07c21a"
    },
    {
      "file": "balance/probe_nativecombatstate.ts",
      "sha256": "42c07c8bace6f61ea861fde8192e13d6c3510e761fb89aee91c4bf32588dd175"
    },
    {
      "file": "balance/probe_nativecombattravel.ts",
      "sha256": "b564d9b4a6f621c6b75b9cd93d61847e001052f28f3e69ba19749186795e6e72"
    },
    {
      "file": "balance/probe_nativecombattravellifetimes.ts",
      "sha256": "88445e7bbc926a60dde70dd50d77228b751a56ae4416518ee11ec270428ff4af"
    },
    {
      "file": "balance/probe_nativecombattraversal.ts",
      "sha256": "f8980d45988b0e796ee25405800f243996139c6233935b9dc43bc891f1ea4a09"
    },
    {
      "file": "balance/probe_nativeconclaveattendance.ts",
      "sha256": "d5dab65d034d418a694f315410f4c532ba2189b7a4bd4a41979cd54194cb8130"
    },
    {
      "file": "balance/probe_nativeconclavebirthidentity.ts",
      "sha256": "ae85d8c586199d8a8ab355b832b0ac9aa40413a59e2c667e79abaa2002682dbd"
    },
    {
      "file": "balance/probe_nativeconclavebirthtail.ts",
      "sha256": "0cf56cd1a0196fda2ea9bb0c170526acd9579d2f397b2e48763eaacdec98ceb0"
    },
    {
      "file": "balance/probe_nativeconclaveboundaries.ts",
      "sha256": "bab45aaef5334aea9dbc2a6d1d8ac32c84d8d48988fec036598b1ba357f2c69d"
    },
    {
      "file": "balance/probe_nativeconclavecold.ts",
      "sha256": "0dbf733463c22bb9a485fe3a6d24ae2a3a67218c42e3b15d5b1c394eec970a4d"
    },
    {
      "file": "balance/probe_nativeconclavecompositionsource.ts",
      "sha256": "5bac29c7961e76af2c90400004837c86bcc185ef1bf880baf2d3f7141558c6f3"
    },
    {
      "file": "balance/probe_nativeconclavecontinue.ts",
      "sha256": "cba60a9d4ce8b7641b4f72b4bbf3764bb4e66fb886636187ffc5806a23b6536d"
    },
    {
      "file": "balance/probe_nativeconclavelifetime.ts",
      "sha256": "188cecad472134c5e429be5ef529cd6032c37f55f96647694108ace01c4102ff"
    },
    {
      "file": "balance/probe_nativeconclaveownership.ts",
      "sha256": "4f261f1c0c1d651c107c6c59151c6bc977af7358952fc5d381d97baa0e207972"
    },
    {
      "file": "balance/probe_nativeconclavereadiness.ts",
      "sha256": "5d2d0551758b8bacb9ea5038cab05b890639c560379b7666c61859de179cb5e8"
    },
    {
      "file": "balance/probe_nativeconclavereadinessboundaries.ts",
      "sha256": "ec5221f1f4f95521d701e7418874d256d692eb74f5b07b664268faa54bffe254"
    },
    {
      "file": "balance/probe_nativeconclaveretirement.ts",
      "sha256": "98f2ba9efd3dc8a5aa6e26c359d1e93dd32120d4e6ffe3da4067422aed9f023b"
    },
    {
      "file": "balance/probe_nativeconclaveselection.ts",
      "sha256": "2facdc05be4d439aea285ac4d032a3b3c60ce85a51ba88960ae6ac92f4ff5335"
    },
    {
      "file": "balance/probe_nativeconclavesuccessors.ts",
      "sha256": "0521b07afe353fc29f1ad2ecd3133417cdf8e4b37bef41b8c6edc7219426d1b6"
    },
    {
      "file": "balance/probe_nativecontinuitycomposition.ts",
      "sha256": "64d4b074df743146eb773f4dea4143b2e7156c39b60dd34d43a4cc0962b9e3e0"
    },
    {
      "file": "balance/probe_nativecontinuitycompositionsource.ts",
      "sha256": "17c59e3a146a2b399b9938a6f5f9ce8087fc94a89b0d6c8c1c042117322c01be"
    },
    {
      "file": "balance/probe_nativecouchjoinlifetimesource.ts",
      "sha256": "57ca4198e7c95600d9a607cf4e2f0d354f83d8d2e13721547714c06042bbdba1"
    },
    {
      "file": "balance/probe_nativecrusadecold.ts",
      "sha256": "68d17a1c3705a82fe782440245cd20cbf7fcfe15fade888ce2de4d55246f8fc5"
    },
    {
      "file": "balance/probe_nativecrusadecommanderparity.ts",
      "sha256": "abc77a7473b0e2d4e5d94f529444e2952f8833ecf68dae468d3f4f8b1ef155e2"
    },
    {
      "file": "balance/probe_nativecrusadecurrentcallbacks.ts",
      "sha256": "e91d86c3c96dd0c12579aaf12d6397aab9382cc121383e63605ce47b1fc4b264"
    },
    {
      "file": "balance/probe_nativecrusadecurrentcontinue.ts",
      "sha256": "01ec5e6f6e1925ba37f15f50cad39c2dcfe4346201daf1b1acf4b4e46016418b"
    },
    {
      "file": "balance/probe_nativecrusadeepochboundaries.ts",
      "sha256": "f6bf7d1b3b03d4e182ee457273b7607c0f926b1b0d1b83286378223a7f989165"
    },
    {
      "file": "balance/probe_nativecrusadeepochwitness.ts",
      "sha256": "13f507f9e5dc7efa7e932f5e80efcfebf802471b81a28ccba378968fcf8787bb"
    },
    {
      "file": "balance/probe_nativecrusadeoldcommander.ts",
      "sha256": "d8c3057dfdb01ea6afcc10236b8ed45d9793ccfa764c43aa645b5d929af580f3"
    },
    {
      "file": "balance/probe_nativecrusaderestorationcompletion.ts",
      "sha256": "7df2ba44409cc015050b5dfb5fb3678fdbc4462f6af342a0046dae3f0acd1e9b"
    },
    {
      "file": "balance/probe_nativecrusadeterrainboundaries.ts",
      "sha256": "44d3cfbc0c4913ce074993fd675ec241808106bca03a2db16f672f91d77a1753"
    },
    {
      "file": "balance/probe_nativecrusadeterraincallbacks.ts",
      "sha256": "d03fceb8f5f31c139cd535a97296ef7f8b6f3d25ae167022215f581d85ece3a2"
    },
    {
      "file": "balance/probe_nativecrusadeterraincold.ts",
      "sha256": "0e0ff7a12937cad2c57c3fff3a6c686d2c701738a282bbf41f84a30e5c228b9d"
    },
    {
      "file": "balance/probe_nativecrusadeterrainprovenance.ts",
      "sha256": "1407d2fc7e40fcd276230bcc689c22075ee3572ae95e540282f6facc94595f27"
    },
    {
      "file": "balance/probe_nativecrusadeterrainsource.ts",
      "sha256": "fbc5e27514ae2accbd9c0c09203f978b44f1df43213c9efbdd33a53ebf750177"
    },
    {
      "file": "balance/probe_nativecrusadeterrainwitness.ts",
      "sha256": "6085bc9e19f326a2e76c15e731807f5511cc220d50a63ce61102d6cdffbc4bc2"
    },
    {
      "file": "balance/probe_nativedefensepreparation.ts",
      "sha256": "cfdd10fb9099b6a77c0c8dbef77d445028f10b4641610a058b85d89c8757800a"
    },
    {
      "file": "balance/probe_nativedelayedarrivalboundaries.ts",
      "sha256": "fc0074a639a6bb23ecff204ff4156b8f31c375b4334703655ad22927cad75237"
    },
    {
      "file": "balance/probe_nativedelayedarrivalssource.ts",
      "sha256": "499f3afca715ee8f78c7be2d45c77aabc95b536c22b8d6220690465d104c67ae"
    },
    {
      "file": "balance/probe_nativedelayedcorpsearrival.ts",
      "sha256": "01e00bafc149f25305ada2ea998b5edbbf31d23438b48fffe647ae92dfbfab4c"
    },
    {
      "file": "balance/probe_nativedelayedcorpsegetterreview.ts",
      "sha256": "09bf9e2cd05e58fa9a127a663b3b4013dd339303ed951511d5fc25e24e85821a"
    },
    {
      "file": "balance/probe_nativedelayedcorpselifetime.ts",
      "sha256": "09bb54492c1c40116063e46f2ba0a6db8c8e73fc5309553d5af9b25065124753"
    },
    {
      "file": "balance/probe_nativedelayedcorpsepartial.ts",
      "sha256": "216d71a1bccde52caed13a2530105845c294690850c3c8083459b1569f1bb578"
    },
    {
      "file": "balance/probe_nativedelayedcorpseremote.ts",
      "sha256": "56c6e2d13e140329eee5bb6b346c214373ebf5838bd2a7b1815e7776037c465a"
    },
    {
      "file": "balance/probe_nativedelayeddelverarrival.ts",
      "sha256": "8e2dd0bcabddbec9d9807004642131eb92d19cb77b6c36b7c9b88b4e151fc0ba"
    },
    {
      "file": "balance/probe_nativedelayeddelvercontinue.ts",
      "sha256": "1cdffdd21f31895e9be64688f977868fe530505c25ad4506fcb39df48c08f816"
    },
    {
      "file": "balance/probe_nativedelayeddelverlifetime.ts",
      "sha256": "acc2edc44f411f7d5deb3d9930140513ed9ce4ca0f17d24b93f97aee7727e725"
    },
    {
      "file": "balance/probe_nativedelayeddelverpush.ts",
      "sha256": "e3eb3978f88071d65f7b48b1bdbce35dd3bd098b6537403312139d290052ae84"
    },
    {
      "file": "balance/probe_nativedelayedreceiversreview.ts",
      "sha256": "1d39ec75afbd0267aea26d83c6ab60a4ee13864f5c5368accd1bd83bfd6a12d6"
    },
    {
      "file": "balance/probe_nativedelayedunissuedreview.ts",
      "sha256": "1881c921e2ce7ace111ced507e84ce90407ccf4214c3cf4268e630e46f4840ba"
    },
    {
      "file": "balance/probe_nativedimensionboundaries.ts",
      "sha256": "0df03fa35c3f48e4f163f6f442825ab9be186c3e01cb1f8da58bac038194b7e6"
    },
    {
      "file": "balance/probe_nativedimensioncatalog.ts",
      "sha256": "ccce28274469f71889eeb38a5c6e5483a512a450db3fed95e1271e8f6ea02d9c"
    },
    {
      "file": "balance/probe_nativedimensioncatalogsource.ts",
      "sha256": "35208ae582ff11ea2703d9f0dfe8d3556ab58a83c404ae12a04de8668d918867"
    },
    {
      "file": "balance/probe_nativedimensioncontinue.ts",
      "sha256": "ea6f386de29ff8394d9261f04b04e5582e14d781b41350020ffc27aaae1ce969"
    },
    {
      "file": "balance/probe_nativedimensionentryidentity.ts",
      "sha256": "1f2859afe0202e18231b99b66a4e2df50b72766e466146ed71ae5b24d89a2e29"
    },
    {
      "file": "balance/probe_nativedimensionlegacy.ts",
      "sha256": "cf1f2a35286842b39539a9fb3a812b6720a81c8baeec47d91d4c93b9bc24a5d1"
    },
    {
      "file": "balance/probe_nativedimensionreturn.ts",
      "sha256": "43edc3e5bc36836e7c4c86995b079cc616b177cef047d80cfe16e18a9639720f"
    },
    {
      "file": "balance/probe_nativedirectorbirthsource.ts",
      "sha256": "29371132182af45a0199e90e9a407927d278dfdf4812240c4c2f7a3871693e2a"
    },
    {
      "file": "balance/probe_nativedisplacement.ts",
      "sha256": "51bb4cfd26e4fa3762cf51eba46f499a75c2dab89d379e3c494b1f9ea9ad3a66"
    },
    {
      "file": "balance/probe_nativeencountergroup.ts",
      "sha256": "46aa51e5e8191d73853f37f43a1cde5bbbdc57a27789bfedfeb57135945b3d3f"
    },
    {
      "file": "balance/probe_nativeencounterinsertionboundaries.ts",
      "sha256": "e3ea23ecd56fb1cd7953fdce838d226a4b585277af48d462b4edbca2259549b4"
    },
    {
      "file": "balance/probe_nativeencounterinsertionsource.ts",
      "sha256": "b3569ac62a2d5191440717764cfd9e90b4d87f67d207cbdb6bdddb4b9b2a47ca"
    },
    {
      "file": "balance/probe_nativeentrycoldselection.ts",
      "sha256": "fce1f254fa50af4a705d7545c4db7462a9b9f8363ae1d1a2d1c2b9cdd99c06ef"
    },
    {
      "file": "balance/probe_nativeentryconsolidation.ts",
      "sha256": "b3dba570e6debb1db21a8dded7fefd11728df06138f5620010dc0dafe87d6e11"
    },
    {
      "file": "balance/probe_nativeexactanchors.ts",
      "sha256": "67dde37585a5fee954a2d71816bf6ab86b50efb685a2d25525a8ebf29f1d723d"
    },
    {
      "file": "balance/probe_nativeexactanchorsource.ts",
      "sha256": "09c6a60066c537db71dfc2e1de0c00e53f760743ead356766c0915becdfbe256"
    },
    {
      "file": "balance/probe_nativeexitpreparation.ts",
      "sha256": "97401c905f61f6c40d74dadab9b92e07d382fe99839c4cb7098c7f19258966f0"
    },
    {
      "file": "balance/probe_nativefinalentryplan.ts",
      "sha256": "84156a45ef6c9efc6b0fda166b9076dfafe148288e3fba68793b10533451efed"
    },
    {
      "file": "balance/probe_nativefinalselectioncallbacks.ts",
      "sha256": "f74ec2c7b5736b135fc600c645664169a2fe077ce8d4d79fa3dd7c5d265db32a"
    },
    {
      "file": "balance/probe_nativefracturecompositionsource.ts",
      "sha256": "0690c0ea30a42bed43eaf484cd5f537d5393bc0837f83d6623bd4fcde109593a"
    },
    {
      "file": "balance/probe_nativefracturehop.ts",
      "sha256": "b3aaef8d101dd7d5d6d3c0ab50b0ee2bded176cdce36be6292810d1e26f873a2"
    },
    {
      "file": "balance/probe_nativefracturehopattendance.ts",
      "sha256": "98433c468bf52e9838c5d67cc4aae870fc5601540bf1a632abd1e8239c776d74"
    },
    {
      "file": "balance/probe_nativefracturehopboundaries.ts",
      "sha256": "4b356acd1b264c997b9b2686a64bce3315aabc759c70234af353d5844d3a06e0"
    },
    {
      "file": "balance/probe_nativefracturehopcold.ts",
      "sha256": "7f7b62bd9e8900f3628c668c183de90cca0274f591fab8d56fd90a61996544cb"
    },
    {
      "file": "balance/probe_nativefracturehopidentity.ts",
      "sha256": "3a91c21e48e6fea62449914f79b0ee5deac125fee5df8f6ea114ded0ba367179"
    },
    {
      "file": "balance/probe_nativeframeattendance.ts",
      "sha256": "8320acb8c74a0a42ecbeaf859e8a7eb53528c4e1a5db6d21de355e14660433e9"
    },
    {
      "file": "balance/probe_nativeframecontactsource.ts",
      "sha256": "5b2a5eb7ccb67d3d0888d03bc04c2cf45d000e35e1ce8e617f8896412571218e"
    },
    {
      "file": "balance/probe_nativeframehooks.ts",
      "sha256": "4976d9f91579c55bbb6c1d7121a3a1c9b6acb28ac5f181fe459208028258c8ba"
    },
    {
      "file": "balance/probe_nativeframephysicalseats.ts",
      "sha256": "a6ee8ee4be068049e34a75721eb86545bea74af00648ce9df239fc4047b820b0"
    },
    {
      "file": "balance/probe_nativeframesource.ts",
      "sha256": "559f0f2669c08fb13416de78640896df152296d9a8d5187194f4c7f725ef9071"
    },
    {
      "file": "balance/probe_nativegeneratedanchors.ts",
      "sha256": "586914118ec78f1cd22a6f1d6f886f6cdd739258c971d57d35975d142f902924"
    },
    {
      "file": "balance/probe_nativegroundfollowups.ts",
      "sha256": "3b1c13fbe5d24ae93edfdfae1057a2812d62c2d93e0299466c296905085313bb"
    },
    {
      "file": "balance/probe_nativegroundfollowupsintegration.ts",
      "sha256": "617af050c2a092403125aa84ac40c2dbd5f04c1e2d7ad199b80becb442d25f4f"
    },
    {
      "file": "balance/probe_nativegroundfollowupssource.ts",
      "sha256": "ca7562b44af1b7daf1e414b1cbad18cd5742055cc6761ec756fc72e5fa0e82b3"
    },
    {
      "file": "balance/probe_nativeharborarrivalsource.ts",
      "sha256": "110dac0555e2678662453c9e904efa3a7137c10df2f00ac0a6166e6cb7614f77"
    },
    {
      "file": "balance/probe_nativeharborservicessource.ts",
      "sha256": "b3d3d8412e7d9df691996653a440e7784626ff2bde423321574c6d2c551a2997"
    },
    {
      "file": "balance/probe_nativehistoricalactorreceipt.ts",
      "sha256": "6b6ae293df4eec2cf134825d02025ab1b5f6e5c69f7595cfdf263e4a5f9f71d2"
    },
    {
      "file": "balance/probe_nativehistoricalguards.ts",
      "sha256": "3dfb700cb5dbc28a884ee84334149fdff42b0826c1d02a025b6274945a717410"
    },
    {
      "file": "balance/probe_nativehistoricalreceipts.ts",
      "sha256": "ba2962fecfc4591f7b1dec8357f4c82d47c3553dc8b20a28813c45d0811c0c97"
    },
    {
      "file": "balance/probe_nativehistoryarrival.ts",
      "sha256": "9fff6ac767af7006aeda34c043b64db9ecc693a5df09de21ac01378095908a00"
    },
    {
      "file": "balance/probe_nativehistoryarrivalsource.ts",
      "sha256": "5f44d07734ad88170cd11ee4193fc33bae7b1080559c17adf8afac323be2b46c"
    },
    {
      "file": "balance/probe_nativeholdvocation.ts",
      "sha256": "c1facad23c877535d97a16a9f1a7ca9afe14a96947347b01c036fcc867d4e556"
    },
    {
      "file": "balance/probe_nativehostclosuresource.ts",
      "sha256": "620a92e5997b9facb1db964eae5da9b4146f931f5e2b3a1d16137a8a04707d41"
    },
    {
      "file": "balance/probe_nativehostedbootstrap.ts",
      "sha256": "581a0bf5e3f7104b22af0b4dff106a513e2b80ef801c002b53841e975e0bf5e8"
    },
    {
      "file": "balance/probe_nativehostedcontexts.ts",
      "sha256": "eec65fbb6acae65fd053cb76af7fdd93c2858b74a7350464f39100d86d24c48b"
    },
    {
      "file": "balance/probe_nativehostedpublication.ts",
      "sha256": "31a5848b3e92141c122caaf98500d2e5f21940fd663b7ee3870c9c306bb9f6a3"
    },
    {
      "file": "balance/probe_nativehostedruntime.ts",
      "sha256": "45ad2073803d0f3c2716efccef7bf67e4862c9d752c0f05a1214c5a354cc1041"
    },
    {
      "file": "balance/probe_nativehostedsource.ts",
      "sha256": "30240c8d1e9095056afd9fed69df1f12f519c5fbfadbcf2f9dd9a09170bf34b5"
    },
    {
      "file": "balance/probe_nativehostility.ts",
      "sha256": "cd35e39759defd955bc76e7ad6d94aa06b095031b577348381cab4531f3f8ac8"
    },
    {
      "file": "balance/probe_nativehostperformancesource.ts",
      "sha256": "14a462ddbe20b1630fffadf8aad819005d6096f9521c10d07904f2b77c434ae5"
    },
    {
      "file": "balance/probe_nativehuntmigration.ts",
      "sha256": "bad9d9d5e9c96d70962fd120a4a3735fe7c432e74ea4ec9765081267af0b8836"
    },
    {
      "file": "balance/probe_nativehuntmigrationsource.ts",
      "sha256": "ce3e777895f577de81eee0c4c39f0cbbb007e6317df2c0f830d6a702da4ae7ba"
    },
    {
      "file": "balance/probe_nativeinhabitants.ts",
      "sha256": "751b7930fab8a488f5a4e43f4d3b57b451fffd1aff377d2b431c08e210886d06"
    },
    {
      "file": "balance/probe_nativeinputcastcycle.ts",
      "sha256": "0e2ad794582c000408c04be8ea8857da429a051fad658bdfd932cdce560b3a39"
    },
    {
      "file": "balance/probe_nativeinputmetaauthority.ts",
      "sha256": "76277b6a51c37c0508661b43f7b85a2142787b32ba4281dbb1c1d765a7619e7f"
    },
    {
      "file": "balance/probe_nativeinputmetacases.ts",
      "sha256": "b2203f6e731af1eacba1e85c550f1fe960a82da0085e8d75defffad8522a1115"
    },
    {
      "file": "balance/probe_nativeinputsources.ts",
      "sha256": "56ff1f5dd1b85934395cc5bf30b8b161b27deae223fff18cc60c51b16ea39b75"
    },
    {
      "file": "balance/probe_nativeinstalledsources.ts",
      "sha256": "ecfce430327fee822c48048a83e220776d111212c7ddc812bb4bddd47658c110"
    },
    {
      "file": "balance/probe_nativeinteractioncargo.ts",
      "sha256": "08ebff8e5a1b5308597a80603d32b22e95b27e619ca205a6fff167cd8625c43c"
    },
    {
      "file": "balance/probe_nativejourneycompositionsource.ts",
      "sha256": "f4f04b549e10e3e3a10ea0ebe4e5679ee2c3621328159b179d821099d43e52b1"
    },
    {
      "file": "balance/probe_nativekillaftermath.ts",
      "sha256": "81404872eacfce56927ec6fc1c310e56735292e59d5c94b4d5906c4dc7f1d864"
    },
    {
      "file": "balance/probe_nativekillaftermathadmission.ts",
      "sha256": "cc8a4ac284f731c022bc3070b3f33e87b22aeaa4e48792ba9119311e9c3b128b"
    },
    {
      "file": "balance/probe_nativelateencounterarrival.ts",
      "sha256": "8255027451c4235f77bfdc186dc5d6773ca9b23e2b775248bfec66236eb41150"
    },
    {
      "file": "balance/probe_nativelateencounterboundaries.ts",
      "sha256": "7e02aa86b842538383b63690055780df75c5d4de4e6210a5b1fdcd894c4404cf"
    },
    {
      "file": "balance/probe_nativelateencountercontinue.ts",
      "sha256": "5d51e776cfa70adc8c8a8a12071b0a47ad8956f3b4b5675580e1d0a41dd469fa"
    },
    {
      "file": "balance/probe_nativelateencountercourt.ts",
      "sha256": "8f0d5ca224791b7d335eda6dcc24c1477c537a00c5e63aeac77576052491a2eb"
    },
    {
      "file": "balance/probe_nativelateencounterhosted.ts",
      "sha256": "bcf182e0819edc77fca22a9bbd0239982b90d7635153e24c8214970c08435108"
    },
    {
      "file": "balance/probe_nativelateencounterlifetime.ts",
      "sha256": "ebd99aed0dffd8e1f1e662ec08b67c00db62a717b2b356ecb9a362b99c19deb8"
    },
    {
      "file": "balance/probe_nativelateencounterpartial.ts",
      "sha256": "e0195fddb31df1cd7bf887093572237b6fa743cf46f8d1d13f1086525f336772"
    },
    {
      "file": "balance/probe_nativelateencounterrenewal.ts",
      "sha256": "70dfcbadb8076dbe6fa8fbf7423b43bff6bd398568c8bcf51dae6f3b29fb9f8c"
    },
    {
      "file": "balance/probe_nativelateencountersource.ts",
      "sha256": "cc95c3f44d0f47229223b0bc41eb1928cf694f7f5b8680ce55550b51e01a0ccb"
    },
    {
      "file": "balance/probe_nativelayoutgeneration.ts",
      "sha256": "1c906571bbb8c5baae139699ca649bbe5e34a52fc598f8c79f69eb405cc1bcbf"
    },
    {
      "file": "balance/probe_nativelivesitesource.ts",
      "sha256": "e4a97f74d41d895830e59fb3b2c496853638a4f9e58fa184a3a8f817e675a386"
    },
    {
      "file": "balance/probe_nativelocalinput.ts",
      "sha256": "365d6cb710e101317fb937115e4145aaa4f302bad89d28fe9f7e4b7890367cf2"
    },
    {
      "file": "balance/probe_nativelocalinputfinalreview.ts",
      "sha256": "a25b388c3a5eee1b6ab27504ded76c6b3edf6da7a655fd8d4038e03b28dd7a50"
    },
    {
      "file": "balance/probe_nativelocalinputfinalsource.ts",
      "sha256": "4c31cd8b78efbfdba7f988e110e06a7c80ba426d9b776d075b5f9f7b7065388e"
    },
    {
      "file": "balance/probe_nativelocalinputpollreview.ts",
      "sha256": "beeacad7b3a9bd81bb0c975292c3a8c120338b06e4f9b8e20b522edf6cca309e"
    },
    {
      "file": "balance/probe_nativelocalinputsource.ts",
      "sha256": "5e4b961c42fa34b151d2808e25b4972e667514cadf8eb623aac7613f5b222071"
    },
    {
      "file": "balance/probe_nativemaincastidentity.ts",
      "sha256": "473aa46d7bd02f81226a6e6410cb03c951c64583b3d44d4d30b02e7c6b119cc9"
    },
    {
      "file": "balance/probe_nativemaincastretained.ts",
      "sha256": "718944f42f19ce0808153d84064e248e16226de5431ca743534995522e2b473f"
    },
    {
      "file": "balance/probe_nativemaincastsource.ts",
      "sha256": "afbfc637104c36125abbedf133956a7dc16afb44cfd274b41606cf0fdb7314a3"
    },
    {
      "file": "balance/probe_nativemaincontent.ts",
      "sha256": "77204e3c76b655044c0cff2c61cdc3d17ee6112042b1e2595fdfa179e78298bc"
    },
    {
      "file": "balance/probe_nativemainhostcompositionsource.ts",
      "sha256": "9c54a7f529a22f528cdd5357d833de316737247a5bf34c0a7e0a52e8c760ad05"
    },
    {
      "file": "balance/probe_nativemainminions.ts",
      "sha256": "9845e3c38f93887f9d11986dfb83108223eb1984637265cf9fb86e3f8dbc78b0"
    },
    {
      "file": "balance/probe_nativemainorbs.ts",
      "sha256": "77e317bb57a0093b30d11f62cff1b9351414da35c5fa0d88de10f918185d276b"
    },
    {
      "file": "balance/probe_nativemainproofsource.ts",
      "sha256": "f3851cb21825bac83ff7070a11ecb88c0cb7e3dbd27d04e47758f82823332f92"
    },
    {
      "file": "balance/probe_nativemainrostercancellationsource.ts",
      "sha256": "e5c69321886fe93f0ffc95c9c986d925c549a963eba22e48889e9ea044575034"
    },
    {
      "file": "balance/probe_nativemainspatialloot.ts",
      "sha256": "aaf90c327787ebe5f7d71d80f0baf05d91d40a2057a0d1589331bb5bc316b8cd"
    },
    {
      "file": "balance/probe_nativemainterrainvisuals.ts",
      "sha256": "dcc3fbcf5980252052838cfd736ce84a3ee1950c51108d3bb076cf66d4775b51"
    },
    {
      "file": "balance/probe_nativemainvisualparity.ts",
      "sha256": "13ba11525b035f22b16b988995d097e54d144977d05e8f57788af29be83943d2"
    },
    {
      "file": "balance/probe_nativemainvisualsource.ts",
      "sha256": "08a3e13174e836db9fda65e42bfa6777afa2d47295a8f2448de09457ae386a5d"
    },
    {
      "file": "balance/probe_nativemainwirevisuals.ts",
      "sha256": "1bb6adfe3c38b9e41656e1d78cc32eb92f511ecfed20a3ec7ed2f8b5ae03da51"
    },
    {
      "file": "balance/probe_nativemenufinalseat.ts",
      "sha256": "26dddf640862e910b46e654fd71a8565ef8ff890b343981c419d07b70042d373"
    },
    {
      "file": "balance/probe_nativemenupeertravel.ts",
      "sha256": "1697e5753f56f2cf2233fda8eea3d24f42ec3c13eb4ae98456a3464ab863d5f8"
    },
    {
      "file": "balance/probe_nativemercascentarrivals.ts",
      "sha256": "e3bfd28631162b9c954e089b3bb9743f8bc001586c777c2c764c8c2e5c6400ea"
    },
    {
      "file": "balance/probe_nativemercascentboundaries.ts",
      "sha256": "112707e889144907fbaf5a11953950acfa330e6b9f9d82b1e835d3c6774f6f15"
    },
    {
      "file": "balance/probe_nativemercascentcontinue.ts",
      "sha256": "82399993129bd2b46efff9d27927c9ab8e41f7cfa86525c515539067e9fca78e"
    },
    {
      "file": "balance/probe_nativemercascentlifetime.ts",
      "sha256": "72fb11367a0a280af9ac752b0dde897476a3edb6a7101368febfb3a01f4b487c"
    },
    {
      "file": "balance/probe_nativemercascentpartial.ts",
      "sha256": "c9a9d967a9ffa496092cac6d5ec6463f4782df3631167ca7d0ce4a09a68d242e"
    },
    {
      "file": "balance/probe_nativemercascentreturnedcallbacks.ts",
      "sha256": "f1596af1584d00b5cc070e13f94ad65710eaa25822c38571002fb07a8efaec1e"
    },
    {
      "file": "balance/probe_nativemercascentselection.ts",
      "sha256": "e129a32a45b3143cd9636bf8fdf5ee24d8cf039218875037b447edd60e823e2e"
    },
    {
      "file": "balance/probe_nativemonsterfactory.ts",
      "sha256": "d6eabc91d655e21f92042aa2cc687793acbdab74ea3335cc32ac93865ee06c05"
    },
    {
      "file": "balance/probe_nativemonsterpromotion.ts",
      "sha256": "7cb2612de735e69ac638e1eaf9430a95cf081a74780d829ca73f0e181e8d8301"
    },
    {
      "file": "balance/probe_nativenavigation.ts",
      "sha256": "e28476902ae1d0ccc5e75b80d2ee75a1e08195e555b65bd46ebbac48476218c7"
    },
    {
      "file": "balance/probe_nativenemesisdeparture.ts",
      "sha256": "11c5886b93612ab88fe41c1a8da7d2bb0bb0684e05714213daeb1092e602e1f5"
    },
    {
      "file": "balance/probe_nativenemesisdeparturesource.ts",
      "sha256": "a8d4045f83af60b4f88d8616b9d79c5e88a9d2de4435a4de6798143321e10d86"
    },
    {
      "file": "balance/probe_nativenemesishosted.ts",
      "sha256": "caa17e1f57ddb961d6c1e75928017b5072262473b8063d4e48092d5328da6ea9"
    },
    {
      "file": "balance/probe_nativenemesispolicy.ts",
      "sha256": "40db973c99f89b6cd355a9efc752f8fba9904c8d44ce9f0326bbf5aee537badf"
    },
    {
      "file": "balance/probe_nativenemesisselection.ts",
      "sha256": "a791a179fac64ea4f40bd1dfcf5a02565bdc9f4b452ef3d6968c7ab24ff85457"
    },
    {
      "file": "balance/probe_nativeodysseyboundaries.ts",
      "sha256": "8ac034bc37b3e77cf6bcff3d6c656005dccb4f3dc20034627cd0d4a6e0e3f68e"
    },
    {
      "file": "balance/probe_nativeodysseycanonicalbinding.ts",
      "sha256": "6127ec3057c2be4e81e0da18043484339df8eed772947b83c09438113babeac1"
    },
    {
      "file": "balance/probe_nativeodysseycold.ts",
      "sha256": "e2fd073ebf90dbca741cbf37ebba3e6d3dc99124a1b11dffbb6caf5854a172f0"
    },
    {
      "file": "balance/probe_nativeodysseygroundadmission.ts",
      "sha256": "420b2e12051e1dba6b311cd6ecfb4c71dbce2861f9fbb282e095c2509484a38d"
    },
    {
      "file": "balance/probe_nativeodysseygroundadmissionsource.ts",
      "sha256": "c9b15fa9ca15b93bcb8f350a53191dab1989be79b244115dc197e6c51f4810ec"
    },
    {
      "file": "balance/probe_nativeodysseygroundcold.ts",
      "sha256": "c240735a94ff30792ed827130a45f79c086f9d2fa4573179a0665a374517f69b"
    },
    {
      "file": "balance/probe_nativeodysseygroundcompleted.ts",
      "sha256": "75756afd511f77de1c04e07eaa2bea0c4c06d5f27f46070869aeaf4a91d3516f"
    },
    {
      "file": "balance/probe_nativeodysseygroundfailures.ts",
      "sha256": "ab0b2c163e273f9f3122432f891291d0db65ada7b6a92e0f3361439af55eb0cd"
    },
    {
      "file": "balance/probe_nativeodysseygroundlifetime.ts",
      "sha256": "4a6b99aa668e9b067226c820c52034b622912ad16f3ab040c4e4801764d7dd10"
    },
    {
      "file": "balance/probe_nativeodysseygroundrefresh.ts",
      "sha256": "8a9295d1df794a72d81875a0f9e2130cc9cd3f7aad7311a257e481c019f2ed24"
    },
    {
      "file": "balance/probe_nativeodysseygroundrevisit.ts",
      "sha256": "9193a5d220b75faea2f996042c642b751d8cb4ccb0dddf100c94e7becbdbf62a"
    },
    {
      "file": "balance/probe_nativeodysseygroundschema.ts",
      "sha256": "cab5b19d025066767f732ec39e5abb0af8665f8a9c5bc4589222922cb27bc37c"
    },
    {
      "file": "balance/probe_nativeodysseygroundsource.ts",
      "sha256": "5baed62132a7df67117817487bb3b8573bd323ba48e8bc2d1a5362f2e0e79cca"
    },
    {
      "file": "balance/probe_nativeodysseylifetime.ts",
      "sha256": "fba2d9183d139224850571475d29d2efd0a78bafa95d18dc0e355963eb154c78"
    },
    {
      "file": "balance/probe_nativeodysseypressure.ts",
      "sha256": "28864d0b54317f2311d7b2b5ac0f5c631d930966137b7f760cc1cee9b53a0aaf"
    },
    {
      "file": "balance/probe_nativeodysseypressuresource.ts",
      "sha256": "ee20be0e002407c4f426c3ea35fdfca8d35c9705769ab24881c644ce1433d196"
    },
    {
      "file": "balance/probe_nativeodysseyrisings.ts",
      "sha256": "718193598225773aaac365fed22b6190b3950b5987ad4c4e21c27c947a3cd0c3"
    },
    {
      "file": "balance/probe_nativeorderedcontinue.ts",
      "sha256": "60d768044c8f59eba614c62a0538f00f79a3342fb3390d5c4bfa01152da7dbd5"
    },
    {
      "file": "balance/probe_nativepartyadmission.ts",
      "sha256": "1915cf38fe36b5f7ec51966dc1154a6519bd259e6894347105b2cb86bfa54421"
    },
    {
      "file": "balance/probe_nativepartyboundaries.ts",
      "sha256": "0e495cbd0af05df620dcbb7687d1a951155432c03b3eced95fbbf27e1a863ee0"
    },
    {
      "file": "balance/probe_nativepartycallbacks.ts",
      "sha256": "32762eafbc2b625ddad493d380087e2e88fab890e1e453dfbec6a41b295d2dd2"
    },
    {
      "file": "balance/probe_nativepartydeath.ts",
      "sha256": "eaca27693673aeeb2aa8d2f50b2eecec49d35d9ea64a1d8a8d67cf971863fdd5"
    },
    {
      "file": "balance/probe_nativepartydeathboundary.ts",
      "sha256": "ae3a303f9a569ea9dcee3461de270a32652992cc46960595c5b34390a6ee6529"
    },
    {
      "file": "balance/probe_nativepartydeathpolicy.ts",
      "sha256": "0f4be9a188caa72ff1d3b70f63543f4ff0fef1f7a370762a4fa5fc8822d9f774"
    },
    {
      "file": "balance/probe_nativepartydeathsource.ts",
      "sha256": "9bd29ba2e664d89595cc288e6bb6e66115a1ef87492f38e871afede3fbaa48c8"
    },
    {
      "file": "balance/probe_nativepartydescent.ts",
      "sha256": "1c3c075ae5bef0e644d0eb9a8a6cf076db076abe2d0ef674b9318349b3a4d87a"
    },
    {
      "file": "balance/probe_nativepartyhiring.ts",
      "sha256": "627059788391a1a91ea8d8a91b0878b6d11afa885833bc0bf8dc8b925efd82fd"
    },
    {
      "file": "balance/probe_nativepartyparity.ts",
      "sha256": "7fcadef0d7a406d664c1e614244b6050a5a2767c41c4511c519a80077103aad7"
    },
    {
      "file": "balance/probe_nativepartysource.ts",
      "sha256": "6788c1b6c50629f4c7eea42bd3eee7368b4bd97d70c1ce9bfe3497f88cac76d3"
    },
    {
      "file": "balance/probe_nativepartywalletcontrol.ts",
      "sha256": "f4d66ad87fdbcb9b2b76e637b710e39703539d5829a033f82445c24d1e156dc3"
    },
    {
      "file": "balance/probe_nativeplacement.ts",
      "sha256": "fd802b85b29d7b7192147e13e77009528cbb9541d606624f7fd77e84b1cc6d61"
    },
    {
      "file": "balance/probe_nativepopulationresolution.ts",
      "sha256": "6c9393f3c2be69fa4784b55fac724970f83a1d702080ea4e20419d98aaa398e1"
    },
    {
      "file": "balance/probe_nativeprogressionstorage.ts",
      "sha256": "9ec724af348dde0722c2899805bd5256e512bd1fa116783800b1e7fde3b47683"
    },
    {
      "file": "balance/probe_nativeprojectilelaunch.ts",
      "sha256": "7d30154c3b1635eaa8cbbc46d60faf30c13d01d36ace7b706e83ea2e15bf08b7"
    },
    {
      "file": "balance/probe_nativequayarrivalboundaries.ts",
      "sha256": "522481cef606b596652ce50b1ce9c9f7135047a2df3cf113bf6f6fff9d959a61"
    },
    {
      "file": "balance/probe_nativequayarrivalreentry.ts",
      "sha256": "57ec5fe76105cc44204bf92c00198ec13215d1f73b92f3719437f9bf6c46b973"
    },
    {
      "file": "balance/probe_nativequayrevisit.ts",
      "sha256": "2adfb04d6926de91524c170abddde58dbed0ec5f07a7f7e9dd3190994f420370"
    },
    {
      "file": "balance/probe_nativequayserviceboundaries.ts",
      "sha256": "ed7faf911d8df04ff9a88a87ee276cdfda6653075c4ac692ca3582a352c28e90"
    },
    {
      "file": "balance/probe_nativequestinteraction.ts",
      "sha256": "1ef379efce81c987a1d81a4d60f0ac4add1115d82c9443f115b495f4429147a0"
    },
    {
      "file": "balance/probe_nativequestroadarrival.ts",
      "sha256": "d254403a1f77a2a0649014f601beb00ed1f21fa4d31b8026847a22c756adb598"
    },
    {
      "file": "balance/probe_nativereadyfusion.ts",
      "sha256": "30b994a56820bdf872f66e3a68ed45244e8ba1e34a9e98d27caa8b2623532faa"
    },
    {
      "file": "balance/probe_nativereadyroute.ts",
      "sha256": "b50df6a26594c64262a9a740fc3232543b6b046f67712d5f053c2a3b932ccb13"
    },
    {
      "file": "balance/probe_nativerealmboundaries.ts",
      "sha256": "0fb7fcbf54438d6b908fdaad58664330e0a4a969c6e33a1fce48dc7ac34a177c"
    },
    {
      "file": "balance/probe_nativerealmcontexts.ts",
      "sha256": "7b17134f3645453c8dd5722976733f2776cc69079c2f8570441afbc1cb10b583"
    },
    {
      "file": "balance/probe_nativerealmcontextsource.ts",
      "sha256": "1154fbb35bf21a6615b01408ffd82feca5442e89fa5d6b109b4188735e1798d5"
    },
    {
      "file": "balance/probe_nativerealmgateboundaries.ts",
      "sha256": "66fc7422facb972191cf7134d1f12bb024e48829f5ef9ba1088c65020486f342"
    },
    {
      "file": "balance/probe_nativerealmreentry.ts",
      "sha256": "4d73a9e5b312a8bb45046981682376671df3f2f6aa5480888b5783b4473f36d9"
    },
    {
      "file": "balance/probe_nativerepeatcrusade.ts",
      "sha256": "2d73705cddfd525e79f79bd85f645dc8e046adbf1e32ae832a657a0fbb9eb734"
    },
    {
      "file": "balance/probe_nativerepeatdemon.ts",
      "sha256": "1873cda9f180ec0104c318f116ffd4876e3dcb8c7ff76daca2993612849901cc"
    },
    {
      "file": "balance/probe_nativerepeateventsource.ts",
      "sha256": "0ca4e02f89fd2e3a418bb12c00c0f707bf70027c76c238ac729e4108ef3fd4ca"
    },
    {
      "file": "balance/probe_nativerescueanchor.ts",
      "sha256": "00c105fb2a72d486fb70fd31cad6ae63509dd6cdc5eca806766a6f5edb685330"
    },
    {
      "file": "balance/probe_nativerescueanchorsource.ts",
      "sha256": "1f7b28ce1fac45c57920e6a993b0216266fcdf27a38c52bdb334a1ad8d5938ca"
    },
    {
      "file": "balance/probe_nativeresidentsession.ts",
      "sha256": "d780991cba81bfb515c2fd5467ab65d4bf01aec9b19e126e5d5c52516e4e43d6"
    },
    {
      "file": "balance/probe_nativerestoration.ts",
      "sha256": "f9335d97345fd18f42fa4beec0bcbd468125d1434779f1d23fb53c00c0dd4a95"
    },
    {
      "file": "balance/probe_nativerewardstorage.ts",
      "sha256": "d1dacb581bb9b37ab61acb9d1bed74fd43fb63d4d05c2835dbe4244ac5b494d6"
    },
    {
      "file": "balance/probe_nativerunconclusion.ts",
      "sha256": "d9a4548fcd81b2074cf5c1b3afda12db56bf17fabfef5534e3b6c2b0fd0d8ba8"
    },
    {
      "file": "balance/probe_nativerunconclusioniteratorreview.ts",
      "sha256": "84fc2de613c1d88ddab7b470dfd6bc13d0dedf7b25d1306b8439f9cf7a119aef"
    },
    {
      "file": "balance/probe_nativerunconclusionpolicies.ts",
      "sha256": "9e990d3cfafa182d35ceb703bbe74a4ab66f866a22b11bf5aee8f64f6d0e7637"
    },
    {
      "file": "balance/probe_nativerunconclusionroster.ts",
      "sha256": "cda4c021fb521e69eca79b3a28e756a2d2e477be79f131baba6c18cbccf271bb"
    },
    {
      "file": "balance/probe_nativerunconclusionsource.ts",
      "sha256": "07d5cb99be18b8a2cb2971b28863a927eb781a50366e9595fd4dd2d626c46a8c"
    },
    {
      "file": "balance/probe_nativerunretirement.ts",
      "sha256": "4564e9eb501649c20598cfc138c5cd5db25c9648a313e8f473109f16cdff104e"
    },
    {
      "file": "balance/probe_nativeruntimebirthlifetime.ts",
      "sha256": "220fdeee579c4b8196f570c16f6dac83077c0702de4094504650344592314988"
    },
    {
      "file": "balance/probe_nativeruntimebirthtitanlifetime.ts",
      "sha256": "4916ce08ba16d771b2a3f2ccf4718f2195f40b4c26cb6c3fa51100df22da3819"
    },
    {
      "file": "balance/probe_nativesavewriteorder.ts",
      "sha256": "d63b67235f7a4e75c266e11fc3201aed34c2e59e6cf0ba2efc5123ccf007fc93"
    },
    {
      "file": "balance/probe_nativesavewriteordersource.ts",
      "sha256": "f7867740e7a3e70cfa8923a3367024ca7884e12cdcf7c20e8975c9a5834042d7"
    },
    {
      "file": "balance/probe_nativesceneadoption.ts",
      "sha256": "e82e2e0f0dfd946430f7b6983fcdfba7a63ca58466bff60c78405982c709b211"
    },
    {
      "file": "balance/probe_nativescenearrival.ts",
      "sha256": "290dd91104de3121948e8a3e801838b54b56ee722b52688bb3d270fd063c58e5"
    },
    {
      "file": "balance/probe_nativescenebirthcomposition.ts",
      "sha256": "fb38ee2e8f6e5e150acdf2aec6d4e6d6e810985d3b77ca29cac2f42b11b1c405"
    },
    {
      "file": "balance/probe_nativescenebounty.ts",
      "sha256": "0d8aec7f040490580223f80c6efbb8a409b13cab8c584e191fb42701d4d1c08f"
    },
    {
      "file": "balance/probe_nativescenecoast.ts",
      "sha256": "d993ae1067c9528652715dc7991fc4ca5d6d112577d4ae2f0a32b7f805416b13"
    },
    {
      "file": "balance/probe_nativescenedescent.ts",
      "sha256": "b753d529a158c3ba22cd64b27ae028d3ce92e4a1866e733d7cab411ca44e770c"
    },
    {
      "file": "balance/probe_nativesceneecology.ts",
      "sha256": "6ef9121f6432cff8ec9bedcf4d62d2d3e616a8c2e8dfc5d4fb7515c9d9a80d8d"
    },
    {
      "file": "balance/probe_nativesceneencounterbirth.ts",
      "sha256": "c730a43bbe33bb4caf4744eab88fba0ffe91039a9b89fb3ae28bea6340ee898d"
    },
    {
      "file": "balance/probe_nativesceneenvironment.ts",
      "sha256": "d05d7a699d5b65ad627f6c1fa71e76b2a6320bc1e84cd89a1c25a6f968b8af35"
    },
    {
      "file": "balance/probe_nativescenegeometry.ts",
      "sha256": "6caf5047dcca1aa2f512bfa18c3c21e637f089561b8248cb7caba33f130a4528"
    },
    {
      "file": "balance/probe_nativescenegraph.ts",
      "sha256": "b60a46d341164c6dc72f668d5fb5623606f89bda78e13dc6552fa4c84f06b3be"
    },
    {
      "file": "balance/probe_nativesceneharbor.ts",
      "sha256": "72085dcdd2cdefaa5d12682bbe7afbfb6c4932aca3de1de0dc8f77ac2ad5cff5"
    },
    {
      "file": "balance/probe_nativescenehistory.ts",
      "sha256": "14f0180b39cf404dd58b4f1ee7b10456e67310c83d44b28e1d928205be1a04bc"
    },
    {
      "file": "balance/probe_nativesceneloot.ts",
      "sha256": "2d209d7bb144e8d596fb2673c5f161a21e205f8580476daf5e0c46437fe92a16"
    },
    {
      "file": "balance/probe_nativesceneobjectivecompletion.ts",
      "sha256": "fdb8bab77ceb5f5901abb77823713c3f3a3fb6623ebaf963e391dad5686d484b"
    },
    {
      "file": "balance/probe_nativesceneobjectivewatching.ts",
      "sha256": "3093cca1d525f25becb7a53c370b96fae1898746b36c46cc212cf69e33f71efd"
    },
    {
      "file": "balance/probe_nativesceneoccurrences.ts",
      "sha256": "013c462a73f385317a25daa79885787f354861c2bcf7ccddc369f50edb36c0f7"
    },
    {
      "file": "balance/probe_nativesceneopenings.ts",
      "sha256": "852392438683e5af398d32569565c2fa9282b142a335c5dfdc93a4129b7d4ded"
    },
    {
      "file": "balance/probe_nativescenephysical.ts",
      "sha256": "fcfea5542070c2df0b8c9ca2eb4b6a9b85005013c4c1aeabc7391fc4441721bc"
    },
    {
      "file": "balance/probe_nativescenepopulation.ts",
      "sha256": "a4aef6a07db1b0f77aef4737686a62b27555dc4eb10a42beca3c64a9dacacc19"
    },
    {
      "file": "balance/probe_nativesceneprogression.ts",
      "sha256": "509aa346c25c57b523df9474bffc18f6017466727f24368d2cc3cf286d83ba95"
    },
    {
      "file": "balance/probe_nativescenepuzzles.ts",
      "sha256": "a81fb08163c95020e9b852604f1070f8c2255bc3904949682addcfbbb1572c6b"
    },
    {
      "file": "balance/probe_nativescenequests.ts",
      "sha256": "cf2ab893e1c04043db56c9b7da15a5ece32e46ace95328be835d8e685902c157"
    },
    {
      "file": "balance/probe_nativesceneruntimebirth.ts",
      "sha256": "b08a0a77e84fa92382c626cafc3381b9cab8358178365dc02571450594a353ae"
    },
    {
      "file": "balance/probe_nativesceneruntimeregistry.ts",
      "sha256": "4a3c5a4ba8ffef10ad1fbead44f79420b13da7f86239c45771c4be1cd560dbb5"
    },
    {
      "file": "balance/probe_nativescenesites.ts",
      "sha256": "ca4751a8a86c17947b27b8e3abc9373f0b95ff937c5b580db0854655c00d26b8"
    },
    {
      "file": "balance/probe_nativescenesky.ts",
      "sha256": "ee68f208c2c90d620b8c336f2c59e146e79b1adab2aef0c5b1bbddb23888a711"
    },
    {
      "file": "balance/probe_nativescenetheater.ts",
      "sha256": "176479575830e9809b1b90309e118fde10f92270b3f68ca994c218911de31f9f"
    },
    {
      "file": "balance/probe_nativescenetitans.ts",
      "sha256": "94255df3bc2dc45a81cf4ad92803a66f61f39410830c192d420b1726b43309f0"
    },
    {
      "file": "balance/probe_nativesettlementservices.ts",
      "sha256": "8100a3c3befa13bca152717b9880cedce9cadddaef4536d1e3b5bf613168e7c0"
    },
    {
      "file": "balance/probe_nativeshardentrylifetimesource.ts",
      "sha256": "f85f480b11d99cc146a0aa25d56f45fde876c9bcb7d52a6f8606064bbe79a0cf"
    },
    {
      "file": "balance/probe_nativeshardfoundationsource.ts",
      "sha256": "26776bb97e7fbf952adfc10e88d6afadf54b02c00e1796a14181bee4eb021c03"
    },
    {
      "file": "balance/probe_nativeshardframes.ts",
      "sha256": "4ceabc2b16006cabfeb58635377b662daa53c2659c8cda83cb1459b5234185b6"
    },
    {
      "file": "balance/probe_nativeshardhost.ts",
      "sha256": "925eff3a521d512119b9a0461d5c9ef67ce5385cd66a6356a3358a4246562f23"
    },
    {
      "file": "balance/probe_nativeshardhostbreaker.ts",
      "sha256": "2cfbd73aeda55e595c301e9894d6f78ab9191eef31c7a79f1196487f66681af9"
    },
    {
      "file": "balance/probe_nativeshardhostedboundaries.ts",
      "sha256": "8a86ca1e5bba8adbc287326b03167d8bfe686836e2d27cdaef092c9328d8a0e9"
    },
    {
      "file": "balance/probe_nativeshardhostkeeper.ts",
      "sha256": "524b898630fa14564f421552001062d4dfe9c15aa933413a5de96b25e1c9386f"
    },
    {
      "file": "balance/probe_nativeshardhostlifecycle.ts",
      "sha256": "2aea6ba8a4b7ce0699429b59baf083c28777de0983089f1141ebf3cc184cb1bf"
    },
    {
      "file": "balance/probe_nativeshardhostlisten.ts",
      "sha256": "5483eb305d39fac04b7886231d3fb9d67f27ea9137fc6ab6bbb4baa4eb48a32d"
    },
    {
      "file": "balance/probe_nativeshardhostsave.ts",
      "sha256": "1ba7d9e563cb5c53436abb48c8112288816da9d146564aecc4e9a38c900ef10e"
    },
    {
      "file": "balance/probe_nativeshardkeeper.ts",
      "sha256": "ae45e9260e0f423aac228f2bc2c5e02d274e91f2e535df2a04a9ea7cae471beb"
    },
    {
      "file": "balance/probe_nativeshardkeeperboundaries.ts",
      "sha256": "b8c3d2547c3c0af11084f906eb2cb8b2daf006484e5ec97270e2995a9110275a"
    },
    {
      "file": "balance/probe_nativeshardkeepercold.ts",
      "sha256": "e3dc5804fc4b3abba7afc6ab426dffb7497a1835147981676635d78b45b90f9e"
    },
    {
      "file": "balance/probe_nativeshardkeepercompositionsource.ts",
      "sha256": "e8eb9f32a0c1f80597f5cb13dc4a4601623048747f74f820c287226e391c429c"
    },
    {
      "file": "balance/probe_nativeshardkeeperselection.ts",
      "sha256": "9480abd823a039786a8b6b6767d5fdd2fad17f1b26918d553994222fa5b4801b"
    },
    {
      "file": "balance/probe_nativeshardkeepersource.ts",
      "sha256": "4492cc1266939ef9519b3e6f7b6ea825696dbfcf0892cbb7f0ffa14453176e12"
    },
    {
      "file": "balance/probe_nativeshardmuster.ts",
      "sha256": "4c161002c778e01f4f993359e17593a5bc9b9343fd50939a8c4f633c94014793"
    },
    {
      "file": "balance/probe_nativeshardmusterboundaries.ts",
      "sha256": "eded413b28098ea40680a433287f4c9e6f57f16bcd2fa649cd992f820ff2473f"
    },
    {
      "file": "balance/probe_nativeshardmusterlaws.ts",
      "sha256": "61346c2227382742fc9a9250f90651a284bf0ff4f9b50e8a708871e76cd9f4cf"
    },
    {
      "file": "balance/probe_nativeshardmusterlegacy.ts",
      "sha256": "9efea7b2055bcad34beae1524f393aef3c6a3879e349f444ae49f71d08a50b31"
    },
    {
      "file": "balance/probe_nativeshardmusterrealm.ts",
      "sha256": "cfd8134ffe30f080fa7211c75888b8a6fa817eb24f575839bfb1d32af6a5792d"
    },
    {
      "file": "balance/probe_nativeshardmustersource.ts",
      "sha256": "32ac6ee49bdf9d3d7cf2dde5a12a57c2ea86e27915a14a65d3024002b733a5a1"
    },
    {
      "file": "balance/probe_nativeshardnearscale.ts",
      "sha256": "486b0c73b00ee9a3416c0ce1749f034f6dda7dd3f14f1c99efb455237756d35a"
    },
    {
      "file": "balance/probe_nativeshardnearscaleselection.ts",
      "sha256": "01aaa3491a3c0589612a06126942d724ff85d76dfc7192cf4d765f82885ceec1"
    },
    {
      "file": "balance/probe_nativeshardnearscaleselectionsource.ts",
      "sha256": "352b443df5b220c5674eb165d6021d5db33b5ab7e83a229d785d97c86cb0200f"
    },
    {
      "file": "balance/probe_nativeshardnearscalesource.ts",
      "sha256": "f3f32203ba41f9462e24f956655a0047e720dc46d55956655d76c9067251174e"
    },
    {
      "file": "balance/probe_nativeshardpresentation.ts",
      "sha256": "4bf3e7abbbb67fd093382aaadae6605bba023b6abaae27fec08081a7f8717894"
    },
    {
      "file": "balance/probe_nativeshardpublication.ts",
      "sha256": "5821f88c3b2a7d10a0f76a77123693be67ef821adbe92e1eb8a945d5ed13bba9"
    },
    {
      "file": "balance/probe_nativeshardpublicationsource.ts",
      "sha256": "e094034a5484eda04a038fbea45b587b4a1a233a51ea1b16655013f234027246"
    },
    {
      "file": "balance/probe_nativeshardsave.ts",
      "sha256": "6c15ad1f9eac9c0c356510fcd6c1798be0b3d641d2a1f2cde01b21e060c34228"
    },
    {
      "file": "balance/probe_nativeshardscompositionsource.ts",
      "sha256": "c61ca7366c6abae530d517203d8047a7ec37c708ae55a86eb7f2ebe115fc9a0b"
    },
    {
      "file": "balance/probe_nativeshardseatboundaries.ts",
      "sha256": "ae720bc6f85604ed39f307d7def74c2dc9ce6fab6a0e864bcf81cdab965bc425"
    },
    {
      "file": "balance/probe_nativeshardseatcompositionsource.ts",
      "sha256": "f05d48a2ab38e1ffbf95193c67fa2c65a740f1808f1c479e3011a2f1268d7287"
    },
    {
      "file": "balance/probe_nativeshardseatprimitives.ts",
      "sha256": "9b3a0468ce77b82043a33f9c621b61fa8a613cbe17d0cb2833e11233ea90b767"
    },
    {
      "file": "balance/probe_nativeshardseats.ts",
      "sha256": "46f6a6ba784d3b549c0b60b3af32a4a9ac9ac5291d1d7106545c240eb59ab81c"
    },
    {
      "file": "balance/probe_nativeshardseatssource.ts",
      "sha256": "6239ecd453ce04cb5b7984dfad06ee093c996df583560e2fb84a393681a1079c"
    },
    {
      "file": "balance/probe_nativeshardslegacysource.ts",
      "sha256": "55d458c1182395f4a911688fa28f81943c03dec1dabda8d0c38b9b9eaa563bd1"
    },
    {
      "file": "balance/probe_nativeshardvesselcallbacks.ts",
      "sha256": "644bb7f2f04cf3dff8a768f1a9f41f2a4dfbbe575ca5f911827b3d45ea3c5a0d"
    },
    {
      "file": "balance/probe_nativeshardvesselcancellation.ts",
      "sha256": "de053a05c47a6149d866a3ef104979dfa1dbf9d4f6bfba33e2f1aa4c03b95617"
    },
    {
      "file": "balance/probe_nativeshardvesselcollections.ts",
      "sha256": "7ce965cac6d241bee4900803416b1c540d1a070d6f48f7f25e56cd5b1c36fb21"
    },
    {
      "file": "balance/probe_nativeshardvesseldeath.ts",
      "sha256": "a8e47b6495e10df01a4c10b6335e50ecef0ad7d916add68ea41bec2390e6218a"
    },
    {
      "file": "balance/probe_nativeshardvesselidentity.ts",
      "sha256": "e3296129376dcd8dabc499f0979a1f28bb1e47a48125bc484d0666ef7f84da7f"
    },
    {
      "file": "balance/probe_nativeshardvesseloracle.ts",
      "sha256": "c8ec6195f54e2df83b3286f913a77173787ecf7a574ea9fd4e0aef475fd9911f"
    },
    {
      "file": "balance/probe_nativeshardvesselthrong.ts",
      "sha256": "d589dee619294be9ae1c33ba319bcb875a3514a4c2153cea39e52292a22a1721"
    },
    {
      "file": "balance/probe_nativesidezonefurnish.ts",
      "sha256": "d5355c72b63d9fd2816638e6f2814011ec761f80a0bf7a4cfe47a82cbfee4105"
    },
    {
      "file": "balance/probe_nativesidezonefurnishactive.ts",
      "sha256": "49c0089cdd4ffb5313b3cd1ace0e4643aea85d8744d11b92adff8d335f3ebb86"
    },
    {
      "file": "balance/probe_nativesidezonefurnishcontinue.ts",
      "sha256": "580739a4802cfb71c64a3deda776eee175375c31787089ef45f4e3b46d77b00e"
    },
    {
      "file": "balance/probe_nativesidezonefurnishsource.ts",
      "sha256": "e678b0c709b9dbf22a0913506770a4cf8712af6a729f21d1c3fcae9b85c55ce8"
    },
    {
      "file": "balance/probe_nativesidezonefurnishstate.ts",
      "sha256": "4b35bfd4deb268562be4827618059c140e7d6f7c373e2a66640567eb5dd1aa0d"
    },
    {
      "file": "balance/probe_nativesight.ts",
      "sha256": "3d969b1df685b3bfe50f61066c47306e646e6be2b8dc68914ec937309f10b714"
    },
    {
      "file": "balance/probe_nativestatusrelay.ts",
      "sha256": "6cb75a98793c2177eb5155b751a423535d3bf5c459a5f411e662a0c86f7fde8c"
    },
    {
      "file": "balance/probe_nativestructureaccess.ts",
      "sha256": "57ec2e589de2cbcb86fe73cb918070176f4f9ceff628cba16fc84b8caf3452d9"
    },
    {
      "file": "balance/probe_nativesummonpreparation.ts",
      "sha256": "cd2cbb6667cc54c04b9620fbe5df13d2741db23cca574ff16059c03f41be8448"
    },
    {
      "file": "balance/probe_nativesummonpreparationasync.ts",
      "sha256": "26a9c6cec0d567564c2fe8f19fc156c95de8cfa7799925c54f29f4e6ef74ab51"
    },
    {
      "file": "balance/probe_nativesummonpreparationboundary.ts",
      "sha256": "50afdba7dc2bf5d155c7fc89347ab89ab4b6b8fa897833afb5ebbf2b97d6e0cc"
    },
    {
      "file": "balance/probe_nativesurfacearrivalorder.ts",
      "sha256": "11ce8e8adc001d9a717941b575b62a2dce960a96f8d4a0ac23773aebcbc478c6"
    },
    {
      "file": "balance/probe_nativesurfacearrivalordersource.ts",
      "sha256": "2dc23568bc65ce4100b22246cc6c24773fe8748ae0a1c9f4d6bd0d2dd991ea6f"
    },
    {
      "file": "balance/probe_nativesurfacearrivalsource.ts",
      "sha256": "7c61ebdeb303563c965df8dce7498ba9cdd83bcff9ec9a698170e2bcf666e31a"
    },
    {
      "file": "balance/probe_nativesurfacecompletedtext.ts",
      "sha256": "2345df71d3f73981db17bb06028becdc1933ab847fba40bfc763f9b5e0b34dba"
    },
    {
      "file": "balance/probe_nativetetherconstruction.ts",
      "sha256": "79a14db7a064cf66631beec3243d756b4790ad4755aac6b2a2d3837717bc8370"
    },
    {
      "file": "balance/probe_nativetitanattendance.ts",
      "sha256": "6ce294515b87c6f165b67bb63d9022af011cf959baa42b522cd971dee3d5f0e8"
    },
    {
      "file": "balance/probe_nativetitanattendancesource.ts",
      "sha256": "d9fc29c504d2ec0220524f13c2849b114eab5058decd892bf4ff2ea592154504"
    },
    {
      "file": "balance/probe_nativetitanreceiptsource.ts",
      "sha256": "f15111d67a11ad07b322cc07835be8682a121e8d420727f86d20c744b96f9b24"
    },
    {
      "file": "balance/probe_nativetownclientcomposition.ts",
      "sha256": "6692b45dd2828305a26d3fa13cfb2a56a8922c4c0d3277af14f7645487e6e53a"
    },
    {
      "file": "balance/probe_nativetownclientcompositionsource.ts",
      "sha256": "0de23650d50776ebf7d2865e7b947a7a6a3b23512f20009cffef4e88c2b5663f"
    },
    {
      "file": "balance/probe_nativetownconclusioncomposition.ts",
      "sha256": "dbe9bf285e9f8a0c20a2c1120abaeef775b2f86b32524fc68dab6dcd956e7ef6"
    },
    {
      "file": "balance/probe_nativetownconclusioncompositionsource.ts",
      "sha256": "d1382e69dba6a2be4f22b84c25350bd6318a9d53ce990f9228106e6867e10941"
    },
    {
      "file": "balance/probe_nativetownfreshfoldreview.ts",
      "sha256": "01b0b9f3443e828214ea347820cc6c5e5526d58b38d5d6e3fcf24f02a6b7a740"
    },
    {
      "file": "balance/probe_nativetownfreshfoldsource.ts",
      "sha256": "c33605de6b7049c94d035c7bf42144b8da8c8ddf247e6e92cf2d8751599e74d9"
    },
    {
      "file": "balance/probe_nativetownfreshfoldtiming.ts",
      "sha256": "d4766d942cc876f3613d39c017d2ce0cfeb9a0758ba8a6608c1e82444e2b52b3"
    },
    {
      "file": "balance/probe_nativetownlocalinput.ts",
      "sha256": "eb3418311cf9202dbd5ec24bf734ad9e037d9a8b25b4300392f98c0929c68e75"
    },
    {
      "file": "balance/probe_nativetownlocalinputsource.ts",
      "sha256": "7f98b306774678091685965be26b6b3e574bad770d17833cf4b71a90804469e2"
    },
    {
      "file": "balance/probe_nativetownstationboundaries.ts",
      "sha256": "a40d921b3c5dec9361ec7ce5683b12bcff613e51b0d84d3223ed057fc3509ed4"
    },
    {
      "file": "balance/probe_nativetownstations.ts",
      "sha256": "fb3de80a3a75b22bd8d32089dd1f80afc22789271b52f61358f7a722400d2565"
    },
    {
      "file": "balance/probe_nativetownstationsource.ts",
      "sha256": "b2027eefe74329b8b1a35d384331b267ae8b6b9f8f7e2d661b96ba3398e2c59a"
    },
    {
      "file": "balance/probe_nativetownunlock.ts",
      "sha256": "a16ed4bc3d58c43bd2d6a5ba9365d030f2e2f8b77f8c476d08f65a9bd32329ba"
    },
    {
      "file": "balance/probe_nativeuifinalseat.ts",
      "sha256": "ebd3c720fcb7ec9dcce428dfecb5e8d4c43702fcf5c0159c13a654e13bb3074f"
    },
    {
      "file": "balance/probe_nativeuipeertravel.ts",
      "sha256": "ca852bec67630a706b1d28757907070328858f7204836589ef229fdce34d4b44"
    },
    {
      "file": "balance/probe_nativevendettaboundaries.ts",
      "sha256": "2d31984f1ea60e8d6b1250ce941214f5dab8784718c3a57efc7b4068b7ffac69"
    },
    {
      "file": "balance/probe_nativevendettacallbacks.ts",
      "sha256": "d8e392ea76b730b413e885b399a3a3ad9e2aadf0ff243767c04e002ec037fb20"
    },
    {
      "file": "balance/probe_nativevendettacohortpruning.ts",
      "sha256": "5dd38d4ace053400c8f5ea8b5328f1c588e60ff5b35cc845cf37bda557c7f10a"
    },
    {
      "file": "balance/probe_nativevendettacold.ts",
      "sha256": "4738361b4dfb9d2ccc7b3c861050b870edd08231763a59523c32914e38a5ec66"
    },
    {
      "file": "balance/probe_nativevendettacompositionsource.ts",
      "sha256": "515487bb889617a0c758472368fcc78785ccb7220aa77d7e0ee1a9cc31efb4ac"
    },
    {
      "file": "balance/probe_nativevendettareturn.ts",
      "sha256": "1b699fa0b16e1544f50a22f335482c6fa2eb3d30a8338e737a6eba0123fb5677"
    },
    {
      "file": "balance/probe_nativevendettaspawnerboundaries.ts",
      "sha256": "9e13c3b6eaed2673ce4b099b62af654e32368b37d6df6f567301031fda372f23"
    },
    {
      "file": "balance/probe_nativeviewfinalactors.ts",
      "sha256": "9e287ecd6fd1f0681d7ee4b5f299e07a59a9416e934af0777b63662a92a6f0f5"
    },
    {
      "file": "balance/probe_nativeviewfinalseat.ts",
      "sha256": "8bd78c0c38763d430eca322b692298e0f9cb7d4cfa01f1e1406a7eb6dd6e5d8d"
    },
    {
      "file": "balance/probe_nativeviewseatidentity.ts",
      "sha256": "1634dc1b414ee2f132a67c1fbda2fa01bc195a2251dffa2c08d59ce1b2c082de"
    },
    {
      "file": "balance/probe_nativevoyagecastoff.ts",
      "sha256": "2ce2d07d52f1385871df777720c1acf839f08c96d51c22b6dc4f06571de6e0a1"
    },
    {
      "file": "balance/probe_nativevoyagedestination.ts",
      "sha256": "3cd5144f86b681a70f319cf738aed763ebdc5cec154ce7bc9013e30d4cdd62e5"
    },
    {
      "file": "balance/probe_nativevoyagejourney.ts",
      "sha256": "333730bea4d566436c083f71172a754e11f621ab7ad3e6132fae4a6b9431b02d"
    },
    {
      "file": "balance/probe_nativevoyagelifetime.ts",
      "sha256": "33ac9d03d6cece1fb8f778f1685762c5bee7338f6ed240a5952dba8aafb3441a"
    },
    {
      "file": "balance/probe_nativevoyageoracle.ts",
      "sha256": "6a2b583d8fc0b18346db5e4fc2baf133dd02110657b56a511e5132bd65085fa4"
    },
    {
      "file": "balance/probe_nativevoyagesource.ts",
      "sha256": "fd9969b40ead663c07f0dab2d45f09d5ee12b8f3fd60e79a8a4fb64308a6a824"
    },
    {
      "file": "balance/probe_nativevoyagewake.ts",
      "sha256": "f2955a44c568ba1a9e4609ee19ecc54fe43ddd3c71eb566b5c9a00da99d344d4"
    },
    {
      "file": "balance/probe_nativewarlordarrival.ts",
      "sha256": "50cff81b6021c1bd3e4faa5dd8e9cb39c8d751910230f15a90808e5b2c4da560"
    },
    {
      "file": "balance/probe_nativewarlordarrivalsource.ts",
      "sha256": "8f4016e26f096403c377b7a0dc4d1c17e38dbaa329873da6b2c82116008be476"
    },
    {
      "file": "balance/probe_nativewarlordboundaries.ts",
      "sha256": "a1f5dad84bbad558ca7934f067b2cc912b4d15c3c6c677330fb6192492d4d94b"
    },
    {
      "file": "balance/probe_nativewarlordcold.ts",
      "sha256": "b624cd490011ef22cc818a7e098842bbd84679dc62d22222cc63a173acc378c9"
    },
    {
      "file": "balance/probe_nativewarlordinitial.ts",
      "sha256": "4ff487fead9d433ea6529db184d8d9aebc673554c47858df9bb49f9c86deb80c"
    },
    {
      "file": "balance/probe_nativewarlordlifecycle.ts",
      "sha256": "daf1606e4ebb6f0617af5f8e11972bae03389bf46062ed921ea2cfaa8fa07d9a"
    },
    {
      "file": "balance/probe_nativezonemint.ts",
      "sha256": "3e29f2fb42e92cb4c6a54e9bad3824eb9f8dab5d1c45144a897f60c0dc57e37f"
    },
    {
      "file": "balance/probe_necromancercourts.ts",
      "sha256": "a45488f82c03d0a267589f46e5ee6a3d6e55726852c4ad7654988b7674cad575"
    },
    {
      "file": "balance/probe_necromancerrites.ts",
      "sha256": "b14c628c4a461ffd22116218a1f5b09b707b1c616f5da2a27ee7889c74dcbd99"
    },
    {
      "file": "balance/probe_necromancersacraments.ts",
      "sha256": "c910bb36eaf532c0ca61e6809cba2a664d70814f902ed887ff1a9f1de8cd56f7"
    },
    {
      "file": "balance/probe_necromancertrees.ts",
      "sha256": "4d4f50beaa3883f7029da8d8a1612e3e576929f6f4882e6fa3ba8276ac4a5bc6"
    },
    {
      "file": "balance/probe_nerverecovery.ts",
      "sha256": "fbb89f59a66350bc956e13d3fe2afef06ea599641ae25f5324dcbcb2e6113e60"
    },
    {
      "file": "balance/probe_nestednecromancer.ts",
      "sha256": "f457b8b8680a1b3cd65e48ddd41b6c07dce96d05445e3e3f01594c67d3bc6307"
    },
    {
      "file": "balance/probe_newsmove.ts",
      "sha256": "2591fcd055bb365b886018d75427dba1f80d01f4e80b17a2542d54e4d8e3d636"
    },
    {
      "file": "balance/probe_objectives.ts",
      "sha256": "8e50ee601826571223070705888630becc499ebe8f53f10e5e4ffda0084e5a77"
    },
    {
      "file": "balance/probe_occurrences.ts",
      "sha256": "0f05467238d5ec52c307e9231a4f457ebdfa74510bdd0d23b32aa9010a4f62c1"
    },
    {
      "file": "balance/probe_odyssey.ts",
      "sha256": "2cd1127e1235287417232697532540d9400602815fb0e1a77815acb57086dacc"
    },
    {
      "file": "balance/probe_odysseynights.ts",
      "sha256": "958ad667ca93f920fddc89e7db6a4d9f02c1ca2a4687e74ef720053e1506a976"
    },
    {
      "file": "balance/probe_oraclerefinement.ts",
      "sha256": "760e96d958e0999075a617164e6442fa61ad14de3a7256cee521775158932f7e"
    },
    {
      "file": "balance/probe_oraclerescue.ts",
      "sha256": "e347897dd23973592dd439f50aff3a7e03267fd694c27fb83f7daf42d85dabb6"
    },
    {
      "file": "balance/probe_orbgeneration.ts",
      "sha256": "882cc86ccdc1371aeea6954e586deaac005993ea40ef5b77751fd2cf9f9ffaf3"
    },
    {
      "file": "balance/probe_overdrive.ts",
      "sha256": "3bc9163af1ac3024687d62a0f6d1393f6ea446f3d63b990c5ee430ad4c0dc10a"
    },
    {
      "file": "balance/probe_pack.ts",
      "sha256": "54bbb90b96c1c2ebbd863aca84fb446c6e7c3c4a8a13e55361c9024c1aefee2d"
    },
    {
      "file": "balance/probe_packtempo.ts",
      "sha256": "fccbc63502e754a000b554751d598883e049c077bc17e83b15dd3ebd7410f9f2"
    },
    {
      "file": "balance/probe_pactsteelstartertrees.ts",
      "sha256": "54ad7b54c1f11a666e0935c921f4bdb41dfb78664f976ad96c768e8bd2d0aede"
    },
    {
      "file": "balance/probe_painterparams.ts",
      "sha256": "e1d0a2f2c7571de7909eae315ab7d9767c9c5372716d6940f14db46aa8b0ca3c"
    },
    {
      "file": "balance/probe_parry.ts",
      "sha256": "3994dde675171ce0ef3289f88b95642908151026382fe1d1a9a7eb3bb8c2a367"
    },
    {
      "file": "balance/probe_partylanding.ts",
      "sha256": "8c255b79c9bbd369c710d54ad1c026790cc32fa38cc2eb495f33affe49b0c783"
    },
    {
      "file": "balance/probe_passiveattributes.ts",
      "sha256": "e829aeb297ee520e21a99f50c48c07548186a2eabb72e9f2e65c7745853a5ea8"
    },
    {
      "file": "balance/probe_passivecrossroads.ts",
      "sha256": "8712da6bd60e68f650f4a5e89da1339b690f150ce5744ab5a6ef722921a49c72"
    },
    {
      "file": "balance/probe_passiveinvestment.ts",
      "sha256": "05016deff2339730f7e6b8433548b0cf5554dd5a340118c06972d38c8337ad6a"
    },
    {
      "file": "balance/probe_passiverefund.ts",
      "sha256": "0f701509def210b38fd67fe66163aafb35b0f08206149d03126c977c9e9797ab"
    },
    {
      "file": "balance/probe_passiveroutes.ts",
      "sha256": "120af7bc43c5c8e1f1abc5181e61bd6af4aa72588add820bdf9061e8e420a85b"
    },
    {
      "file": "balance/probe_passivespecializations.ts",
      "sha256": "bde898f6886cf071201bfcd916642ea06f8e5f9f558af07c0c3d8acb6d01892c"
    },
    {
      "file": "balance/probe_passiveweave.ts",
      "sha256": "94ca8a2905b4942c346d43b0914ac5a84479fe54bebd0cbcec0b7c2194b3a2dc"
    },
    {
      "file": "balance/probe_pathpref.ts",
      "sha256": "511440892af0a027b76f857bc5fc196651500bb112ea0a766650da8bd31fceca"
    },
    {
      "file": "balance/probe_payloadcues.ts",
      "sha256": "c29b8a97f2d0fd3dd868f12ee87758ed8c66b4854a6bc2205bc160a0c7c3c6b7"
    },
    {
      "file": "balance/probe_persistence.ts",
      "sha256": "b6ba74431b0794cd322fe98bc87f01db93f1980ac15ed30bbe51c88cd50d5c9e"
    },
    {
      "file": "balance/probe_pilgrimage.ts",
      "sha256": "2791c81d9a4bac868d779a36cbe6b261758fbe583b4ef14e9a709e3aa0f5e647"
    },
    {
      "file": "balance/probe_pitfall.ts",
      "sha256": "086f4dce369f4c25c3cf29bc3192a55a4e2688d32db2daa9c7cb66b9a9df0d9c"
    },
    {
      "file": "balance/probe_placedeterminism.ts",
      "sha256": "0d75171c362f35f39b7974130898ed832a60f4d8b785f179fa34c9f918a0ea08"
    },
    {
      "file": "balance/probe_playercastvisuals.ts",
      "sha256": "235492844bcb466cef80ab6d3532afd4182ee917a3b937e54dc8fb574169bc1d"
    },
    {
      "file": "balance/probe_playerdeath.ts",
      "sha256": "d8a05dc60cb78e17ee19c38b2ab769befe16e185d741fec8a0071f8b298ef231"
    },
    {
      "file": "balance/probe_plies.ts",
      "sha256": "bfb558cd86daa61bb6fd83f7f584721f21f24a63828d3bdf7d69f16b26cde266"
    },
    {
      "file": "balance/probe_portal_contract.ts",
      "sha256": "ea86222d51f97a801e0657fb660f11f6ba1c5f1b15844be61f7047a29279651f"
    },
    {
      "file": "balance/probe_possession.ts",
      "sha256": "83f06c1631d143b87349b4f2ceb3638feae1c5979346b7f1975388aaacf89e74"
    },
    {
      "file": "balance/probe_pours.ts",
      "sha256": "139122bfd4e856001ec2fe183afb217a6910f1895fc984bb4a9175cca206ae78"
    },
    {
      "file": "balance/probe_pourshape.ts",
      "sha256": "4c55e99464e9fbcde850026886097a7a63f08fbf2628a9a538ae354690a8ae3c"
    },
    {
      "file": "balance/probe_precisionstartertrees.ts",
      "sha256": "7a74ce7c8b83ce00dfc1eb3509b4c3e38d1d498c37d0fc05cc7eff4d24e80ee6"
    },
    {
      "file": "balance/probe_presencevisuals.ts",
      "sha256": "97d5e8de7e052a4fea6e81cea3c95e784175f2969b75c399ac5cdeb8574a3dd6"
    },
    {
      "file": "balance/probe_presentationdefaults.ts",
      "sha256": "ac08ffdb542acc87cc426cf2cad9c71ffa4e8a753720ccafd0b7c87e254f184c"
    },
    {
      "file": "balance/probe_proccues.ts",
      "sha256": "6dc4e62efff688e24fde2f511ccee3e3d88e9d0f345a550a3b00ccfe3d3516df"
    },
    {
      "file": "balance/probe_procreference.ts",
      "sha256": "21a8c25f6e1c5dc855500e485dcb918371027fdf8b94f2d4703245c263814ea4"
    },
    {
      "file": "balance/probe_projectilecull.ts",
      "sha256": "0b21f0498c393367cd4b6bdf0bcccf943a05ad5f529f346ee3cdc91fe59acb91"
    },
    {
      "file": "balance/probe_puzzlecalm.ts",
      "sha256": "b848761f71b07f5c96027449415ea1c5242c05cb0ac9ca4a33b0d2624723bd47"
    },
    {
      "file": "balance/probe_puzzles.ts",
      "sha256": "58341684610e5dc97dca5868504b5dd540db1ad031e7f752c890d08be2edaca6"
    },
    {
      "file": "balance/probe_questmap.ts",
      "sha256": "c2a6e89394d254ec07f78808f4004b61f46b0ad2ece927cba16c1c4ca5b2a9ca"
    },
    {
      "file": "balance/probe_quickening.ts",
      "sha256": "9e70020a7ec007afb0b85a476f7e7c61f4358f09185191e96c4309a8e512fef3"
    },
    {
      "file": "balance/probe_radiance.ts",
      "sha256": "852583a2220411a9eedbdfa96665eb7e34e84c4958474ef50c8e9dd4764312ed"
    },
    {
      "file": "balance/probe_rampage.ts",
      "sha256": "b563d814a317c9adfa55369244d36b44fc6392b5a1e51330ed1793f45bf8d0b7"
    },
    {
      "file": "balance/probe_reactiveuniques.ts",
      "sha256": "49f99a1321e1eca28d7dd2ab17c7eaf6cb8998657111604973f836f895a36605"
    },
    {
      "file": "balance/probe_readers.ts",
      "sha256": "50617d03fc567d06a03d8386de5a122d5714e561d09f140c9b81bbbd0607a070"
    },
    {
      "file": "balance/probe_reckoning.ts",
      "sha256": "fc713e84effac055fa3e54aed1a99cfe06c4234dc40c6277a3ec8601e085be5e"
    },
    {
      "file": "balance/probe_relicdeath.ts",
      "sha256": "01a693c7b9c9ea7d47f0956f3be21a9583f177fae9108785b0892bfe8c440951"
    },
    {
      "file": "balance/probe_relicflow.ts",
      "sha256": "f8b80a13fab3df3b52374978bf6940b0fe75e1058f8dca2998bb92f13a5697a9"
    },
    {
      "file": "balance/probe_relicuniques.ts",
      "sha256": "c952e270abb9c98f023bc383ca8b0bd73108b6cf876600ff5b3ff885203f4806"
    },
    {
      "file": "balance/probe_relief.ts",
      "sha256": "22c65ef7ae57af429b145aa85da7ba7f80c037b3d991b979f79ab9bceb2eb1bc"
    },
    {
      "file": "balance/probe_reliquary.ts",
      "sha256": "2ea56cb0b30e4678cbdd5faca3dc498c9a8a35c3801cb1549bdf09d2bc439439"
    },
    {
      "file": "balance/probe_reservecues.ts",
      "sha256": "302c6fae6e45830b8d5d32150d9cd43180a2039b061326c2f273ac36ec8ce7cc"
    },
    {
      "file": "balance/probe_resonatorstartertrees.ts",
      "sha256": "409a385b79370b46bb918a3324a717c49d5578bd4a86f3cdc9597869dec660b0"
    },
    {
      "file": "balance/probe_resourcevisuals.ts",
      "sha256": "fa3e9edb81833b56e9a3a8f9956bf2885728051ba980fd9b3c11556b1827322c"
    },
    {
      "file": "balance/probe_resurrection.ts",
      "sha256": "f5b01f53e9ff0b37b4493bec3ce8c96b96617447518406ff916e9be122f69605"
    },
    {
      "file": "balance/probe_revivering.ts",
      "sha256": "38ec5166fcf60b1a006a02128d9e5cc20bf75045b139873d4c6dfaefc1b1d52a"
    },
    {
      "file": "balance/probe_rewardlabels.ts",
      "sha256": "0044b11a26de2858961f3ee62936322f22fe2fc0ec5ae32a855952cb75e39af6"
    },
    {
      "file": "balance/probe_rootwild.ts",
      "sha256": "e2168beb53abdb2ffea89506b9665e1fa57ab525510d43042e8305a784a09364"
    },
    {
      "file": "balance/probe_runeweaverstartertrees.ts",
      "sha256": "2e8181f205fc4affce13090583931f75799ef1176abfe9963e380f954164c150"
    },
    {
      "file": "balance/probe_salvagemode.ts",
      "sha256": "3d1948c6307db49dabbe42cf4265b50da0bcab1467fe75591272f45c1d2da8b0"
    },
    {
      "file": "balance/probe_sandregent.ts",
      "sha256": "efe0c625a9ff1cb5152a3ed43355d8b5d9aa56a039b35de4f0414e9b5b28074a"
    },
    {
      "file": "balance/probe_satellites.ts",
      "sha256": "0c8cc80d4222f3b78c0547ef82cd69fa79bf195544bbd284f6798e5e8e5a715a"
    },
    {
      "file": "balance/probe_savecompatibility.ts",
      "sha256": "f582325b25dc75e899dfadb5f6f3e3bd5d597eba62177bcac7415229007009ea"
    },
    {
      "file": "balance/probe_scald.ts",
      "sha256": "65a36e4d27249d6b3ba71d5c63230856e8b40ba6e320d0a832931e365f874e9a"
    },
    {
      "file": "balance/probe_scaldkit.ts",
      "sha256": "0196a07c6c489944c8e92bdbcd4d31159c36664018bc314679c3438abe5b42cc"
    },
    {
      "file": "balance/probe_scenes.ts",
      "sha256": "148bee7b5c6a9b8e2c8df9362903d8b46d09c74acd08f5232d03c801961774c8"
    },
    {
      "file": "balance/probe_scorch.ts",
      "sha256": "328af17771661d17fc967a6a2f7964ebbc55221cefd2ece1d3505741f251e3b5"
    },
    {
      "file": "balance/probe_seas.ts",
      "sha256": "1fdbb0c57192fd7bff60ed2c271ab8f16dea3f14f9ba6fd00027045b85a4f55c"
    },
    {
      "file": "balance/probe_segments.ts",
      "sha256": "21e2d9d67b44249b793eb8faedc95d932350b5ede11799bd80f43842a05fa01a"
    },
    {
      "file": "balance/probe_selectedfracture218.ts",
      "sha256": "fea0e55f67b0938c6f1d8d534839c309c403e7ec10e63cc2403b5ff77767f19c"
    },
    {
      "file": "balance/probe_selfvisuals.ts",
      "sha256": "583c43c9aa28adbfc4fb1aa002b26f6b8880cda692b9e070d54e88fdccdec7c8"
    },
    {
      "file": "balance/probe_settled.ts",
      "sha256": "c89a8fd6b467263f8539923a342e705a75adfc4caa8cb97d687b7887927cf91a"
    },
    {
      "file": "balance/probe_settlementdefenses.ts",
      "sha256": "c108a2ca32831a8e1a4d1f893f36a5d50e38f76204e5f33724cb8cde12794917"
    },
    {
      "file": "balance/probe_shadowarrival.ts",
      "sha256": "348d07c647ac9e494bf237148bf3f1328e1989fb6641cc0f591e7bab7c6e73ff"
    },
    {
      "file": "balance/probe_shard.ts",
      "sha256": "bbb0fb78551acc7444f40fbce29d3cfef573a08839f9c81ea3fab8d8838531e0"
    },
    {
      "file": "balance/probe_shardcharacter.ts",
      "sha256": "20eee3274f2a2b0da8d417722e07f574360909a4ded85083ba6a9afa973639e0"
    },
    {
      "file": "balance/probe_shardcounters.ts",
      "sha256": "70060d5456a3886a98fad00a29cc72c594fbf5ddb1b35346b8974919f140f948"
    },
    {
      "file": "balance/probe_shardcovenant.ts",
      "sha256": "1148f98c1cfbd9f7c3420bb7fb6701366ae028a1e201a8dde960c1b3fe490458"
    },
    {
      "file": "balance/probe_shardcrossing.ts",
      "sha256": "d753b587e28858b7997e2396935a7dd6830751d85a58bf90c5e0a216e99c173b"
    },
    {
      "file": "balance/probe_sharddiet.ts",
      "sha256": "d63fc24934aafa26bd74637998b1e23cfa6858e182a881ca5b4b5d9db48203c4"
    },
    {
      "file": "balance/probe_sharddoor.ts",
      "sha256": "cf5d0e0dbc1f77bb20d2cfac13639a97405611cbc5ed0ef25789ef5c27fd1027"
    },
    {
      "file": "balance/probe_sharddormant.ts",
      "sha256": "b0371cf5528eb784444bd9a7aed6fab58cd522642ff69f8994c7fcba3c013ce5"
    },
    {
      "file": "balance/probe_shardforesight.ts",
      "sha256": "467eb7aa97e615b460c024a98751774b2b44da5b4e26398b7918c3a1c74aee12"
    },
    {
      "file": "balance/probe_shardidentity.ts",
      "sha256": "09a5dce1a217c5d6dc76cfee3894adc7b09aff786f7162e61e3f5ec7e58dab06"
    },
    {
      "file": "balance/probe_shardimmortal.ts",
      "sha256": "1465a51c7df06999c6c9f263ca3287b6a0e5b6d0d17a02f266ddc03af913d7dd"
    },
    {
      "file": "balance/probe_shardinput.ts",
      "sha256": "c7ef17faf39e3bdd758e056bc2adfafde2210bafaa7ae15bd107ebc6e8acf921"
    },
    {
      "file": "balance/probe_shardparty.ts",
      "sha256": "81f17fa757740989ad9d0b6467512ba74b515d8aed6503125d433a44b3c53728"
    },
    {
      "file": "balance/probe_shardpartyreads.ts",
      "sha256": "768cf501ab94b97f041153a98531c8e7f29e38ece671d244144314ad2a8051a7"
    },
    {
      "file": "balance/probe_shardseat.ts",
      "sha256": "c5f65cde415d6364c71a5473637c437c433bee387e54ca37d6778f91bd73c448"
    },
    {
      "file": "balance/probe_shardshell.ts",
      "sha256": "603dfc138b38a88ada5565ba4a1bf1a136df01e276388538e84eb3afa9f6d373"
    },
    {
      "file": "balance/probe_shardslow.ts",
      "sha256": "13c1ba1c334156d0677b524e4af639860c1165a42eb43278144f37b82ea70aca"
    },
    {
      "file": "balance/probe_shardspoils.ts",
      "sha256": "aa95614df74599352cf68f789863a9eeb6645d8b707194887cb87d0e34b09b6e"
    },
    {
      "file": "balance/probe_shardunits.ts",
      "sha256": "8a8364b7b493fe9dc9d47cb6c3a273d4ad77a9cff01d6619fa6d08977bdfea3d"
    },
    {
      "file": "balance/probe_shardwire.ts",
      "sha256": "a9c2e414419a4eb010d26d057d785b241bcca3f609b102fdbc1b83739f0cf0ce"
    },
    {
      "file": "balance/probe_shardworkers.ts",
      "sha256": "e8d4691024fdf28926f8d712962ba4d27a8fc56f887d6aea7d320cb700f6a99c"
    },
    {
      "file": "balance/probe_sheet.ts",
      "sha256": "9bd525f21dcd01071b3a3cfe20c1280b65d956d6507f2f98971739312680e294"
    },
    {
      "file": "balance/probe_shieldup.ts",
      "sha256": "68379be89ebe61f2efcd2c6537aef44226ba10e1b6b129b3adb38779c0fe5aae"
    },
    {
      "file": "balance/probe_shimmy.ts",
      "sha256": "2c1661dbd30f5f8f5da6069c0828a4af0e080cc99321cf794972cd4c43431ec1"
    },
    {
      "file": "balance/probe_sightveil.ts",
      "sha256": "27fad254c33f8a3fdac7b66660547732c0673884acaf68db03db9ae74b5c6d30"
    },
    {
      "file": "balance/probe_skillempowerment.ts",
      "sha256": "ec0aa79e1b4f3e7d78e32667c073b19f9ebbedef872c7629133bad1264269f1f"
    },
    {
      "file": "balance/probe_skillflights.ts",
      "sha256": "a5ca2c26feb9d00d3d80163b26d33b85d967a46a2ec89c1e417547760faf6b07"
    },
    {
      "file": "balance/probe_skillicons.ts",
      "sha256": "4e8251242d03e00b4371c1fc71de119b26568014ab2d6a8f9e14c7ca559566f3"
    },
    {
      "file": "balance/probe_skillinputorder.ts",
      "sha256": "7041091035e3d25c9d3a96cf701665e59526360724718cd91477816b402138ee"
    },
    {
      "file": "balance/probe_skillitems.ts",
      "sha256": "5b0517e7c54c38e676c39509d43a130dd41d8749bbe362638b4a9ff34b0e27a4"
    },
    {
      "file": "balance/probe_skillmodes.ts",
      "sha256": "b73f78a2fdbb51ffcfe3af54a34201778c53968dc13704440f0a47ff581112e7"
    },
    {
      "file": "balance/probe_skillpreparation.ts",
      "sha256": "8d1f8db77cf105c45cad1956c0d3995dfa12192af7603c740c81028bb0f3fa4a"
    },
    {
      "file": "balance/probe_skillpreview.ts",
      "sha256": "bc9ab00b4571ab87092915a8079f470e15d0d60d471bc6d08753c567a7cca347"
    },
    {
      "file": "balance/probe_skillshowcase.ts",
      "sha256": "b44685cc9ca8fe917eb568d71a421f9fc61b3218d3b8086f9313b7da3d8f1979"
    },
    {
      "file": "balance/probe_skillvisuals.ts",
      "sha256": "10d72a13c153e4d44132d1fe05bbb0f20cbde6b54f314705de1d11bb0af7add4"
    },
    {
      "file": "balance/probe_slotgraft.ts",
      "sha256": "ace46a748d4a31b9be7a2b0a1ed02b294011692dc00e9d7bc20d2e6750894968"
    },
    {
      "file": "balance/probe_soulriver.ts",
      "sha256": "855aafbb93eb879f07236e1377d3ecdb7cbd0d56263a50013097d40291a13018"
    },
    {
      "file": "balance/probe_speech.ts",
      "sha256": "3a1796b771f37728ac90322cdc474dedc05adde737a2c0fdc44b9c09151f148e"
    },
    {
      "file": "balance/probe_speechapproach.ts",
      "sha256": "0a62a72d5632e578810a553136cf0af5068d383480bc8cf2334109ae4e502861"
    },
    {
      "file": "balance/probe_speechgrammar.ts",
      "sha256": "abb0bc256288bbd73debacac9eee7deee2f0a8ac55d262ebd34df36e80f8e828"
    },
    {
      "file": "balance/probe_spent.ts",
      "sha256": "fd0fcb6dea2c7430db748100f667d517566ea55cab121d508c29e802d071d191"
    },
    {
      "file": "balance/probe_spiritrun.ts",
      "sha256": "90523861adf04891d3e85a42fb9991cf6a998daf410143e2fc8104e845e1c279"
    },
    {
      "file": "balance/probe_spoils.ts",
      "sha256": "29e092df976bfde042a4e738a42b69fcb9f4b944fc1653ad86fb10ea2c775f4b"
    },
    {
      "file": "balance/probe_squish.ts",
      "sha256": "c3b0c903913345d4123ccc4487bcd0b7d5edb0b9303236f80ed9fc0b76ae8d28"
    },
    {
      "file": "balance/probe_stalkercommitment.ts",
      "sha256": "692012de7303c36efb3f15975ffb9c2efbaaaf5049f90708ae44d2c8fb840294"
    },
    {
      "file": "balance/probe_startertrees.ts",
      "sha256": "afcf83c1fe612912aa95c04945a0ccbb688c041ced09d1977af6541f79ccfd8b"
    },
    {
      "file": "balance/probe_stash.ts",
      "sha256": "30661fc3ee1ba09c199678932c08f98729d05fbdd4101d1bfcdc11f6c160c5ba"
    },
    {
      "file": "balance/probe_statusicons.ts",
      "sha256": "862f5dcc59382319924cddffb1ac4926bfc3830207dc323abcb4541422aaf390"
    },
    {
      "file": "balance/probe_statusreadout.ts",
      "sha256": "02473dc359b9c8bbd28c2ff91f3f009e25b56fc6b5fe85a1baa9ffefc0aa7e92"
    },
    {
      "file": "balance/probe_statusvoice.ts",
      "sha256": "09b498d63ff56e7b56144872ba5559725f78e213b4edcb8aaec16d47d61ddb10"
    },
    {
      "file": "balance/probe_stealth.ts",
      "sha256": "e77efc9efc393785d65627930f07937a1ffef83da0454b96c9269159eb87ff82"
    },
    {
      "file": "balance/probe_storedsupports.ts",
      "sha256": "ce0ad667046bc17eb9be2670b4bb167261ecb6ebbc37b1811ea166dd8d7d9c64"
    },
    {
      "file": "balance/probe_storey.ts",
      "sha256": "c7612f9cde11ddbbdd44f5e73f365d1acd9ff503aca05c02804c30aaa28e6d36"
    },
    {
      "file": "balance/probe_strata.ts",
      "sha256": "6dad1e22137e780f5da8ae69f72014a7056b94edf2210d3d61fc5527bbc15c44"
    },
    {
      "file": "balance/probe_straying.ts",
      "sha256": "d71dc853aacdbf7cde16827f3b2080efd12ce9e84e7236f007e9ceee660683c8"
    },
    {
      "file": "balance/probe_strikevisuals.ts",
      "sha256": "8c961802c3e6e90e58053423e4087233446cba1ad61c10074bc9b21e90f3d643"
    },
    {
      "file": "balance/probe_summonfill.ts",
      "sha256": "2f437d88b0b3508de9a6c20f2a0948e1cb924e1b9231a0a919be6ca76e0bb4b5"
    },
    {
      "file": "balance/probe_supportbase.ts",
      "sha256": "0ddcc3b052bdbacbc64cbc8d78fb705fc535357c3a0514534bcf502f2d0e0767"
    },
    {
      "file": "balance/probe_supportfabric.ts",
      "sha256": "9e6006ac37e662401a2520793715d3f1388ebd612a1d674eb2a77e57fa3cf68d"
    },
    {
      "file": "balance/probe_supportmatrix.ts",
      "sha256": "ec875573fbb3b182389ab4f78bbc9e20e4794098e798c4a2d16ce94b392ae651"
    },
    {
      "file": "balance/probe_surge.ts",
      "sha256": "644e017dcac717a0f9d1fd1048571cb729c33cb5ee4168e61fd6c8612cbcb796"
    },
    {
      "file": "balance/probe_swarm.ts",
      "sha256": "02d0b4954dc4e403d0fefee0f65728cb31fb0208ffe78210110c8c21a45c48d3"
    },
    {
      "file": "balance/probe_sympathy.ts",
      "sha256": "6aac98e713a02e0965f3bef152e582b97b9903c76d7c04720a62802e9b14c58a"
    },
    {
      "file": "balance/probe_tacticalai.ts",
      "sha256": "6f74672fcb2abcab4fc371eee9f0d4b5844a1e0729203aa133c7eba317621b34"
    },
    {
      "file": "balance/probe_tacticprogression.ts",
      "sha256": "2e5ae4898a46f15f4ad27872484968856974516719dc15b18be3b7e70f2d6e2d"
    },
    {
      "file": "balance/probe_talents.ts",
      "sha256": "dc143552607de736339c61f27e4c8a160f6f4ade6d57c0c76f4284835be5dd43"
    },
    {
      "file": "balance/probe_tamebeast.ts",
      "sha256": "3c326e3e0461dd5d32137fd2099913ae311f701806b93c7dd646ca45b8bf2059"
    },
    {
      "file": "balance/probe_targetstrike.ts",
      "sha256": "03cefd07bcc558d7364a43869565c58e396d3b5779f9c391c37bf18d7b88f701"
    },
    {
      "file": "balance/probe_targetvisuals.ts",
      "sha256": "168b71ca450fa5185b38d0fa7191a7544bfd2975dd7c9c623bdce15044deabe8"
    },
    {
      "file": "balance/probe_tells.ts",
      "sha256": "7640b1e77cad7dbf8c90605caa4faa275300720fae406783844d8b465263dc17"
    },
    {
      "file": "balance/probe_tetherecology.ts",
      "sha256": "6d174cbe1d158d9e74d220f159013ca276098142c5a3938e70450ee48a998f7c"
    },
    {
      "file": "balance/probe_theater.ts",
      "sha256": "55098f38190e04f9cbc0f62354e232ec7c7e40b0d1b43a0e303b1bcea9a40a75"
    },
    {
      "file": "balance/probe_throng.ts",
      "sha256": "933b12127bb47a38dd265c5fc8e3f408d1ad3de728defcb31dd6b30dd5331a0f"
    },
    {
      "file": "balance/probe_throngcombat.ts",
      "sha256": "0ae8603273982146e5265e32fb4d3bbaf9e455a9fc251105a213439581f464f1"
    },
    {
      "file": "balance/probe_tiers.ts",
      "sha256": "d049895135edd19715b374c472e708979d3219f5222b748666c3588b51cd8e94"
    },
    {
      "file": "balance/probe_tilesetchoice.ts",
      "sha256": "c3953403fb235c99a8e2c8ab3a2098e9dea2169d52fac8f4e78e0e3106082b54"
    },
    {
      "file": "balance/probe_timeflow.ts",
      "sha256": "2b520a02f69c8dfc2d98226259797adb17f8fe508674dede12e27db57781c922"
    },
    {
      "file": "balance/probe_titans.ts",
      "sha256": "96fd13d88360a0135c97a5319395157cddd70213946b05de99335cac32fb6a9e"
    },
    {
      "file": "balance/probe_tollspill.ts",
      "sha256": "5da12f3e0eba1d1a63e4b442357949e1c381eda5de8a7505795f8b962f18f771"
    },
    {
      "file": "balance/probe_townexits.ts",
      "sha256": "f0a113131e3215102dbb20cb0cf1a64d2bf74004fc27ba9cc1e3d82de32855a7"
    },
    {
      "file": "balance/probe_towngrowth.ts",
      "sha256": "4e3da1e8ba44952e371dcef58046c2b6687af1a6a27834856896af2dec729ba8"
    },
    {
      "file": "balance/probe_townportal.ts",
      "sha256": "651a4d810c8a5a3a30201f224ba7af0f1f50fbcc3254f5f0771bc7b73f6fafca"
    },
    {
      "file": "balance/probe_townwelcome.ts",
      "sha256": "5d25303f9eac4ba9a4dd19948c2a7d10f61cef570488d39e2e9876c5744eab39"
    },
    {
      "file": "balance/probe_trace.ts",
      "sha256": "6371ec393047a6b5d5f6e1dcb521b2254cf5cd25fd0b1818abff701d404aa450"
    },
    {
      "file": "balance/probe_tracks.ts",
      "sha256": "fe1e18a8e327c969e0d8d973728b40f871c24cbbe55cf2455b27eed4b4250244"
    },
    {
      "file": "balance/probe_transience.ts",
      "sha256": "446a1c0d2c4f0e7d01894a8e1128c9114cf4401c9c9169979da00db47fb9821b"
    },
    {
      "file": "balance/probe_trapworks.ts",
      "sha256": "920568ee198c41f41de97ee49ed81527b38c9d0e9adc58370e315111a2bbc59f"
    },
    {
      "file": "balance/probe_typingguard.ts",
      "sha256": "ef5a3fe4301752d92e6038cfb741bd3a509e433c09cf64f820f8a409a862e811"
    },
    {
      "file": "balance/probe_ugspan.ts",
      "sha256": "4926f99bcdf1e14d53871e3b50eabb3511f35f7cbdb0e8199e6c417dcc185bee"
    },
    {
      "file": "balance/probe_uiactiondismissreview.ts",
      "sha256": "4f9b370ea82455824840f839254a574033219766817725fbeae2e1b126801797"
    },
    {
      "file": "balance/probe_uiactionreceiverreview.ts",
      "sha256": "7b0348eaa17a4b8169a0b1d241232c18df1913b63193a7a83f983f2c58313313"
    },
    {
      "file": "balance/probe_uiactionremotedismissreview.ts",
      "sha256": "c987e6c74123d47ef6a19fa2a2b92ed001e4e35ce008a04d698c087df472f19a"
    },
    {
      "file": "balance/probe_ultimates.ts",
      "sha256": "3c424f5692d69e361a3578cf26d56872e743a26f68477727b28852ed90370d1e"
    },
    {
      "file": "balance/probe_uniqueaccords.ts",
      "sha256": "81ea9d06fbb6d1330d2fb93cd2a44227bd2107983fe7a35bd48a82ee1896e31b"
    },
    {
      "file": "balance/probe_unlocks.ts",
      "sha256": "7db45ce272948b1009855ad54a00f92ee2065270be9b90155c8f62c102d70436"
    },
    {
      "file": "balance/probe_vendorinvestment.ts",
      "sha256": "9399129120cc11a5e79366cd0ed33472e086d96b3def0c6b23aadb7ca5b29d29"
    },
    {
      "file": "balance/probe_vendorlocker.ts",
      "sha256": "7d3f792661dc98905347f7937fb1956fa0d6d5cba2e590b86ba32a27ee405b8e"
    },
    {
      "file": "balance/probe_visibility_stability.ts",
      "sha256": "a73637188513d113b4a17f793414a4e201b17d0668844935120f95b37c44d9c9"
    },
    {
      "file": "balance/probe_visualcues.ts",
      "sha256": "be6cb0b317b406cc493d573014ed904f95883a2ad93105dfa2d15b1688d7a75f"
    },
    {
      "file": "balance/probe_voidframe.ts",
      "sha256": "cb04c9586e63a1f5fbec34c668b2089be64bf9beeae14aa036373c6c305057d1"
    },
    {
      "file": "balance/probe_wakeflame.ts",
      "sha256": "0ed7c7fb7d0c797c044aac398c2263a003693b5d5614d7a11b58c36dc851f526"
    },
    {
      "file": "balance/probe_wallpress.ts",
      "sha256": "b2b8ddd5613d3ebe5d5153c678577f3f65f4d79902d18937acea66185b40559d"
    },
    {
      "file": "balance/probe_wardenbalance.ts",
      "sha256": "64d96a782d61e3647c52b0e0092102bbe23156b8a67418d9e021147174d17ae1"
    },
    {
      "file": "balance/probe_warfront.ts",
      "sha256": "02ada89354777088be13855edfdb2e1de6db4a7034d1020258071c0e92aae067"
    },
    {
      "file": "balance/probe_warningcues.ts",
      "sha256": "0c2717c0b1d8ab6713420ff7b3ea1d74cee835ba5876c089179f6543f4d7359a"
    },
    {
      "file": "balance/probe_watchers.ts",
      "sha256": "742aee3ba78d4cb3ae2b471056e136272b068c4c4b98dc85abdecc42e8070eaa"
    },
    {
      "file": "balance/probe_watersurface.ts",
      "sha256": "17ca5a4c6b818db787e2bc67574ee5cc31de990e15e7d6f01e6ff77fb8672a72"
    },
    {
      "file": "balance/probe_webperf.ts",
      "sha256": "1ecf2d4dfc4ff8a8d8d68c9140dbdb176de6ad530b86ca6d1f49d2af2fbf6271"
    },
    {
      "file": "balance/probe_webqa.ts",
      "sha256": "b0a130338542544ad9ea768d8294e3350fef601b0c6fee10c703c9b0666c1636"
    },
    {
      "file": "balance/probe_websiteportraits.ts",
      "sha256": "431e02dcad358d77a68eeb959361d105df9e395b17a5808d542ae92025308a14"
    },
    {
      "file": "balance/probe_wisplight.ts",
      "sha256": "a8e0034bfbea83b1f4e644401118fc2b80289c23fedce983e61aaf9733aba265"
    },
    {
      "file": "balance/probe_workshop.ts",
      "sha256": "db9a4179df8403fa7033b89c5bff4d5a5fb620e60db46182dca2a8ee61fe00e3"
    },
    {
      "file": "balance/probe_worldbossloot.ts",
      "sha256": "b1d6917c17863cd588cc1e5b2f462dc9e828d8a78e7a0343e2208519369eba7e"
    },
    {
      "file": "balance/probe_worldbossspectacle.ts",
      "sha256": "d9cf2bd8c4f606cbd3e6908c0bb3c46395ae0983481bd88a3a77b2216c760b3b"
    },
    {
      "file": "balance/probe_worldmass.ts",
      "sha256": "4ede392b61f38b8ac8a01e6ffba61af16945e9a6fa77292e87b260797cc9fe53"
    },
    {
      "file": "balance/probe_worldmass_accord.ts",
      "sha256": "9cf810d76772ddf4df5276d8616dc10b78db04192a09fab8260b4d9d8dd9c50f"
    },
    {
      "file": "balance/probe_worldmass_activityresidency.ts",
      "sha256": "cd6df4088c34b01ce4095315a3c427d6100362649cdad0735c2d3bd5d7786c46"
    },
    {
      "file": "balance/probe_worldmass_beaconcontinuity.ts",
      "sha256": "c8e274cbd9f02039289201532076770bcc0924ca44ba4afca13b38d860a0cec1"
    },
    {
      "file": "balance/probe_worldmass_beacons.ts",
      "sha256": "f7d3b330b607dc0f68438ed80f7bdd15d25b7ea57a89ecd8b6dc201c70a64dc5"
    },
    {
      "file": "balance/probe_worldmass_birth.ts",
      "sha256": "9691f522fe6a987c21d774456d9a742d549a4c16342b317c20b880786f0ebbe8"
    },
    {
      "file": "balance/probe_worldmass_bounties.ts",
      "sha256": "ba49ef8c7dbd353e969dad01914c94283f964e69ae1b51c70b5e32a5b019fc12"
    },
    {
      "file": "balance/probe_worldmass_bountycharacters.ts",
      "sha256": "37c0c968b07676bf17163fc4b789d190a98feda5b3d9e3e938cc74001d0dbc15"
    },
    {
      "file": "balance/probe_worldmass_brittleparity.ts",
      "sha256": "3a540679c6a125e8a771b4a3f2022b4abb9d7912782c8a1653613aa91379a640"
    },
    {
      "file": "balance/probe_worldmass_cacheopening.ts",
      "sha256": "690bceab5e4bd5468b10c678a76501e448057b680be730aa8eb88439e47644bf"
    },
    {
      "file": "balance/probe_worldmass_caravan.ts",
      "sha256": "f3f8d097c6db79c93ee3caece52065e5ba3d31d586c11ec4803a3f071fe44293"
    },
    {
      "file": "balance/probe_worldmass_cavestratum.ts",
      "sha256": "5c7b0d93c6949dbe9f06b4413770c9820599b21db26816641676d8631795037b"
    },
    {
      "file": "balance/probe_worldmass_checkpoint.ts",
      "sha256": "8909ca44245ad7cf0b6124d1d1676fbfdcd1927f9d68eb5385032d1123e3b621"
    },
    {
      "file": "balance/probe_worldmass_clearance.ts",
      "sha256": "01afedb9e41885d1a0c466f922ab4aa4684bc93bf6ad8f5360f47459d2e98b9c"
    },
    {
      "file": "balance/probe_worldmass_climate.ts",
      "sha256": "0d90ed3c89baf2a117388fa878f4d8356909afd201b72c811878c7b7274cd9ef"
    },
    {
      "file": "balance/probe_worldmass_cohorts.ts",
      "sha256": "e000e99c33467ee63f630cd0740aba5f5bac90cf0aa99bf3e031e03dd54d6b1b"
    },
    {
      "file": "balance/probe_worldmass_courtcontinuity.ts",
      "sha256": "4a76590488247cfc6c4cc97fc0aac23d01c63803079f99d205bd8016136184aa"
    },
    {
      "file": "balance/probe_worldmass_courtpuzzles.ts",
      "sha256": "f07ec21cf03affdf0760128e44841e7be7013fb08248b590af047ad315747ce7"
    },
    {
      "file": "balance/probe_worldmass_dirtyterrain.ts",
      "sha256": "6c388070e76085c6282cba54c57b01f5b11104f151149813b09315fa7971fd70"
    },
    {
      "file": "balance/probe_worldmass_doorplans.ts",
      "sha256": "d293cba31e81f7929f01a2a5e5c8f93dfb1019c515ca9ee5acfc5fc09e373379"
    },
    {
      "file": "balance/probe_worldmass_dormancy.ts",
      "sha256": "e382146c1adaca1b5a2d26a40d4e6c470ba4180d72f49138752deb2e48fd022f"
    },
    {
      "file": "balance/probe_worldmass_dormancypinattribution.ts",
      "sha256": "cab52bb9bac9732019b24cec7bfb09da6c12dfbc55b5bf686d78bc1d9f6510df"
    },
    {
      "file": "balance/probe_worldmass_embers.ts",
      "sha256": "59d304ece124c39e91cb64e9bde1aac9a3355098876066ebd21825612e7c0d99"
    },
    {
      "file": "balance/probe_worldmass_engine.ts",
      "sha256": "0e2f7ebc52bdc897c7eba286fb8e8bc1b1c352831efb68c98362276e52e77132"
    },
    {
      "file": "balance/probe_worldmass_exploration.ts",
      "sha256": "9e3b3fe89c196729879a08dc54792cc46f76652f046e3bee2f777cc60d5b98ec"
    },
    {
      "file": "balance/probe_worldmass_extensions.ts",
      "sha256": "e4cd11abf87a1e5b8bfd018a5759b93e0c2ad3b14bc3a3884063113cbba45119"
    },
    {
      "file": "balance/probe_worldmass_fieldresidency.ts",
      "sha256": "43f50cf9ddaf7a449678dcd61b440b62727df37887d6fdbb7dd5acd0cc6a25e3"
    },
    {
      "file": "balance/probe_worldmass_fields.ts",
      "sha256": "cf73e7cf4c42c8d827f3a5f789b232dcf271b5c983557a1382a0f036e7ce7b67"
    },
    {
      "file": "balance/probe_worldmass_floorwork.ts",
      "sha256": "993ae1330c553d0c27e7b35c57ffa2d57c88e9e348aa01a5862d4d4d3dd3e4dc"
    },
    {
      "file": "balance/probe_worldmass_foci.ts",
      "sha256": "36b42ca5d18e0607643a3488a8f7a5cab6213563890151a17080c62bfee64cab"
    },
    {
      "file": "balance/probe_worldmass_foragers.ts",
      "sha256": "a617d19b9e0f42e39021a364c123c5e2c98d0d636a401f63c8aea3e356bb55b9"
    },
    {
      "file": "balance/probe_worldmass_formations.ts",
      "sha256": "2d983c6953f0312ea86f6701394e19782e83ba02c25529d57950a597254a3477"
    },
    {
      "file": "balance/probe_worldmass_garrisonnames.ts",
      "sha256": "b773c4965d70eff28385d8035104503c91cc8af4e73b50fa22b69bfcdceffcf3"
    },
    {
      "file": "balance/probe_worldmass_geographicacceptance.ts",
      "sha256": "5dbf7043e963060cbca6fda37bfcd1be5eba8055cad6aa4a3596391e74013cd2"
    },
    {
      "file": "balance/probe_worldmass_geographicaccess.ts",
      "sha256": "be113bf8ba6411d5e1dafe9411013d3a7c60a030d121626458e6b1b20df94c2e"
    },
    {
      "file": "balance/probe_worldmass_geographicworker.ts",
      "sha256": "79ce2c838e4969660e0c76eab83401c6a7d091e2a66ef54f6b53fbd49ae3ccea"
    },
    {
      "file": "balance/probe_worldmass_ground.ts",
      "sha256": "057d5d6a860f606e7ca61c444bf298ccef98459128d8388a2a51d6e2510d089f"
    },
    {
      "file": "balance/probe_worldmass_haven.ts",
      "sha256": "cf551d5327cceb98aad5fcb87bf5f7be8da2994d99ecccbbc3610162d6f84f08"
    },
    {
      "file": "balance/probe_worldmass_hierarchy.ts",
      "sha256": "789450462114e7b8423f8d4752155827936c232fb9e2279fbd102dcaea956ad3"
    },
    {
      "file": "balance/probe_worldmass_hierarchyidentity.ts",
      "sha256": "9c5938676819fda62e51627eb09fedd1bcea4539771d46ec2c4ea90dcb66e537"
    },
    {
      "file": "balance/probe_worldmass_holdfamilies.ts",
      "sha256": "d2fb2d29696b156272ee1fdd6110b7907b103c1e8b556f9c50af05b8e093aebc"
    },
    {
      "file": "balance/probe_worldmass_journey.ts",
      "sha256": "0dbb0d6d2bb91469b989188e836dbf847e80dd725ca0590cdd4f995f582a8e4b"
    },
    {
      "file": "balance/probe_worldmass_landformdressing.ts",
      "sha256": "4536a2a3461486ab5bbee8641667b4e625f98b6b7745e71ac86da74a183dfbd3"
    },
    {
      "file": "balance/probe_worldmass_landformhabitats.ts",
      "sha256": "d38a9e2a2e3c99ac5e1ca4fd5c268af43138df7f1db5a5be2a5d4da3a19acce1"
    },
    {
      "file": "balance/probe_worldmass_landformintegrity.ts",
      "sha256": "310c8f728762c3bd11bda1605d2b10cf5e815084e997ecba379f03c1980bd6dd"
    },
    {
      "file": "balance/probe_worldmass_landforms.ts",
      "sha256": "34ebb2b686c33f451fef98ca5333aa0806692a19ae20be20c2243a795b2676a7"
    },
    {
      "file": "balance/probe_worldmass_localcues.ts",
      "sha256": "5c44b94dc053a31cd3853c85d0d2db06589f250db0d5e56386781bfc67b41f58"
    },
    {
      "file": "balance/probe_worldmass_maplabels.ts",
      "sha256": "8177aa19024a30e655ff4cec4aa62c576c2cecaea43f11f2818fc3a25828db9d"
    },
    {
      "file": "balance/probe_worldmass_nativeareaambient.ts",
      "sha256": "f7a3def25eb4a3b8285c9e503ad04b662d0e30c41563ff23cc9fdebb95fc04bf"
    },
    {
      "file": "balance/probe_worldmass_nativeareacompiler.ts",
      "sha256": "a5206f45bf6f43ce3efbf11f5c2945f5d87be72b4b7717338198945118dc8ee3"
    },
    {
      "file": "balance/probe_worldmass_nativeareageneration.ts",
      "sha256": "9ab3bcf3840529ec2f41388b4ce2dff88243bf584a190c09b2ae7a87cb7da27d"
    },
    {
      "file": "balance/probe_worldmass_nativeareageometry.ts",
      "sha256": "d34075267307953f94cdd98955368918dbd6757bfd379474e25bfe1c9efdb12e"
    },
    {
      "file": "balance/probe_worldmass_nativearealocal.ts",
      "sha256": "4b8872d3f57b6716b0463a1721bdb00428a85986a77f8d21408023f25c8973fd"
    },
    {
      "file": "balance/probe_worldmass_nativearearandom.ts",
      "sha256": "c0c716c383c281c4874af5c6f8eb93a1cdf7f2b21f8c8893dd8e3db25a939596"
    },
    {
      "file": "balance/probe_worldmass_nativearearoutes.ts",
      "sha256": "6287dc8ce2aa9960e0a88f0bac22ee4855807b2267a92ad2af7b852797079922"
    },
    {
      "file": "balance/probe_worldmass_nativeareaseams.ts",
      "sha256": "ce3d3bb840c87caac70004ac29865e4f03f92296ab40b465e46b8f6d2c963803"
    },
    {
      "file": "balance/probe_worldmass_nativebrittles.ts",
      "sha256": "08139f50e1144363319ac54cf144ba533b3b03eb9fa18a0b3a46c3bd0e0c5726"
    },
    {
      "file": "balance/probe_worldmass_nativebrittlesources.ts",
      "sha256": "c36b55e2df2c9621fab638c71bbdfcb1352c0dc359a3a3fb19e6d17f1788edf6"
    },
    {
      "file": "balance/probe_worldmass_nativecountry.ts",
      "sha256": "8f8b4a7fcb8690b3920b3311e1f7300bff829ca477bc1a1fed53178ae550c9c2"
    },
    {
      "file": "balance/probe_worldmass_nativeeffects.ts",
      "sha256": "e6b0ab561de606f9986b1bd9249bbad23407d65b045d12a141b9cd48f17a4030"
    },
    {
      "file": "balance/probe_worldmass_nativefeatures.ts",
      "sha256": "dbb52e2025e96c63edc78f18ebf946f409e1a89519f205d2ab84e3231f2336a7"
    },
    {
      "file": "balance/probe_worldmass_nativegeneration.ts",
      "sha256": "d4b681bed5ea67632425ba94a4eae49539e2b5ace3b874731b7daff5029211b4"
    },
    {
      "file": "balance/probe_worldmass_nativegeography.ts",
      "sha256": "bf79a031ce4924312064f42eca296734681eb2b5601aae04970de820e70e1d03"
    },
    {
      "file": "balance/probe_worldmass_nativehost.ts",
      "sha256": "3b44e2b1ea818ec1569b4f8442fa57feb7b7ee29ad3cdd2499a8d70a11f1db57"
    },
    {
      "file": "balance/probe_worldmass_nativeingress.ts",
      "sha256": "473fe8759a3315256b53783c4a7c6012b69e1765771134186b532eb508bfed52"
    },
    {
      "file": "balance/probe_worldmass_nativematerials.ts",
      "sha256": "d0253fbb4523870fe20bff705c3414496bd34e4e41126db6dc6611ee4c9eef5a"
    },
    {
      "file": "balance/probe_worldmass_nativeobstaclecache.ts",
      "sha256": "e8e90cce9bc6fd1c82112467267e8e5ba7a346ed9d4d5bdddd63b768d01dfcb4"
    },
    {
      "file": "balance/probe_worldmass_nativepaging.ts",
      "sha256": "41c68a5ea3cec903da22c1b8b258053cdd08becf772f1347f719ece9635affab"
    },
    {
      "file": "balance/probe_worldmass_nativeregional.ts",
      "sha256": "f02aa07e9e843d7a724a0eb6261ab122a7720870f81542c0132f13ab5b90abed"
    },
    {
      "file": "balance/probe_worldmass_nativeresidency.ts",
      "sha256": "08d1aaa4b426c68a356b5b14769328a2e7c31ce4d5161ec84f77e7f86b104ac7"
    },
    {
      "file": "balance/probe_worldmass_nativeresume.ts",
      "sha256": "012d0debab40b5c981210972637fe10ce3f8a48997a33c9f11c2388ea711b01f"
    },
    {
      "file": "balance/probe_worldmass_nativeseating.ts",
      "sha256": "05a69a799098e939bd61be0b33d7334773164971741ed44600c6d828c2cc8299"
    },
    {
      "file": "balance/probe_worldmass_nativesubstrate.ts",
      "sha256": "3814fa25a0ca2a6b2d92e8d644f776d1367709e393ba0899d2a31c51dc3b0c90"
    },
    {
      "file": "balance/probe_worldmass_nativewalkcache.ts",
      "sha256": "4bac922fdb4d98a1caf68cd1b6045398785995c78591b75eb12f2aaf905988df"
    },
    {
      "file": "balance/probe_worldmass_nativeworker.ts",
      "sha256": "fb89ac88edd8e24eacbff86b9643732b3372098a342944639aae65cda2d0c959"
    },
    {
      "file": "balance/probe_worldmass_neutralground.ts",
      "sha256": "c101aa3d66b0cf4888a2d2879eaf2d53301622b0627e9f94effb583337eeccdc"
    },
    {
      "file": "balance/probe_worldmass_objectivebounties.ts",
      "sha256": "372bd9e73a600a4715ab5dac350846744fd55296dfc563d308d68db46e70dfb7"
    },
    {
      "file": "balance/probe_worldmass_objectives.ts",
      "sha256": "fe660c7f01d2f58dbc1ac1f567c7da0aa47551eb04df92c1c95d870ed35703bc"
    },
    {
      "file": "balance/probe_worldmass_occurrencecontinuity.ts",
      "sha256": "dcb85395b4006b6f44d7152c4d9eba763a5c37fa8520f66ebd401b56498496cf"
    },
    {
      "file": "balance/probe_worldmass_occurrences.ts",
      "sha256": "c641f8a83c821dbc5e5fad168b7ffec434aafd8006672eb007f8d8079ffe5ab7"
    },
    {
      "file": "balance/probe_worldmass_origin.ts",
      "sha256": "ebbc929f9f740ba54a4569abca8dd58104df046a906934f61c0e8bdbc2c5e5a6"
    },
    {
      "file": "balance/probe_worldmass_outposts.ts",
      "sha256": "32eb221b976018a92e4d489afd24c4363298cee4af72ef58d6460e86cebded4a"
    },
    {
      "file": "balance/probe_worldmass_physicalintel.ts",
      "sha256": "6570eb3ee00fed562c79bf5c6c09e936e8e96d4a1983cd7ebac66b25bd9d0dc6"
    },
    {
      "file": "balance/probe_worldmass_population.ts",
      "sha256": "7ccad1b5469f80d1589a6c6b2e209926ee4e85acc10a39f0db776979a6a96f3e"
    },
    {
      "file": "balance/probe_worldmass_populationbudget.ts",
      "sha256": "5f88e83073630ee911132ca6093ec0e0eaf1610c7743a304486d5a320518d9ad"
    },
    {
      "file": "balance/probe_worldmass_processioncontinuity.ts",
      "sha256": "99840fc7ac50bf6f519a9852f1c9ea6871c0dcbf990243bce4b19d62c79bad43"
    },
    {
      "file": "balance/probe_worldmass_processiongameplay.ts",
      "sha256": "852e2aabc303e06e958131bc3bebfc281beab94afe5e7f5db44661ea492e1735"
    },
    {
      "file": "balance/probe_worldmass_processionroutes.ts",
      "sha256": "778a706d4a0962f891dca077a98ddc7fd8071cbf7f0fad8d8d2366eae63772f0"
    },
    {
      "file": "balance/probe_worldmass_processions.ts",
      "sha256": "d7ab37cc4bf499210f39dffe5a4bb4dcc8837e214c560203888d6ff05443dd23"
    },
    {
      "file": "balance/probe_worldmass_processionsources.ts",
      "sha256": "b22f64d3ba0a213141ebca4db997a3b72c59f4cb1fed7d411e302ab06bd317ee"
    },
    {
      "file": "balance/probe_worldmass_processionworker.ts",
      "sha256": "c39cd46c54e34d4717b00548ae4c7c5a4c70e51448ce43406a8628f31220091a"
    },
    {
      "file": "balance/probe_worldmass_progression.ts",
      "sha256": "f43217e28fe0b8f7d3c7aa994a9b60c79f3c415feea20f0249e647da08137aa8"
    },
    {
      "file": "balance/probe_worldmass_puzzlerewards.ts",
      "sha256": "f462333539b0a12560a8a8face6bcad65b3bc7a31e073a69dba5332b9180c5b4"
    },
    {
      "file": "balance/probe_worldmass_puzzles.ts",
      "sha256": "2cc3285c1a836a87f5d327afec7a216209c917eea71e8f1e1d39955dc9f9ef10"
    },
    {
      "file": "balance/probe_worldmass_questchoice.ts",
      "sha256": "7d70c6958c13acf55d9f3818aa947257e08bfed3801b10564762a013f74e7d75"
    },
    {
      "file": "balance/probe_worldmass_quests.ts",
      "sha256": "fde2f7284ef41396983430181a54178d7f73f381c808b98800fefc5fdbb74a91"
    },
    {
      "file": "balance/probe_worldmass_quietanatomy.ts",
      "sha256": "e3154e845d800127c5e053d596aa05403196afe8e0858257bf7da24d7f410449"
    },
    {
      "file": "balance/probe_worldmass_rebase.ts",
      "sha256": "6d68937be74f01ee8b22664d7e7874bdcb2b8184b24b98fe2c337286f73415a7"
    },
    {
      "file": "balance/probe_worldmass_regional.ts",
      "sha256": "f5495c2978cbf591c9f57f042533a5d2ecc177a3a5e92117757bad0df2e88531"
    },
    {
      "file": "balance/probe_worldmass_regionalexpansion.ts",
      "sha256": "2ab4fd40a9c1e099dee434d009bbf371afca66f56de403ad503fc54c5d609694"
    },
    {
      "file": "balance/probe_worldmass_regionalextents.ts",
      "sha256": "f76d847688db1f1b285569596b2800f632c6f3ac28f233797fc137c2562b5188"
    },
    {
      "file": "balance/probe_worldmass_regionallayers.ts",
      "sha256": "36201fcaa4d00955b3eaabfce512ec22c879d6e0b96d5e3a64e40f1998e90202"
    },
    {
      "file": "balance/probe_worldmass_regionalweave.ts",
      "sha256": "c8d2f10db079ef07c2ae7692604f9fe8a324de26429411da6f4365f1b5a54d24"
    },
    {
      "file": "balance/probe_worldmass_regions.ts",
      "sha256": "dc5ca99018e2edc4bf5c1eb528a98b43460b1c9d3716bee3943fede1f7201466"
    },
    {
      "file": "balance/probe_worldmass_resumeworld.ts",
      "sha256": "d4e446c37ee9c249e840212df29efbbaa94aaff652c424391fdc8e5d2b44dd50"
    },
    {
      "file": "balance/probe_worldmass_rewards.ts",
      "sha256": "4dc19edc4b4a2577cfe0a147bcbf1aebbdd96096662a5f74106d4ad07c6ead4f"
    },
    {
      "file": "balance/probe_worldmass_roadguide.ts",
      "sha256": "9d6a77b8a5ae8e888db7edc3841af1a313d7d336ab12b92b35c1a6708913a398"
    },
    {
      "file": "balance/probe_worldmass_roadside.ts",
      "sha256": "a772c750e810c984338cad01452a18d69789326787e7aba522e0fed550a121c2"
    },
    {
      "file": "balance/probe_worldmass_sanctuary.ts",
      "sha256": "1c8e3224d015b08fcd28c4565acb96a1d39ab3aca59ecce3723378ca4f7c4aa4"
    },
    {
      "file": "balance/probe_worldmass_shrines.ts",
      "sha256": "97110bc62aa9e3cc5b1e80972d6beb764ea2bf1c7e07f8b6767c9be418d6740f"
    },
    {
      "file": "balance/probe_worldmass_sideareas.ts",
      "sha256": "e3f715e5474034dec91de64fe4bb28a0b67adae3d914bf9301901cd70fa874a8"
    },
    {
      "file": "balance/probe_worldmass_sites.ts",
      "sha256": "dd3f64d7e295c93e35569e9d909efa2e51282c0ccbd2350e88a3866d51beb151"
    },
    {
      "file": "balance/probe_worldmass_snow.ts",
      "sha256": "46ad441c545f901db22ab7d4c9344adb662935cf5dadd7b29cd366f82afffdfe"
    },
    {
      "file": "balance/probe_worldmass_stops.ts",
      "sha256": "16d6730aaefc954040aa870664730ef9efc2d5e4c669d9f2c1beec2f8838a699"
    },
    {
      "file": "balance/probe_worldmass_storm.ts",
      "sha256": "e18b38a8f95ca527411c16364afcb5f1f8a1927142f29b76de2fdbe608fc29d7"
    },
    {
      "file": "balance/probe_worldmass_survey.ts",
      "sha256": "0af3f57224f6a4cccfe944563e03692702e55c72720cb33792d5c1f43a3415c8"
    },
    {
      "file": "balance/probe_worldmass_targets.ts",
      "sha256": "f2f851d244c040585a333ef2d73d4cf15efb0d6b0ca8fcc359abc897c6918f0e"
    },
    {
      "file": "balance/probe_worldmass_terrainpatches.ts",
      "sha256": "3e1ac1cf3c3531abf786d098b83016f7d1de8fc0cc883bb17efb79a5fb4f7298"
    },
    {
      "file": "balance/probe_worldmass_terrainvariation.ts",
      "sha256": "48dac1d6efbb1bfc1d139dbbe810c89c8500671a513e82bd0437d1ff9a031587"
    },
    {
      "file": "balance/probe_worldmass_territory.ts",
      "sha256": "22bc75b9594fa7514bffaa38c447c67c237ad83eabee65bd7258c8bb84522882"
    },
    {
      "file": "balance/probe_worldmass_weather.ts",
      "sha256": "97c2fdb8d42196aff4fd6616c57d16074e937efc0b9c134588623c759163c282"
    },
    {
      "file": "balance/probe_worldmass_weather_world.ts",
      "sha256": "adb883d249b73c3bbb024c43f223550b48f6d33021589f59e72c616365c24433"
    },
    {
      "file": "balance/probe_worldmass_welcome.ts",
      "sha256": "811cd0daa59b7e5c14443302d59182d486b13c4caae9128d0aaef5239dca3359"
    },
    {
      "file": "balance/probe_worldmass_wilderness.ts",
      "sha256": "eb25beb60d1ff503b52c24dbecde491f32cc651a0ea76d4a86499f6d82f67b4b"
    },
    {
      "file": "balance/probe_worldmass_windchill.ts",
      "sha256": "61be25c9e2c40faa6fb63f189bb76e7833547c4b52f8ce88a8b7ea0a0c738b08"
    },
    {
      "file": "balance/probe_worldmass_work.ts",
      "sha256": "63e039634d3fccb00382b1e573b4a6cb8def4c71f6260cbc61053ddcefeaa04d"
    },
    {
      "file": "balance/probe_worldprogression.ts",
      "sha256": "61336c35046d88598c6079a6c9a8e31106244c7d77b9e691907ed66756c2e9cf"
    },
    {
      "file": "balance/probe_zonepolicy.ts",
      "sha256": "9f5f0e1cb58a3c7e64eaf02fbc2b088f305faaf71e520fed5c53c4637f7c0311"
    },
    {
      "file": "balance/proberoster.ts",
      "sha256": "0ff0aba48b8fd876ef62d360cb30a4eca67518a66537dc49736335931e8b1ba0"
    },
    {
      "file": "balance/loading-native-firefox.cjs",
      "sha256": "d5149866fb8ebae2f00172d1b97eb111e8592e7d452218ae9010b47e64d3722d"
    }
  ],
  "probes": []
};
