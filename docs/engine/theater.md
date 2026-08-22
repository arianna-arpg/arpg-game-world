# THE THEATER FABRIC — the zone's own life expressed louder

`src/engine/theater.ts` (the fabric) + `src/data/theater.ts` (the default
rows) + the World glue in `src/engine/world.ts` (the `theater*` family).
Probe: `balance/probe_theater.ts`. Static data contract: `balance/eventqa.ts`
section 8. This re-founds the repo's OLDEST event grammar — the on-entry
zone-event lane (`engine/events.ts` + `engine/zoneEvent.ts`, both retired
into this module) — as a sovereign ZONE-TEXTURE fabric.

## THE RESIDENT LAW (the ratified taxonomy)

**Theater is the zone's own life expressed louder; a package is something
happening TO the world.** Four gates, all required, enforced structurally
where possible:

1. **LOCAL** — a row derives wholly from the zone's STANDING truth: owning
   faction, biome, contest state, camps/routes. Structural: rows are matched
   against `TheaterContext`, and the context exposes only zone-standing
   reads (built fresh per beat by `World.theaterContextNow()`). The fabric
   is not a `WorldOverlay` — it has no world-map existence at all.
2. **UNANNOUNCED** — no omen, no map mark, no bulletin. Structural: the
   fabric's two modules import none of those surfaces (probe-scanned for
   the import specifiers and registration identifiers), and the row/kind
   types carry no announcement field. The in-zone floater a kind speaks
   when you MEET it is the discovery voice, not an announcement.
3. **BUDGET-HONEST** — potency stays inside the zone's ambient envelope.
   Casts draw presence-banded from the zone's own faction tables at the
   zone's own level (`World.spawnEventActor` → the ONE `weightedPick`
   chokepoint — this half was already standing law), and THE POUR LEDGER
   (below) caps bodies per visit.
4. **ARCLESS** — nothing resolves, no scar. Structural: `ActiveTheaterRun`
   has no reward verb and `World.payEventReward` is deleted. Zone-memory
   continuity at most. **The one sanctioned delta from the old lane**: the
   legacy siege PAID on resolution (rep 10 + scaled xp + a gem +
   "Siege broken!"); the re-founded siege is contested ground's standing
   look — a spent fight simply ends, the bodies were the bounty. (The old
   patrol/war-column reward rows were dead data — their ticks never paid.)

Fail any gate → the thing is a package, not theater (the Warband is the
canonical package: it changes potency and lives a world lifecycle).

## THE GRAMMAR

- **`TheaterKindDef`** (`registerTheaterKind`) — the MECHANISM: `posture`
  (`'replacement'` | `'additive'` — which pour lane), declarative `needs`
  (owner/nearHome/camps/route/`invader: 'hostileToOwner'` — the old
  `choose()` predicates as data), `cast(ctx, row?)` (primary/secondary
  factions from local truth; the seated ROW rides along so ONE generic kind
  serves authored faction×biome rows — the funeral reads its cortege's
  faction from `row.params`, never a kind per faction), `params` (kind
  dials), `spawn`/`tick` handlers riding the generic run. Priority =
  registration order (sieges before patrols, as ever — `data/theater`
  imports BEFORE `data/warfront` in `main.ts` / `sim/arena.ts` /
  `eventqa.ts` to keep it). Two cast-era flags:
  - **`endWhen: 'rowCond'`** — the run expires the moment its row's `when`
    stops holding. THE CLOSING TICK contract: the fabric marks the run
    done and calls the kind's tick ONE last time — a tick that observes
    `run.done === true` is the teardown pass (the watch change reverts its
    leans there). Kinds without endWhen never receive a done tick.
  - **`offstage: true`** — a BODILESS kind (a role-shift lean, never a
    clump of bodies): its live run holds NO seat in the concurrency fold
    (a night-long watch change must not starve the ground's one texture
    seat), though seating it still spends its beat and `sameKindMax`
    still caps it.
