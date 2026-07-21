// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE SUPPORT-MATRIX HARNESS itself (src/sim/compat.ts +
// src/sim/ledger.ts): the instrument that gates the skill × support no-op
// hunt, deterministically self-tested.
//
//   RIG A — the fit explainer agrees with the REAL socket gate across the
//           whole catalog (every pair; `agrees` is the drift tripwire).
//   RIG B — ablation-unit derivation laws over every support: coverage of
//           the payload partition, identity fields never maskable, masking
//           never mutates the original, solo variants carry exactly one unit.
//   RIG C — probe order + shard laws: deterministic, disjoint, union-total,
//           round-robin fairness.
//   RIG D — ledger laws on synthetic fixtures: defect distillation, the
//           ratchet (new/known/resolved/drift/unverified/out-of-scope),
//           reconcile idempotence + adjudication preservation, merge
//           conflicts, rig guards, validation lint.
//   RIG E — the LIVE pipeline: an identity-only gem reads INERT end to end
//           (the A/B oracle), a constructed live+dead gem yields the exact
//           per-unit verdicts (sole-carrier + dead) and a PARTIAL defect,
//           leech-at-dummy reads BLIND (never a false inert) at pair level
//           and 'blind in isolation' at unit level, verdicts are
//           byte-deterministic, and skip/pairs/resume bookkeeping holds.
//
// Run: npx tsx balance/probe_supportmatrix.ts
// ---------------------------------------------------------------------------

import { bootSimEngine } from '../src/sim/arena';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { unreadPayloadRows } from '../src/data/graftReadSites';
import { mod } from '../src/engine/stats';
import type { SkillDef, SupportDef } from '../src/engine/skills';
import {
  ablationUnits, compatCensus, deepProbePair, explainFit, explainPair,
  makeProbeSession, pairKey, maskSupportUnit, probeKindFor, probeOrder,
  probePair, runCompatMatrix, soloSupportUnit,
  type CensusResult, type CensusRow, type PairDeepResult, type PairProbeResult,
  type PairVerdictKind, type UnitProbeResult,
} from '../src/sim/compat';
import {
  adjudicate, checkLedger, emptyLedger, ledgerToJson, mergeProbed, observedDefects,
  reconcileLedger, rigMismatches, rigSignatureOf, validateLedger,
  type SupportLedger,
} from '../src/sim/ledger';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// === RIG A — the fit explainer vs the real gate, whole catalog ==============

{
  const census = compatCensus();
  let fitMismatch = 0, disagrees = 0;
  for (const row of census.rows) {
    const x = explainFit(SKILLS[row.skillId], SUPPORTS[row.supportId]);
    if (x.fit !== row.fit) fitMismatch++;
    if (!x.agrees) disagrees++;
  }
  check(`A1 explainFit matches the census fit for all ${census.rows.length} pairs`, fitMismatch === 0, `${fitMismatch} mismatches`);
  check('A2 gate decomposition agrees with the engine everywhere (drift tripwire)', disagrees === 0, `${disagrees} disagreements`);
}

// === RIG B — ablation-unit laws over every support ==========================

