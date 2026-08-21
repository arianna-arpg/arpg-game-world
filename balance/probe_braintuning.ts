// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE BRAINTUNING CENSUS NET (backlog #212): BrainTuning
// (engine/brain.ts) is the axis bundle every layer of the composable AI
// speaks — presets, def-level axes, phases, script, rules, cycle — and its
// failure mode is SILENCE: someone adds an axis to the interface, authors
// values on defs, and either no engine code ever reads it or mergeTuning
// (a hand-rolled PER-AXIS fold) never folds it, so every layered author of
// it is dropped wholesale. A design no-op, invisible until a feel bug. This
// probe is probe_painterparams RIG D's enrolment-census law pointed at the
// brain: the interface enumerated from its own declaration, held complete
// both ways against a maintained consumer map, and the whole authored
// surface swept against the parsed shape.
//
// Pins:
//   A THE AXIS CENSUS, both ways: BrainTuning's fields are parsed from the
//     brain.ts source (so a NEW axis joins the census with no probe edit)
//     and set-compared against TUNING_CONSUMERS — an unmapped axis fails
//     with "name its consumer or retire it"; a stale map row fails too.
//     (TUNING_CONSUMERS is also typed Record<keyof BrainTuning, …>, so
//     `npm run check` fails at compile time; the source parse makes the
//     probe self-contained under tsx, which never type-checks.)
//   B THE CONSUMER PIN: every mapped axis names a live read-site and the
//     probe asserts the symbol still exists there. CHOICE, documented:
//     verification is grep-shaped (a regex over comment-stripped engine
//     source), not runtime-traced — the reads are scattered through
//     per-tick hot paths (updateAI and its helpers) where tracing every
//     axis would mean instrumenting the tick itself. Existence of the read
//     is the contract; behavior belongs to the feel probes. The map's
//     `{ dead: '…' }` rows are the adjudication ledger for axes found
//     consumer-less (the support-matrix idiom: named, dated, never
//     silently deleted) — the ledger ships EMPTY today and RIG B pins
//     that count, so parking an axis as dead is a deliberate, dated edit.
//   C THE MERGE LAW: mergeTuning folds layer.<axis> for EVERY census axis.
//     This is the mandatory consumer unique to this interface — an axis
//     missing from the fold is dropped even when authored directly,
//     because every def resolves through tuningOf → mergeTuning.
//   D THE AUTHORED SWEEP (the typo net): every brain the data ships —
//     MONSTERS defs (every MonsterDef field whose declared type mentions
//     BrainDef: brain, juvenileBrain, brainVariants[].brain — DISCOVERED
//     from the MonsterDef declaration, so a new brain seat auto-joins),
//     plus ARCHETYPES — walked against the parsed interfaces: unknown
//     keys fail, and BrainType-typed values must name a real ARCHETYPES
//     preset (tuningOf silently drops a typo'd preset — `as BrainTuning`
//     casts exist in the data, so tsc alone does not hold this line).
//     Grain cap, documented: fields typed as INLINE object literals
//     (encircle, dodge, muster, …) are leaves — their inner keys are not
//     swept; named-interface fields (MoveSpec, FlockSpec, BrainPhase, …)
//     recurse.
//   E THE USE-LAW COLLECTOR: independent of the typed walk, every object
//     under a property named `use` inside a shipped brain is checked as
//     BrainTuning — the vocabulary law ("every layer speaks this shape"),
//     so use-layers behind inline annotations (cycle[].use) and future
//     machine lanes are covered without enumeration. Action/payload lanes
//     (actions, onEnter, onExit, onDeath, drives, mods, tells, when) are
//     skipped: their vocabularies are open and a payload `use` key is not
//     a tuning.
//   F THE GATE FIRES (negative controls): a typo'd axis, a typo'd sub-key,
//     a typo'd preset and a phantom merge axis each produce exactly the
//     expected defect — and the real census stays clean beside them.
//
// Parser limits (accepted, guarded): comments are stripped textually, so a
// block-comment opener inside a string literal would confuse it — the RIG A
// canaries (registry size, known axes present) fail loud if parsing ever
// collapses rather than letting a broken parse read as an empty, passing
// census.
// Run: npx tsx balance/probe_braintuning.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARCHETYPES, type BrainTuning } from '../src/engine/brain';
import { MONSTERS } from '../src/data/monsters';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// ============================================================ the source parse
const here = dirname(fileURLToPath(import.meta.url));
const readSrc = (rel: string): string => readFileSync(join(here, rel), 'utf8');

