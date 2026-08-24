# THE SKILL TRADE — design charter v1 (the one bag, the rack of eight, the uncut gacha)

**Status: DESIGN ONLY — nothing under `src/` is touched by this charter; the
coordinator lands the doc.** Commissioned 2026-08-23 off her message opening
the skills/supports acquisition collaboration. Her asks are §0 and are treated
as settled DIRECTION; everything else is a PROPOSAL — recommended freely,
decided nowhere she has not decided. The DECISION CARDS are §10. Anything
marked **DIAL** is a build-time lever; every number is unblessed (her standing
word: numbers bless through playthroughs). Survey receipts are against HEAD
`238e79b`; anchors name files + symbols — line numbers drift. The sibling
skill-modes charter (`docs/design/skill-modes.md`) is inherited law where
named — the Font economy, drop-at-level-1, `SKILL_LEVEL_BANDS`, rarity =
sockets — never re-litigated. **WALK 1 (2026-08-23, the same day): RATIFIED — "aligned
enough to move ahead with." Card 1 RULED — THE MEMORY FAMILY (§0's walk
table + §3); the skills-parity scope note added; card 2 HELD for a look,
answered by §3b's proposal + the mockup rendered at the walk; M0 + M1 chips
fired. Working names in older prose (THE ROUGH, THE CUT) read through the
ruled grammar: Rough Memory, the Recall. Names are data.**

> **THE LEAD FINDINGS, before anything else.**
>
> 1. **The conversion economy she asked for already exists.** The Sacrificial
>    Font's MERGE recipe (M-ECON, landed) fuses same-skill same-rarity
>    duplicates — `FONT_CFG.merge {common:3, magic:4, rare:5}` → next rarity,
>    and **rarity IS the socket count** (1/2/3/4; `skills.ts SKILL_RARITY`).
>    What this charter adds is *residence*: fodder duplicates occupying real
>    bag cells until the merge. The machinery stands; the pressure is new.
> 2. **Gems are not items today.** Owned gems live in three index-addressed
>    side arrays on `PlayerMeta` — `knownSkills` (Map), `skillInv`
>    (SkillInstance[]), and a SupportInstance[] confusingly named `inventory`
>    — uncapped, gridless, addressed by array index in every intent, save
>    row, wire row, and lock. Gear is uid-addressed in the 12×6 tetris grid.
>    **The migration's spine is index→uid**, touching `net/intent.ts`,
>    `meta/character.ts`, `net/snapshot.ts`, `meta/death.ts`, and ~30
>    world.ts sites.
> 3. **"Up to 8 learned" is already the law** — `MAX_LEARNED_SKILLS =
>    BAR_SLOTS = 8` (world.ts) — it is simply invisible: the Build drawer
>    draws learned-skill rows, never the eight seats.
> 4. **The dropper-bias rail exists.** `MonsterDef.gemBias` (132 defs) leans
>    the killer's gem roll ×2.5 toward matching TAGS
>    (`GEM_DROP_CFG.biasMult`). Her kit-weighted drop is this lever deepened
>    from tag grain to skill grain — an expansion of a landed mechanism, not
>    an invention.
> 5. **THE CLAW PROBLEM + THE ORPHAN 203.** Monster kits use the player's
>    skill registry verbatim (466/466 kit ids resolve; `MonsterDef.skills`
>    doc says so), but 28% of kit surface is `noDrop` (claw alone = 27% —
>    283 of 1,035 kits), **~33% of the bestiary teaches nothing** (all-noDrop
>    or empty kits), and **203 kit-droppable skills sit outside every Vault
>    class bundle** — today reachable only via `UNLOCK_ALL_GEMS` or a country
>    gem-floor. Walk 2 re-ruled the road: leans resolve WITHIN the unlocked
>    pool (§4, THE UNLOCKED-POOL LAW), so the ORPHAN 203 are an
>    unlock-CATALOG gap — closing them is catalog content for a future
>    pass, recorded as an open seat, never a drop-path exception.

---

## 0. Her commission (2026-08-23 — the asks, encoded as direction)

| # | ask |
|---|---|
| 1 | **Retire the "Skill Gem" / "Support Gem" inventory sections.** Skills and supports become genuine 1×1 items living in the one tetris bag — "the inventory pane as truly the ONLY inventory pane." |
| 2 | **The Skills pane shows all 8 slots**, allocated or not — the player intuits the cap of eight; learned skills "simply slot into place." |
| 3 | **Drag-and-drop reordering** of skills within the Skills pane — ordering the hotbar itself; explicitly a FOUNDATION for future mechanics where "a skill or support may affect a skill to the left or right or above or below" on the bar. |
| 4 | **A gacha acquisition item** drops instead of (most) direct gems — a stacking 1×1 item ("Skill Tome / Page / Essence" — naming wanted, card 1) that is "an array that stacks on itself" with **per-drop values recording which monster dropped which**. |
| 5 | **Dropper-kit weighting**: a Goblin that uses Cleave drops an item whose use has a HIGHER CHANCE to grant Cleave — the skill the monster innately uses. |
| 6 | **Three grant hierarchies**: (a) weighted-random by dropper (or true random); (b) an attribute-banner sort — the player selects an attribute, the grant rolls from skills requiring it ("a banner-like Gacha feel"); (c) the genuine skill itself drops directly. |
| 7 | **Stacking law**: the random items STACK; individual skills do NOT — "storing the skills and saving them up so that they could be converted into a rarity higher would genuinely cost a player inventory space in holding until the conversion." |
| 8 | **Downstream reworks owned**: the tutorial teaches by GLOWING FLASK ITEMS in the bag (not the glowing Skill Gems tab); Brandt's counter offers skill items in the standard shop "rather than being brand new sections once the vault unlock was purchased." |

