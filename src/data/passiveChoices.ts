// ---------------------------------------------------------------------------
// PASSIVE CHOICE GROUPS — the option pools that CHOICE NODES deal from.
//
// A choice node (PassiveNode.choice = { group, pick? }) references a group
// here by id. Clicking the node deals the group's options in a popup; each
// pick spends a passive point (PASSIVE_CHOICE_CFG.pickCost), permanently
// records the option on the character (PlayerMeta.choices), and locks the
// rest of that node's deal out once the pick limit is reached. There is no
// respec — a pick is a commitment, exactly like the node itself.
//
// The registry is the extensibility surface:
//   * one node, one pick        → "choose Strength / Fortitude / Intelligence"
//   * one node, pick 3 of 8     → god-tree minor blessings (multi-pick)
//   * many nodes, one group,
//     unique 'character'        → PoE-style masteries: an option taken at ANY
//                                 node sharing the group is spent for all of
//                                 them — each doctrine exists once per hero.
//
// Options carry the SAME payload surface as tree nodes (attributes, the new
// attributesPct percent lever, ordinary mods — gauge/link/proc included), so
// anything a node can grant, a choice can offer. Adding a group needs no
// engine edits; referencing it from a node is one data field. This file is
// deliberately OUTSIDE data/passives.ts: the visual tree editor rewrites that
// file wholesale, and option pools must survive an editor save untouched.
// ---------------------------------------------------------------------------

import { gaugeMod, mod, type Attributes, type Modifier } from '../engine/stats';

/** One pickable option inside a choice group. The payload mirrors a passive
 *  node's grant surface — attributes (flat), attributesPct (percent), mods. */
export interface PassiveChoiceOption {
  /** Unique WITHIN its group. Persisted in saves — renaming one orphans picks
   *  (they drop with a console note on load, like a removed node id). */
  id: string;
  name: string;
  description: string;
  attributes?: Partial<Attributes>;
  /** PERCENT attribute lever: +0.10 = "10% increased Fortitude". Folded in
   *  recalcSeat AFTER every flat grant (base + tree + gear), so it scales the
   *  whole pool — the multiplicative knob beside the flat one. */
  attributesPct?: Partial<Attributes>;
  mods?: Modifier[];
}

export interface PassiveChoiceGroup {
  id: string;
  /** Popup header — "Choose a Calling", "Doctrine of War". */
  name: string;
  options: PassiveChoiceOption[];
  /** Default pick limit for nodes dealing this group (a node's
   *  choice.pick overrides; absent → PASSIVE_CHOICE_CFG.defaultPick). */
  pick?: number;
  /** 'node' (default): each option once PER NODE — two nodes sharing the
   *  group may take the same option. 'character': each option once PER
   *  CHARACTER across every node sharing the group (the mastery rule). */
  unique?: 'node' | 'character';
}

/** What a PassiveNode.choice field holds — a group reference plus overrides.
 *  Kept to plain JSON (no option payloads inline) so the tree editor's
 *  serializer round-trips it losslessly. */
export interface PassiveChoiceRef {
  group: string;
  /** Override the group's pick limit for THIS node. */
  pick?: number;
}

/** Every tunable of the choice fabric in one place. */
export const PASSIVE_CHOICE_CFG = {
  /** Picks a node deals when neither the node nor its group says otherwise. */
  defaultPick: 1,
  /** Passive (or vocation) points one pick costs. The FIRST pick doubles as
   *  the node's allocation — a pick-1 choice node costs exactly what an
   *  ordinary node does. */
  pickCost: 1,
};

// --- registry ----------------------------------------------------------------

export const CHOICE_GROUPS: Record<string, PassiveChoiceGroup> = {};

/** Open registration — content packages / future data files may add groups. */
export function registerChoiceGroup(def: PassiveChoiceGroup): PassiveChoiceGroup {
  if (CHOICE_GROUPS[def.id]) console.warn(`[choices] duplicate choice group '${def.id}' — last wins`);
  CHOICE_GROUPS[def.id] = def;
  return def;
}

