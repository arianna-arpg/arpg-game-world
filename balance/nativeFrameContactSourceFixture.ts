import {nativeFrameContactSourceArchive as a} from './nativeFrameContactSourceArchive';
export function beforeNativeFrameContactSource(file:string,source:string):string {if(file!==a.file)return source;if(source!==a.after)throw Error('Exact native contact-source successor changed');return a.before;}