### The walk (2026-08-23 — the same day, her verdicts)

| item | verdict |
|---|---|
| the charter | **RATIFIED** — "This actually sounds very close, I like it… I think this sounds aligned enough to move ahead with." Recommended options on cards she did not name stand as direction by this blessing — un-walked individually, re-openable at any milestone walk |
| card 1 · the name | **RULED: THE MEMORY FAMILY** — the bodily register beside Essence; "the Memory is effectively forged from the monster it drops from; it makes sense." Grammar locked in §3: **Skill Memory / Support Memory** as the kind labels; **Rough Memory** (wild) / **Preformed Memory** (banner) — Rough/Preform/True "still work well with 'Memory' as the grammar" (her words) |
| skills stay skills | **RULED (scope):** the skills/supports themselves change NOTHING but residence — "'Whirlwind' can just be 'Whirlwind' rather than 'Memory of Whirlwind'"; the skill's name names the item. **THE ICON LAW:** the item tile is "exactly what the hotbar icon is, shrunk down to a 1×1 item slot." No major adjustments to how skills work — "brought to parity with our other actual items," nothing deeper |
| the cohesion float | **Card 10 opened (her float — endorsed, one word locks it):** rename Ability Essence → **Memory Essence** — "that then actually ties the two forms together completely" |
| card 2 · the pouch | **HELD for the look** — "I'd like to see what you have in mind for The Pouch Shape before final implementation." §3b (written at this walk) is the proposal; a mockup was rendered beside it. Her gauge gates M2's recall UI only — M0/M1 proceed regardless |

### The second walk (2026-08-23, later the same day — the mockup gauge met + five more rulings)

