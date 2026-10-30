import assert from 'node:assert/strict';
import ts from 'typescript';
/** Only the new paint-only return marker in its unused state is projected. */
export function assertMainCastActorSlot(source:string):void {
 const sf=ts.createSourceFile('actor.ts',source,ts.ScriptTarget.Latest,true),classes=sf.statements.filter((n):n is ts.ClassDeclaration=>ts.isClassDeclaration(n)&&n.name?.text==='Actor');assert.equal(classes.length,1);
 const members=classes[0].members,index=members.findIndex(n=>n.name?.getText(sf)==='companionReturnTo');assert(index>0);assert.equal(members.filter(n=>n.name?.getText(sf)==='companionReturnTo').length,1);assert.equal(members[index].getText(sf),'companionReturnTo?: number;');assert.equal(members[index-1].name?.getText(sf),'decay');assert.equal(members[index+1].name?.getText(sf),'recallTimer');
}
export function beforeMainCastActorSlot<T>(receipt:T):T {
 const visit=(v:any):any=>{if(!v||typeof v!=='object')return v;
  if(v.version===1&&Object.hasOwn(v,'root')&&Array.isArray(v.nodes)){
   assert.deepEqual(Object.keys(v),['version','root','nodes']);assert.deepEqual(v.root,{ref:0});assert(v.nodes[0]?.kind==='object');
   const entries=v.nodes[0].entries,indices=entries.map(([k]:any[],i:number)=>k==='companionReturnTo'?i:-1).filter((i:number)=>i>=0);assert.equal(indices.length,1,'exact one current return marker');const i=indices[0];assert.equal(entries[i-1]?.[0],'decay');assert.equal(entries[i+1]?.[0],'recallTimer');assert.deepEqual(entries[i][1],{special:'undefined'},'active return marker cannot be projected');
   return {...v,nodes:[{...v.nodes[0],entries:entries.filter((_:unknown,index:number)=>index!==i)},...v.nodes.slice(1)]};
  }
  return Array.isArray(v)?v.map(visit):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));
 };return visit(receipt);
}
