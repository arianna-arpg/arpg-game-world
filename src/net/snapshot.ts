// ---------------------------------------------------------------------------
// SNAPSHOT — the host→client render-state wire format + (de)serialization.
//
// Host-authoritative co-op: only the host runs the sim. Each wire tick the host
// SERIALIZES the renderable world into a flat, JSON-safe StateSnapshot (no Actor
// objects, no StatSheets, no Maps — ids/numbers/strings only); clients APPLY it
// onto a render-only World they never simulate, then draw it with the EXISTING
// renderer untouched. To make the renderer work unchanged, applySnapshot rebuilds
// lightweight Actor objects and re-installs the few StatSheet bases the renderer
// reads (maxLife/maxMana/maxEs, invisible, detectability) so actor.maxLife() etc.
// return the host's numbers.
//
// MVP fidelity: heroes, enemies, projectiles, drops, orbs, texts, flashes render
// faithfully. Exotic per-actor FX (cast bars, auras, worm tails, constructs) are
// NOT shipped and degrade gracefully — the renderer guards every one of them, so
// they simply don't draw on a client. The HOST always sees full fidelity.
// ---------------------------------------------------------------------------

import { Actor, type ActorAdorn, type ActorShape, type Team,
  type CastingState, type ActiveAura, type ConstructState, type LeapState, type WormBody } from '../engine/actor';
import type { Doodad, DoodadDoor, PlacedStructure } from '../engine/levelgen';
import type { ZoneTheme } from '../data/zones';
import type { ZoneShape } from '../world/shape';
import { GridWalkField, type PackedWalk } from '../world/gridWalk';
import { BOSS_BAR_XP_MIN, emptyEssences } from '../engine/world';
import type { World, Seat, VendorEntry } from '../engine/world';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { makeSkillInstance, type SkillInstance, type SupportInstance, type SkillRarity } from '../engine/skills';
import { rebuildItem } from '../engine/itemgen';
import { ITEM_RARITIES, type ItemInstance } from '../engine/items';
import { VESTIGES } from '../data/vestiges';
import type { Attributes } from '../engine/stats';

export type Vec2W = [number, number];

/** One renderer-visible actor on the wire. Short keys keep the JSON small. */
export interface ActorW {
  id: number;
  p: Vec2W; f: number; r: number; c: string; sh: ActorShape;
  team: Team; name: string;
  life: number; maxLife: number; es: number; maxEs: number;
  hf: number;                  // hitFlash
  downed: boolean; dead: boolean;
  mn: boolean;                 // isMinion() (purple outline)
  passive: boolean;
  ut: boolean;                 // untargetable (ghostly alpha)
  wn?: number;                 // waning presence pulse, 0..1 (omit when 0)
  inv?: number;                // sheet invisible (omit when 0)
  det?: number;                // sheet detectability (omit when 1)
  seat?: string;               // player-seat id (own-hero + party identity)
  adorn?: ActorAdorn;
  /** Surface material (render bake key) — the client skins bodies identically. */
  mat?: string;
  /** Part-grammar look id — same reason. */
  lk?: string;
  rarity?: string;
  defId?: string;
  faction?: string;
  xp?: number;                 // xpValue — only shipped when >= 100 (the boss-bar gate)
  // --- FX (all omitted when absent → renderer skips them gracefully) ---
  ab?: number;                 // absorb pool (white bar)
  st?: StatusW[];              // active statuses (pips + screen ailment FX)
  cast?: CastW;                // cast bar + guard arc
  auras?: AuraW[];             // emanating aura fields
  con?: { kind: string; domeRadius?: number };  // construct (dome bubble)
  fuse?: number;               // armed bomber fuse
  leap?: { timer: number; total: number };       // airborne leap (body swell)
  worm?: { seg: Vec2W[]; taper: number };         // snake/worm trailing segments
}

export interface StatusW { id: string; stacks: number; }
export interface AuraW { c: string; r: number; sh: number; }
/** A cast in progress — the few fields the renderer's cast bar + guard arc read. */
export interface CastW {
  c: string; mode: string; total: number; elapsed: number;
  pulseTimer?: number; shield?: number; maxShield?: number;
  indicatorAt?: number; presses?: number; channelTime?: number;
  guardArc?: number;           // guard spec arcDeg (mode === 'guard')
}

