# Repeatable Memory discovery and awakening

This is an experimental progression economy. Prices and distributions are
starting points for playtesting, not settled balance.

## Player loop

- **Discover a Memory** costs 30 Mortal Essence. Each completed purchase
  permanently adds one previously locked skill or support to the account's
  find/selection pool. Every eligible entry has equal odds, across one combined
  pool; the categories are not forced to a 50/50 split.
- **Awaken a Skill** costs 90 Mortal Essence. Each purchase chooses one skill
  already discoverable by this account whose secondary access remains locked.
  It opens skill-tree investment and skill commissioning. A genuine legendary
  skill find grants the same account-wide access without this purchase.
- Both purchases repeat while eligible results remain, never return duplicates,
  and save partial investment. One held press completes at most one purchase.
  The Vault names the result and retains the last result on the card.
- Current class discovery rewards remain unchanged. Unlocking the class for
  selection still requires its separate free Vault click. Class rewards grant
  discovery, not secondary access. Class mastery purchases keep their existing
  role and costs.
- Supports share discovery's pool. They have no legendary rarity or skill trees
  today, so the secondary draw initially contains skills only. Supports retain
  the existing commissioning threshold of three genuine finds.
- Awakening satisfies a skill's commissioning knowledge requirement; the vendor
  service, reach, stock availability, level brackets and actual roll odds still
  apply. A Vault-awakened skill can be commissioned without first finding copies.

Skill level requirements and point budgets still apply after awakening. Locked
trees can be previewed; their nodes refuse spending in both UI and engine.
Previously allocated nodes are preserved, but further investment needs access.
Basic casting, skill leveling, normal support sockets and existing loot rarity
are unchanged. There is no separate prestige implementation yet; future prestige
actions can use the same secondary-access predicate.

## Data and extension

`src/data/memoryUnlocks.ts` owns `MEMORY_UNLOCKS` (purchase ids, tiers, labels,
descriptions, costs, per-entry category weights) and `MEMORY_UNLOCK_CFG`:

| Setting | Purpose |
|---|---|
| `weights.skill` / `weights.support` | Relative entry weights; zero removes a category from that purchase |
| `weighting` | Uniform entries or their authored drop weights |
| `excluded` / `weightOverrides` | Optional `kind:id` exclusions and multipliers |
| `secondary.kinds` | Which kinds use secondary access |
| `secondary.mechanics` | Independently gate trees, commissions and future prestige |
| `secondary.legendaryFinds` / `secondary.vault` | Field-only, Vault-only, or both routes |
| `legacyGemBundles` | Restore the old package shelf for comparison; defaults off |
| `showDebugCodex` / `debugCodexBypassesSecondary` | Retain/hide the debugging shortcut and control its secondary bypass |

The catalog derives live from `SKILLS` and `SUPPORTS`. Skills marked `noDrop`
or with zero drop weight, and zero-weight supports, are excluded. New eligible
definitions automatically join; no bundle list must be edited. Existing authored
drop-level restrictions still control when an unlocked entry can actually fall.
If experimenting with descriptions/odds, update the purchase's adjacent player
copy to match the experiment.

`src/meta/memoryUnlocks.ts` resolves candidates, grants discoveries and secondary
access, and exposes the shared mechanic and commission predicates. The ordinary
Vault investment system owns payment. A typed `memory` row is repeatable, never
permanently Owned; persisted completion sequences distinguish a new purchase
from its predecessor, including during held investment. Empty pools hide their
purchase and reject stale actions without spending. Surplus stored investment
funds later explicit purchases, one result at a time.

`Account.memorySecondary` stores `kind:id` keys. `memoryReceipts` records the
last outcome and completion sequence per purchase. Existing discovered gems
stay discovered. Old package investments transfer once to discovery investment
on the normal account reconciliation path, preserving their full value. An older
save has no per-skill legendary history, so the old global legendary flag does
not retroactively awaken arbitrary skills. No account/run reset is required.

The field route uses `World.noteGemDrop`, the existing genuine gem-mint seam.
Opaque Memories awaken their skill when recalled and identified, not on preview.
Vendor gem sales, starter kits, discards and corpse transfers do not call it.
Modes that cannot earn account progression still cannot grant awakening.
An authored regional/fixed legendary outside the global find pool grants both
discovery and awakening, so the reward remains usable throughout the account.

During co-op, the host account controls this session gate, as it controls vendor
services. `memoryAccess` ships the host's verdict to remote render shells;
client accounts are not overwritten. Host-side tree spending remains authoritative.
Combat simulation fixtures open trees explicitly; progression probes clear that
fixture and exercise fresh-account gates.

## Grand Codex follow-up

Grand Codex remains available, explicitly labelled **Debug**, and by default
bypasses discovery and secondary access. It is not the intended player economy.
Remove it from player-facing progression after these experiments; retain an
equivalent developer control. Review Skill Grafting's current Codex prerequisite
at that time. Already activated Codex accounts intentionally have no eligible
paid random draws while the corresponding bypass applies.

## Verification

- `npm run check`
- `npm run probe -- memoryunlocks` and the unlock, vendor, Memory, tree and menu probes
- `npm run sim -- run --suite smoke`
- `npm run build`, then `npx electron balance/memory-unlocks-ui.cjs`

The UI harness uses isolated saves and a hidden window. It checks repeat clicks,
one draw per hold, named results, persistence and the real skill-tree gate.
