// --- THE TELL FABRIC — visible internal state as data (engine/tells.ts) ----
//
// The roster has silhouette variety (you can tell WHAT a thing is at a
// glance) but almost no STATE variety — you cannot see that a body is nearly
// ready to burst, starving, routing, or has noticed you. A TELL is that
// missing layer: one binding from a STATE SOURCE (a drive meter, a charge
// bank, status stacks, morale, the fuse) to a VISUAL CHANNEL (a worn gauge
// part, a body tint, an under-glow, a posture lean, an adorn swap), with
// curve/band/quantize dials between them. `MonsterDef.tells` rows are the
// authoring surface; a rolled brain variant may add its own rows, so a
// TEMPERAMENT reads at a glance too (the cheapest variety multiplier in the
// engine — it multiplies minds that already exist).
//
// THE LAWS:
//  - DRAWN == TESTED. A tell resolves off the LIVE mechanic (the same map
//    the AI rule reads); it may never be decorative and never lie. The
//    read is one-way by construction: sources are pure reads, tells never
//    mutate the state they report.
//  - CHEAP. The sweep is cadenced (TELL_CFG.sweepSec), the resolved value
//    QUANTIZED (`steps`) so downstream caches (sprite bakes keyed on a
//    tinted color) meet a bounded set, and the render dress rebuilds only
//    when a quantized value actually moved (Actor.tellRev).
//  - CO-OP SAFE. The host sweeps and ships the DERIVED scalars (ActorW.tl)
//    plus the rolled variant index (ActorW.bv) — never the source state.
//    Clients materialize the same dress from the same numbers.
//  - PORTRAIT-AWARE. The bestiary renders every tell at a sane default
//    value (TellSpec.portrait ?? TELL_CFG.portraitValue) — the gauge shows
//    ITSELF in the book without pretending a live reading.
//
// This module is a PURE LEAF (the mounts.ts idiom): types, config, the
// source registry, the shaping math, and the dress materializer — all
// structural (TellBody/TellWorld views), no World import. The sweep lives
// in World.updateTells; the channels apply in render (drawActor) and
// portrait. Docs: docs/engine/tells.md; probe balance/probe_tells.ts.
// ---------------------------------------------------------------------------

import { mixHex } from '../core/math';
import type { PartSpec } from '../render/vis/parts';
import type { ActorAdorn } from './actor';
import { STATUS_DEFS } from './status';

// --- config ----------------------------------------------------------------

export const TELL_CFG = {
  /** Seconds between value sweeps per telled body (drives etc. move slowly;
   *  the quantize step hides the cadence entirely). */
  sweepSec: 0.15,
  /** Default quantize ticks over the 0..1 value — the churn guard, and the
   *  bound on bake-cache variants for tint channels (colorDrift.steps kin). */
  steps: 8,
  /** Body-scale swell ceiling (a posture, never a hitbox lie — the breathe
   *  transform's kin; the hit surface stays the radius). */
  maxBodyScale: 0.22,
  /** Posture lean: forward shift (× radius) and screen squash at full lean. */
  lean: { shift: 0.16, squash: 0.1 },
  /** Under-glow ceiling alpha at value 1 (the attunement tone-glow's kin). */
  glowAlpha: 0.4,
  /** Default tint mix ceiling at value 1 (channel `max` overrides). */
  tintMax: 0.45,
  /** Bestiary/portrait default value when a spec carries no `portrait`. */
  portraitValue: 0.5,
} as const;

// --- data shapes -------------------------------------------------------------

/** Visual channels — what a resolved 0..1 value WEARS. All render-side
 *  consumers ride mechanisms that already exist (live parts, the drift's
 *  quantized color swap, the tone under-glow, the breathe transform, the
 *  adorn bake): a tell adds no draw path, only a binding. */
