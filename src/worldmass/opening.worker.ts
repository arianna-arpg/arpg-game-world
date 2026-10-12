import { planMassOpening } from './openingPlan';
import type { OpeningRequest } from './openingPreparation';
// Pure planning only. No World, account mutation, saves or publication.
self.onmessage = (event: MessageEvent<OpeningRequest>): void => {
  try { self.postMessage(planMassOpening(event.data)); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : String(error) }); }
};
