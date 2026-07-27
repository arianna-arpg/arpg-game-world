#!/usr/bin/env node
/**
 * THE OWNERSHIP GATE — refuse a commit that carries another session's hunks.
 *
 * This repo is worked by several concurrent Claude Code sessions sharing ONE
 * working tree, so `git commit -a` (or a careless `git add <file>`) can
 * silently swallow a co-session's in-flight work. The habit that prevents it
 * has two halves:
 *   (a) THE HUNK ROUTER — stage each hunk by a distinctive content token it
 *       touches, so a shared file's edits go to the session that made them;
 *   (b) THE FOREIGN-TOKEN GATE — refuse the commit when the staged diff
 *       carries tokens this session does not own.
 * This script is half (b). It keys on OWNERSHIP, not on recognizable prose,
 * which is what closes the hole half (a) cannot reach: a co-session's hunk
 * that is numbers-only has no quotable text to route by, yields no
 * distinctive token here either, and so is reported UNATTRIBUTABLE rather
 * than silently passing.
 *
 * THE LAW: every staged hunk is reported with its file + hunk header, INCLUDING
 * hunks that yield no tokens at all. Silence is never a verdict.
 *
 *   node scripts/ownership-gate.mjs --allow .claude/ownership.local.txt
 *
 * Exit 0 = every staged hunk attributed · 1 = foreign or unattributable hunks
 * present · 2 = usage error (a missing declaration NEVER passes silently).
 *
 * Outside every tsconfig project (tsconfig.json = src, tsconfig.sim.json =
 * balance+src, tsconfig.launcher.json = launcher/**\/*.cjs), so `npm run check`
 * does not type-check it. Keep it dependency-free plain ESM like its siblings.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const USAGE = `THE OWNERSHIP GATE — refuse a commit carrying a co-session's hunks.

  node scripts/ownership-gate.mjs --allow <declaration-file> [options]

Declares what THIS session owns; every staged hunk that cannot be attributed to
that declaration is reported and gates the commit.

Ownership sources (repeatable, all merged):
  --allow <path>          declaration file (see FORMAT below)
  --own-file <glob>       a file this session owns WHOLE (every hunk in it passes)
  --own-token <token>     a distinctive token this session owns
  --ignore-token <token>  treat a token as noise (never distinctive, never foreign)

Options:
  --strict        also gate MIXED hunks (owned + foreign tokens in one hunk)
  --min-len <n>   shortest distinctive token (default 3)
  --json          machine-readable report on stdout
  -h, --help      this text

FORMAT — plain text, '#' comments, blank lines ignored. Lines before any
section header are files. Globs: '*' (one segment), '**' (any depth), a
trailing '/' owns the directory.

    # session: the armed list
    [files]
    balance/probe_applyarm.ts      # new file — owned whole
    scripts/*.mjs

    [tokens]
    armedFamily                    # shared files: hunks naming these are mine
    staticallyArmed
    STAT_TRADES

    [ignore]
    helper                         # too common in my diff to mean anything

A .json declaration ({"files":[],"tokens":[],"ignore":[]}) is also accepted.

VERDICTS (one line per staged hunk, always):
  OWNED-FILE      the file is declared owned whole
  OWNED           the hunk names ≥1 owned token and nothing foreign
  MIXED           owned AND foreign tokens in one hunk — re-stage finer (--strict gates)
  FOREIGN         no owned token; distinctive tokens this session never declared
  UNATTRIBUTABLE  no distinctive token at all (numeric/whitespace-only hunk,
                  binary blob, or a bare rename) — the case the gate exists for

WHEN IT FIRES: re-stage at finer grain (git restore --staged <file>, then
git add -p and take only your own hunks). NEVER force past it — a foreign
hunk in your commit is a co-session's work destroyed.`;

/**
 * Tokens that carry no ownership signal. This is a NOISE filter only — an
 * explicitly declared token always wins over this list, so declaring `min`
 * or `count` re-arms it. Nothing here can hide a hunk: a hunk whose every
 * token is stoplisted yields none and lands as UNATTRIBUTABLE.
 */
