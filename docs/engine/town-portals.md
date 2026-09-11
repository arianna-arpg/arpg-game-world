# Town portals and persistent visits

Town Portal is a no-drop utility skill in `data/townportals.ts`, cast through
the ordinary skill pipeline. It costs no item and occupies no equipped skill
slot. The default keyboard binding is T; the menu tray and independent HUD
button call the same host-authoritative `townPortal` action. Controller bindings
are configurable in Options (the menu remains accessible without assigning a
dedicated button).

`TOWN_PORTAL_CFG` owns the default destination, casting and dwell times, reach,
placement offsets, appearance, HUD button position and return-consumption policy.
`World.townPortalDestination` is a saved per-run override and must resolve to a
safe zone. The shipped destination is Lastlight. A `ZoneDef.townPortals: false`
seals an authored zone; streamed boundless zones and off-graph passages without
a reproducible route refuse the cast.

Each player owns one passage. A new cast replaces that player's previous
passage. Standing idle near its field endpoint travels to town; the town
endpoint returns the party to the casting position and original story. Step
outside the arrival radius before dwelling again, preventing immediate bounce.
The return consumes the passage by default. Ordinary shared-world party travel
rules apply in co-op; the owner operates their endpoint, and snapshots replicate
its position, label and dwell progress. Travel preserves current vitals and
inventory rather than replaying the build from the departure time.

The save carries endpoint ownership, source seed, entry direction, destination
and exact saved location. Nested sidezones use the existing saved cave ladder
and deterministic mint path. A missing/reset source memory invalidates the
return instead of silently entering fresh reward-bearing ground. Campfire
refresh explicitly clears portal passages.

## Persistent zone contents

`engine/zonecontents.ts` extends the existing zone memory with copied chest,
shrine, altar and uncollected drop state. Skill/support drops use the shared gem
payload codecs. Generated caches and destructible furniture join the remembered
base population; dead ones cannot respawn on ordinary re-entry. Spent shrines,
opened chests and collected loot remain spent across travel and saved runs.

`ZONE_MEMORY_CFG.ttl` defaults to Infinity: visits persist until an explicit
reset. A finite game-time expiry is still configurable. Safe zones participate,
so opened or broken Lastlight doors survive both travel and reload. The campfire
clears expedition memories while preserving town doors and permanent objective
completion. Existing world-event lifecycle rules, such as quickening resets and
overlay-owned encounters, retain their own authored behavior.

Older saves without contents rows acquire the new state on their next capture;
the old save format cannot recover previously spent containers it never recorded.
Adopting a save suppresses capture of the temporary startup scene before the
first resume load, so it cannot overwrite a restored zone's memory.

Verification: `balance/probe_townportal.ts` covers normal and nested-cave round
trips, the arrival guard, town-side save/load, spent loot, town doors and reset
policy. `probe_persistence.ts` also exercises an explicitly finite expiry and
the existing memoized save-byte parity guarantees.
