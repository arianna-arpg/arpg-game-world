import { INVENTORY_HOTBAR } from '../data/cosmeticStyles';
import { DEFAULT_RUNE_ACTIVITY, normalizeRuneActivity } from '../render/runeField';
import { encipher } from '../data/runescript';

/** One monochrome printing plate. CSS supplies the ink from the active palette. */
function wardSeal(): string {
  const letters = [...encipher('ward the bearer · ward the gate · ')];
  const inscription = letters.map((r,i) => `<text x="100" y="18" transform="rotate(${360*i/letters.length} 100 100)">${r}</text>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="black" stroke-width=".8">
    <circle cx="100" cy="100" r="95"/><circle cx="100" cy="100" r="78"/><circle cx="100" cy="100" r="73"/>
    <path d="m100 30 60 105H40z M100 170 40 65h120z M100 49l51 51-51 51-51-51z"/>
    <circle cx="100" cy="100" r="35"/><path d="M100 72v56m-13-40 13 12 13-12m-22 23 9-9 9 9"/>
    </g><g text-anchor="middle" font-family="Segoe UI Symbol,serif" font-size="10">${inscription}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

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
  palette: string;
  finish: string;
  marks: string;
  typeface: string;
  runeActivity: number;
}
type InterfaceAppearance = Omit<InterfaceStyle, 'runeActivity' | 'typeface'>;
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
  key: Exclude<keyof InterfaceStyle, 'runeActivity'>;
  label: string;
  choices: readonly InterfaceStyleChoice[];
}
const author = 'Hollow Wake';
/** Palette owns materials and ink. The frame, divider and ribbon own their shapes. */
function interfacePalette(surface: string, raised: string, edge: string, light: string, muted: string): InterfaceStyleChoice['tokens'] {
  return {
    '--inv-surface': surface, '--inv-raised': raised, '--inv-light': light, '--inv-edge': edge, '--inv-muted': muted,
    '--inv-line': `color-mix(in srgb,${edge} 65%,${surface})`, '--inv-seam': edge, '--inv-bloom': light + '24',
    '--inv-panel-fill': 'linear-gradient(125deg,var(--inv-bloom),transparent 37%),linear-gradient(170deg,var(--inv-raised),var(--inv-surface) 60%)',
    '--inv-control-fill': 'linear-gradient(var(--inv-raised),var(--inv-surface))',
    '--inv-control-hover': 'color-mix(in srgb,var(--inv-edge) 36%,var(--inv-raised))',
    '--inv-tab-active': 'linear-gradient(105deg,var(--inv-control-hover),var(--inv-raised))',
    '--inv-item-fill': 'radial-gradient(ellipse at 45% 28%,var(--inv-control-hover),var(--inv-surface) 80%)',
    '--inv-cell-fill': 'linear-gradient(140deg,var(--inv-raised),var(--inv-surface))', '--inv-cell-edge': 'var(--inv-line)',
    '--inv-equip-fill': 'var(--inv-cell-fill)', '--inv-empty-edge': 'var(--inv-edge)',
  };
}
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
  { key: 'palette', label: 'Interface palette', choices: [
    { id:'frame', name:'Frame colors', author, motif:'frame', description:'Use the original colors of the selected frame.' },
    { id:'brass', name:'Soot & brass', author, motif:'tinted', description:'Burnished brass on dark umber.', tokens:interfacePalette('#1c1512','#332620','#997a58','#ebc590','#c0b0a1') },
    { id:'midnight', name:'Midnight ink', author, motif:'tinted', description:'Moonlit lavender on deep indigo.', tokens:interfacePalette('#101322','#20243c','#777d9e','#c9c9fa','#adb4ce') },
    { id:'lichen', name:'Lichen', author, motif:'tinted', description:'Weathered sage on forest slate.', tokens:interfacePalette('#131c18','#26332c','#718677','#c0d6b8','#adbdaf') },
  ] },
  { key:'finish', label:'Inventory page finish', choices:[
    { id:'frame', name:'Frame finish', author, motif:'frame', description:'The engraved folio, or plain pages with the Understated frame.' },
    { id:'ledger', name:'Ruled ledger', author, motif:'ledger', description:'Fine horizontal rules and a margin line.' },
    { id:'atlas', name:'Celestial chart', author, motif:'atlas', description:'Orbital arcs and a fine star grid.' },
    { id:'warded', name:'Warded vellum', author, motif:'warded', description:'A compass seal, inscribed in the ink of your chosen palette.',
      tokens:{ '--inv-ward-seal':wardSeal() } },
    { id:'plain', name:'Plain stock', author, motif:'plain', description:'Flat writing surfaces without a printed pattern.' },
  ] },
  { key:'marks', label:'Equipment marks', choices:[
    { id:'engraved', name:'Engraved', author, motif:'engraved', description:'A shaded silhouette with cut details.' },
    { id:'outline', name:'Outline', author, motif:'outline', description:'A spare outline with a clear center.',
      tokens:{ '--inv-stamp-fill':'0', '--inv-stamp-cut':'0', '--inv-stamp-width':'1.9' } },
    { id:'struck', name:'Struck metal', author, motif:'struck', description:'A bright solid shape with dark inset cuts.',
      tokens:{ '--inv-stamp-fill':'.86', '--inv-stamp-cut-ink':'var(--inv-surface)', '--inv-stamp-width':'1.7' } },
  ] },
  { key:'typeface', label:'Inventory lettering', choices:[
    { id:'classic', name:'Classic', author, motif:'classic', description:'Serif headings with the original sans-serif text.' },
    { id:'clear', name:'Clear print', author, motif:'clear', description:'Wide, open sans-serif letters for headings, names and numbers.',
      tokens:{ '--inv-reading-font':'Verdana, sans-serif', '--inv-heading-font':'Verdana, sans-serif' } },
    { id:'book', name:'Book hand', author, motif:'book', description:'Georgia throughout, with serif letters and distinct numerals.',
      tokens:{ '--inv-reading-font':'Georgia, serif', '--inv-heading-font':'Georgia, serif' } },
  ] },
];
const originalAppearance: InterfaceAppearance = { frame:'aether', divider:'silver', ribbon:'pennants', palette:'frame', finish:'frame', marks:'engraved' };
export const DEFAULT_INTERFACE_STYLE: Readonly<InterfaceStyle> = {
  ...originalAppearance, typeface:'classic', runeActivity: DEFAULT_RUNE_ACTIVITY,
};
interface InterfaceTemplate {
  id: string;
  name: string;
  author: string;
  description: string;
  appearance: Readonly<InterfaceAppearance>;
}
/** Templates copy ordinary Wardrobe choices into the draft. The saved choices alone determine the matching template. */
export const INTERFACE_TEMPLATES: readonly InterfaceTemplate[] = [
  { id:'aether', name:'Aether', author, description:'Silver inlay and teal enamel.', appearance:originalAppearance },
  { id:'brass-ledger', name:'Brass Ledger', author, description:'Ruled leaves and struck brass.', appearance:{ frame:'relic', divider:'crest', ribbon:'silver', palette:'brass', finish:'ledger', marks:'struck' } },
  { id:'midnight-atlas', name:'Midnight Atlas', author, description:'Runic tabs and orbital charts.', appearance:{ frame:'astral', divider:'runic', ribbon:'runic', palette:'midnight', finish:'atlas', marks:'engraved' } },
  { id:'field-kit', name:'Field Kit', author, description:'Plain sage stock and outline marks.', appearance:{ frame:'simple', divider:'simple', ribbon:'simple', palette:'lichen', finish:'plain', marks:'outline' } },
];
export function matchingInterfaceTemplate(style: InterfaceStyle): InterfaceTemplate | undefined {
  return INTERFACE_TEMPLATES.find(t => INTERFACE_STYLE_CATEGORIES.every(c => c.key === 'typeface' || t.appearance[c.key] === style[c.key]));
}
export const INTERFACE_STYLE_TOKENS: Readonly<Record<`--inv-${string}`, string>> = {
  '--inv-reading-font':"'Segoe UI', Verdana, sans-serif", '--inv-heading-font':"Georgia, 'Times New Roman', serif",
  '--inv-surface': INVENTORY_HOTBAR.rail, '--inv-raised': INVENTORY_HOTBAR.fill, '--inv-line': '#35494b',
  '--inv-text': '#e7e5d9', '--inv-muted': '#a9b5b1', '--inv-title': '#e8e3d2',
  '--inv-edge': INVENTORY_HOTBAR.border, '--inv-light': INVENTORY_HOTBAR.trim, '--inv-seam': '#395d5d', '--inv-bloom': '#70cbb92a',
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
  '--inv-stamp-fill':'.17', '--inv-stamp-cut':'1', '--inv-stamp-cut-ink':'currentColor', '--inv-stamp-width':'1.4',
  '--inv-tab-active': 'linear-gradient(100deg,#304b49,#3c5350 40%,#243b40 78%,#344a49)',
};

/** Old, partial or unavailable selections fall back independently; never reset other preferences. */
export function normalizeInterfaceStyle(value: unknown): InterfaceStyle {
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const result = { ...DEFAULT_INTERFACE_STYLE };
  result.runeActivity = normalizeRuneActivity(saved.runeActivity);
  for (const category of INTERFACE_STYLE_CATEGORIES) {
    const pick = saved[category.key];
    if (typeof pick === 'string' && category.choices.some(choice => choice.id === pick)) result[category.key] = pick;
  }
  return result;
}
