import type { Modifier } from '../engine/stats';
import type { ConduitPool } from '../engine/skills';
import type { IconSubject } from '../render/skillIconArt';
import type { PassiveNode } from './passives';

/** Original Hollow Wake marks, composed with a subject on its own 24-unit tile.
 * Keep the action mark away from the allocation check and the outer rank studs. */
export const PASSIVE_EMBLEM_MOTIFS = {
  convert:   { path:'M2 3L10 12L2 21Z', subject:'translate(8 4) scale(.68)' },
  gain:      { path:'M2 12H9M5.5 8.5V15.5', subject:'translate(8 3) scale(.73)' },
  loss:      { path:'M2 12H9', subject:'translate(8 3) scale(.73)' },
  shelter:   { path:'M2 5V13Q3 19 12 22Q21 19 22 13V5', subject:'translate(4.6 .8) scale(.62)' },
  conduit:   { path:'M2 7V18H16M1 7H4M16 15L20 18L16 21', subject:'translate(6 0) scale(.7)' },
  formation: { path:'M2 15L5 20H19L22 15M12 18V22', subject:'translate(4 0) scale(.67)' },
  trigger:   { path:'M2 12L7 5H10L7 10H11L5 18L6 12Z', subject:'translate(9 5) scale(.65)' },
  repeat:    { path:'M2 8V20H16M6 5V16H18', subject:'translate(8 0) scale(.68)' },
} as const;
export type PassiveEmblemMotif = keyof typeof PASSIVE_EMBLEM_MOTIFS;
interface Emblem { icon: IconSubject; motif?: PassiveEmblemMotif }
type MajorNode = Pick<PassiveNode, 'kind' | 'choice' | 'conduit' | 'mods'>;
const byStat = new Map<string, Emblem>();
function assign(icon: IconSubject, stats: string, motif?: PassiveEmblemMotif): void {
  for (const stat of stats.split(' ')) byStat.set(stat, {icon, motif});
}

// A payoff and every node that strengthens it use the same design.
assign('chainFlight', 'chainCount');
assign('forkFlight', 'forkCount');
assign('returnFlight', 'projReturn projRecurve');
assign('arrowFan', 'fireVolley fireSalvo projectileCount volleySpacing');
assign('chainReaction', 'procDepth');
assign('bladeWard', 'blockBladeSlash salvatoryCounter parryCounterBonus guardParryPower');
assign('twinStance', 'virtuoseStance');
assign('spellsteel', 'equilibriumPower');
assign('sword', 'blockToDamage', 'shelter');
assign('thorns', 'karmaReflect thornsReflect', 'shelter');
assign('chalice', 'manaShield', 'shelter');
assign('heart', 'overhealToWard', 'shelter');
assign('plate', 'evasionToArmor', 'convert');
assign('crystal', 'lifeToEs lifeRegenToEs lifeLeechToEs', 'convert');
assign('pillar', 'esToPoise', 'convert');
assign('eye', 'evasionToInsight', 'convert');
assign('chalice', 'esToMana', 'convert');
assign('blood', 'costToLife', 'convert');
assign('venom', 'hitToAffliction', 'convert');
assign('echo', 'hitEchoFrac hitEchoDelay hitEchoAoe');
assign('phoenix', 'lastGasp lastGaspLife');
assign('bomb', 'igniteToBomb burnDetonatePower');
assign('scythe', 'hypothermiaPower');
assign('droplet', 'energyExtractPower', 'gain');
assign('dome', 'hitCap');
assign('ash', 'minionExplodeDeath minionExplodeLowLife', 'trigger');
assign('wave', 'tempestMendPulse');
assign('hourglass', 'chronoSiphon', 'gain');
assign('ant', 'summonSequence');
assign('farReach', 'farShotDamage');
assign('candle', 'chargeCap_wakeflame');
assign('fist', 'chargeCap_fury');
assign('snowflake', 'proc_spec_fire_relay', 'trigger');
assign('lightning', 'proc_spec_cold_relay', 'trigger');
assign('flame', 'proc_spec_lightning_relay', 'trigger');
assign('capacitor', 'proc_capacitor_burst', 'trigger');
assign('brokenArmor', 'proc_shatterplate', 'trigger');
assign('fist', 'proc_unbroken_wrath', 'trigger');
assign('hammer', 'proc_route_breach_spell', 'trigger');
assign('sun', 'proc_radiant_cascade', 'trigger');
assign('spiral', 'proc_exp_after_channel', 'trigger');
assign('phoenix', 'proc_phoenix', 'trigger');

