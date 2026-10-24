/** Presentation only: every anchor is already known to the player's map. */
export const MASS_MAP_LABELS = {
  enabled: true, fontSize: 10, maxWidth: 168, height: 18, inset: 6,
  gap: 9, step: 22, rings: 4, maxLabels: 32,
  ink: '#eee0bc', paper: '#101717', leader: '#ad9b77',
};
export interface MapBox { x: number; y: number; w: number; h: number }
export interface MassMapLabel { id: string; name: string; x: number; y: number; priority: number }
export interface PlacedMapLabel extends MapBox { id: string; text: string; anchor: { x: number; y: number } }
const overlaps = (a: MapBox, b: MapBox): boolean =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Bounded candidate search. Labels never move their actual place marker,
 * overlap another label/marker, or escape the chart. Dense overflow keeps its
 * marker and the full accessible place index rather than drawing unreadable text. */
export function placeMassMapLabels(labels: readonly MassMapLabel[], markers: readonly MapBox[],
  bounds: MapBox, measure: (text: string) => number): PlacedMapLabel[] {
  const cfg = MASS_MAP_LABELS, placed: PlacedMapLabel[] = [];
  if (!cfg.enabled) return placed;
  const room = Math.min(cfg.maxWidth, bounds.w - cfg.inset * 2);
  if (room < cfg.fontSize || bounds.h < cfg.height) return placed;
  for (const row of [...labels].sort((a,b) => b.priority-a.priority || a.id.localeCompare(b.id)).slice(0,cfg.maxLabels)) {
    let text = row.name;
    if (measure(text) > room - cfg.inset * 2) {
      while (text.length && measure(text + '…') > room - cfg.inset * 2) text = text.slice(0,-1);
      text += '…';
    }
    const w = Math.min(room, measure(text) + cfg.inset * 2), h = cfg.height;
    const offsets = [0];
    for (let i=1;i<=cfg.rings;i++) offsets.push(-i*cfg.step,i*cfg.step);
    let chosen: MapBox | undefined;
    for (const offset of offsets) {
      for (const side of [1,-1]) {
        const box={x:row.x+(side===1?cfg.gap:-cfg.gap-w), y:row.y-h/2+offset,w,h};
        if (box.x<bounds.x || box.y<bounds.y || box.x+w>bounds.x+bounds.w || box.y+h>bounds.y+bounds.h
          || markers.some(m=>overlaps(box,m)) || placed.some(p=>overlaps(box,p))) continue;
        chosen=box;break;
      }
      if (chosen) break;
    }
    if (chosen) placed.push({...chosen,id:row.id,text,anchor:{x:row.x,y:row.y}});
  }
  return placed;
}
