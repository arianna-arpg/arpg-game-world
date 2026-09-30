// THE SKILL-CLIP CAPTURE: boots the built game in Electron, stages each skill
// against training dummies on a bare runtime stage, casts it through the real
// frame (scripted input into the local seat), reads the canvas pixels and
// encodes a looping clip per skill for the site's database drawer and theater.
//
//   npm run build   (or pass --root to any built game directory)
//   npx electron scripts/capture-skill-clips.cjs -- --skills glass_lance,frost_nova
//     --skills a,b        these skills (catalog ids)
//     --all               every player skill (monster-only kits excluded)
//     --delivery x,y      filter by delivery type (projectile, nova, melee...)
//     --from <id>         resume a sweep at this skill (catalog order)
//     --limit N           stop after N skills
//     --skip-existing     keep clips already listed in the index
//     --root dist         the built game to boot
//     --out site/media/clips
//     --seconds 6 --fps 30 --level 10
//     --floor slate       the stage's ground (a look in STAGES)
//     --sheets <dir>      also write a contact sheet per clip (QA)
//     --list              print the catalog by delivery and cast mode, then exit
//     --show              show the capture window on screen
//
// Output: <out>/<id>.av1.mp4, <id>.h264.mp4, <id>.webp poster and
// <out>/index.json, the list the database page reads. The folder is
// gitignored; `node scripts/publish-site-media.mjs --pack clips` ships it as
// one archive on the `site-media` release. Each run also writes
// balance/reports/skill-clips.json (casts, damage, activity) for review.
// Saves go to a temp folder and the window uses a throwaway partition:
// nothing touches saves/.
//
// Contract: docs/design/site-cinema.md (Skill clips)
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startGameServer } = require('../launcher/server.cjs');

const REPO = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const flag = (k) => argv.includes('--' + k);

/** Every dial the capture reads, in one place. */
const CFG = {
  root: path.resolve(REPO, opt('root', 'dist')),
  out: path.resolve(REPO, opt('out', path.join('site', 'media', 'clips'))),
  report: path.join(REPO, 'balance', 'reports', 'skill-clips.json'),
  sheets: opt('sheets') ? path.resolve(REPO, opt('sheets')) : null,
  seconds: Number(opt('seconds', '6')),
  fps: Number(opt('fps', '30')),
  level: Number(opt('level', '10')),
  /** The render: a 1080p canvas, encoded down to 720p (supersampled edges). */
  render: { w: 1920, h: 1080 },
  encode: { h: 720, posterW: 640 },
  /** Idle lead-in and the let-go tail, seconds; the act fills the rest. */
  lead: 0.45,
  tail: 1.4,
  /** A soft blink across the loop seam. */
  fade: { in: 0.25, out: 0.4 },
  /** Cooldowns longer than this are cut to it, so a clip shows the skill more than once. */
  cooldownCap: 1.0,
  /** Visible stage width in world units. The Database drawer shows a clip
   *  about 500 px wide, so the frame fits the scene tightly; wide areas
   *  widen it up to maxSpan. */
  minSpan: 480,
  /** Close work (melee, cones) frames closer still. */
  minSpanClose: 400,
  maxSpan: 1250,
  floor: opt('floor', 'slate'),
  /** The body a corpse-fed skill finds waiting before each dummy. */
  corpse: 'zombie',
  seed: 20260930,
};

/** Stage grounds (a ZoneTheme each). A cool slate reads every element's
 *  color and the dummies' warm wood. */
const STAGES = {
  slate: {
    floor: '#1d2129', grid: '#171a20', border: '#262b33', obstacle: '#2c313a', obstacleEdge: '#363c46', accent: '#8fa8d8',
    ground: { palette: ['#16191f', '#1b1f26', '#20252d', '#262b34', '#2c323c'], bias: 0.5, alpha: 0.3, scale: 1.6, speckles: 0.5 },
  },
};

/** Skills that need more than dummies to show themselves.
 *  foe:   the primary dummy becomes this monster (its own brain and kit),
 *         bled to lifeFrac so a claim or an execute can land;
 *  prep:  another skill cast first, `presses` times, the main press `then`
 *         seconds after the last one (mines to detonate, a bolt to snap);
 *  hold:  seconds each press is held (claims, long channels). */
const SETUPS = {
  tame_beast: { foe: { id: 'dire_wolf', lifeFrac: 0.4 }, hold: 3.0 },
  detonate_mines: { prep: { skill: 'fire_mine', presses: 3, then: 0.5 } },
  cold_snap: { prep: { skill: 'frostbolt', presses: 1, then: 0.15 } },
};

