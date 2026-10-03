import type { WorldMassRuntime } from './runtime';

export interface MassRoadNotice { id: string; name: string; departure: string; note: string }
/** Public accounts copied into this run, not surveyed places or accepted work. */
export function massRoadNotices(mass: WorldMassRuntime): MassRoadNotice[] {
  const journey = mass.journey;
  if (!journey) return [];
  return (journey.spec.notices ?? []).flatMap(notice => {
    const departure = journey.spec.destinations.find(d => d.id === notice.destination);
    const place = journey.places.find(p => p.recipe === notice.destination);
    const site = place && mass.config.content.find(c => c.id === place.content)?.site;
    return departure && site ? [{ id: notice.destination, name: site.name,
      departure: departure.edge, note: notice.note }] : [];
  });
}
