# Stealth, cover and enemy knowledge

Personal concealment and terrain cover are separate systems. A tree crown is overhead art and shade; its trunk blocks sight and projectiles. Bushes, reeds, berry bushes and tall crops obscure sight through their foliage, without applying a stealth buff to their occupants.

## Terrain

`DoodadRule.sightCover` is optical density. The shared sight ray measures its exact chord through each foliage disc, sums the depth along the ray, and stops when it reaches `SIGHT_COVER_CFG.depth` (48). Overlapping foliage uses the strongest density, so overlapping decorative copies cannot multiply cover. Bush density is 1; tall crops use 1.2. A shallow leaf margin can remain transparent, nearby bodies can see each other inside a stand, and deep foliage can break sight in either direction. Gaps do not replenish the ray's depth budget. Felling or removing the foliage removes its contribution; foliage is restricted to its own story.

This is the same ray used by AI, line-of-sight queries and watcher fans. It does not stop movement or projectiles. Solid blockers and opaque fog retain their own rules. `PerceptionSpec.xray` explicitly bypasses the sight gate.

Veil-bearing overhead doodads use `bodyRadiusOf` for solid sight geometry, preserving the drawn canopy and its local fade. The veil's default `standStatus` is empty. A content author can still opt into a specific standing status. Visual canopy concealment still gates aim assist against enemies obscured by distant rendered crowns.

## Personal concealment

The `concealment` stat opts any actor into the same shroud used by Stealth charges. Cloak grants it for eight base seconds, with its existing movement bonus. `detectability` remains a separate, multiplicative investment and environmental modifier. No skill-id or class-id branches participate in detection.

`SENSE_CFG.stealthMul` sets concealed frontal reach (0.35). Behind an observer, concealment also caps the rear fraction at `concealedRearMul` (0.1). Alert raises reach by `alertMul`, but preserves the concealed rear opening. This lets a Rogue or Tamer approach a Zombie's back without the zombie automatically turning toward them. Frontal close approaches are still discoverable. An explicitly invisible actor cannot be deliberately acquired, even by xray; stray attacks and areas retain their existing hit rules.

An offensive use sets `Actor.concealmentExposedUntil` to the world clock plus `PERCEPTION_CFG.exposureSec` (1.25 seconds). The cloak buff remains, but its detection benefit and body fade are suppressed during exposure. Stealth spends one charge; invisibility-granting buffs are consumed through the existing offensive-use contract. `breaksStealth: false` remains an explicit exemption. Utility does not expose the actor. Remaining concealment resumes when the offensive use window expires. Existing committed projectiles and zones retain their damage behavior.

An ordinary Cloak can now earn the existing ambush bonus: concealment must be active, the victim must not hold the attacker as its target, and its alert window must have expired. Positional Backstab still independently tests the victim's facing. A melee hit can resolve before the offensive use exposes its caster; projectile ambush timing retains the existing hit-time rule.

## Knowledge and investigation

Both the full acquisition scan and its between-scan validation require current perception. On loss, the AI drops its live target reference and investigates a copied `aiLastSeen` position and story. Combat kernels receive no hidden target to follow or aim at. The existing ray cache can delay recognizing a newly blocked line by its short `LOS_CFG.memoTtl` window.

`PerceptionSpec.memory` controls investigation duration (default `LOS_CFG.chaseMemory`, five seconds; zero disables visual-loss investigation). The actor walks to the remembered point, then turns there at `searchTurn` radians/sec (default 1.6) until its evidence expires. Ordinary sensing continues throughout. Watchers descend from locked to searching when they lose their quarry, restoring both their honest tell and their suspicion gate. `relentless` preserves its extended detection reach while engaged; it does not authorize tracking through walls or foliage.

Wounds give ordinary enemies as well as watchers a copied point to investigate, scaled by their authored `alertMul`. Damage records attribution separately from perception; knowing the damage author does not make them a live target. Projectile hits carry their launch position, zone hits carry the affected zone, and delayed hit fuses retain the original evidence. Secondary hits without an explicit origin point to the impact location. Thus a hidden archer can relocate while an enemy investigates where the shot came from. Fresh kin sighting callouts replace an older investigation point for idle searchers. Noise and scent retain the watcher fabric's place-only evidence.

Encounter assignments, squad focus, taunts and issued target overrides must pass the recipient's own perception before becoming combat targets. Assault orders can continue walking toward their issued location when the pinned target is unseen. Explicit authored xray remains available for senses that cross terrain.

## Presentation, extension and verification

Concealment fades the actor while active; exposure restores its body opacity. Searching is visible through approach and turning, and existing watcher tells/fans. No instructional combat captions were added. Co-op snapshots ship derived concealment and its exposure deadline; client fans use the same sense formula as acquisition. Search memory stays host-local and transient, so no save-version change is needed.

Primary extension points:

- `SENSE_CFG`: shroud strength, rear suppression, alert reach.
- `PERCEPTION_CFG`: exposure, wound investigation, search arrival and turn defaults.
- `PerceptionSpec`: species-specific sight arc, rear awareness, memory, turn rate, alert duration and xray.
- `DoodadRule.sightCover` and `SIGHT_COVER_CFG.depth`: authored foliage density and depth budget.
- Actor stat sources, charges, skill effects and existing watcher noise/scent profiles compose these behaviors.

`balance/probe_stealth.ts` exercises real casting and AI, including the Rogue/Tamer rear approach, backstab/exposure/escape, forest combat, foliage loss and stale-position search, invisibility, explicit xray, relentless pursuit, projectile evidence, ambush damage, watcher presentation and co-op. It also pins sight geometry, overlapping foliage, gaps, felling, tiers and shot passage. Related checks: watchers, canopy presence, garden, settled, butteland, companion/assault, tactical AI, handling and encounter combat. Run `npm run check`, the probe gate, `npm run sim -- run --suite smoke`, and `npm run genqa`. After building, `balance/canopy-visual.cjs` verifies retained canopy fading and cache behavior.
