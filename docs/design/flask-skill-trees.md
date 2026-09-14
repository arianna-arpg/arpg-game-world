# Flask skill trees

## Scope and baseline audit

Temporary flask pass ahead of the remaining Spellblade, Cryomancer and Apothecary trees. All six player flasks now carry three exclusive trunks, two additive branches per trunk, two terminal leaves per branch, and two independent three-rank practice nodes: 23 nodes each, 138 total. The existing four-point budget remains: levels 5/10/15/20 grant one point each. A terminal route costs three points, so the last point can mix another leaf, branch, or practice rank. The breadth is choice, not a request to buy an entire tree.

Life and Mana already have a veteran start grant after Mireille's account lesson. That path is retained and probed across every class; existing class slots remain in place. First-account gift, seating, refill, and lesson latches remain unchanged. No starter class trees or selected alternate kit definitions change.

Life retains its one-charge sip: 15% maximum-life surge over 0.4 base seconds plus 18 + 4 per level after level one over 4.5 base seconds. Mana retains 13 + 3 per level after level one over 3 base seconds. Both retain two-second cooldowns, level-12 capacity, innate Reflex and refuse-before-payment fullness gates. Their existing -4% increased duration per level remains: higher levels concentrate a conserved pour. Every new duration is explicitly a BASE duration and follows that same modifier, including temporary buffs and inherited payloads. The 0.2-second restore-stream minimum still applies. Utility and Catalyst positive duration leveling remains intact.

Catalyst normally consumes its whole bank, minimum two; restoration scales per charge. Its high refreshes, rather than stacking. Quicksilver, Stoneskin and Antidote retain their native buffs and one-charge payments. Antidote cleanses harmful status entries and grants 50% ailment resistance, not immunity; the general resistance cap is 90%.

Orbs retain their immediate pour and native charge taps. Dedicated fermentation uses instance-local ChargeGainSpec second/move/takeHit taps, not chargeRegen stats. The separate existing chargeRegen family is per TEN seconds and was not retuned. A timer starts only while the invested skill is slotted. Every generated flask payload carries proc depth one, cannot shed on-hit orbs or tap top-level hit fuel, and cannot schedule another follow-up. Natural independent orb drops still feed flasks normally.

There is no separately named proficiency registry at this baseline. Flask-tagged modifiers, per-skill levels, the fount passive cluster, sockets, orb taps and sympathy links are the existing investment surfaces. The redundant Bottled Reflex notable now grants 35% increased flask cooldown recovery. Deep Draught's broader existing thirstless/restoration behavior is preserved. New Life/Mana tree fullness allowances exist only with offensive or defensive riders; reserve uses the existing bounded priming gate.

## Shared implementation and ownership

SkillTreeNode now supports additive utilityEffects, chargeGain and followUps. Utility cargo uses the existing self-effect pipeline. Follow-up numeric investment is copied once from the flask host at dispatch, with no sockets or fuel-generating cargo copied; the child retains its own base damage and level scaling. This repairs Acrid Draught, Shared Draught and Chaser support-level no-ops. Unrelated non-flask meta actions are unchanged.

Follow-up payloads keep their exact host instance. Respec/unseat cancels queued payloads, projectiles, fields, primes, tree-clock fractions and owned temporary buffs. Another owner's subsequent refresh survives the first owner's reset. Paid restoration streams already flowing continue to spend their conserved remainder; respec does not refund a consumed charge. No dormant bank continues fermenting off-bar. Remaining integer ammunition stays ammunition, subject to the actual cap at the next gain/load.

Primed release now includes utility cleanses, instant restores, heals, absorption, Ward and follow-ups as well as native streams/buffs. It pays no second cost. Original aim is retained, including through save/load. Primes release on the first life wound as before. The save now retains flask ammunition without emitting gain events; fractional fermentation clocks intentionally restart on load. Snapshots mirror the host's actual flask charges for remote hotbar pips. Saved node picks and charge-cost overrides rebuild through the existing validation. No compatibility reset is required.

## Design revisions and balance evidence

