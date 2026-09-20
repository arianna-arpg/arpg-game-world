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
// the exe, saves move to userData, and updates become THE DIRECT UPDATE —
// probe GitHub Releases, stream this platform's artifact down with live
// progress, then swap it in place (silent NSIS re-run on Windows, AppImage
// overwrite-and-relaunch on Linux/Steam Deck). No browser, no hand-install;
// opening the release page survives only as the fallback when the direct
// path fails (updates.directInstall=false restores it outright). Every
// path resolves through the PACKAGED/REPO/BASE seam below — nothing else
// changes, and the smoke modes run against a packaged exe unmodified.
//
// THE RELEASE CHANNEL (updates.channel — launcher/updates.cjs holds the
// whole brain, pure and unit-tested; docs/engine/updates.md is the contract):
// 'nightly' (the default) follows the release CADENCE — the newest PUBLISHED
// release, last night's RC included; 'stable' follows hand-cut stables only.
// A night that failed is never published (red verify = no tag; a red package
// leg or packaged smoke = a draft no anonymous caller can see), so a
// launcher can only ever be offered a night that passed; and the download is
// hashed against the sha256 GitHub publishes before anything is run.
//
// THE TWO FACES (cfg.dev — the launcher page's Developer box, persisted to
// launcher.config.local.json): PLAYER mode is the default and is a launched
// game — the built dist/ over loopback, no DevTools, no dev panel, the log
// tucked away, and Launch Game.bat leaves no terminal behind. DEVELOPER mode
// opens DevTools (F12 / F5) and raises the in-game dev panel; its sub-toggles
// add LIVE SOURCE (the game runs from src/ on a Vite dev server the launcher
// spawns — hot reload and the passive-tree editor's source write-back;
// checkout only), FORGES (Entity / Glyph / Map on the start menu), the
// PASSIVE TREE EDITOR, and the TERMINAL window. `devMode()` is the one fold.
//
// Flags:
//   --play                 skip the launcher, straight into the game
//   --fullscreen           force the game window fullscreen (gamescope/Steam
//                          Deck sessions auto-detect via window.fullscreen 'auto')
//   --smoke-test[=game|launcher|source|update]  headless self-check: boot,
//                          assert, exit. `game` pins the built lane and
//                          `source` the live-source lane, whatever the local
//                          toggles say; `update` pins the RELEASE lane against
//                          a loopback fixture (no network, nothing installed,
//                          no settings written) — the publish gate's proof
//                          that this build can still find and verify its
//                          own successor.
//
// Build staleness is stamped: dist/.build-head records the HEAD hash + a
// digest of `git status --porcelain` at build time; Play rebuilds only when
// the stamp drifts, so day-to-day launches are instant.
// ---------------------------------------------------------------------------
// @ts-check
'use strict';

const { app, BrowserWindow, dialog, ipcMain, Menu, powerSaveBlocker, session, shell } = require('electron');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startGameServer } = require('./server.cjs');
const { createDeadman, skipVerdict } = require('./perfdeadman.cjs');
const updates = require('./updates.cjs');

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

// ------------------------------------------------------------- the insignia
// THE WINDOW ICON: the same mark the website and the packaged exe wear
// (scripts/make-icon.mjs paints build/icon.ico + icon.png from the
// insignia's math), set explicitly on BOTH windows so a dev checkout
// (`npm run game`) and a Linux AppImage carry it on the title bar and the
// taskbar exactly like the installed Windows exe does. Windows takes the
// multi-size .ico (the title bar and the taskbar each pull their own
// frame); everything else takes the 512 PNG. A packaged install ships both
// as extraResources beside the exe (electron-builder.yml); a checkout reads
// them from build/. A missing file degrades to Electron's default icon —
// never a refusal, the launcher's standing law.
const ICON_DIR = PACKAGED ? BASE : path.join(__dirname, '..', 'build');
/** @type {string | undefined} */
const APP_ICON = (() => {
  const file = path.join(ICON_DIR, process.platform === 'win32' ? 'icon.ico' : 'icon.png');
  return fs.existsSync(file) ? file : undefined;
})();

