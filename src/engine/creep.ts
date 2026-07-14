// ---------------------------------------------------------------------------
// THE CREEP FABRIC — living ground membrane that spreads from sources.
//
// Creep is not a doodad and not a region: it is an organism's SKIN laid over
// the zone floor — anchored patches that grow outward from a heart, breathe
// in place, and recoil when their heart dies. The drawn membrane IS the hit
// surface: an actor standing on live creep (cover above the honesty floor)
// wears the kind's granted statuses, refreshed while on it and lingering
// briefly after stepping off — the fog fabric's exact contract, grounded.
//
// Everything is data:
//   - CreepDef rows (CREEPS registry) describe a creep KIND: its look (the
//     render layer bakes membrane/veins/nodes from the same fields), its
//     spread grammar (reach/spread/recede/lobing), and what it grants to
//     whom (team/faction filters, plus notFactions for "everyone but its
//     own kind" — the invader's skin resents every other boot).
//   - ZoneCreepSpec on a ZoneTheme says which kinds a zone grows ambiently
//     and how many pockets. No spec = no ambient creep.
//   - RUNTIME SOURCES are the package/monster seam: World.creepEnsure()
//     lazily builds an empty field anywhere, addSource() plants a patch
//     (optionally BOUND to an actor — kill the heart, the skin recoils),
//     cleanseAt() force-recedes hearts in a radius (payoff hooks).
//
// Design constraints honored here (the fog fabric's contracts):
//   - PURE LEAF: no engine imports — world.ts and the renderer consume it
//     through small structural types.
//   - SEED DISCIPLINE: ambient pockets roll on a SALTED copy of the zone
//     seed (CREEP_CFG.salt) and never advance the layout stream — adding
//     creep to a tileset cannot move a doodad, spawn or baseline metric.
//   - TRANSIENCE: rebuilt each loadZone like all ambient texture; nothing
//     serializes. Durable overlays that spread creep re-plant on enter.
//   - HONEST EDGES: coverAt() and the baked sprite share ONE rim function
//     (rimAt) — the membrane grants exactly where it visibly lies.
// ---------------------------------------------------------------------------

interface Vec2Like { x: number; y: number }

/** The slice of Rng this module uses (structurally typed so the leaf stays
 *  import-free; World passes the real core/rng instance shape). */
interface CreepRng {
  next(): number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
}

/** The slice of Actor the creep needs to dress someone. */
export interface CreepActorLike {
  pos: Vec2Like;
  radius: number;
  dead: boolean;
  team: string;
  untargetable?: boolean;
  construct?: unknown;
  flying?: boolean;
  faction?: string;
  applyStatus(id: string, dps: number, magnitude: number, source: string): void;
}

// --- Defs -------------------------------------------------------------------

/** One gift the membrane grants to occupants standing on live creep. Filters
 *  are optional and conjunctive. `notFactions` excludes — the idiomatic pair
 *  is one grant FOR the organism's faction and one against everyone else.
 *  Statuses should keep SHORT durations (0.6–2s) — the refresh-while-on /
 *  linger-on-exit idiom of terrain statuses. */
export interface CreepGrant {
  status: string;
  /** Limit to these teams ('player' | 'enemy' | …). */
  teams?: readonly string[];
  /** Limit to these monster factions (the skin feeds its own). */
  factions?: readonly string[];
  /** Exclude these factions (the skin mires everyone ELSE). */
  notFactions?: readonly string[];
}

/** A creep KIND — pure data. Look fields feed the render bake (membrane
 *  body, rim lip, vein filaments, glow nodes); spread fields are the whole
 *  life grammar: patches grow a front outward at `spread`, hold and breathe,
 *  and recoil at `recede` when their heart dies or a payoff cleanses them. */
