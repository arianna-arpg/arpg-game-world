import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';
import {createHash} from 'node:crypto';
import {diskPutRaw,diskPut,diskBeacon,suppressSaves} from '../src/meta/persistence';
const require=createRequire(import.meta.url),root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),scratch=path.join(root,'balance/reports/save-write-order-'+process.pid);
fs.mkdirSync(scratch,{recursive:true});const actualFetch=globalThis.fetch,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
type Endpoint={name:string;url:string;server:http.Server;saves:string;close():Promise<void>};
type Held={url:string;body:string;finish():void;response:Promise<Response>;started:Promise<void>};
function send(endpoint:Endpoint,url:string,body:string,hold=false):Held {
 let finish=()=>{},ready!:()=>void;const started=new Promise<void>(resolve=>ready=resolve);
 const response=new Promise<Response>((resolve,reject)=>{const req=http.request(new URL(url,endpoint.url),{method:'POST',headers:{'content-type':'application/json','content-length':Buffer.byteLength(body)}},res=>{let output='';res.setEncoding('utf8');res.on('data',chunk=>output+=chunk);res.on('end',()=>resolve(new Response(output,{status:res.statusCode})));});req.on('error',reject);
 const observe=(incoming:http.IncomingMessage)=>{if(incoming.url===url){endpoint.server.off('request',observe);ready();}};endpoint.server.on('request',observe);finish=()=>req.end(body.slice(1));req.write(body.slice(0,1));if(!hold)finish();});return{url,body,finish:()=>finish(),response,started};
}
const observations:unknown[]=[];
async function exercise(endpoint:Endpoint){
 let selectedHold=false,held:Held|undefined;const pending:Promise<unknown>[]=[],urls:string[]=[];
 globalThis.fetch=(input,init)=>{assert.equal(typeof input,'string');const url=String(input);if(init?.method==='POST'){urls.push(url);const body=String(init.body);if(body.includes('fail-fetch'))return Promise.reject(new Error('selected fetch failure'));if(selectedHold){selectedHold=false;held=send(endpoint,url,body,true);return held.response;}}return actualFetch(new URL(url,endpoint.url),init);};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{sendBeacon:(url:string,data:string)=>{urls.push(url);const sent=send(endpoint,url,data);pending.push(sent.response);return true;}}});
 const read=(slot:string)=>fs.readFileSync(path.join(endpoint.saves,'save_'+slot+'.json'),'utf8');
 const latest=' {"marker":"newer-fetch","exact":[1,2]}\n';selectedHold=true;const older=diskPutRaw('order_probe','{"marker":"older-fetch"}');assert(held);await held.started;await diskPutRaw('order_probe',latest);held.finish();await older;assert.equal(read('order_probe'),latest,'newer fetch survives earlier body finishing last');
 const firstUrl=new URL(urls[0],endpoint.url),secondUrl=new URL(urls[1],endpoint.url);assert.equal(firstUrl.searchParams.get('writer'),secondUrl.searchParams.get('writer'));assert.equal(Number(secondUrl.searchParams.get('sequence')),Number(firstUrl.searchParams.get('sequence'))+1);
 selectedHold=true;const pendingOld=diskPutRaw('order_probe','{"marker":"before-unload"}');assert(held);await held.started;const beaconBody='{"marker":"newer-unload","dead":true}';diskBeacon('order_probe',beaconBody);await Promise.all(pending.splice(0));held.finish();await pendingOld;assert.equal(read('order_probe'),beaconBody,'newer unload beacon survives earlier fetch finishing last');
 let refusedBeaconUrl='';Object.defineProperty(globalThis,'navigator',{configurable:true,value:{sendBeacon:(url:string)=>{refusedBeaconUrl=url;return false;}}});diskBeacon('order_probe','{"marker":"beacon-fallback"}');for(let i=0;i<100&&read('order_probe')!== '{"marker":"beacon-fallback"}';i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(read('order_probe'),'{"marker":"beacon-fallback"}');assert.equal(urls.at(-1),refusedBeaconUrl,'fallback preserves exact selected sequence');
 await diskPutRaw('order_probe','{"marker":"fail-fetch"}');await diskPutRaw('order_probe','{"marker":"recovered"}');assert.equal(read('order_probe'),'{"marker":"recovered"}');
 const writer=secondUrl.searchParams.get('writer')!,ordered=(slot:string,n:number)=>'/__save/'+slot+'?writer='+writer+'&sequence='+n;
 const newBeforeOld=await actualFetch(new URL(ordered('arrival_order',2),endpoint.url),{method:'POST',body:'{"new":2}'});assert.equal(newBeforeOld.status,200);await actualFetch(new URL(ordered('arrival_order',1),endpoint.url),{method:'POST',body:'{"old":1}'});assert.equal(read('arrival_order'),'{"new":2}','sequence wins even when headers arrive reversed');
 await actualFetch(new URL(ordered('arrival_order',2),endpoint.url),{method:'POST',body:'{"duplicate":2}'});assert.equal(read('arrival_order'),'{"new":2}','duplicate sequence cannot replace acknowledged bytes');
 assert.equal((await actualFetch(new URL(ordered('arrival_order',4),endpoint.url),{method:'POST',body:'invalid JSON'})).status,400);await actualFetch(new URL(ordered('arrival_order',3),endpoint.url),{method:'POST',body:'{"valid":3}'});assert.equal(read('arrival_order'),'{"valid":3}','invalid newer payload does not reserve a committed revision');
 await diskPutRaw('another_slot','{"separate":1}');assert.equal(read('another_slot'),'{"separate":1}');
 const legacy=' {"legacy":"tool bytes"}\n';await actualFetch(new URL('/__save/tool_probe',endpoint.url),{method:'POST',body:legacy});assert.equal(read('tool_probe'),legacy);
 for(const suffix of ['?writer='+writer,'?sequence=1','?writer=bad&sequence=1','?writer='+writer+'&sequence=0','?writer='+writer+'&sequence=9007199254740992','?writer='+writer+'&writer='+writer+'&sequence=9'])assert.equal((await actualFetch(new URL('/__save/arrival_order'+suffix,endpoint.url),{method:'POST',body:'{"refused":true}'})).status,400);
 assert.equal(read('arrival_order'),'{"valid":3}');assert.equal((await actualFetch(new URL('/__save/bad.slot',endpoint.url),{method:'POST',body:'{}'})).status,endpoint.name==='launcher'?405:404);
 // Real filesystem failure: the slot path is temporarily a directory. Neither
 // endpoint may advance the committed sequence before writeFileSync succeeds.
 fs.mkdirSync(path.join(endpoint.saves,'save_disk_failure.json'));assert.equal((await actualFetch(new URL(ordered('disk_failure',7),endpoint.url),{method:'POST',body:'{"failed":7}'})).status,400);fs.rmdirSync(path.join(endpoint.saves,'save_disk_failure.json'));assert.equal((await actualFetch(new URL(ordered('disk_failure',7),endpoint.url),{method:'POST',body:'{"retry":7}'})).status,200);assert.equal(read('disk_failure'),'{"retry":7}');
 return {endpoint:endpoint.name,lateFetch:true,lateFetchAfterBeacon:true,beaconFallbackSameSequence:true,fetchFailureRecovery:true,reversedHeaderArrival:true,duplicateRefused:true,invalidNewerDoesNotCommit:true,slotIsolation:true,legacyBytes:true,malformedRefusals:6,diskFailureRetry:true};
}
async function launcher():Promise<Endpoint>{const modulePath=process.argv.includes('--old-launcher')?path.resolve(root,'../preimages/launcher/server.cjs'):path.join(root,'launcher/server.cjs');const api=require(modulePath) as {startGameServer(options:{root:string;savesDir:string;port:number}):Promise<{server:http.Server;url:string}>};const saves=path.join(scratch,'launcher/saves');const server=await api.startGameServer({root,savesDir:saves,port:0});return{name:'launcher',...server,saves,close:()=>new Promise((resolve,reject)=>server.server.close(error=>error?reject(error):resolve()))};}
async function vite():Promise<Endpoint>{const cwd=process.cwd(),directory=path.join(scratch,'vite');fs.mkdirSync(directory,{recursive:true});let server;try{process.chdir(directory);server=await createViteServer({configFile:path.join(root,'vite.config.ts'),root,logLevel:'silent',server:{host:'127.0.0.1',port:0,strictPort:false}});}finally{process.chdir(cwd);}await server.listen();const httpServer=server.httpServer!;assert(httpServer instanceof http.Server);const address=httpServer.address();assert(address&&typeof address==='object');return{name:'vite',url:'http://127.0.0.1:'+address.port,server:httpServer,saves:path.join(directory,'saves'),close:()=>server.close()};}
try{for(const create of [launcher,vite]){const endpoint=await create();try{observations.push(await exercise(endpoint));}finally{await endpoint.close();}}
 // The existing fatal latch still refuses ordinary fetch and beacon writers;
 // import's deliberate awaited primitive remains latch-free.
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('{}');};Object.defineProperty(globalThis,'navigator',{configurable:true,value:{sendBeacon:()=>{calls++;return true;}}});suppressSaves('ordering proof final stand-down');diskPut(1,'{}');diskBeacon(1,'{}');assert.equal(calls,0);await diskPutRaw(1,'{}');assert.equal(calls,1);observations.push({fatalStandDown:true,rawImportLane:true});
 const report={scope:'Real launcher and Vite endpoints; per-page per-slot fetch/beacon ordering. Independent writer arbitration and transport authentication are not claimed; save body, slot grammar and caller authority remain unchanged.',observations,receipt:createHash('sha256').update(JSON.stringify(observations)).digest('hex')};fs.writeFileSync(path.join(root,'balance/reports/native-save-write-order.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{globalThis.fetch=actualFetch;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete (globalThis as {navigator?:Navigator}).navigator;}
