# Impale: lodged steel

Impale wears an irregular cluster of faceted metal spikes embedded inside the
target's silhouette and extending beyond it. The attachment follows the body's
position, facing and pose. Players, monsters and summons use the same status
body-part path. Cleave's Deep Notches needs no special renderer branch.

The afflicted local player also sees small inward-pointing metal spikes on all
four screen edges. Their centers remain clear and the ordinary HUD draws above
them. The existing Ailment Screen Effects preference applies: Gentle adds slow,
slight depth motion; Still fixes the shards; Off hides the screen layer. Body
spikes remain visible so the world continues to show the status.

Both cues read actual status presence. They clear on discharge, cleansing or
expiry; dead/downed bodies and screens have no persistent steel. An attack that
discharges and immediately reapplies Impale keeps its attachment. No guessed
warning appears before application. Impale is a presence cue: the display does
not invent DPS or predict the next qualifying hit. Its existing damage, source
attribution, duration and discharge rules are unchanged.

## Configuration and extension

- `src/data/impaleCues.ts` owns the authored body geometry, metal color, screen
  reach, opacity, count, motion and angular scatter.
- `StatusDef.bodyCue` and `screenCue` opt in. All six current Impale statuses
  share this presentation. `bodyCue.group` coalesces related attachments; the
  first active member supplies that group's parts, so members should share a
  profile. Independent groups and ungrouped parts still compose.
- The reusable `lodgedSpikes` part accepts `n`, `root`, `scatter`, `length`,
  `width` and `lean` in radius units. It uses the existing part transforms,
  alpha and palette overrides. Its count is capped at 32.
- The reusable `spike` affliction gesture paints four clipped edge bands.
  `spikeWidth`, `spikeLean`, `spikeBreath` and `spikeInset` customize its shape.
  It shares `metalSpikes.ts` geometry with the body part.
- Impale shares the ailment compositor's opacity budget with bleed, burn,
  poison and Doom; no family is dropped. Several Impale types share one silver
  layer and one body cluster. Existing status colors/pips still distinguish
  their damage types. The ordinary status snapshot supplies co-op parity with
  no new saved state, wire fields, caches or particles.

## Verification

`npm run probe -- afflictioncues` covers all six types, coexistence, grouping,
expiry, cure, dead/downed cleanup and owning-seat snapshots. It also checks a
real hit's Impale bank, its caster attribution, and cue removal on the next
qualifying hit's discharge. `cleave` guards the skill integration and
`defensecues` guards the shared body
cue path. Run `npm run check` and the simulation smoke suite for data edits.

After building, `npx electron balance/impale-cues-ui.cjs` captures the real
renderer at desktop and smaller sizes with disposable saves. Pixel checks
cover all four edges, the transparent combat area, actual body steel,
multi-type grouping, simultaneous ailments, Gentle/Still/Off and cleanup.
Captures and the log live in ignored `balance/reports/impale-*`. The existing
`balance/affliction-cues-ui.cjs` verifies the other ailment materials.
