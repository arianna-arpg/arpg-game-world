# Seamless gameplay review — October 8, 2026

This is a veto list for behavior and progression, rather than the earlier combined UI/art/architecture inventory. Reference tips: main `651d7e05` and seamless `a770a855`, plus the corrections below. Branch attribution uses their common ancestor `ffbcd5bc`; direct tip differences also include main-only fixes, listed separately.

The [development record](seamless-world-foundation.md) records critic feedback and prepared experiments. That feedback is evidence about a playtest, not design authority. Some entries below are fixes or new seamless content; presence on the branch does not prove a critic requested them. Source commits identify the actual changes.

## Corrections applied in this pass

- **Cleave:** removed the free 35% windup movement and live cursor steering introduced by `7104fa68`. Its original 0.7-second base use time, damage, cost and arc remain. Actual cast-mobility investment still works; it does not grant live aim steering.
- **Lastlight doors:** new expeditions use the original single-cell inn and waking-house entrances. The doubled openings from `bc76a923` are no longer defaults. Native wall-mounted lantern positions remain intact. Per the user's choice, existing saves retain their stored geometry and open/broken states.
- **Thicket Stalker:** Closing Fang is reserved for targets more than 130 units away. This changes monster decisions; the player skill's damage, range, cooldown and usability are unchanged.
- **Thicket and Marsh Stalkers:** an approach settles into melee at a 44-unit center separation, widened only to avoid overlapping large bodies. They retain the melee phase until the prey escapes their existing 250/230-unit commitment range, rather than continually pushing through a nearby target. Native gaze-dependent movement and the watched ambush approach remain. Alpha Stalker was not the reported enemy and is unchanged.
- The previously approved water, fences, guards and reusable defense pieces remain.

## Decisions from the follow-up review

| IDs | Decision / current behavior |
| --- | --- |
| C01–C02 | Provisionally retained, as requested. Their input precedence remains a reviewable design choice. |
| C03 | Approved. Rear blinks face the victim on arrival; this pass makes the turn atomic and handles delayed behind-target deliveries too. Actual Backstab rear damage is tested. Collision can still prevent a rear landing. |
| C04–C07 | Retained with the user's approval or tentative acceptance. |
| C08 | Default territory increased from 620 to 760 units (about 23%) for new expeditions. Saved descriptors and explicitly authored leashes retain their values. |
| P01–P04, P06, P08 | Retained as requested. |
| P05 | **Removed.** No discovery support chooser, claim action, Journal receipt, Skills card, bag shortcut or menu attention. No new support entitlement is issued by a cache or puzzle. Native loot remains. Historical descriptors/receipts are validated read-only so old saves load; carried or fitted gems are untouched. |
| P07 | **Ring choice removed.** Western Watch now pays its existing 80 XP through ordinary return-to-Mireille dwell, with no selection and no item payout. Northern Watch's 160 XP and passive point remain. Existing already-owned rings are untouched. |
| P09 | **Automatic placement removed.** An optional, initially closed guide explains opening the pack and dragging each gifted flask Memory into a chosen skill slot. The real once-per-account lesson observes those ordinary gestures; merely reading the guide cannot complete it. |

### Brush investigation

The missing standing effect is **not a seamless-only critic change**. Commit `e742d97c` (September 20) is an ancestor of both inspected branch tips. It removed `standStatus: 'concealed'` from brush, reeds and berry bushes while adding foliage sight depth and honest last-seen investigation. It also removed default overhead-canopy status. The user's remembered behavior predates that shared commit.

This pass restores the original three underbrush status rows: 50% detectability and the native translucent body, with a 0.7-second exit linger. It applies equally to players and monsters. Felled/removed ground props no longer grant standing effects. Deep foliage sight blocking and copied-position searches remain. Overhead tree crowns and tall crops have not been given new status buffs. See [stealth](../engine/stealth.md).

### Cave presentation

Classic caves and explicitly cavernous lairs (Frostmaw, Wyrm Barrow, Roost Crag, Glacier Mouth and Tide Hollow) now use an upright rock face with a walk-in recess and a visible floor. Pits, wells and floor hatches retain their downward-entry vocabulary. Entry identity, seed, dwell, collision, destination and saved progress are unchanged. This is entrance presentation; it does not relocate or regenerate cave entrances.

