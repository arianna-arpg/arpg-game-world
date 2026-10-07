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

The next integration binds the native abyssal fracture occurrence to each
physical feature and geographic zone. Its existing driver owns the 13.5-second
warning, 30-second spring, seeded wound dressing, initial wave and capped fixture
aftermath. Partial dwell, one-time warning state, exact scars, spawn receipts,
wounds and deaths survive ordinary streaming and CharacterSave Continue. The
initial maximum wave reserves capacity before the trigger advances; distant
survivors remain in their geographic zone's compact tag census without actor
hydration. Leaving and returning cannot replay a spring or native kill payment.
Event completion adds no XP path. Only the event's exact pit geometry reads its
frozen source fall policy; unrelated ground keeps its existing policy.

The real browser fixture is the unchanged seed-713 country provider's slag tor
at physical owner cell (0,16), native seed 279689217 and country level 24.
Native game ticks reached the warning at 13.5103 seconds and the spring at
30.0099 seconds. Two durable Save/Continue cycles preserved the partial warning,
six original creatures and eight native scar pieces, with no console errors
or event-completion XP. Independent tests compare the detached factory against
the original native factory and the event adapter against the original driver;
they cover full-wave reservation, story separation, exact wounds, foreign
references, dormant neighboring-zone census, source pit behavior and no repeated
rewards. The fixture aftermath retains its absolute native world-clock: returning
to overdue ground settles at most one due beat, never an accumulated burst.

The admitted occurrence family is deliberately complete and narrow. Caldera
wakes still require a physical parent-to-den witness; other event families,
vertical pit policies, source cast seals, timed Quickening and unbound reward
contexts remain refused. Quiet streaming requires an exact closed actor graph;
active combat Continue retains the explicit native transient-save boundary.
Historical event birth receipts still grow, including defeated identities.

Geographic preparation now uses the same pure plan kernel in the synchronous
path and a small module worker. Frozen input includes native source definitions,
terrain rules, level, and independent settlement, journey and roadside
reservations. A bounded queue permits one in-flight job, sixteen queued inputs
and four ready results. Before publication, cooperative validation checks the
returned stands and every route segment against exact dry terrain cells and
frozen reservations without repeating pathfinding. The per-frame allowance is
64 validation steps and a soft two milliseconds, with possible one-step
overshoot. No partial result reserves ground. Existing saved births and an
authoritative synchronous query win any race; disposal clears both the worker
and the pending validator. Unexpected jumps retain synchronous collision.

The user's standing Show, don't tell rule supersedes native local narration.
Fracture warning and eruption text, hold-start instructions, remaining-fixture
banners and local hold-completion prose are suppressed. Native cracks, tremor,
flash, charge rings, lit/sealed/dug fixture faces and emerging creatures remain
the evidence on screen. First-charge flashes are retained even though their
shared driver formerly coupled them to a text hook. Distant survey discoveries,
requested information, combat numbers and system notices are unaffected by this
focused change. Objective receipts, charge/contest clocks and native rewards
remain unchanged. The project guidance requires future mechanics to meet this
rule instead of inheriting redundant prose from main.

The actual geographic-worker browser course compared the same 3,000-unit
walk and frozen pyre owner (6,2) in seed 901743. Its synchronous first query
cost 32.8 ms; ordinary walking consumed the previously validated worker plan
in 0.2 ms. Five plans were adopted (two accepted, three absent), with 1,705
validation steps and a measured maximum validation slice of 7.4 ms, exceeding
the soft two-millisecond allowance. Actual worker output matched all three
reference objective families. This is evidence for removing that specific plan
stall, not a total-frame improvement: the control measured 18.1 ms median,
202.5 ms p95 and 442 ms maximum; the prepared run measured 19.1, 225.9 and
574.2 ms respectively. Ordinary scenery avoidance and encounters produced
1,072 versus 1,058 frames. Remaining world-update and floor costs still require
work before smooth exploration can be claimed.

The final integration gate passed all 75 worldmass probes in 312.5 seconds,
including independent local visual-cue and event continuity coverage. All
three type-check projects, the default build and actual boot passed. Generation
QA passed 869 cases across three seeds with no failures and the same four
clearance warnings; all five simulation smoke scenarios passed. The rebuilt
natural fracture browser course again passed both Continue checkpoints and
verified that neither warning nor eruption emits local narration. Independent
critics accepted these supported event and geographic-plan contracts; overall
exploration frame pacing and the remaining main mechanics are still open work.

Native court ownership now retains the generated court_shrine wrapper and its
complete refrain, tempo, accord or ember inner mechanic. The frozen source owns
the fitted center, ring radius, angular phase, node species/count, reward table,
wash and source level. Wrapper boot re-seats and hands control to the native
inner before the detached group is validated; no generic unphased replacement
ring is admitted. Native hits still pass through the ordinary spell/projectile,
knock, spill and hum rules. Shared population reserves the entire ring before
publishing any node. The feature, ring and neighboring event actors retire only
after all dependencies and physical participants pass a complete preflight.
An installation failure rolls back the exact unpublished group and its scene.

Court checkpoints retain puzzle progress, native wounds, hums and intrinsic
kindled-light duration. Native kinds own absence behavior: tempo holds its
unheard pulse phases; refrain holds playback but an expired answer window
returns to playback; unbound accord halves and embers expire on their original
clocks. Continue pays no reward or solve again. The native source controls every
loot-table mint's spoils policy and gem floor/level, without changing World.zone.
Court wash and playback remain on the same physical story. Existing older
checkpoints retain their original compatible light reconstruction when no
literal light receipt exists. External combat statuses still pin ordinary
streaming and retain the documented native transient Continue boundary.

The immediate puzzle narrator is quiet at the native puzzle hook, including
finite puzzles. Existing tones, kindling, playback flashes, mistake flashes and
finishing light remain active; ordinary reward delivery and requested details
remain native. Distant resident courts do not populate the nearby puzzle view.
These rules implement the user's show-don't-tell requirement without changing
puzzle timing, solution grammar or the authored campaign.

The next pathfinding correction memoizes bounded exact-point native candidate
lists rather than collision answers. Every move, shot and sight query still
checks the current native shape with its requested signed margin, door state,
gone flag and live scene membership. Cold blueprint eviction and Continue retain
sparse edits. A newly authoritative physical birth invalidates cached negatives.
The cache holds at most 32,768 points independently of traveled history; this is
an entry bound, not evidence of reduced total memory. Live frame rebasing and
fully paged historical feature records remain separate unfinished work.

The real browser acceptance uses four unchanged seed-713 country placements:
accord at owner (24,-15), refrain (4,44), ember (76,67), and tempo (86,5).
Original courtyard variants, fitted rings, crystal species and source levels
remain intact. Controlled arrival teleports and player invulnerability are
explicit test conveniences. Ordinary Firebolt casts, mana, projectile collision,
knock routing, timers, native effects and rewards remain enabled. Every kind
passes partial and solved durable Continue, with no duplicate reward, local
puzzle narration or console errors. All 24 recorded intended-seat hits,
including two deliberate mistakes, landed in 55 frames with targetHits=1.
Independent screenshot review confirms native mistake flashes, saved partial
kindling and completion effects. This establishes interaction and persistence;
it is not a continuous walking-discovery or frame-pacing claim.

The broader worldmass gate passed 77 of 78 groups; the remaining old assertion
expected court capability to remain unsupported. It now requires the complete
court owner and rejects a missing wrapper capability, and its direct rerun
passed. Following the common optional light receipt, the finite puzzle suite,
court codecs, six-group independent continuity, activity residency, accord,
ember, existing placed-puzzle and puzzle-reward checks all passed again. All
three type-check projects, production/preview builds, actual boot and all five
simulation smoke scenarios passed. Generation QA passed 869 cases across three
seeds with no failures: four known clearance warnings and one timing warning
for a 403 ms metropolis generation sample during concurrent verification.

The tagged natural 3,000-unit course now completes with the bounded candidate
cache and ordinary scenery avoidance, actors, AI, effects and rendering intact.
Excluding the separately reported arrival frame, ordinary control step p95 fell
from 168.1 to 45.0 ms and maximum from 310.5 to 133.2 ms; simulation p95 fell
from 158.0 to 36.2 ms. Steps over 50 ms fell from 145 to 43. These are measured
manual-step costs, not compositor FPS. The cache recorded 1,152,302 hits and
20,593 misses with 7,876 retained exact points. Both courses completed without
console errors. The final build also admits native courts, with final doodad
counts 1,112 versus 1,151 and actor counts 48 versus 49, so this is a qualified
before/after observation rather than a bit-identical causal experiment.

Separate instrumentation locates the reduced work in country candidate lookup:
country.near calls fell from 1,782,363 to 141,570 and measured ensure time from
6,484 to 140 ms. Instrumented costs include tracing overhead. Residual runtime
updates still spike around a 30-frame cadence, and cold path work remains;
there is no claim of smooth frame pacing. No post-arrival renderer frame
exceeded 50 ms in either ordinary control. Tagged reports preserve build
fingerprints, counts and screenshots for independent review.

Native survey spires and attunement circuits now use a shared beacon operation:
the original contested hold, native idle-only pull, pressure-scaled reinforcement
clock and nearest banked stone selection. The native worldgen resolver remains
the authority for a single 22-second spire and three or four eight-second
waystones. The weighted source denominator still includes unsupported native
objective families. Source count, radius, full tuning, birth rosters, native
wounds/deaths, remaining deadline and owner-named lure leases survive geographic
retirement and Continue. Saved native and faction-mix tables replay through the
same detached factories, including mix-only births. Global capacity refusal
advances the original due beat without manufacturing a replacement wave.

A beacon waits for a prepared physical discovery manifest before publishing its
fixtures. Targets are accepted native pyre, rift or excavation operations with
frozen context, exact stands/chest and body-clear approaches; preparation creates
no actors or visits. The same bounded plan worker prepares these destinations,
and exact native terrain/scenery checks yield between route samples. Native
portal clearances and historical native footprints protect actionable stands.
Preparing a destination reserves its original access geometry for later arrival.
The proof reaches surrounding dry country; it does not assert a continuous road
from the beacon to every destination or authorize drawing one.

Survey distance explicitly projects native node units (east 86, north 78) onto
the saved geographic zone span. The current supported projection accepts native
radii through 400 node units, with a bounded candidate query. Native count,
seed and reveal salt pick unknown destinations when the final stone fills.
Knowledge and actual visitation have separate geographic receipts: surveying
never explores intervening terrain, opens a cache or completes a visit quest.
Ordinary observed objectives record their visit even before a beacon exists.
The manually opened map gives bearings to known destinations; local stones use
native light, charge rings and flares without redundant objective narration.
Beacon bounties retain the ordinary issuing-board completion and payment rules.

Continue validates target source/access hashes, exact approaches, native beacon
reveal policy, legal knowledge phases and causal discovery timestamps. Already
born beacon tuning outranks current data defaults. The existing active-combat
transient save boundary and cumulative historical receipt growth remain explicit;
this pass is not a complete campaign, seafaring or infinite-memory claim.

The remaining periodic actor-retirement scan now weakly certifies only deeply
frozen plain data without actor references, numeric dependency fields, getters,
mutable collections or unknown classes. Uncertifiable controllers retain the
full original scan. Immutable sampled-terrain entries are replaced on edits and
restore, allowing the same certificate without omitting World.walk or mutable
terrain state. Adversarial pin-set comparisons retain direct references, late
actor IDs, weak ledgers, cycles, getters and frozen mutable Maps/Sets.

A surveyed excavation exposed a first-arrival fault: its nearby mounds stayed
absent because the distant reward chest and final access samples lay outside
the terrain-page envelope. Admission now starts when any original fixture is
in range, then checks the complete frozen site against authoritative cold
terrain, native footprints and portal clearances. Positions and access routes
remain unchanged. Regressions include the exact first mound, real non-solid
waypoints and an accepted cold monastery footprint; blockers still refuse
admission and removing the conflict admits the same owner.

Recorded region, zone and chunk descriptors are copied and deeply frozen once
on enrollment or restore. Queries share those immutable owners; controller
state, receipts and snapshots retain defensive copies. This removes repeated
whole-source copies from weather and reservation queries without adding a
history cache. The identity probe also covers nested input/snapshot mutation,
controller updates, bounded unrecorded queries and source-old Continue.

