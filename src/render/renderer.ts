// ---------------------------------------------------------------------------
// Canvas renderer: world (camera-following) + HUD. Placeholder geometry art —
// every visual reads its color/shape from the data definitions.
// ---------------------------------------------------------------------------

import { clamp, dist, type Vec2 } from '../core/math';
import { DEFAULT_CURSOR_OPTIONS, drawAimReticle } from '../core/cursor';
import { instanceChargeCost, instanceMeta, instanceMods, instanceStrikeTiming, instanceTrigger, instanceUseCharges, skillContextTags, SKILL_RARITIES } from '../engine/skills';
import { ITEM_RARITIES } from '../engine/items';
import { VESTIGES } from '../data/vestiges';
import { ESSENCES } from '../data/essences';
import { STATUS_DEFS } from '../engine/status';
import { toneTint } from '../engine/tuning';
import { STANCE_PLANT_TIME, shellArcFactor, type Actor } from '../engine/actor';
import { throngSightSet } from '../engine/throng';
import { GRAB_VERB_LABEL } from '../engine/grab';
import { PLY_CFG } from '../engine/plies';
import { SEG_CFG, segLook, segR, segsHittable } from '../engine/segments';
import { CHARGE_DEFS, chargeColor, chargeLabel } from '../engine/charges';
import { REMNANT_KINDS } from '../data/remnants';
import { ORB_DEFS } from '../data/orbs';
import { RUNE_INFO } from '../data/invocations';
import { COMBO_LIST, COMBO_RULES } from '../data/combos';
import { COMBO_CFG, comboProgress, comboStat } from '../engine/sequence';
import { CORPSE_CFG, LOW_LIFE_FLASH_SEC, OFFERINGS_PER_POINT, SNOW_CFG } from '../engine/world';
import type { Seat, World } from '../engine/world';
import { ATTENTION_CFG, collectAttention } from '../world/attention';
import { dayCycle } from '../world/daynight';
import { GridWalkField } from '../world/gridWalk';
import { regionKind, SURVIVAL_RESOURCES } from '../world/regions';
import { tierLinkOf } from '../engine/tiers';
import { stratumOf } from '../world/strata';
import { blocksMovement, blocksProjectiles, doodadRuleOf, hitSurfaceOf, pitRegionOf, type Doodad } from '../engine/levelgen';
import type { HitShape } from '../engine/shapes';
import { PROJ_FORM_GEO } from '../engine/projForms';
import { transitRing } from '../data/transit';
import { EVENT_COLOR, gateLookOf } from '../data/gateVisuals';
import { courtLord } from '../packages/courts';
import { boundaryGateOf } from '../data/boundaryGates';
import { VEIL_DEFAULTS } from '../engine/veil';
import { DEFENSE_CFG } from '../engine/defense';
import { QUEST_GIVER_IDS } from '../quests/defs';

/** View-cull margin beyond a doodad's own radius: canopy crowns, vent rims,
 *  and blob `grow` passes all overdraw past the disc — the pad keeps their
 *  edges from popping at the screen border. */
const RENDER_CULL_PAD = 150;
import { roofStyle } from '../data/structures';
import { DEFAULT_KEYBINDS, keyDisplay, resolveBindTokens, type ActionId, type Settings } from '../meta/settings';
import { UI_SCALE_CFG } from '../ui/uiScale';
import { padDisplay } from '../core/gamepad';
import { collectActiveFx, collectFalterK, type ActiveFx } from './screenFx';
import { RARITY_DEFS } from '../engine/rarity';
import { FACTIONS, MONSTERS } from '../data/monsters';
import { hash01, hexToRgb, shade, valueNoise, withAlpha } from './vis/color';
import { materialOf, rampOf } from './vis/materials';
import { adornFlashSprite, adornSprite, bodyFlashSprite, bodySprite, drawLiveParts, lookOf, shapeIsOriented, spriteHalf, type BodyLook } from './vis/body';
import { portraitSubjectOf, portraitTile, type PortraitSubject } from './vis/portrait';
import { drawGlow, drawLongShadow, drawShadow, releaseCanvas, sunCast } from './vis/sprites';
import { registerVisCache, trimVisCaches } from './vis/caches';
import { drawEdgeOverlay, qFrac, qChan } from './vis/overlays';
import { canvasCap, canvasCapsReport } from './vis/canvasCaps';
import { GroundRenderer } from './vis/ground';
import { CANOPY_PAINTERS, CANOPY_STATIC, PAINTERS, paintBakedWhole, paintBlendUnderlay, paintGroupShadows, type DoodadVisualDef, type PaintEnv } from './vis/painters';
import { blitCrown, CanopySlices, EMPTY_PARAMS } from './vis/canopy';
import { CanopyEyes, type EyedGroup } from './vis/canopyEyes';
import { WallEyes } from './vis/wallEyes';
import { RoomVeil } from './vis/roomVeil';
import { SightVeil } from './vis/sightVeil';
import { DOODAD_VISUALS } from '../data/doodadVisuals';
import { LightLayer } from './vis/lights';
import { drawWeatherFx, WEATHER_FX } from './vis/weatherFx';
import { drawFogLayer } from './vis/fogLayer';
import { drawCreepLayer } from './vis/creepLayer';
import { drawFluxLayer } from './vis/fluxLayer';
import { drawTrackLanes, drawTrackRiders, drawTrackWarnArcs } from './vis/trackLayer';
import { drawTrapworkTells } from './vis/trapLayer';
import { riderSurface as trackRiderSurface, trackPose } from '../engine/tracks';
import { UnderstoryLayer } from './vis/understory';
import { cameraModeOf, couchConfineRect, couchFit, placeCamera } from './camera';
import { COUCH_CFG } from '../data/couch';
import { drawVoidFrame, voidBaseOf } from './vis/voidFrame';
import { traversalPose, traversalVeil } from '../engine/traversal';
import './vis/paintersGloam'; // side-effect: the Gloamwood kit's painters register
import './vis/paintersHallow'; // side-effect: the Hallow-country kit's painters register
import './vis/paintersAether'; // side-effect: the Aetherial kit's painters register
import './vis/paintersHome'; // side-effect: the hearth-and-bed kit's painters register
import './vis/paintersSea'; // side-effect: the ship-deck kit + ghost hull register
import './vis/paintersGarden'; // side-effect: the Garden kit's painters register
import './vis/paintersGrove'; // side-effect: the Grove kit's painters register
import { drawAmbientFx } from './vis/ambientFx';
import { WEATHER_DEFS, type WeatherKind } from '../world/weather';
import { foldZoneWash } from '../world/zoneWash';
import { VIS_ABLATE, VIS_CFG, VIS_TELEMETRY } from './vis/visConfig';
import { AIM_TICK_STYLES, DEFAULT_AIM_TICK } from './vis/aimtick';

const SLOT_KEYS = ['LMB', 'RMB', '1', '2', '3', '4', '5', '6'];

/** The LIFE ORB's arc ladder — px beyond the orb radius per ring, inside→
 *  out: the tank layers that eat damage before blood (ES, absorb, insight),
 *  then the poise break-bar, then the endurance wall. One table so a new
 *  ring slots in without nudging its neighbors by hand; the orb caption and
 *  the survival meters clear the outermost rung through it. */
const ORB_ARCS = {
  es: 6, absorb: 11, insight: 16, poise: 21, endurance: 26,
  /** Caption clearance above the outermost ring. */
  captionPad: 5,
};

const warnedUnrenderedKinds = new Set<string>();

/** The low-life vignette's heartbeat waveform: two smooth gaussian swells per
 *  cycle (the lub, then the softer dub from VIS_CFG.lowLife.beat), then a long
 *  quiet diastole. Phase in [0,1); each swell is also evaluated one cycle to
 *  either side so a bump straddling the seam stays continuous. Smoothness is
 *  the safety property here — the vignette breathes, it never steps. */
function lubDub(phase: number): number {
  const { lub, dub } = VIS_CFG.lowLife.beat;
  let v = 0;
  for (const b of [lub, dub]) {
    for (const ph of [phase - 1, phase, phase + 1]) {
      const d = (ph - b.at) / b.width;
      v += b.amp * Math.exp(-0.5 * d * d);
    }
  }
  return Math.min(1, v);
}

