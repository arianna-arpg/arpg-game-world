# The War Below — the Underworld's eternal territorial struggle

The Underworld is not a dungeon; it is a **country at war**. A run seats a
handful of **Underworld Lords** from an authored pool, drapes a live
**disposition lattice** over hell's map space, and simulates an eternal
struggle no side can win — the player is an interloper in something larger
than they can affect permanently, and every surface **Demonic Incursion** is
one of these lords reaching up.

Three modules, all data-first:

| piece | file | what it is |
|---|---|---|
| the pool | `src/packages/lords.ts` | `UnderworldLordDef` open registry (`registerLord`) — pure data leaf |
| the field | `src/packages/overlays/hellWar.ts` | `HellWarField` overlay + `WAR_CFG` (every dial) |
| the package | `src/packages/defs/underworldWar.ts` | eight lords, eight host `FactionSpec`s, kill bounties, the `underworld_war` ContentPackage |

## The lords

`UnderworldLordDef`: id, name/short/epithet, **creed** (one line of doctrine),
banner **color** + one-glyph **sigil**, the grafted **host faction**, a
**temper** (the war-personality dials), **lord** + **marshal** body def ids,
preferred **strikes** (InvasionType ids, weighted), and a **citadel** seat
(tileset/layout/name). Eight ship; a run rolls `WAR_CFG.seats` (4) from the
pool, manifest-seeded. A ninth lord is one `registerLord` row plus its two
bodies — the roll, succession, territory, map, bulletins, strikes and
spawning all field it with zero engine edits.

The **temper** dials are where the "eternal struggle" lives:

- `push` — attack-flow rate at hostile borders.
- `hold` — defense multiplier on owned cells.
- `opportunism` — extra push against WEAK borders (the vacuum-feeder).
- `wrath` — surface-strike appetite (attribution weight).
- `tideAmp?` — war-tide swing size (Ozrimoth surges seldom but enormously).
- `deepStrike?` — behind-the-lines enclave seeding (Vethriss' doors).

## The sim (the revolving door)

Two phases. From run start the war is **abstract** — seats rolled, tempers
live, incursion attribution works before hell is ever entered. The moment any
underworld node exists in the overlay's view (the Hellgate minting is the
first), the lattice **anchors**: citadels take seeded compass seats on a ring
around the gate, ground seeds by nearest-citadel falloff, and the struggle
becomes territory.

Cells hold `owner` (seat index) + `power`. Per tick: citadels feed power in
(the war's only mint — scaled down while a lord's strike is away, up while
spoils flow), owned ground settles toward a garrison level, same-owner cells
diffuse rear-to-front, and hostile borders exchange: `attack = basePush ×
push × tide × (1 + opportunism × weakness)`, resisted by the defender's
`hold`. **The attacker pays `drainFwd` of every blow** — strength is moved
forward, never minted, so a hard push thins its own rear and the door
revolves. Per-pair seeded sinusoid **tides** keep fronts breathing at
equilibrium. The lattice is world-anchored (origins floored to cell
multiples; growth only ADDS cells) and covers citadels + charted hell +
margin; **freshly-settled hell seeds to its nearest throne** the moment it
charts. The Hellgate keeps a one-cell neutral circle — the landing is a door,
not a warfront; its ring neighbours are already somebody's country.

