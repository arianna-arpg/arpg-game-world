import { MAIN_REALM } from '../data/passiveRealms';

export interface PassiveTreeArtStyle {
  /** The hub is shared with Vocation layouts; class-start remains an opt-in. */
  anchor: 'hub' | 'class-start';
  /** Geometry in tree units, relative to the selected anchor. */
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  /** The image fades from full strength to transparent at its outer ellipse. */
  fadeStart: number;
  saturation: number;
  haloRadius: number;
  haloOpacity: number;
  ringRadius: number;
  ringOpacity: number;
}

/** Paint only: no class eligibility, allocation, point pools or saved state. */
export const PASSIVE_TREE_ART_CFG = {
  enabled: true,
  realms: [MAIN_REALM] as readonly string[],
  showInEditor: false,
  searchOpacity: 0.25,
  defaults: {
    anchor: 'hub',
    width: 600, height: 400, offsetX: 0, offsetY: 0,
    opacity: 0.64, fadeStart: 0.28, saturation: 0.7,
    haloRadius: 180, haloOpacity: 0.16,
    ringRadius: 42, ringOpacity: 0.45,
  } satisfies PassiveTreeArtStyle,
  /** Override framing or intensity for any current or future class here. */
  classes: {} as Record<string, Partial<PassiveTreeArtStyle> | undefined>,
};
