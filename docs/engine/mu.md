# MU — the hub between lives

**Files:** `src/data/mu.ts` (the ground, the config, the apparitions, the
standalone scene) · `src/engine/scenes.ts` (the `mu` stage handler — the
seventh core kind — plus the agency `reckoning`) · `src/ui/panels.ts`
(`showMuClassCard`, `onBeginRun`) · `src/main.ts` (`startMu`, `beginPressed`,
the class-request poll, the death reroute) · probe `balance/probe_mu.ts`
(+ the rewritten tail of `balance/probe_scenes.ts`).

## What it is

Mu is an ephemeral, ethereal zone of NOTHING the player actually **plays**
between runs, instead of navigating a menu. The hero stands as a **wisp** — a
small guarded light with no kit — and the class roster stands **in the zone**
as shaded apparitions wearing each class's own look. Drifting close to an
awake vessel and being still fills a commune bar and opens that class's card
(name front and center, the life-contract row, one **Wake** button). Taking a
vessel starts the run proper: the pick calls the same `startGame` the class
screen always called, so the run "begins exactly as normal inside Lastlight"
by construction.

## The flow

- **A brand-new account** presses **Begin** (the start menu's one primary
  button — `sceneDue` picks the label) and walks the tutorial as the Warrior
  with no class screen at all.
- **The tutorial ends in death** (see THE AGENCY RECKONING below): the fall
  card plays, and the spirit wakes in Mu — the prologue's own final stage
  (`{ kind: 'mu', stampComplete: true }`). Completion stamps **at the
  threshold**: a quit from Mu re-opens Mu on the next press, never the war.
- **A veteran's New Run** boots a provisional world and begins the standalone
  `MU_SCENE` (`transient: true` — stamps nothing, re-enterable forever,
  invisible to `sceneDue` structurally).
- **A solo run's end** (`onDeathDismiss`) drifts back into Mu — die, stand as
  a spirit, walk to the next vessel. The main menu stays one Esc away (the
  escape menu reads **Main Menu** while any scene plays, non-destructive).
- Net-co-op rejoin and couch join keep their own pickers untouched; the
  legacy class screen remains whole beneath the reroute.

## The ground

`MU_ZONE` rides the scene fabric verbatim: minted off-graph (`scene_mu`, the
caveMap idiom — never serialized), sealed by `sealStageZone`, `boundless`
(a zone of nothing has no edge), swept by the empty-field law at the door.
The `mu` tileset (`data/tilesets.ts`) is near-black indigo under drifting
pale motes, `frontier: false`, no biome tag, layout deliberately empty.
Because it is a scene, **no run save ever exists for Mu** — every run-save
chokepoint already stands down — while account-ledger writes still flow.

**THE GLOBE** (`MU_CFG.wrap`): drift far enough into the nothing and it
wraps — past `radius` off the wake point the spirit pops out the antipode
at `reentry`, still walking the same bearing, so every long walk leads
right back to the vessels. The seam is invisible by construction: the rim
is pure void (the apparition arcs end well inside it, the motes are
screen-space, Mu streams no far dress), so the camera just keeps following
a small light through nothing. Symbolic and practical at once — a
perpetual place you can never actually leave, and never get lost in.

**The polish laws:** vessel nameplates HOVER (a slow per-id bob,
`MU_CFG.bob` — the one moving thing over each still body); a VEILED
vessel's name ink dims to `MU_CFG.veiledInk` (present-but-not; the dealt
hand alone wears the warm gold); and the standing drift instruction speaks
only to YOUNG accounts (`MU_CFG.promptRuns` completed runs) — a veteran's
Mu keeps its stillness. THE RUN-END FADE (main.ts `RUN_END_FADE`) closes
the loop's other seam: a real death never pauses the world — the sim keeps
breathing under a sinking fade, the death screen opens over full dark, and
Mu's own drift-in is the fade back up.

## The apparitions (THE HAND LAW)

Economy parity with the class screen, engine-side and seeded off the
account's own history (runs + deaths):

| rank | who | face |
|---|---|---|
| **awake** | the dealt hand (`selectableSlotCount` from the unlocked pool) | full apparition, gold nameplate, commune bar, opens the card |
| **veiled** | the unlocked remainder | named, dimmer (`mu_veiled` ghostAlpha), refuses: "not this waking" |
| **faint** | the locked remainder, capped (`MU_CFG.faintCap`) | one shared nameless cowl (`apparition_unknown`, the `ghost` look) — the discovery web keeps its secrets |

One generated `MonsterDef` per class (`apparition_<classId>` — the class's
own `look`/`color`/`name`, `passive + invulnerable + untargetable`,
`npcRole: 'class_apparition'` for the free nameplate). The base shading is
the untargetable ladder's 0.55 alpha; the rank markers floor it lower
(`StatusDef.ghostAlpha` rows in `engine/status.ts`).

