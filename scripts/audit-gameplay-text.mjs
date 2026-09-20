// GAMEPLAY-TEXT-AUDIT: discovery inventory, not a violation count or a CI gate.
// Run from any directory: node scripts/audit-gameplay-text.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'balance/reports/gameplay-text-audit');
const slash = s => s.replaceAll('\\', '/');
const calls = new Map([
  ['text', { category: 'floater', index: 1, min: 3 }],
  ['cry', { category: 'combat-cry', index: 1, min: 3 }],
  ['notice', { category: 'notice', index: 0, min: 1 }],
  ['tell', { category: 'wrapper-candidate', index: 0, min: 1 }],
  ['fillText', { category: 'canvas-candidate', index: 0, min: 3 }],
  ['strokeText', { category: 'canvas-candidate', index: 0, min: 3 }],
]);
// Deliberately excludes generic label/name/description: status definitions and
// optional inspection prose are not evidence of an emitted combat caption.
const fields = new Set([
  'announce', 'signal', 'signals', 'warn', 'note', 'noteOn', 'enterText',
  'underflowText', 'sinkText', 'breachText', 'stirText', 'text',
]);
function* files(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(full);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts')) yield full;
  }
}
const compact = (node, source) => node?.getText(source).replace(/\s+/g, ' ').trim() ?? '';
function contextOf(node, source) {
  const names = [];
  for (let p = node.parent; p && names.length < 5; p = p.parent) {
    if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p) || ts.isClassDeclaration(p)
      || ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p)) && p.name) {
      names.unshift(compact(p.name, source));
    }
  }
  return names.join(' / ') || '(module)';
}
function formOf(node) {
  if (ts.isStringLiteralLike(node)) return 'literal';
  if (ts.isTemplateExpression(node)) return 'template';
  return 'expression';
}
const rows = [];
let scannedFiles = 0;
for (const file of files(path.join(root, 'src'))) {
  scannedFiles++;
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  function add(node, category, value, extra = {}) {
    const position = source.getLineAndCharacterOfPosition(node.getStart(source));
    rows.push({ file: slash(path.relative(root, file)), line: position.line + 1,
      column: position.character + 1, category, context: contextOf(node, source),
      form: formOf(value), expression: compact(value, source), ...extra });
  }
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const spec = calls.get(method);
      if (spec && node.arguments.length >= spec.min) {
        const extra = { receiver: compact(node.expression.expression, source), method };
        if (method === 'text') extra.kind = compact(node.arguments[4], source) || '(untyped)';
        if (method === 'cry') {
          extra.kind = "'combat'";
          extra.voice = compact(node.arguments[4], source) || '(none)';
        }
        add(node, spec.category, node.arguments[spec.index], extra);
      }
    }
    if (ts.isPropertyAssignment(node)) {
      const name = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : '';
      if (fields.has(name)) {
        // Data fields are candidates only; trace the consumer before triage.
        // Include object-valued signal maps, but omit numeric/layout text fields.
        const value = node.initializer;
        if (ts.isStringLiteralLike(value) || ts.isTemplateExpression(value)
          || (name === 'signals' && ts.isObjectLiteralExpression(value))) {
          add(node, 'data-candidate', value, { field: name });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
const categories = [...new Set(rows.map(r => r.category))];
const counts = Object.fromEntries(categories.map(c => [c, rows.filter(r => r.category === c).length]));
const limitations = [
  'Static candidate sites, not distinct messages, live encounter counts, or confirmed violations.',
  'Calls are matched by method spelling, not TypeScript receiver types. Review each consumer.',
  'Wrappers and their downstream calls overlap. Never add categories as a unique-message total.',
  'Data candidates may be unused or reference text; dynamic expressions can emit many different messages.',
  'Direct canvas text includes numbers, names, HUD and optional reference surfaces.',
  'Does not trace aliases, computed method calls, HTML/DOM templates, localization, or runtime reachability.',
  'No runtime files are changed; removing a caption requires a verified replacement cue.',
];
const result = { schemaVersion: 1, scannedRoot: 'src', scannedFiles, counts, limitations, rows };
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'inventory.json'), JSON.stringify(result, null, 2) + '\n');
const cell = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;').replaceAll('`', '&#96;').replace(/\r?\n/g, ' ');
const lines = [
  '# Gameplay text discovery inventory', '',
  'Regenerate: `node scripts/audit-gameplay-text.mjs`.', '',
  '[Curated migration backlog](../../../docs/design/gameplay-text-audit.md).', '',
  ...limitations.map(s => `- ${s}`), '',
  `Scanned ${scannedFiles} TypeScript source files.`, '',
  '| Category | Candidate sites |', '|---|---:|',
  ...Object.entries(counts).map(([c, n]) => `| ${c} | ${n} |`), '',
];
for (const category of categories) {
  lines.push(`## ${category}`, '', '| Source | Context | Text / expression | Kind / voice / field |', '|---|---|---|---|');
  for (const r of rows.filter(r => r.category === category)) {
    const href = slash(path.relative(out, path.join(root, r.file)));
    lines.push(`| [${r.file}:${r.line}](${href}#L${r.line}) | ${cell(r.context)} | ${cell(r.expression)} | ${cell([r.kind, r.voice, r.field].filter(Boolean).join(' / '))} |`);
  }
  lines.push('');
}
fs.writeFileSync(path.join(out, 'inventory.md'), lines.join('\n'));
console.log(JSON.stringify({ scannedFiles, counts, output: slash(path.relative(root, out)) }, null, 2));
