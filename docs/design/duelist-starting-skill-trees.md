# Duelist starting-skill trees

Swashbuckler, Matador and Sharper have complete three-skill starting bars:
nine trees, 135 nodes, four points at levels 5/10/15/20. Each has a four-rank
neutral passive, two exclusive identities, two forks per identity and two
mixable leaves per fork. Unallocated delivery, timing, damage and effects stay
unchanged. Neutral investment does not replace delivery, timing or effects.

| Class | Skill | First identity | Second identity |
|---|---|---|---|
| Swashbuckler | Buckler Strike | Bleeding flank cuts and lodged steel | Wider left-then-right sweeps |
| Swashbuckler | Wild Strike | Wide wandering slivers and mobile sustain | Narrow slivers and held damage ramp |
| Swashbuckler | Dash Strike | Bleeding, impaling contacts | Defensive passing blessing |
| Matador | Planted Banderilla | Parallel crowd taunts | Bleeding, impaling challenge |
| Matador | Cape Feint | Prepare the next landed melee hit | Brief defensive escape blessing |
| Matador | Perfect Strike | Execute taunted enemies | Broad sweeping finale |
| Sharper | Thrown Ace | Parallel four-suit cards | Returning card with ailment investments |
| Sharper | Stack the Deck | Share luck and cooldown-rate blessing | Spend the blessing on one attack hit |
| Sharper | Quiet Step | Share reduced threat and detectability | Cover that protects against one hit |

The trees use shared modifiers, projectile delivery and temporary buff
patches. No class-specific execution branches are added. Shared blessings
use caster/team/story/radius eligibility, include minions and exclude
constructs and downed actors. Quiet Step remains reduced presence rather than
invisibility. Shared Table increases cooldown recovery while worn; it does
not perform PS-01's proposed instant ally cooldown reduction.

Cape Feint keeps its phasing dash and actual afterimage; its preparation is
melee-only, so the non-melee dash cannot consume it. Dash-start blessings are
explicitly described as starting the dash, not as rewards for hitting. The
shared dash-decoy spawn now records its source instance and caster story,
allowing existing respec cleanup to retire the correct afterimage.

## Wild Strike expansion

The seven original node IDs remain valid, with the original narrow/wide
geometry, Cloudburst attack speed, Firm Wrist bonuses, Monsoon stride ramp
and Long Point damage ramp. Scalar identity now lives on the exclusive
trunk, while descendants inherit it. The old root/fork/leaf walks still
allocate in their original order. Economy of Motion now grants 5% channel
mobility and 8% increased damage per rank, up to four ranks; its former
single-rank 15% mobility changes deliberately. No save-version reset is
needed: picks remain valid and derived behavior rebuilds normally.

The graph exposes limb IDs `ws_sprinkler` / `ws_duelist`, replacing the sugar
form's `sprinkler` / `duelist` IDs in the support census. Eight existing
support-matrix debt rows retain their evidence and status under the renamed
limbs. The canonical census allocation is the normal four-node breadth-first
walk; focused tests additionally exercise every terminal route and legacy
walk. Sugar-form coverage remains in the general skill-mode probe.

## Packed Workshop: PS-02's first shipped interaction

Packed Workshop grants **Reposition Workshop** on Shift-press for native aimed
totems and sentries. It is available in the Trapper bundle. Supported devices
last 15% less time. Reposition is an ordinary skill with 6 base mana cost and
a 4-second base cooldown, subject to the caster's normal cost/recovery rules.

One use chooses the nearest living device within 600 units belonging to the
exact host skill instance and caster, on the same team and story. It moves
that actor to the aim, clamped by the host's native/resolved placement range
and the destination's walkable floor, and turns it toward the new lane.
The host must still be on that caster's bar and grant the meta action.

Health, maximum health, remaining lifespan, payload, use lock, cooldowns and
construct clocks remain intact. The current cast and shove are cancelled;
existing projectiles remain in flight. No actor is replaced, no deployment
or arrival effect repeats, and no death/expiry reward or refund fires.
No eligible device means no payment or cooldown. The ordinary cooldown is
shared by the reposition skill ID, so switching host copies does not bypass
it. Meta instances carry a runtime exact-host reference, reminted when a
different same-skill instance uses the action. Save/network reconstruction
restores the support; a fresh meta press derives its own reference.

The hidden game test also exposed Shift+number producing punctuation instead
of a slot key. Input now retains the typed character for custom bindings and
adds the physical number-row alias while Shift is held. Physical press
tracking clears both on release even if Shift is released first; numpad and
unshifted layout-specific keys retain their typed behavior. The focused
`balance/probe_metaslotinput.ts` verifies these event sequences.

This intentionally excludes pylons, mines, traps, walls, pods, relics, echoes,
planted embeds and minions. The [central backlog](skill-support-candidates.md#ps-02--device-salvage-and-relocation)
records the overlap audit and concrete salvage plan.

## Verification

`balance/probe_dueliststartertrees.ts` covers all 72 terminal routes through
actual casts, budgets, neutral transparency, sibling order, save/network
rebuilds, hit consumption, shared eligibility, timing bonuses, projectiles,
afterimages, impale banks and cleanup. `balance/probe_deviceworkshop.ts`
covers real deployment and relocation for every eligible native skill,
exact-instance ownership, foreign actors, story/range/retirement refusals,
payment, shared cooldown, unchanged clocks, cancelled casts, post-move sentry
attacks, ordinary expiry, save/network reconstruction and respec.

The full probe gate, game/launcher/sim type checks, balance smoke, production
build and Packed Workshop support-matrix slice accompany this batch. A hidden
Electron pass uses isolated account/run storage and checks all nine rendered
trees and their allocation controls, plus the new meta action in the game.
