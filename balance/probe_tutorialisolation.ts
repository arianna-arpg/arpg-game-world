/** Tutorial actors must never become persistent hunters in the real run.
 * Run: npx tsx balance/probe_tutorialisolation.ts */
import { bootSimEngine, classById, makeSimWorld, SIM_ARENA_ID } from '../src/sim/arena';
import { sceneBegin, updateScene, muStageLive } from '../src/engine/scenes';
import { TUTORIAL_FACTIONS } from '../src/data/commanders';
import { MONSTERS } from '../src/data/monsters';
import { World } from '../src/engine/world';
import { formNemesis, peekSaga, touchSaga } from '../src/meta/nemesis';

let failed = 0;
function check(name: string, ok: boolean): void {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}
function winningRoll<T>(fn: () => T): T {
  const previous = Math.random;
  Math.random = () => 0.01;
  try { return fn(); } finally { Math.random = previous; }
}
function beginStage(w: World, kind: string): void {
  const sc = w.scene!;
  sc.stageIx = sc.def.stages.findIndex(s => s.kind === kind);
  if (sc.stageIx < 0) throw new Error(`Missing ${kind} stage`);
  sc.begun = false;
  sc.card = null;
  updateScene(w, 1 / 60);
}
bootSimEngine();

// Use the real director to spawn each commander and cross its Mu boundary.
// Pin a combat mark and winning formation roll: this must never depend on luck.
for (const [i, faction] of TUTORIAL_FACTIONS.entries()) {
  const w = makeSimWorld('warrior', 71800 + i);
  w.account.ledger[`tutorial_faction:${faction.id}`] = 1;
  sceneBegin(w, 'prologue');
  beginStage(w, 'reckoning');
  const boss = w.actors.find(a => a.defId === faction.commander)!;
  check(`${faction.id}: real tutorial commander is scene-owned`,
    !!boss && boss.noBounty && boss.eventKey === 'scene:prologue');
  boss.grudgeMark = true;
  winningRoll(() => beginStage(w, 'mu'));
  check(`${faction.id}: Mu discards the tutorial body`, muStageLive(w) && !w.actors.includes(boss));
  check(`${faction.id}: Mu departure creates no persistent nemesis`,
    (peekSaga(w.account, w.meta.name)?.nemeses.length ?? 0) === 0);

  // The class selection shell constructs a fresh World with the same account.
  const next = new World(w.account, w.manifest);
  next.createPlayer(classById('warrior'), { startingCompanions: false });
  next.loadZone(SIM_ARENA_ID);
  winningRoll(() => next['manifestNemeses']({ ...next.zone, objective: { kind: 'none' } }));
  check(`${faction.id}: new run cannot summon the tutorial commander`,
    !next.actors.some(a => a.defId === faction.commander));
}

// Scene combat must not seed grudges, promote existing hunters or manifest them.
{
  const w = makeSimWorld('warrior', 71820);
  const saga = touchSaga(w.account, w.meta.name);
  const rec = formNemesis(saga, 'goblin_skirmisher', 'goblin', 'escaped', Math.random);
  sceneBegin(w, 'prologue');
  const before = JSON.stringify(saga);
  const enemy = w.createMonster('goblin_skirmisher', 1, 'enemy');
  enemy.grudgeMark = true;
  enemy.nemesis = { id: rec.id, sagaKey: w.meta.name.toLowerCase(), tint: '#fff' };
  w.actors.push(enemy);
  winningRoll(() => {
    w['noteNemesisKill'](w.createMonster('goblin_skirmisher', 1, 'enemy'));
    w['scanNemesisSurvivors']();
    w['manifestNemeses'](w.zone);
  });
  check('Scene combat and departure leave an existing saga unchanged', JSON.stringify(saga) === before);
}

// Stale scene actors remain ineligible even after the director has torn down.
{
  const w = makeSimWorld('warrior', 71821);
  const actor = w.createMonster('goblin_skirmisher', 1, 'enemy');
  actor.eventKey = 'scene:prologue';
  check('Scene ownership excludes a stray body outside the director', !w['nemesisEligible'](actor));
  actor.eventKey = undefined;
  actor.noBounty = true;
  check('Rewardless scripted bodies cannot become persistent hunters', !w['nemesisEligible'](actor));
  actor.noBounty = false;
  actor.grudgeMark = true;
  w.actors.push(actor);
  winningRoll(() => w['scanNemesisSurvivors']());
  check('Ordinary wounded enemies still form nemeses', peekSaga(w.account, w.meta.name)?.nemeses.length === 1);
}

// Old accounts can already contain a leaked commander. Preserve the history,
// but honor the definition's exclusion when it tries to spawn again.
for (const [i, faction] of TUTORIAL_FACTIONS.entries()) {
  const w = makeSimWorld('warrior', 71830 + i);
  const saga = touchSaga(w.account, w.meta.name);
  const rec = formNemesis(saga, faction.commander, faction.id, 'escaped', Math.random);
  const before = JSON.stringify(rec);
  winningRoll(() => w['manifestNemeses']({ ...w.zone, objective: { kind: 'none' } }));
  check(`${faction.id}: legacy commander record stays dormant and intact`,
    !w.actors.some(a => a.nemesis?.id === rec.id) && JSON.stringify(rec) === before);
  const authored = w.createMonster(faction.commander, 14, 'enemy');
  check(`${faction.id}: authored revenge encounter retains its boss and kit`,
    !!MONSTERS[authored.defId!].boss && authored.skills.some(s => s?.def.id === faction.verb));
}
{
  const w = makeSimWorld('warrior', 71840);
  const saga = touchSaga(w.account, w.meta.name);
  const rec = formNemesis(saga, 'goblin_skirmisher', 'goblin', 'slayer', Math.random,
    { name: 'Remembered scout', bornRarity: 'rare' });
  winningRoll(() => w['manifestNemeses']({ ...w.zone, objective: { kind: 'none' } }));
  check('Ordinary saved nemeses still manifest with their identity and rarity',
    w.actors.some(a => a.nemesis?.id === rec.id && a.name.includes('Remembered scout') && a.rarity === 'rare'));
}
console.log(`Tutorial isolation: ${failed} failure(s)`);
process.exitCode = failed ? 1 : 0;
