// ---------------------------------------------------------------------------
// CO-OP LOBBY — the copy-paste signaling UI for WebRTC sessions. Because there's
// no signaling server, the host and joiner exchange two text blobs by hand
// (Discord/SMS/etc.): the host's INVITE, then the joiner's RESPONSE. This module
// is a self-contained DOM overlay driven by callbacks; main.ts supplies the
// actual WebRtcTransport plumbing. Kept deliberately plain — it's a utility
// screen, not a polished menu.
// ---------------------------------------------------------------------------

import { esc } from './dom';
import { UI_SCALE_CFG } from './uiScale';
import { Z_LADDER } from './zorder';

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
  /** THE SHARD (docs/design/shard-world.md): connect to a hosted world at its
   *  address (a WsTransport client). Absent = the row is not offered. Resolves
   *  once the shard seated us. THE FRONT DOOR (W7): class-free (the saved hero
   *  travels, else Mu picks one); `replaceSolo` is THE SOLO GUARD's confirm. */
  connect?: (url: string, opts: { replaceSolo: boolean }) => Promise<'connected' | 'mu'>; // 'mu' = THE LOGIN THROUGH MU took the screen
  /** The address the server box offers first (the world that served this page, else
   *  WS_TRANSPORT_CFG.defaultUrl; a remembered address wins over the plain default). */
  connectDefault?: string;
  /** THE VESSEL: the line naming which hero will travel (the saved hero by name, or Mu
   *  picks one), and THE SOLO GUARD's line when its slot holds a solo world that its
   *  travel would leave behind (the lobby asks first). Absent = no line. */
  serverHero?: () => Promise<{ note: string; leaveBehind?: string }>;
  /** One plain line per failure (net/shardDoor.ts doorWord). */
  word?: (e: unknown) => string;
  /** THE SERVED MARK (W7): the world that served this page; the box offers it before a
   *  remembered address. */
  connectServed?: string;
  onClose: () => void;
}

