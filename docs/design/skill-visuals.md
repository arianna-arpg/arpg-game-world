# Skill visual identity

The first pass covers the native **nova** delivery across the fully booted
catalogue: player skills, companion arts, monster skills and component payloads.
Each skill has an authored composition in `src/data/skillVisuals.ts`. The
regression census includes skills registered at startup (including commanders),
so a new nova cannot silently join the generic-flash population.

The second pass adds all 172 native projectiles, six native cone beams, 163
ground skills and 42 auras in `src/data/skillFlightVisuals.ts`. Together these
cover 492 catalogue entries. Later passes add [targets, tethers and offerings](target-skill-visuals.md)
and [melee, non-beam cones and measured lightning](strike-skill-visuals.md).
[Movement identities](movement-skill-visuals.md) now cover dashes, leaps, blinks
and carom. Summon bodies remain on their existing presentation.

## Flights, beams and fields

Projectile profiles name a material head, wake, motion and count, with optional
counter-material and orb/star/cluster composition. Flight direction, velocity,
homing and collision remain mechanical properties. Compact circular heads fit
inside their existing collision disc; wide and other explicit forms retain
`PROJ_FORM_GEO`. Their wakes carry the source material as well. Native resource
motes retain their specialized `orbPaint` cue, and reflection cues remain intact.
Wardrobe projectile bodies still take priority over the native head; skill wakes
remain recognizable beneath them. Recolors always come from the live cast.

Beams use lance, braid, eye, fault, prism and overlapping-scale structures.
Every mark is clipped inside the real cone and the wall-limited endpoint, and
ages with the existing flash. A sigiled beam now shows the sigil's area instead
of a ray whose shape disagrees with the hit test.

Persistent fields combine roots, partial rings, lattices, spirals, scattered
patches or spokes with authored materials and movement. Ink is clipped against
the true faced figure or fissure capsule, the circular safe center and any
shaped closing cage. Existing warning urgency, pulse reach, incoming lobs and
armed/hot fissure cues remain. Ground-qualified strikes retain their per-cell
boil; they skip decorative field ink because the dry cells are safe. Native
fields have a lighter wash so their pattern is readable. Auras also respect
the owner's wardrobe recolor. Projectile deposits and nova aftermath inherit
their source material where an explicit field profile is absent.

Co-op snapshots carry projectile/aura source IDs and a render-only field view.
The host and replica draw the same view, including facing, holes, closing cages,
segments, lobs and pulse timing. Replicas do not create simulated damage zones.
Missing fields from an older host clear the previous view; changing rooms clears
it immediately. Animation uses simulation time or flight age, never frame RNG.

The shared-color study tests identity without palette differences. Distinct
profile tuples provide a coverage guard, not proof that all close relatives
will be identifiable at combat speed.

### Projectile bodies and secondary effects

The compact head can carry a faceted crystal, reservoir, strand, spirit or web
from its flight profile. Wide fronts carry the same collision curve through
their material treatment. The flight and its spent pose use the same head.
Measured lightning keeps the path it travelled. Skeletal and chaining variants
also carry their identity on the leading edge.

An intrinsic explosion selects its explicit `explode.impactFx`, then the
source's `projectileBursts.ts` recipe or area art. The flight supplies the
live tint. Its radius, square or triangular sigil, and damage timing come
from the original splash. Shatter and emission children keep their own skill
art. A projectile-borne damaging aura paints its actual scaled radius and
sends that radius to peers. A periodic zap samples the orb and recipient
positions on the attack. Up to four connections can be shown per pulse;
all eligible recipients still receive the combat event.

Run `projectilepayloads`, `projectileendings`, `projectilecull`,
`skillflights`, `strikevisuals` and `skillimpactcoverage`. The hidden
`projectile-endings-ui` course boots each registered projectile at native
size and compares the rendered flights in pairs at two ages with identical
size and tint. It also compares intrinsic splash frames and captures real
shatter, discharge and moving-field scenes. Set `FLIGHT_SWEEP_PREVIEW` to
a PNG path to retain the two sheets from a local run.

## Skill releases and triggered effects

Frost Storm has no lingering zone. Its paid channel beat deals damage at the locked
target and retires the placement in the same update. The impact now carries the
field's art into the next rendered frame. Wind sweeps fine snow across the target,
faceted ice falls and breaks, and flurries grow denser with the native damage ramp.
The host sends the sampled strength and impact time so a peer sees the same beat.

`data/skillAreaVisuals.ts` composes area art from the source skill, including when
a boss pattern delivers a projectile as a ground blast or a targeted spell deposits
a field. Explicit ground recipes and component art take precedence. A ground
delivery can select its own registered impact with `fx`. Ordinary impacts and
delayed repeats keep the cast's shape, facing, safe center and actual reach.
Fissure repeats retain their capsule. Scattered aftershocks, Hex Blast and a
channel's independent lightning strike carry the identity of the mechanic that
granted them. A quiet placement emits a hit only when the engine resolves one.

Run `npm run probe -- skillimpactcoverage` to fire every registered skill in a
seeded combat fixture and exercise every independent proc. Pass `--list` directly
to `node --import tsx balance/probe_skillimpactcoverage.ts` for individual cast
receipts. The test provides corpses, targets, deployables and banked resources,
checks emitted effects against the client's painters, and follows secondary
projectiles and fields. It also holds and releases Frost Storm, checks peer
playback, and exercises scripted blasts and support-granted repeats.
The `mechanicvisuals`, `afflictioncues`, `supportcoverage` and delivery-family probes
cover tree grants, statuses, conditional ownership and the individual mechanics.

