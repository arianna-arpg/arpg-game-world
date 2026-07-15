// ---------------------------------------------------------------------------
// CO-OP LOBBY — the copy-paste signaling UI for WebRTC sessions. Because there's
// no signaling server, the host and joiner exchange two text blobs by hand
// (Discord/SMS/etc.): the host's INVITE, then the joiner's RESPONSE. This module
// is a self-contained DOM overlay driven by callbacks; main.ts supplies the
// actual WebRtcTransport plumbing. Kept deliberately plain — it's a utility
// screen, not a polished menu.
// ---------------------------------------------------------------------------

import { UI_SCALE_CFG } from './uiScale';

export interface LobbyClass { id: string; name: string; color: string; description: string; }

export interface LobbyCallbacks {
  classes: LobbyClass[];
  /** Host a session as the chosen class. Resolves with the first invite blob, an
   *  accept(response) to complete a handshake, and newInvite() to mint a FRESH
   *  offer for the NEXT joiner (star topology — one connection per friend). */
  host: (classId: string) => Promise<{ invite: string; accept: (response: string) => Promise<void>; newInvite: () => Promise<string> }>;
  /** Join with the host's invite blob as the chosen class. Resolves with OUR
   *  response blob (paste back to host) + a `connected` promise. */
  join: (offer: string, classId: string) => Promise<{ answer: string; connected: Promise<void> }>;
  onClose: () => void;
}

