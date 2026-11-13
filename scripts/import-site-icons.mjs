// Explicit, reproducible import of selected distribution art; never copies originals.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const library=process.argv[2];
if(!library)throw new Error('Usage: node scripts/import-site-icons.mjs <asset-library-root>');
const root=path.resolve(library),repo=fileURLToPath(new URL('../',import.meta.url));
const read=relative=>{const resolved=path.resolve(root,relative);if(!resolved.startsWith(root+path.sep))throw new Error('Asset path leaves library');return fs.readFileSync(resolved);};
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const bytes=read('catalog/icon-art.json'),catalogue=JSON.parse(bytes),seen=new Set(),canonicalSources={};
const entries=catalogue.entries.map(entry=>{
 if(!['skill','support','unique'].includes(entry.kind)||!/^[a-z0-9_-]+$/.test(entry.id)||entry.key!==entry.kind+':'+entry.id||seen.has(entry.key))throw new Error('Invalid or duplicate identity: '+entry.key);
 seen.add(entry.key);
 if(!['art-approved','author-checked'].includes(entry.status))throw new Error('Unselected art: '+entry.key);
 const image=read(entry.image);if(hash(image)!==entry.imageSha256)throw new Error('Distribution hash mismatch: '+entry.key);
 if(image.toString('ascii',0,4)!=='RIFF'||image.toString('ascii',8,12)!=='WEBP')throw new Error('Expected WebP: '+entry.key);
 const provenance=JSON.parse(read(entry.provenance));
 // Retain the source locator and hashes; full gameplay snapshots stay in the library.
 const {definition,...canonicalSource}=provenance.source||{};
 const canonicalSourceRef=hash(JSON.stringify(canonicalSource));
 canonicalSources[canonicalSourceRef]=canonicalSource;
 const src='assets/art/icons/'+entry.kind+'/'+entry.id+'.'+entry.imageSha256.slice(0,12)+'.webp';
 const destination=path.join(repo,'site',src);fs.mkdirSync(path.dirname(destination),{recursive:true});
 if(!fs.existsSync(destination))fs.writeFileSync(destination,image);
 else if(hash(fs.readFileSync(destination))!==entry.imageSha256)throw new Error('Existing destination differs: '+src);
 const {runtimeIntegrated,websiteIntegrated,...selection}=entry;
 return {...selection,src,generator:provenance.generator||null,modelVersion:provenance.modelVersion||null,canonicalSourceRef};
});
const manifest={schemaVersion:1,sourceCatalogue:'Hollow Wake Assets/catalog/icon-art.json',sourceUpdatedAt:catalogue.updatedAt,sourceSha256:hash(bytes),
 note:'Selected artwork and review status follow the catalogue. Original paintings and editable prompts remain in the asset library. This manifest is build-time provenance, never a page request.',canonicalSources,entries};
fs.writeFileSync(path.join(repo,'site/assets/art/icons/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({images:entries.length,bytes:entries.reduce((sum,e)=>sum+fs.statSync(path.join(repo,'site',e.src)).size,0)}));
