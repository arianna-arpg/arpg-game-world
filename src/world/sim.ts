// ---------------------------------------------------------------------------
// WORLD SIM — the single object the World owns to run its living overlays.
//
// It ticks day/night (a pure clock), weather, and faction territory, then
// offers the engine one call — resolve() — that composes all three into the
// spawn table and pack count for a zone the player is loading into. It also
// hands the minimap its SVG layers and the HUD its one-line status. Nothing
// here reaches back into World, so the dependency only ever points one way.
// ---------------------------------------------------------------------------

import { Rng } from '../core/rng';
import { FACTIONS, MONSTERS } from '../data/monsters';
import type { PackTableEntry, ZoneDef } from '../data/zones';
import type { AmalgamationField } from '../packages/overlays/amalgamation';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import type { ConclaveField } from '../packages/overlays/conclave';
import type { ContagionField } from '../packages/overlays/contagion';
import type { DeepwinterField } from '../packages/overlays/deepwinter';
import type { AscentField } from '../packages/overlays/ascent';
import type { DescentField } from '../packages/overlays/descent';
import type { HoldfastField } from '../packages/overlays/holdfast';
import type { UnsealingField } from '../packages/overlays/unsealing';
import type { MyceliaField } from '../packages/overlays/mycelia';
import type { CrusadeField } from '../packages/overlays/crusade';
import type { DeadwakeField } from '../packages/overlays/deadwake';
import type { MigrationField } from '../packages/overlays/migration';
import type { SwarmingField } from '../packages/overlays/swarming';
import type { BrigandField } from '../packages/overlays/brigands';
import type { HauntField } from '../packages/overlays/haunting';
import type { LongNightField } from '../packages/overlays/longNight';
import type { StrayField } from '../packages/overlays/straying';
import type { WisplightField } from '../packages/overlays/wisplight';
import type { QuickeningField } from '../packages/overlays/quickening';
import type { VerminfallField } from '../packages/overlays/verminfall';
import type { LongCandleField } from '../packages/overlays/longcandle';
import type { GloamingField } from '../packages/overlays/gloaming';
import type { DemonInvasionField } from '../packages/overlays/demonInvasion';
import type { FractureField } from '../packages/overlays/fractures';
import type { HuntField } from '../packages/overlays/hunt';
import type { ExpeditionManifest } from '../packages/manifest';
import { DEFAULT_FREQUENCY, type FrequencyProfile } from '../packages/frequency';
import { PACKAGE_BY_ID, packageSeed } from '../packages/registry';
import type { PackageGate, RegistryLookups } from '../packages/types';
import { validatePackages } from '../packages/validation';
import { gateOf, resolveGates } from '../packages/weighting';
import { TILESETS } from '../data/tilesets';
import { SIDEZONES } from '../data/sidezones';
import { STRUCTURES } from '../data/structures';
import { hasStructureGen } from '../engine/structureGen';
import type { BoroughField } from '../packages/overlays/borough';
import type { BreachField } from '../packages/overlays/breach';
import type { ExtractionField } from '../packages/overlays/extraction';
import type { VendettaField } from '../packages/overlays/vendetta';
import type { WorldBossField } from '../packages/overlays/worldboss';
import type { HellWarField } from '../packages/overlays/hellWar';
import type { WraithsailField } from '../packages/overlays/wraithsail';
import { biomeOf, validateBiomeField, validateBiomeLayouts, validateBiomeClimate, BIOME_FIELD, BIOMES } from './biomes';
import { boundaryGateIds } from '../data/boundaryGates';
import { POCKET_FORMS } from '../data/pocketForms';
import { setClimateOrigin } from './climate';
import { installCapitalPole } from './civics';
import { setReliefSeed } from './relief';
import { dimensionPackageTempo, dimensionDef, dimensionIds } from './dimensions';
import { validateCourses } from './courses';
import { LevelField, validateLevelField } from './levelField';
import { skyOf, START_ZONE, ZONES } from '../data/zones';
import { biomesWithoutTileset } from '../data/tilesets';
import { hasLayout } from '../engine/levelgen';
import { FACTION_COLORS, FALLBACK_FACTION_COLOR } from './palette';
import { factionShortName } from './traits';
import type { ZoneInfoEntry } from './zoneInfo';
import { BiomeField } from './biomeField';
import { IncursionField } from '../packages/overlays/incursion';
import { dayCycle } from './daynight';
import { FactionField } from './faction';
import { WorldDrives } from './drives';
import { InvasionField } from './invasion';
import { biasTable, composeBias, type OverlayView, type WorldOverlay } from './overlay';
import type { SoundingRequest } from './forechart';
import { Reputation } from './reputation';
import { WarlordField } from './warlord';
import { WeatherField, WEATHER_DEFS } from './weather';

export interface ResolvedSpawn {
  table: PackTableEntry[];
  countMul: number;
  injectFactions: string[];
}

/** The live-registry membership predicates the package-validation sweep runs
 *  against (packages/validation.ts). Exported so the event QA harness asserts
 *  the exact same contract the boot warning checks. */
export function packageLookups(): RegistryLookups {
  return {
    monster: id => !!MONSTERS[id],
    skill: id => !!SKILLS[id],
    support: id => !!SUPPORTS[id],
    faction: id => !!FACTIONS[id],
    tileset: id => !!TILESETS[id],
    layout: id => hasLayout(id),
    structure: id => !!STRUCTURES[id] || hasStructureGen(id),
    boundaryGate: id => boundaryGateIds().includes(id),
    sidezone: id => !!SIDEZONES[id],
    biome: id => !!BIOMES[id],
    dimension: id => dimensionIds().includes(id),
    pocketForm: id => !!POCKET_FORMS[id],
  };
}

