/**
 * export-web-data.ts — the parity pipeline.
 *
 * Imports the REAL game data modules from src/data and emits flat JSON into
 * site/data/*.json for the website (Database, Passive Tree, meta) to consume.
 *
 * The website never hard-codes game facts. This script is the single seam
 * between "source of truth" (src/data/*.ts) and "what the site shows". Run it
 * in CI before every deploy (see .github/workflows/pages.yml) and the site can
 * never drift from the game.
 *
 * Run:  npx tsx scripts/export-web-data.ts
 * Out:  site/data/{skills,supports,monsters,passives,classes,meta}.json
 *
 * Design notes
 * ------------
 * - Every entity is emitted with (a) a small set of NORMALIZED fields used for
 *   listing / search / filtering, and (b) a `raw` copy of the original entry.
 *   The Database detail view renders known fields nicely and dumps `raw`
 *   generically — so when you add a new field to a skill/monster, it shows up
 *   on the site automatically. Parity down to the field level, no site edits.
 * - Import names (SKILLS, MONSTERS, …) follow the repo's conventions. If any
 *   differ, this script logs what it found and how it resolved each module, so
 *   a mismatch is a one-line fix, not a mystery.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.WEB_DATA_OUT
  ? path.resolve(process.env.WEB_DATA_OUT)
  : path.join(ROOT, 'site', 'data');

// ---------------------------------------------------------------------------
// tiny utilities
// ---------------------------------------------------------------------------
const log = (...a: unknown[]) => console.error('[export-web-data]', ...a);

/** Turn a Record<string,T> or an array-of-{id} into a stable id->entry list. */
function toList(container: unknown, label: string): Array<Record<string, any>> {
  if (!container) { log(`WARN: ${label} is empty/undefined`); return []; }
  if (Array.isArray(container)) {
    return container.map((v, i) => ({ id: (v && (v.id ?? v.key)) ?? String(i), ...v }));
  }
  if (typeof container === 'object') {
    return Object.entries(container as Record<string, any>).map(([id, v]) => ({
      id: (v && v.id) ?? id,
      ...(v && typeof v === 'object' ? v : { value: v }),
    }));
  }
  log(`WARN: ${label} is neither array nor object (${typeof container})`);
  return [];
}

/**
 * Find the "main" export of a data module even if the exact name changes.
 * Tries the preferred names first, then falls back to the largest exported
 * Record/array of objects. Logs its choice so surprises are visible.
 */
function pick(mod: Record<string, any>, preferred: string[], label: string): unknown {
  for (const name of preferred) {
    if (mod && mod[name] != null) { log(`${label}: using export "${name}"`); return mod[name]; }
  }
  // fallback: biggest object-of-objects or array in the module
  let best: { name: string; size: number; val: unknown } | null = null;
  for (const [name, val] of Object.entries(mod || {})) {
    if (name === 'default') continue;
    let size = 0;
    if (Array.isArray(val)) size = val.length;
    else if (val && typeof val === 'object') size = Object.keys(val).length;
    else continue;
    if (!best || size > best.size) best = { name, size, val };
  }
  if (best) { log(`${label}: preferred names not found; falling back to "${best.name}" (${best.size})`); return best.val; }
  log(`WARN: ${label}: no suitable export found. Looked for: ${preferred.join(', ')}`);
  return undefined;
}

function uniqSorted(xs: Array<string | undefined | null>): string[] {
  return Array.from(new Set(xs.filter((x): x is string => typeof x === 'string' && x.length > 0))).sort();
}

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, file);
  fs.writeFileSync(p, JSON.stringify(data, null, process.env.WEB_DATA_MINIFY ? 0 : 2));
  const kb = (fs.statSync(p).size / 1024).toFixed(1);
  log(`wrote ${file} (${kb} KB)`);
}

