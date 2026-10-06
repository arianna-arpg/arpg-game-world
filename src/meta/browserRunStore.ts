/** Large run snapshots belong in transactional browser storage. Account and
 * settings stores stay independent. Keys must already include their build scope.
 * IndexedDB commits are awaited; no unload-time durability promise is implied. */
export interface BrowserRunReference {
  browserRun: 1; database: string; key: string; revision: number; deleted: boolean;
}
interface Revision { revision: number; body: string | null; checksum: string }
interface RecordRow { schema: 1; key: string; revision: number; deleted: boolean; current: Revision; previous?: Revision }
export interface BrowserRunCommit { key: string; revision: number; deleted: boolean; referenced: boolean }
export type BrowserRunRead =
  | { status: 'value'; body: string; revision: number; recovered: boolean }
  | { status: 'deleted'; revision: number; recovered: boolean }
  | { status: 'missing' | 'unavailable' | 'corrupt'; error?: unknown };
export interface BrowserRunStoreOptions {
  dbName: string;
  indexedDB?: IDBFactory;
  references?: Pick<Storage, 'getItem' | 'setItem'>;
  /** At most this many distinct queued keys, plus one transaction in flight. */
  maxPendingKeys?: number;
  onError?: (error: unknown, key: string) => void;
}
interface Pending {
  key: string; body: string | null; checksum: string;
  promise: Promise<BrowserRunCommit>;
  resolve: (value: BrowserRunCommit) => void; reject: (error: unknown) => void;
}
export function isBrowserRunReference(value: unknown): value is BrowserRunReference {
  const r=value as Partial<BrowserRunReference>|null;
  return !!r&&r.browserRun===1&&typeof r.database==='string'&&typeof r.key==='string'
    &&Number.isSafeInteger(r.revision)&&r.revision!>0&&typeof r.deleted==='boolean';
}
function checksum(body:string|null):string {
  if(body===null)return 'tombstone';
  let a=2166136261,b=0x9e3779b9;
  for(let i=0;i<body.length;i++){const c=body.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,0x85ebca6b);}
  return body.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
}
function validRevision(r:Revision|undefined):r is Revision {
  return !!r&&Number.isSafeInteger(r.revision)&&r.revision>0
    &&(r.body===null||typeof r.body==='string')&&r.checksum===checksum(r.body);
}
function validRow(r:RecordRow|undefined,key:string):r is RecordRow {
  return !!r&&r.schema===1&&r.key===key&&typeof r.deleted==='boolean'&&Number.isSafeInteger(r.revision)&&r.revision>0;
}

