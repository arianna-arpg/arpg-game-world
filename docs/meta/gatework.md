# THE GATEWORK — unlock families and the open avenue vocabulary

`src/meta/gates.ts` (the fabric leaf) · `src/meta/unlocks.ts` (`reqAnyOf` +
`tease` + `sealedUnlocks` + `catalogLevelMilestones`) · `src/meta/account.ts`
(the ledger key CONTRACTS) · stamps: `src/engine/world.ts` (`grantSeatXp`
milestone sweep, the quest turn-in write) · probes:
`balance/probe_vendorlocker.ts` rigs E/F, `balance/probe_unlocks.ts`.

## The problem it solves

Chained unlocks ("each rung requires the last") were already data — the
lock-ladder derivation. What they could not say was **"this rung opens along
several independent roads, in the player's own order"**: reach level 15, OR
finish a vocation, OR turn in a quest — whichever a particular player's play
crosses first. The gatework makes the unlocks OF the unlocks data too.

## GateRow — one avenue

```ts
interface GateRow {
  ledger?: string;        // account.ledger[key] ≥ n
  ledgerPrefix?: string;  // ANY key with this prefix ≥ n ("one applicable X")
  n?: number;             // threshold for the counted forms (default 1)
  unlock?: string;        // another catalog unlock OWNED (id)
  feature?: string;       // a feature flag owned
  level?: number;         // sugar → reached_level_<n> (stamp REGISTERED, see below)
  vocation?: true | string; // sugar → vocation_unlocked_* (prefix or exact)
  quest?: true | string;  // sugar → quest_done:* (+ quests_completed legacy)
  label?: string;         // the spoken line (else derived) — ONE spelling, every surface
}
```

Resolvers: `gateRowMet(account, row, ownedUnlock)` / `gateRowLabel(row)` /
`gateMet(account, rows, 'any'|'all', ownedUnlock)`. The fabric is a LEAF —
it never imports the catalog; `unlock` rows resolve through the closure the
caller passes.

## On an unlock row

- `reqAnyOf?: GateRow[]` — ONE held avenue satisfies the group (ANDed with
  every other gate on the entry). This is the family law.
- `tease?: boolean` — once the entry's STRUCTURAL prereqs hold
  (`requiresUnlock` chain + `requiresFeature` owned) while its dynamic gates
  do not, it surfaces as a **SEALED card**: named, priced, unbuyable, its
  roads printed with met-marks (`sealedUnlocks` / `sealedGateLines`; the
  Vault renders the rack under "Sealed — earn the road, then buy", the
  hover story lists "Opens by ANY of: …"). `availableUnlocks` still omits
  it and `applyUnlock` re-checks visibility — the seal is display truth,
  never a second buy path.

Everything else (`reqLedger`, `reqLedgerCounts`, `reqLevel`, `reqClasses`,
discovery) is unchanged and composes.

## THE MILESTONE DERIVATION (the reached_level_15 lesson)

A level gate is only honest if something STAMPS its key — and the old
`feat_craft_second` gate on `reached_level_15` shipped with NO writer (the
sweep stamped 5, 10..90, 100 only): a dead gate. Now
`catalogLevelMilestones()` scans the static catalog — every `level` avenue
in every `reqAnyOf`, every `reached_level_<n>` named in
`reqLedger`/`reqLedgerCounts` — and `grantSeatXp` stamps exactly that list
beside its standing decade keys, all milestones ≤ the current level
(idempotent; a character already past one back-fills on their next
level-up). **Authoring a level gate anywhere in the catalog IS registering
its signal.** The regex derives from `reachedLevelKey` — extractor and
stamps cannot drift apart.

## The ledger key contracts (meta/account.ts)

One spelling per fact, exported beside `gemDropKey`:

- `reachedLevelKey(n)` — the global level milestones.
- `LEDGER_VOCATION_PREFIX` / `vocationUnlockKey(id)` —
  `data/vocations.ts`'s `vocationLedgerKey` now DERIVES from this
  (grantVocation already writes the account immediately).
- `LEDGER_QUEST_DONE_PREFIX` / `questDoneKey(id)` — stamped at quest
  TURN-IN: run ledger + straight to the account under metaProgression (the
  grantVocation durability precedent; the later death-merge add is
  harmless, readers test ≥ 1). `quest: true` avenues ALSO honor the
  lifetime `quests_completed` counter, so accounts whose deeds predate the
  per-quest keys still speak.
- `LEDGER_GEMDROP_PREFIX` — the drop index's prefix, for "one applicable
  gem" avenues.

## The debut chain (the vendor market)

salvage station (essence-touched discovery) → **Broader Wares I** (chains
off the station; legacy `brandt_extra_gems` flag) → **II** → **III**
(any-of: level 15 / a vocation / a quest — authored ON the ladder row,
`VENDOR_CFG.wares.ladder[2].gate`) · **The Gem Counter** (chains off
Wares I; opens the counters' gem tab account-wide) → **Reserved Wares 1**
(requires Gem Counter + Wares I + the vendor-bought stamp, teased) →
**The Standing Order** (requires the hold + one ORDERABLE gem —
`{ ledgerPrefix: 'gemdrop:', n: need }` — teased). Every arrow is data;
`docs/engine/vendors.md` carries the market half.

## Recipes

- **Any-of on any existing row**: `reqAnyOf: [{ level: 30 },
  { ledgerPrefix: 'seas_found', n: 3, label: 'chart three seas' }]`.
- **A whole new family**: author a config ladder in the owning system's
  CFG (rows with flags/costs/gates), derive catalog rows from it exactly
  as `VENDOR_CFG.wares.ladder` does, fold ownership where the system reads
  it. Nothing counts to three anywhere.
- **A new avenue KIND** (e.g. bestiary depth): one field on `GateRow`, one
  arm in `gateRowMet` + `gateRowLabel`. Every gate everywhere can speak it
  the same day.
