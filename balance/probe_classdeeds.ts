import { DeedTracker, deedKey } from '../src/engine/deeds';
import { CLASS_DEEDS, COMBAT_DEEDS, DEED_CFG } from '../src/data/classdeeds';
import { CLASS_BUNDLES, classUnlockFor, settleClassUnlocks } from '../src/meta/unlocks';
import { FEATURE, makeAccount, serializeAccount, deserializeAccount } from '../src/meta/account';
import { makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { applyHit } from '../src/engine/damage';
import { mod } from '../src/engine/stats';
import type { Actor } from '../src/engine/actor';

let failed = 0;
function check(name: string, ok: boolean) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed++; }
const elementPractice = COMBAT_DEEDS.find(r => r.id === 'elements_rehearsed')!.minOccurrences!;
const spellPractice = COMBAT_DEEDS.find(r => r.id === 'spells_refined')!.minOccurrences!;
const goal = (id: keyof typeof CLASS_DEEDS) => CLASS_DEEDS[id].objectives[0].n;
const get = (ledger: Record<string, number>, id: string) => ledger[deedKey(id)] ?? 0;
const tracker = new DeedTracker(COMBAT_DEEDS), ledger: Record<string, number> = {};
tracker.record(ledger, { kind: 'block', value: 120 });
tracker.record(ledger, { kind: 'block', value: 80 });
check('one event feeds independent count and damage facts', get(ledger, 'blocks') === 2 && get(ledger, 'blocked_damage') === 200);
tracker.record(ledger, { kind: 'hit', keys: ['fire', 'fire', 'cold'] });
tracker.record(ledger, { kind: 'hit', keys: ['fire'] });
const resumed = deserializeAccount(serializeAccount({ ...makeAccount(), ledger }))!;
new DeedTracker(COMBAT_DEEDS).record(resumed.ledger, { kind: 'hit', keys: ['cold', 'lightning'] });
check('distinct elements survive account save/load without double counting', get(resumed.ledger, 'elements_landed') === 3);
tracker.record(ledger, { kind: 'hit', tags: ['projectile'], distance: 159 });
tracker.record(ledger, { kind: 'hit', tags: ['projectile'], distance: 160 });
check('range boundary and independent projectile total', get(ledger, 'distant_projectile_hits') === 1 && get(ledger, 'projectile_hits') === 2);
const first = {}, second = {};
tracker.record(ledger, { kind: 'poise', subject: first, flags: ['surviving'] });
tracker.record(ledger, { kind: 'poise', subject: first, flags: ['surviving'] });
tracker.record(ledger, { kind: 'poise', subject: second, flags: ['surviving'] });
check('different enemies cannot add up to the deliberate Breaker deed', get(ledger, 'same_enemy_poise_breaks') === 2);
tracker.reset();
tracker.record(ledger, { kind: 'poise', subject: first, flags: ['surviving'] });
check('travel/death resets the encounter but preserves its lifetime best', get(ledger, 'same_enemy_poise_breaks') === 2);
tracker.hurt(100, 29, 100, DEED_CFG.crisisEnter);
check('low-life oscillation cannot award an unfinished crisis', !tracker.recovered(31, 100, DEED_CFG.crisisRecover));
check('reaching the recovery boundary completes one crisis', tracker.recovered(60, 100, DEED_CFG.crisisRecover));
check('the same recovery cannot count twice', !tracker.recovered(100, 100, DEED_CFG.crisisRecover));
tracker.hurt(100, 29, 100, DEED_CFG.crisisEnter);
check('lowering maximum life cannot fake recovery', !tracker.recovered(29, 40, DEED_CFG.crisisRecover));
tracker.reset();
tracker.hurt(100, 20, 100, DEED_CFG.crisisEnter);
tracker.hurt(20, 0, 100, DEED_CFG.crisisEnter);
check('a fatal crisis grants no survived damage or recovery', !tracker.recovered(100, 100, DEED_CFG.crisisRecover) && tracker.heal(100) === 0);
check('all class-discovery rows are gameplay deeds', CLASS_BUNDLES.every(b => b.unlock.objectives?.length && b.unlock.objectives.every(r => !!r.ledger && !r.classLevel)));
check('all class recipe avenues use registered counters', Object.values(CLASS_DEEDS).every(d => d.objectives.every(o => COMBAT_DEEDS.some(r => deedKey(r.id) === o.ledger))));