The initial six-route pressure test exposed a test-budget error: a level-10 instance cannot buy a terminal node. All benchmark routes now purchase three nodes legally at level 15. An initial poison magnitude of 1.5 produced about 159 single-target DPS in this rig, far above the other routes; the final magnitude is 0.25, about 42 DPS. Long-lived fields retain stronger stationary throughput in exchange for requiring enemies to stay inside their footprint. Life's lower damage is paired with its own dependable healing; the other five benchmark bars add a non-offensive Living Reserve Life Flask with Quiet Fermentation.

The deterministic 60-second rig starts every bank EMPTY, uses real cooldowns and charge taps, supplies no manual refills, and disables target attacks/drop fuel. A separate deterministic incoming physical hit lands every two seconds through the actual damage pipeline; monster offense and defenses scale that authored 12-point packet. The hero has the ordinary Warrior stat sheet with natural life/mana regeneration disabled. Targets are durable level-10 bodies, one target or four clustered targets, with no movement. Quicksilver circles and earns its movement charges through World.moveActor. This is a reproducible economy/pressure comparison, not an endgame boss or human-play balance claim.

| Route | Targets | First drink (s) | Drinks / 60s | Damage / s | Minimum life | Survived |
|---|---:|---:|---:|---:|---:|---|
| Life Flask | 1 | 4.02 | 14 | 18.78 | 118.72/154 | true |
| Life Flask | 4 | 4.02 | 14 | 74.28 | 118.72/154 | true |
| Mana Flask | 1 | 3.02 | 19 | 33.26 | 84.63/154 | true |
| Mana Flask | 4 | 3.02 | 19 | 99.71 | 84.63/154 | true |
| Catalyst Flask | 1 | 4.02 | 12 | 22.6 | 74.01/154 | true |
| Catalyst Flask | 4 | 4.02 | 12 | 94.19 | 74.01/154 | true |
| Quicksilver Flask | 1 | 3.02 | 15 | 43.29 | 50.17/154 | true |
| Quicksilver Flask | 4 | 3.02 | 15 | 179.91 | 50.17/154 | true |
| Stoneskin Flask | 1 | 8.02 | 7 | 20.53 | 65.89/154 | true |
| Stoneskin Flask | 4 | 8.02 | 7 | 80.93 | 65.89/154 | true |
| Antidote Flask | 1 | 6.02 | 9 | 42.02 | 50.17/154 | true |
| Antidote Flask | 4 | 6.02 | 9 | 168.29 | 50.17/154 | true |

All measured routes restart without any unrelated attack or generated orb chain. Idle deadlines are within one engine update of 4s Life, 3s Mana, 4s Catalyst (two 2s charges), 8s Quicksilver, 8s Stoneskin and 6s Antidote. The movement build's Quicksilver first drink is faster. Stoneskin's pressure-fed branch can accelerate its refill, but cannot drink past its real cooldown. Catalyst can wait for a larger bank or take smaller legal batches; per-charge damage and restoration are checked at four and six charges.

## Complete node register

Descriptions below are the authored gameplay contract. The ID is the persisted allocation key. All buffs are temporary and refresh by ID unless stated otherwise. Ward is the decaying Ward pool; absorption is the separate capped absorption pool. Cleanse removes status entries, never beneficial statuses. Conditional poise/ES choices require the corresponding pool, as stated.

### Life Flask

