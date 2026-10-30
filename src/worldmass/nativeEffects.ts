import type { World } from '../engine/world';
import { doodadRuleOf, type DoodadEffect } from '../engine/levelgen';
import type { NativeFeatureInstance } from './nativeResidency';
import { nativeHavenEffectSupported } from './nativeEffectSources';
import { canonical, massRandom } from './random';

export interface MassNativeEffectsSave {
  schema: 1; owner: string; descriptor: string; clock: number;
  /** The mutable cooldown lives ONLY in the feature's sparse Doodad state. */
  slots: { index: number; draws: number }[];
}
export interface MassNativeEffectBinding {
  mount(): void; rollbackMount(): void; capture(): MassNativeEffectsSave;
  canRetire(): boolean; detach(): void;
}
const copy = <T>(value: T): T => JSON.parse(canonical(value)) as T;
const withoutClock = (effect: DoodadEffect): Omit<DoodadEffect, 'cd'> => {
  const { cd: _clock, ...body } = effect; return body;
};

export function massNativeEffectsSupported(instance: NativeFeatureInstance): boolean {
  const sources = instance.blueprint.descriptor.effectSources;
  if (!sources) return !instance.layout.doodads.some(d => d.effect || doodadRuleOf(d.kind).effect);
  const rows = new Map(sources.rows.map(row => [row.index, row]));
  return sources.rows.every(row => nativeHavenEffectSupported(row)
    && instance.layout.doodads[row.index]?.kind === row.kind)
    && instance.layout.doodads.every((d, index) => !(d.effect || doodadRuleOf(d.kind).effect) || rows.has(index));
}

/** Owns source identity and the native handler's random stream, not a second
 * scheduler. World keeps native early-effect timing, target order and cd. */
export class MassNativeEffects {
  private live = new Set<string>();
  constructor(readonly world: World) {}

  prepare(instance: NativeFeatureInstance, saved?: MassNativeEffectsSave): MassNativeEffectBinding | undefined {
    if (!massNativeEffectsSupported(instance)) throw Error('Unbound native effect or incompatible status source');
    const rows = instance.blueprint.descriptor.effectSources?.rows ?? [];
    if (!rows.length) { if (saved) throw Error('Native feature lost its effect source'); return; }
    const owner = instance.id, world = this.world, hash = instance.blueprint.descriptor.hash;
    if (this.live.has(owner)) throw Error('Duplicate native effect owner');
    if (saved) {
      canonical(saved);
      if (saved.schema !== 1 || saved.owner !== owner || saved.descriptor !== hash || !Number.isFinite(saved.clock)
        || saved.clock < 0 || saved.clock > world.time || !Array.isArray(saved.slots) || saved.slots.length !== rows.length
        || saved.slots.some((slot, i) => !slot || slot.index !== rows[i].index || !Number.isSafeInteger(slot.draws)
          || slot.draws < (rows[i].origin === 'rule' ? 1 : 0))) throw Error('Invalid native effect checkpoint');
    }
    const slots = rows.map((source, index) => {
      const d = instance.layout.doodads[source.index];
      let draws = saved?.slots[index].draws ?? 0;
      const random = (): number => {
        if (!Number.isSafeInteger(draws + 1)) throw Error('Native effect random stream exhausted');
        return massRandom(instance.placement.request.seed, [owner, 'native-effect/draw', source.index, draws++]).range(0, 1);
      };
      let effect: DoodadEffect | undefined;
      if (saved) {
        if (!d.gone) {
          const untouchedExplicit = source.origin === 'explicit' && source.effect.cd === undefined && draws === 0;
          if (!d.effect || canonical(withoutClock(d.effect)) !== canonical(withoutClock(source.effect))
            || d.effect.cd === undefined && !untouchedExplicit
            || d.effect.cd !== undefined && (!Number.isFinite(d.effect.cd) || d.effect.cd < 0
              || d.effect.cd > Math.max(source.effect.cd ?? source.effect.interval, source.effect.interval)))
            throw Error('Native effect lost its authoritative scenery cooldown');
          effect = d.effect;
        }
      } else {
        if (d.gone) throw Error('Unborn native effect already disappeared');
        effect = copy(source.effect);
        if (source.origin === 'rule') effect.cd = random() * effect.interval;
      }
      return { source, d, random, draws: () => draws, effect, original: d.effect };
    });
    let mounted = false, detached = false, observed = false, mountedAt = -1;
    let release: (() => void) | undefined;
    const compatible = (): boolean => slots.every(({ d, source, effect }) => d.gone || !world.doodads.includes(d)
      || d.effect === effect && !!effect && !d.contactSource
        && canonical(withoutClock(effect)) === canonical(withoutClock(source.effect))
        && (effect.cd === undefined && source.origin === 'explicit' || Number.isFinite(effect.cd) && effect.cd! >= 0
          && effect.cd! <= Math.max(source.effect.cd ?? source.effect.interval, source.effect.interval)));
    const rollback = (): void => {
      release?.(); release = undefined;
      for (const slot of slots) {
        if (slot.original) slot.d.effect = slot.original; else delete slot.d.effect;
      }
      this.live.delete(owner); mounted = false; detached = true;
    };
    return {
      mount: () => {
        if (mounted || detached || this.live.has(owner)) throw Error('Native effect enrolled twice');
        try {
          for (const slot of slots) if (!slot.d.gone) slot.d.effect = slot.effect;
          release = world.installMassNativeEffects(owner, slots.filter(s => !s.d.gone).map(slot => ({
            doodad: slot.d,
            invoke: nativeHandler => {
              if (!mounted || detached) throw Error('Unenrolled native effect invoked');
              observed = true;
              const previous = Math.random; Math.random = slot.random;
              try { nativeHandler(); } finally { Math.random = previous; }
            },
          })));
          mounted = true; mountedAt = world.time; this.live.add(owner);
        } catch (error) { rollback(); throw error; }
      },
      rollbackMount: () => {
        if (!mounted || detached) return;
        if (observed || world.time !== mountedAt) throw Error('Native effect rollback is only valid during initial enrollment');
        rollback();
      },
      capture: () => {
        if (!mounted || detached || !compatible()) throw Error('Native effect has incompatible live scenery');
        observed = true;
        return { schema: 1, owner, descriptor: hash, clock: world.time,
          slots: slots.map(slot => ({ index: slot.source.index, draws: slot.draws() })) };
      },
      canRetire: () => detached || mounted && compatible() && slots.every(s => !s.d.contactSource && !s.d.felled && !s.d.evap),
      detach: () => {
        if (detached) return;
        if (!mounted || !compatible() || slots.some(s => s.d.contactSource || s.d.felled || s.d.evap))
          throw Error('Native effect has live dependencies');
        release!(); release = undefined; this.live.delete(owner); mounted = false; detached = true;
      },
    };
  }
}
