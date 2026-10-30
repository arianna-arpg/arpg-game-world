# Retained-area hosting contract

Status: foundation integration contract, 2026-10-14. This is the target for the
shard's W2/W3 design, with implementation gaps called out below. It does not
claim that a transferable area record or a threaded host already exists.
It follows [the convergence plan](../design/convergence-20261014.md) and
[dedicated retained Shards](../worldgen/native-dedicated-shards.md).

## The unit and its identity

The hosted simulation unit is a retained area. It owns its physical census,
combat and AI controllers, objectives, local effects, terrain changes and
resident lifetime. A renderer page is only a cache address. Neither a page
edge nor changing hosts creates a new place, encounter, objective or actor.

Today `NativeAreaSceneOngoing` composes these owners. One
`NativeAreaCampaignSession` and one character writer serve all retained areas;
`NativeAreaSceneTransitionCoordinator` registers them by native zone id.
`NativeShardHost` already hosts this model through `--native`. It does **not**
create a legacy `World` for every area. `--worldmass` is the separate giant-zone
adapter. W2 must adapt the retained owners, not reproduce that adapter's keeper
aliases or equate a retained area with an additional complete `World`.

The cutover identity is `(runId, dimensionId, areaId, instanceId)`. The run and
immutable geography descriptor identify the world; `areaId` identifies a durable
physical place; `instanceId` identifies shared-world, party or account tenancy.
Neither the worker number nor a streaming page coordinate enters place identity.
A migration increments an ownership epoch, not the area's identity. Existing
zone ids remain compatibility keys until geographic placement is implemented.
The current zone-id-only registry cannot yet host two private instances of the
same quest zone; adding this namespace is a cutover gate.

A unit may own several adjacent retained areas when their interaction cannot be
separated safely. An area is the smallest ownership contract, not a demand for
one worker per area. A worker may host many units. Until exact cross-unit
interactions exist, areas sharing combat, pursuit, sight or tethered bodies must
be scheduled together. A guessed distance or a camera edge cannot sever them.
Deliberately separate interiors retain their real entrance and return rules.

## One clock: card 35 on areas

The proposed contract uses card 35 A: one campaign tick, start time, `dt` and
input clock across all hosted units. The offline adapter performs the same
ordered phases on one thread. Selecting this engineering target does not set
the governor's floor, permit a lower tick rate, or decide worker-crash recovery.
Those product choices remain the recorded decision cards.

The coordinator issues tick N with an immutable campaign revision and ordered,
seat-attributed inputs. Units run their local phases and return results for N.
At the barrier the campaign owner validates and folds results in a fixed order,
commits transfers, advances shared campaign work exactly once, and publishes the
next accepted revision. The detailed phase order must match the existing
`NativeClientRuntime.dispatch` / native server frame owner in equivalence tests;
this description does not authorize reordering native callbacks or RNG draws.
No unit starts N+1 against a different campaign time or uncommitted N result.

An empty area's scheduling policy must name which clocks and objectives advance,
which are analytically caught up, and which prohibit sleeping. It cannot reset
cooldowns, skip an ongoing battle, or mint a fresh encounter on reentry. Wall
clock duration measures host cost; it is not a second simulation clock. A worker
failure stops acceptance at the barrier; recovery is a separate, explicit policy.

## Export, validate, adopt, commit

These are proposed operations to be implemented over the existing native owners,
not exported functions already available in the tree:

1. `prepareExport(area, tick, epoch)` runs only at a completed tick boundary,
   with no borrowed campaign policy, receipt or selected native callback alive.
   It identifies the complete dependency closure and freezes mutation of it.
   An unsupported dependency refuses migration while leaving the area hosted.
2. `exportArea` captures a versioned, identity-preserving record. It has no
   regeneration, reward, arrival or quest side effects. The source remains the
   authority until a successful commit; it cannot also advance the frozen unit.
3. `validateImport` checks the schema, run/geography identity, tick, epoch,
   namespace, whole record, internal references and complete dependency census.
   The destination reserves capacity and stages its own independent stores.
   Validation never grants ownership merely because bytes have a digest.
4. `adoptArea` reconstructs the native owners and references privately. No
   input, combat, save or client publication can see this provisional unit.
   A failed adoption discards it; the source retains its authority and may resume.
5. `commitTransfer` is a coordinator decision at the barrier, keyed by transfer
   id and source epoch. It revokes the source's write/publication capability and
   activates exactly one destination epoch. Duplicates return the committed
   outcome, stale epochs refuse, and acknowledgement loss cannot create a second
   active copy. A durable commit journal is required before cross-process/crash
   recovery can promise exactly-once transfers; it is not supplied by the current
   synchronous receipt system.
6. `retireExport` releases old stores and render/host subscriptions only after
   commit. Imported logical ids never become a second reward or death. Ordinary
   native travel callbacks keep their established order and partial effects;
   this protocol does not roll completed gameplay back after a callback throws.

The same-thread fast path keeps actual Actor objects and their live references.
The current coordinator and `NativeAreaActorAuthority.transfer` already require
actual destination membership and exact source authority. A cross-thread copy
cannot preserve JavaScript object identity. It must preserve logical ids,
alias/reference topology and every observable native state value, with private
runtime authority freshly issued by the destination. Matching ids alone do not
authorize the transfer. A shared source array must never become a destination store.

## The native record and the travelling body: card 37

The proposed record has a schema version, run/geography provenance, area and
instance key, completed tick and input cursor, ownership epoch and transfer id.
Its body is a graph with stable ids and explicit references, covering:

