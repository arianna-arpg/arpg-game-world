# Construct body silhouettes

The native construct pass gives every non-echo construct skill its own persistent
body. Skill deliveries select a `device_*` look through the existing
`ConstructDelivery.look` field. `src/data/constructLooks.ts` composes the bodies;
`src/data/constructGlyphs.ts` adds reusable plinths, forks, braziers, rails,
trap jaws, canisters, arches, rift slits, buttresses, standards, coffers,
hourglasses and fracture marks to the ordinary vector-part registry.

The art is original Hollow Wake work. Geometry, placement, scale, palette roles,
shadow size, ownership marks and optional live parts are data. Any creature, future construct or
mod can reuse these pieces. There are no skill-ID branches in the renderer,
external image assets, new save fields or new network fields.

| Family | Persistent body cues |
| --- | --- |
| Totems and pylons | Brazier, charged fork, magnetized stone, mending cradle, banner or marble column |
| Traps and mines | Open toothed jaws, banded canister, opposed impellers or a stone pressure plate |
| Relics | Shielded coffer, seed cradle or winged reliquary |
| Walls | Bound bones, ribbed cage, masonry, clustered spires, ice fins, stitches or thorn lattice |
| Rifts and gates | Open arch, toothed breach or crystalline slit |
| Organic constructs | Rooted flower, thorn maw, single silk egg, distinct clutches or a fleshy brood sac |
| Other devices | Rail-and-bow ballista, hourglass pad, suspended sun or framed bell |

The existing generic `CONSTRUCT_LOOKS` defaults and old look definitions remain
available for generated/support constructs and content authors. Mirage Archer
and Shadow Clone continue to copy their owner. Persistent art stays separate
from presence arrival/action/retirement cues, skill range effects and the actual
protection dome. Existing visibility, concealment and ownership treatments still
apply. `LookDef.binding` optionally authors ownership-mark parts tinted with
the actor's existing binding color. These constructs use a small rear clasp
instead of a full circle; omitted bindings retain the existing ring, and an
empty list suppresses it. Any look can use this option. A body does not invent
an attack cycle or imply a larger hitbox.

Only delivery `look` fields change in the skill catalogue. Damage, targeting,
lifetimes, collision radii, reservation, capacity, pulses and hatch rules retain
their existing values. Co-op already carries the resolved actor look, so a peer
does not need to reconstruct a source skill. Body parts use the existing sprite
cache; only the two flame accents use the existing live flame painter.

## Verification and review

Run `npm run check`, `npm run probe -- presencevisuals`,
`npm run probe -- cosmetics` and `npm run sim -- run --suite smoke`.
The presence probe also runs `balance/constructVisualChecks.ts`, checking the
native census, part references, real spawning, radii and copied peer appearance.
Its existing execution/control comparisons cover gameplay and RNG.

For visual verification, build in isolation with
`npx vite build --outDir balance/reports/construct-visuals/dist`, then run
`npx electron balance/construct-bodies-ui.cjs`. The hidden harness checks four
facings at native size, visibility, tile bounds and distinct shared-color alpha
masks. It captures bright/dark body studies and an actual world frame, then
renders a co-op snapshot. Profiles, saves, catalogue and PNGs stay under ignored
`balance/reports/construct-visuals/`.

The body sheets omit range effects and foot badges to make the anatomy visible;
the world frame keeps those cues. Enlarged bodies sit beside native-size and
shared-color samples. Pixel uniqueness catches accidental duplicates; it does
not establish instant player recognition in crowded combat.
