/** require the same exact arrival policy after its
 * reviewed installed-source move, plus the actual World import binding. */
import assert from 'node:assert/strict';
import ts from 'typescript';
export function assertHistoricalArrivalPolicy(worldText:string,rulesText:string,original:string):void {
 const parse=(s:string)=>ts.createSourceFile('policy.ts',s,99,true),world=parse(worldText),rules=parse(rulesText);
 const declarations=(sf:ts.SourceFile)=>sf.statements.filter(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(sf)==='POCKET_CFG'));
 const old=declarations(world);if(old.length){assert.equal(old.length,1);assert.equal(old[0].getText(world).replaceAll('\r\n','\n'),original);return;}
 const moved=declarations(rules);assert.equal(moved.length,1,'one installed arrival policy');assert.equal(moved[0].getText(rules).replace(/^export /,'').replaceAll('\r\n','\n'),original,'exact original arrival policy');
 const bindings=world.statements.filter(ts.isImportDeclaration).flatMap(n=>n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)?n.importClause.namedBindings.elements.filter(e=>e.name.text==='POCKET_CFG').map(e=>({module:(n.moduleSpecifier as ts.StringLiteral).text,source:e.propertyName?.text??e.name.text})):[]);
 assert.deepEqual(bindings,[{module:'./nativePopulationRules',source:'POCKET_CFG'}],'World reads that exact moved policy');
}
