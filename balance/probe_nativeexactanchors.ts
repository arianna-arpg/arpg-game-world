import assert from 'node:assert/strict';
import {MassNativeGeography,sourceAnchorForNative,mappedSourceAnchor,type MassNativeMapping,type MassNativeRationalAnchor,physicalAnchorForNative,mappedPoint} from '../src/worldmass/nativeGeography';
import {nativeCampaignFixture} from './nativeCombatRetainedFixture';
import {writeCombatProof,combatHash} from './probe_nativecombatcycle';
const {geography}=nativeCampaignFixture(46114),spec=geography.spec.mapping,groups:{name:string;result:unknown}[]=[];
const check=(name:string,fn:()=>unknown)=>groups.push({name,result:fn()??true});
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const target={x:14.917781548997901,y:-3.5202092148481086};
check('genuine failed anchor remains strict raw but has exact separate representation',()=>{
 assert.throws(()=>physicalAnchorForNative(spec,target),/preserve the authoritative/);const anchor=geography.sourceAnchor(target);assert.ok('policy' in anchor);assert.equal(anchor.policy,'mass-native-rational-anchor');assert.deepEqual(geography.nativeSourcePoint(anchor),target);assert.deepEqual(geography.nativeSourcePoint(clone(anchor)),target);assert.throws(()=>geography.nativePoint(anchor as never));assert.ok(Object.isFrozen(anchor)&&Object.isFrozen(anchor.x));return anchor;
});
check('representable source addresses preserve original raw values',()=>{let raw=0,exact=0;for(const x of [0,-55,-35,14.5,.1,-.1,100.1,1000.1,Math.PI,-Math.PI,1/3,-1/3]){const point={x,y:160},anchor=geography.sourceAnchor(point);assert.deepEqual(geography.nativeSourcePoint(anchor),point);try{assert.deepEqual(anchor,geography.physicalAnchor(point));raw++;}catch(error){if(error instanceof assert.AssertionError)throw error;assert.ok('policy' in anchor);exact++;}}return{raw,exact};});
check('signed64 large origins and noninteger ratios retain exact native coordinates',()=>{
 let count=0;for(const [numerator,denominator] of [['1','1'],['3','2'],['20','1'],['1','9223372036854775807'],['9223372036854775807','1']]){const mapping:MassNativeMapping={...spec,physicalOrigin:{...spec.physicalOrigin,cx:'9007199254740993',cy:'-9007199254740993',x:.25,y:959.5},nativeOrigin:{x:-35,y:160},physicalUnitsPerNativeUnit:{numerator,denominator}};for(const point of [target,{x:Number.MIN_VALUE,y:-Number.MIN_VALUE},{x:Math.PI,y:-Math.PI},{x:-35,y:160}]){const anchor=sourceAnchorForNative(mapping,point);assert.deepEqual(mappedSourceAnchor(mapping,clone(anchor)),point);count++;}}return count;
});
check('source serialization uses the unchanged geography bytes and no RNG',()=>{
 const bytes=JSON.stringify(geography.spec),restored=new MassNativeGeography(JSON.parse(bytes)),random=Math.random;Math.random=()=>{throw Error('anchor must not resample');};try{assert.equal(restored.identity,geography.identity);assert.equal(JSON.stringify(restored.spec),bytes);assert.deepEqual(restored.sourceAnchor(target),geography.sourceAnchor(target));return{sourceHash:restored.spec.sourceHash,mappingHash:restored.spec.mappingHash};}finally{Math.random=random;}
});
check('rational schema refuses invalid canonical values and dynamic fields',()=>{
 const valid=geography.sourceAnchor(target) as MassNativeRationalAnchor;
 const mutations:((a:any)=>void)[]=[a=>a.schema=2,a=>a.policy='other',a=>a.dimension='elsewhere',a=>a.cx='00',a=>a.cx='9223372036854775808',a=>a.x.numerator='-1',a=>a.x.numerator='01',a=>a.x.denominator='0',a=>a.x.denominator='02',a=>{a.x.numerator='2';a.x.denominator='2';},a=>{a.x.numerator='960';a.x.denominator='1';},a=>a.x.numerator='1'.repeat(401),a=>a.extra=1,a=>a.x.extra=1];
 for(const mutate of mutations){const input=clone(valid);mutate(input);assert.throws(()=>geography.nativeSourcePoint(input));}
 let reads=0;const dynamic=clone(valid);Object.defineProperty(dynamic.x,'numerator',{get(){reads++;return '1';},enumerable:true});assert.throws(()=>geography.nativeSourcePoint(dynamic));assert.equal(reads,0);assert.throws(()=>geography.sourceAnchor({x:NaN,y:0}));assert.throws(()=>geography.sourceAnchor({x:10001,y:0}));return{refusals:mutations.length+3,getterReads:reads};
});
check('new exact source data cannot be smuggled into raw address or owner APIs',()=>{const anchor=geography.sourceAnchor(target);assert.throws(()=>geography.ownerContext('bad',anchor as never));assert.throws(()=>mappedPoint(spec,anchor as never));assert.deepEqual(sourceAnchorForNative(spec,{x:0,y:0}),spec.physicalOrigin);return true;});
const report={groups,receipt:combatHash(JSON.stringify(groups))};writeCombatProof('native-exact-anchors.json',report);console.log(JSON.stringify(report));
