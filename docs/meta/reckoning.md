# The Reckoning — essence-normalized meta-progression

The account's meta-currency (**Mortal Essence**, `Account.credits`) is no
longer scored from how far a run got. It is the run's own carried essence,
**appraised at one strict exchange**, spent at the run's own closing prompt,
and gone when that prompt seals. Each run is a distinct economy; the account
keeps only what was deliberately assigned.

## The mortal exchange (`data/essences.ts`)

Every essence tier declares its worth in `EssenceDef.mortalWorth`:

| essence | worth |
| --- | --- |
| Coarse | 1 |
| Glimmering | 2 |
| Brilliant | 3 |
| Pristine | 5 |

One table, every surface:

- `walletMortalValue(wallet)` — the appraisal fold (count × worth per tier).
- `walletBreakdown(wallet)` — the per-tier rows the death screen prints.
- `spendWalletMortalValue(wallet, price)` — greedy cheapest-first spend that
  breaks at most one deeper tint and refunds **exact change** in the cheapest
  tier. **THE CHANGE LAW**: the cheapest tier's worth is pinned at 1
  (probe-enforced), so value is conserved to the unit and a refusal leaves
  the wallet untouched.

A new essence tier declares its worth and joins the appraisal, the spend,
the death screen, and every mortal-priced service at once — no other edits.

## Mid-run: Mortal Essence IS the carried wallet

`World.mortalValueOf(seat)` / `World.spendMortalValue(seat, price, noteKey)`
put the exchange on the engine. Every service priced in Mortal Essence
drains the **paying seat's carried essence** at the same rates the run-end
mint uses — the account's pool is never touched during play:

- holdfast wardens' tolls (`payHoldfastToll` — any seat may now treat from
  its own wallet; the old leader-only rule existed only because the purse
  was the host's account),
- harbor hearsay charts (`buyHarborChart`),
- harborhold restorations (`buyHoldRestore`),
- mercenary hires (`hireMercenary` — pay first, field second; a refused
  field refunds exact coarse change).

This makes every mid-run mortal price a live bid against the run-end mint:
spend the wallet on power now, or carry it to the reckoning.

## The run end (`main.ts` hostTail + `World.reckonRunEssence`)

At a true run conclusion (death / forfeit / retire → `gameOver`):

1. `reckonRunEssence()` pools the **local hero + every couch vessel**
   (`accountSeat` — one account, one harvest; merc seats and remote co-op
   guests never fold: a remote player's essence belongs to their own
   machine), appraises it, and applies the dying stage's
   `deathPayoutMult` — mode policy stays pure data.
2. `applyCredits` mints the result (spendable + lifetime + account level).
3. The chronicle records the run (below); `renownForRun` — the old
   `creditsForDeath` formula verbatim — is kept purely as the second axis.
4. The death screen shows **THE APPRAISAL** (per-tier rows × worth, the
   tithe rate if ≠ 1, the minted total) and leads **straight into the
   reckoning** — the Vault as the run's closing prompt, never the main menu.

The Immortal crossing (`beginModeRespawn`) banks the same fold at its
stage's reduced rate **before** the strip takes the wallets; the banked
essence waits for the next reckoning's seal. Couch vessels' wallets are
read by the same fold and stripped by the same covenant — mint-then-strip,
no double count.

## The seal law (`ui/panels.ts` showAccountScreen)

A Vault visit **opened while any Mortal Essence stands** is a reckoning:

- the head names it, the footer reads **Seal & Continue**,
- leaving always raises the confirm — what this visit assigned (per-unlock,
  completed rungs starred), and what remains: *"N Mortal Essence remains
  unassigned. It does not keep between runs — invest it now, or let it
  pass."*
- sealing (`sealReckoning`) zeroes the pool — lifetime totals and partial
  investments untouched — saves, and lands on whatever opened the visit
  (the death flow hands it the main menu).

A Vault opened empty is plain browsing and closes free. Legacy banked
credits and a mid-reckoning quit ride the same law: the start menu flags
the pending pool on the Vault button, and that visit's close seals it.

## The investment lane (`meta/unlocks.ts`)

Mortal Essence rarely matches an unlock's price in one run, so **partial
investment is the law**: `investUnlock(account, unlock, amount)` pours any
amount (clamped to the pool and the remainder) into `Account.invested`,
granting the moment the full cost stands. Nothing is ever wasted.

- `investedToward` / `remainingCost` — the two reads every face shares.
- `applyUnlock` is the one-shot face of the same machinery (pour the full
  remainder) — historical callers and probes keep exact semantics, and
  prior investments count toward the price.
- A catalog retune below an existing investment settles the entry outright.
- The UI is **hold-to-pour** (`INVEST_CFG`: compounding rate, tap quantum) —
  a held card button drains the pool visibly; ticks update in place so the
  hold never loses its button; release/completion/dry-pool settles + saves.

**THE FIRST EXCHANGE**: the Salvage Station costs exactly **1** and gates on
`LEDGER_ESSENCE_TOUCHED` — the run that first meets essence can claim the
essence economy's front door at its own reckoning. It doubles as the
reckoning's teaching purchase and remains the trade gate's key.

## The run chronicle (`meta/account.ts` + the Chronicle screen)

`Account.runRecords` — every meta-progressing conclusion as a row
(`RunRecord`: when/who/level/zones/kills/reason, **essence** minted,
**renown**). Capped at `MAX_RUN_RECORDS` with **the protected set** (top-10
by essence, top-10 by renown, newest 10) never rotated out; `runStanding`
ranks a run 1-based on both axes. The death screen prints the standing
("Your richest harvest yet"); the Chronicle screen (start menu) is the full
personal leaderboard — sortable by harvest / renown / date, latest run
highlighted, account-level progress bar read off
`accountLevelThreshold` (the curve's exact inverse — one constant, both
directions).

## Saves

`AccountSave.invested` + `AccountSave.runRecords`, both optional (legacy
saves load to clean defaults; malformed entries drop per-record, never a
wipe — the deaths idiom). Schema version unchanged.

## Probe

`balance/probe_reckoning.ts` (fast lane) pins all of it: the change law,
value conservation, the brief's own 100-coarse + 20-pristine = 200 example,
invest/applyUnlock compatibility, the 1-essence first exchange, the seal,
the chronicle's protected cap, and the save round-trip.
