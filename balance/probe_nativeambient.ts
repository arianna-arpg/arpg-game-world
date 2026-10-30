import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { clamp, vec, rand, randInt } from '../src/core/math';
import { World } from '../src/engine/world';
import { Actor, resetActorIdCounter } from '../src/engine/actor';
import { MONSTERS, type WildlifeRow } from '../src/data/monsters';
import { type ZoneDef, type PackArchetype, type PackTableEntry } from '../src/data/zones';
import { RARITY_DEFS, rollRarity, type MonsterRarity } from '../src/engine/rarity';
import { magicPackPool, magicPackSize, rollMagicPack } from '../src/engine/magicPacks';
import { encounterGroupContext, rollEncounterGroup } from '../src/engine/encounterGroups';
import { ENCOUNTER_GROUPS } from '../src/data/encounterGroups';
import { TIER_CFG, makeTierView, storyTable, tierFloorAt } from '../src/engine/tiers';
import { presenceMul } from '../src/engine/presence';
import { GridWalkField } from '../src/world/gridWalk';
import { unionArea } from '../src/world/shape';
import { captureNativeActorState } from '../src/worldmass/dormancy';
import { spawnNativePacks, placeNativeInHabitat, spawnNativeWildlife, captureNativeAmbientResolvedInputs, type NativeAmbientHost } from '../src/engine/nativeAmbient';

