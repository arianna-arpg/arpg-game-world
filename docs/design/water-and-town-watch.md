# Water and the Lastlight watch

Ordinary water uses one material in src/data/waterSurface.ts. The native liquid
painter and geographic floor share its deep blue palette; a common live ripple
painter uses world coordinates and simulation time. Creeks and rivers remain
native water doodads, with their existing shallow/deep, dousing, wake and bridge
rules. Geographic water retains its region collision and standing effects.
Special waters (souls, scalding basins, brine and lava) retain their identities.
The mirage oasis deliberately inherits ordinary water's appearance.

Ripples clip to the actual water union or wet region cells, including shallow
fords. They do not consume random state, mutate terrain, or invalidate floor
bakes. Spacing, amplitude, drift, speed and opacity live in WATER_SURFACE.

## Lastlight

New seamless expeditions snapshot LASTLIGHT_DEFENSES in their settlement
configuration. A continuous timber rail perimeter stands outside the native
building footprint, within the reserved dry apron. Four broad openings share
settlementDeparture with the actual road planner. Lanterns flank the openings.
Existing expedition descriptors without defenses retain their old layout.

Each entrance has an independent watchman and bowman with distinct native part
artwork. They use ordinary skills, perception, collision, damage, AI posts and
leashes. They are powerful but mortal. Guards return to their own posts instead
of following players into the countryside. Guard positions, wounds and deaths
persist through the settlement's existing body checkpoint; fence changes use
its scenery checkpoint. There is no guard respawn policy.

The sanctuary still protects players and their owned bodies symmetrically.
Only actual, ownerless resident defenders can fight across that protection;
a summoned or captured copy cannot borrow the exemption. Approaching enemies
can engage visible nearby defenders and retaliate normally. Without a defender,
native retreat remains active; an intruder without an outside home routes to a
real gateway. Independent guards' kills pay no player XP, loot or kill credit.

## Reusable defense kit

SETTLEMENT_DEFENSE_STRUCTURES registers watch_rampart and watch_gatehouse as
native structure blueprints. The first joins masonry and parapets. The second
combines ramparts, arrow slits, four tower slots and a five-cell native
openable/breakable gate. Existing builders can place these through their fixture
or structure-stamp contracts and choose a faction/population separately.
Lastlight uses the timber perimeter instead of these fortified structures.
The gatehouse currently uses native door artwork, not a new portcullis painter.

## Verification

- npm run check
- npm run probe -- settlementdefenses
- npm run probe -- watersurface
- npm run probe -- worldmass_sanctuary
- npm run probe -- douse
- npm run sim -- run --suite smoke
- npm run genqa
- npm run build -- --outDir balance/reports/water-watch-dist
- node_modules/.bin/electron.cmd balance/water-watch-ui.cjs

The hidden client uses an isolated save profile and captures the north gate,
creek, two lake-animation frames, a guard fight and Continue. It compares live
water pixels, verifies warm floor reuse and tests the real browser checkpoint.
