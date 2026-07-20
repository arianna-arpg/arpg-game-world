// ---------------------------------------------------------------------------
// THE COUCH JOIN OVERLAY (data/couch.ts) — "a second player picks up a pad."
//
// Self-contained DOM in the lobby idiom (ui/lobby.ts): no index.html panel,
// no panels.ts coupling — the overlay renders whatever VIEW main.ts hands it
// and reports clicks back. main.ts owns the whole flow: the claim scan
// ("press Ⓐ on the joining controller"), the lane law (mortal run → a fresh
// disposable hero; immortal run → another vessel from this account's
// roster), and the seat mint itself. Both the mouse and either pad pointer
// can drive the buttons — the couch is cooperative, the overlay doesn't care
// whose hand confirms.
// ---------------------------------------------------------------------------

export interface CouchJoinChoice {
  key: string;
  title: string;
  sub: string;
  color: string;
  disabled?: string; // present = unpickable, with the reason as the label
}

export interface CouchJoinView {
  /** 'claim' = waiting for the joining pad's press; 'pick' = choose who joins. */
  phase: 'claim' | 'pick';
  /** The lane banner ("Immortal run — choose another vessel"). */
  lane: string;
  /** The live status line under the banner. */
  message: string;
  choices: CouchJoinChoice[];
  onPick: (key: string) => void;
  onCancel: () => void;
}

export class CouchJoinOverlay {
  private root: HTMLDivElement;
  private view: CouchJoinView | null = null;
  private lastHtml = '';

  constructor() {
    this.root = document.createElement('div');
    this.root.style.cssText =
      'position:fixed;inset:0;display:none;z-index:9000;background:rgba(6,6,10,0.82);'
      + 'align-items:center;justify-content:center;font-family:Verdana,sans-serif;';
    document.body.appendChild(this.root);
  }

  get open(): boolean { return this.root.style.display !== 'none'; }

  show(view: CouchJoinView): void {
    this.view = view;
    this.root.style.display = 'flex';
    this.render();
  }

  /** Re-render from a fresh view (the claim scan updates the message live).
   *  Skip-identical like setPanelHtml — a stationary view never tears the
   *  DOM out from under a pointer press. */
  update(view: CouchJoinView): void {
    if (!this.open) return;
    this.view = view;
    this.render();
  }

  hide(): void {
    this.root.style.display = 'none';
    this.view = null;
    this.lastHtml = '';
  }

  private render(): void {
    const v = this.view;
    if (!v) return;
    const cards = v.choices.map(c => `
      <button data-couch-pick="${c.key}" ${c.disabled ? 'disabled' : ''}
        style="display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;
          background:#14121c;border:1px solid ${c.disabled ? '#3a3a44' : c.color};border-radius:4px;
          color:#e8e4d8;cursor:${c.disabled ? 'default' : 'pointer'}">
        <div style="font-weight:bold;color:${c.disabled ? '#6a6a74' : c.color}">${c.title}</div>
        <div style="font-size:11px;color:#9a96a8;margin-top:2px">${c.disabled ?? c.sub}</div>
      </button>`).join('');
    const html = `
      <div style="width:min(560px,92vw);max-height:86vh;overflow-y:auto;background:#0e0c14;
        border:1px solid #c8a84b;border-radius:6px;padding:18px 20px;box-shadow:0 0 40px rgba(0,0,0,0.7)">
        <h2 style="margin:0 0 4px;color:#c8a84b;font-size:18px">Local Co-op</h2>
        <div style="color:#b8a97a;font-size:12px;margin-bottom:8px">${v.lane}</div>
        <div style="color:#d8d4c8;font-size:13px;margin-bottom:10px">${v.message}</div>
        ${v.phase === 'pick' ? cards : ''}
        <div style="margin-top:12px;text-align:right">
          <button data-couch-cancel style="padding:6px 14px;background:#1a1822;border:1px solid #3a3a52;
            color:#b8b4a8;border-radius:4px;cursor:pointer">Cancel</button>
        </div>
      </div>`;
    if (html === this.lastHtml) return;
    this.lastHtml = html;
    this.root.innerHTML = html;
    this.root.querySelectorAll<HTMLButtonElement>('button[data-couch-pick]').forEach(btn =>
      btn.addEventListener('click', () => this.view?.onPick(btn.dataset.couchPick!)));
    this.root.querySelector<HTMLButtonElement>('button[data-couch-cancel]')
      ?.addEventListener('click', () => this.view?.onCancel());
  }
}
