# NPC combat AI: direction

**Status.** The owner approved phases 0 to 3 on 1 November 2026, and they are on `main`. The owner has since read this plan and agrees with almost all of it. Two calls are recorded in section 7: prey almost never fights back (decision 4, changed from my recommendation), and threat holds for now (decision 7), which the number pass of 2 November 2026 does (below). Phase 4's scaffolding and phase 5's intent pilot landed the same day, phase 6's bucket rollout covered all six kernels it named, phase 7's stance and temperament followed on 3 November 2026, and phase 8's chaos budget on 14 November 2026 (below). Phases 9 onward (cornered, default on) have not been started. Section 7's defaults that landed with phases 0 to 3: a commander alone fights, thieves run only while carrying loot and the other hunters close, a minion's committed charge passes through its keeper, and all of this applies to enemies only. Below is the document as it was written for that decision, changed only where the owner changed it: line numbers are for `cdcef35d`, and "proposed" means proposed then.

## What phases 0 to 3 changed

Measured on the real runner at level 12, 25 s, on every fielded body (2,184 rows), against `main` before the change. Hit and DoT damage only, so the instrument fix does not flatter the comparison. Pack rows are the mean of six seeds.

| Reading | Before | After | Plan's prototype |
|---|---:|---:|---:|
| Open defects from the 33 that land a hit on the idle rig | 0 of 21 | 21 of 21, median first hit 1.4 s | 18, then 21 |
| Refused presses across the bestiary | Up to 90 per 25 s | 0 | 0 |
| Bodies resting where no damaging skill reaches | 55 | 1, adjudicated (`mantid_penitent`) | 0 or adjudicated |
| Held bodies that never press melee, duel | 79 of 160 | 44 | 35 |
| Melee presses per fight, duel | 2.2 | 7.0 | 5.5 |
| Other presses per fight, duel | 9.5 | 10.5 | 9.0 |
| Median time in reach, duel | 1.7% | 38% | 35% |
| Median time to first melee, duel | 7.0 s | 3.8 s | 3.1 s |
| Distinct skills per fight, duel | 1.83 | 2.38 | 2.15 |
| Mean damage to the hero per s, duel | 6.6 | 7.4 | 6.6 |
| Hero deaths, duel, of 160 | 24 | 32 | |
| Mean damage to the hero per s, idle hero | 25.1 | 29.8 | |
| AI tick per body, 200 bodies | 44 µs | 42 µs | No worse |

Of all rows, 1,727 are byte-identical to before. The other 457 belong to 266 bodies.

**Threat.** Reading the eight large kernel buckets on the mean in real duels, five stayed inside the 15% corridor: `approach` held bodies +1%, `holdRange` +2%, `approach` -4%, commanders +7% and +14%. Three did not: `direct` held bodies rose 23%, and `slideCast` and unheld `direct` bodies fell 21% and 28%. A few buckets of one or two bodies moved more. Against a hero who does nothing, held and commander buckets rose by about a fifth to a half, which is what adding melee to their kits should do. The number pass below brings them back.

Against a geared level 12 warrior, the hero now dies to ten more bodies and survives four more. Six of those ten are leaders and heavy juggernauts that used to stand off harmlessly (`lord_vormaul`, `ossuarch_of_the_host`, `toll_king`, `odyssey_bandit`, `odyssey_chitin`, `brood_sovereign`). The others are `transfusion_acolyte`, `zephyrid_matron`, `ash_whelp` and `the_factor`. A body that could never fire has never had its damage tested by anyone, so `transfusion_acolyte` (0 to 21.6 per s) is the kind of row to look at first.

**One dial differs from this plan.** Tokens are one per prey, not two. Two left six imps on a warrior at about 3.5 times the old damage, and one left them at 1.5 times with no deaths. Other packs barely noticed. The pack rows are mixed, as predicted. The mixed abyssal pack eases off on a warrior (deaths fall from 6 to 3 of 6), crawlers read lower per second there but kill once more in six, `pit_lord` packs sharpen by a third to two fifths, and packs that already kill a magician in seconds do so a little faster.

**What else the census found.** Beyond the plan's list: `slideCast`'s other constant (240 px) parked nine strafers past their own reach, and it now keeps inside the body's longest blow. Three authored distances moved into reach as data (`dust_djinn`, `gloam`, `chitin_stridulant`'s landing). `mantid_penitent` stays parked on purpose: it wins by waiting. Three skills could not be fed by their own kit, and each kit has since been given a way to set them up, as the hellhound got. `tundra_behemoth` now breathes `rime_breath`, so its chill feeds `flash_freeze`. `emerald_mantis` gained `scything_rake`, a deliberately thin bleed, because `eviscerate` cashes in the whole wound: a full `rend` read seven times the damage. `pit_mauler`'s `pit_maul` is its old `sunder_maul` with a 30% chance to apply Sundered directly, so `verdict` fires on a hero with no poise bar, and the bonus damage from a broken bar still needs a broken bar. At level 12 on an idle hero, the behemoth goes from 4.0 to 12.6 damage per second and the mantis from 8.7 to 16.9, against a cohort median of 15.5, and the mauler stays at 26.1. All three remain close to harmless in real duels.

**Why a doom pack read harmless.** Four `abyssal_wretch` read 6 damage per second and a 99% life floor while killing the hero in 4 s. Doom's detonation writes to life directly, past every tap, and vitals are sampled, so the blow that killed fell between samples. Death blasts with no owner have the same blind spot, and about twenty other direct life writes could too. The collector now reads the hero's bar every tick and counts whatever no tap named (`untapped_in`), so the next such path cannot hide. Outgoing damage has the same blind spot and has not been fixed: a player's own rupture does not reach `dps_out`.

## The number pass (2 November 2026)

You ruled to hold threat at its level before these phases (decision 7). The first full farm night after phases 0 to 3 (run 41446083432, 624,645 episodes) read every body's threat against a hero who stands still, for a warrior and a magician at levels 5, 12 and 25. Each body that rose got a damage dial in `src/data/monsterDamage.ts`, solved on real runs: a body may rise as far as its cohort's median, or 15% past its own old level if it already stood above the median, and no further. A dial is an ordinary `more` damage modifier added at spawn, so a shared skill such as `claw` is unchanged for every other body that swings it. Where the new damage came from melee a body was newly allowed to use, the dial cuts melee only.

46 bodies have a dial. Dials of 0.95 or more were dropped as noise. `barrow_gravemaker` keeps only its melee dial, because the rest of what it does to a hero is the bodies it births, and `goetic_binder`'s threat is its summons. Both are left to the farm. Bodies whose new damage was only newly counted (`morthessa_unburied`'s blast, `grave_shambler`) were left alone. Ten dials sit at the solver's limit of 0.3 on melee: `imp`, `barrow_gravemaker`, `transfusion_acolyte`, `mirage_khagan`, `mirage_dancer`, `levin_thegn`, `hellhound`, `myconid_warrior`, `depthkin_brute` and `depthkin_crawler`. For them, newly reachable melee is nearly the whole rise, and the nightly proposals keep reading them. The farm's threat rule can now move these dials (`monsterDamage.<id>.all`) for any body whose kit is shared.

Against `main` before phases 0 to 3, on a fresh seed (level 12, 25 s, every fielded body, 2,184 rows):

| Reading | Before | After |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 19.5 | 20.3 (+4%) |
| Mean damage to the hero per s, duel | 4.8 | 4.8 (0%) |
| Hero deaths, standing still, of 1,092 | 494 | 527 |
| Hero deaths, duel, of 1,092 | 115 | 119 |
| Held 160, damage per s, standing still | 25.1 | 27.8 (+10%) |
| Held 160, damage per s, duel | 6.6 | 7.2 (+9%) |

Each large kernel bucket's mean now sits within about 15% of before, standing still and in duels: `approach` +1% and -3%, unheld `direct` +1% and -2%, `slideCast` -1% and -12%, `holdRange` +2% and +1%, held `direct` +10% and +10%, held `approach` +11% and -1%, commanders +15% and +5%, held commanders +15% and +14%. Medians against a still hero rose more for commanders (8.0 to 14.3), because commanders that used to hover forever with no ally now fight. Section 6 judges bodies that go from zero to something against their cohort, not the corridor.

## Phase 4: the scaffolding (2 November 2026)

