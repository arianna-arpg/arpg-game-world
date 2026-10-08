import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import b from '../launcher/branches.cjs';
import { packBuild } from './build-launcher-branch.mjs';

const first = '1'.repeat(40), second = '2'.repeat(40);
const branch = 'codex/seamless-world-foundation';
const bundle = (commit = first, files = [{ name: 'index.html', data: Buffer.from('<html>game</html>').toString('base64') }]) =>
  zlib.gzipSync(JSON.stringify({ format: 1, branch, commit, version: '0.6.0', files }));
function home(t) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-branches-'));
  t.after(() => fs.rmSync(tmp, { recursive: true, force: true }));
  return tmp;
}
function asset(commit, data, extra = {}) {
  return { name: b.assetName(branch, commit), browser_download_url: 'https://example.test/' + commit,
    size: data.length, state: 'uploaded', digest: 'sha256:' + crypto.createHash('sha256').update(data).digest('hex'),
    created_at: commit === first ? '2026-01-01' : '2026-02-01', id: 1, ...extra };
}
test('branch listing paginates and never accepts partial or malformed catalogs', async () => {
  const calls = [];
  const rows = Array.from({ length: 100 }, (_, n) => ({name: 'feature/' + n, commit: {sha: first}}));
  const fetchImpl = async url => {
    calls.push(url);
    return Response.json(url.endsWith('page=1') ? rows : [{name: 'main', commit: {sha: second}}]);
  };
  const got = await b.listBranches({gh: 'owner/repo', fetchImpl});
  assert.equal(got.length, 101); assert.equal(calls.length, 2);
  await assert.rejects(b.listBranches({gh: 'owner/repo', fetchImpl: async url =>
    url.endsWith('page=1') ? Response.json(rows) : new Response('', {status: 503})}), /503/);
  await assert.rejects(b.listBranches({gh: 'owner/repo', fetchImpl: async () => Response.json([{ name:'broken' }])}), /invalid/);
  await assert.rejects(b.listBranches({gh: '../escape', fetchImpl}), /owner\/name/);
});
test('deleted selections and offline state fall back to main; existing branches remain selectable', () => {
  const rows = [{name:'main',commit:first}, {name:branch,commit:second}];
  assert.equal(b.selectAvailable(rows, branch, 'main', true), branch);
  assert.equal(b.selectAvailable(rows.slice(0,1), branch, 'main', true), 'main');
  assert.equal(b.selectAvailable(rows, branch, 'main', false), 'main');
  assert.equal(b.selectAvailable([], 'main', 'main', false), 'main');
});
test('branch and repository names cannot alias cache locations', () => {
  const root = '/cache';
  const a = b.branchDir(root,'owner/repo','feature/a');
  for (const name of ['feature-a','Feature/a','../feature/a','feature/a.']) {
    assert.notEqual(b.branchDir(root,'owner/repo',name),a);
  }
  assert.notEqual(b.branchDir(root,'other/repo','feature/a'),a);
  assert.equal(b.branchDir(root,'OWNER/REPO','feature/a'),a);
});
test('only complete, bounded, digest-verified matching assets are offered', () => {
  const data = bundle();
  const old = asset(first,data), latest = asset(second,bundle(second));
  for (const extra of [{state:'open'}, {size:0}, {size:b.MAX_BUNDLE+1}, {digest:null}, {browser_download_url:'http://example.test/x'}]) {
    assert.equal(b.pickBundle([old,{...latest,...extra}],branch).commit,first);
  }
  assert.equal(b.pickBundle([old,latest],branch).commit,second);
  assert.equal(b.pickBundle([old], 'another-branch'),null);
});
test('asset discovery reads every page', async () => {
  const data = bundle();
  const fetchImpl = async url => {
    if (url.includes('/tags/')) return Response.json({id:7, draft:false});
    return Response.json(url.endsWith('page=1') ? Array.from({length:100},()=>({name:'unrelated'})) : [asset(first,data)]);
  };
  assert.equal((await b.findBundle({gh:'o/r',fetchImpl},branch)).commit,first);
});
test('bundle install is atomic, retains saves and old build on failed update', t => {
  const tmp = home(t);
  const original = b.installBundle({home:tmp,branch,commit:first,compressed:bundle()});
  fs.mkdirSync(path.join(tmp,'saves'));
  fs.writeFileSync(path.join(tmp,'saves','save_0.json'),'progress');
  assert.throws(() => b.installBundle({home:tmp,branch,commit:second,compressed:bundle(first)}), /identity/);
  assert.equal(b.installed(tmp).commit,first);
  assert.ok(fs.existsSync(path.join(original.root,'index.html')));
  b.installBundle({home:tmp,branch,commit:second,compressed:bundle(second)});
  assert.equal(b.installed(tmp).commit,second);
  assert.equal(fs.readFileSync(path.join(tmp,'saves','save_0.json'),'utf8'),'progress');
  assert.equal(fs.readdirSync(tmp).filter(n=>n.startsWith('.')).length,0);
});
test('unsafe paths, duplicate aliases, wrong identity, and missing entry refuse before writing', t => {
  const tmp = home(t);
  for (const name of ['../escape','/absolute','C:/bad','a\\\\b','a//b','NUL.txt','a/../b','file:stream','a.','a ','COM1/file']) {
    assert.equal(b.safeFile(name),false,name);
    assert.throws(()=>b.installBundle({home:tmp,branch,commit:first,compressed:bundle(first,[{name,data:'eA=='}])}), /unsafe/);
  }
  assert.throws(()=>b.decodeBundle(bundle(first,[{name:'index.html',data:'eA=='},{name:'INDEX.html',data:'eA=='}]),branch,first),/duplicate/);
  assert.throws(()=>b.decodeBundle(bundle(first,[{name:'a.js',data:'eA=='}]),branch,first),/entry point/);
  assert.throws(()=>b.decodeBundle(bundle(),'wrong',first),/identity/);
  assert.equal(fs.readdirSync(tmp).length,0);
});
test('verified download installs; corrupt and interrupted downloads preserve the current build', async t => {
  const tmp = home(t), data = bundle();
  const pick = b.pickBundle([asset(first,data)],branch);
  await b.downloadBundle({home:tmp,branch,bundle:pick,fetchImpl:async()=>new Response(data)});
  const next = b.pickBundle([asset(second,bundle(second))],branch);
  await assert.rejects(b.downloadBundle({home:tmp,branch,bundle:next,fetchImpl:async()=>new Response(Buffer.alloc(bundle(second).length, 0))}),/verification/i);
  await assert.rejects(b.downloadBundle({home:tmp,branch,bundle:next,fetchImpl:async()=>{throw new Error('offline');}}),/offline/);
  assert.equal(b.installed(tmp).commit,first);
  assert.equal(fs.readdirSync(tmp).filter(n=>n.startsWith('.download')).length,0);
});
test('real packager round-trips nested assets and large bundles', t => {
  const tmp = home(t), input = path.join(tmp,'dist'), output = path.join(tmp,'output');
  fs.mkdirSync(path.join(input,'assets'),{recursive:true});
  fs.writeFileSync(path.join(input,'index.html'),'<script src="./assets/game.js"></script>');
  fs.writeFileSync(path.join(input,'assets','game.js'),'x'.repeat(12*1024*1024));
  const file = packBuild({directory:input,output,branch,commit:first,version:'1.0.0'});
  const installed = b.installBundle({home:path.join(tmp,'cache'),branch,commit:first,compressed:fs.readFileSync(file)});
  assert.equal(fs.statSync(path.join(installed.root,'assets','game.js')).size,12*1024*1024);
});

