/** A reader-paced conversation, independent of DOM, World and input device.
 * Offers can come from generated speech, quest text or an authored sequence. */
export interface DialogueOffer {
  speakerId: number;
  key: string;
  pages: readonly string[];
}

export interface DialogueReading {
  offer: DialogueOffer;
  page: number;
}

/** Blank lines are authored page breaks; automatic breaks preserve words.
 * Very long tokens are kept intact (the UI wraps them visually). */
export function dialoguePages(text: string, limit: number): string[] {
  const pages: string[] = [];
  for (const paragraph of text.trim().split(/\n\s*\n/)) {
    let page = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (page && page.length + word.length + 1 > Math.max(1, limit)) {
        pages.push(page); page = '';
      }
      page += (page ? ' ' : '') + word;
    }
    if (page) pages.push(page);
  }
  return pages;
}

export class DialogueSession {
  reading: DialogueReading | null = null;
  private focus: number | null = null;
  private dismissed = false;
  private pending: DialogueOffer | null = null;

  /** Returns the conversation that ended on a departure/selection change.
   * Expiry of an offer alone never takes a page away from its reader. */
  sync(focus: number | null, offer: DialogueOffer | null): DialogueOffer | null {
    let ended: DialogueOffer | null = null;
    if (focus !== this.focus) {
      ended = this.reading?.offer ?? null;
      this.reading = null; this.pending = null; this.dismissed = false; this.focus = focus;
    }
    if (!offer || offer.speakerId !== focus || this.dismissed || !offer.pages.length) return ended;
    if (!this.reading) this.reading = { offer, page: 0 };
    else if (offer.key !== this.reading.offer.key) this.pending = offer;
    else this.pending = null;
    return ended;
  }

  /** A changed functional prompt waits behind the page being read. Only the
   * latest state is kept, so completed lessons never queue stale directions. */
  hasNext(): boolean {
    return !!this.reading && (this.reading.page + 1 < this.reading.offer.pages.length || !!this.pending);
  }

  advance(): DialogueOffer | null {
    if (!this.reading) return null;
    if (this.reading.page + 1 < this.reading.offer.pages.length) { this.reading.page++; return null; }
    if (this.pending) { this.reading = { offer: this.pending, page: 0 }; this.pending = null; return null; }
    return this.close();
  }

  close(): DialogueOffer | null {
    const ended = this.reading?.offer ?? null;
    this.reading = null; this.pending = null; this.dismissed = true;
    return ended;
  }

  reset(): void { this.reading = null; this.pending = null; this.dismissed = false; this.focus = null; }
}
