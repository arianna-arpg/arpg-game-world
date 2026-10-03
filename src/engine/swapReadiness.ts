/** A native restriction and, where meaningful, its remaining simulation time.
 * Old string callers retain their exact words through World.swapRefusal. */
export type SwapReadiness = {
  reason: string | null;
  remaining?: number;
};
