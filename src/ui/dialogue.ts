import { DIALOGUE_CFG } from '../data/dialogue';
import { MONSTERS } from '../data/monsters';
import { DialogueSession, dialoguePages, type DialogueOffer } from '../engine/dialogue';
import type { NpcSpeechLine, World } from '../engine/world';
import { isTypingTarget } from '../core/input';
import { keyDisplay, type Settings } from '../meta/settings';
import { padDisplay } from '../core/gamepad';
import { liveActorPortrait } from '../render/actorPortrait';
import { drawPortraitInto } from '../render/vis/portrait';
import { resolveSpeech, revealedChars } from '../render/vis/speech';
import { VIS_CFG } from '../render/vis/visConfig';
import { UI_SCALE_CFG, uiScaleNow } from './uiScale';
import { Z_LADDER } from './zorder';

interface DialogueHost {
  settings: () => Settings;
  padActive: () => boolean;
  hudTop: () => number | undefined;
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
        z-index:${Z_LADDER.panel}; color:#eee0c4; padding:20px 24px 16px;
        border:1px solid #b29762; border-radius:5px; background:linear-gradient(120deg,#28251ff7,#17191ffb);
        box-shadow:0 12px 48px #000b,inset 0 0 0 4px #111319,inset 0 0 0 5px #74634466;
        font-family:Verdana,sans-serif; }
      .npc-dialogue[hidden] { display:none; }
      .npc-dialogue::before { content:''; position:absolute; inset:9px; border:1px solid #b297622a; pointer-events:none; }
      .dialogue-layout { display:grid; grid-template-columns:minmax(0,1fr) ${DIALOGUE_CFG.portraitSize}px; gap:24px; }
      .dialogue-name { position:relative; margin:0 32px 12px 0; color:var(--speaker-ink,#d8b87a);
        font:600 15px/1.4 Verdana,sans-serif; letter-spacing:.3px; }
      .dialogue-page { margin:0; min-height:5em; font:${DIALOGUE_CFG.fontSize}px/${DIALOGUE_CFG.lineHeight} Georgia,serif;
        overflow-wrap:anywhere; white-space:pre-wrap; cursor:var(--cursor-point,pointer); }
      .dialogue-unread { visibility:hidden; }
      .dialogue-portrait { align-self:center; border:1px solid #a58a535e; padding:5px; border-radius:3px;
        background:radial-gradient(ellipse at 50% 55%,#60513255,#11151ccc 73%); box-shadow:inset 0 0 0 3px #14151a; }
      .dialogue-portrait canvas { display:block; width:100%; height:auto; }
      .dialogue-footer { display:flex; gap:16px; align-items:center; margin-top:12px; min-height:28px; }
      .dialogue-progress { color:#b5a68a; font:11px Verdana,sans-serif; flex:1; }
      .npc-dialogue button { font:12px Verdana,sans-serif; color:#eee0c4; cursor:var(--cursor-point,pointer);
        background:#74603b33; border:1px solid #9d845377; border-radius:3px; padding:7px 12px; }
      .npc-dialogue button:hover,.npc-dialogue button:focus-visible { background:#a58a5350; border-color:#d6bc7b; outline:1px solid #d6bc7b; }
      .npc-dialogue .dialogue-close { position:absolute; right:17px; top:14px; padding:2px 7px; color:#c4b697; background:transparent; border-color:transparent; }
      .dialogue-accessible { position:absolute; width:1px; height:1px; padding:0; overflow:hidden; clip-path:inset(50%); }
      .npc-dialogue[data-compact=true] { padding:16px; }
      .npc-dialogue[data-compact=true] .dialogue-layout { grid-template-columns:minmax(0,1fr) 80px; gap:12px; }
      .npc-dialogue[data-compact=true] .dialogue-page { font-size:16px; min-height:4em; }
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
      <div class="dialogue-layout"><div><h2 class="dialogue-name" id="npc-dialogue-title"></h2>
      <p class="dialogue-page" aria-hidden="true"><span class="dialogue-ink"></span><span class="dialogue-unread"></span></p>
      <div class="dialogue-accessible" aria-live="polite" aria-atomic="true"></div></div>
      <div class="dialogue-portrait"><canvas aria-hidden="true"></canvas></div></div>
      <div class="dialogue-footer"><span class="dialogue-progress"></span><button class="dialogue-next" type="button"></button></div>`;
    document.body.appendChild(this.root);
    const get = <T extends Element>(selector: string): T => this.root.querySelector<T>(selector)!;
    this.portrait = get('canvas'); this.title = get('.dialogue-name');
    this.ink = get('.dialogue-ink'); this.rest = get('.dialogue-unread');
    this.accessible = get('.dialogue-accessible'); this.next = get('.dialogue-next');
    this.progress = get('.dialogue-progress');
    this.next.onclick = () => this.advance();
    get<HTMLButtonElement>('.dialogue-close').onclick = () => this.close();
    get<HTMLElement>('.dialogue-page').onclick = () => this.advance();
    this.root.addEventListener('pointerdown', event => event.stopPropagation());
    // Capture the bound advance before gameplay sees it. Autorepeat stays
    // consumed through keyup even if the final press closed the dialogue.
    window.addEventListener('keydown', event => {
      const code = event.code || event.key;
      if (isTypingTarget(event.target)) return;
      if (!this.heldKeys.has(code) && (!this.open || event.key.toLowerCase() !== this.host.settings().keybinds.dialogueAdvance)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (!event.repeat && !this.heldKeys.has(code)) { this.heldKeys.add(code); this.advance(); }
    }, true);
    window.addEventListener('keyup', event => this.heldKeys.delete(event.code || event.key), true);
    window.addEventListener('blur', () => this.heldKeys.clear());
  }

  get open(): boolean { return !this.root.hidden; }

  setAvailable(available: boolean): void {
    this.available = available;
    this.root.hidden = !available || !this.session.reading;
  }

  private finish(offer: DialogueOffer | null): void {
    if (offer) this.world?.finishNpcDialogue(offer.speakerId);
  }

  reset(): void {
    this.session.reset(); this.world = null; this.scene = -1; this.pageKey = '';
    this.root.hidden = true;
  }

  sync(world: World, line: NpcSpeechLine | null, focusId: number | null): void {
    if (world !== this.world || this.scene !== world.dialogueScene) {
      this.reset(); this.world = world; this.scene = world.dialogueScene; this.lastTime = world.time;
    }
    const offer = this.available && line ? { speakerId: line.a.id, key: `${line.a.id}:${line.text}`,
      pages: dialoguePages(line.text, DIALOGUE_CFG.pageChars) } : null;
    this.finish(this.session.sync(focusId, offer));
    const dt = Math.max(0, Math.min(0.1, world.time - this.lastTime));
    this.lastTime = world.time;
    this.setAvailable(this.available);
    if (!this.open) return;
    const reading = this.session.reading!;
    const actor = world.actors.find(a => a.id === reading.offer.speakerId && !a.dead);
    if (!actor) { this.close(); return; }
    const key = `${reading.offer.key}:${reading.page}`;
    if (this.pageKey !== key) {
      this.pageKey = key; this.elapsed = 0; this.revealed = false;
      this.fullPage = reading.offer.pages[reading.page];
      this.accessible.textContent = this.fullPage;
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
    const settings = this.host.settings();
    const bind = this.host.padActive() ? padDisplay(settings.padBinds.dialogueAdvance) : keyDisplay(settings.keybinds.dialogueAdvance);
    this.next.textContent = `${this.revealed ? this.session.hasNext() ? 'Continue' : 'Finish' : 'Reveal'}  ›${bind ? `  ${bind}` : ''}`;
    this.progress.textContent = reading.offer.pages.length > 1 ? `${reading.page + 1} / ${reading.offer.pages.length}` : '';
    const scale = uiScaleNow(), edge = DIALOGUE_CFG.edge;
    const width = Math.min(DIALOGUE_CFG.width, (window.innerWidth - edge * 2) / scale);
    this.root.style.width = `${width}px`;
    this.root.dataset.compact = String(width < 600);
    // Seat above the live HUD. A short viewport may scroll the text surface,
    // but the root and all controls always stay inside the viewport.
    const bottom = Math.max(edge, window.innerHeight - (this.host.hudTop() ?? window.innerHeight) + DIALOGUE_CFG.hudGap);
    this.root.style.bottom = `${bottom / scale}px`;
    this.root.style.maxHeight = `${Math.max(100, (window.innerHeight - bottom - edge) / scale)}px`;
    this.root.style.overflowY = 'auto';
    const px = Math.round(DIALOGUE_CFG.portraitSize * VIS_CFG.portrait.oversample);
    if (this.portrait.width !== px) this.portrait.width = this.portrait.height = px;
    drawPortraitInto(this.portrait, liveActorPortrait(actor), world.time);
  }

  advance(): void {
    if (!this.open || !this.pageKey) return;
    if (!this.revealed) { this.revealed = true; this.ink.textContent = this.fullPage; this.rest.textContent = ''; }
    else { this.finish(this.session.advance()); this.pageKey = ''; this.setAvailable(this.available); }
  }

  close(): boolean {
    if (!this.session.reading) return false;
    this.finish(this.session.close()); this.pageKey = ''; this.root.hidden = true;
    return true;
  }
}
