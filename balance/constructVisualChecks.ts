import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { LOOKS, SELF_DRESSING_KINDS } from '../src/data/looks';
import { CONSTRUCT_BODY_LOOKS } from '../src/data/constructLooks';
import { GLYPH_PARTS } from '../src/data/glyphParts';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { makeSimWorld } from '../src/sim/arena';
import { makeSkillInstance } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

/** Run inside the existing presence gate, so new anatomy cannot bypass it. */
export function checkConstructBodies(): void {
  const rows = Object.values(SKILLS).filter(s => s.delivery.type === 'construct' && !SELF_DRESSING_KINDS.has(s.delivery.kind));
  const used = new Set<string>();
  for (const s of rows) {
    const d = s.delivery; assert(d.type === 'construct');
    assert(d.look && CONSTRUCT_BODY_LOOKS[d.look], `${s.id}: native body missing`);
    assert(!used.has(d.look), `${s.id}: indistinguishable native body`); used.add(d.look);
    const look = LOOKS[d.look];
    assert(look.binding?.length, `${s.id}: attributable ownership mark`);
    for (const p of [...look.parts, ...look.live ?? [], ...look.binding ?? []]) {
      assert(PART_PAINTERS[p.kind], `${s.id}: unknown part ${p.kind}`);
      for (const n of [p.x ?? 0, p.y ?? 0, p.rot ?? 0, p.scale ?? 1]) assert(Number.isFinite(n));
      assert((p.scale ?? 1) > 0);
      const glyph = GLYPH_PARTS[p.kind];
      if (glyph) assert(glyph.ops.length > 0 && glyph.ops.length <= 64, `${p.kind}: bounded glyph`);
    }
  }
  assert.equal(used.size, Object.keys(CONSTRUCT_BODY_LOOKS).length, 'every body is authored on a delivery');
  // Exercise the real mint and existing wire. No new DTO or viewer-side source
  // lookup is needed: explicit delivery look, ownership and radii already travel.
  const w = makeSimWorld('necromancer', 21892); w.walk = null; w.actors = [w.player];
  const actors = rows.map(s => {
    assert(s.delivery.type === 'construct');
    const a = w.spawnConstruct(w.player, makeSkillInstance(s), s.delivery, w.player.pos);
    assert(a); assert.equal(a.look, s.delivery.look); assert.equal(a.sourceSkillId, s.id);
    assert.equal(a.radius, ['trap', 'mine'].includes(s.delivery.kind) ? 8 : 13);
    return a;
  });
  const snap = serializeSnapshot(w, 1), peer = makeSimWorld('necromancer', 21892); applySnapshot(peer, snap);
  for (const a of actors) {
    const i = snap.actors.findIndex(b => b.id === a.id); assert(i >= 0);
    assert.equal(peer.actors[i].look, a.look); assert.equal(peer.actors[i].radius, a.radius);
    assert.equal(peer.actors[i].presenceBadge?.skillId, a.sourceSkillId);
  }
  mkdirSync('balance/reports/construct-visuals', { recursive: true });
  writeFileSync('balance/reports/construct-visuals/catalogue.json', JSON.stringify(rows.map(s => ({
    id: s.id, name: s.name, color: s.color, look: s.delivery.type === 'construct' ? s.delivery.look : undefined,
  })), null, 2));
  console.log(`PASS ${rows.length} construct bodies: registered parts, real spawn, unchanged radii and peer identity`);
}
