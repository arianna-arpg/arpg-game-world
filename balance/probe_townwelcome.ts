import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { World, BAR_SLOTS } from '../src/engine/world';
import { CLASSES, kitRungs } from '../src/data/classes';
import { SKILLS } from '../src/data/skills';
import { HUB_ZONE, START_ZONE } from '../src/data/zones';
import { NPC_DIALOGUES, BRANDT_HAMMER_QUEST } from '../src/data/npcDialogues';
import { dialogueConditionMet, npcDialogueReceipt } from '../src/engine/npcDialogues';
import { LEDGER_FLASK_LESSON, makeAccount, serializeAccount, deserializeAccount } from '../src/meta/account';
import { classTierId } from '../src/data/classTiers';
import { resolveClassKit } from '../src/meta/classkit';
import { planSkillSlots, restoreSkillSlotMemory, SKILL_SLOT_MEMORY_CFG } from '../src/meta/skillSlotMemory';
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

const slotOf = (w: World, id: string) => w.seatHero(w.localSeat).skills.findIndex(s => s?.def.id === id);
function veteran(memory: Record<string, number> = {}, kit?: readonly (string | null)[]) {
  const account = makeAccount(); account.ledger[LEDGER_FLASK_LESSON] = 1;
  account.skillSlotMemory = { ...memory };
  const w = new World(account, fixture.manifest);
  w.createPlayer(CLASSES[0], { startingCompanions: false, kit });
  return w;
}
function nextLife(w: World) {
  const account = deserializeAccount(JSON.parse(JSON.stringify(serializeAccount(w.account))))!;
  const next = new World(account, fixture.manifest);
  next.createPlayer(CLASSES[0], { startingCompanions: false });
  return next;
}
check('Moved, swapped and removed flasks keep their last positions across saved accounts and lives', () => {
  const w = veteran(), last = BAR_SLOTS - 1, penultimate = last - 1;
  w.accountDirty = false;
  assert.ok(w.swapSkillSlots(slotOf(w, 'life_flask'), penultimate));
  assert.ok(w.bindSkill(last, 'mana_flask'));
  assert.ok(w.swapSkillSlots(last, penultimate));
  assert.equal(w.accountDirty, true, 'slot edits request immediate account persistence');
  assert.deepEqual(w.account.skillSlotMemory, { life_flask: last, mana_flask: penultimate });
  assert.ok(w.bindSkill(last, 'life_flask'), 'toggle life flask off');
  assert.ok(w.unlearnSkill('mana_flask'), 'return mana flask to the bag');
  const saved = serializeCharacter(w), resumed = new World(w.account, fixture.manifest);
  resumed.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  assert.ok(applySavedCharacter(resumed, saved)); resumed.dealVeteranFlasks();
  assert.equal(slotOf(resumed, 'mana_flask'), -1, 'continue respects deliberate unlearning');
  const next = nextLife(w); full(next);
  assert.equal(slotOf(next, 'life_flask'), last);
  assert.equal(slotOf(next, 'mana_flask'), penultimate);
});
check('Tutorial placement and gem replacement teach memory; removal without prior memory captures the departed slot', () => {
  const w = makeSimWorld('warrior', 5567), last = BAR_SLOTS - 1;
  w.ledger.mireille_flasks_given = 1;
  for (const [i, id] of flasks.entries()) {
    const gem = w.grantSkillGemItem(w.localSeat, makeSkillGem(SKILLS[id], 1, 'magic'))!;
    assert.ok(w.learnSkill(gem.uid, w.localSeat, last - i));
  }
  w.update(1 / 60); full(w);
  assert.equal(w.account.ledger[LEDGER_FLASK_LESSON], 1);
  const replacement = w.grantSkillGemItem(w.localSeat, makeSkillGem(SKILLS.life_flask, 1, 'rare'))!;
  assert.ok(w.learnSkill(replacement.uid));
  assert.equal(w.account.skillSlotMemory.life_flask, last);
  w.account.skillSlotMemory = {};
  assert.ok(w.unlearnSkill('life_flask'));
  assert.ok(w.bindSkill(last - 1, null));
  assert.deepEqual(w.account.skillSlotMemory, { life_flask: last, mana_flask: last - 1 });
  assert.equal(slotOf(nextLife(w), 'life_flask'), last);
});
check('Fallback reserves the other flask preference, preserves class occupants and does not rewrite memory', () => {
  const free = CLASSES[0].bar.indexOf(null);
  const memory = { life_flask: 0, mana_flask: free };
  const w = veteran(memory); full(w);
  assert.equal(w.player.skills[0]?.def.id, CLASSES[0].bar[0]);
  assert.equal(slotOf(w, 'mana_flask'), free);
  assert.equal(slotOf(w, 'life_flask'), free + 1);
  assert.deepEqual(w.account.skillSlotMemory, memory);
  assert.ok(w.swapSkillSlots(0, 1));
  assert.deepEqual(w.account.skillSlotMemory, memory, 'unrelated edits leave fallback preferences alone');
  const duplicate = veteran({ life_flask: BAR_SLOTS - 1, mana_flask: BAR_SLOTS - 1 }); full(duplicate);
  assert.equal(slotOf(duplicate, 'life_flask'), BAR_SLOTS - 1);
  assert.equal(slotOf(duplicate, 'mana_flask'), free);
});
check('Every authored mastery grant keeps its starting slot with remembered and default flask placements', () => {
  for (const cls of CLASSES) {
    const grants = kitRungs(cls).filter(r => !r.replaces);
    if (!grants.length) continue;
    const preferences: Record<string, number>[] = [{}, { life_flask: cls.bar.indexOf(null), mana_flask: BAR_SLOTS - 1 }];
    for (const memory of preferences) {
      const account = makeAccount(); account.ledger[LEDGER_FLASK_LESSON] = 1;
      account.skillSlotMemory = { ...memory };
      for (const grant of grants) account.unlockedClassTiers.add(classTierId(cls.id, grant.tier));
      const kit = resolveClassKit(account, cls);
      const w = new World(account, fixture.manifest);
      w.createPlayer(cls, { startingCompanions: false, kit }); full(w);
      for (const [i, id] of kit.entries()) if (id) assert.equal(w.player.skills[i]?.def.id, id, cls.id);
      assert.equal(w.meta.knownSkills.size, new Set(kit.filter(Boolean)).size + flasks.length);
    }
  }
});
check('Malformed, missing and out-of-range memory degrade safely; full bars leave recoverable gifts', () => {
  assert.deepEqual(restoreSkillSlotMemory({ life_flask: 0, bad: -1, frac: 1.5, text: '6', nil: null, infinite: Infinity }), { life_flask: 0 });
  assert.deepEqual(restoreSkillSlotMemory([]), {});
  const old = serializeAccount(makeAccount()); delete old.skillSlotMemory;
  assert.deepEqual(deserializeAccount(old)!.skillSlotMemory, {});
  const w = veteran({ life_flask: BAR_SLOTS, mana_flask: -1 }); full(w);
  assert.equal(slotOf(w, 'life_flask'), CLASSES[0].bar.indexOf(null));
  const kit = Array.from({ length: BAR_SLOTS }, (_, i) => CLASSES[0].bar[i % 3]);
  const crowded = veteran({}, kit);
  assert.deepEqual(crowded.player.skills.map(s => s?.def.id ?? null), kit);
  assert.equal(crowded.ledger[LEDGER_FLASK_LESSON], undefined);
  assert.ok(flasks.every(id => crowded.meta.items.some(i => i.gem?.kind === 'skill' && i.gem.skillId === id)));
  crowded.bindSkill(BAR_SLOTS - 1, null); crowded.bindSkill(BAR_SLOTS - 2, null);
  crowded.dealVeteranFlasks(); full(crowded);
  assert.equal(crowded.ledger[LEDGER_FLASK_LESSON], 1);
});
check('Resume seeds old bars without overwriting newer preferences; fresh guests reuse but cannot rewrite owner memory', () => {
  const w = veteran({ life_flask: BAR_SLOTS - 2, mana_flask: BAR_SLOTS - 1 });
  const save = serializeCharacter(w); w.account.skillSlotMemory = {};
  const restored = new World(w.account, fixture.manifest);
  restored.createPlayer(CLASSES[0], { startingCompanions: false, startingFlasks: false });
  assert.ok(applySavedCharacter(restored, save));
  assert.deepEqual(w.account.skillSlotMemory, { life_flask: BAR_SLOTS - 2, mana_flask: BAR_SLOTS - 1 });
  w.account.skillSlotMemory.life_flask = 0;
  assert.ok(applySavedCharacter(restored, save));
  assert.equal(w.account.skillSlotMemory.life_flask, 0);
  const before = { ...w.account.skillSlotMemory };
  const guest = restored.addSeat('memory-guest', CLASSES[0], new NullInput(), { startingCompanions: false }); full(restored, guest);
  assert.equal(guest.actor.skills[BAR_SLOTS - 1]?.def.id, 'mana_flask');
  assert.ok(restored.swapSkillSlots(BAR_SLOTS - 1, BAR_SLOTS - 2, guest));
  assert.deepEqual(w.account.skillSlotMemory, before);
});
check('Slot-memory policy follows tags and the planner accepts arbitrary skill IDs and bar lengths', () => {
  assert.deepEqual([...planSkillSlots(['mod_flask', 'other_flask'], ['starter', null, null], { mod_flask: 2 })],
    [['mod_flask', 2], ['other_flask', 1]]);
  const w = veteran(), before = { ...w.account.skillSlotMemory }, tags = SKILL_SLOT_MEMORY_CFG.tags;
  try {
    SKILL_SLOT_MEMORY_CFG.tags = [];
    w.bindSkill(BAR_SLOTS - 1, 'life_flask');
    assert.deepEqual(w.account.skillSlotMemory, before);
  } finally { SKILL_SLOT_MEMORY_CFG.tags = tags; }
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
  const dx = w.arena.w / 2 - exit.pos.x, dy = w.arena.h / 2 - exit.pos.y, length = Math.hypot(dx, dy);
  const point = (d: number) => ({ x: exit.pos.x + dx / length * d, y: exit.pos.y + dy / length * d });
  w.player.pos = point(400); w.npcSpeechView();
  w.player.pos = point(120);
  assert.ok(w.lineOfSight(w.player.pos, exit.pos, 0, 0));
  w.publishViewFrame(w.player.pos.x - 10, w.player.pos.y - 10, 20, 20);
  assert.equal(w.npcDialogues.callout(true), null, 'off-screen exits stay quiet');
  assert.equal(w.ledger[npcDialogueReceipt('mireille_road_welcome')], undefined);
  w.viewFrame = null;
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
check('West road stays quiet behind the cellar and along the waking-house departure', () => {
  const w = makeSimWorld('warrior', 3344);
  w.zoneMap[START_ZONE].exits = [{ to: HUB_ZONE, side: 'w' }];
  w.loadZone(START_ZONE);
  const exit = w.exits.find(e => e.to === HUB_ZONE)!;
  for (const pos of [{ x: 225, y: 290 }, { x: 300, y: 290 }, { x: 220, y: 400 }]) {
    w.player.pos = pos;
    assert.equal(w.npcDialogues.callout(true), null, 'no interruption en route to the inn or through a wall');
  }
  assert.ok(Math.hypot(w.player.pos.x - exit.pos.x, w.player.pos.y - exit.pos.y) < 300);
  assert.equal(w.lineOfSight(w.player.pos, exit.pos, 0, 0), false, 'real cellar wall hides the nearby road');
  assert.equal(w.ledger[npcDialogueReceipt('mireille_road_welcome')], undefined);
  w.player.pos = { x: exit.pos.x + 100, y: exit.pos.y };
  assert.ok(w.lineOfSight(w.player.pos, exit.pos, 0, 0));
  assert.equal(w.npcDialogues.callout(true)?.a.defId, 'townsfolk_innkeep', 'hidden-to-visible approach arms inside the radius');
});
console.log(`TOWN WELCOME: ${passed} passed`);