export type TellChannel =
  /** A worn GAUGE part: any registered painter, drawn in facing space with
   *  the look's live parts. The value always rides `params.fill` (gauge
   *  painters read it); the optional dials lerp the part's own scale/alpha/
   *  count/color so ANY existing painter becomes a meter without edits. */
  | {
      kind: 'part'; part: PartSpec;
      scale?: [number, number]; alpha?: [number, number];
      count?: [number, number]; color?: [string, string];
    }
  /** Body tint: the base color lerps toward `color` by value × max. Rides
   *  the same pre-bake color swap as the color drift — quantized, so the
   *  bake cache meets at most steps+1 variants per look. */
  | { kind: 'tint'; color: string; max?: number }
  /** Under-glow halo: alpha = value × TELL_CFG.glowAlpha (attunement kin). */
  | { kind: 'glow'; color?: string; max?: number }
  /** Body swell, SIGNED: draw scale 1 → 1+amp (MAGNITUDE clamped by
   *  TELL_CFG.maxBodyScale). Positive engorges (the accumulator filling);
   *  negative SHRINKS — the craven sinking into itself as its nerve goes,
   *  which is the same channel read the other way rather than a second
   *  mechanism. Presentation only — the hitbox stays the radius (the
   *  breathe law), so a cowering body is never a smaller target. */
  | { kind: 'scale'; amp: number }
  /** Posture lean, SIGNED: positive amp hunkers forward along the facing
   *  with a screen squash (the stalk); negative amp cants BACKWARD off the
   *  facing with a rise (the reader's weight-on-the-back-foot, the coiled
   *  load). Deepest magnitude wins when rows stack. */
  | { kind: 'lean'; amp?: number }
  /** Transparency: draw alpha lerps 1 → `min` as the value rises. */
  | { kind: 'alpha'; min: number }
  /** Silhouette swap: wear `adorn` while value ≥ `at` (default 0.5). */
  | { kind: 'adorn'; adorn: ActorAdorn; at?: number };

/** One tell row: STATE SOURCE → dials → VISUAL CHANNEL. */
export interface TellSpec {
  /** Source id, optionally parameterized after ':' — 'drive:hunger',
   *  'charge:fury', 'status:corrosion', 'ground:web'. Open registry
   *  (registerTellSource); unknown ids resolve 0 and validateTells names
   *  them, so a package tell can ship ahead of its source. */
  source: string;
  /** Input band mapped onto 0..1 — [at0, at1]; at1 < at0 INVERTS (a fuse
   *  counting down reads [3, 0]). Absent = the source already speaks 0..1.
   *  REQUIRED for unbounded sources (charge/fuse/stored — validateTells). */
  band?: [number, number];
  /** Response curve over the mapped value (default 'linear'): 'smooth' =
   *  smoothstep, 'early' = sqrt (reads sooner), 'late' = squared (reads
   *  only near full). */
  curve?: 'linear' | 'smooth' | 'early' | 'late';
  /** Quantize ticks (default TELL_CFG.steps; 1 = a binary threshold). */
  steps?: number;
  /** Bestiary value override (default TELL_CFG.portraitValue). */
  portrait?: number;
  channel: TellChannel;
}

// --- the source registry -----------------------------------------------------

/** The narrow body view a source reads — Actor satisfies it structurally,
 *  and the probe can hand-build one. READS ONLY: a source must never write. */
export interface TellBody {
  id: number;
  life: number;
  maxLife(): number;
  plies: number;
  pliesMax: number;
  drives: Map<string, number>;
  charges: Map<string, number>;
  statuses: { id: string; stacks: number }[];
  /** Live buffs by id (Actor.buffs satisfies this) — the `buff:` source's
   *  read: the {do:'buff'} lane's windows (a spent-slump, a crescendo)
   *  become wearable exactly like status stacks. */
  buffs: { get(id: string): { stacks: number; def: { maxStacks?: number } } | undefined };
  aggroed: boolean;
  aiMoraleUntil: number;
  fuse?: number;
  stored?: number;
  groundKind?: string;
  /** Wearing MonsterDef.bond mods right now (the bond scan's flag —
   *  engine/pack.ts reads it; the Rooted school shares it). */
  bondHeld?: boolean;
  // --- THE PACK LANES (the social school — engine/pack.ts). All OPTIONAL,
  // so a hand-built probe body stays three lines; absent fields read their
  // brave/lone defaults. Every one is a STAMP written where the mechanic
  // is DECIDED (updateMorale, the bond scan, the pack sweep, the AI tick) —
  // never a second opinion computed for the eye alone. `bondHeld` above is
  // shared with the Rooted school: one flag, both readings.
  /** THE NERVE (Actor.aiNerve): 1 steady → 0 breaking, stamped by
   *  updateMorale from the same terms as the break decision itself. */
  aiNerve?: number;
  /** How many living bodies THIS one currently empowers (Actor.wardCount,
   *  folded by the pack sweep from the very records the links draw) — the
   *  warden's own read: a court of six burns brighter than a court of one.
   *  Unbounded (a count) — a band is required. */
  wardCount?: number;
  /** Guardian proximity for a warded body (Actor.wardNear): 1 at her
   *  flank → 0 with none in reach. */
  wardNear?: number;
  /** Warded young huddled at THIS body (Actor.broodNear) — the guardian's
   *  half of wardNear, folded in the same pass. Unbounded (a count). */
  broodNear?: number;
  /** Rolled a JUVENILE at spawn (Actor.juvenile — scale ≤ juvenileBelow):
   *  the young of the world, who flee rather than fight. */
  juvenile?: boolean;
  /** THE SQUAD's aggregate (Actor.packAgg): living kin in earshot and the
   *  MEAN of every drive across them — what DriveSpec.share was already
   *  producing invisibly, finally readable. Shared by reference across a
   *  squad, so one fold serves every member. */
  packAgg?: { kin: number; drives: Map<string, number> };
  /** THE HUNT's resolved prey list (Actor.aiPrey): non-empty exactly while
   *  predation is OPEN — the same stamp World.isPrey gates hostility on,
   *  so the nose-down posture and who-counts-as-food are one fact. */
  aiPrey?: readonly string[];
}