/** Strip /* *\/ (newlines kept, so nothing shifts) and // comments — the
 *  census must never be satisfied, or confused, by prose. */
const stripComments = (src: string): string => src
  .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n]*/g, '');

/** Skip a quoted span; returns the index of the closing quote. */
const skipQuote = (src: string, at: number): number => {
  const q = src[at];
  for (let i = at + 1; i < src.length; i++) {
    if (src[i] === '\\') { i++; continue; }
    if (src[i] === q || src[i] === '\n') return i; // newline = broken quote, bail
  }
  return src.length;
};

/** Skip a template literal, honoring ${…} nesting. */
function skipTemplate(src: string, at: number): number {
  for (let i = at + 1; i < src.length; i++) {
    if (src[i] === '\\') { i++; continue; }
    if (src[i] === '`') return i;
    if (src[i] === '$' && src[i + 1] === '{') {
      const close = matchTopBrace(src, i + 1);
      if (close < 0) return src.length;
      i = close;
    }
  }
  return src.length;
}

/** From an opening '{', the index of its matching '}' — string-aware. */
function matchTopBrace(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "'" || c === '"') { i = skipQuote(src, i); continue; }
    if (c === '`') { i = skipTemplate(src, i); continue; }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return i;
  }
  return -1;
}

/** Split an interface body into field chunks on top-level ';'. */
const splitFields = (body: string): string[] => {
  const parts: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "'" || c === '"') { i = skipQuote(body, i); continue; }
    if (c === '`') { i = skipTemplate(body, i); continue; }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth = Math.max(0, depth - 1);
    else if (c === ';' && depth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
  }
  if (start < body.length) parts.push(body.slice(start));
  return parts;
};

interface ParsedIface { ext?: string; fields: Map<string, string> }

/** Every `interface Name [extends Base] { … }` in (comment-stripped) source:
 *  name → { extends, field → annotation text }. Depth-1 fields only — a
 *  nested inline object's keys never leak into its parent. */
const parseInterfaces = (src: string): Map<string, ParsedIface> => {
  const out = new Map<string, ParsedIface>();
  const re = /(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)(?:\s+extends\s+([A-Za-z_$][\w$.]*))?\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const open = re.lastIndex - 1;
    const close = matchTopBrace(src, open);
    if (close < 0) continue;
    const fields = new Map<string, string>();
    for (const chunk of splitFields(src.slice(open + 1, close))) {
      const f = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\??\s*:\s*([\s\S]*)$/.exec(chunk.trim());
      if (f) fields.set(f[1], f[2].trim());
    }
    out.set(m[1], { ext: m[2], fields });
    re.lastIndex = close + 1;
  }
  return out;
};

const brainSrc = stripComments(readSrc('../src/engine/brain.ts'));
const aiSrc = stripComments(readSrc('../src/engine/ai.ts'));
const monSrc = stripComments(readSrc('../src/data/monsters.ts'));

// brain.ts wins any name collision (it is the vocabulary's home).
const reg = new Map<string, ParsedIface>([...parseInterfaces(monSrc), ...parseInterfaces(brainSrc)]);

/** Fields of an interface with its extends chain resolved (base first). */
const fieldsOf = (name: string): Map<string, string> => {
  const chain: ParsedIface[] = [];
  let cur = reg.get(name);
  for (let hop = 0; cur && hop < 8; hop++) { chain.push(cur); cur = cur.ext ? reg.get(cur.ext) : undefined; }
  const out = new Map<string, string>();
  for (const layer of chain.reverse()) for (const [k, v] of layer.fields) out.set(k, v);
  return out;
};

/** Leading named type of an annotation ('MoveSpec | null' → MoveSpec);
 *  inline object / tuple / literal annotations have none (leaves). */
const headTokenOf = (ann: string): string | undefined =>
  /^([A-Za-z_$][\w$]*)/.exec(ann)?.[1];

