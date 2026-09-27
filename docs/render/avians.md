# Feathered hunters

Hunting Falcon, Dune Vulture and Carrion Shrike previously shared the `vulture`
look: one round body and swept triangular wings. Their new silhouettes
distinguish a hunting companion from two wild predators through feathered
anatomy, not just palette or size.

| Body | Native look | Identity |
| --- | --- | --- |
| Hunting Falcon | `falcon_huntress` | Narrow swept pinions, dark mask, short barred tail and forward grasping talons |
| Dune Vulture | `vulture_carrion` | Broad fingered pinions, heavy body, short fan, feather collar and exposed neck |
| Carrion Shrike | `shrike_masked` | Compact barred wings, pale masked head, hooked bill and long split tail |

Only the three `look` references change in `monsters.ts`. Radii, colors,
materials, collision shapes, flight, AI, skills, carrion feeding, predation,
leaps, latch eligibility, reservation and replenishment remain unchanged.
The falcon remains a radius-7 flying companion. The two wild birds still use
their existing grounded/leaping behavior; feathers do not grant flight.

## Reusable kit

`avianGlyphs.ts` contributes ten parts through the existing `GLYPH_PARTS`
registry: `sweptPinion`, `splayedPinion`, `barredPinion`, `avianKeel`,
`hookedBeak`, `bareCrop`, `quillFan`, `splitQuills`, `raptorMask` and
`graspingTalons`. Each is ordinary vector data, in body-radius units with +X
forward. The single-sided wings and talons can be mirrored or placed alone;
tails, neck, mask and bill remain independent from the torso.

`avianLooks.ts` combines these with existing body discs, eyes and the earlier
summon kit's small feathered wings for the vulture's collar. Shape, placement,
scale, rotation and palette roles are all editable through the shared grammar.
All ten parts bake into the regular body sprite; existing actor flight lift,
idle breathing, turning and leap poses move the complete assembly. There is
no new per-frame painter, gameplay branch, image dependency or damageable
entity-part hierarchy. Other creatures and Workshop looks may reuse the kit.

## Retained appearances

**Wardrobe → Skill skins → Legacy Hunting Falcon** is a free starter cosmetic,
attributed to Hollow Wake and compatible with Cast the Falcon. It restores the
original `vulture` composition with `#c8a86a` and flesh material. The existing
source-aware summon-body resolver handles account defaults, individual skill
overrides, explicit native selection, save/reload, replenishment and co-op.

The shared `vulture` composition is unchanged and remains available for
authoring all three former appearances with their original palettes. Wild
vultures and shrikes use their new native bodies; player Wardrobe choices do
not change wild creatures. The contact sheet's old wild birds are reference
renders of the retained composition, not additional player skin choices.

## Verification

- `npm run check`, `npm run build`, `npm run probe`, and balance smoke.
- `probe_cosmetics.ts`: native part references, distinct bodies, exact Falcon
  legacy, preview and saved native selection, wild-body isolation, real
  casting/latching/vulnerability/death/replenishment, and peer appearance
  resolution. The lifecycle compares gameplay metrics and RNG under both skins.
- After building, `npx electron balance/avians-ui.cjs`: hidden real renderer
  with disposable saves; all three bodies at enlarged and actual radii,
  original reference bodies, native wild/companion world frames, Falcon
  preview/equip/native/inherit controls, incompatibility, disk reload and
  compact Wardrobe. Temporary portrait overrides are restored before the
  world checks. Captures go to ignored `balance/reports/avians-*.png`.
- Existing `balance/cosmetics-ui.cjs` and game smoke cover the wider interface
  and boot path. The standard gate also exercises the native Falcon tree and
  wildlife behavior harnesses.
