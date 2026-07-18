// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WORKSHOP end to end on the real engine (the Entity
// Forge's store, meta/workshop.ts): the NAMESPACE LAW both directions (grafts
// refuse unprefixed ids; shipped content never squats the prefix; ungraft
// can't touch shipped ids), the graft/ungraft registry weave (MONSTERS +
// LOOKS + the def↔look invariant), the save-shape gate (schema mismatch =
// null, law-breaking rows dropped), FIRST-CLASS COMBAT CITIZENSHIP (a
// workshop def minted through the REAL createMonster wears its look, scales
// with level, spawns via devGrabSpawn, climbs the elite ladder via
// promoteMonster, takes a real executeSkill blow through the mitigation
// ladder and dies with kill credit), the validator SAME-NET rule (a broken
// workshop kit draws the same [content] warning shipped content would), the
// TS promotion emitter (mod() rows, look block, no undefined tokens), and
// the forge schema's dot-path laws (nested create, prune-on-unset).
// Run: npx tsx balance/probe_workshop.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { validateContent } from '../src/data/validate';
import { makeSkillInstance, type SkillDef } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { vec } from '../src/core/math';
import {
  deriveGlyphSurface, findPrefixSquatters, graftWorkshopEntity,
  graftWorkshopDoodad, isWorkshopId, parseWorkshopSave,
  removeWorkshopDoodad, removeWorkshopEntity, removeWorkshopGlyphPart,
  serializeDoodadTS, serializeEntityTS, serializeGlyphPartTS,
  ungraftWorkshopDoodadKind, ungraftWorkshopId,
  upsertWorkshopDoodad, upsertWorkshopEntity, upsertWorkshopGlyphPart,
  workshop, workshopEntity, WORKSHOP_PREFIX,
  type WorkshopDoodadKind, type WorkshopEntity, type WorkshopSave,
} from '../src/meta/workshop';
import {
  PART_PAINTERS, registerGlyphPart, unregisterGlyphPart, type GlyphDef,
} from '../src/render/vis/parts';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { doodadRuleOf, hitSurfaceOf, type Doodad } from '../src/engine/levelgen';
import { shapeContains } from '../src/engine/shapes';
import { getPath, setPath } from '../src/dev/forgeSchema';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x9f0e5);

const mkEntity = (): WorkshopEntity => ({
  def: {
    id: 'custom_probe_brute', name: 'Probe Brute',
    color: '#8a5a3a', shape: 'circle', radius: 15, material: 'chitin',
    base: { life: 40, moveSpeed: 100, accuracy: 70, mana: 0 },
    mods: [mod('chaosRes', 'flat', 0.3)],
    skills: ['claw'], xp: 8,
  },
  look: {
    parts: [
      { kind: 'carapace' },
      { kind: 'claws', x: 0.2, scale: 1.1, mirror: true },
      { kind: 'eyes', color: '#c8d89a' },
    ],
  },
});

// --- 0) The namespace law, both directions ---------------------------------
{
  check('law: isWorkshopId is the prefix test',
    isWorkshopId('custom_x') && !isWorkshopId('zombie'));
  check('law: shipped content never squats the prefix (pristine registry)',
    findPrefixSquatters().length === 0, findPrefixSquatters().join(','));
  const bad: WorkshopEntity = { def: { ...mkEntity().def, id: 'zombie_two' } };
  const err = graftWorkshopEntity(bad);
  check('law: a graft refuses an unprefixed id with an error, registry untouched',
    err !== null && MONSTERS.zombie_two === undefined, String(err));
  const before = MONSTERS.zombie;
  ungraftWorkshopId('zombie');
  check('law: ungraft cannot touch shipped ids', MONSTERS.zombie === before);
}

