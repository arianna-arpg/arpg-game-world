// Uniques are executable build rules: real hits/casts, ownership and bounded economies.
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import { mod } from '../src/engine/stats';
import { effectiveSkillLevel, makeSkillInstance, skillContextTags, type SkillInstance } from '../src/engine/skills';
import { summonReservationUnit } from '../src/engine/companionGrants';
import { packGrantState } from '../src/engine/gemitems';
import { forgeItem, compileItemMods, describeItem, rebuildItem, isKnownItemStat } from '../src/engine/itemgen';
import { uniqueDefinitionLines } from '../src/engine/itemchoices';
import { setSimTap } from '../src/engine/tap';
import { applySavedCharacter, serializeCharacter } from '../src/meta/character';
import { ITEM_BASES } from '../src/data/itembases';
import { UNIQUE_LIST } from '../src/data/uniques';
import { ACCORD_UNIQUES, ACCORD_PROCS, CINDER_CONDUCTOR, BREACH_BELL, UNSPENT_REPLY } from '../src/data/uniques/accords';
import { PROC_LIST, procPowerStat, procStat } from '../src/data/procs';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';

let failed = 0;
const check = (name: string, ok: boolean): void => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; };
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;
const step = (w: World, seconds: number): void => { for (let i = 0; i < Math.ceil(seconds * 60); i++) w.update(1 / 60); };
const rig = (seed = 0xac01): World => { const w = makeSimWorld('warrior', seed); seedGlobalRandom(seed); return w; };
const equip = (w: World, id: string) => {
  const item = forgeItem({ uniqueId: id, ilvl: 20, quality: 0.5 })!;
  const cat = ITEM_BASES[item.baseId].category;
  w.localSeat.meta.equipped[cat === 'ring' ? 'ring1' : cat] = item;
  w.recalcSeat(w.localSeat);
  return item;
};
const body = (w: World, owner?: Actor): Actor => {
  const a = w.createMonster('zombie', 5, owner ? owner.team : 'enemy', owner);
  a.brain = undefined; a.pos = { x: w.player.pos.x + 50, y: w.player.pos.y };
  a.sheet.setSource('fixture', [mod('life', 'flat', 1e6), mod('evasion', 'override', 0), mod('armor', 'override', 0)]);
  a.fillResources(); w.actors.push(a); return a;
};
const hit = (w: World, caster: Actor, inst: SkillInstance, target: Actor): void => {
  (w as unknown as { resolveHit(c: Actor, i: SkillInstance, t: Actor): void }).resolveHit(caster, inst, target);
};

