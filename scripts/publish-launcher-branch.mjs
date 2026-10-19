// Runs only in the trusted publisher job after validation and smoke tests.
// Branch code never receives a contents:write token.
import fs from 'node:fs';
import path from 'node:path';
import branches from '../launcher/branches.cjs';
const gh = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const api = process.env.GITHUB_API_URL || 'https://api.github.com';
if (!gh || !token) throw new Error('Publisher requires repository and token.');
async function request(route, opts = {}) {
  const response = await fetch(api + '/repos/' + gh + route, {
    ...opts, headers: { accept: 'application/vnd.github+json', authorization: 'Bearer ' + token,
      'content-type': 'application/json', 'user-agent': 'hollow-wake-build-publisher', ...opts.headers },
  });
  if (!response.ok) throw new Error('GitHub HTTP ' + response.status + ' for ' + route);
  return response.status === 204 ? null : response.json();
}
const branch = process.env.BUILD_BRANCH;
const commit = process.env.BUILD_COMMIT;
if (!branch || !branches.isCommit(commit)) throw new Error('Invalid publication identity.');
// Deleted or superseded branches cannot publish stale results.
const head = await request('/branches/' + encodeURIComponent(branch));
if (head.commit.sha !== commit) {
  console.log('Branch moved; the newer run will publish.'); process.exit(0);
}
let release;
try { release = await request('/releases/tags/' + branches.RELEASE_TAG); }
catch {
  // A simultaneous branch publisher may create it first; refetch in that case.
  try { release = await request('/releases', { method: 'POST', body: JSON.stringify({
    tag_name: branches.RELEASE_TAG, target_commitish: process.env.TOOLING_COMMIT,
    name: 'Launcher branch builds', body: 'Verified game bundles for the launcher branch selector. These are not application installers.',
    prerelease: true, make_latest: 'false',
  }) }); } catch { release = await request('/releases/tags/' + branches.RELEASE_TAG); }
}
const directory = path.resolve(process.env.BUILD_OUTPUT || 'bundle');
const name = branches.assetName(branch, commit);
const buffer = fs.readFileSync(path.join(directory, name));
branches.decodeBundle(buffer, branch, commit);
const assets = [];
for (let page = 1; ; page++) {
  const batch = await request('/releases/' + release.id + '/assets?per_page=100&page=' + page);
  assets.push(...batch); if (batch.length < 100) break;
}
const exact = assets.find(a => a.name === name && a.state === 'uploaded' && a.size === buffer.length);
if (exact) { console.log('Build already published: ' + name); process.exit(0); }
for (const a of assets.filter(a => a.name === name)) await request('/releases/assets/' + a.id, { method: 'DELETE' });
const response = await fetch(release.upload_url.replace(/\{.*$/, '') + '?name=' + encodeURIComponent(name), {
  method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/gzip',
    'user-agent': 'hollow-wake-build-publisher' }, body: buffer,
});
if (!response.ok) throw new Error('Upload failed: HTTP ' + response.status);
const uploaded = await response.json();
const crypto = await import('node:crypto');
const digest = 'sha256:' + crypto.createHash('sha256').update(buffer).digest('hex');
if (uploaded.state !== 'uploaded' || uploaded.size !== buffer.length || uploaded.digest !== digest) {
  throw new Error('GitHub did not confirm the published bundle digest.');
}
// Keep the newest two successful builds per branch. Never delete another branch.
const older = assets.filter(a => a.name.startsWith(branches.assetPrefix(branch)) && a.name !== name)
  .sort((a,b) => String(b.created_at).localeCompare(String(a.created_at)));
for (const a of older.slice(1)) await request('/releases/assets/' + a.id, { method: 'DELETE' });
console.log('Published ' + branch + ' @ ' + commit.slice(0, 8));

