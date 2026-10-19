# Gameplay decisions — 19 October 2026

This is the current decision record for `arianna-arpg/arpg-game-world`. Main owns shared content and gameplay. Seamless incorporates main through verified real merges; it also owns continuous geography and hosting adaptations. The separate MMOARPG repository is outside this work.

The earlier main/seamless comparison and its file inventory are historical snapshots, not an approved backlog or a statement of current branch differences. Use the decisions below when implementing or reviewing changes. Pending means retain the current main behavior until the user decides; it does not authorize promotion from seamless.

## Combat

| ID | Decision and actual player effect |
| --- | --- |
| C01 | Shared: the most recently pressed held skill gets the next casting opportunity. Existing committed casts finish normally. |
| C02 | **Approved in follow-up.** Shared: a fresh movement press suppresses older held-skill repeats after the current cast. It does not cancel that cast or release a held guard/channel. Releasing movement allows held skills to resume. |
| C03 | Shared, approved as future authoring capability only: `castAim: 'live'` lets an ordinary windup follow its actor's aim. It originally accompanied a Cleave movement/aim experiment (5 October), whose skill changes were reverted (8 October). No authored skill currently opts in. Omitted/`press` aim, movement, costs and cast timing stay unchanged; targeted, locked, planted and held/timing casts keep their existing rules. |
| C04 | Shared: Shadow Step lands behind the target's facing, then immediately turns the caster toward it. Immediate and delayed arrivals both support the full following Backstab when its normal hit conditions are met. |
| C05 | Keep lurker closing/melee adjustments in seamless for future AI work. Main retains its existing behavior. |
| C06 | Corrected shared behavior: Bonepicker retains its normal throwing/skirmish cadence at low nerve. Wounds can trigger one 3.5-second rout; being outnumbered cannot repeatedly restart flight. No permanent low-nerve retreat override. |
| C07 | **Approved in follow-up.** Shared: ranged enemies move when their actual firing lane is blocked, including low cover that they can see across. A valid alternate attack still fires normally. Explicit authored `losSeek: false` remains respected. |
| C08–C10 | Keep in seamless: encounter territories, physical sanctuary boundaries and additional road encounter groups. Do not add their continuous-world policy to ordinary zones. |
| C11 | Shared performance change: discard clearly distant target candidates before expensive hostility checks, preserving actual sensing reach and segmented-body exceptions. |
| C12 | Shared performance change: remove stat-fold closure overhead without changing modifier order. Shared presentation clocks are included; shard ownership and prediction remain seamless adaptations. |

## Presentation

| ID | Decision and default |
| --- | --- |
| V01 | Main cast bars restored exactly: **44 × 5**. |
| V02 | Cast-name hint, movement hint and active-slot outline are separate options; **all off by default**. |
| V03 | Shared: melee preparation footprint and enemy attack foresight; remote clients receive the real resolved geometry. These do not change hit ranges. |
| V04 | Shared: shield coverage and a visual cue for a confirmed rear wound. A refused or zero-damage attack does not display a successful Backstab cue. Damage bonuses remain unchanged. |
| V05 | Shared: body preparation/follow-through and walking driven by real displacement. No added gameplay delay. |
| V06 | Shared: hero bracket, nearby threat/body contrast. Correction to the original audit: garrison/formation label helpers were not wired into the renderer; they were not a delivered visible feature and are not being promoted. |
| V07 | Floating-number displacement and crowded-meter displacement are optional, **off by default**. Correction: the old floating-number helper had not been called by the renderer. The option now actually selects the alternate placement. |
| V08 | Shared: compact status icons; details on hover by default. Focus/corner/off remain choices. |
| V09 | Shared: actual buff details/expiry on hover and altar effects based on actual recipients/restoration. |
| V10 | Shared artwork, **on by default**, across hotbar/build/bag. |
| V11 | Leave the existing seamless three-cast counters/descriptions in place for possible later reuse; no promotion to main. Change the Rhythm counts three different casts within six seconds; Perfect One Motion counts three repeated casts. Their existing bonuses are unchanged. |
| V12 | The HUD change (four objective rows, two compass rows and bounded notices) remains unapproved for main. **This was not what the user meant by bounded objectives.** The intended feature is retained zone layouts and their substantial objective systems embedded as bounded areas in continuous terrain; see the corrected world direction below. |
| V13 | Main ground-item label placement is the default. Alternate label avoidance is an option, **off by default**. Correction: previous claims of active displacement and collapsed announcements were inaccurate; the helper was unused, and announcement collapsing is not implemented by this option. Hosted ownership filtering is separate. |
| V14 | Shared: chest latch glint, an arc driven by real search progress, and moving motes. Remove the added instructional search captions. This does not change chest rewards or search timing. |
| V15 | Shared: revised ailment motifs and capped night/body contrast. Presentation only; it grants no sight through obstacles. |
| V16 | Restore main's fixed **game-camera** scale (1.3) in seamless; remove the added 85–160% game zoom option and ignore its old saved preference. This is unrelated to map zoom. Existing couch framing remains; hosted correction smoothing and capture/showcase framing are separate technical functions. No new map-zoom behavior is authorized by this choice. |
| V17 | Shared: quieter empty hotbar slots; key labels and hit areas remain. |
| V18 | Shared: approved environment, body, golem, water, ground and skill artwork. Continuous settlement-specific visuals stay with seamless. |

