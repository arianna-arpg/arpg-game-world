# The Mastery Ladder & The Opening

*(data/classTiers.ts · data/classes.ts `ClassDef.kit` · meta/classkit.ts ·
meta/unlocks.ts `classTierEntries` · World.createPlayer · the class card ·
probe: `npx tsx balance/probe_classmastery.ts`)*

Her ruling (2026-09-05): a class is EARNED (`docs/meta/discovery.md`); what
Mortal Essence buys instead is **mastery** — per class, a ladder of rungs
that opens ALTERNATE OPENINGS for that class at the wake. Horizontal options
bought with the vertical.

## The ladder (data/classTiers.ts)

```ts
CLASS_TIERS = [
  { id: 'novice', label: 'Novice', level: 10,  cost: 90 },
  { id: 'adept',  label: 'Adept',  level: 30,  cost: 180 },
  { id: 'expert', label: 'Expert', level: 60,  cost: 320 },
  { id: 'master', label: 'Master', level: 100, cost: 600 },
]
```

Every number is a dial. `classTierId(classId, tierId)` = `tier_<class>_<rung>`
is the catalog id, the ownership key (`Account.unlockedClassTiers`) and the
only spelling.

**Catalog rows are DERIVED** (`classTierEntries`): one `kind: 'classtier'`
row per (class × rung) where the class authors a kit row for that rung —
nothing moot ever surfaces. Each row:

- `requiresUnlock`: the class's earned bundle (non-starters) + the previous
  rung THAT EXISTS for the class — bought strictly in sequence;
- `reqAnyOf: [{ classLevel: { classId, level } }]` — unveiled by the rung's
  class level (THE CLASS-MILESTONE DERIVATION registers the stamp:
  `catalogClassLevelMilestones(classId)` joins `CLASS_LEVEL_MILESTONES` in
  the XP sweep, so 60 and 100 stamp though the standing list stops at 50);
- no `tease` — hidden until investable (the moot law at rung grain: a
  Novice Necromancer card exists only once a Necromancer has walked to 10);
- `payload.skillIds` = the rung's gift skills — they join the drop pool the
  moment the rung is owned (`grantUnlock`), so an alternate opening can be
  found again like any starter.

The Vault seats the kind on the Classes shelf under the *Mastery* label; the
ordinary card, pour and tooltip serve it (the description is generated from
the kit rows).

## The gifts (data/classes.ts `ClassDef.kit`)

```ts
kit: [
  { tier: 'novice', replaces: 'poison_nova', skill: 'shambler_horde' },
  { tier: 'adept',  replaces: 'raise_dead',  skill: 'corpse_explosion' },
  { tier: 'expert', replaces: 'despair',     skill: 'summon_bone_golem' },
  { tier: 'master', skill: 'grave_tide' },
]
```

A `replaces` row lets `skill` stand in for that base starter at the wake
(the player picks either); a row without `replaces` GRANTS `skill` as an
extra starter outright (the Master's gift). Laws (validate.ts +
probe_classmastery): rung ids are real; rung skills are real, droppable
(never noDrop), never another class's opener (kit uniqueness, extended),
unique across every rung; a `replaces` names one of the class's own
starters and is BINDABLE by the class's spread; **THE CAPSTONE LAW** — a
grant may outreach the wake's attributes: an ultimate on the bar is a
promise the build grows into, cast-gated (`reqShortfall`) until it does.

The debut, her four:

| class | Novice (L10) | Adept (L30) | Expert (L60) | Master (L100) |
|---|---|---|---|---|
| Warrior | Cleave ↔ Carve | Shield Up ↔ Berserk | War Cry ↔ Grenado | + Red Hour |
| Magician | Firebolt ↔ Frostbolt | Frost Nova ↔ Shock Nova | Chain Lightning ↔ Fireball | + The Long Cold |
| Rogue | Backstab ↔ Blowdart | Cloak ↔ Stealth | Shadow Step ↔ Closing Fang | + Rain of Knives |
| Necromancer | Poison Nova ↔ Shambling Horde | Raise Dead ↔ Corpse Explosion | Despair ↔ Bone Golem | + Grave Tide |
| Summoner | Ruin ↔ Unmaking Bolt | Bind Familiar ↔ Conjure Wisp | Essence Drain ↔ Convocation | + Hollow Star |

