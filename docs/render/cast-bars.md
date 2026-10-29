# Cast-bar reading layer

Cast bars are combat input and warning information. Their actor pass admits
them and supplies their positions; a separate, late reading pass paints them
after bodies, projectiles, raised scenery, weather, light, floating text and
the ordinary HUD. The pass uses the existing crest surface at reduced render
scale, so bars and timing markers remain native-resolution. At full scale it
uses the main canvas. Both paths share the world's camera, zoom and shake.

Menus still stack above canvas content. Deliberate traversal/death fades paint
after cast bars. Clean and world-only director takes omit this reading layer.
No additional canvas, input target, save field or network action is required.

## Ownership and placement

`render/vis/castBars.ts` owns the prepared readout and overlay compositor.
The existing mode painter was moved from `Renderer.drawActor`: bar widths,
fill clocks, Perfect Draw and Wandering Mark windows, Overcharge stages,
Spark, guard bash, channel completion, concentration and press counts use
the same live cast state and gameplay helpers. Drawing never resolves a cast.

Bars reserve space in descending priority: controlling player, local couch
players, other seated players, enemies, then other allies. They paint in the
reverse order, so an unresolvable crowd still gives the controlling player's
mechanics the foremost read. Identity breaks ties; actor-array order cannot
change that choice. An opaque backing provides contrast independently of
the world behind each bar.

The shared `CombatTextLayout` performs bounded separation between cast
readouts, retaining offsets for the life of a cast. Local bars keep their
preferred anchor unless another local bar or a viewport edge requires room.
A displaced bar has a leader to its caster; leaders paint before all bars.
The optional grouped-meter setting still supplies its native offset through
`CombatMeterLayout.add`'s callback before this additional reading pass.

Enemy and remote bars retain native body admission (including story, burrow,
and status concealment) and the final label-reveal gate for roofs, crowns,
room and sight veils. Off-screen hostile readouts do not become edge markers.
Local cast feedback is independently queued when cover or a replacement form
hides the player's body. This exception grants no information about enemies.
Dead, downed, ended or replaced casts cannot leave stale bars behind.

## Configuration and verification

`VIS_CFG.castReadout.overlay` supplies priority values, overlap avoidance,
bounded search spacing, backing, border and leader styling. Existing
`castReadout` sizes and name/movement hints remain their own controls. No
support IDs, skill IDs, monster species or first-socket decisions enter the
overlay policy.

- `npm run check`
- `npm run probe -- castbars`: all nine mode clocks, both timing windows,
  read-only painting, overlap priority/stability, concealment, viewport
  clamping, retirement and the grouped-meter callback contract.
- Existing `striketiming`, `castingcues`, `playercastvisuals`, `castaim` and
  `combatreadability` probes.
- After a build, `electron balance/cast-bars-ui.cjs`: real renderer pixel
  checks under opaque late effects at 1, .75 and .5 render scale; native and
  Overcharge casts; camera projection, cover ordering, local/hostile
  admission, couch ownership, crowded meters, director takes and cleanup.
- Existing `balance/strike-timing-ui.cjs` and `balance/cast-readout-ui.cjs`
  (set `HOLLOW_WAKE_QA_DIST=dist` for the latter) preserve composed timing
  cues, cast-name/slot opt-ins, queued-cast ownership and normal movement.

Hidden UI courses use disposable saves and profiles. Their images and logs
are written to ignored `balance/reports/`.
