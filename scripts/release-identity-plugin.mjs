import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { identityTags } from './game-identity.mjs';
export function releaseIdentityPlugin() {
  if (process.env.HOLLOW_WAKE_COORDINATED_BUILD === '1') return { name: 'coordinated-identity-stamped-after-build' };
  const git = args => { try { return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
  const identity = { branch: git(['branch', '--show-current']) || 'detached', commit: git(['rev-parse', 'HEAD']) || 'unknown',
    version: JSON.parse(readFileSync('package.json', 'utf8')).version, builtAt: new Date().toISOString(),
    local: true, dirty: !!git(['status', '--porcelain']), storageScope: '' };
  return { name: 'game-build-identity', transformIndexHtml: html => html.replace('</head>', identityTags(identity) + '</head>') };
}