## The wisp

`MU_CFG.wisp` — the raw `spirit` look, pale ether ink, radius 10, kit
stripped, guarded whole. Nothing is ever restored: the pick builds a whole
new world, so the vessel swap is honest by construction. The scene runtime's
`hudVeil` hides the run HUD cluster and the notice/pickup feeds while the
stage plays (the scene's own channels — hero bar, prompt, card — stay live).

## THE AGENCY RECKONING (the rewritten tutorial fall)

The old cinematic (world held, camera pan) is dead. The commander:

- arrives just past the screen's edge (`spawnDist`), **marked** — the scene
  runtime's `mark` feeds a registered attention source, so the edge chevron
  points at him by name until he's on-screen;
- has his whole kit banned from the AI picker (`aiSkillBans`) — the director
  alone orders the verb after `graceSec`, always as a **fresh instance**
  (no kit cooldown can refuse a re-muster);
- musters a **ten-second honest cast** (`hordefathers_reckoning`
  `useTime: 10`) through the real pipeline — cast bar, ground telegraph,
  full player agency for the whole windup;
- answers a bleeding with **THE ENRAGE** (`floorFrac` + `enrageLeftSec` —
  show, never tell): at/below the floor he stays honestly MORTAL — no
  immunity, no refusal prints — but a visible fury takes him (the rally his
  own voice preaches, turned inward), the ground kicks, and the cast bar
  SURGES to its last breaths; finishing him becomes a race nobody was meant
  to win, and a mechanics-breaker who wins it anyway just fades the stage
  forward (the dead-commander lane) — never a lock, only a "we thought of
  that";
- **re-arms on interrupt**: a stun or grab that wipes the cast is the
  player's honest little victory; the muster re-orders the moment the body
  is free (in live play the `poiseCcAvoid` roll off his 220 poise makes the
  interrupt itself nearly impossible at level 1 — the re-arm is the belt);
- resolves: the `affects: 'all'` nova spends the horde and fells the hero
  through the covenant — never a death.

## The tutorial factions (data/commanders.ts) + the revenge chain

The onslaught rolls ONE LEGION per account: SEVEN `TUTORIAL_FACTIONS` rows
(goblin / undead / beastkin / demon, plus the obscure courts — carven /
chitin / gnoll — so the tutorial reads broadly different across players),
each fielding its own low-tier tide and a commander-grade colossus on
Ghorvane's exact grammar — the Fathers (Morvhaal the Gravefather, Uzkharn
the Herdfather, Mazghor the Pyrefather, Wickerwane the Harvestfather,
Szikkith the Swarmfather, Rrakhan the Packfather), each with a carried
VOICE part whose break silences his ten-breath reckoning (`breakDisables`)
and a HEART part whose break unmans him. The roll is a
pure function of the run manifest, stamps `tutorial_faction:<id>` on the
account ledger (recalled forever — an aborted tutorial replays the same
war), and re-dresses the prologue through `SceneDef.resolve` (the
open-record seam: `sceneBegin` walks the EFFECTIVE def, the gate stamps
read the base, and a boot that never imports the module keeps the goblin
canon — `probe_scenes.ts` pins that lane by pre-stamping the recall).

THE REVENGE CHAIN (`quests/revenge.ts`, spread into `QUESTS`): at level 15
the quartermaster offers the stamped legion's debt — a CULL of its
war-ground (clear-frac, faction packs, pays `revenge_trail:<id>` in the
field) and then THE LEGION COMMANDER (the very Father as a band-placed
boss objective, level 16+1, turn-in). Exactly one chain is live per
account via `gate(ctx.accountLedger)`; unstamped grandfathered veterans
get the goblin canon. Out here there is no mercy floor and no director —
the voice part is the counterplay the tutorial taught.

## Laws pinned by the probes

`probe_mu.ts`: the transient gate, the wisp, the three ranks, the dwell
latch (fire-once, step-out re-arm, veiled/faint refusals), and the whole
agency reckoning incl. interrupt re-arm and the fall into Mu.
`probe_scenes.ts`: the prologue walked end to end into Mu — the hold's
absence, the mark, the ten-breath bar, the mercy floor, the threshold stamp.

## Dials

Everything in `MU_CFG` (`data/mu.ts`): wisp face, arc radii/span, faint cap,
dwell radius/seconds, the three spoken lines. The reckoning's beat lives on
the prologue's stage row (`spawnDist`/`graceSec`/`floorFrac`/`blastWaitSec`).
All numbers are first-pass and unblessed.
