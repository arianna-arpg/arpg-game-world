import assert from 'node:assert/strict';
import {nativeShardsNear96FS as fs} from './nativeShardsCompositionFixture';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {nativeNearScaleSelectionArchive as row} from './nativeNearScaleSelectionArchive';
import {beforeNearScaleSelection} from './nativeNearScaleSelectionFixture';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex'),read=(file:string)=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'),source=read(row.file),original=read('src/engine/nativeScenePopulation.ts'),parse=(text:string)=>ts.createSourceFile('source.ts',text,99,true),find=(sf:ts.SourceFile,name:string)=>{const nodes=sf.statements.filter((n):n is ts.FunctionDeclaration=>ts.isFunctionDeclaration(n)&&n.name?.text===name);assert.equal(nodes.length,1);assert(nodes[0].body);return nodes[0];};
assert.equal(hash(source),row.afterHash);assert.equal(beforeNearScaleSelection(row.file,source),row.before);assert.equal(beforeNearScaleSelection(row.file,row.before),row.before);assert.equal(beforeNearScaleSelection('unlisted.ts','raw\r\n'),'raw\r\n');
const current=parse(source),old=parse(original),helper=find(current,'applyAdmittedNearScale'),body=helper.body!.getText(current),native=find(old,'applyScenePartyScale').body!.getText(old);
const prefix=`{
    const assertActor = nativeHost.assertNearScaleActor;
    if (!assertActor) { applyScenePartyScale(host, a); return; }
    const checkSheet = (sheet:Actor['sheet']):void => {
      Reflect.apply(assertActor, nativeHost, [a]);
      const current = a.sheet;
      Reflect.apply(assertActor, nativeHost, [a]);
      if (current !== sheet) throw Error('Native near-scale actor sheet changed during selection');
    };
`;
assert(body.startsWith(prefix),'Complete finite admission prefix');let recovered='{\n'+body.slice(prefix.length);
const replace=(from:string,to:string)=>{assert.equal(recovered.split(from).length,2,'Exact helper-body seam');recovered=recovered.replace(from,to);};
replace('    Reflect.apply(assertActor, nativeHost, [a]);\n','');
replace(`      const sheet = a.sheet, setSource = sheet.setSource;
      const args:Parameters<typeof sheet.setSource> = ['partyScale', [mod('life', 'more', s.life), mod('damage', 'more', s.damage)]];
      checkSheet(sheet);
      Reflect.apply(setSource, sheet, args);
      checkSheet(sheet);`,"      a.sheet.setSource('partyScale', [mod('life', 'more', s.life), mod('damage', 'more', s.damage)]);");
replace(`      const sheet = a.sheet, removeSource = sheet.removeSource;
      checkSheet(sheet);
      Reflect.apply(removeSource, sheet, ['partyScale']);
      checkSheet(sheet);`,"      a.sheet.removeSource('partyScale');");
assert.equal(recovered,native,'Whole original native helper body, arguments, branch order and receivers');
let mutations=0;for(const fragment of ['      checkSheet(sheet);','      Reflect.apply(setSource, sheet, args);',"      Reflect.apply(removeSource, sheet, ['partyScale']);",'      const current = a.sheet;']){assert(source.includes(fragment));assert.throws(()=>beforeNearScaleSelection(row.file,source.replace(fragment,fragment.replace(/\S/,'!'))));mutations++;}
for(const at of [0,Math.floor(source.length/2),source.length-1]){assert.throws(()=>beforeNearScaleSelection(row.file,source.slice(0,at)+'!'+source.slice(at+1)));mutations++;}assert.throws(()=>beforeNearScaleSelection(row.file,source+source));assert.throws(()=>beforeNearScaleSelection(row.file,source+'\n// unknown\n'));
for(const variant of [source.replaceAll('\n','\r\n'),source.replaceAll('\n','\r')])assert.equal(beforeNearScaleSelection(row.file,variant),row.before);
const result={source:hash(source),originalHelper:hash(native),wholeHelperBody:true,unguardedNativePath:true,mutations,duplicateRefused:true,outsideRefused:true,eolVariants:2};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-near-scale-selection-source.json',import.meta.url),JSON.stringify({result,receipt:hash(JSON.stringify(result))},null,2)+'\n');console.log(JSON.stringify(result));
