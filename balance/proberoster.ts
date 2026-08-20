// ---------------------------------------------------------------------------
// THE PROBE ROSTER — the standing regression gate as DATA.
//
// balance/probe_*.ts are standalone rigs: each boots the real engine headless,
// prints PASS/FAIL lines and exits 0/1. They were run BY HAND. This roster is
// the registry that turns them into a gate: `npm run probe` (balance/runprobes.ts)
// reads these rows, runs the GREEN ones, and fails if any of them regresses.
//
// THE CENSUS (runprobes.ts enforces it): every balance/probe_*.ts on disk must
// carry EXACTLY ONE row here, and every row must name a file that exists. A new
// probe with no row FAILS the runner loudly — the roster can never silently
// drift behind the directory, and nobody has to remember to enroll a rig.
//
// THE TWO STATUSES:
//   'green'    — runs on the gate. `tier` picks the lane: 'fast' is the default
//                per-push set, 'slow' rides `--slow` / `--all` (nightly).
//   'excluded' — OFF the gate, and the `excuse` says why. NEVER weaken a
//                probe's assertions to move a row from here to green: an
//                excluded row is a debt with a name, not a silenced test.
//
// THE EXCUSES:
//   'red'   — the probe fails deterministically at HEAD. The assertion is the
//             witness; the reason names what it caught. Fix the code (or the
//             stale assertion) and promote the row.
//   'flaky' — the probe passes SOMETIMES on identical input. Unfit for a gate
//             either way: green it would be noise, red it would be a lie. Pin
//             the nondeterminism, then promote.
//
// HOW THE FLAKES WERE FOUND (2026-07-26 at 4be9694, Windows / node 24): every
// probe swept three times at --jobs 4/6, then the whole green lane run eight
// more times, and every probe that ever disagreed with itself re-run ~20 times
// alone to put a RATE on it. Three of the four flakes below survived the first
// three sweeps — one pass is not evidence, so re-sweep before promoting any of
// them. Times quoted are per-probe wall clock under that concurrent load.
//
// THE THIN TAIL, RETIRED (2026-08-01): probe_objectives and probe_straying
// were each seen failing ONCE across ~20 green-lane runs (measured 07-26 at
// 4be9694, BEFORE the governor pin). Both now wear withSeededRandom spans and
// proved 20/20 strict byte-identical — the recorded tail was almost certainly
// the governor's, and the residual stream-chaining is closed. Their rows'
// why-texts carry the heal; the retry law still guards whatever tail remains
// unmapped elsewhere.
// ---------------------------------------------------------------------------

/** Which lane a green probe runs in. */
export type ProbeTier = 'fast' | 'slow';

/** Why an excluded probe is off the gate. */
export type ProbeExcuse = 'red' | 'flaky';

/**
 * One probe. The union FORCES a tier on every green row and an excuse on every
 * excluded one — "named with its reason" is a type error to skip, not a habit.
 */
export type ProbeRow =
  | { probe: string; status: 'green'; tier: ProbeTier; why: string }
  | { probe: string; status: 'excluded'; excuse: ProbeExcuse; why: string };

/**
 * THE ROSTER. Alphabetical, one row per file in balance/. `why` is one line:
 * for green rows, what the rig pins; for excluded rows, why it is off the gate.
 */
