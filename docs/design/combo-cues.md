# Combination completion cues (GT-034)

Implemented; encounter acceptance pending. The actual completed cast pattern
now closes into a short gesture above its caster, matched by the signature
beside its HUD pips. Floating combination names and the direct canvas name
caption are retired. Buffs, charges, triggered casts and proc riders still use
the original payoff pipeline; identity and descriptions remain in reference UI.

| Pattern | Default signature |
|---|---|
| Repeated uses | Paired strikes converge onto a beat, then settle. |
| Ordered sequence or alternating lanes | Two crossing strands weave together. |
| Varied skills or elements | Separate sides close into a polygon. |
| Collected counts | Four inward strokes gather around the completed center. |

`ComboRuleDef.cue` selects a profile from `data/comboCues.ts`. Omitted and
unknown names inherit the structure's default. `false` suppresses the
supplementary gesture while retaining functional HUD pips. Color comes from
the rule; width, travel, size, spacing and outline are shared data. Completion
lasts `COMBO_CFG.hudGlow`, measured from the real firing timestamp. The mark
follows its caster above the body and never claims an attack radius. Multiple
simultaneous completions have separate seats; four per row bounds their width.

`comboReadout` in `engine/sequence.ts` separates **new progress** from the
**previous completion**. Non-overlapping rules exclude records at or before
their last consumed sequence. Overlapping rules keep reusable history. This
fixes the old HUD/wire read, which could continue to show an already-consumed
full pattern. Body tells, world signatures, HUD and snapshots now share the
same read; matching and payouts remain unchanged. A new beat can fill a pip
while the previous completion gesture is still fading.

`engine/comboCues.ts` checks live grants, so newly granted rows appear before
the first cast and removed grants disappear immediately. Dead/downed actors
draw no rows. The existing `ActorW.cb` tuples now serve all actors, including
enemies and companions, with host-derived progress and completion strength.
Absent rows clear pooled mirrors explicitly. No cast history or payoff
authority is copied to clients.

`ProcDef.announceName: false` is the narrow caption migration seam used by
combo-generated procs. It suppresses their old name emitter without silencing
other, not-yet-migrated proc/rider events (GT-023 remains open).

## Verification

- `probe_combocues`: real completed uses, original buff/stack payoff, spent
  and fresh progress, repeated-use exclusion, timing investment, pattern
  shapes, profile overrides/fallback/opt-out, death/down/unequip/expiry,
  joining co-op and pooled-mirror cleanup, caption-free balanced painters.
- Existing `combo`, `crossjab`, `tells` and `statusvoice` probes; full type
  checks, production build and the 25-episode smoke suite.
- `balance/combo-cues-ui.cjs`: hidden real renderer with disposable saves;
  partial/completed/expired patterns, simultaneous body/HUD signatures,
  enemies, bright/dark ground and 1500×1000 / 960×640 windows. Captures and
  log are written to ignored `balance/reports/combo-*` files.

Remaining acceptance: recognize each pattern without its caption during
crowded combat and judge the size/comfort of simultaneous completions. This
does not mark the backlog row Done on automated evidence alone.
