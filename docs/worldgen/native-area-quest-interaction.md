# Native area quest interaction

NativeAreaSceneQuestInteraction owns a retained area's quest giver dwell and
vocation offer state. NativeSceneQuestInteraction shares the original interaction
rules with World, and NativeQuestOdyssey shares the original local-lead queries.
The World entry points retain their signatures, default arguments and call order.

## Ownership and attendance

Interaction uses the exact controlled body admitted to this area. Matching an
actor ID or standing at the same coordinates in another area is insufficient.
Solo interaction belongs to the local player; a borrowed party representative
cannot accept or turn in that player's quests. Hosted interaction uses the
admitted seat roster and keeps the native keeper and acting-seat rules.

Dwell reads the actual seat action clock and native body quiescence. It resets
when the controlled body changes or physical authority changes, including a
leave-and-return between observations. Failed transfers and repeated claims do
not reset a valid dwell. A rejected present-hand entry checks admission before
changing dwell, vocation flags or its attendance record. An absent hand keeps
the native reset/no-op policy. No input or movement callbacks are fabricated here.

The area retains one dwell value for solo interaction, a weak per-seat dwell
map for hosted play, and its own vocation request/decline flags. Campaign quests,
account progress and per-seat ledgers remain shared through their actual owners.
Fresh area construction allocates this state once; visibility changes do not.

Solo interaction cargo uses the physically present local hand for the native
fallback position. Field-completion cargo preserves its original source-area
fallback. These two contexts must not be combined by globally substituting the
campaign hero for the area's representative.

## Integration

NativeAreaSceneOngoing constructs one interaction owner beside its quest,
progression and objective-watching owners. Its updateQuestGiver entry requires
completed physical admission. A future scheduler must retain the native order:
quest giver interaction before objective watching. This entry point does not
install that scheduler or publish a new area.

The shared World adapter reads live fields and invokes methods with their actual
receiver. Quest imbue claims use the real character writer, preserving the
native mutation/save order and partial effects if a later operation throws.
The existing continuous-country quest branches remain in the shared native
rules; whole retained native areas intentionally have no mass-runtime policy.

Twenty-four World interaction methods, two native idle queries and two Odyssey
local-lead methods are extracted from the immutable 216005a8 source. Integration
is checked separately against the complete World and Odyssey sources at
8c7ab5fa. The source fixture reverses only exact reviewed changes before invoking
the older historical guards; original expected source and behavior receipts
remain in place.

## Evidence and remaining work

The unchanged 49-course interaction proof keeps receipt
62af559419c7458b97e815ba77176fca502d8441f885bf3088a3682058e10d6b.
Thirty-three additional checks cover exact source restoration, all 26 actual World
entry points, lazy method lookup, default arguments, cached host identity,
continuous-country quest acceptance/dwell payout, actual imbue save order,
partial failures, and state preservation on rejected admission followed by a valid
retry. Their receipt is
d4fdb2eb4c48935e882729d51fac602ed55e1e4061bd8edd34ee4cd3bd21875e.

The composed ongoing proof builds two full native owners for each standing-hero
and carried-hero course. It verifies pre-admission refusal, native quiescence
interrupting dwell, solo local payout, foreign-area refusal, hosted peer payout
with the keeper absent, native XP rebuild and repeat suppression. Its receipt is
d85c06603cfbe8a72acd71503e7e6c685c1f199ef22255af781cf61745f1bbaa.
The separate cargo regression distinguishes actual local-hand placement from
the unchanged source-area field fallback and rejects an absent carried body.

All four project type checks, a scoped production build and both game/launcher
boots passed. Twenty selected probes passed after correcting the admission-order
defect and adapting Brandt's old plain-object receiver fixture to 60 actual
Worlds; its range, determinism, diversity and progression assertions are unchanged.
The final interaction, ongoing and cargo probes were rerun after the correction.
Independent review verified the native bodies, exact restorations, 78 integration
mutation/duplication refusals and the old-owner negative control for the dwell bug.

Full native birth comparison retains 52 courses, 3,781 bodies and six native
partial failures with receipt
4e69d53160861b422b0a85b4f6ead4c5038760cd7019ac09b3e275f5632724f3.
The full birth driver retains 66 pairs, 3,657 births and 149,496 random draws.
Generation QA passed 2,607 cases with five warnings (four spacing, one timing),
and ordinary simulation smoke passed 25 episodes. That smoke run is separate
from the historical strict balance comparison discussed in
[main content reconciliation](main-content-reconciliation.md).

The proof's explicit publication into its real World writer is test scaffolding.
It does not provide runtime area publication, player input or client menu
routing. Vocation-site ticking, full combat, movement, scheduling and the
persistent area lifecycle remain separate work. The retained owners must be
active before the later bounded/open terrain and distinct-point-of-interest
pass can reliably host larger objectives in the continuous world.
