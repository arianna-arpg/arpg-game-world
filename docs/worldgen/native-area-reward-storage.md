# Native area reward and content storage

NativeAreaSceneLoot owns its actual reward state and raw orb queue.
NativeAreaScenePhysical owns its actual content state and four raw queues:
chests, shrines, altars and drops. One shared ownership table prevents these
five slots from borrowing another area's or another slot's array.

The previous owners accepted duplicate state objects and foreign replacement
arrays. Two actual NativeAreaSceneAssembly instances reproduced the result:
an orb shed in one area appeared in both orb queues, and an essence drop
minted in one area appeared in both physical drop queues.

## Contract

Each ordinary state must supply its required slots as own, configurable,
writable data properties containing real arrays. The constructor validates all
slots and other owner bindings before installing accessors or claiming storage.
A refused constructor leaves ordinary state descriptors and arrays unclaimed.

The installed slots preserve enumerability and become nonconfigurable accessors.
They keep the exact current raw array, its contents and methods. Native code can
replace a queue with a fresh array and can later restore an array previously
assigned to that exact slot. That historical array cannot become another slot's
storage, even after its original owner has replaced it. The weak ownership
table does not keep retired arrays alive.

The helper does not wrap arrays, replace push or copy their contents. Frozen
arrays still fail at the native write, after the original reads and random
draws. Existing native content restoration still replaces all four content
arrays, and the loot sink immediately follows the physical owner's new drops.
Native earlier replacements remain when a later restore step throws.

This contract covers supported ordinary state objects. Arbitrary Proxy traps,
replacement global intrinsics and rollback of arbitrary callback side effects
are outside it. Individual records may still need their own provenance;
container ownership is not a claim of complete record or actor lifetime control.
Other storage families retain their separately documented contracts.

## Evidence

The candidate is pinned to 583c85e0. Its complete snapshot contains 2,228 selected
tracked source/config files, with 2,225 byte-exact outside the three modified
tracked files and two new files. Both owner files restore exactly by removing
one helper import and one constructor call. World, native loot algorithms and
native memory algorithms are unchanged.

Thirteen new groups cover 183 cases, including real cross-area reward regressions,
all five replacement slots, cross-family aliases, constructor refusal, historical
reassignment, frozen queues and native memory replacement/partial failure.
Receipt: 32991560b073532b3bfc89ecb45f40b40a775f369ca054ba9ffe022c2b6cc534.

The old owner components fail the new orb and essence assertions at the intended
cross-area leakage checks. They are explicitly component negative controls,
not an entirely original application build. The original reproduction also
records duplicate whole-state acceptance.

The 79 original archived/World/core/owner loot courses retain receipt
472baaf9e43695d27456219c92468130042da009d45c7dbf5ef997466bc5ba46.
Only their binding-snapshot fixture changes: a second owner receives a fresh
state rather than deliberately sharing the first owner's state. Physical proof
still covers 20 archived/current/local cold triples, 39 actual allocations and
all nine native training-yard targets. The new frozen-orb comparison explicitly
shares the native queue, zone and geometry with its actual World fixture.

Run npm run check and nativerewardstorage, nativesceneloot, nativescenephysical,
memory, ongoing, objective-completion and full native birth/source-session probes
when changing this storage contract. Full retained combat, record execution,
pickup ticking, scheduling and publication remain separate work.
