# Worldstate persistence — the Wakeful World

Closing the game mid-run used to reroll the world: the character resumed, but
every minted zone, every charted road, every cleared camp was gone. Now the
**world half of the run rides the character save** (`CharacterSave.world`,
schema in `src/meta/worldstate.ts`), so a relaunch wakes the same world — no
re-exploring until the run actually ends and a new world is genuinely minted.

## What persists, and where it lives

| State | Carrier | Notes |
|---|---|---|
| Zone graph (every on-graph `ZoneDef`) | `WorldStateSave.zones` | Verbatim JSON — defs are pure data by design; the transient `exitBoundaries` annotation is stripped at write. |
| Mint counter | `nextGenId` | Restored past every persisted `gen_<n>` id (belt: the ids are re-scanned), so resumed frontiers never collide. |
| World clock | `time` | Day/night phase resumes where it stood; zone-memory TTLs stay honest against it. |
| Discovery | `visited`, `discoveredWaypoints` | The map + attuned fast-travel come back. |
| Zone memory | `memory` | TTL-fresh entries only, **including a live pure capture of the zone underfoot** — an exact resume faces the same monsters at the same health. Cave memories ride the stable `cave_` id namespace (deterministic per mouth). |
| Quests | `quests.active` / `quests.completed` | Previously lost on relaunch; quest zones are the claim that keeps their (even event-owned) arenas alive. |
| Player spot + vitals | `player` | Zone id + position + life/mana/ES **fractions**. Underground, the spot degrades to the cave ladder's surface anchor; unresolvable pockets (a realm, mid-voyage) degrade to the town wake. |
| Overlay fields | `overlays` | The open per-overlay snapshot bag — see the seam below. |

`completedObjectives` (still on the character half) now persists for exactly
the ground the worldstate carries plus the `cave_` namespace — derived from
zone **ownership** (`def.eventOwned`) instead of the old hardcoded prefix
regex — and is re-scrubbed against the live graph on every resume
(`World.scrubStaleObjectives`), so a deterministically re-seeded event zone
can never wake pre-cleared.

## The transience rule

Zones minted by world events (`def.eventOwned` — demon epicenters, crusade
strongholds, incursion landings) persist **only while claimed**: today the
active quest log claims its arenas; an overlay that snapshots its own run
state can claim its zones tomorrow. Unclaimed event ground is scrubbed on
resume, its roads healed on both sides, and the event re-rolls fresh — the
same lifecycle those events already had within a session.

## The overlay seam (opt-in, one class at a time)

`WorldOverlay` (src/world/overlay.ts) grew two optional methods:

```ts
snapshot?(): unknown;        // durable state as PURE JSON
restore?(snap: unknown): void; // tolerant rebuild — validate, drop, never throw
```

`WorldSim.snapshotOverlays()` collects every opted-in field (keyed by overlay
id, `@dimension`-salted for non-surface twins; `:`-prefixed keys are reserved
for the sim's own ledgers). On resume, `restoreOverlays` hands snapshots back,
and `reseedGraph` walks the restored graph through `onNodeCharted` for every
field that did **not** restore — so a fresh-starting overlay still knows every
node, exactly as mint-time charting would have taught it.

Implemented today: **faction territory** (influence + conquests — "its state
IS the world's memory"), **weather fronts**, **reputation**, **drives**.
Everything else restarts transiently by design (storms drift on, hosts march
anew); implementing the pair on any overlay is the whole cost of opting in.

## Where you wake: the resume policy

`ResumeSpawn = 'exact' | 'town'`, resolved as **mode pin ▷ player setting ▷
engine default** (`resolveResumeSpawn`):

- `'exact'` (engine default, `WORLDSTATE_CFG.resume`) — wake at the saved
  spot with the saved vitals (floored by `WORLDSTATE_CFG.exactVitalsFloor`)
  among the remembered monsters. **Alt-F4 hands back exactly the situation it
  tried to flee** — quitting saves you from nothing.
- `'town'` — wake in Lastlight, refreshed; the world stays explored, only the
  body walks home. The player toggle lives in Options ("Reawaken After Quit").
- A `CharacterModeDef.resume` pin outranks the setting — a future hardcore
  covenant can swear `'exact'` in data and the options toggle can't soften it.

## The quit flush

`main.ts` registers `pagehide`/`beforeunload` → `persistRunDurable` (the
`sendBeacon` machinery the permadeath wipe already trusts), so Alt-F4 and the
window ✕ capture the **closing moment**, not the last 20-second autosave tick.
Host-only; a dead run never flushes (its slot was durably wiped — a late write
would resurrect the corpse).

## Tolerance doctrine

Everything rebuilds against the live registries and degrades loudly:
unknown monsters fall out of pack tables and memories, a dead faction war
drops, an unregistered layout warns and falls back, a culled zone's roads heal
on both sides. A world section that can't stand up at all (`adoptWorldState`
returns false) resumes as a **fresh world** — the exact pre-worldstate
behavior, with generated objective keys scrubbed. No migration, no crash.

## Verifying

`npx tsc --noEmit` / `npm run check` / `npm run sim -- baseline check --suite
smoke`, then the live round-trip: start a run, explore a few zones, wound
yourself and an enemy, `__game.save()`, reload, Continue — the graph, spot,
vitals, and the wounded enemy's exact health must all survive. Flip
"Reawaken After Quit" in Options and repeat: the wake moves to Lastlight, the
world stays explored, and travel into an unvisited zone mints fresh
non-colliding `gen_<n>` ids.