export const PROBE_ROSTER: readonly ProbeRow[] = [
  { probe: 'probe_aether_countries.ts', status: 'green', tier: 'fast', why: 'the Aetherial pass — the Galestream course, its gate anchor, the course-only biome law and realm-pool tileset resolution' },
  { probe: 'probe_aiverbs.ts', status: 'green', tier: 'fast', why: 'THE X-VERB CHOREOGRAPHY — x_seek_creep\'s claim walk through the matron\'s real off-claim rule (kind discipline, claim-honest no-ops), x_seek_cloud\'s chase/home/flee over the puff ledger with dressOccupants\' own side filters, x_rally_to_target\'s ring adoption, and the def-side wearer census (every named verb registered, every registered verb worn — nothing ships orphaned)' },
  { probe: 'probe_anatomy.ts', status: 'green', tier: 'fast', why: 'the ANATOMY GAMUT — composite monsters below boss tier, the kit-integrity nets (every monster skill exists, is hinted, is affordable) and the limbreaver fold' },
  { probe: 'probe_annex.ts', status: 'green', tier: 'fast', why: 'THE COMPOSITE BOUND (Secrets Charter Movement I) — one-piece ≡ the re-derived classic clamp bit-exact, dormant admits/attracts nothing, active-union membership + nearest-rim, hull/area folds, the live reveal seam (clampPos/nav/hull re-derive), zone-memory revive, and the pieces wire' },
  { probe: 'probe_annexgrammar.ts', status: 'green', tier: 'fast', why: 'THE ANNEX GRAMMAR (Secrets Charter Movement II) — the mint roll pure f(seed) with chain paths + depth budget + the deep dial, the stamp\'s sealed-chamber leak check + honest approach + regrown grid, the REAL brittle-dwell trigger path into carve/remains/child-face, THE FIND LAW (loot once ever), found-is-found beyond the TTL, the seedless wire, and the closed away-lane hole' },
  { probe: 'probe_applyarm.ts', status: 'green', tier: 'fast', why: 'THE ARMED LIST — armedFamily == the brute-force family scan (the union, THE ORDER LAW\'s identical RNG walk, superset-by-name adversarials, the one invalidate seam) so the per-hit apply_ sweeps stay stream-identical' },
  { probe: 'probe_attunement.ts', status: 'green', tier: 'fast', why: 'the ATTUNEMENT + PUZZLE fabrics — tone read off the ROLLED packet, the worn attuned_<tone> family, and the knock/spill/hum routing laws' },
  { probe: 'probe_biome_share.ts', status: 'green', tier: 'fast', why: 'SURFACE BIOME SHARE — the biome field sampled the way the overworld mints, each biome\'s share of land by distance band' },
  { probe: 'probe_bore.ts', status: 'green', tier: 'fast', why: 'THE VESSEL BORE — flow steering follows a winding tube, rebounds out of dead ends, and confine walls the current to its vessel' },
  { probe: 'probe_butteland.ts', status: 'green', tier: 'fast', why: 'THE BUTTELAND WARDROBE — the savannah natives (guests replaced, identity kept), the kit on standing painters incl. the crop-veil law worn wild, the needles dress/packs/gold tops, mint determinism + the grazing pan\'s court, the rim watch (post + rim duels), one live mint' },
  { probe: 'probe_castreq.ts', status: 'green', tier: 'fast', why: 'THE CAST-TIME REQUIREMENT GATE (#90) — a learned gem below the seat\'s live attributes refuses at the press AND the trigger artery, release always lands, seatless casters + unlearned instances exempt BY CONSTRUCTION, every class kit/merc template clears its class base attrs' },
  { probe: 'probe_cathedral.ts', status: 'green', tier: 'fast', why: 'THE CATHEDRAL OF THE HIGHEST — the registry weave (tileset/recipe/generator/structure/clergy/ascension/gateway) and the cruciform generator\'s own laws' },
  { probe: 'probe_deadface.ts', status: 'green', tier: 'fast', why: 'THE DEAD BASE FACE held closed — PLAIN_FACES membership law (surface-pooled, first face, layout BY REFERENCE), the regrow guard (no surface tileset hides base-only kinds under a variants list), live plain-face rolls with revived kinds, seed-stable face pick + THE PLAIN-WEIGHT DIAL (PLAIN_SHARE-derived weights everywhere, no literals; measured share in band; jungle live; dial-0/dial-1 extremes; the escape hatch)' },
  { probe: 'probe_chargegate.ts', status: 'green', tier: 'fast', why: 'CHARGE DISCIPLINE — the near-discount pick collapse at melee range (soft, residual alive, absent==identical) and the charge kernel\'s GORE FLOOR (balk clock, moments kept, chargeFloor 0 restore)' },
  { probe: 'probe_choices.ts', status: 'green', tier: 'fast', why: 'THE PASSIVE CHOICE FABRIC incl. THE DEAL LAW — an "each" group deals at every node sharing it' },
  { probe: 'probe_civics.ts', status: 'green', tier: 'fast', why: 'THE CAPITAL POLE — "existence guaranteed, address diced" pinned structurally over the capital field bands and the climate anchor/basin seam' },
  { probe: 'probe_cleanwake.ts', status: 'green', tier: 'fast', why: 'THE CLEAN WAKE — the stuck-stats bug: every status removal goes through the canonical splice + "status:*" source cleanup' },
  { probe: 'probe_coherence.ts', status: 'green', tier: 'fast', why: 'the COHERENCE CONTRACT — clearway right-of-way, causeway decking and habitat affinity pinned densely instead of by lucky sweep seeds' },
  { probe: 'probe_cohort.ts', status: 'green', tier: 'fast', why: 'ZoneDef.cohort "authored" — a curated zone\'s population is EXACTLY its authored cohort whatever the world\'s politics do' },
  { probe: 'probe_combo.ts', status: 'green', tier: 'fast', why: 'THE COMBO GRAMMAR + the one sequence matcher — tail seq / counts / vary / repeat / minLen / gate, and the invocation parity fuzz' },
  { probe: 'probe_contagion2.ts', status: 'green', tier: 'fast', why: 'THE INFECTION FABRIC (contagion Movement II) — the strain grammar (mutant reserved at weight 0), the carrier walk deterministic + capped, the eats-plague refusal/wane/eaten-source, the zombie lean applied + reverted byte-exact on a real world, and the legacy snapshot adoption' },
  { probe: 'probe_conversions.ts', status: 'green', tier: 'fast', why: 'THE CONVERSION FABRIC — STAT_TRADES rate/forgo dials and stat links, all under THE GOLDEN RULE (single-hop, pre-forgo baseline)' },
  { probe: 'probe_coopseed.ts', status: 'green', tier: 'fast', why: 'THE CO-OP SEED THREAD — wireSeed\'s untrusted-wire fold (seed 0 kept, junk never collapsing to 0) and the map it buys: a client seeded from the HOST grows the host\'s starter web on both seating roads (welcome + newRun)' },
  { probe: 'probe_corpse.ts', status: 'green', tier: 'fast', why: 'THE CORPSE WAGON — plural finds, summed corpseLifeDamage fuel, echo re-seek and the remains gate' },
  { probe: 'probe_costlevers.ts', status: 'green', tier: 'fast', why: 'THE COST LEVERS (2026-08-10 rulings) — pool-pricing pricedFrom (raw-max default byte-identical under reservation, \'available\' follows the twins, lifePctCur untouched) and the gather BANKED RELEASE (a standing bank fires through the running cooldown, fresh/thin banking and the flag-less shape stay refused)' },
  { probe: 'probe_couch.ts', status: 'green', tier: 'fast', why: 'THE COUCH FABRIC — above all THE SOLO INVARIANT: with no couch seats every branch short-circuits and solo is byte-identical' },
  { probe: 'probe_crusade.ts', status: 'green', tier: 'fast', why: 'THE CRUSADE WARFRONT — unbeknownst ignition off a random charted node and the war\'s march through the real overlay' },
  { probe: 'probe_deepwinter.ts', status: 'green', tier: 'fast', why: 'DEEPWINTER\'s spatial core — the field-born eye (never retroactive, cold ground only, never at sea) and the coldest-first lattice' },
  { probe: 'probe_defenses.ts', status: 'excluded', excuse: 'red', why: 'RED at HEAD (2 fails, deterministic): "unrusted roster is authored in full (6 ranks)" and the compact\'s "(6 seats)" both count 8 — the rosters GREW past the assertion; content drift, not an engine break' },
  { probe: 'probe_descent.ts', status: 'green', tier: 'fast', why: 'THE DESCENT REWORK — the Abyssal Register (reserved weight-0 families), the Ease Law, the Deep Ledger and the Proving Law' },
  { probe: 'probe_dimensions.ts', status: 'green', tier: 'fast', why: 'THE DIMENSION SEAL — the marked gate edge is the one lawful road between sealed world-states; a dimension grows only its own palette' },
  { probe: 'probe_doodadeffects.ts', status: 'green', tier: 'fast', why: 'THE DOODAD-EFFECT ally direction (thicket_heal) — the thicket row carries BOTH halves (target \'ally\' + faction; the inert trap pinned structurally AND behaviorally), the mend lands on wounded kin through the real update loop, never the player, never past maxLife, and a full body never shadows a hurt one' },
  { probe: 'probe_doodadfams.ts', status: 'green', tier: 'fast', why: 'DOODAD FAMILIES — scoped invalidation: a drying pool\'s radius steps no longer rebuild the nav grid (the churn-cascade fix)' },
  { probe: 'probe_douse.ts', status: 'green', tier: 'fast', why: 'THE DOUSE LAW + THE MIRAGE PROMISE — water-family ground sheds sunscorched/heatstroke and the heat loop refuses to bake what the water cooled' },
  { probe: 'probe_dressbudget.ts', status: 'green', tier: 'fast', why: 'THE DRESS BUDGET + THE PALE GARDEN (census D1/D2) — wind-country rows reach their band, the garden grows on both rolls, dressTryMul absent == 1' },
  { probe: 'probe_drove.ts', status: 'green', tier: 'fast', why: 'THE DROVE — the belt law (ignition seats only the surge\'s biomes at/below levelMax) and the drive-them-back-alive payout' },
  { probe: 'probe_effectvoice.ts', status: 'green', tier: 'fast', why: 'THE EFFECT VOICE — every authored fx kind resolves to a registered painter, \'bolt\'/\'meteor\' stay the flags\' reserved voices, and the commissioned reroutes (mortar \'blast\', the four \'scramble\' critters) hold' },
  { probe: 'probe_eventclock.ts', status: 'green', tier: 'fast', why: 'THE WANING LAW — no in-zone event can be held open ad infinitum; the rigs enumerate the registry so future kill-fed defs are covered' },
  { probe: 'probe_fielddiscipline.ts', status: 'green', tier: 'fast', why: 'THE FIELD DISCIPLINE — unlearn/socket/unsocket gate on cold blades through the ONE World.swapRefusal predicate; sanctuary waives all' },
  { probe: 'probe_fleshkit.ts', status: 'green', tier: 'fast', why: 'THE FLESH KIT — the gaze pair both poppable (stalk brittle row + the registry census), live pop parity + the beheld build/drop cycle, and the four flesh formations on-grammar via forced generateLayout' },
  { probe: 'probe_forechart.ts', status: 'green', tier: 'fast', why: 'THE FORECHART — the veiled halo of pre-minted zones, the mint horizon drain, soundings and the omen widening' },
  { probe: 'probe_front.ts', status: 'green', tier: 'fast', why: 'THE ADVANCING FRONT — classic-creep byte-identity when no front lever is set (a pinned pre-change fingerprint) plus directional march' },
  { probe: 'probe_garden.ts', status: 'green', tier: 'fast', why: 'THE GARDEN COUNTRY — biome/field seeding, the four-face staging law and the doodad contracts on the real registries' },
  { probe: 'probe_gloaming.ts', status: 'green', tier: 'fast', why: 'THE GLOAMING — breath unchanged byte-for-byte beside the LIGHT meter, the biting hours, the daylock and the lightwell seam' },
  { probe: 'probe_grab.ts', status: 'green', tier: 'fast', why: 'THE GRAB FABRIC — the registry weave, the refusal ladder, seat geometry, the mass-law policy and the struggle counterplay' },
  { probe: 'probe_groundsnap.ts', status: 'green', tier: 'fast', why: 'THE RATE-CONDITIONAL SNAPSHOT LANE (the gloamwood off40 fix) — steady chunk faults ride the sync bake lane, rebake storms spill to the async bitmap swap holding old faces until the swap lands, crossovers close their bitmaps, dead snapshots close on zone hops, the wedge valve un-dams the pipe' },
  { probe: 'probe_grove.ts', status: 'green', tier: 'fast', why: 'THE GROVE COUNTRY — biome seeding + meld, the staging law (meadow rim → deepwood → heartwood) and the conditioned firefly pour' },
  { probe: 'probe_guardbash.ts', status: 'green', tier: 'fast', why: 'the SHIELD-BASH lane — the arming line as layered data and the bashAt/bashLow tic fields the HUD reads' },
  { probe: 'probe_harborholds.ts', status: 'green', tier: 'fast', why: 'THE HARBORHOLD FABRIC — the assign law (every sea class × tier resolves to a registered hold), the muster, the fall and the prosperity ladder' },
  { probe: 'probe_harborwarden.ts', status: 'green', tier: 'fast', why: 'THE HARBORWARDEN vocation + the company lane — the merc levers through meta/mercs.ts and the world runtime' },
  { probe: 'probe_harvest.ts', status: 'green', tier: 'fast', why: 'THE RESOURCE HARVEST — the seeded boot + sequence, the calm-gated consent press (and the dwell-mode letter), the solo freeze (pause-gate lock, undisturbed bodies, immediate release), the co-op unpaused input law, payout monotone + conserved, the one-shot save round trip, and the spoils/sanctuary seals' },
  { probe: 'probe_hellwar.ts', status: 'green', tier: 'fast', why: 'THE WAR BELOW\'s rolled TRUCE — the 35% pact published into the stance layer, held to breakAt, then shattered and republished hostile' },
  { probe: 'probe_highcourt.ts', status: 'green', tier: 'fast', why: 'THE HIGH COURT — the per-faction presence ladder (champions / zeniths / apexes) and the registry that indexes it' },
  { probe: 'probe_holdfast_guardian.ts', status: 'green', tier: 'fast', why: 'THE GUARDIAN FACTION (the bandit ruling\'s third act) — the relation-less roadwarden_toll stamp acquits warden-vs-camp BOTH directions, the rouse swaps true bandit colors, the warden honestly joins the fight, the cool-down + parley + pay lanes hold' },
  { probe: 'probe_holdfast_pocket.ts', status: 'green', tier: 'slow', why: '~30s: THE HOLDFAST POCKET across many seeds — purchased ground behind a toll must be worth the toll and never a death trap' },
  { probe: 'probe_hollows.ts', status: 'green', tier: 'fast', why: 'THE HOLLOWS — pockets generate sealed (non-walkable, seam-zipped) and a reveal carves the way in' },
  { probe: 'probe_hunt.ts', status: 'green', tier: 'fast', why: 'THE HUNT — the whole roving-beast lifecycle on the real engine: the package contract (chase = ≥1 survivable flee phase per quarry), ignite + the seat law (overlay-grain deterministic), the trail walked (footprint drop/read/re-place, no immortal litter), the stand → flee → cross-zone migration with health+phase preserved, the kill rule, the save laws, and the hunt-vs-scent trail separation' },
  { probe: 'probe_infostream.ts', status: 'green', tier: 'fast', why: 'THE INFO STREAM — the notice-channel and float-kind registries, the pickup ledger\'s coalescing per-seat rows and the wire round trip' },
  { probe: 'probe_infrequents.ts', status: 'green', tier: 'fast', why: 'MONSTER INFREQUENTS — the theme triangle held whole (every resolved theme names >=2 dropWeight-0 tagged bases + a tag-gated affix family), the commissioned eight defs resolve, pickThemedBase pool purity, and the seeded live mint through world_gear (theme pool in, no cross-theme leak, no un-themed stray)' },
  { probe: 'probe_ironbell.ts', status: 'green', tier: 'fast', why: 'THE IRON BELL — hitCap, the per-hit defense-texture ceiling that clamps a landed hit and reads honestly' },
  { probe: 'probe_lairs.ts', status: 'green', tier: 'fast', why: 'THE LAIR FABRIC — the registry weave (landmark/mouth/sidezone/den tileset/natives/hoard/look all resolve) and THE SEAT fold' },
  { probe: 'probe_lite.ts', status: 'green', tier: 'fast', why: 'THE LITE TIER — pool spawn/free/reuse, the capacity refusal, kind resolution off MonsterDef.lite and the promotion boundary' },
  { probe: 'probe_liturgy.ts', status: 'green', tier: 'fast', why: 'THE LITURGY — the call/response pair, the Responsory grammar and the delayedBurst harm+mend' },
  { probe: 'probe_lonecrypt.ts', status: 'green', tier: 'fast', why: 'THE LONE CRYPT kit — the strike exhumation, the riddle-sealed mouth (sealedBy), the resident lottery\'s purity and the yard\'s corridor math' },
  { probe: 'probe_mass.ts', status: 'green', tier: 'fast', why: 'THE MASS & AUTHORITY FABRIC — the weight derivation law, shove authority, wall wounds and the bowling lane' },
  { probe: 'probe_massif.ts', status: 'green', tier: 'fast', why: 'THE MASSIF FABRIC — the weave law, the heal, the courts, the block textures and the placement law pinned structurally' },
  { probe: 'probe_meadowmere.ts', status: 'green', tier: 'fast', why: 'THE MOONLIT MERE — the meadow\'s grotto lane (one entryway, one set-piece under-lake), the condition-held ephemerality through every phase, the underLane lair rung, and HER LAYER-HONESTY LAW live: invisible and untouchable from the surface story, real one story down' },
  { probe: 'probe_mercs.ts', status: 'green', tier: 'slow', why: '~27s: THE MERCENARY MARKET LAWS — the wilds commission, the retinue, retirement and the hire economy end to end' },
  { probe: 'probe_mimic.ts', status: 'green', tier: 'fast', why: 'THE MIMICRY FABRIC — policy defaults, the explicit allow/deny lane, structural refusals that beat an allow, and the capture path' },
  { probe: 'probe_mireille_lesson.ts', status: 'green', tier: 'fast', why: 'MIREILLE\'S FLASK LESSON — the gift arc end to end, then every way a finished lesson must STAY finished' },
  { probe: 'probe_mount.ts', status: 'green', tier: 'fast', why: 'THE MOUNT FABRIC — the registry weave, seat geometry, the unhorsed beat and the remount rule as pure data' },
  { probe: 'probe_myceliafront.ts', status: 'green', tier: 'fast', why: 'THE SPORE FRONT (mycelia Movement I) — the anchored claim tree, the fragmentation law, the eased sporefall window through the real skyFront + dress (dissolves whole), the eats-plague seam stub, absent==identical, and legacy mobile-bloom save adoption' },
  { probe: 'probe_mountain.ts', status: 'green', tier: 'fast', why: 'THE MOUNTAIN COUNTRY — the geoAffinity fold (per-range snow lock) and the depthAffinity climb staging' },
  { probe: 'probe_murmuration.ts', status: 'green', tier: 'fast', why: 'THE FLOCKING FABRIC — THE ONE MATH: weaveOffset golden values and weaveVel as the analytic derivative shared with projectiles' },
  { probe: 'probe_nan_hunt.ts', status: 'green', tier: 'slow', why: '~60s (the whole content surface swept): NON-FINITE HUNT — catches the first bad number at the source, the shape of the createRadialGradient crash' },
  { probe: 'probe_objectives.ts', status: 'green', tier: 'fast', why: 'THE OBJECTIVE FABRIC — the per-kind census, the contest law (build/stall/drain), the recon cap and the besieged-waypoint round trip; the 07-26 thin tail healed 2026-08-01 (seeded span — 38 strict greens, check lines byte-identical)' },
  { probe: 'probe_occurrences.ts', status: 'green', tier: 'fast', why: 'THE OCCURRENCE FABRIC — the doctrine parity (an occurrence court is byte-identical to a plain court of its face), the dwell/telegraph/spring lifecycle, one-shot zone memory with the seeded wound replant, the capped fixture pour and the quickened-level anchor' },
  { probe: 'probe_overdrive.ts', status: 'green', tier: 'fast', why: 'THE OVERDRIVE DEBT ECONOMY (#348) — costs refuse without a lane; an open lane books the shortfall as mirrored reservation (mana-first, the wait re-armed per booking, pool-paid casts book nothing); the cap refuses past the ceiling; the debt lock holds off-press AND unlearn; repayment frozen through the breather then frame-mirrored to an exact zero (Controlled Burn trickles during the wait at the taxed rate); the life lane books WHOLE and never kills, heals capped at the mortgaged ceiling; one lane per pool; close releases clean; the seeded trajectory replays byte-identical' },
  { probe: 'probe_pack.ts', status: 'green', tier: 'fast', why: 'THE PACK LAYER — what is DRAWN of the social machinery is exactly what is TESTED (bondFrom, aiNerve, wardTo)' },
  { probe: 'probe_packtempo.ts', status: 'green', tier: 'fast', why: 'THE PACK TEMPO (alpha-strike discipline) — the zone-entry desync (staggered volleys, first body clean), the per-prey in-flight budget (cap, never a ban), range-band pick curves (near < mid, far taper, un-banded control at full weight), cast slack (readiness gets a human beat) and stun tempering (bound prey reads stun-capable casts at a fraction) — plus the flat-zones census: exactly the three debut wearers dialed' },
  { probe: 'probe_partylanding.ts', status: 'green', tier: 'fast', why: 'THE PARTY-LANDING LAW — World.landPartyAt moves the whole party, not the seats alone (carried minions land with their keeper)' },
  { probe: 'probe_painterparams.ts', status: 'green', tier: 'fast', why: 'THE PARAM CONTRACT — painters declare their required params as data (registerPainterParams); every DOODAD_VISUALS row satisfies its painter, and a painter with required params cannot be forgotten into silence' },
  { probe: 'probe_pathpref.ts', status: 'green', tier: 'fast', why: 'THE WAYFARING FABRIC — registry pricing, uniform byte-parity, weighted detours + relish, the self-preservation veto at void bands and pit doodads (the stalwart specimen: wolf body, temperament stripped), THE CAUSEWAY FOLD (groundAt laid/severity/overruns), and the packDriveOf regression pin: a squadless wolf reads its OWN belly, so the fed-pack rule can never again hold a lone hunter 60% blind (the old red — THE PACK LAYER left squadless packAgg undefined and both readers coerced it to 0)' },
  { probe: 'probe_persistence.ts', status: 'green', tier: 'fast', why: 'CHARACTER PERSISTENCE — the body saveCharacter actually WRITES: the immortal vessel lifecycle (roster-slot baseline/autosave/durable → card round trip → loadRosterSave → resume → save again), byte parity between the zones-memo splice and a plain stringify, the rawJSON array-refusal that silently ate every save 07-23..07-31 (a6c5eb3), the loud-failure law, and the mortal Continue' },
  { probe: 'probe_pitfall.ts', status: 'green', tier: 'fast', why: 'THE PITFALL FABRIC — pit-family falls route through the ONE resolver (pitPolicyFor: theme.pitfall → cave default → the authored word), the rent falls to the abyss row, the brittle give-way hears the zone\'s same word; the old red was RIG geometry (pit blob laid blind on cave rock), not an engine debt' },
  { probe: 'probe_placedeterminism.ts', status: 'green', tier: 'fast', why: 'THE SEEDED FALLBACK — a load-time placement stays a pure function of the zone seed even when the POI pool runs dry (interactSpot\'s far-point road consults the true die ZERO times), while the ~70 event callers keep their fresh roll' },
  { probe: 'probe_plies.ts', status: 'green', tier: 'fast', why: 'THE PLY FABRIC — the magnitude-blind eat (a 500-damage slam and a gnat nip each cost one ply) and the dual live pool DoTs pierce to' },
  { probe: 'probe_portal_contract.ts', status: 'green', tier: 'fast', why: 'THE PORTAL-CLEAR CONTRACT — levelgen\'s carve and genqa\'s invariant exempt the SAME set (keep-tagged waivers, doors, plan rects) and nothing else' },
  { probe: 'probe_possession.ts', status: 'green', tier: 'fast', why: 'THE POSSESSION SEAM — the pure policy lanes (structural refusals, allow/deny, the rarity ladder) and the swap through a real seat' },
  { probe: 'probe_pours.ts', status: 'green', tier: 'fast', why: 'THE FLASK REDESIGN — the two-stream sip (surge fixed floor + settle growth), stacking conservation, the once-per-drink pct law, the lane dials + adrenal_decant\'s honest gate, thirst at true full, THE PRIMED POUR bank/release/dissolve, the tagged flask clock, stream overmend, and the lucky pour\'s one roll per sip' },
  { probe: 'probe_puzzles.ts', status: 'green', tier: 'fast', why: 'THE PUZZLE FABRIC\'s repertoire — the preset/fixture census plus tempo / accord / ember driven through the real knock queue' },
  { probe: 'probe_quickening.ts', status: 'green', tier: 'fast', why: 'THE QUICKENING — the surge window, the live re-mint at both edges, the exact revert and the SLAYER lane folds' },
  { probe: 'probe_radiance.ts', status: 'green', tier: 'fast', why: 'RADIANCE / SPANS / COMET LANE — radianceOf is pure and honest (noon 1, midnight ~0, rain dims, shelter flattens) and spans hold on it' },
  { probe: 'probe_rampage.ts', status: 'green', tier: 'fast', why: 'THE RAMPAGE FABRIC + THE SETTLED GROUND — the fell census, the plow, the guaranteed regrowth and roam.venue "ground"' },
  { probe: 'probe_readers.ts', status: 'green', tier: 'fast', why: 'THE READERS (the mantid school) — five stances, the noDrop kit, the molting ground and the READABLE-BLUFF law' },
  { probe: 'probe_reckoning.ts', status: 'green', tier: 'fast', why: 'THE RECKONING — the strict mortal exchange (change-law wallet spend, value conserved to the unit), the investment lane + applyUnlock compat, the 1-essence first exchange, the seal, and the chronicle\'s protected cap' },
  { probe: 'probe_relief.ts', status: 'green', tier: 'fast', why: 'THE RELIEF FABRIC — elevation and traced rivers pinned structurally, so the foreordained-terrain contract holds by assertion' },
  { probe: 'probe_salvagemode.ts', status: 'green', tier: 'fast', why: 'THE BREAKER\'S EYE — the keeper\'s mark (salvageLock) refuses single salvage and every salvageBulk sweep skips it; sweeps pay exactly the previewed yield sums, pry sockets into the loose bag, spare granted sparks; worn gear structurally out of reach; the mark\'s save + wire fidelity' },
  { probe: 'probe_sandregent.ts', status: 'green', tier: 'fast', why: 'THE SAND REGENT\'S PHASE SCRIPT — the Unsealing capstone\'s HP ladder driven by REAL blows: each rung fires exactly once (a heal + re-cross re-fires nothing), the def\'s husk counts seat on the authored ring with the announce surfaced, one overkill blow enters the DEEPEST rung alone (the shallow rung skipped for good), and the fight completes to a credited kill' },
  { probe: 'probe_scenes.ts', status: 'green', tier: 'fast', why: 'THE SCENE FABRIC — the Prologue walked end to end the way a brand-new account lives it (off-graph staging, the covenant, no run save)' },
  { probe: 'probe_seas.ts', status: 'green', tier: 'fast', why: 'THE SEA FABRIC — THE FOREORDAINED TENET: a sea is a pure, entry-invariant function of the seed; plus the landing law' },
  { probe: 'probe_segments.ts', status: 'green', tier: 'fast', why: 'THE SEGMENT FABRIC against its debut consumer (Vhorun) — per-segment wound pools that tear permanently and retaliate' },
  { probe: 'probe_settled.ts', status: 'green', tier: 'fast', why: 'THE SETTLED BELT — farmland + metropolis pinned structurally over the biome/tileset/door rows, not by lucky sweep seeds' },
  { probe: 'probe_sheet.ts', status: 'green', tier: 'fast', why: 'THE SHEET CATALOG — every seated id exists in STAT_DEFS, statics seated-or-omitted with blurbs, family seats + the show-all census (healed by THE SHEET SPEAKS THE WHOLE BUILD: the 27 missing seats landed)' },
  { probe: 'probe_sightveil.ts', status: 'green', tier: 'fast', why: 'THE SIGHT VEIL — the drawn veil\'s geometry and query contract against the EXACT path builders draw() fills' },
  { probe: 'probe_skillpreview.ts', status: 'green', tier: 'fast', why: 'THE PREVIEW FABRIC — every rolled hit lands inside the band the tooltip drew, and the shown cooldown/cost/counts/ailment odds ARE the engine\'s own (the anti-drift law: a display that lies fails here, not in a player\'s face)' },
  { probe: 'probe_slotgraft.ts', status: 'green', tier: 'fast', why: 'THE WORN GRAFT — slotGraftStat, the recalcSeat injection, the rolled catalog and The Rote Hand\'s honestly-dormant line' },
  { probe: 'probe_soulriver.ts', status: 'green', tier: 'fast', why: 'THE RIVER OF SOULS — the strewn deal (pure f(seed), no gate) with PAINT == FUNNEL pinned end to end' },
  { probe: 'probe_speech.ts', status: 'green', tier: 'fast', why: 'THE SPEECH FABRIC — the wrap/reveal/fold laws against the same pure functions the renderer draws from, and the veil query that gates them' },
  { probe: 'probe_spent.ts', status: 'green', tier: 'fast', why: 'THE SPENT AND THE ROOTED — every reserve row validates, every claim names live ground, and the census names any body that spends' },
  { probe: 'probe_spoils.ts', status: 'green', tier: 'fast', why: 'THE SPOILS LAW — on sealed ground a credited kill mints NOTHING, while owed pay and owned movement always pass' },
  { probe: 'probe_squish.ts', status: 'green', tier: 'fast', why: 'THE SQUISH FABRIC — death underfoot: the tread, the mass gate + per-def ratio dial, the worm-file tenderness, the shoulder exemption, faction-blindness and the true-ant rescale' },
  { probe: 'probe_strata.ts', status: 'green', tier: 'fast', why: 'THE STRATA FABRIC — cave-face pools by depth × anchor provenance (cavern leads groves at plurality ≥45% — re-pinned for the garden\'s authored rootways share; magma/rime/marine claim their countries; the marine trench never floods landlocked ground); the old off-by-one red was a strict-majority pin predating the rootways dilution' },
  { probe: 'probe_straying.ts', status: 'green', tier: 'fast', why: 'THE STRAYING — the belt law (ignition seats only the surge\'s biomes at/below levelMax) and the farmland scene block; the 07-26 thin tail healed 2026-08-01 (seeded spans — 38 strict greens, check lines byte-identical)' },
  { probe: 'probe_supportfabric.ts', status: 'green', tier: 'fast', why: 'THE SUPPORT-FABRIC LAWS — the self-lifting mechanism gate, the equip-global fold, the kindred/inheritance rules, the crew lane end to end (RIG O) and the melee tail (RIG P). HEALED 2026-07-27: the H4 flake was one-draw evidence under a true ×1.5 law, not a sick fabric — the rig now runs in ONE seeded span (withSeededRandom: no other rig\'s stream moves) and each arm reports a 12-sample MEAN, assertion untouched; byte-identical over 12 consecutive runs, ~6s' },
  { probe: 'probe_supportmatrix.ts', status: 'excluded', excuse: 'flaky', why: 'FLAKY (1 fail in 37 observed runs, ~25s): "I2 the ambient trickle: a carried Requiem banks wakeflame with no other source — banked=0 after 60s"; the rig comments that lane "(Seeded: deterministic per seed.)" and the stray red says it is not — rare, so a gate here would lie ~3% of pushes' },
  { probe: 'probe_swarm.ts', status: 'green', tier: 'fast', why: 'THE COLLECTIVE PASS — THE REGROWTH LAW: an unmolested pour pocket trickles back to its cap and every tear stamps the quiet clock' },
  { probe: 'probe_sympathy.ts', status: 'green', tier: 'fast', why: 'THE SYMPATHY FABRIC — the tamed flask/orb bond, keeper-support potency, the charge echo and the one-depth discipline' },
  { probe: 'probe_tells.ts', status: 'green', tier: 'fast', why: 'THE TELL FABRIC — every shipped tell row names a live source, bands its unbounded reads and wears a painter that resolves' },
  { probe: 'probe_theater.ts', status: 'green', tier: 'fast', why: 'THE THEATER FABRIC — the zone-event lane re-founded: keyed-draw purity + zero global-die consumption, the dead first-bite cascade (drawn == tested), kind priority, the resident law\'s arcless/unannounced/quiet gates, the pour ledger (additive cap-stop + the replacement band\'s farm law), the dwell cadence, the concurrency writer seam, the pass-through march, and the legacy siege\'s whole cast with no payout arc' },
  // PROMOTED 2026-08-07 (the MI-levers pass): the excluded red was a DIRTY
  // ARENA, not the fabric — the gauge section's prey zombie camped the
  // keeper and ate each trickle refill the moment it minted (isolation rig
  // + in-position diagnosis: the beat fired and re-armed exactly on law).
  // The rig now quiets the arena after the gauge hits; assertions untouched.
  { probe: 'probe_throng.ts', status: 'green', tier: 'fast', why: 'THE THRONG FABRIC + THE LATCH + THE WORN ANCHOR — sight/claims/batch law/cap fold/sweep orders, the latch, combat sources, meta delegation, disband/restore, the lever gems + ply levers, the RECURRING BROOD re-arm law, and the item-granted untamed brood end to end (equip → rank fold → dormant clutch → innate claim → self-hunting drive → re-wild on unequip)' },
  { probe: 'probe_tiers.ts', status: 'green', tier: 'fast', why: 'THE TIER FABRIC — the region rows (incl. N-story terrace/ramp families), the crossing law over arbitrary spans, the elevation law, and THE BAND LAW (tether bands vs. masonry, per touched body)' },
  { probe: 'probe_timeflow.ts', status: 'green', tier: 'fast', why: 'THE TIMEFLOW FABRIC\'s castChrono bridge — BOTH consumers (the SkillDef.chrono door and the { do: \'chrono\' } script verb), the refresh law, raw-clock expiry, the Unmade\'s debut reveals through the real FSM, and the brevity census' },
  { probe: 'probe_tracks.ts', status: 'green', tier: 'fast', why: 'THE TRACK FABRIC — the pure resolver\'s geometry (loop closure, pingpong mirror, pause plateaus, phase spread) and clock-purity' },
  { probe: 'probe_transience.ts', status: 'green', tier: 'fast', why: 'THE TRANSIENCE DOCTRINE — THE WARP LAW: every warp keyed, reconciled and decaying, while the mint path samples the BASE field' },
  { probe: 'probe_trapworks.ts', status: 'green', tier: 'fast', why: 'THE TRAPWORKS FABRIC — the pure trigger law (feet-press pad, tripline capsule) and the ONCE-lane resolver with presser credit' },
  { probe: 'probe_ugspan.ts', status: 'green', tier: 'fast', why: 'THE SPANNING UNDERGROWTH (the rooted web) — both extreme regimes at forced dials (everywhere-thin link fabric, one-great-web chaining), the rootheld set-piece\'s sealed-yet-connected citizenship, absent==identical, and the WALKED crossing (dwell → shared pocket → far mouth, veil + ledger + byte-identical def from either door)' },
  { probe: 'probe_unlocks.ts', status: 'green', tier: 'fast', why: 'THE DISCOVERY WEB + THE MOOT LAW — non-starter classes stay shrouded rumors until FOUND, played into, or chained onto' },
  { probe: 'probe_vendorlocker.ts', status: 'green', tier: 'fast', why: 'THE PATRON\'S HOLD — the reserve ladder, the standing order\'s true odds, the beat law and the gatework chain' },
  { probe: 'probe_voidframe.ts', status: 'green', tier: 'fast', why: 'THE VOID FRAME\'S CONTRAST GUARD — the rim\'s derived tones read apart on every theme (the Aetherial\'s crest sat 0.0006 luminance from its own skirt), and the 89 themes that already read stay BYTE-IDENTICAL' },
  { probe: 'probe_wakeflame.ts', status: 'excluded', excuse: 'flaky', why: 'FLAKY (3 fails in 22 observed runs): "vigil drank a flame as upkeep — 2 → 2" — the vigil upkeep tick sometimes misses the sampled window; probe_supportmatrix I2 (a Requiem banking no wakeflame) reads as the SAME nondeterminism seen from another rig, so suspect one unseeded clock under the shed/magnet/vigil loop' },
  { probe: 'probe_wallpress.ts', status: 'green', tier: 'fast', why: 'the WALL-PRESS contract — a body pressed into a grid-carved wall HOLDS THE FACE: no oscillation, no cell-center pops, crowd or not' },
  { probe: 'probe_warfront.ts', status: 'green', tier: 'fast', why: 'THE WARFRONT COUNTRY + THE BOMBARDMENT FABRIC — the hell-only biome seat, the staging law and the standing guns\' own clocks' },
  { probe: 'probe_watchers.ts', status: 'green', tier: 'fast', why: 'THE WATCH FABRIC — every watcher validates, the Barrow Watch trio stands, and the drawn fan re-folds the scan\'s OWN stamped scalars' },
  { probe: 'probe_webperf.ts', status: 'green', tier: 'fast', why: 'THE SETTLE SWEEP\'s COST LAWS — the whole-chart settling pass pinned cheap (work counts, never wall clock) after the N² regression' },
  { probe: 'probe_webqa.ts', status: 'green', tier: 'slow', why: 'THE WORLD-WEB LAWS end to end (3 seeds × 11 rounds + quests/settle/halo/horizon) — minutes-long by nature; its old red ("C: 7/8 re-floods agree") healed by THE RAGGED DOORWAY, 8/8 today' },
  { probe: 'probe_wisplight.ts', status: 'excluded', excuse: 'flaky', why: 'FLAKY (5 fails in 10 observed runs — the loudest of the four): G10-G12/G16 cascade off "the light rides the STRONGEST body in reach", which picks the fen_hound over the level-18 weaver about half the time; the seek/ride window is not deterministic' },
  { probe: 'probe_workshop.ts', status: 'green', tier: 'fast', why: 'THE WORKSHOP (the Entity Forge\'s store) — the NAMESPACE LAW both directions: grafts refuse unprefixed ids, shipped content never squats the prefix' },
  { probe: 'probe_worldbossloot.ts', status: 'green', tier: 'fast', why: 'THE SOVEREIGN HOARDS — every world boss names its OWN resolvable loot table, the generic KillCtx.dropLootTable verb lays all three result kinds through the drop primitives, and the seal still refuses on spoils-none ground' },
  { probe: 'probe_zonepolicy.ts', status: 'green', tier: 'fast', why: 'ZONE POLICY — the layout half beside the biome half through the ONE policyFor seam: the shipped-empty layout table is byte-identical to biome-only (exhaustive biome × layout × id A/B against the old logic), authored deny/allow rows AND both ways, and eventTargetable/holdfastHostable route the composed verdict' },
];

/** Green rows — the gate — optionally narrowed to one lane. */
export function greenProbes(tier?: ProbeTier): ProbeRow[] {
  return PROBE_ROSTER.filter(r => r.status === 'green' && (!tier || r.tier === tier));
}

/** Rows kept off the gate, optionally narrowed to one excuse. */
export function excludedProbes(excuse?: ProbeExcuse): ProbeRow[] {
  return PROBE_ROSTER.filter(r => r.status === 'excluded' && (!excuse || r.excuse === excuse));
}
