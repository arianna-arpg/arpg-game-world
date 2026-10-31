// ---------------------------------------------------------------------------
// KNOBS — run the real game with a number changed, without editing source.
//
// A knob names a value by its path through the live data registries and says
// what to do to it:
//
//   skills.fireball.cooldown=3              set
//   skills.fireball.baseDamage*0.8          scale every numeric leaf beneath
//   monsters.zombie.base.life+10            add
//   supports.splitting.mods[stat=damage].value=-0.1   rows addressed by content
//   classes.warrior.attributes.strength+10  attributes: per class
//   cfg.DROP_CFG.gemChance*1.5              any exported *_CFG
//
// Knobs mutate the same objects the engine reads, record an undo log, and are
// restored after the run. There is no parallel model: if the engine reads the
// value at run time, the knob reaches it. A value folded once at import time
// does NOT move, and that is why every what-if reports whether the knob actually
// changed anything (byte-identical fingerprints read `no-op`), so a dead knob is
// reported instead of being mistaken for a robust balance.
//
// Roots are an open registry (KNOB_ROOTS); a new content registry is one row.
// Browser-safe: *_CFG objects are registered by the caller (balance/farm/verbs.ts
// finds them on disk), so this file imports no Node.
// ---------------------------------------------------------------------------

import { CLASSES, PROGRESSION } from '../data/classes';
import { MONSTERS } from '../data/monsters';
import { PASSIVE_NODES } from '../data/passives';
import { PROCS } from '../data/procs';
import { SKILLS } from '../data/skills';
import { SUPPORTS } from '../data/supports';
import { UNIQUES } from '../data/uniques';
import { ITEM_AFFIXES } from '../data/itemaffixes';
import { ITEM_BASES } from '../data/itembases';
import { STATUS_DEFS } from '../engine/status';
import { ATTRIBUTES, STAT_DEFS } from '../engine/stats';

export type KnobOp = 'set' | 'mul' | 'add';

export interface KnobSpec {
  path: string;
  op: KnobOp;
  value: number | string | boolean;
  /** The text this was parsed from (reports quote it verbatim). */
  text: string;
}

/** Registered *_CFG objects, keyed by export name. The Node side fills it. */
export const CFG_ROOTS: Record<string, object> = {};

export function registerCfgRoot(name: string, cfg: object): void { CFG_ROOTS[name] = cfg; }

const byId = <T extends { id: string }>(rows: readonly T[]): Record<string, T> =>
  Object.fromEntries(rows.map(r => [r.id, r]));

/** The registries a knob path may start from. */
export const KNOB_ROOTS: Record<string, () => unknown> = {
  skills: () => SKILLS,
  supports: () => SUPPORTS,
  monsters: () => MONSTERS,
  classes: () => byId(CLASSES),
  passives: () => PASSIVE_NODES,
  procs: () => PROCS,
  uniques: () => UNIQUES,
  affixes: () => ITEM_AFFIXES,
  bases: () => ITEM_BASES,
  attributes: () => ATTRIBUTES,
  statuses: () => STATUS_DEFS,
  stats: () => STAT_DEFS,
  progression: () => PROGRESSION,
  cfg: () => CFG_ROOTS,
};

/** Parse `path op value`. The operator is the first `=`, `*` or `+` outside
 *  brackets, where a `*` straight after a dot (or at the start) is a wildcard
 *  segment rather than the scale operator. */
export function parseKnob(text: string): KnobSpec {
  const t = text.trim();
  let depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (c === '[') depth++;
    else if (c === ']') depth--;
    else if (depth === 0 && (c === '=' || c === '+' || (c === '*' && i > 0 && t[i - 1] !== '.'))) {
      const path = t.slice(0, i).trim();
      const raw = t.slice(i + 1).trim();
      if (!path || !raw) break;
      const op: KnobOp = c === '=' ? 'set' : c === '*' ? 'mul' : 'add';
      const n = Number(raw);
      if (op !== 'set' && !Number.isFinite(n)) throw new Error(`knob '${text}': '${c}' needs a number, got '${raw}'`);
      const value = op !== 'set' ? n
        : raw === 'true' ? true : raw === 'false' ? false
          : Number.isFinite(n) ? n : raw;
      return { path, op, value, text: t };
    }
  }
  throw new Error(`knob '${text}': want <path><=|*|+><value>, e.g. skills.fireball.cooldown*0.9`);
}

interface Leaf { holder: Record<string, unknown>; key: string; path: string }

