import type { FolioCore } from './folio';

/** Inventory owns every development page. Folio owns which open tab is
 * selected; this registry owns page membership, visibility and lifecycle.
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

export class InventoryPages {
  private readonly pages = new Map<string, InventoryPage>();
  private readonly retained = new Map<string, Set<string>>();
  private readonly assigned = new Map<string, string>();

  constructor(private readonly host: InventoryPagesHost) {}

  register(page: InventoryPage): void {
    if (this.pages.has(page.id)) throw new Error(`inventory page '${page.id}' registered twice`);
    page.el.classList.add('inventory-page', 'hidden');
    this.pages.set(page.id, page);
    this.host.enroll(page);
  }

  entries(): InventoryPage[] { return [...this.pages.values()]; }

  isOpen(id: string): boolean {
    if (!this.host.isOpen()) return false;
    const owner = this.host.owner(), page = this.pages.get(id);
    return !!page && !!this.retained.get(owner)?.has(id)
      && (page.available?.(owner) ?? true);
  }

  /** Direct requests select their page. Only a toggle on the already
   * selected page closes the inventory; a show request always keeps it up.
   * Returns true when the requested page is shown. */
  request(id: string, owner: string, mode: 'toggle' | 'show' = 'toggle'): boolean {
    const page = this.pages.get(id);
    if (!page || !(page.available?.(owner) ?? true)) return false;
    if (mode === 'toggle' && owner === this.host.owner() && this.isOpen(id)
      && this.host.folio().bookFor(id)?.front === id) {
      this.host.close();
      return false;
    }
    if (!this.host.open(owner)) return false;
    let retained = this.retained.get(owner);
    if (!retained) this.retained.set(owner, retained = new Set());
    const fresh = !retained.has(id) || this.assigned.get(id) !== owner;
    retained.add(id);
    this.assign(page, owner);
    page.enter?.(owner, fresh);
    this.host.changed();
    const folio = this.host.folio();
    if (folio.adopt(id, 'front') === 'noop') folio.front(id);
    this.host.selected();
    return true;
  }

  /** Page close glyphs and folio closes forget just that page. */
  close(id: string): void {
    if (!this.retained.get(this.host.owner())?.delete(id)) return;
    this.host.changed();
  }

  sync(): void {
    for (const page of this.pages.values()) {
      const open = this.isOpen(page.id);
      if (!open && !page.el.classList.contains('hidden')) page.leave?.();
      page.el.classList.toggle('hidden', !open);
      if (open) {
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
