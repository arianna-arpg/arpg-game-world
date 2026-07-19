// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE HARBORWARDEN + THE COMPANY LANE end to end
// (data/vocations.ts HARBORWARDEN + the merc levers in meta/mercs.ts /
// engine/world.ts; docs/engine/harborholds.md §vocation). Pins:
//   - THE DEF: the secret vocation stands registered — open discovery (any
//     class), the Mooring Stone sited on OPEN harborholds only, step 1
//     deed-gated on ports_defended, and the two signature nodes present
//     (Fair Company = mercEase 1; The Free Company keystone = mercRetinue 1)
//     with every step's tileset + roster id resolving,
//   - THE SITE AXIS (live): zoneMatchesSiteFilter admits an OPEN hold zone,
//     refuses the same ground besieged, refuses plain country,
//   - THE SCALING LAW (live): a hired blade weighs partyScaleWeight of a
//     player on fresh enemies (coopScale is linear — fractional seats
//     compose exactly); mercEase 1 returns spawn scaling to the TRUE SOLO
//     CURVE with the blade still seated,
//   - THE RETINUE (live): the hire gate reads floor(maxHired + mercRetinue)
//     — cap 1 refuses a second contract, the keystone stat admits it on
//     distinct seats ('m0','m1'), and the company saves + restores whole
//     (the legacy single-contract field still folds in),
//   - THE PURSE + THE VIGOR (live): mercHireDiscount prices exactly;
//     mercVigor rides the blade's own sheet as the 'patron' source,
//   - dismissal strikes ONE contract by index and the whole company absent.
// Run: npx tsx balance/probe_harborwarden.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { COOP_SCALING } from '../src/data/coop';
import { HARBORHOLD_CFG } from '../src/data/harborholds';
import { MONSTERS } from '../src/data/monsters';
import { TILESETS } from '../src/data/tilesets';
import { VOCATIONS } from '../src/data/vocations';
import { MERC_CFG } from '../src/meta/mercs';
import { serializeCharacter, applySavedCharacter } from '../src/meta/character';
import { mod } from '../src/engine/stats';
import { cellKind, continentSeedFrom } from '../src/world/continents';
import { clearSeaMemo, seaOfCell, type Sea } from '../src/world/seas';
import type { World } from '../src/engine/world';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const step = (w: World, dt: number, n: number): void => { for (let i = 0; i < n; i++) w.update(dt); };

bootSimEngine();
seedGlobalRandom(0x4a5d);

/** A minimal legal warrior snapshot (the template shape, hand-rolled so the
 *  probe never reaches into private builders). */
const SNAP = (level: number) => ({
  classId: 'warrior', level,
  baseAttrs: { might: 8, intellect: 3, cunning: 4, will: 3, presence: 3 } as never,
  allocated: ['str_start'],
  vocations: [],
  knownSkills: [{ skillId: 'cleave', level: 1, rarity: 'magic' as const, sockets: [null, null] }],
  bar: ['cleave', null, null, null, null],
  equipped: {},
});

// ------------------------------------------------ A. the def laws
{
  const v = VOCATIONS.harborwarden;
  check('A: the Harborwarden stands registered', !!v && v.name === 'Harborwarden');
  if (v) {
    check('A: discovery is OPEN (any class hears the stone)', v.secret?.classLockedDiscovery === false);
    check('A: the Mooring Stone sites on OPEN holds only',
      v.secret?.site.npc === 'mooring_stone' && v.secret?.site.filter.harborhold === 'open');
    check('A: step 1 is DEED-gated on ports_defended', v.quest.steps[0]?.requiresLedger === 'ports_defended');
    const ease = v.tree.find(n => n.mods?.some(m => m.stat === 'mercEase'));
    const ret = v.tree.find(n => n.mods?.some(m => m.stat === 'mercRetinue'));
    check('A: Fair Company grants full ease (mercEase 1, notable)',
      !!ease && ease.kind === 'notable' && ease.mods!.find(m => m.stat === 'mercEase')!.value === 1);
    check('A: The Free Company grants a second blade (mercRetinue 1, keystone)',
      !!ret && ret.kind === 'keystone' && ret.mods!.find(m => m.stat === 'mercRetinue')!.value === 1);
    const badTs = v.quest.steps.filter(s => !TILESETS[s.zone.tileset ?? '']);
    const badMon = v.quest.steps.flatMap(s => [
      ...(s.zone.packsOverride?.table ?? []).map(r => r.id),
      ...(s.zone.objective?.kind === 'boss' ? [s.zone.objective.id] : []),
    ]).filter(id => !MONSTERS[id]);
    check('A: every step tileset + roster id resolves', badTs.length === 0 && badMon.length === 0,
      [...badTs.map(s => s.zone.tileset), ...badMon].join(',') || 'all clean');
    check('A: the shrine NPC stands in the bestiary of fixtures', !!MONSTERS.mooring_stone
      && MONSTERS.mooring_stone.passive === true && MONSTERS.mooring_stone.invulnerable === true);
  }
}