// ================================================== the maintained consumer map
type AxisKey = keyof BrainTuning;
/** The default read-site: updateAI's resolved-tuning idiom in ai.ts. */
const ENGINE_READ = 'engine-read';
type ReadSite = { file: string; pattern: string };
type Consumer = typeof ENGINE_READ | ReadSite[] | { dead: string };

/**
 * THE MAP — one row per axis, naming where the engine READS it. 'engine-read'
 * = `tuning.<axis>` in src/engine/ai.ts (the resolved-tuning read every axis
 * uses today); explicit ReadSite rows take over when a consumer lives
 * elsewhere; `{ dead: 'adjudicated YYYY-MM-DD: …' }` parks a consumer-less
 * axis LOUDLY instead of deleting it (her call owed — see RIG B).
 * Typed total over keyof BrainTuning: adding an axis without a row is a
 * compile error in `npm run check`, and RIG A fails the same drift at
 * runtime off the parsed declaration.
 */
const TUNING_CONSUMERS: Record<AxisKey, Consumer> = {
  type: ENGINE_READ,        // the flee-disposition gate + squad-idle read; tuningOf resolves the preset
  move: ENGINE_READ,        // pathing/hazards stamps + the locomotion kernels
  target: ENGINE_READ,      // threat decay, acquisition, prey stamp
  perception: ENGINE_READ,  // detect/alert reads (+ brain.ts alertScale)
  skillUse: ENGINE_READ,    // cast cadence/policy reads
  morale: ENGINE_READ,      // updateMorale's whole spec read
  squad: ENGINE_READ,       // muster/idle/lead reads
  tempo: ENGINE_READ,       // the kite-budget + duty-cycle stamps
  behavior: ENGINE_READ,    // aim/encircle/dodge/flock reads
  obedience: ENGINE_READ,   // the aiObedience stamp the command roll reads
};

// ============================================================ A the axis census
{
  check('A canary: brain.ts interfaces parsed', reg.has('BrainTuning') && reg.has('BrainDef') && reg.size >= 20,
    `${reg.size} interface(s)`); // 37 measured 2026-08-20 — a collapse below 20 is a broken parse, not a refactor
  const axes = [...fieldsOf('BrainTuning').keys()];
  check('A canary: the census reads like the axis bundle', axes.includes('move') && axes.includes('behavior') && axes.length >= 8,
    axes.join(', '));

  const mapped = Object.keys(TUNING_CONSUMERS);
  const unmapped = axes.filter(a => !mapped.includes(a));
  check("A census: every declared axis has a TUNING_CONSUMERS row (unmapped = name its consumer or retire the axis)",
    unmapped.length === 0, unmapped.join(', '));
  const stale = mapped.filter(a => !axes.includes(a));
  check('A census: no map row outlives its axis (0 stale)', stale.length === 0, stale.join(', '));
}

// =========================================================== B the consumer pin
{
  const srcOf = new Map<string, string>([
    ['src/engine/ai.ts', aiSrc], ['src/engine/brain.ts', brainSrc],
  ]);
  const missing: string[] = [];
  const dead: string[] = [];
  for (const [axis, row] of Object.entries(TUNING_CONSUMERS)) {
    if (typeof row === 'object' && !Array.isArray(row)) {
      dead.push(axis);
      console.log(`      DEAD AXIS (adjudicated, not gated): ${axis} — ${row.dead}`);
      continue;
    }
    const sites: ReadSite[] = row === ENGINE_READ
      ? [{ file: 'src/engine/ai.ts', pattern: `\\btuning\\.${axis}\\b` }] : row;
    for (const site of sites) {
      const text = srcOf.get(site.file) ?? stripComments(readSrc('../' + site.file));
      srcOf.set(site.file, text);
      if (!new RegExp(site.pattern).test(text)) {
        missing.push(`${axis}: ${site.file} no longer matches /${site.pattern}/`);
      }
    }
  }
  check('B consumers: every mapped read-site still exists (re-point the row or retire the axis)',
    missing.length === 0, missing.join('; '));
  // Moving an axis onto the dead ledger is an ADJUDICATION — date it in the
  // row, report it in the pass file, and move this pin WITH it, deliberately.
  check('B ledger: no axis rides the dead ledger today (all consumers live)', dead.length === 0, dead.join(', '));
}

