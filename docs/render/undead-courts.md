# Advanced undead summon anatomy

Seven skill-tree forms formerly borrowed generic warrior, zombie, spirit and
wraith bodies. They now have distinct silhouettes while retaining a common
burial-bone, stitched-flesh and bound-spirit vocabulary with earlier summons.

| Body | Native look | Identity |
| --- | --- | --- |
| Skeletal Sentinel | `sentinel_ossuary_guard` | Broad ribbed pavise, shoulder armor and short sword |
| Skeletal Duelist | `duelist_boneblades` | Narrow exposed skeleton and paired curved sabers |
| Stitched Abomination | `abomination_stitched_brute` | Heavy paired grafted fists, stitched trunk, binding harness and small flesh-colored head |
| Frenzied Ember | `ember_frenzied` | Fire-biting skull, spread jaws and short fiery tail |
| Vigil Flame | `vigil_censer` | Symmetric bone-and-metal cage around a watchful flame |
| Hexwoven Shade | `shade_hexwoven` | Patterned burial veil, grimoire and suspended hex focus |
| Soul Reaver | `reaver_soulscythe` | Long trailing mantle, exposed skull and broad soul scythe |

Only seven `look` references change in `necromancerCourts.ts`. Combat skills,
colors, materials, radii, collision shapes, caps, targeting, lifespan, decay,
AI and placement remain authored by their existing definitions and trees.
The stationary Vigil remains stationary; the Ember remains untargetable.
The Stitched Abomination is the Raise Dead branch, separate from The Amalgam.

`undeadCourtLooks.ts` composes existing skulls, ribs, grafted limbs, bones,
flame anatomy and spirit trails. `undeadCourtGlyphs.ts` adds nine reusable parts:
`ossuaryPavise`, `duelingSaber`, `burialHarness`, `frenziedJaw`, `vigilCage`,
`hexVeil`, `hexSpindle`, `reapingMantle` and `soulScythe`. Placement, scale,
palette roles, mirroring and live drift use the shared vector grammar. The
parts are available to other looks and the Part Forge; they are visual anatomy,
not separately damageable entity components. No new painter branches, runtime
dependencies or external images are introduced.

## Legacy appearances

**Wardrobe → Skill skins → Legacy Undead Courts** is free on all accounts,
attributed to Hollow Wake and registered by `undeadCourtCosmetics.ts`. Its
`paint.summonBodies` map preserves the exact seven former looks and palettes:
Sentinel/Duelist → `skeleton_warrior`, Abomination → `zombie`, both flames →
`spirit`, Shade → `wraith`, and Reaver → `blade_wraith`.

The collection supports Summon Skeleton, Raise Dead, Summon Raging Spirit,
Spirit Pyre and Summon Wraith. Both Spirit Pyre branches reuse Frenzied Ember,
including Banked Pyre's existing size increase. Unmapped base summons keep
their own appearance; this skin preserves the advanced forms. Earlier legacy
collections remain separate choices in the same skill-skin slot.

The existing source-aware resolver handles account defaults, individual skill
overrides, explicit native selection, save/reload and co-op. Summon palette
skins can still layer over either appearance. The generic [form preview
selector](skeletal-mages.md#previewing-multiple-forms) already discovers these
tree variants without additional UI logic or gameplay changes.

## Verification

- `npm run check`, `npm run build`, `npm run probe`, and balance smoke.
- The cosmetics probe validates all seven bodies, registered parts, exact
  old palettes, unmapped-base isolation, incompatible-source fallback and
  saved native overrides. Real casts cover all seven tree branches plus both
  Spirit Pyre branches, comparing native/legacy gameplay and RNG and checking
  source attribution and appearance resolution on a snapshot peer.
- After building, `npx electron balance/undead-courts-ui.cjs` uses a hidden
  window and disposable saves. It checks all seven form previews, all five
  source skills, preview-only browsing, equip/native/inherit behavior, disk
  reload, compact layouts and actual world rendering. Contact sheets and
  screenshots are written to ignored `balance/reports/undead-courts-*.png`.
- The existing `balance/cosmetics-ui.cjs` and game smoke checks guard the
  wider Wardrobe and game boot.
