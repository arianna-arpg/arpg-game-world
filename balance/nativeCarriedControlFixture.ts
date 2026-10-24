import {createHash} from 'node:crypto';
import {nativeCarriedControlArchive as archive,nativeCarriedControlArchiveHash} from './nativeCarriedControlArchive';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
if(hash(JSON.stringify(archive))!==nativeCarriedControlArchiveHash)throw Error('Carried Control archive changed');
export function beforeNativeCarriedControl(file:string,source:string):string {
 if(file!==archive.file)return source;
 let text=source.replaceAll('\r\n','\n');
 for(const [before,after] of [...archive.patches].reverse()){
  if(text.split(after).length!==2)throw Error('Carried Control exact seam changed or duplicated');
  text=text.replace(after,before);
 }
 return text;
}
