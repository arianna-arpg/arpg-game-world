# Desert ambience

Sand drift and its dust devils live in zone world coordinates. Their births,
lifetimes and travel come from the zone seed, fixed cells and the world clock.
Panning, resizing, split-screen framing and camera zoom only change which portion
is drawn. Looking away does not stop them; returning samples their current age.
The renderer uses the terrain camera, including camera shake. It does not use
the continuous-eye offset reserved for Mu's distant parallax layers.

`src/world/ambientFx.ts` is the shared authoring contract used by `ZoneTheme`.
`render/vis/ambientField.ts` supplies stateless placement and defaults in
`AMBIENT_FIELDS`; `desertFx.ts` paints the result. No actors, saves, collisions,
gameplay RNG, damage or status effects are added. Tumbleweeds are decoration;
they fade through their lifetime and skip blocked/roofed positions rather than
simulating collisions. Terrain heat patches use the same ground-position gate.

Each theme can compose independent rows:

```ts
ambientFx: [
  { kind: 'sandDrift', intensity: 0.5,
    field: { velocity: [170, -55] },
    dustDevils: { spacing: 800, period: 16, lifetime: 6, chance: 0.65 } },
  { kind: 'tumbleweeds', intensity: 0.7, field: { velocity: [48, -16] } },
  { kind: 'heatHaze', anchor: 'view', intensity: 0.8 },
  { kind: 'heatHaze', anchor: 'world', intensity: 0.45,
    patches: [{ x: 900, y: 600, radius: 110 }] },
]
```

Heat haze defaults to `view`, preserving the broad personal/screen effect.
`world` draws localized terrain patches. Omit `patches` for a seeded field,
or supply explicit zone-pixel positions; an empty array disables that field.
Two rows combine both modes. The scrub desert now demonstrates both modes and
sparse tumbleweeds. Existing `heat_shimmer` doodads remain the terrain hazards
that grant `sunscorched`; cosmetic patches do not imply a new hazard.

`field` overrides spacing, count per cell, radius, velocity, period, lifetime,
chance and a seed salt. `dustDevils: false` keeps sand without vortices. Count
or chance zero disables a field. Intensity changes opacity without reshuffling
positions. Period zero produces stationary persistent patches. Moving fields
fade at birth/death; their padded sampling includes offscreen travel. Candidate
work scales with visible cells and travel, not total zone size. Authoring guards
keep spacing at least 128, count at most 32, radius at most 256, speed per axis
at most 500, and lifetime at most 120 seconds and no longer than its period.

The existing sandstorm weather front still uses `weatherFx.ts`, just like rain.
This change fixes the separate standing desert ambience.

Verification:

- `npm run check`
- `npx tsx balance/ambient-weather-check.ts`
- `npm run probe -- transience`
- `npm run sim -- run --suite smoke`
- `npm run genqa`
- `npx vite build --outDir balance/reports/ambient-weather/dist`
- `npx electron balance/ambient-weather-ui.cjs`

The hidden client course uses disposable saves. It checks actual painted camera
offsets, resize/zoom, screen heat, terrain heat, composition, zero intensity and
ground gating, and captures the authored desert and an amplified effect study.
