# Native area tether construction

NativeSceneTethers shares the original addTether and attachObjectTethers rules
with World. NativeAreaSceneTethers binds those rules to one retained area's
actual mutable tether queue. The native replacement order, endpoint references,
skill-instance references, stat conversion, color and initial tick timer remain
unchanged. TETHER_TICK is shared with World ticking at its original value of 0.4.

## Queue and actor ownership

Construction requires the exact physical endpoints and explicit beam owner in
the admitted area. Authority must identify this tether owner, so another owner
for the same scene cannot write an unrelated queue. Native hostile or unowned
targets remain valid endpoints when physically present. Object tether attachment
also requires the spawned object's actual owner to be the supplied caster, as
established by the native minion and construct spawning paths.

Each retained state object and every raw array assigned to it belong to one
successful tether owner for its lifetime. NativeAreaSceneRestoration appends
healing arcs directly, so independent area slots cannot share an initial or later
array. Construction requires an own writable, configurable data slot and installs
an own nonconfigurable accessor with the supplied enumerability. Replacements
claim the new array before publication; a failed constructor claims neither the
state nor its array. The host always reads the current slot, preserving current
and historical raw references without copying the queue or proxying the Array.

The earlier construction-only policy allowed distinct state slots to share an
initial array because addTether filters before appending. Its historical proof
still explains that operation, but the current ownership contract supersedes
that allowance. A separate negative control demonstrates why direct healing
requires exclusive arrays. See [native area restoration](native-area-restoration.md).

Carried shapeshift flesh is not a physical endpoint. The actual controlled form
can construct a tether after explicit admission. Detached casters, staged
newborn bodies and endpoint transfers require their own lifecycle authority;
this owner does not infer it from coordinates or logical parent relationships.

## Evidence and limits

The frozen construction proof compares immutable original methods, the shared
core, actual World and retained owner in 36 courses using all six installed
tether supports. The current installed catalogue has no innate skill tether
definitions; additional explicit specifications cover target duration, healing,
conversion and color branches. Fourteen regression groups retain receipt
7b7d745f20f2f8bbc824964b7ff104eb8809d1b133c4948f7ffeb9efd3e3aba7.
They include native replacement, reference identity, partial failures, exact
queue ownership, foreign/borrowed endpoint refusals and actual shapeshift form.

The actors are created by real native factories; census admission, positions and
source-skill tags are explicit test setup. This proves construction, not complete
summon birth. Independent review verified the frozen source hashes, exact native
method bodies, type checks and runtime proof.

Full tether ticking, damage, tick-driven healing, cleanup and crossings remain
separate combat/lifecycle work. Register this queue owner beside real area combat
services when that composition exists. Do not supply an empty combat interface
or claim scheduling, spatial publication or whole-area activation from these
construction checks.

## Integrated World and dormancy

The integrated World delegates preserve live queue replacement, actor census and
method receivers. Their cached host is nonenumerable: a cache alone must not
retain unrelated enemies during dormancy scanning. A regression first reproduced
the enumerable-cache failure, then verifies an empty cache pins no unrelated
actors, a real tether pins precisely its two endpoints, and clearing the actual
queue releases those pins. The real tether queue remains visible to scanning.

Sixteen integrated regression groups pass with the same 36-course receipt above.
Exact reversal reconstructs the complete pre-integration World at 82f91c99;
changed or duplicated integration hunks refuse, while unrelated drift remains
visible to older source guards. The original method bodies remain pinned to
8c7ab5fa. Independent review repeated the integrated proof and type checks.

The production integration passed all four type checks, all eleven focused
probes (construction, tether ecology, movement tether, dormancy, dependency
attribution, quest interaction, projectile launch, progression, both historical
guards and installed sources), the production build, and isolated game/launcher
boot checks. No balance baseline or tolerance changed.

NativeAreaSceneRestoration now uses this exact registered queue for immediate
chained-heal arcs. Its checks prove initial and later cross-area array assignments
refuse, actual queue replacement stays live, and frozen-array append failures
retain earlier native healing. The construction algorithm and its original
36-course receipt remain unchanged; the old initial-sharing lifecycle expectation
is explicitly replaced by the exclusive queue contract.
