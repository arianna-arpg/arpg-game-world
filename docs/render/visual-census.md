# Catalogue body and weapon visual census

This follow-up extends the secondary-object audit beyond direct constructs.
The fully registered catalogue contains 1,191 actor definitions. Nine had no
composed look; the only intentional no-look template is Shadow Self, whose
Vessel of Shadow summon copies its owner's appearance.

## Remaining bodies

| Body | Composition |
| --- | --- |
| Bound Phylactery | Canopic soul jar, carved stopper, inset soul and binding |
| Barred Door | Timber slats, diagonal brace, iron bands and lock |
| Quag Gel / Quag Gelling | Asymmetric lobed bodies, mouths/eyes and live ooze |
| Pale Watcher | Folded stone wings, robe, mask and fractures |
| Velketh, the Enthroned Husk | Carapace, roots, ribs, crown, maw and eyes |
| Husk Arm | Articulated palm, three claws and fractures |
| Primeval Spawn | Six legs, carapace, scutes and mandibles |
| Cinderling | Tail, shell, lava cracks, horns and live flame |

Original parts live in data/fieldActorGlyphs.ts and compose with existing
parts in data/fieldActorLooks.ts. Definitions select ordinary look IDs.
No changes to mechanical radii, material, behavior, ambush, attachment or
reconstruction rules are required. The phylactery check also exercises the
real Lich death/reconstruction route, rather than only a catalogue spawn.

## Physical missiles

data/weaponFlightVisuals.ts contains reusable families for arrows, darts,
lances, knives, hooks, spinning blades, axes, cards, shuriken, grenades,
stones, slugs and feathers. Eight new original glyphs compose with the
secondary-weapon and device parts already in the game. Thirty-four more
source profiles select these parts, bringing the physical-weapon total to
42. Related weapons share anatomy; their source-specific wakes remain.

SkillFlightProfile.weapon accepts PartSpec[] as before. Optional weaponPose
configures radius-relative x/scale and radians-per-simulation-second spin.
Finite values are bounded by the painter. Cosmetic wardrobe bodies still
take precedence; source identity follows the existing co-op snapshot.

Six native line flights (Spectral Helix, Chain Pull, Orbital Blades, Gaff
Cast, Voltspear and Blightspear) previously bypassed weapon anatomy and
remained solid bars. The shared painter now inlays the parts inside their
PROJ_FORM_GEO.line rectangle, retaining the entire contact boundary and
clipping all artwork to it. The inlay rotates independently of that boundary.
Other non-circular forms keep their existing painter. Circular weapon shafts
still trail inside the existing culling envelope. Collision geometry is
unchanged; no skill-ID branches were added to the renderer.

These are original in-repository vector parts, with no external assets or
runtime dependencies. Part placement, palette roles and family composition
remain data-driven.

## Coverage and verification

presencevisuals now audits every registered actor definition for a look or an
explicit owner-copy policy, resolves every look and part reference, exercises
all nine new bodies and an actual Vessel of Shadow copy, and verifies peers.
skillflights casts all 42 physical missiles through the engine, including
multi-press marker releases; checks finite balanced painting, clipping against
line collision bounds, unchanged geometry and copied source identities.
Its existing census covers all 183 projectile, six beam and 221 field/aura
profiles. Intentional shared family art is not an error.

Required local checks:

```text
npm run check
npm run sim -- run --suite smoke
npx tsx balance/probe_presencevisuals.ts
npx tsx balance/probe_skillflights.ts
npx tsx balance/probe_skeletonmage.ts
npx tsx balance/probe_projectilecull.ts
npx tsx balance/probe_cosmetics.ts
npx vite build --outDir balance/reports/visual-census/dist
npx electron balance/visual-census-ui.cjs
```

The hidden client uses isolated saves and real casts with the production
renderer. It reveals ambushers through their native emergence, checks nine
native body masks at four bearings, captures 42 flights at two simulation
ages, checks a peer frame, and saves dark/bright sheets under
balance/reports/visual-census. The sheets include native-size and common-tint
samples; inspect them, because registered metadata alone missed the line
renderer bypass.

This census guards against missing bodies and weapon rendering routes.
It does not claim that every possible support combination, effect, terrain
or future piece of content has been manually inspected.
