/** Presentation-only contract. Game rules remain with the account and run flows. */
export interface FrontScreenState {
  firstLife: boolean;
  accountLevel: number;
  vessels: number;
  fallen: number;
  records: number;
  vaultAvailable: boolean;
  pendingEssence: number;
  currency: string;
  coopAvailable: boolean;
  notice?: string;
  resume?: { name: string; className: string; level: number; mode: string };
}
export type FrontAction = 'start' | 'continue' | 'immortals' | 'vault' | 'chronicle' | 'keys' | 'coop' | 'exit';
export interface FrontActionDef {
  id: FrontAction;
  group: 'journey' | 'legacy' | 'utility';
  label: (s: FrontScreenState) => string;
  detail: (s: FrontScreenState) => string;
  visible?: (s: FrontScreenState) => boolean;
  enabled?: (s: FrontScreenState) => boolean;
  badge?: (s: FrontScreenState) => string;
}

/** Change order, labels, availability and descriptions here without editing the layout. */
export const FRONT_ACTIONS: readonly FrontActionDef[] = [
  { id: 'continue', group: 'journey', label: () => 'Continue Run',
    detail: s => s.resume ? `Return as ${s.resume.name}` : 'No saved journey', enabled: s => !!s.resume },
  { id: 'start', group: 'journey', label: s => s.firstLife ? 'Begin Your Journey' : 'New Run',
    detail: s => s.firstLife ? 'Step beyond the veil' : 'Another life. Another path.' },
  { id: 'immortals', group: 'legacy', label: () => 'Immortal Vessels',
    detail: () => 'The lives bound to your account', visible: s => s.vessels > 0,
    badge: s => s.fallen ? `${s.fallen} fallen` : String(s.vessels) },
  { id: 'vault', group: 'legacy', label: () => 'The Vault', visible: s => s.vaultAvailable,
    detail: s => s.pendingEssence ? `${s.pendingEssence} ${s.currency} awaiting the Reckoning` : 'Shape the lives yet to come',
    badge: s => s.pendingEssence ? String(s.pendingEssence) : '' },
  { id: 'chronicle', group: 'legacy', label: () => 'Chronicle of Runs',
    detail: () => 'The echoes of lives before', badge: s => s.records ? String(s.records) : '' },
  { id: 'keys', group: 'utility', label: () => 'Options', detail: () => 'Controls, sound & display' },
  { id: 'coop', group: 'utility', label: () => 'Co-op', detail: () => 'Gather your companions',
    visible: s => s.coopAvailable, badge: () => 'Beta' },
  { id: 'exit', group: 'utility', label: () => 'Exit Game', detail: () => 'Leave Hollow Wake' },
];

export const FRONT_SCREEN = {
  artwork: new URL('./assets/threshold.png', import.meta.url).href,
  chapter: 'The threshold',
  tagline: 'Every life leaves an echo.',
  freshTitle: 'Your first life awaits.',
  freshBody: 'Beyond the veil, a world waits to be discovered.',
  returnTitle: 'A journey unfinished',
  footer: 'An ever-changing world',
  buildLabel: 'In development',
  palette: { ivory: '#eee6d4', muted: '#a7b2b0', gold: '#c8aa73', line: '#b39c6c40' },
  atmosphere: {
    enabled: true,
    driftSeconds: 19,
    // Website insignia colors (site/index.html), weighted toward the soul-flame.
    moteColors: ['#4fd6c4', '#4fd6c4', '#7ff0e1', '#9ab8dc', '#a98bff', '#ff8a4c'],
    // Each stratum sets density, core size, glow, opacity and travel independently.
    strata: [
      { count: 26, size: [0.9, 1.6], halo: 4, alpha: 0.36, seconds: [28, 42], rise: [65, 125], sway: [12, 30] },
      { count: 22, size: [1.8, 3.0], halo: 8, alpha: 0.64, seconds: [20, 32], rise: [100, 190], sway: [20, 52] },
      { count: 8, size: [3.0, 4.6], halo: 13, alpha: 0.74, seconds: [16, 26], rise: [140, 240], sway: [30, 72] },
    ],
  },
} as const;
