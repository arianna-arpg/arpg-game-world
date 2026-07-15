# The Corpse Economy & the Wagon Fabric

Corpses are the necromancer's ammunition: ephemeral remnants (`World.corpses`,
`Corpse`) minted by enemy deaths, demon-crater overflow, and producer skills
(Exhume's `spawnCorpse` effect), consumed by the corpse-skill family. Every
dial lives in **`CORPSE_CFG`** (`engine/world.ts`): shelf life (`duration`),
the world cap (`max`), producer mints (`mint`), and the wagon's growth dials
(`batch`). No scattered literals.

## Targeting: one find, one load

A skill with `targeting: { target: 'corpse', … }` resolves through THE one
corpse branch of `World.resolveTargeting`:

1. **The grimoire exemption** — an attuned bestiary form needs no body.
2. **The find** — corpses within `castRange` of the caster and `searchRadius`
   (default 70) of the aim, nearest-the-mark first.
3. **`plural: true`** (TargetingSpec) — THE WAGON: the find gathers up to
   `1 + corpseBatch` bodies in one load (`ResolvedTarget.corpses`, primary
   included). Leave unset on skills whose effect cannot scale with a haul
   (Corpse Shift: one destination — it never takes extra bodies).
4. **Soulwalk** (`targetMinionFallback`) keeps FIRST CLAIM on a bare field:
   zero corpses → target a living minion, harmlessly.
5. **Sacrificial Rites** (`sacrificeMinions`) fills a SHORT load from the
   minion rank, nearest first — each death is real (Martyrdom applies). With
   no wagon the load is 1, which is exactly the classic none-available
   fallback.

## The corpseBatch stat — both directions of the economy

`corpseBatch` (stats.ts) is ONE stat with two readings:

- **Consumers** (plural finds): eat/raise up to `1 + N` bodies per cast.
  - `corpseLifeDamage` fuel **sums** over the feast (Corpse Explosion).
  - `corpseLifeRestore` life/mana **sums** the same way (Corpse Feast — the
    banquet), paid through `applyRestore` (healBy / capped mana).
  - Projectile deliveries gain **one flight per extra body**
    (`batch.projectilesPerExtra` — Volatile Cinders: cinders rise from the
    pile via `origin: 'cursor'` + homing trajectory).
  - The footprint **widens** (`aoeScale`) and effect durations **stretch**
    (`durScale`) per extra body — `CORPSE_CFG.batch.aoePerExtra` /
    `.durationPerExtra`. Offerings burn wider and longer.
  - Corpse summons (`fromCorpse`) raise **one minion per body**, clamped to
    FREE roster slots (a full roster keeps the classic single-raise rotate;
    the rite eats only what stands back up).
  - Hiveborn's `corpseSpawn` graft crawls out **per corpse consumed**.
- **Producers** (Exhume's `spawnCorpse` effect): mint `count + N` bodies per
  dig — cast cadence traded for quantity.

`corpse_wagon` (supports.ts) is the droppable bearer: +2 batch (+1 per 4 gem
levels), 15% less cast speed, `requiresTags: ['corpse']`,
`excludeTags: ['movement']` (the shift can't spend a pile, so the wagon
refuses the hitch rather than ride inert).

The utility side: **Gather the Dead** (`dragCorpses` effect) piles every
corpse within its sweep at the mark — nothing consumed; corpseBatch widens
the sweep (the wagon hauls from farther afield), so the pair is never inert.

## Echo composition: every beat seeks its own load

Secondary executions (echo beats via `pendingRepeats`, dance figures, hatched
payloads) arrive in `executeSkill` with no find of their own; a corpse skill's
beat **re-resolves at its own aim** — so Spell Echo × Corpse Wagon is
multi-corpse, multi-explosion, each beat eating a fresh load off the pile. A
consumed-mid-gesture primary re-seeks the same way. A bare field REFUSES the
beat exactly as it refuses the press: no free unfueled novas from a skill
whose whole grammar is the fuel.

## The charnel kit (world-side)

- **`BrittleSpec.corpses`** (levelgen.ts type; `World.popBrittle` handler):
  a struck breakable spills RAISABLE BODIES — minted like Exhume's stand-ins,
  level-scaled. Borne by `shallow_grave` and `plague_cart`
  (data/formations.ts rules; visuals in doodadVisuals.ts + painters), scattered
  through the crypt tileset and the `charnel_waystop` formation (the dead-cart
  stalled among the graves it was filling).
- **`charnel_ghoul`** (monsters.ts) — the economy's rival customer: the
  existing `carrion` lever noses it to bodies out of combat, and
  `gorge_carrion` (skills.ts, noDrop) BOLTS one down mid-fight through the
  same targeting resolve + `corpseLifeRestore` path as the player's Feast —
  healing, frenzying, and denying your detonations their fuel.
- Kit-parts for the entity creator: `shroudWrap`, `carrionFlies`
  (render/vis/parts.ts). Corpses render as sinking REMAINS tinted by the
  fallen kind (renderer.drawCorpses).

## Sim & verification

- **Corpse feeder** (`ScenarioDef.corpseFeed`, runner.ts): corpse-consuming
  hosts can't bootstrap fuel in a probe (nothing dies until something casts),
  so the feeder lays deterministic bodies along the battle line.
  `probeScenario` arms it for every corpse-tagged host —
  `COMPAT_CFG.corpseFeed`. Before it, the entire corpse column of the support
  matrix read false-INERT (even long-shipped Sacrificial Rites).
- **Fallback levers stay blind by design** in the fed, minionless rig — a
  BLINDNESS_RULES row classifies rites/soulwalk pairs honestly.
- **`npx tsx balance/probe_corpse.ts`** — the deterministic end-to-end probe:
  single-appetite parity, the 3-load consume, summed fuel, echo re-seek,
  rites fill, soulwalk precedence, cap-clamped batch raise, Exhume inversion.
