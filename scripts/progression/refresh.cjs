// Read-only game extraction. Writes only generated reports and visualization fragments.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const args=process.argv.slice(2), outputIndex=args.indexOf('--out');
const out=path.resolve(root,outputIndex>=0?args[outputIndex+1]:'balance/reports/progression-refresh');
const accept=args.includes('--accept-reviewed');
const baselinePath=path.join(__dirname,'reviewed-sources.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
fs.mkdirSync(out,{recursive:true});
// Broad watch is intentional: progression gates also live in runtime consumers.
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.ts')?[path.join(dir,e.name)]:[]);}
const captureHashes=()=>Object.fromEntries(walk(path.join(root,'src')).sort().map(p=>[path.relative(root,p).replaceAll('\\','/'),crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')]));
const hashes=captureHashes();
const previous=fs.existsSync(baselinePath)?read(baselinePath):{};
const changed=[...new Set([...Object.keys(previous),...Object.keys(hashes)])].filter(p=>previous[p]!==hashes[p]);
fs.writeFileSync(path.join(out,'review-needed.md'),'# Progression refresh review\n\n'+(changed.length?changed.map(p=>`- ${p}`).join('\n'):'No source changes since the reviewed snapshot.')+'\n');
function run(file,argv=[]){const r=spawnSync(process.execPath,[file,...argv],{cwd:root,stdio:'inherit'});if(r.status!==0)throw Error(`Failed: ${file} (${r.status})`);}
run(path.join(root,'node_modules/tsx/dist/cli.mjs'),[path.join(__dirname,'export.ts'),out]);
run(path.join(__dirname,'paths.cjs'),[out]);
if(changed.length&&!accept){console.error(`${changed.length} changed source files: review ${path.join(out,'review-needed.md')}. Live snapshot/catalog extracted; rendering stopped. After reviewing gate changes, use --accept-reviewed.`);process.exit(2);}
const raw=read(path.join(out,'progression-snapshot.json')), data=read(path.join(out,'progression-data.json'));
const spec=require('./overview.cjs');
const fill=s=>s.replaceAll('{awakening}',raw.power.awakening.odysseyStage).replaceAll('{vocations}',raw.power.vocations.odysseyStage).replaceAll('{commissionFinds}',raw.commissionFinds);
const nodes=[];
for(const entry of spec.nodes){
  if(!Array.isArray(entry)){nodes.at(-1).selector=entry;continue;}
  const [id,label,kind,refs,detail]=entry;
  const steps=refs.map(ref=>{const [m,n]=ref.split(':');const node=data.maps.find(x=>x.id===m)?.nodes.find(x=>x.id===n);if(!node)throw Error('Missing narrative reference '+ref);return {label:node.label,detail:node.detail};});
  nodes.push({id,label,kind,steps,detail:detail?fill(detail):null,rows:[]});
}
function matches(row,s){return s&&(!s.kind||row.kind===s.kind)&&(!s.id||row.id===s.id)&&(!s.pattern||new RegExp(s.pattern).test(row.id))&&(s.tier===undefined||!!row.payload.tierId===s.tier);}
for(const row of data.rows){const owners=nodes.filter(n=>matches(row,n.selector));if(owners.length!==1)throw Error(`Catalog coverage: ${row.id} has ${owners.length} owners`);owners[0].rows.push(row.id);}
const nodeIds=new Set(nodes.map(n=>n.id));
if(nodeIds.size!==nodes.length)throw Error('Duplicate overview node');
const placement=spec.layers.flat();
if(placement.length!==nodes.length||new Set(placement).size!==nodes.length||placement.some(id=>!nodeIds.has(id)))throw Error('Invalid layout coverage');
const edges=spec.edges.map(([a,b,label])=>{if(!nodeIds.has(a)||!nodeIds.has(b))throw Error(`Invalid edge ${a}>${b}`);return {from:a,to:b,label:fill(label)};});
const reachable=new Set(['mu']);for(let n=0;n<nodes.length;n++)for(const e of edges)if(reachable.has(e.from))reachable.add(e.to);
if(reachable.size!==nodes.length)throw Error('Disconnected nodes: '+nodes.filter(n=>!reachable.has(n.id)).map(n=>n.id));
const rowsById=Object.fromEntries(data.rows.map(r=>[r.id,r]));
for(const row of data.rows){for(const p of [].concat(row.requiresUnlock||[]))if(!rowsById[p])throw Error('Unknown purchase prerequisite '+p);}
const overview={...data,maps:undefined,nodes:nodes.map(({selector,...n})=>n),layers:spec.layers,edges,
  power:raw.power,quests:raw.quests.map(q=>({id:q.id,label:q.offerLabel||q.id,level:q.offerAtLevel,requires:q.requiresLedger,gate:q.gate,reward:q.reward})),
  modes:raw.modes, sourceNote:'Reviewed working-tree snapshot; not a prediction of every run. Arrows name relationships; exact AND / OR gates are inside each branch.'};
function render(template,name,payload,marker){let html=fs.readFileSync(path.join(__dirname,template),'utf8');if(!html.includes(marker))throw Error('Missing template marker');html=html.replace(marker,()=>JSON.stringify(payload).replaceAll('<','\\u003c'));if(Buffer.byteLength(html)>1000000)throw Error('Visualization over 1 MB');for(const m of html.matchAll(/<script(?![^>]*application\/json)[^>]*>([\s\S]*?)<\/script>/g))new Function(m[1]);fs.writeFileSync(path.join(out,name),html);}
// Check extraction did not race an ongoing edit before accepting the source baseline.
const finalHashes=captureHashes();
const moved=[...new Set([...Object.keys(hashes),...Object.keys(finalHashes)])].filter(p=>hashes[p]!==finalHashes[p]);
if(moved.length)throw Error('Sources changed during refresh; review and rerun: '+moved.join(', '));
render('paths.template.html','hollow-wake-paths.html',data,'__PROGRESSION_DATA__');
render('overview.template.html','hollow-wake-overview.html',overview,'__OVERVIEW_DATA__');
write(path.join(out,'overview-data.json'),overview);
if(accept)write(baselinePath,hashes);
console.log(JSON.stringify({output:out,nodes:nodes.length,relationships:edges.length,catalogRows:data.rows.length,coverage:'all rows exactly once',sourcesReviewed:changed.length}));
