import type { GlyphDef, GlyphOp } from '../render/vis/parts';

/** Infernal anatomy, expressed in the existing Part Forge grammar. The roles
 * belong to individual surfaces; all parts support ordinary placement/mirroring.
 * These are body ornaments, not additional targets or combat telegraphs. */
export const DEMON_GLYPHS: Record<string, GlyphDef> = {
  riftHorns: {
    ops: [
      { kind: 'poly', pts: [[-0.55, 0.22], [-0.97, 0.5], [-1.03, 0.97], [-0.67, 1.26], [-0.12, 1.2], [0.67, 0.61], [0.16, 0.9], [-0.4, 0.89], [-0.53, 0.62]], smooth: true, role: 'bone', shade: -0.22, outline: true, mirror: true },
      { kind: 'path', pts: [[-0.76, 0.4], [-0.86, 0.84], [-0.57, 1.05], [-0.15, 1.02], [0.34, 0.78]], smooth: true, role: 'accent', wR: 0.055, mirror: true },
      { kind: 'path', pts: [[-0.65, 0.7], [-0.87, 0.73]], role: 'dark', wR: 0.045, mirror: true },
      { kind: 'path', pts: [[-0.38, 0.92], [-0.37, 1.16]], role: 'dark', wR: 0.045, mirror: true },
    ],
  },
  graspingHand: {
    ops: [
      { kind: 'poly', pts: [[-0.52, -0.2], [0.02, -0.39], [0.33, -0.24], [0.38, 0.22], [0.02, 0.4], [-0.52, 0.2]], smooth: true, role: 'base', outline: true },
      ...[-0.3, -0.1, 0.1, 0.3].flatMap((y, i): GlyphOp[] => {
        const tip = i === 1 || i === 2 ? 1.16 : 0.9;
        return [
          { kind: 'poly', pts: [[0.1, y - 0.085], [0.59, y * 1.65 - 0.07], [tip, y * 1.8], [tip - 0.24, y * 1.8 + 0.12], [0.49, y * 1.65 + 0.1], [0.1, y + 0.09]], role: 'base', shade: i % 2 ? 0.06 : -0.06, outline: true },
          { kind: 'poly', pts: [[tip - 0.25, y * 1.8 - 0.015], [tip, y * 1.8], [tip - 0.24, y * 1.8 + 0.12]], role: 'bone', shade: 0.08 },
          { kind: 'path', pts: [[0.47, y * 1.65 - 0.025], [0.51, y * 1.65 + 0.075]], role: 'dark', alpha: 0.7, wR: 0.035 },
        ];
      }),
      { kind: 'poly', pts: [[-0.28, 0.24], [-0.16, 0.62], [0.25, 0.74], [0.05, 0.48], [0.02, 0.27]], role: 'base', outline: true },
      { kind: 'path', pts: [[-0.3, -0.04], [0.01, -0.13], [0.14, 0]], role: 'accent', wR: 0.045 },
    ],
  },
  sealedVisage: {
    ops: [
      { kind: 'poly', pts: [[-0.63, 0], [-0.39, -0.49], [0.19, -0.39], [0.62, 0], [0.19, 0.39], [-0.39, 0.49]], smooth: true, role: 'bone', outline: true },
      { kind: 'path', pts: [[-0.13, -0.28], [-0.03, -0.12]], role: 'dark', wR: 0.055, mirror: true },
      { kind: 'path', pts: [[0.29, -0.22], [0.34, 0], [0.29, 0.22]], smooth: true, role: 'dark', wR: 0.045 },
      { kind: 'path', pts: [[0.23, -0.14], [0.4, -0.1]], role: 'metal', wR: 0.055, mirror: true },
      { kind: 'path', pts: [[0.24, 0], [0.43, 0]], role: 'metal', wR: 0.055 },
    ],
  },
  infernalJaw: {
    ops: [
      { kind: 'poly', pts: [[-0.37, -0.45], [0.12, -0.64], [0.57, -0.47], [0.75, 0], [0.57, 0.47], [0.12, 0.64], [-0.37, 0.45], [0.16, 0.29], [0.4, 0], [0.16, -0.29]], role: 'base', shade: -0.23, outline: true },
      { kind: 'poly', pts: [[0.01, 0.52], [0.41, 0.74], [0.94, 0.46], [0.46, 0.54], [0.35, 0.31]], smooth: true, role: 'bone', outline: true, mirror: true },
      { kind: 'poly', pts: [[0.42, -0.36], [0.6, -0.23], [0.38, -0.18]], role: 'bone', mirror: true },
      { kind: 'poly', pts: [[0.55, -0.15], [0.66, 0], [0.43, 0]], role: 'bone', mirror: true },
    ],
  },
  sermonPipes: {
    ops: [
      ...[-1, 0, 1].flatMap((i): GlyphOp[] => {
        const y = i * 0.38, end = i === 0 ? -1.38 : -1.09;
        return [
          { kind: 'poly', pts: [[0.17, y - 0.16], [end, y - 0.14], [end - 0.08, y], [end, y + 0.14], [0.17, y + 0.16]], role: 'bone', shade: -0.1, outline: true },
          { kind: 'disc', x: end, y, rx: 0.12, ry: 0.09, role: 'dark' },
          { kind: 'path', pts: [[end - 0.045, y], [end + 0.06, y]], role: 'glow', wR: 0.035 },
          { kind: 'path', pts: [[-0.35, y - 0.15], [-0.35, y + 0.15]], role: 'metal', wR: 0.075 },
          { kind: 'path', pts: [[-0.73, y - 0.15], [-0.73, y + 0.15]], role: 'metal', wR: 0.055 },
        ];
      }),
      { kind: 'path', pts: [[0.05, -0.55], [0.2, 0], [0.05, 0.55]], role: 'base', shade: -0.35, wR: 0.14 },
    ],
  },
  titheRack: {
    ops: [
      { kind: 'path', pts: [[-0.32, -1.09], [-0.53, 0], [-0.32, 1.09]], smooth: true, role: 'bone', wR: 0.13 },
      { kind: 'poly', pts: [[-0.37, 0.93], [-0.22, 1.26], [-0.14, 0.94]], role: 'bone', mirror: true },
      ...[-1, -0.5, 0, 0.5, 1].flatMap((i): GlyphOp[] => {
        const y = i * 0.85, x = 0.03 + (1 - Math.abs(i)) * 0.3;
        return [
          { kind: 'path', pts: [[-0.39, y], [x, y]], role: 'metal', wR: 0.04 },
          { kind: 'disc', x, y, rx: 0.16, role: 'metal', shade: 0.15, outline: true },
          { kind: 'ring', x, y, rx: 0.095, role: 'accent', wR: 0.035 },
          { kind: 'path', pts: [[x - 0.065, y], [x + 0.065, y]], role: 'dark', wR: 0.04 },
        ];
      }),
    ],
  },
};