const STOPWORDS = new Set([
  // JS/TS syntax
  'abstract', 'any', 'as', 'asserts', 'async', 'await', 'bigint', 'boolean', 'break',
  'case', 'catch', 'class', 'const', 'constructor', 'continue', 'debugger', 'declare',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'infer',
  'instanceof', 'interface', 'is', 'keyof', 'let', 'namespace', 'never', 'new', 'null',
  'number', 'object', 'of', 'out', 'override', 'private', 'protected', 'public',
  'readonly', 'require', 'return', 'satisfies', 'set', 'static', 'string', 'super',
  'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined',
  'unique', 'unknown', 'var', 'void', 'while', 'with', 'yield',
  // globals / builtins
  'Array', 'Boolean', 'Buffer', 'Date', 'Error', 'Float32Array', 'Infinity', 'Int32Array',
  'JSON', 'Map', 'Math', 'NaN', 'Number', 'Object', 'Promise', 'Proxy', 'Reflect',
  'RegExp', 'Set', 'String', 'Symbol', 'Uint8Array', 'WeakMap', 'WeakSet', 'console',
  'document', 'globalThis', 'process', 'window',
  // ubiquitous members / locals — distinctive nowhere
  'abs', 'add', 'apply', 'arg', 'args', 'argv', 'arr', 'assign', 'bind', 'call', 'ceil',
  'cfg', 'charAt', 'charCodeAt', 'clear', 'concat', 'count', 'create', 'ctx', 'cur',
  'data', 'def', 'defs', 'dir', 'endsWith', 'entries', 'err', 'every', 'exec', 'fill',
  'filter', 'find', 'findIndex', 'flat', 'flatMap', 'floor', 'forEach', 'freeze',
  'has', 'hasOwnProperty', 'hypot', 'idx', 'includes', 'index', 'indexOf', 'info',
  'isArray', 'item', 'items', 'join', 'key', 'keys', 'len', 'length', 'list', 'log',
  'map', 'match', 'max', 'min', 'msg', 'next', 'num', 'obj', 'opts', 'options',
  'padEnd', 'padStart', 'param', 'params', 'parse', 'pop', 'pos', 'pow', 'prev',
  'push', 'random', 'reduce', 'repeat', 'replace', 'res', 'result', 'ret', 'reverse',
  'round', 'shift', 'sign', 'size', 'slice', 'some', 'sort', 'splice', 'split', 'sqrt',
  'startsWith', 'str', 'stringify', 'substr', 'substring', 'sum', 'temp', 'test',
  'then', 'tmp', 'toFixed', 'toString', 'total', 'trim', 'trunc', 'unshift', 'val',
  'valueOf', 'value', 'values', 'warn',
]);

const IDENT_RE = /[A-Za-z_$][A-Za-z0-9_$]*/g;
const STRING_RE = /'([^'\\\n]*)'|"([^"\\\n]*)"|`([^`\\\n$]*)`/g;
const IDLIKE_RE = /^[A-Za-z0-9][A-Za-z0-9_.:\-/]+$/;

// ─────────────────────────────────────────────────────────── argv ───────────

function parseArgs(argv) {
  const opts = {
    allow: [], ownFiles: [], ownTokens: [], ignoreTokens: [],
    strict: false, json: false, minLen: 3, help: false,
  };
  const takesValue = new Set(['--allow', '--own-file', '--own-token', '--ignore-token', '--min-len']);

  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    if (raw === '-h' || raw === '--help') { opts.help = true; continue; }
    if (raw === '--strict') { opts.strict = true; continue; }
    if (raw === '--json') { opts.json = true; continue; }

    const eq = raw.indexOf('=');
    const flag = eq === -1 ? raw : raw.slice(0, eq);
    if (!takesValue.has(flag)) fail(`unknown argument: ${raw}`);
    const value = eq === -1 ? argv[++i] : raw.slice(eq + 1);
    if (value === undefined) fail(`${flag} needs a value`);

    if (flag === '--allow') opts.allow.push(value);
    else if (flag === '--own-file') opts.ownFiles.push(value);
    else if (flag === '--own-token') opts.ownTokens.push(value);
    else if (flag === '--ignore-token') opts.ignoreTokens.push(value);
    else if (flag === '--min-len') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 1) fail(`--min-len needs a positive number, got ${value}`);
      opts.minLen = n;
    }
  }
  return opts;
}

function fail(message) {
  console.error(`ownership-gate: ${message}`);
  console.error(`\nRun with --help for usage.`);
  process.exit(2);
}

// ──────────────────────────────────────────────────── declarations ──────────

