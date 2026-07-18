# The Discovery Web & The Moot Law

*(meta/unlocks.ts · meta/account.ts · the Vault + class select · probe:
`npx tsx balance/probe_unlocks.ts`)*

Two laws govern how the Vault's class economy surfaces itself. Both are pure
data over the catalog's existing generic gates — no new gate machinery, no
bespoke switches.

## The Moot Law — no dead purchases

**A purchase whose worth depends on the class pool's depth hides until the
pool can fill it.**

A class SLOT is a hand size. A 4th slot over a 3-class pool deals nothing —
under the old rules it could be bought anyway (and was: a real account paid
40 essence for exactly that). Now every slot tier authors
`reqClasses: <its own slot count>` (`UnlockBase.reqClasses`, checked in
`staticGateMet`), so the tier stays hidden until the unlocked-class pool can
actually fill the hand it sells.

The class-select teasers stay in step **by arithmetic, not by wiring**: a
"more Class Slots" teaser exists iff `pool > hand`, and the next tier
surfaces iff `pool ≥ hand + 1` — the same condition. Whenever the screen
points at the Vault for slots, the purchase is there; whenever it would be
moot, neither shows.

`reqClasses` is generic: any future pool-fed purchase (a "reroll the hand"
token, a pool-wide stash tab) authors the same field.

## The Discovery Web — find it before you can buy it

**"If someone doesn't know what they're looking for, they have to find what
they're looking for first."**

Every non-starter class bundle carries a `discover` row
(`ClassBundleDef.discover`). Until its gate is met the class is a **shrouded
rumor**: a `? ? ?` card whose hint gestures at the *deed* — never the name,
kit, or price. Met, it becomes an ordinary purchasable bundle. The spec
compiles onto the catalog's generic gates (`ledger` → `reqLedger`,
`classes` → `requiresUnlock` on bundle ids), so `isUnlockVisible` /
`applyUnlock` learned mystery for free — an undiscovered class refuses the
coin outright.

Three composable levers:

| lever | meaning | example |
|---|---|---|
| `ledger` (play threshold) | reach level *m* playing class *c* — `classLevelLedgerKey(c, m)`, stamped by `grantSeatXp` for whatever class is being played (`CLASS_LEVEL_MILESTONES`) | Magician L10 → Sorcerer, Pyromancer |
| `ledger` (hard lesson) | any world fact the engine stamps | `seized_by_grip` → Brawler; `trap_sprung` → Trapper; `crowned_killed` → Tamer; `warlords_killed` → Warlord; `unmade_slain` → Chronomancer |
| `classes` (ownership chain) | parent bundle(s) must be OWNED | Necromancer owned → Summoner |
| `hint` | the rumor line the shrouded card whispers | — |

### The authored web (v1)

- **Blood line (Warrior):** L10 → Breaker, Vanguard · L15 → Berserker,
  Guardian · Berserker owned → Blademaster · Guardian owned → Juggernaut ·
  Guardian *played* L10 → Sentinel · **seized by a grip → Brawler**
- **Shadow line (Rogue):** L10 → Ranger, Swashbuckler · L15 → Assassin,
  Beguiler · Ranger owned → Lancer · **sprang a trap → Trapper** ·
  **warlord slain → Warlord** · Warlord owned → Skald
- **Mind line (Magician):** L10 → Sorcerer, Pyromancer · L15 → Necromancer
  (the Wisdom door), Cleric (the Will door) · Necromancer owned → Summoner ·
  Cleric owned → Ascetic · **Crowned slain → Tamer** · **the Unmade slain →
  Chronomancer**
