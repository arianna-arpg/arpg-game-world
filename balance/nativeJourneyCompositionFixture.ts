import {beforeNativeCampaign,beforeNativeCampaignRaw} from './nativeCampaignCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeJourneyCompositionArchive as archive} from './nativeJourneyCompositionArchive';
export type NativeJourneyLane=keyof typeof archive.lanes|'proof';
export function beforeNativeJourneyOnly(lane:NativeJourneyLane,file:string,input:string):string {
 let source=input.replace(/\r\n?/g,'\n');const row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);
 if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash)return source;
 for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native journey exact composition hunk refused: '+lane+':'+file);source=source.replace(h.after,h.before);}return source;
}
/** Raw-hash parents retain their pinned EOL convention after exact source projection. */
export function beforeNativeJourneyRawOnly(lane:Exclude<NativeJourneyLane,'proof'>,file:string,input:string):string {
 const row=archive.rawEols[lane].find(r=>r.file===file);if(!row)throw Error('Native journey raw parent file not captured: '+lane+':'+file);
 const source=beforeNativeJourneyOnly(lane,file,input);if(row.eol==='crlf')return source.replace(/\n/g,'\r\n');if(row.eol==='lf')return source;let index=0;const lines:readonly number[]=row.crlfLines;return source.replace(/\n/g,()=>lines.includes(index++)?'\r\n':'\n');
}

/** Preserve the exact original phase58 chain and already reconstructed predecessor inputs. */
export function beforeNativeJourney(lane:NativeJourneyLane,file:string,input:string):string {const source=input.replace(/\r\n?/g,'\n'),row=(lane==='proof'?archive.proofRows:archive.lanes[lane]).find(r=>r.file===file);if(row&&createHash('sha256').update(source).digest('hex')===row.beforeHash)return beforeNativeJourneyOnly(lane,file,input);return beforeNativeJourneyOnly(lane,file,beforeNativeCampaign('journey58',file,input));}
export function beforeNativeJourneyRaw(lane:Exclude<NativeJourneyLane,'proof'>,file:string,input:string):string {const source=input.replace(/\r\n?/g,'\n'),row=archive.lanes[lane].find(r=>r.file===file);if(row&&createHash('sha256').update(source).digest('hex')===row.beforeHash)return beforeNativeJourneyRawOnly(lane,file,input);return beforeNativeJourneyRawOnly(lane,file,beforeNativeCampaignRaw('journey58',file,input));}
