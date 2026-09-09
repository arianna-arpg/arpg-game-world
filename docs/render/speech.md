# THE SPEECH FABRIC + THE WORD LAYER

NPC talk as wrapped **bubbles** with a **typewriter reveal**, drawn on a text
layer that the interior darkness can never drown — while the veils still
decide *whether* a line shows at all.

Files: `src/render/vis/speech.ts` (the pure laws), `src/render/renderer.ts`
(`queueSpeech` / `drawSpeeches` / the WORD LAYER), `VIS_CFG.speech`
(`src/render/vis/visConfig.ts`), `MonsterDef.speech` (`src/data/monsters.ts`),
`Settings.speechTyping` (`src/meta/settings.ts`).
The fabric's WORLD half — *when* a folk line stands at all — is
`src/engine/speech.ts` (`SPEECH_CFG`, THE TRANSIENT TELLING below), consumed
by `World.residentPrompt`.
Probe: `balance/probe_speech.ts` (rig J for the telling's clock).

## The defect this closed

Entering Mireille's inn engages THE ROOM VEIL (`vis/roomVeil.ts`): the world
beyond the room washes dark. Her talk line hung above her head — past the
structure's top wall, i.e. **on veiled ground** — and the veil composited
*over* the label pass, so the words drowned in the wash exactly when the
player stood close enough to read them. One long unwrapped string made it
worse: the wider the line, the further it reached into the dark.

## THE WORD LAYER (the compositing law)

Every world-anchored line of text — labels, speech bubbles, floating combat
text, the scene HUD, the pad reticle — draws in one block that re-enters
world space **after** `roomVeil.draw()`:

    …world pass… → drawRoofs → [restore] → roomVeil.draw
      → [WORD LAYER: labels, speeches, hover nameplate, floaters,
         scene HUD, dev hitboxes, pad reticle]
      → light layer → screen washes → HUD

- The veils keep their say over *existence*: `labelRevealAt(world, anchor)`
  probes roomVeil `veiledAt` + sightVeil `occludedAt` + roof/crown fades at
  the **anchor's feet** and hides text whose anchor the world conceals (the
  no-leak contract, the legibility knee — all unchanged).
- What they lost is the power to *drown* text their own gate chose to
  reveal: a shown line draws whole above the wash, wherever its box happens
  to hang.
- The word layer still sits **under** the light layer and weather washes —
  night and storms keep their say, exactly as before.

## THE SAME-VIEW GATE

A bubble exists only while its **speaker** is revealed to the local hero —
same room, door spill, window spill, or open air (`labelRevealAt`, probed at
the feet; pinned pure in `veiledAtVolume`). Concealment **parks the
utterance clock** (`startedAt = null`), so the telling replays from its
first glyph when the player next shares the speaker's view. Walking out of
prompt range prunes the clock the same way.

## THE WRAP LAW (`wrapSpeech`)

Greedy word wrap under the renderer's own `measureText`: words never tear,
authored `\n` always breaks, an overlong single word stands alone (the box
widens rather than the word splitting). The box is sized to the **whole**
utterance from the first frame — nothing jitters while the words arrive.
Lines draw left-aligned inside the box; the box centers on the speaker with
a tail wedge dropping to their scalp, traced as **one path** with the
rounded rect so fill and accent stroke never seam.

Ink stays the speaker's accent color (innkeep amber, quest-giver violet, …)
over one neutral veil-family dark — who is talking stays attributable at a
glance.

## THE TYPEWRITER (`revealedChars` / `revealBudget`)

Glyphs arrive on a per-character clock (`cps`), with a held beat after
sentence stops (`. ! ? … :`) and a shorter one after clause breaks
(`, ; —`) — but **only at a true break**: `"1.5"` never stutters. The clock
is **sim time** (`world.time`), so menu holds and time-stop freeze the
telling with the world. A caret blinks on the arriving glyph.

## THE PLACEMENT LAW (`dodgeSpeechBox`) + THE LAYOUT LAW (`layoutSpeechSeats`)

Two pure placement rungs run over the **home** box the wrap law hangs
(centred over the speaker, `lift` + `tailH` above the scalp), every frame,
before any bubble draws. Both are render-only and per client: nothing they
decide touches the world or the wire.

**Panes** (`dodgeSpeechBox`, `VIS_CFG.speech.dodge`): a bubble whose ground an
open DOM pane covers (inventory, the SKILLS drawer, a counter menu; the
canvas hotbar joins while panes stand) slides to the nearest clean ground on
a lattice of pane-edge exits, inside the screen's `edge` inset; with no pane
open it is untouched by construction. This is the re-seating the inventory
lesson box does beside the pane, applied to talk.

