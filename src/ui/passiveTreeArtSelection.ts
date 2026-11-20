import type { ArtworkCatalogues, ArtworkImage } from './artworkCatalogues';
import type { PassiveTreeArtConfig, PassiveTreeArtStyle } from './passiveTreeArtConfig';

export interface PassiveTreeArtContext {
  /** Eligible identities supplied by the panel owner, grouped by catalogue. */
  subjects: Readonly<Record<string, readonly string[] | undefined>>;
  /** Optional image variant, such as the character's base-class identity. */
  variant?: string;
  color: string;
}

export interface PassiveTreeArtwork {
  catalogue: string;
  id: string;
  variant?: string;
  url: string;
  alt: string;
  style: PassiveTreeArtStyle;
}

function own<T>(entries: Readonly<Record<string, T | undefined>> | undefined, id: string): T | undefined {
  return entries && Object.hasOwn(entries, id) ? entries[id] : undefined;
}

/** Pure presentation selection. No knowledge of classes, Vocations, account
 * unlocks or saves: adding a source is catalogue + context + configuration. */
export function selectPassiveTreeArtwork(context: PassiveTreeArtContext,
  config: PassiveTreeArtConfig, catalogues: ArtworkCatalogues,
  urlFor: (source: string) => string | undefined): PassiveTreeArtwork | undefined {
  for (const source of config.sources) {
    const catalogue = own(catalogues, source.catalogue);
    const subjects = own(context.subjects, source.catalogue) ?? [];
    const ids = source.order === 'last' ? [...subjects].reverse() : subjects;
    for (const id of ids) {
      const entry = own(catalogue, id);
      if (!entry) continue;
      const variant = context.variant === undefined ? undefined : own(entry.variants, context.variant);
      const images: { image: ArtworkImage; variant?: string }[] = variant
        ? [{ image: variant, variant: context.variant }, { image: entry }]
        : [{ image: entry }];
      for (const candidate of images) {
        const url = urlFor(candidate.image.src);
        if (!url) continue;
        return {
          catalogue: source.catalogue, id, variant: candidate.variant,
          url, alt: candidate.image.alt,
          style: { ...config.defaults, ...source.style, ...own(config.artworks, `${source.catalogue}:${id}`) },
        };
      }
    }
  }
  return undefined;
}
