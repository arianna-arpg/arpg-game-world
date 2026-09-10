# Necromancer skill trees — nested mutators

## Comparison checkpoint

The first pass remains on branch `codex/necromancer-shambling-tree`, commit
`de48c303` (Add Shambling Horde skill paths and passive replenishment).
This iteration lives on `codex/necromancer-nested-mutators`.
Compare those branches to recover either the original design or its implementation.

The first pass had three exclusive Shambling Horde identities and ranked side
investments. This pass keeps its passive horde and heavy/rush ideas, but makes
heavy and rush combinable descendants of the casting trunk.

## Tree anatomy

Every tree contains 15 investment nodes, separate from the skill's visual root:

- One generic passive, available before or after either trunk.
- Two mutually exclusive trunk mutators.
- Two middle nodes beneath each trunk.
- Two endpoints beneath each middle node.

Only the two trunks exclude one another. Every descendant requires its parent;
siblings have no exclusion. Shared authoring helpers assign the graph and layout,
while the existing graph engine controls legality, spending, display and save repair.
Every node costs one point. Each generic passive has four ranks; branch nodes have one.

The existing four-point budget remains: one point at skill levels 5, 10, 15 and 20.
All four points may go into the generic passive, preserving the base form while stacking its bonuses. Passive ranks also mix freely with branches.
A complete route costs three points. The fourth buys its sibling leaf, the other
middle route, or the generic passive. Both middle routes plus a leaf also fit.
Cross-middle element selections require five points and therefore cannot both be
reached under this budget; two sibling elemental selections can coexist today.
Changing the investment budget is a separate balance decision, not hidden here.

## Play patterns

| Skill | First trunk | Second trunk | Generic passive |
|---|---|---|---|
| Shambling Horde | Wandering Dead: free, bar-seated replenishment; permanent waiting corpses. Specialize cadence, detection, batches, capacity or durability. | Commanded Dead: cast packs; combine brief fast rushes with fewer heavy bodies, or develop expiry explosions and larger batches. | Stitched Flesh: life |
| Bone Golem | Osseous Might: fighting golems; grow a cohort, a giant commander aura bearer, a sweeping bruiser, or a hybrid. | Keeper's Bulwark: defensive guard, rapid reconstruction, mending, taunts and the close-bound Bone Stand. | Fitted Joints: life and movement |
| Skeleton Archer | Rattling Bows: physical cohorts, piercing arrows, and Rain of Bones with cooldown/area or damage/bleed investment. | Unstrung Sorcery: replace bows with random elemental bolt casters. Invest in population/volatile criticals, keep all four kinds, or narrow the pool to selected elements. | Remembered Training: damage |
| Skeleton Mage (new) | Lich Ascendant: fuse the batch into one larger four-element caster; learn area spells, grow its frame, or command allies. | Grave Academy: a cohort with Cinder Rain, then combinable winter, thunder and plague curricula. | Grave Studies: damage and haste |

Archer-derived mages cast one elemental bolt each. The separate Mage skill earns
its own identity through learned area spells; the Lich starts with all four bolts.
The new skill belongs to the Necromancer discovery pool and enters drops at level 5.
Values are an initial tuning pass, not a claim of final balance.

Bone Stand now turns the golem into a shell attached to the caster. It covers
300 degrees around the caster's facing, leaving a 60-degree rear opening. The
pool absorbs raw hit damage up to 60% of the golem's maximum life times the
caster's guard strength; excess damage on the breaking blow continues normally.
The shell replaces the free body and its usual kit with Marrow Sweep plus any
taught crew arts. Strikes use the ordinary minion pipeline and supports, with a
minimum 2-second interval and each art's own cooldown. Breaking the shell stops
both protection and strikes. After 4 quiet seconds it regenerates 20% of its
capacity per second and reforms at 40%. Damage over time follows its ordinary
path rather than consuming this hit-absorption pool.

The attached body cannot be targeted separately, does not collide with its keeper,
and follows the keeper's position and floor. Its segmented arc shows both coverage
and depletion; broken segments become dashed. The same visual state crosses the
co-op snapshot. Existing anatomical/aura shells retain their own independent pools.
Unseating, dismissal, owner death or tree reset cannot leave its protection behind.
Golem contract slots retain their normal mana reservations and respawn delay.
Command auras from separate bodies stack through the ordinary aura system; cohort
investment therefore offers a deliberate reservation-for-coverage/power trade.

## Shared implementation contract

`SummonDelivery` now exposes reusable summon shaping data:

- `monsterId` or weighted `pool` chooses the body. A trunk replacement clears the
  other identity field in the resolved view, leaving the catalog immutable.
- Pool rows may carry host tags. `selectPool` restricts the possible bodies.
  Multiple selections union; selection order never chooses a winner.
- `crewSkills` and `crewAuras` union across nodes. Native and taught skills are
  installed before support forwarding. Auras use ordinary aura activation and
  are refreshed when the summon's socket configuration changes.
- `crewMods` adds body-local stat modifiers; tags can scope them to particular
  spell elements or deliveries such as Rain of Bones' `storm` tag.
- `escort.distance` changes a body's movement goal to its owner's flank while
  retaining ordinary skill selection, cast gates, collision and recall.
- `shell` attaches a summoned body as a directional guard with configurable life scaling, coverage, regeneration, reform threshold and strike kit. It reads the shared shell absorption and regrowth systems.
- `replenish.interval` remains a free, bar-seated birth clock using normal spawn,
  cap, ownership, lifecycle and explosion attribution. Full pools never churn.

Descendants use additive stats and unioned kits/pools. Exclusive trunks may set
scalar identity fields. Do not put competing scalar replacements on mixable siblings.
`over.tags` changes host tags; `instanceBaseTags` and `skillContextTags(instance)`
carry that identity into stat queries, status prohibitions, support fit and previews.
Pool tags reflect the entire currently possible pool; crew attacks and spells use
their own actual tags. The passive horde loses its obsolete duration tag. An
archer-summoning spell does not pretend to be a projectile attack: its crew is.

Resonance still opens crew support boarding. The live socket gate, spawn forwarder,
preview and simulation census resolve the selected crew. A projectile-only support
can therefore ride an archer's arrows or mage bolts; attack-only support cannot
silently modify a transformed spell. Taught auras and spells expose their own tags.

Any summon tree pick or reset silently retires the old instance's bodies and pending
births, preventing retained powers or old permanent bodies. Passive clocks restart;
active summons require casting again; active golem contracts rebuild after their
ordinary respawn delay. Reservations remain tied to contract slots.

Existing saved allocations use the established graph repair: unknown nodes,
missing-parent picks, excess ranks and illegal rival picks are removed, making
those points available again. An old Grave Rush root does not silently choose the
new Commanded Dead trunk. The preserved branch retains the old save interpretation.

## Verification

- `npm run check`: game, launcher and simulation type checks.
- `npm run probe -- necromancertrees`: passive horde lifecycle, ownership,
  attribution, caps, respec, shared pools and save behavior.
- `npm run probe -- nestednecromancer`: binary anatomy, mixed routes, pool order,
  real mage births, Rain of Bones AI, commander aura, cohort reservations,
  Bone Stand positioning/attacks, respec cleanup and both new Mage identities.
- `npm run probe`: the full fast regression gate.
- `npm run sim -- run --suite smoke`: baseline combat scenarios.
- Production build plus Electron tree interaction and screenshot inspection.
