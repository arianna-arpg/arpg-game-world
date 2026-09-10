import { localeProgram } from './locales';
import type { ZoneTheme, SkyExposure } from '../data/zones';

export interface ComplexStage {
  id: string; label: string; locale: string;
  /** Map-space displacement from the entrance; rotated together per instance. */
  offset: [number, number];
  theme?: Partial<ZoneTheme>;
  sky?: SkyExposure;
  levelDelta?: number;
}
export interface LandmarkComplex {
  id: string; version: number; label: string;
  entrance: string;
  stages: ComplexStage[];
  links: { from: string; to: string; fromAt?: [number, number]; toAt?: [number, number] }[];
}
/** Saved on every member; the map graph and locale plans are the durable content. */
export interface ComplexMembership {
  root: string; kind: string; version: number; label: string;
  stage: string; stageLabel: string;
}
const COMPLEXES: Record<string, LandmarkComplex> = {};
export const landmarkComplex = (id: string) => COMPLEXES[id];
export const landmarkComplexes = () => Object.values(COMPLEXES);
export function validateLandmarkComplex(def: LandmarkComplex): string[] {
  const errors: string[] = [], ids = new Set(def.stages.map(s => s.id));
  if (!def.id || !def.label || !Number.isInteger(def.version) || def.version < 1) errors.push('invalid identity/version');
  if (def.stages.length < 2 || def.stages.length > 8 || ids.size !== def.stages.length || !ids.has(def.entrance)) errors.push('invalid stage identities/budget');
  for (const s of def.stages) {
    if (!s.id || !s.label || !localeProgram(s.locale)) errors.push(`unknown locale or stage ${s.id}`);
    if (s.offset.length !== 2 || !s.offset.every(n => Number.isFinite(n) && Math.abs(n) <= 400)) errors.push(`invalid offset ${s.id}`);
    if (s.levelDelta !== undefined && (!Number.isInteger(s.levelDelta) || s.levelDelta < 0 || s.levelDelta > 5)) errors.push(`invalid level step ${s.id}`);
    if (s.id === def.entrance && s.offset.some(n => n !== 0)) errors.push('entrance must stand at the feature seat');
    if (def.links.filter(l => l.from === s.id || l.to === s.id).length > (s.id === def.entrance ? 2 : 4)) errors.push(`too many links ${s.id}`);
  }
  for (let a = 0; a < def.stages.length; a++) for (let b = a + 1; b < def.stages.length; b++) {
    const [ax, ay] = def.stages[a].offset, [bx, by] = def.stages[b].offset;
    if (Math.hypot(ax - bx, ay - by) < 48) errors.push('stages overlap on chart');
  }
  const links = new Set<string>();
  for (const l of def.links) {
    const key = [l.from, l.to].sort().join('/');
    if (!ids.has(l.from) || !ids.has(l.to) || l.from === l.to || links.has(key)) errors.push('invalid or duplicate link');
    if ([l.fromAt, l.toAt].some(p => p && (p.length !== 2 || !p.every(n => Number.isFinite(n) && n >= 0.08 && n <= 0.92)))) errors.push('invalid transition landing');
    links.add(key);
  }
  const reached = new Set([def.entrance]);
  for (let i = 0; i < ids.size; i++) for (const l of def.links) {
    if (reached.has(l.from)) reached.add(l.to);
    if (reached.has(l.to)) reached.add(l.from);
  }
  if ([...ids].some(id => !reached.has(id))) errors.push('disconnected complex');
  return errors;
}
export function registerLandmarkComplex(def: LandmarkComplex): void {
  const errors = validateLandmarkComplex(def);
  if (errors.length) throw new Error(`complex ${def.id}: ${errors.join('; ')}`);
  COMPLEXES[def.id] = def;
}