export interface CreepDef {
  id: string;
  /** Membrane body tint (the render layer darkens toward the heart). */
  color?: string;
  /** Rim lip tint — the bright(er) welt where skin meets stone. */
  rim?: string;
  /** Vein filament tint. */
  vein?: string;
  /** Glow tint: node freckles + the live pulse front riding heart→rim. */
  glow?: string;
  /** Peak body opacity, 0..1. */
  alpha?: number;
  /** Patch reach roll (world units, heart to mean rim). */
  reach?: [number, number];
  /** Rim waviness 0..1 — 0 a disc, 0.35 a lobed ameboid skirt. */
  lobing?: number;
  /** Front advance speed while growing, units/sec. */
  spread?: number;
  /** Front recoil speed while dying, units/sec (skin recoils faster than
   *  it crawls; default spread × 1.6). */
  recede?: number;
  /** Heartbeat rate multiplier for the breathing/pulse (1 = the warren's). */
  pulse?: number;
  /** Vein filament count roll (render). */
  veins?: [number, number];
  /** Glow-node freckle density 0..1 (render; keep SPARSE — the unease is
   *  in the noticing, not the counting). */
  nodes?: number;
  /** Minimum cover that still counts as "on creep" for gameplay
   *  (default CREEP_CFG.hitFloor) — the thinning rim stops granting first. */
  hitFloor?: number;
  /** Statuses granted to occupants of live creep. */
  grants?: readonly CreepGrant[];
}

/** What a zone grows ambiently — lives on ZoneTheme.creep. Pocket count
 *  rolls once per visit on the salted stream; kinds are a weighted table. */
export interface ZoneCreepSpec {
  pockets: [number, number];
  kinds: readonly { id: string; weight?: number }[];
}

/** The registry of record. A new creep kind is one registerCreep row —
 *  consumers look up by id, nothing enumerates. */
export const CREEPS: Record<string, CreepDef> = {};

export function registerCreep(def: CreepDef): void {
  if (CREEPS[def.id]) console.warn(`[creep] re-registering kind '${def.id}' — overriding`);
  CREEPS[def.id] = def;
}

/** BOOT VALIDATION (wired into validateContent beside validateFog):
 *  every grant names a real status; specs name registered kinds. */
export function validateCreep(
  hasStatus: (id: string) => boolean,
  themeSpecs: readonly { owner: string; spec: ZoneCreepSpec }[],
): string[] {
  const bad: string[] = [];
  for (const [id, def] of Object.entries(CREEPS)) {
    for (const g of def.grants ?? []) {
      if (!hasStatus(g.status)) bad.push(`creep '${id}': grant names unknown status '${g.status}'`);
    }
    if ((def.lobing ?? 0) > 0.6) bad.push(`creep '${id}': lobing ${def.lobing} — rims past 0.6 self-intersect`);
  }
  for (const { owner, spec } of themeSpecs) {
    for (const k of spec.kinds) {
      if (!CREEPS[k.id]) bad.push(`${owner}: creep spec names unregistered kind '${k.id}'`);
    }
    if (!spec.kinds.length && spec.pockets[1] > 0) bad.push(`${owner}: creep spec rolls pockets but lists no kinds`);
  }
  return bad;
}

// --- Tunables ----------------------------------------------------------------

export const CREEP_CFG = {
  /** XOR salt for the field's own rng stream (never the layout stream). */
  salt: 0x0c4ee9b1,
  /** Seconds between status sweeps (statuses last ≥0.6s; 4Hz is plenty). */
  applyEvery: 0.25,
  /** Default live-cover floor for the hit test. */
  hitFloor: 0.3,
  /** Cover holds full strength inside this fraction of the rim, then thins
   *  to nothing at the rim — ONE profile shared by hit test and bake. */
  bodyFrac: 0.78,
  /** Ambient pocket anchor candidates per placement (best-candidate spread). */
  anchorTries: 10,
  /** Sources the field will hold at once (addSource past this returns null —
   *  a runaway spreader saturates instead of drowning the zone). */
  maxSources: 24,
  /** A receding front thinner than this is removed outright. */
  minReach: 5,
  /** Floating-source label statuses wear. */
  sourceLabel: 'the creep',
  /** Defaults folded under sparse defs. */
  def: {
    color: '#241a2c', rim: '#5a4468', vein: '#4a3258', glow: '#8a6ab0',
    alpha: 0.78, reach: [120, 220] as [number, number], lobing: 0.3,
    spread: 26, pulse: 1, veins: [5, 9] as [number, number], nodes: 0.35,
  },
};