`node balance/skill-impact-ui.cjs` builds an isolated client and tests every
registered skill's area composition at two ages. It compares those pixels with
the generic flash, rejects duplicate same-tint native field and aura silhouettes,
checks safe ground and Wardrobe recoloring, then captures three actual channel strengths.
Set `SKILL_IMPACT_PREVIEW` to a PNG file to keep the comparison. The test removes
its temporary game, saves and profile after the window closes.

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

Integration seams are renderer registration, flight/field/aura paint paths,
nova/aftermath/beam flash producers and snapshots. On a destination with extra
skills, give every new entry in these delivery families an explicit profile
and rerun both censuses. A conflict-free patch alone is not a destination
verification: run the checks there before publishing it.

First-pass transfer preflight on 2026-10-11 against foundation `7799af63`: its booted nova
census matches all 109 profiles, with no missing or retired IDs. A three-way
application in a disposable index applied every gameplay/rendering hunk; only
the `world.ts` import insertion (keep both sets of imports) and the `CLAUDE.md`
intro need reconciliation. The active seamless checkout and its staged work
were not modified. Full destination compilation remains part of integration.
That preflight predates the flight/field pass; repeat it for the new commit.

## Verification and preview

- `npm run check`
- `npm run probe -- skillvisuals`
- `npm run probe -- skillflights`
- `npm run probe -- projectilecull`
- `npm run probe -- effectvoice`
- `npm run probe -- crossjab`
- `npm run probe -- cosmetics`
- `npm run probe -- supportfabric`
- `npm run sim -- run --suite smoke`
- `npm run build`
- `node_modules/.bin/electron balance/skill-visuals-ui.cjs`
- `node_modules/.bin/electron balance/skill-flight-ui.cjs`

The dedicated probe checks the full census, unique authored compositions,
color-independent deterministic geometry, bounded calls at tiny/huge radii,
real casts, same-seed damage parity, delayed pulse identity and co-op round trips.
The hidden UI harness uses the production renderer, tests safe-center pixels
through all six area shapes, and captures three actual casts in an empty arena.

Generated artifacts live in `balance/reports/skill-visuals/` (ignored):
`overview.png`, `monochrome.png`, `live-*.png`, `pixel-checks.json`, and the
self-contained animated `study.html` with all burst profiles, search and pause.
Run the flight harness last to replace that study with all 492 entries, family
filters, a true shared-color toggle and a hide-names recognition test. It also
writes `flight-overview.png`, `flight-monochrome.png`, `flight-pixels.json` and
four additional live cast captures. The HTML lazily decodes visible cards;
its two sets of eight-frame strips are a review artifact, never a game asset.
The study normalizes radius for comparison; live captures retain gameplay scale.
These checks establish technical correctness and provide an art-review surface.
Instant recognition of every close relative still needs player judgment in
crowded combat; unique configuration alone does not prove perceptual uniqueness.

### Checking what actually appeared

Run `node balance/skill-impact-ui.cjs --coverage` for the native release and
secondary-effect census. Set `SKILL_COVERAGE_REPORT` to an HTML path to retain
the searchable record. The course discovers content after the game boots, so
new registered skills, procs, statuses, supports and tree nodes enter the next
sweep automatically.

Each base skill runs against an isolated enemy, ally and corpse with its
required resources. The course measures the emitted objects with the game’s
canvas painters and watches for changed pixels inside the normal world draw.
A projectile placed to prime another skill receives no credit for that cast.
The subsequent four seconds include arrivals, repeats, field ticks and
construct actions. Proc executors are driven directly so chance cannot hide
their outputs. Tree trials compare a release with and without a node while
retaining its prerequisites. The report distinguishes a composed frame, a
painted layer, a registered painter, a configured relationship and an
unobserved activation.

The mechanic silhouette check compares two equal-size, equal-tint frames of
each burst. Encounter courses exercise multi-element procs, live tethers,
overlapping projectile releases and their secondary effects among eleven enemies,
status releases, death interactions and hotbar feedback. Material checks and
controlled HUD states each carry their own evidence label.

## Following a painter or passive into combat

Run `node balance/skill-impact-ui.cjs --targets <previous-coverage.html>` with
`SKILL_COVERAGE_REPORT` set to a new HTML path. The course takes its list from
the previous report’s Painter and Mapped rows. The searchable result includes
the names, prerequisites, visual materials, encounter evidence and outstanding
cases. Two comparison images beside the report show combat interactions and
the hotbar response to a minion death.

Each passive or dealt choice gets a matched encounter with and without its
grant. The course records the cast, damage, resources, summoned bodies, HUD
rows and resolved procs. An externally supplied event that passes a proc’s
admission rules gets its own evidence label. A sheet-only result establishes
the installed bonus and leaves its combat payoff open. Path nodes, selection
locations and options without a dealing node have individual entries.

For visual effects, the course compares pixels immediately before and after
the source’s draw in the game frame. Enemy attack patterns can legitimately
use another skill as a ground impact. Those trials are marked as configured.
Additional encounters replay existing gameplay scenarios and render their
emitted events on the host or from game snapshots after the scenarios’ assertions pass.
The local test server uses a throwaway profile and discards save requests.

After a successful full run, add `--recheck-open <targeted-report.html>` to
retain the recorded encounters and rerun the open owners, passive conditions
and encounter interactions. The input must cover the same original rows.
Adding `--passive-scenes` replays the authored encounter library and checks
open passives during real engine reads on the encounter's player. The
original value is restored before the action continues. An “Encounter
calculation” records the action, stat and both values. A later paired
encounter can replace it with a measured outcome or visible response.
