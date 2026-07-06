// ---------------------------------------------------------------------------
// Canvas renderer: world (camera-following) + HUD. Placeholder geometry art —
// every visual reads its color/shape from the data definitions.
// ---------------------------------------------------------------------------

import { clamp, dist, type Vec2 } from '../core/math';
import { instanceMeta, instanceStrikeTiming, SKILL_RARITIES } from '../engine/skills';
import { STATUS_DEFS } from '../engine/status';
import { STANCE_PLANT_TIME, type Actor } from '../engine/actor';
import { chargeColor } from '../engine/charges';
import { REMNANT_KINDS } from '../data/remnants';
import { RUNE_INFO } from '../data/invocations';
import { BOSS_BAR_XP_MIN } from '../engine/world';
import type { World } from '../engine/world';
import { BIOMES } from '../world/biomes';
import { dayCycle } from '../world/daynight';
import { GridWalkField } from '../world/gridWalk';
import { regionKind, SURVIVAL_RESOURCES } from '../world/regions';
import { doodadRuleOf, type Doodad } from '../engine/levelgen';

/** View-cull margin beyond a doodad's own radius: canopy crowns, vent rims,
 *  and blob `grow` passes all overdraw past the disc — the pad keeps their
 *  edges from popping at the screen border. */
const RENDER_CULL_PAD = 150;
const EMPTY_DOODADS: readonly Doodad[] = [];
import { roofStyle } from '../data/structures';
import { WEATHER_COLORS } from '../world/palette';
import type { Settings } from '../meta/settings';
import { collectActiveFx } from './screenFx';
import { RARITY_DEFS } from '../engine/rarity';

const SLOT_KEYS = ['LMB', 'RMB', '1', '2', '3', '4', '5', '6'];

/** Every doodad kind drawDoodads has a bespoke branch for. Kinds outside this
 *  set (package/legend-registered data kinds) draw via the generic disc
 *  fallback at the end of the pass — visible immediately, upgradeable later. */
const RENDERED_DOODAD_KINDS = new Set<string>([
  'chasm', 'water', 'lava', 'cinder', 'gore', 'mud', 'sand', 'swamp', 'road', 'bog',
  'grass', 'vines', 'ice', 'mycelial_mat', 'crystal', 'lava_vent', 'ember_vent',
  'obsidian', 'flesh_pod', 'bone', 'giant_mushroom', 'fruiting_tower', 'spore_pod',
  'glow_cap', 'void_chasm', 'ruin_obelisk', 'light_spot', 'descent_platform',
  'kelp', 'coral', 'sea_rock', 'bridge', 'cliff', 'wall', 'brush', 'campfire',
  'tree', 'rock', 'thicket', 'palm', 'tombstone', 'cave_entrance', 'tentacle_field',
  'ritual_pentagram', 'door', 'window', 'dock', 'breach', 'landmass', 'isle_beacon',
]);
const warnedUnrenderedKinds = new Set<string>();