| ID / node | Prerequisite | Behavior |
|---|---|---|
| red_practice — Careful Measures | Root | 10% increased restoration. Per rank; 3 ranks. |
| red_wrist — Ready Wrist | Root | 10% increased cooldown recovery. Per rank; 3 ranks. |
| red_triage — Triage | Root | Surge restores an extra 8% of maximum life; settle restores 35% less. Front-load the emergency. |
| red_stitch — Wash the Wound | red_triage | Each drink removes 1 additional harmful status entries; beneficial statuses stay. |
| red_surgery — Field Surgery | red_stitch | Each drink removes 2 additional harmful status entries; beneficial statuses stay. |
| red_brace — Brace for Impact | red_stitch | Drink grants 18% less damage taken until the next landed hit, for 5 base seconds. |
| red_urgency — Urgency | red_triage | 40% increased cooldown recovery. |
| red_poise — Catch Your Breath | red_urgency | Restore 20 poise immediately. Requires a poise pool. |
| red_lastlight — Last Light | red_urgency | An additional 7% of maximum life joins the surge, but the whole drink has 20% less restoration. |
| red_cellar — Living Reserve | Root | Bank one primed drink at full life; it opens on the first wound. Settle restores 35% more but all pour windows last 50% longer. |
| red_cork — Second Cork | red_cellar | Bank one additional primed drink. |
| red_bottle — Spare Bottle | red_cork | +1 maximum charge. |
| red_release — Sterile Reserve | red_cork | Each drink removes 2 additional harmful status entries; beneficial statuses stay. |
| red_overflow — Clotting Reserve | red_cellar | During the pour, 40% of overhealing becomes an absorption ward. Lasts 8 base seconds. |
| red_knit — Slow Knitting | red_overflow | The clotting window also grants 25% increased healing received. |
| red_ferment — Quiet Fermentation | red_overflow | While slotted, recover one Life charge every 12 seconds, even from empty. |
| red_bloom — Blood Bloom | Root | Every drink bursts nearby enemies with physical damage and bleeding. Drink at full life; restore 25% less. While slotted, recover one charge every 4 seconds. |
| red_petals — Spreading Petals | red_bloom | 30% increased payload area radius. |
| red_open — Open Veins | red_petals | The bloom gains 20% armor penetration. |
| red_weight — Weight of Blood | red_petals | The bloom deals 80% more poise damage. |
| red_bloodguard — Bloodguard | red_bloom | Each drink grants 12% less damage taken for 6 base seconds, keeping the close-range route tenable. |
| red_reclaim — Reclaim the Blood | red_bloodguard | 35% increased restoration. |
| red_rupture — Ruptured Vessel | red_bloodguard | The bloom deals 45% more damage; the drink restores a further 25% less. |

### Mana Flask

| ID / node | Prerequisite | Behavior |
|---|---|---|
| blue_practice — Exact Measure | Root | 10% increased restoration. Per rank; 3 ranks. |
| blue_shelf — Ink Shelf | Root | +1 maximum charge. Per rank; 3 ranks. |
| blue_clarity — Clarity | Root | After drinking, your next spell costs 40% less mana, within 8 base seconds. The pour stays intact. |
| blue_intent — Clear Intent | blue_clarity | The prepared spell also casts 35% faster. |
| blue_focus — Focused Thought | blue_intent | The prepared spell deals 25% more damage. |
| blue_reach — Far Thought | blue_intent | The prepared spell has 30% increased area radius. |
| blue_study — Between Pages | blue_clarity | While slotted, recover one Mana charge every 12 seconds. |
| blue_ink — Spare Ink | blue_study | +1 maximum charge. |
| blue_script — Unbroken Script | blue_study | 30% increased restoration. |
| blue_reservoir — Protective Reservoir | Root | Every drink grants 18 decaying Ward. Drinkable at full mana; restores 20% less mana. |
| blue_shell — Glass Shell | blue_reservoir | Each drink grants 14 decaying Ward. |
| blue_insulate — Insulated Glass | blue_shell | Each drink grants +25% lightning resistance for 8 base seconds; normal resistance caps apply. |
| blue_shield — Restart the Shield | blue_shell | Restore 12 Energy Shield and restart its recharge delay immediately; needs an ES pool. |
| blue_drip — Patient Reservoir | blue_reservoir | Pour windows last twice as long; restore 35% more. Ward still arrives immediately. |
| blue_condense — Condensation | blue_drip | While slotted, recover one Mana charge every 10 seconds. |
| blue_filter — Clear Water | blue_drip | Each drink removes 1 additional harmful status entries; beneficial statuses stay. |
| blue_lance — Galvanic Decant | Root | Every drink fires an aimed lightning bolt piercing two enemies. Drink at full mana; restore 35% less. Recover one charge every 3 seconds while slotted. |
| blue_fork — Twin Mouth | blue_lance | Fire one additional bolt, each dealing 20% less damage. |
| blue_pierce — Through the Ranks | blue_fork | Bolts pierce two additional enemies. |
| blue_fast — Needle Jet | blue_fork | Bolts travel 45% faster. |
| blue_shock — Charged Solvent | blue_lance | Bolts gain 45% chance to shock. |
| blue_ground — Break Insulation | blue_shock | Bolts penetrate 20% lightning resistance. |
| blue_feedback — Safe Discharge | blue_shock | Each drink grants 18 decaying Ward. |

### Catalyst Flask

