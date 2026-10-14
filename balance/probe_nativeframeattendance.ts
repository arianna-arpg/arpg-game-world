import {nativeShardsCaravanFS as fs} from './nativeShardsCompositionFixture';
import * as crypto from 'node:crypto';
import {nativeSceneFrameAttendanceArchive as archive} from './nativeSceneFrameAttendanceArchive';
import {beforeNativeFrameAttendance} from './nativeFrameAttendanceFixture';
const sha=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
function must(ok:unknown,why:string):asserts ok {if(!ok)throw Error(why);}
function refuses(fn:()=>unknown,label:string):void{let refused=false;try{fn();}catch{refused=true;}must(refused,'Must refuse '+label);}
let mutations=0,duplicates=0;
for(const row of archive.files){const source=fs.readFileSync(row.file,'utf8');must(sha(beforeNativeFrameAttendance(row.file,source))===row.beforeSha256,'Complete predecessor '+row.file);for(const change of archive.changes.filter(c=>c.file===row.file)){refuses(()=>beforeNativeFrameAttendance(row.file,source.replace(change.after,change.after.replace('{','{/*mutation*/'))),change.name+' mutation');mutations++;refuses(()=>beforeNativeFrameAttendance(row.file,source+'\n'+change.after),change.name+' duplicate');duplicates++;}}
for(const row of archive.hosts){const source=fs.readFileSync(row.file,'utf8');must(beforeNativeFrameAttendance(row.file,source)===row.before,'Host predecessor');refuses(()=>beforeNativeFrameAttendance(row.file,source+'\n//mutation'),'Host mutation');mutations++;refuses(()=>beforeNativeFrameAttendance(row.file,source+source),'Host duplicate');duplicates++;}
const report={status:'pass',predecessorManifest:archive.predecessorManifest,archiveSha256:sha(JSON.stringify(archive)),methods:archive.changes.length,files:archive.files.length,hosts:archive.hosts.length,mutationRefusals:mutations,duplicateRefusals:duplicates,scope:'Exact limited absence/presentation seams. Actual current-player authority predicate and two-area runtime acceptance remain concrete aggregate requirements.'};
fs.mkdirSync('balance/reports',{recursive:true});fs.writeFileSync('balance/reports/nativeframeattendance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
