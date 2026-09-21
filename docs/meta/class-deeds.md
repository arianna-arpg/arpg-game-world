# Classes learned through play

Class discovery reads gameplay facts. Levels remain the 10/30/60/100 mastery
ladder, including its skill swaps and costs. Previously owned classes remain
owned. Old level milestones do not manufacture retrospective deed progress.

The Vault card and its hover share `classRumorRead`. Each objective becomes
readable at its own 25% progress (`CLASS_WEB_CFG.revealFrac`); untouched
alternatives remain obscured. Detailed deed instructions appear only when all
of that card's objective rows are readable, so hovering cannot bypass the veil.

Each `ClassBundleDef.rumor` describes a playstyle without naming a class, skill,
or unlock recipe. Its runes reveal gradually from the first credited progress,
following the best objective fraction because any one avenue earns the class.
The prose is fully readable at 80% objective progress, controlled by
`CLASS_WEB_CFG.proseRevealFrac`; letter reveals scale proportionally up to that
point. This gives time to read the inscription before the class is earned.
Letter occurrences reveal in a scattered, phrase-seeded order across the whole
inscription, leaving partially readable words for pattern recognition. Repeated
letters reveal independently; digraph runes stay whole. Increasing progress only
adds visible letters, and the same phrase/progress always gives the same result
across cards, tooltips and reloads without consuming gameplay randomness.
Progress below that prose threshold leaves some script. The title uses a generic runic
placeholder until earned; the actual name is not encoded into the shrouded card.
Class-select teasers use the same safe prose. Vestiges share the alphabet as lore;
finding them never translates the card, and the UI makes no such claim.

Earning discovers the class and grants its skill/support drop pools immediately.
It also adds the class to `Account.pendingClassUnlocks`, persisted through normal account saves.
The Classes shelf keeps the fully revealed card above the collapsible mystery
section, with an enabled **Unlock** button and no essence price. Clicking it
activates class selection for free and moves the card to Owned; browsing, reloads,
and repeated settle sweeps never clear or re-arm it. The Classes tab includes
pending rewards in its highlighted count. Older saves keep existing ownership
and begin with no retrospective pending notices; no compatibility reset is needed.
Existing pending entries now require that click before becoming selectable.

Mu shows pending discoveries as their own named class vessels in the background,
never in its dealt hand or contract offers. Unknown classes remain nameless cowls.
All class pickers use `isClassUnlocked`, and slot prerequisites use
`unlockedClassCount`, so only activated classes make wider hands purchasable.
Discovery cannot alter the seeded hand or its contract rolls.

The historical `unlockedClasses` save field retains discovered classes;
`isClassDiscovered` reads it, while `isClassUnlocked` excludes pending entries.
This keeps discovery rewards and saved gem pools intact without a migration.

Ownership of a parent reveals deeper branches; deeds accumulated before that
reveal still count. Activation never delays gem rewards or discovery chains.

## Current recipes

All totals span the account's lives unless explicitly described as an encounter.
Necromancer remains the pacing reference. Its calibrated baseline was 20 own
corpses or 5 undead bosses; the final comfort pass asks **15 corpses or 4 bosses**.

### Account calibration before the 25% comfort pass, September 13

The read-only Firefox sample from the hosted game contains **44 recorded runs,
2,825 kills, and 12 reclaimed corpses**. Its corpse route is 60% complete:
44 / 0.60 = **73.3 runs** projected at that same rate. This replaces the initial
estimate of 33 runs / 60% (55 runs). Neither is a required run count: focused
play can earn a class sooner, and pursuing unrelated builds can take longer.

Combat deeds were introduced partway through this account's history, so their
recorded totals are **partial-history observations**, not measured full-account
rates. Dividing by 0.60 gives a reference budget, not a statistical
completion-time guarantee. New response and indirect-damage facts have no
historical sample; their targets are explicitly provisional.

| Reference | Observed | Raw total / 0.60 | Chosen target | Reason |
|---|---:|---:|---:|---|
| Low-life recoveries | 13 | 21.7 | 24 | Round upward; retains the risky alternative |
| Fire hits | 882 | 1,470 | 1,500 | Close to the corpse-route reference |
| Active healing | 5,378 | 8,964 | 9,000 | Close to the reference; Ascetic asks twice as much |
| Survived hit damage | 13,083 | 21,805 | 24,000 | A longer defensive branch |
| Evades | 369 | 615 | 400 / 1,000 | Earlier Swashbuckler, later Matador |
| Poise breaks | 83 | 138 | 150 | Lifetime specialization after Breaker's encounter test |
| Melee critical hits | 78 | 130 | 150 | Round upward for Blademaster |
| Projectile hits | 302 | 503 | 600 | Lancer's sustained ranged practice |
| Companion kills | 195 | 325 | 400 / 800 | Summoner, then deeper Falconer practice |