// --- resolution helpers (the ONE rulebook world.ts and the UI both read) -----

type NodeLike = { id: string; choice?: PassiveChoiceRef };
type ChoiceState = Readonly<Record<string, readonly string[]>>;

export function choiceGroupOf(node: NodeLike): PassiveChoiceGroup | undefined {
  return node.choice ? CHOICE_GROUPS[node.choice.group] : undefined;
}

/** How many picks this node deals: node override → group default → config. */
export function choicePickLimit(node: NodeLike): number {
  const g = choiceGroupOf(node);
  if (!g) return 0;
  return Math.max(1, node.choice?.pick ?? g.pick ?? PASSIVE_CHOICE_CFG.defaultPick);
}

export function choiceOptionOf(node: NodeLike, optionId: string): PassiveChoiceOption | undefined {
  return choiceGroupOf(node)?.options.find(o => o.id === optionId);
}

/** The options already picked at `nodeId` (never undefined). */
export function chosenOf(choices: ChoiceState, nodeId: string): readonly string[] {
  return Object.prototype.hasOwnProperty.call(choices, nodeId) ? choices[nodeId] : [];
}

/** Does this node still have picks to deal? (Unallocated nodes trivially do.) */
export function nodeChoiceOpen(node: NodeLike, choices: ChoiceState): boolean {
  return !!node.choice && chosenOf(choices, node.id).length < choicePickLimit(node);
}

/** Why can't `optionId` be picked at `node` right now — or null when it CAN.
 *  The single legality rule: world.allocateNode enforces it, the popup renders
 *  it (lock labels), and the sim build auditor replays it. `nodes` resolves
 *  ids for the character-unique scan (defaults to the live registry; injected
 *  so headless tools can validate hypothetical trees). */
export function choiceLockReason(
  node: NodeLike, optionId: string, choices: ChoiceState,
  nodes?: Record<string, NodeLike | undefined>,
): string | null {
  const group = choiceGroupOf(node);
  if (!node.choice || !group) return 'not a choice node';
  const opt = group.options.find(o => o.id === optionId);
  if (!opt) return 'no such option';
  const chosen = chosenOf(choices, node.id);
  if (chosen.includes(optionId)) return 'already chosen here';
  if (chosen.length >= choicePickLimit(node)) return 'all picks made';
  if (group.unique === 'character') {
    for (const [otherId, picked] of Object.entries(choices)) {
      if (otherId === node.id || !picked.includes(optionId)) continue;
      const other = nodes ? nodes[otherId] : undefined;
      // Without a registry to consult, any recorded pick of this option
      // counts (conservative); with one, only nodes sharing the group do.
      if (!nodes || other?.choice?.group === group.id) {
        return `taken at ${other && 'name' in other ? (other as { name?: string }).name ?? otherId : otherId}`;
      }
    }
  }
  return null;
}

/** Boot-time integrity sweep (validate.ts): every deal must resolve. A node
 *  referencing a missing group renders a dead popup; duplicate option ids
 *  make picks ambiguous; a pick limit past the pool locks promised picks; a
 *  character-unique group shared by more nodes×picks than it has options
 *  strands the surplus nodes with nothing to deal. Warn-only, like every
 *  content validator — bad data degrades, never throws. */
