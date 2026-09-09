# THE LIVING TOWN — townsfolk with lives (charter v1)

**Status: DESIGN + a debut.** Commissioned 2026-09-05 off her inn walk:
*"AI granted to something like the patrons and lodgers so that they
actually walk around; or further, perhaps even genuine AI packages … to
give them schedules and genuinely have them come to life; and additionally,
randomization of the patrons and lodgers so that they change and the inn
truly feels inhabited."* Two of the three asks are BUILT (§1); the third —
SCHEDULES / AI PACKAGES — is chartered below for her word (§3). Every
number is a DIAL; the probe for what stands is `probe_towngrowth` rig J.

> **THE LEAD FINDINGS.**
> 1. **The brain had no idle verb.** `BehaviorSpec` carried `seek` (drift
>    at prey/loot) and `flock`; every other idle motion was the hard-coded
>    wander at `ai.ts` (1.5–4.5 s rerolls, 35 % dead stops, 0.35 pace) —
>    tunable by nothing, bounded only by a duty post's slack.
> 2. **Passive scenery could not move by construction** — two locks: the
>    brain gate (`if (actor.passive) return`) and `movementLocked`. Making
>    townsfolk combatants (the crofter recipe: `passive:false`, a
>    `post{hold:false}`) would have put them on enemy target lists, in
>    counts, under shoves. The town wanted scenery WITH LEGS, not soldiers.
> 3. **The one scheduled routine that exists is the theater fabric's
>    `watch_change`** (`data/theater.ts`): a RadianceCond-gated row that
>    restamps duty posts round-robin and reverts them byte-for-byte on its
>    closing tick. That is the shape a schedule already has in this engine.
> 4. **Rostering had every part but a roller:** per-beat seeds
>    (`withSeededRandom`, `restockOrdinal`), name pools (mercenaries), the
>    apparition def factory (Mu), six npc looks × any colour.

---

## 1. WHAT STANDS (built 2026-09-06)

### 1.1 THE HAUNT — `BehaviorSpec.haunt` (engine/brain.ts, engine/ai.ts)
Idle conduct as data: `{ kinds, reach, linger, pace, restChance }`. With
no foe in sight the body picks a piece of FURNITURE of a named kind within
`reach` of its post (or first-tick anchor), walks the flow field to a stand
beside it (a solid piece) or onto it (a walk-over one: a chair, a rug),
lingers `linger` seconds FACING it, then picks another — or rests at home
for a while. Same story only (the tier fabric); THE STORY LAW: a stand the
story's field cannot reach is dropped, never elected across a stair (the
hunter's stair election is not the guest's); THE NAV SNAP keeps every
stand on fieldable ground. Combat-capable bodies reach it through the idle
ladder (it outranks the wander); **THE STROLLING SCENERY**: a `passive`
body wearing a haunt runs ONLY the haunt — untargeted, uncounted,
unshoved, invulnerable exactly as before, and alive between its seats
(`movementLocked` lifts for it alone). Dials: `HAUNT_CFG`.

### 1.2 THE FOLK ROSTER — `data/innfolk.ts`, `StructureDef.folk`
A POOL is a registry entry of ROWS (a drover, a tinker, a pilgrim, a
courier, an off-duty warden, a gambler; upstairs a scholar, a merchant, a
midwife, a veteran): each row = names × colours × lines × a haunt, and
mints ONE def (`folk_<pool>_<row>`) on registration (the Mu apparition
idiom). A plan declares FOLK SEATS (`folk: [{ pool, x, y, tier?, chance? }]`)
that the placer records and `World.loadZone` ROLLS on a seed of (zone,
seat, DAY) — `withSeededRandom` over `DAY_LENGTH`; the ZONE's seed, never
the world's, so the day's head-count is a pure function of the zone and the
actor ids after it stay hermetic (pitfall 4) — so the same
company keeps its chairs through a day and the next dawn deals new faces;
a seat's `chance` may leave it empty. The body wears the rolled name,
colour (`Actor.color`) and line (THE SPOKEN SEAT). Debut: the inn — three
chairs in the common room, two beds above; Mireille, the stair-speaking
patron and the corner-room lodger stay fixed.