Beacon checkpoint verification: all three project type checks, standard build
and game boot passed. The final worldmass roster passed 83/83 rigs; generation
QA passed 869 cases x 3 seeds with 0 failures and 4 known clearance warnings, and
the 5 simulation smoke scenarios passed. The finite objective probe retains
its native fracture success arm: its chase stand now avoids actual road exits
so the fixture cannot accidentally leave the tested zone. The guestless
adoption negative explicitly removes generated resident guests; separate
positive resident precedence coverage remains. Neither change alters gameplay.

The final browser bundle index-CQM24TWN completed a natural single spire and
four-stone circuit, exact partial/solved CharacterSave Continue, once-only
payout, silent local cues and actual walks to their frozen discoveries. The
spire revealed 7 real targets and the circuit 2; surveying granted no visits.
Final walks took 2079 and 2053 ordinary 30 Hz input frames respectively and both
destinations mounted at unchanged access/definition hashes. Both target
screenshots visibly show their native fixture and charge arc. No console
errors were recorded. This functional course discloses initial teleports,
player invulnerability and native kill cleanup of 11/29 pressure enemies after
600 ordinary combat frames; it is not unassisted combat-balance evidence.

The preserved final matched comparison changes only dormancy certificates,
immutable sampled-terrain entries and immutable recorded geography; the
first-arrival correction is present in both builds. Control index-n6Sf7GPw
and candidate index-CQM24TWN share the same other source/build inputs and
identical worker assets. All four 3,000-unit courses passed. Excluding the
separately retained arrival frame, ordinary step mean fell from 46.44 to
21.21 ms, p95 from 74.9 to 41.1 ms and maximum from 263 to 167.7 ms. Steps
over 50 ms fell from 264/1064 to 26/1063. Both ended with 61 actors; ambient
RNG and worker timing still differ (1,225 versus 1,248 doodads), so this is
qualified matched-build evidence, not a bit-identical simulation or FPS.
Initial arrival remained expensive: 321.4 versus 307.8 ms. Native collision,
actors, weather, AI, effects and rendering remained enabled; initial teleport
and player invulnerability were identical disclosed controls.

An earlier two-module comparison without immutable geography showed cheaper
repeated retirement scans but a worse first certificate scan and more slow
steps overall. The final combined result must not be attributed to that
certificate alone. Cold certificate construction and other remaining spikes
still need bounded follow-up; no smooth-pacing claim is made. Preserved
reports, build manifests and screenshots retain both comparisons.

Generation review accepted this combined optimization with explicit residuals:
35 scheduled retirement scans averaged 71.1 versus 26.31 ms (median 70.5
versus 18.6), but the first scan worsened from 77.0 to 120.4 ms and another
candidate scan reached 114.4 ms. An attributed candidate step spent 167.2 ms
in path search. These remaining cold/periodic costs are retained as follow-up
evidence, not hidden by the improved travel average. Continuity review
accepted the beacon/circuit integration within the exercised scope; these
independent critics used the same model and do not constitute cross-model
review or acceptance of unfinished campaign/seafaring migration.

Published beacon checkpoint: commit 75bba196b9c6e92565880064ab67ed3e46ffe480
passed CI 37528609135 and Pages 37531998456. The seamless preview build manifest
was independently read back at that exact commit, built 2026-10-06T21:12:30.280Z.

Native surface processions now run through the original procession operation.
Their carts use the same native body factory, entry jitter, durability, grace,
rally radius, enemy wheel-stop rules, lure and scheduled ambush tuning. Native
source tables determine the full wave and species. Each caravan has its own
physical bodies and event key; nearby enemies still stop the wheels regardless
of which activity owns them. Arrival removes the cart without killing it and
pays its source-level reward once. Destruction spills the original source-bound
wreck reward once and grants no delivery reward. Finite processions share this
driver, with independent parity fixtures for its branches and random stream.

New country runs include the eligible native surface procession rows in the
same objective lottery as holds and beacons. Every native objective weight
remains in the denominator; unsupported choices are not replaced by another
reward. Existing saves without the new source catalog retain their original
selection policy. Source level, native tuning, weighted selection identity,
terrain edits, native structure reservations and actual movement obstacles are
part of preparation. Unsupported marine, realm, boundless and sealed-spoils
contexts do not acquire an improvised caravan mechanic.

A bounded pure worker prepares a dry route spanning at least three chunks.
Synchronous preparation uses the same kernel and yields between work units.
The saved route contains an independently re-emittable native kept-road recipe:
16–22-pixel discs at 30-pixel spacing, emitted by the original layTraveledWay.
The walk proof covers a 60-pixel corridor and 128-pixel terminal aprons with
native collision, cold terrain, historical footprints and door clearance. It
never carves away an obstacle to make a route succeed. The first leg is limited
to 240 pixels so the factory's original off-center cart spawn remains inside
that proof; later legs retain their 450-pixel limit. A continuous geometric
counterexample guards the rejected former 450-pixel first connector.

Unborn candidate queries create no actors, reservation or payout. A route can
be reconsidered if its terrain or scenery input changes before admission;
a born owner retains its exact route and source. Its complete cart/wave budget,
controller slots, road, optional chest and saved access publish atomically.
Any failed install rolls back only that attempted owner's installed scene.
Restoring a born caravan claims its missing population seats before optional
new content. Capacity refusal cannot truncate a wave or invent a smaller one.

Away from the player, the caravan pauses with native absence protection.
Observed bodies, active effects and cross-owner actor references continue to
pin residency; lures expire on their own clocks. Quiet retirement retains the
full native actor codec and wounds. Active Continue reconstructs the native
factory baseline and saved wounds/positions, with the existing transient
combat-state boundary explicitly retained. Save settles a just-destroyed cart
before capture. Return grants the original grace without creating a new cart
life, new wreck payout or completed delivery. Cave descent and a CharacterSave
inside the cave retain the same surface owner on return.

Processions communicate through moving carts, road material, rally rings,
reinforcement flashes and arrival/wreck effects. Local objective start/count/
completion prose is quiet. A multi-level reward emits one gold burst; gem and
Memory arrivals emit a colored glint while the actual ground item retains its
identity. Each removed reward floater's original random draw is preserved at
the same point in the native operation. These presentation changes do not
change reward amounts, passive points, item identities or source-level floors.

This is an open-country road delivery binding. A terminal apron is not a
finite authored exit, portal, campaign completion or sea crossing. Campaign,
Odyssey, faction progression, continuous sailing and remaining objective
families still require their own native bindings. Historical owner/source/
receipt metadata and cold Continue expansion remain cumulative. The current
live coordinate frame still requires the separately unfinished rebasing work.
Worker work allowances are soft: a page, hash or sweep can overshoot a slice,
and final synchronous scene checks/publication can be expensive. Functional
concurrent probes observed tens-of-milliseconds admissions; there is no new
isolated frame-pacing or smooth-FPS claim for this pass.

Visual review of the first completed browser course found a genuine movement
fault: the cart's center reached 150 pixels outside the certified road's
centerline. An instrumented replay attributed this to native navigation,
not weather or collision separation. MassWalk's grid ray overshot a negative
axis when a clear line ended at an exact mixed-sign grid corner; it returned
blocked and selected an unnecessary Manhattan detour. The ray now stops each
axis at its destination cell after checking every closed endpoint contact.
Rays lying on grid edges still check both sides; blocked corner, point and
endpoint contacts still refuse. An independent slab-intersection oracle checks
1,860 forward/reverse cases, including the actual caravan connector, and a
small traversal budget still refuses long rays. Native movement, actor
separation and weather forces are unchanged.

The presentation review also caught hidden random draws in the retired native
start/ambush/completion text. Rally retains its original draw after the due
clock; a successful ambush retains one after every actual body and flash;
zero-body batches and the loss bulletin spend none. Finite completion retains
its original post-reward draw. A geographic owner stores the corresponding
draws in its own durable stream. An independent archived finite-World
transcription now compares the actual factories, movement, loss, completion,
reclear, rewards and next random draw, rather than treating narration as an
RNG-free mock. Visual glints and the level-up burst similarly preserve all
five gem/Memory lanes and per-level draw order before mercenary normalization.

Caravan mechanics verification passed all 89 worldmass rigs with retries off,
including the six new source, route, worker, driver, continuity and gameplay
rigs. The continuity rig has 14 groups, including a natural chest-bearing
owner (-6,1): locked before arrival, earned on arrival, opened through the
real World chest artery, then still opened with no refill after CharacterSave
Continue. Native objective and Memory probes, all three type-check projects,
production build, actual game boot and all five simulation smoke scenarios
passed. Generation QA passed 869 cases x 3 seeds with no failures and the same
four recorded native clearance warnings.

The complete corrected browser course used index-C4ngOMtn, natural seed 713
owner (4,-2), and 5,158.524 units of frozen kept road across six chunks. Native
incoming damage reduced the cart to 2,062.632559725573 Life; partial Continue
retained that exact value. Every observed cart body remained within the
certified capsules or terminal aprons. Maximum centerline distance was
30.442 pixels before Continue and 23.636 afterward, versus 150.193 in the
preserved faulty-ray control. Maximum observed cart step was 1.7413 pixels
before Continue and 1.5045 afterward.
The final native delivery paid once, with XP 424 remaining 424 through terminal
Continue. Immediate cart death followed by save produced one wreck payout,
no delivery reward, XP 0 remaining 0, and no second wreck after Continue.
No console errors were recorded. The course used initial arrival teleports,
an invulnerable test hero and 41 disclosed native enemy cleanup kills after
ordinary pressure; it does not establish unassisted combat balance or FPS.

Screenshots of the corrected course showed the saved wounded cart on its
road and arrival through light rather than a LEVEL UP banner. They also
exposed an Ability Essence mint's duplicate name announcement. The final
cue-only follow-up applies the same preserved-jitter glint to essence and
gear mints. Independent tests compare seven native loot lanes, supplied and
global random streams, full item identity/provenance, discovery ledgers,
owned returns, discards and sealed/lesson refusals. The existing information
and reward-label probes retain explicit text transport and manual identities
without requiring automatic duplicate names over newly minted loot.

Final loot-cue browser verification used index-B1ufADhm. Actual native vendor
stock supplied a rare Brine Coil; World minted it beside a tier-III Ability
Essence packet. Both produced colored sparkle glints with no drop-name
narration. Real save, durable flush, reload and Continue retained the exact
two drops and XP, with no repeated glint or refill. The final mint and Continue
images were independently inspected. C4ngOMtn remains the full traversal
receipt; B1ufADhm adds only this tested, RNG-preserving cue correction. Final
local-cue (7 groups), reward-label, information-stream, ability-economy and
all-project type checks pass. These are same-model independent reviews of
specific ownership/integration seams, not cross-model review or acceptance
of the still-unbound gameplay listed above.

## Native ambient cold across geographic regions

Geographic contexts already retained the native tileset windchill dial and
country climate. The World driver previously returned early because the shared
seamless shell carries no windchill. It now resolves each live player seat's
local context and live wind independently. The camera player's sky cannot
supply a distant seat's weather, and no shared zone is replaced.

The native cold ladder, exposure bank, temperature/night/wind cadence, warmth
ward, standing fires, roofs, upwind doodad lee and shedding remain unchanged.
Crossing a chunk does not reset exposure. Country without a windchill dial
pauses the exposure bank, matching the finite driver's no-dial behavior; existing
statuses retain their ordinary decay. Immediate feedback remains the native
physical cold effects and status consequences, with no new local narration.

CharacterSave retains main's existing transient-player boundary: temporary
chill, frozen, hearthglow and exposure timers reset on Continue. Frozen region
sources and climate persist. This is not exact active-condition persistence.
No contact, effect, or full-mountain capability is added. Hearth crystals still
need their native contact/ICD owner; haven stones still need status-wash effect
ownership. Full passes and crowns also need tracks, creep, pitfalls and vertical
traversal. Current country source selection does not yet reproduce main's
climate/depth-weighted mountain-face selection, and grid rock alone does not
provide the doodad windbreak test. This slice activates source-authored ambient
cold; it does not claim the entire mountain traversal loop.

Independent windchill verification passed five groups: a transcription of the
pre-change finite driver compares statuses, sheet values, clocks and RNG; real
cold/warm sources and independent seats exercise the spatial reads; native fire,
roof, lee and ward fixtures exercise relief; CharacterSave pins the native
transient boundary. Native massif checks (three seeds), physical-weather checks,
all three type-check projects and all five simulation smoke scenarios passed.

Actual browser index-DRiuXMio used seed 713's Overpass/Forest boundary at
(21600,12300). Two native chill stacks reduced observed movement from 140 to 98.
Ordinary walking crossed both a region and a chunk in the same World and scene,
then native status decay restored movement in the warm country. The return walk
rearmed cold. Save/flush/reload/Continue retained exact location and source
context while resetting transient player conditions as native. This course used
a source-level-15 hero via native XP, no invulnerability and no enemy cleanup.
Two earlier pressure-death attempts remain recorded; this is not a combat-balance
claim. A directly applied native hearthglow verified its effect, not acquisition.

