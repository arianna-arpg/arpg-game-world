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
//   * many nodes, deal 'sole'   → a mutually exclusive CLUSTER: the first
//                                 node picked at claims the group — sibling
//                                 nodes can never be allocated (WHERE you
//                                 swear is the build decision).
//   * many nodes, deal 'first'  → SHORTCUT nodes: only the first node taken
//                                 deals; siblings stay allocatable at full
//                                 cost but grant nothing — paid pathing
//                                 across the tree, pure opportunity cost.
//
// Options carry the SAME payload surface as tree nodes (attributes, the new
// attributesPct percent lever, ordinary mods — gauge/link/proc included), so
// anything a node can grant, a choice can offer. Adding a group needs no
// engine edits; referencing it from a node is one data field. This file is
// deliberately OUTSIDE data/passives.ts: the visual tree editor rewrites that
// file wholesale, and option pools must survive an editor save untouched.
// ---------------------------------------------------------------------------

import { gaugeMod, mod, type Attributes, type Modifier } from '../engine/stats';
import type { ConduitSpec } from '../engine/skills';

/** A GRAFT: a support-gem payload a passive power can carry, BINDABLE onto
 *  one learned skill (the Grim Dawn devotion-binding shape). The support is
 *  an ordinary SUPPORTS id — grafts ride the skill's hostSockets lane beside
 *  its real gems (same tag-fit admission, no socket consumed), so the whole
 *  support vocabulary (mods, riders, cast-on-X, minion forwarding) is
 *  immediately graftable power. Binding lives in meta.grafts, keyed by the
 *  granting node (`nodeId`) or option (`nodeId:optionId`). */
export interface GraftSpec {
  /** SUPPORTS id — validated at boot. */
  support: string;
  /** Gem level of the injected payload (default 1). */
  level?: number;
}

/** One pickable option inside a choice group. The payload mirrors a passive
 *  node's grant surface — attributes (flat), attributesPct (percent), mods —
 *  plus an optional bindable GRAFT. */
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
  /** Bindable skill-graft this option grants while chosen. */
  graft?: GraftSpec;
  /** A WORN CONDUIT this option grants while chosen (see ConduitSpec /
   *  Actor.wornConduits): an actor-level resource pump — no socket spent,
   *  no skill binding. The pool adapters gate it (a guard endpoint idles
   *  off-stance by construction), and the conduitRate / conduitEfficiency
   *  stats scale it like every other pump. The guardian's poise-fed walls
   *  WITHOUT the gem slot: the opt-in the support economy doesn't tax. */
  conduit?: ConduitSpec;
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
  /** THE DEAL LAW — how ONE group's deal spreads across the several NODES
   *  that share it (the cross-NODE axis; `unique` is the cross-OPTION one):
   *    'each' (default) — every node deals the group independently.
   *    'sole'  — a mutually exclusive CLUSTER: the first node to record a
   *              pick claims the whole group, and its sibling nodes can
   *              never be ALLOCATED (choiceLockReason refuses every option,
   *              and a choice node never allocates blind).
   *    'first' — only the first node DEALS: siblings stay allocatable at
   *              full cost but the popup never opens and nothing is granted
   *              — SHORTCUT nodes, pure pathing bought at opportunity cost.
   *              (A sibling's own baked node.mods, if authored, still apply
   *              — only the DEAL dies; choice nodes usually carry none.) */
  deal?: 'each' | 'sole' | 'first';
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

/** THE DEAL LAW resolver: the OTHER node that already CLAIMED this node's
 *  'sole'/'first' group — null when the deal is live here ('each' groups
 *  always are, and a node's own picks never claim against itself). Needs the
 *  registry to know which recorded picks share the group. */
export function choiceDealClaimant(
  node: NodeLike, choices: ChoiceState,
  nodes: Record<string, NodeLike | undefined>,
): string | null {
  const group = choiceGroupOf(node);
  if (!group || (group.deal ?? 'each') === 'each') return null;
  for (const [otherId, picked] of Object.entries(choices)) {
    if (otherId === node.id || !picked.length) continue;
    if (nodes[otherId]?.choice?.group === group.id) return otherId;
  }
  return null;
}

/** 'sole' groups: is this NODE locked out of ALLOCATION because a sibling
 *  claimed the cluster? (allocateNode needs no branch of its own — every
 *  option refuses through choiceLockReason and a choice node never
 *  allocates blind — but the UI reads this to kill the glow and say why.) */
export function choiceNodeLocked(
  node: NodeLike, choices: ChoiceState,
  nodes: Record<string, NodeLike | undefined>,
): boolean {
  return choiceGroupOf(node)?.deal === 'sole' && choiceDealClaimant(node, choices, nodes) !== null;
}

