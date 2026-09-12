# Pact, steel and fire starting trees

`src/data/pactSteelStarterTrees.ts` completes Summoner, Juggernaut and
Pyromancer opening bars. Each ability has 15 nodes: a four-rank neutral,
two exclusive identity trunks, two independent forks per trunk, and two
independent leaves per fork. Only trunks exclude. Four points arrive at
levels 5, 10, 15 and 20; every leaf route leaves a fourth point for mixing.
Unallocated skills keep their costs, effects and damage. Neutral-only
investment preserves original delivery, effects, channel behavior and tags.

| Ability | First identity | Second identity |
| --- | --- | --- |
| Ruin | Pact Signal prepares owned minions' next spell hit | Venom Seeker homes and poisons |
| Bind Familiar | Pact Keeper adds ally healing to the single companion | Rift Conductor replaces its bolt with piercing Rift Lance |
| Essence Drain | Contagious Essence pierces and spreads decay | Borrowed Time retains decay ticks and banks an expiry rupture |
| Piledriver | Twin Foundations commits to two Fury-generating blows | Anchor Pile pulls and staggers enemies |
| Reckoning | Measured Sentence spends exactly one Fury | Fury Cascade spends the bank for a repeat train |
| Stone Skin | Bristling Cuirass adds thorns and attack damage | Stone Legion grants the blessing to nearby allies |
| Flame Arrow | Kiln Arrow conducts and carries allied ground | Ember Fan fires a spreading, burning volley |
| Ignite | Slow Pyre prolongs and spreads ticking burns | Powderheart banks burn damage into a fixed-fuse detonation |
| Pillar of Flame | Walking Kiln follows its caster after activation | Triune Pyres places three closing rings |

## Shared contracts

- `SkillTreeNode.over.chargeCost` replaces the complete spender contract.
  `instanceChargeCost` resolves socket spender, then tree spender, then base.
  The cast gate, actual payment, damage multiplier, projectile and repeat
  counts, and UI already read that resolver. Repeats inherit the paid damage
  multiplier, consume no further mana or Fury, and cannot schedule themselves.
  Measured Sentence fails before payment when empty. Fury Cascade works at
  zero charges; its damage tradeoff still applies. Piledriver's ordinary
  per-use gain runs on both beats, so the pair banks four Fury, subject to cap.
- `over.ground.follow: true` is a narrow ground-delivery override. Minting
  reads `instanceDelivery`; the existing field update follows the caster's
  center during its active lifetime. Original delay, hollow fill, lifetime
  and tick interval survive. This is a worn ring, not a moving target offset.
- Pact arts live in `src/data/pactSkills.ts` and cannot drop as loose gems.
  Pact Keeper retains Unmaking Bolt; Rift Conductor replaces it through
  ordinary crew rules. Neither changes the one-familiar cap, 24-mana
  reservation, five-second replacement clock or toggle behavior. Healing AI
  excludes downed allies and other floors before choosing the most wounded
  eligible ally. Healing chains use normal recipient exclusions and falloff.
- Pact Signal uses the existing minion-buff recipient rule. It blesses owned
  minions on cast, not on bolt impact; only a landed spell hit consumes each
  minion's preparation. It does not require a Guardian Bond. Offering Share,
  if independently invested, keeps its ordinary caster-sharing behavior.
- Ruptures now snapshot `ruptureRadius` from the applier's area investment.
  Their fallback radius remains 90. Reapplications preserve the larger
  invested radius and the original fuse while adding banked damage; status
  transplants preserve radius. Radius supports therefore work on the new
  area-tagged expiry paths. Ruptures retain the existing resistance and
  victim-team/floor checks; tick leech does not leech detonation damage.
- Kiln Arrow uses existing conduction/suffusion: allied fields qualify,
  including another player's field. The carried echo uses the source skill,
  75% source radius (minimum 30), 60% source field damage, and a short lifetime
  capped at 2.5 seconds. It is a filled field with its own 0.4-second cadence,
  not a copy of the source's hollow geometry. The arrow caster owns the echo.
- Tree changes retire the caster's old projectiles and pending repeats,
  fields and temporary blessings. Captured ground is removed from that
  caster's remaining arrows, preventing delayed replanting after respec.
  Summon respecs dismiss toggled contracts as well as bodies and queues,
  releasing their reservation. Spending another point keeps the active
  contract and rebuilds its familiar with the invested kit. Other casters
  keep their work.

## Verification

`balance/probe_pactsteelstartertrees.ts` exercises all 72 terminal routes
through the real engine, all budget milestones, mixed forks and both leaf
orders, save/network reconstruction, companion healing and replacement,
Fury payments and repeat counts, buff recipients, fixed-fuse detonations,
moving and carried fields, and respec cleanup. It is part of the fast probe
gate. Also run `npm run check`, `npm run sim -- run --suite smoke`, the fast
probe gate, production build, and real Electron tree-panel checks for all
nine abilities. These are deterministic correctness checks; encounter tuning
remains subject to playtesting, especially the fully banked Fury train.
