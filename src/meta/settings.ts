// ---------------------------------------------------------------------------
// SETTINGS — player-customizable keybinds, persisted independently.
//
// One map from ACTION → key. Movement, the six rebindable skill slots (bar
// slots 2–7; slots 0/1 are LMB/RMB and fixed), and the panel toggles are all
// remappable. ESCAPE is deliberately NOT an action — it is hardwired to open
// the menu so you can never lock yourself out of rebinding. Lives in its own
// localStorage key; wipes to defaults on schema mismatch (no migration).
//
// CONTROLLER: a SECOND, parallel map (padBinds) binds the same actions to pad
// buttons ('pad:a' codes — core/gamepad.ts), so keyboard and controller
// coexist; either may drive any action at any moment. The pad map also carries
// skillSlot0/1 (on keyboard those are LMB/RMB, fixed). Sticks are not binds —
// they're axes (move / aim / menu pointer) tuned via the pad options below.
// START is the pad's hardwired Escape, mirroring the keyboard rule.
// ---------------------------------------------------------------------------

import { PAD_CFG, AIM_ASSIST_MODES, padDisplay, type AimAssistMode } from '../core/gamepad';
import { CURSOR_STYLES, DEFAULT_CURSOR_OPTIONS, type CursorOptions } from '../core/cursor';
import { AIM_TICK_STYLES, DEFAULT_AIM_TICK, type AimTickOptions } from '../render/vis/aimtick';
import { MAP_CFG, MAP_LABEL_MODES, type MapLabelMode } from '../ui/mapConfig';
import { UI_SCALE_CFG } from '../ui/uiScale';
import { CAMERA_CFG, CAMERA_MODES, type CameraModeId } from '../render/camera';
import { WORLDSTATE_CFG, type ResumeSpawn } from './worldstate';

export const SETTINGS_SCHEMA_VERSION = 1;

export type ActionId =
  | 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight'
  | 'skillSlot2' | 'skillSlot3' | 'skillSlot4' | 'skillSlot5' | 'skillSlot6' | 'skillSlot7'
  | 'metaModifier' | 'pickup'
  | 'panelChar' | 'panelTree' | 'panelMap' | 'panelInv';

/** Pad-bindable actions: everything the keyboard binds, PLUS bar slots 0/1
 *  (fixed to LMB/RMB on mouse, free to live on any button on a pad). */
export type PadActionId = ActionId | 'skillSlot0' | 'skillSlot1';

/** The player-tunable controller feel — persisted; PAD_CFG holds the engine
 *  defaults these start from (and the internals players never need). */
export interface PadOptions {
  /** Radial stick deadzone, fraction of full deflection. */
  deadzone: number;
  /** Aim reach at FULL right-stick deflection, world units (half-tilt aims
   *  proportionally closer — analog range control). */
  aimRadius: number;
  /** Menu pointer speed, px/sec at full deflection. */
  pointerSpeed: number;
  /** Southpaw: swap the move and aim sticks. */
  swapSticks: boolean;
  /** Soft aim magnetism while the pad owns the reticle: 0 = off, 1 = the
   *  reticle snaps fully onto the held target. The radii and stickiness live
   *  in engine/aimassist.ts; this is the one player-facing dial. */
  aimAssist: number;
  /** AIM sensitivity (0..1): how eagerly the right stick's tilt becomes
   *  reach. Maps across PAD_CFG.aimCurve — 0 relaxed (fine control near
   *  center), 1 twitchy (reach leaps on a small tilt); 0.5 is the engine's
   *  classic response. Aim stick only — movement keeps the engine curve. */
  aimSensitivity: number;
  /** How the soft assist DELIVERS its pull — an AIM_ASSIST_MODES id
   *  (core/gamepad.ts): 'cursor' (default) steers the aim cursor itself so
   *  a broken lock never snaps your facing back; 'view' is the legacy
   *  bend-the-shot-only mechanic, kept selectable on purpose. */
  assistMode: AimAssistMode;
}