export class BrowserRunStore {
  private database:Promise<IDBDatabase>|null=null;
  private current=new Map<string,string|null>();
  private pending=new Map<string,Pending>();
  private draining:Promise<void>|null=null;
  private failures=new Map<string,unknown>();
  private readonly limit:number;
  constructor(readonly options:BrowserRunStoreOptions) {
    this.limit=options.maxPendingKeys??8;
    if(!options.dbName||!Number.isSafeInteger(this.limit)||this.limit<1||this.limit>64)
      throw Error('Invalid browser run store policy');
  }
  /** undefined means cold; null is an intentional deletion, never a miss. */
  peek(key:string):string|null|undefined {return this.current.get(key);}
  get pendingKeys():number {return this.pending.size;}
  private open():Promise<IDBDatabase> {
    if(this.database)return this.database;
    const task=new Promise<IDBDatabase>((resolve,reject)=>{
      let settled=false;
      try {
        const factory=this.options.indexedDB??globalThis.indexedDB;
        if(!factory)throw Error('IndexedDB unavailable');
        const request=factory.open(this.options.dbName,1);
        request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('runs'))request.result.createObjectStore('runs',{keyPath:'key'});};
        request.onerror=()=>{settled=true;reject(request.error??Error('Run database open failed'));};
        request.onblocked=()=>{settled=true;reject(Error('Run database upgrade blocked'));};
        request.onsuccess=()=>{
          const db=request.result;if(settled){db.close();return;}settled=true;
          db.onversionchange=()=>{db.close();this.database=null;};resolve(db);
        };
      } catch(error){reject(error);}
    });
    this.database=task;void task.catch(()=>{if(this.database===task)this.database=null;});return task;
  }
  /** The latest pending write to one key replaces its payload; callers share
   * that pending commit promise. Coalescing never creates an unbounded waiter
   * list. A failed write leaves the previous durable row and local reference. */
  write(key:string,body:string|null):Promise<BrowserRunCommit> {
    if(!key||key.length>512||body!==null&&typeof body!=='string')return Promise.reject(Error('Invalid browser run write'));
    const prior=this.pending.get(key);
    if(!prior&&this.pending.size>=this.limit)return Promise.reject(Error('Browser run write queue full'));
    const digest=checksum(body);this.current.set(key,body);
    if(prior){prior.body=body;prior.checksum=digest;return prior.promise;}
    let resolve!:Pending['resolve'],reject!:Pending['reject'];
    const promise=new Promise<BrowserRunCommit>((yes,no)=>{resolve=yes;reject=no;});
    this.pending.set(key,{key,body,checksum:digest,promise,resolve,reject});
    this.kick();return promise;
  }
  private kick():void {
    if(this.draining)return;
    this.draining=Promise.resolve().then(async()=>{
      while(this.pending.size){
        const task=this.pending.values().next().value!;this.pending.delete(task.key);
        try {const result=await this.commit(task);this.failures.delete(task.key);task.resolve(result);}
        catch(error){this.failures.set(task.key,error);task.reject(error);
          try{this.options.onError?.(error,task.key);}catch{/* Error reporting cannot strand the queue. */}}
      }
    }).finally(()=>{this.draining=null;if(this.pending.size)this.kick();});
  }
  private async commit(task:Pending):Promise<BrowserRunCommit> {
    const db=await this.open();
    const revision=await new Promise<number>((resolve,reject)=>{
      let failure:unknown,next=0;
      const tx=db.transaction('runs','readwrite',{durability:'strict'}),store=tx.objectStore('runs');
      tx.oncomplete=()=>resolve(next);
      tx.onabort=()=>reject(failure??tx.error??Error('Run transaction aborted'));
      tx.onerror=()=>{/* abort is the final authority */};
      const get=store.get(task.key);
      get.onsuccess=()=>{
        try {
          const old=get.result as RecordRow|undefined;
          if(old&&!validRow(old,task.key))throw Error('Invalid existing run revision');
          next=(old?.revision??0)+1;if(!Number.isSafeInteger(next))throw Error('Run revision exhausted');
          const good=old&&validRevision(old.current)&&old.current.revision===old.revision&&old.deleted===(old.current.body===null)
            ?old.current:old&&!old.deleted&&old.current?.body!==null&&validRevision(old.previous)&&old.previous.revision<old.revision?old.previous:undefined;
          const row:RecordRow={schema:1,key:task.key,revision:next,deleted:task.body===null,current:{revision:next,body:task.body,checksum:task.checksum},
            ...(good?{previous:good}:{})};
          store.put(row);
        } catch(error){failure=error;tx.abort();}
      };
    });
    let referenced=false;
    // The reference is a cache hint, never the transaction's commit record.
    // A quota failure here cannot invalidate the already committed large body.
    try {
      this.options.references?.setItem(task.key,JSON.stringify({browserRun:1,database:this.options.dbName,key:task.key,
        revision,deleted:task.body===null} satisfies BrowserRunReference));
      referenced=!!this.options.references;
    } catch(error){try{this.options.onError?.(error,task.key);}catch{/* keep the committed row */}}
    return {key:task.key,revision,deleted:task.body===null,referenced};
  }
  /** Await all accepted writes. Any unresolved key failure is visible even if
   * its individual caller chose fire-and-forget; a successful retry clears it. */
  async flush():Promise<void> {
    while(this.draining)await this.draining;
    if(this.failures.size)throw new AggregateError([...this.failures.values()],'Browser run commits failed');
  }
  /** Call at the async Continue seam, before considering the old localStorage
   * full body. A tombstone is authoritative. Corruption never means "missing". */
  async read(key:string):Promise<BrowserRunRead> {
    try {
      const db=await this.open();
      const row=await new Promise<RecordRow|undefined>((resolve,reject)=>{
        const tx=db.transaction('runs','readonly'),request=tx.objectStore('runs').get(key);
        let result:RecordRow|undefined;request.onsuccess=()=>{result=request.result;};
        tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error??Error('Run read aborted'));
      });
      if(row===undefined)return {status:'missing'};
      if(!validRow(row,key))return {status:'corrupt'};
      const primary=validRevision(row.current)&&row.current.revision===row.revision&&row.deleted===(row.current.body===null);
      // Never recover across a deletion barrier, including a damaged tombstone.
      if((row.deleted||row.current?.body===null)&&!primary)return {status:'corrupt'};
      const value=primary?row.current:validRevision(row.previous)&&row.previous.revision<row.revision?row.previous:undefined;
      if(!value)return {status:'corrupt'};
      // A concurrent accepted write owns the sync session cache. A database
      // read must not replace it with the prior durable transaction.
      if(!this.current.has(key))this.current.set(key,value.body);
      return value.body===null?{status:'deleted',revision:value.revision,recovered:!primary}
        :{status:'value',body:value.body,revision:value.revision,recovered:!primary};
    } catch(error){return {status:'unavailable',error};}
  }
  async close():Promise<void> {
    while(this.draining)await this.draining;
    const db=this.database;this.database=null;if(db)try{(await db).close();}catch{/* already unavailable */}
  }
}
