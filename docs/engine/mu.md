# MU — the hub between lives

**Files:** `src/data/mu.ts` (the ground, the config, the apparitions, the
standalone scene) · `src/engine/muDeal.ts` (THE DEAL — the hand law and the
offered contract as one pure function of the account) · `src/engine/scenes.ts`
(the `mu` stage handler — the seventh core kind — plus the agency
`reckoning`) · `src/meta/modes.ts` (`ModeOfferSpec` / `muOffer`,
`muOfferableModes`, `modesSwearableFrom`) · `src/ui/panels.ts`
(`showMuClassCard`, `onBeginRun`) · `src/main.ts` (`startMu`, `beginPressed`,
the class-request poll, the death reroute) · probes `balance/probe_mu.ts`
(+ the rewritten tail of `balance/probe_scenes.ts`) and
`balance/probe_muoffer.ts` (the offered contract).

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

**THE ABYSS** (her word — the ledger's header pane, made infinite): Mu's
theme wears the `abyss` ambientFx kind (`render/vis/ambientFx.ts`) — a
camera-anchored depth well (the rim sinks to true dark, a pale ether lift
breathes low-center where the wisp stands), vast barely-there nebular
lobes, and three parallax mote strata whose deeper layers drift slower
against the camera — walking reads as motion through a bottomless field,
and with the globe wrap the realm truly never ends and always leads home.
Stateless and deterministic like every ambient kind; every number a dial
on the painter.

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

**THE GAZE** (`MU_CFG.gaze`, 2026-09-11 — her word: the vessels stood facing
east, "they should be looking AT the wisp that's going to inhabit them").
Every apparition is born looking at its mark and its eyes FOLLOW it:
`at: 'wisp'` (the default) tracks the live spirit as it drifts — the roster
watches you — `'wake'` holds the wake point (inward), `'south'` a fixed
bearing down the screen; `turnRate` (rad/s) is the swing toward the mark,
slow enough to read as attention and never a snap (0 = instant). The stage's
own update is the one hand on an apparition's facing (`aims: false` bodies
wear no tick and no mind turns them). Probe C7–C9: born on the mark, one
frame swings at most `turnRate × dt`, then settles on the wisp's new seat.

## THE OFFERED CONTRACT (Mu × the Immortal covenant)

Her ruling (2026-09-13): the Immortal is never a toggle on a card — it is
**met**. Once the covenant is unlocked and a vessel slot stands free, the
waking itself may offer it: one awake vessel of the dealt hand stands
offered **under** the contract, shown and never told.

**The data seat** is the mode row itself — `CharacterModeDef.muOffer`, a
`ModeOfferSpec` in `meta/modes.ts`:

| dial | meaning | Immortal |
|---|---|---|
| `chance` | per-vessel chance along the dealt hand, seat order | `IMMORTAL_CFG.offerChance` (0.1) |
| `max` | at most this many offered vessels per waking | `IMMORTAL_CFG.offerMax` (1) |
| `status` | the marker status the offered vessel wears — THE DRAWN TELL | `mu_sworn` |
| `release` | may the card step the offered vessel back to Mortal? | true |
| `only` | is the roll the only door? (an un-offered card never lists it) | true |

A contract with no row is never rolled and lists freely when unlocked (the
legacy class-screen law). Eligibility is **derived at every deal, never
stored** — `muOfferableModes(account)`: the unlock owned, and for a roster
contract a FREE vessel slot (`freeRosterSlot`; a fallen vessel still holds
its slot, so nothing is offered until it is raised or released).