| ID / node | Prerequisite | Behavior |
|---|---|---|
| gold_practice — Clean Glass | Root | 10% increased restoration. Per rank; 3 ranks. |
| gold_wrist — Steady Decant | Root | 10% increased cooldown recovery. Per rank; 3 ranks. |
| gold_measure — Measured Mixture | Root | Spend exactly one charge. Native per-charge life and mana pours deliver one unit; retain the full transmutation high. |
| gold_still — Bench Still | gold_measure | Recover one Catalyst charge every 8 seconds while slotted. |
| gold_vials — Sample Vials | gold_still | +1 maximum charge. |
| gold_sips — Tasting Cadence | gold_still | 50% increased cooldown recovery. |
| gold_balance — Balanced Tonic | gold_measure | The high also regenerates 1 life and 1 mana per second. |
| gold_filter — Paper Filter | gold_balance | Each drink removes 1 additional harmful status entries; beneficial statuses stay. |
| gold_seal — Wax Seal | gold_balance | Each drink grants 16 decaying Ward. |
| gold_grand — Grand Transmutation | Root | Keep the whole-bank gulp, with minimum 4 charges. Each charge restores 60% more life and mana. |
| gold_vat — Deep Vat | gold_grand | +3 maximum Catalyst charges. |
| gold_ward — Golden Shell | gold_vat | Gain 7 decaying Ward per charge actually consumed. |
| gold_age — Patient Distillation | gold_vat | Recover one Catalyst charge every 3 seconds while slotted. |
| gold_savor — Savor the High | gold_grand | The high also grants 15% increased attack and cast speed. |
| gold_prism — Prismatic Skin | gold_savor | The high also grants +20% fire, cold and lightning resistance. |
| gold_linger — Long Finish | gold_savor | The high and pours last 50% longer; total restoration is conserved. |
| gold_retort — Volatile Retort | Root | The whole-bank gulp throws a delayed fire blast at your aim, damage per charge spent. Restore 40% less. Recover one charge every 2 seconds while slotted; still needs at least two. |
| gold_scatter — Wide Retort | gold_retort | 30% increased payload area radius. |
| gold_ignite — Hot Residue | gold_scatter | The blast gains 70% chance to ignite. |
| gold_pressure — Under Pressure | gold_scatter | Blast hits knock enemies back with 90 strength. |
| gold_battery — Large Batch | gold_retort | +3 maximum charges; wait longer for a larger blast. |
| gold_fire — White Heat | gold_battery | The blast penetrates 20% fire resistance. |
| gold_slag — Cooling Slag | gold_battery | Each spent charge grants 5 decaying Ward. |

### Quicksilver Flask

| ID / node | Prerequisite | Behavior |
|---|---|---|
| silver_practice — Unstoppered | Root | 10% increased cooldown recovery. Per rank; 3 ranks. |
| silver_time — Lingering Cool | Root | 8% increased buff and pool duration. Per rank; 3 ranks. |
| silver_road — Open Road | Root | The speed buff lasts 8 base seconds but ends when a hit lands on you. It also grants phasing through bodies. |
| silver_way — Roadside Condenser | silver_road | Recover one Quicksilver charge every 10 seconds while slotted. |
| silver_satchel — Traveller’s Satchel | silver_way | +1 maximum charge. |
| silver_depart — Early Departure | silver_way | 40% increased cooldown recovery. |
| silver_stride — Long Stride | silver_road | The speed buff grants a further 25% increased movement speed. |
| silver_wash — Wash Off the Road | silver_stride | Each drink removes 1 additional harmful status entries; beneficial statuses stay. |
| silver_breath — Walking Breath | silver_stride | While the speed buff holds, regenerate 2 life per second. |
| silver_duelist — Slippery Footwork | Root | The speed buff grants +180 flat evasion, but its base duration is only 3 seconds. |
| silver_slip — Slip the Blow | silver_duelist | While the speed buff holds, gain 6 life per evaded attack. |
| silver_grace — Grace Under Pressure | silver_slip | While the speed buff holds, take 10% less damage. |
| silver_hands — Quick Hands | silver_slip | While the speed buff holds, gain 20% increased attack and cast speed. |
| silver_second — Second Step | silver_duelist | 70% increased cooldown recovery. |
| silver_recover — Recover Your Footing | silver_second | Recover one Quicksilver charge every 7 seconds while slotted. |
| silver_glass — Breakaway Glass | silver_second | Each drink grants 20 decaying Ward. |
| silver_wake — Mercury Wake | Root | Drinking leaves a chilling pool at your feet. Recover a charge every 8 seconds while slotted; speed buff is unchanged. |
| silver_tracks — Frozen Tracks | silver_wake | Walk 600 units to recover one charge. Deliberate walking counts; teleports and pushes do not. |
| silver_lap — Another Lap | silver_tracks | 50% increased cooldown recovery. |
| silver_lure — Lure the Pursuit | silver_tracks | While the speed buff holds, gain an additional 20% movement speed. |
| silver_pool — Broad Wake | silver_wake | 30% increased payload area radius. |
| silver_freeze — Flash Freeze | silver_pool | Wake hits gain 25% chance to freeze. |
| silver_deep — Deep Frost | silver_pool | The wake deals 50% more damage, but the speed buff and pool last 25% less time. |

