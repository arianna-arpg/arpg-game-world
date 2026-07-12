// ---------------------------------------------------------------------------
// DESKTOP SHELL — Electron main process. The game stops being a browser tab:
//
//   LAUNCHER window  → shows the installed version, checks the GitHub repo
//                      (git fetch vs the configured remote/branch), offers
//                      one-click update (pull --ff-only → npm install →
//                      build), then launches the game.
//   GAME window      → a dedicated Chromium window (no menus, no extensions,
//                      no browser gestures to fight the game's input) served
//                      from dist/ over loopback HTTP by launcher/server.cjs,
//                      which also carries the /__save endpoints — saves land
//                      in the same saves/ folder as dev-server play.
//
// Everything tunable lives in launcher.config.json (committed defaults),
// deep-merged with launcher.config.local.json (gitignored, machine-local) —
// window mode, ports, repo remote/branch, update policy. No hardcoding.
//
// PACKAGED (npm run dist → NSIS installer / Linux AppImage): the SAME trio,
// minus the repo. dist/ + the committed config ship as extraResources beside
// the exe, saves move to userData, and updates become a GitHub-Releases
// version probe with a download link (a package can't rebuild itself). Every
// path resolves through the PACKAGED/REPO/BASE seam below — nothing else
// changes, and the smoke modes run against a packaged exe unmodified.
//
// Flags:
//   --play                 skip the launcher, straight into the game
//   --fullscreen           force the game window fullscreen (gamescope/Steam
//                          Deck sessions auto-detect via window.fullscreen 'auto')
//   --smoke-test[=game|launcher]  headless self-check: boot, assert, exit.
//
// Build staleness is stamped: dist/.build-head records the HEAD hash + a
// digest of `git status --porcelain` at build time; Play rebuilds only when
// the stamp drifts, so day-to-day launches are instant.
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

const { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startGameServer } = require('./server.cjs');

// ------------------------------------------------------------------- config

/** @param {any} base @param {any} over @returns {any} */
function merge(base, over) {
  const out = { ...(base ?? {}) };
  for (const k of Object.keys(over ?? {})) {
    const b = base ? base[k] : undefined, o = over[k];
    out[k] = (b && o && typeof b === 'object' && typeof o === 'object'
      && !Array.isArray(b) && !Array.isArray(o)) ? merge(b, o) : o;
  }
  return out;
}

/** @param {string} file @returns {any} */
function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return null; }
}

// ---------------------------------------------- environment (checkout vs pkg)
// ONE seam decides where everything lives. A CHECKOUT (dev) runs git/npm and
// keeps dist/, config and saves in the repo. A PACKAGED install
// (app.isPackaged — `npm run dist`) has no repo: dist/ + the committed config
// ship as extraResources, machine-local config overrides load from beside the
// exe and from userData, saves live in userData (an AppImage mount is
// read-only, and Program Files should never hold saves), and updates switch
// from `git pull` to a GitHub-Releases version probe.
const PACKAGED = app.isPackaged;
/** Repo root in a checkout; null when packaged (nowhere to run git/npm). */
const REPO = PACKAGED ? null : path.join(__dirname, '..');
/** Where the built game + committed launcher.config.json live. */
const BASE = PACKAGED ? process.resourcesPath : path.join(__dirname, '..');
const DIST = path.join(BASE, 'dist');
const STAMP = path.join(DIST, '.build-head');
/** Packaged identity (version/hash/branch/date), stamped at dist time by
 *  scripts/make-build-info.mjs; null in a checkout — git answers live. */
const BUILD_INFO = PACKAGED ? readJson(path.join(BASE, 'build-info.json')) : null;

// Hard fallbacks so a missing/broken config file can never brick the launcher.
const CONFIG_DEFAULTS = {
  game: { title: 'Hollow Wake' },
  repo: { remote: 'origin', branch: 'main', github: 'arianna-arpg/arpg-game-world' },
  updates: { checkOnLaunch: true, mode: 'auto' },
  window: { width: 1600, height: 900, maximized: true, fullscreen: 'auto', devtools: true, zoom: 1 },
  server: { host: '127.0.0.1', port: 0 },
  launcher: { width: 700, height: 680, returnToLauncher: true, autoPlayOnGamescope: true },
  paths: { saves: 'auto' },
  debug: { bootLog: true },
};
// Merge order (later wins): hard defaults ← committed defaults (ship with the
// install) ← machine-local overrides. A checkout keeps the single repo-root
// local file; a packaged install accepts one BESIDE THE EXE (portable
// tweaks), then one in USERDATA (survives reinstalls — the last word).
let cfg = merge(CONFIG_DEFAULTS, readJson(path.join(BASE, 'launcher.config.json')));
// A packaged install's IDENTITY (the userData home for saves/storage, the
// single-instance scope) follows the configured game title — set BEFORE any
// userData-relative path resolves, or Electron files everything under the
// internal package name ("arpg-test-game") and collides with dev profiles.
// Dev keeps the package-name default so existing dev storage stays put.
if (PACKAGED) app.setName(String(cfg.game.title));
const LOCAL_CONFIGS = PACKAGED
  ? [
    path.join(path.dirname(app.getPath('exe')), 'launcher.config.local.json'),
    path.join(app.getPath('userData'), 'launcher.config.local.json'),
  ]
  : [path.join(BASE, 'launcher.config.local.json')];
for (const f of LOCAL_CONFIGS) cfg = merge(cfg, readJson(f));

