# Balance farm, night of 2026-10-31

Commit [011baabbea](https://github.com/arianna-arpg/arpg-game-world/commit/011baabbea18dc12cdb4c319e8d11fd0d58dfaab), profile `full`. 657,315 episodes, 144.9 core-hours, 294 minutes end to end. [Run](https://github.com/arianna-arpg/arpg-game-world/actions/runs/41229483437).

## 🔴 Regressions

**4 new way(s) a legal game state crashes or freezes the engine.** Details under Engine defects.

## Engine defects

These are bugs in the game reachable in play, not balance findings. Each stays listed until it stops happening, and only a new one turns the night red.

**The engine stopped returning.** A real client would freeze here. The farm restarted past each one, so only that episode was lost:

- 🆕 `EpisodeStalled: hung in forEachAlong < liteProjectileSweep < updateProjectiles`: 14 episodes, no tick came back for 60s. First seen in `threat_starter_magician_l12_vs_farshore_warden_l12`, seed 3257507324. <details><summary>stack and repro</summary>`forEachAlong < liteProjectileSweep < updateProjectiles < update < runEpisode < runScenario < runDefs < sweepBestiary < cmdSweep < main < (anonymous) < run`<br>`npm run sim -- sweep bestiary --levels 5,12,25 --seeds 2 --shard 16/20 --stream --no-episodes --stall-sec 60`</details>
- 🆕 `EpisodeStalled: an episode ran past its time cap`: 1 episode, ran past its time cap (240s). First seen in `search_spar_g_1f4tf5kukk1bs`, seed 124919584. <details><summary>stack and repro</summary>`runEpisode < (anonymous) < evaluateGenome < runSearch < searchRun < cmdSearch < main < (anonymous) < run`<br>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjQwLCJza2lsbHMiOlt7ImlkIjoiaWN5X2NvbWV0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsibG9hZGVkX2RpY2UiLCJzdW1tb25fcGhhbnRhc20iLCJtZXRyb25vbWUiLCJzcGlyaXRfdG90ZW0iXX0seyJpZCI6ImJlcnNlcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3MTE2NzUyNzAsInVuaXF1ZXMiOnsiY2hlc3QiOiJkdWVsaXN0c19sZWRnZXIifX0 --seeds 3 --base-seed 288034805 --stall-sec 60`</details>

**Legal builds crashed the engine.** Each is one command to reproduce:

- 🆕 `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.kill` (4 pairs): `npm run sim -- matrix explain essence_drain@borrowed_time withering_agony`
- 🆕 `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.kill` (159 candidates). <details><summary>repro</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJkb29tYnJhbmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbIm1vbm9saXRoIiwic21vdGhlcmluZ19zcG9yZXMiXX0seyJpZCI6ImZ1cm9yIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyYXZlbmluZyIsImZyYWdtZW50YXRpb24iXX0seyJpZCI6ImJhbGxfbGlnaHRuaW5nIiwicmFyaXR5IjoibWFnaWMifSx7ImlkIjoic2FuZ3VpbmVfbGVlY2giLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImJvbmRicmVha2VyIiwic2xvd19tYXRjaCJdfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTY3MDM1NDY3MywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwifX0 --seeds 3`</details>
- 🆕 `TypeError: Cannot read properties of undefined (reading 'rupture') @ World.assaultDoomCull` (5 candidates). <details><summary>repro</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJhc2NldGljIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImdhdGhlcl9jaW5kZXJraW4iLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsic3BlbnRiYW5lIiwid2FyZGluZ19mbGVzaCIsIm1lYXN1cmVkX2Jsb3dzIl19LHsiaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiY2FzdF9vbl9vdmVyY2hhcmdlIiwicmVnaWNpZGUiXX0seyJpZCI6IndvcmRfb2ZfZG9vbSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiYmxlZWRfY2hhbmNlIl19LHsiaWQiOiJpZ25pdGUiLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsImxpbWIiOjF9XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjU3NjA3MDQ3NiwidW5pcXVlcyI6eyJyaW5nMSI6Im1pc2Vyc19sb29wIn19 --seeds 3`</details>

## What moved since last night

First recorded night: nothing to compare with yet.

## Top proposed numbers

Advisory. Nothing here has been applied, and each needs your sign-off. Each row re-measured the subject on dice the night had not seen, solved for a number through the real game, and verified it at common seeds. 24 outlier(s) did not confirm on fresh dice and were dropped.

| # | subject | change | metric: before → after | cohort target | verdict | guards |
|---:|---|---|---|---:|---|---|
| 1 | skill `arclight_rain` | `skills.arclight_rain.baseDamage.physical.0`: 5 → 2 (+3 lines, ×0.4) | dps_dummy: 347.6 → 139 | 93.2 | moved | none moved |
| 2 | skill `starcall` | `skills.starcall.baseDamage.fire.0`: 9 → 3.6 (+3 lines, ×0.4) | dps_dummy: 201.1 → 80.4 | 68.2 | moved | none moved |
| 3 | skill `marshlight` | `skills.marshlight.baseDamage.chaos.0`: 9 → 3.6 (+1 lines, ×0.4) | dps_dummy: 265.8 → 106.3 | 98.9 | moved | none moved |
| 4 | skill `mirespume` | `skills.mirespume.baseDamage.chaos.0`: 11 → 4.5 (+1 lines, ×0.41) | dps_dummy: 245.8 → 100.8 | 98.9 | moved | none moved |
| 5 | support `fire_walker` | `supports.fire_walker.mods.0.value`: 0.5 → 0.2 (+1 lines, ×0.4) | dps_dummy: 60.1 → 30.7 | 20.5 | moved | none moved |
| 6 | skill `scattergun` | `skills.scattergun.baseDamage.physical.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 7.5 → 18.6 | 23.6 | moved | none moved |
| 7 | skill `glare_ice` | `skills.glare_ice.baseDamage.cold.0`: 4 → 10 (+1 lines, ×2.5) | dps_dummy: 1.3 → 3.2 | 4 | moved | none moved |
| 8 | skill `trailblaze` | `skills.trailblaze.baseDamage.fire.0`: 6 → 2.8 (+1 lines, ×0.47) | dps_dummy: 65.6 → 31.9 | 31.1 | moved | none moved |
| 9 | skill `earthrender` | `skills.earthrender.baseDamage.physical.0`: 12 → 6 (+1 lines, ×0.5) | dps_dummy: 187.3 → 93.6 | 93.2 | moved | none moved |
| 10 | skill `gale_lash` | `skills.gale_lash.baseDamage.physical.0`: 9 → 17 (+1 lines, ×1.9) | dps_dummy: 16.5 → 31.3 | 32.7 | moved | none moved |
| 11 | skill `keening_shriek` | `skills.keening_shriek.baseDamage.physical.0`: 4 → 7.2 (+1 lines, ×1.8) | dps_dummy: 1.9 → 3.5 | 3.6 | moved | none moved |
| 12 | support `sundering_flight` | `supports.sundering_flight.fissureTrail.damageScale`: 0.4 → 0.16 | dps_dummy: 49.6 → 30.3 | 24.6 | moved | none moved |
| 13 | monster_threat `seatless_usher` | `skills.ushers_lull.baseDamage.chaos.0`: 4 → 8.8 (+1 lines, ×2.2) | dps_in: 0 → 5.9 | 6.1 | moved | none moved |
| 14 | skill `transfusion` | `skills.transfusion.baseDamage.chaos.0`: 6 → 10 (+1 lines, ×1.7) | dps_dummy: 5.6 → 9.6 | 9.3 | moved | none moved |
| 15 | monster_threat `discord_siren` | `skills.discord_wail.baseDamage.chaos.0`: 7 → 13 (+1 lines, ×1.9) | dps_in: 0.8 → 5.7 | 6.1 | moved | none moved |

<details><summary>Repro commands</summary>

1. `npm run sim -- whatif --knob 'skills.arclight_rain.baseDamage*0.4' --scenarios skill:arclight_rain:40 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.2, useTime 0.16. Same change at other bands: `skill:arclight_rain:5` 152.3→60.9, `skill:arclight_rain:10` 184.7→73.9, `skill:arclight_rain:20` 233.3→93.3
2. `npm run sim -- whatif --knob 'skills.starcall.baseDamage*0.4' --scenarios skill:starcall:20 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.79, useTime -0.11. Same change at other bands: `skill:starcall:5` 140.7→56.3, `skill:starcall:10` 165.3→66.1, `skill:starcall:40` 287.8→115.1
3. `npm run sim -- whatif --knob 'skills.marshlight.baseDamage*0.4' --scenarios skill:marshlight:10 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.61, manaCost -0.04. Same change at other bands: `skill:marshlight:5` 225.2→90.2, `skill:marshlight:20` 314.5→125.8, `skill:marshlight:40` 447.1→178.8
4. `npm run sim -- whatif --knob 'skills.mirespume.baseDamage*0.41' --scenarios skill:mirespume:10 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.59. Same change at other bands: `skill:mirespume:5` 215.4→87.9, `skill:mirespume:20` 294.7→120.8, `skill:mirespume:40` 405.7→166.3
5. `npm run sim -- whatif --knob 'supports.fire_walker.mods*0.4' --scenarios socketed:phoenix_dive:fire_walker:20 --seeds 30 --base-seed 4017360034`
6. `npm run sim -- whatif --knob 'skills.scattergun.baseDamage*2.5' --scenarios skill:scattergun:10 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1. Same change at other bands: `skill:scattergun:5` 6.6→16.5, `skill:scattergun:20` 8.7→21.8, `skill:scattergun:40` 11.7→29.2
7. `npm run sim -- whatif --knob 'skills.glare_ice.baseDamage*2.5' --scenarios skill:glare_ice:40 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): cooldown -1.14, baseDamage 1. Same change at other bands: `skill:glare_ice:5` 0.8→2, `skill:glare_ice:10` 0.9→2.2, `skill:glare_ice:20` 1→2.5
8. `npm run sim -- whatif --knob 'skills.trailblaze.baseDamage*0.47' --scenarios skill:trailblaze:20 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 0.99, cooldown -0.78. Same change at other bands: `skill:trailblaze:5` 51→25.3, `skill:trailblaze:10` 56.9→28, `skill:trailblaze:40` 87→41.5
9. `npm run sim -- whatif --knob 'skills.earthrender.baseDamage*0.5' --scenarios skill:earthrender:40 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.76, useTime -0.28. Same change at other bands: `skill:earthrender:5` 108.8→54.4, `skill:earthrender:10` 121.8→60.9, `skill:earthrender:20` 141.4→70.7
10. `npm run sim -- whatif --knob 'skills.gale_lash.baseDamage*1.9' --scenarios skill:gale_lash:1 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1, useTime -0.93. Same change at other bands: `skill:gale_lash:5` 18.6→35.3, `skill:gale_lash:10` 22.2→42.3, `skill:gale_lash:20` 27.8→52.7, `skill:gale_lash:40` 40.3→76.6
11. `npm run sim -- whatif --knob 'skills.keening_shriek.baseDamage*1.8' --scenarios skill:keening_shriek:40 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): baseDamage 1, cooldown -0.77. Same change at other bands: `skill:keening_shriek:5` 1.2→2.1, `skill:keening_shriek:10` 1.3→2.4, `skill:keening_shriek:20` 1.5→2.7
12. `npm run sim -- whatif --knob 'supports.sundering_flight.fissureTrail.damageScale*0.4' --scenarios socketed:ball_lightning:sundering_flight:20 --seeds 30 --base-seed 4017360034`
13. `npm run sim -- whatif --knob 'skills.ushers_lull.baseDamage*2.2' --scenarios threat:starter_magician_l25:seatless_usher:25 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): kit.ushers_lull 150.45. Same change at other bands: `threat:starter_magician_l5:seatless_usher:5` 2.1→4.5, `threat:starter_magician_l10:seatless_usher:10` 0.8→4.3, `threat:starter_magician_l20:seatless_usher:20` 0.8→6.3, `threat:starter_magician_l40:seatless_usher:40` 0.2→9.6
14. `npm run sim -- whatif --knob 'skills.transfusion.baseDamage*1.7' --scenarios skill:transfusion:40 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): cooldown -1.28, baseDamage 1. Same change at other bands: `skill:transfusion:5` 3.3→5.6, `skill:transfusion:10` 3.7→6.3, `skill:transfusion:20` 4.3→7.3
15. `npm run sim -- whatif --knob 'skills.discord_wail.baseDamage*1.9' --scenarios threat:starter_magician_l25:discord_siren:25 --seeds 30 --base-seed 4017360034`. Other dials on this metric (elasticity): kit.discord_wail 4.22. Same change at other bands: `threat:starter_magician_l5:discord_siren:5` 2.1→4, `threat:starter_magician_l10:discord_siren:10` 1.3→3.9, `threat:starter_magician_l20:discord_siren:20` 1.6→5.7, `threat:starter_magician_l40:discord_siren:40` 1.7→8.8