export function openCoopLobby(cb: LobbyCallbacks): void {
  const css = (el: HTMLElement, s: Partial<CSSStyleDeclaration>): void => { Object.assign(el.style, s); };

  const overlay = document.createElement('div');
  overlay.className = UI_SCALE_CFG.markerClass; // dynamically-built root — opts into the UI-scale dial
  css(overlay, {
    position: 'fixed', inset: '0', zIndex: '9000', display: 'flex',
    alignItems: 'center', justifyContent: 'center', background: 'rgba(6,5,10,0.86)', font: '13px Verdana',
  });
  const panel = document.createElement('div');
  css(panel, {
    width: '560px', maxWidth: '92vw', maxHeight: '88vh', overflowY: 'auto',
    background: '#16121e', color: '#d8d4e0', border: '1px solid #5a4a6a',
    borderRadius: '8px', padding: '18px 20px', boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
  });
  overlay.append(panel);

  const close = (): void => { overlay.remove(); cb.onClose(); };

  const h = (tag: string, text?: string): HTMLElement => { const e = document.createElement(tag); if (text) e.textContent = text; return e; };
  const btn = (label: string): HTMLButtonElement => {
    const b = document.createElement('button'); b.textContent = label;
    css(b, { background: '#2a2438', color: '#e8d44a', border: '1px solid #5a4a6a', borderRadius: '5px', padding: '7px 14px', font: '13px Verdana', cursor: 'pointer', marginRight: '8px' });
    return b;
  };
  const box = (placeholder: string, ro = false): HTMLTextAreaElement => {
    const t = document.createElement('textarea'); t.placeholder = placeholder; t.readOnly = ro;
    css(t, { width: '100%', height: '76px', marginTop: '6px', background: '#0e0c14', color: '#b8e0b8', border: '1px solid #3a3450', borderRadius: '5px', padding: '6px', font: '11px monospace', resize: 'vertical', boxSizing: 'border-box' });
    return t;
  };
  const copyBtn = (src: HTMLTextAreaElement, label = 'Copy'): HTMLButtonElement => {
    const b = btn(label);
    b.addEventListener('click', () => { src.select(); void navigator.clipboard?.writeText(src.value); b.textContent = 'Copied!'; setTimeout(() => { b.textContent = label; }, 1200); });
    return b;
  };

  const title = h('h2', 'Co-op (Beta)'); css(title, { margin: '0 0 6px', color: '#e8d44a' });
  const note = h('div', 'No server needed — connect by pasting two codes. Pick your class, then Host or Join. Heads up: a few strict home networks block direct connections (no relay yet); if it never connects, that’s likely why.');
  css(note, { color: '#9a93ac', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' });

  // Class selection — real class CARDS restricted to the player's own unlocks.
  const classRow = h('div'); css(classRow, { marginBottom: '12px' });
  classRow.append(h('div', 'Choose your class (from your Vault unlocks):'));
  const cardWrap = h('div'); css(cardWrap, { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' });
  let selectedClassId = cb.classes[0]?.id ?? '';
  let classLocked = false;
  const refreshers: (() => void)[] = [];
  for (const c of cb.classes) {
    const card = h('div');
    css(card, { width: '162px', padding: '8px 10px', border: '1px solid #3a3450', borderRadius: '6px', cursor: 'pointer', background: '#100d18', boxSizing: 'border-box' });
    card.innerHTML = `<div style="color:${c.color};font-weight:bold;margin-bottom:3px">${c.name}</div><div style="color:#9a93ac;font-size:11px;line-height:1.4">${c.description}</div>`;
    const refresh = (): void => css(card, {
      borderColor: c.id === selectedClassId ? c.color : '#3a3450',
      background: c.id === selectedClassId ? '#1c1726' : '#100d18',
      opacity: classLocked ? '0.6' : '1',
    });
    card.addEventListener('click', () => { if (classLocked) return; selectedClassId = c.id; refreshers.forEach(r => r()); });
    refreshers.push(refresh);
    cardWrap.append(card);
  }
  refreshers.forEach(r => r());
  classRow.append(cardWrap);
  const lockClasses = (): void => { classLocked = true; refreshers.forEach(r => r()); };

  const actions = h('div'); css(actions, { marginBottom: '8px' });
  const hostBtn = btn('Host a Game');
  const joinBtn = btn('Join a Game');
  const cancelBtn = btn('Close'); css(cancelBtn, { color: '#c8a0a0' });
  cancelBtn.addEventListener('click', close);
  actions.append(hostBtn, joinBtn, cancelBtn);

  const stage = h('div'); css(stage, { marginTop: '10px' });
  const status = h('div'); css(status, { marginTop: '8px', minHeight: '16px', color: '#7ec850', fontSize: '12px' });
  const say = (m: string, ok = true): void => { status.textContent = m; css(status, { color: ok ? '#7ec850' : '#e08080' }); };

  panel.append(title, note, classRow, actions, stage, status);
  document.body.append(overlay);

  // --- HOST flow -----------------------------------------------------------
  hostBtn.addEventListener('click', async () => {
    stage.innerHTML = ''; say('Setting up host…');
    hostBtn.disabled = joinBtn.disabled = true; lockClasses();
    try {
      const { invite, accept, newInvite } = await cb.host(selectedClassId);
      stage.append(h('p', '1) Send this INVITE code to your friend:'));
      const inv = box('', true); inv.value = invite; stage.append(inv);
      stage.append(copyBtn(inv, 'Copy invite'));
      stage.append(h('p', '2) Paste your friend’s RESPONSE code here, then Connect:'));
      const resp = box('paste your friend’s response…'); stage.append(resp);
      const conn = btn('Connect Friend');
      conn.addEventListener('click', async () => {
        if (!resp.value.trim()) { say('Paste the response first.', false); return; }
        say('Connecting…');
        try {
          await accept(resp.value.trim());
          resp.value = '';
          // Mint a fresh invite for the NEXT friend (each peer needs its own).
          inv.value = await newInvite();
          say('Friend connected! A FRESH invite is now in the box above — copy it to add another friend.');
        } catch (e) { say('Connect failed: ' + String(e), false); }
      });
      stage.append(conn);
      say('You’re hosting and playing — share the invite above.');
    } catch (e) { say('Host failed: ' + String(e), false); hostBtn.disabled = joinBtn.disabled = false; classLocked = false; refreshers.forEach(r => r()); }
  });

  // --- JOIN flow -----------------------------------------------------------
  joinBtn.addEventListener('click', () => {
    stage.innerHTML = ''; say('');
    hostBtn.disabled = joinBtn.disabled = true; lockClasses();
    stage.append(h('p', '1) Paste the host’s INVITE code here:'));
    const offer = box('paste the host’s invite…'); stage.append(offer);
    const gen = btn('Generate Response');
    stage.append(gen);
    gen.addEventListener('click', async () => {
      if (!offer.value.trim()) { say('Paste the invite first.', false); return; }
      gen.disabled = true; say('Preparing response…');
      try {
        const { answer, connected } = await cb.join(offer.value.trim(), selectedClassId);
        stage.append(h('p', '2) Send this RESPONSE code back to the host:'));
        const ans = box('', true); ans.value = answer; stage.append(ans);
        stage.append(copyBtn(ans, 'Copy response'));
        say('Waiting for the host to connect you…');
        connected.then(() => { say('Connected! Entering the host’s world…'); setTimeout(() => overlay.remove(), 800); })
          .catch((e: unknown) => say('Connection failed: ' + String(e), false));
      } catch (e) { say('Failed: ' + String(e), false); gen.disabled = false; }
    });
  });
}