// ---------------------------------------------------------------------------
// Page side. These functions are serialized into the game page, so they keep
// to their own scope (no closures over this file).

/** Wait for the boot, pin the clocks, start a run and build the stage. */
async function pageBoot(spec) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let i = 0; i < 200 && !(window.__game && window.__game.hydrated); i++) await wait(50);
  const G = window.__game;
  if (!G) throw new Error('no __game debug surface');
  await G.hydrated();
  // Stop the rAF pump: every frame from here on is driven by __game.step().
  window.requestAnimationFrame = () => 0;
  await wait(60);
  // Seeded randomness and a pinned clock: the same skill films the same clip.
  let s = spec.seed >>> 0;
  Math.random = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  let vt = 100000;
  performance.now = () => vt;
  window.__clipClock = (ms) => { vt += ms; };
  const dtMs = 1000 / spec.fps;

  const acct = G.account();
  acct.ledger.prologue_lived = 1;
  const st = G.settings();
  st.renderScale = 1;
  if (st.floatKinds) for (const k of Object.keys(st.floatKinds)) st.floatKinds[k] = false;
  st.speechTyping = false;
  G.devStartRun(spec.classId);
  G.ui.hideAll?.();
  G.step(8, dtMs);

  const w = G.world(), p = w.player;
  w.devIgnoreSkillAttributes = true;
  w.zoneMap.clip_stage = Object.assign({
    id: 'clip_stage', name: 'The Stage', level: spec.level, size: { w: 2400, h: 1600 }, seed: 31337,
    layout: [], objective: { kind: 'safe' }, exits: [], map: { x: 9100, y: 9100 },
  }, spec.stage);
  w.loadZone('clip_stage');
  G.step(4, dtMs);

  // A bare stage: no props, no weather, the day's brightest hour.
  w.actors = [p]; w.projectiles = []; w.flashes = []; w.texts = []; w.zones = []; w.doodads = [];
  w.walk = null;
  w.markDoodadsChanged();
  if (w.sim && w.sim.weather) { w.sim.weather.spawnScale = 0; if (w.sim.weather.fronts) w.sim.weather.fronts.length = 0; }
  if (typeof w.time === 'number') w.time = spec.noon;

  // Only the clip's skills on the bar: the prep (if any) and the skill.
  for (let i = 0; i < p.skills.length; i++) p.skills[i] = null;
  const slot = G.devGrantSkill(spec.skill, spec.level, 2);
  if (slot < 0) throw new Error('grant refused: ' + spec.skill);
  const inst = p.skills[slot];
  let prepSlot = -1;
  if (spec.plan.prep) {
    prepSlot = G.devGrantSkill(spec.plan.prep.skill, spec.level, 1);
    if (prepSlot < 0) throw new Error('prep grant refused: ' + spec.plan.prep.skill);
  }
  const prepInst = prepSlot >= 0 ? p.skills[prepSlot] : null;
  p.sheet.setSource('clip', [
    { stat: 'accuracy', kind: 'flat', value: 100000 },
    { stat: 'mana', kind: 'flat', value: 100000 }, { stat: 'manaRegen', kind: 'flat', value: 10000 },
    { stat: 'life', kind: 'flat', value: 100000 }, { stat: 'lifeRegen', kind: 'flat', value: 10000 },
  ]);
  p.fillResources();

  // Stage geometry, relative to the hero at the origin (all world units).
  const O = { x: 1200, y: 800 };
  const at = (v) => ({ x: O.x + v.x, y: O.y + v.y });
  p.pos = at(spec.hero);
  p.facing = 0;
  const foes = spec.foes.map((f) => {
    const m = w.createMonster(f.id, spec.level, 'enemy');
    if (f.dummy) {
      // A PASSIVE body is scenery to every AI, homing shot and shove; the
      // stage wants a target. No skills, no brain, no feet: it still stands.
      m.skills = []; m.brain = undefined; m.passive = false;
      m.sheet.setSource('clip', [{ stat: 'lifeRegen', kind: 'override', value: 0 }]);
    }
    m.pos = at(f);
    m.tier = p.tier; m.spawnedAt = -1;
    m.fillResources();
    if (f.lifeFrac) m.life = m.maxLife() * f.lifeFrac;
    m.clipDummy = !!f.dummy;
    w.actors.push(m);
    return m;
  });
  const primary = foes[0];
  const focus = at(spec.focus);
  w.frameLockFocus = () => focus;

  // No HUD: the world alone (cast bars ride the body and stay).
  const R = G.renderer;
  R.baseZoom = spec.zoom;
  for (const k of spec.hudDraws) if (typeof R[k] === 'function') R[k] = function () {};
  const game = document.getElementById('game');
  for (const el of document.body.querySelectorAll('body > *')) if (!el.contains(game)) el.style.setProperty('display', 'none', 'important');
  const ctx = game.getContext('2d');

  // THE DIRECTOR: the scripted hand on the local seat.
  const plan = spec.plan;
  const clip = {
    t: 0, casts: 0, presses: 0, lastPress: -9, pressUntil: -1, flip: false, errors: [],
    dealt: 0, pressAim: null, phase: 'prep', prepDone: 0, prepGone: -1,
  };
  const home = { x: p.pos.x, y: p.pos.y };
  const cluster = at(plan.cluster);
  const aimOf = () => plan.aimMode === 'foe' && primary && !primary.dead ? { x: primary.pos.x, y: primary.pos.y }
    : plan.aimMode === 'cluster' ? cluster : at(plan.aim);
  const idle = () => !p.casting && p.useLock <= 0;
  const nSlots = p.skills.length;
  G.devInput(() => {
    const held = new Array(nSlots).fill(false), edge = new Array(nSlots).fill(false);
    const t = clip.t;
    let aim = clip.pressAim || aimOf();
    if (plan.aimMode === 'foe') aim = aimOf();
    const acting = t >= plan.start && t < plan.stop;
    const press = (k, a) => { held[k] = true; edge[k] = true; clip.pressAim = a; aim = a; };
    if (acting && plan.prep) {
      // prep × presses → `then` after the last one leaves the hand → the
      // skill → wait for the body → again
      if (clip.phase === 'prep' && idle() && clip.prepDone < plan.prep.presses) {
        press(prepSlot, plan.prep.aimMode === 'cluster' ? cluster : aimOf());
        clip.prepDone++; clip.lastPress = t; clip.prepGone = -1;
      } else if (clip.phase === 'prep' && clip.prepDone >= plan.prep.presses) {
        if (clip.prepGone < 0 && idle()) clip.prepGone = t;
        if (clip.prepGone >= 0 && t - clip.prepGone >= plan.prep.then) clip.phase = 'main';
      }
      if (clip.phase === 'main' && idle()) {
        press(slot, aimOf()); clip.presses++; clip.lastPress = t; clip.phase = 'wait';
      } else if (clip.phase === 'wait' && idle() && t - clip.lastPress >= plan.everySec) {
        clip.phase = 'prep'; clip.prepDone = 0;
      }
    } else if (acting) {
      if (plan.kind === 'hold') {
        held[slot] = true;
        if (clip.presses === 0) { edge[slot] = true; clip.presses++; }
        if (plan.mash && p.casting && Math.round(t * spec.fps) % 4 === 0) edge[slot] = true;
      } else if (plan.kind === 'toggle') {
        if (clip.presses === 0) { held[slot] = true; edge[slot] = true; clip.presses++; }
      } else {
        // pulse / travel: press, hold for holdSec, let go, wait for the body.
        // A charge holds on until the bar is full (never past maxHold).
        const ready = t - clip.lastPress >= plan.everySec && idle();
        const charging = p.casting && p.casting.inst === inst && p.casting.mode === 'charge'
          && p.casting.elapsed < p.casting.total && t - clip.lastPress < plan.maxHold;
        if (t < clip.pressUntil || charging) held[slot] = true;
        else if (ready) {
          press(slot, plan.kind === 'travel' && clip.flip ? { x: home.x, y: home.y } : aimOf());
          clip.lastPress = t; clip.pressUntil = t + plan.holdSec; clip.presses++;
          if (plan.kind === 'travel') clip.flip = !clip.flip;
        }
      }
    }
    // The timing arts: press inside the golden end (perfect) or on the
    // indicator (timed), the way a practiced hand plays them.
    const cs = p.casting;
    if (cs && cs.inst === inst && !cs.pressUsed && cs.total > 0) {
      const frac = cs.elapsed / cs.total;
      if (cs.mode === 'perfect' && frac >= 0.78) edge[slot] = true;
      if (cs.mode === 'timed' && cs.indicatorAt !== undefined && frac >= cs.indicatorAt - 0.05) edge[slot] = true;
    }
    return { dx: 0, dy: 0, aim, held, edge };
  });
  // Count the casts that truly landed at the one artery.
  const useSkill = w.useSkill.bind(w);
  w.useSkill = (caster, i, a, pressed) => { const ok = useSkill(caster, i, a, pressed); if (ok && caster === p && i === inst) clip.casts++; return ok; };
  // Keep the dummies whole BEFORE each render (no life bars flicker), keep a
  // required status on them, and walk a shoved dummy slowly back to its post.
  const dummies = foes.filter((m) => m.clipDummy);
  // Corpse-fed skills find a body lying before each dummy, laid again
  // whenever one is spent.
  const graves = spec.corpse ? dummies.map((m) => ({ x: m.pos.x - 34, y: m.pos.y })) : [];
  const lay = () => {
    for (const g of graves) {
      if (w.corpses.some((c) => Math.hypot(c.pos.x - g.x, c.pos.y - g.y) < 12)) continue;
      const body = w.createMonster(spec.corpse, spec.level, 'enemy');
      w.corpses.push({ pos: { x: g.x, y: g.y }, defId: spec.corpse, level: spec.level, maxLife: body.maxLife(), remaining: 60, tier: p.tier });
    }
  };
  lay();
  let layAt = 0;
  const posts = dummies.map((m) => ({ x: m.pos.x, y: m.pos.y, last: { x: m.pos.x, y: m.pos.y } }));
  const update = w.update.bind(w);
  w.update = (dt) => {
    update(dt);
    if (graves.length && (layAt += dt) >= 0.6) { layAt = 0; lay(); }
    dummies.forEach((m, k) => {
      if (m.dead) return;
      const max = m.maxLife();
      if (m.life < max) { clip.dealt += max - m.life; m.life = max; }
      if (spec.keepStatus && !m.statuses.some((x) => x.id === spec.keepStatus)) {
        try { m.applyStatus(spec.keepStatus, 0, 3, 'The Stage'); } catch (e) { /* a status the body refuses */ }
      }
      const post = posts[k], moved = Math.hypot(m.pos.x - post.last.x, m.pos.y - post.last.y);
      const off = Math.hypot(m.pos.x - post.x, m.pos.y - post.y);
      if (moved < 0.5 && off > 2) {
        const step = Math.min(off, 70 * dt) / off;
        m.pos.x += (post.x - m.pos.x) * step; m.pos.y += (post.y - m.pos.y) * step;
      }
      post.last.x = m.pos.x; post.last.y = m.pos.y;
    });
  };

  window.__clip = { G, w, p, inst, prepInst, slot, foes, dummies, clip, ctx, game, spec, focus };
  // Settle the camera on the stage before the first recorded frame.
  G.step(20, dtMs);
  window.__clipClock(20 * dtMs);
  return {
    skill: inst.def.id, name: inst.def.name, delivery: inst.def.delivery.type, castMode: inst.def.castMode || 'cast',
    canvas: [game.width, game.height], slot, cls: spec.classId,
  };
}

