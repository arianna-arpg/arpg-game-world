# Reserve depletion and venting cues

GT-020 · Implemented 2026-09-26; crowded-combat acceptance pending.

Reserve bands now close inward once when entered. Existing bellows, taper,
sap sac and furnace tells continue to show the remaining fuel. An empty
Sapbleeder sheds liquid beads throughout its real recovery window; Fumelung
keeps its already-authored gasps and collapsed lungs. The former `guttering...`,
`running dry`, `bled out!` and `the furnace gutters...` captions are retired.

Damage-pool vents, such as Venomous Aura, now send curling wisps outward inside
a dashed seam at the actual damage radius. The skill's fuel strip exhales while
flowing. Its existing fill, activation-minimum notch and active border remain.
The `venting!` caption and repeated generic tick flashes are retired.

## Authoring

| Field or registry | Contract |
|---|---|
| `ReserveStage.cue` | Combat-cue key on band entry. Unknown/omitted uses `reserve_spent`; `false` disables the supplementary transition. Existing `color` tints the transition. |
| `ReserveVent.cue` | Worn profile from `RESERVE_VENT_CUES`: `steam` by default, `sap` for liquid beads. Unknown profiles fall back safely. `false` leaves an existing cue in charge. |
| `RESERVE_VENT_CUES` | Ordinary tell channels configure material, outlet, scale, cadence and opacity. No monster-ID branches. |
| `DamagePoolSpec.ventCue` | World/HUD profile from `POOL_VENT_CUES`; omitted/unknown uses `mist`, `false` disables supplementary effects while preserving the functional fuel strip. |
| `POOL_VENT_CUES` / `RESERVE_CUE_CFG` | Wisp count, width, opacity, period, start fraction, boundary contrast, HUD reach/count and stage padding. |

`reserveVentTells` appends inherited rows at actor tell construction. Each uses
`reserveVent:<id>`, a quantized binary read of `ventUntil > world.time`, and
portrait value zero. Existing tell replication carries the worn state to co-op;
clients do not reconstruct host-only reserve timers. Legacy `note` fields remain
accepted for old data but are silent. `ReserveVent.color` remains a legacy
caption field; author vent material color through the selected profile.

The new `breathPuff` parameter `liquid` emits tapered beads using the same part
pipeline as air puffs. Their outlet direction is body-local and configurable.

## State and gameplay invariants

- Stage transitions emit once per band entry, including re-entry after recovery.
  They do not replay on every status refresh. Continuous anatomy keeps the
  ongoing low-fuel state legible after the short collapse fades.
- The recovery vent follows the resource window. Cleansing Sapbleeder's wilt
  removes its vulnerability but does not refill its fuel; the liquid outlet
  therefore continues until the actual refill. Fumelung deliberately retains
  its earlier status-bound gasp contract and opts out of a duplicate layer.
- `poolVentRead` extracts the existing scoped damage/radius fold for both
  `updateVents` and presentation. Supports and instance modifiers affect both
  identically. The seam is drawn before body scaling/pose at the live caster.
  Ordinary target-body overlap at the seam still counts, just as before.
- Fuel changes flow opacity, never the damage footprint. A last partial tick
  still uses the full radius; visuals stop immediately at zero, on manual seal,
  unequip or death. Downed actors retain their hazard because the existing
  vent mechanic continues to tick while downed.
- Duplicate pool IDs share one footprint. The first equipped matching skill
  defines rate/radius/material, matching the actual tick resolver; each skill
  retains its own capacity/minimum read in the HUD. Non-vent pool skills also
  receive their host-derived resource read without gaining vent visuals.
- `ActorW.poolCues` mirrors skill identity, pool identity, bank, cap, minimum,
  rate, radius, color/profile and active flow. Missing rows clear reused client
  actors; empty mirrors take precedence over stale local data.
- No change to pool costs, drain, regeneration, refill shares, vulnerability
  duration, team/tier targeting or damage/kill attribution.

## Verification

`npm run check`, production build and all five smoke scenarios pass.
`probe_reservecues.ts` covers real stage transitions, custom vent duration,
cleanse/refill, fallback/opt-out, actual activation and damage ticks, scoped
radius, edge overlap, partial fuel, downed hazard, kill credit, unequip/death,
co-op joins/clears and shared-pool painter deduplication. The existing spent,
exhaustioncues and tells probes also pass.

After building, run the hidden Electron harness:

```sh
node_modules/.bin/electron balance/reserve-cues-ui.cjs
```

It uses disposable saves/profile and captures real depletion, empty recovery,
active player vents and HUD, bright/dark terrain, 1500×1000 and 960×640 layouts,
last fuel, downed hazard and cleanup. It asserts the rendered radius, resource
window/refill state and absence of retired captions. Local captures/logs are
written under the ignored `balance/reports/reserve-*` paths.

Remaining acceptance: caption-free recognition and comfort in crowded combat,
with multiple overlapping vents and other ailments. Automated lifecycle and
renderer checks do not replace that encounter playtest. Loaded/armed payloads
(GT-021) and proc-stack releases (GT-023) remain separate open families in the
[updated backlog](gameplay-text-audit.md).