/** Parse a declaration file: JSON if it parses as JSON, else the line format. */
function loadDeclaration(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch (err) {
    fail(`cannot read declaration file '${path}': ${err?.message ?? err}`);
  }

  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    let json;
    try {
      json = JSON.parse(trimmed);
    } catch (err) {
      fail(`'${path}' looks like JSON but does not parse: ${err?.message ?? err}`);
    }
    return {
      files: asList(json.files, path, 'files'),
      tokens: asList(json.tokens, path, 'tokens'),
      ignore: asList(json.ignore, path, 'ignore'),
    };
  }

  const out = { files: [], tokens: [], ignore: [] };
  let section = 'files'; // bare lines before any header are files
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/(^|\s)#.*$/, '').trim();
    if (!line) continue;
    const header = /^\[(\w+)\]$/.exec(line);
    if (header) {
      const name = header[1].toLowerCase();
      if (name !== 'files' && name !== 'tokens' && name !== 'ignore') {
        fail(`'${path}': unknown section [${header[1]}] (expected [files], [tokens] or [ignore])`);
      }
      section = name;
      continue;
    }
    out[section].push(line);
  }
  return out;
}

function asList(value, path, field) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    fail(`'${path}': "${field}" must be an array of strings`);
  }
  return value;
}

/** Glob → RegExp over posix paths. '**' spans directories, '*' stays in one. */
function globToRe(pattern) {
  const normalized = pattern.replace(/\\/g, '/').replace(/\/$/, '/**');
  const escaped = normalized.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const body = escaped
    .replace(/\*\*\//g, ' A ')
    .replace(/\*\*/g, ' B ')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/ A /g, '(?:.*/)?')
    .replace(/ B /g, '.*');
  return new RegExp(`^${body}$`);
}

// ────────────────────────────────────────────────────── diff parse ──────────

