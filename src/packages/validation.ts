// ---------------------------------------------------------------------------
// PACKAGE VALIDATION — one shared sweep over every ContentPackage.
//
// Before this existed, sim.ts hand-wrote a bespoke roster check per package
// (deadwake here, migration there…) and every NEW package silently shipped
// with none. This module walks the registry ONCE and validates the COMMON
// declarative shapes generically — faction rosters, encounter defs + surges,
// holdfast guardians, furnish fixtures, relationships, modifier bands — then
// appends each package's own colocated `validate(look)` for the ids private
// to its surge config. The sim warns at boot; the event QA harness FAILS on
// any hit, so a renamed monster or a typo'd tileset can never again degrade
// to a silent runtime fallback.
//
// Pure of the engine: registries arrive as injected membership predicates
// (RegistryLookups), so the harness can run this headlessly.
// ---------------------------------------------------------------------------

import { PACKAGES, PACKAGE_BY_ID } from './registry';
import type { ContentPackage, RegistryLookups } from './types';
import type { EncounterDef } from './encounters';
import type { HoldfastDef } from './holdfast';

/** Validate every registered package. Returns human-readable problem lines
 *  (empty = clean), each prefixed `pkgId:` so a hit names its owner. */
export function validatePackages(look: RegistryLookups): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of PACKAGES) {
    if (seen.has(p.id)) out.push(`${p.id}: duplicate package id in registry`);
    seen.add(p.id);
    validatePackage(p, look, out);
  }
  return out;
}

function validatePackage(p: ContentPackage, look: RegistryLookups, out: string[]): void {
  const bad = (msg: string): void => { out.push(`${p.id}: ${msg}`); };

  // --- framework bands ---------------------------------------------------
  if (p.defaultWeight < 0 || p.defaultWeight > 100) bad(`defaultWeight ${p.defaultWeight} outside 0..100`);
  if (p.defaultStartLevel < 0 || p.defaultStartLevel > 101) bad(`defaultStartLevel ${p.defaultStartLevel} outside 0..101`);
  for (const m of p.modifiers) {
    if (m.step <= 0) bad(`modifier '${m.id}' step ${m.step} must be > 0`);
    if (m.min > m.max) bad(`modifier '${m.id}' min ${m.min} > max ${m.max}`);
    if (m.defaultValue < m.min || m.defaultValue > m.max) bad(`modifier '${m.id}' default ${m.defaultValue} outside ${m.min}..${m.max}`);
  }
  for (const t of p.tiers ?? []) {
    if (t.cost < 0) bad(`tier '${t.id}' has negative cost`);
    for (const [kind, g] of Object.entries(t.grants)) {
      if (g && g.min !== undefined && g.max !== undefined && g.min > g.max) {
        bad(`tier '${t.id}' grants ${kind} min ${g.min} > max ${g.max}`);
      }
    }
  }

  // --- grafted factions ----------------------------------------------------
  for (const f of p.factions ?? []) {
    for (const r of f.roster) if (!look.monster(r.id)) bad(`faction '${f.id}' roster names unknown monster '${r.id}'`);
    if (f.warlord && !look.monster(f.warlord)) bad(`faction '${f.id}' warlord names unknown monster '${f.warlord}'`);
    for (const rel of f.relations ?? []) {
      // Stance rows are faction↔faction; both sides must resolve once every
      // package's grafts are in (validation runs post-graft at sim boot).
      if (!look.faction(rel.a)) bad(`faction '${f.id}' relation names unknown faction '${rel.a}'`);
      if (!look.faction(rel.b)) bad(`faction '${f.id}' relation names unknown faction '${rel.b}'`);
    }
  }

  // --- in-zone encounters ----------------------------------------------------
  for (const e of p.encounters ?? []) validateEncounter(p, e, look, out);

  // --- holdfast guardians ------------------------------------------------------
  for (const h of p.holdfasts ?? []) validateHoldfast(p, h, look, out);

  // --- sidezone furnishings -----------------------------------------------------
  for (const f of p.furnish ?? []) {
    if (!look.sidezone(f.sidezone)) bad(`furnish names unknown sidezone '${f.sidezone}'`);
    if (!look.structure(f.fixture.structure)) bad(`furnish fixture names unknown structure '${f.fixture.structure}'`);
  }

  // --- inter-package relationships ------------------------------------------------
  for (const rel of p.relationships ?? []) {
    if (rel.kind === 'amplifies' || rel.kind === 'suppresses') {
      if (!PACKAGE_BY_ID[rel.a]) bad(`relationship names unknown package '${rel.a}'`);
      if (!PACKAGE_BY_ID[rel.b]) bad(`relationship names unknown package '${rel.b}'`);
      if (rel.strength <= 0) bad(`relationship ${rel.a}→${rel.b} strength ${rel.strength} must be > 0`);
    } else {
      // ally/hostile are FACTION stances — they belong on FactionSpec.relations,
      // where the faction generator folds them. At package level nothing reads
      // them, so a row here is a misplaced declaration, not a working stance.
      bad(`relationship ${rel.a}→${rel.b} kind '${rel.kind}' is a faction stance — declare it on FactionSpec.relations instead`);
    }
  }

  // --- the package's own surge-private ids --------------------------------------
  if (p.validate) {
    try { out.push(...p.validate(look).map(m => `${p.id}: ${m}`)); }
    catch (err) { bad(`validate() threw: ${String(err)}`); }
  }
}

