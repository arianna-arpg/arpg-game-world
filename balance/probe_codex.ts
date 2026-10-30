import assert from 'node:assert/strict';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { makeAccount, serializeAccount, deserializeAccount, FEATURE, STARTER_SKILLS } from '../src/meta/account';
import { CODEX_SECTIONS, CODEX_CFG } from '../src/data/codex';
import { codexEntries, codexFilter, codexSkillIds, codexSupportHosts, codexConversion, CODEX_PROVIDERS } from '../src/meta/codex';
import { CodexSightings, codexSightingKey, codexEncountered } from '../src/engine/codexSightings';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { CLASSES } from '../src/data/classes';
import { MONSTERS } from '../src/data/monsters';
import { bestiaryKey, bestiaryThreshold, bestiaryList } from '../src/data/bestiary';
import { ATTRIBUTES, STAT_DEFS, DAMAGE_TYPES, StatSheet, conversionStat } from '../src/engine/stats';
import { applyConversion } from '../src/engine/damage';
import { formatModLine } from '../src/engine/items';
import { allUnlockables, isUnlockOwned } from '../src/meta/unlocks';

bootSimEngine();
let count = 0;
function test(name: string, fn: () => void): void { fn(); console.log(`PASS ${name}`); count++; }
const a = makeAccount();
const all = { query: '', tags: [], status: 'all' as const };
test('every configured page has a provider and opaque entry identities are unique', () => {
  for (const section of CODEX_SECTIONS) for (const page of section.pages) {
    assert.ok(CODEX_PROVIDERS[page.id]);
    const entries = codexEntries(a, page.id);
    assert.equal(new Set(entries.map(e => e.key)).size, entries.length);
  }
});
test('catalog derives from player skills; excludes enemy-only skills and includes starter bars', () => {
  const ids = codexSkillIds();
  for (const id of STARTER_SKILLS) assert.ok(ids.includes(id));
  const npc = Object.values(SKILLS).find(s => s.noDrop && !CLASSES.some(c => c.bar.includes(s.id) || c.kit?.some(k => k.skill === s.id)) && !CODEX_CFG.extraSkills.includes(s.id))!;
  assert.ok(npc); assert.ok(!ids.includes(npc.id));
  const example = SKILLS[STARTER_SKILLS[0]];
  SKILLS.codex_probe = { ...example, id: 'codex_probe', name: 'Probe Skill', noDrop: false };
  try { assert.ok(codexSkillIds().includes('codex_probe')); } finally { delete SKILLS.codex_probe; }
});
test('locked entries expose neither sources nor tags, media, plaintext names or searchable identity', () => {
  for (const page of ['skills', 'supports']) {
    const rows = codexEntries(a, page), locked = rows.filter(e => e.locked);
    assert.ok(locked.length);
    for (const r of locked) {
      assert.equal(r.source, undefined); assert.equal(r.preview, undefined); assert.deepEqual(r.tags, []);
    }
    const secret = page === 'skills' ? Object.values(SKILLS).find(s => codexSkillIds().includes(s.id) && !a.unlockedSkills.has(s.id))!
      : Object.values(SUPPORTS).find(s => s.weight > 0 && !a.unlockedSupports.has(s.id))!;
    assert.ok(!JSON.stringify(locked).includes(secret.name));
    assert.ok(codexFilter(rows, { ...all, query: secret.name }).every(e => !e.locked));
    assert.equal(codexFilter(locked, { ...all, query: secret.name }).length, 0);
    assert.equal(codexFilter(locked, { ...all, tags: ['spell'] }).length, 0);
  }
});
test('discovery, debug access, and all-tag filters share the existing account rules', () => {
  const id = codexSkillIds().find(id => !a.unlockedSkills.has(id))!;
  a.unlockedSkills.add(id);
  assert.ok(codexEntries(a, 'skills').some(e => e.source?.id === id && !e.locked));
  const rows = codexEntries(a, 'skills');
  for (const e of codexFilter(rows, { ...all, tags: ['spell', 'projectile'] })) {
    assert.ok(e.tags.includes('spell') && e.tags.includes('projectile'));
  }
  a.features.add(FEATURE.UNLOCK_ALL_GEMS);
  assert.ok(codexEntries(a, 'skills').every(e => !e.locked));
  assert.ok(codexEntries(a, 'supports').every(e => !e.locked));
  a.features.delete(FEATURE.UNLOCK_ALL_GEMS);
});
test('search matches normalized terms across known names, tags, prose and live facts', () => {
  const make = (key: string, title: string, description: string, tags: string[], facts: {label: string; value: string}[] = []) =>
    ({ key, title, description, tags, facts, state: 'Known', locked: false });
  const rows = [make('a', 'Ash', 'A firebolt trails the target.', ['spell']), make('b', 'Firebolt Nova', '', ['spell']),
    make('c', 'Firebolt', 'A focused blast.', ['spell'], [{label:'Base cooldown',value:'0.5s'}]),
    make('d', 'Éther—Ward', 'A protective field.', ['aura'])];
  assert.deepEqual(codexFilter(rows, {...all,query:'FIREBOLT'}).map(e=>e.key), ['c','b','a']);
  assert.deepEqual(codexFilter(rows, {...all,query:'spell focused 0.5s'}).map(e=>e.key), ['c']);
  assert.deepEqual(codexFilter(rows, {...all,query:'  ether  ward  '}).map(e=>e.key), ['d']);
  assert.deepEqual(codexFilter(rows, {...all,query:'ward',tags:['spell']}), []);
  assert.deepEqual(codexFilter(rows, {...all,query:'!!!'}), []);
});
test('search never indexes locked facts, partial runes, punctuation or combined filters', () => {
  const locked = codexEntries(makeAccount(), 'skills').filter(e => e.locked);
  for (const query of ['fire', 'mana', '!!!', locked[0].title.slice(0, 1)]) {
    assert.deepEqual(codexFilter(locked, {...all,query,status:'locked'}), []);
  }
  assert.equal(codexFilter(locked, {...all,query:'   ',status:'locked'}).length, locked.length);
});
test('support demonstrations only offer discovered, compatible base skills', () => {
  assert.deepEqual(codexSupportHosts(a, Object.values(SUPPORTS).find(s => !a.unlockedSupports.has(s.id))!.id), []);
  const hosts = codexSupportHosts(a, 'piercing');
  assert.ok(hosts.length); assert.ok(hosts.every(id => a.unlockedSkills.has(id)));
});
test('Bestiary sightings are minimal without Tracker; existing hunt progress reveals tiers after recruitment', () => {
  const def = bestiaryList()[0], key = codexSightingKey(def.id);
  a.ledger[key] = 1;
  const entry = () => codexEntries(a, 'creatures').find(e => e.source?.id === def.id)!;
  assert.equal(entry().state, 'Encountered'); assert.deepEqual(entry().facts.map(f => f.label), ['Allegiance']);
  a.ledger[bestiaryKey(def.id)] = bestiaryThreshold(def);
  assert.deepEqual(entry().facts.map(f => f.label), ['Allegiance']);
  a.features.add(FEATURE.TRACKER);
  assert.equal(entry().state, 'Mastered');
  for (const label of ['Base life', 'Arts', 'Base armor']) assert.ok(entry().facts.some(f => f.label === label));
  const restored = deserializeAccount(serializeAccount(a))!;
  assert.ok(codexEncountered(restored, def.id));
  assert.deepEqual(codexEntries(restored, 'creatures'), codexEntries(a, 'creatures'));
});
test('locked and pending classes respect discovery versus activation without mutating the account', () => {
  const c = CLASSES.find(c => !a.unlockedClasses.has(c.id))!;
  const before = JSON.stringify(serializeAccount(a));
  assert.ok(codexEntries(a, 'classes').filter(e => e.locked).every(e => !e.source && !e.color));
  assert.equal(JSON.stringify(serializeAccount(a)), before);
  a.unlockedClasses.add(c.id); a.pendingClassUnlocks.add(c.id);
  assert.match(codexEntries(a, 'classes').find(e => e.source?.id === c.id)!.state, /activate/);
  a.pendingClassUnlocks.delete(c.id);
  assert.equal(codexEntries(a, 'classes').find(e => e.source?.id === c.id)!.state, 'Unlocked');
});
test('Owned matches the existing unlock receipts and excludes pending classes', () => {
  const want = allUnlockables(a).filter(u => isUnlockOwned(a, u) && !(u.kind === 'class' && a.pendingClassUnlocks.has(u.payload.classId)));
  assert.deepEqual(codexEntries(a, 'owned').map(e => e.title), want.map(u => u.label));
});
test('mechanical reference follows modified attributes and stat limits without copied values', () => {
  const attr = ATTRIBUTES.strength.perPoint[0], prior = attr.value;
  const max = STAT_DEFS.fireRes.max;
  try {
    attr.value = prior + 7; STAT_DEFS.fireRes.max = 0.61;
    assert.equal(codexEntries(a, 'attributes').find(e => e.key === 'attributes:strength')!.facts[0].value, formatModLine(attr, attr.value));
    assert.equal(codexEntries(a, 'stats').find(e => e.key === 'stats:fireRes')!.facts.find(f => f.label === 'Maximum')!.value, '61%');
  } finally { attr.value = prior; STAT_DEFS.fireRes.max = max; }
});
test('conversion examples execute the shared damage fold for every damage-type pair', () => {
  for (const from of DAMAGE_TYPES) for (const to of DAMAGE_TYPES) for (const pct of [0, 35, 100]) {
    const sheet = new StatSheet(); sheet.setSource('test', [{ stat: conversionStat(from, to), kind: 'flat', value: pct / 100 }]);
    const expected = { [from]: 100 }; applyConversion({ sheet }, expected, new Set());
    assert.deepEqual(codexConversion(from, to, pct), expected);
    assert.equal(Object.values(expected).reduce((x, y) => x + y, 0), 100);
  }
});
test('actual observation uses senses, floor, authority and mode gates, without kill credit', () => {
  const w = makeSimWorld('warrior', 0xc0de), hero = w.localSeat.actor;
  const d = bestiaryList().find(d => !d.boss && !d.parts && !d.worm)!;
  const foe = w.createMonster(d.id, 1, 'enemy');
  hero.pos = { x: 200, y: 200 }; foe.pos = { x: 220, y: 200 };
  hero.tier = foe.tier = 0; w.actors = [hero, foe];
  w.lineOfSight = () => true; w.losCached = () => true;
  const sightings = new CodexSightings();
  const tick = () => sightings.update(w, 1);
  delete w.account.ledger[codexSightingKey(d.id)]; delete w.account.ledger[bestiaryKey(d.id)];
  foe.sheet.setSource('test:invisible', [{ stat: 'invisible', kind: 'flat', value: 1 }]);
  tick(); assert.ok(!codexEncountered(w.account, d.id)); foe.sheet.removeSource('test:invisible');
  w.losCached = () => false; tick(); assert.ok(!codexEncountered(w.account, d.id)); w.losCached = () => true;
  foe.tier = 1; tick(); assert.ok(!codexEncountered(w.account, d.id)); foe.tier = 0;
  foe.pos.x = 100000; tick(); assert.ok(!codexEncountered(w.account, d.id)); foe.pos.x = 220;
  w.clientActionHook = () => {}; tick(); assert.ok(!codexEncountered(w.account, d.id)); delete w.clientActionHook;
  w.scene = {} as NonNullable<typeof w.scene>; tick(); assert.ok(!codexEncountered(w.account, d.id)); w.scene = null;
  const mode = w.metaProgressionActive.bind(w); w.metaProgressionActive = () => false;
  tick(); assert.ok(!codexEncountered(w.account, d.id)); w.metaProgressionActive = mode;
  tick(); assert.equal(w.account.ledger[codexSightingKey(d.id)], 1);
  assert.equal(w.account.ledger[bestiaryKey(d.id)], undefined);
  tick(); assert.equal(w.account.ledger[codexSightingKey(d.id)], 1); assert.ok(w.accountDirty);
  assert.ok(MONSTERS[d.id]);
});
console.log(`CODEX OK: ${count} contracts`);