export interface ProjW { p: Vec2W; d: number; r: number; c: string; sh: string; }
/** A tether band, RENDER-ONLY on the client (the host owns the damage ticks). */
export interface TetherW { ax: number; ay: number; bx: number; by: number; c: string; w: number; }
export interface DropW { p: Vec2W; bob: number; kind: 'skill' | 'support' | 'gear' | 'vestige'; color: string; rarity?: string; name?: string; vid?: string; }
/** kind is an ORB_DEFS registry id — the client renders from the registry. */
export interface OrbW { p: Vec2W; bob: number; life: number; kind: string; }
export interface TextW { p: Vec2W; life: number; maxLife: number; size: number; color: string; text: string; }
export interface FlashW { p: Vec2W; radius: number; color: string; life: number; maxLife: number; }
/** A death-burst telegraph (coalesce gather → tracking orb). RENDER-ONLY: the client
 *  never simulates these (homing is host-authoritative via nearestSeatPos over the seats);
 *  it just draws the host's state so the remote seat gets the same escape window. Carries
 *  only the fields drawDeathBursts reads — phase/t/coalesce/radius/color/pos/arming/trail. */
export interface DeathBurstW { p: Vec2W; ph: 0 | 1; r: number; c: string; arm: 0 | 1; t: number; co: number; trail: Vec2W[]; }

/** Per-seat camera + HUD anchor (broadcast for all seats; each client reads its own). */
export interface SeatW {
  pos: Vec2W;
  life: number; maxLife: number; mana: number; maxMana: number; es: number; maxEs: number;
  dead: boolean; downed: boolean;
  /** Movement-PREDICTION fields: `seq` = the last input the host applied for this
   *  seat (the client replays its unacked inputs forward from `pos`); `rooted` =
   *  the host has this hero movement-locked (so the client stops predicting forward);
   *  `slippery` = low-traction ground (ice) whose momentum physics the client can't
   *  reproduce — so it anchors to the authoritative pos instead of predicting. */
  seq?: number;
  rooted?: boolean;
  slippery?: boolean;
}

// --- per-seat META wire (Layer 2: the build/progression the client UI reads) ---
// JSON-safe replicas — NEVER ship def bodies (a SkillDef is huge); ship def IDS
// + level/sockets/rarity and rehydrate via the SKILLS/SUPPORTS catalogs on apply.
// Sent only when a seat's meta CHANGES (dirty-flagged), so it's nearly free.
export interface SupportInstW { id: string; lvl: number; }
export interface SkillInstW { id: string; lvl: number; rarity?: string; sockets: (SupportInstW | null)[]; mark?: { x: number; y: number } | null; g?: boolean; eLv?: number; }
/** The client OWN-seat build: enough to render the char-sheet / skill-book / tree
 *  and re-derive the stat sheet (recalcSeat) on the client. */
export interface SeatMetaW {
  level: number;
  xp: number; xpNeeded: number;
  skillPoints: number; passivePoints: number; offerings: number;
  vocationPoints: number;
  vocations: string[];              // granted vocations (center-tree render + gates)
  baseAttrs: Attributes;            // recalcSeat derives `attrs` from this + allocated
  allocated: string[];              // passive node ids
  known: Record<string, SkillInstW>;
  inv: SupportInstW[];              // loose support gems
  skillInv: SkillInstW[];          // carried skill gems
  bar: (string | null)[];          // bar slot → learned skill id
  /** GEAR: bag + doll. ItemInstances are already pure JSON (ids + rolls —
   *  never def bodies), so the instance IS the wire shape; rebuildItem
   *  re-validates against the client's registries on apply. Optional →
   *  tolerant of a host one wire-version behind. */
  gear?: { items: ItemInstance[]; equipped: Record<string, ItemInstance> };
  /** Essence wallet (salvage currency), per essence id. */
  ess?: Record<string, number>;
  /** Vestige wallet (socket material), per vestige id. */
  vest?: Record<string, number>;
}

const supW = (s: SupportInstance): SupportInstW => ({ id: s.def.id, lvl: s.level });
const skillInstW = (s: SkillInstance): SkillInstW => ({
  id: s.def.id, lvl: s.level, rarity: s.rarity,
  sockets: s.sockets.map(x => (x ? supW(x) : null)),
  mark: s.state?.markPos ?? undefined,
  g: s.granted || undefined, eLv: s.essenceLevels || undefined,
});

/** Host: serialize one seat's build/progression for its owning client. */
export function serializeSeatMeta(seat: Seat): SeatMetaW {
  const m = seat.meta;
  return {
    level: seat.actor.level,
    xp: m.xp, xpNeeded: m.xpNeeded,
    skillPoints: m.skillPoints, passivePoints: m.passivePoints, offerings: m.offerings,
    vocationPoints: m.vocationPoints,
    vocations: [...m.vocations],
    baseAttrs: { ...m.baseAttrs },
    allocated: [...m.allocated],
    known: Object.fromEntries([...m.knownSkills].map(([id, inst]) => [id, skillInstW(inst)])),
    inv: m.inventory.map(supW),
    skillInv: m.skillInv.map(skillInstW),
    bar: seat.actor.skills.map(s => (s ? s.def.id : null)),
    gear: {
      items: m.items.map(i => ({ ...i })),
      equipped: Object.fromEntries(
        Object.entries(m.equipped).flatMap(([k, v]) => (v ? [[k, { ...v }] as const] : [])),
      ),
    },
    ess: { ...m.essences },
    vest: { ...m.vestiges },
  };
}

