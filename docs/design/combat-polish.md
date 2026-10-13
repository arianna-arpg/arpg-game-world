# Targeting, Charge and recovery orbs

Player-owned minions treat unarmed ambient critters as incidental prey. The
definition and live skill list must both be empty: armed crabs, elk, granted
skills and enemy summons remain ordinary opponents. A visible threat always
beats incidental prey, including a held critter lock. Idle attacks require at
most 48 units between body edges and a prey position within 160 units of the
keeper. Those limits also retire cached locks, preventing long chases. Wild
predation, passive stances, taunts and explicitly pinned assault orders retain
their existing behavior. Tuning lives in engine/minionTargets.ts.

Charge opts into groundWake in data/skillMovementVisuals.ts: short paired skid
lines and outward dust ticks follow only the measured travel path. It uses the
existing bounded movement history and copied co-op flashes. There is no new
damage area, movement rule, particle simulation, lift or leap animation.

Life and mana orb-on-hit sources each share one attempt per bearer every 0.75
seconds. Failed rolls consume the interval too; additional targets, chains,
repeats and skill swaps cannot add rolls inside it. A long channel can roll
again after the interval. This is an internal cooldown on attempts, not a
per-cast or guaranteed-per-minute system. Only actual top-level damaging
contacts qualify. Existing on-kill, on-hurt, ambient, extraction, shield and
Wakeflame generation are unchanged. Tunables live in data/orbs.ts; the shared
gate is engine/orbGeneration.ts.

Eligible life/mana hit sources receive a quiet recovery multiplier below 60%
of the usable resource pool, rising linearly with both resource deficit and
the missing fraction of the best-stocked applicable restorative flask. Fully
reserved resources are not a deficit. Only slotted restorative banks count;
unrelated, saved and duplicated slots cannot distort the fraction. With no
applicable flask, resource deficit alone supplies the reserve term. At empty
resource and empty reserves the multiplier is 4, so a 5% source becomes 20%.
The existing 50% chance cap remains. Zero grants never gain a source, and the
boost never bypasses cadence or proc-depth rules. No buff/icon advertises this
assistance; public source descriptions explain only the common attempt interval.

Run npm run check; npm run probe -- miniontargets; npm run probe -- orbgeneration;
npm run probe -- companionstance; npm run probe -- flasktrees;
npm run probe -- movementvisuals; npm run sim -- run --suite smoke; npm run build.
Then run the hidden balance/movement-visuals-ui.cjs harness for measured trail
pixels, eight live casts (including Charge), and co-op rendering with isolated saves.