export class WorldSim {
  readonly weather: WeatherField;
  readonly faction = new FactionField();
  readonly invasion: InvasionField;
  readonly warlord: WarlordField;
  /** Always-on INFRA overlays (no package gate): the biome heat-map substrate
   *  (incursions warp it), and the generalized Incursion field (Eldritch et al —
   *  idle until a package trigger ignites it via the engine). */
  readonly biomeField: BiomeField;
  /** The DIFFICULTY heat-map: a radial, town-centered, noise-varied field that
   *  decides a generated zone's monster LEVEL at mint (engine binds levelFor to its
   *  sampleLevel). The danger twin of biomeField — always-on infra, no package gate. */
  readonly levelField: LevelField;
  readonly incursionField: IncursionField;
  /** The demon-invasion overlay if its package is in the manifest, else null —
   *  the engine reads it to materialize the storm / epicenter / portal. */
  readonly demonField: DemonInvasionField | null;
  /** The crusade overlay if its package is in the manifest, else null — the
   *  engine reads it to materialize camps / fortresses / the converted city +
   *  Leader, and to drain its mint requests. */
  readonly crusadeField: CrusadeField | null;
  /** The hunt overlay if its package is in the manifest, else null — the engine
   *  reads it to place footprints, materialize the migrating beast (health
   *  preserved), and resolve its flee/kill. */
  readonly huntField: HuntField | null;
  /** The fracture overlay if its package is in the manifest, else null — the
   *  engine reads it to place the volatile fracture, run the fissure/chasm chase,
   *  and divert it zone to zone. */
  readonly fractureField: FractureField | null;
  /** The conclave overlay if its package is in the manifest, else null — the
   *  engine reads it to place ritual sites, and calls incubate()/clearRitual() as
   *  the player subdues or abandons them. It holds the hidden incubation counter. */
  readonly conclaveField: ConclaveField | null;
  /** The amalgamation overlay if its package is in the manifest, else null — the
   *  engine reads it to materialize the Bonewright, the part-pick dwell spots, the
   *  rare-undead minibosses, and the assembled Amalgamation boss. */
  readonly amalgamationField: AmalgamationField | null;
  /** The descent overlay if its package is in the manifest, else null — the engine
   *  reads its gate + config (DescentSurge) to roll the Delver in caves and run the
   *  boundless abyss (darkness/light/streaming/payout). It owns no cross-zone state. */
  readonly descentField: DescentField | null;
  /** The ascent overlay if its package is in the manifest, else null — the engine
   *  reads its gate + config (AscentSurge) to vent sky geysers in eligible zones;
   *  the shelf/collapse/gate machinery is all data-driven ground. No cross-zone state. */
  readonly ascentField: AscentField | null;
  /** The deadwake overlay if its package is in the manifest, else null — the engine
   *  reads its hidden corpse counter (via accrue/noteUndeadSlain), floods the host
   *  off deadwakeOn(), and drains its consumedZones to deplete events it rolls over. */
  readonly deadwakeField: DeadwakeField | null;
  /** The migration overlay if its package is in the manifest, else null — the engine
   *  reads migrationOn() to pour the neutral beast herd through a caught zone, and it
   *  owns the cross-map herd lifecycle (graze → march → cull). */
  readonly migrationField: MigrationField | null;
  /** The swarming overlay if its package is in the manifest, else null — the engine
   *  reads broodOn()/swarmOn()/cachesIn() to field the hive throats, the hostile
   *  flying stream, and the royal-jelly wake; the kill rows call
   *  onBroodNodeBroken()/onAlateDown()/onCacheBroken() back; the update bridges
   *  predate() to the migration bands and drains takeRoostWarps() into the biome
   *  field. It owns the whole hive-cycle (rest → brooding → winged). */
  readonly swarmingField: SwarmingField | null;
  /** The brigands overlay if its package is in the manifest, else null — the engine
   *  reads brigandOn() to pour the nomadic bandit band through a caught zone (with the
   *  proximity rouse). It owns the cross-map column lifecycle (muster → march → disperse). */
  readonly brigandField: BrigandField | null;
  /** The contagion overlay if its package is in the manifest, else null — the engine
   *  reads contagionOn()/patientZeroIn() to field the intensity-scaled plague + Patient
   *  Zero in an infected zone, and calls onPatientZeroSlain() to start the cure. It
   *  owns the cross-zone spread / reveal / recession. */
  readonly contagionField: ContagionField | null;
  /** The deepwinter overlay if its package is in the manifest, else null — the engine
   *  reads frostOn()/kingIn() to dress + field a frost-CONVERTED zone (snow floor,
   *  whiteout via fogEnsure, Rimebound packs, the Winter King at the glacial heart),
   *  reconciles biome warps against convertedZones(), grafts the heart's frozen_lake
   *  off consumeHeartMark(), and calls onWinterKingSlain() back. It owns the march. */
  readonly deepwinterField: DeepwinterField | null;
  /** The haunting overlay if its package is in the manifest, else null — the engine
   *  reads hauntOn() to field the grief-anchor + the apparition stream in a held zone;
   *  the kill-handler rows call onAnchorBroken()/resolveHaunt() back. It owns the
   *  settle/lapse lifecycle. */
  readonly hauntField: HauntField | null;
  /** The Long Night overlay if its package is in the manifest, else null — the
   *  engine reads groundOn() to field a feeding ground (the parked gloom coach,
   *  the night-poured Court party, a seated Countess), convertedZones() to ride
   *  the biome warp, and markBloodmoon() to feed the sky in; the kill rows call
   *  onCoachBurned()/onCoachReknits()/onCourtBroken() back. It owns the durable
   *  establish/feed/convert ledger. */
  readonly longNightField: LongNightField | null;
  /** The verminfall overlay if its package is in the manifest, else null — the engine
   *  reads infestOn() to field the warren (standing nests + vermin packs + the armed
   *  King) in a claimed zone and townPressure() to swell the town's authored vermin
   *  fauna; the kill rows call onNestBroken()/onKingSlain() back. It owns the claim
   *  + the nest ledger. */
  readonly verminfallField: VerminfallField | null;
  /** The straying overlay if its package is in the manifest, else null — the
   *  engine reads strayingOn() to stage the fold's tug-of-war (loose strays,
   *  the dormant bell-court, the herding sweep) in a called zone and reports
   *  back through the note*() calls; the field owns the settle/phase/absent
   *  lifecycle and the head ledger. */
  readonly strayField: StrayField | null;
  /** The wisplight overlay if its package is in the manifest, else null — the
   *  engine reads wisplightOn() to stage the marsh's gathering (standing
   *  neutral lights, the kindled wander + flourish aura, the strongest-host
   *  ride) and reports each light's fate back through the note*() calls; the
   *  field owns the settle/slot/absent lifecycle. */
  readonly wisplightField: WisplightField | null;
  /** The quickening overlay if its package is in the manifest, else null — the
   *  engine's reconcile sweep reads peek()/quickeningOn() to stamp + revert
   *  ZoneDef.level (and drop zone memory at the window's edges), folds
   *  eventMulAt()/bountyMulAt() into event density + the kill-path bounty,
   *  and reports the materialize/echo beats back through the note*() calls;
   *  the field owns the seat/clock/window lifecycle. */
  readonly quickeningField: QuickeningField | null;
  /** The long-candle overlay if its package is in the manifest, else null — the
   *  engine reads candleOn() to field the Wax Court's shrines/packs and the
   *  Umbral Parliament's shadows on a night-claimed ground (both when both
   *  courts claim it — the war). It owns the night claims; dawn clears them. */
  readonly longCandleField: LongCandleField | null;
  /** The Gloaming overlay if its package is in the manifest, else null — the
   *  engine reads gloomOn() for a zone's gloom target and surge() for every
   *  in-zone lever (meter drain, lightwell spawning, gloom grants, darkness);
   *  the field owns the world-map front's clock + coverage. */
  readonly gloamingField: GloamingField | null;
  /** The holdfast overlay if its package is in the manifest, else null — the engine
   *  reads infoFor()/isLocked() to raise the locked bonus exit + its guardian and to
   *  resolve the toll. It owns the durable per-zone lock state. */
  readonly holdfastField: HoldfastField | null;
  /** The Unsealing overlay if its package is in the manifest, else null — the
   *  engine reads roleFor() to resolve what a Sepulcher Sands pocket hosts
   *  (the Regent's sealed door / a canopic seal-bearer), flared()/allFlared()
   *  to sync the talisman braziers + the door, and foundTomb() to latch the
   *  overworld marker; the kill rows call flare()/onRegentSlain() back. It
   *  owns the durable four-talisman ledger. */
  readonly unsealingField: UnsealingField | null;
  /** The mycelia overlay if its package is in the manifest, else null — the engine reads
   *  sporeOn()/heartbloomIn()/suppressionAt()/transformedZones() to field the fungal
   *  hordes + the Heartbloom, suppress events, and warp the biome; it feeds the bloom
   *  per-zone event activity and calls cull()/onHeartbloomSlain() back. */
  readonly myceliaField: MyceliaField | null;
  /** The breach overlay if its package is in the manifest, else null — ambient
   *  minimap flavor whose devIgnite the Events tab drives (the in-zone Breach
   *  encounter itself rides the encounter pipeline, not this field). */
  readonly breachField: BreachField | null;
  /** The extraction overlay if its package is in the manifest, else null — the
   *  SPENT LEDGER: placeEncounters asks nodeAvailable() before seeding a seam,
   *  the engine calls markSpent() when one ends (the in-zone defense rides the
   *  encounter pipeline, not this field). */
  readonly extractionField: ExtractionField | null;
  /** The borough overlay if its package is in the manifest, else null — the
   *  SPENT LEDGER + LASTLIGHT'S POPULATION: placeEncounters asks
   *  siteAvailable() before seeding a settlement, the engine calls
   *  markSpent()/addRefugees() when one resolves, and any economy consumer
   *  (Brandt's shelf, future scouting parties) reads `population` through a
   *  data curve (data/boroughs.ts). */
  readonly boroughField: BoroughField | null;
  /** The vendetta overlay if its package is in the manifest, else null — the
   *  engine reads wantsAmbush() to spring hunter squads and calls settleWrit()
   *  from the warrant kill row; the sim mirrors each faction's grudge meter in
   *  (setGrudges) and drains settled/expired writs back onto the meters. */
  readonly vendettaField: VendettaField | null;
  /** The SURFACE world-boss overlay if its package is in the manifest, else
   *  null — the engine reads wallsFor/passingIn/fightAt/pendingMints to
   *  materialize the sovereigns and the serpent's road blockade; non-surface
   *  instances (Ashvein below) resolve via worldBossFieldFor/-All. */
  readonly worldBossField: WorldBossField | null;
  /** The wraithsail overlay if its package is in the manifest, else null —
   *  the engine reads shipInfo()/boardable() to arm the at-sea boarding dwell
   *  (and the ghost-hull sighting), dockedOn() to walk the Drowned Court
   *  ashore at a layover, and calls onBoarded()/onBoardingLeft()/
   *  onRegentSlain()/onPartyBroken() back. The sim bridges the weather
   *  field's fronts in each tick (setFronts) so she can RIDE the storm —
   *  overlays never see the weather themselves. */
  readonly wraithsailField: WraithsailField | null;
  /** THE WAR BELOW — hell's territorial struggle. The one instance lives in
   *  the underworld dimension (never surface), so it caches directly. */
  readonly hellWarField: HellWarField | null;
  /** Per-faction favor earned from events and warlord kills. Persists per run. */
  readonly reputation = new Reputation();
  /** FACTION/WORLD WANTS (world/drives.ts): named slow meters — dread,
   *  warlust — fed by events (the faction_drive_feed kill row), drifted
   *  here, read by any monster rule (AICondition.drive scope 'faction')
   *  and by event packages: meter-driven expansion instead of timers. */
  readonly drives = new WorldDrives();
  /** The run-LOCKED content-package configuration this world runs under. */
  readonly manifest: ExpeditionManifest;
  private overlays: WorldOverlay[];
  /** Package ids whose pressure feeds the shared weather field (Storm Fronts). */
  private weatherPkgIds: string[] = [];
  /** Existing faction id → the package id governing its invasions. */
  private factionToPkg: Record<string, string> = {};
  /** Last resolved gates (memoized by character level). */
  private gates: Map<string, PackageGate>;
  private gatesLevel = -1;
  /** DEV-only LIVE frequency override — bypasses the run-locked manifest value so
   *  QA can crank event frequency mid-run (the dev Event tab). null = use manifest. */
  private devFreqOverride: FrequencyProfile | null = null;