| item | verdict |
|---|---|
| card 2 · the pouch | **RATIFIED as the first pass** — "this is a beautiful first pass… this looks fantastic to start with, I really like this"; iteration expected. Her insight named: **THE BESTIARY-TEACHING SURFACE** — "slaying an enemy and receiving a Memory drop will actually and literally help them to register what that monster actually DOES, because the player knows that they have a higher chance of getting those skills." The gauge that gated M2 is met — M2's chip fired |
| card 3 · the wall | **RE-RULED: THE UNLOCKED-POOL LAW** (the pierce proposal retires) — "if the skill itself has not been unlocked, then the Memory can basically just fall back to being true random of whatever skills actually are unlocked on the account." Purposes, hers: "it actually grows the account's ability to leverage specific weightings from the drops, and always has a default random fallback when the weighting doesn't actually apply to the account." §4 carries the law |
| the mandate | **THE LIVE-REGISTRY MANDATE (her words):** "we want this entire methodology to be highly dynamic and never hardcoded… if we make changes to the unlock packages we would want that to flow through rather than needing to go back and change a massive number of weights… extensible, flexible, dynamic, scaleable and not hardcoded" — encoded in §4 |
| card 7 · the counter | **RATIFIED in the flow-together framing** — "the unlocked skills really do inform this mechanism and it actually all ends up flowing together purposefully"; the §6 re-aim table stands |
| card 4 · the facet | **RULED** — the triad shape as mocked, and the facet cards double as attribute teaching: "shows the player exactly which attributes revolve around which triad" |
| card 8 · learned = seated | **RULED, her words:** "This was precisely what I had in mind… A seated skill IS a learned skill, and unseating a skill means unlearning it from the character as it gets converted back into an item in the inventory (or dropped/deleted/sold/broken down into Essence)" |
| card 10 · the rename | **LOCKED: Ability Essence → Memory Essence** — "it really does complete and wrap the entire metaphysics lore of Hollow Wake" |
| M0 | **LANDED by the build session @ f13fca3** the same day (rack + `swapSkillSlots` + holding strip + seat glow; seat tiles speak names until M1's ICON LAW); **PUSHED at her ask** — her in-browser walk is owed |

**The charter's soul, named:** acquisition itself becomes show-don't-tell.
The monster DEMONSTRATES the skill by using it on you; its stone then teaches
it. The bestiary becomes a skill catalog you hunt — kill what you want to
learn. This compounds exactly the way her content philosophy wants (biomes →
monsters → abilities): every authored kit is now player-facing acquisition
content for free.

---

## 1. THE ONE-BAG LAW — gems become items

**The model.** Every loose gem is a 1×1 `ItemInstance` in the 12×6 grid.
Recommended shape: a WRAPPER — new 1×1 bases (`skill_gem`, `support_gem`) in
`ITEM_BASES`, the `ItemInstance` carrying the gem instance as payload (the
`SkillInstance`/`SupportInstance` stays the progression truth: level, rarity,
sockets, `treeNodes`, `attunedForm` all ride it today — the survey's verdict:
"moving `SkillInstance` onto an item is a container swap, not a progression
rewrite"). The wrapper buys uid addressing, x/y residence, the lock 🔒, drag
sources, salvage lanes, and the rarity border colors free — skill-gem rarity
(common/magic/rare/legendary) is already the item ladder's vocabulary.

**THE RESIDENCE LAW — a gem lives in exactly one of three places:**

- **The bag** — loose, occupying a real cell. Unbounded `skillInv`/`inventory`
  arrays retire; for the first time gems compete for space. Every gem-granting
  path gains the `bagfull` refusal or ground-spill fallback (the gear
  precedent: `autoPlace` → `failNote('bagfull')`): vendor buys, Mireille's
  gift, the Font's socket auto-return, unlearn, unsocket, the softlock rescue
  hatch, dev spawns.
- **A rack seat** (§2) — learned. The skill item RESIDES in its seat; the bag
  cell is freed. Unlearning mints it back to the bag (room required — the
  refusal, not a silent drop).
- **A socket** — a support item resides inside its host skill item
  (`SkillInstance.sockets`, as today). Socketing moves it out of the bag;
  unsocketing needs bag room.

So bag pressure comes only from what you are NOT using — fodder, spares,
stones. The build itself (8 skills × up to 4 sockets) costs zero cells.
**Gems never stack** — skill or support, each is its own tile (her ask 7,
extended to supports for one uniform law; supports carry invested levels, so
two copies are not fungible anyway). Only THE ROUGH stacks (§3).

**What the tabs' retirement relocates** (survey receipts, `ui/panels.ts`):
socket-IN buttons (from the Support Gems tab → drag support tile onto a
socket pip; the `sock` drop target already exists in `dnd.ts`), the learn
button (→ drag skill tile onto a seat, §2), the Font merge affordances (→ the
Font station panel, which already stands from M-ECON/M1), the salvage bulk
sweep's gem headings, the right-click lock (index-based `data-lock-*` → uid),
the gem tooltips (raw `title=` → an `itemTooltip` gem branch), Mireille's
spoken directions and the forced tab yank, the dev gems tab's spawn target,
and the death-policy field grain (`DeathLootPolicy.skillInv/inventory` fold
into the bag lane — today all-false under THE GEAR ERA RULE, so no behavior
moves).

---

## 2. THE RACK OF EIGHT — the Skills pane

**THE RACK LAW.** The pane draws eight seats, always — empty seats as empty
sockets. The rack IS the bar IS the knowledge: one array (`p.skills`,
8-wide, null = empty — already the engine's shape), drawn identically in the
pane and read identically by the HUD, binds, slot grafts, and any future
adjacency mechanic. Drawn == tested.

**Learned = seated** (card 8). Today `knownSkills` (≤8) and the bar are
separate — a learned skill can be unbarred. The cap already equals the seat
count, so the split buys nothing but a second container; under the rack law
`knownSkills` derives from (or retires into) the seat array. Learning = the
skill item enters a seat (one gesture: drag from bag → empty seat; the learn
gates carry verbatim — cap is structural now, duplicate, attribute
requirements). Unlearning = seat → bag (field discipline + overdrive-debt
refusals carry verbatim). "Unbind to nowhere" retires as a concept.

**Reorder.** Drag a seated skill onto another seat: empty → move, occupied →
SWAP (new intent or two `bindSkill` calls — today binding onto an occupied
slot silently clears the duplicate's old seat rather than swapping).
Reordering stays UNGATED per the standing ruling ("choosing a seat is play,
not surgery" — skills.ts). Slot grafts re-aim by construction: `bindSkill`
already re-derives worn grafts per seat. **Flag for the future adjacency
charter:** once neighbors carry mechanics, reorder becomes power surgery —
whether it joins the field discipline is THAT charter's ruling; recorded, not
decided here.

**Geometry** (card 5). The bar is 1×8 everywhere today — HUD (`bx + i*(slot+
gap)`, one y), binds (8 flat), saves. "Above/below" needs a canonical 2D
frame. Recommended: **the pane draws 2×4** (seats 0–3 top / 4–7 bottom;
binds unchanged), establishing the grid her adjacency idea speaks in.
**THE HUD-FOLLOWS LAW, recorded now:** the canvas HUD may stay 1×8 until
adjacency mechanics actually land — but the moment a mechanic reads
above/below, the HUD must draw the same 2×4 the mechanic tests, or the bar
lies. (The HUD reshape moves the flanking orbs and the couch mirrors —
priced at that charter, not this one.)

**Empty-seat teaching** is free: the pane's empty sockets are the "you can
have eight" statement (her ask 2), and the tut-glow class already targets
per-slot buttons today (the third glow site) — it moves onto seats verbatim.

---

## 3. THE ROUGH — the gacha item

Working name (card 1 carries the naming families). One stacking 1×1 item —
THE POUCH — whose units each carry per-drop provenance.

**THE UNIT.** Every drop appends one unit: `{ dropperId, seed, at?, tier? }`.
The dropper keys the weighting (§4); the seed keys THE FOREORDAINED CUT
(below); nothing else is stored — weight tables are DERIVED at cut time from
the dropper's def (registries, never baked literals: a def rebalance
retroactively re-leans old stones, which is correct — the stone remembers WHO,
not a frozen table).

**THE POUCH SHAPE** (card 2). All units share one tile with a count; the
tile's tooltip speaks the composition grouped by dropper ("×3 of the Goblin
Brute · ×1 of the Imp"). On use, the recommended shape is a small PICKER
grouped the same way — the player chooses WHICH unit to cut, because
provenance is only a mechanic if the player can aim it; a forced pop order
demotes her per-drop values to flavor. (Alternatives on the card: strict
pop-order with the next unit previewed; per-dropper stacks — rejected as bag
flood, 1,098 defs.)

**THE FOREORDAINED CUT.** The grant is a pure function of `(unit.seed, lane
choice)` — sealed at DROP, revealed at use. Reload replays the identical
find; save-scumming dies by construction (the vendor commission-beat
precedent: seeded wall-time dice, reload-proof). The trued cut's facet choice
(§4) forks the substream per facet — each facet's would-be grant is equally
foreordained.

**THE MINT LAW.** A cut IS a genuine mint site: it stamps `noteGemDrop`
(`gemdrop:<id>` + the total) exactly as `dropGemAt` does. Without this the
drop index starves and the Standing Order + the legendary deed gate silently
stop accruing (the survey's warning). Cuts route through one chokepoint
beside `dropGemAt` so the spoils seal, owed-pay, and ledger doctrine all
arrive from standing law.

**Rarity at the cut.** The cut rolls socket-rarity from the standing table
(54/30/14/2), seeded. Elite/boss provenance may lean the rarity table
(**DIAL** — a boss's stone cuts richer; provenance paying twice).

**THE NAME — RULED (walk 1): THE MEMORY FAMILY.**

- **The kinds:** **Skill Memory / Support Memory** — the labels wherever
  "Skill Gem"/"Support Gem" spoke. Player-facing strings only; code
  identifiers stay `gem*`/`skill*` and the `gemdrop:` ledger keys stand
  (the skill-modes precedent). The gem-case fiction retires with its face.
- **The items:** a skill item is named by its skill — "Whirlwind", never
  "Memory of Whirlwind" (her word). **THE ICON LAW:** the tile art IS the
  skill's hotbar icon at 1×1 — one icon truth, no second art.
- **The gacha ladder:** **Rough Memory** (the wild lane — "forged from the
  monster it drops from", her fiction) · **Preformed Memory** (the banner
  lane — a memory committed to a facet before the recall) · the skill item
  itself (the direct lane needs no family name). The use verb: **RECALL**
  proposed (Cut / Awaken the alternates — **DIAL**, one button label).
- **The cohesion rename (card 10 — her float, endorsed):** Ability Essence
  → **Memory Essence** — the currency becomes the refined form of the same
  substance the world drops: Memories refine into Memory Essence; feeding
  it deepens the skill. String-grain only (labels in essences.ts, panel
  copy, the vendor sell-lane lines, docs cross-refs); identifiers, save
  keys, and ledger keys stay.
- Registers still spoken for elsewhere: Vestige, Remnant, Echo, Rune, Mote,
  Ember, Totem, Idol. "Memory" collides only with Zone Memory — engine
  vocabulary with no player-facing name; code-side commentary, acceptable.

### 3b. THE POUCH — the proposed shape (walk 1's answer to card 2; her gauge gates M2's recall UI)

**The tile.** One 1×1 tile per pouch kind (Rough / Preformed), auto-minted
at first pickup, auto-merged ever after — the count badge wears the total.
Uncapped count (her "simply its own 1×1 slot"); no rarity border (units
carry no rarity until recalled — provenance speaks in the panel, not the
frame). The tooltip is precision only: kind, total, the composition's top
groups ("×3 — Goblin Brute · ×2 — Imp · …and 2 others"), newest marked.

**The gesture.** Double-click (pad: press) opens THE RECALL panel — routed
per couch seat by the action latch; right-click stays the lock.

**THE RECALL panel.** Units grouped by dropper def, one row each:

- the dropper's **portrait** (the portrait fabric draws any def as itself —
  zero new art), its name, ×count;
- **THE LEAN CHIPS** — the row's honest odds face, derived live from the
  lean ladder (§4): the kit ∩ droppable skills as their own icons, each
  wearing its ×mult as precision text; a kit that teaches nothing shows its
  `gemBias` tag chips at the standing ×2.5; neither → "the wide pool",
  plain. Drawn == rolled: the chips restate the exact weights the recall
  will use;
- the **RECALL** button. One press consumes ONE unit of that group — oldest
  first (FIFO within group; deterministic, and scum-neutral since every
  unit's grant is its own sealed seed);
- Preformed rows interpose **THE FACET choice** (three triad cards) before
  the button arms.

**THE REVEAL.** The recall is a dopamine EVENT (the skill-modes
dedicated-drop ruling): the row flips to the granted skill — icon, name,
rarity border, socket pips — and the minted item lands in the bag wearing a
brief found-flash. **THE ROOM LAW: the recall REFUSES before it consumes** —
no free cell, no recall ("no room to hold what returns"); a unit is never
spent into a full bag.

**Laws carried from §3:** the grant is the unit's sealed seed (THE
FOREORDAINED CUT — reload replays it); every recall stamps the drop index
(THE MINT LAW); leans are DERIVED from the dropper's def at panel-open
(registries, never baked tables — a def rebalance retroactively re-leans
old memories, correctly). Discard: shift-click drops the whole pouch as one
ground stack (owner-assigned in co-op); partial splits are a **DIAL**, not
launch scope.

---

## 4. THE FOUR LANES — how skills arrive

Her three hierarchies, plus the one that already exists — together a clean
quadrant: random / directed-category / direct / deterministic-aimed.

**Lane 1 — THE WILD CUT** (dropper-weighted random). The cut rolls
skill-vs-support at the standing `skillShare` (0.4 — **DIAL**; card 6 carries
the alternative of skill-only stones), then draws from the legal pool with
**THE LEAN LADDER**:

1. **Kit lean** — the dropper's `MonsterDef.skills` ∩ droppable get a heavy
   multiplier (**DIAL**; the `gemBias` ×2.5 precedent says start well above
   it — the kit lean is the headline promise, it should be FELT: order 5–10×).
2. **Tag lean** — where the kit teaches nothing (THE CLAW PROBLEM: ~33% of
   the bestiary), the def's `gemBias` tags lean the roll at the standing
   ×2.5 — the shaman's stone still cuts caster-ward.
3. **The plain pool** — the flat weighted pool, as today.

An authored `MonsterDef.teaches?: string[]` override rides above the ladder
for curated cases (**optional lever**, registries-not-literals — e.g. a
monster whose FLAVOR teaches what its kit can't say).

**Lane 2 — THE TRUED CUT** (the attribute banner). A separate, rarer drop
(her "separate sort"; the alternative — one item, station-cut with a chosen
facet — is on card 4). Use prompts a FACET choice; the grant rolls from
skills requiring that attribute family. 97.8% of droppable skills carry
attribute requirements, so the partition is near-total. **Grain** (card 4):
recommended the THREE TRIADS (STR/DEX/INT families — legible, class-shaped
banners); the fine grain (nine attributes) remains one dial away. Supports
have no attributes — the trued cut is skills-only; a tag-keyed support
banner is a recorded open seat, not built.

**Lane 3 — TRUE GEMS** (direct). The genuine gem still drops — rarer
(**DIAL**: what fraction of today's `killGemChance` 4.5% converts to stones
vs stays direct). Bonewright fixed spoils, country gem-floors, quest payouts,
and the class kit stay direct by construction.

**Lane 4 — THE STANDING ORDER** (already built). The vendor commission IS
the gacha's pity system: a KNOWN gem, aimed deliberately, at true seeded
odds, priced in essence — it needs 3 `gemdrop:` mints of that id, which THE
MINT LAW keeps feeding. Nothing to build; everything to protect (§6).

**THE UNLOCKED-POOL LAW** (card 3 — RE-RULED at walk 2; the pierce
proposal retires). Every rung of the lean ladder resolves WITHIN the
account's unlocked pool — the roller's own filter (`!noDrop` ∧
`isSkillUnlockedForDrop` ∧ `minDropLevel`), read LIVE at cut time. A kit
skill the account has not unlocked simply does not lean; when no lean
survives, the cut falls back to **true random over whatever IS unlocked**
(her rule). Two purposes, hers: the account GROWS its ability to leverage
the weightings — every unlock package bought activates leans across every
kit that teaches those skills — and the fallback always stands when a
weighting doesn't apply. `noDrop` stays the hard wall regardless (claw,
bone_arrow, swig are monster-only: unbalanced, untreed, unpriced for
players).

**THE LIVE-REGISTRY MANDATE (her mandate, walk 2).** The whole methodology
derives at roll time from the standing registries — `MonsterDef.skills`,
`gemBias`, the drop pool, the account's unlocks — never a baked table,
never a hardcoded weight: "if we make changes to the unlock packages we
would want that to flow through rather than needing to go back and change
a massive number of weights." This is why the stone's units store only
`{dropperId, seed}` (§3): everything else re-derives, and an unlock-catalog
edit reprices every pouch in the world for free.

Consequences owned: the ORPHAN 203 (kit-droppable skills outside every
unlock package) stay unreachable through Memories — by the CATALOG's own
gaps, which is now the one honest lever: covering them is unlock-catalog
content (a future catalog pass), never a drop-path exception. Recorded as
an open seat, not built. Foreordained-cut interaction: the grant is
deterministic GIVEN the account's pool at cut time — reload replays
identically; pool growth is monotone and player-authored, so a later
unlock changing a later cut is progression, not scum.

---

## 5. THE PRESSURE ECONOMY — duplicates, space, and the Font

**The merge stands verbatim** (skill-modes law): 3/4/5 same-skill
same-rarity → next rarity, highest level kept, sockets auto-returned,
keeper's-mark refusals. What this charter changes is that fodder now COSTS
CELLS — her ask 7, delivered by residence alone.

**The honest math** (so the pressure reads as bounded, not absurd): merges
are incremental — a chase holds 2 commons awaiting a third, then 3 magics,
then 4 rares; a from-scratch legendary is 3×4×5 = 60 commons ONLY if built
from nothing all at once, which nobody does. Real pressure ≈ 2–4 held tiles
per ACTIVE chase — the bag becomes a chase-parallelism budget, which is
exactly the right pressure. The 12×6 grid (72 cells, shared with gear, no
stash exists) is the binding constraint; the `BoardDims` seam and
`ITEM_CFG.inventory` make bag growth a one-line **DIAL** if playtests read
too tight — and a future stash page is the named relief valve, not part of
this charter.

**THE CARRIED LEAN re-aim** (card 9). `GEM_DROP_CFG.carriedMult 0.25`
suppresses duplicates — it actively fights the merge economy the gacha
feeds. Recommended: cuts WAIVE the carried lean (duplicates are currency
now); direct drops (lane 3) keep it (a fresh find should still lean fresh).
One dial, two lanes.

**Death stakes, emergent and correct:** under THE GEAR ERA RULE only
equipped gear rides the corpse, and the Immortal carry strip wipes the bag —
so the fodder hoard is AT RISK on every death, while the build (the rack +
its sockets) survives untouched. Her inventory-space cost gains a second
tooth for free. No new rules; flagged so it's chosen, not discovered.

---

## 6. THE COUNTER — vendors and the gatework re-aim

**Her ask:** no separate gem section; skill items in the standard shop.

**The shape:** ONE face. The wares grid (which already grid-packs
D2-style through the bag's own cell law) stocks gear tiles, gem tiles, and
stone stacks side by side. The GEMS tab, `FEATURE.VENDOR_GEMS` as a FACE
seal, `gemsSealedCopy`, and the tab strip's 🔒 all retire. Notes from the
survey: the seal is on the face, not the stock (`buildVendorStock` rolls
gems regardless) — so the fold exposes already-rolled stock day one; and gem
prices are a static rarity lookup (`VENDOR_ESSENCE_PRICE`) — stones need
their own price row (**DIAL**; flat per stone kind recommended).

**The gatework re-aim** (card 7 — every rung below assumes two faces today):

| rung | today | proposed re-aim |
|---|---|---|
| `feat_vendor_gems` (120) | unseals the gem FACE | **re-aims to the shelf's gem SHARE**: stones stock from the start (the standard offering, her ask); TRUE gems + the deeper stock join the one shelf at this rung. The chain keeps its shape; the copy rewrites |
| `feat_brandt_supports` (80) | gem case stocks supports | support gems join the shelf at this rung (unchanged in spirit) |
| `feat_vendor_wares_1..3` | "+N gem slots behind the gem case / +N pieces in the wares grid" | same slots, one shelf — derived copy rewrites (`unlocks.ts` builds it) |
| `feat_vendor_lock_1..3` | hard-requires `feat_vendor_gems` | requirement follows the re-aimed rung unchanged — reserving a tile on the one shelf |
| `feat_vendor_commission` | strip renders inside the gems tab | the Standing Order strip re-homes onto the one face; `commissionOdds` stays mathematically intact (it reads `vendorSize()` — the gem slot count survives as shelf share) |
| Rush Order I/II | face-agnostic | untouched |

Migration: none owed (her standing saves-disposable ruling; the skill-modes
precedent). The delver's echo shelf keeps its own tabs-by-data opt-outs.

---

## 7. THE LESSON — the tutorial rework

Ground truth first: the prologue drill teaches only move + fire-slot-0; the
hero wakes with the full class bar learned and barred; **the flasks are the
whole hand-learning tutorial** — Mireille gifts `life_flask`/`mana_flask` as
magic-rarity SKILL GEMS (they are SkillDefs with `reflex: true`, not
consumables), and three `tut-glow` surfaces walk the two lesson steps
('learn' → the Skill Gems tab; 'bar' → the BUILD flap + unbound slot keys).

**The rework:** Mireille's gift lands as two glowing flask ITEMS in the bag
(`autoPlace`; the `tut-glow` class is reusable-by-design and moves onto bag
tiles — the first per-item bag glow). The lesson collapses toward ONE
gesture — drag the glowing flask onto a glowing empty seat (learn = seat,
§2) — with the step ladder re-read from the same live sources
(`MIREILLE_LESSON_STEPS`: 'learn' becomes "flask item in bag, not seated").
The forced tab yank dies with the tab; her spoken directions rewrite
("find the flasks in your pack, love — press them into your rack").

**THE LEDGER LAW:** `LEDGER_FLASK_LESSON` stamps at the same closing moment
(both flasks seated) — the Mireille Vault chain (`feat_mireille_life` →
mana → xp → `feat_tracker`, THE BESTIARY) hangs off that key and must not
notice the rework. The lesson latch stays world-side (lived-once, latched
null forever), never re-implemented in UI.

---

## 8. STANDING BY CONSTRUCTION — what this charter does not move

- **The socket-time gate** (`supportFitsInstOrCrew`, mechanisms, the crew
  hop, forwarding/RESONANCE, the lane router) — sockets stay on the
  instance; only the loose gem's residence changes.
- **Skill progression** — levels, Ability Essences, bands, trees, the Font's
  convert/reset: all instance- or wallet-borne, untouched.
- **Slot grafts** — derive at bind; reorder re-aims them by construction.
- **Field discipline** — the same predicate gates unlearn/socket/unsocket at
  their new gesture sites; sanctuary waives; rebinding stays play.
- **The balance harness** — builds inject `knownSkills` + bar via
  `adoptSavedMeta` (sim bags empty); keep that injection seam shaped and the
  census/matrix never notice acquisition. Stones are census-invisible by
  construction (acquisition, not power).
- **The possession/couch seams** — a borrowed bar is ordinary
  `SkillInstance[]`; cut-use routes per seat by the action latch; the
  keeper's-gate vendor reads stand.

---

## 9. THE PITFALL LEDGER (each with its receipt)

1. **Index→uid is the spine** (LEAD FINDING 2). Every gem intent
   (`learn{index}`, `dropSkill{index}`, `salvageLock{index}`…), save row
   (`SavedSkill[]`/`SavedSocket[]`), wire row (`skillInv: SkillInstW[]`),
   and death-policy branch is positional. The drag fabric already papers
   over index drift with a defId re-resolve hack (panels.ts) — the item
   wrapper deletes the hack and rewrites the address space. Budget it as
   the movement's real cost.
2. **No stacking fabric exists — at all.** Zero `count`/`qty` fields; the
   wallets are the only counted-quantity precedent and are deliberately
   NOT bag items. THE POUCH is new engine surface: count + heterogeneous
   unit array + merge-on-pickup + split/discard laws + wire rows. Contain
   it to the stone (gems never stack) and it stays one item kind's law.
3. **No use-verb exists on bag items**, and right-click is spoken for (the
   lock). The cut needs a use gesture — double-click (unbound on
   non-equipment), a picker-on-click, or a hold — chosen with the pad
   pointer in mind (**DIAL**).
4. **The bagfull refusals** at every gem-granting path (§1) — vendor buy,
   gift, unlearn, unsocket, Font auto-return, rescue hatch. Today those
   pushes cannot fail; tomorrow they can.
5. **The ledger starves without THE MINT LAW** (§3) — cuts must stamp
   `noteGemDrop` or the Standing Order and the legendary deed gate rot.
6. **Save-scum without THE FOREORDAINED CUT** (§3) — an unseeded cut is a
   reload slot machine.
7. **THE CLAW PROBLEM** (§4) — without the lean ladder's fallbacks, a
   third of the bestiary drops stones that teach nothing; without the
   `noDrop` wall, players learn claw.
8. **The account wall** (§4, card 3) — un-carded, the gacha either breaks
   its headline promise on fresh accounts or silently deletes the Vault
   bundles' meaning.
9. **The gatework chain** (§6) — `feat_vendor_lock_1` hard-requires
   `feat_vendor_gems`; the wares rungs' derived copy names the gem case;
   `commissionOdds` is parameterized on the gem-tab slot count. Retire the
   face carelessly and three purchased rungs orphan.
10. **The lesson chain** (§7) — `LEDGER_FLASK_LESSON` gates the Bestiary
    road; the rework must stamp it at the equivalent moment.
11. **carriedMult vs the merge** (§5) — the anti-duplicate lean and the
    duplicate economy pull opposite; re-aim per lane or the gacha fights
    itself.
12. **Attribute-gated pulls** — 97.8% of skills carry requirements read
    LIVE (gear-granted attributes count; shed gear silences learned gems).
    A Warrior's wild cut can grant an INT gem he cannot learn — fodder/
    merge value keeps it from being a dead pull, and the trued cut is the
    counterweight; name it in the tooltip, never hide it.
13. **Co-op wire** — `skillInv`/`inventory` snapshot arms retire into the
    item lane; stone stacks and cut results are host-authoritative;
    owner-assigned drops carry as for gear.
14. **The learned=seated unification** (card 8) — `knownSkills` has wide
    read-surface (grants, class-skill stats, panels); the merge is a real
    engine refactor. The movement may keep the Map internally as a derived
    index of the seat array — the LAW is one residence, not one variable.
15. **`noDrop` does double duty** ("monster-only" AND "loot policy") — the
    demonstration law leans on it as the player-usability wall. If a
    "player-usable but never world-drops" skill is ever wanted, the flag
    must split. Recorded, not built.
16. **HUD honesty debt** (§2) — the 2×4 pane vs 1×8 HUD divergence is
    acceptable ONLY while adjacency is non-mechanical; THE HUD-FOLLOWS LAW
    is the recorded debt.

---

## 10. DECISION CARDS (her word wanted)

1. **THE NAME — RULED (walk 1): THE MEMORY FAMILY.** Skill Memory /
   Support Memory as the kinds; Rough Memory / Preformed Memory as the
   gacha ladder; item names stay the skill's own; THE ICON LAW (§3).
2. **THE POUCH SHAPE — RATIFIED (walk 2) as the first pass.** §3b stands
   as built-to-spec; iteration expected at her walks. THE BESTIARY-TEACHING
   SURFACE named as its second purpose. The M2 gauge is met.
3. **THE WALL — RE-RULED (walk 2): THE UNLOCKED-POOL LAW.** Leans resolve
   within the account's unlocked pool; true-random fallback over the
   unlocked pool; the pierce proposal retired (§4). THE LIVE-REGISTRY
   MANDATE binds the whole methodology.
4. **THE FACET — RULED (walk 2).** Triad grain as mocked; the facet cards
   double as attribute teaching. The separate rarer drop item stands.
5. **THE RACK GEOMETRY.** Pane draws 2×4 now, HUD follows when adjacency
   lands (recommended, THE HUD-FOLLOWS LAW recorded) — vs stay 1×8
   everywhere until the adjacency charter. Now walkable in M0.
6. **THE SUPPORT QUESTION.** One stone rolling skill-vs-support at
   `skillShare` (recommended — replaces `dropGemAt`'s random mint 1:1) vs
   skill-only stones with supports keeping direct drops vs a separate
   support stone.
7. **THE GEM COUNTER RE-AIM — RATIFIED (walk 2)** in the flow-together
   framing ("the unlocked skills really do inform this mechanism"); the §6
   table stands.
8. **LEARNED = SEATED — RULED (walk 2), her words:** "A seated skill IS a
   learned skill"; unseat = unlearn → a bag item, then dropped / sold /
   broken down into Essence by the standing lanes.
9. **THE CARRIED LEAN.** Waive `carriedMult` for cuts, keep for direct
   drops (recommended) vs keep everywhere vs retire everywhere.
10. **THE COHESION RENAME — LOCKED (walk 2): Ability Essence → Memory
    Essence** — "it really does complete and wrap the entire metaphysics
    lore of Hollow Wake." String-grain only (labels, panel copy, vendor
    sell-lane lines, docs cross-refs); identifiers, save keys, and ledger
    keys stay. Rides M2 with the Memory debut.

**Cards 5, 6, and 9 stand as their recommended options by the walk-1
move-ahead blessing** — un-walked individually, re-openable at any
milestone walk (card 5's pane geometry is now walkable in M0).

---

## 11. BUILD MOVEMENTS (each awaits her go; order argued below)

- **M0 — THE RACK.** The Skills pane redrawn as the always-eight rack
  (geometry per card 5), drag-reorder with the swap intent, empty-seat
  glow surfaces, no economy change. Small, immediately walkable — THE
  GAUGE-FIRST HABIT: she gauges the pane before the surgery. Effort S–M.
- **M1 — THE RESIDENCE.** Gems become bag items (the wrapper), the two
  tabs retire, every relocated surface from §1 lands (socket gestures,
  learn gesture, locks→uid, tooltips, death fold, wire, dev tab, sim
  injection seam preserved), bagfull refusals throughout. The structural
  movement; the index→uid spine. Effort L. Probe + roster row same commit
  (the flush law).
- **M2 — THE STONE.** The pouch item + THE WILD CUT: provenance units,
  the foreordained seed, the lean ladder, the mint law, the drop-path
  conversion dial (killGemChance share), carried-lean re-aim. Effort M.
  Walk-2 laws bind: THE UNLOCKED-POOL LAW + THE LIVE-REGISTRY MANDATE
  (§4); the recall UI builds §3b as ratified; the Memory Essence rename
  (card 10, locked) lands here with the Memory debut.
- **M3 — THE FACETS + THE COUNTER.** The trued cut (banner), the one-shelf
  vendor fold + gatework re-aim table, stone pricing, commission strip
  re-home. Effort M.
- **M4 — THE LESSON.** Mireille's bag-glow rework under the ledger law;
  the copy sweep (her spoken lines, the wares rung descriptions, panel
  strings). Effort S.

**Order: M0 → M1 → M2 → M3 → M4.** M0 is independent and walkable at once;
M1 must precede M2 (stones grant items — they need somewhere honest to
land); M3 leans on M2's stones existing; M4 is polish-grain and rides last.
M0 may run concurrent with M1 groundwork if sessions allow.

**The commissioning ledger:** walk 1 fired M0 + M1; walk 2 met the pouch
gauge and fired M2. **All three are LANDED + PUSHED (2026-08-23):** M0 @
`f13fca3` (the rack, `swapSkillSlots`, seat glow), M1 @ `dcf1378` (gems as
1×1 Memory items through one `gemitems.ts` seam, `skillInv`/`inventory`
retired, index→uid intents, learned=seated with REPLACE, bagfull refusals,
ICON-LAW tiles, legacy-save fold), M2 @ `fe3d072` (the Rough Memory pouch,
the foreordained recall under the walk-2 laws, `memoryShare` 0.65 of the
kill trickle, the Memory Essence rename). The charter itself landed @
`e162b25` — no longer untracked. **M3 LANDED (2026-08-23, the same day):**
THE PREFORMED MEMORY (its own stacking tile; `preformedShare` of the memory
trickle inside the ONE spent draw — stream-silent by the M2 construction;
the RECALL interposes THE FACET's three triad cards, DERIVED from the
attribute registry's own triads — `ATTRIBUTE_TRIADS`, never hardcoded;
skills-only, per-facet substreams off the sealed seed, the facet partition
over the unlocked pool with the true-random-over-unlocked fallback; mint +
room laws verbatim) and THE COUNTER's one-shelf fold (§6's table as ruled:
the gems tab / `FEATURE.VENDOR_GEMS` face-seal retired — the rung re-aims
to the shelf's TRUE-GEM share in `buildVendorStock`; Rough + Preformed
pouches stock from the first day at per-unit `VENDOR_MEMORY_PRICE` dials,
TRADED provenance, merging onto the standing bag pouch; the glass packs
gear + gem 1×1s + pouches on the one face, the Standing Order strip
re-homed beneath it, `commissionOdds`/`vendorSize()` untouched; the
delver's mint mirrors the gem gate; the gatework re-aims — the Memory
Counter — with no orphans). M4 (THE LESSON) now queues.
**Owed her: the combined M0+M1+M2+M3 in-browser walk** — every dial
unblessed (`memoryShare`, `preformedShare`, the kit-lean mult, pouch drop
rates + prices + shelf counts, tile faces, the pouch face, the facet-card
look, the "+" pip).

---

## 12. OPEN DIALS (build-time levers — no rulings pending)

Kit-lean multiplier · stone drop share of `killGemChance` (and the elite/
boss stone conversion, `bossGemDrops`/`RARITY_DEFS.drops`) · trued-cut drop
rate relative to rough · rarity-lean per provenance tier · `skillShare`
inside the cut · stone price rows · the use gesture · pouch count cap (if
any) · bag growth (`ITEM_CFG.inventory`) if playtests read tight ·
`MonsterDef.teaches` authoring (optional lever, empty at launch) · the
demonstration law's exact wall list (account + minDropLevel) · per-lane
carried-lean values · tooltip composition depth (how many dropper groups
the pouch names before folding to "…and others").
