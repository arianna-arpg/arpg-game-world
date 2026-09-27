# Feeding and restoration cues

GT-025 replaces `feeds`, Amalgam's `fed` counter, `devours`, sacrificial
`consumed!` and ordinary stream `drinking...` / `sipping...` / `charging...`
captions. Implementation complete; encounter acceptance remains open.

## Visible behavior

- Scavengers chew toward the reachable corpse while eating. The small mouth
  arc follows actual eating progress; leaving that behavior clears the posture.
- Real corpse consumption, summon devouring, sacrifice and Amalgam feeding
  close a pair of jaws at the removed body and draw fragments toward the
  recipient's position at consumption. These are brief transaction traces;
  they do not chase a moving recipient or imply a delayed gameplay payout.
- Amalgam accumulates a bounded cluster of ritual fragments while its real
  channel holds consumed mass. Releasing or interrupting the channel removes it.
- Actual restoration ticks draw inward drops on the recipient and matching
  life/mana orb. Energy-shield and overmend gains use diamonds at the life orb's
  shield crown. Full pools, blocked healing and capped shields have no refill
  effect. Primed pours retain GT-021's release and then show actual ticks.

## Authoring and state

`src/data/feedingCues.ts` owns shared carrion, flesh, ritual and resource
materials, transfer lifetime/curl/count, gain lifetime, density and line weights.
`feedingCue?: { profile?, color? } | false` is available on `SkillDef`,
`RestoreOverTimeEffect`, `DevourSpec` and `MonsterDef.carrion`. Effects override
their skill; omission inherits the relevant material, unknown profiles fall
back, and `false` silences presentation without changing gameplay. No skill ID
or monster ID selects a painter. Future grafted devour and restore effects use
the same contract.

`engine/feedingCues.ts` coalesces short gain afterimages by resource/material
with a six-row bound per actor. Gains use the value actually returned by healing
or the change after clamping mana, energy shield and overmend. Reading the cue
does not spend a stream, modify resources or draw randomness. Restoration
amounts, durations, costs, caps, sympathy routing, kill credit and buffs keep
their existing paths. Ordinary regeneration and leech do not create these cues.

Consumption transfers are emitted after actual corpse removal or confirmed
summon death. Devour still uses an attributed death; quiet Amalgam/sacrifice
removal retains its original semantics. Scavenger recovery can occur while
chewing, as before, but the source transfer waits for removal. A corpse-free
cast or failed consumption cannot invent a meal.

All actor kinds serialize resolved gains, chewing and channel mass, with deep
copies of nested source/endpoint positions. Empty snapshots clear stale cues.
Transfers check both endpoint stories against covered-floor visibility; body
cues inherit normal body visibility and pose. HUD cues follow the relevant
local seat. Dead/downed bodies suppress gains; zone transitions clear old
afterimages, and stream completion leaves only a quarter-second fade.

## Verification and playtesting

Run `npm run check`, `npm run probe -- feedingcues`, the corpse, flasktrees,
sympathy, necromancercourts, tells and payloadcues probes, and the smoke
simulation. After a build, `electron balance/feeding-cues-ui.cjs` captures
actual consumption paths, full versus recovering pools, shield conversion,
dark/bright ground, compact HUDs, covered stories and co-op using disposable
saves in a hidden window.

In-game acceptance: distinguish an eating creature from one merely near a
corpse; recognize consumed mass before Amalgam releases; read which resource
actually fills; check that clustered summons and overlapping streams remain
quiet enough to read danger. Tune shared profiles after this encounter pass.