// --- 1) Graft/ungraft weave + the def↔look invariant -----------------------
{
  const e = mkEntity();
  check('upsert: lands in MONSTERS and LOOKS, look worn under the def id',
    upsertWorkshopEntity(e) === null
    && MONSTERS.custom_probe_brute !== undefined
    && LOOKS.custom_probe_brute !== undefined
    && MONSTERS.custom_probe_brute.look === 'custom_probe_brute'
    && workshopEntity('custom_probe_brute') !== undefined);
  const e2: WorkshopEntity = { def: { ...mkEntity().def, look: 'custom_probe_brute' } };
  check('upsert: replacing WITHOUT a composed look clears the orphaned LOOKS row',
    upsertWorkshopEntity(e2) === null
    && LOOKS.custom_probe_brute === undefined
    && MONSTERS.custom_probe_brute.look === undefined
    && workshop.entities.length === 1);
  check('remove: ungrafts and empties the store',
    removeWorkshopEntity('custom_probe_brute')
    && MONSTERS.custom_probe_brute === undefined
    && workshop.entities.length === 0);
}

// --- 2) The save-shape gate -------------------------------------------------
{
  const good: WorkshopSave = { schemaVersion: 1, entities: [mkEntity()] };
  const parsed = parseWorkshopSave(JSON.parse(JSON.stringify(good)));
  check('save gate: a well-formed save round-trips its rows',
    parsed !== null && parsed.entities.length === 1 && parsed.entities[0].def.id === 'custom_probe_brute');
  check('save gate: schema mismatch = null (wipe-on-mismatch; v1 + v2 accepted)',
    parseWorkshopSave({ schemaVersion: 3, entities: [mkEntity()] }) === null
    && parseWorkshopSave('nonsense') === null
    && parseWorkshopSave(null) === null);
  const smuggle = {
    schemaVersion: 1,
    entities: [mkEntity(), { def: { ...mkEntity().def, id: 'zombie' } }, { nonsense: true }],
  };
  const kept = parseWorkshopSave(JSON.parse(JSON.stringify(smuggle)));
  check('save gate: law-breaking and malformed rows are dropped, good rows kept',
    kept !== null && kept.entities.length === 1 && kept.entities[0].def.id === 'custom_probe_brute');
}

// --- 3) First-class combat citizenship --------------------------------------
{
  check('setup: brute registered', upsertWorkshopEntity(mkEntity()) === null);
  const w = makeSimWorld('warrior', 0x9f11);
  const p = w.player;

  const m1 = w.createMonster('custom_probe_brute', 1, 'enemy');
  check('factory: the REAL createMonster mints it — defId, look, base life',
    m1.defId === 'custom_probe_brute' && m1.look === 'custom_probe_brute' && m1.maxLife() > 0);
  const m9 = w.createMonster('custom_probe_brute', 9, 'enemy');
  check('factory: the level curve applies to a workshop def like any other',
    m9.maxLife() > m1.maxLife() * 1.2, `L1 ${m1.maxLife().toFixed(0)} vs L9 ${m9.maxLife().toFixed(0)}`);

  check('spawn: devGrabSpawn seats it beside the hero', w.devGrabSpawn('custom_probe_brute'));
  const b = w.actors[w.actors.length - 1];
  check('spawn: the seated body is ours, in reach',
    b.defId === 'custom_probe_brute'
    && Math.hypot(b.pos.x - p.pos.x, b.pos.y - p.pos.y) < 260);

  const lifeBefore = b.maxLife();
  w.promoteMonster(b, 'rare');
  check('elite ladder: promoteMonster crowns a workshop body (life grew, rarity stamped)',
    b.rarity === 'rare' && b.maxLife() > lifeBefore,
    `life ${lifeBefore.toFixed(0)} → ${b.maxLife().toFixed(0)}`);

  const mkStrike = (dmg: number, id: string): SkillDef => ({
    id, name: id, noDrop: true, description: '',
    tags: ['spell'], color: '#fff',
    manaCost: 0, cooldown: 0, useTime: 0,
    baseDamage: { physical: [dmg, dmg] as [number, number] },
    delivery: { type: 'melee', range: 300, arcDeg: 180 },
    effects: [{ type: 'damage' }],
  } as SkillDef);
  const jab = mkStrike(30, 'probe_jab');
  const slam = mkStrike(500, 'probe_slam');
  p.sheet.setSource('probe', [mod('accuracy', 'increased', 60)]);
  const swing = (def: SkillDef): void => {
    p.useLock = 0; p.mana = p.maxMana();
    w.executeSkill(p, makeSkillInstance(def, 1), vec(b.pos.x, b.pos.y));
  };
  // Capture the credit baseline BEFORE any blow lands — a one-shot pays out
  // synchronously on the hit path. XP banks on the seat meta and level-ups
  // CONSUME it, so watch both readouts.
  const xpBefore = w.meta.xp;
  const lvlBefore = p.level;
  const full = b.life;
  swing(jab);
  check('combat: a real executeSkill blow wounds it through the ladder',
    b.life < full && !b.dead, `life ${full.toFixed(0)} → ${b.life.toFixed(0)}`);
  for (let i = 0; i < 60 && !b.dead; i++) { swing(slam); w.update(1 / 60); }
  check('combat: it dies with kill credit paid (xp flowed)',
    b.dead && (w.meta.xp !== xpBefore || p.level > lvlBefore),
    `dead ${b.dead}, xp ${xpBefore} → ${w.meta.xp}, L${lvlBefore} → L${p.level}`);
}