A separate focused browser course found the existing Wayside Camp campfire at
(5202.864,4303.732). Actual exposure 290 pixels away banked two chill stacks;
standing 65 pixels away in the same cold context shed both within four seconds,
with no roof, ward or wind. The fire remained the same live generated fixture.
No scenery or cold status was injected. This focused course used disclosed hero
invulnerability to isolate warmth from enemy pressure; native cold still applied.
Both courses recorded zero console errors and no local cold narration. The
exposure, warm crossing, Continue, ward and natural-fire images were inspected.

The broader verification caught the ember-court probe's obsolete demand for a
reward-name floater after the prior loot-glint correction. Its replacement pins
all six coal completion flares, actual kindling, native ground loot/glint and
reward-wash duration; Continue and repeat strikes cannot replay rewards, light
or the wash. All four corrected ember groups passed. No gameplay change was
needed for that failed presentation expectation.

The final complete worldmass rerun passed 90/90 rigs with retries disabled
in 304.8 seconds, including the corrected ember checks, cold, all six caravan
rigs and seven local-cue groups. Main remained bc8a0e0a at the final source
check; its eleven main-only commits concern presentation and capture tooling.


## Native haven stones and complete drover waystations

The unchanged drover_waystation composition now has the missing native effect
owner. Its haven stone, fire, cairns, optional shrine and surrounding scenery are
retained as generated. Haven supplies Cloud Haven concealment/evasion; the
separate real campfire supplies native warmth. No source is filtered to remove
an unimplemented centerpiece, and this does not enable full mountain layouts.

Descriptors freeze each explicit or rule-hydrated effect together with its
native status definition. Worker source identity includes those registries.
Admission refuses missing or incompatible haven contracts before physical
geometry is published. Other effect families still require their own owners.
Legacy effect-free descriptors remain valid; historical unowned stones cannot
silently gain a new mechanism from the live registry.

MassNativeEffects wraps the existing early World scheduler and status_wash
handler. Original timing, actor order, floor/range/dead/construct/invulnerability
filters, duration refresh and source attribution remain native. This includes
native acceptance of enemies, passive, downed and flying bodies. Chance-one
pulses still consume their native random draw. Rule hydration draws once;
explicit cooldowns, including an omitted first cooldown, keep their authored
meaning. Geographic streams are owned and saved per stone; finite scenes retain
their original global stream. This is not a claim of identical global RNG across
different streaming schedules.

The mutable cooldown exists only in sparse doodad state. Effect checkpoints
retain source slots and random draws, not a second clock. Absence freezes the
cooldown and produces no retrospective pulse or reward. Retirement unregisters
the exact scenery references without stripping already applied actor benefits.
Player statuses retain the native transient reset on Continue. Native pale
light and wash flashes communicate the local effect without explanatory text.

Scenery setup now rolls back its own entrance, regrowth and derived terrain
registrations if publication throws. Effects and court controllers roll back
before the scene is removed when composite enrollment fails. Disposers are
idempotent and cannot erase a newer registration with the same durable owner.

The paired source census resolved all 385 country sources at three declared
seeds and neutral diagnostic climate: 1,155 outputs with zero generation errors.
Admission rose from 643 to 661, with exactly the 18 drover waystations across
farmland, foothills, highland, overpass, snowcrown and stonecrown added and no
previous admissions lost. This measures compiler contracts, not natural frequency
or full gameplay parity. Native clustering can still decline individual props
when their original siting rules cannot place them.

Eight focused groups compare the real finite handler against the owned handler,
including every distinct filter, irregular time steps, chance-one draws and
physical flashes. They verify immediate saves before an explicit first pulse,
frozen absence, overlapping owners without duplicated status stacking, removed
scenery, exact rollback/retry, historical source refusal and cold sparse restore.
A further native entrance regression preserves an unrelated cave's actual dwell
object and elapsed clock when other owners mount, retire or shift array indices;
removing the actual mouth still cancels entry.

Generation QA passed 869 cases x three seeds with zero failures and four known
clearance warnings. Native compiler/worker checks, all project types, five
simulation smoke scenarios, classic production build and actual game boot passed.
After the cave-dwell correction, the final complete seamless run passed 91/91
with retries disabled in 302.1 seconds; all three project type checks passed.

Final browser index-DHgdz5Pc exercised unchanged seed713 waystations. The
farmland owner (6,-3) at (34997.708,-12946.764) used a vulnerable source-level21
hero. Ordinary walking changed detectability from 1 to .65 and evasion from 58
to 69.6, then native expiry removed the benefit after departure. Saved cooldown
.5999999999999968 and seven random draws survived actual save/flush/reload/
Continue; the transient player status reset, then the next pulse arrived after
18 ordinary frames. The strengthened retirement course waited seven extra ticks
before departure: cooldown .5666666666666675 and eight draws remained exact
while absent and on remount, with pulse counts 1/1/1 and no hidden catch-up.

Two natural Overpass owners retained their same live stones because real foreign
creatures still occupied their retention bounds. Those reports record the exact
pins and explicitly do not claim retirement. No creature, status or guard was
removed to obtain either result. Initial arrivals and distant return used
teleports; radius crossings used ordinary input. Native XP matched local source
level. Invulnerability was used only for its separate negative wash-filter test.
An earlier arbitrary departure died to ordinary combat and remains recorded;
these courses do not establish combat balance. All final courses had zero console
errors and no haven narration. Eight final images were independently inspected;
unrelated distant rift news on one image remains permitted by the gameplay rule.

A separate real browser worker diagnostic offered an unchanged provider source
to the actual native warm queue. One worker result completed with zero failures,
no error/disposal, and normal source/proof acceptance without scene publication.
This is labelled an explicit diagnostic offer, not natural look-ahead timing.
The two same-model critics accepted the specific source, residence, timing and
continuity seams; they did not certify full main parity or infinite history.

## Remaining long-journey boundary audit

A read-only audit at f3985d5c reproduced a live seed-713 update failure near
positive cell 4094: a generation halo reaches beyond localOffset's guarded
frame before the player itself reaches cell 4096. The nominal guard is
4096 x 960 world units; it is not a universally safe player radius. Production
rebasing has no callers, and cold native collision has a nearby cutoff too.
The existing rebase transaction is therefore a foundation, not live support.

The immutable home origin must be separated from the moving local frame before
rebasing can be enabled. Town geometry, service identities, level-distance,
return mouths, controller positions and dormant exact actor graphs all belong
to that work. Changing only the runtime origin or translating only live actors
would relocate home or restore stale coordinates. No bounds were widened.

Classic quiet-body paging is active, but cold Continue still expands all pages.
Geographic records, native source descriptors and changes, terminal population
identities, drops, cave memory and weather accumulation still retain history.
The next pager must use CharacterSave's existing root transaction for complete
native owners, a pageable spatial/identity index and lazy nearby hydration.
Missing state cannot be treated as unvisited land or regenerated factories.
The hierarchy's 128-controller bound is per owner and 4096 receipts is per
controller; neither is a global travel limit. Persistent foreign dependencies
can still honestly pin active capacity. These findings remain unfinished work.


## Cold Continue for existing native actor pages

The previous cold-expansion limit above is superseded for browser slots already
using quiet native cohort pages. The transport stays characterPages:1 and the
ordinary BrowserRunStore slot remains the sole durable authority. No second
root or portable-save schema was introduced.

Continue rereads its slot instead of using the menu's cached character. The menu
retains only display/patron metadata; its existing controls stay available while
loading so New Run can cancel. CharacterResume distinguishes a complete inline
save from resident mass sections plus immutable native-page claims. Validation
checks every page sequentially using the same structural gates as the native
codec, then discards each distant payload. Only resident and nearby native bodies
are created. Original native ordering, wounds, sheets, group identities and
once-only receipts remain owned by the native runtime.

Restoration prepares a detached World/account first. Native inventory, route,
climate, capital, relief and atlas helpers borrow that candidate only during
synchronous work and return to the currently adopted World between awaits.
Account Set changes, slot replacement, deletion, import, roster changes and a
new resume request invalidate publication. Malformed seamless world/sidearea
state refuses instead of becoming a fresh world. Candidate teardown releases its
runtime and exact page session without removing a newer owner.

Restore-only attachment mounts already retained owners before optional births.
At most two nearby cohort reads may hydrate at once. A missing required cohort
holds host movement, casting, AI and World time at the wake boundary; farther
prefetch alone does not hold play. Retry uses wall time, preserves all page/body
claims and never generates replacement creatures or pays clearance rewards.
Durable saves remain available while a recoverable page read is held.

An active native cave keeps the surface page session, restores its actual
interior and ladder, and does not interpret interior coordinates as surface
locations. The real return lands at its mouth before restoring nearby surface
cohorts. Portable exports still expand all referenced pages; a missing/corrupt
page fails export instead of silently dropping the character. Native files
remain inline, and couch guests retain the complete loader without binding their
old world pages onto the host.

Focused probes cover staged publication/global ownership, native readiness and
page integrity/authority. The scale fixture synthesizes 1,000 distinct transport
pages from genuine native cohorts: 2,000 native IDs, 33,217,790 payload bytes read,
maximum one preflight read at a time, and zero far Actor factories. Returned page
metadata is 319,602 bytes; the complete resume is 3,639,867 bytes because the
unchanged non-actor root remains about 3.3 MB. This is a transport scale test, not
natural encounter density or total-memory/GC evidence.

This improvement bounds cold native body reconstruction. It does not bound
all-history read time, page identities/order, disk use, feature descriptors,
objective/cave/controller history, or coordinate range. The numerical frame
limit documented above remains. Native caves still use scene transitions;
continuous seafaring, faction/campaign/Odyssey geography and remaining native
source families are separate integration work.

Final browser acceptance used index-BPfZZMdJ.js (SHA256
39fe96623a01e8d0ef822092dccf3b8313be06e60dece4d844116ef9957d719e)
through the actual menu and isolated browser storage. Ninety-six controlled
teleport trips produced 583 saved native identities: 103 resident and 480 in
five pages. Explicit GC retained 103 original Actor WeakRefs. This is generated
native history with controlled travel, not natural walking-density evidence.
The root still occupied 6,210,880 bytes.

Cold menu entry read no actor pages and created no native bodies. Missing and
corrupt far pages both refused Continue before any factory and left root/account
unchanged. Repaired Continue validated five pages and reread one nearby cohort:
96 historical bodies returned in their original order, 384 remained paged, and
three optional new births brought residency to 202. The 296 total factory calls
also include ordinary settlement setup; they are not all cohort restorations.
After explicit GC no instrumented parsed page-root WeakRef remained. This checks
retention of those roots, not peak bytes or constant total memory.

Required near-page delay held 20 frames without advancing input or world time.
A subsequent missing-page retry held 12 frames, preserved all 96 claims through
a durable Save, and restored their exact wounds without using simulation time
for retry. A malformed active cave ladder refused; repair restored the same
hero at the exact cellar pose and the native exit returned to (195,375), while
192 far bodies remained paged. The existing New Run button cancelled a delayed
Continue into its provisional class-selection flow; this did not mint a new
replacement vessel.

The actual Options Download action refused missing export bytes, then produced
a complete inline export after repair. After deleting only the isolated test
profile's old native-page database, the actual file-input and confirmation
import restored all 586 exported bodies with no actor-page reads. The report
and its exact harness copy are native-resume-ui-final-BPfZZMdJ under the ignored
balance/reports directory; the reusable course is balance/native-resume-ui.cjs.

Final verification: all three type-check projects pass; all 93 worldmass probes
pass with retries disabled (358.8 seconds); persistence and simulation smoke
pass; generation QA covers 869 cases across three seeds with no failures and
five warnings. The four final browser images were independently inspected and
the course reports no console errors. This is scoped same-model independent
acceptance of cold restoration, not certification of complete main parity.

Reciprocal review then reproduced two preflight/decoder mismatches: invalid
array/typed-array properties and unsupported formation identities. The shared
validator now checks encoder-representable fields, prototype safety, exact
position versus page-distance metadata, and explicit native formation baseline
identity/species. Valid sparse arrays, aliases, numeric sentinel clocks, magic
packs and encounter formations remain accepted. The expanded characterresume
probe passes six groups; nativepaging passes two and dormancy passes ten.