export interface Settings {
  schemaVersion: number;
  keybinds: Record<ActionId, string>;
  /** Controller bindings, parallel to keybinds ('' = unbound). */
  padBinds: Record<PadActionId, string>;
  /** Controller feel tunables (deadzone, aim reach, pointer speed, swap). */
  pad: PadOptions;
  /** The thematic mouse cursor + pad reticle identity (core/cursor.ts):
   *  a style from the registry and a tint that survives visual clutter. */
  cursor: CursorOptions;
  /** The continuous low-life blood vignette (seeps in as life ebbs; a slow
   *  heartbeat presses it inward at the last sliver — VIS_CFG.lowLife). OFF
   *  is a real build choice: a 1/1-life or 90%-reserved hero would otherwise
   *  dwell inside a permanent wound. The hit-while-low surge always shows. */
  lowLifePulse: boolean;
  /** THE FALTER (render/screenFx.ts ScreenFxDef.falter): faintness and the
   *  swoon deliberately HOLD presented frames — a simulated lag spike, the
   *  vasovagal skip. Designed and documented (docs/render/falter.md); the
   *  sim/inputs never stutter. OFF kills only the fake hitches (comfort /
   *  accessibility); every other pall read stays. */
  statusFalter: boolean;
  /** Invert movement axes: up walks down, left walks right — movement keys
   *  and the move stick alike, applied at the device layer in one place
   *  (main.ts readLocalInput). Distinct from pad.southpaw (which trades
   *  WHICH stick moves — this flips WHICH WAY movement goes). The
   *  widdershins hex (engine/status.ts invertMove) flips over whatever
   *  this says: two turns make a true. */
  invertMove: boolean;
  /** GEAR pickup style: 'vacuum' (default) hoovers ground gear by walking
   *  over it, exactly like gems; 'key' keeps it a deliberate press (the
   *  pickup bind). A feel preference — both stay first-class. */
  gearPickup: 'vacuum' | 'key';
  /** FORESIGHT: enemy casts with a ground footprint mark their landing spot
   *  during the wind-up (a faint ring firming toward impact). ON by default;
   *  OFF is the hard-mode read-the-animation purist option. */
  castTelegraphs: boolean;
  /** The AIM TICK (the facing/cast-direction pointer on acting bodies):
   *  a style from the registry (render/vis/aimtick.ts — line, dot, …) and
   *  an opacity. 0 hides ticks entirely — see the monster, not the marker. */
  aimTick: AimTickOptions;
  /** When the HUD draws the POISE/INSIGHT pool arcs. 'smart' (default):
   *  around a recent change, or while dented on a build where the pool is
   *  real weight (its damage-worth vs the life stack — VIS_CFG.poolArcs).
   *  'recent': strictly around a recent change. 'always': pinned on — the
   *  min-maxer's steady readout. */
  poolBars: PoolBarsMode;
  /** Where a RELAUNCHED saved run wakes (meta/worldstate.ts): 'exact' — the
   *  spot (and situation) the save captured, so quitting out of trouble
   *  hands the trouble right back; 'town' — the Lastlight sanctuary (the
   *  world stays explored either way; only the body moves). A character
   *  MODE may pin this and ignore the setting (CharacterModeDef.resume). */
  resumeSpawn: ResumeSpawn;
  /** THE UNARMED FLOOR: pressing an EMPTY bar slot swings a fixed, gemless
   *  Improvised Strike (data/skills.ts) — the guarantee that no kit is ever
   *  locked out of touching the world. ON by default and FOUND, not taught
   *  (the first swing names itself). OFF makes empty slots dead keys again —
   *  the fat-finger-near-death dial: whether a stray press mid-dodge may
   *  cost you the half-second is YOUR risk budget, so the switch is yours. */
  improvisedStrike: boolean;
  /** WORLD-MAP NAME CARDS (ui/mapConfig.ts MAP_LABEL_MODES): 'hover' (default)
   *  keeps the chart clean — a zone's card rises under the cursor, and stays
   *  for the pinned zone, the zone you stand in, and pinLabel kinds (towns —
   *  data/zoneKinds.ts), which no mode ever hides. 'always' prints every
   *  charted name, classic-map style. Cards never intercept the cursor in ANY
   *  mode — map hit-testing belongs to zone geometry alone. */
  mapLabels: MapLabelMode;
  /** WORLD-MAP WASH INTENSITY (ui/mapConfig.ts MAP_CFG.wash): one multiplier
   *  on every overlay layer's territory/weather wash opacity — 1 is the
   *  authored look; crank it to READ a warfront's exact reach and gradient
   *  (the QA dial that ships), dim it for a cleaner chart. Badges, sigils
   *  and markers never scale — only the washes. */
  mapWash: number;
  /** THE UI SCALE DIAL (ui/uiScale.ts): one multiplier that grows every
   *  reading surface together — DOM panels/tooltips/popups via the fabric
   *  stylesheet, the canvas HUD via the renderer's scaled sub-pass. The
   *  accessibility dial: 11px Verdana is a wall for plenty of eyes, and no
   *  one should need a magnifier to read their own life orb. Rails live in
   *  UI_SCALE_CFG; world-anchored text deliberately does not ride it. */
  uiScale: number;
  /** THE CAMERA MODE (render/camera.ts registry): 'hero' locks the view to
   *  your hero everywhere — zone edges simply reveal the void frame — while
   *  'zone' is the classic frame that never leaves the zone. A ZoneDef.camera
   *  pin overrides this per-zone; boundless zones always free-follow. */
  cameraMode: CameraModeId;
  /** LINE-OF-SIGHT SHADE (render/vis/sightVeil.ts SightVeil.userMul): one
   *  multiplier on how DARK the sight veil paints its unseen-shadow — walls,
   *  trunks and roofs throw the same shapes at any setting, and everything
   *  that rides the veil (label gating, hidden-actor fades, roof composites)
   *  scales through the same number, so pixels and text always agree. 1 is
   *  the authored night; dim it to admire what the world builds atop its
   *  structures (aetherial spires, the garden's canopies); 0 lifts the veil
   *  entirely. Purely aesthetic — enemy eyes read the engine's own ray and
   *  never this. */
  veilDarkness: number;
}

