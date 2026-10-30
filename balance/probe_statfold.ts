// Exact stat-fold equivalence against the archived closure implementation at
// 401dfdfab68c53bee0e33f60c56aa9d4d4c7c01b. The reference compute body below is
// preserved independently: it never calls the current StatSheet implementation
// and needs neither Git nor a generated/ignored reference file at runtime.
// Run: node --import tsx balance/probe_statfold.ts
import assert from 'node:assert/strict';
import {
  StatSheet, STAT_DEFS, STAT_TRADES, mod, linkMod,
  type Modifier, type SkillTag, type ConditionId,
} from '../src/engine/stats';

class ArchivedStatSheet {
  private sources = new Map<string, Modifier[]>();
  private modsByStat: Map<string, Modifier[]> | null = null;
  private baseOverrides = new Map<string, number>();
  private cache = new Map<string, number>();
  private conditions = new Set<ConditionId>();
  private gauges = new Map<string, number>();
  private conditionKey = '';
  private gaugeKey = '';

  setSource(name: string, mods: Modifier[]): void {
    this.sources.set(name, mods);
    this.modsByStat = null;
    this.cache.clear();
  }
  removeSource(name: string): void {
    if (this.sources.delete(name)) {
      this.modsByStat = null;
      this.cache.clear();
    }
  }
  setBase(stat: string, value: number): void {
    this.baseOverrides.set(stat, value);
    this.cache.clear();
  }
  setConditions(active: ConditionId[]): void {
    const key = active.slice().sort().join(',');
    if (key === this.conditionKey) return;
    this.conditionKey = key;
    this.conditions = new Set(active);
    this.cache.clear();
  }
  setGauges(entries: [string, number][]): void {
    const key = entries.map(([k, v]) => k + ':' + v).sort().join('|');
    if (key === this.gaugeKey) return;
    this.gaugeKey = key;
    this.gauges = new Map(entries);
    this.cache.clear();
  }
  private sourceModsFor(stat: string): readonly Modifier[] | undefined {
    if (!this.modsByStat) {
      const index = new Map<string, Modifier[]>();
      for (const mods of this.sources.values()) for (const m of mods) {
        const id = m.stat;
        let bucket = index.get(id);
        if (!bucket) index.set(id, bucket = []);
        bucket.push(m);
      }
      this.modsByStat = index;
    }
    return this.modsByStat.get(stat);
  }
  get(stat: string, contextTags?: ReadonlySet<SkillTag>, extra?: readonly Modifier[], baseValue?: number): number {
    return this.compute(stat, contextTags, extra, baseValue, false);
  }

  // BEGIN archived compute body; preserve this oracle when changing production.
  private compute(
    stat: string, contextTags?: ReadonlySet<SkillTag>,
    extra?: readonly Modifier[], baseValue?: number, noLinks = false,
  ): number {
    const cacheable = (!extra || !extra.length) && baseValue === undefined;
    // Skill-local modifiers and base overrides bypass the value cache.
    // Do not allocate/sort their tag sets for a key that is never read.
    let key = '';
    if (cacheable) {
      key = (noLinks ? '§' : '') + (contextTags && contextTags.size
        ? stat + '|' + [...contextTags].sort().join(',')
        : stat);
      const cached = this.cache.get(key);
      if (cached !== undefined) return cached;
    }

    const def = STAT_DEFS[stat];
    let base = baseValue ?? this.baseOverrides.get(stat) ?? def?.base ?? 0;
    let flat = 0, increased = 0, moreMult = 1;
    let override: number | undefined;
    let links: Modifier[] | undefined;

    const apply = (m: Modifier): void => {
      if (m.stat !== stat) return;
      if (m.when && !this.conditions.has(m.when)) return;
      if (m.tags && m.tags.length) {
        if (!contextTags) return;
        for (const t of m.tags) if (!contextTags.has(t)) return;
      }
      // Gauge-scaled modifiers ride a live quantity (status stacks, charge
      // counts) — a zero gauge is an inert modifier.
      let v = m.value;
      if (m.gauge) {
        const g = this.gauges.get(m.gauge) ?? 0;
        // THE GAUGE GATE (Modifier.gaugeAt): a threshold, not a scale —
        // the full value at or above the line, nothing below it.
        if (m.gaugeAt !== undefined) {
          if (g < m.gaugeAt) return;
        } else {
          if (g === 0) return;
          v *= g;
        }
      }
      switch (m.kind) {
        case 'flat': flat += v; break;
        case 'increased': increased += v; break;
        case 'more': moreMult *= 1 + v; break;
        case 'override': override = v; break;
        case 'link':
          if (!noLinks && m.fromStat) (links ??= []).push({ ...m, value: v });
          break;
      }
    };
    const sourceMods = this.sourceModsFor(stat);
    if (sourceMods) for (const m of sourceMods) apply(m);
    if (extra) for (const m of extra) apply(m);

    // STAT LINKS: each siphon adds ratio × the source's baseline into the
    // BASE layer (before increased/more), read with the same context and
    // skill-local extras so a skill-scoped link sees its skill's world.
    if (links) {
      for (const l of links) {
        flat += l.value * this.compute(l.fromStat!, contextTags, extra, undefined, true);
      }
    }

    // STAT TRADES, the GAIN side (see STAT_TRADES): grants mirror links —
    // base-layer join, baseline source read. The baseline is PRE-FORGO
    // (noLinks disables the forgo below too), so a full forgo still
    // converts the whole pool: Iron-Reflexes math, by construction.
    if (!noLinks) {
      for (const t of STAT_TRADES) {
        if (t.to !== stat) continue;
        const rate = this.compute(t.rateStat, contextTags, extra);
        if (rate <= 0) continue;
        flat += rate * this.compute(t.from, contextTags, extra, undefined, true);
      }
    }

    let value = override !== undefined ? override : (base + flat) * (1 + increased) * moreMult;
    // STAT TRADES, the FORGO side: the source keeps 1 − forgone. Applied to
    // the FINAL fold (after increased/more — renouncing means renouncing
    // the investments too), before the registry clamps.
    if (!noLinks) {
      for (const t of STAT_TRADES) {
        if (t.from !== stat) continue;
        const forgone = this.compute(t.forgoStat, contextTags, extra);
        if (forgone > 0) value *= Math.max(0, 1 - Math.min(1, forgone));
      }
    }
    if (def) {
      if (def.min !== undefined) value = Math.max(def.min, value);
      if (def.max !== undefined) value = Math.min(def.max, value);
    }
    if (cacheable) this.cache.set(key, value);
    return value;
  }
  // END archived compute body.
}

