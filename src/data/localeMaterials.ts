// Shared native locale materials, including cold NativeRegional workers.
// Keep the original collision, water effects and rendering rows in one place.
import { registerRegion, regionKind } from '../world/regions';

registerRegion({ ...regionKind('water')!, id: 'locale_river', label: 'the river',
  visual: { fill: '#285b72', alpha: 0.88 } });
registerRegion({ id: 'locale_bridge', label: 'the crossing', walkable: true, blocks: false,
  laid: 'built', pathCost: 1, visual: { fill: '#9c8969', alpha: 0.95 } });
