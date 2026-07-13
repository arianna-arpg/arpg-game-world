// ---------------------------------------------------------------------------
// THE FOG FABRIC — living, roaming fog banks.
//
// A fog bank is not a doodad: it is a breathing MASS of soft lobes that
// drifts across the zone, coils, swells, thins at its edges and eventually
// dissipates entirely — then gathers again somewhere new. The drawn fog IS
// the hit surface: an actor standing inside a LIVE lobe (dense enough to
// read) wears the bank's granted statuses, refreshed while inside, lingering
// briefly after stepping out (the statuses' own short durations — the exact
// contract the old static fog_bank doodads kept via region standStatus).
// Because the hit test tracks the living shape, anything — player, monster,
// minion — can travel WITH a bank to keep its gift, and loses it where the
// edge dissipates. Fights ride the weather.
//
// Everything is data:
//   - FogBankDef rows (FOG_BANKS registry) describe a fog KIND: its look,
//     its motion grammar (drift/meander/swirl/breathe/churn), its lifecycle,
//     what it grants to whom, and what ground it HAUNTS (water banks roll
//     along rivers; grave-mist pools among headstones).
//   - ZoneFogSpec on a ZoneTheme says which kinds a zone breathes and how
//     many. No spec = no authored fog; a 'fog' WEATHER front breeds sky-born
//     banks over any open-sky zone regardless, so the world's weather stays
//     one system end to end.
//
// Design constraints honored here:
//   - PURE LEAF: no engine imports (the drives.ts / Reputation pattern) —
//     world.ts and the renderer consume it through small structural types.
//   - SEED DISCIPLINE: the field rolls on a SALTED copy of the zone seed
//     (FOG_CFG.salt) and never advances the layout stream — adding fog to a
//     tileset cannot move a single doodad, spawn or baseline metric.
//   - TRANSIENCE: banks are ambient texture, rebuilt each loadZone like all
//     zone-local runtime (worldstate doctrine); nothing serializes.
// ---------------------------------------------------------------------------

interface Vec2Like { x: number; y: number }

/** The slice of Rng this module uses (structurally typed so the leaf stays
 *  import-free; World passes the real core/rng instance shape). */
interface FogRng {
  next(): number;
  range(lo: number, hi: number): number;
  int(lo: number, hi: number): number;
}

/** The slice of Actor the fog needs to dress someone. */
export interface FogActorLike {
  pos: Vec2Like;
  radius: number;
  dead: boolean;
  team: string;
  untargetable?: boolean;
  construct?: unknown;
  faction?: string;
  applyStatus(id: string, dps: number, magnitude: number, source: string): void;
}

/** The slice of Doodad the haunt scorer reads. */
export interface FogDoodadLike { pos: Vec2Like; radius: number; kind: string }

// --- Defs -------------------------------------------------------------------

/** One gift the bank grants to occupants standing in live fog. Filters are
 *  optional and conjunctive: omit both and everyone breathing the fog wears
 *  it (the classic fogveiled). Statuses should keep SHORT durations (0.6–2s)
 *  — the refresh-while-inside / linger-on-exit idiom of terrain statuses. */
export interface FogGrant {
  status: string;
  /** Limit to these teams ('player' | 'enemy' | …). */
  teams?: readonly string[];
  /** Limit to these monster factions (undead mist that feeds the dead). */
  factions?: readonly string[];
}

/** What ground a fog kind clings to. Anchors score toward the named doodad
 *  kinds, and `along` banks drift down the local chain of that ground — mist
 *  ROLLING along a riverbank instead of wandering off it. */
export interface FogHaunt {
  kinds: readonly string[];
  /** 0..1 anchor pull toward haunted ground (default 0.75). */
  pull?: number;
  /** Drift along the haunted ground's local tangent (river-roll). */
  along?: boolean;
}

/** A fog KIND — pure data. Motion fields are the whole choreography:
 *  drift carries the mass, meander wanders its heading, swirl orbits the
 *  lobes about the heart, breathe pulses their reach, churn waxes/wanes each
 *  lobe's density so the outline never repeats. Life + rampFrac make banks
 *  gather → sustain → dissipate → re-gather elsewhere (the weather-front
 *  intensity triangle, per-bank). */
