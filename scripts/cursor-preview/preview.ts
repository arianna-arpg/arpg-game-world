import { applyCursor, CURSOR_COLORS, CURSOR_STYLES, CURSOR_ROLE_LIST, CURSOR_MOTION_CFG, cursorRoleCss, normalizeCursorOptions, type CursorRole } from '../../src/core/cursor';
import { startCursorMotion } from '../../src/core/cursorMotion';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const style = el<HTMLSelectElement>('style'), color = el<HTMLInputElement>('color');
const motion = el<HTMLInputElement>('motion'), delay = el<HTMLInputElement>('delay');
const roles = el('roles'), stage = el('stage'), frame = el<HTMLIFrameElement>('game');
const names: Record<CursorRole, string> = { default: 'Resting vessel', point: 'Reach', press: 'Press', text: 'Write', grab: 'Gather', grabbing: 'Hold', help: 'Discover', copy: 'Echo', crosshair: 'Aim' };
const fallback: Record<CursorRole, string> = { default: 'auto', point: 'pointer', press: 'pointer', text: 'text', grab: 'grab', grabbing: 'grabbing', help: 'help', copy: 'copy', crosshair: 'crosshair' };
let chosen: CursorRole = 'default', gameReady = false;
const options = () => normalizeCursorOptions({ style: style.value, color: color.value, idleMotion: motion.checked, idleDelaySec: Number(delay.value) });
style.innerHTML = Object.values(CURSOR_STYLES).map(s => `<option value="${s.id}">${s.label}</option>`).join('');
style.value = normalizeCursorOptions().style; color.value = normalizeCursorOptions().color;
for (const c of CURSOR_COLORS) {
  const b = document.createElement('button'); b.className = 'swatch'; b.title = c.label; b.setAttribute('aria-label', c.label); b.style.background = c.css;
  b.onclick = () => { color.value = c.css; refresh(); }; el('swatches').append(b);
}
for (const role of CURSOR_ROLE_LIST) {
  const b = document.createElement('button'); b.className = 'card'; b.dataset.role = role;
  b.innerHTML = `<div class="art"><div class="zoom"><div class="sample"><img alt="${names[role]} enlarged"></div></div><div class="sample"><img alt="${names[role]} actual size"></div></div><span>${names[role]}</span>`;
  b.onclick = () => { chosen = role; refreshSelection(); }; roles.append(b);
  const sample = document.createElement('div'); sample.className = 'sample'; sample.dataset.role = role;
  const img = document.createElement('img'); img.alt = `${names[role]} on pale ground`; sample.append(img); el('pale').append(sample);
}
function refreshSelection(): void {
  stage.style.cursor = `var(--cursor-${chosen}, ${fallback[chosen]})`;
  el('state-title').textContent = names[chosen];
  roles.querySelectorAll<HTMLButtonElement>('button').forEach(b => { b.classList.toggle('selected', b.dataset.role === chosen); b.setAttribute('aria-pressed', String(b.dataset.role === chosen)); });
}
function updateArt(): void {
  const root = document.documentElement;
  for (const role of CURSOR_ROLE_LIST) {
    const css = root.style.getPropertyValue(`--cursor-${role}`);
    const url = /url\(["']?([^"')]+)/.exec(css)?.[1] ?? '';
    const hotspot = /\)\s+(\d+)\s+(\d+)/.exec(css);
    document.querySelectorAll<HTMLImageElement>(`[data-role="${role}"] img`).forEach(img => {
      img.hidden = !url; if (url && img.getAttribute('src') !== url) img.src = url;
      if (hotspot) { img.style.left = `${18 - Number(hotspot[1])}px`; img.style.top = `${18 - Number(hotspot[2])}px`; }
    });
  }
  const opts = options();
  el('motion-status').textContent = opts.style === 'system' ? 'Native system cursors' : !CURSOR_STYLES[opts.style].idle ? 'Static style' : matchMedia('(prefers-reduced-motion: reduce)').matches ? 'Motion paused by reduced-motion preference' : !opts.idleMotion ? 'Idle motion disabled' : 'Rest for ' + opts.idleDelaySec + ' seconds to see ' + (CURSOR_STYLES[opts.style].idle?.kind === 'filaments' ? 'the filaments drift' : 'the cursor gently oscillate');
}
function syncGame(): void {
  if (!gameReady) return;
  const win = frame.contentWindow as Window & { __game: { settings: () => { cursor: ReturnType<typeof options> } }; __applyCursor: typeof applyCursor };
  win.__game.settings().cursor = options(); win.__applyCursor(options());
}
function refresh(): void { applyCursor(options()); refreshSelection(); updateArt(); syncGame(); }
for (const c of [style, color, motion, delay]) c.addEventListener('change', refresh);
refresh();
// The gallery reflects the actual published native frames, including OS motion preferences.
setInterval(updateArt, 140);
const drag = el('drag');
drag.addEventListener('pointerdown', e => { drag.setPointerCapture(e.pointerId); drag.style.cursor = 'var(--cursor-grabbing, grabbing)'; drag.textContent = 'Vessel held'; });
const release = () => { drag.style.cursor = ''; drag.textContent = 'Drag vessel'; };
drag.addEventListener('pointerup', release); drag.addEventListener('lostpointercapture', release);

el('game-toggle').onclick = async () => {
  frame.style.display = frame.style.display === 'block' ? 'none' : 'block';
  if (frame.srcdoc) return;
  el('game-toggle').textContent = 'Loading disposable game…';
  const isolation = `<script>{const memory=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k),clear:()=>memory.clear(),key:i=>[...memory.keys()][i]??null,get length(){return memory.size}}});const fetchReal=window.fetch.bind(window);const isSave=u=>new URL(typeof u==='string'?u:u instanceof URL?u.href:u.url,document.baseURI).pathname.startsWith('/__save');window.fetch=(u,o)=>isSave(u)?Promise.resolve(new Response(null,{status:404})):fetchReal(u,o);const beacon=navigator.sendBeacon.bind(navigator);navigator.sendBeacon=(u,b)=>isSave(u)?true:beacon(u,b);}<\/script><script type="module">import {applyCursor} from '/src/core/cursor.ts';window.__applyCursor=applyCursor;<\/script>`;
  try {
    const html = await (await fetch('/index.html')).text();
    frame.srcdoc = html.replace('<head>', '<head><base href="/">' + isolation);
    const started = performance.now();
    const boot = setInterval(() => {
      const win = frame.contentWindow as any;
      if (performance.now() - started > 60000) { clearInterval(boot); el('game-toggle').textContent = 'Game load timed out — reload preview'; return; }
      if (!win.__game || !win.__applyCursor) return;
      clearInterval(boot); gameReady = true; syncGame();
      win.__game.account().ledger.prologue_lived = 1;
      win.__game.devStartRun('warrior'); win.__game.world().screenFade = 0; win.__game.ui.hideAll();
      el('game-toggle').textContent = 'Show / hide game';
    }, 250);
  } catch (error) { el('game-toggle').textContent = String(error); }
};

el('verify').onclick = async () => {
  const result: string[] = [];
  const check = (ok: boolean, label: string) => { result.push(`${ok ? 'PASS' : 'FAIL'} · ${label}`); el('qa').textContent = result.join('\n'); };
  const saved = options();
  check(['wake', 'sigil', 'talon', 'system'].every(id => CURSOR_STYLES[id]), 'All original styles retained');
  check(normalizeCursorOptions({ style: 'removed', color: 'bad', idleDelaySec: NaN }).idleDelaySec === CURSOR_MOTION_CFG.delaySec && normalizeCursorOptions({ style: 'toString' }).style === 'wisp', 'Invalid and removed options fall back safely');
  check(normalizeCursorOptions().style === 'wisp' && normalizeCursorOptions({ style: 'wake' }).style === 'wake', 'New players begin with Wisp; existing choices are retained');
  const custom = normalizeCursorOptions({ style: 'talon', color: '#12ab34', idleMotion: false, idleDelaySec: 99 });
  check(custom.style === 'talon' && custom.color === '#12ab34' && custom.idleMotion === false && custom.idleDelaySec === 10, 'Custom tint, motion opt-out, and delay limits');
  const load = (css: string) => new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = /url\(["']?([^"')]+)/.exec(css)![1]; });
  try {
    let heartStable = true, distinct = new Set<string>();
    for (const role of CURSOR_ROLE_LIST) {
      const css = cursorRoleCss('wisp', saved.color, role); distinct.add(css);
      for (const phase of [0, 6, 18]) {
        const image = await load(cursorRoleCss('wisp', saved.color, role, phase));
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32;
        const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0);
        const pixel = ctx.getImageData(10, 10, 1, 1).data;
        heartStable &&= image.width === 32 && pixel[0] > 220 && pixel[3] === 255;
      }
    }
    check(distinct.size === CURSOR_ROLE_LIST.length, 'All nine role states have distinct artwork');
    check(heartStable, 'Hotspot stays opaque and fixed in every role and idle phase');
    let oscillates = true, holds = true, padded = true;
    for (const id of ['wake', 'sigil', 'talon', 'glimmer']) {
      for (const role of CURSOR_ROLE_LIST) {
        const rest = cursorRoleCss(id, saved.color, role, 0);
        const right = cursorRoleCss(id, saved.color, role, 6);
        const left = cursorRoleCss(id, saved.color, role, 18);
        if (role === 'press' || role === 'grabbing') { holds &&= rest === right && rest === left; continue; }
        oscillates &&= right !== left && rest !== right;
        const a = await load(rest), b = await load(right);
        const ah = /\)\s+(\d+)\s+(\d+)/.exec(rest)!, bh = /\)\s+(\d+)\s+(\d+)/.exec(right)!;
        const padding = (b.width - a.width) / 2;
        padded &&= b.width <= 48 && Number(bh[1]) - Number(ah[1]) === padding && Number(bh[2]) - Number(ah[2]) === padding;
      }
    }
    check(oscillates, 'Wake, Sigil, Talon and Glimmer rock in both directions');
    check(holds, 'Pressed and held roles stay steady in every style');
    check(padded, 'Oscillation headroom preserves every role’s click coordinates');
    applyCursor({ ...saved, style: 'system' });
    check(!document.documentElement.classList.contains('cursor-themed') && !document.body.style.cursor && !document.documentElement.style.getPropertyValue('--cursor-point'), 'System opt-out removes themed cursors');
    applyCursor(saved);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) result.push('SKIP · Idle timing (system reduced-motion enabled)');
    else {
      const seen: number[] = [];
      const stop = startCursorMotion({ delaySec: 0.05, periodSec: 0.2, frames: 8 }, f => seen.push(f));
      const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
      document.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', buttons: 0 }));
      await wait(110); check(seen.some(f => f > 0), 'Idle begins after inactivity');
      document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', buttons: 1 }));
      const n = seen.length; await wait(100); check(seen.length === n && seen.at(-1) === 0, 'Press stops motion and holds the resting frame');
      document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', buttons: 0 }));
      await wait(100); const before = seen.length; stop(); const after = seen.length; await wait(90);
      check(before > n && seen.length === after, 'Release rearms; disposal cancels animation');
    }
  } catch (error) { check(false, String(error)); }
  applyCursor(saved); el('qa').textContent = result.join('\n');
};
