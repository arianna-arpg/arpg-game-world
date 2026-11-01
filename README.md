# Balance farm results

Data branch: machine-written by `.github/workflows/balance-farm.yml`. Do not edit by hand.

- `latest/` the newest night: `summary.json`, `digest.md`
- `nights/<date>/` one small record per night
- `trend.jsonl` one line per night
- `state/` what the next night builds on: the search archive, measured lane costs, row snapshot

Page: https://arianna-arpg.github.io/arpg-game-world/balance/

---

# Balance farm, night of 2026-11-01

Commit [6b9a41b1de](https://github.com/arianna-arpg/arpg-game-world/commit/6b9a41b1de0e227c249416141e1fbf84cf62c68a), profile `full`. 666,307 episodes, 145 core-hours, 295 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/41301522492).

## 🔴 Regressions

**16 new skill × support defect(s) since last night**: `gloria|gathered_casting|cost_only`, `buckler_strike@barbed_figure|gathered_casting|cost_only`, `doom_bell|gathered_casting|cost_only`, `soul_glut|gathered_casting|cost_only`, `tongue_reel|gathered_casting|cost_only`, `caul_lash|gathered_casting|inert`, `winters_sweep|gathered_casting|cost_only`, `call_of_the_deep|gathered_casting|cost_only`, `zealots_cadence|gathered_casting|inert`, `hate_eruption|gathered_casting|cost_only`. Forensics: `npm run sim -- matrix explain <skill> <support>`.

## Engine defects

These are bugs in the game reachable in play, not balance findings. Each stays listed until it stops happening, and only a new one turns the night red.

**The engine stopped returning.** A real client would freeze here. The farm restarted past each one, so only that episode was lost:

- `EpisodeStalled: hung in forEachAlong < liteProjectileSweep < updateProjectiles`: 11 episodes, no tick came back for 60s. First seen in `threat_starter_magician_l5_vs_farshore_warden_l5`, seed 3257507324. <details><summary>stack and repro</summary>`forEachAlong < liteProjectileSweep < updateProjectiles < update < runEpisode < runScenario < runDefs < sweepBestiary < cmdSweep < main < (anonymous) < run`<br>`npm run sim -- sweep bestiary --levels 5,12,25 --seeds 2 --shard 12/20 --stream --no-episodes --stall-sec 60`</details>
- `EpisodeStalled: an episode ran past its time cap`: 3 episodes, ran past its time cap (240s). First seen in `search_spar_g_83hzr11433vp1`, seed 85163097. <details><summary>stack and repro</summary>`update < runEpisode < (anonymous) < evaluateGenome < runSearch < searchRun < cmdSearch < main < (anonymous) < run`<br>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ3YXJsb3JkIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6ImljeV9jb21ldCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImxvYWRlZF9kaWNlIiwic3VtbW9uX3BoYW50YXNtIiwicmluZ2luZ19yZXBvcnQiLCJzcGlyaXRfdG90ZW0iXX0seyJpZCI6InNlcnBlbnRfcmF5IiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTM1MjE1NDg4NiwidW5pcXVlcyI6eyJib290cyI6InRob3VzYW5kX3N0ZXBzIn19 --seeds 3 --base-seed 2791084338 --stall-sec 60`</details>

**Legal builds crashed the engine.** Each is one command to reproduce:

- `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.kill` (4 pairs): `npm run sim -- matrix explain essence_drain@borrowed_time withering_agony`
- `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.kill` (129 candidates). <details><summary>repro</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidmVudF9ob3AiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbIm1hbHByYWN0aWNlIl19LHsiaWQiOiJzdW1tb25fc3dhcm1saW5ncyIsInJhcml0eSI6Im1hZ2ljIiwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxNDk0NjQxOTI5LCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIn19 --seeds 3`</details>
- `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.assaultDoomCull` (8 candidates). <details><summary>repro</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhcG90aGVjYXJ5IiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZGV0b25hdGVfbWluZXMiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImNhc3Rfb25fb3ZlcmNoYXJnZSIsInJlZ2ljaWRlIl19LHsiaWQiOiJ3b3JkX29mX2Rvb20iLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImJsZWVkX2NoYW5jZSJdfSx7ImlkIjoiaWduaXRlIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwb3dkZXJrZWciXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjEwNTgyNTYyODksInVuaXF1ZXMiOnsiYm9vdHMiOiJ3YW5kZXJlcnNfd2FrZSIsImdsb3ZlcyI6InRpdGFuc19ncmFzcCJ9fQ --seeds 3`</details>

## What moved since last night

No row moved past its own noise and 10%.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 33 outlier(s) did not hold up on fresh dice, or landed within 15% of their target, and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | class `trapper` | `classes.trapper.attributes.strength`: 4 → 10 (+9 lines, ×2.5) | kill_rate: 0 → 0.1 | 0.1 | moved | mana_floor_pct 83.3→78.4 |
| 2 | skill `shambler_horde` | `monsters.grave_shambler.explodeOnDeath`: 2.2 → 0.88 | dps_dummy: 19394.7 → 7757.9 | 680.5 | moved, closes 62% | none moved |
| 3 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.6 → 139.1 | 93.2 | moved, closes 82% | none moved |
| 4 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 267.8 → 107.1 | 98.9 | moved | none moved |
| 5 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.4 (+1 lines, ×0.4) | dps_dummy: 246.3 → 98.5 | 98.9 | moved | none moved |
| 6 | skill `infernal_bombardment` | `monsters.bombard_demon.explodeOnDeath`: 1.6 → 0.67 | dps_dummy: 15916.3 → 6702.6 | 6635.8 | moved | none moved |
| 7 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.4 → 3.4 | 4 | moved, closes 76% | none moved |
| 8 | skill `scattergun` | `skills.scattergun.baseDamage.physical.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 7.4 → 18.4 | 23.6 | moved, closes 68% | none moved |
| 9 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 61.7 → 31.9 | 22 | moved, closes 75% | none moved |
| 10 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.46) | dps_dummy: 65.3 → 31.2 | 31.1 | moved | none moved |
| 11 | skill `earthrender` | `skills.earthrender.baseDamage.physical.0`: 12 → 6 (+1 lines, ×0.5) | dps_dummy: 187.4 → 93.7 | 93.2 | moved | none moved |
| 12 | skill `gale_lash` | `skills.gale_lash.baseDamage.physical.0`: 9 → 18 (+1 lines, ×2) | dps_dummy: 16.4 → 32.8 | 32.7 | moved | none moved |
| 13 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.6 (+1 lines, ×1.9) | dps_dummy: 1.9 → 3.7 | 3.6 | moved | none moved |
| 14 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 50 → 30.4 | 24.5 | moved, closes 77% | none moved |
| 15 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 9.2 (+1 lines, ×2.3) | dps_in: 0 → 6.1 | 6.1 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'classes.trapper.attributes*2.5' --scenarios pressure:trapper:30 --seeds 30 --base-seed 3769437563`. Same change at other bands: `pressure:trapper:5` 0.5→0.6, `pressure:trapper:10` 0.2→0.5, `pressure:trapper:20` 0→0.2, `pressure:trapper:40` 0→0
2. `npm run sim -- whatif --knob 'monsters.grave_shambler.explodeOnDeath*0.4' --scenarios skill:shambler_horde:40 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): cooldown -0.71, useTime -0.36. Same change at other bands: `skill:shambler_horde:5` 257.8→103.1, `skill:shambler_horde:10` 768.4→307.4, `skill:shambler_horde:20` 3055.9→1222.4
3. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.2, useTime 0.16. Same change at other bands: `skill:arclight_rain:5` 152.3→60.9, `skill:arclight_rain:10` 184.8→73.9, `skill:arclight_rain:20` 233.5→93.4
4. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.68, manaCost -0.04. Same change at other bands: `skill:marshlight:5` 228.1→91.3, `skill:marshlight:20` 319.1→127.7, `skill:marshlight:40` 449.9→179.7
5. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.4' --scenarios skill:mirespume:10 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.58. Same change at other bands: `skill:mirespume:5` 214.7→84.9, `skill:mirespume:20` 293.8→117.5, `skill:mirespume:40` 404.4→161.8
6. `npm run sim -- whatif --knob 'monsters.bombard_demon.explodeOnDeath*0.42' --scenarios skill:infernal_bombardment:40 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): cooldown -0.79. Same change at other bands: `skill:infernal_bombardment:5` 240.3→103.6, `skill:infernal_bombardment:10` 685.6→291.5, `skill:infernal_bombardment:20` 2623.7→1108.5
7. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): cooldown -1.27, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→1.9, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.5
8. `npm run sim -- whatif --knob 'skills.scattergun.baseDamage*2.5' --scenarios skill:scattergun:10 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 1. Same change at other bands: `skill:scattergun:5` 6.5→16.3, `skill:scattergun:20` 8.6→21.6, `skill:scattergun:40` 11.6→28.9
9. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 3769437563`
10. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.46' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 0.99, cooldown -0.78. Same change at other bands: `skill:trailblaze:5` 50.5→24.7, `skill:trailblaze:10` 56.4→27.4, `skill:trailblaze:40` 86.4→40.6
11. `npm run sim -- whatif --knob 'skills.earthrender.baseDamage*0.5' --scenarios skill:earthrender:40 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.77, useTime -0.28. Same change at other bands: `skill:earthrender:5` 108.8→54.4, `skill:earthrender:10` 121.8→60.9, `skill:earthrender:20` 141.4→70.7
12. `npm run sim -- whatif --knob 'skills.gale_lash.baseDamage*2' --scenarios skill:gale_lash:1 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.92. Same change at other bands: `skill:gale_lash:5` 18.4→36.8, `skill:gale_lash:10` 22→44.1, `skill:gale_lash:20` 27.5→55, `skill:gale_lash:40` 40.3→80.6
13. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.9' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.83. Same change at other bands: `skill:keening_shriek:5` 1.1→2.1, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.8
14. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 3769437563`
15. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.3' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 3769437563`. Other dials on this metric (elasticity): kit.ushers_lull 101. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2→4.5, `threat:starter_magician_l10:seatless_usher:10` 0.7→4.3, `threat:starter_magician_l20:seatless_usher:20` 0.6→6.2, `threat:starter_magician_l40:seatless_usher:40` 0.1→9.4