export interface FogBankDef {
  id: string;
  /** Render tint. */
  color?: string;
  /** Peak core density, 0..1 (render alpha ceiling; hit test reads lobes). */
  alpha?: number;
  /** Bank reach roll (world units). */
  radius?: [number, number];
  /** Lobe count roll. */
  lobes?: [number, number];
  /** Drift speed roll, units/sec. */
  drift?: [number, number];
  /** Heading wander, radians/sec of slow sway (default 0.22). */
  meander?: number;
  /** Lobe orbit about the heart, radians/sec (default 0.05). */
  swirl?: number;
  /** Lobe radius pulse fraction (default 0.16). */
  breathe?: number;
  /** Per-lobe density wax/wane speed, cycles-ish/sec (default 0.32). */
  churn?: number;
  /** Seconds per gather→dissipate cycle (roll); the bank re-anchors after. */
  life?: [number, number];
  /** Fraction of life spent fading in/out (default 0.3 — fog seeps). */
  rampFrac?: number;
  /** Share of density drawn ABOVE actors (the tall haze pass; default 0.35). */
  overFrac?: number;
  /** Minimum lobe density that still counts as "inside" for gameplay
   *  (default FOG_CFG.hitAlpha) — dissipating edges stop granting first. */
  hitAlpha?: number;
  /** Statuses granted to occupants of live fog. */
  grants?: readonly FogGrant[];
  /** Ground this kind clings to / rolls along. */
  haunt?: FogHaunt;
}

/** What a zone breathes — lives on ZoneTheme.fog. Counts roll once per
 *  visit on the salted stream; kinds are a weighted table. */
export interface ZoneFogSpec {
  banks: [number, number];
  kinds: readonly { id: string; weight?: number }[];
}

/** The registry of record. A new fog kind is one registerFogBank row —
 *  consumers look up by id, nothing enumerates. */
export const FOG_BANKS: Record<string, FogBankDef> = {};

export function registerFogBank(def: FogBankDef): void {
  if (FOG_BANKS[def.id]) console.warn(`[fog] re-registering bank '${def.id}' — overriding`);
  FOG_BANKS[def.id] = def;
}

/** BOOT VALIDATION (wired into validateContent beside validateWeather):
 *  every grant names a real status; specs name registered kinds. The caller
 *  passes resolvers so this module stays data-import-free. */
export function validateFog(
  hasStatus: (id: string) => boolean,
  themeSpecs: readonly { owner: string; spec: ZoneFogSpec }[],
): string[] {
  const bad: string[] = [];
  for (const [id, def] of Object.entries(FOG_BANKS)) {
    for (const g of def.grants ?? []) {
      if (!hasStatus(g.status)) bad.push(`fog '${id}': grant names unknown status '${g.status}'`);
    }
    if (def.life && def.life[0] <= 4) bad.push(`fog '${id}': life floor ${def.life[0]}s — too brief to read (keep > 4s)`);
  }
  for (const { owner, spec } of themeSpecs) {
    for (const k of spec.kinds) {
      if (!FOG_BANKS[k.id]) bad.push(`${owner}: fog spec names unregistered bank '${k.id}'`);
    }
    if (!spec.kinds.length && spec.banks[1] > 0) bad.push(`${owner}: fog spec rolls banks but lists no kinds`);
  }
  return bad;
}

// --- Tunables ----------------------------------------------------------------

export const FOG_CFG = {
  /** XOR salt for the field's own rng stream (never the layout stream). */
  salt: 0x0f06ba9c,
  /** Seconds between status sweeps (statuses last ≥0.6s; 4Hz is plenty). */
  applyEvery: 0.25,
  /** Default live-lobe density floor for the hit test. */
  hitAlpha: 0.24,
  /** Anchor candidates scored per (re)gathering. */
  anchorTries: 9,
  /** How far haunted ground attracts an anchor (world units). */
  hauntReach: 460,
  /** Cap on haunt doodads sampled per zone (stride-sampled beyond). */
  hauntSample: 360,
  /** Banks steer back inward within this margin of the arena edge. */
  edgeMargin: 140,
  /** Sky-born banks bred by a full-strength 'fog' WEATHER front. */
  weatherBanks: 3,
  /** Sky-born banks use this kind unless the zone's spec names its own. */
  weatherKind: 'mist',
  /** Floating-source label statuses wear. */
  sourceLabel: 'the fog',
  /** Defaults folded under sparse defs. */
  def: {
    color: '#aab6c2', alpha: 0.34, radius: [110, 190] as [number, number],
    lobes: [5, 8] as [number, number], drift: [6, 14] as [number, number],
    meander: 0.22, swirl: 0.05, breathe: 0.16, churn: 0.32,
    life: [46, 92] as [number, number], rampFrac: 0.3, overFrac: 0.35,
  },
};