// --- 4) The validator's same-net rule ---------------------------------------
{
  const broken: WorkshopEntity = {
    def: { ...mkEntity().def, id: 'custom_probe_broken', skills: ['no_such_skill_xyz'] },
  };
  check('setup: broken kit registered', upsertWorkshopEntity(broken) === null);
  const sweep = (): string[] => {
    const captured: string[] = [];
    const orig = console.warn;
    console.warn = (...a: unknown[]): void => { captured.push(a.map(String).join(' ')); };
    try { validateContent(); } finally { console.warn = orig; }
    return captured;
  };
  const lines = sweep().filter(s => s.includes('custom_probe_broken'));
  check('same net: a broken workshop kit draws the boot lint by name',
    lines.length > 0, lines[0] ?? '(no line)');
  const fixed: WorkshopEntity = { def: { ...mkEntity().def, id: 'custom_probe_broken' } };
  check('setup: kit fixed', upsertWorkshopEntity(fixed) === null);
  check('same net: a law-abiding workshop def passes the sweep clean',
    sweep().filter(s => s.includes('custom_probe_broken')).length === 0);
  removeWorkshopEntity('custom_probe_broken');
}

// --- 5) The TS promotion emitter --------------------------------------------
{
  const e = mkEntity();
  e.def.grants = [{ atLevel: 5, skill: 'cleave' }];
  e.def.packSize = [2, 4];
  (e.def.mods ??= []).push({ stat: 'thorns', kind: 'link', value: 0.4, fromStat: 'lifeRegen' });
  const src = serializeEntityTS(e);
  check('export: def + look blocks keyed by the entity id',
    src.includes('custom_probe_brute: {') && src.includes('LOOK — paste inside LOOKS'));
  check('export: constructor-shaped mods emit the mod() house idiom',
    src.includes("mod('chaosRes', 'flat', 0.3)"));
  check('export: link-shaped mods stay literal (fromStat is not mod()\'s shape)',
    src.includes('fromStat') && !src.includes("mod('thorns'"));
  check('export: no undefined tokens, braces balanced',
    !src.includes('undefined')
    && (src.match(/\{/g) ?? []).length === (src.match(/\}/g) ?? []).length,
    `${(src.match(/\{/g) ?? []).length} braces`);
  check('export: nested rows survive (grants, packSize, mirror)',
    src.includes('atLevel: 5') && src.includes('packSize: [2, 4]') && src.includes('mirror: true'));
}

// --- 6) Dot-path laws (the forge schema's plumbing) -------------------------
{
  const o: Record<string, unknown> = { radius: 14, base: { life: 40 } };
  setPath(o, 'plies.count', 3);
  check('setPath: nested create', getPath(o, 'plies.count') === 3);
  setPath(o, 'plies.floor', 10);
  setPath(o, 'plies.count', undefined);
  check('setPath: unset leaves siblings, keeps the parent',
    getPath(o, 'plies.floor') === 10 && getPath(o, 'plies.count') === undefined);
  setPath(o, 'plies.floor', undefined);
  check('setPath: unsetting the LAST leaf prunes the emptied parent',
    o.plies === undefined);
  setPath(o, 'aggro.fury', undefined);
  check('setPath: unset under a missing parent creates nothing', o.aggro === undefined);
  check('setPath: untouched keys survive the traffic', o.radius === 14 && getPath(o, 'base.life') === 40);
}

