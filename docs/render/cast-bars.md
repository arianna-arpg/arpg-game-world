# Cast-bar reading layer

Cast bars retain the original 44 x 5 artwork, translucent backing, actor-relative
position and cast-mode decorations. They never relocate, clamp to a screen edge,
separate from other bars, acquire a surrounding card, or draw an ownership leader.
The crowded-meter option continues to govern the other native meters only.

The late reading pass paints casts after bodies, projectiles, raised scenery,
weather, light, floating text and the ordinary HUD. Reduced render scale uses
native crest pixels; full scale uses the main canvas. Both paths use the same
camera, zoom and shake as the actor. Menus and deliberate traversal/death fades
remain above this pass. Clean and world-only director takes omit cast readouts.

## Priority and contrast

`render/vis/castBars.ts` owns the unchanged mode painter and paint ordering.
The controlling player's bar paints last, followed in importance by local couch
players, other seated players, enemies and other allies. Actor identity breaks
ties. Priority affects stacking only: overlapping actors keep overlapping bars.

`render/vis/castBarContrast.ts` samples the composed scene before any cast bars
paint. One small scratch canvas is shared by all active casts, with bounded
resolution and refresh cadence. At reduced scale it composites the world and
crest before sampling. There is no native-framebuffer readback per actor.

The skill's ink is compared with scene luminance at five points around its bar.
Poor contrast or strong variation enables a thin light/dark outline around the
native bar. Clear contrast leaves the original appearance alone. The outline
paints before the native art, so timing markers and mode cues retain precedence.
An unavailable readback has a quiet fallback; no cast or visibility rule depends
on the sample. The bar's fill, position, size, clocks and input mechanics do not
change with the backdrop.

`VIS_CFG.castReadout.overlay.priority` controls paint precedence.
`VIS_CFG.castReadout.contrast` controls sampling limits, contrast thresholds,
outline opacity, colors, width and padding. Existing name/movement/slot hints
retain their own settings. No support or monster IDs enter this policy.

## Visibility and lifecycle

Enemy and remote bars retain native body admission (story, burrow, status
concealment) and the final label-reveal gate for roofs, crowns, room and sight
veils. Off-screen bars keep ordinary canvas clipping. Local input feedback is
queued even when cover or a replacement form hides the player's body; this
exception reveals no enemies. Dead, downed, ended and replaced casts retire
normally. Drawing never resolves a cast or alters its state.

## Verification

- `npm run check` and `npm run probe -- castbars`: native mode clocks, timing
  decorations, fixed overlapping anchors, no cards/leaders, priority, original
  edge clipping, concealment, cleanup, contrast decisions and sampling cadence.
- Existing `striketiming`, `castingcues`, `playercastvisuals`, `castaim` and
  `combatreadability` probes.
- Build, then `electron balance/cast-bars-ui.cjs`: real pixel checks under
  opaque late effects at 1, .75 and .5 render scale; normal and Overcharge
  casts; original screen coordinates even with crowded meters enabled; contrast
  changes without relocation; cover ordering, local/enemy admission, couch
  ownership, director takes and retirement.
- Existing `balance/strike-timing-ui.cjs` and `balance/cast-readout-ui.cjs`
  (`HOLLOW_WAKE_QA_DIST=dist` for the latter) preserve composed timing cues,
  cast-name/slot opt-ins, ownership and normal movement.

Hidden UI courses use disposable saves/profiles and write to ignored reports.
