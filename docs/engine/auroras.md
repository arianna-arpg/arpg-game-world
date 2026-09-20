# Charged auroras and lightning satellites

**Storm Wake** and **Pall Aurora** are passive carried effects. Both use normal
modifier sources and skill/projectile damage. Neither is enrolled in the magic
pack pool. No new active skill slot, minion actor or targetable body is allocated.

## Content

- **Stormbound** jewelry, item level 16+, grants one Storm Wake satellite.
  Each arms for one second and fires a lightning orb every 1.8 seconds toward
  a visible hostile within 360 units of the satellite. Extra satellites stagger
  their first shots. The orb flies at 290 units/second, radius 7, range 420,
  and deals 3–9 base lightning damage on contact. It stops on its first target
  unless ordinary projectile modifiers change that behavior.
- **Pallbound** jewelry, item level 18+, grants eight Pall Aurora capacity.
  One bubble replenishes every 0.65 seconds. A full reservoir settles for
  0.4 seconds, waits for a visible hostile within 300 units, then releases
  one bubble every 0.1 seconds. Each ring fans out through a full circle;
  the bubbles do not converge on one target. Recharge resumes after the last
  bubble leaves. The payload deals 2–4 base chaos damage, flies at 190 units
  per second for 330 units, and has radius 6. Unmodified bubbles stop on
  contact. These are initial balance values.

The pale, transparent bubbles are the reservoir readout. A partially formed
bubble shows fractional recharge. The ring empties as its bubbles depart;
there is no explanatory caption or numeric charge counter in combat. Lightning
orbs carry a bright internal spark. `OrbPaint` is reusable appearance data,
shared by stored motes and ordinary projectiles; it does not alter collision.

## Extending the systems

Satellites still live in `data/satellites.ts`. Their optional `emit.mode` selects
`lob` (fixed ground mark) or `projectile` (ordinary traveling skill payload).
The projectile path uses `World.spawnProjectile`; adding another damage type
requires a registry row and a normal skill, not an engine branch.

Auroras have an independent registry in `engine/auroraSpec.ts`, content in
`data/auroras.ts`, and a conductor in `engine/auroras.ts`. The definition owns
recharge, ready delay, release interval, trigger range and ring layout. Its
ordinary projectile skill owns damage, radius, speed, range and trajectories.
`engine/carriedEffects.ts` is the shared host-services interface used by both
conductors: eligibility, timeflow, hostility, line of sight, skill instances,
hits and projectile launches. No family names are special-cased in the engine.

| Modifier | Effect |
| --- | --- |
| `satelliteCount_storm_wake` | Grants/ adds lightning satellites |
| `auroraCapacity_pall` | Grants/ adds Pall Aurora capacity |
| `auroraCapacity` | Adds capacity only to an already granted aurora family |
| `auroraRecharge` | Multiplies replenishment speed; zero pauses replenishment |
| `damage` with `lightning`, `projectile`, `satellite`, `satellite:storm_wake` | Scales matching lightning payloads |
| `damage` with `chaos`, `projectile`, `aurora`, `aurora:pall` | Scales matching aurora payloads |
| Normal projectile size, speed, pierce, chain and trajectory modifiers | Apply at launch through the existing projectile system |

Quantity comes from satellite count or reservoir capacity; calling the
single-projectile launch primitive does not multiply it again by the active
cast's `projectileCount` stat. Satellite investment does not affect aurora
capacity, motion or damage. These are carried effects, not summoned minions;
a bearer uses its own sheet. Passive nodes, buffs and authored monsters may
grant them through the same modifiers, even though no pack recipe does so.

Each aurora family caps at 24 bubbles and a bearer at 32 across families in
registry order. Family changes, capacity changes, death/downing, removal,
concealment, story/allegiance changes, and teleport-scale movement discard held
charge and queued releases. Changing equipment cannot refill a reservoir.
Ordinary movement carries it with the bearer. Zero-time reads never replenish
or release. Bearer timeflow controls both buildup and release; large frames
are bounded. These clocks are transient: gear grants persist, but travel/load
starts empty. Co-op receives exact host bubble geometry and projectile paint;
missing optional fields clear old replica visuals.

Once released, lightning orbs and aurora bubbles are ordinary projectiles:
they keep the engine's collision, reflection, proc, allegiance, timeflow and
expiry semantics, including finishing a flight after losing the grant. Removing
the source stops future emissions. Cinder Wake's pending ground mortars retain
their existing source-cancellation rules.

## Verification and reference

`npm run probe -- auroras` exercises real equipment/save paths, projectile
hits, typing, counts, 30/60/120 Hz, buildup/release, timeflow, lifecycle and
co-op replacement. `npm run probe -- satellites` retains the iron/fire coverage.
Run `npm run check`, the smoke sim, and build before the isolated hidden
`balance/auroras-ui.cjs` visual harness. Its five scenes capture lightning
flight, partial buildup, a full reservoir, outward cascade and replenishment.

The user's Shadow Dungeon reference informed the broader equipment-mechanic
direction. Its [official content announcement](https://steamcommunity.com/app/4423580)
describes equipment-granted auras, projectile shields and summon accessories.
The mechanics and tuning above are Hollow Wake designs, not claims about a
specific Shadow Dungeon accessory.