// The original three World methods are embedded verbatim, independently of
// the shared implementation. No Git, ignored scratch, or runtime source read.
const ORIGINAL = {"worldHash":"0d1aa6dd67782c30742f0c80742da805433d120c9ad846eb0db0cbc85bc527af","methods":{"spawnPacks":"  private spawnPacks(def: ZoneDef, factor = 1, table?: PackTableEntry[]): void {\n    const spec = def.packs;\n    if (!spec) return;\n    // EXPLICIT ZERO opts a zone out of ambient packs entirely (the quay's\n    // near-sanctuary read) — the max(1,…) floor below would otherwise force\n    // one pack through any density. Authored fauna still breathes (its own\n    // lane); staged spawns (events, sieges, contests) never route here.\n    if (def.packDensity === 0) return;\n    const picks = table && table.length ? table : spec.table;\n    // Bigger zones hold more packs — count tracks the LINEAR span (sqrt of area), so\n    // density (and net xp/zone) stays roughly flat. A FIELD mega-zone is mostly walkable\n    // BLOB inside a big bounding rect, so it scales on its WALKABLE cell area (not the\n    // rect) with a larger cap — the enemy budget matches where you can actually fight.\n    // A purchased POCKET budgets on its walkable carve for the same reason,\n    // in the other direction: a carve layout (dungeon/mycelia faces walk\n    // 10-25% of their rect) minted what READ as a tiny hollow while still\n    // budgeting a full rect's population — crammed, in a dead-end, against\n    // the one portal the player arrives by. Pockets also shed the 0.8 area\n    // FLOOR (POCKET_PACK_FLOOR): a deliberately small hollow holds a\n    // deliberately small guard, never a full zone's minimum.\n    // Every other zone keeps the rect-area + 2.2 cap + 0.8 floor\n    // (byte-identical) to preserve shipped balance.\n    let area: number, cap = 2.2;\n    if (def.field && this.walk instanceof GridWalkField) {\n      area = this.walk.walkableCount() * this.walk.cell * this.walk.cell;\n      cap = FIELD_PACK_AREA_CAP;\n    } else if (def.pocket && this.walk instanceof GridWalkField) {\n      area = this.walk.walkableCount() * this.walk.cell * this.walk.cell;\n    } else {\n      // The composite bound's area fold (world/shape.ts): the base piece's\n      // classic bbox (×π/4 inscribed) plus each OPEN annex — the same\n      // arithmetic, so a piece-less zone budgets to the bit what it always\n      // did, and revealed ground buys its own share of the population.\n      area = unionArea(this.arena);\n    }\n    const areaFactor = clamp(Math.sqrt(area / REF_AREA), def.pocket ? POCKET_CFG.packAreaFloor : 0.8, cap);\n    const packs = Math.max(1,\n      Math.round(randInt(spec.count[0], spec.count[1]) * factor * COUNT_SCALE * areaFactor * (def.packDensity ?? 1)));\n    // Crowned champions are warband leaders — only eligible while the Warbands\n    // package is live (it gates the apex tier that drives its own unlock).\n    const crownedEligible = def.objective.kind !== 'safe'\n      && this.player !== undefined\n      && this.sim.packageActive('warbands', this.player.level);\n    for (let i = 0; i < packs; i++) {\n      // Beyond a typical monster's reach, so packs are FOUND, not delivered.\n      // The keenest sensors (blood mites, whose swarm AI ×1.4's an already-high\n      // detection) still notice you on arrival — by design, that's their thing.\n      const at = this.farPoint(840);\n      // THE TIER SPLIT (engine/tiers.ts): a tiered zone seeds a share of its\n      // packs on the elevated stories — the deck duel and the valley duel\n      // are different packs. Rolled per PACK so squads never straddle a rim;\n      // multi-story summits deal the elevated share uniformly across their\n      // levels. Rolled BEFORE the type pick (the story fold, 2026-08-06) so\n      // THE STORY TABLE (engine/tiers.ts storyTable — PackTableEntry.\n      // storyPresence, \"harder kin near the crown\") can shape the offer by\n      // the pack's own story: on tiered ground every pack folds at its\n      // ROLLED story — ground packs at 0, so a from-the-benches row is\n      // absent from the valley — while flat zones skip the fold entirely\n      // (short-circuit before any draw: byte-identical stream, A/B-proven).\n      // Folding at the rolled story, not the seated one, is the deliberate\n      // light-footprint trade: the anchor hunt below lets a refused bench\n      // fall a story, so a crown-priced pack can seat one bench lower (or\n      // ground out entirely when no bench anchors) still wearing the\n      // crown's table. Seat-true folding would need pick-after-anchor — a\n      // far heavier stream reorder for a rare misfit.\n      const tierLevels = def.tiers && this.tierViews ? Math.max(1, def.tiers.levels ?? 1) : 0;\n      const tierPack = tierLevels > 0\n        && Math.random() < (def.tiers!.packSplit ?? TIER_CFG.packSplit);\n      const packStory = tierPack && this.walk\n        ? (tierLevels > 1 ? 1 + Math.floor(Math.random() * tierLevels) : 1) : 0;\n      const type = this.weightedPick(tierLevels > 0 ? storyTable(picks, packStory) : picks, def.level);\n      // SIZE: a def that declares its NATURAL GROUP (MonsterDef.packSize)\n      // sizes its own packs — murmurations field as flocks, hermits walk\n      // alone — else a weighted ARCHETYPE spread (swarm / standard /\n      // grazing) when the zone defines one, else the flat band. One size\n      // roll on the stream whichever lane resolves, so undeclared defs\n      // spawn byte-identically to what they always did.\n      const ps = MONSTERS[type]?.packSize;\n      let n = ps ? randInt(ps[0], ps[1])\n        : spec.archetypes?.length ? rollPackSize(spec.archetypes) : randInt(spec.size[0], spec.size[1]);\n      const magicEligible = !MONSTERS[type]?.boss && !MONSTERS[type]?.passive\n        && (!ps || ps[1] > 1) && magicPackPool(def.level, def.magicPacks, ps?.[1]).length > 0;\n      let leaderRarity = rollRarity(crownedEligible, magicEligible);\n      if (leaderRarity === 'magic') n = Math.min(magicPackSize(def.level, def.magicPacks), ps?.[1] ?? Infinity);\n      const magicPack = leaderRarity === 'magic' ? rollMagicPack(def.level, def.magicPacks, Math.random, n) : undefined;\n      if (leaderRarity === 'magic' && !magicPack) leaderRarity = 'normal';\n      const magicPackMembers: Actor[] = [];\n      // A co-spawned pack IS a squad: shared id + a leader (the elite when one\n      // rolled, else the first body) — squad tactics (muster, tokens, focus\n      // fire, formations, leader-death reactions) all key off these stamps.\n      const squadId = this.nextSquadId();\n      // The BENCH picks the anchor (the wildlife rig's proven sampling): a\n      // valley anchor usually stands beyond any snap radius of the layer,\n      // so an elevated pack rolls its own seat instead of quietly staying\n      // grounded (the old near-`at` snap under-filled every deck). A roll\n      // whose bench refuses falls DOWN the stories from packStory.\n      let tierAnchor: Vec2 | null = null;\n      let tierAnchorAt = 0;\n      if (packStory > 0 && this.walk) {\n        for (let t = packStory; t >= 1 && !tierAnchor; t--) {\n          const view = this.tierViews?.[t];\n          if (!view) continue;\n          for (let s = 0; s < 8; s++) {\n            const q = view.snapToWalkable(vec(rand(200, this.arena.w - 200), rand(200, this.arena.h - 200)));\n            if (tierFloorAt(this.walk.regionAt?.(q.x, q.y), t)) { tierAnchor = vec(q.x, q.y); tierAnchorAt = t; break; }\n          }\n        }\n      }\n      // Mixed encounter groups replace NORMAL ambient packs, preserving the\n      // existing rare/magic opportunities and sealed authored-map compositions.\n      const encounterGroupRecipe = leaderRarity === 'normal' && (def.cohort !== 'authored' || spec.encounterGroups !== undefined)\n        ? rollEncounterGroup(encounterGroupContext(def, MONSTERS[type]?.faction, tierAnchorAt), spec.encounterGroups) : undefined;\n      if (encounterGroupRecipe && this.spawnEncounterGroup(encounterGroupRecipe, def.level, tierAnchor ?? at,\n        { tier: tierAnchorAt, persistent: true, maxMembers: spec.encounterGroups === false ? undefined : spec.encounterGroups?.maxMembers }).length) continue;\n      for (let k = 0; k < n; k++) {\n        const m = this.createMonster(type, def.level, 'enemy');\n        // TERRAIN-BOUND (MonsterDef.habitat): the body exists only on its\n        // ground — relocate onto a matching doodad, or don't spawn it at all\n        // (a zone with no big-enough pond simply has no lake horror).\n        if (m.habitat && !this.placeInHabitat(m)) continue;\n        if (k === 0 && leaderRarity !== 'normal' && !magicPack) this.promoteRarity(m, leaderRarity, { distinctName: true });\n        m.squadId = squadId;\n        m.squadLeader = k === 0;\n        if (!m.habitat) {\n          // findFreeSpot: the jittered point can land deep inside a rock/thicket\n          // blob that clampPos's passes can't escape — a monster BORN embedded\n          // pingpongs against the collision resolve forever (cost + nonsense).\n          m.pos = this.findFreeSpot(vec(at.x + rand(-90, 90), at.y + rand(-90, 90)), m.radius);\n          if (tierAnchor && this.walk && this.tierViews?.[tierAnchorAt]) {\n            const q = this.tierViews[tierAnchorAt]!.snapToWalkable(\n              vec(tierAnchor.x + rand(-90, 90), tierAnchor.y + rand(-90, 90)));\n            if (tierFloorAt(this.walk.regionAt?.(q.x, q.y), tierAnchorAt)) { m.pos = vec(q.x, q.y); m.tier = tierAnchorAt; }\n            else { m.pos = vec(tierAnchor.x, tierAnchor.y); m.tier = tierAnchorAt; }\n          }\n        }\n        this.actors.push(m);\n        magicPackMembers.push(m);\n      }\n      if (magicPack) this.promoteMagicPack(magicPackMembers, magicPack.id);\n    }\n  }","placeInHabitat":"  private placeInHabitat(m: Actor): boolean {\n    const h = m.habitat;\n    if (!h) return true;\n    const spots = this.doodads.filter(d =>\n      d.kind === h.kind && !d.gone && d.radius >= (h.minRadius ?? 0));\n    if (!spots.length) return false;\n    const s = spots[randInt(0, spots.length - 1)];\n    const ang = rand(0, Math.PI * 2);\n    const dd = Math.sqrt(Math.random()) * Math.max(0, s.radius - m.radius * 0.5);\n    m.pos = vec(s.pos.x + Math.cos(ang) * dd, s.pos.y + Math.sin(ang) * dd);\n    m.confine = { x: s.pos.x, y: s.pos.y, r: s.radius + (h.grace ?? 24) };\n    return true;\n  }","spawnWildlife":"  private spawnWildlife(def: ZoneDef): void {\n    // AUTHORED FAUNA (ZoneDef.fauna) REPLACES the biome table outright — and it\n    // alone passes the sanctuary gate below (the town's gutter rats, the\n    // cellar's roaches): explicit authorship is the opt-in. The validator\n    // holds safe-zone fauna to 'critter'-tagged texture.\n    const authored = def.fauna;\n    // SPECIAL zones host no ambient life (the open sea, boss arenas) — the same\n    // gate spawnPacks/spawnContest already honor. Without it, the sea's\n    // undefined biome fell through to the plains fallback below and hares,\n    // wolves and lash-maidens spawned ON OPEN WATER during a voyage.\n    // WAVES arenas are sealed stages too: nothing wanders into The Pit —\n    // no grazing hares, no passing hunters, only what the wave brings.\n    if (!authored && (def.objective.kind === 'safe' || def.objective.kind === 'waves' || def.special)) return;\n    // THE COHORT LAW: a closed-membership zone hosts no biome fallback fauna\n    // — its authored rows (if any) are the whole ambient cohort too.\n    if (!authored && def.cohort === 'authored') return;\n    const table = World.wildlifeTableFor(def);\n    if (!table?.length) return;\n    // TOWN PRESSURE (the Verminfall's threat-as-texture): while warrens fester\n    // in the near ring, authored VERMIN-tagged rows swell their chance — home\n    // reads the siege in its gutters before the map says a word.\n    const vermMul = this.sim.verminfallField?.townPressure() ?? 1;\n    for (const w of table) {\n      // Presence gates fauna too: row envelope × def envelope scale the CHANCE\n      // (rows aren't a weighted pick against each other, so chance is the dial).\n      const lvl = Math.max(1, def.level);\n      // A row naming an unknown monster is a DATA bug (the validator warns) —\n      // but it must never crash a zone's gen. Skip it; the warning is the fix.\n      if (!MONSTERS[w.id]) continue;\n      const pressed = authored && MONSTERS[w.id]?.tags?.includes('vermin') ? vermMul : 1;\n      // packDensity is the zone's ONE ambient-density dial: it has always\n      // scaled the pack budget; BIOME-FALLBACK fauna chances breathe with\n      // it too. AUTHORED rows are exempt — explicit authorship is a\n      // deliberate population (the cellar's roaches, the quay's crabs),\n      // never ambience to be dialed away.\n      const chance = w.chance * pressed * presenceMul(w.presence, lvl)\n        * presenceMul(MONSTERS[w.id]?.presence, lvl) * (authored ? 1 : (def.packDensity ?? 1));\n      if (Math.random() >= chance) continue;\n      const n = randInt(w.count[0], w.count[1]);\n      // TIER ROW (WildlifeRow.tier — the tier fabric): fauna that lives on\n      // an ELEVATED layer (scamps atop the buttes, rats in the drains,\n      // condor roosts on a summit bench). A zone without a tier layer\n      // simply skips the row — the same graceful no-op as `near` without\n      // its doodad; a row asking for a story the zone doesn't stack clamps\n      // to the highest one it does.\n      const wTier = (w.tier ?? 0) >= 1 && def.tiers && this.tierViews\n        ? Math.min(w.tier ?? 1, Math.max(1, def.tiers.levels ?? 1)) : 0;\n      if ((w.tier ?? 0) >= 1 && wTier === 0) continue;\n      // PLACEMENT HINT (row.near): the band spawns on the RIM of a matching\n      // doodad — frogs at the water's edge, not the meadow's middle. A zone\n      // without one simply skips the row (no pond, no frogs).\n      let at = this.farPoint(700);\n      if (wTier >= 1 && this.tierViews?.[wTier] && this.walk) {\n        // Sample the LAYER for a seat (several tries — a lone random point\n        // often lands a valley away from any deck; one miss must not eat\n        // the row's whole chance).\n        const view = this.tierViews[wTier]!;\n        let seat: Vec2 | null = null;\n        for (let s = 0; s < 8 && !seat; s++) {\n          const q = view.snapToWalkable(vec(rand(200, this.arena.w - 200), rand(200, this.arena.h - 200)));\n          if (tierFloorAt(this.walk.regionAt?.(q.x, q.y), wTier)) seat = vec(q.x, q.y);\n        }\n        if (!seat) continue; // the layer truly has no floor — skip, never strand\n        at = seat;\n      } else if (w.near) {\n        const spots = this.doodads.filter(d => d.kind === w.near && !d.gone);\n        if (!spots.length) continue;\n        const s = spots[randInt(0, spots.length - 1)];\n        const ang = rand(0, Math.PI * 2);\n        at = vec(s.pos.x + Math.cos(ang) * (s.radius + 26), s.pos.y + Math.sin(ang) * (s.radius + 26));\n      }\n      const squadId = this.nextSquadId();\n      let landed = 0;\n      for (let k = 0; k < n; k++) {\n        const m = this.createMonster(w.id, Math.max(1, def.level), 'enemy');\n        if (m.habitat && !this.placeInHabitat(m)) continue;\n        m.squadId = squadId;\n        m.squadLeader = k === 0;\n        if (!m.habitat) {\n          if (wTier >= 1 && this.tierViews?.[wTier] && this.walk) {\n            // Tier fauna seats on its OWN floor (the jittered snap keeps the\n            // band together without wandering off the deck).\n            const q = this.tierViews[wTier]!.snapToWalkable(vec(at.x + rand(-90, 90), at.y + rand(-90, 90)));\n            if (tierFloorAt(this.walk.regionAt?.(q.x, q.y), wTier)) { m.pos = vec(q.x, q.y); m.tier = wTier; }\n            else { m.pos = vec(at.x, at.y); m.tier = wTier; }\n          } else {\n            m.pos = this.findFreeSpot(vec(at.x + rand(-110, 110), at.y + rand(-110, 110)), m.radius);\n          }\n        }\n        this.actors.push(m);\n        landed++;\n      }\n      // THE ARRIVAL LINE (WildlifeRow.announce): an EVENT row tells the\n      // heroes it landed — the \"something stirs in this zone\" beat, pure data.\n      if (w.announce && landed > 0) {\n        this.notice(w.announce, '#e8c84a', 13, 'war'); // THE NOTICE FEED: once for the world, not once per seat\n      }\n    }\n  }"}};
const ORIGINAL_METHODS_SHA256 = "731f0548a8db4380984453d5b46f8dee5870a20f5f2834dbbd170ace6a7631bc";
const originalText = Object.values(ORIGINAL.methods).join('\n');
assert.equal(createHash('sha256').update(originalText).digest('hex'), ORIGINAL_METHODS_SHA256);
function rollPackSize(archs: PackArchetype[]): number {
  let total = 0;
  for (const a of archs) total += a.weight;
  let r = rand(0, total);
  for (const a of archs) { r -= a.weight; if (r <= 0) return randInt(a.size[0], a.size[1]); }
  const last = archs[archs.length - 1];
  return randInt(last.size[0], last.size[1]);
}
const deps = { clamp, vec, rand, randInt, GridWalkField, unionArea, COUNT_SCALE: 1.25,
  REF_AREA: 1900 * 1300, FIELD_PACK_AREA_CAP: 3, POCKET_CFG: { packAreaFloor: 0.3 },
  TIER_CFG, MONSTERS, rollPackSize, magicPackPool, magicPackSize, rollMagicPack,
  rollRarity, storyTable, tierFloorAt, encounterGroupContext, rollEncounterGroup, presenceMul, World };
