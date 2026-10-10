// THE PARTY PANEL (docs/design/shard-world.md card 23 — THE PARTY): the client's
// half of the social unit on a hosted world. It draws one model (net/partyReads.ts
// partyPanelModel: your party and its held places, the invitations that landed,
// the players near you within THE NEAR LAW's radius, the far roster by name, the
// shard's last refusal) and sends its words over the session wire (`party`:
// invite / accept / decline / leave / kick). A menu page may speak; SHOW DON'T
// TELL is the WORLD's law. THE PARTY THAT READS (a stable panel): the root is
// built once at open, a short clock re-reads the model and touches the DOM only
// when the model's digest moved, rows are patched in place by key (a row that
// did not change keeps its element and its buttons), and one delegated listener
// answers every button, so a click never falls between two renders.
import type { PartyOp } from '../net/partyWire';
import type { PartyPanelModel } from '../net/partyReads';
import { esc } from './dom';
import { UI_SCALE_CFG } from './uiScale';
import { Z_LADDER } from './zorder';

export const PARTY_PANEL_CFG = {
  /** How often the open panel re-reads its model (ms); the DOM moves only when the model did. */
  refreshMs: 250,
  /** Inks: section heads, quiet rows, the leader's mark, a refusal. */
  ink: { head: '#9a8fb0', quiet: '#7a7390', lead: '#c8a84b', word: '#c47a5a' },
};

export interface PartyPanelActions {
  send: (op: PartyOp, seat?: string) => void;
  /** An invite answered (accepted or declined) leaves the list. */
  settleInvite: (from: string) => void;
}

/** One list's rows: a stable key and the row's inner html (its buttons carry data-act/data-seat). */
interface PanelRow { key: string; html: string }

const ROW_STYLE: Partial<CSSStyleDeclaration> = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' };
const BUTTON = 'style="font-size:11px"';
/** The html each patched row last wore (a row whose html is unchanged is never touched). */
const rowHtml = new WeakMap<Element, string>();

/** Patch a list's rows in place by key: an unchanged row keeps its element (and its buttons),
 *  a changed one re-draws inside the same element, a new key mints one, a gone key leaves;
 *  the order follows the model. */
function syncRows(list: HTMLElement, rows: readonly PanelRow[]): void {
  const have = new Map<string, HTMLElement>();
  for (const el of Array.from(list.children) as HTMLElement[]) have.set(el.dataset.key ?? '', el);
  rows.forEach((r, i) => {
    let el = have.get(r.key);
    if (el) {
      have.delete(r.key);
      if (rowHtml.get(el) !== r.html) { el.innerHTML = r.html; rowHtml.set(el, r.html); }
    } else {
      el = document.createElement('div');
      el.dataset.key = r.key;
      Object.assign(el.style, ROW_STYLE);
      el.innerHTML = r.html;
      rowHtml.set(el, r.html);
    }
    const at = list.children[i] ?? null;
    if (at !== el) list.insertBefore(el, at);
  });
  for (const el of have.values()) el.remove();
}

interface PanelParts {
  status: HTMLDivElement; members: HTMLDivElement; leave: HTMLButtonElement;
  invitesHead: HTMLDivElement; invites: HTMLDivElement;
  nearHead: HTMLDivElement; near: HTMLDivElement; nearNone: HTMLDivElement;
  farHead: HTMLDivElement; far: HTMLDivElement; word: HTMLDivElement;
}

export class PartyPanel {
  private root: HTMLDivElement | null = null;
  private parts: PanelParts | null = null;
  private clock: ReturnType<typeof setInterval> | null = null;
  /** The digest of the model the DOM shows ('' = nothing drawn yet). */
  private shown = '';

  constructor(private readonly model: () => PartyPanelModel, private readonly acts: PartyPanelActions) {}

  isOpen(): boolean { return this.root !== null; }
  toggle(): void { if (this.root) this.close(); else this.open(); }

