/** The original history receipt predates four actor slots. Only their exact
 * unused values can be projected away; current raw lane equality stays intact. */
import assert from 'node:assert/strict';
import ts from 'typescript';
const fields=[
 {name:'resourceFlows',before:'restoreGains',after:'anatomyCues',source:"resourceFlows: import('./feedingCues').ResourceFlowCue[] = [];",emptyArray:true},
 {name:'relicEffectsSuppressed',before:'cosmeticKind',after:'aiCooldown',source:'relicEffectsSuppressed?: boolean;',emptyArray:false},
 {name:'selfBankCues',before:'ironWard',after:'presenceBadge',source:"selfBankCues?: import('./skillSelfVisual').SelfBankCue[];",emptyArray:false},
 {name:'presenceBadge',before:'selfBankCues',after:'chargeState',source:"presenceBadge?: import('../data/skillPresenceVisuals').PresenceBadge;",emptyArray:false},
] as const;
export function assertHistoricalActorSlots(text:string):void {
 const tree=ts.createSourceFile('actor.ts',text,ts.ScriptTarget.Latest,true),classes=tree.statements.filter((n):n is ts.ClassDeclaration=>ts.isClassDeclaration(n)&&n.name?.text==='Actor');assert.equal(classes.length,1);
 const members=classes[0].members;for(const field of fields){const selected=members.filter(n=>n.name?.getText(tree)===field.name);assert.equal(selected.length,1);assert(ts.isPropertyDeclaration(selected[0]));assert.equal(selected[0].getText(tree).replaceAll('\r\n','\n'),field.source,'exact historical actor slot '+field.name);}
}
export function beforeHistoricalActorSlots<T>(receipt:T):T {
 const visit=(value:any):any=>{
  if(!value||typeof value!=='object')return value;
  if(value.version===1&&Object.hasOwn(value,'root')&&Array.isArray(value.nodes)){
   assert.deepEqual(Object.keys(value),['version','root','nodes'],'exact captured actor envelope');assert.deepEqual(value.root,{ref:0});const nodes=value.nodes;assert(nodes.length>0&&nodes.length<=16384);assert.equal(nodes[0].kind,'object');
   const root=nodes[0],removed=new Set(fields.map(f=>f.name)),indices=new Set<number>();
   for(const field of fields){const matches=root.entries.map(([k]:any[],i:number)=>k===field.name?i:-1).filter((i:number)=>i>=0);assert.equal(matches.length,1,'one current actor slot '+field.name);const i=matches[0];assert.equal(root.entries[i-1]?.[0],field.before);assert.equal(root.entries[i+1]?.[0],field.after);const v=root.entries[i][1];if(field.emptyArray){assert(v&&typeof v==='object');assert.deepEqual(Object.keys(v),['ref']);assert(Number.isSafeInteger(v.ref)&&v.ref>0&&v.ref<nodes.length);assert.deepEqual(nodes[v.ref],{kind:'array',entries:[]});indices.add(v.ref);}else assert.deepEqual(v,{special:'undefined'},'unused current actor slot '+field.name);}
   const reencode=(omit:boolean)=>{const mapped=new Map<number,number>(),out:any[]=[];const rewrite=(v:any):any=>{if(!v||typeof v!=='object'||!Object.hasOwn(v,'ref'))return v;assert.deepEqual(Object.keys(v),['ref']);assert(Number.isSafeInteger(v.ref)&&v.ref>=0&&v.ref<nodes.length);if(omit)assert(!indices.has(v.ref),'removed empty slot must not be aliased');if(mapped.has(v.ref))return{ref:mapped.get(v.ref)};const source=nodes[v.ref];assert.deepEqual(Object.keys(source),['kind','entries']);assert(['object','array','map','set','float64','sheet'].includes(source.kind));assert(Array.isArray(source.entries));const index=out.length,node={kind:source.kind,entries:[] as any[]};mapped.set(v.ref,index);out.push(node);for(const pair of source.entries){assert(Array.isArray(pair)&&pair.length===2);const[k,x]=pair;if(omit&&v.ref===0&&removed.has(k))continue;node.entries.push([rewrite(k),rewrite(x)]);}return{ref:index};};return{version:1,root:rewrite(value.root),nodes:out};};
   assert.deepEqual(reencode(false),value,'canonical complete captured graph');const projected=reencode(true);assert.equal(projected.nodes.length,nodes.length-indices.size,'only exact unused slot nodes removed');return projected;
  }
  if(Array.isArray(value))return value.map(visit);return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,visit(v)]));
 };return visit(receipt);
}
