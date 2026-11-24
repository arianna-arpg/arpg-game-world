import type { Actor } from '../engine/actor';
import type { SkillInstance } from '../engine/skills';
import { TIP_CFG, tooltipHtml, type TooltipContent } from './tooltip';

interface SlotRect { slot: number; x: number; y: number; w: number; h: number }

/** The canvas owns every click. This read-only card follows its published slot rectangles. */
export class HotbarTooltip {
  private readonly card = document.createElement('div');
  private pointer: { x: number; y: number } | null = null;
  private actor: Actor | null = null;
  private slot = -1;
  private skillId = '';
  private revealAt = 0;
  private refreshAt = 0;
  private html = '';
  private placedAt?: SlotRect;
  private viewportWidth = 0;

  constructor(canvas: HTMLCanvasElement,
    private slotAt: (x: number, y: number) => SlotRect | null,
    private inspectingActor: () => Actor | null,
    private describe: (actor: Actor, skill: SkillInstance) => TooltipContent) {
    this.card.id = 'hotbar-tooltip';
    this.card.className = 'tooltip tt-beside-picker hidden';
    this.card.setAttribute('role', 'tooltip');
    document.body.append(this.card);

    const leave = () => { this.pointer = null; this.clear(); };
    const track = (e: PointerEvent) => {
      if (!e.isTrusted) return; // A controller's synthetic menu pointer cannot inspect the play surface.
      if (e.pointerType !== 'mouse' || e.buttons) { leave(); return; }
      this.pointer = { x: e.clientX, y: e.clientY };
      if (this.slot >= 0 && this.slotAt(e.clientX, e.clientY)?.slot !== this.slot) this.clear();
    };
    canvas.addEventListener('pointerenter', track);
    canvas.addEventListener('pointermove', track);
    canvas.addEventListener('pointerup', track);
    canvas.addEventListener('pointerdown', leave);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointercancel', leave);
    window.addEventListener('blur', leave);
    canvas.addEventListener('wheel', e => {
      if (!this.html || this.card.scrollHeight <= this.card.clientHeight) return;
      const step = e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? this.card.clientHeight
        : e.deltaMode === WheelEvent.DOM_DELTA_LINE ? parseFloat(getComputedStyle(this.card).lineHeight) : 1;
      this.card.scrollTop += e.deltaY * step;
      e.preventDefault();
    }, { passive: false });
  }

  clear(): void {
    if (this.slot < 0) return;
    this.card.classList.add('hidden');
    this.actor = null;
    this.slot = -1;
    this.html = '';
    this.placedAt = undefined;
  }

  update(now: number): void {
    const rect = this.pointer && this.slotAt(this.pointer.x, this.pointer.y);
    const actor = rect && this.inspectingActor();
    const skill = actor && actor.skills[rect.slot];
    if (!actor || !rect || !skill) { this.clear(); return; }
    if (this.slot !== rect.slot || this.actor !== actor || this.skillId !== skill.def.id) {
      this.clear();
      this.actor = actor;
      this.slot = rect.slot;
      this.skillId = skill.def.id;
      this.revealAt = now + TIP_CFG.intentMs;
      this.refreshAt = this.revealAt;
    }
    if (now < this.revealAt) return;

    // Re-read the live build only while inspected; steady numbers incur no DOM writes.
    if (now >= this.refreshAt) {
      this.refreshAt = now + TIP_CFG.liveRefreshMs;
      const content = this.describe(actor, skill);
      const html = tooltipHtml(content);
      if (html !== this.html || this.card.classList.contains('tt-wide') !== !!content.wide) {
        const opening = !this.html;
        this.html = html;
        this.card.innerHTML = html;
        this.card.classList.toggle('tt-wide', !!content.wide);
        this.card.classList.remove('hidden');
        if (opening) this.card.scrollTop = 0;
        this.placedAt = undefined;
      }
    }
    const old = this.placedAt;
    if (old && old.x === rect.x && old.y === rect.y && old.w === rect.w && this.viewportWidth === innerWidth) return;
    this.placedAt = rect;
    this.viewportWidth = innerWidth;
    const bottom = rect.y - TIP_CFG.pad;
    this.card.style.setProperty('--tt-space', Math.max(0, bottom - TIP_CFG.edge) + 'px');
    const bounds = this.card.getBoundingClientRect();
    const left = Math.min(rect.x + (rect.w - bounds.width) / 2, innerWidth - bounds.width - TIP_CFG.edge);
    this.card.style.left = Math.max(TIP_CFG.edge, left) + 'px';
    this.card.style.top = Math.max(TIP_CFG.edge, bottom - bounds.height) + 'px';
  }
}
