// These existing encounter scripts use ordinary game calls and their own
// assertions. Bundle their bodies as callable browser scenarios so one case
// cannot exit the game client. No filesystem or Node APIs are exposed.
const path=require('node:path'), fs=require('node:fs'), ts=require('typescript');
const names=(
  'aiverbs arenabosses assault bore butteland cathedral cistern clutch corpse crossjab deepwinter den deviceworkshop dissolve doodadeffects douse drove echomark emerge emergentuniques extraction fielddiscipline fleshkit front garden geysers gloaming grove harborholds harborwarden harvest highcourt hivecall holdfast_guardian hollows hunt ironbell lairs legends livinguniques lonecrypt madden meadowmere memories mimic mount mountain movementtether mudwell murmuration myceliafront necromancerrites occurrences overdrive possession puzzles quickening radiance rampage reactiveuniques resurrection sandregent scorch seas sympathy swarm tacticalai tamebeast tells throngcombat titans towngrowth townportal trapworks uniqueaccords wakeflame warfront wisplight worldbossspectacle '+
  'annex annexgrammar applyarm attunement bashclock bashcontact bastionstartertrees bondstartertrees bonegolem castreq chaos chargegate classopeners cleave cleavecomponents clingbalance combo companioninheritance companionrecovery companionstance contagion2 controlstartertrees deadface defenses descent devotedstartertrees disciplinestartertrees doodadfams dueliststartertrees eventclock fourthwall frontierstartertrees gauge gnatveil goad grab guardbash harassment impactstartertrees intent kitreach mass mireille_lesson mu muoffer necromancercourts necromancersacraments necromancertrees nestednecromancer objectives packtempo pactsteelstartertrees parry passivecrossroads passiveexpansion passiverings passiveroutes passivespecializations passiveweave pitfall plies pours precisionstartertrees reliquary resonatorstartertrees revivering runeweaverstartertrees segments skillempowerment skillmodes soulriver squish stance startertrees straying supportfabric targetstrike throng timeflow tracks transience tutorialisolation ultimates wallpress watchers worldbossloot'
).split(' ');

exports.plugin=function(repo) {
  const root=path.join(repo,'balance');
  const only=process.argv.indexOf('--case');
  const passiveScenes=process.argv.includes('--passive-scenes');
  const defaults=passiveScenes?[...names,'talents','slotgraft','supportmatrix']:names;
  // The enemy tuning-table diagnostic is available explicitly. Its roster
  // assertion also covers client-registered inhabitants outside combat.
  const available=passiveScenes?[...defaults,'threatdials']:defaults;
  const compiled=only>=0 ? process.argv[only+1].split(',') :
    !passiveScenes && ['--recheck-open','--hud-only','--owners-only'].some(flag=>process.argv.includes(flag)) ? [] :
    process.argv.includes('--retry-passive-scenes')?available:defaults;
  if(compiled.some(name=>!available.includes(name)))throw Error('Unknown visual encounter scenario');
  return {name:'target-encounter-scenarios',setup(b) {
    b.onResolve({filter:/^target-encounter-replays$/},()=>({path:'list',namespace:'scenario-list'}));
    b.onLoad({filter:/.*/,namespace:'scenario-list'},()=>({
      contents:'export const replays={'+compiled.map(name=>JSON.stringify(name)+':()=>import("encounter-case:'+name+'")').join(',')+'};',resolveDir:root
    }));
    b.onResolve({filter:/^encounter-case:/},args=>({path:args.path.split(':')[1],namespace:'encounter-case'}));
    b.onLoad({filter:/.*/,namespace:'encounter-case'},args=>{
      const file=path.join(root,'probe_'+args.path+'.ts'), source=fs.readFileSync(file,'utf8');
      const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);
      const imports=[],body=[];
      for(const st of ast.statements) (ts.isImportDeclaration(st)?imports:body).push(st.getFullText(ast));
      return {contents:imports.join('\n')+'\nexport async function replay(process){\n'+body.join('\n')+'\n}',resolveDir:root,loader:'ts'};
    });
    b.onLoad({filter:/src[/\\](?:engine|world|data)[/\\].*\.ts$/},({path:file})=>{
      const original=fs.readFileSync(file,'utf8');
      if(!original.includes('.flashes.push('))return;
      const src=original.replace(/(?<![\w.$])([\w$]+(?:\.[\w$]+)*)\.flashes\.push\(/g,'encounterEmit($1,');
      return {contents:src+'\nfunction encounterEmit(world,...items){ const n=world.flashes.push(...items);globalThis.__captureEncounter?.(world,items);return n;}',loader:'ts',resolveDir:path.dirname(file)};
    });
  }};
};