let comparisons = 0;
let analyticChecks = 0;
let traceChecks = 0;
const tags = (...values: SkillTag[]): ReadonlySet<SkillTag> => new Set(values);
class Pair {
  readonly live = new StatSheet();
  readonly old = new ArchivedStatSheet();
  source(name: string, mods: Modifier[]): void {
    this.live.setSource(name, mods);
    this.old.setSource(name, mods);
  }
  remove(name: string): void { this.live.removeSource(name); this.old.removeSource(name); }
  base(stat: string, value: number): void { this.live.setBase(stat, value); this.old.setBase(stat, value); }
  conditions(active: ConditionId[]): void { this.live.setConditions(active); this.old.setConditions(active); }
  gauges(entries: [string, number][]): void { this.live.setGauges(entries); this.old.setGauges(entries); }
  read(stat: string, context?: ReadonlySet<SkillTag>, extra?: readonly Modifier[], base?: number): number {
    const actual = this.live.get(stat, context, extra, base);
    const expected = this.old.get(stat, context, extra, base);
    assert.equal(actual, expected, `archived fold: ${stat}, tags=${[...(context ?? [])]}, base=${base}`);
    comparisons++;
    return actual;
  }
  expect(value: number, stat: string, context?: ReadonlySet<SkillTag>, extra?: readonly Modifier[], base?: number): void {
    assert.equal(this.read(stat, context, extra, base), value, `analytic fold: ${stat}`);
    analyticChecks++;
  }
}

// Exact arithmetic and override order, including source replacement and re-add.
{
  const p = new Pair();
  p.source('first', [mod('probeOrder', 'flat', 1e16), mod('probeOrder', 'flat', 1), mod('probeOverride', 'override', 7)]);
  p.source('second', [mod('probeOrder', 'flat', -1e16), mod('probeOverride', 'override', 11)]);
  p.expect(2, 'probeOrder', undefined, [mod('probeOrder', 'flat', 2)]);
  p.expect(11, 'probeOverride');
  p.expect(13, 'probeOverride', undefined, [mod('probeOverride', 'override', 13)]);
  p.source('first', [mod('probeOverride', 'override', 17)]);
  p.expect(11, 'probeOverride');
  p.remove('first');
  p.source('first', [mod('probeOverride', 'override', 19)]);
  p.expect(19, 'probeOverride');
  p.expect(0, 'probeOverride', undefined, [mod('probeOverride', 'override', 0)]);
  p.expect(-0, 'probeOverride', undefined, [mod('probeOverride', 'override', -0)]);
}