/** 'git' (pull + rebuild the checkout) | 'release' (GitHub-Releases version
 *  probe + download link) | 'none'. 'auto' picks by environment. */
const UPDATE_MODE = (() => {
  const m = String(cfg.updates.mode ?? 'auto');
  return (m === 'git' || m === 'release' || m === 'none') ? m : (PACKAGED ? 'release' : 'git');
})();

/**
 * The saves directory, from cfg.paths.saves. 'auto' = <repo>/saves in a
 * checkout (the same folder dev-server play writes), <userData>/saves when
 * packaged. Explicit values may template ${repo} (checkout only), ${data}
 * (userData), ${exe} (beside the executable) and ${home}; a relative result
 * resolves against the install base.
 */
function resolveSavesDir() {
  const spec = String((cfg.paths && cfg.paths.saves) || 'auto');
  if (spec === 'auto') {
    return REPO ? path.join(REPO, 'saves') : path.join(app.getPath('userData'), 'saves');
  }
  const expanded = spec
    .replace(/\$\{repo\}/g, REPO ?? app.getPath('userData'))
    .replace(/\$\{data\}/g, app.getPath('userData'))
    .replace(/\$\{exe\}/g, path.dirname(app.getPath('exe')))
    .replace(/\$\{home\}/g, os.homedir());
  return path.resolve(BASE, expanded);
}
const SAVES = resolveSavesDir();

// -------------------------------------------------------------------- flags

const argv = process.argv.slice(1);
/** @param {string} flag */
const flagValue = (flag) => {
  const hit = argv.find(a => a === flag || a.startsWith(flag + '='));
  if (!hit) return null;
  return hit.includes('=') ? hit.split('=')[1] : '';
};
const SMOKE = flagValue('--smoke-test') !== null ? (flagValue('--smoke-test') || 'game') : null;
const PERF = flagValue('--perf-test') !== null;
const PLAY_DIRECT = flagValue('--play') !== null;

/** A Steam Deck / gamescope session (Game Mode, or any gamescope nest) —
 *  drives fullscreen 'auto' AND the straight-into-the-game launch policy. */
function gamescopeSession() {
  return !!(process.env.SteamDeck || process.env.SteamOS
    || process.env.XDG_CURRENT_DESKTOP === 'gamescope' || process.env.GAMESCOPE_WAYLAND_DISPLAY);
}

/** window.fullscreen: true/false, or 'auto' → fullscreen exactly when running
 *  inside a Steam Deck / gamescope session. `--fullscreen` forces it on. */
function resolveFullscreen() {
  if (flagValue('--fullscreen') !== null) return true;
  const v = cfg.window.fullscreen;
  if (typeof v === 'boolean') return v;
  return gamescopeSession();
}

// ----------------------------------------------------------------- boot log
// A packaged install that dies before its first window is INVISIBLE — Steam
// just shows a spinner forever. So every launch overwrites a tiny breadcrumb
// file in userData (launcher.log) recording the walk to the first window and
// any fatal exit: "it hangs" becomes "it stopped after line N". Costs one
// appendFileSync per milestone; debug.bootLog=false turns it off.
const BOOT_LOG = (cfg.debug && cfg.debug.bootLog) === false
  ? null : path.join(app.getPath('userData'), 'launcher.log');
if (BOOT_LOG) {
  try { fs.mkdirSync(path.dirname(BOOT_LOG), { recursive: true }); fs.writeFileSync(BOOT_LOG, ''); }
  catch { /* diagnostics must never be the thing that breaks the boot */ }
}
/** @param {string} line */
function boot(line) {
  if (BOOT_LOG) { try { fs.appendFileSync(BOOT_LOG, `[${new Date().toISOString()}] ${line}\n`); } catch { } }
  if (SMOKE) console.log(`[boot] ${line}`);
}
boot(`start v=${app.getVersion()} packaged=${PACKAGED} platform=${process.platform}`
  + ` gamescope=${gamescopeSession()} argv=[${argv.join(' ')}]`
  + ` LD_PRELOAD=${process.env.LD_PRELOAD || '(none)'}`);
process.on('uncaughtException', (e) => boot(`FATAL uncaught: ${(e && e.stack) || e}`));
process.on('unhandledRejection', (e) => boot(`FATAL unhandled rejection: ${e}`));
// Chromium child health — a dead GPU process or zygote is exactly the kind
// of silent boot-killer (Steam's overlay preload, missing GL) this file exists
// to make visible.
app.on('child-process-gone', (_e, d) => boot(`child-process-gone type=${d.type} reason=${d.reason} exitCode=${d.exitCode ?? '?'}`));
app.on('render-process-gone', (_e, _wc, d) => boot(`render-process-gone reason=${d.reason} exitCode=${d.exitCode ?? '?'}`));

// -------------------------------------------------------- child process runs

/** @type {BrowserWindow | null} */ let launcherWin = null;
/** @type {BrowserWindow | null} */ let gameWin = null;
/** @type {import('node:http').Server | null} */ let gameServer = null;
/** @type {string | null} */ let gameUrl = null;
/** What long operation is in flight (guards double-clicks); null = idle. */
/** @type {string | null} */ let busy = null;

/** @param {string} line */
function log(line) {
  if (launcherWin && !launcherWin.isDestroyed()) launcherWin.webContents.send('launcher:log', line);
  if (SMOKE) console.log(`[launcher] ${line}`);
}

