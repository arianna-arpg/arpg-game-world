# NativeRegional complete locale foundation

NativeRegional is the schema-17, source-driven continuation of the seamless
landmass. It adds complete supported locale layouts before the smaller district
and regional terrain layers. This is terrain and scenery integration, not native
zone, regional graph, map, or campaign parity.

## Source audit and coverage

The read-only main audit on 2026-10-08 inspected adventureLocales,
adventureGrammar, adventureForms, adventureRegions, bountyPassages, the locale
registry/compiler, and the shared district builders. The two imported data files
are byte-for-byte copies of main's audited working files:

- adventureLocales.ts: Git blob 25c2006ce33b6e05478d6fe1e22daf3ba6599b99.
- adventureGrammar.ts: Git blob 343086e8751af267d83a5fa759f19460eeb8be06.

The catalogue is broader than waterside_ward: 27 programs, 135 variants, eight
navigation grammars, and the separate five adventure regions with six forms
each. The shared generateLocale body assembles every captured source. No
replacement district, river, link, or dressing algorithm was written for this
layer. The exposed LocaleBuildContext is the native operation's actual input
subset; classic generation still calls the same operation.

A fresh expedition audits all 135 resolved variants. Forty-nine complete
variants across 21 programs can currently be admitted. They include hamlets,
orchards, arcades, city/courtyard/canal wards, groves, pond gardens, ravines,
terraces, reed islands and millpond paths. Each source retains its resolved
plan, original district choices, report, complete material grid, native dressing,
source seed, four native approaches and a structural digest. The saved coverage
table records every variant, scale, digest and unsupported reason.

Eighty-six variants are excluded whole: 79 request a native cave mouth owner,
20 require burial-urn reward/wake ownership, and 13 have both requirements.
The four tomb programs, pillaged_lanes and scree_hollows currently have no
supported whole variant. Their semantics are not replaced by decorative urns,
generic caches, improvised objectives or fake caves. Captured geometry alone
does not authorize those gameplay owners. The program's underways eligibility
is preserved as provenance, not activated as an underground network.

NativeRegional does not import adventure-region stage activation, the 30 graph
forms, bounty-gated passage state, issuing boards, objectives, event controllers,
or their rewards. Existing ordinary habitat combat, formations, wounds,
casualties and rewards retain their original owners around admitted terrain.
No new reward loop is attached to these static locale layouts.

## Geometry and admission

Scale is reusable data: the shipped captures alternate 3,600 and 4,800 units
wide, with native aspect ratio (3,090 and 4,140 high). captureNativeRegional
accepts other aligned extents. District proportions scale; authored 120-unit
links and resolved river widths retain their physical dimensions.

Only boundary-connected, unused wall farther than 120 units from any native
paint is transparent. Every native floor/water/bridge cell, enclosed wall and
nearby exterior wall survives exactly. This follows the assembled landscape
outline without surrounding it with a universal square wall. There is no
universal outer bypass connecting and trivializing the authored branches.
Ground samples retain the underlying geographic biome, climate fields and
ground color. Water, locale rivers, bridges and walls keep native region IDs.

The independent 9,600-unit candidate lattice is placement bookkeeping, not a
biome-region or native-zone hierarchy. A saved policy permits at most 16 seats.
Every source fits wholly inside its lattice, including its conservative scenery
circle and clearance. Source origins align to the physical 30-unit grid, including
30-unit address spans and signed coordinates beyond Number's integer precision.
No mutable residency, cache state, prior discovery or query order decides admission.

Opening reservations reject the whole candidate. Every protected ordinary site
retains its entire circle plus 120 units: an intersecting source is refused, never
clipped, relocated in pieces or carved around it. Ordinary habitat footprints may
share terrain; actual native bodies receive the existing bounded, body-clear
seating operation. All four approaches check three dry substrate contacts.
A 25-point inland test rejects broad water; this is not exact coastline preservation.

