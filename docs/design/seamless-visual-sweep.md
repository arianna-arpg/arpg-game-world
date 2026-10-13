# Seamless casting and summon-link sweep

Branch: `codex/seamless-cast-visuals`, based on the published seamless checkpoint
`9c36142e`. This is a focused presentation change. The active seamless checkout
has additional unpublished native-area work; do not publish or merge that whole
line merely to transfer these visuals.

The body-centered casting revision continues in `codex/seamless-visuals-publish`
from the integrated published checkpoint `d9864520`.

## Findings and changes

The catalogue census found **954 skills**, each with an authored delivery
profile. That is coverage, not proof of unaided recognition. The in-game review
compares 22 real casting/release courses, including close skeleton/golem relatives,
Lightning/Chain Lightning, beams, fire/frost bolts and novas, two melee attacks,
Bone Offering and the Amalgam. Actual seamless interior and outdoor captures use
disposable accounts and saves; grayscale frames remove hue as a recognition aid.

The shared-family revision (2026-10-13) covers all **661 spell definitions** in
this integrated catalogue with **14 reusable casting styles**. One deliberate
nonspell exception preserves Quickstep's existing mantle and hand accents.
Decorative preparation otherwise requires the spell tag and excludes attacks;
Cleave, Heavy Strike and Stone Skin retain native action animation. Functional
charge/channel/guard readiness and actual release effects are unchanged.

| Shared style | Preparation shape and motion |
| --- | --- |
| Arcane / universal fallback | Broken sigils fold inward |
| Fire | Soft flame tongues curl through the shoulders |
| Cold | Rigid splinters travel along straight crystal seams |
| Lightning | Branching current flickers; Chain Lightning keeps linked gathering |
| Chaos | Counter-winding strands braid through the torso |
| Physical spell | Heavy chevrons compress inward slowly |
| Life | Soft fans breathe toward the palms |
| Blood | Paired liquid threads pulse toward the hands |
| Summon, general | Open cradles close around the conjuration |
| Summon, undead | Ribs cradle the torso; bone fragments gather |
| Summon, nature | Tendrils and paired leaf forks unfurl inward |
| Summon, elemental | Broken spirals condense into two cores |
| Summon, golem | Weighty facets assemble around the shoulders |
| Construct | Separate elbows assemble into a precise frame |

The family is independent of color and finished-effect registry coverage.
School controls the main shape and cadence; delivery controls the final hand
focus. Spells in the same family deliberately share casting art, while native
projectiles, fields, summons and releases keep their more specific identities.

Resolution is explicit override, then summon-body taxonomy, then semantic school
tags (authored base damage only when school tags are absent), then healing or
construct defaults, then universal arcane. Mixed elemental schools resolve to
arcane; mixed/unknown summon pools resolve to general summon. Pool order, RNG,
recoloring and damage conversion never pick the style. All possible summon bodies
must share a subtype. Golem and skeleton memberships reuse the existing data;
other mappings are visual-only and do not change gameplay taxonomy.

Author unusual choices in `CAST_OVERRIDES`. Ordinary new spell IDs need no entry.
An override may choose a shared style, preserve a signature such as linked
lightning, or explicitly permit a nonspell exception. False suppresses decoration;
`castingCue: false` remains the broader native opt-out. The existing Wardrobe
Casting effects toggle remains the only player-facing choice. There are no new
unlocks, menus, or save/schema fields. Instant spells receive a family but never
invent a preparation phase.

The caster-vessel revision (2026-10-13) replaces the offset casting glyphs with
body-centered intake and hand concentration. Two passes sit behind and over the
native body, inside its existing breathing, action, traversal and emergence
transforms. All families use the actor's facing, including self-targeted casts
with coincident aim; summoning no longer stays fixed in screen orientation.
This changes presentation only, not cast duration, aiming or body mechanics.

The initial pass established body attachment. A second grayscale review separated
soft fire curls from angular frost facets and skeletal ribs from golem fragments.
Lightning branches through the shoulders; Chain Lightning gathers separate links.
A few material fragments spiral inward while the stored power grows with actual
completion. The hands retain charge on a completed hold, while endless channels
have steady concentration with flowing particles. No particle loop resets the
cast's completion, and native delivery alone owns release. A faint neutral core keeps dark recolors legible; thin dark edging keeps
energy legible over pale clothing without hiding the silhouette.