/**
 * Run a child process, streaming its output lines to the launcher log.
 * npm needs a shell on Windows (npm.cmd can't be spawned directly since the
 * CVE-2024-27980 hardening), and Node deprecates shell+args-array — so the
 * npm path joins the command itself. INVARIANT: every arg is a fixed literal
 * or a git remote/branch name (no spaces possible) — nothing user-typed ever
 * reaches a shell.
 * @param {string} cmd @param {string[]} args @param {{ quiet?: boolean }} [opts]
 * @returns {Promise<{ code: number | null, out: string, err: string }>}
 */
function run(cmd, args, opts) {
  return new Promise((resolve) => {
    // A packaged install has no repo and no toolchain — nothing to spawn into.
    if (!REPO) { resolve({ code: -1, out: '', err: 'child processes are unavailable in a packaged install' }); return; }
    const useShell = process.platform === 'win32' && cmd === 'npm';
    const child = useShell
      ? spawn([cmd, ...args].join(' '), { cwd: REPO, shell: true, windowsHide: true })
      : spawn(cmd, args, { cwd: REPO, windowsHide: true });
    let out = '', err = '';
    const feed = (/** @type {Buffer} */ chunk, /** @type {boolean} */ isErr) => {
      const s = chunk.toString();
      if (isErr) err += s; else out += s;
      if (!opts?.quiet) {
        for (const line of s.split(/\r?\n/)) if (line.trim()) log(line.trimEnd());
      }
    };
    child.stdout?.on('data', c => feed(c, false));
    child.stderr?.on('data', c => feed(c, true));
    child.on('error', (e) => { err += String(e); resolve({ code: -1, out, err }); });
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

/** @param {string[]} args @param {{ quiet?: boolean }} [opts] */
const git = (args, opts) => run('git', args, opts ?? { quiet: true });
/** @param {string[]} args */
const npm = (args) => run('npm', args);

// ------------------------------------------------------------ repo & builds

async function repoStatus() {
  if (PACKAGED) {
    // No repo to interrogate — the dist-time stamp IS this install's identity.
    const b = BUILD_INFO ?? {};
    return {
      title: cfg.game.title,
      version: app.getVersion(),
      branch: String(b.branch ?? ''), hash: String(b.hash ?? ''),
      subject: String(b.subject ?? ''), date: String(b.date ?? ''),
      dirty: !!b.dirty,
      remoteUrl: cfg.repo.github ? `https://github.com/${cfg.repo.github}` : null,
      distBuilt: fs.existsSync(path.join(DIST, 'index.html')),
      checkOnLaunch: !!cfg.updates.checkOnLaunch,
      repo: { remote: cfg.repo.remote, branch: cfg.repo.branch },
      packaged: true, updateMode: UPDATE_MODE, savesDir: SAVES,
    };
  }
  const pkg = readJson(path.join(/** @type {string} */ (REPO), 'package.json')) ?? {};
  const branch = (await git(['rev-parse', '--abbrev-ref', 'HEAD'])).out.trim();
  const headRaw = (await git(['log', '-1', '--format=%h%x09%s%x09%ci'])).out.trim();
  const [hash = '', subject = '', date = ''] = headRaw.split('\t');
  const dirty = (await git(['status', '--porcelain'])).out.trim().length > 0;
  const remote = (await git(['remote', 'get-url', cfg.repo.remote])).out.trim();
  return {
    title: cfg.game.title,
    version: pkg.version ?? '0.0.0',
    branch, hash, subject, date, dirty,
    remoteUrl: remote || null,
    distBuilt: fs.existsSync(path.join(DIST, 'index.html')),
    checkOnLaunch: !!cfg.updates.checkOnLaunch,
    repo: { remote: cfg.repo.remote, branch: cfg.repo.branch },
    packaged: false, updateMode: UPDATE_MODE, savesDir: SAVES,
  };
}

async function checkGitUpdates() {
  log(`Checking ${cfg.repo.remote}/${cfg.repo.branch} for updates…`);
  const fetch = await git(['fetch', cfg.repo.remote, cfg.repo.branch], { quiet: false });
  if (fetch.code !== 0) {
    log('Update check failed (offline, or the remote is unreachable).');
    return { ok: false, error: (fetch.err || fetch.out || 'git fetch failed').trim() };
  }
  const range = `HEAD..${cfg.repo.remote}/${cfg.repo.branch}`;
  const behind = parseInt((await git(['rev-list', '--count', range])).out.trim(), 10) || 0;
  const ahead = parseInt((await git(['rev-list', '--count', `${cfg.repo.remote}/${cfg.repo.branch}..HEAD`])).out.trim(), 10) || 0;
  const logOut = (await git(['log', '--format=%h%x09%s', range])).out.trim();
  const changes = logOut ? logOut.split('\n').map(l => {
    const [hash = '', subject = ''] = l.split('\t');
    return { hash, subject };
  }) : [];
  log(behind === 0 ? 'Up to date.' : `${behind} update${behind === 1 ? '' : 's'} available.`);
  return { ok: true, behind, ahead, changes, mode: 'git' };
}

// ----------------------------------------------- release-mode update checks

/** The newest release's page URL, remembered by the last successful check so
 *  the Update button can open exactly what it announced. */
/** @type {string | null} */ let latestReleaseUrl = null;

/** @param {unknown} s @returns {number[] | null} */
function parseVer(s) {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(String(s ?? ''));
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
/** @param {number[]} a @param {number[]} b — true when a > b */
function newerVersion(a, b) {
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
  }
  return false;
}

/** Packaged installs can't rebuild themselves — instead: is there a NEWER
 *  GitHub Release than the version stamped into this install? */
async function checkReleaseUpdates() {
  const gh = String(cfg.repo.github ?? '');
  if (!gh) return { ok: false, error: 'Release checks need repo.github ("owner/name") in launcher.config.json.' };
  log(`Checking github.com/${gh} for a newer release…`);
  try {
    const res = await fetch(`https://api.github.com/repos/${gh}/releases/latest`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'hollow-wake-launcher' },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) {
      log('No releases published yet — you are on the newest thing there is.');
      return { ok: true, behind: 0, ahead: 0, changes: [], mode: 'release' };
    }
    if (!res.ok) return { ok: false, error: `GitHub API answered HTTP ${res.status}.` };
    const rel = /** @type {any} */ (await res.json());
    latestReleaseUrl = typeof rel.html_url === 'string' ? rel.html_url : null;
    const current = parseVer(app.getVersion());
    const latest = parseVer(rel.tag_name);
    const behind = current && latest && newerVersion(latest, current) ? 1 : 0;
    log(behind ? `Release ${rel.tag_name} is available.` : 'Up to date.');
    return {
      ok: true, behind, ahead: 0, mode: 'release',
      changes: behind
        ? [{ hash: String(rel.tag_name ?? ''), subject: String(rel.name || rel.tag_name || 'New release') }]
        : [],
    };
  } catch (e) {
    log('Update check failed (offline, or GitHub is unreachable).');
    return { ok: false, error: String(e) };
  }
}

async function checkUpdates() {
  if (UPDATE_MODE === 'none') return { ok: true, behind: 0, ahead: 0, changes: [], mode: 'none' };
  if (UPDATE_MODE === 'release') return checkReleaseUpdates();
  return checkGitUpdates();
}

/** The build stamp: HEAD + a digest of what's uncommitted. Any pull or local
 *  edit changes it, so Play knows exactly when dist/ went stale. */
async function buildStamp() {
  const head = (await git(['rev-parse', 'HEAD'])).out.trim();
  if (!head) return null; // not a git repo — fall back to dist-exists checks
  const porcelain = (await git(['status', '--porcelain'])).out;
  return `${head}|${crypto.createHash('sha1').update(porcelain).digest('hex')}`;
}

/** @param {boolean} [force] @returns {Promise<{ ok: boolean, error?: string }>} */
async function ensureBuilt(force) {
  if (PACKAGED) {
    // The package ships its dist; there is no compiler out here to run.
    return fs.existsSync(path.join(DIST, 'index.html'))
      ? { ok: true }
      : { ok: false, error: 'This install is missing its game files (resources/dist) — reinstall it.' };
  }
  const stamp = await buildStamp();
  const have = fs.existsSync(STAMP) ? fs.readFileSync(STAMP, 'utf-8') : null;
  const fresh = fs.existsSync(path.join(DIST, 'index.html')) && stamp !== null && have === stamp;
  if (fresh && !force) return { ok: true };
  log('Building the game (tsc + vite)…');
  const res = await npm(['run', 'build']);
  if (res.code !== 0) {
    log('BUILD FAILED — see output above.');
    return { ok: false, error: 'Build failed — the game was not started.' };
  }
  const after = await buildStamp();
  if (after) fs.writeFileSync(STAMP, after);
  log('Build complete.');
  return { ok: true };
}

async function update() {
  if (UPDATE_MODE === 'release') {
    // No self-mutation in a packaged install — hand the player the download.
    const gh = String(cfg.repo.github ?? '');
    const url = latestReleaseUrl ?? (gh ? `https://github.com/${gh}/releases/latest` : null);
    if (!url) return { ok: false, error: 'No release URL known — set repo.github in launcher.config.json.' };
    log('Opening the latest release in your browser — install it, then relaunch.');
    shell.openExternal(url);
    return { ok: true, opened: true };
  }
  if (UPDATE_MODE === 'none') return { ok: false, error: 'Updates are disabled for this install (updates.mode).' };
  const pull = await run('git', ['pull', '--ff-only', cfg.repo.remote, cfg.repo.branch]);
  if (pull.code !== 0) {
    log('PULL FAILED — you may have local changes; commit or stash them first.');
    return { ok: false, error: (pull.err || pull.out || 'git pull failed').trim() };
  }
  log('Installing dependencies…');
  const inst = await npm(['install', '--no-audit', '--no-fund']);
  if (inst.code !== 0) return { ok: false, error: 'npm install failed — see log.' };
  return ensureBuilt(true);
}

// --------------------------------------------------------------- full reset

/**
 * FULL RESET — erase every trace of play so the next boot is a first boot.
 * A desktop install persists play state in exactly two places; wipe both:
 *   1. saves/ on disk — the /__save slots (account with its unlocks, sagas,
 *      nemeses and corpses; the active character; settings; the roster) plus
 *      any future artifact that lands in the folder: the wipe is
 *      pattern-blind on purpose, so new persistence never needs changes here.
 *   2. The Chromium profile's storage — the game's synchronous localStorage
 *      mirrors of those slots. The disk-first loaders fall back to the
 *      mirrors when a slot 404s, so skipping this would resurrect the
 *      account on next boot. Clearing per-origin also catches stale copies
 *      left by earlier random server ports.
 * dist/, launcher.config*.json and the repo are build/machine state, not
 * play state, and are deliberately untouched. The confirm lives HERE in the
 * main process: a renderer bug can never wipe data without the user
 * clicking through a native dialog.
 * @returns {Promise<{ ok: boolean, cancelled?: boolean, removed?: number, error?: string }>}
 */
async function resetAllData() {
  if (gameWin && !gameWin.isDestroyed()) {
    return { ok: false, error: 'Close the game window first — a running game would just re-save itself over the wipe.' };
  }
  const entries = fs.existsSync(SAVES) ? fs.readdirSync(SAVES) : [];
  /** @type {Electron.MessageBoxOptions} */
  const box = {
    type: 'warning',
    title: 'Reset everything?',
    message: 'Erase ALL saved data and start from a fresh slate?',
    detail:
      'This permanently deletes:\n\n' +
      `  •  ${entries.length} file${entries.length === 1 ? '' : 's'} in saves/ — the account (unlocks, sagas, nemeses, corpses), every character and roster slot, and settings\n` +
      '  •  All of the game\'s cached browser data (the localStorage save mirrors)\n\n' +
      'The game itself — code, build, launcher settings — is not touched.',
    buttons: ['Cancel', 'Erase everything'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
    checkboxLabel: 'I understand this permanently erases all progress.',
  };
  const win = (launcherWin && !launcherWin.isDestroyed()) ? launcherWin : null;
  const choice = win ? await dialog.showMessageBox(win, box) : await dialog.showMessageBox(box);
  if (choice.response !== 1) { log('Reset cancelled — nothing was erased.'); return { ok: true, cancelled: true }; }
  if (!choice.checkboxChecked) {
    log('Reset aborted — the "I understand" box was not ticked; nothing was erased.');
    return { ok: true, cancelled: true };
  }

  /** @type {string[]} */
  const failures = [];
  let removed = 0;
  for (const name of entries) {
    try { fs.rmSync(path.join(SAVES, name), { recursive: true, force: true }); removed++; }
    catch (e) { failures.push(`${name}: ${String(e)}`); }
  }
  try { await session.defaultSession.clearStorageData(); }
  catch (e) { failures.push(`browser storage: ${String(e)}`); }
  log(`Fresh slate — erased ${removed}/${entries.length} save file${entries.length === 1 ? '' : 's'} and cleared the game's browser storage.`);
  if (failures.length) {
    for (const f of failures) log('  reset failure — ' + f);
    return { ok: false, removed, error: `Some data could not be erased: ${failures.join('; ')}` };
  }
  return { ok: true, removed };
}

// ------------------------------------------------------------------ windows

async function ensureServer() {
  if (gameServer && gameUrl) return gameUrl;
  const started = await startGameServer({
    root: DIST, savesDir: SAVES,
    host: cfg.server.host, port: cfg.server.port,
  });
  gameServer = started.server;
  gameUrl = started.url;
  log(`Game server on ${started.url}`);
  boot(`game server on ${started.url} (dist=${DIST})`);
  return started.url;
}

/** @param {{ show?: boolean }} [opts] */
function createGameWindow(opts) {
  const fullscreen = resolveFullscreen();
  const w = new BrowserWindow({
    width: cfg.window.width,
    height: cfg.window.height,
    show: opts?.show !== false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0e',
    title: cfg.game.title,
    fullscreen,
    webPreferences: { devTools: !!cfg.window.devtools },
  });
  if (cfg.window.maximized && !fullscreen && opts?.show !== false) w.maximize();
  w.webContents.on('did-finish-load', () => {
    if (cfg.window.zoom && cfg.window.zoom !== 1) w.webContents.setZoomFactor(cfg.window.zoom);
  });
  // No application menu exists (real-game feel), so provide the essentials:
  w.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F12' && cfg.window.devtools) { w.webContents.toggleDevTools(); e.preventDefault(); }
    else if (input.key === 'F5' && cfg.window.devtools) { w.webContents.reload(); e.preventDefault(); }
  });
  w.on('closed', () => {
    gameWin = null;
    if (!SMOKE && cfg.launcher.returnToLauncher && launcherWin && !launcherWin.isDestroyed()) {
      launcherWin.show();
      launcherWin.webContents.send('launcher:state', { t: 'game-closed' });
    } else if (!SMOKE) {
      app.quit();
    }
  });
  return w;
}

async function play() {
  const built = await ensureBuilt();
  if (!built.ok) { boot(`play: build check failed — ${built.error || 'unknown'}`); return built; }
  const url = await ensureServer();
  if (gameWin && !gameWin.isDestroyed()) { gameWin.focus(); return { ok: true }; }
  gameWin = createGameWindow();
  boot('game window created');
  await gameWin.loadURL(url);
  boot('game page loaded');
  if (launcherWin && !launcherWin.isDestroyed()) launcherWin.hide();
  return { ok: true };
}

/** @param {{ show?: boolean }} [opts] */
function createLauncherWindow(opts) {
  const w = new BrowserWindow({
    width: cfg.launcher.width,
    height: cfg.launcher.height,
    show: opts?.show !== false,
    resizable: true,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0e',
    title: `${cfg.game.title} — Launcher`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  boot('launcher window created');
  w.loadFile(path.join(__dirname, 'launcher.html'));
  w.webContents.once('did-finish-load', () => boot('launcher page loaded'));
  w.on('closed', () => {
    launcherWin = null;
    // Closing the launcher only quits when no game is running.
    if (!gameWin || gameWin.isDestroyed()) app.quit();
  });
  return w;
}

// ---------------------------------------------------------------------- ipc

/** Serialize the mutating operations so double-clicks can't overlap them.
 * @param {string} name @param {() => Promise<any>} fn */
async function exclusive(name, fn) {
  if (busy) return { ok: false, error: `Busy: ${busy} is still running.` };
  busy = name;
  try { return await fn(); }
  catch (e) { log(`${name} failed: ${String(e)}`); return { ok: false, error: String(e) }; }
  finally { busy = null; }
}

function wireIpc() {
  ipcMain.handle('launcher:status', () => repoStatus());
  ipcMain.handle('launcher:check', () => exclusive('check', () => checkUpdates()));
  ipcMain.handle('launcher:update', () => exclusive('update', () => update()));
  ipcMain.handle('launcher:play', () => exclusive('play', () => play()));
  ipcMain.handle('launcher:rebuild', () => exclusive('rebuild', () => ensureBuilt(true)));
  ipcMain.handle('launcher:reset', () => exclusive('reset', () => resetAllData()));
  ipcMain.handle('launcher:quit', () => { app.quit(); });
}

// -------------------------------------------------------------- smoke tests

/** Boot the real thing headlessly, assert it works, print, exit — this is
 *  what `npm run smoke` / CI use to prove the desktop path end-to-end. */
async function smoke() {
  /** @type {string[]} */
  const errors = [];
  /** @param {Electron.WebContents} wc @param {string} tag */
  const watch = (wc, tag) => {
    // Electron ≥43 event-object form: {level: 'error'|'warning'|…, message}.
    // (Declaring the old positional params trips Electron's deprecation shim.)
    wc.on('console-message', (/** @type {any} */ e) => {
      if (e && e.level === 'error') errors.push(`${tag} console: ${e.message}`);
    });
    wc.on('render-process-gone', (_e, details) => errors.push(`${tag} renderer gone: ${details.reason}`));
    wc.on('did-fail-load', (_e, code, desc) => errors.push(`${tag} load failed: ${code} ${desc}`));
  };
  /** @param {number} ms */
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  /** A green run is only trustworthy if the error watcher demonstrably sees
   *  page errors — inject one, require it to be captured, then discard it.
   *  @param {Electron.WebContents} wc */
  const watcherSelfTest = async (wc) => {
    await wc.executeJavaScript(`console.error('SMOKE-SELFTEST')`);
    await wait(250);
    const i = errors.findIndex(x => x.includes('SMOKE-SELFTEST'));
    if (i === -1) errors.push('console-error watcher is BLIND — smoke results are untrustworthy');
    else errors.splice(i, 1);
  };

  try {
    if (SMOKE === 'launcher') {
      launcherWin = createLauncherWindow({ show: false });
      watch(launcherWin.webContents, 'launcher');
      await new Promise(r => launcherWin?.webContents.once('did-finish-load', () => r(null)));
      await wait(1200); // let the page run its status() round-trip
      const api = await launcherWin.webContents.executeJavaScript('typeof window.launcher');
      const version = await launcherWin.webContents.executeJavaScript(
        `(document.getElementById('build-line')?.textContent ?? '').length > 0`);
      if (api !== 'object') errors.push(`preload bridge missing (typeof window.launcher = ${api})`);
      if (!version) errors.push('status round-trip never populated the build line');
      // Presence only — NEVER invoke reset from a smoke run (it would erase
      // this machine's real saves behind the headless window).
      const resetApi = await launcherWin.webContents.executeJavaScript('typeof window.launcher.reset');
      const resetBtn = await launcherWin.webContents.executeJavaScript(`!!document.getElementById('reset')`);
      if (resetApi !== 'function') errors.push(`reset bridge missing (typeof window.launcher.reset = ${resetApi})`);
      if (!resetBtn) errors.push('reset button missing from the launcher page');
      await watcherSelfTest(launcherWin.webContents);
    } else {
      if (!fs.existsSync(path.join(DIST, 'index.html'))) {
        console.log('SMOKE game: dist/ missing — building first…');
        const built = await ensureBuilt();
        if (!built.ok) throw new Error('build failed');
      }
      const url = await ensureServer();
      gameWin = createGameWindow({ show: false });
      watch(gameWin.webContents, 'game');
      await gameWin.loadURL(url);
      await wait(2500); // async boot: account load, world init, start menu
      const game = await gameWin.webContents.executeJavaScript('typeof window.__game');
      const menu = await gameWin.webContents.executeJavaScript(
        `!!document.querySelector('#start-menu:not(.hidden)')`);
      const saveProbe = await gameWin.webContents.executeJavaScript(
        `fetch('/__save/0').then(r => r.status).catch(() => 'ERR')`);
      if (game !== 'object') errors.push(`window.__game is ${game} — game did not boot`);
      if (!menu) errors.push('start menu never appeared');
      if (saveProbe !== 200 && saveProbe !== 404) errors.push(`/__save endpoint broken (status ${saveProbe})`);
      await watcherSelfTest(gameWin.webContents);
      console.log(`SMOKE game: __game=${game} startMenu=${menu} saveEndpoint=${saveProbe}`);
    }
  } catch (e) {
    errors.push(String(e));
  }

  if (errors.length) {
    console.log(`SMOKE ${SMOKE} FAILED:`);
    for (const e of errors) console.log('  - ' + e);
  } else {
    console.log(`SMOKE ${SMOKE} OK`);
  }
  gameServer?.close();
  app.exit(errors.length ? 1 : 0);
}

// -------------------------------------------------------------- perf harness

/** `npm run perf` — boot the real desktop game VISIBLE (true compositor
 *  pacing; a hidden window throttles rAF and lies), run the in-page perf
 *  sweep (src/dev/perf.ts) over the tileset matrix, gate the numbers against
 *  balance/perf.config.json, write a report, exit 0 / 2 (budget breached) /
 *  1 (harness error) — the genqa contract for frame cost. Budgets are DATA:
 *  each zone is judged RELATIVE to the same run's town control (so the
 *  verdict travels across machines) plus generous absolute backstops. */
async function perfMode() {
  /** @param {number} ms */
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const cfgPath = path.join(BASE, 'balance', 'perf.config.json');
  /** @type {any} */
  let budgets;
  try { budgets = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
  catch (e) { console.log('PERF FAILED: cannot read ' + cfgPath + ': ' + String(e)); app.exit(1); return; }
  /** @type {string[]} */
  const errors = [];
  try {
    const built = await ensureBuilt(); // a stale dist would measure old code
    if (!built.ok) throw new Error('build failed');
    const url = await ensureServer();
    gameWin = createGameWindow({ show: true });
    gameWin.webContents.setBackgroundThrottling(false);
    gameWin.webContents.on('render-process-gone', (_e, d) => errors.push('renderer gone: ' + d.reason));
    await gameWin.loadURL(url);
    await wait(2500); // async boot: account load, world init, start menu
    const ready = await gameWin.webContents.executeJavaScript(`typeof window.__game`);
    if (ready !== 'object') throw new Error('window.__game is ' + ready + ' — game did not boot');
    /** @type {any} */
    const opts = {
      seconds: Number(flagValue('--seconds') || budgets.sampleSeconds || 6),
      settleSeconds: Number(budgets.settleSeconds || 1.5),
      filter: flagValue('--filter') || '',
    };
    // FORENSICS FLAGS: `--weather=snow|clear|…` pins a deterministic sky,
    // `--ablate=snowwash,lights,…` skips render passes (src/dev/perf.ts).
    // Either one makes this a diagnostic run: the gate still PRINTS its
    // verdict, but never exits 2 — an ablated zone being fast (or a pinned
    // storm being slow) is the experiment, not a regression.
    const weatherFlag = flagValue('--weather');
    if (weatherFlag !== null) opts.weather = weatherFlag;
    const ablateFlag = flagValue('--ablate');
    if (ablateFlag) opts.ablate = ablateFlag.split(',').map(s => s.trim()).filter(Boolean);
    const forensics = weatherFlag !== null || !!ablateFlag;
    console.log(`PERF: sweeping tilesets (${opts.seconds}s steady + ${opts.settleSeconds}s entry per zone` +
      (opts.filter ? `, filter '${opts.filter}'` : '') +
      (opts.weather !== undefined ? `, weather pinned '${opts.weather || 'clear'}'` : '') +
      (opts.ablate ? `, ablate [${opts.ablate.join(',')}]` : '') + `)…`);
    /** @type {any} */
    const report = await gameWin.webContents.executeJavaScript(
      `window.__game.perfSweep(${JSON.stringify(opts)})`, true);

    // ---- the gate: relative-to-town caps + absolute backstops, all data ----
    const rel = budgets.relative ?? {};
    const abs = budgets.absolute ?? {};
    const ctl = report.control;
    const secs = report.sampleSeconds || 6;
    /** @type {string[]} */
    const breaches = [];
    /** @type {string[]} */
    const lines = [];
    /** @param {any} z @param {string} name */
    const row = (z, name) =>
      `${name.padEnd(16)} ${String(z.gapP50).padStart(6)} ${String(z.gapP95).padStart(6)} ${String(z.gapP99).padStart(6)}` +
      ` ${String(z.gapMax).padStart(7)} ${String(z.hitch40).padStart(3)} ${String(z.entryWorstGap).padStart(7)}` +
      ` ${String(z.simP99).padStart(6)} ${String(z.renP99).padStart(6)}` +
      ` ${String(z.snowBakes ?? 0).padStart(5)} ${String(z.groundBakes ?? 0).padStart(5)} ${String(z.snowCover ?? 0).padStart(5)}` +
      `  ${z.zone}`; // zone names already carry their variant
    lines.push('tileset           gap50  gap95  gap99  gapMax h40   entry  sim99  ren99  snB   grB  cover  zone');
    lines.push(row(ctl, '(town ctl)'));
    for (const z of report.zones) {
      lines.push(row(z, z.tileset));
      // Per-tileset overrides (budgets.overrides[id]) merge over the shared
      // caps — the explicit, committed registry of known-heavy zones (each
      // entry should carry a _todo note; the gate stays data end to end).
      const ov = (budgets.overrides ?? {})[z.tileset] ?? {};
      const relZ = { ...rel, ...(ov.relative ?? {}) };
      const absZ = { ...abs, ...(ov.absolute ?? {}) };
      const capP50 = ctl.gapP50 * (relZ.gapP50Mul ?? 99) + (relZ.slackMs ?? 0);
      const capP99 = ctl.gapP99 * (relZ.gapP99Mul ?? 99) + (relZ.slackMs ?? 0);
      if (z.gapP50 > capP50) breaches.push(`${z.tileset}: gapP50 ${z.gapP50}ms > cap ${capP50.toFixed(1)} (town ${ctl.gapP50} x${relZ.gapP50Mul} +${relZ.slackMs})`);
      if (z.gapP99 > capP99) breaches.push(`${z.tileset}: gapP99 ${z.gapP99}ms > cap ${capP99.toFixed(1)} (town ${ctl.gapP99} x${relZ.gapP99Mul} +${relZ.slackMs})`);
      if (absZ.gapMaxMs != null && z.gapMax > absZ.gapMaxMs) breaches.push(`${z.tileset}: gapMax ${z.gapMax}ms > ${absZ.gapMaxMs}`);
      // Hitch rates carry a GRACE COUNT (absolute.hitchGraceCount): a short
      // window quantizes rate brutally (8s can only express 0 or ≥7.5/min),
      // so a rate breach additionally needs more than `grace` offending
      // frames — one stray OS/driver frame is noise, two is a pattern.
      const grace = absZ.hitchGraceCount ?? 0;
      if (absZ.maxHitch40PerMin != null && z.hitch40 > grace && z.hitch40 * 60 / secs > absZ.maxHitch40PerMin) {
        breaches.push(`${z.tileset}: ${z.hitch40} frames >40ms in ${secs}s (${(z.hitch40 * 60 / secs).toFixed(1)}/min > ${absZ.maxHitch40PerMin}/min, grace ${grace})`);
      }
      if (absZ.maxHitch70PerMin != null && z.hitch70 > grace && z.hitch70 * 60 / secs > absZ.maxHitch70PerMin) {
        breaches.push(`${z.tileset}: ${z.hitch70} frames >70ms in ${secs}s (${(z.hitch70 * 60 / secs).toFixed(1)}/min > ${absZ.maxHitch70PerMin}/min, grace ${grace})`);
      }
      if (absZ.entryWorstGapMs != null && z.entryWorstGap > absZ.entryWorstGapMs) {
        breaches.push(`${z.tileset}: entry burst ${z.entryWorstGap}ms > ${absZ.entryWorstGapMs}`);
      }
    }
    console.log(lines.join('\n'));
    if (report.skipped?.length) console.log('skipped (unknown/unmintable): ' + report.skipped.join(', '));
    console.log(`canvas ${report.canvas.w}x${report.canvas.h} @dpr ${report.dpr}`);

    // ---- report files (balance/reports is gitignored, like every gate) ----
    const stampStr = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const dir = path.join(BASE, 'balance', 'reports', 'perf_' + stampStr);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ budgets, opts, report, breaches }, null, 2));
    fs.writeFileSync(path.join(dir, 'report.md'), [
      '# perf ' + stampStr, '',
      ...(forensics ? [`FORENSICS RUN (weather '${opts.weather ?? '(natural)'}', ablate [${(opts.ablate ?? []).join(',')}]) — gate informative only.`, ''] : []),
      '```', ...lines, '```', '',
      breaches.length ? '## BREACHES\n' + breaches.map(b => '- ' + b).join('\n') : 'No budget breached.',
    ].join('\n'));
    console.log('report -> ' + dir);

    if (errors.length) throw new Error(errors.join('; '));
    if (breaches.length) {
      console.log(forensics ? 'PERF (forensics — informative only):' : 'PERF BREACHED:');
      for (const b of breaches) console.log('  - ' + b);
    } else {
      console.log('PERF OK — no budget breached.');
    }
    gameServer?.close();
    app.exit(forensics ? 0 : (breaches.length ? 2 : 0));
  } catch (e) {
    console.log('PERF FAILED: ' + String(e));
    gameServer?.close();
    app.exit(1);
  }
}

// --------------------------------------------------------------------- boot

Menu.setApplicationMenu(null);

if (!SMOKE && !PERF) {
  const locked = app.requestSingleInstanceLock();
  if (!locked) {
    app.quit();
  } else {
    app.on('second-instance', () => {
      const win = (gameWin && !gameWin.isDestroyed()) ? gameWin : launcherWin;
      if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
    });
  }
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { gameServer?.close(); });
// Never follow navigations out of the game/launcher; external links go to the OS browser.
app.on('web-contents-created', (_e, wc) => {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
});

app.whenReady().then(async () => {
  boot('electron ready');
  if (SMOKE) { wireIpc(); await smoke(); return; }
  if (PERF) { wireIpc(); await perfMode(); return; }
  wireIpc();
  // STRAIGHT INTO THE GAME: --play asks for it, and a gamescope / Steam Deck
  // session implies it — a console-style boot wants the game, not a utility
  // window (the launcher stays a Desktop-Mode tool, and any failure still
  // falls back to it so the error has somewhere visible to land).
  // launcher.autoPlayOnGamescope=false restores launcher-first everywhere.
  const direct = PLAY_DIRECT
    || (cfg.launcher.autoPlayOnGamescope !== false && gamescopeSession());
  if (direct) {
    boot(`direct play (flag=${PLAY_DIRECT} gamescope=${gamescopeSession()})`);
    const res = await exclusive('play', () => play());
    if (!res.ok) { // fall back to the launcher so the error is visible
      boot(`direct play failed: ${res.error || 'unknown'} — showing the launcher`);
      launcherWin = createLauncherWindow();
    }
    return;
  }
  launcherWin = createLauncherWindow();
});
