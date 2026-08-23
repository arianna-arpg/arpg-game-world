# SHOW, DON'T TELL — the information-surface census (what still speaks, who it speaks to, what should be drawn instead)

**Status: CENSUS + CHARTER v1 (2026-08-22, written at the dissolution grammar's
landing — D0 `40f1729`, D1 `2c40f02`, the row law beside this file). Her ask,
near-verbatim: "get a list of the text-centric modes that may be better served
as an actual visual effect so that we can commit to SHOW rather than TELL in
most cases, especially when it's something that is actually happening directly
to the player rather than an off-screen occurrence (such as a content package
starting off in the distance) … and begin to determine which effects might need
a variety of animations … rather than using one singular type for everything,
akin to how the 'pop' effect was previously being leveraged for a multitude of
instances where it didn't necessarily fit." Every number below is a census
count at HEAD (receipts in §8); every proposal is a card for her word — nothing
here is built except §6. Cross-cutting by nature; the movements in §5 land on
their own lanes.**

---

## 0. The laws this census applies (settled — never re-litigated here)

| # | law |
|---|---|
| 1 | **THE SHOW-DON'T-TELL LAW** (2026-08-20): environment gameplay "truly more visually defined than text oriented; we want to play by visual rather than explicitly mentioning things like 'the salt breaks'". |
| 2 | **THE PRECISION CLAUSE** (2026-08-22): "text can be genuinely used for precision rather than mixing precision with fluff" — a number, a bind, a readout, a reason; never a caption of a drawn thing. |
| 3 | **THE URN RULING** (2026-08-22): a break that wants to be FELT gets a motion; the line retires the moment the motion lands — built as THE DISSOLUTION GRAMMAR (D0+D1: 54 captions retired; THE SHOW LAW + THE ROW LAW probe-pinned). |
| 4 | **THE AXIS** (this ask): *who it happens to* decides the medium — TO the player / NEAR the player / OFF-SCREEN. Off-screen occurrences (a package igniting in the distance) may be TOLD; what happens at the body must SHOW. |
| 5 | **THE VARIETY CLAUSE** (this ask): one drawing must not serve many unlike moments — the 'pop' precedent. Families get their own vocabulary; inside a family, variety by MATERIAL / GROUND / DAMAGE TYPE, never one ring for all. |

---

## 1. What stands — the three information surfaces at HEAD

- **THE FLOATER** (`World.text(at, text, color, size, kind?, life)` → `FloatingText`,
  world-anchored, drifting up): **588 call sites** (532 in `engine/world.ts`, 8
  `ai.ts`, 6 `killHandlers.ts`, 6 `data/theater.ts`, ~25 across packages/scenes).
  270 literal lines + 318 composed (templates / data-fed `announce` / numbers).
  Only SIX float KINDS exist for the player's curation (`world/bulletins.ts`
  registerFloatKind: dmg · combat · gains · xp · drop · pickup) — every other
  floater is UNKINDED and always draws.
- **THE NOTICE FEED** (`world/bulletins.ts` — bulletins → `World.notices`, a
  screen-anchored, channel-muted stack; channels world · events · war · civic):
  the RIGHT surface for off-screen news — but most world news still floats over
  the hero's head through `this.text(vec(this.player.pos…))` (§3i: ~150 sites).
- **THE FLASH** (`World.flashes` → renderer `drawFlash`): **287 sites**, of which
  **265 push the GENERIC RING** (a pale expanding disc) and 22 wear a shape or a
  voice (bolt · meteor · beam · haze · arc/shape, or THE EFFECT VOICE `fx:` —
  blast · comet · dust · plunge · scramble · shatter · sparkle · sporeburst ·
  wetpop · wisp). By enclosing method the ring serves: executeSkill 17 ·
  updateProjectiles 11 · kill 9 · resolveHit 8 · executeProc 7 · updateObjective
  6 · update 6 · and ~100 single-site fabrics (spawns, seals, scenes, fixtures).
  THIS is the 'pop' she named: one disc for a death, a hit, a cast, an arrow's
  end, a seal breaking, a body emerging.
- **DATA-SIDE LINES**: `MonsterDef` announces **227** (`data/monsters.ts`: ambush
  25 · phases 38 · rules 44 · enrage 16 · actions 24 · misc), doodad-rule lines
  after D1: spawn/wake 7 · corpse spill 3 · resonance toll 5 (brittle text/warn:
  **0** — THE SHOW LAW).