// --- Live state ---------------------------------------------------------------

/** One lobe's authored identity (rolled at gather; live state derives per frame). */
interface FogLobeSeed {
  ang: number;        // base bearing from the heart
  distFrac: number;   // 0 heart … 1 rim
  rFrac: number;      // radius share of the bank's reach
  phase: number;      // personal clock offset
  swirlMul: number;   // orbit direction/rate personality
}

/** A lobe's LIVE frame state — the renderer draws exactly this and the hit
 *  test reads exactly this (one truth). `a` is 0..1 density. */
export interface FogLobeState { x: number; y: number; r: number; a: number }

export interface FogBank {
  def: FogBankDef;
  /** The heart. */
  pos: { x: number; y: number };
  heading: number;
  reach: number;
  driftSpeed: number;
  age: number;
  life: number;
  /** Lifecycle density ramp 0..1 (smoothstepped in/out over rampFrac). */
  fade: number;
  /** Haunt tangent at the anchor (river direction), if any. */
  tangent: number | null;
  /** Sky-born banks exist only while a fog front covers the zone. */
  skyBorn: boolean;
  seeds: FogLobeSeed[];
  /** Live lobe states, refreshed each update; arrays reused (no GC churn). */
  live: FogLobeState[];
  /** Broad-phase bound: heart-to-farthest live lobe edge, padded. */
  bound: number;
}

// --- The field ----------------------------------------------------------------

export class FogField {
  readonly banks: FogBank[] = [];
  private rng: FogRng;
  private w: number;
  private h: number;
  private haunts: FogDoodadLike[] = [];
  private applyAcc = 0;
  /** Fog-front strength over this zone (0..1), set each update by the host. */
  weatherK = 0;

  constructor(rng: FogRng, w: number, h: number) {
    this.rng = rng;
    this.w = w;
    this.h = h;
  }

  /** Wire the haunt substrate (stride-sampled to a cap — anchor scoring is
   *  a spawn-time cost, never per-frame). */
  setHaunts(doodads: readonly FogDoodadLike[], kinds: ReadonlySet<string>): void {
    const all = doodads.filter(d => kinds.has(d.kind));
    if (all.length <= FOG_CFG.hauntSample) { this.haunts = all; return; }
    const stride = all.length / FOG_CFG.hauntSample;
    this.haunts = [];
    for (let i = 0; i < FOG_CFG.hauntSample; i++) this.haunts.push(all[Math.floor(i * stride)]);
  }

  /** Gather a bank of `def` somewhere haunted (or anywhere open). */
  spawnBank(def: FogBankDef, skyBorn = false): FogBank {
    const d = FOG_CFG.def;
    const reach = this.rng.range(...(def.radius ?? d.radius));
    const { pos, tangent } = this.anchorFor(def, reach);
    const lobeN = this.rng.int(...(def.lobes ?? d.lobes));
    const seeds: FogLobeSeed[] = [];
    for (let i = 0; i < lobeN; i++) {
      seeds.push({
        ang: this.rng.range(0, Math.PI * 2),
        // Square-root spread fills the mass; one lobe pinned near the heart.
        distFrac: i === 0 ? 0.12 : 0.25 + 0.75 * Math.sqrt(this.rng.next()),
        rFrac: this.rng.range(0.34, 0.62),
        phase: this.rng.range(0, Math.PI * 2),
        swirlMul: this.rng.range(0.55, 1.45) * (this.rng.next() < 0.5 ? -1 : 1),
      });
    }
    const bank: FogBank = {
      def,
      pos,
      heading: tangent ?? this.rng.range(0, Math.PI * 2),
      reach,
      driftSpeed: this.rng.range(...(def.drift ?? d.drift)),
      age: 0,
      life: this.rng.range(...(def.life ?? d.life)),
      fade: 0,
      tangent,
      skyBorn,
      seeds,
      live: seeds.map(() => ({ x: pos.x, y: pos.y, r: 0, a: 0 })),
      bound: reach,
    };
    this.banks.push(bank);
    return bank;
  }

