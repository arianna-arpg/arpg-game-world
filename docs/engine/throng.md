# THE THRONG FABRIC — the swarm you gather

`src/engine/throng.ts` (specs, config, pure math) + the marked THRONG block in
`src/engine/world.ts` (boot/claim/sources/sweep executors) +
`src/engine/cling.ts` (THE LATCH — the Pikmin blow, a fabric of its own).
Probe: `npx tsx balance/probe_throng.ts`. Dev levers: the **Throng** dev tab.

The Pikmin/Overlord playstyle as open data. One skill anchors one throng
(`SkillDef.throng`): slotted, it REVEALS its kind's unclaimed husks in the
world — only to that viewer — and walking through one CLAIMS it into the
roster; cast, it channels the DIRECT SWEEP that re-aims the whole roster at
the cursor every pulse. **Collection is the mechanic**: the army is found,
spent by attrition, and steered by a held key.

## The spec

```ts
SkillDef.throng = {
  monsterId: 'cinderkin',   // the gathered body (MonsterDef id)
  cap: 10,                  // base roster cap — folded through the OWNER's
                            // minionMaxCount with the skill's own tags, so
                            // +1-minion investment and Endless Swarm grow the
                            // throng with NO throng-specific stat
  sources: [...],           // HOW bodies appear — the playstyle axis
  direct?: { radius, linger },  // sweep tuning (defaults THRONG_CFG.direct)
  batch?: 5,                // batch-normalization denominator override
}
```

The anchor skill is an ordinary channel (`castMode: 'channel'`, effects
`[{ type: 'throngDirect' }]`): each pulse re-fires the sweep at the tracked
cursor. Tags `['minion', 'summon', …]` admit minion supports on the HOST lane.

## Source rows (`ThrongSourceRow`) — the playstyle axis

| row | grammar | the playstyle it makes |
|---|---|---|
| `pocket` | `perZone`, `cluster`, `chance` — finite finds rolled per zone at boot | the PRECIOUS army: hoard, spend, mourn — the world runs dry where you've reaped |
| `motes` | `every`, `at: near/far/lastKill/mixed`, `ttl` | the wandering herd: bodies condense on a clock, evaporate unclaimed |
| `onCrit` | `chance`, `icd` | the executioner's court: your best blows shake bodies loose |
| `onKill` | `chance` | the reaper's wake: corpses give up their husks |
| `gauge` | `per: hit/minionHit/both`, `fill`, `yield` | THE ADD-LESS BOSS FALLBACK: traded blows fill a gauge that mints at 100 |
| `trickle` | `everySec`, `at: near/roster` | THE RECURRING BROOD: one body per clock below cap — a husk at your feet ('near', the stoop kept) or straight into the roster ('roster', the true replenish-per-second); DISARMED at cap, re-arms with a full wait on a loss |

A new source kind = one union row + one branch in the world executors.
One `motes` row per skill and one `trickle` row per skill (the first wins).

### Graftable sources (`SupportDef.throngSource`)

