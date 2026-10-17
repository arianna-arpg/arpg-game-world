# Seamless-world branch audit

Snapshot: 5 October 2026. This inventory supports deciding what to keep, make optional, revise, or remove. It includes visual and gameplay work as well as the added UI.

## What the comparison establishes

The seamless branch contains substantial shared UI and combat-presentation work alongside the continuous-world prototype. Much of that UI also changes ordinary zone play when running this branch. Those additions can be reviewed separately from the world work.

The starting class kits, starter drop pools, support catalogue, and Vault unlock catalogue were **not expanded**. Selected existing supports gained an additional exploration reward route. More explanation on screen did not address the breadth of the starting build pool.

The passive graph is back as the default. Its two added text lists are independently optional and off. Node positions, connections, and allocation rules have not been redesigned; layout remains a future pass.

Two further corrections accompany this audit: **Skill Cast Name** in Options → Visuals and **Support ready message** in Options → Interface are saved preferences, both off by default, including when loading older settings. Cast progress, the active hotbar-slot cue, and support refusal feedback remain. These corrections are later than the frozen comparison below.

### Exact comparison

Branches: `main` and `codex/seamless-world-foundation`.

| Reference | Commit |
| --- | --- |
| Main | [bc8a0e0a9211](https://github.com/arianna-arpg/arpg-game-world/commit/bc8a0e0a9211815d99dcf0ea389e451157c0684d) |
| Seamless before this audit's two corrections | [5820d968a7b9](https://github.com/arianna-arpg/arpg-game-world/commit/5820d968a7b9b4e946fad4ca4c473c03dc23889c) |
| Common ancestor used for attribution | [e99c1054515f](https://github.com/arianna-arpg/arpg-game-world/commit/e99c1054515f2b8e70b2d6020462d09585a80e8b) |

| Measure | Count |
| --- | ---: |
| Commits reachable only from seamless | 139 |
| Commits reachable only from main | 11 |
| Files changed from the common ancestor to seamless | 363 |
| Files changed from the common ancestor to main | 40 |
| Files differing directly between the two tips | 397 |

These are Git counts, not feature counts. Some commits fix or supersede earlier changes. The tables describe resulting behavior, while the history appendix preserves every exclusive commit. Main-only work is listed separately: its absence from seamless is branch divergence, not a deliberate UI rollback.

The [complete file inventory](seamless-branch-files.md) lists all 397 differing paths, both sides' attribution, and line counts. Counts exclude this audit and its cast/support preference correction. Historical comparison: [main → seamless](https://github.com/arianna-arpg/arpg-game-world/compare/bc8a0e0a9211815d99dcf0ea389e451157c0684d..5820d968a7b9b4e946fad4ca4c473c03dc23889c).

## Text, panels, and other UI additions

“Shared” means the implementation is not restricted to seamless mode. “Code setting” means an author can change configuration, but there is no corresponding player-facing Options toggle. Contextual text appears only when its condition is met; it is still extra text to review.

| ID | Change from the earlier view | Current default / control | Scope |
| --- | --- | --- | --- |
| T01 | Available now passive cards above the graph, with direct allocation and descriptions. | **Off**, independent Interface toggle. | Shared |
| T02 | Your choices summary of allocated passives above the graph. | **Off**, separate Interface toggle. | Shared |
| T03 | Name of the skill currently being cast above the hero. | On at the snapshot; **off with this audit**, Visuals toggle. | Shared |
| T04 | “Feet planted” caption for a movement-locked cast. | **Off**, independent Visuals toggle. Works without T03. | Shared |
| T05 | “Supports can be changed here.” affirmative Skills message; remote clients have a general lull reminder. | On at the snapshot; **off with this audit**, Interface toggle. Hidden message occupies no panel space. | Shared |
| T06 | Support refusal banner, nearby-foe reason, and remaining combat-recovery time. | Shown when restricted; retained. Clock updates without replacing dragged/focused controls. | Shared |
| T07 | Debuff names, stacks/severity, and expiry clocks. | Near hero; Options can move them to the upper corner or turn them off. Independent of screen effects. | Shared |
| T08 | Varied casts / Repeated casts progress and active timers above the existing combo area. | Contextual for relevant build conditions; no dedicated Options toggle. | Shared |
| T09 | Precise combo-condition wording in passive descriptions. | States sequence length, time window, and recheck behavior. No stat or node-position change. | Shared |
| T10 | “Stand still to talk” approach caption while a reachable service NPC waits for idle dwell. | On, code setting only. Does not change talk timing. | Shared |
| T11 | Nearby timed-chest search/approach caption. | On, code setting only; sight, proximity, hover, and partial search determine visibility. | Shared |
| T12 | Local site name, geographic level, completion/search progress, and bounded multi-line objective text. | On when relevant; no new saved toggle. Existing objectives also gain wrapping. | Seamless content; shared wrapping |
| T13 | Bearings for known contract destinations and return locations. | On, code setting only; directions do not reveal unexplored terrain. | Shared renderer; seamless place bindings |
| T14 | Garrison affiliation and formation-leader identity added to hover names. | NAMED admits these enemies as well as distinctly named enemies. Separate garrison/formation switches exist in code. | Shared |
| T15 | Buff/shrine pip hover card with actual modifier details, stacks, and clock. | On demand on hover; no persistent paragraph. | Shared |
| T16 | Equipment tooltip section for triggered effects and base values. | On inspection, including compact/full tooltip paths; not a combat caption. | Shared |
| T17 | Starting attributes use full names, a heading, and hover explanations in Mu/class selection. | On; replaces abbreviations and adds vertical space. | Shared |
| T18 | Small percentage values retain meaningful sub-percent precision. | Always; displayed numbers change, stats do not. | Shared |
| T19 | Recovered-support choice cards in Journal and Skills, with compatibility, descriptions, and fitting instructions. | Visible while a reward is pending; no independent toggle. Both views address the same reward. | Seamless rewards |
| T20 | Recovered-gem shortcut above the bag; Journal receipt after selection, with an Open Skills & inventory button. | Contextual; no independent toggle. Receipt records the grant, not continued ownership. | Seamless rewards |
| T21 | First-Memory invitation/glow in inventory/menu and clearer Memory-purpose labels in drops, bag, and Recall. | Contextual; no new player toggle. | Shared mechanisms; invitation uses exploration progress |
| T22 | Recall result offers View in bag for the exact remaining item and clears the old tooltip when opening Recall. | On demand; stale/missing items do not get an actionable shortcut. | Shared |
| T23 | Supports in stored skills section with recovery buttons and explanatory sentence. | Present when bag-owned skills contain supports. No need to seat the skill to recover a support. | Shared |
| T24 | Journal flask-preparation card, instructions, and direct empty-slot placement buttons. | Contextual; enabled in code. Card can appear in ordinary play too; new Mireille invitation is seamless-only. | Shared card; seamless invitation |
| T25 | Optional nearby-contract cards with objectives, rewards, and Accept contract buttons. | New expeditions use explicit Journal acceptance; older descriptors retain saved behavior. | Seamless policy |
| T26 | Journal/menu pips or lesson glows for offers, recovered gems, and Memory recall. | Contextual attention signals; no separate new player switches. | Shared menu machinery |
| T27 | Mireille preparation invitation, boundary reminder, and sanctuary guide toward the inn; authored future-work hints. | Contextual. Active contracts retain dialogue even if flask learning is unfinished. | Seamless additions |
| T28 | Roads tab with public destination accounts; surveyed physical map, home direction, signs, site levels, and searched-cache markers. | Available through map/Journal; written directions do not unveil terrain. | Seamless |
| T29 | Unreachable legacy campaign, bounty, travel, and Odyssey prompts suppressed or gated. | Active in seamless mode, whose old graph destinations are not integrated. | Seamless |
| T30 | Dialogue responses use a wrapping grid; menu tray stays inside the viewport on first open and resize. | Always; arrangement/access fixes. | Shared |
| T31 | Damage/resource/XP/reward notices gain collision-aware placements and bounded HUD space; zero-XP floats suppressed. | On; existing float-category switches still apply. | Shared |
| T32 | Level-up notices get their own announcement switch and move away from combat bodies. | On by default; separate from Experience Gains. | Shared |
| T33 | Ground reward labels gain stable spacing and source tethers; matching temporary announcements collapse. Labels yield during nearby combat. | On; layout/collapse switches in code. Only the exact currently drawn reward is deduplicated. | Shared |
| T34 | Health/cast bars can move to avoid overlap with owner tethers. Concealed bars respect occlusion. | **Fixed anchors by default**; crowd avoidance is an optional Visuals preference. Occlusion remains active. | Shared |
| T35 | World zoom slider independent of UI scale. | 100% retains established framing; saved Visuals preference. | Shared |
| T36 | Outline on native HUD status/objective/compass text. | On, code setting only; preserves text, font, and placement. | Shared |

Source groups: [panels](../../src/ui/panels.ts), [render configuration](../../src/render/vis/visConfig.ts), [saved settings](../../src/meta/settings.ts), [exploration cards](../../src/ui/explorationRewards.ts), [preparation card](../../src/ui/skillPreparation.ts), [contract cards](../../src/ui/questOffers.ts), [stored supports](../../src/ui/storedSupports.ts), [NPC dialogue](../../src/data/npcDialogues.ts), and [combo readouts](../../src/render/vis/comboConditionLayer.ts).

The largest remaining text-review candidates are T08, T10–T14, and T19–T27. This is a review priority, not a claim that each should be deleted. Reward selection and support recovery perform useful actions even if their surrounding instructions could be shortened or hidden.

## Animation, icons, scenery, and visual feedback

These remain in place. A visual cue can still merit a clutter review, but it is separate from a text caption.

| ID | Addition or adjustment | Scope / current behavior |
| --- | --- | --- |
| V01 | Body preparation, cast motion, attack follow-through, and settling. | Shared delivery-based presentation, with per-skill overrides; does not add a cast delay. |
| V02 | Articulated weapon/hand parts and matched Rogue blades. | Shared drawing; authored class/weapon silhouettes remain distinct. |
| V03 | Footfalls and articulated walking limbs across all registered player class looks, including Breaker. | Shared gait; post-collision voluntary movement drives animation. |
| V04 | Raised shield animation and visible guard coverage. | Reads the actual guard and arc; preserved with cast captions off. |
| V05 | Enemy role silhouettes and composite Stone Sentinel artwork. | Shared native looks used by new encounters. |
| V06 | Local-player corner/facing marker, nearby hostile body contrast, and clearer threat identification. | Shared, enabled through render configuration; adds visual emphasis. |
| V07 | Local melee preparation footprint and confirmed rear-hit cue. | Uses native reach/hit facts; does not increase attack reach. |
| V08 | Enlarged seated-player cast bar and frame around the slot actually owning the cast. | Shared, retained; captions can now be disabled independently. |
| V09 | Vector skill art across hotbar, rack, vendor, class, and Memory/Recall surfaces; support glyph fallback. | Shared motifs replace letter-based fallbacks. Coverage does not mean new skills were added. |
| V10 | More transparent empty hotbar slots. | Shared; hit areas and key labels remain. |
| V11 | Recipient-linked altar influence and measured healing/feeding visual transfers. | Actual recipients/restoration drive the effects. |
| V12 | Raised statue/monument faces and clearer landmarks. | Shared brushes with seamless compositions. |
| V13 | Layered conifer boughs and broadleaf crowns. | Shared brushes with seamless climate/ecology selection. |
| V14 | Worn walking trails and geographic surface detail. | Seamless terrain composition. |
| V15 | Climate-dependent vegetation, wet/frozen ground, native ground palettes, and water ripples. | Seamless placement; existing region effects remain active. |
| V16 | Lamps/spell light respect continuous terrain, walls, and Lastlight doors; night retains a readable floor. | Shared sight/light interfaces; code-controlled darkness floor. |
| V17 | Mired and Befuddled screen-effect motifs. | Ailment Screen Effects offers gentle/still/off, independently of debuff text. |

Sources: [body actions](../../src/engine/bodyAction.ts), [walking](../../src/engine/bodyWalk.ts), [player looks](../../src/data/playerBody.ts), [skill icons](../../src/render/skillIcons.ts), [render helpers](../../src/render/vis/), [terrain painting](../../src/worldmass/paint.ts), and [affliction cues](../../src/data/afflictionCues.ts).

## Gameplay, controls, and rewards

| ID | Actual behavioral change | Scope / distinction |
| --- | --- | --- |
| G01 | Newly held skill wins before an older held skill repeats. | Shared input arbitration; existing commitments keep their rules. |
| G02 | Movement request can take priority before an older held repeat. | Shared control response, not animation only. |
| G03 | Cleave permits movement at 35% during windup and follows live aim. | Real shared gameplay change. Other ordinary skills retain their authored commitment policy. |
| G04 | Behind-target blink lands behind the target's body heading. | Shared Shadow Step/delivery behavior; collision still governs landing. |
| G05 | Blocking/parrying stamps the native recent-block fact. | Shared fix for effects depending on a recent block. |
| G06 | Ranged AI seeks a usable firing lane around shot-blocking cover, including mixed kits. | Shared AI change; legal alternate actions retain normal selection. |
| G07 | Road Foragers receive encounter-owned melee commitment tuning. | Specific native recipe; unrelated packs keep their defaults. |
| G08 | Fraying Bonepicker courage uses a bounded hit-and-run band and finite panic recovery. | Shared species behavior, not just appearance. |
| G09 | Wilderness actors respect sanctuary and encounter territories; they walk home without a blanket heal/reset. | Seamless policy; authored relentless/leash rules retain priority. |
| G10 | Deliberately walking into eligible doors contributes to their native opening dwell; broader inn/waking-house entries. | Seamless door/plan policy, pinned into new expeditions. Older saved geometry remains unchanged. |
| G11 | Quiet, earned-clear caches can use a short search time. | Site-owned policy; hostile pressure and ordinary interaction still matter. |
| G12 | Passive puzzle props no longer continually prolong the combat-lull timer. | Shared rule for enrolled passive nodes; real enemies and prior combat heat still count. |
| G13 | Objective rewards share an explicit 40 + 30 × level XP curve; site completion snapshots its entitlement. | Native curve reused with new seamless completion sources; not a new global drop pool. |
| G14 | Exploration can earn a compatible support choice from a cache or owned puzzle. | Current new-expedition budget is **one total**, shared across triggers. Rolled payload and receipt persist. |
| G15 | Splash and Battering Ram are authored physical treasures in that offer pool without requiring unlocked random drops. | Usable this life; does not permanently unlock the support in the account pool. |
| G16 | Western Watch return quest and Northern Watch/Stone Sentinel follow-up. | First contract gives a ring choice; follow-up gives experience/passive point. Explicit acceptance for new descriptors. |
| G17 | Stored skill supports can be removed straight into the bag. | Shared action checks capacity, locks, ownership, and field discipline. |
| G18 | Journal preparation places carried flask Memories into empty skill slots. | Native learn action rechecks occupancy/requirements; no extra gifts or filled-slot replacement. |
| G19 | Reward context uses the slain enemy/site/geographic level inside the shared scene. | Seamless adapter avoids treating the expedition as one level; ordinary zone semantics remain. |

Sources: [skill ordering](../../src/engine/skillInputOrder.ts), [Cleave and skills](../../src/data/skills.ts), [cast aim](../../src/engine/castAim.ts), [AI](../../src/engine/ai.ts), [encounter recipes](../../src/data/encounterGroups.ts), [world actions](../../src/engine/world.ts), [rewards](../../src/worldmass/rewards.ts), and [frontier quests](../../src/quests/frontier.ts).

## Continuous-world foundation and content

| ID | Added capability | Boundary or qualification |
| --- | --- | --- |
| W01 | Deterministic geographic addresses, named random streams, surface recipes, stable place identities, and attributed terrain changes. | Foundation for continuous terrain; not a migrated campaign. |
| W02 | Budgeted terrain sampling, bounded resident page caches, atomic publication, regeneration from seed plus saved changes. | Terrain residency is bounded; full distant-actor dormancy remains unfinished. |
| W03 | Continuous walk/path/sight/projectile queries over the same terrain; region effects and grounded telegraphs. | Native combat stays in one World across page boundaries. |
| W04 | Original Lastlight embedded in the scene, with rooms, tiers, doors, residents, account-owned counters, and bedside return. | Town pinned for the expedition; new account-owned construction appears on a new run. |
| W05 | Seeded opening roads, connecting links, detours, and recognizable destinations. | Finite opening circuit, not a global inter-settlement network. |
| W06 | Cinderwatch Camp, Broken Gate, Memorial Grove, Fallen Court, Stoneward, and additional roadside destinations. | Compositions of native scenery, enemies, fixtures, caches, and existing systems. |
| W07 | Repeating camps, ruins, country outposts, climate populations, and roadside encounters. | Source-owned consequences persist; content draws heavily on existing registries. |
| W08 | Distance-based levels, regional danger, and native level-appropriate populations. | Current country ceiling level 24; pursuing enemies do not automatically scale to the hero. |
| W09 | Native garrisons, named victories, formations, Stone Sentinel guardian, Road Foragers, and Silent Caravan roster. | Reuses native attacks, morale, healing, rewards, and membership; reserves guardian slots correctly. |
| W10 | Native altar fields, localized storms, and persistent one-use shrines. | Placement, recipients, levels, and consumption checkpointed. |
| W11 | Persistent crystal riddles, ember rings, and Paired Stones/twin-accord puzzles. | Native rules with saved state/clocks; populations reserve space before admission. |
| W12 | Climate scenery with stable clustering, clear paths, felling/removal/regrowth, and native palettes. | Scenery near retained actors can exceed the terrain-page budget. |
| W13 | Coarse sight-based survey, discovered places, map-label collision handling, home direction, and public town signs. | Directions do not survey terrain; old descriptors retain older discovery policy. |
| W14 | Seeded selection of suitable continental origin for the starting neighborhood. | Bounded samples; does not repaint terrain or reroll the seed. |
| W15 | Native birth variants and deterministic saved-place populations. | Resume preserves pinned roster/geometry and relevant wounds/consequences. |
| W16 | Versioned expedition descriptor/state for terrain, sites, identities, loot, quests, caches, shrines, puzzles, and choices. | Not a complete serialization of every cooldown, threat entry, buff, or transient child. |
| W17 | Scoped terrain invalidation, offscreen floor prewarming, foreground priority, and time/work allowance. | Reduces redundant bakes; cold visible jumps can still bake synchronously. No universal FPS guarantee established. |
| W18 | Travel/service/quest adapters gate unavailable legacy destinations. | Legacy campaign, full co-op integration, caves/interior transit, global road/river/bridge systems, and full long-run paging remain unfinished. |

The [foundation contract](seamless-world-foundation.md) includes implementation boundaries. [Expedition configuration](../../src/worldmass/preset.ts) defines what new runs receive; Continue keeps the saved descriptor. Reverting a rendering change does not require discarding these world systems.

## Build, save isolation, and verification tooling

| ID | Difference | Player impact |
| --- | --- | --- |
| I01 | Separate seamless browser profile, build flags, scoped browser storage, and disabled shared disk-save endpoints. | Preview accounts, characters, settings, workshop, atlas, and developer preferences isolated from ordinary saves. |
| I02 | Worldmass save fields, validation, schema evolution, and rejection of unsupported newer descriptors. | Some old-client comparisons intentionally refuse newer data instead of losing it silently. |
| I03 | Co-op snapshot fields for body poses, guard/reach cues, status clocks, combo conditions, and reward identity. | Shared presentation uses host facts; seamless co-op is not complete. |
| I04 | Reusable playtest client, validated scripted inputs, recorded frame/world time, and viewport guard. | Development tools, not player UI. |
| I05 | Engine probes, controlled browser harnesses, generation checks, screenshot comparisons, and Save/Continue checks. | Scaffolding accounts for much of the file/commit count. Passing tests do not establish that added UI is desirable. |
| I06 | Preview publishing notes and source documentation. | Pages orchestration is shared main-side infrastructure; this audit is not proof of a live published revision. |

Sources: [build profile](../../src/buildProfile.ts), [persistence](../../src/meta/persistence.ts), [snapshots](../../src/net/snapshot.ts), [scripted input](../../src/core/scriptedInput.ts), and balance/docs rows in the file inventory.

## Starting builds and the Vault: what was and was not changed

Classes, supports, account starter definitions, Vault unlocks, Memory unlocks/configuration, and workshop skills are identical across the compared tips. Skill-definition changes are artwork annotations plus Cleave's movement/live-aim behavior. This branch did not add a batch of skills/supports, rebalance Vault costs, or redesign unlock milestones.

| Fresh-account starting kit | Equipped combat skills |
| --- | --- |
| Warrior | Cleave, Shield Up, War Cry |
| Magician | Firebolt, Frost Nova, Chain Lightning |
| Rogue | Backstab, Cloak, Shadow Step |

The account's starter skill drop set is the union of those nine skills. Its starter support set is **Arcing, Splitting, Piercing, Concentrated Power, Deadly Precision, and Slow Burn**. Starting drop eligibility is not guaranteed possession; flask gifts, account purchases, Memory rules, and authored treasures are separate sources.

New exploration offers those starter supports plus **Splash** and **Battering Ram**, filtered for an equipped eligible skill with an open socket. It reserves **one level-1 support selection per new expedition**, earned by a qualifying cache or puzzle, not one per site. The two authored treasures do not unlock future random drops. This is a modest early choice route, not broad progression design.

The inherited Vault retains its class bundles, skills/support purchases, costs, and deed gates. The account Vault becomes available after a real death, not merely after the prologue. Several pool unlocks refer to legacy destination deeds, such as ruin/vault/manor entry. The continuous prototype does not map all those destinations into its geography, so progression work must trace which unlocks can actually be earned here. The account Vault and the Hollow Vault dungeon/deed are different things.

An inherited all-gems debug purchase is gated by existing debug configuration. It is not evidence of a designed player unlock ladder and was not introduced by this branch.

**Inference to test:** a narrow early eligible pool, uneven compatibility with starter kits, and only one authored choice can constrain early variety. This audit establishes those constraints; it does not establish them as the sole cause of playtest impressions. It also cannot establish whether a reviewer looked at the Vault informally. The progression definitions were not redesigned here.

A useful next gameplay pass would:

1. Map each starter kit's meaningful early skill/support choices, actual compatibility, and acquisition rate.
2. Expand choices that change how a build plays, with distinct melee, projectile, area, defensive, and utility routes.
3. Decide which alternatives start available, appear as temporary treasures, or remain durable Vault pursuits.
4. Connect unlock deeds/costs to reachable seamless activities and a reason to return to the Vault.
5. Compare fresh-account runs with early-purchase accounts, judging differences through play and effects.

This is proposed scope for a subsequent design/content pass. No starting pool, Vault purchase, cost, or unlock gate changes with this audit.

Evidence: [starter account definitions](../../src/meta/account.ts), [class kits](../../src/data/classes.ts), [supports](../../src/data/supports.ts), [Vault unlocks](../../src/meta/unlocks.ts), [Memory unlock configuration](../../src/data/memoryUnlocks.ts), [expedition policy](../../src/worldmass/preset.ts), and [reward eligibility](../../src/worldmass/rewards.ts).

## Main-only work absent from seamless

These 11 commits are predominantly skill showcase, capture/agent/director tooling, and website film presentation. Their absence is not a deliberate seamless gameplay-UI rollback.

| # | Commit | Original change description |
| ---: | --- | --- |
| 1 | [b48de9c6](https://github.com/arianna-arpg/arpg-game-world/commit/b48de9c6aaef86d7fcb6cff0114c9506d7c96637) | Frame clips by what a skill reaches, not by its AI range |
| 2 | [ae84ee15](https://github.com/arianna-arpg/arpg-game-world/commit/ae84ee151ee1a21fe8185b8e762a3d5e66293db2) | Re-cut the announcement film: one centered title over the mark |
| 3 | [187eb92e](https://github.com/arianna-arpg/arpg-game-world/commit/187eb92ef7d78cc81a624cf8a94af4cfb25fac08) | Add the skill showcase: live in-game skill stages any surface can ask for |
| 4 | [cd3d6647](https://github.com/arianna-arpg/arpg-game-world/commit/cd3d664719d30afc1dad34adcd0b56409c9b494a) | Feed Heave and Invocation their showcase preps, aimed at the target |
| 5 | [06657a58](https://github.com/arianna-arpg/arpg-game-world/commit/06657a58865a2626ebb313bb0f6c398c65e2f057) | Ship the skill clips: every player skill filmed, one archive on site-media |
| 6 | [f7d34498](https://github.com/arianna-arpg/arpg-game-world/commit/f7d3449815c993cfa30dd0aef33cfdd0c7893f7a) | Publish the third announcement trailer and archive the previous cut |
| 7 | [fd585fee](https://github.com/arianna-arpg/arpg-game-world/commit/fd585fee4905d0343a8d9316589a39dd10ecb952) | Add the gameplay agent and the capture director |
| 8 | [6328a043](https://github.com/arianna-arpg/arpg-game-world/commit/6328a043e4152bed075d5fbc091384fee10f5e5f) | Hold the site's films in the mind's eye: a living rim melts the picture's edge |
| 9 | [2d84f004](https://github.com/arianna-arpg/arpg-game-world/commit/2d84f004f890a8c5162ceca3bf66b173e5d7a2a6) | Make the mind's eye the theater's own, with a taller window and captions with sound |
| 10 | [e3a644ee](https://github.com/arianna-arpg/arpg-game-world/commit/e3a644eee0276d4d2e67a8f87e77a9877f961f5e) | Let the mind's eye follow the film's framing through the title card |
| 11 | [bc8a0e0a](https://github.com/arianna-arpg/arpg-game-world/commit/bc8a0e0a9211815d99dcf0ea389e451157c0684d) | Let the shatter's light settle with the last glass so the break ends on the page |

The associated 40 changed paths include showcase stages, agent/director modules, capture scripts, site cinema/theater code and narration/manifest assets, plus shared entry-point wiring, renderer/bake helpers, UI wiring, probes, and documentation. They are attributed to main in the file inventory. A future merge should consider them independently of gameplay HUD decisions.

## Current review choices

- **Already corrected:** original passive graph default, independent optional passive lists, fixed meter anchors, optional Feet planted caption, independently controlled debuff text, and now optional cast-name/support-ready captions.
- **Preserved for review:** animation, vector icons, environment art, world content, gameplay fixes, and remaining contextual UI. Listing them does not recommend keeping every one.
- **Next UI decisions:** use the T identifiers to choose remaining captions, progress readouts, cards, and instructions to make optional, reduce, or remove.
- **Next progression decisions:** evaluate starter breadth and the reachable Vault unlock path separately.
- **Deferred as requested:** passive node layout and readability redesign.

## Verification of the two accompanying preference changes

All three type checks pass. Cast-movement and field-discipline probes pass. A controlled native-client check exercises all four cast-name/Feet planted combinations, preserved owner-slot/progress rendering, narrow bounds, support refusal/countdown and expiry, stable controls, actual Options clicks, saved preferences, native Save/Continue, omitted-field migration, and isolation from six ordinary-save sentinel keys. The existing cast-readout harness passes with historical captions explicitly enabled.

These checks establish behavior and persistence. They do not substitute for the player's judgment of minimalism or an earned gameplay/Vault playthrough.

## Complete seamless-only commit history

All 139 exclusive commits, oldest first. Subjects are the original Git subjects; earlier defaults and intermediate behavior may be superseded. The current-state tables above take precedence.

| # | Commit | Original change description |
| ---: | --- | --- |
| 1 | [931850e2](https://github.com/arianna-arpg/arpg-game-world/commit/931850e21b0b9d061cd3f8fafe1dce5b092e5eec) | Define a terrain-first foundation for seamless exploration |
| 2 | [0c102a4d](https://github.com/arianna-arpg/arpg-game-world/commit/0c102a4df4e78838f77f6c006da6a3b157b262f5) | Add deterministic worldmass addresses, terrain and bounded streaming |
| 3 | [f4d1f4b1](https://github.com/arianna-arpg/arpg-game-world/commit/f4d1f4b1db104423b9b2774f685bbf94d5abb4a0) | Connect worldmass exploration to native combat, terrain and saves |
| 4 | [46957b79](https://github.com/arianna-arpg/arpg-game-world/commit/46957b798e9f8441b550d12c5dc248a444680e06) | Isolate browser preview saves and default to seamless exploration |
| 5 | [6fdeb53d](https://github.com/arianna-arpg/arpg-game-world/commit/6fdeb53d9ac75bebf87bfc3459eca1cc20561c91) | Keep branch publishing aligned with the separate Pages preview |
| 6 | [c37afb8e](https://github.com/arianna-arpg/arpg-game-world/commit/c37afb8ed1f0cff0229b786b69246feb7989a773) | Synchronize visibility frames and wall-contact queries |
| 7 | [321e112d](https://github.com/arianna-arpg/arpg-game-world/commit/321e112d120d216a3dd938ae55864b0734ba35dc) | Document persistent shared-world lifecycle boundaries |
| 8 | [940138f4](https://github.com/arianna-arpg/arpg-game-world/commit/940138f417dee60dd293870cae0560d0c439732e) | Merge main visibility repair and shared content updates |
| 9 | [8adb03d3](https://github.com/arianna-arpg/arpg-game-world/commit/8adb03d3156e9c1eafb398e78953cbd7454e77a1) | Add persistent native camps and ruins to seamless expeditions |
| 10 | [6ae261d3](https://github.com/arianna-arpg/arpg-game-world/commit/6ae261d3fc205eb316ddae11f13109b093f52e8e) | Embed native Lastlight in the continuous world |
| 11 | [3cc442c5](https://github.com/arianna-arpg/arpg-game-world/commit/3cc442c5bc3c09aef5c19070267b28fbdebb5466) | Add geographic encounter progression to seamless expeditions |
| 12 | [3daa72ca](https://github.com/arianna-arpg/arpg-game-world/commit/3daa72cabe3352d844b1a3554028d0badd9dc6b8) | Build connected frontier journeys with native landmarks and encounters |
| 13 | [c8d65912](https://github.com/arianna-arpg/arpg-game-world/commit/c8d65912a1bb6588f5554dec5ec7979d665a269f) | Refine frontier opening encounters and native reward invitations |
| 14 | [8fdfe2f7](https://github.com/arianna-arpg/arpg-game-world/commit/8fdfe2f7bd92eb483e912e0c8770242d991efa02) | Make first frontier discoveries offer compatible native supports |
| 15 | [63629062](https://github.com/arianna-arpg/arpg-game-world/commit/63629062f2541d222d42c016d2f409742cb891ea) | Explain socket restrictions and honor continuous town sanctuary |
| 16 | [bc4a23ed](https://github.com/arianna-arpg/arpg-game-world/commit/bc4a23edf4dcd333f5f318f51ce558fddd9d80c6) | Keep resource feedback clear of active combat |
| 17 | [9d583412](https://github.com/arianna-arpg/arpg-game-world/commit/9d5834123a5ff813a1a9d8b302759f6b721001b2) | Preserve native random sequence when moving discovery feedback |
| 18 | [6d94d0c0](https://github.com/arianna-arpg/arpg-game-world/commit/6d94d0c0f9bbfc0f029dadefc33621aca476edc1) | Make native build choices and frontier landmarks easier to read |
| 19 | [d03c96e2](https://github.com/arianna-arpg/arpg-game-world/commit/d03c96e287d408fbd3d26fdcdd232fa361ec7325) | Give frontier landmarks native fields and retain build feedback |
| 20 | [f0b80e84](https://github.com/arianna-arpg/arpg-game-world/commit/f0b80e8411b29ac531b954d0a20e08f72adc7989) | Keep combat meters attributable and show actual altar recovery |
| 21 | [73d1e77d](https://github.com/arianna-arpg/arpg-game-world/commit/73d1e77d84c8222e3591d78658a3b22b4555d52b) | Capture current combat frames and record review benchmarks |
| 22 | [9a288d5a](https://github.com/arianna-arpg/arpg-game-world/commit/9a288d5a4124264bfe5649153eaba52f6df88114) | Give raised monuments readable surfaces without clearing their shadows |
| 23 | [f5d97162](https://github.com/arianna-arpg/arpg-game-world/commit/f5d97162066fa210abfce5c508b8b63a65af36fd) | Keep nearby threats and hovered names readable in crowded fights |
| 24 | [b5c6960c](https://github.com/arianna-arpg/arpg-game-world/commit/b5c6960cdbc80e0618d5a3511ab2bf2d290314a6) | Give native attacks configurable body preparation and follow-through |
| 25 | [2f886fef](https://github.com/arianna-arpg/arpg-game-world/commit/2f886fef94d40f23287ade776c2f1b2c6fd03586) | Articulate native weapon parts through the actual attack clock |
| 26 | [5e500269](https://github.com/arianna-arpg/arpg-game-world/commit/5e50026916240b6dd546a1d30f1b438855a8e8b8) | Articulate paired Rogue blades while preserving neutral portraits |
| 27 | [47452701](https://github.com/arianna-arpg/arpg-game-world/commit/474527016e67087f349c2d1112957a1396f0ea93) | Protect continuous Lastlight services from wilderness combat |
| 28 | [4cdaf9ca](https://github.com/arianna-arpg/arpg-game-world/commit/4cdaf9cab3d3ff155b249939c5c11121c99e3542) | Make rear-target blinks follow the victim's body heading |
| 29 | [d525526a](https://github.com/arianna-arpg/arpg-game-world/commit/d525526ad9fb40ecd93309aeeaf3a750a783a669) | Reward native landmark clearance through saved objective rules |
| 30 | [d52ec48c](https://github.com/arianna-arpg/arpg-game-world/commit/d52ec48c896d556be46ed7a17d5abe2314cb856b) | Reserve eligible guardians in reward-bearing landmark populations |
| 31 | [13d85fbb](https://github.com/arianna-arpg/arpg-game-world/commit/13d85fbb851f52dd3823be75a107bfa8f3d6826b) | Settle pending landmark rewards after saved vitals restore |
| 32 | [e7444dfb](https://github.com/arianna-arpg/arpg-game-world/commit/e7444dfb44e6a6c8d67346de7886af78ca6a21b6) | Use native vessel selection for fresh seamless expeditions |
| 33 | [4e6263de](https://github.com/arianna-arpg/arpg-game-world/commit/4e6263dece2f6e0751968f335c055ae9f01faf28) | Allow configured settlement doors to open under deliberate walking |
| 34 | [d2a6ff5b](https://github.com/arianna-arpg/arpg-game-world/commit/d2a6ff5b409f85b2b523df9128436ab2a52a0bb2) | Keep native enemy birth variants stable through Continue |
| 35 | [f1f0e9c5](https://github.com/arianna-arpg/arpg-game-world/commit/f1f0e9c5b4ef2f24ef39d5be991b13a60a3e7751) | Extend the frontier to a native Stoneward guardian and preserve its home |
| 36 | [9acc9b53](https://github.com/arianna-arpg/arpg-game-world/commit/9acc9b5329e3586f331dd7e1c17674d5f29b6acf) | Name garrison victories without implying the country is safe |
| 37 | [8beb7ea8](https://github.com/arianna-arpg/arpg-game-world/commit/8beb7ea8334bdb82e8640ea08080c795aa06246a) | Activate block-recency passives after native guards and parries |
| 38 | [eb23b802](https://github.com/arianna-arpg/arpg-game-world/commit/eb23b8023e0512d13418dc60c08296b7fb56d0e7) | Show native altar influence on its actual recipients |
| 39 | [f6ea6d43](https://github.com/arianna-arpg/arpg-game-world/commit/f6ea6d436ce5a2300e5792be951a0c13e0bb8dc0) | Compose native placed defenders into persistent garrisons |
| 40 | [dcaea5a0](https://github.com/arianna-arpg/arpg-game-world/commit/dcaea5a0a1485ee399bf9be072a686d1aaa6207d) | Validate scripted input before advancing native play |
| 41 | [8bef7dfe](https://github.com/arianna-arpg/arpg-game-world/commit/8bef7dfe20ff4f46a3e5244d28c108fface55b62) | Draw shield coverage from native interception geometry |
| 42 | [f6a8b1ca](https://github.com/arianna-arpg/arpg-game-world/commit/f6a8b1caed65fa59d30ef6951e48e177969810be) | Add isolated ordinary-input gameplay review sessions |
| 43 | [3ed1f0aa](https://github.com/arianna-arpg/arpg-game-world/commit/3ed1f0aab5c55aeca78811e65b6689ddee372106) | Keep cache reward receipts with a direct Skills handoff |
| 44 | [52fd4442](https://github.com/arianna-arpg/arpg-game-world/commit/52fd444215201d89a1bc330bad468c88385b818e) | Bring native Gathering Storm fields into seamless encounters |
| 45 | [935aa893](https://github.com/arianna-arpg/arpg-game-world/commit/935aa89375161acb401e690b148ed54f43e98374) | Put recovered gem choices beside native Skills and inventory |
| 46 | [06937ad7](https://github.com/arianna-arpg/arpg-game-world/commit/06937ad75ad3148c5a486c69316a6355235ceb21) | Separate nearby threat silhouettes from dark scenery |
| 47 | [33f6c4b8](https://github.com/arianna-arpg/arpg-game-world/commit/33f6c4b819977f0add8b2107c8fe9bb568316760) | Conceal overhead meters with their native cover admission |
| 48 | [509e74be](https://github.com/arianna-arpg/arpg-game-world/commit/509e74be3d4e2c671c50b4f135ce127e72b83218) | Honor newer held skills before repeating older actions |
| 49 | [63e8572d](https://github.com/arianna-arpg/arpg-game-world/commit/63e8572dd2d22e958039ce2142a026a592dafe69) | Keep simultaneous reward announcements separately readable |
| 50 | [ab3a244f](https://github.com/arianna-arpg/arpg-game-world/commit/ab3a244f3db53ca230d667362548b8e6db625b05) | Add persistent route detours with native roadside encounters |
| 51 | [ce7c4889](https://github.com/arianna-arpg/arpg-game-world/commit/ce7c4889fb88d7075a98b1809962a7a15c001aa2) | Give conifer crowns seeded needle-bough detail |
| 52 | [7546ba2f](https://github.com/arianna-arpg/arpg-game-world/commit/7546ba2f855b729388bec25f231e288abb2472d4) | Give saved frontier roads continuous seeded surface wear |
| 53 | [a9db1398](https://github.com/arianna-arpg/arpg-game-world/commit/a9db13981da7757b83f0f5066456b000023f7db5) | Show native held guards as raised shield faces |
| 54 | [c63d5461](https://github.com/arianna-arpg/arpg-game-world/commit/c63d5461561d301999a4de68dfdca49c54383803) | Add saved climate families with native tundra and wetland terrain |
| 55 | [58cb3958](https://github.com/arianna-arpg/arpg-game-world/commit/58cb3958e64e31326be68242b798fb3805204bd5) | Make frozen and wet terrain readable through geographic surface detail |
| 56 | [236606d2](https://github.com/arianna-arpg/arpg-game-world/commit/236606d2e1d80ad31cc7f57c12f1354eb903e7e5) | Expose saved world zoom and clarify the frontier inn invitation |
| 57 | [c94844f5](https://github.com/arianna-arpg/arpg-game-world/commit/c94844f58cae7a75394c2c4e1cd4433225021cb5) | Exercise projectile culling through the saved zoom getter |
| 58 | [3f028952](https://github.com/arianna-arpg/arpg-game-world/commit/3f028952cb90a8e1a3f2edd51c01303519cd7f75) | Give frontier encounters saved native pursuit territories |
| 59 | [066fd1ce](https://github.com/arianna-arpg/arpg-game-world/commit/066fd1ce8fc6e359b6ea4ea0b062f7fa6de19bd7) | Leave the battlefield visible through unassigned hotbar slots |
| 60 | [9c08057b](https://github.com/arianna-arpg/arpg-game-world/commit/9c08057bf296d0531b74b0340634dd02e03f1457) | Give broadleaf trees seeded foliage and irregular crowns |
| 61 | [a967559b](https://github.com/arianna-arpg/arpg-game-world/commit/a967559ba09b3279dbdf78ab13d3596efb9045db) | Carry saved native encounter formations into the wider country |
| 62 | [0f7f8a12](https://github.com/arianna-arpg/arpg-game-world/commit/0f7f8a128c20cc33ba3ec7dda6ada3f576fb4035) | Clarify starter and frontier role silhouettes with native body parts |
| 63 | [44bbc33a](https://github.com/arianna-arpg/arpg-game-world/commit/44bbc33a104f7fad51cf0832b3aaa57e1c1b77c9) | Let a newly requested walk precede older held attack repeats |
| 64 | [0676a8b8](https://github.com/arianna-arpg/arpg-game-world/commit/0676a8b84e1c103ead5a5a4f4d74670837b14bc2) | Animate optional body anatomy from actual native walking |
| 65 | [8b200e7c](https://github.com/arianna-arpg/arpg-game-world/commit/8b200e7cd50e00fdd39d4df690f7bd4fedf4be56) | Extend procedural country with persistent shared native fields |
| 66 | [9ed8e8d5](https://github.com/arianna-arpg/arpg-game-world/commit/9ed8e8d554269435798358295ae95f2822e1b6eb) | Keep the menu inside the viewport from its first opening |
| 67 | [b7a33cb2](https://github.com/arianna-arpg/arpg-game-world/commit/b7a33cb206c1d36d7bd1ab7672ccb351037aa2f2) | Open earned exploration caches quickly when nearby combat is quiet |
| 68 | [6e6c4397](https://github.com/arianna-arpg/arpg-game-world/commit/6e6c4397ebaa2bc74d38a14534bb7f2e21d5c1ad) | Suppress empty experience notices without changing native rewards |
| 69 | [3422e597](https://github.com/arianna-arpg/arpg-game-world/commit/3422e59735d9eeb5c33edac61ae83574656503cf) | Add geographic water ripples to the physical surface vocabulary |
| 70 | [b368f595](https://github.com/arianna-arpg/arpg-game-world/commit/b368f59519214c7448a0e827debdbc6848d769ba) | Share configurable skill faces across the hotbar and build inventory |
| 71 | [a53517cf](https://github.com/arianna-arpg/arpg-game-world/commit/a53517cf52d80bcec7787567b255aabf245e4af0) | Show native melee reach and confirm landed rear strikes |
| 72 | [5f53030c](https://github.com/arianna-arpg/arpg-game-world/commit/5f53030c227c612fd015fa34123526bce5d4419f) | Offer native splash and knockback treasures in new expeditions |
| 73 | [b1bb4346](https://github.com/arianna-arpg/arpg-game-world/commit/b1bb43463b7b42cff167d911ad3173f6090d5619) | Map native town signs and preserve their scenery across Continue |
| 74 | [4c3b4bfd](https://github.com/arianna-arpg/arpg-game-world/commit/4c3b4bfd31f14c34c6775d09074b46757ae1ddd4) | Keep frontier work within reachable geography |
| 75 | [e004f21f](https://github.com/arianna-arpg/arpg-game-world/commit/e004f21f3adbf2b9b85c497d9791e46579aacdfc) | Give native sentinels assembled moving bodies |
| 76 | [7ad32cd3](https://github.com/arianna-arpg/arpg-game-world/commit/7ad32cd3e8ac907cab2f949a267ea939c7817f99) | Show durable local expedition progress in the existing HUD |
| 77 | [adac7f87](https://github.com/arianna-arpg/arpg-game-world/commit/adac7f87a2e859107c94dbe97d44e78e73ebc125) | Reopen ranged firing lanes using native shot occlusion |
| 78 | [07630d7e](https://github.com/arianna-arpg/arpg-game-world/commit/07630d7eb9de87a31e3015a39f8bfbc3b2e47417) | Preserve native ground palettes across continuous geography |
| 79 | [ab8beefe](https://github.com/arianna-arpg/arpg-game-world/commit/ab8beefe1c6d275a41f963c715f13bd70fdbb773) | Bind native return quests to seamless-world places |
| 80 | [5d831674](https://github.com/arianna-arpg/arpg-game-world/commit/5d8316742c71156c298bea6b45d9356723d74d9e) | Identify active player casts and their owning controls |
| 81 | [90cb5f9e](https://github.com/arianna-arpg/arpg-game-world/commit/90cb5f9e3d7cf42cec283e28ffcb9d17fd3e8d7c) | Show native base benefits in quest reward choices |
| 82 | [1e8bfe15](https://github.com/arianna-arpg/arpg-game-world/commit/1e8bfe15b02fecea4f012e858014d7e9fc5a6f0e) | Bind chained contracts to original native guardians |
| 83 | [b53fe911](https://github.com/arianna-arpg/arpg-game-world/commit/b53fe91105c5d6df340650b2be8ec1057829bc51) | Keep world announcements within the available HUD space |
| 84 | [4580bad2](https://github.com/arianna-arpg/arpg-game-world/commit/4580bad28d12ab0ae3e02e3991ecf655015416d3) | Preserve native service teaching alongside place contracts |
| 85 | [050423cd](https://github.com/arianna-arpg/arpg-game-world/commit/050423cd56c2a8f492174586d6824bb8f32907fc) | Keep known contract bearings visible during continuous travel |
| 86 | [9fbaa0ee](https://github.com/arianna-arpg/arpg-game-world/commit/9fbaa0ee0b3fa22e6e74d36fb7b6c5fa55c5d855) | Preserve native one-use shrines across continuous expeditions |
| 87 | [d2321fd8](https://github.com/arianna-arpg/arpg-game-world/commit/d2321fd88a4f1c8d529234287f0963c3c0adbe02) | Keep discovered survey names readable around their map markers |
| 88 | [04e4c6dd](https://github.com/arianna-arpg/arpg-game-world/commit/04e4c6dd29d67c0574e146120e6b1ea46865b4e0) | Carry native garrison completion into repeated country outposts |
| 89 | [d769d767](https://github.com/arianna-arpg/arpg-game-world/commit/d769d767835caddbc40d3bb1fec940b194a59e48) | Keep country kills from revealing unreachable campaign leads |
| 90 | [95efa982](https://github.com/arianna-arpg/arpg-game-world/commit/95efa98208554a253d5a66df61012f510cc62937) | Name active afflictions with native clocks and shared severity |
| 91 | [32274184](https://github.com/arianna-arpg/arpg-game-world/commit/32274184f2d484b3b03225908188455aa1cd7d5d) | Keep native level celebrations clear of combat bodies |
| 92 | [cba25373](https://github.com/arianna-arpg/arpg-game-world/commit/cba2537350cbcaa400992537d98dc8c38f7233cf) | Explain future contract availability through native giver prompts |
| 93 | [47e0483e](https://github.com/arianna-arpg/arpg-game-world/commit/47e0483e69eb454b35718f10b112d7b262957541) | Describe native shrine and temporary buff modifiers on hover |
| 94 | [34ae81a6](https://github.com/arianna-arpg/arpg-game-world/commit/34ae81a6979fd70f3ee3a874ce69524602ee1c04) | feat(worldmass): seed native encounters along connected roads |
| 95 | [dd82f330](https://github.com/arianna-arpg/arpg-game-world/commit/dd82f3303b91fc0aee87f649d6635f8503730c6f) | fix(render): space simultaneous resource and XP notices |
| 96 | [9ea839ba](https://github.com/arianna-arpg/arpg-game-world/commit/9ea839ba2cf9dcbb71ea48c76ff5f458241369bf) | fix(render): preserve visible combat reads through night lighting |
| 97 | [cb302916](https://github.com/arianna-arpg/arpg-game-world/commit/cb302916efddd4d3b3cfcc6744689ea4325b3971) | feat(worldmass): preserve native crystal riddles across continuous travel |
| 98 | [a1121932](https://github.com/arianna-arpg/arpg-game-world/commit/a1121932bebefd78ee4d1ee973dbc6b7c9d77c94) | feat(ui): show native cast-condition progress and active timers |
| 99 | [3746ff37](https://github.com/arianna-arpg/arpg-game-world/commit/3746ff37c62bc849d0e86580c791bcc29afbef84) | fix(ui): clarify support readiness and native passive timing |
| 100 | [c8236dc5](https://github.com/arianna-arpg/arpg-game-world/commit/c8236dc550df36085bcdc3c5339fece6ba117246) | feat(worldmass): guide optional Lastlight preparation through native lessons |
| 101 | [bf0289bc](https://github.com/arianna-arpg/arpg-game-world/commit/bf0289bc1f0a34522794c98da7a234ff18214329) | feat(worldmass): expose run-owned road choices in the map book |
| 102 | [2e0954d7](https://github.com/arianna-arpg/arpg-game-world/commit/2e0954d7d82121c3eba51716aab6c7926f3c375d) | feat(skills): recover supports directly from stored skill copies |
| 103 | [fbfd6e1d](https://github.com/arianna-arpg/arpg-game-world/commit/fbfd6e1d7cb87dd8c5f8de99bd60e5dba3e3ec9d) | feat(worldmass): identify discovered garrison members on hover |
| 104 | [0328cf69](https://github.com/arianna-arpg/arpg-game-world/commit/0328cf69db8e4d3733df7b165ddbd2a8fbd1c786) | feat(worldmass): choose continental ground for new settlements |
| 105 | [ea310a0a](https://github.com/arianna-arpg/arpg-game-world/commit/ea310a0abf4fc7a8efbc8a98220eb480c6397871) | feat(worldmass): survey visible terrain through native sight |
| 106 | [c02369d8](https://github.com/arianna-arpg/arpg-game-world/commit/c02369d8ba2a42d124e4f3b8e90356d060d21251) | feat(render): explain movement held during native casts |
| 107 | [72f0a20f](https://github.com/arianna-arpg/arpg-game-world/commit/72f0a20f564e5b760f55ae114b93ab2b23ba35ec) | feat(worldmass): preserve native timed ember riddles |
| 108 | [56ff8170](https://github.com/arianna-arpg/arpg-game-world/commit/56ff8170e0b12c0500287b1931f9e15cc486b6a3) | feat(render): explain native cache search proximity |
| 109 | [efe0fcad](https://github.com/arianna-arpg/arpg-game-world/commit/efe0fcad55d7e3fe4c41d6ddd08676d084ba624b) | feat(worldmass): let players choose nearby native contracts |
| 110 | [bc76a923](https://github.com/arianna-arpg/arpg-game-world/commit/bc76a92384fb9296ac42bf7f59a32b0e7e79ef92) | feat(worldmass): preserve broader native settlement doorways |
| 111 | [b6c803db](https://github.com/arianna-arpg/arpg-game-world/commit/b6c803db5302cd610fe96b823e5312eb8469fdab) | feat(worldmass): reward native riddles with compatible skill choices |
| 112 | [26013b7f](https://github.com/arianna-arpg/arpg-game-world/commit/26013b7fc896b1d0081cbef91cafc9f827bab8cb) | feat(items): explain native triggered effects on equipment cards |
| 113 | [e42f61a6](https://github.com/arianna-arpg/arpg-game-world/commit/e42f61a65184f13a2fc2c0bb73e345fed356dd9b) | feat(memories): connect discovered stones to their revealed gems |
| 114 | [6ec85a39](https://github.com/arianna-arpg/arpg-game-world/commit/6ec85a393c1f3cefcfa3ed202bbe53be7b2c6868) | feat(worldmass): add paired-stone riddles and reserve opening activities |
| 115 | [e91c2fc4](https://github.com/arianna-arpg/arpg-game-world/commit/e91c2fc41a436f4577e8876e40af1bd59edc1067) | fix(puzzles): keep quiet riddle hits out of combat recovery |
| 116 | [c6b74869](https://github.com/arianna-arpg/arpg-game-world/commit/c6b748692a36aa24e51f7eb5118695e244b8534d) | fix(hud): wrap objective instructions in narrow browser panels |
| 117 | [6634f8ca](https://github.com/arianna-arpg/arpg-game-world/commit/6634f8ca219912a2195b7a77c0fdef79f13ed2b1) | feat(worldmass): stage a native patrol at Cinderwatch |
| 118 | [8fce1012](https://github.com/arianna-arpg/arpg-game-world/commit/8fce1012e395d6fb20902d6b76485bef2b4cceff) | feat(hud): identify native formation leaders on hover |
| 119 | [d079f54d](https://github.com/arianna-arpg/arpg-game-world/commit/d079f54dfd90696b7fdf152d59fb964d7e79f5c2) | feat(worldmass): give the Silent Caravan a native escort |
| 120 | [defdeb7f](https://github.com/arianna-arpg/arpg-game-world/commit/defdeb7f9b530fe6444a0b0facf41108e3917d3d) | fix(render): clip native lights against seamless terrain |
| 121 | [bdd53fb0](https://github.com/arianna-arpg/arpg-game-world/commit/bdd53fb03ed58d78e08e81063e3b559807ed1a7c) | feat(ui): prepare native flask gifts alongside optional contracts |
| 122 | [253920ce](https://github.com/arianna-arpg/arpg-game-world/commit/253920cec059b43b79b5d7b3bb8b8e5ea33ceee8) | fix(render): separate native loot labels and collapse exact duplicates |
| 123 | [b636d2e7](https://github.com/arianna-arpg/arpg-game-world/commit/b636d2e702080299d40cfab81c8ba54e351b1909) | fix(dialogue): keep optional preparation from hiding native quest work |
| 124 | [acca68d5](https://github.com/arianna-arpg/arpg-game-world/commit/acca68d56b3590301df31500d16a13e09f51986a) | test(render): inspect reward names in their actual word layer |
| 125 | [2bc3c58d](https://github.com/arianna-arpg/arpg-game-world/commit/2bc3c58d270d203667ba06e3d2b3e4bf6fb8051b) | tune(encounters): let forager hunters commit without their thrower |
| 126 | [d5b3ce20](https://github.com/arianna-arpg/arpg-game-world/commit/d5b3ce204607b3329d44424aee9068c983b054aa) | fix(ai): let wounded bonepickers fight after rallying |
| 127 | [af1a1ce0](https://github.com/arianna-arpg/arpg-game-world/commit/af1a1ce06982b30c4093864041a8b6bb62c475a5) | test(ai): cover warrior pursuit on generated terrain |
| 128 | [6c9c21c5](https://github.com/arianna-arpg/arpg-game-world/commit/6c9c21c5ca719af46a2d5ffbcd6954534756036f) | perf(worldmass): retain terrain work across unrelated edits |
| 129 | [0d5dd22f](https://github.com/arianna-arpg/arpg-game-world/commit/0d5dd22fac47cf294a74db1e5317aa73b7a8ca89) | tune(ai): retain attack openings while bonepickers lose courage |
| 130 | [8960f49d](https://github.com/arianna-arpg/arpg-game-world/commit/8960f49dca70b13719faa09e8d42eda4a29118e6) | fix(playtest): preserve viewport coordinates and report world time |
| 131 | [93ce2332](https://github.com/arianna-arpg/arpg-game-world/commit/93ce23323162b2b3c8149737dbd13029ce542f3d) | perf(worldmass): prepare complete floor tiles ahead of the camera |
| 132 | [7a003650](https://github.com/arianna-arpg/arpg-game-world/commit/7a003650552993744d17664728aa130489f623df) | perf(worldmass): yield prewarming when visible terrain needs work |
| 133 | [1e4da1d2](https://github.com/arianna-arpg/arpg-game-world/commit/1e4da1d27028782f4872a031bd61ee1236406d29) | feat(ui): explain the idle approach to reachable speakers |
| 134 | [4b8ddbdf](https://github.com/arianna-arpg/arpg-game-world/commit/4b8ddbdf1677d0dd0e7a8a86878668ae0bf565de) | perf(worldmass): let terrain preparation yield to elapsed time |
| 135 | [7fb29108](https://github.com/arianna-arpg/arpg-game-world/commit/7fb2910897df504597d2e3b2dbfcd3a6185a8555) | feat(ui): explain starting attributes on class cards |
| 136 | [2afcda61](https://github.com/arianna-arpg/arpg-game-world/commit/2afcda6136dff6d4f953b457bf877bb0f9baa04a) | fix(ui): keep world status readable over bright terrain |
| 137 | [7104fa68](https://github.com/arianna-arpg/arpg-game-world/commit/7104fa68bdacb72d9abb9079b1e8b989dd64d9d8) | feat(combat): let authored windups follow live aim |
| 138 | [675f1ca8](https://github.com/arianna-arpg/arpg-game-world/commit/675f1ca8b819b1b0e76301eea5a6ee358d933475) | Restore optional combat cues and share player visual foundations |
| 139 | [5820d968](https://github.com/arianna-arpg/arpg-game-world/commit/5820d968a7b9b4e946fad4ca4c473c03dc23889c) | Restore the classic passive tree and make text lists optional |
