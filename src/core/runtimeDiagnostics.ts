import { BUILD_PROFILE, storageKey } from '../buildProfile';

export interface RuntimeDiagnostic {
  at: string; lastAt: string; count: number; operation: string; message: string;
  stack: string; context: Record<string, string | number | boolean | null>;
}
const KEY = storageKey('hollow-wake-runtime-errors-v1');
const LIMIT = 20;
let records: RuntimeDiagnostic[] | undefined;
const text = (value: unknown, limit: number): string => {
  try { return String(value ?? '').slice(0, limit); } catch { return '[unreadable value]'; }
};
function history(): RuntimeDiagnostic[] {
  if (records) return records;
  records = [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (Array.isArray(raw)) records = raw.slice(-LIMIT).filter((r): r is RuntimeDiagnostic =>
      !!r && typeof r === 'object' && typeof r.at === 'string' && typeof r.lastAt === 'string'
      && typeof r.operation === 'string' && typeof r.message === 'string' && typeof r.stack === 'string'
      && Number.isSafeInteger(r.count) && r.count > 0 && !!r.context && typeof r.context === 'object')
      .map(r => ({ at: text(r.at, 64), lastAt: text(r.lastAt, 64), count: r.count,
        operation: text(r.operation, 100), message: text(r.message, 2000),
        stack: text(r.stack, 8000), context: contextOf(r.context) }));
  } catch { /* Storage is optional; the in-memory report still works. */ }
  return records;
}
function contextOf(input: Record<string, unknown>): RuntimeDiagnostic['context'] {
  const result: RuntimeDiagnostic['context'] = {};
  try {
    for (const [key, value] of Object.entries(input).slice(0, 24)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) continue;
      result[key.slice(0, 100)] = value === null || typeof value === 'boolean' ? value
        : typeof value === 'number' && Number.isFinite(value) ? value : text(value, 500);
    }
  } catch { result.diagnosticContext = 'unavailable'; }
  return result;
}
/** Error-only local history, independent of character/account saves. Reporting
 * must never throw, serialize a live World, or turn a failed write into success. */
export function recordRuntimeError(operation: string, error: unknown, context: Record<string, unknown> = {}): void {
  try {
    let message = text(error, 2000), stack = '';
    try {
      if (error && typeof error === 'object') {
        if ('message' in error) message = text(error.message, 2000);
        if ('stack' in error) stack = text(error.stack, 8000);
      }
    } catch { /* A hostile thrown value cannot break error reporting. */ }
    const rows = history(), now = new Date().toISOString(), details = contextOf(context);
    const last = rows.at(-1), kind = text(operation, 100);
    if (last?.operation === kind && last.message === message && JSON.stringify(last.context) === JSON.stringify(details)) {
      last.lastAt = now; last.count = Math.min(Number.MAX_SAFE_INTEGER, last.count + 1);
    } else {
      rows.push({ at: now, lastAt: now, count: 1, operation: kind, message, stack, context: details });
      if (rows.length > LIMIT) rows.shift();
      console.error('[runtime]', kind, error, details);
    }
    try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* Quota/private mode: retain RAM. */ }
  } catch { /* Diagnostics cannot change gameplay/error semantics. */ }
}

export function runtimeErrorReport(): string {
  let url = '', agent = '', bundles: string[] = [];
  try {
    url = location.origin + location.pathname;
    agent = navigator.userAgent;
    // Exact loaded asset hashes identify an old open tab even after a new deploy.
    bundles = Array.from(document.scripts).map(s => s.src).filter(Boolean).slice(0, 12);
  } catch { /* Headless engine probes have no browser. */ }
  return JSON.stringify({ schema: 1, exportedAt: new Date().toISOString(), url, agent,
    profile: BUILD_PROFILE, bundles, errors: history() }, null, 2);
}
