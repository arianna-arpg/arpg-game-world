# Seamless exploration foundations

Status: first generative integration pass, 2026-10-05. This is a continuation of
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