const elements = new Map<string, IconSubject>([
  ['physical','sword'], ['fire','flame'], ['cold','snowflake'], ['lightning','lightning'], ['chaos','void'],
]);
const pools: Record<ConduitPool, IconSubject> = {
  es:'crystal', guard:'towerShield', insight:'eye', life:'heart', mana:'chalice', poise:'pillar', ward:'shield',
};
const minionActions = new Map<string, PassiveEmblemMotif>([
  ['minionLife','formation'], ['minionRegenPct','gain'], ['minionMaxCount','repeat'],
]);
const rangeRings = new Map<string, IconSubject>([['vs:closeRing','innerReach'],['vs:middleRing','middleReach'],['vs:farRing','farReach']]);
const transfers = new Map<string, PassiveEmblemMotif>([['convert','convert'],['takenAs','shelter'],['extraAs','gain'],['gainAs','gain']]);
const basic = new Set('damage damageTaken critChance critMulti mana energyShield life armor evasion poise attackSpeed castSpeed moveSpeed aoeRadius meleeReach projectileSpeed evasionForgone esForgone lifeForgone'.split(' '));

type SubjectLookup = (key: string) => IconSubject | undefined;
function grantEmblem(mod: Modifier, mods: readonly Modifier[], statSubject: SubjectLookup, tagSubject: SubjectLookup): Emblem | undefined {
  if (mod.kind === 'link' || mod.gauge) return;
  if (mod.stat === 'recentlyWindow' && mod.value !== 0) return {icon:'clock', motif:mod.value > 0 ? 'gain' : 'loss'};
  if (mod.value <= 0) return;
  const assigned = byStat.get(mod.stat);
  if (assigned) return assigned;
  const [operation, from, to] = mod.stat.split('_');
  const motif = transfers.get(operation);
  if (motif) {
    const icon = elements.get(to ?? from);
    if (icon) {
      const multiElement = mods.some(other => {
        if (other === mod || other.value <= 0 || !other.stat.startsWith(operation + '_')) return false;
        const destination = other.stat.split('_').at(-1)!;
        return elements.has(destination) && destination !== (to ?? from);
      });
      return {icon:multiElement ? 'prism' : icon, motif};
    }
  }
  if (mod.stat.startsWith('proc_')) return {icon:statSubject(mod.stat) ?? 'rune', motif:'trigger'};
  const tags = mod.tags ?? [];
  if (mod.stat.startsWith('minion')) {
    const tag = tags.find(t => t.startsWith('body:') && tagSubject(t)) ?? tags.find(t => t.startsWith('minion:') && tagSubject(t));
    if (tag) return {icon:tag === 'minion:skeletal_mage' ? 'runes' : tagSubject(tag)!, motif:minionActions.get(mod.stat)};
  }
  if (mod.stat === 'repeatCount' || mod.stat === 'repeatScale')
    return {icon:tags.includes('spell') ? 'rune' : tags.includes('projectile') ? 'arrow' : 'blades', motif:'repeat'};
  if (mod.stat === 'damage' || mod.stat === 'critMulti') {
    const range = tags.find(tag => rangeRings.has(tag));
    if (range) return {icon:rangeRings.get(range)!};
  }
}

/** Keep a dedicated primary power. Look past a plain incidental bonus or
 * drawback when the same node actually grants a recognizable mechanic. */
export function majorPassiveEmblem(node: MajorNode, statSubject: SubjectLookup, tagSubject: SubjectLookup):
  (Emblem & {source: string}) | undefined {
  if (node.choice || (node.kind !== 'notable' && node.kind !== 'keystone')) return;
  if (node.conduit) return {icon:pools[node.conduit.to], motif:'conduit', source:'conduit:' + node.conduit.to};
  const mods = node.mods ?? [];
  for (const [index, mod] of mods.entries()) {
    const emblem = grantEmblem(mod, mods, statSubject, tagSubject);
    if (emblem) return {...emblem, source:'mechanic:' + mod.stat};
    if (index === 0 && (!basic.has(mod.stat) || mod.kind === 'link' || mod.gauge)) break;
  }
}
