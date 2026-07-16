# The War Below — the Underworld's eternal territorial struggle

The Underworld is not a dungeon; it is a **country at war**. A run seats a
handful of **Underworld Lords** from an authored pool — and for that run they
are **everlasting**: ephemeral, eternal, everywhere and nowhere (the
Chaos-God texture). The disposition of ANY point in hell derives from a pure
function, so the warfront exists at every coordinate the moment it is asked
about, breathes on its own clock, and extends however far the player roams —
the war is not simulated *near* the player; the player explores *into* a war
that was always already there. Every surface **Demonic Incursion** is one of
these lords reaching up. Nothing the player does to it is permanent: fronts
beaten back heal, cast-down lords regather, and no throne ever changes hands.

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
preferred **strikes** (InvasionType ids, weighted), and a named **throne**
(`{ name }` — a field anchor, never a zone). Eight ship; a run rolls
`WAR_CFG.seats` (4) from the pool, manifest-seeded, and those four are the
run's war from first breath to last — no elimination, no succession, no
replacement. The unrolled simply wait for another world. A ninth lord is one
`registerLord` row plus its two bodies.

The **temper** dials:

- `push` — how fast this lord's fronts crawl (influence-drift speed).
- `hold` — how quickly its ground shrugs off suppression (the field heals).
- `opportunism` — reach grows against bled rivals (the vulture dial).
- `wrath` — surface-strike appetite (attribution weight).
- `tideAmp?` — the lord's power-breath amplitude (Ozrimoth surges slow and huge).
- `deepStrike?` — doors opened behind rivals' lines (Vethriss).

## The eternal field

`influence(lord, coord, t) = power × (noiseBase + amp·noise(coord + drift(t)))
× throneWell(coord)`, where:

- **noise** is seeded per-lord value noise (feature size `field.noiseScale`)
  whose domain **drifts** at `field.driftVel × push` along a heading that
  slowly wheels (`field.driftTurn`) — the fronts crawl forever, nobody
  marches one way for good;
- **throneWell** eases each lord's influence up around its throne anchor
  (`field.wellAmp` / `wellRange`) — coherent countries, not salt-and-pepper;
- **power** is the live scalar (below) — a bled lord's footprint recedes
  *everywhere*, and rivals' fields flood the difference (the revolving door
  at global scale);
- decaying **local modifiers** multiply on top (the player's fleeting
  fingerprints, and the rift-lords' opened doors).

Ownership at a coordinate = argmax; contest = second/first ratio, reported
only above `contest.near` (a front is a place, not a percentage that follows
you), HOT above `contest.hot`. The Hellgate keeps a one-cell neutral circle
(`neutralRadius`) — the landing is a door; its ring neighbours are already
somebody's country. **There is no ground outside the war**: the field
answers at any distance, unexplored or not.

POWER is per-lord homeostasis: it regathers toward `power.base` (slower with
a strike away, faster on spoils), breathes on a seeded per-lord tide, and is
floored at `power.floor` — a lord can be bled, never extinguished.
Determinism: one seeded Rng at roll time; the field derives from the
overlay's own clock, so a resumed save recomputes the same eternity (the
snapshot is a handful of scalars — seats, powers, modifiers, the truce).

## What the player can do about it (levers, not victory)

- **Kill a front-marshal** (`tag: 'hell_marshal'`, fielded at HOT fronts via
  `frontStage`): drops a decaying suppression disc (`modifier.marshal*`) —
  the local push collapses, the vacuum fills, and the field HEALS (faster
  for high-`hold` lords).
- **Meet a lord**: deep in a lord's **sanctum** (within
  `heartland × sanctumFrac` of its throne anchor, on its own ground, power
  gathered, cooldown clear — `manifestHere`) the lord **manifests** in
  whatever zone the player actually walked into: Crowned, at full strength,
  over a court of its own host. Thrones are anchors — nothing mints; the
  throne is wherever the lord stands, and it stands where you walked in.
- **Cast a manifestation down** (`tag: 'hell_lord'`): the lord's power
  collapses everywhere (`manifest.collapseMul`) — rivals flood its whole
  footprint — and then it REGATHERS (`power.regen`, `manifest.cooldown`,
  sigil dimmed on the map while gathering). The same lord returns. Ledger:
  `hell_marshals_slain`, `hell_lords_slain`.