export function validatePassiveChoices(
  warn: (msg: string) => void,
  nodes: Record<string, (NodeLike & { kind?: string }) | undefined>,
): void {
  for (const g of Object.values(CHOICE_GROUPS)) {
    if (g.options.length < 2) warn(`choice group ${g.id}: a deal needs at least 2 options (has ${g.options.length})`);
    const seen = new Set<string>();
    for (const o of g.options) {
      if (seen.has(o.id)) warn(`choice group ${g.id}: duplicate option id '${o.id}'`);
      seen.add(o.id);
      if (!o.name || !o.description) warn(`choice group ${g.id}: option '${o.id}' missing name/description`);
      if (!o.attributes && !o.attributesPct && !o.mods?.length) {
        warn(`choice group ${g.id}: option '${o.id}' grants nothing`);
      }
    }
  }
  const dealtPicks: Record<string, number> = {};
  for (const n of Object.values(nodes)) {
    if (!n) continue;
    if (n.kind === 'choice' && !n.choice) warn(`passive ${n.id}: kind 'choice' but no choice deal`);
    if (!n.choice) continue;
    const g = CHOICE_GROUPS[n.choice.group];
    if (!g) { warn(`passive ${n.id}: unknown choice group '${n.choice.group}'`); continue; }
    const limit = choicePickLimit(n);
    if (limit > g.options.length) {
      warn(`passive ${n.id}: pick ${limit} exceeds group '${g.id}' pool (${g.options.length} options)`);
    }
    dealtPicks[g.id] = (dealtPicks[g.id] ?? 0) + limit;
  }
  for (const [gid, total] of Object.entries(dealtPicks)) {
    const g = CHOICE_GROUPS[gid];
    if (g?.unique === 'character' && total > g.options.length) {
      warn(`choice group ${gid}: character-unique but nodes deal ${total} picks over ${g.options.length} options (surplus nodes go dead)`);
    }
  }
}

/** Registry-tolerant rebuild of a saved/wired choices record: unknown nodes,
 *  non-choice nodes, unknown options and over-limit picks all drop silently
 *  (the same stance as removed passive ids). Returns a FRESH object with
 *  fresh arrays — never aliases the input. */
export function sanitizeChoices(
  raw: Record<string, string[]> | undefined,
  nodes: Record<string, NodeLike | undefined>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!raw) return out;
  for (const [nodeId, picked] of Object.entries(raw)) {
    if (!Object.prototype.hasOwnProperty.call(nodes, nodeId)) continue;
    const node = nodes[nodeId];
    if (!node?.choice || !Array.isArray(picked)) continue;
    const kept: string[] = [];
    for (const oid of picked) {
      if (typeof oid !== 'string' || kept.includes(oid)) continue;
      if (!choiceOptionOf(node, oid)) continue;
      if (kept.length >= choicePickLimit(node)) break;
      kept.push(oid);
    }
    if (kept.length) out[nodeId] = kept;
  }
  return out;
}

// --- the groups ----------------------------------------------------------------
// ATTRIBUTE CALLINGS — the flat lever. One node, one permanent pick.

registerChoiceGroup({
  id: 'attr_calling',
  name: 'Choose a Calling',
  options: [
    { id: 'might', name: 'Might', description: '+8 Strength', attributes: { strength: 8 } },
    { id: 'bulwark', name: 'Bulwark', description: '+8 Fortitude', attributes: { fortitude: 8 } },
    { id: 'cunning', name: 'Cunning', description: '+8 Intelligence', attributes: { intelligence: 8 } },
  ],
});

// ATTRIBUTE TEMPERS — the PERCENT lever beside the flat one: same three
// callings, multiplicative. Scales base + tree + gear, so it grows with the
// build instead of adding to it — the late-game mirror of a calling.
registerChoiceGroup({
  id: 'attr_temper',
  name: 'Temper an Attribute',
  options: [
    { id: 'tempered_might', name: 'Tempered Might', description: '10% increased Strength', attributesPct: { strength: 0.10 } },
    { id: 'tempered_bulwark', name: 'Tempered Bulwark', description: '10% increased Fortitude', attributesPct: { fortitude: 0.10 } },
    { id: 'tempered_cunning', name: 'Tempered Cunning', description: '10% increased Intelligence', attributesPct: { intelligence: 0.10 } },
  ],
});

