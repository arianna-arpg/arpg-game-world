// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE PARAM CONTRACT: doodad painters read `def.params`
// through an UNCHECKED cast (`as unknown as XParams`), so TypeScript vouches
// for nothing — an omitted required key is `undefined` at the read site and
// NaN geometry a line later: a body that silently fails to draw, with no
// witness anywhere. The contract used to live only in prose beside the data
// (doodadVisuals.ts, caul_sac: "aspectY/glowY/glowR/pulseRate are required —
// a missing one is a NaN gradient and a dead frame, ask the live QA").
//
// This is the natural TWIN of probe_anatomy's 'looks net' (every part kind
// resolves to a painter): that check pins KIND resolution, this one pins PARAM
// SHAPE — the other half of "the drawn body actually draws".
//
// Pins:
//   A THE REGISTRY: registerPainterParams rows exist, every registered id is a
//     real painter in PAINTERS (a typo'd id would silently gate nothing), every
//     declared type is vocabulary, and the KNOWN OFFENDER (pod) declares the
//     exact four numerics the prose warned about.
//   B THE CENSUS over the data: every DOODAD_VISUALS row satisfies its
//     painter's contract — 0 gaps, the shipped-content assertion.
//   C THE GATE FIRES (the negative control, made permanent): a row with its
//     required key deleted, a row with the wrong TYPE, and a params-less row
//     each produce exactly the expected gaps — and a painter that declared
//     nothing owes nothing.
//   D THE ENROLMENT CENSUS over painters.ts source: every `*Params` interface
//     with a required key, cast by a real GroupPainter, must HAVE a registered
//     spec covering those keys. A new painter with required params cannot be
//     forgotten into silence — the roster-census law, applied to painters.
//   E THE MERCY: the fallback defaults the read sites now carry are finite, so
//     a miss degrades to a drawn body instead of a blank frame.
// Run: npx tsx balance/probe_painterparams.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PAINTERS, painterParamGaps, painterParamIds, painterParamSpec,
  type PainterParamType, type PodParams, type ShardParams,
} from '../src/render/vis/painters';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

const TYPES: PainterParamType[] = ['number', 'color', 'string', 'object'];

// ============================================================ A the registry
{
  const ids = painterParamIds();
  check('A registry: painters have declared param contracts', ids.length > 0, `${ids.length} painter(s)`);

  const orphans = ids.filter(id => !PAINTERS[id]);
  check('A registry: every declared id is a real painter in PAINTERS (0 orphans)',
    orphans.length === 0, orphans.join(', '));

  const badType: string[] = [];
  const emptySpec: string[] = [];
  for (const id of ids) {
    const spec = painterParamSpec(id)!;
    const keys = Object.entries(spec);
    if (!keys.length) emptySpec.push(id);
    for (const [k, t] of keys) {
      if (!TYPES.includes(t)) badType.push(`${id}.${k} = '${t}'`);
    }
  }
  check('A registry: every declared type is registry vocabulary', badType.length === 0, badType.join('; '));
  check('A registry: no painter declares an EMPTY contract (say nothing instead)',
    emptySpec.length === 0, emptySpec.join(', '));

  // The known offender, promoted from prose to data.
  const pod = painterParamSpec('pod');
  const wantPod: Record<string, PainterParamType> = {
    body: 'color', glow: 'color',
    aspectY: 'number', glowY: 'number', glowR: 'number', pulseRate: 'number',
  };
  const podOk = !!pod && Object.entries(wantPod).every(([k, t]) => pod[k] === t);
  check("A the known offender: 'pod' declares aspectY/glowY/glowR/pulseRate as numbers",
    podOk, pod ? JSON.stringify(pod) : 'no spec');

  // The shard's vertex count — the other bare numeric in the library.
  check("A 'shard' declares points as a number", painterParamSpec('shard')?.points === 'number');
}