bootSimEngine();
for (const def of ACCORD_UNIQUES) {
  check(`${def.id}: one droppable definition with known stats`, UNIQUE_LIST.filter(u => u.id === def.id).length === 1
    && ITEM_BASES[def.baseId].dropWeight > 0 && def.weight > 0 && uniqueDefinitionLines(def).every(l => isKnownItemStat(l.stat)));
  for (const ilvl of [def.minIlvl!, 40, 100]) {
    const item = forgeItem({ uniqueId: def.id, ilvl, quality: 0.75 })!, mods = compileItemMods(item);
    check(`${def.id}@${ilvl}: finite rolls, bounded chances, readable and persistent`,
      mods.every(m => Number.isFinite(m.value))
      && mods.filter(m => m.stat.startsWith('proc_')).every(m => m.value > 0 && m.value <= 0.95)
      && !/NaN|undefined|\{v/.test(JSON.stringify(describeItem(item)))
      && JSON.stringify(compileItemMods(rebuildItem(JSON.parse(JSON.stringify(item)))!)) === JSON.stringify(mods));
  }
}
check('new procs are registered once', ACCORD_PROCS.every(p => PROC_LIST.filter(q => q.id === p.id).length === 1));

// Census every current skill-granting unique, including future additions to the catalog.
for (const unique of UNIQUE_LIST) {
  const grants = uniqueDefinitionLines(unique).filter(l => l.stat.startsWith('skillgrant_'));
  for (const line of grants) {
    const id = line.stat.slice('skillgrant_'.length), w = rig(), p = w.player, seat = w.localSeat;
    const inst = makeSkillInstance(SKILLS[id], 12, 2);
    seat.meta.knownSkills.set(id, inst); p.skills[0] = inst;
    for (let i = 1; i < p.skills.length; i++) p.skills[i] ??= makeSkillInstance(SKILLS.cleave, 1);
    w.recalcSeat(seat);
    const base = effectiveSkillLevel(inst), bar = [...p.skills];
    equip(w, unique.id);
    const level = seat.grantedInsts!.get(id)!.level;
    check(`${unique.id}/${id}: full bar and learned investment preserved; additive levels`,
      bar.every((s, i) => s === p.skills[i]) && inst.level === 12 && effectiveSkillLevel(inst) === base + level);
    w.recalcSeat(seat);
    check(`${unique.id}/${id}: repeated derivation does not compound`, effectiveSkillLevel(inst) === base + level);
    seat.meta.equipped = {}; w.recalcSeat(seat);
    check(`${unique.id}/${id}: removal leaves the player's skill intact`, p.skills[0] === inst && effectiveSkillLevel(inst) === base);
  }
}

// A grant's sockets belong to its item, including when another grant remains equipped.
{
  const w = rig(), seat = w.localSeat, p = w.player;
  const first = equip(w, 'emberbrand');
  const a = seat.grantedInsts!.get('firebolt')!;
  a.sockets[0] = { def: SUPPORTS.splitting, level: 2 }; w.recalcSeat(seat);
  w.bindSkill(0, 'firebolt');
  const second = forgeItem({ uniqueId: 'emberbrand', ilvl: 20 })!;
  const prepared = makeSkillInstance(SKILLS.firebolt, 1, 2);
  prepared.sockets[0] = { def: SUPPORTS.splitting, level: 4 };
  second.grantState = { firebolt: packGrantState(prepared) };
  seat.meta.equipped.ring2 = second; w.recalcSeat(seat);
  check('grant host: adding a second item preserves both investments', seat.grantedInsts!.get('firebolt') === a
    && second.grantState.firebolt.sockets[0]?.level === 4);
  delete seat.meta.equipped.ring1; w.recalcSeat(seat);
  const b = seat.grantedInsts!.get('firebolt')!;
  check('grant host: departure restores the remaining item, without duplication or bar loss', b !== a
    && b.grantedHostUid === second.uid && b.sockets[0]?.level === 4 && p.skills[0] === b
    && first.grantState!.firebolt.sockets[0]?.level === 2);
  seat.meta.equipped.ring1 = first; w.recalcSeat(seat);
  check('grant host: returning item restores its own stones', seat.grantedInsts!.get('firebolt')!.sockets[0]?.level === 2
    && second.grantState.firebolt.sockets[0]?.level === 4);
}

// Cinder Conductor: autonomous follower + shared owner/minion fuel, not an army multiplier.
{
  const w = rig(0xac02), p = w.player;
  equip(w, 'cinder_conductor'); step(w, 0.02);
  const pet = w.actors.find(a => !a.dead && a.owner === p && a.summonInst?.companionGrant)!;
  pet.brain = undefined;
  check('Conductor: independent Fire Golem and no automatic skill seat', pet.defId === 'fire_golem'
    && p.reservedMana === 0 && !p.skills.some(s => s?.def.id === 'summon_fire_golem'));
  const radius = pet.radius, max = pet.maxLife(); pet.life = max * 0.4;
  p.sheet.setSource('owner-investment', [mod('minionLife', 'increased', 0.5), mod('minionDamage', 'increased', 0.5), mod('minionSize', 'increased', 0.2)]);
  w.recalcSeat(w.localSeat);
  check('companion stats: ordinary build changes refresh without healing', pet.maxLife() > max
    && near(pet.life / pet.maxLife(), 0.4) && pet.radius > radius);
  const grownRadius = pet.radius; w.recalcSeat(w.localSeat);
  check('companion stats: repeated refresh never compounds size', near(pet.radius, grownRadius));
  p.level += 2; w.recalcSeat(w.localSeat);
  check('companion stats: follows keeper level while preserving wounds', pet.level === p.level && near(pet.life / pet.maxLife(), 0.4));
  const manualFire = makeSkillInstance(SKILLS.summon_fire_golem, 1), manualIce = makeSkillInstance(SKILLS.summon_ice_golem, 1);
  p.skills[0] = manualFire; p.skills[1] = manualIce; p.mana = p.maxMana();
  const lit = w.useSkill(p, manualFire, p.pos); step(w, 1.2);
  p.mana = p.maxMana(); p.useLock = 0;
  const iced = w.useSkill(p, manualIce, p.pos); step(w, 1.2);
  check('Conductor: shared-pool manual golems can switch without replacing the independent follower', lit && iced
    && !pet.dead && w.minionsOfGroup(p, 'golem').length === 1
    && w.minionsOfGroup(p, 'golem')[0].defId === 'ice_golem' && p.reservedMana > 0);
  for (const a of w.actors) if (a.owner === p) a.brain = undefined;
  const target = body(w), fire = makeSkillInstance(SKILLS.firebolt, 1), physical = makeSkillInstance(SKILLS.cleave, 1);
  p.mana = 0;
  for (let i = 0; i < 12; i++) hit(w, pet, physical, target);
  check('Conductor: physical minion hits cannot fuel the wearer', p.mana === 0);
  for (let i = 0; i < 30 && p.mana === 0; i++) hit(w, pet, fire, target);
  const expected = CINDER_CONDUCTOR.effect.pctMax * p.maxMana() * p.sheet.get(procPowerStat(CINDER_CONDUCTOR.id));
  check('Conductor: real minion fire hits restore exactly the owned amount', near(p.mana, expected));
  for (let i = 0; i < 12; i++) { hit(w, p, fire, target); hit(w, pet, fire, target); }
  check('Conductor: player and minions share one cooldown', near(p.mana, expected));
  step(w, 2.1); p.mana = 0;
  const stranger = body(w), strangerPet = body(w, stranger); strangerPet.summonInst = pet.summonInst;
  for (let i = 0; i < 12; i++) hit(w, strangerPet, fire, target);
  check('Conductor: another owner pays no mana to this wearer', p.mana === 0);
  for (let i = 0; i < 30 && p.mana === 0; i++) hit(w, p, fire, target);
  check('Conductor: wearer fire hits also qualify', near(p.mana, expected));
  const saved = serializeCharacter(w), loaded = rig(0xac03);
  check('Conductor: save adopts', applySavedCharacter(loaded, saved)); step(loaded, 0.02);
  check('Conductor: reload derives one follower', loaded.actors.filter(a => !a.dead && a.owner === loaded.player && a.summonInst?.companionGrant).length === 1);
  w.localSeat.meta.equipped = {}; w.recalcSeat(w.localSeat);
  check('Conductor: removal retires the follower and its fuel source', pet.dead && p.sheet.get(procStat(CINDER_CONDUCTOR.id)) === 0);
}

// The Bell listens to real poise breaks and uses the invested War Cry when equipped.
{
  const w = rig(0xac04), p = w.player;
  w.localSeat.meta.knownSkills.delete('war_cry');
  p.skills = p.skills.map(s => s?.def.id === 'war_cry' ? null : s);
  equip(w, 'bell_of_the_breach');
  const grant = w.localSeat.grantedInsts!.get('war_cry')!;
  const casts: SkillInstance[] = [];
  setSimTap({ onCast: (caster, inst) => { if (caster === p && inst.def.id === 'war_cry') casts.push(inst); } });
  const blow = makeSkillInstance(SKILLS.cleave, 1), target = body(w);
  target.sheet.setBase('poise', 100);
  for (let i = 0; i < 30 && !casts.length; i++) { target.poise = 0.1; target.poiseBroken = false; hit(w, p, blow, target); }
  check('Breach Bell: breaking real poise triggers the unseated granted cry', casts.length === 1 && casts[0] === grant && p.buffs.has('war_cry'));
  for (let i = 0; i < 12; i++) w.rollOwnProcs(p, 'poiseBreakDealt', { inst: blow, target });
  check('Breach Bell: simultaneous breaks share its eight-second cooldown', casts.length === 1);
  step(w, BREACH_BELL.icd + 0.1);
  for (let i = 0; i < 12; i++) w.rollOwnProcs(p, 'hit', { inst: blow, target });
  check('Breach Bell: ordinary hits are not poise breaks', casts.length === 1);
  const learned = makeSkillInstance(SKILLS.war_cry, 10, 2);
  learned.sockets[0] = { def: SUPPORTS.commanding_presence, level: 2 };
  w.localSeat.meta.knownSkills.set('war_cry', learned); p.skills[0] = learned; w.recalcSeat(w.localSeat);
  for (let i = 0; i < 30 && casts.length === 1; i++) w.rollOwnProcs(p, 'poiseBreakDealt', { inst: blow, target });
  check('Breach Bell: equipped learned cry keeps its support and gains levels', casts[1] === learned
    && learned.sockets[0]?.level === 2 && effectiveSkillLevel(learned) >= 10 + grant.level
    && p.buffs.get('war_cry')!.remaining > 6);
  setSimTap(null);
}

// Block preparation discounts only mana actually spent, never life or standing reserves.
{
  const w = rig(0xac05), p = w.player;
  equip(w, 'unspent_reply');
  p.sheet.setSource('fixture', [mod('life', 'flat', 1e6), mod('blockChance', 'flat', 1), mod('evasion', 'override', 0)]);
  p.fillResources();
  const enemy = body(w), blow = makeSkillInstance(SKILLS.cleave, 1);
  for (let i = 0; i < 100 && !p.buffs.has('unspent_reply'); i++) hit(w, enemy, blow, p);
  check('Unspent Reply: a real blocked blow prepares a spell', p.buffs.has('unspent_reply'));
  const nova = makeSkillInstance(SKILLS.frost_nova, 1), golem = makeSkillInstance(SKILLS.summon_stone_golem, 1);
  const d = golem.def.delivery;
  const reserve = d.type === 'summon' ? summonReservationUnit(p, golem, d) : 0;
  check('Unspent Reply: zero mana cost and expanded area, reservation still paid', p.skillCost(nova).mana === 0
    && p.sheet.get('aoeRadius', skillContextTags(nova)) >= 1.4 && reserve > 0);
  p.sheet.setSource('life-price', [mod('costToLife', 'flat', 1)]);
  check('Unspent Reply: converted life cost is not waived', p.skillCost(nova).life > 0 && p.skillCost(nova).mana === 0);
  p.sheet.removeSource('life-price');
  for (let i = 0; i < 12; i++) w.rollOwnProcs(p, 'block');
  check('Unspent Reply: repeated blocks cannot stockpile preparation', p.buffs.get('unspent_reply')?.stacks === 1);
  p.skills[0] = blow; p.mana = p.maxMana(); p.cooldowns.clear(); p.useLock = 0;
  w.useSkill(p, blow, { x: p.pos.x + 40, y: p.pos.y }); step(w, 1);
  check('Unspent Reply: attacks do not consume the prepared spell', p.buffs.has('unspent_reply'));
  p.skills[1] = nova; p.cooldowns.clear(); p.useLock = 0; p.mana = 0;
  const fringe = body(w); fringe.pos = { x: p.pos.x + 145, y: p.pos.y }; const lifeBefore = fringe.life;
  const pressed = w.useSkill(p, nova, p.pos); step(w, 1);
  check('Unspent Reply: real spell completes from empty mana and spends preparation', pressed && !p.buffs.has('unspent_reply') && p.skillCost(nova).mana > nova.def.manaCost && fringe.life < lifeBefore);
  step(w, 3.1);
  for (let i = 0; i < 30 && !p.buffs.has('unspent_reply'); i++) w.rollOwnProcs(p, 'block');
  step(w, UNSPENT_REPLY.effect.buff.duration + 0.1);
  check('Unspent Reply: unused preparation expires', !p.buffs.has('unspent_reply'));
  w.localSeat.meta.equipped = {}; w.recalcSeat(w.localSeat);
  for (let i = 0; i < 20; i++) w.rollOwnProcs(p, 'block');
  check('Unspent Reply: removal prevents further preparations', !p.buffs.has('unspent_reply'));
}

setSimTap(null);
console.log(`\nUnique accords: ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exitCode = failed ? 1 : 0;
