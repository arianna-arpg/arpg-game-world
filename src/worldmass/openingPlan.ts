import './nativeBootstrap';
import { validateWildernessPaths } from './wildernessPaths';
import { MassNativeCountry } from './nativeCountry';
import { address, moveAddress, floorDiv } from './address';
import { massAdventure } from './preset';
import { reserveMassOpening } from './patchReservations';
import { MassGenerator, makeMassRun } from './generator';
import { chooseMassOrigin } from './origin';
import type { OpeningRequest } from './openingPreparation';

export function planMassOpening(request: OpeningRequest) {
  const { seed, runId, config: saved, origin: savedOrigin } = request;
  const config = saved ?? reserveMassOpening(seed, runId, massAdventure());
  if (!Number.isSafeInteger(config.pageRadius) || config.pageRadius < 1 || config.pageRadius > 4
    || (config.pageRadius * 2 + 1) ** 2 * config.terrain.addressSpan ** 2 > 33554432)
    throw Error('World opening page budget exceeded');
  const generator = new MassGenerator(makeMassRun(seed, runId, config.terrain), config.terrain);
  if (config.wildernessPaths) validateWildernessPaths(config.wildernessPaths, generator);
  const origin = savedOrigin ?? chooseMassOrigin(generator, config.settlement?.location).origin;
  const point = request.position ?? { x: 800, y: 800 }, span = config.terrain.addressSpan;
  const center = address(origin.dimension, origin.cx, origin.cy, point.x, point.y, span);
  // Natural terrain reservations are pure. Warming their exact country queries
  // does not admit any live feature; settlement/journey/quest ownership is still
  // checked by the real runtime when it uses these derived memo tables.
  const country = config.nativeCountry && new MassNativeCountry(generator, config.nativeCountry,
    (at, radius) => !!(generator.nativeRegional?.reserves(at, radius) || generator.patches?.reserves(at, radius) || generator.landforms?.reserves(at, radius)));
  // Paths may inspect destinations anywhere in the intersecting districts,
  // well beyond the visible pages. Warm the natural reservations there too.
  if (country && config.wildernessPaths) {
    const district = config.wildernessPaths.district, cells = BigInt(district/span), districts = new Set<string>();
    for (let dy=-config.pageRadius;dy<=config.pageRadius;dy++) for (let dx=-config.pageRadius;dx<=config.pageRadius;dx++) {
      const cx = floorDiv(BigInt(center.cx)+BigInt(dx),cells)*cells, cy = floorDiv(BigInt(center.cy)+BigInt(dy),cells)*cells;
      const key = cx+','+cy; if (districts.has(key)) continue; districts.add(key);
      const base = address(center.dimension,cx.toString(),cy.toString(),0,0,span);
      for (let y=0;y<=district;y+=country.spec.spacing/2) for (let x=0;x<=district;x+=country.spec.spacing/2)
        country.near(moveAddress(base,{x,y},span),country.spec.spacing/2);
    }
  }
  for (const y of [-span * 2, 0, span * 2]) for (const x of [-span * 2, 0, span * 2]) {
    const at = moveAddress(center, { x, y }, span);
    country?.near(at, country.spec.spacing / 2);
    generator.regionalPlacesInCell(at); generator.terrainAt(at);
  }
  return { seed, runId, config, origin, run: generator.run, terrainCache: generator.openingCache() };
}