### Stoneskin Flask

| ID / node | Prerequisite | Behavior |
|---|---|---|
| stone_practice — Loose Stopper | Root | 10% increased cooldown recovery. Per rank; 3 ranks. |
| stone_hold — Seasoned Stone | Root | 8% increased buff duration. Per rank; 3 ranks. |
| stone_bastion — Drink the Mountain | Root | The hide adds 120 flat armor and 15% less damage taken, but slows movement by 20% while active. |
| stone_foundation — Foundation | stone_bastion | Each drink grants 28 decaying Ward. |
| stone_mass — Heavy Foundations | stone_foundation | The hide grants 60% increased weight, resisting displacement. |
| stone_mend — Masonry | stone_foundation | While the hide holds, regenerate 2 life per second. |
| stone_long — Long Watch | stone_bastion | Buffs last 45% longer. |
| stone_spring — Mineral Spring | stone_long | Recover one Stoneskin charge every 10 seconds while slotted. |
| stone_pure — Purified Stone | stone_long | Each drink removes 1 additional harmful status entries; beneficial statuses stay. |
| stone_barbs — Bottled Briars | Root | The hide grants 24 thorns and reflects 15% of landed wound damage. Recover one charge every 8 seconds while slotted. |
| stone_spines — Long Spines | stone_barbs | The hide gains 20 additional thorns. |
| stone_mirror — Cruel Mirror | stone_spines | The hide reflects an additional 10% of landed wound damage. |
| stone_armor — Bark Under Briars | stone_spines | The hide also adds 80 flat armor. |
| stone_cushion — Thorn Cushion | stone_barbs | Each drink grants 24 decaying Ward. |
| stone_growth — Living Briars | stone_cushion | While the hide holds, regenerate 3 life per second. |
| stone_return — Answer Again | stone_cushion | 50% increased cooldown recovery. |
| stone_fault — Fault in the Bottle | Root | Drinking plants a strong physical blast at your feet after 0.8 seconds, with 50% stun chance. Recover one charge every 8 seconds while slotted. Hide lasts 25% less time. |
| stone_pressure — Pressure-fed | stone_fault | Suffering a landed hit has a 30% chance to bank a charge. Generated secondary hits cannot feed it. |
| stone_cadence — Aftershock Cadence | stone_pressure | 50% increased cooldown recovery. |
| stone_anchor — Blast Anchor | stone_pressure | Each drink grants 25 decaying Ward. |
| stone_fracture — Wide Fracture | stone_fault | 30% increased payload area radius. |
| stone_break — Break the Bedrock | stone_fracture | Blast deals 100% more poise damage. |
| stone_dust — Grinding Dust | stone_fracture | Blast ignores 30% armor. |

### Antidote Flask

