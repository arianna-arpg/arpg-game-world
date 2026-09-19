# Bounty approaches and reward budgets

September 18 expansion: [Bounty quality, journeys and rewards](bounty-quality.md)
adds concise cards, exploration and itinerary objectives, puzzle postings and
composable XP/essence/Unique reward budgets. Its reward and copy rules supersede
the single-lane and no-turn-in-XP statements below; route guarantees remain.

September 15, 2026 follow-up to `46c95db7`. No save compatibility bump.

## Diagnosis

Lastlight really has one field exit, into Crossroads. The preceding progression
pass already fixed the opening graph: its two connected level-one branches are
more useful than moving the radial field's center. This pass preserves that
field, its quest-band inverse, and the birth-only opening caps. It adds no roads
from Lastlight and never changes an explored zone's level.

The board still used straight-line distance and destination level. On unchanged
`46c95db7`, seeds 1–20 after clearing Crossroads produced 100 offers; **11 boards
had no level-one target reachable within six crossings and 650 map units**.
One offer also lacked a route within twelve crossings, 1,500 units and level six.
Seed 11 offered levels **6, 3, 6, 2, 2**, despite its connected level-one fields.
Thus the reported symptom is real, but it does not require another regional
level-field rewrite: the board was ignoring the connected opening.

Reward findings:

- Named/category unique pools admitted `target level + 2`, while the category
  payout roller used the target level. A promised Unique could degrade to Rare.
- Lots said “rare-grade” but rolled Magic/Rare. Their incomplete weight override
  also inherited the global Unique chance. They now explicitly roll 0/45/55/0.
- Equipment and Smith's Writ payouts reread the target level at turn-in. Changes
  such as Quickening could change the awarded budget after the offer was read.
- Expedition rewards used the hero level before their target existed. The
  posting clone and save sanitizer also omitted expedition charter data and
  rejected offered charters because their future zone did not exist yet.
- Cleared ground was incorrectly excluded from cull selection, although culls
  spawn their own new marks. This unnecessarily depleted the candidate pool.

## Final selection rules

`BOUNTY_BOARD_CFG.routes` is the tunable contract:

| Choice | Target | Approach from issuing board |
| --- | --- | --- |
| Manageable | hero − 2 through hero, minimum 1 | at most hero level, 6 crossings, 650 map units |
| Other offers | existing kind band, capped at hero + 3 | at most hero + 4, 12 crossings, 1,500 map units |

Farther Postings multiplies the distance budgets. Two initial seats seek
manageable work; a third seeks an above-level target if one exists. Every seat
tries eligible kinds without replacement instead of wasting a seat on one failed
roll. Ordinary charge/errand/gather/cull work can satisfy the manageable contract;
sealed arenas, special/event ground, live census targets, summons, live-event answers and unminted
expeditions cannot. Cull cards explicitly warn that quarry are empowered.
These are level/approach guarantees, not a promise that every class can win.

Pay lanes already represented on the slate temporarily leave the reward draw,
while a nonzero alternative exists. The first-writ band retains its small,
essence-only Crossroads teaching flow. This uses the existing cards and reward
candidates; no new reward-selection interface is introduced.

`world/travelRoutes.ts` provides a reusable bounded graph search. It retains
distance/crossing alternatives so a short but circuitous path cannot hide a
usable direct one. The world adapter checks reciprocal roads, live holdfast and
harbor locks, registered event roadblocks, ocean chords and escarpments. Unmet
sealing objectives may be final destinations, never mandatory transit fights.
It assumes no sailing, concealed passages, purchased pockets or cross-dimension
shortcuts. It reads the hidden graph without loading terrain, changing knowledge,
or moving the player. Cards report crossing count and maximum approach level;
they do not disclose intermediate names, coordinates, terrain or roads.

## Availability and bounded fallback

A same-beat visit retains the standing slate. If it has become inappropriate
through leveling or depleted asks, the board adds fixed commissioned-quarry
alternatives on already reachable ordinary ground. It uses the existing cull
spawn pipeline and the local pack roster. There is no geography expansion loop.
Two empowered marks wear a level fixed at offer time: at least ambient level,
normally hero − 1, minimum 1. Their reward budget uses that same level. The
ordinary population remains unchanged. This is new advertised encounter work,
not a zone silently following the character.

The fallback offers Essence and an equipment lot (only Essence while the first
writ band is active), with fixed ids and a seeded pay roll. Reopening or abandoning
does not reroll them. Same-board alternatives can share a target because only one
can be held; culls in other boards' offers/hands and all held culls remain excluded.
At most two alternatives are added per missing level band; the next normal
refresh clears unpinned offers. Pins and accepted contracts are never replaced.
An active hand suppresses replenishment until it is resolved or abandoned.
Turn-in refreshes, beat timing, per-board caps and failure handling remain intact.

