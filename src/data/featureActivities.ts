import { registerFeatureCycle } from '../world/featureActivity';
import { registerWeather } from '../world/weather';

registerWeather('volcanic_eruption', {
  label: 'Volcanic eruption', eventOnly: true, color: '#cf6336', radiance: { mul: 0.6 },
  wind: 0.4, countMul: 1, factionMul: {},
  dress: { plantAbove: 0.12, fadeBelow: 0.05, evapRate: 4,
    rows: [{ doodad: 'lava', count: [1, 2], radius: [36, 55], minGap: 200,
      trail: { pieces: 8, step: 0.85, turn: 0.3 } }] },
});
registerFeatureCycle({ id: 'volcanism', phases: [
  { id: 'dormant', label: 'Dormant', seconds: 480, color: '#b7a698' },
  { id: 'unrest', label: 'Rumbling — eruption approaching', seconds: 45, color: '#b89362',
    weather: { kind: 'ashfall', radius: 280, intensity: 0.65 } },
  { id: 'erupting', label: 'Erupting', seconds: 100, color: '#d57948',
    weather: { kind: 'ashfall', radius: 640, intensity: 0.95 },
    core: { kind: 'volcanic_eruption', radius: 230, intensity: 1 },
    flows: { count: 3, reach: 230, width: 14, color: '#f78239' } },
  { id: 'cooling', label: 'Cooling — lingering ash', seconds: 150, color: '#9c897a',
    weather: { kind: 'ashfall', radius: 480, intensity: 0.55 } },
] });
