/** Exact protocol-6 source receipt; current integration is independently checked at 7. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
export function historicalSkillFieldsProtocol():number {
 const source=execFileSync('git',['show','d025d99fa167692405403e4106c04d4379542b1c:src/net/shardBuild.ts'],{cwd:fileURLToPath(new URL('../',import.meta.url)),encoding:'utf8'});
 assert.equal(createHash('sha256').update(source).digest('hex'),'7d2a545d69a232af935317851766ab9c462292cebb1e86384ae98ef23d67a3b2','complete immutable compact-field protocol source');
 const match=source.match(/^export const SHARD_WIRE_PROTOCOL = (\d+);$/m);assert(match);return Number(match[1]);
}
