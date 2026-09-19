# Bounty quality, journeys and reward budgets

September 18, 2026. Compatible expansion; existing postings keep their pay.

Cards separate the objective, route and reward into short lines. Target and
approach levels remain visible; empowered marks and departing bosses retain
their warnings. The journal and map share the objective text and journey's
next step. The first Crossroads lesson remains small and essence-only.

## Objectives

`data/bountyJourneys.ts` registers three kinds with the existing bounty fabric:

- **Chart New Ground:** enter 2–4 previously unvisited wild zones of at least
  the posted level, anywhere the player chooses. “Chart” means first entry,
  not purchasing a chart or revealing map fog. Towns, caves, pocket interiors
  and temporary event ground do not count. The minimum defaults to hero − 2;
  reward level uses that minimum, never the hero's subsequent level. The roll
  requires enough eligible, reachable ground; destinations are not reserved.
- **Follow the Trail:** a seeded 2–4-crossing itinerary along the existing
  validated road graph. The card/journal names the next origin, exit direction
  and destination. Crossings must occur in order; skipping ahead or teleporting
  into the next zone does not advance it. Detours preserve completed steps.
  Acceptance rechecks each prescribed edge against live locks and level limits.
  Temporary locks after acceptance can be cleared or waited out; missing ground
  annuls the posting. The route's peak sets the frozen reward level.
- **Solve:** target a standing, unfinished puzzle objective. Existing puzzle
  presets own the mechanics, generation, interaction and completion. Clearing
  another objective earns no credit. Charge and Solve share a deduplication
  guard so two boards cannot pay twice for the same puzzle.

Counts and weights are in `BOUNTY_JOURNEY_CFG`. The existing kind registry gains
optional `arrival`, `target` and `route` hooks. `target: null` suppresses a false
destination pin for open exploration; completed work still points to its issuing
board. Arrival receives the engine's first-visit fact and actual origin. Stored
progress is bounded to the ask, cloned for snapshots, sanitized and restored.

## Rewards

`data/bountyRewards.ts` owns weighted `BOUNTY_REWARD_RECIPES` and
`BOUNTY_REWARD_CFG`. A budget is `round(6 + 1.6 × posted reward level)`, using the
existing board tuning. Components are selected at posting time, and the saved
pay records the budget, recipe and exact quantities. Pinning, acceptance,
level-ups and reloads cannot reroll the allocation or the random Unique's ID.

Available recipes include mixed essence, coarse essence, finer essence with
change, XP, XP plus essence, a random Unique plus essence, a random Unique alone,
and the existing named/category Unique, equipment, Memory and Smith's Writ
rewards. Recipe weights normalize within each established lane, retaining its
configured overall share. The established targeted recipes consume a whole
budget; the type prevents accidentally mixing their full-budget roller with
fractional allocations.

XP costs one budget unit per 8 base XP. Essence converts at the registry's
existing denomination values, with exact change and level-gated tints. A mixed
Unique recipe spends 80% on the item and the remainder on essence. A Unique-only
recipe spends 100% and flattens native rarity weights with exponent 0.55 instead
of 1, improving the chance of uncommon definitions in the same eligible pool.
It never borrows higher item levels. This is a relative reward valuation, not
an assertion that all items have equal combat strength or vendor value.

Every component in a pay bundle is displayed, saved and awarded. XP uses the
existing party XP grant (including its existing bonuses and attribution);
essence uses the quest payout; gear uses the existing owed-drop lane. Turn-in
removes the contract and prevents repeated collection. A removed random Unique
refunds only its frozen spent share in essence, so mixed pay cannot duplicate
the rest of the budget. Legacy promises retain their existing fallback.

## Verification

- `npm run check`, `npm run build`, simulation smoke.
- `npm run probe -- bountyquality`: exact exchange across denomination gates,
  deterministic recipes, 1,359 real item awards, statistical rarity tilt,
  missing-item refunds, first/repeated visits, save/resume, itinerary order,
  map/journal progress, native puzzle completion and one-time turn-in.
- Existing `bountyboard`, `bountyroutes`, `questmap` and `puzzles` probes.
- `balance/bounty-routes-ui.cjs`: hidden production client with isolated saves,
  1400×1000 and 1000×720 layouts, exploration and mixed-reward cards.

Budget coefficients and objective effort still need playtesting across classes
and progression bands. These checks establish bookkeeping and advertised
behavior, not final economy balance.
