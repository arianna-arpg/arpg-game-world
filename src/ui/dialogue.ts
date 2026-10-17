import { DIALOGUE_CFG } from '../data/dialogue';
import { MONSTERS } from '../data/monsters';
import { DialogueSession, type DialogueOffer } from '../engine/dialogue';
import type { DialogueActions } from '../engine/dialogueActions';
import type { NpcSpeechLine, World } from '../engine/world';
import { isTypingTarget } from '../core/input';
import { keyDisplay, type Settings } from '../meta/settings';
import { padDisplay } from '../core/gamepad';
import { liveActorPortrait } from '../render/actorPortrait';
import { drawPortraitInto } from '../render/vis/portrait';
import { resolveSpeech, revealedChars } from '../render/vis/speech';
import { VIS_CFG } from '../render/vis/visConfig';
import { UI_SCALE_CFG } from './uiScale';
import { seatDialogue } from './dialogueLayout';
import { Z_LADDER } from './zorder';

/** Provenance accompanies commands so future outcomes can attribute the answer. */
export interface DialogueActionContext {
  world: World;
  ownerId: string;
  speakerId: number;
  offerKey: string;
  nodeId?: string;
  choiceId: string;
}

export interface DialogueWorkspace {
  readonly active: boolean;
  readonly choosing: boolean;
  sync(world: World, speakerId: number): void;
  reset(): void;
  back(): void;
}

interface DialogueHost {
  createWorkspace?: (root: HTMLElement, changed: () => void) => DialogueWorkspace;
  ownerChanged?: (id: number | null, conversationWorkspace: boolean) => void;
  settings: () => Settings;
  padActive: () => boolean;
  hudTop: () => number | undefined;
  conversationTopFloor?: () => number;
  resolveText: (text: string) => string;
  actions: DialogueActions<DialogueActionContext>;
  available: () => boolean;
}

/** A non-modal reader. Movement stays live; leaving focus ends the exchange.
 * Text and portrait use the existing speech/portrait fabrics. No NPC ids,
 * rewards or quest logic belong in this surface. */
export class DialogueUI {
  readonly root: HTMLElement;
  readonly session = new DialogueSession();
  private readonly portrait: HTMLCanvasElement;
  private readonly title: HTMLElement;
  private readonly ink: HTMLElement;
  private readonly rest: HTMLElement;
  private readonly accessible: HTMLElement;
  private readonly next: HTMLButtonElement;
  private readonly progress: HTMLElement;
  private readonly choices: HTMLElement;
  private readonly status: HTMLElement;
  private readonly conversationWorkspace?: DialogueWorkspace;
  private refreshConversation = false;
  private choiceSignature = '';
  private world: World | null = null;
  private scene = -1;
  private available = false;
  private pageKey = '';
  private elapsed = 0;
  private lastTime = 0;
  private revealed = false;
  private fullPage = '';
  private heldKeys = new Set<string>();

