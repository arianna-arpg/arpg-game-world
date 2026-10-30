import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { LOOKS } from '../src/data/looks';
import '../src/data/glyphParts';
import { SECONDARY_BODY_LOOKS, SECONDARY_LOOKS } from '../src/data/secondaryVisuals';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { SKILL_FLIGHTS } from '../src/data/skillFlightVisuals';
import { makeSkillInstance, instanceConstructLook } from '../src/engine/skills';
import { makeSimWorld } from '../src/sim/arena';
import { mod } from '../src/engine/stats';
import { updateAI } from '../src/engine/ai';
import { serializeSnapshot, applySnapshot } from '../src/net/snapshot';
import { seedGlobalRandom } from '../src/sim/rng';

export function checkSecondaryVisuals(): void {
  const restore = seedGlobalRandom(271128);
  const catalogue: { id: string; name: string; look: string; path: string; support?: typeof SUPPORTS[string] }[] = [];
  const tick = (w: ReturnType<typeof makeSimWorld>, seconds: number) => {
    for (let i = 0; i < Math.ceil(seconds * 60); i++) w.update(1 / 60);
  };
  const rig = () => {
    const w = makeSimWorld('necromancer', 271128), p = w.player;
    w.walk = null; w.actors = [p]; w.doodads = []; w.markDoodadsChanged();
    w.projectiles = []; w.zones = []; p.pos = { x: 700, y: 700 }; p.skills.fill(null);
    p.sheet.setSource('secondary-visuals', [mod('life', 'override', 100000), mod('mana', 'override', 100000)]);
    p.fillResources();
    const skill = (id: string) => {
      const inst = makeSkillInstance({ ...SKILLS[id], requirements: undefined }, 1, 3);
      inst.devGift = true; p.skills[0] = inst; w.meta.knownSkills.set(id, inst); return inst;
    };
    return { w, p, skill };
  };
  try {
    const nativePlants = Object.values(SKILLS).filter(s => s.delivery.type === 'projectile' && s.delivery.plantOnLand);
    assert.deepEqual(nativePlants.map(s => s.id).sort(), ['arclight_rain', 'impale_lance', 'pinning_spear']);
    for (const def of nativePlants) {
      assert(def.delivery.type === 'projectile');
      const spec = def.delivery.plantOnLand!;
      assert(spec.look && SECONDARY_BODY_LOOKS[spec.look], def.id + ': explicit landing body');
      assert(SKILL_FLIGHTS[def.id].weapon?.length, def.id + ': matching airborne anatomy');
      const { w, p, skill } = rig(), inst = skill(def.id);
      w.executeSkill(p, inst, { x: 1100, y: 850 });
      const shots = [...w.projectiles]; assert(shots.length);
      p.pos = { x: 600, y: 850 }; p.facing = Math.PI; // owner moves after the throw
      tick(w, 1.1);
      const plants = w.actors.filter(a => a.owner === p && a.summonInst === inst && !a.dead);
      assert.equal(plants.length, shots.length);
      for (const a of plants) {
        assert.equal(a.look, spec.look);
        assert.equal(a.construct?.kind, spec.embed ? 'embed' : 'barrier');
        assert.equal(a.radius, spec.embed ? 8 : 13);
        assert(shots.some(s => Math.abs(s.dir - a.facing) < 1e-8), 'final flight bearing');
        assert.equal(a.sourceSkillId, def.id);
        assert.deepEqual(a.construct?.embed, spec.embed ? { ...spec.embed, icd: undefined } : undefined);
      }
      const snap = serializeSnapshot(w, 1), peer = makeSimWorld('necromancer', 271128);
      applySnapshot(peer, JSON.parse(JSON.stringify(snap)));
      for (const a of plants) {
        const index = snap.actors.findIndex(b => b.id === a.id);
        assert.equal(peer.actors[index].look, a.look);
        assert.equal(peer.actors[index].facing, a.facing);
        assert.equal(peer.actors[index].radius, a.radius);
      }
      catalogue.push({ id: def.id, name: def.name, look: spec.look, path: 'landing' });
    }
    // Both the safe fallback and author override work through a real landing.
    for (const look of [undefined, 'object_impale_lance']) {
      const { w, p, skill } = rig(), inst = skill('pinning_spear');
      assert(inst.def.delivery.type === 'projectile');
      inst.def = { ...inst.def, delivery: { ...inst.def.delivery,
        plantOnLand: { ...inst.def.delivery.plantOnLand!, look } } };
      w.executeSkill(p, inst, { x: 1100, y: 700 }); tick(w, 1.1);
      assert.equal(w.actors.find(a => a.owner === p)?.look, look ?? SECONDARY_LOOKS.planted);
    }
    {
      const { w, p, skill } = rig(), inst = skill('hanging_volley');
      for (let i = 0; i < 4; i++) w.executeSkill(p, inst, { x: 900 + i * 60, y: 700 });
      const arrows = w.actors.filter(a => a.owner === p && !a.dead);
      assert.equal(arrows.length, 4);
      assert(arrows.every(a => a.look === SECONDARY_LOOKS.hanging && a.invulnerable && a.radius === 13));
      w.executeSkill(p, inst, { x: 900, y: 700 });
      assert(arrows.every(a => a.dead), 're-press consumes actual suspended arrows');
      assert(w.projectiles.length > 0, 'armed arrows still release the patrol volley');
      catalogue.push({ id: 'hanging_volley', name: 'Hanging Volley', look: SECONDARY_LOOKS.hanging, path: 'hanging' });
    }
    for (const [id, support, role] of [
      ['firebolt', 'spirit_totem', 'spiritTotem'], ['whirlwind', 'ritual_ground', 'channelVessel'],
    ] as const) {
      const { w, p, skill } = rig(), inst = skill(id);
      inst.sockets[0] = { def: SUPPORTS[support], level: 1 };
      assert(w.useSkill(p, inst, { x: 850, y: 700 }), support + ': actual conversion cast accepted');
      tick(w, 2);
      const body = w.actors.find(a => a.owner === p && a.summonInst === inst && !a.dead);
      assert(body, support + ': cast completion created a vessel');
      assert.equal(body.look, SECONDARY_LOOKS[role]);
      assert.equal(body.construct?.castInst, inst, 'support payload remains the host');
      if (role === 'channelVessel') assert(body.construct?.holdOnce);
      assert.equal(instanceConstructLook(inst, role, 'fallback'), SECONDARY_LOOKS[role]);
      inst.sockets[0] = null;
      inst.def = { ...inst.def, constructLooks: { [role]: 'object_goad_effigy' } };
      assert.equal(instanceConstructLook(inst, role, 'fallback'), 'object_goad_effigy');
      inst.sockets[0] = { def: { ...SUPPORTS[support], constructLooks: { [role]: 'object_impale_lance' } }, level: 1 };
      assert.equal(instanceConstructLook(inst, role, 'fallback'), 'object_impale_lance');
      catalogue.push({ id, name: SUPPORTS[support].name, look: SECONDARY_LOOKS[role], path: support, support: SUPPORTS[support] });
    }
    {
      const { w, p, skill } = rig(), inst = skill('goad');
      inst.treeNodes = ['pack_challenge', 'piercing_challenge'];
      w.executeSkill(p, inst, { x: 850, y: 700 }); tick(w, .7);
      const effigy = w.actors.find(a => a.owner === p && a.construct);
      const pursuer = w.actors.find(a => a.sourceSkillId?.startsWith('__goad_creeper:'));
      assert.equal(effigy?.look, SECONDARY_LOOKS.effigy);
      assert.equal(pursuer?.look, SECONDARY_LOOKS.pursuer);
      assert(pursuer?.invulnerable && pursuer.untargetable && pursuer.radius === 8);
      assert.equal(pursuer.life, pursuer.maxLife(), 'fresh pursuer has no false damage bar');
      const before = { ...pursuer.pos }; tick(w, .2);
      assert.notDeepEqual(pursuer.pos, before); assert(Number.isFinite(pursuer.facing));
      w.kill(effigy!, true); tick(w, .1); assert(pursuer.dead, 'pursuer retires with its effigy');
      catalogue.push({ id: 'goad', name: 'Goading Effigy', look: SECONDARY_LOOKS.effigy, path: 'effigy' },
        { id: 'goad', name: 'Burrowing Pursuer', look: SECONDARY_LOOKS.pursuer, path: 'pursuer' });
    }
    {
      const { w, p } = rig(), gnoll = w.createMonster('gnoll_impaler', 1, 'enemy');
      gnoll.pos = { x: 1040, y: 700 }; gnoll.spawnedAt = -10; w.actors.push(gnoll);
      assert(gnoll.skills.some(s => s?.def.id === 'pinning_spear'), 'native Gnoll kit');
      // The quiet sim arena does not schedule enemy brains; drive the real
      // picker explicitly, as the ground-device encounter checks do.
      for (let i = 0; i < 60 * 12; i++) {
        updateAI(gnoll, w, 1 / 60); w.update(1 / 60);
        if (w.actors.some(a => a.owner === gnoll && a.sourceSkillId === 'pinning_spear')) break;
      }
      const plants = w.actors.filter(a => a.owner === gnoll && a.sourceSkillId === 'pinning_spear');
      assert(plants.length, 'autonomous Gnoll actually throws and plants its spear');
      assert(plants.every(a => a.look === SECONDARY_LOOKS.planted && a.construct?.kind === 'barrier'));
      assert(!p.dead);
    }
    const signatures = new Set<string>();
    for (const row of catalogue) {
      const look = LOOKS[row.look]; assert(look && look.parts.length);
      const signature = JSON.stringify(look.parts);
      assert(!signatures.has(signature), row.name + ': distinct body composition');
      signatures.add(signature);
      for (const p of [...look.parts, ...(look.binding ?? [])]) assert(PART_PAINTERS[p.kind], p.kind);
    }
    assert.equal(signatures.size, Object.keys(SECONDARY_BODY_LOOKS).length, 'every secondary body exercised');
    mkdirSync('balance/reports/secondary-visuals', { recursive: true });
    writeFileSync('balance/reports/secondary-visuals/catalogue.json', JSON.stringify(catalogue, null, 2));
    console.log('PASS 8 secondary bodies: real landings, Gnoll AI, support conversions, ambush release, effigy lifecycle and peer identity');
  } finally { restore(); }
}
