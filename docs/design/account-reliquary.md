# Account Reliquary and Oracle reserve

The Oracle rescue, iron cage, furnished Lastlight home, town expansion and later-life commander/Magic Memory reward remain unchanged. Explicit Memory choices still use `isSkillUnlockedForSelection`; a pending class only enlarges the drop pool.

## Ownership and use

The account owns Relic bodies, the equipped grid, carried identities and a finite, searchable grid stash. Equipped Relics remain equipped across lives, character changes, death and reload. The inventory Reliquary is the equipped board; Oracle storage is a separate vendor-like screen that opens alongside the pack. Drag between stash and pack, then equip or unequip from the inventory while out of combat. A bag-to-board swap returns the displaced Relic to the vacated bag cell or first fit; a reserve-to-board exchange proves room in storage. Every refusal leaves both owners unchanged.

The inventory drawer toggles the whole account Reliquary once it is unlocked. Disabling removes Relic modifiers, grants and attributable followers, as well as the XP penalty. Changing equipment or toggling requires five seconds without combat, no nearby pressing foe and no active cast. The toggle preserves player life fraction and persists across characters. While enabled, player XP gains are reduced by 2% per occupied square, including every square of larger Relics. A fully occupied 25-cell board reduces XP by 50%. Fractional awards accumulate so small rewards cannot bypass the cost. Bag and stash Relics are inert. All rates and the calm period are configurable in `data/reliquary.ts`.

Only equipped Reliquary and Oracle-stored Relics are protected from death. Every pack Relic is destroyed on a final death, including new finds, withdrawals, unequipped pieces and locked items. Disabling the Reliquary does not remove its death protection. A revivable co-op down is not a final death.

Storage starts at one 6×4 page, with a maximum of eight. The Vault sells additional pages independently of equipped-board expansion and empowerment: 40, 160, 360, 640, 1,000, 1,440 and 1,960 Mortal Essence. Partial payments survive sealing; surplus stays available. Search dims nonmatches in place, preserving the true occupancy, and shows match counts per page. Right-click withdraws/stores; page-content controls also allow an unlocked stored Relic to be permanently released after an inline confirmation. Released identities cannot be resurrected by replaying an old save.

The shared storage engine, safety rules, migration and personal Immortal lockers are documented in `docs/engine/stashes.md`. Tuning lives in `src/data/stashes.ts`.

Storage transfers require the living local host to reach the Oracle service; inventory Reliquary changes require calm. The original first-charm lesson still allows initial seating on the road, which also banks the item. Newly found loose Relics remain run property until deposited or seated; the UI states this distinction. Account property may pass through the bag, but pack custody is at risk: death removes that body from the account and records its identity as lost. It cannot be sold, manually dropped, gifted, or placed in corpse loot. Relics never enter corpse loot, even if a future policy permits ordinary bag drops.

Only the primary local host manages its account collection. Remote and couch seats cannot mutate or borrow it. Each seat's derived empowerment travels alongside equipment for client stat views. Separate guest account storage synchronization is not implemented.

## Repeatable investment

At the Oracle, **Learn Reliquary Empowerment** exposes the account upgrade in the Vault's **Memories & Power** category. It uses the normal unlock card, price, investment bar, hold-to-invest, keyboard purchase and completion receipt. A click buys when affordable; holding invests gradually. Partial investment survives sealing and reload. Stash pages use the same cards under Town, independent of the empowerment lesson. Player-facing copy uses the normal Unlock wording and does not explain the cost formula.

All tuning lives in `src/data/reliquary.ts`:

| Current rank | Next rank cost | Power after completion |
| --- | ---: | ---: |
| 0 | 25 Mortal Essence | +2% |
| 1 | 100 | +4% |
| 2 | 225 | +6% |
| 9 | 2,500 | +20% |
| 19 | 10,000 | +40% |

Cost is `25 × (rank + 1)²` for each rank. Power is `rank × 2%`, increasing linearly. The numerical safety ceiling is one million ranks, far beyond intended practical play; prices remain safe integers. These are initial tuning values, not a measured endgame balance curve. Rank one is cheaper than the 60-Essence First Ring. Partial payments provide a use for smaller Reckoning remnants without losing them at the seal.

