import type { ActiveBuff, Actor } from './actor';
import type { BuffSkillSource } from './buffSource';
import { CHARGE_DEFS, chargeLabel, chargeColor } from './charges';
import { formatModLine } from './items';
import type { Modifier, SkillTag, StatSheet } from './stats';
import { STATUS_DEFS } from './status';
import { BENEFICIAL_LOOKS, BUFF_LOOKS, CHARGE_LOOKS, LOWER_BUFF_STATS, modifierBuffLook, passiveGateMark, type BuffLook } from '../data/buffLooks';

export interface BuffRow {
  kind: 'buff' | 'passive' | 'status' | 'charge' | 'stance';
  id: string; label: string; look: BuffLook;
  /** Undefined = binary active effect. A counter displays its very first unit. */
  count?: number;
  /** Gated charge bonuses (e.g. Bloodlust) distinguish held fuel from active power. */
  draining?: boolean;
  remaining?: number;
  source?: BuffSkillSource;
  skillMagazine?: true;
  gateMark?: BuffLook['subject'];
  details?: string[];
}
/** Also used by local/couch snapshot transports that do not JSON-roundtrip. */
export function copyBuffRow(row: BuffRow): BuffRow {
  return { ...row, look: { ...row.look }, source: row.source && { ...row.source, tags: [...row.source.tags] },
    details: row.details?.slice() };
}
interface PassiveGate {
  row: BuffRow;
  mod: Modifier;
}
export interface PassiveBuffGrants {
  gates: PassiveGate[];
  procs: Map<string, { name: string; mod: Modifier }[]>;
}
export function newPassiveBuffGrants(): PassiveBuffGrants { return {gates: [], procs: new Map()}; }

/** Called by the same fold which installs these exact modifiers. Lines sharing
 * a gate and scale unit share a tile. Distinct gauges never share a counter. */
export function addPassiveBuffGrant(grants: PassiveBuffGrants, id: string, name: string, mods: Modifier[], look?: BuffLook): void {
  const groups = new Map<string, Modifier[]>();
  for (const mod of mods) {
    if (!mod.value) continue;
    if (mod.stat.startsWith('proc_') && mod.value > 0) {
      const proc = mod.stat.slice(5), sources = grants.procs.get(proc) ?? [];
      sources.push({ name, mod }); grants.procs.set(proc, sources);
    }
    if (!mod.when && !mod.gauge) continue;
    const key = [mod.when, mod.gauge, mod.gaugeAt].join('|');
    const lines = groups.get(key) ?? []; lines.push(mod); groups.set(key, lines);
  }
  for (const [key, lines] of groups) {
    const gains = lines.filter(m => LOWER_BUFF_STATS.has(m.stat) ? m.value < 0 : m.value > 0);
    if (!gains.length) continue;
    grants.gates.push({ mod: lines[0], row: { kind: 'passive', id: id + '/' + key, label: name,
      look: look ?? modifierBuffLook(gains), gateMark:passiveGateMark(lines[0]),
      details: ['Passive tree', ...lines.map(m => formatModLine(m, m.value))] } });
  }
}
function gateOpen(sheet: StatSheet, m: Modifier): boolean {
  if (m.when && !sheet.hasCondition(m.when)) return false;
  if (!m.gauge) return true;
  const units = sheet.gauge(m.gauge);
  return m.gaugeAt === undefined ? units !== 0 : units >= m.gaugeAt;
}
export function buffGrantNodes(actor: Actor, proc: string, tags?: ReadonlySet<SkillTag>): string[] | undefined {
  const grants = actor.passiveBuffGrants?.procs.get(proc);
  if (!grants) return;
  const names = grants.filter(({mod}) => gateOpen(actor.sheet, mod) && (mod.tags ?? []).every(t => tags?.has(t)))
    .map(grant => grant.name);
  if (names.length) return [...new Set(names)];
}
function clock(seconds: number): number | undefined { return Number.isFinite(seconds) ? seconds : undefined; }

/** Status instances already have their own wire. Only buffs and tree gates need
 * supplemental snapshot rows. Detailed native modifier strings are lazy locally. */
