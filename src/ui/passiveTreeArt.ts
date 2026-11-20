import { ARTWORK_CATALOGUES, artworkUrl } from './artworkCatalogues';
import { STAR_CENTER } from '../data/passives';
import { esc } from './dom';
import { PASSIVE_TREE_ART_CFG } from './passiveTreeArtConfig';
import { selectPassiveTreeArtwork, type PassiveTreeArtContext } from './passiveTreeArtSelection';

/** Opening focus follows the configured default anchor, keeping the hub and
 * nearby starting nodes in view. Per-image art offsets do not move the camera. */
export function passiveTreeArtAnchor(start: { x: number; y: number },
  anchor: 'hub' | 'class-start' = PASSIVE_TREE_ART_CFG.defaults.anchor): { x: number; y: number } {
  return anchor === 'hub' ? STAR_CENTER : start;
}

/** Decoration shares the nodes' coordinate system, so panning and zooming
 * move the painting with the Star. It never participates in hit testing. */
export function passiveTreeArtSvg(context: PassiveTreeArtContext,
  start: { x: number; y: number } | undefined, realm: string, editor: boolean): string {
  const cfg = PASSIVE_TREE_ART_CFG;
  if (!cfg.enabled || !start || !cfg.realms.includes(realm) || (editor && !cfg.showInEditor)) return '';
  const art = selectPassiveTreeArtwork(context, cfg, ARTWORK_CATALOGUES, artworkUrl);
  const style = art?.style ?? cfg.defaults;
  const { anchor, width, height, offsetX, offsetY, opacity, fadeStart, saturation,
    haloRadius, haloOpacity, ringRadius, ringOpacity } = style;
  const origin = passiveTreeArtAnchor(start, anchor);
  const x = origin.x + offsetX - width / 2, y = origin.y + offsetY - height / 2;
  const accent = esc(context.color);
  // One shared passive panel owns these defs, including when its couch owner changes.
  return `<g class="passive-tree-art" data-art-catalogue="${esc(art?.catalogue ?? '')}" data-art-id="${esc(art?.id ?? '')}"
      data-art-variant="${esc(art?.variant ?? '')}" aria-hidden="true" pointer-events="none"
      style="--tree-art-search-opacity:${cfg.searchOpacity}">
    <defs>
      <radialGradient id="passive-art-fade">
        <stop offset="${fadeStart}" stop-color="white"/>
        <stop offset="0.76" stop-color="white" stop-opacity="0.65"/>
        <stop offset="1" stop-color="white" stop-opacity="0"/>
      </radialGradient>
      <mask id="passive-art-mask" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${width}" height="${height}" style="mask-type:alpha">
        <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="url(#passive-art-fade)"/>
      </mask>
      <radialGradient id="passive-art-halo">
        <stop stop-color="${accent}"/>
        <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${art ? `<image class="passive-tree-art-image" href="${esc(art.url)}" x="${x}" y="${y}" width="${width}" height="${height}"
      preserveAspectRatio="xMidYMid slice" opacity="${opacity}" mask="url(#passive-art-mask)" style="filter:saturate(${saturation})"/>` : ''}
    <circle cx="${start.x}" cy="${start.y}" r="${haloRadius}" fill="url(#passive-art-halo)" opacity="${haloOpacity}"/>
    <circle cx="${start.x}" cy="${start.y}" r="${ringRadius}" fill="none" stroke="${accent}"
      stroke-width="1" stroke-dasharray="2 9" opacity="${ringOpacity}"/>
  </g>`;
}
