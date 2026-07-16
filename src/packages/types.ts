// ---------------------------------------------------------------------------
// CONTENT PACKAGE FRAMEWORK — the primitives.
//
// Every major world feature (Warbands, Storm Fronts, Demon Invasions, Breach…)
// is ONE declarative ContentPackage. A package carries everything the brief
// asks for — its unlock requirement, the modifiers (sliders) the player can buy
// and tune, default weight + start-level, and the world HOOKS that translate its
// resolved "pressure" into the engine's existing currencies (per-faction
// invasion launches, weather spawn rate, or a net-new overlay field). Adding a
// feature is, ideally, one new def file + one registry line.
//
// Pure types: this leaf imports only data/world/meta TYPES, never engine/world,
// so the framework stays acyclic and trivially testable. See registry.ts for
// the catalog, weighting.ts for how pressure is resolved, manifest.ts for the
// immutable per-run snapshot that makes a run's configuration LOCKED.
// ---------------------------------------------------------------------------

import type { Account } from '../meta/account';
import type { PackTableEntry } from '../data/zones';
import type { FactionTraits } from '../world/traits';
import type { WorldOverlay } from '../world/overlay';
import type { EncounterDef } from './encounters';
import type { HoldfastDef } from './holdfast';

/** Open string alias (NOT a closed union) so a net-new package is one def file,
 *  never a core type edit. Ids are validated against the registry at runtime. */
export type PackageId = string;

/** Trigger counters — lifetime (account.ledger) or per-run (World.ledger).
 *  e.g. crowned_killed, warlords_killed, sieges. */
export type Ledger = Record<string, number>;

// --- unlock requirement -----------------------------------------------------

export interface UnlockContext {
  account: Account;
  /** Lifetime counters (account.ledger) — survives death like credits. */
  ledger: Readonly<Ledger>;
}

/** A pure predicate deciding when a package's configuration becomes BUYABLE in
 *  the Vault. Warbands' is `(ctx) => (ctx.ledger.crowned_killed ?? 0) >= 1`. */
export interface UnlockRequirement {
  id: string;
  /** Shown greyed on a locked Vault card ("Slay a Crowned enemy"). */
  label: string;
  test(ctx: UnlockContext): boolean;
}

/** A rung on a package's INVESTMENT LADDER, bought in the Vault AFTER the base
 *  unlock. Each owned tier WIDENS the Expedition slider range — the PoE-League
 *  "discover → invest → master" arc. Generalized: any package can declare tiers.
 *  Surfaced in order (a tier shows once the prior tier is owned and its `test`
 *  passes), and is gated by a ledger milestone the player earns IN PLAY. */
export interface UnlockTier {
  /** Stored in account.packageUnlocks (e.g. 'breach_invest'). */
  id: string;
  /** Vault card title ("Breach Investigation"). */
  label: string;
  /** Greyed gate text shown until earned ("Seal 5 Breaches"). */
  requirement: string;
  cost: number;
  /** The milestone predicate that SURFACES this tier. */
  test(ctx: UnlockContext): boolean;
  /** The new min/max this tier grants per modifier kind (applied while owned). */
  grants: Partial<Record<ModifierKind, { min?: number; max?: number }>>;
}

// --- modifiers (the purchasable + per-run-tunable sliders) -------------------

export type ModifierKind = 'startLevel' | 'weight';

