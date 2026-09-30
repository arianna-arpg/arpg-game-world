// Vite supplies these for an explicitly configured browser preview. Node probes
// and ordinary builds retain the existing game and storage identities.
declare const __HOLLOW_WAKE_STORAGE_SCOPE__: string;
declare const __HOLLOW_WAKE_WORLDMASS__: boolean;

export const BUILD_PROFILE = {
  storageScope: typeof __HOLLOW_WAKE_STORAGE_SCOPE__ === 'undefined' ? '' : __HOLLOW_WAKE_STORAGE_SCOPE__,
  worldmass: typeof __HOLLOW_WAKE_WORLDMASS__ === 'undefined' ? false : __HOLLOW_WAKE_WORLDMASS__,
};

/** All saved state in a preview lives separately from the ordinary web game. */
export function storageKey(key: string): string {
  return BUILD_PROFILE.storageScope ? `${BUILD_PROFILE.storageScope}:${key}` : key;
}
