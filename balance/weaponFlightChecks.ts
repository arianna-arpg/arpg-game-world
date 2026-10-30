import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SKILL_FLIGHTS } from '../src/data/skillFlightVisuals';
import { WEAPON_FLIGHT_ART } from '../src/data/weaponFlightVisuals';
import { PROJ_FORM_GEO, projFormTouches } from '../src/engine/projForms';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { drawSkillFlightHead } from '../src/render/vis/skillFlightVoice';
import { makeSimWorld } from '../src/sim/arena';
import { makeSkillInstance } from '../src/engine/skills';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';

export function checkWeaponFlights(): void {
  const w = makeSimWorld('warrior', 71928), p = w.player;
  w.walk = null; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
  const rows = Object.entries(SKILL_FLIGHTS).filter(([, v]) => v.weapon);
  const nativeRows: { id: string; name: string; shape: string }[] = [];
  for (const [id, v] of rows) {
    for (const part of v.weapon!) assert(PART_PAINTERS[part.kind], id + ': ' + part.kind);
    assert(!v.weaponPose || (Number.isFinite(v.weaponPose.scale) && v.weaponPose.scale! > 0));
    w.projectiles = []; w.actors = [p]; w.zones = []; p.pos = { x: 700, y: 700 }; p.casting = null;
    const inst = makeSkillInstance(SKILLS[id]); p.skills[0] = inst; w.meta.knownSkills.set(id, inst);
    // Marker-based flights are released through their normal placement presses.
    const d = inst.def.delivery;
    const presses = d.type === 'projectile' && d.caroms ? d.caroms.anchors + (d.caroms.hang ? 1 : 0) : 1;
    for (let i = 0; i < presses; i++) w.executeSkill(p, inst, { x: 880 + i * 35, y: 700 + i % 2 * 60 });
    const shot = w.projectiles.find(p => p.inst.def.id === id);
    assert(shot, id + ': real cast produced its projectile');
    const geometry = JSON.stringify({ pos: shot.pos, dir: shot.dir, radius: shot.radius, shape: shot.shape });
    let draws = 0, depth = 0;
    const rectangles: number[][] = [];
    const ctx = new Proxy({ globalAlpha: 1 } as Record<string, unknown>, {
      get: (o, k) => k in o ? o[String(k)] : (...args: unknown[]) => {
        assert(args.every(v => typeof v !== 'number' || Number.isFinite(v)), id + ': ' + String(k));
        if (k === 'rect') rectangles.push(args as number[]);
        if (k === 'save') depth++; if (k === 'restore') depth--; draws++;
      }, set: (o, k, v) => { o[String(k)] = v; return true; },
    }) as unknown as CanvasRenderingContext2D;
    const hasWeaponBody = shot.shape === 'circle' || shot.shape === 'line';
    assert.equal(drawSkillFlightHead(ctx, shot), hasWeaponBody, id);
    assert.equal(depth, 0);
    assert(hasWeaponBody ? draws > 10 && draws < 500 : draws === 0, id + ': native-form draw boundary');
    if (shot.shape === 'line') {
      const g = PROJ_FORM_GEO.line, r = shot.radius;
      assert.deepEqual(rectangles[0], [-g.hAlong * r, -g.hAcross * r, 2 * g.hAlong * r, 2 * g.hAcross * r], id + ': clip/edge use collision geometry');
      for (const [x, y, hit] of [[g.hAlong * r - .01, 0, true], [0, g.hAcross * r - .01, true],
        [g.hAlong * r + .01, 0, false], [0, g.hAcross * r + .01, false]] as const) {
        assert.equal(projFormTouches('line', 0, 0, 0, r, shot.age, x, y, 0), hit);
      }
    }
    nativeRows.push({ id, name: SKILLS[id].name, shape: shot.shape });
    assert.equal(JSON.stringify({ pos: shot.pos, dir: shot.dir, radius: shot.radius, shape: shot.shape }), geometry);
    assert.equal(drawSkillFlightHead(ctx, { ...shot, shape: 'square' }), false, 'alternate collision form retains its renderer');
    const snap = serializeSnapshot(w, 1), peer = makeSimWorld('warrior', 71928);
    applySnapshot(peer, JSON.parse(JSON.stringify(snap)));
    assert(peer.projectiles.some(p => p.skillVisualId === id), id + ': copied source identity');
  }
  // Family signatures are allowed to be shared by related attacks. Completely
  // different objects (axe/card/hook/grenade) must not collapse to one drawing.
  const signatures = new Set(Object.values(WEAPON_FLIGHT_ART).map(p => JSON.stringify(p)));
  assert.equal(signatures.size, Object.keys(WEAPON_FLIGHT_ART).length);
  mkdirSync('balance/reports/visual-census', { recursive: true });
  writeFileSync('balance/reports/visual-census/flights.json', JSON.stringify(nativeRows, null, 2));
  console.log(`PASS ${rows.length} real weapon flights: registered parts, bounded painter, native forms and peer identity`);
  console.log('Retained native wide forms: ' + nativeRows.filter(r => r.shape !== 'circle').map(r => r.id).join(', '));
}
