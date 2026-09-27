import type { DialogueAction } from './dialogueActions';

export interface DialogueChoice {
  id: string;
  label: string;
  /** Omit to finish the exchange after acceptance. */
  next?: string;
  action?: DialogueAction;
  disabledReason?: string;
}

export interface DialogueNode {
  pages: readonly string[];
  choices?: readonly DialogueChoice[];
}

/** Optional authored responses at the end of the introductory text. */
export interface DialogueResponses {
  choices: readonly DialogueChoice[];
  nodes?: Readonly<Record<string, DialogueNode>>;
}

/** A reader-paced conversation, independent of DOM, World and input device.
 * Offers can come from generated speech, quest text or an authored sequence. */
export interface DialogueOffer extends DialogueNode {
  speakerId: number;
  key: string;
  nodes?: Readonly<Record<string, DialogueNode>>;
}

export interface DialogueReading {
  offer: DialogueOffer;
  page: number;
  node?: string;
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
  /** Changes only with reading transitions; stale buttons cannot answer a new node. */
  revision = 0;
  private choosing = false;
  private focus: number | null = null;
  private heard = new Set<string>();
  private pending: DialogueOffer | null = null;

  get node(): DialogueNode | null {
    const r = this.reading;
    return r ? (r.node !== undefined ? r.offer.nodes?.[r.node] ?? null : r.offer) : null;
  }

  get awaitingChoice(): boolean {
    return !!this.reading && !!this.node?.choices?.length && this.reading.page === this.node.pages.length - 1;
  }

  /** Returns the conversation that ended on a departure/selection change.
   * Expiry of an offer alone never takes a page away from its reader. */
  sync(focus: number | null, offer: DialogueOffer | null): DialogueOffer | null {
    let ended: DialogueOffer | null = null;
    if (focus !== this.focus) {
      ended = this.reading?.offer ?? null;
      this.reading = null; this.pending = null; this.heard.clear(); this.focus = focus;
      this.revision++;
    }
    if (!offer || offer.speakerId !== focus || !offer.pages.length) return ended;
    if (this.heard.has(offer.key)) { this.pending = null; return ended; }
    if (!this.reading) { this.reading = { offer, page: 0 }; this.revision++; }
    else if (offer.key !== this.reading.offer.key) this.pending = offer;
    else this.pending = null;
    return ended;
  }

  /** A changed functional prompt waits behind the page being read. Only the
   * latest state is kept, so completed lessons never queue stale directions. */
  hasNext(): boolean {
    return !!this.reading && !this.awaitingChoice && (this.reading.page + 1 < this.node!.pages.length || !!this.pending);
  }

  advance(): DialogueOffer | null {
    if (!this.reading || this.awaitingChoice || this.choosing) return null;
    if (this.reading.page + 1 < this.node!.pages.length) { this.reading.page++; this.revision++; return null; }
    if (this.pending) {
      this.heard.add(this.reading.offer.key);
      this.reading = { offer: this.pending, page: 0 }; this.pending = null; this.revision++; return null;
    }
    return this.close();
  }

  choiceRefusal(id: string): string | null {
    const choices = this.node?.choices?.filter(c => c.id === id) ?? [];
    if (!this.awaitingChoice || choices.length !== 1) return 'This response is unavailable.';
    const choice = choices[0];
    if (choice.disabledReason) return choice.disabledReason;
    if (choice.next !== undefined && !this.reading?.offer.nodes?.[choice.next]?.pages.length) return 'This response is unavailable.';
    return null;
  }

  /** One explicit selection, checked against the exact node that was drawn.
   * Unknown/disabled/stale actions never finish, branch or execute effects. */
  choose(id: string, revision: number, perform: (action: DialogueAction) => boolean): { ended: DialogueOffer | null } | null {
    if (this.choosing || revision !== this.revision || this.choiceRefusal(id) !== null) return null;
    const choice = this.node!.choices!.find(c => c.id === id)!;
    this.choosing = true;
    try {
      if (choice.action && !perform(choice.action)) return null;
      // A command may replace the world or close this exchange itself.
      if (revision !== this.revision || !this.reading) return { ended: null };
      if (choice.next !== undefined) {
        this.reading = { offer: this.reading.offer, node: choice.next, page: 0 };
        this.revision++; return { ended: null };
      }
      return { ended: this.close() };
    } finally { this.choosing = false; }
  }

  close(): DialogueOffer | null {
    const ended = this.reading?.offer ?? null;
    if (ended) this.heard.add(ended.key);
    if (this.pending) this.heard.add(this.pending.key);
    this.reading = null; this.pending = null;
    this.revision++;
    return ended;
  }

  reset(): void { this.reading = null; this.pending = null; this.heard.clear(); this.focus = null; this.revision++; }
}
