// Package a verified static game for the desktop launcher. No runtime dependency.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import branches from '../launcher/branches.cjs';

export function packBuild({ directory, output, branch, commit, version }) {
  if (!branch || !branches.isCommit(commit)) throw new Error('A branch name and full commit SHA are required.');
  const files = [];
  function walk(dir, prefix = '') {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const name = prefix + ent.name;
      if (ent.name === '.build-head') continue;
      if (!branches.safeFile(name) || ent.isSymbolicLink()) throw new Error('Unsafe build file: ' + name);
      if (ent.isDirectory()) walk(path.join(dir, ent.name), name + '/');
      else if (ent.isFile()) files.push({ name, data: fs.readFileSync(path.join(dir, ent.name)).toString('base64') });
      else throw new Error('Unsupported build file: ' + name);
    }
  }
  walk(directory);
  const data = zlib.gzipSync(JSON.stringify({ format: 1, branch, commit, version, files }), { level: 9 });
  branches.decodeBundle(data, branch, commit);
  fs.mkdirSync(output, { recursive: true });
  const dest = path.join(output, branches.assetName(branch, commit));
  fs.writeFileSync(dest, data);
  return dest;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const source = path.resolve(process.env.BUILD_SOURCE || '.');
  const output = path.resolve(process.env.BUILD_OUTPUT || 'release/branch');
  const version = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).version;
  console.log(packBuild({ directory: path.join(source, 'dist'), output,
    branch: process.env.BUILD_BRANCH, commit: process.env.BUILD_COMMIT, version }));
}