const js = ts.transpileModule(`class ArchivedAmbient {\n${originalText}\n}`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
// Archived methods deliberately retain their private/native syntax until this
// independent TS transpilation. The dependency values are the actual owners.
const archived = new Function(...Object.keys(deps), `${js}\nreturn ArchivedAmbient.prototype;`)(...Object.values(deps)) as Record<string, (...args: unknown[]) => unknown>;
bootSimEngine();
const restoreBoot = seedGlobalRandom(792611);
const worlds = [makeSimWorld('warrior', 991), makeSimWorld('warrior', 991)];
restoreBoot();
const zoneBase = worlds[0].zone;
let pairs = 0, attempted = 0, admitted = 0, randomDraws = 0, groups = 0;
const snapshots = (actors: Actor[]) => actors.map(a => {
  const state = captureNativeActorState(a);
  assert.ok(state, `complete native birth state supported: ${a.defId}`);
  return state;
});
const norm = (v: unknown): unknown => {
  if (v instanceof Actor) return { actor: v.id, state: snapshots([v])[0] };
  if (Array.isArray(v)) return v.map(norm);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, norm(x)]));
  return v;
};
type Fixture = {
  name: string; lane?: 'packs' | 'wildlife' | 'habitat'; zone?: Partial<ZoneDef>;
  table?: PackTableEntry[]; factor?: number; rarity?: MonsterRarity;
  setup?: (w: any) => void; expect?: (r: Result) => void;
};
type Result = { tape: unknown[]; draws: number[]; states: unknown[]; births: unknown[];
  ids: (string | undefined)[]; tiers: number[]; rarity: (MonsterRarity | undefined)[]; confine: unknown[];
  squadLeaders: boolean[]; groupIds: (string | undefined)[]; outcome: unknown; next: number };
