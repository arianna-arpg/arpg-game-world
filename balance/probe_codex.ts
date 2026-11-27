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
import { PROCS } from '../src/data/procs';
import { COMBO_RULES } from '../src/data/combos';
import { STATUS_DEFS } from '../src/engine/status';
import { statBlurbOf, statDetailOf } from '../src/data/sheet';
import { mechanicKeys, mechanicTopic, modifierLineTopic, previewMechanics, skillGrowth, skillMechanics } from '../src/meta/mechanics';
import { itemModifierText, mechanicProse, mechanicText, mechanicTooltip, modifierHtml, supportDescription } from '../src/ui/mechanicReference';
import { treeGraph } from '../src/engine/skilltree';
import { skillReferenceCard } from '../src/ui/skillReferenceCard';
import { makeSkillInstance } from '../src/engine/skills';
import { previewSkill } from '../src/engine/skillPreview';
import { procReference, itemProcReferences } from '../src/engine/procReference';
import { compareItemMods, describeItem, forgeItem } from '../src/engine/itemgen';
import { makeSettings, serializeSettings, deserializeSettings, rebindAction } from '../src/meta/settings';
import { UNIQUES } from '../src/data/uniques';
import { rolledUniqueLines, uniqueDefinitionLines } from '../src/engine/itemchoices';
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
test('the Mechanics shelf covers the registered rules, follows live balance and resolves every nested link', () => {
  const shelf = codexEntries(a,'reference'), byKey = new Map(shelf.map(e => [e.mechanic,e]));
  const registries = {stat:STAT_DEFS,attr:ATTRIBUTES,status:STATUS_DEFS,proc:PROCS,combo:COMBO_RULES};
  for (const [kind,registry] of Object.entries(registries)) for (const id of Object.keys(registry)) assert.ok(byKey.has(kind+'/'+id));
  for (const key of mechanicKeys()) {
    const t = mechanicTopic(key)!;
    assert.ok(!byKey.get(key)?.locked && t.title && t.description,key);
    if (key.startsWith('stat/')) assert.ok(statBlurbOf(key.slice(5)) || statDetailOf(key.slice(5)),key+' needs a player-facing explanation');
    for (const target of t.related) assert.ok(target !== key && byKey.has(target),key+' → '+target);
  }
  const proc = PROCS.emberbrand_rekindle, key = 'proc/'+proc.id;
  const record = byKey.get(key)!;
  assert.equal(record.description,procReference(proc)); assert.equal(record.title,proc.name);
  const ring=forgeItem({uniqueId:'emberbrand',ilvl:20,quality:1})!;
  const otherRing=forgeItem({uniqueId:'grounded_lattice',ilvl:20,quality:1})!;
  const comparison=compareItemMods(ring,otherRing,itemModifierText);
  assert.ok(comparison.length && comparison.every(r => r.text.includes('data-inspect-topic=')));
  assert.ok(itemProcReferences(ring).some(r=>r.key===key));
  for (const [roll,chance] of [[0,35],[1,50]]) {
    ring.uniqueRolls=UNIQUES.emberbrand.lines.map(()=>roll);
    assert.deepEqual(describeItem(ring).unique.filter(s=>s.includes(proc.name)),[chance+'% chance to trigger '+proc.name]);
  }
  const saved=serializeSettings({...makeSettings(),inspectionAlways:true});
  assert.equal(saved.keybinds.focusItemTooltip,'');
  delete saved.keybinds.focusItemTooltip;
  const oldSettings=deserializeSettings(saved)!;
  assert.equal(oldSettings.keybinds.focusItemTooltip,'');
  rebindAction(oldSettings.keybinds,'focusItemTooltip','f2');
  assert.equal(deserializeSettings(serializeSettings(oldSettings))?.keybinds.focusItemTooltip,'f2');
  rebindAction(oldSettings.keybinds,'focusItemTooltip','');
  assert.equal(deserializeSettings(serializeSettings(oldSettings))?.keybinds.focusItemTooltip,'');
  assert.equal(deserializeSettings(saved)?.inspectionAlways,true);
  delete saved.inspectionAlways;
  assert.equal(deserializeSettings(saved)?.inspectionAlways,false);
  delete saved.keybinds.inspectTooltips;
  assert.equal(deserializeSettings(saved)?.keybinds.inspectTooltips,'alt');
  saved.keybinds.panelSkills='alt';
  const rebound=deserializeSettings(saved)!;
  assert.equal(rebound.keybinds.inspectTooltips,'');
  rebindAction(rebound.keybinds,'inspectTooltips','alt');
  assert.equal(rebound.keybinds.panelSkills,'');
  rebindAction(rebound.keybinds,'inspectTooltips','j');
  rebound.inspectionAlways=true;
  const reloaded=deserializeSettings(serializeSettings(rebound))!;
  assert.equal(reloaded.keybinds.inspectTooltips,'j');assert.equal(reloaded.inspectionAlways,true);
  assert.ok(codexFilter(shelf,{...all,query:proc.name,tags:['Proc']}).some(r=>r.key===key));
  assert.match(mechanicTooltip(key)!.description,/data-inspect-topic="status\/burn"/);
  assert.ok(!mechanicText('<script>Damageable & Damage', ['stat/damage']).includes('<script>'));
  assert.equal((mechanicText('Damageable & Damage',['stat/damage']).match(/data-inspect-topic/g) ?? []).length,1);
  const old=proc.icd;
  try { proc.icd=7.75;assert.ok(mechanicTopic(key)!.description.includes('7.75')); }
  finally { proc.icd=old; }
  console.log(shelf.length+' topics · '+Object.entries(registries).map(([k,v])=>Object.keys(v).length+' '+k).join(' · '));
});
test('every Unique roll renders its own inspectable modifier and named payload', function itemInspectionCoverage() {
  const catalog = Object.values(UNIQUES);
  const indexed = new Set(mechanicKeys());
  let lines = 0, choices = 0;
  for (const def of catalog) {
    const item = forgeItem({uniqueId:def.id, ilvl:Math.max(20,def.minIlvl ?? 1), quality:1})!;
    const selected = rolledUniqueLines(item,def);
    const visible = describeItem(item,itemModifierText).unique;
    assert.equal(visible.filter(row=>row.includes('data-inspect-topic=')).length,selected.length,def.name);
    selected.forEach(({line},i)=>assert.ok(visible[i].includes('data-inspect-topic="'+modifierLineTopic(line.stat)+'"'),def.name+' · '+line.stat));
    const allLines = uniqueDefinitionLines(def);
    lines += allLines.length;
    choices += (def.choices ?? []).reduce((n,group) => n+group.options.length,0);
    // Exercise both extremes of every alternative in linear time through the real item describer.
    const id = 'inspection_probe_all_rolls';
    assert.ok(!UNIQUES[id]);
    UNIQUES[id] = {...def,id,lines:allLines,choices:undefined};
    try {
      for (const roll of [0,1]) {
        const specimen = {...item,uniqueId:id,uniqueRolls:allLines.map(() => roll)};
        const rows = describeItem(specimen,itemModifierText).unique;
        allLines.forEach((line,i) => {
          const key = modifierLineTopic(line.stat);
          const message = def.name+' · '+line.stat;
          assert.ok(indexed.has(key) && rows[i].includes('data-inspect-topic="'+key+'"'),message);
          const grant = STAT_DEFS[line.stat]?.grant;
          if (grant) {
            const [,effectId] = key.split('/');
            const effect = (grant.kind === 'proc' ? PROCS[effectId] : COMBO_RULES[effectId]).effect;
            assert.ok(rows[i].includes('>'+grant.name+'</button>'),message);
            if (effect.type === 'cast') assert.ok(mechanicTopic(key)!.related.includes('skill/'+effect.cast.skillId),message);
          }
          if (line.stat.startsWith('skillgrant_')) assert.equal(key,'skill/'+line.stat.slice('skillgrant_'.length));
        });
      }
    } finally { delete UNIQUES[id]; }
  }
  assert.ok(mechanicTopic('stat/slotgraft_1_crushing_impact')!.facts.some(f=>f.value === SUPPORTS.crushing_impact.description));
  assert.ok(mechanicTopic('stat/companiongrant_summon_fire_golem')!.related.includes('skill/summon_fire_golem'));
  console.log(catalog.length+' Uniques · '+lines+' modifier definitions · '+choices+' alternate rolls');
});
test('skill references follow the casting rules for owned and unlearned payloads', () => {
  const world = makeSimWorld('warrior', 0xe4b), seat = world.localSeat;
  const key = 'proc/emberbrand_rekindle', id = 'firebolt';
  assert.match(mechanicTooltip(key)!.description,/data-inspect-topic="skill\/firebolt"/);
  assert.ok(mechanicTopic('skill/fire_mine')!.related.includes('skill/'+(SKILLS.fire_mine.delivery as {castSkillId:string}).castSkillId));
  const read = (parent: string | undefined) => skillReferenceCard(id,parent,world,seat)!.description;
  assert.match(read(key),/Skill reference · Lv 1/);
  assert.ok(!seat.meta.knownSkills.has(id));
  const learned = makeSkillInstance(SKILLS[id],7);
  seat.meta.knownSkills.set(id,learned);
  assert.match(read(key),/Learned skill · Lv 7/);
  assert.match(read(undefined),/Estimated hit DPS/);
  assert.ok(!read(key).includes('Estimated hit DPS'));
  const grant = makeSkillInstance(SKILLS[id],3);
  grant.grantedBy = 'The Emberbrand';
  seat.grantedInsts = new Map([[id,grant]]);
  assert.match(read(key),/Granted by The Emberbrand · Lv 3/);
  const metric = () => read(key).match(/<strong>≈ ([^<]+)<\/strong>/)![1];
  const expected = () => {
    const hit = previewSkill(seat.actor,grant).averageDirectHit!;
    return hit.toLocaleString(undefined,{maximumFractionDigits:hit < 10 ? 1 : 0});
  };
  assert.equal(metric(),expected());
  grant.level = 10;
  assert.match(read(key),/Lv 10/); assert.equal(metric(),expected());
  const ordinaryCast = Object.values(PROCS).find(p => p.effect.type === 'cast' && !p.effect.cast.own)!;
  if (ordinaryCast.effect.type !== 'cast') throw Error('Expected a catalog cast');
  const other = ordinaryCast.effect.cast.skillId;
  seat.meta.knownSkills.set(other,makeSkillInstance(SKILLS[other],8));
  assert.match(skillReferenceCard(other,'proc/'+ordinaryCast.id,world,seat)!.description,/Skill reference · Lv 1/);
  assert.match(skillReferenceCard(id,undefined)!.description,/Base damage/);
  assert.ok(!seat.actor.skills.some(s => s?.def.id === id));
});
test('every registered skill, its growth, its tree modifiers and its resolved preview rows have readable inspection targets', () => {
  const actor = makeSimWorld('warrior',0x47).localSeat.actor;
  const indexed = new Set(mechanicKeys());
  let previews = 0, rows = 0, nodeMods = 0;
  for (const def of Object.values(SKILLS)) {
    const inst = makeSkillInstance(def);
    const checkPreview = () => {
      previews++;
      for (const row of previewSkill(actor,inst).rows) {
        const scope = def.id+' · '+row.key;
        const keys = previewMechanics(row);
        assert.ok(keys.length,scope);
        assert.deepEqual(keys,row.mechanics,scope);
        for (const key of keys) assert.ok(indexed.has(key) || key.startsWith('skill/') && !!SKILLS[key.slice(6)],scope+' → '+key);
        rows++;
      }
    };
    checkPreview();
    const related = skillMechanics(def,inst);
    for (const growth of skillGrowth(def)) for (const mod of growth.mods) {
      const key = modifierLineTopic(mod.stat);
      assert.ok(related.includes(key),def.id+' growth → '+key);
      assert.ok(modifierHtml(mod).includes('data-inspect-topic="'+key+'"'),def.id+' · '+growth.label);
    }
    inst.level = 20;
    for (const [id,{node}] of treeGraph(def)?.nodes ?? []) {
      for (const mod of [...(node.mods ?? []), ...(node.buffs ?? []).flatMap(b => b.mods ?? []),
        ...(node.over?.aura?.selfMods ?? []), ...(node.over?.aura?.allyMods ?? []), ...(node.over?.aura?.enemyMods ?? [])]) {
        const key = modifierLineTopic(mod.stat);
        assert.ok(modifierHtml(mod).includes('data-inspect-topic="'+key+'"'),def.id+' · '+id+' → '+key);
        nodeMods++;
      }
      inst.treeNodes = [id];
      checkPreview();
    }
  }
  const shield = makeSkillInstance(SKILLS.shield_up);
  const capacity = () => previewSkill(actor,shield).rows.find(row => row.key==='guardArtCapacity')!;
  const base = capacity();
  assert.equal(previewMechanics(base)[0],'stat/guardStrength');
  shield.level++;
  assert.ok(Number(capacity().value)>Number(base.value));
  assert.ok(skillReferenceCard('shield_up',undefined)!.description.includes('data-inspect-topic="stat/guardStrength"'));
  assert.match(mechanicProse('Scales with Guard Strength.',[]),/data-inspect-topic="stat\/guardStrength"/);
  assert.doesNotMatch(mechanicProse('Guard Strengthened',[]),/data-inspect-topic/);
  for (const support of Object.values(SUPPORTS)) {
    const html = supportDescription(support);
    for (const mod of [...support.mods,...(support.perLevel ?? [])]) {
      const key = modifierLineTopic(mod.stat);
      assert.ok(html.includes('data-inspect-topic="'+key+'"'),support.id+' → '+key);
    }
  }
  for (const [id,status] of [['cloudTrail','windlane'],['cloudCharge','stormlaced'],['cloudSalve','silverlined']])
    assert.ok(mechanicTopic('stat/'+id)?.related.includes('status/'+status));
  const song = makeSkillInstance(SKILLS.antiphon,2);
  song.sockets = [{def:SUPPORTS.noonglass,level:1}];
  const songRows = previewSkill(actor,song).rows;
  assert.equal(songRows.find(r => r.key === 'area')?.value,'+3%');
  const ignition = songRows.find(r => r.key === 'apply_burn');
  assert.equal(ignition?.value,'25%');
  assert.ok(ignition && previewMechanics(ignition).includes('status/burn'));
  console.log(Object.keys(SKILLS).length+' skills · '+previews+' skill configurations · '+rows+' preview rows · '+nodeMods+' tree modifier lines');
});
console.log(`CODEX OK: ${count} contracts`);
