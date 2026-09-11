# The Objective Web & The Moot Law

*(meta/unlocks.ts · meta/gates.ts · meta/account.ts · data/classTiers.ts ·
data/runescript.ts · the Vault + class select · probes:
`npx tsx balance/probe_unlocks.ts`, `npx tsx balance/probe_classmastery.ts`)*

Two laws govern how the Vault's class economy surfaces itself. Both are pure
data over the catalog's existing generic gates — no new gate machinery, no
bespoke switches. (Her ruling 2026-09-05 replaced THE DISCOVERY WEB — find it,
then BUY it — with this: a class is EARNED, never bought; the essence buys
MASTERY instead — `docs/meta/class-mastery.md`.)

## The Moot Law — no dead purchases

**A purchase whose worth depends on the class pool's depth hides until the
pool can fill it.**

A class SLOT is a hand size. A 4th slot over a 3-class pool deals nothing —
under the old rules it could be bought anyway (and was: a real account paid
40 essence for exactly that). Now every slot tier authors
`reqClasses: <its own slot count>` (`UnlockBase.reqClasses`, checked in
`staticGateMet`), so the tier stays hidden until the earned-class pool can
actually fill the hand it sells.

The class-select teasers stay in step **by arithmetic, not by wiring**: a
"more Class Slots" teaser exists iff `pool > hand`, and the next tier
surfaces iff `pool ≥ hand + 1` — the same condition. Whenever the screen
points at the Vault for slots, the purchase is there; whenever it would be
moot, neither shows.

`reqClasses` is generic: any future pool-fed purchase (a "reroll the hand"
token, a pool-wide stash tab) authors the same field.

## The Objective Web — earn it; the world hands it over

**"If someone doesn't know what they're looking for, they have to find what
they're looking for first."**

Every non-starter class bundle carries an `unlock` row
(`ClassBundleDef.unlock: ClassUnlockSpec`). From the first day the class
hangs in the Vault as a **SHROUDED card**: its name and blurb WRITTEN IN THE
VESTIGES' RUNES (below), its `hint` the one plain line, and beneath them its
**objectives** — an ANY-OF group of gatework avenues (`GateRow`, the counted
forms welcome). Complete any one and the WORLD claims the class for the
account: `settleClassUnlocks` runs on the live run's sweep (every
`CLASS_WEB_CFG.sweepSec` against the MERGED ledger view — a deed lands the
moment it completes, and the class's gems drop from the next kill, because
the drop pool reads the account live), at the Vault's render, at the class
deal, and at the run's end. No coin ever changes hands for a class.

The spec compiles onto the catalog's generic gates (`objectives` → `reqAnyOf`,
`chain` → `requiresUnlock`) under **THE EARNED
LAW** (`UnlockBase.earned`: cost 0, the pour refuses it, `availableUnlocks`
omits it), so `isUnlockVisible` / `settleClassUnlocks` learned the web for
free.

Composable discovery levers (class-level gates now belong only to mastery):

| lever | meaning | example |
|---|---|---|
| `objectives` (counted deed) | `{ ledger, n, label }` — any world fact, at a count; progress reads held/n | twenty own corpses reclaimed OR five undead bosses → Necromancer; eight deaths → Flagellant |
| `objectives` (hard lesson) | `{ ledger, label }` at n = 1 — learned by having it done to you | `seized_by_grip` → Brawler; `trap_sprung` → Trapper; `crowned_killed` → Tamer; `warlords_killed` → Warlord; `unmade_slain` → Chronomancer |
| `chain` | parent ownership opens the branch; the authored gameplay deed earns the class | Necromancer owned + 30 companion kills → Summoner |
| `hint` | the plain compass line | — |

### THE REVEAL

A shrouded card's objectives are runes too — until ANY one of them stands
`CLASS_WEB_CFG.revealFrac` (0.25) along (`classUnlockProgress`: per-row
`gateRowProgress` 0..1 — counted forms held/n, the level sugars the highest
stamped milestone over the ask, binary forms 0 or 1). Then the objectives —
and only the objectives — read plain, each with a hairline progress fill; the
name stays runes until the class is claimed, and then the card is simply
Owned. Hard lessons at n = 1 never reveal: they simply land.

### THE RUNESCRIPT (data/runescript.ts)

