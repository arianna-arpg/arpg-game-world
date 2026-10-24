import type { Bounds } from '../world/shape';
import { GridWalkField } from '../world/gridWalk';
import { LIQUID_CFG, regionKind } from '../world/regions';
import { blocksMovement, blocksProjectiles, blocksSightOf, doodadRuleOf, hitSurfaceOf,
  type GeneratedLayout } from '../engine/levelgen';
import { copyNativeAreaData, createNativeAreaGeometry, type NativeAreaGeometrySource } from './nativeAreaGeometry';

/** Live source seam, called after native generation has finished. Every output
 * survives; unknown walk implementations refuse instead of becoming rectangles.
 * Resolved physical facts travel with the generated source, so readers/workers
 * do not consult changing region/doodad registries. Full mechanic admission is
 * the whole-area compiler's separate responsibility. */
export function captureNativeAreaGeometry(input: { sourceIdentity: string; bounds: Bounds; layout: GeneratedLayout }): NativeAreaGeometrySource {
  const { walk, ...data } = input.layout;
  if (walk !== undefined && !(walk instanceof GridWalkField)) throw Error('Unsupported native area WalkField');
  const layout = copyNativeAreaData(data);
  const packed = walk?.pack();
  const kinds = new Set(['ground', 'wall', 'water', ...(packed?.kinds ?? []), ...layout.doodads.map(d => d.kind)]);
  const materials = [...kinds].flatMap(id => {
    const r = regionKind(id); if (!r) { if (packed?.kinds.includes(id)) throw Error('Unregistered native grid region: ' + id); return []; }
    return [{ id, walkable: r.walkable, laid: r.laid, severity: r.severity, overruns: r.overruns, deep: !!r.standStatusDeep }];
  });
  const bodies = layout.doodads.map((d, index) => ({ index,
    move: hitSurfaceOf(d, 'move'), shot: hitSurfaceOf(d, 'shot'), sight: hitSurfaceOf(d, 'sight'),
    blocksMove: blocksMovement(d), blocksShot: blocksProjectiles(d), blocksSight: blocksSightOf(d), bridge: !!doodadRuleOf(d.kind).spans,
  }));
  const source: NativeAreaGeometrySource = {
    schema: 1, algorithm: 'native-area-geometry-v1', sourceIdentity: input.sourceIdentity,
    bounds: input.bounds, layout, walk: packed ? { kind: 'grid', packed } : { kind: 'analytic' },
    bodies, materials, deepInset: LIQUID_CFG.deepInset,
  };
  return createNativeAreaGeometry(source).source;
}
