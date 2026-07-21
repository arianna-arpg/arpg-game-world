// ---------------------------------------------------------------------------
// THE TIMEFLOW FABRIC — time itself as an open, composable dial.
//
// One registry of TIME HOLDS bends how fast the sim experiences this frame:
//   • WORLD holds (no `actors` filter) scale the ENTIRE sim — World.update
//     multiplies its dt by the fold, so scale 0 is a true pause (menus), a
//     fraction is world slow-motion, >1 is fast-forward. The renderer keeps
//     drawing: a held world is a living picture, not a black screen.
//   • ACTOR holds (`actors` filter) bend individual bodies: a chronomancer's
//     Time Stop is a scale-0 hold exempting the caster's circle — every
//     other body (and its projectiles in flight) hangs mid-air while the
//     exempt walk the frozen world. Filters are plain data (ids/teams), so
//     skills, monsters, procs and scripts can all mint them.
//   • STATUS time (StatusDef.timeScale) rides the same fold per actor: a
//     `stasis` ailment is "this body's clock at 0" — reachable from every
//     fabric that can apply a status (skill effects, procs, fog banks,
//     ground, monster kits) with zero new engine code.
//
// WHO CONSUMES THE FOLD:
//   World.update       — dt ×= beginFrame(raw) at the top (world scale);
//                        the per-actor loop shadows dt with actorScale(a).
//   updateAI (ai.ts)   — scaleFor(actor) gates/bends thinking.
//   World.applyInputs  — a held seat's intent is inert (frozen players
//                        neither move nor cast; the MENUS still work).
//   updateProjectiles  — each projectile flies on its CASTER's clock.
//
// THE CLOCK RULES (the part worth reading twice):
//   Holds age on RAW frame seconds — a freeze must be able to expire out of
//   the very clock it stopped. The one exception: while a `kind: 'menu'`
//   hard hold (scale 0) is up, NOTHING ages — the pause menu stops the
//   universe, magic included. Chrono statuses follow the same law: their
//   `remaining` burns on unbent seconds (Actor.updateTimers' chronoDt /
//   Actor.tickChronoStatuses), so stasis always lets go on schedule.
//
// POLICY: menus only hard-pause when the injected `allowHold` says so —
// main.ts wires it to "no live co-op peers" (a shared world is never one
// player's to stop). TIME_CFG.surfaces is the open registry of DOM surfaces
// that hold the world while open; add or delete entries freely.
// ---------------------------------------------------------------------------

import { STATUS_DEFS } from './status';
import type { Team } from './actor';

/** The slice of Actor the fold needs — structural, so timeflow never imports
 *  the full class (and headless/QA fakes stay trivial to build). */
export interface TimeBody {
  id: number;
  team: Team;
  owner?: TimeBody | null;
  statuses: { id: string }[];
}

/** Which bodies an actor-scoped hold bends — plain serializable data, so any
 *  fabric (skill spec, monster def, script, console) can author one. */
export interface ActorTimeFilter {
  /** These actor ids ride exempt (the chronomancer walking their own stop). */
  exceptIds?: number[];
  /** Anything OWNED by these ids rides exempt too (the caster's minions —
   *  including ones summoned mid-hold, which is why this isn't an id list). */
  exceptOwnedBy?: number[];
  /** A whole team rides exempt (a warband chronomancer frees its kin). */
  exceptTeam?: Team;
  /** Restrict the bend to one team only (freeze THEM, nobody else). */
  onlyTeam?: Team;
}

/** Renderer feedback while a hold is live — pure data, drawn by
 *  Renderer.drawTimeflow. Omit for surfaces that cover the screen anyway. */
export interface TimeHudSpec {
  /** Full-screen wash (any CSS color; keep the alpha subtle). */
  tint?: string;
  /** A quiet banner naming the moment ("Time Stop"). */
  label?: string;
}

