// ---------------------------------------------------------------------------
// THE DIRECTOR — stages a ShotSpec in the LIVE game and steps it frame by
// frame under a held clock, so a capture rig can film real play
// deterministically: a fresh run per shot (the real startGame path), the
// real zone mint (World.devMintTileset), the balance harness's own build
// injector (sim/builds.ts applyBuild), monsters through the ordinary mint +
// promotion pipeline, THE AGENT on the hero's seat (the input artery every
// player uses), and the cinematic camera on the renderer's director seam.
// Nothing here forks a system: if the game would do it, the director asks
// the game to do it. Contract: docs/engine/director.md.
// ---------------------------------------------------------------------------

import { HeroAgent } from '../agent/agent';
import type { Actor } from '../engine/actor';
import { MONSTERS } from '../data/monsters';
import { setSimTap } from '../engine/tap';
import type { World } from '../engine/world';
import type { PlayerInputSource } from '../net/intent';
import type { Renderer } from '../render/renderer';
import { setBakeScale } from '../render/vis/bakeScale';
import { applyBuild } from '../sim/builds';
import { greedyPassives } from '../sim/data/builds';
import { PROGRESSION } from '../data/classes';
import { seedGlobalRandom } from '../sim/rng';
import { DAY_LENGTH } from '../world/daynight';
import { applyDevProgression } from '../dev/progression';
import { memoryKey } from '../meta/memoryUnlocks';
import { DROP_CFG } from '../engine/loot';
import { setMapLens, mapLensReset } from '../ui/mapLens';
import { SUPPORTS } from '../data/supports';
import { rollItem } from '../engine/itemgen';
import { autoPlace } from '../engine/inventory';
import type { ItemRarity } from '../engine/items';
import { mulberry32 } from '../sim/rng';
import { supportOfGemItem } from '../engine/gemitems';
import { NEMESIS_CFG } from '../meta/nemesis';

/** The nemesis rolls the 'nemesis: false' switch zeroes and restores (the
 *  config is authored as const; the director only borrows these two). */
const nemesisRolls = NEMESIS_CFG as { slayerChance: number; survivorChance: number };
import { CinematicCamera, type CameraSpec, type Pt } from './camera';
import type { Cue, DomAction, Place, ShotSpec, SpawnSpec } from './shot';

/** The game-side handles a director needs (main.ts wires them). */
export interface DirectorHost {
  world(): World;
  renderer: Renderer;
  /** Begin a fresh run as this class (the real startGame path, menus down). */
  startRun(classId: string): void;
  /** One whole game tick of `dtMs` (input, sim, render). */
  step(dtMs: number): void;
  /** The local seat's input source (null = the keyboard and mouse). */
  setPilot(src: PlayerInputSource | null): void;
  /** Hold the live rAF loop so only step() advances the game. */
  hold(on: boolean): void;
  /** Mutable account ledger (the capture account skips the prologue). */
  ledger(): Record<string, number>;
  /** The DOM UI (panels), for page shots' ui cues. */
  ui(): unknown;
}

export interface StageInfo {
  id: string;
  zone: string;
  tileset: string;
  hero: Pt;
  foes: number;
  warnings: string[];
  frames: number;
  fps: number;
  canvas: { w: number; h: number };
}

/** What happened inside one captured frame, for sound design and picture
 *  accents placed on the real action. Points are canvas fractions (0..1). */
export interface FrameEvents {
  casts: { skill: string; by: 'hero' | 'ally' | 'foe'; at: [number, number] }[];
  /** Landed hits dealt by the hero's side (hero, minions, allies). */
  hits: number;
  /** The largest single landed hit from the hero's side this frame. */
  hitPeak: number;
  crits: number;
  /** Landed hits taken by the hero. */
  hurt: number;
  kills: { def: string; at: [number, number]; boss: boolean }[];
  heroDied: boolean;
  /** Page shots: where the synthetic pointer rests (viewport fractions) and
   *  whether it clicked this frame, so a compositor can draw the hand. */
  pointer?: [number, number];
  click?: boolean;
}