## Relic values and safe scaling

The account-scale numerical pass already reduced ordinary Relic affix maxima to 20% of their original authored values. That baseline remains. Relic affix progression now uses **one normal tier**, rolling 85–100% of that reduced maximum, and an optional **magic-only exquisite tier**, rolling 100–103%. Leech has only the normal tier. Both tiers unlock at the family's discovery level, with the same selection weights at every later level. There is no higher-level life ladder: normal life rolls 5.44–6.4 and exquisite life rolls 6.4–6.592 before display rounding, whether found at level 1 or 80. Every Relic can be equipped at player level 1.

`RELIQUARY_CFG.affixTiers` owns the best-first windows, rarity restriction and weights; `affixDebut` owns family discovery levels (unlisted families default to 1). `itemaffixes.ts` owns each family's stats, predicates, authored maximum, name and drop weight. The same compiled `AffixDef` serves ordinary drops, themed caches, crafting, Oracle rerolls and tooltips. Magic overroll cannot bypass a family's debut. Ordinary equipment keeps its existing level-based ladder. Neither the Vault's +2% per rank nor its prices change in this pass.

| Item level | Newly droppable families |
| --- | --- |
| 1 | Life, mana, energy shield, armour/evasion, general and basic delivery damage, physical damage, attack/cast/movement speed, regeneration, accuracy and individual resistances |
| 5 | Area, projectile speed, duration, minion damage/life, area and elemental damage, critical chance/multiplier |
| 9 | All elemental resistance, cooldown recovery, luck, chaos damage; damage while stationary |
| 12 | Leech, channel/construct/conjure/javelin damage; damage after blocking and life regeneration at low life |
| 16 | Damage against low-life targets; movement speed after evading |
| 20 | Damage against hard-controlled targets; cast speed during energy-shield recharge and attack speed after a movement skill |
| 24 | Damage after varied casts or repeated casts |

Earlier families stay in the drop pool. Later discoveries add choices with narrower uses, rather than replacing early life/defence bonuses with larger ones. New conditional damage maxima are 3.6–5.2% before exquisite/account/board scaling, versus 1.6% for unconditional damage. New conditional speed maxima are 2–2.4%; low-life regeneration reaches 1 life/second. These are initial budgets for this content pass, not a measured endgame optimum. The standard actor conditions, recency windows, cast history and victim tags control activation; no Relic-specific combat callbacks or new timing rules are introduced. All new lines use existing scalable stats, so empowerment preserves their predicates and attribution.

Unique Relic lines evaluate at tier 1. Eligible positive numeric bonuses receive the same 20% baseline factor. Fixed grants, reservations, board amplifiers and negative tradeoffs retain their authored values. Stored rolls and unique choices survive; migration never rerolls items.

The original six unique identities and their numbers are unchanged by the tier/discovery pass. The subsequent [unique pool expansion](relic-unique-pool.md) adds twelve identities and a configurable one-equipped-copy default. On loading an older ordinary Relic, the shared item restore clamps former lower-tier indices into the remaining normal tier. Its family, roll fractions, identity, locks and crafted flags survive. Its value is re-evaluated within the new window; this preserves roll quality, not the exact old number. Existing exquisite rolls remain exquisite. Already-owned families remain usable even when their new discovery level exceeds the item's original level. No account reset or additional save schema is needed.

`engine/relicPower.ts` derives effective modifiers from freshly compiled item mods. Eligible numbers multiply once by `(1 + account power) × board factor`. Only explicitly listed positive flat/increased stats participate. Grants, overrides, more multipliers, negative tradeoffs, unknown stats and feedback links remain raw. Board amplifiers are consumed once and cannot amplify one another. Rate-like contributions have per-line caps, including movement +100%, crit chance +50%, leech 10%; ordinary sheet caps still govern totals. Life, damage and other open numeric budgets have no policy cap.

The UI labels item values as baseline and displays account empowerment separately. The character sheet's container source contains the effective modifiers.

