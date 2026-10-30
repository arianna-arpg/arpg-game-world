/** Exact cursors for the two native load streams. This module records no
 * source identity or stage authority: callers must bind states to the same
 * installed generation/factory sources and resume the original operation
 * order. Four sampled `generationNext` values are witnesses, never cursors. */
import { Rng, withRngRandom } from '../core/rng';

export interface NativeAreaRandomState {
  readonly schema: 1;
  readonly algorithm: 'native-area-mulberry32-v1';
  readonly geometry: number;
  readonly ambient: number;
}

function copyState(raw: NativeAreaRandomState): NativeAreaRandomState {
  if (!raw || Object.getPrototypeOf(raw) !== Object.prototype) throw Error('Invalid native area random state');
  const keys = Reflect.ownKeys(raw);
  if (keys.length !== 4 || keys.some(k => typeof k !== 'string' || !['schema','algorithm','geometry','ambient'].includes(k)))
    throw Error('Invalid native area random state fields');
  const values: Record<string, unknown> = Object.create(null);
  for (const key of ['schema','algorithm','geometry','ambient']) {
    const d = Object.getOwnPropertyDescriptor(raw,key);
    if (!d || !d.enumerable || !Object.hasOwn(d,'value')) throw Error('Native area random state must be own data');
    values[key] = d.value;
  }
  if (values.schema !== 1 || values.algorithm !== 'native-area-mulberry32-v1') throw Error('Unsupported native area random state');
  const geometry = Rng.fromState(values.geometry as number).snapshot();
  const ambient = Rng.fromState(values.ambient as number).snapshot();
  return Object.freeze({schema:1,algorithm:'native-area-mulberry32-v1',geometry,ambient});
}

/** One owner for an explicit geometry Rng and the transitive Math.random
 * stream. Capture is draw-free inside or outside a scope. The callback's Rng
 * is borrowed for synchronous work; callers must not retain/use it afterward.
 * Failed operations keep their consumed cursors; rollback is caller policy. */
export class NativeAreaRandom {
  private geometry: Rng;
  private ambient: Rng;
  private active = false;

  constructor(geometrySeed: number, ambientSeed: number) {
    this.geometry = new Rng(geometrySeed);
    this.ambient = new Rng(ambientSeed);
  }

  static fromState(raw: NativeAreaRandomState): NativeAreaRandom {
    const state = copyState(raw);
    const owner = new NativeAreaRandom(1,1);
    // Restore cursors directly, including a zero cursor, without seed remap.
    owner.geometry = Rng.fromState(state.geometry);
    owner.ambient = Rng.fromState(state.ambient);
    return owner;
  }

  snapshot(): Readonly<NativeAreaRandomState> {
    return Object.freeze({schema:1,algorithm:'native-area-mulberry32-v1',
      geometry:this.geometry.snapshot(),ambient:this.ambient.snapshot()});
  }

  run<T>(fn: (geometry: Rng) => T): T {
    if (typeof fn !== 'function' || Object.prototype.toString.call(fn) === '[object AsyncFunction]'
      || Object.prototype.toString.call(fn) === '[object AsyncGeneratorFunction]'
      || Object.prototype.toString.call(fn) === '[object GeneratorFunction]') throw Error('Native area random work must be synchronous');
    if (this.active) throw Error('Native area random owner is already active');
    this.active = true;
    try { return withRngRandom(this.ambient,()=>fn(this.geometry)); }
    finally { this.active = false; }
  }
}

export function restoreNativeAreaRandomState(raw: NativeAreaRandomState): Readonly<NativeAreaRandomState> {
  return copyState(raw);
}