{
  const IDENTITY = new Set(['id', 'name', 'description', 'color', 'requiresTags',
    'excludeTags', 'maxLevel', 'weight', 'minDropLevel', 'dropTags']);
  let coverage = 0, identityLeak = 0, dupKeys = 0, mutated = 0, badMask = 0, badSolo = 0;
  for (const sup of Object.values(SUPPORTS)) {
    const units = ablationUnits(sup);
    const keys = units.map(u => u.key);
    if (new Set(keys).size !== keys.length) dupKeys++;
    if (units.some(u => IDENTITY.has(u.key))) identityLeak++;
    // Field coverage: every defined payload field is exactly one unit.
    const definedPayload = Object.keys(sup).filter(k =>
      k !== 'mods' && k !== 'perLevel'
      && !IDENTITY.has(k)
      && (sup as unknown as Record<string, unknown>)[k] !== undefined);
    const fieldUnits = units.filter(u => u.kind === 'field').map(u => u.key).sort();
    if (JSON.stringify(fieldUnits) !== JSON.stringify([...definedPayload].sort())) coverage++;
    if (units.filter(u => u.kind === 'mod').length !== sup.mods.length) coverage++;
    if (units.filter(u => u.kind === 'perLevel').length !== (sup.perLevel?.length ?? 0)) coverage++;

    const before = JSON.stringify(sup);
    for (const u of units) {
      const masked = maskSupportUnit(sup, u, `__chk__${sup.id}`);
      if (JSON.stringify(sup) !== before) { mutated++; break; }
      if (masked.id !== `__chk__${sup.id}`) badMask++;
      if (u.kind === 'mod' && masked.mods.length !== sup.mods.length - 1) badMask++;
      if (u.kind === 'perLevel' && (masked.perLevel?.length ?? 0) !== (sup.perLevel?.length ?? 0) - 1) badMask++;
      if (u.kind === 'field' && (masked as unknown as Record<string, unknown>)[u.key] !== undefined) badMask++;
      if (masked.requiresTags !== sup.requiresTags || masked.excludeTags !== sup.excludeTags) badMask++;
      const solo = soloSupportUnit(sup, u, `__solo__${sup.id}`);
      const soloUnits = ablationUnits(solo);
      if (soloUnits.length !== 1 || soloUnits[0].key.replace(/\[\d+\]/, '[0]') !== u.key.replace(/\[\d+\]/, '[0]')
        || soloUnits[0].kind !== u.kind) badSolo++;
    }
  }
  const n = Object.keys(SUPPORTS).length;
  check(`B1 unit coverage law holds for all ${n} supports (fields + mods + perLevel, nothing else)`, coverage === 0, `${coverage} violations`);
  check('B2 identity fields are never maskable units', identityLeak === 0);
  check('B3 unit keys unique per support', dupKeys === 0);
  check('B4 masking never mutates the original def', mutated === 0);
  check('B5 masked variants drop exactly the one unit and keep the socket gate', badMask === 0, `${badMask} violations`);
  check('B6 solo variants carry exactly the one unit', badSolo === 0, `${badSolo} violations`);
}

// === RIG C — probe order + shard laws =======================================

{
  const census = compatCensus();
  const eligible = census.rows.filter(r => r.fit !== 'refused');
  const ordered = probeOrder(census);
  check('C1 probe order covers exactly the eligible pairs', ordered.length === eligible.length,
    `${ordered.length} vs ${eligible.length}`);
  const supportsWithPairs = new Set(eligible.map(r => r.supportId)).size;
  const head = new Set(ordered.slice(0, supportsWithPairs).map(r => r.supportId));
  check('C2 round-robin fairness: the first |supports| entries are all distinct supports',
    head.size === supportsWithPairs, `${head.size} vs ${supportsWithPairs}`);
  const again = probeOrder(census);
  check('C3 probe order is deterministic',
    ordered.map(r => pairKey(r.skillId, r.supportId)).join(',') === again.map(r => pairKey(r.skillId, r.supportId)).join(','));
  const OF = 5;
  const shards = Array.from({ length: OF }, (_, s) => ordered.filter((_, i) => i % OF === s));
  const union = new Set(shards.flat().map(r => pairKey(r.skillId, r.supportId)));
  check('C4 shards are disjoint and union to the whole order',
    union.size === ordered.length && shards.reduce((s, x) => s + x.length, 0) === ordered.length);
}

// === RIG D — ledger laws (synthetic fixtures) ===============================

const mkCensus = (skills: string[], supports: string[], rows: CensusRow[] = []): CensusResult => ({
  skills, supports, rows,
  counts: { host: 0, crew: 0, refused: 0, suspects: 0, unreadPairs: 0 },
});
const mkProbe = (skill: string, support: string, verdict: PairVerdictKind,
  moved: PairProbeResult['moved'] = []): PairProbeResult => ({
  skillId: skill, supportId: support, fit: 'host', probe: 'dummy',
  verdict, identicalSeeds: verdict === 'inert' ? 1 : 0, seeds: 1, moved, dOutputRel: 0, warnings: [],
});
const mkUnit = (key: string, verdict: UnitProbeResult['verdict'], compositional = false): UnitProbeResult => ({
  unit: { key, kind: 'field', describe: key, ...(compositional ? { compositional: true } : {}) },
  verdict, movedVsFull: [],
});
const mkDeep = (skill: string, support: string, pairVerdict: PairVerdictKind,
  units: UnitProbeResult[]): PairDeepResult => ({
  skillId: skill, supportId: support, fit: 'host', probe: 'dummy', seeds: 1,
  pairVerdict, dOutputRel: 0.2, units, episodesRun: 0, warnings: [],
});

