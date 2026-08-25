# THE GROWING TOWN — design charter v1 (Lastlight as a ladder)

**Status: DESIGN + T0 LANDED.** Commissioned 2026-08-24 off her M0 walk
report — the Font/board overlap, the south-entry campfire trap, and her
ask: *"dynamic size scaling of Lastlight as vault unlocks occur, adjusting
locations and literally, physically expanding the town zone as more
functionality becomes unlocked."* Her named stations: the caravanner, the
training dummies, the bestiary, the salvage station, the runic station,
the font, the vendoring, and the bounty board. T0 (the immediate fixes)
LANDED @ `fb732ca`; T1 awaits her word on the cards. Anything marked
**DIAL** is a build-time lever; every number is unblessed.

> **THE LEAD FINDINGS.**
>
> 1. **Half the machinery exists.** `expandedTown` (data/townBuild.ts)
>    already folds per-feature fixtures into the per-run town def and
>    carries a `grow` field — but the growth is BINARY: 1400×1000 jumps to
>    1700×1200 the moment ANY grow-carrying station is owned, and never
>    again. Sites are fixed shared consts, which encodes the law any
>    dynamic system must preserve: **one truth per site** — the fixture,
>    the `near*` dwell check, and the NPC spawn all read the same const,
>    so drawn == dwelt by construction.
> 2. **The collisions were the CENTRE FORMULAS, not the sites.** The
>    waypoint seats at `(w/2−90, h/2−40)` and the Font seated at
>    `(w/2+90, h/2−40)` — DERIVED from arena size, so they slide when the
>    town grows and squat the central green: in the base town the Font
>    landed nineteen pixels off the bounty board; in the grown town the
>    waypoint stands 104px from the board — inside its dwell disc. T0
>    retired the Font's formula into a real `FONT_SITE`; the waypoint's
>    formula still walks (exhibit A for the plaza fold, card 4).
> 3. **THE ARRIVAL LATCH is standing law now (T0).** No station's dwell
>    may fire until its disc has been observed EMPTY once since the zone
>    loaded — spatial truth, not an entry hook, so portals, waypoint
>    arrivals, resumes, and sail landings are covered by construction.
>    The campfire's reset-the-wilds trap (her report: a south re-entry
>    parked on the fire) cannot recur from ANY entry, at any future
>    layout. Woven through campfire, salvage, font, board, oracle,
>    tracker, caravan.
> 4. **The census: the town is genuinely full.** Eleven stations
>    (quartermaster's house, training yard + its eastward rack and
>    gauntlet line, campfire, caravan, salvage bench, tracker's camp,
>    oracle stones, recruiter's table, bounty board, Font, waypoint) over
>    six base fixtures in at most 1700×1200 — her instinct is right: the
>    ground itself must grow.

---

## 0. Her commission (2026-08-24 — the asks, encoded as direction)

| # | ask |
|---|---|
| 1 | **Keep the bounty board where it stands; move the Sacrificial Font.** (LANDED — T0.) |
| 2 | **The campfire entry trap** — a south re-entry lands on the fire and an idle player's dwell RESETS THE ZONES. (Closed structurally — T0's arrival latch.) |
| 3 | **Dynamic size scaling of Lastlight as Vault unlocks occur** — locations adjusting, the town zone physically expanding as functionality unlocks: caravanner, training dummies, bestiary, salvage, runic station, font, vendoring, the bounty board. |

---

## 1. THE PROPOSAL — the town as a TIERED CHARTER

Not continuous packing, not a solver: a small ladder of hand-authored town
STAGES, derived deterministically from the account.

- **THE SIZE LADDER.** Town size derives from the COUNT of owned
  town-station features — `TOWN_TIERS` rows in townBuild.ts, e.g.
  `[{stations: 0, w: 1400, h: 1000}, {stations: 3, w: 1700, h: 1200},
  {stations: 6, w: 2000, h: 1400}]` (**DIALs**; monotone by construction).
  Count-based, not feature-specific: no ordering dependence, and every
  unlock visibly pushes the town toward its next stage. The per-row binary
  `grow` retires into the ladder.