export type PoolBarsMode = 'smart' | 'recent' | 'always';

export interface SettingsSave {
  schemaVersion: number;
  keybinds: Record<string, string>;
  padBinds?: Record<string, string>;
  pad?: Partial<PadOptions>;
  cursor?: Partial<CursorOptions>;
  lowLifePulse?: boolean;
  statusFalter?: boolean;
  invertMove?: boolean;
  gearPickup?: 'vacuum' | 'key';
  castTelegraphs?: boolean;
  aimTick?: Partial<AimTickOptions>;
  poolBars?: PoolBarsMode;
  resumeSpawn?: ResumeSpawn;
  improvisedStrike?: boolean;
  mapLabels?: MapLabelMode;
  mapWash?: number;
  uiScale?: number;
  cameraMode?: CameraModeId;
  veilDarkness?: number;
}

export const DEFAULT_KEYBINDS: Record<ActionId, string> = {
  moveUp: 'w', moveDown: 's', moveLeft: 'a', moveRight: 'd',
  skillSlot2: '1', skillSlot3: '2', skillSlot4: '3',
  skillSlot5: '4', skillSlot6: '5', skillSlot7: '6',
  metaModifier: 'shift', pickup: 'f',
  // (The old Skill Book key retired — the build lives in the Inventory's
  // pop-out drawer now; one panel, one key.)
  panelChar: 'c', panelTree: 'p', panelMap: 'm', panelInv: 'i',
};

