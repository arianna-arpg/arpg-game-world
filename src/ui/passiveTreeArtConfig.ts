import { MAIN_REALM } from '../data/passiveRealms';
import { PASSIVE_TREE_HUB_FRAME, PASSIVE_TREE_ART_FRAMES } from '../data/passiveTreePresentation';

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

export interface PassiveTreeArtSource {
  catalogue: string;
  /** Which supplied identity wins when a source has several available images. */
  order: 'first' | 'last';
  style?: Partial<PassiveTreeArtStyle>;
}

export interface PassiveTreeArtConfig {
  enabled: boolean;
  realms: readonly string[];
  showInEditor: boolean;
  searchOpacity: number;
  defaults: PassiveTreeArtStyle;
  /** First source with available artwork wins; missing art falls through. */
  sources: readonly PassiveTreeArtSource[];
  /** Namespaced identity, e.g. `vocation:gravebinder` or `class:spellblade`. */
  artworks: Readonly<Record<string, Partial<PassiveTreeArtStyle> | undefined>>;
}

/** Paint only: no eligibility, allocation, point pools or saved state. */
export const PASSIVE_TREE_ART_CFG: PassiveTreeArtConfig = {
  enabled: true,
  realms: [MAIN_REALM],
  showInEditor: false,
  searchOpacity: 0.25,
  defaults: {
    anchor: 'hub',
    ...PASSIVE_TREE_HUB_FRAME,
    opacity: 0.64, fadeStart: 0.28, saturation: 0.7,
    haloRadius: 180, haloOpacity: 0.16,
    ringRadius: 42, ringOpacity: 0.45,
  },
  // Earned Vocations precede class art. If the gameplay cap grows, the latest
  // earned Vocation with a painting wins without changing the renderer.
  sources: [
    { catalogue: 'vocation', order: 'last' },
    { catalogue: 'class', order: 'first' },
  ],
  artworks: PASSIVE_TREE_ART_FRAMES,
};
