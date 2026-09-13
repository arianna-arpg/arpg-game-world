# Crow and Gnasher nuisance pass

The repeating retreat/leap loop came from an incorrect locomotion choice:
`juke` always moves **away** from its target. It is a prey-flight kernel, not
an erratic approach. Carrion Crows, Cave Gnashers, Great Gnashers, Cave Bats and
Bloodwings all used it as their normal combat movement. Leap attacks brought
the first three back to the player, then the movement kernel immediately
started another retreat. Crows also panicked whenever a foe came within 90 px.

## Authored behavior

| Enemy | Ordinary fight | Occasional maneuver / opening |
|---|---|---|
| Carrion Crow | Close and rake; packmates approach different bearings | After 4 s engaged, a 0.6–0.9 s close orbit, then 8–12 s before rearming. Wounded wild birds can escape as described below. |
| Cave Gnasher | Dart toward the prey for 0.3–0.5 s, gather for 0.25–0.45 s; spread around its flanks | Wild leaps wait an extra 3–5 s once ready, have reduced selection weight within 95 px, and share the existing burst budget. |
| Great Gnasher | Commit to a direct advance and heavy strikes | 0.45–0.65 s recovery after completed attacks; wild leaps wait an extra 4–7 s, have reduced weight within 110 px, and share the burst budget. |
| Cave Bat | Close and rake; spread approach bearings | Sometimes plant its feet after a strike for 0.35–0.6 s. |
| Bloodwing | Close and rake; spread approach bearings | The same brief close-orbit rhythm as the Crow. |

Crows decide attacks every 1.0–1.4 s and Cave Gnashers every 0.8–1.2 s.
These are decision clocks, not guaranteed intervals between hits: skill costs,
cast times, cooldowns and interruptions also apply. Ordinary life, damage,
movement speed and skill definitions are unchanged.

A wild Crow's escape requires at least 6 seconds of engagement, at most half
life, and a foe within 85 px. It uses the normal Take Wing press, paying its
usual action/cooldown restrictions. The rule rearms 14–18 seconds after its
0.5–0.75 second hold. It does not hold a distant firing band after landing.
Take Wing is excluded from ordinary autonomous selection, so it cannot
independently restart the vanish/dive cycle. Proximity alone no longer panics
the Crow.

## Replenishable bodies

`AICondition.conjured` reads the existing `Actor.noBounty` marker, which combat
summons, births and splits already receive. It is deliberately independent
of team or minion ownership, and adds no persisted state. Absent conditions
retain the existing behavior.

Conjured Crows cannot trigger the escape rule. Conjured Cave and Great
Gnashers select their ordinary melee attacks instead of Crushing Leap.
This applies again to each replacement body without a summoner-specific
exception. The Crowfeather Piper and Gnasher Prodder keep their existing
summon cadence, count and lifespan; killing their adds does not restore the
annoying behavior on the next wave. Player-controlled skill presses are
unchanged. Other enemies' flight, skirmisher and assassin behavior is untouched.

## Verification and measurements

`balance/probe_harassment.ts` runs real AI and world updates. It checks contact
time and attacks at 30/60/120 Hz, real Piper/Prodder action-summoned bodies over
three seeds, retained wild Crow escapes, and an A/B against the flee kernel.
In 24-second stationary-target tests, Gnashers now spend about 22 seconds
within 95 px on the ground, versus roughly 3 seconds with the fleeing control.
The tested conjured Crows and Gnashers spend zero time airborne.

The existing pack-tempo census explicitly includes the two Gnasher definitions;
its burst-budget, cast-slack and range-weight checks remain in force.

Additional starter-build comparisons use five seeds for each of Warrior,
Magician and Summoner at level 5, against four Crows, four Cave Gnashers, or one
Great Gnasher. The Warrior clears all five seeds for all three revised fights;
previously the Crow packs timed out at 60 seconds and both Gnasher encounters
killed it in all five. These are automated pilots in an open arena, not a
claim that every class matchup is balanced. Fragile caster builds can still
lose to Gnasher packs, and sustained melee pressure is higher when enemies
stop running away. Hands-on checks should emphasize ranged spacing, mounted
Gnashers and mixed summoner encounters.

Checks: `npm run check`, `npm run sim -- run --suite smoke`,
`npm run probe`. The full probe run passed 219/221, including all AI and summon
checks. Two unrelated failures remain in the pre-existing working changes:
`probe_doodadfams.ts` expects an unreported rock push to rebuild unchanged
canopy; `probe_unlocks.ts` reports `feat_reliquary_ring` as an unreachable flag.
