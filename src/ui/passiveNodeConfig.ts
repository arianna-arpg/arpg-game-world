import { VOCATION_NODE_ART } from '../data/vocationNodeArt';
import { VOCATIONS } from '../data/vocations';
import { passiveNodeMeaning } from '../data/passiveNodeSymbols';
import { PASSIVE_BRANCH_THEMES } from '../data/passiveNodeThemes';
import type { PassiveNode } from '../data/passives';
import { ICON_SUBJECTS, type IconSubject } from '../render/skillIconArt';

export interface PassiveNodeStyle { material: string; silhouette: string; symbols: string; palette: string }
export interface PassiveNodePalette { accent: string; ink: string; dark: string }
/** Optional metal settings inside a round seal, drawn on the same 24-unit tile. */
export const PASSIVE_RIM_INLAYS = {
  plain: '',
  studs: 'M1 12L3 10L4.6 12L3 14Z M23 12L21 10L19.4 12L21 14Z',
  compass: 'M12 1L14 3L12 5.2L10 3Z M1 12L3 9L5.3 12L3 15Z M23 12L21 9L18.7 12L21 15Z',
};
export interface PassiveNodeVisual {
  icon: IconSubject;
  silhouette: string;
  palette: PassiveNodePalette;
  author: string;
  theme?: string;
  source?: string;
  inlay?: keyof typeof PASSIVE_RIM_INLAYS;
  /** Optional authored component overrides, composable at kind/group/node scope. */
  style?: Partial<PassiveNodeStyle>;
}
export interface PassiveNodeArtGroup {
  defaults: Partial<PassiveNodeVisual>;
  nodes?: Readonly<Record<string, Partial<PassiveNodeVisual>>>;
}
/** Larger standard nodes have room for the subject's engraved interior strokes. */
const STANDARD_RANK_ART: Readonly<Partial<Record<PassiveNode['kind'], Partial<PassiveNodeVisual>>>> = {
  choice: { style: { symbols: 'relief' } },
  notable: { inlay: 'studs', style: { symbols: 'relief' } },
  keystone: { inlay: 'compass', style: { symbols: 'relief' } },
};
export interface PassiveNodeArtConfig {
  defaults: PassiveNodeVisual;
  kinds: Readonly<Record<string, Partial<PassiveNodeVisual>>>;
  groups: Readonly<Record<string, PassiveNodeArtGroup>>;
  nodes: Readonly<Record<string, Partial<PassiveNodeVisual>>>;
}
export interface PassiveNodeArtContext { id: string; kind: string; group?: string; localId?: string; node?: Pick<PassiveNode,'id'|'kind'|'mods'|'attributes'|'attributesPct'|'choice'|'conduit'> }

/** Each path lies within a radius-12 disc. No style can grow into adjacent
 * nodes or lines: silhouettes fit the tree's shared hit/clearance envelope. */
export const PASSIVE_NODE_SILHOUETTES: Readonly<Record<string, { name: string; path: string }>> = {
  circle: { name:'Round seal', path:'M12 0A12 12 0 1 0 12 24A12 12 0 1 0 12 0Z' },
  shield: { name:'Shield', path:'M12 0L21 5L20 15Q18 20 12 24Q6 20 4 15L3 5Z' },
  diamond: { name:'Crystal', path:'M12 0L21 7L22 12L12 24L2 12L3 7Z' },
  hexagon: { name:'Hexagon', path:'M12 0L22.39 6V18L12 24L1.61 18V6Z' },
  coffin: { name:'Reliquary', path:'M8 1L16 1L21 7L18 21L12 24L6 21L3 7Z' },
  leaf: { name:'Leaf', path:'M12 0Q24 5 22 12Q21 20 12 24Q3 20 2 12Q0 5 12 0Z' },
  fang: { name:'Fang', path:'M12 0L20 4Q24 13 12 24Q1 15 4 5L8 8Z' },
  drop: { name:'Bloodstone', path:'M12 0Q16 6 21 12Q24 21 12 24Q0 21 3 12Q8 6 12 0Z' },
  flame: { name:'Flame', path:'M12 0Q20 5 18 10L22 8Q24 18 12 24Q0 18 2 8L6 10Q4 5 12 0Z' },
  sun: { name:'Radiant seal', path:'M12 0L15 4L20.5 3.5L20 9L24 12L20 15L20.5 20.5L15 20L12 24L9 20L3.5 20.5L4 15L0 12L4 9L3.5 3.5L9 4Z' },
};
/** Shared allocation language, never a device preference. Content authors may
 * compose these components through the same visual override registry. */
