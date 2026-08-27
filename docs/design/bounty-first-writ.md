# THE FIRST WRIT — side charter to the Bounty Board (the board as the account's first door)

A side commission to `docs/design/bounty-board.md` (her word, 2026-08-26,
"fairly important — first, before M3"): restructure the board's UNLOCK into
the account's very first Vault purchase at **zero Mortal Essence**, teach it
with two lessons in the Mireille idiom (one at the first death's Vault, one
at the first dwell at the board), and grow the slate a **banded lever
surface** so the young board deals small, essence-paying, aimed work — the
first farmable account activity, feeding directly into the core loop.

This charter moves NOTHING in M2's census/answer machinery; it reshapes the
door, the teaching, and the young slate's composition. M3 THE SUMMONS stays
parked behind it at her word.

---

## 0. Her commission (2026-08-26 — the asks, encoded as direction)

1. **The board is the very first unlock**, and it costs **0 Mortal
   Essence**. The old gates (any quest seen through / level 10, teased)
   come OFF — the row stands available from the account's first Vault
   visit.
2. **The first death teaches the Vault through the board.** The run's
   epilogue already leads "STRAIGHT into the reckoning (the Vault as the
   run's closing prompt)" — main.ts's own comment. On that first visit we
   guide the player to select the 0-cost board row "in the same manner as
   the Mireille tutorial," whether or not they carry any minted essence
   ("may or may not be their first and only unlockable").
3. **Next run, the board stands in Lastlight** (already true by
   construction — `expandedTown` folds the fixture off the owned feature,
   M0), and **the first dwell teaches the board**: a guided walk through
   reading the slate and ACCEPTING a posting.
4. **A plethora of tweaks and levers** for the young board: before the
   player clears the Crossroads, the slate deals only **one to three**
   postings ("no reason to give ten quests that all… end up approximately
   identical"), and those postings pay **exclusively essence** — the
   farmable account-progression faucet that also funds the player's start
   at Brandt (through the standing Trade Gate ladder, see §1).
5. **Possibly further** ("we may even want to go as far as"): the first
   postings per run aim AT the Crossroads itself — clear it, kill marked
   quarry in it, or harvest a node in it — a straightforward first deed
   that flows into exploration with the account fed either way.

**The timeline, stated precisely** (the prologue is a SCENE, not a run —
the covenant fells, never kills): prologue (Ghorvane) → wake in the Waking
House → Mireille's gift lesson (flasks/inventory) → the first REAL run →
the first real death → the epilogue's Vault, where THE DEATH LESSON fires →
the board bought free → run two mints the board in town, where THE BOARD
LESSON fires on the first dwell → the starter band deals the first writ.

---

## 1. THE OPEN DOOR — the unlock restructured

`meta/unlocks.ts` `feat_bounty_board` today: cost 120, `tease: true`,
`reqAnyOf` [any quest | level 10]. The restructure, all data:

- **cost: 0** — the row's buy face reads as a claim, not a purchase
  (copy: the Vault's standard face at 0 shows no price barrier; exact
  wording at the look pass).
- **Gates OFF** — `reqAnyOf` and `tease` removed; the row is visible and
  claimable on the account's first Vault visit. (The tease's teaching job
  is superseded by THE DEATH LESSON, which is stronger.)
- **THE HEAD SEAT** — the row moves to the head of the catalog's
  town-additions region so the young store's one flat wall
  (`availableUnlocks` → the `_flat` young-store face) opens with it
  first. The board becomes rung ZERO of the town chain — the faucet that
  funds the Salvage Station, which opens Brandt's counter (THE TRADE
  GATE, `VENDOR_CFG.trade`), which the board's essence pay then feeds
  mid-run. The whole gatework ladder now starts at a free door.
- **No migration needed**: accounts past the old gates simply see the row
  free; accounts already owning it see nothing change (`featureEnabled`
  untouched). Probes/sim arm the feature via `features.add` — headless
  behavior is byte-identical.

**Recorded interaction:** `catalogLevelMilestones` derives level signals
from catalog gates — dropping the level-10 avenue removes that row's ask
from the derivation (harmless: other rows asking level 10 keep the signal
alive; verify at build, note in the movement).

---

## 2. THE DEATH LESSON — the Vault taught through the board

