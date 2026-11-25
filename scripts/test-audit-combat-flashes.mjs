import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { auditCombatFlashes } from './audit-combat-flashes.mjs';

test('the global flash census follows local literals, conditional branches and empty spreads', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hollow-wake-flash-'));
  try {
    fs.writeFileSync(path.join(dir, 'fixture.ts'), [
      "const plain = {radius:5};",
      "const named = {radius:5, fx:'world:healed'};",
      "world['flashes'].push(plain);",
      "world.flashes.push(ready ? named : {radius:3});",
      "world.flashes.push({...plain, fx:undefined});",
      "world.flashes.push({...named});",
      "world.flashes.push((named));",
      "world.flashes.push({haze:1});",
    ].join('\n'));
    const result = auditCombatFlashes(dir);
    assert.deepEqual(result.regressions.map(site => site.line), [3,4,5]);
    assert.equal(result.sites.length,6);
  } finally {
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