// Hard fallbacks so a missing/broken config file can never brick the launcher.
const CONFIG_DEFAULTS = {
  game: { title: 'Hollow Wake' },
  repo: { remote: 'origin', branch: 'main', github: 'arianna-arpg/arpg-game-world' },
  // channel + the probe/download dials fold through updates.resolveUpdateCfg
  // (launcher/updates.cjs UPDATE_DEFAULTS) — the one read; see updateCfg().
  updates: { checkOnLaunch: true, mode: 'auto', directInstall: true, channel: 'nightly' },
  window: { width: 1600, height: 900, maximized: true, fullscreen: 'auto', devtools: true, zoom: 1 },
  server: { host: '127.0.0.1', port: 0 },
  launcher: { width: 700, height: 720, returnToLauncher: true, autoPlayOnGamescope: true },
  paths: { saves: 'auto' },
  // THE TWO FACES — see devMode(). vitePort is the live-source lane's
  // preferred port; a taken port bumps (Vite's own law), never collides.
  dev: { developer: false, liveSource: true, forges: false, passiveEditor: false, console: false, vitePort: 5173 },
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

// -------------------------------------------------------------------- flags
// (read this early: the update smoke pins UPDATE_MODE just below)

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

/** 'git' (pull + rebuild the checkout) | 'release' (GitHub-Releases channel
 *  probe + direct install) | 'none'. 'auto' picks by environment. The update
 *  smoke PINS the release lane — it proves that lane from a checkout and
 *  from a packaged exe alike, whatever the machine's config says. */
const UPDATE_MODE = (() => {
  if (SMOKE === 'update') return 'release';
  const m = String(cfg.updates.mode ?? 'auto');
  return (m === 'git' || m === 'release' || m === 'none') ? m : (PACKAGED ? 'release' : 'git');
})();

/** THE UPDATE DIALS, folded live (the channel picker rewrites cfg.updates at
 *  runtime, so this is a read, never a boot-time constant). */
const updateCfg = () => updates.resolveUpdateCfg(cfg.updates, cfg.repo);
/** What the launcher page needs to draw the channel picker. */
const channelStatus = () => ({
  channel: updateCfg().channel,
  channels: updates.UPDATE_CHANNELS.map(c => ({ id: c.id, label: c.label, blurb: c.blurb })),
});

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

if (PERF) {
  // Windows' native occlusion tracker can STICK a visible window at
  // 'occluded' (a long-standing Chromium bug class) — Chromium then
  // throttles rAF to 1Hz and a gate run flatlines at ~1000ms gaps while the
  // window sits plainly on screen (measured 2026-07-15: town control 8.3 one
  // run, 1000.2 the next, same build; alwaysOnTop + display-wake + power
  // blocker all powerless). The measurement window must never trust that
  // tracker; the real game keeps it (it SHOULD throttle when covered).
  app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion');
  // Expose window.gc to the sweep (perf runs ONLY — normal play never sees
  // it): a 37-zone sweep hops zones at a rate no player ever will, and the
  // discarded backing stores pile up until V8's collection storm lands on
  // whoever holds the sample window when the threshold trips — the breach
  // wears an innocent zone's name (tundra 2026-07-12, gutworks 2026-07-16:
  // 2 frames >70ms at matrix seat 26, clean twice when run solo). The sweep
  // drains the debt explicitly inside each zone's DISCARDED entry window
  // (src/dev/perf.ts), so steady windows measure the zone, not the hop
  // history.
  app.commandLine.appendSwitch('js-flags', '--expose-gc');
}

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
      directInstall: cfg.updates.directInstall !== false,
      platform: process.platform, dev: cfg.dev, mode: devMode(),
      ...channelStatus(),
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
    directInstall: cfg.updates.directInstall !== false,
    platform: process.platform, dev: cfg.dev, mode: devMode(),
    ...channelStatus(),
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

/** What the last successful check found: the release page (the fallback
 *  surface), the tag, and THIS platform's installer asset — the direct-update
 *  payload, digest included — so the Update button acts on exactly what it
 *  announced. Reset whenever the channel changes. */
/** @type {{ url: string | null, tag: string | null, asset: import('./updates.cjs').Asset | null }} */
let latestRelease = { url: null, tag: null, asset: null };

/**
 * Packaged installs can't rebuild themselves — instead: does the configured
 * CHANNEL hold a release NEWER than the version stamped into this install?
 * The selection itself (drafts out, off-channel out, incomplete releases
 * passed over, highest version wins, never a downgrade) is
 * updates.pickUpdate — this is only the fetch, the log and the page's shape.
 */
async function checkReleaseUpdates() {
  const gh = String(cfg.repo.github ?? '');
  if (!gh) return { ok: false, error: 'Release checks need repo.github ("owner/name") in launcher.config.json.' };
  const ucfg = updateCfg();
  const row = updates.channelRow(ucfg.channel);
  log(`Checking github.com/${gh} for a newer release (${row.label.toLowerCase()} channel)…`);
  try {
    const releases = await updates.fetchReleases({ gh, channel: ucfg.channel, ucfg });
    const current = app.getVersion();
    const pick = updates.pickUpdate(releases, {
      channel: ucfg.channel, platform: process.platform, current, window: ucfg.scanReleases,
    });
    for (const s of pick.skipped) log(`Passed over ${s.tag} — ${s.why}.`);
    const t = pick.behind ? pick.newer[0] : null;
    latestRelease = t ? { url: t.url, tag: t.tag, asset: t.asset } : { url: null, tag: null, asset: null };
    if (!pick.scanned) log(`No ${row.id === 'stable' ? 'stable ' : ''}releases are published yet — you are on the newest thing there is.`);
    else if (t) {
      log(`Release ${t.tag} is available`
        + (pick.behind > 1 ? ` (${pick.behind}${pick.capped ? '+' : ''} builds newer than your v${current}).` : '.'));
    } else log('Up to date.');
    return {
      ok: true, behind: pick.behind, ahead: 0, mode: 'release',
      channel: ucfg.channel, capped: pick.capped,
      changes: pick.newer.map(r => ({ hash: r.tag, subject: r.name })),
    };
  } catch (e) {
    const limited = e instanceof updates.ProbeError && (e.status === 403 || e.status === 429);
    const msg = e instanceof Error ? e.message : String(e);
    log(limited ? `Update check refused — ${msg}` : 'Update check failed (offline, or GitHub is unreachable).');
    return {
      ok: false, error: msg,
      hint: limited ? 'GitHub is rate-limiting this network right now — check again later. Playing the installed version is fine.' : undefined,
    };
  }
}

/**
 * THE CHANNEL WRITE: fold an `updates.channel` choice into the live config
 * and persist it to the machine-local override (the same last-word file the
 * Developer box writes), keeping every other local key. The remembered
 * release is dropped — it belonged to the old channel — and the page
 * re-checks. A smoke run never writes (it must not touch a machine's
 * settings); an unknown id folds to the default channel, never an error.
 * @param {unknown} id
 */
function setChannel(id) {
  const next = updates.channelRow(id).id;
  cfg.updates = { ...(cfg.updates || {}), channel: next };
  latestRelease = { url: null, tag: null, asset: null };
  if (!SMOKE) {
    const saved = writeLocalConfig((cur) => { cur.updates = { ...(cur.updates || {}), channel: next }; });
    if (!saved.ok) {
      log(`Could not save the update channel to ${saved.file}: ${saved.error}`);
      return { ok: false, error: saved.error, ...channelStatus() };
    }
  }
  log(`Update channel: ${updates.channelRow(next).label}.`);
  return { ok: true, ...channelStatus() };
}

async function checkUpdates() {
  if (UPDATE_MODE === 'none') return { ok: true, behind: 0, ahead: 0, changes: [], mode: 'none' };
  if (UPDATE_MODE === 'release') return checkReleaseUpdates();
  return checkGitUpdates();
}

// ------------------------------------------------------ direct release update

/** Download progress pushed to the launcher page ({pct, gotMb, totalMb, tag}).
 *  @param {{ pct: number, gotMb: number, totalMb: number, tag: string }} p */
function sendProgress(p) {
  if (launcherWin && !launcherWin.isDestroyed()) launcherWin.webContents.send('launcher:progress', p);
}

/**
 * Stream a release asset to disk through updates.downloadAsset — THE DIGEST
 * LAW lives there: hashed as it streams, refused (and DELETED) unless the
 * byte count and the sha256 GitHub published both match, under a stall timer
 * and a whole-download ceiling. This wrapper only carries the progress to
 * the page (every percent) and the log (every ten).
 * @param {import('./updates.cjs').Asset} asset @param {string} dest @param {string} tag
 */
async function fetchUpdateArtifact(asset, dest, tag) {
  const ucfg = updateCfg();
  let lastLogPct = -10;
  const got = await updates.downloadAsset({
    url: asset.url, dest, sizeHint: asset.size, digest: asset.digest,
    verifyDigest: ucfg.verifyDigest, stallMs: ucfg.stallMs, ceilingMs: ucfg.ceilingMs,
    onProgress: ({ pct, got: bytes, total }) => {
      sendProgress({ pct, gotMb: bytes / 1048576, totalMb: total / 1048576, tag });
      if (pct - lastLogPct >= 10) {
        lastLogPct = pct;
        log(`Downloading ${tag}… ${pct}% (${Math.round(bytes / 1048576)} / ${Math.round(total / 1048576)} MB)`);
      }
    },
  });
  log(got.verified
    ? `Verified ${asset.name} against its published ${asset.digest?.algo ?? 'digest'}.`
    : asset.digest ? 'Digest verification is switched off (updates.verifyDigest) — byte count checked only.'
      : 'This release publishes no digest — byte count checked only.');
  return got;
}

/**
 * THE DIRECT UPDATE — a packaged install replaces ITSELF from GitHub
 * Releases; no browser, no hand-install:
 *   Windows: stream the new NSIS installer to temp and run it silently
 *            (`/S --updated --force-run` — electron-builder's installer
 *            template relaunches the app itself after a silent update),
 *            then quit so the files are free to replace.
 *   Linux:   stream the new AppImage BESIDE the running one (same
 *            filesystem), mark it executable, rename it over the SAME path
 *            (a Steam/desktop entry pointing at the file — the Deck flow —
 *            stays valid), relaunch, quit. The mount of the old image holds
 *            its inode, so swapping under a running app is safe.
 * Saves live in userData and are untouched by either path. Any failure is
 * thrown to the caller, which falls back to opening the release page — the
 * player is never stranded, merely returned to the old manual flow.
 * @returns {Promise<{ ok: boolean, installing: true }>}
 */
async function directReleaseUpdate() {
  // The Update button only shows after a successful check, but be safe:
  // refresh the remembered asset if a stale page raced one in.
  if (!latestRelease.asset) await checkReleaseUpdates();
  const asset = latestRelease.asset;
  const label = latestRelease.tag ?? 'the update';
  if (!asset) {
    // pickUpdate only ever remembers a release that CARRIES this platform's
    // complete artifact, so reaching here means the channel holds nothing
    // newer that is installable (or this platform has no artifact at all).
    throw new Error(process.platform === 'win32' ? 'this channel holds no newer build with a Windows installer attached'
      : process.platform === 'linux' ? 'this channel holds no newer build with an AppImage attached'
        : `no direct-update artifact exists for platform '${process.platform}'`);
  }

  if (process.platform === 'win32') {
    const dest = path.join(app.getPath('temp'), asset.name);
    log(`Downloading ${label} (${asset.name})…`);
    await fetchUpdateArtifact(asset, dest, label); // throws (and deletes dest) unless verified
    log('Download complete — installing silently; the game will restart itself.');
    boot(`direct update: spawning installer ${dest}`);
    const child = spawn(dest, ['/S', '--updated', '--force-run'], { detached: true, stdio: 'ignore' });
    child.unref();
    setTimeout(() => app.quit(), 400); // let the log line land before we go
    return { ok: true, installing: true };
  }

  if (process.platform === 'linux') {
    const self = process.env.APPIMAGE;
    if (!self || !fs.existsSync(self)) {
      throw new Error('not running from an AppImage (APPIMAGE unset) — nothing to swap in place');
    }
    const dir = path.dirname(self);
    fs.accessSync(dir, fs.constants.W_OK); // throws when the folder is read-only
    const staged = path.join(dir, `.${asset.name}.downloading`);
    log(`Downloading ${label} (${asset.name})…`);
    try {
      await fetchUpdateArtifact(asset, staged, label); // the running AppImage is only ever replaced by a verified one
      fs.chmodSync(staged, 0o755);
      fs.renameSync(staged, self);
    } catch (e) {
      try { fs.rmSync(staged, { force: true }); } catch { /* best-effort tidy */ }
      throw e;
    }
    log('Update installed over this AppImage — restarting.');
    boot(`direct update: swapped ${self}, relaunching`);
    const child = spawn(self, [], { detached: true, stdio: 'ignore' });
    child.unref();
    setTimeout(() => app.quit(), 400);
    return { ok: true, installing: true };
  }

  throw new Error(`no direct-update path for platform '${process.platform}'`);
}

/** The build stamp: HEAD + a digest of what's uncommitted. Any pull or local
 *  edit changes it, so Play knows exactly when dist/ went stale. */
async function buildStamp() {
  const head = (await git(['rev-parse', 'HEAD'])).out.trim();
  if (!head) return null; // not a git repo — fall back to dist-exists checks
  const porcelain = (await git(['status', '--porcelain'])).out;
  // CONTENT, not just status: porcelain alone lists paths + letters, so a
  // second edit to an ALREADY-dirty file left the stamp unchanged and the
  // perf gate silently measured a stale dist. Fold in the tracked diff's
  // content and each untracked file's (size, mtime) so any change re-builds.
  const diff = (await git(['diff', 'HEAD'])).out;
  const h = crypto.createHash('sha1').update(porcelain).update(diff);
  for (const line of porcelain.split('\n')) {
    if (!line.startsWith('??')) continue;
    const p = path.join(BASE, line.slice(3).trim());
    try { const st = fs.statSync(p); h.update(`${p}:${st.size}:${st.mtimeMs};`); } catch { /* raced away */ }
  }
  return `${head}|${h.digest('hex')}`;
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
    // THE DIRECT UPDATE first — download + install + relaunch, no browser.
    if (cfg.updates.directInstall !== false) {
      try { return await directReleaseUpdate(); }
      catch (e) {
        const msg = (e && /** @type {any} */ (e).message) ? /** @type {any} */ (e).message : String(e);
        log(`Direct update failed — ${msg}`);
        log('Falling back to the release page.');
      }
    }
    const gh = String(cfg.repo.github ?? '');
    // The announced release's own page; failing that, the channel's front
    // door (/releases/latest is the newest STABLE — wrong for a nightly).
    const door = updates.channelRow(updateCfg().channel).probe === 'latest' ? 'releases/latest' : 'releases';
    const url = latestRelease.url ?? (gh ? `https://github.com/${gh}/${door}` : null);
    if (!url) return { ok: false, error: 'No release URL known — set repo.github in launcher.config.json.' };
    log('Opening the release page in your browser — install it, then relaunch.');
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

// ------------------------------------------------------------ developer mode

/**
 * THE MODE FOLD — one read for every consumer (the play lane, the game
 * window, the game's address, the smoke modes, the launcher page). The
 * sub-toggles are inert while the master is off, so player mode is player
 * mode whatever the local file says; a packaged install has no source, so
 * live source folds false there; the smoke modes PIN their lane (`game` =
 * built, `source` = live, with every tool on) so a machine's toggles can never
 * change what a self-check measures, and the perf harness always measures
 * the built game.
 * @returns {{ developer: boolean, liveSource: boolean, forges: boolean, passiveEditor: boolean, console: boolean, devtools: boolean }}
 */
function devMode() {
  const d = cfg.dev || {};
  const pinned = SMOKE ? SMOKE === 'source' : PERF ? false : null;
  const developer = pinned ?? !!d.developer;
  const liveSource = developer && !PACKAGED && (pinned ?? d.liveSource !== false);
  return {
    developer,
    liveSource,
    forges: developer && (pinned ?? !!d.forges),
    passiveEditor: developer && (pinned ?? !!d.passiveEditor),
    console: developer && !!d.console,
    devtools: developer && cfg.window.devtools !== false,
  };
}

/**
 * THE GAME'S ADDRESS for a lane: the runtime opt-ins ride `?dev=<list>`
 * (src/config.ts DEV_OPT_INS) — bare `?dev` is the panel (plus the Map Forge,
 * the standing law in main.ts); `forges` and `editor` name the rest. Player
 * mode loads the bare URL, byte-identical to before the toggles existed.
 * @param {string} base
 */
function gameAddress(base) {
  const m = devMode();
  if (!m.developer) return base;
  const words = [];
  if (m.forges) words.push('forges');
  if (m.passiveEditor) words.push('editor');
  return base + (words.length ? `?dev=${words.join(',')}` : '?dev');
}

/**
 * THE LOCAL WRITE — the one seam every launcher-page setting persists
 * through (the Developer box, the update channel): read the machine-local
 * override file — the LAST word in LOCAL_CONFIGS (the repo-root file in a
 * checkout, userData when packaged), never the committed
 * launcher.config.json — let the caller mutate its own block, and write it
 * back with every other local key kept.
 * @param {(cur: any) => void} mutate
 * @returns {{ ok: true, file: string } | { ok: false, file: string, error: string }}
 */
function writeLocalConfig(mutate) {
  const file = LOCAL_CONFIGS[LOCAL_CONFIGS.length - 1];
  const cur = readJson(file) ?? {};
  mutate(cur);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(cur, null, 2) + '\n');
    return { ok: true, file };
  } catch (e) {
    return { ok: false, file, error: String(e) };
  }
}

