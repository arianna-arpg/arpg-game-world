# Visual world cues

Fonts appear in safe settlements and harbors by default, through
`FONT_PLACEMENT` / `fontStandsIn` in `engine/fontPlacement.ts`. An authored
`ZoneDef.font` overrides that policy. Ordinary combat zones no longer roll
random Fonts. Lastlight retains its authored station seat.

The existing station dwell opens the Font panel. Merely approaching it adds
no HUD banner or Skills-page conversion/reset controls. Recipes, prices and
the station title remain inside its explicit service panel. The world basin
uses its violet flame, rim glyphs and descending motes as its identity.

Waypoints have no floating nameplate or attunement narration. Their dormant,
attuned and besieged states are the ring brightness, broken arcs and visible
siphon tether. Attunement and failed attunement use pulses; quest objectives,
map controls, dialogue and lore retain explanatory text.

Refuge escapes carry a transient picture of the creature into its actual
cover. `REFUGE_DEPARTURES` in `engine/refugeDeparture.ts` declares duration,
rise/sink, shrink and particle effect by cover kind. Trees climb with leaf
flecks; brush compresses into cover; water dives with ripples. New cover kinds
can declare a motion, or use the fallback. `refuge.fx` can still override the
particle effect. Ambient narration strings have been retired from this seam.

`World.fleeIntoRefuge` removes the live actor without killing it, rewarding it,
or leaving an attackable animation behind. The ordinary flash lifecycle owns
the short animation; its captured body and cover position travel on the
co-op snapshot. The body uses the existing sprite baker and emits no light.

Checks: `probe_visualcues` covers placement, dwell, reward-free departure and
co-op transfer; `probe_effectvoice` covers the painter registry. A production
desktop check should also view the climb/dive at several points in its life.
