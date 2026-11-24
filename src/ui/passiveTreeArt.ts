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
  const cx = origin.x + offsetX, cy = origin.y + offsetY;
  const rx = width / 2, ry = height / 2;
  const x = cx - rx, y = cy - ry;
  const accent = esc(context.color);
  // One shared passive panel owns these defs, including when its couch owner changes.
  // Analytical ellipse clip + radial vignette avoids Skia's multi-megapixel offscreen
  // alpha-<mask> saveLayer at deep zoom (34x faster rasterization).
  return `<g class="passive-tree-art" data-art-catalogue="${esc(art?.catalogue ?? '')}" data-art-id="${esc(art?.id ?? '')}"
      data-art-variant="${esc(art?.variant ?? '')}" aria-hidden="true" pointer-events="none"
      style="--tree-art-search-opacity:${cfg.searchOpacity}">
    <defs>
      <clipPath id="passive-art-clip">
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>
      </clipPath>
      <radialGradient id="passive-art-vignette">
        <stop offset="${fadeStart}" stop-color="#0c1519" stop-opacity="0"/>
        <stop offset="0.76" stop-color="#0c1519" stop-opacity="0.35"/>
        <stop offset="1" stop-color="#0c1519" stop-opacity="1"/>
      </radialGradient>
      <radialGradient id="passive-art-halo">
        <stop stop-color="${accent}"/>
        <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${art ? `<image class="passive-tree-art-image" href="${esc(art.url)}" x="${x}" y="${y}" width="${width}" height="${height}"
      preserveAspectRatio="xMidYMid slice" opacity="${opacity}" clip-path="url(#passive-art-clip)" style="filter:saturate(${saturation})"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx + 1}" ry="${ry + 1}" fill="url(#passive-art-vignette)"/>` : ''}
    <circle cx="${start.x}" cy="${start.y}" r="${haloRadius}" fill="url(#passive-art-halo)" opacity="${haloOpacity}"/>
    <circle cx="${start.x}" cy="${start.y}" r="${ringRadius}" fill="none" stroke="${accent}"
      stroke-width="1" stroke-dasharray="2 9" opacity="${ringOpacity}"/>
  </g>`;
}
