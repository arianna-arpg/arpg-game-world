import { passiveTreeArtFrame } from './passiveTreePresentation';

export interface VocationLayoutPoint { x: number; y: number }
export interface VocationLayoutProfile {
  template?: string;
  /** Local node ID → named template position. IDs and links never change. */
  slots?: Readonly<Record<string, string>>;
  /** Per-node normalized coordinates override template positions. */
  points?: Readonly<Record<string, VocationLayoutPoint>>;
  mirror?: boolean;
  /** A small authored approach adjustment clears nearby ordinary-tree branches. */
  turn?: number;
}

/** Normalized coordinates in the portrait's ellipse. +y faces the required
 * attribute gate; x runs across it. Rotation happens before ellipse scaling. */
export const VOCATION_LAYOUT_TEMPLATES: Readonly<Record<string, Readonly<Record<string, VocationLayoutPoint>>>> = {
  terraces: {
    root: { x: 0, y: .82 },
    nearLeft: { x: -.56, y: .28 }, nearMiddle: { x: 0, y: .16 }, nearRight: { x: .56, y: .28 },
    farLeft: { x: -.77, y: -.28 }, innerLeft: { x: -.34, y: -.31 },
    innerRight: { x: .34, y: -.31 }, farRight: { x: .77, y: -.28 }, crown: { x: 0, y: -.78 },
  },
  grove: {
    root: { x: 0, y: .82 }, nearMiddle: { x: 0, y: .22 },
    nearLeft: { x: -.7, y: .23 }, farLeft: { x: -.76, y: -.24 },
    innerLeft: { x: -.45, y: -.65 }, crown: { x: 0, y: -.8 },
    innerRight: { x: .45, y: -.65 }, farRight: { x: .76, y: -.24 },
    nearRight: { x: .7, y: .23 }, farMiddle: { x: 0, y: -.3 },
  },
};

export const VOCATION_LAYOUT_CFG = {
  nodeGap: 12,
  edgeClearance: 8,
  rootLead: 8,
  edgeEndGap: 4,
  nodeBacking: 3,
  fallbackScale: .65,
  inactiveStroke: '#9a91ad',
  lockedStroke: '#82798e',
  backing: '#101219',
};

