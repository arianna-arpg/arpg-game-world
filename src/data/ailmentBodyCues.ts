import type { StatusBodyCue } from '../engine/status';

/** Radius-relative body materials. The layer also decides which stage of a
 * shared family wins when both stages are present on independent timers. */
export const AILMENT_BODY = {
  chill: { group: 'rime', layer: 1, coating: { color: '#a3deff', alpha: .34 },
    parts: [{ kind: 'icicles', scale: .82, alpha: .7, params: { n: 3 } }] },
  frozen: { group: 'rime', layer: 2, upright: true, coating: { color: '#c7efff', alpha: .41 },
    parts: [{ kind: 'icePrism', color: '#8bd8f6', scale: 1.24 }] },
  rot: { group: 'rot-veins', layer: 3,
    parts: [{ kind: 'veinweb', color: '#b79acd', params: { n: 6 } }] },
  bleed: { group: 'open-wound', layer: 4, upright: true,
    parts: [{ kind: 'woundDrops', x: -.35, y: .22, color: '#cb3547' }] },
  poison: { group: 'toxin', layer: 5, upright: true,
    parts: [{ kind: 'toxinBubbles', x: -.52, y: -.12, color: '#b5dc71' }] },
  burn: { group: 'kindling', layer: 6, upright: true,
    parts: [{ kind: 'wornFlames', color: '#ff7a32', params: { n: 3 } }] },
  shock: { group: 'static', layer: 7, upright: true,
    parts: [{ kind: 'currentArcs', color: '#ffdc66', params: { period: .94, duty: .34 } }] },
  doom: { group: 'doom-seal', layer: 8, upright: true, crownSlot: true,
    parts: [{ kind: 'skull', scale: .7, rot: Math.PI / 2,
      color: '#b78be9', alpha: .91, params: { glow: '#f1d9ff' } }] },
} satisfies Record<string, StatusBodyCue>;