// ============================================================== C the merge law
{
  const at = brainSrc.indexOf('function mergeTuning');
  const open = at >= 0 ? brainSrc.indexOf('{', at) : -1;
  const close = open >= 0 ? matchTopBrace(brainSrc, open) : -1;
  const body = close > open ? brainSrc.slice(open, close) : '';
  check('C canary: mergeTuning found and bodied', body.length > 100, `${body.length} chars`);
  const axes = [...fieldsOf('BrainTuning').keys()];
  const unfolded = axes.filter(a => !new RegExp(`\\blayer\\.${a}\\b`).test(body));
  check('C merge law: every axis folds through mergeTuning (an unfolded axis is dropped by every layered author)',
    unfolded.length === 0, unfolded.join(', '));
  check('C control: the detector detects (a phantom axis reads unfolded)',
    !new RegExp('\\blayer\\.phantomAxis\\b').test(body));
}

// ============================================= D + E the authored sweep (typo net)
/** One sweep context: typed recursion + the use-law collector, one sink. */
const makeSweeper = () => {
  const defects: string[] = [];
  const seen = new Set<string>();
  const flag = (d: string): void => { if (!seen.has(d)) { seen.add(d); defects.push(d); } };
  const stats = { objects: 0, keys: 0, useSeats: 0 };
  const sweep = (value: unknown, iface: string, at: string): void => {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach((v, i) => sweep(v, iface, `${at}[${i}]`)); return; }
    stats.objects++;
    const fields = fieldsOf(iface);
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      stats.keys++;
      const ann = fields.get(k);
      if (ann === undefined) { flag(`${at}.${k}: not a field of ${iface}`); continue; }
      const head = headTokenOf(ann);
      if (!head) continue; // inline object / tuple / literal type — a leaf (the grain cap)
      if (head === 'BrainType') {
        if (typeof v === 'string' && !(v in ARCHETYPES)) flag(`${at}.${k}: '${v}' is not an ARCHETYPES preset`);
        continue;
      }
      if (reg.has(head) && v !== null && typeof v === 'object') sweep(v, head, `${at}.${k}`);
    }
  };
  // Payload lanes whose vocabularies are open — a `use` key there is not a tuning.
  const USE_SKIP = new Set(['actions', 'onEnter', 'onExit', 'onDeath', 'drives', 'mods', 'tells', 'when']);
  const collectUse = (node: unknown, at: string): void => {
    if (node === null || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => collectUse(v, `${at}[${i}]`)); return; }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (USE_SKIP.has(k)) continue;
      if (k === 'use' && v !== null && typeof v === 'object' && !Array.isArray(v)) {
        stats.useSeats++;
        sweep(v, 'BrainTuning', `${at}.use`);
      } else collectUse(v, `${at}.${k}`);
    }
  };
  return { defects, stats, sweep, collectUse };
};

