# Combat readability

Mechanics communicate through their visible behavior. In-world names identify
them; captions must not explain how to survive them. This applies to every
magic pack, not just satellites.

- Pack hover labels show identity only. Registry hints remain authoring/reference
  material and are never appended to the combat nameplate.
- Boss phase labels name a move or state. Geometry, movement, coloration and
  release effects communicate danger, safe space and vulnerability.
- Event markers and objectives use names, compact states and meaningful progress
  counts. Avoid appended instructions such as “strike now,” “clear the ground”
  or “linger beside it.” Existing interaction meters communicate dwell progress.
- Resolution labels keep their existing lifetime, reward and gate semantics;
  shortening text must not change an objective's behavior.
- Item/stat inspection, deliberate dialogue and explicit input-binding help are
  reference surfaces. This pass does not remove those optional explanations.

Author concise labels at their source. Do not truncate arbitrary strings or
silently suppress all notifications in the renderer. A new mechanic without a
readable visual cue needs that cue before it ships, not a caption workaround.

Cinder Wake demonstrates this contract with a bright orbiting ember, an arcing
shot, a fixed landing ring and a matching impact. The ring stays where the shot
was committed, so movement visibly avoids it. Damage, marks and co-op geometry
share the same authoritative radius and timing.

The September 2026 sweep covers magic-pack subtitles, selected boss phase and
counterplay captions, fracture/hunt/event callouts, dwell/corpse markers and
core objective states. Future authored content should follow the same rule.
The satellite UI harness checks actual rendered names and missing subtitles;
the objective probe retains lifecycle and progress assertions with short labels.