THE ARCANIST (her retheme, same day): the dead belong to the Necromancer, so
the Summoner became an arcane caster with ONE bonded familiar — quality over
the Necromancer's quantity, the companion in the Tamer's vein. Bar: Ruin (the
bolt) / Bind Familiar (`bind_familiar` → `arcane_familiar`: the golems'
persistent contract on a targetable spirit that re-forms 5 s after it is
unmade, one at a time on its own pool) / Essence Drain (the rot); attributes
14/14/14 INT/WIS/WIS-start; the bundle pools the four elemental golem
contracts and the arcane bolts (all orphans before), its bone/chitin supports
moved to the Necromancer and the Hivecaller (with Venom Bolt and the skeleton
summons); the vocation (Gravebinder) and its steps still wear the grave — a
follow-up.

Content the ladder minted: **Shambling Horde** (`shambler_horde`, retuned
under its old id from a two-zombies wall no pool ever dropped): one grave
shambler per cast — `data/monsters.ts grave_shambler`, a zombie's mindless
feet under the bomber grammar (`brain: bomber` + `explodeOnDeath`, xp 0,
noRecall) — that lurches at the nearest enemy and bursts on arrival (the
blast is life × fraction, so minion investment IS the payload), 7 s, six at
once. **Summon Bone Golem** (`summon_bone_golem` → `bone_golem`): the golem
family's fourth body, the same persistent contract, the shared golem slot.
`corpse_explosion` and the twelve other alternates already existed
(unpooled or pooled elsewhere); the rung payload pools them.

The class-skill lane ("+N to <Class> Skills") reads `classOpeningSkills(c)`
— the bar AND every rung alternate — so an alternate is the class's skill
exactly as the base it stands in for.

## The opening (meta/classkit.ts)

The ONE resolver every seat-seating seam reads:

- `kitChoicesFor(account, def)` — per base starter, `[base, ...owned
  alternates]` with the remembered pick (else the base); plus the owned
  grants. A class with nothing owned reads its base kit exactly (the chooser
  stays silent).
- `resolveClassKit(account, def, picks?)` — the wake's bar: each chosen AND
  OWNED alternate standing in for its base, owned grants seated in the first
  empty slots (a full bar takes no gift), everything unowned or unknown
  falling back to the base. Same length as the def's bar, always.
- `rememberKitPicks(account, def, picks)` — `Account.kitPicks[classId]`
  keeps only valid, non-base picks (choosing the base again forgets the
  record); the card re-opens as it was left.

Flow: the class card (Mu card / class screen) renders THE OPENING CHOOSER
(`kitRowHtml` — one chip per seat, always the CHOSEN opening; a seat with
owned alternates wears the swap badge ⇄ and a click opens THE SWAP LIST —
`openKitPopover`, a body-mounted popover listing every option for that seat
with the current one marked (her Risk-of-Rain read: one symbol, one list, any
number of alternatives, no inline clutter); Master grants wear ✦; every chip
and row keeps the skill tooltip) → `onPick(def, mode, name, kitPicks)` → `startGame(…, kitPicks)`
remembers the picks and resolves them against the account →
`World.createPlayer(def, { kit })` → `makePlayerSeat` mints the resolved
bar at the kit tier. The engine never trusts a pick it did not resolve —
couch guests and co-op clients (base kit today) can never smuggle an
unearned opening past it.

## Dials & levers

`CLASS_TIERS` (levels, costs, labels, count — add a rung and every kitted
class grows a card) · `ClassDef.kit` (per class; several rows per rung are
legal — a rung may open two alternates) · `CLASS_WEB_CFG` (the web's
reveal/chain/sweep dials, beside the ladder).

## Invariants (probe-pinned)

The ladder's weave (rows only where kit rows exist; sequence; door; level
gate; payload = gifts; her four whole), the kit laws, the derivation, the
Vault walk (a fresh account sees no rung; Novice waits behind the earned
class even at 10; each rung waits on the previous even with every level
stamped; the ladder climbed leaves nothing to sell; a starter's rung waits
only on its level), the resolver (unowned/stranger picks fall back; the
grant seats itself; a full bar takes no gift; memory keeps only valid picks
and survives the account round trip), and the live wake (the alternate in
the first seat, the grant in the fourth, the displaced base unknown, "+2 to
Necromancer skills" reaching the alternate, the shambler bursting on its
mark through the real cast).
