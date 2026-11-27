// Bundle the QA client in memory. Let Vite produce the actual catalogue
// imports and the loading-frame URL. Serve the selected artwork on demand
// from the same localhost origin, without copying the asset tree.
const path=require('node:path');
const { build }=require('esbuild');
const replays=[
  ['mechanic-visual-inspection','Triune Tempest and Tractor Tethers'],
  ['status-release-inspection','Status consumption, expiry and removal'],
  ['effect-interplay-inspection','Transfers and death-trigger interactions'],
  ['buff-presentation-inspection','Flame Imbuement, passive stacks and HUD hover'],
];
exports.replays=replays;
exports.bundleCoverage=async function bundleCoverage(server,repo,targets=false) {
  const resolver=server.environments?.client?.pluginContainer ?? server.pluginContainer;
  const catalogue=path.join(repo,'src/render/abilityArtworkCatalog.ts').replaceAll('\\','/');
  const virtual=await resolver.resolveId('virtual:mu-loading-script');
  const load=async(id)=>{
    const result=await resolver.load(id);
    return typeof result==='string'?result:result.code;
  };
  const plugins=[{name:'game-coverage-client',setup(b){
    b.onLoad({filter:/\.css$/},({path:file})=>{
      const url='/'+path.relative(repo,file).replaceAll('\\','/')+'?direct';
      return {contents:'const l=document.createElement("link");l.rel="stylesheet";l.href='+JSON.stringify(url)+';document.head.append(l);',loader:'js'};
    });
    b.onResolve({filter:/^virtual:mu-loading-script$/},()=>({path:virtual.id,namespace:'loading'}));
    b.onLoad({filter:/.*/,namespace:'loading'},async()=>({contents:await load(virtual.id)}));
    b.onLoad({filter:/[/\\]abilityArtworkCatalog\.ts$/},async()=>({contents:await load(catalogue),resolveDir:path.dirname(catalogue),loader:'ts'}));
    b.onLoad({filter:/[/\\]artworkCatalogues\.ts$/},async({path:filename})=>({
      // Use Vite's expansion of import.meta.glob to retain the actual
      // catalogue. This module has only local JS and image URL imports.
      contents:(await server.transformRequest('/src/ui/artworkCatalogues.ts')).code,
      resolveDir:path.dirname(filename),loader:'js'}));
    b.onResolve({filter:/\.webp\?.*url/},args=>{
      const ref=args.path.split('?')[0];
      const file=ref.startsWith('/')?path.resolve(repo,'.'+ref):path.resolve(args.resolveDir,ref);
      return {path:'/'+path.relative(repo,file).replaceAll('\\','/'),namespace:'asset-url'};
    });
    b.onLoad({filter:/.*/,namespace:'asset-url'},({path:url})=>({contents:'export default '+JSON.stringify(url)}));
    b.onResolve({filter:/^\/site\//},args=>({path:path.resolve(repo,'.'+args.path.split('?')[0])}));
    b.onResolve({filter:/^coverage-replay:/},args=>({path:args.path.slice(16),namespace:'encounters'}));
    b.onLoad({filter:/.*/,namespace:'encounters'},({path:name})=>({
      contents:require('./'+name+'.cjs').entry,resolveDir:path.join(repo,'src')}));
  }}];
  const result=await build({stdin:{contents:[
    "import './src/main.ts';", "import * as c from './balance/visualCoverageCourse.mjs';",
    ...(targets?["import * as targetEncounters from './balance/targetEncounterCourse.mjs';window.targetEncounters=targetEncounters;",
      "import {replays} from 'target-encounter-replays';window.targetEncounterReplays=replays;"]:[]),
    ...replays.map(([name])=>"import 'coverage-replay:"+name+"';"),'window.coverage=c;',
  ].join('\n'),resolveDir:repo},bundle:true,platform:'browser',format:'esm',target:'es2022',
    plugins:targets?[...plugins,require('./targetEncounterReplays.cjs').plugin(repo)]:plugins,write:false,outdir:'coverage',logLevel:'silent'});
  const script=result.outputFiles.find(f=>f.path.endsWith('.js'));
  if (!script) throw Error('Missing game entry');
  return script.contents;
};
