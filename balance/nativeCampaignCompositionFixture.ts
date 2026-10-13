import {createHash} from 'node:crypto';
import {nativeCampaignCompositionArchive as archive,type NativeCampaignSourceRow} from './nativeCampaignCompositionArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const indexes=new Map<string,Map<string,NativeCampaignSourceRow>>();
for(const [lane,rows]of [...Object.entries(archive.lanes),['proof',archive.rootRows]] as [string,NativeCampaignSourceRow[]][])indexes.set(lane,new Map(rows.map(r=>[r.file,r])));
function rowFor(lane:string,file:string):NativeCampaignSourceRow|undefined{const laneRows=indexes.get(lane);if(!laneRows)throw Error('Unknown native campaign parent lane: '+lane);return laneRows.get(file);}
export function beforeNativeCampaign(lane:string,file:string,input:string):string{let source=input.replace(/\r\n?/g,'\n');const row=rowFor(lane,file);if(!row)return source;if(hash(source)===row.beforeHash)return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native campaign exact unique hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}if(hash(source)!==row.beforeHash)throw Error('Native campaign unknown outside source refused: '+lane+':'+file);return source;}
export function beforeNativeCampaignRaw(lane:string,file:string,input:string):string{const row=rowFor(lane,file);if(!row)return input;const source=beforeNativeCampaign(lane,file,input);if(row.eol==='crlf')return source.replace(/\n/g,'\r\n');if(row.eol==='lf')return source;let index=0;return source.replace(/\n/g,()=>row.crlfLines.includes(index++)?'\r\n':'\n');}