Run from commit `6b9a41b1de0e227c249416141e1fbf84cf62c68a`.
</details>

Too noisy to call: class `assassin`, class `firebrand`, support `septic_bargain`, class `sharper`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:skald + support:echoing_might + primary:whirl_of_grit + support:volley`: measured 2.9e+29 damage per second, its parts predict 13927.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJ3aGlybF9vZl9ncml0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidW5uZXJ2aW5nIl19LHsiaWQiOiJjYXJvbXMiLCJyYXJpdHkiOiJsZWdlbmRhcnkifSx7ImlkIjoiZmFuX29mX2JsYWRlcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImRvbWluYXRpbmdfYmxvdyIsImV4ZWN1dGlvbmVyc19lZGdlIiwiZWNob2luZ19taWdodCIsInZvbGxleSJdLCJsaW1iIjowfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxMjY3OTA3MjQyfQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:firebrand + support:echoing_might + support:desperation + support:steady_nerve`: measured 3.5e+14 damage per second, its parts predict 1585.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmaXJlYnJhbmQiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoibWFudHJhX3N0cmlrZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImxvb3NlX3RocmVhZCIsImVjaG9pbmdfbWlnaHQiLCJzdGVhZHlfbmVydmUiLCJkZXNwZXJhdGlvbiJdLCJsaW1iIjoxfSx7ImlkIjoidmVub21fYW1tdW5pdGlvbiIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjoyMTQ0MTgxNjkwfQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:vanguard + support:echoing_might + support:plus_projectile + unique:bloodletters_girdle`: measured 3.7e+9 damage per second, its parts predict 4087.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ2YW5ndWFyZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYmxvb2RfcHJpY2UiXX0seyJpZCI6InBvd2RlcmtlZ19hcnJvdyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImVjaG9pbmdfbWlnaHQiLCJwbHVzX3Byb2plY3RpbGUiLCJub3ZhX3JlbGVhc2UiXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjE0OTMwNzUsInVuaXF1ZXMiOnsiYmVsdCI6ImJsb29kbGV0dGVyc19naXJkbGUiLCJnbG92ZXMiOiJ0aXRhbnNfZ3Jhc3AifX0:spar --seeds 30 --base-seed 3769437563`</details>
- `class:pyromancer + support:echoing_might + unique:cindervigil + support:load_bearing_flaw`: measured 1779306 damage per second, its parts predict 1583.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJweXJvbWFuY2VyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im1lbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJ3aWxkX2FiYW5kb24iLCJvdmVybWVuZCIsImNsYW1vciIsInNwZW50YmFuZSJdLCJsaW1iIjoxfSx7ImlkIjoicmVhcCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInJlYXBlcnNfZW5jb3JlIiwiZWNob2luZ19taWdodCIsInNjYXR0ZXJlZF9jYXNjYWRlIiwiZmxlZXRmb290Il0sImxpbWIiOjF9LHsiaWQiOiJjaGFsbGVuZ2luZ19zaG91dCIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9LHsiaWQiOiJib25lX2NhZ2UiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbImxvYWRfYmVhcmluZ19mbGF3IiwidGVlbWluZ192ZWluIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJldmFzaW9uIiwiZ2VhciI6InJhcmUiLCJncyI6MjEyMzAzMDQyNiwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCJ9fQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:berserker + support:poison_chance + support:unleash + support:transfusion_bond`: measured 16261.1 damage per second, its parts predict 69.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiZ2xhc3NfbGFuY2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJwb2ludF9ibGFuayIsInNoYXR0ZXJnbGFzcyJdfSx7ImlkIjoic2FuZ3VpbmVfYnVyc3QiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVsbF9jYXNjYWRlIiwiYWRkbGluZyIsInBvaXNvbl9jaGFuY2UiXSwibGltYiI6MX0seyJpZCI6Imh1c2hfb2ZfdGhlX3dha2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ1bmxlYXNoIiwid2lsZF9hYmFuZG9uIl19LHsiaWQiOiJpbmZlcm5hbF9ib21iYXJkbWVudCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbIndhcmRpbmdfZmxlc2giLCJ0cmFuc2Z1c2lvbl9ib25kIiwiY29tbXVuYWxfcml0ZXMiLCJidXJpZWRfY2hhcmdlIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjg2OTc4ODUxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJsaW5lYWdlX2tub3QiLCJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:wallwright + support:gift_of_the_choir + support:capacitor + support:overmend`: measured 14752.3 damage per second, its parts predict 21.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6Im92ZXJjbG9jayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNhcGFjaXRvciIsImRvbWluaW9uX3RpdGhlIiwicHJlc3N1cmVfc2VhbCIsInBvbHlwaG9ueSJdfSx7ImlkIjoic2hhbWJsZXJfaG9yZGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJnaWZ0X29mX3RoZV9jaG9pciIsInRpdGFuaWMiLCJnYXRoZXJlZF9jYXN0aW5nIiwiZmxlZXRmb290Il0sImxpbWIiOjF9LHsiaWQiOiJoZWFsaW5nX3N0cmVhbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbImJvbmRicmVha2VyIiwiZWZmaWNpZW5jeSIsIm92ZXJtZW5kIiwic2llZ2VicmVha2VyIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTYyNjQyNjQ4NywidW5pcXVlcyI6eyJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:swashbuckler + support:measured_blows + support:time_fuse + support:efficiency`: measured 618.7 damage per second, its parts predict 1.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzd2FzaGJ1Y2tsZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiYnJpc3RsZWJhY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJtZWFzdXJlZF9ibG93cyIsImVmZmljaWVuY3kiLCJpbnN1bGF0aW9uIiwiYXRfdGhlX2JyaW5rIl0sImxpbWIiOjB9LHsiaWQiOiJzdW1tb25fcnViYmxla2luIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF93aGlsZV9jaGFubmVsaW5nIiwiYmVsbGlnZXJlbmNlX2dlbSIsImZyZXNoX3JhbmtzIl0sImxpbWIiOjF9LHsiaWQiOiJ2YW1waXJpY19lbWJyYWNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2VxdWVuY2VkX2ludm9jYXRpb24iLCJndWFyZGVkX2Nhc3RpbmciLCJ0aW1lX2Z1c2UiXX0seyJpZCI6InN1bW1vbl9mbGFtZV9zcHJpdGUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJibG9vZF9wcmljZSIsImNvbW1hbmRfZ2VtIl19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjoxOTA1OTAyMDA3LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6InVuc3BlbnRfcmVwbHkifX0:spar --seeds 30 --base-seed 3769437563`</details>
- `class:hivecaller + unique:cinderstep + support:broodclutch + support:loaded_dice`: measured 361.9 damage per second, its parts predict 7.2. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImV4cG9zZV93ZWFrbmVzcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzYWludGVkX2FzaCIsImJyb29kY2x1dGNoIl0sImxpbWIiOjB9LHsiaWQiOiJsb29zZV9tYXJyb3dncnVicyIsInJhcml0eSI6Im1hZ2ljIn0seyJpZCI6ImV4cHVuZ2UiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjJ9LHsiaWQiOiJ0ZW1wZXN0X2dhdGhlcmluZyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJsb2FkZWRfZGljZSJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjk3NjMyNzU5MiwidW5pcXVlcyI6eyJib290cyI6ImNpbmRlcnN0ZXAiLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:firebrand + support:crowd_favor + unique:fleetfeather + primary:web_shot`: measured 40.6 damage per second, its parts predict 1.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJmaXJlYnJhbmQiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJ3ZWJfc2hvdCIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY3Jvd2RfZmF2b3IiXX0seyJpZCI6InNvdWxfdm9sbGV5IiwicmFyaXR5IjoibWFnaWMifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6MTA3MTk3ODY5MywidW5pcXVlcyI6eyJib290cyI6ImZsZWV0ZmVhdGhlciJ9fQ:spar --seeds 30 --base-seed 3769437563`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 8%; classes.chronomancer.attributes ×2.5 closes 1%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `hivecaller`: The numbers an author would reach for barely move this: classes.hivecaller.attributes ×2.5 closes 15%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `necromancer`: The numbers an author would reach for barely move this: skills.poison_nova.baseDamage ×0.4 closes 6%; skills.despair.baseDamage ×1 closes 0%; skills.poison_nova.baseDamage & skills.despair.baseDamage ×0.4 closes 6%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×1 closes 0%; classes.beguiler.attributes ×2.5 closes 18%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_threat `lidless_watcher`: The numbers an author would reach for barely move this: skills.gaze_beam.baseDamage ×2.5 closes 12%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- monster_durability `stygian_doll`: The numbers an author would reach for barely move this: monsters.stygian_doll.base.life ×2.5 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `resounding_echo`: The numbers an author would reach for barely move this: supports.resounding_echo.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `crowd_damage`: The numbers an author would reach for barely move this: affixes.crowd_damage.tiers.*.ranges ×2.5 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- affix `satellite_iron_wake`: The numbers an author would reach for barely move this: affixes.satellite_iron_wake.tiers.*.ranges ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `ravening`: a socketed spender replaces its host's own charge price, so a skill gated on a bank fires without one. Output with the gem, on the matrix's rig: `reckoning@measured_sentence` 357×, `haymaker@measured_hook` 271×, `galvanic_reserve` 181×, `soul_harvest` 111×, `coda@measured_coda` 85×. Should a soft spender lift a hard gate?
- support `slow_brew`: a socketed spender replaces its host's own charge price, so a skill gated on a bank fires without one. Output with the gem, on the matrix's rig: `reckoning@measured_sentence` 378×, `haymaker@measured_hook` 290×, `galvanic_reserve` 189×, `soul_harvest` 121×, `coda@measured_coda` 95×. Should a soft spender lift a hard gate?

