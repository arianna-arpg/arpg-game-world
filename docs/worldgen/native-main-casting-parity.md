# Main casting visuals in retained areas

The seamless client carries the casting preparation and return-only summon links
from `origin/main` at `dc56030f3594533fec8712d55977d17f5bd03d1b`.
Fourteen shared visual styles cover 662 of the 954 catalogued skills. Preparation
reads the native cast clock and body facing; it does not forecast release or
change spell payment, interruption, targeting, movement or summon timing.

The retained renderer draws both preparation layers inside the existing body
walk/action transform. The Wardrobe casting-effects switch is optional and keeps
native cast/readiness indicators. Actual per-area AI sets the companion owner
link only while a companion is returning and clears that intent on its next AI
update. The marker is presentation state, not a new movement rule.

The branch already carried optional own-cast skill identity for client movement.
After accepted build metadata, the client now resolves that identity again using
its existing bar, learned book and catalog precedence. This includes equipment
grants and their supports, while preserving the optimistic metadata gate. Remote
cast stubs and older packets without identity keep their prior fallback behavior.

Verification uses the original main player-cast, companion-cue and self-visual
courses, plus actual retained casting/interruption/summon admission and targeted
area snapshots. `balance/native-main-cast-ui.cjs` starts a genuine retained run,
travels through the published waypoint action and checks all fourteen styles in
four facings against their effects-off body pixels. It also checks an actual
summon and its AI return marker. Development skill grants, resources, comparison
facings and minion positions are explicit QA fixtures; this is not a natural
progression or live network transport course.

Strict source adapters preserve previous full source boundaries and original
assertions. The history receipt removes only an unused, exactly declared
`companionReturnTo` property before the existing actor-state comparison. Active
values, duplicate properties and unrelated changes remain visible or refuse.

Dedicated Shards integration, private quest-instance routing and broader content
acceptance remain separate work. The older `main` visual review tools are retained
as reference tools; their legacy World startup does not establish retained client
acceptance.