  constructor(private host: DialogueHost) {
    const style = document.createElement('style');
    style.textContent = `
      .npc-dialogue { position:fixed; box-sizing:border-box; left:50%; transform:translateX(-50%);
        display:flex; flex-direction:column;
        z-index:${Z_LADDER.panel}; color:#eee0c4; padding:12px 18px 10px;
        border:1px solid #b29762; border-radius:5px; background:linear-gradient(120deg,#28251ff7,#17191ffb);
        box-shadow:0 12px 48px #000b,inset 0 0 0 4px #111319,inset 0 0 0 5px #74634466;
        font-family:Verdana,sans-serif; cursor:var(--cursor-point,pointer); }
      .npc-dialogue[hidden] { display:none; }
      .npc-dialogue::before { content:''; position:absolute; inset:9px; border:1px solid #b297622a; pointer-events:none; }
      .dialogue-layout { display:grid; grid-template-columns:minmax(0,1fr) ${DIALOGUE_CFG.portraitSize}px; gap:16px; flex:1; min-height:0; overflow-y:auto; }
      .dialogue-name { position:relative; margin:0 32px 5px 0; color:var(--speaker-ink,#d8b87a);
        font:600 15px/1.4 Verdana,sans-serif; letter-spacing:.3px; flex-shrink:0; }
      .dialogue-page { margin:0; min-height:0; font:${DIALOGUE_CFG.fontSize}px/${DIALOGUE_CFG.lineHeight} Georgia,serif;
        overflow-wrap:anywhere; white-space:pre-wrap; cursor:var(--cursor-point,pointer); }
      .dialogue-unread { visibility:hidden; }
      .dialogue-portrait { align-self:center; border:1px solid #a58a535e; padding:5px; border-radius:3px;
        background:radial-gradient(ellipse at 50% 55%,#60513255,#11151ccc 73%); box-shadow:inset 0 0 0 3px #14151a; }
      .dialogue-portrait canvas { display:block; width:100%; height:auto; }
      .npc-dialogue[data-workspace=true] .dialogue-portrait,.npc-dialogue[data-choosing=true] .dialogue-portrait { align-self:start; position:sticky; top:0; }
      .dialogue-footer { display:flex; gap:16px; align-items:center; margin-top:6px; min-height:28px; flex-shrink:0; }
      .dialogue-progress { color:#b5a68a; font:11px Verdana,sans-serif; flex:1; }
      .npc-dialogue button { font:12px Verdana,sans-serif; color:#eee0c4; cursor:var(--cursor-point,pointer);
        background:#74603b33; border:1px solid #9d845377; border-radius:3px; padding:7px 12px; }
      .npc-dialogue button:hover,.npc-dialogue button:focus-visible { background:#a58a5350; border-color:#d6bc7b; outline:1px solid #d6bc7b; }
      .npc-dialogue .dialogue-close { position:absolute; right:17px; top:14px; padding:2px 7px; color:#c4b697; background:transparent; border-color:transparent; }
      .dialogue-accessible { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); }
      .dialogue-choices { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,${DIALOGUE_CFG.choiceMinWidth}px),1fr)); gap:6px; margin-top:8px; }
      .dialogue-choices[hidden], .dialogue-next[hidden] { display:none; }
      .dialogue-choices button { text-align:left; white-space:normal; overflow-wrap:anywhere; }
      .dialogue-choices button:disabled { opacity:.6; cursor:default; }
      .dialogue-status { color:#e0be8a; font:11px/1.4 Verdana,sans-serif; }
      .dialogue-status:empty { display:none; }
      .npc-dialogue[data-compact=true] .dialogue-layout { grid-template-columns:minmax(0,1fr) 80px; gap:12px; }
      .npc-dialogue[data-compact=true] .dialogue-page { font-size:16px; }
    `;
    document.head.appendChild(style);
    this.root = document.createElement('section');
    this.root.id = 'npc-dialogue';
    this.root.className = `npc-dialogue ${UI_SCALE_CFG.markerClass}`;
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'false');
    this.root.setAttribute('aria-labelledby', 'npc-dialogue-title');
    this.root.innerHTML = `<button class="dialogue-close" type="button" aria-label="Close dialogue (Escape)">×</button>
      <h2 class="dialogue-name" id="npc-dialogue-title"></h2><div class="dialogue-layout"><div>
      <p class="dialogue-page" aria-hidden="true"><span class="dialogue-ink"></span><span class="dialogue-unread"></span></p>
      <div class="dialogue-accessible" aria-live="polite" aria-atomic="true"></div>
      <div class="dialogue-choices" role="group" aria-label="Responses" hidden></div>
      <div class="dialogue-status" role="status"></div><div class="conversation-workspace"></div></div>
      <div class="dialogue-portrait"><canvas aria-hidden="true"></canvas></div></div>
      <div class="dialogue-footer"><span class="dialogue-progress"></span><button class="dialogue-next" type="button"></button></div>`;
    document.body.appendChild(this.root);
    const get = <T extends Element>(selector: string): T => this.root.querySelector<T>(selector)!;
    this.portrait = get('canvas'); this.title = get('.dialogue-name');
    this.ink = get('.dialogue-ink'); this.rest = get('.dialogue-unread');
    this.accessible = get('.dialogue-accessible'); this.next = get('.dialogue-next');
    this.progress = get('.dialogue-progress');
    this.choices = get('.dialogue-choices'); this.status = get('.dialogue-status');
    this.conversationWorkspace = host.createWorkspace?.(get('.conversation-workspace'), () => { this.refreshConversation = true; });
    this.next.onclick = () => this.advance();
    get<HTMLButtonElement>('.dialogue-close').onclick = () => this.close();
    // One surface gesture, including portrait, heading and margins. Nested
    // controls own their click; it must never also advance the conversation.
    this.root.addEventListener('click', event => {
      if (event.button !== 0 || !(event.target instanceof Element)
        || event.target.closest('button,a,input,select,textarea,[role="button"],.dialogue-choices')) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && this.root.contains(selection.anchorNode)) return;
      if (!this.conversationWorkspace?.active) this.advance();
    });
    this.root.addEventListener('pointerdown', event => event.stopPropagation());
    // Capture the bound advance before gameplay sees it. Autorepeat stays
    // consumed through keyup even if the final press closed the dialogue.
    window.addEventListener('keydown', event => {
      const code = event.code || event.key;
      if (isTypingTarget(event.target)) return;
      if (this.choosing && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)
        && (!(event.target instanceof Element) || this.root.contains(event.target)
          || !event.target.closest('button,a,select,summary,[role="button"]'))) {
        const buttons = [...(this.conversationWorkspace?.choosing ? this.root : this.choices).querySelectorAll<HTMLButtonElement>('button:not(:disabled)')].filter(b => b.offsetWidth > 0);
        const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
          : at < 0 ? (event.key === 'ArrowUp' ? buttons.length - 1 : 0)
          : (at + (event.key === 'ArrowUp' ? -1 : 1) + buttons.length) % buttons.length;
        event.preventDefault(); event.stopImmediatePropagation(); this.heldKeys.add(code);
        buttons[index]?.focus(); return;
      }
      const control = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (!this.heldKeys.has(code) && this.open && control && this.root.contains(control)
        && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (!event.repeat) { this.heldKeys.add(code); control.click(); }
        return;
      }
      // Focused controls own native activation, including explicit response
      // choices. The advance button alone shares the bound advance gesture.
      if (!this.heldKeys.has(code) && event.target instanceof Element
        && event.target.closest('button,a,select,summary,[role="button"]')
        && !event.target.closest('.dialogue-next')) return;
      if (!this.heldKeys.has(code) && (!this.open || event.key.toLowerCase() !== this.host.settings().keybinds.dialogueAdvance)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat && !this.heldKeys.has(code)) {
        this.heldKeys.add(code);
        this.advance();
      }
    }, true);
    window.addEventListener('keyup', event => this.heldKeys.delete(event.code || event.key), true);
    window.addEventListener('blur', () => this.heldKeys.clear());
  }

  get open(): boolean { return !this.root.hidden; }
  get choosing(): boolean { return this.open && (!!this.conversationWorkspace?.choosing || this.revealed && this.session.awaitingChoice); }

  /** Seat before DOM hit-testing as well as after rendering a new page. */
  syncLayout(): void {
    seatDialogue(this.root, this.host.hudTop(), !!this.conversationWorkspace?.active, this.host.conversationTopFloor?.());
  }

  setAvailable(available: boolean): void {
    this.available = available;
    this.root.hidden = !available || !this.session.reading;
    this.host.ownerChanged?.(this.session.reading?.offer.speakerId ?? null, !!this.conversationWorkspace?.active);
    if (!this.session.reading) this.conversationWorkspace?.reset();
  }

  private finish(offer: DialogueOffer | null): void {
    if (offer) this.world?.finishNpcDialogue(offer.speakerId);
  }

  reset(): void {
    this.conversationWorkspace?.reset(); this.refreshConversation = false; this.host.ownerChanged?.(null, false);
    this.session.reset(); this.world = null; this.scene = -1; this.pageKey = '';
    this.root.hidden = true;
    this.choiceSignature = ''; this.choices.replaceChildren(); this.status.textContent = '';
  }

  sync(world: World, line: NpcSpeechLine | null, focusId: number | null): void {
    if (world !== this.world || this.scene !== world.dialogueScene) {
      this.reset(); this.world = world; this.scene = world.dialogueScene; this.lastTime = world.time;
    }
    const offer = this.available && line
      ? world.npcDialogues.readerOffer(line.a, line.text, DIALOGUE_CFG.pageChars, this.host.resolveText) : null;
    this.finish(this.session.sync(focusId, offer));
    if (this.refreshConversation && offer) { this.session.refreshOffer(offer); this.refreshConversation = false; }
    const dt = Math.max(0, Math.min(0.1, world.time - this.lastTime));
    this.lastTime = world.time;
    this.setAvailable(this.available);
    if (!this.open) return;
    const reading = this.session.reading!;
    const actor = world.actors.find(a => a.id === reading.offer.speakerId && !a.dead);
    if (!actor) { this.close(); return; }
    const key = String(this.session.revision);
    if (this.pageKey !== key) {
      this.pageKey = key; this.elapsed = 0; this.revealed = false;
      this.fullPage = this.session.node!.pages[reading.page];
      this.accessible.textContent = this.fullPage;
      this.status.textContent = '';
    } else this.elapsed += dt;
    this.title.textContent = actor.name;
    this.root.dataset.speakerId = String(actor.id);
    if (line) this.root.style.setProperty('--speaker-ink', line.color);
    const tune = resolveSpeech(VIS_CFG.speech, actor.defId ? MONSTERS[actor.defId]?.speech : undefined);
    const count = this.revealed || !this.host.settings().speechTyping || tune.typingOff
      ? this.fullPage.length : revealedChars(this.fullPage, this.elapsed, tune.typing);
    this.revealed = count >= this.fullPage.length;
    this.ink.textContent = this.fullPage.slice(0, count);
    this.rest.textContent = this.fullPage.slice(count);
    this.conversationWorkspace?.sync(world, actor.id);
    this.renderControls();
    this.syncLayout();
    const px = Math.round(DIALOGUE_CFG.portraitSize * VIS_CFG.portrait.oversample);
    if (this.portrait.width !== px) this.portrait.width = this.portrait.height = px;
    drawPortraitInto(this.portrait, liveActorPortrait(actor), world.time);
  }

  advance(): void {
    if (!this.open || !this.pageKey) return;
    if (this.conversationWorkspace?.active) { this.conversationWorkspace.back(); this.renderControls(); return; }
    if (!this.revealed) {
      this.revealed = true; this.ink.textContent = this.fullPage; this.rest.textContent = ''; this.renderControls();
    } else if (!this.session.awaitingChoice) {
      this.finish(this.session.advance()); this.pageKey = ''; this.setAvailable(this.available);
    }
  }

  private renderControls(): void {
    const reading = this.session.reading, node = this.session.node;
    if (!reading || !node || !this.world) return;
    const settings = this.host.settings();
    const bind = this.host.padActive() ? padDisplay(settings.padBinds.dialogueAdvance) : keyDisplay(settings.keybinds.dialogueAdvance);
    const workspaceActive = !!this.conversationWorkspace?.active;
    this.root.dataset.workspace = String(workspaceActive);
    this.root.querySelector<HTMLElement>('.dialogue-page')!.hidden = workspaceActive;
    const choosing = !workspaceActive && this.revealed && this.session.awaitingChoice;
    this.root.dataset.choosing = String(choosing);
    this.next.hidden = choosing;
    this.next.textContent = `${this.revealed ? this.session.hasNext() ? 'Continue' : 'Finish' : 'Reveal'}  ›${bind ? `  ${bind}` : ''}`;
    if (workspaceActive) this.next.textContent = 'Back';
    this.progress.textContent = workspaceActive ? '' : choosing ? 'Choose a response' : node.pages.length > 1 ? `${reading.page + 1} / ${node.pages.length}` : '';
    this.choices.hidden = !choosing;
    const rows = choosing ? (node.choices ?? []).map(choice => ({ choice,
      reason: this.session.choiceRefusal(choice.id) ?? (choice.action ? this.host.actions.refusal(this.actionContext(choice.id), choice.action) : null),
    })) : [];
    const revision = this.session.revision;
    const signature = JSON.stringify([revision, rows]);
    if (signature === this.choiceSignature) return;
    this.choiceSignature = signature;
    const focused = this.choices.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.dialogueChoice : undefined;
    this.choices.replaceChildren();
    for (const { choice, reason } of rows) {
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.dialogueChoice = choice.id;
      button.textContent = choice.label + (reason ? ` — ${reason}` : '');
      button.disabled = reason !== null;
      button.addEventListener('click', () => this.choose(choice.id, revision));
      this.choices.appendChild(button);
      if (focused === choice.id && !button.disabled) button.focus({ preventScroll: true });
    }
  }

  private actionContext(choiceId: string): DialogueActionContext {
    const reading = this.session.reading!;
    return { world: this.world!, ownerId: this.world!.localSeat.id,
      speakerId: reading.offer.speakerId, offerKey: reading.offer.key, nodeId: reading.node, choiceId };
  }

  private choose(id: string, revision: number): void {
    const world = this.world, reading = this.session.reading;
    if (!this.open || !this.revealed || !world || !reading || !this.host.available()
      || this.scene !== world.dialogueScene || world.player.dead || world.player.downed
      || !world.actors.some(actor => actor.id === reading.offer.speakerId && !actor.dead)) return;
    const context = this.actionContext(id);
    const result = this.session.choose(id, revision, action => this.host.actions.run(context, action));
    if (!result) {
      this.status.textContent = 'That response is no longer available.';
      this.renderControls(); return;
    }
    this.finish(result.ended); this.pageKey = ''; this.setAvailable(this.host.available());
    // Retire old response buttons immediately, including two clicks in one frame.
    this.choices.replaceChildren(); this.choiceSignature = '';
  }

  close(): boolean {
    if (!this.session.reading) return false;
    this.finish(this.session.close()); this.pageKey = ''; this.setAvailable(this.available);
    return true;
  }
}