## Outliers

401 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×), 68 of them new tonight. Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
| 🆕 | interaction | `class:skald + support:echoing_might + primary:whirl_of_grit + support:volley` | dps_out | 4.8e+13 | 13927.9 | 3.4e+9× | 26.6 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -15.5 | L20 · geared · pressure · kill_rate |
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 15.2 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 14.3 | supports · effective hosts |
| 🆕 | interaction | `class:firebrand + support:echoing_might + support:desperation + support:steady_nerve` | dps_out | 1.1e+8 | 1585.7 | 66298.99× | 13.5 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -12.4 | L10 · geared · pressure · kill_rate |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 12 | supports · effective hosts |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 11.7 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 16 | 0× | -11.4 | L25 · magician · body |
| 🆕 | interaction | `class:pyromancer + support:echoing_might + unique:cindervigil + support:load_bearing_flaw` | dps_out | 5483415.8 | 1583.5 | 3462.82× | 10.9 | L20 main effects |
|  | support | `austerity` | output_multiplier | 0.5 | 1 | 0.48× | -10.6 | supports · effective hosts |
|  | support | `resounding_echo` | output_multiplier | 2.1 | 1 | 2.04× | 10.1 | supports · effective hosts |
|  | support | `crescendo` | output_multiplier | 2.1 | 1 | 2.02× | 10 | supports · effective hosts |
|  | support | `septic_bargain` | output_multiplier | 0.5 | 1 | 0.5× | -10 | supports · effective hosts |
|  | support | `volley` | output_multiplier | 2 | 1 | 1.92× | 9.3 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.4 | 0.02× | -9.2 | L5 · geared · pressure · kill_rate |
|  | affix | `dmg_cold` | dps_out | 132 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `drowned_regalia` | dps_out | 134.4 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `duration` | dps_out | 140.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `es_pct` | dps_out | 139.5 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `evasion_pct` | dps_out | 139.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `hybrid_armor_evasion` | dps_out | 139.6 | 159.7 | 0.06× | -9.1 | L20 · magician · affix output |
|  | affix | `insight_pct` | dps_out | 131.6 | 150.5 | 0.06× | -9.1 | L20 · magician · affix output |