/** The narrow world view (the clock + the sky's light). */
export interface TellWorld {
  time: number;
  radiance?(): number;
}

/** One state source: (body, world, arg-after-colon) → raw reading. Raw may
 *  be unbounded (seconds, stacks, counts) — the spec's `band` maps it. */
export type TellSource = (a: TellBody, w: TellWorld, arg?: string) => number;

/** Sources whose raw reading is NOT already 0..1 — their specs must band. */
const UNBOUNDED = new Set<string>(['charge', 'fuse', 'stored', 'foecast', 'warding', 'kin', 'brood']);

export const TELL_SOURCES: Record<string, TellSource> = {
  /** Constant — the identity-marker lane (temperament dress: the mark IS
   *  the rolled mind, honest by construction). */
  always: () => 1,
  /** Own life fraction (band [1, 0.3] = "reads as the wounds deepen"). */
  life: a => {
    const max = a.maxLife();
    return max > 0 ? Math.max(0, Math.min(1, a.life / max)) : 0;
  },
  /** Plies SPENT fraction (the ply fabric): 0 fresh → 1 one blow from done. */
  plies: a => (a.pliesMax > 0 ? (a.pliesMax - a.plies) / a.pliesMax : 0),
  /** THE WANTS (BrainDef.drives): the named meter, already 0..1 — the same
   *  map the AI rules read (drawn == decided). */
  drive: (a, _w, arg) => (arg ? a.drives.get(arg) ?? 0 : 0),
  /** Banked charges, RAW count (band maps the cap). */
  charge: (a, _w, arg) => (arg ? a.charges.get(arg) ?? 0 : 0),
  /** Status stacks / the def's own cap (presence = 1 for non-stackers) —
   *  the SAME registry row every stack mechanic reads. */
  status: (a, _w, arg) => {
    if (!arg) return 0;
    for (const s of a.statuses) {
      if (s.id === arg) {
        const cap = Math.max(1, STATUS_DEFS[arg]?.maxStacks ?? 1);
        return Math.max(0, Math.min(1, (s.stacks || 1) / cap));
      }
    }
    return 0;
  },
  /** A live BUFF by id: stacks / its own def's cap (presence = 1 for
   *  non-stackers) — the status source's twin over the buff map, so a
   *  {do:'buff'} window (the accumulators' spent slump, a crescendo) is
   *  wearable state like any other. */
  buff: (a, _w, arg) => {
    if (!arg) return 0;
    const b = a.buffs.get(arg);
    if (!b) return 0;
    const cap = Math.max(1, b.def.maxStacks ?? 1);
    return Math.max(0, Math.min(1, (b.stacks || 1) / cap));
  },
  /** Has this body noticed ANYONE — the watcher's step tell. */
  alert: a => (a.aggroed ? 1 : 0),
  /** Routing RIGHT NOW (the morale machinery's break window). */
  morale: (a, w) => (w.time < a.aiMoraleUntil ? 1 : 0),
  /** Armed self-detonation fuse, seconds REMAINING (band [total, 0]). */
  fuse: a => a.fuse ?? 0,
  /** Banked reservoir (Actor.stored — the Tree-of-Life lane), raw. */
  stored: a => a.stored ?? 0,
  /** The sky's light (world/radiance.ts) — day/night-phase tells. */
  radiance: (_a, w) => w.radiance?.() ?? 1,
  /** Standing on the named ground kind — claimed-terrain tells. */
  ground: (a, _w, arg) => (arg !== undefined && a.groundKind === arg ? 1 : 0),
  // --- THE PACK SOURCES (the social school — docs/engine/pack.md). A group
  // of enemies read as N independent bodies because every relationship
  // between them was invisible. Each source below is a pure read of social
  // machinery the engine ALREADY ran (morale, the bond scan, DriveSpec's
  // shared appetite, juvenile rolls) — the structure was always there; this
  // is the first time it can be SEEN. Kill order becomes legible.
  /** THE NERVE: 1 steady → 0 breaking. The continuous shadow of MoraleSpec's
   *  binary break, stamped by updateMorale from the SAME terms that decide
   *  it. Wear it banded [1, 0] and a body about to rout LOOKS like a body
   *  about to rout — pressure becomes a visible resource. Bodies that
   *  author no morale read 1 (the brave default). */
  nerve: a => a.aiNerve ?? 1,
  /** WARDED: this body currently wears a pack bond's mods — the
   *  beneficiary's own read of the line drawn to it, for kin who should
   *  visibly stand taller in their warden's reach. */
  warded: a => (a.bondHeld ? 1 : 0),
  /** WARDING: how many living bodies this one empowers RIGHT NOW — folded
   *  by the pack sweep from the same records the links draw, so the
   *  warden's glow and its court are one count. Unbounded: band it
   *  ([0, 5] reads a full court at five). */
  warding: a => a.wardCount ?? 0,
  /** GUARDED: the ward's guardian proximity, 1 at her flank → 0 with none
   *  in reach (MoraleSpec.wardTo). The huddle, drawn. */
  guarded: a => a.wardNear ?? 0,
  /** THE BROOD: how many warded young are huddled at THIS body — the
   *  guardian's half of `guarded`, from the same fold. A matriarch standing
   *  over her calves should read differently from one standing alone, and
   *  this is the number that says so. Unbounded: band it. */
  brood: a => a.broodNear ?? 0,
  /** JUVENILE: rolled young at spawn (scale ≤ juvenileBelow). The identity
   *  marker for a den's small — an `always` for the young only. */
  juvenile: a => (a.juvenile ? 1 : 0),
  /** KIN: living squadmates in earshot, RAW (band it — [1, 8] reads a
   *  swelling horde, [8, 1] a thinning one: the same source tells "we are
   *  many" or "I am the last" depending only on which way you band it). */
  kin: a => a.packAgg?.kin ?? 0,
  /** THE PACK'S APPETITE: the squad's MEAN of a named drive — the group
   *  meter DriveSpec.share was already keeping and never showing. An
   *  individual wolf's hunger is 'drive:hunger'; what the PACK wants is
   *  this. Already 0..1 (a mean of bounded meters). */
  packDrive: (a, _w, arg) => (arg ? a.packAgg?.drives.get(arg) ?? 0 : 0),
  /** COURSING: predation is OPEN — the resolved prey stamp the hostility
   *  gate itself reads (World.isPrey). A pack that has decided the meadow
   *  is food wears it, and you can tell at a glance whether you are being
   *  hunted or merely walked past. */
  coursing: a => (a.aiPrey?.length ? 1 : 0),
};