function run(f: Fixture, seed: number, old: boolean): Result {
  const w: any = worlds[old ? 0 : 1];
  const z: ZoneDef = { ...zoneBase, id: 'qa_native_ambient', level: 12, objective: { kind: 'clear' },
    cohort: undefined, special: undefined, packDensity: undefined, fauna: undefined,
    biome: 'grove', field: undefined, pocket: undefined, tiers: undefined,
    packs: { count: [3, 3], size: [2, 4], encounterGroups: false, table: [{ id: 'skeleton_warrior', weight: 1 }] }, ...f.zone };
  w.zone = z; w.arena = { w: 2400, h: 1800, shape: 'rect' }; w.walk = null; w.tierViews = null;
  w.actors = [w.player]; w.doodads = []; w.squadSeq = 1200;
  w.player.pos = vec(180, 180); w.player.level = 12;
  f.setup?.(w);
  // Invalidate the actual World's obstacle index after explicitly replacing
  // this fixture's local scenery; no born body/scenery is removed mid-operation.
  w.sceneryChanged?.();
  const tape: unknown[] = [], created: Actor[] = [], draws: number[] = [];
  const saved = new Map<string, unknown>();
  const originalHabitat = w.placeInHabitat;
  if (old) w.placeInHabitat = archived.placeInHabitat;
  for (const name of ['farPoint', 'weightedPick', 'nextSquadId', 'createMonster', 'placeInHabitat',
    'findFreeSpot', 'promoteRarity', 'promoteMagicPack', 'spawnEncounterGroup', 'notice']) {
    const fn = w[name]; saved.set(name, fn);
    w[name] = function (...args: unknown[]) {
      tape.push(['call', name, norm(args)]);
      const result = fn.apply(w, args);
      if (name === 'createMonster') created.push(result);
      tape.push(['return', name, norm(result)]);
      return result;
    };
  }
  const next = mulberry32(seed), random = Math.random;
  Math.random = () => { const n = next(); draws.push(n); return n; };
  resetActorIdCounter(50000);
  let outcome: unknown;
  try {
    const lane = f.lane ?? 'packs';
    if (lane === 'habitat') {
      const m = w.createMonster('lake_horror', z.level, 'enemy');
      outcome = w.placeInHabitat(m); w.actors.push(m);
    } else if (lane === 'wildlife') {
      if (old) archived.spawnWildlife.call(w, z); else w.spawnWildlife(z);
    } else {
      if (old) archived.spawnPacks.call(w, z, f.factor ?? 1, f.table); else w.spawnPacks(z, f.factor ?? 1, f.table);
    }
    const bodies: Actor[] = w.actors.filter((a: Actor) => a !== w.player);
    const r: Result = { tape, draws, states: snapshots(bodies), births: snapshots(created),
      ids: bodies.map(a => a.defId), tiers: bodies.map(a => a.tier), rarity: bodies.map(a => a.rarity),
      confine: bodies.map(a => a.confine), squadLeaders: bodies.map(a => !!a.squadLeader),
      groupIds: bodies.map(a => a.encounterGroup?.recipe), outcome, next: Math.random() };
    return r;
  } finally {
    Math.random = random;
    for (const [key, value] of saved) w[key] = value;
    w.placeInHabitat = originalHabitat;
  }
}
function pair(f: Fixture, seed = 491027): void {
  const weights = Object.fromEntries(Object.entries(RARITY_DEFS).map(([id, d]) => [id, d.weight]));
  try {
    if (f.rarity) for (const [id, d] of Object.entries(RARITY_DEFS)) d.weight = id === f.rarity ? 1 : 0;
    const old = run(f, seed, true), actual = run(f, seed, false);
    assert.deepEqual(actual, old, `${f.name}, seed ${seed}`);
    f.expect?.(actual);
    pairs++; attempted += actual.births.length; admitted += actual.states.length; randomDraws += actual.draws.length;
    groups += actual.groupIds.filter(Boolean).length;
    console.log(`PASS ${f.name} seed ${seed}: ${actual.births.length} factory calls, ${actual.states.length} admitted, ${actual.draws.length - 1} draws`);
  } finally { for (const [id, n] of Object.entries(weights)) RARITY_DEFS[id as MonsterRarity].weight = n; }
}
const wet = (w: any) => { w.doodads = [
  { kind: 'water', pos: vec(1300, 900), radius: 54, seed: 1 }, // too small
  { kind: 'water', pos: vec(600, 650), radius: 150, seed: 2, gone: true },
  { kind: 'mud', pos: vec(1500, 1000), radius: 160, seed: 3 }, // wrong native kind
  { kind: 'water', pos: vec(900, 900), radius: 180, seed: 4, shallow: true, tier: 1 },
  { kind: 'water', pos: vec(1850, 1200), radius: 90, seed: 5 },
]; };
const wetPack: Partial<ZoneDef> = { packs: { count: [2, 2], size: [2, 3], encounterGroups: false, table: [{ id: 'lake_horror', weight: 1 }] } };
const grid = (w: any, tier = false, tiny = false) => {
  w.walk = new GridWalkField(w.arena.w, w.arena.h, 30);
  w.walk.fillRegion(0, 0, tiny ? 300 : w.arena.w, tiny ? 300 : w.arena.h, 'ground');
  if (tier) { w.walk.fillRegion(800, 300, 2200, 1500, 'butte_top'); w.tierViews = [undefined, makeTierView(w.walk, 1), makeTierView(w.walk, 2)]; }
};
for (const seed of [1, 991, 0x7fffffff, 0xffffffff]) {
  pair({ name: 'ordinary actual native factories' }, seed);
  pair({ name: 'native weighted archetype sizes', zone: { packs: { count: [2, 4], size: [1, 2], encounterGroups: false,
    archetypes: [{ weight: 2, size: [1, 2] }, { weight: 1, size: [5, 8] }],
    table: [{ id: 'skeleton_warrior', weight: 2 }, { id: 'plains_wolf', weight: 1 }] } } }, seed);
  pair({ name: 'native habitat full matching doodads', zone: wetPack, setup: wet,
    expect: r => { assert.ok(r.states.length > 0); assert.ok(r.confine.every(Boolean)); } }, seed);
  pair({ name: 'habitat refusal keeps actual factory/RNG attempts', zone: wetPack,
    expect: r => { assert.ok(r.births.length > 0); assert.equal(r.states.length, 0); } }, seed);
}
pair({ name: 'missing pack specification', zone: { packs: undefined }, expect: r => assert.equal(r.draws.length, 1) });
pair({ name: 'explicit zero density', zone: { packDensity: 0 }, expect: r => assert.equal(r.draws.length, 1) });
pair({ name: 'complete pre-resolved table and factor', factor: 1.7, table: [{ id: 'plains_wolf', weight: 1, presence: { from: 1 } }], expect: r => assert.ok(r.ids.every(id => id === 'plains_wolf')) });
pair({ name: 'empty resolved table native authored fallback', table: [] });
pair({ name: 'field walkable-area accounting', zone: { field: {} as ZoneDef['field'] }, setup: w => { w.arena.w = 9000; w.arena.h = 9000; grid(w, false, true); } });
pair({ name: 'pocket carve floor accounting', zone: { pocket: true }, setup: w => grid(w, false, true) });
pair({ name: 'analytic ellipse and active-annex budget', setup: w => { w.arena.shape = 'ellipse'; w.arena.pieces = [
  { id: 'open', x: 2400, y: 400, w: 900, h: 900, active: true },
  { id: 'closed', x: 0, y: 1800, w: 9000, h: 9000, active: false } ]; } });
