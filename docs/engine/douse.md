# The Douse Law & the Mirage Promise

Two halves of one desert idea: **water genuinely saves you**, and therefore
**the mirage genuinely lies to you**.

## RegionKind.douses — ground as CURE

Any region row (doodad ground or grid region) may carry a douse lane:

```ts
douses: { statuses: ['sunscorched', 'heatstroke'], every: 0.25, text: 'the water quenches…' }
```

- **Shedding**: while the row holds an actor, the region sweep's *douse beat*
  (`World.douseSweep`) sheds one stack of **each** listed status per `every`
  seconds (`DOUSE_CFG.every` default). The shared `shedStatusStack` keeps the
  sheet honest — per-stack mods re-sync, the source lifts with the last stack
  (the heat lane's shade-shed hygiene, extracted; the gaze's dark uses the
  same helper now).
- **Suppression**: the heat loop (`updateHeat`) treats douse-ground as
  bake-proof for the statuses it strips — standing in water under the swelter
  sun bakes **nothing**. Refuge is a held door, not a slower tug-of-war.
- **Insurance**: the same `groundInsured` gate as every other ground effect —
  a **flier** skimming the pool is not wet; habitat/immuneGround bodies take
  neither the ground's harm nor its mercy.
- **Text**: floats once, when a listed status fully lifts.
- **Composability**: `addTempGround(pos, 'water', …)` (Icy-Comet-style skill
  terrain) douses too — conjured water is real refuge. Any future row can
  wear a lane: a snowmelt spring stripping burn is one data row away.

**Deliberate absences** (probe-pinned): `brine_sink` carries **no** douse row
— the saltflat's design commitment is a pan with no mercy, and the brine is
caustic soup, not refuge. Rows today: `water`, `deep_water`, `tide_pool`.

## The mirage oasis — the lie with teeth

Because wading now cures the scorch, a distant pool is worth a trek — so
`mirage_oasis` stopped being a pale ghost and started wearing **real water's
exact face**:

- **Reskin doctrine**: `WATER_LOOK` (doodadVisuals.ts) is ONE shared params
  object; `water` and `mirage_oasis` both spread it — same nested objects by
  reference, same `theme:water` tint, same sheen, same paint order 10. The
  lie cannot drift as water is retuned; the probe pins reference equality.
- **The vanish is untouched**: brittle `on:['near']` reach 120 pops it with
  'the water was never there…' exactly as before.
- **The tells, honest and small** (for veterans to learn):
  1. `LiquidParams.flicker` — the generic **liquid illusion lever** (any
     liquid kind may wear one): a rare, brief blink on a seeded per-disc
     clock (periods jittered so two illusions never sync) — the body redraws
     dimmed under a sideways shear, the sheen cuts out for the beat. Outside
     the blink the draw is *exactly* the shared statics + sheen.
  2. **No wet shore**: the ground-texture coast wash keys on real water
     kinds; the fake casts no dampness.
  3. **No green**: palms/reeds only ever gather around true pools (the
     oasis_haven composition); the mirage stamps alone on bare sand.
- **Flicker ⇒ live body**: `liquidBodyIsLive` returns true for flicker kinds
  by construction — a chunk-baked body could neither blink nor vanish
  cleanly on the pop. True water stays baked.
- `mirage_bastion` / `mirage_caravan` keep the `mirageGhost` silhouette look:
  their lie is the horizon's, not the waterline's.

Probe: `npx tsx balance/probe_douse.ts`. Dials: `DOUSE_CFG` (regions.ts),
per-row `douses`, per-kind `flicker`, `HEAT_CFG` unchanged.
