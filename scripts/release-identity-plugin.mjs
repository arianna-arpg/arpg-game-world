import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { identityTags } from './game-identity.mjs';
export function releaseIdentityPlugin() {
  if (process.env.HOLLOW_WAKE_COORDINATED_BUILD === '1') return { name: 'coordinated-identity-stamped-after-build' };
  let root;
  return {
    name: 'game-build-identity',
    configResolved(config) { root = config.root; },
    transformIndexHtml(html) {
      const git = args => { try { return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
      const identity = { branch: git(['branch', '--show-current']) || 'detached', commit: git(['rev-parse', 'HEAD']) || 'unknown',
        version: JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version, builtAt: new Date().toISOString(),
        local: true, dirty: !!git(['status', '--porcelain']), storageScope: '' };
      return html.replace('</head>', identityTags(identity) + '</head>');
    },
  };
}
