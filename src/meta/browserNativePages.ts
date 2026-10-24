/** Immutable native page transport. CharacterSave envelopes use only its page
 * records; BrowserRunStore remains the game's sole per-slot root authority. The
 * standalone root API below also serves independent transaction probes. */
export interface NativePageRef { run: string; page: string; revision: string; key: string; digest: string; bytes: number }
export interface NativePageRoot { schema: 1; slot: string; revision: number; run: string; body: string | null; pages: NativePageRef[]; digest: string }
interface PageRow { schema: 1; ref: NativePageRef; body: string }
interface RootRow { schema: 1; slot: string; revision: number; current: NativePageRoot; previous?: NativePageRoot }
export type NativeRootRead = { status:'value'|'deleted'; headRevision:number; root:NativePageRoot; recovered:boolean }
  | {status:'missing';headRevision:0} | {status:'corrupt'|'unavailable';error?:unknown};
export interface NativePageStorage {
  writePage(run:string,page:string,body:string):Promise<NativePageRef>;
  readPage(ref:NativePageRef):Promise<string>;
  publish(slot:string,run:string,body:string|null,pages:readonly NativePageRef[],expectedRevision:number):Promise<NativePageRoot>;
  readRoot(slot:string):Promise<NativeRootRead>;
  flush():Promise<void>;
}
const encoded=(s:string)=>new TextEncoder().encode(s);
async function digest(s:string):Promise<string>{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoded(s)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const refKey=(run:string,page:string,revision:string)=>JSON.stringify([run,page,revision]);
function validRef(r:NativePageRef):boolean{return !!r&&typeof r.run==='string'&&!!r.run&&typeof r.page==='string'&&!!r.page
  &&typeof r.revision==='string'&&!!r.revision&&r.key===refKey(r.run,r.page,r.revision)&&/^[0-9a-f]{64}$/.test(r.digest)
  &&Number.isSafeInteger(r.bytes)&&r.bytes>=0;}
const rootPayload=(r:Omit<NativePageRoot,'digest'>)=>JSON.stringify({schema:r.schema,slot:r.slot,revision:r.revision,run:r.run,body:r.body,pages:r.pages});
async function validRoot(r:NativePageRoot|undefined,slot:string):Promise<boolean>{
  return !!r&&r.schema===1&&r.slot===slot&&Number.isSafeInteger(r.revision)&&r.revision>0&&typeof r.run==='string'
    &&(r.body===null||typeof r.body==='string')&&Array.isArray(r.pages)&&r.pages.every(validRef)
    &&r.pages.every(p=>p.run===r.run)&&new Set(r.pages.map(p=>p.page)).size===r.pages.length
    &&(r.body!==null||r.pages.length===0)&&r.digest===await digest(rootPayload(r));
}
/** Immutable page bodies have NO in-memory cache. Transactions atomically
 * publish one root and its previous good root; only referenced revisions are
 * authoritative. Unreferenced staged pages are harmless after interruption. */
export class BrowserNativePages implements NativePageStorage {
  private database:Promise<IDBDatabase>|null=null;
  private tail:Promise<unknown>=Promise.resolve();
  private pending=0;
  private error:unknown=null;
  constructor(readonly dbName:string,private factory:IDBFactory=globalThis.indexedDB,private limit=8){
    if(!dbName||!Number.isSafeInteger(limit)||limit<1||limit>64)throw Error('Invalid native page store');
  }
  get stats():{pending:number;cachedBodyBytes:0}{return {pending:this.pending,cachedBodyBytes:0};}
  private open():Promise<IDBDatabase>{
    if(this.database)return this.database;
    this.database=new Promise((resolve,reject)=>{let blocked=false;
      try{if(!this.factory)throw Error('IndexedDB unavailable');const q=this.factory.open(this.dbName,1);
        q.onupgradeneeded=()=>{for(const name of ['pages','roots'])if(!q.result.objectStoreNames.contains(name))q.result.createObjectStore(name,{keyPath:name==='pages'?'ref.key':'slot'});};
        q.onerror=()=>reject(q.error??Error('Native page database failed'));q.onblocked=()=>{blocked=true;reject(Error('Native page database blocked'));};
        q.onsuccess=()=>{if(blocked){q.result.close();return;}const db=q.result;db.onversionchange=()=>{db.close();this.database=null;};resolve(db);};
      }catch(e){reject(e);}
    });const opened=this.database;void opened.catch(()=>{if(this.database===opened)this.database=null;});return opened;
  }
  private enqueue<T>(work:()=>Promise<T>):Promise<T>{
    if(this.pending>=this.limit)return Promise.reject(Error('Native page queue full'));
    this.pending++;const task=this.tail.then(work);this.tail=task.then(()=>{this.error=null;},e=>{this.error=e;}).finally(()=>{this.pending--;});return task;
  }
  private async row<T>(store:string,key:string):Promise<T|undefined>{const db=await this.open();return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readonly'),q=tx.objectStore(store).get(key);let result:T|undefined;
    q.onsuccess=()=>{result=q.result;};tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error??Error('Native page read failed'));});}
  writePage(run:string,page:string,body:string):Promise<NativePageRef>{return this.enqueue(async()=>{
    if(!run||!page||typeof body!=='string')throw Error('Invalid native page body');
    const revision=crypto.randomUUID(),ref:NativePageRef={run,page,revision,key:refKey(run,page,revision),digest:await digest(body),bytes:encoded(body).length};
    const db=await this.open();await new Promise<void>((resolve,reject)=>{const tx=db.transaction('pages','readwrite',{durability:'strict'});
      tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('Native page write failed'));
      try{tx.objectStore('pages').add({schema:1,ref,body} satisfies PageRow);}catch(e){tx.abort();reject(e);}});return ref;});}
  readPage(ref:NativePageRef):Promise<string>{return this.enqueue(async()=>{
    if(!validRef(ref))throw Error('Invalid native page reference');const row=await this.row<PageRow>('pages',ref.key);
    if(!row||row.schema!==1||JSON.stringify(row.ref)!==JSON.stringify(ref)||typeof row.body!=='string'
      ||encoded(row.body).length!==ref.bytes||await digest(row.body)!==ref.digest)throw Error('Missing or corrupt immutable native page');
    return row.body;});}
  private async rootRow(slot:string):Promise<{row:RootRow|undefined;good?:NativePageRoot;recovered:boolean}>{
    const row=await this.row<RootRow>('roots',slot);if(!row)return {row,recovered:false};
    if(row.schema!==1||row.slot!==slot||!Number.isSafeInteger(row.revision)||row.revision<1)throw Error('Invalid native page root');
    if(await validRoot(row.current,slot)&&row.current.revision===row.revision)return {row,good:row.current,recovered:false};
    // Never resurrect through a damaged tombstone.
    if(row.current?.body===null)throw Error('Corrupt native page tombstone');
    if(await validRoot(row.previous,slot)&&row.previous!.revision<row.revision)return {row,good:row.previous,recovered:true};
    throw Error('Corrupt native page roots');
  }
  readRoot(slot:string):Promise<NativeRootRead>{return this.enqueue(async()=>{
    try{const {row,good,recovered}=await this.rootRow(slot);return !row?{status:'missing',headRevision:0}
      :{status:good!.body===null?'deleted':'value',headRevision:row.revision,root:good!,recovered};}
    catch(error){return {status:this.database?'corrupt':'unavailable',error};}});}
  publish(slot:string,run:string,body:string|null,pages:readonly NativePageRef[],expectedRevision:number):Promise<NativePageRoot>{return this.enqueue(async()=>{
    if(!slot||!run||(body!==null&&typeof body!=='string')||!Number.isSafeInteger(expectedRevision)||expectedRevision<0
      ||!Array.isArray(pages)||pages.some(p=>!validRef(p)||p.run!==run)||new Set(pages.map(p=>p.page)).size!==pages.length
      ||body===null&&pages.length)throw Error('Invalid native root publication');
    const before=await this.rootRow(slot);if((before.row?.revision??0)!==expectedRevision)throw Error('Stale native root writer');
    const revision=expectedRevision+1;if(!Number.isSafeInteger(revision))throw Error('Native root revision exhausted');
    const head={schema:1 as const,slot,revision,run,body,pages:pages.map(p=>({...p})).sort((a,b)=>a.page.localeCompare(b.page))};
    const root:NativePageRoot={...head,digest:await digest(rootPayload(head))};const db=await this.open();
    await new Promise<void>((resolve,reject)=>{let failure:unknown;
      const tx=db.transaction(['pages','roots'],'readwrite',{durability:'strict'}),roots=tx.objectStore('roots'),q=roots.get(slot);
      const abort=(e:unknown)=>{failure=e;tx.abort();};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(failure??tx.error??Error('Native root transaction aborted'));
      q.onsuccess=()=>{if((q.result?.revision??0)!==expectedRevision){abort(Error('Stale native root writer'));return;}
        let remaining=root.pages.length;const commit=()=>{try{roots.put({schema:1,slot,revision,current:root,...(before.good?{previous:before.good}:{})} satisfies RootRow);}catch(e){abort(e);}};
        if(!remaining){commit();return;}
        for(const ref of root.pages){const page=tx.objectStore('pages').get(ref.key);page.onsuccess=()=>{
          const row=page.result as PageRow|undefined;if(!row||row.schema!==1||JSON.stringify(row.ref)!==JSON.stringify(ref)){abort(Error('Root references an absent immutable page'));return;}
          if(!--remaining)commit();};}
      };
    });return root;});}
  async flush():Promise<void>{await this.tail;if(this.error)throw this.error;}
  async close():Promise<void>{await this.tail;const db=this.database;this.database=null;if(db)try{(await db).close();}catch{/* unavailable */}}
}