function validateEncounter(p: ContentPackage, e: EncounterDef, look: RegistryLookups, out: string[]): void {
  const bad = (msg: string): void => { out.push(`${p.id}: encounter '${e.id}' ${msg}`); };
  if (e.packageId !== p.id) bad(`packageId '${e.packageId}' ≠ owning package`);
  for (const f of e.factions) if (!look.faction(f)) bad(`names unknown faction '${f}'`);
  if (!(e.trigger.activateRadius > 0)) bad(`trigger.activateRadius must be > 0`);
  if (!e.ledger.onEncounter || !e.ledger.onClose) bad(`ledger onEncounter/onClose must be non-empty`);
  if (!e.scales.length) bad(`declares no scales`);
  for (const s of e.scales) {
    const sb = (msg: string): void => bad(`scale '${s.id}' ${msg}`);
    if (!(s.weight > 0)) sb(`weight must be > 0`);
    if (!(s.baseTime > 0)) sb(`baseTime must be > 0`);
    if (s.spawnInterval[0] > s.spawnInterval[1]) sb(`spawnInterval lo > hi`);
    if (s.spawnBatch[0] > s.spawnBatch[1]) sb(`spawnBatch lo > hi`);
    if (s.maxRadius < s.startRadius) sb(`maxRadius < startRadius`);
  }
  const g = e.surge;
  if (!g) return;
  if (!look.skill(g.meteorSkillId)) bad(`surge meteorSkillId names unknown skill '${g.meteorSkillId}'`);
  if (!look.tileset(g.epicenterTileset)) bad(`surge epicenterTileset names unknown tileset '${g.epicenterTileset}'`);
  if (!look.tileset(g.portal.tileset)) bad(`surge portal.tileset names unknown tileset '${g.portal.tileset}'`);
  if (!look.monster(g.portal.champion.monsterId)) bad(`surge portal champion names unknown monster '${g.portal.champion.monsterId}'`);
  if (!(g.maxConcurrent >= 1)) bad(`surge maxConcurrent must be >= 1`);
  if (!g.types.length) bad(`surge declares no invasion types`);
  for (const t of g.types) {
    if (!(t.weight > 0)) bad(`surge type '${t.id}' weight must be > 0`);
    for (const f of t.factions ?? []) if (!look.faction(f)) bad(`surge type '${t.id}' names unknown faction '${f}'`);
    if (t.realm?.tileset && !look.tileset(t.realm.tileset)) bad(`surge type '${t.id}' realm names unknown tileset '${t.realm.tileset}'`);
    if (t.realm?.layoutType && !look.layout(t.realm.layoutType)) bad(`surge type '${t.id}' realm names unknown layout '${t.realm.layoutType}'`);
  }
  if (!g.stages.length) bad(`surge declares no stages`);
  let prev = -1;
  for (const s of g.stages) {
    if (s.atSeconds <= prev) bad(`surge stages must ascend by atSeconds (saw ${s.atSeconds} after ${prev})`);
    prev = s.atSeconds;
  }
  if (g.stages.length && g.stages[0].atSeconds !== 0) bad(`surge stage ladder must open at atSeconds 0`);
}

function validateHoldfast(p: ContentPackage, h: HoldfastDef, look: RegistryLookups, out: string[]): void {
  const bad = (msg: string): void => { out.push(`${p.id}: holdfast '${h.id}' ${msg}`); };
  if (!look.structure(h.structure)) bad(`names unknown structure '${h.structure}'`);
  if (!look.faction(h.guardian.factionId)) bad(`guardian names unknown faction '${h.guardian.factionId}'`);
  if (!look.monster(h.guardian.keeperId)) bad(`guardian keeper names unknown monster '${h.guardian.keeperId}'`);
  for (const id of h.guardian.rosterIds ?? []) if (!look.monster(id)) bad(`guardian roster names unknown monster '${id}'`);
  if (!(h.weight > 0)) bad(`weight must be > 0`);
  if (h.maxLevel !== undefined && h.minLevel > h.maxLevel) bad(`minLevel ${h.minLevel} > maxLevel ${h.maxLevel}`);
  if (h.reward.vendorMonsterId && !look.monster(h.reward.vendorMonsterId)) bad(`reward vendor names unknown monster '${h.reward.vendorMonsterId}'`);
  for (const [tag, dest] of Object.entries(h.reward.gemTagToDest ?? {})) {
    if (dest.faction && !look.faction(dest.faction)) bad(`gemTagToDest['${tag}'] names unknown faction '${dest.faction}'`);
    if (dest.tileset && !look.tileset(dest.tileset)) bad(`gemTagToDest['${tag}'] names unknown tileset '${dest.tileset}'`);
  }
}
