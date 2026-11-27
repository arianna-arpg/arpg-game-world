import { Rng } from '../core/rng';
import { RUNESCRIPT } from '../data/runescript';
import { runeFieldProfile, type RuneFieldSpec } from '../render/runeField';
import { observeAmbientMotion } from './ambientMotion';
export { RUNE_FIELD_ACTIVITY } from '../render/runeField';

interface RuneSlot {
  el: HTMLSpanElement;
  text: Text;
  effect: KeyframeEffect;
  animation: Animation;
  glyph: number;
  duration: number;
}

/** A reusable, bounded population. Only birth/retirement/settings events touch
 * the DOM; native animations interpolate between them. No per-frame JS, timers,
 * game RNG or ever-growing particle list. Each completed, invisible glyph gets
 * a fresh letter, position, path and lifetime before its next appearance. */
export class RuneField {
  readonly spec: RuneFieldSpec;
  private readonly rng = new Rng(crypto.getRandomValues(new Uint32Array(1))[0]);
  private readonly motion = matchMedia('(prefers-reduced-motion: reduce)');
  private reduced = this.motion.matches;
  private slots: RuneSlot[] = [];
  private visible = false;
  private paused = false;
  private disposed = false;
  private births = 0;
  private activity: number;
  private profile: ReturnType<typeof runeFieldProfile>;

  constructor(readonly el: HTMLElement, activity?: number) {
    this.spec = JSON.parse(el.dataset.runeField!) as RuneFieldSpec;
    this.activity = activity ?? this.spec.activity;
    this.profile = runeFieldProfile(this.spec, this.activity);
    // Captured preview markup may contain old presentation children.
    el.replaceChildren();
    this.motion.addEventListener('change', this.sync);
    this.setActivity(this.activity);
  }

  private get isRunning(): boolean {
    return !this.disposed && this.visible && !this.paused && !this.reduced;
  }

  get status() {
    return { ...this.profile, births: this.births,
      running: this.isRunning,
      reduced: this.reduced };
  }

  setVisible(visible: boolean): void { this.visible = visible; this.sync(); }
  setPaused(paused: boolean): void { this.paused = paused; this.sync(); }

  setActivity(requested: number): void {
    if (this.disposed) return;
    const prior = this.profile;
    const next = runeFieldProfile(this.spec, requested);
    this.profile = next;
    this.activity = next.activity;
    while (this.slots.length > next.count) {
      const slot = this.slots.pop()!;
      slot.animation.onfinish = null;
      slot.animation.cancel(); slot.el.remove();
    }
    // Preserve each existing glyph and its lifetime fraction when pace changes.
    for (const slot of this.slots) {
      const oldDuration = slot.duration;
      const progress = Math.min(.999, Number(slot.animation.currentTime ?? 0) / oldDuration);
      const duration = oldDuration * next.seconds[0] / prior.seconds[0];
      slot.duration = duration;
      slot.effect.updateTiming({ duration });
      if (!this.reduced) slot.animation.currentTime = progress * duration;
    }
    if (this.slots.length < next.count) {
      const frag = document.createDocumentFragment();
      while (this.slots.length < next.count) {
        const el = document.createElement('span'); el.className = 'rune-field-mote runescript';
        const text = document.createTextNode('');
        el.appendChild(text);
        frag.appendChild(el);
        const effect = new KeyframeEffect(el, [], { duration: 1, iterations: 1, fill: 'none' });
        const slot: RuneSlot = { el, text, effect, animation: new Animation(effect, document.timeline), glyph: -1, duration: 1 };
        slot.animation.onfinish = () => { if (this.isRunning) this.birth(slot); };
        this.slots.push(slot);
        this.birth(slot, true);
      }
      this.el.appendChild(frag);
    }
    this.sync();
  }

  private birth(slot: RuneSlot, stagger = false): void {
    const sample = (range: readonly [number, number]): number => this.rng.range(range[0], range[1]);
    // Uniform among the other letters, so consecutive births visibly differ.
    const pick = this.rng.int(0, RUNESCRIPT.length - (slot.glyph < 0 ? 1 : 2));
    slot.glyph = slot.glyph >= 0 && pick >= slot.glyph ? pick + 1 : pick;
    slot.text.data = RUNESCRIPT[slot.glyph].rune;
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
    const duration = sample(this.profile.seconds) * 1000;
    slot.duration = duration;
    slot.effect.updateTiming({ duration });
    this.births++;
    if (this.reduced) { slot.animation.cancel(); return; }
    slot.animation.currentTime = stagger ? this.rng.range(.02, .9) * duration : 0;
    if (this.isRunning) slot.animation.play(); else slot.animation.pause();
  }

  private readonly sync = (): void => {
    if (this.disposed) return;
    const reduced = this.motion.matches;
    this.reduced = reduced;
    const still = String(reduced);
    if (this.el.dataset.runeStill !== still) this.el.dataset.runeStill = still;
    const running = this.isRunning;
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (reduced) slot.animation.cancel();
      else if (running) {
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