const rehydrateSupport = (w: SupportInstW): SupportInstance | null => {
  const def = SUPPORTS[w.id];
  return def ? { def, level: w.lvl } : null;
};
const rehydrateSkill = (w: SkillInstW): SkillInstance | null => {
  const def = SKILLS[w.id];
  if (!def) return null;
  const inst = makeSkillInstance(def, w.lvl, w.sockets.length);
  inst.rarity = w.rarity as SkillRarity | undefined;
  inst.sockets = w.sockets.map(s => (s ? rehydrateSupport(s) : null));
  if (w.mark) inst.state = { markPos: w.mark };
  if (w.g) inst.granted = true;
  if (w.eLv) inst.essenceLevels = w.eLv;
  return inst;
};

// --- vendor stock wire (shared, not per-seat) -------------------------------
// Brandt's wares live on the host's world and the client never ticks the sim, so
// its local stock would diverge — and a buyVendor intent addresses stock by INDEX.
// Replicate the host's stock so the client renders the authoritative list + its
// indices line up. Reuses the skill/support instance wire shapes (defId only).
export type VendorEntryW =
  | { kind: 'skill'; s: SkillInstW }
  | { kind: 'support'; g: SupportInstW };

const vendorEntryW = (e: VendorEntry): VendorEntryW =>
  e.kind === 'skill' ? { kind: 'skill', s: skillInstW(e.inst) } : { kind: 'support', g: supW(e.gem) };

const rehydrateVendor = (w: VendorEntryW): VendorEntry | null => {
  if (w.kind === 'skill') { const inst = rehydrateSkill(w.s); return inst ? { kind: 'skill', inst } : null; }
  const gem = rehydrateSupport(w.g); return gem ? { kind: 'support', gem } : null;
};

/** Client: graft a replicated build onto a seat's meta + re-derive the stat sheet.
 *  recalcSeat installs the build's stat SOURCES over the actor's clean STAT_DEFS
 *  base — so maxLife()/maxMana()/derived stats match the host bit-for-bit, AS LONG
 *  AS the per-frame apply NEVER setBase's those for the local hero (it doesn't). */
export function applySeatMeta(world: World, seat: Seat, w: SeatMetaW): void {
  const m = seat.meta;
  seat.actor.level = w.level;
  m.xp = w.xp; m.xpNeeded = w.xpNeeded;
  m.skillPoints = w.skillPoints; m.passivePoints = w.passivePoints; m.offerings = w.offerings;
  // Tolerant of a host one wire-version behind (fields absent from old JSON).
  m.vocationPoints = w.vocationPoints ?? 0;
  m.vocations = [...(w.vocations ?? [])];
  m.baseAttrs = { ...w.baseAttrs };
  m.allocated = new Set(w.allocated);
  const known = new Map<string, SkillInstance>();
  for (const [id, sw] of Object.entries(w.known)) { const inst = rehydrateSkill(sw); if (inst) known.set(id, inst); }
  m.knownSkills = known;
  m.inventory = w.inv.map(rehydrateSupport).filter((x): x is SupportInstance => !!x);
  m.skillInv = w.skillInv.map(rehydrateSkill).filter((x): x is SkillInstance => !!x);
  // GEAR: re-validate every instance against the client's live registries.
  m.items = (w.gear?.items ?? []).map(rebuildItem).filter((x): x is ItemInstance => !!x);
  m.equipped = {};
  for (const [slot, it] of Object.entries(w.gear?.equipped ?? {})) {
    const item = rebuildItem(it);
    if (item) m.equipped[slot] = item;
  }
  m.essences = { ...emptyEssences(), ...(w.ess ?? {}) };
  m.vestiges = { ...(w.vest ?? {}) };
  // Rebuild the action bar from slot ids → the (just-rehydrated) learned instances.
  seat.actor.skills = w.bar.map(id => (id ? (known.get(id) ?? null) : null));
  world.recalcSeat(seat);            // derive attrs + the full stat sheet from the build
}

/** The full render-state replace a client draws each frame. */
export interface StateSnapshot {
  tick: number;
  time: number;
  zoneId: string;
  arena: { w: number; h: number };
  seats: Record<string, SeatW>;
  /** Per-seat build/progression — present ONLY for seats whose meta CHANGED since
   *  the last broadcast (dirty-flagged), so it rides along cheaply. Each client
   *  applies its OWN entry (snap.seatMeta[clientSeatId]). */
  seatMeta?: Record<string, SeatMetaW>;
  /** Brandt's shared vendor stock (host-authoritative) + its restock clock — so a
   *  client renders the SAME list the host will resolve a buyVendor index against. */
  vendor: VendorEntryW[];
  vendorRestockAt: number;
  actors: ActorW[];
  projectiles: ProjW[];
  tethers: TetherW[];
  drops: DropW[];
  orbs: OrbW[];
  texts: TextW[];
  flashes: FlashW[];
  deathBursts: DeathBurstW[];
  /** Structure-door states (id → open/broken), present only when any door has
   *  flipped — rides the 20 Hz snapshot so a dropped packet SELF-HEALS on the
   *  next one (the meta-delta lesson: a one-shot door msg is a permanent
   *  desync when the channel hiccups). Clients apply via the shared
   *  setDoorState path (their own grid repaint included). */
  doors?: Record<string, 'open' | 'broken'>;
}