/** One recorded frame: advance the world, hand the pixels over. */
async function pageFrame() {
  const c = window.__clip;
  const { G, p, clip, spec } = c;
  const dt = 1000 / spec.fps;
  // Long cooldowns are cut so the clip shows the skill more than once.
  for (const i of [c.inst, c.prepInst]) {
    if (!i) continue;
    const cd = p.cooldowns.get(i.def.id);
    if (cd !== undefined && cd > spec.cooldownCap) p.cooldowns.set(i.def.id, spec.cooldownCap);
  }
  try { G.step(1, dt); } catch (e) { clip.errors.push(String(e && e.message || e).slice(0, 200)); }
  window.__clipClock(dt);
  clip.t += dt / 1000;
  const img = c.ctx.getImageData(0, 0, c.game.width, c.game.height);
  await window.clipBridge.frame(img.data);
  return clip.errors.length;
}

/** What the clip did, for the log and the report. */
function pageReport() {
  const { w, p, inst, clip, foes } = window.__clip;
  let why = null;
  if (!clip.casts) {
    try { why = w.castReqRefusal(p, inst) || (w.skillUsable(p, inst) ? null : 'unusable') || (p.unmetGate(inst) ? 'gate' : null) || 'no cast'; }
    catch (e) { why = 'probe failed: ' + e.message; }
  }
  return {
    presses: clip.presses, casts: clip.casts, dealt: Math.round(clip.dealt), why, errors: clip.errors.slice(0, 3),
    statuses: foes.reduce((n, d) => n + (d.statuses ? d.statuses.length : 0), 0),
    actors: w.actors.length,
  };
}