export const ACTION_IDS = Object.keys(DEFAULT_KEYBINDS) as ActionId[];

/** Default controller layout. The left stick IS movement (an axis, not a
 *  bind), which frees the D-pad for the four panels; the movement actions
 *  ship unbound on pad — bindable for D-pad-movement styles. Triggers carry
 *  the two primary slots (twin-stick feel), face + bumpers the rest. */
export const DEFAULT_PAD_BINDS: Record<PadActionId, string> = {
  moveUp: '', moveDown: '', moveLeft: '', moveRight: '',
  skillSlot0: 'pad:rt', skillSlot1: 'pad:lt',
  skillSlot2: 'pad:a', skillSlot3: 'pad:b', skillSlot4: 'pad:x', skillSlot5: 'pad:y',
  skillSlot6: 'pad:rb', skillSlot7: 'pad:lb',
  metaModifier: 'pad:select', pickup: 'pad:r3',
  panelChar: 'pad:up', panelTree: 'pad:right', panelMap: 'pad:left', panelInv: 'pad:down',
};

/** Rebind-UI order for the controller section: the bar first (incl. the two
 *  mouse-fixed slots that only a pad can rebind), then verbs, then movement. */
export const PAD_ACTION_IDS = Object.keys(DEFAULT_PAD_BINDS) as PadActionId[];

export const DEFAULT_PAD_OPTIONS: PadOptions = {
  deadzone: PAD_CFG.deadzone,
  aimRadius: PAD_CFG.aim.maxRadius,
  pointerSpeed: PAD_CFG.pointer.speed,
  swapSticks: false,
  aimAssist: 0.5,
  aimSensitivity: 0.5,
  assistMode: 'cursor',
};

/** Human labels for the rebind UI, in display order. */
export const ACTION_LABELS: Record<ActionId, string> = {
  moveUp: 'Move Up', moveDown: 'Move Down', moveLeft: 'Move Left', moveRight: 'Move Right',
  skillSlot2: 'Skill 3', skillSlot3: 'Skill 4', skillSlot4: 'Skill 5',
  skillSlot5: 'Skill 6', skillSlot6: 'Skill 7', skillSlot7: 'Skill 8',
  metaModifier: 'Meta-Skill Modifier', pickup: 'Pick Up Item',
  panelChar: 'Character Sheet', panelTree: 'Passive Tree', panelMap: 'World Map',
  panelInv: 'Inventory',
};

/** Labels for the pad-only actions; everything else reuses ACTION_LABELS. */
export const PAD_ACTION_LABELS: Record<PadActionId, string> = {
  ...ACTION_LABELS,
  skillSlot0: 'Skill 1 (Primary)', skillSlot1: 'Skill 2',
};

/** Named keys whose stored value (KeyboardEvent.key, lowercased) is unreadable
 *  or invisible as a raw label — ' ' rendered rebind buttons and HUD slot keys
 *  BLANK. Every surface that shows a bind goes through keyDisplay. */
const KEY_DISPLAY_NAMES: Record<string, string> = {
  ' ': 'SPACE',
  'arrowup': '↑', 'arrowdown': '↓', 'arrowleft': '←', 'arrowright': '→',
  'control': 'CTRL', 'escape': 'ESC', 'delete': 'DEL', 'insert': 'INS',
  'pageup': 'PGUP', 'pagedown': 'PGDN', 'capslock': 'CAPS', 'contextmenu': 'MENU',
};

/** Human-readable label for a stored key value. */
export function keyDisplay(key: string): string {
  return KEY_DISPLAY_NAMES[key] ?? key.toUpperCase();
}

