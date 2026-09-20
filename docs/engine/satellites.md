# Carried satellites

Satellites are untargetable carried effects. They consume no actor, summon,
health, collision-body or skill-bar slot. Players, monsters and allies share
one conductor. **Iron Wake** deals physical damage on contact. **Cinder Wake**
lobs fire mortars at fixed ground marks, with a visible arc and impact ring.
**Storm Wake** fires ordinary lightning orb projectiles; see
`docs/engine/auroras.md` for its equipment and the independent charged aurora.
All are registry definitions; contact and ranged emission can be composed.
**Rime Wake** adds cold precision: a committed aim line followed by a fast,
thin piercing shard. Its Rimebound jewelry and the separate Graveglass
interceptor guardian are documented in `docs/engine/guardians.md`.

## Shipped content

- **Iron Wake magic packs**, enemy level 5+: every original member carries
  one orb through the ordinary `magicPack:iron_wake:0` modifier source.
  The standard pack policy controls eligibility, weight and membership.
- **Wakebound** prefix, item level 8+: rings and amulets grant one Iron Wake
  satellite. Multiple equipped items add together. No special equip logic.
- **Cinder Wake magic packs**, enemy level 9+, and the **Cinderbound** jewelry
  prefix, item level 12+, grant fire satellites through the same stat system.
  Each orb arms for 1.1 seconds, then lobs every 2.4 seconds at the nearest
  visible hostile within 330 units of the orb. Multiple orbs stagger their
  first shots across that interval. The 0.8-second flight ends in a 38-unit
  blast for 5–8 base fire damage. Orbit offset is 48, angular speed 1.1, orb
  radius 8. The bright shell identifies its fire family; it has no contact hit.
- Orbits stand 42 units outside the bearer radius, with a 9-unit contact
  radius and 1.6 radians/second rotation. An orb arms for 0.9 seconds and
  can hit each victim once per 0.65 seconds. Distinct orbs have independent
  contact cooldowns. Base damage is 4–6 physical, on the shared body-to-skill
  level ladder (one skill level per four body levels).

Avoid the actual moving orb, stand in the gap inside its orbit, or kill its
bearer. A dotted orbit guide identifies reach without implying a damaging
ring. The small filling arc marks arming. Occluded orbs fade and cannot hit.
These numbers are initial tuning, not a completed campaign balance pass.

## Authoring

`src/data/satellites.ts` registers `SatelliteDef` rows and ordinary hidden
skill payloads. `src/engine/satelliteSpec.ts` owns the open registry, stat
metadata and shared limits. Register a new family before content validation,
then put its payload in the ordinary skill registry. No family-ID branches
exist in the conductor or painter. Contact skills may compose ordinary damage
and status effects; the conductor does not reinterpret those effects.

Any normal modifier source can grant a family:

```ts
mod('satelliteCount_iron_wake', 'flat', 1)
```

This works in item lines, passive nodes, temporary buffs, monster base stats
and magic pack rules. There is no new passive-tree cluster in this pass.
Separate sources retain their existing attribution. Fractional grants add
before the resolved count is floored. Negative or removed grants retire orbs.

| Investment | Behavior |
| --- | --- |
| `satelliteCount_<family>` | Grants that family and stacks its quantity |
| `satelliteCount` | Adds quantity to families already granted; creates none by itself |
| `satelliteOrbit` | Multiplies the distance beyond the bearer rim |
| `satelliteSpeed` | Multiplies angular speed; zero parks the orb |
| `damage`, scoped to `satellite` | Scales all satellite payloads |
| `damage`, scoped to `satellite:iron_wake` | Scales that family |
| `damage`, scoped to `physical` | Scales its physical damage through the normal pipeline |
| `damage`, scoped to `fire` or `satellite:cinder_wake` | Scales the corresponding fire payload |
| `aoeRadius` | Scales the mortar's blast and its matching ground mark |

The payload uses bearer stats, including conversion, flat added damage,
mitigation, on-hit responses and credited deaths. These are not summons:
minion damage does not independently scale player-carried orbs. An allied
minion carrying its own grant uses its own already-derived sheet.

`SATELLITE_CFG.maxPerActor` caps the total at eight, shared across families
in registry order. Family and generic count stats are also bounded. Speed
and orbit investment have registry clamps. Uninvested actors use the cached
armed-family lookup; only bearers scan nearby victims. Nearby pooled bodies
are promoted through the existing bounded promotion seam before contact.

## Runtime and persistence

`src/engine/satellites.ts` owns transient phase, arming and recipient cooldowns.
`World.refreshSatellites` supplies hostility, timeflow, visibility and the
ordinary `resolveHit` path. It runs after movement, before projectiles.
`src/engine/satelliteFlights.ts` owns committed lob geometry and impact timing.
The optional `emit` definition supplies cadence and range. Its `mode` is
`lob` (with flight time, arc and impact flash) or `projectile` (the normal
projectile launcher); the ordinary ground skill supplies effects and blast radius.
Optional `target: 'farthest'` changes selection from the default nearest
enemy; `windup` commits a point and displays its aim line before emission.
These controls apply to either emission mode without family-specific code.
Launch copies both endpoints: chasing the target cannot move the landing mark.
Impact evaluates current occupants, hostility, story and line of sight, then
uses the same hit pipeline as contact. A flight gets its full warning even
on the launch frame. Emissions use bearer timeflow; launched flights advance
on world time. No target means no shot and no stored catch-up volley.
Sweeps subdivide both rotation and bearer motion; drawing uses the final
host-produced contact discs. Combat requires a clear bearer-to-orb path,
clear orb sweep and orb-to-target path on the same story. No catch-up damage
is resolved beyond the configured frame limit.

Count/radius changes, teleport-scale moves, faction/owner changes and story
changes reseat and re-arm the ring; they cannot sweep a newly positioned
orb through intervening space. The old hit clocks are cleared with the old
arming timeline. A zero-time refresh reconciles state without dealing damage.
Downed, dead, removed, dormant, concealed, burrowed and untargetable bearers
do not sustain active satellites. A reflected hit that kills a bearer stops
the remaining contacts and removes its visuals immediately.
The same lifecycle rules cancel pending mortars, including losing the family
grant or re-spacing its ring. Dead bearers cannot leave delayed ghost hits.
Each actor is capped at 24 pending flights, including impact flashes.

Grants persist through the existing item/passive/buff/pack save paths. Orbit
clocks are intentionally transient. Zone boundaries clear them and restore
grants with a full arming tell. No save compatibility reset is necessary.
Co-op snapshots carry exact host geometry; replicas draw without running a
second combat clock. Missing snapshot fields clear old geometry.

## Verification

- `npm run check`
- `npm run probe -- satellites`
- `npm run probe -- magicpack`
- `npm run sim -- run --suite smoke`
- `npm run build`, then `npx electron balance/satellites-ui.cjs`

The probe covers actual equipment and character saves, pack world saves,
count caps, physical/fire/family scaling, three update rates, moving-orbit
sweeps, fixed-mark dodges, staggered shots, matching blast radius,
walls/stories/friends, safe centers, kill credit, reflection, removal and
co-op replacement. The isolated hidden client captures iron warning/active
orbs and fire flight/impact for a three-member pack and three player grants.
It also records actual canvas text to ensure pack names remain visible and
explanatory pack subtitles do not return.