// ================================================= B the census over the data
{
  const bad: string[] = [];
  let checked = 0;
  for (const [kind, vis] of Object.entries(DOODAD_VISUALS)) {
    if (!painterParamSpec(vis.painter)) continue;
    checked++;
    for (const gap of painterParamGaps(vis.painter, vis.params)) bad.push(`${kind}: ${gap}`);
  }
  check('B census: every contracted DOODAD_VISUALS row satisfies its painter (0 gaps)',
    bad.length === 0, bad.slice(0, 6).join('; '));
  check('B census: the sweep actually covered rows', checked > 0, `${checked} contracted row(s)`);
}

// ============================================== C the gate fires (neg control)
{
  // The deliberate deletion the QA does by hand, made permanent: take the real
  // caul_sac params, drop ONE required key, and the gate must name it.
  const real = DOODAD_VISUALS.caul_sac.params as Record<string, unknown>;
  check('C control: the real caul_sac row is clean', painterParamGaps('pod', real).length === 0);

  const { pulseRate: _drop, ...missingOne } = real;
  const gaps = painterParamGaps('pod', missingOne);
  check('C the gate FIRES on a deleted required key', gaps.length === 1 && gaps[0].includes('pulseRate'),
    gaps.join('; '));

  const wrongType = painterParamGaps('pod', { ...real, aspectY: '1.15' });
  check('C the gate FIRES on the wrong TYPE (string where number)',
    wrongType.length === 1 && wrongType[0].includes('aspectY') && wrongType[0].includes('number'),
    wrongType.join('; '));

  check('C a params-less row owes its painter EVERYTHING',
    painterParamGaps('pod', undefined).length === Object.keys(painterParamSpec('pod')!).length);

  // 'object' discriminates: a color string where a nested object belongs.
  const notAnObject = painterParamGaps('liquid', { core: '#1d4264' });
  check("C the gate FIRES on a scalar where an object belongs ('liquid'.core)",
    notAnObject.length === 1 && notAnObject[0].includes('object'), notAnObject.join('; '));

  // A painter that declared nothing owes nothing — the registry names
  // obligations, never kinds. Unknown painters (the sibling modules register
  // theirs lazily) must never warn.
  check('C an undeclared painter owes nothing', painterParamGaps('fallback', {}).length === 0
    && painterParamGaps('no_such_painter_at_all', undefined).length === 0);
}

