// ---------------------------------------------------------------------------
// THE CAMERA FABRIC — how the view frames the hero, as data.
//
// One registry of CameraModeDefs; each mode is a bundle of PARAMETERS that the
// single placeCamera() resolver reads — never a branch per mode, so a new
// framing (a lookahead lead, a boss-arena letterbox, a cinematic drift) is one
// entry here, not renderer surgery. Resolution order, per frame
// (renderer.render):
//
//   ZoneDef.camera pin  →  Settings.cameraMode (Options)  →  CAMERA_CFG.default
//
// The pin itself is either authored on a hand-written def, or STAMPED AT MINT
// by the most specific word (the sky-exposure law, engine/worldgen.ts — both
// chokepoints, placeZoneAt + the cave ladder):
//
//   ZoneSpec.camera (directed mint)  ▷  TilesetDef.camera (the biome's claim)
//
// Absent everywhere = no key on the def, and the player's Options pick rules.
//
// BOUNDLESS zones (the Descent abyss, the open sea) have no frame to clamp
// to: placeCamera free-follows there regardless of the chosen mode — that is
// the same behavior the old inline branch had, now a property of the resolver.
//
// What lies beyond the frame when a follow-mode presses the world's edge is
// the VOID FRAME's problem (render/vis/voidFrame.ts), not the camera's.
// ---------------------------------------------------------------------------

export type CameraModeId = 'hero' | 'zone';

export interface CameraModeDef {
  id: CameraModeId;
  /** Options-row name. */
  name: string;
  /** Options tooltip line — say what the frame FEELS like, not the math. */
  blurb: string;
  /** Confine the view to the zone rect: the classic ARPG frame. false = the
   *  camera belongs to the hero alone — pressed against the world's edge the
   *  hero stays centered and the dark beyond simply comes into view. */
  clampToZone: boolean;
  /** px of void grace past each edge while clamped — a breath of dark so the
   *  frame never slams flush into the rim. Ignored unless clampToZone. */
  overshoot: number;
  /** Pin zones that FIT the window (+fitMargin) centered instead of following
   *  — the classic interior letterbox. Ignored unless clampToZone. */
  centerSmallZones: boolean;
  fitMargin: number;
}

export const CAMERA_MODES: readonly CameraModeDef[] = [
  {
    id: 'hero',
    name: 'Locked to Hero',
    blurb: 'The camera belongs to your hero: always centered on you, even pressed '
      + 'against the world\'s edge — the abyss beyond simply comes into view. '
      + '(The Descent\'s camera, everywhere.)',
    clampToZone: false, overshoot: 0, centerSmallZones: false, fitMargin: 0,
  },
  {
    id: 'zone',
    name: 'Zone Framed',
    blurb: 'The classic ARPG frame: follows your hero but never leaves the zone, '
      + 'resting at the edges; zones smaller than the window pin centered.',
    clampToZone: true, overshoot: 80, centerSmallZones: true, fitMargin: 160,
  },
];

export const CAMERA_CFG = {
  /** The mode a fresh install — or a save from before the dial existed —
   *  wakes with. The hero-locked frame is the current default on purpose:
   *  the whole world is being auditioned under the Descent's camera. */
  default: 'hero' as CameraModeId,
  /** World framing multiplier; 100% preserves the established 1.3 scale. */
  zoom: { base: 1.3, default: 1, min: .85, max: 1.6, step: .05 },
};

/** Additive saved preference: absent or malformed values keep classic framing. */
export function cameraZoomOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(CAMERA_CFG.zoom.min,Math.min(CAMERA_CFG.zoom.max,value)) : CAMERA_CFG.zoom.default;
}

/** Registry lookup with the fabric's default as the safety net — a renamed
 *  mode in an old save (or a bad ZoneDef pin) degrades to the default, never
 *  to a crash or a frozen frame. */
export function cameraModeOf(id: string | undefined): CameraModeDef {
  return CAMERA_MODES.find(m => m.id === id)
    ?? CAMERA_MODES.find(m => m.id === CAMERA_CFG.default)
    ?? CAMERA_MODES[0];
}

/** One clamped follow axis — reproduces the classic frame exactly: a zone
 *  that fits the window (+fitMargin) pins centered; otherwise follow the
 *  focus, held inside [-overshoot, span - view + overshoot]. (When the zone
 *  is barely wider than the window that range inverts; min-of-max resolves
 *  it to the high pin, the classic frame's long-standing resting bias.) */
function followAxis(mode: CameraModeDef, focus: number, view: number, span: number): number {
  if (mode.centerSmallZones && span + mode.fitMargin <= view) return (span - view) / 2;
  return Math.min(span - view + mode.overshoot, Math.max(-mode.overshoot, focus - view / 2));
}

/** THE resolver: the camera's top-left corner for this frame. `focus` is the
 *  point the mode follows (the local hero); vw/vh are view dims in world px
 *  (screen ÷ zoom). Boundless arenas free-follow regardless of mode. */
export function placeCamera(
  mode: CameraModeDef,
  focus: { x: number; y: number },
  vw: number, vh: number,
  arena: { w: number; h: number; boundless?: boolean },
): { x: number; y: number } {
  if (arena.boundless || !mode.clampToZone) {
    return { x: focus.x - vw / 2, y: focus.y - vh / 2 };
  }
  return {
    x: followAxis(mode, focus.x, vw, arena.w),
    y: followAxis(mode, focus.y, vh, arena.h),
  };
}

