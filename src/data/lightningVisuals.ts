/** Lightning trails describe travelled space only; no target or damage data. */
export const LIGHTNING_VISUALS: Readonly<Record<string, { forks: number; jag: number; bone?: boolean }>> = {
  lightning_bolt: { forks: 2, jag: .65 },
  chain_lightning: { forks: 4, jag: 1 },
  skeletal_lightning_bolt: { forks: 2, jag: .85, bone: true },
  skeletal_chain_lightning: { forks: 3, jag: 1.2, bone: true },
};
export const LIGHTNING_STYLE = { tailSeconds: .28, fadeSeconds: .16, maxPoints: 24, maxTraces: 48, maxSegments: 80 };
export function lightningProfile(id: string) { return Object.hasOwn(LIGHTNING_VISUALS, id) ? LIGHTNING_VISUALS[id] : undefined; }