// --- 7) THE GLYPH FABRIC — painters as data ---------------------------------
{
  const fin: GlyphDef = {
    ops: [
      { kind: 'poly', pts: [[0.2, 0.1], [0.9, 0.4], [0.3, 0.5]], mirror: true, outline: true },
      { kind: 'disc', x: 0.5, y: 0, rx: 0.15, role: 'glow' },
      { kind: 'path', pts: [[-0.4, 0], [-0.9, 0.2]], wR: 0.08, sway: { ay: 0.1, freq: 3 } },
    ],
  };
  check('glyph law: registration refuses an unprefixed kind',
    registerGlyphPart('finblade', fin) !== null && PART_PAINTERS.finblade === undefined);
  check('glyph law: prefix parity with the workshop', WORKSHOP_PREFIX === 'custom_');
  check('glyph: a registered kind is a live PART_PAINTERS citizen',
    registerGlyphPart('custom_probe_fin', fin) === null
    && typeof PART_PAINTERS.custom_probe_fin === 'function');
  const snoutBefore = PART_PAINTERS.snout;
  unregisterGlyphPart('snout');
  check('glyph law: unregister cannot touch a shipped painter',
    PART_PAINTERS.snout === snoutBefore);
  unregisterGlyphPart('custom_probe_fin');
  check('glyph: unregister removes the drawn kind (looks skip it silently)',
    PART_PAINTERS.custom_probe_fin === undefined);

  check('glyph store: upsert registers + persists the row',
    upsertWorkshopGlyphPart({ kind: 'custom_probe_fin', glyph: fin }) === null
    && workshop.glyphParts.length === 1
    && typeof PART_PAINTERS.custom_probe_fin === 'function');
  check('glyph store: a v1 (entity-only) save still parses — upgrade never wipes',
    (() => {
      const v1 = { schemaVersion: 1, entities: [mkEntity()] };
      const parsed = parseWorkshopSave(JSON.parse(JSON.stringify(v1)));
      return parsed !== null && parsed.entities.length === 1
        && parsed.glyphParts.length === 0 && parsed.doodads.length === 0;
    })());
  check('glyph store: v2 rows round-trip, law-breaking part rows drop',
    (() => {
      const v2: WorkshopSave = {
        schemaVersion: 2, entities: [],
        glyphParts: [{ kind: 'custom_probe_fin', glyph: fin }, { kind: 'snout', glyph: fin }],
      };
      const parsed = parseWorkshopSave(JSON.parse(JSON.stringify(v2)));
      return parsed !== null && parsed.glyphParts.length === 1
        && parsed.glyphParts[0].kind === 'custom_probe_fin';
    })());
  check('glyph export: the GLYPH_PARTS promotion row emits clean',
    (() => {
      const src = serializeGlyphPartTS({ kind: 'custom_probe_fin', glyph: fin });
      return src.includes('custom_probe_fin:') && src.includes('mirror: true')
        && !src.includes('undefined');
    })());
  check('glyph store: remove un-registers and empties',
    removeWorkshopGlyphPart('custom_probe_fin')
    && PART_PAINTERS.custom_probe_fin === undefined
    && workshop.glyphParts.length === 0);
}

