// Keep one rolling GitHub issue with the newest night's digest as its body.
// A red night also leaves a comment, so the regression notifies whoever watches the
// issue instead of silently rewriting the body. Issue bodies cap at 65,536 characters;
// the digest is trimmed with a pointer to the full copy on the data branch.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const LABEL = 'balance-farm';
const MAX_BODY = 60_000;
const repo = process.env.GITHUB_REPOSITORY;
const status = JSON.parse(readFileSync('farm-report/status.json', 'utf8'));
let digest = readFileSync('farm-report/digest.md', 'utf8');
const fullCopy = `https://github.com/${repo}/blob/${process.env.DATA_BRANCH ?? 'balance-farm-data'}/nights/${status.night}/digest.md`;

export function trimBody(body, max = MAX_BODY, link = fullCopy) {
  if (body.length <= max) return body;
  return `${body.slice(0, max)}\n\n… trimmed. [Full digest](${link}).\n`;
}

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();

digest = trimBody(digest);
writeFileSync('farm-report/issue-body.md', digest);

gh('label', 'create', LABEL, '-R', repo, '--color', '5319E7', '--description', 'The balance farm\'s rolling nightly digest', '--force');
const open = JSON.parse(gh('issue', 'list', '-R', repo, '--label', LABEL, '--state', 'open', '--json', 'number', '--limit', '1'));
let number = open[0]?.number;
if (number) {
  gh('issue', 'edit', String(number), '-R', repo, '--title', status.title, '--body-file', 'farm-report/issue-body.md');
} else {
  const url = gh('issue', 'create', '-R', repo, '--title', status.title, '--label', LABEL, '--body-file', 'farm-report/issue-body.md');
  number = Number(url.split('/').pop());
}
if (status.red) {
  const body = [`**Regression on the night of ${status.night}:**`, '', ...status.reasons.map(r => `- ${r}`)].join('\n');
  gh('issue', 'comment', String(number), '-R', repo, '--body', body);
}
console.log(`Issue #${number} updated: ${status.title}`);
