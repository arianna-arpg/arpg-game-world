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
  findPrefixSquatters, graftWorkshopEntity, isWorkshopId, parseWorkshopSave,
  removeWorkshopEntity, serializeEntityTS, ungraftWorkshopId,
  upsertWorkshopEntity, workshop, workshopEntity, WORKSHOP_PREFIX,
  type WorkshopEntity, type WorkshopSave,
} from '../src/meta/workshop';
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
    parsed !== null && parsed.length === 1 && parsed[0].def.id === 'custom_probe_brute');
  check('save gate: schema mismatch = null (wipe-on-mismatch)',
    parseWorkshopSave({ schemaVersion: 2, entities: [mkEntity()] }) === null
    && parseWorkshopSave('nonsense') === null
    && parseWorkshopSave(null) === null);
  const smuggle = {
    schemaVersion: 1,
    entities: [mkEntity(), { def: { ...mkEntity().def, id: 'zombie' } }, { nonsense: true }],
  };
  const kept = parseWorkshopSave(JSON.parse(JSON.stringify(smuggle)));
  check('save gate: law-breaking and malformed rows are dropped, good rows kept',
    kept !== null && kept.length === 1 && kept[0].def.id === 'custom_probe_brute');
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

// --- cleanup ----------------------------------------------------------------
removeWorkshopEntity('custom_probe_brute');
check('cleanup: registry pristine again',
  findPrefixSquatters().length === 0
  && Object.keys(MONSTERS).every(id => !id.startsWith(WORKSHOP_PREFIX))
  && workshop.entities.length === 0);

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
