// ---------------------------------------------------------------------------
// WORLDSTATE PERSISTENCE — the world half of a saved run.
//
// A CharacterSave carries the BUILD; this schema carries the WORLD the build
// was standing in: the minted zone graph (every ZoneDef is pure JSON by
// design), discovery (visited ground + attuned waypoints), the world clock
// (day/night phase + zone-memory TTLs stay honest), quests, the TTL'd zone
// memory (cleared stays cleared; a half-fought zone keeps its bloodied
// survivors), the player's exact spot, and an open per-overlay snapshot bag
// (world/overlay.ts snapshot()/restore() — each field opts in on its own).
// It rides INSIDE CharacterSave, so it routes through the same run/roster
// slots, wipes with permadeath, and stays atomic with the build it belongs to.
//
// TOLERANCE DOCTRINE (matching items/skills): rebuild against the LIVE
// registries and drop what no longer resolves — a removed monster leaves its
// pack rows, a removed quest releases its entry, a broken zone def is culled
// and its roads healed. A save the sanitizer can't stand up AT ALL simply
// resumes as a fresh world (the pre-worldstate behavior) — never a crash.
//
// TRANSIENCE RULE: zones minted by world EVENTS (def.eventOwned — demon
// epicenters, incursion landings; crusades are field campaigns and mint no
// overworld ground) persist only if their owning overlay restored a snapshot
// claiming that run's state; otherwise they are scrubbed on resume and the
// event re-rolls fresh, exactly as the old completedObjectives prefix filter
// always encoded. Quest zones are claimed by the persisted quest log instead.
// ---------------------------------------------------------------------------

import { FACTIONS, MONSTERS } from '../data/monsters';
import { START_ZONE, ZONES, type ZoneDef } from '../data/zones';
import { ZONE_KINDS } from '../data/zoneKinds';
import { hasLayout } from '../engine/levelgen';

export const WORLD_SCHEMA_VERSION = 1;

/** Where a resumed character wakes. 'exact' = the spot (and situation) the
 *  save captured — Alt-F4 hands back exactly the mess you left; 'town' = the
 *  Lastlight sanctuary (the world still resumes explored — only YOU move). */
export type ResumeSpawn = 'exact' | 'town';

/** The worldstate levers — engine defaults, all tunable, none hardcoded at
 *  the call sites. */
export const WORLDSTATE_CFG = {
  /** Default wake policy when neither the character's MODE pins one
   *  (CharacterModeDef.resume) nor the player's Settings choose one. */
  resume: 'exact' as ResumeSpawn,
  /** Exact-resume vitals floor: the player wakes with at least this fraction
   *  of each pool, so a save written mid-killing-blow can't relaunch into an
   *  unreactable death loop. 0 = fully honest, 1 = always wake refreshed. */
  exactVitalsFloor: 0.1,
  /** Sanity cap on restorable zones — a save claiming more is treated as
   *  corrupt beyond the cap (kept zones still load; the rest are culled). */
  zoneCap: 2000,
} as const;

/** Resolve the wake policy: the mode's pin wins (a sworn covenant is not
 *  softened from the options menu), else the player's setting, else the
 *  engine default. */
export function resolveResumeSpawn(
  modePin: ResumeSpawn | undefined, playerChoice: ResumeSpawn | undefined,
): ResumeSpawn {
  return modePin ?? playerChoice ?? WORLDSTATE_CFG.resume;
}

// --- the schema --------------------------------------------------------------

/** One remembered enemy (mirrors the engine's ZoneEnemyMemo — plain JSON). */
export interface SavedEnemyMemo {
  defId: string;
  level: number;
  x: number;
  y: number;
  life: number;
  faction?: string;
  rarity?: string;
  tag?: string;
  name?: string;
  /** THE TIER FABRIC: the walkable layer it stood on (absent at 0). */
  tier?: number;
}

/** One zone's TTL'd memory (the engine's ZoneMemory, keyed for an array). */
export interface SavedZoneMemory {
  zoneId: string;
  seed: number;
  savedAt: number;
  enemies: SavedEnemyMemo[];
  doorState?: Record<string, 'open' | 'broken'>;
  /** Opened SECRET HOLLOWS (the hollows fabric) — revealed stays revealed. */
  hollows?: string[];
  /** WAVES zones: the assault's progress at capture (see the engine's
   *  ZoneMemory) — a resume mid-gauntlet faces wave N, not wave 1. */
  wave?: number;
  waveActive?: boolean;
  /** BEACON zones: banked charge (seconds) at capture. `spireCharge` is the
   *  legacy single-stone field (still read); `spireCharges` is per stone in
   *  placement order (the ATTUNEMENT CIRCUIT's set). */
  spireCharge?: number;
  spireCharges?: number[];
  /** PROCESSION zones: the escort's stand at capture (see the engine's
   *  ZoneMemory.procession — lost flag, cart spot + life, march origin,
   *  pinned crossing). */
  procession?: SavedProcessionMemo;
  /** OFFERING zones: how fed the hungering altar was at capture. */
  altarOffered?: number;
  /** SOLVED riddle run-ids (the puzzle fabric) — solved stays solved for
   *  the memory's life; never gates progression. */
  puzzlesDone?: string[];
}