The Mireille idiom, ported to the account screen (`MireilleLessonStep`'s
laws — world.ts ~1951): **live pending reads, never latches; glows keyed
off the lesson state; completion is a ledger fact; graduated accounts skip
by construction.**

- **The live read**: the lesson is LIVE exactly while
  `!featureEnabled(account, FEATURE.BOUNTY_BOARD)` — ownership IS the
  completion fact. No new stamp for the state itself; the flag the
  purchase sets is the graduation. (The Mireille law verbatim: completion
  is a ledger fact — here the feature flag.)
- **The surface**: on the Vault (reckoning) screen while the lesson is
  live, the board's row wears the gift-flask GLOW (the
  `mireilleLessonSkills` bag-tile idiom, DOM-side in the vault render)
  and a direction line in the precision register points at it. The talk
  copy shows in full on the first armed visit and quiets to the glow
  afterwards, gated by a one-time account stamp
  (`bounty_lesson_prompted`) — persistent teaching, no nagging.
- **Account-pure by construction**: the reckoning screen outlives the
  world (the run is torn down before it opens), so every read the lesson
  makes is `account`-grain only. Couch: one account, one harvest — the
  lesson speaks once. Remote co-op guests run their own accounts and
  meet their own lesson on their own machines.
- **Copy honesty**: the line must not assume other affordables exist
  ("may or may not be their first and only unlockable") and must say
  what the board IS in one breath — work, printed pay, a reason to walk
  back out.

---

## 3. THE BOARD LESSON — the first dwell taught

