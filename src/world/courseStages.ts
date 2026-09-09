/** Regional journey stages. Pure data over existing layout/content registries;
 * the course's geometric progress chooses the stage, never discovery order. */
import type { MapCoord } from './coords';

export interface CourseStage {
  id: string;
  label?: string;
  /** Normalized arc interval [start, end); end=1 includes the exact terminus.
   * Gaps use the course defaults. Intervals must not overlap. */
  span: [number, number];
  forceLayout?: string;
  layoutParams?: Record<string, unknown>;
  compositions?: { composition: string; chance: number }[];
  landmarks?: { landmark: string; chance: number; count?: [number, number] }[];
}

/** Minted identity, saved with the zone. Map settling must not reassign it. */
export interface CourseJourney {
  course: string;
  instance: string;
  progress: number;
  label?: string;
  stage?: string;
  stageLabel?: string;
}

export function courseStageAt(stages: readonly CourseStage[] | undefined, progress: number): CourseStage | undefined {
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) return undefined;
  return stages?.find(s => progress >= s.span[0]
    && (progress < s.span[1] || (progress === 1 && s.span[1] === 1)));
}

export function courseJourney(course: { id: string; label?: string }, anchor: MapCoord,
  seed: number, progress: number, stage?: CourseStage): CourseJourney {
  return {
    course: course.id,
    instance: `${course.id}:${anchor.x}:${anchor.y}:${seed >>> 0}`,
    progress,
    ...(course.label ? { label: course.label } : {}),
    ...(stage ? { stage: stage.id, ...(stage.label ? { stageLabel: stage.label } : {}) } : {}),
  };
}

export interface CourseStageRefs {
  layout?: (id: string) => boolean;
  composition?: (id: string) => boolean;
  landmark?: (id: string) => boolean;
  liquid?: (id: string) => boolean;
}

export function validateCourseStages(stages: readonly CourseStage[] | undefined,
  refs: CourseStageRefs = {}): string[] {
  const errors: string[] = [], ids = new Set<string>();
  const valid: CourseStage[] = [];
  for (const s of stages ?? []) {
    if (!s.id || ids.has(s.id)) errors.push(`stage '${s.id}': missing or duplicate id`);
    ids.add(s.id);
    if (!Array.isArray(s.span) || s.span.length !== 2 || !s.span.every(Number.isFinite)
      || s.span[0] < 0 || s.span[1] > 1 || s.span[0] >= s.span[1]) {
      errors.push(`stage '${s.id}': span must increase within [0, 1]`);
    } else {
      for (const prev of valid) if (s.span[0] < prev.span[1] && prev.span[0] < s.span[1]) {
        errors.push(`stage '${s.id}': overlaps '${prev.id}'`);
      }
      valid.push(s);
    }
    if (s.forceLayout && refs.layout && !refs.layout(s.forceLayout)) errors.push(`stage '${s.id}': unknown layout '${s.forceLayout}'`);
    // Orientation is a connection contract owned by the course sampler.
    if (s.layoutParams && 'riverSides' in s.layoutParams) errors.push(`stage '${s.id}': riverSides is owned by the course`);
    for (const [key, value] of Object.entries(s.layoutParams ?? {})) {
      if ((/liquid/i.test(key) || key === 'gulf') && typeof value === 'string'
        && refs.liquid && !refs.liquid(value)) errors.push(`stage '${s.id}': unknown liquid '${value}'`);
    }
    for (const r of s.compositions ?? []) {
      if (refs.composition && !refs.composition(r.composition)) errors.push(`stage '${s.id}': unknown composition '${r.composition}'`);
      if (!Number.isFinite(r.chance) || r.chance < 0 || r.chance > 1) errors.push(`stage '${s.id}': invalid composition chance`);
    }
    for (const r of s.landmarks ?? []) {
      if (refs.landmark && !refs.landmark(r.landmark)) errors.push(`stage '${s.id}': unknown landmark '${r.landmark}'`);
      if (!Number.isFinite(r.chance) || r.chance < 0 || r.chance > 1) errors.push(`stage '${s.id}': invalid landmark chance`);
      if (r.count && (r.count.length !== 2 || !r.count.every(Number.isSafeInteger)
        || r.count[0] < 0 || r.count[0] > r.count[1])) errors.push(`stage '${s.id}': invalid landmark count`);
    }
  }
  return errors;
}

/** First live vocabulary: different crossing/exploration structure along one
 * river. Local biome dressing and freezeAt remain inherited independently. */
export const RIVER_JOURNEY_STAGES: CourseStage[] = [
  { id: 'headwaters', label: 'Headwater crossings', span: [0, 0.3],
    layoutParams: { riverWidth: [70, 100], causeways: [3, 4], isles: [0, 0] } },
  { id: 'constricted', label: 'The long crossing', span: [0.3, 0.7],
    layoutParams: { riverWidth: [140, 190], causeways: [1, 1], isles: [0, 1] } },
  { id: 'lower_reaches', label: 'Islands of the lower river', span: [0.7, 1],
    layoutParams: { riverWidth: [200, 260], causeways: [2, 3], isles: [2, 4] } },
];
