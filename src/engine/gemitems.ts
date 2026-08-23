// ---------------------------------------------------------------------------
// THE RESIDENCE (skill-items charter M1, docs/design/skill-items.md §1) — the
// ONE pack/unpack seam between loose gems and their 1×1 bag wrapper items.
//
// THE ONE-BAG LAW: a loose gem is an ItemInstance on the `skill_gem` /
// `support_gem` base whose `gem` field carries the whole progression truth in
// SAVED form (pure JSON — the SavedSkill/SavedSocket idiom), so the wrapper
// rides every standing gear lane verbatim: uid addressing, x/y residence, the
// keeper's lock, drag sources, saves, the co-op wire, the corpse shape.
//
// THE RESIDENCE LAW: a gem lives in exactly one of three places — the bag
// (wrapped, here), a rack seat (learned: the live SkillInstance in
// knownSkills), or a socket (a SupportInstance inside its host skill). The
// GROUND stays bare gems (drops mint kind 'skill'/'support' exactly as ever);
// pickup wraps, discard unwraps — the wrapper exists only inside the bag.
//
// ONE LOCK, ONE TRUTH: while loose, THE KEEPER'S MARK lives on the WRAPPER
// (ItemInstance.locked — uid-addressed like any bag lock); learning transfers
// it onto the instance, packing folds it back. The payload never carries its
// own top-level lock (socket rows keep theirs — they are sub-cargo).
//
// Pack ↔ unpack is LOSSLESS for everything a save would keep (level, rarity,
// sockets, granted, attunedForm, treeNodes, locks); transient instance state
// (markPos, combo cursors) drops exactly as it drops through a save — the
// same law, one shape.
// ---------------------------------------------------------------------------

import { MONSTERS } from '../data/monsters';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import {
  makeSkillInstance, validTreeNodes,
  type SkillInstance, type SupportInstance,
} from './skills';
import type {
  GemPayload, GemSocketRow, ItemInstance, ItemRarity,
  SkillGemPayload, SupportGemPayload,
} from './items';
import { bagHeight, bagWidth } from './inventory';
import { itemGridSize, nextItemUid, rebuildItem } from './itemgen';

/** The wrapper base ids (data/itembases.ts — dropWeight 0, never gear-rolled). */
export const SKILL_GEM_BASE = 'skill_gem';
export const SUPPORT_GEM_BASE = 'support_gem';

export function isGemItem(i: ItemInstance): boolean {
  return i.gem !== undefined;
}

export function skillGemPayloadOf(i: ItemInstance): SkillGemPayload | null {
  return i.gem?.kind === 'skill' ? i.gem : null;
}

export function supportGemPayloadOf(i: ItemInstance): SupportGemPayload | null {
  return i.gem?.kind === 'support' ? i.gem : null;
}

/** Every loose gem in a bag (order = bag order). */
export function bagGemItems(items: readonly ItemInstance[]): ItemInstance[] {
  return items.filter(isGemItem);
}

/** The first loose gem of a kind+id in a bag, or undefined. */
export function findBagGem(
  items: readonly ItemInstance[], kind: 'skill' | 'support', id: string,
): ItemInstance | undefined {
  return items.find(i => i.gem?.kind === kind
    && (i.gem.kind === 'skill' ? i.gem.skillId : i.gem.supportId) === id);
}

/** Free cells left on the board — gems are 1×1, so `free >= n` guarantees n
 *  singles fit (any hole takes a 1×1). The all-or-nothing gift precheck. */
export function freeCellCount(items: readonly ItemInstance[]): number {
  let used = 0;
  for (const i of items) {
    if (i.x === undefined || i.y === undefined) continue;
    const s = itemGridSize(i);
    used += s.w * s.h;
  }
  return bagWidth() * bagHeight() - used;
}

/** The wrapper's ITEM rarity from the gem's own ladder — the two palettes
 *  share colors by construction (ITEM_RARITIES pins them to SKILL_RARITIES),
 *  with 'legendary' wearing the item ladder's 'unique' seat. */
export function gemItemRarityOf(p: GemPayload): ItemRarity {
  if (p.kind === 'support') return 'common';
  return p.rarity === 'legendary' ? 'unique' : p.rarity;
}

// ------------------------------------------------------------------ pack ---

const packSocketRow = (s: SupportInstance | null): GemSocketRow | null => s
  ? { supportId: s.def.id, level: s.level, ...(s.locked ? { locked: true } : {}) }
  : null;

export function packSkillGemPayload(inst: SkillInstance): SkillGemPayload {
  return {
    kind: 'skill',
    skillId: inst.def.id,
    level: inst.level,
    rarity: inst.rarity ?? 'common',
    sockets: inst.sockets.map(packSocketRow),
    ...(inst.granted ? { granted: true } : {}),
    ...(inst.attunedForm ? { attunedForm: inst.attunedForm } : {}),
    ...(inst.treeNodes?.length ? { treeNodes: [...inst.treeNodes] } : {}),
  };
}

