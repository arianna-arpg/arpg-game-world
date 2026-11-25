/** Audit native world flash emissions. --list shows unresolved sites; --all includes covered sites. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const diagnosticFields = new Set(['mechanicLink','companionCue','combatCue','defenseCue','movement','lightning',
  'bolt','meteor','beam','feedingCue','cosmeticMotif','anatomy','arc','haze','departure']);

function propertyName(node) {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression))
    return node.argumentExpression.text;
}

function classify(node, checker, seen = new Set()) {
  if (!node || seen.has(node)) return 'delegated';
  seen.add(node);
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node))
    return classify(node.expression, checker, seen);
  if (ts.isConditionalExpression(node)) {
    const branches = [node.whenTrue, node.whenFalse].map(arm => classify(arm, checker, new Set(seen)));
    return branches.includes('plain') ? 'plain' : branches[0] === branches[1] ? branches[0] : 'composed';
  }
  if (ts.isIdentifier(node)) {
    const binding = checker.getSymbolAtLocation(node)?.valueDeclaration;
    if (binding && ts.isVariableDeclaration(binding) && (binding.parent.flags & ts.NodeFlags.Const))
      return classify(binding.initializer, checker, seen);
  }
  if (!ts.isObjectLiteralExpression(node)) return 'delegated';
  const fields = node.properties.filter(p => !ts.isSpreadAssignment(p) &&
    !(p.initializer && ['undefined','false','null'].includes(p.initializer.getText())));
  if (fields.some(p => p.name?.text === 'fx')) return 'keyed';
  if (fields.some(p => diagnosticFields.has(p.name?.text))) return 'specialized';
  const spreads = node.properties.filter(ts.isSpreadAssignment);
  return spreads.some(p => classify(p.expression, checker, new Set(seen)) !== 'plain') ? 'composed' : 'plain';
}

export function auditCombatFlashes(root = sourceRoot) {
  const files = fs.readdirSync(root, {recursive:true}).sort().filter(local =>
    local.endsWith('.ts') && /\bflashes\b/.test(fs.readFileSync(path.join(root, local), 'utf8')));
  // Local symbols let a literal assigned to a const go through the same check as an inline literal.
  const program = ts.createProgram(files.map(local => path.join(root,local)), { noResolve:true, noLib:true, types:[] });
  const checker = program.getTypeChecker(), sites = [], totals = {};
  for (const local of files) {
    const file = program.getSourceFile(path.join(root,local));
    function visit(node) {
      const callee = ts.isCallExpression(node) ? node.expression : undefined;
      if (callee && propertyName(callee) === 'push' && propertyName(callee.expression) === 'flashes') {
        for (const arg of node.arguments) {
          const kind = classify(arg, checker);
          totals[kind] = (totals[kind] ?? 0) + 1;
          let owner = node.parent;
          while (owner && !ts.isMethodDeclaration(owner) && !ts.isFunctionDeclaration(owner)) owner = owner.parent;
          sites.push({ file:local.replaceAll('\\','/'), line:file.getLineAndCharacterOfPosition(arg.getStart(file)).line+1,
            owner:owner?.name?.getText(file) ?? '(callback)', kind });
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(file);
  }
  const plain = sites.filter(site => site.kind === 'plain');
  return { totals, sites, plain, regressions:plain };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditCombatFlashes();
  console.log(result.sites.length+' native flash arguments; '+result.plain.length+' plain.', result.totals);
  const rows = process.argv.includes('--all') ? result.sites : result.plain;
  if (rows.length && (process.argv.includes('--all') || process.argv.includes('--list') || result.plain.length))
    for (const row of rows) console.log(row.file+':'+row.line, row.owner, row.kind);
  if (result.plain.length) process.exitCode = 1;
}