/** One live bend on the flow of time. */
export interface TimeHold {
  /** Unique handle — re-holding the same id REPLACES (refresh semantics). */
  id: string;
  /** 0 = stopped, (0,1) slow-motion, 1 = inert, >1 = accelerated. */
  scale: number;
  /** Grouping/policy tag. 'menu' hard holds (scale 0) also suspend OTHER
   *  holds' aging — the true pause. 'skill', 'cinematic', … are yours. */
  kind?: string;
  /** Lifetime in RAW seconds (see clock rules above). Omit = held until
   *  release() — what DOM surfaces use. */
  duration?: number;
  /** Omit = world-scoped (the whole sim). Set = only matching actors bend. */
  actors?: ActorTimeFilter;
  hud?: TimeHudSpec;
}

/** SkillDef.chrono — a cast that bends time, resolved by World.executeSkill
 *  into a TimeHold. `exempt` names the caster's circle: 'caster' walks
 *  alone, 'pack' brings everything it owns (default), 'team' frees its
 *  whole side, 'none' holds even the caster (a trap, not a blessing). */
export interface ChronoSpec {
  scale: number;
  /** RAW seconds; scaled by the caster's effectDuration investment. */
  duration: number;
  exempt?: 'caster' | 'pack' | 'team' | 'none';
  /** Bend the WHOLE sim instead of actors-only (menus/cinematics territory —
   *  most skills want actor scope so the exempt circle stays live). */
  world?: boolean;
  hud?: TimeHudSpec;
}

/** Central levers. Every consumer reads these — never inline the numbers. */
export const TIME_CFG = {
  /** DOM surfaces that HOLD the world while open. ui/panels.ts pushes the
   *  entry through World.timeflow.holdSurface(id) on open and releases on
   *  close; a missing id means that surface leaves time alone. All 'menu'
   *  kind entries are subject to the allowHold policy (solo-only by
   *  default) and are auto-released if a co-op peer joins mid-hold. */
  surfaces: {
    'menu:escape': { scale: 0, kind: 'menu' },
    // The couch join ceremony (main.ts) — the claim veil is a modal; the
    // world must not fight the hero while a second player picks up a pad.
    // Solo-only like every 'menu' hold: a LIVE couch keeps the world
    // running through the allowHold policy, exactly as the pause does.
    'menu:couchJoin': { scale: 0, kind: 'menu' },
    // The in-run vocation offer — an Ultimatum-style "decide at leisure"
    // freeze. Delete this line to let the world breathe during the choice.
    'menu:vocation': {
      scale: 0, kind: 'menu',
      hud: { tint: 'rgba(18,24,38,0.30)', label: 'time holds' },
    },
  } as Record<string, { scale: number; kind?: string; hud?: TimeHudSpec }>,
} as const;

export class Timeflow {
  /** Live holds, insertion-ordered (the newest with a hud wins the overlay). */
  private holds: TimeHold[] = [];
  /** The fabric's own RAW clock — advanced by beginFrame, frozen only by a
   *  'menu' hard hold. Hold expiries are absolute marks on this clock. */
  age = 0;
  private untils = new Map<string, number>();
  /** Folded world scale, recomputed on any change + each beginFrame. */
  private worldScale_ = 1;
  /** Policy gate for 'menu'-kind holds — injected by the shell (main.ts
   *  wires "no live co-op peers"); everything else always may hold. */
  allowHold: (hold: TimeHold) => boolean = () => true;

  /** Any hold at all live? (Cheap outer gate for hot paths.) */
  get active(): boolean { return this.holds.length > 0; }

  /** Push (or refresh — same id replaces) a hold. Returns whether it took;
   *  a 'menu' hold the policy refuses is a clean no-op. */
  hold(h: TimeHold): boolean {
    if (h.kind === 'menu' && !this.allowHold(h)) return false;
    this.release(h.id);
    this.holds.push(h);
    if (h.duration !== undefined) this.untils.set(h.id, this.age + h.duration);
    this.refold();
    return true;
  }

