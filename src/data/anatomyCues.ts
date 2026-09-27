/** Shared materials for health windows, detachable parts and segment wounds.
 * These are presentation dials; no profile changes a hitbox or damage pool. */
export interface AnatomyCueSpec { profile?: string; color?: string; }
export interface AnatomyCueStyle {
  color: string; highlight: string; width: number; bodyScale: number;
  breakFlash: string;
}
export const ANATOMY_CUE_STYLES: Record<string, AnatomyCueStyle> = {
  weakness: { color: '#f29cce', highlight: '#ffe8f6', width: 1.6, bodyScale: 0.65, breakFlash: 'anatomy_weak_break' },
  armor: { color: '#d9b978', highlight: '#fff0c6', width: 1.7, bodyScale: 0.78, breakFlash: 'anatomy_part_break' },
  flesh: { color: '#ed8580', highlight: '#ffd4ac', width: 1.8, bodyScale: 0.72, breakFlash: 'anatomy_segment_tear' },
};
export const ANATOMY_CUE_CFG = {
  outline: '#14141e', outlineWidth: 3, waitingAlpha: 0.62, activeAlpha: 0.96,
  overheadWidth: 48, hatchGap: 6, bodyMarks: 3, scarLimit: 32,
  meterWidth: 11, meterHeight: 5, meterGap: 4,
  scarScale: 0.48, breakPad: 12,
};