| Owned state | Capture and adoption requirement |
| --- | --- |
| Actors and travelling cohort | Hero, couch guests, shapeshift bodies/husks, companions, mercenaries, summons, mounts, packed followers and anatomy; exact build, resources, cooldowns, buffs, statuses, targeting, threat, commands, AI state, timers and ownership links. |
| In-flight work | Projectiles, grounds, delayed hits, tethers, controller state, paid-but-pending casts, callback obligations and their attribution. Capture the dependency closure, including things owned by bodies staying behind; otherwise keep the owners together. |
| Local place | Exact terrain/source identity, mutations, doors, fixtures, scenery, loot/contents, objective controllers, visit and event epochs, resident state and RNG continuation. |
| Shared references | Stable campaign, account/character, party, objective and event ids plus the revision read. They are references to one authoritative owner, not writable cloned campaign objects. |
| Publication and storage | Recipient epochs/input acknowledgement cursors, dirty revisions, pending durable writes, and the accepted transfer outcome. Render caches and socket handles are reconstructed separately. |

Card 37 A is the target: a timed summon crosses with its actual remaining life,
state and relationships. Re-minting it at a life fraction is insufficient.
Functions, private receipt objects, WeakMap authority and process-global counters
are not transferable data. Every such seam needs an explicit registered verb,
continuation or destination-issued capability. Id allocation must be collision
free across units without changing saved identities or seeded execution order.

`captureNativeActorState` in `dormancy.ts` is a useful exact graph codec for its
admitted subset. It can refuse unsupported state; dormancy explicitly excludes
active effects and is not a universal travelling-court serializer. Similarly,
`NativeRetainedSave` v1/v2/v3 validates recorded geography and ordinary save
semantics, but is not proof of a lossless worker snapshot. `SeatPacket`, native
zone memories and `serializeCharacter` cannot silently substitute for this record.

## Claims and patches across areas

Each actor/store has one active physical owner. The campaign, account ledgers,
quest credit and world geography each have a named shared owner. Read replicas
carry an accepted revision. Remote callers request a named operation with source
area, tick, actor/seat authority, target identity, expected revision and idempotency
key; they never send an arbitrary closure or a replacement campaign object.

Results form a typed patch log: append a notice, claim/release objective ground,
advance a quest under the acting character, add a ledger delta, or publish a
specific terrain mutation. Set/union/add are used only where the existing native
operation has those semantics. Reward/kill credit must preserve the original
attribution and once-only latch, not infer safety from commutativity. Conflicting
exclusive claims resolve in the coordinator's deterministic order and explicitly
refuse or retry at the next tick. Applied patch ids remain deduplicated for the
entire possible retry lifetime and are included in recovery state.

A terrain patch names its durable region, source version, mutation revision,
footprint and owner. A patch crossing areas is committed once and delivered to
every overlapping collision, navigation, sight and rendering dependency. Page
LRU eviction cannot delete the patch or its claim. Invalidating the nav-blocking
doodad family must invalidate every dependent path cache (shard request F14).
Account/party ground remains claimed during offline absence according to the
accepted quest lifecycle; another instance never reads or overwrites its stores.

## What a crossing costs

A same-thread warm crossing is validation plus transfer of the selected cohort
and its dependencies, destination admission, and publication. Its existing cost
can include whole-census checks and native callbacks; no constant-time or frame
budget claim is established. A cold arrival also pays preparation and native
restoration. Neither should regenerate a warm area's residents or reread a whole
campaign merely because a renderer page changed.

A thread migration additionally pays capture, encoded bytes, queue/transport,
validation, reconstruction and a barrier hold. Measure each phase separately,
with cohort/dependency counts and bytes. Report p50/p95/p99/max, allocation peak,
input-to-visible delay, missed tick budgets and retained memory after repeated
crossings. The shard's suggested 100 ms island hold is not acceptance evidence.
Preparation may yield outside native scopes; authority commit may not yield.
Unavailable destination capacity retains the source owner and backpressures the
transfer. A hidden load screen or reduced population must not mask the cost.

The phase meter and distance census should accept retained-area views. The
thinking edge and obstacle memo need adaptation to those actual owner lifetimes;
being per-World today does not prove plug-in compatibility with the retained host.
F1's population budget remains a policy seam, not permission to remove existing
bodies or a completed retained-area governor integration. The performance lane
owns measurements and policy, the foundation owns these runtime seams.

## Delivery and acceptance owners

| Gate | Owner | Required evidence |
| --- | --- | --- |
| Area identity and private namespace | Foundation; shard reviews tenancy | Two instances of one quest in distinct places, no shared stores, correct offline claims and save/Continue. |
| Complete export/adopt codec (W2 prerequisite) | Foundation with shard | Same-thread fast path versus round-trip graph state; active summons, casts, anatomy, projectiles, partial native failures and unsupported-state refusal. |
| Message-only retained unit (W2) | Shard; foundation reviews native calls | One-thread equivalence against the retained host, exact phase/RNG/credit order, forged/replayed/stale transfer and patch negatives. |
| Thread barrier (W3) | Shard | Same tick and outcomes across worker assignments; timeout, duplicate, worker-loss and commit-ack fault injection; offline remains server-free. |
| Cost and memory | Performance | Controlled paired soaks of actual `--native` areas, crossing phase/byte telemetry, population and input-delay receipts, repeated release of old stores. |
| Continuous physical seams | Foundation | Pursuit, missiles, areas of effect, tethers and objectives across a visible boundary without reset, disappearance or coordinate discontinuity. |

Existing native area authority/travel, Continue, campaign-frame and dedicated
Shards probes remain mandatory regressions. They are evidence for their tested
subset, not substitutes for the unbuilt export/adopt or continuous-terrain gates.