## Combat and controls still present

The rows below preserve the original audit and provenance. The decision table above records which behavior is now retained, adjusted or removed.

| ID | Result compared with main | Design consequence | Scope / source |
| --- | --- | --- | --- |
| C01 | The most recently pressed held skill gets the next available action, ahead of an older held skill. | Changes which repeated action wins when multiple buttons remain down. Does not interrupt a committed cast. | Shared input; `509e74be`; [input ordering](../../src/engine/skillInputOrder.ts). |
| C02 | A newly requested walk suppresses older held attack repeats after the current cast finishes. A fresh attack press can take priority again. | Player can leave an auto-repeat without releasing the original attack button. Rooted casts still finish first. | Shared input; `44bbc33a`; same source. |
| C03 | Behind-target blinks, including Shadow Step, land behind the victim's facing instead of on the far side of the caster-to-target line. | Changes flank positioning and how reliably a blink creates a rear attack. Collision still applies. | Shared delivery; `4cdaf9ca`; [world](../../src/engine/world.ts), behindTarget delivery. |
| C04 | Native guard blocks and parries update the recent-block fact used by passives. | Builds depending on a recent block activate from those defenses. A fix, but it changes earned effects. | Shared combat; `8beb7ea8`; [world](../../src/engine/world.ts), block handling. |
| C05 | Ranged AI on grids seeks a clear firing lane around shot-blocking cover, including mixed kits. | Enemies reposition to resume firing instead of continuing blocked attacks. Explicit stationary authoring remains available. | Shared AI; `adac7f87`; [AI](../../src/engine/ai.ts), losStrafe. |
| C06 | Road Foragers' melee hunters muster with two members and 2.2 seconds of patience instead of the pack default's three and six seconds. | Blades engage sooner without waiting for the ranged Bonepicker. Deliberate encounter pacing. | Specific encounter; `2bc3c58d`; [encounter groups](../../src/data/encounterGroups.ts), foragerMuster. |
| C07 | A Bonepicker with nerve above zero but below 0.45 uses hit-and-run with a 1.8–2.4-second withdrawal. Zero nerve uses finite panic/rally. Previously the low-nerve rule was retreat without that lower bound. | Fewer prolonged chases; wounded enemies resume retaliatory throws. This is the other significant existing-species retune from the critic/pursuit work. | Shared species; `d5b3ce20`, `0d5dd22f`; [monsters](../../src/data/monsters.ts), gnoll_bonepicker. |
| C08 | Seamless encounters originally received a fallback 620-unit home territory; new defaults are now 760. Authored leashes take precedence; relentless phases can ignore it. Returning does not grant a blanket heal. | Limits pursuit and changes pulling/kiting opportunities. | Seamless policy; `3f028952`; [territory](../../src/worldmass/territory.ts), [preset](../../src/worldmass/preset.ts). |

## Lastlight, interaction and rewards still present

