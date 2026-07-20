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
};

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