Only the local controlled player and local couch seats receive the additional
art. It follows the actual cast's progress, concentration, charge and channel
clock. Infinite channels have a steady form with gentle motion, not a fictitious
completion cycle. Guards retain their existing functional warnings/readiness.
Instant casts invent no preparation phase. Interruptions, release, death,
downing and unavailable bodies end the art with the real cast. Concealment and
other body fades also apply to its casting layers.
Existing payloads own release cues; there is no predicted successful summon.

**Wardrobe → Casting effects** is a free saved account preference, default on.
Turning it off removes the new preparation layer while preserving functional
cast bars and existing readiness cues. Skill recoloring already applies to the
new art. This is a toggle, not a new paid cosmetic or collection of unlocks.

## Return-only minion links

The old continuous ownership line is now emitted only by the actual AI heel,
passive/defensive return, or explicit recall path. Arrival, combat and early
refusals clear its presentation-only intent. Small throng formation corrections
do not draw a leash. A downed/stunned body or unavailable keeper does not show
an active return. The source/stance badge still identifies the summon while idle.

Life Bond, taming progress, authored gameplay tethers, birth/death accents and
their visibility rules remain authoritative. No follow distance, pathfinding,
teleport recall, targeting, reservation, damage, cooldown or RNG behavior changes.
Existing companion cue snapshots carry the resulting visible links; return
intent is unsaved scratch state. Own co-op casts use the existing real instance
and host completion fields, with no new gameplay or wire schema.

## Files and verification

- `src/data/skillCastVisuals.ts`: reusable preparation family/material reads.
- `src/engine/playerCastVisual.ts`: actual clock and eligibility read.
- `src/render/vis/skillCastPreparation.ts`: bounded procedural shapes.
- `Actor.companionReturnTo`: AI-owned transient return intent.
- `CosmeticLoadout.castingEffects`: optional, sanitized account preference.

Checks:
- `npm run check`, `npm run build`, 25-episode simulation smoke.
- `npm run probe -- playercastvisuals --retries 0`: full catalogue census,
  actual summon preparation/interruption/birth, own co-op cast, return/arrival/
  combat, endless channel, account round trip and finite palette-independent
  geometry across the complete catalogue, future unregistered spell fallbacks,
  mixed schools/pools, Quickstep preservation, and ordinary/charged attack cues.
- Existing `castingcues`, `companioncues`, `cosmetics`, `companionstance`,
  `throngcombat` and `movementtether` probes (one filter per command).
- `npx electron balance/caster-vessel-ui.cjs`: 39 real skill/action preparations covering every shared style,
  25 motion samples, four facings, normal-world and pale-background views,
  player Wardrobe toggle, attack exclusion and stunned interruption.
  Run with `HOLLOW_WAKE_QA_CLASS=necromancer`, `magician`, and `warrior` for
  different bodies. `caster-vessel-study.cjs` assembles a portable review page from
  these actual-client frames; motion/facing recordings use compact WebP while
  visibility assertions retain lossless PNG. The viewer is not an alternate
  implementation of the art.
- `npx electron balance/seamless-visual-sweep-ui.cjs`: actual seamless renderer,
  22 native casts, preparation/release frames, native summon bodies, minion
  return/arrival, player-versus-enemy rendering, Wardrobe toggle and reload.

Ignored evidence lives in `balance/reports/skill-visuals/`: census, live-course
JSON, color/monochrome contact sheets, summon return images and Wardrobe capture.
The caster-vessel study adds motion/facing frames and a portable HTML viewer.
The original dark-room captures were reviewed before the final outdoor course;
the final run overwrites the contact sheets. Render comparison uses real payloads,
but controlled placement/resources and short courses. This is not an exhaustive
playthrough of every build/support combination or a busy-fight acceptance claim.

Follow-up candidates: recognition among close skeleton/golem relatives at normal
zoom, field density in full parties, and optional authored Wardrobe casting styles.
The shared style registry supports that work without changing cast mechanics.