A socketed gem ADDS a source row to its anchor — the world-found Palewisps
learn a battle gauge (`hidden_reserves`), any brood learns to trickle
(`patient_brood`). Every consumer resolves rows through
`World.throngSources`: AUTHORED rows first — their pocket indices, and the
run-long claim keys built on them, can never shift under a gem — then
grafts in slot order. Graft gems gate on the `'throng'` capability tag,
FOLDED at registry load onto every anchor (the construct fold's sibling),
so they never socket into a skill with no roster to grow. The graft is
seat-bound (the tameMod precedent): source executors read the KEEPER's bar
instance, and throng bodies take no forwarded gems anyway.

### The find levers (stats — gems, passives, affixes all reach)

- **`throngPockets`** (flat): extra pockets APPENDED per zone after the
  authored rolls — the first pocket row (authored or grafted) supplies the
  shape, the zone's own scarcity `chance` still gates, and authored spots
  never move (probe-pinned: the append law).
- **`throngYield`** (multiplier): bodies per MINT EVENT — pocket clusters,
  gauge yields, mote clutches, trickle drops, crit/kill raisings — through
  ONE fold (`throngYieldCount`), quanta-rounded, never below 1.
- Boot-stream discipline: pocket HEARTS draw from the anchor's main salted
  stream in fixed order; cluster size and seat scatter ride a per-pocket
  FORKED stream, so a yield-grown cluster can never shift the next
  pocket's heart. Find levers change counts, never maps.

### The ply levers (the whole summon family, not just throngs)

- **`minionPlies`** (flat, quanta — never batch-scaled): extra plies at the
  bake; a plied-LESS body (a skeleton) GROWS ITS FIRST — the bake stands
  the fabric up with a zero-count spec, so hit-counted armor is a build
  choice on any court (`chitinous_brood`).
- **`minionLifePlyTrade`** (threshold): every this-much of the owner's
  minion-life INCREASE becomes +1 ply instead, consuming the increase
  (`calcified_vigor`: +70% life, threshold 0.5 — one ply and a 0.2
  remainder out of the box, sharper per-ply because the renouncing pays).
  The trade reads PRE-batch investment (the quanta law's symmetry: plies
  never batch-scale, so the life becoming them is never batch-diluted —
  a throng body calcifies at the classic price); the remainder folds
  through the ordinary batch scale.
- **`minionLifePlyEcho`** (threshold — the trade's ADDITIVE sibling):
  every this-much of the increase ALSO sets a ply with the life KEPT
  whole (`marrowbound_vigor`: +90% life, threshold 0.9 — the full 90%
  stands AND a ply grows beside it). Priced above the trade's threshold
  precisely because nothing is renounced — scale one avenue hard, or two
  at once at the gentler rate. LOOP-FREE BY CONSTRUCTION: both threshold
  lanes read ONE pre-trade baseline in a single bake pass (the stat-link
  golden rule's shape), only the trade consumes, and plies never feed
  back into the life that granted them; the live rebake re-derives from
  the def, so nothing accrues (probe-pinned idempotent). Threshold
  divisions carry a 1e-9 epsilon — buying EXACTLY the threshold is never
  robbed by the 53rd bit. The sheet-stat siblings of these threshold
  lanes are the CONVERSION FABRIC's trades and links —
  `docs/engine/defenses.md`.

## Husks, claims, finiteness

- A HUSK is a planted scenery-actor of the throng kind: `passive` +
  `untargetable` + `invulnerable` + `noBounty` (the extraction-node armor),
  `Actor.throngWild = monsterId`. Nothing targets it, nothing splashes it,
  wind and knockback pass it by; the renderer's untargetable lane draws it
  ghostly (0.55 alpha) — the "waiting" read comes free.
- SIGHT: `drawActor` early-returns unless the LOCAL bar anchors the husk's
  kind (`throngSightSet` — per viewer; the `tw` snapshot field carries the
  marker so co-op clients gate their own POV).
- CLAIM: within `THRONG_CFG.collect.reach` of an attuned keeper with cap
  room, the husk quietly goes and a REAL minion of the kind is minted in
  its place **at the claimer's level**, anchored `'__throng:<skillId>'`
  (the `'__companion:'` convention — sweep-exempt, `minionServes`-visible,
  portal-crossing like any owned body).
- POCKETS are FINITE run-long: each seat carries a claim key
  (`zoneId#skillId#pocket.seat`) remembered in `World.throngClaimed` (the
  completedObjectives idiom — outlives zone memory and the campfire),
  serialized with the character. Pocket rolls ride a per-skill salted
  stream (`zoneSeed ^ THRONG_CFG.salt ^ throngSkillSalt(skillId)`) whose
  SHAPE is fixed (every draw happens whether or not a mint is due), so
  bar churn can never shift another skill's spots and the keys stay honest.

## The direct sweep

`throngDirect` (fired per channel pulse) issues `assault` orders through the
command fabric to every roster body: mark = the cursor, a foe within
`direct.pin` becomes the PINNED quarry, orders linger `direct.linger` after
release then the throng heels. Obedience, the ordered-quarry override and
the heel exemption all come free from ai.ts. Redirecting mid-ride peels
riders off one mark and throws them at the next.

## Idle life

Heeling throng bodies keep THE LOOSE RING (`throngHeelOffset` — a stable
per-body seat on a slow orbit, `THRONG_CFG.heelRing`): the cloud trails as
a cloud, never a conga dot. Combat steering is the body's own brain
(`swarm` press, flock murmuration on the gnats).

## THE LATCH (`engine/cling.ts`) — the Pikmin blow

`MonsterDef.cling?: ClingSpec` — ANY monster can be a clinger. Latching
replaces MOVEMENT, never combat: on reaching striking distance of its
target (`CLING_CFG.attachPad` is sized to swing reach — the seat-snap IS
the lunge), the body attaches to a seat on the victim's rim
(`Actor.clingTo`), position slaved every tick AFTER all movers (drawn ==
held), and keeps casting its own kit through the one pipeline. Levers:

- SEATS: `floor(victim.radius / radiusPerSeat)` capped `maxSeats` — bosses
  wear a coat, littles shrug off crowds; overflow riders fight at the rim.
- SHAKE: every ride ends on `spec.shakeSec`; the shaken hop off and wait
  `reattachGrace`.
- SCRAPE: riders are ordinary brittle bodies ON the victim — AoE peels them.
- KNOCKBACK: any real shove on a rider releases it first (`pushActor`).
- `rideStatus`: the victim wears it per rider on the ride clock — the
  gnats' stacking `harried` (aim + attention spoiled, 6-stack ceiling).
- The mover contract refuses latched bodies (`moveActor` early-out): no
  pit checks, no wall slides for a body riding another.
- THE LATCHED HAND: while a ride holds, a rider's cast bars track the
  victim's LIVE body (`updateCasting` re-stamps `cs.aim` each frame) — an
  aim frozen at press used to go stale as the seat moved with the carry,
  and the bite whiffed at where the body STOOD. Seats exempt (a possessed
  clinger aims with its rider's hands).

### The two ride tempers (optional, pure `ClingSpec` data)

**THE GNAW** (`cling.gnaw: { dps, type?, every? }`) — the DoT latch: the
ride's damage is a steady CHEW dealt on its own bite clock through the one
mitigation ladder (typed, rider-credited, no evade/block/crit — the
swallow-digest grammar; like every DoT it pierces plies straight to life,
and `kill()` stays sovereign). Magnitude = `dps × every ×
sheet.get('damage', [type])` on the RIDER's own folded sheet, so the
monster level curve and the keeper's batch-tempered minion investment
arrive with no gnaw-specific stat (probe-pinned: +100% minionDamage moves
bites by exactly `1 + 1/batch`). While the ride holds, `useSkill` REFUSES
the body's casts the way `moveActor` refuses its steps — the teeth are the
kit (seats exempt; cast-kit clingers without gnaw keep whacking, now with
the tracked aim above). First bite lands one full beat after the attach —
a brush-past latch never spikes.

**THE BURROW** (`cling.burrow: { sink?, grace?, toss? }`) — host-blind
riding, the Pikmin shake-off loop: the rider sinks INSIDE the body it
rides (deeper seat sink — drawn == held), and while burrowed the HOST
cannot find its own parasite: a ONE-directional early-false in
`World.hostileTo` (the possession GUISE's pattern) blinds the host's
targeting, swings, novas and stray zones to it, while the rider's teeth
stay live and every OTHER combatant scrapes riders off exactly as before.
The host's honest answer is its SHAKE clock: the pop-out
(`clingRelease('shake')`) SCATTERS the rider (`toss`, random bearing) into
a LONGER re-latch wait (`grace` — the vulnerability window where shaking
finally pays), then the loop closes as the grub walks back in and burrows
again. Legibility: the rider wears the `burrowed` marker status (refresh-
driven, stripped on release) whose `StatusDef.ghostAlpha` fades the drawn
body — the NEW generic render lever (any status can ghost its bearer;
ships on the ordinary co-op status wire). Named for the latch fabric —
distinct from the `{do:'burrow'}` brain verb (underground TERRAIN travel);
this burrow goes into a BODY. Dials in `CLING_CFG.gnaw` / `CLING_CFG.burrow`.

**THE OPEN SEAM — GRAPPLE** (deliberately unbuilt, shaped for): the inverse
latch, where the rider DRAGS the ridden — a future GrappleSpec rides the
same `clingTo` state with force transferred along the slave step. Nothing
in cling.ts assumes the victim outweighs the rider. Misdirection-by-carry
(hauling drops/objects) is the other noted rider on this state.

## Balance doctrine

- **THE BATCH RULE**: `bakeMinionOwnerStats(minion, caster, inst, scale)` is
  now THE ONE owner-investment fold (spawnMinion passes 1; throng claims
  pass `1/batch`). Every owner CONTRIBUTION — damage/life/haste/regen
  mores, flat regen, minionApply status carry — is tempered by the scale;
  base body stats and minionSize never are. Five gathered bodies ≈ one
  classic minion's worth of scaling; a 30-gnat cloud cannot compound flat
  adds into a deleting wall. Probe-pinned as a LAW (throng more ≡ classic
  more ÷ batch).
- **LIVE REBAKE**: standing bodies re-fold the owner's CURRENT investment
  each second — socketing a gem reaches the army without re-gathering it.
- **ONE VOICE, ONE ACTOR**: `minionCast` meta orders execute on the
  NEAREST `THRONG_CFG.metaDelegate` (1) throng bodies only — fifty imps
  never each cast Skeletal Strike. Classic minions in the same order are
  untouched.
- **NO CREW FORWARDING**: throng bodies never receive forwarded gems (the
  crew lane is the quadratic lane); support power reaches them through the
  host fold at batch scale.
- Caps ride `minionMaxCount` (Endless Swarm works out of the box); no
  throng-specific stats exist.

## Lifecycle

- UNSLOT = THE DISBAND RULE: the roster RELEASES where it stands —
  re-wilded as claimable husks (ttl'd), never a silent delete.
- SAVES: rosters serialize one row per anchor (`character.ts throng`),
  re-fielded beside the keeper on resume; the claim ledger rides whole.
- Zone edges: bodies cross portals like any owned non-construct minion.
- Husk mote/trigger bodies carry `throngExpiresAt` and evaporate unclaimed.

## Shipped flavors (data/skills.ts + data/monsters.ts)

SOURCE DOCTRINE (user-directed): the LATCHING flavor is BATTLE-FED — melee
riders live in the blast radius, so their grammar replenishes mid-fight;
the RANGED flavor is the world-found finite treasure — it stands off, so
its scarcity can afford to be geographic. Every kind wears THE PLY FABRIC
(docs/engine/plies.md): hit-counted durability over a tiny live life pool.

| anchor | kind | sources | identity |
|---|---|---|---|
| Stoke the Cinderkin (`gather_cinderkin`) | `cinderkin` (imp, r8, latch + fire bites, 4 plies) | onKill + gauge | the battle-stoked vanguard — attrition feeds replenishment |
| Gather the Palewisps (`beckon_palewisps`) | `palewisp` (spirit, r7, phasing zaps, flier, 2 plies) | pocket | the finite haunting — hoard, spend, mourn |
| Raise the Gnatveil (`raise_gnatveil`) | `gnatling` (r4, flock, latch + `harried`, 1 ply) | motes (mixed) | the harrying cloud — misdirection, not murder |
| Loose the Marrowgrubs (`loose_marrowgrubs`) | `marrowgrub` (r6, latch + GNAW + BURROW, 2 plies) | onKill + gauge | the Pikmin purple — sunk host-proof chewers the enemy must SHAKE into the open |

## Objectives: husks never gate a clear

Husks are minted on team `'enemy'` wearing ACTOR-level scenery armor
(`passive + untargetable + invulnerable`) on an ordinary combat kind —
def-level `passive`/`noObjective` can't see them. `countedEnemies()`
exempts the armored pair (`a.passive && a.untargetable`) as the same
soft-lock guard one layer down: a planted body no build can even FIGHT
never walls a `clear` (the Hivecaller's own unclaimed pockets and mote
husks were doing exactly that). A merely-untargetable body (a phased boss)
still counts and still gates — the exemption is deliberately the full pair.

## Verification

- `balance/probe_throng.ts` — 78 checks: sight, walk-claims, the batch LAW,
  cap fold, sweep orders + pin + linger, latch attach/slave/whack/shake,
  seat scaling, gauge mint, onKill raising, meta delegation, disband,
  restore, key/salt purity — plus THE GNAW (quelled kit, castless bleed,
  batch-fold bite scaling, sovereign kill), THE BURROW (one-directional
  hostility, host blows pass through, bystander scrape holds, marker +
  deep sink, shake-out toss/grace/strip, the re-burrow loop, perch-kind
  purity), THE CLEAR LAW (husks alone complete; a live combatant still
  gates; death clears with husks standing), THE LEVER GEMS (tag fold +
  fit gates, the gauge graft on the pocket flavor with the authored spec
  untouched, roster trickle + cap discipline + re-arm, yield quanta
  doubling, the pocket append law live at the boot) and THE PLY LEVERS
  (the fabric standing up on a plied-less summon, the calcified trade's
  exact threshold + remainder + batch symmetry, flat stacking).
- Matrix hygiene: all five lever gems gated through `matrix check
  --support <gem>` — inert-by-scenario pairs (husk mints are invisible to
  the episode fingerprint; no-bearer summon episodes) adjudicated
  `intended` in the committed ledger with reasons.
- Live-verified in the pane (dev tab levers): claims by walking, the heel
  cloud, 2-seat zombie carrying exactly 2 riders, harried at its 6-stack
  ceiling, disband re-wilding, and the sight gate BOTH directions by pixel
  count (husks contribute zero drawn pixels unseen, repaint on re-slot).
- Validator net: monsterId/cap/batch/source-range sanity, dead throngDirect,
  double mote clocks — all boot warnings.
