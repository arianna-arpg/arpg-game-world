# Skill visual identity

The first pass covers the native **nova** delivery across the fully booted
catalogue: player skills, companion arts, monster skills and component payloads.
Each skill has an authored composition in `src/data/skillVisuals.ts`. The
regression census includes skills registered at startup (including commanders),
so a new nova cannot silently join the generic-flash population.

This is the first delivery family, not a claim that every skill in the game has
received bespoke art. Projectiles, beams, ground fields, movement and summons
retain their current presentation. Continue those as separate, reviewable passes.

## Visual contract

- Shared alpha, line-width and detail budgets normalize prominence. Radius and
  duration remain the live cast's values; no extra gameplay delay is introduced.
- Identity uses material, silhouette, motion and a secondary shape. Color comes
  from the actual flash, including cosmetic recolors. Never hash a skill ID into
  an arbitrary effect or use damage type as a substitute for authored identity.
- Frost Nova sends branching ice out; Absolute Zero draws ice inward around a
  rune cage; Winter's Sweep carries icy blades around the caster. Shock Nova
  connects electricity around its hollow ring; Thunderclap sends four discharges
  out; Hurricane carries storm arcs around its hollow ring.
- The complete hit footprint is faintly visible from birth. Moving detail is
  an impact accent, not a telegraph or a newly travelling damage wave. Everything
  is clipped to the real area figure and separately outside the circular safe
  center. A square or triangular sigil retains its actual boundary. Terrain
  occlusion continues to be decided by the engine; this painter does not add a
  per-wall clipping pass.
- Target-limited Galvanic Reserve and Lancing Flurry use small source accents
  rather than an indiscriminate full-area wash. Lancing Flurry retains its actual
  victim-linked beams. This pass does not add recipient beams to Galvanic Reserve.
- No combat captions, particle entities, screen flashes, runtime assets or new
  dependencies. Scatter is position-seeded; detail is bounded independently of
  radius, including very large commander casts.

`src/render/vis/skillBurstVoice.ts` registers these compositions into the existing
effect-voice registry. The native nova flash selects `NovaDelivery.fx` when
present, otherwise `skillBurstVoice(inst.def.id)`. Unknown/unprofiled skills
retain the renderer's generic fallback. Authored overrides can opt into any
existing effect voice and must obey that voice's own geometry contract.

Aftermath pulse and cascade placements retain the chosen voice; nova pulse
flashes use it too. Generic aftershock effects remain their existing effects.
Flash snapshots now carry shape, facing, safe center, arcs and beam flags so
remote seats can reconstruct the same geometry. All fields are optional for
older hosts; no save version changes are required.

## Branch integration

Develop this series on `codex/skill-visual-identity`, based on published
`origin/main` (`483b00c4` at creation), in an isolated worktree. The main checkout
has concurrent work and its local history has diverged from published main.

Land focused visual commits into the main content line and bring those commits
forward into `codex/seamless-world-foundation` (the newer integrated foundation,
also currently shared with `shard-world`). Do not merge the seamless world
implementation into main to obtain these visuals. The older `seamless-world`
branch predates substantial content and cue work, and should not be the source
of new catalogue-wide visual changes.

Most implementation is in two new modules. Integration seams are the renderer
registration import, the nova/aftermath flash producers and the existing flash
snapshot. On a destination with extra skills, give each new nova an explicit
profile and rerun the census. A conflict-free patch alone is not a destination
verification: run the checks there before publishing it.

Transfer preflight on 2026-10-11 against foundation `7799af63`: its booted nova
census matches all 109 profiles, with no missing or retired IDs. A three-way
application in a disposable index applied every gameplay/rendering hunk; only
the `world.ts` import insertion (keep both sets of imports) and the `CLAUDE.md`
intro need reconciliation. The active seamless checkout and its staged work
were not modified. Full destination compilation remains part of integration.

## Verification and preview

- `npm run check`
- `npm run probe -- skillvisuals`
- `npm run probe -- effectvoice`
- `npm run probe -- crossjab`
- `npm run probe -- cosmetics`
- `npm run probe -- supportfabric`
- `npm run sim -- run --suite smoke`
- `npm run build`
- `node_modules/.bin/electron balance/skill-visuals-ui.cjs`

The dedicated probe checks the full census, unique authored compositions,
color-independent deterministic geometry, bounded calls at tiny/huge radii,
real casts, same-seed damage parity, delayed pulse identity and co-op round trips.
The hidden UI harness uses the production renderer, tests safe-center pixels
through all six area shapes, and captures three actual casts in an empty arena.

Generated artifacts live in `balance/reports/skill-visuals/` (ignored):
`overview.png`, `monochrome.png`, `live-*.png`, `pixel-checks.json`, and the
self-contained animated `study.html` with all burst profiles, search and pause.
The study normalizes radius for comparison; live captures retain gameplay scale.
These checks establish technical correctness and provide an art-review surface.
Instant recognition of every close relative still needs player judgment in
crowded combat; unique configuration alone does not prove perceptual uniqueness.
