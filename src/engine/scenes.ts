// ---------------------------------------------------------------------------
// THE SCENE DIRECTOR — engine half of the scene fabric (data/scenes.ts).
//
// A scene is a stage list walked in order by ONE driver (updateScene), hooked
// into World.update on the RAW clock — before the timeflow gate's early
// return — because scenes OWN their holds: a card freezes the whole sim
// under itself, the reckoning freezes everyone but the executioner, and the
// director must keep breathing through both. Scenes yield only to the true
// pause (a 'menu' hold).
//
// Stage kinds are an OPEN REGISTRY (registerSceneStage) — the core six ship
// here; a new cinematic beat is a kind + a handler. Handlers speak to the
// World through its ordinary public surface: scene spawns ride createMonster
// + the wave-frenzy overlay (already-hunting), the executioner's verb rides
// useSkill (cast bar + telegraph honest by construction), the staging ground
// rides mintCave into the OFF-GRAPH caveMap (never serialized, culled from
// any save that claims it), and teardown is one surface loadZone home.
//
// THE COVENANT: nobody truly dies on scripted ground. Every player-seat
// lethal blow routes through World.onPlayerDown, whose head asks this module
// first (sceneInterceptFall) — the hero is FELLED (life 1, guarded, the
// script fast-forwards to the next stage that knows what a fall means),
// never killed. And nothing on scripted ground pays: every scene spawn is
// stamped noBounty (no xp, loot, gems, or orbs) on rewardless 'none'-spoils
// ground — introductions are the whole reward.
//
// THE RUN BEGINS AFTER: a scene is not a run. While one plays, the shell
// writes no run save (startGame's baseline, the autosave cadence, the menu
// exit and the quit flush all stand down), World.endRun refuses the forfeit
// ceremony, and the completion stamp + the run's FIRST save both land at
// the 'home' stage — so an abort leaves nothing to resume and the next New
// Game re-launches the scene (the begun-key keeps it due).
// ---------------------------------------------------------------------------

import type { World } from './world';
import type { Actor } from './actor';
import type { ZoneDef } from '../data/zones';
import { START_ZONE } from '../data/zones';
import {
  SCENES, SCENE_CFG, type SceneDef, type SceneStage, type SceneCardSpec,
  type SceneCardStage, type SceneDrillStage, type SceneClashStage,
  type SceneAssaultStage, type SceneReckoningStage, type SceneSpawnRow,
} from '../data/scenes';
import { WAVE_CFG } from '../data/waves';
import { mintCave } from './worldgen';
import { makeSkillInstance } from './skills';
import { SKILLS } from '../data/skills';
import { LEDGER_FLASK_LESSON, type Account } from '../meta/account';
import { bumpLedger } from '../packages/ledger';
import { vec, dist, rand, type Vec2 } from '../core/math';

// ------------------------------------------------------------- the runtime --

/** Live state of the one running scene (World.scene). The HUD channels
 *  (bar/prompt/focus/card) are read by the renderer + DOM layer each frame —
 *  drawn state IS director state, nothing forked. */
export interface SceneRuntime {
  def: SceneDef;
  zoneId: string;
  stageIx: number;
  /** Seconds inside the current stage (raw clock — holds don't stop it). */
  stageT: number;
  begun: boolean;
  /** Per-stage scratch, cleared on advance. */
  state: Record<string, unknown>;
  /** The hero has been felled (scripted — never a real death). */
  fell: boolean;
  /** Lifetime seat-pressed casts (the drill reads deltas). */
  casts: number;
  /** Scene HUD bar (label + 0..1). */
  bar: { label: string; frac: number } | null;
  /** Scene HUD prompt line ('{bind:…}' tokens resolve at draw). */
  prompt: string | null;
  /** Where the bar + prompt sit: 'hero' floats just above the player's
   *  head (teaching at the eye), 'top' takes the encounter bar's screen
   *  seat (the assault's dawn clock). Stage handlers set it per beat. */
  barAt: 'hero' | 'top';
  /** Cinematic camera override — the renderer follows this instead of the
   *  hero while set. */
  focus: Vec2 | null;
  /** Pending story card (the DOM layer shows it; ack via sceneCardAck). */
  card: SceneCardSpec | null;
  cardAck: boolean;
  /** Director-owned screen fade target (0 world, 1 black). */
  fadeTarget: number;
  /** Stamp worn by every scene spawn — the sweepable scope. */
  eventKey: string;
}

