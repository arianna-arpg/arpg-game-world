# THE BOUNTY BOARD — design charter v1 (postings on a beat, the directed world, pay you can aim at)

**Status: DESIGN ONLY — nothing under `src/` is touched by this charter.**
Commissioned 2026-08-24 off her message opening the bounty-board
collaboration. Her asks are §0 and are treated as settled DIRECTION;
everything else is a PROPOSAL — recommended freely, decided nowhere she has
not decided. The DECISION CARDS are §11. Anything marked **DIAL** is a
build-time lever; every number is unblessed (her standing word: numbers
bless through playthroughs). Survey receipts are against HEAD `360e7c5`;
anchors name files + symbols — line numbers drift. Backlog ancestry: the
board was carded as **#356** in the attention-policy round (the
"bounty-board-as-chevron-patron" coupling; see `world/attention.ts` and the
chevron-temper pass) — this charter is that card grown to a system.
**WALK 1 (2026-08-24, the same day): RATIFIED — "This looks great as a
first pass." All ten cards RULED (§11 carries the verdicts; the walk table
follows §0). Amendments folded through: the collect RE-RULED to the board
turn-in (§6), the slate opens at FIVE (§4/§13), R2 split named/category
(§6), THE FAIL LANE beside the annul (§4), the one-hand law's per-board
future encoded unhardcoded (§2), the board's look + siting made M0 riders
(§3). No movement fired — M0 awaits her go.**