export const VOCATION_LAYOUTS: Readonly<Record<string, VocationLayoutProfile>> = {
  warbringer: { template: "terraces", slots: { s1: "innerRight", s2: "nearLeft", s3: "nearMiddle", n1: "innerLeft", n2: "nearRight", n3: "farRight", n4: "crown", k1: "farLeft" } },
  gravebinder: { template: "terraces", slots: { s1: "nearLeft", n1: "farLeft", s2: "innerLeft", n4: "crown", s3: "innerRight", n3: "farRight", n2: "nearMiddle", k1: "nearRight" } },
  wildstalker: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  archmage: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  spellblade: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "innerLeft", n2: "farLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  hierophant: { template: "terraces", slots: { s1: "nearLeft", s2: "farLeft", s3: "innerLeft", n1: "nearRight", n2: "nearMiddle", n3: "crown", n4: "innerRight", k1: "farRight" } },
  greenwarden: { template: "grove", slots: { s1: "innerLeft", s2: "nearMiddle", s3: "nearLeft", n1: "farRight", n2: "farLeft", n3: "crown", n4: "nearRight", k1: "innerRight", n5: "farMiddle" } },
  plaguelord: { template: "terraces", slots: { s1: "nearRight", s2: "nearLeft", s3: "nearMiddle", n1: "farRight", n2: "innerRight", n3: "innerLeft", n4: "farLeft", k1: "crown" } },
  shadowdancer: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  bloodreaver: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  stormweaver: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  bastion: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  corsair: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  ashborn: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  exsanguinator: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  stonewrought: { template: "terraces", slots: { s1: "nearMiddle", s2: "nearLeft", s3: "nearRight", n1: "innerRight", n2: "farLeft", n3: "innerLeft", n4: "crown", k1: "farRight" } },
  packwarden: { template: "terraces", slots: { s1: "nearMiddle", s2: "nearLeft", s3: "innerRight", n1: "innerLeft", n2: "farRight", n3: "crown", n4: "nearRight", k1: "farLeft" } },
  groundbreaker: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  spearhead: { template: "terraces", slots: { s1: "nearLeft", s2: "nearMiddle", s3: "nearRight", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  swordsaint: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  pitfighter: { template: "terraces", slots: { s1: "nearLeft", s2: "nearMiddle", s3: "nearRight", n1: "farRight", n2: "innerRight", n3: "farLeft", n4: "innerLeft", k1: "crown" } },
  thornwall: { template: "terraces", slots: { s1: "nearLeft", s2: "nearMiddle", s3: "nearRight", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  impaler: { template: "terraces", slots: { s1: "nearLeft", s2: "nearMiddle", s3: "nearRight", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  enginewright: { template: "terraces", slots: { s1: "nearLeft", s2: "nearMiddle", s3: "nearRight", n1: "farRight", n2: "innerRight", n3: "farLeft", n4: "innerLeft", k1: "crown" } },
  bannerlord: { template: "terraces", slots: { s1: "nearLeft", s2: "nearMiddle", s3: "nearRight", n1: "farRight", n2: "innerLeft", n3: "innerRight", n4: "farLeft", k1: "crown" } },
  warchanter: { template: "terraces", slots: { s1: "nearMiddle", s2: "nearLeft", s3: "nearRight", n1: "farRight", n2: "innerLeft", n3: "farLeft", n4: "innerRight", k1: "crown" } },
  veilweaver: { template: "terraces", slots: { s1: "nearMiddle", s2: "nearLeft", s3: "nearRight", n1: "farLeft", n2: "innerLeft", n3: "farRight", n4: "innerRight", k1: "crown" } },
  chronarch: { template: "terraces", slots: { s1: "nearMiddle", s2: "nearLeft", s3: "nearRight", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
  stillmind: { template: "terraces", slots: { s1: "nearLeft", s2: "nearMiddle", s3: "nearRight", n1: "farLeft", n2: "innerLeft", n3: "farRight", n4: "innerRight", k1: "crown" } },
  swarmlord: { template: "terraces", slots: { s1: "nearMiddle", s2: "nearLeft", s3: "innerRight", n1: "innerLeft", n2: "farRight", n3: "crown", n4: "nearRight", k1: "farLeft" } },
  harborwarden: { template: "terraces", slots: { s1: "nearLeft", s2: "nearRight", s3: "nearMiddle", n1: "farLeft", n2: "innerLeft", n3: "innerRight", n4: "farRight", k1: "crown" } },
};

/** Resolve one complete tree, including its free crest, from editable artwork
 * coordinates. Gate direction comes from the actual spending requirement. */
export function vocationTreeLayout(id: string, nodes: readonly (VocationLayoutPoint & { id: string })[],
  gate: VocationLayoutPoint | undefined, hub: VocationLayoutPoint,
  profile: VocationLayoutProfile | undefined = Object.hasOwn(VOCATION_LAYOUTS, id) ? VOCATION_LAYOUTS[id] : undefined,
): Record<string, VocationLayoutPoint> {
  const frame = passiveTreeArtFrame(`vocation:${id}`);
  const center = { x: hub.x + frame.offsetX, y: hub.y + frame.offsetY };
  const rx = frame.width / 2, ry = frame.height / 2;
  const angle = (gate ? Math.atan2((gate.y - center.y) / ry, (gate.x - center.x) / rx) - Math.PI / 2 : 0)
    + (profile?.turn ?? 0) * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const template = profile?.template && Object.hasOwn(VOCATION_LAYOUT_TEMPLATES, profile.template)
    ? VOCATION_LAYOUT_TEMPLATES[profile.template] : undefined;
  // Legacy/future authored coordinates remain a bounded fallback until given a
  // reviewed profile. The geometry probe requires explicit coverage for the roster.
  const radius = Math.max(1, ...nodes.map(n => Math.hypot(n.x, n.y)));
  return Object.fromEntries([{ id: 'root', x: 0, y: 0 }, ...nodes].map(n => {
    const override = profile?.points && Object.hasOwn(profile.points, n.id) ? profile.points[n.id] : undefined;
    const slot = profile?.slots && Object.hasOwn(profile.slots, n.id) ? profile.slots[n.id] : n.id;
    const point = override ?? (template && Object.hasOwn(template, slot) ? template[slot] : undefined)
      ?? (n.id === 'root' ? VOCATION_LAYOUT_TEMPLATES.terraces.root
        : { x: n.x / radius * VOCATION_LAYOUT_CFG.fallbackScale, y: n.y / radius * VOCATION_LAYOUT_CFG.fallbackScale });
    const x = point.x * (profile?.mirror ? -1 : 1), y = point.y;
    return [n.id, { x: center.x + rx * (x * cos - y * sin), y: center.y + ry * (x * sin + y * cos) }];
  }));
}