for (const rarity of ['magic', 'rare', 'champion'] as const) pair({ name: `forced native ${rarity}`, rarity,
  expect: r => assert.ok(r.rarity.includes(rarity)) });
const natural = Object.values(MONSTERS).find(d => d.packSize?.[1] === 1 && !d.boss && !d.passive)!;
pair({ name: 'natural solitary species pack ceiling', zone: { packs: { count: [3, 3], size: [10, 10], table: [{ id: natural.id, weight: 1 }], encounterGroups: false } }, expect: r => assert.ok(r.squadLeaders.every(Boolean)) });
pair({ name: 'story fold plus elevated seats', zone: { tiers: { levels: 2, packSplit: 1 } as ZoneDef['tiers'] }, setup: w => grid(w, true), expect: r => assert.ok(r.tiers.some(t => t === 1)) });
pair({ name: 'missing upper-floor anchors native ground fallback', zone: { tiers: { levels: 2, packSplit: 1 } as ZoneDef['tiers'] }, setup: w => { grid(w); w.tierViews = [undefined, makeTierView(w.walk, 1), makeTierView(w.walk, 2)]; }, expect: r => assert.ok(r.tiers.every(t => t === 0)) });
const group = Object.values(ENCOUNTER_GROUPS).find(g => g.faction === MONSTERS.skeleton_warrior.faction && g.minLevel <= 12)!;
assert.ok(group, 'real encounter group for native replacement');
pair({ name: 'actual complete encounter group replacement', rarity: 'normal', zone: { tileset: group.habitats?.tilesets?.[0], packs: { count: [3, 3], size: [1, 1], table: [{ id: 'skeleton_warrior', weight: 1 }], encounterGroups: { chance: 1, table: [{ id: group.id, weight: 1 }] } } }, expect: r => assert.ok(r.groupIds.some(Boolean)) });
pair({ name: 'encounter group closed-pool native fallback', rarity: 'normal', zone: { packs: { count: [2, 2], size: [2, 2], table: [{ id: 'skeleton_warrior', weight: 1 }], encounterGroups: { chance: 1, table: [] } } }, expect: r => assert.ok(r.groupIds.every(id => id === undefined)) });
for (const seed of [3, 991, 18319]) {
  pair({ name: 'separate native biome wildlife stage', lane: 'wildlife', setup: wet }, seed);
  pair({ name: 'separate native marsh wildlife and matching pond', lane: 'wildlife', zone: { biome: 'marsh' }, setup: wet }, seed);
  pair({ name: 'direct native habitat geometry', lane: 'habitat', setup: wet, expect: r => assert.equal(r.outcome, true) }, seed);
}
for (const gate of [{ objective: { kind: 'safe' } }, { objective: { kind: 'waves' } }, { cohort: 'authored' }, { special: 'sea' }])
  pair({ name: `wildlife native closed gate ${JSON.stringify(gate)}`, lane: 'wildlife', zone: gate as Partial<ZoneDef>, expect: r => { assert.equal(r.states.length, 0); assert.equal(r.draws.length, 1); } });
