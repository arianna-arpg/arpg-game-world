// ---------------------------------------------------------------------------
// Content validation — cheap cross-checks over the data files, run once at
// boot. Pure warnings: the game still runs, but authoring mistakes that
// would otherwise fail SILENTLY (a monster that can never afford its own
// skill and just stands there) get a loud console line instead.
// ---------------------------------------------------------------------------

import { FACTIONS, MATERIAL_NATURE, MONSTERS, RESERVED_KIN, WAVE_TABLE, WILDLIFE } from './monsters';
import { FACTION_TRAITS } from '../world/traits';
import { PRESENCE_BANDS, presenceMul, type PresenceSpec } from '../engine/presence';
import { SKILLS } from './skills';
import { SUPPORTS } from './supports';
import {
  CREW_CFG, DEFAULT_RELOAD_SKILL, summonCrewOf, supportFits, supportRidesMinions,
  type Delivery, type SkillDef, type SupportDef, type ConduitSpec,
} from '../engine/skills';
import { GRAFT_READ_SITES, rowUnreadBy, supportCarriesRow, type GraftReadRow } from './graftReadSites';
import { PROCS } from './procs';
import { COMBO_RULES } from './combos';
import { CLASSES, CLASS_CFG } from './classes';
import { VOCATIONS, VOCATION_CFG } from './vocations';
import { ATTUNEMENT_LIST, TERRAFORM_LIST, MAX_ATTUNE_RADIUS } from './attunements';
import { PASSIVE_NODES, vocationGateNodeId } from './passives';
import { CHOICE_GROUPS, validatePassiveChoices } from './passiveChoices';
import { validatePassiveRealms } from './passiveRealms';
import { DAMAGE_TYPES, STAT_DEFS, STAT_TRADES, type Modifier } from '../engine/stats';
import type { AIAction, BrainDef, BrainTuning, FlockSpec } from '../engine/brain';
import { regionKind, PATH_CFG, SURVIVAL_RESOURCES } from '../world/regions';
import { CHARGE_DEFS } from '../engine/charges';
import { STATUS_DEFS } from '../engine/status';
import { ZONES, OBJECTIVE_SEALS, type StampSpec, type StructureRoll } from './zones';
import { POCKET_FORMS, DEFAULT_POCKET_FORM } from './pocketForms';
import { TILESETS, pickTilesetForBiome, type BlendRoll } from './tilesets';
import { dimensionDef, dimensionIds } from '../world/dimensions';
import { validateRadianceCond } from '../world/radiance';
import { SPAN_CFG } from '../engine/spans';
import { hasBlendField } from '../engine/blend';
import { validatePassiveLayout } from './validatePassiveLayout';
import { allUnlockables, CLASS_BUNDLES } from '../meta/unlocks';
import { STARTER_CLASSES, STARTER_SKILLS, STARTER_SUPPORTS } from '../meta/account';
import { skillMimicable } from '../engine/mimic';
import { DEFAULT_MODE_ID, MODE_BY_ID, MODES } from '../meta/modes';
import { MERC_CFG } from '../meta/mercs';
import { MERC_TEMPLATES } from './mercenaries';
import { NEMESIS_CFG } from '../meta/nemesis';
import { GRUDGE_TIERS, NEMESIS_NAMES, NEMESIS_RANKS } from './nemesis';
import { MONSTER_NAME_CFG, MONSTER_NAMES } from './monsterNames';
import { RARITY_DEFS } from '../engine/rarity';
import {
  validateStamps, validateCompositions, compositionDefs, hasComposition,
  doodadRuleOf, doodadRuleKinds, hasDoodadRule,
  hasLandmark, hasLandmarkBuilder, landmarkDefs, hasLayout,
} from '../engine/levelgen';
import { interiorRoleDefs } from '../engine/interiorGen';
import { hasCommandKind } from '../engine/ai';
import { hasConvertRule } from '../engine/skills';
import { DOODAD_VISUALS } from './doodadVisuals';
import { CATCH_SPOT_LOOK, CONSTRUCT_LOOKS, LOOKS, SELF_DRESSING_KINDS } from './looks';
import { PART_PAINTERS } from '../render/vis/parts';
import './glyphParts'; // side-effect: the shipped glyph parts register before validation
import { STRUCTURES, legendCell, hasRoofStyle, type StructureDef } from './structures';
import { hasStructureGen, runStructureGen } from '../engine/structureGen';
import { liquidIds } from '../engine/genkit';
import { lintTrackSpec, TRACK_CFG, trackRider, trackRiderIds, validateTrackRiders, type TrackSpec } from '../engine/tracks';
import { lintTrapworkSpec, type TrapworkSpec } from '../engine/trapworks';
import { MELDS } from './melds';
import { BIOMES, isAquaticBiome } from '../world/biomes';
import { CLIMATE_AXES, validateClimateSpecs } from '../world/climate';
import { validateWeather } from '../world/weather';
import { validateFog } from '../engine/fog';
import './fog'; // side-effect: the fog bank defs register before validation
import './garden'; // side-effect: the Garden kit's kinds register before validation
import { validateCreep } from '../engine/creep';
import './creeps'; // side-effect: the creep kind defs register before validation
import { attunedStatus } from '../engine/tuning';
import { PUZZLE_KINDS } from '../engine/puzzles';
import { PUZZLES } from './puzzles'; // also side-effect: presets register before validation
import { validateConjury } from './conjury';
import { VOYAGE_ISLANDS } from './voyageIslands';
import {
  SYMPATHY_LINKS, SYMPATHY_LISTENABLE, SYMPATHY_RADIUS_REQUIRED, SYMPATHY_RELATIONS,
} from '../engine/sympathy';
import './sympathies'; // side-effect: the sympathy link defs register before validation
import { LIGHTWELLS } from '../engine/lightwells';
import './lightwells'; // side-effect: the ambient lightwell rows register before validation
import { ITEM_AFFIX_LIST } from './itemaffixes';
import { strataDefs } from '../world/strata';
import { hollowDef } from './hollows';
import { Rng } from '../core/rng';

