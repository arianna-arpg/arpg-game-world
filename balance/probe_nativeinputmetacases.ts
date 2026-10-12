/** All actual input-authority courses run from the standing probe roster. */
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const modes=['caster','host','travel','dead','valid','carried','late','late-host','departure-caster-getter','departure-host-getter','departure-substitution','travel-local-peer','input-reentry','input-membership'];
for(const mode of modes){
 const result=spawnSync(process.execPath,['--import','tsx',fileURLToPath(new URL('./probe_nativeinputmetaauthority.ts',import.meta.url)),'--'+mode],{encoding:'utf8',maxBuffer:20e6});
 assert.equal(result.status,0,'Native input '+mode+'\n'+result.stdout+'\n'+result.stderr);
 console.log('PASS native input authority '+mode);
}
console.log(JSON.stringify({courses:modes.length,modes,scope:'Unchanged focused input-authority assertions in separate cold processes.'}));
