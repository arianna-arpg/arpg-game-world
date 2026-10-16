// SOURCE-ONLY / UNRUN fixture bootstrap. Execute with Electron only through the
// independently accepted outer Job owner and pinned inner broker described by
// residency-launcher-course.cjs. It loads the actual launcher module unchanged.
// No product flag/hook is installed. Observational wrappers are fixture-local.
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { loadJsonPinned, verifyInputs, errorRecord, digest } = require('./residency-launcher-course.cjs');
const flag = name => {
  const rows = process.argv.filter(a => a.startsWith(name + '='));
  if (rows.length !== 1) throw new Error('Fixture requires exactly one ' + name);
  return rows[0].slice(name.length + 1);
};
const inputPath = flag('--fixture-input'), inputSha256 = flag('--fixture-input-sha256');
const input = loadJsonPinned(inputPath, inputSha256);
if (input.schema !== 'residency-launcher-fixture-input-v1') throw new Error('Unknown fixture input schema');
verifyInputs(input.inputs);
if (path.resolve(process.execPath).toLowerCase() !== path.resolve(input.inputs.electron.path).toLowerCase() || digest(fs.readFileSync(process.execPath)) !== input.inputs.electron.sha256) throw new Error('Actual Electron executable differs from pinned input');
if (!['second-start', 'disposed-webcontents'].includes(input.mode)) throw new Error('Unknown fixture case');
if (fs.existsSync(path.join(os.tmpdir(), 'hollow-wake-perf.lock'))) throw new Error('Existing machine perf lock: fixture refuses without modifying it');
for (const key of ['NODE_OPTIONS', 'NODE_PATH', 'ELECTRON_RUN_AS_NODE']) {
  if (process.env[key]) throw new Error('Unsafe inherited loader environment: ' + key);
}
process.env.GIT_OPTIONAL_LOCKS = '0';
const { app, BrowserWindow, ipcMain } = require('electron');
app.setPath('userData', path.join(input.outputRoot, 'profile'));
const tracePath = path.join(input.outputRoot, 'launcher-trace.jsonl');
const traceFd = fs.openSync(tracePath, 'wx');
let sequence = 0, traceClosed = false, firstRejection = null, primary = null, primaryContents = null, injected = false, creatingAuxiliary = false;
const windows = [], servers = [], children = [];
const banked = { rows: [], skipped: [], control: null, controlEnd: null, fresh: [], ramp: [], residencyWindows: [] };
const lockPath = path.join(os.tmpdir(), 'hollow-wake-perf.lock');
const record = (kind, data = {}) => {
  if (traceClosed) throw new Error('Fixture trace was already closed');
  const row = { schema: 'residency-launcher-fixture-trace-v1', sequence: ++sequence, at: new Date().toISOString(), kind, ...data };
  fs.writeSync(traceFd, JSON.stringify(row) + '\n'); fs.fsyncSync(traceFd);
};
record('bootstrap', { mode: input.mode, inputSha256, pid: process.pid, executable: process.execPath, fixtureSha256: digest(fs.readFileSync(__filename)), projectRoot: input.inputs.projectRoot });
const observeRejection = (error, channel) => {
  if (firstRejection) throw new Error('Fixture observed more than one selected rejection');
  firstRejection = errorRecord(error);
  record('selected-rejection', { channel, error: firstRejection, display: String(error), banked: JSON.parse(JSON.stringify(banked)) });
  return error;
};
// Refuse an unexpected rebuild/update/source-server spawn. Actual read-only Git
// calls still run through the exact pinned executable and remain in the jobs.
const childProcess = require('node:child_process'), realSpawn = childProcess.spawn;
const allowedGit = new Set([JSON.stringify(['rev-parse', 'HEAD']), JSON.stringify(['status', '--porcelain']), JSON.stringify(['diff', 'HEAD'])]);
childProcess.spawn = function (command, args, options) {
  if (command !== 'git' || !Array.isArray(args) || !allowedGit.has(JSON.stringify(args)) || options?.shell || options?.detached) {
    record('unexpected-spawn-refused', { command: String(command), args });
    throw new Error('Residency fixture refuses an unplanned subprocess or rebuild');
  }
  if (digest(fs.readFileSync(input.inputs.git.path)) !== input.inputs.git.sha256) throw new Error('Git executable changed');
  const child = Reflect.apply(realSpawn, this, [input.inputs.git.path, args, { ...options, windowsHide: true }]);
  const receipt = { pid: child.pid ?? null, argv: [...args], closeObserved: false, exitCode: null };
  children.push(receipt); record('git-started', receipt);
  child.once('close', (code, signal) => { receipt.closeObserved = true; receipt.exitCode = code; record('git-closed', { ...receipt, signal }); });
  return child;
};
// Route only storage to an isolated fixture directory. The real server body,
// request handling, listener and close path are used; source/dist are read-only.
const serverModule = require(path.join(input.inputs.projectRoot, 'launcher/server.cjs'));
const realStartServer = serverModule.startGameServer;
serverModule.startGameServer = async function (options) {
  if (path.resolve(options.root) !== path.resolve(input.inputs.projectRoot, 'dist') || options.host !== '127.0.0.1' || options.port !== 0) throw new Error('Fixture requires the pinned build and an ephemeral loopback listener');
  const started = await Reflect.apply(realStartServer, this, [{ ...options, savesDir: path.join(input.outputRoot, 'saves') }]);
  const server = started.server, receipt = { port: started.port, url: started.url, closeRequested: false, closeObserved: false, writes: [] };
  servers.push(receipt);
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  if (lock.pid !== process.pid) throw new Error('Actual launcher did not own the machine perf lock');
  record('server-listening', { ...receipt, lockPath, lock });
  server.prependListener('request', req => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { const row = { phase: injected ? 'course' : 'boot', method: req.method, url: req.url }; receipt.writes.push(row); record('server-write', row); }
  });
  const close = server.close;
  server.close = function (...args) { receipt.closeRequested = true; record('server-close-requested', { port: receipt.port }); return Reflect.apply(close, this, args); };
  server.once('close', () => { receipt.closeObserved = true; record('server-closed', { port: receipt.port }); });
  return started;
};
ipcMain.on('perf:beat', (event, payload) => {
  if (!primaryContents || event.sender !== primaryContents || !payload) return;
  record('beat', { payload });
  if (payload.at === 'row' && payload.row) banked.rows.push(payload.row);
  else if (payload.at === 'skip' && payload.skip) banked.skipped.push(payload.skip);
  else if (payload.at === 'control' && payload.row) banked.control = payload.row;
  else if (payload.at === 'aged') banked.controlEnd = payload.row ?? null;
  else if (payload.at === 'fresh' && payload.row) banked.fresh.push(payload.row);
  else if (payload.at === 'ramp' && payload.step) banked.ramp.push(payload.step);
  else if (payload.at === 'residency-window' && payload.window) banked.residencyWindows.push(payload.window);
});
const secondStartInjection = () => {
  const g = window.__game;
  if (!g || typeof g.devStartRun !== 'function') throw new Error('Actual browser devStartRun is unavailable');
  const original = g.devStartRun;
  let calls = 0;
  g.devStartRun = function (...args) {
    const previous = g.retained(), value = Reflect.apply(original, this, args);
    calls++;
    if (calls === 2) {
      const next = g.retained();
      if (!next || next === previous || !next.ready || (previous && previous.ready)) throw new Error('Second actual native start did not replace and retire its owner');
      const sentinel = new Error('residency launcher fixture: second native start completed then threw');
      window.__perfBeat({ at: 'fixture-second-start', calls, previousRetired: !previous || !previous.ready, nextReady: next.ready, original: { name: sentinel.name, message: sentinel.message, stack: sentinel.stack } });
      throw sentinel;
    }
    return value;
  };
};
app.on('browser-window-created', (_event, win) => {
  const receipt = { id: win.id, webContentsId: win.webContents.id, auxiliary: creatingAuxiliary, closed: false };
  windows.push(receipt); record('window-created', receipt);
  win.once('closed', () => { receipt.closed = true; record('window-closed', receipt); });
  if (creatingAuxiliary) return;
  if (primary) throw new Error('Unexpected extra launcher window');
  primary = win;
  const wc = win.webContents, realExecute = wc.executeJavaScript;
  primaryContents = wc;
  wc.executeJavaScript = function (code, ...args) {
    if (typeof code !== 'string' || !code.startsWith('window.__game.perfSweep(')) return Reflect.apply(realExecute, this, [code, ...args]);
    if (injected) throw new Error('Selected perfSweep was invoked twice');
    injected = true; record('selected-sweep', { mode: input.mode, code });
    if (input.mode === 'second-start') {
      return Reflect.apply(realExecute, this, ['(' + secondStartInjection + ')()', true])
        .then(() => Reflect.apply(realExecute, this, [code, ...args]))
        .then(value => { record('unexpected-sweep-success'); return value; }, error => { throw observeRejection(error, 'rejection'); });
    }
    // Electron 43 executeJavaScript is an async JS method. Wait for actual
    // webContents disposal, then exercise that method's native rejection.
    // Window closed alone is insufficient; no synchronous refusal is claimed.
    creatingAuxiliary = true;
    let auxiliary;
    try { auxiliary = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } }); }
    finally { creatingAuxiliary = false; }
    const disposed = auxiliary.webContents, disposedId = disposed.id;
    const destroyed = new Promise((resolve, reject) => {
      const onDestroyed = () => {
        clearTimeout(timer);
        record('auxiliary-webcontents-destroyed', { id: disposedId });
        resolve();
      };
      const timer = setTimeout(() => {
        disposed.removeListener('destroyed', onDestroyed);
        reject(new Error('Fixture setup timed out waiting for actual auxiliary webContents destruction'));
      }, 5000);
      disposed.once('destroyed', onDestroyed);
      try { auxiliary.destroy(); }
      catch (error) { clearTimeout(timer); disposed.removeListener('destroyed', onDestroyed); reject(error); }
    });
    return destroyed.then(() => {
      if (!disposed.isDestroyed()) throw new Error('Auxiliary destroyed event did not leave a disposed receiver');
      record('disposed-receiver', { id: disposedId, disposed: true });
      // Keep setup failures distinct from the selected real method's rejection.
      // No extra native preflight is substituted for executeJavaScript.
      const result = Reflect.apply(realExecute, disposed, [code, ...args]);
      record('disposed-native-call-returned', { id: disposedId, thenable: !!result && typeof result.then === 'function' });
      return Promise.resolve(result).then(value => { record('unexpected-disposed-success'); return value; }, error => { throw observeRejection(error, 'rejection'); });
    });
  };
});
const realExit = app.exit;
app.exit = function (code) {
  record('app-exit', { code, firstRejection, windows, servers, children, lockExists: fs.existsSync(lockPath), remainingPerfBeatListeners: ipcMain.listenerCount('perf:beat') });
  fs.closeSync(traceFd); traceClosed = true;
  return Reflect.apply(realExit, this, [code]);
};
// app.quit is intentionally not intercepted/prevented. If automatic quit races
// the launcher's error arm, the required app-exit/report receipt will be missing
// and the course fails instead of laundering the lifecycle problem.
require(path.join(input.inputs.projectRoot, 'launcher/main.cjs'));
