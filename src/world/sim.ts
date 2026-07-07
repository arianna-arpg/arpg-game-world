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
import { validateAmalgamParts } from '../packages/overlays/amalgamation';
import { AMALGAM_PARTS } from '../packages/defs/amalgamation';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import type { ConclaveField } from '../packages/overlays/conclave';
import type { ContagionField } from '../packages/overlays/contagion';
import type { DescentField } from '../packages/overlays/descent';
import type { HoldfastField } from '../packages/overlays/holdfast';
import type { MyceliaField } from '../packages/overlays/mycelia';
import type { CrusadeField } from '../packages/overlays/crusade';
import type { DeadwakeField } from '../packages/overlays/deadwake';
import type { MigrationField } from '../packages/overlays/migration';
import type { BrigandField } from '../packages/overlays/brigands';
import type { DemonInvasionField } from '../packages/overlays/demonInvasion';
import type { FractureField } from '../packages/overlays/fractures';
import type { HuntField } from '../packages/overlays/hunt';
import type { ExpeditionManifest } from '../packages/manifest';
import { DEFAULT_FREQUENCY, type FrequencyProfile } from '../packages/frequency';
import { PACKAGE_BY_ID, packageSeed } from '../packages/registry';
import type { PackageGate } from '../packages/types';
import { gateOf, resolveGates } from '../packages/weighting';
import { biomeOf, validateBiomeField, validateBiomeLayouts, BIOME_FIELD } from './biomes';
import { LevelField, validateLevelField } from './levelField';
import { START_ZONE, ZONES } from '../data/zones';
import { biomesWithoutTileset } from '../data/tilesets';
import { hasLayout } from '../engine/levelgen';
import { FACTION_COLORS, FALLBACK_FACTION_COLOR } from './palette';
import { factionShortName } from './traits';
import type { ZoneInfoEntry } from './zoneInfo';
import { BiomeField } from './biomeField';
import { IncursionField } from '../packages/overlays/incursion';
import { dayCycle } from './daynight';
import { FactionField } from './faction';
import { InvasionField } from './invasion';
import { biasTable, composeBias, type MapLayer, type OverlayView, type WorldOverlay } from './overlay';
import { Reputation } from './reputation';
import { WarlordField } from './warlord';
import { WeatherField, WEATHER_DEFS } from './weather';

