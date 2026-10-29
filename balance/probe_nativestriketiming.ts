/** Main's timing composition on the actual retained casting runtime and wire predictor. */
import assert from 'node:assert/strict';
import { withSeededRandom } from '../src/core/rng';
import { vec } from '../src/core/math';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import type { CastingState } from '../src/engine/actor';
import { predictableCast } from '../src/net/shell';
import { nativeCampaignFixture, birthActualNativeArea } from './nativeCombatRetainedFixture';
import { refuseWorldCombat } from './probe_nativecombatcycle';

withSeededRandom(0x71a2, () => {
  const setup = nativeCampaignFixture();
  refuseWorldCombat([setup.writer], () => {
    const { ongoing, authority } = birthActualNativeArea(setup);
    const combat = ongoing.combat, { scene, population, geometry } = ongoing.assembly.input;
    const caster = population.createMonster('skeleton_warrior', 12, 'player');
    caster.pos = geometry.findFreeSpot(vec(geometry.arena.w / 2, geometry.arena.h / 2), caster.radius)!;
    assert.ok(caster.pos);
    scene.actors.push(caster); authority.claim(ongoing.binding, [caster]);
    const aim = { x: caster.pos.x + 100, y: caster.pos.y };
    const casts: number[] = [], execute = combat.executeSkill.bind(combat);
    combat.executeSkill = (...args) => { casts.push(args[3]?.dmgMult ?? 1); return execute(...args); };
    let flawless = 0;
    const triggers = combat.rollTriggers.bind(combat);
    combat.rollTriggers = (...args) => { if (args[1] === 'flawless') flawless++; return triggers(...args); };
    const both = ['perfect_draw', 'wandering_mark'];
    const cases = [
      { fraction: .8, marker: .8, multiplier: 1.7 * 2.2 },
      { fraction: .8, marker: .4, multiplier: 1.7 },
      { fraction: .4, marker: .4, multiplier: 2.2 },
      { fraction: .2, marker: .5, multiplier: 1 },
    ];
    for (const order of [both, [...both].reverse()]) for (const held of [false, true]) for (const test of cases) {
      caster.casting = null; caster.useLock = 0; caster.cooldowns.clear(); caster.fillResources();
      const inst = makeSkillInstance({ ...SKILLS.fireball, requirements: undefined, manaCost: 0,
        cooldown: 0, useTime: 1, effects: [] }, 1, 4);
      const ids = held ? [...order, 'overcharge'] : order;
      ids.forEach((id, i) => { inst.sockets[i] = { def: SUPPORTS[id], level: 1 }; });
      caster.skills = [inst];
      assert.equal(predictableCast(caster, inst), null, 'timing casts wait for host authority');
      assert.ok(combat.useSkill(caster, inst, aim));
      const cs = caster.casting as CastingState | null;
      assert.ok(cs);
      assert.equal(cs.strikeTimings?.length, 2);
      assert.ok(cs.indicatorAt! >= .3 && cs.indicatorAt! <= .85);
      cs.elapsed = cs.total * test.fraction; cs.indicatorAt = test.marker;
      const before = flawless;
      if (held) {
        cs.stage = 1; cs.held = false; cs.aiHold = 0; // the NPC releases on this update
        combat.updateCasting(caster, 0);
        assert.ok(Math.abs(casts.at(-1)! - test.multiplier * 1.4 * cs.baseMult) < 1e-9);
        assert.equal(flawless, before, 'release does not add press triggers');
      } else {
        combat.castPress(caster);
        assert.ok(Math.abs((cs.empowered ?? 1) - test.multiplier) < 1e-9);
        assert.equal(flawless - before, test.multiplier > 1 ? 1 : 0);
        combat.castPress(caster); assert.equal(flawless - before, test.multiplier > 1 ? 1 : 0);
        combat.updateCasting(caster, cs.total);
        assert.ok(Math.abs(casts.at(-1)! - test.multiplier * cs.baseMult) < 1e-9);
      }
      assert.equal(caster.casting, null);
    }
    caster.useLock = 0; caster.cooldowns.clear();
    const plain = makeSkillInstance({ ...SKILLS.fireball, requirements: undefined, manaCost: 0,
      cooldown: 0, useTime: 1 }, 1, 4);
    assert.notEqual(predictableCast(caster, plain), null, 'plain casts retain local prediction');
  });
});
console.log('PASS native timing composition: both socket orders, independent windows, press/release, trigger counts and wire prediction');
