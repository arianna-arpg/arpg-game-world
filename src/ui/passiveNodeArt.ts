import { ICON_SUBJECTS, type IconLayer } from '../render/skillIconArt';
import { PASSIVE_EMBLEM_MOTIFS } from '../data/passiveMajorEmblems';
import { PASSIVE_NODE_SILHOUETTES, PASSIVE_NODE_STATE_STYLES, PASSIVE_RIM_INLAYS, passiveNodeTint, type PassiveNodeStyle, type PassiveNodeVisual } from './passiveNodeConfig';

export interface PassiveNodeArtState {
  allocated?: boolean;
  available?: boolean;
  locked?: boolean;
  choice?: boolean;
  refund?: boolean;
  keystone?: boolean;
}
const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const fmt = (n: number): number => Math.round(n * 1000) / 1000;
const glyphMarkupCache = new Map<string, string>();
const nodeTemplateMemo = new WeakMap<PassiveNodeVisual, Map<number, { head: string; tail: string }>>();

function renderGlyphLayers(icon: PassiveNodeVisual['icon'], symbolsMode: PassiveNodeStyle['symbols'], symbol: string, dark: string): string {
  const key = `${icon}|${symbolsMode}|${symbol}|${dark}`;
  const cached = glyphMarkupCache.get(key);
  if (cached !== undefined) return cached;
  const layers = ICON_SUBJECTS[icon] as IconLayer[];
  const anyFill = layers.some(l => l.fill);
  const outline = symbolsMode === 'outline', bold = symbolsMode === 'bold';
  let html = '';
  let pendingStroke = '';
  let pendingWidth: number | null = null;
  let pendingPath = '';
  const flushStroke = (): void => {
    if (!pendingPath) return;
    html += `<path d="${pendingPath}" fill="none" stroke="${pendingStroke}" stroke-width="${pendingWidth}"/>`;
    pendingPath = '';
  };
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    const solid = !!layer.fill;
    // Keep open-stroke objects (bows, ribs, clocks) visible in every mode.
    if (bold && !solid && anyFill) continue;
    const fill = solid && !outline ? symbol : 'none';
    const stroke = solid ? symbol : (outline || !anyFill ? symbol : dark);
    const width = outline ? 1.9 : solid ? .85 : layer.width ?? 1.5;
    if (fill === 'none') {
      if (pendingPath && pendingStroke === stroke && pendingWidth === width) {
        pendingPath += ' ' + layer.path;
      } else {
        flushStroke();
        pendingStroke = stroke;
        pendingWidth = width;
        pendingPath = layer.path;
      }
    } else {
      flushStroke();
      html += `<path d="${layer.path}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
    }
  }
  flushStroke();
  glyphMarkupCache.set(key, html);
  return html;
}

/** Shared by passive trees and authoring previews. Output is decorative;
 * the caller retains the original circle as the sole input/tooltip target. */
export function passiveNodeArt(x: number, y: number, radius: number, visual: PassiveNodeVisual,
  state: PassiveNodeArtState = {}): string {
  const stateBits = (state.allocated ? 1 : 0) | (state.available ? 2 : 0) | (state.locked ? 4 : 0)
    | (state.choice ? 8 : 0) | (state.refund ? 16 : 0) | (state.keystone ? 32 : 0);
  const tplKey = radius * 64 + stateBits;
  let bucket = nodeTemplateMemo.get(visual);
  let tpl = bucket?.get(tplKey);
  if (!tpl) {
    const style:PassiveNodeStyle={...PASSIVE_NODE_STATE_STYLES[state.allocated?'learned':'unlearned'],...visual.style};
    const silhouette = style.silhouette === 'theme' ? visual.silhouette : style.silhouette;
    const shape = PASSIVE_NODE_SILHOUETTES[silhouette] ?? PASSIVE_NODE_SILHOUETTES.circle;
    const isCircle = silhouette === 'circle' || !PASSIVE_NODE_SILHOUETTES[silhouette];
    const accent = state.refund ? '#cf92f0' : visual.palette.accent;
    const ink = style.palette === 'vocation' ? visual.palette.ink : '#fff4df';
    const dark = style.palette === 'contrast' ? '#07090e' : visual.palette.dark;
    const rim = state.allocated || state.available ? ink : passiveNodeTint(accent,'#d8d4dc',.28);
    const face = style.material === 'enamel' ? passiveNodeTint(accent,dark,state.allocated ? .38 : .7) : dark;
    const symbol = state.allocated || style.palette !== 'vocation' ? ink : passiveNodeTint(accent,ink,.65);
    const glyph = renderGlyphLayers(visual.icon, style.symbols, symbol, dark);
    const choice = state.choice ? 'stroke-dasharray="3.5 2.4"' : '';
    const metal = style.material === 'engraved';
    const inner = style.material === 'luminous' ? accent : metal ? passiveNodeTint(accent,ink,.25) : ink;
    const inlay = PASSIVE_RIM_INLAYS[visual.inlay ?? 'plain'];
    const motif = visual.motif && Object.hasOwn(PASSIVE_EMBLEM_MOTIFS, visual.motif) ? PASSIVE_EMBLEM_MOTIFS[visual.motif] : undefined;
    const emblem = motif
      ? `<g data-passive-motif="${visual.motif}"><path d="${motif.path}" fill="none" stroke="${symbol}" stroke-width="2.3"/><g transform="${motif.subject}">${glyph}</g></g>`
      : glyph;
    const outerStrokeW = fmt(Math.min(4, 72 / radius));
    const rimStrokeW = state.allocated || state.available ? 1.8 : 1.2;
    const innerStrokeBase = style.material === 'luminous' ? 1.1 : .65;
    const innerOpacity = style.material === 'luminous' ? .85 : .45;
    const body = isCircle
      ? `<circle cx="12" cy="12" r="12" fill="${dark}" stroke="#080c13" stroke-width="${outerStrokeW}"/>` +
        `<circle class="passive-node-rim" cx="12" cy="12" r="12" fill="${face}" stroke="${rim}" stroke-width="${rimStrokeW}" ${choice}/>` +
        `<circle cx="12" cy="12" r="9.96" fill="${metal ? dark : 'none'}" stroke="${inner}" stroke-width="${fmt(innerStrokeBase * .83)}" opacity="${innerOpacity}"/>`
      : `<path d="${shape.path}" fill="${dark}" stroke="#080c13" stroke-width="${outerStrokeW}"/>` +
        `<path class="passive-node-rim" d="${shape.path}" fill="${face}" stroke="${rim}" stroke-width="${rimStrokeW}" ${choice}/>` +
        `<path d="${shape.path}" transform="translate(12 12) scale(.83) translate(-12 -12)" fill="${metal ? dark : 'none'}" stroke="${inner}" stroke-width="${innerStrokeBase}" opacity="${innerOpacity}"/>`;
    const head = `<g class="passive-node-art" data-passive-icon="${esc(visual.icon)}" data-passive-shape="${esc(silhouette)}" data-passive-material="${esc(style.material)}"
    data-passive-theme="${esc(visual.theme ?? 'vocation')}" data-passive-symbol-source="${esc(visual.source ?? 'authored')}"
    data-passive-author="${esc(visual.author)}" data-passive-state="${state.refund ? 'refund' : state.allocated ? 'allocated' : state.available ? 'available' : state.locked ? 'locked' : 'inactive'}"
    pointer-events="none" aria-hidden="true" transform="translate(`;
    const tail = `)">${body}${style.material === 'enamel' ? `<path d="M7 5Q12 2 17 5L12 7Z" fill="${ink}" opacity=".2"/>` : ''}${inlay ? `<path data-passive-inlay="${visual.inlay}" d="${inlay}" fill="${rim}" stroke="${dark}" stroke-width=".65"/>` : ''}<g transform="translate(12 ${state.allocated ? 11.2 : 12}) scale(${motif ? .65 : state.keystone ? .57 : .6}) translate(-12 -12)" stroke-linejoin="round" stroke-linecap="round">${emblem}</g>${state.allocated ? `<path class="passive-node-earned" d="M9.8 20l1.5 1.4 3-3" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}${state.available ? `<path d="M8 2.8L12 1.2L16 2.8" fill="none" stroke="${ink}" stroke-width="1.5"/>` : ''}</g>`;
    tpl = { head, tail };
    if (!bucket) { bucket = new Map(); nodeTemplateMemo.set(visual, bucket); }
    bucket.set(tplKey, tpl);
  }
  return `${tpl.head}${fmt(x - radius)} ${fmt(y - radius)}) scale(${fmt(radius / 12)}${tpl.tail}`;
}
