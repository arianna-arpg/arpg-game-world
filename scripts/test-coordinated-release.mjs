import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import branches from '../launcher/branches.cjs';
import releases from '../launcher/releases.cjs';
import { identityFor, makeEntry, assertPair, writeCatalog, restorePair } from './release-artifacts.mjs';
import { successfulSourceRuns, verifiedBranch, makePlan, requireForwardRelease } from './plan-coordinated-release.mjs';
const repository='owner/repo', first='1'.repeat(40), second='2'.repeat(40), tool='a'.repeat(40);
const verified={runId:7,url:'https://github.com/owner/repo/actions/runs/7'};
function fixture(t, branch='main', commit=first, builtAt='2026-10-26T00:00:00Z') {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'coordinated-release-'));
  t.after(()=>{assert.ok(path.resolve(tmp).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(tmp,{recursive:true,force:true})});
  const source=path.join(tmp,'source'),site=path.join(tmp,'site');fs.mkdirSync(source);
  fs.writeFileSync(path.join(source,'index.html'),'<!doctype html><html><head></head><body><div id="start-menu">Test game</div><script>window.__game={};</script></body></html>');
  fs.writeFileSync(path.join(source,'game.js'),'// actual game bytes');
  const identity=identityFor({branch,commit,version:'0.6.0',toolingCommit:tool,builtAt,storageScope:branch==='main'?'':'preview:test'});
  const entry=makeEntry({site,directory:source,identity,verification:verified});
  return {tmp,source,site,identity,entry,data:fs.readFileSync(path.join(site,entry.desktop.path))};
}
const catalog = entry => ({format:1,repository,entries:[entry]});
const run = (extra={}) => ({id:7,status:'completed',conclusion:'success',head_repository:{full_name:repository},head_branch:'main',event:'push',head_sha:first,...extra});
test('an older successful run cannot roll a published branch backward',async()=>{
  await requireForwardRelease(async()=>{throw Error('unneeded request')},first,first);
  await requireForwardRelease(async()=>({status:'ahead'}),first,second);
  for(const status of ['behind','diverged']) await assert.rejects(requireForwardRelease(async()=>({status}),first,second),/Refusing a release/);
});

