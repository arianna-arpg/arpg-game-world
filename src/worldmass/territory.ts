import type { Actor } from '../engine/actor';

/** Saved encounter ownership, folded below the body's native chase policy. */
export interface MassTerritory { source: string; radius: number }
export function validateMassTerritory(spec: MassTerritory): void {
  if (!spec || typeof spec.source !== 'string' || !spec.source || spec.source.length > 256
    || !Number.isFinite(spec.radius) || spec.radius < 128 || spec.radius > 4096)
    throw Error('Invalid worldmass territory');
}
export function applyMassTerritory(actor: Actor, spec: MassTerritory | undefined): void {
  if (spec) actor.aiTerritory = { ...spec, heal: false };
}
