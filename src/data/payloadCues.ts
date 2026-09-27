/** Presentation only. Stored drinks, ammunition and placed routes keep their
 * own economies; this shared vocabulary never invents a loaded payload. */
export type PayloadCueKind = 'prime' | 'ammo' | 'carom';
export interface PayloadCueStyle {
  shape: 'vial' | 'chamber' | 'arrow' | 'anchor';
  size: number; width: number; alpha: number;
  load: string; release: string;
}
export const PAYLOAD_CUE_STYLES: Record<string, PayloadCueStyle> = {
  vial: { shape: 'vial', size: 5, width: 1.4, alpha: 0.95, load: 'payload_prime', release: 'payload_release' },
  chamber: { shape: 'chamber', size: 4, width: 1.3, alpha: 0.85, load: 'payload_load', release: 'payload_release' },
  arrow: { shape: 'arrow', size: 5, width: 1.5, alpha: 0.9, load: 'payload_load', release: 'payload_release' },
  anchor: { shape: 'anchor', size: 5, width: 1.5, alpha: 0.9, load: 'payload_load', release: 'payload_release' },
};
export const PAYLOAD_CUE_DEFAULTS: Record<PayloadCueKind, string> = { prime: 'vial', ammo: 'chamber', carom: 'anchor' };
export const PAYLOAD_CUE_CFG = {
  outline: '#17191f', empty: '#48505b', bodyRows: 3, bodyPips: 6, hudPips: 8,
  bodyPad: 8, rowGap: 11, transitionPad: 7, markerSize: 9, linkAlpha: 0.35,
  triggerAlpha: 0.42, triggerDash: [3, 9], windowWidth: 1.5,
};
