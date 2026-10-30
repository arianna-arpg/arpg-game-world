import type { WorldMassRuntime } from '../worldmass/runtime';
import { massRoadNotices } from '../worldmass/roadGuide';

const escape = (s: string): string => s.replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
/** Public directions offer choices without inventing map discovery or quests. */
export function roadGuideHtml(mass: WorldMassRuntime): string {
  const town = mass.settlement?.zone.name ?? 'home';
  const rows = massRoadNotices(mass);
  return '<section data-mass-road-guide><h2>Roads from ' + escape(town) + '</h2>'
    + '<p style="color:#b6bbaa;font-size:12px;line-height:1.5">Local accounts of the roads beyond town. Choose a direction, or find your own way.</p>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px">'
    + rows.map(row => '<article data-mass-road="' + escape(row.id) + '" style="min-width:0;padding:14px;border:1px solid #4c503e;border-radius:4px;background:#1e251f;overflow-wrap:anywhere">'
      + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#b8c6a0">' + escape(row.departure) + ' road</div>'
      + '<h3 style="margin:6px 0;font-size:17px;color:#e2d3a9">' + escape(row.name) + '</h3>'
      + '<p style="margin:0;color:#c4c7b9;font-size:13px;line-height:1.6">' + escape(row.note) + '</p></article>').join('')
    + '</div><p style="color:#929b8c;font-size:11px;margin-top:16px">Your map fills as you travel. Road notes do not chart the country ahead.</p></section>';
}