Run from commit `011baabbea18dc12cdb4c319e8d11fd0d58dfaab`.
</details>

Too noisy to call: class `firebrand`, monster_durability `amalgam_bonelord`. The solved number moved each by less than its own seed-to-seed spread, so these need a calmer rig or more seeds before they mean anything.

### Combinations that run away

Confirmed on fresh dice at 20 times or more what their parts predict. A number this far out usually means damage feeding itself, so no single number fixes it: each needs a call on whether the feedback should be bounded.

- `class:rogue + primary:feather_volley + support:azure_harvest + support:echoing_might`: measured 3.5e+33 damage per second, its parts predict 1102946. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyb2d1ZSIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJmZWF0aGVyX3ZvbGxleSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImF6dXJlX2hhcnZlc3QiLCJlY2hvaW5nX21pZ2h0Iiwib3Bwb3J0dW5pc3QiLCJza2V3ZXJpbmdfYmxvd3MiXX0seyJpZCI6Im1hcmNoaW5nX2J1bHdhcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTYyNzg1MzE0fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:wallwright + primary:whirlwind + support:echoing_might + support:untouched_might`: measured 1.5e+30 damage per second, its parts predict 21790.9. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndoaXJsd2luZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImVjaG9pbmdfbWlnaHQiLCJ1bnRvdWNoZWRfbWlnaHQiLCJmbGVldGZvb3QiLCJ3aWRlbmluZyJdLCJsaW1iIjowfSx7ImlkIjoicHVyaXR5X29mX2xpZ2h0bmluZyIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MjY5OTI3MjcxLCJ1bmlxdWVzIjp7ImJlbHQiOiJ3aW50ZXJfYWZ0ZXJfeW91In19:spar --seeds 30 --base-seed 4017360034`</details>
- `class:brawler + primary:venom_ammunition + support:steady_nerve + support:at_the_brink`: measured 2.8e+27 damage per second, its parts predict 4.2e+8. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InZlbm9tX2FtbXVuaXRpb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJhdF90aGVfYnJpbmsiLCJjYXN0X29uX2tpbGwiXX0seyJpZCI6InJpZnRzdGVwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWFkZGVyaW5nIl19LHsiaWQiOiJ3aGlybHdpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJlY2hvaW5nX21pZ2h0Iiwic2hhdHRlcmdsYXNzIiwiYXp1cmVfaGFydmVzdCIsInNlcnJhdGVkX2VkZ2UiXSwibGltYiI6MX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTA3NTQ0MjU3OH0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:skald + primary:feather_volley + support:regicide + support:taut_wire`: measured 1.9e+26 damage per second, its parts predict 284004.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJmZWF0aGVyX3ZvbGxleSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIiwidGF1dF93aXJlIiwiZWNob2luZ19taWdodCIsIm1ldHJvbm9tZSJdfSx7ImlkIjoicmlmdHN0b3JtIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjIwNDM0NzM3NjJ9:spar --seeds 30 --base-seed 4017360034`</details>
- `class:sentinel + primary:fan_of_blades + support:flameforged + support:echoing_might`: measured 5.4e+25 damage per second, its parts predict 9.9e+10. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJmYW5fb2ZfYmxhZGVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxhbWVmb3JnZWQiLCJlY2hvaW5nX21pZ2h0IiwicnV0aGxlc3MiXSwibGltYiI6MX0seyJpZCI6InRveGljX2Nsb3VkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZnJlZXplX2NoYW5jZSIsIm1ldHJvbm9tZSIsInNlaXNtaWNfbWFyY2giLCJvcHBvcnR1bmlzdHNfYmxhZGUiXX0seyJpZCI6Im9ibGF0aW9uX29mX21hbmEiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2ZsYXdsZXNzIiwiY2FzdF9vbl9ibG9jayIsInNwZW50YmFuZSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxOTQxODQ0Mjc4LCJ1bmlxdWVzIjp7ImJlbHQiOiJzdG9ybV90aXRoZSJ9fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:beguiler + primary:mantra_strike + support:ostinato + support:echoing_might`: measured 5.9e+20 damage per second, its parts predict 8796092.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZWd1aWxlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYW50cmFfc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsib3N0aW5hdG8iLCJlY2hvaW5nX21pZ2h0Iiwic3RlYWR5X25lcnZlIiwiZGVzcGVyYXRpb24iXSwibGltYiI6MX0seyJpZCI6InBvd2VyX3N1cmdlIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ0aW1lX2Z1c2UiLCJtb25vbGl0aCJdfSx7ImlkIjoic3F1YWxsX3J1bmUiLCJyYXJpdHkiOiJtYWdpYyJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo1NzEzOTYyODJ9:spar --seeds 30 --base-seed 4017360034`</details>
- `class:berserker + primary:magma_ward + support:dominion_tithe + support:regicide`: measured 1.3e+17 damage per second, its parts predict 14044.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoibWFnbWFfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRvbWluaW9uX3RpdGhlIiwicmVnaWNpZGUiLCJlbWJhcmdvIl19LHsiaWQiOiJmcmVuenkiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJlY2hvaW5nX21pZ2h0Iiwic3RlYWR5X25lcnZlIiwicmluZ2luZ19yZXBvcnQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MzM4NjE2NTUsInVuaXF1ZXMiOnsiYW11bGV0IjoiYm9ycm93ZWRfYnJlYXRoIiwibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:rogue + primary:scattergun + support:swift_hands + support:echoing_might`: measured 7.9e+10 damage per second, its parts predict 563521.1. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyb2d1ZSIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJzY2F0dGVyZ3VuIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3dpZnRfaGFuZHMiLCJlY2hvaW5nX21pZ2h0Iiwic2xvd19icmV3IiwiYnJ1dGFsaXR5Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo3MDg0MjE4MjksInVuaXF1ZXMiOnsibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 30 --base-seed 4017360034`</details>

