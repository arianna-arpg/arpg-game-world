# Shield Up disciplines

The original unallocated held guard is unchanged. `src/data/shieldUpTree.ts`
owns all new tuning. Saved node IDs and the four-point, two-trunk layout remain
stable. The tree grants no support grafts; the available support sockets
remain player choices.

## Iron Shelter: sustained guard

Capacity is `(base guard health + armor × 0.25) × guardStrength`. Frontal
guard interception precedes passive block in the original engine. This
discipline therefore rolls passive block chance at that interception and halves
the guard damage on success. It does not perform a second life-pool block.
Parries spend neither plates nor guard.

| Node ID | Name | Initial tuning |
| --- | --- | --- |
| iron_shelter | Iron Shelter | Armor scaling and 50% passive-block guard mitigation |
| reinforced_plate | Reinforced Plate | One plate per 2 held seconds, cap 3; 8% less damage taken per held plate; damaging guard hits consume one |
| broad_shelter | Mending Plate | Restore 12% of missing guard after spending a plate, if the guard survived |
| shared_shelter | Sheltering Pulse | Each plate tick, including at cap, heals eligible allies for 3% of their own maximum life within 140 radius |
| ready_watch | Battering March | Opening contact: 4 + 60% thorns + 4% effective weight; repeats at 35% power every 0.3 seconds; opening resets after 1 second without contact |
| sheltered_thrust | Rising Answer | Free full-capacity bash on raise, retaining the ordinary earned release bash |
| shield_pump | Bash Wake | Each bash emits a piercing wave at 45% bash power, 260 range, speed 330 |

Plates build only while the guard is held and disappear with it. Their buff
reduces body damage, including hits from behind; their explicit guard multiplier
protects frontal guard interception, which bypasses body mitigation. The
consumed plate protects its own hit. A broken guard cannot be resurrected by
Mending Plate. Healing uses ordinary `healBy`, recipient eligibility, same-story
and sight checks. Radius uses the source skill's area investment.

The ram runs from voluntary movement, after movement locks and inverted input,
before collision can stop the intended step. It requires a close enemy in the
shield's frontal arc and input directed toward that enemy. Knockback and merely
standing against an enemy never qualify. Each target retains a cooldown across
contact flicker and quick re-raises; at most one hit is paid per eligible tick,
with no backlog of damage after a stall. Normal hit resolution owns mitigation,
control, support modifiers, procs and kill credit.

Bash Wake is an authored component of the paid bash. It uses the shared cast
and projectile delivery paths, so projectile count, firing styles, flight
modifiers and supported follow-ups remain available without an additional cost.

## Measured Shelter: cast absorb

| Node ID | Name | Initial tuning |
| --- | --- | --- |
| measured_riposte | Measured Shelter | Instant cast, 8-second cooldown; 40% of guard capacity as absorb for 3 seconds |
| patient_hand | Patient Hand | After 12 seconds since the previous cast, double capacity, duration and explosion power; first cast is empowered |
| punishing_reply | Unbroken Orbit | Intact expiration grants a reflecting satellite; cap 3, each lasts 25 seconds |
| resetting_stance | Last Shelter | Automatic free shield against a lethal life wound; 300-second independent recovery |
| loaded_bash | Gathering Answer | Visible 2-second fuse, then 80% of full bash damage in 110 radius |
| unbroken_answer | Splinter Orbit | Damage break grants a contact satellite; cap 3, 25 seconds each, 20% bash damage and 0.65-second per-target contact cadence |
| hollow_counter | Hollow Counter | Damage break also bursts for 70% full bash damage in 100 radius |

“Unbroken” means surviving to natural expiration with positive absorb remaining.
Replacing, removing or clearing a shield grants no outcome. These are rolling
25-second outcome windows: each satellite expires with its own outcome, and
the fourth replaces the oldest. Neither new outcomes nor casts extend older
satellites. The shared satellite cap and ordinary satellite investment still
apply. Existing orb geometry, line of sight, arming, team/story rules and the
normal projectile reflection pipeline are reused. Reflection transfers ownership
and preserves the incoming damage types; its existing reflection limit prevents
unbounded ping-pong. Satellites use the source skill's bash scaling and supports.

The shield occupies an individually owned layer in the common absorb stage,
before the existing strongest-wins pool. Ward precedes it; energy shield and
life follow. This prevents unrelated shields from disguising a Shield Up break.
The HUD and co-op wire show total absorption. Damage-over-time can break the
shield too. The delayed explosion survives a break but is canceled by death,
removal, respec or zone change. It tracks the caster's position and visibly
fills its actual area boundary; there is no combat-caption instruction.

Last Shelter intercepts a lethal wound at the shared life-damage seam, grants
the same shield payload and spends it against that wound immediately. It works
while ordinary skill cooldowns run and costs no mana. Excess damage still
kills: this is a finite intervention, not invulnerability. Its recovery is
actor-owned, unaffected by cooldown-recovery stats, retained across respec and
zone changes, and saved on the character. Costs and scripted sacrifices bypass
the wound seam and cannot trigger it.

## Extension and verification

`GuardArtsSpec` is available on skill definitions and tree nodes. Distinct
capabilities compose across sibling nodes in deterministic order. The engine
never switches on Shield Up's name or node IDs. `guardCapacity`, `guardArtAbsorb`,
`instanceCastMode` and `skillCooldownSeconds` are shared gameplay/preview reads.
`GuardArts` owns source cleanup and bounded runtime queues. Absorb layers and
satellite projectile interception are reusable by other authored skills.

The old **Shared Shelter** (`guardAegis`) mechanic is intentionally reserved for
a future thematic shield mutation: nearby minions shelter behind the bearer's
frontal guard and intercepted damage drains that guard. Keep the existing
engine capability and support ecosystem; do not restore it to this tree.

Verification: `npm run check`, `npm run probe -- shieldup`, existing starter-tree,
guard/bash, parry and satellite probes, balance smoke, production build, then
`npx electron balance/shield-up-ui.cjs`. The hidden client writes captures under
`balance/reports/` and checks both tree viewport sizes and live mechanic cues.
Numbers are starting values for playtesting, not a completed balance claim.