// TRIAD CALLINGS — one group per attribute triad, so any future node can deal
// "pick one of this family" by referencing a group id. (The library half of
// the feature: groups are composable content, not per-node bespoke lists.)
registerChoiceGroup({
  id: 'attr_triad_force',
  name: 'Raw Force',
  options: [
    { id: 'str', name: 'Strength', description: '+8 Strength', attributes: { strength: 8 } },
    { id: 'dex', name: 'Dexterity', description: '+8 Dexterity', attributes: { dexterity: 8 } },
    { id: 'int', name: 'Intelligence', description: '+8 Intelligence', attributes: { intelligence: 8 } },
  ],
});
registerChoiceGroup({
  id: 'attr_triad_execution',
  name: 'Execution',
  options: [
    { id: 'prw', name: 'Prowess', description: '+8 Prowess', attributes: { prowess: 8 } },
    { id: 'fin', name: 'Finesse', description: '+8 Finesse', attributes: { finesse: 8 } },
    { id: 'wis', name: 'Wisdom', description: '+8 Wisdom', attributes: { wisdom: 8 } },
  ],
});
registerChoiceGroup({
  id: 'attr_triad_resilience',
  name: 'Resilience',
  options: [
    { id: 'for', name: 'Fortitude', description: '+8 Fortitude', attributes: { fortitude: 8 } },
    { id: 'cha', name: 'Charisma', description: '+8 Charisma', attributes: { charisma: 8 } },
    { id: 'wil', name: 'Willpower', description: '+8 Willpower', attributes: { willpower: 8 } },
  ],
});

// DOCTRINES — the mastery pattern: several nodes across the tree deal the
// SAME group with unique 'character', so each doctrine exists once per hero.
// Taking 'Stone Doctrine' at the armor cluster locks it at the block cluster —
// pathing to a second doctrine node is how you earn a second pick of the pool.

registerChoiceGroup({
  id: 'bulwark_doctrines',
  name: 'Doctrine of the Bulwark',
  unique: 'character',
  options: [
    { id: 'stone', name: 'Stone Doctrine', description: '+70 armor', mods: [mod('armor', 'flat', 70)] },
    { id: 'granite', name: 'Granite Doctrine', description: '20% increased armor', mods: [mod('armor', 'increased', 0.2)] },
    { id: 'shield', name: 'Shield Doctrine', description: '+6% block chance', mods: [mod('blockChance', 'flat', 0.06)] },
    { id: 'anvil', name: 'Anvil Doctrine', description: '+25 maximum poise', mods: [mod('poise', 'flat', 25)] },
    { id: 'salve', name: 'Salve Doctrine', description: '15% of hits that land on your life flow back as healing over 6s', mods: [mod('recuperate', 'flat', 0.15)] },
  ],
});

registerChoiceGroup({
  id: 'war_doctrines',
  name: 'Doctrine of War',
  unique: 'character',
  options: [
    { id: 'edge', name: 'Edge Doctrine', description: '18% increased melee damage', mods: [mod('damage', 'increased', 0.18, ['melee'])] },
    { id: 'tempo', name: 'Tempo Doctrine', description: '10% increased attack speed', mods: [mod('attackSpeed', 'increased', 0.1, ['attack'])] },
    { id: 'ruin', name: 'Ruin Doctrine', description: '+20% critical strike multiplier', mods: [mod('critMulti', 'flat', 0.2)] },
    { id: 'breaker', name: 'Breaker Doctrine', description: '25% increased poise damage', mods: [mod('poiseDamage', 'increased', 0.25)] },
    { id: 'reaper', name: 'Reaper Doctrine', description: '+6 life gained on kill', mods: [mod('lifeOnKill', 'flat', 6)] },
  ],
});

