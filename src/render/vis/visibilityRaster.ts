/** The display-sized projection, independent of the world's adaptive pixel
 * buffer. Occlusion masks keep their sampling grid and feather width when
 * the resolution governor changes the destination canvas. */
export interface VisibilityRasterView { width: number; height: number; zoom: number }

export function visibilityRaster(w: number, h: number, zoom: number, scale: number,
  view?: VisibilityRasterView): { width: number; height: number; k: number } {
  return {
    width: Math.max(2, Math.ceil((view?.width ?? w) * scale)),
    height: Math.max(2, Math.ceil((view?.height ?? h) * scale)),
    k: (view?.zoom ?? zoom) * scale,
  };
}