// ---------------------------------------------------------------------------
// Staging: where the hero stands, where the dummies stand, how the hand plays.

/** Renderer draws that paint the HUD (the stage films the world alone). */
const HUD_DRAWS = ['drawHud', 'drawHudCluster', 'drawHudStatus', 'drawHudTail', 'drawNoticeFeed', 'drawPickupFeed',
  'drawEncounterHud', 'drawFractureHud', 'drawSceneHud', 'drawSceneHeroHud', 'drawParty', 'drawAttentionPointers',
  'drawDarknessHud', 'drawTimeflow', 'drawEyecatch', 'drawPadReticle', 'drawEliteNameHover', 'drawLabels', 'drawTexts',
  'drawDwellTells', 'drawCampfireHint', 'drawMovementMarkers', 'drawGrabMeter', 'drawSurvival', 'drawLowLifeGlow',
  'drawSurvivalVignette'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DUMMY = 'target_dummy';

/** Build the page spec's staging for one skill from its catalog row. */
function stageFor(row) {
  const d = row.delivery || {};
  const setup = SETUPS[row.id] || {};
  const reach = row.aiRange || 0;
  const type = d.type;
  const hero = { x: 0, y: 0 };
  /** Circles the frame must hold beyond the bodies: an area, a swing. */
  const areas = [];
  let foes, aim, aimMode = 'foe';
  let kind = 'hold', everySec = 0.1, holdSec = 0.1, mash = false;
  const trio = (cx, spread) => [{ x: cx, y: 0 }, { x: cx + spread * 0.35, y: -spread }, { x: cx + spread * 0.35, y: spread }];
  const ring = (r, n = 5) => Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i + 0.5) * (Math.PI * 2 / n);
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
  const aroundHero = type === 'nova' || type === 'aura' || type === 'self'
    || (type === 'ground' && (d.castRange === 0 || d.follow));

  if (type === 'melee' || type === 'cone') {
    const r = clamp((d.range || d.length || reach || 60) * 0.8, 38, 150);
    foes = trio(r + 12, 44);
    areas.push({ x: 0, y: 0, r: (d.range || d.length || 60) + 20 });
  } else if (aroundHero) {
    const rad = (d.radius || reach || 120) + (d.grow || 0);
    foes = ring(clamp(rad * 0.62, 56, 200));
    areas.push({ x: 0, y: 0, r: Math.min(rad, 520) });
    aimMode = 'point';
    if (type === 'aura' && d.mode === 'toggle') kind = 'toggle';
  } else if (type === 'dash' || type === 'leap' || type === 'blink' || type === 'carom') {
    const dist = clamp(d.distance || d.range || reach || 240, 140, 300);
    foes = trio(dist * 0.72, 56);
    aimMode = 'point';
    aim = { x: dist, y: 0 };
    kind = 'travel'; everySec = 1.1; holdSec = 0.06;
  } else if (type === 'summon') {
    const dist = clamp(reach || 200, 150, 240);
    foes = trio(dist, 56);
    aimMode = 'point';
    aim = { x: dist * 0.55, y: 0 };
  } else if (type === 'construct') {
    const dist = clamp(reach || 220, 160, 260);
    foes = trio(dist, 60);
    // A trap or a mine waits under the dummies (they never walk into one);
    // a totem or a sentry stands between.
    const lies = d.kind === 'trap' || d.kind === 'mine';
    aimMode = lies ? 'cluster' : 'point';
    aim = { x: dist * 0.55, y: 0 };
    areas.push({ x: lies ? dist : dist * 0.55, y: 0, r: (d.range || 80) });
  } else {
    // projectile, ground, storm, target, mark, detonate…: a firing line
    const dist = clamp((reach || d.range || 300) * 0.5, 170, 300);
    foes = trio(dist, 54);
    if (type === 'ground' || type === 'storm') {
      aimMode = 'cluster';
      areas.push({ x: dist, y: 0, r: Math.min((d.radius || 90) + (d.grow || 0), 420) });
    }
  }
  foes = foes.map((f) => ({ ...f, id: DUMMY, dummy: true }));
  if (setup.foe) foes[0] = { ...foes[0], id: setup.foe.id, dummy: false, lifeFrac: setup.foe.lifeFrac };
  const cluster = { x: foes.reduce((a, f) => a + f.x, 0) / foes.length, y: foes.reduce((a, f) => a + f.y, 0) / foes.length };
  if (!aim) aim = { x: foes[0].x, y: foes[0].y };

  const mode = row.castMode || 'cast';
  if (row.concentration || mode === 'concentration' || mode === 'channel' || mode === 'overcharge' || mode === 'guard') {
    kind = 'pulse'; everySec = 2.6; holdSec = 2.0;
  } else if (mode === 'charge') {
    kind = 'pulse'; everySec = 0.9; holdSec = 0.25; // held on until the bar is full
  } else if (mode === 'multitude') {
    mash = true;
  }
  if (setup.hold) { kind = 'pulse'; holdSec = setup.hold; everySec = setup.hold + 0.6; }
  let prep = null;
  if (setup.prep) {
    prep = { skill: setup.prep.skill, presses: setup.prep.presses || 1, then: setup.prep.then ?? 0.3, aimMode: 'cluster' };
    everySec = Math.max(everySec, 0.8);
  }

  // Fit the frame: the hero, the foes, the aim and every area, with a margin.
  const pts = [hero, ...foes, aim];
  let minX = Math.min(...pts.map((v) => v.x)), maxX = Math.max(...pts.map((v) => v.x));
  let minY = Math.min(...pts.map((v) => v.y)), maxY = Math.max(...pts.map((v) => v.y));
  for (const a of areas) {
    minX = Math.min(minX, a.x - a.r); maxX = Math.max(maxX, a.x + a.r);
    minY = Math.min(minY, a.y - a.r); maxY = Math.max(maxY, a.y + a.r);
  }
  const spanX = (maxX - minX) + 150, spanY = (maxY - minY) + 130;
  const close = type === 'melee' || type === 'cone';
  const span = clamp(Math.max(spanX, spanY * 16 / 9), close ? CFG.minSpanClose : CFG.minSpan, CFG.maxSpan);
  const focus = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  const act = CFG.seconds - CFG.lead - CFG.tail;
  const req = row.targeting && row.targeting.requiresStatus;
  const corpseFed = !!(row.targeting && row.targeting.target === 'corpse');
  return {
    hero, foes, focus, zoom: CFG.render.w / span,
    keepStatus: Array.isArray(req) ? req[0] : req || null,
    corpse: corpseFed ? CFG.corpse : null,
    plan: { kind, aim, aimMode, cluster, start: CFG.lead, stop: CFG.lead + act, everySec, holdSec, mash, maxHold: 3, prep },
  };
}