### Flagged for your decision

The numbers an author would reach for did not move these enough. They are not proposals: each needs a call on whether the mechanic is right, and none has been touched.

- class `falconer`: The numbers an author would reach for barely move this: skills.expose_weakness.baseDamage ×2.5 closes 18%; skills.cloudstep.baseDamage ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `embargo`: The numbers an author would reach for barely move this: supports.embargo.chargeCost.damagePerCharge ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `chronomancer`: The numbers an author would reach for barely move this: skills.stasis_lock.baseDamage ×2.5 closes 10%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- support `guarded_casting`: The numbers an author would reach for barely move this: supports.guarded_casting.mods[stat=damage].value ×1 closes 0%; supports.guarded_casting.mods ×1 closes 0%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `hurricane`: The numbers an author would reach for barely move this: skills.hurricane.baseDamage ×2.5 closes 14%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `assassin`: The numbers an author would reach for barely move this: skills.rend.baseDamage ×0.4 closes 22%; skills.eviscerate.baseDamage ×0.4 closes 3%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `epidemic`: The numbers an author would reach for barely move this: skills.epidemic.baseDamage ×2.5 closes 25%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `grasping_chasm`: The numbers an author would reach for barely move this: skills.grasping_chasm.baseDamage ×0.4 closes 27%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- class `beguiler`: The numbers an author would reach for barely move this: skills.beguile.baseDamage ×2.5 closes 6%. The cause may not be numeric, so this needs your decision rather than a tuning pass.
- skill `zealots_cadence`: The numbers an author would reach for barely move this: skills.zealots_cadence.baseDamage ×2.5 closes 41%. The cause may not be numeric, so this needs your decision rather than a tuning pass.

## Outliers

402 rows sit far from their cohort (log-scale median and MAD, z ≥ 3 and a ratio past 1.8× or 0.55×). Warned rows and zero rows never enter a cohort.