---

## 2. THE AXIS — who it happens to decides the medium

| axis | definition | the verdict |
|---|---|---|
| **P — TO THE PLAYER** | a state changes ON the hero's body: a status lands, a grip closes, the ground drops away, a mount is lost, a possession snaps home | **SHOW, always.** The body/HUD/camera carry it (worn overlays, body FX, a shake, the grip seat, the status bar); text only for precision (a number, a timer, a bind). |
| **N — NEAR / BY THE PLAYER** | something in view does a thing: a body emerges, a break, a spill, a toll, a hit lands, a seal cracks, a door splinters | **SHOW at the seat.** The drawing IS the sentence (the dissolution grammar's precedent); a name may stand as a nameplate, never a caption. |
| **W — THE WORLD, OFF-SCREEN** | a package ignites, a warband marches in from a compass bearing, a siege begins two zones over, a sea is named, a quest opens | **TELL is legitimate** — but on THE NOTICE FEED (screen-anchored, channel-muted), never over the hero's head; when the thing ARRIVES in view it gets its drawing too. |

A fourth column, **R — REFUSALS & READOUTS** (why a door will not open, what a
counter wants, how many remain) is PRECISION by the clause: text stays, but on
the PROMPT/HUD seam, with a drawn accent (the door shudders) where one fits.

---

## 3. THE CENSUS, BY FAMILY (every standing line classified; verdict + the drawing it wants)

Legend — **axis**: P / N / W / R (§2) · **today**: what draws now · **verdict**:
SHOW (retire the line once the drawing lands) · KEEP (precision) · MOVE (to the
notice feed / HUD) · **variety**: what differentiates inside the family.

### 3a. BREAKS — done (the dissolution grammar)
54 captions retired across D0+D1; THE SHOW LAW (no brittle rule speaks) and,
with this file, THE ROW LAW (no breakable pops the bare ring — the six quiet
faces/seams + the comet shard rowed, §6). Variety: five motions × materials ×
THE DEBRIS FACE. **Closed.**

### 3b. THE EMERGENCE FAMILY — bodies arriving (N) — *the biggest open win*
| lines (count) | today | verdict |
|---|---|---|
| spawn/wake lines on breakables (7): "the dead wake!" · "embers spill out!" · "something skitters out!" · "the sand rises hunting!" · "the Court steps out of the heat!" · "the caravan's crew never left—" · "the brush erupts!" | the body is minted AT the seat, the pop ring, the line | **SHOW** |
| ambush announces (25, `MonsterDef.ambush.announce`): "the sand shifts…" · "the snow shifts…" · "the roots wake!" · "the water erupts!" · "the mire opens!" · "the light was never kin…" · "the patch was never asleep!" · "the scarecrow turns its head…" · "the old stone wakes…" · "the reef MOVES…" · "the terrace shifts…" · "the lava churns…" · "the rookery empties…" · 'SNAP!' … | `springAmbush`: a generic ring + the line (the body was standing, untargetable) | **SHOW** |
| burrow emergence (`act.announce` on the burrow action), rift pours, seal/ward manifests ("${boss.name} rises!/emerges!", 'hatched!', 'hiveborn!', 'brood!', 'risen!', "${a.name} rises!" (raised kin), 'THE AMALGAM RISES', 'respawned', "${fight.def.name} has RISEN!") | ring + line; the burrow already dusts its dive and swells an emergence telegraph — the one drawn emergence in the game | **SHOW** (names → a NAMEPLATE / boss banner, never a caption) |

**THE EMERGENCE GRAMMAR (proposal — the dissolve's mirror, one engine):** a body
ARRIVES by a motion chosen from the GROUND under its seat and the HOST it
leaves, drawn before it is targetable (the ambush's `untargetable` window is
already the seam; spawns get a short one):
- **RISE** (from under ground — sand / snow / soil / mire / ash): the ground's
  own grains fling (the debris-face palette per ground kind), a dark slit opens,
  the body climbs through it with a squash-stretch — "the sand shifts…" drawn.
- **BURST-OUT** (from a host body — urn → skeleton, sac → ticks, brush →
  stalker, pod → spawn, cart → bodies): the host's dissolve lobes fly and the
  body stands INSIDE the burst mid-motion (the dissolution grammar's burst with
  a passenger).
- **CONDENSE** (from light / heat / mist — the mirage dancers, the wisp kin,
  "the light was never kin…"): the dissolve's shear run BACKWARD — alpha in
  under a heat-lean, the haze ring breathing.
- **SURFACE** (from water / lava / blood): the `plunge`/`wetpop` voices' wet
  ring + a wake, the body rising through its own splash.
- **DROP** (from canopy / sky — "the rookery empties…", comet kin): a fall from
  above the frame, a land-squash, dust.
- **STIR** (a visible decoy wakes — scarecrow, pumpkin patch, old stone, reef):
  a shudder + the eyes lighting — the tells fabric's posture/glow channels, no
  new engine.
Variety = the GROUND × the HOST, chosen by the spawn seat — `MonsterDef.emerge`
override, else derived from the ground region / the brittle host's material.
~60 lines retire; the ring leaves the spawn path.

### 3c. THE SPILL FAMILY (N)
| lines | today | verdict |
|---|---|---|
| corpse spills (3): "the load spills out!" · "the earth gives up its dead!" · "the heap gives up its meat!" | bodies minted at the seat | **SHOW** — the bodies TUMBLE out (a short arc + settle; the corpse fabric's mint + a fling), riding the host's burst |
| 'drops loot!' · 'the purse bursts!' · 'the chest opens!' · "${rarity} spoils!" · 'MIMIC!' | items/glyphs already draw; the chest swaps face + a ring | **SHOW** — loot glyphs ARE the drawing (retire 'drops loot!'); the chest LID opens (a doodad state + a sparkle spill); the mimic's STIR→BURST-OUT carries 'MIMIC!' |
| 'the hammer falls: n broken → chips' · 'crafted: X' · 'bought X' · 'dropped X' · '+n essence' · 'collected' · 'strange residue' · 'standing order: X' · 'restocks the wares' | counter/ledger feedback | **KEEP as the pickup/gains kinds** — ledgers are precision; move vendor lines INTO the panel where one stands |

### 3d. THE TOLL FAMILY (N)
Resonance lines (5): "the spire sings…" · "the elder tolls…" · "the watcher
rings…" · "the bell stirs, unstruck…" · "the skep thrums with fury…" + the
attunement lines (`TUNE_CFG.text(tone)`, "the stone rings…"). Today: a ring
flash + the line; the toll's LURE radius is gameplay the player never sees.
**SHOW** — a RESONANCE voice: thin concentric sound-rings expanding to EXACTLY
the lure radius (drawn == tested — a precision the caption never gave) + a
shimmer on the body; variety by material: crystal (bright, quick, high rings),
stone (slow, dark, few), the bell (the body rocks), the skep (a vibrating body
+ a bee haze). The attunement pulse colors its rings by the tone.

### 3e. THE STATUS FAMILY — what lands ON the body (P) — *the player-axis win*
| lines | today | verdict |
|---|---|---|
| environment statuses: 'chilled to the bone!' · 'sunscorched!' · 'swallowed by the dark!' · 'over the edge!' · 'the dark catches you' · 'winded!' | frost rim / low-life / survival vignettes / the scorch bar exist for SOME | **SHOW** — every exposure status wears its WORN face (rim, vignette, bar) and an ON-APPLY accent; the line retires where the worn face already shows |
| mental: 'befuddled!' · 'addled!' · 'maddened!' · 'dominated!' · 'possessed!' · 'corrupted!' · 'the guise breaks!' · 'beheld…' / 'SEEN!' | a ring, the line; `bodyFx` glow/motes on some statuses | **SHOW** — an over-the-head MOTIF family (spiral / eye / mask) on the body + a desaturate/tint wear; 'SEEN!' = the watch fabric's lock already draws the fan — retire |
| grips: 'snatched!' · 'held fast' · 'carried!' · 'torn free!' · 'broke free!' · 'the grip breaks!' · 'passed — carry!' | the grab fabric DRAWS the seat + the struggle meter | **retire the captions** (drawn == held already); keep the struggle meter (precision) |
| cadence/time: 'time slips' · 'time stops!/bends!' · 'DOOM!' · 'TRANSGRESSION!' · 'UNHORSED' · 'FRENZY!' · 'undying!' · 'contagion!' · 'transfused!' · 'hexed'/'hex drawn'/'hex sheathed' | ring + line | **SHOW** — the chrono ripple exists for time; DOOM = a closing iris; FRENZY = a body blur; unhorsed = the throw IS the drawing (retire) |
| the generic status name on apply (`sdef.name + '!'`, `inst.def.name + '!'` on sequels/triggers, `proc.name + '!'`, `rider.name + '!'`) | the line | **KEEP as the `combat` float kind** (rule-names are precision-adjacent) BUT kinded so she can mute; the STATUS BAR icon is the worn truth |

**THE STATUS VOICE (proposal):** every `StatusDef` resolves an on-apply VOICE by
its FAMILY (cold = rime crackle · heat = shimmer flare · poison = green spatter
· bleed = red flecks · mental = spiral/eye motif · grip = none (the seat draws)
· time = ripple · light = wink) through THE EFFECT VOICE registry — ~8 voices
serve ~60 statuses; the worn face stays the overlays/bodyFx/rim already in the
renderer. ~30 lines retire on the P axis.

### 3f. THE COMBAT-CRY FAMILY (N) — the classic readability layer
'PARRY!' · 'blocked' · 'block!' · 'guard broken!' · 'shield bash!' · 'evade' ·
'immune' · 'resisted' · 'backstab!' · 'AMBUSH!' · 'SHATTER!' · 'SHELL BREAKS!' ·
'BROKEN!' / 'POISED' · 'CULLED!' · 'aftershock!' · 'volatile!' · 'crit mend!' ·
'crit affliction!' · 'IMPALED n' · 'Perfect!' / 'Flawless!' · 'On the spark!' ·
'ART WITNESSED/CAPTURED'. Today: the `combat` float kind (already a player
toggle) + a ring. **MIXED** — these name the RULE that fired (precision-adjacent:
the D2/PoE readability vocabulary); KEEP them kinded, but each earns a DRAWN
TWIN so the cry can be muted without losing the read: parry = a spark at the
weapon, block = a shield glint, evade = a body blur, immune = a flat grey ring,
guard broken = the shield's own shatter (the grammar), crit = the number's own
size/color (exists). Lowest priority — she can mute today.

### 3g. THE NUMBERS — precision, KEEP
Damage / heal / xp / gains / '+1' / '×n' / 'fed n/m' / 'arrow n/cap' /
'absolved n' / 'arrears due n' / 'reclaimed n' / 'power n' — the clause's own
case. Already kinded (dmg · gains · xp) where it matters; the un-kinded
counters ('fed n/m', 'arrow n/n') want the `gains` kind so curation reaches
them. No animation owed.

### 3h. THE WORLD-NEWS FAMILY (W) — legitimate TELL, wrong surface
~150 floater sites speak at the hero's head about things happening elsewhere:
packages igniting/ending ("A ${variant} RIFT tears open…", "An undead tide pours
into ${zone}…", "THE BELL TURNS…", "The sky crawls — the Swarming pours…",
"Brigands fall upon ${zone} — from the ${bearing}!", "${roster} warband marches
in from the ${bearing}!", "The brigands drift on…"), the hunt/beast chases
("The beast breaks for the next zone — run it down!", "Fresher tracks lead to
${zone} — follow them! (M)"), seas/harbors ("you have found ${sea}…", "word
comes: ${hold} is under siege", "${hold} has fallen to the tide", "the ship
calls at ${dest}"), quests/vocations ("Quest: ${label} — head ${dir}.", "Quest
complete", "VOCATION: ${name}!"), omens ("${line} — it is marked on your map"),
factions ("${A} wars with ${B}", "${faction} invades!", "${wname} warlord rules
${zone}!"), the kill-rule epilogues ("The Winter King falls, and the frost
begins its retreat!" …), theater arrivals ('a funeral procession winds past',
'a hunted herd breaks past — something follows'). **MOVE** — every one of these
is world news: route to THE NOTICE FEED (the bulletin pump already exists;
channels world/events/war/civic) and reserve the head for what is AT the head.
Where the event ARRIVES in view (the warband crossing the zone edge, the
brigands closing, the swarm pouring, the procession passing), the arrival is
its own drawing (dust on the bearing, the column's banners, the stream itself)
+ the bulletin. No animation owed for the pure news; a one-line sweep
(`this.text(vec(this.player.pos…` → the notice seam) closes it. ~150 sites.

### 3i. REFUSALS & READOUTS (R) — precision on the PROMPT seam
'the door does not answer…' · 'sealed — finish the objective' · 'cannot
waypoint while hunted' · 'locked — the hammer passes it by' · 'no farther
harbor on this water' · 'breakers — no landing' · 'the wardens take ${ask}' /
'…sneer' · 'Your company is full.' · 'the chart is essence worth n — beyond
your carry' · 'the rite holds your hands — see it through' · 'too close to the
seat of the Unmade…' · 'Open your inventory ({bind}), love.' · the objective
counters ('the tear seals — n remain', 'the pyre burns — n still cold', 'n
mounds left unopened', 'the ${stone} hums — n remain'). **KEEP** — these carry
the REASON or the COUNT (the clause); move them to the refusal/prompt HUD seam
(one place, never over the head), and give the door/lock a drawn accent (a
shudder, a glint) as the SHOW half. The objective counters belong on the
objective HUD line, not as floaters.

### 3j. HAZARDS IN VIEW (N) — captions of drawn things
'click —' (the plate tell is drawn) · 'the causeway is failing — run!' (the
collapse melts in view) · 'the wind rises!' / 'the drift begins — the clouds
will not wait' (gust arcs + streamlines exist) · 'A chasm yawns open — clear
it!' / 'The fissure splits onward!' / 'The fracture collapses — sealed!' (the
fissure line is drawn) · 'ERUPTION!' · 'miasma rises' · 'the melt boils!' ·
'the turned earth answers!' · 'the earth rests' · 'the coils close on this pass!'
· 'you scramble back onto standing ground!' · 'the crack narrows — nothing
below but stone'. **SHOW** — retire where the hazard already draws; keep only the
instruction-bearing half as an objective prompt ('clear it!'). The trapworks
'click —' earns a plate-depress animation (the plate sinks a pixel + a dust
puff) — the one drawn telegraph missing from the trap kit.

### 3k. AI ANNOUNCES (227, `MonsterDef` data) — three kinds, three answers
| kind (count) | examples | verdict |
|---|---|---|
| **ambush** (25) | "the sand shifts…", "the snow shifts…", "the patch was never asleep!" | **→ THE EMERGENCE GRAMMAR** (§3b): the line is the emergence, drawn; the announce field becomes the emergence's OVERRIDE (motion / ground), not a caption |
| **phases** (38) | "the wall CRACKS: the Winter is touchable!", "the organs FAIL him: the King is mortal!", "the scales TIP: the Tribunal is exposed!" | INFORMATION (a part became vulnerable / a rule changed) — the anatomy gamut already DRAWS the part break; the meaning wants a brief BOSS BANNER (screen-anchored) + a vulnerability glow on the part (the tells fabric reading `partBroken`), never a floater at the body |
| **rules / enrage / actions** (84) | 'It CHARGES!', 'It takes wing!', 'the troll seethes!', 'the priest lifts the litany…' | TELEGRAPHS — the tells fabric (posture lean, glow, beatPips) and the leap/charge telegraph rings are the drawn twins; where a LeapDelivery.telegraph / charge line already draws, the line is redundant (retire per rule); the rest ride the `combat` kind so they can be muted |

---

## 4. THE VARIETY MAP — where one drawing serves many unlike moments

**The generic ring (265 sites) is the 'pop'.** Families it carries, and the
vocabulary each wants (every row = a voice family on THE EFFECT VOICE — the
registry is open; the grammar adds voices, never a second flash system):

| family (sites) | today | the vocabulary it wants | variety axis |
|---|---|---|---|
| deaths (`kill` 9, `updateDeathBursts`) | one disc per death + the corpse fabric | **THE DEATH VOICE** — by the body's MATERIAL_NATURE: flesh (a dark spatter), bone (a clatter of chips — the grammar's shatter), crystal/construct (facets — the grammar's shatter AS the body), light/ghost (a dissolve), swarm/lite (a scatter) | material |
| hits (`resolveHit` 8) | one disc per landed blow | **THE HIT VOICE** — by damage TYPE: physical chip-spray, fire flare, cold rime-burst, lightning zap (exists), poison splat, holy wink, void tear | damage type |
| casts (`executeSkill` 17) | a disc in the skill's color | **THE CAST VOICE** — by element + delivery (a ground stamp, a beam flare, a nova ring, a summon circle) | element × delivery |
| procs (`executeProc` 7) | a disc in the proc's color | the proc's own family (leech = a red draw-in, chain = the link, shatter = the grammar) | proc family |
| projectile ends (`updateProjectiles` 11) | a disc at expiry/impact | **THE ARROW'S END** — by projectile FORM: a shaft skitters and stands, a bolt fizzles, an orb pops wet, a shard shatters (the grammar's cut over the projectile's own drawn form) | projectile form |
| fixtures (`updateObjective` 6 + ~30 fabric sites) | a disc at the fixture | the fixture's OWN voice: the leyline hum ring (= its reach), the altar's feed (a draw-in), the procession's smoke, the spire's flare (exists) | fixture kind |
| arrivals (springAmbush, spawns, seals, rifts, scenes ~60) | a disc + a line | **THE EMERGENCE GRAMMAR** (§3b) | ground × host |
| statuses (apply sites ~30) | a disc + a line | **THE STATUS VOICE** (§3e) | status family |

**The floater (588 sites)** — by §3: SHOW ~120 (emergence 60 · status 30 ·
hazards 15 · spills/tolls 15), MOVE ~150 (world news → the feed), KEEP ~300
(numbers, combat cries kinded, refusals/readouts on the prompt seam, ledgers).

**The breakables' pop** — closed (THE ROW LAW).

---

## 5. THE PRIORITY LADDER (by her axis — what to build, in order)

| movement | axis | what lands | lines retired | effort |
|---|---|---|---|---|
| **M-EMERGE** — THE EMERGENCE GRAMMAR — **BUILT** (`engine/emerge.ts`, `docs/engine/emergence.md`, probe_emerge) | N | `engine/emerge.ts` + `vis/emergeLayer.ts` (the dissolve's mirror: RISE / BURST-OUT / CONDENSE / SURFACE / DROP / STIR, ground × host), `MonsterDef.emerge` + `BrittleSpawn`/ambush reading it, `springAmbush` + the brittle WAKE + burrow emerge + rift pours + seal manifests as consumers; the ring leaves every spawn path | ~60 | ~1 session |
| **M-STATUS** — THE STATUS VOICE — **BUILT** (`engine/statusVoice.ts`, `docs/engine/statusvoice.md`, probe_statusvoice; the worn-face audit stays a listing) | P | `StatusDef.voice` family resolver, ~8 voices, the environment statuses' worn faces audited (which show, which only tell), grip/time/mental captions retired | ~30 | ~1 session |
| **M-NEWS** — off the head, onto the feed | W | the world-news floaters re-seated on the notice feed (channels), the counters/refusals onto the prompt/objective HUD seam; no animation | ~150 (moved) | ~½ session |
| **M-TOLL + M-SPILL** | N | resonance rings = lure radius (drawn == tested); corpses tumble; chest lids; 'drops loot!' retired | ~15 | ~½ session |
| **M-HIT/DEATH** — the ring's variety | N | THE HIT VOICE (by damage type) + THE DEATH VOICE (by material) + THE ARROW'S END (by form) | 0 (rings replaced) | ~1 session |
| **M-CRY** — drawn twins for combat cries | N | parry spark, block glint, evade blur, immune ring…; the cries stay kinded | 0 | ~½ session |

M-EMERGE first: it is the largest N-axis debt, it reuses the dissolution
grammar's engine halves (bitmaps, cuts, kinematics, voices, the debris face for
the flung ground), and it answers her variety clause directly (the same "the
sand shifts…" for a scorpion and a mirage dancer today; a RISE and a CONDENSE
tomorrow).

---

## 6. Built (the coda — THE ROW LAW; then M-EMERGE)

**M-EMERGE — THE EMERGENCE GRAMMAR (built after this census, the first rung):**
`engine/emerge.ts` (six motions: rise · burstout · condense · surface · drop · stir;
thirteen ground rows; the pure fold + the ground derivation region → country),
`World.emergeBody` (the one entry: the hold — untargetable + unthinking for the
motion's life, drawn == tested — the voice on the flash, the cap's honest
degrade) hooked in `springAmbush` (the ambush row's override; visible sleepers
STIR; the pack chain arrives per kin), the brittle WAKE (host lane), the
hiveborn / brood / raised-dead births, and the encounter pours;
`render/vis/emergeLayer.ts` (the slit + the grains; the arriving body's pose in
`drawActor` — the clipped climb, the overshoot, the alpha-in, the fall); the
captions RETIRED: `AmbushSpec.announce` (29 lines across monsters/formations/lairs/
landmarks — 25 re-authored as `emerge` overrides: the casket bursts out, the patch
stirs, the light condenses, the sandmaw rises through sand) and
`BrittleSpawn.text` (7), plus 'hiveborn!' / 'brood!' / 'risen!' / 'ambush!'.
Dev → Emerge (the ring of six, re-play any motion, the read). Probe
`balance/probe_emerge.ts` (31 pins). See `docs/engine/emergence.md`.

**M-STATUS — THE STATUS VOICE (built next):** `engine/statusVoice.ts` (the family
resolver — time → ripple; the element: cold rime / fire flare / lightning
spark / chaos spatter / physical flecks; hard CC → stars; the mind → spiral;
a blessing → wink; `StatusDef.voice` wins; self-drawing states speak none — and
the pure frame-diff law) + `render/vis/statusVoiceLayer.ts` (render-side detection of
every FRESH status on every drawn body, the accent drawn ON and following the
body, the nine voices registered into THE EFFECT VOICE); 21 player-axis
captions RETIRED (chilled to the bone · sunscorched · befuddled · maddened ·
possessed · corrupted · SEEN/beheld · carried · torn free · broke free · the
grip breaks · UNHORSED · FRENZY · contagion · transfused · swallowed by the
dark · over the edge · renewing · time stops/bends) and 15 rule-name cries
KINDED `combat` (addled · dominated · snatched · time slips · DOOM · TRANSGRESSION ·
undying · hex drawn/sheathed · the guise breaks · primed · marked · cleansed ·
rung clean · winded). Probe `balance/probe_statusvoice.ts`. The census at HEAD: 141
statuses → wink 93 (the authoring tail) · flare 11 · spatter 8 · spiral 8 ·
none 5 · flecks 4 · stars 4 · rime 3 · ripple 3 · spark 2.

**THE ROW LAW (the coda):**

The six brittle kinds that still popped the bare ring are rowed: `crumbling_wall`
(stone give-way; the carve at the instant), `fitted_face` / `draft_seam` /
`hollow_seam` (stone give-way + the pre-crack over their dwells; the hollow's
own carve untouched; the rubble remains adopted), `verdure_face` (verdure
give-way into its litter), `comet_shard` (warm crystal facets). `probe_dissolve`
B5 pins THE ROW LAW: every brittle kind carries a dissolve row. With THE SHOW LAW
(B4) no breakable anywhere speaks or pops bare.

---

## 7. Cards for her word (no blocking fork — the ladder can start at M-EMERGE)

1. **Combat cries** — stay text (player-curated, the genre's read) and gain drawn
   twins LAST, or get twins first? (recommend: last — she can mute today)
2. **Boss phase lines** — a brief screen-anchored BANNER + the part's glow, or
   silence (the part break alone)? (recommend: banner — the mechanic's meaning is
   information)
3. **Emergence scope** — monsters only, or also fixtures (rifts pouring, seals
   manifesting, pyres kindling)? (recommend: monsters + the brittle wakes first;
   fixtures as consumers once the engine stands)
4. **The news move** — wholesale in one sweep, or per family as each movement
   lands? (recommend: one sweep — M-NEWS is mechanical)
5. **Arrivals in view** — bulletin only, or a drawn arrival too (dust on the
   bearing, the column's banners at the zone edge)? (recommend: drawn, as
   M-EMERGE's DROP/RISE at the zone edge — later)

---

## 8. Receipts (at `2c40f02`)

`World.text` (world.ts ~55315) · float kinds + notice channels (`world/bulletins.ts`)
· `springAmbush` (world.ts ~36854: ring + line) · the burrow emergence
(`stepBurrow` — the one drawn emergence) · `popBrittle` WAKE + corpses spill
(world.ts ~52150–52200) · `resonate` + `TUNE_CFG.text` · `MonsterDef.ambush.
announce` / `phases[].announce` / `rules[].announce` (monsters.ts) · the flash
census (265 bare / 22 voiced: `scratchpad flashes.mjs` — by enclosing method) ·
the floater census (588: 270 literals / 318 composed) · THE EFFECT VOICE
(`render/vis/effectVoice.ts`: blast comet dust plunge scramble shatter sparkle
sporeburst wetpop wisp) · the dissolution grammar (`docs/design/dissolution.md`,
`docs/engine/dissolution.md`).
