import { ICON_SUBJECTS, type IconLayer } from '../render/skillIconArt';
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
/** Shared by passive trees and authoring previews. Output is decorative;
 * the caller retains the original circle as the sole input/tooltip target. */
export function passiveNodeArt(x: number, y: number, radius: number, visual: PassiveNodeVisual,
  state: PassiveNodeArtState = {}): string {
  const style:PassiveNodeStyle={...PASSIVE_NODE_STATE_STYLES[state.allocated?'learned':'unlearned'],...visual.style};
  const silhouette = style.silhouette === 'theme' ? visual.silhouette : style.silhouette;
  const shape = PASSIVE_NODE_SILHOUETTES[silhouette] ?? PASSIVE_NODE_SILHOUETTES.circle;
  const accent = state.refund ? '#cf92f0' : visual.palette.accent;
  const ink = style.palette === 'vocation' ? visual.palette.ink : '#fff4df';
  const dark = style.palette === 'contrast' ? '#07090e' : visual.palette.dark;
  const rim = state.allocated || state.available ? ink : passiveNodeTint(accent,'#d8d4dc',.28);
  const face = style.material === 'enamel' ? passiveNodeTint(accent,dark,state.allocated ? .38 : .7) : dark;
  const symbol = state.allocated || style.palette !== 'vocation' ? ink : passiveNodeTint(accent,ink,.65);
  const layers = ICON_SUBJECTS[visual.icon] as IconLayer[];
  const glyph = layers.map(layer => {
    const solid = !!layer.fill, outline = style.symbols === 'outline', bold = style.symbols === 'bold';
    // Keep open-stroke objects (bows, ribs, clocks) visible in every mode.
    if (bold && !solid && layers.some(l => l.fill)) return '';
    const fill = solid && !outline ? symbol : 'none';
    const stroke = solid ? symbol : (outline || !layers.some(l => l.fill) ? symbol : dark);
    return `<path d="${layer.path}" fill="${fill}" stroke="${stroke}" stroke-width="${outline ? 1.9 : solid ? .85 : layer.width ?? 1.5}"/>`;
  }).join('');
  const choice = state.choice ? 'stroke-dasharray="3.5 2.4"' : '';
  const metal = style.material === 'engraved';
  const inner = style.material === 'luminous' ? accent : metal ? passiveNodeTint(accent,ink,.25) : ink;
  const inlay = PASSIVE_RIM_INLAYS[visual.inlay ?? 'plain'];
  return `<g class="passive-node-art" data-passive-icon="${esc(visual.icon)}" data-passive-shape="${esc(silhouette)}" data-passive-material="${esc(style.material)}"
    data-passive-theme="${esc(visual.theme ?? 'vocation')}" data-passive-symbol-source="${esc(visual.source ?? 'authored')}"
    data-passive-author="${esc(visual.author)}" data-passive-state="${state.refund ? 'refund' : state.allocated ? 'allocated' : state.available ? 'available' : state.locked ? 'locked' : 'inactive'}"
    pointer-events="none" aria-hidden="true" transform="translate(${x-radius} ${y-radius}) scale(${radius/12})">
    <path d="${shape.path}" fill="${dark}" stroke="#080c13" stroke-width="${Math.min(4,72/radius)}"/>
    <path class="passive-node-rim" d="${shape.path}" fill="${face}" stroke="${rim}" stroke-width="${state.allocated || state.available ? 1.8 : 1.2}" ${choice}/>
    <path d="${shape.path}" transform="translate(12 12) scale(.83) translate(-12 -12)" fill="${metal ? dark : 'none'}" stroke="${inner}" stroke-width="${style.material === 'luminous' ? 1.1 : .65}" opacity="${style.material === 'luminous' ? .85 : .45}"/>
    ${style.material === 'enamel' ? `<path d="M7 5Q12 2 17 5L12 7Z" fill="${ink}" opacity=".2"/>` : ''}
    ${inlay ? `<path data-passive-inlay="${visual.inlay}" d="${inlay}" fill="${rim}" stroke="${dark}" stroke-width=".65"/>` : ''}
    <g transform="translate(12 ${state.allocated ? 11.2 : 12}) scale(${state.keystone ? .57 : .6}) translate(-12 -12)" stroke-linejoin="round" stroke-linecap="round">${glyph}</g>
    ${state.allocated ? `<path class="passive-node-earned" d="M9.8 20l1.5 1.4 3-3" fill="none" stroke="${ink}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${state.available ? `<path d="M8 2.8L12 1.2L16 2.8" fill="none" stroke="${ink}" stroke-width="1.5"/>` : ''}
  </g>`;
}