- **`TheaterRow`** (`registerTheaterRow`) — the AUTHORED OCCURRENCE, pure
  data: `kind`, WHERE (`biomes` / `factions` (owner) / `grounds`
  ('owned'|'contested'|'invaded') — axes AND together, omitted abstains),
  WHEN (`when`: a `RadianceCond` — the old `chanceNight`/`chanceDay`
  literals died into night/day phase rows), HOW OFTEN (`chance` per beat,
  `weight` among same-kind rows), plus `params` overrides and `pourCap`.
- **`THEATER_CFG`** — fabric defaults (announce offsets, the dwell lattice,
  concurrency ground rules, pour bands). Per-kind numbers live on kinds and
  rows, never in engine logic.
- Per-biome policy is unchanged: `BIOMES.denyEvents`/`allowEvents` name
  KIND ids through `zonePolicy.eventAllowed` (eventqa section 7 censuses).

Adding an occurrence — a funeral procession, a watch change, a hunting
party — is ONE `registerTheaterKind` + row lines. No engine edits.

## THE DRAW LAW (determinism)

Every draw is a **pure keyed hash**: `theaterRng(worldSeed, zoneId, visit,
kind, beat)` (FNV-1a over the salt string → mulberry32). Nothing is drawn
from the global die. Consequences, all probe-pinned:

