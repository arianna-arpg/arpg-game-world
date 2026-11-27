import { Rng } from '../core/rng';
import { RUNESCRIPT } from '../data/runescript';
import { runeFieldProfile, type RuneFieldSpec } from '../render/runeField';
import { observeAmbientMotion } from './ambientMotion';
export { RUNE_FIELD_ACTIVITY } from '../render/runeField';

interface RuneSlot {
  el: HTMLSpanElement;
  effect: KeyframeEffect;
  animation: Animation;
  glyph: number;
}

/** A reusable, bounded population. Only birth/retirement/settings events touch
 * the DOM; native animations interpolate between them. No per-frame JS, timers,
 * game RNG or ever-growing particle list. Each completed, invisible glyph gets
 * a fresh letter, position, path and lifetime before its next appearance. */
export class RuneField {
  readonly spec: RuneFieldSpec;
  private readonly rng = new Rng(crypto.getRandomValues(new Uint32Array(1))[0]);
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private slots: RuneSlot[] = [];
  private visible = false;
  private paused = false;
  private disposed = false;
  private births = 0;
  private activity: number;

  constructor(readonly el: HTMLElement, activity?: number) {
    this.spec = JSON.parse(el.dataset.runeField!) as RuneFieldSpec;
    this.activity = activity ?? this.spec.activity;
    // Captured preview markup may contain old presentation children.
    el.replaceChildren();
    this.motion.addEventListener('change', this.sync);
    this.setActivity(this.activity);
  }

  get status() {
    return { ...runeFieldProfile(this.spec, this.activity), births: this.births,
      running: !this.disposed && this.visible && !this.paused && !this.motion.matches,
      reduced: this.motion.matches };
  }

  setVisible(visible: boolean): void { this.visible = visible; this.sync(); }
  setPaused(paused: boolean): void { this.paused = paused; this.sync(); }

  setActivity(requested: number): void {
    if (this.disposed) return;
    const prior = runeFieldProfile(this.spec, this.activity);
    const next = runeFieldProfile(this.spec, requested);
    this.activity = next.activity;
    while (this.slots.length > next.count) {
      const slot = this.slots.pop()!;
      slot.animation.onfinish = null;
      slot.animation.cancel(); slot.el.remove();
    }
    // Preserve each existing glyph and its lifetime fraction when pace changes.
    for (const slot of this.slots) {
      const oldDuration = Number(slot.effect.getTiming().duration);
      const progress = Math.min(.999, Number(slot.animation.currentTime ?? 0) / oldDuration);
      const duration = oldDuration * next.seconds[0] / prior.seconds[0];
      slot.effect.updateTiming({ duration });
      if (!this.motion.matches) slot.animation.currentTime = progress * duration;
    }
    while (this.slots.length < next.count) {
      const el = document.createElement('span'); el.className = 'rune-field-mote runescript';
      this.el.appendChild(el);
      const effect = new KeyframeEffect(el, [], { duration: 1, iterations: 1, fill: 'none' });
      const slot: RuneSlot = { el, effect, animation: new Animation(effect, document.timeline), glyph: -1 };
      slot.animation.onfinish = () => { if (this.status.running) this.birth(slot); };
      this.slots.push(slot);
      this.birth(slot, true);
    }
    this.sync();
  }

  private birth(slot: RuneSlot, stagger = false): void {
    const sample = (range: readonly [number, number]): number => this.rng.range(range[0], range[1]);
    // Uniform among the other letters, so consecutive births visibly differ.
    const pick = this.rng.int(0, RUNESCRIPT.length - (slot.glyph < 0 ? 1 : 2));
    slot.glyph = slot.glyph >= 0 && pick >= slot.glyph ? pick + 1 : pick;
    slot.el.textContent = RUNESCRIPT[slot.glyph].rune;
    slot.el.style.left = `${this.rng.range(5, 91)}%`;
    slot.el.style.top = `${this.rng.range(7, 91)}%`;
    slot.el.style.setProperty('--rune-size', `${sample(this.spec.size)}px`);
    const alpha = sample(this.spec.alpha);
    slot.el.style.setProperty('--rune-alpha', String(alpha));
    const end = `translate(${sample(this.spec.travelX)}px,${sample(this.spec.travelY)}px) rotate(${this.rng.range(-9, 9)}deg)`;
    slot.effect.setKeyframes([
      { offset: 0, opacity: 0, transform: 'translate(0,0) rotate(0deg)' },
      { offset: .24, opacity: alpha },
      { offset: .62, opacity: alpha * .7 },
      { offset: 1, opacity: 0, transform: end },
    ]);
    const duration = sample(runeFieldProfile(this.spec, this.activity).seconds) * 1000;
    slot.effect.updateTiming({ duration });
    this.births++;
    if (this.motion.matches) { slot.animation.cancel(); return; }
    slot.animation.currentTime = stagger ? this.rng.range(.02, .9) * duration : 0;
    if (this.status.running) slot.animation.play(); else slot.animation.pause();
  }

  private readonly sync = (): void => {
    if (this.disposed) return;
    this.el.dataset.runeStill = String(this.motion.matches);
    for (const slot of this.slots) {
      if (this.motion.matches) slot.animation.cancel();
      else if (this.status.running) {
        if (slot.animation.playState === 'idle' || slot.animation.playState === 'finished') this.birth(slot, true);
        else slot.animation.play();
      } else if (slot.animation.playState !== 'idle') slot.animation.pause();
    }
  };

  dispose(): void {
    this.disposed = true;
    this.motion.removeEventListener('change', this.sync);
    for (const slot of this.slots) { slot.animation.onfinish = null; slot.animation.cancel(); slot.el.remove(); }
    this.slots = [];
  }
}

/** Game and preview share both the renderer and its visibility/lifetime law. */
export function mountRuneFields(root: HTMLElement, extraTargets: readonly HTMLElement[] = [], activity?: number) {
  const fields = [...root.querySelectorAll<HTMLElement>('.rune-field')].map(el => new RuneField(el, activity));
  const byElement = new Map(fields.map(field => [field.el, field]));
  const stop = observeAmbientMotion([...byElement.keys(), ...extraTargets], (target, visible) => byElement.get(target)?.setVisible(visible));
  return {
    fields,
    setActivity: (value: number) => fields.forEach(field => field.setActivity(value)),
    setPaused: (value: boolean) => fields.forEach(field => field.setPaused(value)),
    dispose: () => { stop(); fields.forEach(field => field.dispose()); },
  };
}
