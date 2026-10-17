import {beforeNativeBrowserEntry as projectBrowserEntry} from './nativeBrowserEntryCompositionFixture';
import {createHash} from 'node:crypto';
import {nativeDimensionCatalogArchive as archive} from './nativeDimensionCatalogArchive';
export function beforeNativeDimensionCatalogOnly(file:string,input:string):string {let source=input.replaceAll('\r\n','\n');const row=archive.rows.find(r=>r.file===file);if(!row||createHash('sha256').update(source).digest('hex')===row.beforeHash||archive.priorVersions.some(r=>r.file===file&&createHash('sha256').update(source).digest('hex')===r.sha256))return source;for(const h of row.hunks){if(source.split(h.after).length!==2)throw Error('Native dimension exact hunk refused: '+file);source=source.replace(h.after,h.before);}return source;}

export function beforeNativeDimensionCatalog(file:string,input:string):string {return beforeNativeDimensionCatalogOnly(file,projectBrowserEntry('dimension',file,input));}
