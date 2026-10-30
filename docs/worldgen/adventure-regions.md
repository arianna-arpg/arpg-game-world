# Adventure composition: first playable iteration

This is shared content for the current main zone game. It supplies saved terrain
and optional activities; continuous-world embedding belongs to the independent
seamless work. The original mixed checkout remains recovery material. This
continuation was extracted onto `codex/adventure-composition` from main
`2eceba0d` for iteration before publication.

## What the player can encounter

| Region | Places and optional work | Access |
| --- | --- | --- |
| Ravaged borough | Homesteads and orchard paths; recover the market's buried caches | Collect the local commission to open the buried parish |
| River borough | Quays and backwater routes; hunt marked quarry in the upper ward | Collect the local commission to open the cistern |
| Woodland sanctuary | Pond paths, optional rift sealing, a glimmer refrain in the sanctuary | Every section is reachable while its activities remain unfinished |
| Highland pilgrimage | Covered galleries and a hidden tarn; optional survey stones reveal surrounding country | Reaching the tarn requires no task |
| Necropolis precinct | Mourning streets and cloister paths; kindle the crypt pyres | Collect the local commission to open the reliquary |

Every new entrance and additional side section explicitly uses `objective: none`.
These places retain inhabitants and ambient content. Adding geometry does not
automatically add a kill quota, completion chest, vendor or sanctuary.
Existing complexes retain their previous defaults.

Newly discovered locales also retain their receiving biome's decoration. The
mint saves the selected tileset/variant's scenery stamps, and each section owns
an independent copy. Terrain cuts, camps, structures and new sidezone doors do
not join this pass. Ordinary stamps use 0.65 of their rolled count outdoors and
0.3 in sheltered complex sections; `ComplexStage.decorationDensity` can override
that fraction, including zero. Forests additionally inherit the forest recipe's
tree palette and plant sparse stands with brush, ferns and berries instead of a
continuous canopy. Mountain ground retains its rolled stone and furniture kit,
including braziers when the parent kit supplies them.

The native stamp placement rules still apply. A scoped footprint guard also
protects district centers, connections, portal approaches, water, walls and
authored fragment interiors. Decoration has separate seeded streams and cannot
change the locale's walk grid. Existing adventure regions without the saved
`localeDecoration` field gain it on world resume, or on their next visit in an
already-running session. The migration recovers the root's saved tileset,
variant and forest parameters, then copies the decoration to missing sections.
If a tileset has retired, a private deterministic stream selects a replacement
from the saved biome; an unknown variant uses that tileset's base decoration.
Existing decoration records, including density zero, are preserved. The
upgrade changes only decoration: plans, seeds, graph, objectives, passage
access, partial work and remembered contents remain intact. Saving persists
the resolved kit, so later visits do not repeat migration. Co-op receives the
host's final placed doodads.

`registerStamp` accepts an optional third argument to opt a scenery-only handler
into inheritance. It must preserve terrain, POIs and gameplay lists. The
`stampSingle` helper qualifies automatically unless its kind is a registered
sidezone entrance. This lets new biome furniture participate without extending
a locale-specific kind list.

## Reusable contracts and catalogue choices

`world/landmarkComplexes.ts` owns stage, form, link and saved-membership contracts.
Stages accept the native `ObjectiveSpec`, independently of locale, population,
level and sky exposure. A leyline stage must opt into a waypoint. Authors remain
responsible for an objective's prerequisites, such as its puzzle preset, boss or
adopted feature.

Forms change graph geometry and can add explicitly authored stages. They preserve
base activities, populations, level steps and passage ownership. The helper in
`data/adventureForms.ts` is one optional four-place catalogue recipe with explicit
geographic slots. It neither infers roles from array order nor requires a
commissioned destination. Other complexes can author any valid graph directly.

`data/adventureRegions.ts` selects activities, access and environmental eligibility.
`adventureLocales.ts` and `adventureGrammar.ts` compose district geometry, paths,
footprints and dressing. Builders live in `engine/adventureDistricts.ts` and
`engine/explorationDistricts.ts`; existing builder IDs keep their implementations.

