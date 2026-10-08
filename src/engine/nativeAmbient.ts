import { clamp, vec, type Vec2 } from '../core/math';
import { unionArea, type Bounds } from '../world/shape';
import type { GridWalkField } from '../world/gridWalk';
import type { WalkField } from '../world/walk';
import type { Actor } from './actor';
import type { Doodad } from './levelgen';
import type { ZoneDef, PackTableEntry, PackArchetype } from '../data/zones';
import type { MonsterDef, WildlifeRow } from '../data/monsters';
import type { MonsterRarity, rollRarity } from './rarity';
import type { magicPackPool, magicPackSize, rollMagicPack } from './magicPacks';
import type { encounterGroupContext, rollEncounterGroup, EncounterGroupSpawnOptions } from './encounterGroups';
import type { storyTable, tierFloorAt } from './tiers';
import type { presenceMul } from './presence';

/** The original ambient operations, with every area/world-dependent read made
 * explicit. A new area host must supply its complete native resolution/factory
 * sources and local geometry. This seam neither admits controllers nor swaps a
 * live World's zone, changes its caps, or filters its native population tables. */
export interface NativeAmbientHost {
  readonly arena: Bounds;
  readonly walk: WalkField | null;
  readonly tierViews: readonly (WalkField | undefined)[] | null;
  readonly player: Actor | undefined;
  readonly actors: Actor[];
  readonly doodads: readonly Doodad[];
  readonly config: { readonly countScale: number; readonly referenceArea: number; readonly fieldAreaCap: number; readonly pocketAreaFloor: number; readonly tierPackSplit: number };
  readonly random: () => number;
  rand(lo: number, hi: number): number;
  randInt(lo: number, hi: number): number;
  isGridWalk(walk: WalkField | null): walk is GridWalkField;
  monster(id: string): MonsterDef | undefined;
  packageActive(id: string, level: number): boolean;
  farPoint(minFromPlayer: number): Vec2;
  weightedPick(table: readonly PackTableEntry[], level?: number): string;
  rollPackSize(archetypes: PackArchetype[]): number;
  rollRarity: typeof rollRarity;
  magicPackPool: typeof magicPackPool;
  magicPackSize: typeof magicPackSize;
  rollMagicPack: typeof rollMagicPack;
  storyTable: typeof storyTable;
  tierFloorAt: typeof tierFloorAt;
  encounterGroupContext: typeof encounterGroupContext;
  rollEncounterGroup: typeof rollEncounterGroup;
  spawnEncounterGroup(recipe: string, level: number, at: Vec2, options: EncounterGroupSpawnOptions): Actor[];
  nextSquadId(): number;
  createMonster(id: string, level: number, team: 'enemy'): Actor;
  placeInHabitat(actor: Actor): boolean;
  findFreeSpot(at: Vec2, radius: number, tier?: number): Vec2;
  promoteRarity(actor: Actor, rarity: MonsterRarity, options: { distinctName: boolean }): void;
  promoteMagicPack(members: Actor[], id: string): unknown;
  wildlifeTableFor(def: ZoneDef): readonly WildlifeRow[] | undefined;
  verminPressure(): number;
  presenceMul: typeof presenceMul;
  notice(text: string, color: string, size: number, category: 'war'): void;
}
/** Prior weather/territory resolution belongs to its original load-stage owner.
 * New area receipts freeze this complete resolved table and the controller
 * source identity; an extraction alone does not implement those controllers. */
export interface NativeAmbientResolution {
  readonly sourceIdentity: string;
  readonly table: readonly PackTableEntry[];
  readonly countMul: number;
  readonly inject: readonly string[];
}


/** Resolved at the wildlife stage, which occurs later than packs. Capturing
 * these inputs does not resolve presence bands, species, groups, or factories;
 * those host callbacks must still be bound to their complete source owners. */