// ---------------------------------------------------------------------------
// normalizers — map raw entries to the site's list/filter shape (+ raw)
// ---------------------------------------------------------------------------
function normSkill(s: Record<string, any>, kind: 'skill' | 'support') {
  const baseDamage = s.baseDamage && typeof s.baseDamage === 'object' ? s.baseDamage : undefined;
  return {
    id: s.id,
    name: s.name ?? s.id,
    kind,
    description: s.description ?? '',
    color: s.color ?? null,
    tags: Array.isArray(s.tags) ? s.tags : [],
    damageTypes: baseDamage ? Object.keys(baseDamage) : [],
    manaCost: s.manaCost ?? null,
    cooldown: s.cooldown ?? null,
    useTime: s.useTime ?? null,
    castMode: s.castMode ?? null,
    delivery: s.delivery?.type ?? null,
    requirements: s.requirements ?? null,
    monsterOnly: !!s.noDrop,
    raw: s,
  };
}

function normMonster(m: Record<string, any>) {
  const base = m.base && typeof m.base === 'object' ? m.base : {};
  return {
    id: m.id,
    name: m.name ?? m.id,
    color: m.color ?? null,
    shape: m.shape ?? null,
    material: m.material ?? null,
    faction: m.faction ?? null,
    tags: Array.isArray(m.tags) ? m.tags : (m.tag ? [m.tag] : []),
    aiType: m.brain?.type ?? null,
    life: base.life ?? null,
    moveSpeed: base.moveSpeed ?? null,
    xp: m.xp ?? null,
    skills: Array.isArray(m.skills) ? m.skills : [],
    boss: !!m.boss,
    raw: m,
  };
}

