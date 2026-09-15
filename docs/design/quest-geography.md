# Quest geography and exploration

Quest generation chooses a destination independently from the player's map knowledge.
The zone joins nearby normal surface terrain, preferring unvisited nodes, dry roads,
and spare road capacity. Sealed ports, pockets, caves, event seats, and other quest
arenas are not generic approach anchors. If the forechart has not reached the area,
`World.questLocalAnchor` seeds a veiled ordinary node there and requests a sounding.
Its local roads grow through the existing frontier generator. Exploration eventually
joins that cluster to the surrounding country; no road to Lastlight is manufactured
across the empty distance. Authored floating arenas keep their find-on-approach rule.

A floating root cannot connect back into its own component, and the gameplay approach
pass bounds its new road to 150 map units. Quest roads remain notarized in both
directions so ambient graph repairs do not erase an authored objective's entrance.

Accepting a quest grants `directionsKnown`, persisted on its active entry. Odyssey
opportunities enrolled before their discovery have this false: a Quartermaster lead,
faction trail, or discovery grants directions without surveying the destination or
its neighbours. The journal distinguishes an undiscovered lead from a known bearing.
A quest deliberately supplying cartography must opt in with `zone.mapReveal: 'survey'`.
That reveals only its destination; area surveys continue using the existing survey API.

The map's fit and permitted zoom-out derive from visited or explicitly surveyed ground,
within the selected dimension. Adjacent zone previews still work but cannot enlarge
the chart. Generated events, visible previews, and marker coordinates never contribute
to the fit. The developer's omniscient lens remains a render-only exception.

Unknown objectives use edge chevrons even if their coordinates would fall inside the
view. Known objectives outside a zoomed/panned viewport use the same affordance.
Chevrons update during gestures, group similar bearings, and stagger labels to prevent
overlap. Their artwork does not intercept node hover or travel. Explicitly known raw
positions, such as the player's ship, keep their location markers. Finding a destination
restores its ordinary node marker and road display.

Existing saves retain their already-generated roads and recorded knowledge; there is
no automatic character/world reset or retroactive erasure of legitimate survey history.
Use a fresh world to evaluate the revised placement of the initial Odyssey roster.
Newly accepted quests in existing worlds follow the new rules. New directions and
local roads persist across save/resume.

Checks: `npm run check`, `npx tsx balance/probe_questmap.ts`, Odyssey, Reliquary,
atlas, forechart and world-web probes, `npm run genqa`, and a hidden isolated Electron
map check at 1400×1000 and 1000×720 (earned leads leave bounds/knowledge unchanged).
