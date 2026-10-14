import { runtimeErrorReport } from '../core/runtimeDiagnostics';
import { Z_LADDER } from './zorder';

/** Parent-owned controls work even when the opaque crossing cannot use a
 * clipboard or downloads. The report is local; export requires a player click. */
export function mountRuntimeErrorReport(): HTMLElement {
  const root = document.createElement('div');
  root.id = 'loading-error-report';
  root.style.cssText = `position:fixed;right:24px;top:20px;z-index:${Z_LADDER.error};font:13px system-ui;color:#e4e7e5;max-width:calc(100vw - 48px)`;
  const open = document.createElement('button'); open.textContent = 'Error details';
  root.append(open);
  const panel = document.createElement('section'); panel.hidden = true;
  panel.setAttribute('aria-label', 'Error report');
  panel.style.cssText = 'background:#101c24;border:1px solid #69877f;padding:16px;width:620px;max-width:100%;box-sizing:border-box';
  const title = document.createElement('p'); title.textContent = 'The game could not load this area. This report is stored locally and includes the cause and recent errors.';
  const area = document.createElement('textarea'); area.readOnly = true; area.setAttribute('aria-label', 'Error report details');
  area.style.cssText = 'display:block;width:100%;height:45vh;box-sizing:border-box;background:#071018;color:#d9e9e3;font:11px monospace;user-select:text';
  const controls = document.createElement('div'); controls.style.cssText = 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap';
  const button = (label: string, action: () => void) => {
    const b = document.createElement('button'); b.textContent = label; b.onclick = action;
    b.style.cssText = 'background:#17282c;color:#dfebe3;border:1px solid #69877f;padding:8px 12px;cursor:pointer';
    controls.append(b); return b;
  };
  const copy = button('Copy report', () => {
    const fallback = () => { area.focus(); area.select(); copy.textContent = 'Press Ctrl+C to copy'; };
    try {
      if (!navigator.clipboard?.writeText) { fallback(); return; }
      void navigator.clipboard.writeText(area.value).then(() => { copy.textContent = 'Copied'; }, fallback);
    } catch { fallback(); }
  });
  button('Download report', () => {
    const url = URL.createObjectURL(new Blob([area.value], {type:'application/json'}));
    const a = document.createElement('a'); a.href = url; a.download = 'hollow-wake-error-report.json';
    root.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  button('Close details', () => { panel.hidden = true; open.hidden = false; open.focus(); });
  panel.append(title, area, controls); root.append(panel);
  open.onclick = () => { area.value = runtimeErrorReport(); panel.hidden = false; open.hidden = true; copy.focus(); };
  document.body.append(root);
  return root;
}
