import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const yaml=createRequire(import.meta.url)('js-yaml');
const read=name=>yaml.load(fs.readFileSync('.github/workflows/'+name+'.yml','utf8'));
test('one deployment publishes the entire browser and desktop catalog only after paired smoke',()=>{
 const pages=read('pages');
 assert.equal(pages.concurrency.group,'pages');assert.equal(pages.concurrency['cancel-in-progress'],false);
 assert.equal(pages.jobs.deploy.needs,'build');
 const steps=pages.jobs.build.steps;
 const build=steps.findIndex(s=>s.run?.includes('build-coordinated-release.mjs'));
 const smoke=steps.findIndex(s=>s.run?.includes('smoke-coordinated-release.cjs'));
 const upload=steps.findIndex(s=>s.uses?.startsWith('actions/upload-pages-artifact'));
 assert.ok(build>=0&&smoke>build&&upload>smoke);
 assert.equal(fs.existsSync('.github/workflows/launcher-branches.yml'),false);
 assert.equal(fs.existsSync('scripts/publish-launcher-branch.mjs'),false);
});
test('installer publication requires exact source CI and bundles the shared published game',()=>{
 const release=read('release');assert.equal(release.jobs.package.needs,'verify-source');
 assert.ok(release.jobs['verify-source'].steps.some(s=>s.run?.includes('verifiedBranch')));
 const published=release.jobs.package.steps.find(s=>s.run==='node scripts/install-published-game.mjs');
 assert.match(published.if,/refs\/tags\//);
 assert.equal(published.env.HOLLOW_WAKE_GAME_RELEASE,'${{ needs.verify-source.outputs.game }}');
 assert.equal(release.jobs['verify-source'].outputs.game,'${{ steps.source.outputs.game }}');
 const local=release.jobs.package.steps.find(s=>s.run==='npm run build');assert.match(local.if,/!startsWith/);
 assert.equal(release.jobs.finalize.needs,'package');
});
test('nightly source is pinned after full CI and bot merges request their own CI',()=>{
 const nightly=read('nightly');assert.ok(nightly.jobs.verify.steps.some(s=>s.run==='node scripts/verified-main.mjs'));
 assert.equal(nightly.jobs.cut.steps[0].with.ref,'${{ needs.verify.outputs.sha }}');
 assert.ok(read('sync-main').jobs.integrate.steps.some(s=>s.run?.includes('gh workflow run ci.yml')));
});
test('all workflow YAML remains parseable',()=>{
 for(const file of fs.readdirSync('.github/workflows').filter(f=>f.endsWith('.yml')))assert.ok(yaml.load(fs.readFileSync('.github/workflows/'+file,'utf8')).jobs);
});