{
  const uni = mkCensus(['s1', 's2', 's3'], ['g1', 'g2']);
  // D1 defect distillation
  const defects = observedDefects({
    probed: [
      mkProbe('s1', 'g1', 'inert'),
      mkProbe('s2', 'g1', 'cost_only', [{ key: 'mana_floor', bare: 1, pair: 0.9, rel: 0.1 }]),
      mkProbe('s3', 'g1', 'effective'), mkProbe('s1', 'g2', 'blind'), mkProbe('s2', 'g2', 'negligible'),
    ],
    deep: [
      mkDeep('s3', 'g1', 'effective', [mkUnit('trail', 'dead'), mkUnit('mods[0]', 'contributing')]),
      mkDeep('s3', 'g2', 'effective', [mkUnit('grantsTags', 'dead', true)]),   // compositional only
      mkDeep('s2', 'g2', 'effective', [mkUnit('x', 'unmeasured')]),
    ],
    census: uni,
  });
  const kinds = defects.map(d => `${d.skill}|${d.support}:${d.kind}`).sort();
  check('D1 defect distillation: inert + cost_only + partial, never blind/negligible/compositional',
    JSON.stringify(kinds) === JSON.stringify(['s1|g1:inert', 's2|g1:cost_only', 's3|g1:partial']), kinds.join(' '));

  // D2 the ratchet
  const ledger: SupportLedger = {
    version: 1,
    pairs: [
      { skill: 's1', support: 'g1', kind: 'inert', status: 'open', note: 'known' },
      { skill: 's2', support: 'g1', kind: 'inert', status: 'intended', note: 'by design', since: '2026-01-01' },
      { skill: 's3', support: 'g2', kind: 'inert', status: 'open' },          // will resolve (probed healthy)
      { skill: 's3', support: 'g1', kind: 'partial', status: 'open' },        // needs deep to verify
      { skill: 'zz', support: 'g1', kind: 'inert', status: 'open' },          // out of universe
    ],
    suspects: [
      { skill: 's1', support: 'g2', status: 'open' },                          // still observed below
      { skill: 's2', support: 'g2', status: 'open' },                          // resolved (not observed)
    ],
  };
  const observed = {
    probed: [
      mkProbe('s1', 'g1', 'inert'),                    // known open
      mkProbe('s2', 'g1', 'cost_only'),                // kind drift (was inert, intended)
      mkProbe('s3', 'g2', 'effective'),                // resolves the s3+g2 row
      mkProbe('s2', 'g2', 'inert'),                    // NEW defect
      mkProbe('out', 'g1', 'inert'),                   // defect outside universe — sliced gate ignores
    ],
    census: mkCensus(['s1', 's2', 's3'], ['g1', 'g2'], [
      { skillId: 's1', supportId: 'g2', fit: 'refused', suspect: [{ tag: 'projectile', evidence: 'delivery fires flights' }] },
      { skillId: 's3', supportId: 'g2', fit: 'refused', suspect: [{ tag: 'melee', evidence: 'delivery is a swing' }] }, // NEW suspect
    ]),
  };
  const chk = checkLedger(ledger, observed);
  check('D2 new defect flagged (breach)', chk.newDefects.length === 1
    && chk.newDefects[0].skill === 's2' && chk.newDefects[0].support === 'g2' && chk.breach);
  check('D3 out-of-universe defect never gates a sliced check',
    !chk.newDefects.some(d => d.skill === 'out'));
  check('D4 known open + intended re-confirmed', chk.knownOpen.length === 1 && chk.knownIntended.length === 1);
  check('D5 kind drift detected, not a breach source',
    chk.driftedKind.length === 1 && chk.driftedKind[0].row.skill === 's2' && chk.driftedKind[0].now.kind === 'cost_only');
  check('D6 resolved row detected (probed healthy)', chk.resolved.length === 1 && chk.resolved[0].skill === 's3' && chk.resolved[0].support === 'g2');
  check('D7 partial row without a deep run stays unverified',
    chk.unverified.length === 1 && chk.unverified[0].kind === 'partial');
  check('D8 out-of-universe ledger row untouched', chk.outOfScope.length === 1 && chk.outOfScope[0].skill === 'zz');
  check('D9 suspects: new flagged, known kept, missing resolved',
    chk.newSuspects.length === 1 && chk.newSuspects[0].skillId === 's3'
    && chk.knownSuspects.length === 1 && chk.resolvedSuspects.length === 1 && chk.resolvedSuspects[0].skill === 's2');

  // D10 reconcile: adds/removes/updates with adjudications preserved
  const rec = reconcileLedger(ledger, observed, '2026-07-20');
  const recPairs = rec.ledger.pairs;
  check('D10 reconcile adds the new defect as open + stamped',
    rec.added.length === 1 && recPairs.some(r => r.skill === 's2' && r.support === 'g2' && r.status === 'open' && r.since === '2026-07-20'));
  check('D11 reconcile removes the resolved row only',
    rec.removed.length === 1 && !recPairs.some(r => r.skill === 's3' && r.support === 'g2')
    && recPairs.some(r => r.skill === 'zz'));
  check('D12 kind drift refreshed with status/note/since preserved',
    rec.updated.length === 1 && recPairs.some(r => r.skill === 's2' && r.support === 'g1'
      && r.kind === 'cost_only' && r.status === 'intended' && r.note === 'by design' && r.since === '2026-01-01'));
  check('D13 reconcile handles suspects both ways',
    rec.addedSuspects.length === 1 && rec.removedSuspects.length === 1);
  const chk2 = checkLedger(rec.ledger, observed);
  check('D14 reconcile is idempotent (re-check: no breach, nothing to resolve or drift)',
    !chk2.breach && chk2.resolved.length === 0 && chk2.driftedKind.length === 0 && chk2.newSuspects.length === 0);

  // D15 adjudication laws
  const adj1 = adjudicate(rec.ledger, { skill: 's2', support: 'g2' }, { status: 'intended', note: 'proven fine' });
  check('D15 adjudicate re-statuses an existing pair row', 'where' in adj1 && adj1.where === 'pairs'
    && recPairs.find(r => r.skill === 's2' && r.support === 'g2')?.status === 'intended');
  const adj2 = adjudicate(rec.ledger, { skill: 'nope', support: 'g1' }, { status: 'open' });
  check('D16 adjudicate refuses a missing row (rows are minted by reconcile)', 'error' in adj2);
  const adj3 = adjudicate(rec.ledger, { skill: 's1', support: 'g1' }, { status: 'intended' });
  check('D17 intended demands a written note', 'error' in adj3);
  const adj4 = adjudicate(rec.ledger, { skill: 's1', support: 'g2' }, { status: 'intended', note: 'cones refuse aoe by design' });
  check('D18 adjudicate reaches suspect rows', 'where' in adj4 && adj4.where === 'suspects');

  // D19 merge + rig guards
  const m = mergeProbed([[mkProbe('s1', 'g1', 'inert')], [mkProbe('s1', 'g1', 'effective'), mkProbe('s2', 'g1', 'inert')]]);
  check('D19 merge folds dupes and records verdict conflicts',
    m.probed.length === 2 && m.dupes === 1 && m.conflicts.length === 1 && m.conflicts[0].verdicts.join(',') === 'inert,effective');
  const rigA = rigSignatureOf({ seeds: 1, baseSeed: 1, level: 12 });
  const rigB = rigSignatureOf({ seeds: 1, baseSeed: 2, level: 12 });
  check('D20 rig mismatch names the differing knob', rigMismatches(rigA, rigB).join(',') === 'baseSeed'
    && rigMismatches(rigA, rigA).length === 0);

  // D21 validation lint
  const issues = validateLedger(
    { version: 1, pairs: [{ skill: 'firebolt', support: 'not_a_gem', kind: 'inert', status: 'open' },
      { skill: 'firebolt', support: 'not_a_gem', kind: 'inert', status: 'open' }], suspects: [] },
    { skills: new Set(Object.keys(SKILLS)), supports: new Set(Object.keys(SUPPORTS)) });
  check('D21 validation flags unknown ids and duplicates', issues.length >= 2);
  check('D22 an empty ledger validates clean', validateLedger(emptyLedger(),
    { skills: new Set(), supports: new Set() }).length === 0);

  // D23–D25: structural resolution — the excludeTags exit, defect-overtaken
  // partials, and removed-content retirement.
  const ledger2: SupportLedger = {
    version: 1,
    pairs: [
      { skill: 's1', support: 'g1', kind: 'inert', status: 'open' },    // census refuses now
      { skill: 's2', support: 'g1', kind: 'partial', status: 'open' },  // probe reads inert (no deep)
    ],
    suspects: [],
  };
  const observed2 = {
    probed: [mkProbe('s2', 'g1', 'inert')],
    census: mkCensus(['s1', 's2'], ['g1'], [
      { skillId: 's1', supportId: 'g1', fit: 'refused' },
      { skillId: 's2', supportId: 'g1', fit: 'host' },
    ]),
  };
  const chk3 = checkLedger(ledger2, observed2);
  check('D23 a pair the census now REFUSES resolves structurally (the excludeTags exit retires its row)',
    chk3.resolved.length === 1 && chk3.resolved[0].skill === 's1' && !chk3.breach);
  check('D24 a partial row overtaken by a pair-level defect drifts without the deep lane',
    chk3.driftedKind.length === 1 && chk3.driftedKind[0].now.kind === 'inert' && chk3.unverified.length === 0);
  const rec3 = reconcileLedger(
    { version: 1, pairs: [{ skill: 'gone_skill', support: 'g1', kind: 'inert', status: 'open' }], suspects: [] },
    { probed: [], census: mkCensus(['s1'], ['g1']) }, '2026-07-20',
    { skills: new Set(['s1']), supports: new Set(['g1']) });
  check('D25 reconcile retires rows whose ids left the registry (removed content)',
    rec3.removed.length === 1 && rec3.ledger.pairs.length === 0);

  // D26 — the committed serialization: one row per line, valid JSON, roundtrip-exact.
  const serial: SupportLedger = {
    version: 1, note: 'probe',
    pairs: [
      { skill: 'b', support: 'g', kind: 'inert', status: 'open', note: 'x', since: '2026-07-20' },
      { skill: 'a', support: 'g', kind: 'partial', status: 'intended', units: ['mods[1]'] },
    ],
    suspects: [{ skill: 'c', support: 'h', status: 'open', tags: ['melee'] }],
  };
  const json = ledgerToJson(serial);
  const parsed = JSON.parse(json) as SupportLedger;
  check('D26 ledger serialization: one row per line, roundtrip-exact, sorted',
    JSON.stringify(parsed) === JSON.stringify(serial)                      // ledgerToJson sorted in place
    && json.split('\n').filter(l => l.trim().startsWith('{"skill"')).length === 3
    && parsed.pairs[0].skill === 'a');
}

