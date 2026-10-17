# Native area restoration and effect attribution

NativeSceneRestoration shares native healing, resource restoration, restore-stream
construction, cleansing and combat-text attribution with World. The retained
NativeAreaSceneRestoration uses its area's actual actor census, flashes, objective
text store and registered tether owner. It preserves resource ceilings, gain-event
limits, critical rolls, overheal wards, healer threat and chain targeting.

The physical caster and target must belong to the admitted area. Matching positions
or actor IDs do not authorize another area's effects. Actual campaign methods retain
their receiver and live lookup, including inherited methods. Text attribution keeps
native short circuits: solo worlds, an empty text store and an explicit seat can
skip the source-body lookup. The text operation still precedes attribution, even
when suppression leaves an earlier text row as the last row.

## One area per effect queue

Native chain healing appends visual arcs directly to the current tether array.
The older construction-only owner permitted separate state slots sharing an initial
array because addTether replaces that array before appending. Direct healing makes
that permission unsafe: a native chained heal can expose its new arc to the other
state slot. The regression preserves and demonstrates that old behavior separately.

The retained tether owner now owns both its supplied replacement slot and every
array assigned to it for its lifetime. An own nonconfigurable accessor checks each
replacement before publication. Initial sharing and later assignments of another
owner's array refuse. Failed construction claims neither the state nor its array.
The supplied state, current array, previous-array references and enumerability are
preserved; no copied queue or Array proxy is introduced.

Native filter-and-replace construction and direct-append healing therefore share
one real store. A frozen current array still behaves natively: tether construction
may replace it, while a chained-heal append can fail after primary healing has
already happened. There is no rollback of native earlier effects. Dependency
scanning sees the current queue and its real endpoints, and replacement releases
the old queue's live dependencies.

## Evidence and remaining work

The original eleven methods are pinned to 4949cef5. The standalone comparison
covers archived methods, token-only shared bodies, native World methods with
explicitly mirrored scene fields, and retained area methods. Mirroring fields in
that algorithm comparison does not prove the final World adapter wiring; the
integration proof tests actual World receivers and queues separately.

Nineteen comparison groups cover 161 four-lane cases, retaining receipt
403d2e99d1868f7c5fdbcc183585d241d19e262943a0ddd2fabd81df403b9833.
They include actual factory bodies and physical admission, inherited campaign
receivers, raw queue replacement, healing callbacks, partial failures and carried
forms. Five separate ordinary-World integration courses verify live fields and
selected receivers, chained-heal arcs, lazy text attribution, cache visibility
and real dormancy dependencies. Their receipt is
8206f9ddb915986f099b929e8d5478a96b43fff13adb5ea342914dd49203a74e.

Exact integration reversal reconstructs all of World at cbbe4e36. Changed or
duplicated reviewed hunks refuse, and unrelated changes remain visible to older
source guards. The integrated cached host is nonenumerable; merely creating it
cannot retain the whole census. Existing tether and displacement receipts stay
unchanged. Independent review repeated both the algorithm and ordinary-World
courses and checked the complete source snapshot against the immutable commit.

The frozen integration passed all four repository type checks and fourteen
selected restoration, adjacent-effect, ownership, memory and source probes.

Production validation also passed all four type checks, restoration, tether,
displacement, both historical source checks and installed sources, followed by
the production build and isolated game and launcher startup. No balance baseline
or tolerance changed.

This implements immediate restoration and stream construction. Stream ticking,
sympathy replay, aura and buff application, complete damage/death handling,
detached caster lifetimes, scheduling and whole-area publication remain separate.