// --- Live state ---------------------------------------------------------------

/** One rim harmonic: integer frequency keeps the skirt seamless at 0/2π. */
export interface RimHarm { k: number; a: number; p: number }

/** The rim modulation at a bearing — THE shared shape truth: the field's
 *  hit test multiplies the live front by it, and the render bake traces the
 *  same product at full reach (scaling preserves it exactly). */
export function creepRimMul(harm: readonly RimHarm[], ang: number): number {
  let m = 1;
  for (const h of harm) m += h.a * Math.sin(h.k * ang + h.p);
  return m;
}

export type CreepSourceState = 'grow' | 'hold' | 'recede';

export interface CreepSource {
  def: CreepDef;
  pos: { x: number; y: number };
  /** Full-grown mean rim distance. */
  maxReach: number;
  /** Live front distance — grows, holds, recoils. THE size. */
  cur: number;
  state: CreepSourceState;
  /** Rim personality (rolled once; bake + hit test share it). */
  harm: RimHarm[];
  /** Bake key personality + pulse stagger. */
  seed: number;
  phase: number;
  /** Kill the heart, the skin recoils: checked each tick when set. */
  boundTo: { dead: boolean } | null;
  /** Theme-grown pockets (born full, never recede on their own). */
  ambient: boolean;
  /** Broad-phase bound: cur × the rim function's ceiling. */
  bound: number;
}

// --- The field ----------------------------------------------------------------

export class CreepField {
  readonly sources: CreepSource[] = [];
  private rng: CreepRng;
  private w: number;
  private h: number;
  private applyAcc = 0;

  constructor(rng: CreepRng, w: number, h: number) {
    this.rng = rng;
    this.w = w;
    this.h = h;
  }

  /** Plant a patch. `reach` overrides the def roll; `bornFrac` starts the
   *  front part-grown (ambient pockets are born full); `boundTo` ties the
   *  patch's life to an actor-like (the creep-heart contract). Returns null
   *  at the source cap — a saturated field refuses politely. */
  addSource(
    def: CreepDef,
    x: number,
    y: number,
    opts?: { reach?: number; bornFrac?: number; boundTo?: { dead: boolean } | null; ambient?: boolean },
  ): CreepSource | null {
    if (this.sources.length >= CREEP_CFG.maxSources) return null;
    // Hearts keep inside the arena — a package planting at the very lip
    // still grows a patch the zone can actually walk.
    x = Math.min(this.w - 8, Math.max(8, x));
    y = Math.min(this.h - 8, Math.max(8, y));
    const d = CREEP_CFG.def;
    const maxReach = opts?.reach ?? this.rng.range(...(def.reach ?? d.reach));
    const lobing = def.lobing ?? d.lobing;
    // Three integer-frequency harmonics, amplitudes descending, sum ≤ lobing/2
    // each side of the mean — the ameboid skirt that never self-crosses.
    const harm: RimHarm[] = [];
    let amp = lobing * 0.5;
    for (let i = 0; i < 3; i++) {
      harm.push({
        k: this.rng.int(2 + i, 4 + i * 2),
        a: amp * this.rng.range(0.55, 0.85),
        p: this.rng.range(0, Math.PI * 2),
      });
      amp *= 0.45;
    }
    const born = Math.max(0, Math.min(1, opts?.bornFrac ?? 0));
    const src: CreepSource = {
      def,
      pos: { x, y },
      maxReach,
      cur: Math.max(born * maxReach, born > 0 ? CREEP_CFG.minReach : 0.01),
      state: born >= 1 ? 'hold' : 'grow',
      harm,
      seed: (this.rng.next() * 0xffffffff) >>> 0,
      phase: this.rng.range(0, Math.PI * 2),
      boundTo: opts?.boundTo ?? null,
      ambient: opts?.ambient ?? false,
      bound: 0,
    };
    this.refreshBound(src);
    this.sources.push(src);
    return src;
  }