/** One registered stage kind. `update` runs every raw-clock tick; return
 *  true when the stage completes. `onFell: 'play'` marks stages that know
 *  what a hero's fall means (the fall fast-forwards to the nearest one). */
export interface SceneStageHandler {
  begin?(w: World, sc: SceneRuntime, spec: SceneStage): void;
  update(w: World, sc: SceneRuntime, spec: SceneStage, dt: number): boolean;
  onFell?: 'skip' | 'play';
}

const STAGES: Record<string, SceneStageHandler> = {};

export function registerSceneStage(kind: string, h: SceneStageHandler): void {
  STAGES[kind] = h;
}

// ------------------------------------------------------------ gate + begin --

/** The 'walked in but never walked out' key: stamped at scene START, it
 *  keeps an ABORTED scene due — quitting mid-tutorial and starting a new
 *  game re-launches it, whatever the aborted attempt drifted on the account
 *  (a roster vessel, a stray credit). Only completion closes the door. */
export const sceneBegunKey = (def: SceneDef): string => `${def.ledger}_begun`;

/** Is this scene DUE for the account? The scene only COUNTS once completed
 *  (its `ledger` key stamps at the 'home' stage): until then it stays due
 *  for a virgin account — or for any account that BEGAN it and aborted.
 *  Veterans predating a newly-added scene are grandfathered by their own
 *  history, no migration write needed. (A full account reset births a
 *  virgin account: scenes return with it.) */
export function sceneDue(account: Account, id: string): boolean {
  const def = SCENES[id];
  if (!def) return false;
  if (account.ledger[def.ledger] ?? 0) return false;
  if (account.ledger[sceneBegunKey(def)] ?? 0) return true;
  return account.roster.length === 0 && account.deaths.length === 0
    && account.lifetimeCredits === 0
    && !(account.ledger[LEDGER_FLASK_LESSON] ?? 0);
}

/** Begin a scene: stamp the gate, mint the staging ground OFF-GRAPH, and
 *  step through under black. Call with the hero standing in the zone the
 *  scene should return to (the prologue: the fresh run's town). */
export function sceneBegin(w: World, id: string): boolean {
  const def = SCENES[id];
  if (!def || w.scene) return false;
  // The BEGUN mark (never the completion key): the scene doesn't COUNT
  // until it is lived to the end — an abort re-launches it on the next New
  // Game. While a scene runs, the shell suppresses every run save (the
  // tutorial is not a run; the run begins at 'home'), so a mid-scene quit
  // leaves nothing to resume into.
  if (!(w.account.ledger[sceneBegunKey(def)] ?? 0)) {
    bumpLedger(w.account.ledger, sceneBegunKey(def));
    w.accountDirty = true;
  }
  const zid = `scene_${id}`;
  const parent = w.zone;
  const z = mintCave(parent, def.zone.seed, zid, def.zone.tileset, {
    name: def.zone.name,
    objective: { kind: 'none', ...(def.zone.objectiveLabel ? { label: def.zone.objectiveLabel } : {}) },
    noDeeper: true,
    ...(def.zone.layoutType ? { layoutType: def.zone.layoutType } : {}),
    ...(def.zone.layoutParams ? { layoutParams: def.zone.layoutParams } : {}),
  });
  sealStageZone(z, def);
  w.caveMap[zid] = z;
  w.scene = {
    def, zoneId: zid, stageIx: 0, stageT: 0, begun: false, state: {},
    fell: false, casts: 0, bar: null, prompt: null, barAt: 'top',
    focus: null, card: null, cardAck: false, fadeTarget: 1,
    eventKey: `scene:${id}`,
  };
  // Born under black — the first card owns the reveal.
  w.screenFade = 1;
  // The off-graph entry: the way home is the return anchor, exactly the
  // sidezone idiom — a save written mid-scene resolves the player spot to
  // this surface anchor, so a quit resumes at the ordinary wake for free.
  w.caveReturn = { zoneId: parent.id, pos: vec(w.player.pos.x, w.player.pos.y), entryFrom: null };
  w.loadZone(zid, parent.id);
  // THE EMPTY-FIELD LAW: scripted ground opens with NOBODY on it. Whatever
  // a tileset's dress rows may mint as actors (a lea's gem cache, a den's
  // sleeper), the scene owns every body on its stage — only the party
  // remains, and every later arrival is a scene spawn by construction.
  for (let i = w.actors.length - 1; i >= 0; i--) {
    if (w.actors[i].team !== 'player') w.actors.splice(i, 1);
  }
  return true;
}

