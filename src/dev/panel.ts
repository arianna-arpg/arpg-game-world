// ---------------------------------------------------------------------------
// DEV PANEL — the tabbed QA tool (gated by config.ts DEV.panel). Mounts a
// fixed "🔧 Dev" button bottom-left; clicking opens the panel.
//
// THE PANEL IS A TAB REGISTRY: each tab is one module in dev/tabs/ returning a
// DevTabDef ({id, label, build}) plus one row in DEV_TABS below — the shell
// owns the button, frame, status line, and tab strip; a tab owns only its
// pane. Adding a dev tool = one new module + one registry row, zero shell
// edits (the same open-registry shape the game's own content follows).
//
// Fully self-contained DOM — touches nothing in the game UI, so it's trivial
// to remove. NOT a shipped feature. World mutations (spawns, travel, event
// ignition) only meaningfully apply on the AUTHORITATIVE peer (host or
// single-player); on a joined co-op client they mutate the local render shell
// and are overwritten by the next host snapshot.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import { DEV_UI, css } from './ui';
import { gemsTab } from './tabs/gems';
import { itemsTab } from './tabs/items';
import { eventsTab } from './tabs/events';
import { locationTab } from './tabs/location';
import { accountTab } from './tabs/account';
import { throngTab } from './tabs/throng';
import { comboTab } from './tabs/combo';
import { grabTab } from './tabs/grab';
import { entityTab } from './tabs/entity';

/** What the shell hands every tab at build time. */
export interface DevTabCtx {
  getWorld: () => World;
  /** The world only while a live run is on (seats exist, nobody's dead/over) —
   *  null otherwise, so every action can guard with one call. */
  runActive: () => World | null;
  /** One-line status feedback (the green line under the tab strip). */
  flash: (msg: string) => void;
}

export interface DevTabDef {
  id: string;
  label: string;
  /** Build the pane ONCE at mount; `onShow` re-syncs it each time the tab is
   *  fronted (rebuild registry-derived lists here so new data rows appear
   *  without a remount). */
  build: (ctx: DevTabCtx) => { el: HTMLElement; onShow?: () => void };
}

/** THE TAB REGISTRY — order is display order. */
const DEV_TABS: DevTabDef[] = [gemsTab, itemsTab, eventsTab, locationTab, accountTab, throngTab, comboTab, grabTab, entityTab];

export function mountDevPanel(getWorld: () => World): void {
  const openBtn = document.createElement('button');
  openBtn.textContent = '🔧 Dev';
  css(openBtn, {
    position: 'fixed', left: '8px', bottom: '8px', zIndex: '99999',
    background: '#2a2438', color: DEV_UI.accent, border: `1px solid ${DEV_UI.border}`,
    borderRadius: '5px', padding: '5px 10px', font: DEV_UI.font, cursor: 'pointer',
  });

  const panel = document.createElement('div');
  css(panel, {
    position: 'fixed', left: '8px', bottom: '44px', zIndex: '99999',
    width: '460px', maxHeight: '70vh', display: 'none', flexDirection: 'column',
    background: DEV_UI.bg, color: DEV_UI.text, border: `1px solid ${DEV_UI.border}`,
    borderRadius: '6px', padding: '8px', font: DEV_UI.font, boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
  });

  const status = document.createElement('div');
  css(status, { minHeight: '15px', color: DEV_UI.good, margin: '2px 0 4px', fontSize: '11px' });

  const ctx: DevTabCtx = {
    getWorld,
    // Before a run starts there is no seat, so world.meta (a getter over the
    // local seat) would throw — guard on the roster FIRST (short-circuit), then
    // reject a finished/over run (post-death window: the dead world lingers
    // until the next run is built).
    runActive: () => {
      const w = getWorld();
      return w && w.seats && w.seats.length > 0 && !w.gameOver && !w.player.dead ? w : null;
    },
    flash: (msg: string) => { status.textContent = msg; },
  };

  const strip = document.createElement('div');
  css(strip, { display: 'flex', gap: '4px', marginBottom: '6px' });

  const built = DEV_TABS.map(def => {
    const { el, onShow } = def.build(ctx);
    css(el, { display: 'none', flexDirection: 'column', flex: '1', minHeight: '0' });
    const tabBtn = document.createElement('button');
    tabBtn.textContent = def.label;
    css(tabBtn, {
      background: DEV_UI.bgRaised, color: DEV_UI.accent, border: `1px solid ${DEV_UI.border}`,
      borderRadius: '4px', padding: '4px 7px', font: DEV_UI.fontSmall, cursor: 'pointer',
    });
    return { def, el, onShow, tabBtn };
  });

  const select = (id: string): void => {
    for (const t of built) {
      const on = t.def.id === id;
      t.el.style.display = on ? 'flex' : 'none';
      t.tabBtn.style.background = on ? DEV_UI.bgActive : DEV_UI.bgRaised;
      if (on) t.onShow?.();
    }
  };
  for (const t of built) {
    t.tabBtn.addEventListener('click', () => select(t.def.id));
    strip.append(t.tabBtn);
  }

  panel.append(strip, status, ...built.map(t => t.el));
  if (built.length) select(built[0].def.id);

  openBtn.addEventListener('click', () => {
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : 'flex';
    if (!open) {
      // Re-sync whichever tab is fronted (registries may have grown via HMR).
      const cur = built.find(t => t.el.style.display !== 'none');
      cur?.onShow?.();
    }
  });

  document.body.append(openBtn, panel);
}