/** The procession rider, plain JSON (mirrors the engine's shape). */
export interface SavedProcessionMemo {
  lost?: boolean;
  started?: boolean;
  x?: number; y?: number; life?: number;
  sx?: number; sy?: number; destIdx?: number;
}

/** Structural scrub for a persisted procession rider — finite numbers only,
 *  booleans by identity; a rider with nothing valid left returns undefined. */
export function sanitizeProcessionMemo(raw: unknown): SavedProcessionMemo | undefined {
  const p = raw as Record<string, unknown> | null;
  if (!p || typeof p !== 'object') return undefined;
  const num = (v: unknown): number | undefined =>
    typeof v === 'number' && Number.isFinite(v) ? v : undefined;
  const out: SavedProcessionMemo = {};
  if (p.lost === true) out.lost = true;
  if (p.started === true) out.started = true;
  const x = num(p.x), y = num(p.y);
  if (x !== undefined && y !== undefined) { out.x = x; out.y = y; }
  const life = num(p.life);
  if (life !== undefined) out.life = Math.max(1, life);
  const sx = num(p.sx), sy = num(p.sy);
  if (sx !== undefined && sy !== undefined) { out.sx = sx; out.sy = sy; }
  const di = num(p.destIdx);
  if (di !== undefined && di >= 0) out.destIdx = Math.floor(di);
  return Object.keys(out).length ? out : undefined;
}

export interface SavedQuestEntry { questId: string; zoneId: string; fieldDone: boolean; }

/** Where the player stood at save, plus how hurt they were (fractions of each
 *  pool's max, so a post-save recalc — new gear rules, rebalanced passives —
 *  restores the same PROPORTIONAL state, never an over-cap absolute). */
export interface SavedPlayerSpot {
  zoneId: string;
  x: number;
  y: number;
  vitals?: { life?: number; mana?: number; es?: number };
}

export interface WorldStateSave {
  schemaVersion: number;
  /** Every on-graph zone, verbatim (ZoneDefs are pure JSON by design; the
   *  transient exitBoundaries annotation is stripped at write). */
  zones: ZoneDef[];
  /** The gen_<n> mint counter — restored so resumed mints never collide. */
  nextGenId: number;
  /** World clock (game seconds): day/night phase + zone-memory TTL basis. */
  time: number;
  visited: string[];
  /** Zone ids known by RECON (a survey spire's pulse) rather than boots —
   *  map intel only. Absent on older saves (they simply have no intel). */
  surveyed?: string[];
  discoveredWaypoints: string[];
  memory?: SavedZoneMemory[];
  quests?: { active: SavedQuestEntry[]; completed: string[] };
  player?: SavedPlayerSpot;
  /** Per-overlay snapshot bag (WorldSim.snapshotOverlays — open, keyed by
   *  overlay id[@dimension], ':'-prefixed keys reserved for sim ledgers). */
  overlays?: Record<string, unknown>;
}

// --- sanitizers (registry-tolerant, never throw) ------------------------------

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const SIDES = new Set(['n', 's', 'e', 'w']);

/** Structural + registry scrub of one saved ZoneDef. Returns the def (mutated
 *  in place — it's already a private JSON clone) or null to cull it. The bar
 *  is deliberately LOW: only what would crash or corrupt the engine fails a
 *  zone; everything else is levelgen's own tolerance to degrade. */