Run two: the board stands (M0's residence). The first dwell opens the
postings panel through the standing gate (THE ARRIVAL LATCH already
guarantees the open is a deliberate act, never an arrival accident) — and
while the lesson is live, the panel walks the accept:

- **The live read**: the lesson is LIVE exactly while the account has
  never accepted a bounty — `(run OR account ledger)
  bounties_accepted === 0`. The accept already stamps
  `bounties_accepted` (M0) and merges up on any meta-progressing
  conclusion, so **the first accept closes the lesson forever, on the
  standing ledger, with no new key**.
- **The surface**: the panel's cards wear the glow + a direction line
  ("take ONE in hand — the pay is printed on the card"); after the
  accept, one closing line points the way out ("meet the ask, then
  return here to collect"). The journal's 'bounty' badge and the map "?"
  marker arrive free (M0) and the lesson's last line names them.
- **THE COUCH LENS**: the panel already docks to its opener — the lesson
  speaks to the opener seat; the account-grain read keeps it one lesson
  per account, not per seat.
- **Voice**: the board speaks for itself, in the precision register (see
  card 4) — no new NPC machinery, no speech bubbles; the lesson is
  direction lines + glows on the panel's own DOM, the gift lesson's
  exact surface grammar.

---

## 4. THE STARTER BAND — the slate's lever surface

Her "plethora of tweaks and levers," built the repo's way: **bands as
data over the arm**. A band row is a predicate plus overrides; the arm
resolves the FIRST live band and folds its overrides over
`BOUNTY_BOARD_CFG`'s standing dials; no band live = the standing config
(today's board, byte-identical).

```
BountyBandRow {
  id;                          // 'starter'
  while(world): boolean;       // the live predicate — a pure read
  offers?: number;             // slate size override (starter: 1–3, DIAL)
  kinds?: Record<string, number>;   // kind-weight overrides (0 = off)
  lanes?: Partial<lane weights>;    // pay-lane overrides (starter: essence 1, rest 0)
  target?: string;             // pin every roll's seat to ONE zone (card 2)
}
```

- **THE STARTER BAND (the debut row)**: `while` = the Crossroads
  objective uncleared THIS RUN (`!world.objectiveDoneAt('crossroads')` —
  card 1 rules the predicate), `offers` 2 (**DIAL**, her one-to-three),
  `lanes` essence-only, `kinds`/`target` per card 2. The band EXPIRES
  the moment the Crossroads clears — if the first writ IS "clear the
  Crossroads," completing the tutorial writ is what opens the full
  board: **the handoff is structural, not scripted.**
- **The pay stays the standing fold** (`bountyChargePay` off the target's
  level — Crossroads at level 1 pays the coarse tint); magnitude is
  already a DIAL (`pay.base`/`perLevel`) and her walks retune it. The
  essence-only lane means no gem-face mints in the band — the Standing
  Order's food (THE MINT LAW) simply doesn't flow from starter writs,
  which is honest: the young account has no gem index yet.
- **Honest refusal stands**: a band face that cannot roll (the Crossroads
  lacking a pack table for the cull, a node-less zone for the gather)
  returns null and the slate runs short — never a hollow card (M0's
  standing law).
- **THE FOREORDAINED ARM is untouched**: bands fold BEFORE the seeded
  draw; same seed + same beat + same world truth = the same small slate.
  The beat, the standing slate, the one-hand law, the turn-in, the
  shared stamps, M2's census/watch — all byte-untouched by the band
  fold.
- **`audit bounties` grows a band lane**: print each band's predicate
  state, effective slate size, live lane weights — the dial-review
  instrument for exactly these levers.

---

## 5. THE GATHER — the harvest ask as a posting kind (card 3)

Her third face ("or perhaps even harvest a node"). The honest shape is a
REAL kind, not a starter hack: K6 `gather` — "bring in the land's yield."
Target: a zone whose tileset stands harvest nodes (`HARVEST_NODES`
biome/tileset fit — the fabric's own placement read); done: N nodes
harvested IN the target zone, credited on the posting (the cull's
claim-ledger pattern: `gather: { count, claimed }`). The harvest engine
has **no completion ledger today** — the kind needs one small credit
chokepoint at the node-completion site (the cull's kill-chokepoint
precedent: posting-credited, readable anywhere, wipe-proof, remainder
honest). Starter face: `target` pinned per card 2; full-slate face: an
ordinary kind row at its own weight (**DIAL**), joining the mixed slate —
gather asks are classic board content and the harvest fabric gains its
first directed consumer.

---

## 6. STANDING BY CONSTRUCTION — what this charter does not move

- The beat law, the foreordained arm, the standing slate, the persisted
  save shape (`WorldStateSave.bountyBoard`), THE ONE-HAND law, the
  turn-in cycle, the fail lane, the shared-stamp law: untouched.
- M2's source registry, censuses, the delta law, THE FIELD WATCH:
  untouched. (The starter band simply weights K4 to 0 while live — a
  young slate never decrees.)
- The residence, the dwell, THE ARRIVAL LATCH, the panel plumbing, co-op
  intent routing: untouched; the lessons are read-only surfaces over
  standing state.
- The Mireille gift lesson itself: untouched — this charter COPIES its
  laws, never edits its rows.
- The prologue scene, the covenant, the reckoning mint, the Fallen
  shelf: untouched. The death lesson reads the account at a screen that
  already exists.
- The theater boundary (bounties are announced, arced, paid) stands.

---

## 7. THE PITFALL LEDGER (each with its receipt)

1. **★STARTER-BAND-RESHAPES-PROBE-SLATES.** Probe worlds walk
   `loadZone('crossroads')` without clearing it — the moment the starter
   band lands, every existing rig's arm deals the BAND's slate (2
   essence-only cards), not five mixed. Receipt: the W1 movement updates
   `probe_bountyboard` in the same commit — rigs that need the full
   grammar stamp `completedObjectives.add('crossroads')` in their world
   builder; a new rig pins the band itself (small slate, essence-only,
   expiry on the clear). The roster row moves nowhere.
2. **The dev/QA account already owns the board** (her walk account took
   the flag free at M0). Receipt: both lessons read ownership/ledger
   facts, so graduated accounts skip by construction — nothing to
   special-case; state it in the probe.
3. **The epilogue fires for EVERY conclusion** (death, fall, forfeit,
   retirement) — her words say "first death," but the lesson's live read
   is ownership, not cause-of-death, so any first Vault visit teaches.
   Recorded as intended (the door is the lesson, not the dying).
4. **A resumed run mid-band**: `completedObjectives` persists in the run
   save, so the band predicate survives resume honestly. Receipt: probe
   pin.
5. **The catalog head seat vs. authored order**: the young wall renders
   catalog order — moving the row is an AUTHORED reorder in unlocks.ts,
   not a sort hack; nothing else keys on array position (verify at
   build: no `reqOwned` chains off `feat_bounty_board` today).
6. **Essence-only band + the never-silent fallback**: `rollBountyPay`'s
   ladder already falls back to essence — the band override sets the
   weights, the fallback law stays the same road, no new lane code.
7. **The cull in a small zone**: Crossroads' pack table must stand for
   the cull face to roll; if it cannot, the roll refuses and the slate
   runs short — never pad with a hollow card. (Verify the table at
   build; if bare, the starter deals charge-only until the gather
   lands.)
8. **Couch + remote clients**: the Vault lesson is account-local; the
   board lesson is opener-seat + account-grain; net clients read the
   keeper's snapshot for the panel but their accounts never own the
   lesson state — the host's panel is where the lesson lives (the
   standing keeper's-gate posture).

---

## 8. DECISION CARDS (her word wanted)

- **Card 1 — THE BAND'S PREDICATE.** When is the starter band live?
  (a) **Per run, while the Crossroads stands uncleared** — her sentence
  read literally; every run opens with the small essence slate as a
  run-start ritual, and the band expires the moment the Crossroads
  falls. Veterans meet a 2-card board for the minutes it takes to clear
  the first field. **(Recommended — simple, structural, her words.)**
  (b) Account-young only: the band lives while account
  `bounty_done < N` (N a DIAL) — veterans never see the small slate.
  (c) Both ANDed: young accounts get the ritual, graduated accounts get
  the full board from the first beat.
- **Card 2 — THE AIMED FIRST WRIT.** Does the starter band pin its
  targets to the Crossroads? (a) **Yes — `target: 'crossroads'`**: the
  slate deals "clear the Crossroads" (charge) and "put down N marked in
  the Crossroads" (cull; the gather joins per card 3) — the first writ
  is the first field, and completing the charge IS the band's expiry:
  the tutorial hands off to the full board by construction.
  **(Recommended.)** (b) No pin: the band deals normal near-ground
  targets, just fewer and essence-paying — more variety, less aim.
  (c) One pinned anchor + the remainder near-ground.
- **Card 3 — THE GATHER KIND.** (a) **Build K6 in this commission as its
  own movement** (harvest credit hook + the kind; starter face pinned,
  full-slate citizen at low weight). **(Recommended — small, real, the
  harvest fabric's first directed consumer.)** (b) Starter-only face,
  no full-slate row yet. (c) Defer whole — starter ships charge+cull.
- **Card 4 — THE LESSON'S VOICE.** (a) **The board speaks for itself** —
  direction lines + glows in the precision register on the Vault row
  and the panel, the gift lesson's surface grammar, no speaker.
  **(Recommended.)** (b) Mireille's voice carries over (a line from her
  at the death screen pointing to the board). (c) Brandt fronts it.

---

## 9. BUILD MOVEMENTS (each awaits her go)

- **W0 — THE OPEN DOOR + THE LESSONS** (gauge-first: her in-browser walk
  of both lessons closes it). The catalog restructure (§1) + the death
  lesson (§2) + the board lesson (§3). Probe rows for the row's shape +
  the lessons' live reads; the look is hers. Effort S–M.
- **W1 — THE STARTER BAND.** The band vocabulary + the starter row per
  cards 1–2 + the audit's band lane + the probe reshape (pitfall 1).
  Effort M.
- **W2 — THE GATHER** (per card 3). The harvest credit chokepoint + K6 +
  its faces + probe. Effort M.

Order: W0 → W1 (→ W2). W0 stands alone; W1's band reads nothing from the
lessons; W2 slots behind W1's pinning lever. M3 THE SUMMONS stays parked
behind this side piece at her word.

**The commissioning ledger:** charter drafted 2026-08-26 at her
commission; cards 1–4 open — the walk rules them, movements fire at her
go. Walk artifact (mirror):
https://claude.ai/code/artifact/f83d84c5-4a6d-4716-9b64-9d4e1ff03626

---

## 10. OPEN DIALS (build-time levers — no rulings pending)

Starter `offers` (**2**, her one-to-three) · the band's kind weights
(charge/cull split; K4/errand at 0 while banded) · the starter cull count
(the standing ×[3,5] may read large for the Crossroads — a band override
slot) · the gather's N + node kinds + full-slate weight · the pay
magnitude under the band (the standing fold; her walks) · the lesson
copy strings (the precision clause) · the glow accent (the board's amber
= `QUEST_CATEGORY_COLORS.bounty`, one truth) · the prompted-once stamp
key name.