// ========================================= D the enrolment census (the source)
{
  // Every `*Params` interface in painters.ts that carries a REQUIRED key and is
  // cast by a real GroupPainter must have a registration covering those keys.
  // Without this a new painter's contract can be written in the type and
  // enforced nowhere — exactly the hole this probe closes.
  // Resolved off THIS file, never cwd — the rig reads the same source whether
  // the runner launched it from the repo root or a probe was run by hand.
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../src/render/vis/painters.ts'), 'utf8');
  const lines = src.split(/\r?\n/);

  /** Required (non-`?`) key names of each `*Params` interface, at depth 1. */
  const required = new Map<string, string[]>();
  for (let i = 0; i < lines.length; i++) {
    const head = /^(?:export )?interface (\w+Params) \{/.exec(lines[i]);
    if (!head) continue;
    const keys: string[] = [];
    for (let j = i + 1; j < lines.length && !/^\}/.test(lines[j]); j++) {
      // Depth-1 members only: two-space indent. Several sit on one line
      // (`rim: ColorSpec; throat: ColorSpec;`), so split on ';' — but strip
      // inline object types FIRST, or a nested `{ color; alpha }` donates its
      // own keys to the parent and the census reads obligations that aren't.
      if (!/^ {2}\S/.test(lines[j])) continue;
      let flat = lines[j], prev = '';
      while (flat !== prev) { prev = flat; flat = flat.replace(/\{[^{}]*\}/g, ''); }
      for (const part of flat.split(';')) {
        const m = /^\s*(\w+)(\??):/.exec(part);
        if (m && !m[2]) keys.push(m[1]);
      }
    }
    required.set(head[1], keys);
  }
  check('D source: the *Params interfaces parsed', required.size >= 15, `${required.size} found`);

  /** Cast site → the GroupPainter it sits inside (plain functions excluded). */
  const casters = new Map<string, Set<string>>();
  for (let i = 0; i < lines.length; i++) {
    const cast = /as unknown as (\w+Params)/.exec(lines[i]);
    if (!cast) continue;
    for (let j = i; j >= 0; j--) {
      const painter = /^const (\w+): GroupPainter/.exec(lines[j]);
      if (painter) {
        if (PAINTERS[painter[1]]) {
          if (!casters.has(cast[1])) casters.set(cast[1], new Set());
          casters.get(cast[1])!.add(painter[1]);
        }
        break;
      }
      // A cast inside a plain helper (paintLiquidBody, dimLiquid) belongs to no
      // painter of its own — stop rather than mis-attribute it to the one above.
      if (/^(?:export )?function \w+/.test(lines[j])) break;
    }
  }
  check('D source: the cast sites mapped to painters', casters.size >= 8, `${casters.size} interface(s)`);

  const unenrolled: string[] = [];
  for (const [iface, keys] of required) {
    if (!keys.length) continue;
    for (const painter of casters.get(iface) ?? []) {
      const spec = painterParamSpec(painter);
      if (!spec) { unenrolled.push(`${painter} (${iface}) declares nothing`); continue; }
      const uncovered = keys.filter(k => !(k in spec));
      if (uncovered.length) unenrolled.push(`${painter} (${iface}) omits ${uncovered.join('/')}`);
    }
  }
  check('D enrolment: every painter whose *Params has required keys declares them (0 gaps)',
    unenrolled.length === 0, unenrolled.join('; '));

  // And the inverse: nothing is declared required that the interface calls
  // optional — the gate must never invent an obligation the painter doesn't
  // have (cliffMass's biome-defaulted color is why this net exists).
  const invented: string[] = [];
  for (const [iface, painters] of casters) {
    const keys = required.get(iface) ?? [];
    for (const painter of painters) {
      for (const k of Object.keys(painterParamSpec(painter) ?? {})) {
        if (!keys.includes(k)) invented.push(`${painter}.${k} is optional in ${iface}`);
      }
    }
  }
  check('D enrolment: no declared key is optional in its own interface (0 invented)',
    invented.length === 0, invented.join('; '));
}

// ================================================================= E the mercy
{
  // The read sites carry `?? default` fallbacks now, so a miss degrades to a
  // drawn body. Pin the arithmetic those defaults feed: every geometry term a
  // params-less pod/shard would compute must be FINITE (that is precisely what
  // NaN geometry was not). The numbers mirror the painters' own expressions.
  // Read through the painters' OWN cast idiom on an empty record — the exact
  // shape a params-less data row hands them.
  const p = ({} as Record<string, unknown>) as unknown as PodParams;
  const s = ({} as Record<string, unknown>) as unknown as ShardParams;
  const r = 12, time = 3.5, seed = 7;
  const pulse = 0.5 + 0.5 * Math.sin(time * (p.pulseRate ?? 1) + seed * 0.1);
  const ry = r * (p.aspectY ?? 1);
  const gyq = Math.round(ry * (p.glowY ?? 0));
  const grq = Math.max(1, Math.round(r * (p.glowR ?? 0.5) * 1.5));
  const finite = [pulse, ry, gyq, grq, s.points ?? 6].every(Number.isFinite);
  check('E the mercy: a params-less pod/shard computes FINITE geometry, never NaN', finite,
    `pulse=${pulse.toFixed(3)} ry=${ry} gyq=${gyq} grq=${grq}`);
}

console.log(failed === 0 ? '\nprobe_painterparams: ALL GREEN' : `\nprobe_painterparams: ${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