export interface NativeWildlifeResolution {
  readonly sourceIdentity: string;
  readonly table: readonly WildlifeRow[] | undefined;
  readonly verminPressure: number;
}
export interface NativeAmbientResolvedInputs {
  readonly packs: NativeAmbientResolution;
  readonly wildlife: NativeWildlifeResolution;
}
/** Detached immutable complete stage receipts. Preserve row/key order and own
 * undefined values; reject executable/accessor/non-data inputs, never filter a
 * row or adjust its count. Main continues resolving at its original stages and
 * does not use this inactive source-owned boundary. These identities belong to
 * the caller's resolution owners, not a claim of controller admission. */
export function captureNativeAmbientResolvedInputs(input: NativeAmbientResolvedInputs): NativeAmbientResolvedInputs {
  const active = new Set<object>();
  const copy = (value: unknown): unknown => {
    if (value === undefined || value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'object' || active.has(value)) throw Error('Invalid native ambient resolved data');
    const array = Array.isArray(value);
    if (Object.getPrototypeOf(value) !== (array ? Array.prototype : Object.prototype)) throw Error('Non-plain native ambient resolved data');
    const keys = Reflect.ownKeys(value), descriptors = Object.getOwnPropertyDescriptors(value);
    if (keys.some(k => typeof k !== 'string' || !(array && k === 'length') && (['__proto__', 'prototype', 'constructor'].includes(k) || !descriptors[k].enumerable || !Object.hasOwn(descriptors[k], 'value'))))
      throw Error('Non-data native ambient resolved property');
    active.add(value);
    try {
      if (array) {
        if (keys.length !== value.length + 1 || value.some((_, i) => !Object.hasOwn(value, i))) throw Error('Sparse native ambient resolved data');
        const out: unknown[] = [];
        for (let i = 0; i < value.length; i++) {
          if (!Object.hasOwn(value, i)) throw Error('Sparse native ambient resolved data');
          out.push(copy(descriptors[String(i)].value));
        }
        return Object.freeze(out);
      }
      const out = Object.create(null) as Record<string, unknown>;
      for (const key of keys as string[]) out[key] = copy(descriptors[key].value);
      return Object.freeze(out);
    } finally { active.delete(value); }
  };
  const saved = copy(input) as NativeAmbientResolvedInputs;
  const identity = (id: unknown) => typeof id === 'string' && id.length > 0;
  if (!saved?.packs || !saved.wildlife || !Object.hasOwn(saved.wildlife, 'table') || !identity(saved.packs.sourceIdentity) || !identity(saved.wildlife.sourceIdentity)
    || !Number.isFinite(saved.packs.countMul) || saved.packs.countMul < 0
    || !Array.isArray(saved.packs.table) || !Array.isArray(saved.packs.inject) || saved.packs.inject.some(id => !identity(id))
    || saved.packs.table.some(row => !row || !identity(row.id) || !Number.isFinite(row.weight))
    || !Number.isFinite(saved.wildlife.verminPressure) || saved.wildlife.verminPressure < 0
    || saved.wildlife.table !== undefined && (!Array.isArray(saved.wildlife.table) || saved.wildlife.table.some(row =>
      !row || !identity(row.id) || !Number.isFinite(row.chance) || !Array.isArray(row.count) || row.count.length !== 2
      || row.count.some((n: unknown) => typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) || row.count[1] < row.count[0])))
    throw Error('Invalid native ambient stage receipt');
  return saved;
}

