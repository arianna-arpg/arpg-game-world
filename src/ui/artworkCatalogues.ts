/// <reference types="vite/client" />
import { CLASS_ART } from '../../site/assets/class-art.js';
import { VOCATION_SCENES } from '../../site/assets/vocation-scenes.js';

export interface ArtworkImage {
  readonly src: string;
  readonly alt: string;
}

export interface ArtworkEntry extends ArtworkImage {
  readonly variants?: Readonly<Record<string, ArtworkImage | undefined>>;
}

export type ArtworkCatalogues = Readonly<Record<string,
  Readonly<Record<string, ArtworkEntry | undefined>> | undefined>>;

/** Adapt the authoritative site catalogues without duplicating image choices
 * or changing eligibility. Any additional catalogue can use the same contract. */
export const ARTWORK_CATALOGUES: ArtworkCatalogues = {
  class: CLASS_ART,
  vocation: Object.fromEntries(VOCATION_SCENES.map(scene => [scene.id, {
    src: scene.src, alt: scene.alt, variants: scene.artworkByClass,
  }])),
};

// URL imports package originals for desktop/offline and relative-base web builds.
// Only the displayed image is requested. Headless panel probes need no Vite API.
const artworkUrls: Record<string, string> = typeof document === 'undefined' ? {} : import.meta.glob<string>([
  '../../site/assets/art/classes/*.webp',
  '../../site/assets/art/berserker.webp',
  '../../site/assets/art/vocations/*.webp',
], { eager: true, query: '?url', import: 'default' });

export function artworkUrl(source: string): string | undefined {
  // Website revision queries become Vite's content-hashed filenames.
  return artworkUrls['../../site/' + source.split('?')[0]];
}