// ---------------------------------------------------------------------------
// THE COUCH FRAME (data/couch.ts COUCH_CFG.camera) — one shared screen serving
// several local heroes. Pure math, separate from placeCamera on purpose: this
// solves WHAT the frame must hold (focus + how far zoom may fall); placeCamera
// then frames that focus under whatever camera mode governs, unchanged. The
// probe (balance/probe_couch.ts) pins these laws headlessly.
// ---------------------------------------------------------------------------

export interface CouchCamSpec {
  /** World-unit breathing room kept around each hero inside the frame. */
  fitMarginWu: number;
  /** The stretch cap: zoom may fall to base × this and no further. */
  maxStretch: number;
  /** World-unit inset from the frame edge the EDGE LAW confines heroes to. */
  confineMarginWu: number;
}

/** Solve the shared frame for a set of local heroes: the focus is their
 *  bounding box's center; `stretch` is the zoom multiplier (≤1) that fits the
 *  box + margins on screen, floored at the cap — past the cap the frame stops
 *  answering and the edge law (couchConfineRect) holds the runners. One hero
 *  degenerates to {focus: hero, stretch: 1} — the solo frame, exactly. */
export function couchFit(
  eyes: ReadonlyArray<{ x: number; y: number }>,
  screenW: number, screenH: number, baseZoom: number, spec: CouchCamSpec,
): { focus: { x: number; y: number }; stretch: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of eyes) {
    if (e.x < minX) minX = e.x;
    if (e.y < minY) minY = e.y;
    if (e.x > maxX) maxX = e.x;
    if (e.y > maxY) maxY = e.y;
  }
  const focus = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const needW = (maxX - minX) + 2 * spec.fitMarginWu;
  const needH = (maxY - minY) + 2 * spec.fitMarginWu;
  // The zoom that would exactly fit the need on each axis; the tighter axis
  // governs. At or above base (heroes close together) the frame stays solo.
  const zFit = Math.min(screenW / Math.max(1, needW), screenH / Math.max(1, needH));
  const stretch = Math.max(spec.maxStretch, Math.min(1, zFit / baseZoom));
  return { focus, stretch };
}

/** THE EDGE LAW's rect: where couch heroes may STAND, derived from the frame
 *  actually drawn this frame (camera top-left + view dims), inset by the
 *  confine margin. Drawn == confined by construction: the engine clamps couch
 *  heroes into exactly the rect the renderer published (world.couchConfine),
 *  so "the screen's edge" and "the movement wall" can never disagree. */
export function couchConfineRect(
  cam: { x: number; y: number }, vw: number, vh: number, spec: CouchCamSpec,
): { x: number; y: number; w: number; h: number } {
  const m = spec.confineMarginWu;
  return { x: cam.x + m, y: cam.y + m, w: Math.max(1, vw - 2 * m), h: Math.max(1, vh - 2 * m) };
}

// ---------------------------------------------------------------------------
// THE SMOOTH SHELL's follow (docs/engine/shard.md "The pieces"; net/shell.ts):
// a hosted world's render shell draws its own hero where the shell predicts
// it, and a correction the shell could not glide out (THE SOFT CORRECTION
// snaps one at its offsetSnapPx) would jolt the whole screen under a hard
// lock. The shell's camera chases its focus on a CRITICALLY DAMPED spring
// instead. A dial, never a mode: omega 0 is the hard lock, and solo play and
// every host never wear the spring at all (the renderer's cameraFollow is set
// on a client shell alone), so their frame is the pre-shard frame byte for byte.
// ---------------------------------------------------------------------------

export const CAMERA_FOLLOW_CFG = {
  /** Spring stiffness (rad/s), critically damped: a walking hero leads the frame's centre by
   *  about 2v/omega (17 px at 250 px/s), a correction settles in about 4/omega s. 0 = the hard lock. */
  omega: 30,
  /** A jump at least this far (a zone change, a blink across a room) re-seats the spring at once. */
  snapPx: 480,
  /** The longest step the spring takes in one frame (s): a hitch never flings it. */
  maxDt: 0.1,
};

/** One spring's state: where the frame's focus is drawn, its velocity, and its last clock. */
export interface CameraFollow { x: number; y: number; vx: number; vy: number; seated: boolean; atMs: number }
export function newCameraFollow(): CameraFollow { return { x: 0, y: 0, vx: 0, vy: 0, seated: false, atMs: 0 }; }

/** One critically damped step toward `target` (the exact closed form: stable for any step).
 *  Returns the focus to draw. omega 0, a first call, or a jump past snapPx: the target itself. */
export function springFollow(
  s: CameraFollow, target: { x: number; y: number }, nowMs: number,
  cfg: { omega: number; snapPx: number; maxDt: number } = CAMERA_FOLLOW_CFG,
): { x: number; y: number } {
  const dt = Math.max(0, Math.min(cfg.maxDt, (nowMs - s.atMs) / 1000));
  s.atMs = nowMs;
  if (cfg.omega <= 0 || !s.seated || Math.hypot(target.x - s.x, target.y - s.y) >= cfg.snapPx) {
    s.x = target.x; s.y = target.y; s.vx = 0; s.vy = 0; s.seated = true;
    return { x: s.x, y: s.y };
  }
  const w = cfg.omega, e = Math.exp(-w * dt);
  const ox = s.x - target.x, oy = s.y - target.y;
  const tx = (s.vx + w * ox) * dt, ty = (s.vy + w * oy) * dt;
  s.vx = (s.vx - w * tx) * e; s.vy = (s.vy - w * ty) * e;
  s.x = target.x + (ox + tx) * e; s.y = target.y + (oy + ty) * e;
  return { x: s.x, y: s.y };
}
