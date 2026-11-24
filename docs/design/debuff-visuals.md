# Reading debuffs on the actor

All 116 non-beneficial statuses in the native registry have an ongoing actor cue and a shaped player HUD icon. This includes hostile ailments, infections and terrain states such as Wading. The 43 beneficial definitions use the game's other presentation paths. Counts reflect the November 23, 2026 registry.

## What to look for in combat

| Mechanic | What the player can see |
| --- | --- |
| Elemental ailments | Small flames cling to an ignited hide. Chill coats the actor's silhouette with pale rime. Freeze closes a fractured ice prism around it. Shock leaves a contact spark between forked discharges. |
| Wounds and banks | Bleed opens a dripping cut, Poison raises bubbles, Decay branches across the skin, and Impale lodges steel in the body. Doom's shoulder skull identifies the curse while its armed iris, fuse and blast boundary show the actual threat. |
| Control | Roots pin the feet, a broken blade marks Disarm, a barred rune marks Silence, and stars orbit a stunned head. Harrowing adds quiver strokes per stack. Pairing outward tracks on either side signals panic. |
| Buildup | Stone plates spread at three Petrifying stacks. Conversion to Petrified adds a full stone coating and a deep crack. Faintness bows the bearer slightly while Swoon folds it down further. |
| Armed payloads | A glowing coal, branded rune and bound powder sticks sit in different places on the body. Their wicks shorten against their actual status clocks. A snapshot missing the duration shows only the payload. |
| Openings and restraints | Exposed marks the vulnerable anatomical seam and the exact life-bar window. Vulnerable opens a wound across the torso. Seized shows cuffs, while Swallowed hides the victim inside the captor and preserves the local struggle meter. |
| Terrain and infections | Wet beads, ankle ripples, clotted mud and angular salt grains distinguish neighboring terrain states after application. Each infection has its own physical mark alongside its existing glow or motes. |

Source-specific White Heat keeps its white fire and sparks. Statuses sharing a physical material paint it once. Different materials and shoulder seals can coexist. Marks follow their bearer's position; overhead seals and effects such as rising bubbles stay upright as it turns. Status pips and HUD durations still provide detail. On the local player, a distinct HUD silhouette accompanies the existing edge effect. The screen column below records that edge effect, including shared subtle treatments.

## Extending coverage

The [debuff appearance catalogue](../../src/data/debuffLooks.ts) pairs native status IDs with HUD linework, a description and optional body art. Compose an appearance from existing parts, a silhouette coating, posture, a shoulder seal, a stack threshold or a duration-driven attachment. The [elemental materials](../../src/data/ailmentBodyCues.ts) demonstrate related statuses sharing a group. A per-application appearance takes precedence over the status definition's body cue, followed by the catalogue default. A custom status can supply its own `bodyCue` and `hudGlyph`.

The [affliction probe](../../balance/probe_afflictioncues.ts) derives its acceptance list from the live registry. It checks both presentation paths, supported parts, source overrides, simultaneous effects, buildup, expiry, cleanse and co-op reconstruction. Run `node balance/debuff-coverage.cjs` to compare the actual actor pixels with a healthy bearer and generate the full atlas and mixed player samples in `balance/reports/`. For a combat playtest, compare stone and ice against pale ground, watch several seals on small moving targets and try Shock plus Impale while a timed charge is running.

## Inventory

The landing accent lasts briefly. The worn cue lasts with the status. Where a mechanic has its own carrier, attack, terrain, or timer, that can provide additional context. Runtime damage lanes may also intensify the player's screen edge.

