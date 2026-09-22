# Brandt's stock investment

Tuning lives in `src/data/vendors.ts`; Vault rows are generated from its
ladders. Existing owned flags remain valid.

| Investment | Gate | Result |
| --- | --- | --- |
| Rush Orders I–III | Mortal Essence | Each subtracts 90 seconds from the shared 20-minute vendor clock |
| Rush Orders IV–V | Magic Wares, previous rank | Same reduction |
| Rush Orders VI–X | Rare Wares, previous rank | Final clock: 5 minutes |
| Broader Wares I–III | Mortal Essence | Existing stock increases |
| Broader Wares IV–V | Magic Wares, previous rank | Existing stock increases |
| Broader Wares VI–X | Rare Wares, previous rank | Each adds 4 equipment pieces and 2 Memory slots |
| Curated Wares I | Rare Wares, Rush Orders V, Broader Wares V | 2 curated equipment pieces per refresh |
| Curated Wares II–V | Previous rank; Broader Wares VI–IX respectively | +2 curated pieces each, up to 10 |
| Reserved Wares I | Memory Counter, Broader Wares II, Rush Orders II, a vendor purchase | 1 reservation |
| Reserved Wares II / III | Previous rank; Curated Wares II / IV | 2 / 3 reservations |

All costs use Mortal Essence. Rush costs are 100, 220, 360, 520, 740,
1000, 1300, 1650, 2050, 2500. Broader costs are 60, 140, 260, 420,
600, 850, 1150, 1500, 1900, 2350. Curated costs are 450, 750, 1150,
1650, 2250. Reservations remain 80, 160, 280.

At maximum width, Brandt offers 32 equipment pieces, 20 direct Memory
slots (once unlocked), and the two configured pouch stacks. Each counter
packs its stock across 12×9 pages. Pages retain original stock indices for
buying, tooltips and reservations. Oversized future content uses the
existing overflow list instead of becoming inaccessible.

Curated equipment has one affix at its best level-eligible tier and every
numeric affix roll in the top 35% of its range. Naturally overrolled Magic
tiers are retained, and Rare items cannot gain Magic-only tiers. The first
two selected pieces are Magic crafting bases; later selections preserve
Magic/Rare rolls and promote selected whites to Magic. No Unique rarity is
introduced. Memories retain their existing rarity ceiling and distribution.

The mint-time `AffixQuality` policy is reusable and opt-in. Ordinary drops
are unchanged. `World.curateVendorStock` runs inside the existing seeded
shelf mint after reservation overlay: reserved items retain identity,
affixes, level and price. Quality draws never advance the combat RNG.
Brandt opts into quality through `VendorDef.quality`; other counters do not.

## Bounty choices

The Bounty Board starts at 20 minutes, with its own existing refresh ladder.
Rush Orders only affect vendors. Crafting-writ lane weight rises from 10%
to 20% on the ordinary board. The starter's two slots now allow both writs
and cash.

`BOUNTY_REWARD_CFG.slateChoices` ensures one writ-and-essence offer and one
cash offer whenever eligible fresh slots permit. Pinned or standing offers
may satisfy these choices but are never rewritten. Choice placement uses
the board's seeded RNG, so an easy route does not always own a writ.
Tiny/pinned slates may lack room for both choices. Same-beat route repairs
keep their existing rewards and cannot be used to reroll payouts.

The `smith_writ` recipe spends three fifths of its value budget on the writ;
the remainder pays Coarse Essence. Its category and complexity remain
appropriate to the posting's frozen level. At level 1 this yields a writ
plus 4 Coarse Essence, versus 8 from a cash posting at that level.
Turn-in uses the existing combined reward payout and crafting-bounty ledger.

Verify with `probe_vendorinvestment.ts`, `probe_vendorlocker.ts`, both Brandt
probes, and all three bounty probes (including the slow reward/route tests).
The hidden `balance/vendor-investment-ui.cjs` exercises real page buttons,
later-page purchases, reservation persistence and the visible bounty offers.