## Inventory, progression and entry

| ID | Decision and actual player effect |
| --- | --- |
| P01–P02 | Preserve main's account loop: Begin only while the tutorial is due; tutorial completes directly into Mu. Afterwards New Run enters Mu. Physical vessel selection starts the branch's world; Continue restores the saved life. No permanent tutorial replay/card lane. |
| P03 | Shared: recover a support directly from a stored skill. Unequipping a supported skill keeps its supports inside that skill gem. If the bag cannot accept the gem, unequip is refused without changing the skill. If there is no room for an unsocketed support, unsocket is refused before removing it. Nothing is silently dropped or destroyed; no separate overflow store is needed for this operation. |
| P04 | Shared: show the actual remaining calm time when a swap is refused; the extra ready hint remains **off**. Hosted seat-specific clocks remain a seamless adaptation. |
| P05 | Shared: recall's View in Bag action, newly revealed item focus and first-recall attention. |
| P06 | Shared: inspectable proc details and useful precision for small percentages. No stat rebalance. |
| P07 | Restore the passive graph, search and choice behavior to main. Remove the available/allocated list controls. Keep Mu starting attributes. |
| P08–P09 | Separate priority dialogue redesign chat. Do not promote the seamless conversation workspace, approach caption or lesson overlay to main as part of this alignment. |
| P10 | Keep continuous-map/nearby quest-offer features in seamless, subject to later adjustments. |
| P11–P14 | Retain necessary continuous quest geography, save/resume, launch/profile and runtime-error adaptations in seamless. Approval is not a reason to add world-specific plumbing to main. |

## World, hosting and continued work

The user clarified the world direction on 19 October; this supersedes older interpretations of “bounded/unbounded objectives” and blanket statements that the world direction is undecided. Individual W-series implementation choices remain subject to review. Hosting/ownership adaptations can remain in seamless; shared offline gameplay stays authoritative on main.

### Retained zones inside continuous terrain

- Intended geographic/map hierarchy: **world map → regions → zones → chunks**. A chunk is a streaming subdivision, not a replacement for a playable zone or an objective boundary.
- Preserve the interesting main-branch zone layouts, terrain templates and authored spatial structure. Populate those zones directly into the seamless environment as bounded playable areas that a travelling player can encounter.
- Retain each area's existing, substantial zone objective system, associated encounters and completion/reward behavior. Small incidental camp objectives can coexist, but do not substitute for these larger activities.
- “Bounded instance” here describes the authored area's footprint and objective ownership. It does not by itself authorize a portal, loading transition, separate server instance or a reset on crossing a chunk boundary. Continuous travel remains the goal; deliberately separate interiors are a distinct case.
- Adapt approaches and connections to surrounding terrain while retaining the layouts' identity. Administrative region/chunk edges must not become encounter walls. Any actual sealing or commitment rule comes from the retained area's authored gameplay.
- Current delivery falls short: campaignPlaces() reuses quest definitions, rewards, enemies and bosses but places them in generic site templates. That is not individual retention of those quests' original zone layouts. The separate retained-area inspection route also does not constitute embedding them into seamless ground.
- The next content implementation must prove one representative retained layout and its actual objective in surrounding seamless terrain, including walk-in/out and saved progress, before generalizing. This decision record does not claim that integration is already implemented or authorize replacing the codebase wholesale.

Map presentation should reflect this hierarchy; game-camera scale and HUD line limits are independent concerns.

Two dedicated chats own dialogue redesign and incremental infrastructure/context cleanup. Preserve unfinished work in the original checkout. Remove obsolete guidance from current entry points while retaining necessary history as clearly labeled reference material.

## Verification for this change

Use the existing type checks, combat simulation and actual client boot/playthrough. Focused regressions cover input ordering, Shadow Step/Backstab, Bonepicker recovery, supported-skill inventory safety, movement/remote presentation and chest feedback. Cast presentation is checked against the native 44 × 5 clock. Tests are evidence for these behaviors, not delivered game content.
