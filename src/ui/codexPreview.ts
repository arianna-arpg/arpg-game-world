import { CODEX_CFG } from '../data/codex';
import { SKILLS } from '../data/skills';
import type { CodexEntry } from '../meta/codex';
import { skillShowcaseMarkup } from '../showcase/host';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export interface CodexPreview {
  element: HTMLElement;
  updateHosts(hosts: string[]): void;
  dispose(): void;
}

/** One explicit, read-only demonstration. Controls survive playback and account refreshes.
 * The shared showcase owns simulation, visibility pausing and save isolation. */
export function mountCodexPreview(element: HTMLElement, entry: CodexEntry, hosts: string[],
  preferredHost: string, rememberHost: (id: string) => void): CodexPreview {
  const support = entry.source?.kind === 'support' ? entry.source.id : null;
  let host = hosts.includes(preferredHost) ? preferredHost : hosts[0] ?? '';
  let includeSupport = true, playing = false, disposed = false;
  let cleanup: (() => void) | undefined;
  const sorted = (ids: string[]): string[] => [...ids].sort((a, b) => SKILLS[a].name.localeCompare(SKILLS[b].name));
  const hostOptions = (ids: string[]): string => sorted(ids).map(id =>
    `<option value="${esc(id)}">${esc(SKILLS[id].name)}</option>`).join('');
  element.innerHTML = `<div class="cx-preview-title"><h3>Live demonstration</h3><span>Level ${CODEX_CFG.previewLevel}</span></div>
    ${support ? `<label class="cx-host-label">Demonstration skill<select data-cx-host aria-label="Demonstration skill"></select></label>
      <label class="cx-compare"><input type="checkbox" data-cx-support checked> Include ${esc(entry.title)}</label>` : ''}
    <div class="cx-preview-controls"><button data-cx-play aria-pressed="false">Play demonstration</button><button data-cx-replay disabled>Restart</button></div>
    <div class="cx-stage" data-cx-preview-state="idle"><div class="cx-stage-media"></div>
      <div class="cx-stage-message"><span aria-hidden="true">▷</span><p role="status">Press Play to see this skill in action.</p></div></div>
    <p class="cx-preview-note">${support ? 'Compare the same base skill with and without this support. Modified builds may allow further combinations.' : 'A live example from the current game. Your build may change how it plays.'}</p>`;
  const stage = element.querySelector<HTMLElement>('.cx-stage')!;
  const media = element.querySelector<HTMLElement>('.cx-stage-media')!;
  const message = element.querySelector<HTMLElement>('.cx-stage-message p')!;
  const play = element.querySelector<HTMLButtonElement>('[data-cx-play]')!;
  const replay = element.querySelector<HTMLButtonElement>('[data-cx-replay]')!;
  const select = element.querySelector<HTMLSelectElement>('[data-cx-host]');
  const compare = element.querySelector<HTMLInputElement>('[data-cx-support]');
  const available = (): boolean => !!(entry.preview || (support && host));
  const state = (value: string, text: string): void => {
    stage.dataset.cxPreviewState = value; message.textContent = text;
    const retry = value === 'delayed' || value === 'unavailable';
    play.textContent = retry ? 'Retry demonstration' : playing ? 'Stop demonstration' : 'Play demonstration';
    play.setAttribute('aria-pressed', String(playing && !retry));
    play.disabled = !available(); replay.disabled = !playing;
    stage.setAttribute('aria-busy', String(value === 'loading'));
  };
  const stop = (): void => {
    cleanup?.(); cleanup = undefined; playing = false; media.replaceChildren();
    state('idle', available() ? 'Press Play to see this skill in action.' : 'Discover a compatible skill to try this support.');
  };
  const start = (scroll = false): void => {
    if (disposed || !available()) return;
    cleanup?.(); playing = true;
    const spec = entry.preview ?? { skillId: host, supports: includeSupport && support ? [{ id: support }] : [] };
    media.innerHTML = skillShowcaseMarkup({ ...spec, level: CODEX_CFG.previewLevel });
    state('loading', 'Preparing demonstration…');
    const showcase = media.querySelector<HTMLElement>('.skill-showcase');
    const read = (): void => {
      if (!showcase || showcase.hasAttribute('data-showcase-empty')) state('unavailable', 'This demonstration is unavailable. You can retry or choose another entry.');
      else if (showcase.hasAttribute('data-showcase-ready')) state('ready', 'Demonstration playing.');
    };
    const observer = new MutationObserver(read);
    if (showcase) observer.observe(showcase, { attributes: true, attributeFilter: ['data-showcase-empty', 'data-showcase-ready'] });
    const timeout = window.setTimeout(() => {
      if (stage.dataset.cxPreviewState === 'loading') state('delayed', 'This is taking longer than expected. You can retry.');
    }, CODEX_CFG.previewWaitMs);
    cleanup = () => { clearTimeout(timeout); observer.disconnect(); };
    read();
    if (scroll) requestAnimationFrame(() => { if (!disposed) stage.scrollIntoView({ block: 'nearest' }); });
  };
  play.addEventListener('click', () => {
    if (playing && !['delayed', 'unavailable'].includes(stage.dataset.cxPreviewState!)) stop();
    else start(true);
  });
  replay.addEventListener('click', () => start(true));
  select?.addEventListener('change', () => { host = select.value; rememberHost(host); if (playing) start(true); else stop(); });
  compare?.addEventListener('change', () => { includeSupport = compare.checked; if (playing) start(true); });
  const updateHosts = (ids: string[]): void => {
    if (!select) return;
    const before = host;
    if (!ids.includes(host)) host = ids[0] ?? '';
    const markup = ids.length ? hostOptions(ids) : '<option value="">No compatible skill discovered yet</option>';
    if (select.innerHTML !== markup) select.innerHTML = markup;
    select.disabled = ids.length === 0; select.value = host;
    if (compare) compare.disabled = !host;
    rememberHost(host);
    if (playing && before !== host) { if (host) start(); else stop(); }
    else if (!playing) state('idle', available() ? 'Press Play to see this skill in action.' : 'Discover a compatible skill to try this support.');
  };
  updateHosts(hosts); stop();
  return { element, updateHosts, dispose: () => { disposed = true; stop(); element.remove(); } };
}