// ------------------------------------------------ B. the live rigs
{
  // A world with a hold-bearing sea (the probe_harborholds hunt idiom).
  let w = makeSimWorld('warrior', 0x4a5d01);
  let sea: Sea | null = null;
  for (const ws of [0x4a5d01, 0x4a5d02, 0x4a5d03, 0x4a5d04, 0x4a5d05]) {
    const cand = makeSimWorld('warrior', ws);
    clearSeaMemo();
    const s = firstSeaWithPorts(cand.sim.biomeField.fieldSeed, 1);
    if (s) { w = cand; sea = s; break; }
  }
  check('B: a ported sea stands for the rig', !!sea);
  if (sea) {
    const info = w.devEnsureSea(sea.ports[0].shore)!;
    const hz = info.ports.map(p => w.zoneMap[p.id]).find(z => z.harborhold);
    check('B: a hold minted', !!hz);
    if (hz) {
      // THE SITE AXIS: besieged refuses, open admits, plain country refuses.
      const wAny = w as unknown as { zoneMatchesSiteFilter(d: unknown, f: unknown): boolean };
      const f = { harborhold: 'open' };
      check('B: the axis refuses a BESIEGED hold', wAny.zoneMatchesSiteFilter(hz, f) === false);
      w.devSetHoldState(hz.id, 'open');
      check('B: the axis admits an OPEN hold', wAny.zoneMatchesSiteFilter(hz, f) === true);
      const plain = Object.values(w.zoneMap).find(z => !z.harborhold && z.objective.kind !== 'safe');
      check('B: the axis refuses plain country', !!plain && wAny.zoneMatchesSiteFilter(plain, f) === false);
      check('B: harborhold:true admits any hold state', wAny.zoneMatchesSiteFilter(hz, { harborhold: true }) === true);
    }
  }

  // THE SCALING LAW — enemy spawn scaling under a fractional company seat.
  const w2 = makeSimWorld('warrior', 0x4a5d10);
  const spawnFoe = (): number => {
    const m = w2.createMonster('zombie', 5, 'enemy');
    w2.actors.push(m);
    (w2 as unknown as { applyPartyScale(a: unknown): void }).applyPartyScale(m);
    return m.maxLife();
  };
  const solo = spawnFoe();
  w2.restoreHiredMerc({ name: 'Probe Blade', snapshot: SNAP(1) as never, templateId: 'sellsword' });
  check('B: the blade seats (m0, merc-flagged)', w2.hiredMercs.length === 1
    && w2.hiredMercs[0].seat.id === 'm0' && !!w2.hiredMercs[0].seat.merc);
  const withMerc = spawnFoe();
  const wantMul = 1 + COOP_SCALING.lifePerPlayer * MERC_CFG.partyScaleWeight;
  check('B: a blade weighs partyScaleWeight of a player on fresh foes',
    Math.abs(withMerc / solo - wantMul) < 0.01, `×${(withMerc / solo).toFixed(3)} vs ×${wantMul}`);
  w2.player.sheet.setSource('probe_ease', [mod('mercEase', 'flat', 1)]);
  const eased = spawnFoe();
  check('B: FAIR COMPANY returns the TRUE SOLO CURVE (blade still seated)',
    Math.abs(eased / solo - 1) < 0.005, `×${(eased / solo).toFixed(3)}`);
  w2.player.sheet.removeSource('probe_ease');

  // THE RETINUE — the hire gate, the second seat, the strike-one dismissal.
  const cap0 = w2.mercHireCap();
  check('B: the base cap is one blade', cap0 === Math.max(1, Math.floor(MERC_CFG.maxHired)));
  const captain = w2.createMonster('merc_captain', 1, 'enemy');
  w2.actors.push(captain);
  w2.mercOutpost = {
    captain,
    offers: [
      { kind: 'template', refId: 'sellsword', name: 'First Blade', classId: 'warrior', blurb: 'probe' },
      { kind: 'template', refId: 'sellsword', name: 'Second Blade', classId: 'warrior', blurb: 'probe' },
    ],
  };
  w2.account.credits = 10_000;
  check('B: a full company refuses the hire at cap', w2.hireMercenary(0) === false && w2.hiredMercs.length === 1);
  w2.player.sheet.setSource('probe_retinue', [mod('mercRetinue', 'flat', 1)]);
  check('B: the keystone stat opens the second contract', w2.mercHireCap() === cap0 + 1
    && w2.hireMercenary(0) === true && w2.hiredMercs.length === 2);
  check('B: the company seats distinctly (m0 + m1)',
    new Set(w2.hiredMercs.map(hm => hm.seat.id)).size === 2
    && w2.hiredMercs.some(hm => hm.seat.id === 'm1'));

  // THE PURSE — exact discounted pricing.
  const offer = w2.mercOutpost.offers[0];
  const base = w2.mercHireCost(offer);
  w2.player.sheet.setSource('probe_purse', [mod('mercHireDiscount', 'flat', 0.25)]);
  check('B: the purse discounts exactly', w2.mercHireCost(offer) === Math.max(1, Math.round(base * 0.75)),
    `${base} → ${w2.mercHireCost(offer)}`);
  w2.player.sheet.removeSource('probe_purse');

  // THE VIGOR — the 'patron' source on the blade's own sheet.
  const w3 = makeSimWorld('warrior', 0x4a5d11);
  w3.restoreHiredMerc({ name: 'Plain Blade', snapshot: SNAP(1) as never, templateId: 'sellsword' });
  const plainLife = w3.hiredMercs[0].seat.actor.maxLife();
  const w4 = makeSimWorld('warrior', 0x4a5d11);
  w4.player.sheet.setSource('probe_vigor', [mod('mercVigor', 'flat', 0.2)]);
  w4.restoreHiredMerc({ name: 'Iron Blade', snapshot: SNAP(1) as never, templateId: 'sellsword' });
  const ironLife = w4.hiredMercs[0].seat.actor.maxLife();
  check("B: IRON COMPANY rides the blade's sheet (life ×1.2 via 'patron')",
    Math.abs(ironLife / plainLife - 1.2) < 0.02, `${plainLife} → ${ironLife}`);

  // THE SAVE — the company rides whole; the legacy field folds in.
  const save = serializeCharacter(w2);
  check('B: the save carries the company', (save.mercenaries?.length ?? 0) === 2);
  const w5 = makeSimWorld('warrior', 0x4a5d12);
  applySavedCharacter(w5, save);
  check('B: the company restores whole (both seats)', w5.hiredMercs.length === 2
    && new Set(w5.hiredMercs.map(hm => hm.seat.id)).size === 2);
  const legacy = JSON.parse(JSON.stringify(save));
  legacy.mercenary = legacy.mercenaries[0];
  delete legacy.mercenaries;
  const w6 = makeSimWorld('warrior', 0x4a5d13);
  applySavedCharacter(w6, legacy);
  check('B: a LEGACY single-contract save folds into a one-blade company', w6.hiredMercs.length === 1);

  // DISMISSAL — strike one by index; the rest stand.
  const firstName = w2.hiredMercs[0].name;
  w2.dismissMercenary(undefined, 0);
  check('B: dismissal strikes ONE contract by index', w2.hiredMercs.length === 1
    && w2.hiredMercs[0].name !== firstName);
  w2.dismissMercenary();
  check('B: the run-end path releases the whole company', w2.hiredMercs.length === 0);
}

function firstSeaWithPorts(fs: number, min = 1): Sea | null {
  const contSeed = continentSeedFrom(fs);
  for (let r = 0; r <= 12; r++) {
    for (let gy = -r; gy <= r; gy++) {
      for (let gx = -r; gx <= r; gx++) {
        if (Math.max(Math.abs(gx), Math.abs(gy)) !== r) continue;
        if (cellKind(gx, gy, contSeed) !== 'ocean') continue;
        const s = seaOfCell(gx, gy, contSeed);
        if (s.ports.length >= min) return s;
      }
    }
  }
  return null;
}

// Silence the unused-import guard for step (kept for future timing rigs).
void step; void HARBORHOLD_CFG;

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 2 : 0);
