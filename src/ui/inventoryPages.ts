import type { FolioCore } from './folio';

/** Folio selects the active docked tab. This registry owns page membership,
 * standalone presentation, visibility and lifecycle.
 * Contract: docs/ui/inventory-pages.md. */
export interface InventoryPage {
  id: string;
  el: HTMLElement;
  title(): string;
  width: number;
  available?(owner: string): boolean;
  enter?(owner: string, fresh: boolean): void;
  leave?(): void;
  refresh(): void;
}

export interface InventoryPagesHost {
  owner(): string;
  isOpen(): boolean;
  open(owner: string): boolean;
  close(): void;
  assign(el: HTMLElement, owner: string): void;
  enroll(page: InventoryPage): void;
  changed(): void;
  selected(): void;
  folio(): FolioCore;
}

/** Shortcut/menu toggles close the workspace; ribbon toggles close one page.
 * Navigation requests only show. The caller supplies intent, not device type. */
export type InventoryPageRequest = 'toggle' | 'toggle-page' | 'show';

export class InventoryPages {
  private readonly pages = new Map<string, InventoryPage>();
  private readonly retained = new Map<string, Set<string>>();
  private readonly assigned = new Map<string, string>();
  /** A page can occupy the window independently of any owner's bag or folio. */
  private independent: { id: string; owner: string } | null = null;

  constructor(private readonly host: InventoryPagesHost) {}

  register(page: InventoryPage): void {
    if (this.pages.has(page.id)) throw new Error(`inventory page '${page.id}' registered twice`);
    page.el.classList.add('inventory-page', 'hidden');
    this.pages.set(page.id, page);
    this.host.enroll(page);
  }

  entries(): InventoryPage[] { return [...this.pages.values()]; }

  isOpen(id: string): boolean {
    if (!this.host.isOpen() || this.isIndependent(id)) return false;
    const owner = this.host.owner(), page = this.pages.get(id);
    return !!page && !!this.retained.get(owner)?.has(id)
      && (page.available?.(owner) ?? true);
  }

  isIndependent(id: string, owner?: string): boolean {
    return this.independent?.id === id && (owner === undefined || this.independent.owner === owner);
  }

  openIndependent(id: string, owner: string): boolean {
    const page = this.pages.get(id);
    if (!page || !(page.available?.(owner) ?? true)) return false;
    if (this.isIndependent(id, owner)) return true;
    const continuing = this.isOpen(id) && this.assigned.get(id) === owner;
    if (this.isIndependent(id)) page.leave?.();
    this.retained.get(owner)?.delete(id);
    this.independent = { id, owner };
    this.assign(page, owner);
    page.enter?.(owner, !continuing);
    this.host.changed();
    return true;
  }

  /** Direct requests select their page. Repeating the selected page follows
   * the caller's close scope; a show request always keeps it up.
   * Returns true when the requested page is shown. */
  request(id: string, owner: string, mode: InventoryPageRequest = 'toggle'): boolean {
    const page = this.pages.get(id);
    if (!page || !(page.available?.(owner) ?? true)) return false;
    if (!this.independent && mode !== 'show' && owner === this.host.owner() && this.isOpen(id)
      && this.host.folio().bookFor(id)?.front === id) {
      if (mode === 'toggle-page') this.close(id);
      else this.host.close();
      return false;
    }
    if (!this.host.open(owner)) return false;
    const returning = this.isIndependent(id, owner);
    if (!returning && this.isIndependent(id)) page.leave?.();
    if (this.independent?.owner === owner || this.isIndependent(id)) this.independent = null;
    let retained = this.retained.get(owner);
    if (!retained) this.retained.set(owner, retained = new Set());
    const fresh = !returning && (!retained.has(id) || this.assigned.get(id) !== owner);
    retained.add(id);
    this.assign(page, owner);
    page.enter?.(owner, fresh);
    this.host.changed();
    const folio = this.host.folio();
    if (folio.adopt(id, 'front') === 'noop') folio.front(id);
    this.host.selected();
    return true;
  }

  /** Active ribbons, page close glyphs and folio closes forget just that page. */
  close(id: string): void {
    if (this.isIndependent(id)) this.independent = null;
    else if (!this.retained.get(this.host.owner())?.delete(id)) return;
    this.host.changed();
  }

  sync(): void {
    const independent = this.independent;
    if (independent && this.pages.get(independent.id)?.available?.(independent.owner) === false) this.independent = null;
    for (const page of this.pages.values()) {
      const detached = this.isIndependent(page.id);
      page.el.classList.toggle('page-full-window', detached);
      const open = detached || this.isOpen(page.id);
      if (!open && !page.el.classList.contains('hidden')) page.leave?.();
      page.el.classList.toggle('hidden', !open);
      if (open && !detached) {
        const owner = this.host.owner();
        const changed = this.assigned.get(page.id) !== owner;
        this.assign(page, owner);
        if (changed) page.enter?.(owner, true);
      }
    }
  }

  private assign(page: InventoryPage, owner: string): void {
    this.host.assign(page.el, owner);
    this.assigned.set(page.id, owner);
  }
}