function gitDiffCached() {
  try {
    return execFileSync('git', [
      '-c', 'core.quotePath=false',
      'diff', '--cached', '-U0', '--no-color', '--no-ext-diff',
    ], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (err) {
    const detail = err?.stderr?.toString().trim() || err?.message || String(err);
    fail(`git diff --cached failed: ${detail}`);
  }
}

function unquotePath(raw) {
  if (!raw.startsWith('"')) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw.slice(1, -1);
  }
}

function stripSide(raw) {
  const path = unquotePath(raw.trim());
  if (path === '/dev/null') return null;
  return path.replace(/^[ab]\//, '');
}

/**
 * Path from the `diff --git a/X b/X` line — the ONLY name a pure rename or a
 * mode-only change ever gets (those carry no ---/+++ pair). Renames also emit
 * an explicit `rename to`, which wins; this covers the same-path forms, where
 * the two halves are identical and the split is unambiguous.
 */
function pathFromDiffGit(line) {
  const rest = line.slice('diff --git '.length).trim();
  if (rest.startsWith('"')) {
    const m = /^("(?:[^"\\]|\\.)*")\s+("(?:[^"\\]|\\.)*")$/.exec(rest);
    return m ? stripSide(m[2]) : null;
  }
  const half = (rest.length - 1) / 2;
  if (!Number.isInteger(half) || rest[half] !== ' ') return null;
  const left = rest.slice(0, half);
  const right = rest.slice(half + 1);
  return left.slice(2) === right.slice(2) ? right.replace(/^[ab]\//, '') : null;
}

/**
 * Parse unified diff. Header lines are only interpreted BEFORE a file's first
 * @@ — inside a hunk every line carries a +/-/space prefix, so content that
 * itself looks like a diff header can never be mistaken for one.
 */
function parseDiff(text) {
  const files = [];
  let file = null;
  let hunk = null;
  let inHunks = false;

  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('diff --git ')) {
      file = {
        path: null, oldPath: null, headerPath: pathFromDiffGit(line),
        renamed: null, renamedFrom: null, binary: false, hunks: [],
      };
      files.push(file);
      hunk = null;
      inHunks = false;
      continue;
    }
    if (!file) continue;

    if (!inHunks) {
      if (line.startsWith('--- ')) { file.oldPath = stripSide(line.slice(4)); continue; }
      if (line.startsWith('+++ ')) { file.path = stripSide(line.slice(4)); continue; }
      if (line.startsWith('rename to ') || line.startsWith('copy to ')) {
        file.renamed = unquotePath(line.slice(line.indexOf(' to ') + 4).trim());
        continue;
      }
      if (line.startsWith('rename from ') || line.startsWith('copy from ')) {
        file.renamedFrom = unquotePath(line.slice(line.indexOf(' from ') + 6).trim());
        continue;
      }
      if (line.startsWith('Binary files ') || line.startsWith('GIT binary patch')) {
        file.binary = true;
        continue;
      }
    }

    if (line.startsWith('@@')) {
      const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(line);
      if (!m) continue;
      inHunks = true;
      hunk = {
        header: line.slice(0, line.indexOf(' @@') + 3),
        context: m[5] ?? '',
        oldLine: Number(m[1]),
        newLine: Number(m[3]),
        changes: [],
      };
      file.hunks.push(hunk);
      continue;
    }

    if (!hunk) continue;
    if (line.startsWith('+')) {
      hunk.changes.push({ side: '+', line: hunk.newLine++, text: line.slice(1) });
    } else if (line.startsWith('-')) {
      hunk.changes.push({ side: '-', line: hunk.oldLine++, text: line.slice(1) });
    }
    // ' ' context (none at -U0) and '\ No newline…' carry no change.
  }

  // Never DROP a staged file for want of a name — an unreported file is a
  // silent pass, which is the one thing this gate may not do.
  for (const f of files) {
    f.path = f.path ?? f.renamed ?? f.oldPath ?? f.headerPath ?? '(unnamed staged change)';
  }
  return files;
}

// ───────────────────────────────────────────────────── tokenizing ───────────

/** Distinctive tokens of one changed line, in first-seen order. */
function tokensOfLine(text) {
  const found = [];
  const seen = new Set();
  const push = (tok) => {
    if (!tok || seen.has(tok)) return;
    seen.add(tok);
    found.push(tok);
  };

  for (const m of text.matchAll(IDENT_RE)) push(m[0]);
  for (const m of text.matchAll(STRING_RE)) {
    const body = m[1] ?? m[2] ?? m[3];
    if (body && IDLIKE_RE.test(body)) push(body);
  }
  return found;
}

/**
 * Classify one hunk's tokens. An OWNED token always counts, even if it is
 * stoplisted or shorter than --min-len: declaring it is an explicit act and
 * must beat the noise filter. Everything else must clear the filter to be
 * distinctive enough to call foreign.
 */
function classifyHunk(hunk, owned, ignored, minLen) {
  const ownedHits = [];
  const foreign = [];
  const seenForeign = new Set();

  for (const change of hunk.changes) {
    for (const tok of tokensOfLine(change.text)) {
      if (owned.has(tok)) {
        if (!ownedHits.some((h) => h.token === tok)) ownedHits.push({ token: tok, change });
        continue;
      }
      if (ignored.has(tok) || STOPWORDS.has(tok) || tok.length < minLen) continue;
      if (seenForeign.has(tok)) continue;
      seenForeign.add(tok);
      foreign.push({ token: tok, change });
    }
  }
  return { ownedHits, foreign };
}

// ───────────────────────────────────────────────────────── report ───────────

const VERDICT_GATES = {
  'OWNED-FILE': false,
  OWNED: false,
  MIXED: 'strict',
  FOREIGN: true,
  UNATTRIBUTABLE: true,
};

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(USAGE);
    process.exit(0);
  }

  const declared = { files: [...opts.ownFiles], tokens: [...opts.ownTokens], ignore: [...opts.ignoreTokens] };
  for (const path of opts.allow) {
    const decl = loadDeclaration(path);
    declared.files.push(...decl.files);
    declared.tokens.push(...decl.tokens);
    declared.ignore.push(...decl.ignore);
  }
  if (!opts.allow.length && !opts.ownFiles.length && !opts.ownTokens.length) {
    fail('no ownership declared — pass --allow <file>, --own-file or --own-token.\n' +
      '  An undeclared session owns nothing; the gate refuses rather than passing silently.');
  }

  const ownedFileRes = declared.files.map(globToRe);
  const ownedTokens = new Set(declared.tokens);
  const ignoredTokens = new Set(declared.ignore);
  const ownsFile = (path) => ownedFileRes.some((re) => re.test(path));

  const files = parseDiff(gitDiffCached());
  const report = [];
  let gateCount = 0;
  let foreignTokenCount = 0;

  for (const file of files) {
    const fileOwned = ownsFile(file.path);
    const entries = [];

    // A staged file with no content hunks is still a staged action (bare
    // rename, mode change, binary blob) — it gets a row like everything else.
    if (!file.hunks.length) {
      const why = file.binary
        ? 'binary blob — no readable tokens'
        : file.renamed
          ? `renamed from ${file.renamedFrom ?? file.oldPath ?? '?'} — no content change to attribute`
          : 'no content hunks (mode change or empty file)';
      entries.push({
        header: '@@ (whole file) @@',
        context: '',
        verdict: fileOwned ? 'OWNED-FILE' : 'UNATTRIBUTABLE',
        note: why,
        owned: [],
        foreign: [],
        sample: [],
      });
    }

    for (const hunk of file.hunks) {
      const { ownedHits, foreign } = classifyHunk(hunk, ownedTokens, ignoredTokens, opts.minLen);
      let verdict;
      if (fileOwned) verdict = 'OWNED-FILE';
      else if (ownedHits.length && foreign.length) verdict = 'MIXED';
      else if (ownedHits.length) verdict = 'OWNED';
      else if (foreign.length) verdict = 'FOREIGN';
      else verdict = 'UNATTRIBUTABLE';

      entries.push({
        header: hunk.header,
        context: hunk.context,
        verdict,
        note: verdict === 'UNATTRIBUTABLE' && !fileOwned
          ? 'no distinctive token — numeric or whitespace-only change'
          : '',
        owned: ownedHits.map((h) => h.token),
        // A file declared owned WHOLE has nothing foreign in it by definition;
        // listing its other tokens would only read as a false accusation.
        foreign: fileOwned ? [] : foreign.map((h) => ({ token: h.token, side: h.change.side, line: h.change.line })),
        sample: hunk.changes.slice(0, 6).map((c) => ({ side: c.side, line: c.line, text: c.text })),
      });
    }

    for (const entry of entries) {
      const gates = VERDICT_GATES[entry.verdict];
      entry.gated = gates === true || (gates === 'strict' && opts.strict);
      if (entry.gated) {
        gateCount++;
        foreignTokenCount += entry.foreign.length;
      }
    }
    report.push({ path: file.path, fileOwned, entries });
  }

  if (opts.json) {
    console.log(JSON.stringify({
      protocol: 'ownership-gate/v1',
      strict: opts.strict,
      minLen: opts.minLen,
      declared,
      files: report,
      gatedHunks: gateCount,
      foreignTokens: foreignTokenCount,
      ok: gateCount === 0,
    }, null, 2));
    process.exit(gateCount === 0 ? 0 : 1);
  }

  printReport(report, { opts, declared, gateCount, foreignTokenCount });
  process.exit(gateCount === 0 ? 0 : 1);
}