export function spawnNativePacks(host: NativeAmbientHost, def: ZoneDef, factor = 1, table?: readonly PackTableEntry[]): void {
  const spec = def.packs;
  if (!spec) return;
  // EXPLICIT ZERO opts a zone out of ambient packs entirely (the quay's
  // near-sanctuary read) — the max(1,…) floor below would otherwise force
  // one pack through any density. Authored fauna still breathes (its own
  // lane); staged spawns (events, sieges, contests) never route here.
  if (def.packDensity === 0) return;
  const picks = table && table.length ? table : spec.table;
  // Bigger zones hold more packs — count tracks the LINEAR span (sqrt of area), so
  // density (and net xp/zone) stays roughly flat. A FIELD mega-zone is mostly walkable
  // BLOB inside a big bounding rect, so it scales on its WALKABLE cell area (not the
  // rect) with a larger cap — the enemy budget matches where you can actually fight.
  // A purchased POCKET budgets on its walkable carve for the same reason,
  // in the other direction: a carve layout (dungeon/mycelia faces walk
  // 10-25% of their rect) minted what READ as a tiny hollow while still
  // budgeting a full rect's population — crammed, in a dead-end, against
  // the one portal the player arrives by. Pockets also shed the 0.8 area
  // FLOOR (POCKET_PACK_FLOOR): a deliberately small hollow holds a
  // deliberately small guard, never a full zone's minimum.
  // Every other zone keeps the rect-area + 2.2 cap + 0.8 floor
  // (byte-identical) to preserve shipped balance.
  let area: number, cap = 2.2;
  if (def.field && host.isGridWalk(host.walk)) {
    area = host.walk.walkableCount() * host.walk.cell * host.walk.cell;
    cap = host.config.fieldAreaCap;
  } else if (def.pocket && host.isGridWalk(host.walk)) {
    area = host.walk.walkableCount() * host.walk.cell * host.walk.cell;
  } else {
    // The composite bound's area fold (world/shape.ts): the base piece's
    // classic bbox (×π/4 inscribed) plus each OPEN annex — the same
    // arithmetic, so a piece-less zone budgets to the bit what it always
    // did, and revealed ground buys its own share of the population.
    area = unionArea(host.arena);
  }
  const areaFactor = clamp(Math.sqrt(area / host.config.referenceArea), def.pocket ? host.config.pocketAreaFloor : 0.8, cap);
  const packs = Math.max(1,
    Math.round(host.randInt(spec.count[0], spec.count[1]) * factor * host.config.countScale * areaFactor * (def.packDensity ?? 1)));
  // Crowned champions are warband leaders — only eligible while the Warbands
  // package is live (it gates the apex tier that drives its own unlock).
  const crownedEligible = def.objective.kind !== 'safe'
    && host.player !== undefined
    && host.packageActive('warbands', host.player.level);
  for (let i = 0; i < packs; i++) {
    // Beyond a typical monster's reach, so packs are FOUND, not delivered.
    // The keenest sensors (blood mites, whose swarm AI ×1.4's an already-high
    // detection) still notice you on arrival — by design, that's their thing.
    const at = host.farPoint(840);
    // THE TIER SPLIT (engine/tiers.ts): a tiered zone seeds a share of its
    // packs on the elevated stories — the deck duel and the valley duel
    // are different packs. Rolled per PACK so squads never straddle a rim;
    // multi-story summits deal the elevated share uniformly across their
    // levels. Rolled BEFORE the type pick (the story fold, 2026-08-06) so
    // THE STORY TABLE (engine/tiers.ts storyTable — PackTableEntry.
    // storyPresence, "harder kin near the crown") can shape the offer by
    // the pack's own story: on tiered ground every pack folds at its
    // ROLLED story — ground packs at 0, so a from-the-benches row is
    // absent from the valley — while flat zones skip the fold entirely
    // (short-circuit before any draw: byte-identical stream, A/B-proven).
    // Folding at the rolled story, not the seated one, is the deliberate
    // light-footprint trade: the anchor hunt below lets a refused bench
    // fall a story, so a crown-priced pack can seat one bench lower (or
    // ground out entirely when no bench anchors) still wearing the
    // crown's table. Seat-true folding would need pick-after-anchor — a
    // far heavier stream reorder for a rare misfit.
    const tierLevels = def.tiers && host.tierViews ? Math.max(1, def.tiers.levels ?? 1) : 0;
    const tierPack = tierLevels > 0
      && host.random() < (def.tiers!.packSplit ?? host.config.tierPackSplit);
    const packStory = tierPack && host.walk
      ? (tierLevels > 1 ? 1 + Math.floor(host.random() * tierLevels) : 1) : 0;
    const type = host.weightedPick(tierLevels > 0 ? host.storyTable(picks, packStory) : picks, def.level);
    // SIZE: a def that declares its NATURAL GROUP (MonsterDef.packSize)
    // sizes its own packs — murmurations field as flocks, hermits walk
    // alone — else a weighted ARCHETYPE spread (swarm / standard /
    // grazing) when the zone defines one, else the flat band. One size
    // roll on the stream whichever lane resolves, so undeclared defs
    // spawn byte-identically to what they always did.
    const ps = host.monster(type)?.packSize;
    let n = ps ? host.randInt(ps[0], ps[1])
      : spec.archetypes?.length ? host.rollPackSize(spec.archetypes) : host.randInt(spec.size[0], spec.size[1]);
    const magicEligible = !host.monster(type)?.boss && !host.monster(type)?.passive
      && (!ps || ps[1] > 1) && host.magicPackPool(def.level, def.magicPacks, ps?.[1]).length > 0;
    let leaderRarity = host.rollRarity(crownedEligible, magicEligible);
    if (leaderRarity === 'magic') n = Math.min(host.magicPackSize(def.level, def.magicPacks), ps?.[1] ?? Infinity);
    const magicPack = leaderRarity === 'magic' ? host.rollMagicPack(def.level, def.magicPacks, host.random, n) : undefined;
    if (leaderRarity === 'magic' && !magicPack) leaderRarity = 'normal';
    const magicPackMembers: Actor[] = [];
    // A co-spawned pack IS a squad: shared id + a leader (the elite when one
    // rolled, else the first body) — squad tactics (muster, tokens, focus
    // fire, formations, leader-death reactions) all key off these stamps.
    const squadId = host.nextSquadId();
    // The BENCH picks the anchor (the wildlife rig's proven sampling): a
    // valley anchor usually stands beyond any snap radius of the layer,
    // so an elevated pack rolls its own seat instead of quietly staying
    // grounded (the old near-`at` snap under-filled every deck). A roll
    // whose bench refuses falls DOWN the stories from packStory.
    let tierAnchor: Vec2 | null = null;
    let tierAnchorAt = 0;
    if (packStory > 0 && host.walk) {
      for (let t = packStory; t >= 1 && !tierAnchor; t--) {
        const view = host.tierViews?.[t];
        if (!view) continue;
        for (let s = 0; s < 8; s++) {
          const q = view.snapToWalkable(vec(host.rand(200, host.arena.w - 200), host.rand(200, host.arena.h - 200)));
          if (host.tierFloorAt(host.walk.regionAt?.(q.x, q.y), t)) { tierAnchor = vec(q.x, q.y); tierAnchorAt = t; break; }
        }
      }
    }
    // Mixed encounter groups replace NORMAL ambient packs, preserving the
    // existing rare/magic opportunities and sealed authored-map compositions.
    const encounterGroupRecipe = leaderRarity === 'normal' && (def.cohort !== 'authored' || spec.encounterGroups !== undefined)
      ? host.rollEncounterGroup(host.encounterGroupContext(def, host.monster(type)?.faction, tierAnchorAt), spec.encounterGroups) : undefined;
    if (encounterGroupRecipe && host.spawnEncounterGroup(encounterGroupRecipe, def.level, tierAnchor ?? at,
      { tier: tierAnchorAt, persistent: true, maxMembers: spec.encounterGroups === false ? undefined : spec.encounterGroups?.maxMembers }).length) continue;
    for (let k = 0; k < n; k++) {
      const m = host.createMonster(type, def.level, 'enemy');
      // TERRAIN-BOUND (MonsterDef.habitat): the body exists only on its
      // ground — relocate onto a matching doodad, or don't spawn it at all
      // (a zone with no big-enough pond simply has no lake horror).
      if (m.habitat && !host.placeInHabitat(m)) continue;
      if (k === 0 && leaderRarity !== 'normal' && !magicPack) host.promoteRarity(m, leaderRarity, { distinctName: true });
      m.squadId = squadId;
      m.squadLeader = k === 0;
      if (!m.habitat) {
        // findFreeSpot: the jittered point can land deep inside a rock/thicket
        // blob that clampPos's passes can't escape — a monster BORN embedded
        // pingpongs against the collision resolve forever (cost + nonsense).
        m.pos = host.findFreeSpot(vec(at.x + host.rand(-90, 90), at.y + host.rand(-90, 90)), m.radius);
        if (tierAnchor && host.walk && host.tierViews?.[tierAnchorAt]) {
          const q = host.tierViews[tierAnchorAt]!.snapToWalkable(
            vec(tierAnchor.x + host.rand(-90, 90), tierAnchor.y + host.rand(-90, 90)));
          if (host.tierFloorAt(host.walk.regionAt?.(q.x, q.y), tierAnchorAt)) { m.pos = vec(q.x, q.y); m.tier = tierAnchorAt; }
          else { m.pos = vec(tierAnchor.x, tierAnchor.y); m.tier = tierAnchorAt; }
        }
      }
      host.actors.push(m);
      magicPackMembers.push(m);
    }
    if (magicPack) host.promoteMagicPack(magicPackMembers, magicPack.id);
  }
}