test('full CI must belong to the same repository, branch and supported event',()=>{
  for(const extra of [{event:'pull_request'},{event:'workflow_dispatch'},{conclusion:'failure'},{status:'in_progress'},
    {head_repository:{full_name:'outsider/fork'}},{head_branch:'topic'},{head_sha:'not-a-commit'},{id:0}]) {
    assert.deepEqual(successfulSourceRuns([run(extra)],repository,'main'),[]);
  }
  assert.equal(successfulSourceRuns([run()],repository,'main').length,1);
  assert.equal(successfulSourceRuns([run({head_branch:'preview',event:'workflow_dispatch'})],repository,'preview').length,1);
});
test('main release planning refuses another commit even if its CI passed',async()=>{
  const api=async()=>({workflow_runs:[run()]});
  await assert.rejects(verifiedBranch({api,repository,branch:'main',requiredCommit:second}),/No successful/);
  assert.equal((await verifiedBranch({api,repository,branch:'main',requiredCommit:first})).commit,first);
});
test('preview planning uses only a verified ancestor and never an untested branch head',async()=>{
  const api=async route=>route.startsWith('branches/')?{commit:{sha:second}}:route.startsWith('compare/')?{status:'ahead'}:
    {workflow_runs:[run({head_branch:'preview'})]};
  assert.equal((await verifiedBranch({api,repository,branch:'preview'})).commit,first);
  await assert.rejects(verifiedBranch({api:async route=>route.startsWith('compare/')?{status:'diverged'}:api(route),repository,branch:'preview'}),/No successful/);
});
test('the complete release plan pins main and every configured preview to source CI',async()=>{
  const api=async route=>route.startsWith('branches/')?{commit:{sha:second}}:
    {workflow_runs:[run({head_branch:route.includes('branch=preview')?'preview':'main',head_sha:route.includes('branch=preview')?second:first})]};
  const plan=await makePlan({api,repository,toolingCommit:first,profiles:[{id:'test',ref:'preview',storageScope:'preview:test',worldmass:true}]});
  assert.deepEqual(plan.entries.map(e=>e.commit),[first,second]);
});
test('one build produces byte-identical browser and desktop files with the same embedded identity',t=>{
  const f=fixture(t);assertPair(f.site,f.entry);
  const c=writeCatalog(f.site,repository,[f.entry],[]);
  assert.equal(c.entries[0].identity.commit,first);
  assert.match(fs.readFileSync(path.join(f.site,'play/index.html'),'utf8'),/release-status/);
  const packed=branches.decodeBundle(f.data,'main',first);
  assert.deepEqual(JSON.parse(packed.files.find(p=>p.name==='build.json').data),f.identity);
  assert.match(packed.files.find(p=>p.name==='index.html').data.toString(),/hollow-wake-build/);
});
test('a partial, changed or missing artifact cannot replace the publication catalog',t=>{
  const f=fixture(t);writeCatalog(f.site,repository,[f.entry],[]);
  const file=path.join(f.site,'releases.json'),previous=fs.readFileSync(file);
  fs.writeFileSync(path.join(f.site,path.dirname(f.entry.browser),'game.js'),'different desktop/browser game');
  assert.throws(()=>writeCatalog(f.site,repository,[f.entry],[]),/differ/);
  assert.ok(fs.readFileSync(file).equals(previous));
  assert.throws(()=>restorePair(path.join(f.tmp,'restore'),f.entry,Buffer.alloc(f.data.length)),/verification/);
});
test('the previous immutable release can be restored from its verified desktop bundle',t=>{
  const f=fixture(t),destination=path.join(f.tmp,'retained');restorePair(destination,f.entry,f.data);assertPair(destination,f.entry);
});
test('catalog rejects missing platforms, off-origin paths, unverified identities and duplicate branches',t=>{
  const f=fixture(t);
  for(const mutate of [e=>delete e.desktop,e=>e.desktop.path='https://evil.test/game',e=>e.browser='../escape',
    e=>e.identity.commit=second,e=>e.identity.toolingCommit='bad',e=>e.desktop.digest='sha256:no',e=>e.verification.runId=0]){
    const e=structuredClone(f.entry);mutate(e);
    // Source commit itself may differ legitimately; the embedded stamp check catches that case.
    if(e.identity.commit===second){assert.throws(()=>assertPair(f.site,e),/identity/);continue;}
    assert.throws(()=>releases.validateCatalog(catalog(e),repository));
  }
  assert.throws(()=>releases.validateCatalog({format:1,repository,entries:[f.entry,f.entry]},repository),/duplicate/);
});
test('desktop selects the catalog revision, verifies it, and keeps that exact offline copy',async t=>{
  const f=fixture(t),home=path.join(f.tmp,'cache');
  const fetchImpl=async(url,options)=>new URL(url).pathname.endsWith('releases.json')?Response.json(catalog(f.entry)):new Response(f.data);
  const result=await releases.prepareGame({gh:repository,branch:'main',home,fetchImpl});
  assert.equal(result.game.identity.buildId,f.identity.buildId);assert.equal(result.offline,false);
  const offline=await releases.prepareGame({gh:repository,branch:'main',home,fetchImpl:async()=>{throw new Error('offline')}});
  assert.equal(offline.game.identity.buildId,f.identity.buildId);assert.equal(offline.offline,true);
  assert.equal(releases.cachedGame(home,'different'),null);
});
test('bad downloads and mismatched stamps do not replace a working desktop game or its saves',async t=>{
  const f=fixture(t),home=path.join(f.tmp,'cache');
  branches.installBundle({home,branch:'main',commit:first,compressed:f.data,expectedIdentity:f.identity});
  fs.mkdirSync(path.join(home,'saves'));fs.writeFileSync(path.join(home,'saves','account'),'keep');
  const wrong={...f.identity,buildId:'b'.repeat(24)};
  assert.throws(()=>branches.installBundle({home,branch:'main',commit:first,compressed:f.data,expectedIdentity:wrong}),/identity/);
  assert.equal(releases.cachedGame(home,'main').identity.buildId,f.identity.buildId);
  assert.equal(fs.readFileSync(path.join(home,'saves','account'),'utf8'),'keep');
  const entry=structuredClone(f.entry);entry.identity.buildId='c'.repeat(24);
  entry.browser='builds/'+entry.identity.buildId+'/game/index.html';entry.desktop.path='builds/'+entry.identity.buildId+'/desktop.json.gz';
  const result=await releases.prepareGame({gh:repository,branch:'main',home,fetchImpl:async url=>new URL(url).pathname.endsWith('releases.json')?Response.json(catalog(entry)):new Response(Buffer.alloc(f.data.length))});
  assert.equal(result.offline,true);assert.equal(result.game.identity.buildId,f.identity.buildId);
});
test('a new build of the same source commit cannot be mistaken for an old cached artifact',t=>{
  const a=fixture(t),b=fixture(t,'main',first,'2026-10-26T01:00:00Z'),home=path.join(a.tmp,'cache');
  const firstInstall=branches.installBundle({home,branch:'main',commit:first,compressed:a.data});
  const next=branches.installBundle({home,branch:'main',commit:first,compressed:b.data});
  assert.notEqual(firstInstall.root,next.root);assert.equal(releases.cachedGame(home,'main').identity.buildId,b.identity.buildId);
  assert.ok(fs.existsSync(path.join(firstInstall.root,'index.html')));
});
test('desktop preview namespaces retain the prior branch-specific keys',t=>{
  const f=fixture(t,'preview');
  assert.equal(f.identity.storageScope,'preview:test');
  assert.equal(f.identity.desktopStorageScope,'desktop:'+branches.key('preview'));
});
