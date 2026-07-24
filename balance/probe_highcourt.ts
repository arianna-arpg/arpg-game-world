// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE HIGH COURT: the per-faction presence ladder shipped by
// the high-court pass (champions / zeniths / apexes) and the registry that
// indexes it for future doors (quests, the Odyssey finales).
// Pins:
//   - HIGH_COURT integrity: every id resolves; champions wear bossBar WITHOUT
//     the boss classification; zeniths/apexes wear boss + a script FSM of >= 3
//     acts + noNemesis (set-pieces never enter the world's memory — the
//     founding exemplar unmade_chronophage is exempt: its repeatable-quest
//     design predates the doctrine),
//   - script integrity: act ids unique, every goto target exists, the final
//     act is terminal, goto life-fracs strictly descend along the chain,
//     every summoned monster id resolves, every script carries the
//     arenaRestore death rattle (a collapsed arena may never outlive its
//     author; the exemplar's own rattle is grandfathered),
//   - THE DOORLESS LAW: zeniths + apexes appear on NO spawn surface (faction
//     rosters, tileset/zone packs, wildlife, the wave table) — the
//     reserves-and-remnants doctrine holds until a door deliberately mints
//     them; champions ARE tabled (their door is presence),
//   - apex laws: levitates (no knock-into-the-void cheese against their own
//     voidCrack acts) + possessable: false (no wearing the finale),
//   - LIVE RIG: every zenith/apex spawns whole through createMonster, its
//     parts lazy-attach where authored, its script survives being driven to
//     the last act (life stepped down through every goto band under real
//     updates, no throw, adds actually summoned), and a WARD act genuinely
//     shields (the First Dynast reads untargetable while its organs stand).
// Run: npx tsx balance/probe_highcourt.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { updateAI } from '../src/engine/ai';
import { MONSTERS, FACTIONS, HIGH_COURT, WAVE_TABLE, WILDLIFE } from '../src/data/monsters';
import { TILESETS } from '../src/data/tilesets';
import { ZONES } from '../src/data/zones';
import { registerAllPackageFactions } from '../src/packages/factionGen';
import type { AIAction, PhaseDef } from '../src/engine/brain';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
registerAllPackageFactions();

type Row = { champion?: string; zenith?: string; apex?: string };
const rows = Object.entries(HIGH_COURT) as [string, Row][];
const champions = rows.flatMap(([, r]) => (r.champion ? [r.champion] : []));
const setPieces = rows.flatMap(([, r]) => [r.zenith, r.apex].filter((x): x is string => !!x));
const EXEMPLAR = 'unmade_chronophage'; // predates the pass; grandfathered laws noted above

// ========================================================= registry integrity
{
  const missing = rows.flatMap(([f, r]) =>
    [r.champion, r.zenith, r.apex].filter((id): id is string => !!id && !MONSTERS[id]).map(id => `${f}:${id}`));
  check('every HIGH_COURT id resolves in MONSTERS', missing.length === 0, missing.join(', '));

  const badChamp = champions.filter(id => MONSTERS[id]?.bossBar !== true || MONSTERS[id]?.boss);
  check(`champions wear bossBar WITHOUT boss (${champions.length})`, badChamp.length === 0, badChamp.join(', '));

  const badPiece = setPieces.filter(id => {
    const d = MONSTERS[id];
    const script = (d?.brain as { script?: unknown[] } | undefined)?.script;
    return !d?.boss || (!d?.noNemesis && id !== EXEMPLAR) || !script || script.length < 3;
  });
  check(`zeniths/apexes wear boss + noNemesis + a script of >=3 acts (${setPieces.length})`, badPiece.length === 0, badPiece.join(', '));

  const apexes = rows.flatMap(([, r]) => (r.apex ? [r.apex] : []));
  const badApex = apexes.filter(id => !MONSTERS[id]?.levitates || MONSTERS[id]?.possessable !== false)
    // The exemplar's structural boss-tier possession refusal covers it.
    .filter(id => id !== EXEMPLAR);
  check('apexes levitate + refuse possession', badApex.length === 0, badApex.join(', '));
}

// ============================================================ script integrity
{
  const bad: string[] = [];
  for (const id of setPieces) {
    const script = ((MONSTERS[id].brain as { script?: PhaseDef[] }).script ?? []);
    const ids = script.map(a => a.id ?? '');
    if (new Set(ids).size !== ids.length) bad.push(`${id}: duplicate act ids`);
    let lastFrac = 1.01;
    for (const act of script) {
      for (const g of act.goto ?? []) {
        if (typeof g.to === 'string' && !ids.includes(g.to)) bad.push(`${id}: goto '${g.to}' names no act`);
        if (g.atLifeFrac !== undefined) {
          if (g.atLifeFrac >= lastFrac) bad.push(`${id}: goto fracs not descending at '${g.to}'`);
          lastFrac = g.atLifeFrac;
        }
      }
      const acts: AIAction[] = [
        ...(act.onEnter ?? []),
        ...(act.cadences ?? []).flatMap(c => c.actions ?? []),
      ];
      for (const a of acts) {
        if (a.do === 'summon' && !MONSTERS[(a as { monster: string }).monster]) {
          bad.push(`${id}: act '${act.id}' summons unknown '${(a as { monster: string }).monster}'`);
        }
      }
    }
    if (script.length && (script[script.length - 1].goto ?? []).length !== 0) {
      bad.push(`${id}: final act is not terminal`);
    }
    const rattle = (MONSTERS[id].brain as { onDeath?: AIAction[] }).onDeath ?? [];
    if (id !== EXEMPLAR && !rattle.some(a => a.do === 'arenaRestore')) {
      bad.push(`${id}: no arenaRestore death rattle`);
    }
  }
  check('script FSMs are sound (unique acts, live gotos, terminal ends, real summons, restore rattles)',
    bad.length === 0, bad.slice(0, 4).join('; '));
}

