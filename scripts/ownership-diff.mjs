// The staged ownership boundary. A normal commit compares with HEAD. During
// a merge, independently reconstruct the parents' automatic merge and inspect
// EVERY departure from it. There is no caller-supplied baseline or bypass.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const options = { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] };
const git = (...args) => execFileSync('git', ['--literal-pathspecs', ...args], options);
const oid = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

export function stagedOwnershipDiff() {
  if (git('ls-files', '--unmerged', '-z')) throw new Error('Unresolved index entries: resolve and stage the merge before attribution.');
  let mergeHead;
  try {
    mergeHead = readFileSync(git('rev-parse', '--git-path', 'MERGE_HEAD').trim(), 'utf8');
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
  let provenance = null;
  if (mergeHead !== undefined) {
    const incoming = mergeHead.trim().split(/\s+/);
    if (incoming.length !== 1 || !oid.test(incoming[0])) {
      throw new Error('Only a two-parent merge can be automatically attributed; invalid or multiple MERGE_HEAD entries.');
    }
    const parents = [git('rev-parse', '--verify', 'HEAD^{commit}').trim(),
      git('rev-parse', '--verify', `${incoming[0]}^{commit}`).trim()];
    const merged = spawnSync('git', ['merge-tree', '--write-tree', '--name-only', '-z', ...parents], options);
    if (merged.error || ![0, 1].includes(merged.status)) {
      throw new Error(`Cannot reconstruct the parent merge: ${merged.error?.message ?? merged.stderr}`);
    }
    const parts = merged.stdout.split('\0');
    const tree = parts.shift();
    if (!oid.test(tree ?? '') || git('cat-file', '-t', tree).trim() !== 'tree') {
      throw new Error('Parent merge did not produce a verifiable tree.');
    }
    const conflicts = [];
    if (merged.status === 1) {
      for (const path of parts) {
        if (!path) break;
        conflicts.push(path);
      }
      if (!conflicts.length) throw new Error('Parent merge failed without identifiable conflict paths.');
      for (const path of conflicts) {
        // A deletion is a valid resolution; an unedited conflict blob is not.
        const entries = git('ls-files', '--stage', '-z', '--', path).split('\0').filter(Boolean);
        for (const entry of entries) {
          const match = /^\d+ ([a-f0-9]+) 0\t/.exec(entry);
          if (!match) throw new Error(`Unresolved merge entry: ${path}`);
          const content = git('cat-file', 'blob', match[1]);
          if (/^(?:<{7,}|={7,}|>{7,}|\|{7,})(?: .*)?\r?$/m.test(content)) {
            throw new Error(`Conflict markers remain staged in ${path}`);
          }
        }
      }
    }
    provenance = {
      kind: 'parent-merge', parents, tree, conflicts,
      changedPaths: git('diff', '--name-only', '-z', parents[0], tree, '--').split('\0').filter(Boolean),
    };
  }
  const diff = git('-c', 'core.quotePath=false', 'diff', '--cached', '-U0',
    '--no-color', '--no-ext-diff', '--no-textconv', ...(provenance ? [provenance.tree] : []), '--');
  return { diff, provenance };
}
