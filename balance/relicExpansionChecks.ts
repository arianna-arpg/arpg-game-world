import assert from 'node:assert/strict';
import { makeSimWorld } from '../src/sim/arena';
import { mulberry32, seedGlobalRandom } from '../src/sim/rng';
import { RELIQUARY } from '../src/data/containers';
import { UNIQUES } from '../src/data/uniques';
import { RELIC_PATH_UNIQUES, RELIC_PATH_PROCS, MANY_NAMES_CHOICES } from '../src/data/uniques/relicPaths';
import { MINION_FAMILIES } from '../src/data/minionFamilies';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { PROC_LIST, procPowerStat, procStat } from '../src/data/procs';
import { containerBoard, containerLanding, containerMisfits } from '../src/engine/containers';
import { uniqueContainerRefusal } from '../src/engine/itemLimits';
import { compileItemMods, describeItem, forgeItem, rebuildItem, rollItem } from '../src/engine/itemgen';
import { empowerRelicMods, relicNumeric } from '../src/engine/relicPower';
import { instanceChargeCost, instanceDelivery, instanceMods, makeSkillInstance, skillContextTags } from '../src/engine/skills';
import { summonCapacity } from '../src/engine/summonContracts';
import { autoPlace } from '../src/engine/inventory';
import { mod } from '../src/engine/stats';
import { skillDamageBands } from '../src/engine/damage';
import { deserializeAccount, serializeAccount } from '../src/meta/account';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';
import { applySeatMeta, serializeSeatMeta } from '../src/net/snapshot';
import type { World } from '../src/engine/world';
import type { ItemInstance } from '../src/engine/items';

