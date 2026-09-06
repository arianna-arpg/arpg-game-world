# THE SPEECH GRAMMAR — generative folk talk as data

**Files:** `src/engine/speechGrammar.ts` (the grammar: templates × slots × the
deal × the telling), `src/data/speechGrammar.ts` (the starting corpus + the
haunt phrases), `World.residentPrompt` / `composeSpeakerLine` /
`speechContext` (the world's consumer), `balance/probe_speechgrammar.ts`.
**Charter:** `docs/design/townsfolk-life.md` §1.5 (card 6 TALK is the ruling —
her words, 2026-09-06: *"Rimworld levels of colony member discussion"*).

The speech fabric now has three halves that never overlap:

| half | file | decides |
|---|---|---|
| THE TRANSIENT TELLING | `engine/speech.ts` | WHEN a body speaks (fresh approach, window, held tongue) |
| THE SPEECH GRAMMAR | `engine/speechGrammar.ts` | WHAT it says |
| THE WORD LAYER | `render/vis/speech.ts` | HOW the line is drawn (wrap, typewriter, layout) |

## The defect this closed
Every spoken body had two or three FIXED lines rolled once per seating. The
inn's company said the same sentence on every approach, said nothing about
the room they stood in, nothing about the weather, the news, the hero's
deeds, or each other — a caption, not a conversation.

## The shape
A **template** is one registry row:

```ts
t('patron_04', '{other}’s been {doing} since I came in. Either patient or asleep with the eyes open.', ['patron'])
t('any_10',    'Clear sky over {town} tonight. Doesn’t happen often enough to trust.', ['any'], { sky: 'clear', phase: ['night', 'dusk'] })
```

- `roles` — the pools that may say it (`'any'` = every speaker; a speaker
  wears several — the inn's drover is `['patron', 'traveler']`).
- `weight` — the deal's draw weight (default 1).
- `phase` / `sky` — GATES: only under these hours; only under a clear sky
  or only under a standing front.
- `{slot}` tokens — resolved at the telling by a registered resolver.

A **slot** is a pure read of a narrow `SpeechContext`, returning a phrase
or `null`. A template with an unfillable slot is SKIPPED that telling —
never thrown, never half-filled (probe rig B).

| slot | phrase form | source |
|---|---|---|
| `{name}` | the SPEAKER's name | the rolled / family name (a def-named body has none) |
| `{other}` | another NAMED, PRESENT body of the same company | the company rows, chosen on the telling's die |
| `{doing}` | that body's haunt piece, "at the keg" | `Actor.hauntSeat` (arrived) → the doodad at its centre → `hauntPhrase(kind)` |
| `{phase}` | a noun after at/by/for: dawn · midday · dusk · night | `dayCycle(time).phase` |
| `{weather}` | the front's label, lowercased, no "the" | `World.skyFront()` → `WEATHER_DEFS[kind].label` |
| `{lastEvent}` | the newest news line as a clause | `World.notice()` → `newsLog` (window `newsWindowSec`) |
| `{from}` | the zone the hero arrived from | `World.entryFrom` → its def's name |
| `{heroClass}` | the class, lowercased | `meta.classDef.name` |
| `{town}` / `{zone}` | proper names | `zoneMap[START_ZONE].name` / `zone.name` |
| `{monster}` | a kind the hero killed, with its article | `World.kill()` credited, page-worthy → `slainLog` (window `slainWindowSec`) |
| `{hero}` | the hero's address | the literal `{name}` token the RENDERER expands (`resolveNameTokens`), only once `heroKnown()` |

`{name}` in a TEMPLATE is the speaker: a grammar line is the speaker's own
sentence. The hero is `{hero}`, resolved LAST so its literal `{name}` never
crosses the speaker's fill (rig D17).

## The laws
- **THE SPEAKER IS A ROW.** At the spawn the world registers one
  `SpeechSpeakerRow` per spoken body — a stable KEY (`<structure>:seatN:<def>`
  for a plan seat, the folk seat's own key, `ward:<family>`), a COMPANY (the
  placed structure's id — `GeneratedLayout.npcs[].sid` / `folk[].sid` — or
  `'ward'`), ROLES (`MonsterDef.speechRoles` for plan seats, `FolkRow.roles`
  for guests, `TownResidentRow.roles` ?? `['resident']`), whether it is
  NAMED, and its OWN authored lines. The §1.4 lane and its fallback line
  stand beneath.
- **THE DEAL** (`dealSpeechDecks`). Once per (zone seed, company, DAY): every
  template someone in the company may say is shuffled by weight on a local
  `Rng` (THE OFF-STREAM LAW — the global die never moves) and handed, one by
  one, to the eligible speaker with the fewest so far. Decks are pairwise
  DISJOINT by construction, every fitting template is dealt exactly once,
  and the walk is in KEY order (spawn order never changes a deck). The next
  dawn re-deals; a spent deck wraps (never silence).
- **THE FIRST WORD.** Authored lines (`FolkRow.lines`, the seat's `line`, the
  family's `line`) are kept whole as slotless entries that LEAD each deck —
  dealt round-robin, one unclaimed line per body per pass, so two drovers
  sharing a row each open with a line of their own. The patron's directions
  and the family's greeting are still the first thing said each day
  (probe_speech J14 and probe_towngrowth I/J keep).
- **THE ROTATION** (`composeSpeech`). A telling begins on THE FRESH APPROACH
  (engine/speech.ts); the world composes ONCE at that edge, stamps the line
  on the row for the whole window (no slot flickers mid-telling), and
  re-stamps the window for the line actually told. The deck walk takes the
  first RESOLVABLE entry from the position on; skipped entries stay dealt.
  The telling's die is seeded off (zone seed, key, day, position) so a
  replay says the same words — including the same `{other}`.
- **THE COMPANY LAW, SPOKEN.** `{other}` is drawn from company members that
  are NAMED (a rolled guest, a family — never "Patron"), PRESENT (alive in
  the actor list at the telling) and not the speaker. `{doing}` reads that
  body's ARRIVED haunt seat and names the doodad at its centre — the same
  piece the AI faces (drawn == told); between pieces it skips.
- **THE EMPTY WORLD.** Every resolver answers null on nothing; only the hour
  is never unknown. A fresh run's inn talks in slotless rows and grows
  worldly as news lands, kills are credited, the sky turns.
- **TRANSIENT BY CONSTRUCTION.** Rows, decks, positions and stamped lines
  live in `World.speakerRows`, cleared with the lines at every zone load;
  the gossip logs (`newsLog`, `slainLog`) are run-scoped rings. Nothing is
  saved, nothing rides the wire — a co-op client polls its own world.

## Dials (`SPEECH_GRAMMAR_CFG`)
| dial | value | meaning |
|---|---|---|
| `slainWindowSec` | 480 | how long a credited kill stays gossip (two days) |
| `newsWindowSec` | 720 | how long a news line stays gossip (three days) |
| `newsKeep` / `slainKeep` | 8 | ring sizes |
| `phaseWords` | dawn/midday/dusk/night | `{phase}` |
| `doingFallback` | "by the <kind>" | an unphrased piece |
| `dealSalt` | — | the deal's stream salt |

The corpus is the biggest dial of all: dozens of templates per role
(any 38 · patron 26 · lodger 22 · resident 20 · merchant / warden / traveler
14 · pilgrim / mercenary 12 · visitor 10 · camper 8 at the debut), every
one hers to cut, re-word or add to.

## Extending
- **A new line** — one `t(...)` row in `data/speechGrammar.ts`.
- **A new slot** — `registerSpeechSlot('rumour', a => …)` reading
  `a.ctx` / `a.other` / `a.speaker`; add its source to `World.speechContext`
  if the world must carry it. Slots nobody speaks are dead data (rig A3).
- **A new role** — a string on `roles` and on the bodies that wear it
  (`MonsterDef.speechRoles` / `FolkRow.roles`). Rig A5 refuses a worn role
  stocked below eight templates.
- **A new company** — any structure: its `npcs` rows and `folk` seats arrive
  with the placed structure's `sid`; a package's bodies register their own
  rows through `makeSpeakerRow`.
- **A new haunt piece** — `registerHauntPhrase('wine_rack', 'at the rack')`;
  rig A8 refuses an inn piece with no phrase.

## Bookkeeping
Probe `balance/probe_speechgrammar.ts` (66 checks): the registry census, the
empty world, the disjoint deal, the telling's laws and phrase forms, the
live inn (first word, rotation, company law, present-only names, `{doing}`
drawn == told, the logs' windows, same-seed replay), the ward, and the
no-global-die grep. The charter's card 6 lists what is owed her.