export interface FrameInfo {
  t: number;
  index: number;
  done: boolean;
  focus: Pt;
  zoom: number;
  foes: number;
  heroLife: number;
  dead: boolean;
  events: FrameEvents;
}

/** The guard pool's depth (flat life). */
const GUARD_LIFE = 250000;
/** The guard's per-hit life ceiling while the pool stands. */
const GUARD_HIT_CAP = 1500;
/** The guard's standing poise (shrugs hard CC while it holds). */
const GUARD_POISE = 250000;
/** The reference frame width the camera's zoom is authored against. */
const REF_W = 1920;
/** Open-spot search: radius of clear ground wanted around the hero. */
const OPEN = { clear: 150, samples: 160, ring: 900 };

export class Director {
  private spec: ShotSpec | null = null;
  private agent: HeroAgent | null = null;
  private cam: CinematicCamera | null = null;
  private cues: Cue[] = [];
  private t = 0;
  private index = 0;
  private frames = 0;
  private fps = 30;
  private timeScale = 1;
  private guard: false | 'pool' | 'floor' = 'pool';
  private named = new Map<string, Actor[]>();
  private sleepers: { a: Actor; until: number; brain: Actor['brain'] }[] = [];
  private unseed: (() => void) | null = null;
  private focus: Pt = { x: 0, y: 0 };
  private zoom = 1.3;
  private viewport: { w: number; h: number } | null = null;
  private ev: FrameEvents = emptyEvents();
  /** Ultimates the hero has already cast this take (the gatekeeper stops refilling them). */
  private spentUlts = new Set<string>();

  constructor(private host: DirectorHost) {}

  /** Render the world at this size regardless of the window (null = window). */
  setViewport(w: number | null, h?: number): void {
    this.viewport = w && h ? { w, h } : null;
    this.host.renderer.setCaptureViewport(this.viewport);
  }

  private dropsSaved: typeof DROP_CFG | null = null;
  /** The synthetic pointer's resting place (viewport fractions), page shots. */
  private pointer: [number, number] | null = null;
  private nemesisSaved: { slayer: number; survivor: number } | null = null;
  get canvas(): HTMLCanvasElement { return this.host.renderer.canvas; }
  get heroAgent(): HeroAgent | null { return this.agent; }

