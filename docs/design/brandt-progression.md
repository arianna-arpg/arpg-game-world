# Brandt: trade, the lost hammer, and the returning anvil

Brandt's initial greeting and shop remain available together. His counter buys
items for Coarse Essence immediately; the Salvage Station adds breaking and
craft study rather than enabling selling. A fresh shelf stocks only common
(white) equipment. The Memory Counter separately opens direct skill Memories,
Memory pouches and the Memory Essence exchange; supports retain their own
additional Vault unlock. Other counters retain their existing stock policies.

The shared market refresh clock starts at 20 minutes, matching the Bounty
Board's base period. They remain independent clocks: Rush Orders do not speed
up the board. Upgrade flags and previous investments remain compatible.

Rush Orders now has ten ranks, each reducing the clock by 90 seconds, down to
5 minutes at rank X. Broader Wares also has ten ranks. VI–X require Rare Wares;
the expanded stock uses multiple pages. Curated Wares improves selected
pieces' affix tiers and rolls while preserving Magic crafting bases. See
[vendor investment](vendor-investment.md) for costs, exact gates and reservations.

I–III are available sequentially through investment from the initial Vault.
IV–V also require **Brandt: Magic Wares**. That purchase costs 200 Mortal Essence
and becomes eligible after ten completed bounties that actually pay a crafting
writ. Qualification does not automatically purchase it. Magic Wares adds magic
gear to the existing common pool; rare and unique gear remain excluded.

`data/brandt.ts` owns the qualification and stock policy; `data/vendors.ts` owns
prices, refresh cuts and width increments. The Vault derives its rows from those
ladders, including optional gate avenues. Further encounter-gated tiers can be
authored using the same gate vocabulary. Memory slot additions only fill after
the Memory Counter is owned. The grid pages automatically as the shelf expands.

## Exact progression and save behavior

`LEDGER_BOUNTY_CRAFT_DONE` counts actual craft reward payouts, once at the
successful board turn-in. Non-craft payouts, failures, abandoning, repeated
turn-in requests and picking up a writ do not count. The value writes immediately
to the account, without a duplicate run counter that reckoning could add again.
Old saves lack reward-specific completion history: progress starts from newly
recorded payouts, with no estimate inferred from total bounties or held writs.

Rarity ceilings constrain item generation before choosing a base; families whose
minimum rarity exceeds the ceiling cannot promote a white roll into richer
stock. This generic optional `RollItemOpts.rarityCeiling` leaves ordinary drops
unchanged. Borough prosperity can adjust allowed weights but cannot bypass the
ceiling. Direct purchase intents also enforce the counter policy. On refresh,
old unpaid reservations outside that policy are released so they cannot leave
invisible occupied slots or reduce the number of permitted wares offered.

## Board invitation and character state

The first newly unlocked Lastlight board has a faint violet pulse, matching the
existing tutorial glow palette, and the generic off-screen attention chevron.
Both use the board's live anchored position and stop after the first successful
bounty acceptance. An account receipt persists that introduction immediately;
legacy accepted-bounty ledgers are also honored. No exit or movement is blocked.
Presentation settings live in `BOUNTY_BOARD_CFG.boardIntroduction`.

Brandt's state-based dialogue hints at crafting-writ bounties, recognizes the
qualification, and acknowledges purchased magic stock. His missing hammer is
independent of stock progression. `NPC_APPEARANCES` selects the unarmed look until
`questDoneKey('brandt_hammer')` exists on the run or account. The actor's selected
look feeds both the world body and portrait; the host ships the same look to
clients. The implemented hammer and trophy quests are described below.

## Memory stock and the next Vault gates

Magic Wares opens the Memory Counter purchase (120 Mortal Essence). Support
Stock still follows the Memory Counter. Reserved Wares I requires the Memory
Counter and a successful vendor purchase; Broader Wares I is no longer a parent.