The repaired final client is index-C-gWPEy0.js, SHA256
f7be3284c233f059bea4d7ab2d1b806264570dbeabe29becd93b35bc9c4f360f.
A separate focused browser course copied the prior course's genuine 586-body
history and let the normal runtime page it again; it did not repeat or invent
travel. Three coherently rehashed far-page faults (array length, typed-array
named property and unbacked squad) each refused before any Actor factory while
preserving the current World, account and durable root. Repaired Continue kept
298 bodies resident and 288 in three distant pages, with exact order and pose.
Actual export/import again restored all 586 bodies without old page reads.
All five follow-up images were inspected and console errors were empty.

The corrected-client report is native-resume-validator-ui-final-C-gWPEy0 in
balance/reports, with the exact harness preserved beside it. Its reusable course
is balance/native-resume-validator-ui.cjs. The earlier full cave, delayed-wake
and New Run course remains attributed to BPfZZMdJ; these two reports are
complementary functional evidence, not a performance or constant-memory claim.

The shared staged-World probe also exercises unchanged finite crossroads saves
for mortal and roster-owned immortal characters. Both exact and selected-town
wakes preserve native survivor memory/routes; subsequent saves use the proper
slot without overwriting the mortal run. It now passes eight groups, and the
final test-only addition passes the simulation type check.

After the codec repair, all 93 worldmass probes passed again with retries
disabled (444.4 seconds), all three type-check projects passed, and the complete
persistence harness passed. Classic production build/boot passed before the
validator-only repair; the final preview build and targeted browser course
cover the corrected client. The classic/roster test-only addition passed its
focused eight-group run and simulation type check separately.

## Native burial urns, graveyards and ruins

The unchanged country catalogue now admits complete native urn providers through
MassNativeBrittles. Original composition geometry, urn positions, doors and native
side-area mouths are retained. The reference is main
bc8a0e0a9211815d99dcf0ea389e451157c0684d; this adapter does not add a new quest,
completion reward, explanatory caption or combat tuning.

Frozen source contracts intern the complete urn rule, resolved ceramic motion,
emitted debris rule, native skeleton definition/skills/material nature and actual
inherited tell specifications. Selected dissolution/tell implementations and
worker source identity must remain compatible. Missing historical ownership and
unsupported native branches refuse the entire feature before geometry admission.
Only open, default-bounty, unfloored reward contexts are currently supported;
the actual shell and its live quickening multiplier must also be equivalent.
Birth level and direct orb/gem/ground context come from the immutable source.

The native handler remains the sole pop operation. A maximum-two-body lease is
visible in the shared census before the urn changes or any random draw occurs.
Recursive cave_in breaks see outer pending leases. Predictable preflight refusal
leaves the urn untouched at that boundary; it does not undo an attack that reached
it. Once native side effects begin, the operation is synchronous and once-only.
Unexpected postcommit failure latches a fault and refuses incomplete checkpoints;
there is no claim of rolling back arbitrary procs, damage, kills or account loot.

Birth receipts keep the actual factory draw tape and original factory baseline,
then each body's identity, position, wounds and death. Restore replays only the
detached factory; it never repeats a break, surface proc, reward or emergence.
The complete factory baseline stays immutable; current native party scaling is
saved separately and restored before wounds. Actual join/leave rounding, including
finite life above the current maximum, remains exact. Settled source-incompatible
role or immunity flags refuse capture and restore. Independent birth counts reject
missing body rows. Dead tombstone IDs cannot collide with new live
actors across repeated Continue. This owner is the sole wake authority: it does
not tag wakes into fromZoneGen memory or ordinary native actor pages.

Streaming retains active emergence, motion/debris and actor dependencies until
native cleanup releases them. Fully quiet closed bodies retain their complete
codec. The exact native tell deadline/specs/values/revision may sleep under a
source-specific certificate: tells only observe state, and the ordinary scheduler
evaluates once when its saved deadline has elapsed. Other deadlines remain pins.
The native separation sweep clears its completed query scratch rather than hiding
references from the dependency scanner. Active Continue retains the established
native transient boundary, with exact birth/wounds/deaths but no promise to resume
every action or fragment. Possession saves the true hero and projects the borrowed
body to its native enemy baseline without ejecting or mutating ongoing play.

Uncollected loot remains in normal ZoneContents; picked-up inventory uses normal
character saves. Resource orbs remain native scene transients. Broken scenery and
birth receipts are captured together, so remounting cannot regenerate a pot or
reroll its contents. Controller enrollment rollback is separate from gameplay:
every earlier scenery/controller/body publication is undone if a later mount
fails before the scene is observed.

The repeated source census uses the same 385 entries, native sizes, level 15,
three diagnostic seeds and declared neutral climate as the haven baseline.
Catalogue hash remains 2db84ac4df20c119. Admission rises from 661 to 770 of 1155 rows:
109 newly clear rows across 46 source entries, zero lost admitted rows and zero
errors. These are diagnostic admission counts, not natural spawn frequencies.
The country provider still omits native biomeDepth; this does not certify the
original fringe-to-heart siting rules. Tier/track/context-dependent providers
remain refused whole. Native mouths still transition scenes; continuous caves,
full campaign/Odyssey/faction geography, seafaring, complete historical paging
and live coordinate rebasing remain separate work.

The native entry-title and immediate, deferred and vent swarm captions are silent.
The original global jitter draws remain at their precise conditional, per-seat
and once-only boundaries. Swarms, burrows, clocks and native cues stay unchanged.
The localcues regression compares 46 complete swarm cases and four full zone loads
against archived main methods/statements; it preserves exact draw tapes, downstream
sentinels and physical results. The archive runs on current native helpers, so it
is not a claim to execute a complete old engine.

Verification on the final production tree: source contracts passed four groups;
lifecycle passed eleven groups. Independent reciprocal review rejected 27 altered
factory fields, four visual variants, six settled role/ownership mutations and
seven malformed current-party shapes before publication; 24 additional real
public-seat transitions retained exact current wounds and the original factory.
The original independent scratch had an instance-identity fixture mistake; the
corrected independent copy is retained with the failed original.

Native pop parity passed 240 paired cases: 192 against the pinned main handler,
24 whole family_plot owned/unowned cases and 24 differing source/shell contexts.
The latter observed actual orbs, gems, wake bodies and source ground. A real
progression runtime retained the wake's source reward level after distant movement.
This does not claim integration of every alternate non-progression configuration.
Native dissolution, emergence, possession, tells, persistence and lite checks,
all three type-check projects, five simulation smoke scenarios over five seeds,
and classic build/boot passed. GenQA passed 869 cases across three seeds with zero
failures and the four existing geometry warnings.

The final browser course is native-urns-accepted-XyQzvXLR, built from the final
production source (index-XyQzvXLR.js, SHA256 prefix 564fa03773ef6d12). It used seed 713,
two unchanged natural source sites and four input-driven urn breaks, including
touch and hit. An actual attack wounded a native wake from 181.8 to 164.98442447940104
in 21 frames; active, wounded and dead Continue retained the intended receipts.
An uncollected Rough Memory survived Continue exactly, ordinary walking collected
it in 19 frames, and another Continue retained inventory without a ground duplicate.
The native mausoleum admitted after 45 walking frames, kept the same hero and exact
interior/return position through Continue, and returned to the surface in 39 frames.
Both cave-entry captures had no duplicate title or swarm narration. The course
recorded zero console errors and 17 screenshots; the report retains exact source,
harness and client identities.

A preceding run of the same final client failed a straight-line test walk against
a native cart after successfully preserving uncollected loot. The final harness
uses its existing body-clear approach method for pickup too; both reports remain.
Controlled approach placement, player invulnerability, native grantXp and the
labelled direct native kill receipt are disclosed in the report. No source,
geometry, spawn rule or reward RNG was substituted. This is functional acceptance,
not performance or combat-balance evidence; quiet streaming retirement is proven
by the native headless lifecycle checks rather than the browser course.

The complete final worldmass gate passed 96 of 96 probes in 432.0 seconds with
retries disabled (four workers, 300-second per-probe timeout). Independent
same-model reviews accepted the bounded source, lifecycle and final browser
scopes; they are not cross-model consensus or evidence of full main parity.

## Shared native region geometry and the next country boundary

`world/regionGeometry.ts` now owns the original integer hash and weighted,
jittered regional geometry. `world/biomes.ts` supplies the existing native field
picker, including its climate bands and existence floors, and the original
per-biome scale data. Scan order, pruning, strict ties and the different-biome
depth calculation remain exact. Adjacent cells of the same biome retain an
interior instead of creating artificial fringes. The leaf takes explicit
readonly policy/callback inputs and owns no memo or ambient random draws.

This is a preparatory source extraction. The current country still uses its
saved square-region selection and omits biomeDepth. The native field picker
still reads its established global climate/anchor policy; extracting geometry
does not make that entire policy immutable or solve a worldmass coordinate
mapping. The native hash retains signed 32-bit cell coercion and its existing
aliases. A future address adapter must state and verify its supported domain.

A separate deterministic native-source survey over 15,553 targeted samples
found real fringe/interior pairs within the same native region. With the
original complete composition generator, buried_village produces zero pieces
at its desert fringe and 31 inside (two urns and the vault gate); sepulcher_site
produces zero and 15 (two urns and its gate). Temple of the Green and the
Sundering likewise obey their native depth gates. Omitting depth admits the
full compositions at those fringes. The providers' chance-one diagnostic
wrapper is explicit: these are eligibility results, not natural spawn rates.
Across 128 pinned desert selector cases, supplying actual depth changes 63
native tileset choices, with the same subsequent random draw.

Two declared coordinate projections also produced different biome owners from
the present country sampler. Neither projection is adopted by this extraction.
The next country integration therefore needs one saved source policy and
mapping for biome identity, depth, climate and native tileset selection, with
a stable zone mint anchor shared by features, objectives and weather. Native
source gates must receive that source's depth. Existing saved configurations
and born descriptors remain authoritative; filling old missing depth with a
new value would change their geometry and obligations retroactively.

The extraction's durable geography probe passed 1,837 archived-native comparisons
plus the existing region, cliff, density, terrain, save and network checks. A
separate same-model review passed 2,844 complete geometry/callback-trace cases
and 288 classic-wrapper comparisons. Types for all three projects, grove, garden,
mountain, scald, warfront, biome-share and nativecountry probes, classic build/boot,
and GenQA's 2,607 cases passed; GenQA retained its four existing warnings. An
initial test-only implicit-any error was corrected with explicit generic policy
annotations before the final type check. No country depth activation or infinite
address guarantee follows from these results.

## Generation variety is a world contract

The renewed target is complete native content in one coherent continuous world,
followed by repeated experience and correctness passes. Counting catalogue rows
or props does not establish parity. Track each behavior through natural
selection, whole-source compilation, admission/refusal, access, activation,
progress, absence, return and cold Continue. Current broad parity remains open.

The next foundations and their acceptance outcomes are:

| Foundation | Required player-visible result | Current boundary |
| --- | --- | --- |
| One saved geographic context | Ground, native biome, interior depth, climate, face, population and weather describe the same place | NativeGeographySource now owns complete immutable base-field/face sampling; physical address mapping and terrain/population projection remain open |
| Regional waterways and terrain topology | Rivers have coherent courses and crossings; lakes/ponds have shores; mountain routes include passes, detours and deliberate barriers | Local ingress and procession routes exist; they do not prove regional connectivity |
| Local material patches | Ordinary mire leaves usable neutral routes; exceptional broad hazards belong to explicit points of interest | The new physical patch policy below covers bounded mud/swamp hollows; broader hazard programs remain open |
| Complete native layout ownership | Towns, cities, pillaged districts, groves, crypts and side areas retain all native controllers, residents and environmental mechanics | Current massif/structure/composition admission remains selective; unsupported dependencies still refuse whole sources |
| Durable work and route consequences | Bounties and native quests open specific blocked sections, with persistent world changes | Existing exploration bounties certify completed deeds; they do not yet open regional routes |
| Continuous interior and vertical access | Entrances, stairs, cliffs and underground routes have explicit physical and save ownership | Existing caves are scene-based; tier/track and seamless underground integration remain open |
| Contextual ecology | Native habitats and encounters vary with geography, time and place activity | Five base families and supported native garrisons are a partial population vocabulary |
| Long-history ownership and moving frame | Travel, consequences, loot and returns stay bounded and exact across very long play | Terrain caches and actor paging are bounded; full feature/controller/history paging and live rebasing remain open |
| Repeated experience passes | Ordinary routes offer meaningful discoveries, different combat spaces and real traversal choices | Lifecycle proofs are necessary but cannot establish pacing or lasting interest alone |

