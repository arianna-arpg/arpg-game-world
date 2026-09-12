// Start from the WEBSITE entry point. Booting the game/sim or importing
// glyphParts here would hide missing initialization in the shipped bundle.
import '../src/render/portraitLib';
import assert from 'node:assert/strict';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';

const missing: string[] = [];
let placements = 0;
for (const [id, look] of Object.entries(LOOKS)) {
  for (const part of [...look.parts, ...(look.live ?? [])]) {
    placements++;
    if (!PART_PAINTERS[part.kind]) missing.push(`${id}: ${part.kind}`);
  }
}
assert.deepEqual(missing, [], 'Website portraits must resolve every shipped static and animated part without the game bootstrap');
console.log(`PASS website portrait entry resolves ${placements} placements across ${Object.keys(LOOKS).length} looks`);