/** Extend the vocabulary (packages register their own state reads). */
export function registerTellSource(id: string, fn: TellSource): void {
  TELL_SOURCES[id] = fn;
}

// --- resolve + shape ---------------------------------------------------------

/** Split 'drive:hunger' → the registered source + its arg. Exact-id rows
 *  win (a package may register a literal 'drive:dread' override). */
function sourceOf(id: string): { fn: TellSource | undefined; arg?: string } {
  const exact = TELL_SOURCES[id];
  if (exact) return { fn: exact };
  const i = id.indexOf(':');
  if (i < 0) return { fn: undefined };
  return { fn: TELL_SOURCES[id.slice(0, i)], arg: id.slice(i + 1) };
}

/** Resolve ONE spec against a live body: raw read → band map → curve →
 *  quantize. Pure; deterministic; the ONE resolver the sweep, the wire,
 *  and every probe read (drawn == tested). */
export function resolveTell(spec: TellSpec, a: TellBody, w: TellWorld): number {
  const { fn, arg } = sourceOf(spec.source);
  if (!fn) return 0;
  let v = fn(a, w, arg);
  if (spec.band) {
    const [lo, hi] = spec.band;
    v = hi === lo ? 0 : (v - lo) / (hi - lo);
  }
  v = Math.max(0, Math.min(1, v));
  switch (spec.curve) {
    case 'smooth': v = v * v * (3 - 2 * v); break;
    case 'early': v = Math.sqrt(v); break;
    case 'late': v = v * v; break;
  }
  const steps = Math.max(1, spec.steps ?? TELL_CFG.steps);
  // Quantize (the churn guard), then land on a 3-decimal grid — the WIRE
  // format. Host and client materialize from the identical number, so a
  // threshold channel (adorn `at`) can never disagree across the seam.
  return Math.round(Math.round(v * steps) / steps * 1000) / 1000;
}