### 1.3 What this already composes
- Any structure anywhere seats folk with one row; any body haunts any
  furniture with one spec (a scholar the shelves, a smith the anvil).
- The theater fabric can restamp `aiPost` under a RadianceCond exactly as
  `watch_change` does — a haunt's `home` follows the post.

### 1.4 THE TRANSIENT TELLING — `engine/speech.ts`, `SPEECH_CFG` (built 2026-09-06)
A folk line is an UTTERANCE, not a caption. Before this the spoken seat's
bubble stood as long as the hero stood in reach and popped in and out at
the radius edge as they walked past. Now `World.residentPrompt` (the
renderer's per-frame poll) answers through one pure fold, `speechTell`:
a telling begins on A FRESH APPROACH (the nearness EDGE — within
`RESIDENT_RADIUS` + `dwellReachable` under THE SAME-STORY LAW, not there at
the last live read; standing there earns nothing), stands its WHOLE window
wherever the hero walks (`holdSec` + THE READING ALLOWANCE `holdPerChar`
per character — the words were said, the speaker finishes the sentence at
your back; the renderer's same-view gate still conceals the drawn bubble
when you leave the room), disperses, and THE HELD TONGUE runs
`cooldownSec` on the WORLD clock — out-and-back-in inside it earns
nothing. THE LANE IS THE OVERRIDE: every line arrives by its source lane
(`seat` = a plan's spoken seat, `folk` = a rostered guest, `resident` = a
ward family) and `SPEECH_CFG.lanes` overrides any dial per lane (the
spoken seat's DIRECTIONS repeat sooner: cooldown 12 s against the 24 s
base; `Infinity` = the old perpetual bubble as data). THE LESSON
EXEMPTION: Mireille's counter prompt (the welcome gift, the flask lesson),
the quest giver's, the caravanner's, the Bonewright's and the Delver's are
FUNCTIONAL — they stand until acted on, and never ride this clock. The
memory is a per-world map keyed by actor id, cleared with the lines at
every zone load, never saved, never on the wire. Dials (hers to rule):
`holdSec` 4, `holdPerChar` 0.05, `cooldownSec` 24, `lanes.seat.cooldownSec`
12, `staleSec` 1. Docs `docs/render/speech.md`; probe `probe_speech` rig J
(the fold + the live inn: the patron, a guest, Mireille's exempt prompt).

### 1.5 THE SPEECH GRAMMAR — `engine/speechGrammar.ts`, `data/speechGrammar.ts` (built 2026-09-06)
Her ruling, 2026-09-06: *"Rimworld levels of colony member discussion"* —
the folk should talk about the world and about EACH OTHER, varied and
generative, never the same three fixed lines. Card 6 TALK is the ruling;
this section is the design she gets to read before it is judged.

**THE SHAPE.** A folk line is a TEMPLATE with SLOTS resolved from the
world's own state at the moment it is told. Templates are rows in an open
registry (`registerSpeechTemplates`): `text` with `{slot}` tokens, a ROLE
pool (`roles: ['patron','traveler']` — `'any'` fits every speaker), a
`weight`, and optional GATES (`phase: ['night']`, `sky: 'clear'|'front'`).
Slots are RESOLVERS in a second open registry (`registerSpeechSlot`), each
a pure read of a narrow `SpeechContext` that returns a phrase or null; a
template with an unresolvable slot is SKIPPED, never thrown. The debut
slots: `{name}` the speaker, `{other}` another NAMED body of the same
company that is actually present, `{doing}` that body's current haunt
piece ("Corran Vale's been at the keg all evening" — read off the SAME
`hauntSeat` the AI walks, so the tell is true), `{phase}` (dawn / midday /
dusk / night), `{weather}` (the standing front's label), `{lastEvent}` (the
newest line of THE NOTICE FEED, kept on a short world log), `{from}` (the
zone the hero arrived from — `World.entryFrom`), `{heroClass}`, `{town}`
(Lastlight), `{zone}`, `{monster}` (a kind the hero put down recently —
a credited kill log with a window), and `{hero}` (the hero's address,
renown-gated, expanding at the renderer's own `{name}` seam).

**THE LAWS.**
- **THE SPEAKER IS A ROW.** Every spoken body — a plan's spoken seat, a
  rostered guest, a ward family — registers ONE speaker row at the spawn:
  a stable KEY (the seat's key — zone + structure + seat), a COMPANY (the
  house it belongs to: the inn's placed structure id, or `ward`), its
  ROLES (`FolkRow.roles` / `MonsterDef.speechRoles`; a family is a
  `resident`), whether it is NAMED (a rolled or family name; the patron's
  def-name "Patron" is not a name and never fills `{other}`), and its OWN
  lines. The lane law of §1.4 stands unchanged beneath it.
- **THE DEAL.** Once per (zone seed, company, DAY) the grammar deals each
  speaker a DECK: a seeded weighted shuffle of every template its roles
  admit, walked once, each template handed to the eligible speaker with
  the shortest deck. Decks are PAIRWISE DISJOINT by construction, so no two
  folk in one company can say the same line the same day; the next dawn
  re-deals. The stream is a local mulberry seeded off the zone (THE
  OFF-STREAM LAW) — `Math.random` never moves.
- **THE FIRST WORD.** A body's AUTHORED lines (`FolkRow.lines`, the seat's
  `line`, the family's `line`) are kept whole as slotless templates of its
  own and LEAD its deck, so the first approach of every day still says what
  it always said — the patron's directions, the family's greeting — and
  the chatter rotates behind it. An authored line already claimed by an
  earlier body of the company (two drovers share a row's lines) yields to
  the next.
- **THE ROTATION.** A telling begins on THE FRESH APPROACH (§1.4); each
  telling takes the next RESOLVABLE entry from the deck position on
  (skipped entries stay dealt — the sky may open them later), and the
  composed line is stamped for the whole window so a slot never flickers
  mid-telling. Deterministic per (zone, seat, day, approach index) under
  equal world state.
- **THE COMPANY LAW, SPOKEN.** `{other}` names only a NAMED, LIVING, PRESENT
  body of the same company (never the speaker); `{doing}` reads that body's
  arrived haunt piece through the same doodad the AI faces, or skips.
- **THE EMPTY WORLD.** Every resolver answers null on nothing (no front, no
  news, no arrival, no kills), and a template that needs it is skipped —
  a fresh run's first inn talks in slotless templates and grows worldly
  as the world happens.
- **TRANSIENT BY CONSTRUCTION.** Decks, positions and stamped lines are
  per-world speaker rows cleared with the lines at every zone load; nothing
  is saved, nothing crosses the wire (a client polls its own world).

Dials (`SPEECH_GRAMMAR_CFG`): `slainWindowSec` 480 (two days of "recent"),
`newsKeep` 8, `slainKeep` 8. The corpus (`data/speechGrammar.ts`) ships
dozens of templates per role — patron / lodger / merchant / warden /
pilgrim / resident / mercenary / camper / traveler / visitor / any — and
the HAUNT PHRASES table (`bar_counter` → "at the bar", `keg` → "at the
keg"; a piece with no row reads "by the <piece>"). Docs
`docs/engine/speech-grammar.md`; probe `probe_speechgrammar` (the registry
census, the empty world, the disjoint deal, determinism, the live inn's
rotation + company law, present-only `{other}`, no `Math.random`).

---

## 2. THE DECISION CARDS (her word wanted — none of these are built)

1. **AI PACKAGES vs ROUTINE ROWS.** Her phrase "genuine AI packages" could
   mean (a) a new PACKAGE fabric (`src/packages/` overlays) that grants
   schedules to bodies as a world event, or (b) ROUTINE ROWS as data on the
   def/roster (`routine: [{ when: RadianceCond, post?, haunt?, hidden? }]`)
   applied by one engine tick — the `watch_change` grammar generalized.
   Recommended: (b). A routine is a property of the folk, not an event of
   the world; the theater fabric stays the EVENT lane (a wake, a wedding, a
   market day) and can still restamp posts on top.
2. **THE CLOCK.** Routines gate on `RadianceCond` phases (dawn/day/dusk/
   night — the standing time vocabulary) vs. hours of a finer clock.
   Recommended: phases (the inn fills at dusk, lodgers sleep at night, the
   common room empties at dawn); `DAY_LENGTH` 240 s is the existing dial.
3. **SLEEP.** A `sleep` conduct: at night a lodger walks to its bed and
   lies on it (a prone pose = `StatusDef`-style ghost/lean render lever, or
   the body simply parks on the bed's rug and faces it). Recommended for
   v1: park + a `resting` worn status the tell fabric can read.
4. **WHERE THE FOLK GO BY DAY.** Off-shift patrons could walk the SQUARE
   (a `haunt` on the plaza's benches and the board — reach across the
   town) or vanish (`hidden` until dusk). Recommended: the square — the
   town reads inhabited from the road; `chance` dials the crowd.
5. **THE ROSTER'S TURN.** Per day (built) vs per visit vs per BEAT (the
   vendor's 300 s). A day is the honest one — the same face at the bar
   after a short errand.
6. **TALK.** RULED 2026-09-06 ("Rimworld levels of colony member
   discussion") and BUILT (§1.5 — THE SPEECH GRAMMAR: templates with slots
   off the world's own state, a disjoint per-company-day deal, the first
   word authored, the rest rotating on each fresh approach over §1.4's
   clock). Owed her: every slot's phrase form, the corpus itself (dozens per
   role — hers to cut and add), `slainWindowSec` 480, `newsKeep` /
   `slainKeep` 8, the FIRST WORD law (an authored line leads every day) and
   whether a `{hero}` address should wait on renown. Still open: NPC-to-NPC
   chatter (two guests facing each other with bubbles — a `talkTo` pairing
   is one idle rung; `{other}` already knows who is in the room).
7. **THE WARD'S FAMILIES.** The residents (`TOWN_RESIDENTS`) could wear the
   same lever (a haunt on their doorstep flowers and the green's benches).
8. **MIREILLE.** The innkeep behind her counter could haunt the counter's
   run (drifting along it) — her `roof` reach + counter dwell would need
   the moving body's position honored (they read the body, so they would).

## 3. BUILD MOVEMENTS (after her word)
- **L0 — landed:** the haunt + the roster (this document's §1).
- **L1 — THE ROUTINE ROWS:** `FolkRow.routine` / `MonsterDef.routine` +
  the phase clock + the sleep conduct + the square by day (cards 1–4).
- **L2 — THE TALK:** LANDED as THE SPEECH GRAMMAR (§1.5) — rotated,
  generative lines over THE TRANSIENT TELLING's clock (§1.4); the ward
  wears it. Pairings (NPC-to-NPC chatter) remain the open rung.
- **L3 — THE TOWN'S DAY:** market morning, the watch change (already in
  the theater), a festival row — event-lane compositions over L1.

## 4. THE PITFALL LEDGER
1. A haunt stand computed a body's width off a table can sit in a nav cell
   the table half-covers; `moveToward` then reads the goal as "not this
   story's floor" and ELECTS A STAIR — the midwife walked downstairs. THE
   NAV SNAP + THE STORY LAW closed it (probe rig J's story-law check).
2. The anchor stamp (`aiAnchor ??=`) sits BELOW the passive gate; strolling
   scenery stamps its own on the way past.
3. THE HAUNT'S OWN DIE: the first haunt rolled on `Math.random` and shifted
   every seeded rig's staging downstream of the town (probe_lairs' den seed
   pinned to a global-stream position); it rolls a per-body mulberry now
   (`Actor.hauntRng`) — THE OFF-STREAM LAW worn per body.
4. A folk roll seeded off the WORLD dealt a different head-count per run and
   every actor id after the inn with it (probe_pack's same-seed print broke);
   the roll rides the zone's seed + the day.
5. The sim's `World.update` does not run the AI — the runner drives it
   (`for (const a of world.actors) updateAI(a, world, dt)`); every probe
   that wants a stroll drives it the same way.
6. THE PERPETUAL BUBBLE: `residentPrompt` answered the radius every frame,
   so a spoken seat's line stood as long as the hero did and flickered at
   the radius edge on a walk past. THE TRANSIENT TELLING (§1.4) closed it
   at the WORLD seam — the renderer never learned a clock; the two probe
   checks that read "says nothing across the square" now first let the
   window run (the whole telling is the law, not the radius).
