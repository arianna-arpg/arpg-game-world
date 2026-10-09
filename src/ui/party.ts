// THE PARTY PANEL (docs/design/shard-world.md card 23 — THE PARTY): the client's
// half of the social unit on a hosted world. It reads what the shard published
// (World.partyRows — every party's composition), the peers the transport knows
// (the players around you), the invitations that landed (session `partyInvite`)
// and the shard's last refusal (session `partyWord`), and sends its words over
// the session wire (`party` — invite / accept / decline / leave / kick). A menu
// page may speak; SHOW DON'T TELL is the WORLD's law. One root, re-rendered on
// a short clock while open, closed by its own glyph or the menu's verb.
import type { PartyOp, PartyRow } from '../net/partyWire';
import { esc } from './dom';
import { UI_SCALE_CFG } from './uiScale';
import { Z_LADDER } from './zorder';

export const PARTY_PANEL_CFG = {
  /** Re-render cadence while open (ms): the rows ride the snapshot, the peers the roster. */
  refreshMs: 500,
};

export interface PartyPanelReads {
  /** My seat id on the shard (the client's seat). */
  me: () => string;
  /** Every connected player the transport knows: id + the name it joined with. */
  peers: () => readonly { id: string; name: string }[];
  /** The parties the shard published (null off a hosted world). */
  rows: () => readonly PartyRow[] | null;
  /** Invitations that landed on me and still stand. */
  invites: () => readonly { from: string; name: string; party: string }[];
  /** The shard's last refusal, one line (null = none). */
  word: () => string | null;
}

export interface PartyPanelActions {
  send: (op: PartyOp, seat?: string) => void;
  /** An invite answered (accepted or declined) leaves the list. */
  settleInvite: (from: string) => void;
}

export class PartyPanel {
  private root: HTMLDivElement | null = null;
  private clock: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly reads: PartyPanelReads, private readonly acts: PartyPanelActions) {}

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
    document.body.append(root);
    this.root = root;
    this.render();
    this.clock = setInterval(() => this.render(), PARTY_PANEL_CFG.refreshMs);
  }

  close(): void {
    if (this.clock) { clearInterval(this.clock); this.clock = null; }
    this.root?.remove();
    this.root = null;
  }

  /** Re-draw from the reads. Buttons speak through the actions; nothing here is state. */
  render(): void {
    const root = this.root;
    if (!root) return;
    const me = this.reads.me();
    const rows = this.reads.rows();
    const mine = rows?.find(p => p.members.includes(me)) ?? null;
    const nameOf = (id: string): string => this.reads.peers().find(p => p.id === id)?.name ?? (id === me ? 'you' : id);
    const grouped = new Set(rows?.flatMap(p => p.members) ?? []);
    const word = this.reads.word();
    const invites = this.reads.invites();
    const strangers = this.reads.peers().filter(p => p.id !== me && !grouped.has(p.id));
    const h: string[] = [];
    h.push(`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Party</b><button data-act="close" style="background:none;border:none;color:#9a8fb0;font-size:16px;cursor:pointer">×</button></div>`);
    if (!rows) {
      h.push(`<div style="color:#7a7390">Only on a hosted world.</div>`);
    } else {
      h.push(`<div style="color:#9a8fb0;margin:6px 0 4px">${mine ? `Your party (${mine.members.length})` : 'You walk alone'}</div>`);
      if (mine) {
        for (const id of mine.members) {
          const lead = id === mine.leader;
          const canKick = mine.leader === me && id !== me;
          h.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0"><span>${esc(nameOf(id))}${lead ? ' <span style="color:#c8a84b">◆</span>' : ''}</span>${canKick ? `<button data-act="kick" data-seat="${esc(id)}" style="font-size:11px">Kick</button>` : ''}</div>`);
        }
        h.push(`<button data-act="leave" style="margin-top:4px;font-size:11px">Leave the party</button>`);
      }
      if (invites.length) {
        h.push(`<div style="color:#9a8fb0;margin:10px 0 4px">Invitations</div>`);
        for (const inv of invites) {
          h.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0"><span>${esc(inv.name)}</span><span><button data-act="accept" data-seat="${esc(inv.from)}" style="font-size:11px">Accept</button> <button data-act="decline" data-seat="${esc(inv.from)}" style="font-size:11px">Decline</button></span></div>`);
        }
      }
      h.push(`<div style="color:#9a8fb0;margin:10px 0 4px">Players near you</div>`);
      if (!strangers.length) h.push(`<div style="color:#7a7390">No one ungrouped is here.</div>`);
      for (const p of strangers) {
        h.push(`<div style="display:flex;justify-content:space-between;align-items:center;padding:2px 0"><span>${esc(p.name)}</span><button data-act="invite" data-seat="${esc(p.id)}" style="font-size:11px">Invite</button></div>`);
      }
      if (word) h.push(`<div style="color:#c47a5a;margin-top:8px">${esc(word)}</div>`);
    }
    root.innerHTML = h.join('');
    root.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach(b => {
      b.addEventListener('click', () => {
        const act = b.dataset.act, seat = b.dataset.seat;
        if (act === 'close') { this.close(); return; }
        if (act === 'accept' || act === 'decline') { this.acts.send(act, seat); if (seat) this.acts.settleInvite(seat); }
        else if (act === 'invite' || act === 'kick') this.acts.send(act, seat);
        else if (act === 'leave') this.acts.send('leave');
        this.render();
      });
    });
  }
}