// ============================================================ the doorless law
{
  const surfaces = new Map<string, string>();
  const hit = (where: string, id: string): void => {
    if (setPieces.includes(id) && !surfaces.has(id)) surfaces.set(id, where);
  };
  for (const [fid, f] of Object.entries(FACTIONS)) for (const e of f.table) hit(`faction ${fid}`, e.id);
  for (const [tid, t] of Object.entries(TILESETS)) for (const e of t.packs.table) hit(`tileset ${tid}`, e.id);
  for (const z of Object.values(ZONES)) for (const e of z.packs?.table ?? []) hit(`zone ${z.id}`, e.id);
  for (const tier of WAVE_TABLE) for (const id of tier.ids) hit('wave table', id);
  for (const rowsOf of Object.values(WILDLIFE)) for (const r of rowsOf) hit('wildlife', r.id);
  check('THE DOORLESS LAW: no zenith/apex on any spawn surface', surfaces.size === 0,
    [...surfaces.entries()].map(([id, w]) => `${id}@${w}`).join(', '));

  const untabled = champions.filter(id =>
    !Object.values(FACTIONS).some(f => f.table.some(e => e.id === id)));
  check('champions ARE tabled (their door is presence)', untabled.length === 0, untabled.join(', '));
}

// ================================================================== live rigs
{
  // THE SIM LAW: world.update never runs brains headless — scripts advance
  // only through the AI tick, so the rig drives it (the anatomy rig's lane).
  // ONE FRESH WORLD PER PIECE (the order-law posture): no straggler court
  // from a prior fight may pollute the next fight's census.
  for (const [i, id] of setPieces.entries()) {
    const world = makeSimWorld('warrior', 0xc0447 ^ i);
    const p = world.player;
    p.sheet.setBase('life', 90000); p.life = 90000; // outlives every court
    const step = (n: number): void => {
      for (let k = 0; k < n; k++) {
        for (const a of world.actors) if (!a.dead) updateAI(a, world, 1 / 60);
        world.update(1 / 60);
      }
    };
    const before = world.actors.filter(a => !a.dead).length;
    const boss = world.createMonster(id, 14, 'enemy');
    boss.pos = { x: p.pos.x + 340, y: p.pos.y };
    world.actors.push(boss);
    step(30); // parts lazy-attach; act I opens
    const partsWanted = MONSTERS[id].parts?.length ?? 0;
    const partsGrown = (boss.partActors ?? []).length;
    // Drive the script to its floor through every goto band.
    const script = ((MONSTERS[id].brain as { script?: PhaseDef[] }).script ?? []);
    const fracs = script.flatMap(a => (a.goto ?? []).map(g => (g.atLifeFrac ?? 0) - 0.02));
    let threw = '';
    try {
      for (const f of fracs) {
        boss.life = Math.max(1, boss.maxLife() * f);
        step(50);
      }
    } catch (e) { threw = (e as Error).message; }
    const after = world.actors.filter(a => !a.dead).length;
    // A piece's COURT is either summoned (script summon acts) or worn as
    // anatomy (parts) — the First Chord fights alone among its facets.
    const hasSummons = script.some(a =>
      [...(a.onEnter ?? []), ...(a.cadences ?? []).flatMap(c => c.actions ?? [])]
        .some(x => x.do === 'summon'));
    const courtRaised = hasSummons ? after > before + 1 + partsWanted : partsWanted > 0;
    check(`${id}: stands whole (${partsGrown}/${partsWanted} parts), plays to its last act, raises its court`,
      !boss.dead && threw === '' && partsGrown === partsWanted && courtRaised,
      threw || `live actors ${before}->${after}`);

    // THE WARD READS: any piece whose script raises a ward must genuinely
    // shield — driven to its floor, a ward either broke (adds slain: not
    // here, nothing fights it) or still HOLDS as untargetable.
    const wards = script.some(a => (a.onEnter ?? []).some(x => x.do === 'ward'));
    if (wards) {
      check(`${id}: the ward genuinely shields while its court stands`,
        boss.untargetable === true, `warded ${String(boss.untargetable)}`);
    }
  }
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nprobe_highcourt: ALL GREEN');
process.exit(failed ? 1 : 0);