  /** The ONE rim function: live front distance modulated by the source's
   *  harmonics at a bearing (creepRimMul — shared with the render bake).
   *  Ceiling = cur × (1 + Σa) — refreshBound keeps the broad phase honest. */
  rimAt(src: CreepSource, ang: number): number {
    return src.cur * creepRimMul(src.harm, ang);
  }

  private refreshBound(src: CreepSource): void {
    let sum = 0;
    for (const h of src.harm) sum += h.a;
    src.bound = src.cur * (1 + sum) + 4;
  }

  /** Cover from ONE source at a point: 1 over the body, thinning to 0 at
   *  the visible rim (bodyFrac profile — shared with the bake's gradient). */
  private sourceCover(src: CreepSource, x: number, y: number, pad: number): number {
    const dx = x - src.pos.x, dy = y - src.pos.y;
    const dd = dx * dx + dy * dy;
    const broad = src.bound + pad;
    if (dd > broad * broad) return 0;
    const rim = this.rimAt(src, Math.atan2(dy, dx)) + pad;
    if (rim <= 0.001) return 0;
    const f = Math.sqrt(dd) / rim;
    if (f >= 1) return 0;
    const body = CREEP_CFG.bodyFrac;
    if (f <= body) return 1;
    const t = (1 - f) / (1 - body);
    return t * t * (3 - 2 * t);
  }

  /** Peak live cover at a point, 0..1 (renderer grades, AI curiosity). */
  coverAt(x: number, y: number, pad = 0): number {
    let best = 0;
    for (const s of this.sources) {
      const c = this.sourceCover(s, x, y, pad);
      if (c > best) best = c;
    }
    return best;
  }

  /** Is this point on live creep at all? (The gameplay predicate.) */
  onCreep(x: number, y: number, pad = 0): boolean {
    for (const s of this.sources) {
      const floor = s.def.hitFloor ?? CREEP_CFG.hitFloor;
      if (this.sourceCover(s, x, y, pad) >= floor) return true;
    }
    return false;
  }

  /** The nearest source heart with any live front (AI steering, payoffs). */
  nearestSource(x: number, y: number): CreepSource | null {
    let best: CreepSource | null = null;
    let bestD = Infinity;
    for (const s of this.sources) {
      if (s.cur < CREEP_CFG.minReach) continue;
      const dd = (s.pos.x - x) * (s.pos.x - x) + (s.pos.y - y) * (s.pos.y - y);
      if (dd < bestD) { bestD = dd; best = s; }
    }
    return best;
  }

  /** Force-recede every source whose heart lies within `r` (cleanse payoffs
   *  — the incursion collapses, the skin everywhere near recoils). */
  cleanseAt(x: number, y: number, r: number): number {
    let hit = 0;
    for (const s of this.sources) {
      const dd = (s.pos.x - x) * (s.pos.x - x) + (s.pos.y - y) * (s.pos.y - y);
      if (dd <= r * r && s.state !== 'recede') { s.state = 'recede'; hit++; }
    }
    return hit;
  }

