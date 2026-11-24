/** Inventory the emitters underneath the skill catalogs. --list prints every plain flash with its source. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url));
const coveredModules = new Set(['assault','attackSequences','challenges','cohortArts','companionBonds','guardArts']
  .map(name => 'engine/' + name + '.ts'));
const coveredWorldMethods = new Set(['explodeProjectile','interceptProjectileDomes','updateProjectiles','updateZones']);
const diagnosticFields = new Set(['mechanicLink','companionCue','combatCue','defenseCue','movement','lightning',
  'bolt','meteor','beam','feedingCue','cosmeticMotif','anatomy','arc','haze']);

function classify(expression, file) {
  if (!expression || !ts.isObjectLiteralExpression(expression)) return 'delegated';
  const keys = expression.properties.map(property => property.name?.getText(file));
  if (keys.includes('fx')) return 'keyed';
  if (keys.some(key => diagnosticFields.has(key))) return 'specialized';
  if (expression.properties.some(ts.isSpreadAssignment)) return 'composed';
  return 'plain';
}

export function auditCombatFlashes() {
  const totals = {}, plain = [];
  for (const local of fs.readdirSync(sourceRoot, {recursive:true}).sort()) {
    if (!local.endsWith('.ts')) continue;
    const source = fs.readFileSync(path.join(sourceRoot,local),'utf8');
    if (!source.includes('flashes.push')) continue;
    const file = ts.createSourceFile(local,source,ts.ScriptTarget.Latest,true);
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === 'push' && node.expression.expression.getText(file).endsWith('.flashes')) {
        for (const arg of node.arguments) {
          const kind = classify(arg,file);
          totals[kind] = (totals[kind] ?? 0) + 1;
          if (kind !== 'plain') continue;
          let parent = node.parent;
          while (parent && !ts.isMethodDeclaration(parent) && !ts.isFunctionDeclaration(parent)) parent=parent.parent;
          plain.push({file:local.replaceAll('\\','/'),line:file.getLineAndCharacterOfPosition(arg.getStart(file)).line+1,
            owner:parent?.name?.getText(file) ?? '(callback)'});
        }
      }
      ts.forEachChild(node,visit);
    }
    visit(file);
  }
  return {totals,plain,regressions:plain.filter(row=>coveredModules.has(row.file)
    || (row.file==='engine/world.ts' && coveredWorldMethods.has(row.owner)))};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditCombatFlashes();
  console.log('Flash arguments across src:',result.totals);
  if (process.argv.includes('--list')) for (const row of result.plain) console.log(row.file+':'+row.line,row.owner);
  if (result.regressions.length) { console.error('Unkeyed effects in covered combat paths:',result.regressions); process.exitCode=1; }
}
