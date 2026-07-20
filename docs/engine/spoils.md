# THE SPOILS LAW — ground that mints nothing (`ZoneDef.spoils`)

One optional word on a zone decides what its ground may **mint**:

```ts
spoils?: 'full' | 'none';   // absent = 'full'
```

`'none'` seals every loot **mint** in that zone while XP flows untouched —
ground that pays in experience alone. It is a *zone law*, pure data: any
authored zone, minted pocket, or sidezone arena may wear it; no engine edits,
no per-source special cases.

## Why it exists

The Pit is a purchased, endless, **level-scaled** wave arena (the cellar under
Lastlight). An arena that re-stamps to the hero on every entry AND paid gear
would out-farm the whole charted world from one room — every reason to explore
would drain into a cellar. The trade is the design: **the Pit keeps the
levels; exploration keeps the loot.**

## The one read

`World.spoilsSealed()` (`zone.spoils === 'none'`) is consulted at the drop
**primitives**, so every mint source seals through one gate with no
per-caller sweep:

| primitive | covers |
| --- | --- |
| `dropGemAt` | kill trickle, elite/rarity gem spill, boss guarantees, wave + objective + event payouts, breakables, cart wrecks |
| `dropGearAt` | loot tables (world/boss/crowned), per-monster hoards, carried gear (the Hollowborn) |
| `dropVestigeAt` | the socket-economy trickle + table results |
| `dropEssenceAt` | the wounded purse trail, the death burst, encounter yields |
| `dropAmalgamPart` | the Bonewright's built spoils (direct pushes — guarded at entry) |

`rollDrops` also early-outs (the cheap skip: no table resolution, no RNG
spent), and the essence **death burst is skipped whole** on sealed ground so
"the purse bursts!" never announces wealth that cannot land — the law stays
honest at the float.

## What always passes — mints vs movement, and OWED pay

The law refuses **mints** (new wealth entering the world from this ground's
economy). It never touches:

- **XP and sustain orbs** — not spoils. Kill XP, the `+xp` float, and
  `orbDrops` life/mana sheds pay in full.
- **OWNED movement** — a player's property changing places: bag/doll discards
  (`droppedBy`), `dropFromInventory`, zone-memory loot restores, and a
  looter's snatched sack spilling back on death (grief-proof stays absolute —
  a `spoils: 'none'` zone can never eat an item a looter stole from you).
- **OWED pay** — earned of a writ, not of the ground underfoot: quest payouts
  (`dropGemAt(…, owed)`), corpse reclaims (`dropGearAt(…, owed)`), and dev-tab
  conjures. The `owed` flag is the explicit third lane; nothing infers it.

## The door says so

Entering sealed ground floats one line — *"this ground keeps no spoils — it
pays in experience alone"* — so a farmed hour reads as the bargain it is,
never as a broken drop table. Package blurbs should disclose it at purchase
time too (the Pit's does).

## Files

- `src/data/zones.ts` — the `spoils` field (the whole authoring surface).
- `src/engine/world.ts` — `spoilsSealed()` + the primitive gates + the door
  announce (`loadZone`).
- `src/packages/defs/pit.ts` — the debut consumer (`mintPit`).
- `balance/probe_spoils.ts` — the probe: forced-certain kills mint zero on
  sealed ground while XP pays; every owed/owned lane lands; the control
  ground mints through every primitive; the minted Pit wears the law.
