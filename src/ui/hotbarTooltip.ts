import { replaceAbilityPanelHtml } from '../render/abilityArtwork';
import type { Actor } from '../engine/actor';
import type { SkillInstance } from '../engine/skills';
import type { World } from '../engine/world';
import { OrbReadout, type GuardDial, type HudOrb, type OrbReadoutKey } from './orbReadout';
import { TIP_CFG, tooltipHtml, type TooltipContent } from './tooltip';

interface HudRect { x: number; y: number; w: number; h: number; tooltipY?: number }
type HoverTarget = HudRect & ({ slot: number } | { orb: HudOrb; guard?: GuardDial });
const targetKey = (target: HoverTarget) => 'slot' in target ? target.slot : target.guard ?? target.orb;

/** A read-only card for the drawn skill slots and resource orbs. The canvas keeps the pointer. */
export class HotbarTooltip {
  private readonly card = document.createElement('div');
  private hasPointer = false;
  private pointerX = 0;
  private pointerY = 0;
  private actor: Actor | null = null;
  private target: number | OrbReadoutKey | null = null;
  private mouseDown = false;
  private orbReadout?: OrbReadout;
  private skillId = '';
  private revealAt = 0;
  private refreshAt = 0;
  private html = '';
  private placedAt?: HudRect;
  private viewportWidth = 0;

  constructor(canvas: HTMLCanvasElement,
    private inspectAt: (x: number, y: number) => { world: World; target: HoverTarget } | null,
    private describe: (actor: Actor, skill: SkillInstance) => TooltipContent,
    private clusters?: () => readonly HudRect[]) {
    this.card.id = 'hotbar-tooltip';
    this.card.className = 'tooltip tt-beside-picker hidden';
    this.card.setAttribute('role', 'tooltip');
    this.card.style.transformOrigin = 'bottom left';
    document.body.append(this.card);

    const leave = () => { this.hasPointer = false; this.clear(); };
    const track = (e: PointerEvent) => {
      if (!e.isTrusted) return; // A controller's synthetic menu pointer cannot inspect the play surface.
      if (e.pointerType !== 'mouse') { leave(); return; }
      this.mouseDown = e.buttons !== 0;
      this.hasPointer = true;
      this.pointerX = e.clientX;
      this.pointerY = e.clientY;
      if (this.target !== null) {
        const hit = this.inspectAt(e.clientX, e.clientY);
        if (!hit || hit.world.localSeat.actor !== this.actor || targetKey(hit.target) !== this.target) this.clear();
      }
    };
    canvas.addEventListener('pointerenter', track);
    canvas.addEventListener('pointermove', track);
    canvas.addEventListener('pointerup', track);
    canvas.addEventListener('pointerdown', track);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointercancel', leave);
    window.addEventListener('blur', leave);
    canvas.addEventListener('wheel', e => {
      if (!this.placedAt || this.card.scrollHeight <= this.card.clientHeight) return;
      const step = e.deltaMode === WheelEvent.DOM_DELTA_PAGE ? this.card.clientHeight
        : e.deltaMode === WheelEvent.DOM_DELTA_LINE ? parseFloat(getComputedStyle(this.card).lineHeight) : 1;
      this.card.scrollTop += e.deltaY * step;
      e.preventDefault();
    }, { passive: false });
  }

  clear(): void {
    if (this.target === null) return;
    this.card.classList.add('hidden');
    this.actor = null;
    this.target = null;
    this.orbReadout = undefined;
    this.html = '';
    this.placedAt = undefined;
  }

  update(now: number): void {
    if (!this.hasPointer) { this.clear(); return; }
    if (this.target === null && this.clusters) {
      const rects = this.clusters();
      let near = false;
      const px = this.pointerX, py = this.pointerY;
      for (let i = 0; i < rects.length; i++) {
        const c = rects[i];
        if (px >= c.x - 140 && px <= c.x + c.w + 140 && py >= c.y - 140 && py <= c.y + c.h + 140) {
          near = true;
          break;
        }
      }
      if (!near) return;
    }
    const hit = this.inspectAt(this.pointerX, this.pointerY);
    if (!hit) { this.clear(); return; }
    const { world, target: rect } = hit;
    const actor = world.localSeat.actor;
    const key = targetKey(rect);
    const skill = typeof key === 'number' ? actor.skills[key] : null;
    if (typeof key === 'number' && !skill) { this.clear(); return; }
    const skillId = skill?.def.id ?? '';
    if (this.target !== key || this.actor !== actor || this.skillId !== skillId) {
      this.clear();
      this.actor = actor;
      this.target = key;
      this.skillId = skillId;
      this.revealAt = now + TIP_CFG.hudIntentMs;
      this.refreshAt = this.revealAt;
    }
    if (now < this.revealAt) return;

    // A skill press clears the view for casting without restarting the hover clock.
    // An orb remains readable even while a mouse-bound skill is held.
    if (skill && this.mouseDown) {
      if (this.placedAt) {
        this.card.classList.add('hidden');
        this.placedAt = undefined;
      }
      return;
    }
    if (typeof key !== 'number') {
      if (!this.orbReadout) {
        this.orbReadout = new OrbReadout(this.card, key);
        this.card.classList.remove('tt-wide');
      }
      this.orbReadout.update(actor, world);
    } else if (skill && now >= this.refreshAt) {
      this.refreshAt = now + TIP_CFG.liveRefreshMs;
      const content = this.describe(actor, skill);
      const html = tooltipHtml(content);
      if (html !== this.html || this.card.classList.contains('tt-wide') !== !!content.wide) {
        const opening = !this.html;
        this.html = html;
        replaceAbilityPanelHtml(this.card,html);
        this.card.classList.toggle('tt-wide', !!content.wide);
        if (opening) this.card.scrollTop = 0;
        this.placedAt = undefined;
      }
    }
    const old = this.placedAt;
    if (old && old.x === rect.x && old.y === rect.y && old.w === rect.w && this.viewportWidth === innerWidth) return;
    this.card.classList.remove('hidden');
    this.placedAt = rect;
    this.viewportWidth = innerWidth;
    const bottom = (rect.tooltipY ?? rect.y) - TIP_CFG.pad;
    this.card.style.setProperty('--tt-space', Math.max(0, bottom - TIP_CFG.edge) + 'px');
    const bounds = this.card.getBoundingClientRect();
    const left = Math.min(rect.x + (rect.w - bounds.width) / 2, innerWidth - bounds.width - TIP_CFG.edge);
    this.card.style.left = Math.max(TIP_CFG.edge, left) + 'px';
    this.card.style.bottom = (innerHeight - bottom) + 'px';
  }
}