  /** Stage a shot. Returns what was built; call frame() to advance. */
  stage(spec: ShotSpec): StageInfo {
    this.end();
    this.spec = spec;
    this.fps = spec.fps ?? 30;
    this.frames = Math.round(spec.duration * this.fps);
    this.t = 0; this.index = 0; this.timeScale = 1;
    this.cues = [...(spec.cues ?? [])].sort((a, b) => a.at - b.at);
    this.named.clear(); this.sleepers = []; this.spentUlts.clear(); this.pointer = null;
    this.guard = spec.guard === false ? false : spec.guard === 'floor' ? 'floor' : 'pool';
    this.unseed = seedGlobalRandom(spec.seed ?? 1);

    const host = this.host;
    host.ledger().prologue_lived = 1;
    host.hold(true);
    host.startRun(spec.hero.classId);
    // A clean screen: the game's own Esc sweep, until nothing stands.
    const ui = host.ui() as { escapeSweep?: (seat: string, keep: readonly string[]) => boolean };
    for (let i = 0; i < 12 && ui.escapeSweep?.(host.world().localSeat.id, []); i++) { /* sweep again */ }
    let w = host.world();
    // Settle the town (doors, lesson stamps) before leaving it.
    for (let i = 0; i < 3; i++) host.step(1000 / 60);
    w = host.world();
    let tileset = 'town';
    if (spec.zone && spec.zone !== 'town') {
      tileset = spec.zone.tileset;
      const id = w.devMintTileset(spec.zone.tileset, 0, spec.zone.level ?? spec.hero.level,
        { seed: spec.zone.seed, variant: spec.zone.variant, layoutType: spec.zone.layoutType });
      if (!id) throw new Error(`unknown tileset ${spec.zone.tileset}`);
    }
    // 'auto' passives: the balance harness's honest greedy walk for the level.
    const hero = (spec.hero.passives as unknown) === 'auto'
      ? { ...spec.hero, passives: greedyPassives(spec.hero.classId, PROGRESSION.passivePointsAtLevel(spec.hero.level)) }
      : spec.hero;
    const warnings: string[] = [];
    // Account access first (an awakened tree must exist before the build's
    // picks land): the dev catalog's recipes, never a hand-written ledger.
    const prog = [...(spec.progression ?? [])];
    for (const id of spec.awaken === 'hero' ? hero.skills.map(s => s.id) : spec.awaken ?? []) prog.push('memory:' + memoryKey('skill', id));
    if (prog.length) {
      const r = applyDevProgression(w, prog);
      if (!r.ok) warnings.push('progression: ' + r.message);
    }
    warnings.push(...applyBuild(w, hero, (spec.seed ?? 1) ^ 0x5eed));
    const p = w.player;
    w.devIgnoreSkillAttributes = (spec.attributes ?? 'ignore') === 'ignore';
    if (this.guard === 'pool') this.setGuardPool(w, true);
    if ((spec.power ?? 1) !== 1) {
      const more = (spec.power ?? 1) - 1;
      p.sheet.setSource('director-power', [
        { stat: 'damage', kind: 'more', value: more },
        { stat: 'minionDamage', kind: 'more', value: more },
      ]);
      w.charDirty = true;
      w.recalcPlayer();
    }
    p.fillResources();
    if (spec.drops) {
      this.dropsSaved = { ...DROP_CFG };
      Object.assign(DROP_CFG, spec.drops);
    }
    if (spec.lens) setMapLens(spec.lens);
    if (spec.nemesis === false) {
      this.nemesisSaved = { slayer: NEMESIS_CFG.slayerChance, survivor: NEMESIS_CFG.survivorChance };
      nemesisRolls.slayerChance = 0;
      nemesisRolls.survivorChance = 0;
    }
    if (spec.bag) {
      const seat = w.localSeat;
      for (const g of spec.bag.supports ?? []) {
        const def = SUPPORTS[g.id];
        if (!def) { warnings.push('bag: unknown support ' + g.id); continue; }
        w.grantSupportGemItem(seat, { def, level: g.level ?? 1 });
      }
      const rng = mulberry32((spec.seed ?? 1) ^ 0xba9);
      for (const g of spec.bag.gear ?? []) {
        const item = rollItem({ ilvl: g.ilvl ?? spec.hero.level, rng, rarity: g.rarity as ItemRarity | undefined, baseId: g.baseId, uniqueId: g.uniqueId });
        if (!item || !autoPlace(seat.meta.items, item)) warnings.push('bag: could not place a rolled ' + (g.uniqueId ?? g.baseId ?? g.rarity ?? 'item'));
      }
      w.markMetaDirty(seat);
    }

    // Ground.
    if (spec.at && spec.at !== 'entry') {
      const want = spec.at === 'open' ? openSpot(w, p) : spec.at;
      const at = w.findFreeSpot(want, p.radius, p.tier);
      w.landPartyAt(at);
    }
    if (spec.clear !== undefined) clearFoes(w, p, spec.clear);
    if (spec.day !== undefined) w.time = setDay(w.time, spec.day);
    const wx = w.sim.weather;
    wx.spawnScale = 0;
    wx.fronts.length = 0;
    if (spec.weather) {
      const life = 100000;
      wx.fronts.push({ kind: spec.weather.kind, pos: { x: w.zone.map.x, y: w.zone.map.y }, vel: { x: 0, y: 0 },
        radius: 12, intensity: spec.weather.intensity ?? 1, age: life / 2, life });
    }

    // Bodies.
    for (const s of spec.allies ?? []) this.spawn(w, { team: 'player', ...s });
    for (const s of spec.foes ?? []) this.spawn(w, s);

    // The log: every cast, landed blow and death, through the engine's own
    // observation seam (engine/tap.ts — observe only, one consumer).
    this.installTap();

    // The hand.
    const a = spec.agent;
    if (a && a.enabled !== false) {
      this.agent = new HeroAgent(p, a);
      host.setPilot(this.agent);
    } else {
      this.agent = null;
      host.setPilot(idlePilot);
    }

    // The eye.
    setBakeScale(spec.bakeScale ?? 1);
    if (spec.capture === 'page') this.host.renderer.setCaptureViewport(null);
    else this.host.renderer.setCaptureViewport(this.viewport);
    host.renderer.worldOnly = !spec.hud;
    host.renderer.directorClean = spec.clean ?? true;
    host.renderer.directorNoSightVeil = !(spec.sightVeil ?? false);
    host.renderer.directorCinematic = spec.cinematic ?? true;
    this.cam = new CinematicCamera(spec.camera ?? { follow: 'hero', zoom: 2.2, damp: 0.3 }, { x: p.pos.x, y: p.pos.y });
    this.applyCamera(0);

    // Warm up (rendered, not counted).
    const warm = Math.round((spec.warmup ?? 0.5) * this.fps);
    this.t = -warm / this.fps;
    for (let i = 0; i < warm; i++) this.tick(1 / this.fps, false);
    this.t = 0;

    const c = this.canvas;
    return {
      id: spec.id, zone: w.zone.name, tileset, hero: { x: p.pos.x, y: p.pos.y },
      foes: w.actors.filter(x => !x.dead && x.team === 'enemy' && !x.passive).length,
      warnings, frames: this.frames, fps: this.fps, canvas: { w: c.width, h: c.height },
    };
  }