<details><summary>Re-measure any of these</summary>

- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:geared --seeds 10`
- sundering_flight: `npm run sim -- run --refs socketed:ball_lightning:sundering_flight:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:30:geared --seeds 10`
- fire_walker: `npm run sim -- run --refs socketed:phoenix_dive:fire_walker:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:40:geared --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:10:geared --seeds 10`
- scorched_wake: `npm run sim -- run --refs socketed:blinding_ichor:scorched_wake:20 --seeds 10`
- mounting_frenzy: `npm run sim -- run --refs socketed:serpent_ray:mounting_frenzy:20 --seeds 10`
- seatless_usher: `npm run sim -- run --refs threat:starter_magician_l25:seatless_usher:25 --seeds 10`
- austerity: `npm run sim -- run --refs socketed:corpse_explosion:austerity:20 --seeds 10`
- resounding_echo: `npm run sim -- run --refs socketed:aftershock_snare:resounding_echo:20 --seeds 10`
- crescendo: `npm run sim -- run --refs socketed:immolation_blast:crescendo:20 --seeds 10`
- septic_bargain: `npm run sim -- run --refs socketed:pillar_of_flame:septic_bargain:20 --seeds 10`
- volley: `npm run sim -- run --refs socketed:soulflay:volley:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:5:geared --seeds 10`
- dmg_cold: `npm run sim -- run --refs affix:magician:20:helmet:dmg_cold:5352222:spar --seeds 10`
- drowned_regalia: `npm run sim -- run --refs affix:magician:20:helmet:drowned_regalia:10397677:spar --seeds 10`
- duration: `npm run sim -- run --refs affix:magician:20:helmet:duration:5352222:spar --seeds 10`
- es_pct: `npm run sim -- run --refs affix:magician:20:helmet:es_pct:5352222:spar --seeds 10`
- evasion_pct: `npm run sim -- run --refs affix:magician:20:helmet:evasion_pct:5352222:spar --seeds 10`
- hybrid_armor_evasion: `npm run sim -- run --refs affix:magician:20:helmet:hybrid_armor_evasion:5352222:spar --seeds 10`
- insight_pct: `npm run sim -- run --refs affix:magician:20:helmet:insight_pct:5352222:spar --seeds 10`

</details>

## Build search

82,595 candidates tonight (18,515 refused by the real gates), 171,187 over 3 night(s). The archive holds 1400 elite rows; 1357 were re-measured on this commit and 4 no longer pass the gates. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 453 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:chronomancer` `off:crit` `def:life` `gear:rare` `skill:orb_of_storms` | 3131.4 | 112.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJvcmJfb2Zfc3Rvcm1zIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJodW50ZXJzX21vbWVudHVtIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByb3ZvY2F0aW9uIiwic2xvd19tYXRjaCIsImFjY2VsZXJhbmRvIiwiZGVzcGVyYXRpb24iXX0seyJpZCI6ImdsYWNpYWxfcmFtcGFydCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNsb3dfbWF0Y2giXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2NzM4NDg3MTcsInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIifX0 --seeds 8 --base-seed 1233198171`</details> |
| L5 | offense | `class:cryomancer` `off:crit` `def:armor` `gear:rare` `skill:power_surge` | 1773.1 | 63.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoicG93ZXJfc3VyZ2UiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImRvbWluaW9uX3RpdGhlIiwidW5sZWFzaCJdfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJwcm92b2NhdGlvbiIsInRyaWFuZ2xlX3NpZ2lsIiwiYWNjZWxlcmFuZG8iLCJkZXNwZXJhdGlvbiJdfSx7ImlkIjoiZ2xhY2lhbF9yYW1wYXJ0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2xvd19tYXRjaCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0OTQ2NDE5MjksInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJjaGVzdCI6ImFlZ2lzX29mX3RoZV9kcm93bmVkIn19 --seeds 8 --base-seed 2201138979`</details> |
| L5 | clear | `class:flagellant` `off:crit` `def:armor` `gear:rare` `skill:doom_bell` | 6 | 15.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ3aWxkX2FiYW5kb24iLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoidHJhbnNncmVzc2lvbiIsInJhcml0eSI6Im1hZ2ljIn1dLCJvZmYiOiJjcml0IiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo5MzI2MjM3MjF9 --seeds 8 --base-seed 2908874919`</details> |
| L5 | clear | `class:chronomancer` `off:damage` `def:none` `gear:rare` `skill:vampiric_presence` | 5.7 | 15× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsib3Zlcm1hdGNoIiwicmVnaWNpZGUiXX0seyJpZCI6InNoYXR0ZXJjaG9yZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicmVzb3VuZGluZ19lY2hvIiwiY2FzY2FkZSJdLCJsaW1iIjoxfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxNjcwMzU0NjczLCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0 --seeds 8 --base-seed 961924505`</details> |
| L10 | offense | `class:magician` `off:crit` `def:ward` `gear:rare` `skill:vampiric_presence` | 7287.3 | 164.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJsaW5nZXJpbmciLCJ0YXV0X3dpcmUiLCJibG9vZF90b2xsIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInRyaWFuZ2xlX3NpZ2lsIiwiYWNjZWxlcmFuZG8iLCJkZXNwZXJhdGlvbiJdfSx7ImlkIjoidmFtcGlyaWNfZW1icmFjZSIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJjbGFtb3IiLCJjYXN0X29uX2ZsYXdsZXNzIiwibW9ub2xpdGgiXX0seyJpZCI6ImZsYW1lX3dhbGwiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsidHVyYnVsZW5jZSIsImppbnhpbmdfdG91Y2giLCJ3aWxkX2FiYW5kb24iXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3NzgwMDA3MDMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UifX0 --seeds 8 --base-seed 974620381`</details> |
| L10 | offense | `class:magician` `off:crit` `def:ward` `gear:rare` `skill:vampiric_presence` | 6316.5 | 142.9× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJsaW5nZXJpbmciLCJ0YXV0X3dpcmUiLCJyaXRhcmRhbmRvIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImV4cG9zdXJlIiwidHJpYW5nbGVfc2lnaWwiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJnbGFjaWFsX3JhbXBhcnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MzcxNzA4OTQ0LCJ1bmlxdWVzIjp7ImJlbHQiOiJ3aW50ZXJfYWZ0ZXJfeW91In19 --seeds 8 --base-seed 974620381`</details> |
| L10 | clear | `class:skald` `off:damage` `def:ward` `gear:rare` `skill:bone_cage` | 6 | 22.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJib25lX2NhZ2UiLCJyYXJpdHkiOiJyYXJlIn0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl19LHsiaWQiOiJrZWVuaW5nX3NocmllayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNxdWFyZV9zaWdpbCJdfSx7ImlkIjoiZnVyb3IiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwb3RlbmN5Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0ODI3NDM1MjV9 --seeds 8 --base-seed 1514819976`</details> |
| L10 | clear | `class:necromancer` `off:speed` `def:evasion` `gear:rare` `skill:mark` | 6 | 22.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJtYXJrIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsic2hhdHRlcmdsYXNzIiwiZmxvd2JyZWFrZXIiLCJ1cHJvb3RlciJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjQ2MzA2NTE2fQ --seeds 8 --base-seed 445513737`</details> |
| L20 | offense | `class:beguiler` `off:damage` `def:evasion` `gear:rare` `skill:emberbind` | 380366.2 | 5424.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJiZWd1aWxlciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJlbWJlcmJpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJmbGVldGluZ19kZXZvdGlvbiIsInNsb3dfYnJldyIsInBvbHlwaG9ueSIsInRyaWFuZ2xlX3NpZ2lsIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsiYXJjaW5nIiwic2xvd19icmV3Il19LHsiaWQiOiJtYWdtYV93YXJkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZG9taW5pb25fdGl0aGUiLCJyZWdpY2lkZSIsImVtYmFyZ28iLCJyZWNrbGVzc190cmFuc2Z1c2lvbiJdfSx7ImlkIjoiZnJlbnp5IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZWNob2luZ19taWdodCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoyMTA2NzM5ODAwLCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 2086487102`</details> |
| L20 | offense | `class:spellblade` `off:speed` `def:evasion` `gear:rare` `skill:skewer` | 344539.9 | 4913.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzcGVsbGJsYWRlIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InNrZXdlciIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImppbnhpbmdfdG91Y2giLCJmcmFnbWVudGF0aW9uIl0sImxpbWIiOjB9LHsiaWQiOiJwbGFudGVkX2JhbmRlcmlsbGEiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ2b2xsZXkiXSwibGltYiI6MX0seyJpZCI6Im1pc3RyYWxfY2F1c2V3YXkiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzZXJlbmVfcG93ZXIiXX0seyJpZCI6ImJhY2tzdGFiIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY3V0dGhyb2F0IiwiZWNob2luZ19taWdodCIsInNrZXdlcmluZ19ibG93cyIsInJldmVyYmVyYXRpb24iXSwibGltYiI6MH1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxMTc2Nzg0NjU5LCJ1bmlxdWVzIjp7ImhlbG1ldCI6ImNpbmRlcnZpZ2lsIn19 --seeds 8 --base-seed 1393401685`</details> |
| L20 | clear | `class:flagellant` `off:crit` `def:evasion` `gear:rare` `skill:panther_pounce` | 6.5 | 25.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6InBhbnRoZXJfcG91bmNlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic2xvd19tYXRjaCIsIm1ldHJvbm9tZSIsInJhcmVmeSIsImRlZXBfcmVzZXJ2ZXMiXX0seyJpZCI6ImxvbmdfY29sZCIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9LHsiaWQiOiJza2V3ZXIiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJvc3RpbmF0byIsInJldmVyYmVyYXRpb24iXSwibGltYiI6MX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4Nzk4MDM0MjIsInVuaXF1ZXMiOnsiYmVsdCI6InN0YW5kaW5nX3RvYXN0IiwiYm9vdHMiOiJmbGVldGZlYXRoZXIifX0 --seeds 8 --base-seed 2908874919`</details> |
| L20 | clear | `class:brawler` `off:crit` `def:none` `gear:rare` `skill:hell_rift` | 6 | 23.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImhlbGxfcmlmdCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNsYW1vciIsInB1bHNhdGluZ19taXNzaWxlcyJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsicGhhbnRhc21hbF9lY2hvIl19LHsiaWQiOiJzY3l0aGVfYXJjIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjEyMjk2ODkzMzF9 --seeds 8 --base-seed 3399946340`</details> |
| L40 | offense | `class:rogue` `off:damage` `def:evasion` `gear:rare` `skill:orbital_blades` | 906744.3 | 9653.3× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyb2d1ZSIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJvcmJpdGFsX2JsYWRlcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImFkZGxpbmciLCJydXRobGVzcyIsInBpbnBvaW50IiwiZWNob2luZ19taWdodCJdfSx7ImlkIjoib2JsYXRpb25fb2ZfZmxlc2giLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxMTc4NzQ0NTk4fQ --seeds 8 --base-seed 2827409414`</details> |
| L40 | offense | `class:trapper` `off:crit` `def:none` `gear:rare` `skill:mantra_strike` | 573968.4 | 6110.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJ0cmFwcGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6Im1hbnRyYV9zdHJpa2UiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhdF90aGVfYnJpbmsiLCJmcmVlemVfY2hhbmNlIiwiZWNob2luZ19taWdodCIsIm1lYXN1cmVkX2Jsb3dzIl0sImxpbWIiOjF9LHsiaWQiOiJwbGFudGVkX2JhbmRlcmlsbGEiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTQzNzM5MjEyMn0 --seeds 8 --base-seed 2877231946`</details> |
| L40 | clear | `class:guardian` `off:crit` `def:none` `gear:rare` `skill:tendril_lash` | 6 | 22.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJndWFyZGlhbiIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJ0ZW5kcmlsX2xhc2giLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjcmVzY2VuZG8iLCJub19tYW5zX2xhbmQiLCJzaWVnZWJyZWFrZXIiLCJhZnRlcnNob2NrcyJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6InNlcmFwaF9sYW5jZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInRlZW1pbmdfdmVpbiIsInN0b3JlZF92ZXJkaWN0IiwicmVjdXJ2ZSIsInF1aWV0X2hhbmQiXX0seyJpZCI6InNob2NrZnJvbnQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJsaW1iIjowfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTY5MjQzMDkxOCwidW5pcXVlcyI6eyJoZWxtZXQiOiJjaW5kZXJ2aWdpbCJ9fQ --seeds 8 --base-seed 4185076328`</details> |
| L40 | clear | `class:breaker` `off:damage` `def:life` `gear:rare` `skill:magma_ward` | 6 | 22.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJicmVha2VyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6Im1hZ21hX3dhcmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJhZnRlcnNob2NrcyJdfSx7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6OTUxODY3MzQ5LCJ1bmlxdWVzIjp7ImJlbHQiOiJzdG9ybV90aXRoZSJ9fQ --seeds 8 --base-seed 3399946340`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `construct · chaos` 2806 (3.88×), `self · physical` 1716.4 (2.37×), `construct · physical` 1612.2 (2.23×), `self · cold` 1598.1 (2.21×); weakest `detonate · cold` 208.4 (0.29×), `melee · cold` 225.4 (0.31×), `construct · cold` 241.1 (0.33×), `mark · cold` 288 (0.4×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `aura · cold` 7319.8 (4.78×), `aura · chaos` 6403.6 (4.18×), `projectile · chaos` 5147.3 (3.36×), `court · cold` 4959.8 (3.24×); weakest `detonate · lightning` 346.3 (0.23×), `target · fire` 379.7 (0.25×), `aura · fire` 592.9 (0.39×), `court · lightning` 689.4 (0.45×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `aura · physical` 484504.5 (85.56×), `melee · physical` 377356.5 (66.64×), `aura · fire` 52644.1 (9.3×), `construct · physical` 30389.9 (5.37×); weakest `mark · lightning` 987.5 (0.17×), `court · physical` 1248.8 (0.22×), `detonate · lightning` 1372.2 (0.24×), `detonate · fire` 1488.1 (0.26×).

Playstyles at L40, best build found per style against the band's median style (50 styles): strongest `melee · physical` 507614.2 (64.44×), `projectile · physical` 236707.5 (30.05×), `court · fire` 112159.1 (14.24×), `area · physical` 94253.2 (11.97×); weakest `mark · cold` 1536.5 (0.2×), `mark · lightning` 2505.5 (0.32×), `mark · fire` 2527.8 (0.32×), `detonate · cold` 2687.2 (0.34×).

Main effects at L5 over 8462 rows: strongest `skill:grasping_chasm` 10.3×, `skill:poison_nova` 5.17×, `skill:bonespray` 5.14×, `primary:tuning_strike` 5×, `skill:infernal_bombardment` 4.92×; weakest `limb:expose_weakness#0` 0.16×, `skill:glare_ice` 0.19×, `primary:web_shot` 0.19×, `primary:null_verge` 0.21×, `limb:expose_weakness#1` 0.22×.

Main effects at L10 over 12859 rows: strongest `skill:grasping_chasm` 11.93×, `skill:infernal_bombardment` 9.1×, `skill:bonespray` 5.84×, `skill:avalanche` 5.83×, `primary:infernal_bombardment` 5.62×; weakest `primary:shambler_horde` 0.07×, `primary:deathwatch` 0.14×, `limb:expose_weakness#1` 0.14×, `skill:surgewind` 0.15×, `limb:expose_weakness#0` 0.2×.

Main effects at L20 over 15962 rows: strongest `skill:infernal_bombardment` 22.67×, `skill:bonespray` 13.87×, `skill:grasping_chasm` 12.59×, `skill:faultbreak` 12.47×, `skill:serpent_ray` 8.19×; weakest `primary:strangler_seed` 0.21×, `skill:beckon_palewisps` 0.23×, `skill:deathwatch` 0.24×, `limb:buckler_strike#0` 0.26×, `skill:loose_marrowgrubs` 0.28×.

Main effects at L40 over 16788 rows: strongest `primary:infernal_bombardment` 21.82×, `limb:shambler_horde#1` 20.61×, `skill:mirespume` 12.11×, `skill:infernal_bombardment` 7.59×, `skill:ice_shards` 7.57×; weakest `skill:surgewind` 0.18×, `primary:stormbind` 0.19×, `skill:spectral_helix` 0.2×, `primary:glare_ice` 0.21×, `primary:summon_skeleton` 0.22×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (21 tried):

- `class:necromancer + primary:undertow + support:creeping_fumes + support:blood_price`: measured 8.8, its parts predict 1097.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJuZWNyb21hbmNlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ1bmRlcnRvdyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJjcmVlcGluZ19mdW1lcyIsImRvbWluaW9uX3RpdGhlIiwiYmxvb2RfcHJpY2UiXX0seyJpZCI6Im1hd19ibG9vbSIsInJhcml0eSI6InJhcmUifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4MTkxODgzMjR9:spar --seeds 30 --base-seed 3769437563`</details>
- `class:sorcerer + support:sundering_flight + unique:bloodletters_girdle + support:plus_cold`: measured 2.4, its parts predict 552.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJvdmVyY2xvY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJidWx3YXJrX3NoYXJkcyIsImVtYmFyZ28iLCJibG9vZF90b2xsIiwicXVpZXRfaGFuZCJdfSx7ImlkIjoibWFyayIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJkZXNwZXJhdGVfbWVhc3VyZXMiLCJhY2NlbGVyYXRlZCJdfSx7ImlkIjoiaWNlX3NoYXJkcyIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNvbmN1c3NpdmVfYmxvd3MiLCJzdW5kZXJpbmdfZmxpZ2h0IiwicGx1c19jb2xkIiwicG9seXBob255Il19LHsiaWQiOiJob2x5X3JlbGljIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbImNhc3Rfb25faGlnaF9yb2xsIl19XSwib2ZmIjoiY3JpdCIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MjA2NTU1MDAwNywidW5pcXVlcyI6eyJiZWx0IjoiYmxvb2RsZXR0ZXJzX2dpcmRsZSJ9fQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:wallwright + support:spooling + primary:beckon_palewisps + support:patient_fury`: measured 1.2, its parts predict 129.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6ImJlY2tvbl9wYWxld2lzcHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ1bnN0YWJsZV9mbGVzaCIsImJvZHlndWFyZF9kb2N0cmluZSIsIm9yYml0YWxfc3dlZXAiXX0seyJpZCI6ImljZV9zaGFyZHMiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0aG91Z2h0YnVybiIsInBhdGllbnRfZnVyeSIsImVudmVub21lZF90aXBzIiwic3Bvb2xpbmciXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNjI2NDI2NDg3LCJ1bmlxdWVzIjp7InJpbmcxIjoiY29tbW9uX3B1bHNlIn19:spar --seeds 30 --base-seed 3769437563`</details>
- `class:cryomancer + primary:undertow + support:teeming_vein + support:blood_price`: measured 95.5, its parts predict 905.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidW5kZXJ0b3ciLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZldmVyZWRfaGFuZHMiLCJhdXJlYXRlX3dyaXQiXX0seyJpZCI6IndhcnAiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjIsInN1cHBvcnRzIjpbInNwZW50YmFuZSIsImJsb29kX3ByaWNlIl0sImxpbWIiOjB9LHsiaWQiOiJibGl6emFyZF9jb2lsIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ0ZWVtaW5nX3ZlaW4iXX1dLCJvZmYiOiJzcGVlZCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjo0OTYyMDk3NTEsInVuaXF1ZXMiOnsiYm9vdHMiOiJmbGVldGZlYXRoZXIiLCJjaGVzdCI6ImFlZ2lzX29mX3RoZV9kcm93bmVkIn19:spar --seeds 30 --base-seed 3769437563`</details>
- `class:chronomancer + primary:geyser_step + support:scorched_wake + support:deliberate_ruin`: measured 8.9, its parts predict 608.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJnZXlzZXJfc3RlcCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZGVsaWJlcmF0ZV9ydWluIiwiZGVhdGhzX2Rvb3IiXX0seyJpZCI6Imxvb3NlX21hcnJvd2dydWJzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJhY2NlbGVyYXRlZCIsImJvZHlndWFyZF9kb2N0cmluZSJdfSx7ImlkIjoiaW5mZXJubyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsid2Fsa2luZ19tZWRpdGF0aW9uIl19LHsiaWQiOiJpY2Vfc2hhcmRzIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJzY29yY2hlZF93YWtlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJsaWZlIiwiZ2VhciI6InJhcmUiLCJncyI6ODA2MzI1ODM1fQ:spar --seeds 30 --base-seed 3769437563`</details>
- `class:cryomancer + unique:emberbrand + support:fleetfoot + support:fragmentation`: measured 6.9, its parts predict 0.7. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZXhwb3NlX3dlYWtuZXNzIiwicmFyaXR5IjoibWFnaWMiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJhdF90aGVfYnJpbmsiLCJxdWFpbGJhbmUiXSwibGltYiI6MH0seyJpZCI6ImtpbmRsZV93aWNrIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZmxlZXRmb290IiwibGluZ2VyaW5nIiwiZnJhZ21lbnRhdGlvbiJdfSx7ImlkIjoic29sYXJfYnJhbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ3cmFpdGhfcGFzc2FnZSIsImNvbmN1c3NpdmVfYmxvd3MiLCJzZWFyaW5nX2hlYXQiLCJwcmVzc3VyZV9zZWFsIl19LHsiaWQiOiJmbGFzaF9mcmVlemUiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJ0YXV0X3dpcmUiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjIzOTc3NDI2OSwidW5pcXVlcyI6eyJyaW5nMSI6ImVtYmVyYnJhbmQifX0:spar --seeds 30 --base-seed 3769437563`</details>
- `class:matador + primary:frostguard + support:teeming_vein + support:steady_current`: measured 6.9, its parts predict 312.8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJtYXRhZG9yIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImZyb3N0Z3VhcmQiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsid2FyZGluZ19mbGVzaCIsInJlbW5hbnRzIiwiZW1iYXJnbyJdfSx7ImlkIjoic2VycGVudF9yYXkiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzdGVhZHlfY3VycmVudCIsInRlZW1pbmdfdmVpbiIsInNpY2tlbmluZyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjEzMDMzNjQ0OH0:spar --seeds 30 --base-seed 3769437563`</details>
- `class:hivecaller + support:monolith + primary:expose_weakness + support:sainted_ash`: measured 12.1, its parts predict 0.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJoaXZlY2FsbGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImV4cG9zZV93ZWFrbmVzcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzYWludGVkX2FzaCJdLCJsaW1iIjowfSx7ImlkIjoibG9vc2VfbWFycm93Z3J1YnMiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInRpdGFuaWMiXX0seyJpZCI6ImV4cHVuZ2UiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJ0aGVfYW1hbGdhbSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJtb25vbGl0aCJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5NzYzMjc1OTIsInVuaXF1ZXMiOnsiYmVsdCI6InBhbGVfYmFyZ2FpbiIsInJpbmcxIjoiY29tbW9uX3B1bHNlIn19:spar --seeds 30 --base-seed 3769437563`</details>

## Tuning reads

Standing tables to tune from. Advisory.

**What +10 of each attribute is worth**, median across the roster at L20 geared (share of output on the sparring lane, share of time survived on the survival clock):

| attribute | output | time survived | classes where it did nothing |
|---|---:|---:|---:|
| strength | +4% | +2% | 0 of 39 |
| finesse | +3% | 0% | 1 of 39 |
| intelligence | +2% | 0% | 0 of 39 |
| wisdom | +1% | 0% | 0 of 39 |
| prowess | 0% | 0% | 2 of 39 |
| fortitude | 0% | +5% | 0 of 39 |
| dexterity | 0% | 0% | 0 of 39 |
| charisma | 0% | +2% | 0 of 39 |
| willpower | 0% | +2% | 0 of 39 |
| vitality | 0% | +10% | 0 of 39 |

**Support power**, median output change across the hosts each gem works on. Strongest: `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%, `elemental_conduction` +87%. Weakest: `austerity` -51%, `septic_bargain` -49%, `pyre_legion` -36%, `rattling_salvo` -35%, `spirit_totem` -28%, `wraith_passage` -25%, `nova_release` -20%, `sweeping_blow` -20%.

15 of these gems read off their own rig, because they need something a plain rig does not do: in the middle of a crowd (`alternating_strikes`, `unstable_flight`, `wild_abandon`, `tethered_orbit`, `gyre`, `vortex`, `sidewinder`, `trueflight`, `crosswind`); with a guard raised (`guarded_casting`); with a charge a second fed into its bank (`embargo`, `ravening`); against a plain dummy instead of a resistant one (`refraction`, `flameforged`, `rarefy`).

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 1.95× on magician, `apply_poison` 1.75× on warrior, `apply_bleed` 1.62× on magician, `apply_bleed` 1.61× on warrior, `hadal_cold` 1.5× on magician, `hadal_cold` 1.44× on warrior, `creeper_barrow` 1.27× on warrior, `satellite_rime_wake` 1.22× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `thorns` 1.54× on warrior, `life_on_evade` 1.53× on magician. Moved nothing on these rigs: 3 families.

**What buffs, hexes, heals and wards add** (196 skills whose own numbers are not damage, at L20, against the same hero without them). Most output beside a plain strike: `infernal_bombardment` 14.1×, `summon_plaguefather` 6.4×, `summon_fire_golem` 4.83×, `summon_flame_sprite` 4.77×, `flame_totem` 4.77×, `shambler_horde` 4.25×, `bind_familiar` 4.22×, `summon_wraith` 3.65×. Most time survived on the clock: `vampiric_presence` 11.85×, `repulsor_beacon` 11.85×, `shambler_horde` 11.85×, `call_the_rift` 10.98×, `summon_wraith` 9.04×, `summon_blade_wraith` 8.37×, `reaper_swarm` 8×, `infernal_bombardment` 6.63×. 35 moved neither at any band: their value lies outside these rigs, or they do nothing.

**Standing config numbers that move the headline rigs** (elasticity: % change in the metric per % change in the number). `hero_mana_per_level` → mana_floor_pct 0.21, `DEFENSE_CFG.weight.refRadius` → dps_out 0.13, `DEFENSE_CFG.armor.k` → dps_out 0.05, `DEFENSE_CFG.poise.drainRatio` → dps_out 0.05, `DEFENSE_CFG.weight.refRadius` → mana_floor_pct 0.05, `DEFENSE_CFG.weight.perPoise` → mana_floor_pct 0.02. 59 numbers moved nothing here.

**Provisional bands against the roster.** 20 of 96 band and tier rows have most of the roster outside the band. The measured spread is evidence for your sign-off, and no band changes on its own.

| metric | lane | tier | band | roster outside | measured p10 | median | p90 |
|---|---|---|---|---:|---:|---:|---:|
| player_deaths | parity | starter | L40 | 38 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L30 | 37 of 39 | 0.2 | 1 | 1 |
| player_deaths | parity | starter | L20 | 36 of 39 | 0.2 | 1 | 1 |
| ttk_wave_mean | parity | starter | L40 | 12 of 13 | 15.2 | 22 | 35.9 |
| player_deaths | parity | starter | L10 | 32 of 39 | 0 | 0.6 | 1 |
| ttk_wave_mean | parity | starter | L10 | 16 of 21 | 12.1 | 19.3 | 40.3 |
| ttk_wave_mean | parity | starter | L20 | 11 of 15 | 10.7 | 17.7 | 35.2 |
| ttk_wave_mean | parity | kitted | L10 | 27 of 37 | 9.4 | 24.6 | 47.3 |
| ttk_wave_mean | parity | kitted | L5 | 23 of 32 | 10.4 | 24.9 | 40.7 |
| player_deaths | parity | starter | L5 | 28 of 39 | 0 | 0.2 | 1 |
| ttk_wave_mean | parity | kitted | L40 | 27 of 38 | 6.4 | 22.4 | 45.6 |
| ttk_wave_mean | parity | kitted | L20 | 26 of 38 | 8.1 | 25.5 | 48.5 |

## The instrument

Class expression at the top band: 38 read on the dummy, 1 need the sparring partner, 0 read only in the pack lanes, 0 mute.
Bestiary: 13095 rows measured, 100 bodies not fielded (passive or immortal fixtures). 207 bodies never swung at a hero standing idle within reach, so their threat reads as unmeasured: 104 have no skills, 23 carry kits with no damage, 15 are rooted, 7 lie in ambush, 25 only fight once fought, and 33 have a damage kit and legs and did not swing in a duel either (`amalgam_gravewarden`, `canopic_jackal`, `caravan_master`, `charnel_ghoul`, `cloud_grazer`, `crimp_captain`, `crimson_bat`, `crusade_standard_bearer`, `formic_forager`, `formic_tender`, `gnoll_matron`, `gourdling`, `grave_shambler`, `grind_bannerman`, `hellhound`, `hollow_butler`, `kettle_minnow`, `ledger_arbiter`, `magpie_snatch`, `moon_howler`, `oblivion_knight`, `river_otter`, `sand_scorpion`, `shard_gardener`, `snuffwick`, `star_grazer`, `stygian_doll`, `the_magpie_king`, `warband_chieftain`, `white_hart`, `wickling`, `winter_herald`, `wool_aphid`).
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 14 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,534 eligible pairs probed (100%), deep lane on 26573 pairs. Verdicts: effective 78569, blind 30595, inert 14518, negligible 2420, cost_only 1428.
Against the committed ledger (8481 rows): 12904 not on file, 1990 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.1 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.5 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.3 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 4.6 |
| matchups | 27 | 27 | 0 | 0 | 0 | 13,734 | 5.7 |
| bestiary | 20 | 20 | 0 | 0 | 0 | 26,190 | 4.7 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.1 |
| affixes | 5 | 5 | 0 | 0 | 0 | 3,472 | 1.1 |
| assists | 4 | 4 | 0 | 0 | 0 | 4,752 | 2 |
| socket_play | 1 | 1 | 0 | 0 | 0 | 900 | 0.1 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.4 |
| matrix | 220 | 220 | 0 | 0 | 0 | 235,838 | 51.1 |
| matrix_deep | 97 | 97 | 0 | 0 | 0 | 120,973 | 28.7 |
| search | 40 | 40 | 0 | 0 | 0 | 173,638 | 30.9 |
| archive_confirm | 37 | 37 | 0 | 0 | 0 | 21,712 | 5.3 |
| proposals | 48 | 48 | 0 | 0 | 0 | 10,900 | 2.2 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
