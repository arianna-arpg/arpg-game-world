/** Presentation only. Providers continue to own content, discovery and actions. */
export interface SideScreenProfile {
  id: string;
  chapter: string;
  caption: string;
  accent: string;
  width: { share: number; min: number; max: number };
  /** Existing view regions to decorate; no business rules in the shell. */
  regions: { head: string; scroll: string; foot: string };
}
const ledgerRegions = { head: '.vault-head', scroll: '.vault-body', foot: '.vault-foot' };
export const SIDE_SCREENS = {
  vault: {
    id: 'vault', chapter: 'The legacy', caption: 'Shape the lives yet to come.', accent: '#cfaf77',
    width: { share: 68, min: 720, max: 1080 }, regions: ledgerRegions,
  },
  chronicle: {
    id: 'chronicle', chapter: 'The remembered', caption: 'Every life leaves an echo.', accent: '#b9c8be',
    width: { share: 70, min: 760, max: 1120 }, regions: ledgerRegions,
  },
  immortals: {
    id: 'immortals', chapter: 'The undying', caption: 'Some lives refuse to fade.', accent: '#b6add8',
    width: { share: 64, min: 640, max: 1020 },
    regions: { head: '.roster-head', scroll: '.roster-body', foot: '.roster-foot' },
  },
  codex: {
    id: 'codex', chapter: 'The discovered', caption: 'Knowledge endures beyond a single life.', accent: '#a2c7c1',
    width: { share: 75, min: 820, max: 1240 },
    regions: { head: '.cx-head', scroll: '.cx-body', foot: '.cx-foot' },
  },
  options: {
    id: 'options', chapter: 'Your passage', caption: 'Your way through the veil.', accent: '#94c5c0',
    width: { share: 62, min: 640, max: 940 },
    regions: { head: '.side-options-head', scroll: '.options-body', foot: '.options-footer' },
  },
} satisfies Record<string, SideScreenProfile>;
export const SIDE_SCREEN = {
  entranceLabel: 'The threshold',
  transitionMs: 240,
  palette: { surface: '#0b1519', text: '#e7e5d9', muted: '#a6b7b5', line: '#a8bcb52e' },
};
