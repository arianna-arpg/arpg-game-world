# Classes learned through play

Class discovery reads gameplay facts. Levels remain the 10/30/60/100 mastery
ladder, including its skill swaps and costs. Previously owned classes remain
owned. Old level milestones do not manufacture retrospective deed progress.

The Vault keeps its existing discovery presentation: a plain hint from the
start, objectives revealed at 25% progress, and class names in runes until
earned. Hints now state the method and target explicitly. Ownership of a parent
reveals deeper branches; deeds accumulated before that reveal still count.

## Current recipes

All totals span the account's lives unless explicitly described as an encounter.

| Class | Deed | Parent ownership |
|---|---|---|
| Berserker | Recover from 8 enemy-hit crises: above 30% → at most 30% life → recover to 60%, without dying | — |
| Vanguard | Stop 750 damage through active guards or passive blocks | — |
| Guardian | Block 25 hostile hits | — |
| Sentinel | Block 90 hostile hits | Guardian |
| Breaker | Break one living enemy's poise 3 times in one encounter | — |
| Wallwright | Break enemy poise 30 times | Breaker |
| Sorcerer | Land fire, cold, and lightning hits | — |
| Ranger | Land 60 projectile hits from at least 160 units away at impact | — |
| Summoner | Companions deliver 30 killing blows | Necromancer |
| Swashbuckler | Evade 25 hostile attacks | — |
| Juggernaut | Survive 1,800 life damage from enemy hits | Guardian |
| Pyromancer | Land 80 fire hits | — |
| Assassin | Deliver 12 critical killing blows | — |
| Cleric | Actively heal 500 life lost to enemy hits | — |
| Blademaster | Land 30 melee critical hits | Berserker |
| Lancer | Land 160 projectile hits | Ranger |
| Skald | Use 30 warcries within 480 units of an enemy | Warlord |
| Beguiler | Land 12 hits while invisible or with reduced detectability | — |
| Ascetic | Actively heal 1,600 life lost to enemy hits | Cleric |
| Matador | Evade 100 hostile attacks | Brawler |
| Falconer | Companions deliver 90 killing blows | Tamer |
| Sharper | Land 20 projectile critical hits | Swashbuckler |
| Firebrand | Land 30 hits against already panicked enemies | Beguiler |
| Runeweaver | Use 8 distinct spell skills within 480 units of an enemy | — |

Existing world deeds remain: Necromancer (20 own corpses reclaimed or 5 undead
bosses slain), Tamer (Crowned beast), Brawler (grip seizure), Trapper (trap
sprung), Warlord (warband warlord), Chronomancer (Chronophage), Hivecaller
(broodmother), Flagellant (8 deaths), and Resonator (fallen star).

## Tracking contract

`engine/deeds.ts` aggregates generic events using data-authored count, sum,
distinct-key, and per-subject-best rules. `data/classdeeds.ts` owns semantic
rules, discovery recipes and recovery/range settings. No class ID appears in
the combat event pipeline. New objectives may reuse any `deed:<id>` fact.

Facts write directly to the account ledger and mark it dirty for the normal
save cadence. They never also enter the run ledger. Distinct-skill/element
membership lives in namespaced ledger keys and survives reloads. Counters
continue past current unlock thresholds so later recipes can reuse them.

The local hero earns personal actions; owned summons and bound companions
earn companion kills, including pooled swarms. Unowned allies do not count.
Poise breaks may be delivered by the hero or owned actors. Invulnerable,
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
eligible wound budget immediately, including silent regeneration; only active
healing earns progress. Thus regeneration cannot leave credit to recycle with
a later self-inflicted wound. A crisis must cross the entry threshold from
above, then reach the separate recovery threshold. Reducing maximum life
cannot fake recovery.

Encounter state (wounds, pending crisis and per-enemy streak) is runtime-only.
Travel, death, reload, or changing the controlled body ends an attempt. The
account retains its best poise streak, but a new enemy/encounter starts at zero;
two breaks on one enemy plus one on another do not earn Breaker. Three breaks
must leave the victim alive. The hint describes this deliberate requirement.

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
reference its key in any ordinary objective. Keep thresholds and plain hints
together in `CLASS_DEEDS`. Parent ownership is optional; implicit class-level
discovery gates are deliberately absent.

`probe_classdeeds` exercises aggregation, save/load, real hit/block/heal/kill
hooks, exclusions and encounter rules. `probe_classopeners` checks all base
requirements and costs, selected full-rotation budgets, Guardian's real opening
and the Warlord banner's damage and teardown. `probe_unlocks` walks all 36
classes for reachability; `probe_classmastery` preserves the mastery ladder.
Run these alongside `npm run check`, the full probe gate and sim smoke.