const fauna: WildlifeRow[] = [
  { id: 'missing_probe_monster', chance: 1, count: [1, 1] },
  { id: 'reed_frog', chance: 1, count: [2, 3], near: 'water', announce: 'fixture native arrival' },
  { id: 'lake_horror', chance: 1, count: [1, 2] },
  { id: 'skeleton_warrior', chance: 1, count: [2, 2], tier: 4 },
  { id: 'plains_wolf', chance: 1, count: [2, 3], presence: { from: 99 } },
];
pair({ name: 'authored fauna bypasses sanctuary/density, preserves near/habitat/refused rows', lane: 'wildlife', zone: { fauna, objective: { kind: 'safe' }, cohort: 'authored', packDensity: 0 }, setup: wet,
  expect: r => { assert.ok(r.ids.includes('reed_frog')); assert.ok(r.ids.includes('lake_horror')); assert.ok(!r.ids.includes('plains_wolf')); assert.ok(r.tape.some(v => Array.isArray(v) && v[1] === 'notice')); } });
pair({ name: 'missing near doodad and missing habitat leave no invented bodies', lane: 'wildlife', zone: { fauna }, expect: r => assert.equal(r.states.length, 0) });
pair({ name: 'fauna tier clamp and actual native seating', lane: 'wildlife', zone: { fauna: [fauna[3]], tiers: { levels: 1 } as ZoneDef['tiers'] }, setup: w => grid(w, true), expect: r => assert.ok(r.tiers.every(t => t === 1) && r.tiers.length > 0) });
pair({ name: 'fauna refuses tier with no floor', lane: 'wildlife', zone: { fauna: [fauna[3]], tiers: { levels: 1 } as ZoneDef['tiers'] }, setup: w => { grid(w); w.tierViews = [undefined, makeTierView(w.walk, 1)]; }, expect: r => assert.equal(r.states.length, 0) });