| | kind | subject | metric | value | cohort median | ratio | z | cohort |
|---|---|---|---|---:|---:|---:|---:|---|
|  | support | `guarded_casting` | output_multiplier | 0 | 1 | 0.01× | -62.8 | supports · effective hosts |
|  | support | `gathered_casting` | output_multiplier | 0 | 1 | 0.01× | -62.8 | supports · effective hosts |
|  | support | `embargo` | output_multiplier | 0 | 1 | 0.01× | -62.8 | supports · effective hosts |
|  | support | `vortex` | output_multiplier | 0 | 1 | 0.01× | -62.8 | supports · effective hosts |
|  | support | `ravening` | output_multiplier | 64.1 | 1 | 62.25× | 56 | supports · effective hosts |
|  | interaction | `class:rogue + primary:feather_volley + support:azure_harvest + support:echoing_might` | dps_out | 3.9e+18 | 1102946 | 3.5e+12× | 36.8 | L40 main effects |
|  | interaction | `class:wallwright + primary:whirlwind + support:echoing_might + support:untouched_might` | dps_out | 3.3e+14 | 21790.9 | 1.5e+10× | 33.8 | L20 main effects |
|  | support | `tethered_orbit` | output_multiplier | 0.1 | 1 | 0.1× | -31.6 | supports · effective hosts |
|  | interaction | `class:skald + primary:feather_volley + support:regicide + support:taut_wire` | dps_out | 1.4e+11 | 284004.1 | 504594.14× | 16.7 | L40 main effects |
|  | interaction | `class:rogue + primary:scattergun + support:swift_hands + support:echoing_might` | dps_out | 2.4e+11 | 563521.1 | 422167.56× | 16.5 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.07× | -15.5 | L20 · geared · pressure · kill_rate |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -15.1 | L30 · geared · pressure · kill_rate |
|  | interaction | `class:berserker + primary:magma_ward + support:dominion_tithe + support:regicide` | dps_out | 4.3e+8 | 14044.5 | 30708.16× | 14.9 | L20 main effects |
|  | interaction | `class:brawler + primary:venom_ammunition + support:steady_nerve + support:at_the_brink` | dps_out | 3.9e+13 | 4.2e+8 | 91865.12× | 14.6 | L40 main effects |
|  | support | `sundering_flight` | output_multiplier | 3 | 1 | 2.9× | 14.5 | supports · effective hosts |
|  | support | `fire_walker` | output_multiplier | 2.8 | 1 | 2.74× | 13.7 | supports · effective hosts |
|  | class | `chronomancer` | kill_rate | 0 | 0.6 | 0.05× | -12.9 | L40 · geared · pressure · kill_rate |
|  | interaction | `class:ascetic + primary:reap + support:reapers_encore + support:echoing_might` | dps_out | 53.3 | 1113173.5 | 0× | -12.7 | L40 main effects |
|  | class | `chronomancer` | kill_rate | 0 | 0.5 | 0.04× | -12.4 | L10 · geared · pressure · kill_rate |
|  | interaction | `class:beguiler + primary:mantra_strike + support:ostinato + support:echoing_might` | dps_out | 1.1e+11 | 8796092.1 | 11976.36× | 12 | L40 main effects |
|  | support | `scorched_wake` | output_multiplier | 2.4 | 1 | 2.33× | 11.5 | supports · effective hosts |
|  | monster_threat | `seatless_usher` | dps_in | 0 | 16 | 0× | -11.4 | L25 · magician · body |
|  | interaction | `class:sentinel + primary:fan_of_blades + support:flameforged + support:echoing_might` | dps_out | 6.4e+14 | 9.9e+10 | 6510.46× | 11.2 | L40 main effects |
|  | support | `mounting_frenzy` | output_multiplier | 2.3 | 1 | 2.27× | 11.1 | supports · effective hosts |
|  | interaction | `class:wallwright + primary:scattergun + support:swift_hands + support:echoing_might` | dps_out | 55.3 | 312489 | 0× | -11 | L40 main effects |

<details><summary>Re-measure any of these</summary>

