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

A new source kind = one union row + one branch in the world executors.
One `motes` row per skill (the first wins — validator warns on more).

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

## Verification

- `balance/probe_throng.ts` — 34 checks: sight, walk-claims, the batch LAW,
  cap fold, sweep orders + pin + linger, latch attach/slave/whack/shake,
  seat scaling, gauge mint, onKill raising, meta delegation, disband,
  restore, key/salt purity.
- Live-verified in the pane (dev tab levers): claims by walking, the heel
  cloud, 2-seat zombie carrying exactly 2 riders, harried at its 6-stack
  ceiling, disband re-wilding, and the sight gate BOTH directions by pixel
  count (husks contribute zero drawn pixels unseen, repaint on re-slot).
- Validator net: monsterId/cap/batch/source-range sanity, dead throngDirect,
  double mote clocks — all boot warnings.
