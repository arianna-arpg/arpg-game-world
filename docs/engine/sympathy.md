# The Sympathy Fabric — gains echo to kin

`src/engine/sympathy.ts` (vocabulary + registries) · `src/data/sympathies.ts`
(the shipped links) · echo executor in `World.echoSympathy` (world.ts, beside
`rollGainProcs`) · verified end-to-end by `npx tsx balance/probe_sympathy.ts`.

When an actor **gains** something — a flask pour, a scooped resource orb, a
banked charge, a buff, a landed heal — registered **sympathy links** replay a
scaled copy of that gain onto **related** actors: tamed companions, minions,
the owner, party seats, nearby allies or NPCs, even enemies (the tradeoff
lane). The tamer whose beasts drink when they drink, the party-wide
charge-sharing suffix, and the den matron whose swig waters her whole pack
are all the same fabric — three link defs apart.

## The event spine (no new pipeline)

Sympathy rides the existing **gain-event sweep**. `Actor.gainEvents` (the
chargeGain/buffGain/orbPickup proc spine) grew payload fields and two kinds:

| kind      | fired at                                  | payload                        |
|-----------|-------------------------------------------|--------------------------------|
| `charge`  | `Actor.gainCharge` (actual increase only) | `n` banked, source-skill tags  |
| `buff`    | `Actor.addBuff` (every application)       | `buff` (the effect), tags      |
| `orb`     | `World.pourOrb`                           | `n` = orb amount               |
| `restore` | `World.startRestoreStream` (flask pours)  | `n` total, `dur` window, tags  |
| `heal`    | `World.applyHeal` (landed > 0)            | `n` landed, tags               |

The world sweeps events once per frame per actor and calls `rollGainProcs`
**and** `echoSympathy` on each. Tick-rate sources (regen, tether drips,
stream sips) call `healBy` directly and never event — no per-frame floods.

## Loop discipline (structural, not tuned)

- Only events at `depth ≤ SYMPATHY_CFG.maxSourceDepth` (default **0**) echo.
  The holder's `sympathyDepth` stat buys extra rungs, procDepth-style.
- Every echoed application lands **one link deeper** (`depth + 1`): its own
  gain events exist (a pet's buffGain procs may fire — deliberate
  composability) but never re-echo past the lid.
- Restore/heal echoes go through streams/`healBy`, which fire **no** events
  at all — those chains are dead by construction.

## The link def (all data)

```ts
registerSympathyLink({
  id: 'bond_flask', label: 'bond', color: '#a8c87a',
  from: 'self',                    // whose gain is heard (default 'self')
  channels: ['restore', 'buff'],   // which gain kinds echo
  tags: ['flask'],                 // only gains from skills with ALL these tags
  to: ['companions'],              // recipients (relation vocabulary)
  scale: 1,                        // × the holder's potency stat
  radius: undefined,               // gainer→recipient clamp; bonds are leashless
  cap: 8,                          // nearest-to-the-gainer first
});
```

**Relations** (`SYMPATHY_RELATIONS`, open registry): `self`, `owner`,
`companions` (tamed), `minions`, `party` (other seats — co-op partners and
hired mercs), `allies`, `npcs`, `pack` (same team + faction, unowned),
`enemies`, `bondmates` (`Actor.bond`). Broad kinds (`allies`/`npcs`/`pack`/
`enemies`) **require a radius** — the validator refuses unbounded broadcast.

**Listening** (`from`) is restricted to `SYMPATHY_LISTENABLE` (self, owner,
companions, minions, party): per event the world consults exactly the
gainer, its owner, and the seats — never a scan of every actor's sheet.
`from: 'companions' → to: ['self']` is the whole inverse lane (Reciprocal
Bond: mend the beast, mend the keeper).

## Grant surfaces (who holds a link)

A link is live on an actor when their `sympathy_<linkId>` stat > 0; the
value is **potency** (multiplies the link's scale — highest source wins,
grants never stack additively across surfaces):

- **`SkillDef.equipMods`** — worn while bar-slotted. Tame Beast ships
  `sympathy_bond_flask` + `sympathy_bond_orb` this way: the bond IS the
  slotted skill.
- **Support gems** — plain `mods`; the event sweep queries every bar
  instance with its own context (hostSockets discipline rides inside
  `instanceMods`), so a gem socketed into Tame Beast deepens its keeper
  (Alpha's Bond +0.5) and a gem in the Whistle carries the inverse lane.
- **Passives / affixes / statuses** — ordinary global-sheet mods
  (Fellowship of the Wake notable; `of Fellowship` suffix).
- **`MonsterDef.sympathy: string[]`** — folded as potency-1 innate mods at
  creation (the den matron). Monsters and players read identically.

## Channel semantics (canonical gates only)

- `restore` — the recipient gets their **own stream**, same window, scaled
  total ("the beast gains regeneration from your flask" — literally).
- `heal` — `healBy` (healTaken and ceilings bind the copy).
- `charge` — count copies **verbatim** (quanta never fraction; scale > 0
  gates). Cap = the charge's registry `baseCap` + the recipient's own taps
  and `chargeCap_<id>` stats — fury/rage/frenzy carry `baseCap: 3` so an
  untapped beast can bank a modest echo.
- `buff` — the same `BuffEffect`, duration × scale.
- `orb` — the orb's restore/charge payload replays at scale.

## Shipped content

| piece | surface | what |
|---|---|---|
| `bond_flask`, `bond_orb` | tame_beast equipMods | the tamed bond: flasks + orbs reach the beasts |
| Alpha's Bond | support ('companion') | +50% bond potency (+10%/lvl) |
| Pack Instinct | support ('companion') | your charge gains echo to the beasts |
| Reciprocal Bond | support ('companion') | beast heals flow 40% back to you |
| Gentling Hand | support (`tameMod`) | claim terms: +0.15 sure, +0.2 wild, rares kneel |
| Beast Master | support (`tameMod`) | +1 bond slot; beasts −15% damage |
| `shared_surge` | 'of Fellowship' suffix | charges echo to the other seats |
| `menders_ripple` | Fellowship of the Wake notable | heals ripple 35% to 3 nearby allies |
| `matrons_draught` | den_matron (`MonsterDef.sympathy`) | her swig waters the pack (radius 300) |
| `provokers_bounty` | registered, unworn | the tradeoff lever: gains leak to enemies |

The **'companion' SkillTag** gates the keeper supports to the tamed-bond
family (tame_beast, companion_whistle) — texturally distinct from the
necromancer's swarm-count and corpse-economy halls. `SupportDef.tameMod`
(seat-bound, graftReadSites-rowed) reshapes the claim itself.

## Extending

- New bond: register a link + grant its stat anywhere mods exist. No engine.
- New kinship: `registerSympathyRelation(kind, gather)` + the union member.
- New channel: add the union member, fire the event at its canonical gate,
  replay it in `World.applySympathyEcho`.
- Echo-of-echo build: grant `sympathyDepth` (a keystone lever, unshipped).

## Sim/QA notes

- The support matrix reads sympathy gems and tameMod grafts as **blind**
  (BLINDNESS_RULES — solo probes field no kin, no claim verb); the probe
  file is the fabric's ground truth. Self-deleting doctrine: when a
  companion-fielding probe rig ships, delete the rows.
- Validator (`validate.ts`): link vocabulary, radius-required relations,
  listenable `from`, and **every `sympathy_<id>` grant anywhere must name a
  registered link** (skills, supports, passives, affixes, monsters).
- Two copies of an equipMods skill on one bar fold the mods twice
  (pre-existing bar semantics — duplicate-skill builds are refused by the
  sim injector for the same reason).