// Complete stage receipts freeze rather than resolve/replace native row data.
{
  const input = { packs: { sourceIdentity: 'prior-weather-and-effective-spawn', table: [{ id: 'skeleton_warrior', weight: 1,
    presence: { stops: [[1, 0], [12, 1]] as [number, number][] }, storyPresence: undefined }], countMul: 1.7, inject: ['undead'] },
    wildlife: { sourceIdentity: 'wildlife-stage-verminfall', table: fauna, verminPressure: 1.6 } };
  const before = JSON.stringify(input), saved = captureNativeAmbientResolvedInputs(input);
  assert.equal(JSON.stringify(saved), before);
  assert.ok(Object.isFrozen(saved) && Object.isFrozen(saved.packs.table[0].presence) && Object.isFrozen(saved.wildlife.table));
  assert.ok(Object.hasOwn(saved.packs.table[0], 'storyPresence'));
  input.packs.table[0].weight = 99; input.packs.table[0].presence.stops[0][1] = 7; input.packs.inject.push('other');
  assert.equal(JSON.stringify(saved), before);
  assert.equal(Object.getPrototypeOf(saved.packs.table[0]), null);
  const empty = { packs: { sourceIdentity: 'empty', table: [], countMul: 1, inject: [] },
    wildlife: { sourceIdentity: 'absent', table: undefined, verminPressure: 1 } };
  assert.equal(captureNativeAmbientResolvedInputs(empty).wildlife.table, undefined);
  for (const mutate of [
    (x: any) => { x.packs.table = new Array(2); },
    (x: any) => { x.packs.table = [{ id: 'bad', weight: Infinity }]; },
    (x: any) => { x.packs.sourceIdentity = 3; },
    (x: any) => { x.wildlife.verminPressure = NaN; },
    (x: any) => { delete x.wildlife.table; },
    (x: any) => { x.wildlife.table = [{ id: 'bad', chance: 1, count: [3, 1] }]; },
    (x: any) => { Object.defineProperty(x.packs, 'table', { enumerable: true, get() { throw Error('getter must not run'); } }); },
    (x: any) => { x.packs.extra = x; },
    (x: any) => { Object.defineProperty(x.packs, 'length', { enumerable: true, get() { throw Error('getter must not run'); } }); },
  ]) {
    const bad = structuredClone(empty); mutate(bad);
    assert.throws(() => captureNativeAmbientResolvedInputs(bad));
  }
}