const v2 = (p: { x: number; y: number }): Vec2W => [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100];

function actorToW(a: Actor): ActorW {
  const inv = a.sheet.get('invisible');
  const det = a.sheet.get('detectability');
  const w: ActorW = {
    id: a.id, p: v2(a.pos), f: a.facing, r: a.radius, c: a.color, sh: a.shape,
    team: a.team, name: a.name,
    life: Math.max(0, Math.round(a.life)), maxLife: Math.round(a.maxLife()),
    es: Math.round(a.es), maxEs: Math.round(a.maxEs()),
    hf: a.hitFlash, downed: a.downed, dead: a.dead, mn: a.isMinion(), passive: a.passive, ut: a.untargetable,
  };
  if (inv > 0) w.inv = inv;
  if (det !== 1) w.det = det;
  if (a.wane > 0) w.wn = Math.round(a.wane * 100) / 100;
  if (a.kind === 'player') { const s = SEAT_OF(a); if (s) w.seat = s; }
  if (a.adorn) w.adorn = a.adorn;
  if (a.material) w.mat = a.material;
  if (a.look) w.lk = a.look;
  if (a.rarity) w.rarity = a.rarity;
  if (a.defId) w.defId = a.defId;
  if (a.faction) w.faction = a.faction;
  if (a.xpValue >= BOSS_BAR_XP_MIN) w.xp = a.xpValue;   // lets the client draw the boss bar
  if (a.absorb > 0) w.ab = Math.round(a.absorb);
  if (a.statuses.length) w.st = a.statuses.map(s => ({ id: s.id, stacks: s.stacks }));
  if (a.casting) {
    const cs = a.casting;
    const cw: CastW = { c: cs.inst.def.color, mode: cs.mode, total: cs.total, elapsed: cs.elapsed };
    if (cs.pulseTimer !== undefined) cw.pulseTimer = cs.pulseTimer;
    if (cs.shield !== undefined) cw.shield = cs.shield;
    if (cs.maxShield !== undefined) cw.maxShield = cs.maxShield;
    if (cs.indicatorAt !== undefined) cw.indicatorAt = cs.indicatorAt;
    if (cs.presses !== undefined) cw.presses = cs.presses;
    if (cs.channelTime !== undefined) cw.channelTime = cs.channelTime;
    if (cs.mode === 'guard' && cs.inst.def.guard) cw.guardArc = cs.inst.def.guard.arcDeg;
    w.cast = cw;
  }
  if (a.activeAuras.size) {
    w.auras = [...a.activeAuras.values()].map(au => ({ c: au.inst.def.color, r: au.radius, sh: au.shape }));
  }
  if (a.construct) w.con = { kind: a.construct.kind, domeRadius: a.construct.domeRadius };
  if (a.fuse !== undefined) w.fuse = a.fuse;
  if (a.leap) w.leap = { timer: a.leap.timer, total: a.leap.total };
  if (a.worm) w.worm = { seg: a.worm.segments.map(v2), taper: a.worm.taper };
  return w;
}

// Set per-serialize so actorToW can tag player actors with their seat id.
let SEAT_OF: (a: Actor) => string | undefined = () => undefined;

