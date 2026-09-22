# Paged storage

`engine/stash.ts` is the reusable address and transaction layer. It reuses the inventory's `BoardDims`, item footprints, collision and first-fit functions. A `StashDef` specifies board dimensions/mask, initial/maximum pages, page price and accepted items; `data/stashes.ts` supplies the current definitions.

`StashState` owns only page count, partial page investment and key→{page,x,y} addresses. Bodies belong to the caller. This separation keeps storage from accidentally granting equipment stats or fighting an item's worn coordinates. The account Reliquary uses stable `relicKey` identities; personal character storage owns its item array and uses the character's saved uids.

`planStashMove` is a pure transaction plan, shared by drag-target previews and mutations. It supports exact placement, same/cross-page one-occupant swaps, first fit, and an explicit vacated identity for an equipment exchange. Every affected footprint must fit before the caller commits. Full, locked-page, out-of-bounds, fractional and multi-occupant targets fail without changing state. Access, ownership, currency, persistence and equipped effects remain the caller's responsibilities.

`restoreStash` first preserves legal existing coordinates, then packs displaced/unaddressed items. Excess bodies remain recovery entries, derived from missing addresses. Recovery never creates deposit capacity; it can only shrink through equipping/retrieving, releasing, or page growth. This handles migration and future board retuning without loss. Search never removes occupancy or changes coordinates.

## Account Relics

One 6×4 page; eight-page ceiling. Each next page costs `40 × (purchasedPages + 1)²` Mortal Essence. This is horizontal capacity only, independent from the equipped board and +5% power ranks. All parameters are in `RELIC_STASH`. Free initial capacity arrives with the Reliquary feature. The page card appears in the Vault without requiring the power lesson.

`World.relicStashMove` accepts loose finds, equipped items and stored items. `seatAccountRelic` proves storage for displaced equipment before committing an aimed swap. Account property cannot leave for the bag, vendor, ground or corpse. `release` only consumes an unlocked, unequipped item after the UI's second press; its stable identity is retained as a tombstone so legacy saves cannot re-import it. Restoring account items advances the uid allocator to prevent fresh-run collisions.

## Immortal lockers

`CharacterModeDef.stash` chooses a registered storage definition. Immortal selects `immortal`: one 4×3 page for ordinary gear and Memory items, excluding Relics and quest items. `PlayerMeta.stash` owns the bodies and layout; both local and seat character serialization paths preserve it. Reload rebuilds the bodies through `rebuildAnyItem`, refuses duplicates with carried gear, and repairs addresses. No account collection or character other than the owning vessel can retrieve its items.

The locker is accessible at the Oracle while alive, on the local host. `World.personalStash` handles bag→locker, rearrangement and locker→bag; failed withdrawals leave items stored. Stored items contribute no stats and are absent from `captureLoot`; `stripCarryOf` leaves them intact. Thus a sworn death or fallen/resurrected Immortal retains the locker with the character. Deleting the vessel also deletes its private storage. No shared transfer, personal page purchase or guest-account synchronization is introduced.

## UI and extension

`ui/stash.ts` renders grid cells and item footprints; the caller supplies source/target kinds. Oracle storage uses the existing `ui/dnd.ts` fabric, including drag and click-lift, tab switching while carrying, tooltips, and quick right-click actions. Page-content buttons provide an alternate route. Search highlights matches without pretending occupied cells are empty. Permanent release uses an inline two-press confirmation and respects locks.

Another storage owner can supply a `StashDef`, canonical item entries and a `StashState`, then use the same planner and grid. It must explicitly provide access policy, transfer rules and serialization; storage does not silently become carried equipment or corpse loot.

Verify with `npm run probe -- stash`, existing Reliquary probes, full type checks and the hidden `balance/oracle-rescue-ui.cjs` walkthrough after a build. Capacity and prices are initial tuning, not a measured endgame economy.
