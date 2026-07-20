import { execFileSync } from 'node:child_process';

const requestedBase = process.argv.find((arg) => arg.startsWith('--base='))?.slice('--base='.length);
const asJson = process.argv.includes('--json');

function git(args) {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function lines(value) {
  return value ? value.split(/\r?\n/).filter(Boolean) : [];
}

function exists(ref) {
  return git(['rev-parse', '--verify', '--quiet', ref]) !== null;
}

function chooseBase() {
  if (requestedBase) return requestedBase;
  if (exists('origin/main')) return 'origin/main';
  if (exists('HEAD~1')) return 'HEAD~1';
  return 'HEAD';
}

function suggestedChecks(files) {
  const checks = ['npx tsc --noEmit'];
  const changed = files.join('\n');

  if (/^src\/data\//m.test(changed)) checks.push('npm run sim -- run --suite smoke');
  if (/^(src\/engine\/levelgen|src\/engine\/worldgen|src\/data\/(tilesets|zones)|src\/engine\/formations)/m.test(changed)) {
    checks.push('npm run genqa');
  }
  if (/^(launcher\/|launcher\.config|src\/main\.ts|index\.html)/m.test(changed)) checks.push('npm run smoke:launcher');
  if (/^(launcher\/|src\/main\.ts|index\.html)/m.test(changed)) checks.push('npm run smoke');
  if (/^(src\/render\/|src\/engine\/(world|levelgen|worldgen)|src\/data\/(tilesets|zones))/m.test(changed)) {
    checks.push('npm run perf  # desktop/visual verification');
  }

  return checks;
}

const head = git(['rev-parse', '--short', 'HEAD']) ?? 'unavailable';
const branch = git(['branch', '--show-current']) || '(detached HEAD)';
const remote = git(['remote', 'get-url', 'origin']) ?? '(no origin remote)';
const base = chooseBase();
const baseSha = git(['rev-parse', '--short', base]) ?? 'unavailable';
const localChanges = lines(git(['status', '--short']));
const committedFiles = base === 'HEAD' ? [] : lines(git(['diff', '--name-only', `${base}...HEAD`]));
const dirtyFiles = lines(git(['diff', '--name-only']));
const untrackedFiles = lines(git(['ls-files', '--others', '--exclude-standard']));
const files = [...new Set([...committedFiles, ...dirtyFiles, ...untrackedFiles])].sort();
const comparison = base === 'HEAD' ? null : git(['rev-list', '--left-right', '--count', `${base}...HEAD`]);
const [behind, ahead] = comparison?.split(/\s+/).map(Number) ?? [null, null];

const context = {
  protocol: 'cross-model-review/v1',
  branch,
  head,
  base: { ref: base, sha: baseSha, behind, ahead },
  remote,
  localChanges,
  changedFiles: files,
  suggestedChecks: suggestedChecks(files),
  note: 'This command is read-only and does not fetch. Run git fetch --prune before it when the remote state itself matters.',
};

if (asJson) {
  console.log(JSON.stringify(context, null, 2));
  process.exit(0);
}

console.log('# Cross-model review context');
console.log();
console.log(`- Branch: \`${branch}\``);
console.log(`- HEAD: \`${head}\``);
console.log(`- Base: \`${base}\` (${baseSha})`);
console.log(`- Remote: \`${remote}\``);
if (behind !== null && ahead !== null) console.log(`- Compared with base: ${ahead} ahead, ${behind} behind`);
console.log(`- Working-tree entries: ${localChanges.length}`);
console.log();
console.log('## Changed files');
if (files.length) files.forEach((file) => console.log(`- \`${file}\``));
else console.log('- No changes detected against the selected base.');
console.log();
console.log('## Suggested verification');
suggestedChecks(files).forEach((check) => console.log(`- \`${check}\``));
console.log();
console.log(`> ${context.note}`);
