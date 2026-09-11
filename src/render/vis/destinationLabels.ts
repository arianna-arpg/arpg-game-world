import { pointSegDist, type Vec2 } from '../../core/math';

/** World-space padding around the travel marker and its caption. */
export const DESTINATION_LABEL_CFG = { hoverPad: 48 };
export type DestinationLabelMode = 'near' | 'always';

/** One reveal policy for exits, realm gates and both ends of town portals.
 * Concealment remains the world label layer's responsibility. */
export function destinationLabelVisible(mode: DestinationLabelMode, aim: Vec2 | null,
  anchor: Vec2, caption: Vec2, radius: number): boolean {
  return mode === 'always' || (!!aim
    && pointSegDist(aim.x, aim.y, anchor.x, anchor.y, caption.x, caption.y) <= radius + DESTINATION_LABEL_CFG.hoverPad);
}