| ID | Result compared with main | Design consequence | Scope / source |
| --- | --- | --- | --- |
| P01 | Deliberately walking into an eligible Lastlight door contributes to its normal opening dwell; main uses the idle opening approach. | Changes the interaction ritual. **Still enabled after restoring door widths.** Locked/switched/pull doors retain their rules. | New seamless expedition policy; `4e6263de`; [door press](../../src/engine/doorPress.ts). |
| P02 | Continuous Lastlight blocks wilderness damage across sanctuary boundaries, symmetrically including owned proxies. Intruders retreat or engage the approved watch. | Town is a refuge rather than a place to attack wilderness enemies for free. The physical watch is separately approved. | Seamless safety; `47452701`; [sanctuary](../../src/worldmass/sanctuary.ts). |
| P03 | A cleared, earned exploration cache can complete its held search in 0.35 seconds when no pressing foe is nearby. | Removes much of the post-fight waiting. Pressure, interrupted-search recovery and native loot still apply. | Configured seamless caches; `b7a33cb2`; [site policy](../../src/worldmass/sites.ts), runtime cacheHoldRate. |
| P04 | Hitting enrolled passive puzzle nodes no longer keeps refreshing the combat-lull restriction. | Supports and other calm-gated actions become available sooner after a puzzle. Real combat and existing recovery still count. | Shared puzzle interaction; `e91c2fc4`; [world](../../src/engine/world.ts), puzzle strike/combat handling. |
| P05 | **Removed in follow-up.** A cache or owned riddle previously could award a compatible support choice: one total per new expedition, shared across triggers. Splash and Battering Ram are offered treasures without requiring prior account unlocks. | Earlier access to build-changing supports. Receiving one does not permanently unlock its random-drop pool. | Seamless progression; `8fdfe2f7`, `5f53030c`, `b6c803db`; [rewards](../../src/worldmass/rewards.ts), preset rewards. |
| P06 | Clearing configured garrisons awards the native completion curve, 40 + 30 × level XP, once. | Additional completion-reward sources. The formula was reused from native objectives, not changed globally. | Seamless progression; `d525526a`; [clearance](../../src/worldmass/clearance.ts), [reward curve](../../src/data/objectiveRewards.ts). |
| P07 | Western Watch originally gave 80 XP and a ring choice (**choice now removed**); Northern Watch opens at level three and gives 160 XP plus a passive point. New expeditions explicitly accept through Journal rather than automatic dwell acceptance. | Authored early power progression and a different quest-acceptance flow. | Seamless quests; `ab8beefe`, `1e8bfe15`, `efe0fcad`; [frontier quests](../../src/quests/frontier.ts). |
| P08 | Supports can be recovered directly from bag-held skill copies without first seating that skill. | Easier build management. Capacity, ownership, locked sockets and combat-lull restrictions still apply. | Shared inventory action; `2e0954d7`; [stored supports](../../src/ui/storedSupports.ts). |
| P09 | **Replaced by optional instructions.** Preparation previously guided the existing flask-Memory lessons and could place a carried flask Memory into an empty skill slot. | Shorter preparation flow. Uses native learning, with no extra flask gifts or occupied-slot replacement. | Shared card plus seamless teaching; `c8236dc5`, `bdd53fb0`; [preparation](../../src/ui/skillPreparation.ts). |

## Additional differences worth reviewing

These were outside the initial seventeen-row focus. They are separated so information displays and seamless content are not mistaken for changes to skill damage or commitment. They remain implemented; inclusion here does not claim a critic requested them.

| ID | Observable difference | Gameplay significance / source |
| --- | --- | --- |
| A01 | Cinderwatch's authored Road Foragers group combines two hunters and a Bonepicker; the Caravan Watch combines two sword fighters, a healer and an archer. | Encounter composition, leadership and healing create different fights. The existing species retain their native skills. These two recipes are explicitly selected, not added to every ambient pool. [Encounter groups](../../src/data/encounterGroups.ts), `c8d65912`, `2bc3c58d`. |
| A02 | Seamless danger uses saved geography: level 1 near home, then reference stops at distance 5,800 → level 4, 13,200 → 9, 26,800 → 18, 40,000 → 24, with regional variation. | Replaces discrete-zone progression in continuous country; it does not scale enemies to the player's current level. Population limits and native presence tables also influence the opening roster. [Progression](../../src/worldmass/progression.ts), [preset](../../src/worldmass/preset.ts), [population](../../src/worldmass/population.ts). |
| A03 | Roadside sites, shrines, puzzles, weather/ground hazards, outposts and native guardians appear along persistent continuous routes. | Adds encounter and reward opportunities, including native shrine effects and puzzle attunements. The removed P05 chooser was an extra payout layered on these activities; their normal rewards remain. [Landmarks](../../src/worldmass/landmarks.ts), [regional sites](../../src/worldmass/regionalSites.ts). |
| A04 | Nearby work can be explicitly accepted through the Journal or NPC conversation; the Northern Watch is gated by the current run's paid Western Watch and level three. | This changes the quest invitation/acceptance flow, not just its wording. Idle auto-accept is retained only by historical descriptors that request it. P07 covers the payouts. `efe0fcad`, `6fdca576`; [quests](../../src/worldmass/quests.ts). |
| A05 | Melee preparation footprints, shield arcs, confirmed rear-hit cues, status timers and passive/combo progress disclose additional combat information. | They can change readability and player decisions, but do not add hit range, block coverage, damage, combo duration or free cast mobility. [Melee reach](../../src/engine/meleeReach.ts), [combo conditions](../../src/engine/comboConditions.ts); `a53517cf`, `8bef7dfe`, `a1121932`. |
| A06 | Memory descriptions and pickup history explain the gem inside; a revealed result can focus its actual bag item. | Extra inventory guidance. The inspected change did not alter Memory rolls, unlock requirements or the cost of recall. `e42f61a6`; [Memories](../../src/engine/memories.ts). |
| A07 | NPC conversations retain the chosen reachable speaker and can expose that speaker's native actions within the dialogue. | A different interaction flow; it does not make an unreachable NPC usable. This pass removes flask auto-placement from that flow too. `6fdca576`; [conversation](../../src/ui/npcConversation.ts). |

