// ---------------------------------------------------------------------------
// Canvas renderer: world (camera-following) + HUD. Placeholder geometry art —
// every visual reads its color/shape from the data definitions.
// ---------------------------------------------------------------------------

import { clamp, dist, type Vec2 } from '../core/math';
import { DEFAULT_CURSOR_OPTIONS, drawAimReticle } from '../core/cursor';
import { instanceMeta, instanceStrikeTiming, instanceTrigger, SKILL_RARITIES } from '../engine/skills';
import { ITEM_RARITIES } from '../engine/items';
import { VESTIGES } from '../data/vestiges';
import { STATUS_DEFS } from '../engine/status';
import { STANCE_PLANT_TIME, type Actor } from '../engine/actor';
import { chargeColor } from '../engine/charges';
import { REMNANT_KINDS } from '../data/remnants';
import { RUNE_INFO } from '../data/invocations';
import { BOSS_BAR_XP_MIN, SNOW_CFG } from '../engine/world';
import type { World } from '../engine/world';
import { dayCycle } from '../world/daynight';
import { GridWalkField } from '../world/gridWalk';
import { regionKind, SURVIVAL_RESOURCES } from '../world/regions';
import { doodadRuleOf, type Doodad } from '../engine/levelgen';
import { QUEST_GIVER_IDS } from '../quests/defs';

/** View-cull margin beyond a doodad's own radius: canopy crowns, vent rims,
 *  and blob `grow` passes all overdraw past the disc — the pad keeps their
 *  edges from popping at the screen border. */
const RENDER_CULL_PAD = 150;
import { roofStyle } from '../data/structures';
import { keyDisplay, type Settings } from '../meta/settings';
import { collectActiveFx } from './screenFx';
import { RARITY_DEFS } from '../engine/rarity';
import { MONSTERS } from '../data/monsters';
import { hash01, hexToRgb, shade, valueNoise, withAlpha } from './vis/color';
import { materialOf, rampOf } from './vis/materials';
import { adornFlashSprite, adornSprite, bodyFlashSprite, bodySprite, drawLiveParts, lookOf, shapeIsOriented, spriteHalf, type BodyLook } from './vis/body';
import { drawGlow, drawLongShadow, drawShadow, sunCast } from './vis/sprites';
import { GroundRenderer } from './vis/ground';
import { CANOPY_PAINTERS, PAINTERS, paintBlendUnderlay, paintGroupShadows, type DoodadVisualDef, type PaintEnv } from './vis/painters';
import { DOODAD_VISUALS } from '../data/doodadVisuals';
import { LightLayer } from './vis/lights';
import { drawWeatherFx, WEATHER_FX } from './vis/weatherFx';
import { drawAmbientFx } from './vis/ambientFx';
import { WEATHER_DEFS, type WeatherKind } from '../world/weather';
import { VIS_CFG } from './vis/visConfig';

const SLOT_KEYS = ['LMB', 'RMB', '1', '2', '3', '4', '5', '6'];

const warnedUnrenderedKinds = new Set<string>();