function printReport(report, { opts, declared, gateCount, foreignTokenCount }) {
  const totalHunks = report.reduce((n, f) => n + f.entries.length, 0);

  console.log('# Ownership gate — staged diff');
  console.log();
  console.log(`- Declared: ${declared.files.length} owned file pattern(s), ${declared.tokens.length} owned token(s)` +
    (declared.ignore.length ? `, ${declared.ignore.length} ignored` : ''));
  if (opts.allow.length) console.log(`- Declaration: ${opts.allow.map((p) => `\`${p}\``).join(', ')}`);
  console.log(`- Staged: ${report.length} file(s), ${totalHunks} hunk(s)` + (opts.strict ? ' — STRICT (mixed hunks gate)' : ''));
  console.log();

  if (!report.length) {
    console.log('Nothing staged — nothing to attribute.');
    console.log();
    console.log('PASS — no staged hunk is foreign.');
    return;
  }

  for (const file of report) {
    console.log(`## ${file.path}${file.fileOwned ? '   [declared owned whole]' : ''}`);
    for (const entry of file.entries) {
      const where = entry.context ? `${entry.header} ${entry.context}` : entry.header;
      console.log(`  ${entry.verdict.padEnd(15)} ${where}`);
      if (entry.owned.length && entry.verdict !== 'OWNED-FILE') {
        console.log(`  ${' '.repeat(15)}   owns: ${entry.owned.slice(0, 8).join(', ')}`);
      }
      for (const f of entry.foreign.slice(0, 8)) {
        console.log(`  ${' '.repeat(15)}   foreign: ${f.token}  (${f.side}${f.line})`);
      }
      if (entry.foreign.length > 8) {
        console.log(`  ${' '.repeat(15)}   foreign: … ${entry.foreign.length - 8} more`);
      }
      if (entry.note) console.log(`  ${' '.repeat(15)}   ${entry.note}`);
      // A hunk with nothing quotable is exactly the case the gate exists for:
      // show the raw change so the reader can still identify whose it is.
      if (entry.verdict === 'UNATTRIBUTABLE' && entry.sample.length) {
        for (const s of entry.sample) {
          console.log(`  ${' '.repeat(15)}   ${s.side}${s.line}  ${s.text.trim().slice(0, 72)}`);
        }
      }
    }
    console.log();
  }

  if (gateCount === 0) {
    console.log(`PASS — all ${totalHunks} staged hunk(s) attributed to this session.`);
    return;
  }

  console.log(`FAIL — ${gateCount} unattributed hunk(s), ${foreignTokenCount} foreign token(s).`);
  console.log();
  console.log('Re-stage at finer grain — never force past this:');
  console.log('  git restore --staged <file>     # drop the whole file from the index');
  console.log('  git add -p <file>               # take back ONLY your own hunks');
  console.log('If a listed hunk really is yours, declare its token or file and re-run.');
}

main();