// Rehearsal survives reload midway through a key, without pretending old
// one-off sightings were twenty landed hits or six deliberate casts.
{
  const t = new DeedTracker(COMBAT_DEEDS), a = makeAccount();
  a.ledger[deedKey('elements_landed')] = 3;
  a.ledger[deedKey('spells_practiced')] = 8;
  check('old breadth counters cannot manufacture rehearsed progress', settleClassUnlocks(a).length === 0);
  for (let i = 0; i < elementPractice - 1; i++) t.record(a.ledger, { kind: 'hit', keys: ['fire', 'fire'] });
  check('one fewer than the required hits practices one element without prematurely qualifying it',
    get(a.ledger, 'elements_rehearsed') === 0 && a.ledger['deed:elements_rehearsed:seen:fire'] === elementPractice - 1);
  const loaded = deserializeAccount(serializeAccount(a))!, resumed = new DeedTracker(COMBAT_DEEDS);
  check('partial key progress reports dirty even before a completed step',
    resumed.record(loaded.ledger, { kind: 'cast', tags: ['spell'], keys: ['firebolt'] }));
  resumed.record(loaded.ledger, { kind: 'hit', keys: ['fire'] });
  for (let i = 0; i < elementPractice; i++) resumed.record(loaded.ledger, { kind: 'hit', keys: ['fire', 'cold', 'lightning'] });
  check('mixed hits qualify each element once after a partial save/load',
    get(loaded.ledger, 'elements_rehearsed') === 3 && loaded.ledger['deed:elements_rehearsed:seen:fire'] === elementPractice
    && settleClassUnlocks(loaded).some(u => u.id === 'class_sorcerer'));
  for (const skill of ['firebolt', 'frost_nova', 'chain_lightning', 'mend', 'ice_shield', 'ruin']) {
    for (let i = 0; i < spellPractice - 1; i++) resumed.record(loaded.ledger, { kind: 'cast', tags: ['spell'], keys: [skill, skill] });
  }
  check('equipping a repertoire alone does not earn Runeweaver',
    get(loaded.ledger, 'spells_refined') === 1 && !settleClassUnlocks(loaded).some(u => u.id === 'class_runeweaver'));
  for (const skill of ['frost_nova', 'chain_lightning', 'mend', 'ice_shield', 'ruin']) {
    resumed.record(loaded.ledger, { kind: 'cast', tags: ['spell'], keys: [skill] });
  }
  check('six rehearsed spells earn Runeweaver', settleClassUnlocks(loaded).some(u => u.id === 'class_runeweaver'));
}

// Responses are ordered, timed, consumable openings, never saved ammunition.
// Saved partial practice can now qualify without another hit/cast. Further
// events must not double-count the newly credited element or spell.
{
  const a = makeAccount();
  a.ledger['deed:elements_rehearsed:seen:fire'] = 120;
  a.ledger['deed:elements_rehearsed:seen:cold'] = 112;
  a.ledger['deed:spells_refined:seen:firebolt'] = 25;
  const b = deserializeAccount(serializeAccount(a))!;
  check('lower practice budgets credit eligible saved partial keys on load',
    get(b.ledger, 'elements_rehearsed') === 1 && get(b.ledger, 'spells_refined') === 1);
  const t = new DeedTracker(COMBAT_DEEDS);
  t.record(b.ledger, { kind: 'hit', keys: ['fire', 'cold'] });
  t.record(b.ledger, { kind: 'cast', tags: ['spell'], keys: ['firebolt'] });
  const c = deserializeAccount(serializeAccount(b))!;
  check('retuned partial keys neither strand nor double count after more play and reload',
    get(c.ledger, 'elements_rehearsed') === 2 && get(c.ledger, 'spells_refined') === 1);
}