export function placeNativeInHabitat(host: NativeAmbientHost, m: Actor): boolean {
  const h = m.habitat;
  if (!h) return true;
  const spots = host.doodads.filter(d =>
    d.kind === h.kind && !d.gone && d.radius >= (h.minRadius ?? 0));
  if (!spots.length) return false;
  const s = spots[host.randInt(0, spots.length - 1)];
  const ang = host.rand(0, Math.PI * 2);
  const dd = Math.sqrt(host.random()) * Math.max(0, s.radius - m.radius * 0.5);
  m.pos = vec(s.pos.x + Math.cos(ang) * dd, s.pos.y + Math.sin(ang) * dd);
  m.confine = { x: s.pos.x, y: s.pos.y, r: s.radius + (h.grace ?? 24) };
  return true;
}

export function spawnNativeWildlife(host: NativeAmbientHost, def: ZoneDef): void {
  // AUTHORED FAUNA (ZoneDef.fauna) REPLACES the biome table outright — and it
  // alone passes the sanctuary gate below (the town's gutter rats, the
  // cellar's roaches): explicit authorship is the opt-in. The validator
  // holds safe-zone fauna to 'critter'-tagged texture.
  const authored = def.fauna;
  // SPECIAL zones host no ambient life (the open sea, boss arenas) — the same
  // gate spawnPacks/spawnContest already honor. Without it, the sea's
  // undefined biome fell through to the plains fallback below and hares,
  // wolves and lash-maidens spawned ON OPEN WATER during a voyage.
  // WAVES arenas are sealed stages too: nothing wanders into The Pit —
  // no grazing hares, no passing hunters, only what the wave brings.
  if (!authored && (def.objective.kind === 'safe' || def.objective.kind === 'waves' || def.special)) return;
  // THE COHORT LAW: a closed-membership zone hosts no biome fallback fauna
  // — its authored rows (if any) are the whole ambient cohort too.
  if (!authored && def.cohort === 'authored') return;
  const table = host.wildlifeTableFor(def);
  if (!table?.length) return;
  // TOWN PRESSURE (the Verminfall's threat-as-texture): while warrens fester
  // in the near ring, authored VERMIN-tagged rows swell their chance — home
  // reads the siege in its gutters before the map says a word.
  const vermMul = host.verminPressure();
  for (const w of table) {
    // Presence gates fauna too: row envelope × def envelope scale the CHANCE
    // (rows aren't a weighted pick against each other, so chance is the dial).
    const lvl = Math.max(1, def.level);
    // A row naming an unknown monster is a DATA bug (the validator warns) —
    // but it must never crash a zone's gen. Skip it; the warning is the fix.
    if (!host.monster(w.id)) continue;
    const pressed = authored && host.monster(w.id)?.tags?.includes('vermin') ? vermMul : 1;
    // packDensity is the zone's ONE ambient-density dial: it has always
    // scaled the pack budget; BIOME-FALLBACK fauna chances breathe with
    // it too. AUTHORED rows are exempt — explicit authorship is a
    // deliberate population (the cellar's roaches, the quay's crabs),
    // never ambience to be dialed away.
    const chance = w.chance * pressed * host.presenceMul(w.presence, lvl)
      * host.presenceMul(host.monster(w.id)?.presence, lvl) * (authored ? 1 : (def.packDensity ?? 1));
    if (host.random() >= chance) continue;
    const n = host.randInt(w.count[0], w.count[1]);
    // TIER ROW (WildlifeRow.tier — the tier fabric): fauna that lives on
    // an ELEVATED layer (scamps atop the buttes, rats in the drains,
    // condor roosts on a summit bench). A zone without a tier layer
    // simply skips the row — the same graceful no-op as `near` without
    // its doodad; a row asking for a story the zone doesn't stack clamps
    // to the highest one it does.
    const wTier = (w.tier ?? 0) >= 1 && def.tiers && host.tierViews
      ? Math.min(w.tier ?? 1, Math.max(1, def.tiers.levels ?? 1)) : 0;
    if ((w.tier ?? 0) >= 1 && wTier === 0) continue;
    // PLACEMENT HINT (row.near): the band spawns on the RIM of a matching
    // doodad — frogs at the water's edge, not the meadow's middle. A zone
    // without one simply skips the row (no pond, no frogs).
    let at = host.farPoint(700);
    if (wTier >= 1 && host.tierViews?.[wTier] && host.walk) {
      // Sample the LAYER for a seat (several tries — a lone random point
      // often lands a valley away from any deck; one miss must not eat
      // the row's whole chance).
      const view = host.tierViews[wTier]!;
      let seat: Vec2 | null = null;
      for (let s = 0; s < 8 && !seat; s++) {
        const q = view.snapToWalkable(vec(host.rand(200, host.arena.w - 200), host.rand(200, host.arena.h - 200)));
        if (host.tierFloorAt(host.walk.regionAt?.(q.x, q.y), wTier)) seat = vec(q.x, q.y);
      }
      if (!seat) continue; // the layer truly has no floor — skip, never strand
      at = seat;
    } else if (w.near) {
      const spots = host.doodads.filter(d => d.kind === w.near && !d.gone);
      if (!spots.length) continue;
      const s = spots[host.randInt(0, spots.length - 1)];
      const ang = host.rand(0, Math.PI * 2);
      at = vec(s.pos.x + Math.cos(ang) * (s.radius + 26), s.pos.y + Math.sin(ang) * (s.radius + 26));
    }
    const squadId = host.nextSquadId();
    let landed = 0;
    for (let k = 0; k < n; k++) {
      const m = host.createMonster(w.id, Math.max(1, def.level), 'enemy');
      if (m.habitat && !host.placeInHabitat(m)) continue;
      m.squadId = squadId;
      m.squadLeader = k === 0;
      if (!m.habitat) {
        if (wTier >= 1 && host.tierViews?.[wTier] && host.walk) {
          // Tier fauna seats on its OWN floor (the jittered snap keeps the
          // band together without wandering off the deck).
          const q = host.tierViews[wTier]!.snapToWalkable(vec(at.x + host.rand(-90, 90), at.y + host.rand(-90, 90)));
          if (host.tierFloorAt(host.walk.regionAt?.(q.x, q.y), wTier)) { m.pos = vec(q.x, q.y); m.tier = wTier; }
          else { m.pos = vec(at.x, at.y); m.tier = wTier; }
        } else {
          m.pos = host.findFreeSpot(vec(at.x + host.rand(-110, 110), at.y + host.rand(-110, 110)), m.radius);
        }
      }
      host.actors.push(m);
      landed++;
    }
    // THE ARRIVAL LINE (WildlifeRow.announce): an EVENT row tells the
    // heroes it landed — the "something stirs in this zone" beat, pure data.
    if (w.announce && landed > 0) {
      host.notice(w.announce, '#e8c84a', 13, 'war'); // THE NOTICE FEED: once for the world, not once per seat
    }
  }
}
