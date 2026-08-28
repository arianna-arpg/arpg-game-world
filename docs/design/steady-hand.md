# THE STEADY HAND — the trace fabric + the smith's writ (card 7's fork, chartered)

The bounty board's reserved R5 lane, reborn as her true intent
(2026-08-26): not a crafting COMPONENT but actual CRAFTING — the board
pays a CREDIT ("craft a piece of <item type>"), and the redemption is a
NEW MINIGAME: trace the item's outline with a steady hand, Operation's
law made a smithing act. The deviation band the hand must stay inside is
the craft's tier. The tracing mechanic is deliberately a GENERAL FABRIC
— "truly unlike anything we have currently implemented, but could be
leveraged extensively" — with crafting as the robust, incentivized
debut and runic skill-casting recorded as the second consumer.

DO NOT BUILD until the cards are ruled (walk-1's own fork ruling: "own
charter + a new minigame"; this charter is that commission).

---

## 0. Her commission (2026-08-26 — the asks, encoded as direction)

1. **The reward is a craft credit** — "Craft Piece of <Certain Item
   Type>": a bounty pay lane granting deterministic access to an item,
   redeemed at a crafting station "or just Brandt, given that he's a
   blacksmith."
2. **The redemption is a tracing minigame** — the Operation analogy,
   verbatim: holding the corresponding button IS drawing; the player
   must draw the shape/outline of the given item; deviating past the
   boundary is the shock. **The boundary's width is the tier/difficulty
   of the craft.**
3. **The mechanic is a fabric, not a one-off** — the same tracing could
   gate a powerful skill behind drawing its runic shape. Multiple uses;
   crafting first.

---

## 1. THE TRACE FABRIC (engine/trace.ts — the general mechanic)

One pure, steppable session any consumer can host:

```
TraceShape {                       // data/traceShapes.ts — authored, open
  id;                             // 'blade', 'helm', 'ring', 'rune_<x>'…
  points: [x,y][];                // the outline polyline, unit space
  closed?: boolean;               // a ring closes; a blade does not
}
TraceSpec {
  shape: TraceShape;
  band: number;                   // the tolerance HALF-WIDTH (unit space) — THE TIER'S DIAL
  slips?: number;                 // grace exits allowed (card 6)
}
TraceSession {
  feed(cursor: {x,y}, drawing: boolean, dt): void;   // pure stepped state
  read(): { progress: 0..1; accuracy: 0..1; slips; done; failed };
}
```

- **The hand**: hold the bind = ink flows at the cursor. Progress is the
  NEAREST-POINT advance along the outline, monotonic — the pen cannot
  skip ahead or bank unreached path. Deviation is distance from the
  outline; inside the band it accumulates against `accuracy`
  (band-normalized), outside it is a SLIP (card 6 rules the grammar).
- **The verdict is the consumer's food**: `{progress, accuracy, slips}`
  — the crafting consumer folds it into the mint (card 1); a future
  runic cast folds it into the skill. The fabric never knows what a
  trace is FOR (the puzzle-kinds law).
- **PURE BY CONSTRUCTION**: the session is a stepped function of fed
  cursor samples — a headless probe feeds synthetic paths (a perfect
  trace, a wobbling trace, a band-breaker) and asserts exact verdicts.
  No rng anywhere: the shape is KNOWN and visible — this is a test of
  the hand, not the memory, so the harvest rite's anti-memorize law
  deliberately does not apply.
- **The rite's inherited laws** (engine/harvest.ts precedents): THE
  PAUSE LAW (solo, the world holds — a 'trace' TimeHold surface;
  shared worlds never stop, the rite's own policy verbatim); THE INPUT
  LAW (the tracing seat's whole intent belongs to the trace — casts
  and movement swallowed at the artery; releasing the bind lifts the
  pen, never fires a skill); THE PROMPT SPEAKS THE LIVE BINDS ("hold
  {bind:…} and trace" resolves per device, per seat).
- **The devices**: mouse = the pointer is the pen. Pad = the left stick
  drives a stylus at `cursorSpeed` (a dial; card 5 rules whether the
  pad's band compensates). Couch guests trace on their own pad. The
  overlay (render/vis/traceLayer.ts) draws outline + band + laid ink +
  slip flashes — drawn == tested: the band you see is the band the
  session measures.

---

## 2. THE SMITH'S WRIT (the crafting consumer — the debut)

- **R5 REBORN**: `BountyPay.craft = { category, tier }` joins the pay
  lanes at its reserved weight (the visible price law prints "a smith's
  writ: <category>, tier N"). Rolled at the arm like every lane; tier
  derives from the target zone's level band (the pay fold's own
  grammar).
- **THE CREDIT** (card 3): proposed as a 1×1 bag ITEM — "Smith's Writ"
  carrying {category, tier} — the Memory-pouch precedent: visible,
  carried, spent at the counter, minted OWED at the turn-in.
- **THE REDEMPTION** (card 2 rules the choice grain): at BRANDT (her
  lean — the blacksmith; town ground, so the trace happens in calm by
  construction, no combat-pressure design needed for the debut). Dwell
  with a writ in the bag → the Forge face: pick the BASE within the
  writ's category and tier reach (her "deterministically obtain" — the
  player aims the exact base), then THE TRACE: the category's authored
  outline, the band at the tier's width. The mint lands through the
  standing roller (`rollItem` with the chosen base + the verdict's
  fold) — no new item machinery, only a new door to it.
- **THE VERDICT FOLD** (card 1): proposed — the item ALWAYS mints (the
  credit is honored; a bounty already paid for it), and the trace's
  accuracy folds the QUALITY: rarity weights and affix rolls scale
  with the hand (the harvest fabric's accuracy-scales-the-pour
  precedent, made gear). A shaking hand forges a plain piece; a
  steady one forges a fine one. Uniques stay off the bench (R2's lane
  is theirs); crafting mints rolled gear.
- **THE OUTLINE LIBRARY** (data/traceShapes.ts): one authored polyline
  per category — blade, axe, bow, helm, dome, chest, ring, amulet,
  belt, boot, glove, offhand (~11 shapes, unit space, reused by every
  future consumer). Tier may add detail per card 4.
- **THE OWED LAW**: redemption is bounty-earned pay, not a purchase —
  Brandt forges a writ regardless of the Trade Gate's state (browsing
  and buying stay gated; honoring a debt does not).

---

## 3. THE RUNIC FUTURE (recorded, not built)

The fabric's second consumer, hers to commission later: a powerful
skill gated behind tracing its RUNE — `SkillDef.trace` naming a shape +
band, the cast firing on the verdict. The combat-time design (does the
world hold solo? never in co-op — the timeflow interplay) is that
commission's own charter; THIS charter only guarantees the seam: the
session is consumer-blind, shapes are open data, and the verdict is a
plain struct any caller folds. Nothing here builds it.

---

## 4. STANDING BY CONSTRUCTION

- The bounty lanes: R5 slots into rollBountyPay / describeBountyPay /
  payBountyLanes exactly as the reserved-word law promised — a weight
  turned on, a lane row filled.
- The mint: `rollItem` with base + rarity-weight constraints is the
  standing roller; the fold shapes its inputs, never forks it.
- The TimeHold surface family, the input-capture artery, the live-bind
  prompt resolver: the harvest rite built all three; the trace is
  their second tenant.
- Brandt's dwell, the town's calm, the bag's 1×1 tile law, owed drops.

---

## 5. THE PITFALL LEDGER

1. **Pad parity**: stick-tracing is honestly harder than mouse-tracing.
   Card 5 rules whether the band compensates per device; whatever is
   ruled, the probe pins that BOTH devices' synthetic paths meet the
   same verdict math (the compensation is a spec dial, never a fork).
2. **Headless honesty**: the session must be pure over fed samples — a
   probe traces perfectly by walking the polyline itself, wobbles by a
   sine offset, breaks the band by a spike; verdicts are exact. Any
   frame-time dependence beyond fed dt is a bug.
3. **Atomic redemption**: an aborted/quit trace keeps the writ, mints
   nothing (no half-forged loss); the writ is consumed only at the
   verdict's mint.
4. **The town assumption**: the debut redeems on sanctuary ground —
   combat interruption design is deliberately out of scope until the
   runic commission.
5. **Co-op**: the trace never holds a shared world (the rite's law);
   the overlay is seat-local; a couch guest's trace captures only its
   own pad.

---

## 6. DECISION CARDS (her word wanted — the demo in the walk artifact
lets the band widths be FELT before ruling)

- **Card 1 — THE VERDICT FOLD.** (a) **Always-mint, accuracy folds
  quality** (rarity weights + affix rolls scale with the hand; floor =
  a plain magic piece). **(Recommended — the harvest's accuracy law,
  no feels-bad total loss.)** (b) Pass/fail: a failed trace keeps the
  writ, retry after a cooldown. (c) Hybrid: always-mint floor + a slip
  CAP that fails the trace outright at the highest tiers (the true
  Operation buzz, reserved for drama).
- **Card 2 — THE BASE CHOICE.** (a) **The player picks the base at the
  bench** within the writ's category + tier reach. **(Recommended —
  her "deterministically obtain," full agency.)** (b) The writ names
  the exact base at the board (determinism at deal time, none at the
  bench). (c) Tier narrows a band of bases; the player picks within.
- **Card 3 — THE CREDIT'S SHAPE.** (a) **A 1×1 bag item, "Smith's
  Writ"** (visible, carried, the pouch law). **(Recommended.)** (b) A
  run-ledger credit (invisible, no bag cost, panel-only). (c) An
  account credit (survives the run — likely too strong for bounty
  pay).
- **Card 4 — WHAT THE TIER DIALS.** (a) **Band width alone** (one
  lever, instantly legible — the demo's slider IS this card).
  **(Recommended.)** (b) Band + shape complexity (higher tiers trace
  more detailed outlines). (c) Band + a minimum draw speed (hesitation
  costs).
- **Card 5 — DEVICE PARITY.** (a) **Per-device band multipliers**
  (pad × ~1.3, a dial, unblessed). **(Recommended.)** (b) One true
  band for all hands (purist; pads simply have it harder).
- **Card 6 — THE SLIP GRAMMAR.** (a) **Slips drain accuracy only**
  (soft — pairs with card 1a). **(Recommended for the debut.)** (b) N
  slips then the trace fails. (c) Tier-scaled: soft at low tiers, the
  hard buzz at the top.
- **Card 7 — THE RUNIC SEAM.** (a) **Reserve the consumer seam now**
  (the session is already consumer-blind; one registry, zero cast
  code). **(Recommended.)** (b) Nothing reserved; design it whole
  later.

---

## 7. BUILD MOVEMENTS (each awaits her go; gauge-first by construction)

- **T0 — THE FABRIC + THE FEEL.** engine/trace.ts (the pure session) +
  data/traceShapes.ts (the first outlines) + the overlay + input
  capture + the TimeHold surface + probe (synthetic-path verdicts,
  device-math parity). **The gauge: her in-browser trace at Brandt's
  bench with dev-granted writs — the band dials land under her hand.**
  Effort M–L (a genuinely new input mode).
- **T1 — THE WRIT.** The R5 lane turned on (weights, the card face,
  the owed mint at turn-in), the writ item, Brandt's Forge face, the
  base choice, the verdict fold, probes. Effort M.
- **T2 — POLISH.** Per-device dials, tier detail variants (per card
  4's ruling), the slip drama (card 6c if ruled), copy sweep.
  Effort S.

The runic consumer is its own future commission (§3).

**The commissioning ledger:** charter drafted 2026-08-26 at her
commission (the fork's true shape revealed: crafting, not components);
cards 1–7 open — the walk rules them; the walk artifact carries a
PLAYABLE band demo so the widths are felt, not imagined.

### The walk (2026-08-26 — "I absolutely love that initial bench demo,
this is very close to what I had in mind"; all seven cards ruled)

- **Card 1 → (c) THE HYBRID** — her reasoning: it contains the others.
  The floor is (a) verbatim — always-mint, accuracy folds quality —
  and HIGH tiers add the slip cap that hard-fails ("technically a
  pass/fail at high tiers, with an always-mint floor"); a failed
  high-tier trace keeps the writ and retries after a cooldown. Which
  tier turns the cap on, the cap count, and the cooldown are DIALS.
- **Card 2 → (a) for now, with TWO recorded futures**: pick the base
  at the bench within the writ's category + tier reach (the reach
  clamp is the standing guard — a late base can never come off an
  early writ). Recorded, hers: (c) may become the truer shape once
  base availability itself refines by level; and (b) — the writ
  NAMING the exact base — is "an amazing use case" as a deliberate
  premium face (an advanced player forging a desired base early), a
  future pay variant, not launch.
- **Card 3 → (a) the 1×1 bag item**, starting there — torn against an
  invisible pouch-style credit (the essence-pouch vein); her ruling:
  "the 1×1 bag item would require more functionality, so let's start
  there and we can trim away if it feels worse."
- **Card 4 → (a) band width alone, leaning** — and her ask answered in
  the walk artifact: the demo grew a DETAIL selector (I silhouette /
  II working piece / III masterwork line — guard + pommel, visor,
  serrations, filigree) so (b) can be felt against (a) before the
  final word. The engine carries variants as plain shape data either
  way — the ruling moves no code.
- **Card 5 → (a), ruled at her delegation** ("I'll leave this one up
  to you"): the per-device band multiplier costs ONE multiply at the
  session's begin (the spec's band is premultiplied by the seat's
  device dial) — no meaningful complexity, so the honest option wins.
  Pad ×1.3, a DIAL, unblessed.
- **Card 6 → (a)** — slips drain accuracy; the high-tier cap arrives
  through card 1's hybrid, never as a separate grammar.
- **Card 7 → (a)** — the consumer seam reserved now; implementation
  focuses on the crafting consumer ("focus implementation on the
  particular crafting-oriented version for now").

**T0 + T1 fired on the walk's implementation language ("let's start
there") and LANDED (2026-08-26):** engine/trace.ts (the pure session —
byte-deterministic over fed samples, monotonic frontier, band-normalized
accuracy, soft slips, THE HYBRID's cap per card 1c, the device fold as
card 5's one multiply) + data/traceShapes.ts (nine authored category
outlines + the blade/shield held for the reserved weapon future) + the
'trace' TimeHold surface + the World forge host (traceFeed at the
applyInputs artery — the input law beside the rite's; forgeBegin/Cancel
host-routed with the calm law; the settle folds accuracy into
rarityWeights + an ilvl bonus and drops the piece OWED; a failed
high-tier trace RESTS the enduring writ) + the writ item (1×1
'smith_writ' base, payload on ItemInstance.writ, minted owed by the
craft pay lane) + Brandt's Forge face (pick the base, trace it; Esc
steps away) + the renderer's world-anchored overlay (drawn == tested:
the band drawn IS the band measured). Probe balance/probe_trace.ts (25
checks + roster row same commit); every gate green. TWO findings
recorded: **weapon and offhand are RESERVED categories** — no bases
exist anywhere in the game (the M1 audit's "no weapon uniques" was the
symptom) — so the writ gamut trues to the eight standing categories
(+legs) with a live-registry filter (never a hollow card), and the
blade/shield outlines wait ready; and ★CLOSED-SHAPE-DOUBLES-THE-TAIL —
an authored shape that already closes itself wearing closed:true minted
duplicate trailing path points the strict nearest-point tie-break could
never advance onto (the frontier stalled one short of done) —
buildTracePath now drops degenerate segments, absorbing the authoring
quirk. **Card 4's final word stays open on the demo's detail exhibit;
T2 polish at her go.**

---

## 8. OPEN DIALS (build-time levers — no rulings pending)

Band widths per tier · the pad's `cursorSpeed` + compensation mul ·
the accuracy→rarity fold curve · slip grace frames · the writ lane's
weight among the pay lanes · tier derivation from zone level · the
outline library's point density · overlay size/colors (the board's
amber vs the forge's own iron register — a look call) · the trace
bind (reuse the interact bind vs its own).
