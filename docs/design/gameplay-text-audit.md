# Gameplay text → visual cues: migration backlog

GAMEPLAY-TEXT-AUDIT · Refreshed 2026-09-20 · **13 families implemented with playtesting pending; 20 open replacement families and 7 surface reviews remain.**

The player must be able to recognize a gameplay event and respond without reading a sentence or a combat label. Give a cue to the actual body, object, place and time involved. Its buildup, commitment, interruption and recovery should agree with the mechanic. Reusable, configurable visual families carry that information; captions are retired as their replacements become readable.

This updates the [August census](show-dont-tell.md). Its historical counts and permission to keep mutable combat cries are not the current standard. The newer rule in [CLAUDE.md](../../CLAUDE.md) takes precedence. Moving a caption into a notification feed or making it optional does not, by itself, meet the rule.

## How to use this list

- **Partial** means an existing visual was found, but the caption remains or the visual coverage needs work. It does not mean the visual is sufficient.
- **Open** means the text path is confirmed and a replacement is proposed; visual coverage has not been fully evaluated.
- **Review** means an information surface needs semantic review, rather than automatic removal.
- **P1** covers immediate danger, openings and defensive outcomes; **P2** covers other combat events and environmental changes; **P3** covers broader information surfaces.
- IDs stay stable. For each implementation, record the chosen visual, data fields, removed emitters, validation and remaining gaps against that row. Mark **Done** only after playtesting the event without its caption.

The rows group related mechanics; the generated inventory contains individual candidate sites. Source links identify representative emitters and owning symbols, not every message in a family. Line numbers describe this snapshot and may drift; regenerate the inventory to locate the current source.

## Current position and combat-first queue

**Implemented, awaiting encounter acceptance:** GT-001–012 and GT-019.
These cover exhaustion, poise/guard/shell breaks, parry/reflection, defensive
outcomes, timing successes, critical riders, committed guard warnings,
coordinated maneuvers, cast interruption/fizzle and held readiness. Their
individual rows link the implementation contracts and verification harnesses.
No row is marked Done solely because its automated checks pass.

