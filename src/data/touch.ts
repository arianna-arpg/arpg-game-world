// ---------------------------------------------------------------------------
// THE TOUCH LAYOUTS — the finger's screen as data rows (core/touch.ts owns
// the grammar; this file only registers layouts). Zones are viewport
// FRACTIONS (origin top-left), mirrored whole under a left hand.
//
// 'thumbs' — THE DEBUT (docs/engine/platform-touch.md):
//   · the left half is the FLOATING MOVE STICK's field (it spawns under the
//     thumb wherever it lands, so there is no dead spot to find);
//   · the right half is the AIM FIELD — the finger is the cursor, a held
//     finger attacks (the LMB's shape), the bar's slots punch through both
//     halves and always win the touch;
//   · the top strip (12%) stays free for the status lines and the tray;
//   · verb tiles hug the right edge, clear of the orbs and the menu bar:
//     PAUSE (the hardwired Escape cascade) at the top corner, the META
//     LATCH (shift you keep without holding) mid-edge, and a PICK tile that
//     exists only under the 'key' pickup style — a gated row, the shape a
//     future dash/portal/emote tile would take.
// The panels' pages (bag, sheet, tree, map…) need no tile: THE MENU BAR
// (ui/menubar.ts) is DOM and already a thumb's door; its DOCK puts every
// page one tap away.
// ---------------------------------------------------------------------------

import { registerTouchLayout } from '../core/touch';

registerTouchLayout({
  id: 'thumbs',
  name: 'Thumbs',
  blurb: 'Left thumb: a floating stick, wherever it lands. Right thumb: the finger is the cursor, hold to attack; the skill bar under both.',
  widgets: [
    // Verb tiles route BEFORE the fields (a tile inside a field must win its own square).
    { id: 'pause', kind: 'button', action: 'escape', label: '❚❚', zone: { x: 0.91, y: 0.02, w: 0.09, h: 0.12 }, sizePx: 40 },
    { id: 'meta', kind: 'button', action: 'metaModifier', label: 'META', latch: true, zone: { x: 0.91, y: 0.42, w: 0.09, h: 0.16 }, sizePx: 48 },
    { id: 'pickup', kind: 'button', action: 'pickup', label: 'PICK', zone: { x: 0.91, y: 0.26, w: 0.09, h: 0.16 }, sizePx: 44,
      when: s => s.gearPickup === 'key' },
    { id: 'move', kind: 'stick', zone: { x: 0, y: 0.12, w: 0.5, h: 0.88 } },
    { id: 'aim', kind: 'aim', zone: { x: 0.5, y: 0.12, w: 0.5, h: 0.88 } },
  ],
});