/** Scripted ground is sealed, silent, and rewardless: no spoils mints, no
 *  ambient packs or events, no way out on foot (entry falls back to zone
 *  center; the script alone decides when you leave), no secrets asking to
 *  be found mid-cinematic. The mint's caveDepth already shelters the sky
 *  and bars every world event. */
function sealStageZone(z: ZoneDef, def: SceneDef): void {
  z.level = def.zone.level;
  z.spoils = 'none';
  z.packDensity = 0;
  z.cohort = 'authored';
  z.packs = { count: [0, 0], size: [0, 0], table: [] };
  z.exits = [];
  if (def.zone.boundless) z.boundless = true;
  delete z.hollows;
  delete z.puzzles;
  delete z.scenery;
}

// ------------------------------------------------------------- the driver --

/** The director tick — hooked in World.update on RAW dt, BEFORE the
 *  timeflow gate's early return (scenes own their holds and must breathe
 *  through them). Yields only to the true pause (a 'menu' hold). */
export function updateScene(w: World, dt: number): void {
  const sc = w.scene;
  if (!sc) return;
  if (w.timeflow.heldBy('menu')) return;
  // The one screen-fade owner while a scene runs (no real death can occur
  // under the covenant, so the mode-respawn fader stays quiet by construction).
  w.screenFade = sc.fadeTarget > w.screenFade
    ? Math.min(sc.fadeTarget, w.screenFade + SCENE_CFG.fade.up * dt)
    : Math.max(sc.fadeTarget, w.screenFade - SCENE_CFG.fade.down * dt);
  const spec = sc.def.stages[sc.stageIx];
  if (!spec) { endScene(w, sc); return; }
  const h = STAGES[spec.kind];
  if (!h) {
    console.warn(`[scenes] '${sc.def.id}' stage ${sc.stageIx}: unregistered kind '${spec.kind}' — skipped`);
    sc.stageIx++;
    sc.begun = false;
    return;
  }
  if (!sc.begun) {
    sc.begun = true;
    sc.stageT = 0;
    sc.state = {};
    h.begin?.(w, sc, spec);
  }
  sc.stageT += dt;
  if (h.update(w, sc, spec, dt)) {
    sc.stageIx++;
    sc.begun = false;
    sc.bar = null;
    sc.prompt = null;
  }
}

/** Stage list exhausted (the 'home' stage normally tears down; this is the
 *  belt under it). */
function endScene(w: World, sc: SceneRuntime): void {
  w.timeflow.release(SCENE_CFG.holdId);
  sc.focus = null;
  w.scene = null;
}

// -------------------------------------------------------------- the hooks --

/** THE COVENANT — called at the head of World.onPlayerDown: a player seat's
 *  lethal blow on scripted ground FELLS instead of kills. Returns true when
 *  the scene claimed the fall (the caller stops — no downed state, no wipe,
 *  no mode respawn). The script fast-forwards to the nearest stage that
 *  knows what a fall means (the reckoning plays it; a card narrates it). */