export function openCoopLobby(cb: LobbyCallbacks): void {
  const css = (el: HTMLElement, s: Partial<CSSStyleDeclaration>): void => { Object.assign(el.style, s); };

  const overlay = document.createElement('div');
  overlay.className = UI_SCALE_CFG.markerClass; // dynamically-built root — opts into the UI-scale dial
  css(overlay, {
    position: 'fixed', inset: '0', zIndex: String(Z_LADDER.cover), display: 'flex',
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
    css(b, { background: '#2a2438', color: '#e8d44a', border: '1px solid #5a4a6a', borderRadius: '5px', padding: '7px 14px', font: '13px Verdana', cursor: 'var(--cursor-point, pointer)', marginRight: '8px' });
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

  // THE FRONT DOOR (W7): one plain line per failure (no "Error:" prefix).
  const plain = (e: unknown): string => cb.word ? cb.word(e) : String(e instanceof Error ? e.message : e);
  const title = h('h2', 'Co-op (Beta)'); css(title, { margin: '0 0 6px', color: '#e8d44a' });
  // THE FRONT DOOR (W7): the two roads told apart. A server join is class-free (the saved
  // hero travels, else Mu picks one); the class cards belong to the paste-two-codes road.
  const note = h('div', cb.connect
    ? 'Join a hosted world by its address, or play with a friend directly: one hosts, the other joins, by pasting two codes.'
    : 'Play with a friend directly: one hosts, the other joins, by pasting two codes.');
  css(note, { color: '#9a93ac', fontSize: '12px', marginBottom: '12px', lineHeight: '1.5' });
  const rtcNote = h('div', 'No server needed: you connect by pasting two codes. Pick your class, then Host or Join. A few strict home networks block direct connections (no relay yet); if it never connects, that is likely why.');
  css(rtcNote, { color: '#9a93ac', fontSize: '12px', marginBottom: '8px', lineHeight: '1.5' });

  // Class selection — real class CARDS restricted to the player's own unlocks.
  const classRow = h('div'); css(classRow, { marginBottom: '12px' });
  classRow.append(rtcNote);
  classRow.append(h('div', 'Choose from your unlocked classes:'));
  const cardWrap = h('div'); css(cardWrap, { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' });
  let selectedClassId = cb.classes[0]?.id ?? '';
  let classLocked = false;
  const refreshers: (() => void)[] = [];
  for (const c of cb.classes) {
    const card = h('div');
    css(card, { width: '162px', padding: '8px 10px', border: '1px solid #3a3450', borderRadius: '6px', cursor: 'var(--cursor-point, pointer)', background: '#100d18', boxSizing: 'border-box' });
    card.innerHTML = `<div style="color:${c.color};font-weight:bold;margin-bottom:3px">${esc(c.name)}</div><div style="color:#9a93ac;font-size:11px;line-height:1.4">${esc(c.description)}</div>`;
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
  const serverBtn = cb.connect ? btn('Join a Server') : null;
  const cancelBtn = btn('Close'); css(cancelBtn, { color: '#c8a0a0' });
  cancelBtn.addEventListener('click', close);
  actions.append(hostBtn, joinBtn);
  if (serverBtn) actions.append(serverBtn);
  actions.append(cancelBtn);

  const stage = h('div'); css(stage, { marginTop: '10px' });
  const status = h('div'); css(status, { marginTop: '8px', minHeight: '16px', color: '#7ec850', fontSize: '12px' });
  const say = (m: string, ok = true): void => { status.textContent = m; css(status, { color: ok ? '#7ec850' : '#e08080' }); };

  panel.append(title, note, actions, classRow, stage, status);
  document.body.append(overlay);
  // THE FRONT DOOR (W7): the cards wait for a road that needs them (Host or Join).
  const showClasses = (on: boolean): void => { classRow.style.display = on ? '' : 'none'; };
  showClasses(!cb.connect);

  // --- HOST flow -----------------------------------------------------------
  hostBtn.addEventListener('click', async () => {
    stage.innerHTML = ''; say('Setting up host…');
    hostBtn.disabled = joinBtn.disabled = true; if (serverBtn) serverBtn.disabled = true; showClasses(true); lockClasses();
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
        } catch (e) { say(plain(e), false); }
      });
      stage.append(conn);
      say('You’re hosting and playing — share the invite above.');
    } catch (e) { say(plain(e), false); hostBtn.disabled = joinBtn.disabled = false; if (serverBtn) serverBtn.disabled = false; classLocked = false; refreshers.forEach(r => r()); }
  });

  // --- SERVER flow (THE SHARD — a WsTransport client) ----------------------
  serverBtn?.addEventListener('click', () => {
    stage.innerHTML = ''; say('');
    hostBtn.disabled = joinBtn.disabled = true; if (serverBtn) serverBtn.disabled = true; showClasses(false);
    stage.append(h('p', 'The world’s address (the https:// link a codespace shows, or ws://host:port):'));
    const url = document.createElement('input');
    url.type = 'text';
    // THE REMEMBERED ADDRESS: the last server that seated us, else the default.
    let remembered: string | null = null;
    try { remembered = window.localStorage.getItem('hw_shard_url'); } catch { /* storage may refuse */ }
    url.value = cb.connectServed ?? (remembered || (cb.connectDefault ?? 'ws://localhost:8787')); // THE SERVED MARK (W7) first
    css(url, { width: '100%', marginTop: '6px', background: '#0e0c14', color: '#b8e0b8', border: '1px solid #3a3450', borderRadius: '5px', padding: '6px', font: '12px monospace', boxSizing: 'border-box' });
    stage.append(url);
    // THE FRONT DOOR (W7): the truth about who travels, and THE SOLO GUARD's line + confirm.
    const traveler = h('div'); css(traveler, { marginTop: '6px', color: '#9a93ac', fontSize: '12px' });
    const warn = h('div'); css(warn, { marginTop: '6px', color: '#e8b06a', fontSize: '12px', lineHeight: '1.4', display: 'none' });
    const agreeRow = document.createElement('label');
    css(agreeRow, { display: 'none', marginTop: '6px', color: '#d8d4e0', fontSize: '12px', cursor: 'var(--cursor-point, pointer)' });
    const agree = document.createElement('input'); agree.type = 'checkbox'; css(agree, { marginRight: '6px', verticalAlign: 'middle' });
    agreeRow.append(agree, document.createTextNode('Leave that world behind and travel'));
    stage.append(traveler, warn, agreeRow);
    let leaveBehind = false;
    const keep = h('div', 'A hosted world keeps running without you. Your hero comes home when you leave and logs back in where it left; a mortal fall leaves its body where it fell for your next hero to find.');
    css(keep, { marginTop: '6px', color: '#7a7390', fontSize: '11px', lineHeight: '1.4' });
    stage.append(keep);
    const go = btn('Connect'); css(go, { marginTop: '8px' });
    stage.append(go);
    const gate = (): void => { go.disabled = leaveBehind && !agree.checked; };
    agree.addEventListener('change', gate);
    if (cb.serverHero) {
      void cb.serverHero().then(r => {
        traveler.textContent = r.note;
        if (r.leaveBehind) { leaveBehind = true; warn.textContent = r.leaveBehind; warn.style.display = ''; agreeRow.style.display = 'block'; gate(); }
      }, () => { /* the line stays empty */ });
    }
    go.addEventListener('click', async () => {
      const target = url.value.trim();
      if (!target) { say('Enter the world’s address first.', false); return; }
      if (leaveBehind && !agree.checked) return; // THE SOLO GUARD: never without the word
      go.disabled = true; say('Connecting…');
      try {
        const answer = await cb.connect!(target, { replaceSolo: leaveBehind && agree.checked }); // 'connected', or 'mu' (THE LOGIN THROUGH MU)
        try { window.localStorage.setItem('hw_shard_url', target); } catch { /* storage may refuse */ }
        if (answer === 'mu') { overlay.remove(); return; } // THE LOGIN THROUGH MU: the hub takes the screen; the pick travels
        say('Connected. Entering the world…');
        setTimeout(() => overlay.remove(), 800);
      } catch (e) { say(plain(e), false); go.disabled = false; gate(); }
    });
  });

  // --- JOIN flow -----------------------------------------------------------
  joinBtn.addEventListener('click', () => {
    stage.innerHTML = ''; say('');
    hostBtn.disabled = joinBtn.disabled = true; if (serverBtn) serverBtn.disabled = true; showClasses(true); lockClasses();
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
          .catch((e: unknown) => say(plain(e), false));
      } catch (e) { say(plain(e), false); gen.disabled = false; }
    });
  });
}