Each body has its own die: a mulberry32 step seeded from the run's seed and the body's id (`bodyRoll` in `src/engine/intent.ts`), so a body thinking never moves the global die and never re-deals another system's rolls. The think clock (`thinkDue`) staggers each body's first beat by an id hash and draws every later gap from 0.55 to 0.95 s on that die. `BrainTuning.intent` is an ordinary brain axis (`IntentSpec`: a body's own think range and floor), folded by `mergeTuning`, and `null` clears it. `INTENT_CFG` in `src/data/aiIntent.ts` holds the numbers. Dev → AI lists the enemies near the hero with their kernel, distance, ready ring, think clock and intent, and the closer tokens held on the hero; its lever turns the layer off for every body at once. `band_switches_10s` counts how often each body crosses the near (90 px) and mid (260 px) bands, per 10 s of body time. No body carries the axis yet, and a body given it fights byte-identically with the lever on or off (`balance/probe_intent.ts`).

## Phase 5: the intent pilot (2 November 2026)

Nine bodies carry the axis (`brain.intent`): `oblivion_knight`, `imp`, `abyssal_crawler`, `abyssal_wretch`, `pit_lord`, `frost_witch`, `goblin_shaman`, `warband_chieftain` and `hex_weaver`. Each decides as section 4 describes. On its think clock, or the moment its last decision was cast, it keeps the skills that can fire, scores them, keeps the top authored rank, cuts what stands far worse placed, and rolls on its own die. Its feet go where the chosen skill works. Kernels that hold authored bands (`holdRange`, and `hoverAllies` while allies stand by) keep them, and choose only among skills that reach from where they stand.

The first pilot run failed in five ways, and each is now a rule, measured against that failure:

1. **Busy hands keep the decision.** A body mid-cast or mid-recovery reads every skill as unready, so the imp chose to wait for its claw on every beat. A body now thinks at the first tick it can act, as the ready ring already keeps its last read.
2. **A cast decision keeps placing the feet until the body can decide again.** Clearing it at the cast let a flanker's plain orbit ring pull it out during each swing's recovery, and it walked back for every blow. The knight lost a quarter of its damage that way.
3. **The hands keep the tempo while the feet travel.** The picker narrows to the decision once that skill can fire. While the body waits on a cooldown, or is still more than `enRouteSec` (0.6 s) of walking from its decision's reach, anything else that can fire from where it stands may. Strict narrowing cost `abyssal_crawler` its lance on every approach, and its duel damage fell to zero.
4. **Authored order outranks a standing decision.** A skill ranked higher (opener, live combo, priority order) that can fire from where the body stands goes first, so the knight's `heavy_strike` is not held behind a cleave chosen a moment before.
5. **The floor cuts for the situation, never for `ai.weight`, and a curse or buff the fight calls for is worth as much as a blow.** With the floor on the full weight, a weight-1 `war_cry` never beat four weight-3 attacks, where the old picker fired it about one time in thirteen.

Level 12, 25 s, twelve seeds per body, the same code with the layer off and on:

| Reading | Off | On |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 20.3 | 20.0 (-1%) |
| Mean damage to the hero per s, duel | 3.6 | 3.4 (-7%) |
| Hero deaths, standing still, of 108 | 78 | 70 |
| Hero deaths, duel, of 108 | 14 | 11 |
| Band changes per 10 s, hero standing still | 1.12 | 1.01 |
| Band changes per 10 s, duel | 3.85 | 4.01 |
| Distinct skills per fight, duel | 2.40 | 2.40 |
| Presses per fight, duel | 15.4 | 16.0 |

Every body stays within 15% of its own damage with the layer off, standing still and in duels, apart from `frost_witch` in duels, which barely lands anything there (1.0 to 1.6 per s). `pit_lord` reads lowest (-14% and -12%), and `imp` and `goblin_shaman` highest against a still hero (+15%). So no number pass follows this phase. Two of the plan's success measures read differently than expected:

- **Skills used per fight did not rise,** because since phase 3 these bodies already use their whole kit: 2 of 2, 3 of 3. Only `pit_lord` uses a little less of its five (2.9 to 2.7 standing still).
- **Band changes stay under one per 3 s against a still hero for every pilot body but two,** `warband_chieftain` (4.0, against 3.6 without the layer) and `oblivion_knight` (3.7, against 4.0), and the probe holds every body to its own old level. In duels, plain bodies already change band about once every 2.6 s, because the hero walks up, knocks back and steps away: `hex_weaver` reads 5.5 without the layer, and 8 of its 12 duels are byte-identical with it.

What you can see: the knight curses at once, walks in and strikes, cleaves, and curses again at arm's length when the curse returns. The imp throws fire while its mana lasts and rushes in for its claw when it runs dry. With its claw resting it holds about 214 px and throws, where the plain imp walks into melee with only fire to throw. The pit lord casts its ray on the way in to swing. Dev → AI shows each body's decision and scores, and its lever turns the layer off for every body in the same fight. Your hands-on read is this phase's last check.

## Phase 6: the bucket rollout (2 November 2026)

You said to start before playing the pilot itself. Your first read, on that morning's site build, covered phases 0 to 3 and found the enemies livelier, "precisely the goal". `INTENT_CFG.buckets` lists the movement kernels whose enemies carry the intent layer without authoring an axis, one kernel per landing. A brain's own `intent` overrides those defaults, and `intent: null` keeps a body exactly on its old conduct, which is also what the lever's off side does (`balance/probe_intent.ts`). A body that a phase or rule switches into a listed kernel carries the layer while it runs that kernel. Only enemies read the layer, so a body the player claims drops its last decision and never decides again.

### Bucket 1: `direct`

`direct` is the closing kernel: a body walks at its prey and casts on the move. The first run over it failed in three ways the nine pilot bodies never showed, and each is now a rule beside the five above:

6. **A skill cast on the body itself gives the feet no place to go.** A guard such as `shield_up` has an AI range of 240 px, so deciding it parked `rime_wrecker` and `hollow_vanguard` about 190 px out, beyond their own `heavy_strike`, and both lost half their damage. Self, aura and summon deliveries (`INTENT_CFG.placeless`) leave the plain ring in charge, and both bodies fight byte-identically again.
7. **The feet follow a decision only where the kit holds a distance.** With no skill asking for distance, the plain ring already closes to the kit's shortest reach, where every skill works. A ring at 0.8 of a ground skill's range had held swarms out of their own claws.
8. **Only a short walk holds the hands.** A body already in reach of its decision that still cannot press it (no line of fire, nothing to target) may press anything else. In duels, `breach_gnawmouth`'s decision had left nothing to press on 191 of 267 narrowed picks.

274 bodies run `direct` with no axis of their own, and 13 more switch into it in a phase or rule. Level 12, 25 s, twelve seeds per body, the same code with the layer off and on:

| Reading | Off | On |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 25.1 | 24.1 (-4%) |
| Mean damage to the hero per s, duel | 5.2 | 4.9 (-6%) |
| Hero deaths, standing still, of 3,444 | 1,915 | 1,873 |
| Hero deaths, duel, of 3,444 | 398 | 367 |
| Band changes per 10 s, hero standing still | 1.1 | 1.1 |
| Band changes per 10 s, duel | 2.8 | 2.9 |
| Distinct skills per fight, duel | 2.12 | 2.14 |

174 of the 287 fight differently in at least one seed. By kit:

- **One hinted skill (83 bodies):** unchanged. 983 of 996 duels are byte-identical.
- **Several skills, none asking for distance (129):** -2% standing still and -5% in duels. Rules 7 and 8 brought duels back from -19%.
- **A ranged skill that keeps its distance, plus melee (54):** -11% standing still and -10% in duels. This is the variety the layer exists for: when such a body decides on a blow, it walks in to strike, where the plain ring held it at its keepDistance. A blow at arm's length is often weaker than the shot it replaces, and a body in reach of a geared warrior dies sooner. `depthkin_brute` (-67%), `amalgam_bonelord` (-60%), `magma_worm` (-38%), `petrified_warden`, `molting_behemoth` and `lode_thrall` (about -30% each) fell most against a still hero. You ruled to hold threat rather than accept harder fights, and a fall is not a harder fight, so these are left to the farm's nightly proposals.
- **Ranged with distance and no melee (21):** unchanged on the mean.

No body changes band against a still hero more than the probe's bound (one change per 3 s, or 1.25 times its own old rate plus 0.5). 45 bodies already changed band more often than once per 3 s without the layer, and 44 do with it.

**The number pass.** The same rule as the first, read with the layer off and then on, for a warrior and a magician at levels 5, 12 and 25, on every body that rose more than 5% at level 12 or 15% in duels (18 bodies). Three passed their cap. `vent_matron` and `hemophage` now have dials (0.85 and 0.8). `derecho_ram`'s solved dial of 0.95 is noise by the first pass's rule and stays at 1, although it rises 36% against a still warrior at level 12 (17% across all six reads).

**One opt-out.** `hunt_draugr`, a slow hunt quarry whose phases already script its conduct, crossed between its throw and its blows about once every 2 s with the layer (5.2 changes per 10 s, against 3.6 without it), past the bound. It keeps its old conduct with `intent: null`.

**The pilot under the new rules.** The nine pilot bodies read -4% standing still and -3% in duels against the layer off, over twelve seeds. Two pass 15%: `pit_lord` reads -17% standing still, mostly from three seeds, and uses a little less of its kit (2.8 to 2.3 skills). `imp` reads -26% in duels, where single duels range from 1.4 to 14 damage per second without the layer, so about one standard error.

**What else moved.** Every fielded body at one seed, against `main` (2,184 rows): 1,917 are byte-identical. The 168 bodies that differ are 151 that run `direct` at least part of the time, one pilot body, and 16 whose summons or escorts run `direct` (`gnoll_howler`'s prowlers, `goblin_wolfrider`'s warg, `formic_burrow`'s workers, among others). With 200 engaged `direct` bodies, the AI tick costs about 51 µs per body with the layer off and 54 µs with it on (three alternating runs), within the spread between repeats of the same code. The smoke suite's gated metrics did not move.

### Bucket 2: `approach`

`approach` is the default kernel, so it holds most simple bodies: 278 carry no axis of their own, 159 of them with one hinted skill or none, and 85 cannot walk at all (spires, maws, totems). No phase switches a body into it. Level 12, 25 s, twelve seeds per body, the layer off and on:

| Reading | Off | On |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 19.4 | 19.2 (-1%) |
| Mean damage to the hero per s, duel | 3.7 | 3.5 (-5%) |
| Hero deaths, standing still, of 3,336 | 1,729 | 1,743 |
| Hero deaths, duel, of 3,336 | 354 | 326 |
| Band changes per 10 s, hero standing still | 0.7 | 0.7 |
| Band changes per 10 s, duel | 2.5 | 2.6 |
| Distinct skills per fight, duel | 1.39 | 1.40 |

114 of the 278 fight differently in at least one seed. By kit:

- **One hinted skill or none (159 bodies):** -1% standing still and +3% in duels; 1,782 of 1,908 duels are byte-identical.
- **Several skills, none asking for distance (42):** unchanged standing still, -4% in duels.
- **Ranged with distance and no melee (44):** unchanged standing still, -6% in duels.
- **A ranged skill that keeps its distance, plus melee (33):** -3% standing still, but **-40% in duels**, where hero deaths fall from 46 to 32. This is the plan working as written, at a cost: `keepDistance` speaks only for its own skill, so when a warrior closes in and such a body decides on its claw, it stops kiting and scratches back, where the plain ring backed it off to shoot. `cistern_crone` (10.8 to 2.8 per s), `spitting_horror` (17.7 to 7.6), `glacier_shaman` and `wayward_arcanist` (about half) fell most. Against a hero who stands still the same bodies hold.

**Band changes.** Five bodies pass the probe's bound against a still hero, and none is opted out. Three are frost casters (`breach_hollowchill` 1.0 to 3.8, `ice_golem` 1.0 to 3.6, `masque_haunt` 0.3 to 3.4) that walk in for their nova whenever it returns and back out for their bolts, which is again the plan's design. Two are melee bodies (`brute` 0.8 to 3.4, `cindermaw_toolthief` 2.1 to 3.6) whose own heavy strikes knock the still hero out of the near band, and they now use those strikes more. 15 bodies change band more often than once per 3 s with the layer, against 11 without.

**Bodies that cannot walk.** The ten with two or more skills read -2% standing still and -4% in duels. A rule that let a rooted body never hold its hands for a walk changed nothing measurable, so it was not kept: `geysermaw` (-34%) and `shard_spire` (-18% in duels) lose damage to the choice itself, now spreading their kits more evenly.

**The number pass.** The same rule on 17 candidates; two passed their cap: `shadow_self` (0.8) and `surge_echo` (0.9). `surge_echo` still reads 11.6 to 22.5 against a still warrior at level 12, its loudest row, and sits at its cap across all six.

**What else moved.** Every fielded body at one seed, against `main`: 2,025 of 2,184 rows are byte-identical. The 103 bodies that differ are 98 that run `approach` and five whose escorts or summons do (`goblin_chief`'s and `odyssey_goblin`'s brutes, `hunt_wendigo`'s pack, `scaffold_colossus`'s skitters, `elder_treant`'s boughs). The AI tick with 200 engaged `approach` bodies costs 44.5 µs per body off and 46.8 µs on (three alternating runs each), about 5% more. The smoke suite's gated metrics did not move.

**The question this bucket raised** was whether such a body should stand and fight in melee when a warrior closes in. The plan said yes, and it cost those bodies 40% of their threat in real duels. You answered below.

### The kiter's choice (your ruling)

You ruled that kiters keep kiting, though less than they used to, with a random roll now and then deciding to stand and fight, so the pace of a fight changes (decision C18). That is rule 9:

9. **A kiter mostly keeps its distance, and its own die says when it stands.** When a ranged skill that keeps a distance is ready and the kit has something that works only inside it, the body rolls on its own die (`INTENT_CFG.kite`: it stands 35% of the time) and holds the roll for 2.5 to 5 s before rolling again. Kiting, it never walks in for the short skill and its feet keep the distance, while its hands still use whatever reaches. Standing, it decides as before. A roll taken only once the prey was inside the distance left a body walking in from the edge and straight back out, so the roll covers the walk in too.

Twelve seeds, the 128 `direct` and `approach` bodies the roll touches, against the layer off:

| Bodies | Without the roll | With it |
|---|---:|---:|
| `direct` kiters (72), hero standing still | -9% | -4% |
| `direct` kiters, duel | -9% | -4% |
| `approach` kiters (56), hero standing still | 0% | +1% |
| `approach` kiters, duel | -17% | -10% |

`cistern_crone` is back to 6.5 damage per second in duels (from 2.8, against 10.8 without the layer), and `spitting_horror` to 14.3 (from 7.6, against 17.7). Two of the three frost casters drop back under the band bound (`breach_hollowchill` 3.8 to 1.6 changes per 10 s, `ice_golem` 3.6 to 1.8). `masque_haunt` still passes it (3.4), walking in for its refrain whenever it stands. `balance/probe_intent.ts` rig L counts 11 stands in 37 rolls on `cistern_crone`. The number pass took `shadow_self` from 0.8 to 0.7. The pilot, read again with the roll: -2% standing still and +1% in duels. Since phase 7 the stance carries this roll, and an unlisted archetype keeps the same share (below).

### Bucket 3: `hoverAllies`

The commanders: 72 carry no axis of their own (`warband_chieftain` keeps its pilot axis), most with three skills. While an ally stands in its ward, a commander keeps its authored band and chooses only among skills that reach from there; alone, it runs its `alone` kernel and its feet follow the decision. Level 12, 25 s, twelve seeds per body, the layer off and on, with the kiter's choice in place:

| Reading | Off | On |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 39.4 | 39.3 (0%) |
| Mean damage to the hero per s, duel | 11.4 | 11.4 (0%) |
| Hero deaths, standing still, of 864 | 573 | 578 |
| Hero deaths, duel, of 864 | 183 | 186 |
| Band changes per 10 s, hero standing still | 2.0 | 2.0 |
| Band changes per 10 s, duel | 2.9 | 2.9 |
| Distinct skills per fight, duel | 3.54 | 3.56 |

66 of the 72 fight differently in at least one seed. By kit: several skills with no distance (24) +1% standing still and +8% in duels, ranged with distance and no melee (25) +3% both ways, ranged with distance plus melee (20) -6% and -7%. No body passes the band bound (22 changed band more often than once per 3 s without the layer, 21 with it). The largest falls against a still hero are `odyssey_undead` and `lich_marshal` (-37% each), and in duels `archfiend_legate` (-48%) and `aureole_tribune` (-44%). The number pass dials `grave_hag` (0.85) and `grove_singer` (0.9); `speaker_of_dusk`'s 0.95 is noise. Every fielded body at one seed against `main`: 2,102 of 2,184 rows are byte-identical, and all 50 bodies that differ are commanders.

### Bucket 4: `orbit`

The strafers that circle their prey at blade's length: 53 carry no axis of their own (`oblivion_knight` keeps its pilot axis), and ten more, mostly birds, switch into `orbit` in a phase or rule. Twelve seeds per body, the layer off and on:

| Reading | Off | On |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 18.0 | 17.8 (-1%) |
| Mean damage to the hero per s, duel | 1.8 | 1.6 (-9%) |
| Hero deaths, standing still, of 756 | 453 | 465 |
| Hero deaths, duel, of 756 | 39 | 37 |
| Band changes per 10 s, hero standing still | 0.9 | 0.9 |
| Band changes per 10 s, duel | 3.9 | 3.9 |
| Distinct skills per fight, duel | 2.03 | 2.06 |

38 of the 63 fight differently in at least one seed. Almost all the duel damage comes from the ten whose kit keeps a distance (-9% and -8% in duels); the rest barely land a blow on a geared warrior with the layer or without it. No body passes the band bound, and no body rose past its cap, so there are no new dials. `night_hunter` and `chitin_skimmer` fall most against a still hero (-19% each), and `vampire_thrall` in duels (-33%). Every fielded body at one seed against `main`: 2,128 of 2,184 rows are byte-identical. The 35 bodies that differ run `orbit`, plus `abyssal_flayer`, whose mind is rolled at spawn and can run it, and `goetic_binder`, whose summons do.

### Bucket 5: `holdRange`

Artillery that keeps an authored band: 80 bodies with no axis of their own, 46 of them with one hinted skill and 36 that cannot walk, and five birds that switch into the kernel. `holdRange` is not a follower, so the decision only chooses among skills that reach from where the body stands. Twelve seeds per body, the layer off and on:

| Reading | Off | On |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 14.3 | 14.3 (-1%) |
| Mean damage to the hero per s, duel | 4.6 | 4.6 (-1%) |
| Hero deaths, standing still, of 1,020 | 411 | 413 |
| Hero deaths, duel, of 1,020 | 152 | 150 |
| Band changes per 10 s, hero standing still | 0.9 | 0.9 |
| Band changes per 10 s, duel | 3.1 | 3.1 |
| Distinct skills per fight, duel | 1.51 | 1.51 |

Only 28 of the 85 fight differently in any seed. No body rises more than 5%, passes the band bound or needs a dial; the largest falls are in duels (`deadwake_hollow_choir` -21%, `beastkin_ritualist` -17%, `farshore_warden` -16%). Every fielded body at one seed against `main`: 2,158 of 2,184 rows are byte-identical, and the 18 that differ run `holdRange`, plus `siegeback_aurochs` and `lord_ozrimoth`, whose crews or escorts do.

### Bucket 6: `slideCast`

The strafing casters, who holster their spells during a slide: 80 bodies with no axis of their own, 35 of them with one hinted skill. Their feet follow the decision, and the kiter's choice applies. Twelve seeds per body, the layer off and on:

| Reading | Off | On |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 16.3 | 16.0 (-2%) |
| Mean damage to the hero per s, duel | 3.3 | 3.2 (-3%) |
| Hero deaths, standing still, of 960 | 386 | 374 |
| Hero deaths, duel, of 960 | 86 | 89 |
| Band changes per 10 s, hero standing still | 0.8 | 0.8 |
| Band changes per 10 s, duel | 3.8 | 3.7 |
| Distinct skills per fight, duel | 1.66 | 1.67 |

53 of the 80 fight differently in at least one seed. By kit: ranged with distance and no melee (35) -2% standing still and unchanged in duels, several skills with no distance (8) -9% and -12%. No body passes the band bound or rises past its cap, so there are no new dials. `elemental_concordance` falls most against a still hero (-47%), and `leyline_sovereign` in duels (-37%). Every fielded body at one seed against `main`: 2,110 of 2,184 rows are byte-identical. The 50 bodies that differ run `slideCast`, plus `abyssal_vanguard` and `deadwake_hollow_choir`, which switch into it, and `coil_matriarch`, whose `hooded_spitter` escort runs it.

### Phase 6 in sum

All six kernels the plan named now carry the intent layer by default, and with the pilot 845 of the 1,092 fielded bodies decide what they want next. Each bucket held its threat within the corridor against the layer off, standing still and in duels: `direct` -4% and -6%, `approach` -1% and -5%, `hoverAllies` 0% and 0%, `orbit` -1% and -9% (on 1.8 per s), `holdRange` -1% and -1%, `slideCast` -2% and -3%, with the kiter's choice bringing the kiting kits most of the way back. Nine rules came out of the rollout and the pilot, six dials out of its number passes, and one opt-out (`hunt_draugr`). `masque_haunt` is the one body left past the band bound, and the falls are left to the farm. The kernels outside the plan's six (`hitAndRun`, `juke`, `skitter`, `lurk`, `charge`, `backstab`, `interpose`, `weave`, `retreat`) keep the plain ring until phase 10's default-on.

### After phase 6: a swarm swarms (your ruling)

Three oblivion knights showed what phase 3's closer tokens did to a group: one token per prey let the first knight in and held the other two at Despair's 280 px for as long as it kept fighting (68%, 0% and 0% of 20 s in melee against a hero who stands still). Tokens only ever gated bodies whose kit keeps a distance; plain melee packs always closed. You ruled that a swarm should swarm, and that a hero who keeps moving, not a cap on the monsters, is what should thin it (decision C19). `BEHAVIOR_CFG.closers.perPrey` now takes no turns by default, and a kind whose brain sets `move.closers` still waits its turn (`balance/probe_readyring.ts` rig 3: six crawlers walk in together, three knights come in once their curse rests, and the same knights with `move.closers: 1` take turns).

The pack rig (a geared warrior or magician at level 12, six seeds, until the pack or the hero falls), cap of one against no cap:

| Pack | Hero | Damage per s | Hero deaths of 6 | Share of time in reach |
|---|---|---:|---:|---:|
| 6 imps | warrior | 9.7 to 24.2 | 0 to 0 | 0.10 to 0.53 |
| 6 crawlers | warrior | 73.1 to 57.9 | 6 to 4 | 0.07 to 0.63 |
| 6 crawlers | magician | 120.2 to 57.9 | 6 to 5 | 0.00 to 0.50 |
| 8 mixed abyssal | warrior | 13.6 to 15.0 | 2 to 1 | 0.11 to 0.19 |
| 8 mixed abyssal | magician | 27.6 to 15.4 | 6 to 4 | 0.02 to 0.04 |
| 4 wretches | warrior | 6.8 to 5.2 | 6 to 6 | 0.06 to 0.22 |
| 3 oblivion knights | warrior | 0.0 to 1.4 | 0 to 0 | 0.33 to 0.52 |

Casters and plain melee packs (zombies, brutes, skeletons) fight byte-identically. Swarming is not a plain threat multiplier: packs that now crowd in fall faster to the hero's own blows, and several kill less. Only the imps deal more, and still kill no one. These heroes fight back but do not dodge; the mobile, evasive facet the harness is gaining will read the swarm the way a veteran meets it.

### The veteran facet (your ruling)

You asked for a balance harness with several faces: the training dummy for a build's top end, the hero who stands still for a monster's raw threat, and a player-simulated face that fights the way a veteran does, moving constantly and refusing the attack arcs it can see (decision C19). That face is the veteran pilot (`src/sim/pilots.ts`, `VETERAN_CFG`). Its hands are the class's ordinary brawler or caster pilot; its feet, first match wins:

1. Leave a telegraphed blast that will hurt and cover it (the engine's own `imminentThreatTo` read), by whichever way out (straight out or 60° either side) leaves it nearest its target, if it can still get clear before the blast lands.
2. Step out of a melee or cone swing whose arc covers it: sideways from a narrow arc, backwards from a wide one.
3. Surrounded by three or more, walk out through the widest gap.
4. Otherwise keep the hand's stance; a ranged hand sidesteps every couple of seconds.

It answers a threat only after watching it for 0.25 s, and it uses no randomness, so a seed replays its fight. Because a movement press holds back repeated attacks (decision C02), it stops swinging while it dodges, as a player does. The first draft dodged everything: it walked out of `gnoll_colossus`'s rally cry, a 900 px nova it could never clear, and gave up every swing doing it. So a blast it cannot clear, or that does no damage, now leaves it fighting. The first draft also left blasts straight away from its target, where it now takes the way out nearest the fight, and its melee hand no longer sidesteps on a timer.

Against single monsters (geared level 12, six seeds, the same hands), it takes less where dodging should matter. `pit_lord` falls from 21.1 to 17.9 damage per second on a warrior, and imps and `cistern_crone` kill a magician 3 and 2 times in 6 where they killed it every time. It is unchanged where there is nothing to dodge (`gnoll_colossus`, `breach_hollowchill`), and a melee veteran deals what the plain warrior does at a dummy, byte for byte. Its melee hands still lose damage to kiters and chargers (`maze_bull` 63 to 49, `cistern_crone` 71 to 47), the cost of stepping out.

Against packs, a veteran who moves is what thins a swarm:

| Pack vs warrior | Plain pilot, cap 1 then none | Veteran, cap 1 then none | Veteran deaths of 6 |
|---|---|---|---|
| 6 imps | 9.7, 24.2 | 11.0, 15.1 | 0, 0 |
| 6 crawlers | 73.1, 57.9 | 82.7, 31.2 | 6, 0 |
| 8 mixed abyssal | 13.6, 15.0 | 14.6, 14.3 | 3, 2 |
| 3 goblin brutes | 9.6, 9.6 | 13.1, 13.1 | 1, 1 |

Lifting the cap costs a veteran 37% more damage from imps where it cost the plain pilot 150%, and six crawlers that trickled in one at a time killed it every seed while the swarm it can walk out of kills it in none. The brutes show the next thing to tune: walking out of a three-body crowd takes heavy strikes in the back.

`sweep bestiary` now runs the veteran beside the duel and the still hero (`matchup_veteran_…`), and the farm reports `veteran %life/s` cohorts and `monster_veteran` outliers next to threat. No rule turns them into dials yet: that step, and monsters that learn to answer the veteran's habits, are the feedback loop you described, still to come.

### The mana pass (your direction)

You asked that a caster run dry only in a long fight or against a build that drains it, never routinely, so that a player who sees one run out reads it as playing by the same rules (decision C20). The survey put every fielded body with a mana skill (778 at level 12) against a hero who stands in its reach and cannot die, for 90 s of nonstop casting:

| Kit | Bodies | Dry within 20 s | Within 40 s | Never in 90 s |
|---|---:|---:|---:|---:|
| Every damaging skill costs mana | 542 | 40 | 54 | 479 |
| A mana-free blow to fall back on | 236 | 37 | 39 | 193 |

The second group keeps its rhythm: a kit with a free blow does not stop fighting when its mana runs out, and the imp's claw rush once its fire runs out is what sets it apart. In the first group, the early dryers were not all spellcasters. Many are melee bodies whose ordinary swings cost mana and who stood idle between them, such as `hollow_vanguard` (a pool of 12, starved 39% of the fight), `ushabti_file` (10, starved 80%) and `lesser_brute` (20, starved 78%).

A starved body casts less, so its measured spend understates what it would spend with mana to spare. Each early dryer was measured again with a bottomless pool, and its pool sized to last about 45 s at that unconstrained rate, with 10% to spare and a second pass for the twelve that still fell short. Regen is untouched, so every tuned body still runs dry in a long fight. The 41 pools live in `src/data/monsterMana.ts` and are worn by enemy mints only, as the threat dials are, so a summon or a claimed beast keeps its def's pool (`balance/probe_manaeconomy.ts`). Against the same still hero, their median first run-dry moves from 17 s to past 45 s, with every one between 41 and 65 s and all dry within two minutes.

Nine kits are paced by mana alone. With mana to spare they would spend 2.5 to 5.6 times their regen, because their spells have little or no cooldown: `saint_crown`, `goetic_binder`, `regents_urn`, `reliquary_ark`, `wagon_gunner`, `crusade_culverin`, `breach_rimehusk`, `mirage_dancer` and `abyssal_render`. Raising their pools would turn a steady caster into a 45-second spam, so they keep their pacing until you decide. The number pass then read each tuned body without and with its pool: only `tundra_behemoth` passed its cap, and its dial moves from 0.85 to 0.8.

Of the bodies whose every blow costs mana, 479 never run dry at all, even in 90 s of nonstop casting; their spend is a median 48% of their regen, and 81 sit above 80% of it. Bringing them into a long fight's reach would have meant trimming their regen, and you chose to leave them as they are.

## Phase 7: stance and temperament (3 November 2026)

You said to start phase 7. A stance is how a body prefers to fight right now, one of three in a single vocabulary for every body (`STANCES` in `src/data/aiIntent.ts`): `keep` leans back and kites, `harry` stands upright and works mid range, `press` leans in and fights at arm's length.

**Who holds one.** A body whose kit keeps a distance and holds something that acts on the prey only inside it, while its feet follow its decisions: 179 fielded bodies (66 `direct`, 55 `approach`, 31 `hoverAllies` while no ally stands by, 19 `slideCast`, 8 `orbit`). Every other body holds none and fights exactly as with stances off (`balance/probe_stance.ts`). The stance takes over your kiter's choice: a body in `keep` kites, and one in `harry` or `press` stands and fights.

| Stance | Rests for a shot at | Walks in for a skill that works only inside its distance | Would rather use | Shows |
|---|---|---|---|---|
| keep | its full distance | no | far skills (×1.3; near ×0.5) | leans back, only while it kites |
| harry | 60% of it | yes | mid-range skills (×1.2) | upright |
| press | a fifth of it, so it shoots from close in | yes | near skills (×1.6; far ×0.35) | leans in |

**The roll.** On a fresh engagement the body rolls on its own die from its mix and holds the stance for the stance's own time (keep 6 to 12 s, harry 4 to 8, press 5 to 10) before it rolls again. A real event rolls it early, never sooner than 2 s after the last roll: losing 15% of its life, its legs winded, or its distance skill running dry.

**The mixes** (`STANCE_MIX`, by brain archetype; a brain's own `intent.stances` wins):

| Archetype | Keep | Harry | Press | Bodies |
|---|---:|---:|---:|---:|
| Every unlisted type (your kiter's choice) | 65% | 20% | 15% | 47 |
| caster, strafer | 75% | 15% | 10% | 40 |
| commander | 65% | 15% | 20% | 31 |
| flanker | 35% | 45% | 20% | 8 |
| juggernaut | 35% | 25% | 40% | 53 |

`oblivion_knight` carries the plan's own row: press 6, harry 3, keep 1, with a veteran temperament.

**Temperament** (`TEMPERAMENTS`): boldness, nerve and volatility, drawn once per body from its own die inside its row (`plain` unless authored). A bold body's roll tips toward the stances that close and a timid one's toward keeping away, and a volatile body strays further from its kind's habit. Nerve is drawn now and waits for the cornered curve, so that phase re-deals nothing. A bold body stands up to 8% larger and a timid one up to 6% smaller.

**What you see.** The stance's lean changes with the roll. When it changes, the body plants square to you for 0.22 to 0.38 s wearing its new posture and starts nothing new, so its first new hit comes at least 0.35 s after the change (1.0 s at the earliest in the probe). No prey, no posture. Dev → AI shows each body's stance, how long it holds, the shift beat and its temperament, and a second lever turns stances off for every body at once.

Three rules came out of the first runs, numbered on from phase 6's:

10. **A stance that keeps away shows only while the body kites.** A body in `keep` whose shot is dry or resting walks in on the ready ring all the same, and leaning back while it walked in would lie. The imp, dry within a second of most fights, walks in upright.
11. **A stance that closes never backs away to shoot.** Harrying, the knight walked out after every blow to curse from 60% of its distance, then back in for the next. It now shoots from where it stands and walks forward only when farther out than its distance.
12. **Only a skill that acts on the prey makes a distance choice.** A burst that touches only its own side, or a skill aimed at an ally, a minion or a corpse, works wherever the body stands. `deadwake_pale_shepherd`'s rallying howl gave it a stance whose press only walked it at the hero while its dead did the work. Five bodies hold no stance for this reason.

Two of the plan's rows changed on the evidence:

- **The archetype rows lean from your share instead of overriding it.** With the plan's rows (juggernauts and flankers closing nine fights in ten, casters keeping their distance in eight), bodies whose damage is ranged lost most of it: `vessel_thulvane` −46% against a still hero and −75% in duels, `river_naiad` −42% and −89%, `amalgam_bonelord` −56% against a still hero, and the flankers as a group −17% and −42%. An archetype names how a body moves, not what its kit is. Leaning from your share takes those to −17% and −22%, −18% and −61%, −11%, and −13% and −22%.
- **Swarm and pack brains keep your share.** The plan's swarm row was always press. The twelve swarm-type bodies with a choice all spit and claw like the imp, and pressing made the imp shoot point blank from the first second; its volleys and dry-out rush are the identity you named (decision C20). Swarming is the closer tokens' business (decision C19), not a stance.

Level 12, 25 s, twelve seeds per body, the 184 bodies phase 7 touches (179 with a stance, five that now hold none), against `main` before it:

| Reading | Before | After |
|---|---:|---:|
| Mean damage to the hero per s, hero standing still | 29.7 | 29.2 (−1%) |
| Mean damage to the hero per s, duel | 6.9 | 6.7 (−3%) |
| Hero deaths, standing still, of 2,208 | 1,546 | 1,539 |
| Hero deaths, duel, of 2,208 | 435 | 426 |
| Band changes per 10 s, standing still and duel | 1.3 and 2.6 | 1.2 and 2.6 |
| Distinct skills per fight, duel | 2.75 | 2.76 |
| Gap in time in reach between seeds, standing still | 7.7 points | 9.4 points |
| The same, duel | 7.9 points | 8.5 points |

| Archetype | Bodies | Damage, standing still | Damage, duel | Gap, standing still |
|---|---:|---:|---:|---|
| juggernaut | 53 | −2% | −3% | 10.9 → 11.9 |
| basic | 34 | −1% | +1% | 3.8 → 6.0 |
| commander | 31 | +2% | −1% | 7.2 → 9.4 |
| caster | 21 | 0% | −2% | 8.8 → 17.8 |
| strafer | 19 | −6% | −4% | 7.0 → 5.6 |
| swarm | 12 | −5% | +1% | 3.7 → 3.8 |
| flanker | 8 | −13% | −22% | 14.6 → 25.8 |

**The plan's measure of variety is met only in part.** It asked for the same body to fight at a visibly different range between seeds, a gap in time in reach of at least 15 points, against 0.2 at the time and about 3 with the ring fixed. With the ready ring and your kiter's choice, the gap already stood at 7.7 points. Stances take it to 9.4, and past 15 for casters (17.8) and flankers (25.8). Most kits cannot move much further. Phase 3's ready ring walks a body in whenever its distance skill rests or runs dry, which is most of the fight for many kits: strafers and swarms spend 92% to 98% of a fight against a still hero within reach either way. In a duel the hero closes in. Holding one stance for the whole fight moved the gap by less than half a point, so the holds are not the limit.

**No flip-flop.** No body passes the band bound against a still hero. The pilot rig in `balance/probe_intent.ts` read `oblivion_knight` at 3.0 band changes per 10 s with the layer off and 5.0 with it on, on one seed. Pinned against knockback, the knight changes band 0.5 times per 10 s off, on, and with stances off, so the count is a still hero knocked out of the near band by more `heavy_strike`s. The rig now reads the mean of four seeds: 4.0 off and 4.5 on, against a bound of 5.6.

**The number pass.** The same rule as before, read on `main` and then with stances, at six seeds per row, on 37 bodies: every body that rose more than 5% standing still or 15% in duels, and the five that lost their stance. None passes its cap, so no dial changes. `depthkin_brute` rises the most (0.32 to 0.55 of its cohort's median) and stays under the median. At two seeds per row, as the solver had read until now, `amanita_sovereign` read +65% and `the_unworn` +26%; at six, +4% and +3%. A stance is rolled per seed and holds across all six rows of that seed, so two seeds can read one lucky roll as a rise. The nightly farm read two seeds per body too; since 13 November 2026 it reads four (`bestiarySeeds`, decision C22).

**The falls left to the farm.** By your rule, falls are the farm's. The largest: `river_naiad` −18% standing still and −61% in duels, `vessel_vexira` −14% and −34%, `vampire_thrall` −28% in duels, `mire_hag` −25% standing still, `winter_king` −28% standing still (+14% in duels), `vessel_thulvane` −17% and −22%, `abyssal_vanguard` 3.8 to 1.2 per s in duels and `hatebound_hulk` 1.1 to 0. These are bodies whose damage is ranged and which now close part of the time. If one should keep its distance, an authored `intent.stances` row says so.

**What else moved.** Every fielded body at one seed, against `main`: 1,845 of 2,184 rows are byte-identical. The 188 bodies that differ are 170 of the 184 above and 18 others: fixed-band artillery and kits whose only shorter skill works wherever they stand, whose old kiter roll moved their die without moving their feet; summoners whose summons hold a stance; and `lash_maiden`, whose rule switches it into `direct`. With 200 engaged stance bodies, the AI tick costs about 57 µs per body on `main` and 63 µs with stances (three alternating runs). The stance code is 0.15% of the profile; the rest is bodies that close in and press more.

Not done: the plan's optional pick among encounter plans within 70% of the best, on the group's die.

What you can see: a kiter leans back while it kites and walks in upright when its shot is dry or resting. When its stance changes it plants and squares up for a beat, wearing the new posture, before it moves. A pressing caster leans in and shoots from close in. The knight presses most fights and harries the rest. Your hands-on read is this phase's last check.

## Phase 8: the chaos budget (14 November 2026)

You said to start phase 8 once the first four-seed night was in; it came in on 14 November. Now and then a body does what it normally would not: a legal skill from its own kit that its author's order or the floor would have cut, at its normal cost and wind-up. It pays for the surprise with a moment's recovery.

**The rows** (`CHAOS_BUDGETS` in `src/data/aiIntent.ts`), as the plan proposed them:

| Row | Tokens | One back every | Chance a decision may go off book | Floor off book | Live per victim |
|---|---:|---:|---:|---:|---:|
| none | 0 | | | | |
| steady | 1 | 16 s | 15% | 12% of the best | 1 |
| restless | 2 | 10 s | 20% | 8% | 2 |
| feral | 3 | 5 s | 35% | 2% | 3 |

**Who carries one.** Every intent body carries `steady` (`INTENT_CFG.chaos.default`, decision 3) unless its intent names a row: 717 of the 1,092 fielded bodies. A dim mind, one whose brain authors mindless feet (`move.pathing: 'none'`), carries `none`: `zombie`, `zombie_crawler` and `deadwake_gravewretch`. `oblivion_knight` earns `restless` at level 14 through a brain rule, the plan's own example row. A body starts full and regains tokens over time, faster with a volatile temperament.

**The decision.** When a body takes a fresh decision and its kit offers an option it would normally cut that a player could read coming, its die may let that one decision go off book. That needs a token in hand, a roll under the row's chance and room in its prey's ledger. Both cuts then relax: the floor drops to the row's own, and a skill its author ranked lower is offered too. In the plan's words, which is what ships (`INTENT_CFG.chaos.pick: 'join'`), the cut options join the normal ones and must win the weighted roll. Only if one does is a token spent and the prey's ledger claimed for 3 s.

Three rules, numbered on from phase 7's:

13. **Off book can cross the author's order, for that one cast.** The plan said the floor drops. A priority kit ranks every skill apart, so the floor alone never offered the knight anything, and its `restless` row would have done nothing. Off book also lifts the rank cut, and the hands honor the choice over the order for that one cast (`pickSkill`). An ordered kit is offered only its own order, since its hands press nothing else.
14. **Only a skill with a wind-up of at least 0.35 s goes off book.** A bar, a channel's spool-up or a ground footprint that warns that long (`windupOf`, `minBar`). Modes whose blow lands during the bar or on a held release (multitude, timed, charge, guard, overcharge, concentration) are never offered. The shortest off-book wind-up measured was 0.40 s.
15. **Surprise pays.** An off-book cast adds 0.2 to 0.3 s of recovery on the body's own die, planted with idle hands, on top of its own.

**The ceiling.** Content validation warns when a brain names a row above `steady` on a body that wears no stance tells (section 5, rule 9): more surprise must come with more to read. Only the knight names one, and it wears them. `balance/probe_chaos.ts` pins the rows, who carries one, the budget, the ledger, the wind-up, the recovery, the knight's level and the ceiling.

**What you see.** Nothing new to read: the same bars, footprints and wind-ups. The knight sometimes cleaves or strikes while its curse is ready, and a witch sometimes throws a frostbolt it would have held. Dev → AI shows each body's tokens and marks an off-book decision, and its levers turn the budget off, pick the default row, and switch what a roll picks.

Level 12, 25 s, four seeds, the 717 bodies that carry a budget, chaos off against steady (off is the code before this phase, by construction):

| Reading | Chaos off | Steady |
|---|---:|---:|
| Decisions off book, hero standing still | 0 | 50 of 28,651 (0.2%) |
| Decisions off book, duel | 0 | 46 of 29,375 (0.2%) |
| Bodies that went off book, standing still and duel | 0 | 33 and 34 |
| Mean damage to the hero per s, standing still | 22.61 | 22.62 |
| Mean damage to the hero per s, duel | 4.27 | 4.25 |
| Hero deaths, standing still and duel, of 2,868 each | 1,551 and 316 | 1,549 and 316 |
| Gap in time in reach between seeds, standing still and duel | 2.0 and 8.3 points | 2.0 and 8.3 |

Fights differ in 163 of 2,868 seed pairs standing still and 194 in duels, on 122 bodies. 70 of those never went off book: their die moved for a roll that did not fire.

**Far rarer than the budget.** The plan expected `steady` to cap off-book decisions at about 5%, at about one decision per 0.75 s think beat. Two things keep it far below that. A body takes a fresh decision only when its last is cast or lapses, every 1.7 to 3 s rather than every beat. And the cut options seldom win the roll they join, since they were cut for weighing little. The rows cannot raise it far. On the 122 bodies chaos touches, which are all that ever have an option to offer:

| Variant | Off book, standing still | Off book, duel | Damage per s, standing still and duel |
|---|---:|---:|---:|
| Chaos off | 0% | 0% | 30.54 and 10.37 |
| Steady, as shipped | 0.8% | 0.6% | 30.56 and 10.29 |
| Steady, the roll always allowed | 2.2% | 1.9% | 30.61 and 10.29 |
| Feral | 1.9% | 1.0% | 30.68 and 10.28 |
| No limits at all | 3.7% | 2.6% | 30.59 and 10.24 |
| Steady, a roll picks only cut options (`pick: 'cut'`) | 1.9% | 1.5% | 30.54 and 10.19 |

Off book stays readable and costs the hero nothing measurable in every variant.

**The number pass.** The same rule as before, at six seeds per row, chaos off and on, on the 15 bodies that rose more than 5% standing still or 15% in duels at four seeds. None passes its cap, so no dial changes. `hill_giant` rises the most (0.72 to 0.88 of its cohort's median) and stays under the median. Nine of the 15 read the same on the farm's threat rows with chaos off and on, and seven of the 15 never went off book at all in the four-seed runs: their rise was a moved die.

**Your call.** With the plan's words, `steady` surprises about once in 500 decisions across the bestiary, and only on bodies whose kit has a readable option to cut. With `pick: 'cut'`, every roll that goes off book picks a cut option: about twice the surprises, and the kits with the most to offer reach the plan's one per 16 s (`frost_witch` one every 13 s, `oblivion_knight` one every 15 s, both at level 12), with no measurable cost to the hero. That changes how the mechanism works, not a number, so it waits for your word. Dev → AI can switch it live, and its default row lets you feel `restless` or `feral` against `steady`. Your hands-on read is this phase's last check.

Recommendation only. No game code was changed. Everything here was read or measured on `main` at `cdcef35d` on 1 November 2026 (its game code matches `61ebe2af`, where the final runs were taken), through the real scenario runner (`src/sim/runner.ts`) with in-memory instrumentation kept outside the repo. Line numbers are for that commit. Two parallel changes landed during the work: `combustion_strike` lost its `keepDistance` and `hellhound` swapped `claw` for `scorching_bite`, and `orbitKernel` now keeps its outer edge inside the body's reach when it has no standoff (pinned by `balance/probe_kitreach.ts`). Where that matters it is called out.

Four terms used throughout:

- **Kernel**: the movement routine named by `move.style` (`orbit`, `direct`, and so on).
- **Ring**: the distance from its target that a kernel holds.
- **Intent** (proposed): the one skill a body has decided to use next.
- **Stance** (proposed): how this body prefers to fight this particular fight.

## The short version

A body decides where to stand from a static summary of its kit, or from a hard-coded number. It then decides what to do from wherever it is standing. The two decisions never meet. Whatever the ring can reach is the whole fight, and everything else in the kit is decoration. That is the lock-in you described.

**Recommendation: evolve, do not rewrite, in two steps.** First, make the ring listen only to skills that can fire right now. That is a few lines, adds no randomness, and does most of the unlocking. Then add one small decision layer on a slow clock: each body picks what it wants to do next from those skills, scored from their existing hints, and the ring follows that choice. `keepDistance` stays authored as a preference for that one skill. On top of that sit a per-fight stance, a small seeded chaos budget, and a cornered curve driven by real state with a visible tell.

Your instinct holds up, and it matches published practice closely. Treating hints as suggestions is the fix. The one correction I would add: a suggestion has to attach to a decision, otherwise it is just noise on a ring. So the order is decide first, then move.

The numbers behind that:

- **160 bodies with legs carry a melee skill they are held away from** by a `keepDistance` larger than its reach. That is every body that carries both.
- **The ring is the cause, not the kit.** Of the bodies on kernels that hold a ring, 99 of 117 never press melee at an idle hero. On kernels that do not, 10 of 36.
- **56 active bodies rest where none of their damaging skills reach.** 226 rest where at least one does not.
- **Of the 33 silent bodies:** 21 open defects, 6 designed prey, 4 measurement errors, 2 fixed today. Perception is not a cause.
- **An in-memory test of the smallest fix,** across the 160 in a duel: melee presses from 2.2 to 5.5 per 25 s, bodies that never press melee from 79 to 35, mean damage to the hero unchanged at 6.6-6.7 per s. Individual bodies do move a lot.

## 1. How the AI decides today

Every tick, for every body, `updateAI` (`src/engine/ai.ts:554`) walks a fixed ladder. Any rung can consume the tick.

1. **Hard gates.** Player seat, stasis, construct, ambush, emergence, burrow, passive scenery, driven, dormant, fuse, airborne (`ai.ts:557-639`).
2. **One tuning.** `resolveMachines` (`ai.ts:1245`) merges the base brain, cycle, HP ladder, script FSM, rules, impulses and per-body graft. An encounter order merges last (`ai.ts:664-666`). Rule conditions are boolean ANDs (`brain.ts:1503`). `chance` gates each firing (`ai.ts:1335`).
3. **Flight and reflex.** Flee disposition (`ai.ts:755`), morale (`ai.ts:760`, `1412`), telegraph dodge (`ai.ts:766`, `1578`).
4. **Reserves and the mender pass** (`ai.ts:771`, `2330`).
5. **Issued and standing orders** (`ai.ts:781-813`).
6. **Perception and target** (`ai.ts:816`, `1672`). The watch ladder gates fresh locks (`ai.ts:1873-1913`). Encounter orders and taunts can override (`ai.ts:817-846`). Leash follows (`ai.ts:891`).
7. **Idle ladder** when there is no target (`ai.ts:921-1104`).
8. **Squad gates.** Muster and engage tokens (`ai.ts:1187`, `1213`).
9. **Movement kernel** (`ai.ts:1226-1227`, `3232`; registry at `3816`). The kernel owns the move and cast interleave.

The two questions that shape a fight are answered separately inside step 9:

- **Where do I stand?** `standoff()` (`ai.ts:2790-2800`) takes the largest `keepDistance` across the whole kit. It does not ask whether that skill is ready, affordable, targetable or even damaging. If the kit has no `keepDistance`, it uses 80% of the shortest range. Some kernels add constants of their own: `hoverAllies` holds 340-520 px whatever the kit says (`ai.ts:3581-3584`), `holdRange` holds `max(keep, 380)` (`ai.ts:3482`), `slideCast` holds `keep` or else 240 (`ai.ts:3453`).
- **What do I do?** `pickSkill` (`ai.ts:2071`) filters the kit to what is usable from where the body already stands (`ai.ts:2145`), then takes the opener, combo, priority or rotation order, or a weighted roll.

Position is chosen without looking at skills. Skills are chosen from position.

### Hard rules and what is already scored

| Decision | How it works today | Kind | Where |
|---|---|---|---|
| Where to stand | Largest `keepDistance` in the kit, ready or not | Hard | `ai.ts:2790` |
| Commander position | Fixed 340-520 px | Hard, hard-coded | `ai.ts:3581` |
| Artillery position | `max(keepDistance, 380)` | Hard, hard-coded floor | `ai.ts:3482` |
| Orbit position | `ring` × 0.8 to 1.15, ring floored at 46; since today the outer edge stays inside reach when the kit has no standoff | Hard | `ai.ts:3392-3399` |
| Prey kernel `juke` | Always moves away | Hard | `ai.ts:2779`, `3742` |
| Skill eligibility | Cost, cooldown, in `ai.range`, bans, firing line, pacing gates | Hard | `ai.ts:2132-2149` |
| Legal target (`requiresStatus`, corpse) | Not checked by the picker. `useSkill` refuses later, and the refusal still burns the decision cadence | Hard, and late | `world.ts:34912-34930`, `ai.ts:2238-2248` |
| Opener, combo, priority, rotation | First in-range match wins | Hard order | `ai.ts:2152-2180` |
| Reserves, mender | Fire when the condition holds | Hard | `ai.ts:2330-2375` |
| Morale break | Consumes the tick | Hard | `ai.ts:1412-1536` |
| Rules, phases, script | Boolean conditions switch a tuning layer | Hard, authored | `ai.ts:1245-1378` |
| Which in-range skill | `ai.weight` × range band or near discount × stun temper, weighted roll | Scored, fixed weights | `ai.ts:2208-2230` |
| Which target | Preference score × kind bias × stickiness | Scored | `ai.ts:1641`, `1842-1859` |
| Which group plan | `base + Σ fact × weight` over gated plans, no randomness | Scored, deterministic | `encounterCombat.ts:87-91`, `168-173` |
| Suspicion | Rising meter with fixed rungs | Scored meter | `ai.ts:1873-1913` |

The code already leans your way in small places. `ai.minRange` discounts a skill and never refuses it (`skills.ts:4645-4653`). `SkillPolicy.bands` is a weight curve by distance (`brain.ts:742-754`). Muster gives up after its patience runs out (`ai.ts:1182-1186`). These are the right idea, confined to choosing among skills already in reach. None of them can move the body.

## 2. What goes wrong

### 2.1 The headline: melee skills held out of reach by keepDistance

Iterating `MONSTERS` and comparing each kit's largest `keepDistance` with its melee skills' `delivery.range`:

- **160 bodies with legs carry a melee skill they are held away from.** 166 counting rooted and passive ones. It was 161 until `hellhound` left the list today. That is 27% of the 584 active bodies with legs that carry melee at all.
- **It is not an outlier. It is every body that carries both.** 423 active bodies with legs have a `keepDistance` and 584 have melee. The overlap is exactly 160, and in all of them the `keepDistance` is larger than every melee reach in the kit. The median ring is 240 px against a median reach of 50 px.
- **25 of those rings come from a skill that deals no damage**: curses, summons, clutches, pylons. 93 of the 160 have no rule, phase, script, impulse or cycle at all. For the other 67, a machine can swap to a kernel that ignores the ring, but nothing can change the ring itself, because `standoff()` reads only the kit.

Examples: `imp` keeps 270 (`fireball`) with a 42 reach `claw`. `oblivion_knight` keeps 280 (`despair`) with a 55 reach `cleave`. `pit_lord` keeps 280 (`infernal_rift`) with a 50 reach strike. `abyssal_crawler` keeps 380 (`umbral_lance`) with a 42 reach `claw`.

The count alone overstates it, because not every kernel reads the ring, and that split is the proof. I ran all 160 through the real runner at level 12, 25 s, two seeds: once against an idle starter warrior, once against a geared warrior who walks up and fights.

| Kernel | Ring | Bodies | Never press melee, idle hero | Never press melee, duel | Median time in reach, idle | Melee presses per 25 s, idle |
|---|---|---:|---:|---:|---:|---:|
| `direct` | `keep × closeFrac` | 52 | 42 | 26 | 0% | 0.5 |
| `approach` | `keep × 0.65` to `keep` | 30 | 27 | 16 | 0% | 0.2 |
| `hoverAllies` | 340-520 | 20 | 17 | 12 | 0% | 0.2 |
| `orbit` | `ring` band | 7 | 7 | 6 | 0% | 0.0 |
| `holdRange`, `slideCast`, `charge` | Various | 8 | 6 | 6 | 0-4% | 0-1.6 |
| `hitAndRun` | **None** | 19 | 7 | 5 | 11% | 3.6 |
| `backstab` | **None** | 6 | 2 | 2 | 22% | 2.8 |
| `lurk` | **None** | 6 | 1 | 1 | 90% | 9.0 |
| `skitter` | **None** | 5 | 0 | 0 | 83% | 12.5 |

Kernels that hold a ring: 99 of 117 bodies never press melee at an idle hero. Kernels that do not: 10 of 36. These are the same kind of kits with the same `keepDistance` values. The ring is the cause, not the kit. (The other 7 use `interpose`, `weave`, `juke`, or `mirage_dancer`'s `style: 'dart'`, which is not a registered kernel and silently runs `approach`, `monsters.ts:15043`.)

Even with a melee hero walking straight at them, 79 of the 160 never press melee in 25 s, and the median body spends 1.7% of the fight in reach. Across the 160 that is about 2 melee presses per 25 s against 9.5 of everything else. `oblivion_knight` presses melee zero times on four seeds out of four. The melee skills are mostly decorative, as you said.

### 2.2 The ring never checks that the body can fire from it

The 160 are one symptom. I audited every active body with legs: from the band its kernel rests in, which of its own damaging skills reach the target?

| Kernel | Where its ring comes from | Bodies using it | No damaging skill reaches | At least one does not |
|---|---|---:|---:|---:|
| `hoverAllies` | Constant 340-520 | 73 | 32 | 60 |
| `holdRange` | `max(keep, 380)` | 44 | 12 | 22 |
| `slideCast` | `keep`, else 240 | 80 | 7 | 25 |
| `direct` | `keep × closeFrac` | 273 | 4 | 67 |
| `approach` | `keep × 0.65` to `keep` | 198 | 0 | 44 |
| `orbit` | `ring × 0.8` to `× 1.15` | 53 | 1 | 8 |
| `charge` | Closes by charging | 19 | 0 | 0 |
| **All ring kernels** | | **740 of 971** | **56** | **226** |

Of the 56 that cannot fire any damaging skill from where they rest, 35 have no rule, phase, script, impulse or cycle that could change it. "Reaches" here means the skill's `ai.range` covers the near edge of the band, which is generous. A hero who walks into range still gets hit, so this does not mean the body never fires. It means the body will not go where it can.

### 2.3 The 33 by root cause, on the current engine

The farm's list predates today's orbit fix, so I re-ran every body at `61ebe2af` on four rigs at level 12, 25 s, two seeds: an unkillable hero standing still 240 px away with the body's back to him (the `probe_kitreach` rig), the same with the body facing him, the farm's idle rig at 70 px, and a duel where a geared warrior walks up and fights back.

| Root cause | Count | Bodies | Evidence |
|---|---:|---|---|
| **Commander ring.** `hoverAllies` holds 340-520 px whether or not any ally exists. The only damage in the kit has 48-65 reach. | 10 | amalgam_gravewarden, caravan_master, crimp_captain, crusade_standard_bearer, gnoll_matron, grind_bannerman, moon_howler, the_magpie_king, warband_chieftain, winter_herald | All rest at 340-342 px on the idle rigs, buffing nobody. gnoll_matron spends about 40% of the fight casting `greater_mending` with no ally present. In a duel they press melee 0-3 times, and only when the warrior catches them during a winded pause. |
| **Prey kernel on a hunter.** `juke` only ever runs away (`ai.ts:2779`). The harassment pass fixed this for crows and gnashers. These were not in that batch. | 7 | canopic_jackal, crimson_bat, formic_forager, gourdling, magpie_snatch, river_otter, snuffwick | They lock on, then run. Left alone they sit at a median 770-980 px, against the arena wall. In a duel they press melee 0-2 times. Three are authored `swarm` and one, `river_otter`, `flanker`: the brain says hunt and the kernel says flee. |
| **keepDistance from a skill that does not hit.** | 3 | oblivion_knight, formic_tender, wickling | Knight orbits at about 229 px on `despair`, zero melee, even in a duel. Tender rests on a reserve-only `stridulate` and presses nothing. Wickling stops 158 px out on `kindle_wick`. |
| **Artillery parked past its own reach.** | 1 | shard_gardener | Rests at 380-382 px with a 380 range skill. One cast in 25 s on every idle rig. |
| **Prey by design.** Skittish bubble wider than reach, or `flee` with no goal. | 6 | cloud_grazer, kettle_minnow, sand_scorpion, star_grazer, white_hart, wool_aphid | Not bugs. They are where the cornered curve belongs. The two grazers do not even run: `flee` returns before perception (`ai.ts:755`), `fleeStep` has no goal (`ai.ts:2825`), and they stand frozen. |
| **Measurement: a blast the instrument cannot see.** | 2 | grave_shambler, stygian_doll | They always hit. grave_shambler killed the L25 hero and took the L5 hero to 9.5% life with `dps_in` 0. |
| **Measurement: nothing in the kit swings.** | 2 | hollow_butler, ledger_arbiter | Curse-only kits that `analyze.ts:474` counts as damage because of `baseDamage`. They cast 5-6 curses per 25 s. |
| **Fixed today.** | 2 | charnel_ghoul, hellhound | The orbit fix in `61ebe2af`, plus the hound's new bite. First hit at 1.8-4.0 s. The data change alone was not enough: before the fix the hound still orbited at 51-53 px against a 48 reach, landed nothing, and refused 92 presses in 25 s. |

So 21 are open AI defects, 6 are designed prey, 4 are measurement errors and 2 are fixed.

**Perception is not a separate cause.** 27 of the 33 lock on within 1 s even when they start with the hero behind them, and turning them to face him changes nothing except how soon `kettle_minnow` notices. A closest approach of 240 px with no casts has two explanations. `juke` bodies lock on and immediately run. The two grazers never reach perception. Genuinely short senses exist only on prey, by authoring: `white_hart` sees 78 px, `wool_aphid` 156, `sand_scorpion` 208, `kettle_minnow` 255.

### 2.4 The 25 that only fight once fought

| Cause | Count | Bodies |
|---|---:|---|
| Commander ring | 8 | beastlord_khan, chitin_stridulant, gnoll_howler, goblin_chief, hobgoblin_taskmaster, odyssey_beastkin, odyssey_gnoll, odyssey_goblin |
| Artillery parked past reach | 4 | banshee, gloam, transfusion_acolyte, weeping_orb |
| keepDistance ring | 3 | brood_matron, lode_thrall, spinney_matron |
| Posture with no route to its blow | 2 | shield_anima (`turtle` never advances), verdigris_wright (`slideCast` on a `mend` with no ally, melee at 55) |
| Bombers, same instrument blind spot | 2 | bombard_demon, tithe_gourd |
| Dormant until struck, correct by design | 6 | rimeclad_elder, sap_sleeper, urnfather, vault_sphinx, village_warden, wayfarer_hunter |

The commander row matters most. In a 25 s duel at level 12 against a warrior who walks at them, `beastlord_khan` swings 0 times and `odyssey_goblin` once. Those are campaign leaders.

### 2.5 Stranded skills and dead presses

`pickSkill` does not check a skill's target gate. `useSkill` refuses it, and `useOn` still sets `aiCooldown` and `aiLastSkill` (`ai.ts:2238-2248`), so every refusal costs a decision. Seven bodies carry a hinted skill gated on a target status or a corpse. Refused presses are per 25 s across the four rigs.

| Body | Skill | Needs | Can its own kit supply it? | Refused presses |
|---|---|---|---|---:|
| `tundra_behemoth` | `flash_freeze` | Chill or frozen | **No.** Stranded unless an ally chills the target. It also sets the ring: `keepDistance: 240` holds it at 217-240 px while `ground_slam` reaches 80, so from 240 px it never hits at all | 50-90 |
| `emerald_mantis` | `eviscerate` | Bleed | **No.** Stranded unless an ally bleeds the target. Once engaged it presses this up to twice as often as it claws | 0-31 |
| `pit_mauler` | `verdict` | Sundered | Only through `sunder_maul`'s poise pressure, and only on a hero with a poise bar. It fired twice on the idle starter warrior | 1-34 |
| `hellhound` | `combustion_strike` | Burn | **Yes,** since today: `scorching_bite` at 60% | 1-23 |
| `gravemaw_hound`, `charnel_ghoul` | `gorge_carrion` | A corpse nearby | Only when one exists | 10-47 |
| `grave_shaman` | `shamans_call` | A corpse nearby | Only when one exists. It is also weight 4 and sets a 260 ring | 7-45 |

`gravemaw_hound` is the clearest cost: against an idle hero with no corpse anywhere, it presses `gorge_carrion` about twice as often as it bites.

Two rules follow for any check of this kind, and today's `probe_kitreach` misses both. A skill's own payload cannot unlock it: `flash_freeze` applies `frozen` when it lands, which is why the probe's stranded check passes it while the behemoth stands stranded at 240 px. And the chance must be the tuned one: `AILMENT_TUNING` (`status.ts:325`) scales a burn under 60% to 35% of its authored value and a bleed under 70% to zero, so an authored 50% bleed on a kit supplies nothing.

### 2.6 Related defects the code implies

- **Rushes do not rush.** `direct` stops at `keep × closeFrac` (`ai.ts:3374-3375`), so a rule or impulse that switches to `direct` cannot close past the ring. `abyssal_seer` is the comment-labelled showcase for a caster that strafes and then charges. Over 40 s it took 6 lunge windows and never came closer than 270 px.
- **The word `direct` is not true for 52 bodies.** Its doc calls it relentless closing. Those 52 stop at their `keepDistance`.
- **Heals and buffs fire at nobody.** `pickSkill` has no notion of need, so a matron with no allies casts `greater_mending` nine times in 25 s.
- **AI rolls share the global stream.** Every `rand` moves `Math.random`, which is why `tactical-ai.md:98-102` and `tactic-progression.md:144-149` record rigs breaking because an AI draw reseated a lair. This has to change before adding any randomness.

### 2.7 Predictability

Fights with the same body look nearly identical. Geared warrior duel, level 12, four seeds, presses per 25 s:

| Body | Skill presses on seeds 11 / 22 / 33 / 44 | Share of fight within 90 px |
|---|---|---|
| `oblivion_knight` | `despair` 6 / 6 / 6 / 6; melee 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| `abyssal_crawler` | `umbral_lance` 15 / 15 / 16 / 17; `claw` 0 / 0 / 0 / 0 | 0.51 / 0.53 / 0.48 / 0.48 |
| `hex_weaver` | `despair` 6 / 7 / 6 / 6; `spark` 16 / 15 / 15 / 14 | 0.45 / 0.46 / 0.48 / 0.42 |
| `imp` | `fireball` 11 / 13 / 14 / 12; `claw` 4 / 0 / 1 / 1 | 0.46 / 0.51 / 0.44 / 0.49 |
| `goblin_shaman` | `spark` 14 / 15 / 20 / 18; `rallying_howl` 4 / 3 / 4 / 2 | 0.31 / 0.30 / 0.33 / 0.37 |

The near-range share here mostly reflects the warrior chasing them, not a choice the body made.

Across the 33, the resting distance is within 2 px between seeds for 23 bodies. Per-spawn personality exists on 2 of 1,093 active bodies. 226 have rules, 50 have an HP ladder, 33 have a script. Variety today is whatever someone hand-authored, and for most bodies nobody has.

`encounterCombat` is deliberately deterministic: the same situation always picks the same plan (`encounterCombat.ts:168-173`). That is good for learning and a known source of repetition.

## 3. What a top professional would do

### The options, compared

| Approach | What it is | Fit for a data-driven, deterministic, many-bodies ARPG | Verdict |
|---|---|---|---|
| **Dual utility** ([Dill, Game AI Pro 2](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter03_Dual-Utility_Reasoning.pdf)) | Each option has a rank and a weight. Keep only the top rank, cut options far below the best weight, then weighted random among the rest. Shipped for the animals and guests of Zoo Tycoon 2. | Excellent. Our picker is already weighted random over `ai.weight`. Ranks map directly onto opener, combo and priority. It is a small loop. It is deterministic with a seeded die. Dill's warning describes our `ai.weight` exactly: "It is not enough to assign fixed weights to the options a priori." | **Adopt as the core.** |
| **Infinite Axis Utility** ([gameai.com](https://gameai.com/iaus.php), [Curvature](https://github.com/apoch/curvature), [overview](https://en.wikipedia.org/wiki/Utility_system)) | Every decision scored from considerations through response curves, fully data-driven. Presented with ArenaNet at GDC 2015 and used for Guild Wars 2 expansions. I could not read the talk itself, which is behind GDC Vault. | Right shape, wrong breadth. Hand-authoring curves across 1,093 active bodies is a tuning sink. | **Borrow the idea of considerations. Derive defaults from existing skill data. Author only exceptions.** |
| **Behaviour trees** ([Isla, Halo 2](https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai)) | Prioritised lists with binary relevance, plus impulses and event-inserted behaviours. | Our rules, phases, script and kernels already cover this ground. Fixed priority is the predictability you want to loosen, and a conversion would discard tuned fights. Isla's caution is worth keeping: he found tuned float scores manageable for a few choices and close to impossible for many. That is why the option count here stays small. | **No rewrite. Keep his small-option discipline.** |
| **GOAP** ([Orkin, F.E.A.R.](https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf)) | A* search over world state, with goals separated from actions. | The separation is exactly what we lack. His own example is a melee attack that first needs moving close. The search buys nothing when 82% of kits have two hinted skills or fewer and plans are one step long. | **Take the decoupling. Skip the planner.** |
| **HTN** ([Humphreys, Game AI Pro](http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter12_Exploring_HTN_Planners_through_Example.pdf)) | Authored task decomposition, with strong designer control. | Good for bosses, but `script`, `combos` and encounter tactics already fill that role. | **Not now.** |
| **Attack tokens** ([Doom 2016, Game Developer](https://www.gamedeveloper.com/design/cyber-demons-the-ai-of-doom-2016-), [80.lv](https://80.lv/articles/cyber-demons-the-ai-of-doom), [GDC listing](https://gdcvault.com/play/1024940/Embracing-Push-Forward-Combat-in)) | An attack needs a token from a limited pool per attack type. Difficulty sets the counts. A better-placed demon can take one. | Directly needed. When ranged bodies start closing, melee pressure on one hero jumps. The engine has the parts in `requestEngage`, `claimRingSlot` and `claimBurst`. | **Adopt, by extending those.** |
| **Context steering** ([Fray](https://andrewfray.wordpress.com/2013/03/26/context-behaviours-know-how-to-share/), [Game AI Pro 2](http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter18_Context_Steering_Behavior-Driven_Steering_at_the_Macro_Scale.pdf)) | Behaviours write interest and danger into direction slots, then the body picks. Fixes steering deadlocks, and costs more than plain steering. | Replaces working kernels with a per-tick map per body to solve a problem we do not have. | **No. Borrow the danger sample for cornered detection on the slow clock.** |
| **FromSoftware move selection** ([NEGA.TV](https://nega.tv/posts/low-tech-ai-of-elden-ring.html), [Souls Modding](http://soulsmodding.wikidot.com/elden-ring-ai-goals-params)) | From community reverse engineering, not an official source: a top goal sets action weights mainly from distance, cooldowns zero them, HP and rolls shift them, a weighted pick chooses, and a sub-goal approaches to that attack's success distance. Interrupts replace the queue. | Almost exactly the loop proposed here. Cheap and low-tech by design. | **Adopt the loop shape.** |
| **Monster Hunter states** ([Fujioka, Siliconera 2015](https://www.siliconera.com/?p=461043)) | Cues a monster's next behaviour through expression and state: alarmed, enraged, exhausted. | Matches SHOW, DON'T TELL and the tell fabric. | **Adopt as the model for stance and cornered tells.** |
| **Readability practice** ([Kubodera](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs)) | Fair difficulty rests on telegraphs and a consistent visual language. Let players chunk patterns, then change them. | The constraint on all of the above. | **Adopt as section 5's rules.** |
| **Hades** | I found no first-party talk or interview on its enemy telegraphs, only [reviews](https://gamingtrend.com/reviews/one-does-not-simply-walk-out-of-hades-hades-review/). | No usable design evidence. | **Not cited as a model.** |
| **Desperation as selection temperature** ([The Sims 3, summary](https://en.wikipedia.org/wiki/Utility_system), [Evans, GDC](https://gdcvault.com/play/1012294/Modeling-Individual-Personalities-in-The)) | Boltzmann selection whose temperature rises when a Sim is doing badly, so lower-utility actions become likelier. I read the summary, not the talk. | This is your cornered animal in one line of maths. It widens the choice among real options without inventing new verbs. | **Adopt.** |
| **Individual personality** ([Rain World community wiki](https://rainworld.miraheze.org/wiki/Behavior)) | Traits such as aggression, bravery and nervousness shape both behaviour and appearance. | Small and cheap. Personality that shows is readable. | **Adopt in small form.** |

### The recommendation

Land the smallest fix first: **the ring listens only to skills that can fire now**, with Doom-style tokens for bodies walking in to melee. Then build **dual utility at the level of intent**, on the shape of the FromSoftware loop: pick the action first, then walk to where it works. Considerations are derived from the skill data you already have. Add a selection temperature for desperation and Monster Hunter-style state tells.

**Evolve, do not rewrite.** The defect sits at one seam, between `standoff()` and `pickSkill()`. Behind that seam are 20 kernels, 226 rule sets, 33 scripts, six encounter plans and a large probe suite that encode fights which already work. The change is two functions, one new tuning axis and a few data tables.

### What an in-memory prototype says

I tested the core idea before recommending it, through the real runner, with nothing in the repo changed. Neither variant has tokens, stance, chaos or a number pass. The **ready ring** makes the ring listen only to skills that can fire now. The **intent ring** adds a scored pick on a 0.6-1.2 s clock, and lets commanders and artillery walk to the skill they chose.

| 160 bodies, level 12, 25 s, two seeds | Today | Ready ring | Intent ring |
|---|---:|---:|---:|
| **Duel, a melee hero walks up and fights** | | | |
| Never press melee | 79 | 35 | 35 |
| Melee presses per 25 s | 2.2 | 5.5 | 6.0 |
| Other presses per 25 s | 9.5 | 9.0 | 9.3 |
| Median time in reach | 1.7% | 35% | 40% |
| Median time to first melee, of bodies that press it | 7.0 s | 3.1 s | 3.4 s |
| Distinct skills used per fight | 1.83 | 2.15 | 2.16 |
| Mean damage to the hero per s | 6.7 | 6.6 | 7.3 |
| Hero deaths, of 320 episodes | 51 | 45 | 56 |
| Top tenth of bodies, damage against today | | × 2.8 | × 3.6 |
| **Idle hero** | | | |
| Never press melee | 115 | 41 | 42 |
| Median damage to the hero per s | 14.4 | 19.1 | 18.8 |
| Hero deaths, of 320 episodes | 175 | 218 | 235 |

What this says:

- **The smallest patch does most of the unlocking.** A few lines, no randomness, no new data. It should land first whatever else you decide. It does nothing for commanders: 12 of the 20 in this list still never press melee, against 4 of 20 once they may walk in. That part is phase 2.
- **Bodies add melee. They do not lose their ranged game.** Other presses stay about the same.
- **Average threat barely moves in a one-on-one fight,** and rises by about a third against a hero who does nothing.
- **Individuals move a lot,** and that is the real risk. The stock tool shows it: `npm run sim -- whatif --knob 'skills.despair.ai.keepDistance=0' --scenarios threat:starter_warrior_l12:oblivion_knight:12 --seeds 6` takes the knight's `dps_in` from 0 to 14.9 and the idle hero's life floor from 100% to 12%.
- **Neither variant makes one fight differ from the next.** Two seeds of one body differ by a median 0.2% of the fight in reach today, and only about 3-4% with either variant. Unlocking gives a richer fight, not a different fight each time. That is what stance is for. Intent adds little melee over the ready ring. What it adds is commitment, need, setup and the hook for chaos and cornered.

One body at a time hides group pressure, so I also ran the ready ring on five packs, two geared heroes, three seeds, level 12:

| Pack | Hero | Today: damage per s, life floor, deaths, seconds | Ready ring |
|---|---|---|---|
| 6 `imp` | Warrior | 9.5, 62%, 0 of 3, 22 s | 22.3, 26%, 0 of 3, 13 s |
| 6 `imp` | Magician | 18.9, 15%, 1 of 3, 11 s | 31.4, 21%, 2 of 3, 8 s |
| 6 `abyssal_crawler` | Warrior | 129, 31%, 2 of 3, 8 s | 75, 1%, 3 of 3, 5 s |
| 3 `oblivion_knight` | Warrior | 0, 100%, 0 of 3, 40 s with no contact | 1.1, 94%, 0 of 3, 21 s |
| 8 mixed abyssal | Warrior | 27, 30%, 2 of 3, 14 s | 7.5, 60%, 1 of 3, 20 s |

The direction is mixed. Some packs get sharper, some easier because bodies stop bursting from range and walk onto a warrior's blade, and stalemates become fights. Up to six crawlers stood in melee range at once, which is why tokens land with the ready ring and not later. Separately, four `abyssal_wretch` kill a geared level 12 warrior in about 4 s while `dps_in` reads 6 and the life floor reads 99%. That is a second blind spot in the instrument, and phase 0 should explain it.

### What I would not do

- Add a per-tick "chance to ignore the rule". It reads as jitter, and a chance rolled every frame is certainty.
- Delete or re-author `keepDistance` values. They are good data about what each skill prefers.
- Score every body on every frame.
- Add a planner, machine learning or a universal intelligence stat. `tactic-progression.md` already rejects the stat, correctly.
- Shorten any wind-up or add an instant off-book attack.
- Touch boss scripts in the first pass, or the lite tier at all.
- Add any caption. The 184 `announce:` strings still in monster brains are a separate cleanup, and the new rows add none.
- Let chaos read the player's inputs or build.

## 4. The proposed model in this codebase's terms

### Three clocks

| Clock | Decides | Rate | State |
|---|---|---|---|
| **Stance** | Which distance this body prefers this fight | Fresh engagement, plus real events | `aiStance` |
| **Intent** | Which skill next | 0.55-0.95 s, staggered, plus events | `aiIntent` |
| **Kernel** | How the feet move | Every tick, unchanged | Existing |

### What stays hard and what becomes scored

Hard means truly impossible, or a contract with another system. Everything else is a suggestion.

| Hint or gate | Today | Proposed |
|---|---|---|
| Cooldown, cost, gates, silence, seal, bans, summon cap, device use | Hard | **Hard.** The truth gate. A skill that fails it does not exist for this decision and cannot steer the body. |
| `targeting.requiresStatus`, `requiresMonsterTags`, corpse, ally | Refused late | **Hard, and early.** Same truth gate. Needs a side-effect-free check, because `resolveTargeting` can kill minions to make corpses (`world.ts:30449`). |
| Target lacks the required status, but another kit skill applies it | Nothing | **Scored.** The enabling skill gets a setup lift. One-step planning with no planner. |
| `ai.range` | Hard filter on the kit | **Hard at the press, scored at the decision.** You cannot swing at 200 px, but you can want to. Out of reach becomes a travel cost in seconds. |
| `ai.keepDistance` | Hard ring from the whole kit | **Preference.** Read only for the intent, scaled by stance and cornered. Never parks a body past that skill's range. |
| `ai.weight` | Fixed | **Base of the score.** |
| `ai.minRange`, `nearWeight`, `bands` | Soft | **Unchanged.** They fold into the same score. |
| `opener`, `combos`, `priority`, `rotation` | Hard, in-range only | **Ranks over ready skills.** The knight's order finally means what it says. |
| `reserve`, mender pass | Hard | **Unchanged.** |
| Heal or buff with no use | Fires | **Scored to zero.** A consideration for need: a wounded ally, the buff not already worn. |
| `hoverAllies` numbers | Hard-coded | **Data** on `MoveSpec`, and only while allies are present. |
| `morale` break, skittish | Hard | **Still triggers flight.** A flight that fails feeds the cornered curve, which can override it. |
| `juke` | Always away | **Unchanged for prey.** Seven data rows move to a closing kernel. |
| Leash, tether, post, commands, taunt, anchor | Hard | **Unchanged.** These are contracts. |
| `castArc`, `reaction`, `recovery`, `slack`, `strike` budget | Hard pacing | **Unchanged.** This is the fairness. |

### The decision

On each think beat, for a body with a target and no order controlling it:

1. **Truth gate.** Keep skills where `skillCanFire(actor, inst, target)` holds. Build it from `pressUsable` (`world.ts:30873`) plus the side-effect-free targeting read. Range is deliberately not part of it.
2. **Score each option:** `ai.weight × reach × comfort × need × setup × repeat × stanceBand`.
   - `reach`: seconds to walk into range at this body's speed, `1 / (1 + seconds / halfCost)`. If the target stands on a floor this body cannot walk (the check in `severedBandGoal`, `ai.ts:3216`), walking options score near zero.
   - `comfort`: the existing `bands` or `minRange` read.
   - `need`: damage is 1. Curses and buffs are discounted until the state calls for them.
   - `setup`: lift if this skill applies what a ready payoff in the kit requires.
   - `repeat`: discount for the skill just used. Cooldowns already zero the rest.
   - `stanceBand`: the stance's multiplier for the skill's near, mid or far band.
3. **Rank** from the existing authored order. Opener is highest, then a live combo, then `priority` order. Default is 0.
4. **Select** using Dill's four steps. Drop zero weights, keep the top rank, cut anything under `floor × best`, then weighted roll on the body's own die. The current intent gets an inertia multiplier, the same idea as `TargetSpec.stickiness`.

The intent stands until it is cast, can no longer fire, or its bounded `maxSec` passes, which also breaks a blocked approach, or until a real event: a blow from a new assailant, a stance change, or crossing the cornered line. It is never re-decided every tick.

**Then the feet follow.** The kernel's `standoff()` read returns the intent's ring. For a ranged intent, that is `keepDistance × stance.keepMul × (1 - cornered)`, clamped so the body can never rest beyond 90% of that skill's range. For a melee intent it is 80% of reach. If nothing can fire, the ring comes from whichever skill comes off cooldown soonest, so the body goes where its next move wants it. An authored `spec.ring` or `spec.hold` still wins. `pickSkill` narrows to the intent plus instants while an intent stands, as `slideCast` already holsters spells during a slide (`ai.ts:3439-3462`). The ready ring from phase 3 is this same read with no pick: the largest `keepDistance` among skills that can fire now.

Non-kernel readers keep the static read: the reposition default (`ai.ts:3263`), the crossfire ally filter (`ai.ts:3336`) and the siege ranged test (`ai.ts:3008`). Encounter geometry stays exactly as pinned.

**Worked example, `oblivion_knight`.** Today: curse, then orbit at about 229 px doing nothing for 3.4 s, forever. Proposed: `despair` is first in its priority order and is in range, so it casts at once, wherever the knight stands. Next think, `despair` is on cooldown, so `heavy_strike` becomes the intent and the ring collapses to reach. It walks in and swings, then cleaves, and when `despair` returns it curses you at arm's length. No new data. Its own definition says it strafes off a telegraph to keep its blade range (`monsters.ts:5597-5600`). Now it has one.

**Worked example, `imp`.** `fireball` usually wins while mana lasts, because `claw` is about a second of walking away, so it volleys from range. When mana runs dry, `fireball` fails the truth gate, `claw` is the only option, and the imp rushes. When mana returns it fires point blank or backs off, depending on stance. The rhythm comes from real resources, and a player can see it coming.

### Stance: the variety you asked for

You said a body with ranged and melee attacks should not be locked into one range in every encounter. Stance is that lever. It is rolled on a fresh engagement and persists, so a player can read it. A body that flip-flops every half second cannot be read. A body that is rushing you this fight can.

Rolled from a mix per archetype or per monster, biased by temperament. Re-rolled only on real events: mana dry, hit hard, an ally dying, being winded, cornered releasing. Vocabulary is global like the watch rungs, so a player learns it once.

### Temperament: personality per body and per kind

A small stable vector per body, drawn once from the body's own die within a band set by a named row: bold, nerve, volatile. It biases the stance roll, the cornered threshold and the chaos regen. It wears a small tell, so a bold body stands visibly different. `brainVariants` (`world.ts:30112`) stays as the tool for genuinely different minds. Only 2 bodies use it today, and it costs an authored brain per variant. Temperament gives every body a little, for free.

### Chaos budget: bounded, seeded, spent on real options

Chaos is a spendable token, not a probability on every decision. Most think beats use the normal floor. When a roll says this decision may go off book, and the body has a token, and its target's ledger has room, the floor drops for that one decision. A normally cut option can now win. The token is spent only if a cut option actually won.

Off book can only mean a legal skill from its own kit, at its normal cost and wind-up, plus a small extra recovery. The ledger lives on the prey and has the same shape as `aiBurstClaims` (`ai.ts:2044-2062`), so a pack cannot all surprise you at once. At think beats of about 0.75 s and one token per 16 s, the `steady` row caps off-book decisions at about 5%.

### Cornered: an animal backed into a corner

`aiCornered` is a 0..1 scalar stamped on the think clock from real state, with a slew so it rises and falls visibly:

- **Life lost**, read from the sheet.
- **Foe near**, the nearest hostile against a radius.
- **Boxed in**, the share of 8 compass samples at flight distance with no way out, from `pathField.isWalkable` and `fallHazardAt` (`ai.ts:2522`, `2654`). This is the danger-map idea at decision rate. Only sampled when a foe is near.
- **Failed flight**, seconds of wanted retreat that produced no movement. `retreatMove` already reports refusal (`ai.ts:2717-2748`) and `rout()` ignores it today (`ai.ts:1437-1461`). `runKernel` already measures real displacement (`ai.ts:3272-3285`).
- **Outnumbered and nerve**, the existing `aiNerve` stamp (`ai.ts:1467`).

Effects are read from a data row as the value rises: `keepDistance` fades to nothing, the floor drops so worse options become possible (the Sims 3 temperature), stance forces `press`, decisions come faster, chaos regen rises, and above the enter line a routing body stops routing and fights. No damage multiplier by default.

It releases. Step back and give it an exit, and the value falls and the posture relaxes. That is the counterplay. After a bounded time at full pitch it burns out into a visible winded stop, which is the punish window.

#### Prey: running is the whole plan

Prey answers the same facts differently, by the owner's ruling (section 7, decision 4). Being cornered changes where it runs, not what it wants, and it spends nothing on fighting back: no intent layer, no stance, no chaos budget, no think beat on skills.

- **It works to never be cornered.** Today's `juke` runs straight away from the target and hooks, which ends with the body pinned against a wall: the hunters that used it rested at a median of 770-980 px, against the arena's edge. While a foe is near, the same eight compass samples that read boxed-in should steer its flight toward open ground, well before it is trapped. Two grazers are worse off today: they stand frozen, because `flee` has no goal (`ai.ts:2825`).
- **Boxed in, it breaks out.** Above the enter line it bolts for the widest gap, past the foe's side if that is the way out.
- **The bite is one roll, and almost always no.** One roll per cornered episode, on the body's own die, only from the facts above (boxed in, failed flight, struck). Nothing is rolled per tick and nothing retries. It starts at 3%.
- **Size decides whether it even considers it.** The chance scales by `effectiveWeight`: in full when the target is no heavier than the animal, and down to nothing once the target is `bite.none` times heavier. Poise counts, because that read includes it, so a braced hero looks bigger.
- **If it does, it is one attempt:** a normal wind-up, then straight back to running. Most prey has nothing to attempt it with. 55 of the 60 fleeing bodies carry nothing that hurts, and `meadow_hare`'s kit is empty, so this needs one small shared nip. Today `jukeKernel` presses whatever is in reach on every decision (`// a cornered thing still bites`), so the few with a kit bite freely. That press moves behind the roll.

With `chance × (1 − (ratio − 1) / (none − 1))²`, starting at `chance: 0.03` and `none: 3`, against a starter warrior (weight 1.0):

| Body | Target is heavier by | Chance per cornered episode |
|---|---:|---:|
| `gutter_rat` | 4.9× | None |
| `kettle_minnow` | 3.9× | None |
| `meadow_hare` | 3.2× | None |
| `snow_hare` | 2.2× | 0.5% |
| `roe_deer` | 1.5× | 1.7% |
| `white_hart` | 1.0× | 3% |

31 of the 60 could never try it on that hero. Against `tundra_behemoth` (weight 5.3) almost all of them read zero.

The code has wanted this for a while: `updateMorale` says a coward that ran and is still cornered turns desperate (`ai.ts:1515-1516`), and `jukeKernel` says a cornered thing still bites (`ai.ts:3744`). Today neither does anything beyond returning to normal.

### Example data rows

Skill hints do not change. One optional exception is added for a blade an author never wants walked to:

```ts
despair: { /* ... */ ai: { range: 400, weight: 2, keepDistance: 280 } },   // unchanged, now a preference
pack_knife: { /* ... */ ai: { range: 48, weight: 1, walkTo: false } },     // only when already in reach
```

Shared tables, every number tunable in one place:

```ts
// src/data/aiIntent.ts
export const INTENT_CFG = {
  think: { sec: [0.55, 0.95] as [number, number] },   // staggered by id hash, the aiRescanAt idiom
  commit: { maxSec: [2.2, 3.4] as [number, number], inertia: 1.25 },
  floor: 0.35,                         // options under 35% of the best weight are cut
  reach: { halfCostSec: 1.2 },         // walking this long to fire halves a skill's appeal
  need: { nonHit: 0.6 },               // a curse is worth less than a blow until state says otherwise
  repeat: { within: 4, mul: 0.6 },
  setup: 1.5,                          // lift for a skill that enables a ready payoff in the kit
  closers: { perPrey: 2, perExtraSeat: 1 }, // tokens for bodies walking in to melee
  shiftBeat: [0.22, 0.38] as [number, number], // visible plant when a stance changes band
  offBook: { minBar: 0.15, extraRecovery: [0.2, 0.3] as [number, number] },
  bands: { near: 90, mid: 260 },
};

export const STANCES: Record<string, StanceDef> = {
  keep:  { near: 0.5, mid: 1,   far: 1.3,  keepMul: 1,   lean: -0.35, holdSec: [6, 12] },
  press: { near: 1.6, mid: 1,   far: 0.35, keepMul: 0.2, lean: 0.6,   holdSec: [5, 10] },
  harry: { near: 1,   mid: 1.2, far: 0.8,  keepMul: 0.6, lean: 0.1,   holdSec: [4, 8] },
};

export const CHAOS_BUDGETS: Record<string, ChaosBudget> = {
  none:     { tokens: 0 },
  steady:   { tokens: 1, regenSec: 16, rollPerThink: 0.15, floor: 0.12, perPrey: 1 },
  restless: { tokens: 2, regenSec: 10, rollPerThink: 0.2,  floor: 0.08, perPrey: 2 },
  feral:    { tokens: 3, regenSec: 5,  rollPerThink: 0.35, floor: 0.02, perPrey: 3 },
};

export const TEMPERAMENTS: Record<string, TemperamentRow> = {
  plain:   { bold: [-0.15, 0.15], nerve: [-0.1, 0.1], volatile: [0, 0.1] },
  veteran: { bold: [0, 0.3],      nerve: [0, 0.3],    volatile: [0, 0.1] },
  feral:   { bold: [-0.3, 0.4],   nerve: [-0.4, 0.2], volatile: [0.2, 0.6] },
};

export const DESPERATION: Record<string, DesperationSpec> = {
  prey: {
    facts: [
      { fact: 'boxedIn',      band: [0.25, 0.85], weight: 0.7 },
      { fact: 'failedFlight', band: [0.4, 1.6],  weight: 0.7 },
      { fact: 'struck',       band: [0, 1],      weight: 0.3 },
    ],
    rise: 0.8, fall: 0.5, enter: 0.6, leave: 0.35,
    effects: { flight: 'breakout' },          // where it runs, and nothing about fighting
    flight: { readWithin: 260 },              // steer for open ground before it is trapped
    bite: { chance: 0.03, none: 3, curve: 2, skill: 'cornered_nip' },  // one roll per episode
    tells: [
      { source: 'cornered', curve: 'smooth', channel: { kind: 'lean', amp: -0.7 } },
    ],
  },
  cornered: {
    facts: [
      { fact: 'lifeLost',     band: [0.5, 0.9],  weight: 0.45 },
      { fact: 'foeNear',      band: [260, 60],   weight: 0.25 },
      { fact: 'boxedIn',      band: [0.25, 0.85], weight: 0.6 },
      { fact: 'failedFlight', band: [0.4, 1.6],  weight: 0.6 },
      { fact: 'nerveLost',    band: [0.3, 1],    weight: 0.3 },
    ],
    rise: 0.6, fall: 0.25, enter: 0.6, leave: 0.35,
    effects: { keepMul: [1, 0], floor: [0.35, 0.05], cadenceMul: [1, 0.75], chaosRegenMul: [1, 3], stance: 'press', holdsMorale: true },
    burnout: { after: [5, 8], windedFor: [1.2, 1.8] },
    tells: [
      { source: 'cornered', curve: 'smooth', channel: { kind: 'lean', amp: 0.9 } },
      { source: 'cornered', band: [0.5, 0.9], channel: { kind: 'tint', color: '#d8432a', max: 0.3 } },
      { source: 'cornered', band: [0.6, 1], channel: { kind: 'scale', amp: 0.1 } },
    ],
  },
};
```

Archetype defaults, added to the presets in `brain.ts:1284`, so nearly every body inherits sensibly with no authoring:

```ts
caster:     { /* ... */ intent: { stances: { keep: 8, harry: 1, press: 1 }, chaos: 'steady', desperation: 'cornered' } },
flanker:    { /* ... */ intent: { stances: { harry: 6, press: 3, keep: 1 }, chaos: 'restless', desperation: 'cornered' } },
juggernaut: { /* ... */ intent: { stances: { press: 9, harry: 1 }, chaos: 'steady' } },
swarm:      { /* ... */ intent: { stances: { press: 10 }, chaos: 'none' } },
commander:  { /* ... */ intent: { stances: { keep: 7, press: 3 }, alone: 'press', chaos: 'steady', desperation: 'cornered' } },
```

Per-monster exceptions and level gates use the existing vocabulary. `intent` is an ordinary `BrainTuning` axis, so rules, phases and `minLevel` can shift it, and `probe_braintuning` will demand it be folded by `mergeTuning`:

```ts
oblivion_knight: {
  brain: {
    type: 'flanker',
    skillUse: { mode: 'priority', order: ['despair', 'heavy_strike', 'cleave'] },  // now ranks over ready skills
    intent: { stances: { press: 6, harry: 3, keep: 1 }, temperament: 'veteran' },
    rules: [
      { when: { targetLifeBelow: 0.35 }, use: { skillUse: { cadence: [0.08, 0.18] } } },
      { when: { minLevel: 14 }, use: { intent: { chaos: 'restless' } } },   // chaos is earned, by body level
    ],
  },
},
zombie:     { brain: { /* ... */ intent: { chaos: 'none', temperament: 'plain' } } },   // a zombie stays a zombie
wool_aphid: { brain: { /* ... */ intent: null, desperation: 'prey' } },   // no thought for fighting, only for the gap
```

`intent: null` opts a body out and leaves today's behaviour untouched.

### Staying cheap

The numbers below come from a machine saturated by the nightly farm, so read them as ratios. Today's AI tick costs 111 µs per body at 50 bodies and 258 µs at 200, on a mixed bestiary at 60 Hz. `pressUsable` runs 0.65 times per body per tick at about 30 µs, which is 6-11% of the AI tick, because `pickSkill` re-filters the kit on every open tick and allocates arrays and closures to do it (`ai.ts:2084-2149`).

The scoring arithmetic is trivial: 0.06 µs per decision with three options, or 0.3 µs per tick for 200 bodies thinking every 0.6 s. The real cost of a think is its usability checks. Doing those on the think clock instead of on every tick should make this layer cheaper than what it replaces. That is an expectation, not a measurement, and phase 4 checks it with `npm run perf`.

- Think beats are staggered by an id hash, exactly like `aiRescanAt` (`ai.ts:1999`).
- Per-def rows are cached in a WeakMap, like `TEMPO_KINDS` (`ai.ts:2019`). No allocation in the loop, using scratch arrays like `spacingScratch`.
- A kit with one hinted skill skips scoring and draws no random number. That is 351 of 981 kits.
- No line-of-sight ray at the think. The firing line stays at the press, lazily, as today (`ai.ts:2100`).
- Boxed-in sampling runs only when a foe is near and the body is hurt or fleeing.
- The lite tier never thinks. Promoted bodies use the default rows.

### Determinism and co-op

- **One die per body.** A mulberry32 step on actor state, the `hauntRoll` shape (`ai.ts:321-328`), seeded from `manifest.seed ^ hash(actor.id)`. Seeding on id alone would give every episode the same personalities, because actor ids reset per episode. It never touches the global stream, so a body thinking cannot re-deal any other system's rolls.
- **Same seed, same fight.** The probe runs an episode twice and compares the fingerprint.
- **Host only.** `updateAI` runs on the host (`main.ts:1991`). Clients receive derived tell scalars through the existing `tl` wire, like every other tell. No new wire fields, no save fields. Intent, stance and tokens are transient and reset on zone re-entry, as encounter plans do.

### How the existing systems keep working

| System | Under the new layer | Pinned by |
|---|---|---|
| `encounterCombat` | While an order stands, the ring is the static read and the plan's `use` wins. The plan picks positions. Skills still resolve normally. | `probe_encountercombat`, `probe_warningcues` |
| Commands, taunts, standing orders | They pick the target and agenda. Intent chooses only what to swing at it. | `probe_assault`, `probe_companionstance` |
| Watch ladder | Runs before a lock exists. No target means no think. | `probe_watchers` |
| Tactic progression | `minLevel` rules can shift the `intent` axis. Novices keep plain conduct. | `probe_tacticprogression` |
| Pack tempo, slack, strike budget | Still eligibility at the press. Intent waits or picks another option. | `probe_packtempo` |
| Reposition and kite budgets | Unchanged, measured at the kernel boundary. | `probe_tacticalai`, `probe_harassment` |
| Tells and nerve | New sources join the registry. `aiNerve` is read, not rewritten. | `probe_tells`, `probe_pack` |
| Scripts, phases, bosses | Untouched unless a def opts in. | Existing boss probes |
| Minions and companions | Enemy team only at first, the same line the reposition default draws (`ai.ts:3262`). | `probe_miniontargets`, `probe_companionstance` |

## 5. Fairness and readability

Unpredictable must never mean unreadable. Each of these rules gets a probe.

1. **The wind-up is sacred.** Chaos and cornered choose among legal skills. They never change a cast time, a warning or a footprint. An off-book pick needs a visible bar or a warned footprint (`offBook.minBar`, the `feintMinBar` idea at `brain.ts:499`).
2. **The body shows the change first.** When a stance change moves a body's band, it plants and squares up for `shiftBeat` (0.22-0.38 s) wearing the stance's lean before its feet change direction. Drawn from the same stamp the kernel reads.
3. **One vocabulary.** `STANCES` are global, like watch rungs. A forward lean means the same on every body. Materials change the colour, never the meaning.
4. **Normal stays learnable.** The floor cut and the budget hold at least 90% of decisions in character. Players chunk patterns, and those patterns must exist before breaking them means anything ([Kubodera](https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs)).
5. **Surprise has a ceiling per victim, not per body.** The ledger on the prey caps live off-book acts, and existing stun tempering still applies, so a pack cannot chain surprises.
6. **Surprise pays.** An off-book cast adds recovery on top of its normal recovery. Cornered burns out into a visible stop. Every escalation has an opening, the same fairness Doom kept by refusing attacks the player could not answer ([Game Developer](https://www.gamedeveloper.com/design/cyber-demons-the-ai-of-doom-2016-)).
7. **Cornered is shown, escalates, and releases.** It intensifies with the actual state and visibly lets go, as `CLAUDE.md` requires of every cue.
8. **Danger matches the look.** No hidden damage multipliers. A kind that wants a cornered damage bonus authors it as ordinary `mods` and wears it visibly.
9. **Tells cannot lie.** They read the same stamped scalar the conduct reads. `validate.ts:1585` already outlaws an unreadable common bluff as a coin flip. The same check applies: `desperation` without a tell warns, and a `chaos` row above `steady` without a stance tell warns.
10. **Dim minds stay dim.** `chaos: 'none'` for zombies and their like. Existing policy already says a zombie stays a zombie at any level (`tactic-progression.md:22-23`).

What the player sees, and how to answer it:

| You see | It means | Your answer |
|---|---|---|
| Plants, leans in, squares up, then walks at you | `press` | Back off and bait the swing, or meet it and punish its recovery |
| Leans back, drifts out | `keep` | Close during its reposition hold, as today |
| Circling, weight centred | `harry` | Cut off the arc, or punish the planted stops |
| Hunkers low, flushes, hackles up | Cornered | Step back and give it a way out, or finish it knowing it will swing |
| Flattens and bolts for the widest gap | Prey, cornered | Leave it a way out and it is gone, or cut the gap off. It almost never turns on you |
| Slumps and puffs after a frenzy | Burned out | Hit it now |

## 6. A phased migration

Each phase lands alone and can be the last one. New probes are short enough for the commit gate. Heavy sweeps stay in the nightly farm, in line with your test cadence.

| # | Change | Bodies it can move | Proof before it lands |
|---|---|---:|---|
| 0 | **Instruments.** New enemy-side farm columns through `engine/tap.ts`: `first_hit_sec`, `melee_share`, `refused_presses`, `band_near/mid/far`, `skill_entropy`. Count death bursts in `dps_in`, and explain why a `word_of_doom` pack reads 6 damage per second while killing the hero. Fix `whySilent` to read `damage` effects, not `baseDamage`. Commit the ring audit and a stranded-skill census as a ledger and a probe. | None | Reproduces this document's numbers. Fingerprints unchanged. |
| 1 | **Truth gate.** `skillCanFire` in the picker, side-effect free, using tuned ailment chances and ignoring a skill's own payload. A skill that cannot fire no longer costs a decision or sets a ring. | 7 gated bodies, plus heal carriers | `refused_presses` is 0 across the bestiary. All other bodies are byte-identical. `tundra_behemoth` closes and slams. |
| 2 | **Geometry bugs.** Orbit is done. `holdRange` clamps its floor to the kit's reach. `hoverAllies` numbers become `MoveSpec` data, and a commander with no ally in reach fights. The seven hunter `juke` rows move to a closing kernel, and `mirage_dancer`'s `dart` becomes a real style. A minion's committed charge passes through its keeper (section 7, decision 10). | 73 commanders when alone, 22 artillery bodies, 8 data rows, charging minions | 18 of the 21 open defects land a hit on the idle rig, median first hit under 6 s. A charging golem moves its keeper 0 px and holds its line. Same-seed `threat:` rows reviewed by hand. |
| 3 | **Ready ring and closer tokens.** `standoff()` listens only to skills that can fire now. Bodies walking in to melee need a token from a per-prey ledger, built on `claimBurst`'s shape. No scoring, no randomness, no new data. | The 160 held bodies | The last 3 open defects swing. `melee_share` and time in reach match the prototype. Pack rows stay inside the corridor below. **A clean stopping point.** |
| 4 | **Scaffolding.** Per-body die, think clock, inert `intent` axis, dev lens. | None | Byte-identical fingerprints. `npm run perf` no worse. |
| 5 | **Intent pilot.** About ten bodies across archetypes opt in: `oblivion_knight`, `imp`, `abyssal_crawler`, `abyssal_wretch`, `pit_lord`, `frost_witch`, `goblin_shaman`, `warband_chieftain`. | About 10 | Skills used per fight up, no flip-flop (under one band change per 3 s). Your hands-on read. |
| 6 | **Bucket rollout.** Archetype defaults, one kernel bucket per landing: `direct`, `approach`, `hoverAllies`, `orbit`, `holdRange`, `slideCast`. `intent: null` where a body should stay as it is. | One bucket at a time | Corridor per bucket. A number pass follows each one. |
| 7 | **Stance and temperament.** Rows, tells and shift beat. Optional: `encounterCombat` picks among plans within 70% of the best, on the group's die. | All intent bodies | The same body fights at a visibly different range between seeds: a gap in time in reach of at least 15 points, against 0.2 today and about 3 with the ring fixed. Your hands-on read. |
| 8 | **Chaos budget.** Rows, ledger on the prey, extra recovery. | Bodies whose row is not `none` | Off-book decisions at or under the budget. At least 90% in character. Reaction window at least 0.35 s, always. |
| 9 | **Cornered curve.** Facts, effects, burnout, tells. Prey first, then mixed kits. Prey's flight reads open ground and its bite goes behind the roll (section 4). Validate warns on a `desperation` with no tell. | Prey, then opt-ins | `probe_cornered`: rises when boxed in, falls when given an exit, burns out. Prey spends less time against walls than today, and the grazers run. Over many episodes no body bites a target `bite.none` times its weight, and the rest stay at or under their row's chance. Hidden `balance/cornered-ui.cjs` captures the tell. Your hands-on read. |
| 10 | **Default on.** Legacy ring read removed from kernels, `docs/engine/intent.md`, a `CLAUDE.md` line. | All | Full gate and a clean night. |

Metrics, with today's reading where I have one. Targets are starting points for your review, not findings:

| Metric | Today | Target |
|---|---|---|
| Open defects from the 33 | 21 | 0 |
| Refused presses per 25 s | Up to 90 (`tundra_behemoth`) | 0 |
| Bodies whose ring reaches no damaging skill | 56 | 0, or adjudicated in the ledger |
| Held bodies that never press melee, duel | 79 of 160 | Set by stance mix, about 1 in 4 |
| Median time in reach, duel | 1.7% | 30-40% |
| Time to first melee, duel, of bodies that press it | 7.0 s | Under 4 s |
| Distinct skills used per fight, duel | 1.83 | Above 2 |
| Gap in time in reach between seeds | 0.2 points | At least 15 points on mixed kits, after phase 7 |
| Damage-taken spread across seeds | Baseline in phase 0 | Up to 1.5× today, no more |
| Off-book decisions | 0 | At most 5% on `steady` |
| Prey bite attempts per cornered episode | Whenever a kit is in reach | Row's chance × size factor: 0 to 3% |
| Shift beat to first new hit | Not applicable | At least 0.35 s |
| Band changes | Not applicable | Under one per 3 s |
| AI tick cost | 111-258 µs per body on a loaded machine | No worse |

### Keeping existing tuning from shifting by accident

- **Absent means identical.** The project's own law. No `intent` axis means the old code path, and the probe compares fingerprints across a bestiary sample.
- **The die is off-stream,** so adding a think cannot re-deal anything else. That is the failure `tactical-ai.md:98-102` already recorded.
- **One bucket per landing.** Same-seed before and after on the farm's `threat:` and `duel:` rows, using the `whatif` honesty rules (`identical`, `coin_flip`, `inconclusive`, `moved`), plus `baseline check --suite smoke`, `npm run probe` and `matrix check`.
- **A damage corridor.** After its number pass, each bucket's median `dps_in` on `threat:` and `duel:` rows lands within 15% of its value before the bucket. Bodies that go from zero to something are judged against their level's cohort by the farm's existing outlier ranking. Turn behaviour dials first: stance mix, `ai.weight`, tokens. Touch monster damage only after those. The mechanic change is the exception you approve here. After it, tuning is numbers, as you asked.
- **A census so it cannot regress.** The ring audit becomes a committed ledger, in the shape of `balance/baselines/support_matrix.json`. A new body whose ring cannot reach its damage fails until someone adjudicates it.
- **A dev lens.** A top professional would not ship utility scoring without this. A `?dev` tab shows each body's intent, stance, top three scores, chaos tokens and cornered value, plus an A/B toggle, so you can feel the difference and we can answer "why did it do that".
- **Your hands on it** at the pilot, stance, chaos and cornered gates. Numbers cannot judge feel.

## 7. Decisions for the owner

The owner read this on 1 November 2026 and agrees with these recommendations, except where a decision says otherwise. Decisions 5, 6, 9 and 10 are already built.

1. **Approve the direction: evolve to intent-driven rings, no rewrite?** Recommend yes. If you want less, phases 0-3 alone fix most of the measured defects and stop there cleanly.
2. **How often does a mixed ranged and melee body choose to close?** Recommend by archetype, as in the rows above: casters about 1 fight in 5, flankers and juggernauts most fights. This is the biggest single feel dial.
3. **How much chaos by default?** Recommend `steady`: at most one off-book act per 16 s per body and one live per victim. `none` for dim kinds. `restless` earned by body level.
4. **Should prey bite when cornered?** **The owner's call: almost never, and not at all against something much bigger.** I recommended a weak yes. The owner kept the triggers from section 4, gave prey a very, very low chance of even attempting it, and reduced that further by the size or weight of the would-be target. A hare has no reason to bite a titan: it tries above all to avoid being cornered, and spends no thought on fighting back. "Prey: running is the whole plan" in section 4 has the rule and what it does on real bodies.
5. **Should a commander alone fight?** Recommend yes. It hangs back while allies are near, and presses when none remain.
6. **Looters and harassers on `juke`.** `magpie_snatch` and `formic_forager` are thieves, `canopic_jackal` is a named seal-bearer, `snuffwick` is meant to park on lights. Recommend: thieves keep fleeing while carrying loot and close otherwise. The rest move to a closing kernel.
7. **Hold threat level or accept harder fights?** **The owner's call: hold it for now, though curious what harder fights would look like.** Recommend holding it: each bucket's median within 15%, using the numbers above, with the nightly proposals naming outliers. The prototype says the average barely moves in a real fight, but `oblivion_knight` and its kin go from harmless to dangerous. A fight getting that much sharper should be your choice, not a side effect. When it is time to look, the cheap way is a browser preview (`docs/engine/browser-previews.md`) that leaves a bucket's number pass out and sets `BEHAVIOR_CFG.closers.perPrey` to 2.
8. **Does cornered ever add damage?** Recommend no by default. It changes behaviour. Kinds that want more author it visibly.
9. **Player-side minions and companions?** Recommend enemies only for now. Your court obeying you predictably is a feature.
10. **Should a minion's committed charge path around its keeper, or pass through?** Recommend **pass through.** Today body separation treats keeper and minion like any other pair and splits the overlap by weight (`world.ts:62126-62129`), so a commanded golem running head-on through its keeper shoves the hero up to about 93 px in 0.55 s, and a body that starts behind the keeper is knocked off its line. Pathing around is wrong for the same reason that deflection is: a committed charge is a locked line the player aimed (`world.ts:50245-50249`), and bending it makes the drawn line lie and the charge miss. Passing through keeps the line and leaves the hero's position in the hero's hands. A heavy pet must never be able to walk its own keeper into a hazard or out of a cast. It costs one clause beside the existing exemptions for grab, saddle and phasing pairs (`world.ts:62072-62116`), active only while the minion is mid-charge, with the minion alone yielding if it ends the charge overlapping. `DashDelivery.phase` shows the same idea already works for flights (`world.ts:37498-37506`). In co-op the same applies to any allied seat. Other minions and enemies keep shouldering, so an ogre still parts goblins. The last rig in `probe_bonegolem` currently expects the shove and would flip. The walking case, a heavy pet nudging its keeper while heeling, is the same question at lower stakes, and I would give the keeper right of way there too once this lands.

## Sources

- Dill, K. "Dual-Utility Reasoning." Game AI Pro 2, ch. 3. <http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter03_Dual-Utility_Reasoning.pdf>
- Mark, D. Infinite Axis Utility System. <https://gameai.com/iaus.php>
- Curvature, an IAUS editor built on the Guild Wars 2 work. <https://github.com/apoch/curvature>
- "Utility system," Wikipedia, for the GDC 2015 talk and the Sims 3 temperature summary. <https://en.wikipedia.org/wiki/Utility_system>
- Evans, R. "Modeling Individual Personalities in The Sims 3." GDC Vault. <https://gdcvault.com/play/1012294/Modeling-Individual-Personalities-in-The>
- Isla, D. "Handling Complexity in the Halo 2 AI." <https://www.gamedeveloper.com/programming/gdc-2005-proceeding-handling-complexity-in-the-i-halo-2-i-ai>
- Orkin, J. "Three States and a Plan: The AI of F.E.A.R." GDC 2006. <https://pages.cs.wisc.edu/~dyer/cs540/handouts/gdc2006_orkin_jeff_fear.pdf>
- Humphreys, T. "Exploring HTN Planners through Example." Game AI Pro, ch. 12. <http://www.gameaipro.com/GameAIPro/GameAIPro_Chapter12_Exploring_HTN_Planners_through_Example.pdf>
- "Cyber Demons: The AI of DOOM (2016)." <https://www.gamedeveloper.com/design/cyber-demons-the-ai-of-doom-2016-> and <https://80.lv/articles/cyber-demons-the-ai-of-doom>
- Campbell, J. and Loudy, K. "Embracing Push Forward Combat in DOOM." GDC 2018. <https://gdcvault.com/play/1024940/Embracing-Push-Forward-Combat-in>
- Fray, A. "Context Behaviours Know How to Share." <https://andrewfray.wordpress.com/2013/03/26/context-behaviours-know-how-to-share/> and Game AI Pro 2, ch. 18. <http://www.gameaipro.com/GameAIPro2/GameAIPro2_Chapter18_Context_Steering_Behavior-Driven_Steering_at_the_Macro_Scale.pdf>
- "The Low-Tech AI Of Elden Ring." NEGA.TV, secondhand from community decompilation. <https://nega.tv/posts/low-tech-ai-of-elden-ring.html>
- "Elden Ring: AI Goals & Params." Souls Modding wiki. <http://soulsmodding.wikidot.com/elden-ring-ai-goals-params>
- Fujioka, K., interviewed by Siliconera, 2015, on Monster Hunter 4 Ultimate. <https://www.siliconera.com/?p=461043>
- Kubodera, A. "Designing for Difficulty: Readability in ARPGs." <https://www.gamedeveloper.com/game-platforms/designing-for-difficulty-readability-in-arpgs>
- Rain World community wiki, "Behavior." <https://rainworld.miraheze.org/wiki/Behavior>