export function sceneInterceptFall(w: World, a: Actor): boolean {
  const sc = w.scene;
  if (!sc) return false;
  a.dead = false;
  a.downed = false;
  a.life = 1;
  a.casting = null;
  a.invulnerable = true;
  a.untargetable = true;
  if (!sc.fell) {
    sc.fell = true;
    const cur = STAGES[sc.def.stages[sc.stageIx]?.kind ?? ''];
    if (cur?.onFell !== 'play') {
      for (let i = sc.stageIx + 1; i < sc.def.stages.length; i++) {
        if (STAGES[sc.def.stages[i]?.kind ?? '']?.onFell === 'play') {
          sc.stageIx = i;
          sc.begun = false;
          sc.bar = null;
          sc.prompt = null;
          break;
        }
      }
    }
  }
  return true;
}

/** One seat-pressed cast landed (World.applyInputs) — the drill counts them. */
export function sceneNoteCast(w: World): void {
  if (w.scene) w.scene.casts++;
}

/** The DOM layer's card continue (probes call it directly — the engine
 *  never requires a DOM to finish a scene). */
export function sceneCardAck(w: World): void {
  const sc = w.scene;
  if (sc?.card) sc.cardAck = true;
}

// ---------------------------------------------------------- spawn plumbing --

/** One scene body: ringed off the hero, already hunting (the wave-frenzy
 *  overlay), and REWARDLESS — noBounty seals xp/loot/gems/orbs whole, the
 *  eventKey scopes it to the scene. */
function spawnSceneBody(w: World, sc: SceneRuntime, defId: string, level: number): Actor {
  const m = w.createMonster(defId, level, 'enemy');
  const at = w.swarmEntryPoint(w.player.pos, SCENE_CFG.entryBand);
  m.pos = w.clampPos(vec(at.x + rand(-30, 30), at.y + rand(-30, 30)), m.radius);
  if (WAVE_CFG.frenzy) w.applyWaveFrenzy(m, WAVE_CFG.frenzy);
  m.noBounty = true;
  m.eventKey = sc.eventKey;
  w.actors.push(m);
  return m;
}

function pourRows(w: World, sc: SceneRuntime, rows: SceneSpawnRow[], ids: number[]): void {
  for (const r of rows) {
    for (let i = 0; i < r.count; i++) {
      ids.push(spawnSceneBody(w, sc, r.def, r.level ?? w.zone.level).id);
    }
  }
}