// --- 8) DRAWN DOODAD KINDS + auto-collision ---------------------------------
{
  const slabGlyph: GlyphDef = {
    ops: [{ kind: 'poly', pts: [[-1.4, -0.4], [1.4, -0.4], [1.4, 0.4], [-1.4, 0.4]], outline: true }],
  };
  const roundGlyph: GlyphDef = {
    ops: [{ kind: 'disc', rx: 0.8 }, { kind: 'ring', rx: 0.9, wR: 0.05 }],
  };
  const derivedSlab = deriveGlyphSurface(slabGlyph);
  check('auto-collision: an oblong drawing derives the RECT surface word',
    derivedSlab.surface !== undefined
    && Math.abs(derivedSlab.surface.hw - 1.4) < 0.01
    && Math.abs(derivedSlab.surface.hh - 0.4) < 0.01
    && derivedSlab.surface.orient === 'rot');
  const derivedRound = deriveGlyphSurface(roundGlyph);
  check('auto-collision: a round drawing derives the tightened DISC (bodyScale)',
    derivedRound.bodyScale !== undefined && Math.abs(derivedRound.bodyScale - 0.9) < 0.01
    && derivedRound.surface === undefined);
  const mirrored = deriveGlyphSurface({ ops: [{ kind: 'poly', pts: [[0, 0.2], [1, 0.6], [0.5, 0.7]], mirror: true }] });
  check('auto-collision: per-op mirror symmetrizes the derived extents',
    mirrored.surface !== undefined && Math.abs(mirrored.surface.hh - 0.7) < 0.01);

  const row: WorkshopDoodadKind = {
    kind: 'custom_probe_slab', glyph: slabGlyph, color: '#8a8276',
    order: 52, shadow: 0.5,
    rule: { overlap: 'solid', blocksMove: true, blocksShot: true, surface: derivedSlab.surface },
  };
  check('doodad law: graft refuses an unprefixed kind',
    graftWorkshopDoodad({ ...row, kind: 'slab' }) !== null && DOODAD_VISUALS.slab === undefined);
  check('doodad: graft lands the VISUAL row + the runtime rule',
    upsertWorkshopDoodad(row) === null
    && DOODAD_VISUALS.custom_probe_slab?.painter === 'glyph'
    && doodadRuleOf('custom_probe_slab').blocksMove === true
    && workshop.doodads.length === 1);

  // The resolver truth every consumer reads: a standing instance tests the
  // drawn rect, spun with its seeded rot.
  const d: Doodad = { pos: { x: 500, y: 500 }, radius: 20, kind: 'custom_probe_slab', rot: 0 };
  const surf = hitSurfaceOf(d, 'move');
  check('doodad: hitSurfaceOf resolves the drawn rect (drawn == tested)',
    surf.kind === 'rect'
    && shapeContains(surf, d.pos.x, d.pos.y, 500 + 20 * 1.3, 500, 0)      // inside the long axis
    && !shapeContains(surf, d.pos.x, d.pos.y, 500, 500 + 20 * 0.9, 0));   // outside the short axis
  const w = makeSimWorld('warrior', 0x9f21);
  const near = w.player.pos;
  const inst: Doodad = { pos: { x: near.x + 60, y: near.y }, radius: 18, kind: 'custom_probe_slab', rot: 0 };
  w.doodads.push(inst);
  check('doodad: a runtime-pushed instance joins the spatial index (self-heal)',
    w.doodadsAt(inst.pos.x, inst.pos.y).includes(inst));

  check('doodad export: promotion literals carry visual + rule + scatter hint',
    (() => {
      const src = serializeDoodadTS(row);
      return src.includes("painter: 'glyph'") && src.includes('registerDoodadRule(')
        && src.includes('custom_probe_slab') && !src.includes('undefined');
    })());
  check('doodad: remove un-grafts both registries',
    removeWorkshopDoodad('custom_probe_slab')
    && DOODAD_VISUALS.custom_probe_slab === undefined
    && doodadRuleOf('custom_probe_slab').blocksMove === undefined
    && workshop.doodads.length === 0);
  ungraftWorkshopDoodadKind('custom_probe_slab'); // idempotent tidy
}

// --- cleanup ----------------------------------------------------------------
removeWorkshopEntity('custom_probe_brute');
check('cleanup: registry pristine again',
  findPrefixSquatters().length === 0
  && Object.keys(MONSTERS).every(id => !id.startsWith(WORKSHOP_PREFIX))
  && workshop.entities.length === 0 && workshop.glyphParts.length === 0
  && workshop.doodads.length === 0);

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