export function validateContent(): void {
  const warn = (msg: string): void => console.warn(`[content] ${msg}`);
  validatePassiveLayout(warn);

  // THE COMBO GRAMMAR (data/combos.ts, engine/sequence.ts): every rule must
  // carry exactly ONE pattern kind, sane pacing, and an OWNER-scoped payoff
  // — a grammar completes on a CAST, not a hit, so there is never a struck
  // target to hand a target-shaped effect to.
  {
    const targetShaped = new Set(['status', 'extraHit', 'explosion', 'arc', 'displace', 'collisionDamage', 'summon']);
    for (const [key, rule] of Object.entries(COMBO_RULES)) {
      if (rule.id !== key) warn(`combo ${key}: id '${rule.id}' differs from its registry key`);
      const kinds = [rule.seq, rule.counts, rule.vary, rule.repeat].filter(Boolean).length;
      if (kinds !== 1) warn(`combo ${rule.id}: ${kinds === 0 ? 'no' : 'more than one'} pattern kind — exactly one of seq/counts/vary/repeat`);
      if (rule.gate && (rule.seq || rule.counts)) warn(`combo ${rule.id}: gate is read only by vary/repeat — seq/counts steps carry their own predicates`);
      if (rule.vary && rule.vary.n < 2) warn(`combo ${rule.id}: vary.n must be ≥ 2`);
      if (rule.repeat && rule.repeat.n < 2) warn(`combo ${rule.id}: repeat.n must be ≥ 2`);
      if (rule.within !== undefined && !(rule.within > 0)) warn(`combo ${rule.id}: within must be positive`);
      if (rule.icd !== undefined && rule.icd < 0) warn(`combo ${rule.id}: icd must be ≥ 0`);
      if (targetShaped.has(rule.effect.type)) {
        warn(`combo ${rule.id}: payoff '${rule.effect.type}' needs a struck target — combos fire on casts (owner-scoped effects only)`);
      }
      const steps = [...(rule.seq ?? []), ...(rule.counts?.map(c => c.step) ?? []), ...(rule.gate ? [rule.gate] : [])];
      for (const step of steps) {
        if (step.skillId && !SKILLS[step.skillId]) warn(`combo ${rule.id}: step names unknown skill '${step.skillId}'`);
      }
    }
  }

  // POCKET FORMS (data/pocketForms.ts): the shapes purchased ground can take.
  // Every knob is data — so every knob gets a boot check: the default form
  // must exist (pocketFormOf's floor), objective pools must name real kinds
  // (a typo'd kind would silently thin the roll), and the numeric levers must
  // be sane (a 0-width band or a ≤0 density would mint broken ground).
  {
    if (!POCKET_FORMS[DEFAULT_POCKET_FORM]) warn(`pocket forms: default '${DEFAULT_POCKET_FORM}' unregistered`);
    const kinds = new Set(Object.keys(OBJECTIVE_SEALS));
    kinds.add('circuit'); // the tileset-weights alias rollObjective maps onto 'beacon'
    for (const f of Object.values(POCKET_FORMS)) {
      if (!f.pitch) warn(`pocket form '${f.id}': no pitch — the parley would sell it blind`);
      for (const k of f.objectivePool ?? []) {
        if (!kinds.has(k)) warn(`pocket form '${f.id}': objectivePool names unknown kind '${k}'`);
      }
      if (f.objective && !kinds.has(f.objective.kind)) warn(`pocket form '${f.id}': objective kind '${f.objective.kind}' unknown`);
      if (f.size && !(f.size.w[0] >= 600 && f.size.w[1] >= f.size.w[0] && f.size.h[0] >= 500 && f.size.h[1] >= f.size.h[0])) {
        warn(`pocket form '${f.id}': size band ${JSON.stringify(f.size)} malformed or below the generator floor (600×500)`);
      }
      if (f.packDensity !== undefined && !(f.packDensity > 0)) warn(`pocket form '${f.id}': packDensity must be > 0`);
      if (f.bounty !== undefined && !(f.bounty > 0)) warn(`pocket form '${f.id}': bounty must be > 0`);
      if (f.caches && !(f.caches[0] >= 0 && f.caches[1] >= f.caches[0])) warn(`pocket form '${f.id}': caches band malformed`);
    }
  }

  // SURVIVAL METERS (world/regions.ts SURVIVAL_RESOURCES): a meter that deals
  // underflow damage must NAME its own doom — the warning text is per-row data,
  // so the gloom can never cry 'drowning!' in breath-blue. Ramp knobs coherent.
  {
    for (const r of Object.values(SURVIVAL_RESOURCES)) {
      const damaging = r.underflowPctLifePerSec > 0 || r.underflowRampTo !== undefined;
      if (damaging && !r.underflowText) warn(`survival '${r.id}': underflow damage with no underflowText — the doom is nameless`);
      if (r.underflowRampTo !== undefined && !(r.underflowRampSecs && r.underflowRampSecs > 0)) warn(`survival '${r.id}': underflowRampTo without a positive underflowRampSecs`);
      if (r.underflowRampTo !== undefined && r.underflowRampTo < r.underflowPctLifePerSec) warn(`survival '${r.id}': ramp peak ${r.underflowRampTo} below the starting rate`);
      if (!(r.max > 0)) warn(`survival '${r.id}': max must be > 0`);
    }
  }

  // LIGHTWELLS (engine/lightwells.ts): a lightwell without a glow is a
  // contradiction — the drawn radius IS the tested residence, so every row's
  // kind must wear a DOODAD_VISUALS light spec; the numeric levers must be sane.
  {
    for (const w of Object.values(LIGHTWELLS)) {
      if (!DOODAD_VISUALS[w.kind]?.light) warn(`lightwell '${w.kind}': no DOODAD_VISUALS light spec — drawn==tested has nothing to draw`);
      if (w.burst) {
        // A burst is one gulp, never a residence: the two grammars exclude.
        if (!(w.burst.grant > 0) || !Number.isFinite(w.burst.grant)) warn(`lightwell '${w.kind}': burst.grant must be a finite > 0`);
        if (w.feed !== undefined) warn(`lightwell '${w.kind}': burst rows never feed (drop 'feed')`);
        if (w.pool !== undefined) warn(`lightwell '${w.kind}': burst rows carry no pool (drop 'pool')`);
        if (w.decayPerSec !== undefined) warn(`lightwell '${w.kind}': burst rows never decay (drop 'decayPerSec')`);
        if (w.drainPerResident !== undefined) warn(`lightwell '${w.kind}': burst rows have no residents (drop 'drainPerResident')`);
      } else if (!(typeof w.feed === 'number' && w.feed > 0)) warn(`lightwell '${w.kind}': residence rows need feed > 0`);
      if (w.pool !== undefined && !(w.pool > 0)) warn(`lightwell '${w.kind}': pool must be > 0 when present`);
      if (w.drainPerResident !== undefined && w.drainPerResident < 0) warn(`lightwell '${w.kind}': drainPerResident must be ≥ 0`);
      if (w.decayPerSec !== undefined && !(w.decayPerSec >= 0 && Number.isFinite(w.decayPerSec))) warn(`lightwell '${w.kind}': decayPerSec must be a finite ≥ 0`);
      if (w.decayPerSec !== undefined && w.pool === undefined) warn(`lightwell '${w.kind}': decayPerSec without a pool decays nothing`);
      if (w.minReachFrac !== undefined && (w.minReachFrac < 0 || w.minReachFrac > 1)) warn(`lightwell '${w.kind}': minReachFrac outside [0,1]`);
    }
  }

  // THE TRACK FABRIC (engine/tracks.ts + data/tracks.ts): moving hazards are
  // a READABILITY contract — so every registered rider must resolve its look
  // (drawn==tested has nothing to draw otherwise), its payload must speak
  // registered vocabulary (status ids, damage types), rect riders must AGREE
  // with their painter's beam params (the DoodadRule.surface doctrine: the
  // drawn beam IS the tested rect), and authored theme lanes must lint sane —
  // including the tunneling guard (a lane faster than its blade is thick
  // could step past a body between sweeps). Contact doodads (bumpers) speak
  // the same payload grammar and get the same sweep. The glacial heart's
  // landmark + builder must both resolve — the deepwinter graft names them
  // by string and a rename would fail silently at crystallization.
  {
    validateTrackRiders(warn);
    for (const id of trackRiderIds()) {
      const rdef = trackRider(id)!;
      const vis = DOODAD_VISUALS[rdef.kind];
      if (!vis) warn(`track rider '${id}': kind '${rdef.kind}' has no DOODAD_VISUALS row — nothing to draw`);
      if (rdef.payload.status && !STATUS_DEFS[rdef.payload.status.id]) {
        warn(`track rider '${id}': payload status '${rdef.payload.status.id}' unregistered`);
      }
      if (rdef.payload.hit && !DAMAGE_TYPES.includes(rdef.payload.hit.type)) {
        warn(`track rider '${id}': payload damage type '${rdef.payload.hit.type}' unknown`);
      }
      if (rdef.surface.kind === 'rect' && vis) {
        // The agreement contract speaks two dialects: a hazard's BEAM and a
        // carrier's DECK (soulFerry) — either pair must equal the surface.
        const bp = vis.params as { beamHw?: number; beamHh?: number; deckHw?: number; deckHh?: number } | undefined;
        const hw = bp?.beamHw ?? bp?.deckHw, hh = bp?.beamHh ?? bp?.deckHh;
        if (hw !== rdef.surface.hw || hh !== rdef.surface.hh) {
          warn(`track rider '${id}': painter beam/deck params (${hw}×${hh}) disagree with surface (${rdef.surface.hw}×${rdef.surface.hh}) — the drawn body must BE the tested rect`);
        }
      }
    }
    for (const kind of doodadRuleKinds()) {
      const c = doodadRuleOf(kind).contact;
      if (!c) continue;
      if (!c.hit && !c.status && !c.impulse) warn(`contact doodad '${kind}': payload does nothing`);
      if (c.status && !STATUS_DEFS[c.status.id]) warn(`contact doodad '${kind}': status '${c.status.id}' unregistered`);
      if (c.hit && !DAMAGE_TYPES.includes(c.hit.type)) warn(`contact doodad '${kind}': damage type '${c.hit.type}' unknown`);
      if (c.impulse !== undefined && (c.impulse < 0 || c.impulse > 900)) warn(`contact doodad '${kind}': impulse ${c.impulse} outside [0,900]`);
      if (c.icdSec !== undefined && (c.icdSec < 0.2 || c.icdSec > 10)) warn(`contact doodad '${kind}': icd ${c.icdSec}s outside [0.2,10]`);
      if (!DOODAD_VISUALS[kind]) warn(`contact doodad '${kind}': no DOODAD_VISUALS row — an invisible bumper is a lie`);
    }
    const lintThemeLanes = (tracks: TrackSpec[] | undefined, where: string): void => {
      for (let i = 0; i < (tracks?.length ?? 0); i++) {
        const spec = tracks![i];
        for (const g of lintTrackSpec(spec, `${where} lane ${i}`)) warn(`tracks: ${g}`);
        for (const r of spec.riders ?? []) {
          const rd = trackRider(r.kind);
          if (!rd) continue;
          const thin = rd.surface.kind === 'circle' ? rd.surface.r * 2 : Math.min(rd.surface.hw, rd.surface.hh) * 2;
          if (spec.speed * TRACK_CFG.applyEvery > thin) {
            warn(`tracks: ${where} lane ${i} rider '${r.kind}' can tunnel — speed ${spec.speed} × sweep ${TRACK_CFG.applyEvery}s outruns its ${thin.toFixed(0)}px thickness`);
          }
        }
      }
    };
    for (const t of Object.values(TILESETS)) {
      lintThemeLanes(t.theme?.tracks, `tileset ${t.id}`);
      for (const v of t.variants ?? []) {
        lintThemeLanes((v as { theme?: { tracks?: TrackSpec[] } }).theme?.tracks, `tileset ${t.id}:${v.name}`);
      }
    }
    for (const z of Object.values(ZONES)) lintThemeLanes(z.theme?.tracks, `zone ${z.id}`);
    // THE LITE TIER net (engine/lite.ts): a theme pour of a kind that never
    // opted in mints nothing — a silent empty zone is a lie at boot time.
    const lintLitePour = (spec: { swarms?: { monsterId: string; pockets: [number, number]; size: [number, number] }[] } | undefined, where: string): void => {
      for (const row of spec?.swarms ?? []) {
        if (!MONSTERS[row.monsterId]) warn(`lite: ${where} pours unknown monster '${row.monsterId}'`);
        else if (!MONSTERS[row.monsterId].lite) warn(`lite: ${where} pours '${row.monsterId}' which has no MonsterDef.lite — nothing would mint`);
        if (row.pockets[0] > row.pockets[1]) warn(`lite: ${where} pockets lo > hi`);
        if (row.size[0] > row.size[1]) warn(`lite: ${where} size lo > hi`);
      }
    };
    for (const t of Object.values(TILESETS)) lintLitePour(t.theme?.lite, `tileset ${t.id}`);
    for (const z of Object.values(ZONES)) lintLitePour(z.theme?.lite, `zone ${z.id}`);
    // THE COLONY net (engine/lite.ts): an anchor whose kind never opted in
    // breeds nothing — and a colony of a spawner-anchor pointing at itself
    // would be a fixed-point absurdity worth naming.
    for (const m of Object.values(MONSTERS)) {
      const col = m.colony;
      if (!col) continue;
      if (!MONSTERS[col.monsterId]) warn(`colony: ${m.id} anchors unknown monster '${col.monsterId}'`);
      else if (!MONSTERS[col.monsterId].lite) warn(`colony: ${m.id} anchors '${col.monsterId}' which has no MonsterDef.lite — nothing would breed`);
      if (col.monsterId === m.id) warn(`colony: ${m.id} anchors ITSELF`);
      if (col.cap < 1) warn(`colony: ${m.id} cap < 1`);
    }
    // THE POURED-SWARM net: a litePour of a kind that never opted in vents
    // nothing (the vent skills' whole payload is the pool).
    for (const s of Object.values(SKILLS)) {
      for (const fx of s.effects ?? []) {
        if (fx.type !== 'litePour') continue;
        if (!MONSTERS[fx.monsterId]) warn(`litePour: skill ${s.id} pours unknown monster '${fx.monsterId}'`);
        else if (!MONSTERS[fx.monsterId].lite) warn(`litePour: skill ${s.id} pours '${fx.monsterId}' which has no MonsterDef.lite — nothing would mint`);
        if (fx.count[0] > fx.count[1]) warn(`litePour: skill ${s.id} count lo > hi`);
      }
    }
    if (!hasLandmark('glacial_heart')) warn(`deepwinter: 'glacial_heart' landmark unregistered — the heart graft would mint nothing`);
    if (!hasLandmarkBuilder('glacial_heart')) warn(`deepwinter: 'glacial_heart' builder unregistered`);
  }

  // THE TRAPWORKS FABRIC (engine/trapworks.ts + data/trapworks.ts): authored
  // theme mechanisms must lint sane (unregistered effect kinds fail HERE,
  // never as a silent no-op spring), every tell kind the kit names must draw,
  // and generation dial sets must stay physical (a chance outside [0,1] is a
  // typo, not a style).
  {
    const lintThemeTraps = (rows: TrapworkSpec[] | undefined, where: string): void => {
      for (let i = 0; i < (rows?.length ?? 0); i++) {
        for (const g of lintTrapworkSpec(rows![i], `${where} trapwork ${i}`)) warn(`trapworks: ${g}`);
      }
    };
    for (const t of Object.values(TILESETS)) lintThemeTraps(t.theme?.trapworks, `tileset ${t.id}`);
    for (const z of Object.values(ZONES)) lintThemeTraps(z.theme?.trapworks, `zone ${z.id}`);
    for (const kind of ['ruin_plate', 'ruin_plate_hidden', 'ruin_floor_gap', 'boulder_cradle', 'dart_maw']) {
      if (!DOODAD_VISUALS[kind]) warn(`trapworks: tell kind '${kind}' has no DOODAD_VISUALS row — an invisible mechanism is a lie`);
    }
    const lintTrapDials = (spec: unknown, where: string): void => {
      if (!spec || typeof spec !== 'object') return;
      for (const [arch, dial] of Object.entries(spec as Record<string, { chance?: number; max?: number }>)) {
        if (!['sawHalls', 'mincerRooms', 'bladeLattice', 'dartWards', 'boulderRuns', 'falseFloors'].includes(arch)) {
          warn(`trapworks: ${where} names unknown archetype '${arch}'`);
          continue;
        }
        if (dial.chance === undefined || dial.chance < 0 || dial.chance > 1) warn(`trapworks: ${where}.${arch} chance outside [0,1]`);
        if (dial.max !== undefined && (dial.max < 1 || dial.max > 4)) warn(`trapworks: ${where}.${arch} max outside [1,4]`);
        // The wheel dials stay physical: bands ordered, speeds inside the
        // track lint's own (0,600], riders resolvable at boot.
        const wd = dial as { blades?: [number, number]; speed?: [number, number]; hubR?: [number, number]; rider?: string; seating?: string };
        for (const bandKey of ['blades', 'speed', 'hubR'] as const) {
          const band = wd[bandKey];
          if (band && !(band[0] <= band[1] && band[0] > 0)) warn(`trapworks: ${where}.${arch}.${bandKey} band [${band}] not ordered-positive`);
        }
        if (wd.speed && wd.speed[1] > 600) warn(`trapworks: ${where}.${arch}.speed exceeds the lane lint's 600px/s`);
        if (wd.rider && !trackRider(wd.rider)) warn(`trapworks: ${where}.${arch}.rider '${wd.rider}' unregistered`);
        if (wd.seating && !['even', 'random'].includes(wd.seating)) warn(`trapworks: ${where}.${arch}.seating '${wd.seating}' unknown`);
      }
    };
    for (const t of Object.values(TILESETS)) {
      lintTrapDials(t.layoutParams?.trapworks, `tileset ${t.id} layoutParams.trapworks`);
      for (const v of t.variants ?? []) {
        lintTrapDials((v.layoutParams as Record<string, unknown> | undefined)?.trapworks, `tileset ${t.id}:${v.name} layoutParams.trapworks`);
      }
    }
  }

  // STRATA (world/strata.ts): the vertical ladder must TILE — contiguous
  // bands from depth 1 (a gap would drop a cave depth into the wrong band
  // silently), only the deepest band open-ended, sane rolls — and every
  // cave-face provenance claim must name a real biome ('*' = any).
  {
    const bands = strataDefs();
    if (!bands.length) warn('strata: no bands registered — the cave ladder has no shape');
    let expect = 1;
    for (let i = 0; i < bands.length; i++) {
      const s = bands[i];
      if (s.from !== expect) warn(`strata '${s.id}': from ${s.from} ≠ expected ${expect} — bands must tile the ladder`);
      if (s.to !== undefined && s.to < s.from) warn(`strata '${s.id}': to ${s.to} < from ${s.from}`);
      if (s.to === undefined && i < bands.length - 1) warn(`strata '${s.id}': open-ended band shadows the bands below it`);
      if (!s.levelStep.length) warn(`strata '${s.id}': empty levelStep`);
      if (s.deeperChance < 0 || s.deeperChance > 1) warn(`strata '${s.id}': deeperChance ${s.deeperChance} outside [0,1]`);
      if (s.darkFloor !== undefined && (s.darkFloor < 0 || s.darkFloor > 1)) warn(`strata '${s.id}': darkFloor ${s.darkFloor} outside [0,1]`);
      expect = (s.to ?? Infinity) + 1;
      if (!Number.isFinite(expect)) break;
    }
    if (bands.length && bands[bands.length - 1].to !== undefined) {
      warn(`strata '${bands[bands.length - 1].id}': the deepest band must be open-ended (no 'to')`);
    }
    const knownBiomes = new Set<string>([
      ...Object.keys(BIOMES),
      ...Object.values(TILESETS).map(t => t.biome).filter((b): b is string => !!b),
    ]);
    for (const t of Object.values(TILESETS)) {
      const f = t.caveFace;
      if (f?.variantChance !== undefined && (f.variantChance < 0 || f.variantChance > 1)) {
        warn(`tileset '${t.id}' caveFace.variantChance ${f.variantChance} outside [0,1]`);
      }
      if (f?.variantChance && !t.variants?.length) {
        warn(`tileset '${t.id}' caveFace.variantChance set but the tileset has no variants`);
      }
      if (!f?.biomes) continue;
      for (const b of Object.keys(f.biomes)) {
        if (b !== '*' && !knownBiomes.has(b)) warn(`tileset '${t.id}' caveFace.biomes: unknown biome '${b}'`);
      }
    }
    // HOLLOWS budgets (the hollows fabric): every weighted kind must be a
    // registered reveal, and the count range must be a real range.
    for (const t of Object.values(TILESETS)) {
      const hs = t.hollows;
      if (!hs) continue;
      if (hs.count[0] < 0 || hs.count[1] < hs.count[0]) {
        warn(`tileset '${t.id}' hollows.count [${hs.count}] is not a range`);
      }
      for (const k of Object.keys(hs.table)) {
        if (!hollowDef(k)) warn(`tileset '${t.id}' hollows: unregistered kind '${k}'`);
      }
    }
  }

  // THE ATTUNEMENT + PUZZLE FABRICS (engine/tuning.ts + engine/puzzles.ts):
  // every knob is data, so every knob gets a boot check.
  {
    // One attuned_<type> status per damage type — the fabric's whole
    // dressing lane; a missing row would strand a tone invisible.
    for (const t of DAMAGE_TYPES) {
      if (!STATUS_DEFS[attunedStatus(t)]) {
        warn(`attunement: missing status '${attunedStatus(t)}' for damage type '${t}'`);
      }
    }
    // Tunable bodies: tone pools must be real damage types; a rolled pool
    // must have something to roll.
    for (const m of Object.values(MONSTERS)) {
      const tu = m.tune;
      if (!tu) continue;
      for (const t of tu.tones ?? []) {
        if (!(DAMAGE_TYPES as readonly string[]).includes(t)) {
          warn(`monster '${m.id}' tune.tones: unknown damage type '${t}'`);
        }
      }
      if (tu.base && !(DAMAGE_TYPES as readonly string[]).includes(tu.base)) {
        warn(`monster '${m.id}' tune.base: unknown damage type '${tu.base}'`);
      }
      if (tu.roll && tu.tones && !tu.tones.length) {
        warn(`monster '${m.id}' tune.roll with an empty tone pool`);
      }
    }
    // Puzzle presets: kinds registered, fixture defs real + on the
    // object-actor contract (passive + immortal — a riddle whose nodes die
    // or fight is a different feature), bands sane, reward casts real.
    for (const [id, spec] of Object.entries(PUZZLES)) {
      const kind = PUZZLE_KINDS[spec.kind];
      if (!kind) { warn(`puzzle preset '${id}': unregistered kind '${spec.kind}'`); continue; }
      const heartId = spec.heart === false ? undefined : spec.heart ?? kind.heartMonster;
      for (const mid of [spec.node ?? kind.nodeMonster, heartId]) {
        if (!mid) continue;
        const md = MONSTERS[mid];
        if (!md) warn(`puzzle preset '${id}': unknown fixture monster '${mid}'`);
        else if (!md.passive || !md.immortal) {
          warn(`puzzle preset '${id}': fixture '${mid}' must be passive+immortal (the object-actor contract)`);
        }
      }
      if (spec.grid && (spec.grid[0] < 2 || spec.grid[1] < 2)) {
        warn(`puzzle preset '${id}': grid [${spec.grid}] below 2×2`);
      }
      if (spec.grid && spec.grid[0] * spec.grid[1] > 25) {
        warn(`puzzle preset '${id}': grid [${spec.grid}] beyond 5×5 (readability sanity)`);
      }
      if (spec.count && !(spec.count[1] >= spec.count[0] && spec.count[0] >= 2)) {
        warn(`puzzle preset '${id}': count [${spec.count}] is not a ≥2 range`);
      }
      if (spec.rounds && !(spec.rounds[1] >= spec.rounds[0] && spec.rounds[0] >= 1)) {
        warn(`puzzle preset '${id}': rounds [${spec.rounds}] is not a ≥1 range`);
      }
      for (const t of spec.tones ?? []) {
        if (!(DAMAGE_TYPES as readonly string[]).includes(t)) {
          warn(`puzzle preset '${id}' tones: unknown damage type '${t}'`);
        }
      }
      if (spec.reward?.cast && !SKILLS[spec.reward.cast]) {
        warn(`puzzle preset '${id}' reward.cast: unknown skill '${spec.reward.cast}'`);
      }
      if (spec.kind === 'chord' && spec.heart === false && !spec.tones?.length) {
        warn(`puzzle preset '${id}': a heartless chord needs tones[0] as its fixed goal`);
      }
    }
    // Tileset + authored-zone rows: presets exist, chances are chances,
    // fixture rows name real passive bodies, pinned objectives resolve.
    for (const t of Object.values(TILESETS)) {
      for (const row of t.puzzles ?? []) {
        if (!PUZZLES[row.id]) warn(`tileset '${t.id}' puzzles: unknown preset '${row.id}'`);
        if (!(row.chance > 0 && row.chance <= 1)) {
          warn(`tileset '${t.id}' puzzles '${row.id}': chance ${row.chance} outside (0,1]`);
        }
      }
      for (const row of t.scenery ?? []) {
        const md = MONSTERS[row.monster];
        if (!md) warn(`tileset '${t.id}' scenery: unknown monster '${row.monster}'`);
        else if (!md.passive) warn(`tileset '${t.id}' scenery: '${row.monster}' is not passive (scenery rows are object-actors)`);
        if (!(row.count[1] >= row.count[0] && row.count[0] >= 0)) {
          warn(`tileset '${t.id}' scenery '${row.monster}': count [${row.count}] is not a range`);
        }
      }
      if (t.objectives.some(o => o.kind === 'puzzle') && !t.puzzles?.length) {
        warn(`tileset '${t.id}': a 'puzzle' objective row but no puzzles repertoire — every ask would repeat the engine default`);
      }
    }
    for (const z of Object.values(ZONES)) {
      for (const row of z.puzzles ?? []) {
        if (!PUZZLES[row.id]) warn(`zone '${z.id}' puzzles: unknown preset '${row.id}'`);
      }
      for (const row of z.scenery ?? []) {
        if (!MONSTERS[row.monster]) warn(`zone '${z.id}' scenery: unknown monster '${row.monster}'`);
      }
      if (z.objective.kind === 'puzzle' && z.objective.puzzle && !PUZZLES[z.objective.puzzle]) {
        warn(`zone '${z.id}': objective pins unknown puzzle preset '${z.objective.puzzle}'`);
      }
    }
  }

  // Every authored layout entry must resolve against the live stamp/cluster/
  // structure registries — the open StampKind's safety net (variants included).
  // Composition entries and interior room-role furnishings speak the same
  // vocabulary, so they ride the same net (compositions may carry `at`).
  const layoutSources: { source: string; specs: StampSpec[]; allowAt?: boolean }[] = [
    ...Object.values(ZONES).map(z => ({ source: `zone ${z.id}`, specs: z.layout })),
    ...Object.values(TILESETS).flatMap(t => [
      { source: `tileset ${t.id}`, specs: t.layout },
      { source: `tileset ${t.id} common`, specs: t.common ?? [] },
      ...(t.variants ?? []).map((v, i) => ({ source: `tileset ${t.id} variant ${v.name ?? i}`, specs: v.layout })),
    ]),
    ...compositionDefs().flatMap(c => [
      { source: `composition ${c.id} pre`, specs: c.pre ?? [], allowAt: true },
      { source: `composition ${c.id} post`, specs: c.post ?? [], allowAt: true },
    ]),
    ...interiorRoleDefs().map(r => ({ source: `interiorRole ${r.id}`, specs: r.furnish ?? [] })),
    // Biome-meld rows speak the same stamp vocabulary (the edge WHERE band is
    // compiled by the builder; the rows themselves are plain stamp rows).
    ...Object.values(MELDS).map(m => ({ source: `meld ${m.id}`, specs: m.rows as StampSpec[] })),
  ];
  for (const msg of validateStamps(layoutSources)) warn(msg);

  // BIOME MELDS: a biome naming an edge dressing must name a REGISTERED one;
  // an overridden band must be positive (a zero band is a silent no-op).
  for (const [id, b] of Object.entries(BIOMES)) {
    if (b.meld && !MELDS[b.meld]) warn(`biome ${id}: unregistered meld '${b.meld}'`);
  }
  for (const m of Object.values(MELDS)) {
    if (m.band !== undefined && !(m.band > 0)) warn(`meld ${m.id}: band ${m.band} must be > 0`);
  }

  // THE BLEND FABRIC (engine/blend.ts): every declared blend — tileset-level
  // or variant override — must name a registered PARTNER tileset (never
  // itself), a registered FIELD shape, and sane chance/packs fractions. A
  // bad ref would otherwise no-op silently at mint (applyBlend stays safe).
  {
    const checkBlend = (owner: string, roll: BlendRoll, selfId: string): void => {
      if (!TILESETS[roll.with]) warn(`${owner}: blend partner '${roll.with}' is not a registered tileset`);
      if (roll.with === selfId) warn(`${owner}: blend partner is the tileset itself`);
      if (!hasBlendField(roll.field.kind)) warn(`${owner}: unregistered blend field '${roll.field.kind}'`);
      if (roll.chance !== undefined && (roll.chance < 0 || roll.chance > 1)) {
        warn(`${owner}: blend chance ${roll.chance} outside [0,1]`);
      }
      if (roll.packs !== undefined && (roll.packs < 0 || roll.packs > 1)) {
        warn(`${owner}: blend packs share ${roll.packs} outside [0,1]`);
      }
      if (roll.field.band && !(roll.field.band[1] > roll.field.band[0])) {
        warn(`${owner}: blend field band [${roll.field.band}] is not a rising range`);
      }
    };
    for (const t of Object.values(TILESETS)) {
      if (t.blend) checkBlend(`tileset '${t.id}'`, t.blend, t.id);
      for (const v of t.variants ?? []) {
        if (v.blend) checkBlend(`tileset '${t.id}' variant '${v.name}'`, v.blend, t.id);
      }
    }
  }

  // THE SYMPATHY FABRIC (engine/sympathy.ts): link defs must speak the
  // registered relation vocabulary, broad recipients must be radius-bounded,
  // only per-event-reachable relations may LISTEN — and every sympathy_<id>
  // stat granted ANYWHERE must name a registered link (a typo'd grant would
  // otherwise be a silent no-op forever).
  {
    for (const link of Object.values(SYMPATHY_LINKS)) {
      if (!link.channels.length) warn(`sympathy ${link.id}: no channels`);
      if (!link.to.length) warn(`sympathy ${link.id}: no recipients`);
      const from = link.from ?? 'self';
      if (!(from in SYMPATHY_RELATIONS)) {
        warn(`sympathy ${link.id}: unknown 'from' relation '${from}'`);
      } else if (!SYMPATHY_LISTENABLE.includes(from)) {
        warn(`sympathy ${link.id}: 'from' ${from} is not listenable `
          + `(the per-event holder set is gainer/owner/seats)`);
      }
      for (const to of link.to) {
        if (!(to in SYMPATHY_RELATIONS)) {
          warn(`sympathy ${link.id}: unknown 'to' relation '${to}'`);
        } else if (SYMPATHY_RADIUS_REQUIRED.includes(to) && link.radius === undefined) {
          warn(`sympathy ${link.id}: 'to' ${to} requires a radius (unbounded broadcast)`);
        }
      }
      if (link.scale !== undefined && !(link.scale > 0)) {
        warn(`sympathy ${link.id}: scale ${link.scale} must be > 0`);
      }
    }
    const checkSympathyStat = (source: string, stat: string): void => {
      if (!stat.startsWith('sympathy_')) return;
      const id = stat.slice('sympathy_'.length);
      if (!SYMPATHY_LINKS[id]) warn(`${source}: sympathy stat '${stat}' names no registered link`);
    };
    for (const def of Object.values(SKILLS)) {
      for (const m of def.equipMods ?? []) checkSympathyStat(`skill ${def.id} equipMods`, m.stat);
      for (const m of def.innateMods ?? []) checkSympathyStat(`skill ${def.id} innateMods`, m.stat);
      for (const t of def.thresholds ?? []) {
        for (const m of t.mods) checkSympathyStat(`skill ${def.id} threshold`, m.stat);
      }
      for (const m of def.leveling?.perLevel ?? []) checkSympathyStat(`skill ${def.id} leveling`, m.stat);
    }
    for (const sup of Object.values(SUPPORTS)) {
      for (const m of sup.mods) checkSympathyStat(`support ${sup.id}`, m.stat);
      for (const m of sup.perLevel ?? []) checkSympathyStat(`support ${sup.id} perLevel`, m.stat);
    }
    for (const n of Object.values(PASSIVE_NODES)) {
      for (const m of n.mods ?? []) checkSympathyStat(`passive ${n.id}`, m.stat);
    }
    for (const a of ITEM_AFFIX_LIST) {
      for (const l of a.lines) checkSympathyStat(`affix ${a.id}`, l.stat);
    }
    for (const [id, m] of Object.entries(MONSTERS)) {
      for (const link of m.sympathy ?? []) {
        if (!SYMPATHY_LINKS[link]) warn(`monster ${id}: sympathy link '${link}' is not registered`);
      }
      for (const mm of m.mods ?? []) checkSympathyStat(`monster ${id}`, mm.stat);
    }
  }

  // COMPOSITIONS: local invariants (at→site refs, when-gate keys against the
  // climate axes) + every roll on a zone/tileset/biome naming a registered
  // bundle with a sane chance.
  for (const msg of validateCompositions(id => id in CLIMATE_AXES)) warn(msg);
  const compRollSources: { source: string; rolls?: { composition: string; chance: number }[] }[] = [
    ...Object.values(ZONES).map(z => ({ source: `zone ${z.id}`, rolls: z.compositions })),
    ...Object.values(TILESETS).map(t => ({ source: `tileset ${t.id}`, rolls: t.compositions })),
    ...Object.entries(BIOMES).map(([id, b]) => ({ source: `biome ${id}`, rolls: b.compositions })),
  ];
  for (const { source, rolls } of compRollSources) {
    for (const r of rolls ?? []) {
      if (!hasComposition(r.composition)) warn(`${source}: unregistered composition '${r.composition}'`);
      if (!(r.chance >= 0 && r.chance <= 1)) warn(`${source}: composition '${r.composition}' chance ${r.chance} outside [0,1]`);
    }
  }

  // CAVE LAYOUT TABLES: every weight key must be a registered layout id
  // ('plains' = the explicit classic crawl) — an unknown id would silently
  // eat its share of the roll.
  for (const t of Object.values(TILESETS)) {
    for (const id of Object.keys(t.caveLayouts ?? {})) {
      if (!hasLayout(id)) warn(`tileset ${t.id}: caveLayouts names unregistered layout '${id}'`);
    }
  }

  // FIXTURES: a mistyped structure id silently drops the building at
  // generation (generateLayout's `if (s && …)` skips unknowns without a
  // word) — the town's smithy would just not exist. Every authored fixture
  // must resolve against STRUCTURES.
  for (const z of Object.values(ZONES)) {
    for (const f of z.fixtures ?? []) {
      if (!STRUCTURES[f.structure]) warn(`zone ${z.id}: fixture names unknown structure '${f.structure}'`);
    }
  }

  // LAYOUT PARAMS, liquid half: recipe knobs whose VALUE names a liquid
  // (riverLiquid/negativeLiquid/frozenLiquid/… — the convention is any key
  // containing 'liquid') silently degrade to water when unregistered; the
  // landmark params get this check via validateLandmarks, the layout recipes
  // read these from tileset/biome/zone data that nothing else covers.
  const liquids = new Set(liquidIds());
  const paramSources: { source: string; params?: Record<string, unknown> }[] = [
    ...Object.values(TILESETS).map(t => ({ source: `tileset ${t.id}`, params: t.layoutParams })),
    ...Object.entries(BIOMES).map(([id, b]) => ({ source: `biome ${id}`, params: b.layoutParams })),
    ...Object.values(ZONES).map(z => ({ source: `zone ${z.id}`, params: z.layoutParams })),
  ];
  for (const { source, params } of paramSources) {
    for (const [key, v] of Object.entries(params ?? {})) {
      if (!/liquid/i.test(key) && key !== 'gulf') continue;
      if (typeof v === 'string' && !liquids.has(v)) {
        warn(`${source}: layoutParams.${key} names unregistered liquid '${v}' (degrades to water)`);
      }
    }
  }

  // FORCED LAYOUTS: biome allowedLayouts are validated at boot, but a
  // tileset's forceLayout rode past that net — an unregistered id degrades
  // to a silent plains scatter.
  for (const t of Object.values(TILESETS)) {
    if (t.forceLayout && !hasLayout(t.forceLayout)) {
      warn(`tileset ${t.id}: forceLayout '${t.forceLayout}' is not a registered layout`);
    }
  }

  // VISUAL COVERAGE SWEEP — the "don't miss things in multiple passes" net.
  // Every kind the rules registry knows should own a DOODAD_VISUALS entry
  // (else it ships as the warned generic disc), and no kind should regress to
  // the crown-only groundShadow disc as its whole ground presence — the old
  // pure-geometry look the visual fabric replaced.
  const undressed = doodadRuleKinds().filter(k => !DOODAD_VISUALS[k]);
  if (undressed.length) {
    warn(`doodad kind(s) with a rule but no DOODAD_VISUALS entry (generic-disc fallback): ${undressed.join(', ')}`);
  }
  const crownOnly = Object.entries(DOODAD_VISUALS)
    .filter(([, v]) => v.painter === 'groundShadow')
    .map(([k]) => k);
  if (crownOnly.length) {
    warn(`doodad kind(s) whose ground body is still the legacy groundShadow disc: ${crownOnly.join(', ')}`);
  }

  // ACTOR half of the sweep — deployed constructs. Every construct delivery
  // must RESOLVE a portrait (its own look, else its kind's CONSTRUCT_LOOKS
  // default) that exists in LOOKS; anything short of that spawns as the
  // legacy square-in-skill-color the visual fabric retired. echo/decoy wear
  // their owner's silhouette instead (SELF_DRESSING_KINDS) and are exempt.
  for (const s of Object.values(SKILLS)) {
    const d = s.delivery;
    if (d.type !== 'construct' || SELF_DRESSING_KINDS.has(d.kind)) continue;
    const look = d.look ?? CONSTRUCT_LOOKS[d.kind];
    if (!look) {
      warn(`construct skill ${s.id} (kind '${d.kind}'): no delivery look and no CONSTRUCT_LOOKS default — spawns as the legacy square`);
    } else if (!LOOKS[look]) {
      warn(`construct skill ${s.id}: look '${look}' is not a LOOKS entry`);
    }
  }
  // The catch-spot mint plants CATCH_SPOT_LOOK when the spec names none —
  // the default itself must stay registered while any catchSpot skill lives.
  if (!LOOKS[CATCH_SPOT_LOOK] && Object.values(SKILLS).some(s =>
    s.delivery.type === 'projectile' && s.delivery.catchSpot && !s.delivery.catchSpot.look)) {
    warn(`catchSpot skills rely on default look '${CATCH_SPOT_LOOK}' but it is not a LOOKS entry`);
  }
  // DANGLING PORTRAITS: every named look id, wherever it's named — a typo
  // silently regresses the body to the legacy shape; make it loud. (Monster
  // defs, class skins, the construct kind registry, catch-spot overrides.)
  const lookRefs: [string, string | undefined][] = [
    ...Object.values(MONSTERS).map((m): [string, string | undefined] => [`monster ${m.id}`, m.look]),
    ...CLASSES.map((c): [string, string | undefined] => [`class ${c.id}`, c.look]),
    ...Object.entries(CONSTRUCT_LOOKS).map(([k, v]): [string, string | undefined] => [`CONSTRUCT_LOOKS.${k}`, v]),
    ...Object.values(SKILLS).map((s): [string, string | undefined] => [
      `skill ${s.id} catchSpot`,
      s.delivery.type === 'projectile' ? s.delivery.catchSpot?.look : undefined,
    ]),
  ];
  for (const [src, id] of lookRefs) {
    if (id && !LOOKS[id]) warn(`${src}: look '${id}' is not a LOOKS entry`);
  }
  // DANGLING PART KINDS: every part a look composes must resolve to a painter
  // (hand-written or a registered glyph) — the renderer's dispatch guard
  // silently SKIPS unknown kinds, so the class that "carries knives" walks
  // out bare-handed and nobody hears about it. Make it loud instead.
  for (const [id, look] of Object.entries(LOOKS)) {
    for (const p of [...look.parts, ...(look.live ?? [])]) {
      if (!PART_PAINTERS[p.kind]) warn(`look ${id}: part kind '${p.kind}' has no painter (PART_PAINTERS + registered glyphs)`);
    }
  }

  // WEATHER: every registered kind's cross-refs resolve (a strike names a real
  // skill, sky-spawnable kinds carry a skyWeight) — the open WeatherKind's
  // safety net, exactly as validateStamps backstops the open StampKind.
  for (const msg of validateWeather(id => !!SKILLS[id], k => !!DOODAD_VISUALS[k])) warn(msg);

  // DIMENSIONS: every registered dimension's palette biome — and its gate
  // biome — must resolve at least one tileset THROUGH THAT DIMENSION'S pool
  // (surface pool ∪ TilesetDef.realm members). A biome that resolves nothing
  // makes every mint keep its inherited corridor tileset (or the gate fall
  // back to 'wasteland'): the aetherial ran that way for two days — heaven
  // minting hell's face — because its faces were realm-locked out of the
  // shared index with no membership anywhere else. Never again silent.
  const dimProbeRng = new Rng(0xd1a5eed);
  for (const dimId of dimensionIds()) {
    if (dimId === 'surface') continue; // the surface IS the shared pool
    const dim = dimensionDef(dimId);
    for (const row of dim.biomes ?? []) {
      if (!pickTilesetForBiome(row.biome, dimProbeRng, undefined, dimId)) {
        warn(`dimension '${dimId}': palette biome '${row.biome}' resolves NO tileset in its pool — mints will keep the inherited corridor tileset`);
      }
    }
    const gateBiome = dim.entry?.gate.biome;
    if (gateBiome && !pickTilesetForBiome(gateBiome, dimProbeRng, undefined, dimId)) {
      warn(`dimension '${dimId}': gate biome '${gateBiome}' resolves NO tileset in its pool — the gate zone will mint as 'wasteland'`);
    }
    for (const course of dim.courses ?? []) {
      if (!pickTilesetForBiome(course.biome, dimProbeRng, undefined, dimId)) {
        warn(`dimension '${dimId}': course '${course.id}' biome '${course.biome}' resolves NO tileset in its pool`);
      }
    }
  }

  // FOG: every bank's grants name real statuses; every theme fog spec (base
  // AND variant overrides) names registered banks — the fog fabric's safety
  // net, same contract as weather above.
  const fogSpecs: { owner: string; spec: NonNullable<typeof TILESETS[string]['theme']['fog']> }[] = [];
  for (const t of Object.values(TILESETS)) {
    if (t.theme.fog) fogSpecs.push({ owner: `tileset '${t.id}'`, spec: t.theme.fog });
    for (const v of t.variants ?? []) {
      if (v.theme?.fog) fogSpecs.push({ owner: `tileset '${t.id}' variant '${v.name}'`, spec: v.theme.fog });
    }
  }
  for (const msg of validateFog(id => !!STATUS_DEFS[id], fogSpecs)) warn(msg);

  // CREEP: every kind's grants name real statuses; every theme creep spec
  // (base AND variant overrides) names registered kinds — the creep fabric
  // rides the fog fabric's exact safety-net contract. Advancing-front rows
  // resolve every lever against the registry it points at: damage types,
  // sensed ground kinds, monsters, remnant doodads — and consume fuels
  // against the fuel tags DoodadRules actually declare (the dead-row lint:
  // a consume row nothing feeds warns loud).
  const creepSpecs: { owner: string; spec: NonNullable<typeof TILESETS[string]['theme']['creep']>; aquatic?: boolean }[] = [];
  for (const t of Object.values(TILESETS)) {
    // Aquatic owners (whole-floor seabeds) stamp the flag so validateCreep
    // can warn about sea-forsworn rows the build would silently skip.
    const aq = isAquaticBiome(t.biome);
    if (t.theme.creep) creepSpecs.push({ owner: `tileset '${t.id}'`, spec: t.theme.creep, ...(aq ? { aquatic: true } : {}) });
    for (const v of t.variants ?? []) {
      if (v.theme?.creep) creepSpecs.push({ owner: `tileset '${t.id}' variant '${v.name}'`, spec: v.theme.creep, ...(aq ? { aquatic: true } : {}) });
    }
  }
  const declaredFuels = new Set<string>();
  for (const k of doodadRuleKinds()) {
    const fuel = doodadRuleOf(k).fuel;
    if (fuel) declaredFuels.add(fuel);
  }
  for (const msg of validateCreep(id => !!STATUS_DEFS[id], creepSpecs, {
    isDamageType: id => (DAMAGE_TYPES as readonly string[]).includes(id),
    hasGroundKind: id => !!regionKind(id),
    hasMonster: id => !!MONSTERS[id],
    hasDoodadKind: id => hasDoodadRule(id),
    fuelTags: declaredFuels,
  })) warn(msg);
  // Front-lane radiance gates carry sane conditions (the span contract).
  for (const { owner, spec } of creepSpecs) {
    for (const row of spec.fronts ?? []) {
      if (row.when) for (const msg of validateRadianceCond(`${owner} front lane '${row.id}'`, row.when as import('../world/radiance').RadianceCond)) warn(msg);
    }
  }

  // EPHEMERAL SPANS: every theme span row (base AND variant overrides) names
  // registered region kinds — the standing kind, its fading twin, and the
  // void it becomes — and carries a sane RadianceCond. The span fabric
  // repaints between exactly these three; an unregistered kind would paint
  // an invisible, unwalkable hole with no warning look.
  for (const t of Object.values(TILESETS)) {
    const spanSpecs: { owner: string; rows: NonNullable<typeof t.theme.spans> }[] = [];
    if (t.theme.spans) spanSpecs.push({ owner: `tileset '${t.id}'`, rows: t.theme.spans });
    for (const v of t.variants ?? []) {
      if (v.theme?.spans) spanSpecs.push({ owner: `tileset '${t.id}' variant '${v.name}'`, rows: v.theme.spans });
    }
    for (const { owner, rows } of spanSpecs) {
      for (const row of rows) {
        if (!regionKind(row.region)) warn(`${owner}: span region '${row.region}' is not registered`);
        else if (!regionKind(row.region)?.walkable) warn(`${owner}: span region '${row.region}' is not walkable — a span IS ground`);
        const fadeK = row.fadeRegion ?? `${row.region}_fading`;
        if (!regionKind(fadeK)) warn(`${owner}: span fade region '${fadeK}' is not registered`);
        const voidK = row.voidRegion ?? SPAN_CFG.voidRegion;
        if (!regionKind(voidK)) warn(`${owner}: span void region '${voidK}' is not registered`);
        else if (regionKind(voidK)?.walkable) warn(`${owner}: span void region '${voidK}' is walkable — a gone span must be a hole`);
        for (const msg of validateRadianceCond(`${owner} span '${row.region}'`, row.when)) warn(msg);
        if (!row.when || (!row.when.radiance && !row.when.weather?.length && !row.when.phases?.length)) {
          warn(`${owner}: span '${row.region}' has no condition — permanent ground belongs to the layout, not the span fabric`);
        }
      }
    }
  }

  // PITFALL (the pitfall fabric, engine/pitfall.ts): every DoodadRule.fall
  // names a registered VOID-LIKE region row (a pit resolving through
  // walkable ground or a true wall is a dead lever that could never fire),
  // and every theme pitfall policy (base AND variant overrides) is a sane
  // pit policy — descend/fall/eject/block with damage inside honest bands.
  // Sky doors are their own fabric: a pit declaring 'skyfall' is almost
  // certainly a data slip and warns loud.
  for (const k of doodadRuleKinds()) {
    const fall = doodadRuleOf(k).fall;
    if (!fall) continue;
    const rk = regionKind(fall.region);
    if (!rk) {
      warn(`doodad rule '${k}' fall.region '${fall.region}' is not a registered region kind`);
    } else if (rk.walkable || rk.blocks) {
      warn(`doodad rule '${k}' fall.region '${fall.region}' is not void-like (!walkable && !blocks) — its falls could never resolve`);
    }
  }
  for (const t of Object.values(TILESETS)) {
    const specs: { owner: string; policy: NonNullable<typeof t.theme.pitfall> }[] = [];
    if (t.theme.pitfall) specs.push({ owner: `tileset '${t.id}'`, policy: t.theme.pitfall });
    for (const v of t.variants ?? []) {
      if (v.theme?.pitfall) specs.push({ owner: `tileset '${t.id}' variant '${v.name}'`, policy: v.theme.pitfall });
    }
    for (const { owner, policy } of specs) {
      if (policy.kind === 'skyfall' || policy.kind === 'teleport' || policy.kind === 'instakill') {
        warn(`${owner} theme.pitfall kind '${policy.kind}' — pits take descend/fall/eject/block; sky doors and executions are their own fabrics`);
      }
      const dmg = policy.kind === 'descend' || policy.kind === 'fall' || policy.kind === 'eject' ? policy.damage : undefined;
      if (dmg) {
        if (dmg.pctMaxLife !== undefined && (dmg.pctMaxLife < 0 || dmg.pctMaxLife > 0.9)) {
          warn(`${owner} theme.pitfall damage pctMaxLife ${dmg.pctMaxLife} outside the honest band [0, 0.9]`);
        }
        if (dmg.amount < 0) warn(`${owner} theme.pitfall damage amount ${dmg.amount} is negative`);
      }
    }
  }

  // CONJURY: rider grants (data/conjury.ts) and every skill's conjure /
  // trailConjure grant rows name real statuses — the called-cloud presence
  // rides the fog/creep safety-net contract.
  for (const msg of validateConjury(id => !!STATUS_DEFS[id])) warn(msg);
  for (const def of Object.values(SKILLS)) {
    const grantRows: { src: string; grants?: readonly { status: string }[] }[] = [];
    for (const fx of def.effects) {
      if (fx.type === 'conjure') grantRows.push({ src: `skill '${def.id}' conjure`, ...(fx.grants ? { grants: fx.grants } : {}) });
    }
    if (def.delivery.type === 'dash' && def.delivery.trailConjure?.grants) {
      grantRows.push({ src: `skill '${def.id}' trailConjure`, grants: def.delivery.trailConjure.grants });
    }
    for (const row of grantRows) {
      for (const g of row.grants ?? []) {
        if (!STATUS_DEFS[g.status]) warn(`${row.src}: grant names unknown status '${g.status}'`);
      }
    }
  }

  // STRUCTURES: plans resolve their legend, generators exist (and a fixed-seed
  // SAMPLE of each generator def emits only known chars), roof styles resolve,
  // fx/legend doodad kinds are legal (never seed-paired), and every structure
  // ROLL (zone/tileset/biome) names a real def. Bastion-weighted biomes must
  // resolve at least one bastion-capable def or the layout mints empty arenas.
  const checkPlanChars = (s: StructureDef, rows: string[], src: string): void => {
    const seen = new Set<string>();
    for (const row of rows) {
      for (const ch of row) {
        if (ch === ' ' || seen.has(ch)) continue;
        seen.add(ch);
        const cell = legendCell(ch, s.legend);
        if (!cell) { warn(`${src}: plan char '${ch}' resolves to no legend entry`); continue; }
        if (cell.doodad && doodadRuleOf(cell.doodad.kind).seedPaired) {
          warn(`${src}: legend char '${ch}' emits seed-paired kind '${cell.doodad.kind}' (forbidden in plans)`);
        }
        if (cell.doodad && !hasDoodadRule(cell.doodad.kind)) {
          warn(`${src}: legend char '${ch}' emits kind '${cell.doodad.kind}' with NO registered rule (falls to walkable ground — typo?)`);
        }
      }
    }
  };
  for (const s of Object.values(STRUCTURES)) {
    if (s.plan && s.generator) warn(`structure ${s.id}: has BOTH plan and generator (plan wins; drop one)`);
    if (s.generator && !hasStructureGen(s.generator)) {
      warn(`structure ${s.id}: unknown generator '${s.generator}'`);
    } else if (s.generator) {
      const sample = runStructureGen(s.generator, new Rng(0x5eed), s.genParams ?? {});
      if (!sample?.length) warn(`structure ${s.id}: generator '${s.generator}' emitted an empty plan`);
      else checkPlanChars(s, sample, `structure ${s.id} (sampled)`);
    }
    if (s.plan) checkPlanChars(s, s.plan, `structure ${s.id}`);
    if (s.roofStyle && !hasRoofStyle(s.roofStyle)) warn(`structure ${s.id}: unknown roof style '${s.roofStyle}'`);
    for (const fx of s.fx ?? []) {
      if (doodadRuleOf(fx.doodad.kind).seedPaired) warn(`structure ${s.id}: fx layer emits seed-paired kind '${fx.doodad.kind}'`);
      if (!hasDoodadRule(fx.doodad.kind)) warn(`structure ${s.id}: fx layer emits kind '${fx.doodad.kind}' with NO registered rule (typo?)`);
      if (fx.where === 'char' && !fx.char) warn(`structure ${s.id}: fx layer where:'char' without a char`);
    }
    if (s.bastion && !(s.plan || s.generator)) warn(`structure ${s.id}: bastion-weighted but has no plan/generator`);
  }
  const checkRolls = (src: string, rolls: StructureRoll[] | undefined): void => {
    for (const r of rolls ?? []) if (!STRUCTURES[r.structure]) warn(`${src}: structure roll names unknown '${r.structure}'`);
  };
  const checkLandmarkRolls = (src: string, rolls: { landmark: string }[] | undefined): void => {
    for (const r of rolls ?? []) if (!hasLandmark(r.landmark)) warn(`${src}: landmark roll names unknown '${r.landmark}'`);
  };
  for (const z of Object.values(ZONES)) { checkRolls(`zone ${z.id}`, z.structures); checkLandmarkRolls(`zone ${z.id}`, z.landmarks); }
  for (const t of Object.values(TILESETS)) { checkRolls(`tileset ${t.id}`, t.structures); checkLandmarkRolls(`tileset ${t.id}`, t.landmarks); }
  for (const [id, b] of Object.entries(BIOMES)) {
    checkRolls(`biome ${id}`, b.structures);
    checkLandmarkRolls(`biome ${id}`, b.landmarks);
    if (b.allowedLayouts?.bastion) {
      const pool = (b.structures ?? []).map(r => STRUCTURES[r.structure]).filter(s => s?.bastion && (s.plan || s.generator));
      if (!pool.length) warn(`biome ${id}: weights 'bastion' but resolves no bastion-capable structure`);
    }
  }

  // LANDMARKS: builders registered, liquids resolvable, rim doodad kinds ruled,
  // pit-spawn tables name real monsters. (The recipes registered before boot
  // via main.ts side-effect imports.)
  const knownLiquids = new Set(liquidIds());
  for (const lm of landmarkDefs()) {
    if (!hasLandmarkBuilder(lm.builder)) warn(`landmark ${lm.id}: unknown builder '${lm.builder}'`);
    // Every param a builder feeds to liquidOf/paintLiquid: the base liquid,
    // fills, skirts, pit/pool floors (demon_pit's 'cinder'), and coast gulfs.
    const liquids = [lm.liquid, lm.params?.liquid, lm.params?.fill, lm.params?.skirt, lm.params?.floorKind, lm.params?.gulf]
      .filter((x): x is string => typeof x === 'string');
    for (const lq of liquids) {
      if (!knownLiquids.has(lq) && lq !== 'ground') warn(`landmark ${lm.id}: unknown liquid '${lq}'`);
    }
    const rim = lm.params?.rim as { kind?: string } | undefined;
    if (rim?.kind && !hasDoodadRule(rim.kind)) warn(`landmark ${lm.id}: rim kind '${rim.kind}' has no doodad rule`);
    for (const e of lm.spawns?.table ?? []) {
      if (!MONSTERS[e.id]) warn(`landmark ${lm.id}: spawn table names unknown monster '${e.id}'`);
    }
  }

  // FEINT DISCIPLINE: a bluffed cast bar is a SIGNATURE move. The player
  // cannot cancel a bar, so an enemy that constantly does reads as broken
  // rather than clever — keep chances rare and deliberate (tricksters only).
  const feintCheck = (id: string, chance: number | undefined, src: string): void => {
    if (chance !== undefined && chance > 0.35) {
      warn(`monster ${id}: ${src} feint.chance ${chance} > 0.35 — feints are signature moves, keep them RARE`);
    }
  };
  for (const def of Object.values(MONSTERS)) {
    feintCheck(def.id, def.brain?.behavior?.feint?.chance, 'brain');
    for (const [i, v] of (def.brainVariants ?? []).entries()) {
      feintCheck(def.id, v.brain?.behavior?.feint?.chance, `brainVariants[${i}]`);
    }
  }

  // THE MURMURATION FABRIC — three boot checks, def + variants alike:
  // (1) scripted verbs cast REAL skills (aiActions' mintInst no-ops on a
  //     typo — a dive that silently never fires), (2) flock dials stay
  //     physical (a runaway weave is a body-sized blender), (3) a declared
  //     natural group is a sane band (entry-burst discipline).
  const scriptedCasts = (b: BrainDef | undefined, push: (skill: string) => void): void => {
    if (!b) return;
    const fromActs = (acts?: readonly AIAction[]): void => {
      for (const a of acts ?? []) {
        if ((a.do === 'cast' || a.do === 'ring' || a.do === 'nova') && typeof a.skill === 'string') push(a.skill);
      }
    };
    for (const ph of b.phases ?? []) { fromActs(ph.onEnter); for (const c of ph.cadences ?? []) fromActs(c.actions); }
    for (const ph of b.script ?? []) { fromActs(ph.onEnter); fromActs(ph.onExit); for (const c of ph.cadences ?? []) fromActs(c.actions); }
    for (const r of b.rules ?? []) fromActs(r.actions);
    fromActs(b.onDeath);
  };
  const collectFlocks = (b: BrainDef | undefined, visit: (fl: FlockSpec, at: string) => void): void => {
    if (!b) return;
    const fromTuning = (t: BrainTuning | undefined | null, at: string): void => {
      if (t?.behavior?.flock) visit(t.behavior.flock, at);
    };
    fromTuning(b, 'base');
    for (const [i, ph] of (b.phases ?? []).entries()) fromTuning(ph.use, `phases[${i}]`);
    for (const [i, ph] of (b.script ?? []).entries()) fromTuning(ph.use, `script[${ph.id ?? i}]`);
    for (const [i, r] of (b.rules ?? []).entries()) fromTuning(r.use, `rules[${i}]`);
    for (const [i, c] of (b.cycle ?? []).entries()) fromTuning(c.use, `cycle[${i}]`);
  };
  for (const def of Object.values(MONSTERS)) {
    // THE BOMBARDMENT FABRIC: a standing gun's shot MUST be in its own kit —
    // the fabric casts the wearer's real instance (cooldown-arbitrated with
    // the brain, silenced by breakDisables). A skillId outside `skills`
    // would be a gun that never fires, silently.
    if (def.bombard) {
      if (!def.skills.includes(def.bombard.skillId)) {
        warn(`monster ${def.id}: bombard.skillId '${def.bombard.skillId}' is not in its own skills [${def.skills.join(', ')}]`);
      }
      const [c0, c1] = def.bombard.cadence;
      if (!(c0 > 0) || !(c1 >= c0)) warn(`monster ${def.id}: bombard.cadence [${c0}, ${c1}] must be 0 < min ≤ max`);
    }
    const brains: [string, BrainDef | undefined][] = [
      ['brain', def.brain],
      ...(def.brainVariants ?? []).map((v, i): [string, BrainDef | undefined] => [`brainVariants[${i}]`, v.brain]),
    ];
    for (const [src, b] of brains) {
      scriptedCasts(b, skill => {
        if (!SKILLS[skill]) warn(`monster ${def.id}: ${src} scripted verb casts unknown skill '${skill}'`);
      });
      collectFlocks(b, (fl, at) => {
        const bad = (msg: string): void => warn(`monster ${def.id}: ${src} ${at} flock ${msg}`);
        if (fl.radius !== undefined && (fl.radius <= 0 || fl.radius > 400)) bad(`radius ${fl.radius} outside (0, 400]`);
        if (fl.weave !== undefined && (fl.weave < 0 || fl.weave > 8)) bad(`weave ${fl.weave} outside [0, 8] (weavePower semantics)`);
        if (fl.erratic !== undefined && (fl.erratic < 0 || fl.erratic > 6)) bad(`erratic ${fl.erratic} outside [0, 6]`);
        if (fl.amplitude !== undefined && (fl.amplitude <= 0 || fl.amplitude > 90)) bad(`amplitude ${fl.amplitude} outside (0, 90]`);
        for (const k of ['cohesion', 'separation', 'alignment'] as const) {
          const v = fl[k];
          if (v !== undefined && (v < 0 || v > 3)) bad(`${k} ${v} outside [0, 3]`);
        }
      });
    }
    if (def.packSize) {
      const [lo, hi] = def.packSize;
      if (lo < 1 || hi < lo) warn(`monster ${def.id}: packSize [${lo}, ${hi}] is not a sane band`);
      else if (hi > 16) warn(`monster ${def.id}: packSize hi ${hi} > 16 — entry-burst discipline (mind the perf gate)`);
    }

    // THE PLY FABRIC (engine/plies.ts): a malformed spec is a body that
    // never wears its durability — say so at boot.
    if (def.plies) {
      if (def.plies.count < 1) warn(`monster ${def.id}: plies.count ${def.plies.count} < 1 — omit the spec instead`);
      if (def.plies.floor !== undefined && def.plies.floor < 0) warn(`monster ${def.id}: plies.floor < 0`);
      if (def.plies.perLevel !== undefined && def.plies.perLevel < 0) warn(`monster ${def.id}: plies.perLevel < 0`);
      if (def.plies.spentStatus && !STATUS_DEFS[def.plies.spentStatus]) {
        warn(`monster ${def.id}: plies.spentStatus '${def.plies.spentStatus}' unregistered`);
      }
    }

    // THE DEFENSE-TEXTURE DOCTRINE (docs/engine/defenses.md): the signature
    // pools (poise / insight / energy shield) ship EMPTY and are AUTHORED
    // as identities — one per body, so every player answer has fights it
    // excels in and fights that resist it. Boot keeps the discipline:
    // (1) rank-and-file never stack signatures (bosses may — the apex
    //     showpiece exception), (2) objects don't brace, read or ward,
    // (3) poiseDR without a bar is inert authoring, (4) a NEW surface
    //     material must declare its nature (else it silently reads flesh:
    //     breathing, corpse-leaving — decide, don't inherit).
    {
      const b = def.base;
      const sigs = [b.poise ?? 0, b.insight ?? 0, b.energyShield ?? 0].filter(v => v >= 20).length;
      if (!def.boss && sigs >= 2) {
        warn(`monster ${def.id}: ${sigs} signature defense pools authored — textures are identities; stack them only on boss showpieces`);
      }
      if (def.passive && ((b.poise ?? 0) > 0 || (b.insight ?? 0) > 0 || (b.energyShield ?? 0) > 0)) {
        warn(`monster ${def.id}: passive object authors a signature pool — objects don't brace (use life/armor for toughness)`);
      }
      if ((b.poiseDR ?? 0) > 0 && !def.boss && (b.poise ?? 0) <= 0) {
        warn(`monster ${def.id}: poiseDR authored with no poise bar — the reduction only exists while an armed bar holds`);
      }
      if (def.material && !MATERIAL_NATURE[def.material]) {
        warn(`monster ${def.id}: material '${def.material}' has no MATERIAL_NATURE row — it will read as flesh (breathes, leaves remains); classify it`);
      }
      // DEAD-STAT NET: a def mod naming a stat no registry ever seated is a
      // silent no-op — the sheet folds it, nothing queries it, and the
      // author believes a lever exists (the poisonRes drift: 17 defs wore a
      // venom shrug the engine never read; the real lever is element-tagged
      // ailmentResist). By validate time every static stat AND generated
      // family row sits in STAT_DEFS (registrations run at module init;
      // probe_sheet audits the seating), so absence here means dead weight,
      // never late registration.
      const deadStat = (where: string, ms?: Modifier[]): void => {
        for (const m of ms ?? []) {
          if (!(m.stat in STAT_DEFS)) {
            warn(`monster ${def.id}: ${where} stat '${m.stat}' is seated in no registry — a silent no-op (dead stat)`);
          }
          if (m.fromStat !== undefined && !(m.fromStat in STAT_DEFS)) {
            warn(`monster ${def.id}: ${where} link fromStat '${m.fromStat}' is seated in no registry — the siphon reads nothing`);
          }
        }
      };
      deadStat('mod', def.mods);
      deadStat('bond mod', def.bond?.mods);
      deadStat('nocturne mod', def.nocturne?.mods);
      deadStat('worm-wound mod', def.worm?.wounds?.mods);
    }
  }

  // VOYAGE ISLANDS: tilesets exist, objective bosses/spawners + pack tables
  // name real monsters, extra rolls resolve against the live registries.
  for (const isle of Object.values(VOYAGE_ISLANDS)) {
    if (!TILESETS[isle.tileset]) warn(`voyage island ${isle.id}: unknown tileset '${isle.tileset}'`);
    const o = isle.objective;
    if (o.kind === 'boss' && !MONSTERS[o.id]) warn(`voyage island ${isle.id}: boss '${o.id}' is not a monster`);
    if (o.kind === 'spawners' && !MONSTERS[o.spawnerId]) warn(`voyage island ${isle.id}: spawner '${o.spawnerId}' is not a monster`);
    for (const e of isle.packs?.table ?? []) {
      if (!MONSTERS[e.id]) warn(`voyage island ${isle.id}: pack table names unknown monster '${e.id}'`);
    }
    for (const r of isle.structures ?? []) {
      if (!STRUCTURES[r.structure]) warn(`voyage island ${isle.id}: unknown structure '${r.structure}'`);
    }
    for (const r of isle.landmarks ?? []) {
      if (!hasLandmark(r.landmark)) warn(`voyage island ${isle.id}: unknown landmark '${r.landmark}'`);
    }
    if (!isle.nameFirst.length || !isle.nameSecond.length) warn(`voyage island ${isle.id}: empty name pool`);
  }
  for (const msg of validateClimateSpecs(
    Object.values(VOYAGE_ISLANDS).map(i => [`voyage island ${i.id}`, i.climate]),
  )) warn(msg);

  // ATTUNEMENTS / TERRAFORMS: statuses exist, doodad kinds are ruled, and the
  // attunement reach honors the spatial index's one-bucket guarantee.
  for (const at of ATTUNEMENT_LIST) {
    if (!STATUS_DEFS[at.status]) warn(`attunement ${at.id}: unknown status '${at.status}'`);
    if (at.radius > MAX_ATTUNE_RADIUS) {
      warn(`attunement ${at.id}: radius ${at.radius} exceeds the spatial queryPad ${MAX_ATTUNE_RADIUS} (near-checks would MISS doodads)`);
    }
    for (const k of at.kinds) {
      if (!hasDoodadRule(k)) warn(`attunement ${at.id}: doodad kind '${k}' has no registered rule (typo?)`);
    }
  }
  for (const tf of TERRAFORM_LIST) {
    if (!hasDoodadRule(tf.doodadKind)) warn(`terraform ${tf.id}: doodad kind '${tf.doodadKind}' has no registered rule (typo?)`);
    if (doodadRuleOf(tf.doodadKind).blocksMove) {
      warn(`terraform ${tf.id}: grows BLOCKING kind '${tf.doodadKind}' — wilting solids fence the arena; use a ground-overlap kind`);
    }
  }

  // VOCATIONS: home class exists, tree links resolve locally, the tree fits the
  // star's empty centre, node mods name real stats (STAT_DEFS or a registered
  // proc's generated `proc_<id>` chance), the spending gate resolves to a real
  // node, and every quest step's tileset / boss / spawner / pack ids are live.
  // SECRET vocations additionally: the site NPC is a real monster, filter axes
  // name live registries, and dressing kinds are ruled.
  if (!MONSTERS[VOCATION_CFG.giver]) warn(`vocations: default giver '${VOCATION_CFG.giver}' is not a monster`);
  for (const v of Object.values(VOCATIONS)) {
    if (!CLASSES.some(c => c.id === v.classId)) warn(`vocation ${v.id}: unknown class '${v.classId}'`);
    if (v.secret) {
      const s = v.secret.site;
      if (!MONSTERS[s.npc]) warn(`vocation ${v.id}: site npc '${s.npc}' is not a monster`);
      for (const b of s.filter.biomes ?? []) {
        if (!BIOMES[b]) warn(`vocation ${v.id}: site filter names unknown biome '${b}'`);
      }
      for (const pf of s.filter.patronFactions ?? []) {
        if (!Object.values(BIOMES).some(bi => bi.patronFaction === pf)) {
          warn(`vocation ${v.id}: site filter patron faction '${pf}' patronizes no biome — the site can never place`);
        }
      }
      for (const dr of s.doodads ?? []) {
        if (!hasDoodadRule(dr.kind)) warn(`vocation ${v.id}: site dressing kind '${dr.kind}' has no doodad rule`);
      }
      if (s.chance <= 0) warn(`vocation ${v.id}: site chance ${s.chance} — the calling can never be found`);
    }
    const gate = vocationGateNodeId(v.id);
    if (gate !== null && !PASSIVE_NODES[gate]) warn(`vocation ${v.id}: gate node '${gate}' is not on the tree`);
    const localIds = new Set<string>(['root']);
    for (const n of v.tree) {
      if (localIds.has(n.id)) warn(`vocation ${v.id}: duplicate tree node id '${n.id}'`);
      localIds.add(n.id);
    }
    for (const n of v.tree) {
      for (const l of n.links) {
        if (!localIds.has(l)) warn(`vocation ${v.id}: node '${n.id}' links to unknown local id '${l}'`);
      }
      if (Math.hypot(n.x, n.y) > VOCATION_CFG.treeRadius) {
        warn(`vocation ${v.id}: node '${n.id}' at r=${Math.hypot(n.x, n.y).toFixed(0)} pokes past the star's centre (max ${VOCATION_CFG.treeRadius})`);
      }
      for (const md of n.mods ?? []) {
        const isProcChance = md.stat.startsWith('proc_') && PROCS[md.stat.slice('proc_'.length)] !== undefined;
        if (!STAT_DEFS[md.stat] && !isProcChance) {
          warn(`vocation ${v.id}: node '${n.id}' mods unknown stat '${md.stat}'`);
        }
      }
    }
    if (!v.quest.steps.length) warn(`vocation ${v.id}: quest chain has no steps`);
    v.quest.steps.forEach((s, i) => {
      const src = `vocation ${v.id} step ${i + 1}`;
      if (!TILESETS[s.zone.tileset]) warn(`${src}: unknown tileset '${s.zone.tileset}'`);
      const o = s.zone.objective;
      if (o.kind === 'boss' && !MONSTERS[o.id]) warn(`${src}: boss '${o.id}' is not a monster`);
      if (o.kind === 'spawners' && !MONSTERS[o.spawnerId]) warn(`${src}: spawner '${o.spawnerId}' is not a monster`);
      for (const e of s.zone.packsOverride?.table ?? []) {
        if (!MONSTERS[e.id]) warn(`${src}: pack table names unknown monster '${e.id}'`);
      }
    });
  }

  for (const m of Object.values(MONSTERS)) {
    const maxMana = m.base.mana ?? 40;
    for (const id of m.skills) {
      const s = SKILLS[id];
      if (!s) { warn(`${m.id}: unknown skill '${id}'`); continue; }
      if (!s.ai) warn(`${m.id}: skill '${id}' has no ai hint — it will never be used`);
      if (s.manaCost > maxMana) {
        warn(`${m.id}: cannot afford '${id}' (costs ${s.manaCost} mana, pool is ${maxMana})`);
      } else if (s.manaCost > 0 && (m.base.manaRegen ?? 2.5) <= 0) {
        warn(`${m.id}: '${id}' costs mana but the monster has no mana regen`);
      }
    }
    // Opt-in per-stat scaling must name real stats.
    for (const stat of Object.keys(m.scaling ?? {})) {
      if (!STAT_DEFS[stat]) warn(`${m.id}: scaling references unknown stat '${stat}'`);
    }
    // THE SEGMENT FABRIC (docs/engine/segments.md): every knob a worm spec
    // carries must resolve — looks against the LOOKS registry, wounds only
    // on hittable chains (the pools are fed by landed segment hits), the
    // torn bitmask's wire cap, and physical dials that stay physical.
    if (m.worm) {
      const w = m.worm;
      if (w.length <= 0) warn(`${m.id}: worm.length must be positive`);
      if (w.spacing !== undefined && w.spacing <= 0) warn(`${m.id}: worm.spacing must be positive`);
      if (w.taper !== undefined && (w.taper <= 0 || w.taper > 1.05)) {
        warn(`${m.id}: worm.taper ${w.taper} out of band (0, 1.05]`);
      }
      for (const [slot, id] of [['body', w.looks?.body], ['tail', w.looks?.tail], ['every', w.looks?.every?.look]] as const) {
        if (id && !LOOKS[id]) warn(`${m.id}: worm.looks.${slot} '${id}' is not in LOOKS`);
      }
      if (w.looks?.every && w.looks.every.n < 2) {
        warn(`${m.id}: worm.looks.every.n must be >= 2 (1 would replace every body plate)`);
      }
      if (w.wounds) {
        if (!w.hittable) warn(`${m.id}: worm.wounds without worm.hittable — wound pools can never be fed`);
        if (w.wounds.frac <= 0 || w.wounds.frac > 1) warn(`${m.id}: worm.wounds.frac ${w.wounds.frac} out of band (0, 1]`);
        if (w.length > 30) warn(`${m.id}: worm.wounds on a ${w.length}-segment chain — the co-op torn bitmask carries 30; extra segments never replicate their tears`);
        for (const md of w.wounds.mods ?? []) {
          if (!STAT_DEFS[md.stat]) warn(`${m.id}: worm.wounds mod references unknown stat '${md.stat}'`);
        }
        const b = w.wounds.burst;
        if (b && (b.radius <= 0 || b.damageFrac <= 0)) {
          warn(`${m.id}: worm.wounds.burst needs positive radius and damageFrac`);
        }
      }
    }
    // THE HIT CEILING (hitCap): 0/absent = uncapped, so an authored cap
    // must be a real positive number — and one the body's own life keeps
    // meaningful (a cap at or past base life never clamps: dead data).
    if (m.base.hitCap !== undefined) {
      if (!Number.isFinite(m.base.hitCap) || m.base.hitCap <= 0) {
        warn(`${m.id}: base.hitCap must be a positive number (omit for uncapped)`);
      } else if (m.base.hitCap >= (m.base.life ?? 50)) {
        warn(`${m.id}: base.hitCap ${m.base.hitCap} >= base life ${m.base.life ?? 50} — the cap can never clamp`);
      }
    }
    // A breathing shell needs an ARC to breathe — side 'all' has none.
    if (m.shellGuard?.breathe && m.shellGuard.side === 'all') {
      warn(`${m.id}: shellGuard.breathe on side 'all' — no arc to breathe; the spec is inert`);
    }
    // THE SOFT-LOCK LINT: a body confined to ground the player may never
    // be able to STAND ON (its habitat kind blocks movement — a chasm, a
    // magma_core wall) must never count toward zone objectives, or a
    // melee-only build stares at "1 remain" forever. noObjective is the
    // guard; this makes forgetting it a boot-time warning, not a stuck
    // player. (Walkable habitats — water, bog, the now-liquid lava — are
    // reachable at a price and stay counted.)
    if (m.habitat && hasDoodadRule(m.habitat.kind)
      && doodadRuleOf(m.habitat.kind).blocksMove && !m.noObjective) {
      warn(`${m.id}: habitat '${m.habitat.kind}' blocks movement but the def lacks noObjective — a build that cannot reach it soft-locks the clear`);
    }
    // THE WAYFARING ROWS: every pathCosts key must be a REGISTERED region
    // kind (a typo'd id would silently never price), values inside the
    // framework clamps (outside they'd quietly pin to the clamp — say so),
    // and pricing a kind that cannot be walked is a dead row worth naming.
    if (m.pathCosts) {
      for (const k in m.pathCosts) {
        const rk = regionKind(k);
        if (!rk) warn(`${m.id}: pathCosts names unregistered region kind '${k}' — the row never prices`);
        else if (!rk.walkable) warn(`${m.id}: pathCosts prices non-walkable kind '${k}' — flow fields never enter it; the row is dead`);
        const v = m.pathCosts[k];
        if (!(v >= PATH_CFG.minCost && v <= PATH_CFG.maxCost)) {
          warn(`${m.id}: pathCosts['${k}'] = ${v} outside [${PATH_CFG.minCost}, ${PATH_CFG.maxCost}] — it will clamp (PATH_CFG)`);
        }
      }
    }
    // immuneGround rows should name kinds that exist SOMEWHERE — region
    // registry or doodad rules (magma_core is a doodad-band immunity).
    if (m.immuneGround) {
      for (const k of m.immuneGround) {
        if (!regionKind(k) && !hasDoodadRule(k)) {
          warn(`${m.id}: immuneGround names '${k}' — neither a region kind nor a doodad rule; the insurance never pays`);
        }
      }
    }
    // A body wake must shed a real GROUND skill — anything else free-casts
    // into the delivery switch's wrong branch every stride.
    if (m.wake) {
      const w = SKILLS[m.wake.skillId];
      if (!w) warn(`${m.id}: wake payload '${m.wake.skillId}' is not a catalog skill`);
      else if (w.delivery.type !== 'ground') {
        warn(`${m.id}: wake payload '${m.wake.skillId}' is '${w.delivery.type}' — the shed-underfoot fantasy wants a ground delivery`);
      }
    }
    // CARRION FEEDING: the dials must stay physical — a nonpositive rate
    // never heals, a nonpositive time eats the larder instantly.
    if (m.carrion) {
      if (m.carrion.rate !== undefined && m.carrion.rate <= 0) warn(`${m.id}: carrion.rate must be positive`);
      if (m.carrion.time !== undefined && m.carrion.time <= 0) warn(`${m.id}: carrion.time must be positive`);
      if (m.carrion.radius !== undefined && m.carrion.radius <= 0) warn(`${m.id}: carrion.radius must be positive`);
    }
    // VOLATILE (the poked nest): the answer must be a real catalog skill
    // and the chance a probability — a typo here is a nest that never
    // answers (or answers every frame).
    if (m.volatile) {
      if (!SKILLS[m.volatile.skillId]) {
        warn(`${m.id}: volatile payload '${m.volatile.skillId}' is not a catalog skill`);
      }
      if (m.volatile.chance <= 0 || m.volatile.chance > 1) {
        warn(`${m.id}: volatile chance ${m.volatile.chance} is not a probability`);
      }
      if (m.volatile.icd !== undefined && m.volatile.icd <= 0) {
        warn(`${m.id}: volatile icd must be positive — it is the throttle`);
      }
    }
    // Level-gated grants must name real skills/supports, and a support's target
    // skill must be one the monster actually fields (authored or earlier-granted).
    for (const g of m.grants ?? []) {
      if (g.skill && !SKILLS[g.skill]) warn(`${m.id}: grant @${g.atLevel} unknown skill '${g.skill}'`);
      if (g.support) {
        if (!SUPPORTS[g.support]) warn(`${m.id}: grant @${g.atLevel} unknown support '${g.support}'`);
        const has = (id: string): boolean => m.skills.includes(id) || (m.grants ?? []).some(x => x.skill === id);
        if (g.on && !has(g.on)) warn(`${m.id}: grant @${g.atLevel} sockets '${g.support}' on '${g.on}', which it never has`);
      }
    }
  }

  // SUPPORT GEMS — the support×delivery NO-OP AUDIT. A support's only socket
  // gate is its tag lists (supportFits), but several payloads are READ only
  // inside specific delivery branches of the cast pipeline — SkillTag (the
  // socket currency) and delivery.type (the execution branch) are independent
  // axes. A gem that sockets cleanly yet grafts a payload whose read-site the
  // host's delivery never reaches is a SILENT no-op: it costs a socket,
  // changes nothing, and tells no one. Flagged PER-GRAFT, because partial
  // no-ops are per-field (triangle_sigil's `more` damage still lands where
  // its aoeShape dies). The map below is derived from the LIVE read-sites;
  // every row names its site so drift is findable. Extend it whenever a new
  // delivery-scoped graft or stat ships. Deliberately unaudited: pairs that
  // only fit through ANOTHER gem's grantsTags (dive_bomb granting 'aoe' to a
  // dash) — those are loadout-time compositions, not authorable data.
  // The map itself lives in data/graftReadSites.ts — one registry shared with
  // the sim's interaction matrix (src/sim/compat.ts), so the boot warning and
  // the measured report can never drift apart.
  const carriesRow = supportCarriesRow;
  const rowUnread = (row: GraftReadRow, def: SkillDef): boolean =>
    rowUnreadBy(row, def, id => SKILLS[id]);
  // The map audits itself: a stat row naming a dead stat is map drift.
  for (const row of GRAFT_READ_SITES) {
    if (row.kind === 'stat' && !STAT_DEFS[row.key]) {
      warn(`no-op audit: read-site row names unknown stat '${row.key}' (map drift?)`);
    }
  }

  // THE RESONANCE LEVER (CREW_CFG.boarding): a gated door needs a key in
  // the catalog; a free door makes every key dead content. (The crew-hop
  // audit below stays loadout-independent on purpose — under 'gated' a
  // pair is still LIVE data, one socketed key away.)
  const resonanceKeys = Object.values(SUPPORTS).filter(s => s.resonance);
  if (CREW_CFG.boarding === 'gated' && !resonanceKeys.length) {
    warn(`crew boarding is 'gated' but no support carries resonance — nothing can ever board a summon's crew`);
  }
  if (CREW_CFG.boarding === 'free' && resonanceKeys.length) {
    warn(`crew boarding is 'free' but [${resonanceKeys.map(k => k.id).join(', ')}] carry resonance — `
      + `dead keys (flip CREW_CFG.boarding or retire them)`);
  }

  // THE CREW HOP: gems socketed into a SUMMON skill FORWARD onto the minted
  // minions' own skill instances (world.forwardSummonSockets) — so a row is
  // genuinely read when any crew member's tag-fitting skill reads it (the
  // trail gem boarding the archer's bow is live, not inert). 'unknowable'
  // crews (corpse-raised) can't be audited — treat as read.
  const crewOf = (def: SkillDef) => summonCrewOf(
    def.delivery.type === 'summon' ? def.delivery : undefined,
    id => MONSTERS[id], id => SKILLS[id]);
  const crewReads = (sup: SupportDef, row: GraftReadRow, def: SkillDef): boolean => {
    if (!supportRidesMinions(sup)) return false;
    const crew = crewOf(def);
    if (!crew) return false;
    if (crew === 'unknowable') return true;
    return crew.some(cd => supportFits(sup, cd) && !rowUnread(row, cd));
  };
  const crewFits = (sup: SupportDef, def: SkillDef): boolean => {
    if (!supportRidesMinions(sup)) return false;
    const crew = crewOf(def);
    return crew === 'unknowable' || (!!crew && crew.some(cd => supportFits(sup, cd)));
  };

  // The catalog sweep: every DROPPABLE skill a gem fits — by tags, or by
  // boarding a summon's crew — whose payload is then never read anywhere.
  const droppable = Object.values(SKILLS).filter(s => !s.noDrop);
  for (const sup of Object.values(SUPPORTS)) {
    for (const row of GRAFT_READ_SITES) {
      if (!carriesRow(sup, row)) continue;
      const inert = droppable.filter(def =>
        (supportFits(sup, def) || crewFits(sup, def))
        && rowUnread(row, def) && !crewReads(sup, row, def));
      if (!inert.length) continue;
      const shown = inert.slice(0, 8).map(s => s.id).join(', ');
      warn(`support ${sup.id}: '${row.key}' is read only at ${row.site} — silently INERT on `
        + `${inert.length} fitting skill(s): ${shown}${inert.length > 8 ? ` (+${inert.length - 8} more)` : ''}`);
    }
  }
  // Monster-only kit pieces (noDrop) skip the sweep but their authored
  // grant pairs (support × the exact target skill) get the same audit.
  for (const m of Object.values(MONSTERS)) {
    for (const g of m.grants ?? []) {
      if (!g.support || !g.on) continue;
      const sup = SUPPORTS[g.support];
      const target = SKILLS[g.on];
      if (!sup || !target) continue; // existence already warned above
      // THE LANE ROUTER ignores sockets that don't tag-fit their host — an
      // authored kit gem that misses its target's tags is dead weight.
      if (!supportFits(sup, target)) {
        warn(`${m.id}: grant @${g.atLevel} sockets '${g.support}' on '${g.on}' — it does not tag-fit `
          + `[${target.tags.join(', ')}], so the lane router will ignore it`);
      }
      for (const row of GRAFT_READ_SITES) {
        if (carriesRow(sup, row) && rowUnread(row, target)) {
          warn(`${m.id}: grant @${g.atLevel} sockets '${g.support}' on '${g.on}' — its `
            + `'${row.key}' payload is never read by a '${target.delivery.type}' delivery`);
        }
      }
    }
  }

  // CONSTRUCT-FX FODDER honesty: a construct def carrying a damage roll but
  // no 'damage' effect starves every hit that resolves through its instance
  // — resolveHit's hasDamage gate skips applyHit, so grafted pulses/bursts
  // (Pulsing Ramparts, Violent Genesis) and any other fx reader "hit" for
  // ZERO while statuses still ride. The roll's presence proves intent; make
  // the dead gate loud. (Learned from the cage that cooked for nothing.)
  for (const s of Object.values(SKILLS)) {
    if (s.delivery.type === 'construct' && s.baseDamage
      && !s.effects.some(e => e.type === 'damage')) {
      warn(`skill ${s.id}: construct carries baseDamage but no 'damage' effect — grafted construct-fx hits resolve for ZERO (add the effect or drop the roll)`);
    }
    // THE TOLL (selfCleanse): the portion is a fraction of banked stacks —
    // outside (0,1] it is a typo, not a design.
    if (s.selfCleanse && !(s.selfCleanse.stacksPortion > 0 && s.selfCleanse.stacksPortion <= 1)) {
      warn(`skill ${s.id}: selfCleanse.stacksPortion must be in (0,1]`);
    }
  }

  // SUMMON CONTRACTS: `decay` (the unlife death-clock) and `persistent` (the
  // reserve-and-respawn contract) are documented mutually exclusive but read
  // in independent branches — a def carrying both mints a minion with a death
  // sentence AND a respawn appointment. Skills and summon-grafting supports
  // both carry a SummonDelivery, so both are swept.
  const checkSummonContract = (src: string, d: Delivery | undefined): void => {
    if (d && d.type === 'summon' && d.decay && d.persistent) {
      warn(`${src}: summon carries BOTH decay and persistent (mutually exclusive — drop one)`);
    }
  };
  for (const s of Object.values(SKILLS)) checkSummonContract(`skill ${s.id}`, s.delivery);
  for (const sup of Object.values(SUPPORTS)) checkSummonContract(`support ${sup.id} (summon graft)`, sup.summon);
  // MUNITION grafts (SupportDef.munition): the rack must exist, be noDrop
  // (it is a convert payload), and actually restore — a typo'd reload id is
  // a dead button the moment the chambered bank hits zero.
  for (const sup of Object.values(SUPPORTS)) {
    if (!sup.munition) continue;
    if (sup.munition.rounds < 1) {
      warn(`support ${sup.id}: munition.rounds ${sup.munition.rounds} — a bank needs at least one round`);
    }
    const rid = sup.munition.reloadSkillId ?? DEFAULT_RELOAD_SKILL;
    const r = SKILLS[rid];
    if (!r) {
      warn(`support ${sup.id}: munition reload '${rid}' is not a catalog skill`);
    } else {
      if (!r.noDrop) warn(`support ${sup.id}: munition reload '${rid}' should be noDrop (a convert payload)`);
      if (!r.effects.some(f => f.type === 'restoreSkillCharges')) {
        warn(`support ${sup.id}: munition reload '${rid}' carries no restoreSkillCharges — the rack racks nothing`);
      }
    }
  }

  // TAUGHT BASHES (SupportDef.guardBash): the graft is read only where a
  // guard stance releases/breaks (guardBashSpec), so the gem must gate on
  // the 'guard' tag — anywhere else it sockets is a silent no-op (the
  // shellGraft rule: the tag fit IS the audit). Same arming-line sanity as
  // the innate spec.
  for (const sup of Object.values(SUPPORTS)) {
    if (!sup.guardBash) continue;
    if (!sup.requiresTags?.includes('guard')) {
      warn(`support ${sup.id}: guardBash without a 'guard' requiresTags gate — it can socket where no stance ever releases`);
    }
    const t = sup.guardBash.threshold;
    if (t !== undefined && (t < 0 || t > 1)) {
      warn(`support ${sup.id}: guardBash.threshold ${t} is outside the bar (0..1)`);
    }
  }

  // THE CONDUIT FABRIC (SkillDef.conduits / SupportDef.conduit): a pump only
  // runs while its host is ENGAGED — a held bar (guard/channel/charge-up/
  // overcharge) or a burning toggle. Both seats get the same spec sanity;
  // seat-specific rows catch pumps that could never engage at all, and
  // guard endpoints on hosts that never raise a stance (the endpoint reads
  // 0 forever — a silent no-op socket).
  {
    const engagementTags: readonly string[] = ['guard', 'channel', 'aura'];
    const specProblems = (sp: ConduitSpec): string[] => {
      const out: string[] = [];
      if (sp.from === sp.to) out.push(`pumps '${sp.from}' into itself`);
      if (sp.ratio <= 0) out.push('ratio must be positive');
      if ((sp.drainPct ?? 0) <= 0 && (sp.drainFlat ?? 0) <= 0) out.push('needs drainPct or drainFlat > 0');
      if (sp.floor !== undefined && (sp.floor < 0 || sp.floor >= 1)) out.push(`floor ${sp.floor} outside [0, 1)`);
      return out;
    };
    // Mirrors Actor.updateConduits exactly: a held STANCE mode reachable
    // from the def (spec + MATCHING castMode — a guard spec whose castMode
    // isn't 'guard' never raises), ANY aura (toggle and duration both
    // register in activeAuras), or a TOGGLE summon contract (only
    // persistent.toggle populates summonToggles).
    const engages = (s: SkillDef): boolean =>
      !!((s.guard && s.castMode === 'guard')
        || (s.channel && s.castMode === 'channel')
        || (s.chargeUp && s.castMode === 'charge')
        || (s.overcharge && s.castMode === 'overcharge')
        || s.delivery.type === 'aura'
        || (s.delivery.type === 'summon' && !!s.delivery.persistent?.toggle));
    for (const s of Object.values(SKILLS)) {
      if (!s.conduits?.length) continue;
      for (const sp of s.conduits) {
        for (const p of specProblems(sp)) warn(`skill ${s.id}: conduit ${p}`);
        // Spec + matching castMode, or the stance never actually raises.
        if ((sp.from === 'guard' || sp.to === 'guard') && !(s.guard && s.castMode === 'guard')) {
          warn(`skill ${s.id}: conduit touches 'guard' but the skill raises no stance — the endpoint reads 0 forever`);
        }
      }
      if (!engages(s)) {
        warn(`skill ${s.id}: conduits on a skill with no held bar and no toggle — the pump can never engage`);
      }
    }
    for (const sup of Object.values(SUPPORTS)) {
      if (!sup.conduit) continue;
      for (const p of specProblems(sup.conduit)) warn(`support ${sup.id}: conduit ${p}`);
      if (!sup.requiresTags?.some(t => engagementTags.includes(t))) {
        warn(`support ${sup.id}: conduit gem without a guard/channel/aura requiresTags gate — `
          + `it can socket where nothing ever engages the pump`);
      }
      if ((sup.conduit.from === 'guard' || sup.conduit.to === 'guard')
        && !sup.requiresTags?.includes('guard')) {
        warn(`support ${sup.id}: conduit touches 'guard' but the gem doesn't require the 'guard' tag — `
          + `off-stance hosts read the endpoint as 0 forever`);
      }
    }
    // WORN conduits (PassiveChoiceOption.conduit) get the same spec sanity.
    // No engagement row: the pool adapters ARE the gate for a worn pump
    // (a guard endpoint reads 0/0 off-stance and idles by construction).
    for (const g of Object.values(CHOICE_GROUPS)) {
      for (const opt of g.options) {
        if (!opt.conduit) continue;
        for (const p of specProblems(opt.conduit)) {
          warn(`choice ${g.id}/${opt.id}: conduit ${p}`);
        }
      }
    }
  }

  // THE STAT-TRADE REGISTRY (STAT_TRADES): every endpoint and dial must be
  // a registered stat, and a DIAL must never itself be a trade endpoint —
  // that is the recursion the single-hop fold can't otherwise see.
  {
    const endpoints = new Set(STAT_TRADES.flatMap(t => [t.from, t.to]));
    for (const t of STAT_TRADES) {
      for (const s of [t.from, t.to, t.rateStat, t.forgoStat]) {
        if (!STAT_DEFS[s]) warn(`stat trade ${t.from}->${t.to}: '${s}' is not a registered stat`);
      }
      if (t.from === t.to) warn(`stat trade ${t.from}->${t.to}: trades a stat into itself`);
      if (endpoints.has(t.rateStat) || endpoints.has(t.forgoStat)) {
        warn(`stat trade ${t.from}->${t.to}: a dial stat is also a trade endpoint — recursive fold`);
      }
    }
  }

  // A 'slot'-homed charge (ChargeDef.hud) needs at least one catalog
  // SPENDER — a skill or support chargeCost — to pin its pips on;
  // otherwise it only ever falls back to the buff row, which is almost
  // certainly an authoring slip (the lever asked for a slot that can't exist).
  {
    const spent = new Set<string>();
    for (const s of Object.values(SKILLS)) if (s.chargeCost) spent.add(s.chargeCost.charge);
    for (const sup of Object.values(SUPPORTS)) if (sup.chargeCost) spent.add(sup.chargeCost.charge);
    for (const [cid, cdef] of Object.entries(CHARGE_DEFS)) {
      if (cdef.hud === 'slot' && !spent.has(cid)) {
        warn(`charge ${cid}: hud 'slot' but nothing in the catalog spends it — the pips have no slot to ride`);
      }
    }
  }

  // The META/ORDER id net: all of these are typo'd-id DEAD BUTTONS at
  // runtime — useMetaSkill silently filters a missing payload, an unknown
  // command kind never drives a step, a minionCast order no-ops, a combo
  // step is skipped. Catch them at boot instead.
  for (const s of Object.values(SKILLS)) {
    if (s.meta && !SKILLS[s.meta.skillId]) {
      warn(`skill ${s.id}: meta payload '${s.meta.skillId}' is not a catalog skill`);
    }
    // GUARD PULSE: a typo'd component never tolls; a pulse-bearing skill
    // that isn't a guard stance never ticks the clock at all.
    if (s.guard?.pulse) {
      if (!SKILLS[s.guard.pulse.skillId]) {
        warn(`skill ${s.id}: guard pulse '${s.guard.pulse.skillId}' is not a catalog skill`);
      }
      if (s.castMode !== 'guard') {
        warn(`skill ${s.id}: guard.pulse on a non-guard castMode — the stance tick never runs`);
      }
      if (s.guard.pulse.interval <= 0) {
        warn(`skill ${s.id}: guard pulse interval must be positive`);
      }
    }
    // SHIELD BASH sanity: an arming line outside the bar can never arm
    // (>1) or always arms (<0 clamps to a free bash — say so if meant);
    // an on-break burst with NO bash anywhere (innate or graftable) is a
    // dead flag on a stance that can never speak.
    if (s.guard?.bash?.threshold !== undefined
      && (s.guard.bash.threshold < 0 || s.guard.bash.threshold > 1)) {
      warn(`skill ${s.id}: guard.bash.threshold ${s.guard.bash.threshold} is outside the bar (0..1)`);
    }
    if (s.guard?.bashOnBreak && !s.guard.bash) {
      warn(`skill ${s.id}: guard.bashOnBreak without an innate bash — only fires if a graft gem (guardBash) is socketed`);
    }
    // THE GATHER FAMILY sanity: a completion-gated release needs a
    // completion to reach (maxHold's ceiling or a fillable brim), and an
    // auto-releasing brim that never spends would re-fire every press.
    if (s.channel?.release?.requireFull && s.channel.maxHold === undefined && !s.channel.brim) {
      warn(`skill ${s.id}: release.requireFull with neither maxHold nor brim — the payload can never fire`);
    }
    if (s.channel?.brim?.autoRelease && s.channel.brim.spend === false) {
      warn(`skill ${s.id}: brim autoRelease without spend — a full bar re-fires instantly every press`);
    }
    // CONCENTRATION needs a quarry: an actor-resolving targeting spec, and
    // no rival held-cast discipline (the bar can only serve one master).
    if (s.concentration) {
      if (!s.targeting || s.targeting.target === 'corpse') {
        warn(`skill ${s.id}: concentration requires an actor-resolving targeting spec`);
      }
      if (s.channel || s.chargeUp || s.guard) {
        warn(`skill ${s.id}: concentration cannot share the bar with channel/chargeUp/guard`);
      }
    }
    // SKILL CONVERSION: both halves are typo'd-id dead buttons — an unknown
    // payload never casts, an unregistered rule never converts. And a
    // convert chain (payload converting onward) would recurse — refuse it.
    if (s.convert) {
      if (!SKILLS[s.convert.skillId]) {
        warn(`skill ${s.id}: convert payload '${s.convert.skillId}' is not a catalog skill`);
      } else if (SKILLS[s.convert.skillId].convert) {
        warn(`skill ${s.id}: convert payload '${s.convert.skillId}' converts onward (chains recurse — flatten them)`);
      }
      if (!hasConvertRule(s.convert.when)) {
        warn(`skill ${s.id}: convert rule '${s.convert.when}' is not in CONVERT_RULES`);
      }
    }
    // THE MIMIC LANE (engine/mimic.ts): a slot redirects its whole press, so
    // it can't share the button with another redirect discipline; a zero
    // power factor is a dead cannon; an explicit allow that the structural
    // refusals override is a lie in the data.
    if (s.mimic) {
      if (s.mimic.powerFactor !== undefined && s.mimic.powerFactor <= 0) {
        warn(`skill ${s.id}: mimic.powerFactor must be positive`);
      }
      if (s.convert || s.comboChain) {
        warn(`skill ${s.id}: a mimic slot cannot also convert/comboChain (one redirect per press)`);
      }
    }
    if (s.mimicable === true && !skillMimicable(s)) {
      warn(`skill ${s.id}: mimicable:true but structurally refused (mimic slot / invokes / throng / grimoire summon)`);
    }
    // AMMUNITION honesty (SkillDef.useCharges lanes):
    //  - a MAGAZINE's cooldown IS its reload clock — cooldown 0 means the
    //    emptying press stamps nothing and the bank never refills;
    //  - 'chargesEmpty' conversion needs a bank to run dry;
    //  - a bank with NO lane back (no trickle, no magazine, no convert, no
    //    meta rack) empties once and is a dead button forever.
    if (s.useCharges) {
      if (s.useCharges.magazine && !(s.cooldown > 0)) {
        warn(`skill ${s.id}: useCharges.magazine with cooldown ${s.cooldown} — the cooldown is the reload clock, give it one`);
      }
      if (!s.useCharges.recharge && !s.useCharges.magazine
        && !s.convert && !s.meta) {
        warn(`skill ${s.id}: use-charge bank has no way back — no recharge, no magazine, no convert/meta reload`);
      }
    } else if (s.convert?.when === 'chargesEmpty') {
      warn(`skill ${s.id}: convert rule 'chargesEmpty' without useCharges — the bank can never run dry`);
    }
    for (const cid of s.comboChain?.skills ?? []) {
      if (!SKILLS[cid]) warn(`skill ${s.id}: combo step '${cid}' is not a catalog skill`);
    }
    // FOUNT ECONOMY honesty: perCharge multiplies by charges CONSUMED, so
    // an innate numeric spend of at most 1 makes it a silent ×1 — the sip
    // lane and the gulp lane got mixed. (A socketed 'all' spender would
    // override the innate cost — if that's the design, drop the innate.)
    if (s.chargeCost && s.chargeCost.amount !== 'all' && s.chargeCost.amount <= 1) {
      for (const fx of s.effects) {
        if ((fx.type === 'restoreOverTime' || fx.type === 'ward') && fx.perCharge) {
          warn(`skill ${s.id}: ${fx.type}.perCharge with a spend of ${s.chargeCost.amount} — a silent ×1 (use 'all' to scale with the bank, or drop perCharge for the flat sip)`);
        }
      }
    }
    for (const fx of s.effects) {
      if (fx.type === 'commandMinions' && fx.command && !hasCommandKind(fx.command)) {
        warn(`skill ${s.id}: command kind '${fx.command}' is not in COMMAND_KINDS`);
      }
      if (fx.type === 'minionCast' && !SKILLS[fx.skillId]) {
        warn(`skill ${s.id}: minionCast order '${fx.skillId}' is not a catalog skill`);
      }
      // A host-scoped reload only finds its bank when MINTED for a host
      // (convert/meta) or when the skill banks its own rounds — dropped as
      // a gem and bar-cast, it racks nothing.
      if (fx.type === 'restoreSkillCharges' && fx.scope !== 'all'
        && !s.useCharges && !s.noDrop) {
        warn(`skill ${s.id}: host-scoped restoreSkillCharges on a droppable skill with no own bank — mark it noDrop (a convert/meta payload) or scope it 'all'`);
      }
      // THE THRONG SWEEP without a throng: a throngDirect effect on a
      // skill with no ThrongSpec has no roster to aim — a dead button.
      if (fx.type === 'throngDirect' && !s.throng) {
        warn(`skill ${s.id}: throngDirect effect without SkillDef.throng — no roster to sweep`);
      }
      // THE GRAB FABRIC net (engine/grab.ts): a bad verb or an untagged
      // grapple is a silent no-show — say so at boot.
      if (fx.type === 'grabSeize') {
        const g = fx.grab;
        if (!['carry', 'drag', 'pin', 'swallow'].includes(g.verb)) {
          warn(`skill ${s.id}: grabSeize verb '${g.verb}' unknown`);
        }
        if (g.holdSec && g.holdSec[0] > g.holdSec[1]) warn(`skill ${s.id}: grab holdSec lo > hi`);
        if (g.dot && !(g.dot.frac > 0)) warn(`skill ${s.id}: grab dot.frac must be positive`);
        if (g.dot && g.verb !== 'swallow') {
          warn(`skill ${s.id}: grab dot on a non-swallow verb — digestion belongs to the gullet`);
        }
        if (g.leech !== undefined && !g.dot) warn(`skill ${s.id}: grab leech without a dot — nothing to drink`);
        if (g.throw && !(g.throw.impulse > 0)) warn(`skill ${s.id}: grab throw.impulse must be positive`);
        if (!s.tags.includes('grab')) {
          warn(`skill ${s.id}: grabSeize without the 'grab' tag — supports and the combo grammar cannot find it`);
        }
      }
      if (fx.type === 'grabThrow') {
        if (!(fx.impulse > 0)) warn(`skill ${s.id}: grabThrow impulse must be positive`);
        if (!s.tags.includes('throw')) {
          warn(`skill ${s.id}: grabThrow without the 'throw' tag — supports and the combo grammar cannot find it`);
        }
        if (!s.gate?.holding) {
          warn(`skill ${s.id}: grabThrow without gate.holding — empty-handed presses will spend a cast on nothing`);
        }
      }
    }
    // THE PLY FABRIC net (engine/plies.ts) rides the monster sweep below;
    // THE THRONG spec net (engine/throng.ts): typos here are silent
    // no-shows in the world — say so at boot.
    if (s.throng) {
      const th = s.throng;
      if (!MONSTERS[th.monsterId]) warn(`skill ${s.id}: throng.monsterId '${th.monsterId}' is not a monster def`);
      if (th.cap < 1) warn(`skill ${s.id}: throng.cap ${th.cap} < 1`);
      if (th.batch !== undefined && th.batch < 1) warn(`skill ${s.id}: throng.batch ${th.batch} < 1`);
      if (!th.sources.length) warn(`skill ${s.id}: throng.sources is empty — the roster can never grow`);
      if (th.sources.filter(r => r.kind === 'motes').length > 1) {
        warn(`skill ${s.id}: multiple throng 'motes' rows — one clock per skill, the first wins`);
      }
      for (const row of th.sources) {
        if (row.kind === 'pocket') {
          if (row.perZone[0] > row.perZone[1]) warn(`skill ${s.id}: throng pocket perZone lo > hi`);
          if (row.cluster[0] > row.cluster[1]) warn(`skill ${s.id}: throng pocket cluster lo > hi`);
        } else if (row.kind === 'motes') {
          if (row.every[0] > row.every[1]) warn(`skill ${s.id}: throng motes every lo > hi`);
        } else if (row.kind === 'gauge') {
          if (!(row.fill > 0)) warn(`skill ${s.id}: throng gauge fill must be positive`);
          if (row.yield[0] > row.yield[1]) warn(`skill ${s.id}: throng gauge yield lo > hi`);
        } else if ((row.kind === 'onCrit' || row.kind === 'onKill')
          && !(row.chance > 0 && row.chance <= 1)) {
          warn(`skill ${s.id}: throng ${row.kind} chance outside (0, 1]`);
        }
      }
      if (!s.effects.some(fx => fx.type === 'throngDirect')) {
        warn(`skill ${s.id}: SkillDef.throng without a throngDirect effect — the roster can never be swept (add the effect, or this is a deliberate passive-gather skill)`);
      }
      // THE LITE TIER net (engine/lite.ts): a lite-tier anchor whose kind
      // never opted in has no pool to live in — claims would fizzle.
      if (th.tier === 'lite' && MONSTERS[th.monsterId] && !MONSTERS[th.monsterId].lite) {
        warn(`skill ${s.id}: throng.tier 'lite' but monster '${th.monsterId}' has no MonsterDef.lite — claims cannot join the pool`);
      }
    }
  }
  for (const sup of Object.values(SUPPORTS)) {
    if (sup.meta && !SKILLS[sup.meta.skillId]) {
      warn(`support ${sup.id}: meta payload '${sup.meta.skillId}' is not a catalog skill`);
    }
  }

  const checkTable = (where: string, ids: string[]): void => {
    for (const id of ids) if (!MONSTERS[id]) warn(`${where}: unknown monster '${id}'`);
  };
  for (const z of Object.values(ZONES)) {
    if (z.packs) checkTable(`zone ${z.id}`, z.packs.table.map(e => e.id));
    for (const e of z.exits) {
      if (e.to !== '?' && !ZONES[e.to]) warn(`zone ${z.id}: exit to unknown zone '${e.to}'`);
      if (e.to === '?' && e.tileset && !TILESETS[e.tileset]) {
        warn(`zone ${z.id}: frontier names unknown tileset '${e.tileset}'`);
      }
    }
  }
  for (const t of Object.values(TILESETS)) {
    checkTable(`tileset ${t.id}`, t.packs.table.map(e => e.id));
    if (!MONSTERS[t.spawnerId]) warn(`tileset ${t.id}: unknown spawner '${t.spawnerId}'`);
  }
  for (const tier of WAVE_TABLE) checkTable(`wave table (wave ${tier.minWave}+)`, tier.ids);
  for (const [fid, f] of Object.entries(FACTIONS)) {
    checkTable(`faction ${fid}`, f.table.map(e => e.id));
  }
  for (const [biome, rows] of Object.entries(WILDLIFE)) {
    checkTable(`wildlife ${biome}`, rows.map(r => r.id));
  }
  // AUTHORED ZONE FAUNA (ZoneDef.fauna — the Verminfall's town-vermin seam):
  // ids must resolve, and SAFE ground may host only 'critter'-tagged texture —
  // a safe-zone fauna row naming a fighter would arm a sanctuary.
  for (const z of Object.values(ZONES)) {
    if (!z.fauna?.length) continue;
    checkTable(`zone ${z.id} fauna`, z.fauna.map(r => r.id));
    if (z.objective.kind === 'safe') {
      for (const r of z.fauna) {
        const d = MONSTERS[r.id];
        if (d && d.tag !== 'critter') {
          warn(`zone ${z.id}: safe-ground fauna '${r.id}' is not 'critter'-tagged — sanctuaries host only texture`);
        }
      }
    }
  }
  // MECHANIC-BARRED KIN (RESERVED_KIN): authored families whose fielding DOOR
  // doesn't exist yet. The bar is a CONTRACT, enforced here: a reserved
  // faction must be contexts-gated off 'baseline', and its roster ids must
  // appear on NO spawn surface — wiring one in without striking its reserve
  // entry is a validation hit, so shipping the door is a deliberate diff.
  {
    const reservedIds = new Map<string, string>(); // monster id → reserved faction id
    for (const fid of Object.keys(RESERVED_KIN)) {
      const traits = FACTION_TRAITS[fid];
      if (!traits?.contexts?.length || traits.contexts.includes('baseline')) {
        warn(`reserved kin '${fid}': faction must be contexts-gated off 'baseline' (the bar's first lock)`);
      }
      for (const e of FACTIONS[fid]?.table ?? []) reservedIds.set(e.id, fid);
    }
    const hit = (where: string, id: string): void => {
      const fid = reservedIds.get(id);
      if (fid) {
        warn(`reserved kin '${fid}': '${id}' is fielded by ${where} — its door (${RESERVED_KIN[fid]}) hasn't shipped; strike the RESERVED_KIN entry with the door's diff`);
      }
    };
    for (const [biome, rows] of Object.entries(WILDLIFE)) for (const r of rows) hit(`wildlife ${biome}`, r.id);
    for (const z of Object.values(ZONES)) {
      for (const e of z.packs?.table ?? []) hit(`zone ${z.id}`, e.id);
      for (const r of z.fauna ?? []) hit(`zone ${z.id} fauna`, r.id);
    }
    for (const t of Object.values(TILESETS)) for (const e of t.packs.table) hit(`tileset ${t.id}`, e.id);
    for (const tier of WAVE_TABLE) for (const id of tier.ids) hit('the wave table', id);
    for (const [fid, f] of Object.entries(FACTIONS)) {
      if (RESERVED_KIN[fid]) continue; // its own barred roster IS the reservation
      for (const e of f.table) hit(`faction ${fid}`, e.id);
    }
    for (const lm of landmarkDefs()) {
      for (const e of lm.spawns?.table ?? []) hit(`landmark ${lm.id}`, e.id);
    }
    // Droppable summon pools are a spawn surface too — a gem naming a barred
    // kin would hand players the door. noDrop monster verbs stay free (a
    // reserved body summoning its own kin can't spawn to cast it).
    for (const s of Object.values(SKILLS)) {
      const pool = (s.delivery as { pool?: { id: string }[] }).pool;
      if (!pool || s.noDrop) continue;
      for (const e of pool) hit(`droppable skill '${s.id}' summon pool`, e.id);
    }
  }

  // PRESENCE envelopes (engine/presence.ts): every spec well-formed, every
  // named band registered, and no weighted table left ENTIRELY empty by its
  // envelopes at some level — the runtime falls back to unshaped weights
  // there (never starves), but that silently un-does the authored gating.
  const specIssues = (spec: PresenceSpec): string[] => {
    if (typeof spec === 'string') {
      return PRESENCE_BANDS[spec] ? [] : [`unknown presence band '${spec}'`];
    }
    const out: string[] = [];
    if (spec.from !== undefined && spec.to !== undefined && spec.from > spec.to) {
      out.push(`presence from ${spec.from} > to ${spec.to}`);
    }
    if ((spec.fadeIn ?? 0) < 0 || (spec.fadeOut ?? 0) < 0) out.push('presence fade must be >= 0');
    if ((spec.mul ?? 1) < 0) out.push('presence mul must be >= 0');
    if (spec.stops) {
      for (let i = 0; i < spec.stops.length; i++) {
        if (spec.stops[i][1] < 0) out.push(`presence stop ${i} multiplier < 0`);
        if (i > 0 && spec.stops[i][0] <= spec.stops[i - 1][0]) {
          out.push('presence stops must be sorted by ascending level');
          break;
        }
      }
    }
    return out;
  };
  for (const m of Object.values(MONSTERS)) {
    if (m.presence !== undefined) for (const msg of specIssues(m.presence)) warn(`monster ${m.id}: ${msg}`);
  }
  const checkPresenceTable = (where: string, table: { id: string; weight: number; presence?: PresenceSpec }[]): void => {
    let any = false;
    for (const e of table) {
      if (e.presence !== undefined) { any = true; for (const msg of specIssues(e.presence)) warn(`${where} (${e.id}): ${msg}`); }
      if (MONSTERS[e.id]?.presence !== undefined) any = true;
    }
    if (!any) return;
    const gaps: number[] = [];
    for (let lvl = 1; lvl <= 100; lvl++) {
      let total = 0;
      for (const e of table) {
        total += e.weight * presenceMul(e.presence, lvl) * presenceMul(MONSTERS[e.id]?.presence, lvl);
      }
      if (total <= 0) gaps.push(lvl);
    }
    if (gaps.length) {
      warn(`${where}: presence leaves the table empty at level ${gaps[0]}`
        + (gaps.length > 1 ? `..${gaps[gaps.length - 1]} (${gaps.length} levels)` : '')
        + ' — spawns there fall back to unshaped weights');
    }
  };
  for (const z of Object.values(ZONES)) if (z.packs) checkPresenceTable(`zone ${z.id}`, z.packs.table);
  for (const t of Object.values(TILESETS)) checkPresenceTable(`tileset ${t.id}`, t.packs.table);
  for (const [fid, f] of Object.entries(FACTIONS)) checkPresenceTable(`faction ${fid}`, f.table);
  for (const lm of landmarkDefs()) if (lm.spawns) checkPresenceTable(`landmark ${lm.id}`, lm.spawns.table);
  for (const [biome, rows] of Object.entries(WILDLIFE)) {
    for (const r of rows) {
      if (r.presence !== undefined) for (const msg of specIssues(r.presence)) warn(`wildlife ${biome} (${r.id}): ${msg}`);
    }
  }

  // UNLOCK CATALOG: ids unique, every gem/class id resolves against the live
  // registries, requiresUnlock ladders point at real entries, and every
  // NON-STARTER class is reachable through EXACTLY ONE class bundle — a class
  // with none can never join the character-select roll (dead content), and a
  // starter with one would sell the player something they already own.
  const unlocks = allUnlockables();
  const unlockIds = new Set<string>();
  for (const u of unlocks) {
    if (unlockIds.has(u.id)) warn(`unlock ${u.id}: duplicate id`);
    unlockIds.add(u.id);
  }
  for (const u of unlocks) {
    const skillIds = u.kind === 'skill' || u.kind === 'class' ? u.payload.skillIds : [];
    const supportIds = u.kind === 'support' || u.kind === 'class' ? u.payload.supportIds : [];
    for (const id of skillIds) if (!SKILLS[id]) warn(`unlock ${u.id}: unknown skill '${id}'`);
    for (const id of supportIds) if (!SUPPORTS[id]) warn(`unlock ${u.id}: unknown support '${id}'`);
    if (u.kind === 'class' && !CLASSES.some(c => c.id === u.payload.classId)) {
      warn(`unlock ${u.id}: unknown class '${u.payload.classId}'`);
    }
    const reqs = !u.requiresUnlock ? [] : Array.isArray(u.requiresUnlock) ? u.requiresUnlock : [u.requiresUnlock];
    for (const req of reqs) {
      if (!unlockIds.has(req)) warn(`unlock ${u.id}: requiresUnlock names unknown unlock '${req}'`);
    }
  }
  for (const c of CLASSES) {
    const bundles = CLASS_BUNDLES.filter(b => b.classId === c.id).length;
    if (STARTER_CLASSES.includes(c.id)) {
      if (bundles > 0) warn(`class ${c.id}: starter class has a class bundle (already always in the roll)`);
    } else if (bundles !== 1) {
      warn(`class ${c.id}: ${bundles} class bundles (needs exactly ONE to join the roll pool)`);
    }
  }

  // CLASS KITS — the parity contract (classes.ts CLASS_CFG). Every class:
  // the same attribute budget, the same kit size, a kit it can actually BIND
  // (its own spread meets each starter's attribute gates), and a kit that is
  // GLOBALLY unique — a starting skill is a class's signature, so one skill
  // opening two classes is drift, not economy. Non-starter classes must also
  // keep their bar gems purchasable: a bar skill missing from the class's own
  // bundle can never DROP for that account line (the granted-spark hatch
  // rescues the character, not the economy).
  {
    const kitOwner = new Map<string, string>();
    const classIds = new Set<string>();
    for (const c of CLASSES) {
      if (classIds.has(c.id)) warn(`class ${c.id}: duplicate class id`);
      classIds.add(c.id);
      const kit = c.bar.filter((s): s is string => s !== null);
      if (kit.length !== CLASS_CFG.kitSize) {
        warn(`class ${c.id}: ${kit.length} starting skills (parity contract says exactly ${CLASS_CFG.kitSize})`);
      }
      const seen = new Set<string>();
      for (const sid of kit) {
        if (seen.has(sid)) warn(`class ${c.id}: '${sid}' bound twice on its own bar`);
        seen.add(sid);
        const def = SKILLS[sid];
        if (!def) { warn(`class ${c.id}: bar names unknown skill '${sid}'`); continue; }
        if (def.noDrop) warn(`class ${c.id}: bar skill '${sid}' is an internal noDrop payload`);
        const owner = kitOwner.get(sid);
        if (owner) warn(`class kits: '${sid}' opens BOTH ${owner} and ${c.id} (kits must not overlap)`);
        else kitOwner.set(sid, c.id);
        for (const [attr, need] of Object.entries(def.requirements ?? {})) {
          const have = c.attributes[attr as keyof typeof c.attributes] ?? 0;
          if (have < (need ?? 0)) {
            warn(`class ${c.id}: cannot bind its own starter '${sid}' (${attr} ${have} < ${need})`);
          }
        }
      }
      const budget = Object.values(c.attributes).reduce((a, b) => a + (b ?? 0), 0);
      if (budget !== CLASS_CFG.attrBudget) {
        warn(`class ${c.id}: attribute spread sums to ${budget} (budget is ${CLASS_CFG.attrBudget})`);
      }
      const start = PASSIVE_NODES[c.startNode];
      if (!start) warn(`class ${c.id}: startNode '${c.startNode}' not on the passive tree`);
      else if (start.kind !== 'start') warn(`class ${c.id}: startNode '${c.startNode}' is not a start-kind node`);
      if (c.look && !LOOKS[c.look]) warn(`class ${c.id}: look '${c.look}' not in LOOKS`);
      if (!STARTER_CLASSES.includes(c.id)) {
        const bundle = CLASS_BUNDLES.find(b => b.classId === c.id);
        for (const sid of kit) {
          if (bundle && !bundle.skillIds.includes(sid)) {
            warn(`class ${c.id}: bar skill '${sid}' missing from its class bundle (could never drop)`);
          }
        }
      }
    }
  }

  // THE POOL-ORPHAN NET (the Polyphony/Ostinato lesson): drops and vendor
  // stock both gate on the account's unlocked-gem sets, and ONLY unlock
  // payloads (plus the starter seeds) ever fill them — so a droppable gem
  // that appears in NO unlock payload is defined, valid, minDropLevel'd…
  // and unreachable forever, with nothing else that would say so. Forward
  // checks (unlock → real gem) existed; this is the reverse.
  {
    const pooled = new Set<string>(STARTER_SKILLS);
    const pooledSup = new Set<string>(STARTER_SUPPORTS);
    for (const u of unlocks) {
      if (u.kind === 'skill' || u.kind === 'class') for (const id of u.payload.skillIds) pooled.add(id);
      if (u.kind === 'support' || u.kind === 'class') for (const id of u.payload.supportIds) pooledSup.add(id);
    }
    // Two grades of orphan, each ONE summary line so the counts are watched
    // without drowning the log (the counts moving IS the tripwire — a new
    // gem landing outside every pool bumps them):
    //   AUTHORED INTENT — dropWeight/minDropLevel tuned on an unpooled gem:
    //   someone balanced a drop that cannot happen (the Polyphony trap, at
    //   family scale). LIMBO — no drop fields, no noDrop, no pool: standing
    //   catalog debt. Pay both down per family: a pool/ledger row, a bundle
    //   seat, or an honest noDrop. (Quest-gift lanes — Mireille's flasks —
    //   still reach players without pools; the counts include them.)
    const intentSkills: string[] = [];
    const limboSkills: string[] = [];
    for (const s of Object.values(SKILLS)) {
      if (s.noDrop || pooled.has(s.id)) continue;
      (s.dropWeight !== undefined || s.minDropLevel !== undefined ? intentSkills : limboSkills).push(s.id);
    }
    if (intentSkills.length) {
      warn(`skill pool orphans (AUTHORED drop fields, no unlock pool row — cannot drop or vend): ${intentSkills.length} — ${intentSkills.slice(0, 10).join(', ')}${intentSkills.length > 10 ? ', …' : ''}`);
    }
    if (limboSkills.length) {
      warn(`skill pool limbo (no drop fields, no noDrop, no pool row): ${limboSkills.length} — e.g. ${limboSkills.slice(0, 6).join(', ')}…`);
    }
    const intentSups: string[] = [];
    const limboSups: string[] = [];
    for (const sup of Object.values(SUPPORTS)) {
      if (pooledSup.has(sup.id)) continue;
      (sup.weight !== undefined || sup.minDropLevel !== undefined || sup.dropTags !== undefined ? intentSups : limboSups).push(sup.id);
    }
    if (intentSups.length) {
      warn(`support pool orphans (AUTHORED drop fields, no unlock pool row — cannot drop or vend): ${intentSups.length} — ${intentSups.slice(0, 10).join(', ')}${intentSups.length > 10 ? ', …' : ''}`);
    }
    if (limboSups.length) {
      warn(`support pool limbo (no drop fields, no pool row): ${limboSups.length} — e.g. ${limboSups.slice(0, 6).join(', ')}…`);
    }
  }

  // THE MIMIC POOL is TAUGHT, never dropped: a mimicable art reaches the
  // player only through a monster that actually casts it. An explicit
  // mimicable:true on a skill NO kit carries is a dead allow — flag it
  // (the tag-default lane is exempt: defaults describe policy, not intent).
  {
    const taught = new Set<string>();
    for (const m of Object.values(MONSTERS)) for (const sid of m.skills) taught.add(sid);
    for (const s of Object.values(SKILLS)) {
      if (s.mimicable === true && !taught.has(s.id)) {
        warn(`skill ${s.id}: mimicable:true but no monster kit teaches it (dead allow)`);
      }
    }
  }

  // MERCENARY MARKET: every baseline template must resolve (class + any
  // explicit bar skills), and the offer/scaling knobs must be sane — a bad
  // share range or an empty template pool starves every outpost silently.
  const mercIds = new Set<string>();
  for (const t of MERC_TEMPLATES) {
    if (mercIds.has(t.id)) warn(`merc template ${t.id}: duplicate id`);
    mercIds.add(t.id);
    if (!CLASSES.some(c => c.id === t.classId)) warn(`merc template ${t.id}: unknown class '${t.classId}'`);
    for (const sid of t.bar ?? []) {
      if (sid && !SKILLS[sid]) warn(`merc template ${t.id}: bar names unknown skill '${sid}'`);
    }
    if (!t.names.length) warn(`merc template ${t.id}: empty name pool`);
  }
  if (!MERC_TEMPLATES.length) warn('merc templates: pool is EMPTY (outposts would offer only veterans)');
  if (MERC_CFG.offers.retiredShareMin < 0 || MERC_CFG.offers.retiredShareMax > 1
    || MERC_CFG.offers.retiredShareMin > MERC_CFG.offers.retiredShareMax) {
    warn('MERC_CFG.offers: retired share range must be 0 ≤ min ≤ max ≤ 1');
  }
  if (MERC_CFG.offers.min < 1 || MERC_CFG.offers.min > MERC_CFG.offers.max) {
    warn('MERC_CFG.offers: need 1 ≤ min ≤ max');
  }
  if (MERC_CFG.rosterCap < 1) warn('MERC_CFG.rosterCap must be ≥ 1');
  if (!MONSTERS['merc_captain']) warn('mercs: merc_captain MonsterDef missing (outposts cannot spawn)');

  // THE NOMENCLATURE MILL: pools must be speakable, and every named tier must
  // be a real rarity — an empty pool would weld blank compounds silently.
  if (MONSTER_NAMES.prefixes.length < 10 || MONSTER_NAMES.suffixes.length < 10) {
    warn('monster names: prefix/suffix pools thinner than 10 (name variety collapses)');
  }
  if (!MONSTER_NAMES.epithets.length) warn('monster names: epithet pool is EMPTY');
  for (const r of MONSTER_NAME_CFG.namedRarities) {
    if (!RARITY_DEFS[r]) warn(`monster names: namedRarities lists unknown tier '${r}'`);
  }

  // THE WORLD'S MEMORY: the nemesis vocabulary must be speakable — an empty
  // rank ladder or name pool would mint blank foes; grudge tiers must ascend
  // (the highest-met-tier scan assumes it).
  if (!NEMESIS_RANKS.length) warn('nemesis: NEMESIS_RANKS is EMPTY (no promotion ladder)');
  if (!NEMESIS_NAMES.first.length || !NEMESIS_NAMES.epithets.length) {
    warn('nemesis: default name pools must not be empty');
  }
  for (let i = 1; i < GRUDGE_TIERS.length; i++) {
    if (GRUDGE_TIERS[i].kills <= GRUDGE_TIERS[i - 1].kills) {
      warn(`nemesis: GRUDGE_TIERS must ascend by kills ('${GRUDGE_TIERS[i].label}' does not)`);
    }
  }
  for (const [k, v] of Object.entries({
    slayerChance: NEMESIS_CFG.slayerChance, survivorChance: NEMESIS_CFG.survivorChance,
    cheatDeathChance: NEMESIS_CFG.cheatDeathChance, manifestChance: NEMESIS_CFG.manifestChance,
  })) {
    if (v < 0 || v > 1) warn(`nemesis: NEMESIS_CFG.${k} out of [0,1]`);
  }

  // CHARACTER MODES: the death-policy ladders must be walkable and every gate
  // they reference must exist. A mode with an unreachable unlock flag or an
  // 'advance' on its LAST stage would strand the death flow at runtime.
  const catalogFlags = new Set(unlocks.flatMap(u => u.kind === 'feature' ? [u.payload.flag] : []));
  const modeIds = new Set<string>();
  for (const m of MODES) {
    if (modeIds.has(m.id)) warn(`mode ${m.id}: duplicate id`);
    modeIds.add(m.id);
    if (!m.stages.length) { warn(`mode ${m.id}: has NO stages`); continue; }
    if (m.stages[m.stages.length - 1].onDeath === 'advance') {
      warn(`mode ${m.id}: last stage '${m.stages[m.stages.length - 1].id}' advances off the end of the ladder`);
    }
    if (m.unlockFlag && !catalogFlags.has(m.unlockFlag)) {
      warn(`mode ${m.id}: unlockFlag '${m.unlockFlag}' is sold by no Vault feature entry (unreachable mode)`);
    }
    if (m.save === 'roster' && !m.rosterPool) warn(`mode ${m.id}: roster-saved but has no rosterPool`);
    for (const f of m.rosterPool?.extraFlags ?? []) {
      if (!catalogFlags.has(f)) warn(`mode ${m.id}: roster slot flag '${f}' is sold by no Vault feature entry`);
    }
    for (const st of m.stages) {
      // An account-progressing stage writing self-only corpses is legal (the
      // Immortal crossing); the REVERSE — a sealed stage feeding the shared
      // ring — would leak the sandbox back into the mortal economy.
      if (!st.metaProgression && st.corpseRing === 'account') {
        warn(`mode ${m.id}/${st.id}: metaProgression off but corpses write the ACCOUNT ring (economy leak)`);
      }
    }
  }
  if (!MODE_BY_ID[DEFAULT_MODE_ID]) warn(`modes: default '${DEFAULT_MODE_ID}' missing from the registry`);

  // CHOICE NODES: deals resolve, pools are unambiguous, character-unique
  // groups aren't oversubscribed, grafts name live supports (the sweeps
  // live beside their registries).
  validatePassiveChoices(warn, PASSIVE_NODES, id => !!SUPPORTS[id]);
  validatePassiveRealms(warn, PASSIVE_NODES);

  // MONSTER BOONS: the bestiary's rolls from the player-shared choice pools
  // must resolve — a typo'd group is a silent nothing at spawn.
  for (const mdef of Object.values(MONSTERS)) {
    for (const b of mdef.boons ?? []) {
      const g = CHOICE_GROUPS[b.group];
      if (!g) { warn(`monster ${mdef.id}: boon names unknown choice group '${b.group}'`); continue; }
      if ((b.pick ?? 1) > g.options.length) warn(`monster ${mdef.id}: boon pick ${b.pick} exceeds group '${b.group}' pool (${g.options.length})`);
      if (b.chance !== undefined && !(b.chance >= 0 && b.chance <= 1)) warn(`monster ${mdef.id}: boon chance ${b.chance} outside [0,1]`);
    }
  }
}