The shared actor diff contains presentation stamps, replicated display information and the recorded territory fallback. Existing species data changes found in this comparison are the Bonepicker rule, the approved Forager tactics and this user's Stalker corrections; the town watch is new content. Existing skill data's earlier Cleave mobility/aim override is removed. Passive descriptions now explain their actual combo conditions, but their inspected modifiers and timing constants were not retuned.

The broader native-area extraction, region generation, map hierarchy and streaming work is substantial and still evolves separately. This inventory is a source-grounded gameplay review, not a claim that every newly integrated native encounter has received a complete ordinary-input playthrough.

## Main-only fixes are a separate merge decision

These are present on the inspected main tip but absent from seamless. They were not removed to satisfy a seamless critic:

- **Solar Brand:** enemy-targeting contract and targeted classification (`d85027ad`, `4043d203`).
- **Targeted echoes:** marked-target resolution and corpse exclusion (`f3a4031d`, `c7564958`).
- **Maddening Miasma:** standing-surface gating and per-frame, per-skill madness accumulation (`cbdffe67`, `a73895ed`).
- Main also contains allocated-host/talent support-matrix corrections: separate correctness work, not a difficulty or commitment adjustment.

No main-only fixes were cherry-picked by this pass.

## Scope and verification

Art, text placement, optional UI, performance work and code movement are omitted unless they affect a decision above. Native terrain/area integration, geographic progression, encounter rosters, shrine/puzzle placements, climate and persistence are larger seamless-design work, not evidence of critic-driven skill changes. Their history remains in [the foundation record](seamless-world-foundation.md).

The branch-only core data change to an existing player skill found in skills.ts was Cleave's mobility/aim; its other branch-only edits are icon identities. Combo descriptions and progress displays did not retune passive stat values. Shared input/delivery changes can still affect skills without editing their individual data, so C01–C05 remain in this review.

Verify with `npm run check`; castaim, stalkercommitment, skillinputorder, cleave, tacticalai, worldmass_doorplans, worldmass_puzzlerewards, doorpress and settlementdefenses probes; simulation smoke; and generation QA. The door-plan probe explicitly constructs historical wide-door saves and checks exact Continue alongside new original-width entrances.

Build with `npm run build -- --outDir balance/reports/commitment-review-dist`, then run `node_modules/.bin/electron.cmd balance/cast-aim-ui.cjs`. The isolated client checks centered inn entry, planted fixed-aim Cleave, both Stalkers using melee without close-range lunges, retained guards and browser Continue. Screenshots and evidence go to ignored balance/reports/commitment-review-* files.

## Follow-up verification

The replacement acceptance course is `balance/gameplay-followup-ui.cjs`, built into `balance/reports/gameplay-followup-dist`. It drives real pack-to-rack mouse drags, checks the optional guide cannot mutate the lesson, exercises saved Continue, captures cave/pit/hatch differences and checks the native brush body fade. The three obsolete support-choice/automatic-preparation client courses have been retired.

Focused regressions: shadowarrival, brushcover, stealth, skillpreparation, mireille_lesson, worldmass_rewards (including historical pending/claimed saves and owned gems), worldmass_puzzlerewards (native payouts), worldmass_quests, worldmass_questchoice, worldmass_territory, conversation, native scene geometry and the affected old-descriptor courses. Required checks remain all type checks, smoke simulation and generation QA.