**Each other** (`layoutSpeechSeats`, `VIS_CFG.speech.layout`): bubbles never
cover one another. The frame's whole company is laid out at once:

- **The order.** `order: 'front'` seats the deepest speaker first (largest
  y, nearest the screen's foot), so its bubble holds home and the company
  behind it stacks **above**: the stack reads as depth. The ordering key is
  dead-banded (`orderBand`): a speaker keeps last frame's rank until its true
  depth drifts past the band, so two strollers passing never flip who is on
  top. `'queue'` seats in queue order instead.
- **The lattice.** A later bubble tries its home, last frame's seat, and
  every seat the placed boxes and panes offer: `gap` above any box, `gap`
  beside any box, per axis, crossed (the pocket above one bubble and beside
  another is a real seat), each clamped inside the view (**the view wall**:
  a bubble stays on screen, `dodge.edge` the inset) and refused past `reach`.
- **Nearest wins, the lift preferred.** Among clean candidates the least
  displaced wins, with sideways travel priced at `lateralWeight`: a bubble
  that must move stacks up; one already nearly clear slides the short way.
  Home costs nothing: a lone bubble in view is untouched byte-identical.
- **The stick.** Last frame's seat, if still clean, holds unless the fresh
  best is nearer home by more than `stick` px: a stroll's pixel drift never
  re-seats a settled bubble.
- **The damping.** A remembered bubble eases toward a changed seat by
  `damping` of the remaining travel per 60 Hz frame (on the larger of the
  sim step and the wall clock, so it still settles under a menu hold and
  still eases under a synchronous frame drive; `1` = snap) and snaps
  inside `settle`; a fresh
  bubble seats at once. Ground is reserved at the target, so later bubbles
  avoid where earlier ones are heading; a brief brush while two ease past
  each other is the damping's honest price.
- **No clean seat.** When nothing inside `reach` is clean (a crowd against
  the view's top) the least-covering candidate stands: a partial brush,
  never a stack marching off screen.

**The tail** is untouched by both rungs: the wedge always ends at the
speaker's tip, its base clamped to the box (`speechTailBase`, which the
renderer traces from and the probe reads, so drawn == tested), and a lifted
bubble's tail stretches to its speaker across whatever stands between. Upper
boxes draw **first**, so the box beneath a stacked bubble paints over the
crossing tail and keeps its own words whole; disjoint boxes are order-blind.

**Memory.** The only state is `SpeechSeatMemory` on the speaker's utterance
clock (last shift, last target, last rank): carried across a re-wording so a
bubble changes its words in place, dropped with the clock at silence or a
zone swap. Probe rig I pins every clause headlessly: disjoint boxes at 20 px,
tails aimed, the fixed point on a third frame, the stick, the damping's snap,
the view wall, a pane, a crowd of six, the order band, `'queue'`, purity.

## THE TRANSIENT TELLING (`engine/speech.ts` — the world's half)

The render laws above say *how* a line is told. **When** a folk line stands
at all is the world's read, not the renderer's: `World.residentPrompt`
answers the renderer's per-frame poll through one pure fold, `speechTell`,
over one config, `SPEECH_CFG`. Before it, a resident's bubble stood as long
as the hero stood in reach and popped in and out at the radius edge as they
walked past — a caption, not speech. Now a folk line is an **utterance**:

- **THE FRESH APPROACH.** A telling begins only on the nearness **edge**:
  the hero is within `RESIDENT_RADIUS` + `dwellReachable` (THE SAME-STORY
  LAW's story argument included) *now* and was not at the last live read.
  Standing there earns nothing — the level is not the edge. A memory older
  than `staleSec` forgets nearness, so a speaker that went unread (off
  screen, a teleport) meets its next read as a fresh approach, never a mute.
- **THE WHOLE TELLING.** Once begun, the line stands its whole window
  wherever the hero walks — the words were said; the speaker finishes the
  sentence at your back. THE SAME-VIEW GATE above still decides whether the
  *drawn* bubble shows (leave the room and it is concealed, as ever).
- **THE WINDOW.** `holdSec` plus THE READING ALLOWANCE, `holdPerChar` per
  character of the line, so a long line is never cut mid-telling. The
  typewriter's pace is a render dial this module never reads; the allowance
  is generous by design, and `Settings.speechTyping` OFF only leaves the
  whole line standing a little longer. The window is stamped at the
  telling's start: a dial retuned mid-telling changes the *next* telling.
- **THE HELD TONGUE.** After the window the speaker is silent for
  `cooldownSec` on the **world clock** — stepping out and back in inside it
  earns nothing, and the cooldown runs whether or not the hero is there.
- **THE LANE IS THE OVERRIDE.** Every resident line arrives by a lane —
  `'seat'` (a plan's spoken seat: the patron, the lodger), `'folk'` (a
  rostered guest), `'resident'` (a ward family) — and `SPEECH_CFG.lanes`
  may override any dial per lane (a spoken seat's directions bear repeating
  sooner than a guest's small talk). `holdSec: Infinity` on a lane is the
  old perpetual bubble as data; a zero window mutes the lane.
- **THE LESSON EXEMPTION.** The counters' prompts — `innkeepPrompt`
  (Mireille's welcome gift and her flask lesson included), `questGiverPrompt`,
  `caravanPrompt`, `amalgamPrompt`, `delverPrompt` — are *functional*: they
  say what a station will do and stand until acted on. They never ride this
  clock; only the resident lane does.
- **TRANSIENT BY CONSTRUCTION.** The memory (`SpeechMemory`: when the
  telling began, the window it holds, whether the hero was near at the last
  read) is a per-world map keyed by actor id, cleared with the lines at every
  zone load, never serialized, never on the wire — a co-op client polls its
  own world through the same read. The renderer's utterance clock is
  untouched: it keys on the line as ever, replays the typewriter from the
  first glyph at each telling, and prunes itself the frame the read goes
  null.

Probe rig J pins the fold clause by clause (the edge, the whole window, the
held tongue, the level, the stale memory, Infinity, purity, the shipped
dials) and then the **live inn** through `residentPrompt` itself: the
patron shows on approach, stands exactly its window, hides while the hero
stays, stays hidden out-and-back inside the cooldown, tells again after it;
a rostered guest rides the same clock; Mireille's prompt stands every frame
of a twenty-second stand.

**WHAT is said** is the third half, THE SPEECH GRAMMAR
(`engine/speechGrammar.ts` + the corpus `data/speechGrammar.ts`, docs
`docs/engine/speech-grammar.md`): at the fresh approach the world composes
the line ONCE — a template with slots off its own state (`{other}`,
`{doing}`, `{weather}`, `{lastEvent}`, `{monster}` …) from a per-company-day
deck — stamps it for the whole window, and this clock reads the line
actually told. The renderer still draws whatever `residentPrompt` returns;
`{hero}` arrives as the literal `{name}` token this file's address seam
expands.

## The lever ladder (most specific wins)

1. `Settings.speechTyping` — the player's master switch (Options → Visuals →
   "NPC Talk Typing"). OFF = every line whole at once.
2. `VIS_CFG.speech` — the fabric's base dials (width, font, pads, tail,
   lift, bg, edge, `typing {cps, pausePunct, pauseComma, caret}`).
3. `MonsterDef.speech?: SpeechStyle` — per-kind dials: any scalar, a partial
   `typing` object, or `typing: false` for instant plates (signs,
   echo-stones). Render-only flavor, never gameplay.
4. The `queueSpeech(actor, text, color, style?)` call — per-line overrides;
   a call's `typing` object re-opens a def's `typing: false`.

`resolveSpeech(base, def, call)` is the one fold — pure, mutation-free.

## Extending

- **Any talker joins by call**: route a line through `queueSpeech` instead
  of `queueLabel` — the five town-role prompts (innkeep, quest giver,
  caravanner, bonewright, delver) already do. Names, marks and portal
  labels stay on the plain label lane on purpose.
- **A new speaking kind** needs no renderer edit: give its def `npcRole`
  (existing behavior) and, if it wants its own voice, a `speech` block.
- **A new folk line** rides THE TRANSIENT TELLING by construction: set it
  into `residentLines` with its lane at the spawn (the three sites in
  `loadZone`), or add a lane to `SpeechLane` + `SPEECH_CFG.lanes` for a new
  source with its own window. A prompt that must *persist until acted on*
  (a counter, a lesson) belongs on its own `*Prompt` method, exempt.
- **Future**: per-line voices (`style` at the call site), off-screen
  speaker arrows, or a log of told lines all hang off the same queue.

## Bookkeeping

Per-speaker utterance clocks live in one renderer map, registered with THE
CACHE STEWARD (`id: 'speech'`) and dropped at every zone boundary; silent
speakers prune the same frame. Bind tokens (`{bind:…}`) resolve at queue
time through the same `resolveText` chokepoint as labels, and so does the
hero's address: `{name}` in any world-authored line expands to the live
hero's name at that seam (`resolveNameTokens`, this module — a blank name
degrades to 'Traveller', never a raw brace), so prompts address the player
with no import anywhere in world code.
