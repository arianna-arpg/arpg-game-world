// ---------------------------------------------------------------------------
// Content validation — cheap cross-checks over the data files, run once at
// boot. Pure warnings: the game still runs, but authoring mistakes that
// would otherwise fail SILENTLY (a monster that can never afford its own
// skill and just stands there) get a loud console line instead.
// ---------------------------------------------------------------------------

import { MONSTERS, WAVE_TABLE } from './monsters';
import { SKILLS } from './skills';
import { SUPPORTS } from './supports';
import { supportFits, type Delivery, type SkillDef, type SupportDef } from '../engine/skills';
import { PROCS } from './procs';
import { CLASSES } from './classes';
import { VOCATIONS, VOCATION_CFG } from './vocations';
import { ATTUNEMENT_LIST, TERRAFORM_LIST, MAX_ATTUNE_RADIUS } from './attunements';
import { PASSIVE_NODES, vocationGateNodeId } from './passives';
import { STAT_DEFS } from '../engine/stats';
import { STATUS_DEFS } from '../engine/status';
import { ZONES, type StampSpec, type StructureRoll } from './zones';
import { TILESETS } from './tilesets';
import { validatePassiveLayout } from './validatePassiveLayout';
import { allUnlockables, CLASS_BUNDLES } from '../meta/unlocks';
import { STARTER_CLASSES } from '../meta/account';
import { DEFAULT_MODE_ID, MODE_BY_ID, MODES } from '../meta/modes';
import { MERC_CFG } from '../meta/mercs';
import { MERC_TEMPLATES } from './mercenaries';
import { NEMESIS_CFG } from '../meta/nemesis';
import { GRUDGE_TIERS, NEMESIS_NAMES, NEMESIS_RANKS } from './nemesis';
import { MONSTER_NAME_CFG, MONSTER_NAMES } from './monsterNames';
import { RARITY_DEFS } from '../engine/rarity';
import {
  validateStamps, doodadRuleOf, hasDoodadRule,
  hasLandmark, hasLandmarkBuilder, landmarkDefs,
} from '../engine/levelgen';
import { STRUCTURES, legendCell, hasRoofStyle, type StructureDef } from './structures';
import { hasStructureGen, runStructureGen } from '../engine/structureGen';
import { liquidIds } from '../engine/genkit';
import { BIOMES } from '../world/biomes';
import { VOYAGE_ISLANDS } from './voyageIslands';
import { Rng } from '../core/rng';