  open(): void {
    if (this.root) { this.render(); return; }
    const root = document.createElement('div');
    root.className = `${UI_SCALE_CFG.markerClass} party-panel`;
    Object.assign(root.style, {
      position: 'fixed', right: '16px', top: '72px', width: '300px', maxHeight: '70vh', overflowY: 'auto',
      zIndex: String(Z_LADDER.cover), background: '#16121e', color: '#d8d4e0', border: '1px solid #5a4a6a',
      borderRadius: '8px', padding: '12px 14px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)', font: '12px Verdana',
    } as Partial<CSSStyleDeclaration>);
    const ink = PARTY_PANEL_CFG.ink;
    const div = (style: Partial<CSSStyleDeclaration> = {}, text = ''): HTMLDivElement => {
      const d = document.createElement('div');
      Object.assign(d.style, style);
      d.textContent = text;
      return d;
    };
    const head = (text: string): HTMLDivElement => div({ color: ink.head, margin: '10px 0 4px' }, text);
    const top = div({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' });
    top.innerHTML = '<b>Party</b><button data-act="close" style="background:none;border:none;color:#9a8fb0;font-size:16px;cursor:pointer">×</button>';
    const leave = document.createElement('button');
    leave.dataset.act = 'leave';
    leave.textContent = 'Leave the party';
    Object.assign(leave.style, { marginTop: '4px', fontSize: '11px' });
    const parts: PanelParts = {
      status: div({ color: ink.head, margin: '6px 0 4px' }), members: div(), leave,
      invitesHead: head('Invitations'), invites: div(),
      nearHead: head('Players near you'), near: div(), nearNone: div({ color: ink.quiet }, 'No one is near.'),
      farHead: head('Farther away'), far: div(), word: div({ color: ink.word, marginTop: '8px' }),
    };
    root.append(top, parts.status, parts.members, parts.leave, parts.invitesHead, parts.invites,
      parts.nearHead, parts.near, parts.nearNone, parts.farHead, parts.far, parts.word);
    root.addEventListener('click', e => this.onClick(e));
    document.body.append(root);
    this.root = root;
    this.parts = parts;
    this.shown = '';
    this.render();
    this.clock = setInterval(() => this.render(), PARTY_PANEL_CFG.refreshMs);
  }

  close(): void {
    if (this.clock) { clearInterval(this.clock); this.clock = null; }
    this.root?.remove();
    this.root = null;
    this.parts = null;
    this.shown = '';
  }

  /** Re-read the model; patch the DOM only when it moved. Nothing here is state. */
  render(): void {
    const parts = this.parts;
    if (!this.root || !parts) return;
    const m = this.model();
    const digest = JSON.stringify(m);
    if (digest === this.shown) return;
    this.shown = digest;
    const ink = PARTY_PANEL_CFG.ink;
    const show = (el: HTMLElement, on: boolean): void => { el.style.display = on ? '' : 'none'; };
    parts.status.textContent = !m.hosted ? 'Only on a hosted world.' : m.party ? `Your party (${m.party.members.length})` : 'You walk alone';
    const members: PanelRow[] = m.party ? m.party.members.map(x => ({
      key: `m:${x.id}`,
      html: `<span>${esc(x.name)}${x.lead ? ` <span style="color:${ink.lead}">◆</span>` : ''}</span>`
        + (x.kick ? `<button data-act="kick" data-seat="${esc(x.id)}" ${BUTTON}>Kick</button>` : ''),
    })) : [];
    // THE HELD PLACE: a fallen member's place, dim, waiting on its next vessel.
    if (m.party) m.party.held.forEach((name, i) => members.push({ key: `h:${i}:${name}`, html: `<span style="color:${ink.quiet}">${esc(name)} ○</span>` }));
    syncRows(parts.members, members);
    show(parts.leave, !!m.party);
    syncRows(parts.invites, m.invites.map(x => ({
      key: `i:${x.from}`,
      html: `<span>${esc(x.name)}</span><span><button data-act="accept" data-seat="${esc(x.from)}" ${BUTTON}>Accept</button> `
        + `<button data-act="decline" data-seat="${esc(x.from)}" ${BUTTON}>Decline</button></span>`,
    })));
    show(parts.invitesHead, m.invites.length > 0);
    syncRows(parts.near, m.near.map(x => ({
      key: `n:${x.id}`,
      html: `<span>${esc(x.name)}</span>`
        + (x.invite ? `<button data-act="invite" data-seat="${esc(x.id)}" ${BUTTON}>Invite</button>` : `<span style="color:${ink.quiet}">grouped</span>`),
    })));
    show(parts.nearHead, m.hosted);
    show(parts.nearNone, m.hosted && !m.near.length);
    syncRows(parts.far, m.far.map(x => ({ key: `f:${x.id}`, html: `<span style="color:${ink.quiet}">${esc(x.name)}</span>` })));
    show(parts.farHead, m.far.length > 0);
    parts.word.textContent = m.word ?? '';
    show(parts.word, !!m.word);
  }

  /** The one delegated listener: every button speaks through the actions. */
  private onClick(e: MouseEvent): void {
    const b = (e.target as HTMLElement | null)?.closest('button[data-act]') as HTMLButtonElement | null;
    if (!b || !this.root?.contains(b)) return;
    const act = b.dataset.act, seat = b.dataset.seat;
    if (act === 'close') { this.close(); return; }
    if (act === 'accept' || act === 'decline') { this.acts.send(act, seat); if (seat) this.acts.settleInvite(seat); }
    else if (act === 'invite' || act === 'kick') this.acts.send(act, seat);
    else if (act === 'leave') this.acts.send('leave');
    this.render();
  }
}
