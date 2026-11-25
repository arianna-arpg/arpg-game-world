import type { Actor } from '../engine/actor';
import type { World } from '../engine/world';
import { SURVIVAL_RESOURCES, visibleSurvivalMeter } from '../world/regions';

import { VITAL_MATERIALS, type GuardDial, type HudOrb, type VitalMaterial } from '../render/vis/vitalMaterials';
export type OrbReadoutKey = HudOrb | GuardDial;
export type { GuardDial, HudOrb } from '../render/vis/vitalMaterials';
interface OrbStat {
  label: string;
  value: (actor: Actor, world: World) => number | undefined;
  max?: (actor: Actor) => number;
  color?: string;
  material?: VitalMaterial;
  state?: (actor: Actor) => string;
  rate?: boolean;
}

const LIFE_ROWS: OrbStat[] = [
  { label: VITAL_MATERIALS.life.label, value: a => a.life, max: a => a.maxLife(), material: 'life' },
  { label: 'Reserved life', value: a => a.reservedLife || undefined },
  { label: 'Life ceiling', value: a => a.reservedLife || a.lifeSealAt !== undefined
    ? Math.min(a.lifeCeiling(), a.lifeSealAt ?? Infinity) : undefined },
  { label: VITAL_MATERIALS.es.label, value: a => a.es, max: a => a.maxEs(), material: 'es',
    state: a => a.esRecharging ? 'Recharging' : '' },
  { label: VITAL_MATERIALS.poise.label, value: a => a.poise, max: a => a.maxPoise(), material: 'poise',
    state: a => a.poiseBroken ? 'Broken' : a.poise > a.maxPoise() ? 'Overcharged' : '' },
  { label: VITAL_MATERIALS.insight.label, value: a => a.insight, max: a => a.maxInsight(), material: 'insight' },
  { label: VITAL_MATERIALS.endurance.label, value: a => a.endurance, max: a => a.maxEndurance(), material: 'endurance' },
  { label: VITAL_MATERIALS.ward.label, material: 'ward', value: a => a.ward || undefined },
  { label: VITAL_MATERIALS.absorb.label, material: 'absorb', value: a => a.absorbTotal || undefined },
  { label: 'Base regen', value: a => a.basePoolRegen('life') || undefined, rate: true },
];

const MANA_ROWS: OrbStat[] = [
  { label: VITAL_MATERIALS.mana.label, value: a => a.mana, max: a => a.maxMana(), material: 'mana' },
  { label: 'Reserved mana', value: a => a.reservedMana || undefined },
  { label: 'Usable maximum', value: a => a.reservedMana ? a.availableMaxMana() : undefined },
  { label: 'Base regen', value: a => a.basePoolRegen('mana') || undefined, rate: true },
];

/** Each number keeps its DOM node and each meter its track throughout the hover. */
export class OrbReadout {
  private readonly rows;
  constructor(card: HTMLElement, key: OrbReadoutKey) {
    const list = document.createElement('dl');
    list.className = 'orb-readout';
    let stats: OrbStat[];
    if (key === 'mana') {
      const meters = Object.values(SURVIVAL_RESOURCES).map(def => ({
        label: def.label, color: def.color, max: () => def.max,
        value: (actor: Actor, world: World) => visibleSurvivalMeter(world, actor, def),
      }));
      stats = [...MANA_ROWS, ...meters];
    } else {
      stats = key === 'life' ? LIFE_ROWS : LIFE_ROWS.filter(stat => stat.material === key);
    }
    this.rows = stats.map(stat => {
      const row = document.createElement('div');
      const label = document.createElement('dt');
      const value = document.createElement('dd');
      const reading = document.createTextNode('');
      value.append(reading);
      const material = stat.material && VITAL_MATERIALS[stat.material];
      if (material) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '-8 -8 16 16');
        svg.setAttribute('aria-hidden', 'true');
        const mark = document.createElementNS(svg.namespaceURI, 'path');
        mark.setAttribute('d', material.glyph);
        svg.append(mark);
        label.append(svg);
        row.style.setProperty('--orb-ink', material.ink);
      } else if (stat.color) row.style.setProperty('--orb-ink', stat.color);
      label.append(stat.label);
      row.append(label, value);
      const fill = stat.max ? document.createElement('i') : null;
      if (fill) {
        const track = document.createElement('span');
        track.className = 'orb-track';
        track.setAttribute('aria-hidden', 'true');
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
