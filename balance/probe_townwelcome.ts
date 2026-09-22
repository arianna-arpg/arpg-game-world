import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { World } from '../src/engine/world';
import { CLASSES } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { HUB_ZONE, START_ZONE } from '../src/data/zones';
import { NPC_DIALOGUES, BRANDT_HAMMER_QUEST } from '../src/data/npcDialogues';
import { dialogueConditionMet, npcDialogueReceipt } from '../src/engine/npcDialogues';
import { LEDGER_FLASK_LESSON } from '../src/meta/account';
import { odysseyMilestoneKey } from '../src/data/powerProgression';
import { makeSkillGem } from '../src/engine/skills';
import { flaskChargeBanks } from '../src/engine/flaskState';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { NullInput } from '../src/net/intent';

bootSimEngine();
let passed = 0;
function check(name: string, test: () => void) { test(); passed++; console.log('PASS ' + name); }
const flasks = ['life_flask', 'mana_flask'];
function full(w: World, seat = w.localSeat) {
  for (const id of flasks) {
    const inst = seat.actor.skills.find(s => s?.def.id === id);
    assert.ok(inst, id + ' equipped');
    const bank = inst.def.chargeCost!.charge;
    assert.equal(seat.actor.charges.get(bank), seat.actor.chargeCapFor(bank, inst));
  }
}
const fixture = makeSimWorld('warrior', 987);
fixture.account.ledger[LEDGER_FLASK_LESSON] = 1;
for (const cls of CLASSES) check(cls.id + ': real fresh creation provisions full flasks', () => {
  const w = new World(fixture.account, fixture.manifest);
  w.createPlayer(cls, { startingCompanions: false }); full(w);
  assert.ok(cls.bar.every((id, i) => !id || w.player.skills[i]?.def.id === id));
});
check('Existing kit and carried gems are seated and filled without duplicates', () => {
  const w = new World(fixture.account, fixture.manifest);
  w.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false, kit: ['life_flask'] });
  w.grantSkillGemItem(w.localSeat, makeSkillGem(SKILLS.mana_flask, 1, 'magic'));
  w.dealVeteranFlasks(); full(w);
  assert.equal(w.meta.items.filter(i => i.gem?.kind === 'skill' && flasks.includes(i.gem.skillId)).length, 0);
  w.player.charges.set('flask_life', 1); w.dealVeteranFlasks();
  assert.equal(w.player.charges.get('flask_life'), 1, 'repeat deal cannot refill');
});
check('Fresh guest is provisioned; restored guest shell opts out', () => {
  const w = new World(fixture.account, fixture.manifest);
  w.createPlayer(CLASSES[0], { startingCompanions: false });
  full(w, w.addSeat('fresh', CLASSES[0], new NullInput(), { startingCompanions: false }));
  const restored = w.addSeat('restored', CLASSES[0], new NullInput(), { startingCompanions: false, startingFlasks: false });
  assert.ok(!restored.meta.knownSkills.has('mana_flask'));
});
check('Continue preserves empty/partly used banks', () => {
  const w = new World(fixture.account, fixture.manifest);
  w.createPlayer(CLASSES[0], { startingCompanions: false });
  w.player.charges.set('flask_life', 0); w.player.charges.set('flask_mana', 1);
  const saved = serializeCharacter(w), before = flaskChargeBanks(w.player);
  const restored = new World(fixture.account, fixture.manifest);
  restored.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  assert.ok(applySavedCharacter(restored, saved)); restored.dealVeteranFlasks();
  assert.deepEqual(flaskChargeBanks(restored.player), before);
});
check('First lesson completed far from Mireille fills immediately and graduates account', () => {
  const w = makeSimWorld('warrior', 1122);
  w.ledger.mireille_flasks_given = 1;
  for (const id of flasks) {
    const item = w.grantSkillGemItem(w.localSeat, makeSkillGem(SKILLS[id], 1, 'magic'))!;
    assert.ok(w.learnSkill(item.uid));
  }
  w.update(1 / 60); full(w);
  assert.equal(w.account.ledger[LEDGER_FLASK_LESSON], 1);
  w.player.charges.set('flask_life', 0); w.update(1 / 60);
  assert.equal(w.player.charges.get('flask_life'), 0);
});