// First discoveries follow town introductions; the same actions remain
// lifetime progress toward the middle and late branches.
{
  const a = makeAccount(), t = new DeedTracker(COMBAT_DEEDS);
  for (let i = 0; i < goal('spellblade'); i++) t.record(a.ledger, { kind: 'hit', tags: ['melee'], flags: ['lethal'] });
  for (let i = 0; i < goal('cryomancer') - 1; i++) t.record(a.ledger, { kind: 'hit', keys: ['cold'], flags: ['cold'] });
  t.record(a.ledger, { kind: 'heal', value: goal('apothecary') });
  check('early habits bank progress without eclipsing the town introductions', settleClassUnlocks(a).length === 0);
  a.features.add(FEATURE.BOUNTY_BOARD);
  check('the board alone does not skip the quartermaster introduction', settleClassUnlocks(a).length === 0);
  const loaded = deserializeAccount(serializeAccount(a))!;
  loaded.features.add(FEATURE.QUEST_GIVER);
  check('town foundation releases completed early deeds after reload',
    settleClassUnlocks(loaded).map(u => u.id).sort().join(',') === 'class_apothecary,class_spellblade');
  check('early classes preserve progress toward Berserker and Cleric without granting them',
    get(loaded.ledger, 'melee_finishes') === goal('spellblade') && get(loaded.ledger, 'mended_wounds') === goal('apothecary')
    && !loaded.unlockedClasses.has('berserker') && !loaded.unlockedClasses.has('cleric'));
  t.record(loaded.ledger, { kind: 'hit', keys: ['cold'], flags: ['cold'] });
  check('the last cold hit earns Cryomancer without completing the three-element school',
    settleClassUnlocks(loaded).some(u => u.id === 'class_cryomancer') && !loaded.unlockedClasses.has('sorcerer'));
  check('new discoveries grant their opening memories and matching supports',
    ['static_strike', 'frost_pulse', 'spore_bloom'].every(id => loaded.unlockedSkills.has(id))
    && ['static_charge', 'biting_cold', 'envenomed_tips'].every(id => loaded.unlockedSupports.has(id)));
  check('new discoveries settle only once and survive another load',
    settleClassUnlocks(deserializeAccount(serializeAccount(loaded))!).length === 0);
}

{
  const t = new DeedTracker(COMBAT_DEEDS), l: Record<string, number> = {};
  const melee = { kind: 'hit', tags: ['melee'] } as const;
  t.record(l, melee, 0);
  t.record(l, { kind: 'block' }, 1);
  t.record(l, { kind: 'hit', tags: ['projectile'] }, 2);
  t.record(l, melee, 4);
  t.record(l, melee, 4);
  check('only melee answers a block; exact deadline counts once even for a cleave', get(l, 'block_counters') === 1);
  t.record(l, { kind: 'block' }, 5);
  t.record(l, melee, 8.001);
  check('expired counter windows grant nothing', get(l, 'block_counters') === 1);
  t.record(l, { kind: 'evade' }, 10);
  t.record(l, { kind: 'evade' }, 11);
  t.record(l, melee, 14); t.record(l, melee, 14);
  check('successive evades refresh one opening instead of banking two', get(l, 'evade_counters') === 1);
  t.record(l, { kind: 'block' }, 15); t.reset(); t.record(l, melee, 16);
  t.record(l, { kind: 'evade' }, 17);
  new DeedTracker(COMBAT_DEEDS).record(l, melee, 18);
  check('reset and reload erase unfinished openings but retain completed counters', get(l, 'block_counters') === 1 && get(l, 'evade_counters') === 1);
  t.reset(); t.record(l, { kind: 'block' }); t.record(l, melee, 20);
  t.record(l, { kind: 'block' }, 22); t.record(l, melee, 21); t.record(l, melee);
  check('missing timestamps and a reversed clock cannot earn a counter', get(l, 'block_counters') === 1);
  const finish = { ...melee, flags: ['lethal'] };
  t.record(l, { kind: 'cast', tags: ['spell'] }, 30); t.record(l, finish, 31);
  check('ordinary spells cannot open a warcry finish', get(l, 'rallied_finishes') === 0);
  t.record(l, { kind: 'cast', tags: ['warcry'] }, 40);
  t.record(l, melee, 41);
  t.record(l, { kind: 'hit', tags: ['projectile'], flags: ['lethal'] }, 42);
  t.record(l, finish, 46); t.record(l, finish, 46);
  check('a warcry waits for one melee kill and allows the exact six-second deadline', get(l, 'rallied_finishes') === 1);
}