export function validateContent(): void {
  const warn = (msg: string): void => console.warn(`[content] ${msg}`);
  validatePassiveLayout(warn);

  // Every authored layout entry must resolve against the live stamp/cluster/
  // structure registries — the open StampKind's safety net (variants included).
  const layoutSources: { source: string; specs: StampSpec[] }[] = [
    ...Object.values(ZONES).map(z => ({ source: `zone ${z.id}`, specs: z.layout })),
    ...Object.values(TILESETS).flatMap(t => [
      { source: `tileset ${t.id}`, specs: t.layout },
      ...(t.variants ?? []).map((v, i) => ({ source: `tileset ${t.id} variant ${v.name ?? i}`, specs: v.layout })),
    ]),
  ];
  for (const msg of validateStamps(layoutSources)) warn(msg);

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
  type DeliveryType = Delivery['type'];
  type GraftReadRow = {
    /** Delivery branches whose execution actually reads the payload. */
    deliveries: DeliveryType[];
    /** Read-sites BEYOND the delivery switch (fx zones, pylon auras, linger
     *  fields) — the per-def false-positive escape hatch. */
    defReads?: (def: SkillDef) => boolean;
    /** Where the engine reads it — quoted in the warning as the fix-it trail. */
    site: string;
  } & (
    | { kind: 'graft'; key: keyof SupportDef }  // a structured SupportDef field
    | { kind: 'stat'; key: string }             // a stat carried in mods/perLevel
  );
  /** The def's OWN data carries a stat (innate, growth, or threshold mods) —
   *  reads gated on stats rather than deliveries honor it (a cone with an
   *  innate lingerField genuinely reads aoeShape for the field it drops). */
  const defCarriesStat = (def: SkillDef, stat: string): boolean =>
    (def.innateMods ?? []).some(m => m.stat === stat)
    || (def.leveling?.perLevel ?? []).some(m => m.stat === stat)
    || (def.thresholds ?? []).some(t => t.mods.some(m => m.stat === stat));
  const GRAFT_READ_SITES: GraftReadRow[] = [
    {
      kind: 'stat', key: 'aoeShape',
      deliveries: ['nova', 'ground', 'storm', 'aura', 'detonateProjectile'],
      defReads: def => (def.delivery.type === 'construct' && !!def.delivery.aura)
        || def.effects.some(e => e.type === 'spawnZone')
        || defCarriesStat(def, 'lingerField'),
      site: 'area-shape queries (novas, ground zones, storms, auras, linger fields)',
    },
    {
      kind: 'stat', key: 'aoeScatter',
      deliveries: ['nova', 'ground', 'storm', 'detonateProjectile'],
      site: 'spawnAftershocks (nova bursts, exploding/pulsing zones, storm strikes)',
    },
    {
      kind: 'stat', key: 'moveTrail',
      deliveries: ['dash'],
      site: 'the dash branch only (blinks and leaps travel without a wake)',
    },
    { kind: 'graft', key: 'cascade', deliveries: ['ground'], site: 'instanceCascade (ground placements only)' },
    { kind: 'graft', key: 'pulse', deliveries: ['ground'], site: 'instancePulse (ground placements only)' },
    { kind: 'graft', key: 'trail', deliveries: ['projectile'], site: 'spawnProjectile (flights only)' },
    { kind: 'graft', key: 'fissureTrail', deliveries: ['projectile'], site: 'spawnProjectile (flights only)' },
  ];
  // The map audits itself: a stat row naming a dead stat is map drift.
  for (const row of GRAFT_READ_SITES) {
    if (row.kind === 'stat' && !STAT_DEFS[row.key]) {
      warn(`no-op audit: read-site row names unknown stat '${row.key}' (map drift?)`);
    }
  }
  const carriesRow = (sup: SupportDef, row: GraftReadRow): boolean => (row.kind === 'graft'
    ? sup[row.key] !== undefined
    : [...sup.mods, ...(sup.perLevel ?? [])].some(m => m.stat === row.key));
  const rowUnread = (row: GraftReadRow, def: SkillDef): boolean => {
    if (row.deliveries.includes(def.delivery.type)) return false;
    if (row.defReads?.(def)) return false;
    // STAT payloads reach a construct's sub-casts (the turret's shots, the
    // totem's novas): the deployed object wears the host's instanceMods as
    // its 'parentSkill' sheet source, so every sheet query the sub-skill
    // makes sees them. GRAFT payloads do NOT follow — sub-skill instances
    // are minted fresh (null sockets) and instance-read grafts die there.
    if (row.kind === 'stat' && def.delivery.type === 'construct' && def.delivery.castSkillId) {
      const sub = SKILLS[def.delivery.castSkillId];
      if (sub && !rowUnread(row, sub)) return false;
    }
    return true;
  };

  // The catalog sweep: every DROPPABLE skill a gem tag-fits but never reads.
  const droppable = Object.values(SKILLS).filter(s => !s.noDrop);
  for (const sup of Object.values(SUPPORTS)) {
    for (const row of GRAFT_READ_SITES) {
      if (!carriesRow(sup, row)) continue;
      const inert = droppable.filter(def => supportFits(sup, def) && rowUnread(row, def));
      if (!inert.length) continue;
      const shown = inert.slice(0, 8).map(s => s.id).join(', ');
      warn(`support ${sup.id}: '${row.key}' is read only at ${row.site} — silently INERT on `
        + `${inert.length} tag-fitting skill(s): ${shown}${inert.length > 8 ? ` (+${inert.length - 8} more)` : ''}`);
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
      for (const row of GRAFT_READ_SITES) {
        if (carriesRow(sup, row) && rowUnread(row, target)) {
          warn(`${m.id}: grant @${g.atLevel} sockets '${g.support}' on '${g.on}' — its `
            + `'${row.key}' payload is never read by a '${target.delivery.type}' delivery`);
        }
      }
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
}
