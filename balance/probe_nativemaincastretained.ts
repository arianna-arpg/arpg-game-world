import '../src/engine/world';
import assert from 'node:assert/strict';
import {nativeCampaignFixture, birthActualNativeArea} from './nativeCombatRetainedFixture';
import {refuseWorldCombat, writeCombatProof, combatHash} from './probe_nativecombatcycle';
import {withSeededRandom} from '../src/core/rng';
import {makeSimWorld} from '../src/sim/arena';
import {makeSkillInstance} from '../src/engine/skills';
import {SKILLS} from '../src/data/skills';
import {mod} from '../src/engine/stats';
import {playerCastPreparation} from '../src/engine/playerCastVisual';
import {companionCueState} from '../src/engine/companionCues';
import {standingOrderFor} from '../src/engine/companionStances';
import {NativeAreaHostedSnapshots} from '../src/worldmass/nativeAreaHostedSnapshots';
import {applySnapshot} from '../src/net/snapshot';

const result = withSeededRandom(66132, () => {
  const setup = nativeCampaignFixture(45927), writer = setup.writer;
  const client = makeSimWorld('warrior', 66133);
  const course = refuseWorldCombat([writer], worldDrivers => {
    const {ongoing, coordinator, authority} = birthActualNativeArea(setup);
    const combat = ongoing.combat, hero = writer.player;
    hero.invulnerable = true;
    hero.sheet.setSource('cast-parity-fixture', [mod('mana', 'override', 100000), mod('life', 'override', 100000)]);
    hero.fillResources();
    const inst = makeSkillInstance(SKILLS.summon_skeleton);
    inst.devGift = true; // The ordinary QA skill-grant permission; resource/level progression is outside this course.
    hero.skills = [inst];
    writer.meta.knownSkills.set(inst.def.id, inst);
    assert(combat.useSkill(hero, inst, {...hero.pos}, true));
    assert(hero.casting);
    combat.updateCasting(hero, hero.casting.total * .4);
    const prep = playerCastPreparation(hero);
    assert(prep);
    assert.equal(prep.profile.family, 'summon');
    assert(Math.abs(prep.fill! - .4) < 1e-8);
    assert(!combat.scene.actors.some(a => a.owner === hero));
    writer.metaDirty.add(writer.localSeat.id);
    const packet = new NativeAreaHostedSnapshots({writer, coordinator, authority}).serialize(1, [writer.localSeat])[0].snapshot;
    assert.equal(packet.actors.find(a => a.id === hero.id)?.cast?.sk, inst.def.id);
    assert(packet.seatMeta?.[writer.localSeat.id]);

    hero.applyStatus('stun', 0, 1, 'cast-parity-fixture');
    assert.equal(playerCastPreparation(hero), undefined);
    combat.updateCasting(hero, .01);
    assert.equal(hero.casting, null);
    assert(!combat.scene.actors.some(a => a.owner === hero));
    hero.statuses = [];
    hero.useLock = 0;
    hero.cooldowns.clear();
    assert(combat.useSkill(hero, inst, {...hero.pos}, true));
    combat.updateCasting(hero, inst.def.useTime + 1);
    assert.equal(playerCastPreparation(hero), undefined);
    const minion = combat.scene.actors.find(a => a.owner === hero)!;
    assert(minion);
    assert.equal(authority.require(minion).combat, combat);
    minion.standingOrder = standingOrderFor('passive');
    minion.pos = {x: hero.pos.x + 320, y: hero.pos.y};
    minion.emergeUntil = undefined;
    combat.ai.updateActor(minion, .05);
    assert.equal(minion.companionReturnTo, hero.id);
    assert(companionCueState(minion, ongoing.assembly.input.ecology).links.some(l => l.to.id === hero.id));
    minion.pos = {x: hero.pos.x + 50, y: hero.pos.y};
    combat.ai.updateActor(minion, .05);
    assert.equal(minion.companionReturnTo, undefined);
    assert(!companionCueState(minion, ongoing.assembly.input.ecology).links.some(l => l.kind === 'owner'));
    assert.deepEqual(worldDrivers, []);
    return {packet, seat: writer.localSeat.id, prep, worldDrivers, zone: combat.scene.zone.id};
  });
  client.clientSeatId = course.seat;
  client.meta.knownSkills.delete('summon_skeleton');
  applySnapshot(client, course.packet);
  assert.equal(client.player.casting?.inst, client.meta.knownSkills.get('summon_skeleton'));
  assert.equal(playerCastPreparation(client.player)?.profile.family, 'summon');
  assert.equal(playerCastPreparation(client.player)?.fill, course.prep.fill);
  return {
    zone: course.zone, realRetainedCast: true, interruptionBeforeBirth: true,
    genuineSummonAuthority: true, actualAIHeelMarker: true, markerClearedAtHeel: true,
    perAreaWire: true, samePacketMetadata: true, worldDrivers: course.worldDrivers,
  };
});
writeCombatProof('native-main-cast-retained.json', {
  scope: 'Actual retained cast, interruption, summon admission, passive-stance AI and per-area packet. Explicit fixture resources, native devGift skill permission and minion positions; not a natural progression or network transport course.',
  result, receipt: combatHash(JSON.stringify(result)),
});
console.log(JSON.stringify(result));