- guarded_casting: `npm run sim -- run --refs socketed:fan_of_blades:guarded_casting:20 --seeds 10`
- gathered_casting: `npm run sim -- run --refs socketed:fan_of_blades:gathered_casting:20 --seeds 10`
- embargo: `npm run sim -- run --refs socketed:fan_of_blades:embargo:20 --seeds 10`
- vortex: `npm run sim -- run --refs socketed:fan_of_blades:vortex:20 --seeds 10`
- ravening: `npm run sim -- run --refs socketed:requiem:ravening:20 --seeds 10`
- class:rogue + primary:feather_volley + support:azure_harvest + support:echoing_might: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyb2d1ZSIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJmZWF0aGVyX3ZvbGxleSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImF6dXJlX2hhcnZlc3QiLCJlY2hvaW5nX21pZ2h0Iiwib3Bwb3J0dW5pc3QiLCJza2V3ZXJpbmdfYmxvd3MiXX0seyJpZCI6Im1hcmNoaW5nX2J1bHdhcmsiLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImFybW9yIiwiZ2VhciI6InJhcmUiLCJncyI6MTYyNzg1MzE0fQ:spar --seeds 10`
- class:wallwright + primary:whirlwind + support:echoing_might + support:untouched_might: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjoyMCwic2tpbGxzIjpbeyJpZCI6IndoaXJsd2luZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImVjaG9pbmdfbWlnaHQiLCJ1bnRvdWNoZWRfbWlnaHQiLCJmbGVldGZvb3QiLCJ3aWRlbmluZyJdLCJsaW1iIjowfSx7ImlkIjoicHVyaXR5X29mX2xpZ2h0bmluZyIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MjY5OTI3MjcxLCJ1bmlxdWVzIjp7ImJlbHQiOiJ3aW50ZXJfYWZ0ZXJfeW91In19:spar --seeds 10`
- tethered_orbit: `npm run sim -- run --refs socketed:splinter_volley:tethered_orbit:20 --seeds 10`
- class:skald + primary:feather_volley + support:regicide + support:taut_wire: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJmZWF0aGVyX3ZvbGxleSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInJlZ2ljaWRlIiwidGF1dF93aXJlIiwiZWNob2luZ19taWdodCIsIm1ldHJvbm9tZSJdfSx7ImlkIjoicmlmdHN0b3JtIiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjIwNDM0NzM3NjJ9:spar --seeds 10`
- class:rogue + primary:scattergun + support:swift_hands + support:echoing_might: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJyb2d1ZSIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJzY2F0dGVyZ3VuIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsic3dpZnRfaGFuZHMiLCJlY2hvaW5nX21pZ2h0Iiwic2xvd19icmV3IiwiYnJ1dGFsaXR5Il19XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo3MDg0MjE4MjksInVuaXF1ZXMiOnsibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:20:geared --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:30:geared --seeds 10`
- class:berserker + primary:magma_ward + support:dominion_tithe + support:regicide: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZXJzZXJrZXIiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoibWFnbWFfd2FyZCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImRvbWluaW9uX3RpdGhlIiwicmVnaWNpZGUiLCJlbWJhcmdvIl19LHsiaWQiOiJmcmVuenkiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJlY2hvaW5nX21pZ2h0Iiwic3RlYWR5X25lcnZlIiwicmluZ2luZ19yZXBvcnQiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MzM4NjE2NTUsInVuaXF1ZXMiOnsiYW11bGV0IjoiYm9ycm93ZWRfYnJlYXRoIiwibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 10`
- class:brawler + primary:venom_ammunition + support:steady_nerve + support:at_the_brink: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJicmF3bGVyIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InZlbm9tX2FtbXVuaXRpb24iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzdGVhZHlfbmVydmUiLCJhdF90aGVfYnJpbmsiLCJjYXN0X29uX2tpbGwiXX0seyJpZCI6InJpZnRzdGVwIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6Miwic3VwcG9ydHMiOlsibWFkZGVyaW5nIl19LHsiaWQiOiJ3aGlybHdpbmQiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJlY2hvaW5nX21pZ2h0Iiwic2hhdHRlcmdsYXNzIiwiYXp1cmVfaGFydmVzdCIsInNlcnJhdGVkX2VkZ2UiXSwibGltYiI6MX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTA3NTQ0MjU3OH0:spar --seeds 10`
- sundering_flight: `npm run sim -- run --refs socketed:ball_lightning:sundering_flight:20 --seeds 10`
- fire_walker: `npm run sim -- run --refs socketed:phoenix_dive:fire_walker:20 --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:40:geared --seeds 10`
- class:ascetic + primary:reap + support:reapers_encore + support:echoing_might: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhc2NldGljIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InJlYXAiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZWFwZXJzX2VuY29yZSIsImVjaG9pbmdfbWlnaHQiLCJzY2F0dGVyZWRfY2FzY2FkZSIsImZsZWV0Zm9vdCJdLCJsaW1iIjoxfSx7ImlkIjoiaWN5X2NvbWV0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MX0seyJpZCI6InN1bW1vbl9yYWdpbmdfc3Bpcml0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJsZWdpb25fY2FsbCIsImNhc3Rfb25fcG9pc29uIl0sImxpbWIiOjB9LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmV2ZXJlZF9oYW5kcyJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo5ODEzNDk4fQ:spar --seeds 10`
- chronomancer: `npm run sim -- run --refs pressure:chronomancer:10:geared --seeds 10`
- class:beguiler + primary:mantra_strike + support:ostinato + support:echoing_might: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJiZWd1aWxlciIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJtYW50cmFfc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsib3N0aW5hdG8iLCJlY2hvaW5nX21pZ2h0Iiwic3RlYWR5X25lcnZlIiwiZGVzcGVyYXRpb24iXSwibGltYiI6MX0seyJpZCI6InBvd2VyX3N1cmdlIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ0aW1lX2Z1c2UiLCJtb25vbGl0aCJdfSx7ImlkIjoic3F1YWxsX3J1bmUiLCJyYXJpdHkiOiJtYWdpYyJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo1NzEzOTYyODJ9:spar --seeds 10`
- scorched_wake: `npm run sim -- run --refs socketed:blinding_ichor:scorched_wake:20 --seeds 10`
- seatless_usher: `npm run sim -- run --refs threat:starter_magician_l25:seatless_usher:25 --seeds 10`
- class:sentinel + primary:fan_of_blades + support:flameforged + support:echoing_might: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6NDAsInNraWxscyI6W3siaWQiOiJmYW5fb2ZfYmxhZGVzIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiZmxhbWVmb3JnZWQiLCJlY2hvaW5nX21pZ2h0IiwicnV0aGxlc3MiXSwibGltYiI6MX0seyJpZCI6InRveGljX2Nsb3VkIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MSwic3VwcG9ydHMiOlsiZnJlZXplX2NoYW5jZSIsIm1ldHJvbm9tZSIsInNlaXNtaWNfbWFyY2giLCJvcHBvcnR1bmlzdHNfYmxhZGUiXX0seyJpZCI6Im9ibGF0aW9uX29mX21hbmEiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2ZsYXdsZXNzIiwiY2FzdF9vbl9ibG9jayIsInNwZW50YmFuZSJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjoxOTQxODQ0Mjc4LCJ1bmlxdWVzIjp7ImJlbHQiOiJzdG9ybV90aXRoZSJ9fQ:spar --seeds 10`
- mounting_frenzy: `npm run sim -- run --refs socketed:serpent_ray:mounting_frenzy:20 --seeds 10`
- class:wallwright + primary:scattergun + support:swift_hands + support:echoing_might: `npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InNjYXR0ZXJndW4iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzd2lmdF9oYW5kcyIsImVjaG9pbmdfbWlnaHQiLCJzbG93X2JyZXciLCJicnV0YWxpdHkiXX0seyJpZCI6Imh1bmRyZWRfcGFydGluZ3MiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZWVtaW5nX3ZlaW4iXX0seyJpZCI6Im1pcmFnZV9rbmlmZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNrZXdlcmluZ19ibG93cyIsImNyb3dkX2Zhdm9yIiwidXByb290ZXIiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4MTYyNDY5MDEsInVuaXF1ZXMiOnsibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 10`

</details>

## Build search

65,983 candidates tonight (14,877 refused by the real gates), 88,592 over 2 night(s). The archive holds 1388 elite rows; 1301 were re-measured on this commit and 4 no longer pass the gates. Tried so far in a legal build: 39 of 39 classes, 576 of 576 primarys, 604 of 604 skills, 453 of 455 supports, 41 of 41 uniques.

| band | objective | build (top factors) | value | × band median | repro |
|---|---|---|---:|---:|---|
| L5 | offense | `class:chronomancer` `off:crit` `def:none` `gear:rare` `skill:vampiric_presence` | 1218 | 34.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsicXVhaWxiYW5lIl19LHsiaWQiOiJzdHJhbmdsZXJfc2VlZCIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsidXByb290ZXIiLCJndXR0ZXJnbG93Il19LHsiaWQiOiJvdmVyY2xvY2siLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzaWVnZWJyZWFrZXIiLCJhbGFjcml0eSIsImVmZmljaWVuY3kiLCJjdXR0aHJvYXQiXX0seyJpZCI6InBvaXNvbl9ub3ZhIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidmlydWxlbmNlIiwibWFuYV9mZWVkZXIiLCJhcmNob25zX3dlbGxzcHJpbmciLCJwaW5wb2ludCJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6NTg1MzY0MjUzLCJ1bmlxdWVzIjp7ImFtdWxldCI6InN0b3JtY2FsbCIsImhlbG1ldCI6ImdyYXZlYmxvb20ifX0 --seeds 8 --base-seed 3715815646`</details> |
| L5 | offense | `class:magician` `off:speed` `def:life` `gear:rare` `skill:rain_of_ash` | 1034.5 | 29.5× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6NSwic2tpbGxzIjpbeyJpZCI6InJhaW5fb2ZfYXNoIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJmaW5hbF9ibG9vbSIsInNwZWxsX2VjaG8iXX0seyJpZCI6ImdyYXNwaW5nX2NoYXNtIiwicmFyaXR5IjoibWFnaWMifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjU1MzA0MDkxNywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwifX0 --seeds 8 --base-seed 979641264`</details> |
| L5 | offense | `class:resonator` `off:crit` `def:none` `gear:rare` `skill:doombrand` | 1004.4 | 28.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJyZXNvbmF0b3IiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJkb29tYnJhbmQiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInNwZW50YmFuZSIsInNtb3RoZXJpbmdfc3BvcmVzIl19LHsiaWQiOiJtYXJrIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6Im92ZXJjbG9jayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNpZWdlYnJlYWtlciIsImVmZmljaWVuY3kiLCJjdXR0aHJvYXQiXX0seyJpZCI6InBvaXNvbl9ub3ZhIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsidmlydWxlbmNlIiwibWFuYV9mZWVkZXIiLCJhcmNob25zX3dlbGxzcHJpbmciLCJwaW5wb2ludCJdLCJsaW1iIjoxfV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MTY3MDM1NDY3MywidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwifX0 --seeds 8 --base-seed 3408593634`</details> |
| L5 | clear | `class:flagellant` `off:crit` `def:armor` `gear:rare` `skill:doom_bell` | 6 | 16× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJmbGFnZWxsYW50IiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZG9vbV9iZWxsIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJ3aWxkX2FiYW5kb24iLCJjcm93ZF9mYXZvciJdfSx7ImlkIjoidHJhbnNncmVzc2lvbiIsInJhcml0eSI6Im1hZ2ljIn1dLCJvZmYiOiJjcml0IiwiZGVmIjoiYXJtb3IiLCJnZWFyIjoicmFyZSIsImdzIjo5MzI2MjM3MjF9 --seeds 8 --base-seed 2925009081`</details> |
| L5 | clear | `class:cryomancer` `off:speed` `def:evasion` `gear:rare` `skill:undertow` | 4.1 | 10.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidW5kZXJ0b3ciLCJyYXJpdHkiOiJtYWdpYyIsIm92ZXIiOjEsInN1cHBvcnRzIjpbInVtYnJhbF9wb3dlciJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4OTU2MDI0NiwidW5pcXVlcyI6eyJhbXVsZXQiOiJzdG9ybWNhbGwifX0 --seeds 8 --base-seed 3284098936`</details> |
| L5 | clear | `class:cryomancer` `off:speed` `def:evasion` `gear:rare` `skill:undertow` | 4 | 10.7× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoidW5kZXJ0b3ciLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImZldmVyZWRfaGFuZHMiLCJlcnVwdGlvbl9jeWNsZSJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE2MTY5OTU2MzMsInVuaXF1ZXMiOnsiYW11bGV0Ijoic3Rvcm1jYWxsIiwiYm9vdHMiOiJmbGVldGZlYXRoZXIifX0 --seeds 8 --base-seed 3284098936`</details> |
| L10 | offense | `class:magician` `off:crit` `def:ward` `gear:rare` `skill:vampiric_presence` | 5704.4 | 125.1× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJtYWdpY2lhbiIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJ2YW1waXJpY19wcmVzZW5jZSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJsaW5nZXJpbmciLCJ0YXV0X3dpcmUiLCJibG9vZF90b2xsIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZsZWV0Zm9vdCIsInRyaWFuZ2xlX3NpZ2lsIiwiYWNjZWxlcmFuZG8iLCJkZXNwZXJhdGlvbiJdfSx7ImlkIjoiZ2xhY2lhbF9yYW1wYXJ0IiwicmFyaXR5IjoibGVnZW5kYXJ5In1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE3NzgwMDA3MDMsInVuaXF1ZXMiOnsiYmVsdCI6IndpbnRlcl9hZnRlcl95b3UifX0 --seeds 8 --base-seed 4052476694`</details> |
| L10 | offense | `class:sorcerer` `off:crit` `def:armor` `gear:rare` `skill:lightning_blast` | 3730 | 81.8× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzb3JjZXJlciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJsaWdodG5pbmdfYmxhc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsicGhhbnRhc21hbF9lY2hvIiwiY3Jlc2NlbmRvIiwic3VtbW9uX3BoYW50YXNtIl19LHsiaWQiOiJicmltc3RvbmVfdm9sbGV5IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJicm9vZGJlYXJlciIsImxpbWJyZWF2ZXIiXX0seyJpZCI6InVuaG9seV9hdXJhIiwicmFyaXR5IjoibWFnaWMifV0sIm9mZiI6ImNyaXQiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjg4OTY2ODY3OH0 --seeds 8 --base-seed 3494673479`</details> |
| L10 | offense | `class:summoner` `off:speed` `def:ward` `gear:rare` `skill:detonate_mines` | 2890.3 | 63.4× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzdW1tb25lciIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJkZXRvbmF0ZV9taW5lcyIsInJhcml0eSI6InJhcmUiLCJzdXBwb3J0cyI6WyJjYXN0X29uX2Jsb2NrIl19LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInByb3ZvY2F0aW9uIiwidHJpYW5nbGVfc2lnaWwiLCJhY2NlbGVyYW5kbyIsImRlc3BlcmF0aW9uIl19LHsiaWQiOiJibG93aG9sZSIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJibG9vZF90b2xsIiwic2lja2VuaW5nIiwiY2FzdF9vbl9jcml0Il19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJ3YXJkIiwiZ2VhciI6InJhcmUiLCJncyI6MTk4MzMzMTU1MywidW5pcXVlcyI6eyJyaW5nMSI6ImNvYWxfcmVtZW1iZXJlZCJ9fQ --seeds 8 --base-seed 667698920`</details> |
| L10 | clear | `class:sentinel` `off:speed` `def:none` `gear:rare` `skill:beckon_palewisps` | 6 | 24.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbIm1vdW50aW5nX2ZyZW56eSJdfSx7ImlkIjoic2hhdHRlcmNob3JkIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJyZXNvdW5kaW5nX2VjaG8iLCJjYXNjYWRlIl0sImxpbWIiOjF9LHsiaWQiOiJkb3duYnVyc3QiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsia2luZGxlZF93YWtlIl19XSwib2ZmIjoic3BlZWQiLCJkZWYiOiJub25lIiwiZ2VhciI6InJhcmUiLCJncyI6MjEzMTgwNDAyOSwidW5pcXVlcyI6eyJnbG92ZXMiOiJnYWxld3JpZ2h0cyJ9fQ --seeds 8 --base-seed 1688667640`</details> |
| L10 | clear | `class:skald` `off:damage` `def:ward` `gear:rare` `skill:bone_cage` | 6 | 24.2× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJza2FsZCIsImx2bCI6MTAsInNraWxscyI6W3siaWQiOiJib25lX2NhZ2UiLCJyYXJpdHkiOiJyYXJlIn0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsIm92ZXIiOjIsInN1cHBvcnRzIjpbIm1lYXN1cmVkX2JsYWRlIl19LHsiaWQiOiJrZWVuaW5nX3NocmllayIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNxdWFyZV9zaWdpbCJdfSx7ImlkIjoiZnVyb3IiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJwb3RlbmN5Il19XSwib2ZmIjoiZGFtYWdlIiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0ODI3NDM1MjV9 --seeds 8 --base-seed 1420589602`</details> |
| L10 | clear | `class:spellblade` `off:crit` `def:evasion` `gear:rare` `skill:blessing_of_might` | 5.6 | 22.6× | <details><summary>token</summary>`npm run sim -- search repro --genome eyJ2IjoxLCJjbHMiOiJzcGVsbGJsYWRlIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImJsZXNzaW5nX29mX21pZ2h0IiwicmFyaXR5IjoicmFyZSIsInN1cHBvcnRzIjpbInBvbHlwaG9ueSIsIm92ZXJtYXRjaCIsIm9zdGluYXRvIl19LHsiaWQiOiJiZWNrb25fcGFsZXdpc3BzIiwicmFyaXR5IjoibGVnZW5kYXJ5In0seyJpZCI6ImRvb21fYmVsbCIsInJhcml0eSI6ImxlZ2VuZGFyeSJ9XSwib2ZmIjoiY3JpdCIsImRlZiI6ImV2YXNpb24iLCJnZWFyIjoicmFyZSIsImdzIjoxNTYwNjc2NjM0LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6InJvdGVfaGFuZCIsInJpbmcxIjoiY29tbW9uX3B1bHNlIn19 --seeds 8 --base-seed 1868249999`</details> |

