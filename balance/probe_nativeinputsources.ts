import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {assertNativeInputSource} from './nativeSceneInputFixture';
const file=new URL('../src/engine/nativeSceneInput.ts',import.meta.url),source=fs.readFileSync(file,'utf8');assertNativeInputSource(source);
const sf=ts.createSourceFile('input.ts',source,ts.ScriptTarget.Latest,true),functions=sf.statements.filter(ts.isFunctionDeclaration);let mutations=0,duplicates=0;
for(const fn of functions){assert(fn.body);const at=fn.body.getStart(sf)+1;assert.throws(()=>assertNativeInputSource(source.slice(0,at)+"throw new Error('unauthorized input mutation');"+source.slice(at)));mutations++;assert.throws(()=>assertNativeInputSource(source+'\n'+fn.getText(sf)));duplicates++;}
assert.throws(()=>assertNativeInputSource(source+"\nthrow new Error('outside original functions');"));
console.log(JSON.stringify({functions:functions.length,mutations,duplicates,source:createHash('sha256').update(source).digest('hex'),runtimeAcceptance:false}));
