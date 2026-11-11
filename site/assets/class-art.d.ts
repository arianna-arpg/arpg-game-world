/** Shared original-art catalogue. Paths remain relative to site/. */
export interface ClassArtwork {
  readonly src: string;
  readonly alt: string;
  readonly position?: string;
}
export const CLASS_ART: Readonly<Record<string, ClassArtwork>>;
export function getClassArtwork(id: string | undefined): ClassArtwork;
