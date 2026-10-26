// Installer game content is copied from the same published catalog as the web.
// A newer launcher binary never introduces an independently released game.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import releases from '../launcher/releases.cjs';
import branches from '../launcher/branches.cjs';
const gh = process.env.GITHUB_REPOSITORY;
if (!gh) throw new Error('Installer staging requires GITHUB_REPOSITORY.');
if (!process.env.HOLLOW_WAKE_GAME_RELEASE) throw new Error('Installer staging requires the release pinned before the OS jobs started.');
const catalog = releases.validateCatalog(JSON.parse(process.env.HOLLOW_WAKE_GAME_RELEASE), gh);
const entry = catalog.entries.find(e => e.identity.branch === 'main');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'hollow-install-game-'));
const installed = await branches.downloadBundle({ home, branch: 'main', bundle: releases.bundleFor(entry, releases.catalogUrl(gh)), expectedIdentity: entry.identity });
const destination = path.resolve('dist');
if (fs.existsSync(destination)) throw new Error('Installer game staging requires a fresh dist directory.');
fs.cpSync(installed.root, destination, { recursive: true });
console.log('Installer game: main @ ' + installed.commit);