const near = (a: number, b: number) => assert(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
const makeRelic = (id: string, quality = 1) => forgeItem({ uniqueId: id, ilvl: 80, quality, rng: mulberry32(431) })!;
function rig(seed = 3181): World {
  const w = makeSimWorld('warrior', seed);
  for (const rung of RELIQUARY.ladder) w.account.features.add(rung.feature);
  w.account.features.add('oracle_stone'); w.account.ledger.oracle_rescued = 1;
  w.loadZone('lastlight'); w.player.pos = { ...w.stationAnchor('oracle')!.pos };
  w.lastCombatAt = -999;
  for (const key of ['strength', 'dexterity', 'intelligence', 'willpower'] as const) w.meta.baseAttrs[key] = 100;
  w.recalcPlayer(); return w;
}
function seat(w: World, item: ItemInstance, x?: number, y?: number): void {
  if (!w.meta.items.includes(item) && !item.relicKey) assert(autoPlace(w.meta.items, item));
  w.containerPlace(w.localSeat, 'reliquary', item.uid, x, y);
}
const step = (w: World, seconds: number) => { for (let i = 0; i < seconds * 60; i++) w.update(1 / 60); };

export function checkRelicExpansion(): void {
  const restoreRng = seedGlobalRandom(3181);
  try {
    for (const def of RELIC_PATH_UNIQUES) {
      const item = makeRelic(def.id), mods = compileItemMods(item);
      assert.equal(UNIQUES[def.id].maxPerContainer, 1);
      assert(!/NaN|undefined|\{v/.test(JSON.stringify(describeItem(item))), def.id);
      assert(describeItem(item).unique.includes('Limited to 1 equipped copy.'));
      assert.deepEqual(compileItemMods(rebuildItem(JSON.parse(JSON.stringify(item)))!), mods);
      const powered = empowerRelicMods(mods, 50, 2);
      for (let i = 0; i < mods.length; i++) {
        if (!relicNumeric(mods[i])) near(powered[i].value, mods[i].value);
        else assert(powered[i].value >= mods[i].value && Number.isFinite(powered[i].value));
      }
    }
    for (const ilvl of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 23, 24]) {
      const rng = mulberry32(ilvl);
      for (let i = 0; i < 80; i++) {
        const item = rollItem({ ilvl, category: 'relic', rarity: 'unique', rng })!;
        assert(item.uniqueId && UNIQUES[item.uniqueId].minIlvl! <= ilvl);
      }
    }
    console.log('PASS expanded relic discovery, readable limits, persisted rolls and fixed structural bonuses');

    // First-fit, exact landing, replacement, identity, override and restoration.
    {
      const w = rig(), first = makeRelic('sunderstone'), second = makeRelic('sunderstone', 0.2);
      second.name = 'A differently named saved instance';
      second.uniqueChoices = { sundered: { id: 'cold', rolls: [0.2, 0.2, 0.2] } };
      seat(w, first, 0, 0); assert(autoPlace(w.meta.items, second));
      const before = JSON.stringify(serializeAccount(w.account));
      seat(w, second); seat(w, second, 4, 4);
      assert.equal(JSON.stringify(serializeAccount(w.account)), before);
      assert(w.meta.items.includes(second));
      const held = w.meta.containers.reliquary;
      assert.equal(containerLanding(RELIQUARY, containerBoard(RELIQUARY), held, second, 'bag', 4, 4, 1).verdict, 'blocked');
      assert.equal(containerLanding(RELIQUARY, containerBoard(RELIQUARY), held, second, 'bag', 0, 0, 1).verdict, 'swap');
      seat(w, second, 0, 0);
      assert.deepEqual(w.meta.containers.reliquary, [second]); assert(w.meta.items.includes(first));
      w.containerMove(w.localSeat, 'reliquary', second.uid, 4, 4);
      assert.equal(second.x, 4); assert.equal(second.y, 4);
      const def = UNIQUES.sunderstone, oldLimit = def.maxPerContainer;
      try {
        def.maxPerContainer = 2; seat(w, first, 0, 0);
        assert.equal(w.meta.containers.reliquary.length, 2);
        def.maxPerContainer = 0;
        assert(uniqueContainerRefusal([], first));
      } finally { def.maxPerContainer = oldLimit; }
      assert.equal(containerMisfits(containerBoard(RELIQUARY), w.meta.containers.reliquary).length, 1);
      const itemsBefore = w.account.reliquary.items.map(i => [i.relicKey, i.uniqueChoices]);
      w.restoreAccountRelics(w.localSeat); w.recalcPlayer();
      assert.equal(w.meta.containers.reliquary.length, 1);
      assert.equal(w.account.reliquary.items.length, 2);
      assert.deepEqual(w.account.reliquary.items.map(i => [i.relicKey, i.uniqueChoices]), itemsBefore);
      const reserve = w.account.reliquary.items.find(i => !w.account.reliquary.seated.includes(i.relicKey!))!;
      assert(reserve && !w.account.reliquary.carried.includes(reserve.relicKey!));
      assert(w.account.reliquary.stash.cells[reserve.relicKey!]);
      // An Oracle first-fit equip cannot bypass the same limit from storage.
      const repaired = JSON.stringify(serializeAccount(w.account));
      w.oracleRelic(w.localSeat, reserve.uid, 'equip');
      assert.equal(JSON.stringify(serializeAccount(w.account)), repaired);
      const active = w.meta.containers.reliquary[0];
      seat(w, reserve, active.x, active.y);
      assert.equal(w.meta.containers.reliquary[0], reserve, 'reserve replacement is legal');
      assert.equal(w.account.reliquary.items.length, 2);
      const back = rig(3182);
      Object.assign(back.account, deserializeAccount(serializeAccount(w.account))!);
      assert(applySavedCharacter(back, serializeCharacter(w)));
      assert.equal(back.meta.containers.reliquary.length, 1);
      assert.equal(back.account.reliquary.items.length, 2);
      assert.deepEqual(back.meta.containers.reliquary[0].uniqueChoices, reserve.uniqueChoices);
      const client = rig(3183); client.clientActionHook = () => {};
      applySeatMeta(client, client.localSeat, serializeSeatMeta(w.localSeat));
      assert.deepEqual(client.meta.containers.reliquary[0].uniqueChoices, reserve.uniqueChoices);
      near(client.player.sheet.get('coldPen'), w.player.sheet.get('coldPen'));
    }
    console.log('PASS unique identity limits, unchanged refusals, moves, bag/stash swaps, overrides, safe repair and save/wire');

    // The registry defines families. Verify EVERY rolled family against all
    // catalog summon/throng skills, including mixed pools and nonmembers.
    {
      const w = rig(3184), p = w.player;
      const summonDefs = Object.values(SKILLS).filter(d => d.delivery.type === 'summon' || d.throng);
      for (const option of MANY_NAMES_CHOICES[0].options) {
        const item = makeRelic('idol_of_many_names');
        item.uniqueChoices = { summon_family: { id: option.id, rolls: [1] } };
        const family = new Set<string>(MINION_FAMILIES[option.id as keyof typeof MINION_FAMILIES]);
        let affected = 0, unaffected = 0;
        for (const def of summonDefs) {
          const inst = makeSkillInstance(def, 1), d = instanceDelivery(inst);
          const bodies = d.type === 'summon' ? d.pool?.map(row => row.id) ?? [d.monsterId!]
            : [def.throng!.monsterId];
          const matches = bodies.length > 0 && bodies.every(id => family.has(id));
          const capacity = () => d.type === 'summon' ? summonCapacity(p, inst, d) : w.throngCapOf(p, inst);
          const bare = capacity();
          p.sheet.setSource('probe:family', empowerRelicMods(compileItemMods(item), 1000));
          assert.equal(capacity(), bare + (matches ? 1 : 0), `${option.id}/${def.id}`);
          p.sheet.removeSource('probe:family');
          matches ? affected++ : unaffected++;
        }
        assert(affected > 0 && unaffected > 0, option.id);
        assert.deepEqual(rebuildItem(JSON.parse(JSON.stringify(item)))!.uniqueChoices, item.uniqueChoices);
      }
      const idol = makeRelic('idol_of_many_names');
      idol.uniqueChoices = { summon_family: { id: 'golem', rolls: [1] } };
      seat(w, idol);
      const golem = makeSkillInstance(SKILLS.summon_stone_golem, 1);
      w.meta.knownSkills.set(golem.def.id, golem); p.skills[0] = golem;
      w.recalcPlayer(); p.fillResources();
      assert(w.useSkill(p, golem, p.pos)); step(w, 12);
      assert.equal(w.minionsOfSkill(p, golem.def.id).length, 2, 'extra capacity creates a second paid golem');
      near(p.reservedMana, 70);
      const other = makeRelic('idol_of_many_names');
      other.uniqueChoices = { summon_family: { id: 'skeleton', rolls: [1] } };
      w.lastCombatAt = -999; seat(w, other);
      assert(w.meta.items.includes(other), 'different rolled families still share one unique limit');
      w.containerTake(w.localSeat, 'reliquary', idol.uid);
      const d = instanceDelivery(golem); assert(d.type === 'summon');
      assert.equal(summonCapacity(p, golem, d), 1);
      step(w, 0.1);
      assert.equal(w.minionsOfSkill(p, golem.def.id).length, 1);
      near(p.reservedMana, 35);
    }
    console.log('PASS all rolled summon families scope correctly, retain identity, pay for real bodies and never scale capacity with empowerment');

    // Actual registered proc effects and their shared cooldown/removal seams.
    for (const proc of RELIC_PATH_PROCS) {
      assert.equal(PROC_LIST.filter(p => p.id === proc.id).length, 1);
      const def = RELIC_PATH_UNIQUES.find(u => u.lines.some(l => l.stat === procStat(proc.id)))!;
      const w = rig(3185), p = w.player, item = makeRelic(def.id); seat(w, item);
      p.sheet.setSource('probe:poise', [mod('poise', 'flat', 100)]);
      p.poise = 1; p.mana = 0; p.ward = 0;
      const inst = makeSkillInstance(SKILLS.dash, 1);
      const read = () => proc.trigger === 'block' ? p.poise : proc.trigger === 'minionDeath' ? p.mana : p.ward;
      const fire = () => w.rollOwnProcs(p, proc.trigger, { inst });
      const before = read();
      for (let i = 0; i < 20; i++) fire();
      const after = read(); assert(after > before, proc.id);
      for (let i = 0; i < 20; i++) fire();
      near(read(), after);
      assert(p.sheet.getSourceMods('container:reliquary')?.some(m => m.stat === procStat(proc.id)));
      const power = p.sheet.get(procPowerStat(proc.id));
      w.account.reliquary.rank = 50; w.recalcPlayer();
      near(p.sheet.get(procPowerStat(proc.id)) - 1, (power - 1) * 2);
      w.containerTake(w.localSeat, 'reliquary', item.uid);
      near(p.sheet.get(procStat(proc.id)), 0);
      step(w, 7); const removed = read();
      for (let i = 0; i < 20; i++) fire();
      near(read(), removed);
    }
    console.log('PASS relic procs restore real resources, share cooldowns, attribute power and stop on removal');

    // Prepare a paid flask at full life, then test the independent overmend
    // stream on the real actor. These relics compose without new effect code.
    {
      const w = rig(3186), p = w.player;
      seat(w, makeRelic('last_drop')); seat(w, makeRelic('wellspring_seal'));
      const flask = makeSkillInstance(SKILLS.life_flask, 1);
      w.meta.knownSkills.set(flask.def.id, flask); p.skills[0] = flask;
      w.recalcPlayer(); p.fillResources();
      const charge = instanceChargeCost(flask)!; p.charges.set(charge.charge, 3);
      assert(w.useSkill(p, flask, p.pos));
      assert.equal(p.primedPours.length, 1); assert.equal(p.charges.get(charge.charge), 2);
      p.absorb = 0;
      p.restoreStreams.push({ resource: 'life', remaining: 10, perSec: 10 });
      step(w, 1);
      assert(p.absorb > 0 && p.absorb <= p.maxLife() * 0.5);
      // Scoped counts do not leak to other skill types.
      const needle = makeRelic('needle_eye'); seat(w, needle); p.sheet.setConditions(['notHurtRecently']);
      near(p.sheet.get('pierceCount', new Set(['projectile'])), 1);
      near(p.sheet.get('pierceCount', new Set(['melee'])), 0);
      p.sheet.setConditions([]); near(p.sheet.get('pierceCount', new Set(['projectile'])), 0);
      for (const option of ['totem', 'trap', 'mine'] as const) {
        const key = makeRelic('architects_keystone');
        key.uniqueChoices = { construction: { id: option, rolls: [1] } };
        p.sheet.setSource('probe:construct', compileItemMods(key));
        for (const tag of ['totem', 'trap', 'mine'] as const)
          near(p.sheet.get('constructMaxCount', new Set([tag])), tag === option ? 1 : 0);
        near(p.sheet.get('minionMaxCount'), 0); p.sheet.removeSource('probe:construct');
      }
    }
    console.log('PASS paid primed flasks, capped overmend shields, conditional pierces and isolated construct families');

    {
      const w = rig(3187), p = w.player;
      const strike = makeSkillInstance(SKILLS.whirlwind, 1), spell = makeSkillInstance(SKILLS.firebolt, 1);
      const bareStrike = skillDamageBands(p, strike).total.lo, bareSpell = skillDamageBands(p, spell).total.lo;
      const bareDamage = p.sheet.get('damage', skillContextTags(strike), instanceMods(strike));
      seat(w, makeRelic('thorn_testament'));
      assert(skillDamageBands(p, strike).total.lo > bareStrike);
      near(skillDamageBands(p, spell).total.lo, bareSpell);
      w.devNoclip = true; // Isolate movement speed from the Oracle's standing stones.
      const start = { ...p.pos };
      assert(w.useSkill(p, strike, start)); assert.equal(p.casting?.mode, 'channel');
      w.moveActor(p, 1, 0, 0.02); const bareMove = p.pos.x - start.x;
      assert(bareMove > 0); p.pos = { ...start }; p.casting = null; p.useLock = 0;
      const spindle = makeRelic('pilgrim_spindle'); seat(w, spindle);
      assert(w.meta.containers.reliquary.includes(spindle));
      assert(w.useSkill(p, strike, start)); w.moveActor(p, 1, 0, 0.02);
      assert(p.pos.x - start.x > bareMove, 'channel mobility changes actual movement');
      p.casting = null; p.pos = { ...start }; p.useLock = 0;
      seat(w, makeRelic('venom_ledger'));
      near(p.sheet.get('ailmentStacks', new Set(['chaos'])), 1);
      near(p.sheet.get('ailmentStacks', new Set(['physical'])), 0);
      assert(p.sheet.get('statusMagnitude', new Set(['chaos'])) > 1);
      near(p.sheet.get('statusMagnitude', new Set(['physical'])), 1);
      assert(p.sheet.get('damage', skillContextTags(strike), instanceMods(strike)) > bareDamage);
      near(skillDamageBands(p, spell).total.lo, bareSpell);
    }
    // Fleeting Devotion pays to burn an aura instead of reserving mana. The
    // choir opens a real third slot; the fourth still replaces the oldest.
    {
      const w = rig(3188), p = w.player;
      seat(w, makeRelic('hollow_choir'));
      const ids = ['devotion', 'righteous_fire', 'unholy_aura', 'wellspring_stance'];
      for (const [slot, id] of ids.entries()) {
        const inst = makeSkillInstance(SKILLS[id], 1, 1);
        inst.sockets[0] = { def: SUPPORTS.fleeting_devotion, level: 1 };
        w.meta.knownSkills.set(id, inst); p.skills[slot] = inst;
        p.fillResources(); assert(w.useSkill(p, inst, p.pos)); step(w, 0.8);
        assert.equal(p.activeAuras.size, Math.min(slot + 1, 3));
      }
      assert(!p.activeAuras.has('devotion') && p.activeAuras.has('wellspring_stance'));
      assert([...p.activeAuras.values()].every(a => Number.isFinite(a.remaining)));
    }
    console.log('PASS melee Thorns, real channel movement, isolated Chaos stacks and timed aura slot replacement');
  } finally { restoreRng(); }
}