Playstyles at L5, best build found per style against the band's median style (50 styles): strongest `aura · chaos` 1161.1 (3.27×), `area · lightning` 1036.9 (2.92×), `target · chaos` 983.6 (2.77×), `area · chaos` 905.9 (2.56×); weakest `detonate · lightning` 54.5 (0.15×), `mark · fire` 55.4 (0.16×), `detonate · cold` 66.9 (0.19×), `mark · physical` 96.6 (0.27×).

Playstyles at L10, best build found per style against the band's median style (50 styles): strongest `aura · cold` 5476.8 (8.79×), `court · cold` 3705.9 (5.95×), `detonate · fire` 2833.9 (4.55×), `projectile · cold` 2600.1 (4.17×); weakest `detonate · lightning` 156.5 (0.25×), `detonate · cold` 272.2 (0.44×), `target · fire` 323.6 (0.52×), `construct · cold` 352.4 (0.57×).

Playstyles at L20, best build found per style against the band's median style (50 styles): strongest `area · physical` 3.5e+29 (1.2e+26×), `construct · physical` 3.2e+9 (1142461.52×), `melee · physical` 2.2e+9 (771264.93×), `aura · physical` 484504.5 (173.04×); weakest `mark · lightning` 534.1 (0.19×), `detonate · fire` 789.7 (0.28×), `detonate · lightning` 910.6 (0.33×), `target · fire` 1091.3 (0.39×).

Playstyles at L40, best build found per style against the band's median style (48 styles): strongest `projectile · physical` 2.4e+32 (3.6e+28×), `self · physical` 1.7e+26 (2.6e+22×), `projectile · fire` 3.3e+22 (5.0e+18×), `projectile · chaos` 8.7e+20 (1.3e+17×); weakest `mark · fire` 1.8 (0×), `detonate · physical` 387.5 (0.06×), `mark · physical` 456.2 (0.07×), `mark · chaos` 460.9 (0.07×).