// Habit walks compare branching cadence without asserting a universal playtime.
{
  const a = makeAccount(), t = new DeedTracker(COMBAT_DEEDS);
  for (const element of ['fire', 'cold', 'lightning']) t.record(a.ledger, { kind: 'hit', keys: [element], flags: [element] });
  check('one starter elemental rotation no longer unlocks a class', settleClassUnlocks(a).length === 0);
  for (let i = 0; i < goal('pyromancer'); i++) t.record(a.ledger, { kind: 'hit', keys: ['fire'], flags: ['fire'] });
  settleClassUnlocks(a);
  check('a normal fire habit earns Pyromancer while the broader school stays unearned', a.unlockedClasses.has('pyromancer') && !a.unlockedClasses.has('sorcerer'));
  for (let i = 0; i < goal('guardian'); i++) t.record(a.ledger, { kind: 'block', value: 10 }, i * 10);
  settleClassUnlocks(a);
  check('blocking naturally earns Guardian without automatically spilling into Sentinel', a.unlockedClasses.has('guardian') && !a.unlockedClasses.has('sentinel'));
  for (let i = 0; i < goal('sentinel'); i++) {
    t.record(a.ledger, { kind: 'block', value: 10 }, 1000 + i * 10);
    t.record(a.ledger, { kind: 'hit', tags: ['melee'] }, 1002 + i * 10);
  }
  check('practicing the response earns the specialist branch', settleClassUnlocks(a).some(u => u.id === 'class_sentinel'));
  const fighter = makeAccount();
  for (let i = 0; i < goal('berserker') - 1; i++) t.record(fighter.ledger, { kind: 'hit', tags: ['melee'], flags: ['lethal'] });
  check('steady melee path does not complete one kill early', settleClassUnlocks(fighter).length === 0);
  t.record(fighter.ledger, { kind: 'hit', tags: ['melee'], flags: ['lethal'] });
  check('Berserker can be earned through ordinary melee without taking a crisis', settleClassUnlocks(fighter).some(u => u.id === 'class_berserker') && get(fighter.ledger, 'crises_recovered') === 0);
  const risk = makeAccount();
  for (let i = 0; i < CLASS_DEEDS.berserker.objectives[1].n; i++) t.record(risk.ledger, { kind: 'crisis' });
  check('Berserker retains an independent shorter risk-taking avenue', settleClassUnlocks(risk).some(u => u.id === 'class_berserker'));
  const ambusher = makeAccount();
  for (let i = 0; i < goal('assassin'); i++) t.record(ambusher.ledger, { kind: 'hit', flags: ['hidden'] });
  check('concealed chip damage alone does not earn Assassin or Beguiler', settleClassUnlocks(ambusher).length === 0);
  for (let i = 0; i < goal('assassin'); i++) t.record(ambusher.ledger, { kind: 'hit', flags: ['crit', 'lethal'] });
  check('critical finishes alone no longer earn Assassin', settleClassUnlocks(ambusher).length === 0);
  for (let i = 0; i < goal('assassin'); i++) t.record(ambusher.ledger, { kind: 'hit', flags: ['hidden', 'lethal'] });
  check('completed concealed ambushes earn Assassin', settleClassUnlocks(ambusher).some(u => u.id === 'class_assassin'));
  const dancer = makeAccount(); dancer.unlockedClasses.add('brawler');
  for (let i = 0; i < goal('matador') - 1; i++) t.record(dancer.ledger, { kind: 'evade' });
  settleClassUnlocks(dancer);
  check('Matador waits for the larger evade total', !dancer.unlockedClasses.has('matador'));
  t.record(dancer.ledger, { kind: 'evade' });
  check('Matador needs evades alone, without counterattacks', settleClassUnlocks(dancer).some(u => u.id === 'class_matador'));
  const trickster = makeAccount();
  t.record(trickster.ledger, { kind: 'indirect', value: goal('beguiler') - 0.5 });
  check('indirect damage is an amount, not a hit count', settleClassUnlocks(trickster).length === 0);
  const reloaded = deserializeAccount(serializeAccount(trickster))!;
  t.record(reloaded.ledger, { kind: 'indirect', value: 0.5 });
  check('fractional indirect progress survives reload and earns Beguiler', settleClassUnlocks(reloaded).some(u => u.id === 'class_beguiler'));
}