- **Beyond the parity twelve:** **a brood-queen slain → Hivecaller**
  (`broodmothers_slain`, killHandlers.ts — broodmother / chrysalid
  broodmother / the Brood Sovereign; wisdom's fourth door, the throng
  fabric's own class). The star now grows past three-per-point; the rumor
  wall is what keeps a deeper roster legible.
- **The parity eight (round two — every point's fourth door):**
  Breaker owned → **Wallwright** (constructs + the mass fabric) · Brawler
  owned → **Matador** (the redirect duel) · **eight account deaths →
  Flagellant** (`ledgerCounts` debut: the counted discovery — the same
  lifetime counter the Immortal reads) · Tamer played L10 → **Falconer**
  (the latch as a mark: her falcon rides prey vulnerable) · Swashbuckler
  owned → **Sharper** (the fortune fabric: `luck`, palmed) · Beguiler
  owned → **Firebrand** (the confusion family at crowd volume) · Magician
  played L20 → **Runeweaver** (the invocation bank) · **a fallen star
  broken → Resonator** (`fallen_stars_broken`; the attunement tones as a
  player discipline).

## Vocation coverage (the class pass)

Every class carries a vocation line (30 chains over 28 classes —
data/vocations.ts). The pipeline the system enforces: play the game →
unlock the class (this web) → play the class → find the vocation's chain
(quartermaster at L30, or its SECRET SITE in the world) → complete it →
the account unlocks that chain for EVERY future character, any class.
Unlock textures deliberately vary: five secret sites behind five different
filters (the Pack-Stone in taiga/forest, the Barrow Door in ossuary lands,
the Gearwright's Wreck in the ruins, the Stillwater — which any class may
find, not just the Ascetic — and the Brood-Heart, a PILGRIM chain that
must be walked to every run even once unlocked), plus escort processions,
survival recitals with a boss cadence, meditation beacon-circuits, escape
gauntlets, and one two-step barrow duel.

Play thresholds work on *any* class once owned (the Sentinel gates on
*playing* the Guardian), so the web nests as deep as authoring wants.

### The hard lessons (learn-by-getting-wrecked)

The engine stamps world facts at the moment they are *lived*, local hero
only, merged into the account on death like every ledger key:

- `LEDGER_SEIZED` (`engine/grab.ts`) — stamped by `world.grabSeize` when a
  grip catches **you**. Raw tally by design ("survive 10 holds" content
  reads the same key).
- `LEDGER_TRAP_SPRUNG` (`engine/trapworks.ts`) — stamped by
  `world.springTrapwork` when the presser is **your own feet**. A baited
  pack teaches nothing: the lesson is in the misstep.

Adding a new hard lesson = one exported key constant + one stamp at the
moment it happens + one `discover` row naming it. The probe's `WORLD_FACTS`
map must also learn the key (it documents who stamps what — an unknown key
is a rumor that can never resolve).

## Surfaces

- **Vault:** *Available* (gate met, unowned) · *Rumors — classes not yet
  discovered* (shrouded, hint only, disabled) · *Owned*.
- **Class select:** teasers only ever show DISCOVERED locked classes (with
  their exact Vault remedy); leftover teaser slots deal `? ? ?` rumor cards;
  the header counts the undiscovered. The roster cache key includes the
  discovered set, so a mid-offer purchase that reveals chained kin re-deals.
- **Dev → Account:** stamp current-class milestones / stamp every web
  ledger (registry-derived via `discoveryLedgerKeys()`) / forget
  discoveries. Writes the account ledger directly so the whole web can be
  walked without dying twenty times.

## Invariants (probe-pinned, 37 checks)

- Every non-starter class has exactly one bundle; every bundle is shrouded
  with a non-empty hint; chains name real bundles; every ledger key is a
  real milestone or a mapped world fact.
- **Reachability:** BFS from the starting three closes over the entire
  roster — no stranded class, ever. A future `discover` row that orphans a
  class fails the probe.
- The moot law end-to-end (tier 4 surfaces at pool 4; tier 5 stays hidden
  at pool 4 *with tier 4 owned*; nothing visible ever wants a deeper pool
  than the account holds).
- The refusal (buying undiscovered fails, charges nothing) and the
  migration stance (an OWNED class never re-shrouds, whatever its gate).
- Live: milestones stamp exactly as far as the level went, class-true;
  the seize and trap lessons stamp for the local hero and **only** the
  local hero.

## Design intent

Discovery is the tutorialization: the starting three teach their own
triads by being played, ownership chains reward committing to a line, and
the hard lessons turn the world's nastiest surprises into keys. The rumor
hints are compasses ("the floor clicks before it kills…"), so a player who
wants a specific silhouette can *hunt* it — and a player who never reads
the Vault still trips over discoveries by playing.