// A rejected tag must skip the whole modifier, then continue to the next one.
{
  const p = new Pair();
  const scoped = [mod('probeTags', 'flat', 100, ['fire', 'spell']), mod('probeTags', 'flat', 3)];
  p.source('scope', scoped);
  for (const context of [undefined, tags(), tags('fire'), tags('spell'), tags('cold', 'attack')]) {
    p.expect(3, 'probeTags', context);
    p.expect(6, 'probeTags', context, scoped);
  }
  p.expect(103, 'probeTags', tags('fire', 'spell'));
  p.expect(206, 'probeTags', tags('spell', 'fire'), scoped);
  p.source('single', [mod('probeMutable', 'flat', 7, ['fire']), mod('probeMutable', 'flat', 13, ['cold'])]);
  const mutable = new Set<SkillTag>(['fire']);
  p.expect(7, 'probeMutable', mutable);
  mutable.delete('fire'); mutable.add('cold');
  p.expect(13, 'probeMutable', mutable);
  mutable.delete('cold'); mutable.add('fire');
  p.expect(7, 'probeMutable', mutable);
}

// Negative, zero, missing, and threshold gauges; scale and gate are distinct.
{
  const p = new Pair();
  p.source('gauges', [
    { ...mod('probeGauge', 'flat', 3), gauge: 'stacks' },
    { ...mod('probeGate', 'flat', 10), gauge: 'stacks', gaugeAt: 2 },
    { ...mod('probeNegativeGate', 'flat', 11), gauge: 'stacks', gaugeAt: -1 },
  ]);
  for (const value of [-2, -1, 0, 1, 2, 3]) {
    p.gauges([['stacks', value]]);
    p.expect(3 * value, 'probeGauge');
    p.expect(value >= 2 ? 10 : 0, 'probeGate');
    p.expect(value >= -1 ? 11 : 0, 'probeNegativeGate');
  }
  p.gauges([]);
  p.expect(0, 'probeGauge'); p.expect(0, 'probeGate'); p.expect(11, 'probeNegativeGate');
}

// Cache invalidation follows conditions and the explicit source mutation seam.
{
  const p = new Pair();
  const mods = [mod('probeDynamic', 'flat', 2), mod('probeDynamic', 'flat', 9, undefined, 'lowLife')];
  p.source('mutable', mods);
  p.expect(2, 'probeDynamic'); p.expect(2, 'probeDynamic');
  p.conditions(['lowLife']); p.expect(11, 'probeDynamic');
  p.conditions(['lowLife']); p.expect(11, 'probeDynamic');
  mods[0].value = 5;
  mods.push(mod('probeDynamic', 'more', 1));
  p.source('mutable', mods); p.expect(28, 'probeDynamic');
  p.conditions([]); p.expect(10, 'probeDynamic');
  p.remove('mutable'); p.expect(0, 'probeDynamic');
  p.base('probeDynamic', 7); p.expect(7, 'probeDynamic');
  p.expect(0, 'probeDynamic', undefined, undefined, 0);
  p.expect(7, 'probeDynamic');
}

// Single-hop links, pre-forgo trade baselines, recursion, overrides and clamps.
{
  const p = new Pair();
  p.source('links', [
    mod('probeA', 'flat', 10), mod('probeB', 'flat', 20), mod('probeC', 'flat', 30),
    linkMod('probeB', 'probeA', 0.5), linkMod('probeC', 'probeB', 2), linkMod('probeA', 'probeC', 1),
  ]);
  p.expect(40, 'probeA'); p.expect(25, 'probeB'); p.expect(70, 'probeC');
  p.expect(90, 'probeC', tags('fire'), [mod('probeB', 'flat', 10, ['fire'])]);
  p.base('evasion', 0);
  p.source('trade', [
    mod('evasion', 'flat', 100), mod('evasion', 'increased', 0.5),
    mod('evasionToArmor', 'flat', 0.4), mod('evasionForgone', 'flat', 1),
    mod('armor', 'increased', 1),
  ]);
  p.expect(0, 'evasion'); p.expect(120, 'armor');
  p.expect(10, 'armor', undefined, [mod('armor', 'override', 10)]);
  p.expect(0, 'armor', undefined, [mod('armor', 'override', -10)]);
  p.expect(1, 'life', undefined, [mod('life', 'override', -10)]);
  p.expect(30, 'moveSpeed', undefined, [mod('moveSpeed', 'override', -10)]);
  p.expect(0.9, 'lowLifeLine', undefined, [mod('lowLifeLine', 'override', 2)]);
  p.expect(0, 'lowLifeLine', undefined, [mod('lowLifeLine', 'override', -2)]);
}

