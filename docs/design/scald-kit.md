# THE SCALD KIT — design charter v3 (the compounding law's third layer — K1 built, K2 chipped)

**Status: WALKED 2026-08-21 (the same day it was written) — cards 1–8
RATIFIED as recommended ("definitely in favor of your proposals... in
favor on your proposed decisions as well"), card 3 AMENDED by THE RUPTURE
LAW (§3.1), THE NEW-PIECES PREFERENCE added (§5); K1 is BUILT (2026-08-21
— the bank, the wet fold, the rupture, the vent + the vapor ride, the
pressure gauge, the vent-ride, the kit gains, wave 3 with eight new
painters, the geyser-step spike; unstaged, gates green); **K2 is BUILT**
(2026-08-21 — the seven player skills + five gems + four mineral vestiges
and two words, the wet rider / patient bank / vent press / steam trail /
departure splash / favored pulse seams, acquisition whole (THE GEM FLOOR +
the ledger's ANY-OF pool + the vendor rung, geyser_step's gate paid), K1's
display-name collision resolved, probe_scaldkit 171/171, 13 matrix slices
clean, all gates green; unstaged); card 7 (the Cloudherd audit) HELD at her
word — she believes the canon was already audited. K3 (the mode trees) is
deferred to the skill-modes waves. Every number in both movements remains
a DIAL, unblessed — see docs/engine/scaldkit.md's K2 "Open" list for the
ones most likely to want her eye.**
Opened 2026-08-21 at the
Scald Basin charter's seventh walk on her word: *"I'm also on board with
the player-kit graduation of the ability seeds, and we'll likely want to
tie ample new kit types and themes into the fauna lists for the scald to
give it a nice, distinct feel."* The parent is `docs/design/scald-basin.md`
(v8 — §9 ABILITY-THEME SEEDS, §8 the fauna roster, §10 THE SCORCH BAR);
this charter carries the seeds to FAMILIES, names what the fauna already
wear and what they could, routes acquisition, and puts every unruled
choice in DECISION CARDS (§7) for her walk. Anything marked **DIAL** is a
build-time lever; every number is unblessed. Her laws bind throughout:
THE COMPOUNDING LAW (terrain → kin → themes → player kit), THE
SHOW-DON'T-TELL LAW (state reads from drawn phenomena), and — ruled at
this walk — **THE NO-LOCK LAW** (§1). Build movements are §8; each awaits
her go.

---

## 1. THE NO-LOCK LAW (her ruling, 2026-08-21 — the round's first law)

Her words, near-verbatim: *"the kits should never actively lock behind
something (e.g., the cloud kit was tied to the Aetherial, but we don't
want the kit to be EXCLUSIVE to the zone, per se; it should always have
some sort of effect even while not directly within a zone, such that
something like the cloud kit ends up buffing a ground zone even outside of
the Aetherial)."*

The law, made precise for authoring:

- **EFFECT is never zone-locked.** Every kit piece has a real, baseline
  effect ANYWHERE; the country it came from is where it SHINES (the basin
  is wet and hot — the scald family bites hardest there — but a river,
  a rainstorm, a coastal shelf are wet too, and fire is everywhere).
- **ACQUISITION may be country-shaped.** "Found in the scald" is fine —
  floored drops, a ledger that opens a pool, a vendor rung — as long as
  what is found then works everywhere. The Glimmercraft precedent (the
  grove's `gleam_entered` ledger opening a pool) is an ACQUISITION gate,
  not an effect lock.
- **THE TEST, applied to every piece in §3**: *would this earn a bar slot
  in the grove or the desert?* If the honest answer is "only in the
  basin," the piece is effect-locked and must be re-shaped or cut.
- **Retrofit note (parked, her call — out of scald scope)**: the
  Cloudherd canon (`data/skills.ts` — cloudstep / cloudform / cloudcall /
  the cirrus fingerling…) should be AUDITED against this law; one of its
  own comments already claims a ground-zone stance ("over solid land the
  same cloud STANDS AS WEATHER"), so the audit may find it mostly
  compliant with a few pieces to open. HELD at her word (2026-08-21): "I
  believe that the cloudherd had already been audited, but we can hold
  onto that for now" — no chip.

---

## 2. Where the ladder already stands (the monster side is seeded)

The compounding law's middle layer shipped in M1/M2 — the themes are
already IN the fauna before any player piece exists, which is the right
order (players earn what the country first shows them):

| theme | already worn by | the engine seam it rides |
|---|---|---|
| SCALD (fire delivered through water) | `scalded` + `sulphur_sting` statuses (M2b/M1); the sulphur pools' sting; the runoff's grant; the kettleback's `scald_jet`; the burn rain | status family + region rows + the downstream lanes |
| STEAM (concealment) | scald_mist weather; the vent plume; the steam-wisp tide (M3, in flight) | fog/weather fabric, lite pool |
| PRESSURE (bank-and-vent) | the vents themselves; the kettleback's steam-filled shell gauge (tells fabric `fill`); THE GEYSERMAW's column slam (M3, in flight) | the pure clock; tells; storm delivery |
| GEYSER-STEP (ride the column) | the Ascent's sky-geyser launch (traversal fabric); the vent-shaman's step-off | traversal rise pose; dodge-AI on the broil |
| PRISM (mineral attunement) | the prism snail (`tune {}`); the terraces' prism pools; attunement-chord puzzles | attunement fabric; puzzle presets |
| THE SCORCH BAR | every scald heat source; the basker's enrage; THE WARM HATCH | the fill-polarity survival row |

Graduation = (a) the PLAYER side of each theme, and (b) **breadth on the
monster side** — her ask: "ample new kit types and themes into the fauna
lists." Both halves in §3; the fauna ties in §5.

---

## 3. THE FAMILIES (five; proposal-grade — the roster cut is card 1)

Each family: its mechanic TEXTURE · player pieces (skills / supports,
with the delivery grammar they seat on) · the NO-LOCK test · where it
shines · monster wearers (standing + wave-3 proposals).

### 3.1 SCALD — fire that wears water

- **Texture**: the `scalded` status family (exists) — a burn that
  AMPLIFIES on wet bodies (wading / swimming / rain-wet). It inverts the
  douse law on purpose: everywhere else water is refuge from fire; under
  scald, being wet is the vulnerability. The wet read already exists as
  stand states; the amplification is one application-time fold (DIAL:
  ×1.5 on wet — the number is the whole balance question).
- **THE RUPTURE LAW (her amendment at the walk)**: `scalded` carries a
  BANK — its magnitude accumulates with each application (the wet-fold
  scales the banking) — and a RUPTURE verb consumes a fraction of the
  bank as a burst of fire ("expunging it while dealing a nice chunk of
  damage"), so the status "converts into something to be managed
  deliberately": the afflicted watches the bank (decay, cleanse, stay
  dry, kill the rupturer), the attacker banks then spends. SCALD is a
  TWO-VERB family — BANK (Lash / Burst / Boiling Point) then RUPTURE
  (**Boil Over**: the player payoff verb, K2); monsters wear the rupture
  first by THE MIRROR LAW (the scald lancer's charged throw, K1). The
  engine effect is GENERIC (`rupture: { status, fraction }` on any banked
  status) so later families can spend their own banks. The bank must
  READ on the body — a blister/steam tint scaled by magnitude.
- **Player pieces**: **Scalding Lash** (melee cone / whip: fire + applies
  `scalded`; the wet fold makes it a shore-fighter's weapon) · **Kettle
  Burst** (a ground-target nova of boiling water — applies scald + a
  brief `wading`-equivalent wetness on the splash so follow-up scald
  bites; the self-enabling combo) · support **Boiling Point** (your fire
  damage applies `scalded` to WET targets only — a conditional rider;
  gate it on the `strikes` floor like every hit-rider).
- **NO-LOCK**: passes — fire is universal, wet is everywhere water is
  (rivers, rain fronts, the shore, sewer channels); the scald's pools
  merely make "wet" the default.
- **Shines in**: the basin (every pool, the lake's shelf, the rain), the
  marsh, the coast, any riverland, under any rain front.
- **Monster wearers**: kettleback (standing); the Cistern Crone's boil
  (M3); wave-3: a **scald lancer** (geyserkin spear-thrower whose bolts
  scald) — the tribe's ranged line.

### 3.2 STEAM — concealment as a castable

- **Texture**: steam banks are FOG — the fog fabric's lobes are the hit
  surface and the sight veil's occlusion. A player-planted bank is the
  lightwell `kindle` effect's sibling: a `vent` SkillEffect that plants a
  REGISTERED fog bank (FogBankDef kind `steam`) at the point, for a
  duration, statuses-while-inside optional.
- **Player pieces**: **Steam Veil** (plant a bank — line of sight breaks,
  ranged kin lose the lock; the stealth fabric's cheapest friend) ·
  **Scalding Shroud** (wear a following steam cloud — the biting-cloud
  precedent in skills.ts ~10732 — that conceals you and scalds adjacent
  bodies lightly) · support **Vaporize** (your fire casts leave a brief
  steam bank at impact — area denial by sight, not damage).
- **NO-LOCK**: passes — occlusion is universal; the fog fabric runs
  everywhere (it already carries dread palls and bank kinds per theme).
- **Shines in**: the basin (banks merge with the standing mist), any
  open-sight country where ranged kin punish approaches.
- **Monster wearers**: vent_shaman (a veil verb, wave-3 add); a
  **vaporling** (a steam-bodied lurker that lives inside banks and strikes
  out of them — the watch fabric's scent posture inverted: it hunts you
  by your footfall inside the white).

### 3.3 PRESSURE — bank it, vent it

- **Texture**: the vent's economy as a player grammar. The magazine /
  empower bank already exists (`useChargeGraft` — Deep Reserves; rounds as
  optional fuel; dry casts plain): PRESSURE is that bank skinned as heat
  — charges BUILD while you hold ground or land hits, and VENT as a
  column. The tells fabric's `fill` gauge can be the player's own read
  (a worn gauge on the HUD or the character — show-don't-tell applies to
  the player too).
- **Player pieces**: **Head of Steam** (a stance/buff: standing still or
  channeling banks pressure charges; moving bleeds them — the basker's
  patience as a player stance) · **Blowhole** (spend the bank: a
  telegraphed `atEnemies` storm — a geyser column erupts under the
  target; more charges = more columns; empty = a plain hot spit) ·
  support **Pressure Seal** (a magazine graft on cooldown hosts, the Deep
  Reserves grammar — the family's gem-side lever).
- **NO-LOCK**: passes — a charge bank is pure mechanics; nothing about it
  needs the basin.
- **Shines in**: any fight where holding ground is rewarded (the lake's
  ring, hold-the-ground objectives, the warfront's shelter seats).
- **Monster wearers**: THE GEYSERMAW (M3); wave-3: a **kettle bladder**
  (a pressure-polyp kin — the deepsea scald_polyp's surface cousin: a
  visible bladder fills and BURSTS — pop it early or back off at the
  brim; the accumulator family's scald face).

### 3.4 GEYSER-STEP — ride the column

- **Texture**: movement on a column of steam. A leap delivery whose
  launch PLANTS a brief vent under the caster (the telegraph is the
  broil — two seconds, drawn) and whose arrival splashes scald; the
  traversal fabric's rise pose can dress the flight (the Ascent's launch
  at combat scale). Movement-tagged (refuses from a saddle, like every
  movement skill).
- **Player pieces**: **Geyser-Step** (the leap: plant, broil, launch,
  land with a scald splash — a gap-closer AND an escape) · **Vent Hop**
  (a short dash variant: a hot line of steam behind you — the Fire
  Walker trail grammar with a steam bank instead of fire ground) ·
  support **Afterspray** (your movement skills leave a scald splash at
  the departure point — the decoy precedent's hot cousin).
- **NO-LOCK**: passes — a leap is a leap; the splash is fire.
- **Shines in**: the basin's pool fields (hop pool-to-pool over the
  stings), the lake's isles, any cliff country.
- **Monster wearers**: the vent_shaman's escape verb (wave-3 add: the
  shaman rides its own vent out of melee — honest, telegraphed, the
  NO-TAG LAW still binds: it relocates, it does not hover); a
  **spout-hopper** geyserkin skirmisher.

### 3.5 PRISM — mineral attunement (the small family; supports + vestiges first)

- **Texture**: the attunement fabric — bodies that re-tune to the last
  blow's tone and pulse it. On the player side the honest first shape is
  not a skill but WORN pieces: vestige words in the basin's mineral
  register and a support that makes your hits re-tune attuned bodies.
- **Player pieces**: support **Mineral Tuning** (your hits re-tune `tune`
  bodies to your element and the pulse favors you — the prism snail
  fights FOR you once tuned) · **Prismcrust** (a buff: a mineral crust
  that takes the color of the last element that hit you and returns a
  fraction of the next same-element hit — small, legible, show-don't-
  tell via the body tint) · vestige words: *Sinter, Travertine, Sulphur,
  Vitriol*.
- **NO-LOCK**: passes weakly — Mineral Tuning only matters where `tune`
  bodies stand (crystals, the snail); Prismcrust and the vestiges work
  anywhere. Hence the family's smaller first cut (card 1).
- **Monster wearers**: prism snail (standing); wave-3: a **terrace
  warden** (a mineral-armored kettleback cousin wearing `tune`).

---

## 4. Acquisition — found in the country, owned everywhere

The skill-modes economy is the frame (`docs/design/skill-modes.md`: gems
drop at level 1, Memory Essence (the renamed Ability Essence) levels them, vendors sell by rung). Three
routes stand in the repo; the recommendation blends them:

1. **Scald-floored drops** — the country's loot rows carry its gems first
   ("deep zones advertise themselves by what falls there"); the basin is
   where the scald family is FOUND.
2. **The ledger opens the pool** — the Glimmercraft precedent:
   `great_geyser_entered` / `geysermaw_slain` / `cistern_entered` add the
   family to the ACCOUNT-WIDE drop + vendor pools (the gem counter's
   standing order can then commission them).
3. **The vendor rung** — a broader-wares rung lists them once the ledger
   has opened them.

Recommended: 1 + 2 (found in the scald, then everywhere — the NO-LOCK
law's acquisition half), 3 following from the standing gate grammar for
free. Monster-side pieces ship as `noDrop` kit (the Glimmercraft section's
5-noDrop model) and need no acquisition at all.

---

## 5. Fauna ties — "ample new kit types and themes into the fauna lists"

Her ask reads both ways and the round should do both:

- **Existing defs gain kit** (cheap, high feel): vent_shaman (+ steam
  veil, + vent-ride escape), kettleback (+ Kettle Burst as its big hit),
  stilt_strider (+ a scalding lunge), the Cistern Crone (the boil — M3),
  THE GEYSERMAW (column slam = Blowhole at boss scale — M3).
- **Wave-3 fauna wearing the new families** (§3's proposals collected):
  scald lancer (SCALD) · vaporling (STEAM) · kettle bladder (PRESSURE) ·
  spout-hopper (GEYSER-STEP) · terrace warden (PRISM). Each rides one
  standing fabric (tells / watch / accumulator / flock / tune) — the
  charter's one-line-per-kin discipline.
- **THE MIRROR LAW (RATIFIED at the walk)**: every player piece has at
  least one monster wearer in the scald's lists — the player sees the
  verb before owning it (the vent-shaman teaches the broil before
  Geyser-Step asks you to trust it).
- **THE NEW-PIECES PREFERENCE (her word at the walk)**: the kin must stay
  thematic — and when a theme wants a part that does not exist, BUILD it
  (a new look part, painter or kit-piece) rather than approximating with
  old parts: "those end up seeing immense use when we continue expanding
  out on the enemies." Her look review of the wave-3 kin is owed (the
  bestiary / portrait book once K1 lands).

---

## 6. The skill-mode trees (a dependency, not this round)

New skills eventually want mode trees (the skill-modes charter's curated
waves: 2 branches × 3 rungs + 1 neutral per skill). This round ships
every new skill SINGLE-MODE (first-pass), and the scald pieces join the
tree waves when those run — noted so nobody builds trees here.

---

## 7. THE WALKED LEDGER (2026-08-21 — cards 1–8)

**RATIFIED AS RECOMMENDED** at her walk: cards 1, 2, 4, 5, 6 and 8 stand
exactly as written below; **card 3 is AMENDED** by THE RUPTURE LAW (§3.1
— one status, magnitude folds, AND the bank is a rupturable resource);
**card 7** (the Cloudherd audit) HELD — her word: the canon was likely
already audited; hold for now. GEYSER-STEP drew her enthusiasm and was
pulled forward into K1 as a walkable spike (built).

1. **THE ROSTER CUT** — which families graduate now: recommended SCALD +
   PRESSURE + GEYSER-STEP as skills, STEAM as skills-light (Steam Veil +
   Vaporize), PRISM as supports/vestiges only; the full five or a
   narrower first wave is her call.
2. **ACQUISITION** — §4's blend (floored drops + the ledger opens the
   pool) recommended; drops-only or ledger-only are the alternatives.
3. **THE SCALD FOLD** — how wet is read (stand states wading/swimming +
   rain-wet; DIAL ×1.5) and whether `scalded` stays one status or grows a
   stacking ladder (recommended: one status, magnitude folds — the
   status-family sprawl is the risk).
4. **GEYSER-STEP's shape** — leap (recommended: the plant-broil-launch
   read is the country's whole tutorial) vs dash; and whether the splash
   scalds allies (faction-blind like the vents, or owner-safe like a
   player skill — recommended owner-safe: player skills are not terrain).
5. **THE MIRROR LAW** — adopt (every player piece has a scald monster
   wearer) or not.
6. **PRESSURE's bank** — the magazine/empower graft (recommended: no new
   resource, the standing grammar) vs a new pressure resource.
7. **THE CLOUDHERD AUDIT** — fire the no-lock audit chip for the
   Aetherial kit now, later, or not (out of scald scope; her call).
8. **MONSTER BREADTH** — wave 3 as §5 lists (five defs) or a cut.

---

## 8. Movements (each awaits her go; honest reads)

- **K0 — her walk** — DONE 2026-08-21 (cards ratified, the rupture law
  added).
- **K1 — THE MONSTER SIDE + THE FOLDS + THE GEYSER-STEP SPIKE (BUILT
  2026-08-21 — probe_scaldkit 65/65, docs/engine/scaldkit.md; owed her:
  every dial (bank capMul 4 / duration 5 / wetMul 1.5 / rupture 0.6…),
  the wave-3 LOOK review, and a "Kettle Burst" display-name collision that
  K2 resolves)**: the scald wet-fold + THE RUPTURE LAW's
  generic effect, the `vent` fog effect seam, the pressure gauge read,
  existing defs' kit additions, wave-3 fauna (5 defs, new pieces), the
  player's Geyser-Step pulled forward as a walkable spike (dev-obtainable;
  acquisition proper stays K2), probe pins for every fold, the NO-LOCK
  test as a census (a probe line per player piece: "has a non-scald
  effect") and THE MIRROR census.
- **K2 — THE PLAYER PIECES + ACQUISITION (~1–1.5 sessions; CHIPPED
  2026-08-21 on K1's landing)**: the skills
  + supports per the roster cut (single-mode), loot rows + ledger pool
  opening + vendor rung, bar/tooltip/book surfaces, the sweep-supports
  matrix slice for the new gems (`matrix check --support <gem>` per the
  supports law), eventqa/genqa untouched unless rows move.
- **K3 — THE TREE WAVE (deferred to the skill-modes waves)** — the scald
  pieces' mode trees.
- Standing gates per movement: check · probe (roster row with any rig) ·
  sim smoke + baseline · the supports matrix slice for new gems · perf
  only if a new per-frame consumer appears (the steam banks ride the fog
  fabric's existing budget).
