import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
// Both cold prototype replacements run before the retained owner is constructed,
// each in a new process so a cached module cannot hide a forged capture.
for(const mode of ['scope','epoch']){const r=spawnSync(process.execPath,['--import','tsx',fileURLToPath(new URL('./probe_criticcrusadecoldcapture.ts',import.meta.url)),mode],{encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');assert.equal(r.error,undefined);assert.equal(r.status,0,'cold Crusade '+mode+' boundary');}
