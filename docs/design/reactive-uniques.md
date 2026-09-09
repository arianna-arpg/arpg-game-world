# Reactive uniques

Four revised uniques and two new drops share reusable defender conversion,
status relay, typed reaction, sympathy, projectile, and item-choice systems.
Runtime code does not branch on these item IDs.

| Item | Behavior |
| --- | --- |
| The Grounded Lattice | Transfers incoming Shock to the nearest eligible enemy on the same story within 260. Without a recipient, Shock lands normally. Lightning hits have a rolled 30–45% chance to cast Lattice Discharge, with a 1.5-second cooldown. The nova can Shock. |
| The Shared Cup | Keeps its stronger companion bonds and adds weaker flask and orb bonds for every full non-companion minion. Companions receive only the stronger echo. |
| The Galewrights | Attempts a twister every four seconds through the ordinary pulse-proc channel. Twisters last 3.5 seconds, bounce from walls, carom off enemies, and apply physical damage and knockback. |
| The Rote Hand | Rolls one to four different level-one support grafts, each targeting a random one of the eight skill slots. Different fingers may target the same slot. Unsupported combinations remain honestly dormant through the existing graft system. |
| The Storm Tithe | A belt receiving 20–30% of physical hit damage as lightning before resistance, with lightning resistance and lightning damage at the expense of cold resistance. Pairs with the Lattice. |
| A Coal Remembered | A ring receiving 20–30% of cold hit damage as fire. Fire hits have a 40–60% chance to grant Ward equal to 5% of maximum Life, with a two-second cooldown. Adds fire resistance and reduces maximum Mana. |

The Galewrights use the existing 95% ceiling on proc chance, so a pulse can
occasionally miss. Reactions use the owner's ordinary proc modifiers and
cooldowns. The new internal skills scale through ordinary skill levels,
damage modifiers and projectile rules; they do not enter the gem drop pool.
Minion bond ranges are 0.20–0.30 before ordinary item tier scaling, versus
0.50–0.75 for the companion bond. Pooled lightweight throng bodies have no
individual resource/buff sheet; their promoted full actors can receive bonds.

## Extension contract

- `engine/reception.ts`: `takenAs_<source>_<destination>` stats receive a
  fraction of incoming hit damage as another registered damage type. All
  routes read the original bundle simultaneously. Fractions above 100%
  normalize rather than creating damage; converted damage never converts
  again. Resistance then applies to the received type. This can improve or
  worsen survival depending on the defender's resistances. Damage-over-time
  ticks are unchanged.
- `registerStatusRelay`: declarative status, radius and granting stat. Relays
  retain potency and credit the defender. A relayed application cannot relay
  again, preventing mirror loops. Equipment, passives, buffs and other modifier
  sources can grant the same behavior.
- `ProcDef.receivedTypes`: filters reactions by damage composition after
  defender conversion. The `struck` trigger fires on landed skill hits even
  when Ward absorbs the damage; evasion, immunity and passive block do not
  trigger it. Standalone environmental mitigation and DoT ticks do not emit
  this skill-hit event. Synthetic proc skills carry their chain depth through
  delayed impacts; borrowed held skills preserve their existing instance state.
- Sympathy links with `to: ['minions']` and an unlimited recipient cap extend
  the existing restoration/buff/orb dispatcher without duplicate companion
  echoes or a second propagation system.
- The `vortex` projectile shape uses shared geometry and an animated spiral
  drawing inside its collision disc. Existing trajectory bounce, carom,
  re-hit lockout, erratic steering and lifetime rules do the movement.
- `UniqueChoiceGroup.uniqueBy` and option `exclusiveKey` sample distinct
  identities across choice groups. Rote's fingers use the ordinary positively
  weighted support catalog, divided evenly across skill slots. The first
  finger is guaranteed; the other three may be bare. Saved option IDs survive
  option reordering. Older items without choices receive deterministic choices
  from their identity; they do not reroll whenever inspected.

## Validation

`balance/probe_reactiveuniques.ts` covers 49 assertions, including real combat
reactions, full absorption, relay attribution and mirror protection, damage
conservation, more than eight minion recipients, all four graft counts and
eight slots, save round trips, legacy choices, and wall/enemy twister impacts.
The existing slot-graft fixture now explicitly selects its tested fingers.
Initial item numbers are authored balance values, not an endgame balance claim.

Final verification passed all 179 default green probes, all three TypeScript
checks, the production build, and the Electron game boot check. The 25-episode
simulation smoke suite retained its starting-commit damage baselines.

An earlier run exposed an intermittent `probe_speechgrammar.ts` E11 failure
(no inn guest arrives at a furnishing in its 30-second fixture). It also
reproduced on the untouched starting commit `21dbdf2`, then passed in the final
full run; no speech or NPC movement code was changed for this work.
