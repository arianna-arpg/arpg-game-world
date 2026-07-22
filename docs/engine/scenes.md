# The Scene Fabric — one-time cinematic sequences as data

`src/data/scenes.ts` (defs) + `src/engine/scenes.ts` (the director).
Probe: `npx tsx balance/probe_scenes.ts`. Debut: **THE PROLOGUE** ("The Last
Mile") — a brand-new account's first New Game.

## Thesis

A scene is a short authored experience (an opening, a future Odyssey chapter
seam) played on ground the save never keeps, gated so it happens **once per
account, ever** — the flask-lesson graduation pattern applied to narrative.
Everything is data: the stages, the cards' prose, the waves, the executioner
and its verb, every timing dial (`SCENE_CFG`).

## The gate (`sceneDue`)

Due only while the scene's `ledger` key is unstamped in `account.ledger`
**and** the account is virgin — no roster vessels, no recorded deaths, no
lifetime credits, no flask graduation. Veterans predating a newly-added scene
are grandfathered by their own history: no migration write exists or is
needed. The key stamps **at scene START** (idempotently again at completion),
so a mid-scene quit can never re-fire or loop it; only a full account reset
(a fresh, virgin account) brings a scene back. `?prologue` on the URL re-runs
the debut scene for one page load without touching the gate (the `?couchpads`
lever precedent). Hooked at `startGame` (`src/main.ts`) — the due test reads
BEFORE a roster mode pushes its vessel.

## The staging ground (off-graph by construction)

`sceneBegin` mints the zone spec through `mintCave` into **`world.caveMap`**
(the sidezone idiom): `caveDepth` guarantees it never serializes (the save
writer only walks `zoneMap`; the restore sanitizer culls any def claiming
`caveDepth`), world events and weather stay out by derivation, and a save
written mid-scene resolves the player spot to the surface **return anchor**
— a quit resumes at the ordinary bedside wake with zero special handling.

Sealing (`sealStageZone`): `spoils: 'none'`, `packDensity: 0`,
`cohort: 'authored'`, empty packs, **`exits: []`** (entry falls back to zone
center; the script alone decides when you leave), hollows/puzzles/scenery
stripped. **THE EMPTY-FIELD LAW**: after the load, every non-player actor is
swept — whatever a tileset's dress rows mint (the lea's gem cache), the
scene owns every body on its stage.

Teardown (`'home'` stage): one surface `loadZone(START_ZONE)` (unwinds the
cave-return state, discards the stage's actors, lands at the bedside
`spawnAt`), then `delete caveMap[id]` — not even the session cache keeps it.

## The stages (open registry — `registerSceneStage`)

Core kinds: `card` (full-sim hold under a DOM story card; the engine holds
the pending card and probes ack it with `sceneCardAck` — no DOM required),
`drill` (teach-by-doing goals filling one bar: `move` counts the hero's own
displacement, `cast` counts seat-pressed casts noted at the `applyInputs`
artery), `clash` (scripted spawns → clear → breathe), `assault` (timed
escalating waves + a survival clock; the last row repours on a cadence),
`reckoning` (the cinematic fall), `home` (teardown). A new beat is a kind +
a handler — never a rewrite.

The director (`updateScene`) hooks `World.update` **on the raw clock,
before the timeflow gate's early return** — scenes own their holds and must
breathe through them; it yields only to `'menu'` holds (the true pause).
While a scene runs it owns `world.screenFade`, and the renderer reads its
HUD channels: `scene.bar` + `scene.prompt` (encounter-style top bar;
`{bind:…}` tokens resolve against live binds) and `scene.focus` (**the
cinematic eye** — the one camera-override lever, `renderer.ts` follows it
in place of the hero while set; the pan is the director lerping the point,
so drawn == scripted).

## The covenant and the seal

**Nobody truly dies on scripted ground**: every player-seat lethal blow
routes through `onPlayerDown`, whose head asks `sceneInterceptFall` first —
the hero is FELLED (life 1, invulnerable + untargetable, the script
fast-forwards to the nearest stage declaring `onFell: 'play'`), never
killed. No downed state, no wipe, no mode respawn, permadeath untouched.

**Nothing on scripted ground pays**: every scene spawn is stamped
`noBounty` (xp + loot + gems + orbs sealed whole at the kill path) and
`eventKey: 'scene:<id>'`, over the zone's own `spoils: 'none'`. Scene
spawns arrive **already hunting** via the wave-frenzy overlay
(`applyWaveFrenzy` + `swarmEntryPoint`, both now public — they were already
the shared grammar of extraction/borough/harborhold assaults).

## The reckoning

Spawns the executioner off in the dark (posted via `aiPost`), freezes
everyone but it (an **actor-scoped** `kind: 'cinematic'` hold with
`exceptIds` — the world keeps drawing and its cast clock runs), pans the
eye, then casts its verb **through the real `useSkill` pipeline** — the
muster bar and ground telegraph are honest by construction. The prologue's
verb (`hordefathers_reckoning`) rides `NovaDelivery.affects: 'all'` +
`occlusion: 'free'`: the blast spends the caster's own horde as gladly as
its enemies, and no tree saves what the horn has claimed.

The debut executioner — **Ghorvane, the Hordefather** (`goblin_colossus`,
`data/monsters.ts`) — is a real anatomy-gamut composite held for the
Odyssey road: crack the Warhorn Unending and the Reckoning is silenced
(`breakDisables`), gut the Skewered Idol and the father loses heart. It
joins no spawn table; scenes and the future questline stand it up.

## Couch + hint bar

The pause menu's couch-join row hides while a scene runs (the cinematic is
authored for the one hero living it). The bottom keybind strip is retired
by default (`HINT_BAR_ENABLED`, `src/ui/panels.ts`) — the drill and the
Waking House teach the binds now; the machinery stays whole behind the one
lever.
