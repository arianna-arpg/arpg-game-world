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

/** id → display name fallback when no authored title exists ('hell_steppes' →
 *  'Hell Steppes', keeping connectives low: 'river_of_flame' → 'River of Flame'). */
const LOWER_WORDS = new Set(['of', 'the', 'and', 'in', 'to', 'a', 'on']);
function titleize(id: string): string {
  return String(id).split(/[_\s]+/).map((w, i) =>
    (i > 0 && LOWER_WORDS.has(w)) ? w : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}

/** Star-point prefix (a class's startNode 'str_start') → the attribute it
 *  anchors. The 27-class roster seats exactly three classes on each point, so
 *  this is the honest, data-derived "role" badge — no hand-authored roles. */
const ATTR_LABEL: Record<string, string> = {
  str: 'Strength', prw: 'Prowess', for: 'Fortitude', dex: 'Dexterity',
  fin: 'Finesse', cha: 'Charisma', int: 'Intelligence', wis: 'Wisdom',
  wil: 'Willpower', vit: 'Vitality',
};
function classPrimary(c: Record<string, any>): string | null {
  const node = String(c.startNode ?? c.start ?? '');
  const m = /^([a-z]+)_start$/.exec(node);
  if (m && ATTR_LABEL[m[1]]) return ATTR_LABEL[m[1]];
  // fallback: the tallest attribute in the spread (vitality is the shared pool)
  let best: string | null = null, bestV = -Infinity;
  for (const [k, v] of Object.entries(c.attributes ?? {})) {
    if (k === 'vitality' || typeof v !== 'number') continue;
    if (v > bestV) { bestV = v; best = k; }
  }
  return best ? best.charAt(0).toUpperCase() + best.slice(1) : null;
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
    color: c.color ?? null,
    // The star-point the class anchors, surfaced as its "role" badge on the site.
    primary: classPrimary(c),
    look: c.look ?? null,
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
// biome normalizer — a tileset is a BIOME the frontier grows. We emit the
// facts that drive the site's biome showcase: the accent that colours the
// card, the authored title + blurb (BIOME_LORE), whether it's common frontier
// terrain or a landmark set-piece, and the "living fabrics" (fog/creep/…) that
// make each hover surface a DIFFERENT set of facts — the variety the showcase
// is built on. No `raw`: tilesets carry huge pack tables the site never needs.
// ---------------------------------------------------------------------------
function normBiome(t: Record<string, any>, lore: Record<string, any>) {
  const theme = t.theme && typeof t.theme === 'object' ? t.theme : {};
  const l = (lore && lore[t.id]) || {};
  const fabrics: string[] = [];
  if (theme.fog) fabrics.push('living fog');
  if (theme.creep) fabrics.push('creep');
  if (theme.collapse) fabrics.push('collapsing ground');
  if (theme.flux) fabrics.push('shifting ground');
  if (theme.understory) fabrics.push('open sky');
  if (t.boundless) fabrics.push('boundless');
  const ambientFx = Array.isArray(theme.ambientFx)
    ? uniqSorted(theme.ambientFx.map((f: any) => f && f.kind)) : [];
  return {
    id: t.id,
    title: l.title || titleize(t.id),
    blurb: l.blurb || '',
    accent: (typeof theme.accent === 'string' && theme.accent) ? theme.accent : null,
    biomeTag: t.biome ?? null,
    // false = a landmark / realm set-piece reached through a specific event,
    // not common terrain you roll into at a frontier portal.
    frontier: t.frontier !== false,
    variants: Array.isArray(t.variants) ? t.variants.length : 0,
    objectives: Array.isArray(t.objectives) ? uniqSorted(t.objectives.map((o: any) => o && o.kind)) : [],
    fabrics,
    ambientFx,
  };
}

// ---------------------------------------------------------------------------
// event normalizer — a ContentPackage is a world-event overlay. label/blurb/
// color already live on the def (it's the same data the Vault + Expedition
// screens read), so this is mostly a projection + a couple of derived facets
// (its unlock line, whether it's an always-on substrate or a place, how many
// factions/encounters it fields) that let each card's hover read differently.
// ---------------------------------------------------------------------------
function normEvent(p: Record<string, any>) {
  const world = p.world && typeof p.world === 'object' ? p.world : {};
  const kind = p.alwaysOn ? 'substrate' : p.pressureless ? 'place' : 'event';
  return {
    id: p.id,
    name: p.label ?? p.id,
    blurb: p.blurb ?? '',
    color: (typeof p.color === 'string' && p.color) ? p.color : null,
    kind,
    alwaysOn: !!p.alwaysOn,
    pressureless: !!p.pressureless,
    defaultEnabled: !!p.defaultEnabled,
    unlock: p.unlock?.label ?? null,
    modifiers: Array.isArray(p.modifiers)
      ? p.modifiers.map((m: any) => ({ label: m.label, kind: m.kind, min: m.min, max: m.max })) : [],
    factions: Array.isArray(p.factions) ? p.factions.map((f: any) => f?.name ?? f?.id).filter(Boolean) : [],
    encounters: Array.isArray(p.encounters) ? p.encounters.length : 0,
    holdfasts: Array.isArray(p.holdfasts) ? p.holdfasts.length : 0,
    dimensions: Array.isArray(world.dimensions) ? world.dimensions : [],
    tiers: Array.isArray(p.tiers) ? p.tiers.length : 0,
  };
}

// ---------------------------------------------------------------------------
// unique-item normalizer — reuses the ENGINE's own line describers so a
// unique's tooltip text on the site is identical to what the game shows.
// A unique line is {stat, kind, range:[lo,hi], local?, when?, tags?}; we
// render the full [min–max] roll range (more evocative than a single roll).
// ---------------------------------------------------------------------------
function rangeLine(line: Record<string, any>, fmt: Record<string, any>): Record<string, any> {
  const lo = line.range?.[0] ?? line.value ?? 0;
  const hi = line.range?.[1] ?? line.value ?? lo;
  const aLo = Math.abs(lo), aHi = Math.abs(hi);
  const smallAbs = Math.min(aLo, aHi), bigAbs = Math.max(aLo, aHi);
  const signed = (lo + hi) < 0 ? -bigAbs : bigAbs;   // representative value → right +/−, increased/reduced
  let text: string;
  if (typeof fmt.formatModLine !== 'function') {
    text = `${line.stat} ${lo}..${hi}`;              // degrade gracefully if the describer isn't importable
  } else if (lo === hi) {
    text = fmt.formatModLine(line, hi);
  } else {
    // formatModLine renders a 'link' value with kind 'more' (as a %) and an
    // 'override' with 'flat' — format the endpoints the SAME way, or the splice
    // below won't match (a link range would collapse to a single value).
    const vkind = line.kind === 'link' ? 'more' : line.kind === 'override' ? 'flat' : line.kind;
    const full = fmt.formatModLine(line, signed);     // e.g. "+7 Fire Damage"
    const bigStr = fmt.formatStatValue(line.stat, vkind, bigAbs);
    const smallStr = fmt.formatStatValue(line.stat, vkind, smallAbs);
    text = full.replace(bigStr, `${smallStr}–${bigStr}`); // "+4–7 Fire Damage"
  }
  return {
    text, stat: line.stat, kind: line.kind, min: lo, max: hi,
    local: !!line.local, when: line.when ?? null,
    tags: Array.isArray(line.tags) ? line.tags : null,
  };
}

function normUnique(u: Record<string, any>, bases: Record<string, any>, fmt: Record<string, any>) {
  const base = bases?.[u.baseId];
  return {
    id: u.id, name: u.name ?? u.id, kind: 'unique',
    baseId: u.baseId ?? null, baseName: base?.name ?? u.baseId ?? null,
    category: base?.category ?? null,
    flavor: u.flavor ?? '', minIlvl: u.minIlvl ?? null,
    mods: Array.isArray(u.lines) ? u.lines.map((ln: any) => rangeLine(ln, fmt)) : [],
    raw: u,
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
  const uniquesMod  = await load('src/data/uniques.ts');
  const basesMod    = await load('src/data/itembases.ts');
  const tilesetsMod = await load('src/data/tilesets.ts');   // TILESETS + BIOME_LORE
  const packagesMod = await load('src/packages/registry.ts'); // PACKAGES (world-events)
  const vocationsMod = await load('src/data/vocations.ts');  // VOCATIONS (count only)
  const itemsFmt    = await load('src/engine/items.ts');   // formatModLine / formatStatValue / statLabel
  // status.ts registers the generated apply_/damageVs_/minionApply_<status>
  // stat families into the shared STAT_DEFS at load — import it (side effect
  // only) so those unique lines get real labels instead of raw stat ids.
  await load('src/engine/status.ts');

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

  // ---- biomes (tilesets the frontier grows) + their lore -----------------
  const biomeLore = (tilesetsMod as any).BIOME_LORE ?? {};
  const biomes = toList(pick(tilesetsMod, ['TILESETS', 'tilesets'], 'tilesets'), 'TILESETS')
    .map((t) => normBiome(t, biomeLore))
    .sort((a, b) => a.title.localeCompare(b.title));

  // ---- world-events (content packages) -----------------------------------
  const events = toList(pick(packagesMod, ['PACKAGES', 'packages'], 'packages'), 'PACKAGES')
    .map(normEvent);
  const vocationCount = Object.keys(
    (pick(vocationsMod, ['VOCATIONS', 'vocations'], 'vocations') as Record<string, any>) ?? {}).length;
  // base factions (packages graft more at runtime) — for the "N factions war
  // over ground" line, read off the same monsters module already loaded.
  const factionCount = Object.keys(((monstersMod as any).FACTIONS ?? {}) as Record<string, any>).length;

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

  // ---- uniques (named legendary items — the showcase headline) -----------
  const itemBases = (pick(basesMod, ['ITEM_BASES'], 'itemBases') ?? {}) as Record<string, any>;
  const uniques = toList(pick(uniquesMod, ['UNIQUE_LIST', 'UNIQUES', 'uniques'], 'uniques'), 'UNIQUES')
    .map((u) => normUnique(u, itemBases, itemsFmt));

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
      uniques: uniques.length,
      biomes: biomes.length,
      events: events.length,
      vocations: vocationCount,
      factions: factionCount,
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
  writeJson('uniques.json', uniques);
  writeJson('biomes.json', biomes);
  writeJson('events.json', events);
  writeJson('meta.json', meta);

  log('counts:', JSON.stringify(meta.counts));

  // ---- QA pass -----------------------------------------------------------
  // The export doubles as a content check: every biome card on the site is
  // driven by an accent colour + an authored blurb, so a biome missing either
  // would render a colourless / empty card. Flag them here rather than let a
  // silent gap ship. (Lore key drift is caught by BIOME_LORE_GAPS at source.)
  const gaps = typeof (tilesetsMod as any).BIOME_LORE_GAPS === 'function'
    ? (tilesetsMod as any).BIOME_LORE_GAPS() as { missingLore: string[]; orphanLore: string[] }
    : { missingLore: [], orphanLore: [] };
  const noAccent = biomes.filter((b) => !b.accent).map((b) => b.id);
  const noBlurb  = biomes.filter((b) => !b.blurb).map((b) => b.id);
  const noColorEvents = events.filter((e) => !e.color).map((e) => e.id);
  let qaFail = false;
  if (gaps.missingLore.length) { qaFail = true; log(`QA: ${gaps.missingLore.length} tileset(s) with NO biome lore:`, gaps.missingLore.join(', ')); }
  if (gaps.orphanLore.length)  { log(`QA: ${gaps.orphanLore.length} biome-lore key(s) point at no tileset:`, gaps.orphanLore.join(', ')); }
  if (noAccent.length) { qaFail = true; log(`QA: ${noAccent.length} biome(s) with NO accent colour (card indicator):`, noAccent.join(', ')); }
  if (noBlurb.length)  { qaFail = true; log(`QA: ${noBlurb.length} biome(s) with NO blurb:`, noBlurb.join(', ')); }
  if (noColorEvents.length) { log(`QA: ${noColorEvents.length} event(s) with no accent colour (card falls back to neutral):`, noColorEvents.join(', ')); }
  if (!qaFail) log('QA: biomes all have accent + blurb, lore keys in sync. OK');

  if (!skills.length && !monsters.length) {
    log('ERROR: exported 0 skills and 0 monsters — check the import names above.');
    process.exit(1);
  }
  if (qaFail && process.env.WEB_DATA_STRICT) {
    log('ERROR: QA gaps above and WEB_DATA_STRICT set — failing.');
    process.exit(1);
  }
  log('done.');
}

main().catch((e) => { log('FATAL', e); process.exit(1); });