/** Which body films the skill: the class whose kit carries it, else by tags. */
function classFor(row, classes) {
  const owner = classes.find((c) => c.bar.includes(row.id));
  if (owner) return owner.id;
  const tags = row.tags || [];
  const has = (id) => classes.some((c) => c.id === id);
  if ((tags.includes('minion') || tags.includes('summon')) && has('necromancer')) return 'necromancer';
  if (tags.includes('spell') && has('sorcerer')) return 'sorcerer';
  if ((tags.includes('bow') || (tags.includes('projectile') && tags.includes('attack'))) && has('ranger')) return 'ranger';
  return has('warrior') ? 'warrior' : classes[0].id;
}

// ---------------------------------------------------------------------------
// Encoding: one ffmpeg per clip reads raw RGBA on stdin and writes both files.

function encoderFor(id, w, h) {
  const TAG = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv'];
  const H = CFG.encode.h;
  const fadeOutAt = Math.max(0, CFG.seconds - CFG.fade.out);
  const fx = `fade=t=in:st=0:d=${CFG.fade.in},fade=t=out:st=${fadeOutAt}:d=${CFG.fade.out}`;
  const scale = (fmt) => `scale=-2:${H}:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=${fmt}`;
  const av1 = path.join(CFG.out, `${id}.av1.mp4`), h264 = path.join(CFG.out, `${id}.h264.mp4`);
  const args = ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(CFG.fps), '-i', '-',
    '-filter_complex', `[0:v]${fx},split=2[a][b];[a]${scale('yuv420p10le')}[va];[b]${scale('yuv420p')}[vb]`,
    '-map', '[va]', '-c:v', 'libsvtav1', '-preset', '6', '-crf', '38', '-g', String(CFG.fps * 4), '-svtav1-params', 'tune=0:film-grain=0', ...TAG, '-movflags', '+faststart', '-an', av1,
    '-map', '[vb]', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '27', '-profile:v', 'high', '-level', '3.1', '-g', String(CFG.fps * 4), ...TAG, '-movflags', '+faststart', '-an', h264];
  const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  ff.stderr.on('data', (b) => { err += b; });
  const done = new Promise((resolve, reject) => {
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve({ av1, h264 }) : reject(new Error(`ffmpeg ${code}: ${err.slice(-400)}`))));
  });
  return { ff, done, av1, h264 };
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    ff.stderr.on('data', (b) => { err += b; });
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${err.slice(-300)}`))));
  });
}

// ---------------------------------------------------------------------------

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.part';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 1) + '\n');
  fs.renameSync(tmp, file);
}

async function main() {
  if (!STAGES[CFG.floor]) throw new Error(`no stage look '${CFG.floor}' (have: ${Object.keys(STAGES).join(', ')})`);
  if (!fs.existsSync(path.join(CFG.root, 'index.html'))) throw new Error(`no built game at ${CFG.root} (run npm run build, or pass --root)`);
  fs.mkdirSync(CFG.out, { recursive: true });
  if (CFG.sheets) fs.mkdirSync(CFG.sheets, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-clips-'));
  app.setPath('userData', path.join(tmp, 'user'));
  const preload = path.join(tmp, 'clip-preload.cjs');
  fs.writeFileSync(preload, "const { contextBridge, ipcRenderer } = require('electron');\n"
    + "contextBridge.exposeInMainWorld('clipBridge', { frame: (px) => ipcRenderer.invoke('clip-frame', px) });\n");
  const server = await startGameServer({ root: CFG.root, savesDir: path.join(tmp, 'saves') });

  const win = new BrowserWindow({
    show: true, x: flag('show') ? 40 : -4200, y: 40, width: CFG.render.w, height: CFG.render.h, useContentSize: true,
    skipTaskbar: !flag('show'), focusable: flag('show'), frame: flag('show'),
    webPreferences: { partition: 'clip-capture-' + process.pid, backgroundThrottling: false, preload },
  });
  const pageErrors = [];
  win.webContents.on('console-message', (e) => { if (e.level === 'error') pageErrors.push(String(e.message).slice(0, 240)); });

  // The catalog: read from the booted game itself (the one source of truth).
  await win.loadURL(server.url);
  const catalog = await win.webContents.executeJavaScript(`(async () => {
    for (let i = 0; i < 200 && !(window.__game && window.__game.clipCatalog); i++) await new Promise((r) => setTimeout(r, 50));
    return window.__game.clipCatalog();
  })()`);
  let rows = catalog.skills;
  if (flag('list')) {
    const by = {};
    for (const r of rows) (by[(r.delivery && r.delivery.type) + '/' + r.castMode] ||= []).push(r.id);
    for (const k of Object.keys(by).sort()) console.log(`${k} (${by[k].length}): ${by[k].join(', ')}`);
    server.server.close();
    return 0;
  }
  const want = opt('skills');
  if (want) { const ids = want.split(','); rows = ids.map((id) => rows.find((r) => r.id === id) || { id, missing: true }); }
  else if (!flag('all')) throw new Error('name --skills a,b or --all');
  const deliveries = opt('delivery') ? opt('delivery').split(',') : null;
  if (deliveries) rows = rows.filter((r) => deliveries.includes(r.delivery && r.delivery.type));
  const from = opt('from');
  if (from) { const i = rows.findIndex((r) => r.id === from); if (i >= 0) rows = rows.slice(i); }
  rows = rows.slice(0, Number(opt('limit', String(rows.length))));

  const indexFile = path.join(CFG.out, 'index.json');
  const index = readJson(indexFile) || { generated: '', aspect: 16 / 9, clips: {} };
  const report = readJson(CFG.report) || { clips: {} };
  const skipExisting = flag('skip-existing');

  // Frames arrive here from the page (see pageFrame).
  let sink = null;
  ipcMain.handle('clip-frame', (_e, px) => sink ? sink(px) : null);

  const t0 = Date.now();
  const summary = [];
  for (const row of rows) {
    if (row.missing) { console.log(`✗ ${row.id}: not in the catalog`); summary.push({ id: row.id, ok: false }); continue; }
    if (skipExisting && index.clips[row.id]) { console.log(`· ${row.id}: kept`); continue; }
    const spec = {
      skill: row.id, level: CFG.level, fps: CFG.fps, seed: CFG.seed, noon: catalog.noon,
      classId: classFor(row, catalog.classes), cooldownCap: CFG.cooldownCap, hudDraws: HUD_DRAWS,
      stage: { theme: STAGES[CFG.floor] }, ...stageFor(row),
    };
    const started = Date.now();
    pageErrors.length = 0;
    const files = [];
    try {
      await win.loadURL(server.url);
      const info = await win.webContents.executeJavaScript(`(${pageBoot.toString()})(${JSON.stringify(spec)})`);
      const [W, H] = info.canvas;
      const enc = encoderFor(row.id, W, H);
      files.push(enc.av1, enc.h264);
      const frames = Math.round(CFG.seconds * CFG.fps);
      const energy = [];
      const sheetAt = new Set([0.12, 0.3, 0.45, 0.6, 0.75, 0.9].map((f) => Math.round(f * frames)));
      const sheetFrames = [];
      let base = null;
      sink = (px) => {
        const buf = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
        // Activity: how far this frame strays from the calm first frame (a
        // sparse sample), so the poster lands on the busiest beat.
        let e = 0;
        if (!base) base = Buffer.from(buf);
        else for (let i = 0; i < buf.length; i += 4 * 97) e += Math.abs(buf[i] - base[i]) + Math.abs(buf[i + 1] - base[i + 1]) + Math.abs(buf[i + 2] - base[i + 2]);
        energy.push(e);
        if (CFG.sheets && sheetAt.has(energy.length - 1)) sheetFrames.push(Buffer.from(buf));
        return new Promise((resolve) => { if (enc.ff.stdin.write(buf)) resolve(true); else enc.ff.stdin.once('drain', () => resolve(true)); });
      };
      await win.webContents.executeJavaScript('window.__clipFrame = ' + pageFrame.toString() + '; true');
      for (let f = 0; f < frames; f++) await win.webContents.executeJavaScript('window.__clipFrame()');
      sink = null;
      enc.ff.stdin.end();
      const res = await win.webContents.executeJavaScript(`(${pageReport.toString()})()`);
      await enc.done;
      // A clip of nothing happening is worse than no clip.
      if (!res.casts) throw new Error(`no cast (${res.why})`);
      // The poster: the busiest beat of the act.
      const lo = Math.round(CFG.lead * CFG.fps), hi = Math.round((CFG.seconds - CFG.tail * 0.5) * CFG.fps);
      let best = lo;
      for (let i = lo; i < Math.min(hi, energy.length); i++) if (energy[i] > energy[best]) best = i;
      const poster = path.join(CFG.out, `${row.id}.webp`);
      files.push(poster);
      await runFfmpeg(['-ss', (best / CFG.fps).toFixed(3), '-i', enc.h264, '-frames:v', '1', '-vf', `scale=${CFG.encode.posterW}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '82', poster]);
      if (CFG.sheets && sheetFrames.length) {
        const raw = path.join(tmp, 'sheet.rgba');
        fs.writeFileSync(raw, Buffer.concat(sheetFrames));
        await runFfmpeg(['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-i', raw, '-vf', 'scale=640:-2,tile=3x2', '-frames:v', '1', path.join(CFG.sheets, `${row.id}.png`)]);
      }
      const rel = (f) => 'media/clips/' + path.basename(f);
      const H2 = CFG.encode.h;
      index.clips[row.id] = {
        name: row.name, duration: CFG.seconds, poster: rel(poster),
        sources: [
          { family: 'av1', height: H2, src: rel(enc.av1), type: 'video/mp4; codecs="av01.0.05M.10"' },
          { family: 'h264', height: H2, src: rel(enc.h264), type: 'video/mp4; codecs="avc1.64001F"' },
        ],
      };
      index.generated = new Date().toISOString();
      writeJson(indexFile, index);
      const peak = Math.max(0, ...energy) / (W * H / 97);
      const kb = (f) => Math.round(fs.statSync(f).size / 1024);
      const warn = [];
      if (res.errors.length) warn.push('errors: ' + res.errors.join(' | '));
      if (pageErrors.length) warn.push('console: ' + pageErrors.slice(0, 2).join(' | '));
      report.clips[row.id] = {
        delivery: info.delivery, castMode: info.castMode, cls: info.cls, casts: res.casts, dealt: res.dealt,
        statuses: res.statuses, actors: res.actors, peak: Math.round(peak * 100) / 100, kb: kb(enc.av1) + kb(enc.h264) + kb(poster), warn,
      };
      console.log(`✓ ${row.id} [${info.delivery}/${info.castMode}, ${info.cls}] casts ${res.casts} dealt ${res.dealt} peak ${peak.toFixed(2)} · av1 ${kb(enc.av1)}K h264 ${kb(enc.h264)}K · ${((Date.now() - started) / 1000).toFixed(1)}s${warn.length ? '  ⚠ ' + warn.join('; ') : ''}`);
      summary.push({ id: row.id, ok: true });
    } catch (e) {
      sink = null;
      for (const f of files) fs.rmSync(f, { force: true });
      if (index.clips[row.id]) { delete index.clips[row.id]; writeJson(indexFile, index); }
      const msg = String(e && e.message || e).split('\n')[0];
      report.clips[row.id] = { error: msg };
      console.log(`✗ ${row.id}: ${msg}`);
      summary.push({ id: row.id, ok: false });
    }
    report.generated = new Date().toISOString();
    writeJson(CFG.report, report);
  }
  const ok = summary.filter((s) => s.ok).length;
  console.log(`\n${ok}/${summary.length} clips in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${path.relative(REPO, CFG.out)}`);
  server.server.close();
  return summary.every((s) => s.ok) ? 0 : 1;
}

app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
app.whenReady().then(main).then((code) => app.exit(code), (e) => { console.error(e && e.stack || e); app.exit(1); });
