# Living rubble and golem contracts

Stone, Bone, Fire, Ice and Blood Golem are all reserved, self-rebuilding
companions. Stone now participates in the same major-golem capacity pool and
exclusive type group. Rubblekin are a separate reserved flock that can accompany
any major golem. Item-granted independent companions retain their own lifecycle.

## Capacity and type choice

`SummonDelivery.poolGroup` names shared capacity. `exclusiveGroup` names mutually
exclusive summon types. Neither implies the other. Both are per owner, and both
use the resolved summon delivery. All five major golems currently declare both
as `golem`, preserving one active major-golem type even with extra slots.

- Shared pool, no exclusive group: multiple types may coexist within capacity.
- Same exclusive group, different pools: activating one type dismisses the other.
- Neither: the usual per-skill limit.

`persistent.slots` optionally requests a fixed number of reserved slots, plus
the skill's `summonCount` investment. Omit it to request the effective maximum.
For example, two skills with `maxActive: 2`, the same `poolGroup`, no
`exclusiveGroup`, and `persistent.slots: 1` can each own one paid slot.
Capacity remains the normal `minionMaxCount` fold. Existing reserved claims,
including dead bodies awaiting reconstruction, take precedence. A full pool
refuses another reserved contract before payment. Dismissal frees its claims.
Live changes reprice actual allocated slots and retire excess bodies and queues.
Automatic reconstruction never evicts another living body to make room.

`engine/summonContracts.ts` is the shared slot resolver used by cast admission,
activation and reconciliation. Individual-body offspring and item companions
retain their existing separate limits. No engine condition names a golem skill.

## Gather Rubblekin

`src/data/rubblekin.ts` owns the skill, bodies, native attacks, launch payloads
and assembled appearance. The summon enters the normal skill discovery/drop
catalog; payload arts are `noDrop`. `rubblekinTree.ts` owns the 15-node tree.

Base tuning:

| Property | Value |
| --- | --- |
| Starting flock / maximum | 4 / 4 |
| Reservation | 8 mana per slot |
| Activation cost | 12 mana |
| Rebuild after death or release | 4 seconds |
| Formation | 42 units ahead of its keeper |
| Body | 38 base life, 22 armor, radius 9 |

Rubblekin use ordinary owner scaling, minion skills, commands and support
forwarding. The `rubblekin` and `earthborn` families permit future scoped
investment; `earthborn` includes Stone Golem. Rubblekin do not consume major
golem capacity or inherit a major-golem family cap bonus.

## Strike a stone

The reusable `SummonDelivery.strikeRelease` names a projectile skill, required
strike tags and reconstruction duration. Its art automatically enters the
resolved crew kit, previews and support census. The art has no AI hint, so the
body cannot independently fire a launch that requires the keeper's strike.

Actual melee footprints activate receptive owned bodies: narrow arcs, Cross
Jab's band, sigil shapes and traveling melee sweeps. Contact must be on the same
story and inside the attack geometry. Foreign summons, item companions,
offspring, untargetable bodies and bodies already reconstructing are excluded.
No friendly damage, allied hit event or death event is generated. Existing
attack resource behavior is unchanged; launching does not add hit rewards.

The body executes its own projectile art through the normal skill pipeline.
Damage, kills, ailments and projectiles therefore retain the minion and its
summoning instance as their source. Compatible supports board through the
existing **Resonance** rule; projectile count creates fragments, never new
living bodies. Pierce, explosions, returns, salvos and other admitted projectile
behaviors use the existing engine. The striking skill determines contact, while
the Rubblekin skill supplies the launched payload's investment.

A released body occupies its original reserved slot. During reconstruction it
cannot act, move normally, collide with actors or be targeted; its loose pieces
gather visibly in place. It keeps its life and ordinary regeneration, rather than
receiving a free heal. Its existing projectile volleys can finish while it
reconstructs. Normal deaths still use the summon contract's respawn queue.
Dismissal, owner death, unseating and tree changes retire captured release work,
including projectiles whose original body has since died. Co-op carries the
reconstruction clock and clears it when absent.

## Tree identities

- **Flint Children:** piercing bleeds, stronger ailments, more piercing or
  Impale; a larger flock, tougher/faster bodies or extra fragments.
- **Bursting Seams:** impact/end-of-flight explosions, faster reconstruction,
  wider blasts or explosions at pierced contacts; slower traveling conduits
  with repeated area hits, longer residence or heavier damage.
- **Patient Stones:** four neutral ranks of minion life and damage for players
  who want the baseline flock, including a passive leader playstyle.

Sibling modifiers accumulate. The tree uses the normal four-point budget and
save representation. These are initial playable values, not final balance.

## Verification

`npm run check`, `npm run probe -- landslide`, the summon-fill, unique-accords,
relic-uniques, nested-necromancer and precision-starter probes, and the sim smoke
suite cover contracts, real contact, attribution, sockets, both identities,
queues, reconstruction and co-op. `balance/landslide-ui.cjs` exercises the built
game with disposable saves and writes visual captures to `balance/reports/`.