export function serializeSnapshot(world: World, tick: number): StateSnapshot {
  const seatById = new Map<Actor, string>();
  for (const s of world.seats) seatById.set(s.actor, s.id);
  SEAT_OF = (a) => seatById.get(a);

  const seats: Record<string, SeatW> = {};
  for (const s of world.seats) seats[s.id] = seatW(s, world);

  // META: ship a seat's build only when it CHANGED (level/pickup/mutation marked
  // it dirty). The host clears world.metaDirty after the broadcast (main.ts).
  let seatMeta: Record<string, SeatMetaW> | undefined;
  if (world.metaDirty.size) {
    seatMeta = {};
    for (const s of world.seats) if (world.metaDirty.has(s.id)) seatMeta[s.id] = serializeSeatMeta(s);
  }

  return {
    tick, time: world.time, zoneId: world.zone.id,
    arena: { w: world.arena.w, h: world.arena.h },
    seats, seatMeta,
    vendor: world.vendorStock.map(vendorEntryW), vendorRestockAt: world.vendorRestockAt,
    actors: world.actors.filter(a => !a.dead || a.isPlayerKind()).map(actorToW),
    projectiles: world.projectiles.map(p => ({ p: v2(p.pos), d: p.dir, r: p.radius, c: p.color, sh: p.shape })),
    tethers: world.tethers.map(t => ({
      ax: Math.round(t.ax), ay: Math.round(t.ay), bx: Math.round(t.bx), by: Math.round(t.by),
      c: t.color, w: t.width,
    })),
    drops: world.drops.map(d => ({
      p: v2(d.pos), bob: d.bob, kind: d.item.kind,
      color: d.item.kind === 'support' ? d.item.gem.def.color
        : d.item.kind === 'gear' ? ITEM_RARITIES[d.item.item.rarity].color
        : d.item.kind === 'vestige' ? (VESTIGES[d.item.id]?.color ?? '#b06bd4')
        : d.item.inst.def.color,
      rarity: d.item.kind === 'skill' ? (d.item.inst.rarity ?? 'common')
        : d.item.kind === 'gear' ? d.item.item.rarity : undefined,
      name: d.item.kind === 'gear' ? d.item.item.name : undefined,
      vid: d.item.kind === 'vestige' ? d.item.id : undefined,
    })),
    orbs: world.orbs.map(o => ({ p: v2(o.pos), bob: o.bob, life: o.life, kind: o.kind })),
    texts: world.texts.map(t => ({ p: v2(t.pos), life: t.life, maxLife: t.maxLife, size: t.size, color: t.color, text: t.text })),
    flashes: world.flashes.map(f => ({ p: v2(f.pos), radius: f.radius, color: f.color, life: f.life, maxLife: f.maxLife })),
    deathBursts: world.deathBurstsView().map(b => ({
      p: v2(b.pos), ph: (b.phase === 'gather' ? 0 : 1) as 0 | 1, r: b.radius, c: b.color,
      arm: (b.arming ? 1 : 0) as 0 | 1, t: Math.round(b.t * 100) / 100, co: b.coalesce, trail: b.trail.map(v2),
    })),
    doors: doorStatesOf(world),
  };
}

/** Live structure-door states (id → state), or undefined when every door in the
 *  zone is still pristine (the common case ships zero bytes). */
function doorStatesOf(world: World): Record<string, 'open' | 'broken'> | undefined {
  let out: Record<string, 'open' | 'broken'> | undefined;
  for (const d of world.doodads) {
    if (!d.door || (!d.door.open && !d.door.broken)) continue;
    (out ??= {})[d.door.id] = d.door.broken ? 'broken' : 'open';
  }
  return out;
}

function seatW(s: Seat, world: World): SeatW {
  const a = s.actor;
  const seq = world.lastInputSeq.get(s.id);
  return {
    pos: v2(a.pos),
    life: Math.max(0, Math.round(a.life)), maxLife: Math.round(a.maxLife()),
    mana: Math.max(0, Math.round(a.mana)), maxMana: Math.round(a.maxMana()),
    es: Math.round(a.es), maxEs: Math.round(a.maxEs()),
    dead: a.dead, downed: a.downed,
    ...(seq !== undefined ? { seq } : {}),
    ...(world.movementLocked(a) ? { rooted: true } : {}),
    ...(a.sheet.get('traction') < 0.999 ? { slippery: true } : {}),
  };
}

// ----------------------------------------------------------- apply (client) --
// Pool reconstructed actors by id across frames to limit GC churn.
const POOL = new Map<number, Actor>();
/** A shared stand-in owner so reconstructed minions report isMinion()===true. */
let MINION_OWNER: Actor | null = null;