**THE DEAL** (`engine/muDeal.ts`) is one pure function of the account:
the hand law, then the offers — rolled **after** the deal on the same
seeded stream, so the hand is byte-identical whether or not a contract is
offerable (THE STREAM LAW), and the roll holds for the sitting exactly as
the hand does (`muDealSeed` — the account's own runs + deaths). The stage
only SEATS what it returns.

**THE DRAWN TELL**: the offered vessel wears the contract's marker status.
`mu_sworn` (`engine/status.ts`) is a low red ember beneath the body and a
thin red rim at its edge — `StatusDef.bodyFx.glow` plus the new generic
`bodyFx.rim` lever (`rim` / `rimWidth` / `rimAlpha`, the elite ring's
grammar worn as a state; any status may wear one). The nameplate keeps the
hand's gold; nothing prints. `validate.ts` refuses an offer whose marker
does not exist or draws no `bodyFx` — an offer nobody can see is a broken
law — and refuses one on the default contract.

**THE CARD**: the dwell posts the class as ever; the shell reads
`muOfferOf(world, classId)` beside it and `showMuClassCard(classId, onPick,
offered)` opens **pre-sworn** — the contract named in the header
(`MU_CFG.offer.sworn` in the marker's own ink, the card's chrome wearing
the same) and its row through THE ONE PREDICATE `modesSwearableFrom(account,
offered)`: an `only` contract lists solely on the vessel carrying its
offer (so an ordinary vessel's card shows no covenant at all — the
deliberation law), a `release: false` offer is the whole row, a lost
unlock voids the offer. Stepping the offered vessel back to Mortal dims the
header to `MU_CFG.offer.declined`; re-renders keep the pick, a fresh open
re-swears. Wake calls the same `startGame` with the chosen mode — an
Immortal vessel enters the ordinary loop (roster slot, sworn stage, the
covenant's every law) by construction. The legacy class screen reads the
same predicate with no offer, so the covenant is structurally absent there.

Probe: `balance/probe_muoffer.ts` (the registry, the gate, the roll's
analytic rate over a thousand sittings, the stream law, the seated tell,
the one predicate).

## The wisp

`MU_CFG.wisp` — the raw `spirit` look, pale ether ink, radius 10, kit
stripped, guarded whole. Nothing is ever restored: the pick builds a whole
new world, so the vessel swap is honest by construction. The scene runtime's
`hudVeil` hides the run HUD cluster and the notice/pickup feeds while the
stage plays (the scene's own channels — hero bar, prompt, card — stay live).

**THE PANEL SEAL** (her lever, 2026-09-11): `MU_CFG.sealPanels` lists the
hero pages (menu-entry ids from `data/menu.ts`) the hub keeps shut while the
wisp stands — all five today (bag, sheet, passives, map, journal: a spirit
carries nothing, and the provisional class beneath the wisp is no build to
read or unlearn) — with the refusal line a press hears at the hero's feet.
The mu stage copies it onto `SceneRuntime.panelSeal` (cleared on advance like
the veil); `World.panelSealed(id)` is the one read the keyed toggles, the
pad, the menu tray's greyed tile and its hint all share. An empty list opens
every page as in a run; any other scene may seal the same way. Probe:
`probe_mu` B6.

**THE MENU STANDS** (same day, her consistency ask): the HUD veil hides the
run HUD cluster, never the Menu button — it is the shell's door and stands
whenever the game runs (`main.ts menuBarSync`). In Mu the tray shows every
hero page greyed with the seal's line, the town pages sealed as away from any
station, the portal sealed by its own refusal, and the pause page OPEN — so
the main menu is always one click away, never only a remembered keybind.

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
`probe_muoffer.ts`: THE OFFERED CONTRACT — a drawn marker, the gate (no
unlock / a full roster = no offer), the roll's analytic rate and cap, the
stream law, the seated tell beside the dwell request, the one predicate.

## Dials

Everything in `MU_CFG` (`data/mu.ts`): wisp face, arc radii/span, the gaze
(mark + turn rate), faint cap, dwell radius/seconds, the three spoken lines. The reckoning's beat lives on
the prologue's stage row (`spawnDist`/`graceSec`/`floorFrac`/`blastWaitSec`).
THE OFFERED CONTRACT's dials: `IMMORTAL_CFG.offerChance` / `offerMax` and
the Immortal's `muOffer` row (`release`, `only`) in `meta/modes.ts`, the
`mu_sworn` marker's colors and alphas in `engine/status.ts` (glow scale
2.3 / alpha 0.34, rim 1.5px / alpha 0.6), and the card's header words in
`MU_CFG.offer`. All numbers are first-pass and unblessed.
