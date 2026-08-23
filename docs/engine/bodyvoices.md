# THE BODY'S VOICES — death by material, hit by type (M-HIT/DEATH)

*Rung five of the show-don't-tell ladder (`docs/design/show-dont-tell.md` §4/§5).
Engine seat `src/engine/bodyVoices.ts`; probe `balance/probe_bodyvoices.ts`.*

## The law

A death flash and an impact flash used to be ONE disc in the skill's color —
the 'pop' of §4, 265 sites deep. This rung replaces the ring at the body's two
loudest moments with voices drawn from THE EFFECT VOICE registry
(`render/vis/effectVoice.ts`): the grammar adds voices, never a second flash
system. Two resolvers, both PURE, both total (THE FALLBACK LAW — every input
resolves to a registered voice; nothing falls to the bare ring):

| resolver | keyed on | table |
|---|---|---|
| `deathVoiceOf(material)` — THE DEATH VOICE | the body's `MATERIAL_NATURE` id | flesh/fur/scale → **spatter** · chitin/bone → **flecks** · slime → **wetpop** · verdant/cloth/wood/stone/metal → **dust** · crystal/ice → **sparkle** · ember → **flare** · ethereal/void/cosmic → **wisp** · unknown → `deathFallback` (dust) |
| `hitVoiceOf(type, surface)` — THE HIT VOICE | the blow's dominant damage type × body/wall | fire → **flare** · cold → **rime** · lightning → **spark** · chaos → **spatter** · physical → **flecks** on a body, **dust** on a wall · no type → `hitFallback` |
| `hitTintOf(type)` — THE HIT TINT | the blow's dominant type | physical white (the plain flash) · fire `#ffb070` · cold `#a8e0ff` · lightning `#fff0a0` · chaos `#b8f0a0` |

Every table lives in `BODY_VOICE_CFG` — a new material or damage type is one
row; probe A1/B3 fail the build if a row names an unregistered voice, A2 if a
`MATERIAL_NATURE` id is left to the fallback (known bodies are NAMED).

## The seats

- **`World.kill`** — the actor's death flash, a broken part's flash, and every
  worm segment's flash wear `fx: deathVoiceOf(material)` (the part reads its own
  material first, the host's second).
- **`applyHit` (damage.ts)** — beside the existing flash clock (`hitFlash =
  0.15`, and the ply-eat landing) stamps `Actor.hitFlashType =
  dominantTypeOf(packet.amounts)`: the ROLLED truth after conversions, so a
  physical skill converted to fire flashes fire. The renderer's baked body
  flash (`render/vis/hitFlash.ts`) tints through `bodyTintSprite` — a per-tint
  bake keyed `bodyTint|<tint>|<bodyKey>` drawn source-in over the body bake;
  'outline' mode and white skip the tint (the plain flash is the plain flash).
- **`updateProjectiles`** — the body hit speaks the VICTIM's freshly stamped
  `hitFlashType` (resolveHit ran one line above — drawn == the blow that
  landed), falling to the shot's `conductElem` then the skill's heaviest
  `baseDamage` lane (`skillBaseTypeOf` — the STATIC read for impacts with no
  victim to ask); the two wall stops (surface slab / grid wall) speak the
  wall half.

## What stays open (the §4 row's other half)

THE ARROW'S END by projectile FORM — a shaft that skitters and stands, a bolt
that fizzles, an orb that pops wet, a shard that shatters through the
dissolution cut — is not built: the impact voice keys on the blow's TYPE only.
THE CAST VOICE (`executeSkill`, by element × delivery) and the proc voices are
untouched. Neither needs a new system; each is a resolver row on the same
registry.

## Gates

`npx tsx balance/probe_bodyvoices.ts` (fast lane of `npm run probe`): the two
resolvers over every material + damage type, the kill's flash fx (crystal →
sparkle, chitin → flecks), the applyHit stamp, the source-lint of the seats.
