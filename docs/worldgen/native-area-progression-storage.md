# Native area progression storage

NativeAreaSceneProgression owns the supplied state object and each of its thirteen
raw storage slots for their lifetime. Eleven queues and two WeakMaps remain the
actual native objects. No queue copy, Actor proxy, replaced push method or numeric
ID remapping establishes ownership.

## Storage contract

Each initial slot must be an own, writable, configurable data property containing
an actual array or WeakMap. All slots and values are checked before any property
is replaced or any storage is claimed. Failed ordinary construction leaves the
supplied descriptors and raw stores available for a corrected construction.
Existing configurable slots can be installed on a nonextensible state.

After construction, a nonconfigurable accessor preserves the original slot's
enumerability. Assigning a fresh raw store is allowed. Every assigned store belongs
to that exact slot permanently: another area cannot reuse it, and another slot in
the same area cannot alias it. Returning an old store to its original slot is
allowed. The native host always reads the current store.

Native operations still replace arrays or append directly in their original
order. Frozen raw arrays preserve native failure and earlier reads or effects;
ownership does not silently make an immutable queue writable. WeakMap branding
does not evaluate or replace methods supplied on the actual map.

This is a contract for ordinary supplied state. It does not claim atomic rollback
against adversarial Proxy traps or replaced global intrinsics.

## Reproduced failure and regression evidence

The former owner allowed two areas to share the entire progression state or its
individual queues and maps. A projectile launched by area A became visible in
area B's queue. Expiring a shared field through B refunded A's caster reservation
from 13 to 6. The immutable old-owner negative controls reproduce both failures.
The repaired owner refuses the sharing; A's own launch and cleanup still work.

Eleven focused groups cover 682 cases, with receipt
39a3c75de399b012daf1547482ac8094543dce2cbcf8fd0e06c6b54020728815.
The focused proof covers all slots, initial and later sharing, aliases between
different slots, historical reassignment, raw identity and methods, enumerable
and nonenumerable slots, invalid descriptors, failed construction, nonextensible
states, frozen-array launch and native tree-field cleanup. Its fixture combat
provider is an explicitly matched original World driver; the contamination and
cleanup courses assert that this provider was never called. It is not a retained
combat implementation.

The original native algorithms, World and combat controllers are unchanged. The
new storage policy supersedes their former allowance for unsafe container sharing;
it does not rewrite native algorithm receipts.

The final integration is pinned to 14dff2f4. All 2,221 tracked source/config
files in its inventory match Git outside the one changed existing owner.
The working branch passes all four type configurations, nativeprogressionstorage,
nativesceneprogression, nativeprojectilelaunch and nativecombatstate. Adjacent
summon preparation, ongoing-area and authority checks pass in the isolated
candidate. Independent review replays both old failures and the repaired proof.

## Remaining runtime work

Exclusive containers do not establish provenance for every record inserted into
them. Immediate native actor insertion, actual physical retirement, exact-record
consumption scopes, cross-area status sources and campaign deed routing remain
required before full retained combat, ticking and publication.
