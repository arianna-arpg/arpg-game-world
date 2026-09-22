# Account Reliquary and Oracle reserve

The Oracle rescue, iron cage, furnished Lastlight home, town expansion and later-life commander/Magic Memory reward remain unchanged. Explicit Memory choices still use `isSkillUnlockedForSelection`; a pending class only enlarges the drop pool.

## Ownership and use

The account owns Relic bodies, the equipped grid and an unbounded, searchable reserve. Equipped Relics remain equipped across lives, character changes, death and reload. Only equipped Relics contribute stats. Oracle buttons deposit loose finds, equip a stored Relic in the first available seat, or return equipment to reserve. The inventory drawer retains exact grid placement and rearrangement. Aimed placement can exchange one occupant directly into reserve; preview and mutation share `containerLanding`.

Changes require the living local host to reach the Oracle service. The original first-charm lesson still allows initial seating on the road, which also banks the item. Newly found loose Relics remain run property until deposited or seated; the UI states this distinction. Account property cannot be sold, dropped, traded, withdrawn to the bag, or placed in corpse loot.

Only the primary local host manages its account collection. Remote and couch seats cannot mutate or borrow it. Each seat's derived empowerment travels alongside equipment for client stat views. Separate guest account storage synchronization is not implemented.

## Repeatable investment

At the Oracle, **Teach me to empower the Reliquary** permanently unlocks the Reckoning investment card for free. Investment uses existing Mortal Essence, distinct from live crafting essence. One click pours up to the remainder needed for one rank; surplus stays available for other Vault choices. Partial investment survives sealing Reckoning.

All tuning lives in `src/data/reliquary.ts`:

| Current rank | Next rank cost | Power after completion |
| --- | ---: | ---: |
| 0 | 25 Mortal Essence | +5% |
| 1 | 100 | +10% |
| 2 | 225 | +15% |
| 9 | 2,500 | +50% |
| 19 | 10,000 | +100% |

Cost is `25 × (rank + 1)²` for each rank. Power is `rank × 5%`, increasing linearly. The numerical safety ceiling is one million ranks, far beyond intended practical play; prices remain safe integers. These are initial tuning values, not a measured endgame balance curve. Rank one is cheaper than the 60-Essence First Ring. Partial payments provide a use for smaller Reckoning remnants without losing them at the seal.

## Relic values and safe scaling

Ordinary Relic affix maxima become 20% of their previous values. The worst-tier floor is 85% of that reduced maximum; exquisite tiers add just 3%. Higher item levels still unlock tiers and unique identities, but the numeric gap is small. Authored affix debuts add variety: area/projectile speed/duration at 5, all resistance/cooldown at 9, leech at 12. Every Relic can be equipped at player level 1.

Unique Relic lines evaluate at tier 1. Eligible positive numeric bonuses receive the same 20% baseline factor. Fixed grants, reservations, board amplifiers and negative tradeoffs retain their authored values. Stored rolls and unique choices survive; migration never rerolls items.

`engine/relicPower.ts` derives effective modifiers from freshly compiled item mods. Eligible numbers multiply once by `(1 + account power) × board factor`. Only explicitly listed positive flat/increased stats participate. Grants, overrides, more multipliers, negative tradeoffs, unknown stats and feedback links remain raw. Board amplifiers are consumed once and cannot amplify one another. Rate-like contributions have per-line caps, including movement +100%, crit chance +50%, leech 10%; ordinary sheet caps still govern totals. Life, damage and other open numeric budgets have no policy cap.

The UI labels item values as baseline and displays account empowerment separately. The character sheet's container source contains the effective modifiers.

## Relic followers

Granted summon instances and independent companion grants carry a `relicSource` item identity. An ordinary learned copy of the same skill remains an ordinary summon. Relic followers use the standard monster level fold at `floor(player level × 1)`. Their attributable `relic:<item identity>` sheet source supplies damage at 35% and life at 60% of the ordinary body, multiplied by `1 + account power`.

`minion.ordinaryStats` defaults to zero, detaching ordinary owner minion investment. A configurable fraction blends normal inherited stats toward base values. Ordinary summons remain unchanged; Relic skill instance effects and native summon behavior still use the shared summon path. Living followers refresh on level/build changes while preserving their life fraction. Switching sources removes the previous Relic modifier source. Grant removal retires its follower; death/reformation and travel retain the existing companion lifecycle. Multiple matching idols keep the existing one-follower/summed-grant-level policy. Empowerment never multiplies grant levels.

## Persistence and migration

`Account.reliquary` owns item bodies, equipped identities, rank and partial investment. Character saves omit account-owned Relic bodies. The primary live board references canonical account items, including granted-skill state. Account writes accompany character saves and durable quit saves.

Old saves import seated Relics with coordinates and loose Relics into reserve. Account corpse Relics migrate at World construction; character corpse Relics migrate on adoption. Roster saves migrate lazily when opened. Invalid/retuned grid placements return to reserve rather than the floor. There is no compatibility reset.

Stable character/run scope plus original uid identifies each legacy item. A stored `relicKey` survives subsequent moves. Replaying an import cannot replace the account's item or equipped selection. Pre-character-id saves use their persisted expedition seed as scope. Current saves carry an `accountRelics` marker, so reloading does not bank loose new finds for free. Both pickup paths discard stale ground echoes of already banked items.

Migration cannot recover Relics already deleted by older completed runs, or distinguish deliberately fabricated identities in edited legacy files. It preserves valid instances still present in compatible saves and corpses.

## Verification

`probe_accountreliquary.ts` checks costs, linear power, partial payments, authority, swaps, death, save roundtrips, migration replay, safe stat scaling, baseline level differences and attributable followers. Existing `probe_reliquary.ts` and `probe_relicuniques.ts` retain grid, amplifier, grant, wire and lifecycle coverage with account ownership expectations. `balance/oracle-rescue-ui.cjs` covers rescue, both lives, reserve and investment controls in a hidden renderer with isolated saves.