The shroud is a real, fixed, crackable cipher (Harbinger-speak): one Elder
Futhark rune per letter, 26 letters + the `th`/`ng` digraphs (matched first —
`th` is ONE rune, both ways), unique runes, a lossless round trip
(`encipher` / `decipher`); digits, spaces and punctuation pass through so
word shapes survive. **THE ROSETTA LAW**: every vestige (`data/vestiges.ts`)
carries a `letter` it teaches, its drawn glyph DERIVES from that letter
(`runeOf`), the letter lives in its short name, and no two vestiges teach
the same letter — so a player who has found Kessa knows what ᚲ says on a
card, and the rest can be cracked the old way. Letters no vestige teaches
are simply unwritten on any item; a new vestige teaching one is one `letter`
on its row. The Vault renders the script through the `.runescript` class
(ether ink, a font stack carrying the Unicode Runic block).

### The authored web (v3)

All 33 non-starters are earned through gameplay. Nine existing world deeds
remain; 24 former level/played-parent recipes now read combat facts.
`data/classdeeds.ts` holds these recipes and their explicit hints.
[Class deeds](class-deeds.md) documents the full table, tracking boundaries,
starter resource pass, and extension contract. Class levels 10/30/60/100
still unlock individual class mastery and skill swaps.

Parent ownership reveals deeper branches. Every branch also requires a deed;
progress earned before its parent was discovered counts. Previously owned
classes stay owned, even when their new deed is unfinished. No historic
combat counts are invented from old level milestones.

### The deeds' stamps (meta/account.ts)

The web's two NEW counted deeds are ACCOUNT-DIRECT (the bestiary/vocation
stance — a deed must never wait on a death-merge, nor double through one):

- `LEDGER_CORPSES_RECLAIMED` (`corpses_reclaimed`) — `World.reclaimCorpse`,
  once per own corpse dwelt back.
- `LEDGER_BOSS_SLAIN` (`boss_slain`) + `boss_slain:<faction>`
  (`bossSlainKey`) — `engine/killHandlers.ts` `boss_slain_tally`: a credited
  kill of any `MonsterDef.boss` kind, once for all and once under the body's
  LIVE faction; noBounty (scene) bodies teach nothing.

The older facts stay run-ledger (merged on death): `LEDGER_SEIZED`
(`engine/grab.ts`), `LEDGER_TRAP_SPRUNG` (`engine/trapworks.ts`), the kill
handlers' counters, the per-class milestones. THE MERGED VIEW
(`World.ledgerView`) lets the live sweep read them mid-run; a counted key
must live in exactly one ledger or it would double there.

Adding a world deed = one exported key + one stamp at the moment it happens + one
objective row naming it. The probe's `WORLD_FACTS` map must also learn the
key (it documents who stamps what — an unknown key is a card that can never
resolve).

## Surfaces

- **Vault (Classes shelf):** *Class Slots* and *Mastery* rungs as stock ·
  *Shrouded — classes the world has not yet yielded* (rune cards: name,
  blurb, objectives; hint + objectives on hover; index-addressed — the DOM
  never carries a name) · *Owned*. A class claimed since the last look
  toasts at the render.
- **Class select / the Mu card:** teasers only ever show slot remedies and
  rumor cards (a rune word + the hint); the header counts the shrouded. The
  roster cache key includes the shrouded count, so a claim mid-offer
  re-deals.
- **Dev → Account:** stamp current-class milestones (standing + derived) /
  quarter every objective (the reveal walk) / stamp every objective / settle
  claims / own every rung / forget. Writes the account ledger directly so the
  whole web can be walked without dying twenty times.

## Invariants (probe-pinned)

- Every non-starter has exactly one bundle; every bundle authors a hint and
  ≥ 1 objective, is earned (cost 0), and its chain names real bundles; every
  objective key is a class milestone the sweep stamps or a mapped world fact.
- **Reachability:** BFS from the starting three closes over the entire
  roster (a chain's door + ANY satisfiable objective) — no stranded class.
- The earned refusal (pour and apply both fail, charge nothing), the reveal
  boundary (just short of a quarter stays runes; a quarter reveals all), the
  claim (idempotent; chained cards appear at the door and claim on the
  parent's play), the merged view (a run-ledger deed claims without writing
  the account ledger), the moot law, the migration stance (an owned class
  never re-shrouds).
- Live: class milestones stamp exactly as far as the level went; the seize
  and trap lessons stamp for the local hero only; the corpse reclaim and the
  credited boss kill stamp account-direct; the sweep claims mid-run.

## Design intent

The web is the tutorialization: the starting three teach their own triads
by being played, chains reward committing to a line, the hard lessons turn
the world's nastiest surprises into keys — and the counted deeds turn the
game's own systems (the corpse run, the bosses) into roads. Nothing is
bought; the shroud keeps the reward a mystery while the hint keeps it a
compass, and the runes make the mystery itself a puzzle the items teach.