registerChoiceGroup({
  id: 'arcane_doctrines',
  name: 'Doctrine of the Arcane',
  unique: 'character',
  options: [
    { id: 'flux', name: 'Flux Doctrine', description: '18% increased spell damage', mods: [mod('damage', 'increased', 0.18, ['spell'])] },
    { id: 'haste', name: 'Haste Doctrine', description: '10% increased cast speed', mods: [mod('castSpeed', 'increased', 0.1)] },
    { id: 'well', name: 'Well Doctrine', description: '+30 maximum mana, +1 mana regeneration per second', mods: [mod('mana', 'flat', 30), mod('manaRegen', 'flat', 1)] },
    { id: 'veil', name: 'Veil Doctrine', description: '+35 maximum energy shield', mods: [mod('energyShield', 'flat', 35)] },
    { id: 'omen', name: 'Omen Doctrine', description: '+5% spell critical strike chance', mods: [mod('critChance', 'flat', 0.05, ['spell'])] },
  ],
});

// THE CANDLE LITANY — the god-tree groundwork: ONE node dealing pick 3 of 8
// minor verses…
registerChoiceGroup({
  id: 'wake_litany',
  name: 'The Candle Litany — recite three verses',
  pick: 3,
  options: [
    { id: 'verse_hold', name: 'Verse of Holding', description: '+1 maximum Wakeflame', mods: [mod('chargeCap_wakeflame', 'flat', 1)] },
    { id: 'verse_shed', name: 'Verse of Shedding', description: '15% increased orb shed chance', mods: [mod('orbShedRate', 'increased', 0.15)] },
    { id: 'verse_harvest', name: 'Verse of Harvest', description: 'Kills have 5% chance to shed a Wakeflame orb', mods: [mod('orbOnKill_wakeflame', 'flat', 0.05)] },
    { id: 'verse_wound', name: 'Verse of Wounds', description: 'Blows that land on you have 6% chance to shake a Wakeflame loose', mods: [mod('orbOnHurt_wakeflame', 'flat', 0.06)] },
    { id: 'verse_patience', name: 'Verse of Patience', description: 'Gain 1 Wakeflame every 12 seconds', mods: [mod('chargeRegen_wakeflame', 'flat', 1 / 12)] },
    { id: 'verse_ember', name: 'Verse of Embers', description: 'Wakeflame orbs refund 0.08s of every cooling skill', mods: [mod('orbRefund_wakeflame', 'flat', 0.08)] },
    { id: 'verse_choir', name: 'Verse of the Choir', description: 'For each Wakeflame you hold: minions deal 1.5% increased damage', mods: [gaugeMod('minionDamage', 'increased', 0.015, 'charge:wakeflame')] },
    { id: 'verse_pyre', name: 'Verse of the Pyre', description: 'For each Wakeflame you hold: 1.5% increased damage', mods: [gaugeMod('damage', 'increased', 0.015, 'charge:wakeflame')] },
  ],
});

// …and its capstone dealing 1 of 4 major refrains. Together they are the
// "3 of 12 minors, 1 of 4 majors" shape as pure data.
registerChoiceGroup({
  id: 'wake_paean',
  name: 'The Paean — one refrain',
  options: [
    { id: 'refrain_blaze', name: 'Refrain of the Blaze', description: 'For each Wakeflame you hold: 3% increased damage', mods: [gaugeMod('damage', 'increased', 0.03, 'charge:wakeflame')] },
    { id: 'refrain_shroud', name: 'Refrain of the Shroud', description: 'For each Wakeflame you hold: 4% increased armor and 1% less damage taken', mods: [gaugeMod('armor', 'increased', 0.04, 'charge:wakeflame'), gaugeMod('damageTaken', 'more', -0.01, 'charge:wakeflame')] },
    { id: 'refrain_host', name: 'Refrain of the Host', description: 'For each Wakeflame you hold: minions deal 4% increased damage', mods: [gaugeMod('minionDamage', 'increased', 0.04, 'charge:wakeflame')] },
    { id: 'refrain_tide', name: 'Refrain of the Tide', description: 'For each Wakeflame you hold: +0.4 life and +0.25 mana regeneration per second', mods: [gaugeMod('lifeRegen', 'flat', 0.4, 'charge:wakeflame'), gaugeMod('manaRegen', 'flat', 0.25, 'charge:wakeflame')] },
  ],
});