  /** The living tick: fronts advance/recoil, bound hearts are watched, then
   *  the occupants dress on the apply cadence. No rng draws, no allocation. */
  update(dt: number, _time: number, actors: readonly CreepActorLike[]): void {
    const d = CREEP_CFG.def;
    for (let i = this.sources.length - 1; i >= 0; i--) {
      const s = this.sources[i];
      if (s.boundTo?.dead && s.state !== 'recede') s.state = 'recede';
      if (s.state === 'grow') {
        s.cur += (s.def.spread ?? d.spread) * dt;
        if (s.cur >= s.maxReach) { s.cur = s.maxReach; s.state = 'hold'; }
        this.refreshBound(s);
      } else if (s.state === 'recede') {
        s.cur -= (s.def.recede ?? (s.def.spread ?? d.spread) * 1.6) * dt;
        if (s.cur <= CREEP_CFG.minReach) { this.sources.splice(i, 1); continue; }
        this.refreshBound(s);
      }
    }
    this.applyAcc += dt;
    if (this.applyAcc >= CREEP_CFG.applyEvery) {
      this.applyAcc = 0;
      this.dressOccupants(actors);
    }
  }

  private dressOccupants(actors: readonly CreepActorLike[]): void {
    if (!this.sources.length) return;
    for (const a of actors) {
      if (a.dead || a.untargetable || a.construct || a.flying) continue;
      for (const s of this.sources) {
        const grants = s.def.grants;
        if (!grants?.length) continue;
        const floor = s.def.hitFloor ?? CREEP_CFG.hitFloor;
        if (this.sourceCover(s, a.pos.x, a.pos.y, a.radius * 0.5) < floor) continue;
        for (const g of grants) {
          if (g.teams && !g.teams.includes(a.team)) continue;
          if (g.factions && (!a.faction || !g.factions.includes(a.faction))) continue;
          if (g.notFactions && a.faction && g.notFactions.includes(a.faction)) continue;
          a.applyStatus(g.status, 0, 1, CREEP_CFG.sourceLabel);
        }
      }
    }
  }
}

/** Build a zone's ambient field from its theme spec: pockets born full at
 *  best-candidate-spread anchors (each new pocket favors the try farthest
 *  from every placed one — coverage without clumping). Returns null when
 *  the zone grows nothing ambiently; runtime seams use World.creepEnsure. */
export function buildZoneCreep(
  spec: ZoneCreepSpec | undefined,
  arena: { w: number; h: number; boundless?: boolean },
  rng: CreepRng,
): CreepField | null {
  if (!spec || !spec.kinds.length) return null;
  if (arena.boundless) return null; // streamed arenas have no stable bounds to skin
  const field = new CreepField(rng, arena.w, arena.h);
  const n = rng.int(spec.pockets[0], spec.pockets[1]);
  let total = 0;
  for (const k of spec.kinds) total += k.weight ?? 1;
  const placed: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    let roll = rng.range(0, total);
    let pick = spec.kinds[spec.kinds.length - 1];
    for (const k of spec.kinds) {
      roll -= k.weight ?? 1;
      if (roll <= 0) { pick = k; break; }
    }
    const def = CREEPS[pick.id];
    if (!def) continue;
    const reach = rng.range(...(def.reach ?? CREEP_CFG.def.reach));
    const inset = Math.min(reach + 60, Math.min(arena.w, arena.h) * 0.3);
    let best: { x: number; y: number } | null = null;
    let bestScore = -1;
    for (let t = 0; t < CREEP_CFG.anchorTries; t++) {
      const p = { x: rng.range(inset, arena.w - inset), y: rng.range(inset, arena.h - inset) };
      let score = rng.next() * 80;
      let nearest = Infinity;
      for (const q of placed) {
        const dd = Math.hypot(q.x - p.x, q.y - p.y);
        if (dd < nearest) nearest = dd;
      }
      if (nearest < Infinity) score += Math.min(nearest, 1400);
      else score += 1400;
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (!best) continue;
    placed.push(best);
    field.addSource(def, best.x, best.y, { bornFrac: 1, ambient: true });
  }
  return field.sources.length ? field : null;
}