  /** Advance one captured frame. */
  frame(): FrameInfo {
    if (!this.spec) throw new Error('no shot staged');
    this.ev = emptyEvents();
    this.tick(1 / this.fps, true);
    this.index++;
    const w = this.host.world();
    const events = this.ev;
    if (this.pointer) events.pointer = this.pointer;
    this.ev = emptyEvents();
    return {
      events,
      t: this.t, index: this.index, done: this.index >= this.frames,
      focus: { ...this.focus }, zoom: this.zoom,
      foes: w.actors.filter(x => !x.dead && x.team === 'enemy' && !x.passive).length,
      heroLife: w.player.life / Math.max(1, w.player.maxLife()),
      dead: w.player.dead,
    };
  }

  /** Release the game: the keyboard back, the loop free, the true die. */
  end(): void {
    setSimTap(null);
    this.host.setPilot(null);
    this.host.hold(false);
    this.host.renderer.directorFocus = null;
    this.host.renderer.worldOnly = false;
    this.host.renderer.directorClean = false;
    this.host.renderer.directorNoSightVeil = false;
    this.host.renderer.directorCinematic = false;
    setBakeScale(1);
    if (this.dropsSaved) { Object.assign(DROP_CFG, this.dropsSaved); this.dropsSaved = null; }
    if (this.nemesisSaved) {
      nemesisRolls.slayerChance = this.nemesisSaved.slayer;
      nemesisRolls.survivorChance = this.nemesisSaved.survivor;
      this.nemesisSaved = null;
    }
    if (this.spec?.lens) mapLensReset();
    if (this.unseed) { this.unseed(); this.unseed = null; }
    this.spec = null; this.agent = null; this.cam = null;
  }

  // -------------------------------------------------------------- internals --

  private tick(realDt: number, counted: boolean): void {
    const host = this.host;
    const w = host.world();
    const dt = realDt * this.timeScale;
    // cues on every tick: negative times belong to the warm-up
    while (this.cues.length && this.cues[0].at <= this.t + 1e-6) this.cue(w, this.cues.shift()!);
    for (let i = this.sleepers.length - 1; i >= 0; i--) {
      const s = this.sleepers[i];
      if (this.t >= s.until || s.a.dead) { s.a.brain = s.brain; this.sleepers.splice(i, 1); }
    }
    if (this.guard === 'floor' && !w.player.dead && w.player.life < w.player.maxLife() * 0.35) w.player.life = w.player.maxLife() * 0.35;
    if (this.guard === 'pool' && !w.player.dead && w.player.life < w.player.maxLife() * 0.6) w.player.life = w.player.maxLife();
    if (this.spec?.keep && !w.player.dead) keepReady(w.player, this.spec.keep, this.spentUlts);
    this.applyCamera(dt);
    host.step(dt * 1000);
    if (counted || this.t < 0) this.t += realDt;
  }