Measure experience separately from controlled mechanics courses: distance and
world time between useful discoveries, repeated activities, unavoidable slow
terrain, detour lengths, declined source families, population saturation,
frame cost and save growth. Do not clear a path or force a source and count the
result as evidence of natural distribution. Preserve native behavior where it
is reused; record new continuous placement policy separately. Main's native
32-bit geographic hash, scene assumptions and current missing adapters remain
explicit constraints, not reasons to silently substitute different content.

## Native field selection

`world/fieldChoice.ts` shares the original field roll, ordered climate bands,
weight fallback and complete existence-floor search through explicit reader
inputs. Every instance owns its pick and floor-seat memos. Classic biomes keep
the original live registry/anchor readers and invalidation lifetime. This is
preparation for a saved geography policy; it does not activate native depth in
old square-country descriptors or freeze the climate/continent readers.

The durable archived-source oracle covers complete input-read and callback
tapes, synthetic gates and duplicate tilt rows, native canonical sites,
reentrant floor-seat construction, memo limits, reset/anchor invalidation,
immutable exported seats and two-instance A/B/A isolation. Its unchanged
native readers are explicitly outside that extraction oracle's scope.

## Localized physical terrain

Fresh terrain version 8 uses neutral marsh ground with mud/swamp pockets and
occasional muddy woodland hollows. Saved descriptors without `patches` retain
their original surfaces, fields, identifiers and draw streams, including broad
historic marsh mud. There is no silent save migration. Versioned patch recipes
are part of the run manifest, with native material IDs and a single shared
lattice independent of render pages or visit order.

`engine/genkit.ts` shares the exact native pour core/lobe construction and
radial membership predicate. The finite generator retains its original siting,
guards, depth core and liquid painting. Continuous patches rasterize that
shared geometry directly into physical region cells; these cells are not a
claim of footprint identity with native overlapping doodad paint discs.
Rendering, movement, navigation costs and native status effects read the same
region. No duplicate wet doodad layer applies a second terrain effect.

Every ordinary candidate must retain its entire raster shape on eligible
neutral floor. It is declined whole if a shore, wall, another material or an
existing place blocks the footprint or its complete neutral bypass annulus.
Conservative reach and raster bounds keep all candidates and bypasses inside
separate lattice cells. Neutral ground here means `ground`, not the older
access predicate whose dry set includes slowing mud and sand. The fresh
60-unit-wide ring supports a full player body around both sides and corners;
this is local circumvention, not a guarantee of worldwide connectivity.

Fresh runtime construction also pins an explicit address-space exclusion for
Lastlight and the finite opening quest network. Its conservative hull covers
every town tier, ordered destination/extension offsets and jitter, lateral road
stops and scenery margins. It is resolved before final manifest construction;
workers receive the same rectangles and Continue never recomputes them from
current account or source tuning. This deliberately reserves some neutral
opening countryside as well as the actual fixed foundations.

Ecology reserves the ring using complete native movement-shape bounds,
including long logs and rock satellites. Native country features and objective
fixtures also respect it, in both synchronous planning and prepared-result
validation. Neutral roads can cross it. Live creatures and player consequences
are not permanently absent from a traversal route. Existing native feature
sources may still intentionally contain wider wet areas; the local patch
contract does not rewrite their source geometry.

Candidate IDs retain full signed address text, geometric math uses bounded
local offsets, and partially representable lattice cells at the address-domain
edge decline rather than overflow. A bounded cache changes work only, never
geographic decisions. Physical region enumeration includes patch materials in
both the live runtime and route workers. Adding a material does not authorize
missing native mechanics or bypass whole-source admission.

Focused acceptance includes 15 field-choice oracle groups (28 archived/new
paired runs), 966 native pour pairs with exact RNG/mask/wrapper receipts,
and 12 terrain-patch contract groups. These cover 441 archived old-terrain
comparisons, 98 swept bypass routes, extended log/rock reservations, full signed
addresses, cache eviction, 18 exclusion contacts and 558 actual opening
footprints. Two naturally conflicting opening patches decline whole while
12 unaffected neighboring plans remain identical.

The fixed preset survey sampled 7,803 lattice-centered points over three seeds,
including 446 marsh samples (279 neutral, 102 mud, 65 swamp), and found 188
patch plans. Its center bias makes it unsuitable as an area-coverage estimate.
The separate current-site census checked 143 doodads across 18 repeated-site
recipes, including all 116 movement blockers, and found no actual physical
overhang. This evidence covers those source templates; the general historic
site validator still uses nominal radii and does not certify arbitrary future
custom movement shapes.

The browser course on the reviewed preview bundle walked complete upper/lower
bypasses around both naturally selected seed-991 pockets with the actual
15-unit Warrior radius. Mud changed native speed 200→120, swamp 200→90;
ordinary exits restored 200 after native linger. Two hundred sampled physical
cells matched generator, stream and live navigation, including cold Continue.
The course preserved real scenery and used the full runtime, but no native
features were resident at these two pockets. Feature exclusion is covered
separately by admission checks. Initial arrivals used
labelled teleports and native XP grants raised the hero to level 5 in level-4
country; movement thereafter used ordinary input. It did not clear scenery,
paint ground, inject statuses or grant invulnerability. Twelve screenshots
record arrival, bypasses, effects, Continue and recovery. Software/offscreen
frame timings during concurrent tests are diagnostic, not interactive FPS.

The preview smoke harness now awaits the durable browser save queue and checks
the IndexedDB character root before fresh-renderer Continue. The previous
localStorage-character assertion predated native page persistence. Six
production-storage sentinels remain unchanged in the isolated preview profile.

A separate seed-991 timing course on the same bundle retained identical plans
and saved configuration, with no concurrent repository checks during its
measured run. Across 487 instrumented manual frames, top-level patch work was
120.6 ms of 10,786.1 ms total step time (about 1.12%); nested calls were not
summed twice. Patch work reached 3.1 ms in mud and 9.4 ms in swamp. Five outer
frames exceeded 100 ms, dominated by simulation work outside these wrappers;
patch work represented 1.4–4.1% of those steps. This narrows the attribution but
leaves the broader simulation spikes unresolved. It is not a performance pass
or an interactive-FPS measurement.

## Native dimension and face rules: shared exact cores

NativeClimate and NativeContinent now share their native arithmetic with the
classic adapters. The climate source API captures the effective ordered axes,
named bands, private dimension overrides, and resolved origin/anchor states.
A captured climate reader must receive immutable continent readers; callbacks
alone do not prove a complete frozen geography source. The continent reader
owns all four native configuration values and preserves the fixed home land
pin, bridge rules, landfall behavior, and signed 32-bit hash semantics.

The realm geometry and tileset picker also use shared native operations.
Realm ownership and depth remain separate operations with their original
palette fallbacks. Face selection preserves shared then realm pool order,
duplicates, raw depth/climate inputs, all-zero fallback, and the caller's
random stream. Complete base-field capture, physical-to-native mapping,
terrain/population projection, and source-owned country activation are still
separate remaining work.

The durable extraction probes embed pinned native implementations rather than
calling the replacement on both sides. The continent course covers 46,969
operation pairs, 3,006 classic-wrapper pairs, exact read/call tapes and 300
instance-isolation cases. Realm checks cover 1,800 site/depth tuples, exact
read tapes and 80 actual classic-wrapper pairs. Face checks cover 4,080 actual
registry selections and 1,440 ordered data/callback/random tapes. Existing
civic and sea courses pass. These are source-preservation checks, not evidence
that previously unsupported towns, interiors or traversals are now admitted.
The NativeClimate course additionally passes 16 groups and 1,033 exact
comparisons, with 20 explicit refusals of source data that JSON would erase
or change. This validation stays at the new capture boundary; classic
arithmetic, including signed zero, remains unchanged. Generation QA passes
2,607 cases with no failures and four existing warnings; simulation smoke,
geography, dimensions, biome share, settled-country and field-choice probes
also pass.

## NativeGeographySource: complete base-field capture

The native-geography-v1 source owns one explicit uint32 field seed, all 50
current biome definitions, all 123 complete tileset definitions, all three
effective dimension definitions, ordered field/band/floor policies and actual
shared/realm face pools. It also owns the complete native continent policy and
climate source, including effective private overrides and already-resolved
origin/anchor states. Capture happens explicitly after native registration and
world binding. The new factory imports only native leaf operations, constructs
its own readers and caches, and never binds or modifies another World.

Its identity is the exact serialized source text. Nested record order, pool
duplicates, full source payloads and tagged missing/null/undefined anchors stay
observable; unsupported or lossy data is refused before JSON can normalize it.
Private execution views use own properties, including the native unknown-band
fallback, so later inherited property additions cannot change sampled results.
Prototype lookup aliases are outside this new source/API domain. The classic
adapters keep their original permissive behavior.

The explicit supported work limits are region search at most 16, aggregate
floor candidate boxes at most 262,144 cells and landfall at most 4,096 steps.
Unsafe lattice indices, derived sites and coordinate arithmetic refuse before
a native loop. These limits do not clamp native policy values. They establish
coordinate/work safety, not numerical conditioning of every possible extreme
authored coefficient. Native signed 32-bit hash aliases remain explicit; this
sampler is not a proof of unbounded geographic uniqueness.

The durable composed course compares 520 full native geography tuples and
2,040 face selections with next-RNG sentinels across four seeds. It retains the
real seed-713 desert, jungle and rift fringe/interior witnesses, full registry
copies, thirteen independent live-source mutations, cold serialized restore,
and a second World binding. Five directed mutations also change new-source
sampled values. A 16,420-cell realm course crosses the native memo cap and
revisits in reverse order. Eight custom surface-palette comparisons preserve
the native mixed-table cache interaction: that custom case is deliberately
call-order dependent, so unrestricted order independence is not claimed.

Independent adversarial checks reproduce and close inherited axis/envelope
leaks and non-terminating derived floor scans. A separate worker-style module
load matches six complete operation sets using eight native leaf modules,
with no live registry, data, worldmass or global-random dependency. Durable
regressions cover the repaired scan bounds, prototype lookup/fallback, missing
face payloads, absent pool targets and unsafe derived climate sites.

This completes the base-field and face-selection source boundary. Full source
records do not include every downstream structure/composition/layout handler,
so they do not establish a complete native layout compiler. The next playable
phase must connect a saved physical mapping to authoritative substrate,
habitat/population, complete admitted face layouts, bilateral openings and
barriers, and cold Continue together. Adding native depth to the old unrelated
square-country policy remains invalid. Regional hydrology, full towns/cities,
shared crypt/interior graphs, bounty-opened routes, and long-history paging
remain open in the broader generation ledger.

## NativeAreaFoundations: complete recipes, physical owners and connections

The classic native recipe mint now delegates to `engine/nativeZoneMint.ts`.
All definitions and source operations are explicit providers. Native graph
placement, graph mutation, atlas destination resolution and source-anchor
selection remain in the classic adapter. Topology hooks execute at the original
name, map/frontier, course-continuation and waypoint boundaries, retaining the
native main stream and explicit-seed identity substream. This enables a new
physical area policy to share the complete face/variant/objective/footprint/
layout/war/blend/annex operation without borrowing a mutable finite graph.

The saved physical mapping uses complete native source JSON as a string so a
parent manifest cannot reorder source properties. Two recorded origins and a
positive reduced rational scale map signed addresses by exact integer/rational
arithmetic before one documented binary64 rounding boundary. An explicit native
envelope and native reader guards refuse unsupported travel instead of wrapping
or clamping. Stable owner requests supply a target and seed; the complete source
resolver can replace both for an atlas destination before face selection. Point
queries do not reroll a recorded area. Inverse anchors must reproduce the exact
native point after physical address rounding; unrepresentable anchors refuse
instead of moving the requested site. No default map scale or new preset has
been activated by this foundation.

`nativeAreaGeometry` preserves every generated layout collection, the actual
packed grid or analytic footprint, and resolved native material and movement
facts. Ground doodads remain a separate ordered native channel; they are not
flattened into a second grid effect. Rectangular physical ownership is half-open
at right/bottom edges so adjoining owners can meet; original bounds bytes and
classic finite actor confinement are unchanged. Capsule clearance is a bounded
conservative proof for ordinary ground-tier walking, not a replacement for
native sliding, jumping, tier movement or a universal path-existence solver.