/** The binding list a spawned body wears: def rows + the rolled brain
 *  variant's rows. Returns the def array ITSELF when the variant adds
 *  nothing (zero alloc on the common path); undefined = no tells. */
export function tellSpecsOf(
  def: { tells?: TellSpec[]; brainVariants?: { tells?: TellSpec[] }[] } | undefined,
  variantIdx?: number,
): TellSpec[] | undefined {
  if (!def) return undefined;
  const vt = variantIdx !== undefined ? def.brainVariants?.[variantIdx]?.tells : undefined;
  if (!vt?.length) return def.tells?.length ? def.tells : undefined;
  if (!def.tells?.length) return vt;
  return [...def.tells, ...vt];
}

// --- the render dress ----------------------------------------------------------
// Materialized channel state — everything drawActor / the portrait needs,
// derived ONLY from (specs, values). Instances persist on the actor and
// mutate in place on rebuild: zero steady-state allocation, and a painter
// param object the sweep can write through (`fill`).

export interface TellDress {
  /** The rev the dress was built at (rebuild only when the actor's moved). */
  rev: number;
  /** Worn gauge parts, materialized (own params objects; `fill` = value). */
  parts?: PartSpec[];
  /** Pre-bake color swap: mix(base, color, f) — f quantized. */
  tint?: { color: string; f: number };
  /** Under-glow: alpha at draw = a (color absent = the body's own). */
  glow?: { color?: string; a: number };
  /** Body draw-scale multiplier (1 = none). */
  scale: number;
  /** Posture lean, SIGNED −1..1 (positive = the forward stalk, negative =
   *  the back-foot cant; renderer shifts along ±facing and squashes or
   *  rises to match). */
  lean: number;
  /** Draw-alpha multiplier (1 = none). */
  alpha: number;
  /** Adorn override while a threshold channel holds. */
  adorn?: ActorAdorn;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Build/refresh a dress from (specs, values) IN PLACE. Returns the same
 *  object every call (identity-stable — the no-churn law); values array
 *  may be shorter than specs (client warm-up): missing rows read 0. */
export function materializeTellDress(
  specs: TellSpec[], values: ArrayLike<number> | undefined, rev: number,
  into?: TellDress,
): TellDress {
  const d: TellDress = into ?? { rev: -1, scale: 1, lean: 0, alpha: 1 };
  d.rev = rev;
  d.tint = undefined; d.glow = undefined; d.adorn = undefined;
  d.scale = 1; d.lean = 0; d.alpha = 1;
  let partIdx = 0;
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const v = values ? values[i] ?? 0 : 0;
    const ch = spec.channel;
    switch (ch.kind) {
      case 'part': {
        if (!d.parts) d.parts = [];
        let inst = d.parts[partIdx];
        if (!inst || inst.kind !== ch.part.kind) {
          // First build (or spec shape changed): clone the authored part so
          // the dress owns its params — the def row is never written.
          inst = { ...ch.part, params: { ...ch.part.params } };
          d.parts[partIdx] = inst;
        }
        if (!inst.params) inst.params = {};
        inst.params.fill = v;
        if (ch.scale) inst.scale = lerp(ch.scale[0], ch.scale[1], v);
        if (ch.alpha) inst.alpha = lerp(ch.alpha[0], ch.alpha[1], v);
        if (ch.count) inst.params.n = Math.round(lerp(ch.count[0], ch.count[1], v));
        if (ch.color) inst.color = mixHex(ch.color[0], ch.color[1], v);
        partIdx++;
        break;
      }
      case 'tint': {
        const f = v * (ch.max ?? TELL_CFG.tintMax);
        // Deepest tint wins (never stacks — the ghostAlpha law's shape).
        if (f > 0 && (!d.tint || f > d.tint.f)) d.tint = { color: ch.color, f };
        break;
      }
      case 'glow': {
        const alpha = v * (ch.max ?? TELL_CFG.glowAlpha);
        if (alpha > 0.01 && (!d.glow || alpha > d.glow.a)) d.glow = { color: ch.color, a: alpha };
        break;
      }
      case 'scale': {
        // SIGNED (the collapse law, the lean's kin): the MAGNITUDE is
        // clamped, the sign carried — a sac engorging and a coward sinking
        // are one channel read two ways, never two mechanisms.
        const cap = TELL_CFG.maxBodyScale;
        d.scale *= 1 + Math.max(-cap, Math.min(cap, ch.amp)) * v;
        break;
      }
      case 'lean': {
        // SIGNED (the back-foot law): the deepest MAGNITUDE wins, sign
        // carried — a forward stalk and a backward cant never average
        // into a lie of neutrality.
        const lv = Math.max(-1, Math.min(1, (ch.amp ?? 1) * v));
        if (Math.abs(lv) > Math.abs(d.lean)) d.lean = lv;
        break;
      }
      case 'alpha':
        d.alpha *= lerp(1, Math.max(0, Math.min(1, ch.min)), v);
        break;
      case 'adorn':
        if (v >= (ch.at ?? 0.5)) d.adorn = ch.adorn;
        break;
    }
  }
  if (d.parts && d.parts.length > partIdx) d.parts.length = partIdx;
  return d;
}

