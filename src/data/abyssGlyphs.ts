import type { GlyphDef, GlyphOp } from '../render/vis/parts';

/** Fracture anatomy: dark plates parted around lightless gaps, edged with
 * cold light. These are ordinary reusable Part Forge glyphs, +X forward. */
export const ABYSS_GLYPHS: Record<string, GlyphDef> = {
  heraldLance: {
    ops: [
      { kind: 'path', pts: [[-1.1, 0], [0.95, 0]], role: 'metal', shade: -0.22, wR: 0.09 },
      { kind: 'poly', pts: [[0.75, 0], [1.02, -0.14], [1.62, 0], [1.02, 0.14]], role: 'metal', outline: true },
      { kind: 'poly', pts: [[0.8, 0], [1.62, 0], [1.02, 0.14]], role: 'metal', shade: -0.3 },
      { kind: 'path', pts: [[0.6, -0.16], [0.6, 0.16]], role: 'accent', wR: 0.07 },
      { kind: 'path', pts: [[-0.3, -0.08], [-0.3, 0.08]], role: 'accent', wR: 0.16 },
    ],
  },
  riftCarapace: {
    ops: [
      { kind: 'poly', pts: [[-1.02, -0.22], [-0.64, -0.79], [-0.12, -0.95], [0.04, -0.62], [-0.21, -0.32], [-0.65, -0.18]], role: 'base', shade: -0.48, outline: true, mirror: true },
      { kind: 'poly', pts: [[0.04, -0.62], [0.53, -0.78], [0.97, -0.3], [0.64, -0.16], [0.31, -0.28]], role: 'base', shade: -0.28, outline: true, mirror: true },
      { kind: 'path', pts: [[-0.88, -0.3], [-0.58, -0.65], [-0.15, -0.8]], role: 'accent', wR: 0.045, mirror: true },
      { kind: 'path', pts: [[0.18, -0.6], [0.48, -0.62], [0.75, -0.34]], role: 'glow', alpha: 0.55, wR: 0.035, mirror: true },
      { kind: 'poly', pts: [[-0.57, -0.34], [-0.43, -0.54], [-0.3, -0.39]], role: 'dark', mirror: true },
    ],
  },
  voidIris: {
    ops: [
      { kind: 'poly', pts: [[-0.49, 0], [-0.21, -0.59], [0.21, -0.74], [0.69, 0], [0.21, 0.74], [-0.21, 0.59]], smooth: true, role: 'dark', outline: true },
      { kind: 'ring', x: 0.03, rx: 0.33, ry: 0.51, a0: 0.26, a1: 5.8, role: 'accent', wR: 0.09 },
      { kind: 'disc', x: 0.11, rx: 0.19, ry: 0.32, role: 'glow' },
      { kind: 'poly', pts: [[0.1, -0.31], [0.2, -0.08], [0.14, 0.34], [0.01, 0.06]], color: '#080510' },
      { kind: 'disc', x: 0.18, y: -0.17, rx: 0.045, color: '#effcff' },
    ],
  },
  brokenDial: {
    ops: [
      ...[0.1, 1.85, 3.4, 5].flatMap((a, i): GlyphOp[] => [
        { kind: 'ring', rx: 0.91, ry: 1.02, a0: a, a1: a + 1.12, role: 'base', shade: -0.45, wR: 0.2 },
        { kind: 'ring', rx: 0.8, ry: 0.91, a0: a + 0.08, a1: a + 1.03, role: 'glow', alpha: 0.7, wR: 0.04 },
        { kind: 'poly', pts: [[Math.cos(a) * 0.92, Math.sin(a) * 1.03], [Math.cos(a - 0.13) * 1.19, Math.sin(a - 0.13) * 1.27], [Math.cos(a + 0.19) * 0.93, Math.sin(a + 0.19) * 1.04]], role: 'accent', shade: i % 2 ? -0.1 : 0.1, outline: true },
      ]),
      { kind: 'path', pts: [[-0.1, -0.11], [0.14, -0.62]], role: 'glow', wR: 0.06 },
      { kind: 'path', pts: [[0.08, 0.12], [0.48, 0.3]], role: 'accent', wR: 0.08 },
    ],
  },
  riftTalons: {
    ops: [
      { kind: 'poly', pts: [[-0.42, -0.45], [-0.49, -0.93], [0.13, -1.23], [0.58, -1.13], [0.03, -0.87], [-0.12, -0.47]], role: 'base', shade: -0.38, outline: true, mirror: true },
      { kind: 'poly', pts: [[0.2, -1.04], [0.62, -1.2], [1.13, -0.87], [1.38, -0.39], [0.84, -0.8]], role: 'accent', shade: -0.16, outline: true, mirror: true },
      { kind: 'path', pts: [[-0.28, -0.85], [0.09, -1.07]], role: 'glow', alpha: 0.65, wR: 0.04, mirror: true },
      { kind: 'path', pts: [[0.66, -1.09], [0.97, -0.84]], role: 'glow', alpha: 0.65, wR: 0.035, mirror: true },
    ],
  },
  riftCilia: {
    ops: [-0.85, -0.4, 0.05, 0.5].flatMap((x, i): GlyphOp[] => [
      { kind: 'path', pts: [[x, -0.38], [x - 0.35, -0.79], [x - 0.16, -1.04], [x + 0.12, -0.91]], smooth: true, role: 'base', shade: -0.2, wR: 0.055, mirror: true },
      { kind: 'disc', x: x + 0.12, y: -0.91, rx: 0.045, role: 'glow', alpha: 0.65 + i * 0.08, mirror: true },
    ]),
  },
};
