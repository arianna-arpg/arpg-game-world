# Seamless exploration foundations

Status: native country and geographic ownership integration, 2026-10-06. This is a continuation of
`codex/seamless-world-foundation`, not completion of the long-term world vision.

## Source inventory

The inspection began at seamless `6414cadc`, local main `651d7e05`, refreshed
`origin/main` `bc8a0e0a`, and historical `seamless-world` `75333fd2`.
Local main and remote main are distinct refs even though their latest commit
subjects match. The unrelated main checkout was not edited. Concurrent
presentation work subsequently landed as `36c9e505`; this pass preserves it.

| Foundation | Actual native code | Seamless integration before this pass | Remaining work |
| --- | --- | --- | --- |
| Landscape | `engine/levelgen.ts`, tileset/layout/stamp/formation registries, `engine/massif.ts`, `data/massifs.ts` | Five climate families, saved ground palettes, biome scenery, independent place competition and continuous collision | Regional landforms and drainage, coast/river routes, massif placement and interior ownership |
| Places | Native structures, compositions, doors, stairs, cave mouths and side-area generation | Embedded Lastlight; eight connected destinations; repeated camps, ruins and three altar sites | General plan/door/entrance adapters, reachable cave interiors and return positions |
| Generated work | `data/bountyboard.ts`, `bountyJourneys.ts`, `bountyExpeditions.ts`, `world/bountyRoutes.ts` | Board furniture was present, but arm/accept/view explicitly refused continuous geography | Spatial adapters for more objective families and regional boards |
| Authored quests | Native quest definitions, turn-in, reward and capacity rules | `quests/frontier.ts` added Western Watch and Northern Watch to Mireille, bound to exact physical defenders in `worldmass/quests.ts` | Discuss NPC-role or authored-quest changes with the user; no rewrite in this pass |
| Campaign and factions | Native Odyssey roster, scouting/report/siege state, operations and leaders in `world/odyssey.ts` and `engine/odyssey.ts` | Graph-dependent enrollment, leads and updates deliberately gated | Persistent place identities and lifecycle for operations, scouts and faction consequences |
| Sea exploration | Existing voyage, harbor/hold, sea-route and realm travel consumers in `engine/world.ts` and native world/data modules | No continuous sea/interior lifecycle | Coast-connected departures, voyage ownership and durable safe returns |
| Long journeys | Native actors, effects, persistence and rewards | Terrain caches bounded; original site casualties, wounds, fields, puzzles and scenery changes persist | Distant actor dormancy and full frame rebasing; the existing 96-native-body cap remains a limit |

The native massif, bounty-board, bounty-route and world-Odyssey implementations
were unchanged between inspected main and seamless. Presence on this branch is
not proof of a continuous-world adapter. The historical branch's
`world/seamless.ts`, `cells.ts`, and `tissue.ts` provide useful lessons: agreed
border mouths, one coordinate transform, hysteretic residency, and continuous
palette weights. Its graph-seated/fitted-zone architecture is different from
this branch's immutable generator and sparse durable state; nothing was merged.

## Implemented contracts

`worldmass/bounties.ts` adapts native generated postings to a saved
`{run,id,content,center}` place reference. The native kind registry, acceptance
cap, pinning, board beat, refresh-after-return, reward recipes, payout, journal
and board controls retain ownership. Four objective families read actual native
state: discover the place, defeat its original garrison, search its cache, or
solve its native riddle. A kill elsewhere or an unrelated chest cannot satisfy
a posting. Finished deeds cannot become fresh offers.

The candidate frontier consists of connected journey places plus actually
visited country sites. Reading it never surveys terrain, mints actors or scans
the unbounded generator. Spent sites consume no candidate budget; large unfinished frontiers rotate with
the seeded slate so earlier discoveries cannot permanently hide later ones.
At most 256 candidate places are resolved. Offers keep
their exact level and reward through Continue, use native reward choices and
level ceilings, and retain native one-hand-per-board behavior. Known coordinates
feed the existing map/compass and journal; they are bearings, not an asserted
path through unsurveyed terrain. This first adapter uses Lastlight's board.