  /** THE GUARD POOL: a deep life source on the hero's sheet (blows land and
   *  flash, nothing kills), lifted at the 'mortal' cue with life restored
   *  to the same share of the honest pool. */
  private setGuardPool(w: World, on: boolean): void {
    const p = w.player;
    const share = p.life / Math.max(1, p.maxLife());
    // A deep pool so ordinary blows land and read normally, a per-hit ceiling
    // (THE HIT CEILING, hitCap) so a percent-of-life strike cannot spend the
    // pool in one blow, the tick refill below for attrition, and a standing
    // poise bar that shrugs hard CC (the poise gate in Actor.applyStatus):
    // a staged hero is never stun-locked out of the take.
    if (on) p.sheet.setSource('director-guard', [
      { stat: 'life', kind: 'flat', value: this.spec?.guardLife ?? GUARD_LIFE },
      { stat: 'hitCap', kind: 'flat', value: GUARD_HIT_CAP },
      { stat: 'poise', kind: 'flat', value: GUARD_POISE },
      { stat: 'poiseCcAvoid', kind: 'flat', value: 1 },
    ]);
    else p.sheet.setSource('director-guard', []);
    w.charDirty = true;
    w.recalcPlayer();
    p.life = Math.max(1, Math.min(p.maxLife(), on ? p.maxLife() : p.maxLife() * Math.min(1, share * 4)));
    p.poise = Math.min(p.poise, p.maxPoise());
    if (on) p.poise = p.maxPoise();
  }

  private installTap(): void {
    const host = this.host;
    const at = (x: number, y: number): [number, number] => {
      const p = host.renderer.toScreen({ x, y });
      const c = host.renderer.canvas;
      return [+(p.x / c.width).toFixed(4), +(p.y / c.height).toFixed(4)];
    };
    const side = (a: Actor | undefined): 'hero' | 'ally' | 'foe' => {
      const w = host.world();
      if (!a) return 'foe';
      if (a === w.player) return 'hero';
      return a.team === w.player.team ? 'ally' : 'foe';
    };
    setSimTap({
      onCast: (caster, inst, repeat) => {
        if (repeat) return;
        if (caster === host.world().player && inst.def.ultimate) this.spentUlts.add(inst.def.id);
        this.ev.casts.push({ skill: inst.def.id, by: side(caster), at: at(caster.pos.x, caster.pos.y) });
      },
      onHit: (attacker, target, result) => {
        if (result.evaded || result.immune || result.total <= 0) return;
        const w = host.world();
        if (target === w.player) { this.ev.hurt++; return; }
        if (side(attacker) === 'foe') return;
        this.ev.hits++;
        if (result.crit) this.ev.crits++;
        if (result.total > this.ev.hitPeak) this.ev.hitPeak = Math.round(result.total);
      },
      onDeath: (actor) => {
        const w = host.world();
        if (actor === w.player) { this.ev.heroDied = true; return; }
        if (actor.team === w.player.team || actor.passive) return;
        this.ev.kills.push({ def: actor.defId ?? '?', at: at(actor.pos.x, actor.pos.y), boss: !!(actor.defId && MONSTERS[actor.defId]?.boss) });
      },
    });
  }

  private applyCamera(dt: number): void {
    const w = this.host.world();
    if (!this.cam) return;
    const s = this.cam.spec;
    const subj = subjectOf(w, s);
    const foes = w.actors.filter(a => !a.dead && a.team === 'enemy' && !a.passive).map(a => a.pos);
    const r = this.cam.step(this.t, dt, subj, foes);
    this.focus = r.focus; this.zoom = r.zoom;
    const width = this.viewport?.w ?? this.canvas.width;
    this.host.renderer.directorFocus = r.focus;
    this.host.renderer.setBaseZoom(r.zoom * (width / REF_W));
  }