seedGlobalRandom(0xd33d);
const w = makeSimWorld('warrior', 0xd33d), p = w.player;
const live = w as any;
function foe(): Actor {
  const e = w.createMonster('plains_wolf', 1, 'enemy');
  e.pos = { x: p.pos.x + 50, y: p.pos.y }; e.aiCooldown = 9999;
  e.sheet.setSource('deed-probe', [mod('life', 'override', 10000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('poise', 'override', 0)]);
  e.fillResources(); w.actors.push(e); return e;
}
const e = foe();
p.sheet.setSource('deed-probe', [mod('life', 'override', 1000), mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('poise', 'override', 0), mod('armour', 'override', 0)]);
p.fillResources();
const blow = makeSkillInstance({ ...SKILLS.firebolt, id: 'deed_probe_blow', tags: ['spell', 'physical'], baseDamage: { physical: [10, 10] }, effects: [{ type: 'damage' }] }, 1);
const hit = (caster: Actor, victim: Actor, inst = blow) => live.resolveHit(caster, inst, victim);
const n = (id: string) => get(w.account.ledger, id);
hit(e, p);
const lost = p.maxLife() - p.life;
check('real hostile hit stamps only life actually lost', lost > 0 && Math.abs(n('survived_hit_damage') - lost) < 0.001);
p.healBy(1000, true);
p.life -= 50; p.healBy(50);
check('silent regeneration consumes wound budget; later self-healing cannot recycle it', n('mended_wounds') === 0);
hit(e, p); p.healBy(1000);
check('real healing records the enemy wound once and excludes overheal', Math.abs(n('mended_wounds') - lost) < 0.001);
hit(e, p); p.fillResources(); p.life -= 50; p.healBy(50);
check('a full refill clears old wound credit before subsequent self-healing', Math.abs(n('mended_wounds') - lost) < 0.001);
const hurtBefore = n('survived_hit_damage');
hit(p, p);
check('self-inflicted hits grant no survived damage', n('survived_hit_damage') === hurtBefore);
e.noBounty = true; hit(e, p); e.noBounty = false;
check('conjured/no-bounty attackers cannot farm defensive deeds', n('survived_hit_damage') === hurtBefore);
p.sheet.setSource('immune-probe', [mod('hitImmune', 'override', 1)]);
hit(e, p);
check('real evade stamps once', n('evades') === 1);
p.sheet.removeSource('immune-probe');
p.sheet.setSource('block-probe', [mod('blockChance', 'override', 1), mod('blockValue', 'override', 0), mod('blockPower', 'override', 0.5)]);
hit(e, p);
check('real passive block records stopped damage', n('blocks') === 1 && n('blocked_damage') > 0);
const restoreBlockRandom = seedGlobalRandom(7); // first roll .0117, below the .6 block cap.
const passive = applyHit(e, p, { amounts: { physical: 1000 }, tags: new Set(['spell']), crit: false, sourceName: 'block probe' });
restoreBlockRandom();
check('passive block result separates prevented damage from seep', (passive.blockedAmount ?? 0) > 0 && passive.total > 0 && passive.blockedAmount! < 1000);
p.sheet.removeSource('block-probe'); p.fillResources();
const guard = makeSkillInstance(SKILLS.shield_up, 1);
p.facing = 0;
p.casting = { mode: 'guard', inst: guard, aim: e.pos, remaining: 1, channelTime: 1, shield: 100, maxShield: 100 } as any;
live.tryGuardBlock(p, e, e.pos, 35);
check('raised guards feed the same block counters', n('blocks') === 2 && n('blocked_damage') >= 35);
p.casting = null;
const counterBlow = makeSkillInstance({ ...blow.def, tags: ['attack', 'melee', 'physical'] }, 1);
const counterBefore = n('block_counters');
hit(p, e, counterBlow); hit(p, e, counterBlow);
check('real guard opens exactly one melee counter through the world clock', n('block_counters') === counterBefore + 1);
p.sheet.setSource('immune-probe', [mod('hitImmune', 'override', 1)]);
hit(e, p); p.sheet.removeSource('immune-probe');
const evadeBefore = n('evade_counters');
w.time += 3.01; hit(p, e, counterBlow);
check('real evade counter expires on world time', n('evade_counters') === evadeBefore);
p.sheet.setSource('immune-probe', [mod('hitImmune', 'override', 1)]);
hit(e, p); p.sheet.removeSource('immune-probe');
hit(p, e, counterBlow);
check('real evade followed by melee earns its response', n('evade_counters') === evadeBefore + 1);
const minion = foe(); minion.team = 'player'; minion.owner = p;
const victim = foe(); w.kill(victim, false, minion); w.kill(victim, false, minion);
check('owned companion kills count once', n('companion_kills') === 1);
const stranger = foe(); stranger.team = 'player'; w.kill(foe(), false, stranger);
check('unowned allies do not earn the local companion deed', n('companion_kills') === 1);
const swarmVictim = foe(); swarmVictim.life = 1;
live.litePooledHit(swarmVictim, { physical: 100 }, p);
check('pooled companion kills carry the keeper attribution exactly once', n('companion_kills') === 2);
const immortal = w.createMonster('target_dummy', 1, 'enemy');
immortal.passive = false; // immortality alone must exclude it, independent of passivity.
immortal.noBounty = false; w.actors.push(immortal);
const fireBefore = n('fire_hits'); hit(p, immortal, makeSkillInstance(SKILLS.firebolt, 1));
w.kill(immortal, false, minion);
check('immortal targets grant neither hit practice nor companion kills', n('fire_hits') === fireBefore && n('companion_kills') === 2 && !immortal.dead);
const undying = foe(); undying.owner = e; undying.undyingTime = 3;
w.kill(undying, false, minion);
check('a foe that revives through Undying Loyalty is not yet a companion kill', !undying.dead && n('companion_kills') === 2);
w.kill(undying, false, minion);
check('its actual final death earns exactly one companion kill', undying.dead && n('companion_kills') === 3);
const pooledUndying = foe(); pooledUndying.owner = e; pooledUndying.undyingTime = 3; pooledUndying.life = 1;
live.litePooledHit(pooledUndying, { physical: 100 }, p);
check('pooled companion bites also wait for a final death', !pooledUndying.dead && n('companion_kills') === 3);

const target = foe(); target.poise = 1;
target.sheet.setSource('poise-probe', [mod('poise', 'override', 10)]);
for (let i = 0; i < goal('breaker'); i++) { target.poise = 1; target.poiseBroken = false; hit(p, target); }
check('the tuned number of real poise breaks against one survivor completes Breaker', n('same_enemy_poise_breaks') === goal('breaker'));
w.account.unlockedClasses.delete('breaker');
check('the real deed settles into a class claim', settleClassUnlocks(w.account).some(u => u.id === classUnlockFor('breaker')!.id));
const breaksBefore = n('poise_breaks'), streakBefore = n('same_enemy_poise_breaks');
target.life = 1; target.poise = 1; target.poiseBroken = false; hit(p, target);
check('a killing poise break still counts toward lifetime breaks', n('poise_breaks') === breaksBefore + 1);
check('a killing poise break cannot extend the surviving-enemy streak', n('same_enemy_poise_breaks') === streakBefore);

p.fillResources();
const crisisStart = n('crises_recovered');
const crisisBlow = makeSkillInstance({ ...blow.def, baseDamage: { physical: [1, 1] } }, 1);
p.life = p.maxLife() * 0.30 + 0.1;
hit(e, p, crisisBlow); p.healBy(p.maxLife()); live.updateDeedRecovery();
check('a real hostile threshold crossing and recovery earns one crisis', n('crises_recovered') === crisisStart + 1);
live.updateDeedRecovery();
check('a later recovery sweep cannot duplicate the same crisis', n('crises_recovered') === crisisStart + 1);
const beforeCast = n('battle_cries');
w.executeSkill(p, makeSkillInstance(SKILLS.war_cry, 1), e.pos);
w.executeSkill(p, makeSkillInstance(SKILLS.war_cry, 1), e.pos, { noRepeat: true });
check('one deliberate warcry counts; its scheduled repeat does not', n('battle_cries') === beforeCast + 1);
const rallyStart = n('rallied_finishes');
const ralliedVictim = foe(); ralliedVictim.life = 1;
hit(p, ralliedVictim, counterBlow);
w.executeSkill(p, makeSkillInstance(SKILLS.war_cry, 1), e.pos, { noRepeat: true });
const repeatVictim = foe(); repeatVictim.life = 1;
hit(p, repeatVictim, counterBlow);
check('real warcry earns one melee finish; scheduled repeat cannot reopen it', n('rallied_finishes') === rallyStart + 1);
const hiddenVictim = foe(); hiddenVictim.life = 1;
p.sheet.setSource('hidden-probe', [mod('detectability', 'override', 0.35)]);
const hiddenStart = n('hidden_finishes');
hit(p, hiddenVictim, counterBlow);
p.sheet.removeSource('hidden-probe');
check('real concealed killing blow records a completed ambush', n('hidden_finishes') === hiddenStart + 1);
const before = n('fire_hits');
live.metaProgressionActive = () => false;
hit(p, e, makeSkillInstance(SKILLS.firebolt, 1));
check('sealed mode stages grant no combat deeds', n('fire_hits') === before);

// Indirect attribution observes real timer pools, retaliation and life payment.
// Never add nominal overkill, another caster's share, or an ordinary direct hit.
{
  const world = makeSimWorld('warrior', 0x1d1e), hero = world.player, priv = world as any;
  const body = (team: 'player' | 'enemy' = 'enemy') => {
    const a = world.createMonster('plains_wolf', 1, team);
    a.pos = { x: hero.pos.x + 50, y: hero.pos.y }; a.aiCooldown = 9999;
    a.sheet.setSource('indirect-probe', [mod('life', 'override', 1000), mod('lifeRegen', 'override', 0),
      mod('evasion', 'override', 0), mod('blockChance', 'override', 0), mod('damageTaken', 'override', 1)]);
    a.fillResources(); world.actors.push(a); return a;
  };
  hero.sheet.setSource('indirect-probe', [mod('life', 'override', 1000), mod('lifeRegen', 'override', 0),
    mod('evasion', 'override', 0), mod('blockChance', 'override', 0)]);
  hero.fillResources();
  const victim = body(), stranger = body('player'), pet = body('player'); pet.owner = hero;
  const total = () => get(world.account.ledger, 'indirect_damage');
  const near = (a: number, b: number) => Math.abs(a - b) < 0.001;
  priv.resolveHit(hero, blow, victim);
  check('ordinary offensive hits do not earn indirect damage', total() === 0);
  victim.absorb = 50; victim.absorbTimer = 10;
  victim.applyStatus('burn', 100, 1, hero.name, { casterId: hero.id });
  victim.applyStatus('scorch', 100, 1, stranger.name, { casterId: stranger.id });
  world.update(0.1);
  check('fully shielded ailment damage earns no indirect life damage', total() === 0);
  victim.absorb = 0;
  let beforeLife = victim.life, beforeDeed = total(); world.update(0.1);
  check('mixed-source same-element DoT credits only the owned share after mitigation',
    near(total() - beforeDeed, (beforeLife - victim.life) / 2) && total() > 0);
  victim.statuses.length = 0;
  victim.applyStatus('poison', 100, 1, pet.name, { casterId: pet.id });
  beforeLife = victim.life; beforeDeed = total(); world.update(0.1);
  check('owned companion ailments earn their actual damage', near(total() - beforeDeed, beforeLife - victim.life) && total() > beforeDeed);
  victim.statuses.length = 0;
  victim.applyStatus('burn', 100, 1, 'unattributed scenery');
  beforeDeed = total(); world.update(0.1);
  check('unattributed environment ailments are not player damage', total() === beforeDeed);
  victim.statuses.length = 0;
  victim.applyStatus('burn', 1000, 1, hero.name, { casterId: hero.id });
  victim.statuses[0].remaining = 0.01; victim.life = 7;
  beforeDeed = total(); world.update(0.1);
  check('the final expiring ailment tick counts once and caps overkill at remaining life', near(total() - beforeDeed, 7));
  const attacker = body();
  hero.sheet.setSource('spikes', [mod('thorns', 'override', 1000)]);
  attacker.life = 17; beforeDeed = total(); priv.applyThorns(hero, attacker, 10);
  check('retaliation caps progress at actual enemy life', near(total() - beforeDeed, 17));
  const fake = body(); fake.noBounty = true; beforeDeed = total(); priv.applyThorns(hero, fake, 10);
  check('no-bounty enemies cannot feed retaliation progress', total() === beforeDeed);
  hero.sheet.removeSource('spikes');
  const observer = body();
  beforeDeed = total(); hero.payCost({ mana: 0, life: 13 });
  check('real life costs count as self-damage during combat', near(total() - beforeDeed, 13));
  beforeDeed = total(); priv.resolveHit(hero, blow, hero);
  check('self-inflicted hits count as indirect damage', total() > beforeDeed);
  beforeDeed = total(); priv.resolveHit(observer, blow, hero);
  check('enemy-inflicted direct wounds do not count as self-damage', total() === beforeDeed);
  const blastVictim = body(); blastVictim.life = 9; observer.pos.x += 1000;
  beforeDeed = total(); priv.burstDamage(blastVictim.pos, 1, 1000, 'fire', '#fff', 'player', 0, hero);
  check('owned secondary explosions count actual life removed', near(total() - beforeDeed, 9));
  const immortal = world.createMonster('target_dummy', 1, 'enemy');
  immortal.passive = false; immortal.noBounty = false; immortal.pos = { ...hero.pos }; world.actors.push(immortal);
  beforeDeed = total(); hero.payCost({ mana: 0, life: 11 });
  check('life costs beside only distant, dead, allied or immortal bodies earn nothing', total() === beforeDeed);
  observer.pos = { x: hero.pos.x + 50, y: hero.pos.y };
  priv.metaProgressionActive = () => false;
  beforeDeed = total(); hero.payCost({ mana: 0, life: 11 });
  observer.applyStatus('burn', 100, 1, hero.name, { casterId: hero.id }); world.update(0.1);
  check('sealed stages cannot accrue either self-damage or outgoing DoT', total() === beforeDeed);
}

console.log(`\nClass deeds: ${failed ? `${failed} FAILED` : 'all passed'}`);
process.exitCode = failed ? 1 : 0;