New descriptors opt into `bounties`, and use checkpoint schema 9 so an older
client cannot silently discard the new owner. Older descriptors stay unchanged.
No authored quest definitions or Mireille dialogue/roles were edited. Fresh
characters are required for the new board policy and regional content.

`worldmass/regionalSites.ts` adds Fallen Waystation, Rootbound Court, Reed-Wake
Graveyard, Sunken Caravan and Rime Watch. Their distinct native scenery and
climate conditions become immutable run data. They compete through the existing
place generator and share native population admission, garrison clearance,
cache rewards, scenery mutation, residency and exploration-board integration.
This is five reusable compositions, not five additional gameplay systems.

## Collision investigation

The Red Cairn is `worldmass/fieldSites.ts`'s `red-cairn` composition. Its standing
stones and tombstones already block movement. Its central `blood_altar` is a
native `Altar` drawn by `Renderer.drawAltars`; the stone slab had no doodad or
movement shape. That was a confirmed path through apparently solid scenery.

`engine/altarBodies.ts` now supplies its native rectangular foot course to the
ordinary scenery collision and navigation queries. The renderer and physics
share the slab dimensions. Fields remain traversable; their tiny quarter sparks
are decorative. The low slab blocks bodies but does not introduce a new shot or
sight wall. Both ordinary generated altars and streamed country altars use this
contract. The altar owner derives/removes its body on admission/eviction; it is
not serialized as a second independent scenery owner. Other floors do not
collide with it. Continue rebuilds it from the saved altar position.

## Verification

- `probe_altar_bodies.ts`: actual generated Red Cairn, incremental native walking
  from both sides, body clearance, floor separation, no duplicates, eviction,
  remount and character Continue; finite-zone cleanup too.
- `probe_worldmass_bounties.ts`: frozen offers, place-specific directions,
  three native save states, original-garrison completion, native board return,
  once-only payment, foreign identities and bounded candidate count.
- `probe_worldmass_regional.ts`: all five families occur over three natural
  climate seeds; every orientation has body-clear routes from cache to multiple
  site edges; deterministic queries, scenery eviction and restore agree.
- Existing worldmass suite retains legacy-schema fixtures, door and route checks,
  field/riddle/cache lifecycle and native authored quest boundaries. Puzzle
  route checks target a real puzzle node, not a now-solid central altar slab.
- `exploration-foundations-ui.cjs`: hidden real client, native board buttons,
  continuous player movement, exact browser Continue and Red Cairn contact.
  Build with `HOLLOW_WAKE_WORLDMASS=1` and
  `HOLLOW_WAKE_STORAGE_SCOPE=preview:seamless-world` to `dist-preview` first.
- The existing item-readability probe now exercises the classic drop painter
  restored by `36c9e505`, including label position/bob and co-op parity, instead
  of calling the removed reward-overlay method. No presentation code changed.
- Required shared checks: `npm run check`, `npm run genqa`, simulation smoke and
  native probe gate. Reports and browser captures remain under ignored
  `balance/reports/`.

## Next foundations

Prioritize a native side-area lifecycle with an entrance embedded in a real rock
formation, body-safe arrival and return, sparse interior state and streaming
ownership. Follow with distant population dormancy and regional travel networks.
Those contracts unblock larger landforms, more objective providers, regional
Bounty Boards and eventual Odyssey/faction/sea adapters without bypassing the
existing campaign boundary. Full long-run residency, cave transit, seafaring,
regional factions and a large generated-objective catalogue are not completed
by this pass.


## Native country and geographic ownership, 2026-10-06

The next pass imports native source definitions into the run, then admits only
features whose complete generated requirements have an engine owner. The source
catalogue covers 46 native tilesets and 24 native biomes; a catalogue row is not
an assertion that every associated mechanic is implemented. Unsupported tracks,
annexes, NPC services, vertical layouts and environmental controllers are
explicit admission refusals. Generation side channels also retain complete
native occurrence and fitted court-shrine definitions; a visible landmark does
not establish ownership of its hidden event. New features with unowned events
or puzzles are refused intact. Scoped compilation restores the native registries
even on failure, preventing stale events and generated preset leaks. Historical
births lacking this metadata retain explicit unverified status.
A landform primitive inherits its containing
country context rather than accidentally importing an unrelated whole tileset.