  /** Score anchor candidates toward haunted ground; derive the local chain
   *  tangent from the two nearest haunt discs (a poured river's lattice
   *  gives its own direction). */
  private anchorFor(def: FogBankDef, reach: number): { pos: { x: number; y: number }; tangent: number | null } {
    const inset = Math.min(reach * 0.5 + 40, Math.min(this.w, this.h) * 0.24);
    let best: { x: number; y: number } | null = null;
    let bestScore = -1;
    const pull = def.haunt?.pull ?? 0.75;
    for (let i = 0; i < FOG_CFG.anchorTries; i++) {
      const p = {
        x: this.rng.range(inset, this.w - inset),
        y: this.rng.range(inset, this.h - inset),
      };
      let score = this.rng.next() * 0.25;
      if (def.haunt && this.haunts.length) {
        const near = this.nearestHaunt(p.x, p.y);
        if (near) {
          const dd = Math.hypot(near.pos.x - p.x, near.pos.y - p.y);
          score += pull * Math.max(0, 1 - dd / FOG_CFG.hauntReach);
        }
      }
      if (score > bestScore) { bestScore = score; best = p; }
    }
    const pos = best ?? { x: this.w / 2, y: this.h / 2 };
    // Snap a strongly-pulled anchor the rest of the way onto its ground.
    let tangent: number | null = null;
    if (def.haunt && this.haunts.length) {
      const n1 = this.nearestHaunt(pos.x, pos.y);
      if (n1 && Math.hypot(n1.pos.x - pos.x, n1.pos.y - pos.y) < FOG_CFG.hauntReach) {
        pos.x += (n1.pos.x - pos.x) * pull * 0.8;
        pos.y += (n1.pos.y - pos.y) * pull * 0.8;
        if (def.haunt.along) {
          const n2 = this.nearestHaunt(n1.pos.x, n1.pos.y, n1);
          if (n2) tangent = Math.atan2(n2.pos.y - n1.pos.y, n2.pos.x - n1.pos.x);
        }
      }
    }
    return { pos, tangent };
  }

  private nearestHaunt(x: number, y: number, skip?: FogDoodadLike): FogDoodadLike | null {
    let best: FogDoodadLike | null = null;
    let bestD = Infinity;
    for (const h of this.haunts) {
      if (h === skip) continue;
      const dd = (h.pos.x - x) * (h.pos.x - x) + (h.pos.y - y) * (h.pos.y - y);
      if (dd < bestD) { bestD = dd; best = h; }
    }
    return best;
  }

