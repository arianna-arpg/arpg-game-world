# Buffs you can see

The buff bar answers three questions in combat. What is active? How much is
banked? What uses it? A held charge displays its count starting at one. A
threshold such as The Third Voice lights up when the bonus becomes available.
Verse Shelter shows one unit for each Verse actually contributing energy
shield. Hover either tile for the node name, scope and exact modifiers.

## Inventory from the game registries

| Source | Coverage in this checkout | Player HUD |
| --- | --- | --- |
| Direct skill buffs | 48 distinct buff IDs in skill effect lists | Carve shows its stack count on the buff strip. Flame Imbuement shows six flame sockets above its skill. Each qualifying attack empties one. |
| Triggered buffs | 100 registered buff-granting procs | Timed procs and prepared hits appear in the buff strip with their counter, expiry and spend rule. Barbed Reply's thorn tile identifies its contributing tree grant on hover. |
| Beneficial statuses | 43 definitions | Stone Communion, Windswept and other positive statuses have distinct silhouettes above the hotbar. Impale and other harmful conditions still mark the player in the world. |
| Passive conditions and gauges | 455 node definitions and 64 selectable options | Only grants folded into the wearer's build are considered. A small second mark shows the activation condition or resource. The exact counter comes from the stat sheet. Refunds and choice changes rebuild the list. |
| Additional skill-tree buffs | 48 distinct added buff IDs across the skill trees | Each has its own artwork. Hover shows the contributing node and granting skill. |
| Passive combat counters | 15 numeric banks and the two Residual Energy imprints | The bank reports its current count. Each imprint identifies the benefiting attack or spell and shows its remaining time. |
| Named charge banks | 23 families | Each bank has its own shape. A slotted flask carries its sips on the button. Rage, Frenzy and Communion show their counts. Bloodlust's tile lights while the bank drains. |

The magazine follows the granting skill when it moves. Unslotting a skill
with rounds left puts its icon and exact count on the shared strip. The last
spend or expiry removes the indicator. Hover the rail or tile for the spend
rule and time remaining. Oversized banks show an exact count beside grouped
sockets. Multiple banks on one skill stack above its secondary action button.

## Adding content

- Give a buff, beneficial status, charge, passive node or passive choice a
  `buffLook` to choose its subject, body attachment and optional color.
  The subject and color supply the HUD artwork. The attachment pose applies
  to enemies and companions whose buffs the player reads in the world.
- `data/buffLooks.ts` holds the native defaults, condition marks, stack-piece
  budget and modifier-based fallback for new content. The subjects use the
  game's original 24-unit vector art. `BuffEffect.storedCue` continues to
  configure ammunition and spent-charge gestures.
- Direct consumable buffs inherit a slot magazine when they have a source
  skill and stored material. `BuffEffect.buffHud` can select `strip` or
  `skill`. Unattributed buffs use the strip. `VIS_CFG.buffMagazine` controls
  spacing and socket capacity. `render/vis/buffAddendum.ts` routes each effect
  once using the current seat's bar, including on co-op mirrors.
- Conditional grants are compiled with the allocated tree. Lines with the
  same condition, gauge and threshold share one tile. Different gauges
  retain independent counts. Tagged bonuses show their skill restrictions on
  hover. Passive penalties alone, permanent stat lines, proc chances and
  instantaneous heals do not create a lasting positive-effect tile.
- Player bodies show incoming rider impacts, wound payouts and physical
  states such as flight and concealment. Buff materials, prepared-ammo
  counters, combo rewards and stationary-stance markers belong on the HUD.
  Stored Iron Ward power fills its buff tile as the ward absorbs hits.

## In-game checks

`npm run probe -- buffpresentation` checks registry coverage along with
allocation, option removal, threshold crossing, charge counts, a resolved
Barbed Reply, independent expiry and co-op state. `node balance/debuff-coverage.cjs --buffs`
captures the real hotbar at six and one loaded attack, after the last spend,
with the skill unslotted, with passive and status buffs, and while impaled.
It checks both hover destinations and compares player pixels at the same
pose and time. The preview is written to `balance/reports/buff-coverage.png`.
