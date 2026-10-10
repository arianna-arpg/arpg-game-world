/** Original native arena inference, including dormant annex pieces. */
import type {ZoneDef} from '../data/zones';
import type {Bounds} from '../world/shape';
export function makeNativeAreaArena(def: ZoneDef): Bounds {
  let shape = def.shape;
  if (!shape) {
    if (def.objective.kind === 'safe' || def.fixtures) shape = 'rect';
    else {
      let h = 2166136261;
      for (let i = 0; i < def.id.length; i++) h = ((h ^ def.id.charCodeAt(i)) * 16777619) >>> 0;
      shape = (h % 100) < 25 ? 'ellipse' : 'rect';
    }
  }
  const b: Bounds = { w: def.size.w, h: def.size.h, shape, boundless: !!def.boundless };
  // THE COMPOSITE BOUND: authored annex rows mint as live pieces, ALL DORMANT
  // — generation, entry seats and every boot consumer see the classic base
  // arena; zone memory's revealed set re-opens survivors AFTER the layout
  // stands (loadZone, beside the hollows revive). Fresh objects per mint so
  // a runtime flip never writes into the def's authored rows.
  if (def.annexes?.length) b.pieces = def.annexes.map(r => ({ ...r, active: false }));
  return b;
}
