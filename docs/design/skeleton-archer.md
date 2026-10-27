# Skeleton Archer: firing squads and elemental souls

The fifteen-node tree is authored in src/data/skeletonArcherTree.ts. Crew arts
and the shared school table live in skeletonArcherSkills.ts. This pass keeps the
existing node IDs, exclusive trunks and four-point branch budget. Display names
can change without remapping saved allocations, skill IDs or status IDs. Unpicked
Summon Skeleton Archer still raises one permanent archer, up to two.

## Physical trunk

- **Barbed Bones:** physical arrows apply Lodged Splinters after landing. Each
  stack grants 4% extra physical damage to subsequent barbed arrows, bone
  mortars and Rain of Bones strikes. Thirty stacks fit; each accepted stack
  lasts five seconds independently. Reapplying at cap cannot refresh the bank.
  The summon count, base cap and base cost retain their ordinary values.
- **Rising Ranks:** converts the host into a real held channel. The first archer
  rises after 0.1 seconds, then one every 0.25 seconds, adjusted by cast speed.
  Recruitment is 4.8 times as frequent as the previous 1.2-second cadence.
  At baseline speed, two ranks fill in 0.35 seconds and four in 0.85 seconds;
  an ordinary summon still takes one second and has its native 2.5-second
  cooldown. `SKELETAL_FORMATION_TUNING` owns the pace and price together.
  Archers occupy alternating flanks and fire in the caster's facing, even
  without a target. They use ordinary minion attack speed and skill cooldowns.
  The channel is immobile by default and has no time limit; its mana cost is
  97% lower per paid beat (rounded up to 1 mana before other investment),
  keeping baseline sustained drain near its previous level: 4 mana per second
  instead of about 4.17. Cost additions and multipliers still compose normally.
  Full ranks stop spawning and continue firing and paying. Native summon-count investment can
  increase a birth beat; Grave Legion itself never does.
- **Parting Volley:** releasing at the current effective cap fires each living
  member's primary art at triple damage and twice the projectile/blast size.
  The bodies then retire silently. Early release gives no finale. Interrupted,
  dead, unseated, respecced and zone-retired formations also give no finale.
  The ordinary resource-exhaustion release can pay out when already at cap.
- **Bone Mortars:** replaces archers with visibly equipped mortarmen. Each
  shell takes 0.65 seconds to land and explodes within 65 units. The ordinary
  bombardment uses 9–15 physical base damage and 1.4 seconds of attack time.
  Parting Volley empowers the actual mortar art, retaining support investment.
- **Grave Legion:** multiplies the entire effective cap by two, including
  flat slots from gear and supports, without adding bodies per cast.
- **Rain of Bones:** teaches the separate Rain of Bones art on its native
  eight-second cooldown. Formation members prioritize it when ready and fire
  ordinary attacks between rains. The old combined damage/area/bleed bonus is
  removed.
- **Fanned Volley:** adds two attack projectiles, preserving a central straight
  shot. Storm-based mortars and arrow rain gain two strikes through their
  corresponding count stat. The saved node ID remains cruel_rain.

## Elemental trunk

Unstrung Sorcery retains its base population and unioned random element pool.
Gathered Malice replaces each native bolt with a periodic empowered version.
Every fourth completed bolt deals double damage, is 1.8 times as large, and
applies four seconds of its own elemental damage over time at 35% of hit damage
per second. Each actual mage/skill instance keeps its own cycle. An interrupted
windup does not count; misses do. Repeats inherit the captured cast and never
advance the counter. This replaces the old extra body/slot bonus.

Grave Tempests teaches each school a three-second, interruptible area channel:
Rain of Fire, Blizzard, Thunderhead or Venom Rain. It pulses at a fixed target
area every 0.5 seconds with a 10-second recovery after release. School effects
use distinct impact materials. This replaces the old critical-strike bonuses.

Ember, Rime, Storm and Venom Souls still select their respective mage forms,
and now teach that form Fire, Frost, Lightning or Poison Nova. Novas have a
190-unit radius and seven-second cooldown and apply their matching ailment.
Multiple legal selections union; pick order cannot choose a winner.

## Shared contracts and attribution

SummonDelivery.channelFormation supplies the cast-mode conversion, channel
specification and placement dials. channelFormationRelease is a separate
composable enhancement. ChannelFormations binds bodies to an exact cast object;
no runtime branch names a tree node or Skeleton Archer. It uses the ordinary
summon capacity, spawn, collision, skill casting and silent-retirement paths.
Projectiles and mortar landings retain the actual minion, keeper and source
skill after that minion has crumbled. Birth and retirement use existing summon
presence cues. Formation bodies follow their keeper's terrain tier.

SkillDef.castSequence describes periodic captured payloads generically. Its
extra status effects participate in support mechanism admission. StatusDef's
independentStacks and hitVulnerability fields describe separate stack clocks
and scoped typed hit bonuses. Cleanse removes matching timer entries as well
as visible stacks. Existing statuses keep their old refresh behavior.

Support forwarding keeps the established **Resonance** requirement. The shared
crew census and live forwarder resolve each current art separately: area-only
supports can board learned Rain of Bones without affecting an ordinary arrow;
projectile supports can serve both. Mortar transformation changes this census
because the primary art itself now has area. Mage schools expose only their
own learned novas and weather spells. Catalogue definitions remain immutable.

## Verification

Run npm run check, the skeletonarcher and nestednecromancer probes, the existing
necromancertrees/Cleave/component/support regressions, skillflights and
skillvisuals, and npm run sim -- run --suite smoke. Build before running
balance/skeleton-archer-ui.cjs for a hidden disposable client walkthrough and
captures. These numbers are the initial playable tuning, not a final balance claim.