export class Renderer {
  ctx: CanvasRenderingContext2D;
  cam = { x: 0, y: 0 };
  /** Screen-space mouse, fed by main each frame — HUD hover affordances
   *  (buff-pip names) read it; (-1,-1) = no pointer. */
  hudMouse = { x: -1, y: -1 };
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
      kb.skillSlot5, kb.skillSlot6, kb.skillSlot7].map(s => s.toUpperCase());
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
    this.drawProjectiles(world);
    this.drawCanopies(world);      // fake-2D depth: crowns above actors, faded near the hero
    this.drawRoofs(world);         // structure roofs: interiors reveal only when you're inside
    this.drawTexts(world);

    ctx.restore();

    this.drawAtmosphere(world);
    this.drawStatusFx(world);     // status ailment overlays (edge vignettes/frost/stars)
    this.drawLowLifeGlow(world);  // blinking red edge on a low-life hit
    this.drawHud(world);          // orbs + bar + boss bar — last, so it stays readable
    this.drawEncounterHud(world); // breach timer bar (screen-space)
    this.drawFractureHud(world);  // fracture nested-timer bar (screen-space)
    this.drawDescentHud(world);   // the abyss: encroaching-dark vignette + depth/echoes + shaft pip
    this.drawParty(world);        // co-op party strip (screen-space, top; ≤1 = nothing)
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
    const night = 1 - dayCycle(world.time).light; // 0 at noon, 1 at deep night
    if (night > 0.04) {
      ctx.fillStyle = `rgba(12,16,40,${(0.30 * night).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }
    const f = world.sim.weather.sample(world.zone);
    if (f) {
      const [r, g, b] = hexToRgb(WEATHER_COLORS[f.kind]);
      ctx.fillStyle = `rgba(${r},${g},${b},${(0.05 + 0.12 * f.intensity).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
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
    // BOUNDLESS (the Descent): no edges — fill + grid the VISIBLE window around the
    // camera (the floor scrolls with the player forever), and draw NO border.
    if (world.arena.boundless) {
      const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
      const x0 = this.cam.x, y0 = this.cam.y, x1 = x0 + vw, y1 = y0 + vh;
      ctx.fillStyle = theme.floor;
      ctx.fillRect(x0, y0, vw, vh);
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      const grid = 96;
      ctx.beginPath();
      for (let x = Math.floor(x0 / grid) * grid; x <= x1; x += grid) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
      for (let y = Math.floor(y0 / grid) * grid; y <= y1; y += grid) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
      ctx.stroke();
      return;
    }
    const ell = world.arena.shape === 'ellipse';
    ctx.save();
    if (ell) { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.clip(); }
    ctx.fillStyle = theme.floor;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    const grid = 96;
    ctx.beginPath();
    for (let x = 0; x <= w; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = 0; y <= h; y += grid) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();
    this.drawWalkMask(world); // NON-CONVEX zones: paint the non-walkable cells as void
    ctx.restore();
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 4;
    if (ell) { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); ctx.stroke(); }
    else ctx.strokeRect(0, 0, w, h);
  }

  /** NON-CONVEX zones (Phase 2/3): paint each grid cell by its REGION KIND — walls
   *  as void-black, and any kind with a `visual` (void, deep_water, air_pocket, a
   *  shimmer…) with its data-driven wash. So rooms read as carved space and water/
   *  void/visual regions render distinctly — all from the registry, no per-kind draw
   *  branch. Only viewport cells. Null walk (plains + existing) → nothing happens. */
  private drawWalkMask(world: World): void {
    const wf = world.walk;
    if (!(wf instanceof GridWalkField)) return;
    const { ctx } = this;
    // Solid wall cells take the ZONE THEME's wall/obstacle colour (so rooms read as
    // carved stone, flesh as fleshy tissue, etc.) instead of a hardcoded void-black.
    // The actual void/fall region is UNAFFECTED — it carries its own dark `visual`
    // and takes the branch above, so it stays distinct from a themed wall.
    const wallFill = world.zone.theme.wall ?? world.zone.theme.obstacle ?? '#07070b';
    const vw = this.canvas.width / this.zoom, vh = this.canvas.height / this.zoom;
    const cell = wf.cell;
    const c0 = Math.max(0, Math.floor(this.cam.x / cell));
    const c1 = Math.min(wf.cols, Math.ceil((this.cam.x + vw) / cell));
    const r0 = Math.max(0, Math.floor(this.cam.y / cell));
    const r1 = Math.min(wf.rows, Math.ceil((this.cam.y + vh) / cell));
    for (let cy = r0; cy < r1; cy++) {
      for (let cx = c0; cx < c1; cx++) {
        const id = wf.regionAt((cx + 0.5) * cell, (cy + 0.5) * cell);
        if (id === 'ground') continue; // plain walkable floor — leave the theme fill
        const def = regionKind(id);
        const vis = def?.visual;
        if (vis) {
          let alpha = vis.alpha ?? 1;
          // Animated regions (flesh throb, water drift) breathe via a sine on the clock.
          if (vis.animate === 'pulse') alpha *= 0.6 + 0.4 * Math.sin(performance.now() / 650 + cx * 0.3 + cy * 0.3);
          else if (vis.animate === 'drift') alpha *= 0.8 + 0.2 * Math.sin(performance.now() / 900 + cx * 0.2);
          ctx.globalAlpha = Math.max(0, alpha); ctx.fillStyle = vis.fill;
        }
        else if (def?.walkable) continue;          // a walkable kind w/o visual — leave floor
        else { ctx.globalAlpha = 1; ctx.fillStyle = wallFill; } // wall default — themed
        ctx.fillRect(cx * cell, cy * cell, cell + 0.6, cell + 0.6);
      }
    }
    ctx.globalAlpha = 1;
  }

  /** One merged silhouette for a set of circles (overlaps fill uniformly). */
  private blobPath(doodads: readonly { pos: Vec2; radius: number }[], grow = 0): void {
    const { ctx } = this;
    ctx.beginPath();
    for (const d of doodads) {
      ctx.moveTo(d.pos.x + d.radius + grow, d.pos.y);
      ctx.arc(d.pos.x, d.pos.y, d.radius + grow, 0, Math.PI * 2);
    }
  }

  /** Per-frame VIEW CULL over the zone's doodads, grouped by kind. The ground
   *  pass used to run ~40 full-list filter passes and build blob paths for
   *  every disc in the ZONE — a landmark that pours a liquid (a caldera's
   *  lava pool is one disc per grid cell, hundreds of them) paid that cost
   *  every frame for geometry nowhere near the screen. Pad covers crown/rim
   *  overdraw beyond a doodad's radius (canopy crowns, vent rims, blob grow). */
  private culled = new Map<string, Doodad[]>();
  private culledAll: Doodad[] = [];
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
   * Terrain doodads, painted by kind: chasms as rimmed voids, mud as soft
   * slowing patches, bridges as planks spanning the gaps, cliffs as woven
   * walls, rocks as lit mounds. Blobs render as merged silhouettes — a rim
   * pass with grown radii under a core pass — so overlapping circles read
   * as one landform instead of a pile of outlines.
   */
  private drawDoodads(world: World): void {
    const { ctx } = this;
    const theme = world.zone.theme;
    // View-culled, pre-grouped (cullDoodads) — never a full-list filter.
    const byKind = (k: string): readonly Doodad[] => this.culled.get(k) ?? EMPTY_DOODADS;

    // Water: shore rim, deep fill, and pale shallow-ford overlays.
    const water = byKind('water');
    if (water.length) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#9ab8cc';
      this.blobPath(water, 4);
      ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = theme.water ?? '#1d4264';
      this.blobPath(water);
      ctx.fill();
      const fords = water.filter(d => d.shallow);
      if (fords.length) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = '#7ba8c4';
        this.blobPath(fords, -6);
        ctx.fill();
      }
      // Ripples: faint rings expanding over the deep, so water reads as alive.
      const tw = performance.now() / 1000;
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#bfe0f0';
      ctx.lineWidth = 1.2;
      for (const d of water) {
        if (d.shallow) continue;
        const phase = (tw * 0.5 + d.pos.x * 0.01) % 1;
        for (let k = 0; k < 2; k++) {
          const rr = ((phase + k * 0.5) % 1) * d.radius * 0.92;
          ctx.beginPath();
          ctx.arc(d.pos.x, d.pos.y, rr, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Lily pads: small green discs rimming real pools — lush biomes only.
    const lilyBiomes = new Set(['grove', 'meadow', 'isle']);
    if (water.length && lilyBiomes.has(world.zone.biome ?? '')) {
      ctx.fillStyle = '#6ba036';
      ctx.globalAlpha = 0.7;
      for (const w of water) {
        if (w.shallow) continue; // pads ring pools, not fords
        const n = 2 + (((w.pos.x * 73 + w.pos.y * 97) >>> 0) % 3);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + (w.pos.x % 6.283);
          const lx = w.pos.x + Math.cos(a) * (w.radius + 7);
          const ly = w.pos.y + Math.sin(a) * (w.radius + 7);
          for (let j = 0; j < 3; j++) {
            const off = (j - 1) * 4;
            ctx.beginPath();
            ctx.arc(lx + Math.cos(a + Math.PI / 2) * off, ly + Math.sin(a + Math.PI / 2) * off, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Bog: rank standing murk (poisons on entry), with drifting squiggles over
    // the top so it reads as living murk — distinct from leafy brush cover.
    const bog = byKind('bog');
    if (bog.length) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#39432a';
      this.blobPath(bog, 3);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#5a6e34';
      this.blobPath(bog, -8);
      ctx.fill();
      const tb = performance.now() / 1000;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#7a8a4a';
      ctx.lineWidth = 1.2;
      for (const d of bog) {
        for (let k = 0; k < 3; k++) {
          const yy = d.pos.y - d.radius * 0.4 + k * d.radius * 0.4;
          ctx.beginPath();
          for (let x = -d.radius * 0.7; x <= d.radius * 0.7; x += 6) {
            const wy = yy + Math.sin(x * 0.12 + tb * 1.5 + k) * 3;
            if (x <= -d.radius * 0.7) ctx.moveTo(d.pos.x + x, wy);
            else ctx.lineTo(d.pos.x + x, wy);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Swamp: sticky trudge.
    const swamp = byKind('swamp');
    if (swamp.length) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#2e3a2a';
      this.blobPath(swamp);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Mud / snow / ash: soft patches you wade through.
    const mud = byKind('mud');
    if (mud.length) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = theme.mud ?? '#2b2518';
      this.blobPath(mud);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Sand: pale wind-blown grit (slows like mud).
    const sand = byKind('sand');
    if (sand.length) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = theme.sand ?? '#c9a86a';
      this.blobPath(sand);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Road: a packed gravel path — a flat grey-tan strip with a lighter worn track
    // down the middle (the two-pass rim+core trick), so it reads as a maintained road.
    const road = byKind('road');
    if (road.length) {
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = theme.road ?? '#574f44';
      this.blobPath(road);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#79705f';
      this.blobPath(road, -7);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Lava: a molten rim over a dark core (the chasm's hot inverse).
    const lava = byKind('lava');
    if (lava.length) {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ff5a1e';
      this.blobPath(lava, 4);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.lava ?? '#7a1a08';
      this.blobPath(lava, -6);
      ctx.fill();
    }

    // Crystal shards: faceted gems with a pulsing lit core (the laser hazard source).
    for (const c of byKind('crystal')) {
      const r = c.radius, pulse = 0.55 + 0.45 * Math.sin(performance.now() / 400 + c.pos.x * 0.05);
      ctx.save(); ctx.translate(c.pos.x, c.pos.y); ctx.rotate(c.rot ?? 0);
      ctx.fillStyle = '#3a6a9a';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2, rr = r * (0.7 + 0.3 * (i % 2));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = pulse; ctx.fillStyle = '#9fd8ff';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Lava + ember vents: an obsidian rim around a pulsing molten throat with a
    // bright core — telegraphing the ring-volley eruption (orb launcher).
    const drawVent = (v: { pos: Vec2; radius: number }): void => {
      const r = v.radius, glow = 0.5 + 0.5 * Math.sin(performance.now() / 300 + v.pos.x * 0.04);
      ctx.fillStyle = '#140805'; // obsidian rim
      ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r * 1.18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a0a06'; // throat
      ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.5 + 0.45 * glow; ctx.fillStyle = '#ff5a1e';
      ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4 + 0.5 * glow; ctx.fillStyle = '#ffd24a'; // molten core
      ctx.beginPath(); ctx.arc(v.pos.x, v.pos.y, r * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    for (const v of byKind('lava_vent')) drawVent(v);
    for (const v of byKind('ember_vent')) drawVent(v);

    // Obsidian: glassy black volcanic shards with an ember-glow facet edge.
    for (const o of byKind('obsidian')) {
      const r = o.radius;
      ctx.save(); ctx.translate(o.pos.x, o.pos.y); ctx.rotate(o.rot ?? 0);
      ctx.fillStyle = '#171015';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2, rr = r * (0.7 + 0.3 * (i % 2));
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.strokeStyle = theme.accent ?? '#ff7a2a'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Cinder: ash patches with faintly glowing embers (a ground overlay).
    const cinder = byKind('cinder');
    if (cinder.length) {
      ctx.globalAlpha = 0.55; ctx.fillStyle = '#2a1a12';
      this.blobPath(cinder, 3); ctx.fill();
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(performance.now() / 520); ctx.fillStyle = theme.lava ?? '#7a1a08';
      this.blobPath(cinder, -8); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Flesh pods: bulbous organic sacs with a pulsing translucent core.
    for (const o of byKind('flesh_pod')) {
      const r = o.radius, pulse = 0.5 + 0.5 * Math.sin(performance.now() / 520 + o.pos.x * 0.05);
      ctx.save(); ctx.translate(o.pos.x, o.pos.y); ctx.rotate(o.rot ?? 0);
      ctx.fillStyle = theme.obstacle;
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.4 + 0.45 * pulse; ctx.fillStyle = theme.accent ?? '#e86a7a';
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Gore: dark viscera pools (a ground overlay).
    const gore = byKind('gore');
    if (gore.length) {
      ctx.globalAlpha = 0.6; ctx.fillStyle = '#3a0a12';
      this.blobPath(gore, 3); ctx.fill();
      ctx.globalAlpha = 0.82; ctx.fillStyle = '#5a1420';
      this.blobPath(gore); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Bone: pale ribcage/spine struts jutting from the flesh.
    for (const o of byKind('bone')) {
      const r = o.radius;
      ctx.save(); ctx.translate(o.pos.x, o.pos.y); ctx.rotate(o.rot ?? 0);
      ctx.strokeStyle = '#d8cdb8'; ctx.lineWidth = Math.max(3, r * 0.4); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();             // spine
      ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 0.4); ctx.lineTo(r * 0.7, -r * 0.4); ctx.stroke(); // ribs
      ctx.beginPath(); ctx.moveTo(-r * 0.7, r * 0.15); ctx.lineTo(r * 0.7, r * 0.15); ctx.stroke();
      ctx.restore();
    }

    // --- MYCELIA fungal doodads (bioluminescent caps, pods, glowing carpet) ---
    // Mycelial mat: a glowing hyphal carpet — a ground overlay (the spore-density tell).
    const mat = byKind('mycelial_mat');
    if (mat.length) {
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#2a3a1e';
      this.blobPath(mat, 3); ctx.fill();
      ctx.globalAlpha = 0.36; ctx.fillStyle = '#6fae4a';
      this.blobPath(mat); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Giant mushrooms + fruiting towers now render in the CANOPY pass (above
    // actors, proximity-faded) — the fake-2D depth layer. See drawCanopies.
    // Spore-pods: a bulbous sac with a glowing crown (puffs a spore cloud on its timer).
    for (const o of byKind('spore_pod')) {
      const r = o.radius, pulse = 0.4 + 0.5 * Math.sin(world.time * 2.4 + o.pos.y * 0.05);
      ctx.save(); ctx.translate(o.pos.x, o.pos.y);
      ctx.fillStyle = '#4a5a2a';
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45 + 0.4 * pulse; ctx.fillStyle = '#adbf6a';
      ctx.beginPath(); ctx.arc(0, -r * 0.3, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }
    // Glow-caps: small bioluminescent caps — decoration + a soft halo of light.
    for (const o of byKind('glow_cap')) {
      const r = o.radius, glow = 0.5 + 0.5 * Math.sin(world.time * 3 + o.pos.x * 0.1);
      ctx.save(); ctx.translate(o.pos.x, o.pos.y);
      ctx.globalAlpha = 0.22 + 0.28 * glow; ctx.fillStyle = '#c8ffa0';
      ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#8fd06f';
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.7, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // DESCENT — void chasms: a faint purple rim over a true-black pit (a fall hazard).
    const voids = byKind('void_chasm');
    if (voids.length) {
      ctx.globalAlpha = 0.45; ctx.fillStyle = '#3a2a52';
      this.blobPath(voids, 5); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#020205';
      this.blobPath(voids); ctx.fill();
    }
    // DESCENT — cursed obelisks: a jagged dark monolith with a violet sheen (a trap).
    for (const o of byKind('ruin_obelisk')) {
      const r = o.radius;
      ctx.save(); ctx.translate(o.pos.x, o.pos.y);
      ctx.fillStyle = '#1c1830'; ctx.strokeStyle = '#7a4fb0'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.4); ctx.lineTo(r * 0.7, -r * 0.2); ctx.lineTo(r * 0.45, r);
      ctx.lineTo(-r * 0.45, r); ctx.lineTo(-r * 0.7, -r * 0.2); ctx.closePath();
      ctx.fill(); ctx.stroke();
      const gl = 0.4 + 0.3 * Math.sin(world.time * 2.2 + o.pos.x);
      ctx.globalAlpha = gl; ctx.fillStyle = '#a06ad8';
      ctx.beginPath(); ctx.arc(0, -r * 0.1, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }
    // DESCENT — light spots: glowing crystalline clusters (run over for a burst).
    for (const o of byKind('light_spot')) {
      const r = o.radius, pulse = 0.55 + 0.45 * Math.sin(world.time * 3 + o.pos.x * 0.05);
      ctx.save();
      ctx.globalAlpha = 0.22 * pulse; ctx.fillStyle = '#ffe08a';
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r * 2.6, 0, Math.PI * 2); ctx.fill();   // halo
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff2c0'; ctx.strokeStyle = '#ffd060'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + (o.rot ?? 0);
        ctx.beginPath();
        ctx.moveTo(o.pos.x + Math.cos(a) * r, o.pos.y + Math.sin(a) * r);
        ctx.lineTo(o.pos.x + Math.cos(a + 0.5) * r * 0.4, o.pos.y + Math.sin(a + 0.5) * r * 0.4);
        ctx.lineTo(o.pos.x, o.pos.y);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    // DESCENT — the mineshaft platform: a glowing descent ring (dwell to delve / out).
    for (const o of byKind('descent_platform')) {
      const r = o.radius, pulse = 0.5 + 0.5 * Math.sin(world.time * 2);
      ctx.save();
      ctx.globalAlpha = 0.85; ctx.strokeStyle = '#7fe0d8'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.3 + 0.3 * pulse; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.5; ctx.fillStyle = '#040810';
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // MARINE — kelp: swaying translucent fronds rising from a walkable bed.
    for (const o of byKind('kelp')) {
      const r = o.radius;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#2f7a4a'; ctx.lineCap = 'round';
      const blades = 3 + ((o.pos.x | 0) % 3);
      for (let i = 0; i < blades; i++) {
        const bx = o.pos.x + ((i / blades) - 0.4) * r * 1.2;
        const sway = Math.sin(world.time * 1.6 + o.pos.x * 0.04 + i) * (r * 0.18);
        ctx.lineWidth = 3 + (i % 2);
        ctx.beginPath();
        ctx.moveTo(bx, o.pos.y + r * 0.5);
        ctx.quadraticCurveTo(bx + sway * 0.5, o.pos.y, bx + sway, o.pos.y - r * 0.7);
        ctx.stroke();
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    // MARINE — coral: a vibrant branching head (warm pink/orange).
    for (const o of byKind('coral')) {
      const r = o.radius;
      ctx.save(); ctx.translate(o.pos.x, o.pos.y); ctx.rotate(o.rot ?? 0);
      ctx.fillStyle = '#1a3a44';
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.7, 0, Math.PI * 2); ctx.fill(); // base
      ctx.strokeStyle = '#e87aa0'; ctx.lineWidth = Math.max(3, r * 0.28); ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.5;
        ctx.beginPath(); ctx.moveTo(0, r * 0.3);
        ctx.lineTo(Math.cos(a) * r * 0.9, r * 0.3 + Math.sin(a) * r * 1.1); ctx.stroke();
      }
      ctx.restore();
    }
    // MARINE — sea rock: a barnacled rounded outcropping (cooler, teal-rimmed).
    for (const o of byKind('sea_rock')) {
      const r = o.radius;
      ctx.save();
      ctx.fillStyle = '#274a52'; ctx.strokeStyle = '#3f7a86'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.globalAlpha = 0.45; ctx.fillStyle = '#5fb0b8';
      ctx.beginPath(); ctx.arc(o.pos.x - r * 0.3, o.pos.y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.restore();
    }

    // Vines: a dark concealing mat that walls you in (but you can fire across).
    const vines = byKind('vines');
    if (vines.length) {
      ctx.fillStyle = '#1f3a1c';
      this.blobPath(vines, 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#000000';
      this.blobPath(vines, -6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Ice: bright sheets that steal your traction.
    const ice = byKind('ice');
    if (ice.length) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#e8f4fc';
      this.blobPath(ice, 3);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#bcd8e8';
      this.blobPath(ice);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Chasms: a faint rim, then the void. Drawn AFTER every ground overlay so
    // the pit punches through whatever it cut across at generation — a water
    // disc lapping a chasm's edge must never read as water floating over the
    // abyss (the void wins; the pool visibly drains INTO it). Bridges follow,
    // planking over the top.
    const chasms = byKind('chasm');
    if (chasms.length) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = theme.obstacleEdge;
      this.blobPath(chasms, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.chasm ?? '#040409';
      this.blobPath(chasms);
      ctx.fill();
    }

    // Bridges: planks across the void.
    for (const b of byKind('bridge')) {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      ctx.rotate(b.dir ?? 0);
      ctx.fillStyle = '#5e4730';
      ctx.fillRect(-b.radius, -b.radius * 0.82, b.radius * 2, b.radius * 1.64);
      ctx.strokeStyle = '#3c2c1c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-b.radius, -b.radius * 0.82); ctx.lineTo(b.radius, -b.radius * 0.82);
      ctx.moveTo(-b.radius, b.radius * 0.82); ctx.lineTo(b.radius, b.radius * 0.82);
      ctx.moveTo(0, -b.radius * 0.82); ctx.lineTo(0, b.radius * 0.82);
      ctx.stroke();
      ctx.restore();
    }

    // Cliffs: woven wall runs — rim pass under a solid core.
    const cliffs = byKind('cliff');
    if (cliffs.length) {
      ctx.fillStyle = theme.obstacleEdge;
      this.blobPath(cliffs, 3);
      ctx.fill();
      ctx.fillStyle = theme.obstacle;
      this.blobPath(cliffs);
      ctx.fill();
    }

    // Palisade walls: timber posts in rows.
    for (const o of byKind('wall')) {
      const r = o.radius;
      ctx.fillStyle = theme.wall ?? '#5e4c34';
      ctx.strokeStyle = '#2c2418';
      ctx.lineWidth = 2;
      ctx.fillRect(o.pos.x - r * 0.85, o.pos.y - r * 0.85, r * 1.7, r * 1.7);
      ctx.strokeRect(o.pos.x - r * 0.85, o.pos.y - r * 0.85, r * 1.7, r * 1.7);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(o.pos.x - r * 0.85, o.pos.y - r * 0.85, r * 1.7, r * 0.4);
      ctx.globalAlpha = 1;
    }

    // Grass: soft splotches with a few tufts.
    const grass = byKind('grass');
    if (grass.length) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = theme.grass ?? '#3e5c30';
      this.blobPath(grass);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = theme.grass ?? '#3e5c30';
      ctx.lineWidth = 1.5;
      for (const g of grass) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + g.pos.x;
          const gx = g.pos.x + Math.cos(a) * g.radius * 0.5;
          const gy = g.pos.y + Math.sin(a) * g.radius * 0.5;
          ctx.beginPath();
          ctx.moveTo(gx, gy + 3); ctx.lineTo(gx - 2, gy - 4);
          ctx.moveTo(gx, gy + 3); ctx.lineTo(gx + 2, gy - 5);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    // Brush: dense cover you can vanish into. A leafy stipple over each clump
    // (rotated per-instance) reads clearly as foliage — not bog murk.
    for (const b of byKind('brush')) {
      ctx.save();
      ctx.translate(b.pos.x, b.pos.y);
      if (b.rot !== undefined) ctx.rotate(b.rot);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = theme.tree ?? '#2c4424';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#1a2414';
      const sp = b.radius * 0.25;
      for (let dx = -b.radius; dx < b.radius; dx += sp) {
        for (let dy = -b.radius; dy < b.radius; dy += sp) {
          const ds = 1.5 + ((((dx * 13 + dy * 7 + b.pos.x + b.pos.y) % 2.5) + 2.5) % 2.5);
          ctx.beginPath();
          ctx.arc(dx, dy, ds, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(0, 0, b.radius - 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Campfires: a warm flickering glow.
    const t2 = performance.now() / 1000;
    for (const o of byKind('campfire')) {
      const flick = 0.85 + 0.15 * Math.sin(t2 * 11 + o.pos.x);
      ctx.globalAlpha = 0.18 * flick;
      ctx.fillStyle = '#ffae52';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius * 2.6 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#3a3026';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8838';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y - 2, o.radius * 0.5 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd24a';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y - 3, o.radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    // Trees render in the CANOPY pass (above actors, proximity-faded) — only
    // their ground shadow stays down here so the floor still reads occupied.
    for (const o of byKind('tree')) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#241c12';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Rocks: lit mounds with a greyscale cross-hatch so they read as STONE —
    // unmistakable against trees and other round features.
    for (const o of byKind('rock')) {
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      if (o.rot !== undefined) ctx.rotate(o.rot);
      ctx.fillStyle = theme.obstacle;
      ctx.strokeStyle = theme.obstacleEdge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Hatch: clip to the disc, draw two diagonal grids of fine dark lines.
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.2;
      const sp = Math.max(5, o.radius * 0.5);
      for (let d = -o.radius; d <= o.radius; d += sp) {
        ctx.beginPath();
        ctx.moveTo(d, -o.radius);
        ctx.lineTo(d + o.radius * 2, o.radius);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(d, o.radius);
        ctx.lineTo(d + o.radius * 2, -o.radius);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-o.radius * 0.28, -o.radius * 0.28, o.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Thickets render in the CANOPY pass now (the bramble mass rides the same
    // proximity fade as tree crowns — walk into the brake's shadow and it
    // opens up); only a ground shadow stays down here.
    for (const o of byKind('thicket')) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#101c10';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Palms render in the CANOPY pass (above actors, proximity-faded); their
    // ground shadow stays here.
    for (const o of byKind('palm')) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#241c12';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Tombstones: weathered grey slabs with a faint cross, leaning askew.
    for (const o of byKind('tombstone')) {
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      if (o.rot !== undefined) ctx.rotate(o.rot);
      const w = o.radius * 1.3, h = o.radius * 1.9;
      ctx.fillStyle = '#8a8a94';
      ctx.strokeStyle = '#4a4a54';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w / 2, h / 2);
      ctx.lineTo(-w / 2, -h / 4);
      ctx.arc(0, -h / 4, w / 2, Math.PI, 0);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#5a5a64';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -h * 0.28); ctx.lineTo(0, h * 0.1);
      ctx.moveTo(-w * 0.22, -h * 0.12); ctx.lineTo(w * 0.22, -h * 0.12);
      ctx.stroke();
      ctx.restore();
    }

    // Cave mouths: a black throat under a stone lip, with a flickering glow.
    const t3 = performance.now() / 1000;
    for (const o of byKind('cave_entrance')) {
      const flick = 0.85 + 0.15 * Math.sin(t3 * 5 + o.pos.x);
      ctx.globalAlpha = 0.16 * flick;
      ctx.fillStyle = '#caa860';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius * 1.4 * flick, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0a0a0c';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = theme.obstacleEdge;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = '#d8d4c8';
      ctx.font = '11px Verdana';
      ctx.textAlign = 'center';
      ctx.fillText('Cave', o.pos.x, o.pos.y + o.radius + 14);
    }

    // Conclave ritual sites: a pentagram inscribed in a circle. The stationary
    // cultists (actors) ring its five points and render on top. As the hidden
    // incubation counter climbs toward the Eldritch threshold, the point-runes
    // light a faint blood tint one by one — a subtle implication of progress, left
    // for the player to infer (the counter is a global world state, read live here).
    // Eldritch tentacle fields: a writhing green ground patch that ensnares.
    for (const o of byKind('tentacle_field')) {
      const t = performance.now() / 1000;
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = '#2a5a32';
      ctx.beginPath();
      ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#7fce6a';
      ctx.lineWidth = 2.5;
      for (let s = 0; s < 7; s++) {
        const ang = (s / 7) * Math.PI * 2 + Math.sin(t * 1.5 + s) * 0.4;
        const len = o.radius * (0.55 + 0.4 * Math.abs(Math.sin(t * 2 + s)));
        const ex = o.pos.x + Math.cos(ang) * len, ey = o.pos.y + Math.sin(ang) * len;
        const cx = o.pos.x + Math.cos(ang + 0.6) * len * 0.5, cy = o.pos.y + Math.sin(ang + 0.6) * len * 0.5;
        ctx.beginPath();
        ctx.moveTo(o.pos.x, o.pos.y);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Eldritch-mutated doodads: writhing tentacles grafted onto the silhouette (a
    // faint pulse marks one that also carries a SWING effect — an ambient hazard).
    for (const o of this.culledAll) {
      if (o.adorn !== 'tentacles') continue;
      const t = performance.now() / 1000;
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

    const pentas = byKind('ritual_pentagram');
    if (pentas.length) {
      const cf = world.sim.conclaveField;
      const counter = cf?.incubationCounter ?? 0;
      const threshold = Math.max(1, cf?.surge().eldritch.incubationThreshold ?? 6);
      // Point count is config-driven (and matches the cultist ring in world.ts) —
      // five points draw the classic pentagram; any other count draws a polygon ring.
      const n = Math.max(3, cf?.surge().ritual.cultistCount ?? 5);
      // The rite is UNDERWAY: the pentagram FILLS IN and its lines GLOW — visible in
      // the gaps the rim-standing cultists leave (the old per-point runes were covered
      // by the five cultists). A calm baseline reads as "active"; the fill + lines
      // intensify and bleed violet→blood as the hidden incubation counter climbs.
      const heat = clamp(counter / threshold, 0, 1);
      const glow = 0.35 + 0.65 * heat;                  // always-on baseline → full at threshold
      const pulse = 0.55 + 0.45 * Math.sin(t3 * 2.2);
      const rr = Math.round(168 + heat * 48), gg = Math.round(90 - heat * 58), bb = Math.round(216 - heat * 150);
      const line = `rgb(${rr},${gg},${bb})`;            // occult violet → blood red
      for (const o of pentas) {
        const R = o.radius;
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (o.rot ?? 0) + (i / n) * Math.PI * 2; // first point up
          pts.push({ x: o.pos.x + Math.cos(a) * R, y: o.pos.y + Math.sin(a) * R });
        }
        // INTERIOR FILL — a radial glow from the centre fading to the rim, so the
        // ritual reads as lit even with cultists ringing the points.
        const grad = ctx.createRadialGradient(o.pos.x, o.pos.y, R * 0.1, o.pos.x, o.pos.y, R);
        grad.addColorStop(0, `rgba(${rr},${gg},${bb},${(0.16 + 0.34 * heat) * pulse})`);
        grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R, 0, Math.PI * 2); ctx.fill();
        // The inscribed circle — glowing line.
        ctx.globalAlpha = 0.4 + 0.45 * glow;
        ctx.strokeStyle = line;
        ctx.lineWidth = 1.5 + 2.5 * glow;
        ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, R, 0, Math.PI * 2); ctx.stroke();
        // The star: classic 5-point pentagram (skip-one p0→p2→p4→p1→p3) at five
        // points, else a polygon ring — glowing + thickening with the rite's progress.
        ctx.globalAlpha = 0.5 + 0.5 * glow;
        ctx.lineWidth = 1.5 + 2 * glow;
        ctx.beginPath();
        const order = n === 5 ? [0, 2, 4, 1, 3] : pts.map((_, i) => i);
        for (let k = 0; k <= order.length; k++) {
          const p = pts[order[k % order.length]];
          if (k === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        // Faint point nodes (geometry only — no longer the tell; most sit under a cultist).
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#b89ad8';
        for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }

    // DOORS: a heavy timber bar spanning the doorway, drawn along the wall line
    // (perpendicular to the door's outward normal). Open = swung to the jamb;
    // broken = splintered stubs. State rides Doodad.door (host + replicated).
    for (const o of byKind('door')) {
      const d = o.door;
      const normal = o.dir ?? 0;
      const along = normal + Math.PI / 2;
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      ctx.rotate(along);
      const span = o.radius * 2;
      if (d?.broken) {
        // Splintered stubs at each jamb.
        ctx.fillStyle = '#4a3620';
        ctx.fillRect(-span / 2, -5, span * 0.18, 10);
        ctx.fillRect(span / 2 - span * 0.18, -5, span * 0.18, 10);
        ctx.strokeStyle = '#2c2013';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-span / 2, -5, span * 0.18, 10);
        ctx.strokeRect(span / 2 - span * 0.18, -5, span * 0.18, 10);
      } else if (d?.open) {
        // Swung inward against the jamb: a short bar angled off the frame.
        ctx.fillStyle = '#5a4426';
        ctx.save();
        ctx.translate(-span / 2, 0);
        ctx.rotate(0.9);
        ctx.fillRect(0, -4, span * 0.55, 8);
        ctx.restore();
        // The open frame edges.
        ctx.fillStyle = '#3a2c18';
        ctx.fillRect(-span / 2 - 3, -5, 5, 10);
        ctx.fillRect(span / 2 - 2, -5, 5, 10);
      } else {
        // Closed: the full bar + plank lines + iron band.
        ctx.fillStyle = '#5a4426';
        ctx.fillRect(-span / 2, -6, span, 12);
        ctx.strokeStyle = '#2c2013';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-span / 2, -6, span, 12);
        ctx.strokeStyle = '#3a2c18';
        ctx.lineWidth = 1;
        for (let x = -span / 2 + span / 5; x < span / 2; x += span / 5) {
          ctx.beginPath(); ctx.moveTo(x, -6); ctx.lineTo(x, 6); ctx.stroke();
        }
        ctx.strokeStyle = '#8a8f9a';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-span / 2 + 3, 0); ctx.lineTo(span / 2 - 3, 0); ctx.stroke();
      }
      ctx.restore();
    }

    // DOCK: a port's harbor planks — posts + boards jutting seaward, with a
    // lantern glow (the Sail-menu dwell point).
    for (const o of byKind('dock')) {
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      ctx.fillStyle = '#5a4426';
      ctx.fillRect(-o.radius, -o.radius * 0.5, o.radius * 2, o.radius);
      ctx.strokeStyle = '#2c2013';
      ctx.lineWidth = 1.5;
      for (let x = -o.radius + 8; x < o.radius; x += 10) {
        ctx.beginPath(); ctx.moveTo(x, -o.radius * 0.5); ctx.lineTo(x, o.radius * 0.5); ctx.stroke();
      }
      ctx.fillStyle = '#3a2c18';
      ctx.fillRect(-o.radius - 4, -6, 8, 12);
      ctx.fillRect(o.radius - 4, -6, 8, 12);
      const glow = 0.5 + 0.4 * Math.sin(world.time * 2.2);
      ctx.globalAlpha = 0.25 * glow;
      ctx.fillStyle = '#ffd898';
      ctx.beginPath(); ctx.arc(0, -o.radius * 0.9, 16, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffd898';
      ctx.beginPath(); ctx.arc(0, -o.radius * 0.9, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // The Sail prompt above the dock while the hero lingers near.
      const sp = world.sailPrompt();
      if (sp) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px Verdana';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(sp, o.pos.x, o.pos.y - o.radius - 20);
        ctx.fillStyle = '#9ad0e8';
        ctx.fillText(sp, o.pos.x, o.pos.y - o.radius - 20);
      }
    }

    // THE BREACH: a torn wound in the world — jagged red-black rift with a
    // molten pulse (dwell it to cross into the Underworld).
    for (const o of byKind('breach')) {
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 2.8);
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      ctx.fillStyle = '#0a0508';
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const rr = o.radius * (0.7 + 0.3 * Math.sin(i * 2.7));
        const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.7;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d84a2a';
      ctx.lineWidth = 2 + pulse * 2;
      ctx.globalAlpha = 0.5 + 0.4 * pulse;
      ctx.stroke();
      ctx.globalAlpha = 0.2 + 0.2 * pulse;
      ctx.fillStyle = '#d84a2a';
      ctx.beginPath(); ctx.arc(0, 0, o.radius * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = '9px Verdana';
      ctx.fillStyle = '#d88a6a';
      ctx.fillText('the Breach', 0, o.radius + 14);
      ctx.restore();
    }

    // WINDOWS: an arrow-slit frame — dark recess + pale sill lines. The region
    // underneath (window) already renders via drawWalkMask; this is the dressing.
    for (const o of byKind('window')) {
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      if (o.rot !== undefined) ctx.rotate(o.rot);
      ctx.fillStyle = '#11141c';
      ctx.fillRect(-o.radius * 0.7, -o.radius * 0.28, o.radius * 1.4, o.radius * 0.56);
      ctx.strokeStyle = '#6a7080';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-o.radius * 0.7, -o.radius * 0.28, o.radius * 1.4, o.radius * 0.56);
      ctx.restore();
    }

    // LANDMASS: the sailing mode's streamed coastline — big biome-tinted blobs
    // with a pale surf rim where they meet the water. Bridges read as sand.
    // Drawn as flat terrain (no shadow): from the boat this IS the far shore.
    for (const o of byKind('landmass')) {
      const bi = o.land ? BIOMES[o.land.biome] : undefined;
      const fill = o.land?.bridge ? '#b8a06a' : (bi?.mapColor ?? '#7a9a5a');
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      // surf rim (under the body, peeking out)
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#cfe8f2';
      ctx.beginPath(); ctx.arc(0, 0, o.radius * 1.06, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.arc(0, 0, o.radius, 0, Math.PI * 2); ctx.fill();
      // a darker heart so overlapping discs read as one landmass, not bubbles
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#1c2416';
      ctx.beginPath(); ctx.arc(0, 0, o.radius * 0.72, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // ISLE BEACON: a Voyage Island's guiding light — a pulsing pillar in the
    // def's tint with the island's NAME beneath (the sea's signage; adorn
    // carries the color, label the name).
    for (const o of byKind('isle_beacon')) {
      const pulse = 0.5 + 0.5 * Math.sin(world.time * 2.4 + o.pos.x * 0.01);
      const col = o.adorn ?? '#7fd0ff';
      ctx.save();
      ctx.translate(o.pos.x, o.pos.y);
      ctx.globalAlpha = 0.16 + 0.14 * pulse;
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, 46 + pulse * 10, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#2c2013';
      ctx.fillRect(-2.5, -34, 5, 34);
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(0, -38, 5 + pulse * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      if (o.label) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Verdana';
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.lineWidth = 3;
        ctx.strokeText(o.label, 0, 24);
        ctx.fillStyle = '#d8ecf4';
        ctx.fillText(o.label, 0, 24);
      }
      ctx.restore();
    }

    // GENERIC FALLBACK — any kind with no bespoke branch above (a package-
    // registered doodad rule, a structure-legend kind): a themed disc with a rim
    // + rot tick, so new DATA kinds are visible engine-wide before (or without)
    // ever earning a bespoke render. Warned once so authors know it's the stub.
    for (const [kind, list] of this.culled) {
      if (RENDERED_DOODAD_KINDS.has(kind)) continue;
      if (!warnedUnrenderedKinds.has(kind)) {
        warnedUnrenderedKinds.add(kind);
        console.warn(`[render] doodad kind '${kind}' has no bespoke branch — generic disc fallback`);
      }
      for (const o of list) {
        ctx.save();
        ctx.translate(o.pos.x, o.pos.y);
        if (o.rot !== undefined) ctx.rotate(o.rot);
        ctx.fillStyle = theme.obstacle;
        ctx.beginPath(); ctx.arc(0, 0, o.radius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = theme.obstacleEdge;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, o.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(o.radius * 0.8, 0); ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }
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
    const theme = world.zone.theme;
    const hero = world.player;
    const dt = this.frameDt;
    for (const o of this.culledAll) {
      const occ = doodadRuleOf(o.kind).occlude;
      if (!occ) continue;
      const near = dist(hero.pos, o.pos) < o.radius + hero.radius + (occ.pad ?? 10);
      const target = near ? (occ.alpha ?? 0.32) : 1;
      const cur = this.canopyFade.get(o) ?? 1;
      const fade = cur + (target - cur) * Math.min(1, dt * 10);
      this.canopyFade.set(o, fade);
      // Trees and thickets both wear the BRAMBLE MASS (the preferred organic
      // silhouette): thickets in their own deep bramble green, tree crowns in
      // the zone theme's canopy colour — biome identity stays in the tint.
      if (o.kind === 'tree') this.drawCanopyBramble(o, theme.tree ?? '#2c4424', 'rgba(0,0,0,0.4)', 'rgba(255,255,255,0.22)', fade);
      else if (o.kind === 'thicket') this.drawCanopyBramble(o, '#16401c', '#0a2410', '#2c5a26', fade);
      else if (o.kind === 'palm') this.drawCanopyTree(o, theme, fade);
      else if (o.kind === 'giant_mushroom' || o.kind === 'fruiting_tower') this.drawCanopyMushroom(o, world.time, fade);
      else this.drawCanopyGeneric(o, theme, fade);
    }
  }

  /** The BRAMBLE MASS silhouette — a dark tangled disc with radiating spines
   *  (grown from the old thicket ground draw, promoted to the canopy layer so
   *  it rides the proximity fade like every other crown). */
  private drawCanopyBramble(o: { pos: Vec2; radius: number; rot?: number }, fill: string, edge: string, spine: string, alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, o.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = spine;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * o.radius * 0.4, Math.sin(a) * o.radius * 0.4);
      ctx.lineTo(Math.cos(a) * o.radius * 1.05, Math.sin(a) * o.radius * 1.05);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Palm crowns (the trunk shadow stays in the ground pass). */
  private drawCanopyTree(o: { pos: Vec2; radius: number; rot?: number; kind: string }, theme: World['zone']['theme'], alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(o.pos.x, o.pos.y);
    if (o.rot !== undefined) ctx.rotate(o.rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#5a4326';
    ctx.fillRect(-o.radius * 0.1, -o.radius * 0.2, o.radius * 0.2, o.radius * 0.6);
    ctx.strokeStyle = theme.tree ?? '#2c7a3a';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      ctx.beginPath();
      ctx.moveTo(0, -o.radius * 0.15);
      ctx.quadraticCurveTo(
        Math.cos(a) * o.radius * 0.7, -o.radius * 0.4 + Math.sin(a) * o.radius * 0.5,
        Math.cos(a) * o.radius * 1.1, -o.radius * 0.2 + Math.sin(a) * o.radius * 0.8);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a6a2a';
    ctx.beginPath();
    ctx.arc(0, -o.radius * 0.2, o.radius * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Fungal crowns (giant mushroom / fruiting tower). */
  private drawCanopyMushroom(o: { pos: Vec2; radius: number; kind: string }, time: number, alpha: number): void {
    const { ctx } = this;
    const r = o.radius, tower = o.kind === 'fruiting_tower';
    const glow = 0.55 + 0.35 * Math.sin(time * 1.6 + o.pos.x * 0.04);
    ctx.save(); ctx.translate(o.pos.x, o.pos.y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#3a2a5a';
    ctx.beginPath(); ctx.ellipse(0, r * 0.3, r * 0.34, r * (tower ? 1.1 : 0.7), 0, 0, Math.PI * 2); ctx.fill();
    const caps = tower ? 3 : 1;
    for (let i = 0; i < caps; i++) {
      const cy = -r * (0.5 + i * 0.5), cr = r * (1 - i * 0.22);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#5a8a3a';
      ctx.beginPath(); ctx.ellipse(0, cy, cr, cr * 0.6, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = glow * alpha;
      ctx.fillStyle = '#8fd06f';
      ctx.beginPath(); ctx.ellipse(0, cy, cr * 0.7, cr * 0.42, 0, Math.PI, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** A data-registered canopy kind with no bespoke crown: a translucent disc. */
  private drawCanopyGeneric(o: { pos: Vec2; radius: number }, theme: World['zone']['theme'], alpha: number): void {
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = theme.tree ?? theme.obstacle;
    ctx.beginPath(); ctx.arc(o.pos.x, o.pos.y, o.radius, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
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

  /** Shrines: a pillar with a glowing orb — dark once drunk. */
  private drawShrines(world: World): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    for (const s of world.shrines) {
      const color = s.used ? '#4a4a52' : s.def.color;
      // Plinth
      ctx.fillStyle = '#2a2a32';
      ctx.strokeStyle = '#4a4a5a';
      ctx.lineWidth = 1.5;
      ctx.fillRect(s.pos.x - 10, s.pos.y - 6, 20, 16);
      ctx.strokeRect(s.pos.x - 10, s.pos.y - 6, 20, 16);
      // Orb
      if (!s.used) {
        ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(s.pos.x, s.pos.y - 14, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s.pos.x, s.pos.y - 14, 7, 0, Math.PI * 2);
      ctx.fill();
      // A dark shrine keeps its silhouette but loses its name.
      if (!s.used) {
        ctx.textAlign = 'center';
        ctx.font = '10px Verdana';
        ctx.fillStyle = color;
        ctx.fillText(s.def.name, s.pos.x, s.pos.y + 24);
      }
    }
  }

  /** Altars: a plinth and the standing field everyone inside answers to. */
  private drawAltars(world: World): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    for (const al of world.altars) {
      const { color, radius, name } = al.def;
      ctx.globalAlpha = 0.05 + 0.02 * Math.sin(t * 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(al.pos.x, al.pos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(al.pos.x, al.pos.y, radius, t * 0.15, t * 0.15 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // The altar block itself
      ctx.fillStyle = '#26262e';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillRect(al.pos.x - 13, al.pos.y - 10, 26, 20);
      ctx.strokeRect(al.pos.x - 13, al.pos.y - 10, 26, 20);
      ctx.fillStyle = color;
      ctx.fillRect(al.pos.x - 7, al.pos.y - 16, 14, 6);
      ctx.textAlign = 'center';
      ctx.font = 'bold 10px Verdana';
      ctx.fillStyle = color;
      ctx.fillText(name, al.pos.x, al.pos.y + 32);
    }
  }

  /** Zone portals: a pulsing ring with the destination written below. */
  /** The town campfire's "linger to refresh" prompt + a warm inviting ring while
   *  the player rests near it (the fire itself is a campfire doodad). */
  private drawCampfireHint(world: World): void {
    const h = world.campfireHint();
    if (!h) return;
    const { ctx } = this;
    const t = world.time;
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 3);
    ctx.strokeStyle = '#ff9a3a';
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
    ctx.fillStyle = '#ffc878';
    ctx.fillText(h.text, h.pos.x, h.pos.y - 36);
    ctx.restore();
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
        const armed = z.aftershock && z.exploded && z.linger > 0
          && world.time >= z.aftershock.readyAt;
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
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = armed ? '#ffd24a' : hot ? '#ff8a4a' : z.color;
          ctx.globalAlpha = armed ? 0.95 : 0.8;
          ctx.lineWidth = Math.max(3, z.radius * (armed ? 0.8 : 0.6));
        }
        ctx.stroke();
        // The molten heart: a thin bright core down the same jag.
        if (z.exploded) {
          ctx.globalAlpha = 0.9;
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#fff0c8';
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
    const t = f.life / f.maxLife;
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
    ctx.beginPath();
    if (f.arc) {
      ctx.moveTo(f.pos.x, f.pos.y);
      ctx.arc(f.pos.x, f.pos.y, f.radius, f.arc.facing - f.arc.arcRad / 2, f.arc.facing + f.arc.arcRad / 2);
      ctx.closePath();
    } else if (f.shape) {
      this.traceAoe(f.pos.x, f.pos.y, f.radius, f.shape, f.facing ?? 0);
    } else {
      ctx.arc(f.pos.x, f.pos.y, f.radius * (1.2 - 0.2 * t), 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Trace a regular n-gon of radius r, rotated by rot. */
  private polyPath(n: number, r: number, rot: number): void {
    const { ctx } = this;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
  }

  /** A worm's trailing body, drawn tail-first so the head sits on top. */
  private drawWormTail(a: Actor): void {
    const { ctx } = this;
    const w = a.worm!;
    let r = a.radius;
    for (let i = w.segments.length - 1; i >= 0; i--) {
      // (radius shrinks front-to-back; iterate display back-to-front)
      r = a.radius * Math.pow(w.taper, i + 1);
      const seg = w.segments[i];
      ctx.globalAlpha = 0.55 + 0.35 * (1 - (i + 1) / (w.segments.length + 1));
      ctx.fillStyle = a.hitFlash > 0 ? '#ffffff' : a.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
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
    // Airborne leapers swell along the arc.
    if (a.leap) {
      const t = 1 - a.leap.timer / a.leap.total;
      const s = 1 + 0.55 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
      ctx.scale(s, s);
    }
    if (a.untargetable) ctx.globalAlpha = 0.55;
    if (a.sheet.get('invisible') > 0) ctx.globalAlpha = 0.3;
    else if (a.sheet.get('detectability') < 1) ctx.globalAlpha = 0.55;
    // Echo riders: a ghost-faded copy of their owner with a dashed seam —
    // the lie stays legible (construct.kind ships on the co-op wire).
    if (a.construct?.kind === 'echo') {
      ctx.globalAlpha = 0.45;
      ctx.setLineDash([4, 3]);
    }
    ctx.fillStyle = a.hitFlash > 0 ? '#ffffff' : a.color;
    if (a.isMinion()) {
      ctx.strokeStyle = '#b06bd4';
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 1.5;
    }
    ctx.beginPath();
    switch (a.shape) {
      case 'circle':
        ctx.arc(0, 0, a.radius, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.moveTo(0, -a.radius); ctx.lineTo(a.radius, 0);
        ctx.lineTo(0, a.radius); ctx.lineTo(-a.radius, 0);
        ctx.closePath();
        break;
      case 'triangle':
        ctx.rotate(a.facing + Math.PI / 2);
        ctx.moveTo(0, -a.radius); ctx.lineTo(a.radius * 0.9, a.radius);
        ctx.lineTo(-a.radius * 0.9, a.radius);
        ctx.closePath();
        ctx.rotate(-(a.facing + Math.PI / 2));
        break;
      case 'square':
        ctx.rect(-a.radius * 0.85, -a.radius * 0.85, a.radius * 1.7, a.radius * 1.7);
        break;
      case 'pentagon':
        this.polyPath(5, a.radius, a.facing);
        break;
      case 'hexagon':
        this.polyPath(6, a.radius, a.facing);
        break;
      case 'octagon':
        this.polyPath(8, a.radius, a.facing + Math.PI / 8);
        break;
      case 'star': {
        const inner = a.radius * 0.45;
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? a.radius : inner;
          const ang = a.facing + (i / 10) * Math.PI * 2;
          if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
          else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
        }
        ctx.closePath();
        break;
      }
      case 'cross': {
        const arm = a.radius * 0.38;
        ctx.rotate(a.facing);
        ctx.rect(-a.radius, -arm, a.radius * 2, arm * 2);
        ctx.rect(-arm, -a.radius, arm * 2, a.radius * 2);
        ctx.rotate(-a.facing);
        break;
      }
      case 'trapezoid': {
        // broad shoulders facing forward, narrowing behind
        const r = a.radius;
        ctx.rotate(a.facing);
        ctx.moveTo(r * 0.7, -r * 0.95); ctx.lineTo(r * 0.7, r * 0.95);
        ctx.lineTo(-r * 0.8, r * 0.55); ctx.lineTo(-r * 0.8, -r * 0.55);
        ctx.closePath();
        ctx.rotate(-a.facing);
        break;
      }
      case 'rhombus': {
        // a lean diamond skewed along its heading
        const r = a.radius;
        ctx.rotate(a.facing);
        ctx.moveTo(r * 1.1, 0); ctx.lineTo(r * 0.15, r * 0.75);
        ctx.lineTo(-r * 1.1, 0); ctx.lineTo(-r * 0.15, -r * 0.75);
        ctx.closePath();
        ctx.rotate(-a.facing);
        break;
      }
      case 'oval':
        ctx.ellipse(0, 0, a.radius * 1.15, a.radius * 0.75, a.facing, 0, Math.PI * 2);
        break;
      case 'kite': {
        // long nose forward, short tail back — built to point somewhere
        const r = a.radius;
        ctx.rotate(a.facing);
        ctx.moveTo(r * 1.2, 0); ctx.lineTo(-r * 0.15, r * 0.8);
        ctx.lineTo(-r * 0.7, 0); ctx.lineTo(-r * 0.15, -r * 0.8);
        ctx.closePath();
        ctx.rotate(-a.facing);
        break;
      }
      case 'rectangle':
        ctx.rotate(a.facing);
        ctx.rect(-a.radius * 1.05, -a.radius * 0.65, a.radius * 2.1, a.radius * 1.3);
        ctx.rotate(-a.facing);
        break;
      case 'ribcage':
        ctx.arc(0, 0, a.radius, 0, Math.PI * 2); // body disc; rib spokes overlaid after fill
        break;
    }
    ctx.fill();
    ctx.stroke();

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

    // Skeleton ribcage: a top-down spine + tapering rib spokes over the body
    // disc, no facing rotation so it reads as bone from any direction.
    if (a.shape === 'ribcage') {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.5;
      const r = a.radius;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.85); ctx.lineTo(0, r * 0.85);          // spine
      for (let i = -2; i <= 2; i++) {
        const yy = (i / 2.4) * r * 0.8;
        const half = Math.cos((yy / (r * 0.9)) * (Math.PI / 2)) * r * 0.78; // ribs shorten at the ends
        ctx.moveTo(-half, yy); ctx.lineTo(0, yy - r * 0.12);
        ctx.moveTo(half, yy); ctx.lineTo(0, yy - r * 0.12);
      }
      ctx.stroke();
    }

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

    // Adorns: silhouette add-ons that mark a kind at a glance.
    if (a.adorn) {
      ctx.fillStyle = a.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1.2;
      if (a.adorn === 'ears') {
        // two perky triangles at the sides (goblinoids, gnolls)
        for (const side of [-1, 1]) {
          const ang = a.facing + side * 1.9;
          const bx = Math.cos(ang) * a.radius * 0.85;
          const by = Math.sin(ang) * a.radius * 0.85;
          const tx = Math.cos(ang) * a.radius * 1.75;
          const ty = Math.sin(ang) * a.radius * 1.75;
          const px = Math.cos(ang + Math.PI / 2) * a.radius * 0.3;
          const py = Math.sin(ang + Math.PI / 2) * a.radius * 0.3;
          ctx.beginPath();
          ctx.moveTo(bx - px, by - py); ctx.lineTo(tx, ty); ctx.lineTo(bx + px, by + py);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
        }
      } else if (a.adorn === 'horns') {
        if (a.faction === 'demon') {
          // demon horns: a pair of small circle nubs at the brow
          ctx.fillStyle = a.color; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.2;
          for (const side of [-1, 1]) {
            const ang = a.facing + side * 0.7;
            ctx.beginPath();
            ctx.arc(Math.cos(ang) * a.radius * 1.05, Math.sin(ang) * a.radius * 1.05, a.radius * 0.3, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
          }
        } else {
          // forward-swept horns (orcs and worse)
          for (const side of [-1, 1]) {
            const ang = a.facing + side * 0.9;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ang) * a.radius * 0.7, Math.sin(ang) * a.radius * 0.7);
            ctx.quadraticCurveTo(
              Math.cos(ang) * a.radius * 1.5, Math.sin(ang) * a.radius * 1.5,
              Math.cos(ang - side * 0.5) * a.radius * 1.7, Math.sin(ang - side * 0.5) * a.radius * 1.7);
            ctx.lineWidth = 3;
            ctx.strokeStyle = a.color;
            ctx.stroke();
          }
        }
      } else if (a.adorn === 'spikes') {
        // a ring of nubs (trolls, briar things)
        for (let s = 0; s < 6; s++) {
          const ang = a.facing + (s / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * a.radius * 1.05, Math.sin(ang) * a.radius * 1.05, a.radius * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (a.adorn === 'wings') {
        // branching membrane triangles swept to the BACK (demons, winged things)
        const back = a.facing + Math.PI;
        ctx.fillStyle = a.color; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1.2;
        for (const side of [-1, 1]) {
          const base = back + side * 0.45;
          const bx = Math.cos(base) * a.radius * 0.5, by = Math.sin(base) * a.radius * 0.5;
          for (const [spread, len] of [[0.95, 1.7], [0.55, 2.1], [0.2, 1.6]] as const) {
            const ang = back + side * spread;
            const tx = Math.cos(ang) * a.radius * len, ty = Math.sin(ang) * a.radius * len;
            const mx = Math.cos(ang - side * 0.25) * a.radius * (len * 0.6);
            const my = Math.sin(ang - side * 0.25) * a.radius * (len * 0.6);
            ctx.beginPath();
            ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.lineTo(mx, my);
            ctx.closePath(); ctx.fill(); ctx.stroke();
          }
        }
      } else if (a.adorn === 'tentacles') {
        // ELDRITCH corruption: writhing tentacles curling out around the body.
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
    }
    ctx.restore();

    // Health bar (enemies + minions; the player has the orb)
    if (a !== world.player) {
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

    // Townsfolk wear their names.
    if (a.team === 'player' && a.defId?.startsWith('townsfolk')) {
      ctx.textAlign = 'center';
      ctx.font = '10px Verdana';
      ctx.fillStyle = '#e8c87a';
      ctx.fillText(a.name, x, y - a.radius - 8);
    }

    // Mireille "talks" when her healing isn't unlocked — no free innstay yet.
    if (a.defId === 'townsfolk_innkeep'
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

    // The quartermaster posts his offer above his head while you're near.
    if (a.defId === 'townsfolk_questgiver') {
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

    if (a.defId === 'townsfolk_caravanner') {
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

  /** Gems on the ground: bobbing diamonds — skill gems wear a rarity ring. */
  private drawDrops(world: World): void {
    const { ctx } = this;
    for (const d of world.drops) {
      const y = d.pos.y + Math.sin(d.bob) * 3;
      const item = d.item;
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

  /** Sacrificial Fonts: a dark basin under a violet flame. */
  private drawFonts(world: World): void {
    const { ctx } = this;
    const t = performance.now() / 1000;
    for (const f of world.fonts) {
      ctx.fillStyle = '#1c1822';
      ctx.strokeStyle = '#54406a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.pos.x, f.pos.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const lick = 4 + Math.sin(t * 5) * 2;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#b06bd4';
      ctx.beginPath();
      ctx.ellipse(f.pos.x, f.pos.y - 8, 5, lick + 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = '10px Verdana';
      ctx.fillStyle = '#b06bd4';
      ctx.fillText('Sacrificial Font', f.pos.x, f.pos.y + 32);
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
      }
      ctx.restore();
      // Tail
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(p.pos.x - Math.cos(p.dir) * p.radius * 1.6,
        p.pos.y - Math.sin(p.dir) * p.radius * 1.6, p.radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
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
    const slot = 54, gap = 6;
    const totalW = p.skills.length * slot + (p.skills.length - 1) * gap;
    const bx = w / 2 - totalW / 2, by = h - 78;

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

    // XP bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by + slot + 18, totalW, 5);
    ctx.fillStyle = '#b8a0e0';
    ctx.fillRect(bx, by + slot + 18, totalW * clamp(m.xp / m.xpNeeded, 0, 1), 5);

    // Top-left status block
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px Verdana';
    ctx.fillStyle = '#c8a84b';
    ctx.fillText(`${m.classDef.name}  —  Level ${p.level}`, 16, 26);
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
    ctx.fillStyle = '#d8d4c8';
    ctx.fillText(`Kills ${world.kills}`, 16, 100);
    let hintY = 120;
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
    // orb's own caption (at orbY - orbR - 18) and grow upward.
    let dy = 0;
    for (const def of Object.values(SURVIVAL_RESOURCES)) {
      const cur = p.survival.get(def.id);
      if (cur === undefined || cur >= def.max) continue; // full / inactive → hidden
      const frac = clamp(cur / def.max, 0, 1);
      const bw = orbR * 1.4, bh = 8, x = cx - bw / 2, y = orbY - orbR - 34 - dy;
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
    // above the ES/absorb arcs (which reach orbR + 11).
    ctx.font = '10px Verdana';
    ctx.fillStyle = '#8a8678';
    ctx.fillText(label, x, y - r - 18);
  }
}

function initials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').slice(0, 3).toUpperCase();
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
