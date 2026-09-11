import { ITEM_BASES } from '../data/itembases';
import { MEMORY_KINDS } from '../engine/memories';

type Point = readonly [number, number];
interface GroundSymbol {
  polygons?: readonly (readonly Point[])[];
  rings?: readonly (readonly [number, number, number])[];
}

/** Low-detail silhouettes in a unit square. New equipment categories can
 *  supply a symbol here without changing the painter or inventory artwork. */
export const GROUND_ITEM_SYMBOLS: Record<string, GroundSymbol> = {
  helmet: { polygons: [[[-.9,.6],[-.9,-.15],[-.55,-.85],[.55,-.85],[.9,-.15],[.9,.6],[.4,.6],[.4,.05],[-.4,.05],[-.4,.6]]] },
  chest: { polygons: [[[-.45,-.9],[-.2,-.6],[.2,-.6],[.45,-.9],[.95,-.4],[.6,0],[.45,-.2],[.5,.9],[-.5,.9],[-.45,-.2],[-.6,0],[-.95,-.4]]] },
  legs: { polygons: [[[-.65,-.9],[.65,-.9],[.8,.9],[.2,.9],[0,0],[-.2,.9],[-.8,.9]]] },
  gloves: { polygons: [[[-.7,.85],[-.7,-.7],[-.1,-.9],[.2,-.65],[.2,-.15],[.65,-.4],[.85,-.1],[.4,.6],[.2,.85]]] },
  boots: { polygons: [[[-.6,-.9],[.3,-.9],[.3,.25],[.85,.5],[.9,.85],[-.65,.85]]] },
  belt: { polygons: [[[-1,-.35],[1,-.35],[1,.35],[-1,.35]]], rings: [[0,0,.38]] },
  ring: { rings: [[0,.15,.6]], polygons: [[[-.3,-.6],[0,-.95],[.3,-.6],[0,-.3]]] },
  amulet: { rings: [[0,-.25,.6]], polygons: [[[0,.05],[.4,.5],[0,.95],[-.4,.5]]] },
  weapon: { polygons: [[[.2,-.95],[.6,-.95],[.6,-.55],[-.1,.25],[.3,.6],[.05,.8],[-.3,.5],[-.7,.95],[-.9,.75],[-.5,.3],[-.8,0],[-.6,-.2],[-.25,.05]]] },
  offhand: { polygons: [[[-.8,-.8],[.8,-.8],[.65,.35],[0,.95],[-.65,.35]]] },
  quiver: { polygons: [[[-.5,-.3],[.5,-.3],[.35,.9],[-.35,.9]],[[-.35,-.95],[-.15,-.95],[-.15,-.3],[-.35,-.3]],[[.1,-.8],[.3,-.8],[.3,-.3],[.1,-.3]]] },
  gem: { polygons: [[[0,-1],[.8,0],[0,1],[-.8,0]]] },
};

/** Symbol only: rarity tints the silhouette; no inventory tile or badge. */
export function drawGroundItem(ctx: CanvasRenderingContext2D, baseId: string, radius: number,
  color: string, edgeColor: string, edgeWidth: number): void {
  const memory = Object.values(MEMORY_KINDS).find(k => k.base === baseId);
  ctx.fillStyle = color;
  if (memory) {
    ctx.font = `bold ${radius * 2}px Verdana`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(memory.glyph, 0, 0);
    return;
  }
  const symbol = GROUND_ITEM_SYMBOLS[ITEM_BASES[baseId]?.category ?? ''] ?? GROUND_ITEM_SYMBOLS.gem;
  ctx.strokeStyle = edgeColor; ctx.lineWidth = edgeWidth; ctx.lineJoin = 'round';
  for (const points of symbol.polygons ?? []) {
    ctx.beginPath();
    points.forEach(([x,y], i) => i ? ctx.lineTo(x * radius, y * radius) : ctx.moveTo(x * radius, y * radius));
    ctx.closePath(); ctx.stroke(); ctx.fill();
  }
  ctx.strokeStyle = color;
  for (const [x,y,r] of symbol.rings ?? []) {
    ctx.beginPath(); ctx.arc(x * radius, y * radius, r * radius, 0, Math.PI * 2); ctx.stroke();
  }
}
