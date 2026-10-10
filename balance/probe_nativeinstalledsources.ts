/** Installed native source parity, direct cold bootstrap, and live provider scope. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {build} from 'esbuild';
import {nativeInstalledSourcesArchive as archive,nativeInstalledSourcesArchiveHash,nativeInstalledBootstrapRoots,nativeInstalledOriginalBootHash,nativeInstalledOtherWorldHash} from './nativeInstalledSourcesArchive';
import {beforeNativeInstalledSources} from './nativeInstalledSourceFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const emit=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;
const read=(p:string)=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const parse=(p:string)=>ts.createSourceFile(p,read(p),99,true);
const object=(n:ts.Node)=>{let result:ts.ObjectLiteralExpression|undefined;const visit=(x:ts.Node)=>{if(!result&&ts.isObjectLiteralExpression(x))result=x;ts.forEachChild(x,visit);};visit(n);assert.ok(result);return result;};
const cold=process.argv.find(s=>s.startsWith('--installed-cold='))?.split('=')[1];
if(cold){
 const {installHeadlessShims}=await import('../src/sim/shims');installHeadlessShims();
 // These processes have mutually exclusive boot roots. No prior World import in the standalone lane.
 if(cold==='world'){await import('../src/worldmass/nativeBootstrap');await import('../src/engine/world');}else await import('../src/worldmass/nativeAreaInstalledSources');
 const {registerAllPackageFactions}=await import('../src/packages/factionGen');registerAllPackageFactions();
 const {captureNativeGeographySource}=await import('../src/world/captureGeography');
 const {FACTIONS,MONSTERS}=await import('../src/data/monsters');const {PACKAGES}=await import('../src/packages/registry');
 const {theaterKinds}=await import('../src/engine/theater');const {genPins}=await import('../src/engine/genPins');
 const {CONVERT_RULES}=await import('../src/engine/skills');const {doodadFamilyIndex,doodadFamilyCount}=await import('../src/engine/doodadFamilies');
 const {SYMPATHY_HOOKS}=await import('../src/engine/sympathy');
 const {LIGHTWELLS}=await import('../src/engine/lightwells');const {speechTemplates,hauntPhraseKinds}=await import('../src/engine/speechGrammar');const {trackRiderIds}=await import('../src/engine/tracks');const {doodadRuleKinds,layoutIds}=await import('../src/engine/levelgen');
 const data={lightwells:Object.keys(LIGHTWELLS),speech:speechTemplates(),haunts:hauntPhraseKinds(),tracks:trackRiderIds(),doodads:doodadRuleKinds(),layouts:layoutIds(),geography:captureNativeGeographySource(991),factions:Object.keys(FACTIONS),monsters:Object.keys(MONSTERS),packages:PACKAGES.map(p=>p.id),theater:theaterKinds().map(k=>k.id),pins:[...genPins()].sort((a,b)=>(a.registry+'/'+a.id).localeCompare(b.registry+'/'+b.id)),conversions:Object.keys(CONVERT_RULES),families:{count:doodadFamilyCount(),nav:doodadFamilyIndex('nav-block'),veil:doodadFamilyIndex('veil')},npc:!!SYMPATHY_HOOKS.isNpc};
 const {validateContent}=await import('../src/data/validate');const warnings:string[]=[];const warn=console.warn;console.warn=(...a)=>warnings.push(a.join(' '));try{validateContent();}finally{console.warn=warn;}
 console.log('INSTALLED_COLD '+JSON.stringify({data,warnings}));
}else{
 assert.equal(hash(JSON.stringify(archive)),nativeInstalledSourcesArchiveHash);
 const world=read('src/engine/world.ts');const before=ts.createSourceFile('world.ts',beforeNativeInstalledSources(world),99,true),oldWorld=before.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;assert.equal(hash(JSON.stringify(oldWorld.members.map(m=>m.getText(before).replaceAll('\r\n','\n')))),nativeInstalledOtherWorldHash,'every other World member stays unchanged');
 const rootFile=parse('src/engine/nativeSceneBootstrap.ts');const roots=rootFile.statements.filter(ts.isImportDeclaration).map(n=>(n.moduleSpecifier as ts.StringLiteral).text);assert.deepEqual(roots,nativeInstalledBootstrapRoots.filter(p=>!['../meta/character','../worldmass/runtime'].includes(p)),'complete original import roots except the explicit save-restoration owners');
 const sources=parse('src/engine/nativeSceneSources.ts'),config=parse('src/engine/nativeSceneConfig.ts'),rules=parse('src/engine/nativePopulationRules.ts');
 const functions=['installedNativeFactorySources','installedNativePromotionSources','installedNativePopulationSources','installedNativeHostilitySources','installedNativeRelaySources','installedNativeExitSources','installedNativeRuntimeSources','installedNativeCoastSources','installedNativeInhabitantSources','installedNativeEcologySources','installedNativeEnvironmentSources'];
 for(let i=0;i<functions.length;i++){
  const old=ts.createSourceFile('old.ts','class Old{'+archive.rows[i].before+'}',99,true),fn=sources.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===functions[i]);assert.ok(fn);
  assert.equal(emit('const sources='+object(fn).getText()),emit('const sources='+object(old).getText().replace('World.CAVE_POOL_SALT','CAVE_POOL_SALT')),functions[i]+' complete original provider');
 }
 const oldAmbient=object(ts.createSourceFile('old.ts','class A{'+archive.ambient+'}',99,true));
 const newAmbient=object(sources.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installedNativeAmbientSources')!);
 const oldGroups=object(ts.createSourceFile('old.ts','class A{'+archive.groups+'}',99,true));
 const newGroups=object(sources.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='installedNativeGroupSources')!);
 for(const [previous,current,keys]of [[oldAmbient,newAmbient,['config','random','rand','randInt','monster','rollPackSize','rollRarity','magicPackPool','magicPackSize','rollMagicPack','storyTable','tierFloorAt','encounterGroupContext','rollEncounterGroup','presenceMul']],[oldGroups,newGroups,['config','group','encounterGroupContext','planEncounterGroup','applyEncounterGroup']]] as const){
  for(const key of keys){const before=previous.properties.find(p=>p.name?.getText()===key),after=current.properties.find(p=>p.name?.getText()===key);assert.ok(before);assert.ok(after);assert.equal(emit('const p={'+after.getText()+'}').replace(/\s+/g,' '),emit('const p={'+before.getText()+'}').replace(/\s+/g,' '),'native population provider '+key);}
 }
 for(const [name,text]of Object.entries(archive.declarations)){
  const st=[...config.statements,...rules.statements].find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText()===name));assert.ok(st,name);
  assert.equal(emit(st.getText().replace(/^export /,'')),emit(text.replace(/^export /,'')),name+' original native tuning');
 }
 for(const [name,text]of Object.entries(archive.helpers)){
  const st=[...config.statements,...rules.statements].find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.ok(st);
  assert.equal(emit(st.getText().replace(/^export /,'')),emit(text.replace(/^export /,'')),name+' original native helper');
 }
 const weighted=rules.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='nativeWeightedPick') as ts.FunctionDeclaration;
 const oldWeighted=(ts.createSourceFile('old.ts','class A{'+archive.rows.find(r=>r.name==='weightedPick')!.before+'}',99,true).statements[0] as ts.ClassDeclaration).members[0] as ts.MethodDeclaration;
 assert.equal(emit('function f'+weighted.getText().slice('export function nativeWeightedPick'.length)),emit('function f'+oldWeighted.getText().slice('private weightedPick'.length)));
 const registrations=parse('src/engine/nativeSceneRegistration.ts').statements.filter(n=>!ts.isImportDeclaration(n)).map(n=>emit(n.getText()));
 assert.deepEqual(registrations,archive.regs.map(s=>emit(s.replace(/^const FAM_NAV_BLOCK = /,'').replace(/^const FAM_VEIL = /,''))));
 const salt=rules.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText()==='CAVE_POOL_SALT')) as ts.VariableStatement;
 assert.equal(salt.declarationList.declarations[0].initializer!.getText(),'0xca9e51');
 // A bundled entry must not pull the World class, sim arena, or main client in through a transitive value import.
 const bundled=await build({entryPoints:['src/worldmass/nativeAreaInstalledSources.ts'],bundle:true,platform:'node',format:'esm',write:false,metafile:true,logLevel:'silent'});
 assert.ok(!Object.keys(bundled.metafile!.inputs).some(p=>/src\/(engine\/world|sim\/arena|main)\.ts$/.test(p.replaceAll('\\','/'))),'standalone source graph cannot hide World bootstrap');
 const receipts=[];
 for(const lane of ['world','standalone']){const r=spawnSync(process.execPath,['--import','tsx',fileURLToPath(import.meta.url),'--installed-cold='+lane],{encoding:'utf8',maxBuffer:32e6});assert.equal(r.status,0,r.stderr+'\n'+r.stdout);const line=r.stdout.split(/\r?\n/).find(s=>s.startsWith('INSTALLED_COLD '));assert.ok(line);receipts.push(JSON.parse(line.slice(15)));}
 assert.deepEqual(receipts[1],receipts[0],'standalone registration inventory and validation must match real World boot');
 assert.equal(hash(JSON.stringify(receipts[1])),nativeInstalledOriginalBootHash,'unchanged pre-validation inventory/order from verified original committed snapshot');
 const {installedNativeAreaSources,installedNativeAreaConfig}=await import('../src/worldmass/nativeAreaInstalledSources');
 const calls:unknown[]=[];const campaign={sim:{name:'first',packageActive(this:{name:string},id:string,level:number){calls.push([this.name,id,level]);return true;}},notice(...a:unknown[]){assert.equal(this,campaign);calls.push(a);}};
 const source=installedNativeAreaSources(campaign as unknown as Parameters<typeof installedNativeAreaSources>[0]);
 source.population.ambient.packageActive('first',7);campaign.sim={name:'replacement',packageActive:campaign.sim.packageActive};source.population.ambient.packageActive('second',11);source.population.ambient.notice('actual', '#fff',12,'war');
 assert.deepEqual(calls,[['first','first',7],['replacement','second',11],['actual','#fff',12,'war']]);
 const original=Math.random;const rng=()=>.125;try{Math.random=rng;assert.equal(source.population.ambient.random,rng);assert.equal(source.population.factory.random,rng);assert.equal(source.population.promotion.random,rng);assert.equal(source.inhabitants.nativeInhabitantSources.random,rng);}finally{Math.random=original;}
 const {NAV_CFG}=await import('../src/engine/nativeSceneConfig');const configView=installedNativeAreaConfig(),pad=NAV_CFG.pad;try{NAV_CFG.pad=pad+3;assert.equal(configView.navigationPad,pad+3);}finally{NAV_CFG.pad=pad;}
 const {POCKET_CFG}=await import('../src/engine/nativePopulationRules');const grace=POCKET_CFG.arrivalGrace;assert.equal(configView.arrivalGrace,300);try{POCKET_CFG.arrivalGrace=grace+17;assert.equal(configView.arrivalGrace,grace+17);}finally{POCKET_CFG.arrivalGrace=grace;}
 const {MONSTERS}=await import('../src/data/monsters');assert.equal(source.population.factory.MONSTERS,MONSTERS);assert.equal(source.runtime.MONSTERS,MONSTERS);assert.equal(source.populationResolution.MONSTERS,MONSTERS);
 console.log('PASS NativeInstalledSources: 11 original providers, 19 tunables, original helpers/registrations, two independent cold boots, live callbacks/config/RNG; receipt '+hash(JSON.stringify(receipts[0])));
}