/** The one dress accessor (renderer, portraits-of-the-living, probes):
 *  identity-stable — returns the SAME object until tellRev moves, then
 *  rebuilds IN PLACE (part instances persist; params mutate). Works on
 *  host and client alike: both hold specs + swept/wired values. */
export function tellDressOf(a: {
  tellSpecs?: TellSpec[]; tells?: number[]; tellRev: number; tellVis?: TellDress;
}): TellDress | undefined {
  const specs = a.tellSpecs;
  if (!specs?.length) return undefined;
  const vis = a.tellVis;
  if (vis && vis.rev === a.tellRev) return vis;
  return (a.tellVis = materializeTellDress(specs, a.tells, a.tellRev, vis));
}

/** The portrait's dress: every row at its sane default (no live body). */
export function tellPortraitDress(specs: TellSpec[]): TellDress {
  const values = specs.map(s => {
    const v = s.portrait ?? TELL_CFG.portraitValue;
    const steps = Math.max(1, s.steps ?? TELL_CFG.steps);
    return Math.round(Math.max(0, Math.min(1, v)) * steps) / steps;
  });
  return materializeTellDress(specs, values, 0);
}

// --- integrity ---------------------------------------------------------------

/** Walk a def registry: every tells row (def-level and per-variant) must
 *  name a resolvable source, band its unbounded sources, and wear a channel
 *  whose part painter exists. Returns human-readable faults (probe food). */
export function validateTells(
  defs: Record<string, { tells?: TellSpec[]; brainVariants?: { tells?: TellSpec[] }[] } | undefined>,
  painters: Record<string, unknown>,
): string[] {
  const bad: string[] = [];
  const checkRow = (owner: string, spec: TellSpec, i: number): void => {
    const tag = `${owner} tells[${i}]`;
    const { fn } = sourceOf(spec.source);
    if (!fn) bad.push(`${tag}: unknown source '${spec.source}'`);
    const prefix = spec.source.includes(':') ? spec.source.slice(0, spec.source.indexOf(':')) : spec.source;
    if (UNBOUNDED.has(prefix) && !spec.band) {
      bad.push(`${tag}: source '${spec.source}' is unbounded — a band is required`);
    }
    if (spec.band && spec.band[0] === spec.band[1]) {
      bad.push(`${tag}: degenerate band [${spec.band[0]}, ${spec.band[1]}]`);
    }
    if (spec.steps !== undefined && spec.steps < 1) bad.push(`${tag}: steps < 1`);
    const ch = spec.channel;
    if (ch.kind === 'part' && !painters[ch.part.kind]) {
      bad.push(`${tag}: part kind '${ch.part.kind}' resolves to no painter`);
    }
  };
  for (const id in defs) {
    const def = defs[id];
    if (!def) continue;
    def.tells?.forEach((t, i) => checkRow(id, t, i));
    def.brainVariants?.forEach((v, vi) =>
      v.tells?.forEach((t, i) => checkRow(`${id} variant[${vi}]`, t, i)));
  }
  return bad;
}
