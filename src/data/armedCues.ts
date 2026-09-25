/** Worn cull-bank profiles. Their scalars change only presentation; the bank,
 * life threshold, fuse and footprint belong to the existing status mechanic. */
export interface ArmedCueStyle {
  teeth: number; quietScale: number; tightScale: number; bodyPad: number;
  width: number; alpha: number; turnRate: number;
  footprintAlpha: number; footprintUrgency: number; footprintArc: number;
  release: string;
}
export const ARMED_CUE_STYLES: Record<string, ArmedCueStyle> = {
  doom: { teeth: 6, quietScale: 1.65, tightScale: 0.95, bodyPad: 6,
    width: 2, alpha: 0.85, turnRate: 0.1,
    footprintAlpha: 0.12, footprintUrgency: 0.32, footprintArc: 0.62,
    release: 'doom_rupture' },
};