export function packSupportGemPayload(gem: SupportInstance): SupportGemPayload {
  return { kind: 'support', supportId: gem.def.id, level: gem.level };
}

/** Wrap a live skill instance into its 1×1 bag item (no cell yet — the
 *  caller places it). Name = the skill's own (walk-1's ruling); the lock
 *  rides the wrapper. */
export function makeSkillGemItem(inst: SkillInstance): ItemInstance {
  const gem = packSkillGemPayload(inst);
  return {
    uid: nextItemUid(),
    baseId: SKILL_GEM_BASE,
    ilvl: 1, tier: 1,
    rarity: gemItemRarityOf(gem),
    name: inst.def.name,
    baseRoll: 0, implicitRolls: [], affixes: [],
    ...(inst.locked ? { locked: true } : {}),
    gem,
  };
}

export function makeSupportGemItem(sup: SupportInstance): ItemInstance {
  const gem = packSupportGemPayload(sup);
  return {
    uid: nextItemUid(),
    baseId: SUPPORT_GEM_BASE,
    ilvl: 1, tier: 1,
    rarity: gemItemRarityOf(gem),
    name: sup.def.name,
    baseRoll: 0, implicitRolls: [], affixes: [],
    ...(sup.locked ? { locked: true } : {}),
    gem,
  };
}

// ---------------------------------------------------------------- unpack ---

/** Rebuild the LIVE skill instance from a wrapper item (tolerant: unknown
 *  skill id → null — the caller treats the item as unresolvable; unknown
 *  socketed supports become empty sockets; orphaned tree picks drop). The
 *  wrapper's lock transfers onto the instance. */
export function skillOfGemItem(item: ItemInstance): SkillInstance | null {
  const p = skillGemPayloadOf(item);
  if (!p) return null;
  const def = SKILLS[p.skillId];
  if (!def) return null;
  const inst = makeSkillInstance(def, p.level, Math.max(1, p.sockets.length));
  inst.rarity = p.rarity;
  if (p.granted) inst.granted = true;
  if (p.attunedForm && MONSTERS[p.attunedForm]) inst.attunedForm = p.attunedForm;
  if (p.treeNodes?.length) inst.treeNodes = validTreeNodes(def, p.treeNodes, p.level);
  if (item.locked) inst.locked = true;
  inst.sockets = p.sockets.map(row => {
    if (!row) return null;
    const sd = SUPPORTS[row.supportId];
    return sd
      ? ({ def: sd, level: row.level, ...(row.locked ? { locked: true } : {}) } as SupportInstance)
      : null;
  });
  return inst;
}

/** Rebuild the live support instance from a wrapper item (tolerant). */
export function supportOfGemItem(item: ItemInstance): SupportInstance | null {
  const p = supportGemPayloadOf(item);
  if (!p) return null;
  const def = SUPPORTS[p.supportId];
  if (!def) return null;
  return { def, level: p.level, ...(item.locked ? { locked: true } : {}) };
}

/** Fold a (possibly mutated) live support back into its wrapper — the
 *  loose-gem level-up's write-back half. */
export function writeBackSupportGem(item: ItemInstance, sup: SupportInstance): void {
  item.gem = packSupportGemPayload(sup);
  item.name = sup.def.name;
  if (sup.locked) item.locked = true; else delete item.locked;
}

// --------------------------------------------------------------- rebuild ---

/** rebuildItem PLUS the gem-payload validation gate — THE tolerant load seam
 *  for any bag that may hold gem wrappers (saves, the co-op wire, corpse
 *  gear). An unresolvable payload (its skill/support left the registry)
 *  drops the whole item, exactly as an unknown base drops gear; socket rows
 *  and attunement validate at unpack (skillOfGemItem) so a partially stale
 *  cargo degrades instead of crashing. */
export function rebuildAnyItem(saved: ItemInstance): ItemInstance | null {
  const item = rebuildItem(saved);
  if (!item) return null;
  if (!item.gem) return item;
  if (item.gem.kind === 'skill') {
    if (!SKILLS[item.gem.skillId]) return null;
    item.name = SKILLS[item.gem.skillId].name;
  } else {
    if (!SUPPORTS[item.gem.supportId]) return null;
    item.name = SUPPORTS[item.gem.supportId].name;
  }
  return item;
}

// ------------------------------------------------------------------ look ---

/** THE ICON LAW (walk-1): the tile art IS the hotbar icon at 1×1 — the same
 *  initials the canvas bar prints (renderer.ts `initials`; one law, two
 *  surfaces — change one, change both). */
export function gemInitials(name: string): string {
  return name.split(' ').map(s => s[0]).join('').slice(0, 3).toUpperCase();
}