  private cue(w: World, c: Cue): void {
    if (c.orders && this.agent) { this.agent.clearOrders(); this.agent.order(...c.orders); }
    if (c.order && this.agent) this.agent.order(...c.order);
    for (const s of c.spawn ?? []) this.spawn(w, s);
    if (c.heroLife !== undefined) w.player.life = Math.max(1, w.player.maxLife() * c.heroLife);
    if (c.mortal) {
      if (this.guard === 'pool') this.setGuardPool(w, false);
      this.guard = false;
    }
    if (c.camera && this.cam) this.cam.spec = { ...this.cam.spec, ...c.camera } as CameraSpec;
    if (c.timeScale !== undefined) this.timeScale = c.timeScale;
    if (c.kill) {
      const victims = c.kill === 'foes'
        ? w.actors.filter(a => !a.dead && a.team === 'enemy' && !a.passive)
        : c.kill.flatMap(n => this.named.get(n) ?? []);
      for (const a of victims) if (!a.dead) w.kill(a, false, w.player);
    }
    if (c.provoke) for (const a of w.actors) if (!a.dead && a.team === 'enemy' && !a.passive) provoke(w, a, w.player);
    for (const u of c.ui ?? []) {
      const ui = this.host.ui() as Record<string, unknown>;
      const fn = ui[u.call];
      if (typeof fn === 'function') (fn as (...a: unknown[]) => unknown).apply(ui, u.args ?? []);
    }
    for (const a of c.dom ?? []) {
      const pt = domAction(a);
      if (pt) { this.pointer = [+pt.x.toFixed(4), +pt.y.toFixed(4)]; if (pt.press) this.ev.click = true; }
    }
    for (const s of c.socket ?? []) {
      const seat = w.localSeat;
      const item = seat.meta.items.find(it => supportOfGemItem(it)?.def.id === s.support);
      if (item) w.socketSupport(item.uid, s.skill, seat);
    }
    for (const f of c.force ?? []) {
      for (const a of this.named.get(f.who) ?? []) {
        if (a.dead) continue;
        const inst = a.skills.find(s => s?.def.id === f.skill);
        if (!inst) continue;
        const p = w.player.pos;
        const aim = !f.at || f.at === 'hero' ? { x: p.x, y: p.y } : { x: a.pos.x + f.at.offset.x, y: a.pos.y + f.at.offset.y };
        a.cooldowns.delete(inst.def.id);
        w.useSkill(a, inst, aim);
      }
    }
  }

  private spawn(w: World, s: SpawnSpec): void {
    const p = w.player;
    const n = s.count ?? 1;
    const level = s.level ?? Math.max(1, w.zone.level ?? p.level);
    const out: Actor[] = [];
    for (let i = 0; i < n; i++) {
      const a = w.createMonster(s.def, level, s.team ?? 'enemy');
      if (s.rarity && s.rarity !== 'normal') w.promoteMonster(a, s.rarity);
      a.tier = p.tier;
      const want = placeOf(p.pos, s.at, i, n, s.spread ?? 0);
      a.pos = w.findFreeSpot(want, a.radius, a.tier);
      a.fillResources();
      if (s.life !== undefined) a.life = Math.max(1, a.maxLife() * s.life);
      w.actors.push(a);
      if (s.provoke) provoke(w, a, p);
      if (s.sleepUntil && s.sleepUntil > 0) { this.sleepers.push({ a, until: s.sleepUntil, brain: a.brain }); a.brain = undefined; }
      out.push(a);
    }
    if (s.name) this.named.set(s.name, [...(this.named.get(s.name) ?? []), ...out]);
  }
}

// -------------------------------------------------------------------- pure --

