import {beforeNativeBrowserHosted as projectBrowserHosted} from './nativeBrowserHostedCompositionFixture';
import {readNativeArrivalMainCast as readFileSync} from './nativeArrivalCompositionFixture';
import {createHash} from 'node:crypto';
import {NATIVE_HOSTED_PUBLICATION_ARCHIVE as archive} from './nativeHostedPublicationArchive';
export const hostedLF=(source:string):string=>source.replace(/\r\n/g,'\n');
export const hostedHash=(source:string):string=>createHash('sha256').update(hostedLF(source)).digest('hex');
export function beforeNativeHostedPublication(file:string,source:string):string {
 const row=archive.rows.find(row=>row.file===file);if(!row)throw Error('Unknown native hosted source '+file);let out=hostedLF(source);
 if(out!==row.after||hostedHash(out)!==row.afterSha256)throw Error('Unknown or duplicate native hosted source '+file);
 for(const hunk of [...row.hunks].reverse()){if(out.split(hunk.after).length!==2)throw Error('Unknown or repeated hosted hunk '+file);out=out.replace(hunk.after,hunk.before);}
 if(out!==row.before||hostedHash(out)!==row.beforeSha256)throw Error('Incomplete hosted reversal '+file);return out;
}
export function currentNativeHostedSource(file:string):string{return projectBrowserHosted('hosted',file,readFileSync(file,'utf8'));}