export class Renderer {
  ctx: CanvasRenderingContext2D;
  cam = { x: 0, y: 0 };
  /** Screen-space mouse, fed by main each frame — HUD hover affordances
   *  (buff-pip names) read it; (-1,-1) = no pointer. */
  hudMouse = { x: -1, y: -1 };
  /** The PAD's assisted aim (world point + soft-lock target id), fed by main
   *  each frame while the pad owns the reticle; null = mouse aim, no reticle.
   *  Doubles as "where is the cursor, really" for aim-anchored affordances
   *  (the elite nameplate hover follows it). */
  padAim: { x: number; y: number; lockId: number | null } | null = null;
  /** World→screen scale. >1 zooms in; the bigger zones keep it from cramping. */
  private readonly zoom = 1.3;
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
  }

  /** Bar-slot key labels, derived from the live keybinds (slots 0/1 fixed to
   *  mouse). Falls back to the defaults if no settings are wired in. */
  private slotKeys(): string[] {
    const kb = this.getSettings?.().keybinds;
    if (!kb) return SLOT_KEYS;
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

  render(world: World): void {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;

    // Frame delta off the sim clock — the smoothing step for canopy/roof fades.
    this.frameDt = clamp(world.time - this.lastRenderTime, 0, 0.1);
    this.lastRenderTime = world.time;

    // Camera follows the player, clamped to the zone (centered when the
    // zone is smaller than the window). Zoom shrinks the visible world window.
    const z = this.zoom, vw = w / z, vh = h / z;
    const az = world.arena;
    if (az.boundless) {
      // The Descent abyss has no edges — the camera follows the player freely.
      this.cam.x = world.player.pos.x - vw / 2;
      this.cam.y = world.player.pos.y - vh / 2;
    } else {
      this.cam.x = az.w + 160 <= vw ? (az.w - vw) / 2
        : clamp(world.player.pos.x - vw / 2, -80, az.w - vw + 80);
      this.cam.y = az.h + 160 <= vh ? (az.h - vh) / 2
        : clamp(world.player.pos.y - vh / 2, -80, az.h - vh + 80);
    }

    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(0, 0, w, h);

    // Per-frame doodad culling: everything the ground/canopy doodad passes
    // draw comes from this view-clipped, kind-grouped set (see cullDoodads).
    this.cullDoodads(world, vw, vh);
    // Gather this frame's light sources (data-declared doodad emissives,
    // projectiles, flashes, exits, the hero's lantern) for the light layer.
    this.lightLayer.collect(world, this.culled, this.cam.x, this.cam.y, vw, vh);

    ctx.save();
    ctx.scale(z, z);
    // Shared SCREEN-SHAKE: jitter the world transform by world.shake (decays in the
    // sim). 0 when nothing sets it → byte-identical when no boss/impact is shaking.
    const sh = world.shake;
    const shx = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;
    const shy = sh > 0 ? (Math.random() * 2 - 1) * sh : 0;
    ctx.translate(-this.cam.x + shx, -this.cam.y + shy);

    this.drawFloor(world);
    this.drawDoodads(world);
    this.updateMotionFx(world);
    this.drawMotionFx();     // wake ripples + snow pocks, over grounds, under actors
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
    this.drawZones(world);
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
    for (const a of world.actors) if (!a.dead && a.worm) this.drawWormTail(a);
    for (const a of world.actors) if (!a.dead) this.drawActor(a, world);
    for (const a of world.actors) if (!a.dead && a.nemesis) this.drawNemesisMark(a);
    this.drawEliteNameHover(world);
    this.drawProjectiles(world);
    this.drawCanopies(world);      // fake-2D depth: crowns above actors, faded near the hero
    this.drawRoofs(world);         // structure roofs: interiors reveal only when you're inside
    this.drawTexts(world);
    this.drawPadReticle(world);    // the pad's visible cursor — LAST, above canopy and roof

    ctx.restore();

    // THE LIGHT LAYER: day/night darkness punched by every light in view +
    // emissive bloom — world-lit, drawn before the screen-space washes. The
    // world transform was translate(-cam + shake), so the effective camera
    // the lights must project through is cam - shake.
    this.lightLayer.render(ctx, this.cam.x - shx, this.cam.y - shy, z, w, h);

    this.drawAtmosphere(world);
    this.drawStatusFx(world);     // status ailment overlays (edge vignettes/frost/stars)
    this.drawLowLifeGlow(world);  // blinking red edge on a low-life hit
    this.drawHud(world);          // orbs + bar + boss bar — last, so it stays readable
    this.drawEncounterHud(world); // breach timer bar (screen-space)
    this.drawFractureHud(world);  // fracture nested-timer bar (screen-space)
    this.drawDescentHud(world);   // the abyss: encroaching-dark vignette + depth/echoes + shaft pip
    this.drawParty(world);        // co-op party strip (screen-space, top; ≤1 = nothing)
    this.drawModeFade(world);     // a survived death's crossing — DEAD LAST (covers the HUD too)
  }

  /** D2-style hover nameplate: the DISTINCTLY-NAMED foe nearest the cursor
   *  (one at a time — no label storms) shows its minted name over a tier/genus
   *  subtitle ("Goresnap the Bilious" / "Rare Goblin"). Nemeses are skipped —
   *  they wear their own permanent mark. */
  private drawEliteNameHover(world: World): void {
    // "The cursor" is wherever aim truly lives: the pad's reticle when the
    // pad owns it, else the mouse — nameplates follow the same point skills do.
    const cur = this.padAim ?? this.toWorld(this.hudMouse);
    let best: Actor | null = null;
    let bd = 80;
    for (const a of world.actors) {
      if (a.dead || a.team !== 'enemy' || a.nemesis || !a.defId) continue;
      const def = MONSTERS[a.defId];
      if (!def || a.name === def.name) continue;
      const label = a.rarity ? RARITY_DEFS[a.rarity].label : '';
      if (label && a.name === `${label} ${def.name}`) continue; // tier-prefixed, not minted
      const d = Math.hypot(a.pos.x - cur.x, a.pos.y - cur.y) - a.radius;
      if (d < bd) { bd = d; best = a; }
    }
    if (!best) return;
    const { ctx } = this;
    const def = MONSTERS[best.defId!];
    const tint = (best.rarity ? RARITY_DEFS[best.rarity].ring : '') || '#e8dcc8';
    const sub = best.rarity && RARITY_DEFS[best.rarity].label
      ? `${RARITY_DEFS[best.rarity].label} ${def.name}` : def.name;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = tint;
    ctx.font = 'bold 12px Verdana';
    ctx.fillText(best.name, best.pos.x, best.pos.y - best.radius - 20);
    ctx.globalAlpha = 0.75;
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
   *  foe must read as one at a glance. */
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
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = tint;
    ctx.font = 'bold 12px Verdana';
    ctx.textAlign = 'center';
    ctx.fillText(`☠ ${a.name}`, a.pos.x, a.pos.y - a.radius - 16);
    ctx.restore();
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
    const { ctx, canvas } = this;
    const w = canvas.width;
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
      if (p.frac > 0) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = '#e8ffe0';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 22, -Math.PI / 2, -Math.PI / 2 + p.frac * Math.PI * 2);
        ctx.stroke();
      }
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
    for (const e of world.encountersView()) {
      const col = e.def.trigger.color;
      if (e.phase === 'dormant') {
        const pulse = 1 + 0.15 * Math.sin(world.time * 4);
        const s = 13 * pulse;
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.def.trigger.activateRadius, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.globalAlpha = 0.3; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.globalAlpha = 1; ctx.strokeStyle = '#f0d8ff'; ctx.lineWidth = 1.5;
        ctx.strokeRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else if (e.phase === 'open') {
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.globalAlpha = 0.10; ctx.fill();
        ctx.globalAlpha = 0.85; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
        ctx.globalAlpha = 0.12; ctx.lineWidth = 1; ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.scale.maxRadius, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y); ctx.rotate(Math.PI / 4);
        ctx.fillStyle = col; ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      }
    }
    // Demon-realm rifts: a swirling molten tear you step into for the realm.
    for (const dp of world.demonPortalsView()) {
      const pulse = 1 + 0.18 * Math.sin(world.time * 5);
      ctx.save();
      ctx.translate(dp.pos.x, dp.pos.y);
      ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#3a0010'; ctx.globalAlpha = 0.6; ctx.fill();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeStyle = '#c81e3a'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#ff6a3a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#ffd0b0'; ctx.font = '18px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✶', 0, 0);
      ctx.restore();
    }
    // Crusade sanctum gates: a gilded portal you step into for the Leader's realm.
    for (const cp of world.crusadePortalsView()) {
      const pulse = 1 + 0.16 * Math.sin(world.time * 4);
      ctx.save();
      ctx.translate(cp.pos.x, cp.pos.y);
      ctx.beginPath(); ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#241c08'; ctx.globalAlpha = 0.6; ctx.fill();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 3; ctx.strokeStyle = '#d8b040'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#ffe070'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff0c0'; ctx.font = '18px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☗', 0, 0);
      ctx.restore();
    }
    // Necropolis gates: a great pale-bone portal — step in for the seat of the dead
    // (the uber). Larger + slower-pulsing than the sibling gates so it reads as a
    // deliberate, weighty way in, not an ambush.
    for (const np of world.necropolisPortalsView()) {
      const pulse = 1 + 0.14 * Math.sin(world.time * 3);
      ctx.save();
      ctx.translate(np.pos.x, np.pos.y);
      ctx.beginPath(); ctx.arc(0, 0, 42 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#1a1812'; ctx.globalAlpha = 0.62; ctx.fill();
      ctx.globalAlpha = 0.95; ctx.lineWidth = 3.5; ctx.strokeStyle = '#d8cdb0'; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = '#f0e8cc'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#f0e8cc'; ctx.font = '22px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☗', 0, 0);
      ctx.restore();
    }
    // Fracture capstone rifts: a churning variant-colored tear — step in for the
    // boss chamber (the climax of a full max-span fracture chain).
    for (const fr of world.fractureRiftsView()) {
      const pulse = 1 + 0.2 * Math.sin(world.time * 5);
      ctx.save();
      ctx.translate(fr.pos.x, fr.pos.y);
      ctx.rotate(world.time * 0.6);
      ctx.beginPath(); ctx.arc(0, 0, 36 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0410'; ctx.globalAlpha = 0.7; ctx.fill();
      ctx.globalAlpha = 0.95; ctx.lineWidth = 3.5; ctx.strokeStyle = fr.color; ctx.stroke();
      // jagged inner rays (a tear, not a ring)
      ctx.globalAlpha = 0.85; ctx.lineWidth = 2; ctx.strokeStyle = fr.color;
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const r2 = (12 + (k % 2) * 8) * pulse;
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      }
      ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = 0.9; ctx.fillStyle = fr.color; ctx.font = 'bold 11px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText('a rift yawns — step in', fr.pos.x, fr.pos.y - 48);
      ctx.globalAlpha = 1;
    }
  }

  /** The breach timer bar (the kill-fed countdown), screen-space near the top. */
  private drawEncounterHud(world: World): void {
    const open = world.encountersView().find(e => e.phase === 'open');
    if (!open) return;
    const { ctx, canvas } = this;
    const w = canvas.width;
    // Sits under the boss bar; both slide down when the co-op party strip shows.
    const oy = world.party.strip.length > 1 ? 20 : 0;
    const bw = 320, bh = 14, bx = w / 2 - bw / 2, by = 74 + oy;
    const frac = clamp(open.timer / open.maxTimer, 0, 1);
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Verdana';
    ctx.fillStyle = open.def.trigger.color;
    ctx.fillText(open.scale.label, w / 2, by - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, bh);
    // Drains warm → red as time runs out.
    const r = Math.round(150 + (1 - frac) * 90), g = Math.round(70 + frac * 110);
    ctx.fillStyle = `rgb(${r},${g},210)`;
    ctx.fillRect(bx, by, bw * frac, bh);
    ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
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
    const { ctx, canvas } = this;
    const w = canvas.width;
    const oy = world.party.strip.length > 1 ? 20 : 0;
    const bw = 320, bh = 14, bx = w / 2 - bw / 2, by = 96 + oy;
    const frac = run.maxTimer > 0 ? clamp(run.timer / run.maxTimer, 0, 1) : 0;
    const chasing = run.phase === 'fissure' && !world.player.dead && !world.player.downed
      && dist(world.player.pos, run.head) <= (world.sim.fractureField?.surge().chaseRadius ?? 150) + world.player.radius;
    const label = run.phase === 'chasm'
      ? `Chasm ${run.chasmsSealed + 1}/${run.chasmsTarget} — clear it!`
      : chasing ? 'Fissure — chasing (timer held)' : 'Fissure — closing!';
    ctx.textAlign = 'center';
    ctx.font = 'bold 13px Verdana';
    ctx.fillStyle = run.color;
    ctx.fillText(label, w / 2, by - 6);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, bw, bh);
    // Held (chasing) = steady faction violet; draining = warm → red as it empties.
    if (chasing) {
      ctx.fillStyle = run.color;
    } else {
      const r = Math.round(150 + (1 - frac) * 90), g = Math.round(70 + frac * 110);
      ctx.fillStyle = `rgb(${r},${g},210)`;
    }
    ctx.fillRect(bx, by, bw * frac, bh);
    ctx.strokeStyle = '#0a0a0e'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
  }

  /** Status-ailment screen overlays — EDGE-hugging so the centered HUD stays
   *  clear. Combat ailments only (see screenFx.STATUS_FX_REGISTRY). */
  private drawStatusFx(world: World): void {
    const fx = collectActiveFx(world.player.statuses);
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
      r /= wsum; g /= wsum; b /= wsum;
      const a = peak * (0.16 + 0.1 * (0.5 + 0.5 * Math.sin(t * 3)));
      const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.34, w / 2, h / 2, Math.hypot(w, h) / 2);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(${r | 0},${g | 0},${b | 0},${a.toFixed(3)})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
    }
    if (fx.some(f => f.def.kind === 'frost')) this.drawFrost(w, h, t);
    if (fx.some(f => f.def.kind === 'stars')) this.drawStunStars(w, h, t);
  }

  /** Icy edge wash + drifting snowflakes (chill / frozen). */
  private drawFrost(w: number, h: number, t: number): void {
    const { ctx } = this;
    const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(150,220,255,0.22)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
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

  /** Low-life edge vignette: a CONTINUOUS pulse while life sits low —
   *  faster and harder the deeper the wound (30% murmurs; 1% pounds) —
   *  plus the sharper hit-flash blink stacked on top. The pulse honors
   *  the settings toggle: a 1/1-life or 90%-reserved build would live
   *  inside a permanent alarm otherwise. */
  private drawLowLifeGlow(world: World): void {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    const p = world.player;
    let a = 0;
    const pulseOn = this.getSettings?.().lowLifePulse ?? true;
    const frac = p.maxLife() > 0 ? Math.max(0, p.life) / p.maxLife() : 1;
    if (pulseOn && !p.dead && frac < 0.35) {
      const severity = 1 - frac / 0.35;             // 0 at 35% … 1 at 0%
      const speed = 2.2 + 7 * severity;             // heartbeat quickens
      const wave = 0.5 + 0.5 * Math.sin(world.time * speed * Math.PI);
      a = (0.10 + 0.38 * severity) * (0.45 + 0.55 * wave);
    }
    // The hit-flash blink stacks over the pulse (and works alone when the
    // pulse is toggled off — you always learn you were struck while low).
    const f = world.lowLifeHitFlash;
    if (f > 0) {
      const blink = Math.sin(f * Math.PI * 4) > 0 ? 1 : 0.35;
      a = Math.max(a, (f / 0.45) * blink * 0.42);
    }
    if (a <= 0.005) return;
    const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.28, w / 2, h / 2, Math.hypot(w, h) / 2);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(0.6, `rgba(200,0,0,${(a * 0.5).toFixed(3)})`);
    grd.addColorStop(1, `rgba(255,0,0,${a.toFixed(3)})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  }

  /** A screen-space wash for time of day and weather — subtle enough to keep
   *  the world readable, enough to feel the night close in and a storm gather. */
  private drawAtmosphere(world: World): void {
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
    const f = this.smoothWeather(world);
    if (f) {
      const [r, g, b] = hexToRgb(WEATHER_DEFS[f.kind].color);
      ctx.fillStyle = `rgba(${r},${g},${b},${(0.05 + 0.12 * f.intensity).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
      // The front's PARTICLES — rain streaks, ash, fog banks (vis/weatherFx.ts).
      drawWeatherFx(ctx, f.kind, f.intensity, w, h, world.time);
    }
    // The zone's STANDING ambience — underwater caustics + bubble splays,
    // desert heat haze — declared on the theme (vis/ambientFx.ts).
    for (const fx of world.zone.theme.ambientFx ?? []) {
      drawAmbientFx(ctx, fx, w, h, world.time);
    }
    // WIND STREAMLINES: thin wisps riding the gale across the screen — the
    // flow made faintly visible (direction + strength read at a glance).
    const gale = world.zoneWind();
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
      const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.hypot(w, h) * 0.6);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, `rgba(${Math.round(sr * 0.6)},${Math.round(sg * 0.7)},${Math.round(sb * 0.6)},${(0.10 + 0.18 * d).toFixed(3)})`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
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
    ctx.beginPath();
    if (ell) ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else ctx.rect(0, 0, w, h);
    ctx.clip();
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
    ctx.restore();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;
    if (ell) { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    else ctx.strokeRect(0, 0, w, h);
  }

  /** SNOW COVER wash (World.snowCover): drifted white laid over the floor,
   *  deeper in the noise-hollows so a half-melted fall reads patchy, near
   *  solid at a full blanket. Viewport cells only; a boundless-arena zone
   *  wears it the same way. */
  private drawSnowCover(world: World, vw: number, vh: number): void {
    const cover = world.snowCover;
    if (cover <= 0.02) return;
    const { ctx } = this;
    const cell = 22;
    const x0 = Math.floor(this.cam.x / cell) * cell, y0 = Math.floor(this.cam.y / cell) * cell;
    ctx.fillStyle = '#eaf2f7';
    for (let y = y0; y < this.cam.y + vh + cell; y += cell) {
      for (let x = x0; x < this.cam.x + vw + cell; x += cell) {
        // Broad features (~200u) — DRIFTS, not a checkerboard of cells.
        const n = valueNoise(x * 0.005, y * 0.005, 77);
        // Snow settles into the low noise first; a full cover whites out all.
        const depth = clamp(cover * 1.25 - n * 0.55, 0, 1);
        if (depth <= 0.03) continue;
        ctx.globalAlpha = depth * SNOW_CFG.washAlpha;
        ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** ANIMATED region visuals (flesh throb, water drift) — the only per-frame
   *  cell painting left. Every STATIC cell (walls, still visuals, bevels,
   *  contact AO) bakes into the ground chunks; see vis/ground.ts. */
  private drawAnimatedRegions(world: World): void {
    const wf = world.walk;
    if (!(wf instanceof GridWalkField)) return;
    const { ctx } = this;
    const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
    const cell = wf.cell;
    const c0 = Math.max(0, Math.floor(this.cam.x / cell));
    const c1 = Math.min(wf.cols, Math.ceil((this.cam.x + vw) / cell));
    const r0 = Math.max(0, Math.floor(this.cam.y / cell));
    const r1 = Math.min(wf.rows, Math.ceil((this.cam.y + vh) / cell));
    for (let cy = r0; cy < r1; cy++) {
      for (let cx = c0; cx < c1; cx++) {
        const id = wf.regionAt((cx + 0.5) * cell, (cy + 0.5) * cell);
        if (id === 'ground') continue;
        const vis = regionKind(id)?.visual;
        if (!vis?.animate) continue;
        let alpha = vis.alpha ?? 1;
        if (vis.animate === 'pulse') alpha *= 0.6 + 0.4 * Math.sin(performance.now() / 650 + cx * 0.3 + cy * 0.3);
        else if (vis.animate === 'drift') alpha *= 0.8 + 0.2 * Math.sin(performance.now() / 900 + cx * 0.2);
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = vis.fill;
        ctx.fillRect(cx * cell, cy * cell, cell + 0.6, cell + 0.6);
      }
    }
    ctx.globalAlpha = 1;
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
    for (let i = this.liquidFx.length - 1; i >= 0; i--) {
      this.liquidFx[i].age += dt;
      if (this.liquidFx[i].age >= this.liquidFx[i].max) this.liquidFx.splice(i, 1);
    }
    for (const a of world.actors) {
      if (a.dead || a.construct) continue;
      // "Moving" = stepped within the last beat (lastMoveAt is stamped by
      // the movement artery) or carrying real velocity (ice slides count).
      const moving = (world.time - (a.lastMoveAt ?? -9) < 0.12)
        || Math.hypot(a.vel?.x ?? 0, a.vel?.y ?? 0) > 12;
      if (!moving) continue;
      const last = this.lastFxSpawn.get(a.id) ?? -9;
      if (world.time - last < 0.16) continue;
      if (a.groundKind === 'water') {
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

  private smoothWeather(world: World): { kind: WeatherKind; intensity: number } | null {
    const target = world.sim.weather.sample(world.zone);
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
    const env: PaintEnv = { ctx, theme: world.zone.theme, time: world.time, world };
    type Grp = { kind: string; list: readonly Doodad[]; def: DoodadVisualDef | undefined };
    const groups: Grp[] = [];
    for (const [kind, list] of this.culled) groups.push({ kind, list, def: DOODAD_VISUALS[kind] });
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
      if (sun && g.def.longShadow) {
        for (const d of g.list) {
          drawLongShadow(ctx, d.pos.x, d.pos.y, d.radius * g.def.longShadow,
            sun.dir, sun.len, sun.alpha);
        }
      }
      // Ground kinds bed into the terrain before their own detail pass.
      if (g.def.blend) paintBlendUnderlay(env, g.list, g.def);
      if (g.def.shadow) paintGroupShadows(env, g.list, g.def.shadow);
      (PAINTERS[g.def.painter] ?? PAINTERS.fallback)(env, g.list, g.def);
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

  // --- FAKE-2D DEPTH: canopies above actors, proximity-faded -----------------
  // Tall doodads whose DOODAD_RULES row carries `occlude` draw AFTER the actor
  // pass: walk under a tree and its crown covers you — until you're close, when
  // it fades so your character reads through the foliage (the depth illusion
  // without a real z-axis). Fade is smoothed per doodad; enemies lurking under
  // an unfaded canopy stay hidden, which is the ambush half of the feature.
  private canopyFade = new WeakMap<object, number>();

  private drawCanopies(world: World): void {
    const hero = world.player;
    const dt = this.frameDt;
    const env: PaintEnv = { ctx: this.ctx, theme: world.zone.theme, time: world.time, world };
    for (const o of this.culledAll) {
      const occ = doodadRuleOf(o.kind).occlude;
      if (!occ) continue;
      const near = dist(hero.pos, o.pos) < o.radius + hero.radius + (occ.pad ?? 10);
      const target = near ? (occ.alpha ?? 0.32) : 1;
      const cur = this.canopyFade.get(o) ?? 1;
      const fade = cur + (target - cur) * Math.min(1, dt * 10);
      this.canopyFade.set(o, fade);
      // Crown looks come from the SAME registry entry as the ground pass —
      // a kind with no canopy def gets the translucent disc.
      const cdef = DOODAD_VISUALS[o.kind]?.canopy;
      const painter = (cdef && CANOPY_PAINTERS[cdef.painter]) ?? CANOPY_PAINTERS.discCrown;
      painter(env, o, fade, cdef?.params ?? {});
    }
  }

  // --- ROOF REVEAL: interiors as pseudo fog of war ----------------------------
  // Each placed structure's roof rects draw over everything in the world layer.
  // Step under one and the whole structure's roofing fades to a sliver — the
  // interior (and whoever waits inside) reveals only when YOU are inside,
  // detached from any vision/light radius. Per-structure smoothed fade.
  private roofFade = new Map<string, number>();
  private roofFadeStructs: World['structures'] | null = null;

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
          // lockpick progress ring
          const frac = 1 - c.lockTime / c.maxLock;
          if (frac > 0.01) {
            ctx.strokeStyle = '#e8c87a';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 22, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
            ctx.stroke();
          }
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
      const accent = locked ? '#6a6a72' : world.zone.theme.accent;
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
      // Destination label
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px Verdana';
      ctx.fillStyle = accent;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth = 3;
      const label = locked ? `${e.label} — sealed` : e.label;
      ctx.strokeText(label, e.pos.x, e.pos.y + e.radius + 20);
      ctx.fillText(label, e.pos.x, e.pos.y + e.radius + 20);
      if (locked) {
        // A simple padlock glyph over the disc.
        ctx.strokeStyle = '#9a9aa2';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(e.pos.x - 7, e.pos.y - 3, 14, 11);
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y - 4, 5, Math.PI, 0);
        ctx.stroke();
      }
    }
    // Dwell-to-travel: the portal you stand idle on fills a progress ring before
    // it carries you through (so a quick run-over no longer transitions).
    const dw = world.exitDwellView();
    if (dw && dw.frac > 0.02) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = world.zone.theme.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(dw.pos.x, dw.pos.y, 36, -Math.PI / 2, -Math.PI / 2 + dw.frac * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Dwell-to-enter a cave mouth — the same progress ring as a portal.
    const cdw = world.caveDwellView();
    if (cdw && cdw.frac > 0.02) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = world.zone.theme.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cdw.pos.x, cdw.pos.y, 30, -Math.PI / 2, -Math.PI / 2 + cdw.frac * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // MAKE LANDFALL — the landing dwell at sea: a ring around the boat plus a
    // shore prompt (the Voyage's exit rule). A Voyage Island names itself.
    const ndw = world.voyageLandingView();
    if (ndw) {
      if (ndw.frac > 0.02) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#7fd0ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(ndw.pos.x, ndw.pos.y, 34, -Math.PI / 2, -Math.PI / 2 + ndw.frac * Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
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

    // Dwell-to-enter a REALM GATE — the same progress ring, sized to the larger gate.
    const rdw = world.realmDwellView();
    if (rdw && rdw.frac > 0.02) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = world.zone.theme.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(rdw.pos.x, rdw.pos.y, 44, -Math.PI / 2, -Math.PI / 2 + rdw.frac * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Dwell-to-pay ring on a Holdfast toll keeper.
    const hdw = world.holdfastDwellView();
    if (hdw && hdw.frac > 0.02) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#d0a850';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hdw.pos.x, hdw.pos.y, 40, -Math.PI / 2, -Math.PI / 2 + hdw.frac * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Dwell-to-open ring on a structure door you push against.
    const ddw = world.doorDwellView();
    if (ddw && ddw.frac > 0.02) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#c8b47a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(ddw.pos.x, ddw.pos.y, 32, -Math.PI / 2, -Math.PI / 2 + ddw.frac * Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
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
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = z.color;
        ctx.fill();
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
          ctx.arc(z.pos.x, z.pos.y, mid, 0, Math.PI * 2);
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
      // The whole burst is drawn in ONE element colour (b.color = DAMAGE_COLOR[type]) so the
      // hue alone tells the player the damage type — and what resistance/armour to dress.
      // Kept deliberately sparse: a danger ring + a core, not a particle storm, so the read
      // stays clean even with several bursts on screen.
      if (b.phase === 'gather') {
        const g = Math.min(1, b.t / b.coalesce); // 0→1 coalesce progress
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

  private drawFlash(f: { pos: Vec2; radius: number; color: string; life: number; maxLife: number; arc?: { facing: number; arcRad: number }; shape?: number; facing?: number; edgeFrac?: number; bolt?: boolean; meteor?: boolean; beam?: boolean }): void {
    const { ctx } = this;
    // A big synchronous sim step (headless probes, background-tab catch-up)
    // can overshoot a flash's life below zero before the prune sweeps it —
    // clamp, or every arc/gradient call downstream throws on a negative
    // radius and takes the whole rAF loop down with it.
    const t = Math.max(0, Math.min(1, f.life / f.maxLife));
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
    ctx.globalAlpha = t * 0.5;
    ctx.fillStyle = f.color;
    // Edge-band AoE: render only the rim, as a thick stroked ring/arc.
    if (f.edgeFrac) {
      const mid = f.radius * (1 + f.edgeFrac) / 2;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = Math.max(3, f.radius * (1 - f.edgeFrac));
      ctx.beginPath();
      if (f.arc) {
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

  /** A worm's trailing body, drawn tail-first so the head sits on top. One
   *  shaded circle bake (the head's look) scales down the whole spine. */
  private drawWormTail(a: Actor): void {
    const { ctx } = this;
    const w = a.worm!;
    const look: BodyLook = { shape: 'circle', radius: a.radius, color: a.color, material: a.material };
    const img = a.hitFlash > 0 ? bodyFlashSprite(look) : bodySprite(look);
    const half = spriteHalf(a.radius);
    for (let i = w.segments.length - 1; i >= 0; i--) {
      // (radius shrinks front-to-back; iterate display back-to-front)
      const r = a.radius * Math.pow(w.taper, i + 1);
      const seg = w.segments[i];
      const k = r / a.radius;
      drawShadow(ctx, seg.x, seg.y, r, 0.7);
      ctx.globalAlpha = 0.55 + 0.35 * (1 - (i + 1) / (w.segments.length + 1));
      ctx.drawImage(img, seg.x - half * k, seg.y - half * k, half * 2 * k, half * 2 * k);
    }
    ctx.globalAlpha = 1;
  }

  private drawActor(a: Actor, world: World): void {
    const { ctx } = this;
    const { x, y } = a.pos;

    // AT SEA the hero IS the boat: hull + sail + a trailing wake, rotated to
    // the facing. Zone-keyed (world.sailing), so co-op clients skin it too.
    if (world.sailing && world.seats.some(s => s.actor === a)) {
      this.drawBoat(a, world);
      return;
    }

    // Body (untouchable spirits ghostly; stealthed/invisible actors faded)
    ctx.save();
    ctx.translate(x, y);
    // Grounding: the soft contact shadow under every body — drawn BEFORE the
    // leap swell so an airborne leaper's shadow stays put while the body rises.
    drawShadow(ctx, 0, 0, a.radius, a.untargetable ? 0.4 : 1);
    // The hero wears a soft class-colored ground halo — you find yourself in a
    // brawl by presence, not by hunting the cursor.
    if (a === world.player) {
      drawGlow(ctx, 0, a.radius * 0.3, a.radius * VIS_CFG.body.heroHaloScale,
        a.color, VIS_CFG.body.heroHaloAlpha, false);
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
    if (a.sheet.get('invisible') > 0) ctx.globalAlpha = 0.3;
    else if (a.sheet.get('detectability') < 1) ctx.globalAlpha = 0.55;
    // Echo riders: a ghost-faded copy of their owner — the dashed seam ring
    // after the body keeps the lie legible (construct.kind ships on the wire).
    if (a.construct?.kind === 'echo') ctx.globalAlpha = 0.45;
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
      demonHorns: a.faction === 'demon',
    };
    const half = spriteHalf(a.radius);
    const flash = a.hitFlash > 0;
    const lookDef = lookOf(a.look);
    // Part-grammar portraits are whole-body poses: they ALWAYS track facing.
    const rot = lookDef || shapeIsOriented(a.shape) ? a.facing : 0;
    // ICE MIRROR: a faded, flipped ghost of the body beneath it — the frozen
    // sheet reflects whoever crosses it.
    if (a.groundKind === 'ice' && !flash) {
      ctx.save();
      ctx.translate(0, a.radius * 1.85);
      ctx.scale(1, -0.8);
      if (rot !== 0) ctx.rotate(-rot);
      ctx.globalAlpha = 0.13 * baseAlpha;
      ctx.drawImage(bodySprite(look), -half, -half);
      ctx.restore();
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

    // Stance feedback: conditional 'stationary' mods (Colossus Stance) are
    // invisible ±28% swings without a cue — SHOW the plant. The ring fades
    // in as the feet set and locks solid (with root-spikes) once planted.
    if (a.isPlayerKind() && a.hasConditionalMods('stationary')) {
      const frac = Math.min(1, a.idleFor / STANCE_PLANT_TIME);
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

    // Facing tick — things that don't ACT don't aim (barrels aren't plotting).
    if (!a.passive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a.facing) * a.radius * 0.4, Math.sin(a.facing) * a.radius * 0.4);
      ctx.lineTo(Math.cos(a.facing) * a.radius, Math.sin(a.facing) * a.radius);
      ctx.stroke();
    }

    // Iron banding on breakables: containers read as containers.
    if (a.defId === 'barrel') {
      ctx.strokeStyle = '#c8a87a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, a.radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, a.radius * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    } else if (a.defId === 'crate') {
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

    // Health bar (enemies + minions; the player has the orb). A composite
    // monster's PRISTINE parts stay bar-less — one boss mustn't wear five
    // full bars; a part's bar appears the moment it's dented (poise rule).
    if (a !== world.player && !(a.partLink && a.life >= a.maxLife() - 0.5)) {
      const bw = a.radius * 2.2;
      const frac = clamp(a.life / a.maxLife(), 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - bw / 2, y - a.radius - 9, bw, 4);
      ctx.fillStyle = a.team === 'enemy' ? '#c03030' : '#40b050';
      ctx.fillRect(x - bw / 2, y - a.radius - 9, bw * frac, 4);
      // LIFESPAN sliver (the Amalgam's clock): SIZABLE owned minions with a
      // finite hire show how much of it remains — swarms stay clean.
      if (a.owner && a.lifespan > 0 && a.radius >= 14 && a.lifespanTotal > 0) {
        ctx.fillStyle = '#b8a0e0';
        ctx.fillRect(x - bw / 2, y - a.radius - 5.5,
          bw * clamp(a.lifespan / a.lifespanTotal, 0, 1), 2.5);
      }
    }

    // Layered-defense bars: energy shield (cyan) and absorb (white).
    if (a.es > 0 && a.maxEs() > 0) {
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

    // NPCs that fill a town role (MonsterDef.npcRole) wear their names.
    if (a.team === 'player' && a.defId && MONSTERS[a.defId]?.npcRole) {
      ctx.textAlign = 'center';
      ctx.font = '10px Verdana';
      ctx.fillStyle = '#e8c87a';
      ctx.fillText(a.name, x, y - a.radius - 8);
    }

    // The innkeep "talks" when her healing isn't unlocked — no free innstay yet.
    if (a.defId && MONSTERS[a.defId]?.npcRole === 'innkeep'
      && world.nearMireille()
      && !world.mireilleUnlocked()) {
      const msg = 'No free innstay — unlock my care in the Vault.';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px Verdana';
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeText(msg, x, y - a.radius - 22);
      ctx.fillStyle = '#d8b87a';
      ctx.fillText(msg, x, y - a.radius - 22);
    }

    // Any quest-giving NPC posts its offer above its head while you're near —
    // the id set derives from the QUESTS registry (quartermaster, a secret
    // vocation's shrine spirit, future field boards), never a hand list.
    if (a.defId && QUEST_GIVER_IDS.has(a.defId)) {
      const msg = world.questGiverPrompt();
      if (msg) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Verdana';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(msg, x, y - a.radius - 22);
        ctx.fillStyle = '#c8a8e8';
        ctx.fillText(msg, x, y - a.radius - 22);
      }
    }

    if (a.defId && MONSTERS[a.defId]?.npcRole === 'caravanner') {
      const msg = world.caravanPrompt();
      if (msg) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Verdana';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(msg, x, y - a.radius - 22);
        ctx.fillStyle = '#d8b87a';
        ctx.fillText(msg, x, y - a.radius - 22);
      }
    }

    // The Bonewright posts its current demand above its head.
    if (a.defId === 'amalgam_necromancer') {
      const msg = world.amalgamPrompt();
      if (msg) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Verdana';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(msg, x, y - a.radius - 22);
        ctx.fillStyle = '#9ad0b0';
        ctx.fillText(msg, x, y - a.radius - 22);
      }
    }

    // The Delver posts its trade/descend prompt above its head.
    if (a.defId === 'descent_delver') {
      const msg = world.delverPrompt();
      if (msg) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Verdana';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(msg, x, y - a.radius - 22);
        ctx.fillStyle = '#7fe0d8';
        ctx.fillText(msg, x, y - a.radius - 22);
      }
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

    // FORESIGHT — an enemy wind-up with a GROUND footprint marks its landing
    // spot: a faint ring in the skill's color firming toward impact, plus a
    // center pip. Read it, step out. Toggleable (Settings.castTelegraphs).
    if (a.team === 'enemy' && a.casting && (this.getSettings?.().castTelegraphs ?? true)) {
      const fc = a.casting;
      const del = fc.inst.def.delivery;
      if (del.type === 'ground') {
        const aim = fc.lockedAim ?? fc.aim;
        const prog = fc.total > 0 ? clamp(fc.elapsed / fc.total, 0, 1) : 1;
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
      }
    }

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
      if (cs.mode === 'perfect') {
        ctx.fillStyle = 'rgba(255,215,0,0.55)';
        ctx.fillRect(bx2 + bw * 0.72, by2, bw * 0.28, bh);
      } else if (cs.mode === 'timed' && cs.indicatorAt !== undefined) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx2 + bw * cs.indicatorAt - 1, by2 - 2, 2, bh + 4);
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
    // Wake: two rippling trails off the stern.
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#bfe4f4';
    ctx.lineWidth = 2;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * W * 0.4, L * 0.5);
      ctx.quadraticCurveTo(s * W * 0.9, L * 0.95, s * W * (1.15 + 0.2 * Math.sin(world.time * 3 + s)), L * 1.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
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

  /** Corpse remnants: small fading crosses, briefly usable. */
  private drawCorpses(world: World): void {
    const { ctx } = this;
    for (const c of world.corpses) {
      const alpha = Math.min(1, c.remaining / 2) * 0.65;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#8a4040';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.pos.x - 6, c.pos.y - 6); ctx.lineTo(c.pos.x + 6, c.pos.y + 6);
      ctx.moveTo(c.pos.x + 6, c.pos.y - 6); ctx.lineTo(c.pos.x - 6, c.pos.y + 6);
      ctx.stroke();
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
    for (const d of world.drops) {
      const y = d.pos.y + Math.sin(d.bob) * 3;
      const item = d.item;
      if (item.kind === 'vestige') {
        // A glowing glyph — vestiges vacuum on touch, so no label pill.
        const v = VESTIGES[item.id];
        ctx.save();
        ctx.font = 'bold 15px Verdana';
        ctx.textAlign = 'center';
        ctx.shadowColor = v?.color ?? '#b06bd4';
        ctx.shadowBlur = 14;
        ctx.fillStyle = v?.color ?? '#b06bd4';
        ctx.fillText(v?.glyph ?? '؟', d.pos.x, y + 5);
        ctx.restore();
        continue;
      }
      if (item.kind === 'gear') {
        const rc = ITEM_RARITIES[item.item.rarity] ?? ITEM_RARITIES.common;
        const half = item.item.rarity === 'unique' ? 11 : 9;
        ctx.save();
        ctx.translate(d.pos.x, y);
        ctx.rotate(Math.PI / 4);
        ctx.shadowColor = rc.color;
        ctx.shadowBlur = item.item.rarity === 'unique' ? 20 : 12;
        ctx.fillStyle = '#23202a';
        ctx.fillRect(-half, -half, half * 2, half * 2);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = rc.color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-half, -half, half * 2, half * 2);
        ctx.restore();
        // The floating label — dark pill + rarity-colored name.
        ctx.font = 'bold 11px Verdana';
        ctx.textAlign = 'center';
        const label = item.item.name;
        const w = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(10,8,14,0.78)';
        ctx.fillRect(d.pos.x - w / 2 - 5, y - 34, w + 10, 16);
        ctx.fillStyle = rc.color;
        ctx.fillText(label, d.pos.x, y - 22);
        continue;
      }
      const fill = item.kind === 'support' ? item.gem.def.color : item.inst.def.color;
      const half = item.kind === 'support' ? 7 : 9;
      ctx.save();
      ctx.translate(d.pos.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.shadowColor = fill;
      ctx.shadowBlur = 12;
      ctx.fillStyle = fill;
      ctx.fillRect(-half, -half, half * 2, half * 2);
      ctx.shadowBlur = 0;
      if (item.kind === 'skill') {
        // The rarity ring is the tell from across the screen.
        const rc = SKILL_RARITIES[item.inst.rarity ?? 'common'].color;
        ctx.strokeStyle = rc;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-half - 3, -half - 3, half * 2 + 6, half * 2 + 6);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
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
    const COLORS = { life: '#d04848', mana: '#4a78d8', es: '#5ad8d8' };
    for (const o of world.orbs) {
      const y = o.pos.y + Math.sin(o.bob) * 2.5;
      const fade = Math.min(1, o.life / 2);
      ctx.globalAlpha = 0.85 * fade;
      ctx.shadowColor = COLORS[o.kind];
      ctx.shadowBlur = 9;
      ctx.fillStyle = COLORS[o.kind];
      ctx.beginPath();
      ctx.arc(o.pos.x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.9 * fade;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(o.pos.x - 1.5, y - 1.5, 1.8, 0, Math.PI * 2);
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
    const t = performance.now() / 1000;
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
      switch (p.shape) {
        case 'square':
          ctx.rotate(p.dir + t * 6); // tumbling hammer feel
          ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
          break;
        case 'line':
          ctx.rotate(p.dir);
          ctx.fillRect(-r * 1.8, -r * 0.35, r * 3.6, r * 0.7);
          break;
        case 'triangle':
          ctx.rotate(p.dir + Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, r); ctx.lineTo(-r * 0.85, r);
          ctx.closePath();
          ctx.fill();
          break;
        case 'octagon': {
          ctx.rotate(t * 2);
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
        case 'bar':
          // A wide front perpendicular to travel — the beam wall.
          ctx.rotate(p.dir);
          ctx.fillRect(-r * 0.3, -r * 1.9, r * 0.6, r * 3.8);
          ctx.globalAlpha = 0.4;
          ctx.fillRect(-r * 0.75, -r * 1.5, r * 0.45, r * 3);
          ctx.globalAlpha = 1;
          break;
        case 'arc': {
          // A crescent opening backward (the pulse).
          ctx.rotate(p.dir);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = r * 0.55;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(-r * 0.6, 0, r * 1.45, -Math.PI * 0.42, Math.PI * 0.42);
          ctx.stroke();
          ctx.globalAlpha = 0.45;
          ctx.lineWidth = r * 0.3;
          ctx.beginPath();
          ctx.arc(-r * 1.1, 0, r * 1.2, -Math.PI * 0.38, Math.PI * 0.38);
          ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'wave': {
          // A rolling sine front (the siege wave).
          ctx.rotate(p.dir + Math.PI / 2);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = r * 0.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          const span = r * 1.9;
          for (let wx = -span; wx <= span; wx += 4) {
            const wy = Math.sin((wx / span) * Math.PI * 2 + t * 8) * r * 0.4;
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

  private drawTexts(world: World): void {
    const { ctx } = this;
    ctx.textAlign = 'center';
    for (const t of world.texts) {
      ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
      ctx.font = `bold ${t.size}px Verdana`;
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.pos.x, t.pos.y);
      ctx.fillText(t.text, t.pos.x, t.pos.y);
    }
    ctx.globalAlpha = 1;
  }

  // -------------------------------------------------------------------- HUD

  private drawHud(world: World): void {
    const { ctx, canvas } = this;
    const w = canvas.width, h = canvas.height;
    const p = world.player;
    const m = world.meta;

    // Skill-bar geometry — computed FIRST so the resource orbs can flank it.
    // The cluster sits high enough that its three text strips stay distinct:
    // slot key labels (by+slot+12), the XP bar (by+slot+18) and the DOM hint
    // bar hugging the bottom edge — at by = h-78 all three overlapped.
    const slot = 54, gap = 6;
    const totalW = p.skills.length * slot + (p.skills.length - 1) * gap;
    const bx = w / 2 - totalW / 2, by = h - 92;

    // Resource orbs FLANK the centered bar (life just-left, mana just-right) so
    // life / mana / skills read as ONE central cluster — vital info isn't shoved
    // into the screen corners anymore. Arcs key off each orb's new center.
    const orbR = 46, orbGap = 12;
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
    if (p.maxEs() > 0 && p.es > 0) {
      ctx.strokeStyle = '#5ad8d8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(p.es / p.maxEs(), 0, 1));
      ctx.stroke();
    }
    if (p.absorb > 0) {
      ctx.strokeStyle = '#e8f0f8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p.absorb / 60));
      ctx.stroke();
    }
    // POISE: a bronze arc outside the tank layers — dims while broken so
    // the lapse of its protection is readable at a glance.
    if (p.maxPoise() > 0) {
      ctx.strokeStyle = p.poiseBroken ? 'rgba(216,176,106,0.35)' : '#d8b06a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + 16, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * clamp(p.poise / p.maxPoise(), 0, 1));
      ctx.stroke();
    }
    // ENDURANCE (opt-in pool): the fortify-green outermost ring — binary
    // protection, so the ring simply IS or ISN'T there.
    if (p.maxEndurance() > 0) {
      ctx.strokeStyle = '#a8c86a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lifeX, orbY, orbR + 21, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * clamp(p.endurance / p.maxEndurance(), 0, 1));
      ctx.stroke();
    }
    this.drawOrb(manaX, orbY, orbR, p.maxMana() > 0 ? p.mana / p.maxMana() : 0,
      '#2858b8', '#101848', `${Math.ceil(p.mana)}`, 'Mana',
      p.maxMana() > 0 ? p.reservedMana / p.maxMana() : 0);
    // INSIGHT wraps the MANA orb (the agility resource keeps the agile
    // company): a teal arc whose BRIGHTNESS breathes with momentum — full
    // glow at a sprint, fading over the taper once you plant.
    if (p.maxInsight() > 0) {
      const momentum = p.insightMomentum();
      ctx.strokeStyle = `rgba(106,216,184,${(0.3 + 0.7 * momentum).toFixed(2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(manaX, orbY, orbR + 6, -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * clamp(p.insight / p.maxInsight(), 0, 1));
      ctx.stroke();
    }

    // Environmental-survival meters (breath underwater; future heat/cold) — tucked
    // under the mana orb, shown only while a resource is below max (i.e. active).
    this.drawSurvival(p, manaX, orbY, orbR);

    // Skill bar
    ctx.textAlign = 'center';
    const keyLabels = this.slotKeys();
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
        const cost = p.skillCost(inst);
        // GATED skills grey out hard: no fuel in the pool, no afflicted
        // target in range — the bar tells you before the button does.
        const gated = !world.skillUsable(p, inst);
        ctx.fillStyle = def.color;
        // A toggled-ON contract is always bright: the off-press is free —
        // "unaffordable" dimming would lie about the one press that helps.
        ctx.globalAlpha = gated ? 0.15
          : (runningOn || (p.mana >= cost.mana && p.life > cost.life)) ? 0.9 : 0.3;
        ctx.fillRect(x + 4, by + 4, slot - 8, slot - 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#0a0a0e';
        ctx.font = 'bold 13px Verdana';
        // Stateful skills can change face: Mark shows REC while armed.
        const label = inst.state?.markPos ? 'REC' : initials(def.name);
        ctx.fillText(label, x + slot / 2, by + slot / 2 + 5);
        // Cooldown sweep — measured against the clock actually SET (an
        // Apotheosis-imposed cooldown sweeps too, not just innate ones).
        const cd = p.cooldowns.get(def.id);
        const cdTotal = p.cooldownTotals.get(def.id) ?? def.cooldown;
        if (cd !== undefined && cdTotal > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          const frac = clamp(cd / cdTotal, 0, 1);
          ctx.fillRect(x + 4, by + 4, slot - 8, (slot - 8) * frac);
        }
        // USE-CHARGE pips (SkillDef.useCharges): the bank across the slot's
        // top edge — bright = loaded, hollow = recovering. An empty bank
        // dims the slot like a cooldown would.
        if (def.useCharges) {
          const bank = p.skillChargeBank(inst);
          const cap = p.skillChargeCap(inst);
          if (bank.count <= 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(x + 4, by + 4, slot - 8, slot - 8);
          }
          for (let c = 0; c < Math.min(cap, 8); c++) {
            ctx.fillStyle = c < bank.count ? '#ffe86a' : 'rgba(90,90,110,0.8)';
            ctx.fillRect(x + 5 + c * 6, by + 5, 4, 4);
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
          if (def.delivery.type === 'summon' || def.delivery.type === 'construct') {
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
      const mx = this.hudMouse.x, myv = this.hudMouse.y;
      if (mx >= bpx - 2 && mx <= bpx + 12 && myv >= buffY - 2 && myv <= buffY + 12) {
        const rem = Math.max(...buff.expiries ?? [buff.remaining ?? 0]);
        hoverLabel = { x: bpx + 5, text: `${id.replace(/_/g, ' ')} ${rem > 0 && rem < 900 ? Math.ceil(rem) + 's' : ''}`.trim() };
      }
      bpx += 14;
    }
    // Charge pips (combo resources) next to the buffs, registry-tinted
    for (const [name, count] of p.charges) {
      if (count <= 0) continue;
      ctx.fillStyle = chargeColor(name);
      ctx.beginPath();
      ctx.arc(bpx + 5, buffY + 5, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px Verdana';
      ctx.fillText(`${count}`, bpx + 5, buffY - 2);
      const mx = this.hudMouse.x, myv = this.hudMouse.y;
      if (mx >= bpx - 2 && mx <= bpx + 12 && myv >= buffY - 2 && myv <= buffY + 12) {
        hoverLabel = { x: bpx + 5, text: name };
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

    // XP bar — tucked between the key-label row above and the DOM hint bar
    // below (its box top sits at ~h-17; +16 keeps the bar fully clear of it).
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by + slot + 16, totalW, 5);
    ctx.fillStyle = '#b8a0e0';
    ctx.fillRect(bx, by + slot + 16, totalW * clamp(m.xp / m.xpNeeded, 0, 1), 5);

    // Top-left status block
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px Verdana';
    ctx.fillStyle = '#c8a84b';
    // THE NAME leads; the class rides along only when they differ (an unnamed
    // "Rogue — Level 5 Rogue" would read as a stutter).
    const titleLine = m.name !== m.classDef.name
      ? `${m.name}  —  Level ${p.level} ${m.classDef.name}`
      : `${m.classDef.name}  —  Level ${p.level}`;
    ctx.fillText(titleLine, 16, 26);
    // CHARACTER-MODE chip (data-driven — any stage that declares a badge shows
    // one): the Immortal's SWORN → UNDYING standing, at a glance, in mode color.
    const stage = world.modeStageDef();
    if (stage.badge) {
      const titleW = ctx.measureText(titleLine).width;
      ctx.font = 'bold 10px Verdana';
      const bw = ctx.measureText(stage.badge).width + 12;
      const chipX = 16 + titleW + 12;
      const col = world.modeDef().color;
      ctx.fillStyle = '#16121c';
      ctx.fillRect(chipX, 14, bw, 15);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.strokeRect(chipX, 14, bw, 15);
      ctx.fillStyle = col;
      ctx.fillText(stage.badge, chipX + 6, 25);
    }
    ctx.font = '12px Verdana';
    ctx.fillStyle = world.zone.theme.accent;
    const lvText = world.zone.level > 0 ? ` — Monster Lv ${world.zone.level}` : '';
    ctx.fillText(`${world.zone.name}${lvText}`, 16, 46);
    // Living-world status: time of day · weather · who holds this ground.
    ctx.font = '11px Verdana';
    ctx.fillStyle = '#9ab0c8';
    ctx.fillText(world.sim.hudLine(world.zone, world.time), 16, 64);
    ctx.font = '12px Verdana';
    ctx.fillStyle = world.objectiveDone ? '#ffd700' : '#9a96b8';
    ctx.fillText(world.objectiveText(), 16, 82);
    // The kill counter is RUN-END information (credits math, the death
    // screen) — mid-run it's clutter, so the HUD no longer carries it.
    let hintY = 100;
    if (m.passivePoints > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`${m.passivePoints} passive point${m.passivePoints > 1 ? 's' : ''} — press P`, 16, hintY);
      hintY += 18;
    }
    if (m.skillPoints > 0) {
      ctx.fillStyle = '#7ec8a0';
      ctx.fillText(`${m.skillPoints} skill point${m.skillPoints > 1 ? 's' : ''} — press B`, 16, hintY);
      hintY += 18;
    }
    const carried = m.inventory.length + m.skillInv.length;
    if (carried > 0) {
      ctx.fillStyle = '#b06bd4';
      ctx.fillText(`${carried} gem${carried > 1 ? 's' : ''} carried — press B`, 16, hintY);
      hintY += 18;
    }
    if (world.mireilleXpBuff > 0) {
      const t = Math.ceil(world.mireilleXpBuff);
      ctx.fillStyle = '#a0d8a0';
      ctx.fillText(`✦ +5% XP blessing — ${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`, 16, hintY);
      hintY += 18;
    }
    const rep = world.sim.reputation.hud();
    if (rep) {
      ctx.fillStyle = '#e8c87a';
      ctx.fillText(rep, 16, hintY);
      hintY += 18;
    }
    if (world.nearFont()) {
      ctx.fillStyle = '#b06bd4';
      ctx.fillText(`Sacrificial Font — offer skill gems in the book (B) · ${m.offerings}/3`, 16, hintY);
    }
    if (world.zone.objective.kind === 'waves' && !world.objectiveDone
      && !world.waveActive && !world.gameOver) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px Verdana';
      ctx.fillStyle = '#c8a84b';
      ctx.fillText(`Wave ${world.wave + 1} in ${Math.ceil(world.waveTimer)}...`, w / 2, 110);
    }

    // Boss bar — pushed down below the co-op party strip when it's showing, so the
    // two top-center stacks never collide (gated on party size = SP pixel-parity).
    const boss = world.actors.find(a => !a.dead && a.team === 'enemy' && a.defId && a.xpValue >= BOSS_BAR_XP_MIN);
    if (boss) {
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
      // Phase pips for a multi-phase boss. HP-ladder bosses FILL pips as
      // phases are entered (one-way, via aiPhaseIdx); script-FSM bosses
      // HIGHLIGHT the current phase instead (scripts loop, so "progress"
      // is a position, not a count).
      if (boss.brain?.script?.length) {
        const pips = boss.brain.script.length;
        for (let i = 0; i < pips; i++) {
          ctx.fillStyle = i === boss.aiScriptIdx ? '#d060e0' : '#2a2a3a';
          ctx.fillRect(bx + bw2 - (pips - i) * 12, 40 + oy, 9, 4);
        }
      } else if (boss.brain?.phases?.length) {
        const pips = boss.brain.phases.length + 1; // base + each HP phase
        const done = clamp(boss.aiPhaseIdx + 2, 1, pips);
        for (let i = 0; i < pips; i++) {
          ctx.fillStyle = i < done ? '#d060e0' : '#2a2a3a';
          ctx.fillRect(bx + bw2 - (pips - i) * 12, 40 + oy, 9, 4);
        }
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px Verdana';
      ctx.fillStyle = warded ? '#c0c0cc' : '#ffd0d0';
      ctx.fillText(warded ? `${boss.name} — WARDED` : boss.name, w / 2, 52 + oy);
    }
  }

  /** Environmental-survival meters under an orb — one slim bar per resource the
   *  player has BELOW max (hidden when full / never-touched). Registry-driven, so a
   *  future heat/cold resource renders automatically from its SURVIVAL_RESOURCES row. */
  private drawSurvival(p: Actor, cx: number, orbY: number, orbR: number): void {
    if (!p.survival) return;
    const { ctx } = this;
    // Stack the bars ABOVE the orb (the orbs hug the bottom edge, so a below-orb
    // bar renders off-screen — same reason drawOrb's caption sits above). Clear the
    // orb's own caption (at orbY - orbR - 26) and grow upward.
    let dy = 0;
    for (const def of Object.values(SURVIVAL_RESOURCES)) {
      const cur = p.survival.get(def.id);
      if (cur === undefined || cur >= def.max) continue; // full / inactive → hidden
      const frac = clamp(cur / def.max, 0, 1);
      const bw = orbR * 1.4, bh = 8, x = cx - bw / 2, y = orbY - orbR - 46 - dy;
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
    // edge, so a below-orb label (y + r + 14) would render off-screen. Cleared
    // above ALL the tank arcs — the outermost (endurance) rides at orbR + 21,
    // which struck through the caption at the old -18 offset.
    ctx.font = '10px Verdana';
    ctx.fillStyle = '#8a8678';
    ctx.fillText(label, x, y - r - 26);
  }
}

function initials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').slice(0, 3).toUpperCase();
}

// hexToRgb / shade now live in vis/color.ts (imported above) — every draw
// path derives washes and gradients from the SAME color math as the bakes.
