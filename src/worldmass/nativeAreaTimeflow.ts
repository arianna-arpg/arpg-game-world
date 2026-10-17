import {TIME_CFG, type Timeflow, type TimeHold} from '../engine/timeflow';

export type NativeAreaTimeflowHost = Pick<Timeflow, 'allowHold' | 'hold' | 'release'>;
// Process-local leases: two preparations of the same area cannot release one
// another's holds. Persist activity state, never these ephemeral clock handles.
let nextLease = 0;

/** Native surface rules on the campaign clock, with release authority confined
 * to this retained area. The clock, aging and multiplayer policy remain shared. */
export class NativeAreaTimeflow {
  readonly #clock: NativeAreaTimeflowHost;
  readonly #prefix: string;
  readonly #handles = new Map<string, string>();

  constructor(clock: NativeAreaTimeflowHost) {
    if (!clock || ['allowHold', 'hold', 'release'].some(k => typeof clock[k as keyof NativeAreaTimeflowHost] !== 'function'))
      throw Error('Native area timeflow requires the actual campaign clock');
    if (!Number.isSafeInteger(nextLease + 1)) throw Error('Native area timeflow lease space exhausted');
    this.#clock = clock;
    this.#prefix = 'native-area-activity/' + ++nextLease + '/';
    Object.freeze(this);
  }
  /** Preserve the caller's native policy check and its logical surface id. */
  allowHold(hold: TimeHold): boolean { return this.#clock.allowHold(hold); }

  holdSurface(id: string): boolean {
    const spec = Object.hasOwn(TIME_CFG.surfaces, id) ? TIME_CFG.surfaces[id] : undefined;
    if (!spec) return false;
    const handle = this.#handles.get(id) ?? this.#prefix + id;
    // Remember before invoking the native clock: if it throws after applying
    // its effect, the area's ordinary cleanup still has authority to release it.
    this.#handles.set(id, handle);
    return this.#clock.hold({id: handle, ...spec});
  }
  release(id: string): void {
    const handle = this.#handles.get(id);
    if (handle !== undefined) this.#clock.release(handle);
  }
}