Main effects at L5 over 6766 rows: strongest `skill:grasping_chasm` 15.28×, `skill:infernal_bombardment` 7.27×, `skill:marshlight` 5.36×, `skill:poison_nova` 5.09×, `skill:starcall` 4.06×; weakest `primary:judgement` 0.2×, `skill:summon_swarmlings` 0.21×, `primary:null_verge` 0.22×, `primary:web_shot` 0.28×, `limb:expose_weakness#0` 0.34×.

Main effects at L10 over 10261 rows: strongest `skill:grasping_chasm` 11.47×, `primary:infernal_bombardment` 6.63×, `skill:devouring_swarm` 5.43×, `skill:avalanche` 4.97×, `skill:blightspear` 4.52×; weakest `primary:shambler_horde` 0.11×, `limb:expose_weakness#0` 0.21×, `skill:surgewind` 0.24×, `skill:turnwise_hex` 0.28×, `primary:toxic_cloud` 0.3×.

Main effects at L20 over 13429 rows: strongest `support:echoing_might` 12.04×, `skill:grasping_chasm` 9.32×, `skill:infernal_bombardment` 8.8×, `skill:mirespume` 7.32×, `skill:ice_shards` 6.31×; weakest `skill:deathwatch` 0.16×, `skill:mortis_seal` 0.23×, `limb:expose_weakness#0` 0.24×, `skill:beckon_palewisps` 0.24×, `skill:healing_stream` 0.28×.

Main effects at L40 over 12676 rows: strongest `support:echoing_might` 590.86×, `limb:shambler_horde#1` 23.67×, `primary:infernal_bombardment` 19.87×, `skill:riftstep` 9.17×, `skill:ice_shards` 7.87×; weakest `support:gentling_hand` 0.08×, `skill:glare_ice` 0.12×, `primary:stormbind` 0.13×, `skill:gather_cinderkin` 0.21×, `primary:shardrift` 0.23×.

**Other combinations far off the sum of their parts**, confirmed on fresh dice (21 tried):

