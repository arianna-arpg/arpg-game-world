# The Shield Bash — a guard's release-blow, as data

**The rule this lane exists for:** nothing about the blow is bespoke. The
payload, the arming line, which guards speak at all, who taught them, and
which way the mathematics points are ALL data — a support, a passive, an
affix or a buff can move any of it, and the guard bar's tic follows live.

## The contract

A guard stance (`castMode 'guard'`) released **at/past the arming line**
converts into a blow in `bash.arcDeg` around the facing (≥ ~342° reads as a
full circle — Ice Shield):

```
payload  =  qualifying shield health  ×  bash.mult  ×  bashPower stat
element  =  the skill's fire/cold/lightning tag (granted tags count),
            else physical
```

The payload then rides the ORDINARY damage roll (`rollSkillDamage` folds it
in as flat typed damage), so elemental/spell/tag `damage` modifiers, crits
and conversions all scale it. An ice shield's burst is a true cold hit; a
gem that grants the stance `fire` makes it burn.

## The pieces

- **`GuardBashSpec`** (engine/skills.ts) — `mult`, `range`, `arcDeg`,
  `stunChance?`, `knockback?`, `threshold?`. Lives in two seats:
  `GuardSpec.bash` (innate) and `SupportDef.guardBash` (taught).
- **`guardBashSpec(inst)`** — THE effective-bash read: innate wins, else
  the first socketed graft. Release, break and the HUD tic all go through
  it; there is no second opinion.
- **`BASH_CFG.releaseFloor`** (engine/skills.ts, 0.25) — the default arming
  line every bash shares unless its spec overrides `threshold`.
- **The stat family** (engine/stats.ts):
  - `bashPower` (base 1) — payload multiplier. Reckless Rampart's crank.
  - `bashFloor` (base 1) — × the spec threshold = the LIVE arming line.
    Answering Wall ships −20%.
  - `bashInvert` (>0 = on) — mirrors the whole contract, see below.
- **`World.refreshGuardBash`** — the one resolver. Runs at stance mint and
  every held tick; writes `CastingState.bashAt` (bar fraction) and
  `bashLow` (inverted read). The release check, the renderer's tic and the
  co-op wire (`CastW.bashAt/bashLow`) read exactly these fields, so what
  the bar shows is what the release decides — they cannot disagree.

## The tic (the HUD contract)

The overhead guard bar (renderer.ts cast-bar decorations) draws a white tic
at `cs.bashAt` with a faint underline along the ARMED side — right of the
tic normally, left of it inverted. **No tic = no bash rides this stance**
(a mute wall reads mute; socket an Answering Wall and the tic appears).
Because the resolver reruns per held tick, a buff landing or lapsing
mid-stance moves the tic the same frame. Enemy guards draw it too — the
tell is honest in both directions.

## Inversion (Hollow Answer)

With `bashInvert` > 0 the contract mirrors: armed **at-or-below**
`1 − line`, payload = `maxShield − shieldLeft` — the blow measures what the
wall has LOST. A pristine release says nothing; ride the wall low and cash
everything it took, but the break races you (a broken stance is not a
release — only `bashOnBreak` guards burst on break, and there the numbers
agree by construction: a broken wall has lost its full capacity).

## Who speaks innately (the guard-hall differentiation)

| guard             | bash    | identity instead                          |
|-------------------|---------|-------------------------------------------|
| shield_up         | 0.7     | THE teaching guard — wall, then answer     |
| marching_bulwark  | 0.8     | the phalanx-step; the advancing shove      |
| ice_shield        | 0.5 + bashOnBreak | the caster burst — cold-scaled, bought back with investment |
| spiked_bulwark    | —       | thorns attrition (the wall never swings)   |
| defiant_bulwark   | —       | the rolling taunt pulse holds court        |
| stone_communion   | —       | the poise→guard pump; lowering it is a rite ending |
| runeward          | —       | +spell damage behind the wall (guarded casting) |
| riposte           | —       | the parry window IS the answer             |

The mute walls are one socket from speaking: **Answering Wall**
(`guardBash` graft + `bashPower`/`bashFloor` mods) teaches a bash where
none exists and makes an innate one hit harder — one gem, both reads, no
duplicate. **Hollow Answer** grants the inversion (as a STAT on purpose —
a passive node or affix can mint the same lane with one modifier row).

## QA

- `balance/probe_guardbash.ts` — the end-to-end probe on the real engine:
  arming line honored both ways, graft teaching, inversion payload,
  bashFloor movement, cold typing, tic fields.
- validate.ts warns at boot on: out-of-bar thresholds (skill or gem),
  `bashOnBreak` with no innate bash, and a `guardBash` gem missing its
  'guard' requiresTags gate (the shellGraft rule: the tag fit is the
  audit — see data/graftReadSites.ts).
