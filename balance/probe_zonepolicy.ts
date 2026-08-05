// THE ZONE-POLICY PROBE — the layout half of zonePolicy.ts stands beside the
// biome half, and both read through THE ONE DATA-SOURCE SEAM (policyFor).
// Born with the layout policy table (batch 34): the table SHIPS EMPTY, so the
// load-bearing promise is ABSENT == IDENTICAL — with no row authored, every
// existing caller's verdict is exactly the old biome-only read.
//
// The promises this rig pins:
//   A. THE EMPTY-TABLE A/B — factionAllowed/eventAllowed swept exhaustively
//      over (every registered biome + none) × (every registered layout + none
//      + an unregistered id) × the whole meaningful id universe (every
//      FACTIONS key, every id any biome's four policy lists name, the empty
//      string world.ts really passes, and never-listed synthetics), each
//      verdict compared against the OLD biome-only logic byte-copied as the
//      oracle. Divergence anywhere is a fail; the sweep must also genuinely
//      exercise refusals (a sweep of all-true would prove nothing). The
//      registry census light guards the sweep's layout axis: one id from each
//      registrar module (levelgen / layoutRecipes / interiorGen / massif /
//      settled / tiers) must be registered, so a boot that misses a module
//      cannot quietly shrink the sweep.
//   B. THE COMPOSED AND — authored layout rows gate: a layout deny refuses a
//      faction its biome admits, a layout allow list whitelists, a biome deny
//      still refuses whatever the layout allows (AND both ways), events
//      mirror factions, an EMPTY allow list abstains, an unregistered
//      layoutType abstains, and re-registering an id REPLACES its row
//      (registerLayout's own idiom — an {} re-registration restores
//      biome-only verdicts).
//   C. THE SEAM — policyFor returns the claiming sources BY REFERENCE in
//      biome-then-layout order (the manifest-install point is one function);
//      eventTargetable and holdfastHostable route the composed verdict; and a
//      REAL ZoneDef flows in structurally, its own layoutType gating (the
//      "zone.layoutType actually gates something" done-when, on real data).
//
//   npx tsx balance/probe_zonepolicy.ts [-- --verbose]

import { BIOMES } from '../src/world/biomes';
import {
  factionAllowed, eventAllowed, eventTargetable, holdfastHostable,
  policyFor, registerLayoutPolicy, type PolicyZone, type TargetableZone,
} from '../src/world/zonePolicy';
import { FACTIONS } from '../src/data/monsters';
import { ZONES, type ZoneDef } from '../src/data/zones';
import { layoutIds } from '../src/engine/levelgen';
import { bootSimEngine } from '../src/sim/arena';

const VERBOSE = process.argv.includes('--verbose');
let fails = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) fails++;
};
const note = (msg: string): void => { if (VERBOSE) console.log(`  ${msg}`); };

bootSimEngine();

// THE ORACLE — the pre-seam biome-only logic, byte-copied. Independent of the
// refactor on purpose: if the fold ever drops the biome read (or the empty
// table ever speaks), the sweep diverges from THIS, not from itself.
const oldPasses = (id: string, deny?: string[], allow?: string[]): boolean => {
  if (deny && deny.includes(id)) return false;
  if (allow && allow.length > 0 && !allow.includes(id)) return false;
  return true;
};
const oldFactionAllowed = (faction: string, zone: PolicyZone): boolean => {
  const b = zone.biome ? BIOMES[zone.biome] : undefined;
  return !b || oldPasses(faction, b.denyFactions, b.allowFactions);
};
const oldEventAllowed = (eventId: string, zone: PolicyZone): boolean => {
  const b = zone.biome ? BIOMES[zone.biome] : undefined;
  return !b || oldPasses(eventId, b.denyEvents, b.allowEvents);
};

// The id universe, harvested from the data (never hardcoded): every rostered
// faction, every id any biome's policy lists mention (both domains — verdicts
// only ever read an id through list membership, so listed + never-listed
// covers every equivalence class), the '' world.ts passes for factionless
// monsters, and one synthetic per domain that no list will ever name.
const factionUniverse = new Set<string>(Object.keys(FACTIONS));
const eventUniverse = new Set<string>(['holdfast']);
for (const b of Object.values(BIOMES)) {
  for (const id of b.denyFactions ?? []) factionUniverse.add(id);
  for (const id of b.allowFactions ?? []) factionUniverse.add(id);
  for (const id of b.denyEvents ?? []) eventUniverse.add(id);
  for (const id of b.allowEvents ?? []) eventUniverse.add(id);
}
factionUniverse.add('');
factionUniverse.add('qa_unlisted_faction');
eventUniverse.add('qa_unlisted_event');