/** LIVE-BIND TOKENS — text that names a control never bakes the key in.
 *  A string carries '{bind:<actionId>}' (any ActionId / PadActionId) and the
 *  surface that DISPLAYS it resolves the token at draw time through this —
 *  against the live keybinds, or the pad map while the controller has spoken
 *  recently — so a rebind (or picking the controller up mid-line) re-labels
 *  every hint the same frame. World-authored prompts need no import to
 *  participate: the token is plain text; only display surfaces resolve it.
 *  (The retired Skill Book key taught the hardcoded-hotkey lesson.) */
const BIND_TOKEN_RE = /\{bind:([A-Za-z0-9]+)\}/g;
export function resolveBindTokens(text: string, s: Settings, padActive: boolean): string {
  if (!text.includes('{bind:')) return text;
  return text.replace(BIND_TOKEN_RE, (token, id: string) => {
    const pad = s.padBinds[id as PadActionId];
    const key = s.keybinds[id as ActionId];
    if (pad === undefined && key === undefined) return token; // unknown action: stay legible
    if (padActive && pad) return padDisplay(pad);
    if (key) return keyDisplay(key);
    // Slots 0/1 have no keybind row — off-pad their truth is the mouse
    // (exactly what the bar's slot labels print), never a pad glyph the
    // player may not even have plugged in.
    if (id === 'skillSlot0') return 'LMB';
    if (id === 'skillSlot1') return 'RMB';
    return pad ? padDisplay(pad) : '—'; // other pad-only actions off-pad
  });
}

export const makeSettings = (): Settings => ({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  keybinds: { ...DEFAULT_KEYBINDS },
  padBinds: { ...DEFAULT_PAD_BINDS },
  pad: { ...DEFAULT_PAD_OPTIONS },
  cursor: { ...DEFAULT_CURSOR_OPTIONS },
  lowLifePulse: true,
  statusFalter: true,
  invertMove: false,
  gearPickup: 'vacuum',
  castTelegraphs: true,
  aimTick: { ...DEFAULT_AIM_TICK },
  poolBars: 'smart',
  resumeSpawn: WORLDSTATE_CFG.resume,
  improvisedStrike: true,
  mapLabels: MAP_CFG.labelMode,
  mapWash: MAP_CFG.wash.default,
  uiScale: UI_SCALE_CFG.default,
  cameraMode: CAMERA_CFG.default,
  veilDarkness: 1,
});

export const serializeSettings = (s: Settings): SettingsSave => ({
  schemaVersion: s.schemaVersion,
  keybinds: { ...s.keybinds },
  padBinds: { ...s.padBinds },
  pad: { ...s.pad },
  cursor: { ...s.cursor },
  lowLifePulse: s.lowLifePulse,
  statusFalter: s.statusFalter,
  invertMove: s.invertMove,
  gearPickup: s.gearPickup,
  castTelegraphs: s.castTelegraphs,
  aimTick: { ...s.aimTick },
  poolBars: s.poolBars,
  resumeSpawn: s.resumeSpawn,
  improvisedStrike: s.improvisedStrike,
  mapLabels: s.mapLabels,
  mapWash: s.mapWash,
  uiScale: s.uiScale,
  cameraMode: s.cameraMode,
  veilDarkness: s.veilDarkness,
});

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** null ⇒ schema mismatch → caller wipes. Unknown/partial keybinds fall back
 *  to the default per-action, so a partial save still yields a complete map.
 *  The pad fields are ADDITIVE (older saves simply lack them) — they fill
 *  from defaults, and the numeric options re-clamp on load so a hand-edited
 *  save can't smuggle in a 0 deadzone or a 10⁶-px pointer. */
