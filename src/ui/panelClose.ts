import { esc } from './dom';

/** Shared close corner for player panels, services, settings and dialogue. */
export function panelCloseHtml(title = 'Close (Esc)'): string {
  return `<div class="panel-x-row"><button type="button" class="panel-x" data-panel-x title="${esc(title)}" aria-label="Close">✕</button></div>`;
}
