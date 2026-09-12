# The empty lance and the fracture brood

Bannered Lance now joins the Hollowborn's vacant-armor language. Its parted
cuirass, detached helm and one gripping gauntlet accompany a narrow herald's
lance and a pennant. The existing planted-banderilla/dash-strike kit and all
other monster fields are unchanged. The composition lives beside its kin in
`src/data/courtLooks.ts`.

The Abyssal pass uses the existing rift setting as its anatomy: a fractured
dark crust, cold luminous edges, empty centers, exposed void-eyes and grasping
limbs. The faction's lesser members gain their own looks instead of borrowing
generic caster, knight and beast compositions. The Horror and Tyrant retain
their established boss designs.

## Refreshed Abyssals

| Entity | New visual identity |
| --- | --- |
| Abyssal Horologist | A broken dial around a small suspended eye; detached fragments turn counter to its shape. |
| Abyssal Seer | An oversized iris exposed beneath parted plates and sensory cilia. |
| Abyssal Vanguard | Overlapping crag-like plates, heavy claw limbs and a small recessed eye. |
| Rift Ascetic | Pale shell plates and folded limbs around a fixed eye; a narrow trailing body. |
| Abyssal Render | Long cutting limbs around a hungry mouth, with a smaller armored core. |
| Abyssal Wretch | A large mouth hanging beneath a torn shell and trailing tissue. |
| Abyssal Crawler | A small segmented crust with cilia and forward mouthparts. |
| Abyssal Broodling | A comparatively exposed eye inside a smaller, incomplete shell. |

Definitions live in `src/data/abyssLooks.ts`, collected through `LOOKS`.
The two former dedicated caster entries move out of `src/data/looks.ts`;
generic `hexer`, `crusader`, `wraith`, `stalker` and `swarm_bug` remain intact.
The Broodling remains a gear-summoned companion and is not added to spawn tables.
All nine refreshed existing entities, including Bannered Lance, retain their
nonvisual definitions. Drawn limbs do not introduce additional combat targets.

## New entity: Abyssal Foldwright

`src/data/abyssMonsters.ts` adds `abyssal_foldwright`: a ranged specialist whose
backward-curving limbs and separated panels frame the gaps it opens. It uses
the existing **Null Verge** to threaten a lingering area and **Umbral Lance**
to send a narrow beam across the approach. Moving out of the lingering ground
and across the beam's facing remains the counterplay. Its 68 base life, 32
energy shield and 100 move speed make it a fragile caster rather than another
frontline shell. Both skills use the ordinary artillery brain.

It joins the fracture package roster and `abyssal_rift` pack table at weight 1.
Presence lives on the definition: zero at level 11, increasing to full at 16.
The Abyssal faction retains its `fractures` context restriction. No baseline
roaming or ordinary overworld spawn door is added. Its definition count grows
from 10 to 11, including bosses and the gear-only Broodling.

## Six reusable parts

`src/data/abyssGlyphs.ts` registers through `src/data/glyphParts.ts`. Every part
is ordinary Part Forge data with per-surface palette roles and the standard
placement, scale, rotation and mirroring controls.

| Kind | Purpose |
| --- | --- |
| `heraldLance` | Long metal shaft with a single faceted spearhead and small guard. |
| `riftCarapace` | Four separated jagged plates with an open central channel and luminous inner edges. |
| `voidIris` | Dark socket, offset iris and a cleft pupil. |
| `brokenDial` | Four interrupted arcs with displaced teeth and disconnected hands. Decorative, not a cooldown display. |
| `riftTalons` | Paired angular forelimbs with distinct joint and blade surfaces. |
| `riftCilia` | Four pairs of curling sensory filaments tipped with faint light. |

The compositions combine these with existing mouths, tatters, gauntlets,
helmets, wisps and floating shards. Colors remain palette-driven; creature
identity is carried by plate placement, eye size and limb proportions.

## Verification

- `npm run check`.
- `npm run probe -- anatomy`: 47 assertions passed.
- `npm run sim -- run --suite smoke`: 25 episodes passed.
- `npm run genqa -- --seeds 2 --filter abyssal_rift`: zero failures or warnings.
- Local seeded combat check: Foldwright executes both skills through live AI
  and the shared world loop, with no forced casts. Also verifies both roster
  entries, the arrival curve, the faction's context restriction and unchanged
  nonvisual fields on the nine existing entities.
- Visual review through the real portrait compositor and native-size body
  bakes, including animation. Ten looks at two radii and three pose times:
  60 nonempty renders, all inside sprite padding.

The ignored local study in `balance/reports/abyss-study/` shows the four
requested comparisons, the new entity and kit parts. Its `?kin` view covers the
remaining five refreshes. Snapshots, combat results and screenshots stay local.
