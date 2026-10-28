# Bone Golem: fighting frames and living protection

The unallocated summon remains one reserved, persistent Bone Golem with its normal eight-second reconstruction. All mutators cost one point; Fitted Joints retains four passive ranks. The two exclusive branches retain the binary layout and four-point ability budget.

## Fighting branch

- **Osseous Juggernaut** teaches autonomous Bonebreaker and increases size. It grants no command.
- **Ribcage Arsenal** releases a three-projectile barrage after every third landed primary attack, and a complete projectile ring after each completed Bonebreaker.
- **Sacrificial Frame** pays 3% maximum life as an attributed self-hit per originating attack and adds twice the life paid as physical damage. Each completed Bonebreaker reduces the next reconstruction by 12% of base time, with a 20% floor. Reconstruction consumes those credits.
- **Assembled Legion** gives hits, including paid self-hits, a 25% chance to shed one living member per parent. Death adds two more. Offspring share six temporary slots, last eight seconds, and have 35% life, 45% damage and half size. They neither divide nor reconstruct.
- **Siege Frame** adds life and size and makes real movement produce Trampling Advance contacts.
- **Ossuary Commander** grants nearby allies one Warcall after a landed Bonebreaker: 25% more damage on the next damaging action, with a per-recipient recovery.
- **Cataclysmic Impact** grants Crush!, a 24-second command. Normal Bonebreakers reduce its recovery by two seconds and can release Ossuary Fault on a separate ten-second recovery. It advances with empowered trampling, then casts a triple-power Bonebreaker and an independent line of Ossuary Fault impacts. Its own strike does not reduce its command recovery.

## Protective branch

- **Keeper's Bulwark** adds 25% life without a damage penalty, teaches Warding Sweep and grants Interpose!.
- **Spined Carapace** supplies Thorns, adds resolved Thorns to Warding Sweep, and answers enemy hits or actual shell absorption with Carapace Splinters.
- **Living Ossuary** wears the golem as a ribcage with a fixed forward opening: 300 degrees of rear and side coverage. Marrow Sweep has shorter base reach. Extra reserved slots strengthen one worn body instead of producing overlapping shells.
- **Guardian's Advance** commands Rampart Rush, or the projected Rampart Wave while worn. Nearby melee minions form a wedge, receive temporary damage immunity, and contribute authored, size-scaled body mass. The worn frame's mass always contributes. The caster is not commanded to move.
- **Reknitting Frame** changes the active contract's primary face to Reknit. The caster channels while the golem remains autonomous and periodically taunts with Ossuary Challenge. It repairs life and, when worn, guard capacity. It has no cooldown or mana charge. The skill tree provides **Dismiss frame**; during reconstruction Reknit remains visible but unavailable.
- **Sanctuary of Bone** grants innate 5% maximum-life regeneration each second, unaffected by healing suppression. Reknit instead spends the frame's life to mend nearby allies. Strain increases the payment during continued healing and decays gradually between channels. Full-health allies are not billed. Voluntary release grants Bone Ward from actual restoration, including already-delivered supported healing streams.
- **Ossuary Reliquary** immediately places a finite protection pool at the lethal location, then preserves the frame through a bounded terminal charge and explosion. The field remains at its original location. The terminal body keeps its slot until the explosion and cannot be rescued by healing.

Legal four-point examples: Juggernaut → Arsenal + Sacrificial Frame + Legion; Juggernaut → Siege + Commander + Cataclysm; Bulwark → Spines + Living Ossuary + Guardian's Advance; Bulwark → Reknitting + Sanctuary + Reliquary. Living Ossuary plus Sanctuary requires five points and is intentionally unavailable at this budget.

## Authoring and supports

The tree is authored in `src/data/boneGolemTree.ts`; individual payload definitions live in `src/data/boneGolemSkills.ts`. `SummonDelivery.frame` composes typed mechanics through `FrameSpec`, with reference and numeric validation. `FrameArts` owns lifecycle bookkeeping; runtime behavior does not inspect node names or monster IDs to choose a build.

Each available attack, utility pulse, healing spell, ward, field and command has its own tags and support instance. Resonance forwards only applicable supports, and live resynchronization updates the payloads. The support census omits replaced repair and primary attacks. Damage, healing, area geometry, duration and recovery use the component's own context. Linked barrage/nova/fault payloads share their originating action's paid contribution rather than charging per projectile, target or repeat.

Voluntary life payments bypass immunity and defenses but remain attributed hit events. Committed attacks finish before lethal self-payment resolves death. Charge immunity clears on completion, cancellation, dismissal or timeout. Respec, dismissal, owner departure and zone changes clear frame-owned commands, fields and receipts without granting death offspring.

Run `npm run check`, `npx tsx balance/probe_bonegolem.ts`, `npx tsx balance/probe_nestednecromancer.ts`, the green probe roster, and the smoke simulation. After building, `npx electron balance/bone-golem-ui.cjs` checks the real client and saves inspection images in `balance/reports/`.


## Visual language

Living Ossuary selects the `ossuary` defense profile. Its open anatomy is authored
in `src/data/frameVisuals.ts`: a skull and spine behind the keeper, enclosing
shoulders and arms, and separate ribs. The renderer clips it to the real
directional coverage and leaves the keeper visible. Broken bones separate and
dim; rebuilding follows the actual guard pool and reform threshold. Other shell
profiles retain their existing rendering and unknown anatomy falls back to plates.

The same visual registry supplies the moving ribbed Rampart vanguard and body
cues: pale enclosing ribs for actual charging participants, a flowing caster
tether for Reknit, a warm strain indicator for Sanctuary, and a contracting
countdown around the Reliquary's terminal body. These are presentation only.
`FrameSpec.visual` and `charge.fx` select them independently of the ability kit.
The host resolves body cues for co-op; release, charge completion and death clear
them from subsequent snapshots. Ordinary ability impacts retain their own art.

The hidden UI course captures four facings, broken/reforming anatomy, the
projected escort, repair and terminal charge. It also exports
`balance/reports/bone-golem-visual-study.png` from actual game frames.