function normClass(c: Record<string, any>) {
  return {
    id: c.id,
    name: c.name ?? c.id,
    description: c.description ?? '',
    attributes: c.attributes ?? c.attrs ?? null,
    // A class's signature skills live in `bar` (its starting skill slots,
    // null = empty), not a `skills` field. Drop the empty slots.
    skills: Array.isArray(c.bar) ? c.bar.filter(Boolean)
          : (Array.isArray(c.skills) ? c.skills : []),
    start: c.start ?? c.startNode ?? null,
    raw: c,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  log(`root:   ${ROOT}`);
  log(`output: ${OUT}`);

  // pkg version for meta
  let version = '0.0.0';
  try { version = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version ?? version; }
  catch { log('WARN: could not read package.json version'); }

  // dynamic imports so a single missing module degrades gracefully
  const load = async (rel: string) => {
    // Node's ESM dynamic import() needs a file:// URL, not a raw OS path —
    // on Windows a joined path is "D:\..." which the loader rejects
    // ("Received protocol 'd:'"). pathToFileURL is correct on every platform.
    try { return await import(pathToFileURL(path.join(ROOT, rel)).href); }
    catch (e) { log(`WARN: could not import ${rel}:`, (e as Error).message); return {}; }
  };

  const skillsMod   = await load('src/data/skills.ts');
  const supportsMod = await load('src/data/supports.ts');
  const monstersMod = await load('src/data/monsters.ts');
  const passivesMod = await load('src/data/passives.ts');
  const classesMod  = await load('src/data/classes.ts');

  // ---- skills & supports -------------------------------------------------
  const skills = toList(pick(skillsMod, ['SKILLS', 'skills'], 'skills'), 'SKILLS')
    .map((s) => normSkill(s, 'skill'));
  const supports = toList(pick(supportsMod, ['SUPPORTS', 'SUPPORT_GEMS', 'supports'], 'supports'), 'SUPPORTS')
    .map((s) => normSkill(s, 'support'));

  // ---- monsters ----------------------------------------------------------
  const monsters = toList(pick(monstersMod, ['MONSTERS', 'monsters'], 'monsters'), 'MONSTERS')
    .map(normMonster);

  // ---- classes -----------------------------------------------------------
  const classes = toList(pick(classesMod, ['CLASSES', 'classes'], 'classes'), 'CLASSES')
    .map(normClass);

  // ---- passives (nodes + adjacency + per-class starts) -------------------
  const nodeRec = pick(passivesMod, ['PASSIVE_NODES', 'NODES', 'passiveNodes'], 'passives') as Record<string, any> | undefined;
  const nodes = toList(nodeRec, 'PASSIVE_NODES');
  let adjacency = pick(passivesMod, ['PASSIVE_ADJACENCY', 'ADJACENCY'], 'passiveAdjacency') as Record<string, string[]> | undefined;
  if (!adjacency) {
    // rebuild a bidirectional adjacency from node.links if the map isn't exported
    adjacency = {};
    for (const n of nodes) {
      const links: string[] = Array.isArray(n.links) ? n.links : [];
      for (const to of links) {
        (adjacency[n.id] ||= []).push(to);
        (adjacency[to] ||= []).push(n.id);
      }
    }
    for (const k of Object.keys(adjacency)) adjacency[k] = uniqSorted(adjacency[k]);
  }

  // per-class start nodes: try classStartNode(id), else class.start field
  const starts: Record<string, string | null> = {};
  const classStartNode = (passivesMod as any).classStartNode;
  for (const c of classes) {
    let start: string | null = c.start ?? null;
    if (!start && typeof classStartNode === 'function') {
      try { start = classStartNode(c.id) ?? null; } catch { /* ignore */ }
    }
    starts[c.id] = start;
  }

  const xs = nodes.map((n) => n.x).filter((v) => typeof v === 'number');
  const ys = nodes.map((n) => n.y).filter((v) => typeof v === 'number');
  const bounds = xs.length && ys.length
    ? { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
    : null;

  const passives = {
    nodes: nodes.map((n) => ({
      id: n.id, name: n.name ?? n.id, description: n.description ?? '',
      kind: n.kind ?? 'small', x: n.x ?? 0, y: n.y ?? 0,
      attributes: n.attributes ?? null, attributesPct: n.attributesPct ?? null,
      mods: n.mods ?? null, links: Array.isArray(n.links) ? n.links : [],
      realm: n.realm ?? null, vocation: n.vocation ?? null, choice: n.choice ?? null,
      raw: n,
    })),
    adjacency,
    starts,
    bounds,
  };

  // ---- meta (counts + filter facets) -------------------------------------
  const meta = {
    game: 'Hollow Wake',
    version,
    generatedAt: new Date().toISOString(),
    counts: {
      skills: skills.length,
      supports: supports.length,
      monsters: monsters.length,
      classes: classes.length,
      passives: passives.nodes.length,
    },
    facets: {
      skillTags: uniqSorted([...skills, ...supports].flatMap((s) => s.tags)),
      damageTypes: uniqSorted(skills.flatMap((s) => s.damageTypes)),
      castModes: uniqSorted(skills.map((s) => s.castMode)),
      deliveries: uniqSorted(skills.map((s) => s.delivery)),
      monsterFactions: uniqSorted(monsters.map((m) => m.faction)),
      monsterTags: uniqSorted(monsters.flatMap((m) => m.tags)),
      aiArchetypes: uniqSorted(monsters.map((m) => m.aiType)),
      passiveKinds: uniqSorted(passives.nodes.map((n) => n.kind)),
      realms: uniqSorted(passives.nodes.map((n) => n.realm)),
    },
  };

  // ---- write -------------------------------------------------------------
  writeJson('skills.json', skills);
  writeJson('supports.json', supports);
  writeJson('monsters.json', monsters);
  writeJson('classes.json', classes);
  writeJson('passives.json', passives);
  writeJson('meta.json', meta);

  log('counts:', JSON.stringify(meta.counts));
  if (!skills.length && !monsters.length) {
    log('ERROR: exported 0 skills and 0 monsters — check the import names above.');
    process.exit(1);
  }
  log('done.');
}

main().catch((e) => { log('FATAL', e); process.exit(1); });