- `class:trapper + primary:barrage + support:seeker + support:boomerang`: measured 0.6, its parts predict 31.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ0cmFwcGVyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImJhcnJhZ2UiLCJyYXJpdHkiOiJyYXJlIiwic3VwcG9ydHMiOlsic2Vla2VyIiwiYm9vbWVyYW5nIiwiZ2F0aGVyZWRfY2FzdGluZyJdfSx7ImlkIjoiaGFycm93aW5nX3dhaWwiLCJyYXJpdHkiOiJyYXJlIn1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJyYXJlIiwiZ3MiOjM0NTU4MDI2OH0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:sentinel + primary:marshlight + support:cast_on_overcharge + support:victors_tempo`: measured 0.9, its parts predict 79.4. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJzZW50aW5lbCIsImx2bCI6MjAsInNraWxscyI6W3siaWQiOiJtYXJzaGxpZ2h0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiY2FzdF9vbl9vdmVyY2hhcmdlIiwidmljdG9yc190ZW1wbyIsIm92ZXJtYXRjaCIsImZpbmFsX2Jsb29tIl19LHsiaWQiOiJoZWFsaW5nX3JhaW4iLCJyYXJpdHkiOiJsZWdlbmRhcnkifV0sIm9mZiI6InNwZWVkIiwiZGVmIjoiZXZhc2lvbiIsImdlYXIiOiJyYXJlIiwiZ3MiOjE0MTc1OTY3LCJ1bmlxdWVzIjp7Imdsb3ZlcyI6InVuc3BlbnRfcmVwbHkifX0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:cryomancer + primary:expose_weakness + support:sainted_ash + unique:galewrights`: measured 22.1, its parts predict 1.3. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjoxMCwic2tpbGxzIjpbeyJpZCI6ImV4cG9zZV93ZWFrbmVzcyIsInJhcml0eSI6InJhcmUiLCJvdmVyIjoyLCJzdXBwb3J0cyI6WyJzYWludGVkX2FzaCJdLCJsaW1iIjowfSx7ImlkIjoibG9vc2VfbWFycm93Z3J1YnMiLCJyYXJpdHkiOiJtYWdpYyJ9LHsiaWQiOiJleHB1bmdlIiwicmFyaXR5IjoibWFnaWMifV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6Im5vbmUiLCJnZWFyIjoicmFyZSIsImdzIjo5NzYzMjc1OTIsInVuaXF1ZXMiOnsiZ2xvdmVzIjoiZ2FsZXdyaWdodHMiLCJyaW5nMSI6ImNvbW1vbl9wdWxzZSJ9fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:wallwright + primary:scattergun + support:swift_hands + support:echoing_might`: measured 97.5, its parts predict 312489. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJ3YWxsd3JpZ2h0IiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InNjYXR0ZXJndW4iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzd2lmdF9oYW5kcyIsImVjaG9pbmdfbWlnaHQiLCJzbG93X2JyZXciLCJicnV0YWxpdHkiXX0seyJpZCI6Imh1bmRyZWRfcGFydGluZ3MiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJ0ZWVtaW5nX3ZlaW4iXX0seyJpZCI6Im1pcmFnZV9rbmlmZSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbInNrZXdlcmluZ19ibG93cyIsImNyb3dkX2Zhdm9yIiwidXByb290ZXIiXX1dLCJvZmYiOiJjcml0IiwiZGVmIjoibm9uZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjE4MTYyNDY5MDEsInVuaXF1ZXMiOnsibGVncyI6InNxdWFsbHN0ZXAifX0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:cryomancer + primary:fulminate + support:mana_feeder + support:cast_on_kill`: measured 2.6, its parts predict 50. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjcnlvbWFuY2VyIiwibHZsIjo1LCJza2lsbHMiOlt7ImlkIjoiZnVsbWluYXRlIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJtYW5hX2ZlZWRlciIsImNhc3Rfb25fa2lsbCJdfSx7ImlkIjoiYmFsbF9saWdodG5pbmciLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbImNhc3Rfd2hpbGVfZ3VhcmRpbmciXX0seyJpZCI6ImhvbmV5ZGV3X2x1cmUiLCJyYXJpdHkiOiJtYWdpYyIsInN1cHBvcnRzIjpbInVwcm9vdGVyIiwiY2FzdF9vbl9ibG9jayJdfSx7ImlkIjoiZ291cmRfYm9tYiIsInJhcml0eSI6Im1hZ2ljIiwib3ZlciI6Miwic3VwcG9ydHMiOlsiY29ycHNlZmlyZSIsImJvaWxpbmdfcG9pbnQiXX1dLCJvZmYiOiJkYW1hZ2UiLCJkZWYiOiJhcm1vciIsImdlYXIiOiJyYXJlIiwiZ3MiOjc4NTU1NjQ5NywidW5pcXVlcyI6eyJyaW5nMSI6ImVtYmVyYnJhbmQifX0:spar --seeds 30 --base-seed 4017360034`</details>
- `class:chronomancer + primary:orb_of_storms + support:hunters_momentum + support:fortunes_favor`: measured 1, its parts predict 84. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjaHJvbm9tYW5jZXIiLCJsdmwiOjUsInNraWxscyI6W3siaWQiOiJvcmJfb2Zfc3Rvcm1zIiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJodW50ZXJzX21vbWVudHVtIl19LHsiaWQiOiJzb3VsX3ZvbGxleSIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImZvcnR1bmVzX2Zhdm9yIiwidm9ydGV4IiwiY3JpbXNvbl9oYXJ2ZXN0IiwiY29uY3Vzc2l2ZV9ibG93cyJdfSx7ImlkIjoiZ3Jhc3BpbmdfY2hhc20iLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJzcGVsbF9jYXNjYWRlIiwidm9sY2FuaWNfaGVhcnQiLCJwZXJmZWN0X2RyYXciLCJjYXN0X29uX292ZXJjaGFyZ2UiXX0seyJpZCI6ImRlc3BhaXIiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJvdmVyIjoxLCJzdXBwb3J0cyI6WyJ1bnRvdWNoZWRfbWlnaHQiLCJ0dXJidWxlbmNlIiwiZnJvc3RiaXRlX2dyaXAiXSwibGltYiI6MH1dLCJvZmYiOiJjcml0IiwiZGVmIjoid2FyZCIsImdlYXIiOiJtYWdpYyIsImdzIjoxNTUxNzEwNDMyLCJ1bmlxdWVzIjp7ImJvb3RzIjoiZmxlZXRmZWF0aGVyIiwiY2hlc3QiOiJhZWdpc19vZl90aGVfZHJvd25lZCJ9fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:ascetic + primary:reap + support:reapers_encore + support:echoing_might`: measured 41.7, its parts predict 1113173.5. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJhc2NldGljIiwibHZsIjo0MCwic2tpbGxzIjpbeyJpZCI6InJlYXAiLCJyYXJpdHkiOiJsZWdlbmRhcnkiLCJzdXBwb3J0cyI6WyJyZWFwZXJzX2VuY29yZSIsImVjaG9pbmdfbWlnaHQiLCJzY2F0dGVyZWRfY2FzY2FkZSIsImZsZWV0Zm9vdCJdLCJsaW1iIjoxfSx7ImlkIjoiaWN5X2NvbWV0IiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwib3ZlciI6MX0seyJpZCI6InN1bW1vbl9yYWdpbmdfc3Bpcml0IiwicmFyaXR5IjoibWFnaWMiLCJzdXBwb3J0cyI6WyJsZWdpb25fY2FsbCIsImNhc3Rfb25fcG9pc29uIl0sImxpbWIiOjB9LHsiaWQiOiJncmFzcGluZ19jaGFzbSIsInJhcml0eSI6Im1hZ2ljIiwic3VwcG9ydHMiOlsiZmV2ZXJlZF9oYW5kcyJdfV0sIm9mZiI6ImRhbWFnZSIsImRlZiI6ImxpZmUiLCJnZWFyIjoicmFyZSIsImdzIjo5ODEzNDk4fQ:spar --seeds 30 --base-seed 4017360034`</details>
- `class:cleric + primary:zeal + support:clamor + support:ancestral_call`: measured 6.9, its parts predict 370.6. <details><summary>repro</summary>`npm run sim -- run --refs genome:eyJ2IjoxLCJjbHMiOiJjbGVyaWMiLCJsdmwiOjIwLCJza2lsbHMiOlt7ImlkIjoiemVhbCIsInJhcml0eSI6ImxlZ2VuZGFyeSIsInN1cHBvcnRzIjpbImNsYW1vciIsImFuY2VzdHJhbF9jYWxsIiwiZWNob2luZ19taWdodCIsImtpbmRsZWRfd2FrZSJdfSx7ImlkIjoic3VyZ2ljYWxfc3RyaWtlIiwicmFyaXR5IjoibGVnZW5kYXJ5Iiwic3VwcG9ydHMiOlsiYXVyZWF0ZV93cml0IiwiZnJhZ21lbnRhdGlvbiIsInVubmVydmluZyJdfV0sIm9mZiI6InNwZWVkIiwiZGVmIjoibGlmZSIsImdlYXIiOiJyYXJlIiwiZ3MiOjMxNTkwMzkyM30:spar --seeds 30 --base-seed 4017360034`</details>

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

**Support power**, median output change across the hosts each gem works on. Strongest: `ravening` +6312%, `sundering_flight` +199%, `fire_walker` +182%, `scorched_wake` +140%, `mounting_frenzy` +134%, `resounding_echo` +110%, `crescendo` +108%, `volley` +98%. Weakest: `vortex` -100%, `embargo` -100%, `gathered_casting` -100%, `guarded_casting` -100%, `tethered_orbit` -90%, `alternating_strikes` -54%, `austerity` -51%, `septic_bargain` -49%.

**Affix families** (211 measured on one magic piece against the same wardrobe without it, 11 never worn on the doll). Most output: `apply_poison` 1.95× on magician, `apply_poison` 1.75× on warrior, `apply_bleed` 1.62× on magician, `apply_bleed` 1.61× on warrior, `hadal_cold` 1.5× on magician, `hadal_cold` 1.44× on warrior, `creeper_barrow` 1.27× on warrior, `satellite_rime_wake` 1.22× on warrior. Most time survived: `life_on_evade` 1.93× on warrior, `barnacle_crust` 1.74× on warrior, `chitin_plate` 1.59× on warrior, `life_on_hit` 1.58× on warrior, `thorns` 1.54× on warrior, `life_on_evade` 1.53× on magician. Moved nothing on these rigs: 3 families.

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
Bestiary: 13095 rows measured, 100 bodies not fielded (passive or immortal fixtures). 207 bodies never swung at a hero standing idle within reach; those are sentries, spawners and scenery until shown otherwise, and their threat reads as unmeasured.
Skills: 2930 rows across the bands; 902 read zero alone and are not ranked (buffs, auras and mines show nothing without a partner), 30 warned.
Suites: 91 scenarios, 14 of 104 graded metrics outside their provisional band, 12 warned.
Matrix: 127,530 of 127,534 eligible pairs probed (100%), deep lane on 29184 pairs. Verdicts: effective 78607, blind 30593, inert 14516, cost_only 1414, negligible 2400.
Against the committed ledger (8481 rows): 13231 not on file, 1972 measuring healthy. The ledger only changes through `matrix check --reconcile`.

## What ran, and what did not

| lane | units planned | ok | gate breach | crashed/killed | out of time or not run | episodes | core-hours |
|---|---:|---:|---:|---:|---:|---:|---:|
| baselines | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| audits | 4 | 4 | 0 | 0 | 0 | 0 | 0 |
| expression | 1 | 1 | 0 | 0 | 0 | 1,208 | 0.2 |
| census | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| suites | 2 | 2 | 0 | 0 | 0 | 910 | 0.3 |
| progression | 39 | 39 | 0 | 0 | 0 | 12,480 | 4.9 |
| skills | 10 | 10 | 0 | 0 | 0 | 8,790 | 1.3 |
| skills_vs | 21 | 21 | 0 | 0 | 0 | 24,192 | 5 |
| matchups | 27 | 27 | 0 | 0 | 0 | 13,734 | 5.9 |
| bestiary | 20 | 20 | 0 | 0 | 0 | 26,190 | 4.8 |
| attributes | 39 | 39 | 0 | 0 | 0 | 4,914 | 2.3 |
| affixes | 6 | 6 | 0 | 0 | 0 | 3,472 | 1.2 |
| globals | 4 | 4 | 0 | 0 | 0 | 1,704 | 0.3 |
| matrix | 213 | 213 | 0 | 0 | 0 | 235,838 | 54.9 |
| matrix_deep | 93 | 93 | 0 | 0 | 0 | 135,913 | 24.1 |
| search | 40 | 40 | 0 | 0 | 0 | 157,930 | 31.4 |
| archive_confirm | 35 | 35 | 0 | 0 | 0 | 20,816 | 6.1 |
| proposals | 48 | 48 | 0 | 0 | 0 | 9,224 | 2 |

Every planned unit ran.

Not simulated at all, by design: zone generation and XP pacing, event pressure, multiplayer, and real player skill. Pilots are simple policies, so kit ceilings are floors. Bands stay provisional until you sign them off.