/** Walk a path to its holders. Wildcards and row selectors fan out. */
function resolveHolders(path: string): { node: unknown; holder: Record<string, unknown> | null; key: string; path: string }[] {
  const segs = path.match(/[^.[\]]+|\[[^\]]*\]/g) ?? [];
  const rootName = segs.shift();
  if (!rootName || !KNOB_ROOTS[rootName]) {
    throw new Error(`knob path '${path}': unknown root '${rootName}' (have: ${Object.keys(KNOB_ROOTS).join(', ')})`);
  }
  let frontier: { node: unknown; holder: Record<string, unknown> | null; key: string; path: string }[] = [
    { node: KNOB_ROOTS[rootName](), holder: null, key: rootName, path: rootName },
  ];
  for (const seg of segs) {
    const next: typeof frontier = [];
    for (const f of frontier) {
      if (f.node === null || typeof f.node !== 'object') continue;
      const o = f.node as Record<string, unknown>;
      if (seg === '*') {
        for (const k of Object.keys(o)) next.push({ node: o[k], holder: o, key: k, path: `${f.path}.${k}` });
      } else if (seg.startsWith('[')) {
        const m = /^\[([^=\]]+)=([^\]]*)\]$/.exec(seg);
        if (!m) throw new Error(`knob path '${path}': bad selector '${seg}' (want [field=value])`);
        for (const k of Object.keys(o)) {
          const row = o[k] as Record<string, unknown> | null;
          if (row && typeof row === 'object' && String(row[m[1]]) === m[2]) {
            next.push({ node: row, holder: o, key: k, path: `${f.path}[${m[1]}=${m[2]}]` });
          }
        }
      } else if (seg in o) {
        next.push({ node: o[seg], holder: o, key: seg, path: `${f.path}.${seg}` });
      }
    }
    frontier = next;
  }
  return frontier;
}

/** Every numeric leaf beneath a value (arrays and objects alike). */
function numericLeaves(node: unknown, holder: Record<string, unknown> | null, key: string, path: string, out: Leaf[], depth = 0): void {
  if (depth > 12) return;
  if (typeof node === 'number') {
    if (holder) out.push({ holder, key, path });
    return;
  }
  if (node === null || typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  for (const k of Object.keys(o)) numericLeaves(o[k], o, k, `${path}.${k}`, out, depth + 1);
}

export interface KnobTouch { path: string; before: unknown; after: unknown }

export interface AppliedKnobs {
  touched: KnobTouch[];
  /** Knobs whose path matched nothing, or matched only frozen values. */
  errors: string[];
  restore: () => void;
}

/** Apply knobs in order. Always call restore (try/finally). */
export function applyKnobs(specs: readonly KnobSpec[]): AppliedKnobs {
  const undo: { holder: Record<string, unknown>; key: string; before: unknown }[] = [];
  const touched: KnobTouch[] = [];
  const errors: string[] = [];
  for (const spec of specs) {
    let holders: ReturnType<typeof resolveHolders>;
    try { holders = resolveHolders(spec.path); } catch (err) { errors.push((err as Error).message); continue; }
    if (!holders.length) { errors.push(`knob '${spec.text}': path matched nothing`); continue; }
    const before = touched.length;
    for (const h of holders) {
      if (!h.holder) { errors.push(`knob '${spec.text}': cannot write a registry root`); continue; }
      const write = (holder: Record<string, unknown>, key: string, path: string, value: unknown): void => {
        try {
          const prior = holder[key];
          holder[key] = value;
          undo.push({ holder, key, before: prior });
          touched.push({ path, before: prior, after: value });
        } catch {
          errors.push(`knob '${spec.text}': ${path} is frozen`);
        }
      };
      if (spec.op === 'set') {
        if (h.node !== null && typeof h.node === 'object') {
          errors.push(`knob '${spec.text}': cannot set a whole object at ${h.path} (use * or + to fan out over its numbers)`);
          continue;
        }
        write(h.holder, h.key, h.path, spec.value);
      } else {
        const leaves: Leaf[] = [];
        numericLeaves(h.node, h.holder, h.key, h.path, leaves);
        for (const l of leaves) {
          const cur = l.holder[l.key] as number;
          write(l.holder, l.key, l.path, spec.op === 'mul' ? cur * (spec.value as number) : cur + (spec.value as number));
        }
      }
    }
    if (touched.length === before && !errors.some(e => e.includes(spec.text))) {
      errors.push(`knob '${spec.text}': no numeric value beneath this path`);
    }
  }
  return {
    touched, errors,
    restore: () => {
      for (let i = undo.length - 1; i >= 0; i--) undo[i].holder[undo[i].key] = undo[i].before;
    },
  };
}

/** The tunable surface under a path: every numeric leaf with its value. Lists
 *  what a knob could address, derived from the live data. */
export function knobCensus(prefix: string, limit = 400): { path: string; value: number }[] {
  const out: Leaf[] = [];
  for (const h of resolveHolders(prefix)) numericLeaves(h.node, h.holder, h.key, h.path, out);
  return out.slice(0, limit).map(l => ({ path: l.path, value: l.holder[l.key] as number }));
}

/** Round a proposed number to what an author would actually write. */
export function roundForAuthor(x: number): number {
  if (!Number.isFinite(x) || x === 0) return x;
  return Number(x.toPrecision(2));
}