check('Rule census is unambiguous and weights valid', () => {
  assert.equal(new Set(NPC_DIALOGUES.map(d => d.id)).size, NPC_DIALOGUES.length);
  for (const d of NPC_DIALOGUES) {
    assert.ok(d.speaker.defId || d.speaker.role);
    assert.ok(d.lines.length && d.lines.every(l => l.text.trim() && (l.weight ?? 1) > 0));
  }
});
check('Brandt selects run quests, account quests, milestones and stable weighted fallback', () => {
  const w = makeSimWorld('warrior', 2233);
  delete w.account.ledger[odysseyMilestoneKey(1)]; delete w.account.ledger[odysseyMilestoneKey(2)];
  const smith = w.createMonster('townsfolk_smith', 1, 'player'); smith.pos = { ...w.player.pos }; w.actors.push(smith);
  const pick = () => w.npcDialogues.dwell(smith)!;
  const first = pick(); assert.equal(first.def.id, 'brandt_missing_hammer');
  for (let i = 0; i < 10; i++) assert.equal(pick().text, first.text);
  w.account.ledger[odysseyMilestoneKey(1)] = 1; assert.equal(pick().def.id, 'brandt_first_victory');
  w.account.ledger[odysseyMilestoneKey(2)] = 1; assert.equal(pick().def.id, 'brandt_roads_changed');
  w.activeQuests.push({ questId: BRANDT_HAMMER_QUEST, zoneId: w.zone.id, fieldDone: false });
  assert.equal(pick().def.id, 'brandt_hammer_sought');
  assert.equal(dialogueConditionMet(w, { quest: BRANDT_HAMMER_QUEST, state: 'ready' }), false);
  w.activeQuests[0].fieldDone = true;
  assert.equal(dialogueConditionMet(w, { quest: BRANDT_HAMMER_QUEST, state: 'ready' }), false);
  w.meta.items.push({ uid: 99991, baseId: 'quest_hammer', questId: BRANDT_HAMMER_QUEST,
    name: 'Brandt’s Hammer', rarity: 'common', ilvl: 10, tier: 1, baseRoll: 0, implicitRolls: [], affixes: [] });
  assert.equal(dialogueConditionMet(w, { quest: BRANDT_HAMMER_QUEST, state: 'ready' }), true);
  w.account.ledger[`quest_done:${BRANDT_HAMMER_QUEST}`] = 1; assert.equal(pick().def.id, 'brandt_hammer_remembered');
  w.ledger[`quest_done:${BRANDT_HAMMER_QUEST}`] = 1; assert.equal(pick().def.id, 'brandt_hammer_returned');
  assert.equal(dialogueConditionMet(w, { ledger: `quest_done:${BRANDT_HAMMER_QUEST}`, scope: 'either', atLeast: 2 }), false);
  assert.equal(dialogueConditionMet(w, { fact: 'missing' }), false);
});
check('Once-only dwell stays available during its admitted visit, retires after departure', () => {
  const w = makeSimWorld('warrior', 333);
  const smith = w.createMonster('townsfolk_smith', 1, 'player'); smith.pos = { ...w.player.pos };
  NPC_DIALOGUES.push({ id: 'qa_once', speaker: { defId: smith.defId }, priority: 999, once: 'run', trigger: { kind: 'dwell', radius: 100, seconds: 0 }, lines: [{ text: 'Only once.' }] });
  try {
    assert.equal(w.npcDialogues.dwell(smith)?.def.id, 'qa_once');
    assert.equal(w.ledger[npcDialogueReceipt('qa_once')], undefined);
    w.npcDialogues.admitted(smith);
    assert.equal(w.npcDialogues.dwell(smith)?.def.id, 'qa_once');
    smith.pos.x += 1000; w.npcDialogues.dwell(smith); smith.pos.x -= 1000;
    assert.notEqual(w.npcDialogues.dwell(smith)?.def.id, 'qa_once');
  } finally { NPC_DIALOGUES.pop(); }
});
for (const seed of [3344, 4455, 5566]) check('Optional road callout lifecycle, seed ' + seed, () => {
  const w = makeSimWorld('warrior', seed); w.loadZone(START_ZONE);
  const exit = w.exits.find(e => e.to === HUB_ZONE)!; assert.ok(exit);
  const before = JSON.stringify(w.exits);
  w.player.pos = { x: exit.pos.x + 400, y: exit.pos.y }; w.npcSpeechView();
  w.player.pos = { x: exit.pos.x + 200, y: exit.pos.y };
  assert.equal(w.npcDialogues.callout(false), null);
  assert.equal(w.ledger[npcDialogueReceipt('mireille_road_welcome')], undefined);
  const line = w.npcSpeechView()[0]; assert.equal(line?.delivery, 'callout'); assert.equal(line.a.defId, 'townsfolk_innkeep');
  assert.equal(JSON.stringify(w.exits), before, 'no gate added'); assert.equal(w.scene, null);
  w.finishNpcDialogue(line.a.id); assert.equal(w.npcDialogues.callout(true), null);
  w.npcDialogues.leaveZone(); w.player.pos.x += 500; w.npcDialogues.callout(true); w.player.pos.x -= 500;
  assert.equal(w.npcDialogues.callout(true), null, 'receipt survives revisit');
  delete w.ledger[npcDialogueReceipt('mireille_road_welcome')];
  w.player.pos.x += 500; w.npcDialogues.callout(true); w.player.pos.x -= 500;
  w.account.ledger[LEDGER_FLASK_LESSON] = 1;
  assert.equal(w.npcDialogues.callout(true), null, 'graduated accounts stay quiet');
});
console.log(`TOWN WELCOME: ${passed} passed`);