{
  // The brain seats on MonsterDef, DISCOVERED from its declaration: every
  // field whose annotation mentions BrainDef. Direct fields hold the def;
  // indirect ones (brainVariants) hold wrappers whose `.brain` is the def.
  const monFields = fieldsOf('MonsterDef');
  const seats: { key: string; direct: boolean }[] = [];
  for (const [k, ann] of monFields) {
    if (/\bBrainDef\b/.test(ann)) seats.push({ key: k, direct: /^BrainDef\b/.test(ann) });
  }
  const seatKeys = seats.map(s => s.key);
  check('D canary: the brain seats discovered off MonsterDef (brain / juvenileBrain / brainVariants ⊆)',
    ['brain', 'juvenileBrain', 'brainVariants'].every(k => seatKeys.includes(k)), seatKeys.join(', '));

  const sw = makeSweeper();
  let defsWithBrains = 0, brainCount = 0;
  const collectBrains = (v: unknown, out: object[]): void => {
    if (v === null || typeof v !== 'object') return;
    if (Array.isArray(v)) { for (const e of v) collectBrains(e, out); return; }
    const b = (v as Record<string, unknown>).brain;
    if (b !== null && typeof b === 'object') out.push(b as object);
  };
  for (const [id, def] of Object.entries(MONSTERS)) {
    const rec = def as unknown as Record<string, unknown>;
    let any = false;
    for (const seat of seats) {
      const v = rec[seat.key];
      if (v === null || v === undefined || typeof v !== 'object') continue;
      const brains: object[] = [];
      if (seat.direct) brains.push(v as object);
      else {
        collectBrains(v, brains);
        // A BrainDef-mentioning seat that yields no brain from a non-empty
        // value is a NEW SHAPE the collector cannot see — teach the sweep.
        if (!brains.length) sw.defects.push(`${id}.${seat.key}: BrainDef-typed seat with an unrecognized shape — teach the sweep`);
      }
      for (const [i, b] of brains.entries()) {
        any = true; brainCount++;
        const at = `${id}.${seat.key}${seat.direct ? '' : `[${i}]`}`;
        sw.sweep(b, 'BrainDef', at);
        sw.collectUse(b, at);
      }
    }
    if (any) defsWithBrains++;
  }
  for (const [t, tun] of Object.entries(ARCHETYPES)) sw.sweep(tun, 'BrainTuning', `ARCHETYPES.${t}`);

  check('D sweep: every authored brain key exists on the parsed shape, every preset name is real (0 defects)',
    sw.defects.length === 0, sw.defects.slice(0, 8).join('; '));
  // Floors at ~half of measured (858 defs / 102 seats, 2026-08-20): content
  // only grows — a fall below these means the discovery went silently empty.
  check('D sweep: the census actually swept the bestiary', defsWithBrains >= 400 && brainCount >= defsWithBrains,
    `${defsWithBrains} def(s), ${brainCount} brain(s), ${sw.stats.objects} object(s), ${sw.stats.keys} key(s)`);
  check('E use law: the collector reached the machine layers (phases/script/rules/cycle use seats)',
    sw.stats.useSeats >= 50, `${sw.stats.useSeats} use seat(s)`);
}

// ==================================================== F the gate fires (controls)
{
  const bad = makeSweeper();
  bad.sweep({ mvoe: { style: 'hold' } }, 'BrainTuning', 'F1');
  check('F the gate FIRES on a typo\'d axis', bad.defects.length === 1 && bad.defects[0].includes('mvoe'),
    bad.defects.join('; '));

  const sub = makeSweeper();
  sub.sweep({ move: { styel: 'hold' } }, 'BrainTuning', 'F2');
  check('F the gate FIRES on a typo\'d sub-key (the `as BrainTuning` cast hole)',
    sub.defects.length === 1 && sub.defects[0].includes('styel'), sub.defects.join('; '));

  const typo = makeSweeper();
  typo.sweep({ type: 'jugernaut' }, 'BrainTuning', 'F3');
  check('F the gate FIRES on a typo\'d preset (tuningOf would drop it silently)',
    typo.defects.length === 1 && typo.defects[0].includes('jugernaut'), typo.defects.join('; '));

  const clean = makeSweeper();
  clean.sweep({ type: 'pack', move: { style: 'direct', closeFrac: 0.8 }, tempo: null }, 'BrainTuning', 'F4');
  check('F control: a lawful tuning (null axis included) sweeps clean', clean.defects.length === 0,
    clean.defects.join('; '));

  const useLane = makeSweeper();
  useLane.collectUse({ cycle: [{ use: { mvoe: {} }, for: [1, 2] }] }, 'F5');
  check('F the use-law collector reaches an inline-annotated lane (cycle[].use)',
    useLane.stats.useSeats === 1 && useLane.defects.length === 1 && useLane.defects[0].includes('mvoe'),
    useLane.defects.join('; '));

  // The census direction itself: a NEW axis parsed off a declaration with no
  // TUNING_CONSUMERS row must read unmapped — RIG A's failure lane, proven
  // without touching the real declaration.
  const synth = parseInterfaces(stripComments(
    'export interface BrainTuning { move?: MoveSpec | null; phantomAxis?: number; }'));
  const synthAxes = [...(synth.get('BrainTuning')?.fields.keys() ?? [])];
  const unmappedSynth = synthAxes.filter(a => !(a in TUNING_CONSUMERS));
  check('F the census FIRES on a new axis (parsed, unmapped → name its consumer or retire it)',
    synthAxes.length === 2 && unmappedSynth.length === 1 && unmappedSynth[0] === 'phantomAxis',
    `parsed [${synthAxes.join(', ')}], unmapped [${unmappedSynth.join(', ')}]`);
}

console.log(failed === 0 ? '\nprobe_braintuning: ALL GREEN' : `\nprobe_braintuning: ${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