export interface ResolvedSpawn {
  table: PackTableEntry[];
  countMul: number;
  injectFactions: string[];
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
  /** The deadwake overlay if its package is in the manifest, else null — the engine
   *  reads its hidden corpse counter (via accrue/noteUndeadSlain), floods the host
   *  off deadwakeOn(), and drains its consumedZones to deplete events it rolls over. */
  readonly deadwakeField: DeadwakeField | null;
  /** The migration overlay if its package is in the manifest, else null — the engine
   *  reads migrationOn() to pour the neutral beast herd through a caught zone, and it
   *  owns the cross-map herd lifecycle (graze → march → cull). */
  readonly migrationField: MigrationField | null;
  /** The brigands overlay if its package is in the manifest, else null — the engine
   *  reads brigandOn() to pour the nomadic bandit band through a caught zone (with the
   *  proximity rouse). It owns the cross-map column lifecycle (muster → march → disperse). */
  readonly brigandField: BrigandField | null;
  /** The contagion overlay if its package is in the manifest, else null — the engine
   *  reads contagionOn()/patientZeroIn() to field the intensity-scaled plague + Patient
   *  Zero in an infected zone, and calls onPatientZeroSlain() to start the cure. It
   *  owns the cross-zone spread / reveal / recession. */
  readonly contagionField: ContagionField | null;
  /** The holdfast overlay if its package is in the manifest, else null — the engine
   *  reads infoFor()/isLocked() to raise the locked bonus exit + its guardian and to
   *  resolve the toll. It owns the durable per-zone lock state. */
  readonly holdfastField: HoldfastField | null;
  /** The mycelia overlay if its package is in the manifest, else null — the engine reads
   *  sporeOn()/heartbloomIn()/suppressionAt()/transformedZones() to field the fungal
   *  hordes + the Heartbloom, suppress events, and warp the biome; it feeds the bloom
   *  per-zone event activity and calls cull()/onHeartbloomSlain() back. */
  readonly myceliaField: MyceliaField | null;
  /** Per-faction favor earned from events and warlord kills. Persists per run. */
  readonly reputation = new Reputation();
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
    this.weather = new WeatherField(new Rng((seed ^ 0x5eed) >>> 0));
    this.invasion = new InvasionField(this.faction, new Rng((seed ^ 0x1a5e) >>> 0));
    this.warlord = new WarlordField(this.faction);
    this.biomeField = new BiomeField(seed);
    // Difficulty heat-map: distinct salt so danger noise is independent of biome
    // regions; centered on the town's CANONICAL map coord (static, never the moved
    // runtime copy) so difficulty is anchored to home no matter how town expands.
    this.levelField = new LevelField((seed ^ 0x1e7e1) >>> 0, ZONES[START_ZONE].map);
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
        extra.push(pkg.world.overlay({
          seed: packageSeed(seed, pkg.id),
          gate: () => gateOf(this.gates, pkg.id),
          biomeSeed: seed,
        }));
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
    // Heat-map authority needs every field biome to resolve to a frontier tileset
    // (else a mint in that region falls back to the inherited line — the old bug).
    const badT = biomesWithoutTileset(BIOME_FIELD.map(s => s.biome));
    if (badT.length) console.warn('[biomes] BIOME_FIELD biomes with NO frontier tileset (fall back to inherited):', badT);
    const badLv = validateLevelField();
    if (badLv.length) console.warn('[levelfield] LEVEL_FIELD_CFG invalid:', badLv);
    const badAm = validateAmalgamParts(AMALGAM_PARTS, id => !!SKILLS[id], id => !!SUPPORTS[id]);
    if (badAm.length) console.warn('[amalgamation] parts reference unknown skill/support id(s):', badAm);
    this.overlays = [this.biomeField, this.weather, this.faction, this.warlord, this.invasion, this.incursionField, ...extra];
    // Cache the demon-invasion overlay (if the package is in this run's manifest)
    // so the engine can reach it without scanning the overlay list every tick.
    this.demonField = (extra.find(o => o.id === 'demon_invasion') as DemonInvasionField | undefined) ?? null;
    this.crusadeField = (extra.find(o => o.id === 'crusade') as CrusadeField | undefined) ?? null;
    this.huntField = (extra.find(o => o.id === 'hunt') as HuntField | undefined) ?? null;
    this.fractureField = (extra.find(o => o.id === 'fractures') as FractureField | undefined) ?? null;
    this.conclaveField = (extra.find(o => o.id === 'conclave') as ConclaveField | undefined) ?? null;
    this.amalgamationField = (extra.find(o => o.id === 'amalgamation') as AmalgamationField | undefined) ?? null;
    this.descentField = (extra.find(o => o.id === 'descent') as DescentField | undefined) ?? null;
    this.deadwakeField = (extra.find(o => o.id === 'deadwake') as DeadwakeField | undefined) ?? null;
    if (this.deadwakeField) {
      const s = this.deadwakeField.surge();
      const badDw = [...s.floodRoster, ...s.leaderPool, ...s.necropolis.bossPool].map(e => e.id).filter(id => !MONSTERS[id]);
      if (badDw.length) console.warn('[deadwake] roster references unknown monster id(s):', badDw);
    }
    this.migrationField = (extra.find(o => o.id === 'migration') as MigrationField | undefined) ?? null;
    if (this.migrationField) {
      const badMg = this.migrationField.surge().roster.map(e => e.id).filter(id => !MONSTERS[id]);
      if (badMg.length) console.warn('[migration] roster references unknown monster id(s):', badMg);
    }
    this.brigandField = (extra.find(o => o.id === 'brigands') as BrigandField | undefined) ?? null;
    if (this.brigandField) {
      const badBr = this.brigandField.surge().roster.map(e => e.id).filter(id => !MONSTERS[id]);
      if (badBr.length) console.warn('[brigands] roster references unknown monster id(s):', badBr);
    }
    this.contagionField = (extra.find(o => o.id === 'contagion') as ContagionField | undefined) ?? null;
    if (this.contagionField) {
      const s = this.contagionField.surge();
      const badCg = [...(FACTIONS[s.faction]?.table ?? []), { id: s.bossDefId, weight: 1 }]
        .map(e => e.id).filter(id => !MONSTERS[id]);
      if (badCg.length) console.warn('[contagion] roster/boss references unknown monster id(s):', badCg);
    }
    this.holdfastField = (extra.find(o => o.id === 'holdfast') as HoldfastField | undefined) ?? null;
    if (this.holdfastField) {
      const badHf = this.holdfastField.surge().defs
        .flatMap(d => [d.guardian.keeperId, ...(d.guardian.rosterIds ?? [])])
        .filter(id => !MONSTERS[id]);
      if (badHf.length) console.warn('[holdfast] guardian references unknown monster id(s):', badHf);
    }
    this.myceliaField = (extra.find(o => o.id === 'mycelia') as MyceliaField | undefined) ?? null;
    if (this.myceliaField) {
      const s = this.myceliaField.surge();
      const badMy = [...(FACTIONS[s.faction]?.table ?? []), { id: s.heartbloom.defId, weight: 1 }]
        .map(e => e.id).filter(id => !MONSTERS[id]);
      if (badMy.length) console.warn('[mycelia] roster/heartbloom references unknown monster id(s):', badMy);
    }
    this.invasion.gate = (f) => this.warlord.canInvade(f);
    // Per-faction invasion launch scale = the governing package's pressure (0 if
    // no package governs it, or its package is off / below its start level).
    this.invasion.factionScale = (f) => {
      const pid = this.factionToPkg[f];
      return pid ? gateOf(this.gates, pid).ignitionMul : 0;
    };
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
    // fronts, warband hosts), so a frequency boost actually shows MORE at once.
    const conc = this.effectiveFrequency().concurrency;
    this.weather.concurrencyScale = conc;
    this.invasion.concurrencyScale = conc;
    for (const o of this.overlays) o.update(dt, this.scopedView(view, o.dimension));
  }

  onNodeCharted(zone: ZoneDef, view: OverlayView): void {
    // A node only seeds the overlays of ITS dimension (surface mints reach the
    // surface systems; a future hell overlay would seed from hell mints).
    for (const o of this.overlays) {
      if ((o.dimension ?? 'surface') !== (zone.dimension ?? 'surface')) continue;
      o.onNodeCharted(zone, this.scopedView(view, o.dimension));
    }
  }

  /** A zone's EVENT ACTIVITY from the living world: the sum of every overlay's
   *  own severity-weighted term (WorldOverlay.activityAt). A net-new overlay
   *  feeds the Mycelia bloom by implementing the hook — no table to edit. */
  activityAt(zid: string): number {
    let a = 0;
    for (const o of this.overlays) a += o.activityAt?.(zid) ?? 0;
    return a;
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

  /** [weather, faction] minimap layers in draw order. */
  mapLayers(nodes: ZoneDef[]): MapLayer[] {
    return this.overlays.map(o => o.renderMap(nodes));
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
    // clock, so it stays). Formalize per-overlay when a hell field arrives.
    if ((zone.dimension ?? 'surface') !== 'surface') return out;
    const w = this.weather.sample(zone);
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
