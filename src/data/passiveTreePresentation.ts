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
  start: 13, small: 11, notable: 15, keystone: 18, attr: 12, vocation: 15, choice: 16,
} as const;

/** Icon-bearing Vocation nodes get a little more reading room. Geometry checks,
 * hit targets and connector trimming all consume the same profile. */
export const PASSIVE_NODE_SIZE_PROFILES: Readonly<Record<string, Partial<Record<keyof typeof PASSIVE_TREE_NODE_RADII, number>>>> = {
  vocation: { small:12, notable:16, keystone:19, vocation:18, choice:17 },
};
export function passiveTreeNodeRadius(node: { kind: keyof typeof PASSIVE_TREE_NODE_RADII; vocation?: string }): number {
  return (node.vocation ? PASSIVE_NODE_SIZE_PROFILES.vocation[node.kind] : undefined) ?? PASSIVE_TREE_NODE_RADII[node.kind];
}