/** 'first' groups: has the deal been SPENT at a sibling — leaving this node
 *  allocatable as a grant-less SHORTCUT (plain pathing at full cost)?
 *  allocateNode and the popup gate both read this one rule. */
export function choiceDealSpent(
  node: NodeLike, choices: ChoiceState,
  nodes: Record<string, NodeLike | undefined>,
): boolean {
  return choiceGroupOf(node)?.deal === 'first' && choiceDealClaimant(node, choices, nodes) !== null;
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
  // THE DEAL LAW: a 'sole' cluster claimed at a sibling refuses EVERY option
  // here (which is what locks the node out of allocation entirely); a 'first'
  // deal spent at a sibling likewise deals nothing more — the node survives
  // only as plain pathing (allocateNode's spent-shortcut branch).
  if (nodes) {
    const claimant = choiceDealClaimant(node, choices, nodes);
    if (claimant !== null) {
      const other = nodes[claimant];
      const who = other && 'name' in other ? (other as { name?: string }).name ?? claimant : claimant;
      return group.deal === 'sole' ? `cluster claimed at ${who}` : `deal spent at ${who}`;
    }
  }
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
  nodes: Record<string, (NodeLike & { kind?: string; graft?: GraftSpec }) | undefined>,
  supportExists?: (id: string) => boolean,
): void {
  // GRAFTS: every bindable payload must name a live support gem — a typo here
  // is a chip the skill book offers that injects nothing.
  if (supportExists) {
    for (const g of Object.values(CHOICE_GROUPS)) {
      for (const o of g.options) {
        if (o.graft && !supportExists(o.graft.support)) {
          warn(`choice group ${g.id}: option '${o.id}' grafts unknown support '${o.graft.support}'`);
        }
      }
    }
    for (const n of Object.values(nodes)) {
      if (n?.graft && !supportExists(n.graft.support)) {
        warn(`passive ${n.id}: grafts unknown support '${n.graft.support}'`);
      }
    }
  }
  for (const g of Object.values(CHOICE_GROUPS)) {
    if (g.options.length < 2) warn(`choice group ${g.id}: a deal needs at least 2 options (has ${g.options.length})`);
    const seen = new Set<string>();
    for (const o of g.options) {
      if (seen.has(o.id)) warn(`choice group ${g.id}: duplicate option id '${o.id}'`);
      seen.add(o.id);
      if (!o.name || !o.description) warn(`choice group ${g.id}: option '${o.id}' missing name/description`);
      // Structured payloads (a bindable graft, a worn conduit) are grants
      // too — an option carrying only one of those is fully alive.
      if (!o.attributes && !o.attributesPct && !o.mods?.length && !o.graft && !o.conduit) {
        warn(`choice group ${g.id}: option '${o.id}' grants nothing`);
      }
    }
  }
  const dealtPicks: Record<string, number> = {};
  const dealNodes: Record<string, number> = {};
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
    dealNodes[g.id] = (dealNodes[g.id] ?? 0) + 1;
  }
  for (const [gid, total] of Object.entries(dealtPicks)) {
    const g = CHOICE_GROUPS[gid];
    if (g?.unique === 'character' && total > g.options.length) {
      warn(`choice group ${gid}: character-unique but nodes deal ${total} picks over ${g.options.length} options (surplus nodes go dead)`);
    }
    // THE DEAL LAW is a rule about SIBLINGS — a 'sole'/'first' group dealt by
    // one lone node behaves exactly like 'each' (the law is inert; either the
    // deal field or the missing sibling nodes are a mistake).
    if (g?.deal && g.deal !== 'each' && dealNodes[gid] === 1) {
      warn(`choice group ${gid}: deal '${g.deal}' but only one node deals it (the law is inert)`);
    }
  }
}

// --- grafts ---------------------------------------------------------------------

/** A graft AVAILABLE to a character: resolved from an allocated node's own
 *  GraftSpec or a chosen option's. `key` is what meta.grafts and the bind
 *  intent speak; `name` labels the chip in the skill book. */
export interface GraftSource {
  key: string;                 // nodeId | nodeId:optionId
  name: string;
  description: string;
  graft: GraftSpec;
}

type GraftNodeLike = NodeLike & {
  name?: string; description?: string;
  graft?: GraftSpec;
};

/** Every graft this allocation + choice state grants, in node order. The one
 *  enumeration the recalc rebuild, the bind mutator, the skill-book strip,
 *  and the sim auditor all share. */
export function graftSourcesOf(
  allocated: ReadonlySet<string>,
  choices: ChoiceState,
  nodes: Record<string, GraftNodeLike | undefined>,
): GraftSource[] {
  const out: GraftSource[] = [];
  for (const id of allocated) {
    const node = nodes[id];
    if (!node) continue;
    if (node.graft) {
      out.push({ key: id, name: node.name ?? id, description: node.description ?? '', graft: node.graft });
    }
    if (node.choice) {
      for (const oid of chosenOf(choices, id)) {
        const opt = choiceOptionOf(node, oid);
        if (opt?.graft) {
          out.push({ key: `${id}:${oid}`, name: opt.name, description: opt.description, graft: opt.graft });
        }
      }
    }
  }
  return out;
}

