import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { FIELD_ACTOR_LOOKS } from '../src/data/fieldActorLooks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { makeSimWorld } from '../src/sim/arena';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

/** Audit the fully registered catalogue, including generated packages. A new
 * uncomposed body must not silently escape just because it isn't a construct. */
export function checkFieldActorVisuals(): void {
  const w = makeSimWorld('necromancer', 281119); w.walk = null; w.actors = [w.player];
  const missing = Object.values(MONSTERS).filter(m => !m.look && !m.mimicOwnerForm).map(m => m.id);
  assert.deepEqual(missing, [], 'catalogue bodies need a look or an explicit owner-copy policy');
  for (const m of Object.values(MONSTERS)) if (m.look) {
    const look = LOOKS[m.look]; assert(look, `${m.id}: unresolved look ${m.look}`);
    for (const p of [...look.parts, ...(look.live ?? []), ...(look.binding ?? [])]) assert(PART_PAINTERS[p.kind], `${m.id}: unresolved part ${p.kind}`);
  }
  const rows = Object.values(MONSTERS).filter(m => m.look && FIELD_ACTOR_LOOKS[m.look]);
  assert.equal(rows.length, 9);
  const signatures = new Set<string>();
  const actors = rows.map(m => {
    const a = w.createMonster(m.id, 1, 'enemy'); w.actors.push(a);
    assert.equal(a.look, m.look); assert.equal(a.radius, m.radius * (a.spawnScale ?? 1));
    assert.equal(a.material, m.material);
    const look = LOOKS[a.look!]; assert(look);
    for (const p of [...look.parts, ...(look.live ?? []), ...(look.binding ?? [])]) assert(PART_PAINTERS[p.kind], p.kind);
    const signature = JSON.stringify(look.parts); assert(!signatures.has(signature), m.id);
    signatures.add(signature);
    return a;
  });
  // The lone no-look catalogue template is intentional: actual summons copy
  // the owner's full appearance, rather than falling back to its bare circle.
  assert(w.player.look);
  const clone = makeSkillInstance(SKILLS.shadow_clone, 1, 3);
  clone.sockets[0] = { def: SUPPORTS.vessel_of_shadow, level: 1 };
  w.executeSkill(w.player, clone, { ...w.player.pos });
  const shadow = w.actors.find(a => a.defId === 'shadow_self');
  assert(shadow); assert.equal(shadow.look, w.player.look);
  const snap = serializeSnapshot(w, 1), peer = makeSimWorld('necromancer', 281119);
  applySnapshot(peer, JSON.parse(JSON.stringify(snap)));
  for (const a of actors) {
    const i = snap.actors.findIndex(b => b.id === a.id);
    assert.equal(peer.actors[i].look, a.look);
    assert.equal(peer.actors[i].radius, a.radius);
    assert.equal(peer.actors[i].material, a.material);
  }
  mkdirSync('balance/reports/visual-census', { recursive: true });
  writeFileSync('balance/reports/visual-census/actors.json', JSON.stringify(rows.map(m =>
    ({ id: m.id, name: m.name, look: m.look, radius: m.radius })), null, 2));
  console.log(`PASS ${Object.keys(MONSTERS).length} registered actor definitions: no unexplained body fallback; 9 new bodies and owner-copy shadow verified`);
}
