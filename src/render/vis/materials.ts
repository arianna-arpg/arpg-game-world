// ---------------------------------------------------------------------------
// MATERIALS — the registry that turns one flat def color into a full shaded
// look. A material shapes the shading ramp (how deep shadows sink, how hot
// highlights climb, whether shadows cool off toward violet), the surface
// treatment (specular dot, gloss band, translucency, self-glow) and a baked
// texture stipple (bone cracks, chitin plates, crystal facets…).
//
// Content stays one-color-per-def; picking a material here is the ONLY extra
// word a monster/doodad ever has to say to earn a complete rendered identity.
// Add an entry to extend the vocabulary — nothing in the renderer enumerates
// material ids.
// ---------------------------------------------------------------------------

import { adjust, mix } from './color';

export interface MaterialDef {
  /** How far the shade side sinks toward black (0..1). */
  shadow: number;
  /** How far the lit side climbs toward white (0..1). */
  highlight: number;
  /** Hue rotation applied to shadows (degrees) — cool shadows read painterly. */
  coolShadow?: number;
  /** Saturation multiplier on the lit side (metals desaturate, gems bloom). */
  litSat?: number;
  /** Specular dot: radius fraction + alpha (0/undefined = matte). */
  specSize?: number;
  specAlpha?: number;
  /** A broad glossy band across the lit hemisphere (chitin, metal, ice). */
  glossAlpha?: number;
  /** Baked self-glow halo behind the silhouette (embers, spirits, crystals). */
  emissive?: number;
  /** Body translucency (ethereal things never read fully solid). */
  alpha?: number;
  /** Texture stipple painted inside the silhouette at bake time. */
  texture?: 'cracks' | 'plates' | 'facets' | 'grain' | 'fur' | 'drips' | 'weave' | 'pit' | 'scales';
  textureAlpha?: number;
}

/** The material vocabulary. Keys are open — content may name any of these,
 *  and new surfaces join by adding a row. */
export const MATERIALS: Record<string, MaterialDef> = {
  /** Soft organic default — most living things. */
  flesh:    { shadow: 0.38, highlight: 0.22, coolShadow: 14, specSize: 0.34, specAlpha: 0.10 },
  /** Dry matte bone — deep cracks, hard edge, barely any shine. */
  bone:     { shadow: 0.30, highlight: 0.30, coolShadow: 6, texture: 'cracks', textureAlpha: 0.22 },
  /** Lacquered insect shell — hard gloss band, plated segments. */
  chitin:   { shadow: 0.48, highlight: 0.26, coolShadow: 10, glossAlpha: 0.22, texture: 'plates', textureAlpha: 0.20 },
  /** Rough mineral — grainy, strong occlusion, no specular. */
  stone:    { shadow: 0.42, highlight: 0.18, texture: 'grain', textureAlpha: 0.20 },
  /** Worked metal — desaturated highlights, tight hot specular. */
  metal:    { shadow: 0.50, highlight: 0.42, litSat: 0.6, specSize: 0.22, specAlpha: 0.35, glossAlpha: 0.16 },
  /** Cut timber — directional grain, warm shadows. */
  wood:     { shadow: 0.36, highlight: 0.16, coolShadow: -8, texture: 'grain', textureAlpha: 0.24 },
  /** Woven cloth — soft everything. */
  cloth:    { shadow: 0.30, highlight: 0.14, texture: 'weave', textureAlpha: 0.12 },
  /** Gem lattice — faceted, luminous, saturated. */
  crystal:  { shadow: 0.40, highlight: 0.50, litSat: 1.25, specSize: 0.20, specAlpha: 0.5, emissive: 0.30, texture: 'facets', textureAlpha: 0.26 },
  /** Wet ooze — translucent body, rolling highlight, drip marks. */
  slime:    { shadow: 0.30, highlight: 0.34, alpha: 0.82, specSize: 0.42, specAlpha: 0.22, texture: 'drips', textureAlpha: 0.18 },
  /** Unbodied spirit — translucent, self-lit, cold. */
  ethereal: { shadow: 0.12, highlight: 0.42, alpha: 0.66, emissive: 0.5, coolShadow: 24 },
  /** Cooling lava skin — dark crusted body over inner glow. */
  ember:    { shadow: 0.55, highlight: 0.30, emissive: 0.45, texture: 'cracks', textureAlpha: 0.35 },
  /** Glazed ice — bright, glossy, translucent edge. */
  ice:      { shadow: 0.26, highlight: 0.48, alpha: 0.92, glossAlpha: 0.28, specSize: 0.24, specAlpha: 0.4, texture: 'facets', textureAlpha: 0.16 },
  /** The hungry dark — swallowed shadows, thin violet rim. */
  void:     { shadow: 0.65, highlight: 0.10, coolShadow: 40, emissive: 0.18, alpha: 0.94 },
  /** Living growth — leafy speckle, sun-warm highlights. */
  verdant:  { shadow: 0.40, highlight: 0.24, coolShadow: 10, texture: 'fur', textureAlpha: 0.2 },
  /** Bristled hide — directional fur strokes. */
  fur:      { shadow: 0.40, highlight: 0.20, coolShadow: 8, texture: 'fur', textureAlpha: 0.26 },
  /** Wet serpent hide — imbricated scale crescents under a hard gloss. The
   *  sheen rides worm-tail segments too (they bake from the same material),
   *  so a naga's coils glisten without any per-segment geometry. */
  scale:    { shadow: 0.46, highlight: 0.28, coolShadow: 12, glossAlpha: 0.24, specSize: 0.26, specAlpha: 0.18, texture: 'scales', textureAlpha: 0.24 },
};

const FALLBACK: MaterialDef = MATERIALS.flesh;

export function materialOf(id?: string): MaterialDef {
  return (id && MATERIALS[id]) || FALLBACK;
}

/** The 5-tone ramp a material derives from one base color. */
export interface Ramp {
  outline: string;
  shadow: string;
  base: string;
  light: string;
  highlight: string;
}

export function rampOf(color: string, mat: MaterialDef): Ramp {
  const shadow = adjust(mix(color, '#000000', mat.shadow), mat.coolShadow ?? 0, 1, 0);
  const light = adjust(mix(color, '#ffffff', mat.highlight), 0, mat.litSat ?? 1, 0);
  return {
    outline: mix(color, '#000000', Math.min(0.8, mat.shadow + 0.35)),
    shadow,
    base: color,
    light,
    highlight: mix(light, '#ffffff', 0.55),
  };
}
