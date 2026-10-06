// Hidden Chromium test of the real browser database, served from a fresh local
// origin. This creates only its named throwaway database and localStorage keys.
const {app,BrowserWindow}=require('electron');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const os=require('node:os');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'hollow-wake-run-store-probe-')));
app.disableHardwareAcceleration();
const source=fs.readFileSync(path.join(__dirname,'../src/meta/browserRunStore.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/store.js'?'text/javascript':'text/html');res.end(req.url==='/store.js'?js:'<!doctype html><title>Run storage probe</title>');});
(async()=>{
 await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const win=new BrowserWindow({show:false,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 await win.loadURL('http://127.0.0.1:'+server.address().port);
 const report=await win.webContents.executeJavaScript('('+browserTest.toString()+')()');
 for(const line of report)console.log(line);win.destroy();server.close();app.exit(0);
})().catch(error=>{console.error(error);server.close();app.exit(1);});
async function browserTest(){
 const {BrowserRunStore,isBrowserRunReference}=await import('/store.js');
 const ok=(value,message)=>{if(!value)throw Error(message);};
 const rejected=async(p,message)=>{let did=false;try{await p;}catch{did=true;}ok(did,message);};
 const report=[],dbName='hollow-wake-run-probe-'+Date.now(),key='probe/character';
 let committed='';const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,...args){this.transaction.addEventListener('complete',()=>{committed=value.key;},{once:true,capture:true});return put.call(this,value,...args);};
 const refs={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>{localStorage.setItem(k,v);}};
 const store=new BrowserRunStore({dbName,references:refs,maxPendingKeys:2});
 localStorage.setItem(key,'old valid small save');const large=JSON.stringify({world:'x'.repeat(8*1024*1024),visit:1});
 const first=store.write(key,large);ok(store.peek(key)===large,'session cache updates synchronously');ok(localStorage.getItem(key)==='old valid small save','old cache remains before commit');
 const commit=await first;await store.flush();ok(commit.revision===1&&commit.referenced,'first durable commit');ok(localStorage.getItem(key).length<300,'small reference replaces quota-sized body');ok(isBrowserRunReference(JSON.parse(localStorage.getItem(key))),'reference format');
 const reader=new BrowserRunStore({dbName});let read=await reader.read(key);ok(read.status==='value'&&read.body===large,'fresh Continue restores 8MiB body');await reader.close();
 report.push('PASS actual Chromium IndexedDB preserves an 8MiB run, synchronous current cache, and reference only after commit');
 const pending=[];for(let i=0;i<100;i++)pending.push(store.write(key,JSON.stringify({visit:i})));
 ok(store.pendingKeys===1,'same-key writes are bounded and coalesced');ok(pending.every(p=>p===pending[0]),'coalescing has no unbounded promise waiters');await pending[0];await store.flush();read=await store.read(key);ok(read.status==='value'&&JSON.parse(read.body).visit===99&&read.revision===2,'latest queued body wins once');
 const one=store.write('probe/a','a'),two=store.write('probe/b','b');await rejected(store.write('probe/c','c'),'queue overflow explicit');await Promise.all([one,two]);await store.flush();
 report.push('PASS coalesced writes retain latest intent, monotonic revisions and bounded pending keys');
 const raw=await new Promise((resolve,reject)=>{const r=indexedDB.open(dbName,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 const alter=(k,fn)=>new Promise((resolve,reject)=>{const tx=raw.transaction('runs','readwrite'),s=tx.objectStore('runs'),r=s.get(k);r.onsuccess=()=>{const v=r.result;fn(v);s.put(v);};tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});
 await alter(key,r=>{r.current.body='corrupted';});read=await store.read(key);ok(read.status==='value'&&read.body===large&&read.recovered,'previous good revision recovers corrupted newest body');
 await store.write(key,null);await store.flush();read=await store.read(key);ok(read.status==='deleted','tombstone wins over retained previous body');
 await alter(key,r=>{r.current.checksum='damaged';});read=await store.read(key);ok(read.status==='corrupt','damaged tombstone cannot resurrect prior run');
 report.push('PASS previous-good recovery, authoritative deletion and damaged-tombstone anti-resurrection');
 await store.write(key,'good-after-new-run');const before=localStorage.getItem(key);
 IDBObjectStore.prototype.put=function(value,...args){if(value.key===key)throw new DOMException('probe quota','QuotaExceededError');return put.call(this,value,...args);};
 await rejected(store.write(key,'uncommitted'),'aborted write rejects');await rejected(store.flush(),'flush reports failed commit');ok(localStorage.getItem(key)===before,'failed DB write preserves old reference');
 read=await store.read(key);ok(read.status==='value'&&read.body==='good-after-new-run','aborted transaction preserves last durable run');
 IDBObjectStore.prototype.put=put;await store.write(key,'retry');await store.flush();
 const noRef=new BrowserRunStore({dbName,references:{getItem:()=>null,setItem:()=>{throw new DOMException('probe quota','QuotaExceededError');}}});
 const noRefCommit=await noRef.write(key,'reference-failed');ok(!noRefCommit.referenced,'failed reference is reported');read=await noRef.read(key);ok(read.status==='value'&&read.body==='reference-failed','DB survives reference quota');
 const unavailable=new BrowserRunStore({dbName:'blocked',indexedDB:{open(){throw Error('disabled');}}});read=await unavailable.read(key);ok(read.status==='unavailable','unavailable is distinct from missing/deleted');
 report.push('PASS aborted/quota writes keep prior durable state, failed references keep committed data, explicit failure/retry/flush');
 await noRef.close();await store.close();raw.close();IDBObjectStore.prototype.put=put;
 await new Promise((resolve,reject)=>{const r=indexedDB.deleteDatabase(dbName);r.onsuccess=resolve;r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('cleanup blocked'));});
 for(const k of [key,'probe/a','probe/b','probe/c'])localStorage.removeItem(k);
 return report;
}