// --- RIG A: the empty-table A/B --------------------------------------------------
// MUST run before any registerLayoutPolicy call below — the shipped state is
// what it proves.
{
  const spread: [string, string][] = [
    ['plains', 'levelgen'], ['winding', 'layoutRecipes'], ['dungeon', 'interiorGen'],
    ['massif', 'massif'], ['fields', 'settled'], ['needles', 'tiers'],
  ];
  const missing = spread.filter(([id]) => !layoutIds().includes(id));
  check('A0 the layout registry census — one id per registrar module present',
    missing.length === 0,
    missing.length ? `missing ${missing.map(([i, m]) => `'${i}' (${m})`).join(', ')}`
      : `${layoutIds().length} layouts registered`);

  check('A1 no layout ships a policy row (policyFor abstains for every registered id)',
    layoutIds().every(id => policyFor({ layoutType: id }).length === 0));

  const biomeAxis: (string | undefined)[] = [undefined, ...Object.keys(BIOMES)];
  const layoutAxis: (string | undefined)[] = [undefined, ...layoutIds(), 'qa_unregistered_layout'];
  let swept = 0, refused = 0, diverged = 0, firstDiff = '';
  for (const biome of biomeAxis) {
    for (const layoutType of layoutAxis) {
      const zone: PolicyZone = { biome, layoutType };
      for (const f of factionUniverse) {
        swept++;
        const now = factionAllowed(f, zone);
        if (!now) refused++;
        if (now !== oldFactionAllowed(f, zone)) {
          diverged++;
          if (!firstDiff) firstDiff = `faction '${f}' @ ${biome ?? '-'}/${layoutType ?? '-'}`;
        }
      }
      for (const e of eventUniverse) {
        swept++;
        const now = eventAllowed(e, zone);
        if (!now) refused++;
        if (now !== oldEventAllowed(e, zone)) {
          diverged++;
          if (!firstDiff) firstDiff = `event '${e}' @ ${biome ?? '-'}/${layoutType ?? '-'}`;
        }
      }
    }
  }
  check('A2 EMPTY TABLE == BIOME-ONLY — every verdict matches the old logic',
    diverged === 0, `${swept} verdicts swept${firstDiff ? `; first diff: ${firstDiff}` : ''}`);
  check('A3 the sweep genuinely exercised refusals (biome denies fired)',
    refused > 0, `${refused} refusals among ${swept}`);
  note(`universe: ${factionUniverse.size} faction ids × ${eventUniverse.size} event ids over `
    + `${biomeAxis.length} biomes × ${layoutAxis.length} layouts`);
}

