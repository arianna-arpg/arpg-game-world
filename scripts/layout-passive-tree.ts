/** Apply reviewed {id:{x,y}} positions without serializing gameplay payloads.
 * Usage: npx tsx scripts/layout-passive-tree.ts positions.json
 * The native editor remains the ordinary authoring path. */
import { readFileSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const input=process.argv[2];assert(input,'Provide a JSON position map');
const positions:Record<string,{x:number;y:number}>=JSON.parse(readFileSync(input,'utf8'));
const file='src/data/passives.ts',source=readFileSync(file,'utf8'),seen=new Set<string>();
const output=source.split('\n').map(line=>{
  const id=line.match(/(?:"id"|\bid)\s*:\s*["']([^"']+)["']/)?.[1];
  if(!id||!Object.hasOwn(positions,id))return line;
  const p=positions[id];assert(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=6000&&p.y>=0&&p.y<=6000,id);
  assert(!seen.has(id),'Duplicate source node '+id);seen.add(id);
  let edits=0;
  const result=line.replace(/((?:"x"|\bx)\s*:\s*)-?[\d.]+/,(_,prefix:string)=>{edits++;return prefix+p.x;})
    .replace(/((?:"y"|\by)\s*:\s*)-?[\d.]+/,(_,prefix:string)=>{edits++;return prefix+p.y;});
  assert.equal(edits,2,'Missing position for '+id);return result;
}).join('\n');
assert.deepEqual([...seen].sort(),Object.keys(positions).sort(),'Every requested node must exist in source');
writeFileSync(file,output);console.log(`Applied ${seen.size} positions; all other source text preserved.`);