/** Registry-tolerant rebuild of saved/wired graft bindings: keys must resolve
 *  to a live graft source (node allocated / option chosen), values to a known
 *  skill — anything else drops. Fresh object, never aliases the input. */
export function sanitizeGrafts(
  raw: Record<string, string | null> | undefined,
  allocated: ReadonlySet<string>,
  choices: ChoiceState,
  nodes: Record<string, GraftNodeLike | undefined>,
  knownSkill: (id: string) => boolean,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (!raw) return out;
  const live = new Set(graftSourcesOf(allocated, choices, nodes).map(s => s.key));
  for (const [key, skillId] of Object.entries(raw)) {
    if (!live.has(key)) continue;
    if (skillId === null) { out[key] = null; continue; }
    if (typeof skillId === 'string' && knownSkill(skillId)) out[key] = skillId;
  }
  return out;
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
  // THE DEAL LAW on load: a 'sole'/'first' group holds picks at ONE node —
  // a save minted before the group turned exclusive keeps its FIRST claimant
  // (record order) and later siblings' picks drop like any other stale pick.
  const claimed: Record<string, string> = {};
  for (const [nodeId, picked] of Object.entries(raw)) {
    if (!Object.prototype.hasOwnProperty.call(nodes, nodeId)) continue;
    const node = nodes[nodeId];
    if (!node?.choice || !Array.isArray(picked)) continue;
    const group = choiceGroupOf(node);
    const exclusive = group !== undefined && (group.deal ?? 'each') !== 'each';
    if (exclusive && claimed[group.id] !== undefined && claimed[group.id] !== nodeId) continue;
    const kept: string[] = [];
    for (const oid of picked) {
      if (typeof oid !== 'string' || kept.includes(oid)) continue;
      if (!choiceOptionOf(node, oid)) continue;
      if (kept.length >= choicePickLimit(node)) break;
      kept.push(oid);
    }
    if (kept.length) {
      out[nodeId] = kept;
      if (exclusive) claimed[group.id] = nodeId;
    }
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
    // WORN CONDUITS (option.conduit): the pump WITHOUT the socket — the
    // allocation opt-in beside the gem economy. The pool adapters gate
    // them (a guard endpoint idles off-stance), and conduitRate /
    // conduitEfficiency investment scales them like every other pump.
    { id: 'communion', name: 'Communion Doctrine', description: 'While any guard holds, your poise drains steadily into the wall — a worn conduit: no socket, no binding; it stops at a quarter of your bar', conduit: { from: 'poise', to: 'guard', drainPct: 0.06, ratio: 1.8, floor: 0.25 } },
    { id: 'wellspring', name: 'Wellspring Doctrine', description: 'Spare mana seeps continuously into your poise — a worn conduit that keeps a 40% mana reserve and idles while the bar is whole', conduit: { from: 'mana', to: 'poise', drainPct: 0.03, ratio: 1.0, floor: 0.4 } },
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

// DEVOTION: THE HUNT — the scaffolding constellation's one deal (see
// data/passiveRealms.ts; the realm ships locked until content attunes it).
registerChoiceGroup({
  id: 'devotion_hunt',
  name: 'The Hunt — one aspect',
  options: [
    // Each aspect grants its stats AND a bindable GRAFT (the Grim Dawn
    // shape): the passive is the constellation's gift, the graft is where
    // YOU choose to carry it — socketed onto one learned skill, free.
    { id: 'stride', name: 'Aspect of the Stride', description: '6% increased movement speed. GRAFT: Swiftness.', mods: [mod('moveSpeed', 'increased', 0.06)], graft: { support: 'swiftness' } },
    { id: 'aim', name: 'Aspect of the Eye', description: '+50 accuracy rating. GRAFT: Precision.', mods: [mod('accuracy', 'flat', 50)], graft: { support: 'precision' } },
    { id: 'fang', name: 'Aspect of the Fang', description: 'Adds 4 physical damage to attacks. GRAFT: Brutality.', mods: [mod('addedPhysical', 'flat', 4, ['attack'])], graft: { support: 'brutality' } },
  ],
});

// THE PANTHEON — the god board's two deals: ONE Major voice, three minor
// blessings. Free-standing shrines in a 'free'-adjacency realm.
registerChoiceGroup({
  id: 'pantheon_major',
  name: 'Commune — one Major voice',
  options: [
    { id: 'dawnfather', name: 'Voice of the Dawnfather', description: '+15% fire resistance, +0.5 life regeneration per second', mods: [mod('fireRes', 'flat', 0.15), mod('lifeRegen', 'flat', 0.5)] },
    { id: 'tidemother', name: 'Voice of the Tidemother', description: '+15% cold resistance, +20 maximum mana', mods: [mod('coldRes', 'flat', 0.15), mod('mana', 'flat', 20)] },
    { id: 'skycaller', name: 'Voice of the Skycaller', description: '+15% lightning resistance, 3% increased movement speed', mods: [mod('lightningRes', 'flat', 0.15), mod('moveSpeed', 'increased', 0.03)] },
    { id: 'gravekeeper', name: 'Voice of the Gravekeeper', description: '+12% chaos resistance, 10% increased minion life', mods: [mod('chaosRes', 'flat', 0.12), mod('minionLife', 'increased', 0.1)] },
  ],
});
registerChoiceGroup({
  id: 'pantheon_minor',
  name: 'Minor blessings — choose three',
  pick: 3,
  options: [
    { id: 'hearth', name: 'Blessing of Hearth', description: '+15 maximum life', mods: [mod('life', 'flat', 15)] },
    { id: 'well', name: 'Blessing of the Well', description: '+12 maximum mana', mods: [mod('mana', 'flat', 12)] },
    { id: 'mist', name: 'Blessing of Mist', description: '+15 evasion rating', mods: [mod('evasion', 'flat', 15)] },
    { id: 'stone', name: 'Blessing of Stone', description: '+12 armor', mods: [mod('armor', 'flat', 12)] },
    { id: 'spring', name: 'Blessing of the Spring', description: '+0.4 life regeneration per second', mods: [mod('lifeRegen', 'flat', 0.4)] },
    { id: 'omen', name: 'Blessing of Omens', description: '+5 maximum insight', mods: [mod('insight', 'flat', 5)] },
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

// --- THE DEAL LAW DEBUTS -------------------------------------------------------
// OATHS ('sole') — oath-stones may stand across several branches of the tree,
// but an oath is sworn ONCE: the first stone claimed seals its siblings shut.
// WHERE you swear is as much the build decision as WHAT you swear.
registerChoiceGroup({
  id: 'road_oaths',
  name: 'Oath of the Road',
  deal: 'sole',
  options: [
    { id: 'oath_stride', name: 'Oath of the Stride', description: '6% increased movement speed', mods: [mod('moveSpeed', 'increased', 0.06)] },
    { id: 'oath_stone', name: 'Oath of Stone', description: '+30 armor', mods: [mod('armor', 'flat', 30)] },
    { id: 'oath_spring', name: 'Oath of the Spring', description: '+0.6 life regeneration per second', mods: [mod('lifeRegen', 'flat', 0.6)] },
  ],
});

// COVENANTS OF THE WILDS — the mastery pattern for the beast-and-shadow
// lanes: sworn once per character (unique 'character'), dealt at stones on
// the Shepherd's Sky and the Whisper Gallery. Pathing to the second stone is
// how a hero earns a second covenant.
registerChoiceGroup({
  id: 'wild_covenants',
  name: 'Covenant of the Wilds',
  unique: 'character',
  options: [
    { id: 'pack', name: 'Covenant of the Pack', description: '15% increased minion damage; 10% increased minion movement speed', mods: [mod('minionDamage', 'increased', 0.15), mod('minionMoveSpeed', 'increased', 0.1)] },
    { id: 'warren', name: 'Covenant of the Warren', description: 'Throng finds run 25% larger', mods: [mod('throngYield', 'increased', 0.25)] },
    { id: 'quiet', name: 'Covenant of the Quiet', description: '20% harder to detect; +15% ambush damage', mods: [mod('detectability', 'increased', -0.2), mod('ambushBonus', 'flat', 0.15)] },
    { id: 'red_meal', name: 'Covenant of the Red Meal', description: '1% of damage leeched as life; 10% increased minion life', mods: [mod('lifeLeech', 'flat', 0.01), mod('minionLife', 'increased', 0.1)] },
  ],
});

// WAYPOSTS ('first') — the shortcut lane: the FIRST waypost taken deals its
// blessing; every later sibling still allocates (full point) but grants
// nothing — a paid shortcut into another branch, pure opportunity cost.
registerChoiceGroup({
  id: 'wayposts',
  name: 'The Waypost',
  deal: 'first',
  options: [
    { id: 'post_stride', name: "Wayfarer's Stride", description: '4% increased movement speed', mods: [mod('moveSpeed', 'increased', 0.04)] },
    { id: 'post_pack', name: "Wayfarer's Pack", description: '+12 maximum life', mods: [mod('life', 'flat', 12)] },
    { id: 'post_lantern', name: "Wayfarer's Lantern", description: '+8 maximum mana', mods: [mod('mana', 'flat', 8)] },
  ],
});