- **THE SITE TABLES.** Every station's seat becomes per-tier data —
  `TownSiteDef { id; tiers: {x,y}[] }` — read through ONE resolver
  (`townTier(account)` + `townSiteOf(account, id)`) that feeds everything
  the shared consts feed today: `expandedTown`'s fixtures, the `near*`
  dwell checks, the NPC/dummy spawns, the renderer hints. One truth per
  site per tier — the standing law, preserved by construction. (The
  training yard's rack + gauntlet ride their anchor as offsets, as today.)
- **THE QUARTER LAW** (muscle memory). A station keeps its QUARTER across
  tiers — a site may slide OUTWARD along its own compass as the town
  grows, never cross town. The salvage bench is always north-west of
  centre; the caravan always east. The player's mental map survives every
  unlock even as the ground stretches.
- **THE APRON LAW.** No station's dwell disc may contain any entry apron,
  portal seat, or the waypoint — encoded as a VALIDATION invariant over
  the site tables × tiers × entry sides, probe-pinned, so the campfire
  bug's whole class can never re-enter by authoring. (The arrival latch
  remains the runtime backstop beneath it.)
- **THE PLAZA FOLD.** The waypoint's centre formula retires into the site
  tables like the Font's did — the central green becomes AUTHORED civic
  ground per tier: the waypoint (arrival), the bounty board (the work),
  clear walking room between. Nothing else claims the centre.
- **THE LOOK** (T2, her gauge). Growth should READ: larger tiers may add
  dressing rows — lantern lines along the roads, fence spurs, greens —
  authored per tier. Optional polish behind her walk.
- **Migrations: none owed.** The town re-lays from the def at every load;
  the def derives from the KEEPER's account (already the co-op law).

---

## 2. STANDING BY CONSTRUCTION

The one-truth site law (kept, generalized) · the arrival latch (T0,
beneath everything) · `expandedTown`'s clone-replace idiom (the resolver
slots into it; the static ZONES row is never mutated) · the seeded town
layout (`seed: 1187` — "the town keeps its shape; it's home") · every
station's own dwell verb and radius.

---

## 3. THE PITFALL LEDGER

1. **The centre formulas** — any seat derived from arena size walks when
   the town grows (the Font's nineteen-pixel collision was born exactly
   there). The tables kill the class: every seat is authored per tier.
2. **Split truths** — a site read from a const in one place and a table
   in another lies to the dwell check. The resolver must be THE read;
   the bare consts retire or become tier-0 aliases.
3. **Tier flicker** — an account hovering at a threshold must not see
   the town re-lay between visits mid-run; the tier reads ONCE at World
   construction (as `expandedTown` does today), never live.
4. **South-edge stations** — the campfire and oracle sit on the grown
   town's south rim, where south portals land; the apron-law probe must
   walk every tier × every possible entry side, not just today's east.
5. **The waypoint's sanctity** — moving home's ring per tier touches the
   deepest muscle memory in the game; card 4 wants her word before any
   table moves it.

---

## 4. DECISION CARDS (her word wanted)

1. **THE LADDER SHAPE.** Count-based tiers (recommended: legible, no
   ordering dependence) vs feature-specific triggers vs continuous
   per-station scaling.
2. **THE TIER COUNT + SIZES.** Three tiers proposed (hamlet 1400×1000 →
   village 1700×1200 → township 2000×1400) — the numbers are **DIALs**,
   the SHAPE (three stages) wants her word once.
3. **RELOCATION POLICY.** THE QUARTER LAW (recommended: slide outward
   along the compass, never cross town) vs fully fixed sites (simplest;
   but south-rim stations stay near aprons forever) vs free re-layout
   per tier (max flexibility, muscle memory pays).
4. **THE WAYPOINT.** May home's ring move per tier into the plaza tables
   (recommended — the centre becomes authored civic ground) — or is the
   waypoint sacred where it stands, with the plaza authored around it?
5. **THE CAMPFIRE'S VERB.** Beyond the latch: should a zone-RESETTING
   station stay a pure dwell at all, or grow a consent press (the
   harvest fabric's 'press' vs 'dwell' axis exists)? Recommended: keep
   dwell + latch now; open the press only if walks still find accidents.
6. **THE LOOK PASS** (T2). Whether growth earns per-tier dressing rows —
   her gauge decides at T1's walk.

---

## 5. BUILD MOVEMENTS

- **T0 — THE FIXES.** LANDED @ `fb732ca`: the Font's real `FONT_SITE`
  (east green, ≥180 clear of everything in both sizes, live-verified 361
  from the board) + THE ARRIVAL LATCH on all seven station dwells
  (live-verified: parked inside a disc off a fresh load fires nothing;
  step out once and it serves).
- **T1 — THE TIERED CHARTER.** `TOWN_TIERS` + the site tables + the
  `townSiteOf` resolver swapped in at every read + the plaza fold (per
  card 4) + the apron-law validation probe + roster row. Effort M.
- **T2 — THE LOOK.** Per-tier dressing rows; her gauge walk. Effort S–M.

**The commissioning ledger:** T0 landed with this charter (2026-08-24).
T1 fires at her word on cards 1–4.
