// ---------------------------------------------------------------------------
// THE CRASH OVERLAY — the DOM face of the crash trap. src/main.ts owns the
// handlers (window.onerror / onunhandledrejection / the rAF-loop catch) and
// calls showErrorOverlay on the FIRST fatal; this file only draws and copies.
// It deliberately imports nothing from the engine — a crashed frame must not
// be asked to help describe itself.
//
// LAWS:
//  - Never auto-dismissed. A crash is a stop, not a toast.
//  - RESTART, not return-to-menu: the save stand-down (meta/persistence.ts
//    suppressSaves) is page-lifetime — after a fatal, nothing persists until
//    a restart rebuilds clean module state. A "return to menu" that let the
//    player start a run which would silently never save is a trap, so the
//    one action offered is the honest one: reload (the same restart
//    resetAccount already trusts). The quit-flush save that reload fires is
//    itself refused by the latch — the broken frame cannot ride out the door.
//  - COPY DETAILS reads the LIVE ring (window.__bootErrors — the early trap
//    in index.html and the game trap in main.ts share it), so errors that
//    landed after the overlay rose still make the report. The desktop build's
//    version rides the Electron user-agent string in the identity block.
// ---------------------------------------------------------------------------

import { GAME_TITLE } from '../config';
import { Z_LADDER } from './zorder'; // dependency-free constants — safe for a crashed frame

/** One captured error — the shape both traps push into window.__bootErrors. */
export interface CrashEntry {
  t: number;
  kind: string;
  msg: string;
  stack?: string;
}

let shown = false;

/** Is the overlay up? (The negative control reads this through __game.) */
export function errorOverlayShown(): boolean { return shown; }

function detailsText(fatal: CrashEntry, ring: readonly CrashEntry[]): string {
  const lines = [
    `${GAME_TITLE} — crash report`,
    `when:  ${new Date().toISOString()}`,
    `url:   ${location.href}`,
    // In the desktop build the Electron UA carries the app name/version —
    // the launcher injects nothing into the page, so this IS the build id.
    `agent: ${navigator.userAgent}`,
    '',
    `FATAL ${fatal.kind}: ${fatal.msg}`,
    fatal.stack || '(no stack)',
    '',
    `--- captured errors (oldest first, cap 20) ---`,
  ];
  for (const e of ring) {
    lines.push(`[${new Date(e.t).toISOString()}] ${e.kind}: ${e.msg}`);
    if (e.stack) lines.push(e.stack);
  }
  return lines.join('\n');
}

/** Copy via the async clipboard, falling back to a select+execCommand
 *  textarea; if even that refuses, the textarea stays visible and selected
 *  so the player can copy by hand. Reports success back for button feedback. */
function copyDetails(text: string, host: HTMLElement, done: (ok: boolean) => void): void {
  const fallback = (): void => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:absolute;left:-9999px;top:0;';
    host.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    if (ok) { ta.remove(); done(true); return; }
    // Manual last resort: park the textarea visibly, selected, in the panel.
    ta.style.cssText = 'width:100%;height:90px;margin-top:8px;background:#14141c;'
      + 'color:#d8d4c8;border:1px solid var(--panel-border);font-size:11px;user-select:text;';
    ta.select();
    done(false);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => done(true), fallback);
  } else {
    fallback();
  }
}

/** Raise the crash overlay (idempotent — the first fatal owns the screen; the
 *  ring keeps collecting behind it either way). `ring` is held by reference so
 *  Copy Details always reports the current state. */
export function showErrorOverlay(fatal: CrashEntry, ring: readonly CrashEntry[]): void {
  if (shown) return;
  shown = true;

  const wrap = document.createElement('div');
  wrap.id = 'crash-overlay';
  wrap.style.cssText = `position:fixed;inset:0;z-index:${Z_LADDER.error};background:rgba(5,5,8,0.88);`
    + 'display:flex;align-items:center;justify-content:center;';

  const panel = document.createElement('div');
  panel.className = 'panel'; // the shared panel skin (index.html)
  panel.style.cssText = 'position:relative;width:min(680px,92vw);max-height:86vh;'
    + 'display:flex;flex-direction:column;user-select:text;-webkit-user-select:text;';
  panel.innerHTML = `
    <h2 style="color:#c03030;border-bottom-color:#5a2a2a;">The run hit an error</h2>
    <p id="crash-msg" style="margin:0 0 8px;font-size:13px;color:#fff;"></p>
    <pre id="crash-stack" style="flex:1 1 auto;min-height:60px;overflow:auto;margin:0;
      background:#0c0c12;border:1px solid var(--panel-border);border-radius:4px;
      padding:8px;font-size:11px;line-height:1.45;color:#a8a498;white-space:pre-wrap;"></pre>
    <p style="margin:10px 0 0;font-size:12px;color:var(--text-dim);">
      Saving stood down the moment this happened, so the error cannot overwrite your
      last good save. Restart the game to pick the run back up from it — Copy Details
      first if you want to report what broke.
    </p>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:12px;">
      <button id="crash-copy"></button>
      <button id="crash-restart"></button>
    </div>
    <style>
      #crash-overlay button {
        background: linear-gradient(180deg, #30304a, #232338);
        color: var(--gold); border: 1px solid var(--gold); border-radius: 5px;
        font-size: 14px; font-family: inherit; cursor: var(--cursor-point, pointer); padding: 8px 24px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.45);
      }
      #crash-overlay button:hover { background: linear-gradient(180deg, #3d3d5c, #2b2b46); }
    </style>`;

  (panel.querySelector('#crash-msg') as HTMLElement).textContent
    = `${fatal.kind}: ${fatal.msg}`;
  (panel.querySelector('#crash-stack') as HTMLElement).textContent
    = fatal.stack || '(no stack captured)';

  const copyBtn = panel.querySelector('#crash-copy') as HTMLButtonElement;
  copyBtn.textContent = 'Copy Details';
  copyBtn.addEventListener('click', () => {
    copyDetails(detailsText(fatal, ring), panel, (ok) => {
      copyBtn.textContent = ok ? 'Copied ✓' : 'Copy failed — select above';
      window.setTimeout(() => { copyBtn.textContent = 'Copy Details'; }, 2000);
    });
  });

  const restartBtn = panel.querySelector('#crash-restart') as HTMLButtonElement;
  restartBtn.textContent = 'Restart Game';
  restartBtn.addEventListener('click', () => location.reload());

  wrap.appendChild(panel);
  (document.body ?? document.documentElement).appendChild(wrap);
}