/**
 * THE TOGGLE WRITE: merge a patch of booleans into cfg.dev and persist the
 * block through THE LOCAL WRITE. Launch Game.bat reads the same file for
 * its terminal decision.
 * @param {any} patch
 */
function setDev(patch) {
  const next = { ...(cfg.dev || {}) };
  for (const k of ['developer', 'liveSource', 'forges', 'passiveEditor', 'console']) {
    if (patch && typeof patch[k] === 'boolean') next[k] = patch[k];
  }
  cfg.dev = next;
  const saved = writeLocalConfig((cur) => { cur.dev = next; });
  if (!saved.ok) {
    log(`Could not save the developer settings to ${saved.file}: ${saved.error}`);
    return { ok: false, error: saved.error, dev: cfg.dev, mode: devMode() };
  }
  const m = devMode();
  log(m.developer
    ? `Developer mode ON${m.liveSource ? ' · live source' : ''}${m.forges ? ' · forges' : ''}${m.passiveEditor ? ' · tree editor' : ''}${m.console ? ' · terminal (next launch)' : ''}`
    : 'Player mode.');
  return { ok: true, dev: cfg.dev, mode: m };
}

// THE LIVE SOURCE LANE: developer mode's game runs on a Vite dev server the
// launcher spawns from the checkout — the same server `npm run dev` (Play
// Game.bat) runs: hot reload, the /__save lane into <repo>/saves, and the
// /__dev/passives write-back the passive-tree editor needs — instead of the
// built dist/. Vite runs on Electron's own Node (ELECTRON_RUN_AS_NODE), so
// no PATH is assumed; its output streams into the launcher log; the address
// is read off Vite's own "Local:" line (a taken port bumps, so a co-session's
// dev server never collides); it stays up across game-window closes and dies
// with the app. Loopback-only, like the built lane.
/** @type {import('node:child_process').ChildProcess | null} */ let viteProc = null;
/** @type {string | null} */ let viteUrl = null;

/** @returns {Promise<string>} the dev server's origin */
function ensureSourceServer() {
  if (viteProc && viteUrl) return Promise.resolve(viteUrl);
  return new Promise((resolve, reject) => {
    if (!REPO) { reject(new Error('Live source needs a checkout — this install ships no source.')); return; }
    const bin = path.join(REPO, 'node_modules', 'vite', 'bin', 'vite.js');
    if (!fs.existsSync(bin)) { reject(new Error('Vite is not installed — run npm install first.')); return; }
    const port = Number(cfg.dev && cfg.dev.vitePort) || 5173;
    log(`Starting the Vite dev server (live source) on port ${port}…`);
    const child = spawn(process.execPath, [bin, '--host', '127.0.0.1', '--port', String(port)], {
      cwd: REPO, windowsHide: true,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NO_COLOR: '1', FORCE_COLOR: '0' },
    });
    viteProc = child;
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true; stopSourceServer();
      reject(new Error('The Vite dev server reported no address within 30 s.'));
    }, 30000);
    /** @param {Buffer} chunk */
    const feed = (chunk) => {
      for (const raw of chunk.toString().split(/\r?\n/)) {
        const line = raw.replace(/\x1b\[[0-9;]*m/g, '').trimEnd();
        if (!line.trim()) continue;
        log(`[vite] ${line}`);
        const m = settled ? null : /Local:\s+(https?:\/\/\S+)/.exec(line);
        if (m) {
          settled = true; clearTimeout(timer);
          viteUrl = m[1].replace(/\/$/, '');
          boot(`vite dev server on ${viteUrl} (live source)`);
          resolve(viteUrl);
        }
      }
    };
    child.stdout?.on('data', feed);
    child.stderr?.on('data', feed);
    child.on('error', (e) => {
      if (settled) return;
      settled = true; clearTimeout(timer); viteProc = null;
      reject(e);
    });
    child.on('exit', (code) => {
      log(`[vite] dev server exited (${code ?? 'signal'})`);
      viteProc = null; viteUrl = null;
      if (settled) return;
      settled = true; clearTimeout(timer);
      reject(new Error(`The Vite dev server exited (${code ?? 'signal'}) before serving.`));
    });
  });
}
function stopSourceServer() {
  const p = viteProc;
  viteProc = null; viteUrl = null;
  if (p && p.exitCode === null) { try { p.kill(); } catch { /* already gone */ } }
}
process.on('exit', stopSourceServer); // app.exit() skips before-quit — never orphan the server

