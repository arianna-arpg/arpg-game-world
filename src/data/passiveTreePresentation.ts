/** Shared art/layout frame in tree units. Changing this resizes both the
 * central painting and the normalized Vocation layouts authored within it. */
export const PASSIVE_TREE_HUB_FRAME = { width: 600, height: 400, offsetX: 0, offsetY: 0 };

/** Optional shared per-image framing. Layouts and artwork read the same values. */
export const PASSIVE_TREE_ART_FRAMES: Record<string, Partial<typeof PASSIVE_TREE_HUB_FRAME>> = {};

export function passiveTreeArtFrame(key: string): typeof PASSIVE_TREE_HUB_FRAME {
  return { ...PASSIVE_TREE_HUB_FRAME, ...(Object.hasOwn(PASSIVE_TREE_ART_FRAMES, key) ? PASSIVE_TREE_ART_FRAMES[key] : {}) };
}

/** The renderer and layout checks share actual node-disc sizes. */
export const PASSIVE_TREE_NODE_RADII = {
  start: 13, small: 9, notable: 14, keystone: 17, attr: 11, vocation: 15, choice: 15,
} as const;