export interface PackageModifier {
  id: string;
  kind: ModifierKind;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

// --- the resolved per-tick gate ---------------------------------------------

/** Resolved every tick from the FROZEN manifest + the live character level.
 *  `share` is the normalized 0..1 mix (for the UI bar); `pressure` is the
 *  parity-preserving baseline multiplier (share × active-count) the engine
 *  applies so equal weights reproduce today's spawn cadence.
 *
 *  The three `*Mul` fields fold in the run's GLOBAL FrequencyProfile (see
 *  packages/frequency.ts) so every overlay reads ONE source of truth instead of
 *  re-deriving the global crank. At the default profile they equal the legacy
 *  values (ignitionMul = severityMul = pressure, concurrencyMul = 1), so behavior
 *  is unchanged until the meta-meta unlock turns a lever. */
export interface PackageGate {
  active: boolean;
  share: number;
  pressure: number;
  /** pressure × frequency.rate — the IGNITION-roll multiplier (how often). */
  ignitionMul: number;
  /** pressure × frequency.severity — the SIZE/SPREAD multiplier (how big/fast). */
  severityMul: number;
  /** frequency.concurrency — scales each overlay's concurrency CAP (how many). */
  concurrencyMul: number;
}

// --- world hooks: how a package's pressure feeds the shared simulation -------

export interface OverlayBuildCtx {
  /** Deterministic per-package seed (manifest.seed ^ PACKAGE_MAGIC[id]) —
   *  salted per DIMENSION for non-surface instances, so parallel world-states
   *  roll independent event streams. */
  seed: number;
  /** Live gate accessor, read each tick by the overlay. For a non-surface
   *  instance, ignitionMul arrives PRE-SCALED by the dimension's tempo
   *  (DimensionDef.events) — overlays never read dimension data directly. */
  gate(): PackageGate;
  /** The world's BIOME-FIELD seed (= manifest.seed) — overlays that locate biome
   *  regions sample biomeAt / fieldRegionAt with it (Migration finds Field blobs to
   *  herd between). Most overlays ignore it. */
  biomeSeed: number;
  /** Which DIMENSION this instance runs in ('surface' default). The sim scopes
   *  views/routing off the instance's dimension; most overlays never read this. */
  dimension?: string;
}

export interface WorldHooks {
  /** Existing faction ids whose invasion launches scale by this package's
   *  pressure (Warbands → the mortal/beast factions; Demon Invasion → demon). */
  invasionFactions?: string[];
  /** This package's pressure scales the weather-front spawn rate (Storm Fronts). */
  weather?: boolean;
  /** A net-new overlay field appended to the sim, reading its own gate live
   *  (Breach). Migrated features need none of this — they route pressure into
   *  the shared invasion/weather fields above. */
  overlay?(ctx: OverlayBuildCtx): WorldOverlay;
  /** The DIMENSIONS this package's overlay runs in (default ['surface']).
   *  The sim constructs ONE INSTANCE PER LISTED DIMENSION — each with a
   *  dimension-salted seed, a dimension-scoped view, and a gate whose
   *  ignitionMul is pre-scaled by that dimension's tempo (DimensionDef.events)
   *  — so 'demonic incursions rage below while the surface breathes' is two
   *  data lines: this list + the dimension's events row. Parallel world-states
   *  run the SAME overlay code with zero per-overlay edits. */
  dimensions?: string[];
}

// --- validation (colocated with the def; run once at sim boot + by eventqa) --

/** Membership tests over the LIVE content registries, handed to each package's
 *  `validate` so a def can prove every id it references still resolves. Plain
 *  predicates (not the registries themselves) keep this leaf pure. */
export interface RegistryLookups {
  monster(id: string): boolean;
  skill(id: string): boolean;
  support(id: string): boolean;
  faction(id: string): boolean;
  /** A REGISTERED tileset id (mintable look). */
  tileset(id: string): boolean;
  /** A registered layout generator (engine/levelgen hasLayout). */
  layout(id: string): boolean;
  /** A registered structure stamp id. */
  structure(id: string): boolean;
  /** A registered boundary-gate treatment id (data/boundaryGates.ts) —
   *  holdfast gates and enclave façades resolve here. */
  boundaryGate(id: string): boolean;
  sidezone(id: string): boolean;
  biome(id: string): boolean;
  /** A registered DIMENSION id (world/dimensions.ts; 'surface' included) —
   *  holdfast dims bands and future plane-scoped defs resolve here. */
  dimension(id: string): boolean;
  /** A registered POCKET FORM id (data/pocketForms.ts) — the shapes purchased
   *  ground can take; holdfast PocketSpec.forms rows resolve here. */
  pocketForm(id: string): boolean;
}

// --- relationships (faction stance overrides + inter-package interaction) ----

export type RelationKind = 'ally' | 'hostile' | 'amplifies' | 'suppresses';

export interface Relationship {
  a: string;
  b: string;
  kind: RelationKind;
  /** ally/hostile: stance only. amplifies/suppresses: weight factor on `b`
   *  while `a` is active (Breach amplifies Demon Invasion at strength 1.2). */
  strength: number;
}

// --- faction-expansion generator output -------------------------------------

/** One declarative faction grafted into the data registries at boot, so a new
 *  faction immediately marches, crowns a warlord, conquers, and paints the
 *  minimap with NO overlay code change (see factionGen.ts). */
export interface FactionSpec {
  id: string;
  name: string;
  color?: string;
  traits: FactionTraits;
  roster: PackTableEntry[];
  /** Monster id this faction fields as its warlord (→ WARLORD_OF). */
  warlord?: string;
  /** Stance rows folded into the faction RELATIONS table. */
  relations?: Relationship[];
}

/** A fixture a package plants inside a REGISTERED SIDEZONE (data/sidezones.ts)
 *  at its mint — the seam that lets a package build inside rooms it doesn't
 *  own (The Pit's maw in the town cellar). Applied by the engine only while
 *  the package's gate is active on the run, and only when the pocket first
 *  mints (sidezone defs are cached per entrance). */
export interface FurnishSpec {
  /** The SidezoneDef.kind this furnishing lands in. */
  sidezone: string;
  /** The structure fixture appended to the minted def (structure id + center
   *  coords in the pocket's own space). */
  fixture: { structure: string; x: number; y: number };
}

// --- the package -------------------------------------------------------------

export interface ContentPackage {
  id: PackageId;
  label: string;
  blurb: string;
  /** Accent colour for UI surfaces (Expedition mix bar, Vault cards).
   *  Omitted = the neutral fallback. */
  color?: string;
  /** Vault credit cost to unlock this package's configuration (its sliders). */
  cost: number;
  /** The base unlock — when met, the package's config (its sliders) is BUYABLE. */
  unlock: UnlockRequirement;
  /** Optional investment ladder bought after the base unlock; each owned tier
   *  widens the slider range (Breach: Investigation → Exploration). */
  tiers?: UnlockTier[];
  modifiers: PackageModifier[];
  defaultWeight: number;      // 0..100
  defaultStartLevel: number;  // 0..101 (101 = off, since the level cap is 100)
  /** In the default manifest (a base-game feature on from the first run)?
   *  Migrated features = true; net-new opt-in packages (Breach) = false. */
  defaultEnabled: boolean;
  /** Always active, never weighted or gated — the faction-politics substrate. */
  alwaysOn?: boolean;
  /** A PLACE, not an EVENT: excluded from the relative-weight pressure budget
   *  entirely (its gate is pure enabled + start-level; other packages' shares
   *  and the mix bar never see it). The Pit's mode — owning a room under the
   *  town must not dilute how often storms or warbands fire. */
  pressureless?: boolean;
  world?: WorldHooks;
  /** Spatial, timed, IN-ZONE encounters this package places (Breach diamonds).
   *  Generalized — a new event type is one more EncounterDef. See encounters.ts. */
  encounters?: EncounterDef[];
  /** Fortified, LOCKED bonus exits raised in uncharted zones, each held by a guardian
   *  faction behind an unlock condition (the Bandit toll-gate). One more HoldfastDef =
   *  a new guardian, pure data. See holdfast.ts. */
  holdfasts?: HoldfastDef[];
  factions?: FactionSpec[];
  relationships?: Relationship[];
  /** Fixtures planted inside registered sidezones at their mint — a package
   *  building in rooms it doesn't own (see FurnishSpec). */
  furnish?: FurnishSpec[];
  /** SELF-VALIDATION, colocated with the def: return a human-readable line per
   *  id this package references that no longer resolves (a renamed monster, a
   *  typo'd tileset — the silent-fallback class of bug). The sim runs every
   *  package's validate at boot (one shared loop — no more per-package blocks)
   *  and the event QA harness fails the build on any hit. COMMON shapes
   *  (faction rosters, encounter factions, furnish sidezones/structures,
   *  relationship ids) are swept generically by validatePackages — declare
   *  here only what's private to your surge config. */
  validate?(look: RegistryLookups): string[];
}
