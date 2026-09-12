import type { GlyphDef } from '../render/vis/parts';

/** Casting implements with distinct outlines. All use the existing glyph
 * interpreter: palette roles, placement, mirroring and live sway remain editable
 * in the Forge. Animation is decorative, never a combat radius or cast tell. */
export const CASTER_GLYPHS: Record<string, GlyphDef> = {
  conchFocus: {
    ops: [
      { kind: 'poly', pts: [[-0.75, 0], [-0.35, -0.28], [0.08, -0.44], [0.46, -0.34], [0.64, -0.12], [0.92, -0.35], [0.92, 0.38], [0.46, 0.22], [0.03, 0.4], [-0.42, 0.23]], smooth: true, role: 'bone', outline: true },
      { kind: 'path', pts: [[-0.56, 0.05], [-0.25, 0.2], [0.18, 0.23], [0.4, 0], [0.24, -0.22], [-0.02, -0.18], [-0.1, 0.02], [0.07, 0.1], [0.18, 0.02]], smooth: true, role: 'accent', shade: -0.2, wR: 0.065 },
      { kind: 'disc', x: 0.76, y: 0.02, rx: 0.11, ry: 0.24, role: 'dark', outline: true },
      { kind: 'path', pts: [[0.77, -0.15], [0.77, 0.18]], role: 'glow', wR: 0.045 },
      { kind: 'path', pts: [[-0.38, -0.17], [-0.27, -0.05]], role: 'bone', shade: -0.35, wR: 0.035 },
    ],
  },
  coralCrown: {
    ops: [
      { kind: 'path', pts: [[-0.4, 0], [-0.35, 0.48], [-0.1, 0.8], [-0.25, 1.2]], role: 'accent', wR: 0.14, mirror: true },
      { kind: 'path', pts: [[-0.18, 0.68], [0.23, 0.9], [0.43, 1.18]], role: 'accent', wR: 0.1, mirror: true },
      { kind: 'path', pts: [[-0.31, 0.42], [-0.67, 0.65], [-0.78, 0.98]], role: 'accent', wR: 0.1, mirror: true },
      { kind: 'path', pts: [[0.22, 0.9], [0.42, 0.77]], role: 'accent', wR: 0.07, mirror: true },
      { kind: 'disc', x: -0.25, y: 1.2, rx: 0.08, role: 'bone', mirror: true },
      { kind: 'disc', x: 0.43, y: 1.18, rx: 0.07, role: 'glow', mirror: true },
      { kind: 'disc', x: -0.78, y: 0.98, rx: 0.06, role: 'bone', mirror: true },
    ],
  },
  prayerChimes: {
    ops: [
      { kind: 'path', pts: [[0.02, -0.95], [-0.17, 0], [0.02, 0.95]], smooth: true, role: 'wood', wR: 0.1 },
      { kind: 'path', pts: [[0, -0.78], [0.46, -0.78]], role: 'metal', wR: 0.035, mirror: true },
      { kind: 'path', pts: [[-0.11, -0.4], [0.64, -0.4]], role: 'metal', wR: 0.035, mirror: true },
      { kind: 'path', pts: [[-0.17, 0], [0.79, 0]], role: 'metal', wR: 0.035 },
      { kind: 'poly', pts: [[0.38, -0.87], [0.83, -0.83], [0.87, -0.73], [0.38, -0.68]], role: 'bone', outline: true, mirror: true, sway: { ay: 0.035, freq: 1.6 } },
      { kind: 'poly', pts: [[0.57, -0.49], [1.02, -0.46], [1.06, -0.35], [0.57, -0.3]], role: 'bone', outline: true, mirror: true, sway: { ay: 0.045, freq: 1.6, phase: 1 } },
      { kind: 'disc', x: 0.9, y: 0, rx: 0.17, role: 'metal', outline: true, sway: { ay: 0.04, freq: 1.6, phase: 2 } },
      { kind: 'ring', x: 0.9, y: 0, rx: 0.09, role: 'glow', wR: 0.035, sway: { ay: 0.04, freq: 1.6, phase: 2 } },
    ],
  },
  astrolabe: {
    ops: [
      { kind: 'ring', rx: 1.12, ry: 0.84, role: 'metal', wR: 0.085 },
      { kind: 'ring', rx: 0.54, ry: 1.12, role: 'accent', wR: 0.065 },
      { kind: 'path', pts: [[-1.24, 0], [1.24, 0]], role: 'metal', wR: 0.055 },
      { kind: 'path', pts: [[0, -1.23], [0, 1.23]], role: 'metal', wR: 0.055 },
      { kind: 'poly', pts: [[1.02, 0], [1.22, -0.13], [1.4, 0], [1.22, 0.13]], role: 'glow', outline: true },
      { kind: 'disc', x: -1.12, y: 0, rx: 0.12, role: 'accent', outline: true },
      { kind: 'disc', x: 0, y: 1.12, rx: 0.1, role: 'glow', mirror: true },
      { kind: 'ring', rx: 0.32, role: 'glow', alpha: 0.75, wR: 0.04 },
    ],
  },
  ritualFan: {
    ops: [
      { kind: 'poly', pts: [[-0.48, 0], [0.14, -0.86], [0.46, -0.72], [0.72, -0.43], [0.86, 0], [0.72, 0.43], [0.46, 0.72], [0.14, 0.86]], role: 'cloth', outline: true },
      { kind: 'path', pts: [[-0.48, 0], [0.14, -0.86]], role: 'wood', wR: 0.055, mirror: true },
      { kind: 'path', pts: [[-0.48, 0], [0.46, -0.72]], role: 'wood', wR: 0.04, mirror: true },
      { kind: 'path', pts: [[-0.48, 0], [0.72, -0.43]], role: 'wood', wR: 0.04, mirror: true },
      { kind: 'path', pts: [[-0.48, 0], [0.86, 0]], role: 'wood', wR: 0.04 },
      { kind: 'path', pts: [[0.18, -0.66], [0.45, -0.36], [0.57, 0], [0.45, 0.36], [0.18, 0.66]], smooth: true, role: 'accent', shade: 0.2, wR: 0.08 },
      { kind: 'disc', x: -0.48, y: 0, rx: 0.1, role: 'metal', outline: true },
    ],
  },
  kilnMantle: {
    ops: [
      { kind: 'poly', pts: [[-0.64, -0.44], [-0.96, -0.65], [-1.1, -1.04], [-0.8, -1.17], [-0.5, -0.84], [-0.32, -0.5]], role: 'base', shade: -0.35, outline: true, mirror: true },
      { kind: 'disc', x: -0.95, y: -1.06, rx: 0.2, ry: 0.1, role: 'dark', outline: true, mirror: true },
      { kind: 'path', pts: [[-1.06, -1.06], [-0.85, -1.06]], role: 'glow', wR: 0.07, mirror: true },
      { kind: 'poly', pts: [[0.15, -0.5], [0.02, -0.85], [0.17, -1.02], [0.43, -0.92], [0.48, -0.55]], role: 'base', shade: -0.25, outline: true, mirror: true },
      { kind: 'disc', x: 0.21, y: -0.94, rx: 0.16, ry: 0.09, role: 'dark', outline: true, mirror: true },
      { kind: 'path', pts: [[0.1, -0.94], [0.32, -0.94]], role: 'glow', wR: 0.055, mirror: true },
    ],
  },
};
