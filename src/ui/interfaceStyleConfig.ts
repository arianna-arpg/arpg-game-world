/** Presentation only: registry choices compose independently of page layout and gameplay. */
const cornerDetail = (size: number, width = 1): string => [
  `linear-gradient(var(--inv-light),var(--inv-light)) 4px 4px / ${size}px ${width}px no-repeat`,
  `linear-gradient(var(--inv-light),var(--inv-light)) 4px 4px / ${width}px ${size}px no-repeat`,
  `linear-gradient(var(--inv-light),var(--inv-light)) calc(100% - 4px) 4px / ${size}px ${width}px no-repeat`,
  `linear-gradient(var(--inv-light),var(--inv-light)) calc(100% - 4px) 4px / ${width}px ${size}px no-repeat`,
  `linear-gradient(var(--inv-edge),var(--inv-edge)) 4px calc(100% - 4px) / ${size}px ${width}px no-repeat`,
  `linear-gradient(var(--inv-edge),var(--inv-edge)) 4px calc(100% - 4px) / ${width}px ${size}px no-repeat`,
  `linear-gradient(var(--inv-edge),var(--inv-edge)) calc(100% - 4px) calc(100% - 4px) / ${size}px ${width}px no-repeat`,
  `linear-gradient(var(--inv-edge),var(--inv-edge)) calc(100% - 4px) calc(100% - 4px) / ${width}px ${size}px no-repeat`,
].join(',');
const silverRule = 'linear-gradient(90deg,var(--inv-light),var(--inv-edge) 25%,transparent) left center / 100% 1px no-repeat';
const jewel = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 8'%3E%3Cpath d='M12 4l4-4 4 4-4 4zM0 4l2-2 2 2-2 2zm28 0l2-2 2 2-2 2z' fill='%23c5d9cf'/%3E%3C/svg%3E")`;
const pennantDetail = 'linear-gradient(135deg,var(--inv-light) 0 2px,transparent 2px) left top / 8px 8px no-repeat,linear-gradient(225deg,var(--inv-light) 0 2px,transparent 2px) right top / 8px 8px no-repeat,linear-gradient(90deg,transparent,var(--inv-light),transparent) center 3px / calc(100% - 14px) 1px no-repeat';
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
      tokens: { '--inv-edge': '#866b46', '--inv-light': '#d3b789', '--inv-seam': '#806944', '--inv-bloom': '#d0a66d1c',
        '--inv-frame-detail': cornerDetail(24, 2), '--inv-frame-radius': '2px',
        '--inv-frame-shadow': 'inset 0 0 0 2px #111b1d,inset 0 0 0 3px var(--inv-edge),inset 0 0 0 5px #101a1c,0 12px 30px #000a' } },
    { id: 'astral', name: 'Astral Seal', author, motif: 'astral', description: 'Pale violet arcs and a softly illuminated seal.',
      tokens: { '--inv-edge': '#7d7297', '--inv-light': '#d3c5ef', '--inv-seam': '#615875', '--inv-bloom': '#b29bdc24',
        '--inv-frame-radius': '8px', '--inv-frame-detail': 'radial-gradient(circle at top left,transparent 18px,var(--inv-light) 19px,transparent 20px) top left / 35px 35px no-repeat,radial-gradient(circle at bottom right,transparent 18px,var(--inv-light) 19px,transparent 20px) bottom right / 35px 35px no-repeat' } },
    { id: 'simple', name: 'Understated', author, motif: 'simple', description: 'A quiet inset edge with minimal ornament.',
      tokens: { '--inv-frame-detail': 'linear-gradient(transparent,transparent)', '--inv-frame-radius': '4px', '--inv-frame-shadow': 'inset 0 1px #d8ead210,0 12px 32px #0009' } },
  ] },
  { key: 'divider', label: 'Title divider', choices: [
    { id: 'silver', name: 'Silver Inlay', author, motif: 'silver', description: 'A fine split line with three small silver jewels.' },
    { id: 'crest', name: 'Pennant Crest', author, motif: 'crest', description: 'A centered crest and a shallow curved accent.',
      tokens: { '--inv-divider-art': `${jewel} center / 32px 8px no-repeat,${silverRule}` } },
    { id: 'runic', name: 'Runic Index', author, motif: 'runic', description: 'An etched rule with a central rune inscription.',
      tokens: { '--inv-divider-art': `repeating-linear-gradient(90deg,transparent 0 18px,var(--inv-light) 18px 19px,transparent 19px 26px) left 6px / 100% 2px no-repeat,${silverRule}` } },
    { id: 'simple', name: 'Simple Rule', author, motif: 'simple', description: 'One restrained line beneath the title.', tokens: { '--inv-divider-art': silverRule } },
  ] },
  { key: 'ribbon', label: 'Page ribbons', choices: [
    { id: 'pennants', name: 'Refined Pennants', author, motif: 'pennants', description: 'Silver-edged pointed faces with a warm highlight on open pages.' },
    { id: 'silver', name: 'Silver Inlay', author, motif: 'silver', description: 'Inset plates with small jewel stops.',
      tokens: { '--inv-tab-detail': 'linear-gradient(90deg,transparent,var(--inv-light),transparent) center 3px / calc(100% - 10px) 1px no-repeat', '--inv-tab-radius': '2px' } },
    { id: 'runic', name: 'Runic Index', author, motif: 'runic', description: 'An etched spine and fine index marks.',
      tokens: { '--inv-tab-detail': 'repeating-linear-gradient(90deg,transparent 0 4px,var(--inv-light) 4px 5px,transparent 5px 8px) center 2px / calc(100% - 8px) 2px no-repeat', '--inv-tab-radius': '2px' } },
    { id: 'simple', name: 'Understated', author, motif: 'simple', description: 'Quiet rectangular tabs with clear active states.',
      tokens: { '--inv-tab-detail': 'linear-gradient(transparent,transparent)', '--inv-tab-radius': '3px' } },
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
  '--inv-control-shadow': 'inset 0 1px #ffffff09,0 2px 5px #0005',
  '--inv-control-glow': 'inset 0 1px #ffffff14,0 0 12px var(--inv-bloom)',
  '--inv-control-radius': '3px', '--inv-control-ms': '150ms', '--inv-enter-ms': '240ms',
  '--inv-pennant-tip': '7px', '--inv-heading-jewel': '124px', '--inv-title-line': '20px',
  '--inv-frame-detail': cornerDetail(18), '--inv-frame-radius': '2px',
  '--inv-frame-shadow': 'inset 0 0 0 3px #08141a,inset 0 0 0 4px var(--inv-seam),0 0 18px var(--inv-bloom),0 16px 36px #0009',
  '--inv-divider-art': `${jewel} 112px center / 32px 8px no-repeat,${silverRule}`,
  '--inv-tab-detail': pennantDetail, '--inv-tab-radius': '4px 4px 0 0',
  '--inv-tab-active': 'linear-gradient(100deg,#304b49,#3c5350 40%,#243b40 78%,#344a49)',
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
