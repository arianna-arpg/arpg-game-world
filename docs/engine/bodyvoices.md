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
  victim to ask); ricochets off a surface or grid wall speak the
  wall half.

## Projectile endings

A spent shaft carries forward, pitches down to meet its shadow, and kicks up
grit as its point enters the ground. On a wall the point lodges immediately
at the collision surface. In both cases the exposed tail quivers, holds and
fades. A loose weapon settles, fire
puffs into embers, ice breaks into chips, lightning discharges, liquid spatters
and spectral material unravels. At a wall, debris travels back from the struck
face. A target hit uses its existing impact voice. A piercing shot can register
several hits and still leave an ending when its remaining range runs out.
Ricochets and return turns keep flying. A weapon that plants a real construct
uses the construct for its landing.

`src/data/projectileEndings.ts` sets each ending's lifetime and piece count.
In `PROJECTILE_ENDINGS.lodge`, `seconds` and `wallSeconds` set the ground
and wall lifetimes. `dropFraction`, `quiverFraction` and `fadeFraction`
allocate portions of the lifetime to descent, impact and fade. Keep their sum
below one to leave a still hold. Walls start at impact. Wardrobe glyphs can
set `embedAt` in projectile radii to place the burial line on their own shaft.
A prop whose art has a different silhouette from its collider can supply a
`DoodadRule.shotEndFace`. The timber wall shares this face with its painter.
Set `ending` on a wardrobe projectile, projectile delivery, or shared flight
art profile, in descending priority. Otherwise the weapon, motif, and damage
type supply the default. The ending carries the actual head, color, facing and
story tier to co-op peers. Its clock runs on simulation time. It has no hitbox.

Firebolt and Fireball both shed cinders at the end of their range. Fireball
also carries a native `delivery.explode`. When flight ends on a body, at a
wall, or in open air, the blast marks its damage area. The body struck directly
receives its contact hit once. A body pierced earlier can take splash from
a later explosion. Fulminate adds a blast on each hit the flight survives.
Parting Gift can give a plain projectile a separate Frost Nova on completion.
An absorbing dome consumes the flight and its landing effects.

## Gates

`npx tsx balance/probe_bodyvoices.ts` (fast lane of `npm run probe`): the two
resolvers over every material + damage type, the kill's flash fx (crystal →
sparkle, chitin → flecks), the applyHit stamp, the source-lint of the seats.

`balance/probe_projectileendings.ts` checks the projectile catalogue, terminal
outcomes, special landings and co-op. After building the game, run
`electron balance/projectile-endings-ui.cjs` for first, middle and final
frames from the production renderer across all seven endings.
The same renderer check measures the visible reach and fade of native
explosions. `npx tsx balance/probe_projectilepayloads.ts` exercises expiry,
wall contact and body contact for every direct projectile, then compares
bystander health, surviving hits, split and return legs, and absorption.