Native structures, compositions and massif primitives retain their actual grid,
scenery, doors, breakables, compatible native garrisons, cave mouths and source
materials. The native masonry/foliage painters are shared with ordinary zones.
Collision is available before render residency. Native sparse edits, original
birth descriptors and casualty state survive eviction and Continue. An exterior
ingress proof now checks dry body-clear terrain outside each admitted feature;
its corridor is reserved from later ecology. This verifies access to local
country, not a route across an entire uncharted continent.

The ownership hierarchy is independent of render pages: 1,350-unit chunks,
5,400-unit zones and 21,600-unit regions. Durable signed-cell addresses and exact
integer bounds identify all three; crossing their bounds does not reload the
surface. Region/zone definitions freeze native source data. Each controller owns
its own phase, clock, state and receipts, so finishing a neighboring objective
cannot finish or reset another. Pyres, rifts and excavation sites use native
weighted source selection, fixture counts, hold/reach, contest/drain/recoup,
completion rewards and the 75% objective-chest lottery. Rifts share native
pressure, pour timing and population rules; excavations share native gem and
ambush rolls. Each operation owns its generated bodies, frozen spawn context,
casualties and remaining clocks. Opened chests are checkpointed immediately and
never refill when their owner remounts. Bounty Boards can deal admitted unfinished
operations as exact physical targets, retaining native acceptance, issuing-board
return, save continuity and once-only payment. Reading a board does not discover
terrain or admit new operations.

New operations require a connected body-clear approach from every stand and
chest to dry ground at the local planning boundary. Planning reads immutable
terrain and existing site reservations, then reserves its corridors before
native scenery/ecology admission. A final admission sweep checks actual native
collision. This is a local access contract, not proof of continent-wide
connectivity. Historical born owners retain their original stands and source;
legacy owners without a proof are explicitly marked unverified rather than
rerolled or given corridors that move their existing surroundings.

The geographic sky runs the actual native WeatherField on deterministic spatial
and temporal cohorts. Front position, drift, intensity, birth climate and
lifetime use native definitions; sectors retain neighboring fronts crossing their
edges. Actor-local wind and rain-wet checks share the physical sky. Geographic
storm cadence belongs to zones, not individual actors. Native snow accumulation
belongs to chunks and the player's snow scalar is only a local projection.
Resident snow and storm clocks advance once per owner; unloaded ground retains
its state without simulating unseen physical hazards or pretending to have
accumulated global offscreen snowfall. Weather package settings require saved
scale epochs so later package changes cannot rewrite past births.

Repeated native shrines and supported puzzle families have bounded live
residency and exact kind-owned checkpoints. Quiet distant actor groups leave
the active simulation together, preserving remaining clocks, wounds, births and
references within the group. Browser paging can persist closed quiet groups in
immutable IndexedDB pages and release their live objects only after a durable
character root references those pages. Nearby groups hydrate through the native
factory and exact state codec. Foreign references and unsupported active state
pin a group; failed writes retain its live objects.

Paging currently applies to the isolated browser save profile. Native filesystem
saves remain inline. Cold Continue validates and expands all referenced pages
before ordinary character restoration, and portable export produces a complete
inline save. Thus travel paging reduces retained live objects, but cold Continue
and historical metadata are not yet bounded independently of world history.
The rebasing transaction/inventory probe is a foundation; automatic live frame
rebasing is not wired and the local-physics extent remains finite.

Rock-backed native mouths now enter actual native side areas, including nested
pockets, with a stable entrance identity and exact surface return. Real browser
walking, Save/Continue inside a generated grotto, and walking back to the same
surface mouth pass. Resolved cave fauna has separate provenance so Continue
does not turn inherited wildlife into an authored override of native gates.
This lifecycle still calls the native scene transition and suspends the surface
runtime. The cave-stratum compiler validates actual native packages and physical
mouth identity, but is not installed as continuous cave geometry. A physical
stratum adapter must preserve native terrain, objectives and environmental
owners before that claim can change.

