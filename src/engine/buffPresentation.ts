import { SUPPORTS } from '../data/supports';
import { HARMFUL_BUFF_MARKS } from './mechanicMarks';
import type { ActiveBuff, Actor } from './actor';
import type { BuffSkillSource } from './buffSource';
import { CHARGE_DEFS, chargeLabel, chargeColor } from './charges';
import { formatModLine } from './items';
import type { Modifier, SkillTag, StatSheet } from './stats';
import { STATUS_DEFS } from './status';
import { BENEFICIAL_LOOKS, BUFF_LOOKS, CHARGE_LOOKS, GRANTED_BUFF_LOOKS, LOWER_BUFF_STATS, modifierBuffLook, passiveGateMark, type BuffLook } from '../data/buffLooks';

export interface BuffRow {
  kind: 'buff' | 'passive' | 'status' | 'charge' | 'stance';
  id: string; label: string; look: BuffLook;
  /** Undefined = binary active effect. A counter displays its very first unit. */
  count?: number;
  /** Gated charge bonuses (e.g. Bloodlust) distinguish held fuel from active power. */
  draining?: boolean;
  remaining?: number;
  duration?: number;
  /** The active effect was granted by a resolved proc. Timers alone cannot distinguish it. */
  triggered?: true;
  source?: BuffSkillSource;
  supportSources?: readonly string[];
  skillMagazine?: true;
  /** A secondary buff keeps its own face even when its source also supplies its skill slot. */
  effectFace?: boolean;
  gateMark?: BuffLook['subject'];
  details?: string[];
}
/** Also used by local/couch snapshot transports that do not JSON-roundtrip. */
export function copyBuffRow(row: BuffRow): BuffRow {
  return { ...row, look: { ...row.look }, source: row.source && { ...row.source, tags: [...row.source.tags] },
    supportSources:row.supportSources?.slice(), details: row.details?.slice() };
}
interface PassiveGate {
  row: BuffRow;
  mod: Modifier;
}
type NumericField = { [K in keyof Actor]-?: Actor[K] extends number ? K : never }[keyof Actor];
interface BankArt {field:NumericField; label:string; subject:BuffLook['subject']; gauge:string}
const BANK_ART:Record<string,BankArt> = {
  inertiaDischarge:{field:'inertiaStacks',label:'Kinetic Inertia',subject:'rock',gauge:'inertia'},
  harmonyPower:{field:'harmonyStacks',label:'Harmonic Pitch',subject:'note',gauge:'harmony'},
  moltShrapnel:{field:'moltStacks',label:'Chitin Carapace',subject:'shell',gauge:'molt'},
  prismSinglePenalty:{field:'prismCount',label:'Polychrome Strain',subject:'prism',gauge:'prism'},
  blockBladeSlash:{field:'aegisCharges',label:'Bone-Shield Cleave',subject:'blades',gauge:'aegisCharges'},
  overloadPower:{field:'overloadStacks',label:'Overload Runes',subject:'runes',gauge:'overload'},
  tranceRamp:{field:'tranceStacks',label:'Abyssal Trance',subject:'void',gauge:'trance'},
  offeringPower:{field:'offeringStacks',label:'Undying Offering',subject:'chalice',gauge:'offering'},
  staticDischargeMore:{field:'staticCharges',label:'Static Transferral',subject:'capacitor',gauge:'staticCharge'},
  cadenceFinisher:{field:'cadenceHits',label:"Pugilist's Cadence",subject:'fist',gauge:'cadence'},
  silverQuiverPower:{field:'silverAmmo',label:'Blessed Silver',subject:'quiver',gauge:'silverAmmo'},
  undertakerPower:{field:'harvestStacks',label:"Undertaker's Harvest",subject:'skull',gauge:'harvest'},
  neuralSparkPower:{field:'neuralSurgeStacks',label:'Neural Surge',subject:'nerve',gauge:'neuralSurge'},
  blockIntegratePower:{field:'blockCharges',label:'Carapace Integration',subject:'shield',gauge:'blockCharges'},
  critBlastPower:{field:'critChargeCount',label:'Critical Detonator',subject:'detonator',gauge:'critCharge'},
};
export interface PassiveBuffGrants {
  banks: Map<string,{art:BankArt; sources:Set<string>}>;
  imprints: Set<string>;
  gates: PassiveGate[];
  procs: Map<string, { name: string; mod: Modifier }[]>;
}
export function newPassiveBuffGrants(): PassiveBuffGrants { return {gates: [], procs: new Map(), banks:new Map(), imprints:new Set()}; }

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
    if (mod.stat === 'residualImprint' && mod.value > 0) grants.imprints.add(name);
    const art = BANK_ART[mod.stat];
    if (art && mod.value !== 0) {
      const bank = grants.banks.get(art.gauge) ?? {art,sources:new Set<string>()};
      bank.sources.add(name); grants.banks.set(art.gauge,bank);
    }
    if (!mod.when && !mod.unless && (!mod.gauge || mod.gauge === 'level')) continue;
    const key = [mod.when, mod.unless, mod.gauge, mod.gaugeAt].join('|');
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
export function gateOpen(sheet: StatSheet, m: Modifier): boolean {
  if (m.when && !sheet.hasCondition(m.when)) return false;
  if (m.unless && sheet.hasCondition(m.unless)) return false;
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
    if (b.stacks <= 0 || b.remaining <= 0 || Object.hasOwn(HARMFUL_BUFF_MARKS,id)) continue;
    const row = wornBuffRow(id,b);
    if (includeDetails) row.details = wornBuffDetails(b);
    rows.push(row);
  }
  if (actor.passiveBuffGrants) for (const {art,sources} of actor.passiveBuffGrants.banks.values()) {
    const count = actor[art.field];
    if (count > 0) rows.push({kind:'charge',id:'passive:'+art.gauge,label:art.label,count,
      look:{subject:art.subject,pose:'native'},
      ...(includeDetails ? {details:['Passive tree · '+[...sources].join(', ')]} : {})});
  }
  if (actor.passiveBuffGrants?.imprints.size) {
    const details = includeDetails ? () => ['Passive tree · '+[...actor.passiveBuffGrants!.imprints].join(', ')] : undefined;
    const spell = actor.spellImprint, attack = actor.attackImprint;
    if (spell && spell.charges > 0 && spell.remain > 0) rows.push({kind:'charge',id:'passive:spellImprint',
      label:'Residual Energy · '+spell.type+' on attack',count:spell.charges,remaining:spell.remain,
      look:{subject:spell.type==='fire'?'flame':spell.type==='cold'?'ice':spell.type==='chaos'?'void':'capacitor',pose:'native'},
      ...(details ? {details:details()} : {})});
    if (attack && attack.charges > 0 && attack.remain > 0) rows.push({kind:'charge',id:'passive:attackImprint',
      label:'Residual Energy · physical on spell',count:attack.charges,remaining:attack.remain,
      look:{subject:'fist',pose:'native'},
      ...(details ? {details:details()} : {})});
  }
  for (const { row, mod } of actor.passiveBuffGrants?.gates ?? []) {
    if (!gateOpen(actor.sheet, mod)) continue;
    const base = includeDetails ? row : (row.details ? { ...row, details: undefined } : row);
    rows.push(mod.gauge && mod.gaugeAt === undefined ? {...base, count: actor.sheet.gauge(mod.gauge)} : base);
  }
  if (actor.isPlayerKind() && actor.sheet.hasCondition('stationary') && actor.hasConditionalMods('stationary')) {
    rows.push({ kind:'stance', id:'stationary', label:'Planted', look:{subject:'roots',pose:'native'},
      ...(includeDetails ? {details:['Stationary modifiers on your equipped skills are active.']} : {}) });
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
  const def = buff.def, look = def.buffLook ?? BUFF_LOOKS[id] ?? GRANTED_BUFF_LOOKS[id] ?? modifierBuffLook(def.mods);
  const native = def.storedCue !== undefined || !!def.nextHit || !!def.consumeOn || !!def.consumeOnUse;
  return { kind:'buff', id, label:def.label ?? def.buffGrant?.proc ?? id.replace(/_/g,' '),
    ...(def.buffGrant ? { triggered:true as const } : {}),
    ...(def.supportSources?.length ? {supportSources:def.supportSources} : {}),
    look:{ ...look, pose:native ? 'native' : look.pose, color:look.color ?? def.sourceSkill?.color },
    remaining:clock(buff.remaining), duration:clock(buff.duration ?? def.duration), count:(def.maxStacks ?? 1) > 1 || buff.stacks > 1 ? buff.stacks : undefined,
    source:def.buffGrant ? undefined : def.sourceSkill, effectFace: !!GRANTED_BUFF_LOOKS[id] || !!def.buffLook,
    skillMagazine:def.sourceSkill && !def.buffGrant && (def.buffHud === 'skill' ||
      (def.buffHud !== 'strip' && (def.nextHit || def.consumeOn || def.consumeOnUse))) ? true : undefined };
}
function wornBuffDetails(buff?: ActiveBuff): string[] {
  if (!buff) return [];
  const {def} = buff, details: string[] = [];
  if (def.supportSources?.length) details.push('Support · '+def.supportSources.map(id=>SUPPORTS[id]?.name ?? id).join(', '));
  if (def.skillTreeGrants?.length) details.push('Skill tree · ' + def.skillTreeGrants.join(', '));
  if (def.sourceSkill && (def.skillTreeGrants?.length || GRANTED_BUFF_LOOKS[def.id])) details.push('Skill · ' + def.sourceSkill.name);
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
function lazyRowDetails(actor: Actor, row: BuffRow): string[] {
  if (row.details) return row.details;
  if (row.kind === 'buff') return wornBuffDetails(actor.buffs.get(row.id));
  if (row.kind === 'charge' && row.id.startsWith('passive:') && actor.passiveBuffGrants) {
    if (row.id === 'passive:spellImprint' || row.id === 'passive:attackImprint') {
      return actor.passiveBuffGrants.imprints.size
        ? ['Passive tree · ' + [...actor.passiveBuffGrants.imprints].join(', ')] : [];
    }
    const bank = actor.passiveBuffGrants.banks.get(row.id.slice(8));
    return bank ? ['Passive tree · ' + [...bank.sources].join(', ')] : [];
  }
  if (row.kind === 'passive' && actor.passiveBuffGrants) {
    const gate = actor.passiveBuffGrants.gates.find(g => g.row.id === row.id);
    if (gate?.row.details) return gate.row.details;
  }
  if (row.kind === 'stance' && row.id === 'stationary') {
    return ['Stationary modifiers on your equipped skills are active.'];
  }
  return [];
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
    return [title, ...lazyRowDetails(actor, row), ...(def?.perCharge?.length ? [row.draining === undefined ? 'Per charge' :
      row.draining ? 'Draining · bonuses active per charge' : 'Banked · bonuses activate while draining',
      ...def.perCharge.map(m => formatModLine(m,m.value))] : [])];
  }
  return [title, ...lazyRowDetails(actor, row)];
}
export function buffRows(actor: Actor): BuffRow[] {
  const rows = wornBuffRows(actor);
  if (actor.dead || actor.downed || !actor.statuses.length) return rows;
  let statuses: Map<string, BuffRow> | null = null;
  for (const s of actor.statuses) {
    const def = STATUS_DEFS[s.id];
    if (!def?.beneficial || s.remaining <= 0 || s.stacks <= 0) continue;
    statuses ??= new Map<string, BuffRow>();
    const remaining = s.remainingKnown === false ? undefined : clock(s.remaining);
    const old = statuses.get(s.id);
    if (old) {
      old.count = (old.count ?? 1) + s.stacks;
      if (remaining !== undefined && old.remaining !== undefined && remaining >= old.remaining) old.duration=clock(s.statusDuration ?? s.total ?? NaN);
      old.remaining = old.remaining === undefined || remaining === undefined ? undefined : Math.max(old.remaining, remaining);
      continue;
    }
    const look = def.buffLook ?? BENEFICIAL_LOOKS[s.id] ?? modifierBuffLook(def.mods ?? []);
    statuses.set(s.id,{ kind:'status', id:s.id, label:def.label, look:{...look, color:look.color ?? def.color},
      count:def.stacking || s.stacks > 1 ? s.stacks : undefined, remaining, duration:clock(s.statusDuration ?? s.total ?? NaN) });
  }
  return statuses ? [...rows, ...statuses.values()] : rows;
}