| ID / node | Prerequisite | Behavior |
|---|---|---|
| green_practice — Quick Uncorking | Root | 10% increased cooldown recovery. Per rank; 3 ranks. |
| green_shelf — Apothecary Shelf | Root | +1 maximum charge. Per rank; 3 ranks. |
| green_company — Clean Company | Root | Each drink also cleanses two harmful status entries from allies within 200 units, including you. Ordinary three-entry self cleanse stays. |
| green_circle — Wide Dispensary | green_company | 30% increased payload area radius. |
| green_bless — Clean Shelter | green_circle | Allies within 200 units also gain 12% less damage taken for 4 base seconds. |
| green_feet — Get Them Moving | green_circle | The clean shelter also grants 20% increased movement speed. |
| green_supply — Supply the Ward | green_company | Recover one Antidote charge every 10 seconds while slotted. |
| green_spares — Spare Bandages | green_supply | +1 maximum charge. |
| green_rounds — Hospital Rounds | green_supply | 50% increased cooldown recovery. |
| green_inoculate — Inoculation | Root | Antidote resistance buff lasts 9 base seconds and also grants +25% chaos resistance. This is resistance, not immunity. |
| green_tolerance — Acquired Tolerance | green_inoculate | The buff grants an additional 30% ailment resistance, subject to the 90% cap. |
| green_regrow — Regrowth | green_tolerance | While the buff holds, regenerate 3 life per second. |
| green_rest — Nervous Recovery | green_tolerance | While the buff holds, regenerate 1.5 mana per second. |
| green_flush — Full Flush | green_inoculate | Each drink removes 5 additional harmful status entries; beneficial statuses stay. |
| green_culture — Living Culture | green_flush | Recover one Antidote charge every 12 seconds while slotted. |
| green_membrane — Protective Membrane | green_flush | Each drink grants 25 decaying Ward. |
| green_garden — Bitter Garden | Root | Each drink plants an aimed poisonous bed for 5 base seconds. Recover one charge every 6 seconds while slotted. Antidote protection lasts 25% less time. |
| green_bed — Spread the Bed | green_garden | 30% increased payload area radius. |
| green_concentrate — Concentrated Venom | green_bed | Bed deals 40% more damage, but its radius is 20% smaller. |
| green_corrosion — Corrosive Roots | green_bed | Bed hits penetrate 20% chaos resistance. |
| green_prune — Pruning Cycle | green_garden | 70% increased cooldown recovery. |
| green_antigen — Safe Handling | green_prune | While Antidote holds, regenerate 2 life per second. |
| green_perennial — Perennial Bed | green_prune | Bed and protection last 60% longer; damage per tick stays fixed. |

## Verification and limits

probe_flasktrees covers all nodes through real purchases and drinks, modifier changes, actual buffs/utilities, terminal damage, four-point sibling coexistence, save/network rebuilds, timer deadlines at 20/60Hz, reset/unseat, prime utilities/aim, per-charge conservation, support-level inheritance, generated-orb exclusion, owner refreshes and all veteran class kits. Existing pours, charge gate, sympathy and Mireille probes cover the baseline contracts. audit_flasktrees records reproducible full-cadence combat evidence in balance/reports/flask-combat.json. Type checking, sim smoke and a production build accompany the pass; hidden Electron checks verify real tree rendering and interaction with physical controllers excluded and isolated save/profile paths.

Remaining limits: stationary target benchmarks favor fields; encounter variety, evasive bosses, optimized gear/support combinations and late-game damage need player testing. Most utility-only routes are defensive choices rather than primary damage builds. Branch buffs use the existing level-scaled duration law; high-level Life/Mana buff windows become short and reward timing. Fractional charge clock progress and already-running field attacks are transient across relaunch; flask ammunition and primed paid pours persist. Loaded ammunition clamps against the loaded skill's cap, including tree and passive investment.

### Final adversarial findings

The reflex contract had a second facing write inside effect execution. The pass now restores the pre-drink facing after a pierced instant use and after a flask follow-up, while aimed projectiles still resolve toward the chosen aim. The focused rig covers all six flasks mid-cast and repeated held presses. The compact three-trunk layout was refined after reviewing actual screenshots; all 23 labels remain at least 10 screen pixels high in the tested 1000×720 and 1400×1000 windows, with no label intersections. Each tree accepted a real UI point purchase.

At the initial baseline, the additional fast regression run passed 237/238 probes. The unrelated support-fabric knockback check was stochastic on its blocking sentinel target; its focused gate subsequently passed with the runner reporting the first-attempt flake explicitly. A baseline checkout of the same probe also passed. No assertion or exclusion was weakened for the flask pass. The focused flask rig passed 1,146 checks; all 12 empty-bank combat comparisons survived. The original pours, charge gate, sympathy and Mireille tests passed, as did type checks, sim smoke and production build. Final integration checks are recorded with the commit report.