// Direct exported operations can use an explicit random source with no ambient
// RNG access. The real-factory tests above separately cover their native draws.
{
  const w: any = worlds[1], host: NativeAmbientHost = w.nativeAmbientHost();
  const rng = mulberry32(918), random = Math.random;
  const isolated = { ...host, random: rng, rand: (lo: number, hi: number) => lo + (hi - lo) * rng(),
    randInt: (lo: number, hi: number) => Math.floor(lo + rng() * (hi - lo + 1)), doodads: [{ kind: 'water', pos: vec(10, 20), radius: 80 }] } as NativeAmbientHost;
  Math.random = () => { throw Error('unexpected ambient RNG'); };
  try {
    const body = { radius: 19, habitat: { kind: 'water', minRadius: 55 } } as Actor;
    assert.equal(placeNativeInHabitat(isolated, body), true);
    assert.equal(body.confine?.r, 104);
    spawnNativePacks(isolated, { ...zoneBase, packs: undefined });
    spawnNativeWildlife(isolated, { ...zoneBase, fauna: undefined, objective: { kind: 'safe' } });
  } finally { Math.random = random; }
}

// A populated explicit host uses only the supplied local geometry, callbacks,
// and stream. A/B/A composition cannot borrow the live World or global RNG.
{
  const runLocal = (seed: number) => {
    const random = mulberry32(seed), actors: Actor[] = [], doodads = [{ kind: 'water', pos: vec(900, 700), radius: 120 }];
    let squad = 0, factoryCalls = 0, draws = 0;
    const rng = () => { draws++; return random(); };
    const host: NativeAmbientHost = {
      arena: { w: 1900, h: 1300, shape: 'rect' }, walk: null, tierViews: null, player: undefined, actors, doodads,
      config: { countScale: 1.25, referenceArea: 1900 * 1300, fieldAreaCap: 3, pocketAreaFloor: 0.3, tierPackSplit: 0.5 },
      random: rng, rand: (lo, hi) => lo + (hi - lo) * rng(), randInt: (lo, hi) => Math.floor(lo + rng() * (hi - lo + 1)),
      isGridWalk: (walk): walk is GridWalkField => walk instanceof GridWalkField,
      monster: id => ({ id, faction: 'local' } as typeof MONSTERS[string]), packageActive: () => false,
      farPoint: min => vec(min + 100 * rng(), min + 100 * rng()), weightedPick: rows => rows[Math.floor(rng() * rows.length)].id,
      rollPackSize: () => { throw Error('unexpected archetype read'); }, rollRarity: () => 'normal',
      magicPackPool: () => [], magicPackSize: () => { throw Error('unexpected magic read'); }, rollMagicPack: () => undefined,
      storyTable, tierFloorAt, encounterGroupContext, rollEncounterGroup: () => undefined,
      spawnEncounterGroup: () => { throw Error('unexpected group birth'); }, nextSquadId: () => ++squad,
      createMonster: id => { factoryCalls++; return { defId: id, radius: 15, pos: vec(0, 0), tier: 0,
        ...(id === 'lake_horror' ? { habitat: { kind: 'water', minRadius: 55, grace: 30 } } : {}) } as Actor; },
      placeInHabitat: actor => placeNativeInHabitat(host, actor), findFreeSpot: at => at,
      promoteRarity: () => { throw Error('unexpected promotion'); }, promoteMagicPack: () => { throw Error('unexpected magic promotion'); },
      wildlifeTableFor: () => [{ id: 'lake_horror', chance: 1, count: [2, 3] }], verminPressure: () => 1, presenceMul: () => 1,
      notice: () => { throw Error('unexpected notice'); },
    };
    const z = { ...zoneBase, objective: { kind: 'clear' }, cohort: undefined, special: undefined, tiers: undefined,
      packs: { count: [2, 2], size: [3, 3], encounterGroups: false, table: [{ id: 'skeleton_warrior', weight: 1 }] } } as ZoneDef;
    spawnNativePacks(host, z);
    const packCount = actors.length;
    spawnNativeWildlife(host, z);
    assert.equal(packCount, 9); assert.ok(actors.length === 11 || actors.length === 12);
    assert.equal(factoryCalls, actors.length);
    return { actors, draws, next: rng() };
  };
  const ambient = Math.random; Math.random = () => { throw Error('ambient RNG escaped explicit host'); };
  try { const a = runLocal(33), b = runLocal(67), a2 = runLocal(33); assert.deepEqual(a2, a); assert.notDeepEqual(b, a); }
  finally { Math.random = ambient; }
}

console.log(`PASS native ambient: ${pairs} pinned-original pairs; ${attempted} actual factory attempts; ${admitted} admitted bodies; ${groups} grouped bodies; ${randomDraws} draw comparisons including sentinels. Original World SHA256 ${ORIGINAL.worldHash}`);