/** Dispatch one synthetic gesture (page shots: menus, trees, the map). */
function domAction(a: DomAction): { x: number; y: number; press: boolean } | null {
  const el = a.selector ? document.querySelector(a.selector) as HTMLElement | null : null;
  if (a.type === 'style') { if (el && a.css) el.style.cssText += ';' + a.css; return null; }
  const box = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const [fx, fy] = a.at ?? [0.5, 0.5];
  const x = box.left + box.width * fx, y = box.top + box.height * fy;
  const target = (document.elementFromPoint(x, y) as HTMLElement | null) ?? el ?? document.body;
  const base = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
  if (a.type === 'key') {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: a.key ?? '', bubbles: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: a.key ?? '', bubbles: true }));
  } else if (a.type === 'wheel') target.dispatchEvent(new WheelEvent('wheel', { ...base, deltaY: a.deltaY ?? 100 }));
  else if (a.type === 'move') { target.dispatchEvent(new PointerEvent('pointermove', base)); target.dispatchEvent(new MouseEvent('mousemove', base)); }
  else if (a.type === 'down') { target.dispatchEvent(new PointerEvent('pointerdown', base)); target.dispatchEvent(new MouseEvent('mousedown', base)); }
  else if (a.type === 'up') { target.dispatchEvent(new PointerEvent('pointerup', base)); target.dispatchEvent(new MouseEvent('mouseup', base)); }
  else { target.dispatchEvent(new PointerEvent('pointerdown', base)); target.dispatchEvent(new MouseEvent('mousedown', base));
    target.dispatchEvent(new PointerEvent('pointerup', base)); target.dispatchEvent(new MouseEvent('mouseup', base)); target.dispatchEvent(new MouseEvent('click', base)); }
  return a.type === 'key' ? null : { x: x / window.innerWidth, y: y / window.innerHeight, press: a.type === 'click' || a.type === 'down' };
}

/** THE GATEKEEPER: refill what the hero's casts spend or wait on, and cap
 *  the cooldown clocks (the skill showcase's upkeep, for a whole bar). */
function keepReady(p: Actor, keep: NonNullable<ShotSpec['keep']>, spentUlts: ReadonlySet<string>): void {
  const cap = keep.cooldownCap ?? 1.5;
  for (const inst of p.skills) {
    if (!inst) continue;
    const d = inst.def;
    if (d.pool) {
      const want = Math.max(d.pool.min ?? 1, 1) * 4;
      if ((p.pools.get(d.pool.id) ?? 0) < want) p.pools.set(d.pool.id, want);
    }
    if (d.gauge && !(d.ultimate && !keep.ultimates && spentUlts.has(d.id))) {
      const eff = p.gaugeEff(inst);
      if (eff) {
        const st = (inst.state ??= {});
        if ((st.gauge ?? 0) < eff.need) st.gauge = eff.need;
        if ((st.gaugeLock ?? 0) > cap) st.gaugeLock = cap;
      }
    }
    const cc = d.chargeCost;
    if (cc?.charge) {
      const need = cc.amount === 'all' ? Math.max(cc.minimum ?? 0, 3) : Math.max(cc.amount ?? 1, cc.minimum ?? 0);
      if ((p.charges.get(cc.charge) ?? 0) < need) p.charges.set(cc.charge, need);
    }
    const g = p.unmetGate(inst);
    if (g?.charge) p.charges.set(g.charge.id, Math.max(g.charge.amount, p.charges.get(g.charge.id) ?? 0));
    const cd = p.cooldowns.get(d.id);
    // An ultimate keeps its own long clock unless asked: one super art per take.
    if (cd !== undefined && cd > cap && (!d.ultimate || keep.ultimates)) p.cooldowns.set(d.id, cap);
  }
  if (keep.mana !== false && p.mana < p.availableMaxMana() * 0.6) p.mana = p.availableMaxMana() * 0.6;
}

function emptyEvents(): FrameEvents {
  return { casts: [], hits: 0, hitPeak: 0, crits: 0, hurt: 0, kills: [], heroDied: false };
}

/** A pilot that holds still (the hero stands; the keyboard cannot reach it). */
const idlePilot: PlayerInputSource = {
  poll(actor) { return { dx: 0, dy: 0, aim: { x: actor.pos.x + Math.cos(actor.facing) * 80, y: actor.pos.y + Math.sin(actor.facing) * 80 }, held: actor.skills.map(() => false), edge: actor.skills.map(() => false) }; },
};

