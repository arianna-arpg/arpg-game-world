# THE SPEECH FABRIC + THE WORD LAYER

NPC talk as wrapped **bubbles** with a **typewriter reveal**, drawn on a text
layer that the interior darkness can never drown — while the veils still
decide *whether* a line shows at all.

Files: `src/render/vis/speech.ts` (the pure laws), `src/render/renderer.ts`
(`queueSpeech` / `drawSpeeches` / the WORD LAYER), `VIS_CFG.speech`
(`src/render/vis/visConfig.ts`), `MonsterDef.speech` (`src/data/monsters.ts`),
`Settings.speechTyping` (`src/meta/settings.ts`).
Probe: `balance/probe_speech.ts`.

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
- **Future**: per-line voices (`style` at the call site), off-screen
  speaker arrows, or a log of told lines all hang off the same queue.

## Bookkeeping

Per-speaker utterance clocks live in one renderer map, registered with THE
CACHE STEWARD (`id: 'speech'`) and dropped at every zone boundary; silent
speakers prune the same frame. Bind tokens (`{bind:…}`) resolve at queue
time through the same `resolveText` chokepoint as labels.