The save does not split its 2,825 kills into melee finishes. For Berserker,
assuming **half** were melee gives (2,825 × 0.5) / 0.60 = 2,354; the target is
**2,500**. That 50% share is an estimate, not a recovered combat fact. At the
sample's overall 64.2 kills/run, a dedicated melee character could reach it in
roughly 39 similar runs; a mixed roster nearer half melee would take about 78.
This preserves a natural route alongside the deliberate recovery route.

Guarding (40 blocks / 483 stopped damage) and distant shots (48 hits) have too
little recorded coverage to use the raw projection alone. Their higher budgets
are tuning choices for focused shield/ranged play. Sentinel's
120 responses and Skald's 120 rallied finishes retain the same timing windows.
Assassin's 150 concealed finishes has only concealed-hit history (225 hits),
not a reliable historical kill fraction. Beguiler's 60,000 indirect damage is
an initial damage budget to measure in future play, not a backfilled estimate.

### Final comfort pass and discovery waves

The reference budgets above are preserved as the calibration record. Current
requirements below are **25% smaller**, rounded to the nearest whole action
with a minimum of one (`discoveryCount`). Necromancer's corpse projection becomes
approximately **55 runs** at the observed rate; the sample's 12 corpses now mean
80% of its 15-corpse goal. This reduces expected effort, rather than reducing
the chance of earning credit. Three elements and six distinct spells remain
structural breadth; their repetitions fall to **113 hits** and **23 casts**.
Timed windows, distances and life percentages retain their mechanical meaning.
One-off world encounters stay at one; Breaker's three breaks become two.

The first wave adds three accessible habits after the player owns the free
Bounty Board and the Quest Package (quartermaster). Their rumors and rewards
wait for both town introductions, but all earlier deed progress still counts.
There is no minimum death count or forced number of failed runs. Existing rare
field discoveries can still be pleasant early surprises; the foundation gate
applies to the three new natural discoveries, not every class.

| Early class | Natural deed | Opening kit | Continuing objectives |
|---|---|---|---|
| Spellblade | 300 melee killing blows | Static Strike, Hellfire Lash, Mirage Step | Melee kills continue toward Berserker; fire/lightning practice supports Sorcerer and Pyromancer; concealed finishes support Assassin |
| Cryomancer | 90 cold hits | Frost Pulse, Flash Freeze, Shatterstep | Cold practice fills Sorcerer's cold step; its projectiles can work toward Ranger and Lancer |
| Apothecary | Actively mend 1,200 life lost to hostile hits | Venom Bolt, Spore Bloom, Cleansing Light | Healing continues toward Cleric and Ascetic; poison damage advances Beguiler |

At the reference sample's roughly 64 kills per run, Spellblade's deed would
take about five fully melee runs, or nine to ten at a half-melee share.
Apothecary's 1,200 healing is about ten runs at the partial-history sample rate;
that counter is incomplete, so this is a conservative tuning comparison, not
a forecast. Cryomancer has no historical cold-hit sample: 90 is an initial
early budget below the 113-hit specialist rehearsal. Town progress and chosen
build can move all of these dates. None of these asks require equipping the
class's own locked skills.

The middle wave retains the longer combat habits and world discoveries. The
late branches still require their thematic parents: Guardian → Sentinel or
Juggernaut, Cleric → Ascetic, Necromancer → Summoner, Beguiler → Firebrand, and
the other chains below. Counters are never spent or reset on an unlock, so
progress on overlapping routes survives each discovery.

The three new kits use existing shared skill mechanics and existing supports,
bringing previously unrepresented opening styles into the class pool. Each
has a distinct portrait and a full 10/30/60/100 mastery ladder:

| Class | Novice | Adept | Expert | Master's additional skill |
|---|---|---|---|---|
| Spellblade | Tide Lash for Static Strike | Ice Blade for Hellfire Lash | Moult for Mirage Step | Stormcrown |
| Cryomancer | Ice Spear for Frost Pulse | Cold Snap for Flash Freeze | Frostguard for Shatterstep | Hailcrown |
| Apothecary | Contagion for Venom Bolt | Expunge for Spore Bloom | Benediction for Cleansing Light | Reaper's Toll |

Their bundles add matching supports to the drop pool: Static Charge / Slow
Burn, Biting Cold / Chance to Chill, and Envenomed Tips / Chance to Poison. All base
openers and replacement skills meet the class's 60-point starting spread.
Master's gifts follow the existing capstone rule and may require further
attribute investment. No class-specific vocation trees are added in this pass;
account-unlocked vocations remain available through the ordinary shared system.

