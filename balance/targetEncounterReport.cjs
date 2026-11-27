const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function baselineRows(file) {
  const html = fs.readFileSync(file, 'utf8');
  const targets = [];
  for (const match of html.matchAll(/<tr id="([^"]+)">([\s\S]*?)<\/tr>/g)) {
    const cells = [...match[2].matchAll(/<td>([\s\S]*?)<\/td>/g)];
    const [group,...id] = match[1].split('/');
    if ((group==='Effect voice' && cells[2]?.[1]==='Painter') ||
        (['Passive','Passive choice'].includes(group) && cells[2]?.[1]==='Mapped'))
      targets.push({group,id:id.join('/')});
  }
  if (!targets.length || new Set(targets.map(t=>t.group+'/'+t.id)).size!==targets.length)
    throw Error('Expected a complete visual coverage report with unique target rows');
  return targets;
}

// Name the actual production source that asks for this effect. The registry
// and the renderer are deliberately outside this search.
function producers(repo, targets) {
  const wanted=new Set(targets.filter(t=>t.group==='Effect voice').map(t=>t.id));
  const out={};
  const dir=path.join(repo,'src');
  const literals=v=>!v?[]:ts.isStringLiteral(v)?[v.text]:ts.isConditionalExpression(v)?[...literals(v.whenTrue),...literals(v.whenFalse)]:[];
  const files=['engine','data','world','packages'].flatMap(folder=>fs.readdirSync(path.join(dir,folder),{recursive:true}).filter(f=>f.endsWith('.ts')).map(f=>path.join(folder,f)));
  for (const file of files) {
    const code=fs.readFileSync(path.join(dir,file),'utf8');
    if (!/worldMoment\(|mechanicBurst\(|(?:fx|impactFx|breakFx|settleFx|chipFx)\s*[:=]/.test(code)) continue;
    const ast=ts.createSourceFile(file,code,ts.ScriptTarget.Latest,true);
    function visit(n) {
      let ids=[];
      if (ts.isCallExpression(n) && n.arguments.length) {
        const call=n.expression.getText(ast);
        if (call==='worldMoment'||call==='mechanicBurst')
          ids=literals(n.arguments[0]).map(s=>(call==='worldMoment'?'world:':'mechanic:')+s);
      } else if (ts.isPropertyAssignment(n) && /^(fx|impactFx|breakFx|settleFx|chipFx)$/.test(n.name.getText(ast))) ids=literals(n.initializer);
      for(const id of ids.filter(k=>wanted.has(k))) {
        let scope=n.parent;
        while(scope && !((ts.isMethodDeclaration(scope)||ts.isFunctionDeclaration(scope)||ts.isPropertyAssignment(scope)) && scope.name &&
          !['fx','impactFx'].includes(scope.name.getText(ast)))) scope=scope.parent;
        const loc=file.replaceAll('\\','/')+':'+(ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1);
        const owner=(scope?.name?.getText(ast)??'module')+' ('+loc+')';
        const entries=out[id]??=[];if (!entries.includes(owner)) entries.push(owner);
      }
      ts.forEachChild(n,visit);
    }
    visit(ast);
  }
  return out;
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Link the outstanding trial to literal production reads. A reference is a
// place to exercise the next encounter, never a substitute for a witness.
function locateOpenConsumers(repo,rows){
  const pending=rows.filter(r=>r.pendingStats?.length && ['Sheet changed','Grant installed'].includes(r.state));
  const reads=new Map(pending.flatMap(r=>r.pendingStats.map(stat=>[stat,[]])));
  if(!reads.size)return;
  const dir=path.join(repo,'src','engine');
  for(const file of fs.readdirSync(dir,{recursive:true}).filter(f=>f.endsWith('.ts'))){
    const lines=fs.readFileSync(path.join(dir,file),'utf8').split(/\r?\n/);
    for(const [i,line] of lines.entries()){
      for(const match of line.matchAll(/\b(get|hasMod|armedFamily)\(\s*['"]([\w:]+)['"]\s*(\+)?/g)){
        const end=match[2],family=match[1]==='armedFamily'||!!match[3];
        const families=family?[...reads.keys()].filter(s=>s.startsWith(end)):[end];
        for(const stat of families){
          const where=reads.get(stat),loc=file.replaceAll('\\','/')+':'+(i+1);
          if(where&&where.length<4&&!where.includes(loc))where.push(loc);
        }
      }
    }
  }
  for(const row of pending){
    const refs=row.pendingStats.map(s=>s+' ('+(reads.get(s).join(', ')||'data-driven lookup')+')');
    row.nextEncounter='Trace the qualifying action in '+refs.join(' / ')+'.';
  }
  for(const row of rows)if(!pending.includes(row))delete row.nextEncounter;
}
function save(file,rows,baseline,summary) {
  if (!file) return;
  const groups=[...new Set(rows.map(r=>r.group))], states=[...new Set(rows.map(r=>r.state))].sort();
  const counts=arr=>Object.entries(arr.reduce((s,r)=>(s[r.state]=(s[r.state]??0)+1,s),{})).map(([k,v])=>esc(k)+' · '+v.toLocaleString('en')).join(' &nbsp; ');
  const options=a=>a.map(x=>'<option>'+esc(x)+'</option>').join('');
  const quick=(state,group,label)=>states.includes(state)?'<button data-group="'+esc(group)+'" data-state="'+esc(state)+'" onclick="g.value=this.dataset.group;s.value=this.dataset.state;q.value=\'\';g.oninput()">'+esc(label)+'</button> ':'';
  const data=JSON.stringify(rows).replaceAll('<','\\u003c');
  fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});
  fs.writeFileSync(file,'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hollow Wake · Targeted combat encounters</title><style>*{box-sizing:border-box}body{background:#151d22;color:#e3ebeb;font:16px/1.5 system-ui,sans-serif;max-width:1400px;margin:auto;padding:2vw}h1{color:#f2e0b9;margin-bottom:.3em}p{max-width:95ch}label{display:inline-grid;gap:.2em;margin:.5em .6em .5em 0}input,select{font:inherit;padding:.4em;background:#243039;color:inherit;border:1px solid #76868d;border-radius:4px}table{border-collapse:collapse;width:100%}th,td{text-align:left;vertical-align:top;padding:.5em;border-bottom:1px solid #40515a}th{background:#28363e}strong{color:#f0deb8}small,code{color:#afc1c1;overflow-wrap:anywhere}</style><h1>Targeted combat encounters</h1><small>'+esc(new Date().toISOString())+' · Baseline '+esc(path.basename(baseline))+'</small><p>Each entry was selected from the previous report. Identical combat setups were run with and without each passive grant. Skill owners were exercised through release, travel, upkeep and retirement. A configured attack pattern is a controlled demonstration of an available interaction. Each row states which evidence was obtained for that exact owner.</p><p>'+esc(summary)+'</p>'+
    ['interactions','cooldowns'].filter(s=>fs.existsSync(path.join(path.dirname(file),path.parse(file).name+'-'+s+'.png'))).map(s=>'<details><summary>'+ (s==='interactions'?'Compare movement, poison, burrowing and projectile defenses':'Compare three hotbar seats after a cooldown return')+'</summary><img style="max-width:100%;height:auto" alt="'+(s==='interactions'?'Paired encounter frames for movement, poison, burrowing and two projectile defenses':'Partial, full and unaffected cooldowns')+'" src="'+esc(encodeURIComponent(path.parse(file).name+'-'+s+'.png'))+'"></details>').join('')+
    groups.map(g=>'<p><strong>'+esc(g)+'</strong><br>'+counts(rows.filter(r=>r.group===g))+'</p>').join('')+
    '<details><summary>How to read the encounter evidence</summary><p>Combat frames and replays identify the skill, creature, or event that produced the drawing. An on-body landing is painted by the client when a status first appears. A shared phase is visible through the skill’s field. A configured encounter requires the combination named in its row. Alternate and legacy art can be registered without a default encounter that plays it.</p><p>For passives, “Proc fired” means the fight dispatched the effect. “Event gate verified” means a controlled event passed its rules. A combat outcome records a measured difference, such as damage or resource recovery. A combat stat records a changed value consumed by the engine in paired fights. An encounter calculation compares a grant inside an authored scene and restores the original value before play continues. Contract price and company capacity refer to the recruiter. “Sheet changed” and “Grant installed” leave the individual encounter payoff open. The frame comparisons establish visible pixels. Recognizing a cue amid overlapping skills still takes a playtest.</p></details>'+
    '<p>'+quick('Owner unobserved','Effect voice','Show visual owners still unseen')+quick('Proc fired','','Show passives that fired')+quick('Sheet changed','','Show sheet-only changes')+quick('Event gate verified','','Show controlled passive triggers')+'</p>'+
    '<label>Find an effect or owner<input id="q" type="search"></label><label>Group<select id="g"><option value="">All groups</option>'+options(groups)+'</select></label><label>Evidence<select id="s"><option value="">All evidence</option>'+options(states)+'</select></label><p id="count"></p><table><thead><tr><th>Game content</th><th>Evidence</th><th>What happened and what the player saw</th></tr></thead><tbody id="body"></tbody></table><button id="more">Show more</button><script type="application/json" id="entries">'+data+'</script><script>const rows=JSON.parse(entries.textContent);let limit=150;function filter(){const a=rows.filter(r=>(!g.value||r.group===g.value)&&(!s.value||r.state===s.value)&&[r.name,r.id,r.detail,r.appearance,r.nextEncounter].join(" ").toLowerCase().includes(q.value.toLowerCase().trim()));body.replaceChildren();for(const r of a.slice(0,limit)){const tr=body.insertRow(),c=tr.insertCell(),name=document.createElement("strong"),id=document.createElement("code");name.textContent=r.name||r.id;id.textContent=r.group+" / "+r.id;c.append(name,document.createElement("br"),id);tr.insertCell().textContent=r.state;const detail=tr.insertCell();detail.textContent=r.detail;if(r.nextEncounter){const next=document.createElement("small");next.textContent=r.nextEncounter;detail.append(document.createElement("br"),next)}if(r.appearance){const art=document.createElement("small");art.textContent="Visual design · "+r.appearance;detail.append(document.createElement("br"),art)}}count.textContent=a.length.toLocaleString()+" matching entries";more.hidden=a.length<=limit}for(const el of [q,g,s])el.oninput=()=>{limit=150;filter()};more.onclick=()=>{limit+=150;filter()};filter()</script></html>');
}
exports.run=async function(win,baseline,out,repo) {
  if (!baseline || (out && path.resolve(out).toLowerCase()===path.resolve(baseline).toLowerCase())) throw Error('Provide a baseline HTML file and a distinct output path');
  const js=async(method,...args)=>{
    const result=await win.webContents.executeJavaScript('(async()=>{try{return {value:await targetEncounters.'+method+'(...'+JSON.stringify(args)+')}}catch(error){return {error:String(error.stack??error)}}})()');
    if(result.error)throw Error(method+' '+result.error);
    return result.value;
  };
  const only=process.argv.indexOf('--case');
  if(only>=0 && !process.argv.includes('--passive-scenes')) {
    const ids=baselineRows(baseline).filter(r=>r.group==='Effect voice').map(r=>r.id);
    for(const name of process.argv[only+1].split(',')){
      const result=await js('replay',name,ids,true);
      console.log(name,result.filter(r=>!r.issue).length+' verified, playback issues:',result.filter(r=>r.issue).slice(0,4));
    }
    return;
  }
  const gallery=out?path.join(path.dirname(out),path.parse(out).name+'-cooldowns.png'):undefined;
  const study=await js('cooldownStudy');
  if(gallery)fs.writeFileSync(gallery,Buffer.from(study.image.split(',')[1],'base64'));
  console.log('Cooldown slot comparisons:',study.values);
  const interactions=await js('interactionStudy');
  if(out)fs.writeFileSync(path.join(path.dirname(out),path.parse(out).name+'-interactions.png'),Buffer.from(interactions.image.split(',')[1],'base64'));
  console.log('Interaction comparisons:',interactions.comparisons);
  if(process.argv.includes('--hud-only'))return;
  const rows=baselineRows(baseline), refs=producers(repo,rows);
  const resume=process.argv.indexOf('--resume-scenes'), recheck=process.argv.indexOf('--recheck-open'), retry=process.argv.indexOf('--retry-failed');
  const from=Math.max(resume,recheck,retry);
  let results,priorSummary='',retryText='',priorPassed=0,unconfirmed=[];
  if(from>=0) {
    const source=fs.readFileSync(process.argv[from+1],'utf8');
    const old=source.match(/id="entries">([^<]+)/);
    if(!old) throw Error('Missing targeted encounter ledger');
    results=JSON.parse(old[1]);
    for(const row of results)row.detail=row.detail.replaceAll('mana after paying for ','net mana used across the cast and recovery for ');
    if(results.length!==rows.length || results.some((r,i)=>r.id!==rows[i].id||r.group!==rows[i].group))
      throw Error('The resumed ledger does not match the baseline');
    if(recheck>=0){
      const run=source.match(/(\d+ of \d+ authored encounter scenarios passed\.)/);
      const oldPassiveRetry=source.includes('Earlier full run: '+run?.[1])&&process.argv.includes('--retry-passive-scenes');
      if(!run || (source.includes('Unverified scenarios:')&&!oldPassiveRetry))throw Error('Recheck requires a ledger with successful authored scenarios');
      priorSummary=' Earlier full run: '+run[1];
      const skipped=source.match(/Passive scene comparisons pending: ([^<.]+)\./);
      if(skipped)unconfirmed=skipped[1].split(', ');
      if(oldPassiveRetry && source.includes('Unverified scenarios:')){
        const issues=source.match(/Unverified scenarios: ([\s\S]*?)<\/p>/)[1];
        const names=await win.webContents.executeJavaScript('Object.keys(window.targetEncounterReplays)');
        unconfirmed=names.filter(n=>issues.startsWith(n+' ')||issues.includes(' / '+n+' '));
      }
    }
    if(retry>=0) {
      const prior=source.match(/(\d+) of (\d+) authored encounter scenarios passed\./);
      const rejected=source.match(/Unverified scenarios: ([\s\S]*?)<\/p>/);
      if(!prior||!rejected)throw Error('Missing previous scenario failures');
      priorPassed=Number(prior[1]);retryText=rejected[1];
    }
  }
  const scope=process.argv.includes('--proc-events')?'proc':process.argv.includes('--combined')?'interactions':undefined;
  const passiveScenes=process.argv.includes('--passive-scenes');
  if(passiveScenes&&recheck<0)throw Error('A passive scene comparison requires --recheck-open and its matching ledger');
  if(scope && recheck<0)throw Error('A targeted subset requires --recheck-open and its matching ledger');
  const groups=resume>=0||retry>=0||passiveScenes?{}:await js('start',rows,refs,results??null,scope??null);
  for (const [group,ids] of Object.entries(groups)) {
    for (let i=0;i<ids.length;i+=20) {
      await js('run',group,ids.slice(i,i+20));
      if ((i+20)%400===0) console.log(group,Math.min(ids.length,i+20),'of',ids.length);
    }
    console.log(group,ids.length,'encounters complete');
  }
  if(resume<0 && retry<0 && !passiveScenes) results=await js('finish');
  const failures=[],passiveIssues=[];
  let cases=recheck>=0||process.argv.includes('--owners-only')?[]:await win.webContents.executeJavaScript('Object.keys(window.targetEncounterReplays)');
  if(retry>=0) {
    const all=cases;cases=all.filter(s=>retryText.startsWith(s+' ')||retryText.includes(' / '+s+' '));
    if(cases.length+priorPassed!==all.length)throw Error('Scenario catalog differs from previous run');
  }
  const url=win.webContents.getURL(), byId=new Map(results.filter(r=>r.group==='Effect voice').map(r=>[r.id,r]));
  if(passiveScenes){
    const byKey=new Map(results.map(r=>[r.group+'/'+r.id,r]));
    const all=await win.webContents.executeJavaScript('Object.keys(window.targetEncounterReplays)');
    const first='passiveexpansion passivespecializations passivecrossroads passiveweave passiverings combo guardbash parry gauge overdrive radiance sympathy necromancerrites pours throngcombat companioninheritance possession wakeflame reactiveuniques attunement'.split(' ');
    const schedule=process.argv.includes('--retry-passive-scenes') && only<0?unconfirmed:[...first.filter(s=>all.includes(s)),...all];
    for(const name of new Set(schedule)){
      const candidates=results.filter(r=>r.state==='Sheet changed').map(r=>({id:r.id,group:r.group}));
      if(!candidates.length && only<0 && !process.argv.includes('--retry-passive-scenes'))break;
      await win.loadURL(url);await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())');
      let witnessed;
      try{witnessed=await js('replayPassiveReads',name,candidates);}
      catch(error){passiveIssues.push(name);if(!unconfirmed.includes(name))unconfirmed.push(name);console.warn('Passive scene comparison failed',name,String(error).slice(0,200));continue;}
      unconfirmed=unconfirmed.filter(s=>s!==name);
      for(const hit of witnessed){
        const row=byKey.get(hit.group+'/'+hit.id);
        row.state='Encounter calculation';
        row.detail+=' In the '+name+' encounter, '+hit.actor+' used '+hit.action+(hit.skill?' ('+hit.skill+')':'')+
          '. Folding the grant into the same in-game calculation changed '+hit.stat+' from '+hit.before+' to '+hit.after+
          '. The live action retained its original value. A separate visual or final outcome remains unmeasured.';
        delete row.pendingStats;delete row.nextEncounter;
      }
      if(witnessed.length)console.log(name,witnessed.length,'new passive comparisons;',candidates.length-witnessed.length,'still sheet-only');
    }
  }
  // Reload between scenarios: some tests edit their registries or the global
  // clock. Reuse the same isolated window, profile and in-memory game bundle.
  for (const [i,name] of cases.entries()) {
    await win.loadURL(url);
    await win.webContents.executeJavaScript('Promise.resolve(__game.hydrated())');
    const ids=[...byId.values()].filter(r=>!['Combat frame','Encounter replay'].includes(r.state)).map(r=>r.id);
    try {
      const seen=await js('replay',name,ids);
      for(const {id,n,source,issue} of seen) {
        const row=byId.get(id);
        if(issue){row.detail+=' '+name+' emitted the event but its client playback failed: '+issue+'.';continue;}
        row.state='Encounter replay';row.detail='The '+name+' scenario emitted this event. Its '+(source==='host'?'live combat scene':'network snapshot')+' changed '+n+' pixels during this effect’s draw in the game client.'+
          (refs[id]?.length?' Production sources: '+refs[id].slice(0,8).join(', ')+'.':'');
      }
      if(seen.length || (i+1)%10===0)console.log('Scenario',i+1,'of',cases.length,name,seen.filter(v=>!v.issue).length,'new visual receipts');
    } catch(err) {failures.push(name+' '+String(err));console.warn('Unverified scenario',name,String(err).slice(0,190));}
  }
  if (results.length!==rows.length) throw Error('Incomplete target ledger');
  const summary='An emitted event earns visual credit only when its own pixels change the combat frame. A measured change in damage or capacity, a character-sheet grant, a configured alternative and an unobserved encounter each have separate labels.';
  const errors=results.filter(r=>r.state==='Error');
  if (errors.length) throw Error(errors.length+' failed encounters '+JSON.stringify(errors.slice(0,4)));
  locateOpenConsumers(repo,results);
  save(out,results,baseline,summary+(priorSummary||' '+(priorPassed+cases.length-failures.length)+' of '+(priorPassed+cases.length)+' authored encounter scenarios passed.')+(failures.length?' Unverified scenarios: '+failures.join(' / '):'')+(unconfirmed.length?' Passive scene comparisons pending: '+unconfirmed.join(', ')+'.':''));
  console.table(results.reduce((s,r)=>{const t=s[r.group]??={};t[r.state]=(t[r.state]??0)+1;return s;},{}));
  if(failures.length) throw Error(failures.length+' unverified authored scenarios; see the report');
  if(passiveIssues.length)throw Error('Passive scene comparisons failed this run: '+passiveIssues.join(', '));
  if(out) {
    await win.loadFile(path.resolve(out));
    if (!await win.webContents.executeJavaScript('rows.length==='+results.length+' && body.rows.length>0')) throw Error('Unreadable encounter report');
  }
};
