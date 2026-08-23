# THE STATUS VOICE — what lands on a body is drawn on the body

`src/engine/statusVoice.ts` (the pure leaf: the dials, the family resolver,
the frame-diff law) · `src/render/vis/statusVoiceLayer.ts` (the accents + the
nine family voices, registered into THE EFFECT VOICE) · `StatusDef.voice` ·
probe `balance/probe_statusvoice.ts` · design authority
`docs/design/show-dont-tell.md` §3e (M-STATUS — the ladder's second rung,
the player axis).

A status used to announce itself with a caption over the head — "chilled to
the bone!", "befuddled!", "UNHORSED", "contagion!". Now every status that
LANDS speaks an ON-APPLY ACCENT keyed by its FAMILY, drawn on the body and
following it: cold crackles **rime**, heat **flares**, lightning **sparks**,
poison/decay **spatters**, a wound throws **flecks**, the mind **spirals**,
hard CC rings **stars**, time **ripples**, a blessing **winks**. Nine voices
serve 141 statuses; the WORN face (the status bar, the frost rim / blind iris
/ low-life / survival overlays, `StatusDef.bodyFx`, `ghostAlpha`) stays the
standing read.

## The laws (probe-pinned)

1. **RENDER-SIDE BY CONSTRUCTION.** The accent is an after-image of the
   status LIST (the tested truth): the layer diffs each drawn body's statuses
   frame to frame (`statusVoiceDiff` — pure) and plays a voice for every FRESH
   id; a body's first sight seeds silently (no burst at zone load); ids that
   left are forgotten, so a return speaks again; off-screen landings stay
   silent. Host and co-op client detect identically off the same wire rows —
   nothing new ships.
2. **BY FAMILY, NEVER ONE RING.** `statusVoiceOf(def)`: the def's own `voice`
   (a registered voice, or `false`) wins; else the nature — self-drawing
   states (conceals / flight / ghostAlpha) speak none; `timeScale` → ripple;
   the ELEMENT (`dotType ?? element`: fire flare · cold rime · lightning
   spark · chaos spatter · physical flecks — a frozen body is rime, not
   stars); `hardCC` → stars; the mind (interruptChance / scrambleChance /
   invertMove / panic / smellsOfPrey) → spiral; else wink. THE FALLBACK LAW:
   every StatusDef resolves to a registered voice or none.
3. **NO TEXT.** The player-axis captions retired with this pass (21 lines:
   chilled to the bone · sunscorched · befuddled · maddened · possessed ·
   corrupted · SEEN / beheld · carried · torn free ×2 · broke free · the grip
   breaks · UNHORSED · FRENZY · contagion ×2 · transfused · swallowed by the
   dark · over the edge · renewing · time stops/bends); the RULE-NAME cries
   the genre reads by (addled · dominated · snatched · time slips · DOOM ·
   TRANSGRESSION · undying · hex drawn/sheathed · the guise breaks · primed ·
   marked · cleansed · rung clean · volatile · winded) ride the `combat` float
   kind — the player's own mute (Options → the info stream).
4. **PERF-CAPPED.** `STATUS_VOICE_CFG.maxLive` (24) live accents; past it a
   landing simply wears its worn face. Cost: one small set-diff per drawn
   body per frame; a handful of strokes per live accent.

## Dials (ALL unblessed — her walk)

`STATUS_VOICE_CFG` (life 0.55s · radiusScale 1.5 · maxLive 24) ·
`VIS_CFG.statusVoice` (rime ringAlpha 0.7 ticks 8 · flare alpha 0.75 sparks 4
· spark alpha 0.9 segs 5 · spatter alpha 0.8 blobs 6 · flecks alpha 0.85
count 6 · spiral alpha 0.8 turns 2 · stars alpha 0.9 count 3 spin 5 · ripple
alpha 0.7 · wink alpha 0.7). The census at HEAD: 141 statuses → wink 93 ·
flare 11 · spatter 8 · spiral 8 · none 5 · flecks 4 · stars 4 · rime 3 ·
ripple 3 · spark 2 — the `wink` tail is the authoring surface (one
`voice:` per status that wants a louder family).

## What this rung did NOT do (the census's next asks)

The WORN-FACE AUDIT (which exposure statuses still lack a rim/vignette/bodyFx)
is a listing for her walk, not built here; the mental MOTIF as a worn overlay
(beyond the on-apply spiral) and the death/hit/cast voices are M-HIT/DEATH.