## Relic followers

Granted summon instances and independent companion grants carry a `relicSource` item identity. An ordinary learned copy of the same skill remains an ordinary summon. Relic followers use the standard monster level fold at `floor(player level × 1)`. Their attributable `relic:<item identity>` sheet source supplies damage at 35% and life at 60% of the ordinary body, multiplied by `1 + account power`.

`minion.ordinaryStats` defaults to zero, detaching ordinary owner minion investment. A configurable fraction blends normal inherited stats toward base values. Ordinary summons remain unchanged; Relic skill instance effects and native summon behavior still use the shared summon path. Living followers refresh on level/build changes while preserving their life fraction. Switching sources removes the previous Relic modifier source. Grant removal retires its follower; death/reformation and travel retain the existing companion lifecycle. The unique equip limit now permits one Unquarried Idol by default; the underlying grant system remains additive if a future definition explicitly allows multiple copies. Empowerment never multiplies grant levels.

## Persistence and migration

`Account.reliquary` owns item bodies, equipped and carried identities, enabled state, rank, power investment, stash pages/cells/page investment, and released/death-lost identities. Character saves omit account-owned Relic bodies. Storage coordinates are separate from the item's equipped coordinates. The primary live board and account Relics in the bag reference canonical account items, including granted-skill state. Account writes accompany character saves and durable quit saves.

Old saves import seated Relics with coordinates and loose Relics into reserve. Account corpse Relics migrate at World construction; character corpse Relics migrate on adoption. Roster saves migrate lazily when opened. Invalid/retuned grid placements and copies exceeding a unique identity's equipped limit return to reserve rather than the floor. There is no compatibility reset.

Collections predating finite stash capacity are packed into the existing unlocked pages. Excess items remain in a visible recovery queue, never deleted or rewarded with free pages. Recovery items can be withdrawn or released; new deposits stop until the queue is empty. Opening capacity or releasing items repacks recovery. Valid existing cells remain fixed during repair.

Stable character/run scope plus original uid identifies each legacy item. A stored `relicKey` survives subsequent moves. Replaying an import cannot replace the account's item or equipped selection. Modern character saves omit keyed Relics even when carried. Death settles pack losses before any corpse early return, carry restoration or death presentation, and writes the account immediately. Lost identities also suppress stale unkeyed finds from the same saved run and old keyed corpse copies. Adoption rebuilds the bag from canonical account carried identities; if another vessel has no room, the item returns to stash/recovery without deletion or duplication. Pre-character-id saves use their persisted expedition seed as scope. Current saves carry an `accountRelics` marker, so reloading does not bank loose new finds for free. Both pickup paths discard stale ground echoes of already banked items.

Migration cannot recover Relics already deleted by older completed runs, or distinguish deliberately fabricated identities in edited legacy files. It preserves valid instances still present in compatible saves and corpses.

## Verification

`probe_relicdeath.ts` checks actual Mortal/Immortal kills, cave and empty-corpse paths, locked/new/withdrawn/unequipped losses, protected storage, co-op down versus wipe, and stale-save rejection. `probe_relicflow.ts` checks standard Vault purchases, occupied-cell XP, fractional awards, toggling, stale Immortal saves and bag/storage transfer authority. `probe_accountreliquary.ts` checks costs, linear power, partial payments, authority, swaps, death, save roundtrips, migration replay, safe stat scaling and attributable followers. Its affix checks cover every family's debut boundary, both rarities, 2,800 natural drops, identical debut/late budgets and Oracle rerolls, old tier restoration, all unique budgets and conditional/target-scoped empowerment through the real stat fold. `probe_stash.ts` checks grid transactions, capacity, migration recovery, page investment and private Immortal lockers. Existing `probe_reliquary.ts` and `probe_relicuniques.ts` retain grid, amplifier, grant, wire and lifecycle coverage with account ownership expectations. `balance/oracle-rescue-ui.cjs` covers rescue, both lives, grid moves/swaps, cross-page drag, investment, personal storage, actual pack-loss death and disk reload in a hidden renderer with isolated saves.
