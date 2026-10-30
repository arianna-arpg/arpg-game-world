/** Presentation only: registry choices compose independently of page layout and gameplay. */
export interface InterfaceStyle {
  frame: string;
  divider: string;
  ribbon: string;
}
export interface InterfaceStyleChoice {
  id: string;
  name: string;
  description: string;
  author: string;
  /** An existing CSS ornament grammar; new palettes need only a new registry row. */
  motif: string;
  tokens?: Readonly<Record<`--inv-${string}`, string>>;
}
export interface InterfaceStyleCategory {
  key: keyof InterfaceStyle;
  label: string;
  choices: readonly InterfaceStyleChoice[];
}
const author = 'Hollow Wake';
export const INTERFACE_STYLE_CATEGORIES: readonly InterfaceStyleCategory[] = [
  { key: 'frame', label: 'Panel frame', choices: [
    { id: 'aether', name: 'Aether', author, motif: 'aether', description: 'Silver seams, illuminated corners and a dark teal surface.' },
    { id: 'relic', name: 'Gilded Relic', author, motif: 'relic', description: 'Layered bronze casing and engraved corner mounts.',
      tokens: { '--inv-edge': '#866b46', '--inv-light': '#d3b789', '--inv-seam': '#806944', '--inv-bloom': '#d0a66d1c' } },
    { id: 'astral', name: 'Astral Seal', author, motif: 'astral', description: 'Pale violet arcs and a softly illuminated seal.',
      tokens: { '--inv-edge': '#7d7297', '--inv-light': '#d3c5ef', '--inv-seam': '#615875', '--inv-bloom': '#b29bdc24' } },
    { id: 'simple', name: 'Understated', author, motif: 'simple', description: 'A quiet inset edge with minimal ornament.' },
  ] },
  { key: 'divider', label: 'Title divider', choices: [
    { id: 'silver', name: 'Silver Inlay', author, motif: 'silver', description: 'A fine split line with three small silver jewels.' },
    { id: 'crest', name: 'Pennant Crest', author, motif: 'crest', description: 'A centered crest and a shallow curved accent.' },
    { id: 'runic', name: 'Runic Index', author, motif: 'runic', description: 'An etched rule with a central rune inscription.' },
    { id: 'simple', name: 'Simple Rule', author, motif: 'simple', description: 'One restrained line beneath the title.' },
  ] },
  { key: 'ribbon', label: 'Page ribbons', choices: [
    { id: 'pennants', name: 'Refined Pennants', author, motif: 'pennants', description: 'Silver-edged pointed faces with a warm highlight on open pages.' },
    { id: 'silver', name: 'Silver Inlay', author, motif: 'silver', description: 'Inset plates with small jewel stops.' },
    { id: 'runic', name: 'Runic Index', author, motif: 'runic', description: 'An etched spine and fine index marks.' },
    { id: 'simple', name: 'Understated', author, motif: 'simple', description: 'Quiet rectangular tabs with clear active states.' },
  ] },
];
export const DEFAULT_INTERFACE_STYLE: Readonly<InterfaceStyle> = { frame: 'aether', divider: 'silver', ribbon: 'pennants' };
export const INTERFACE_STYLE_TOKENS: Readonly<Record<`--inv-${string}`, string>> = {
  '--inv-surface': '#0d171b', '--inv-raised': '#18292d', '--inv-line': '#35494b',
  '--inv-text': '#e7e5d9', '--inv-muted': '#a9b5b1', '--inv-title': '#e8e3d2',
  '--inv-edge': '#527e78', '--inv-light': '#afd9cb', '--inv-seam': '#395d5d', '--inv-bloom': '#70cbb92a',
  '--inv-panel-fill': 'linear-gradient(105deg,#9dcac50a,transparent 43%),linear-gradient(180deg,#152429,#0c161a 120px,#0c1519)',
  '--inv-cell-fill': 'linear-gradient(150deg,#142126,#0c171c)', '--inv-cell-edge': '#2b3c42',
  '--inv-item-fill': 'radial-gradient(ellipse at 50% 28%,#30414a,#18232d 74%)',
  '--inv-equip-fill': 'linear-gradient(140deg,#1b2c31,#101c23)', '--inv-empty-edge': '#4a6262',
  '--inv-control-fill': 'linear-gradient(#293a3e,#18252c)', '--inv-control-hover': '#32484b',
  '--inv-pennant-tip': '7px', '--inv-heading-jewel': '124px', '--inv-title-line': '20px',
};

/** Old, partial or unavailable selections fall back independently; never reset other preferences. */
export function normalizeInterfaceStyle(value: unknown): InterfaceStyle {
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = { ...DEFAULT_INTERFACE_STYLE };
  for (const category of INTERFACE_STYLE_CATEGORIES) {
    const pick = saved[category.key];
    if (typeof pick === 'string' && category.choices.some(choice => choice.id === pick)) result[category.key] = pick;
  }
  return result;
}
