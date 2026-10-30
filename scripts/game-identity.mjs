import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
export function identityTags(identity) {
  const client=readFileSync(fileURLToPath(new URL('./release-client.js',import.meta.url)),'utf8');
  const data=JSON.stringify(identity).replaceAll('<','\\u003c');
  return `<meta name="hollow-wake-build" content="${identity.buildId || 'local'}"><script>window.__HOLLOW_WAKE_BUILD__=${data};</script><script>${client}</script>`;
}
