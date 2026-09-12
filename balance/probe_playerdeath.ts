import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { DEATH_PRESENTATION as CFG } from '../src/data/deathPresentation';
import { deathPresentationPose } from '../src/engine/deathPresentation';

const w = makeSimWorld('warrior', 9142);
w.player.life = 0;
w.kill(w.player);
assert.equal(w.gameOver, true, 'death concludes immediately');
assert.equal(w.player.dead, true);
const state = w.deathPresentation!;
assert.ok(state, 'the dead body has a presentation from its first render');
const position = { ...w.player.pos };
const end = deathPresentationPose(0).endAt;
const booked = JSON.stringify({ meta: w.meta, ledger: w.ledger, drops: w.drops });
w.kill(w.player);
assert.equal(w.deathPresentation, state, 'repeat kill cannot restart the sequence');
w.applyInputs(new Map([[w.localSeat.id, { dx: 1, dy: 1, aim: position, held: [true], edge: [true] }]]), 0.2);
assert.deepEqual(w.player.pos, position, 'dead input cannot move or cast');
for (let i = 0; i < 200; i++) w.update(1 / 60);
assert.ok(deathPresentationPose(state.elapsed).complete, 'raw timeline finishes');
assert.equal(w.screenFade, 1, 'last rendered frame reaches full dark');
assert.deepEqual(w.player.pos, position, 'lift and shatter never move the corpse');
assert.equal(JSON.stringify({ meta: w.meta, ledger: w.ledger, drops: w.drops }), booked, 'presentation cannot alter the settled run');
const stopped = state.elapsed;
w.update(1);
assert.equal(state.elapsed, stopped, 'completed presentation retires itself');

const rise = deathPresentationPose(CFG.riseSec / 2);
assert.ok(rise.lift > 0 && rise.cracks === 0 && !rise.reveal);
const crack = deathPresentationPose(CFG.riseSec + CFG.crackSec / 2);
assert.ok(crack.cracks > 0 && !crack.broken && !crack.reveal);
const shatter = deathPresentationPose(CFG.riseSec + CFG.crackSec + 0.1);
assert.ok(shatter.broken && shatter.shardAlpha > 0 && !shatter.reveal);
assert.ok(deathPresentationPose(end).complete);
const breakAt = CFG.riseSec + CFG.crackSec;
assert.equal(deathPresentationPose(breakAt - CFG.flashLeadSec - 0.01).flash, 0, 'flash waits for the final cracking beat');
assert.equal(deathPresentationPose(breakAt).flash, 1, 'flash peaks exactly as fragments separate');
assert.ok(deathPresentationPose(breakAt + CFG.flashSec / 2).flash < 1, 'flash disperses while shards fly');
assert.equal(deathPresentationPose(breakAt + CFG.flashSec + 0.01).flash, 0, 'flash ends cleanly');
assert.equal(deathPresentationPose(breakAt, { ...CFG, flashSec: 0 }).flash, 0, 'zero duration disables the flash');
assert.equal(deathPresentationPose(breakAt).screenFlash, CFG.screenFlashAlpha, 'screen pulse peaks with the body');
assert.equal(deathPresentationPose(breakAt + CFG.flashSec / 2).screenFlash,
  deathPresentationPose(breakAt + CFG.flashSec / 2).flash * CFG.screenFlashAlpha, 'screen and body share one envelope');
assert.equal(deathPresentationPose(breakAt, { ...CFG, screenFlashAlpha: 0 }).screenFlash, 0, 'screen flash can be disabled independently');
assert.equal(deathPresentationPose(breakAt + CFG.flashSec + 0.01).screenFlash, 0, 'screen clears when the body flash ends');
const instant = deathPresentationPose(0, { ...CFG, riseSec: 0, crackSec: 0, shatterSec: 0, revealDelaySec: 0, revealSec: 0, flashSec: 0 });
assert.ok(instant.complete && instant.reveal && Number.isFinite(instant.fade), 'zero-duration phases are safe');

const forfeit = makeSimWorld('warrior', 9143);
forfeit.endRun();
assert.equal(forfeit.deathPresentation, null, 'a voluntary ending never shatters');
CFG.enabled = false;
try {
  const disabled = makeSimWorld('warrior', 9144);
  disabled.kill(disabled.player);
  assert.equal(disabled.deathPresentation, null, 'config can disable the sequence');
} finally { CFG.enabled = true; }
console.log('PASS player death: immediate conclusion, one sequence, inert input/rewards, phase order, full dark, retirement, configuration');
