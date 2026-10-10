/** Installed native skill, relation and terrain queries; no active World is captured. */
import {instanceUseCharges,registerConvertRule} from './skills';
import {MONSTERS} from '../data/monsters';
import {doodadRuleOf,type DoodadKind} from './levelgen';
import {SYMPATHY_HOOKS} from './sympathy';
import {veilSpecOf} from './veil';
import {registerDoodadFamily} from './doodadFamilies';
// THE 'companionsFull' CONVERSION RULE (SkillDef.convert): a companion
// skill whose every bond slot is HELD presses as its converted face (a
// full Tame becomes the Whistle). Registered here because the read needs
// world state; the registry itself is the open seam (engine/skills.ts).
registerConvertRule('companionsFull', (caster, inst, world) =>
  world.companionBondsOfSkill(caster, inst.def.id) >= world.companionCapOf(inst));
// THE 'chargesEmpty' CONVERSION RULE: a use-charge skill with a DRY bank
// presses as its converted face — the ammunition idiom (an empty scattergun
// becomes its own reload; a restoreSkillCharges payload turns it back).
// Graft-aware (instanceUseCharges), so a CHAMBERED cast runs dry the same
// way. Registered beside its sibling; the registry stays the open seam.
registerConvertRule('chargesEmpty', (caster, inst) => {
  const uc = instanceUseCharges(inst);
  // Empower banks never present the reload face: a dry press casts PLAIN
  // (the hybrid family's whole point — fuel, not ammunition).
  // (A VENT PRESS — useCharges.ventAll — never converts: dry, it spits plain.)
  return !!uc && uc.empower === undefined && !uc.ventAll && caster.skillChargeBank(inst).count <= 0;
});
// THE 'seatAway' CONVERSION RULE (the possession seam, engine/possess.ts):
// while the PRESSING BODY's seat is riding away from home, the granting gem
// presents its ending verb — Possession becomes Relinquish, a form gem
// becomes Return to Flesh. The gem rides the borrowed bar as the GUEST
// SLOT (seatEmbody), so the button that began the ride ends it.
registerConvertRule('seatAway', (caster, _inst, world) => !!world.seatOf(caster)?.home);
// THE SYMPATHY FABRIC's npc read (engine/sympathy.ts stays data-registry-free
// — the registerConvertRule pattern): a friendly body with an authored
// npcRole counts as kin for the 'npcs' relation.
SYMPATHY_HOOKS.isNpc = a => !!a.defId && !!MONSTERS[a.defId]?.npcRole;
// DOODAD FAMILIES (engine/doodadFamilies.ts) — the engine's own consumers
// register the exact predicates they derive with, so reported in-place churn
// (a drying pool's radius steps) re-derives only what it can actually touch:
// 'nav-block' — the convex nav grid's stamped bodies (spans + move-blockers).
//   GROUND discs are deliberately NOT members: paintNavGrounds prices them,
//   but pricing is advisory (clampPos + groundAt stay the live truth) and
//   adds/removes still rebuild via the length key — only a drying pool's
//   shrink steps ride a briefly-stale price, instead of rasterizing the
//   whole grid per step.
// 'veil' — the canopy veil index's crown-bearing kinds.
registerDoodadFamily('nav-block', (k) => {
  const r = doodadRuleOf(k as DoodadKind);
  return !!r.spans || !!r.blocksMove;
});
registerDoodadFamily('veil', (k) => veilSpecOf(k as DoodadKind) != null);