If every usable road is actually blocked, or all reachable quarry ground belongs
to another active cull, the board cannot truthfully invent an appropriate land
approach. It retains choices and reports the unavailable approach; new acceptance
rechecks current routes and refuses blocked work without destroying the offer.
No direct Lastlight shortcut or remote teleport is manufactured to conceal this
physical limit. Unblocking the route or resolving the other contract restores
availability. Long-distance sailing and waypoint itineraries remain player options,
but do not satisfy this conservative local guarantee.

## Reward and save rules

`BountyPay.level` freezes the target/charter/quarry budget at offer time. Level-ups,
refreshes, acceptance, target-level changes and save/resume do not retune it.
Equipment base tiers and requirements use the normal item roller; Rare affixes
obey its level gates and Magic retains the global bounded overroll rule. Unique
pools use the actual budget and valid weighted definitions. Empty lot categories
fall back honestly; a missing promised Unique pays the declared Essence fallback
with a notice rather than silently handing over a Rare.

The board names a reward lane, category, count or named Unique, with frozen item
level and equipment level requirement. It does not
preview individual random affix rolls. The card's grade and reward-level promises
are what the payout must match. Smith's Writ complexity is horizontal, and its
existing accuracy-based forge bonus (up to +2 item levels) is unchanged.

There is **no separate bounty turn-in XP award**. Ordinary kills and objectives
retain their XP; marked quarry grant their normal kill XP plus `12 + 4 × actor
level` writ XP. Using actor level fixes that bonus for commissioned higher-level
marks on low-level ground. Essence still uses `round(6 + 1.6 × reward level)`
worth, converted into the existing tint ladder. Rough Memory remains 3–5 units;
named Memories retain Magic-or-finer grading and existing skill-pool eligibility.
These horizontal material rewards are not multiplied by travel distance, and an
easy low-level contract never borrows the hero's high equipment budget.

Existing accounts, characters, zones and contracts are retained. Legacy posts
without a frozen budget acquire one from their saved target once on restore.
Already-promised named Unique rewards are honored. Offered expedition charters
now survive without their future target; accepted ones require the actual zone.
Data already discarded by an older save cannot be reconstructed.

## Evidence and reproduction

- **1,000 opening seeds:** 5,000 offers, zero route-budget failures, zero boards
  without appropriate work; 909 boards had two level-one options and 91 had three.
- **180 later-band boards:** 30 seeds at each of levels 2/5/10/20/40/80, 630 offers,
  zero availability or route-budget failures, including outgrown Lastlight fallback.
- Regression walks 21 seeds from the **actual board position**, through Lastlight's
  Crossroads portal and then an appropriate field: **42 live crossings**, checking
  portal locks and terrain reachability. Seed 11's suitable route is Lastlight →
  Crossroads → `gen_opening_1`, all field ground level one. Raw destination counts
  are not used as proof of this approach.
- Save/resume preserves levels, offers, accepted fixed-level quarry and regional
  board state. Pure graph traps cover higher unavoidable passes, alternate paths,
  crossing budgets and objective seals; world tests cover live tolls and roadblocks.
- **539 real awarded items** across levels 1/2/7/8/15/16/25/26/45/60/80 match frozen
  budgets, equipment tiers/requirements, grades and affix eligibility while both
  hero and target are changed to level 99 before payout.
- Existing bounty-board, world-progression and quest-map probes pass. Generation
  QA: 868 cases × 3 seeds, zero failures, four existing warnings. Simulation smoke,
  production build and hidden production game smoke pass. The board's approach and
  reward text fits at 1400×1000 and 1000×720 in an isolated hidden client.
- Full fast probe gate retains the existing objective H2 drain override failure
  documented by the preceding progression pass; this is not an all-green claim.

```sh
npm run check
npm run probe -- bountyroutes
npm run probe -- bountyboard
npm run probe -- worldprogression
npm run probe -- questmap
npx tsx balance/audit_bountyroutes.ts 1000
npx tsx balance/audit_bountyroutes.ts 30 --levels=2,5,10,20,40,80
npm run genqa
npm run sim -- run --suite smoke
npm run build
npm run smoke
npx electron balance/bounty-routes-ui.cjs
```

Next player walk: take the first writ, clear Crossroads, compare two manageable
reward candidates with the harder option, and actually follow the selected road.
Return after a level-up with a pinned card, then save/reload a held contract.
Try a regional board and an outgrown Lastlight commission. Watch empowered-mark
combat, route travel time and late material values: graph proofs and item mints
do not establish all-class survival or late-game economic balance.