Brandt's direct skill memories and commissioned finds use the same maximum
rarity as his equipment. Purchased rough/preformed pouches carry that maximum
on each memory unit, surviving merging, saves and delayed recall. A magic-era
pouch cannot later become rare or legendary merely because the account improves.
Supports have their existing cut system rather than a parallel rarity ladder.
Other vendors retain their own policies; world drops remain unrestricted.
Old unpaid reservations that violate the current policy are released on refresh.
Existing owned unlocks and already purchased legacy memories are preserved.

## The hammer and trophy journey

`quests/brandt.ts` authors two variants through the shared quest registry. After
Magic Wares, Brandt assigns the first at a seeded level from 9–12. The threshold
is stable for the run and remains eligible for heroes who arrive later. Dwell
assigns the quest without taking away his normal shop.

Cindermaw, the Tool Thief, waits in the generated level-10 Cold Cinder Forge.
Defeat it, collect Brandt's physical hammer, and return to Brandt. Field completion
alone does not qualify. The object occupies a bag slot, cannot be sold, salvaged
or discarded, and waits on the ground when the pack is full. An expired ground
cache recreates an uncollected owed object on its original site, without
duplicating a carried one. Quest cargo belongs to the host's authored journey,
consistent with the existing quest reward ownership rules.

The first return immediately records the account deed, changes Brandt's body
and portrait, and qualifies **Rare Wares** in the Vault (350 Mortal Essence).
That purchase adds rare gear and rare skill memories and opens **Salvage Station**
for its existing 1 Mortal Essence investment. Spending the imbue is not required
for either unlock. Existing owned services remain owned.

Later lives remember the hammer. Brandt instead asks for Cindermaw's iron fang,
at the same encounter, for another imbue. The two quests exclude one another
within a life: one earned reward per life, never both. State-based dialogue
distinguishes the missing hammer, the returning tool, the trophy hunt, and an
unspent promise. Run rewards do not carry into a new life.

## Deferred imbues

`QuestReward.imbue` and `engine/questImbue.ts` supply a reusable reward primitive.
Turn-in seals three randomly selected affix offers per equipment base, using a
quest/run stream independent of combat randomness or item uid. The actual offers
and rolls are saved in `WorldStateSave.questImbues`; reopening, reloading,
switching between identical bases or levelling does not reroll them. Compatibility
filters duplicate families and respects each base's prefix/suffix caps.

The journal keeps the reward visible until used. At Brandt, choose a carried,
unlocked magic item and an offered affix. Existing affixes, sockets, item level,
base roll and identity remain intact; one natural affix is added and rarity
becomes rare. One-line magic items therefore legitimately become two-line rares.
Affix tiers are capped at the authored quest level (currently 10), regardless of
the hero's level when accepted, returned or redeemed. Offers name unstudied
families so future lives can choose a line to learn by salvaging the result.
An invalid, remote, guest or repeated request consumes nothing.

Tuning lives in `BRANDT_CFG`: offer window, encounter/reward level, number of
offers, stock upgrades and Vault costs. The quarry uses the existing Crypt Warden
art and ordinary combat skills; it is a distinct named monster definition.

## Verification

`npm run check`, `npm run build`, simulation smoke and generation QA; focused
`brandtquest`, `brandtprogression`, `vendorlocker`, `memories`, `reliquary`,
`bountyboard`, and `townwelcome` probes.
The vendor probe's old trade/gate assertions were updated to the new rules; the
board probe now checks reset ordering inside the actual open method rather than
an arbitrary character-distance limit that already failed before this change.

After building, syntax-check then run `balance/brandt-progression-ui.cjs` with
Electron. It uses a hidden window and isolated saves to verify introductory
conversation plus shop/inventory, common stock, board cues and actual acceptance,
magic-stock dialogue, and quest-driven body/portrait appearance. Captures and
logs are under gitignored `balance/reports/`. The original `town-welcome-ui.cjs`
retains coverage of Mireille's optional invitation and continuing past it.

`balance/brandt-quest-ui.cjs` additionally verifies actual stock purchase,
quest assignment, hammer collection, return, armed appearance, deferred journal
choices, and a button-driven two-affix rare at hero level 100. Syntax-check it
before running the hidden Electron harness.
