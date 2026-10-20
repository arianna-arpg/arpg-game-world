import { DIALOGUE_CFG } from '../data/dialogue';
import { panelSeatOf, PANEL_MOVE_CFG } from './panelmove';
import { uiScaleNow } from './uiScale';
import { Z_LADDER } from './zorder';

export const SERVICE_WORKSPACE_CFG = { edge: 16, gap: 14, width: 540, minHeight: 80 };
interface WorkspaceHost {
  services(): HTMLElement[];
  hudTop(): number | undefined;
}

/** NPC placement only. Inventory and its pages keep their own geometry and
 * selection. Small screens may overlap; overlap never changes membership. */
export class ServiceWorkspace {
  private managed = new Set<HTMLElement>();

  constructor(private host: WorkspaceHost) {
    const style = document.createElement('style');
    style.textContent = `
      .panel.service-workspace:not([${PANEL_MOVE_CFG.movedAttr}]):not(.couch-left):not(.couch-right) {
        left:var(--service-left) !important; top:var(--service-top) !important;
        right:auto !important; bottom:auto !important; transform:none !important;
        width:var(--service-width) !important; max-width:var(--service-width) !important;
      }
      .panel.service-workspace { max-height:var(--service-height) !important;
        overflow-y:auto; scrollbar-gutter:stable; z-index:${Z_LADDER.panel + 1}; }
    `;
    document.head.appendChild(style);
  }

  sync(): void {
    // Conversation has its own bottom berth. Sharing NPC tabs must not force
    // it into the shop's top-left geometry (or change player geometry).
    const offered = this.host.services().filter(el => !el.classList.contains('npc-dialogue')), active = new Set(offered);
    for (const el of this.managed) if (!active.has(el)) {
      el.classList.remove('service-workspace');
      for (const key of ['left', 'top', 'width', 'height']) el.style.removeProperty(`--service-${key}`);
    }
    this.managed = active;
    const scale = uiScaleNow(), c = SERVICE_WORKSPACE_CFG;
    const edge = c.edge * scale, top = DIALOGUE_CFG.workspaceTop * scale;
    const bottom = Math.min(window.innerHeight - edge, this.host.hudTop() ?? window.innerHeight - edge);
    for (const el of offered) {
      el.classList.add('service-workspace');
      el.style.setProperty('--service-left', `${c.edge}px`);
      el.style.setProperty('--service-top', `${DIALOGUE_CFG.workspaceTop}px`);
      el.style.setProperty('--service-width', `${Math.min(c.width, (window.innerWidth - edge * 2) / scale)}px`);
      el.style.setProperty('--service-height', `${Math.max(c.minHeight, (bottom - (panelSeatOf(el)?.top ?? top) - c.gap) / scale)}px`);
    }
  }
}