> **THE LEAD FINDINGS, before anything else.**
>
> 1. **The codebase already anticipates this system by name, five times.**
>    `src/quests/types.ts` (header): *"Bounty boards are the same primitive
>    with a different giver."* The `QuestCategory` union carries a dormant
>    `'bounty'` member — *"repeatable board work (future Bounty Boards): a
>    small cap"* — with `QUEST_CATEGORY_CAPS.bounty` (currently 2) live and
>    enforced in `acceptableQuests()` and a reserved badge color
>    (`QUEST_CATEGORY_COLORS.bounty '#e0b060'`), all unused by any def.
>    `src/quests/defs.ts` (tail): *"a new giver (a secret vocation's shrine
>    spirit, a future bounty board) joins the moment a QuestDef names it."*
>    `src/data/townBuild.ts` (header): *"A future town feature (bounty
>    board, temple, stash) is ONE more TOWN_ADDITIONS entry."*
>    `src/meta/nemesis.ts`: *"future assassins, bounty boards, and
>    contracts read and write the same records."* The architecture question
>    is settled by the fabric's own reservations: **a bounty is a GENERATED
>    quest**, offered by a board giver, in the reserved category.
> 2. **The refresh clock she wants is built.** THE BEAT LAW
>    (`World.restockSeconds` / `restockOrdinal`, the `(beat+1)×sec`
>    lattice, `armVendorStock`'s seeded arm, the `vendorArmedBeat` standing
>    shelf, `VendorHold.watchedSec` wall-time anchoring, and
>    `resolveCommission`'s seeded away-beat loop) is the vendor counter's
>    standing law — the board rides the same laws on its own, longer clock.
> 3. **The reward plumbing exists for four of her five lanes.**
>    `rollItem({ uniqueId })` mints a SPECIFIC unique; `withFamily` is the
>    themed-cache forced-affix lever (the Descent + royal-jelly precedents);
>    `resolveLootTable`'s own header anticipates us — *"a vendor shelf,
>    chest fill, or quest reward feeds from the identical tables tomorrow"*;
>    gem/Memory mints and both essence wallets have grant APIs; and THE
>    OWED LANE (`dropGemAt`/`dropGearAt` `owed=true`) already carries quest
>    pay through spoils-sealed ground. **Crafting components are the one
>    genuinely new economy lane** (§6 R5, card 7): no consumable component
>    type exists anywhere — though `forgeItem`'s header names "a crafting
>    recipe" as an intended future consumer and the crafting fabric
>    (salvage → lore → bench ranks) stands ready to receive one.
> 4. **The targeting instruments exist.** `pickSeat`/`SeatTuning`
>    (`world/seats.ts`) is the one data-driven "where does this land" —
>    range envelopes, known/unknown/**veiled** weights, biome multipliers —
>    already serving eleven events. And her "close a fracture in X zone"
>    example is literally implemented today: `FractureField.devIgnite(view,
>    zoneId)` — hunt, breach, and worldboss overlays carry the same
>    directed-ignite hook. The SUMMONS lane (§5 K5) is a registry over
>    verbs that already exist.
> 5. **Three genuine gaps, all named.** (a) Generated quests die on load —
>    the resume filter keeps only `QUESTS[q.questId]`, a static record; the
>    spine is ONE resolver seam + persisted posting defs (§2). (b) Quests
>    only MINT fresh arenas (`acceptQuest` → `placeZoneAt`); postings that
>    CLAIM existing ground (a veiled zone, a standing event's seat) are a
>    new target mode (§2). (c) Per-kind completion predicates need one
>    honest bus — the run ledger + three standing hooks cover every launch
>    kind (§5).
> 6. **The word "bounty" is crowded** — ten distinct standing meanings
>    (§1), including a shipped harborhold writ board wearing the
>    `bounty_board` doodad. The census and the vocabulary proposal are §1;
>    card 1 carries the ruling.

---

## 0. Her commission (2026-08-24 — the asks, encoded as direction)

| # | ask |
|---|---|
| 1 | **Randomly generated, player-selected quests** that let the player direct their attention and thus their rewards — "commissions that the player can select from and receive rewards for completing." |
| 2 | **Unlocked as a Vault item; takes residence in Lastlight.** |
| 3 | **Dwell opens the offers** — X quests presented as objectives. |
| 4 | **One active bounty at a time.** |
| 5 | **A large reward gamut**: essence payouts · unique items · specific assortments of gear · skill/support items · **crafting components** — the last "a new mechanism/quest reward" she wants implemented. |
| 6 | **Targets shift over time like vendor offerings.** |
| 7 | **An enormous objective gamut**: navigate to a located, uncharted/unexplored zone · complete a (generated or otherwise) task within a zone · complete THE objective of a zone · complete a (generated or otherwise) event within a zone · more. |
| 8 | **The board derives from the live world** — "nearly its own content package that derives its content from the plethora of other content packages": a world boss standing during a refresh can post as a kill bounty. |
| 9 | **A bounty can SPAWN its event** — "close a fracture in X zone" spawns that fracture for the bounty, independent of however many already ride the map — the board as an event-density lever. |
| 10 | **The system's purpose is agency**: direct the player's focus, and let them target specific reward structures. |

### The walk (2026-08-24 — the same day, her verdicts)

| card | verdict |
|---|---|
| the charter | **RATIFIED** — "This looks great as a first pass." |
| 1 · the name | **RULED: THE BOUNTY BOARD + the writ layering** — "this is fine and coheres throughout." Rider, hers: the board OBJECT needs "a nice visual… and that Lastlight really has enough space for it to register appropriately while not blocking anything off" — §3's REGISTER RIDER, an M0 acceptance gauge |
| 2 · the hand | **RULED: one active**; co-op takes "whichever is easiest to implement" → the standing world-scoped shape (the party's hand). THE PER-BOARD IMPLICATION recorded with card 10 (her word): the future is likely one-per-board — "let's go ahead with locking it to one active bounty for right now, with the IMPLICATION that we may want to revise this in the future and to not deliberately hardcode it in place" — §2 encodes the unhardcoded shape |
| 3 · the collect | **RE-RULED: TURN-IN AT THE BOARD** — pay lands when the player returns and turns in. Her reasoning: the return home is wanted, and the cycle is unbroken — turn-in and next-pickup are ONE trip ("receiving payout upon completion means that a player would then have to navigate back to town to get a new bounty anyways") |
| 4 · the errand's veil | **RULED: per-posting flavor, default = discovery stays the ask** (the omen face); a minority of postings may roll the deed-lift face |
| 5 · the annul + THE FAIL | **RULED as recommended**; her extension: keep the FAILURE horizon open ("I'm actually not quite sure of a situation in which it would fail, but it's best to keep the horizon open and assume that it potentially could") — a failed bounty resolves like a turn-in: "treated the same… both would simply require navigation back to the board either way, which grants the same outcome patterns" — return, the board acknowledges, no pay, the next slate offers |
| 6 · the slate | **RULED: shape as proposed; opens at FIVE** — "ensure that this can be adjusted easily as we do walks" (the one-dial law) |
| 7 · the component fork | **RULED: the own-charter road** — "this will likely also be quite different and will require a new minigame" (the smith/rune minigame register — recorded in the fork's scope) |
| 8 · the unique pool | **RULED: unseen uniques post.** Amendment: R2 SPLITS — named uniques AND unique CATEGORIES ("a unique ring") — targeted farming without the name |
| 9 · the summons roster | **RULED as recommended** (fractures → hunt + worldboss → breach where its shape fits) |
| 10 · the writ kinship | **RULED WANTED** — "I would actually love to see the writ kinship… this is a great idea"; a committed future movement, not launch; carries the per-board-hand implication (card 2) |

---

## 1. THE NAME — the crowded word (card 1)

The census (survey receipts):

| # | standing meaning | anchor |
|---|---|---|
| 1 | the generic kill/clear PAYOUT — "the per-kind bounty registry consumed by World.kill()" | `engine/killHandlers.ts` |
| 2 | `Actor.noBounty` — conjured bodies pay nothing | `engine/actor.ts` |
| 3 | `ZoneDef.bounty` — the zone's loot-richness multiplier | `data/zones.ts`, `World.rollDrops` |
| 4 | `ObjectiveSpec {kind:'bounty'}` — the writ-hunt zone objective | `data/zones.ts`, `data/bounties.ts BOUNTY_CFG` |
| 5 | `Actor.tag 'bounty_mark'` — a named, promoted quarry carrying a writ | `data/bounties.ts` kill handler |
| 6 | the `bounty_board` DOODAD — the harborhold plaza's writ board | `data/harborholds.ts SERVICES_CORE`, `World.postHoldWrits` |
| 7 | `QuestCategory 'bounty'` — **dormant, reserved for exactly this feature** | `quests/types.ts` |
| 8 | spoken copy for quest pay ("a bounty is yours to claim") | `World.questGiverPrompt` |
| 9 | xp-floor prose ("a warlord's bounty") | world.ts comments |
| 10 | the Vendetta's rising price on the player | `packages/defs/vendetta.ts` |

"Commission" is spoken for once (the vendor STANDING ORDER —
`VENDOR_CFG.commission`, a player-aimed standing ask at a counter: the same
register family, arguably harmonious). "Contract" is architecturally
unclaimed but `nemesis.ts` reserves it for a FUTURE nemesis-personal thing
*beside* bounty boards — do not spend it here.

**The proposal.** Embrace the reservation the fabric already made:

- **Player-facing: THE BOUNTY BOARD**, its offers **BOUNTIES** — the
  category, cap, and badge color already reserved under that name. Her own
  framing word "commissions" stays available as flavor copy on the panel
  ("take a commission"), not as the system noun.
- **The harborhold plaza board keeps WRIT as its player word** (its copy
  already speaks writs: "Hunt the marked — N writs unclaimed"; only the
  doodad id says bounty). Vocabulary law, one line: **the BOARD posts
  bounties (journeys with pay); a WRIT is a posted claim on a named body**
  — and where a bounty's kill-work lands in a zone, it is WRITTEN AS WRITS
  (§5 K3 rides the writ grammar), so the layers nest instead of colliding.
- **Code family:** new file `src/data/bountyboard.ts` + `BOUNTY_BOARD_CFG`
  (the `BOUNTY_CFG` token is taken by the writ objective in
  `data/bounties.ts`); postings/save/wire tokens under `bountyBoard*` /
  `posting*`. Distinct, greppable, gate-friendly.

---

## 2. THE SPINE — a bounty is a generated quest

**The model.** The board MINTS `QuestDef`s at arm time — category
`'bounty'`, giver = the board — and the standing quest fabric carries
everything downstream: the accept flow, `activeQuests`, the map markers
("?" on the target, "!" home), the journal tab, the payout site, the
turn-in machinery, the ledger contract, co-op world-scoping. *"Bounty
boards are the same primitive with a different giver"* — the fabric's own
sentence is the architecture.

**THE RESOLVER SEAM (gap a).** Every quest lookup today reads the static
`QUESTS` record, and the resume filter drops active entries whose def it
cannot find (`world.ts` load: `QUESTS[q.questId] && healed[q.zoneId]`). The
spine is one function — `questDefOf(id): QuestDef | undefined = QUESTS[id]
?? world.postedQuests[id]` — swapped in at the lookup sites, with the
board's generated defs persisted in the world save (§4) and re-seated
before the filter runs. Generated defs are small plain data (a kind row id,
a target, a reward spec, copy); serializing them is the honest cost of
generated content, and the LIVE-REGISTRY MANDATE is preserved because a def
is derived FROM registries at mint time and stored as an instance, exactly
like a rolled item.

**THE CLAIM LANE (gap b).** `acceptQuest` today always mints a fresh arena
(`quest_<id>` via `placeZoneAt`, the QUEST DEED notarizing the road). A
bounty's target is usually STANDING ground — a veiled halo zone, a zone
holding a live event, a rest zone a serpent settled on. The posting
generator resolves its target at ARM time through `pickSeat` (per-kind
`SeatTuning` — §5), and the accepted bounty's `activeQuests` row simply
carries that existing `zoneId`. What the accept does in the claim lane:

- **notarize the way** (recommended): `notarizeRoad` along the chord to the
  claimed anchor, so no ambient heal cuts a road mid-bounty — the deed law
  extended from minted spurs to claimed ground. Cheap, and the map draws an
  honest way.
- **veil policy is PER KIND** (card 4): a CHARGE bounty on a veiled zone
  lifts the veil at accept (the quest precedent — "the quest TELLS you the
  way"); an ERRAND bounty (the exploration ask) deliberately does NOT — it
  registers an OMEN instead (§8), because being unfound is the ask.
- The MINT lane stays available to kinds that want a fresh arena (a future
  "purge the spur" bounty is one `QuestZoneSpec` away — nothing new).

**THE ONE-HAND LAW (her ask 4; walk 1 ruled).** `QUEST_CATEGORY_CAPS.bounty`
re-dials 2 → **1** — a one-line change in `quests/types.ts`; the cap
constant stays the dial. Quests are world-scoped (`activeQuests` is World
state), so in co-op the hand is the PARTY's hand — the standing quest
shape, which is also the easiest lane (her walk-1 word: "whichever is
easiest to implement"). **THE PER-BOARD IMPLICATION (walk 1, with card
10):** once regional boards exist (the writ kinship, ruled WANTED), the
hand is likely ONE PER BOARD — so the singular is never hardcoded: the
accepted bounty RECORDS its issuing board (`Posting.boardId`), the cap
check FOLDS active hands per board (today's one-board world collapses the
fold to her global 1), and no intent, wire row, or save shape assumes
exactly-one. Revising to per-board hands must be a dial's turn, never a
rewrite.

**Repeatability + THE SHARED-STAMP LAW.** Generated ids are fresh per
posting (`bounty_<beat>_<n>`), so `completedQuests` never blocks re-offers
— but the payout site stamps `quest_done:<id>` to the ACCOUNT ledger, which
for generated ids means unbounded key growth. The bounty lane stamps
SHARED keys instead: `bounty_done` (the counter) + `bounty_done:<kind>`
(per-kind counters), run + account, at the same payout moment — the
gatework then gates future rungs on `ledgerPrefix: 'bounty_done'` (the
`quest: true` prefix-scan precedent). One branch at the payout seam, keyed
on the category.

---

## 3. THE BOARD — residence, dwell, the panel

**The unlock.** One feature-kind catalog row (`meta/unlocks.ts`):
`feat_bounty_board` → `FEATURE.BOUNTY_BOARD`, cost **DIAL**, gates
**DIAL** (proposal: `reqAnyOf: [{ quest: true, label: 'any quest seen
through' }, { level: N }]` — the board is for players who know what a
quest is; the tease law surfaces it sealed with avenues printed). Growth
rungs are open dials (§13): Broader Postings (offer count), Farther
Postings (seat range), a component-lane rung — each ONE more row on the
standing tease/derived-copy machinery.

**The residence.** The Salvage Station lane verbatim (`data/townBuild.ts`):
a `BOARD_SITE` const + one `TOWN_ADDITIONS` row keyed on the feature + a
prop-only open-air `StructureDef` (`bounty_post`: a notice board + lantern
+ bench — the board look itself can be the standing `bounty_board` doodad
kind as a prop, whose painter and lamp already exist in
`doodadVisuals.ts`), folded into the per-run town def by `expandedTown` at
World construction. No engine edits; Lastlight is not a hold, so
`updateWritBoard`'s hold-state gate never collides with the prop.

**THE REGISTER RIDER (walk 1, card 1 — an M0 acceptance gauge, not
polish).** The board must READ as itself: the standing `bounty_board`
painter + amber lamp is the floor, not the ceiling — M0 gives the
Lastlight instance a look pass (posted-paper dress, a silhouette that
carries at plaza scale) and a SITE chosen for clearance: open ground off
the road lines and counter aprons, the dwell radius overlapping no other
station's, nothing walled off behind or beneath it. Her in-browser gauge
of the look + the siting gates M0's close.

**The dwell → panel chain.** The harbor-board wiring, renamed: a `Dwell`
gate at the site (radius/дwell **DIAL**, the `CARAVAN_DWELL 0.9` register)
→ one-shot `boardDwellRequested` → polled in `main.ts` → `ui.showBounties()`
— the Caravanner indirection, the couch lens + action latch laws as
standard. The panel is the Sail panel's shape: posting CARDS (§5's faces),
each with an ACCEPT button raising a host-routed intent
(`{ t: 'bountyAccept', id }` — the `harborChart` routing precedent), plus
`bountyAbandon`. Refusals speak through one predicate (hand full, gate
unmet, posting annulled) — the `swapRefusal` idiom.

**THE COUNTER LAW carries**: the board serves only reachable dwellers
(`dwellReachable`), and browsing is always free — only ACCEPT is gated.

---

## 4. THE BEAT — offers on a lattice

The vendor beat laws, re-instanced on the board's own, slower clock:

- **The quantum**: `boardBeatSeconds()` = `BOUNTY_BOARD_CFG.beatSec`
  (**DIAL**, proposal 900s — postings are journeys, not purchases) minus
  any future rush rungs, floored. The live mark sits on the lattice
  boundary (`(beat+1)×sec`) — countdown, re-roll, and panel face are one
  clock, phase zero, no drift.
- **THE FOREORDAINED ARM**: offers roll under `withSeededRandom` seeded
  `(worldSeed ^ hash('bountyboard:<beat>'))` — reload replays the identical
  slate; re-roll scumming means waiting out the beat.
- **THE STANDING SLATE**: postings PERSIST in the world save
  (`WorldStateSave.bountyBoard`: the offer array + armed beat + the posted
  defs of §2's resolver, under a keep-what-stands sanitizer — the
  `vendorHolds` shape). Persisting (not re-deriving) is load-bearing here,
  and is the one deliberate divergence from the vendor shelf's
  never-persisted stock: the vendor's pool is account state (stable across
  a reload), the board's pool is the LIVE WORLD (§7) — a boss died, an
  event resolved — so a re-derive would silently deal a different hand.
  Arm only on a TURNED beat (`boardArmedBeat`, the standing-shelf law).
- **THE TAKEN HAND survives the beat** (the vendor-hold precedent: a
  reserved ware rides every restock): the accepted bounty is beat-immune —
  it is an `activeQuests` row now, not an offer. Unaccepted offers re-roll
  whole on the turn.
- **No away accrual**: nothing accrues on unaccepted postings, so the
  standing order's catch-up loop has no analogue here — the arm simply
  rolls the CURRENT beat's slate. (`watchedSec` machinery not needed.)
- **THE ANNUL RECONCILE**: at arm and at board-open, every offer and the
  active bounty re-verify their target against the live census (§7): the
  boss already slain, the fracture already sealed, the errand's zone
  already walked → the offer is struck through / the active bounty ANNULS
  with a courtesy notice, the hand frees, no penalty (card 5). Never a
  silently dead posting — the standing order's own law ("refuses WITH the
  reason, never a silently dead order").
- **THE FAIL LANE (walk 1, beside the annul)**: a bounty CAN fail, and the
  horizon stays open even where no case is named today — every kind may
  declare a `failed()` read (the real case shipping already: a CHARGE on
  failable ground — the caravan robbed, the escape lost; `objectiveLost`
  stands). A failed bounty resolves LIKE A TURN-IN (her rule: "treated the
  same… both would simply require navigation back to the board either
  way, which grants the same outcome patterns"): the player returns, the
  board acknowledges, no pay, the hand frees at the dwell, the slate
  offers the next. One cycle for every ending except the world's own
  annul (which frees in the field with its courtesy — nothing to bring
  home).

---

## 5. THE POSTING KINDS — an open registry

`registerBountyKind(row)` — the puzzle-kinds/trap-effects idiom. A kind row
owns four verbs, each leaning on standing machinery:

```
BountyKindRow {
  id; weight; levelBand?;            // offer-roll shape (DIALs)
  seat?: SeatTuning;                 // WHERE — pickSeat over the live map
  roll(world, rng): Posting | null;  // resolve target + copy + pay class
  accept?(world, p): void;           // deed/veil/omen per §2's claim lane
  done(world, p): boolean;           // THE PREDICATE — read, never write
  annulled?(world, p): string|null;  // the reconcile's honesty read
}
```

**The launch kinds** (each names its completion bus — all three buses
exist):

- **K1 · THE ERRAND** — *"reach the place."* Target: a VEILED zone via
  `pickSeat` (`veiledMul` heavy, range envelope **DIAL**) — veiled halo
  ground is fully woven and linked by the forechart's own law ("only the
  map is blind"), so reachability is structural, no new guarantee needed.
  THE VEIL is per-posting FLAVOR (card 4, ruled): the DEFAULT face keeps
  discovery the ask — accept registers an OMEN (whisper + aging reveal,
  §8), no lift; a minority face rolls the deed-lift instead (the way
  draws), its share a **DIAL**. Done: `visited.has(zoneId)` — entry is
  the deed.
- **K2 · THE CHARGE** — *"complete the objective of the place."* Target: a
  standing zone with a completable objective (seat filter excludes
  `safe/none/escape` kinds and event-quiet ground; the `OBJECTIVE_SEALS` /
  `FALLBACK_KINDS` vocabulary is the honesty floor). Done:
  `completedObjectives.has(zoneId)` — and because the accepted bounty is an
  `activeQuests` row carrying that zoneId, the standing
  `onQuestZoneFieldCleared` hook fires for free at the clear (it is
  already independent of the zone's one-time bounty latch, by comment and
  by construction). The objective VARIETY is the content: twenty authored
  kinds today, every future kind joins the pool the day it ships. Failable
  ground is real here (the caravan robbed, the escape lost —
  `objectiveLost` stands today): a failed charge ends through §4's fail
  lane.
- **K3 · THE CULL** — *"kill the named."* The writ grammar goes remote: on
  first ENTRY to the target zone with the bounty in hand, the board posts
  K writ marks through the standing promote-and-name path
  (`postHoldWrits`' shape: farthest-first normals, nemesis names,
  `tag 'bounty_mark'` — chevrons, zone-memory persistence, and the
  per-mark XP handler all arrive from `data/bounties.ts` verbatim), each
  mark carrying `Actor.eventKey = posting id` (the vendetta/worldboss
  precedent) so ONE static kill-handler row credits the posting. Done: all
  K claimed — pure population state, the writ law. (The `bountyView`
  board-lane inference is per-zone today; its own doc comment prescribes
  the per-mark lane stamp the moment a poster mixes lanes — K3 is that
  moment. Pitfall 3.)
- **K4 · THE ANSWER** — *"resolve what stands."* Target: a LIVE event
  drawn from the source registry's census (§7): a world boss up
  (`peekSerpents/peekApparitions/peekLairs` — THE DECREE, her ask 8), a
  standing fracture run, a revealed hunt, a besieged harborhold's muster.
  Done: the source's own resolution read — ledger deltas from an at-accept
  baseline (`worldboss_slain_<defId>`, `fractures_sealed`,
  `bounty_writs_claimed` are all stamped today) or the source's standing
  predicate (`holdStateFor(z).state === 'open'`). Annul: the target
  resolved by another hand or left (an apparition's `stayLeft` runs out) —
  §4's reconcile.
- **K5 · THE SUMMONS** — *"the board plants the ask"* (her asks 7/9). The
  kind's roll picks a seat zone, and the ACCEPT calls the source's
  registered directed-ignite verb — `FractureField.devIgnite(view, zoneId)`
  is her example shipping today; hunt/breach/worldboss carry the same hook
  — promoted from dev-named to a first-class registry verb. Laws: a
  summons is ADDITIVE by design (independent of ambient counts — the
  event-density lever she named) but wears its OWN cap
  (`BOUNTY_BOARD_CFG.summons.cap`, **DIAL**, proposal: 1 standing
  summons-born instance per package) and honest refusal at roll time when
  the package's own `maxConcurrent` leaves no room to breathe; it is
  tagged in the overlay's state so the reconcile and the annul read it;
  and it obeys transience by construction (it IS the standing package —
  eventOnly weather, dress, decaying warps, the zone-claim convention all
  arrive free). Done: the same resolution read as K4.

Kind diversity on the slate (at most one of a kind per beat, weights) —
**DIAL**. Posting FACES obey the precision clause: the ask named plainly
(the zone's name and read, the target's name), the pay printed exactly
(§6), the distance spoken in the omen register ("a hard walk out") — no
captions, no fluff.

**The theater boundary, recorded:** a bounty is announced, arced, and paid
— the exact opposite pole of the theater fabric's RESIDENT LAW (arcless,
unannounced, budget-honest zone texture). The board never commissions
theater; `engine/theater.ts` is untouched by every movement here.

---

## 6. THE PAY — reward lanes on the owed law

An open lane registry mirrored by data — the posting stores a `pay` spec;
one executor routes it at THE TURN-IN (walk 1's collect re-rule): pay
lands when the player returns to the board and turns in — the standing
`QuestTurnIn` withhold lane (`fieldDone`, the "!" return marker with its
"Return to claim" copy, the turn-ins-first dwell order in
`updateQuestGiver`) becomes the bounty DEFAULT, giver = the board. Her
reasoning, encoded: the return home is wanted, and the cycle stays whole —
the same dwell pays the finished bounty and offers the next slate, one
trip. All ground mints land at the board's feet through THE OWED
LANE (`dropGemAt(..., owed)` / `dropGearAt(..., owed)` — the exact comment
already in the engine: *"a quest's payout is earned of the writ, not of
this ground"*); wallet grants (`grantEssence`, `grantAbilityEssence`)
never consult the spoils seal at all.

- **R1 · ESSENCE** — `EssenceCost[]` into the tint wallet, and/or Memory
  Essence tiers (`grantAbilityEssence`). The floor lane, always available.
- **R2 · THE UNIQUE — two faces (walk 1's split).** (a) NAMED:
  `rollItem({ uniqueId })`, the item named on the card — her
  reward-targeting agency, literal. (b) THE CATEGORY (her amendment): "a
  unique ring" — `rollItem({ rarity: 'unique', category })`, the standing
  `LootEntry` 'unique' arm's own optional-category shape: targeted
  farming without the name, the mystery kept. Pool: level-banded from
  `UNIQUE_LIST` weights; unseen uniques POST (ruled — the board deals,
  the player aims by choosing among dealt cards; the card names or
  categorizes what the account may never have met).
- **R3 · THE GEAR LOT** — "a specific assortment": a seeded lot described
  precisely on the card, built from the standing rollers —
  `resolveLootTable` ids (its header invited us), `withFamily` forced
  registers, `category` + `rarityWeights` constraints ("three rares of the
  blade families, one carrying the stormwork register"). Data, not new
  machinery; `forgeItem` stands by for exact-spec lots if a card ever
  wants one.
- **R4 · THE MEMORY** — a KNOWN gem by id (the mint stamps `noteGemDrop` —
  THE MINT LAW, so the Standing Order keeps feeding) or Memory pouch units
  by count (`makeMemoryItem` merge, TRADED-provenance precedent).
- **R5 · THE COMPONENT** — **THE FORK** (card 7). No component type exists;
  the honest shape is a NEW stackable family whose consumers live in the
  crafting fabric (bench catalysts naming an affix family/tier — the
  `withFamily`/`forgeItem` seams are the obvious mouths; vestiges are the
  nearest structural precedent for "stackable, satchel-borne, consumed by
  a socket/act"). This charter RESERVES the lane (the reward registry
  ships with the row named and empty — the weight-0 reserved-word law) and
  commissions a sibling mini-charter for the component economy itself;
  the board becomes its first faucet the day it lands.

**THE VISIBLE PRICE LAW** (her ask 10): the card prints the exact pay —
the unique by name, the lot by its constraints, the essence counted. A
"sealed pay" posting variant is a recorded future dial, not launch.
**The magnitude fold**: one derivation prices pay from the ask
(`zone.level`, distance band, kind toll, event severity) —
`BOUNTY_BOARD_CFG.pay`, every number **DIAL**, unblessed. The economy
audit gains a board lane the same movement rewards land (§10 pitfall 9).

---

## 7. THE DERIVATION — the live-world reader (her ask 8)

`registerBountySource(row)` — the world-grain sibling of the shipped
`registerPackageAsk` (which already publishes standing/engaged/view per
package for objective adoption). A source row publishes:

```
BountySourceRow {
  id;                                  // 'worldboss' | 'fractures' | 'hunt' | 'harborhold' | …
  census(world): TargetRef[];          // live, at arm/reconcile time
  resolved(world, ref): boolean;       // the K4 done/annul read
  ignite?(world, zoneId): boolean;     // the K5 directed verb (devIgnite promoted)
  copy(ref): PostingCopy;              // names, reads — precision only
}
```

THE COMPOUNDING LAW is the whole argument of this section: the board never
hardcodes a package list (the live-registry mandate) — every package that
registers a source row becomes board content the day it ships, and every
future fabric (an Odyssey stage, a colossal-lair wake, a contagion patient
zero) is one row from being a posting. The board is a content MULTIPLIER:
it manufactures no world of its own; it aims the player at the world that
already lives, and pays for the trip.

Foreordained-with-a-live-pool, stated honestly: the SLATE roll is seeded
(§4) over a pool read from live registries + live world state at arm time
— deterministic given the world's standing truth, persisted so reloads
meet the same slate, reconciled so the world moving on reads as an honest
strike-through instead of a lie.

---

## 8. THE GUIDANCE — markers, chevrons, omens (#356 closed)

- **The journal + map arrive free**: an accepted bounty is an
  `activeQuests` row — the Quests tab, the "?" target marker, the "!"
  return marker, and the giver bubble all already speak quest categories
  (the reserved `'bounty'` badge color included).
- **The chevron patron** (#356's coupling): one new
  `registerAttentionSource` row — in the TARGET zone, the active bounty's
  fixture/quarry/event points through the standing `collectAttention`
  fold, in the board's own accent + glyph (**DIAL**; distinct from the
  writ ☠ — though K3's posted marks ARE writs and keep ☠ by law: drawn ==
  meant). The per-goal chevron POLICY vocabulary carded in the
  chevron-temper pass stays CARDED — the board adds a source, not the
  policy rework.
- **The omen lane** (K1, card 4): the errand's accept registers an omen
  (`registerOmenSource` reading the board's state) — whisper radius,
  aging `widenPerMin`, a reveal that finally surveys the seat if the
  player circles long enough: the findability guarantee without the veil
  lift. The exploration ask stays an exploration.
- **Exit labels + notarized ways** draw per §2's claim-lane deed.

---

## 9. STANDING BY CONSTRUCTION — what this charter does not move

- **The quest fabric's core** — accept/turn-in/payout sites, the deed law,
  `questDoneKey` for AUTHORED quests, category machinery: extended through
  declared seams (`questDefOf`, the claim lane, the shared-stamp branch),
  never forked.
- **The vendor beat** — the board runs its OWN clock and config; counters,
  restocks, holds, the Standing Order untouched.
- **The writ fabric** — `data/bounties.ts`, the hold plaza board, the
  bounty zone-objective: untouched; K3 CALLS the promote-and-name path it
  already exports and shares its kill handler's tag law.
- **The theater fabric** — the resident law's opposite pole; no coupling.
- **Transience + the spoils law** — summons ride standing packages; pay
  rides the owed lane; no new exemptions minted.
- **Co-op** — quests are world-scoped, intents host-routed (the
  `harborChart` exception list grows two entries), the unlock reads the
  keeper's account (the keeper's-gate law), panels route by the action
  latch. The one-hand law is therefore the party's hand (§2, card 2).
- **Saves** — `WorldStateSave` grows one bag (`bountyBoard`) under a
  keep-what-stands sanitizer; the saves-disposable doctrine owes no
  migration.
- **The balance harness** — postings are census-invisible by construction
  (the sim arena runs a quiet safe zone; bare instances hold no board
  state); the one static K3 kill-handler row is tag-scoped like the writ
  row it mirrors.

---

## 10. THE PITFALL LEDGER (each with its receipt)

1. **The load filter eats generated quests.** Resume keeps only
   `QUESTS[q.questId]` — without §2's resolver seam + persisted defs,
   every accepted bounty silently dies on reload. The spine's first test.
2. **Ledger bloat from generated ids.** `questDoneKey` stamps the ACCOUNT
   per id; fresh ids per posting = unbounded growth. THE SHARED-STAMP LAW
   (§2) branches the payout seam by category — `bounty_done` +
   `bounty_done:<kind>`.
3. **The bountyView lane grain.** `World.bountyView().board` infers the
   lane from the ZONE's objective kind — its own doc comment names the
   break: a poster that mixes lanes in one zone must stamp the lane
   per-mark at post time. K3 posting writs into a zone that ALSO runs a
   writ objective is that exact collision — widen to per-mark grain in
   K3's movement, per the comment's own prescription.
4. **Owed asymmetry.** `dropVestigeAt` / `dropEssenceAt` /
   `dropAbilityEssenceAt` carry NO owed parameter (they seal
   unconditionally) — board pay routes through wallet grants and the
   owed-bearing gear/gem/table lanes only; a ground-vestige reward would
   need the parameter grown deliberately.
5. **Dead-target postings.** Apparitions expire (`stayLeft`), serpents are
   slain by other hands, fractures idle out (`idleLife`), holds fall —
   without §4's annul reconcile the board advertises ghosts. The
   standing-order refusal law is the register: never silent.
6. **Summons vs the caps.** Directed ignites bypass `igniteChance` by
   design but must negotiate `maxConcurrent`/`scaledCap` honestly — K5
   refuses at roll when the package has no headroom, and wears its own
   summons cap. Over-pour is the farm; the cap is the law.
7. **The completability floor.** K2's seat filter must exclude
   `safe`/`none`/`escape` objectives, event-quiet and spoils-sealed policy
   ground (`eventTargetable` + the objective-kind census) — a bounty that
   cannot complete is a lie on a card.
8. **Claim-lane side effects.** An `activeQuests` row claims its zone from
   the save's zone-fold (by standing code) — correct for bounties too, but
   the claim now lands on ORDINARY zones: verify the fold's claim set and
   `completedObjectives` serialization (which strips `quest_` ids by
   prefix) treat claimed standing zones as the ordinary citizens they are.
9. **The board as the optimal farm.** Repeatable + aimed rewards is a
   faucet: pacing lives in the beat length, the one-hand law, the
   magnitude fold, and the summons cap — and the economy AUDIT lane
   (`audit drops`' sibling read for board pay) lands with M1's reward
   spread, not after.
10. **The dormant cap is 2.** `QUEST_CATEGORY_CAPS.bounty` ships at 2
    today; her law is 1 (§2). Encode at M0 lest the dormant default leak.
11. **Beat-clock divergence.** The board's clock is its OWN
    (`boardBeatSeconds`), not `restockSeconds` — sharing the vendor
    quantum would let a Rush Order rung silently re-pace the board.
    Separate config, same laws.
12. **K1 against the pregen doctrine.** Errands target VEILED ground —
    found-not-fresh is exactly the sanctioned lane, but the seat range must
    stay inside charted country (the halo + `maxVeiled` backpressure keep
    the pool honest; an errand must never point at `'?'` promises).

---

## 11. DECISION CARDS (her word wanted)

1. **THE NAME — RULED (walk 1): THE BOUNTY BOARD.** The writ vocabulary
   layered beneath (§1's nesting law) — "this is fine and coheres
   throughout"; "commission" stays panel flavor. Her rider became §3's
   REGISTER RIDER: the board object's look + Lastlight siting are M0
   acceptance gauges.
2. **THE HAND — RULED (walk 1).** One active bounty; co-op takes the
   easiest lane = the standing world-scoped shape (the party's hand). THE
   PER-BOARD IMPLICATION encoded in §2: lock 1 today, never hardcode the
   singular — per-board hands (with card 10's kinship) must be a dial's
   turn later.
3. **THE COLLECT — RE-RULED (walk 1): TURN-IN AT THE BOARD.** The
   `QuestTurnIn` withhold lane is the bounty default (§6) — the return
   home is wanted, and turn-in + next-pickup are one trip; instant field
   pay retired as the recommendation.
4. **THE ERRAND'S VEIL — RULED (walk 1): per-posting flavor.** Default =
   the omen face, discovery stays the ask; the deed-lift face rolls on a
   minority share (**DIAL**) — §5 K1.
5. **THE ANNUL — RULED (walk 1)** as recommended (courtesy, hand frees in
   the field, no penalty, struck offers stay struck). THE FAIL LANE added
   beside it (§4): failure resolves like a turn-in — return, acknowledge,
   no pay, next slate — the horizon kept open even where no failure case
   is named today.
6. **THE SLATE SHAPE — RULED (walk 1).** As proposed — fixed count,
   whole-slate re-roll on the beat, taken hand immune — opening at
   **FIVE** offers; the count is ONE dial, adjusted at walks.
7. **THE COMPONENT FORK — RULED (walk 1): the own-charter road.** The
   R5 lane reserved here; the component economy charters separately —
   her scope note recorded: it "will likely also be quite different and
   will require a new minigame" (the smith/rune minigame register in
   `CRAFT_CFG` is the standing kin).
8. **THE UNIQUE POOL — RULED (walk 1).** Unseen uniques POST; and R2
   SPLITS into named uniques + unique CATEGORIES ("a unique ring") — §6's
   two faces, targeted farming with or without the name.
9. **THE SUMMONS ROSTER — RULED (walk 1)** as recommended: fractures
   first (her example, hook live), hunt + worldboss next, breach where
   its encounter shape fits.
10. **THE WRIT KINSHIP — RULED WANTED (walk 1).** Regional boards reading
    the shared posting registry graduate from a recorded seat to a
    COMMITTED future movement (post-M4) — "I would actually love to see
    the writ kinship" — carrying the per-board hand (card 2). The hold
    board keeps its local writ soul at launch; nothing built forecloses
    the growth.

---

## 12. BUILD MOVEMENTS (each awaits her go; order argued below)

- **M0 — THE BOARD STANDS** (gauge-first). The catalog row + residence
  under THE REGISTER RIDER (the look pass + clearance siting — her
  in-browser gauge closes the movement) + dwell→panel + the beat-armed
  persisted slate (FIVE offers) + accept/abandon intents + THE ONE-HAND
  cap at 1 in the unhardcoded per-board shape + ONE kind (K2 THE CHARGE —
  the simplest honest predicate, riding hooks that already fire) + R1
  essence pay through THE TURN-IN at the board (the withhold lane —
  ruled) + the fail lane's board acknowledgment + the shared-stamp law +
  journal/map guidance free. Walkable end to end in one sitting: unlock,
  dwell, read five cards, accept, clear the zone, walk home, turn in, get
  paid, take the next. Probe (`balance/probe_bountyboard.ts`) + roster
  row SAME commit. Effort M.
- **M1 — THE SPREAD.** K1 THE ERRAND (omen lane) + K3 THE CULL (the writ
  grammar remote, per-mark lane stamp, eventKey credit) + reward lanes
  R2/R3/R4 + the posting card faces (precision copy, the visible price) +
  the economy-audit board lane. Effort M–L.
- **M2 — THE ANSWER.** `registerBountySource` + the live census lanes
  (worldboss DECREE, fractures, hunt, harborhold muster) + K4 + the annul
  reconcile grown to full honesty. Effort M.
- **M3 — THE SUMMONS.** The ignite verb promoted from dev hooks into the
  source rows, the summons cap + refusal law, the fracture debut (her
  example, end to end), transience pins. Effort M.
- **M4 — THE COMPONENT + POLISH.** R5 per card 7's ruling (its own charter
  first, recommended), the gatework growth rungs (Broader/Farther
  Postings), copy sweep, chevron accent walk. Effort S–M.

**Order: M0 → M1 → M2 → M3 → M4.** M0 is the gauge (the board felt at the
smallest honest scale before the spread); M1 needs M0's slate; M2's census
registry precedes M3's ignite verbs on the same rows; M4 rides last behind
its fork. M1 and M2 could run concurrent across sessions (disjoint files)
if the chips are cut that way. **A committed post-M4 movement (walk 1,
card 10): THE KINSHIP** — regional boards on the shared registry, the
per-board hand fold turned live.

**The commissioning ledger:** walk 1 (2026-08-24) ratified the charter and
ruled all ten cards; **M0 fired at her go the same day and LANDED @
`7f19fe0`** — the resolver seam (`World.questDefOf`), the persisted
beat-armed slate, the per-board one-hand fold, THE CHARGE kind, the
turn-in pay through the one payout site under the shared-stamp law, the
residence + dwell→panel chain, `probe_bountyboard.ts` (35 checks) + its
roster row in the same commit; every gate green (check clean, probe lane
157/157, smoke baseline unmoved) and the full loop live-walked in-browser
(five named postings → accept → complete → turn in → the printed pay).
**Owed her: THE REGISTER RIDER's in-browser gauge** — the board's look at
plaza scale + the siting (clearance-verified numerically: only the post's
own dressing inside the dwell disc; her eye closes it) — plus every dial
unblessed (beat 900s, five offers, the pay fold, the band, the gate rows).
**M1 THE SPREAD fired at her pivot-back and LANDED @ `5450046`
(2026-08-24):** the kind-mixed slate under THE DIVERSITY CAP; K1 THE
ERRAND (per-posting veil flavor as ruled — the default omen face whispers
an aging, revealing omen and lifts nothing; entry is the deed) and K3 THE
CULL (the writ grammar remote: marks post at arrival AFTER the
zone-memory swap, remainder-only and self-healing; claims credit the
POSTING at the kill chokepoint; THE MIXED-LANE GUARD keeps cull targets
off writ-objective/harborhold ground); THE PAY LANES rolled at the arm
off the target's level — essence · Rough pouches · the gem face (a TRUE
Memory from the account's own pool, THE MINT LAW stamped at pay) · the
gear lot · the unique lane split named/category (her amendment), all
minted owed at the turn-in with the never-silent essence fallback; and
`audit bounties` (the dial-review instrument) joins the harness. Probe
grown to 56 checks (rigs G/H/I + kind-aware B–D); every gate green; the
live slate deals all three kinds with precise pay faces ("the unique:
The Miser's Loop" · "the skill Memory: Chain Lightning" · "2 rare-grade
amulet pieces"). Audit's first observation for her walks: no
weapon/offhand unique stands in reach at low-mid levels, so the category
face honestly never offers them there. **M2 THE ANSWER fired at her
"continue" and LANDED (2026-08-26):** `registerBountySource` +
`BOUNTY_SOURCES` (data/bountyboard.ts — the registerPackageAsk sibling,
rows sorted for import-order independence) with the four live lanes
registered from their OWN modules under the compounding law (zero board
edits): the worldboss DECREE (defs/worldboss.ts — serpents with a standing
fight seat, apparitions herald-or-present, enthroned lairs; resolution =
the kill row's own `worldboss_slain_<def>` stamp), the fracture
(overlays/fractures.ts — `fractures_sealed`), the revealed hunt
(overlays/hunt.ts — an unfound trail never posts; `hunt_beasts_slain`),
and the harborhold MUSTER (data/harborholds.ts — found besieged anchors
only; resolved = the hold's own `state === 'open'`, the fall = a true
FAIL read that resolves at the board with no pay and never annuls). K4
THE ANSWER joins the kind registry: the roll draws from the census (no
seat search — the world already placed these asks) under its own wider
band, the posting carries the claim (source + key + frozen copy + the
at-arm ledger baseline — the arm baseline IS the at-accept baseline by
construction, since the reconcile strikes any offer whose ask dies before
it is taken), THE DELTA LAW reads done, and the card re-reads the live
census so a diverted fracture's ask follows it. THE FIELD WATCH
(`watchBountyHands`, a 2s cadence on the board's own update) grows the
annul reconcile to full honesty: a K4 hand flips ready ANYWHERE the
moment its predicate turns (no zone hook fires for a world event), the
world's own annul frees the hand IN THE FIELD with its courtesy, and an
open slate's dead offers leave at the panel's next repaint. The
sanitizer's answer branch drops a claim whose source left the registry
(the kinds' own law). Probe grown to 71 checks (rigs J — a
probe-registered source driving the REAL arm/accept/delta/watch/annul/
strike loop — and K — the four lanes + the muster's full state walk +
the answer sanitizer); every gate green (check clean, probe lane
157/157, smoke baseline unmoved). **M3 THE SUMMONS fired at her word and
LANDED (2026-08-26):** the ignite verb promoted into the source rows as
THE SUMMONS FACE (`BountySourceRow.summons` — name/ask/ledger/headroom/
fit/ignite; M2's empty top-level hook subsumed), fractures-first per her
roster ruling (overlays/fractures.ts: `ignite` delegates to devIgnite —
one verb, two callers — `fit` is the same eventTargetable every ambient
ignition obeys, and `headroom` reads the field's one-at-a-time breath
AND the manifest's own enablement: a disabled package still constructs
its field, and the board must never summon what the run does not carry —
the sim's quiet-expedition law rides the same read, a REAL honesty bug
caught by the diagnosis). K5 joins the kinds: the roll draws a
summonable source under `summons.cap` (per source, across slate +
hands), THE WORLD ACT fires at the accept through the new generic
`BountyKindRow.accept` hook (a refusal strikes with its courtesy — the
stale-offer race law), the BORN instance's census key is captured and
the resolution ledger baselines AT the accept (only seals the summons
caused count), the K4 annul law then applies verbatim, and a room-filled
OFFER strikes at the reconcile. The starter band's kinds pin summons at
0 — young boards never summon. **M4's POLISH HALF landed the same
commit:** THE GROWTH RUNGS derived from `BOUNTY_BOARD_CFG.growth` (the
broader-wares doctrine — Broader Postings +1 offer/rung, Farther
Postings ×1.35 reach/rung; rung 1 of each deed-gated on `bounty_done`,
later rungs chained; the band's small slate outranks BROADER by law),
the arm's STRUCTURAL AVAILABILITY read (`BountyKindRow.available` — an
empty census or bare summonable roster leaves the DRAW instead of
wasting the seat), THE CHEVRON PATRON (charter §8: `bountyAttention` —
a held gather's unspent nodes point in the board's accent through the
standing attention fold; culls keep the writ ☠ by law, events and
objectives ride their own fabrics' pointers; glyph a DIAL), and the
copy sweep satisfied by inspection (every card face was written and
walked in the precision register across M0–M3). `audit bounties` prints
the summonable roster + every band. Probe grown to 145 checks (rigs O —
the full K5 law loop on a probe source — O2 — THE FRACTURE DEBUT: a
fractures-enabled world deals the summons, the accept tears the earth
open at the posted zone through the promoted verb, census + fractureIn
agree, the seal resolves, the board pays — and P — the growth rows/
folds, the young law outranking BROADER, the chevron patron; a diagnosed
observation recorded: a level-1 hero's band admits only the first few
halo zones, so the young country's full board honestly deals 3–4 — the
level band, not a defect). Every gate green (check clean, probe lane
158/158, smoke baseline unmoved). **The numbered movements M0–M4 are
COMPLETE.** Remaining beyond them: THE COMPONENT (card 7's fork — its
own charter + minigame, at her commission) and THE KINSHIP (walk-1 card
10, ruled WANTED) — the kinship's concrete shape holds real opens
(WHICH residences seat regional boards — the harborhold quay's service
ladder is the natural first, at what prosperity rung; whether regional
slates lean local ground; the per-board cap fold's dial) and awaits her
word on those before it builds.

---

## 13. OPEN DIALS (build-time levers — no rulings pending)

`beatSec` (900) · offer count (**5**, her walk-1 number — one dial,
re-tuned at walks) + per-rung growth · kind weights + the diversity
guarantee · the errand's deed-lift face share · per-kind `SeatTuning`
envelopes (errand range/veil weights, charge bands, cull K counts) · the
pay magnitude fold (per-kind toll, distance bands, level scaling) ·
unique lane weights (named vs category, and the category table) ·
lot/memory lane weights · board gate rows + cost + growth-rung costs ·
dwell radius/seconds · the panel accent + chevron glyph · summons cap +
per-source headroom floor · annul + fail courtesy strings · the cull's
writ count band · omen whisper/reveal/widen numbers ·
`QUEST_CATEGORY_CAPS.bounty` (=1, her law, folded per board — §2's
unhardcoded shape).