/** @param {{ show?: boolean, perfBeat?: boolean }} [opts] */
function createGameWindow(opts) {
  const fullscreen = resolveFullscreen();
  const tools = devMode().devtools;
  const w = new BrowserWindow({
    width: cfg.window.width,
    height: cfg.window.height,
    show: opts?.show !== false,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0e',
    title: cfg.game.title,
    icon: APP_ICON,
    fullscreen,
    webPreferences: {
      devTools: tools,
      // perfBeat: the perf harness alone loads the deadman's beat bridge
      // (perf-preload.cjs → window.__perfBeat). Play/smoke stay preload-free.
      ...(opts?.perfBeat ? { preload: path.join(__dirname, 'perf-preload.cjs') } : {}),
    },
  });
  if (cfg.window.maximized && !fullscreen && opts?.show !== false) w.maximize();
  w.webContents.on('did-finish-load', () => {
    if (cfg.window.zoom && cfg.window.zoom !== 1) w.webContents.setZoomFactor(cfg.window.zoom);
  });
  // No application menu exists (real-game feel), so provide the essentials:
  w.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { w.setFullScreen(!w.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F12' && tools) { w.webContents.toggleDevTools(); e.preventDefault(); }
    else if (input.key === 'F5' && tools) { w.webContents.reload(); e.preventDefault(); }
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
  const mode = devMode();
  /** @type {string} */
  let url;
  if (mode.liveSource) {
    try {
      const cold = !viteProc;
      url = await ensureSourceServer();
      if (cold) log('Loading from source — the first load transforms the whole module graph (about 30 s); later loads are instant while the launcher stays open.');
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      boot(`play: live source failed — ${why}`);
      return { ok: false, error: `Live source failed: ${why}` };
    }
  } else {
    const built = await ensureBuilt();
    if (!built.ok) { boot(`play: build check failed — ${built.error || 'unknown'}`); return built; }
    url = await ensureServer();
  }
  if (gameWin && !gameWin.isDestroyed()) { gameWin.focus(); return { ok: true }; }
  gameWin = createGameWindow();
  boot(`game window created (${mode.developer ? 'developer' : 'player'} mode${mode.liveSource ? ', live source' : ''})`);
  await gameWin.loadURL(gameAddress(url));
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
    icon: APP_ICON,
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
  ipcMain.handle('launcher:setDev', (_e, patch) => setDev(patch));
  ipcMain.handle('launcher:setChannel', (_e, id) => setChannel(id));
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

  /** Poll a page expression until it turns truthy or the deadline passes — a
   *  fixed sleep is a guess, and a loaded CI runner (the packaged-smoke
   *  publish gate) guesses wrong. Resolves the last value seen.
   *  @param {Electron.WebContents} wc @param {string} expr @param {number} ms */
  const until = async (wc, expr, ms) => {
    const deadline = Date.now() + ms;
    for (;;) {
      const v = await wc.executeJavaScript(expr).catch(() => false);
      if (v || Date.now() >= deadline) return v;
      await wait(150);
    }
  };

  // THE PAGE IS PINNED TOO: devMode() pins the lane for the main process, but
  // the launcher page folds its two faces on the STORED toggles — so a dev
  // machine with Developer mode on failed "opens in player mode" at a HEAD
  // that CI called green. A self-check measures the build, never the
  // machine: the launcher-page lanes read the committed defaults, in memory
  // only (nothing is written — setDev/setChannel are never reached here).
  if (SMOKE === 'launcher' || SMOKE === 'update') cfg.dev = { ...CONFIG_DEFAULTS.dev };

  try {
    if (SMOKE === 'update') {
      await smokeUpdate({ errors, watch, wait, until, watcherSelfTest });
    } else if (SMOKE === 'launcher') {
      launcherWin = createLauncherWindow({ show: false });
      watch(launcherWin.webContents, 'launcher');
      await new Promise(r => launcherWin?.webContents.once('did-finish-load', () => r(null)));
      // The page's status() round-trip populates the build line.
      await until(launcherWin.webContents, `(document.getElementById('build-line')?.textContent ?? '').startsWith('v')`, 15000);
      await wait(400);
      const api = await launcherWin.webContents.executeJavaScript('typeof window.launcher');
      const version = await launcherWin.webContents.executeJavaScript(
        `(document.getElementById('build-line')?.textContent ?? '').startsWith('v')`);
      if (api !== 'object') errors.push(`preload bridge missing (typeof window.launcher = ${api})`);
      if (!version) errors.push('status round-trip never populated the build line');
      // Presence only — NEVER invoke reset from a smoke run (it would erase
      // this machine's real saves behind the headless window).
      const resetApi = await launcherWin.webContents.executeJavaScript('typeof window.launcher.reset');
      const resetBtn = await launcherWin.webContents.executeJavaScript(`!!document.getElementById('reset')`);
      if (resetApi !== 'function') errors.push(`reset bridge missing (typeof window.launcher.reset = ${resetApi})`);
      if (!resetBtn) errors.push('reset button missing from the launcher page');
      // The Developer box: bridge + master toggle present, player mode by
      // default (the box folded, the log tucked away).
      const setDevApi = await launcherWin.webContents.executeJavaScript('typeof window.launcher.setDev');
      const devBox = await launcherWin.webContents.executeJavaScript(
        `!!document.getElementById('dev-developer') && document.body.classList.contains('player')`);
      if (setDevApi !== 'function') errors.push(`setDev bridge missing (typeof window.launcher.setDev = ${setDevApi})`);
      if (!devBox) errors.push('developer box missing, or the page did not open in player mode');
      // THE RELEASE CHANNEL: bridge + picker present and drawn from the
      // registry (the row itself shows only in release mode — a checkout
      // pulls its branch, so there it stays folded away).
      const setChannelApi = await launcherWin.webContents.executeJavaScript('typeof window.launcher.setChannel');
      const channelOpts = await launcherWin.webContents.executeJavaScript(
        `Array.from(document.getElementById('channel')?.options ?? []).map(o => o.value).join(',')`);
      const wantOpts = updates.UPDATE_CHANNELS.map(c => c.id).join(',');
      if (setChannelApi !== 'function') errors.push(`setChannel bridge missing (typeof window.launcher.setChannel = ${setChannelApi})`);
      if (channelOpts !== wantOpts) errors.push(`channel picker drew '${channelOpts}', the registry holds '${wantOpts}'`);
      await watcherSelfTest(launcherWin.webContents);
      const status = await launcherWin.webContents.executeJavaScript(`document.getElementById('update-status')?.textContent ?? ''`);
      console.log(`SMOKE launcher: v${app.getVersion()} packaged=${PACKAGED} updateMode=${UPDATE_MODE} channel=${updateCfg().channel} status="${status}"`);
    } else if (SMOKE === 'source') {
      // THE LIVE-SOURCE LANE: spawn Vite, load the game with every tool on,
      // and require each toggle to have REACHED its tool — the address the
      // launcher composed, the tree editor's QA handle, the forge's
      // start-menu button — beside the built lane's own assertions.
      const url = await ensureSourceServer();
      gameWin = createGameWindow({ show: false });
      watch(gameWin.webContents, 'game');
      const t0 = Date.now();
      await gameWin.loadURL(gameAddress(url));
      boot(`source page loaded in ${((Date.now() - t0) / 1000).toFixed(1)} s (a cold dev server transforms the module graph on first request)`);
      const deadline = Date.now() + 90000;
      let game = 'undefined';
      while (Date.now() < deadline) {
        game = await gameWin.webContents.executeJavaScript('typeof window.__game');
        if (game === 'object') break;
        await wait(500);
      }
      boot(`source __game=${game} after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      await wait(1500); // async boot: account load, world init, start menu
      const menu = await gameWin.webContents.executeJavaScript(
        `!!document.querySelector('#start-menu:not(.hidden)')`);
      const saveProbe = await gameWin.webContents.executeJavaScript(
        `fetch('/__save/0').then(r => r.status).catch(() => 'ERR')`);
      const search = await gameWin.webContents.executeJavaScript('location.search');
      const editor = await gameWin.webContents.executeJavaScript('typeof window.__passiveEditor');
      const forge = await gameWin.webContents.executeJavaScript(`!!document.getElementById('sm-forge')`);
      if (game !== 'object') errors.push(`window.__game is ${game} — game did not boot from source`);
      if (!menu) errors.push('start menu never appeared');
      if (saveProbe !== 200 && saveProbe !== 404) errors.push(`/__save endpoint broken on the dev server (status ${saveProbe})`);
      if (search !== '?dev=forges,editor') errors.push(`game address carried '${search}', expected '?dev=forges,editor'`);
      if (editor !== 'object') errors.push('the passive-tree editor did not mount from ?dev=editor');
      if (!forge) errors.push('the Entity Forge button did not reach the start menu from ?dev=forges');
      await watcherSelfTest(gameWin.webContents);
      console.log(`SMOKE source: url=${url} __game=${game} startMenu=${menu} saveEndpoint=${saveProbe} search=${search} editor=${editor} forge=${forge}`);
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
      // async boot: account load, world init, start menu — polled, then a
      // short settle so a late console error still lands in the watcher.
      await until(gameWin.webContents,
        `typeof window.__game === 'object' && !!document.querySelector('#start-menu:not(.hidden)')`, 60000);
      await wait(1500);
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
  stopSourceServer();
  app.exit(errors.length ? 1 : 0);
}

/**
 * THE UPDATE SMOKE (`--smoke-test=update`, npm run smoke:update) — the proof
 * that THIS build can still find and verify its own successor, run inside
 * the real Electron runtime against the real launcher page. It is the one
 * self-check that gates a PUBLISH (release.yml runs it on the packaged app):
 * a launcher that cannot update can never be sent its own fix, so that
 * breakage must die in CI, never on a player's machine.
 *
 * Hermetic by construction: a loopback fixture stands in for GitHub (no
 * network, no rate limit, no flake), the fixture is built RELATIVE to the
 * running version (so it holds for a checkout and for any tagged package
 * alike), the channel flips in memory only (a machine's settings file is
 * asserted untouched), and nothing is ever installed — the lane stops at a
 * verified file on disk and deletes it.
 *
 * The fixture is the failed-night law in miniature, newest first:
 *   +3  a DRAFT with complete assets      → never seen (an unpublished night)
 *   +2  a prerelease whose artifact for this platform is still 'open'
 *                                         → passed over, by name, in the log
 *   +1  a complete prerelease             → THE TARGET on the nightly channel
 *   +0  the stable this install equals    → what the stable channel serves
 *   a non-version tag carrying an .exe    → not a game build, never offered
 * @param {{ errors: string[], watch: (wc: Electron.WebContents, tag: string) => void,
 *   wait: (ms: number) => Promise<unknown>,
 *   until: (wc: Electron.WebContents, expr: string, ms: number) => Promise<any>,
 *   watcherSelfTest: (wc: Electron.WebContents) => Promise<void> }} t
 */
async function smokeUpdate(t) {
  const { errors } = t;
  const suffix = updates.PLATFORM_ARTIFACT[process.platform];
  if (!suffix) {
    console.log(`SMOKE update: SKIPPED — no direct-update artifact exists for platform '${process.platform}'`);
    return;
  }
  const cur = updates.parseVer(app.getVersion());
  if (!cur) { errors.push(`the running version '${app.getVersion()}' does not parse`); return; }
  /** @param {number} bump */
  const verAt = (bump) => `${cur[0]}.${cur[1]}.${cur[2] + bump}`;

  // A deterministic payload, its true digest, and two liars sharing its name.
  const good = Buffer.alloc(384 * 1024);
  for (let i = 0; i < good.length; i++) good[i] = (i * 31 + (i >> 8) * 7) & 0xff;
  const corrupt = Buffer.from(good); corrupt[corrupt.length >> 1] ^= 0xff;
  const digest = 'sha256:' + crypto.createHash('sha256').update(good).digest('hex');

  const http = require('node:http');
  const gh = 'fixture/hollow-wake';
  let origin = '';
  /** @param {string} ver @param {{ draft?: boolean, prerelease?: boolean, open?: boolean }} o */
  const release = (ver, o) => ({
    tag_name: `v${ver}`, name: `Hollow Wake v${ver}${o.prerelease ? ' (nightly RC)' : ''}`,
    html_url: `${origin}/release/v${ver}`, draft: !!o.draft, prerelease: !!o.prerelease,
    assets: [`HollowWake-Setup-${ver}.exe`, `HollowWake-${ver}-x86_64.AppImage`, 'latest.yml'].map(name => ({
      name, size: good.length, digest, browser_download_url: `${origin}/asset/good`,
      state: (o.open && name.toLowerCase().endsWith(suffix)) ? 'open' : 'uploaded',
    })),
  });
  const list = () => [
    release(verAt(3), { draft: true, prerelease: true }),
    release(verAt(2), { prerelease: true, open: true }),
    release(verAt(1), { prerelease: true }),
    release(verAt(0), {}),
    { ...release(verAt(9), {}), tag_name: 'tools-latest' },
  ];
  const server = http.createServer((req, res) => {
    const url = String(req.url || '');
    /** @param {unknown} body */
    const json = (body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (url.startsWith(`/repos/${gh}/releases/latest`)) return json(release(verAt(0), {}));
    if (url.startsWith(`/repos/${gh}/releases`)) return json(list());
    if (url === '/asset/good') { res.writeHead(200, { 'content-length': good.length }); return res.end(good); }
    if (url === '/asset/corrupt') { res.writeHead(200, { 'content-length': corrupt.length }); return res.end(corrupt); }
    if (url === '/asset/short') { // promises the whole file, hangs up half way
      res.writeHead(200, { 'content-length': good.length });
      res.write(good.subarray(0, good.length >> 1));
      return void setTimeout(() => res.destroy(), 50);
    }
    res.writeHead(404); res.end();
  });
  await new Promise(r => server.listen(0, '127.0.0.1', () => r(null)));
  const addr = /** @type {import('node:net').AddressInfo} */ (server.address());
  origin = `http://127.0.0.1:${addr.port}`;

  // Pin the lane in memory: the fixture as the API, the default channel, the
  // launch check on — whatever this machine's local config says.
  const localFile = LOCAL_CONFIGS[LOCAL_CONFIGS.length - 1];
  const localBefore = fs.existsSync(localFile) ? fs.readFileSync(localFile, 'utf-8') : null;
  cfg.repo = { ...cfg.repo, github: gh, api: origin };
  cfg.updates = { ...cfg.updates, channel: updates.UPDATE_CHANNELS[0].id, checkOnLaunch: true, directInstall: true };
  const tmp = path.join(app.getPath('temp'), `hollow-wake-update-smoke-${process.pid}.bin`);

  try {
    launcherWin = createLauncherWindow({ show: false });
    const wc = launcherWin.webContents;
    t.watch(wc, 'launcher');
    await new Promise(r => wc.once('did-finish-load', () => r(null)));

    // ---- the nightly channel finds +1, passes +2 over by name, never sees +3
    const want = `v${verAt(1)}`;
    await t.until(wc, `document.getElementById('update-status')?.className === 'avail'`, 20000);
    const text = await wc.executeJavaScript(`document.getElementById('update-status')?.textContent ?? ''`);
    const rows = await wc.executeJavaScript(`document.querySelectorAll('#changes li').length`);
    const btn = await wc.executeJavaScript(`!document.getElementById('update-btn')?.classList.contains('hidden')`);
    const picker = await wc.executeJavaScript(
      `!document.getElementById('channel-row')?.classList.contains('hidden') && document.getElementById('channel')?.value`);
    const pageLog = await wc.executeJavaScript(`document.getElementById('log')?.textContent ?? ''`);
    if (!String(text).startsWith(`${want} is available`)) errors.push(`nightly channel announced "${text}", expected "${want} is available…"`);
    if (rows !== 1) errors.push(`nightly channel listed ${rows} newer builds, expected exactly 1 (${want})`);
    if (!btn) errors.push('the Update button never appeared');
    if (picker !== 'nightly') errors.push(`the channel picker reads '${picker}', expected 'nightly' and visible`);
    const nightlyTag = latestRelease.tag;
    if (nightlyTag !== want) errors.push(`the remembered release is ${nightlyTag}, expected ${want}`);
    if (!latestRelease.asset?.digest) errors.push('the remembered artifact carries no digest');
    if (!pageLog.includes(`Passed over v${verAt(2)}`)) errors.push(`the log never named the incomplete v${verAt(2)} as passed over`);
    if (pageLog.includes(`v${verAt(3)}`)) errors.push(`the DRAFT v${verAt(3)} leaked into the log`);
    if (process.env.HOLLOW_WAKE_SMOKE_SHOT) {
      // Proof only (never set in CI): a hidden window's compositor may hold
      // a stale frame, so surface it for the one capture. The DOM reads
      // above are the verdict; this is just a picture of them.
      try {
        launcherWin.showInactive(); await t.wait(500);
        fs.writeFileSync(process.env.HOLLOW_WAKE_SMOKE_SHOT, (await wc.capturePage()).toPNG());
        launcherWin.hide();
      } catch { /* proof only */ }
    }

    // ---- the stable channel (flipped THROUGH THE PAGE) holds: nothing newer
    await wc.executeJavaScript(
      `(() => { const s = document.getElementById('channel'); s.value = 'stable'; s.dispatchEvent(new Event('change')); })()`);
    await t.until(wc, `document.getElementById('update-status')?.className === 'good'`, 20000);
    const stableText = await wc.executeJavaScript(`document.getElementById('update-status')?.textContent ?? ''`);
    if (!String(stableText).startsWith('Up to date')) errors.push(`stable channel announced "${stableText}", expected "Up to date."`);
    if (updateCfg().channel !== 'stable') errors.push(`the channel fold reads '${updateCfg().channel}' after the page chose stable`);
    if (latestRelease.asset) errors.push('the old channel\'s remembered artifact survived the channel change');
    const localAfter = fs.existsSync(localFile) ? fs.readFileSync(localFile, 'utf-8') : null;
    if (localAfter !== localBefore) errors.push(`a smoke run rewrote this machine's settings (${localFile})`);

    // ---- THE DIGEST LAW: verified or deleted — never installed here
    /** @param {string} route */
    const asset = (route) => ({ name: `HollowWake-smoke${suffix}`, url: `${origin}/asset/${route}`, size: good.length, digest: updates.parseDigest(digest) });
    const okRun = await fetchUpdateArtifact(asset('good'), tmp, want).catch((e) => e);
    const verified = !(okRun instanceof Error) && okRun.verified && fs.existsSync(tmp) && fs.statSync(tmp).size === good.length;
    if (!verified) errors.push(`a good artifact was not verified onto disk (${okRun instanceof Error ? okRun.message : 'unverified'})`);
    fs.rmSync(tmp, { force: true });
    /** @type {Record<string, boolean>} */ const refused = {};
    for (const route of ['corrupt', 'short']) {
      const r = await fetchUpdateArtifact(asset(route), tmp, want).catch((e) => e);
      refused[route] = r instanceof Error && !fs.existsSync(tmp);
      if (!(r instanceof Error)) errors.push(`a ${route} artifact was ACCEPTED`);
      else if (fs.existsSync(tmp)) errors.push(`a refused ${route} artifact was left on disk`);
      fs.rmSync(tmp, { force: true });
    }
    await t.watcherSelfTest(wc);
    console.log(`SMOKE update: v${app.getVersion()} packaged=${PACKAGED} nightly=${nightlyTag}`
      + ` announced="${text}" stable="${stableText}" verified=${verified}`
      + ` corruptRefused=${refused.corrupt} shortRefused=${refused.short} settingsUntouched=${localAfter === localBefore}`);
  } finally {
    fs.rmSync(tmp, { force: true });
    server.close();
  }
}

// -------------------------------------------------------------- perf harness

/** `npm run perf` — boot the real desktop game VISIBLE (true compositor
 *  pacing; a hidden window throttles rAF and lies), run the in-page perf
 *  sweep (src/dev/perf.ts) over the tileset matrix, gate the numbers against
 *  balance/perf.config.json, write a report, exit 0 / 2 (budget breached) /
 *  1 (harness error) / 3 (THE DIRTY-TREE GUARD refused to rebuild — see
 *  below) — the genqa contract for frame cost. Budgets are DATA:
 *  each zone is judged RELATIVE to the same run's town control (so the
 *  verdict travels across machines) plus generous absolute backstops.
 *  A 'hold'-class skipped row GATES like a breach (the skip gate below —
 *  overrides[<id>].allowSkip is the committed waiver); the town control is
 *  re-sampled at sweep END (the aged control) so run-age growth prints
 *  beside the zones instead of wearing their names.
 *  THE DEADMAN (2026-08-02, launcher/perfdeadman.cjs): the sampler beats
 *  `perf:beat` every second through the perf-only preload, carrying each
 *  completed row; beat silence past deadman.silenceSec (45) runs the
 *  two-stage verdict (liveness probe first — a healthy renderer with rotted
 *  beat wiring DISARMS the deadman, never dies; then in-process CDP
 *  pause-stacks: JS-hot histogram or 'native, pause never landed'), kills
 *  the wedged run, writes the PARTIAL report from the banked rows with a
 *  'wedge'-class skip row, and exits 2 (forensics runs exit 1 — a wedge is
 *  an incomplete run there, never a gate verdict). Two 2026-08-01 verdict
 *  sweeps died as 19-minute silent freezes; a wedge is now a named row. */
async function perfMode() {
  /** @param {number} ms */
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // ---- THE RUN LOCK (2026-08-02): two perf runs sharing one compositor
  // poison each other's frames — a sibling's townhouse run fully overlapped
  // a gloamwood solo (two visible game windows compositing at once,
  // 2026-08-02 05:34), and the day's verdict sweep minted caul entry=2117ms
  // from a foreign ~2s freeze. The dirty-tree guard gates BYTES; this gates
  // RUNS: one MACHINE-GLOBAL lockfile (os.tmpdir — worktrees and second
  // checkouts share the compositor, so they must share the lock), taken
  // exclusively ('wx') before anything measures. Held by a LIVE pid →
  // refuse, exit 3 (the refusal lane, beside the dirty tree). A dead
  // holder's lock is stale and reclaimed loudly; release rides process
  // 'exit' so every app.exit path in this function lets go — a SIGKILL'd
  // run leaves the file and the next run's liveness probe reclaims it.
  const lockPath = path.join(os.tmpdir(), 'hollow-wake-perf.lock');
  /** Refusal needs BOTH a live pid AND a heartbeat this fresh: electron
   *  children drain for a minute+ after app.exit (measured 2026-08-02 —
   *  a finished run's pid stayed 'alive' and refused four honest runs),
   *  and pids recycle. A live RUN beats ~1/s (perf:beat touches mtime);
   *  the window is wide enough to cover the beat-less boot+rebuild. */
  const LOCK_FRESH_MS = 180_000;
  let lockHeld = false;
  const releaseRunLock = () => {
    if (!lockHeld) return;
    lockHeld = false;
    try {
      const cur = readJson(lockPath);
      if (cur && cur.pid === process.pid) fs.unlinkSync(lockPath);
    } catch { /* already gone */ }
  };
  const heartbeatRunLock = () => {
    if (!lockHeld) return;
    try { const now = new Date(); fs.utimesSync(lockPath, now, now); } catch { /* transient */ }
  };
  const lockRefused = (() => {
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          fs.writeFileSync(lockPath,
            JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { flag: 'wx' });
          lockHeld = true;
          // Belts only: app.exit() SKIPS node 'exit' handlers (measured
          // 2026-08-02 — the lock survived a clean run); the explicit
          // releaseRunLock() calls beside every app.exit below are the road.
          process.on('exit', releaseRunLock);
          app.on('quit', releaseRunLock);
          return false; // the lock is ours
        } catch { /* held — probe the holder below */ }
        const prev = readJson(lockPath);
        const pid = prev && typeof prev.pid === 'number' ? prev.pid : null;
        let alive = false;
        if (pid !== null && pid !== process.pid) {
          try { process.kill(pid, 0); alive = true; }
          catch (e) { alive = /** @type {any} */ (e)?.code === 'EPERM'; }
        }
        let beatAgoMs = Infinity;
        try { beatAgoMs = Date.now() - fs.statSync(lockPath).mtimeMs; } catch { /* vanished — the retry takes it */ }
        if (alive && beatAgoMs < LOCK_FRESH_MS) {
          console.log(`PERF REFUSED: another perf run holds this machine (pid ${pid}, started ${prev.startedAt ?? '?'}, ` +
            `last beat ${Math.round(beatAgoMs / 1000)}s ago).`);
          console.log('Two runs share one compositor and poison each other\'s frames — sequence them.');
          console.log(`If that run is truly gone, delete ${lockPath}. Exit 3.`);
          return true;
        }
        const why = pid === null ? 'unreadable'
          : !alive ? `dead pid ${pid}`
            : `pid ${pid} alive but silent ${Math.round(beatAgoMs / 1000)}s — a draining zombie or a reused pid`;
        console.log(`PERF: stale run lock (${why}) — reclaiming.`);
        try { fs.unlinkSync(lockPath); } catch { /* raced away — retry takes it */ }
      }
      console.log('PERF: run-lock contention unresolved after reclaim — proceeding UNLOCKED (loud).');
      return false;
    } catch (e) {
      console.log('PERF: run-lock bookkeeping failed (' + String(e) + ') — proceeding UNLOCKED.');
      return false;
    }
  })();
  if (lockRefused) {
    gameServer?.close();
    app.exit(3);
    return;
  }
  const cfgPath = path.join(BASE, 'balance', 'perf.config.json');
  /** @type {any} */
  let budgets;
  try { budgets = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
  catch (e) { console.log('PERF FAILED: cannot read ' + cfgPath + ': ' + String(e)); releaseRunLock(); app.exit(1); return; }
  /** @type {string[]} */
  const errors = [];
  try {
    // A sweep runs 10+ minutes unattended — half a typical display idle
    // timeout. When the display sleeps, DWM stops compositing, every window
    // reads occluded, rAF drops to 1Hz, and the whole run flatlines at
    // ~1000ms gaps (measured 2026-07-15, town control included — the
    // controlSickMs guard below catches it, this PREVENTS it). Released by
    // process exit.
    powerSaveBlocker.start('prevent-display-sleep');
    // ---- THE DIRTY-TREE GUARD (2026-08-02): `npm run perf` measures dist/
    // and ensureBuilt silently REBUILDS it whenever the stamp drifted. On a
    // tree several sessions edit concurrently, that rebuild bakes whatever
    // half-edited state the tree holds at boot — the 2026-08-01 triad's 4th
    // run measured exactly such a phantom build and died inconclusive by
    // construction. A perf run may REBUILD only from a CLEAN tree: stale
    // stamp + dirty tree = print the offending status and exit 3 (distinct
    // from 0 ok / 1 invalid / 2 breach) unless --allow-dirty acknowledges a
    // deliberate WIP measurement. A FRESH stamp never rebuilds and always
    // proceeds — the stamp digests the dirty content itself, so a matching
    // dist IS the current bytes, measured knowingly (the clean-bundle
    // protocol builds exactly this way) — but a dirty tree still prints its
    // warning so the report reads honestly. Every report stamps the digest
    // it measured (report.json dist.*).
    const allowDirty = flagValue('--allow-dirty') !== null;
    const stampNow = await buildStamp(); // null = not a git repo (dist-exists fallback)
    const stampHave = fs.existsSync(STAMP) ? fs.readFileSync(STAMP, 'utf-8') : null;
    const distFresh = fs.existsSync(path.join(DIST, 'index.html')) && stampNow !== null && stampHave === stampNow;
    const porcelain = stampNow !== null ? (await git(['status', '--porcelain'])).out.replace(/\s+$/, '') : '';
    const treeDirty = porcelain.trim().length > 0;
    if (!distFresh && treeDirty && !allowDirty) {
      console.log('PERF REFUSED: dist/ is stale and the tree is DIRTY — a rebuild would measure');
      console.log('half-edited state (the concurrent-session trap). Offending status:');
      for (const line of porcelain.split('\n')) console.log('  ' + line);
      console.log('Commit/stash the tree (or land the batch), or pass --allow-dirty to');
      console.log('measure the WIP bytes deliberately. Exit 3.');
      gameServer?.close();
      releaseRunLock();
      app.exit(3);
      return;
    }
    if (treeDirty) {
      console.log(`PERF: tree is DIRTY (${porcelain.split('\n').length} paths)` +
        (distFresh ? ' — dist stamp matches these exact bytes; measuring them knowingly.'
          : ' — rebuilding WIP bytes under --allow-dirty; the verdict travels no further than this tree.'));
    }
    const built = await ensureBuilt(); // a stale dist would measure old code
    if (!built.ok) throw new Error('build failed');
    heartbeatRunLock(); // the build was the longest beat-less stretch
    // The digest actually measured — .build-head as ensureBuilt left it.
    const distStamp = fs.existsSync(STAMP) ? fs.readFileSync(STAMP, 'utf-8') : null;
    console.log(`PERF: dist stamp ${distStamp ? distStamp.slice(0, 20) + '…' : '(none — not a repo)'}` +
      ` rebuilt=${!distFresh} treeDirty=${treeDirty}${allowDirty ? ' allowDirty' : ''}`);
    const url = await ensureServer();
    gameWin = createGameWindow({ show: true, perfBeat: true });
    gameWin.webContents.setBackgroundThrottling(false);
    // WINDOW POLICY: the gate needs a compositing surface, not the user's
    // attention. CalculateNativeWinOcclusion is disabled for perf runs (see
    // boot), so a COVERED window still composites at full rate — the user
    // may stack their own windows over it freely. Only MINIMIZED is fatal
    // (no surface exists; rAF flatlines at 1Hz/1000ms). Someone minimizing
    // the window mid-sweep is a person asking for their screen back: restore
    // ONCE here at boot (e.g. inherited shell state), never mid-run — the
    // controlSickMs verdict names what happened instead. Never alwaysOnTop:
    // a measurement must not fight the machine's owner.
    if (gameWin.isMinimized()) gameWin.restore();
    gameWin.webContents.on('render-process-gone', (_e, d) => errors.push('renderer gone: ' + d.reason));
    await gameWin.loadURL(url);
    await wait(2500); // async boot: account load, world init, start menu
    const ready = await gameWin.webContents.executeJavaScript(`typeof window.__game`);
    if (ready !== 'object') throw new Error('window.__game is ' + ready + ' — game did not boot');
    // Occlusion forensics: when a run comes back INVALID (controlSickMs),
    // this line says what the page believed — 'hidden' here = the rAF
    // throttle, not the zones. (visibilityState is the page-side symptom of
    // the native occlusion tracker verdict.)
    const visState = await gameWin.webContents.executeJavaScript(`document.visibilityState`);
    console.log(`PERF: window visible=${gameWin.isVisible()} minimized=${gameWin.isMinimized()} page=${visState}`);
    /** @type {any} */
    const opts = {
      seconds: Number(flagValue('--seconds') || budgets.sampleSeconds || 6),
      settleSeconds: Number(budgets.settleSeconds || 1.5),
      filter: flagValue('--filter') || '',
    };
    // GATE DETERMINISM (committed in perf.config.json, all optional — these
    // are the GATE's own settings, so the run still exits 2 on breach):
    //   weather      — the gate's pinned sky (silence the random front roll).
    //   mintSeed     — each tileset mints from Rng(mintSeed + its FULL-matrix
    //                  index): variant, name, size and layout stop re-rolling
    //                  per run/world seed, and --filter runs reproduce the
    //                  full sweep's mints (the index never shifts).
    //   mintPins     — force a tileset's face and/or layout generator
    //                  ({ "jungle": { "variant": "strangler court",
    //                  "layout": "forest" } }): the gate measures the
    //                  committed WORST CASE, not dice — heavy scenes are
    //                  often a LAYOUT roll, not a variant. A pin may also
    //                  carry "seed": <n> — pin one tileset's WHOLE mint
    //                  (outranks mintSeed + index) for tilesets whose heavy
    //                  scene is a COUNT roll, not a face.
    if (budgets.weather !== undefined) opts.weather = budgets.weather;
    if (budgets.mintSeed !== undefined) opts.mintSeed = budgets.mintSeed;
    if (budgets.mintPins) opts.mintPins = budgets.mintPins;
    // FORENSICS FLAGS: `--weather=snow|clear|…` pins a DIFFERENT sky,
    // `--ablate=snowwash,lights,…` skips render passes, `--variant=<name>` /
    // `--layout=<gen>` / `--seed=<n>` force every swept tileset's face,
    // layout, or whole mint roll — pair with --filter for one zone
    // (src/dev/perf.ts; --seed is the worst-roll HUNT lever for count-roll
    // tilesets); `--tilesets=<ids>` replaces the WHOLE matrix (name realm /
    // boundless rows a normal sweep excludes by registry law — mint seeds
    // then derive from the override list's own indices, so committed rows
    // may re-roll). Any of them makes this a diagnostic run: the gate still
    // PRINTS its verdict, but never exits 2 — an ablated zone being fast
    // (or a pinned storm being slow) is the experiment, not a regression.
    const weatherFlag = flagValue('--weather');
    if (weatherFlag !== null) opts.weather = weatherFlag;
    const ablateFlag = flagValue('--ablate');
    if (ablateFlag) opts.ablate = ablateFlag.split(',').map(s => s.trim()).filter(Boolean);
    const variantFlag = flagValue('--variant');
    const layoutFlag = flagValue('--layout');
    const seedFlag = flagValue('--seed');
    if (variantFlag || layoutFlag || seedFlag) {
      const star = { ...((opts.mintPins ?? {})['*'] ?? {}) };
      if (variantFlag) star.variant = variantFlag;
      if (layoutFlag) star.layout = layoutFlag;
      if (seedFlag) star.seed = Number(seedFlag);
      opts.mintPins = { ...(opts.mintPins ?? {}), '*': star };
    }
    // `--lite=N` — THE LITE-TIER HORDE STRESS (engine/lite.ts): pour N
    // packed-pool bodies around the hero in every sampled zone. Forensics
    // only: the claim is the DELTA against a bare run of the same filter.
    const liteFlag = flagValue('--lite');
    if (liteFlag) opts.lite = Number(liteFlag);
    const tilesetsFlag = flagValue('--tilesets');
    if (tilesetsFlag) opts.tilesets = tilesetsFlag.split(',').map(s => s.trim()).filter(Boolean);
    const forensics = weatherFlag !== null || !!ablateFlag || !!variantFlag || !!layoutFlag || !!seedFlag || !!liteFlag || !!tilesetsFlag;
    console.log(`PERF: sweeping tilesets (${opts.seconds}s steady + ${opts.settleSeconds}s entry per zone` +
      (opts.filter ? `, filter '${opts.filter}'` : '') +
      (opts.weather !== undefined ? `, weather pinned '${opts.weather || 'clear'}'` : '') +
      (opts.ablate ? `, ablate [${opts.ablate.join(',')}]` : '') + `)…`);
    // ---- THE DEADMAN (launcher/perfdeadman.cjs — module doc has the whole
    // story): the sampler beats perf:beat ~1/s through the perf-only
    // preload, each completed row riding its beat — so the launcher can
    // finally print PROGRESS during the 10-19min sweep (the old table
    // printed only at END; a wedged run left a 0-byte output file), and a
    // killed run still yields the rows it banked. Dials default here; an
    // optional `deadman` object in perf.config.json overrides any of them
    // (documented in _docHarnessShield — no committed values needed).
    const wc = gameWin.webContents;
    const dm = budgets.deadman ?? {};
    /** @type {{ rows: any[], skipped: any[], control: any, controlEnd: any }} */
    const banked = { rows: [], skipped: [], control: null, controlEnd: null };
    const deadman = createDeadman({
      silenceMs: (dm.silenceSec ?? 45) * 1000,
      checkMs: (dm.checkSec ?? 5) * 1000,
      probeTimeoutMs: (dm.probeTimeoutSec ?? 2) * 1000,
      probeCount: dm.probeCount ?? 3,
      pauseDeadlineMs: (dm.pauseDeadlineSec ?? 10) * 1000,
      stackCount: dm.stackCount ?? 10,
      stackGapMs: dm.stackGapMs ?? 300,
    }, {
      now: () => Date.now(),
      log: (line) => console.log('PERF DEADMAN: ' + line),
      evalAlive: (timeoutMs) => new Promise(res => {
        let settled = false;
        const t = setTimeout(() => { if (!settled) { settled = true; res(false); } }, timeoutMs);
        wc.executeJavaScript('1+1', true).then(
          () => { if (!settled) { settled = true; clearTimeout(t); res(true); } },
          () => { if (!settled) { settled = true; clearTimeout(t); res(false); } });
      }),
      cdpAttach: () => { wc.debugger.attach('1.3'); },
      cdpSend: (method) => { wc.debugger.sendCommand(method).catch(() => { /* wedged threads never ack */ }); },
      cdpOn: (cb) => { wc.debugger.on('message', (_e, method, params) => cb(method, params)); },
      cdpDetach: () => { wc.debugger.detach(); },
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (h) => clearTimeout(h),
      setInterval: (fn, ms) => setInterval(fn, ms),
      clearInterval: (h) => clearInterval(h),
    });
    ipcMain.on('perf:beat', (e, payload) => {
      if (!gameWin || e.sender !== gameWin.webContents) return;
      heartbeatRunLock(); // a beating run is a lock nobody may reclaim
      deadman.beat(payload);
      if (!payload) return;
      if (payload.at === 'row' && payload.row) {
        banked.rows.push(payload.row);
        console.log(`PERF: [${banked.rows.length}] ${payload.tileset} — '${payload.row.zone}' ` +
          `gap50 ${payload.row.gapP50} gapMax ${payload.row.gapMax} h40 ${payload.row.hitch40}`);
      } else if (payload.at === 'control' && payload.row) {
        banked.control = payload.row;
        console.log(`PERF: control '${payload.row.zone}' gap50 ${payload.row.gapP50}`);
      } else if (payload.at === 'aged') {
        banked.controlEnd = payload.row ?? null;
      } else if (payload.at === 'skip' && payload.skip) {
        banked.skipped.push(payload.skip);
        console.log(`PERF: skipped ${payload.skip.id} [${payload.skip.class}]`);
      }
    });
    const sweepP = wc.executeJavaScript(
      `window.__game.perfSweep(${JSON.stringify(opts)})`, true);
    /** @type {any} */
    const outcome = await Promise.race([
      sweepP.then((r) => ({ kind: 'done', report: r }), (err) => ({ kind: 'err', err })),
      deadman.promise.then((w) => ({ kind: 'wedge', wedge: w })),
    ]);
    deadman.disarm();
    if (outcome.kind === 'err') throw outcome.err;
    /** @type {any} */
    let wedge = null;
    /** @type {any} */
    let report;
    if (outcome.kind === 'wedge') {
      wedge = outcome.wedge;
      // The wedge becomes a NAMED, attributed row: the seat holding the
      // window when beats stopped wears it (the wedge lives in world-state
      // interaction, not any zone's own content — the row names the seat,
      // the note carries the stacks' verdict).
      const holder = wedge.lastBeat && wedge.lastBeat.tileset ? String(wedge.lastBeat.tileset) : '(unknown)';
      const at = wedge.lastBeat && wedge.lastBeat.at ? String(wedge.lastBeat.at) : '(none)';
      console.log(`PERF DEADMAN: verdict ${wedge.face} — ${wedge.note}`);
      console.log(`PERF DEADMAN: killing the wedged run; partial report from ${banked.rows.length} banked rows.`);
      report = {
        control: banked.control, controlEnd: banked.controlEnd,
        zones: banked.rows,
        skipped: [...banked.skipped, {
          id: holder, class: 'wedge',
          note: `${wedge.note} — last beat '${at}' ${Math.round(wedge.silentMs / 1000)}s before the probe`,
        }],
        canvas: { w: 0, h: 0 }, dpr: 0,
        sampleSeconds: opts.seconds, matrix: [],
        weather: opts.weather ?? '', ablate: opts.ablate ?? [],
      };
      try { gameWin.destroy(); } catch { /* already dying */ }
    } else {
      report = outcome.report;
    }

    // ---- the gate: relative-to-town caps + absolute backstops, all data ----
    const rel = budgets.relative ?? {};
    const abs = budgets.absolute ?? {};
    const ctl = report.control;
    const secs = report.sampleSeconds || 6;
    /** @type {string[]} */
    const breaches = [];
    /** @type {string[]} */
    const lines = [];
    // ATTRIBUTION COLUMNS (src/dev/perf.ts, 2026-08-01): taskMx = worst
    // whole-frame-TASK ms (sim + render + the post-perfPush tail the
    // brackets can't see); lt/ltW = Long Tasks >50ms in the window (count /
    // worst ms; -1 = API unsupported) whoever ran them — frame, idle
    // autosave, timer, GC; off40 = >40ms gaps whose owning frame's OWN
    // work stayed ≤40ms (stalls no frame's own work explains; since
    // 2026-08-02 the owning mark anchors at tick-callback entry, so a
    // foreign vsync-overhang can no longer inflate it into abstention). Read as a
    // triangle: taskMx ≈ gapMax convicts the frame's JS; ltW big with
    // taskMx small convicts the space BETWEEN frames; off40 counts how
    // often that happened. slab (2026-08-02, THE PHASE LEDGER in
    // src/main.ts) NAMES the frame's worst single slab (name:ms over
    // pre/head/sim/ren/tail): 'pre' = vsync→callback overhang (a foreign
    // task wearing the frame's name — the taskMx coarse-anchor
    // disambiguator), 'head' = pad/pointer/couch before the sim bracket,
    // 'tail' = the post-perfPush net+hostTail carry (≤1 frame late by
    // position). A gapMax ≈ taskMx row with sim99/ren99 tiny now
    // self-attributes instead of needing a hand bisect.
    /** @param {any} z @param {string} name */
    const row = (z, name) =>
      `${name.padEnd(16)} ${String(z.gapP50).padStart(6)} ${String(z.gapP95).padStart(6)} ${String(z.gapP99).padStart(6)}` +
      ` ${String(z.gapMax).padStart(7)} ${String(z.hitch40).padStart(3)} ${String(z.entryWorstGap).padStart(7)}` +
      ` ${String(z.simP99).padStart(6)} ${String(z.renP99).padStart(6)}` +
      ` ${String(z.taskMax ?? 0).padStart(7)} ${String(z.ltCount ?? 0).padStart(3)} ${String(z.ltWorst ?? 0).padStart(6)} ${String(z.offTask40 ?? 0).padStart(5)}` +
      ` ${(z.slabName ? `${z.slabName}:${z.slabMs}` : '-').padStart(10)}` +
      ` ${String(z.snowBakes ?? 0).padStart(5)} ${String(z.groundBakes ?? 0).padStart(5)} ${String(z.snowCover ?? 0).padStart(5)}` +
      `  ${z.zone}`; // zone names already carry their variant
    lines.push('tileset           gap50  gap95  gap99  gapMax h40   entry  sim99  ren99  taskMx  lt    ltW off40       slab   snB   grB  cover  zone');
    if (ctl) lines.push(row(ctl, '(town ctl)'));
    else lines.push('(town ctl): never completed — the run wedged before the control row; caps not judged');
    for (const z of report.zones) {
      lines.push(row(z, z.tileset));
      // THE ENTRY ANNOTATION (src/dev/perf.ts entryStallNote): a >500ms
      // stall inside the entry window names itself on the row — FOREIGN
      // (own frame task tiny: a machine-wide freeze wearing the zone's
      // name, the caul entry=2117 artifact) vs the zone's own heavy load.
      // THE RING BACKSTOP: rings are sized to the window up front
      // (perfRingSize); a nonzero ringWrap means oldest frames dropped and
      // h40/gapMax undercount — loud, because it can only flatter.
      if (z.entryNote) lines.push(`  ^ ${z.tileset}: ${z.entryNote}`);
      if (z.ringWrap > 0) lines.push(`  ^ ${z.tileset}: RING WRAPPED — ${z.ringWrap} oldest frames dropped; h40/gapMax undercount this row`);
      // Per-tileset overrides (budgets.overrides[id]) merge over the shared
      // caps — the explicit, committed registry of known-heavy zones (each
      // entry should carry a _todo note; the gate stays data end to end).
      const ov = (budgets.overrides ?? {})[z.tileset] ?? {};
      const relZ = { ...rel, ...(ov.relative ?? {}) };
      const absZ = { ...abs, ...(ov.absolute ?? {}) };
      // CONTROL FLOOR (relative.controlFloorMs): a fast town roll (4.2ms
      // vsync-off pacing vs the usual 8.3) used to HALVE every cap — the
      // control normalizes the MACHINE; it must not gamble the headroom.
      // Control percentiles below the floor read as the floor. (Relative
      // caps need the control; a wedge-partial report without one still
      // judges every banked row's ABSOLUTE backstops below.)
      if (ctl) {
        const floorMs = relZ.controlFloorMs ?? 0;
        const ctl50 = Math.max(ctl.gapP50, floorMs), ctl99 = Math.max(ctl.gapP99, floorMs);
        const town50 = ctl50 === ctl.gapP50 ? `${ctl.gapP50}` : `${ctl50} floored from ${ctl.gapP50}`;
        const town99 = ctl99 === ctl.gapP99 ? `${ctl.gapP99}` : `${ctl99} floored from ${ctl.gapP99}`;
        const capP50 = ctl50 * (relZ.gapP50Mul ?? 99) + (relZ.slackMs ?? 0);
        const capP99 = ctl99 * (relZ.gapP99Mul ?? 99) + (relZ.slackMs ?? 0);
        if (z.gapP50 > capP50) breaches.push(`${z.tileset}: gapP50 ${z.gapP50}ms > cap ${capP50.toFixed(1)} (town ${town50} x${relZ.gapP50Mul} +${relZ.slackMs})`);
        if (z.gapP99 > capP99) breaches.push(`${z.tileset}: gapP99 ${z.gapP99}ms > cap ${capP99.toFixed(1)} (town ${town99} x${relZ.gapP99Mul} +${relZ.slackMs})`);
      }
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
        // The annotation rides the breach line too: a FOREIGN-stamped entry
        // breach self-documents (rerun solo before believing the zone).
        breaches.push(`${z.tileset}: entry burst ${z.entryWorstGap}ms > ${absZ.entryWorstGapMs}${z.entryNote ? ' — ' + z.entryNote : ''}`);
      }
    }
    // THE AGED CONTROL (evidence, never a gate): the same town re-sampled
    // after the last row. Growth across the pair is the RUN's age — GC over
    // the accumulated live set, deferred idle work — not any zone's bill
    // (the 2026-08-01 triad acquittal reconstructed this bracket by hand
    // from seat medians; every report now carries it). A sick aged town
    // does NOT invalidate the run: the START control cut the caps, and
    // controlSickMs already judged it — this pair just names what grew.
    if (report.controlEnd && ctl) {
      const b = report.controlEnd;
      lines.push(row(b, '(town aged)'));
      lines.push(`aged control (start vs end of sweep): gapP50 ${ctl.gapP50} vs ${b.gapP50}, ` +
        `gapP99 ${ctl.gapP99} vs ${b.gapP99}, gapMax ${ctl.gapMax} vs ${b.gapMax}, ` +
        `h40 ${ctl.hitch40} vs ${b.hitch40}, taskMx ${ctl.taskMax ?? 0} vs ${b.taskMax ?? 0}, ` +
        `lt ${ctl.ltCount ?? 0}/${ctl.ltWorst ?? 0} vs ${b.ltCount ?? 0}/${b.ltWorst ?? 0}, ` +
        `slab ${ctl.slabName || '-'}:${ctl.slabMs ?? 0} vs ${b.slabName || '-'}:${b.slabMs ?? 0} — ` +
        `growth here is run age, not the zones (the aged slab NAMES it)`);
    } else if (report.controlEnd === null) {
      lines.push('(town aged): could not hold its window — aged-control evidence missing this run');
    }
    // ---- THE SKIP GATE (2026-08-01, ratified): a skipped row is a zone
    // with NO row — coverage silently lost, the exact silence the sweep
    // exists to prevent. Classes (src/dev/perf.ts PerfSkipRow):
    // 'unmintable' (the registry refused the id) and 'load-fallback'
    // (minted but the load fell back) are the mint machinery saying no
    // before any walker stood — REPORT-ONLY, the deliberate lane. A 'hold'
    // skip — the walker stood IN the zone and could not keep one clean
    // window pair in its attempts — GATES like a breach: that zone ships,
    // players will walk it, and "unmeasurable" must be a verdict someone
    // reads, not a silence. The waiver rides the breach machinery's own
    // committed per-tileset registry: overrides[<id>].allowSkip
    // acknowledges a deliberately unholdable row (carry a _todo + fresh
    // evidence, like any override row). Routing lives in ONE exported
    // table — skipVerdict (launcher/perfdeadman.cjs), shared with the
    // fragment sim so gate and sim can never drift — which also carries
    // the 2026-08-02 'wedge' class: the deadman's row ALWAYS gates, no
    // waiver exists (a wedge is a bug it caught, never a committed fact).
    const skipRows = Array.isArray(report.skipped) ? report.skipped : [];
    for (const s of skipRows) {
      const v = skipVerdict(s, budgets.overrides);
      if (v !== 'gates') continue;
      breaches.push(s.class === 'wedge'
        ? `${s.id}: WEDGED mid-sweep — ${s.note} (the deadman killed a hung run; a wedge always gates, no waiver)`
        : `${s.id}: UNMEASURED — ${s.note} (a hold skip gates; overrides['${s.id}'].allowSkip is the committed waiver)`);
    }
    if (skipRows.length) {
      lines.push('skipped: ' + skipRows.map((/** @type {any} */ s) => {
        const v = skipVerdict(s, budgets.overrides);
        return `${s.id} [${s.class}${v === 'waived' ? ', waived' : v === 'gates' ? ', GATES' : ''}] ${s.note}`;
      }).join('; '));
    }
    console.log(lines.join('\n'));
    console.log(`canvas ${report.canvas.w}x${report.canvas.h} @dpr ${report.dpr}`);

    // ---- report files (balance/reports is gitignored, like every gate) ----
    // Every report carries the DIST DIGEST it measured (the dirty-tree
    // guard's other half — when two runs disagree, dist.stamp says whether
    // they measured the same bytes) and, on a deadman kill, the full wedge
    // forensics (pause stacks with line:col — bundle-archaeology fuel).
    const stampStr = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const dir = path.join(BASE, 'balance', 'reports', 'perf_' + stampStr);
    fs.mkdirSync(dir, { recursive: true });
    const dist = { stamp: distStamp, treeDirty, allowDirty, rebuilt: !distFresh };
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ budgets, opts, dist, report, breaches, wedge }, null, 2));
    fs.writeFileSync(path.join(dir, 'report.md'), [
      '# perf ' + stampStr, '',
      `dist ${distStamp ? distStamp.slice(0, 20) + '…' : '(no stamp)'}${treeDirty ? ' — TREE DIRTY at measure time' : ''}`, '',
      ...(forensics ? [`FORENSICS RUN (weather '${opts.weather ?? '(natural)'}', ablate [${(opts.ablate ?? []).join(',')}]) — gate informative only.`, ''] : []),
      ...(wedge ? [`## WEDGE`, `The deadman killed a hung run (${wedge.face} face): ${wedge.note}`,
        `${wedge.stacks.length} pause stacks in report.json; rows below are the PARTIAL sweep the beats banked.`, ''] : []),
      '```', ...lines, '```', '',
      breaches.length ? '## BREACHES\n' + breaches.map(b => '- ' + b).join('\n') : 'No budget breached.',
    ].join('\n'));
    console.log('report -> ' + dir);

    // A deadman kill destroys the renderer — the 'renderer gone' that
    // follows is OUR kill, not a run error; the wedge verdict already
    // carries the truth, so only a NON-wedge run may throw on errors.
    if (!wedge && errors.length) throw new Error(errors.join('; '));
    if (wedge) {
      console.log(forensics
        ? 'PERF WEDGED (forensics run — exit 1, the run never completed):'
        : 'PERF WEDGED — the deadman killed a hung run; the wedge row gates:');
      for (const b of breaches) console.log('  - ' + b);
      gameServer?.close();
      releaseRunLock();
      app.exit(forensics ? 1 : 2);
      return;
    }
    // CONTROL SANITY: the town is the run's meter stick — when IT hitches
    // (an occluded window throttled to 1Hz reads exactly ~1000ms gaps; a
    // loaded machine drags it to 30+), every relative cap it feeds is
    // garbage and any breach would blame zones for the environment. Such a
    // run is INVALID, not a regression: exit 1 (never 2) so scripts can
    // tell "fix your machine/window" from "fix your code". (Measured
    // 2026-07-15: a covered gate window read town 1000.2 and 'breached'
    // jungle's absolute caps — the environment, wearing a zone's name.)
    const sickMs = Number(budgets.controlSickMs ?? 40);
    if (ctl && ctl.gapP50 > sickMs) {
      console.log(`PERF RUN INVALID: town control gapP50 ${ctl.gapP50}ms > controlSickMs ${sickMs} — ` +
        `the control cannot judge anything. Likely an occluded/covered game window ` +
        `(1Hz rAF throttle reads ~1000ms gaps) or a loaded machine; report kept for forensics.`);
      gameServer?.close();
      releaseRunLock();
      app.exit(1);
      return;
    }
    if (breaches.length) {
      console.log(forensics ? 'PERF (forensics — informative only):' : 'PERF BREACHED:');
      for (const b of breaches) console.log('  - ' + b);
    } else {
      console.log('PERF OK — no budget breached.');
    }
    gameServer?.close();
    releaseRunLock();
    app.exit(forensics ? 0 : (breaches.length ? 2 : 0));
  } catch (e) {
    console.log('PERF FAILED: ' + String(e));
    gameServer?.close();
    releaseRunLock();
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
app.on('before-quit', () => { gameServer?.close(); stopSourceServer(); });
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