  constructor(manifest: ExpeditionManifest) {
    this.manifest = manifest;
    const seed = manifest.seed >>> 0;
    // Deterministic per-dimension seed salt (FNV over the id) — a non-surface
    // overlay instance rolls an independent event stream from its surface twin.
    const dimSalt = (id: string): number => {
      let h = 0x811c9dc5;
      for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193) >>> 0;
      return h >>> 0;
    };
    this.weather = new WeatherField(new Rng((seed ^ 0x5eed) >>> 0));
    this.invasion = new InvasionField(this.faction, new Rng((seed ^ 0x1a5e) >>> 0));
    this.warlord = new WarlordField(this.faction);
    this.biomeField = new BiomeField(seed);
    // Difficulty heat-map: distinct salt so danger noise is independent of biome
    // regions; centered on the town's CANONICAL map coord (static, never the moved
    // runtime copy) so difficulty is anchored to home no matter how town expands.
    this.levelField = new LevelField((seed ^ 0x1e7e1) >>> 0, ZONES[START_ZONE].map);
    // Climate radial layers (wildness) anchor on the same static home coord —
    // static data, so host and clients agree without replication.
    setClimateOrigin(ZONES[START_ZONE].map);
    // THE CAPITAL POLE (world/civics.ts): pure seed math off the shared run
    // seed — host/clients/reloads agree like the origin above. Installed
    // before anything samples the field (the BiomeField ctor above only
    // resets memos; first sampling happens after construction), and AFTER
    // the origin (the pole is home-relative).
    installCapitalPole(seed);
    // THE RELIEF SEED (world/relief.ts): the river tracers descend the SAME
    // elevation field every other sampler reads — installed here because
    // course-instance seeds are hash descendants that cannot recover it.
    setReliefSeed(seed);
    this.incursionField = new IncursionField(new Rng((seed ^ 0x1ec0) >>> 0));
    // Build the package→world routing from the manifest, and instantiate any
    // NET-NEW package overlays (migrated features route pressure into the shared
    // fields above; only genuinely new mechanics — Breach — add an overlay).
    const extra: WorldOverlay[] = [];
    for (const e of manifest.packages) {
      const pkg = PACKAGE_BY_ID[e.id];
      if (!pkg?.world) continue;
      if (pkg.world.weather) this.weatherPkgIds.push(pkg.id);
      for (const f of pkg.world.invasionFactions ?? []) this.factionToPkg[f] = pkg.id;
      if (pkg.world.overlay) {
        // ONE INSTANCE PER DECLARED DIMENSION (default surface-only) — parallel
        // world-states run the same overlay code. The surface instance keeps
        // the exact legacy seed + gate (byte-identical runs); a non-surface
        // instance salts its seed by dimension and reads a gate whose
        // ignitionMul arrives PRE-SCALED by the dimension's tempo
        // (DimensionDef.events) — every overlay's ignition roll already reads
        // gate().ignitionMul, so the per-dimension lever needs zero overlay
        // edits. Views/routing/spawn-bias scope off the instance's dimension.
        for (const dim of pkg.world.dimensions ?? ['surface']) {
          const inst = pkg.world.overlay({
            seed: dim === 'surface' ? packageSeed(seed, pkg.id) : (packageSeed(seed, pkg.id) ^ dimSalt(dim)) >>> 0,
            gate: () => {
              const g = gateOf(this.gates, pkg.id);
              const tempo = dimensionPackageTempo(dim, pkg.id);
              return tempo === 1 ? g : { ...g, ignitionMul: g.ignitionMul * tempo };
            },
            biomeSeed: seed,
            dimension: dim,
          });
          // WorldOverlay.dimension is a readonly class declaration; the sim
          // stamps the runtime instance's dimension HERE (the one sanctioned
          // write) so every overlay class stays dimension-blind.
          if (dim !== 'surface') (inst as { dimension?: string }).dimension = dim;
          extra.push(inst);
        }
      }
    }
    // Order matters: faction settles ownership, the warlord reads it, then the
    // invasion gates its launches on whether that faction has a living warlord.
    // BiomeField paints the biome heat-map UNDER everything → first in the list.
    // (Render-only: it doesn't sim or bias spawns, so order is otherwise moot.)
    const bad = validateBiomeField();
    if (bad.length) console.warn('[biomes] BIOME_FIELD references unknown biome(s):', bad);
    const badL = validateBiomeLayouts(hasLayout);
    if (badL.length) console.warn('[biomes] allowedLayouts reference unregistered layout(s):', badL);
    const badC = validateBiomeClimate();
    if (badC.length) console.warn('[climate] biome climate specs reference unknown axes/bands:', badC);
    // Heat-map authority needs every field biome to resolve to a frontier tileset
    // (else a mint in that region falls back to the inherited line — the old bug).
    const badT = biomesWithoutTileset(BIOME_FIELD.map(s => s.biome));
    if (badT.length) console.warn('[biomes] BIOME_FIELD biomes with NO frontier tileset (fall back to inherited):', badT);
    // COURSES are field authorities too: their biomes must exist AND resolve to
    // a frontier tileset (a course painting an unminttable biome would dress
    // hell's artery in warned deepwood fallback).
    const dims = dimensionIds().map(dimensionDef);
    const badCo = validateCourses(dims);
    if (badCo.length) console.warn('[courses] course(s) reference unknown biome(s):', badCo);
    // NON-painting courses (the rivers) are exempt: their biome is identity
    // only — no zone ever wears it, so it needs no tileset behind it.
    const badCoT = biomesWithoutTileset(dims.flatMap(d => (d.courses ?? []).filter(c => c.paints !== false).map(c => c.biome)));
    if (badCoT.length) console.warn('[courses] course biomes with NO frontier tileset (fall back to inherited):', badCoT);
    // ENCLAVE biomes must name a REGISTERED boundary gate (a typo'd id would
    // silently mint plain portals — the wall would just... not be there).
    const gateIds = new Set(boundaryGateIds());
    const badEn = Object.entries(BIOMES)
      .filter(([, b]) => b.enclave && !gateIds.has(b.enclave.gate))
      .map(([id, b]) => `${id}: ${b.enclave!.gate}`);
    if (badEn.length) console.warn('[boundary] enclave biome(s) name unregistered gate(s):', badEn);
    const badLv = validateLevelField();
    if (badLv.length) console.warn('[levelfield] LEVEL_FIELD_CFG invalid:', badLv);
    // ONE shared package sweep (packages/validation.ts): common shapes
    // generically + each def's own colocated validate() — the per-package
    // bespoke blocks that used to live here are gone, and a NEW package gets
    // full id validation for free. The event QA harness runs the same sweep
    // and FAILS the build where this only warns.
    const badPkg = validatePackages(packageLookups());
    if (badPkg.length) console.warn('[packages] def validation problems:', badPkg);
    this.overlays = [this.biomeField, this.weather, this.faction, this.warlord, this.invasion, this.incursionField, ...extra];
    // Cache the demon-invasion overlay (if the package is in this run's manifest)
    // so the engine can reach it without scanning the overlay list every tick.
    // Cached fields hold the SURFACE instance (legacy consumers); per-dimension
    // instances resolve through overlayFor(id, dimension).
    this.demonField = (extra.find(o => o.id === 'demon_invasion' && (o.dimension ?? 'surface') === 'surface') as DemonInvasionField | undefined) ?? null;
    // Every cached legacy field takes the same surface guard the demon field
    // pioneered: the moment any package runs a non-surface instance, first-
    // in-array would otherwise bind a "surface" cache to another dimension.
    const surface = <T extends { id: string; dimension?: string }>(id: string): T | undefined =>
      extra.find(o => o.id === id && (o.dimension ?? 'surface') === 'surface') as T | undefined;
    this.crusadeField = surface<CrusadeField>('crusade') ?? null;
    this.huntField = surface<HuntField>('hunt') ?? null;
    this.fractureField = surface<FractureField>('fractures') ?? null;
    this.conclaveField = surface<ConclaveField>('conclave') ?? null;
    this.amalgamationField = surface<AmalgamationField>('amalgamation') ?? null;
    this.descentField = surface<DescentField>('descent') ?? null;
    this.ascentField = surface<AscentField>('ascent') ?? null;
    this.deadwakeField = surface<DeadwakeField>('deadwake') ?? null;
    this.migrationField = surface<MigrationField>('migration') ?? null;
    this.swarmingField = surface<SwarmingField>('swarming') ?? null;
    this.brigandField = surface<BrigandField>('brigands') ?? null;
    this.hauntField = surface<HauntField>('haunting') ?? null;
    this.longNightField = surface<LongNightField>('long_night') ?? null;
    this.contagionField = surface<ContagionField>('contagion') ?? null;
    this.deepwinterField = surface<DeepwinterField>('deepwinter') ?? null;
    this.verminfallField = surface<VerminfallField>('verminfall') ?? null;
    this.strayField = surface<StrayField>('straying') ?? null;
    this.wisplightField = surface<WisplightField>('wisplight') ?? null;
    this.quickeningField = surface<QuickeningField>('quickening') ?? null;
    this.longCandleField = surface<LongCandleField>('longcandle') ?? null;
    this.gloamingField = surface<GloamingField>('gloaming') ?? null;
    this.holdfastField = surface<HoldfastField>('holdfast') ?? null;
    this.unsealingField = surface<UnsealingField>('unsealing') ?? null;
    this.myceliaField = surface<MyceliaField>('mycelia') ?? null;
    this.breachField = surface<BreachField>('breach') ?? null;
    this.extractionField = surface<ExtractionField>('extraction') ?? null;
    this.boroughField = surface<BoroughField>('borough') ?? null;
    this.vendettaField = surface<VendettaField>('vendetta') ?? null;
    this.worldBossField = surface<WorldBossField>('worldboss') ?? null;
    this.wraithsailField = surface<WraithsailField>('wraithsail') ?? null;
    this.hellWarField = (extra.find(o => o.id === 'underworld_war') as HellWarField | undefined) ?? null;
    this.invasion.gate = (f) => this.warlord.canInvade(f);
    // Per-faction invasion launch scale = the governing package's pressure (0 if
    // no package governs it, or its package is off / below its start level).
    this.invasion.factionScale = (f) => {
      const pid = this.factionToPkg[f];
      return pid ? gateOf(this.gates, pid).ignitionMul : 0;
    };
    // THE WAR BELOW ↔ DEMONIC INCURSIONS: every incursion is a LORD'S strike.
    // Each demon instance (surface AND underworld) asks the war who sent it —
    // and in what shape — at ignition, and reports the outcome home: a
    // repelled strike bleeds the sender's fronts below, a festered one feeds
    // them. Wired HERE (the composition root) so neither overlay imports the
    // other; with the war package absent, the demon field keeps its legacy
    // self-rolled flavor byte-for-byte.
    if (this.hellWarField) {
      const hw = this.hellWarField;
      for (const df of this.demonFieldsAll()) {
        df.attribution = {
          pick: typeIds => hw.attributeStrike(typeIds),
          resolved: (lordId, outcome) => hw.strikeResolved(lordId, outcome),
        };
      }
    }
    this.gates = resolveGates(manifest, 1);
  }

  /** Resolve (memoized) the package gates for a character level. Called by the
   *  World to populate OverlayView.gates each tick. */
  gatesFor(charLevel: number): ReadonlyMap<string, PackageGate> {
    if (charLevel !== this.gatesLevel) {
      const m = this.devFreqOverride ? { ...this.manifest, frequency: this.devFreqOverride } : this.manifest;
      this.gates = resolveGates(m, charLevel);
      this.gatesLevel = charLevel;
    }
    return this.gates;
  }

  /** The frequency profile actually in effect (dev override, else run-locked). */
  effectiveFrequency(): FrequencyProfile {
    return this.devFreqOverride ?? this.manifest.frequency ?? DEFAULT_FREQUENCY;
  }

  /** DEV: live-override the global frequency crank (null = revert to the manifest).
   *  Invalidates the gate memo so it takes effect immediately. (QA only.) */
  setDevFrequency(p: FrequencyProfile | null): void {
    this.devFreqOverride = p;
    this.gatesLevel = -1;
  }

  /** Is a content package live at this character level (enabled + past its
   *  start level)? Used to gate package-specific spawns (e.g. Crowned). */
  packageActive(id: string, charLevel: number): boolean {
    return gateOf(this.gatesFor(charLevel), id).active;
  }

  /** Is the invasion PACKAGE governing this FACTION live? Resolves the right
   *  package per faction ('demon' → demon_invasion, mortal/beast → warbands), so
   *  a materialized warband's Crowned apex gates on its own package — not a
   *  hardcoded one. Un-governed factions (defensive natives) → false. */
  factionInvasionActive(faction: string, charLevel: number): boolean {
    const pid = this.factionToPkg[faction];
    return pid ? gateOf(this.gatesFor(charLevel), pid).active : false;
  }

  /** The view an overlay actually receives: its declared dimension's graph.
   *  The default view IS the surface view (World builds it that way); a
   *  non-surface overlay gets nodes/byId re-scoped from allNodes — one
   *  `dimension` declaration ties an event to its own plane. Memoized per
   *  (view, dimension) since views are rebuilt each tick. */
  private scopedView(view: OverlayView, dimension: string | undefined): OverlayView {
    const dim = dimension ?? 'surface';
    if (dim === 'surface') return view;
    let byDim = this.scopeMemo.get(view);
    if (!byDim) { byDim = new Map(); this.scopeMemo.set(view, byDim); }
    let scoped = byDim.get(dim);
    if (!scoped) {
      const nodes = view.allNodes.filter(z => (z.dimension ?? 'surface') === dim);
      const byId: Record<string, ZoneDef> = {};
      for (const z of nodes) byId[z.id] = z;
      // Only the surface has a sea — another dimension's movers roam free.
      scoped = { ...view, nodes, byId, terrain: () => 'land' as const };
      byDim.set(dim, scoped);
    }
    return scoped;
  }
  private scopeMemo = new WeakMap<OverlayView, Map<string, OverlayView>>();

  update(dt: number, view: OverlayView): void {
    // Route Storm Fronts pressure into the weather field's spawn rate before it
    // ticks; the per-faction invasion scale reads `this.gates` live (kept current
    // by gatesFor, which the World calls when building the view).
    let wp = 0;
    for (const id of this.weatherPkgIds) wp += gateOf(view.gates, id).ignitionMul;
    this.weather.spawnScale = wp;
    // The global concurrency crank lifts the migrated-feature caps too (storm
    // fronts, warband hosts, incursion landings), so a frequency boost actually
    // shows MORE at once — the always-on infra fields have no package gate, so
    // the sim hands each the lever directly.
    const conc = this.effectiveFrequency().concurrency;
    this.weather.concurrencyScale = conc;
    this.invasion.concurrencyScale = conc;
    this.incursionField.concurrencyScale = conc;
    // Faction/world wants drift on their clocks (dread cools between culls).
    this.drives.update(dt);
    // VENDETTA's grudge bridge: mirror each faction's meter INTO the pure
    // overlay before it ticks (it can't reach WorldDrives itself)…
    const vf = this.vendettaField;
    if (vf) {
      const driveId = vf.surge().driveId;
      const suffix = `:${driveId}`;
      vf.setGrudges(this.drives.entries()
        .filter(([key]) => key.endsWith(suffix) && !key.startsWith('*'))
        .map(([key, v]) => [key.slice(0, key.length - suffix.length), v] as [string, number]));
    }
    // WRAITHSAIL's weather bridge: hand the ghost ship this tick's fronts
    // (position/velocity/radius in node space) BEFORE the overlays tick —
    // she aligns to whichever storm covers her and rides it. Overlays never
    // see the weather field itself (the markBloodmoon rule).
    this.wraithsailField?.setFronts(this.weather.fronts.map(f => ({
      x: f.pos.x, y: f.pos.y, vx: f.vel.x, vy: f.vel.y,
      radius: f.radius, intensity: f.intensity,
    })));
    for (const o of this.overlays) o.update(dt, this.scopedView(view, o.dimension));
    // …and drain settled/expired writs back ONTO the meters after: a settled
    // (or abandoned) writ breaks that people's anger to the surge's floor.
    if (vf) {
      const cfg = vf.surge();
      for (const list of [vf.settledPending, vf.expirePending]) {
        for (const f of list.splice(0)) {
          const cur = this.drives.get(cfg.driveId, f);
          if (cur > cfg.settleGrudge) this.drives.bump(cfg.driveId, cfg.settleGrudge - cur, f);
        }
      }
    }
  }

  onNodeCharted(zone: ZoneDef, view: OverlayView): void {
    // A node only seeds the overlays of ITS dimension (surface mints reach the
    // surface systems; a hell mint seeds hell's own overlay instances).
    for (const o of this.overlays) {
      if ((o.dimension ?? 'surface') !== (zone.dimension ?? 'surface')) continue;
      o.onNodeCharted(zone, this.scopedView(view, o.dimension));
    }
  }

  /** A package overlay's instance for a DIMENSION (null when the package is
   *  off this run or doesn't run there). Zone-side engine consumers resolve
   *  by the zone's dimension — parallel world-states, one lookup. */
  overlayFor<T extends WorldOverlay>(id: string, dimension?: string): T | null {
    const dim = dimension ?? 'surface';
    return (this.overlays.find(o => o.id === id && (o.dimension ?? 'surface') === dim) as T | undefined) ?? null;
  }

  // --- WORLDSTATE PERSISTENCE (meta/worldstate.ts rides the character save) ---

  /** The persistence key an overlay instance saves under: its id, salted by
   *  dimension for non-surface twins ('faction', 'demon_invasion@hell'). */
  private overlayKey(o: WorldOverlay): string {
    const dim = o.dimension ?? 'surface';
    return dim === 'surface' ? o.id : `${o.id}@${dim}`;
  }

  /** Collect every opted-in field's durable state (WorldOverlay.snapshot), plus
   *  the two non-overlay ledgers under reserved ':'-prefixed keys (no overlay
   *  id may start with ':'). A snapshot() that throws just skips that field —
   *  saving never takes the run down. */
  snapshotOverlays(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const o of this.overlays) {
      if (!o.snapshot) continue;
      try {
        const s = o.snapshot();
        if (s !== undefined) out[this.overlayKey(o)] = s;
      } catch (e) { console.warn(`[worldstate] overlay '${this.overlayKey(o)}' snapshot failed — skipped`, e); }
    }
    try { out[':reputation'] = this.reputation.snapshot(); } catch { /* fresh on resume */ }
    try { out[':drives'] = this.drives.snapshot(); } catch { /* fresh on resume */ }
    return out;
  }

  /** POST-RESUME SCRUB: hand every field a membership test for the healed
   *  graph (WorldOverlay.pruneZones) so zone-keyed state whose zone the
   *  sanitizer culled is dropped — a ghost row can never hold a concurrency
   *  slot, feed activityAt, or pin a marker. A prune that throws is skipped
   *  (that field just keeps its rows; they stay inert by the view contract). */
  pruneOverlayZones(has: (zoneId: string) => boolean): void {
    for (const o of this.overlays) {
      if (!o.pruneZones) continue;
      try { o.pruneZones(has); }
      catch (e) { console.warn(`[worldstate] overlay '${this.overlayKey(o)}' prune failed — rows kept inert`, e); }
    }
  }

  /** Hand each saved snapshot back to its field (matched by key — an overlay
   *  missing this run, or one that no longer implements restore, is skipped).
   *  Returns the overlay KEYS actually restored, so the engine's graph-reseed
   *  can leave them alone; a restore() that throws counts as NOT restored. */
  restoreOverlays(data: Record<string, unknown> | undefined): Set<string> {
    const restored = new Set<string>();
    if (!data || typeof data !== 'object') return restored;
    for (const o of this.overlays) {
      const key = this.overlayKey(o);
      if (!o.restore || !(key in data)) continue;
      try { o.restore(data[key]); restored.add(key); }
      catch (e) { console.warn(`[worldstate] overlay '${key}' restore failed — starts fresh`, e); }
    }
    if (':reputation' in data) { try { this.reputation.restore(data[':reputation']); } catch { /* fresh */ } }
    if (':drives' in data) { try { this.drives.restore(data[':drives']); } catch { /* fresh */ } }
    return restored;
  }

  /** Re-seed a RESTORED zone graph into the fields that did NOT restore their
   *  own snapshot: every un-restored overlay sees each on-graph node of its
   *  dimension once, exactly as the mint-time onNodeCharted would have shown
   *  it (floating zones excepted — they chart when a road forms, same as at
   *  mint). Restored overlays are skipped: their snapshot IS their seeding. */
  reseedGraph(zones: ZoneDef[], view: OverlayView, restored: ReadonlySet<string>): void {
    for (const o of this.overlays) {
      if (restored.has(this.overlayKey(o))) continue;
      for (const z of zones) {
        if (z.floating) continue;
        if ((o.dimension ?? 'surface') !== (z.dimension ?? 'surface')) continue;
        o.onNodeCharted(z, this.scopedView(view, o.dimension));
      }
    }
  }

  /** The demon-invasion instance governing a dimension (surface = the cached
   *  legacy field). See overlayFor. */
  demonFieldFor(dimension?: string): DemonInvasionField | null {
    if ((dimension ?? 'surface') === 'surface') return this.demonField;
    return this.overlayFor<DemonInvasionField>('demon_invasion', dimension);
  }

  /** Every live demon-invasion instance (all dimensions) — the engine's mint
   *  drain walks them all so each world-state's rifts tear in its own graph. */
  demonFieldsAll(): DemonInvasionField[] {
    return this.overlays.filter(o => o.id === 'demon_invasion') as DemonInvasionField[];
  }

  /** The world-boss instance governing a dimension (surface = the cached field). */
  worldBossFieldFor(dimension?: string): WorldBossField | null {
    if ((dimension ?? 'surface') === 'surface') return this.worldBossField;
    return this.overlayFor<WorldBossField>('worldboss', dimension);
  }

  /** Every live world-boss instance (all dimensions) — the engine's mint drain,
   *  the edge-block gate, and the kill row walk them all so each world-state's
   *  sovereigns stand up in their own graph. */
  worldBossFieldsAll(): WorldBossField[] {
    return this.overlays.filter(o => o.id === 'worldboss') as WorldBossField[];
  }

  /** Every live quickening instance (all dimensions) — the engine's reconcile
   *  sweep walks them all so each world-state's surges stamp their own graph
   *  (surface-only today; one `dimensions` line on the package widens it). */
  quickeningFieldsAll(): QuickeningField[] {
    return this.overlays.filter(o => o.id === 'quickening') as QuickeningField[];
  }

  /** A zone's EVENT ACTIVITY from the living world: the sum of every overlay's
   *  own severity-weighted term (WorldOverlay.activityAt). A net-new overlay
   *  feeds the Mycelia bloom by implementing the hook — no table to edit. */
  activityAt(zid: string): number {
    let a = 0;
    for (const o of this.overlays) a += o.activityAt?.(zid) ?? 0;
    return a;
  }

  /** Drain every overlay's FAR PRE-CHART requests (WorldOverlay.requestSoundings
   *  — the forechart fabric's mint-request seam). The engine's forechart sweep
   *  calls this once per sweep and grows veiled ground at each coordinate; a
   *  hook that throws is skipped so one bad requester never stalls the halo. */
  drainSoundings(): SoundingRequest[] {
    const out: SoundingRequest[] = [];
    for (const o of this.overlays) {
      if (!o.requestSoundings) continue;
      try {
        // Stamp each request with the REQUESTING INSTANCE's dimension — an
        // overlay never names a plane it doesn't run in.
        for (const r of o.requestSoundings()) out.push({ ...r, dimension: o.dimension ?? 'surface' });
      }
      catch (e) { console.warn(`[forechart] overlay '${this.overlayKey(o)}' requestSoundings failed — skipped`, e); }
    }
    return out;
  }

  /** Compose day × weather × faction into the zone's effective spawning.
   *  Only overlays of the ZONE'S dimension contribute — a surface storm
   *  cannot bias a hell zone's packs. */
  resolve(zone: ZoneDef, base: PackTableEntry[], view: OverlayView): ResolvedSpawn {
    const zdim = zone.dimension ?? 'surface';
    const parts = [dayCycle(view.time).bias, ...this.overlays
      .filter(o => (o.dimension ?? 'surface') === zdim)
      .map(o => o.affectSpawns(zone, this.scopedView(view, o.dimension)))];
    const bias = composeBias(parts);
    return { table: biasTable(base, bias), countMul: bias.countMul, injectFactions: bias.injectFactions };
  }

  /** Rank the would-be contestants of a node, dominant first. */
  rankContest(zoneId: string, factions: string[]): string[] {
    const ranked = this.faction.contestants(zoneId);
    const order = ranked.length >= 2 ? ranked.filter(f => factions.includes(f)) : [];
    return order.length >= 2 ? order : factions;
  }

  /** Minimap layers in draw order, TAGGED with their overlay's id + label so
   *  the map can offer layer toggles (weather off, territory off…) and a
   *  drifting front can never masquerade as "the biome map changed". Only the
   *  overlays of the VIEWED dimension paint — the surface tab shows surface
   *  weather/territory/biomes; a hell tab shows hell's own instances (its
   *  demon rings), never the surface fronts drifting over the underworld. */
  mapLayers(nodes: ZoneDef[], dimension = 'surface'): { id: string; label: string; under: string; over: string; extent: ReadonlyArray<{ x: number; y: number }> }[] {
    return this.overlays
      .filter(o => (o.dimension ?? 'surface') === dimension)
      .map(o => {
        const l = o.renderMap(nodes);
        // extent: coords the fitted map view must also enclose (a territory
        // painting past the charted rim) — rides the layer so the toggle
        // chip silences the stretch together with the paint.
        return { id: o.id, label: o.mapLabel ?? o.id, under: l.under, over: l.over, extent: o.mapExtent?.() ?? [] };
      });
  }

  /** One-line HUD status: "Night · Storm · Goblin Warband invading" — the same
   *  condition rows the map's zone-info box shows, stringified. */
  hudLine(zone: ZoneDef, time: number): string {
    return this.conditionRows(zone, time, false).map(r => r.label).join('  ·  ');
  }

  /** The ambient state of a zone as STRUCTURED rows (biome / time / weather /
   *  territory) for the World Map's zone-info box. */
  zoneConditions(zone: ZoneDef, time: number): ZoneInfoEntry[] {
    return this.conditionRows(zone, time, true);
  }

  /** ONE composition ladder feeds both surfaces (HUD line + zone-info box);
   *  the HUD omits the biome row. */
  private conditionRows(zone: ZoneDef, time: number, includeBiome: boolean): ZoneInfoEntry[] {
    const out: ZoneInfoEntry[] = [];
    if (includeBiome) {
      const bi = biomeOf(zone);
      if (bi) out.push({ kind: 'condition', icon: '⬡', color: bi.mapColor, label: bi.label, detail: `monster lv ${zone.level}` });
    }
    const day = dayCycle(time);
    out.push({ kind: 'condition', icon: day.phase === 'night' || day.phase === 'dusk' ? '☾' : '☀', label: day.label });
    // Weather/territory/invasions are SURFACE fields — hell reports neither a
    // drizzle nor a gnoll warlord (the day phase is the world's one shared
    // clock, so it stays). The hell field that HAS arrived reports here: the
    // War Below names the ground's holder and any front pressing it.
    if ((zone.dimension ?? 'surface') !== 'surface') {
      const hw = this.hellWarField;
      const st = hw && zone.dimension === hw.dimension ? hw.zoneWar(zone.id) : null;
      if (st) {
        out.push({
          kind: 'condition', icon: st.throne ? st.lord.sigil : '⚑', color: st.lord.color,
          label: st.throne ? `${st.lord.name} — the sanctum` : `Held by ${st.lord.short}`,
          detail: st.heartland ? `${st.lord.epithet} · heartland` : st.lord.epithet,
        });
        if (st.contested) {
          out.push({
            kind: 'condition', icon: '⚔', color: st.contested.by.color,
            label: `${st.contested.by.short} presses the front`,
            detail: `${Math.round(st.contested.level * 100)}% pressure`,
          });
        }
      }
      return out;
    }
    // ...and a SHELTERED surface zone (skyOf: a roofed tileset) reports no
    // weather either — its chip must match what the ground actually feels.
    const w = skyOf(zone) === 'sheltered' ? null : this.weather.sample(zone);
    if (w) out.push({ kind: 'condition', icon: '☁', label: WEATHER_DEFS[w.kind].label });
    const host = this.invasion.activeHostOn(zone.id);
    const o = this.faction.owner(zone.id);
    if (host && this.faction.conquerorOf(zone.id) !== host.faction) {
      out.push({ kind: 'condition', icon: '⚔', color: factionColor(host.faction), label: `${factionShortName(host.faction)} invading` });
    } else if (o.contested) {
      const rivals = this.faction.contestants(zone.id);
      if (rivals.length >= 2) out.push({ kind: 'condition', icon: '⚔', label: `${factionShortName(rivals[0])} ⚔ ${factionShortName(rivals[1])}` });
    } else if (o.owned && o.faction) {
      const lord = this.warlord.lordAt(zone.id);
      out.push({ kind: 'condition', icon: '⚑', color: factionColor(o.faction), label: `${factionShortName(o.faction)} ${lord ? 'warlord' : 'holds'}` });
    }
    return out;
  }

  /** What's happening to a zone right now, for the engine's entry bulletins. */
  zoneStatus(zone: ZoneDef): { invadedBy: string | null; conqueredBy: string | null } {
    const host = this.invasion.activeHostOn(zone.id);
    const conqueredBy = this.faction.conquerorOf(zone.id);
    return {
      invadedBy: host && host.faction !== conqueredBy ? host.faction : null,
      conqueredBy,
    };
  }
}

function factionColor(f: string): string {
  return FACTION_COLORS[f] ?? FALLBACK_FACTION_COLOR;
}
