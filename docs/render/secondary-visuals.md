# Secondary object visuals

Pinning Spear originally landed as a bare barrier and inherited the stone
stake-row portrait. The direct construct census could not catch it: its skill
delivery is a projectile. This pass audits the spawned body as well as its
source delivery.

## Covered paths

| Creation path | Appearance |
| --- | --- |
| Pinning Spear landing, including Gnoll Impaler | Wooden shaft, bindings, broad metal spearhead |
| Impale Lance landing | Barbed bone lance and rear flights |
| Arclight Rain landing | Fletched conductive arrow with forked contacts |
| Hanging Volley placement | Spectral arrow and paired suspended arrowheads |
| Spirit Totem conversion | Carved spirit cage |
| Ritual Ground conversion | Three-legged channel vessel |
| Goading Effigy tree conversion | Forked stake with a bone mask |
| Burrowing Pursuer | Moving earth ridge, without an ownership circle |

The audit also checked every direct World.spawnConstruct call and visible
new-Actor path in the engine. Direct authored constructs retain their previous
43-body census. Catch spots and Cleave recovery already use an axe; Risen
Offering already carries a support-authored look. Decoys and echoes deliberately
copy the owner. Volcano, Spore, Storm and Resonance temporary caster objects
are not displayed actors. These are scoped coverage statements, not a claim
that every effect in the game has been visually inspected.

## Authoring

Original Hollow Wake glyphs live in data/secondaryGlyphs.ts. Their reusable
shafts, heads, bindings and flights compose in data/secondaryVisuals.ts.
No external assets or runtime dependencies are involved.

- ProjectileDelivery.plantOnLand.look selects a landing portrait. The family
  fallback is a spear, independent of whether the mechanical kind is barrier
  or embed. Landing copies the actual final flight bearing.
- ProjectileDelivery.caroms.hang.look selects suspended ammunition.
- SkillDef/SupportDef.constructLooks supplies spiritTotem and channelVessel
  role overrides. Fit-gated host sockets win, then the innate definition,
  then SECONDARY_LOOKS. Appearance metadata is not a mechanical support
  ablation unit.
- ChallengeSpec.device.look and creeper.look select the tree-created bodies.
- LookDef.untargetableAlpha controls native-body opacity for mechanically
  untargetable objects. Physical embeds use 1; suspended spectral arrows use
  .82. Concealment, invisibility, emergence and sight rules still apply.
- SkillFlightProfile.weapon accepts ordinary PartSpec compositions. Eight
  physical missile profiles reuse these parts: Pinning Spear, Wrenched Spear,
  Impale Lance, Arclight Rain, Hanging Volley, Piercing Arrow, Bone Arrow and
  Barbed Arrow. Source wakes remain distinct. Wardrobe heads retain priority;
  non-circular projectile forms retain their native geometry. Shafts trail aft
  within the existing wake envelope; collision geometry is unchanged.

The render code branches on these capabilities, never on skill IDs. Actors
already replicate look, radius and facing; no new network field is required.
Appearance changes preserve targeting, collisions, plant caps/lifetimes,
embed payloads, support casting and ambush activation. The pursuer follows
its measured travel direction and starts with full resources, avoiding a
false wound bar on an invulnerable fresh body.

## Verification

Run npm run check and npm run sim -- run --suite smoke. Existing probes:
presencevisuals, skillflights, goad, supportfabric, payloadcues,
impactstartertrees, castaim, projectilecull and cosmetics.

presencevisuals now calls secondaryVisualChecks: real landings after owner
movement, source overrides/fallbacks, unchanged radii and payloads, copied
peer appearance, four-arrow release, native support conversions, effigy
lifecycle and autonomous Gnoll throwing. Boot validation checks all secondary
look references, including tree nodes.

Build with:

```text
npx vite build --outDir balance/reports/secondary-visuals/dist --emptyOutDir
npx electron balance/secondary-visuals-ui.cjs
```

The hidden client uses isolated saves, real spawns and the production renderer.
It checks eight native silhouettes at four bearings, solid embed opacity,
invisibility precedence and a peer frame, then saves dark/bright contact
sheets and an in-world view under the ignored report directory. Inspect those
images: distinct data signatures alone did not reveal the former ghost fade.