`nativeAreaSeams` plans both mouths from the same complete physical owner
references before generation. Rectangular facing boundaries are its first
supported shapes. It explicitly refuses other boundary kinds, overlaps and
insufficient clearance. Its bounded route search preserves mandatory mouths
and stays inside a reserved corridor; it never clears a wall, moves an entrance
or rerolls the selected face. Publication requires a full swept body test in
both directions, exact current owner sources, and an unchanged physical revision.
A global complete-owner reservation is still required before area publication;
pairwise planning alone cannot establish absence of unrelated neighbors. Saved
receipts require actual collision reproof after restoration; source bytes alone
cannot certify a clear route. All saved seam input rejects accessors before any
validation read.

The physical integration probe naturally selects an entire forest/districts
recipe and a saltflat/dunefield recipe, supplies paired mouths before native
generation, and retains all generated output. The original straight connection
fails on a native district wall even though both endpoints are clear. Bounded
routing finds and proves a detour without changing that wall. A real native
closed door spanning the connecting substrate blocks the course; opening it
restores collision passage. Exact geometry restoration retains the reverse
capsule proof. This is headless generation and geometry evidence, not a claim of
a completed browser trip, ambient population admission or finished objectives.
The proof connects the two interior approach points through both mouths; area
admission must separately connect those approaches to spawn, objectives and
other required internal components.

The coherent fresh-run activation gate remains open. It still requires a real
installed compiler/source certificate, authoritative substrate outside areas,
source-appropriate ambient packs and habitat, all selected objective/environment
owners, durable sidearea transitions and actual cold browser Continue. Towns,
cities, regional watercourses, shared interiors, bounty-opened sections and long
history residency/rebasing remain in the broader generation completion ledger.

## NativeAreaRoutes and NativeSubstrate: physical integration beyond seams

NativeAreaRoutes extends the proof from paired boundary approaches into a whole
native area's interior. Exact spawn/entry and interaction/approach stands connect
through continuous capsules over retained grid, silhouette and doodad geometry.
A bounded deterministic search may conservatively refuse a route; it never snaps
an endpoint, erases a wall, exempts a closed door or takes an exterior shortcut.
Ground-tier walking is the current scope. Higher tiers, mutable gate authority
and automatic discovery of every required objective stand remain separate.

The naturally minted forest/districts and saltflat/dunefield controls retain all
32 and 167 doodads. Their entry-to-approach routes measure 6,197 and 4,039 pixels,
including the forest detour. Serialized restoration rechecks every segment in
both directions against the complete geometry identity. Synthetic controls retain
closed/open native doors, ellipse exteriors, exact fractional stands, disconnected
annexes and bounded failure. These geometry-only controls do not substitute for
the compiler's original load-time boundary/road/meld and generation-port inputs.

NativeSubstrate is a saved optional MassSpec discriminator consumed by the real
MassGenerator, MassStream and MassWalk. Complete source JSON and explicit mapping
own biome, native depth and every climate range input. Independent noise layers
and the old place lottery are refused for this policy. Every captured biome must
have explicit authored outside-area material/palette rules; these rules neither
select a complete face nor reproduce its generated native layout. Existing native
pour patches use that same geography, preserving neutral annuli and their scenery
reservations. Broad bog, swamp or mud base cover is refused; an intentionally broad
hazard needs a complete area owner with its own navigation and activity.

The fixed native field survey covers 625 points and 26 naturally occurring biomes,
including forest, jungle, marsh, desert, highland, tundra, coastline and ocean.
Cold policy restoration retains every sampled field/material tuple. A native marsh
control contains 29 mire cells with 68 neutral bypass cells; actual page samples
and collision queries agree with the generator. Entire optional patch candidates
that exceed the finite mapping envelope refuse before sampling outside it. Saved
fields and patch conditions ignore inherited process defaults. The original
terrain policy remains selected when the discriminator is absent.

This connects physical terrain preparation, page streaming and collision under
one native field. It does not ship an adventure with empty or mismatched living
content: WorldMassRuntime explicitly refuses the new substrate until complete area,
population and controller ownership exists. A shipped outside-area palette policy,
measured map scale, ecology/habitat policy and the ordinary browser traversal /
sidearea / cold Continue course remain required before fresh-run activation.

## NativeCompleteAreas and NativeAmbient: complete load inputs and living stages

NativeCompleteAreas compiles the complete native layout with its original
load-prepared boundary, road and meld inputs. Finite generation ports and true
physical seam mouths are recorded separately: substituting one for the other
changes structure eligibility. Three archived actual native loads retain the
meadow's 278 doodads and walled manor, the saltflat's 144 doodads and watchtower,
and the downs' 246 doodads, three boundary gates and watchtower. Ten complete
output pairs preserve every generated collection, mechanism side channel,
entrance seed and the next four generation draws. Restore consumes the complete
saved result without consulting the live generator or registries.

The compiler requires an explicit synchronous same-build/source lease covering
mint and boundary provenance. Its caller-provided certificate is a trust boundary,
not a complete captured dependency closure. There is no production issuer yet;
valid descriptors still refuse runtime publication. Collision-adjusted entrance
seats, shared interior bindings and the full lifecycle owners remain required.
Malformed positioned records, cave seeds, effect/brittle sources and accessor
inputs refuse before admission. Requirement enumeration does not grant support.

NativeAmbient shares the original pack spawning, habitat placement and wildlife
operations with classic World through explicit geometry, factory, controller and
random inputs. The wildlife stage stays later in native load order. An archived
original-method comparison covers 48 pairs, 453 factory attempts, 415 admitted
bodies, eight grouped bodies and 2,753 exact random draws and stream sentinels.
Frozen resolved pack and wildlife receipts retain full tables and explicit absence;
they do not implement the upstream weather, conquest or world-simulation owners.

Full area ambient admission still requires local encounter-group placement,
source-equivalent factories and resolutions, durable born slots and bounded live
actor paging. Sleeping bodies must retain their native state and cannot count as
dead or disappear from objectives. The current shared actor limit cannot be solved
by silently dropping native packs. These boundaries prepare the coherent playable
course; neither a helper extraction nor a successful restore is that course.


## NativeAreaLocal: full-layout local preparation with shared native operations

NativeAreaLocal now composes complete retained geometry with the actual shared
navigation, free/far placement, habitat and encounter-group materializers. It
keeps the native floor, pit, bridge, tier and formation behavior at the original
stage boundaries. Classic World delegates to the same operations, including a
conservative data-only placement shortcut; accessor-bearing inputs retain their
original general movement read order. General movement and tether behavior stay
in the existing World path.

The local frame copies exact source records, normalizes separate own-data working
records and supplies the area's entry, player position, index and navigation.
Optional fields cannot inherit process defaults, required fields refuse absence,
and grid/index/tier work has explicit limits. Source providers are read when the
native operation uses them; preparing a frame before a seeded random scope cannot
capture a stale random function. These are fixed-stage frames: native registries
must still be the same installed source, and changed doors or terrain require a
new frame. Mutable navigation objects are preparation scratch, not saved authority.

The durable comparisons pin actual original methods from commit 3b14dba3:

- NativeNavigation: ten layouts, 45,529 grid cells and 4,744 ground queries,
  including wet ground, rotated blockers, bridges and open/closed annexes.
- NativePlacement: 998 archived comparisons, 11,373 random draws, 96,467 ordered
  callbacks and 60 shape/pit tapes; additional accessor controls retain native
  read order and tier restoration on exceptions.
- NativeEncounterGroup: all 49 authored recipes across 168 pairs, 646 factory
  attempts, 638 admitted bodies and 2,868 random draws. Failed seats preserve
  consumed attempts without partial groups. This preserves native behavior;
  errors during final decoration/publication are not an area rollback transaction.
- NativeExitPreparation: 840 core pairs, 252 actual World wrapper pairs and
  26,798 source/host reads. Three actual full-load pairs preserve complete zone,
  geometry, structures, exits and generation side channels. Their live doodad
  counts are 285/153/418; the earlier 278/144/246 archives are prepared generation
  outputs at a different stage and must not be conflated with these loads.
- NativeAreaLocal: three complete archived layouts, 633 placement/navigation
  queries, 352 normal-rarity bodies and 1,555 random draws. A foreign factory host
  cannot supply its placement, terrain or player position; cold and A/B/A runs
  retain the same bodies and source bytes. Normal rarity is deliberate here:
  detached magic-pack refresh and complete load-stage sequencing remain unbound.

The frame does not issue compiler source authority, resolve world-simulation
population modifiers, resume both native random streams, own every birth stage,
translate controllers, publish areas, or page/save their complete populations.
Those remain necessary before activating a full-area continuous-world policy.
The next playable course still requires two complete naturally generated areas,
physical substrate/seams, combat and wounds, an entrance, cold Continue, and no
silently omitted bodies or unsupported environmental mechanisms. Main-content
parity, mountain/hydrology variety and repeated real-play passes remain open.


## NativeAreaContinuations: random state, population decisions and complete births

NativeAreaContinuations records both original streams: the explicit geometry
Rng and the transitive Math.random stream used by effects and births. Saved
cursors preserve zero without seed remapping. Synchronous scopes restore the
outer stream on errors, refuse reentry and expired callbacks, and retain consumed
draws. Six cold layout/effect/population courses match 376 factories and complete
body graphs, with 9,938 geometry and 1,668 ambient draws; 1,300 primitive
comparisons pin the unchanged generator. This does not authorize asynchronous
work or change native failure side effects into rollback.

The separate generation receipt retains the complete old area descriptor plus
start, immediate post-layout and post-capture cursors. Diagnostic witnesses use
a cloned cursor. Preparation and source capture must not consume either stream
outside actual generateLayout. Nine natural layout/stream pairs retain identical
legacy output and resume native effect attachment after cold restore. Exact
source/geography matching, malformed state, inherited descriptor and random
drift controls guard the boundary. Keep the whole envelope: old area-v1 identity
does not cover the additional random state. A valid cursor and caller-provided
lease remain evidence of structure, not an authentic installed-source issuer.

NativePopulationResolution shares native campaign table selection, overlay
resolution, faction restrictions, authored cohorts, wildlife provenance and cave
pool rules with World. NativeAreaPopulation binds these decisions to its explicit
zone, player and staged actors while reading named campaign services at their
original stages. Exact cave face identity is retained; a detached JSON zone
cannot silently substitute for the original source-face packs reference. Tests
compare 630 core and 240 World cases, 1,440 actual cave/wildlife cases, and three
complete native loads with 220 births and 10,673 random draws. Six isolated
A/B/A courses use real born populations while unrelated World state throws.

NativeMonsterFactory shares the complete original construction, level stamping
and ambush operations. Installed sources and explicit host services retain native
equipment, support grants, party scaling, appearance overrides, tagging, clock
reads and allocation/revision side effects. The comparison covers every one of
the 1,184 installed monster definitions, including complete actor graphs and
failed-birth behavior. Imported functions keep their original receiver semantics.
These factories produce actual native bodies; promotion and magic-pack refresh
remain separate native operations with their own stateful dependencies.

The next integration boundary is local hostility and sight/shot geometry feeding
actual magic-pack refresh. Even zero-time refresh changes shared pack state,
modifiers and visible effects, so deferring it until publication is not generally
equivalent. Full birth-stage ordering, authenticated source reconstruction,
controller and body paging, and the two-area playable/cold-Continue course still
precede fresh full-area activation. These preparations do not establish complete
main-content parity or the requested mountain, water and settlement variety.

NativeAreaContinuations verification at this checkpoint: all three type checks,
all 463 fast probes, 2,607 generation cases (zero failures; four existing
warnings), and 25 combat smoke episodes pass. The isolated real-client native
generation course also passes natural mouth/structure discovery, actual walking,
interior entry, cold Continue and exact return. That browser course exercises
previously admitted feature owners, not the still-unbound complete-area policy.
Nine slow and three excluded probes were not part of the fast run.

## NativeAreaEncounters: complete rarity and local encounter ownership

The pack and later wildlife stages now compose the unchanged native factories,
population decisions, placement, encounter groups, sight, hostility, status relay,
rarity and immediate magic-pack refresh. NativeAreaAmbient binds one complete
retained layout and its actual staged census. Classic World uses the same optical,
targeting, relay and promotion operations. No rarity weights, habitat rules,
failed-attempt consumption or authored pack minimums are replaced.

Construction takes detached staged actors, including the player, and explicitly
transfers their status-relay capability after validating the whole cohort and
building the host. A published World's actors must not be borrowed. Exact initial
magic effects, resolving/pending flags, squad sequence, bombard revision and
tagging state are mandatory; existing shared runtime objects and effects arrays
retain identity. The host's identity is frozen while its staged actor list remains
mutable. Named party, appearance, clock, optical-medium, sanctuary and hit services
remain explicit trusted dependencies. This does not authenticate their provenance.