// --- RIG B: the composed AND -----------------------------------------------------
// Test rows land on REAL registered layout ids (drawn deterministically from
// the sorted registry) — proving the key really is the id registerLayout
// takes. Each case uses its own id so no row contaminates another.
const lay = [...layoutIds()].sort();
const openBiome = Object.keys(BIOMES).find(id => {
  const b = BIOMES[id];
  return !b.denyFactions && !b.allowFactions && !b.denyEvents && !b.allowEvents;
});
const denyBiome = Object.keys(BIOMES).find(id =>
  (BIOMES[id].denyFactions?.length ?? 0) > 0 && (BIOMES[id].denyEvents?.length ?? 0) > 0);
{
  check('B0 the data offers an abstaining biome and a denying biome to test with',
    !!openBiome && !!denyBiome && lay.length >= 6, `open='${openBiome}', deny='${denyBiome}'`);

  // B1 — a layout DENY refuses what the biome admits; other ground untouched.
  registerLayoutPolicy(lay[0], { denyFactions: ['qa_unlisted_faction'] });
  check('B1 layout deny refuses on an abstaining biome (and only on its own layout)',
    !factionAllowed('qa_unlisted_faction', { biome: openBiome, layoutType: lay[0] })
    && factionAllowed('qa_unlisted_faction', { biome: openBiome })
    && factionAllowed('qa_unlisted_faction', { biome: openBiome, layoutType: lay[1] }));

  // B2 — a layout ALLOW list is a strict whitelist within its source.
  registerLayoutPolicy(lay[1], { allowFactions: ['qa_unlisted_faction'] });
  check('B2 layout allow list whitelists (listed passes, unlisted refused, off-layout free)',
    factionAllowed('qa_unlisted_faction', { biome: openBiome, layoutType: lay[1] })
    && !factionAllowed('qa_other_faction', { biome: openBiome, layoutType: lay[1] })
    && factionAllowed('qa_other_faction', { biome: openBiome }));

  // B3 — AND both ways: a biome deny stands whatever the layout allows, and a
  // layout deny stands whatever the biome allows (openBiome abstains ≡ allows).
  const deniedFaction = BIOMES[denyBiome ?? ''].denyFactions?.[0] ?? '';
  registerLayoutPolicy(lay[2], { allowFactions: [deniedFaction] });
  check('B3 biome deny survives a layout allow (AND, not override)',
    !factionAllowed(deniedFaction, { biome: denyBiome, layoutType: lay[2] })
    && factionAllowed(deniedFaction, { biome: openBiome, layoutType: lay[2] }));

  // B4 — events mirror factions through the same row shape.
  const deniedEvent = BIOMES[denyBiome ?? ''].denyEvents?.[0] ?? '';
  registerLayoutPolicy(lay[3], { denyEvents: ['qa_unlisted_event'], allowEvents: [] });
  check('B4 layout event deny gates and the biome event deny still ANDs in',
    !eventAllowed('qa_unlisted_event', { biome: openBiome, layoutType: lay[3] })
    && eventAllowed(deniedEvent, { biome: openBiome, layoutType: lay[3] })
    && !eventAllowed(deniedEvent, { biome: denyBiome, layoutType: lay[3] }));

  // B5 — an EMPTY allow list abstains (the `passes` law, layout side).
  registerLayoutPolicy(lay[4], { allowFactions: [], allowEvents: [] });
  check('B5 an empty allow list abstains',
    factionAllowed('qa_unlisted_faction', { biome: openBiome, layoutType: lay[4] })
    && eventAllowed('qa_unlisted_event', { biome: openBiome, layoutType: lay[4] }));

  // B6 — an unregistered layoutType abstains even with rows authored nearby.
  check('B6 an unregistered layoutType abstains',
    factionAllowed('qa_unlisted_faction', { biome: openBiome, layoutType: 'qa_unregistered_layout' }));

  // B7 — re-registration REPLACES the row (registerLayout's own idiom).
  registerLayoutPolicy(lay[0], {});
  check('B7 re-registering replaces — an {} row restores biome-only verdicts',
    factionAllowed('qa_unlisted_faction', { biome: openBiome, layoutType: lay[0] }));
}

// --- RIG C: the seam and its routed consumers ------------------------------------
{
  // C1 — policyFor answers BY REFERENCE, biome first, layout second.
  const row = { denyEvents: ['qa_seam_event'] };
  registerLayoutPolicy(lay[5], row);
  const both = policyFor({ biome: openBiome, layoutType: lay[5] });
  check('C1 policyFor returns the claiming sources by reference, biome then layout',
    policyFor({}).length === 0
    && policyFor({ biome: openBiome }).length === 1
    && policyFor({ biome: openBiome })[0] === BIOMES[openBiome ?? '']
    && both.length === 2 && both[0] === BIOMES[openBiome ?? ''] && both[1] === row);

  // C2 — eventTargetable routes the composed verdict on structurally open
  // ground (no cave/floating/special/pocket/sanctuary/kind gate in the way).
  const ground: TargetableZone = { biome: openBiome, layoutType: lay[5] };
  check('C2 eventTargetable refuses through the layout row (and passes beside it)',
    !eventTargetable('qa_seam_event', ground)
    && eventTargetable('qa_unlisted_event', ground)
    && eventTargetable('qa_seam_event', { biome: openBiome }));

  // C3 — holdfastHostable rides the same fold: a layout may deny 'holdfast'.
  registerLayoutPolicy(lay[6] ?? lay[5], { denyEvents: ['holdfast'] });
  check('C3 holdfastHostable routes the composed verdict',
    !holdfastHostable({ biome: openBiome, layoutType: lay[6] ?? lay[5] })
    && holdfastHostable({ biome: openBiome }));

  // C4 — a REAL ZoneDef flows in structurally and its OWN layoutType gates.
  // Resolved from the shipped zone table when one names a layout; a spread
  // onto a real zone otherwise (either way, ZoneDef-typed data end to end).
  const authored = Object.values(ZONES).find(z => z.layoutType);
  const zone: ZoneDef = authored ?? { ...ZONES.crossroads, layoutType: lay[7] ?? lay[5] };
  const layId = zone.layoutType ?? '';
  registerLayoutPolicy(layId, { denyFactions: ['qa_zonedef_faction'] });
  check('C4 a real ZoneDef\'s own layoutType gates through factionAllowed',
    !factionAllowed('qa_zonedef_faction', zone)
    && factionAllowed('qa_zonedef_faction', { ...zone, layoutType: undefined }),
    `zone '${zone.id}' (${authored ? 'authored' : 'spread'}), layout '${layId}'`);
}

console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
process.exit(fails === 0 ? 0 : 1);