  /** Open a TIME_CFG.surfaces entry by id (the UI's one-liner). Unknown ids
   *  are a no-op by design — deleting a surface from the config is the off
   *  switch, no call sites to chase. */
  holdSurface(id: string): boolean {
    const spec = TIME_CFG.surfaces[id];
    return spec ? this.hold({ id, ...spec }) : false;
  }

  /** Drop a hold by id (idempotent). */
  release(id: string): void {
    const i = this.holds.findIndex(h => h.id === id);
    if (i < 0) return;
    this.holds.splice(i, 1);
    this.untils.delete(id);
    this.refold();
  }

  /** Drop every hold of a kind — how a co-op join sweeps 'menu' pauses. */
  releaseKind(kind: string): void {
    if (!this.holds.length) return;
    for (let i = this.holds.length - 1; i >= 0; i--) {
      if (this.holds[i].kind !== kind) continue;
      this.untils.delete(this.holds[i].id);
      this.holds.splice(i, 1);
    }
    this.refold();
  }

  /** Once per frame, BEFORE consuming any scale: age holds on the raw frame
   *  seconds (unless a 'menu' hard hold has the universe stopped), expire
   *  the due, and return the folded WORLD scale for this frame. */
  beginFrame(rawDt: number): number {
    if (this.holds.length) {
      const hardMenu = this.holds.some(h => h.kind === 'menu' && h.scale <= 0);
      if (!hardMenu) {
        this.age += rawDt;
        let dropped = false;
        for (let i = this.holds.length - 1; i >= 0; i--) {
          const until = this.untils.get(this.holds[i].id);
          if (until !== undefined && this.age >= until) {
            this.untils.delete(this.holds[i].id);
            this.holds.splice(i, 1);
            dropped = true;
          }
        }
        if (dropped) this.refold();
      }
    }
    return this.worldScale_;
  }

  /** The folded WORLD scale (world-scoped holds only). 1 when quiet. */
  worldScale(): number { return this.worldScale_; }

  /** This body's OWN rate on top of the world scale — actor-scoped holds ×
   *  status time (StatusDef.timeScale). For consumers already inside a
   *  world-scaled dt (World.update's actor loop, projectiles). */
  actorScale(a: TimeBody): number {
    let s = 1;
    for (const h of this.holds) {
      if (h.actors && this.matches(a, h.actors)) s *= h.scale;
    }
    if (a.statuses.length) {
      for (const st of a.statuses) {
        const ts = STATUS_DEFS[st.id]?.timeScale;
        if (ts !== undefined) s *= ts;
      }
    }
    return s;
  }

  /** The body's FULL rate against raw frame time (world × actor) — for
   *  consumers fed unscaled dt (updateAI, applyInputs). */
  scaleFor(a: TimeBody): number {
    const s = this.actorScale(a);
    return this.worldScale_ === 1 ? s : this.worldScale_ * s;
  }

  /** The hud spec to draw this frame: the NEWEST live hold carrying one
   *  (a skill stop outranks the ambient surface wash it interrupted). */
  overlay(): TimeHudSpec | null {
    for (let i = this.holds.length - 1; i >= 0; i--) {
      if (this.holds[i].hud) return this.holds[i].hud!;
    }
    return null;
  }

  private matches(a: TimeBody, f: ActorTimeFilter): boolean {
    if (f.onlyTeam && a.team !== f.onlyTeam) return false;
    if (f.exceptTeam && a.team === f.exceptTeam) return false;
    if (f.exceptIds && f.exceptIds.includes(a.id)) return false;
    if (f.exceptOwnedBy && a.owner && f.exceptOwnedBy.includes(a.owner.id)) return false;
    return true;
  }

  private refold(): void {
    let s = 1;
    for (const h of this.holds) if (!h.actors) s *= h.scale;
    this.worldScale_ = s;
  }
}
