/** Lightning trails describe travelled space only; no target or damage data. */
export const LIGHTNING_VISUALS: Readonly<Record<string, { forks: number; jag: number; head: 'lance' | 'fork'; bone?: boolean }>> = {
  lightning_bolt: { forks: 2, jag: .65, head: 'lance' },
  chain_lightning: { forks: 4, jag: 1, head: 'fork' },
  skeletal_lightning_bolt: { forks: 2, jag: .85, head: 'lance', bone: true },
  skeletal_chain_lightning: { forks: 3, jag: 1.2, head: 'fork', bone: true },
};
export const LIGHTNING_STYLE = { tailSeconds: .28, fadeSeconds: .16, maxPoints: 24, maxTraces: 48, maxSegments: 80 };
/** Point-to-point discharges use the two positions sampled on the pulse. */
export const ORB_DISCHARGES = {
  filament: { path: 'zigzag', steps: 6, width: 3.5 },
  coil: { path: 'braid', steps: 12, width: 3 },
  ember: { path: 'beads', steps: 6, width: 3 },
  quartz: { path: 'facets', steps: 5, width: 4 },
} as const;
export type OrbDischarge = keyof typeof ORB_DISCHARGES;
export const ORB_DISCHARGE_STYLE = { seconds: .15, perPulse: 4, maxActive: 48 };
export function lightningProfile(id: string) { return Object.hasOwn(LIGHTNING_VISUALS, id) ? LIGHTNING_VISUALS[id] : undefined; }