**Additional implemented visuals:** simultaneous player bleed drips, burn
kindling, poison vignette and Doom hooks, with per-effect severity and shared
clutter limits ([affliction cues](affliction-cues.md)); Undead night emergence
and cancellation from committed scenery sites ([Odyssey](odyssey.md#undead-nights-and-scenery-risings)).
These are existing coverage, not additional unresolved caption families.
The Doom screen layer does **not** complete the distinct GT-022 detonation,
execution, volatility and survival-window work.

| Work remaining | IDs | Next implementation direction |
|---|---|---|
| Immediate combat outcomes and threats — next batch | GT-022, GT-035 | Separate Doom detonation, volatility, cull, cap and Last Gasp transitions; show boss wards and actual source links. Preserve advance warning where the mechanic allows a response. |
| Combat resources and payloads | GT-020, GT-021, GT-023, GT-034 | Reserve depletion/venting, loaded or armed payloads, consumed proc stacks and completed combination patterns. |
| Body damage, feeding, companions and recovery | GT-024–029 | Lost weakpoints/parts, feeding transfers, ownership/tether changes, taming/rejection, down/reanimation and field/remnant transitions. |
| Scripted combat and remaining action refusals | GT-013, GT-032, GT-038 | Review individual phase/summon/encounter triggers and unavailable actions. GT-038 gather-too-thin/broke-early captions are already replaced by casting fizzles; other refusals remain. |
| World danger and discovery | GT-014–018, GT-030, GT-031, GT-033 | Messenger/siege, terrain/water, traps, challenge reset, doors/reveals and Titan trail discoverability. Undead scenery risings do not complete all emergence/trap families. |
| Broader UI/reference decisions | GT-036, GT-037, GT-039, GT-040 | Objective/wave progress, Odyssey news, numbers/identity, optional reference and operational messages. Trace meaning before changing these surfaces. |

For every implemented family, remaining acceptance includes caption-free
recognition in crowded combat, bright/dark terrain, lifecycle cleanup and
co-op readability. Keep profile overrides, universal fallbacks and optional
supplementary cues where a functional bar already communicates the mechanic.

## First pass: breath, breaks and defensive outcomes

| ID | Priority / state | Trigger and current text | Existing visual / proposed replacement | Source |
|---|---|---|---|---|
| GT-001 | P1 · Implemented; playtest pending | Retreat exhaustion prevents retreat during `aiWindedUntil`; the `winded!` emitter is removed. No armor debuff. | Inherited `WIND_PUFF` reads effort, then sustained gasps and forward slump from the actual catch window. `retreatTells` allows anatomy overrides. Real retreat/co-op/recovery probes and renderer captures pass; crowded encounter readability remains. | [Contract and checks](exhaustion-cues.md), [cue data](../../src/data/exhaustionCues.ts), [retreat gate](../../src/engine/ai.ts) |
| GT-002 | P1 · Implemented; playtest pending | Fumelung depletion applies `winded_gasp` (default 2.6 s vulnerability); its `out of breath!` note is removed. | Collapsed reserve-driven bellows, paired status-driven `VENT_GASP` puffs and deeper slump; refill restores the lungs. Custom duration, early cure, actual vent effect and rendered states are covered. Encounter readability remains. | [Contract and checks](exhaustion-cues.md), [cue data](../../src/data/exhaustionCues.ts), [Fumelung](../../src/data/monsters.ts) |
| GT-003 | P1 · Implemented; playtest pending | Brief slowing `winded`; its reference label remains. | `StatusDef.bodyCue` provides a knee dip and slower exhale throughout the actual status on players, monsters and minions. Generic sparkle disabled; expiry/early cleanse and co-op checked. | [Contract and checks](defense-cues.md), [status data](../../src/engine/status.ts) |
| GT-004 | P1 · Implemented; playtest pending | Poise break/rearm; `BROKEN!` and `POISED` emitters removed. | Bronze brace fractures, persistent split brackets while `poiseBroken`, then reassembly at actual rearm. Existing defense mechanics and proc events preserved. | [Contract and checks](defense-cues.md), [shared profiles](../../src/data/defenseCues.ts) |
| GT-005 | P1 · Implemented; playtest pending | Active/passive blocks, guard depletion and bash; `blocked`, `block!`, `guard broken!`, `shield bash!` removed. | Directional shield impact, outward break/recoil and forward bash motion. Held guard vanishes with the actual stance. Parry and advance release warnings remain separate rows. | [Contract and checks](defense-cues.md), [shared profiles](../../src/data/defenseCues.ts) |
| GT-006 | P1 · Implemented; playtest pending | Shell absorbs, breaks and reforms; `shell`, `SHELL BREAKS!`, `shell regrows` removed. | Universal shedding outer layer with `shellVisual` overrides: spiral fragments for snail/whelk and carapace plates for crab. Real coverage, pool and reform threshold drive gaps/regrowth. Unknown profiles retain the universal fallback; anatomical shells now replicate to co-op. | [Contract and checks](defense-cues.md), [profile data](../../src/data/defenseCues.ts) |
| GT-007 | P1 · Implemented; playtest pending | Successful parry; `PARRY!` removed. | Weapon-edge teeth show the exact opening, a cross marks incoming contact, and real reflected projectiles carry return chevrons. Innate/stat-granted windows, off-axis contact and co-op checked. | [Contract and checks](combat-outcome-cues.md), [profiles](../../src/data/combatCues.ts) |
| GT-008 | P1 · Implemented; playtest pending | Resolved `evade`, `immune`, and ailment `resisted` captions removed. | Sideways body echoes, an intact barrier, and diminishing outward fragments use distinct geometry. Ailment refusal does not hide damage from the underlying hit; taming rejection remains separate. | [Contract and checks](combat-outcome-cues.md), [painter](../../src/render/vis/combatCueLayer.ts) |
| GT-009 | P2 · Implemented; playtest pending | Perfect/flawless press and release, and spark success captions removed. | Four/eight/three corners snap at the actual casting edge along committed aim. Existing bonuses remain; failed timing and repeated presses cannot replay success. | [Contract and checks](combat-outcome-cues.md), [cue helpers](../../src/engine/combatCues.ts) |
| GT-010 | P2 · Implemented; playtest pending | `crit mend!`, `crit affliction!`, `aftershock!` removed. | Rounded inward mending, angular ailment barbs and ground cracks distinguish outcomes. Quiet ticks remain quiet; fissure impact matches its real center and scaled radius. | [Contract and checks](combat-outcome-cues.md), [profiles](../../src/data/combatCues.ts) |

**First implementation:** GT-001/002 now use the reusable exhaustion rows in
`src/data/exhaustionCues.ts`; `winded!` and Fumelung's `out of breath!` emitters
are retired. The first follows effort and the actual retreat catch window;
the second follows `winded_gasp` alongside reserve-driven collapsed bellows.
`MonsterDef.retreatTells` supplies anatomy overrides. Lifecycle/co-op probes
and a hidden renderer harness cover the replacements; encounter readability
playtesting remains before marking these rows Done. Details and checks:
[Exhaustion cues](exhaustion-cues.md).

**Second implementation:** GT-003–006 now have reusable body/defense cues,
including a universal shell fallback and anatomy-specific profiles. See
[Body and defense cues](defense-cues.md) for authored fields, removed emitters,
validation and remaining playtests.

**Third implementation:** GT-007–010 use configurable combat-outcome profiles,
with resolved parry readiness and real reflected-flight markers in co-op. See
[Combat outcome cues](combat-outcome-cues.md) for the contract and checks.

**Fourth implementation:** GT-011/012 replace committed guard-release and
coordinated-plan captions with live warnings. See [warning cues](warning-cues.md).

**Player-directed fifth slice:** [Player affliction edge cues](affliction-cues.md)
now give harmful statuses independent simultaneous material layers: blood drips,
kindling, poison haze and curse hooks, each scaled by its own pressure. A shared
clutter budget retains all families; low-life stays separate. Universal fallbacks
and comfort settings remain.
Implemented; encounter comfort/playtesting pending. This extends existing
status visuals rather than claiming another caption migration is complete.
Supplementary cues remain optional where an arming bar already carries the read.

**Casting slice:** GT-019 now uses outward interruption fragments, inward
fizzles, stable full-hold silhouettes and a splitting/reclosing concentration
frame. Failed gathers share the fizzle instead of a refusal caption. See
[Cast disruption and held readiness](casting-cues.md) for reusable profiles,
co-op completion gauges, checks and remaining acceptance.

**Remaining announcement slice:** GT-013 AI/script announcements require trigger-by-trigger
classification; then GT-014/015 messenger and siege warnings with offscreen discoverability.
Do not turn off all combat text globally as a shortcut.

The three Winded mechanics must not be collapsed into one new status. Similarly, poise break, guard break and shell depletion remain distinct mechanics even if their drawings share configurable pieces.

## Warnings and counterplay: preserve the advance signal

| ID | Priority / state | Trigger and current text | Proposed visual / constraints | Source |
|---|---|---|---|---|
| GT-011 | P1 · Implemented; playtest pending | Committed AI guard release; `Bash incoming!` removed. | Live backward body/shield load and a fixed sector use the actual bash geometry, windup and committed facing. Pressure, break, stun, death or cancellation clear the threat; radial/inverted/support cases and co-op use the same read. | [Contract and checks](warning-cues.md), [shared geometry](../../src/engine/warningCues.ts) |
| GT-012 | P1 · Implemented; playtest pending | Shared plan and roster-specific signals, plus `Regrouping`, removed. | Six configurable body/leader gestures prepare native formation movement, soften during commitment and fold down during real recovery. Unassigned conductors remain attributable; ineffective assignments stay quiet. Disruption and co-op cleanup are covered. | [Contract and checks](warning-cues.md), [profiles](../../src/data/warningCues.ts), [planner](../../src/engine/encounterCombat.ts) |
| GT-013 | P1 · Open | AI rules, impulses, phase changes, ward notes and scripted announcements, including `!!`. | Identify whether each line warns, commits, announces a phase or reports recovery. Bind each to a reusable pose, body change, ward link or attack preparation. A generic phase flash cannot substitute for an attack's location/direction. | [resolveMachines / enterScriptPhase](../../src/engine/ai.ts#L1324), [AI action announce handler](../../src/engine/aiActions.ts#L131), [monster rows](../../src/data/monsters.ts) |
| GT-014 | P1 · Open | `SPOTTED! Stop the messenger!` and a second instructional notice. | Messenger visibly spots the player, turns toward its escape route, raises a dispatch/signal and runs. Mark its actual route/exit with the same faction visual language. Arrival/escape and interception need different outcomes. | [OdysseyRuntime.updateScouts](../../src/engine/odyssey.ts#L215) |
| GT-015 | P1 · Open | Goblin siege: return-within-seconds warning, town-under-attack notices, wave instructions and trade-closure text. | Distant alarm with a visible town/map signal; siege preparations progress, then attackers arrive and stores visibly suffer. Convey urgency without requiring the sentence or spoken instruction. Spatial indicators must remain discoverable offscreen; exact optional counters are a separate surface review. | [OdysseyRuntime](../../src/engine/odyssey.ts#L256) |
| GT-016 | P1 · Open | Collapsing terrain: `causeway failing — run!`, drift/wind/crack warnings and sky collapse lines. | Show the supported ground cracking, tilting, shedding debris or losing density at the actual unsafe tiles. Escalate with remaining support; make safe ground readable. De-escalate if rescued or stabilized. | [terrain events](../../src/engine/world.ts#L50843), [sky events](../../src/engine/world.ts#L50922) |
| GT-017 | P1 · Open | Water/terrain `sinkText`, `breachText`, `enterText`, and repeated `underflowText` / `failing!`. | Body submersion, bubbles, straining movement, surface rupture and terrain-specific contact effects. Repeated failure belongs to an ongoing state cue, not repeated bursts. | [water transitions](../../src/engine/world.ts#L53485), [region entry](../../src/engine/world.ts#L54976), [underflow](../../src/engine/world.ts#L55071) |
| GT-018 | P1 · Open | Tripwire `announce` / `click!`, doodad `warn`, `text` and `stirText`. | Wire tension/snapping, disturbed material, visible mechanism loading and local dust/motion before emergence. Reuse the Undead ground-rising vocabulary where appropriate, driven by the real trigger. | [tripwire](../../src/engine/world.ts#L53826), [breakable cues](../../src/engine/world.ts#L59522), [stir](../../src/engine/world.ts#L60645) |
| GT-019 | P1 · Implemented; playtest pending | Cast `interrupted` / `fizzled`, brim `BRIMMING` and concentration `refocus!` removed; underfilled/unfinished gather captions also retired. | Outward fracture, inward falling motes, stable full-hold diamond and splitting focus frame follow real transitions. Completion bars remain; support-derived gathers and co-op share the resolved read. | [Contract and checks](casting-cues.md), [profiles](../../src/data/castingCues.ts), [resolver](../../src/engine/castingCues.ts) |

## Other combat and world events

| ID | Priority / state | Current examples / trigger | Proposed visual family | Source |
|---|---|---|---|---|
| GT-020 | P2 · Open | Reserve stages and vent `note`, `venting`, other depletion captions. | The consuming organ, fuel, ammunition or held object visibly empties, vents and reloads. Generalize GT-002 through reserve data; distinguish a one-time transition from sustained depletion. | [ReserveVent / ReserveStage](../../src/engine/reserves.ts), [reserve emitter](../../src/engine/world.ts#L12849), [venting](../../src/engine/world.ts#L34703) |
| GT-021 | P2 · Open | `primed`, `armed`, `loaded`, arrow/anchor counts. | Loaded chambers, attachments, hovering payloads and a distinct ready pose. Counts become visible objects or compact resource pips where feasible; exact counters belong in the surface review. | [payloads](../../src/engine/world.ts#L34939), [armed](../../src/engine/world.ts#L35114), [loaded](../../src/engine/world.ts#L37272) |
| GT-022 | P1 · Open | `DOOM!`, `volatile!`, `CULLED`, `capped!`, `LAST GASP`. | Separate looming threat, unstable payload, execution, limit feedback and survival-window families. First inspect each trigger: these are not interchangeable status splashes. Imminent events need a pre-event cue and attributable source. | [DOOM](../../src/engine/world.ts#L30766), [hit outcomes](../../src/engine/world.ts#L42902), [LAST GASP](../../src/engine/world.ts#L44176) |
| GT-023 | P2 · Open | Dynamic `${sdef.label} POPS!`, proc names, rider names, rule labels. | The actual consumed stack/payload releases its element/material into the effect it causes. Configure a cue on the reusable proc/rider definition; a new name must not automatically create a new caption. | [defense/proc sweep](../../src/engine/world.ts#L44577), [rider](../../src/engine/world.ts#L45020), [rule](../../src/engine/world.ts#L34729) |
| GT-024 | P2 · Open | `spot shattered!`, `SUNDERED`, `TORN` / part-specific text. | Crack the struck weakpoint, shed its visible component and change the host silhouette/function. Preserve which part was lost. Distinguish these physical changes from temporary poise breaks. | [weakpoint](../../src/engine/world.ts#L48875), [body parts](../../src/engine/world.ts#L52197), [part text](../../src/engine/world.ts#L52250) |
| GT-025 | P2 · Open | `feeds`, `fed`, `devours`. | A visible bite or transfer from the consumed source to the eater, then organ/body refill. No feeding effect if nothing was actually consumed. | [updateCarrion](../../src/engine/ai.ts#L2464), [fed](../../src/engine/world.ts#L36290), [devours](../../src/engine/world.ts#L56327) |
| GT-026 | P2 · Open | `marked`, `dominated`, `bond broken`, stance label and bond-response lines. | Persistent owner/target marks, tether changes and companion posture; make severing or changing allegiance readable. Retain attribution through shape/placement, not faction color alone. | [mark](../../src/engine/world.ts#L36852), [domination](../../src/engine/world.ts#L43145), [bond break](../../src/engine/world.ts#L48657), [stanceShift](../../src/engine/companionBonds.ts#L337) |
| GT-027 | P2 · Open | `TAMED: …`, `resisted!` during taming, `returns wild`, raised companions. | Taming effort visibly binds and settles the creature; rejection strains/snaps the binding; release restores wild posture. The taming `resisted!` must not inherit a damage-resistance cue simply because the word matches. | [taming outcomes](../../src/engine/world.ts#L30283) |
| GT-028 | P2 · Open | `DOWN`, `undying`, `respawned`, `THE AMALGAM RISES`, other arrival lines. | Collapse/kneel, stubborn reanimation, reconstruction or emergence appropriate to the body/material. Separate incapacitation, avoided death and new arrival. | [down/death](../../src/engine/world.ts#L45528), [amalgam](../../src/engine/world.ts#L55694), [respawn](../../src/engine/world.ts#L56390) |
| GT-029 | P2 · Open | `unraveled`, `BLOOM`, `miasma rises`, remnant captions. | The field contracts, blooms, thickens or deposits a visible residue at its true footprint. Reuse element/material families with distinct motion for creation vs destruction. | [miasma](../../src/engine/world.ts#L35024), [field changes](../../src/engine/world.ts#L48397), [remnant](../../src/engine/world.ts#L56647) |
| GT-030 | P2 · Open | Challenge `Goad reset — reopen the wound`. | Visible wound reopening/closing or challenge emblem resetting at the affected target. The optional challenge description can explain rules outside active play. | [Challenges.completed](../../src/engine/challenges.ts#L64) |
| GT-031 | P2 · Open | Door splinters/swings, hidden cache/passage/stair announcements. | Door and wall motion, falling material, revealed light and visible traversal/access state. Preserve orientation and the new usable opening. | [door events](../../src/engine/world.ts#L50573), [hollow reveals](../../src/data/hollows.ts) |
| GT-032 | P2 · Open | Scene start/step `announce`, summon `announce`, brood/nest/lattice outcome prose. | Author scene/encounter cue rows: arrival, rupture, scatter, silence and release at the actual actors/objects. Keep dramatic names separate from instructions. | [scenes](../../src/engine/scenes.ts#L675), [summon](../../src/engine/aiActions.ts#L186), [lattice](../../src/engine/killHandlers.ts#L286), [swarming](../../src/packages/defs/swarming.ts#L107), [verminfall](../../src/packages/defs/verminfall.ts#L113) |
| GT-033 | P2 · Open | Titan `The wake of … Follow the devastation.` | The existing terrain wake should form the discoverable trail: consistent direction, scale and material disturbance, with a visual point of entry if the trail begins offscreen. | [TitanRuntime.update](../../src/engine/titans.ts#L169) |

## Surfaces outside ordinary floating text

These are part of the audit, not automatic exceptions to the law. Active gameplay instructions should move into visual signals. Optional inspection, identity, exact values, dialogue and device/error messages need separate decisions; deleting them indiscriminately would remove useful information without improving the action.

| ID | Priority / state | Surface found | Next decision / visual direction | Source |
|---|---|---|---|---|
| GT-034 | P2 · Review | Direct canvas `rule.name + '!'` after a combination lights. | Pulse/lock the completed pattern itself; this bypasses the floater settings. | [renderer](../../src/render/renderer.ts#L8146) |
| GT-035 | P1 · Review | Boss name appended with `WARDED`. | Show the intact ward and its actual source links around the boss/health frame. The name is identity; the ward state is gameplay. | [boss HUD](../../src/render/renderer.ts#L8374) |
| GT-036 | P2 · Review | `Wave … in …` and `world.objectiveText()`. | Advancing arrival marks, visible objective objects/states and a nonverbal readiness/countdown shape. Trace objective variants before replacing the common renderer. | [objective HUD](../../src/render/renderer.ts#L8291), [wave HUD](../../src/render/renderer.ts#L8336) |
| GT-037 | P3 · Review | Odyssey onboarding, operation instructions, leader fall notices, expected readiness and hunt/siege news. | Split optional journal/reference information from immediate gameplay signals. Map/faction state should show progress and changed threats. Offscreen news needs discoverable spatial cues, not just removal of the feed. | [OdysseyRuntime.tell and callers](../../src/engine/odyssey.ts#L32) |
| GT-038 | P2 · Review; gathers implemented | Skill refusals, `cannot sustain`, `no mines`, interaction reasons. Underfilled/unfinished gather captions replaced by GT-019 fizzles. | Remaining: show the unavailable resource, absent deployables or obstructed target at the relevant control/object. Retain optional diagnostic details where useful; do not make the player read a refusal to understand action failure. | [Casting coverage](casting-cues.md), [sustain](../../src/engine/world.ts#L36353), [mines](../../src/engine/world.ts#L36977), [skill refusals](../../src/engine/world.ts#L57132) |
| GT-039 | P3 · Review | Damage/healing numbers, XP, gains, pickup/drop names, counters, exact resource values. | Review density and optional settings separately from mechanic captions. Item identity and exact values are not proven violations merely because the scanner finds text. Visual impact still carries the event. | [float kinds](../../src/world/bulletins.ts#L227), [drawTexts](../../src/render/renderer.ts#L7196) |
| GT-040 | P3 · Review | Status labels, hovered buff labels, tooltips, journal, dialogue, bind hints, device/error messages. | Preserve optional reference/identity and operational messages while auditing any active instruction masquerading as a label. `Winded` in a status definition is not an extra `winded!` event. | [status definitions](../../src/engine/status.ts), [buff hover](../../src/render/renderer.ts#L8076), [panels](../../src/ui/panels.ts), [combat-readability policy](combat-readability.md) |

## Existing systems to extend

- [TellSpec and tell sources](../../src/engine/tells.ts) already connect continuous values to body parts, posture and other visual channels. Use them for exhaustion, reserve depletion, preparation and recovery. Static decorative breath in a look is not evidence that exhaustion is communicated.
- [Status voices](../../src/engine/statusVoice.ts) and [their render layer](../../src/render/vis/statusVoiceLayer.ts) already replace many on-apply captions with family accents. These are not hundreds of missing text replacements. A short accent still does not communicate an ongoing state by itself.
- [Effect voices](../../src/render/vis/effectVoice.ts) and [combat voices](../../src/render/vis/cryVoices.ts) provide reusable flash rendering. The legacy `World.cry` wrapper still emits both text and an effect, but the refreshed scan finds no call sites. New cues use visual emission directly.
- [Ground rising](../../src/render/vis/groundRising.ts) demonstrates buildup, committed locations, emergence and visible cancellation for Undead nights. That path is already visual; it is not a new open caption-removal row here.
- [Snapshots](../../src/net/snapshot.ts) carry tell values, status rows and effect voices. Future continuous cues must use replicated state or derived tell values; remote clients cannot infer host-only AI timers reliably. Check joins/reconnects and ongoing-state visibility, not only new-event bursts.

## Make showing the default

Proposed implementation contract for each family:

1. Author its trigger and visual parameters through the existing data/registry systems. Reuse behavior across player, monster and companion where the mechanic is shared; choose appropriate materials/anatomy rather than putting human gasps on every body.
2. Draw an anticipatory cue only when there is something to anticipate. Match position, facing, reach, intensity and remaining duration to the actual mechanic. Do not invent an actionable danger where the event is only cosmetic.
3. Show the transition and, where needed, the sustained state. Recovery, interruption, death and removal release it cleanly. A brief shatter can announce a break; the player still needs to recognize whether the defense remains broken afterward.
4. Verify at normal gameplay zoom, on bright/dark terrain and in crowded combat. Shape, motion and silhouette carry meaning without color or sound. Optional generated/licensed audio may reinforce the cue but must not be the only signal.
5. Verify equivalent host/co-op meaning and gameplay invariance. Cover the owning mechanic with its relevant probe; inspect visual captures at warning, commitment and recovery. Test caption-free comprehension in play, not just that an effect object exists.
6. Remove all redundant captions for the covered trigger, including notices and data-fed variants, then update this row and regenerate the discovery inventory. Clean up comments that still instruct authors to emit a caption.

After the first migrations establish the pattern, add a reviewed regression guard for **new gameplay-caption emitters**. A raw total is not a sensible gate: wrappers, UI and data candidates overlap. Review new `text` / `cry` calls and `announce` / `note` fields by purpose; require a visual cue for new mechanics. Keep future exceptions narrow and explicit rather than blessing an entire notification channel. This guard is proposed, not installed by this audit.

## Repeatable discovery and snapshot counts

Run from the repository root:

```sh
node scripts/audit-gameplay-text.mjs
```

The [scanner](../../scripts/audit-gameplay-text.mjs) uses the installed TypeScript parser and scans `src/**/*.ts` / `tsx`. It writes [a navigable Markdown inventory](../../balance/reports/gameplay-text-audit/inventory.md) and [structured JSON](../../balance/reports/gameplay-text-audit/inventory.json) to the ignored reports directory. Regenerate those local artifacts after pulling the repository; this curated backlog is the durable record.

Snapshot: **752 source files** scanned on 2026-09-20. These are discovery
candidates in the full current source tree, not the count of remaining effects.

| Category | Candidate sites | Interpretation |
|---|---:|---|
| `.text(...)` | 442 | Includes dynamic messages, numbers, reference calls and the internal `cry` forwarding call. 395 omit the kind argument. These are not all combat captions. |
| `.cry(...)` | 0 | No current call sites; the compatibility wrapper and its downstream `.text` remain. |
| `.notice(...)` | 148 | Includes world news and gameplay instructions; trace purpose. |
| `.tell(...)` | 19 | Candidate wrappers, currently Odyssey calls; overlap downstream notice output. |
| Selected authored text fields | 530 | Literal/template `announce`, `signal(s)`, `warn`, `note`, selected `…Text`, and `text` fields; may be unused or reference-only. Generic names/labels/descriptions are deliberately excluded. |
| Canvas `fillText` / `strokeText` | 112 | Includes rendering of the shared text stream, HUD, names, numbers and optional hover/readout surfaces. |

**Do not add these into a count of messages or violations.** Discovery matches call spelling, not receiver types or runtime reachability. Dynamic emitters can expand to many authored lines; data rows and consumers overlap. Aliased/computed calls, HTML/DOM templates and localization are not exhaustively traced. The first 40 families above are manually triaged entry points, not a claim that every candidate has been reviewed.

One systemic finding: unkinded floating text bypasses per-kind preferences in `drawTexts`, and the `combat` kind defaults on. Muting combat captions is therefore neither a complete audit nor a solution to the design requirement. Build the meaningful cues and retire their actual emitters.
