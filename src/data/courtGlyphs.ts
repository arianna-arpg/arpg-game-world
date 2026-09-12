import type { GlyphDef, GlyphOp } from '../render/vis/parts';

/** Three courts, seven reusable pieces. Open centers and separated surfaces are
 * intentional: haunted equipment, glass vessels and insect light organs.
 * +X faces forward. Surface colors resolve through the normal part palette. */
export const COURT_GLYPHS: Record<string, GlyphDef> = {
  vacantCuirass: {
    ops: [
      { kind: 'poly', pts: [[-0.8, -0.22], [-0.62, -0.64], [0.23, -0.72], [0.65, -0.42], [0.36, -0.27], [-0.41, -0.3]], role: 'metal', outline: true, mirror: true },
      { kind: 'poly', pts: [[-0.8, -0.22], [-0.41, -0.3], [-0.34, 0], [-0.41, 0.3], [-0.8, 0.22]], role: 'metal', shade: -0.2, outline: true },
      { kind: 'path', pts: [[-0.49, -0.48], [0.13, -0.54], [0.38, -0.39]], role: 'accent', wR: 0.045, mirror: true },
      { kind: 'path', pts: [[-0.24, -0.22], [-0.12, -0.08]], role: 'glow', wR: 0.04, mirror: true },
      { kind: 'disc', x: -0.55, y: -0.48, rx: 0.06, role: 'accent', mirror: true },
    ],
  },
  reliquaryFolio: {
    ops: [
      { kind: 'poly', pts: [[-0.55, 0], [-0.7, -0.8], [0.61, -0.73], [0.76, -0.08], [0.55, 0]], role: 'metal', shade: -0.25, outline: true, mirror: true },
      { kind: 'poly', pts: [[-0.5, -0.05], [-0.56, -0.65], [0.5, -0.57], [0.59, -0.12], [0.42, -0.035]], role: 'bone', outline: true, mirror: true },
      ...[-0.28, -0.05, 0.18].map((x): GlyphOp => ({ kind: 'path', pts: [[x, -0.19], [x - 0.04, -0.48]], role: 'dark', wR: 0.035, mirror: true })),
      { kind: 'path', pts: [[-0.52, 0], [0.55, 0]], role: 'accent', wR: 0.065 },
      { kind: 'poly', pts: [[0.32, -0.055], [0.83, -0.1], [0.73, 0.035], [0.34, 0.065]], role: 'glow', alpha: 0.8 },
    ],
  },
  sandglass: {
    ops: [
      { kind: 'poly', pts: [[-0.71, -0.4], [-0.37, -0.34], [0, -0.1], [0.37, -0.34], [0.71, -0.4], [0.71, 0.4], [0.37, 0.34], [0, 0.1], [-0.37, 0.34], [-0.71, 0.4]], role: 'glow', alpha: 0.3, outline: true },
      { kind: 'poly', pts: [[-0.64, -0.3], [-0.34, -0.25], [-0.1, 0], [-0.34, 0.25], [-0.64, 0.3]], role: 'accent' },
      { kind: 'poly', pts: [[0.64, -0.3], [0.25, 0], [0.64, 0.3]], role: 'accent', shade: 0.2 },
      { kind: 'path', pts: [[-0.15, 0], [0.4, 0]], role: 'accent', wR: 0.035 },
      { kind: 'path', pts: [[-0.79, -0.46], [0.79, -0.46]], role: 'metal', wR: 0.08, mirror: true },
      ...[-0.8, 0.8].map((x): GlyphOp => ({ kind: 'path', pts: [[x, -0.53], [x, 0.53]], role: 'metal', wR: 0.14 })),
      { kind: 'path', pts: [[-0.58, -0.25], [-0.35, -0.16]], role: 'bone', alpha: 0.6, wR: 0.04 },
    ],
  },
  gritVortex: {
    ops: [
      ...[-0.72, -0.38, -0.04, 0.3].flatMap((x, i): GlyphOp[] => [
        { kind: 'ring', x, rx: 0.25, ry: 0.24 + i * 0.2, a0: 0.35 + i * 0.6, a1: 5.65 + i * 0.6, role: 'base', shade: -0.14 + i * 0.07, wR: 0.17 },
        { kind: 'ring', x: x - 0.035, rx: 0.23, ry: 0.21 + i * 0.2, a0: 3.2, a1: 5.6, role: 'accent', alpha: 0.7, wR: 0.04 },
      ]),
      { kind: 'path', pts: [[-1.13, 0.12], [-0.9, -0.13], [-0.69, 0]], smooth: true, role: 'base', wR: 0.08 },
      { kind: 'disc', x: 0.13, y: 1.02, rx: 0.065, role: 'accent', mirror: true },
    ],
  },
  glassLyre: {
    ops: [
      { kind: 'path', pts: [[0.71, -0.6], [0.36, -0.77], [-0.6, -0.61], [-0.87, 0], [-0.6, 0.61], [0.36, 0.77], [0.71, 0.6]], smooth: true, role: 'metal', wR: 0.16 },
      { kind: 'path', pts: [[0.54, -0.64], [0.54, 0.64]], role: 'accent', wR: 0.09 },
      ...[-0.36, -0.12, 0.12, 0.36].flatMap((y): GlyphOp[] => [
        { kind: 'path', pts: [[-0.62, y], [0.52, y]], role: 'glow', alpha: 0.8, wR: 0.035 },
        { kind: 'poly', pts: [[-0.12, y - 0.09], [0.16, y - 0.055], [0.3, y], [0.16, y + 0.055], [-0.12, y + 0.09], [-0.23, y]], role: 'glow', alpha: 0.75, outline: true },
      ]),
    ],
  },
  lanternAbdomen: {
    ops: [
      { kind: 'poly', pts: [[-0.99, 0], [-0.69, -0.51], [0.01, -0.61], [0.66, -0.37], [0.82, 0], [0.66, 0.37], [0.01, 0.61], [-0.69, 0.51]], smooth: true, role: 'dark', outline: true },
      { kind: 'disc', x: -0.08, rx: 0.68, ry: 0.45, role: 'glow', alpha: 0.9 },
      ...[-0.55, -0.12, 0.32].map((x): GlyphOp => ({ kind: 'path', pts: [[x, -0.44], [x + 0.12, 0], [x, 0.44]], smooth: true, role: 'base', shade: -0.25, wR: 0.11 })),
      { kind: 'path', pts: [[-0.65, -0.29], [-0.33, -0.36]], role: 'bone', alpha: 0.65, wR: 0.045 },
    ],
  },
  filamentAntennae: {
    ops: [
      { kind: 'path', pts: [[0.32, -0.15], [0.85, -0.32], [1.14, -0.75], [0.92, -1.01]], smooth: true, role: 'base', wR: 0.055, mirror: true },
      { kind: 'path', pts: [[0.89, -0.45], [0.67, -0.63]], role: 'accent', wR: 0.035, mirror: true },
      { kind: 'path', pts: [[1.02, -0.61], [0.78, -0.81]], role: 'accent', wR: 0.035, mirror: true },
      { kind: 'disc', x: 0.92, y: -1.01, rx: 0.1, ry: 0.065, role: 'glow', mirror: true },
    ],
  },
};
