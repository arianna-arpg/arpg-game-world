# Native area combat state

NativeSceneCombatState shares thirteen native operations with World: buffs and
tree-buff provenance, status transplantation, charge and gauge event taps,
resource pools, victim conditions, and proc eligibility, clocks and chance.
NativeAreaSceneCombatState binds them to the actual admitted actor census,
registered progression owner's live treeBuffSources map, and campaign time.
It does not execute damage, skill payloads, death or the combat frame.

## Ownership and native ordering

Actor-reading entries require actual physical membership and the identical
registered progression owner. Matching numeric IDs, equal positions and logical
ownership do not grant entry. A carried body's hidden flesh cannot receive
physical effects. Buff delivery uses the actual census order, and transplanted
statuses invoke the real native status relay and Actor methods.

The shared bodies preserve their original parameters, defaults, return values,
comments and operation order; only this references become host references.
Native partial effects remain visible after a later callback throws. Live weak
map replacement and raw buff, skill and gain-event references stay intact.

Some native operations return before inspecting an actor. The retained owner's
entry policy recognizes provable static cases, including a nonpositive primitive
pool amount, an undefined roll, an empty array with native iteration, and static
proc/status exclusions. Descriptor inspection does not invoke option getters.
Ambiguous metadata that can change whether the operation reaches an actor needs
admission. Admitted calls then evaluate their real options in the original order.
This entry policy is separate from exact core equivalence; it is not a general
sandbox for adversarial proxies or replaced global intrinsics.

The candidate evidence reconstructs two earlier preflight failures as negative
controls: an array's custom includes method could change a proc gate, and an empty
array's custom iterator could still inspect victims. The production probe retains
the fixed-owner regressions. Current admission also accounts for
getters that change a later proc gate or status ID and boxed coercion inputs.
It neither duplicates native getter reads nor substitutes proxy Actors.

## Evidence and boundaries

The original source is pinned to 38decfcb. Twenty-four regression groups compare
1,011 cases across immutable original bodies, the shared core, actual World
methods and the retained owner. Receipt:
ad98c9aa293582c7a3ef18a2c724fba0a7da1dc26ddf9c9578bcd1083efdf7c4.

The installed catalog covers 147 proc definitions, 53 base buff deliveries,
271 buff variants along a selected prerequisite path for each relevant tree
node, 18 skill event-tap definitions, seven support taps, two pools, 152 statuses,
and 177 victim-condition/status-fallback entries. This is not every possible
combined skill-tree allocation.

The algorithm comparison explicitly installs matching census, time and tree-map
state on its real World instance. That setup proves algorithm behavior. Five separate ordinary-World integration
groups prove live census, time and map replacement, selected method receivers,
partial callback writes, exact source reconstruction and real dormancy pins.
Integration receipt:
58e5aa15ce2412975d0d43cc06e5b9540f50df9c278e05c44ae7c3862cb18f37.
The integrated source is pinned to de2693cc. All 2,206 baseline source/config
files match that commit outside the reviewed nine-file change.
Independent review verified all thirteen bodies and signatures, replayed the
behavior and negative controls, type-checked the candidate, and checked its full
2,194-file source snapshot against immutable commit 38decfcb.

The final working branch passes all four type configurations, nativecombatstate,
nativerestoration, nativehistoricalguards, nativehistoricalreceipts and
nativeinstalledsources. The isolated candidate also passes progression, gauge,
talents, authority, summon preparation and tether checks, plus main-content
source provenance. The scoped production build and game/launcher boots pass.
An independent integration review checked all nine target hashes and all 2,206
baseline sources, then replayed combat-state and restoration in a separate copy.

Status transplantation still preserves native numeric casterId semantics. It
does not establish cross-area status-source lifetime or save rebinding. Full
actor insertion and retirement, detached payload execution, campaign deed
callbacks, recursive damage/death, scheduling and publication remain required.
