# Living uniques

Five new uniques and two revised ones explore movement, followers, and terrain.
Content lives in `src/data/uniques/living.ts`; shared payload skills live in
`src/data/livingSkills.ts`. No executor branches on a unique item ID.

## The items

| Item | Behavior | Scaling and trade |
|---|---|---|
| **Cinderstep**, hybrid armor/ES boots, level 8+ | Actual movement leaves fire lasting 2.4 seconds, ticking every 0.4 seconds with a chance to Burn. Walking and movement skills both qualify. | Rolled trail power, character level, spell/fire damage, and area investment. Movement speed and damage against Burning enemies; reduced cold resistance. |
| **Oath of the Pale Watch**, ES chest, level 14+ | Grants an off-bar spectral vanguard. Empty roster seats refill automatically, including after the entire watch dies. | Spectres use the keeper's level and ordinary minion investment. Grant rank raises the cap and shortens replenishment time. Increased minion life/damage, reduced wearer damage. |
| **The Lineage Knot**, opal amulet, level 12+ | Permanently rolls one attribute family: Strength/Prowess/Fortitude, Dexterity/Finesse/Charisma, or Intelligence/Wisdom/Willpower. Minions and companions inherit 15–25% of that family's per-point benefits. | Reads the keeper's current effective attributes, including gear. Benefits update on existing followers; reduced wearer mana. |
| **The Common Pulse**, coral ring, level 8+ | Minions and companions inherit 20–30% of the keeper's Vitality benefits. | Grants Vitality and healing power, but reduces ward gain. A second use of the same inheritance registry. |
| **Winter After You**, poise belt, level 10+ | Movement leaves short-lived chilling rime. | Uses the same trail executor as Cinderstep with a different skill payload. Damage against Chilled enemies and ES; reduced fire resistance. Can coexist with Cinderstep. |
| **The Gleaner's Crown**, existing helmet | Retains extra throng pockets and rolls Cinderkin, Palewisps, or Gnatlings. Finds have a 45–70% chance to take that body type while belonging to their original skill. | Zone pockets roll once per cluster; motes and other individual finds roll per body. Original collection rules, caps, batch divisor, supports, and commands remain. |
| **The Borrowed Breath**, existing amulet | Retains eased breath drain. Reveals personal air pockets across zone types: 25% more damage while standing inside, 18% increased movement speed outside. Pockets also let the wearer recover breath underwater. | A positional choice with stable locations per zone/story. No permanent terrain edits. Removing the item removes its fields and bonuses. |

These are initial tuning values, not an endgame balance claim. New items enter
the normal unique catalogs with base, minimum level, and drop weight. The
existing development item forge can mint them by the IDs in the content module.

## Reusable extension points

- `registerTrailGrant`: a named stat `trailGrant_<id>` selects a normal skill
  payload, distance threshold, patch duration/radius/tick, and patch ceiling.
  Any source that supplies that stat can produce a trail. Ordinary hit/status
  resolution handles scaling, resistance, damage credit, and kills. Patches
  retain their story, expire naturally, and survive removal only for their
  remaining lifetime. No casts or sockets are required. Payload skills are
  internal skills, so these trails do not have a separate socket interface.
- `registerWornThrong`: the existing gear-throng registry now accepts `at:
  'roster'` for direct replenishment and `release: 'dismiss'` to dissipate on
  unequip instead of leaving reclaimable husks. Existing ring/husk sources
  retain their behavior. Timer, rank growth, cap, species, and hunting radius
  are data. The existing minion runtime supplies combat and owner scaling.
- `registerAttributeBequest`: `bequest_<id>` supplies a share of named
  attributes to minions, companions, or both. It consumes `ATTRIBUTES`' own
  per-point modifiers instead of duplicating Strength/Dexterity/etc. formulas.
  The `bequest` sheet source is separate from native and owner-minion sources.
  Shares are clamped by the registry, apply throng batch scaling once, and
  update from original owner attributes; inherited benefits do not recurse.