/** Lerp two hex colours, returned as the "r,g,b" body of an rgba() string. */
function blendRgb(from: string, to: string, k: number): string {
  const a = hexToRgb(from), b = hexToRgb(to);
  return `${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)}`;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  cam = { x: 0, y: 0 };
  /** Screen-space mouse, fed by main each frame — HUD hover affordances
   *  (buff-pip names) read it; (-1,-1) = no pointer. */
  hudMouse = { x: -1, y: -1 };
  /** THE UI-SCALE SUB-PASS state (Settings.uiScale — ui/uiScale.ts): the
   *  VIRTUAL canvas dims + mouse, physical ÷ scale, refreshed each frame in
   *  render(). Every pure screen-space widget pass draws against uiW/uiH
   *  under one ctx.scale so the whole HUD grows together; hover math inside
   *  those passes must compare uiMouse, never hudMouse. */
  private uiW = 0;
  private uiH = 0;
  private uiMouse = { x: -1, y: -1 };
  /** The PAD's assisted aim (world point + soft-lock target id), fed by main
   *  each frame while the pad owns the reticle; null = mouse aim, no reticle.
   *  Doubles as "where is the cursor, really" for aim-anchored affordances
   *  (the elite nameplate hover follows it). */
  padAim: { x: number; y: number; lockId: number | null } | null = null;
  /** COUCH GUEST reticles (data/couch.ts): each guest's live assisted aim +
   *  soft-lock, fed by main each frame in the guest's class tint — two
   *  cursors on one screen need two identities. Empty outside couch play. */
  couchAims: { x: number; y: number; lockId: number | null; color: string }[] = [];
  /** Couch guest seats whose CONTROLLER is currently lost (main.ts identity
   *  sweep publishes per frame) — their flank HUD says so. Empty solo. */
  couchPadLost: string[] = [];
  /** World→screen scale. >1 zooms in; the bigger zones keep it from cramping.
   *  BASE is the classic constant; the COUCH FRAME (data/couch.ts) widens the
   *  live value by couchStretch — smoothed toward couchFit each frame, hard-
   *  floored at the stretch cap. Solo keeps couchStretch pinned at exactly 1,
   *  so every consumer of `zoom` reads the byte-identical classic 1.3. */
  private readonly baseZoom = 1.3;
  private couchStretch = 1;
  private get zoom(): number { return this.baseZoom * this.couchStretch; }
  /** Frame delta off the sim clock (canopy/roof fade smoothing). */
  private frameDt = 0;
  private lastRenderTime = 0;

  constructor(
    public canvas: HTMLCanvasElement,
    private getSettings?: () => Settings,
  ) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    // Warm the canvas capability probe (vis/canvasCaps.ts) off the hot
    // path: verdicts are lazy (first canvasCap ask) and the GPU-class
    // probe costs ~a frame ONCE — spend it here in boot/menu idle, never
    // mid-fight on the first pall.
    const idle: (f: () => void) => unknown =
      typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : (f) => setTimeout(f, 400);
    idle(() => { try { canvasCapsReport(); } catch { /* probe failure = default verdicts */ } });
    // THE LITE TIER's per-kind composite bakes (drawLite) join the cache
    // steward: tiny (a handful of kinds), dropped at every zone boundary.
    registerVisCache({
      id: 'lite',
      count: () => this.liteSprites.size,
      onZoneSwap: () => this.liteSprites.clear(),
    });
  }

  /** Wired by main.ts (same altitude as getSettings): has the CONTROLLER
   *  spoken recently? Drives which map — keyboard or pad — bind tokens and
   *  slot labels read, so every hint follows the device of the moment. */
  getPadActive?: () => boolean;

  /** Live keybind label for one action — every HUD hint that names a key
   *  goes through this, so hints can never drift from a rebind (the retired
   *  Skill Book key taught that lesson). */
  private actionKey(id: ActionId): string {
    return keyDisplay(this.getSettings?.().keybinds[id] ?? DEFAULT_KEYBINDS[id]);
  }

  /** Resolve '{bind:…}' tokens in display text against the LIVE binds —
   *  keyboard, or the pad map while the controller is active (see
   *  meta/settings.ts resolveBindTokens). The queueLabel and floating-text
   *  chokepoints run every world-authored prompt through this, so no hint
   *  can name a key the player rebound away or a device they put down. */
  private resolveText(text: string): string {
    const s = this.getSettings?.();
    return s ? resolveBindTokens(text, s, this.getPadActive?.() ?? false) : text;
  }

  /** Bar-slot labels, derived from the live binds: the pad map (RT/LT/Ⓐ…)
   *  while the controller is active, else the keybinds (slots 0/1 fixed to
   *  mouse). Falls back to the defaults if no settings are wired in.
   *  `forcePad` — a couch guest IS a pad; its bar always reads pad glyphs. */
  private slotKeys(forcePad = false): string[] {
    const s = this.getSettings?.();
    if (!s) return SLOT_KEYS;
    if (forcePad || this.getPadActive?.()) {
      const pb = s.padBinds;
      return [pb.skillSlot0, pb.skillSlot1, pb.skillSlot2, pb.skillSlot3,
        pb.skillSlot4, pb.skillSlot5, pb.skillSlot6, pb.skillSlot7].map(padDisplay);
    }
    const kb = s.keybinds;
    return ['LMB', 'RMB', kb.skillSlot2, kb.skillSlot3, kb.skillSlot4,
      kb.skillSlot5, kb.skillSlot6, kb.skillSlot7].map(keyDisplay);
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /** Screen -> world coordinates (for mouse aiming). Inverts scale·translate. */
  toWorld(p: { x: number; y: number }): Vec2 {
    return { x: p.x / this.zoom + this.cam.x, y: p.y / this.zoom + this.cam.y };
  }

  /** World -> screen coordinates — toWorld's exact inverse (used to hand the
   *  reticle's position to the mouse on an aim-source switch). Uses the last
   *  rendered camera, which is at most one frame stale. */
  toScreen(p: { x: number; y: number }): Vec2 {
    return { x: (p.x - this.cam.x) * this.zoom, y: (p.y - this.cam.y) * this.zoom };
  }

  /** The live UI-scale dial (Settings.uiScale), re-clamped to the fabric's
   *  rails so a hand-edited save can't fold the HUD inside-out mid-frame. */
  private uiScaleLive(): number {
    const v = this.getSettings?.().uiScale ?? UI_SCALE_CFG.default;
    return clamp(v, UI_SCALE_CFG.min, UI_SCALE_CFG.max);
  }

  /** One scaled screen-space widget pass: everything `draw` paints in
   *  virtual (uiW×uiH) coordinates lands physically ×scale. Only for passes
   *  that never project world coords — a projected point under a scaled ctx
   *  lands off-target (the attention chevrons and descent shaft pip stay
   *  physical for exactly that reason). */
  private uiPass(scale: number, draw: () => void): void {
    const { ctx } = this;
    ctx.save();
    ctx.scale(scale, scale);
    draw();
    ctx.restore();
  }

  /** The cache steward's boundary detectors (vis/caches.ts): which World
   *  and which zone the last frame drew — identity flips fan out the trims. */
  private stewardWorld: unknown = null;
  private stewardZone: unknown = null;

  /** This frame's collected status screen-fx (screenFx.ts) — gathered once
   *  at the top of render() for the falter gate, reused by drawStatusFx. */
  private frameFx: ActiveFx[] = [];
  /** THE FALTER's scheduler (wall-clock ms): when the current held frame
   *  releases, when the next hitch lands, and whether a falter-bearing fx
   *  was live last frame (fresh activation re-arms firstDelaySec). */
  private falterHoldUntil = 0;
  private falterNextAt = 0;
  private falterArmed = false;
  private falterW = 0;
  private falterH = 0;

  render(world: World): void {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;

    // THE CACHE STEWARD's boundaries (vis/caches.ts): a zone swap trims
    // every registered cache to its post-swap posture; a NEW WORLD (menu →
    // fresh run) releases the lot. Detected here — the renderer is the one
    // place that sees both identities every frame — and fanned out before
    // anything draws, so evictees re-bake on sight, never mid-use.
    let boundary = false;
    if (this.stewardWorld !== world) {
      if (this.stewardWorld !== null) trimVisCaches('run');
      this.stewardWorld = world;
      this.stewardZone = world.zone;
      boundary = true;
    } else if (this.stewardZone !== world.zone) {
      this.stewardZone = world.zone;
      trimVisCaches('zone');
      boundary = true;
    }

    // THE FALTER (screenFx.ScreenFxDef.falter × VIS_CFG.statusFx.falter):
    // while a falter-bearing status rides the LOCAL hero, hold the whole
    // presented frame on a jittered cadence — the deliberate fake lag spike
    // (docs/render/falter.md). DESIGNED, not a defect: the sim keeps
    // stepping, inputs keep landing, the co-op wire never pauses; only what
    // the eye gets is briefly stale, exactly like the hitch it impersonates.
    // Boundary frames (zone/world flip) and resizes always draw — a swap's
    // first frame or a fresh backing store must never present stale pixels.
    this.frameFx = collectActiveFx(world.player.statuses);
    const resized = w !== this.falterW || h !== this.falterH;
    this.falterW = w; this.falterH = h;
    const falterK = (this.getSettings?.().statusFalter ?? true)
      ? collectFalterK(this.frameFx) : 0;
    if (falterK <= 0 || boundary || resized) {
      // Not faltering (or must draw): disarm so the NEXT activation gets a
      // fresh firstDelaySec beat instead of a mid-schedule leftover.
      this.falterArmed = false;
      this.falterHoldUntil = 0;
    } else {
      const nowMs = performance.now();
      const F = VIS_CFG.statusFx.falter;
      if (!this.falterArmed) {
        this.falterArmed = true;
        this.falterNextAt = nowMs + F.firstDelaySec * 1000;
      }
      if (nowMs < this.falterHoldUntil) return; // mid-hold: present the held frame
      if (nowMs >= this.falterNextAt) {
        const hold = F.holdMs[0] + (F.holdMs[1] - F.holdMs[0]) * falterK;
        const period = (F.periodSec[0] + (F.periodSec[1] - F.periodSec[0]) * falterK) * 1000;
        this.falterHoldUntil = nowMs + hold;
        // Render-side jitter only — never the sim's streams.
        this.falterNextAt = nowMs + hold + period * (1 + (Math.random() * 2 - 1) * F.jitter);
        return; // the hold begins on this frame — keep what's presented
      }
    }

    // Frame delta off the sim clock — the smoothing step for canopy/roof fades.
    this.frameDt = clamp(world.time - this.lastRenderTime, 0, 0.1);
    this.lastRenderTime = world.time;

    // THE CAMERA (render/camera.ts): the mode registry decides how the view
    // frames the hero — a ZoneDef.camera pin wins, then the player's Options
    // pick, then the fabric default. Boundless zones (the Descent abyss)
    // free-follow inside placeCamera regardless of mode: no frame to clamp to.
    //
    // THE COUCH FRAME rides in front: with guests seated, the frame's focus
    // is the heroes' shared center and the zoom BREATHES down toward the fit
    // (couchFit — smoothed, floored at the stretch cap); the frame actually
    // drawn is then published back as THE EDGE LAW's rect (world.couchConfine)
    // so drawn == confined by construction. Solo: stretch pins to 1, focus is
    // the hero, the rect is null — byte-identical to the classic frame.
    const couchEyes = world.couchActive() ? world.couchHeroes() : null;
    const couchOn = !!couchEyes && couchEyes.length > 1;
    // A DEGENERATE viewport (a minimized window, a zero-size boot frame)
    // must never drive the fit — a 0-wide screen would slam the stretch to
    // the cap and shrink the edge law's rect to a point-prison. Hold the
    // frame where it stands and publish NO confine until pixels return.
    const viewOk = w >= 64 && h >= 64;
    // THE CINEMATIC EYE (engine/scenes.ts): a running scene may hand the
    // camera a focus of its own — the reckoning's pan is the director
    // lerping this point, so drawn == scripted with no easing forked here.
    let focus: { x: number; y: number } = world.scene?.focus ?? world.player.pos;
    if (couchOn && viewOk) {
      const fit = couchFit(couchEyes.map(a => a.pos), w, h, this.baseZoom, COUCH_CFG.camera);
      this.couchStretch += (fit.stretch - this.couchStretch)
        * Math.min(1, this.frameDt * COUCH_CFG.camera.zoomLerp);
      focus = fit.focus;
    } else if (!couchOn) {
      this.couchStretch = 1; // solo: pinned exactly — the classic frame
    } // else: couch play under a degenerate view — hold the stretch as-is
    // The positional veils are single-eye fabrics — under a shared couch
    // frame they suspend per COUCH_CFG.render (both players see what the
    // camera sees); each veil's own fade handles the transition gracefully.
    this.sightVeil.suspend = couchOn && COUCH_CFG.render.sightVeil === 'off';
    this.roomVeil.suspend = couchOn && COUCH_CFG.render.roomVeil === 'off';
    const z = this.zoom, vw = w / z, vh = h / z;
    const az = world.arena;
    const camMode = cameraModeOf(world.zone.camera ?? this.getSettings?.().cameraMode);
    const camAt = placeCamera(camMode, focus, vw, vh, az);
    this.cam.x = camAt.x;
    this.cam.y = camAt.y;
    world.couchConfine = couchOn && viewOk
      ? couchConfineRect(camAt, vw, vh, COUCH_CFG.camera) : null;

    // The clear IS the void: theme-tinted abyss ink (vis/voidFrame.ts), so
    // whatever the frame exposes past the rim already wears the zone's dark.
    ctx.fillStyle = voidBaseOf(world.zone.theme);
    ctx.fillRect(0, 0, w, h);

    // A LAUNCH in progress asks for its understory: capture the DEPARTURE
    // zone's aerial while it is still live — the swap will hide it behind
    // the veil, and the shelf above will look down on this very ground.
    const trav = world.traversal;
    if (trav?.capture && !this.understory.has(trav.capture.key)) {
      this.understory.capture(world, trav.capture);
    }

    // Per-frame doodad culling: everything the ground/canopy doodad passes
    // draw comes from this view-clipped, kind-grouped set (see cullDoodads).
    this.cullDoodads(world, vw, vh);
    // Gather this frame's light sources (data-declared doodad emissives,
    // projectiles, flashes, exits, the hero's lantern) for the light layer.
    this.lightLayer.collect(world, this.culled, this.cam.x, this.cam.y, vw, vh);

    // THE ROOM VEIL resolves FIRST (state only — its sheet still composites
    // after the world pass): the sight veil mid-pass yields to a wrapped
    // frame, so the two darks never fight over one doorway.
    this.roomVeil.update(world, this.frameDt);

    ctx.save();
    ctx.scale(z, z);
    // Shared SCREEN-SHAKE: jitter the world transform by world.shake (decays in the
    // sim). 0 when nothing sets it → byte-identical when no boss/impact is shaking.
    const sh = world.shake;
    const shx = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;
    const shy = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;
    ctx.translate(-this.cam.x + shx, -this.cam.y + shy);

    this.drawFloor(world);
    this.drawCollapseOverlay(world); // crumbling cloud cells: shiver, crack, let go
    // THE LIVING FLUX (vis/fluxLayer.ts): shifting pads, carrier rafts,
    // conjured clouds, gust streaks — ground, so under doodads and actors.
    if ((world.flux || world.conjured?.live) && !VIS_ABLATE.has('flux')) {
      drawFluxLayer(this.ctx, world, this.cam.x, this.cam.y,
        this.canvas.width / this.zoom, this.canvas.height / this.zoom);
    }
    // THE CREEP (vis/creepLayer.ts): the living membrane — skin laid over
    // the floor, so under doodads and actors; the drawn surface is the same
    // geometry the fabric's grants read.
    if (world.creep && !VIS_ABLATE.has('creep')) {
      drawCreepLayer(this.ctx, world.creep, world.time, this.cam.x, this.cam.y, vw, vh);
    }
    // WALL EYES (vis/wallEyes.ts): seeking pupils over the baked sockets of
    // any eyes-flagged wall region — wall-surface detail, so under doodads.
    if (!VIS_ABLATE.has('doodads')) this.wallEyesPass.draw(this.ctx, world, this.cam.x, this.cam.y, vw, vh);
    // TRACK LANES (vis/trackLayer.ts): grooveless runtime lanes stroke their
    // path here — ground detail, under doodads and riders alike.
    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {
      drawTrackLanes(this.ctx, world, this.cam.x, this.cam.y, vw, vh);
    }
    // THE TIER VEIL (covered exposure) sits UNDER the doodad pass: the
    // under-layer's own furniture (a duct's webs, the smugglers' caches)
    // draws ON TOP of the tunnel floor it stands in.
    this.drawTierVeil(world, vw, vh);
    if (!VIS_ABLATE.has('doodads')) this.drawDoodads(world);
    // TRACK RIDERS: the moving hazards, posed from the shared clock through
    // the one painter registry — over the ground and grooves, under actors.
    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {
      drawTrackRiders(this.ctx, world, this.cam.x, this.cam.y, vw, vh);
    }
    if (!VIS_ABLATE.has('motionfx')) {
      this.updateMotionFx(world);
      this.drawMotionFx();   // wake ripples + snow pocks, over grounds, under actors
    }
    this.drawAirPockets(world);     // underwater: round air-pocket wash + rising bubbles
    this.drawAltars(world);
    this.drawShrines(world);
    this.drawChests(world);
    this.drawFonts(world);
    this.drawWaypoint(world);
    this.drawHuntFootprint(world); // beast tracks to dwell on (the Hunt)
    this.drawAmalgamPicks(world);  // the Bonewright's body-part choice spots
    this.drawCampfireHint(world);  // "linger to refresh" prompt by the town campfire
    this.drawExits(world);
    // THE LIVING FOG, body pass (vis/fogLayer.ts): under actors and combat
    // telegraphs — the terrain mists over, the fight stays readable.
    if (world.fog && !VIS_ABLATE.has('fog')) {
      drawFogLayer(this.ctx, world.fog, 'under', this.cam.x, this.cam.y, vw, vh);
    }
    this.drawZones(world);
    // TRACK WARN ARCS: the approach telegraph — with the un-exploded discs,
    // under actors, sampling the riders' ACTUAL future along their lanes.
    if (world.tracks.length && !VIS_ABLATE.has('tracks')) {
      drawTrackWarnArcs(this.ctx, world, this.cam.x, this.cam.y, vw, vh);
    }
    // TRAPWORK TELLS (vis/trapLayer.ts): hidden triggers resolve close-up
    // for the LOCAL hero — the keen eye at a walk spots the odd flagstone.
    if (world.trapworks.length && !VIS_ABLATE.has('tracks')) {
      drawTrapworkTells(this.ctx, world, world.player.pos.x, world.player.pos.y);
    }
    this.drawDeathBursts(world);   // coalescing spore/orb gather + the tracking volatile orb
    this.drawEncounters(world);    // breach diamonds + their growing fields (under actors)
    this.drawFractures(world);     // fracture object / crawling fissure / chasm maw (under actors)
    this.drawAuras(world);
    this.drawCorpses(world);
    this.drawPlayerCorpses(world);
    this.drawMovementMarkers(world);
    this.drawDrops(world);
    this.drawResourceOrbs(world);
    this.drawRemnants(world);
    for (const f of world.flashes) this.drawFlash(f);
    if (!VIS_ABLATE.has('actors')) {
      // THE LITE TIER (engine/lite.ts): the crowd blits UNDER real bodies —
      // one composited sprite per body, no per-body state churn.
      this.drawLite(world, vw, vh);
      for (const a of world.actors) if (!a.dead && a.worm) this.drawWormTail(a);
      for (const a of world.actors) if (!a.dead) this.drawActor(a, world);
      for (const a of world.actors) if (!a.dead && a.nemesis) this.drawNemesisMark(a);
    }
    this.drawProjectiles(world);
    // THE SIGHT VEIL (vis/sightVeil.ts): positional occlusion — everything
    // the hero's eye cannot reach past a sight-blocking body veils dark with
    // the ground it stands on. OVER actors/projectiles (what a wall hides is
    // hidden whole), UNDER canopies (crowns stay lit). Roofs join through
    // THE HULL LAW: every STANDING roof's rects read solid to the veil (an
    // open doorway must not lance a wedge across a concealed interior), and
    // drawRoofs re-composites the sheet over its own pixels (roofMul) so an
    // occluded structure reads as ONE contiguous dark mass. Composites at
    // identity through the same effective camera as the light layer.
    this.hullRects.length = 0;
    for (const st of world.structures) {
      if (!st.roofs.length) continue;
      if ((this.roofFade.get(st.id) ?? 1) <= VIS_CFG.sightVeil.hullGate) continue;
      for (const r of st.roofs) this.hullRects.push(r);
    }
    // The player's shade dial (Settings.veilDarkness) — read live, so the
    // options slider previews on the battlefield behind the menu.
    this.sightVeil.userMul = this.getSettings?.().veilDarkness ?? 1;
    this.sightVeil.update(world, this.roomVeil.frac(), vw, vh, this.hullRects);
    this.sightVeil.draw(this.ctx, this.cam.x - shx, this.cam.y - shy, z, w, h);
    if (!VIS_ABLATE.has('doodads')) this.drawCanopies(world); // fake-2D depth: crowns above actors, faded near the hero
    if (!VIS_ABLATE.has('doodads')) this.drawCanopyEyes(world); // the roof's regard — gone wherever you're near
    // THE LIVING FOG, tall pass: the lifted share of each bank wraps bodies
    // walking deep inside — over crowns, still under roofs and labels.
    if (world.fog && !VIS_ABLATE.has('fog')) {
      drawFogLayer(this.ctx, world.fog, 'over', this.cam.x, this.cam.y, vw, vh);
    }
    this.drawRoofs(world);         // structure roofs: interiors reveal only when you're inside
    this.drawLabels(world);        // actor text (names/prompts) — above the fades, visibility-gated
    this.drawEliteNameHover(world); // cursor nameplate — same layer, same concealment rule
    this.drawTexts(world);
    if (world.devHitboxes) this.drawHitboxOverlay(world); // dev truth-layer: surfaces + forms as outlines
    this.drawPadReticle(world);    // the pad's visible cursor — LAST, above canopy and roof

    ctx.restore();

    // THE ROOM VEIL: interior confinement — inside a confining structure the
    // world beyond the room is unseen (labels gate through veiledAt; the
    // atmosphere pass damps its weather against frac). Free when outside.
    // (Its update ran before the world pass — the sight veil reads frac().)
    this.roomVeil.draw(ctx, this.cam.x - shx, this.cam.y - shy, z, w, h);

    // THE LIGHT LAYER: day/night darkness punched by every light in view +
    // emissive bloom — world-lit, drawn before the screen-space washes. The
    // world transform was translate(-cam + shake), so the effective camera
    // the lights must project through is cam - shake.
    if (!VIS_ABLATE.has('lights')) {
      this.lightLayer.render(ctx, this.cam.x - shx, this.cam.y - shy, z, w, h);
    }

    this.drawAtmosphere(world);
    this.drawStatusFx();          // status ailment overlays (edge vignettes/frost/stars)
    this.drawLowLifeGlow(world);  // low-life blood vignette + heartbeat + hit surge
    // THE UI-SCALE SUB-PASS: pure screen-space widgets draw in virtual
    // (uiW×uiH) coords under one ctx.scale, so the player's UI Scale dial
    // grows the whole HUD together (ui/uiScale.ts — the DOM surfaces ride
    // the same Settings value). World-projecting passes (attention chevrons,
    // the descent vignette/shaft pip) stay physical, interleaved in their
    // original draw order.
    const us = this.uiScaleLive();
    this.uiW = w / us; this.uiH = h / us;
    this.uiMouse.x = this.hudMouse.x / us; this.uiMouse.y = this.hudMouse.y / us;
    this.uiPass(us, () => {
      this.drawTimeflow(world);     // held-time wash + banner (engine/timeflow.ts hud specs)
      this.drawHud(world);          // orbs + bar + boss bar — last, so it stays readable
      this.drawEncounterHud(world); // breach timer bar (screen-space)
      this.drawFractureHud(world);  // fracture nested-timer bar (screen-space)
      this.drawSceneHud(world);     // scene fabric: drill/assault bar + prompt (screen-space)
    });
    this.drawAttentionPointers(world); // edge chevrons toward off-screen must-finds (world/attention.ts)
    this.drawDescentHud(world);   // the abyss: encroaching-dark vignette + depth/echoes + shaft pip
    this.uiPass(us, () => {
      this.drawParty(world);        // co-op party strip (screen-space, top; ≤1 = nothing)
    });
    this.drawTraversalFx(world);  // a vertical crossing's wind streaks + whiteout veil (covers the HUD)
    this.drawModeFade(world);     // a survived death's crossing — DEAD LAST (covers the HUD too)
  }

  /** D2-style hover nameplate: the DISTINCTLY-NAMED foe nearest the cursor
   *  (one at a time — no label storms) shows its minted name over a tier/genus
   *  subtitle ("Goresnap the Bilious" / "Rare Goblin"). Nemeses are skipped —
   *  they wear their own permanent mark. Drawn on the post-fade layer so a
   *  crown never covers the plate of a foe you can see — and CONCEALED foes
   *  never bid at all: the cursor must not become a canopy probe. */
  private drawEliteNameHover(world: World): void {
    // "The cursor" is wherever aim truly lives: the pad's reticle when the
    // pad owns it, else the mouse — nameplates follow the same point skills do.
    const cur = this.padAim ?? this.toWorld(this.hudMouse);
    let best: Actor | null = null;
    let bestReveal = 0;
    let bd = 80;
    for (const a of world.actors) {
      if (a.dead || a.team !== 'enemy' || a.nemesis || !a.defId) continue;
      const def = MONSTERS[a.defId];
      if (!def || a.name === def.name) continue;
      const label = a.rarity ? RARITY_DEFS[a.rarity].label : '';
      if (label && a.name === `${label} ${def.name}`) continue; // tier-prefixed, not minted
      const d = Math.hypot(a.pos.x - cur.x, a.pos.y - cur.y) - a.radius;
      if (d >= bd) continue;
      const reveal = this.labelRevealAt(world, a.pos); // hidden foes don't bid
      if (reveal <= 0.02) continue;
      bd = d; best = a; bestReveal = reveal;
    }
    if (!best) return;
    const { ctx } = this;
    const def = MONSTERS[best.defId!];
    const tint = (best.rarity ? RARITY_DEFS[best.rarity].ring : '') || '#e8dcc8';
    const sub = best.rarity && RARITY_DEFS[best.rarity].label
      ? `${RARITY_DEFS[best.rarity].label} ${def.name}` : def.name;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.globalAlpha = bestReveal;
    ctx.fillStyle = tint;
    ctx.font = 'bold 12px Verdana';
    ctx.fillText(best.name, best.pos.x, best.pos.y - best.radius - 20);
    ctx.globalAlpha = 0.75 * bestReveal;
    ctx.font = '10px Verdana';
    ctx.fillText(sub, best.pos.x, best.pos.y - best.radius - 8);
    ctx.restore();
  }

  /** The pad's VISIBLE cursor: the assisted aim reticle, plus soft-lock
   *  brackets hugging the magnetized target (core/cursor.ts paints both, in
   *  the player's chosen cursor tint — one identity for mouse and pad).
   *  Drawn as the last world-space pass so canopy/roof fades never swallow
   *  the player's aim. */
  private drawPadReticle(world: World): void {
    // Couch guests' reticles first (each in its seat's own tint), then the
    // hero's — the hero's aim stays the top-most read, exactly as solo.
    for (const ga of this.couchAims) {
      const gheld = ga.lockId !== null ? world.actorById(ga.lockId) : undefined;
      const glock = gheld && !gheld.dead
        ? { x: gheld.pos.x, y: gheld.pos.y, r: gheld.radius } : undefined;
      drawAimReticle(this.ctx, ga.x, ga.y, ga.color, world.time, glock);
    }
    const pa = this.padAim;
    if (!pa) return;
    const held = pa.lockId !== null ? world.actorById(pa.lockId) : undefined;
    const lock = held && !held.dead
      ? { x: held.pos.x, y: held.pos.y, r: held.radius } : undefined;
    const color = this.getSettings?.().cursor.color ?? DEFAULT_CURSOR_OPTIONS.color;
    drawAimReticle(this.ctx, pa.x, pa.y, color, world.time, lock);
  }

  /** A MANIFESTED NEMESIS (meta/nemesis.ts) wears its memory openly: a dashed
   *  ring in its rank tint and its minted name + title overhead — a remembered
   *  foe must read as one at a glance. The ring rides the body (and hides
   *  with it under a crown); the NAME goes through the label pass, so it
   *  stays readable over foliage yet leaks nothing while the foe is hidden. */
  private drawNemesisMark(a: Actor): void {
    const { ctx } = this;
    const tint = a.nemesis!.tint;
    ctx.save();
    ctx.strokeStyle = tint;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.arc(a.pos.x, a.pos.y, a.radius + 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    this.queueLabel(a, `☠ ${a.name}`, tint, 16, { font: 'bold 12px Verdana', stroke: false });
  }

  /** CHARACTER-MODE fade (a survived death, meta/modes.ts): the whole screen —
   *  world and HUD alike — sinks to black, holds a beat, and returns as the
   *  character wakes in town. While the dark is near-full, the mode's crossing
   *  line hangs centered in it. */
  private drawModeFade(world: World): void {
    if (world.screenFade <= 0) return;
    const { ctx, canvas } = this;
    ctx.save();
    ctx.globalAlpha = clamp(world.screenFade, 0, 1);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const line = world.modeDef().crossingText;
    if (line && world.screenFade > 0.85) {
      ctx.globalAlpha = clamp((world.screenFade - 0.85) / 0.15, 0, 1) * 0.9;
      ctx.fillStyle = '#b8a0e0';
      ctx.font = '20px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText(line, canvas.width / 2, canvas.height / 2);
    }
    ctx.restore();
  }

  /** THE DESCENT readout (screen-space): the encroaching-darkness vignette around the
   *  player (clear radius shrinks as Light depletes), the Depth + Echoes line, and a
   *  chevron pointing back to the climb-out shaft when it's off-screen in the dark. */
  private drawDescentHud(world: World): void {
    const dv = world.descentView();
    if (!dv) return;
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    const px = (world.player.pos.x - this.cam.x) * this.zoom;
    const py = (world.player.pos.y - this.cam.y) * this.zoom;
    const maxR = Math.hypot(w, h) * 0.62;
    const clear = Math.max(60, (0.14 + 0.5 * dv.lightFrac) * Math.min(w, h));
    const g = ctx.createRadialGradient(px, py, clear * 0.5, px, py, maxR);
    g.addColorStop(0, 'rgba(2,2,6,0)');
    g.addColorStop(0.55, `rgba(2,2,6,${(0.5 + 0.42 * (1 - dv.lightFrac)).toFixed(3)})`);
    g.addColorStop(1, 'rgba(2,2,6,1)');
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Verdana';
    ctx.fillStyle = '#7fe0d8';
    ctx.fillText(`Depth ${dv.depth}   ·   ◈ ${dv.echoes} Echoes`, w / 2, 30);
    ctx.restore();
    const sx = (dv.shaft.x - this.cam.x) * this.zoom, sy = (dv.shaft.y - this.cam.y) * this.zoom;
    if (sx < 0 || sy < 0 || sx > w || sy > h) {
      const ang = Math.atan2(sy - h / 2, sx - w / 2);
      const ex = w / 2 + Math.cos(ang) * Math.min(w, h) * 0.4;
      const ey = h / 2 + Math.sin(ang) * Math.min(w, h) * 0.4;
      ctx.save();
      ctx.translate(ex, ey); ctx.rotate(ang);
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#7fe0d8';
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.textAlign = 'center'; ctx.font = '10px Verdana'; ctx.fillStyle = '#7fe0d8';
      ctx.globalAlpha = 0.85; ctx.fillText('shaft', ex, ey + 20); ctx.restore();
    }
  }

  /** Co-op party strip — a compact top-of-screen row of class-colored nameplates,
   *  each over a mini health bar, OUT of the main HUD to keep clutter minimal.
   *  ≤1 member draws NOTHING, so single-player is pixel-identical. Downed/dead
   *  members grey out, so the strip doubles as the alive/downed readout. Future
   *  mercenaries/minions extend as sub-rows keyed on owner — no layout change. */
  private drawParty(world: World): void {
    const strip = world.party.strip;
    if (strip.length <= 1) return;
    const { ctx } = this;
    const w = this.uiW; // virtual — this pass runs inside the UI-scale sub-pass
    const pillW = 150, gap = 10, barW = 140, barH = 7;
    const total = strip.length * pillW + (strip.length - 1) * gap;
    let x = (w - total) / 2;
    ctx.save();
    ctx.textAlign = 'center';
    for (const a of strip) {
      const down = a.downed || a.dead;
      const cx = x + pillW / 2;
      ctx.font = 'bold 12px Verdana';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.strokeText(a.name, cx, 16);
      ctx.fillStyle = down ? '#6a6a6a' : a.color;
      ctx.fillText(a.name, cx, 16);
      const bx = cx - barW / 2, by = 21;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, barW, barH);
      const frac = clamp(a.life / Math.max(1, a.maxLife()), 0, 1);
      ctx.fillStyle = down ? '#553030' : a.color;
      ctx.fillRect(bx, by, barW * frac, barH);
      ctx.strokeStyle = '#3a3a52'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, barW, barH);
      x += pillW + gap;
    }
    ctx.restore();
  }

  /** Breach diamonds (dormant) and their growing fields (open), in WORLD space. */
  /** The Bonewright's body-part choices — glyph discs ringing it, each filling as
   *  you dwell on it (the build-your-boss selection). */
  private drawAmalgamPicks(world: World): void {
    const picks = world.amalgamPickView();
    if (!picks.length) return;
    const { ctx } = this;
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 3);
    ctx.save();
    ctx.textAlign = 'center';
    for (const p of picks) {
      // Selection ring (fills as you dwell).
      ctx.globalAlpha = 0.4 + 0.3 * pulse;
      ctx.strokeStyle = '#9ad0b0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      this.drawProgressRing(p.pos.x, p.pos.y, p.frac, 'choice_pick');
      // Glyph disc.
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#13241c';
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#9ad0b0';
      ctx.font = 'bold 16px Verdana';
      ctx.fillText(p.glyph, p.pos.x, p.pos.y + 6);
      // Label.
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#cfe8d8';
      ctx.font = '10px Verdana';
      ctx.fillText(p.label, p.pos.x, p.pos.y - 26);
    }
    ctx.restore();
  }

  /** Underwater AIR POCKETS — a clean round wash over the chunky walkable grid cells,
   *  with rising bubbles inside (the "you can breathe here" indicator). Deterministic
   *  per-pocket phase (no per-frame RNG), faded so they read as gentle ambient bubbles. */
  private drawAirPockets(world: World): void {
    if (!world.airPockets.length) return;
    const { ctx } = this;
    const t = world.time;
    for (const p of world.airPockets) {
      ctx.save();
      // Round wash (a breath of surface light) over the grid cells.
      const g = ctx.createRadialGradient(p.x, p.y, p.r * 0.2, p.x, p.y, p.r);
      g.addColorStop(0, 'rgba(159,224,240,0.16)');
      g.addColorStop(1, 'rgba(42,106,138,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.3; ctx.strokeStyle = '#7fd0e8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke();
      // Rising bubbles — deterministic per (pocket, index), sine-fading as they rise.
      ctx.fillStyle = '#cfeefa';
      const rise = p.r * 1.7, n = 3 + Math.floor(p.r / 40);
      for (let i = 0; i < n; i++) {
        const seed = (p.x * 7 + p.y * 13 + i * 97) >>> 0;
        const bx = p.x + (((seed % 100) / 100) - 0.5) * p.r * 1.2;
        const phase = ((t * (16 + (seed % 28)) + (seed % rise)) % rise);
        const by = p.y + p.r * 0.85 - phase;
        ctx.globalAlpha = 0.55 * (1 - phase / rise);
        ctx.beginPath(); ctx.arc(bx, by, 2 + (seed % 3), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
  }

  /** The Hunt's beast tracks — a cluster of glowing paw prints to dwell on. */
  private drawHuntFootprint(world: World): void {
    const fp = world.huntFootprintView();
    if (!fp) return;
    const { ctx } = this;
    const pulse = 0.6 + 0.4 * Math.sin(world.time * 3);
    ctx.save();
    ctx.fillStyle = '#d8a83a';
    for (const [ox, oy] of [[-11, 7], [9, -3], [-2, -15], [15, 11]] as const) {
      ctx.globalAlpha = 0.5 + 0.3 * pulse;
      ctx.beginPath();
      ctx.ellipse(fp.pos.x + ox, fp.pos.y + oy, 5, 7.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      for (const a of [-0.7, 0, 0.7]) {
        ctx.beginPath();
        ctx.arc(fp.pos.x + ox + Math.cos(a - 1.0) * 8, fp.pos.y + oy + Math.sin(a - 1.0) * 8, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 0.35 * pulse;
    ctx.strokeStyle = '#d8a83a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(fp.pos.x, fp.pos.y, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#e8c87a';
    ctx.font = '11px Verdana';
    ctx.textAlign = 'center';
    ctx.fillText('beast tracks — dwell to follow', fp.pos.x, fp.pos.y - 32);
    ctx.restore();
  }

  private drawEncounters(world: World): void {
    const { ctx } = this;
    const EF = VIS_CFG.encounterField;
    const t = world.time;
    for (const e of world.encountersView()) {
      // The rolled court lord owns the field's tint (its banner IS the tell —
      // you learn which power waits before its first minion lands a blow);
      // an uncourted field keeps its def color.
      const lord = e.lordId ? courtLord(e.lordId) : undefined;
      const col = lord?.color ?? e.def.trigger.color;
      if (e.phase === 'dormant') {
        const pulse = 1 + 0.15 * Math.sin(t * 4);
        const s = 13 * pulse;
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.def.trigger.activateRadius, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = e.def.trigger.color; ctx.globalAlpha = 0.9; ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.globalAlpha = 1; ctx.strokeStyle = '#f0d8ff'; ctx.lineWidth = 1.5;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else if (e.phase === 'open' || e.phase === 'collapsing') {
        const collapsing = e.phase === 'collapsing';
        const from = e.veil?.collapseFrom ?? e.scale.maxRadius;
        const closed = collapsing && from > 0 ? 1 - e.radius / from : 0;
        // Interior wash — deepens as a collapse comes home (the veil taking
        // its light back with it).
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.10 + (collapsing ? EF.collapseWashAlpha * closed : 0);
        ctx.fill();
        // The rim: a soft glow stroke under a crisp edge (white-hot on the
        // way home).
        ctx.globalAlpha = EF.glowAlpha; ctx.strokeStyle = col; ctx.lineWidth = EF.glowWidth;
        ctx.stroke();
        ctx.globalAlpha = collapsing ? 0.95 : 0.85;
        ctx.strokeStyle = collapsing ? '#f2e8ff' : col;
        ctx.lineWidth = 3;
        ctx.stroke();
        // The promised extent (open only) — a dashed ghost of the full tear.
        if (!collapsing) {
          ctx.globalAlpha = 0.12; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.setLineDash([6, 8]);
          ctx.beginPath();
          ctx.arc(e.pos.x, e.pos.y, e.scale.maxRadius, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
        // RIM CRACKLE — short radial ticks flickering along the edge, the
        // reality seam arguing with itself. Deterministic per-index hash;
        // zero allocation.
        if (e.radius > 24) {
          const circ = Math.PI * 2 * e.radius;
          const nTick = Math.min(EF.crackleMax, Math.max(4, Math.round(circ / EF.crackleSpacing)));
          ctx.strokeStyle = collapsing ? '#f2e8ff' : col; ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let k = 0; k < nTick; k++) {
            const a = k * 2.399963 + t * 0.15; // golden-angle spread, slow drift
            const flick = 0.5 + 0.5 * Math.sin(t * 7 + k * 2.3);
            if (flick < 0.35) continue;
            const r0 = e.radius - EF.crackleLen * 0.5, r1 = e.radius + EF.crackleLen * (0.5 + 0.5 * flick);
            ctx.moveTo(e.pos.x + Math.cos(a) * r0, e.pos.y + Math.sin(a) * r0);
            ctx.lineTo(e.pos.x + Math.cos(a) * r1, e.pos.y + Math.sin(a) * r1);
          }
          ctx.globalAlpha = 0.55; ctx.stroke();
          // EDGE MOTES — embers of the far shore riding the rim (they run
          // for the center when the collapse turns).
          const nMote = Math.min(EF.edgeMoteMax, Math.max(6, Math.round(circ / EF.edgeMoteSpacing)));
          const hz = 0.4 * (collapsing ? EF.collapseMoteHzMul : 1);
          ctx.fillStyle = col;
          for (let k = 0; k < nMote; k++) {
            const a = t * hz * (k % 2 ? 1 : -1) + (k / nMote) * Math.PI * 2;
            ctx.globalAlpha = 0.3 + 0.4 * Math.sin(t * 2.6 + k * 1.7) ** 2;
            ctx.beginPath();
            ctx.arc(e.pos.x + Math.cos(a) * e.radius, e.pos.y + Math.sin(a) * e.radius,
              EF.edgeMoteSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // THE VEILED SHORE (def.veil, open only): knots the rim has not yet
        // reached shimmer faintly just beyond it — the parallel shore
        // glimpsed, not mapped. Nearest read clearest; the band fades out.
        if (!collapsing && e.veil) {
          const run = e.veil;
          ctx.fillStyle = col; ctx.strokeStyle = col;
          for (let i = run.cursor; i < run.knots.length; i++) {
            const k = run.knots[i];
            if (k.d > e.radius + EF.previewBand) break; // sorted — the rest are farther
            const fade = 1 - (k.d - e.radius) / EF.previewBand;
            const flick = 0.4 + 0.6 * Math.sin(t * 3.1 + i * 2.4) ** 2;
            ctx.globalAlpha = EF.shimmerAlpha * Math.max(0, fade) * flick;
            const s = EF.shimmerSize * (0.8 + 0.4 * flick);
            ctx.save();
            ctx.translate(k.pos.x, k.pos.y);
            ctx.rotate(Math.PI / 4 + t * 0.5 + i);
            ctx.strokeRect(-s, -s, s * 2, s * 2);
            ctx.restore();
          }
        }
        ctx.globalAlpha = 1;
        // The diamond keeps standing at the heart of the field.
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = e.def.trigger.color; ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      }
    }
    // REALM GATES — the demon rift, crusade sanctum, necropolis way, fracture
    // tear and standing COURT DOORS all draw through ONE pass; each gate's
    // whole look (halo, rims, churn, rays, motes, glyph, prompt) is its
    // kind's data row in data/gateVisuals.ts, '@event' slots tinting with the
    // event's own color and per-instance prompts (the lord's own call) riding
    // the view row.
    for (const g of world.realmGatesView()) this.drawRealmGate(g, world.time);
  }

  /** THE gate painter — every realm gate draws from its GateLook row. A view
   *  row may carry its own `prompt` (a court door speaking its lord's line);
   *  the look's prompt is the kind-wide fallback. */
  private drawRealmGate(g: { pos: Vec2; kind: string; color?: string; prompt?: string }, time: number): void {
    const look = gateLookOf(g.kind);
    const col = (c: string): string => c === EVENT_COLOR ? (g.color ?? '#c8c8e8') : c;
    const { ctx } = this;
    const pulse = 1 + look.pulseAmp * Math.sin(time * look.pulseHz);
    const r = look.radius * pulse;
    ctx.save();
    ctx.translate(g.pos.x, g.pos.y);
    // The halo: a soft breathing glow pooled under the mouth.
    if (look.halo) {
      const grad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, look.halo.radius);
      grad.addColorStop(0, col(look.rim));
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = look.halo.alpha * (0.8 + 0.2 * pulse);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, look.halo.radius, 0, Math.PI * 2); ctx.fill();
    }
    if (look.spin) ctx.rotate(time * look.spin);
    // The mouth: dark core + twin rims (the inner counter-pulses — a breathing throat).
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = look.core; ctx.globalAlpha = 0.66; ctx.fill();
    ctx.globalAlpha = 0.92; ctx.lineWidth = 3; ctx.strokeStyle = col(look.rim); ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
    ctx.setLineDash([7, 9]); ctx.lineDashOffset = -time * 26; // the slow churn orbit
    ctx.beginPath(); ctx.arc(0, 0, r + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    ctx.beginPath(); ctx.arc(0, 0, look.radius * 0.58 * (2 - pulse), 0, Math.PI * 2);
    ctx.strokeStyle = col(look.inner); ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke();
    // Tear rays: jagged spokes — a wound in the world, not a doorway.
    if (look.rays) {
      ctx.globalAlpha = 0.85; ctx.lineWidth = 2; ctx.strokeStyle = col(look.inner);
      ctx.beginPath();
      for (let k = 0; k < look.rays.count; k++) {
        const a = (k / look.rays.count) * Math.PI * 2;
        const rr = (look.rays.r1 + (k % 2) * look.rays.alt) * pulse;
        ctx.moveTo(Math.cos(a) * look.rays.r0, Math.sin(a) * look.rays.r0);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
    }
    ctx.restore();
    // Motes orbit UPRIGHT (outside the spin), embers circling the threshold.
    if (look.motes) {
      ctx.fillStyle = col(look.inner);
      for (let k = 0; k < look.motes.count; k++) {
        const a = time * look.motes.hz + (k / look.motes.count) * Math.PI * 2;
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(time * 2.2 + k * 1.9);
        ctx.beginPath();
        ctx.arc(g.pos.x + Math.cos(a) * look.motes.orbit, g.pos.y + Math.sin(a) * look.motes.orbit * 0.8,
          look.motes.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Glyph + prompt stay upright and legible whatever the gate does.
    if (look.glyph) {
      ctx.globalAlpha = 1; ctx.fillStyle = look.glyphColor ?? col(look.inner);
      ctx.font = `${look.glyphSize ?? 18}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(look.glyph, g.pos.x, g.pos.y);
      ctx.textBaseline = 'alphabetic';
    }
    const prompt = g.prompt ?? look.prompt;
    if (prompt) {
      ctx.globalAlpha = 0.9; ctx.font = 'bold 11px Verdana'; ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3;
      ctx.strokeText(prompt, g.pos.x, g.pos.y - look.radius - 13);
      ctx.fillStyle = col(look.promptColor ?? look.inner);
      ctx.fillText(prompt, g.pos.x, g.pos.y - look.radius - 13);
      ctx.globalAlpha = 1;
    }
  }

  /** THE dwell progress ring — every linger-to-act draw goes through here. The
   *  style (radius/width/color/alpha) is the transit KIND's data row
   *  (data/transit.ts); a missing color tints with the zone `accent`. */
  private drawProgressRing(x: number, y: number, frac: number, kind: string, accent = '#e8e8e8'): void {
    if (frac <= 0.02) return;
    const s = transitRing(kind);
    const { ctx } = this;
    ctx.globalAlpha = s.alpha ?? 0.95;
    ctx.strokeStyle = s.color ?? accent;
    ctx.lineWidth = s.width ?? 4;
    ctx.beginPath();
    ctx.arc(x, y, s.radius, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** The breach timer bar (the kill-fed countdown), screen-space near the top.
   *  A COLLAPSING veil keeps the bar and drains it with the ring instead —
   *  the last act stays legible to the second. */
  private drawEncounterHud(world: World): void {
    const open = world.encountersView().find(e => e.phase === 'open' || e.phase === 'collapsing');
    if (!open) return;
    const { ctx } = this;
    const w = this.uiW; // virtual — this pass runs inside the UI-scale sub-pass
    // Sits under the boss bar; both slide down when the co-op party strip shows.
    const oy = world.party.strip.length > 1 ? 20 : 0;
    const bw = 320, bh = 14, bx = w / 2 - bw / 2, by = 74 + oy;
    const collapsing = open.phase === 'collapsing';
    const from = open.veil?.collapseFrom ?? 0;
    const frac = collapsing
      ? (from > 0 ? clamp(open.radius / from, 0, 1) : 0)
      : clamp(open.timer / open.maxTimer, 0, 1);
    const lord = open.lordId ? courtLord(open.lordId) : undefined;
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Verdana';
    ctx.fillStyle = lord?.color ?? open.def.trigger.color;
    // A staged encounter re-titles its bar (the borough's muster → assault);
    // plain encounters keep speaking their scale.
    ctx.fillText(open.hudLabel ?? open.scale.label, w / 2, by - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, bh);
    // Drains warm → red as time runs out.
    const r = Math.round(150 + (1 - frac) * 90), g = Math.round(70 + frac * 110);
    ctx.fillStyle = `rgb(${r},${g},210)`;
    ctx.fillRect(bx, by, bw * frac, bh);
    ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
  }

  /** THE SCENE FABRIC's HUD channel (engine/scenes.ts): a labeled top bar
   *  (the drill's fill, the assault's climbing clock) + a prompt line whose
   *  '{bind:…}' tokens resolve against the LIVE binds — the tutorial can
   *  never name a key the player rebound away. Same seat as the encounter
   *  bar (a scene and an encounter never share ground). */
  private drawSceneHud(world: World): void {
    const sc = world.scene;
    if (!sc || (!sc.bar && !sc.prompt)) return;
    const { ctx } = this;
    const w = this.uiW;
    const oy = world.party.strip.length > 1 ? 20 : 0;
    const bw = 320, bh = 14, bx = w / 2 - bw / 2, by = 74 + oy;
    ctx.textAlign = 'center';
    if (sc.bar) {
      ctx.font = 'bold 13px Verdana';
      ctx.fillStyle = '#e8d8a8';
      ctx.fillText(sc.bar.label, w / 2, by - 6);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = '#c8a852';
      ctx.fillRect(bx, by, bw * clamp(sc.bar.frac, 0, 1), bh);
      ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
    }
    if (sc.prompt) {
      ctx.font = '13px Verdana';
      ctx.fillStyle = '#e8e0c8';
      ctx.fillText(this.resolveText(sc.prompt), w / 2, by + (sc.bar ? bh + 16 : 0));
    }
  }

  /** FRACTURES — the volatile object (dormant), the crawling fissure crack + head,
   *  and the chasm maw + spawn-field, all faction-colored, drawn UNDER actors. */
  private drawFractures(world: World): void {
    const run = world.fractureView();
    if (!run || run.phase === 'done') return;
    const { ctx } = this;
    const col = run.color;
    const t = world.time;

    if (run.phase === 'dormant') {
      const pulse = 1 + 0.18 * Math.sin(t * 5);
      ctx.save();
      ctx.translate(run.origin.x, run.origin.y);
      ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 5);
      ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 2.5; ctx.strokeStyle = col;
      ctx.beginPath();
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        const r2 = (10 + (k % 2) * 5) * pulse;
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#140a22';
      ctx.beginPath(); ctx.arc(0, 0, 5 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 0.85; ctx.fillStyle = col; ctx.font = '11px Verdana'; ctx.textAlign = 'center';
      ctx.fillText('a fracture — run over it to crack it open', run.origin.x, run.origin.y - 32);
      ctx.globalAlpha = 1;
      return;
    }

    // The laid crack trail (fissure + chasm phases): glow underlay, bright core, dark seam.
    if (run.crack.length >= 2) {
      const trace = (): void => {
        ctx.beginPath();
        ctx.moveTo(run.crack[0].x, run.crack[0].y);
        for (let k = 1; k < run.crack.length; k++) ctx.lineTo(run.crack[k].x, run.crack[k].y);
      };
      ctx.save();
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.globalAlpha = 0.22; ctx.strokeStyle = col; ctx.lineWidth = 9; trace(); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeStyle = col; trace(); ctx.stroke();
      ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.strokeStyle = '#140a22'; trace(); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    if (run.phase === 'fissure') {
      const pulse = 0.6 + 0.4 * Math.sin(t * 6);
      const chase = world.sim.fractureField?.surge().chaseRadius ?? 150;
      ctx.save();
      ctx.globalAlpha = 0.12; ctx.strokeStyle = col; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(run.head.x, run.head.y, chase, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.4 + 0.3 * pulse; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(run.head.x, run.head.y, 9 + 3 * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(run.head.x, run.head.y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.85; ctx.fillStyle = col; ctx.font = '11px Verdana'; ctx.textAlign = 'center';
      ctx.fillText('chase the fissure', run.head.x, run.head.y - 18);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else if (run.phase === 'chasm' && run.chasm) {
      const fieldR = world.sim.fractureField?.surge().chasm.radius ?? 130;
      const pulse = 1 + 0.1 * Math.sin(t * 4);
      ctx.save();
      ctx.globalAlpha = 0.08; ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(run.chasm.x, run.chasm.y, fieldR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(run.chasm.x, run.chasm.y, fieldR, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 4; ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(run.chasm.x, run.chasm.y, 34 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.8; ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(run.chasm.x, run.chasm.y, 22 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /** The fracture nested-timer bar (screen-space) — held while you chase the
   *  fissure, draining while it's loose or a chasm is open. */
  private drawFractureHud(world: World): void {
    const run = world.fractureView();
    if (!run || (run.phase !== 'fissure' && run.phase !== 'chasm')) return;
    const { ctx } = this;
    const w = this.uiW; // virtual — this pass runs inside the UI-scale sub-pass
    const oy = world.party.strip.length > 1 ? 20 : 0;
    const bw = 320, bh = 14, bx = w / 2 - bw / 2, by = 96 + oy;
    const frac = run.maxTimer > 0 ? clamp(run.timer / run.maxTimer, 0, 1) : 0;
    const chasing = run.phase === 'fissure' && !world.player.dead && !world.player.downed
      && dist(world.player.pos, run.head) <= (world.sim.fractureField?.surge().chaseRadius ?? 150) + world.player.radius;
    // Freshly surfaced after a divert: the arrival grace holds the clock while
    // the player crosses the zone — the bar reads "held", not "you're losing".
    const surfaced = run.phase === 'fissure' && !chasing && run.grace > 0;
    const label = run.phase === 'chasm'
      ? `Chasm ${run.chasmsSealed + 1}/${run.chasmsTarget} — clear it!`
      : chasing ? 'Fissure — chasing (timer held)'
        : surfaced ? 'Fracture surfaced — run it down! (timer held)' : 'Fissure — closing!';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Verdana';
    ctx.fillStyle = run.color;
    ctx.fillText(label, w / 2, by - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, bh);
    // Held (chasing / surfaced grace) = steady faction violet; draining = warm → red.
    if (chasing || surfaced) {
      ctx.fillStyle = run.color;
    } else {
      const r = Math.round(150 + (1 - frac) * 90), g = Math.round(70 + frac * 110);
      ctx.fillStyle = `rgb(${r},${g},210)`;
    }
    ctx.fillRect(bx, by, bw * frac, bh);
    ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
  }

  /** ATTENTION POINTERS (world/attention.ts): a screen-edge chevron + glyph disc
   *  toward every registered must-find point that is currently OFF-screen — the
   *  in-zone counterpart of the world-map markers. On-screen targets draw nothing
   *  (their own world visuals carry it). Generic pass: features join by
   *  registerAttentionSource, never by editing this. */
  private drawAttentionPointers(world: World): void {
    const pts = collectAttention(world);
    if (!pts.length) return;
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    const m = ATTENTION_CFG.margin, slack = ATTENTION_CFG.onScreenSlack;
    const t = world.time;
    for (const p of pts) {
      const s = this.toScreen(p.pos);
      if (s.x >= -slack && s.x <= w + slack && s.y >= -slack && s.y <= h + slack) continue; // visible — the world owns it
      const cx = clamp(s.x, m, w - m), cy = clamp(s.y, m, h - m);
      const ang = Math.atan2(s.y - cy, s.x - cx);
      const pulse = 0.72 + 0.28 * Math.sin(t * 5);
      ctx.save();
      ctx.translate(cx, cy);
      // The chevron: a small wedge just past the disc, aimed along the true bearing.
      ctx.rotate(ang);
      ctx.globalAlpha = 0.92 * pulse;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(24, 0); ctx.lineTo(13, -8); ctx.lineTo(13, 8); ctx.closePath();
      ctx.fill();
      ctx.rotate(-ang);
      // The disc + glyph (matches the event's map-marker identity).
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = 'rgba(10,10,14,0.8)';
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = '12px Verdana'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = p.color;
      ctx.fillText(p.glyph, 0, 1);
      // The label, on the screen-centre side of the disc (never off the edge).
      if (p.label) {
        ctx.font = '10px Verdana'; ctx.textBaseline = 'alphabetic';
        ctx.textAlign = cx < 110 ? 'left' : cx > w - 110 ? 'right' : 'center';
        ctx.globalAlpha = 0.85;
        ctx.fillText(p.label, 0, cy < h / 2 ? 30 : -22);
      }
      ctx.restore();
    }
  }

  /** Status-ailment screen overlays — EDGE-hugging so the centered HUD stays
   *  clear. Combat ailments only (see screenFx.STATUS_FX_REGISTRY). Every
   *  wash draws through the baked edge-overlay fabric (vis/overlays.ts):
   *  the pulse rides globalAlpha over a cached sprite, so a fight full of
   *  ailments costs blits, not per-frame gradient rasters. */
  private drawStatusFx(): void {
    const fx = this.frameFx; // gathered once at the top of render()
    if (fx.length === 0) return;
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height, t = performance.now() / 1000;
    // Blend all DoT-style ailments into one pulsing colour vignette.
    const vig = fx.filter(f => f.def.kind === 'vignette');
    if (vig.length) {
      let r = 0, g = 0, b = 0, wsum = 0, peak = 0;
      for (const f of vig) {
        const [cr, cg, cb] = hexToRgb(f.color);
        const k = f.def.intensity ?? 0.6;
        r += cr * k; g += cg * k; b += cb * k; wsum += k; peak = Math.max(peak, k);
      }
      // Quantized blend channels key the bake; a multi-ailment palette
      // shift walks a handful of LRU entries, never one per frame.
      const qr = qChan(r / wsum), qg = qChan(g / wsum), qb = qChan(b / wsum);
      const a = peak * (0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 3)));
      drawEdgeOverlay(ctx, w, h, {
        key: `sfxvig|${qr},${qg},${qb}`, innerFrac: 0.34,
        stops: [[0, `rgba(${qr},${qg},${qb},0)`], [1, `rgba(${qr},${qg},${qb},1)`]],
      }, a);
    }
    if (fx.some(f => f.def.kind === 'frost')) this.drawFrost(w, h, t);
    if (fx.some(f => f.def.kind === 'stars')) this.drawStunStars(w, h, t);
    if (fx.some(f => f.def.kind === 'spin')) this.drawSpin(w, h, t);
    const pall = fx.filter(f => f.def.kind === 'pall');
    if (pall.length) this.drawPall(w, h, Math.min(1, Math.max(...pall.map(f => (f.def.intensity ?? 1) * f.k))));
    const dark = fx.filter(f => f.def.kind === 'darken');
    if (dark.length) this.drawDarken(w, h, Math.min(1, Math.max(...dark.map(f => (f.def.intensity ?? 1) * f.k))));
  }

  /** THE PALL (faintness/swoon — the vasovagal read): the world DESATURATES
   *  (the understory 'saturation'-composite recipe, applied to the frame) and
   *  a pale wash creeps in from the edges. Deliberately beatless: the
   *  low-life vignette owns the heartbeat; a faint is stillness. Levers in
   *  VIS_CFG.statusFx. */
  private drawPall(w: number, h: number, k: number): void {
    const { ctx } = this;
    const C = VIS_CFG.statusFx;
    // The DESATURATE half is a non-separable blend — a per-frame software
    // fallback on some engines (the canvasCaps probe measures, never
    // sniffs). Where it's slow, the baked wash below carries the read alone;
    // VIS_CFG.statusFx.desatMode pins the answer either way.
    const desatOn = C.desatMode === 'on'
      || (C.desatMode === 'auto' && canvasCap('blendSaturation', w * h));
    if (desatOn) {
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = `rgba(128,128,128,${(C.pallDesat * k).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    const kq = qFrac(k);
    drawEdgeOverlay(ctx, w, h, {
      key: `pall|${C.pallWash}|${kq}`, innerFrac: 0.42 - 0.18 * kq,
      stops: [[0, withAlpha(C.pallWash, 0)], [1, withAlpha(C.pallWash, 1)]],
    }, C.pallAlpha * k);
  }

  /** THE DARKEN (blind): the room closes in — a near-black iris tightening
   *  toward the center. What's left of the screen is what's left of you. */
  private drawDarken(w: number, h: number, k: number): void {
    const { ctx } = this;
    const C = VIS_CFG.statusFx;
    const kq = qFrac(k);
    drawEdgeOverlay(ctx, w, h, {
      key: `darken|${kq}`, innerFrac: 0.5 - 0.3 * kq,
      outerFrac: 2 * (0.62 - 0.1 * kq),
      stops: [[0, 'rgba(6,4,10,0)'], [1, 'rgba(6,4,10,1)']],
    }, C.darkenFloor * k);
  }

  /** Icy edge wash + drifting snowflakes (chill / frozen). */
  private drawFrost(w: number, h: number, t: number): void {
    const { ctx } = this;
    drawEdgeOverlay(ctx, w, h, {
      key: 'frost', innerFrac: 0.3,
      stops: [[0, 'rgba(150,220,255,0)'], [1, 'rgba(150,220,255,1)']],
    }, 0.22);
    ctx.textAlign = 'center';
    ctx.font = '16px Verdana';
    ctx.fillStyle = 'rgba(230,248,255,0.85)';
    for (let i = 0; i < 7; i++) {
      const sx = ((i * 137 + Math.sin(t * 0.4 + i) * 60) % w + w) % w;
      const sy = (((t * 40 + i * 90) % (h + 40)) + (h + 40)) % (h + 40) - 20;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 2 + i);
      ctx.fillText('❄', sx, sy);
    }
    ctx.globalAlpha = 1;
    ctx.font = '12px Verdana';
  }

  /** WIDDERSHINS chevrons (the confusion family's spin): a ring of small
   *  arrows orbiting COUNTERCLOCKWISE at the screen's rim — the turn
   *  itself is the message. Kept sparse and edge-bound so the fight stays
   *  readable; the flipped feet are the real effect, this only names it. */
  private drawSpin(w: number, h: number, t: number): void {
    const { ctx } = this;
    const n = 7, R = Math.min(w, h) * 0.46;
    ctx.strokeStyle = '#5ecec0';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = -t * 1.6 + (i / n) * Math.PI * 2; // negative sweep = widdershins
      const cx = w / 2 + Math.cos(a) * R;
      const cy = h / 2 + Math.sin(a) * R * 0.62;
      const dir = a - Math.PI / 2; // tangent along the counterclockwise travel
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(t * 3 + i * 1.7);
      const L = 9;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(dir - 0.5) * L, cy - Math.sin(dir - 0.5) * L);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - Math.cos(dir + 0.5) * L, cy - Math.sin(dir + 0.5) * L);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Little stars circling the upper screen (stun). */
  private drawStunStars(w: number, h: number, t: number): void {
    const { ctx } = this;
    const n = 8, R = Math.min(w, h) * 0.42;
    ctx.textAlign = 'center';
    ctx.font = '20px Verdana';
    ctx.fillStyle = '#fff04a';
    for (let i = 0; i < n; i++) {
      const a = t * 2 + (i / n) * Math.PI * 2;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4 + i);
      ctx.fillText('★', w / 2 + Math.cos(a) * R, h * 0.2 + Math.sin(a) * R * 0.4);
    }
    ctx.globalAlpha = 1;
    ctx.font = '12px Verdana';
  }

  /** Heartbeat cycle phase (0..1) + the renderer-clock stamp behind it —
   *  phase is INTEGRATED per frame (never t × rate) so a quickening heart
   *  slides its tempo without skipping or doubling a beat. */
  private beatPhase = 0;
  private beatPrevT = -1;

  /** THE LOW-LIFE VIGNETTE: blood seeps in from the screen edge as life
   *  sinks under the lowLife line, and at the last sliver a slow lub-dub
   *  heartbeat presses the vignette inward and flushes it redder for a
   *  moment — a wound you inhabit, not an alarm strobing at you. All levers
   *  in VIS_CFG.lowLife. The continuous part honors the settings toggle
   *  (a 1/1-life or 90%-reserved build would dwell inside a permanent wound
   *  otherwise); the hit-while-low surge draws regardless — you always
   *  learn you were struck while low. */
  private drawLowLifeGlow(world: World): void {
    const C = VIS_CFG.lowLife;
    const p = world.player;
    const frac = p.maxLife() > 0 ? Math.max(0, p.life) / p.maxLife() : 1;
    // The seep begins at the player's OWN line (the lowLifeLine stat) —
    // the screen agrees with the character sheet, pact belts included.
    const start = p.lowLifeLine();
    // The heart rides the RENDERER's clock, like the other screen FX — a
    // chronomancer stops the world, not your own pulse.
    const now = performance.now() / 1000;
    const dt = this.beatPrevT < 0 ? 0 : clamp(now - this.beatPrevT, 0, 0.1);
    this.beatPrevT = now;
    const pulseOn = this.getSettings?.().lowLifePulse ?? true;
    let steady = 0, beat = 0;
    if (pulseOn && !p.dead && frac < start) {
      const sev = 1 - frac / start;                    // 0 at the line … 1 at empty
      steady = C.alphaFloor + (C.alphaCeil - C.alphaFloor) * sev;
      if (frac < C.beatFrac) {
        const depth = 1 - frac / C.beatFrac;           // how far under the beat line
        const period = C.beat.periodFrom + (C.beat.periodTo - C.beat.periodFrom) * depth;
        this.beatPhase = (this.beatPhase + dt / period) % 1;
        beat = lubDub(this.beatPhase) * depth;         // swells in across the beat band
      } else this.beatPhase = 0;                       // re-crossing leads with a fresh lub
    }
    // Struck while low: ONE smoothstep bloom that decays with the world
    // timer — the impact registers, nothing blinks. Combines with the
    // heartbeat by max (a surge over a systole never stacks toward opaque)
    // and draws even with the pulse toggled off.
    const u = world.lowLifeHitFlash > 0
      ? Math.min(world.lowLifeHitFlash / LOW_LIFE_FLASH_SEC, 1) : 0;
    const surge = u * u * (3 - 2 * u);
    const a = Math.max(steady * (1 + C.beat.alphaBoost * beat), C.hit.alpha * surge);
    if (a <= 0.005) return;
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    // The seep: the clear centre tightens as life ebbs; each systole (and
    // each fresh wound) presses it further inward for a breath.
    const sev = start > 0 ? 1 - Math.min(frac / start, 1) : 1;
    const inner = Math.max(0, C.innerFrom + (C.innerTo - C.innerFrom) * sev
      - C.beat.reach * beat - C.hit.reach * surge) * Math.min(w, h);
    // Baked seep (vis/overlays.ts): the systole's press and the wound-flush
    // hue quantize into the key — a beat cycle walks a stable handful of
    // LRU entries and the per-frame cost is one blit under `a`.
    const flush = Math.min(1, C.beat.flushMix * beat + C.hit.flushMix * surge);
    const innerQ = qFrac(inner / Math.min(w, h));
    const flushQ = qFrac(flush, 0.1);
    const mid = blendRgb(C.mid, C.flush, flushQ);
    const edge = blendRgb(C.edge, C.flush, flushQ * 0.6);
    drawEdgeOverlay(ctx, w, h, {
      key: `lowlife|${innerQ}|${flushQ}`, innerFrac: innerQ,
      stops: [[0, `rgba(${mid},0)`], [C.midStop, `rgba(${mid},${C.midAlpha})`], [1, `rgba(${edge},1)`]],
    }, a);
  }

  /** THE TIMEFLOW WASH (engine/timeflow.ts): while a hold carrying a hud
   *  spec is live — a chronomancer's stop, an Ultimatum-style choice — wash
   *  the screen in the hold's authored tint and name the moment in a quiet
   *  breathing banner. Pure data: the hold brought the look; nothing here
   *  knows any skill. (The escape menu's hold carries no hud — its DOM
   *  covers the screen.) Shimmer rides performance.now(), the renderer's
   *  clock — the WORLD clock is the thing that froze. */
  private drawTimeflow(world: World): void {
    const hud = world.timeflow.overlay();
    if (!hud) return;
    const { ctx } = this;
    if (hud.tint) {
      ctx.fillStyle = hud.tint;
      // Virtual dims under the UI-scale pass: at scale ≥1 this covers the
      // canvas exactly; below 1 it overdraws past the edge — clipped, harmless.
      ctx.fillRect(0, 0, this.uiW, this.uiH);
    }
    if (hud.label) {
      const t = performance.now() / 1000;
      ctx.save();
      ctx.font = 'bold 13px Verdana';
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 2.2);
      ctx.fillStyle = '#a8ecf0';
      ctx.fillText(`· ${hud.label.toUpperCase()} ·`, this.uiW / 2, 54);
      ctx.restore();
    }
  }

  /** A screen-space wash for time of day and weather — subtle enough to keep
   *  the world readable, enough to feel the night close in and a storm gather. */
  private drawAtmosphere(world: World): void {
    if (VIS_ABLATE.has('atmosphere')) return; // perf forensics (visConfig)
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    // THE SUN-LIFT: high day brightens the whole scene with a warm additive
    // breath — days finally feel like days. Scaled by the biome's own
    // dayLight (a desert SWELTERS at 1.6; a canopied wood barely lifts).
    const sunUp = dayCycle(world.time).light;
    if (sunUp > 0.55) {
      const lift = 0.055 * ((sunUp - 0.55) / 0.45) * (world.zone.theme.dayLight ?? 1);
      if (lift > 0.004) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,238,210,${lift.toFixed(3)})`;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
    }
    // The LIGHT LAYER carries the darkness now; this wash is only the cold
    // blue COLOR GRADE of night, not its blackness.
    const night = 1 - dayCycle(world.time).light; // 0 at noon, 1 at deep night
    if (night > 0.04) {
      ctx.fillStyle = `rgba(16,22,52,${(0.12 * night).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    // WEATHER, CROSSFADED: the raw sample can pop (a zone hop, a kind flip
    // where two fronts overlap) — the smoother eases the DISPLAYED wash and
    // particles toward it at each kind's own configured ramp, so a fog bank
    // seeps in over seconds while a storm may still SLAM by design.
    // THE ROOM VEIL DAMPS THE SKY: confinement scales the wash, particles
    // and wind streaks toward still air — a roof owns its sky in the FEEL,
    // not just the sim (openAir is exactly 1 anywhere but inside).
    const openAir = 1 - this.roomVeil.frac() * VIS_CFG.roomVeil.dampAtmosphere;
    const f = this.smoothWeather(world);
    if (f) {
      const wi = f.intensity * openAir;
      const [r, g, b] = hexToRgb(WEATHER_DEFS[f.kind].color);
      ctx.fillStyle = `rgba(${r},${g},${b},${((0.05 + 0.12 * wi) * openAir).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      // The front's PARTICLES — rain streaks, ash, fog banks (vis/weatherFx.ts).
      if (!VIS_ABLATE.has('weatherfx')) drawWeatherFx(ctx, f.kind, wi, w, h, world.time);
    }
    // EVENT ZONE WASH (world/zoneWash.ts): ground HELD by something — a
    // haunting's pale cold — colours the whole air of the zone. Smoothed
    // like the weather, so a settle / lift / zone hop seeps rather than pops.
    const zw = this.smoothZoneWash(world);
    if (zw) {
      const [zr, zg, zb] = hexToRgb(zw.color);
      ctx.fillStyle = `rgba(${zr},${zg},${zb},${zw.alpha.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    // The zone's STANDING ambience — underwater caustics + bubble splays,
    // desert heat haze — declared on the theme (vis/ambientFx.ts). The camera
    // rides along for the world-anchored kinds (overclouds' parallax).
    for (const fx of world.zone.theme.ambientFx ?? []) {
      drawAmbientFx(ctx, fx, w, h, world.time, this.cam.x, this.cam.y);
    }
    // WIND STREAMLINES: thin wisps riding the gale across the screen — the
    // flow made faintly visible (direction + strength read at a glance).
    // Confinement stills them with the rest of the sky (openAir above).
    const rawGale = world.zoneWind();
    const gale = rawGale && openAir < 1
      ? { ...rawGale, strength: rawGale.strength * openAir } : rawGale;
    if (gale && gale.strength > 0.08) {
      const t = world.time;
      const ang = Math.atan2(gale.ny, gale.nx);
      const diag = Math.hypot(w, h);
      ctx.save();
      ctx.strokeStyle = '#e8f0f8';
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      const n = Math.round(6 + gale.strength * 10);
      const speed = 140 + gale.strength * 280;
      for (let i = 0; i < n; i++) {
        const s = ((t * speed + i * 227) % (diag + 220)) - 110 - diag / 2;
        const off = ((i * 349) % Math.round(diag)) - diag / 2;
        const cx = w / 2 + Math.cos(ang) * s - Math.sin(ang) * off;
        const cy = h / 2 + Math.sin(ang) * s + Math.cos(ang) * off;
        const wob = Math.sin(t * 2 + i * 1.7) * 6;
        const L = 24 + gale.strength * 34;
        ctx.globalAlpha = (0.07 + 0.12 * gale.strength) * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
        ctx.beginPath();
        ctx.moveTo(cx - Math.cos(ang) * L, cy - Math.sin(ang) * L + wob);
        ctx.quadraticCurveTo(cx + wob * 0.4, cy + wob,
          cx + Math.cos(ang) * L, cy + Math.sin(ang) * L - wob * 0.5);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    // ARENA WASH: a boss fight recolours the room per phase (intensity is capped at
    // the source so the climax stays readable — drama without blinding the player).
    if (world.arenaWash && world.arenaWash.intensity > 0) {
      const [r, g, b] = hexToRgb(world.arenaWash.color);
      ctx.fillStyle = `rgba(${r},${g},${b},${world.arenaWash.intensity.toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    // MYCELIA: a sickly spore haze when the player stands in a spore-laced zone (thicker
    // with density) + a denser edge vignette + drifting spore motes — the bloom's pall.
    const spore = world.sim.myceliaField?.sporeOn(world.zone.id);
    if (spore) {
      const d = Math.min(1, spore.density);
      const [sr, sg, sb] = hexToRgb(spore.color); // the bloom's own hue (data-driven — a 2nd influence-biome tints its own)
      ctx.fillStyle = `rgba(${sr},${sg},${sb},${(0.04 + 0.10 * d).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      drawEdgeOverlay(ctx, w, h, {
        key: `spore|${spore.color}`, innerFrac: 0.32, outerFrac: 1.2,
        stops: [[0, `rgba(${Math.round(sr * 0.6)},${Math.round(sg * 0.7)},${Math.round(sb * 0.6)},0)`],
          [1, `rgba(${Math.round(sr * 0.6)},${Math.round(sg * 0.7)},${Math.round(sb * 0.6)},1)`]],
      }, 0.10 + 0.18 * d);
      this.drawSporeMotes(w, h, world.time, d, spore.color);
    }
  }

  /** Drifting spore motes rising up the screen (thicker with spore density). */
  private drawSporeMotes(w: number, h: number, t: number, density: number, color: string): void {
    const { ctx } = this;
    const n = Math.round(6 + 16 * density);
    const [mr, mg, mb] = hexToRgb(color);
    ctx.fillStyle = `rgba(${Math.min(255, mr + 70)},${Math.min(255, mg + 60)},${Math.min(255, mb + 70)},0.9)`;
    for (let i = 0; i < n; i++) {
      const sx = ((i * 89 + Math.sin(t * 0.5 + i * 1.3) * 50) % w + w) % w;
      const sy = (((-t * 26 + i * 71) % (h + 40)) + (h + 40)) % (h + 40) - 20; // negative t → rises
      const r = 1.4 + 1.3 * ((i % 3) / 2);
      ctx.globalAlpha = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.6 + i));
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ world

  private drawFloor(world: World): void {
    const { ctx } = this;
    const { w, h } = world.arena;
    const theme = world.zone.theme;
    const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
    // BOUNDLESS (the Descent): no edges — stream baked chunks around the
    // camera forever, and draw NO border.
    if (world.arena.boundless) {
      this.ground.draw(ctx, world, this.cam.x, this.cam.y, vw, vh);
      this.drawAnimatedRegions(world);
      return;
    }
    const ell = world.arena.shape === 'ellipse';
    ctx.save();
    // Clip RECT only: a persistent curved clip forces every chunk blit and
    // cell fill under it onto a slow raster path (isles are always ellipses
    // and paid for it every frame). Elliptical zones draw unclipped and mask
    // the outside ONCE at the end of the pass instead.
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    // THE UNDERSTORY (vis/understory.ts): the world far BELOW, drawn first so
    // it shows only through the ground chunks' punched `window` cells — the
    // land a cloud shelf hangs over, or the endless cloud sea. Zones with
    // neither pay a single early-out.
    this.understory.draw(ctx, world, this.cam.x, this.cam.y, vw, vh, world.time);
    // The floor itself: baked noise-mottled chunks (vis/ground.ts) — texture,
    // speckle, wall bevels and contact AO all land in one drawImage per chunk.
    this.ground.draw(ctx, world, this.cam.x, this.cam.y, vw, vh);
    this.drawSnowCover(world, vw, vh);
    this.drawAnimatedRegions(world);
    // Soft edge vignette — the world settles into its bounds instead of
    // ending on a hairline.
    const D = 90;
    if (ell) {
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(1, h / w);
      const R = w / 2;
      const g = ctx.createRadialGradient(0, 0, Math.max(1, R - D), 0, 0, R);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.38)');
      ctx.fillStyle = g;
      ctx.fillRect(-R, -R * (w / h), R * 2, (R * (w / h)) * 2);
      ctx.restore();
    } else {
      const edges: [number, number, number, number, number, number, number, number][] = [
        [0, 0, w, D, 0, 0, 0, D],          // top
        [0, h - D, w, D, 0, h, 0, h - D],  // bottom
        [0, 0, D, h, 0, 0, D, 0],          // left
        [w - D, 0, D, h, w, 0, w - D, 0],  // right
      ];
      for (const [rx, ry, rw, rh, gx0, gy0, gx1, gy1] of edges) {
        const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
        g.addColorStop(0, 'rgba(0,0,0,0.32)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(rx, ry, rw, rh);
      }
    }
    // ELLIPSE zones: mask everything outside the oval back to the void
    // color — one even-odd fill instead of a whole-pass curved clip.
    if (ell) {
      ctx.fillStyle = voidBaseOf(theme);
      ctx.beginPath();
      ctx.rect(-8, -8, w + 16, h + 16);
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill('evenodd');
    }
    ctx.restore();
    // THE VOID FRAME (vis/voidFrame.ts): everything past the rim — the
    // falling-away skirt, the lip strokes, the drifting motes in the dark.
    // Under the hero-locked camera the abyss is on screen whenever the hero
    // presses the world's edge; the classic frame meets it at the ±overshoot
    // and around letterboxed interiors.
    drawVoidFrame(ctx, world, this.cam.x, this.cam.y, vw, vh, world.time);
  }

  /** SNOW COVER wash (World.snowCover): drifted white laid over the floor,
   *  deeper in the noise-hollows so a half-melted fall reads patchy, near
   *  solid at a full blanket. BAKED per floor-chunk tile at a QUANTIZED
   *  cover level: the old path ran ~3k valueNoise + fillRect over the whole
   *  viewport EVERY frame — a permanent tax in frozen biomes, where
   *  frozenBaseline pins cover on forever. Cover moves slowly, so a bucket
   *  flip re-bakes a visible tile every few seconds at worst; steady state
   *  is a handful of drawImages. */
  private snowChunks = new Map<string, { img: HTMLCanvasElement; cover: number }>();
  private snowZoneRef: unknown = null;

  private drawSnowCover(world: World, vw: number, vh: number): void {
    if (VIS_ABLATE.has('snowwash')) return; // perf forensics (visConfig)
    const cover = world.snowCover;
    if (cover <= 0.02) return;
    if (this.snowZoneRef !== world.zone) {
      this.snowZoneRef = world.zone;
      for (const e of this.snowChunks.values()) releaseCanvas(e.img);
      this.snowChunks.clear();
    }
    const { ctx } = this;
    const C = VIS_CFG.ground.chunk; // ride the floor-chunk grid
    const x0 = Math.floor(this.cam.x / C), x1 = Math.floor((this.cam.x + vw) / C);
    const y0 = Math.floor(this.cam.y / C), y1 = Math.floor((this.cam.y + vh) / C);
    // HYSTERESIS + BUDGET: a tile re-bakes only once the live cover has moved
    // a real step past what it baked (0.06 — wider than any accumulate/melt
    // equilibrium dither), and only a few tiles per frame; the rest keep
    // drawing their slightly-stale snow. Without both, a snow front whose
    // accumulation fights the melt at a threshold FLAPPED every visible tile
    // every frame — a constant whole-viewport canvas-realloc storm the perf
    // harness caught as tundra's 54ms floor (and the GPU error log).
    let rebakes = 0;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = `${cx},${cy}`;
        let e = this.snowChunks.get(key);
        if (!e || (Math.abs(e.cover - cover) > 0.06 && rebakes < 4)) {
          if (e) { rebakes++; releaseCanvas(e.img); }
          e = { img: this.bakeSnowChunk(cx * C, cy * C, C, cover), cover };
          this.snowChunks.set(key, e);
          // Cap rides the floor-chunk cap: it must exceed the largest visible
          // chunk count or walking evicts live tiles every frame — the
          // realloc churn read as a hitch storm (and GPU pressure) at 1440p.
          while (this.snowChunks.size > VIS_CFG.ground.maxChunks) {
            const oldest = this.snowChunks.keys().next().value;
            if (oldest === undefined) break;
            const old = this.snowChunks.get(oldest);
            if (old) releaseCanvas(old.img);
            this.snowChunks.delete(oldest);
          }
        } else {
          this.snowChunks.delete(key); // LRU touch
          this.snowChunks.set(key, e);
        }
        ctx.drawImage(e.img, cx * C, cy * C);
      }
    }
  }

  /** One snow-wash tile: the per-cell noise loop the old per-frame path ran,
   *  run ONCE per (tile, cover bucket). Cells snap to the GLOBAL wash grid
   *  (not the tile origin) so a cell straddling a tile seam paints the same
   *  noise on both sides — no seam lines. */
  private bakeSnowChunk(ox: number, oy: number, C: number, cover: number): HTMLCanvasElement {
    VIS_TELEMETRY.snowBakes++;
    const c = document.createElement('canvas');
    c.width = C; c.height = C;
    const g = c.getContext('2d')!;
    const cell = SNOW_CFG.washCell;
    g.fillStyle = '#eaf2f7';
    const gx0 = Math.floor(ox / cell) * cell, gy0 = Math.floor(oy / cell) * cell;
    for (let wy = gy0; wy < oy + C; wy += cell) {
      for (let wx = gx0; wx < ox + C; wx += cell) {
        // Broad features (~200u) — DRIFTS, not a checkerboard of cells.
        const n = valueNoise(wx * 0.005, wy * 0.005, 77);
        // Snow settles into the low noise first; a full cover whites out all.
        const depth = clamp(cover * 1.25 - n * 0.55, 0, 1);
        if (depth <= 0.03) continue;
        g.globalAlpha = depth * SNOW_CFG.washAlpha;
        g.fillRect(wx - ox, wy - oy, cell + 0.5, cell + 0.5);
      }
    }
    return c;
  }

  /** ANIMATED region visuals (flesh throb, water drift) — the only per-frame
   *  cell painting left. Every STATIC cell (walls, still visuals, bevels,
   *  contact AO) bakes into the ground chunks; see vis/ground.ts. */
  private drawAnimatedRegions(world: World): void {
    if (VIS_ABLATE.has('animregions')) return; // perf forensics (visConfig)
    const wf = world.walk;
    if (!(wf instanceof GridWalkField)) return;
    const { ctx } = this;
    const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
    const cell = wf.cell;
    const c0 = Math.max(0, Math.floor(this.cam.x / cell));
    const c1 = Math.min(wf.cols, Math.ceil((this.cam.x + vw) / cell));
    const r0 = Math.max(0, Math.floor(this.cam.y / cell));
    const r1 = Math.min(wf.rows, Math.ceil((this.cam.y + vh) / cell));
    let soulsFill: string | null = null;
    for (let cy = r0; cy < r1; cy++) {
      for (let cx = c0; cx < c1; cx++) {
        const id = wf.regionAt((cx + 0.5) * cell, (cy + 0.5) * cell);
        if (id === 'ground') continue;
        const vis = regionKind(id)?.visual;
        if (!vis?.animate) continue;
        let alpha = vis.alpha ?? 1;
        if (vis.animate === 'pulse') alpha *= 0.6 + 0.4 * Math.sin(performance.now() / 650 + cx * 0.3 + cy * 0.3);
        else if (vis.animate === 'drift') alpha *= 0.8 + 0.2 * Math.sin(performance.now() / 900 + cx * 0.2);
        // SHIMMER (the frail cloud): a quick, cell-desynced glitter — the wash
        // itself is the warning, so it has to LIVE, not sit like paint.
        else if (vis.animate === 'shimmer') alpha *= 0.55 + 0.45 * Math.sin(performance.now() / 480 + (cx * 7 + cy * 13) * 0.53);
        else if (vis.animate === 'prism') alpha *= 0.72 + 0.28 * Math.sin(performance.now() / 700 + (cx * 5 + cy * 9) * 0.41);
        // SOULS (the living water): the deep's own breath is SLOW and broad —
        // cells swell together in drifting swathes, not a glitter (the
        // under-surface figures draw in the overlay pass below).
        else if (vis.animate === 'souls') {
          alpha *= 0.9 + 0.1 * Math.sin(performance.now() / 2400 + cx * 0.11 + cy * 0.07);
          soulsFill = vis.fill;
        }
        ctx.globalAlpha = Math.max(0, alpha);
        // PRISM (the rainbow spans): the fill's hue walks the whole spectrum,
        // phase-offset per cell so a span reads as a banded arc, not a slab.
        // Any future kind joins by declaring animate:'prism' — the fill color
        // is ignored in favour of the living hue.
        ctx.fillStyle = vis.animate === 'prism'
          ? `hsl(${(performance.now() / 24 + (cx * 11 + cy * 17) * 6) % 360} 78% 68%)`
          : vis.fill;
        ctx.fillRect(cx * cell, cy * cell, cell + 0.6, cell + 0.6);
      }
    }
    ctx.globalAlpha = 1;
    if (soulsFill) this.drawSoulsUnderSurface(wf);
  }

  /** THE UNDER-SURFACE (animate:'souls' — the River of Souls' living deep):
   *  pale FIGURES adrift beneath the water — a face surfacing toward the
   *  light, a reaching hand, a long soul-streak riding the current — each
   *  seeded on a world-anchored lattice (no state, no churn: a figure lives
   *  where its hash says, breathes on its own slow clock, and fades back
   *  under). View-culled; a handful of path draws per frame. */
  private drawSoulsUnderSurface(wf: GridWalkField): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
    const STEP = 150; // lattice pitch, world units
    const gx0 = Math.floor(this.cam.x / STEP) - 1, gx1 = Math.ceil((this.cam.x + vw) / STEP) + 1;
    const gy0 = Math.floor(this.cam.y / STEP) - 1, gy1 = Math.ceil((this.cam.y + vh) / STEP) + 1;
    const hash = (a: number, b: number): number => {
      let h = (a * 374761393 + b * 668265263) ^ 0x5f356495;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 0xffffffff;
    };
    ctx.save();
    ctx.lineCap = 'round';
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const h0 = hash(gx, gy);
        if (h0 > 0.34) continue; // most lattice points hold no soul tonight
        const x = (gx + 0.2 + hash(gx, gy + 7) * 0.6) * STEP + Math.sin(t * 0.21 + h0 * 9) * 26;
        const y = (gy + 0.2 + hash(gx + 7, gy) * 0.6) * STEP + Math.cos(t * 0.17 + h0 * 7) * 18;
        if (wf.regionAt(x, y) !== 'soul_water') continue; // souls live in the water alone
        // The lifecycle: each figure rises and sinks on its own slow clock.
        const phase = (t / (14 + h0 * 16) + h0 * 3) % 1;
        const breath = Math.sin(phase * Math.PI);
        if (breath <= 0.05) continue;
        const kind = hash(gx + 13, gy + 3);
        const s = 10 + hash(gx + 3, gy + 13) * 14; // figure scale
        if (kind < 0.45) {
          // A FACE surfacing toward the light: a pale oval, two dark hollows,
          // an open mouth — gone again before it quite arrives.
          const a = 0.1 * breath;
          ctx.fillStyle = `rgba(216, 240, 252, ${a})`;
          ctx.beginPath(); ctx.ellipse(x, y, s * 0.8, s, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(10, 24, 34, ${a * 1.6})`;
          ctx.beginPath(); ctx.ellipse(x - s * 0.3, y - s * 0.24, s * 0.14, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x + s * 0.3, y - s * 0.24, s * 0.14, s * 0.2, 0, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(x, y + s * 0.4, s * 0.18, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
        } else if (kind < 0.72) {
          // A REACHING HAND: a palm and four trailing fingers, grasping up.
          const a = 0.09 * breath;
          const ang = hash(gx + 5, gy + 5) * Math.PI * 2 + Math.sin(t * 0.3 + h0 * 5) * 0.2;
          ctx.strokeStyle = `rgba(216, 240, 252, ${a})`;
          ctx.fillStyle = `rgba(216, 240, 252, ${a})`;
          ctx.save();
          ctx.translate(x, y); ctx.rotate(ang);
          ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = Math.max(1.4, s * 0.16);
          for (let f = 0; f < 4; f++) {
            const fa = -0.5 + f * 0.33;
            ctx.beginPath();
            ctx.moveTo(Math.sin(fa) * s * 0.3, -s * 0.4);
            ctx.quadraticCurveTo(Math.sin(fa) * s * 0.7, -s * 0.95, Math.sin(fa) * s * (0.8 + 0.1 * Math.sin(t * 1.1 + f)), -s * (1.2 + 0.12 * Math.sin(t * 0.9 + f * 2)));
            ctx.stroke();
          }
          ctx.restore();
        } else {
          // A SOUL-STREAK riding the current: a long pale sinew slipping
          // east with the flow, head brighter than tail.
          const a = 0.08 * breath;
          const drift = (t * 22 + h0 * 400) % 120 - 60;
          ctx.strokeStyle = `rgba(191, 232, 255, ${a})`;
          ctx.lineWidth = Math.max(1.5, s * 0.2);
          ctx.beginPath();
          ctx.moveTo(x + drift - s * 3, y + Math.sin(t * 0.8 + h0 * 6) * 5);
          ctx.quadraticCurveTo(x + drift - s, y - s * 0.5, x + drift + s * 1.6, y);
          ctx.stroke();
          ctx.fillStyle = `rgba(216, 244, 255, ${a * 1.7})`;
          ctx.beginPath(); ctx.arc(x + drift + s * 1.6, y, s * 0.22, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  /** Per-frame VIEW CULL over the zone's doodads, grouped by kind. The ground
   *  pass used to run ~40 full-list filter passes and build blob paths for
   *  every disc in the ZONE — a landmark that pours a liquid (a caldera's
   *  lava pool is one disc per grid cell, hundreds of them) paid that cost
   *  every frame for geometry nowhere near the screen. Pad covers crown/rim
   *  overdraw beyond a doodad's radius (canopy crowns, vent rims, blob grow). */
  private culled = new Map<string, Doodad[]>();
  private culledAll: Doodad[] = [];
  /** The baked-floor chunk cache (vis/ground.ts). */
  private ground = new GroundRenderer();
  /** The world far below (vis/understory.ts): captured aerials + cloud sea,
   *  drawn under the ground chunks so only `window` cells reveal it. */
  private understory = new UnderstoryLayer();

  /** CRUMBLING CELLS (engine/collapse.ts live state): each arming/crumbling
   *  cloud cell shivers, cracks and darkens toward the drop — drawn live over
   *  the baked floor (void cells themselves re-bake through the walk grid's
   *  own dirty rects). View-culled; ablate pass name 'collapse'. */
  private drawCollapseOverlay(world: World): void {
    const cf = world.collapse;
    if (!cf || !cf.active.size || VIS_ABLATE.has('collapse')) return;
    const CFG = VIS_CFG.collapseFx;
    const { ctx } = this;
    const cell = cf.walk.cell;
    const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
    const x0 = this.cam.x - cell, x1 = this.cam.x + vw + cell;
    const y0 = this.cam.y - cell, y1 = this.cam.y + vh + cell;
    for (const i of cf.active) {
      const gx = i % cf.walk.cols, gy = (i / cf.walk.cols) | 0;
      const wx = gx * cell, wy = gy * cell;
      if (wx < x0 || wx > x1 || wy < y0 || wy > y1) continue;
      const frac = cf.crumbleFrac(i);
      const arming = frac < 0;
      const f = arming ? 0 : frac;
      // The shiver: harder as the cell lets go.
      const t = world.time * (7 + (i % 5));
      const jx = Math.sin(t + i) * CFG.wobble * (0.25 + f);
      const jy = Math.cos(t * 1.3 + i * 2.7) * CFG.wobble * (0.25 + f);
      // Sinking: the cell darkens toward the drop beneath it.
      ctx.globalAlpha = arming ? 0.1 : 0.12 + f * CFG.sink;
      ctx.fillStyle = '#0c1220';
      ctx.fillRect(wx + jx, wy + jy, cell, cell);
      if (!arming) {
        // Cracks: bright fissures spidering from the cell heart.
        ctx.globalAlpha = CFG.crackAlpha * (0.3 + f * 0.7);
        ctx.strokeStyle = CFG.crack;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const cx = wx + cell / 2 + jx, cy = wy + cell / 2 + jy;
        for (let k = 0; k < 3; k++) {
          const ang = (i * 2.39996 + k * 2.094) % (Math.PI * 2);
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * cell * (0.3 + f * 0.45),
            cy + Math.sin(ang) * cell * (0.3 + f * 0.45));
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  /** A VERTICAL CROSSING's screen film (engine/traversal.ts): wind streaks
   *  rushing past the view while the body rises or falls, and the whiteout
   *  veil the zone swap hides behind. Covers the HUD by design — cinema. */
  private drawTraversalFx(world: World): void {
    const s = world.traversal;
    if (!s) return;
    const { ctx, canvas } = this;
    const st = s.def.streaks;
    if (st && s.phase !== 'windup') {
      const f = s.phase === 'rise'
        ? Math.min(1, s.t / Math.max(0.01, s.def.rise))
        : 1 - Math.min(1, s.t / Math.max(0.01, s.def.land));
      ctx.save();
      ctx.strokeStyle = st.color;
      ctx.lineCap = 'round';
      for (let i = 0; i < st.count; i++) {
        const x = ((i * 379 + 83) % 997) / 997 * canvas.width;
        const len = 50 + ((i * 131) % 170);
        const speed = 1000 + ((i * 257) % 800);
        const span = canvas.height + len * 2 + 200;
        const yRun = (world.time * speed + i * 613) % span;
        const y = st.dir > 0 ? yRun - len - 100 : canvas.height + len + 100 - yRun;
        ctx.globalAlpha = 0.45 * f * (0.4 + ((i * 7) % 10) / 16);
        ctx.lineWidth = 1.2 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + len * st.dir);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    const veil = traversalVeil(s);
    if (veil > 0) {
      ctx.globalAlpha = veil;
      ctx.fillStyle = s.def.veil;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }
  /** MOTION FX — transient liquid reactions to moving bodies: wake ripples
   *  on water, pock marks pressed into snow. Renderer-owned (pure visuals),
   *  cleared on zone change. */
  private liquidFx: { x: number; y: number; age: number; max: number; r0: number; kind: 'ripple' | 'pock' }[] = [];
  private lastFxSpawn = new Map<number, number>();
  private fxZoneRef: unknown = null;

  private updateMotionFx(world: World): void {
    if (this.fxZoneRef !== world.zone) {
      this.fxZoneRef = world.zone;
      this.liquidFx.length = 0;
      this.lastFxSpawn.clear();
    }
    const dt = this.frameDt;
    // Age + expire in one order-preserving compaction — splice() here minted
    // a removed-elements array per expiry, steady garbage in wake-heavy
    // zones (every wader ripples ~6/s).
    let live = 0;
    for (let i = 0; i < this.liquidFx.length; i++) {
      const f = this.liquidFx[i];
      f.age += dt;
      if (f.age < f.max) this.liquidFx[live++] = f;
    }
    this.liquidFx.length = live;
    for (const a of world.actors) {
      if (a.dead || a.construct) continue;
      // "Moving" = stepped within the last beat (lastMoveAt is stamped by
      // the movement artery) or carrying real velocity (ice slides count).
      const moving = (world.time - (a.lastMoveAt ?? -9) < 0.12)
        || Math.hypot(a.vel?.x ?? 0, a.vel?.y ?? 0) > 12;
      if (!moving) continue;
      const last = this.lastFxSpawn.get(a.id) ?? -9;
      if (world.time - last < 0.16) continue;
      // A seated hull ON THE VOYAGE is a body in water the ground never
      // senses (the open sea is streamed coastline, not water doodads) —
      // its WAKE is the same ripple system, seeded at the stern so the
      // rings trail the hull instead of centering under it.
      const boat = world.sailing && world.seats.some(s => s.actor === a);
      if (boat) {
        this.lastFxSpawn.set(a.id, world.time);
        this.liquidFx.push({
          x: a.pos.x - Math.cos(a.facing) * a.radius * 0.9,
          y: a.pos.y - Math.sin(a.facing) * a.radius * 0.9,
          age: 0, max: 1.1, r0: a.radius * 0.6, kind: 'ripple',
        });
      } else if (regionKind(a.groundKind)?.surfaceWake === 'ripple') {
        this.lastFxSpawn.set(a.id, world.time);
        this.liquidFx.push({
          x: a.pos.x, y: a.pos.y + a.radius * 0.3,
          age: 0, max: 0.85, r0: a.radius * 0.55, kind: 'ripple',
        });
      } else {
        // Snow pocks press wherever cover stands deep (accumulated snowfall)
        // — or inside a standing drift doodad, cover or no cover.
        let onSnow = world.snowCover >= SNOW_CFG.pockAt;
        if (!onSnow) {
          const drifts = this.culled.get('snowdrift');
          if (drifts) {
            for (const d of drifts) {
              if (dist(a.pos, d.pos) <= d.radius) { onSnow = true; break; }
            }
          }
        }
        if (onSnow && a.groundKind !== 'water') {
          this.lastFxSpawn.set(a.id, world.time);
          this.liquidFx.push({
            x: a.pos.x + (Math.random() * 4 - 2), y: a.pos.y + a.radius * 0.4,
            age: 0, max: 9, r0: a.radius * 0.42, kind: 'pock',
          });
        }
      }
    }
  }

  private drawMotionFx(): void {
    const { ctx } = this;
    for (const f of this.liquidFx) {
      const t = f.age / f.max;
      if (f.kind === 'ripple') {
        const r = f.r0 + t * 26;
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.strokeStyle = '#d8effa';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = (1 - t) * 0.18;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // A pressed pock: a shaded dent with a bright compression rim.
        ctx.globalAlpha = (1 - t) * 0.3;
        ctx.fillStyle = '#8fa6bc';
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, f.r0, f.r0 * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = (1 - t) * 0.2;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(f.x - f.r0 * 0.2, f.y - f.r0 * 0.2, f.r0 * 0.62, -2.6, -0.8);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  /** The dynamic darkness/emissive compositor (vis/lights.ts). */
  private lightLayer = new LightLayer();
  /** Crossfaded DISPLAYED weather (the raw sample can pop on zone hops and
   *  kind flips; each kind ramps at its own WEATHER_FX.fadeIn). */
  private wx: { kind: WeatherKind | null; intensity: number } = { kind: null, intensity: 0 };
  /** The DISPLAYED zone wash (world/zoneWash.ts), eased toward the folded
   *  target each frame — a grief settling / lifting / a zone hop seeps
   *  instead of popping. */
  private zw: { color: string; alpha: number } = { color: '#b8c8e8', alpha: 0 };

  private smoothWeather(world: World): { kind: WeatherKind; intensity: number } | null {
    // skyFront (not the raw node sample): a SHELTERED zone shows no rain,
    // grit or storm-wash — step into the cellar and the sky's business
    // crossfades away at the kind's own ramp.
    const target = world.skyFront();
    const dt = this.frameDt;
    const rampOf = (k: WeatherKind | null): number =>
      Math.max(0.05, (k ? WEATHER_FX[k]?.fadeIn : undefined) ?? VIS_CFG.weather.fadeSec);
    if (this.wx.kind && target?.kind !== this.wx.kind) {
      // The old kind clears at its own pace before the new one gathers.
      this.wx.intensity -= dt / rampOf(this.wx.kind);
      if (this.wx.intensity <= 0.02) {
        this.wx.kind = target?.kind ?? null;
        this.wx.intensity = 0.02;
      }
    } else if (target) {
      this.wx.kind = target.kind;
      const d = target.intensity - this.wx.intensity;
      const step = dt / rampOf(target.kind);
      this.wx.intensity += Math.sign(d) * Math.min(Math.abs(d), step);
    } else if (this.wx.kind) {
      this.wx.intensity -= dt / rampOf(this.wx.kind);
      if (this.wx.intensity <= 0.02) {
        this.wx.kind = null;
        this.wx.intensity = 0;
      }
    }
    return this.wx.kind && this.wx.intensity > 0.02
      ? { kind: this.wx.kind, intensity: clamp(this.wx.intensity, 0, 1) }
      : null;
  }

  /** Ease the DISPLAYED zone wash (world/zoneWash.ts) toward the folded
   *  target. Mirrors smoothWeather: a different-coloured mood clears the old
   *  wash before the new one gathers, and alpha walks at one configured ramp
   *  (VIS_CFG.fx.zoneWashFadeSec), clamped so no event whites out the field. */
  private smoothZoneWash(world: World): { color: string; alpha: number } | null {
    const target = foldZoneWash(world);
    const step = this.frameDt / Math.max(0.05, VIS_CFG.fx.zoneWashFadeSec);
    if (target && target.color !== this.zw.color && this.zw.alpha > 0.02) {
      // A different mood incoming: the old colour clears at the same ramp.
      this.zw.alpha = Math.max(0.02, this.zw.alpha - step);
    } else if (target) {
      this.zw.color = target.color;
      const want = clamp(target.alpha, 0, VIS_CFG.fx.zoneWashMaxAlpha);
      const d = want - this.zw.alpha;
      this.zw.alpha += Math.sign(d) * Math.min(Math.abs(d), step);
    } else {
      this.zw.alpha = Math.max(0, this.zw.alpha - step);
    }
    return this.zw.alpha > 0.004 ? this.zw : null;
  }
  private cullDoodads(world: World, vw: number, vh: number): void {
    const pad = RENDER_CULL_PAD;
    const L = this.cam.x - pad, T = this.cam.y - pad;
    const R = this.cam.x + vw + pad, B = this.cam.y + vh + pad;
    this.culled.clear();
    this.culledAll.length = 0;
    for (const d of world.doodads) {
      if (d.pos.x + d.radius < L || d.pos.x - d.radius > R
        || d.pos.y + d.radius < T || d.pos.y - d.radius > B) continue;
      this.culledAll.push(d);
      const arr = this.culled.get(d.kind);
      if (arr) arr.push(d); else this.culled.set(d.kind, [d]);
    }
  }

  /**
   * Terrain doodads — REGISTRY-DRIVEN (data/doodadVisuals.ts): each kind maps
   * to a parametric painter + params from the library (render/vis/painters.ts);
   * groups paint in data-declared order (liquids under pits under bridges
   * under standing objects). Standing kinds get contact shadows via their
   * def; unknown kinds draw the warned generic disc so brand-new data kinds
   * are visible before (or without) ever earning a dressed look.
   */
  private drawDoodads(world: World): void {
    const { ctx } = this;
    // Per-zone shadow art direction (ZoneTheme.shadows) folds over the
    // governor's globals — the whiteout lever (budgetMul 0 = shadowless).
    const shTheme = world.zone.theme.shadows;
    const shAlphaMul = shTheme?.alphaMul ?? 1;
    const env: PaintEnv = {
      ctx, theme: world.zone.theme, time: world.time, world,
      // The frame's shadow allowance (VIS_CFG.shadows): z-order spends it.
      shadowGate: {
        left: Math.round(VIS_CFG.shadows.budget * (shTheme?.budgetMul ?? 1)),
        minR: VIS_CFG.shadows.minRadiusPx / this.zoom,
      },
    };
    type Grp = { kind: string; list: readonly Doodad[]; def: DoodadVisualDef | undefined };
    const groups: Grp[] = [];
    // THE TIER FABRIC, covered exposure: the other layer's furniture is
    // behind a ceiling (or under a street) — filter it out of the frame.
    // Open zones and flat zones pay nothing (hideTier stays null).
    const zt = world.zone.tiers;
    const hideTier = zt?.exposure === 'covered'
      ? ((world.player?.tier ?? 0) === 1 ? 0 : 1) : null;
    for (const [kind, list] of this.culled) {
      groups.push({
        kind,
        list: hideTier === null ? list : list.filter(d => (d.tier ?? 0) !== hideTier),
        def: DOODAD_VISUALS[kind],
      });
    }
    groups.sort((a, b) => (a.def?.order ?? 50) - (b.def?.order ?? 50));
    // The sun's cast this frame — directional shadows SPIN through the day
    // and stretch toward dawn/dusk (null at night).
    const sun = sunCast(world.time);
    for (const g of groups) {
      if (!g.def) {
        if (!warnedUnrenderedKinds.has(g.kind)) {
          warnedUnrenderedKinds.add(g.kind);
          console.warn(`[render] doodad kind '${g.kind}' has no DOODAD_VISUALS entry — generic disc fallback`);
        }
        PAINTERS.fallback(env, g.list, { painter: 'fallback', order: 50 });
        continue;
      }
      if (sun && g.def.longShadow && !VIS_ABLATE.has('shadows')) {
        const gate = env.shadowGate;
        for (const d of g.list) {
          if (gate) {
            if (gate.left <= 0 || d.radius < gate.minR) continue;
            gate.left--;
          }
          drawLongShadow(ctx, d.pos.x, d.pos.y, d.radius * g.def.longShadow,
            sun.dir, sun.len, sun.alpha * shAlphaMul);
        }
      }
      // Ground kinds bed into the terrain before their own detail pass —
      // normally baked into the floor chunks (static); `blend.live` kinds
      // (or a bakeBlend=false fallback) still paint here every frame.
      if (g.def.blend && (g.def.blend.live || !VIS_CFG.ground.bakeBlend)) {
        paintBlendUnderlay(env, g.list, g.def);
      }
      if (g.def.shadow && !VIS_ABLATE.has('shadows')) paintGroupShadows(env, g.list, g.def.shadow * shAlphaMul);
      // bakeWhole kinds (brush clumps, ferns) blit variant sprites through
      // their own painter's bake — the understory half of the forest fix.
      if (g.def.bakeWhole && VIS_CFG.ground.bakeDoodads) paintBakedWhole(env, g.list, g.def);
      else (PAINTERS[g.def.painter] ?? PAINTERS.fallback)(env, g.list, g.def);
    }

    // Eldritch-mutated doodads: writhing tentacles grafted onto the silhouette
    // (a faint pulse marks one that also carries a SWING effect — an ambient
    // hazard). Kind-agnostic, so it rides ANY doodad the mutation touched.
    const t = world.time;
    for (const o of this.culledAll) {
      if (o.adorn !== 'tentacles') continue;
      if (o.effect) {
        ctx.globalAlpha = 0.10 + 0.06 * Math.abs(Math.sin(t * 4 + o.pos.x * 0.05));
        ctx.fillStyle = '#7fce6a';
        ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, o.radius * 1.7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#7fce6a';
      ctx.lineWidth = 2.5;
      const n = 5;
      for (let s = 0; s < n; s++) {
        const base = (s / n) * Math.PI * 2 + (o.rot ?? 0);
        const wob = Math.sin(t * 2.5 + s + o.pos.x * 0.01) * 0.5;
        const bx = o.pos.x + Math.cos(base) * o.radius * 0.8, by = o.pos.y + Math.sin(base) * o.radius * 0.8;
        const ex = o.pos.x + Math.cos(base + wob) * o.radius * 1.6, ey = o.pos.y + Math.sin(base + wob) * o.radius * 1.6;
        const cx = o.pos.x + Math.cos(base + wob * 0.5) * o.radius * 1.3, cy = o.pos.y + Math.sin(base + wob * 0.5) * o.radius * 1.3;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cx, cy, ex, ey); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  // --- WORLD-ANCHORED TEXT LABELS ---------------------------------------------
  // NPC names, overhead prompts, nameplates — and any other line the player
  // is meant to READ (portal names, dimension-gate marks) — queue here during
  // the world pass and draw AFTER the veils and fades: text never drowns
  // under a crown, a roof, or the sight veil's dark. The trade is honesty:
  // each label is gated on the SAME concealment the player's eyes get
  // (labelRevealAt), so an anchor the world still hides leaks not one glyph
  // (the text half of the canopy's ambush rule).
  private labels: { key: object; probe: Vec2; x: number; y: number; text: string; color: string; font: string; stroke: boolean }[] = [];

  /** Queue one line above an actor's head for the post-fade text pass.
   *  dy stacks lines: 8 hugs the scalp (names), 22 rides above the bars. */
  private queueLabel(a: Actor, text: string, color: string, dy: number,
    opts?: { font?: string; stroke?: boolean }): void {
    this.queueLabelAt(a, a.pos, a.pos.x, a.pos.y - a.radius - dy, text, color, opts);
  }

  /** Queue a WORLD-anchored line (portal names, gate marks, future ground
   *  text): drawn at (x, y), revealed by whatever covers `probe` — one gate
   *  for every word on the field. `key` dedups the per-frame reveal lookup
   *  (an anchor usually wears 1-2 lines). */
  private queueLabelAt(key: object, probe: Vec2, x: number, y: number, text: string,
    color: string, opts?: { font?: string; stroke?: boolean }): void {
    this.labels.push({ key, probe, x, y, text: this.resolveText(text), color,
      font: opts?.font ?? 'bold 11px Verdana', stroke: opts?.stroke ?? true });
  }

  /** THE TIER VEIL (engine/tiers.ts, 'covered' exposure): while the local
   *  hero stands on the UNDER layer, everything above is a ceiling — dim the
   *  scene, then paint the duct web live from the region map (tierVisual
   *  rows, viewport cells only — a few hundred rects, no bake to invalidate;
   *  carves self-heal by construction). On the street tier the under layer
   *  simply doesn't draw — the city keeps its face. */
  private drawTierVeil(world: World, vw: number, vh: number): void {
    const tiers = world.zone.tiers;
    if (!tiers || tiers.exposure !== 'covered') return;
    if ((world.player?.tier ?? 0) !== 1) return;
    const wf = world.walk;
    if (!wf?.regionAt) return;
    const ctx = this.ctx;
    const cs = (wf as { cell?: number; cellSize?: number }).cell
      ?? (wf as { cellSize?: number }).cellSize ?? 30;
    const x0 = this.cam.x, y0 = this.cam.y;
    ctx.fillStyle = 'rgba(6,8,6,0.82)';
    ctx.fillRect(x0, y0, vw, vh);
    const gx0 = Math.floor(x0 / cs), gy0 = Math.floor(y0 / cs);
    const gx1 = Math.ceil((x0 + vw) / cs), gy1 = Math.ceil((y0 + vh) / cs);
    // ONE COHERENT TUNNEL, not cell confetti (the sewerworks schema worn by
    // the drains): duct floors lay flagstone-toned slabs (world-hashed jitter
    // so the pattern is seam-stable), tunnel WALL FACES bake as coursed
    // sewer-stone bands wherever the duct meets earth (drawn per boundary
    // EDGE, so runs read as continuous masonry), crossings glow with the
    // street-light falling down their stair.
    const floorAt = (gx: number, gy: number): { rk: ReturnType<typeof regionKind>; link: boolean } | null => {
      const rk = regionKind(wf.regionAt!(gx * cs + cs / 2, gy * cs + cs / 2));
      if (!rk || (rk.tier !== 1 && !rk.tierLink)) return null;
      return { rk, link: !!rk.tierLink };
    };
    const jit = (gx: number, gy: number): number => {
      const n = Math.sin(gx * 127.1 + gy * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const f = floorAt(gx, gy);
        if (!f) continue;
        const x = gx * cs, y = gy * cs;
        // FLOOR: two flagstone tones off the world hash + a wet seam line.
        const h = jit(gx, gy);
        const base = f.rk!.tierVisual?.fill ?? '#1e2620';
        ctx.fillStyle = base;
        ctx.fillRect(x, y, cs + 0.5, cs + 0.5);
        ctx.fillStyle = h > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.14)';
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
        if (h > 0.82) { // the odd wet slick catching the dark
          ctx.fillStyle = 'rgba(120,180,150,0.07)';
          ctx.fillRect(x + cs * 0.2, y + cs * 0.3, cs * 0.6, cs * 0.4);
        }
        // WALL FACES: every edge against non-tunnel earth is coursed stone —
        // a band + brick seams, drawn INTO the floor cell so runs join up.
        const wallBand = (dx: number, dy: number): void => {
          const t = Math.max(5, cs * 0.24);
          const wx = dx === 0 ? x : (dx > 0 ? x + cs - t : x);
          const wy = dy === 0 ? y : (dy > 0 ? y + cs - t : y);
          const ww = dx === 0 ? cs + 0.5 : t;
          const wh = dy === 0 ? cs + 0.5 : t;
          ctx.fillStyle = '#26302a';
          ctx.fillRect(wx, wy, ww, wh);
          ctx.fillStyle = 'rgba(0,0,0,0.4)'; // mortar seams — the coursed read
          if (dx === 0) {
            for (let k = 0; k < 3; k++) ctx.fillRect(x + ((k + (gy % 2) * 0.5) / 3) * cs, wy, 1.4, wh);
          } else {
            for (let k = 0; k < 3; k++) ctx.fillRect(wx, y + ((k + (gx % 2) * 0.5) / 3) * cs, ww, 1.4);
          }
          ctx.fillStyle = '#54745c'; // the waterline highlight where wall meets floor
          if (dy < 0) ctx.fillRect(x, wy + wh - 1.6, cs + 0.5, 1.6);
          else if (dy > 0) ctx.fillRect(x, wy, cs + 0.5, 1.6);
          else if (dx < 0) ctx.fillRect(wx + ww - 1.6, y, 1.6, cs + 0.5);
          else ctx.fillRect(wx, y, 1.6, cs + 0.5);
        };
        if (!floorAt(gx, gy - 1)) wallBand(0, -1);
        if (!floorAt(gx, gy + 1)) wallBand(0, 1);
        if (!floorAt(gx - 1, gy)) wallBand(-1, 0);
        if (!floorAt(gx + 1, gy)) wallBand(1, 0);
        if (f.link) {
          // The way out: street-light falls down the stair mouth.
          const g2 = ctx.createRadialGradient(x + cs / 2, y + cs / 2, 0, x + cs / 2, y + cs / 2, cs * 1.4);
          g2.addColorStop(0, 'rgba(210,228,238,0.22)');
          g2.addColorStop(1, 'rgba(210,228,238,0)');
          ctx.fillStyle = g2;
          ctx.fillRect(x - cs, y - cs, cs * 3, cs * 3);
        }
      }
    }
    // The hero's own lamp: a soft pool so the near tunnel reads (the light
    // layer sits under this veil — the pool is the veil's own mercy).
    const pp = world.player!.pos;
    const lp = ctx.createRadialGradient(pp.x, pp.y, 0, pp.x, pp.y, 220);
    lp.addColorStop(0, 'rgba(232,220,180,0.14)');
    lp.addColorStop(1, 'rgba(232,220,180,0)');
    ctx.fillStyle = lp;
    ctx.fillRect(pp.x - 230, pp.y - 230, 460, 460);
  }

  /** How readable a label anchored at this POINT may be (0..1), keyed on the
   *  live canopy/roof fades over it. 1 = nothing covers the anchor (or its
   *  cover has faded open — the near-fade that reveals the body reveals the
   *  words); 0 = an opaque crown/roof conceals body and text alike. The
   *  canopy disc rule (center within radius) matches World.isShaded and the
   *  AI's shade checks — one under-a-crown contract everywhere; a crown's
   *  painted overhang past its radius covers only anchors that already read
   *  as substantially outside it. Point-based so any future world-anchored
   *  text (doodad prompts, ground marks) can ride the same gate. */
  private labelRevealAt(world: World, pos: Vec2): number {
    const L = VIS_CFG.labels;
    let reveal = 1;
    for (const c of this.frameOccluders) {
      if (dist(pos, c.o.pos) > c.o.radius) continue;
      reveal = Math.min(reveal, clamp((L.hideAt - c.fade) / (L.hideAt - L.showAt), 0, 1));
      if (reveal <= 0) return 0;
    }
    for (const st of world.structures) {
      const under = st.roofs.some(r =>
        pos.x > r.x && pos.x < r.x + r.w && pos.y > r.y && pos.y < r.y + r.h);
      if (!under) continue;
      const fade = this.roofFade.get(st.id) ?? roofStyle(st.roofStyle).alpha;
      reveal = Math.min(reveal, clamp((L.hideAt - fade) / (L.hideAt - L.showAt), 0, 1));
      if (reveal <= 0) return 0;
    }
    // THE POSITIONAL VEILS (room veil + sight veil) gate text through THE
    // LEGIBILITY KNEE (VIS_CFG.labels.veilLegible/veilConceal), not a linear
    // dimmer. A wall's half-shadow is a STANDING state — unlike the canopy/
    // roof fades above, which animate open in under a second — and a line
    // held at 50% alpha over the dark is the worst of both worlds: illegible
    // AND leaking. Below the knee the words draw WHOLE (the stroke keeps
    // bright ink readable over any dark); past it not one glyph survives
    // (the no-leak contract unchanged); between them one narrow smoothstep
    // band so a walking eye fades the line, never strobes it.
    const conceal = Math.max(this.roomVeil.veiledAt(pos), this.sightVeil.occludedAt(pos));
    if (conceal > 0) {
      const t = clamp((conceal - L.veilLegible) / (L.veilConceal - L.veilLegible), 0, 1);
      reveal = Math.min(reveal, 1 - t * t * (3 - 2 * t));
    }
    return reveal;
  }

  private drawLabels(world: World): void {
    if (!this.labels.length) return;
    const { ctx } = this;
    // One reveal per anchor per frame — an anchor usually wears 1-2 lines.
    const reveals = new Map<object, number>();
    ctx.save();
    ctx.textAlign = 'center';
    for (const L of this.labels) {
      let r = reveals.get(L.key);
      if (r === undefined) { r = this.labelRevealAt(world, L.probe); reveals.set(L.key, r); }
      if (r <= 0.02) continue;
      ctx.globalAlpha = r;
      ctx.font = L.font;
      if (L.stroke) {
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(L.text, L.x, L.y);
      }
      ctx.fillStyle = L.color;
      ctx.fillText(L.text, L.x, L.y);
    }
    ctx.restore();
    this.labels.length = 0;
  }

  // --- FAKE-2D DEPTH: canopies above actors, proximity-faded -----------------
  // Tall doodads whose DOODAD_RULES row carries `occlude` draw AFTER the actor
  // pass: walk under a tree and its crown covers you — until you're close, when
  // it fades so your character reads through the foliage (the depth illusion
  // without a real z-axis). Fade is smoothed per doodad; enemies lurking under
  // an unfaded canopy stay hidden, which is the ambush half of the feature.
  //
  // VEIL kinds (DoodadRule.veil, engine/veil.ts) escalate this to the PATCH:
  // their crowns merge into contiguous canopy masses, and the PATCH drives the
  // crown's target alpha — sealed near-opaque cover until the LOCAL hero
  // stands under the same mass, when the whole patch opens together. The
  // per-crown near-fade still composes in (min), so the tree directly overhead
  // always opens a little further and an eave can be peeked under from just
  // outside. Every crown smooths individually toward the shared target, so a
  // patch fades as one body with no extra state.
  private canopyFade = new WeakMap<object, number>();
  /** This frame's occluders with their smoothed fades — collected by
   *  drawCanopies for the label pass (one loop, two customers). */
  private frameOccluders: { o: Doodad; fade: number }[] = [];
  /** The sealed-roof composite (vis/canopy.ts): static veil crowns flatten
   *  into chunk slices drawn at the patch's shared alpha. */
  private canopySlices = new CanopySlices();

  /** THE ROOM VEIL (vis/roomVeil.ts): interior vision confinement — inside a
   *  confining structure, the world beyond the room veils dark. */
  private roomVeil = new RoomVeil();

  /** THE SIGHT VEIL (vis/sightVeil.ts): positional occlusion shadows — from
   *  the hero's eye, every sight-blocking body (trunks, boulders, rampart
   *  lines, cave walls) throws unseen-dark behind itself. Render-only; the
   *  engine's LoS ray stays the gameplay truth. */
  private sightVeil = new SightVeil();

  /** CANOPY EYES (vis/canopyEyes.ts): the sealed roof's blinking regard —
   *  present only where nobody is near enough to check. Kinds opt in via
   *  DoodadVisualDef.canopy.eyes (the Gloamwood's oak wears it first). */
  private canopyEyesPass = new CanopyEyes();

  /** WALL EYES (vis/wallEyes.ts): live pupils for the watching shell —
   *  eyes-flagged wall regions (the Ocular's ocular_wall) seek the hero. */
  private wallEyesPass = new WallEyes();
  private drawCanopyEyes(world: World): void {
    const groups: EyedGroup[] = [];
    for (const [kind, list] of this.culled) {
      const eyes = DOODAD_VISUALS[kind]?.canopy?.eyes;
      if (eyes && list.length) groups.push({ spec: eyes, list });
    }
    if (groups.length) this.canopyEyesPass.draw(this.ctx, world, this.frameDt, groups);
  }

  private drawCanopies(world: World): void {
    const hero = world.player;
    const dt = this.frameDt;
    const env: PaintEnv = { ctx: this.ctx, theme: world.zone.theme, time: world.time, world };
    this.frameOccluders.length = 0;
    const veils = world.veilIndex();
    const heroPatch = veils.patches.length ? veils.patchAt(hero.pos.x, hero.pos.y) : null;
    const composite = VIS_CFG.canopy.composite && VIS_CFG.canopy.bakeCrowns
      && !VIS_ABLATE.has('canopyslices');
    this.canopySlices.begin(dt, world);
    for (const o of this.culledAll) {
      const rule = doodadRuleOf(o.kind);
      const occ = rule.occlude;
      const veil = rule.veil;
      if (!occ && !veil) continue;
      const near = dist(hero.pos, o.pos) < o.radius + hero.radius + (occ?.pad ?? 10);
      let target = near ? (occ?.alpha ?? 0.32) : 1;
      const patch = veil ? veils.patchOf(o) : null;
      let patchTarget = 1;
      if (veil && patch) {
        patchTarget = patch === heroPatch
          ? (veil.reveal ?? VEIL_DEFAULTS.reveal)
          : (veil.cover ?? VEIL_DEFAULTS.cover);
        target = Math.min(target, patchTarget);
      }
      const cur = this.canopyFade.get(o) ?? 1;
      let fade = cur + (target - cur) * Math.min(1, dt * VIS_CFG.canopy.fadeRate);
      // Crown looks come from the SAME registry entry as the ground pass —
      // a kind with no canopy def gets the translucent disc. A kind may opt
      // its crowns OUT of the bake (canopy.live — the cut contract: growth
      // that yields to the blade BREATHES). Sparse kinds only by doctrine;
      // the bake stays the rule for sealed forests.
      const cdef = DOODAD_VISUALS[o.kind]?.canopy;
      const name = cdef?.painter ?? 'discCrown';
      const bakeable = VIS_CFG.canopy.bakeCrowns && !!CANOPY_STATIC[name] && !cdef?.live;
      let handled = false;
      // THE COMPOSITE CLAIM: a static veil crown joins its patch's slices and
      // adopts the group's shared alpha (drawn in one blit below) unless the
      // hero's near-fade legitimately pulls it away — then it draws itself.
      if (composite && bakeable && veil && patch) {
        const adopted = this.canopySlices.claim(patch, veil, o, fade, patchTarget, near);
        if (adopted !== null) { fade = adopted; handled = true; }
      }
      this.canopyFade.set(o, fade);
      this.frameOccluders.push({ o, fade });
      if (handled) continue;
      if (bakeable) {
        // params must be the REGISTRY object (or the shared empty) — a fresh
        // `{}` per frame would mint a fresh bake key per frame and re-bake
        // every crown every frame (it did: 250ms forests).
        blitCrown(this.ctx, world.zone.theme, o, name, cdef?.params ?? EMPTY_PARAMS, fade);
      } else {
        const painter = CANOPY_PAINTERS[name] ?? CANOPY_PAINTERS.discCrown;
        painter(env, o, fade, cdef?.params ?? {});
      }
    }
    // The flattened roofs: every active group's visible slices at its shared
    // alpha (missing slices bake under budget, standing in per-crown).
    this.canopySlices.draw(this.ctx, world.zone.theme, this.cam.x, this.cam.y,
      this.canvas.width / this.zoom, this.canvas.height / this.zoom);
  }

  // --- ROOF REVEAL: interiors as pseudo fog of war ----------------------------
  // Each placed structure's roof rects draw over everything in the world layer.
  // Step under one and the whole structure's roofing fades to a sliver — the
  // interior (and whoever waits inside) reveals only when YOU are inside,
  // detached from any vision/light radius. Per-structure smoothed fade.
  private roofFade = new Map<string, number>();
  private roofFadeStructs: World['structures'] | null = null;
  /** THE HULL LAW's per-frame roof-rect list (standing roofs — fed to the
   *  sight veil so their coverage reads solid from outside). Reused. */
  private hullRects: { x: number; y: number; w: number; h: number }[] = [];

  private drawRoofs(world: World): void {
    if (!world.structures.length) return;
    const { ctx } = this;
    // Reset the fades on ARRAY IDENTITY, not zone id: a co-op client's
    // world.zone.id never changes on applyZone, and structure ids repeat
    // across zones (grand_castle#0) — but both loadZone and applyZone replace
    // the structures array itself.
    if (this.roofFadeStructs !== world.structures) { this.roofFade.clear(); this.roofFadeStructs = world.structures; }
    const hero = world.player;
    const dt = this.frameDt;
    const M = 8; // reveal margin: standing in a doorway already lifts the roof
    for (const st of world.structures) {
      if (!st.roofs.length) continue;
      const style = roofStyle(st.roofStyle);
      const inside = st.roofs.some(r =>
        hero.pos.x > r.x - M && hero.pos.x < r.x + r.w + M
        && hero.pos.y > r.y - M && hero.pos.y < r.y + r.h + M);
      const target = inside ? 0.06 : style.alpha;
      const cur = this.roofFade.get(st.id) ?? style.alpha;
      const fade = cur + (target - cur) * Math.min(1, dt * 8);
      this.roofFade.set(st.id, fade);
      if (fade < 0.03) continue;
      ctx.globalAlpha = fade;
      for (const r of st.roofs) {
        ctx.fillStyle = style.fill;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        // PITCHED READ: the two roof planes shade off a ridge down the long
        // axis — lit side toward the global light, shaded side away — so
        // roofs stop reading as flat lids. Derived from the style's own fill.
        const lit = shade(style.fill, 0.16), dark = shade(style.fill, -0.22);
        ctx.globalAlpha = fade * 0.55;
        if (r.w >= r.h) {
          ctx.fillStyle = lit; ctx.fillRect(r.x, r.y, r.w, r.h / 2);
          ctx.fillStyle = dark; ctx.fillRect(r.x, r.y + r.h / 2, r.w, r.h / 2);
        } else {
          ctx.fillStyle = lit; ctx.fillRect(r.x, r.y, r.w / 2, r.h);
          ctx.fillStyle = dark; ctx.fillRect(r.x + r.w / 2, r.y, r.w / 2, r.h);
        }
        // Ridge line.
        ctx.globalAlpha = fade * 0.7;
        ctx.strokeStyle = shade(style.fill, 0.3);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (r.w >= r.h) { ctx.moveTo(r.x + 3, r.y + r.h / 2); ctx.lineTo(r.x + r.w - 3, r.y + r.h / 2); }
        else { ctx.moveTo(r.x + r.w / 2, r.y + 3); ctx.lineTo(r.x + r.w / 2, r.y + r.h - 3); }
        ctx.stroke();
        ctx.globalAlpha = fade;
        ctx.strokeStyle = style.edge;
        ctx.lineWidth = 3;
        ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.w - 3, r.h - 3);
        // A cheap material pattern: plank/shingle lines along the short axis.
        ctx.lineWidth = 1;
        ctx.globalAlpha = fade * 0.45;
        if (r.w >= r.h) {
          for (let x = r.x + 12; x < r.x + r.w; x += 12) {
            ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke();
          }
        } else {
          for (let y = r.y + 12; y < r.y + r.h; y += 12) {
            ctx.beginPath(); ctx.moveTo(r.x, y); ctx.lineTo(r.x + r.w, y); ctx.stroke();
          }
        }
        ctx.globalAlpha = fade;
      }
      ctx.globalAlpha = 1;
      // ROOFS WEAR THE VEIL: the shadow sheet re-composites over this
      // structure's roofing (× its fade), so a building standing in the
      // dark is dark ROOF AND ALL — one contiguous mass, not a bright lid
      // floating over its own shadow (VIS_CFG.sightVeil.roofMul; 0 restores
      // the old skyline-stays-lit doctrine).
      const roofVeil = VIS_CFG.sightVeil.roofMul * fade;
      if (roofVeil > 0.02) this.sightVeil.compositeOver(ctx, st.roofs, roofVeil);
    }
  }

  /** Chests: trimmed boxes — locked, picking, or sprung open. */
  private drawChests(world: World): void {
    const { ctx } = this;
    for (const c of world.chests) {
      const { x, y } = c.pos;
      ctx.fillStyle = c.opened ? '#5a4426' : '#7a5c32';
      ctx.strokeStyle = '#e8c87a';
      ctx.lineWidth = 2;
      ctx.fillRect(x - 14, y - 10, 28, 20);
      ctx.strokeRect(x - 14, y - 10, 28, 20);
      // Lid
      ctx.fillStyle = c.opened ? '#46351e' : '#8a6a3a';
      ctx.fillRect(x - 14, y - 10, 28, c.opened ? 4 : 8);
      if (!c.opened) {
        if (c.kind === 'objective' && !world.objectiveDone) {
          // chained until the zone yields
          ctx.strokeStyle = '#9a9aa2';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x - 16, y - 6); ctx.lineTo(x + 16, y + 6);
          ctx.moveTo(x - 16, y + 6); ctx.lineTo(x + 16, y - 6);
          ctx.stroke();
          ctx.textAlign = 'center';
          ctx.font = '9px Verdana';
          ctx.fillStyle = '#9a9aa2';
          ctx.fillText('sealed by the objective', x, y + 24);
        } else if (c.kind === 'timed') {
          // lockpick progress ring (the shared transit ring, 'lockpick' style)
          this.drawProgressRing(x, y, 1 - c.lockTime / c.maxLock, 'lockpick');
          ctx.textAlign = 'center';
          ctx.font = '9px Verdana';
          ctx.fillStyle = '#c8a85a';
          ctx.fillText('hold the ground', x, y + 24);
        } else {
          ctx.textAlign = 'center';
          ctx.font = '9px Verdana';
          ctx.fillStyle = '#e8c87a';
          ctx.fillText('unsealed!', x, y + 24);
        }
      }
    }
  }

  /** Shrines: a form-rolled stone plinth (menhir or stepped table) carved
   *  with the buff's own runes, a gift-orb breathing over it and motes
   *  rising to meet it — dark, cracked, and orbless once drunk. Dressed in
   *  the same stone ramp the world's rock wears; never a grey rect again. */
  private drawShrines(world: World): void {
    const { ctx } = this;
    const t = world.time;
    for (const s of world.shrines) {
      const seed = ((s.pos.x * 13 + s.pos.y * 7) | 0) >>> 0;
      const ramp = rampOf('#5a5a66', materialOf('stone'));
      const color = s.used ? '#4a4a52' : s.def.color;
      const x = s.pos.x, y = s.pos.y;
      drawShadow(ctx, x, y + 2, 15, 0.5);
      const menhir = hash01(seed, 9) < 0.4;
      const base = s.used ? shade(ramp.base, -0.25) : ramp.base;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((hash01(seed, 3) - 0.5) * 0.3);
      if (menhir) {
        // A standing stone, tapered, lit along the sun edge.
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.moveTo(-9, 10); ctx.lineTo(-7, -12); ctx.lineTo(-1, -16); ctx.lineTo(7, -11); ctx.lineTo(9, 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = withAlpha(ramp.outline, 0.9);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.strokeStyle = withAlpha(ramp.light, s.used ? 0.2 : 0.5);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-8, 8); ctx.stroke();
      } else {
        // A two-course table plinth with a chisel-lit top.
        ctx.fillStyle = shade(base, -0.12);
        ctx.fillRect(-13, -2, 26, 13);
        ctx.fillStyle = base;
        ctx.fillRect(-10, -9, 20, 12);
        ctx.strokeStyle = withAlpha(ramp.outline, 0.9);
        ctx.lineWidth = 1.3;
        ctx.strokeRect(-13, -2, 26, 13);
        ctx.strokeRect(-10, -9, 20, 12);
        ctx.fillStyle = withAlpha(ramp.light, s.used ? 0.15 : 0.4);
        ctx.fillRect(-10, -9, 20, 3);
      }
      // Carved runes wearing the buff's color — dim ash once drunk.
      ctx.globalAlpha = s.used ? 0.25 : 0.6 + 0.25 * Math.sin(t * 2.1 + seed);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        const rx = -6 + i * 6, ry = menhir ? -4 + (i % 2) * 4 : 0;
        ctx.beginPath();
        ctx.moveTo(rx - 1.6, ry + 2.4);
        ctx.lineTo(rx + (hash01(i, seed + 7) - 0.5) * 2, ry - 2.4);
        ctx.lineTo(rx + 1.8, ry + 1.2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      if (s.used) {
        // A spent stone keeps the seam where the light left it.
        ctx.strokeStyle = withAlpha('#1a1a20', 0.7);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 12); ctx.lineTo(x + 1, y - 4); ctx.lineTo(x - 2, y + 6);
        ctx.stroke();
      } else {
        // The gift: an orb breathing over the stone, motes rising to meet it.
        const oy = y - 18 + Math.sin(t * 1.6 + seed) * 1.6;
        const g = ctx.createRadialGradient(x, oy, 0, x, oy, 15);
        g.addColorStop(0, withAlpha(color, 0.34 + 0.1 * Math.sin(t * 3 + seed)));
        g.addColorStop(1, withAlpha(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, oy, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, oy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = withAlpha('#ffffff', 0.75);
        ctx.beginPath(); ctx.arc(x - 1.8, oy - 2, 2, 0, Math.PI * 2); ctx.fill();
        for (let i = 0; i < 3; i++) {
          const cyc = (t * 0.5 + i / 3 + hash01(i, seed) * 0.2) % 1;
          ctx.globalAlpha = (1 - cyc) * 0.7;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x + Math.sin(i * 2.1 + t) * 7, y + 4 - cyc * 26, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.font = '10px Verdana';
        ctx.fillStyle = color;
        ctx.fillText(s.def.name, x, y + 26);
      }
    }
  }

  /** Altars: a dressed stone slab under the god's cloth runner and a burning
   *  sigil, warden stones marking the quarters of the standing field everyone
   *  inside answers to. */
  private drawAltars(world: World): void {
    const { ctx } = this;
    const t = world.time;
    for (const al of world.altars) {
      const { color, radius, name } = al.def;
      const seed = ((al.pos.x * 13 + al.pos.y * 7) | 0) >>> 0;
      const ramp = rampOf('#565662', materialOf('stone'));
      const x = al.pos.x, y = al.pos.y;
      // The field: a soft-edged wash, brightest at its rim.
      const fg = ctx.createRadialGradient(x, y, radius * 0.4, x, y, radius);
      fg.addColorStop(0, withAlpha(color, 0.02));
      fg.addColorStop(0.85, withAlpha(color, 0.06 + 0.02 * Math.sin(t * 2)));
      fg.addColorStop(1, withAlpha(color, 0));
      ctx.fillStyle = fg;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(x, y, radius, t * 0.15, t * 0.15 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // Warden stones at the field's quarters, each holding a spark.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.6 + (hash01(i, seed) - 0.5) * 0.3;
        const sx = x + Math.cos(a) * radius * 0.94, sy = y + Math.sin(a) * radius * 0.94;
        ctx.fillStyle = shade(ramp.base, -0.1);
        ctx.beginPath();
        ctx.ellipse(sx, sy, 4.5, 5.5, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = withAlpha(ramp.outline, 0.8);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = withAlpha(color, 0.5 + 0.3 * Math.sin(t * 2.4 + i));
        ctx.beginPath(); ctx.arc(sx, sy, 1.4, 0, Math.PI * 2); ctx.fill();
      }
      // The altar itself: foot course, slab, chisel light.
      drawShadow(ctx, x, y + 3, 15, 0.5);
      ctx.fillStyle = shade(ramp.base, -0.14);
      ctx.fillRect(x - 14, y - 2, 28, 13);
      ctx.fillStyle = ramp.base;
      ctx.fillRect(x - 12, y - 11, 24, 14);
      ctx.strokeStyle = withAlpha(ramp.outline, 0.9);
      ctx.lineWidth = 1.3;
      ctx.strokeRect(x - 14, y - 2, 28, 13);
      ctx.strokeRect(x - 12, y - 11, 24, 14);
      ctx.fillStyle = withAlpha(ramp.light, 0.4);
      ctx.fillRect(x - 12, y - 11, 24, 3);
      // The runner: the god's color laid across the stone.
      ctx.fillStyle = withAlpha(shade(color, -0.25), 0.9);
      ctx.fillRect(x - 4, y - 13, 8, 18);
      ctx.fillStyle = withAlpha(shade(color, 0.15), 0.8);
      ctx.fillRect(x - 4, y - 13, 8, 2);
      // The sigil burning over the runner.
      const pulse = 0.55 + 0.3 * Math.sin(t * 2.2 + seed);
      ctx.strokeStyle = withAlpha(color, pulse);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y - 4, 4.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y - 8.2); ctx.lineTo(x + 3.8, y - 1.4); ctx.lineTo(x - 3.8, y - 1.4);
      ctx.closePath();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px Verdana';
      ctx.fillStyle = color;
      ctx.fillText(name, x, y + 32);
    }
  }

  /** Zone portals: a pulsing ring with the destination written below. */
  /** The town campfire's "linger to refresh" prompt + a warm inviting ring while
   *  the player rests near it (the fire itself is a campfire doodad). */
  private drawCampfireHint(world: World): void {
    // Both town linger-prompts share one draw: the campfire (warm) and the
    // salvage bench (steel) — a pulsing ring + a named invitation.
    const hints: { h: { pos: Vec2; text: string } | null; ring: string; ink: string }[] = [
      { h: world.campfireHint(), ring: '#ff9a3a', ink: '#ffc878' },
      { h: world.salvageHint(), ring: '#7a9ae8', ink: '#aac0f0' },
      { h: world.oracleHint(), ring: '#b06bd4', ink: '#d0a8e8' },
      { h: world.trackerHint(), ring: '#a8c87a', ink: '#c8e0a8' },
      { h: world.extractionHint(), ring: '#a5e3b4', ink: '#c8f0d4' },
      { h: world.boroughHint(), ring: '#e8c87a', ink: '#f0dfae' },
    ];
    const { ctx } = this;
    const t = world.time;
    for (const { h, ring, ink } of hints) {
      if (!h) continue;
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3);
      ctx.strokeStyle = ring;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(h.pos.x, h.pos.y, 26 + 2 * Math.sin(t * 3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Verdana';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(h.text, h.pos.x, h.pos.y - 36);
      ctx.fillStyle = ink;
      ctx.fillText(h.text, h.pos.x, h.pos.y - 36);
      ctx.restore();
    }
  }

  private drawExits(world: World): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    for (const e of world.exits) {
      const locked = world.isExitLocked(e);
      // A BOUNDARY-GATE exit answers in its enclave's color (the gate row's
      // accent), not the zone's — the crossing reads as somewhere ELSE from
      // both sides of the wall. Data: data/boundaryGates.ts.
      const bg = !locked ? boundaryGateOf(e.boundary) : undefined;
      const accent = locked ? '#6a6a72' : bg?.accent ?? world.zone.theme.accent;
      const pulse = locked ? 1 : 1 + 0.06 * Math.sin(t * 2.4);
      // Soft glow
      ctx.globalAlpha = 0.12 + 0.04 * Math.sin(t * 2.4);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Disc + double ring
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius * 0.62 * pulse, t, t + Math.PI * 1.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Destination label — queued into the post-veil label pass: a name the
      // player is entitled to read draws WHOLE above the sight veil (never a
      // half-dimmed ghost), and one the world still conceals stays concealed
      // to the last glyph (labelRevealAt, the legibility knee).
      const label = locked ? `${e.label} — sealed` : e.label;
      this.queueLabelAt(e, e.pos, e.pos.x, e.pos.y + e.radius + 20, label, accent,
        { font: 'bold 12px Verdana' });
      if (locked) {
        // A simple padlock glyph over the disc.
        ctx.strokeStyle = '#9a9aa2';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(e.pos.x - 7, e.pos.y - 3, 14, 11);
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y - 4, 5, Math.PI, 0);
        ctx.stroke();
      } else if (bg) {
        // A small arch glyph over the disc (the padlock idiom): two jambs +
        // the span — "a gate stands here", legible at any zoom.
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(e.pos.x - 7, e.pos.y + 7);
        ctx.lineTo(e.pos.x - 7, e.pos.y - 2);
        ctx.arc(e.pos.x, e.pos.y - 2, 7, Math.PI, 0);
        ctx.lineTo(e.pos.x + 7, e.pos.y + 7);
        ctx.stroke();
      }
    }
    // DIMENSION-GATE labels (World.dimGatesView): a standing realm gate is
    // marked exactly like an exit — destination name in the realm's accent
    // under the arch — so the ascendant gate reads as "an exit to the
    // Firmament", never anonymous decor. The doodad painter keeps the art.
    for (const g of world.dimGatesView()) {
      this.queueLabelAt(g, g.pos, g.pos.x, g.pos.y + g.radius + 20, g.label, g.accent,
        { font: 'bold 12px Verdana' });
    }
    // Dwell progress rings — every "linger to act" family (exit portals, cave
    // mouths, realm gates, doors, toll keepers, descent platforms, …) feeds ONE
    // pass; each ring's radius/width/color is its transit KIND's data row
    // (data/transit.ts), color falling back to the zone theme's accent.
    for (const ring of world.dwellRingsView()) {
      this.drawProgressRing(ring.pos.x, ring.pos.y, ring.frac, ring.kind, world.zone.theme.accent);
    }
    // MAKE LANDFALL — the landing dwell at sea: the shared ring around the boat
    // plus a shore prompt (the Voyage's exit rule). A Voyage Island names itself.
    const ndw = world.voyageLandingView();
    if (ndw) {
      this.drawProgressRing(ndw.pos.x, ndw.pos.y, ndw.frac, 'voyage_landing', world.zone.theme.accent);
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Verdana';
      const msg = !ndw.ready ? 'coming about…'
        : ndw.isle ? `linger to land on ${ndw.isle}…` : 'linger to make landfall…';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(msg, ndw.pos.x, ndw.pos.y - 46);
      ctx.fillStyle = '#9ad0e8';
      ctx.fillText(msg, ndw.pos.x, ndw.pos.y - 46);
    }
    // The toll keeper posts its offer above its head while you're near (and un-roused).
    const tp = world.holdfastTollPrompt();
    if (tp) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Verdana';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(tp.text, tp.pos.x, tp.pos.y);
      ctx.fillStyle = '#e8c87a';
      ctx.fillText(tp.text, tp.pos.x, tp.pos.y);
    }
  }

  /** Trace a circle / square / triangle / crescent / sector area outline
   *  (aoeShape values). */
  private traceAoe(x: number, y: number, radius: number, shape?: number, facing = 0, arcRad?: number): void {
    const { ctx } = this;
    if (shape && shape >= 4) {
      // Sector: a full PIE wedge — the crescent without its hollow heart
      // (Scythe Arc's no-deadzone harvest).
      const half = (arcRad ?? 110 * Math.PI / 180) / 2;
      ctx.moveTo(x, y);
      ctx.arc(x, y, radius, facing - half, facing + half);
      ctx.closePath();
    } else if (shape && shape >= 3) {
      // Crescent: an annular sector aimed along facing (inner rim 0.55R —
      // must match the inAoe hit test's CRESCENT_INNER).
      const half = (arcRad ?? 110 * Math.PI / 180) / 2;
      ctx.arc(x, y, radius, facing - half, facing + half);
      ctx.arc(x, y, radius * 0.55, facing + half, facing - half, true);
      ctx.closePath();
    } else if (shape && shape >= 2) {
      const R = radius * 1.25;
      ctx.moveTo(x + Math.cos(facing) * R, y + Math.sin(facing) * R);
      for (let i = 1; i < 3; i++) {
        const a = facing + i * (Math.PI * 2 / 3);
        ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
      }
      ctx.closePath();
    } else if (shape && shape >= 1) {
      ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
    } else {
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    }
  }

  private drawZones(world: World): void {
    const { ctx } = this;
    // TELEGRAPHED LEAPS (LeapDelivery.telegraph): a diving body's landing
    // ring, painted at its dest for the whole flight — the un-exploded-disc
    // grammar (outline + faint fill) firming through the drop, so a stoop
    // reads exactly as urgently as it is. Drawn where it WILL land: the
    // leap's own interpolation guarantees the arrival.
    for (const a of world.actors) {
      const L = a.leap;
      if (!L?.telegraph || a.dead) continue;
      const t = Math.max(0, Math.min(1, 1 - L.timer / L.total));
      ctx.beginPath();
      ctx.arc(L.dest.x, L.dest.y, L.radius, 0, Math.PI * 2);
      ctx.strokeStyle = L.telegraph.color;
      ctx.globalAlpha = 0.45 + 0.35 * t;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 0.07 + 0.15 * t;
      ctx.fillStyle = L.telegraph.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const z of world.zones) {
      // FISSURE FRACTURES (Zone.seg): the crack IS the hitbox — a jagged
      // line the capsule's width, not a disc. Deterministic jitter (seeded
      // off the segment's own coordinates) keeps every frame's crack the
      // same crack. Volatile segments run hot; armed aftershock segments
      // glow gold for the run-over game.
      if (z.seg) {
        const s = z.seg;
        const dx = s.bx - s.ax, dy = s.by - s.ay;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        const seed = (s.ax * 13.37 + s.ay * 7.77) % Math.PI;
        const armed = z.exploded && z.linger > 0
          && ((z.aftershock && world.time >= z.aftershock.readyAt)
            || (z.roulette && world.time < z.roulette.armedUntil));
        const hot = z.volatile && z.exploded && z.linger > 0;
        ctx.beginPath();
        ctx.moveTo(s.ax, s.ay);
        for (let k = 1; k <= 3; k++) {
          const t = k / 4;
          const off = Math.sin(seed + k * 2.4) * z.radius * 0.55;
          ctx.lineTo(s.ax + dx * t + nx * off, s.ay + dy * t + ny * off);
        }
        ctx.lineTo(s.bx, s.by);
        if (!z.exploded) {
          ctx.strokeStyle = z.color;
          ctx.globalAlpha = 0.4;
          ctx.lineWidth = 2;
        } else if (armed) {
          // ARMED (Tectonic Echoes / the waltz): a LIGHTER gradient of the
          // skill's own color, gently pulsing — readable as "step here",
          // never a palette hijack.
          ctx.strokeStyle = shade(z.color, 0.45);
          ctx.globalAlpha = 0.55 + 0.25 * Math.sin(world.time * 5 + seed);
          ctx.lineWidth = Math.max(3, z.radius * 0.65);
        } else if (hot) {
          // VOLATILE (Volcanic Heart): the live sections run a DARKER shade
          // of the same skill color — banked heat, not a second skin.
          ctx.strokeStyle = shade(z.color, -0.3);
          ctx.globalAlpha = 0.65;
          ctx.lineWidth = Math.max(3, z.radius * 0.55);
        } else {
          ctx.strokeStyle = z.color;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = Math.max(3, z.radius * 0.5);
        }
        ctx.stroke();
        // The molten heart: a thin pale core down the same jag — in the
        // skill's own family, brightest where the crack is armed.
        if (z.exploded) {
          ctx.globalAlpha = armed ? 0.7 : 0.45;
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = shade(z.color, armed ? 0.85 : 0.7);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.beginPath();
      this.traceAoe(z.pos.x, z.pos.y, z.radius, z.shape, z.facing, z.arcRad);
      if (!z.exploded) {
        // Telegraph: filling outline.
        ctx.strokeStyle = z.color;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 2;
        ctx.stroke();
        if (z.edgeFrac) {
          // EDGE BAND (the inheritance law): only the ring that will
          // bite washes — the safe eye stays clean at the telegraph,
          // matching the detonation's spare test (drawn == tested).
          const mid = z.radius * (1 + z.edgeFrac) / 2;
          ctx.globalAlpha = 0.15;
          ctx.lineWidth = Math.max(2, z.radius * (1 - z.edgeFrac));
          ctx.beginPath();
          this.traceAoe(z.pos.x, z.pos.y, mid, z.shape, z.facing, z.arcRad);
          ctx.stroke();
        } else {
          ctx.globalAlpha = 0.15;
          ctx.fillStyle = z.color;
          ctx.fill();
        }
      } else if (z.edge && z.edge > 0.02) {
        // Fill-in cage (Pillar of Flame / Wildfire Sweep): only the closing
        // band burns — CLIPPED to the zone's faced shape, so a crescent
        // fill-in draws a crescent band, never a whole phantom circle.
        const mid = z.radius * (1 + z.edge) / 2;
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = z.color;
        ctx.lineWidth = Math.max(3, z.radius * (1 - z.edge));
        ctx.beginPath();
        if (z.shape >= 3) {
          const half = (z.arcRad ?? 110 * Math.PI / 180) / 2;
          ctx.arc(z.pos.x, z.pos.y, mid, z.facing - half, z.facing + half);
        } else {
          // SHAPE-TRUE band (the Pillar of Flame QA): a square cage closes
          // as a square, a triangle as a triangle — the band strokes the
          // zone's own shape at the closing scale, matching the engine's
          // zoneHoleSpares test (drawn == tested, both directions).
          this.traceAoe(z.pos.x, z.pos.y, mid, z.shape, z.facing, z.arcRad);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        this.traceAoe(z.pos.x, z.pos.y, z.radius, z.shape, z.facing, z.arcRad);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = z.color;
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = z.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      // ARMED PULSE (GroundDelivery.pulse): dormant ground CHARGES — a
      // warning ring at the pulse's TRUE reach (radius × radiusMult, the
      // honest-telegraph rule) stands faint the whole dormancy and
      // brightens through the last 0.45s before the beat, in the lighter
      // shade of the skill's own color (the armed-fissure grammar, disc
      // edition — never a palette hijack).
      if (z.exploded && z.pulse && z.pulse.left > 0 && z.linger > 0) {
        const g = Math.max(0, Math.min(1, 1 - (z.pulse.next - world.time) / 0.45));
        ctx.beginPath();
        this.traceAoe(z.pos.x, z.pos.y, z.radius * z.pulse.radiusMult, z.shape, z.facing, z.arcRad);
        ctx.strokeStyle = shade(z.color, 0.45);
        ctx.globalAlpha = 0.14 + 0.55 * g;
        ctx.lineWidth = 1.5 + 2.5 * g;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /** The coalescing death-burst: a GATHER of inward-spiraling motes + a brightening core +
   *  a warning ring (the escape window), then a glowing tracking ORB with a wisp + an arming
   *  blink. The implosion pop + the final blast render via the flashes loop (no code here). */
  private drawDeathBursts(world: World): void {
    const { ctx } = this;
    const t = world.time, now = performance.now();
    for (const b of world.deathBurstsView()) {
      // Refuse non-finite work (same contract as drawFlash): the gradient
      // calls below are the ONE canvas surface that THROWS on a bad number
      // (arcs merely no-op), and a single poisoned burst — baked from a dying
      // actor, or snapshot-fed on a co-op client — must skip, not take the
      // whole frame loop down with it.
      if (!Number.isFinite(b.pos.x + b.pos.y + b.radius + b.t + b.coalesce)) continue;
      // The whole burst is drawn in ONE element colour (b.color = DAMAGE_COLOR[type]) so the
      // hue alone tells the player the damage type — and what resistance/armour to dress.
      // Kept deliberately sparse: a danger ring + a core, not a particle storm, so the read
      // stays clean even with several bursts on screen.
      if (b.phase === 'gather') {
        // 0→1 coalesce progress; a zero-coalesce burst (possible only through
        // poisoned data — the stat floor keeps real ones > 0) draws fully
        // gathered rather than dividing 0/0.
        const g = b.coalesce > 0 ? Math.min(1, b.t / b.coalesce) : 1;
        // PRIMARY CUE: the blast-radius danger ring — "leave this circle". Legible from the
        // first frame (when escape time is greatest) and still firms up (wider, brighter) as
        // the pop nears, so the avoidance read sharpens with the threat.
        ctx.globalAlpha = 0.4 + 0.35 * g; ctx.strokeStyle = b.color; ctx.lineWidth = 2 + 1.5 * g;
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.stroke();
        // Just a few motes spiralling inward — enough to read "energy gathering", not a swarm.
        ctx.fillStyle = b.color;
        for (let k = 0; k < 6; k++) {
          const seed = Math.sin(b.pos.x * 0.7 + b.pos.y * 1.3 + k * 2.3) * 0.5 + 0.5; // deterministic per (pos,k)
          const R = b.radius * 0.85 * (1 - g) + 4;          // tighten inward as g→1
          const a = seed * Math.PI * 2 + t * 2.5 + g * 7;   // accelerating spin
          ctx.globalAlpha = 0.2 + 0.5 * g;
          ctx.beginPath(); ctx.arc(b.pos.x + Math.cos(a) * R, b.pos.y + Math.sin(a) * R, 2 + 2 * g, 0, Math.PI * 2); ctx.fill();
        }
        // Brightening element core — the concentrating energy at ground zero.
        const cr = (3 + 9 * g) * 2.0;
        const grd = ctx.createRadialGradient(b.pos.x, b.pos.y, 0, b.pos.x, b.pos.y, cr);
        grd.addColorStop(0, b.color); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.4 + 0.5 * g; ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, cr, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        // A faint motion wisp so the eye tracks where it's heading.
        for (let k = b.trail.length - 1; k >= 0; k--) {
          const p = b.trail[k];
          ctx.globalAlpha = 0.1 * (1 - k / Math.max(1, b.trail.length));
          ctx.fillStyle = b.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, 7 - k * 2, 0, Math.PI * 2); ctx.fill();
        }
        // The element-coloured sphere — the dominant tell of what it deals.
        const r = 9 + 2.5 * (0.55 + 0.45 * Math.sin(now / 300));
        const grd = ctx.createRadialGradient(b.pos.x, b.pos.y, 0, b.pos.x, b.pos.y, r * 2.2);
        grd.addColorStop(0, b.color); grd.addColorStop(0.55, b.color); grd.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.6; ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, r * 2.2, 0, Math.PI * 2); ctx.fill();
        // A small hot centre — reads as an energy core, kept tiny so the element hue dominates.
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, r * 0.34, 0, Math.PI * 2); ctx.fill();
        // Arming: blink the TRUE blast-radius ring so the player sees exactly how far to dash.
        if (b.arming) {
          ctx.globalAlpha = Math.sin(now / 40) > 0 ? 0.85 : 0.3; ctx.strokeStyle = b.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawFlash(f: { pos: Vec2; radius: number; color: string; life: number; maxLife: number; arc?: { facing: number; arcRad: number }; shape?: number; facing?: number; edgeFrac?: number; bolt?: boolean; meteor?: boolean; beam?: boolean; haze?: number }): void {
    const { ctx } = this;
    // A big synchronous sim step (headless probes, background-tab catch-up)
    // can overshoot a flash's life below zero before the prune sweeps it —
    // clamp, or every arc/gradient call downstream throws on a negative
    // radius and takes the whole rAF loop down with it. NON-FINITE numbers
    // are the same failure through a different door: the ≤ guards below pass
    // NaN (every comparison is false), and createRadialGradient is the one
    // canvas call that THROWS on it — so one poisoned producer anywhere in
    // the flash fabric would otherwise kill every frame for the effect's
    // whole lifetime. Skip the effect, keep the frame.
    if (!Number.isFinite(f.pos.x + f.pos.y + f.radius + f.life + f.maxLife)) return;
    const t = f.maxLife > 0 ? Math.max(0, Math.min(1, f.life / f.maxLife)) : 0;
    if (t <= 0 || f.radius <= 0) return;
    // Crystal laser: a straight beam from pos along `facing` for `radius` length.
    if (f.beam) {
      const dir = f.facing ?? 0, ex = Math.cos(dir) * f.radius, ey = Math.sin(dir) * f.radius;
      ctx.globalAlpha = Math.min(1, t * 1.4); ctx.lineCap = 'round';
      ctx.strokeStyle = f.color; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(f.pos.x, f.pos.y); ctx.lineTo(f.pos.x + ex, f.pos.y + ey); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(f.pos.x, f.pos.y); ctx.lineTo(f.pos.x + ex, f.pos.y + ey); ctx.stroke();
      ctx.lineCap = 'butt'; ctx.globalAlpha = 1;
      return;
    }
    // HEAT-HAZE RING (Flash.haze — the mirage kit's death breath): no fill,
    // no wash. Pale refraction rings breathe outward through the life while
    // shimmer ticks rise inside — the lens letting go. `haze` scales the
    // wobble; the light layer skips these (refraction, not emission).
    if (f.haze) {
      const k = 1 - t;                 // 0 → 1 across the life
      const age = f.maxLife - f.life;  // seconds since the pop
      const R = f.radius * (0.35 + 0.65 * k);
      ctx.strokeStyle = f.color;
      ctx.lineCap = 'round';
      for (let ring = 0; ring < 3; ring++) {
        const rr = R * (1 - ring * 0.18);
        if (rr <= 3) continue;
        ctx.globalAlpha = t * (0.16 - ring * 0.04);
        ctx.lineWidth = 1.5 + ring * 0.8;
        ctx.beginPath();
        const segs = 30;
        for (let s = 0; s <= segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          const wob = Math.sin(a * 5 + age * 11 + ring * 2.1) * rr * 0.05 * f.haze;
          const x = f.pos.x + Math.cos(a) * (rr + wob), y = f.pos.y + Math.sin(a) * (rr + wob);
          if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
      // Rising shimmer ticks — seeded per pop, lifting as the ring grows.
      ctx.globalAlpha = t * 0.3;
      ctx.lineWidth = 1.2;
      const seed = ((f.pos.x * 13 + f.pos.y * 7) | 0) >>> 0;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + (seed % 63) * 0.1;
        const d0 = R * (0.25 + 0.5 * (((i * 37 + seed) % 100) / 100));
        const x = f.pos.x + Math.cos(a) * d0;
        const y = f.pos.y + Math.sin(a) * d0 - k * 14;
        ctx.beginPath();
        ctx.moveTo(x - 1.5, y + 3);
        ctx.lineTo(x + 1.5, y - 3);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = t * 0.5;
    ctx.fillStyle = f.color;
    // Edge-band AoE: render only the rim, as a thick stroked ring/arc —
    // and a SIGILED band strokes the sigil's own figure at the band's mid
    // scale (2026-07-22: a square Shock Nova sequel detonates as a SQUARE
    // band, never reverting to the baseline ring — drawn == tested, the
    // same mapping the zone telegraph runs).
    if (f.edgeFrac) {
      const mid = f.radius * (1 + f.edgeFrac) / 2;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = Math.max(3, f.radius * (1 - f.edgeFrac));
      ctx.beginPath();
      if (f.shape && f.shape >= 1 && f.shape <= 2) {
        this.traceAoe(f.pos.x, f.pos.y, mid, f.shape, f.facing ?? 0);
      } else if (f.arc) {
        ctx.arc(f.pos.x, f.pos.y, mid, f.arc.facing - f.arc.arcRad / 2, f.arc.facing + f.arc.arcRad / 2);
      } else {
        ctx.arc(f.pos.x, f.pos.y, mid, 0, Math.PI * 2);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
    // Lightning: a jagged bolt falling from the sky into the impact.
    if (f.bolt) {
      const H = 540, segs = 8;
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(f.pos.x, f.pos.y - H);
      for (let i = 1; i <= segs; i++) {
        const yy = f.pos.y - H + (H * i / segs);
        const jag = i === segs ? 0 : (i % 2 ? 1 : -1) * (8 + (i * 17) % 16);
        ctx.lineTo(f.pos.x + jag, yy);
      }
      ctx.strokeStyle = f.color; ctx.lineWidth = 4; ctx.stroke();   // glow
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); // bright core
      ctx.globalAlpha = t * 0.5;
    }
    // Meteor: a fiery streak plunging from the upper sky into the impact, with a
    // molten head — distinct from the jagged lightning bolt.
    if (f.meteor) {
      const dx = -150, dy = -480; // comes in from upper-left
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.pos.x + dx, f.pos.y + dy);
      ctx.lineTo(f.pos.x, f.pos.y);
      ctx.strokeStyle = f.color; ctx.lineWidth = 7; ctx.stroke();        // fiery trail
      ctx.strokeStyle = '#ffe6b0'; ctx.lineWidth = 2.5; ctx.stroke();    // bright core
      ctx.lineCap = 'butt';
      ctx.globalAlpha = t * 0.5;
    }
    // The blast body. Faced shapes keep their exact footprint (fill + a hot
    // rim); plain circles get a hot-centered radial falloff + an expanding
    // shockwave ring — impacts POP, then breathe out.
    if (f.arc || f.shape) {
      ctx.beginPath();
      if (f.arc) {
        ctx.moveTo(f.pos.x, f.pos.y);
        ctx.arc(f.pos.x, f.pos.y, f.radius, f.arc.facing - f.arc.arcRad / 2, f.arc.facing + f.arc.arcRad / 2);
        ctx.closePath();
      } else {
        this.traceAoe(f.pos.x, f.pos.y, f.radius, f.shape!, f.facing ?? 0);
      }
      ctx.fill();
      ctx.globalAlpha = t * VIS_CFG.fx.flashRimAlpha;
      ctx.strokeStyle = shade(f.color, 0.5);
      ctx.lineWidth = 2.5;
      ctx.stroke();
    } else {
      const r = f.radius * (1.2 - 0.2 * t);
      const g = ctx.createRadialGradient(f.pos.x, f.pos.y, 0, f.pos.x, f.pos.y, r);
      g.addColorStop(0, withAlpha('#ffffff', t * 0.55));
      g.addColorStop(0.25, withAlpha(f.color, t * 0.6));
      g.addColorStop(1, withAlpha(f.color, 0));
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.pos.x, f.pos.y, r, 0, Math.PI * 2);
      ctx.fill();
      const ring = f.radius * (0.5 + 0.62 * (1 - t));
      ctx.globalAlpha = t * VIS_CFG.fx.flashRimAlpha;
      ctx.strokeStyle = shade(f.color, 0.45);
      ctx.lineWidth = 2 + 2 * t;
      ctx.beginPath();
      ctx.arc(f.pos.x, f.pos.y, ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** A worm's trailing body, drawn tail-first so the head sits on top.
   *  Legacy trail: one shaded circle bake (the head's look) scales down the
   *  whole spine, ghost-faded toward the tail. THE SEGMENT FABRIC upgrades
   *  it from data: per-segment KIT-PART looks (WormLookSpec — plates, fins,
   *  the tail cap; one bake per look, scaled per segment) rotated to the
   *  spine's own direction so the chain reads as ONE animal; hittable
   *  chains draw SOLID (they are real bodies — drawn = tested via the one
   *  segR radius law), flash per struck segment, and wear their tears
   *  (torn segments draw smaller and dimmer, exactly as they test). */
  private drawWormTail(a: Actor): void {
    const { ctx } = this;
    const w = a.worm!;
    const solid = !!w.hittable;
    const baseLook: BodyLook = { shape: 'circle', radius: a.radius, color: a.color, material: a.material };
    const half = spriteHalf(a.radius);
    for (let i = w.segments.length - 1; i >= 0; i--) {
      // (radius shrinks front-to-back; iterate display back-to-front)
      const r = segR(a, i);
      const seg = w.segments[i];
      const k = r / a.radius;
      const lookId = segLook(w, i);
      const look: BodyLook = lookId ? { ...baseLook, look: lookId } : baseLook;
      // Feedback: the STRUCK segment flashes (damage-funnel stamped); a
      // fabric-less worm keeps the legacy whole-spine flash off the head.
      const flashing = (w.flash?.[i] ?? 0) > 0 || (!solid && a.hitFlash > 0);
      const img = flashing ? bodyFlashSprite(look) : bodySprite(look);
      drawShadow(ctx, seg.x, seg.y, r, 0.7);
      ctx.globalAlpha = solid
        ? (w.wounded?.[i] ? SEG_CFG.woundAlpha : 1)
        : 0.55 + 0.35 * (1 - (i + 1) / (w.segments.length + 1));
      if (lookId) {
        // Plates FACE along the spine: each segment wears the direction to
        // its ahead-neighbor, the way the head wears its facing.
        const ahead = i === 0 ? a.pos : w.segments[i - 1];
        ctx.save();
        ctx.translate(seg.x, seg.y);
        ctx.rotate(Math.atan2(ahead.y - seg.y, ahead.x - seg.x));
        ctx.drawImage(img, -half * k, -half * k, half * 2 * k, half * 2 * k);
        ctx.restore();
      } else {
        ctx.drawImage(img, seg.x - half * k, seg.y - half * k, half * 2 * k, half * 2 * k);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** THE LITE TIER's per-kind composite bakes (shadow + body in ONE
   *  sprite, so the hot loop is one drawImage per body). Keyed by def id;
   *  cleared at zone boundaries via the cache steward. */
  private readonly liteSprites = new Map<string, { img: HTMLCanvasElement; half: number; flier: boolean }>();

  private liteSpriteOf(defId: string): { img: HTMLCanvasElement; half: number; flier: boolean } | null {
    let s = this.liteSprites.get(defId);
    if (s) return s;
    const def = MONSTERS[defId];
    if (!def) return null;
    const look: BodyLook = {
      shape: def.shape, radius: def.radius, color: def.color,
      material: def.material, look: def.look,
    };
    const body = bodySprite(look);
    const half = spriteHalf(def.radius);
    const cv = document.createElement('canvas');
    cv.width = half * 2;
    cv.height = half * 2 + 4;
    const c = cv.getContext('2d')!;
    c.fillStyle = 'rgba(0,0,0,0.26)';
    c.beginPath();
    c.ellipse(half, half + def.radius * 0.85 + 2, def.radius * 0.95,
      Math.max(1.5, def.radius * 0.34), 0, 0, Math.PI * 2);
    c.fill();
    c.drawImage(body, 0, 0);
    s = { img: cv, half, flier: !!def.flier };
    this.liteSprites.set(defId, s);
    return s;
  }

  /** THE LITE TIER's batch blit (engine/lite.ts + docs/engine/lite.md):
   *  the host draws the live pool's raw arrays; a co-op client draws the
   *  `lt` wire mirror (World.liteWire). Viewport-culled, one drawImage per
   *  body, a phase bob for fliers — no save/restore, no per-body state. */
  private drawLite(world: World, vw: number, vh: number): void {
    const wire = world.liteWire;
    const pool = world.lite;
    if (wire ? !wire.b.length : !pool.liveCount) return;
    const { ctx } = this;
    const pad = 48;
    const minX = this.cam.x - pad, minY = this.cam.y - pad;
    const maxX = this.cam.x + vw + pad, maxY = this.cam.y + vh + pad;
    const t = world.time;
    if (wire) {
      for (let j = 0; j <= wire.b.length - 3; j += 3) {
        const x = wire.b[j + 1], y = wire.b[j + 2];
        if (x < minX || x > maxX || y < minY || y > maxY) continue;
        const s = this.liteSpriteOf(wire.k[wire.b[j]] ?? '');
        if (!s) continue;
        const bob = s.flier ? Math.sin(t * 5 + j * 0.8) * 2.2 : 0;
        ctx.drawImage(s.img, x - s.half, y - s.half + bob);
      }
      return;
    }
    const kinds = world.liteKinds;
    for (let i = 0; i < pool.used; i++) {
      if (!pool.alive[i]) continue;
      const x = pool.x[i], y = pool.y[i];
      if (x < minX || x > maxX || y < minY || y > maxY) continue;
      const k = kinds[pool.kind[i]];
      if (!k) continue;
      const s = this.liteSpriteOf(k.defId);
      if (!s) continue;
      const bob = s.flier ? Math.sin(t * 5 + pool.phase[i]) * 2.2 : 0;
      ctx.drawImage(s.img, x - s.half, y - s.half + bob);
    }
  }

  /** Per-frame memo of the LOCAL viewer's throng sight — which husk kinds
   *  this seat's bar reveals (engine/throng.ts throngSightSet). */
  private throngSightAt = -1;
  private throngSightMemo: Set<string> = new Set();
  private throngSightOf(world: World): Set<string> {
    if (world.time !== this.throngSightAt) {
      this.throngSightAt = world.time;
      this.throngSightMemo = throngSightSet(world.player.skills);
    }
    return this.throngSightMemo;
  }

  /** THE STRUGGLE METER (the grab fabric, engine/grab.ts): the held body's
   *  break meter, drawn over its head for everyone — victim, holder, and
   *  the rescue party all read the same bar. Host reads the LIVE pair off
   *  the holder; a co-op client reads the host-computed mirror
   *  (ActorW.gb → Actor.grabHud). Draws nothing for free bodies. */
  private drawGrabMeter(a: Actor, world: World): void {
    let label: string | undefined, frac = 0;
    if (a.heldBy !== undefined) {
      const hold = world.actors.find(h => h.id === a.heldBy)?.gripping;
      if (hold && hold.id === a.id) {
        label = GRAB_VERB_LABEL[hold.verb];
        frac = hold.struggle;
      }
    }
    if (!label && a.grabHud) { label = a.grabHud[0]; frac = a.grabHud[1]; }
    if (!label) return;
    const { ctx } = this;
    const bw = 40, bh = 4;
    const gx = a.pos.x - bw / 2, gy = a.pos.y - a.radius - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(gx - 1, gy - 1, bw + 2, bh + 2);
    ctx.fillStyle = '#d8a06a';
    ctx.fillRect(gx, gy, bw * Math.min(1, Math.max(0, frac)), bh);
    ctx.fillStyle = '#e8d8b8';
    ctx.font = 'bold 9px Verdana';
    ctx.textAlign = 'center';
    ctx.fillText(a === world.player ? `${label} — struggle!` : label, a.pos.x, gy - 3);
  }

  private drawActor(a: Actor, world: World): void {
    const { ctx } = this;
    const { x, y } = a.pos;

    // A BURROWED body is underground: the dust line and the swelling
    // emergence telegraph (world-pushed flashes) carry the whole visual.
    if (a.burrow) return;

    // CONCEALMENT AS A STATE (StatusDef.conceals): a body worn INSIDE
    // another — the grab fabric's swallowed — is not drawn at all; the
    // holder's working gulletsack is the read. GHOSTING AS A STATE
    // (StatusDef.ghostAlpha) is the soft sibling collected in the same
    // pass: present-but-inside bodies (the latch fabric's burrowed
    // parasite) draw faded instead of vanishing — you see your grubs
    // wriggling in the flesh. Both ship on the ordinary status wire, so
    // co-op clients read them too. The LOCAL hero keeps their struggle
    // meter even unseen: swallowed is a predicament, not a blackout.
    let statusGhost = 1;
    for (const s of a.statuses) {
      const sd = STATUS_DEFS[s.id];
      if (sd?.conceals) {
        if (a === world.player) this.drawGrabMeter(a, world);
        return;
      }
      if (sd?.ghostAlpha !== undefined && sd.ghostAlpha < statusGhost) {
        statusGhost = sd.ghostAlpha;
      }
    }

    // THE TIER FABRIC (engine/tiers.ts), COVERED exposure: the other layer
    // is behind a ceiling (or under a street) — its bodies don't draw at
    // all. OPEN exposure draws both layers (the whole point of the buttes);
    // the same-tier combat law keeps the fights honest either way.
    // EXCEPT on a CROSSING: a link cell is ground on BOTH layers (an open
    // stair mouth) — whoever stands in the doorway is seen from both sides.
    if (world.zone.tiers?.exposure === 'covered'
      && (a.tier ?? 0) !== (world.player?.tier ?? 0)
      && !(world.walk?.regionAt && tierLinkOf(world.walk.regionAt(a.pos.x, a.pos.y)))) return;

    // THE THRONG SIGHT GATE (engine/throng.ts): an unclaimed husk exists
    // only to an attuned eye — the LOCAL bar must anchor its kind or the
    // body simply isn't drawn (per viewer; co-op peers each gate their
    // own POV). Claimed bodies and everything else pass untouched.
    if (a.throngWild !== undefined && !this.throngSightOf(world).has(a.throngWild)) return;

    // AT SEA the hero IS the boat: hull + sail + a trailing wake, rotated to
    // the facing. Zone-keyed (world.sailing), so co-op clients skin it too.
    if (world.sailing && world.seats.some(s => s.actor === a)) {
      this.drawBoat(a, world);
      return;
    }

    // Body (untouchable spirits ghostly; stealthed/invisible actors faded)
    ctx.save();
    ctx.translate(x, y);
    // A LIVE TRAVERSAL owns the traveler's pose: the geyser's rise swells the
    // body toward the camera over its pinned, thinning shadow; the fall
    // shrinks and spins it away into the hole (engine/traversal.ts eases).
    const tpose = a === world.player && world.traversal ? traversalPose(world.traversal) : null;
    // Grounding: the soft contact shadow under every body — drawn BEFORE the
    // leap swell so an airborne leaper's shadow stays put while the body rises.
    drawShadow(ctx, 0, 0, a.radius, (a.untargetable ? 0.4 : 1) * (tpose ? Math.max(0.05, tpose.shadow) : 1));
    // The hero wears a soft class-colored ground halo — you find yourself in a
    // brawl by presence, not by hunting the cursor.
    if (a === world.player) {
      drawGlow(ctx, 0, a.radius * 0.3, a.radius * VIS_CFG.body.heroHaloScale,
        a.color, VIS_CFG.body.heroHaloAlpha, false);
    }
    if (tpose) {
      ctx.translate(0, -tpose.lift);
      ctx.scale(tpose.scale, tpose.scale);
      if (tpose.spin) ctx.rotate(tpose.spin);
    }
    // TRUE FLIGHT reads at a glance: the body rides LIFTED and bobbing
    // above its grounded shadow (drawn at the true position before this).
    if (a.flying) {
      ctx.translate(0, -(7 + Math.sin(world.time * 3.1 + a.id * 1.7) * 2.2));
    }
    // Airborne leapers swell along the arc.
    if (a.leap) {
      const t = 1 - a.leap.timer / a.leap.total;
      const s = 1 + 0.55 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      ctx.scale(s, s);
    }
    // SPAWN-IN: a mid-play arrival (summon, construct, offering effigy,
    // hatch, streamer) GROWS into the world over a breath. Zone-load
    // population is exempt — its stamp rides the zone's own entry beat.
    if (a.spawnedAt >= 0 && a.spawnedAt > world.zoneEnteredAt + 1) {
      const bt = (world.time - a.spawnedAt) / VIS_CFG.body.spawnInSeconds;
      if (bt >= 0 && bt < 1) {
        const from = VIS_CFG.body.spawnInFrom;
        const s = from + (1 - from) * (1 - (1 - bt) * (1 - bt)); // easeOutQuad
        ctx.scale(s, s);
      }
    }
    if (a.untargetable) ctx.globalAlpha = 0.55;
    if (tpose) ctx.globalAlpha = 1; // a traversal's rise stays solid — cinema, not stealth
    if (a.sheet.get('invisible') > 0) ctx.globalAlpha = 0.3;
    else if (a.sheet.get('detectability') < 1) ctx.globalAlpha = 0.55;
    // GHOSTING AS A STATE (StatusDef.ghostAlpha, collected above): the
    // deepest worn ghost FLOORS whatever the other fade lanes chose (min
    // — never stacks, never brightens; the traversal's cinema stays
    // solid, its own law).
    if (!tpose && statusGhost < ctx.globalAlpha) ctx.globalAlpha = statusGhost;
    // THE SIGHT VEIL hides bodies the hero's eye cannot reach (smoothed, so
    // a cover-slip reads as slipping behind the bole, never a pop). The
    // local hero IS the eye — never self-veiled.
    if (a !== world.player) {
      const shade = this.sightVeil.actorShade(a, this.frameDt);
      if (shade > 0.01) ctx.globalAlpha *= 1 - shade;
    }
    // Echo riders: a ghost-faded copy of their owner — the dashed seam ring
    // after the body keeps the lie legible (construct.kind ships on the wire).
    if (a.construct?.kind === 'echo') ctx.globalAlpha = 0.45;
    // WANING PRESENCE (Actor.wane 0..1, system-stamped): the body pulses
    // toward transparent, dipping deeper as the wane rises — a thing fading
    // in the coming light. Multiplies, so it composes with the flags above.
    if (a.wane > 0) {
      const dip = a.wane * VIS_CFG.body.waneDepth;
      ctx.globalAlpha *= 1 - dip * (0.5 + 0.5 * Math.sin(world.time * VIS_CFG.body.waneRate + a.id * 1.7));
    }
    // Every overlay from here rides the same fade as the body itself.
    const baseAlpha = ctx.globalAlpha;

    // THE BAKED BODY (vis/body.ts): the def's own shape/color/adorn — plus an
    // optional material — compiled once into a shaded sprite: volume light,
    // surface texture, gloss, emissive halo and silhouette outline. Runtime
    // is a blit; identity semantics (which shapes rotate with facing, adorns
    // always tracking it) are unchanged.
    const look: BodyLook = {
      shape: a.shape, radius: a.radius, color: a.color,
      material: a.material, adorn: a.adorn, look: a.look,
      outline: a.isMinion() ? '#b06bd4' : undefined,
      demonHorns: !!FACTIONS[a.faction ?? '']?.nubHorns,
      extraParts: a.extraParts,
    };
    const half = spriteHalf(a.radius);
    const flash = a.hitFlash > 0;
    const lookDef = lookOf(a.look);
    // Part-grammar portraits are whole-body poses: they ALWAYS track facing.
    const rot = lookDef || shapeIsOriented(a.shape) ? a.facing : 0;
    // SURFACE MIRROR (RegionKind.surfaceMirror — ice today): a faded, flipped
    // ghost of the body beneath it — the frozen sheet reflects its crossers.
    if (regionKind(a.groundKind)?.surfaceMirror && !flash) {
      ctx.save();
      ctx.translate(0, a.radius * 1.85);
      ctx.scale(1, -0.8);
      if (rot !== 0) ctx.rotate(-rot);
      ctx.globalAlpha = 0.13 * baseAlpha;
      ctx.drawImage(bodySprite(look), -half, -half);
      ctx.restore();
    }
    // ATTUNED TONE (the attunement fabric, engine/tuning.ts): a tuned body
    // POOLS its element beneath itself — a soft breathing glow in the tone's
    // tint. The worn status ring below tells the list; this tells WHAT the
    // crystal is at a glance, across the arena. Render-only read of
    // Actor.tone (the bake stays tone-free: one sprite serves every
    // element); the handful of tunable fixtures per zone keeps it cheap.
    if (a.tone) {
      const tint = toneTint(a.tone);
      const pulse = 0.72 + 0.28 * Math.sin(world.time * 2.4 + a.id * 0.9);
      const gr = a.radius * 2.0;
      const g = ctx.createRadialGradient(0, 0, a.radius * 0.35, 0, 0, gr);
      g.addColorStop(0, withAlpha(tint, 0.36 * pulse * baseAlpha));
      g.addColorStop(1, withAlpha(tint, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, gr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    // Idle breathing — a live transform over the static bake. Scenery
    // (barrels, spawners) holds still; living things never quite do.
    if (!a.passive) {
      const breathe = 1 + VIS_CFG.body.breatheAmp
        * Math.sin(world.time * VIS_CFG.body.breatheRate + a.id * 1.31);
      ctx.scale(breathe, breathe);
    }
    if (rot !== 0) ctx.rotate(rot);
    ctx.drawImage(flash ? bodyFlashSprite(look) : bodySprite(look), -half, -half);
    // Animated look parts (wisps, flames) ride in the same facing space.
    if (lookDef?.live && !flash) drawLiveParts(ctx, look, lookDef, world.time);
    if (rot !== 0) ctx.rotate(-rot);
    const adornImg = flash ? adornFlashSprite(look) : adornSprite(look);
    if (adornImg) {
      ctx.rotate(a.facing);
      ctx.drawImage(adornImg, -half, -half);
      ctx.rotate(-a.facing);
    }
    ctx.restore();
    if (a.construct?.kind === 'echo') {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, a.radius + 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ailment tint: the strongest active status wears its color as a thin
    // pulsing ring — the pip row tells the list, the ring tells it at range.
    if (a.statuses.length > 0) {
      const sd = STATUS_DEFS[a.statuses[0].id];
      if (sd) {
        const pulse = 0.6 + 0.4 * Math.sin(world.time * 5 + a.id);
        ctx.strokeStyle = sd.color;
        ctx.globalAlpha = Math.min(baseAlpha, VIS_CFG.body.statusRingAlpha * pulse);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = baseAlpha;
      }
    }

    // Elite rarity: a glowing outline ring (colour by tier) + a crown for the
    // apex Crowned champions whose fall unlocks the Warbands package.
    if (a.rarity) {
      const ring = RARITY_DEFS[a.rarity].ring;
      if (ring) {
        ctx.save();
        ctx.strokeStyle = ring;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = ring;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
        if (a.rarity === 'crowned') {
          ctx.shadowBlur = 4;
          ctx.fillStyle = ring;
          ctx.font = `bold ${Math.round(a.radius * 1.15)}px Verdana`;
          ctx.textAlign = 'center';
          ctx.fillText('♛', 0, -a.radius - 6);
        }
        ctx.restore();
      }
    }

    // (The skeleton's rib overlay now bakes into the ribcage body sprite.)

    // Guard stance: the raised shield arc, fading as its health drains.
    if (a.casting?.mode === 'guard' && a.casting.inst.def.guard) {
      const cs = a.casting;
      const spec = cs.inst.def.guard!;
      const frac = Math.max(0, (cs.shield ?? 0) / (cs.maxShield ?? 1));
      const arcRad = spec.arcDeg * Math.PI / 180;
      const r = a.radius + 9;
      ctx.strokeStyle = cs.inst.def.color;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.35 + 0.55 * frac;
      ctx.beginPath();
      ctx.arc(0, 0, r, a.facing - arcRad / 2, a.facing + arcRad / 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, a.facing - arcRad / 2, a.facing + arcRad / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // SHELL GLYPH (Actor.shellGuard): the covered side reads BEFORE the
    // first tink — a faint arc riding the body on the shell's side, its
    // alpha following the pool. Breathing shells draw their LIVE arc (the
    // same factor the block test uses — what you read is what blocks),
    // and a BROKEN shell turns to cracked dashes while it knits.
    if (a.shellGuard) {
      const sg = a.shellGuard;
      const r = a.radius + 6;
      const live = sg.side === 'all'
        ? Math.PI * 2
        : (sg.arcDeg * Math.PI / 180) * shellArcFactor(sg, world.time);
      const center = sg.side === 'rear' ? a.facing + Math.PI : a.facing;
      const poolFrac = sg.max > 0 ? Math.max(0, sg.pool) / sg.max : 0;
      ctx.strokeStyle = sg.color;
      if (sg.broken || sg.pool <= 0) {
        // Cracked: short dashes, dim — the shell is OPEN; hit the meat.
        ctx.setLineDash([3, 6]);
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.35;
      } else {
        ctx.setLineDash([]);
        ctx.lineWidth = 3.5;
        ctx.globalAlpha = 0.18 + 0.4 * poolFrac;
      }
      ctx.beginPath();
      if (sg.side === 'all') ctx.arc(0, 0, r, 0, Math.PI * 2);
      else ctx.arc(0, 0, r, center - live / 2, center + live / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    // FEAR GLYPH (the harrowing ladder, status.ts): dread reads BEFORE the
    // rout — quiver ticks fan over the crown as stacks climb (trembling on
    // the sim clock), and a broken nerve (any PANIC status) rings the body
    // in a shivering dashed circle while it flees. Tunables in VIS_CFG.fx.
    {
      const harrow = a.statuses.find(s => s.id === 'harrowing');
      const panicked = a.isPanicked();
      if (harrow || panicked) {
        const fxCfg = VIS_CFG.fx;
        if (panicked) {
          const jit = Math.sin(world.time * 17 + a.id * 1.3) * 1.6;
          ctx.strokeStyle = fxCfg.fearPanicColor;
          ctx.setLineDash([4, 5]);
          ctx.lineWidth = 2;
          ctx.globalAlpha = fxCfg.fearGlyphAlpha;
          ctx.beginPath();
          ctx.arc(jit * 0.4, 0, a.radius + 7 + jit, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (harrow) {
          const n = Math.min(5, harrow.stacks);
          ctx.strokeStyle = fxCfg.fearQuiverColor;
          ctx.lineWidth = 1.6;
          ctx.globalAlpha = fxCfg.fearGlyphAlpha * (0.5 + 0.1 * n);
          for (let i = 0; i < n; i++) {
            const aa = -Math.PI / 2 + (i - (n - 1) / 2) * 0.42;
            const jx = Math.sin(world.time * 13 + i * 1.7 + a.id) * 1.4;
            const bx = Math.cos(aa) * (a.radius + 6) + jx;
            const by = Math.sin(aa) * (a.radius + 6);
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.lineTo(bx + Math.cos(aa) * 5, by + Math.sin(aa) * 5);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // Stance feedback: conditional 'stationary' mods (Colossus Stance) are
    // invisible ±28% swings without a cue — SHOW the plant. The ring fades
    // in as the feet set and locks solid (with root-spikes) once planted.
    if (a.isPlayerKind() && a.hasConditionalMods('stationary')) {
      const frac = Math.min(1, a.plantFor / STANCE_PLANT_TIME);
      if (frac > 0.25) {
        const r = a.radius + 7;
        ctx.strokeStyle = '#c8b088';
        ctx.lineWidth = frac >= 1 ? 3 : 1.5;
        ctx.globalAlpha = frac >= 1 ? 0.7 : 0.3 * frac;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        if (frac >= 1) {
          // Root-spikes: the mountain has set.
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const ang = i * Math.PI / 2 + Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
            ctx.lineTo(Math.cos(ang) * (r + 6), Math.sin(ang) * (r + 6));
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }
    }

    // Protection domes: the bubble around the construct.
    if (a.construct?.kind === 'dome' && a.construct.domeRadius) {
      const t2 = performance.now() / 1000;
      ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t2 * 2.5);
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.arc(0, 0, a.construct.domeRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, a.construct.domeRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Armed fuse: an urgent blinking ring closing in on the bang.
    if (a.fuse !== undefined) {
      const blink = Math.sin(performance.now() / 40) > 0;
      ctx.globalAlpha = blink ? 0.9 : 0.4;
      ctx.strokeStyle = '#ff5050';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, a.radius + 6 + a.fuse * 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // AIM TICK — the facing pointer on everything that ACTS in a direction
    // (a cast pins facing to the cast lock, so this is also the honest
    // "where it will land" line). Things that don't act don't aim (barrels
    // aren't plotting), and neither does furniture whose pose froze at
    // placement (Actor.aims — bone walls, embeds). Style and opacity are
    // the player's call (Settings.aimTick): any registry style, 0 hides.
    if (!a.passive && a.aims) {
      const tick = this.getSettings?.().aimTick ?? DEFAULT_AIM_TICK;
      const alpha = baseAlpha * clamp(tick.alpha, 0, 1);
      if (alpha > 0.01) {
        const style = AIM_TICK_STYLES[tick.style] ?? AIM_TICK_STYLES[DEFAULT_AIM_TICK.style];
        ctx.globalAlpha = alpha;
        style.draw(ctx, a.facing, a.radius);
        ctx.globalAlpha = baseAlpha;
      }
    }

    // Iron banding on breakables (LookDef.banding): containers read as
    // containers. The LOOK carries it — never a defId compare — so any new
    // container def joins by wearing (or declaring) a banded look.
    const banding = lookDef?.banding;
    if (banding === 'hoops') {
      ctx.strokeStyle = '#c8a87a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, a.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, a.radius * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    } else if (banding === 'cross') {
      ctx.strokeStyle = '#c8a87a';
      ctx.lineWidth = 2;
      const r = a.radius * 0.85;
      ctx.beginPath();
      ctx.moveTo(-r, -r); ctx.lineTo(r, r);
      ctx.moveTo(-r, r); ctx.lineTo(r, -r);
      ctx.stroke();
    }

    // Ears/horns/spikes/wings bake into the adorn sprite above. TENTACLES
    // stay live — the eldritch writhe is per-frame motion no bake can hold.
    if (a.adorn === 'tentacles') {
      const t = performance.now() / 1000;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2;
      for (let s = 0; s < 6; s++) {
        const base = a.facing + (s / 6) * Math.PI * 2;
        const wob = Math.sin(t * 3 + s) * 0.5;
        const bx0 = Math.cos(base) * a.radius, by0 = Math.sin(base) * a.radius;
        const tx0 = Math.cos(base + wob) * a.radius * 1.9, ty0 = Math.sin(base + wob) * a.radius * 1.9;
        const cx0 = Math.cos(base + wob * 0.5) * a.radius * 1.5;
        const cy0 = Math.sin(base + wob * 0.5) * a.radius * 1.5;
        ctx.beginPath();
        ctx.moveTo(bx0, by0);
        ctx.quadraticCurveTo(cx0, cy0, tx0, ty0);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Health bar (enemies + minions; the player has the orb) — drawn only
    // once the pool is DENTED. What was the composite-part rule (a pristine
    // part stays bar-less) is now the whole stack's: an untouched body wears
    // no overlay at all, so "no bar" itself reads as "at full life" — the
    // signal any full-life-keyed mechanic (yours or theirs) hangs off.
    if (a !== world.player && a.life < a.maxLife() - 0.5) {
      const bw = a.radius * 2.2;
      const frac = clamp(a.life / a.maxLife(), 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - bw / 2, y - a.radius - 9, bw, 4);
      ctx.fillStyle = a.team === 'enemy' ? '#c03030' : '#40b050';
      ctx.fillRect(x - bw / 2, y - a.radius - 9, bw * frac, 4);
    }
    // THE PLY ROW (engine/plies.ts): a plied body wears PIPS, not a bar —
    // each dot one hit it can still eat. Same dent rule as every bar
    // (untorn stays clean); once the plies spend out, the ordinary life
    // bar above takes over and the body reads EXPOSED.
    if (a !== world.player && a.pliesMax > 0 && a.plies > 0 && a.plies < a.pliesMax) {
      const pip = PLY_CFG.pip;
      const w = (a.pliesMax - 1) * pip.gap;
      for (let i = 0; i < a.pliesMax; i++) {
        ctx.fillStyle = i < a.plies ? pip.color : pip.spentColor;
        ctx.beginPath();
        ctx.arc(x - w / 2 + i * pip.gap, y - a.radius - 8, pip.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // LIFESPAN sliver (the Amalgam's clock): SIZABLE owned minions with a
    // finite hire show how much of it remains — swarms stay clean. A clock,
    // not a health readout: it ticks whether or not the life bar shows.
    if (a !== world.player && a.owner && a.lifespan > 0 && a.radius >= 14 && a.lifespanTotal > 0) {
      const bw = a.radius * 2.2;
      ctx.fillStyle = '#b8a0e0';
      ctx.fillRect(x - bw / 2, y - a.radius - 5.5,
        bw * clamp(a.lifespan / a.lifespanTotal, 0, 1), 2.5);
    }

    // Layered-defense bars: energy shield (cyan) and absorb (white) — the
    // shield bar follows the same dent rule (full ES on a full body = clean).
    if (a.es > 0 && a.maxEs() > 0 && a.es < a.maxEs() - 0.5) {
      const bw = a.radius * 2.2;
      ctx.fillStyle = '#5ad8d8';
      ctx.fillRect(x - bw / 2, y - a.radius - 13, bw * clamp(a.es / a.maxEs(), 0, 1), 3);
    }
    if (a.absorb > 0) {
      const bw = a.radius * 2.2;
      ctx.fillStyle = '#e8f0f8';
      ctx.fillRect(x - bw / 2, y - a.radius - 16, bw * Math.min(1, a.absorb / 60), 2.5);
    }
    // POISE sliver (bronze): shown once the break-bar is DENTED — full bars
    // stay invisible so ordinary mobs read clean. A broken bar dims while
    // it climbs back to the re-arm line.
    if (a !== world.player) {
      const mp = a.maxPoise();
      if (mp > 0 && a.poise < mp - 0.5) {
        const bw = a.radius * 2.2;
        ctx.fillStyle = a.poiseBroken ? '#7a6438' : '#d8b06a';
        ctx.fillRect(x - bw / 2, y - a.radius - 19, bw * clamp(a.poise / mp, 0, 1), 2.5);
      }
    }

    // Overhead TEXT — names and prompts — queues for the post-fade label
    // pass (drawLabels): doodads never drown the words, and the reveal gate
    // keeps a concealed actor's text as hidden as its body.

    // NPCs that fill a town role (MonsterDef.npcRole) wear their names.
    if (a.team === 'player' && a.defId && MONSTERS[a.defId]?.npcRole) {
      this.queueLabel(a, a.name, '#e8c87a', 8, { font: '10px Verdana', stroke: false });
    }

    // The innkeep "talks" — ROLE-BOUND through world.innkeepPrompt() like its
    // caravanner/bonewright/delver siblings: the welcome-gift invitation
    // while the flasks are owed, else the locked-care note. Any body a
    // package dresses in the role gets the prompt, no renderer edit.
    if (a.defId && MONSTERS[a.defId]?.npcRole === 'innkeep') {
      const msg = world.innkeepPrompt();
      if (msg) this.queueLabel(a, msg, '#d8b87a', 22);
    }

    // Any quest-giving NPC posts its offer above its head while you're near —
    // the id set derives from the QUESTS registry (quartermaster, a secret
    // vocation's shrine spirit, future field boards), never a hand list.
    if (a.defId && QUEST_GIVER_IDS.has(a.defId)) {
      const msg = world.questGiverPrompt();
      if (msg) this.queueLabel(a, msg, '#c8a8e8', 22);
    }

    if (a.defId && MONSTERS[a.defId]?.npcRole === 'caravanner') {
      const msg = world.caravanPrompt();
      if (msg) this.queueLabel(a, msg, '#d8b87a', 22);
    }

    // The Bonewright posts its current demand above its head — bound to the
    // ROLE (npcRole 'bonewright'), like every other counter: any body a
    // package dresses in the role gets the prompt, no renderer edit.
    if (a.defId && MONSTERS[a.defId]?.npcRole === 'bonewright') {
      const msg = world.amalgamPrompt();
      if (msg) this.queueLabel(a, msg, '#9ad0b0', 22);
    }

    // The Delver posts its trade/descend prompt above its head (role-bound).
    if (a.defId && MONSTERS[a.defId]?.npcRole === 'delver') {
      const msg = world.delverPrompt();
      if (msg) this.queueLabel(a, msg, '#7fe0d8', 22);
    }

    // Status pips
    let px = x - a.radius;
    for (const s of a.statuses) {
      const def = STATUS_DEFS[s.id];
      if (!def) continue;
      ctx.fillStyle = def.color;
      ctx.fillRect(px, y + a.radius + 4, 6, 6);
      px += 8;
    }

    // FORESIGHT — an enemy wind-up marks where the blow will land, in the
    // skill's color, firming toward impact. GROUND footprints ring their
    // landing spot (plus a center pip); MELEE swings and breath CONES wedge
    // out from the body along the stamped aim (the cast lock pins the pose
    // there and the resolve fires there — the drawing is the truth, stat
    // scaling and all); hostile NOVAS ring the caster. Read it, step out.
    // Toggleable (Settings.castTelegraphs).
    if (a.team === 'enemy' && a.casting && (this.getSettings?.().castTelegraphs ?? true)) {
      const fc = a.casting;
      const del = fc.inst.def.delivery;
      // Channels breathe with the pulse clock; bar casts firm once.
      const prog = fc.mode === 'channel'
        ? (fc.total > 0 ? clamp(1 - Math.max(0, fc.pulseTimer ?? 0) / fc.total, 0, 1) : 1)
        : (fc.total > 0 ? clamp(fc.elapsed / fc.total, 0, 1) : 1);
      if (del.type === 'ground') {
        const aim = fc.lockedAim ?? fc.aim;
        const rr = del.radius;
        ctx.save();
        ctx.translate(aim.x, aim.y); // world space — the body transform ended above
        ctx.strokeStyle = fc.inst.def.color;
        ctx.globalAlpha = 0.18 + 0.3 * prog;
        ctx.lineWidth = 1.5 + prog * 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(0, 0, rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // The fill breathes in as the cast completes.
        ctx.globalAlpha = 0.05 + 0.09 * prog;
        ctx.fillStyle = fc.inst.def.color;
        ctx.beginPath();
        ctx.arc(0, 0, rr * (0.35 + 0.65 * prog), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.5 + 0.4 * prog;
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = baseAlpha;
      } else if ((del.type === 'melee' || del.type === 'cone'
        || (del.type === 'nova' && del.affects !== 'allies')) && fc.mode !== 'guard') {
        // Mirror the resolve's TRUE geometry (world.ts melee/cone/nova
        // cases): same stat multipliers, same reach formulae — the wedge
        // never lies. Channels track the live facing (their pulses do);
        // everything else aims down the stamp the resolve will fire at.
        const tags = skillContextTags(fc.inst.def);
        const extra = instanceMods(fc.inst);
        const aim = fc.lockedAim ?? fc.aim;
        const aoeScale = a.sheet.get('aoeRadius', tags, extra);
        const ang = del.type === 'nova' ? 0
          : fc.mode === 'channel' || dist(a.pos, aim) < 2
            ? a.facing
            : Math.atan2(aim.y - a.pos.y, aim.x - a.pos.x);
        const reach = del.type === 'melee'
          ? (a.radius + del.range) * a.sheet.get('meleeReach', tags, extra)
          : del.type === 'cone'
            ? del.range * aoeScale * a.sheet.get('meleeReach', tags, extra)
            : del.radius * aoeScale;
        const arcRad = del.type === 'nova' ? Math.PI * 2
          : Math.min(Math.PI * 2, (del.arcDeg * Math.PI / 180)
            * (del.type === 'melee' ? Math.sqrt(aoeScale) : 1)
            * a.sheet.get('swingArc', tags, extra));
        // Edge-band shapes (Surgical Strike, Shock Nova): only the rim cuts.
        const inner = del.type !== 'melee' && del.edgeOnly ? reach * del.edgeOnly : 0;
        const full = arcRad >= Math.PI * 2 - 0.01;
        const wedge = (r0: number, r1: number): void => {
          ctx.beginPath();
          if (full) {
            ctx.arc(x, y, r1, 0, Math.PI * 2);
            if (r0 > 0) ctx.arc(x, y, r0, Math.PI * 2, 0, true);
          } else if (r0 > 0) {
            ctx.arc(x, y, r1, ang - arcRad / 2, ang + arcRad / 2);
            ctx.arc(x, y, r0, ang + arcRad / 2, ang - arcRad / 2, true);
            ctx.closePath();
          } else {
            ctx.moveTo(x, y);
            ctx.arc(x, y, r1, ang - arcRad / 2, ang + arcRad / 2);
            ctx.closePath();
          }
        };
        ctx.save();
        ctx.strokeStyle = fc.inst.def.color;
        ctx.globalAlpha = 0.18 + 0.3 * prog;
        ctx.lineWidth = 1.5 + prog * 1.5;
        ctx.setLineDash([6, 6]);
        wedge(inner, reach);
        ctx.stroke();
        ctx.setLineDash([]);
        // The fill sweeps out from the body as the swing commits.
        ctx.globalAlpha = 0.05 + 0.09 * prog;
        ctx.fillStyle = fc.inst.def.color;
        wedge(inner, Math.max(inner + 2, reach * (0.35 + 0.65 * prog)));
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = baseAlpha;
      }
    }

    // THE STRUGGLE METER (the grab fabric): a held body wears its break
    // meter above the head — the victim reads how close freedom is, the
    // HOLDER reads how long the catch will keep, and every ally reads
    // where the rescue stands.
    this.drawGrabMeter(a, world);

    // Cast bar above the head (telegraphs enemy casts, too)
    const cs = a.casting;
    if (cs) {
      const bw = 44, bh = 5;
      const bx2 = x - bw / 2, by2 = y - a.radius - 18;
      const color = cs.inst.def.color;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx2 - 1, by2 - 1, bw + 2, bh + 2);
      let frac: number;
      if (cs.mode === 'channel') {
        frac = cs.total > 0 ? 1 - Math.max(0, cs.pulseTimer ?? 0) / cs.total : 1;
      } else if (cs.mode === 'guard') {
        // The guard bar IS the shield's remaining health.
        frac = Math.max(0, (cs.shield ?? 0) / (cs.maxShield ?? 1));
      } else {
        frac = cs.total > 0 ? Math.min(1, cs.elapsed / cs.total) : 1;
      }
      ctx.fillStyle = color;
      ctx.fillRect(bx2, by2, bw * frac, bh);
      // Mode decorations
      if (cs.mode === 'channel') {
        // CAPPED / BRIM channels wear their COMPLETION above the pulse
        // bar (the overcharge stacked-bar idiom): the gather's walk to
        // its ceiling, gold the instant it truly finishes. Enemies wear
        // it too — the whole room reads the doom-cast burning in.
        const chSpec = cs.gather ?? cs.inst.def.channel;
        let holdFrac: number | null = null;
        if (chSpec?.brim) {
          holdFrac = a.brims?.get(cs.inst.def.id)?.fill ?? 0;
        } else if (chSpec?.maxHold !== undefined) {
          const cap = chSpec.maxHold * a.sheet.get('effectDuration',
            skillContextTags(cs.inst.def), instanceMods(cs.inst));
          holdFrac = cap > 0 ? Math.min(1, (cs.channelTime ?? 0) / cap) : null;
        }
        if (holdFrac !== null) {
          const hy = by2 - 4;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(bx2 - 1, hy - 1, bw + 2, 4);
          ctx.fillStyle = holdFrac >= 1 ? '#ffd700' : color;
          ctx.fillRect(bx2, hy, bw * holdFrac, 3);
        }
      }
      if (cs.mode === 'perfect') {
        ctx.fillStyle = 'rgba(255,215,0,0.55)';
        ctx.fillRect(bx2 + bw * 0.72, by2, bw * 0.28, bh);
      } else if (cs.mode === 'timed' && cs.indicatorAt !== undefined) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx2 + bw * cs.indicatorAt - 1, by2 - 2, 2, bh + 4);
      } else if (cs.mode === 'guard' && cs.bashAt !== undefined) {
        // THE BASH TIC: the live arming line — release on the ARMED side
        // of it and the stance converts into the blow. The value is
        // refreshGuardBash's (one resolver: supports, buffs and the
        // inverted contract all move it), shipped over the co-op wire, so
        // what this draws is exactly what the release check will decide.
        // The faint underline marks the armed side: right of the tic
        // normally, LEFT of it inverted (Hollow Answer — the bar reads
        // "cash what the wall has lost"). No tic = no bash on this stance.
        const tx = bx2 + bw * cs.bashAt;
        const x0 = cs.bashLow ? bx2 : tx;
        const x1 = cs.bashLow ? tx : bx2 + bw;
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x0, by2 + bh + 1, Math.max(0, x1 - x0), 1);
        ctx.globalAlpha = 1;
        ctx.fillRect(tx - 1, by2 - 2, 2, bh + 4);
      } else if (cs.mode === 'multitude') {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx2 - 3, by2 - 3, bw + 6, bh + 6);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Verdana';
        ctx.textAlign = 'left';
        ctx.fillText(`×${cs.presses ?? 1}`, bx2 + bw + 6, by2 + bh);
        ctx.textAlign = 'center';
      } else if (cs.mode === 'charge' && frac >= 1) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx2 - 2, by2 - 2, bw + 4, bh + 4);
      } else if (cs.mode === 'concentration') {
        // FOCUS cue: a steady green frame while the gaze holds the quarry;
        // red + 'refocus!' the instant it breaks (drain bleeds meanwhile).
        ctx.strokeStyle = cs.focusBroken ? '#e05050' : '#a8d8a0';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx2 - 2, by2 - 2, bw + 4, bh + 4);
        if (cs.focusBroken) {
          ctx.fillStyle = '#e05050';
          ctx.font = 'bold 9px Verdana';
          ctx.fillText('refocus!', x, by2 - 5);
        }
      } else if (cs.mode === 'overcharge') {
        // STACKED bars: every banked stage is a thin filled bar laid on
        // top of the refilling one — the old JRPG hold, made literal.
        const stages = cs.stage ?? 0;
        for (let s = 0; s < stages; s++) {
          const sy = by2 - 4 - s * 4;
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(bx2 - 1, sy - 1, bw + 2, 4);
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(bx2, sy, bw, 3);
        }
        // Strike-timing disciplines decorate the REFILLING bar — the
        // release must land inside them (Perfect Draw's golden tail /
        // Wandering Mark's roving marker).
        const timing = instanceStrikeTiming(cs.inst);
        if (timing?.kind === 'perfect') {
          ctx.fillStyle = 'rgba(255,215,0,0.55)';
          ctx.fillRect(bx2 + bw * 0.72, by2, bw * 0.28, bh);
        } else if (timing?.kind === 'timed' && cs.indicatorAt !== undefined) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(bx2 + bw * cs.indicatorAt - 1, by2 - 2, 2, bh + 4);
        }
        // The SPARK: a bright flare right as a stage banks — and while a
        // spark WINDOW is invested (Spark Discipline), a golden border
        // marks the open release window after each bank.
        const since = cs.sinceStage ?? 999;
        if (since < 0.15 && stages > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx2 + bw + 8, by2 + bh / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        if (stages > 0 && (cs.sparkWindow ?? 0) > 0 && since <= (cs.sparkWindow ?? 0)) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2;
          ctx.strokeRect(bx2 - 2, by2 - 2, bw + 4, bh + 4);
        }
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Verdana';
        ctx.textAlign = 'left';
        if (stages > 0) ctx.fillText(`+${stages}`, bx2 + bw + 5, by2 - 4);
        ctx.textAlign = 'center';
      } else if (cs.mode === 'channel') {
        ctx.fillStyle = '#fff';
        ctx.font = '9px Verdana';
        ctx.textAlign = 'left';
        ctx.fillText(`${(cs.channelTime ?? 0).toFixed(1)}s`, bx2 + bw + 5, by2 + bh);
        ctx.textAlign = 'center';
      }
    }
  }

  /** Active auras: a soft tinted field around each bearer. */
  /** The Voyage's hero skin: a lapstrake hull nosing along the facing, a mast
   *  + wind-bellied sail in the seat's class color, and a fading wake. The
   *  account's SHIP scales the hull and tints the timbers (the Vault ladder
   *  is visible on the water). */
  private drawBoat(a: Actor, world: World): void {
    const { ctx } = this;
    const ship = world.voyageShip();
    ctx.save();
    ctx.translate(a.pos.x, a.pos.y);
    const bob = Math.sin(world.time * 2.1 + a.id * 1.7) * 1.6;
    ctx.translate(0, bob);
    ctx.rotate(a.facing + Math.PI / 2);
    const L = a.radius * 2.4 * ship.hullScale, W = a.radius * 1.35 * ship.hullScale;
    // (The wake is no longer painted here — the moving hull seeds the SAME
    // water-ripple motion FX walking bodies make, trailing real expanding
    // rings from the stern. See updateMotionFx's boat branch.)
    // Hull: a pointed bow, a squared stern — timbers tinted by the ship tier.
    ctx.fillStyle = a.hitFlash > 0 ? '#ffffff' : ship.color;
    ctx.strokeStyle = '#2c2013';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.62);                    // bow
    ctx.quadraticCurveTo(W * 0.62, -L * 0.1, W * 0.5, L * 0.45);
    ctx.lineTo(-W * 0.5, L * 0.45);              // stern
    ctx.quadraticCurveTo(-W * 0.62, -L * 0.1, 0, -L * 0.62);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // Deck strakes.
    ctx.strokeStyle = 'rgba(44,32,19,0.6)';
    ctx.lineWidth = 1;
    for (const t of [-0.15, 0.15]) {
      ctx.beginPath(); ctx.moveTo(-W * 0.36, L * (t + 0.1)); ctx.lineTo(W * 0.36, L * (t + 0.1)); ctx.stroke();
    }
    // Mast + the class-colored sail, bellied by a phantom wind.
    ctx.fillStyle = '#2c2013';
    ctx.fillRect(-1.5, -L * 0.18, 3, L * 0.5);
    const belly = 0.55 + 0.1 * Math.sin(world.time * 1.7);
    ctx.fillStyle = a.color;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.16);
    ctx.quadraticCurveTo(W * belly, L * 0.05, 0, L * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawAuras(world: World): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    for (const a of world.actors) {
      if (a.dead || a.activeAuras.size === 0) continue;
      for (const aura of a.activeAuras.values()) {
        const pulse = 0.06 + 0.02 * Math.sin(t * 3);
        ctx.globalAlpha = pulse;
        ctx.fillStyle = aura.inst.def.color;
        ctx.beginPath();
        this.traceAoe(a.pos.x, a.pos.y, aura.radius, aura.shape, a.facing);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = aura.inst.def.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  /** Mark runes and gate tethers. */
  private drawMovementMarkers(world: World): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    // Mark/Recall runes on the player's bar
    for (const inst of world.player.skills) {
      const mp = inst?.state?.markPos;
      if (!mp) continue;
      ctx.strokeStyle = inst!.def.color;
      ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mp.x, mp.y, 14 + Math.sin(t * 4) * 2, 0, Math.PI * 2);
      ctx.moveTo(mp.x - 8, mp.y); ctx.lineTo(mp.x + 8, mp.y);
      ctx.moveTo(mp.x, mp.y - 8); ctx.lineTo(mp.x, mp.y + 8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Gate tethers between paired portals
    for (const a of world.actors) {
      if (a.dead || a.construct?.kind !== 'gate' || a.gateLink === undefined) continue;
      const partner = world.actors.find(b => b.id === a.gateLink && !b.dead);
      if (!partner || partner.id < a.id) continue; // draw each pair once
      ctx.strokeStyle = a.color;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(a.pos.x, a.pos.y);
      ctx.lineTo(partner.pos.x, partner.pos.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  /** Corpse remnants — the corpse economy's fuel, drawn as REMAINS: a dark
   *  settle-stain, a rib sweep, a long bone and the skull knuckle, sized by
   *  the fallen kind and sinking as the clock runs out. Cheap vector marks
   *  (≤ CORPSE_CFG.max alive), tinted faintly by the monster's own color so
   *  a field of mixed dead still reads. */
  private drawCorpses(world: World): void {
    const { ctx } = this;
    for (const c of world.corpses) {
      const def = MONSTERS[c.defId];
      const size = Math.min(15, 6 + (def?.radius ?? 10) * 0.4);
      const frac = Math.min(1, c.remaining / CORPSE_CFG.duration); // 1 = fresh
      const alpha = Math.min(1, c.remaining / 2) * 0.8;
      const sink = 0.72 + 0.28 * frac; // the ground slowly takes it back
      // The settle-stain beneath.
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = '#2c1a1e';
      ctx.beginPath();
      ctx.ellipse(c.pos.x, c.pos.y + 2, size * 1.25, size * 0.62 * sink, 0, 0, Math.PI * 2);
      ctx.fill();
      // The remains: ribs, one long bone, the skull.
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#cfc0a4';
      ctx.lineWidth = Math.max(1.4, size * 0.14);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const x = c.pos.x - size * 0.15 + i * size * 0.3;
        ctx.moveTo(x, c.pos.y - size * 0.38 * sink);
        ctx.quadraticCurveTo(x + size * 0.22, c.pos.y, x, c.pos.y + size * 0.38 * sink);
      }
      ctx.moveTo(c.pos.x - size * 0.9, c.pos.y + size * 0.3 * sink);
      ctx.lineTo(c.pos.x - size * 0.25, c.pos.y + size * 0.42 * sink);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = '#d8cbb0';
      ctx.beginPath();
      ctx.arc(c.pos.x - size * 0.72, c.pos.y - size * 0.18 * sink, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1c1410';
      ctx.beginPath();
      ctx.arc(c.pos.x - size * 0.8, c.pos.y - size * 0.22 * sink, size * 0.09, 0, Math.PI * 2);
      ctx.arc(c.pos.x - size * 0.6, c.pos.y - size * 0.2 * sink, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
      // The kind's tint, worn faintly — a wolf's ruin differs from a wight's.
      if (def?.color) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.ellipse(c.pos.x + size * 0.3, c.pos.y, size * 0.5, size * 0.3 * sink, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Prior-run death spots: a fallen mound + skull to dwell beside and reclaim
   *  the gems lost to death. Fades once reclaimed. */
  private drawPlayerCorpses(world: World): void {
    const { ctx } = this;
    for (const c of world.playerCorpses) {
      ctx.globalAlpha = c.reclaimed ? 0.25 : 1;
      if (!c.reclaimed) {
        ctx.fillStyle = 'rgba(216,176,72,0.10)';
        ctx.beginPath(); ctx.arc(c.pos.x, c.pos.y, 30, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#3a3340';
      ctx.beginPath(); ctx.ellipse(c.pos.x, c.pos.y + 4, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#6a5a72'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#d8cfe0'; ctx.font = 'bold 15px Verdana'; ctx.textAlign = 'center';
      ctx.fillText('☠', c.pos.x, c.pos.y + 2);
      if (!c.reclaimed) {
        ctx.font = '10px Verdana'; ctx.fillStyle = '#d8b048';
        ctx.fillText(`your fallen ${c.who.classId} — linger to reclaim`, c.pos.x, c.pos.y - 22);
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Gems on the ground: bobbing diamonds — skill gems wear a rarity ring.
   *  GEAR draws bigger in its rarity color and floats a NAME LABEL (the
   *  ARPG ground-read: what dropped, from across the room). The client
   *  render-shell only carries {name, rarity}, so gear touches nothing else. */
  private drawDrops(world: World): void {
    const { ctx } = this;
    const D = VIS_CFG.drops; // every size below is a lever, never a literal
    for (const d of world.drops) {
      const y = d.pos.y + Math.sin(d.bob) * D.bobAmp;
      const item = d.item;
      if (item.kind === 'vestige') {
        // A glowing glyph — vestiges vacuum on touch, so no label pill.
        const v = VESTIGES[item.id];
        ctx.save();
        ctx.font = `bold ${D.vestigeFont}px Verdana`;
        ctx.textAlign = 'center';
        ctx.shadowColor = v?.color ?? '#b06bd4';
        ctx.shadowBlur = D.glow + 4;
        ctx.fillStyle = v?.color ?? '#b06bd4';
        ctx.fillText(v?.glyph ?? '؟', d.pos.x, y + 5);
        ctx.restore();
        continue;
      }
      if (item.kind === 'essence') {
        // Currency underfoot: the essence's own glyph in its tint, with a
        // count tag when the packet is fat — reads as a trail mid-chase.
        const e = ESSENCES[item.essence];
        ctx.save();
        ctx.font = `bold ${D.essenceFont}px Verdana`;
        ctx.textAlign = 'center';
        ctx.shadowColor = e.color;
        ctx.shadowBlur = D.glow + 2;
        ctx.fillStyle = e.color;
        ctx.fillText(e.glyph, d.pos.x, y + 4);
        if (item.count > 1) {
          ctx.shadowBlur = 0;
          ctx.font = `bold ${D.essenceCountFont}px Verdana`;
          ctx.fillText(`×${item.count}`, d.pos.x + D.essenceFont - 2, y + 7);
        }
        ctx.restore();
        continue;
      }
      if (item.kind === 'gear') {
        const rc = ITEM_RARITIES[item.item.rarity] ?? ITEM_RARITIES.common;
        const unique = item.item.rarity === 'unique';
        const half = unique ? D.gearUniqueHalf : D.gearHalf;
        ctx.save();
        ctx.translate(d.pos.x, y);
        ctx.rotate(Math.PI / 4);
        ctx.shadowColor = rc.color;
        ctx.shadowBlur = unique ? D.glowUnique : D.glow;
        ctx.fillStyle = '#23202a';
        ctx.fillRect(-half, -half, half * 2, half * 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = rc.color;
        ctx.lineWidth = D.outlineWidth;
        ctx.strokeRect(-half, -half, half * 2, half * 2);
        ctx.restore();
        // The floating label — dark pill + rarity-colored name.
        ctx.font = `bold ${D.labelFont}px Verdana`;
        ctx.textAlign = 'center';
        const label = item.item.name;
        const w = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(10,8,14,0.78)';
        ctx.fillRect(d.pos.x - w / 2 - D.labelPadX, y - D.labelLift, w + D.labelPadX * 2, D.labelPillH);
        ctx.fillStyle = rc.color;
        ctx.fillText(label, d.pos.x, y - D.labelLift + D.labelPillH - 4);
        continue;
      }
      const fill = item.kind === 'support' ? item.gem.def.color : item.inst.def.color;
      const half = item.kind === 'support' ? D.supportHalf : D.skillHalf;
      ctx.save();
      ctx.translate(d.pos.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = fill;
      ctx.shadowBlur = D.glow;
      ctx.fillStyle = fill;
      ctx.fillRect(-half, -half, half * 2, half * 2);
      ctx.shadowBlur = 0;
      if (item.kind === 'skill') {
        // The rarity ring is the tell from across the screen.
        const rc = SKILL_RARITIES[item.inst.rarity ?? 'common'].color;
        ctx.strokeStyle = rc;
        ctx.lineWidth = D.ringWidth;
        ctx.strokeRect(-half - D.ringPad, -half - D.ringPad, (half + D.ringPad) * 2, (half + D.ringPad) * 2);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = D.edgeWidth;
      ctx.strokeRect(-half, -half, half * 2, half * 2);
      ctx.restore();
    }
  }

  /** Sacrificial Fonts: a carved stone basin over a violet heart — petal
   *  flame licks wheeling above the bowl, glyph notches round the rim, and
   *  gem-motes spiraling DOWN into it (it eats skill gems, after all). */
  private drawFonts(world: World): void {
    const { ctx } = this;
    const t = world.time;
    for (const f of world.fonts) {
      const seed = ((f.pos.x * 13 + f.pos.y * 7) | 0) >>> 0;
      const ramp = rampOf('#4a4056', materialOf('stone'));
      const x = f.pos.x, y = f.pos.y;
      drawShadow(ctx, x, y + 2, 17, 0.5);
      // The basin: stone rim over a bowl falling to violet dark.
      ctx.fillStyle = ramp.base;
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = withAlpha(ramp.outline, 0.9);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.strokeStyle = withAlpha(ramp.light, 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(x, y, 14.4, Math.PI * 1.05, Math.PI * 1.7); ctx.stroke();
      const bg = ctx.createRadialGradient(x, y, 1, x, y, 11.5);
      bg.addColorStop(0, '#2a1a3a');
      bg.addColorStop(0.7, '#17101f');
      bg.addColorStop(1, '#100a16');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(x, y, 11.5, 0, Math.PI * 2); ctx.fill();
      // Glyph notches carved round the rim, breathing.
      ctx.strokeStyle = withAlpha('#b06bd4', 0.5 + 0.2 * Math.sin(t * 1.8 + seed));
      ctx.lineWidth = 1.1;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 12.6, y + Math.sin(a) * 12.6);
        ctx.lineTo(x + Math.cos(a) * 15.2, y + Math.sin(a) * 15.2);
        ctx.stroke();
      }
      // The violet heart: layered petal licks wheeling over the bowl.
      for (let i = 0; i < 3; i++) {
        const lick = Math.sin(t * 4.6 + i * 2.1) * 2;
        ctx.globalAlpha = 0.45 - i * 0.1 + 0.15 * Math.sin(t * 5 + i);
        ctx.fillStyle = i === 2 ? '#e8c8f8' : '#b06bd4';
        ctx.beginPath();
        ctx.ellipse(x + Math.sin(t * 2.2 + i * 2) * 1.6, y - 6 - i * 2.4,
          4.2 - i * 1.1, 7 - i * 1.4 + lick, Math.sin(t * 1.3 + i) * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Gem-motes spiraling down into the bowl.
      for (let i = 0; i < 3; i++) {
        const cyc = (t * 0.4 + i / 3) % 1;
        const a = cyc * Math.PI * 3 + i * 2.1 + seed;
        ctx.globalAlpha = Math.min(1, cyc * 2) * 0.7;
        ctx.fillStyle = i % 2 ? '#8fd0ff' : '#e8c8f8';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * (16 - cyc * 12), y - 14 + cyc * 12, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = '10px Verdana';
      ctx.fillStyle = '#b06bd4';
      ctx.fillText('Sacrificial Font', x, y + 32);
    }
  }

  /** Waypoints: a cyan ring stone — bright once attuned. */
  private drawWaypoint(world: World): void {
    const wp = world.waypointPos;
    if (!wp) return;
    const { ctx } = this;
    const t = performance.now() / 1000;
    const attuned = world.discoveredWaypoints.has(world.zone.id);
    const color = attuned ? '#5ad8d8' : '#3a6a72';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = attuned ? 0.5 + 0.2 * Math.sin(t * 3) : 0.25;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(wp.x, wp.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.font = '10px Verdana';
    ctx.fillStyle = color;
    ctx.fillText(attuned ? 'waypoint' : 'dormant waypoint', wp.x, wp.y + 36);
  }

  /** Resource orbs: little glowing droplets of life / mana / shield. */
  private drawResourceOrbs(world: World): void {
    const { ctx } = this;
    for (const o of world.orbs) {
      const def = ORB_DEFS[o.kind];
      if (!def) continue;
      const y = o.pos.y + Math.sin(o.bob) * 2.5;
      const fade = Math.min(1, o.life / 2);
      const r = def.size ?? 5.5;
      // Charge-bearing kinds breathe — a candle guttering, not a bead.
      const pulse = def.charge ? 1 + Math.sin(o.bob * 2) * 0.12 : 1;
      ctx.globalAlpha = 0.85 * fade;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = def.glow ?? 9;
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(o.pos.x, y, r * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(o.pos.x - r * 0.27, y - r * 0.27, r * 0.33, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /** Remnants: slow-spinning shards of leftover power (elemental trio +
   *  registry fragment kinds, tinted from their defining data). */
  private drawRemnants(world: World): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    const COLORS = { fire: '#ff7a3a', cold: '#7ac8e8', lightning: '#ffe14a' };
    for (const r of world.remnants) {
      const color = r.element ? COLORS[r.element]
        : REMNANT_KINDS[r.kind ?? '']?.color ?? '#c8c8c8';
      const y = r.pos.y + Math.sin(r.bob) * 2.5;
      const fade = Math.min(1, r.life / 2);
      ctx.save();
      ctx.translate(r.pos.x, y);
      ctx.rotate(t * 1.6);
      ctx.globalAlpha = 0.9 * fade;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(5, 0); ctx.lineTo(0, 8); ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  /** Tether bands: a soft wide beam + a bright core line between the cached
   *  endpoint coords, pulsing gently so a live wire reads as live. */
  private drawTethers(world: World): void {
    const { ctx } = this;
    if (!world.tethers.length) return;
    const t = performance.now() / 1000;
    const pulse = 0.75 + 0.25 * Math.sin(t * 5);
    for (const tb of world.tethers) {
      ctx.save();
      ctx.strokeStyle = tb.color;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.18 * pulse;
      ctx.lineWidth = Math.max(3, tb.width * 1.6);
      ctx.beginPath();
      ctx.moveTo(tb.ax, tb.ay);
      ctx.lineTo(tb.bx, tb.by);
      ctx.stroke();
      ctx.globalAlpha = 0.7 * pulse;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  private drawProjectiles(world: World): void {
    const { ctx } = this;
    this.drawTethers(world);
    for (const p of world.projectiles) {
      // Every projectile is ENERGY IN FLIGHT now: an additive glow underlay
      // in its own color + a motion streak trailing the heading. The shape
      // language on top is unchanged — behavior stays readable, it just
      // stopped looking like construction paper.
      drawGlow(ctx, p.pos.x, p.pos.y, p.radius * VIS_CFG.fx.glowScale, p.color, VIS_CFG.fx.glowAlpha);
      const sx = p.pos.x - Math.cos(p.dir) * p.radius * VIS_CFG.fx.streakLen;
      const sy = p.pos.y - Math.sin(p.dir) * p.radius * VIS_CFG.fx.streakLen;
      const streak = ctx.createLinearGradient(sx, sy, p.pos.x, p.pos.y);
      streak.addColorStop(0, withAlpha(p.color, 0));
      streak.addColorStop(1, withAlpha(p.color, VIS_CFG.fx.streakAlpha));
      ctx.strokeStyle = streak;
      ctx.lineWidth = Math.max(2, p.radius * 0.85);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(p.pos.x, p.pos.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      const r = p.radius;
      // Form geometry rides PROJ_FORM_GEO — the SAME factors the sim's hit
      // test uses (engine/projForms.ts), so the pixels and the hitbox can't
      // drift. Animated forms clock on p.age (sim time, deterministic, on
      // the co-op wire), never wall-clock.
      switch (p.shape) {
        case 'square': {
          const g = PROJ_FORM_GEO.square;
          ctx.rotate(p.dir + p.age * g.tumbleRate); // tumbling hammer feel
          ctx.fillRect(-r * g.half, -r * g.half, r * g.half * 2, r * g.half * 2);
          break;
        }
        case 'line': {
          const g = PROJ_FORM_GEO.line;
          ctx.rotate(p.dir);
          ctx.fillRect(-r * g.hAlong, -r * g.hAcross, r * g.hAlong * 2, r * g.hAcross * 2);
          break;
        }
        case 'triangle':
          ctx.rotate(p.dir + Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.lineTo(r * PROJ_FORM_GEO.triangle.base, r);
          ctx.lineTo(-r * PROJ_FORM_GEO.triangle.base, r);
          ctx.closePath();
          ctx.fill();
          break;
        case 'octagon': {
          ctx.rotate(p.age * PROJ_FORM_GEO.octagon.spinRate);
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2;
            if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
            else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
        case 'bar': {
          // A wide front perpendicular to travel — the beam wall.
          const g = PROJ_FORM_GEO.bar;
          ctx.rotate(p.dir);
          ctx.fillRect(-r * g.hAlong, -r * g.hAcross, r * g.hAlong * 2, r * g.hAcross * 2);
          ctx.globalAlpha = g.ghost.alpha;
          ctx.fillRect(-r * g.ghost.back, -r * g.ghost.hAcross, r * g.ghost.hAlong * 2, r * g.ghost.hAcross * 2);
          ctx.globalAlpha = 1;
          break;
        }
        case 'arc': {
          // A crescent opening backward (the pulse).
          const g = PROJ_FORM_GEO.arc;
          ctx.rotate(p.dir);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = r * g.stroke;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(-r * g.back, 0, r * g.ring, -g.halfWin, g.halfWin);
          ctx.stroke();
          ctx.globalAlpha = g.ghost.alpha;
          ctx.lineWidth = r * g.ghost.stroke;
          ctx.beginPath();
          ctx.arc(-r * g.ghost.back, 0, r * g.ghost.ring, -g.ghost.halfWin, g.ghost.halfWin);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'wave': {
          // A rolling sine front (the siege wave) — the exact curve the hit
          // test samples: touch the flame, take the flame.
          const g = PROJ_FORM_GEO.wave;
          ctx.rotate(p.dir + Math.PI / 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = r * g.stroke;
          ctx.lineCap = 'round';
          ctx.beginPath();
          const span = r * g.span;
          for (let wx = -span; wx <= span; wx += 4) {
            const wy = Math.sin((wx / span) * Math.PI * 2 + p.age * g.phaseRate) * r * g.amp;
            if (wx === -span) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
          }
          ctx.stroke();
          break;
        }
        default:
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          // White-hot core — the orb reads as a charge, not a dot.
          ctx.globalAlpha = VIS_CFG.fx.coreAlpha;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(-r * 0.12, -r * 0.12, r * 0.42, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
  }

  /** DEV OVERLAY (world.devHitboxes): outline every collision truth in view —
   *  doodad move surfaces (red) and shot surfaces where they differ (orange),
   *  actor bodies (white), and each flight's drawn-form hit test (cyan),
   *  all straight from the same resolvers the sim consults (hitSurfaceOf /
   *  PROJ_FORM_GEO). If the outline hugs the pixels, the fabric is honest. */
  private drawHitboxOverlay(world: World): void {
    const { ctx } = this;
    // cam is the view's TOP-LEFT world corner (see toWorld); canvas.width may
    // be device-pixel scaled, which only widens the cull window — harmless.
    const z = this.zoom, cw = this.canvas.width / z, ch = this.canvas.height / z;
    const x0 = this.cam.x - 160, x1 = this.cam.x + cw + 160;
    const y0 = this.cam.y - 160, y1 = this.cam.y + ch + 160;
    ctx.save();
    ctx.lineWidth = 1.4;
    const outlineShape = (s: HitShape, ax: number, ay: number): void => {
      ctx.beginPath();
      if (s.kind === 'circle') {
        ctx.arc(ax, ay, s.r, 0, Math.PI * 2);
      } else if (s.kind === 'multi') {
        // Rolled rock forms: one ring per lobe.
        for (const q of s.parts) {
          ctx.moveTo(ax + q.dx + q.r, ay + q.dy);
          ctx.arc(ax + q.dx, ay + q.dy, q.r, 0, Math.PI * 2);
        }
      } else {
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(s.rot ?? 0);
        ctx.rect(-s.hw, -s.hh, s.hw * 2, s.hh * 2);
        ctx.restore();
      }
      ctx.stroke();
    };
    for (const d of world.doodads) {
      if (d.gone || d.pos.x < x0 || d.pos.x > x1 || d.pos.y < y0 || d.pos.y > y1) continue;
      if (blocksMovement(d)) {
        // Fall-able pits are DROPS, not walls (the pitfall fabric): violet,
        // so the truth layer reads the difference at a glance — the mover
        // never pushes off these discs; it grasps their lips and falls.
        ctx.strokeStyle = pitRegionOf(d) ? 'rgba(168,120,255,0.9)' : 'rgba(255,80,80,0.9)';
        outlineShape(hitSurfaceOf(d, 'move'), d.pos.x, d.pos.y);
      }
      if (blocksProjectiles(d)) {
        const shot = hitSurfaceOf(d, 'shot');
        const move = blocksMovement(d) ? hitSurfaceOf(d, 'move') : null;
        if (!move || JSON.stringify(shot) !== JSON.stringify(move)) {
          ctx.strokeStyle = 'rgba(255,170,60,0.8)';
          outlineShape(shot, d.pos.x, d.pos.y);
        }
      }
    }
    // TRACK RIDERS (the track fabric): magenta — the posed surface the
    // contact sweep tested THIS frame, from the same pure resolver the
    // painter drew. If the outline hugs the blade, the fabric is honest.
    ctx.strokeStyle = 'rgba(255,120,235,0.95)';
    for (const tr of world.tracks) {
      for (const r of tr.riders) {
        const pose = trackPose(tr, world.time, r.phase, r.def);
        if (pose.x < x0 || pose.x > x1 || pose.y < y0 || pose.y > y1) continue;
        outlineShape(trackRiderSurface(r.def, pose), pose.x, pose.y);
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    for (const a of world.actors) {
      if (a.dead || a.pos.x < x0 || a.pos.x > x1 || a.pos.y < y0 || a.pos.y > y1) continue;
      ctx.beginPath();
      ctx.arc(a.pos.x, a.pos.y, a.radius, 0, Math.PI * 2);
      ctx.stroke();
      // SEGMENT FABRIC truth: a hittable chain shows every tested circle
      // (torn segments show their shrunken truth); render-only tails show
      // nothing — they carry no hit surface, honestly.
      if (segsHittable(a)) {
        for (let i = 0; i < a.worm!.segments.length; i++) {
          const s = a.worm!.segments[i];
          ctx.beginPath();
          ctx.arc(s.x, s.y, segR(a, i), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.strokeStyle = 'rgba(80,230,255,0.9)';
    for (const p of world.projectiles) {
      if (p.pos.x < x0 || p.pos.x > x1 || p.pos.y < y0 || p.pos.y > y1) continue;
      const r = p.radius;
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      switch (p.shape) {
        case 'line': case 'bar': {
          const g = PROJ_FORM_GEO[p.shape];
          ctx.rotate(p.dir);
          ctx.strokeRect(-r * g.hAlong, -r * g.hAcross, r * g.hAlong * 2, r * g.hAcross * 2);
          break;
        }
        case 'arc': {
          const g = PROJ_FORM_GEO.arc;
          ctx.rotate(p.dir);
          ctx.beginPath();
          ctx.arc(-r * g.back, 0, r * g.ring + r * g.stroke * 0.5, -g.halfWin, g.halfWin);
          ctx.arc(-r * g.back, 0, Math.max(1, r * g.ring - r * g.stroke * 0.5), g.halfWin, -g.halfWin, true);
          ctx.closePath();
          ctx.stroke();
          break;
        }
        case 'wave': {
          const g = PROJ_FORM_GEO.wave;
          ctx.rotate(p.dir + Math.PI / 2);
          const span = r * g.span;
          for (const side of [-1, 1]) {
            ctx.beginPath();
            for (let wx = -span; wx <= span; wx += 6) {
              const wy = Math.sin((wx / span) * Math.PI * 2 + p.age * g.phaseRate) * r * g.amp
                + side * r * g.stroke * 0.5;
              if (wx === -span) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
          }
          break;
        }
        default:
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  private drawTexts(world: World): void {
    const { ctx } = this;
    ctx.textAlign = 'center';
    for (const t of world.texts) {
      // Bind tokens resolve at DRAW, not at spawn — a float naming a key
      // stays honest even if the player rebinds (or grabs the pad) mid-air.
      const txt = this.resolveText(t.text);
      ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
      ctx.font = `bold ${t.size}px Verdana`;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(txt, t.pos.x, t.pos.y);
      ctx.fillText(txt, t.pos.x, t.pos.y);
    }
    ctx.globalAlpha = 1;
  }

  // -------------------------------------------------------------------- HUD

  /** POOL-ARC visibility (the poise/insight rings), per Settings.poolBars:
   *  'always' pins the arc on; 'recent' shows it for poolArcs.recentSecs
   *  around any change (value, max, or break-state — regen ticks count, so
   *  a recovering pool stays lit until it settles full); 'smart' (default)
   *  adds a STANDING spot while the pool is dented AND carries real build
   *  weight — its damage-worth (poise: max/drainRatio soaked before the
   *  break; insight: max × efficiency slipped) at least relevantFrac of
   *  maxLife+maxES. A full, untouched pool always tucks away; an
   *  un-invested one only surfaces the moment it actually acts. */
  private poolWatch = {
    poise: { last: -1, max: -1, state: 0, at: -Infinity },
    insight: { last: -1, max: -1, state: 0, at: -Infinity },
  };

  private poolArcShown(kind: 'poise' | 'insight', p: Actor, world: World): boolean {
    const cur = kind === 'poise' ? p.poise : p.insight;
    const max = kind === 'poise' ? p.maxPoise() : p.maxInsight();
    const state = kind === 'poise' && p.poiseBroken ? 1 : 0;
    const w = this.poolWatch[kind];
    if (w.at > world.time) w.at = -Infinity; // a new run rewound the clock
    // `last` only moves when the trip fires, so a slow regen re-trips as its
    // drift accumulates — continuous recovery reads as continuous change.
    if (Math.abs(cur - w.last) > 0.25 || Math.abs(max - w.max) > 0.25 || state !== w.state) {
      w.at = world.time;
      w.last = cur; w.max = max; w.state = state;
    }
    const mode = this.getSettings?.().poolBars ?? 'smart';
    if (mode === 'always') return true;
    if (world.time - w.at < VIS_CFG.poolArcs.recentSecs) return true;
    if (mode === 'recent') return false;
    if (cur >= max - 0.25) return false; // full + settled — tuck away
    // Damage-worth runs through the pool's OWN mechanic dial: poise meters
    // poiseDR across ~max/drainRatio damage before the break; insight slips
    // up to insightDR of each hit until max × efficiency damage is spent.
    const worth = kind === 'poise'
      ? (max / Math.max(0.05, DEFENSE_CFG.poise.drainRatio)) * p.sheet.get('poiseDR')
      : max * p.sheet.get('insightEfficiency') * p.sheet.get('insightDR');
    return worth / Math.max(1, p.maxLife() + p.maxEs()) >= VIS_CFG.poolArcs.relevantFrac;
  }

  private drawHud(world: World): void {
    // THE COUCH DISPATCH (data/couch.ts): solo draws the one classic centered
    // cluster — byte-identical. With guests seated, each local seat's cluster
    // anchors to its own flank (guest bars read pad glyphs, guest identity
    // docks to its side of the top edge); the world-level tail — wave banner,
    // boss bar — draws once either way.
    if (!world.couchActive()) {
      this.drawHudCluster(world, world.localSeat, 'center', false);
      this.drawHudStatus(world, world.localSeat, 16, 'left', true);
    } else {
      this.drawHudCluster(world, world.localSeat, COUCH_CFG.join.sides[0], false);
      this.drawHudStatus(world, world.localSeat, 16, 'left', true);
      for (const s of world.couchSeats()) {
        this.drawHudCluster(world, s, s.couch!.side, true);
        this.drawHudStatus(world, s, this.uiW - 16, 'right', false);
      }
    }
    this.drawHudTail(world);
  }

  /** ONE seat's HUD cluster — orbs, arcs, bar, pips, buffs, grammar rows,
   *  possession chip, XP — anchored center (the solo classic) or docked to a
   *  couch flank. Every widget below derives from bx/by/p, so the anchor is
   *  the whole difference. */
  private drawHudCluster(world: World, seat: Seat, anchor: 'center' | 'left' | 'right', padLabels: boolean): void {
    const { ctx } = this;
    // Virtual dims — the whole method runs inside the UI-scale sub-pass, so
    // every widget below grows with the player's dial for free.
    const w = this.uiW, h = this.uiH;
    const p = seat.actor;
    const m = seat.meta;

    // Skill-bar geometry — computed FIRST so the resource orbs can flank it.
    // The cluster sits high enough that its three text strips stay distinct:
    // slot key labels (by+slot+12), the XP bar (by+slot+18) and the DOM hint
    // bar hugging the bottom edge — at by = h-78 all three overlapped.
    const slot = 54, gap = 6;
    const totalW = p.skills.length * slot + (p.skills.length - 1) * gap;
    const orbR = 46, orbGap = 12; // hoisted: the flank anchors reserve orb room
    const by = h - 92;
    const bx = anchor === 'center' ? w / 2 - totalW / 2
      : anchor === 'left' ? COUCH_CFG.hud.sideInset + orbR * 2 + orbGap
        : w - COUCH_CFG.hud.sideInset - totalW - orbGap - orbR * 2;

    // Resource orbs FLANK the centered bar (life just-left, mana just-right) so
    // life / mana / skills read as ONE central cluster — vital info isn't shoved
    // into the screen corners anymore. Arcs key off each orb's new center.
    const lifeX = clamp(bx - orbGap - orbR, orbR + 8, w - orbR - 8);
    const manaX = clamp(bx + totalW + orbGap + orbR, orbR + 8, w - orbR - 8);
    const orbY = by + slot / 2;
    this.drawOrb(lifeX, orbY, orbR, p.life / p.maxLife(), '#a82828', '#481010',
      `${Math.max(0, Math.ceil(p.life))}`, 'Life',
      // The blood mortgage: the borrowed ceiling shows as a reserved band.
      p.maxLife() > 0 ? p.reservedLife / p.maxLife() : 0);
    // WARD (the decaying shield): a translucent BLUE film rising over the
    // health orb — covering more of it as the ward-to-life ratio climbs, so
    // ward reads as a layer OVER blood, distinct from the ES/absorb arcs.
    if (p.ward > 0) {
      const wf = clamp(p.ward / Math.max(1, p.maxLife()), 0.06, 1);
      ctx.save();
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(110,170,255,0.48)';
      ctx.fillRect(lifeX - orbR, orbY + orbR - wf * orbR * 2, orbR * 2, wf * orbR * 2);
      ctx.restore();
      // The count, tucked above the life number so both read.
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Verdana';
      ctx.fillStyle = '#a8ccff';
      ctx.fillText(`${Math.ceil(p.ward)}`, lifeX, orbY - 12);
    }
    // SEAL MARKER (Mortis Seal / Seal of Death): a gold line across the
    // life orb at the LOCKED level — where heals stop. QA and honesty both.
    if (p.lifeSealAt !== undefined && p.maxLife() > 0) {
      const sf = clamp(p.lifeSealAt / p.maxLife(), 0, 1);
      const sy = orbY + orbR - sf * orbR * 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(lifeX - orbR, sy);
      ctx.lineTo(lifeX + orbR, sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.font = '9px Verdana';
      ctx.fillStyle = '#ffd700';
      ctx.fillText('⚿ sealed', lifeX, sy - 3 < orbY - orbR + 8 ? sy + 10 : sy - 3);
    }
    // Energy shield: a cyan arc wrapping the life orb; absorb: white outer arc.
    // While the RECHARGE FLOWS, a faint full-circle track appears under the
    // arc (visible even at a drained pool) — the honest "stream is running"
    // signal; interruption reads as the track winking out.
    if (p.maxEs() > 0 && (p.es > 0 || p.esRecharging)) {
      if (p.esRecharging) {
        ctx.strokeStyle = 'rgba(90,216,216,0.22)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(lifeX, orbY, orbR + ORB_ARCS.es, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = p.esRecharging ? '#8af0f0' : '#5ad8d8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + ORB_ARCS.es, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(p.es / p.maxEs(), 0, 1));
      ctx.stroke();
    }
    if (p.absorb > 0) {
      ctx.strokeStyle = '#e8f0f8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + ORB_ARCS.absorb, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.absorb / 60));
      ctx.stroke();
    }
    // INSIGHT rides the LIFE orb with the other tank layers — it slips
    // damage before blood, so it reads as part of the life stack, not the
    // mana economy. Teal, BRIGHTNESS breathing with momentum — full glow at
    // a sprint, fading over the taper once you plant. Settings.poolBars
    // decides when it earns the spot (poolArcShown).
    if (p.maxInsight() > 0 && this.poolArcShown('insight', p, world)) {
      const momentum = p.insightMomentum();
      ctx.strokeStyle = `rgba(106,216,184,${(0.3 + 0.7 * momentum).toFixed(2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + ORB_ARCS.insight, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * clamp(p.insight / p.maxInsight(), 0, 1));
      ctx.stroke();
    }
    // POISE: a bronze arc outside the tank layers — dims while broken so
    // the lapse of its protection is readable at a glance (the recovering
    // climb fills VISIBLY dim, then snaps bright at the re-arm). An
    // OVERCHARGED crest burns brighter and lays its overage as a second
    // thin lap. Same poolBars methodology as insight (the break flip
    // counts as a change).
    if (p.maxPoise() > 0 && this.poolArcShown('poise', p, world)) {
      const maxP = p.maxPoise();
      const over = p.poise > maxP + 0.25;
      ctx.strokeStyle = p.poiseBroken ? 'rgba(216,176,106,0.35)'
        : over ? '#f4d494' : '#d8b06a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + ORB_ARCS.poise, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * clamp(p.poise / maxP, 0, 1));
      ctx.stroke();
      if (over) {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lifeX, orbY, orbR + ORB_ARCS.poise + 3, -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * clamp(p.poise / maxP - 1, 0, 1));
        ctx.stroke();
      }
    }
    // ENDURANCE (opt-in pool): the fortify-green outermost ring — binary
    // protection, so the ring simply IS or ISN'T there (opting in IS the
    // investment; no smart-hide second-guesses it).
    if (p.maxEndurance() > 0) {
      ctx.strokeStyle = '#a8c86a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + ORB_ARCS.endurance, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * clamp(p.endurance / p.maxEndurance(), 0, 1));
      ctx.stroke();
    }
    this.drawOrb(manaX, orbY, orbR, p.maxMana() > 0 ? p.mana / p.maxMana() : 0,
      '#2858b8', '#101848', `${Math.ceil(p.mana)}`, 'Mana',
      p.maxMana() > 0 ? p.reservedMana / p.maxMana() : 0);

    // Environmental-survival meters (breath underwater; future heat/cold) — tucked
    // under the mana orb, shown only while a resource is below max (i.e. active).
    this.drawSurvival(p, manaX, orbY, orbR);

    // Skill bar
    ctx.textAlign = 'center';
    const keyLabels = this.slotKeys(padLabels);
    for (let i = 0; i < p.skills.length; i++) {
      const x = bx + i * (slot + gap);
      const inst = p.skills[i];
      // THE TOGGLE GOLDEN RULE: one gold border for EVERY "this is running"
      // state — auras, summon contracts (Stone Golem's reservation), pool
      // vents, and toggled curse-fields alike. If a support converts a
      // skill into a toggle, the glow follows the state, not the tag.
      const runningOn = inst ? (
        p.activeAuras.has(inst.def.id)
        || p.summonToggles.has(inst.def.id)
        || p.strobes.has(inst.def.id)
        || p.hexToggles.has(inst.def.id)
        // ARMED trigger gems (the "Cast on X" family): the slot itself is
        // greyed (never hand-castable), but the border glow says "live".
        || (instanceTrigger(inst) !== undefined && !inst.state?.triggerOff)
        || (inst.def.pool !== undefined && p.venting.has(inst.def.pool.id))
        || world.zones.some(z => z.caster === p && z.toggled && z.inst.def.id === inst.def.id)
      ) : false;
      ctx.fillStyle = 'rgba(10,10,16,0.85)';
      ctx.strokeStyle = runningOn ? '#c8a84b' : '#3a3a52';
      ctx.lineWidth = runningOn ? 2.5 : 1.5;
      ctx.fillRect(x, by, slot, slot);
      ctx.strokeRect(x, by, slot, slot);
      if (inst) {
        const def = inst.def;
        // THE SLOT'S FACE: a converted skill (SkillDef.convert — a full
        // Tame presses as the Whistle) presents the CONVERTED look: color,
        // initials, and the cooldown clock a press would actually answer to.
        const face = world.slotFaceOf(p, inst);
        const cost = p.skillCost(inst);
        // GATED skills grey out hard: no fuel in the pool, no afflicted
        // target in range — the bar tells you before the button does.
        const gated = face === def && !world.skillUsable(p, inst);
        ctx.fillStyle = face.color;
        // A toggled-ON contract is always bright: the off-press is free —
        // "unaffordable" dimming would lie about the one press that helps.
        ctx.globalAlpha = gated ? 0.15
          : (runningOn || (p.mana >= cost.mana && p.life > cost.life)) ? 0.9 : 0.3;
        ctx.fillRect(x + 4, by + 4, slot - 8, slot - 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#0a0a0e';
        ctx.font = 'bold 13px Verdana';
        // Stateful skills can change face: Mark shows REC while armed.
        const label = inst.state?.markPos ? 'REC' : initials(face.name);
        ctx.fillText(label, x + slot / 2, by + slot / 2 + 5);
        // Cooldown sweep — measured against the clock actually SET (an
        // Apotheosis-imposed cooldown sweeps too, not just innate ones).
        const cd = p.cooldowns.get(face.id);
        const cdTotal = p.cooldownTotals.get(face.id) ?? face.cooldown;
        if (cd !== undefined && cdTotal > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          const frac = clamp(cd / cdTotal, 0, 1);
          ctx.fillRect(x + 4, by + 4, slot - 8, (slot - 8) * frac);
        }
        // USE-CHARGE pips (instanceUseCharges — a native bank OR a socketed
        // munition graft's: a CHAMBERED cast reads at the button exactly
        // like a gun): the bank across the slot's top edge — bright =
        // loaded, hollow = recovering. An empty bank dims the slot like a
        // cooldown would — UNLESS the slot converted (the reload face is
        // the live button; hollow pips already say why).
        if (instanceUseCharges(inst)) {
          const bank = p.skillChargeBank(inst);
          const cap = p.skillChargeCap(inst);
          if (bank.count <= 0 && face === def) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x + 4, by + 4, slot - 8, slot - 8);
          }
          // THE RECHARGE LINE (2026-07-22 — the second clock, visibly its
          // own): a below-cap bank's trickle/drip rides a thin bright
          // line CLIMBING the slot — never the cooldown's darkening
          // shade — so both clocks can run at once and read apart.
          {
            const uc = instanceUseCharges(inst)!;
            const mag = uc.magazine;
            const period = uc.recharge
              ?? (mag && mag !== true && mag.drip ? face.cooldown : 0);
            if (bank.count < cap && period > 0 && bank.timer > 0) {
              const rfrac = clamp(bank.timer / period, 0, 1);
              const ly = by + slot - 4 - (slot - 8) * rfrac;
              ctx.fillStyle = 'rgba(255,232,106,0.85)';
              ctx.fillRect(x + 4, ly, slot - 8, 1.5);
            }
          }
          for (let c = 0; c < Math.min(cap, 8); c++) {
            ctx.fillStyle = c < bank.count ? '#ffe86a' : 'rgba(90,90,110,0.8)';
            ctx.fillRect(x + 5 + c * 6, by + 5, 4, 4);
            // A hairline dark rim so the loaded count reads against any
            // slot art — the fill colors carry the meaning, the rim the edge.
            ctx.strokeStyle = 'rgba(0,0,0,0.85)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 5.5 + c * 6, by + 5.5, 3, 3);
          }
        }
        // UNLEASH SEAL tics (World.unleashSealsOf): banked ghost-repeats as
        // small diamonds along the BOTTOM edge — bright = a seal ready to
        // salvo, hollow = still winding. The count-badge lane (top-right)
        // stays reserved for living things; seals get their own shape and
        // shore so the two never read as each other.
        {
          const seals = world.unleashSealsOf(p, inst);
          if (seals) {
            for (let c = 0; c < Math.min(seals.max, 8); c++) {
              const sx = x + 9 + c * 8, sy = by + slot - 8;
              ctx.beginPath();
              ctx.moveTo(sx, sy - 3.4); ctx.lineTo(sx + 3.4, sy);
              ctx.lineTo(sx, sy + 3.4); ctx.lineTo(sx - 3.4, sy);
              ctx.closePath();
              if (c < seals.count) { ctx.fillStyle = '#b8d858'; ctx.fill(); }
              else {
                ctx.strokeStyle = 'rgba(184,216,88,0.45)';
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }
        }
        // SELF-STACK ticks (World.selfStacksOf): the skill's OWN pile as
        // small chevrons climbing the LEFT edge — the blade's heat, read
        // at the button that built it. Bright = a held stack, hollow =
        // room to ramp; the pile bleeds while the skill rests, and these
        // bleed with it. Left shore: seals keep the bottom, banks the top.
        {
          const pile = world.selfStacksOf(inst);
          if (pile) {
            for (let c = 0; c < Math.min(pile.max, 8); c++) {
              const sx = x + 6, sy = by + slot - 14 - c * 7;
              ctx.beginPath();
              ctx.moveTo(sx - 3, sy + 2.6);
              ctx.lineTo(sx, sy - 2.6);
              ctx.lineTo(sx + 3, sy + 2.6);
              if (c < pile.count) {
                ctx.strokeStyle = '#e8b458';
                ctx.lineWidth = 2;
              } else {
                ctx.strokeStyle = 'rgba(232,180,88,0.35)';
                ctx.lineWidth = 1;
              }
              ctx.stroke();
            }
          }
        }
        // FOUNT PIPS (ChargeDef.hud 'slot'): a spender's bank rides its
        // own slot — one registry-tinted disc per banked sip, hollow up
        // to the folded cap, so "how many drinks are left" reads at the
        // button that spends them. The buff-row pip lane skips these.
        // An empty bank already greys the whole slot via skillUsable.
        {
          const cc = instanceChargeCost(inst);
          if (cc && CHARGE_DEFS[cc.charge]?.hud === 'slot') {
            const held = p.charges.get(cc.charge) ?? 0;
            const cap = Math.max(held, p.chargeCapFor(cc.charge, inst));
            const py = def.useCharges ? by + 12 : by + 7;
            for (let c = 0; c < Math.min(cap, 8); c++) {
              ctx.beginPath();
              ctx.arc(x + 9 + c * 8, py, 3, 0, Math.PI * 2);
              if (c < held) {
                ctx.fillStyle = chargeColor(cc.charge);
                ctx.fill();
                // A hairline dark rim around each FILLED sip: the tint
                // stays the message, the rim keeps the count legible
                // against slot art and cooldown shade alike.
                ctx.strokeStyle = 'rgba(0,0,0,0.85)';
                ctx.lineWidth = 1;
                ctx.stroke();
              } else {
                ctx.fillStyle = 'rgba(10,10,16,0.75)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(200,200,220,0.55)';
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
          }
        }
        // BRIM strip (ChannelSpec.brim / a Gathered Casting conversion):
        // the persistent gauge lives on the slot's bottom edge — the
        // banked scream visible between presses, gold at the brim. Gated
        // on the LEDGER, not the def: converted casts have no def.channel.
        {
          const bFill = p.brims?.get(def.id)?.fill ?? 0;
          if (bFill > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(x + 3, by + slot - 7, slot - 6, 4);
            ctx.fillStyle = bFill >= 1 ? '#ffd700' : def.color;
            ctx.fillRect(x + 3, by + slot - 7, (slot - 6) * bFill, 4);
          }
        }
        // Skill level badge
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 9px Verdana';
        ctx.textAlign = 'right';
        ctx.fillText(String(inst.level), x + slot - 5, by + slot - 5);
        ctx.textAlign = 'center';
        // COUNT badge — top-right corner of the ICON itself, so a socketed
        // meta-button can never hide it. The golden rule: the badge shows
        // WHATEVER the skill currently has ALIVE — minions and constructs
        // (turrets, pods, arrows), stacked worn fields (Blizzard Coil's
        // layers), or the stacks of the buff the skill grants (Carve).
        {
          let count = 0;
          if (def.throng) {
            // THE THRONG: the badge is the roster — the one number the
            // whole playstyle turns on (engine/throng.ts). A lite-tier
            // roster's POOL ROWS count too (engine/lite.ts; a co-op client
            // shows only promoted bodies — its pool mirror carries no
            // owners, an accepted MVP-fidelity degradation).
            count = world.throngBodiesOf(p, def.id).length;
            if (def.throng.tier === 'lite' && world.lite.liveCount) {
              const kindIdx = world.liteKindOf(def.throng.monsterId);
              if (kindIdx >= 0) count += world.lite.countOwned(p.id, kindIdx);
            }
          } else if (def.delivery.type === 'summon' || def.delivery.type === 'construct') {
            count = world.minionsOfSkill(p, def.id).length;
          } else if (def.delivery.type === 'ground' && def.delivery.follow) {
            count = world.zones.filter(z =>
              z.caster === p && z.inst.def.id === def.id && z.exploded).length;
          } else {
            const bfx = def.effects.find(f => f.type === 'buff' && (f.maxStacks ?? 1) > 1);
            if (bfx && bfx.type === 'buff') count = p.buffs.get(bfx.id)?.stacks ?? 0;
          }
          if (count > 0) {
            ctx.fillStyle = 'rgba(8,8,12,0.9)';
            ctx.beginPath();
            ctx.arc(x + slot - 9, by + 10, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#c8a84b';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#ffe86a';
            ctx.font = 'bold 9px Verdana';
            ctx.fillText(String(count), x + slot - 9, by + 13);
          }
        }
        // The SLIVER under the meta button — the golden rule: whatever the
        // slot is still DOING shows its countdown here. Combo windows
        // (Trisect's reset clock) take the bar first; otherwise a released
        // persist-and-decay (Hailcrown / Glacier Crown still raining).
        {
          let sliver = 0;
          if (def.comboChain && inst.state?.comboAt !== undefined
            && (inst.state.comboIdx ?? 0) > 0) {
            sliver = 1 - (world.time - inst.state.comboAt) / def.comboChain.window;
          } else {
            const pp = world.pendingPersists.find(q =>
              q.caster === p && q.inst.def.id === def.id);
            if (pp && pp.total > 0) sliver = pp.remaining / pp.total;
          }
          if (sliver > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x, by - 6, slot, 3);
            ctx.fillStyle = def.color;
            ctx.fillRect(x, by - 6, slot * clamp(sliver, 0, 1), 3);
          }
        }
        // META-ACTION mini-button riding the slot (modifier+key) — raised
        // clear of the icon so the combo sliver and count badges breathe.
        const meta = instanceMeta(inst);
        if (meta) {
          const mh = 14;
          const my = by - mh - 8;
          const metaCd = p.cooldowns.has(meta.skillId);
          ctx.fillStyle = 'rgba(10,10,16,0.85)';
          ctx.strokeStyle = metaCd ? '#3a3a52' : '#c8a84b';
          ctx.lineWidth = 1.2;
          ctx.fillRect(x, my, slot, mh);
          ctx.strokeRect(x, my, slot, mh);
          ctx.fillStyle = metaCd ? '#6a6a7a' : '#e8d8a0';
          ctx.font = 'bold 8px Verdana';
          ctx.fillText(`⇧ ${meta.label}`, x + slot / 2, my + mh - 4);
        }
        // Socketed gem pips
        let gx = x + 6;
        for (const s of inst.sockets) {
          if (!s) continue;
          ctx.fillStyle = s.def.color;
          ctx.fillRect(gx, by + slot - 9, 5, 5);
          gx += 7;
        }
      }
      ctx.fillStyle = '#8a8678';
      ctx.font = '10px Verdana';
      ctx.fillText(keyLabels[i] ?? '?', x + slot / 2, by + slot + 12);
    }

    // Buff pips — RAISED above the meta-button row so both always read;
    // hovering a pip names it (one small label, never a wall of text).
    const buffY = by - 40;
    let bpx = bx;
    let hoverLabel: { x: number; text: string } | null = null;
    for (const [id, buff] of p.buffs) {
      ctx.fillStyle = '#c8a84b';
      ctx.fillRect(bpx, buffY, 10, 10);
      if (buff.stacks > 1) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Verdana';
        ctx.fillText(String(buff.stacks), bpx + 5, buffY - 2);
      }
      const mx = this.uiMouse.x, myv = this.uiMouse.y; // virtual-space, matching the scaled pip rects
      if (mx >= bpx - 2 && mx <= bpx + 12 && myv >= buffY - 2 && myv <= buffY + 12) {
        const rem = Math.max(...buff.expiries ?? [buff.remaining ?? 0]);
        hoverLabel = { x: bpx + 5, text: `${id.replace(/_/g, ' ')} ${rem > 0 && rem < 900 ? Math.ceil(rem) + 's' : ''}`.trim() };
      }
      bpx += 14;
    }
    // Charge pips (combo resources) next to the buffs, registry-tinted.
    // 'slot'-homed charges (flask founts) draw on their SPENDER's hotbar
    // slot instead — skipped here only while such a spender is slotted,
    // so an unslotted fount's bank still reads somewhere.
    for (const [name, count] of p.charges) {
      if (count <= 0) continue;
      if (CHARGE_DEFS[name]?.hud === 'slot'
        && p.skills.some(s => s && instanceChargeCost(s)?.charge === name)) continue;
      ctx.fillStyle = chargeColor(name);
      ctx.beginPath();
      ctx.arc(bpx + 5, buffY + 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Verdana';
      ctx.fillText(`${count}`, bpx + 5, buffY - 2);
      const mx = this.uiMouse.x, myv = this.uiMouse.y; // virtual-space, matching the scaled pip rects
      if (mx >= bpx - 2 && mx <= bpx + 12 && myv >= buffY - 2 && myv <= buffY + 12) {
        hoverLabel = { x: bpx + 5, text: chargeLabel(name) };
      }
      bpx += 18;
    }
    if (hoverLabel) {
      ctx.font = '10px Verdana';
      const tw = ctx.measureText(hoverLabel.text).width + 10;
      ctx.fillStyle = 'rgba(8,8,12,0.92)';
      ctx.fillRect(hoverLabel.x - tw / 2, buffY - 24, tw, 15);
      ctx.strokeStyle = '#3a3a52';
      ctx.lineWidth = 1;
      ctx.strokeRect(hoverLabel.x - tw / 2, buffY - 24, tw, 15);
      ctx.fillStyle = '#d8d4c8';
      ctx.fillText(hoverLabel.text, hoverLabel.x, buffY - 13);
    }

    // INVOCATION RUNES: the woven SEQUENCE as ordered diamonds above the
    // bar's right edge — order is the whole grammar, so it must read.
    if (p.runes.length > 0) {
      const rx0 = bx + totalW - p.runes.length * 16;
      for (let i = 0; i < p.runes.length; i++) {
        const info = RUNE_INFO[p.runes[i] as keyof typeof RUNE_INFO];
        const rx = rx0 + i * 16, ry = by - 54;
        ctx.fillStyle = info?.color ?? '#c8a8e8';
        ctx.beginPath();
        ctx.moveTo(rx, ry - 7);
        ctx.lineTo(rx + 6, ry);
        ctx.lineTo(rx, ry + 7);
        ctx.lineTo(rx - 6, ry);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // THE COMBO GRAMMAR chips: one pip row per equipped grammar above the
    // bar's LEFT edge (the runes hold the right) — pips fill as the live
    // tail matches the pattern, and a completed measure flashes the rule's
    // name for a beat. Circles vs the runes' diamonds: two grammars, two
    // shapes. Co-op mirrors draw host-computed rows (Actor.comboHud);
    // live worlds read the sheet + ring directly, so the chip appears the
    // moment a grammar is granted — before the first cast is ever thrown.
    {
      type ComboHudRow = { id: string; lit: number; len: number; glow: number };
      let comboRows: ComboHudRow[] | null = p.comboHud ?? null;
      if (!comboRows) {
        for (const rule of COMBO_LIST) {
          if (p.sheet.get(comboStat(rule.id)) <= 0) continue;
          const pr = comboProgress(p.castRing ?? [], rule, world.time, p.sheet.get('comboWindow'));
          const fire = p.comboFire?.get(rule.id);
          const glow = fire ? Math.max(0, 1 - (world.time - fire.at) / COMBO_CFG.hudGlow) : 0;
          (comboRows ??= []).push({ id: rule.id, lit: pr.lit, len: pr.len, glow });
        }
      }
      if (comboRows?.length) {
        let cy = by - 54;
        for (const row of comboRows) {
          const rule = COMBO_RULES[row.id];
          if (!rule) continue;
          for (let i = 0; i < row.len; i++) {
            const cx = bx + 8 + i * 14;
            ctx.beginPath();
            ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
            if (i < row.lit || row.glow > 0) {
              ctx.fillStyle = rule.color;
              ctx.globalAlpha = i < row.lit ? 1 : row.glow;
              ctx.fill();
              ctx.globalAlpha = 1;
            } else {
              ctx.fillStyle = 'rgba(8,8,12,0.7)';
              ctx.fill();
            }
            ctx.strokeStyle = i < row.lit ? 'rgba(0,0,0,0.6)' : 'rgba(160,160,180,0.45)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
          if (row.glow > 0) {
            ctx.globalAlpha = row.glow;
            ctx.fillStyle = rule.color;
            ctx.font = 'bold 11px Verdana';
            ctx.textAlign = 'left';
            ctx.fillText(rule.name + '!', bx + 8 + row.len * 14 + 4, cy + 4);
            ctx.globalAlpha = 1;
          }
          cy -= 16;
        }
        ctx.textAlign = 'center';
      }
    }

    // THE POSSESSION STRIP (the possession seam, engine/possess.ts): while
    // the local seat rides a foreign body, one centered chip above the bar
    // carries the whole contract — WHOSE flesh you wear, how long it holds,
    // and (for a standing husk) the life of the body you left behind. The
    // bars/slots/orbs above already show the BORROWED body (world.player
    // follows the pointer); this chip is the tether home. Host/single only
    // by construction: a co-op client's localSeat never sets `home`.
    {
      const home = seat.home;
      const ride = home ? p.possession : undefined;
      if (home && ride) {
        const cy = by - 74;
        const remain = ride.until !== undefined ? Math.max(0, ride.until - world.time) : null;
        const title = ride.kind === 'shift'
          ? `${p.name}` : `riding ${p.name}`;
        const label = remain !== null ? `${title} — ${Math.ceil(remain)}s` : title;
        ctx.font = 'bold 11px Verdana';
        const lw = ctx.measureText(label).width;
        const huskW = ride.huskMode === 'stands' ? 96 : 0;
        const chipW = lw + 16 + (huskW ? huskW + 10 : 0);
        // Centered over THIS cluster's bar (solo bar is screen-centered, so
        // the classic w/2 placement falls out exactly).
        const cx0 = bx + totalW / 2 - chipW / 2;
        ctx.fillStyle = 'rgba(10,8,16,0.85)';
        ctx.fillRect(cx0, cy - 11, chipW, 20);
        ctx.strokeStyle = '#b8a8e8';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx0, cy - 11, chipW, 20);
        ctx.fillStyle = '#b8a8e8';
        ctx.textAlign = 'left';
        ctx.fillText(label, cx0 + 8, cy + 4);
        if (huskW) {
          // The husk sliver: the flesh you answer for, wherever it stands.
          const hx = cx0 + lw + 18;
          const frac = home.maxLife() > 0 ? clamp(home.life / home.maxLife(), 0, 1) : 0;
          ctx.font = '9px Verdana';
          ctx.fillStyle = '#8a82a8';
          ctx.fillText('YOUR FLESH', hx, cy - 1);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(hx, cy + 1, huskW, 5);
          ctx.fillStyle = frac > 0.5 ? '#7ec87e' : frac > 0.25 ? '#d8b060' : '#d86060';
          ctx.fillRect(hx, cy + 1, huskW * frac, 5);
        }
        ctx.textAlign = 'center';
      }
    }

    // XP bar — tucked between the key-label row above and the DOM hint bar
    // below (its box top sits at ~h-17; +16 keeps the bar fully clear of it).
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by + slot + 16, totalW, 5);
    ctx.fillStyle = '#b8a0e0';
    ctx.fillRect(bx, by + slot + 16, totalW * clamp(m.xp / m.xpNeeded, 0, 1), 5);
  }

  /** ONE seat's top-edge status block: the identity line + mode badge +
   *  unspent-point nudges, docked left (the solo classic, byte-identical) or
   *  right (a couch guest, mirrored). `worldInfo` rides only the FIRST
   *  block: zone banner, living-world line, objective, XP blessing,
   *  reputation, the font hint — world-level facts drawn exactly once. */
  private drawHudStatus(world: World, seat: Seat, x: number, align: 'left' | 'right', worldInfo: boolean): void {
    const { ctx } = this;
    const p = seat.actor;
    const m = seat.meta;
    // A guest's hints name PAD glyphs (a couch guest IS a pad); the classic
    // block keeps the live keyboard/pad arbitration it always had.
    const hintKey = (id: 'panelTree' | 'panelInv'): string =>
      worldInfo ? this.actionKey(id) : padDisplay(this.getSettings?.().padBinds[id] ?? '');
    ctx.textAlign = align;
    ctx.font = 'bold 14px Verdana';
    ctx.fillStyle = '#c8a84b';
    // THE NAME leads; the class rides along only when they differ (an unnamed
    // "Rogue — Level 5 Rogue" would read as a stutter).
    const titleLine = m.name !== m.classDef.name
      ? `${m.name}  —  Level ${p.level} ${m.classDef.name}`
      : `${m.classDef.name}  —  Level ${p.level}`;
    ctx.fillText(titleLine, x, 26);
    // CHARACTER-MODE chip (data-driven — any stage that declares a badge shows
    // one): the Immortal's SWORN → UNDYING standing, at a glance, in mode color.
    const stage = world.seatStageDef(seat);
    if (stage.badge) {
      const titleW = ctx.measureText(titleLine).width;
      ctx.font = 'bold 10px Verdana';
      const bw = ctx.measureText(stage.badge).width + 12;
      const chipX = align === 'left' ? x + titleW + 12 : x - titleW - 12 - bw;
      const col = world.seatModeDef(seat).color;
      ctx.fillStyle = '#16121c';
      ctx.fillRect(chipX, 14, bw, 15);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.strokeRect(chipX, 14, bw, 15);
      ctx.fillStyle = col;
      ctx.textAlign = 'left'; // the badge keeps its own left edge inside the chip
      ctx.fillText(stage.badge, chipX + 6, 25);
      ctx.textAlign = align;
    }
    let hintY = worldInfo ? 100 : 46; // a guest's hints start right under its title
    // A guest whose CONTROLLER left (Bluetooth sleep, device churn): the
    // flank says so where the hints would sit. Reconnecting the same device
    // re-binds the seat by itself (the identity sweep) and clears this.
    if (!worldInfo && this.couchPadLost.includes(seat.id)) {
      ctx.font = 'bold 12px Verdana';
      ctx.fillStyle = '#e8685a';
      ctx.fillText('CONTROLLER DISCONNECTED — reconnect to rejoin', x, hintY);
      hintY += 18;
    }
    if (worldInfo) {
      ctx.font = '12px Verdana';
      ctx.fillStyle = world.zone.theme.accent;
      const lvText = world.zone.level > 0 ? ` — Monster Lv ${world.zone.level}` : '';
      // Underground, the banner names the BAND (the strata fabric): where you
      // are on the world's vertical ladder, read from caveDepth.
      const stratText = world.zone.caveDepth != null
        ? ` · ${stratumOf(world.zone.caveDepth).name}` : '';
      ctx.fillText(`${world.zone.name}${lvText}${stratText}`, x, 46);
      // Living-world status: time of day · weather · who holds this ground.
      ctx.font = '11px Verdana';
      ctx.fillStyle = '#9ab0c8';
      ctx.fillText(world.sim.hudLine(world.zone, world.time), x, 64);
      ctx.font = '12px Verdana';
      ctx.fillStyle = world.objectiveDone ? '#ffd700' : '#9a96b8';
      ctx.fillText(world.objectiveText(), x, 82);
    }
    // The kill counter is RUN-END information (credits math, the death
    // screen) — mid-run it's clutter, so the HUD no longer carries it.
    // Unspent-point nudges only — carried-gem COUNTS retired (the refreshed
    // inventory owns that bookkeeping; a tally here was clutter, and its hint
    // key had already drifted from the binds). Keys read live from settings.
    ctx.font = '12px Verdana';
    if (m.passivePoints > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`${m.passivePoints} passive point${m.passivePoints > 1 ? 's' : ''} — press ${hintKey('panelTree')}`, x, hintY);
      hintY += 18;
    }
    if (m.skillPoints > 0) {
      ctx.fillStyle = '#7ec8a0';
      ctx.fillText(`${m.skillPoints} skill point${m.skillPoints > 1 ? 's' : ''} — press ${hintKey('panelInv')}`, x, hintY);
      hintY += 18;
    }
    if (worldInfo && world.mireilleXpBuff > 0) {
      const t = Math.ceil(world.mireilleXpBuff);
      ctx.fillStyle = '#a0d8a0';
      ctx.fillText(`✦ +5% XP blessing — ${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`, x, hintY);
      hintY += 18;
    }
    if (worldInfo) {
      const rep = world.sim.reputation.hud();
      if (rep) {
        ctx.fillStyle = '#e8c87a';
        ctx.fillText(rep, x, hintY);
        hintY += 18;
      }
      if (world.nearFont()) {
        ctx.fillStyle = '#b06bd4';
        ctx.fillText(`Sacrificial Font — offer skill gems in the Build drawer (${this.actionKey('panelInv')}) · ${m.offerings}/${OFFERINGS_PER_POINT}`, x, hintY);
      }
    }
  }

  /** The world-level HUD tail — the wave banner + the boss-bar stack. Drawn
   *  ONCE regardless of how many local clusters are up. */
  private drawHudTail(world: World): void {
    const { ctx } = this;
    const w = this.uiW;
    if (world.zone.objective.kind === 'waves' && !world.objectiveDone
      && !world.waveActive && !world.gameOver) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px Verdana';
      ctx.fillStyle = '#c8a84b';
      ctx.fillText(`Wave ${world.wave + 1} in ${Math.ceil(world.waveTimer)}...`, w / 2, 110);
    }

    // Boss bar — pushed down below the co-op party strip when it's showing, so the
    // two top-center stacks never collide (gated on party size = SP pixel-parity).
    // WHO owns the bar is pure policy and lives in ONE place: World.bossBarInfo
    // (authored boss fights, live-latched) — hosts derive it, co-op clients read
    // the same row shipped per snapshot (Actor.netBossBar). The renderer only draws.
    const barOf = (a: Actor): { pips: number; lit: number; hl: boolean } | null =>
      a.netBossBar ?? world.bossBarInfo(a);
    let bar: { pips: number; lit: number; hl: boolean } | null = null;
    const boss = world.actors.find(a => { bar = barOf(a); return bar !== null; });
    if (boss && bar) {
      const info: { pips: number; lit: number; hl: boolean } = bar;
      const oy = world.party.strip.length > 1 ? 20 : 0;
      const bw2 = Math.min(520, w - 200);
      const bx = w / 2 - bw2 / 2;
      // WARDED: while the boss is untargetable (the Unmade's P4 echo-guard gate), the
      // bar reads grey + 'WARDED' so the player KNOWS why damage isn't landing — it's
      // a clear decision-test (kill the guard), not an arbitrary immune wall.
      const warded = boss.untargetable;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(bx, 24 + oy, bw2, 14);
      ctx.fillStyle = warded ? '#5a5a66' : '#c03030';
      ctx.fillRect(bx, 24 + oy, bw2 * (warded ? 1 : clamp(boss.life / boss.maxLife(), 0, 1)), 14);
      ctx.strokeStyle = '#3a3a52';
      ctx.strokeRect(bx, 24 + oy, bw2, 14);
      // Phase pips for a multi-phase boss (info.pips = 0 draws bare). The
      // HP-ladder FILLS pips as phases are entered (one-way); a script FSM
      // HIGHLIGHTS the current phase instead (scripts loop, so "progress"
      // is a position, not a count). Both derived in bossBarInfo.
      for (let i = 0; i < info.pips; i++) {
        ctx.fillStyle = (info.hl ? i === info.lit : i < info.lit) ? '#d060e0' : '#2a2a3a';
        ctx.fillRect(bx + bw2 - (info.pips - i) * 12, 40 + oy, 9, 4);
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px Verdana';
      ctx.fillStyle = warded ? '#c0c0cc' : '#ffd0d0';
      ctx.fillText(warded ? `${boss.name} — WARDED` : boss.name, w / 2, 52 + oy);
      // THE MARQUEE PORTRAIT — the boss itself beside its bar, through the
      // portrait fabric (the same bakes its body blits from). Subject memoed
      // per boss actor; the tile is the fabric's cached blit. Built from the
      // ACTOR's replicated look fields (co-op clients have no defId), with
      // the def's dials/worm/parts layered on when the registry resolves.
      const psize = VIS_CFG.portrait.seats.marquee;
      if (psize > 0) {
        if (this.marqueeSubject?.actorId !== boss.id) {
          const stamp = (d: { faction?: string }): boolean => !!FACTIONS[d.faction ?? '']?.nubHorns;
          const def = MONSTERS[boss.defId ?? ''];
          this.marqueeSubject = {
            actorId: boss.id,
            subject: portraitSubjectOf({
              shape: boss.shape, radius: boss.radius, color: boss.color,
              material: boss.material, adorn: boss.adorn, look: boss.look,
              demonHorns: stamp(boss),
              portrait: def?.portrait, worm: def?.worm, parts: def?.parts,
              extraParts: boss.extraParts,
            }, {
              resolvePart: id => {
                const p = MONSTERS[id];
                return p ? { ...p, demonHorns: stamp(p) } : undefined;
              },
            }),
          };
        }
        const px = bx - psize - 12, py = 24 + oy + 7 - psize / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(px - 3, py - 3, psize + 6, psize + 6);
        ctx.strokeStyle = '#3a3a52';
        ctx.strokeRect(px - 3, py - 3, psize + 6, psize + 6);
        if (warded) ctx.globalAlpha = 0.55;
        ctx.drawImage(portraitTile(this.marqueeSubject.subject, { size: psize }), px, py, psize, psize);
        ctx.globalAlpha = 1;
      }
    } else if (this.marqueeSubject) {
      this.marqueeSubject = null; // the fight ended — drop the memo
    }
  }

  /** The boss-marquee portrait memo (subject rebuilt only when the bar's
   *  owner changes — the tile itself lives in the portrait fabric's LRU). */
  private marqueeSubject: { actorId: number; subject: PortraitSubject } | null = null;

  /** Environmental-survival meters under an orb — one slim bar per resource the
   *  player has BELOW max (hidden when full / never-touched). Registry-driven, so a
   *  future heat/cold resource renders automatically from its SURVIVAL_RESOURCES row. */
  private drawSurvival(p: Actor, cx: number, orbY: number, orbR: number): void {
    if (!p.survival) return;
    const { ctx } = this;
    // Stack the bars ABOVE the orb (the orbs hug the bottom edge, so a below-orb
    // bar renders off-screen — same reason drawOrb's caption sits above). Clear the
    // orb's own caption (arc ladder + captionPad) and grow upward.
    let dy = 0;
    const base = ORB_ARCS.endurance + ORB_ARCS.captionPad + 20;
    for (const def of Object.values(SURVIVAL_RESOURCES)) {
      const cur = p.survival.get(def.id);
      if (cur === undefined || cur >= def.max) continue; // full / inactive → hidden
      const frac = clamp(cur / def.max, 0, 1);
      const bw = orbR * 1.4, bh = 8, x = cx - bw / 2, y = orbY - orbR - base - dy;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x, y, bw, bh);
      ctx.fillStyle = frac < 0.34 ? '#e85050' : def.color; ctx.fillRect(x, y, bw * frac, bh);
      ctx.strokeStyle = '#3a3a52'; ctx.lineWidth = 1; ctx.strokeRect(x, y, bw, bh);
      ctx.fillStyle = '#9aa6b8'; ctx.font = '9px Verdana'; ctx.textAlign = 'center';
      ctx.fillText(def.label, cx, y - 2);
      dy += bh + 16;
    }
  }

  private drawOrb(x: number, y: number, r: number, frac: number, fill: string, back: string, text: string, label: string, reservedFrac = 0): void {
    const { ctx } = this;
    frac = clamp(frac, 0, 1);
    reservedFrac = clamp(reservedFrac, 0, 1);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = back;
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = fill;
    ctx.fillRect(x - r, y + r - frac * r * 2, r * 2, frac * r * 2);
    if (reservedFrac > 0) {
      // Reserved band: hatched grey lock-out from the top of the orb.
      ctx.fillStyle = 'rgba(140,140,150,0.55)';
      ctx.fillRect(x - r, y - r, r * 2, reservedFrac * r * 2);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#3a3a52';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Verdana';
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y + 5);
    // Caption sits ABOVE the orb: the orbs now flank the bar near the bottom
    // edge, so a below-orb label (y + r + 14) would render off-screen. It
    // clears the arc ladder's outermost rung by captionPad — derived, so a
    // new ring re-seats the caption for free.
    ctx.font = '10px Verdana';
    ctx.fillStyle = '#8a8678';
    ctx.fillText(label, x, y - r - (ORB_ARCS.endurance + ORB_ARCS.captionPad));
  }
}

function initials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').slice(0, 3).toUpperCase();
}

// hexToRgb / shade now live in vis/color.ts (imported above) — every draw
// path derives washes and gradients from the SAME color math as the bakes.