Large browser runs now use transactional IndexedDB snapshots with checksums,
current/previous generations and a small local reference. Failed writes preserve
the last committed generation. Immediate deletion barriers and durable
tombstones prevent a dead or deleted run from resurfacing through an older
mirror. Import and explicit checkpoint paths can await completion. Actual
Chromium tests covered an 8 MiB storage record and a roughly 6 MB character with
385 generated residents, including exact wounds and receipt continuity.
The production paging travel test subsequently covered 100 journeys and 621
native identities: 480 distant survivors were paged, with 141 retained actors
and 141 surviving weak references after collection. It checked physical return,
missing-page refusal, cave Save/Continue, export, deletion/reimport, failed root
writes, and hydration overlapping both page staging and root publication.
Page commits capture an immutable manifest revision so a concurrent return
cannot omit either the restored actors or their page from the committed root.
Human New Run waits for the existing boot load before replacing the old patron
or changing account state; a paged header is never a resumable partial save.

The critics found and fixed repeated native terrain resolution ahead of the hot
walk cache. In the measured native-market course, native region queries dropped
from 82,407 to 181 over 60 instrumented frames. The 180-frame walking sample's
median improved from 39.9 to 12.8 ms, but p95 remained 142.9 ms and 30 frames
exceeded 50 ms. Concurrent source changes make total-frame comparisons
approximate. These measurements do not certify smooth frame pacing; outstanding
page preparation, cold generation and renderer work remain under review.

A bounded worker now prepares full native feature descriptors ahead of travel.
Its registry bootstrap has the original native import order; compilation neither
reads the player nor consumes runtime randomness. Adoption checks the source,
request, complete descriptor and ownership requirements before publication.
There is one in-flight request, eight queued requests and four ready descriptors;
late work is discarded on world replacement or cave entry. Collision retains an
authoritative synchronous fallback. Browser checks compared the complete worker
and synchronous descriptors for naturally generated landforms and a market.
A settled walking sample measured 13.7 ms median, 89.5 ms p95 and 268.1 ms maximum;
that course adopted no new worker result and had a different actor count, so it
cannot establish a causal frame-time improvement from the worker. Cold visible
floor preparation can still run synchronously. Isolated country queries measured
1.40 ms median, 50.68 ms p95 and 79.16 ms maximum over 24 scans. The cold
geographic plan path reached 86.01 ms; asynchronous plan preparation remains
necessary before claiming smooth first arrival.

Schema 11 owns geography, regional controllers and the new physical weather
state. Earlier descriptors keep their original feature policy. Native source
hashes and malformed current ownership proofs fail explicitly when incompatible;
they do not silently regenerate a different visited place. Compatible historical
births predating access proofs preserve their exact descriptors and locations. Mireille's authored Watch
contracts and role are preserved. Campaign/Odyssey, regional faction operations,
continuous seafaring, most native objective families and fully paged infinite
history remain unfinished. Existing graph-backed work stays gated where its
physical destinations cannot yet be honored.

Verification for this pass includes the native country/features/residency/host,
activity residency, dormancy, sideareas, hierarchy, objectives, hold families,
objective bounties, geographic access, weather, snow, storm, native materials,
ingress, worker and walk-cache probes, plus the actual World weather probe.
The browser harnesses are native-generation-ui.cjs, browser-character-store.cjs,
browser-run-store.cjs, browser-native-pages.cjs and browser-character-pages.cjs. The combined fast gate passed 410/410 probes in 907.2 seconds. The subsequently
registered native-generation capture probe passed separately, including two
independent compilation processes. Generation QA passed 869 cases across three
seeds with no failures and four existing clearance warnings; the five-scenario
simulation smoke suite passed. The rebuilt client booted successfully; the final
real browser course entered a natural rock mouth, continued inside the native
cave, and walked back to the exact surface return with no console errors. These checks verify the stated integrations, not
full main-gameplay parity or smooth frame pacing.
