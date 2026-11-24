import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { SURVIVAL_RESOURCES, visibleSurvivalMeter } from '../world/regions';

export type HudOrb = 'life' | 'mana';
interface OrbStat {
  label: string;
  value: (actor: Actor, world: World) => number | undefined;
  max?: (actor: Actor) => number;
  color?: string;
  state?: (actor: Actor) => string;
  rate?: boolean;
}

const LIFE_ROWS: OrbStat[] = [
  { label: 'Life', value: a => a.life, max: a => a.maxLife(), color: '#d65b55' },
  { label: 'Reserved life', value: a => a.reservedLife || undefined },
  { label: 'Life ceiling', value: a => a.reservedLife || a.lifeSealAt !== undefined
    ? Math.min(a.lifeCeiling(), a.lifeSealAt ?? Infinity) : undefined },
  { label: 'Energy shield', value: a => a.es, max: a => a.maxEs(), color: '#5ad8d8',
    state: a => a.esRecharging ? 'Recharging' : '' },
  { label: 'Poise', value: a => a.poise, max: a => a.maxPoise(), color: '#d8b06a',
    state: a => a.poiseBroken ? 'Broken' : '' },
  { label: 'Insight', value: a => a.insight, max: a => a.maxInsight(), color: '#6ad8b8' },
  { label: 'Endurance', value: a => a.endurance, max: a => a.maxEndurance(), color: '#a8c86a' },
  { label: 'Ward', value: a => a.ward || undefined },
  { label: 'Absorb', value: a => a.absorbTotal || undefined },
  { label: 'Base regen', value: a => a.basePoolRegen('life') || undefined, rate: true },
];

const MANA_ROWS: OrbStat[] = [
  { label: 'Mana', value: a => a.mana, max: a => a.maxMana(), color: '#6793ec' },
  { label: 'Reserved mana', value: a => a.reservedMana || undefined },
  { label: 'Usable maximum', value: a => a.reservedMana ? a.availableMaxMana() : undefined },
  { label: 'Base regen', value: a => a.basePoolRegen('mana') || undefined, rate: true },
];

/** Each number keeps its DOM node and each meter its track throughout the hover. */
export class OrbReadout {
  private readonly rows;
  constructor(card: HTMLElement, orb: HudOrb) {
    const list = document.createElement('dl');
    list.className = 'orb-readout';
    const stats: OrbStat[] = orb === 'life' ? LIFE_ROWS : [...MANA_ROWS, ...Object.values(SURVIVAL_RESOURCES).map(def => ({
      label: def.label, color: def.color, max: () => def.max,
      value: (a: Actor, world: World) => visibleSurvivalMeter(world, a, def),
    }))];
    this.rows = stats.map(stat => {
      const row = document.createElement('div');
      const label = document.createElement('dt');
      const value = document.createElement('dd');
      const reading = document.createTextNode('');
      value.append(reading);
      label.textContent = stat.label;
      row.append(label, value);
      const fill = stat.max ? document.createElement('i') : null;
      if (fill) {
        const track = document.createElement('span');
        track.className = 'orb-track';
        track.setAttribute('aria-hidden', 'true');
        fill.style.backgroundColor = stat.color!;
        track.append(fill);
        row.append(track);
      }
      list.append(row);
      return { stat, row, reading, fill, fraction: -1 };
    });
    card.replaceChildren(list);
  }

  update(actor: Actor, world: World): void {
    for (const [i, entry] of this.rows.entries()) {
      const { stat, row, reading, fill } = entry;
      const n = stat.value(actor, world);
      const max = stat.max?.(actor);
      const hide = n === undefined || (i !== 0 && max !== undefined && max <= 0);
      if (row.hidden !== hide) row.hidden = hide;
      if (n === undefined || hide) continue;
      const state = stat.state?.(actor);
      const current = stat.rate ? n.toFixed(1) + '/s' : String(Math.max(0, Math.ceil(n)));
      const text = (state ? state + ' · ' : '') + current + (max === undefined ? '' : ' / ' + Math.ceil(max));
      if (reading.data !== text) reading.data = text;
      if (fill && max !== undefined) {
        const fraction = max > 0 ? Math.max(0, Math.min(1, n / max)) : 0;
        if (fraction !== entry.fraction) {
          fill.style.transform = `scaleX(${fraction})`;
          entry.fraction = fraction;
        }
      }
    }
  }
}