export function deserializeSettings(s: SettingsSave): Settings | null {
  if (!s || s.schemaVersion !== SETTINGS_SCHEMA_VERSION) return null;
  const keybinds = { ...DEFAULT_KEYBINDS };
  for (const a of ACTION_IDS) if (s.keybinds?.[a]) keybinds[a] = s.keybinds[a];
  const padBinds = { ...DEFAULT_PAD_BINDS };
  for (const a of PAD_ACTION_IDS) {
    if (typeof s.padBinds?.[a] === 'string') padBinds[a] = s.padBinds[a];
  }
  const d = DEFAULT_PAD_OPTIONS;
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION, keybinds, padBinds,
    pad: {
      deadzone: clamp(s.pad?.deadzone ?? d.deadzone, 0.02, 0.6),
      aimRadius: clamp(s.pad?.aimRadius ?? d.aimRadius, 100, 1200),
      pointerSpeed: clamp(s.pad?.pointerSpeed ?? d.pointerSpeed, 200, 3000),
      swapSticks: !!(s.pad?.swapSticks ?? d.swapSticks),
      aimAssist: clamp(s.pad?.aimAssist ?? d.aimAssist, 0, 1),
      aimSensitivity: clamp(s.pad?.aimSensitivity ?? d.aimSensitivity, 0, 1),
      assistMode: AIM_ASSIST_MODES.some(m => m.id === s.pad?.assistMode)
        ? s.pad!.assistMode! : d.assistMode,
    },
    // Cursor identity: unknown styles (a removed mod entry) fall back to the
    // default; the color takes any CSS-safe #rrggbb, else the default tint.
    cursor: {
      style: CURSOR_STYLES[s.cursor?.style ?? ''] ? s.cursor!.style! : DEFAULT_CURSOR_OPTIONS.style,
      color: /^#[0-9a-f]{6}$/i.test(s.cursor?.color ?? '') ? s.cursor!.color! : DEFAULT_CURSOR_OPTIONS.color,
    },
    lowLifePulse: s.lowLifePulse ?? true,
    statusFalter: s.statusFalter ?? true,
    invertMove: s.invertMove ?? false,
    gearPickup: s.gearPickup === 'key' ? 'key' : 'vacuum',
    castTelegraphs: s.castTelegraphs ?? true,
    // Tick identity: unknown styles (a removed entry) fall back; the alpha
    // re-clamps so a hand-edited save can't smuggle a 500% tick.
    aimTick: {
      style: AIM_TICK_STYLES[s.aimTick?.style ?? ''] ? s.aimTick!.style! : DEFAULT_AIM_TICK.style,
      alpha: clamp(s.aimTick?.alpha ?? DEFAULT_AIM_TICK.alpha, 0, 1),
    },
    // Unknown values (a renamed mode) fall back to the default methodology.
    poolBars: s.poolBars === 'always' || s.poolBars === 'recent' ? s.poolBars : 'smart',
    // Unknown values fall back to the engine default (WORLDSTATE_CFG.resume).
    resumeSpawn: s.resumeSpawn === 'town' || s.resumeSpawn === 'exact' ? s.resumeSpawn : WORLDSTATE_CFG.resume,
    improvisedStrike: s.improvisedStrike ?? true,
    // Unknown values (a renamed mode) fall back to the registry default.
    mapLabels: MAP_LABEL_MODES.some(m => m.id === s.mapLabels) ? s.mapLabels! : MAP_CFG.labelMode,
    // Re-clamped into the wash rails (a hand-edited save can't blind the map).
    mapWash: clamp(s.mapWash ?? MAP_CFG.wash.default, MAP_CFG.wash.min, MAP_CFG.wash.max),
    // Re-clamped into the fabric's rails, like every numeric option.
    uiScale: clamp(s.uiScale ?? UI_SCALE_CFG.default, UI_SCALE_CFG.min, UI_SCALE_CFG.max),
    // Unknown values (a renamed mode, a pre-dial save) fall back to the
    // registry default — currently the hero-locked frame.
    cameraMode: CAMERA_MODES.some(m => m.id === s.cameraMode) ? s.cameraMode! : CAMERA_CFG.default,
    // Re-clamped like every numeric option (0 = veil lifted, 1 = authored).
    veilDarkness: clamp(s.veilDarkness ?? 1, 0, 1),
  };
}
