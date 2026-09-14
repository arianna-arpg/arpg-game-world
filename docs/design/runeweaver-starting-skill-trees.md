# Runeweaver: a self-sufficient opening and three complete trees

The starting bar remains Invocation, Rune of Power and Warp. Previously none
of these spells could bank a rune: Invocation needed elemental fuel, while
its companions were schoolless utility spells. The class therefore needed an
outside elemental spell before its primary attack could function.

The repair is available at level one. While Invocation is seated, a completed
schoolless spell such as Rune of Power or Warp banks a **Glyph**. Invocation
consumes that fuel and releases a working at the aimed ground. Glyph is raw
magical force represented by the existing physical damage type; it remains
spell damage, uses spell investment, and faces physical defenses. It is not
a new damage type or an elemental wildcard. The normal rune HUD reads its
name and purple color from `RUNE_INFO`.

No class-kit, alternate-selection, account-opening or re-kindling rules change.
The separate work recording each character's selected opening can continue
to own those seams. The existing utility skills remain the actual starters.

## Fuel contract

`runeForCast` in `src/engine/invocation.ts` preserves the original fire/cold/
lightning precedence and associated Ember/Rime/Arc school map. The added
fallback requires `spell` without `attack`, `melee`, `physical` or `chaos`.
An elemental attack that already banked a school rune retains that existing
behavior; the new Glyph rule does not extend to ordinary attacks.

Fuel requires a seated invoking skill on that caster's own bar. Invocation
never fuels itself. Repeated/triggered executions do not bank; autonomous
constructs do not bank. A held eligible channel uses the existing one-rune-
per-second clock rather than banking from every pulse. A refused or interrupted
ordinary cast supplies no completed-use fuel. Warp banks at its completed
cast, before its native 0.9-second delayed displacement.

The capped bank keeps the newest runes, including after capacity decreases.
The first seated invoker owns the existing actor-level bank. It is not a new
per-instance bank or an extra saved resource. Changing an Invocation tree
clears the bank so an old alphabet cannot be carried through a respec. The
normal actor snapshot already carries rune strings, including Glyph.

All eleven existing recipe rules remain, in the same precedence order:
ordered tails, count recipes, then fallback. Glyph matches only a rule that
actually accepts its position/count, or the ordinary fallback. In particular,
a final Glyph sets physical damage even if earlier elemental runes qualify
the sequence for a larger recipe. No implicit wildcard substitution occurs.

## Opening economy

Invocation now costs **6 mana**, down from 9, because the fuel spell has its
own cost. Basic Rune Release now has **20–30 base physical damage**, up from
12–18. The stronger fallback also applies to existing elementary sequences
that select it. The larger named workings and their coefficients are unchanged.
Warp and Rune of Power retain their costs, cooldowns and requirements.

The deterministic level-one probe uses ordinary starting attributes, the
three actual starters, natural regeneration, no extra supports, no resource
refills and real cooldowns. One measured 30-second rotation completes 11
releases and deals about 421 damage to its high-life stationary target,
ending near 5 mana from a 115-mana opening pool. This establishes a usable
loop and a real mana constraint, not encounter parity or infinite sustain.
The smaller opening test inscribes Rune of Power, releases, uses Warp for
the next Glyph, then damages again without an external spell or tree points.

## The trees

Each tree has 15 nodes: two exclusive identities, two independent forks per
identity, two leaves per fork, and a four-rank neutral node. Points arrive at
levels 5, 10, 15 and 20. Sibling investments commute; unallocated behavior is
the repaired baseline described above.

| Skill | First identity | Second identity | Neutral per rank |
|---|---|---|---|
| Invocation | Prismatic Script cycles schoolless fuel Ember → Rime → Arc, advancing from the most recent rune in that alphabet. Empty banks begin with Ember. Each rune adds 15% to the working multiplier. Forks expand radius, cast fluency, stun, bank capacity, critical chance and economy. | Patient Script keeps schoolless Glyphs and raises the per-rune coefficient to 30%, with 15% less working damage. It rewards a longer bank; branches invest in physical impale, armor penetration, stun, capacity, readiness or leech. | 15% increased working damage. |
| Rune of Power | Sheltering Rune adds damage reduction to the native stationary spell circle, with healing, ailment resistance, mana regeneration, coverage and duration branches. | Wandering Rune follows the caster after placement for 30% less duration; allies can move faster, enemies can be slowed, or the scribe can invest in duration and reuse. | 12% increased circle duration. |
| Warp | Prepared Crossing grants a four-second next-spell-hit preparation at cast start. The first landed spell hit receives its bonus and spends it, including an Invocation working. | Sheltered Crossing protects both delay and arrival with a three-second defensive blessing; recovery, movement and armor branches deepen that protection. | 12% increased cooldown recovery. |

`InvocationTreeSpec` is a complete root identity (`untypedRunes` and
`damagePerRune`) read by `instanceInvocation`. The whitelisted schema cannot
change recipe priority or create a free cast. Existing recipient domains and
`TreeBuffPatch` implement the utility trees. A prepared hit is one qualifying
landed hit, not the whole duration of a multi-hit working. The physical
impale branch requires physical damage; elemental conversions preserve that
ordinary constraint.

## Invocation investment and ownership

The former payload mint discarded the host's tree/support modifiers.
`makeInvocationPayload` now snapshots the host's innate, level, threshold and
tree modifiers once, plus its admitted supports. The recipe supplies delivery
and effects, with its own default level growth disabled to prevent double
scaling. Host and recipe tags plus the closing school describe the actual
spell. The closing elemental conversion remains instance-local. Numeric
support and tree modifiers therefore reach the working, including area,
damage, leech, penetration and status investment. This does not promise a new
repeat/trigger behavior for Invocation; its existing one-bank/one-release
rule and non-recursive payload execution remain.

The transient `invocationHost` pointer records the exact investing instance.
Tree retirement removes its pending fuses/repeats, projectiles and ground/
storm fields, while preserving another caster's or another host instance's
working. Snapshots do not mutate the catalog or change when the original
host's picks/sockets are edited. Warp tree retirement also cancels its pending
displacement along with its blessing, so an old allocation cannot teleport
the player after a reset. Rune circles use the existing field source cleanup.

The live skill preview uses the same fuel and payload helpers for alphabet,
bank/capacity, chosen working and damage-per-hit range. Empty-bank text tells
the player to weave first. The two registries that validate tree overrides
now admit and validate both Invocation and the already-supported aura patch.

## Verification

`balance/probe_runeweaverstartertrees.ts` covers all 24 terminal casts, full
milestone budgets, exclusions, sibling commutation, neutral transparency,
save/network tree rebuilding, fresh opening and sustained casting, fuel
eligibility, no rebanking, channel pacing, capacity, recipe preservation,
actual host damage/support inheritance, preview, release snapshots, all six
native delivery families, source-specific cleanup, delayed Warp cancellation
and real circle movement/recipient cleanup. It is in the fast probe roster.
Type checks, focused and full probes, balance smoke, production build and
hidden real-game UI checks accompany the integrated Runeweaver/Resonator batch.
