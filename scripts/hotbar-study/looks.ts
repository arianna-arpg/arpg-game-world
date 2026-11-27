import { COSMETIC_HOTBARS, INVENTORY_HOTBAR } from '../../src/data/cosmeticStyles';
import { BUFF_SHAPES, type BuffBehavior } from '../../src/render/vis/buffBehavior';
// Presentation choices and repeatable combat snapshots for the design study.
// Caps and durations follow the unmodified skills in src/data/skills.ts.
export const chargeStyles = {
  rail: 'Cartridge rail', seal: 'Dial seal', plate: 'Number plate', fraction: 'Split fraction',
  vial: 'Glass reservoir', beads: 'Bead crown', tabs: 'Notched tab',
};
export const stackStyles = {
  corner: 'Corner badge', coin: 'Round seal', band: 'Stack ribbon', ledger: 'Named strip', flag:'Side pennant',
};
export const metals = { inherit:'Use finish’s frame', brass: 'Chased corners', silver: 'Rounded bezel', iron: 'Flat inset' };
export const finishes = {inventory:{...INVENTORY_HOTBAR,name:'Original · inventory'},...COSMETIC_HOTBARS} as Record<string,typeof INVENTORY_HOTBAR & {name:string}>;
export const skins = Object.fromEntries(Object.entries(finishes).map(([id,s])=>[id,s.name]));
export const shapes = {circle:'Circle', diamond:'Diamond', square:'Square', hexagon:'Hexagon'};
export const expiry = {wipe:'Silver fade', wick:'Time bar', rim:'Clock ring'};
export const behaviorNames: Record<BuffBehavior,string> = {
  proc:'Triggered', stack:'Stacking', condition:'Conditional', duration:'Timed', active:'Other active',
};
export type Shape = keyof typeof shapes;
export const effectShapes = BUFF_SHAPES;
const squareShapes = {proc:'square',stack:'square',condition:'square',duration:'square',active:'square'} as const;
const roundShapes = {proc:'circle',stack:'circle',condition:'circle',duration:'circle',active:'circle'} as const;
export interface Look extends Record<BuffBehavior,Shape> {
  charges: keyof typeof chargeStyles;
  stacks: keyof typeof stackStyles;
  metal: keyof typeof metals;
  skin: string;
  tint?:string;
  timers:'hidden'|'shown';
  expiry: keyof typeof expiry;
}
export const options = {charges:chargeStyles,stacks:stackStyles,metal:metals,skin:skins,expiry,timers:{hidden:'Hover only',shown:'Beside icon'},
  proc:shapes,stack:shapes,condition:shapes,duration:shapes,active:shapes};
export const lookKeys = Object.keys(options) as (keyof typeof options)[];
export const presets = ([
  { name: 'Armory', charges: 'rail', stacks: 'corner', metal: 'brass',skin:'armory_brass',expiry:'wipe',...squareShapes,
    detail: 'Count the lit cartridges or read the number at the end of the rail.' },
  { name: 'Signet', charges: 'seal', stacks: 'coin', metal: 'silver',skin:'signet_silver',expiry:'wipe',...roundShapes,
    detail: 'A numbered seal sits on each charged skill. Its outer arc shows the reserve.' },
  { name: 'Watchtower', charges: 'plate', stacks: 'band', metal: 'iron',skin:'watchtower_iron',expiry:'wick',...squareShapes,
    detail: 'Large numbers sit on dark plates. Buff stacks have their own band below the artwork.' },
  { name: 'Field ledger', charges: 'fraction', stacks: 'ledger', metal: 'brass',skin:'armory_brass',expiry:'wipe',...squareShapes,
    detail: 'Read the remaining charges against their capacity, with named buffs above the bar.' },
  { name:'Heraldic Signet',charges:'seal',stacks:'coin',metal:'silver',skin:'inventory',expiry:'wick',...effectShapes,
    detail:'Signet’s dial seals with distinct silhouettes for triggers, stacks, conditions and timed effects.' },
  { name:'Hourglass',charges:'vial',stacks:'flag',metal:'silver',skin:'rose_vellum',expiry:'wick',...effectShapes,
    detail:'A glass reservoir shows the remaining charge level. A separate bar tracks expiring effects.' },
  { name:'Rosary',charges:'beads',stacks:'coin',metal:'silver',skin:'moon_silver',expiry:'rim',...effectShapes,proc:'hexagon',
    detail:'Lit beads arc above the skill. A fine clock ring shows the last five seconds.' },
  { name:'Standard bearer',charges:'tabs',stacks:'flag',metal:'iron',skin:'ember_forge',expiry:'wick',...effectShapes,
    detail:'A notched tab carries the reserve. Stack counts hang beside the emblem on a small pennant.' },
] as const).map(p=>({...p,timers:p.name==='Heraldic Signet' ? 'hidden' as const : 'shown' as const}));
export const startingMix=presets.find(p=>p.name==='Heraldic Signet')!;
export const originalSignet=presets.find(p=>p.name==='Signet')!;

export const skills = [
  ['cleave', 'Cleave', 'LMB'], ['deep_carve', 'Deep Carve', 'RMB'],
  ['flame_imbuement', 'Flame Imbuement', '1'], ['frenzy', 'Frenzy', '2'],
  ['iron_ward', 'Iron Ward', '3'], ['dash', 'Dash', '4'],
  ['life_flask', 'Life Flask', '5'], ['mana_flask', 'Mana Flask', '6'],
] as const;
export type Skill = typeof skills[number][0];
export const banks = {
  flame_imbuement: { field: 'flame', cap: 6, unit: 'imbued strikes', tint: '#ffab5c', persistent: false },
  life_flask: { field: 'life', cap: 3, unit: 'sips', tint: '#ff968b', persistent: true },
  mana_flask: { field: 'mana', cap: 3, unit: 'sips', tint: '#9cd9fb', persistent: true },
} as const;
export interface Snapshot {
  flame: number; life: number; mana: number; carve: number; frenzy: number; verse: number;
  wardSeconds: number; dashSeconds: number;
}
export const encounters: Record<string, Snapshot> = {
  'Mid-fight': { flame: 4, life: 2, mana: 3, carve: 9, frenzy: 3, verse: 2, wardSeconds: 2.4, dashSeconds: 1.8 },
  'Last charge': { flame: 1, life: 1, mana: 1, carve: 10, frenzy: 1, verse: 1, wardSeconds: 0.6, dashSeconds: 0.4 },
  'Full banks': { flame: 6, life: 3, mana: 3, carve: 12, frenzy: 5, verse: 3, wardSeconds: 6, dashSeconds: 0 },
  'Spent & expired': { flame: 0, life: 0, mana: 0, carve: 0, frenzy: 0, verse: 2, wardSeconds: 0, dashSeconds: 0 },
};
export function sameLook(a: Look, b: Look) {
  return a.tint===b.tint && lookKeys.every(key=>a[key]===b[key]);
}
export function lookName(look: Look) {
  return presets.find(p => sameLook(look, p))?.name ?? 'Custom mix';
}
