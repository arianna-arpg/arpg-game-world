import { BUILD_PANEL_CFG } from './buildPanels';
import { DIALOGUE_CFG } from '../data/dialogue';
import { dialogueBounds } from './dialogueLayout';
import { panelSeatOf, PANEL_MOVE_CFG } from './panelmove';
import { uiScaleNow, UI_SCALE_CFG } from './uiScale';
import { Z_LADDER } from './zorder';

/** Presentation only: Folio and Inventory retain ownership of open/close. */
export const SERVICE_WORKSPACE_CFG = {
  edge: 16, gap: 14, width: 540, minWidth: 320, minHeight: 80, minInventoryHeight: 40,
};
type WorkspaceTab = 'services' | 'inventory';
interface WorkspaceHost {
  inventory: HTMLElement;
  inventoryOpen(): boolean;
  inventoryOwned(): boolean;
  services(): HTMLElement[];
  front(el: HTMLElement): boolean;
  title(el: HTMLElement): string;
  pages(): HTMLElement[];
  hudTop(): number | undefined;
  frontService(): void;
  changed(): void;
}

/** One berth for the selected station or Inventory page, beside the bag when
 * space permits. Folio supplies selection; this class never invents a second
 * page lifecycle. Contract: docs/ui/service-workspace.md. */
export class ServiceWorkspace {
  readonly tabs = document.createElement('div');
  private managed = new Set<HTMLElement>();
  private selected: WorkspaceTab = 'services';
  private frontPanel: HTMLElement | null = null;
  compact = false;
  contentBottom: number | undefined;