  /** The living tick: drift, coil, breathe, dissipate, re-gather; then dress
   *  the occupants on the apply cadence. Pure function of accumulated calls —
   *  no rng draws outside (re)gathering, no allocation in the hot path. */
  update(dt: number, time: number, weatherK: number, actors: readonly FogActorLike[]): void {
    this.weatherK = weatherK;
    const d = FOG_CFG.def;

    // Sky-born banks breathe with the front: breed up to the cap while it
    // holds, and let existing ones die out naturally once it passes.
    const wantSky = weatherK > 0.04 ? Math.round(FOG_CFG.weatherBanks * Math.min(1, weatherK * 1.6)) : 0;
    let sky = 0;
    for (const b of this.banks) if (b.skyBorn) sky++;
    if (sky < wantSky) {
      const def = FOG_BANKS[FOG_CFG.weatherKind];
      if (def) this.spawnBank(def, true);
    }

    for (let i = this.banks.length - 1; i >= 0; i--) {
      const b = this.banks[i];
      b.age += dt;
      if (b.age >= b.life) {
        if (b.skyBorn && sky > wantSky) { this.banks.splice(i, 1); sky--; continue; }
        this.regather(b);
        continue;
      }
      // Heading: slow personal sway; haunted 'along' banks ease back toward
      // the river's direction so they ROLL its length instead of leaving it.
      const sway = Math.sin(time * 0.13 + b.reach) * (b.def.meander ?? d.meander);
      b.heading += sway * dt;
      if (b.tangent != null) {
        let diff = b.tangent - b.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        b.heading += diff * Math.min(1, dt * 0.5);
      }
      // Soft edge steer: turn the heart back inward near the rim.
      const m = FOG_CFG.edgeMargin;
      if (b.pos.x < m) b.heading = this.turnToward(b.heading, 0, dt);
      else if (b.pos.x > this.w - m) b.heading = this.turnToward(b.heading, Math.PI, dt);
      if (b.pos.y < m) b.heading = this.turnToward(b.heading, Math.PI / 2, dt);
      else if (b.pos.y > this.h - m) b.heading = this.turnToward(b.heading, -Math.PI / 2, dt);
      b.pos.x += Math.cos(b.heading) * b.driftSpeed * dt;
      b.pos.y += Math.sin(b.heading) * b.driftSpeed * dt;
      b.pos.x = Math.min(this.w - 8, Math.max(8, b.pos.x));
      b.pos.y = Math.min(this.h - 8, Math.max(8, b.pos.y));

      // Lifecycle ramp (the weather-front intensity triangle, smoothstepped).
      const rampFrac = b.def.rampFrac ?? d.rampFrac;
      const u = Math.min(1, Math.max(0, Math.min(b.age, b.life - b.age) / (b.life * rampFrac)));
      b.fade = u * u * (3 - 2 * u);
      if (b.skyBorn) b.fade *= Math.min(1, weatherK * 1.8);

      // Live lobes: orbit + wobble + breathe + churn. The outline these draw
      // IS the gameplay surface (see occupantsOf).
      const swirl = b.def.swirl ?? d.swirl;
      const breathe = b.def.breathe ?? d.breathe;
      const churn = b.def.churn ?? d.churn;
      let bound = 0;
      for (let j = 0; j < b.seeds.length; j++) {
        const s = b.seeds[j];
        const l = b.live[j];
        const ang = s.ang + time * swirl * s.swirlMul;
        const wobble = 1 + 0.16 * Math.sin(time * 0.21 + s.phase);
        const dist = s.distFrac * b.reach * wobble;
        l.x = b.pos.x + Math.cos(ang) * dist;
        l.y = b.pos.y + Math.sin(ang) * dist * 0.86; // gentle squash: fog lies low
        l.r = s.rFrac * b.reach * (1 + breathe * Math.sin(time * 0.5 + s.phase * 1.7));
        // Density: lifecycle × personal churn × edge falloff (rim lobes thin
        // first — the dissipating edge is where the hitbox honestly retreats).
        const wax = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(time * churn + s.phase * 2.3));
        l.a = b.fade * wax * (1 - 0.45 * s.distFrac);
        const reachOut = dist + l.r;
        if (reachOut > bound) bound = reachOut;
      }
      b.bound = bound + 20;
    }