export function wornBuffRows(actor: Actor, includeDetails = false): BuffRow[] {
  if (actor.dead || actor.downed) return [];
  if (actor.buffPresentation !== undefined) return actor.buffPresentation;
  const rows: BuffRow[] = [];
  for (const [id, b] of actor.buffs) {
    if (b.stacks <= 0 || b.remaining <= 0) continue;
    const row = wornBuffRow(id,b);
    if (includeDetails) row.details = wornBuffDetails(b);
    rows.push(row);
  }
  for (const { row, mod } of actor.passiveBuffGrants?.gates ?? []) {
    if (!gateOpen(actor.sheet, mod)) continue;
    rows.push(mod.gauge && mod.gaugeAt === undefined ? {...row, count: actor.sheet.gauge(mod.gauge)} : row);
  }
  if (actor.isPlayerKind() && actor.sheet.hasCondition('stationary') && actor.hasConditionalMods('stationary')) {
    rows.push({ kind:'stance', id:'stationary', label:'Planted', look:{subject:'roots',pose:'native'},
      details:['Stationary modifiers on your equipped skills are active.'] });
  }
  for (const [id, count] of actor.charges) {
    if (count <= 0) continue;
    const def = CHARGE_DEFS[id], look = def?.buffLook ?? CHARGE_LOOKS[id] ?? modifierBuffLook(def?.perCharge ?? []);
    const active = !!def?.perCharge?.length && (!def.modsWhileDraining || actor.isChargeDraining(id));
    rows.push({ kind:'charge', id, label:chargeLabel(id), count, draining:def?.modsWhileDraining ? active : undefined,
      look:{ ...look, pose:active ? look.pose : 'native', color:look.color ?? chargeColor(id) } });
  }
  return rows;
}
export function wornBuffRow(id: string, buff: ActiveBuff): BuffRow {
  const def = buff.def, look = def.buffLook ?? BUFF_LOOKS[id] ?? modifierBuffLook(def.mods);
  const native = def.storedCue !== undefined || !!def.nextHit || !!def.consumeOn || !!def.consumeOnUse;
  return { kind:'buff', id, label:def.label ?? def.buffGrant?.proc ?? id.replace(/_/g,' '),
    look:{ ...look, pose:native ? 'native' : look.pose, color:look.color ?? def.sourceSkill?.color },
    remaining:clock(buff.remaining), count:(def.maxStacks ?? 1) > 1 || buff.stacks > 1 ? buff.stacks : undefined,
    source:def.buffGrant ? undefined : def.sourceSkill,
    skillMagazine:def.sourceSkill && !def.buffGrant && (def.buffHud === 'skill' ||
      (def.buffHud !== 'strip' && (def.nextHit || def.consumeOn || def.consumeOnUse))) ? true : undefined };
}
function wornBuffDetails(buff?: ActiveBuff): string[] {
  if (!buff) return [];
  const {def} = buff, details: string[] = [];
  if (def.buffGrant) {
    if (def.buffGrant.proc !== (def.label ?? def.buffGrant.proc)) details.push(def.buffGrant.proc);
    if (def.buffGrant.nodes?.length) details.push('Tree grant · ' + def.buffGrant.nodes.join(', '));
    if (def.sourceSkill) details.push('Triggering skill · ' + def.sourceSkill.name);
  }
  const spend = def.consumeOn ?? (def.consumeOnUse ? {on:'use', ...def.consumeOnUse} : undefined);
  if (def.nextHit && !spend) details.push('One charge per landed hit');
  if (spend) details.push('Spends one on ' + spend.on + (spend.tags?.length ? ' · ' + spend.tags.join(' / ') : '')
    + ('skills' in spend && spend.skills?.length ? ' · ' + spend.skills.join(' / ').replace(/_/g,' ') : ''));
  if (def.clearOnHit) details.push('Lost when struck');
  if (def.mods.length) details.push(buff.stacks > 1 ? 'Modifiers per stack' : 'Modifiers', ...def.mods.map(m => formatModLine(m,m.value)));
  return details;
}
export function buffRowDetails(actor: Actor, row: BuffRow): string[] {
  const title = row.label + (row.count !== undefined ? ' ×' + row.count : '')
    + (row.remaining !== undefined && row.remaining < 900 ? ' · ' + Math.ceil(row.remaining) + 's' : '');
  if (row.kind === 'status') {
    const def = STATUS_DEFS[row.id];
    return [title, ...(def?.mods ?? []).map(m => formatModLine(m,m.value))];
  }
  if (row.kind === 'charge') {
    const def = CHARGE_DEFS[row.id];
    return [title, ...(def?.perCharge?.length ? [row.draining === undefined ? 'Per charge' :
      row.draining ? 'Draining · bonuses active per charge' : 'Banked · bonuses activate while draining',
      ...def.perCharge.map(m => formatModLine(m,m.value))] : [])];
  }
  return [title, ...(row.details ?? (row.kind === 'buff' ? wornBuffDetails(actor.buffs.get(row.id)) : []))];
}
export function buffRows(actor: Actor): BuffRow[] {
  const rows = wornBuffRows(actor);
  if (actor.dead || actor.downed || !actor.statuses.length) return rows;
  const statuses = new Map<string, BuffRow>();
  for (const s of actor.statuses) {
    const def = STATUS_DEFS[s.id];
    if (!def?.beneficial || s.remaining <= 0 || s.stacks <= 0) continue;
    const remaining = s.remainingKnown === false ? undefined : clock(s.remaining);
    const old = statuses.get(s.id);
    if (old) {
      old.count = (old.count ?? 1) + s.stacks;
      old.remaining = old.remaining === undefined || remaining === undefined ? undefined : Math.max(old.remaining, remaining);
      continue;
    }
    const look = def.buffLook ?? BENEFICIAL_LOOKS[s.id] ?? modifierBuffLook(def.mods ?? []);
    statuses.set(s.id,{ kind:'status', id:s.id, label:def.label, look:{...look, color:look.color ?? def.color},
      count:def.stacking || s.stacks > 1 ? s.stacks : undefined, remaining });
  }
  return statuses.size ? [...rows, ...statuses.values()] : rows;
}