// Cross-product covers all fold kinds on registered/unknown stats, cache hits,
// skill extras, base overrides, trade dials, conditional/tagged/scaled links.
{
  const p = new Pair();
  p.source('base', [
    mod('armor', 'flat', 17), mod('armor', 'increased', 0.3), mod('armor', 'more', 0.2),
    mod('evasion', 'flat', 71), mod('lifeRegen', 'flat', 4), mod('probeMatrix', 'flat', -3),
    mod('evasionToArmor', 'flat', 0.35), mod('evasionForgone', 'flat', 0.4),
    mod('energyShield', 'flat', 40), mod('esToPoise', 'flat', 0.2), mod('esForgone', 'flat', 0.25),
    mod('evasionToInsight', 'flat', 0.1), mod('evasionToInsightForgo', 'flat', 0.2),
  ]);
  p.source('gated', [
    mod('armor', 'flat', 23, ['fire', 'spell']), mod('armor', 'more', -0.2, undefined, 'lowLife'),
    { ...mod('probeMatrix', 'flat', 2), gauge: 'stacks' },
    { ...mod('armor', 'override', 41, ['cold'], 'guarding'), gauge: 'stacks', gaugeAt: 2 },
    { ...linkMod('thorns', 'lifeRegen', 2, ['spell'], 'lowLife'), gauge: 'stacks' },
    { ...linkMod('probeMatrix', 'armor', 0.1), gauge: 'stacks', gaugeAt: -1 },
    mod('lifeRegen', 'increased', 0.5, ['fire']), linkMod('armor', 'thorns', 0.25),
  ]);
  const contexts = [undefined, tags(), tags('fire'), tags('spell'), tags('fire', 'spell'), tags('cold', 'spell')];
  const extras: (Modifier[] | undefined)[] = [undefined, [], [
    mod('armor', 'flat', 13), mod('armor', 'more', 0.1, ['spell']),
    mod('lifeRegen', 'flat', 2, undefined, 'lowLife'), linkMod('thorns', 'armor', 0.5),
    mod('probeMatrix', 'override', -7, ['cold']), mod('evasionToArmor', 'increased', 0.2),
  ]];
  const ids = ['armor', 'evasion', 'lifeRegen', 'thorns', 'probeMatrix', 'poise', 'energyShield', 'insight', 'evasionToArmor', 'life', 'moveSpeed'];
  for (const gauge of [-2, -1, 0, 1, 2, 3]) for (const conditions of [[], ['lowLife'], ['lowLife', 'guarding']] as ConditionId[][]) {
    p.gauges([['stacks', gauge]]); p.conditions(conditions);
    for (const context of contexts) for (const extra of extras) for (const base of [undefined, 0, 19]) for (const stat of ids) {
      p.read(stat, context, extra, base);
      p.read(stat, context, extra, base);
    }
  }
}

// Read-order trace: callback removal must preserve short circuiting, property
// reads, source/extra order, and the shallow link copy before recursion.
{
  const run = (sheet: StatSheet | ArchivedStatSheet): { values: number[]; trace: string[] } => {
    const trace: string[] = [];
    const watch = (id: string, modifier: Modifier): Modifier => new Proxy(modifier, {
      get(target, property, receiver) {
        trace.push(`${id}.${String(property)}`);
        return Reflect.get(target, property, receiver);
      },
    });
    sheet.setSource('watched', [
      watch('wrongStat', mod('probeOther', 'flat', 999)),
      watch('condition', mod('probeTrace', 'flat', 100, undefined, 'lowLife')),
      watch('tags', mod('probeTrace', 'flat', 200, ['fire', 'spell'])),
      watch('zero', { ...mod('probeTrace', 'flat', 300), gauge: 'zero' }),
      watch('threshold', { ...mod('probeTrace', 'flat', 400), gauge: 'count', gaugeAt: 2 }),
      watch('link', { ...linkMod('probeTrace', 'probeOther', 0.5), gauge: 'count' }),
    ]);
    sheet.setGauges([['count', 1]]);
    const extra = [watch('extra', mod('probeTrace', 'flat', 7))];
    const values = [sheet.get('probeTrace', tags('fire'), extra)];
    sheet.setConditions(['lowLife']); sheet.setGauges([['count', 2]]);
    values.push(sheet.get('probeTrace', tags('fire', 'spell'), extra));
    values.push(sheet.get('probeTrace', tags('fire', 'spell')));
    values.push(sheet.get('probeTrace', tags('fire', 'spell')));
    return { values, trace };
  };
  const live = run(new StatSheet());
  const old = run(new ArchivedStatSheet());
  assert.deepEqual(live.values, old.values); traceChecks++;
  assert.deepEqual(live.trace, old.trace); traceChecks++;
}

console.log(`PASS statfold: ${comparisons} exact archived comparisons, ${analyticChecks} analytic checks, ${traceChecks} value/read-order trace checks`);