    // Dress the occupants on the apply cadence.
    this.applyAcc += dt;
    if (this.applyAcc >= FOG_CFG.applyEvery) {
      this.applyAcc = 0;
      this.dressOccupants(actors);
    }
  }

  private turnToward(heading: number, target: number, dt: number): number {
    let diff = target - heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return heading + diff * Math.min(1, dt * 1.6);
  }

  /** Dissipate-and-gather-anew: same def, fresh anchor, fresh lobes. Rng
   *  draws happen ONLY here and at spawn — the deterministic re-anchor walk. */
  private regather(b: FogBank): void {
    const d = FOG_CFG.def;
    const { pos, tangent } = this.anchorFor(b.def, b.reach);
    b.pos.x = pos.x; b.pos.y = pos.y;
    b.tangent = tangent;
    b.heading = tangent ?? this.rng.range(0, Math.PI * 2);
    b.reach = this.rng.range(...(b.def.radius ?? d.radius));
    b.driftSpeed = this.rng.range(...(b.def.drift ?? d.drift));
    b.life = this.rng.range(...(b.def.life ?? d.life));
    b.age = 0;
    b.fade = 0;
    for (const s of b.seeds) {
      s.ang = this.rng.range(0, Math.PI * 2);
      s.distFrac = 0.25 + 0.75 * Math.sqrt(this.rng.next());
      s.rFrac = this.rng.range(0.34, 0.62);
      s.phase = this.rng.range(0, Math.PI * 2);
      s.swirlMul = this.rng.range(0.55, 1.45) * (this.rng.next() < 0.5 ? -1 : 1);
    }
    if (b.seeds.length) b.seeds[0].distFrac = 0.12;
  }

  /** Is this point inside LIVE fog of bank `b`? (Density ≥ the honesty
   *  floor — a dissipated edge no longer counts.) */
  private bankCovers(b: FogBank, x: number, y: number, pad: number): boolean {
    const floor = b.def.hitAlpha ?? FOG_CFG.hitAlpha;
    for (const l of b.live) {
      if (l.a < floor) continue;
      const rr = l.r + pad;
      const dx = l.x - x, dy = l.y - y;
      if (dx * dx + dy * dy <= rr * rr) return true;
    }
    return false;
  }

  private dressOccupants(actors: readonly FogActorLike[]): void {
    for (const a of actors) {
      if (a.dead || a.untargetable || a.construct) continue;
      for (const b of this.banks) {
        if (!b.def.grants?.length || b.fade <= 0.05) continue;
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        const broad = b.bound + a.radius;
        if (dx * dx + dy * dy > broad * broad) continue;
        if (!this.bankCovers(b, a.pos.x, a.pos.y, a.radius * 0.5)) continue;
        for (const g of b.def.grants) {
          if (g.teams && !g.teams.includes(a.team)) continue;
          if (g.factions && (!a.faction || !g.factions.includes(a.faction))) continue;
          a.applyStatus(g.status, 0, 1, FOG_CFG.sourceLabel);
        }
      }
    }
  }

  /** Peak live density covering a point (renderer grades, AI curiosity). */
  densityAt(x: number, y: number): number {
    let best = 0;
    for (const b of this.banks) {
      const dx = b.pos.x - x, dy = b.pos.y - y;
      if (dx * dx + dy * dy > b.bound * b.bound) continue;
      for (const l of b.live) {
        const ddx = l.x - x, ddy = l.y - y;
        if (ddx * ddx + ddy * ddy <= l.r * l.r && l.a > best) best = l.a;
      }
    }
    return best;
  }

  /** Is this point inside live fog at all? (The gameplay predicate.) */
  inFog(x: number, y: number, pad = 0): boolean {
    for (const b of this.banks) {
      const dx = b.pos.x - x, dy = b.pos.y - y;
      const broad = b.bound + pad;
      if (dx * dx + dy * dy > broad * broad) continue;
      if (this.bankCovers(b, x, y, pad)) return true;
    }
    return false;
  }

  /** The nearest bank heart with any live density (x_seek_fog steering). */
  nearestBank(x: number, y: number): FogBank | null {
    let best: FogBank | null = null;
    let bestD = Infinity;
    for (const b of this.banks) {
      if (b.fade <= 0.1) continue;
      const dd = (b.pos.x - x) * (b.pos.x - x) + (b.pos.y - y) * (b.pos.y - y);
      if (dd < bestD) { bestD = dd; best = b; }
    }
    return best;
  }
}

/** Build a zone's field: authored banks from the theme spec (weighted,
 *  seeded), haunt substrate wired from the zone's real doodads, sky-born
 *  slots left to the weather. Returns null only when fog can NEVER appear
 *  here (no spec and no open sky for fronts). */
export function buildZoneFog(
  spec: ZoneFogSpec | undefined,
  seed: number,
  arena: { w: number; h: number; boundless?: boolean },
  doodads: readonly FogDoodadLike[],
  rng: FogRng,
  openSky: boolean,
): FogField | null {
  if (!spec && !openSky) return null;
  if (arena.boundless) return null; // streamed arenas have no stable bounds to roam
  const field = new FogField(rng, arena.w, arena.h);
  // Wire every registered haunt kind the zone's defs mention (one pass).
  const kinds = new Set<string>();
  const wants: FogBankDef[] = [];
  if (spec) {
    for (const k of spec.kinds) {
      const def = FOG_BANKS[k.id];
      if (def) wants.push(def);
    }
  }
  const weatherDef = FOG_BANKS[FOG_CFG.weatherKind];
  if (openSky && weatherDef) wants.push(weatherDef);
  for (const def of wants) for (const k of def.haunt?.kinds ?? []) kinds.add(k);
  if (kinds.size) field.setHaunts(doodads, kinds);

  if (spec && spec.kinds.length) {
    const n = rng.int(spec.banks[0], spec.banks[1]);
    let total = 0;
    for (const k of spec.kinds) total += k.weight ?? 1;
    for (let i = 0; i < n; i++) {
      let roll = rng.range(0, total);
      let pick = spec.kinds[spec.kinds.length - 1];
      for (const k of spec.kinds) {
        roll -= k.weight ?? 1;
        if (roll <= 0) { pick = k; break; }
      }
      const def = FOG_BANKS[pick.id];
      if (!def) continue;
      const b = field.spawnBank(def);
      // Stagger the gathering: banks start mid-cycle so a fresh zone doesn't
      // breathe in unison (and the first minute already shows every stage).
      b.age = rng.range(0, b.life * 0.7);
    }
  }
  return field;
}