// === RIG E — the live pipeline ==============================================

const BLANK_ID = '__probe_blank__';
const TWOUNIT_ID = '__probe_twounit__';
const MIXED_ID = '__probe_mixed__';
const synth = (id: string, mods: SupportDef['mods']): SupportDef => ({
  id, name: id, description: 'probe fixture', color: '#fff',
  requiresTags: ['projectile'], mods, weight: 0,
});

try {
  SUPPORTS[BLANK_ID] = synth(BLANK_ID, []);
  SUPPORTS[TWOUNIT_ID] = synth(TWOUNIT_ID, [mod('damage', 'increased', 0.5), mod('moveTrail', 'flat', 40)]);
  SUPPORTS[MIXED_ID] = synth(MIXED_ID, [mod('damage', 'increased', 0.5), mod('ambushBonus', 'flat', 0.3)]);
  const host: SkillDef = SKILLS.firebolt;
  check('E0 fixture host exists (firebolt, projectile spell)', !!host && host.delivery.type === 'projectile');

  const sess = makeProbeSession({ seeds: 1 });
  const rowOf = (supportId: string): CensusRow => ({ skillId: 'firebolt', supportId, fit: 'host' });

  // E1 — the identity-gem law: socket accepted, nothing changes, INERT read.
  const blank = probePair(sess, rowOf(BLANK_ID));
  check('E1 identity-only gem reads INERT (the A/B oracle end to end)',
    blank.result.verdict === 'inert' && blank.result.identicalSeeds === 1, blank.result.verdict);

  // E2 — the constructed live+dead gem: static expectation, pair verdict,
  // per-unit attribution, and the partial-defect pipeline.
  const unread = unreadPayloadRows(SUPPORTS[TWOUNIT_ID], host, id => SKILLS[id]);
  check('E2 static read-sites flag the dead stat (moveTrail unread on a flight)',
    unread.some(r => String(r.key) === 'moveTrail'));
  const two = probePair(sess, rowOf(TWOUNIT_ID));
  check('E3 live+dead gem reads EFFECTIVE at pair level', two.result.verdict === 'effective', two.result.verdict);
  const deep = deepProbePair(sess, rowOf(TWOUNIT_ID), two);
  const uDamage = deep.units.find(u => u.unit.key === 'mods[0]');
  const uTrail = deep.units.find(u => u.unit.key === 'mods[1]');
  check('E4 deep: the damage row is the sole carrier', uDamage?.verdict === 'sole_carrier', uDamage?.verdict);
  check('E5 deep: the unread stat row is DEAD (the flagged-as-working catch)', uTrail?.verdict === 'dead', uTrail?.verdict);
  const partialDefects = observedDefects({
    probed: [two.result], deep: [deep],
    census: mkCensus(['firebolt'], [TWOUNIT_ID]),
  });
  check('E6 partial defect distilled with the dead unit named',
    partialDefects.length === 1 && partialDefects[0].kind === 'partial'
    && (partialDefects[0].units ?? []).join(',') === 'mods[1]');

  // E7–E9 — THE DEFENSIVE-STAT LANE: gems whose worth shows only under
  // incoming wounds route LIVE and MEASURE there (they used to read
  // false-INERT/blind against a dummy that never swings back), while the
  // genuinely unmeasurable classes keep their guards at both levels.
  const armorGem = synth('__probe_armor__', [mod('armor', 'flat', 1500)]);
  SUPPORTS['__probe_armor__'] = armorGem;
  const leechGem = synth('__probe_leech__', [mod('lifeLeech', 'flat', 0.05)]);
  SUPPORTS['__probe_leech__'] = leechGem;
  const armorKind = probeKindFor(host, armorGem);
  check('E7 defensive/sustain stats route the probe LIVE, naming the stat',
    armorKind.kind === 'live' && (armorKind.why ?? '').includes('armor')
    && probeKindFor(host, leechGem).kind === 'live', armorKind.why ?? '');
  // Wound-DEPENDENT fixtures ride the SHIPPING rig's seed count. HISTORY
  // (2026-07-21, the order-law fix): under polluted actor ids every
  // bare-vs-pair diverged spuriously, and E8 "passed" by measuring that
  // noise as armor value. The id-clean rig exposed the truth these pins
  // now record:
  //  · E8 — a SOCKETED armor-only gem is byte-DEAD: support mods are
  //    skill-local (instanceMods extra), and global defense queries
  //    (mitigation's victim.sheet.get('armor')) never see them. THE
  //    DEFENSIVE-SOCKET GAP — real gems on this shape (colossus_stance,
  //    untouched_might, monolith's armor half) sit honestly inert in the
  //    ledger until the design call lands (equip-global fold vs refusal).
  //    When that fold ships, flip this pin back to 'effective'.
  //  · E9 — leech DOES read skill-locally (the packet carries instance
  //    mods to attacker-side hit reactions), so its pair genuinely
  //    diverges — negligible-or-better, never byte-dead.
  const woundSess = makeProbeSession({ seeds: 2 });
  const armor = probePair(woundSess, rowOf('__probe_armor__'));
  check('E8 the DEFENSIVE-SOCKET GAP stands recorded: a socketed armor-only gem reads byte-DEAD (skill-local mods never reach global defense queries)',
    armor.result.verdict === 'inert' && armor.result.probe === 'live',
    `${armor.result.verdict}; top moved: ${armor.result.moved[0]?.key ?? '—'}`);
  const leech = probePair(woundSess, rowOf('__probe_leech__'));
  check('E9 a leech-only gem READS through the packet\'s skill-local lane (diverges live — negligible-or-better, never byte-dead)',
    leech.result.verdict !== 'inert' && leech.result.verdict !== 'blind' && leech.result.probe === 'live',
    `${leech.result.verdict}; top moved: ${leech.result.moved[0]?.key ?? '—'}`);
  const mixed = probePair(sess, rowOf(MIXED_ID));
  check('E9b mixed damage+ambush gem reads EFFECTIVE (damage half carries)',
    mixed.result.verdict === 'effective', mixed.result.verdict);
  const deepMixed = deepProbePair(sess, rowOf(MIXED_ID), mixed);
  const uAmbush = deepMixed.units.find(u => u.unit.key === 'mods[1]');
  check('E9c deep: the ambush row is unmeasured-blind in isolation, never a false dead',
    uAmbush?.verdict === 'unmeasured' && (uAmbush?.note ?? '').includes('blind'), `${uAmbush?.verdict}: ${uAmbush?.note ?? ''}`);
  const ambushOnly = synth('__probe_ambush__', [mod('ambushBonus', 'flat', 0.3)]);
  SUPPORTS['__probe_ambush__'] = ambushOnly;
  const ambush = probePair(sess, rowOf('__probe_ambush__'));
  check('E9d an ambush-only gem reads BLIND at pair level (never a false inert)',
    ambush.result.verdict === 'blind', ambush.result.verdict);

  // E10 — determinism: fresh sessions, byte-identical results.
  const d1 = probePair(makeProbeSession({ seeds: 1 }), rowOf(TWOUNIT_ID));
  const d2 = probePair(makeProbeSession({ seeds: 1 }), rowOf(TWOUNIT_ID));
  check('E10 verdicts are byte-deterministic across fresh sessions',
    JSON.stringify(d1.result) === JSON.stringify(d2.result));

  // E10b — THE ORDER LAW (2026-07-21): verdicts are byte-deterministic
  // WITHIN a session regardless of probe order. Actor ids feed per-body
  // variety salts (ai.ts cadence jitter), so without the episode id reset
  // (runner.ts resetActorIdCounter) the Nth probe of a session diverged
  // from the 1st at the same seed and marginal pairs flipped with order.
  {
    const sess = makeProbeSession({ seeds: 1 });
    const o1 = probePair(sess, rowOf(TWOUNIT_ID));
    probePair(sess, rowOf(BLANK_ID));
    probePair(sess, rowOf(MIXED_ID));
    const o2 = probePair(sess, rowOf(TWOUNIT_ID));
    check('E10b verdicts are order-independent within one session',
      JSON.stringify(o1.result) === JSON.stringify(o2.result));
  }

  // E11 — matrix bookkeeping: pairs allow-list, then a resume skip.
  const pairsOpt = [{ skill: 'firebolt', support: BLANK_ID }, { skill: 'firebolt', support: TWOUNIT_ID }];
  const run1 = runCompatMatrix({ seeds: 1, budget: 1e6, pairs: pairsOpt });
  check('E11 pairs allow-list scopes the run exactly', run1.scope === 2 && run1.probed.length === 2 && run1.skipped === 0);
  const run2 = runCompatMatrix({
    seeds: 1, budget: 1e6, pairs: pairsOpt,
    skipPairs: new Set(run1.probed.map(p => pairKey(p.skillId, p.supportId))),
  });
  check('E12 resume skip: carried pairs never re-probe', run2.probed.length === 0 && run2.resumed === 2);

  // E13 — the dossier end to end on a REAL shipped pair.
  const x = explainPair(makeProbeSession({ seeds: 1 }), 'firebolt', 'detonating_passage', { probes: true, deep: true });
  check('E13 dossier: real pair fits, gate agrees, probe effective, trail attributed, prescriptions written',
    x.fit.fit === 'host' && x.fit.agrees && x.probe?.verdict === 'effective'
    && !!x.deep?.units.some(u => u.unit.key === 'trail' && (u.verdict === 'sole_carrier' || u.verdict === 'contributing'))
    && x.prescriptions.length > 0);
} finally {
  delete SUPPORTS[BLANK_ID];
  delete SUPPORTS[TWOUNIT_ID];
  delete SUPPORTS[MIXED_ID];
  delete SUPPORTS['__probe_armor__'];
  delete SUPPORTS['__probe_leech__'];
  delete SUPPORTS['__probe_ambush__'];
}
check('E14 synthetic fixtures cleaned out of the registry',
  !Object.keys(SUPPORTS).some(k => k.startsWith('__probe_') || k.startsWith('__mask__') || k.startsWith('__chk__') || k.startsWith('__solo__')));

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