- **The first-bite cascade is dead.** The old lane handed ONE shared roll
  down the def list — an eligible-but-failed siege roll could NEVER fall
  through to the patrol (patrol's threshold was lower on the same die).
  Each kind now draws its own stream; a later kind seats on a beat an
  earlier kind lost. Rates are unchanged per kind; multi-eligible ground
  gains what starvation stole.
- **Replayable.** Same (seed, zone, visit, beat) → same draws, across
  worlds, forever. The probe recomputes the engine's own draw to prove
  drawn == tested.
- **Visit ordinals** bump per zone load (in-memory only — a restored run
  replays from visit 1, the foreordained doctrine).
- **THE PARITY DRAW** (world.ts, the entry site): the old shared roll spent
  one GLOBAL draw per eligible fresh entry — seated or not — and every
  seed-pinned mint downstream of a zone entry was tuned against that
  spend. The entry beat still spends (and discards) it, so unseated boots
  stay byte-identical to the old world. Retiring the burn is a deliberate
  world-wide probe re-pin, never a drive-by.
- **★ THE SEAT-VERDICT RE-ROLL** (landing note, 2026-08-05): keyed draws
  necessarily re-rolled WHICH per-seed entries seat events (same rates, new
  verdicts) — a one-time world-wide reshuffle. Seed-pinned rigs downstream
  of owned-ground boots re-pinned once (probe_lairs T5 + P5-IV,
  probe_straying H-span).
- Mycelia suppression still smothers beats: the entry beat resolves it on
  the live die at the boot site (the old lane's exact shape); dwell beats
  re-check it on their own keyed stream.

## THE BEATS (entry + THE DWELL CADENCE)

Beat 0 is the ENTRY (the old roll moment): fresh, un-quiet ground only —
the outer gate is byte-preserved from the old lane (`!memory`, objective
not 'safe'/'waves', not `factionWar`, pocket `ambientEvents !== false` →
`World.theaterQuiet`). A remembered re-entry skips beat 0, exactly as ever
(a fresh patrol every crossing would be a re-entry punish).

THE DWELL CADENCE (`THEATER_CFG.dwell.everySec`, default 90s): standing on
un-quiet ground fires beats on the lattice — **lingering provides the
world's life, as the world does not revolve around the player** (the
ruling). A beat seats AT MOST ONE run (the first kind in priority order
whose draw wins — the zone's life arrives in breaths, not batches); a
spawn that can't form still resolves the beat, as the old entry did.

## THE CONCURRENCY LEVER (not a cap)

`World.theaterConcurrencyNow()` = ground default folded with every
registered external writer, MAX wins:

- Ground defaults (`THEATER_CFG.concurrency`): base 1; **2 on a faction
  HEARTLAND** — the owner standing on its OWN home ground (its
  `FACTION_TRAITS.originZone` or `homeBiome` — never a map-distance read:
  `distFromHome` returns 0 for homeless factions and map-pixels for the
  rest, so traits are the honest predicate); small zones (min arena
  dimension < `smallDim`) clamp to 1.
- **THE WRITER SEAM** (`registerTheaterConcurrency(id, fn)`): a world
  system may PUSH the fold up — "an Odyssey type would push the
  concurrency up to 4 or 5 as standard at higher stages, such that the
  density IS the very theme" (her ruling). Writers can never shrink the
  ground's own law (max-fold). Shipped consumer-less and probe-proven with
  a QA writer — the Odyssey stays design-gated.
- `sameKindMax` (default 1): one live run per kind — spare seats spend on
  kind DIVERSITY, never on doubled patrols.

## THE POUR LEDGER (THE FARM LAW)

`World.theaterPour` counts bodies per kind per visit; every kind spawns
through `World.theaterSpawn` (the ledger-honest wrapper). Two lanes by
posture:

- **'replacement'** (the zone's own life, clumped): cap = `max(floor,
  bandFrac × theaterAmbientBudget)` where the budget is the zone's own
  BOOTED counted population, stamped once per visit. With no in-zone repop
  clock in this engine, re-entry — the world's one repop moment — is the
  only refill: over any visit, theater can never hand out more than the
  band of what the zone itself stood, so farming theater can never beat
  farming the zone's own packs by more than the band. **THE ENTRY POUR IS
  WHOLE** (the parity floor: beat 0 behaves exactly as the old lane,
  whatever the band says — and the ledger still counts it, so a big entry
  cast spends the visit's band honestly).
- **'additive'** (extra bodies BY DESIGN — movement two's hunting-party
  prey burst is the coming consumer): authored per-visit cap
  (`row.pourCap` → `kind.pourCap` → `THEATER_CFG.pour.additiveCap` — a
  finite cap ALWAYS stands, structurally; eventqa asserts it). At cap the
  pour stops cleanly — `theaterSpawn` returns null at the hard floor, and
  courteous kinds size their clumps by `theaterPourRoom` first.
- Her recorded alternative (first X pay normal, then treated-as-summoned /
  noBounty) remains a documented optional per-kind lever shape for kinds
  that ever want endless spectacle; it did not fall out naturally in
  movement one and ships as documentation, not machinery.

## THE LEGACY THREE, RE-FOUNDED (today's numbers)

- **SIEGE** (`data/theater.ts`) — STANDING-STATE texture, never resolving:
  needs owner + camps + a hostile invader; casts 5 attackers ringed at
  220±30 on 4 defenders at ±60; rows 0.7 night / 0.55 day. While the press
  stands, the dwell cadence may re-draw the fight (band-capped) — the
  standing state emerges from the cadence. Whole-cast-or-nothing on dwell
  re-draws (half a siege reads as a bug).
- **PATROL** (`data/theater.ts`) — the owner's own troop walking its beat:
  needs owner + nearHome + route; 1 lead + 3 followers on the camps→POIs
  loop; rows 0.6 night / 0.4 day.
- **WAR COLUMN** (`data/warfront.ts` — theater BY OWNERSHIP on warfront
  ground): needs route; rows claim `biomes: ['warfront']` at 0.55 night /
  0.45 day; the bannerman leads 5 troops on the POIs→camps loop. Its kind
  and rows live with its country.

eventqa pins every number above verbatim (THE PARITY PIN) — drift is a
retune, and a retune needs a ruling.

## THE PASS-THROUGH MARCH (the mover grammar, grown for the cast)

`marchSpawn` / `marchTick` (engine/theater.ts): a leader + escort clump
ENTERS at one point, walks its line (the patrol-route AI, `patrolIdx` aimed
at the far end), and LEAVES at the other — `World.slipAway`, the silent
departure: no corpse, no credit, the ground returns to its baseline. A lead
cut down dissolves the march into a leaderless rabble (the warband law);
bodies killed en route are ordinary bounties. The cast's growth:

- **THE ID LEDGER** (`run.data.marches: MarchState[]`): members are tracked
  by actor ID, never by tag sweep — so one run may walk SEVERAL columns
  (the hunting party's prey + hunters) and a march may wear any STANDING
  tag (`'critter'` puts the prey straight into the standing prey lane). A
  kind that walks extra bodies with a column (the cart guard's cart) pushes
  their ids into the state.
- **`MarchSpec.via`** — waypoints walked between `from` and `to` (the cart
  guard's road, a winding way).
- **`MarchSpec.speedMul`** — walking pace as a stat source
  (`theater_march_pace`, a `moveSpeed more` fold) on every member: the
  funeral's slow walk. LIFTED once on dissolve — mourners break stride
  when the procession shatters.
- **`marchEndpoints(world)`** — where a column enters and leaves: two
  DISTINCT zone exits when the ground has them (the `world.exits` pairs),
  else one exit + the far side of the arena, else two opposed arena-edge
  points (the warbandDestination idiom's fallback ladder).
- **`roadWaypoints(world, kind)`** — the cart guard's lane: the two
  farthest-apart laid road bodies are the ends, the discs between (ordered
  along the span, thinned to a stride) are the way. Pure geometry,
  draw-free; null (the kind declines) when no road worth walking stands
  (`THEATER_CFG.march.roadMinSpan` / `roadStep`).

## THE CAST (movement two — five occurrences, all ratified)

Everything below is `data/theater.ts` rows + kinds on the standing grammar
— zero World edits. Registration order within the file: siege, patrol,
troop_march, funeral, hunting_party, cart_guard, watch_change (war_column
still registers after the whole cast, with its country).

- **TROOP MARCH** (`troop_march`) — the true walk: the owning faction's own
  kin stomping briefly through their claimed ground (needs owner +
  nearHome), exit to exit. Leaders are authored per faction
  (`MARCH_LEADS` — the grind_bannerman precedent: the goblin chief, the
  hollow bannerman); a faction without a leads table is led from its own
  roster. Rows: night 0.35 / day 0.25, any owned ground.
- **FUNERAL PROCESSION** (`funeral`) — the dead country buries its own: a
  thurible-bearer leads 4 mourners at `speedMul` 0.55, gate to gate.
  Thematically gated faction × biome exactly as ratified (gravelands yes /
  Garden no; Undead yes / Goblins no): one row, `biomes: ['grave',
  'ossuary', 'sepulcher']`, `params.faction: 'undead'`, chance 0.3. A new
  faction's funeral is one `FUNERAL_CORTEGE` entry + one row.
- **HUNTING PARTY** (`hunting_party`) — her "local migratory burst", the
  ADDITIVE lane's first shipped consumer (kind pourCap 10): prey enters
  from an edge and crosses — the burst IS the supply, the zone's own
  wildlife is never depleted BY CONSTRUCTION — with a hunter clump on its
  heels. The prey wears the ordinary `'critter'` tag, so the zone's own
  predators join free through the standing hunger-drive fabric. Rows:
  taiga/tundra (snow hare + elk, wolves) and forest/grove (roe deer +
  hare, wolves + lynx), chance 0.3. Her recorded alternative (first X pay
  normal, then treated-as-summoned) stays a documented optional per-kind
  lever shape — deliberately unbuilt.
- **CART GUARD** (`cart_guard`) — the farmland cousin (the toll patrol is
  HELD, never built): farmers and holdfast kin guarding their carts and
  walking their claimed road. The march rides the settled belt's REAL laid
  roads (`roadWaypoints`); a village warden leads croft-wardens and folk at
  walking pace, and the `caravan_cart` — a driven body, no brain — is
  wheeled by the kind's own tick at the column's heel (the procession
  steering idiom: pathField step where the line is blocked). Guards spent
  on the lane leave the cart standing abandoned where it stopped (the
  ledger releases it; the ground keeps the story). Row: farmland,
  dawn/day/dusk, chance 0.45 — the complement of the night's watch change.
- **WATCH CHANGE** (`watch_change`) — her no-poof ruling verbatim: the
  SAME faction's standing bodies shift ROLES with the hour, authored
  faction-dependent (or biome-AND-faction), never universal. A BODILESS
  kind — `offstage` (holds no concurrency seat) + `endWhen: 'rowCond'`
  (expires with its hour) — whose tick applies a REVERSIBLE lean on
  matching standing bodies through the duty-post fabric alone
  (`postSpec` + `aiPost`, brain.ts machinery, no new levers), with every
  prior stamped into a ledger and restored byte-exact on the closing
  tick. The lean is DRAW-FREE (posts round-robin over the boot-stashed
  camp/POI spots; seats derived from actor ids — a tick must never move
  the global die), and zone teardown is leak-free by construction: no
  lean field rides zone memory. Debut row: freehold × farmland at night —
  the folk head in to the hearths (`hold: false`), the watch walks out to
  the night posts (`hold: true`); dawn reverts everything and the next
  night seats a fresh run.

## CO-OP POSTURE (the standing floor, with evidence)

Host-authoritative, exactly as the old lane: `src/net/` contains zero
references to the zone-event/theater surface (grepped at the re-founding).
Guests see theater BODIES through the ordinary actor snapshot and nothing
else; runs, draws, ledgers and the dwell clock are host-side transient
bookkeeping — never saved, never wired. If a future movement wants
guest-visible run state (a march's route preview, say), it ships derived
scalars on the wire (the tell-wire idiom), never source state.

## QA MAP

- `balance/probe_theater.ts` (roster: green/fast) — 54 checks: registry +
  priority, needs/axes, the resident law's structural gates, keyed purity +
  zero global-die consumption (absent == silent), anti-starvation (the
  probe recomputes the engine's draw), two-world determinism, the
  concurrency fold + writer seam + kind-diversity singleton, both pour
  lanes (cap-stop + entry-whole + spent-band refusal), the dwell lattice +
  quiet ground, the live march, the live siege (whole cast, no payout),
  and the cast rigs: the troop march's exits-pair walk (cross + leave,
  ground restored), the funeral's paced cortege (speedMul measured against
  an unpaced twin), the hunting party's standing-tag prey + capped pour,
  the cart guard's road route + wheeled cart + clean leave, and the watch
  change (seats stream-silent, offstage beside a staged kind, leans
  draw-free onto real spots, expires by its hour, reverts byte-exact).
- `balance/eventqa.ts` section 8 — the static data contract + THE PARITY
  PIN; section 7 censuses kind ids against biome policy.
- `npm run sim -- baseline check --suite smoke` — the arena is 'safe'
  (quiet by stamp), so the smoke suite is structurally untouched; gated
  clean at the landing.

## MOVEMENT LEDGER

Movement one (2e305b5) founded the fabric; movement two (this pass) landed
THE CAST above — all five ratified members. Adding a sixth occurrence
remains ONE `registerTheaterKind` + row lines; a new faction's funeral or
watch change is row data alone.

**THE TERRACE PILGRIMAGE** (the Scald Basin's M3 coda — `data/pilgrimage.ts`
+ the pure leaf `engine/pilgrimage.ts`, docs `docs/engine/pilgrimage.md`,
probe `balance/probe_pilgrimage.ts`) is the first country-owned kind to GROW
the fabric, by two generic seams: **THE FACE AXIS** (`TheaterRow.tilesets`
over `TheaterContext.tileset` — a row may claim one face of a biome; omitted
abstains) and **THE LOCAL CLOCK GATE** (`TheaterKindDef.ready(world, ctx)` —
a kind whose WHEN is a clock the zone itself keeps declines a beat it could
not form on BEFORE the draw, spending no seat and shifting no draw, every
stream being keyed per beat). The kind itself: a lantern-bearing geyserkin
column on the pass-through march grammar that halts at the loudest vent's
brim (the march goal parked; the kind owns its halts) timed to the surge
hour it only READS (her cue law), lays drying offerings through
`World.plantDressAt`, and disperses — all four gates by construction.
