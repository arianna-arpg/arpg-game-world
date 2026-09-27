# The longlimbs

Four creatures formerly shared the round `stalker` composition. Their native
builds now differ through anatomy, reach, coat and silhouette.

| Creature | Native look | Identity |
| --- | --- | --- |
| Gloom Stalker | `stalker_gloomblade` | Low narrow trunk, swept blade forelimbs, dark back plates and a hooked tail |
| Steppe Strider | `strider_longstep` | Four long angular legs, slender waist, pale neck ruff and forked crest |
| Veilstalker | `stalker_veilmantle` | Ribbed translucent side fins, pale wedge skull and a long whip tail |
| Alpha Stalker | `stalker_packalpha` | Heavy knuckled forelimbs, broad mane, toothed jaw and dorsal plates |

Only the four native `look` references change in their monster definitions.
Their skills, targeting, movement, defenses, tags, natural scale ranges and
rewards retain their existing data. Only Steppe Strider and Veilstalker carry
the native taming tag; this pass does not make the other two tameable.

## Parts and composition

`stalkerGlyphs.ts` adds nine parts to the shared registry: `longlimbTrunk`,
`stiltHindleg`, `bladeForelimb`, `knuckleForelimb`, `wedgeSkull`, `forkedCrest`,
`whipTail`, `veilFin` and `dorsalScutes`. Limbs, crests and fins are single-sided
placements using the existing mirror/rotation/scale grammar. Colors and roles
remain configurable; explicit operation accents retain their own materials.

The compositions also borrow `runningHaunch`, `shaggyRuff`, `prickedEar` and
`scavengerJaw` from the earlier canine kit. No entire creature model is embedded
in a painter. Future entities can mix the limbs, body, jaws, coats and membranes
with other families. All parts bake through the existing body renderer, retaining
its motion and overlays. No new renderer branch, dependency or imported art.

## Legacy Stalkers

**Wardrobe > Skill skins > Legacy Stalkers** is free starter content credited
to Hollow Wake. Under Tame Beast it restores the original Steppe Strider and
Veilstalker bodies, palettes and fur materials. The shared `stalker` look
remains untouched for authoring and for unmapped actors. Wild creatures remain
independent of account cosmetics.

The existing shared tame-preview discovery and skin-aware form selection pick
up both new mappings automatically. No species switch or duplicate preview list
was added. Explicit native selection, account defaults and inherited choices
work through the established Wardrobe path.

## Captured body scale

The real Strider capture/restore test uncovered an existing persistence defect:
normal companions did not save their base radius, and every restored body
rerolled natural variance. For `scaleStats` species that also changed life,
damage, weight and juvenile identity.

The generic fix records `Actor.spawnScale` when natural variance is rolled.
`CompanionSaved.spawnScale` is optional, and the existing saved radius now
applies to normal bonds as well as rare ones. `createMonster` accepts an optional
`spawn.scale`, reusing the ordinary variance, stats, juvenile and mass setup.
Restoration supplies the saved scale and applies the saved base radius before
the normal owner-size fold. Rarity and owner investment therefore remain
separate. No rendered look is consulted for gameplay scaling.

Older saves remain readable. Where a prior save has no original scale, the
normal spawn roll supplies one and subsequent saves retain it. Non-finite or
nonpositive supplied scales use the normal roll. Live replicas already receive
their authoritative radius and stats; this host-side persistence field does
not require a new snapshot field.

## Verification

- `npm run check`, `npm run build`, full probe gate, balance smoke and game smoke.
- `probe_cosmetics.ts`: all four part compositions, exact legacy mappings,
  eligible tame previews, cross-family fallback, native overrides and save choices.
- Actual casts capture both eligible species. Their restored bonds retain stats,
  size and skills through downing/revival; host and peer appearance resolution
  distinguishes local legacy choices from wild bodies and another player's pets.
  Seeded native/legacy runs compare mana, cooldown, stats, radius, skills and RNG.
- Three successive restore cycles cover young/adult and normal/rare Striders
  with owner size investment. Radius, life, damage, mass and juvenile identity
  stay stable. Older saves and invalid scale inputs have coverage.
- Existing companion inheritance, recovery and stance probes pass.
- After building, `npx electron balance/stalkers-ui.cjs` checks real Wardrobe
  controls, family-aware cards, both tame forms, equip/native/inherit, skill
  isolation, disk reload, compact layout, and all four actual actors at enlarged
  and gameplay radii. Portrait overrides are restored. It uses hidden windows
  and disposable saves under ignored `balance/reports/`.
- `balance/cosmetics-ui.cjs` checks the rest of the shared Wardrobe.

The Tame Beast family-art probe now isolates each art through the existing
AI priority policy. Its former one-off skill-bar replacement was overwritten
by companion refresh, so the hound could choose its granted taunt instead.
The updated assertion requires an observed real art execution within the same
time window; it does not change AI behavior or loosen the expected outcome.