function subjectOf(w: World, s: CameraSpec): Pt {
  const f = s.follow ?? 'hero';
  if (f === 'hero') return { x: w.player.pos.x, y: w.player.pos.y };
  if (typeof f === 'number') { const a = w.actorById(f); return a ? { x: a.pos.x, y: a.pos.y } : { x: w.player.pos.x, y: w.player.pos.y }; }
  return f;
}

function placeOf(hero: Pt, at: Place | undefined, i: number, n: number, spread: number): Pt {
  let base: Pt;
  if (!at) base = { x: hero.x + 260, y: hero.y };
  else if ('ring' in at) {
    const from = (at.from ?? 0) * Math.PI / 180, to = (at.to ?? 360) * Math.PI / 180;
    const full = Math.abs(to - from) >= Math.PI * 2 - 1e-3;
    const u = n === 1 ? 0.5 : i / (full ? n : n - 1);
    const ang = from + (to - from) * u;
    const r = at.ring + (at.jitter ? (Math.random() * 2 - 1) * at.jitter : 0);
    base = { x: hero.x + Math.cos(ang) * r, y: hero.y + Math.sin(ang) * r };
  } else if ('offset' in at) base = { x: hero.x + at.offset.x, y: hero.y + at.offset.y };
  else base = { x: at.x, y: at.y };
  if (spread > 0) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * spread;
    base = { x: base.x + Math.cos(a) * r, y: base.y + Math.sin(a) * r };
  }
  return base;
}

/** Lock a monster onto a target the way a perceived threat would. */
export function provoke(w: World, a: Actor, target: Actor): void {
  a.aiTargetId = target.id;
  a.aiTargetRef = target;
  a.aiLastSeen = { x: target.pos.x, y: target.pos.y };
  a.aiLosSeenAt = w.time;
  if (a.aiEngagedAt < 0) a.aiEngagedAt = w.time;
  a.alertUntil = w.time + 10;
}

function clearFoes(w: World, p: Actor, clear: number | 'all'): void {
  w.actors = w.actors.filter(a => {
    if (a === p || a.team !== 'enemy' || a.passive || a.dead) return true;
    if (clear === 'all') return false;
    return Math.hypot(a.pos.x - p.pos.x, a.pos.y - p.pos.y) > clear;
  });
}

/** The most open walkable point near the arena centre (clear of solids). */
function openSpot(w: World, p: Actor): Pt {
  const cx = w.arena.w / 2, cy = w.arena.h / 2;
  const field = w.pathField(p.tier);
  let best: Pt = { x: cx, y: cy }, bestScore = -Infinity;
  for (let i = 0; i < OPEN.samples; i++) {
    const a = i * 2.39996, r = Math.sqrt(i / OPEN.samples) * OPEN.ring;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (x < 200 || y < 200 || x > w.arena.w - 200 || y > w.arena.h - 200) continue;
    if (field && !field.isWalkable(x, y)) continue;
    let open = 0;
    for (let k = 0; k < 16; k++) {
      const ka = k * Math.PI / 8;
      for (const rr of [OPEN.clear * 0.5, OPEN.clear]) {
        const qx = x + Math.cos(ka) * rr, qy = y + Math.sin(ka) * rr;
        if ((!field || field.isWalkable(qx, qy)) && !w.pointInSolid(qx, qy, 10, p.tier)) open++;
      }
    }
    const score = open - r / 300;
    if (score > bestScore) { bestScore = score; best = { x, y }; }
  }
  return best;
}

/** Move the day clock to a fraction of the day, keeping the day count. */
function setDay(time: number, frac: number): number {
  // world/daynight.ts: dayCycle(time) reads (time % DAY_LENGTH) / DAY_LENGTH.
  const L = DAY_LENGTH;
  const day = Math.floor(time / L);
  return day * L + ((frac % 1) + 1) % 1 * L;
}