| Status | When it lands | While it is worn | Local screen |
| --- | --- | --- | --- |
| Addled (`addled`) | spiral | Misdealt cards at the casting hand | Edge notches |
| Agony (`agony`) | wink | Riven armor over the ribs | Soft edge |
| Befuddled (`befuddlement`) | spiral | Interrupted casting note | Corner hooks |
| Beheld (`beheld`) | wink | Half-open watching eye | Soft edge |
| Bewildered (`bewilder`) | wink | Displaced sight over the aiming shoulder | Soft edge |
| Bleeding (`bleed`) | flecks | Cut and falling drop | Blood drips |
| Blight-Mired (`blightmired`) | wink | Thorny blight snagging the ankles | Soft edge |
| Blinded (`blind`) | wink | Dark band and sealed eyelid across the face | Dark iris |
| Blooming (`blooming`) | wink | Opening bud on the shoulder | Soft edge |
| Bog-Rotted (`bog_rot`) | spatter | Mottled bog rot and a fungal cap | Edge notches |
| Bogged (`bogged`) | wink | Trailing weeds and mud on the heels | Soft edge |
| Bolted (`bolted`) | spiral | Panic tracks scatter outward from the bearer | Soft edge |
| Brine-Burned (`brine_burn`) | spatter | Angular salt grains crusted onto the hide | Edge notches |
| Brittle (`brittle`) | rime | Fine cracks across pale wax | Soft edge |
| Burning (`burn`) | flare | Flames on the body | Kindling |
| Canopied (`canopied`) | wink | Overlapping leaves shade the brow | Soft edge |
| Caul-Mired (`caulmired`) | wink | Clinging folds of membrane | Soft edge |
| Chilled (`chill`) | rime | Pale-blue coat and rime | Frost wash and flakes |
| Contagion (`contagion`) | spatter | Raised pustules with drifting spores | Edge notches |
| Crestborne (`crestborne`) | wink | Crest curling beneath the heels | Soft edge |
| Death Warrant (`death_warrant`) | wink | Sealed warrant above the shoulder | Soft edge |
| Decaying (`decay`) | spatter | Branching violet veins | Edge notches |
| Despair (`despair`) | wink | Eclipsed ward above the bearer | Soft edge |
| Disarmed (`disarm`) | wink | Broken blade beside the striking hand | Soft edge |
| Disoriented (`disoriented`) | wink | Turning spiral eyes | Edge notches |
| Doomed (`doom`) | — | Purple skull plus armed iris, fuse and radius | Curse hooks |
| Doombrand (`doombrand`) | wink | Branded rune with a shortening violet wick | Soft edge |
| Ensnared (`ensnared`) | wink | Netting snagged across the feet | Soft edge |
| Entranced (`entranced`) | stars | Still pearl above a bowed head | Soft edge |
| Exposed (`exposed`) | wink | Anatomical seam and weak-point life band | Soft edge |
| Faintness (`faintness`) | wink | Drifting feather and a slight stoop | Pall |
| Flame-Wreathed (`flamewreathed`) | flare | Flames on the body | Kindling |
| Fog-Veiled (`fogveiled`) | wink | Pale wisps of fog across the shoulders | Soft edge |
| Frozen (`frozen`) | rime | Faceted ice shell | Frost wash and flakes |
| Fulgurweb (`fulgur_brand`) | spark | Forked conductive web across the back | Soft edge |
| Gloom-veiled (`gloomveiled`) | wink | A dark gauze veil | Soft edge |
| Guttered (`guttered`) | wink | Spent wick with a fading ember | Soft edge |
| Harried (`harried`) | wink | Clinging swarm around the shoulders | Soft edge |
| Harrowing (`harrowing`) | wink | Stack-driven quiver strokes above the crown | Pall |
| Heatstroke (`heatstroke`) | flare | Heat ribbons rising off a slumped body | Soft edge |
| Hemorrhage (`hemorrhage`) | flecks | Cut and falling drop | Edge notches |
| Horrified (`horrified`) | spiral | Panic tracks scatter outward from the bearer | Pall |
| Pyreheart (`ignite_attractor`) | flare | Orbiting Pyreheart runes | Soft edge |
| Impaled (`impaled`) | flecks | Lodged metal spikes | Steel spikes |
| Chaos Impale (`impaled_chaos`) | spatter | Lodged metal spikes | Steel spikes |
| Cold Impale (`impaled_cold`) | rime | Lodged metal spikes | Steel spikes |
| Fire Impale (`impaled_fire`) | flare | Lodged metal spikes | Steel spikes |
| Lightning Impale (`impaled_lightning`) | spark | Lodged metal spikes | Steel spikes |
| Physical Impale (`impaled_physical`) | flecks | Lodged metal spikes | Steel spikes |
| Indecision (`indecision`) | wink | A path forking both ways | Soft edge |
| Adrenal (`infected_adrenal`) | wink | Frothing adrenal sacs at the flank | Soft edge |
| Miasmal (`infected_miasma`) | wink | Pale spore vents leaking green fumes | Soft edge |
| Mutant (`infected_mutant`) | wink | Twisted tendril growing from the shoulder | Soft edge |
| Jinxed (`jinxed`) | wink | A tilted die above the head | Soft edge |
| Flopping (`lamprey_flop`) | wink | Curled flopping mark at the tail | Soft edge |
| Living Bomb (`living_bomb`) | wink | Glowing coal with a shortening wick | Soft edge |
| Maddened (`maddened`) | wink | Paired opposing faces | Soft edge |
| Melting (`melting`) | flare | Hanging wax drips | Soft edge |
| Mired (`mired`) | wink | Clotted mud around the feet | Mire wash |
| Mist-Fed (`mistfed`) | wink | Inward wisps at the breast | Soft edge |
| Petrified (`petrified`) | ripple | Solid stone plates and a deep fracture | Pall |
| Petrifying (`petrifying`) | wink | Stone plates spreading over the skin | Pall |
| Poisoned (`poison`) | spatter | Rising green bubbles | Poison haze |
| Powder Charge (`powder_charge`) | flare | Bound powder sticks with a shortening wick | Soft edge |
| Prey-Marked (`prey_marked`) | spiral | Scent print stamped on the hide | Soft edge |
| Queasy (`queasy`) | wink | Knotted gut at the belly | Edge notches |
| Lodged Splinters (`rattled_bones`) | flecks | Short ivory splinters lodged in the hide | Soft edge |
| Reeling (`reeling`) | wink | Staggered footprints and a dipping pose | Soft edge |
| Retching (`retching`) | spiral | A heaving pose and a puff of bile | Edge notches |
| Rooted (`rooted`) | wink | Forked roots pinning both feet | Soft edge |
| Running Dry (`sap_starved`) | wink | Wilting leaf over a bowed stalk | Soft edge |
| Scalded (`scalded`) | flare | Blister in addition to bank-scaled steam | Kindling |
| Scorched (`scorch`) | flare | Flames on the body | Kindling |
| Seabed (`seabed`) | wink | Shell and silt clinging low | Soft edge |
| Seared (`sear`) | flare | Cauterized cross on the wound | Soft edge |
| Seen (`seen`) | wink | Wide open watching eye | Edge notches |
| Seized (`seized`) | wink | Paired grip cuffs at the flanks | Soft edge |
| Shocked (`shock`) | spark | Contact prong and forked sparks | Forked arcs |
| Silenced (`silence`) | wink | Sealed casting rune | Soft edge |
| Slippery (`slippery`) | wink | Skidding heel with two slide marks | Soft edge |
| Smothered (`smothered`) | wink | Low cloud across the eyes | Soft edge |
| Soaked (`soaked`) | wink | Wet sheen and beads of water | Soft edge |
| Sodden (`sodden`) | wink | Heavy wet clumps dripping from the feet | Soft edge |
| Soulfire (`soul_burn`) | flare | Flames on the body | Kindling |
| Soulfrost (`soul_frost`) | rime | Suspended blue slivers | Edge notches |
| Soulstorm (`soul_shock`) | spark | Contact prong and forked sparks | Edge notches |
| Soulvenom (`soul_venom`) | spatter | Rising green bubbles | Edge notches |
| Soul-Chilled (`soulchill`) | wink | Pale soul-wisps flowing along the limbs | Soft edge |
| Spore-Mired (`sporemired`) | wink | Spore bulbs and dust around the feet | Soft edge |
| Star-Seared (`starfire`) | flare | A white-hot streak shedding embers | Kindling |
| Stasis (`stasis`) | ripple | Suspended hourglass | Soft edge |
| Stonelashed (`stonelashed`) | flecks | Chips of stone lodged in the hide | Edge notches |
| Stunned (`stun`) | stars | Stars circling the head | Circling stars |
| Sulphur-Stung (`sulphur_sting`) | flare | Sulphurous fumes off a yellow crust | Kindling |
| Sundered (`sundered`) | wink | Split bronze guard plates | Soft edge |
| Sunscorched (`sunscorched`) | flare | Small sun above the heated shoulder | Soft edge |
| Swallowed (`swallowed`) | — | Victim concealed inside the captor | Soft edge |
| Swimming (`swimming`) | wink | Foam cresting across the body | Soft edge |
| Swooning (`swoon`) | wink | Collapsing step and a deep stoop | Pall |
| Taunted (`taunted`) | wink | Challenge horn | Soft edge |
| Temporal Drag (`temporal_drag`) | ripple | Trailing clock hands | Soft edge |
| Tormented (`torment`) | spatter | Sagging hooks and chains at the feet | Edge notches |
| Transfixed (`transfixed`) | spiral | A glimmer held before the eyes | Soft edge |
| Unhorsed (`unhorsed`) | stars | Tumbled saddle and bent posture | Soft edge |
| Unmade (`unmade`) | wink | A pale body with fragments pulling away | Soft edge |
| Unravelling (`unravelling`) | spatter | Loose threads breaking out of the torso | Edge notches |
| Voided (`voided`) | wink | A split void in the shield-side flank | Soft edge |
| Vulnerable (`vulnerable`) | wink | An open pink seam across the torso | Soft edge |
| Wading (`wading`) | wink | Shallow ripples at the ankles | Soft edge |
| Candlelit (`waxlight`) | wink | Upright candlelight at the shoulder | Soft edge |
| Weakened (`weaken`) | wink | Drooping blade at the flank | Soft edge |
| Widdershins (`widdershins`) | spiral | Backward-turning arrow | Turning chevrons |
| Bled Out (`wilted`) | stars | Shrivelled leaves hanging from a collapsed body | Soft edge |
| Winded (`winded`) | — | Bent posture and breath | Soft edge |
| Winded (`winded_gasp`) | wink | Bent posture with a long breath plume | Soft edge |
| Withering Agony (`wither_agony`) | spatter | Branching violet veins | Edge notches |
