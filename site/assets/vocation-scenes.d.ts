/** Original Vocation art and copy, with paths relative to site/. */
export interface VocationArtwork {
  readonly src: string;
  readonly alt: string;
}

export interface VocationScene extends VocationArtwork {
  readonly id: string;
  readonly name: string;
  readonly style: string;
  readonly title: string;
  readonly description: string;
  readonly secret?: boolean;
  readonly classIds: readonly string[];
  readonly unlockKey: string;
  readonly artworkByClass?: Readonly<Record<string, VocationArtwork | undefined>>;
}

export const VOCATION_SCENES: readonly VocationScene[];
export function visibleVocations(entries: readonly VocationScene[], options?: {
  classId?: string | null;
  unlockedVocationIds?: readonly string[] | null;
  revealSecrets?: boolean;
}): VocationScene[];