The retained-layout comparison uses three complete archived layouts and nine
natural stream pairs. It includes actual native rarity rolls and 533 admitted
bodies, 66 magic members and exact stage receipts. Two additional mechanism
controls use unchanged meadow geometry: transferring already-warm siphon/arclink
cohorts, then relaying again with the former World forbidden; and 34 actual failed
lava-habitat attempts followed by native wildlife. Combined, 11 classic/local/cold
comparisons retain 598 residents, 632 factory results, 2,791 random draws, ordered
actor identities and factory arguments, shared runtime relationships, and complete
pack-boundary and final effects/body states. These targeted controls do not claim
natural spawn frequencies. They rebuild preparation from the same source geometry
and cursor, not from a complete saved live-controller page.

Seven optical operations match their archived originals over 11,340 pairs and
five complete natural layouts, including ray outputs, read/exception order and
360 warm/cold local comparisons. Hostility covers native sanctuary/tier, guise,
burrow, diplomacy, prey and breakable-owner targeting; relay covers actual
application and nearest/range/tie behavior. Promotion covers all 19 magic-pack
mechanics, native partial errors, and a real reflected hit killing a conductor
while refresh is in progress. Review caught a cache ownership regression: a
cached census getter made sleeping actors appear controller-owned. The repaired
World views are non-enumerable; genuine foreign actor references still pin them.

Full native birth ordering still includes effects, terrain, breakables, NPC/folk,
objective adoption, faction contests, objective fixtures, camps, garrisons,
landmark dwellers, bounty marks and memory finalization around these stages.
Complete source issuance, environmental owners, body/controller paging and an
actual two-area playable/cold-Continue course still precede full-area activation.
This checkpoint does not establish main-content parity, whole towns/crypts in
the continuous runtime, or complete mountain and hydrology integration.

NativeAreaEncounters verification: all three type checks, all 468 fast probes
without retries, 2,607 generation cases (zero failures; four existing warnings),
and 25 combat smoke episodes pass. The detached lifecycle regression also
checks a live provider changing the cohort before handoff; final validation
prevents a partially transferred relay owner. The isolated client generation
course passes natural structures, actual walking, cave entry, cold Continue and
exact return. It remains a regression for already-admitted feature owners,
not evidence of complete-area runtime activation. Nine slow and three excluded
probes were not run.


## NativeAreaInhabitants: native residents and field populations

The original door guard, furniture, NPC/daily guest and camp/garrison/landmark
stages are shared with classic World at their unchanged load boundaries. Closed
breakable doors retain raw seats and door-owned persistence. Furniture keeps
native placement and memory tagging. Residents retain campaign arrival gates,
upper-storey seating, speech rows and the exact transient dialogue reset order.
Daily guests keep their original zone/seat/day seed, empty-seat probability and
duplicate-name retries. Camps and garrisons retain native squad identity and
level/faction rules; landmark dwellers retain island seats, tiers, ambushes,
duty posts and rarity promotion after publication.

NativeAreaAmbient.inhabitants binds those operations to the same complete local
geometry, staged actors, factory and promotion owner. The returned host is frozen;
resident maps, focus/scene fields, ledgers, settlement day and dialogue director
stay explicit live services. Binding reads no resident values or clocks and
transfers no actor relay a second time. The caller must supply the original
resident-state owner and the same director used for factory appearance. Own-key
checks do not authenticate controller provenance. Door, lesson, annex and other
geometry replay must already be reflected in the fixed preparation frame.

The durable comparison pins all four original stage bodies from f461ec80 and
runs 72 archived/core/World cases plus 144 local/cold comparisons across three
seeds, three day settings and four success/factory-failure positions. The native
Lastlight layout retains 201 doodads, six breakables, four NPC seats and five daily
guest seats, including upper floors. A separate explicit mechanism fixture uses
that complete geometry with a closed breakable door, camp, garrison and landmark
rows; it is not evidence of their natural frequency. The combined original
courses retain 639 surviving body states and 819 random draws, including exact
stage boundaries, actor identities, factory arguments, speech rows and partial
failures. The same providing World's geometry/census/resident paths throw during
local stages. Independent controls cover 102 mechanisms and seven classic method
selection cases; local review also covers eight reset/day/error courses and four
method-selection/receiver cases. Adapters capture the native method before its
arguments are evaluated, retaining original receiver and argument count.

The complete load still has objective adoption and fixtures, faction contests,
scenery, puzzles, harvest, geysers, other environmental controllers and memory
finalization around these stages. Those operations must retain their original
order and both random continuations. This checkpoint neither publishes a whole
new town into seamless play nor supplies full controller paging, source issuance
or the two-area playable/Continue acceptance course. Those remain required for
full-area activation and the larger generation/content parity work.

NativeAreaInhabitants verification: all three type checks, all 469 fast probes
without retries, 2,607 generation cases (zero failures; four existing warnings),
and 25 combat smoke episodes passed. The client conversation course exposed a
separate Continue defect: rebuilding a reward affix wrote into the frozen save
receipt. Character restoration now detaches its complete carry state before
normalization, explicitly excluding inline world history. The focused character
and staged-world restore probes and all three type checks passed after that
repair. Both final client courses pass: conversations/gifts/work/reward, narrow
and enlarged UI, exact cold Continue, and natural structure/walking/cave entry/
Continue/return. These exercise admitted runtime content, not full-area activation.
Nine slow and three excluded probes were not part of the fast run.

## NativeAreaBirth: the complete native birth sequence

Classic World now consumes one shared operation covering the entire original
973-line post-arrival load sequence, from remembered door/lesson replay through
final lightwell setup. It retains the original order of inhabitants, objective
adoption and bodies, faction contests, scenery, puzzles, harvest, lightweight
populations, environmental controllers, field inhabitants, bounty work, wildlife,
remembered population replacement, occurrences, rewards, resident services,
encounters, nemeses, dynamic terrain and ordered package initialization. Arrival
movement and upstream layout/environment adoption remain separate operations.
The same layout RNG and ambient random scope continue through the driver.

The World adapter exposes live native fields and selects each original method
before evaluating its arguments. Native memory restoration may replace the whole
actor census; the adapter follows that replacement. Errors retain already-made
mutations, allocations and random consumption. The adapter cache stays outside
reflective controller ownership. Moving the operation also preserves original
runtime module initialization positions, including modules whose remaining World
imports became type-only. Structural World types describe exact ports without
introducing a runtime World import in the shared driver.

The durable archive comparison runs 66 complete-load pairs: three retained
natural field sources and Lastlight across fresh/remembered loads and explicit
factory failures, plus 15 objective configurations, a special arena and faction
war in both fresh and remembered courses. These last configurations are explicit
mechanism fixtures, not evidence of their natural frequency. The comparisons
cover 3,657 allocated bodies, full geometry, factory arguments, resident and
controller state/aliases, ordered calls, both next random cursors and allocation
continuations. The original operation is pinned from commit 81b96a31 and invoked
independently at the actual World load boundary.

Independent source review authenticates the full archived block and reconstructed
load operation. Execution controls cover 177 method-selection/receiver/arity
cases, 60 live fields, 34 writable ports, and 16 early door/lesson/hold/hollow/
annex cases. Five actual native loads fail immediately after packs, lightweight
ecology, wildlife, remembered population restoration or final wells: 327
allocated bodies and 14,291 draws match the original partial outcomes. These
controls do not authenticate callback closures or unseen weak-collection state.

This checkpoint makes classic World the real consumer of the complete shared
birth operation. It does not install a mutable detached scene, prove the
lifecycle of every campaign package, publish a complete seamless town or supply
whole-owner paging. Those owners and a genuine two-area movement/combat/history/
cold Continue course remain required before full-area activation.

NativeAreaBirth verification: all three type checks, 2,607 generation cases
(zero failures, four existing warnings), 25 combat smoke episodes, and both
client generation and conversation/Continue courses passed. The no-retry fast
run passed 469/470 probes in 835.5 seconds; its one failure was the local-cue
control still looking for the moved entry-title draw inside loadZone. That
control now follows the shared operation without changing its archived title,
original methods or behavioral assertions. Its focused run passes, and independent
missing/duplicate/mistimed-draw mutations all fail the unchanged comparison.
No production code changed after the broad run. Nine slow and three excluded
probes were not run. The client courses cover already-admitted content, not
complete-area activation.


## NativeSceneGeometry and NativeScenePopulation: mutable local areas

The complete native layout adoption and 39 native geometry operations are now
shared with classic World. NativeAreaSceneGeometry owns the retained native
working grid or analytic terrain, doodads, floors, structures, side-area mouths,
tracks, traps, fog, creep terrain callbacks and their mutable navigation/index
caches. Door opening and breakage repaint native cells; changes to upper floors
invalidate the original tier navigation. Movement uses the full native body,
tier, pit and tether rules. No terrain is cleared or replaced to make a local
area fit. The caller must supply the actual resolved currentZoneSeed and prepared
exits before adoption; a default seed is not a source receipt.

NativeScenePopulation shares 13 native census, restoration, objective, contest,
wave and party-scale operations with classic World. NativeAreaScenePopulation
binds existing factories, population resolution, complete packs, wildlife,
inhabitants, local sight/hostility, rarity and magic refresh to the same live
scene. Native memory restoration replaces the complete actor array and every
population host follows it. Remembered normal, rare and magic bodies keep the
original wounds, encounter-group remapping, shared runtime identities and
allocation/random side effects. Actual prior squad/factory counters and refresh
state are mandatory inputs. NativeSceneObjectiveState supplies only the native
fresh load reset; memory, completion and later controllers retain their own
ordered stages.

Classic adapters preserve live reads, method selection before argument
evaluation, receivers and partial failures. Their cached views are nonenumerable
so reflective controller ownership does not acquire a hidden World reference.
Original runtime import positions are retained when an extracted operation was
a module's last World consumer.

The durable geometry oracle pins all 39 original methods and the complete
adoption block from 81b96a31. Six local/archive comparisons and six actual World
comparisons cover complete grids and analytic terrain, generated doors, roofs,
upper floors, native mouth links, 138 physical query points, scenery revisions
and wildfire terrain callbacks. Six failures preserve the same mutation prefixes.
The course observes 234 native RNG draws and 27,204 read/callback events per
complete comparison lane, with 36 tether cases and 57 cached method-selection
checks. Its additional rooms fixture deliberately forces one track and three
trap mechanisms; this demonstrates the mechanisms, not their natural frequency.
Missing door repaint and stale scenery-index mutations both fail the intended
physical checks. The archive and inputs are embedded; Git and ignored files are
not runtime dependencies.

The population course uses two complete retained native layouts and compares
remembered bodies, replacement census references, group aliases, later objective
counts and actual contest/wave births against the archived original methods.
Partial factory failures preserve native allocations and random consumption.
The local lane refuses reads through the supplying World's geometry, census and
factory methods. This is local preparation, not a campaign source certificate.

These mutable owners remove the fixed-stage population/geometry limitation.
They do not yet form a complete NativeAreaBirth host: environmental birth,
package/controller update and reward ownership, installed source issuance,
whole-owner paging and the natural two-area cold-Continue course are still
required. No complete towns, crypts, hydrology or bounty-opened regions are
silently activated by this extraction. Existing ordinary mire patch/bypass
policy is unchanged.


NativeSceneGeometry and NativeScenePopulation verification: all three project
type checks, 2,607 generation cases (zero failures, four existing warnings),
25 simulation smoke episodes and the client natural-structure/cave entry/cold
Continue/exact-return course pass. The no-retry broad run passed 471/472 in
950.2 seconds. Its single failure was the existing geometry oracle invoking
World.groundAt with a small plain object after that method became a delegate.
The oracle now calls the actual shared native ground operation with the same
ports; all terrain assertions remain unchanged, and its focused run passes.
The population fixture also now zips retained exit positions with their native
exit definitions. Both final mutable-scene probes pass after that test repair.
No executable production behavior changed after the broad run. Nine slow and
three excluded probes were not run. Client coverage exercises already-admitted
content; it does not certify full-area activation.

The final population oracle adds six actual World comparisons, both restoration
and later wave/contest factory failures, stream identities/cursors, and 21 cached
method-selection checks. An independent World AST audit confirms that only the
52 intended methods, layout adoption and the new adapter members changed;
2,273 other class members retain their original text.


## NativeSceneEnvironment and NativeSceneEcology: complete native birth mechanisms