  constructor(private host: WorkspaceHost) {
    const style = document.createElement('style');
    style.textContent = `
      .panel.service-workspace:not([${PANEL_MOVE_CFG.movedAttr}]):not(.couch-left):not(.couch-right) {
        left:var(--service-left) !important; top:var(--service-top) !important;
        right:auto !important; bottom:auto !important; transform:none !important;
        width:var(--service-width) !important; max-width:var(--service-width) !important;
      }
      .panel.service-workspace { max-height:var(--service-height) !important;
        overflow-y:auto; scrollbar-gutter:stable; }
      #inventory.service-inventory .inv-scroll { min-height:0 !important;
        max-height:var(--service-scroll-height) !important; overflow-x:auto !important; }
      #inventory.service-inventory:not([${PANEL_MOVE_CFG.movedAttr}]):not(.couch-left):not(.couch-right) {
        max-width:calc((100vw - ${SERVICE_WORKSPACE_CFG.edge * 2}px) / var(--ui-scale) - var(--build-rail));
      }
      #inventory.service-inventory .build-ribbons { max-height:calc(100% - 56px); overflow-y:auto; }
      .workspace-shelved { display:none !important; }
      .service-switch { position:fixed; top:2px; display:flex; gap:6px; z-index:${Z_LADDER.folio}; }
      .service-switch[hidden] { display:none; }
      .service-switch button { font:11px/16px Verdana,sans-serif; padding:3px 12px;
        color:var(--text); background:var(--panel-bg); border:1px solid var(--panel-border);
        border-radius:4px; cursor:var(--cursor-point,pointer); }
      .service-switch button[aria-selected=true] { color:var(--gold); border-color:var(--gold); }
    `;
    document.head.appendChild(style);
    this.tabs.id = 'service-workspace-tabs';
    this.tabs.className = `service-switch ${UI_SCALE_CFG.markerClass}`;
    this.tabs.hidden = true;
    this.tabs.setAttribute('role', 'tablist');
    this.tabs.setAttribute('aria-label', 'Service workspace');
    for (const [id, title] of [['services', 'Services'], ['inventory', 'Inventory']] as const) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = title;
      button.dataset.workspaceTab = id; button.setAttribute('role', 'tab');
      button.addEventListener('click', () => this.select(id));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); event.stopPropagation();
        const next: WorkspaceTab = event.key === 'Home' ? 'services' : event.key === 'End' ? 'inventory'
          : id === 'services' ? 'inventory' : 'services';
        this.select(next);
        this.tabs.querySelector<HTMLButtonElement>(`[data-workspace-tab="${next}"]`)?.focus();
      });
      this.tabs.appendChild(button);
    }
    document.body.appendChild(this.tabs);
  }

  select(tab: WorkspaceTab): void {
    this.selected = tab;
    // Switching back from the compact bag must preserve an explicitly chosen
    // Skills/Passives/container tab instead of quietly selecting the vendor.
    if (tab === 'services' && !this.panels().some(el => this.host.front(el))) this.host.frontService();
    this.sync(); this.host.changed();
  }

  /** Inventory's shortcut reveals its compact tab before becoming a close. */
  revealInventory(): boolean {
    if (!this.compact || this.selected === 'inventory' || !this.host.inventoryOpen()) return false;
    this.select('inventory'); return true;
  }

  private release(el: HTMLElement): void {
    el.classList.remove('service-workspace', 'service-inventory', 'workspace-shelved');
    for (const key of ['left', 'top', 'width', 'height', 'scroll-height']) el.style.removeProperty(`--service-${key}`);
  }

  /** Read the bag's own home even when its compact tab is hidden. The temporary
   * display override is synchronous and never changes its lifecycle or seat. */
  private inventoryMetrics() {
    const el = this.host.inventory, value = el.style.getPropertyValue('display');
    const priority = el.style.getPropertyPriority('display');
    el.style.setProperty('display', 'block', 'important');
    const rect = el.getBoundingClientRect();
    const inset = (el.querySelector<HTMLElement>('.inv-scroll')?.offsetTop ?? 0)
      + parseFloat(getComputedStyle(el).paddingBottom);
    if (value) el.style.setProperty('display', value, priority); else el.style.removeProperty('display');
    return { rect, inset };
  }

  private panels(): HTMLElement[] {
    return [...this.host.services(), ...(this.host.inventoryOwned()
      ? this.host.pages().filter(el => !el.classList.contains('hidden')) : [])];
  }

  sync(): void {
    const offered = this.panels(), bag = this.host.inventory;
    // A quiet offer (for example a shelved bounty board) cannot rearrange
    // the page being read. Once selected, its reservation lasts until close.
    const services = offered.some(el => this.host.front(el) || this.managed.has(el)) ? offered : [];
    const ownsBag = this.host.inventoryOwned();
    const companions = ownsBag && this.host.inventoryOpen() ? [bag] : [];
    const active = new Set([...services, ...companions]);
    for (const el of this.managed) if (!active.has(el)) this.release(el);
    this.managed = active;
    if (!services.length && !companions.length) {
      this.tabs.hidden = true; this.compact = false; this.contentBottom = undefined;
      this.selected = 'services'; this.frontPanel = null; return;
    }
    const front = services.find(el => this.host.front(el)) ?? null;
    if (front && front !== this.frontPanel) this.selected = 'services';
    this.frontPanel = front;
    // The same bag bounds apply alone, with a page, with Mireille, and with a
    // service. Arrival/dismissal changes selection, never Inventory's size.
    if (companions.length) bag.classList.add('service-inventory');
    const scale = uiScaleNow(), c = SERVICE_WORKSPACE_CFG, metrics = this.inventoryMetrics(), inv = metrics.rect;
    const reader = dialogueBounds(this.host.hudTop());
    this.contentBottom = reader.top - c.gap;
    const edge = c.edge * scale;
    const beside = inv.left - BUILD_PANEL_CFG.railWidth * scale - c.gap - edge;
    // A user-positioned bag keeps its home too; narrow layouts change only
    // which surface is drawn, never its coordinates or saved settings.
    this.compact = services.length > 0 && beside < c.minWidth * scale;
    if (!this.host.inventoryOpen()) this.selected = 'services';
    const width = this.compact ? Math.min(c.width * scale, window.innerWidth - edge * 2)
      : Math.min(c.width * scale, beside);
    const top = DIALOGUE_CFG.workspaceTop * scale;
    for (const el of services) {
      el.classList.add('service-workspace');
      const page = el.classList.contains('inventory-page');
      const pageWidth = page ? parseFloat(el.style.getPropertyValue('--build-width')) : NaN;
      el.style.setProperty('--service-left', page && !this.compact ? el.style.getPropertyValue('--build-left') : `${edge / scale}px`);
      el.style.setProperty('--service-top', `${(page ? inv.top : top) / scale}px`);
      const fittedWidth = this.compact ? Math.min((Number.isFinite(pageWidth) ? pageWidth : c.width) * scale, window.innerWidth - edge * 2)
        : Math.min(Number.isFinite(pageWidth) ? pageWidth * scale : width, beside);
      el.style.setProperty('--service-width', `${fittedWidth / scale}px`);
      const actualTop = panelSeatOf(el)?.top ?? (page ? inv.top : top);
      el.style.setProperty('--service-height', `${Math.max(c.minHeight, (this.contentBottom - actualTop) / scale)}px`);
      el.classList.toggle('workspace-shelved', this.compact && this.selected === 'inventory');
    }
    if (companions.length) {
      // Header/padding are stable even when the bag is the hidden compact tab.
      const height = Math.max(c.minInventoryHeight, (this.contentBottom - inv.top) / scale - metrics.inset);
      bag.style.setProperty('--service-scroll-height', `${height}px`);
    }
    for (const el of companions) {
      el.classList.toggle('workspace-shelved', this.compact && this.selected === 'services');
    }
    this.tabs.hidden = !this.compact || !this.host.inventoryOpen();
    this.tabs.style.left = `${edge / scale}px`;
    for (const button of this.tabs.querySelectorAll('button')) {
      if (button.dataset.workspaceTab === 'services') {
        const front = services.find(el => this.host.front(el));
        button.textContent = front && front.classList.contains('inventory-page') ? this.host.title(front) : 'Services';
      }
      button.setAttribute('aria-selected', String(button.dataset.workspaceTab === this.selected));
      button.tabIndex = button.dataset.workspaceTab === this.selected ? 0 : -1;
      button.setAttribute('aria-controls', button.dataset.workspaceTab === 'inventory' ? bag.id : services.map(el => el.id).join(' '));
    }
  }
}