| Class | Deed | Parent ownership |
|---|---|---|
| Berserker | 1,875 melee killing blows **or** recover from 18 enemy-hit crises: above 30% → at most 30% life → recover to 60%, without dying | — |
| Vanguard | Stop 3,000 damage through active guards or passive blocks | — |
| Guardian | Block 75 hostile hits | — |
| Sentinel | 90 times, block a hostile blow then land a melee hit within 3 seconds | Guardian |
| Breaker | Break one living enemy's poise 2 times in one encounter | — |
| Wallwright | Break enemy poise 113 times | Breaker |
| Sorcerer | Land 113 hits with each of fire, cold, and lightning (3 practiced elements) | — |
| Ranger | Land 135 projectile hits from at least 160 units away at impact | — |
| Summoner | Companions deliver 300 killing blows | Necromancer |
| Swashbuckler | Evade 300 hostile attacks | — |
| Juggernaut | Survive 18,000 life damage from enemy hits | Guardian |
| Pyromancer | Land 1,125 fire hits | — |
| Assassin | Deliver 113 killing blows while invisible or with reduced detectability | — |
| Cleric | Actively heal 6,750 life lost to enemy hits | — |
| Blademaster | Land 113 melee critical hits | Berserker |
| Lancer | Land 450 projectile hits | Ranger |
| Skald | 90 times, use a warcry near an enemy then deliver a melee killing blow within 6 seconds | Warlord |
| Beguiler | Accumulate 45,000 actual indirect life damage (details below) | — |
| Ascetic | Actively heal 13,500 life lost to enemy hits | Cleric |
| Matador | Evade 750 hostile attacks; no follow-up attack required | Brawler |
| Falconer | Companions deliver 600 killing blows | Tamer |
| Sharper | Land 45 projectile critical hits | Swashbuckler |
| Firebrand | Land 113 hits against already panicked enemies | Beguiler |
| Runeweaver | Use 6 distinct spell skills 23 times each within 480 units of an enemy | — |

Existing world deeds remain: Necromancer (15 own corpses reclaimed or 4 undead
bosses slain), Tamer (Crowned beast), Brawler (grip seizure), Trapper (trap
sprung), Warlord (warband warlord), Chronomancer (Chronophage), Hivecaller
(broodmother), Flagellant (6 deaths), and Resonator (fallen star).


## Tracking contract

`engine/deeds.ts` aggregates generic events using data-authored count, sum,
distinct-key, and per-subject-best rules. Distinct rules may require
`minOccurrences` per key before crediting a completed step. An optional `after`
filter opens a timed, single-response opportunity from another event.
`data/classdeeds.ts` owns semantic
rules, discovery recipes and recovery/range settings. No class ID appears in
the combat event pipeline. New objectives may reuse any `deed:<id>` fact.

Facts write directly to the account ledger and mark it dirty for the normal
save cadence. They never also enter the run ledger. Distinct-skill/element
membership and partial rehearsal counts live in namespaced ledger keys and
survive reloads. A practiced element/spell advances the visible objective once
its per-key threshold is met. The new rehearsal and response facts have their
own keys: old one-off element sightings, spell casts, blocks, evades or hidden
hits cannot manufacture their progress. The deeper rehearsal goals use new
facts (`elements_rehearsed` / `spells_refined`), so a formerly completed 20-hit
element or 6-cast spell cannot falsely satisfy the larger rehearsal budgets.
On account load, saved per-key repetitions are re-evaluated against the current
113-hit / 23-cast requirements, so a previous 120-hit partial element qualifies
immediately. Already credited steps remain a floor, and further hits and reloads
do not double-count newly qualified keys.
Already owned classes remain owned,
and unchanged counters retain their history; no save reset is required. Counters
continue past current unlock thresholds so later recipes can reuse them.

The local hero earns personal actions; owned summons and bound companions
earn companion kills, including pooled swarms. A foe that revives through
Undying Loyalty counts only upon its final death. Unowned allies do not count.
Poise breaks may be delivered by the hero or owned actors. Immortal, invulnerable,
passive and no-bounty targets cannot feed combat deeds. Sealed progression
stages earn none. Ambient pooled creatures retain their existing no-objective
policy. Co-op guest progress is not written into the host account.

Active guards record the incoming damage the guard actually intercepts.
Passive blocks report their stopped, mitigated wound separately from seep.
Evades count the engine's refusal event, not merely moving out of range.
Element, critical and concealment facts use landed direct hits; damage over
time is not a new hit. Cast practice requires a nearby living hostile on the
same story, and excludes scheduled repeats, triggered no-cooldown casts and
fuse resumes.

Survived wounds and healing use actual life lost to hostile hits, excluding
fatal hits, defensive pools and self costs. The healing observer consumes the
eligible wound budget immediately, including silent regeneration and full refills; only active
healing earns progress. Thus regeneration cannot leave credit to recycle with
a later self-inflicted wound. A crisis must cross the entry threshold from
above, then reach the separate recovery threshold. Reducing maximum life
cannot fake recovery.