- **Repel a lord's incursion** (surface or hell): the committed host is lost
  (`strike.repelledMul`). **Ignore one to burnout** and the spoils flow home
  (`strike.spoilsPower`, a regen surge). Surface choices move the hell map.

Both bodies carry their lord on `Actor.eventKey` (`hellwar:<lordId>`) — the
kill rows never guess from def ids.

## The incursion tie-in

`DemonInvasionField.attribution` is an optional hook the sim's composition
root wires when the war package runs (`sim.ts` — neither overlay imports the
other). At ignition the demon field asks `attributeStrike(typeIds)`: the war
picks the sender by **wrath × power-share** (a strong lord has hosts to
spare — the strike is detached strength, not desperation) and the flavor from
the lord's `strikes` preferences. The invasion then carries `lordId`, and
`InvasionInfo` resolves `faction` (the lord's host), `champion` (the lord's
**marshal** — the lord never leaves its country), and `color` (the banner) —
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
  of its throne) flips the zone's whole population to the host — the
  crusade's suppress-natives grip, in hell's grammar.
- The `underworld_war` **zone-runtime row** (buildZoneRuntimes): hot fronts
  field the attacker's marshal + retinue; sanctum ground manifests the LORD
  over its court. Live re-invokes cover a front drifting onto the standing
  zone. **Nothing mints, nothing is owned** — the war has no zones of its
  own, only presence in everyone else's.

## Diplomacy

Host factions graft at boot (`FactionSpec`s: pairwise hostile, allied to the
Legion rabble they conscript, at war with the Caul, `contexts:
['underworld_war']` so baseline generation never fields them). Per-run
stances ride the **run-scoped diplomacy layer** (`setRunStances` in
`data/monsters.ts` — namespaced, checked before the static RELATIONS table):
at most one **truce** rolls per run, always shatters
(`WAR_CFG.truce.breakAfter`).

## Surfaces

- **Map** (underworld tab): the eternal field sampled over the viewed extent
  on a world-anchored render ladder — the wash breathes and crawls because
  the field does (the map's 0.5 s auto-refresh animates it); throne sigils
  (`lord.sigil`, the throne's name + creed in the tooltip, dimmed while a
  cast-down lord regathers); ⚔ badges over hot charted fronts; thrust arrows
  along the strongest advances (influence-gradient sampled). A "The War
  Below" layer chip.
- **HUD/zone box**: `conditionRows` (sim.ts) reports "Held by X" /
  "the sanctum" + "Y presses the front" for underworld zones; a `zoneInfo`
  source adds the creed + front rows; both read `zoneWar(zoneId)`.
- **Bulletins**: conquest/pact/collapse lines through the bulletin registry
  — heard only in the underworld (the drain-and-filter source); the surface
  learns of the war through its strikes.
- The hosts speak the **infernal tongue** (`monsterNames`/`nemesis` `demon`
  pools, aliased to all eight host factions at boot).

## Persistence

`persistence: 'durable'` — the snapshot is a handful of scalars: seats
(lord/throne anchor/power/strikes/spoils/manifest cooldown + the seeded
field identity), the truce, the anchor, live modifiers, and the per-zone
bulletin memory. The field itself is never saved — it derives from time, so
it cannot be corrupted, only re-asked. Restore is registry-tolerant (a lord
gone from the pool re-rolls deterministically). `pruneZones` only trims the
bulletin memory.

## QA

`npm run eventqa` gates the package (registry/pledge/gates/lifecycle/
determinism/ledger). Live probe: `devStartRun()` →
`w.enterDimension('underworld')` → `w.sim.hellWarField.peek()`;
`warAt({x,y})` answers ANYWHERE (the everywhere test); kill flows need
`w.kill(body, false, killer)` (silent kills skip every bounty by design).
`frontStage`/`zoneWar`/`manifestHere`/`strengths` are the readable state.
Mind the interloper: a level-1 character left standing in hell during long
probe waits dies (gameOver halts the world and stales the views) — keep
`p.life` topped between steps.
