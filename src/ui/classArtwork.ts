/// <reference types="vite/client" />
import { CLASS_ART } from '../../site/assets/class-art.js';

// Import URL strings, not decoded images. Vite packages these original files
// for desktop/offline and relative-base web builds; only a displayed image is
// requested by the browser. The website remains the single identity catalogue.
// Headless probes import panel helpers without a browser or Vite's asset transform.
const artworkUrls: Record<string, string> = typeof document === 'undefined' ? {} : import.meta.glob<string>([
  '../../site/assets/art/classes/*.webp',
  '../../site/assets/art/berserker.webp',
], { eager: true, query: '?url', import: 'default' });

export function classArtworkUrl(classId: string): string | undefined {
  if (!Object.hasOwn(CLASS_ART, classId)) return undefined;
  // Website revision queries are replaced by Vite's content-hashed filenames.
  const source = CLASS_ART[classId].src.split('?')[0];
  return artworkUrls['../../site/' + source];
}