function aliveOf(w: World, ids: number[]): number {
  let n = 0;
  for (const a of w.actors) if (!a.dead && ids.includes(a.id)) n++;
  return n;
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

// -------------------------------------------------------------- core kinds --

registerSceneStage('card', {
  onFell: 'play',
  begin(w, sc) {
    sc.fadeTarget = 1;
    sc.bar = null;
    sc.prompt = null;
  },
  update(w, sc, spec) {
    const s = spec as SceneCardStage;
    if (w.screenFade < 0.995) return false; // the dark arrives first
    if (!sc.card) {
      sc.card = s.card;
      sc.cardAck = false;
      // The whole sim holds under the card — a story page, not a pause menu.
      w.timeflow.hold({ id: SCENE_CFG.holdId, scale: 0, kind: 'cinematic' });
    }
    if (!sc.cardAck) return false;
    sc.card = null;
    return true;
  },
});

registerSceneStage('drill', {
  onFell: 'skip',
  begin(w, sc, spec) {
    w.timeflow.release(SCENE_CFG.holdId);
    sc.fadeTarget = 0;
    sc.barAt = (spec as SceneDrillStage).hud ?? 'hero';
    sc.state.goalIx = 0;
    sc.state.acc = 0;
    sc.state.castBase = sc.casts;
    sc.state.last = vec(w.player.pos.x, w.player.pos.y);
  },
  update(w, sc, spec, _dt) {
    const s = spec as SceneDrillStage;
    const st = sc.state as { goalIx: number; acc: number; castBase: number; last: Vec2 };
    // Footwork accrues on the hero's own displacement (jitter-floored) —
    // no input hook needed, the body's truth is the count.
    const p = w.player.pos;
    const step = dist(p, st.last);
    if (step > SCENE_CFG.moveEpsilon) st.acc += step;
    st.last = vec(p.x, p.y);
    let goal = s.goals[st.goalIx];
    let frac = 0;
    while (goal) {
      frac = goal.kind === 'move'
        ? Math.min(1, st.acc / goal.amount)
        : Math.min(1, (sc.casts - st.castBase) / goal.amount);
      if (frac < 1) break;
      st.goalIx++;
      st.acc = 0;
      st.castBase = sc.casts;
      st.last = vec(p.x, p.y);
      goal = s.goals[st.goalIx];
      frac = 0;
    }
    sc.bar = { label: s.label, frac: Math.min(1, (st.goalIx + frac) / Math.max(1, s.goals.length)) };
    sc.prompt = goal?.prompt ?? null;
    return st.goalIx >= s.goals.length;
  },
});

registerSceneStage('clash', {
  onFell: 'skip',
  begin(w, sc, spec) {
    const s = spec as SceneClashStage;
    sc.barAt = s.hud ?? 'hero';
    const ids: number[] = [];
    pourRows(w, sc, s.spawns, ids);
    sc.state.ids = ids;
    sc.state.clearedAt = null;
    if (s.announce) {
      w.text(vec(w.player.pos.x, w.player.pos.y - 60), s.announce, s.announceColor ?? '#c8b070', 14);
    }
  },
  update(w, sc, spec) {
    const s = spec as SceneClashStage;
    const st = sc.state as { ids: number[]; clearedAt: number | null };
    const alive = aliveOf(w, st.ids);
    if (s.label) {
      sc.bar = { label: s.label, frac: st.ids.length ? (st.ids.length - alive) / st.ids.length : 1 };
    }
    if (alive === 0 && st.clearedAt === null) st.clearedAt = sc.stageT;
    return st.clearedAt !== null && sc.stageT - st.clearedAt >= s.pauseSec;
  },
});

registerSceneStage('assault', {
  onFell: 'skip',
  begin(_w, sc, spec) {
    sc.barAt = (spec as SceneAssaultStage).hud ?? 'top';
    sc.state.next = 0;
    sc.state.lastPour = 0;
    sc.state.ids = [];
  },
  update(w, sc, spec) {
    const s = spec as SceneAssaultStage;
    const st = sc.state as { next: number; lastPour: number; ids: number[] };
    while (st.next < s.rows.length && sc.stageT >= s.rows[st.next].at) {
      const row = s.rows[st.next];
      pourRows(w, sc, row.spawns, st.ids);
      if (row.announce) {
        w.text(vec(w.player.pos.x, w.player.pos.y - 60), row.announce, row.announceColor ?? '#c8b070', 14);
      }
      st.lastPour = sc.stageT;
      st.next++;
    }
    // Past the script's tail, the last row REPOURS on its cadence — the
    // tide that never ebbs (the whole point of this road).
    const every = s.repeatLastEvery ?? 0;
    if (every > 0 && st.next >= s.rows.length && sc.stageT - st.lastPour >= every) {
      pourRows(w, sc, s.rows[s.rows.length - 1].spawns, st.ids);
      st.lastPour = sc.stageT;
    }
    if (s.label) sc.bar = { label: s.label, frac: Math.min(1, sc.stageT / s.surviveSec) };
    return sc.stageT >= s.surviveSec;
  },
});

registerSceneStage('reckoning', {
  onFell: 'play',
  begin(w, sc, spec) {
    const s = spec as SceneReckoningStage;
    // The executioner stands off in the dark — rewardless like every scene
    // body, posted so it holds its mark until the verb.
    const col = w.createMonster(s.def, s.level, 'enemy');
    const at = w.swarmEntryPoint(w.player.pos, [s.spawnDist, s.spawnDist + 60]);
    col.pos = w.clampPos(vec(at.x, at.y), col.radius);
    col.noBounty = true;
    col.eventKey = sc.eventKey;
    col.aiPost = vec(col.pos.x, col.pos.y);
    w.actors.push(col);
    // Everyone else stands still — actor-scoped, so the world keeps drawing
    // and the executioner's cast clock runs while the field holds its breath.
    w.timeflow.hold({
      id: SCENE_CFG.holdId, scale: 0, kind: 'cinematic',
      actors: { exceptIds: [col.id] },
    });
    sc.state.colId = col.id;
    sc.state.from = vec(w.player.pos.x, w.player.pos.y);
    sc.state.cast = false;
    sc.state.blastAt = null;
    sc.state.named = false;
    sc.bar = null;
    sc.prompt = null;
  },
  update(w, sc, spec, _dt) {
    const s = spec as SceneReckoningStage;
    const st = sc.state as {
      colId: number; from: Vec2; cast: boolean; blastAt: number | null; named: boolean;
    };
    const col = w.actors.find(a => a.id === st.colId);
    if (!col || col.dead) { sc.fadeTarget = 1; return w.screenFade >= 0.995; }
    // The pan: hero → executioner, eased, drawn == scripted (the renderer
    // follows sc.focus while it is set).
    const k = smooth(Math.min(1, sc.stageT / Math.max(0.01, s.panSec)));
    sc.focus = vec(
      st.from.x + (col.pos.x - st.from.x) * k,
      st.from.y + (col.pos.y - st.from.y) * k,
    );
    if (k >= 1 && !st.named) {
      st.named = true;
      w.text(vec(col.pos.x, col.pos.y - col.radius - 26), col.name, '#9fdc6a', 17);
    }
    if (!st.cast && sc.stageT >= s.panSec + s.dwellSec) {
      st.cast = true;
      const inst = col.skills.find(x => x?.def.id === s.verb)
        ?? (SKILLS[s.verb] ? makeSkillInstance(SKILLS[s.verb], 1) : null);
      if (inst) w.useSkill(col, inst, vec(col.pos.x, col.pos.y));
      else console.warn(`[scenes] reckoning verb '${s.verb}' is not a registered skill`);
    }
    if (st.cast && st.blastAt === null && !col.casting) {
      // The verb has resolved — the field is felled (the covenant caught the
      // hero at the one death chokepoint; the horde it spent honestly).
      st.blastAt = sc.stageT;
      w.shake = Math.max(w.shake, SCENE_CFG.blastShake);
    }
    if (st.blastAt !== null && sc.stageT - st.blastAt >= s.blastWaitSec) {
      sc.fadeTarget = 1;
      if (w.screenFade >= 0.995) { sc.focus = null; return true; }
    }
    return false;
  },
});

registerSceneStage('home', {
  onFell: 'play',
  begin(w, sc) {
    // Teardown, whole: release the hold, heal the hero for the wake, walk
    // the one surface road home (this unwinds the off-graph return state and
    // discards the staging zone's actors with the zone), and delete the
    // minted ground so not even the session cache remembers it.
    w.timeflow.release(SCENE_CFG.holdId);
    sc.focus = null;
    const p = w.player;
    p.invulnerable = false;
    p.untargetable = false;
    p.life = p.maxLife();
    p.fillResources();
    w.loadZone(START_ZONE);
    delete w.caveMap[sc.zoneId];
    // COMPLETION is the only stamp that counts: the scene never plays again,
    // and the RUN begins here — its first save (charDirty → the shell's
    // prompt persist) is this bedside wake, never a scene beat.
    if (!(w.account.ledger[sc.def.ledger] ?? 0)) bumpLedger(w.account.ledger, sc.def.ledger);
    w.accountDirty = true;
    w.charDirty = true;
    sc.fadeTarget = 0;
  },
  update(w, sc) {
    if (w.screenFade > 0.005) return false;
    endScene(w, sc);
    return false; // endScene nulled the runtime — nothing left to advance
  },
});