/** Shortest-arc angle interpolation (facing wraps around ±π). */
function angLerp(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; else if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Apply a host snapshot onto a render-only client World (no sim runs). Rebuilds
 *  the entity arrays the renderer iterates; re-installs the StatSheet bases the
 *  renderer reads so maxLife()/invisible/detectability/casting work unchanged.
 *  When `prev` + `alpha` (0..1) are given, actor POSITIONS/facing are interpolated
 *  prev→snap for smooth motion between 20 Hz snapshots (everything else uses snap). */
export function applySnapshot(world: World, snap: StateSnapshot, prev?: StateSnapshot | null, alpha = 1): void {
  world.time = snap.time;
  world.arena.w = snap.arena.w;
  world.arena.h = snap.arena.h;

  // Structure doors: converge on the host's states through the SAME gate the
  // host used (client-side collision flip + grid repaint). Idempotent, so the
  // 20 Hz repeat is free; a missed packet heals on the next. Guarded on zone
  // identity: in the frames between applyZone(B) and the first zone-B
  // snapshot, a stale zone-A snapshot must not flip zone B's same-id doors.
  if (snap.doors && (!world.appliedZoneId || snap.zoneId === world.appliedZoneId)) {
    for (const [id, st] of Object.entries(snap.doors)) {
      world.setDoorState(id, st, { silent: true });
    }
  }

  if (!MINION_OWNER) MINION_OWNER = new Actor('owner', 'player', { x: 0, y: 0 });
  const lerping = !!prev && alpha < 1;
  const prevById = lerping ? new Map(prev!.actors.map(a => [a.id, a])) : null;

  const seen = new Set<number>();
  const actors: Actor[] = [];
  const partyByseat = new Map<string, Actor>();
  for (const aw of snap.actors) {
    let a = POOL.get(aw.id);
    if (!a) { a = new Actor(aw.name, aw.team, { x: aw.p[0], y: aw.p[1] }); POOL.set(aw.id, a); }
    // Interpolate position + facing from the previous snapshot for smooth motion.
    const pa = prevById?.get(aw.id);
    if (pa) {
      a.pos.x = pa.p[0] + (aw.p[0] - pa.p[0]) * alpha;
      a.pos.y = pa.p[1] + (aw.p[1] - pa.p[1]) * alpha;
      a.facing = angLerp(pa.f, aw.f, alpha);
    } else {
      a.pos.x = aw.p[0]; a.pos.y = aw.p[1]; a.facing = aw.f;
    }
    a.radius = aw.r; a.color = aw.c; a.shape = aw.sh;
    a.team = aw.team; a.name = aw.name;
    a.life = aw.life; a.es = aw.es; a.absorb = aw.ab ?? 0;
    a.hitFlash = aw.hf; a.downed = aw.downed; a.dead = aw.dead;
    a.passive = aw.passive; a.untargetable = aw.ut;
    a.wane = aw.wn ?? 0;
    a.owner = aw.mn ? MINION_OWNER : undefined;
    a.kind = aw.seat ? 'player' : undefined;
    a.adorn = aw.adorn;
    a.material = aw.mat;
    a.look = aw.lk;
    a.rarity = aw.rarity as Actor['rarity'];
    a.defId = aw.defId;
    a.faction = aw.faction;
    a.xpValue = aw.xp ?? 0;   // reset to 0 (pooled actors) so no stale boss bar
    // The renderer reads maxLife()/maxEs() + invisible/detectability off the sheet.
    // EXCEPT the OWN hero's life/es maxes — those are owned by recalcSeat (from the
    // replicated meta), so setBase-ing the host's final value here would double it.
    if (aw.seat !== world.clientSeatId) {
      a.sheet.setBase('life', aw.maxLife);
      a.sheet.setBase('energyShield', aw.maxEs);
    }
    a.sheet.setBase('invisible', aw.inv ?? 0);
    a.sheet.setBase('detectability', aw.det ?? 1);
    // Reconstruct the FX sub-objects the renderer draws (stand-in nested objects
    // so renderer.ts stays untouched). Absent → cleared → that FX simply skips.
    a.statuses.length = 0;
    if (aw.st) for (const s of aw.st) a.statuses.push({ id: s.id, remaining: 99, stacks: s.stacks, dps: 0, sourceName: '' });
    a.casting = aw.cast ? ({
      inst: { def: { color: aw.cast.c, guard: aw.cast.guardArc !== undefined ? { arcDeg: aw.cast.guardArc } : undefined } },
      mode: aw.cast.mode, total: aw.cast.total, elapsed: aw.cast.elapsed,
      pulseTimer: aw.cast.pulseTimer, shield: aw.cast.shield, maxShield: aw.cast.maxShield,
      indicatorAt: aw.cast.indicatorAt, presses: aw.cast.presses, channelTime: aw.cast.channelTime,
      aim: { x: a.pos.x, y: a.pos.y }, held: false, baseMult: 1,
    } as unknown as CastingState) : null;
    a.activeAuras.clear();
    if (aw.auras) aw.auras.forEach((au, i) => a!.activeAuras.set('a' + i, ({ inst: { def: { color: au.c } }, radius: au.r, shape: au.sh } as unknown as ActiveAura)));
    a.construct = aw.con ? ({ kind: aw.con.kind, domeRadius: aw.con.domeRadius } as unknown as ConstructState) : undefined;
    a.fuse = aw.fuse;
    a.leap = aw.leap ? ({ timer: aw.leap.timer, total: aw.leap.total } as unknown as LeapState) : undefined;
    if (aw.worm) {
      // Interpolate the trailing segments the same way the head (a.pos) is lerped,
      // so the body tracks the smoothly-gliding head instead of stepping at 20Hz.
      const paw = pa?.worm;
      const seg = aw.worm.seg.map((s, i) => {
        const ps = paw?.seg[i];
        return ps && lerping ? { x: ps[0] + (s[0] - ps[0]) * alpha, y: ps[1] + (s[1] - ps[1]) * alpha } : { x: s[0], y: s[1] };
      });
      a.worm = ({ segments: seg, taper: aw.worm.taper, length: aw.worm.seg.length, spacing: 0 } as unknown as WormBody);
    } else {
      a.worm = undefined;
    }
    actors.push(a);
    seen.add(aw.id);
    if (aw.seat) partyByseat.set(aw.seat, a);
  }
  for (const id of POOL.keys()) if (!seen.has(id)) POOL.delete(id);
  world.actors = actors;

  // Lightweight entities — plain render structs the renderer reads positionally.
  world.projectiles = snap.projectiles.map(p => ({
    pos: { x: p.p[0], y: p.p[1] }, dir: p.d, radius: p.r, color: p.c, shape: p.sh,
  })) as unknown as World['projectiles'];
  world.tethers = (snap.tethers ?? []).map(t => ({
    ax: t.ax, ay: t.ay, bx: t.bx, by: t.by, color: t.c, width: t.w,
  })) as unknown as World['tethers'];
  world.drops = snap.drops.map(d => ({
    pos: { x: d.p[0], y: d.p[1] }, bob: d.bob,
    item: d.kind === 'support'
      ? { kind: 'support', gem: { def: { color: d.color }, level: 1 } }
      : d.kind === 'gear'
        // Render-shell gear: name + rarity is all the client draws (label/icon).
        ? { kind: 'gear', item: { name: d.name ?? '?', rarity: (d.rarity ?? 'common') } }
        : d.kind === 'vestige'
          ? { kind: 'vestige', id: d.vid ?? '', count: 1 }
          : { kind: 'skill', inst: { def: { color: d.color }, rarity: d.rarity ?? 'common' } },
  })) as unknown as World['drops'];
  world.orbs = snap.orbs.map(o => ({ pos: { x: o.p[0], y: o.p[1] }, bob: o.bob, life: o.life, kind: o.kind, amount: 0 })) as unknown as World['orbs'];
  world.texts = snap.texts.map(t => ({ pos: { x: t.p[0], y: t.p[1] }, life: t.life, maxLife: t.maxLife, size: t.size, color: t.color, text: t.text })) as unknown as World['texts'];
  world.flashes = snap.flashes.map(f => ({ pos: { x: f.p[0], y: f.p[1] }, radius: f.radius, color: f.color, life: f.life, maxLife: f.maxLife })) as unknown as World['flashes'];
  // Render-only telegraph: the client draws these but never advances them (no updateDeathBursts
  // runs client-side). Only the fields drawDeathBursts touches are carried; sim fields are inert.
  world.deathBursts = (snap.deathBursts ?? []).map(b => ({
    pos: { x: b.p[0], y: b.p[1] }, phase: b.ph === 0 ? 'gather' : 'orb', radius: b.r, color: b.c,
    arming: b.arm === 1, t: b.t, coalesce: b.co, trail: b.trail.map(tp => ({ x: tp[0], y: tp[1] })),
  })) as unknown as World['deathBursts'];
  // Mirror the host's authoritative vendor stock so the smith panel renders the
  // real wares and a buyVendor index resolves against the SAME list host-side.
  if (snap.vendor) {
    world.vendorStock = snap.vendor.map(rehydrateVendor).filter((e): e is VendorEntry => !!e);
    world.vendorRestockAt = snap.vendorRestockAt;
  }

  // The client's OWN hero arrives as a POOLED actor (in world.actors). Make
  // world.player (the camera/HUD anchor AND the renderer's "no overhead bar"
  // identity) BE that same object, so the own hero draws ONCE with no floating
  // bar — matching host/SP. Then patch the per-seat HUD values (mana/maxMana
  // aren't on ActorW, so they must come from SeatW).
  const own = partyByseat.get(world.clientSeatId);
  if (own) world.localSeat.actor = own;
  // LAYER 2 — apply the replicated OWN-seat build FIRST (when it changed), so the
  // char-sheet / skill-book / tree read correct values and recalcSeat owns the
  // resource maxes + derived stats before the per-frame patch runs.
  const myMeta = snap.seatMeta?.[world.clientSeatId];
  if (myMeta) applySeatMeta(world, world.localSeat, myMeta);
  const me = snap.seats[world.clientSeatId];
  if (me) {
    const p = world.player;
    // When the own hero is a pooled actor its pos was already interpolated above;
    // only the shell needs a position (lerped from the prev seat sample).
    if (!own) {
      const pme = prev?.seats[world.clientSeatId];
      p.pos.x = lerping && pme ? pme.pos[0] + (me.pos[0] - pme.pos[0]) * alpha : me.pos[0];
      p.pos.y = lerping && pme ? pme.pos[1] + (me.pos[1] - pme.pos[1]) * alpha : me.pos[1];
    }
    // CURRENT resources come from the per-tick SeatW; the MAXES come from
    // recalcSeat (the replicated meta) — so we never setBase them here (that would
    // double-count against recalcSeat's sources).
    p.life = me.life; p.mana = me.mana; p.es = me.es;
    p.dead = me.dead; p.downed = me.downed;
  }

  // Rebuild the party strip from seat-tagged actors (events don't fire on a client).
  world.party.members.length = 0;
  for (const [seat, actor] of partyByseat) {
    world.party.members.push({ actor, seat, local: seat === world.clientSeatId });
  }
}

// ----------------------------------------------------- zone terrain (P5) -----
// Shipped ONCE per host loadZone (not per tick), so the client renders the host's
// actual terrain. MVP scope: the in-zone view (floor theme, doodads, exits,
// waypoint). Interactive furniture (shrines/altars/chests/fonts) + the minimap
// graph stay client-local — they don't render-block and aren't worth the bytes.

export interface DoodadW {
  p: Vec2W; r: number; kind: string; dir?: number; shallow?: boolean; rot?: number; adorn?: string;
  /** Door state (kind 'door'): id + open/broken + cell rect, so the client's
   *  predicted collision + render + grid repaint mirror the host's doors. */
  door?: DoodadDoor;
}
export interface ExitW { p: Vec2W; r: number; to: string; label: string; }
export interface ZoneMsg {
  zoneId: string; name: string; level: number;
  /** The zone's DIMENSION ('surface' omitted) — the client's map tab, dimension
   *  seals, and any dimension-scoped rendering read the same plane the host is
   *  in (a client in hell must not paint surface weather over it). */
  dimension?: string;
  arena: { w: number; h: number; shape: ZoneShape };
  theme: ZoneTheme;
  doodads: DoodadW[];
  exits: ExitW[];
  waypoint: Vec2W | null;
  /** A non-convex zone's walkability grid (Phase 2/3), packed (region kinds, mask
   *  derived); null for convex zones. Shipped so a co-op client's movement
   *  PREDICTION (clampPos) keeps the hero on the same walkable ground the host does. */
  walk: PackedWalk | null;
  /** Plan structures (rects/roofs/doors/slots) — the client's roof-reveal pass
   *  and door rendering read the same record the host does. */
  structures?: PlacedStructure[];
}

export function serializeZone(world: World): ZoneMsg {
  return {
    zoneId: world.zone.id, name: world.zone.name, level: world.zone.level,
    dimension: world.zone.dimension,
    arena: { w: world.arena.w, h: world.arena.h, shape: world.arena.shape },
    theme: world.zone.theme,
    doodads: world.doodads.map(d => ({ p: v2(d.pos), r: d.radius, kind: d.kind, dir: d.dir, shallow: d.shallow, rot: d.rot, adorn: d.adorn, door: d.door })),
    exits: world.exits.map(e => ({ p: v2(e.pos), r: e.radius, to: e.to, label: e.label })),
    waypoint: world.waypointPos ? v2(world.waypointPos) : null,
    walk: world.walk instanceof GridWalkField ? world.walk.pack() : null,
    structures: world.structures.length ? world.structures : undefined,
  };
}

/** Client: rebuild the render terrain from a host zone message. */
export function applyZone(world: World, msg: ZoneMsg): void {
  world.arena.w = msg.arena.w; world.arena.h = msg.arena.h; world.arena.shape = msg.arena.shape;
  // Patch the client's render zone so drawFloor reads the host's theme/name/level.
  world.zone.theme = msg.theme;
  world.zone.name = msg.name;
  world.zone.level = msg.level;
  world.zone.dimension = msg.dimension;
  world.doodads = msg.doodads.map(d => ({
    pos: { x: d.p[0], y: d.p[1] }, radius: d.r, kind: d.kind, dir: d.dir, shallow: d.shallow, rot: d.rot, adorn: d.adorn, door: d.door,
  })) as Doodad[];
  world.structures = msg.structures ?? [];
  // The zone the CLIENT's terrain currently mirrors — the guard that keeps a
  // stale old-zone snapshot from ratcheting same-id doors open in the new zone
  // (do NOT write msg.zoneId into world.zone.id: world.zone aliases a node in
  // the client's own zone graph).
  world.appliedZoneId = msg.zoneId;
  // Rebuild the bridge/ground collision lists from the replicated doodads so the
  // client's PREDICTED movement matches the host across bridges (else rubber-band).
  world.rebuildClientTerrain();
  // Non-convex walkability: rebuild from the shipped packed grid (or clear it).
  world.walk = msg.walk ? GridWalkField.unpack(msg.walk) : null;
  world.exits = msg.exits.map(e => ({
    pos: { x: e.p[0], y: e.p[1] }, radius: e.r, to: e.to, label: e.label, defIndex: 0,
  }));
  world.waypointPos = msg.waypoint ? { x: msg.waypoint[0], y: msg.waypoint[1] } : null;
}
