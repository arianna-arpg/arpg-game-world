# Shield defender counterplay

Sylvan Wardens keep their frontal shield and heavy defensive identity, but
their warning, committed facing and recovery create dependable opportunities
to flank. Stone Sentinels use the same behavior at a slower pace.

## Balance data

| Lever | Sylvan Warden | Stone Sentinel |
|---|---:|---:|
| Innate turn speed | 2.1 rad/s | 1.7 rad/s |
| Half-turn time | 1.50 seconds | 1.85 seconds |
| Attack alignment half-angle | 0.6 radians | 0.55 radians |
| Bash warning | 0.55 seconds | 0.65 seconds |
| Bash arm clock (shared `BASH_CFG.armTime` × `bashArmTime`) | 1.0 second | 1.0 second |
| Recovery after a completed cast | 0.65–0.90 seconds | 0.70–1.00 seconds |

The Warden's armor changes from 45 to 32, passive block from 15% to 8%, and
its `bashPower` multiplier becomes 0.65. An unmodified level-one full-shield
release therefore supplies 27.3 physical damage instead of 42 before target
mitigation. Skill levels, shield depletion and ordinary modifiers still scale
that result. Its life, poise, guard capacity, lance variant and shared Shield
Up skill remain intact. Its first-engagement reaction is 0.30–0.55 seconds.

Wardens begin rolling their existing 50% bulwark-doctrine chance at level eight.
This prevents an early random +70 armor doctrine or replenishing conduit from
making an ordinary first encounter unexpectedly durable. Veteran variety still
comes from the same player choice pool.

## Reusable AI commitment

`BehaviorSpec.guardRelease: { windup?, hold?, waitToArm? }` opts any autonomous
guard user into a warning before an armed release (`windup`, seconds), an
authored hold roll in place of the generic one (`hold`, `[min, max]` seconds),
and the arm-clock policy (`waitToArm`, default true). The resolved tuning is
copied at press; no enemy-name checks or duplicate shield skill are involved.

THE ARM CLOCK (2026-09-16, `docs/engine/guard-bash.md`): a bash is earned by
the hold, for monsters exactly as for players. While a bash rides the stance
and the shield sits on the armed side of its line, `World.aiHoldOf` extends
the hand's hold to the stance's arm clock (`GuardBashSpec.armTime`, default
`BASH_CFG.armTime`, × the caster's `bashArmTime` stat), so a Warden with a
short roll still releases WITH its answer, and the warning begins when the
clock's remainder equals the windup. A wall battered below its line has no
answer to wait for and drops on its roll; `waitToArm: false` drops on the roll
regardless (a bashless early release, never a warning). The overhead arm meter
draws on enemy guards too, so the moment a monster's bash becomes possible is
readable before its warning ever begins.

During the final portion of a qualifying guard hold, a fixed sector shows the
actual bash reach and arc while the shield/body load backward. GT-011 retires
**Bash incoming!**; [warning cues](warning-cues.md) documents the live shared
presentation. The guard plants its feet and locks its facing for the full warning. Target
tracking cannot rotate that commitment, and normal AI skill selection cannot
insert a guard-combo poke inside it. External forces can still move the body.
The warning occupies the end of the normal hold instead of adding extra shield
uptime. An unexpectedly early armed release still owes a full warning.

The shield remains active and damageable during the warning. Its arming line
and remaining shield health are checked again at release: pressure can de-arm
the bash, breaking the shield cancels it, and a stun interrupts the cast.
A shield already below its arming line drops normally without a false warning.
The ordinary post-cast recovery begins only after release.

`guardRelease` remains an available tell source. Warden and Sentinel now use
the shared live warning posture and footprint, including immediate removal
when pressure de-arms the payload. Co-op receives resolved geometry/progress.
No independent delayed attack survives when the guard is gone.

An omitted or zero windup retains an unwarned release, on the (clock-extended)
hold. Player-driven shields answer to no AI commitment, including when
possession transfers a pending warning body to a player seat; the arm clock
binds them exactly as it binds the monster. Authored guard pulses and support triggers retain their own
behavior; the warning only commits the autonomous guard release.

## Doctrine progression

`MonsterBoon.minLevel` is an optional minimum monster level. Below the gate no
chance or option roll is consumed. At and above it the usual chance, distinct
option selection, modifier attribution and conduit/graft rules apply. Omission
means level one. This is independent of skill grants and spawn presence.

## Verification

The bash contact's knockback and stun now enter the ordinary hit-effects
pipeline together with its damage. Guard/shell interception, passive block,
evasion and immunity refuse the complete hit. A fuse delays all components;
there is no early shove or stun. These effects use the normal status and
knockback modifiers, resistance rules, mass handling and source attribution.
`balance/probe_bashcontact.ts` covers these contracts, including raising a
shield during the fuse and a caster dying before its delayed hit arrives.

`balance/probe_wardenbalance.ts` exercises the real guard pipeline at 30/60/120
Hz, fixed warning duration, planted/committed facing, flanking, dynamic arming,
shield break, stun cancellation, player and possession exemptions, body tells,
live AI tuning, bash damage, and the exact doctrine-level boundary. Its rigs
walk the arm clock before every warning; the clock's own contract (early vs
held player releases, the stat and per-skill dials, the AI's wait-to-arm,
early and authored-hold policies, the wire row) lives in
`balance/probe_bashclock.ts`.

Run `npm run check`, `npm run sim -- run --suite smoke`, and `npm run probe`.
Hands-on focus: one Warden versus overlapping pairs, frontal shield pressure
versus circling, lance-bearing variants, and veteran doctrine combinations.

### Seeded comparison

Five seeds per row (`baseSeed: 0x5a17`), starter warrior/magician builds,
140-unit spawn ring, 60-second limit, normal rarity, parity monster levels.
The control restores the Warden's definition from before this pass on the same
engine; the final variant includes the warning within the normal hold.

| Encounter | Prior player deaths | Current player deaths |
|---|---:|---:|
| Level 5 warrior, one Warden | 0/5 | 0/5 |
| Level 10 warrior, two Wardens | 3/5 | 0/5 |
| Level 5 magician, one Warden | 3/5 | 0/5 |
| Level 10 magician, two Wardens | 5/5 | 5/5 |

Incoming DPS fell in every row. The early warrior's mean clear time increased
from 19.76 to 21.30 seconds, while the early magician improved from 22.35 to
18.03 seconds (the prior magician cleared only two of five, so that timing is
survivor-biased). The later caster pair remains a hard matchup. These small
samples are diagnostic, not a difficulty guarantee; the simple pilots do not
deliberately read and flank the new warning. Full report is generated locally
at `balance/reports/warden-balance-comparison.json` (gitignored).
