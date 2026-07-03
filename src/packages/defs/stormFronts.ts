// ---------------------------------------------------------------------------
// STORM FRONTS — the weather feature, as a package.
//
// Drifting fronts (rain, storm, fog, ashfall, blood moon) are a baseline ambient
// feature, on from the first run (startLevel 0). Its pressure scales the rate at
// which new fronts spawn, so weighting it down makes for a calmer sky and up for
// a tempest-wracked world. No new mechanic — it routes pressure into the shared
// WeatherField via the `weather` world hook.
// ---------------------------------------------------------------------------

import type { ContentPackage } from '../types';

export const STORM_FRONTS: ContentPackage = {
  id: 'storm_fronts',
  label: 'Storm Fronts',
  blurb: 'Rain, storm, fog and blood-moon fronts drift the world, stirring what lurks beneath.',
  color: '#5aa0d8',
  cost: 60,
  unlock: {
    id: 'storm_fronts_unlock',
    label: 'Reach account level 1',
    test: (ctx) => ctx.account.level >= 1,
  },
  modifiers: [
    { id: 'storm_start', kind: 'startLevel', label: 'Storms begin at level', min: 0, max: 101, step: 1, defaultValue: 0 },
    { id: 'storm_weight', kind: 'weight', label: 'Storm frequency', min: 0, max: 100, step: 5, defaultValue: 50 },
  ],
  defaultWeight: 50,
  defaultStartLevel: 0,
  defaultEnabled: true,
  world: { weather: true },
};
