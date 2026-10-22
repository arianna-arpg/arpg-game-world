import assert from 'node:assert/strict';
import { loadingPresentation } from '../src/loading/presentation';

// A controllable browser clock proves that elapsed timers cannot substitute for
// an actual visible paint opportunity. No native receipt or runtime is mocked.
const names = ['document', 'requestAnimationFrame', 'cancelAnimationFrame'] as const;
const previous = names.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
let hidden = false, serial = 0;
const frames = new Map<number, FrameRequestCallback>(), listeners = new Set<() => void>();
const doc = {
  get hidden() { return hidden; },
  addEventListener(type: string, listener: () => void) { assert.equal(type, 'visibilitychange'); listeners.add(listener); },
  removeEventListener(type: string, listener: () => void) { assert.equal(type, 'visibilitychange'); assert(listeners.delete(listener)); },
};
const set = (name: string, value: unknown) => Object.defineProperty(globalThis, name, { configurable: true, value });
const frame = () => { const callbacks = [...frames.values()]; frames.clear(); for (const callback of callbacks) callback(0); };
const visibility = (value: boolean) => { hidden = value; for (const listener of [...listeners]) listener(); };
try {
  set('document', doc);
  set('requestAnimationFrame', (callback: FrameRequestCallback) => { const id = ++serial; frames.set(id, callback); return id; });
  set('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  let finished = false;
  const visible = loadingPresentation().then(() => { finished = true; });
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(finished, false, 'a visible tab cannot be acknowledged by the old timer fallback');
  frame(); await Promise.resolve(); assert.equal(finished, false, 'one frame is not two paint opportunities');
  frame(); await visible; assert.equal(finished, true); assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
  console.log('PASS visible presentation waits for two actual frames, not elapsed timers');

  visibility(true); await loadingPresentation(); assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
  for (const delivered of [0, 1]) {
    visibility(false); const pending = loadingPresentation(); if (delivered) frame();
    visibility(true); await pending; assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
  }
  console.log('PASS hidden-before and hidden-during preparation resolve and clean both listeners and frames');

  visibility(false); const first = loadingPresentation(); frame();
  let secondFinished = false; const second = loadingPresentation().then(() => { secondFinished = true; });
  frame(); await first; assert.equal(secondFinished, false); assert.equal(listeners.size, 1);
  frame(); await second; assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
  console.log('PASS overlapping presentation waits keep independent frame ownership');
} finally {
  names.forEach((name, index) => { const descriptor = previous[index]; if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); });
}