- `UniqueDef.choices`: weighted alternatives contain ordinary ranged item
  lines. `ItemInstance.uniqueChoices` stores group and option IDs plus numeric
  rolls, so reordering definitions does not reroll gear. Drop generation,
  forging, stat compilation, descriptions, and save rebuilding use this one
  representation. Forge quality pins choice magnitudes too. Old items gain a
  deterministic choice using their identity, without consuming combat RNG;
  a retired option migrates on that same group-local stream. Keep IDs stable.
- `registerThrongSubstitution`: `throngMorph_<id>` chooses a found body's
  physical species independently of its anchor affinity. Rendering/collection
  use affinity; species controls its own kit. The original anchor still owns
  commands, caps, and investment. Save rows group by both anchor and body kind,
  and restoration enforces one aggregate cap across mixed rows. Adding another
  species or source of transmutation is a registry/modifier edit.
- `registerPocketGrant`: `pocketGrant_<id>` reveals deterministic clear circles
  with configurable count, radius, smaller-interior fallback, color, optional
  survival refuge resource, and inside/outside modifier bundles. The existing
  native region named by `regionId` also qualifies for the inside bonus. The
  circles used by gameplay are the circles sent to guests and drawn on screen.
  Host snapshots carry owner-specific fields; absent fields retract them and
  stale-zone snapshots cannot overwrite current fields.

## Interaction boundaries

Movement trails sample displacement and emit at most one patch per frame.
Teleports mark their destination rather than drawing fire across the intervening
walls. Story changes reset the odometer; zone changes clear transient memory.
The two registered trails have independent limits and can overlap.

The optimized lite swarm deliberately has no stat sheet, as documented in
`docs/engine/lite.md`. Like ordinary minion investment, bequests apply when a
pooled body promotes for a real interaction. They do not change the pool's
fixed contact damage or ply count. Substituted kinds stay as full actors so
their distinct kits cannot silently become the original pooled species.

The Crown changes newly generated finds, not followers already gathered. A
Gnatveil Cinderkin follows Gnatveil's orders with a Cinderkin's own combat kit;
it does not acquire a gnat's innate anatomy. Directly replenished bound rosters
are not found husks and do not transmute. Native matching-kind finds need no
substitution. Co-op uses the existing first-attuned-seat rule for shared zone
pocket generation; individual event finds use their generating keeper.

Borrowed pockets are personal tactical overlays. They do not convert lava,
remove walls, or shelter other players automatically. Placement checks solid
ground and caches the field for each zone/story; walking and re-equipping do
not move it. Cramped zones can receive smaller circles. A completely blocked
surface cannot receive a refuge. Landing on the circle matters: airborne
movement does not receive the standing damage bonus. Native air-pocket regions
also grant the inside bonus while wearing the item. Pockets prevent the named
terrain survival drain, not unrelated attacks or externally held survival loss.

## Verification and integration

`balance/probe_livinguniques.ts` is enrolled in the default gate. It covers
catalog references, item rolls at three depths, descriptions, legacy choice
migration, option reordering, forge quality, real walking/dashes and damage
credit, story separation, timed vanguard loss/replenishment/combat/save/removal,
live follower inheritance and noncompounding, promoted swarms, transmuted
Gnatveil collection/commands/save/caps, dry-zone and cramped-zone pockets,
underwater recovery/drain, removal, and authoritative snapshot convergence.

This work continues `codex/emergent-uniques` on the `codex/system-audit`
ancestry (`d316506`), following the first unique examples at `038dbdd`.
Integration with the generation branch or later concurrent Claude changes
still needs review and verification. In particular, preserve both the new
`living` catalog append and any concurrent edits to the two existing uniques.

Checkpoint verification (2026-09-09): `npm run check` and `npm run build`
passed. The focused rig passed 112 assertions with retries disabled. The
default gate passed 178/178 probes, with `probe_authoredmaps.ts` D21 requiring
its permitted retry (also observed at the preceding checkpoint). All 25 smoke
simulation episodes completed with unchanged reported metrics, including the
existing provisional magician TTK flag. The desktop game smoke check passed
outside the sandbox with an isolated temporary profile; the sandboxed attempt
could not launch Electron's renderer. Slow/excluded probes, a desktop frame
performance sweep, and hands-on endgame balance were not assessed.