The 27 additional locale programs and eight route grammars are authoring resources,
not a measure of experiential variety. Further work should be judged by encounters
and consequences in play. Cross-location events and seamless retained-area
embedding remain separate work.

## Selection, attribution and saved terrain

`world/generationDiversity.ts` selects forms from a world/family seeded spatial
permutation. Neighboring cells differ when multiple forms exist; sparse sites may
skip cells, and multiple sites may share a cell. No lifetime uniqueness is promised.

The entrance plan stays pinned. Interior plans are selected in stable stage-ID
order against earlier siblings. Every positive-weight program/route candidate is
considered before repeating samples, with at least
`GENERATION_DIVERSITY.candidates` candidates. This avoids missing an available
topology because a short random sample omitted it. Selection maximizes the minimum
structural difference from siblings, without player history or discovery order.
Authored route weights influence the seeded tie order; zero-weight routes are excluded.
The heuristic considers graphs and builder/terrain motifs; names, orientation,
size and dressing earn no novelty. It is not a measure of perceived uniqueness.

Saved membership identifies the family, version, form and stage. Locale plans
record their source program, variant, district choices and resolved terrain.
Version 3 affects future discoveries only. A saved version-2 woodland retains its
original board and commission even though newly minted woodlands are open.
Materialization does nothing to an already discovered complex. No save reset is
needed. Zone packets deep-copy nested membership and passage state.

## Optional bounty passages

A link may declare `bountyPassage`. Its source must carry completable work and be
reachable with all passage gates closed. Its destination must be an exclusive
optional leaf without a waypoint bypass. Non-activities and endless waves cannot
own a commission. Validation rejects bypass links, self-locking tasks and multiple
gates owned by one task.

Only an entrance whose saved graph contains a gate receives a local board. It
remains hostile ground. A passage posting belongs to that regional board and
follows ordinary route and challenge budgets. Outlevelling the region cannot
remove access. Previously completed work remains valid. Only collection of an
accepted, ready hand opens the saved gate; acceptance, abandonment and objective
completion alone do not.

`BountyKindRow.bountyPriority` prefers a pool of progression providers. Competing
providers retain their configured weights rather than taking registration-order
precedence. Failed rolls fall through to remaining candidates. Ordinary diversity
caps and eligibility filters still apply. `collectBounty` runs only at successful
turn-in. The edge-block registry makes travel and route planning agree in both
directions. Baked internal crossings do not receive a second macro river/scarp veto.

## Verification and owner preview

Run `npm run check`, `npm run genqa`, `npm run sim -- run --suite smoke`, and
`npm run probe -- <name>` for `adventureregions`, `generationdiversity`, `complexes`,
`locales`, `landforms`, `bounty`, `objectives` and `puzzles`. Build, then run:

```
npm run build
npx electron balance/adventure-regions-ui.cjs
npx electron balance/generation-diversity-ui.cjs
```

Coverage includes real atlas mints, board reachability, open journeys with live
puzzle/survey fixtures, two-way access, abandonment, prior completion, outlevelled
access, travel, save/restore, old saved commissions and deep network ownership.
Competing priority providers are exercised through the actual board. The hidden
client clicks Accept and Collect, performs real timed cache interactions and
travels into the opened wing and back. Combat pressure is removed in that automated
course; this does not evaluate combat balance.

The diversity probe checks discovery-order replay and preserved stage contracts,
then compares finished walk grids over rotations/reflections. Its finite cohorts
and contact sheet diagnose repetition, rather than proving global uniqueness.

To explore a fixture interactively after the region probe and build:

```
npx electron balance/adventure-regions-ui.cjs --play=ravaged_borough
```

The same command accepts `river_borough`, `woodland_sanctuary`,
`highland_pilgrimage` or `necropolis_precinct`. This explicit preview opens a
visible game window with an invulnerable warrior and isolated saves. Close it to
end the preview. Normal play retains its ordinary damage and save behavior.

Reports and screenshots live under ignored `balance/reports/`. Main publication
still requires full CI on the exact final commit and current main ancestry.
Local checks do not imply publication or finished seamless integration.