Encounter state (wounds, pending crisis and per-enemy streak) is runtime-only.
Response openings are runtime-only too: a block allows one subsequent
melee hit within three seconds; a nearby warcry allows one melee kill within six.
The response may hit any eligible enemy, with the hero delivering it personally.
Deadlines are inclusive and use world time. Repeating the trigger refreshes one
opening; it never banks extra responses. Nonqualifying hits do not consume it,
and extra targets of a cleave cannot reuse a spent opening. Completed responses
accumulate across encounters. Scheduled cries and companion hits cannot earn a
hero's response. This reuses the ordinary combat attribution filters.
Travel, death, reload, or changing the controlled body ends an attempt. The
account retains its best poise streak, but a new enemy/encounter starts at zero;
two breaks on one enemy plus one on another do not earn Breaker. Three breaks
must leave the victim alive. Killing breaks still feed the separate lifetime
poise-break total. The revealed deed detail describes this deliberate requirement.

### Indirect damage attribution

The generic `indirect` event sums actual life removed, capped at the victim's
remaining life. Beguiler reads that one fact. Eligible outgoing sources are
the local hero and owned companions; targets retain the ordinary hostile,
non-passive, non-immortal, non-invulnerable, bounty-bearing deed filter.

- Ailment ticks and banked reapplication pops report their source and type from
  the timer loop, including the final tick when an ailment expires. Damage
  remains pooled and mitigated exactly as before. When different casters feed
  one type, the account receives only its proportional share of actual life
  loss, never the entire mixed pool. Unattributed environmental effects and
  unowned allies earn no credit.
- Thorns, reflected damage, held-guard retaliation, status ruptures, secondary
  corpse/minion explosions and periodic cling/grip damage use the same capped
  observer. Normal skill hits, including ordinary companion attacks and
  triggered hits through the normal attack pipeline, do not count.
- Self-inflicted hits, self-applied ailments, paid life costs and life conduit
  drains count only with a living eligible enemy within 480 units on the same
  story. Enemy-inflicted wounds, borrowed life debt, reservations, shield loss,
  and town-only self-payment do not count. Healing still requires hostile
  wounds: self-costs cannot manufacture Cleric or low-life crisis progress.

Observers never change damage or spend resources twice. Sources remain local
to their world, sealed stages grant nothing, and only the accumulated numeric
ledger persists. No personal save or compatibility version is modified.

## Opening kits

The resource audit covers the real level-one attributes and costs of all 36
classes. Four kits received a focused cost pass:

| Kit | Mana before → after |
|---|---|
| Guardian | Hammer 15 → 8; Aegis Ward 25 → 16; Rallying Howl 15 → 10 |
| Breaker | Sunder Maul 9 → 6; Earthquake 15 → 12; Verdict 14 → 10 |
| Warlord | Battle Standard 20 → 12; Single Out 10 → 6; Challenging Shout 12 → 8 |
| Tamer | Tame Beast 30 → 12 |

Guardian and Breaker can afford the full opening and a further primary attack
without waiting for regeneration. Tamer can stalk, bind, and goad from its
starting pool. This changes the shared skills for every user, without class
discounts, damage inflation or cooldown changes.

Warlord's original three skills supplied no solo damage. Battle Standard now
also grants 8 retaliation damage through the ordinary aura/thorns systems.
Its taunts bring enemies onto a line that can answer, and losing/leaving the
banner removes the benefit. This is a starting viability adjustment, not a
claim that all classes have equal power throughout progression.

## Extending and verifying

Add an event producer only when an existing semantic fact cannot express the
deed. State the attribution and persistence scope first, author a rule, then
reference its key in any ordinary objective. Keep thresholds and detailed hints
together in `CLASS_DEEDS`, and author spoiler-free discovery prose on the bundle.
Parent ownership is optional; implicit class-level
discovery gates are deliberately absent.

`probe_classdeeds` exercises aggregation, save/load, real hit/block/heal/kill
hooks, exclusions and encounter rules. `probe_classopeners` checks all base
requirements and costs, selected full-rotation budgets, Guardian's real opening
and the Warlord banner's damage and teardown. `probe_unlocks` walks all 36
classes for reachability; `probe_classmastery` preserves the mastery ladder.
Run these alongside `npm run check`, the full probe gate and sim smoke.

`balance/vault-discovery-ui.cjs` checks the rendered card and tooltip at zero,
partial and complete progress, then verifies a free click, shelf movement,
and persistence through browser reloads in an isolated save directory. Run with
`npx electron balance/vault-discovery-ui.cjs` after `npm run build`.