function sanitizeZoneDef(raw: unknown): ZoneDef | null {
  const z = raw as ZoneDef | null;
  if (!z || typeof z !== 'object') return null;
  if (typeof z.id !== 'string' || !z.id || typeof z.name !== 'string') return null;
  if (!isFiniteNum(z.level) || !z.size || !isFiniteNum(z.size.w) || !isFiniteNum(z.size.h)
    || z.size.w < 200 || z.size.h < 200) return null;
  if (!z.map || !isFiniteNum(z.map.x) || !isFiniteNum(z.map.y)) return null;
  if (!z.objective || typeof z.objective !== 'object' || typeof z.objective.kind !== 'string') return null;
  if (!z.theme || typeof z.theme !== 'object' || !Array.isArray(z.layout)) return null;
  if (!Array.isArray(z.exits)) return null;
  // Caves never enter the graph save (they live off-graph and re-mint from
  // their parent's seed); a def claiming caveDepth here is malformed.
  if (z.caveDepth != null) return null;
  z.exits = z.exits.filter(e =>
    e && typeof e.to === 'string' && SIDES.has(e.side as string)
    && (e.at === undefined || isFiniteNum(e.at)));
  // Transient annotations — re-derived every zone load; never persisted.
  delete z.exitBoundaries;
  delete z.exitRoads;
  delete z.exitMelds;
  // KIND is IDENTITY, and live registries own identity: an authored zone
  // re-adopts its authored kind (a save minted before the town was kinded
  // still wakes wearing the ring), and a generated zone's saved kind must
  // still resolve in ZONE_KINDS or it drops to plain ground.
  const authored = ZONES[z.id];
  if (authored) {
    if (authored.kind === undefined) delete z.kind;
    else z.kind = authored.kind;
  } else if (z.kind !== undefined && !ZONE_KINDS[z.kind]) {
    console.warn(`[worldstate] zone '${z.id}': kind '${z.kind}' unregistered — dropped`);
    delete z.kind;
  }
  // THE BARE-NAME LAW migration: mints used to bake the rolled face into the
  // name ("Gorewood Downs (thicket)"); the face now rides variantName as data
  // and the walking name stays bare. Strip EXACTLY the recorded face — never
  // a guess, so authored parentheticals in hand-named zones survive intact.
  if (z.variantName && z.name.endsWith(` (${z.variantName})`)) {
    z.name = z.name.slice(0, z.name.length - (z.variantName.length + 3));
  }
  // THE QUICKENING's stamp (ZoneDef.quickened): a mid-window save resumes
  // stamped — the engine's reconcile sweep re-marries stamp and overlay arc
  // (and reverts orphans) on the first beat. Here we only guarantee SHAPE:
  // a malformed block restores the true level if it still knows it, then
  // drops; a well-formed one rides through untouched.
  if (z.quickened !== undefined) {
    const q = z.quickened as unknown as { key?: unknown; baseLevel?: unknown; until?: unknown } | null;
    if (!q || typeof q !== 'object' || typeof q.key !== 'string'
      || !isFiniteNum(q.baseLevel) || !isFiniteNum(q.until)) {
      if (q && isFiniteNum(q.baseLevel) && q.baseLevel >= 1) z.level = Math.round(q.baseLevel);
      console.warn(`[worldstate] zone '${z.id}': malformed quickened stamp — dropped`);
      delete z.quickened;
    }
  }
  // Registry scrubs: packs reference live monsters, a war needs both armies,
  // a spawner objective needs its spawner def, a layout family must exist.
  if (z.packs?.table) {
    const dropped = z.packs.table.filter(e => !e || !MONSTERS[e.id]).map(e => e?.id);
    if (dropped.length) {
      console.warn(`[worldstate] zone '${z.id}': dropped pack rows for unknown monster(s):`, dropped);
      z.packs = { ...z.packs, table: z.packs.table.filter(e => e && MONSTERS[e.id]) };
    }
  }
  if (z.factionWar && (!FACTIONS[z.factionWar[0]] || !FACTIONS[z.factionWar[1]])) {
    console.warn(`[worldstate] zone '${z.id}': faction war references unknown faction — dropped`);
    delete z.factionWar;
  }
  if (z.objective.kind === 'spawners' && 'spawnerId' in z.objective
    && !MONSTERS[(z.objective as { spawnerId: string }).spawnerId]) {
    console.warn(`[worldstate] zone '${z.id}': spawner objective names unknown monster — degraded to clear`);
    z.objective = { kind: 'clear' };
  }
  if (z.layoutType && z.layoutType !== 'plains' && !hasLayout(z.layoutType)) {
    console.warn(`[worldstate] zone '${z.id}': layout '${z.layoutType}' unregistered — generateLayout will fall back`);
  }
  return z;
}

/** Stand a saved zone list back up: structural scrub per def, the zone cap,
 *  duplicate-id cull, event-zone transience (eventOwned defs survive only if
 *  CLAIMED — by the restored quest log or a restored owning overlay), then
 *  road healing (exits to culled zones prune; '?' frontiers stay). Returns
 *  null when the result couldn't hold a world (no town ⇒ nothing to wake in). */
export function sanitizeWorldZones(
  rawZones: unknown, claimedEventZones: ReadonlySet<string>,
): Record<string, ZoneDef> | null {
  if (!Array.isArray(rawZones)) return null;
  if (rawZones.length > WORLDSTATE_CFG.zoneCap) {
    console.warn(`[worldstate] save claims ${rawZones.length} zones — culling past the ${WORLDSTATE_CFG.zoneCap} cap`);
  }
  const out: Record<string, ZoneDef> = {};
  for (const raw of rawZones.slice(0, WORLDSTATE_CFG.zoneCap)) {
    const z = sanitizeZoneDef(raw);
    if (!z || out[z.id]) continue;
    if (z.eventOwned && !claimedEventZones.has(z.id)) continue; // the transience rule
    out[z.id] = z;
  }
  if (!out[START_ZONE]) return null; // no town — not a world we can wake in
  // Heal the roads: an exit into a culled zone is pruned on BOTH sides (the
  // weave re-densifies naturally as play continues); frontiers ride through.
  for (const z of Object.values(out)) {
    z.exits = z.exits.filter(e => e.to === '?' || out[e.to]);
    if (z.searoutes) z.searoutes = z.searoutes.filter(id => out[id]);
  }
  return out;
}

/** Validate one saved enemy memo (registry-checked at RESTORE-into-zone time
 *  too — this is the cheap structural pass at adopt). */
export function sanitizeEnemyMemo(raw: unknown): SavedEnemyMemo | null {
  const e = raw as SavedEnemyMemo | null;
  if (!e || typeof e !== 'object' || typeof e.defId !== 'string') return null;
  if (![e.level, e.x, e.y, e.life].every(isFiniteNum)) return null;
  return e;
}