export const PASSIVE_NODE_STATE_STYLES: Readonly<Record<'unlearned'|'learned',PassiveNodeStyle>> = {
  unlearned:{material:'luminous',silhouette:'theme',symbols:'bold',palette:'vocation'},
  learned:{material:'enamel',silhouette:'theme',symbols:'relief',palette:'vocation'},
};
const own = <T>(rows: Readonly<Record<string,T>>, id: string): T | undefined => Object.hasOwn(rows,id) ? rows[id] : undefined;
/** Presentation palettes share the Vocation's authored color. Lighter ink and
 * dark enamel are derived consistently, including before allocation. */
export function passiveNodeTint(color: string, target: string, amount: number): string {
  const channels = (s: string): number[] => [1,3,5].map(i => parseInt(s.slice(i,i+2),16));
  const a = channels(/^#[\da-f]{6}$/i.test(color) ? color : '#b8a8e8'), b = channels(target);
  return '#' + a.map((v,i) => Math.round(v+(b[i]-v)*amount).toString(16).padStart(2,'0')).join('');
}
export const PASSIVE_NODE_ART: PassiveNodeArtConfig = {
  defaults: { icon:'star', silhouette:'circle', palette:{accent:'#b8a8e8',ink:'#f5eee4',dark:'#17131e'}, author:'Hollow Wake' },
  // Every standard node receives its own semantic symbol, inside a round seal.
  kinds: {start:{},small:{},notable:{},keystone:{},attr:{},choice:{}},
  groups: Object.fromEntries(Object.entries(VOCATION_NODE_ART).map(([id,p]) => {
    const accent = VOCATIONS[id]?.color ?? '#b8a8e8';
    return ['vocation:'+id, { defaults: { icon:p.emblem, silhouette:p.silhouette, author:p.author,
      palette:{accent,ink:passiveNodeTint(accent,'#fff4df',.7),dark:passiveNodeTint(accent,'#090e18',.86)} },
      nodes:Object.fromEntries(Object.entries(p.nodes).map(([key,icon]) => [key,{icon}])) }];
  })),
  nodes: {},
};
/** Layering: default → kind → group → local node → exact node. */
export function resolvePassiveNodeVisual(context: PassiveNodeArtContext, config = PASSIVE_NODE_ART): PassiveNodeVisual | undefined {
  const kind = own(config.kinds,context.kind), group = own(config.groups,context.group ?? ''), exact = own(config.nodes,context.id);
  if (!kind && !group && !exact) return undefined;
  const local = own(group?.nodes ?? {},context.localId ?? context.id);
  const meaning=context.node && !context.group?.startsWith('vocation:') ? passiveNodeMeaning(context.node) : undefined;
  const branch=meaning ? PASSIVE_BRANCH_THEMES[meaning.theme] : undefined;
  const semantic:Partial<PassiveNodeVisual>=branch && meaning && context.node ? {icon:meaning.icon,silhouette:branch.silhouette,theme:meaning.theme,source:meaning.source,author:branch.author,
    ...STANDARD_RANK_ART[context.node.kind],
    palette:{accent:branch.color,ink:passiveNodeTint(branch.color,'#fff4df',.7),dark:passiveNodeTint(branch.color,'#090e18',.86)}} : {};
  const value = { ...config.defaults,...semantic, ...kind, ...group?.defaults, ...local, ...exact };
  const styles = [config.defaults,semantic,kind,group?.defaults,local,exact].flatMap(layer => layer?.style ? [layer.style] : []);
  if (styles.length) value.style = Object.assign({},...styles);
  if (!own(ICON_SUBJECTS,value.icon)) value.icon = config.defaults.icon;
  if (!own(PASSIVE_NODE_SILHOUETTES,value.silhouette)) value.silhouette = 'circle';
  return value;
}
