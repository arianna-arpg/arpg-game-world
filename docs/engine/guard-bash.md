# The Shield Bash — a guard's release-blow, as data

**The rule this lane exists for:** nothing about the blow is bespoke. The
payload, the arming line, THE ARM CLOCK, which guards speak at all, who taught
them, and which way the mathematics points are ALL data — a support, a
passive, an affix or a buff can move any of it, and the guard bar's tic and
meter follow live.

## The contract

A guard stance (`castMode 'guard'`) released **at/past the arming line** and
**past the arm clock** converts into a blow in `bash.arcDeg` around the facing
(≥ ~342° reads as a full circle — Ice Shield):

```
ready    =  held seconds ≥ arm clock  AND  shield on the armed side of the line
payload  =  qualifying shield health  ×  bash.mult  ×  bashPower stat
element  =  the skill's fire/cold/lightning tag (granted tags count),
            else physical
```

A release that is not ready is a plain drop: the stance ends, the cooldown
stamps, no blow. The payload then rides the ORDINARY damage roll
(`rollSkillDamage` folds it in as flat typed damage), so elemental/spell/tag
`damage` modifiers, crits and conversions all scale it. An ice shield's burst
is a true cold hit; a gem that grants the stance `fire` makes it burn.

## The arm clock (2026-09-16)

**The problem it answers:** with only a LINE to arm on, a freshly raised wall
was always armed — Shield Up could be pressed and released in one frame as an
instant-cast damage blast, and the guard itself was never held. The clock
makes the hold the price: **a bash is earned by standing the wall.**

- `GuardBashSpec.armTime?` — the per-skill clock (seconds). Absent = the
  shared default.
- `BASH_CFG.armTime` (engine/skills.ts, **1.0**) — the shared default every
  bash reads. The one tune point for the feel of the discipline; the three
  bash-bearing descriptions say "a second", so retune them with it.
- `bashArmTime` stat (base 1, min 0) — × the spec's clock = the live clock.
  Lower readies sooner; a tree node, gem, affix or buff can grant it (none
  in the catalog yet — see *Owed*).
- `CastingState.bashArmAt` — the resolved clock, written ONLY by
  `World.refreshGuardBash` beside `bashAt`/`bashLow`, every held tick (a
  buff landing mid-stance moves the clock the same frame). Undefined = no
  bash rides this stance.
- **`guardBashReady(cs)`** (engine/skills.ts) — THE READIED READ:
  `{ clock, armed, line, ready }`. `clock` = held ÷ arm clock (1 when the
  clock is 0), `armed` = the clock has run, `line` = the bar test (inverted
  contract included), `ready` = both. The release check, the renderer's
  meter + tic, the AI's hold and the co-op client all call this ONE fold on
  the same fields, so drawn == tested on both sides of the wire.

**What the clock does NOT gate — by construction:**

