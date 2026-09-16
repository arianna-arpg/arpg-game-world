# THE CAST SEAL — ground that answers no button (`ZoneDef.castSeal`)

One optional row on a zone decides what may be **cast** on its ground:

```ts
castSeal?: CastSealSpec;   // absent = every cast open
```

It is a *zone law*, pure data (the spoils law's shape): any authored zone,
minted pocket, scene ground or future tileset roll may wear it; no engine
edits, no per-source special cases, no hard-coded lockout anywhere.

## Why it exists

Mu is the hub between lives — a wisp among vessels whose only act is choosing
one. The wisp's bar is empty, and an empty slot answers with THE UNARMED FLOOR
(the improvised strike) through the one cast pipeline exactly as designed. In
Mu that byproduct implied there was something else to do. Her ruling
(2026-09-16): lock casts in Mu, but as a dynamic, extensible framework — the
day Mu admits *certain* casts, that must be a row, never a code path.

## The vocabulary (`engine/castseal.ts`)

| field | meaning |
|---|---|
| `mode` | `'shut'` (default — a SEAL: nothing casts but what `open` names) or `'open'` (a ground that forbids only what `shut` names) |
| `open` | a `CastMatch` of casts that stay open under a shut ground |
| `shut` | a `CastMatch` of casts that are shut under an open ground — **THE HARD LOCK**: a matching `shut` row beats a matching `open` row |
| `binds` | `'all'` (default — THE SAME DOOR: every caster through the one pipeline) or `'seats'` (player-kind bodies only; the wild keeps its kit) |
| `line` | the refusal a seat's press hears (rate-limited, the failNote lane — a reason, never a caption). Omitted = **silent**: the ground simply does not answer |

A `CastMatch` names casts any-of three ways: `ids` (skill ids — a minted
meta/convert face also answers to its HOST's id through `hostSkillId`, so a
row naming the bar entry opens what its press becomes), `tags` (the skill's
registry-folded context tags), and `laws` — **registered predicates**
(`registerCastLaw(id, ctx => boolean)`) evaluated live at every read, the
open seam for what no list can name ("only while a vessel is engaged"). One
law ships: `'reflex'` (the caster's reflex lane — flasks and every
`reflex`-granted instant), so "no fighting, but drink" is
`open: { laws: ['reflex'] }`. `castSealIssues` lints rows naming unknown
skills or unregistered laws; `data/validate.ts` runs it over every scene
ground.

## The one read

`World.castSealed(caster, inst)` returns the seal holding that cast shut on
the current ground, or `null`. Every lane consults it, so the button, the
grey slot and the brain never disagree:

| seam | law |
|---|---|
| `useSkill` — the FIRST word at the door | a sealed cast pays nothing, toggles nothing, interrupts no dwell (it sits before `markSeatActed`); silent unless `line`, and only for seat presses |
| `skillUsable` (the bar) | the slot greys — the press would refuse, so the bar says so first |
| `pressUsable` (the AI) | the brain never presses a sealed cast |
| the replenishment sweep | a bar-seated summon clock stands down on sealed ground |
| the trigger artery | an armed Cast-on-X gem does not fire by the side door |

## How it reaches a zone

`sealStageZone` copies `SceneZoneSpec.castSeal` onto the minted scene zone
(Mu: `MU_ZONE.castSeal = { mode: 'shut' }` in `data/mu.ts` — whole and
silent). A def literal wears it directly (the Pit's spoils idiom); a tileset
roll or a directed mint may stamp it the same way. The row persists wherever
the zone def persists and dies with off-graph scene ground.

## Laws pinned by the probe (`balance/probe_mu.ts` B7–B19)

The whole silent seal on Mu's ground; an empty-slot press casts nothing,
speaks nothing and interrupts no dwell; the one read agrees with the bar and
the AI; carve-outs by id, by tag and by a live registered law; the open
ground's inverse; the hard lock; `binds: 'seats'`; the spoken line through
the failNote lane; restoration; the lint.

## Open cards (her word)

- Co-op: a client predicts from its own zone def — a future sealed ground in
  network play wants the row on the zone wire (scene ground is solo-only, so
  Mu needs nothing).
- A drawn accent for a spoken refusal (the door-shudder idiom) if a ground
  ever authors `line`.
