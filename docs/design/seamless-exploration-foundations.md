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