NativeSceneEnvironment shares eight original native methods for scenery actors,
puzzle setup and tone changes, harvest placement, geyser fields and escape
fronts. The local owner retains puzzle runs, knocks and cached callbacks;
harvest nodes, sessions and offers; and geyser fields, pocks and sweep state.
It binds the existing mutable geometry and population owners instead of
borrowing a standing World. Puzzle completion and harvest timeflow remain real,
explicit services; the birth layer does not invent replacement rewards.

NativeSceneEcology shares the original throng pocket/husk and lightweight
population stages, deferred vent seating and final lightwell installation.
Fourteen World methods delegate to this core. The one-line actor lookup remains
an explicit boundary: classic World keeps its original lookup and the local
owner uses the same archived lookup against its own live census. Existing native
pool capacity and failed seating consume their original draws; there is no new
population truncation or per-body reseeding. Carrying an area retains its pool,
claimed-pocket ledger, bookkeeping and monotonic well sequence. Fresh state is
only for a genuinely fresh owner.

The local ecology owner requires the exact same scene and geometry identities
as its population owner. Provider identities are retained while their fields
and methods remain live. Geyser state comes from the actual environment owner;
clock, seat roster, radiance and run-long throng claims remain explicit shared
services. World adapters preserve original module initialization positions,
method selection and receivers; their caches remain nonenumerable.

The durable environment archive compares 22 local and 22 actual World courses,
including retained natural heartwood, glimmervale and downs layouts, every one
of the 15 installed puzzle presets, explicit scenery/geyser/escape fixtures,
and post-allocation factory failures. Natural sources produce puzzles and
harvest nodes; the forced geyser/escape fixtures demonstrate mechanisms, not
natural frequency. The course records 137 published and 139 allocated bodies
and 740 random draws. Fifty-one additional branch/read comparisons exercise
655 host events, including reset and error boundaries. Independent deferred
callback checks cover real tone/status changes, live clock/census/tier filters,
completion forwarding and thrown errors.

The ecology course preserves complete pool columns and actor state across
retained layouts, carried populations, claimed pockets, held-off rows, vent
seating, native capacity saturation, and partial factory failures. Its selected
natural layouts are ecology-negative: positive population, vent, capacity and
well cases are labelled explicit installed-source mechanism fixtures. The
baseline 16 comparisons are supplemented by seven independent carry/cue cases,
cold A/B/A replay, binding identity/refusal checks and exact stream cursors.
Neither suite depends on runtime Git or ignored development files.

These owners are invoked by the existing native birth sequence at its original
positions. They do not yet supply the complete area update driver, puzzle or
harvest reward execution, lightweight combat/XP/promotion, throng claiming,
rendering contexts or whole-owner persistence. Those obligations, universal
campaign/package birth services, installed source issuance and a real natural
two-area cold-Continue course remain required before complete seamless areas
can be activated. The native content catalogue and localized ordinary mire
policy are preserved.

Validation for NativeSceneEnvironment and NativeSceneEcology: all three project
type checks pass. The full fast roster passes 474/474 without retries in
927.2 seconds; nine slow and three excluded probes were not run. The complete
generation matrix passes 869 cases across three seeds (2,607 generations), with
four known spacing warnings and one metropolis timing warning while checks ran
concurrently. A separate quiet metropolis run passes all 13 cases across three
seeds with no warnings; the boulevard case takes 267ms/seed there. All 25 smoke
simulation episodes pass. The built client passes native structure/movement,
cave entry, same-hero continuation, cold Continue and exact return. This client
course covers already-admitted content, not full native-area activation. The
World source audit retains 2,311 unrelated members and the original actor lookup;
only 22 delegates and six adapter members change.


## NativeAreaBoundaries and living-place generation ownership

NativeAreaBoundaries shares the exact native pre-layout graph stage. First-visit
holdfast rolls, eager and horizon charting, opening progression, neighbor reveal,
roadless/cross-dimension repairs, exit siting and physical separation retain their
original order. Boundary, road and biome-meld annotations keep their source and
exit-row identities. The operation retains every generated graph child and all
reciprocal mutations; it does not reduce a prepared place to its parent ZoneDef.
The classic World adapter owns its live graph and cached view. A detached source
issuer must still provide authentic campaign graph/controller ownership.

The two canonical seed-991 owner requests are derived through the existing native
mapping without face, seed or biome overrides. Real default-enabled campaigns
prepare forest and downs and add 82 and 83 graph zones, respectively. Four direct
controller comparisons, 36 explicit branch/read cases and 14 callback-selection
cases match the pinned native block. Six actual full-load comparisons cover both
natural places, remembered entry and a second-exit-placement exception; 548 factory
bodies and 45,413 random draws match. Independent alias tests retain prior live
exits on mid-map failure and preserve earlier graph changes on later exceptions.
These controls do not certify every complex or a naturally selected locked gate.

NativeSettlementServices shares 29 original methods: the full stock-generation
dependency chain plus native town seating and recruiter sheets. The local owner
uses actual adopted town tier and area geometry alongside real campaign account,
party, stock holds, recruit sheets, time and borough population. Held item objects
and native allocation IDs survive shelf generation; return visits retain recruiter
offers. The same gem helpers continue serving their original loot callers with
unchanged defaults, bias and explicit floor arguments. No purchase, hiring or UI
transaction was replaced. Twenty-six cold-process original/local/World courses
match 7,257 native draws, 76,936 provider reads and 2,262 operation calls, including
partial allocation failures, nullable borough state and every native town tier.

NativeSceneBounty shares seven original operations for cull marks, gather nodes,
arrival, readiness and quest-copy reads. The local owner requires the same scene,
geometry, population and environment owners and the actual campaign posting/quest
ledgers. It retains native multiple-posting count rules, actor/node aliases and
partial failure effects. Installed bounty source callbacks now declare their real
read contract, including the actual seamless runtime; six type-only source changes
produce identical runtime JavaScript. Twenty-one original/local/World courses
cover all installed kinds, all four positive package censuses and a real country
destination with discovery and live null/restore transitions. Country visit
readiness is positive; the course does not claim completed country clear/cache/
puzzle/objective rewards. Per lane it retains 79 actor states, 64 harvest nodes,
652 draws, 971 host calls and 1,650 source reads.

NativeSceneOccurrences shares the exact native event callback host, population
roster and generation-time trace reset. Local events read their own mutable
terrain, zone level and current actor census, while using genuine campaign time
and trace-release services. Remembered events restore their wound without a second
wave; fresh events retain native telegraph, spring and later fixture behavior.
The local callback cache is a private instance field. A foreign carried cache is
refused, late state-property injection cannot redirect it, and a new owner gets a
new closure. This fixes a defect found during independent draft review; the
classic native cache operation itself remains unchanged. Seventeen complete
original/local/World courses on three retained layouts match 78 allocations and
488 random draws; 68 roster cases, 22 local binding controls and additional
partial-failure/read-order cases verify the boundary. Positive occurrences are
explicit installed-recipe fixtures, not claims about natural event frequency.

All four classic adapters preserve selected-method timing and native receivers;
their caches are nonenumerable and pass real dormant-reference negative/positive
checks. The World source audit preserves 2,299 unrelated members and all 375
previous runtime module positions; only 39 selected methods, the pre-layout block
and nine adapter members change. These shared operations remain at their existing
native load/birth positions. The local owners are ready to compose; complete
NativeAreaScene birth/controller integration has not been activated.

Still required: one genuine resident director/session shared by appearance and
resident resets, objective-adoption source context, stable physical-content owners,
all selected native package/presenter callbacks, authentic installed source sessions,
whole-owner paging and update/render/reward dispatch. Actual full seamless-area
A/B/A and cold Continue remain acceptance gates. This pass does not change the
localized ordinary mire policy or claim biome, hydrology or main-content parity.

Validation for NativeAreaBoundaries, NativeSettlementServices, NativeSceneBounty
and NativeSceneOccurrences: all 478 fast probes pass without retries in 908.7
seconds. Nine slow and three excluded probes were not run. All three project
type checks pass, all 25 smoke simulation episodes pass, and the complete
869-case generation matrix passes three seeds (2,607 generations) with no
failures and four existing spacing warnings. The built client passes native
structures/movement, cave entry, same-hero continuation, cold Continue and exact
return. The separate conversation course passes native gifts, work, reward,
once-only payout, narrow/scaled presentation and Save/Continue. The first
conversation invocation served an old harness build and failed at its missing
save hook; selecting the freshly verified build passes without production changes.
These client courses cover admitted content, not complete seamless native areas.

## NativeLayoutGeneration, resident sessions and physical places

NativeLayoutGeneration shares the complete memory/seed-to-layout operation with
classic World. Fresh ground uses its original seed fallback, remembered ground
retains its seed and regrowth age, and boundless ground follows its existing
memory exemption. The held-territory source supplies native outpost, camp,
fortress and city fixtures through the real structure generator, including the
square and weighted street mix. No fixture becomes decorative proxy geometry.
The local owner writes the same mutable geometry counters and keeps genuine
campaign memory and Crusade state. Layout adoption and later births remain
separate, ordered operations.

Twenty complete archived/local/actual-World layout comparisons cover two canonical
native places, quiet and explicitly QA-ignited native held cities, and fresh,
remembered, boundless, missing-seed and zero-seed controls. They retain 43,748
doodads, 101 physical structures, both random continuations, source reads and
memory identity. The modified seed/boundless and ignition cases are mechanism
controls, not natural content-frequency claims. Thirty-six installed tier/seed/
arena comparisons preserve every native fixture attempt; 42 ordering/failure
comparisons and lazy-memory controls retain partial writes and original draws.
Some held-city variants produce native required-point reachability warnings in
both old and new implementations. Equality does not certify those routes as
playable; their geometric cause is being investigated separately.

NativeResidentSession owns one real NpcDialogueDirector and the native speech
maps. Factory appearance and resident reset share that exact director. Re-entry
runs the original reset at the original birth stage, retaining visit history.
The complete installed fact registry and director runtime are unchanged; their
host types now describe the actual campaign/local services they consume.
Twenty cold-process courses retain nine resident births from a full native
Lastlight layout, 30 draws, 205 provider reads and 36 calls, plus binding,
selected-method, live fact and sequential A/B/A controls. The three archived
spatial read methods in the oracle are test fixtures only. Production still
requires genuine local spatial services. This session is not a simultaneous
multi-area controller, saved visit codec or dialogue/reward dispatcher.

NativeScenePhysical gives the original altar, training-yard and content-memory
services one stable local host. Both native WeakMaps follow that host throughout
its residency. Geometry/census/seating identity is enforced; the actual mutable
chest, shrine, altar and drop arrays remain authoritative. Twenty archived/World/
local cold-process courses retain 39 native actor allocations and complete
item/actor identities, all nine training targets and every installed altar,
shrine and loot row. Native finite birth syncs altar bodies before remembered
altar objects replace them. That order, including the absence of an implicit
second sync, remains unchanged. Later physical interactions and rewards are
separate owners still required by complete scenes.

NativeAreaSceneAdoption calls the unchanged installed objective-adoption function.
Its real campaign fracture/holdfast fields, local exits and local fracture state
preserve authored-objective protection and lair/package/venture/puzzle precedence.
Fifty original/local comparisons retain 1,716 source reads and every currently
installed package/venture source, with additional exception, alias and live-state
controls. Natural forest and downs layouts remain whole. Positive package asks
use explicit native QA source activation; they do not establish event frequency.
This is the complete adoption read service, not package birth/update ownership.

The World audit preserves 2,345 unrelated members and all 379 previous runtime
module positions. Only the layout-generation block, its two helper delegates
and three adapter members change. All other existing source edits in this pass
narrow types while retaining identical emitted runtime JavaScript. These owners
converge on the complete NativeAreaBirth composition; installed campaign/source
issuance, remaining native controllers, runtime dispatch and whole-owner paging
still precede seamless admission and the actual two-area cold-Continue course.
The localized ordinary mire policy remains unchanged.

Validation for NativeLayoutGeneration, NativeResidentSession, NativeScenePhysical
and NativeAreaSceneAdoption: all 482 fast probes pass without retries in 861.1
seconds; nine slow and three excluded probes were not run. All three project
type checks and all 25 simulation smoke episodes pass. The full generation matrix
passes 869 cases at three seeds (2,607 generations), with no failures and four
existing spacing warnings. The built client passes the complete native structure,
movement, cave, same-hero continuation, cold Continue and return course. The
conversation course passes gifts, work, reward, once-only payout, scaled bounds
and Save/Continue. Existing dialogue, physical-content and objective source
modules emit identical JavaScript; the World audit retains 2,345 unchanged
members and all 379 prior runtime import positions. These checks do not certify
complete seamless native-area admission or resolve the structure access defects.