- **A break is not a release.** `bashOnBreak` (Ice Shield's dying burst)
  fires when the wall is broken, whenever that happens: a burst that took
  the enemy's blows to earn was never a quick-fire.
- **The answering family beyond the stance** — a guard-tagged charge's
  arrival, a leap's landing, a construct's death/expiry, a toggled shell's
  drop — has no hold to clock and pays exactly as before.
- **The parry window** (`guardParry`, the first fraction of a second) and
  the **guard pulse** are the stance's other payoffs and run on their own
  clocks; the arm clock only decides whether the RELEASE speaks.

A timed stance (`GuardSpec.maxDuration`) shorter than its clock could never
arm; validate.ts warns at boot (and a negative clock is refused the same way,
innate or taught).

## The pieces

- **`GuardBashSpec`** (engine/skills.ts) — `mult`, `range`, `arcDeg`,
  `stunChance?`, `knockback?`, `threshold?`, `armTime?`. Lives in two seats:
  `GuardSpec.bash` (innate) and `SupportDef.guardBash` (taught).
- **`guardBashSpec(inst)`** — THE effective-bash read: innate wins, else
  the first socketed graft. Release, break and the HUD tic all go through
  it; there is no second opinion. A taught bash wears the same clock.
- **`BASH_CFG.releaseFloor`** (engine/skills.ts, 0.25) — the default arming
  line every bash shares unless its spec overrides `threshold`.
- **`BASH_CFG.armTime`** (1.0) — the default arm clock every bash shares
  unless its spec overrides `armTime`.
- **The stat family** (engine/stats.ts):
  - `bashPower` (base 1) — payload multiplier. Reckless Rampart's crank.
  - `bashFloor` (base 1) — × the spec threshold = the LIVE arming line.
    Answering Wall ships −20%.
  - `bashArmTime` (base 1) — × the spec clock = the LIVE arm clock.
  - `bashInvert` (>0 = on) — mirrors the whole contract, see below.
- **`World.refreshGuardBash`** — the one resolver. Runs at stance mint and
  every held tick; writes `CastingState.bashAt` (bar fraction), `bashLow`
  (inverted read) and `bashArmAt` (the clock). The release check, the
  renderer's decorations and the co-op wire (`CastW.bashAt/bashLow/
  bashArmAt`) read exactly these fields through `guardBashReady`, so what
  the bar shows is what the release decides — they cannot disagree.

## The tic and the meter (the HUD contract)

The overhead guard bar (renderer.ts cast-bar decorations) draws:

- **THE ARM METER** — a thin bar ABOVE the guard bar (the capped-channel
  idiom) filling left to right as the held seconds walk to the clock, in
  the skill's color. Hidden when the clock is 0.
- **THE BASH TIC** — the white tic at `cs.bashAt` with a faint underline
  along the ARMED side: right of the tic normally, left of it inverted.
  While the bash is not ready the tic and underline sit DIM.
- **THE READIED GOLD** — the moment `guardBashReady(cs).ready` holds (clock
  run AND wall on the armed side), meter, tic and underline turn gold
  together. Gold means go; nothing is written.

**No tic = no bash rides this stance** (a mute wall reads mute; socket an
Answering Wall and the tic + meter appear). Because the resolver reruns per
held tick, a buff landing or lapsing mid-stance moves the tic and the clock
the same frame. Enemy guards draw all of it too — the tell is honest in both
directions: the meter above a Warden's bar says when its bash becomes
possible, before its warning ever begins.

## The AI (the shield hand's hold)

Monsters cast guards through the same door, so the clock binds them the same
way — and the mind reads the same readiness the player's meter shows:

- **`World.aiHoldOf(cs)`** — the AI's effective hold on a held cast. For a
  guard whose bash rides the stance with the wall on the armed side of its
  line, the rolled hold EXTENDS to the arm clock, so the release converts
  instead of dropping a mute wall. A wall battered below its line has no
  answer to wait for and drops on its roll — pressure de-arms the wait the
  same tick. One fold for the held/release tick and the warning's
  remaining-hold read.
- **`BehaviorSpec.guardRelease: { windup?, hold?, waitToArm? }`**
  (engine/brain.ts) — `windup` is the visible planted commitment before an
  armed release (unchanged; the warning now begins when the clock's
  remainder equals the windup, and is owed only to a release that WILL
  convert); `hold` is an authored `[min, max]` hold roll in place of the
  generic channel/guard roll; `waitToArm: false` opts the hand OUT of the
  extension — the skittish wall that flickers its guard on the roll and
  rarely answers (an early drop is bashless and never warned). Copied onto
  the cast at press (`aiGuardEarly`, `aiHold`); seats clear every AI field
  the moment a player takes the body.

Design notes: `docs/design/shield-defender-balance.md`.

## Inversion (Hollow Answer)

With `bashInvert` > 0 the contract mirrors: armed **at-or-below**
`1 − line`, payload = `maxShield − shieldLeft` — the blow measures what the
wall has LOST. A pristine release says nothing; ride the wall low and cash
everything it took, but the break races you (a broken stance is not a
release — only `bashOnBreak` guards burst on break, and there the numbers
agree by construction: a broken wall has lost its full capacity). The arm
clock applies unchanged: battered AND held.

## Who speaks innately (the guard-hall differentiation)

| guard             | bash    | clock | identity instead                          |
|-------------------|---------|-------|-------------------------------------------|
| shield_up         | 0.7     | shared | THE teaching guard — wall, then answer   |
| marching_bulwark  | 0.8     | shared | the phalanx-step; the advancing shove    |
| ice_shield        | 0.5 + bashOnBreak | shared (release only) | the caster burst — cold-scaled, bought back with investment |
| spiked_bulwark    | —       | —     | thorns attrition (the wall never swings)   |
| defiant_bulwark   | —       | —     | the rolling taunt pulse holds court        |
| stone_communion   | —       | —     | the poise→guard pump; lowering it is a rite ending |
| runeward          | —       | —     | +spell damage behind the wall (guarded casting) |
| riposte           | —       | —     | the parry window IS the answer             |

The mute walls are one socket from speaking: **Answering Wall**
(`guardBash` graft + `bashPower`/`bashFloor` mods) teaches a bash where
none exists and makes an innate one hit harder — one gem, both reads, no
duplicate. **Hollow Answer** grants the inversion (as a STAT on purpose —
a passive node or affix can mint the same lane with one modifier row).
Every bash-bearing stance reads the SHARED clock today; the per-skill
`armTime` is the differentiation channel this pass opened, deliberately
left level until the feel of the shared value is settled.

## Owed (her word)

- **The clock's value.** 1.0s is the first-pass feel; "a second or two" was
  the brief. `BASH_CFG.armTime` is the one dial (and the three descriptions
  that say "a second").
- **Per-skill clocks.** Marching Bulwark (mobile, thinner) and Ice Shield
  (rooted, 360°) are the obvious candidates for a different `armTime`.
- **Granters of `bashArmTime`.** The stat is registered, seated and probed
  but no catalog row grants it yet. Natural homes: Shield Up's *Loaded
  Bash* / Lancer's *Easy Answer* (the "readies sooner" nodes), Answering
  Wall's mods, or an "of Readiness" affix family.
- **Monster dials.** Every guard-bearing monster wears the default
  (wait-to-arm on the generic roll). `guardRelease.hold` / `waitToArm` are
  authored nowhere yet — the Sentinel's patient wall and a skittish goblin
  shieldbearer are the first two rows to write.

## QA

- `balance/probe_bashclock.ts` — THE ARM CLOCK end to end: the pure readied
  fold, early vs held player releases, the stat and per-skill dials, the
  taught + inverted contracts, the break burst's exemption, the AI's
  wait-to-arm / early / authored-hold policies and de-arming pressure, the
  wire row, the catalog census.
- `balance/probe_guardbash.ts` — the bash lane end to end on the real engine:
  arming line honored both ways, graft teaching, inversion payload,
  bashFloor movement, cold typing, tic fields (its releases now hold past
  the clock, so only the LINE decides them).
- `balance/probe_wardenbalance.ts` — the AI's warning/commitment rigs, each
  walking the clock to the warning first.
- `balance/probe_bashcontact.ts` — the blow's damage/control/attribution on
  an `armTime: 0` def copy (the per-skill lever isolating the contact).
- validate.ts warns at boot on: out-of-bar thresholds (skill or gem),
  negative clocks (skill or gem), a bash whose clock outlasts its
  `maxDuration`, `bashOnBreak` with no innate bash, and a `guardBash` gem
  missing its 'guard' requiresTags gate (the shellGraft rule: the tag fit
  is the audit — see data/graftReadSites.ts).
