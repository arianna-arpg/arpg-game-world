# World-boss colossi: first encounter pass

Vhorun has since moved into the separate Titans package. See [Titans](titans.md)
for its physical travelling body, persistent wake, roster companions and the
replacement world bosses. The attack/weak-point grammar below still serves its
head fight; the old world-boss lattice is no longer its traversal model.

The goal is a creature that changes how the player navigates and chooses
targets. Scale comes from anatomy, terrain, and deliberate attack sequences.
The encounter should remain legible at ordinary camera zoom.

## Cragmaw, the Orogeny

The walking mountain now has a radius-100 root and two radius-44 fists,
mounted 150 pixels to either side. Its full width is approximately 388
pixels against the tested warrior's 30-pixel body. Base life stays 1,050. Its stone
crown, engraved plates, illuminated eyes and separate fists use existing
anatomy painters; these are ordinary monster looks, also available to
portraits and the creature editor.

Each attack plants the mountain, marks the ground, then lands in order:

- **Mountain:** the fists rake opposite flanks. Approach through the center.
- **Barrage, below 55% life:** the hands continue; a crown fragment also
  marks the target's position. Move after the warning appears.
- **Landslide, below 22%:** a broken eruption ring joins the hands. The
  inner refuge and gaps between eruption marks remain usable.

The left and right fists independently disable their corresponding attacks,
including warnings already on the ground. Either break damages and exposes
the root. Breaking both leaves the later crownfall/eruption threats intact.
Every attack has at least 1.8 seconds of warning. Each sequence ends with
3.5–4 seconds of increased damage taken, then three seconds of walking.
There are no surprise radial shoves or unannounced charge impulses.

## Vhorun, the Sunder-Wyrm

The existing world route, road seals, terrain crushing, 26 hittable segments,
scale tears, kill attribution and hoard remain. Its root now alternates
warned attacks, vulnerable recovery, and movement:

- **Coiled:** paired forward fissures leave a central seam; a venom well
  marks the target and dries after three seconds.
- **Thrash, below 62%:** a broken eruption ring replaces the fissures.
- **Fury, below 28%:** fissures and the eruption ring combine; five brood
  appear once per body, without an invulnerability gate.

Breaking the Sunder-Maw cancels venom wells, including lingering pools.
The maw and neck coils retain their existing independent skills, so root
recovery is an opening rather than immunity to every nearby threat.
Warnings last at least 1.7 seconds. Venom expires before root recovery begins.
The serpent keeps moving during warnings, rests only during recovery, and
gets another six seconds of travel afterward so its body can unspool.

## Extension and ownership

`src/data/worldBossEncounters.ts` owns patterns, skills, Cragmaw's bodies and
looks, and Vhorun's brain. Registry spreads enroll those rows normally.
Vhorun's existing body/segment definition stays in `monsters.ts`.

The shared `AttackPattern` grammar freezes positions and facing at warning
time. Off-floor marks are omitted instead of moved into an escape route.
The ordinary ground-zone damage path uses the boss as caster and its real
skill instance for scaling, mitigation and credit. Source death or a part
ban cancels both pending and active pattern zones. No boss-specific branch
was added to the engine, renderer, network or save format.

The local `cycle` authoring helper emits ordinary `PhaseDef` rows. Tune
warning/attack duration, recovery duration, exposure, health gates and mods
there; edit pattern points/radii/delays separately. Gates are checked after
recovery so burst damage cannot skip the offered opening. Never put
`rewardGems` on a looping phase. The final hoards remain on the existing
world-boss package; the old three intermediate phase gems are removed.

## Verification and limits

`npm run probe -- worldbossspectacle` exercises real organ death, source
and skill identity, fixed marks, actual damage, gap clearance including
hero radius, all live AI phase transitions, one-time brood and reward safety.
Also run segments, rampage, anatomy, arenabosses and worldbossloot probes,
`npm run check`, and the simulation smoke suite.

After building, `npx electron balance/world-bosses-ui.cjs` renders both
encounters in a hidden client with isolated saves/profile. Images and facts
land in `balance/reports/`.

World-boss re-entry still preserves the overlay's life fraction and respawns
anatomy/phase state as before. This pass does not introduce persistent broken
limbs, new save state, camera automation or a new boss species. Arbitrary
terrain can obstruct a mathematically open pattern gap; these bosses fight
in real country and crush eligible standing obstacles, but do not erase
cliffs. Broad build balance and feel still need human playtesting.

Next design direction: an anchored sovereign whose torso forms a horizon,
with independently breakable limbs reaching into the playable ground. Its
anatomy should determine which attacks survive, using this same grammar.
The user's next boss concept should determine that encounter's identity.

### Verification record — 2026-09-18

- All 32 spectacle assertions passed in the working tree and in a clean
  committed-source copy with only this encounter pass applied.
- `npm run check` passed in that isolated copy (game, launcher, simulation).
  The shared checkout's checks encountered unrelated unfinished passive,
  renderer and parry edits while other sessions were active.
- Segments, rampage, anatomy, arena-boss and world-boss-loot probes passed;
  the simulation smoke suite completed all 25 episodes.
- Vite produced the client bundle. The hidden Electron visual check passed
  for both bosses, including proximity-triggered wyrm emergence, live parts,
  active warnings and no fatal client error. Its graphics process required
  execution outside the filesystem sandbox on this machine.
