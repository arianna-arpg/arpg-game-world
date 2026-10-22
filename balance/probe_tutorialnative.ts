/** Shared tutorial isolation through the retained native campaign owners. */
import assert from 'node:assert/strict';
import { clientSetup } from './nativeClientRuntimeFixture';
import { NativeClientRuntime } from '../src/worldmass/nativeClientRuntime';
import { makeSimWorld } from '../src/sim/arena';
import { sceneBegin } from '../src/engine/scenes';
import { TUTORIAL_FACTIONS } from '../src/data/commanders';
import { formNemesis, touchSaga } from '../src/meta/nemesis';
import { withSeededRandom } from '../src/core/rng';

withSeededRandom(71857, () => {
  const tutorial = makeSimWorld('warrior', 71857);
  sceneBegin(tutorial, 'prologue');
  const setup = clientSetup(45927), w = setup.writer;
  const runtime = new NativeClientRuntime({ writer: w, definition: setup.definition, geography: setup.geography.spec });
  runtime.install();
  try {
    const area = runtime.current, history = area.assembly.input.history;
    assert(history.nemesisActive());
    w.scene = tutorial.scene;
    assert.equal(history.nemesisActive(), false, 'native history reads the live tutorial director');
    w.scene = null;
    assert(history.nemesisActive(), 'ending a scene restores ordinary native memory');

    const body = w.actors.find(a => area.combat.campaignTransitions.nemesisEligible(a));
    assert(body, 'fixture has an ordinary eligible enemy');
    const oldKey = body.eventKey;
    body.eventKey = 'scene:prologue';
    assert.equal(area.combat.campaignTransitions.nemesisEligible(body), false);
    body.eventKey = oldKey;
    body.noBounty = true;
    assert.equal(area.combat.campaignTransitions.nemesisEligible(body), false);
    body.noBounty = false;
    assert(area.combat.campaignTransitions.nemesisEligible(body));

    const saga = touchSaga(w.account, w.meta.name);
    const legacy = TUTORIAL_FACTIONS.map(f => formNemesis(saga, f.commander, f.id, 'escaped', Math.random));
    const before = JSON.stringify(legacy);
    const ordinary = formNemesis(saga, 'goblin_skirmisher', 'goblin', 'escaped', Math.random);
    const previous = Math.random;
    Math.random = () => 0.01;
    try {
      area.combat.input.coordinator.runFrom(area, () => area.combat.input.coordinator.loadZone(setup.destination.id));
    } finally { Math.random = previous; }
    assert.equal(JSON.stringify(legacy), before, 'native arrival leaves old commander records dormant');
    assert(!w.actors.some(a => TUTORIAL_FACTIONS.some(f => f.commander === a.defId)));
    assert(w.actors.some(a => a.nemesis?.id === ordinary.id), 'ordinary hunter still manifests through actual native travel');
    console.log('PASS native director, eligibility, seven legacy commanders and ordinary arrival control');
  } finally { w.scene = null; runtime.retire(); }
});
