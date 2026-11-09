'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

/** A test-owned scratch folder. Electron locks profiles until Chromium exits,
 * so a hidden janitor removes its folder after the owning process has ended.
 * Call before app.whenReady(), while no Chromium pipes can be inherited. */
function makeTempDir(prefix) {
  if (!prefix || path.basename(prefix) !== prefix) throw new Error('A plain temporary-folder prefix is required');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  if (process.versions.electron && process.type === 'browser') {
    const janitor = `
      const fs = require('node:fs');
      const parent = Number(process.argv[1]), dir = process.argv[2];
      let retries = 0;
      const check = () => {
        try { process.kill(parent, 0); return setTimeout(check, 250); }
        catch (error) { if (error.code !== 'ESRCH') return setTimeout(check, 250); }
        try { fs.rmSync(dir, { recursive: true, force: true }); }
        catch { if (++retries < 120) setTimeout(check, 250); }
      };
      check();`;
    spawn(process.execPath, ['-e', janitor, String(process.pid), dir], {
      detached: true, stdio: 'ignore', windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    }).unref();
  } else {
    process.once('exit', () => fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  }
  return dir;
}
module.exports = { makeTempDir };
