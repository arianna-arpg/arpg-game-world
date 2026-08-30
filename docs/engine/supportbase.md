# THE SUPPORT BASE — the gem as an item base

`src/engine/supportbase.ts` · gate fold in `supportFitsInst` · spawn-chassis
hook in `World.resolveHit` · probe `balance/probe_supportbase.ts` · dials
`SUPPORTBASE_CFG` + every table number in data/supports.ts

## The thesis (her ruling, 2026-08-28)

Rather than a multitude of unique support gems, ONE overarching support whose
actual behavior is rolled near-randomly at the gem itself — "closer to an
ITEM that ACTS as a support." A `SupportDef` wearing `rollBase` is a
**chassis**: in every mannerism an ordinary support (normal drop stream,
normal unlock pool row, normal socket gesture, normal essence leveling), but
its payload is **cut per copy** — one weighted row per axis, drawn once at
the mint site. Four copies of the same-named gem are four different gems.
The complexity of support drops collapses onto the support itself; each copy
matters inherently — the chase item, in a support's own vein (skill rarity's
sibling).

## The laws (probe-pinned)

- **FIXED AT THE VEIN** (Card B) — the cut rolls once where the gem is
  minted and rides the copy forever: bag, socket, save, corpse ring, vendor
  shelf, forwarded crew copies. Rehydration sites carry it verbatim and
  never re-roll; the worldstate sanitizer passes it shape-checked. A future
  re-cut sink is hers to open deliberately.
- **ORDINARY IN EVERY MANNERISM** — no reserved drop family, no special
  counter. Vendor shelves cut under `armVendorStock`'s seeded swap (the
  foreordained shelf keeps its cuts across reloads); the standing order's
  commission cuts on the beat's own rng.
- **THE CANONICAL CUT** (Cards C + G) — each axis's FIRST row, in authoring
  order. It is the one deterministic face every blob-less instance wears:
  the no-op matrix's census probe (pinned in data, gate-able), the
  worn-graft grant (a granted copy is deliberately dull — the wild copy
  stays special), and the per-axis tolerant fallback when a data patch
  renames a saved row id (the attunedForm law: a saved gem never bricks).
- **THE GATE READS THE CUT** (Card D) — rows carry their own
  `requiresMechanisms`; `supportFitsInst` unions the resolved cut's demands
  and refuses ONLY a cut that structurally cannot work on the host. The
  same chassis with a workable cut sockets fine. Structural and
  self-lifting: a future non-hit trigger row lifts the strikes refusal by
  data, never by a list.
- **OPEN AXES** — the table is data on the def; new rows and new axes are
  content. New chassis `kind`s name new executors.

## The mods chassis (the Multistrike ruling)

Rows may carry `mods: Modifier[]` — the cut's own numbers, folded into
`instanceMods` beside the def's mods under the same forward-scale law
(overrides pass whole). A chassis with **no `kind`** is a pure-mods base:
the rows ARE the payload, no executor runs. This is how an EXISTING gem
converts safely — **THE IDENTITY LAW**: author the canonical cut (rows[0]
per axis) to equal the old fixed values exactly, so every legacy copy,
worn graft, and census probe folds byte-identical (absent == identical)
and only fresh drops roll the spread.

**Multistrike, converted**: identity (re-aim, the flurry lock, −25%
damage) stays on the def; the STRIKES axis rolls one/two/THREE (canonical
two) and the TEMPO axis rolls a further speed price of 0/−8/−14/−20%
(canonical none). The premier cut — three strikes, unpriced — is the
chase; the floor — one strike, leaden — keeps a drop from being
"complete" at the drop. Her framing verbatim: farming for supports, in
skill rarity's vein.

## The 'spawn' chassis (the debut executor)

Folds trigger × brood × clutch into triggered births at the struck body,
through THE CLUTCH DOOR (`World.birthAt`, instance-less lane): capped,
mortal (`SUPPORTBASE_CFG.spawn.duration` × effectDuration), keeper-credited
minions under the `'__vein:<host>:<gem>'` census key (the Forgebound shape;
`'__'` = unlearn-sweep exempt). Trigger forms: `every` (each landed
top-level blow), `pct` (a chance per blow), `hits` (a gauge on the socket
instance — combat-transient, like a cooldown). The hook lives beside the
throng hit-feed in resolveHit: `dealt > 0`, depth 0 — splash and sub-hits
never feed a vein.

## The debut gem

**Teeming Vein** (data/supports.ts, 'Support Pool: the Clutch') — axes:
trigger (steady ×2 / gauge-9 ×3 / gauge-14 ×2 / 12%-chance ×3), brood
(broodlings / gnatlings / cinder sprites / marrowgrubs), clutch (1-up-to-3 /
2-up-to-4 / 4-up-to-6). Canonical cut: steady · broodlings · single. The
name is directional — a rename is a one-line edit.

## The face

The bag tooltip prints the rolled block (◈ one line per axis) under the
base description plus the fixed-at-the-vein note — the chase item must READ
before the socket choice. The socketed chip's title carries the same lines.
Rarity borders, richer tile faces, and the commission's wording remain
Card-H residue for a UI pass.

## Dials (first-pass numbers stand, per her word)

`SUPPORTBASE_CFG.spawn.duration 12` · every table weight/threshold/count/cap
in the def · gem weight 5, minDropLevel 6.