Everything is a `WAR_CFG` dial. Determinism: one `Rng(ctx.seed)`, the
overlay's own accumulated clock, no wall time — two sims on one seed seat and
fight the same war (eventqa's lifecycle/determinism groups gate this).

## What the player can do about it (levers, not victory)

- **Kill a front-marshal** (`tag: 'hell_marshal'`, spawned at HOT fronts —
  `frontStage(zoneId)`): the local push collapses (`onMarshalSlain` damps that
  lord's power in a radius). The vacuum fills — with someone else.
- **Kill a lord on its throne** (`tag: 'hell_lord'`, Crowned, at the citadel):
  `onLordSlain` collapses the realm (`lordFall.powerMul`), rivals flood in,
  and after `succession.delay` a NEW claimant from the **unrolled** pool takes
  the empty seat (the citadel zone re-mints under the new banner). The war
  does not end because a chair does. Ledger: `hell_marshals_slain`,
  `hell_lords_slain`.
- **Repel a lord's incursion** (surface or hell): the committed host is lost —
  a global power haircut on the sender (`strike.repelledMul`). **Ignore one to
  burnout** and the spoils flow home (citadel surge). Surface choices move the
  hell map.

Both bodies carry their lord on `Actor.eventKey` (`hellwar:<lordId>`) — the
kill rows never guess from def ids.

## The incursion tie-in

`DemonInvasionField.attribution` is an optional hook the sim's composition
root wires when the war package runs (`sim.ts` — neither overlay imports the
other). At ignition the demon field asks `attributeStrike(typeIds)`: the war
picks the sender by **wrath × strength-surplus** (a winning lord has hosts to
spare — the strike is detached strength, not desperation) and the flavor from
the lord's `strikes` preferences. The invasion then carries `lordId`, and
`InvasionInfo` resolves `faction` (the lord's host), `champion` (the lord's
**marshal** — the lord never leaves its throne), and `color` (the banner) —
so the epicenter court, the meteor craters, the storm spawn bias, the realm
behind the portal, the map ring, and every announcement fly the sending
lord's banner. Resolution reports home: `resolveInvasion*` paths →
`'repelled'`; the `maxLifeSec` burnout → `'spoils'`. With the war package
absent, `attribution` stays null and every legacy path is byte-identical.

## In-zone manifestation

- `affectSpawns`: owned hell ground boosts + **injects** the owner's host (a
  coherent contingent among the natives); contested ground injects the rival
  too — the brawl stages through the ordinary contest fabric.
  (`spawnContest` stamps `m.faction` with the contestant's banner — conscript
  rosters brawl AS the host.)
- `baseTable` (world.ts): a lord's **heartland** (within `WAR_CFG.heartland`
  of its citadel) flips the zone's whole population to the host — the
  crusade's suppress-natives grip, in hell's grammar.
- The `underworld_war` **zone-runtime row** (buildZoneRuntimes): hot fronts
  field the attacker's marshal + retinue; a citadel seats the Crowned lord
  over its court. Live re-invokes cover a front igniting under your feet.
- **Citadel zones** mint through the engine drain (floating, in-dimension,
  `noFactionWar`, the lord's authored tileset/layout/name, `eventOwned`,
  claimed by the overlay's `ownedZones` so they persist across saves).

## Diplomacy

Host factions graft at boot (`FactionSpec`s: pairwise hostile, allied to the
Legion rabble they conscript, at war with the Caul, `contexts:
['underworld_war']` so baseline generation never fields them). Per-run
stances ride the **run-scoped diplomacy layer** (`setRunStances` in
`data/monsters.ts` — namespaced, checked before the static RELATIONS table):
at most one **truce** rolls per run, always shatters
(`WAR_CFG.truce.breakAfter`), and every succession republishes.

## Surfaces

- **Map** (underworld tab): owner wash on the world-anchored render ladder,
  citadel sigils (`lord.sigil`, creed in the tooltip), ⚔ badges over hot
  charted fronts, the top thrust arrows (`WAR_CFG.map.arrows`), a "The War
  Below" layer chip. The map's 0.5 s auto-refresh animates the fronts live.
- **HUD/zone box**: `conditionRows` (sim.ts) reports "Held by X" +
  "Y presses the front" for underworld zones; a `zoneInfo` source adds the
  creed + throne rows; both read `zoneWar(zoneId)`.
- **Bulletins**: conquest/succession/pact lines through the bulletin registry
  — heard only in the underworld (the drain-and-filter source); the surface
  learns of the war through its strikes.
- The hosts speak the **infernal tongue** (`monsterNames`/`nemesis` `demon`
  pools, aliased to all eight host factions at boot).

## Persistence

`persistence: 'durable'` — snapshot carries seats (lord/citadel/zoneId/
fallen/succession/strikes/spoils), the truce, the anchor, the full lattice
(plain JSON arrays), per-zone owner memory, pending mints, and the
`ownedZones` claim. Restore is registry-tolerant (a lord gone from the pool
re-rolls deterministically; a cell-size drift rebuilds ground from the
surviving seats). `pruneZones` re-queues culled citadel mints.

## QA

`npm run eventqa` gates the package (registry/pledge/gates/lifecycle/
determinism/ledger). Live probe: `devStartRun()` →
`w.enterDimension('underworld')` → `w.sim.hellWarField.peek()`; kill flows
need `w.kill(body, false, killer)` (silent kills skip every bounty by
design). `frontStage`/`zoneWar`/`strengths` are the readable state.