Every retained source proves radius-15 dry connectivity of its native approaches
and district terminals with native blocking scenery included. It preserves the
authored graph; it does not assert that water is impassable or that every
nonterminal pixel belongs to a dry route. Native swimming remains available.

The layer is evaluated before smaller terrain. Exact cells plus clearance reserve
patches and small features; conservative containing circles protect it from the
older regional composer. Its ordinary-place-only admission callback avoids the
post-terrain content query, preventing terrain/content recursion. The accepted
region cache holds 32 entries. Cold planning is finite but synchronous.

## Scenery, persistence and compatibility

Complete native dressing is loaded by the existing MassSites owner, in its
original orientation and at its exact captured coordinates. Removed scenery uses
the existing sparse mutation ledger. The policy pins the supported scenery rules;
an incompatible live rule refuses loading rather than silently changing meaning.
Unsupported interactive dressing cannot pass as inert scenery.

A nativeRegional place has one whole-source identity. Its radius can exceed the
small native-feature overlap query's cap; runtime recognizes its already-admitted
precedence instead of shrinking the footprint. Later native features reserve
the complete source. Ordinary ecology and objective/procession reservations use
the combined regionalPlacesInCell result. Terrain admission continues to use
ordinary placesInCell.

New expeditions save schema 17, before the schema-16 woven-terrain detector.
Historical descriptors omit nativeRegional and keep their existing schemas,
geometry, random streams and content. Continue reads captured sources, never
rebakes a saved region from today's locale registry. New default labels use the
saved geographic progression envelope. This pass does not complete native-zone
population/controller ownership, area paging, map zoom, or world hierarchy.

The new capture/content payload is approximately 1.7 MB of JSON. Existing
geographic/procession worker input budgets can reject large modern terrain
descriptors and fall back to synchronous planning; this pre-existing large-source
limitation is not solved here. Cold worker generation shares the original river/bridge material rows
through data/localeMaterials.ts, without importing the locale registry/bootstrap.
An isolated-process proof checks worker/synchronous admission and terminal samples
for all four geographic recipe substrates, including far signed coordinates. Incremental source transfer and frame-budget work remain necessary.

## Verification and observed limits

The finite default-country survey checks 256 candidate locations at seed 42.
Three complete formations are admitted: terrace_hamlet, courtyard_wards and
shattered_wards, including the 4,800-unit source. The 2,060 attempted seats include
1,885 protected-site refusals, 160 broad-water refusals and 12 failed exterior
contacts. This is sparse evidence, not full geographic family coverage or a
non-repetition guarantee. All 49 supported sources admit on their applicable
flat geographic substrate in the dedicated source course.

Run npm run check, npm run genqa, npm run sim -- run --suite smoke, and
npm run probe -- worldmass_nativeregional. The dedicated probe compares every
retained material and scenery item against the native assembly, covers all 135
audit rows, data-driven scaling, four geographic recipes, site/opening refusal,
small/far signed addresses, eviction, opposite order, streaming, corruption
refusal, native body clearance, sparse scenery mutation, wounds, casualties,
formation membership and schema-17 Continue.

Adjacent checks cover landforms, landformhabitats, climate, formations,
terrainpatches, nativecountry, nativeingress, geographicworker, locales and the
historical minimal worldmass fixtures. The current generation QA result is
869 cases across three seeds, zero failures and four previously known warnings.
Simulation smoke passes all 25 episodes.

Build the client in an isolated directory:

    HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-native-regional-qa
    HOLLOW_WAKE_WORLDMASS=1
    npx vite build --outDir .claude/native-regional.local.work/dist
    npx electron balance/native-regional-ui.cjs

The hidden course uses its own profile/storage. It visits three naturally
admitted families, renders six route positions, performs six actual native
movement samples, checks native bodies and complete dressing, removes one
owned prop, and compares exact geography and scenery state after durable cold
browser Continue. Reports and screenshots use balance/reports/native-regional-*.
These controlled arrivals and short movement samples are not a full automated
combat playthrough. Broader natural admission, cave/urn lifecycle binding and
native campaign hierarchy remain subsequent phases.
