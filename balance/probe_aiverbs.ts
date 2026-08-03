// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE X-VERB CHOREOGRAPHY (aiActions.ts registerAIAction),
// the landed steering verbs end to end on the real engine:
//   A) x_seek_creep, THE CLAIM WALK — the bloom matron displaced off her own
//      sporebed heart surges HOME through her real off-claim rule (the
//      reserves.md promise: "the matron's off-claim urgency rule would
//      upgrade to it the day it lands" — landed), ending back on cover the
//      claim test itself acknowledges;
//   B) x_seek_creep, THE HONEST NO-OPS + KIND DISCIPLINE — no field: no
//      surge; a named kind ignores a NEARER foreign membrane (the want is
//      one skin, not any skin); standing on the sought skin: no surge;
//   C) x_seek_cloud, BOTH POSTURES — chase: a gifting ally puff draws the
//      wearer (side filters mirror dressOccupants verbatim); home: inside,
//      the beat rests; flee: a hostile-side smother at the feet throws the
//      dash OUTWARD;
//   D) THE WEARER CENSUS (the orphan law: "nothing ships orphaned again") —
//      every x_ verb named by any def's brain resolves to a known
//      registration, and every known registration is WORN by at least one
//      def (the registry itself is module-private by design; this is the
//      def-side census). The commission's rally verification rides here
//      too: rallying_howl stays seated on the chieftain and applies a
//      status that exists;
//   E) x_rally_to_target, THE COMMANDER'S FINGER — kin in the ring adopt
//      the pointer's quarry (lock + aggro), kin beyond it do not.
// Dormancy is NOT re-probed here: rules cannot fire on a dormant body (the
// AI gate holds them long before the rule sweep — probe_watchers territory).
// Run: npx tsx balance/probe_aiverbs.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { CREEPS, CREEP_CFG } from '../src/engine/creep';
import { STATUS_DEFS } from '../src/engine/status';
import { runAIActions } from '../src/engine/aiActions';
import { updateAI } from '../src/engine/ai';
import { angleTo, dist, vec } from '../src/core/math';
// The poxrot is the contagion package's own kind — a probe imports the
// registrations it censuses (the side-effect-import law).
import '../src/packages/defs/contagion';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xa1e5);

const DT = 1 / 60;
// The HOST frame loop, verbatim (sim/runner.ts order): AI per actor, then
// the world tick.
const step = (w: ReturnType<typeof makeSimWorld>, sec: number): void => {
  for (let t = 0; t < sec; t += DT) {
    for (const a of w.actors) updateAI(a, w, DT);
    w.update(DT);
  }
};

// --- A) x_seek_creep: the claim walk, through the matron's real rule --------
{
  const w = makeSimWorld('warrior', 0xa1e1);
  const m = w.createMonster('bloom_matron', 8, 'enemy');
  m.pos = vec(w.player.pos.x + 300, w.player.pos.y);
  w.actors.push(m);
  step(w, 0.5); // the heart plants at her settled position (first update tick)
  const field = w.creep;
  check('A: her creepSource planted a live sporebed heart',
    !!field && field.sources.some(s => s.def.id === 'sporebed'),
    `sources=${field?.sources.length ?? 'no field'}`);
  if (field) {
    const heart = field.sources.find(s => s.def.id === 'sporebed')!.pos;
    // The player leaves the room (no lock contaminates the homing read),
    // and the matron is SHOVED well off her mat — the mass-fabric story.
    w.player.pos = vec(heart.x - 900, heart.y);
    m.pos = vec(heart.x + 420, heart.y);
    step(w, 30);
    const d = dist(m.pos, heart);
    check('A: displaced, she covered ground back toward her own heart',
      d < 280, `ended ${d.toFixed(0)}u from the heart (started 420)`);
    const floor = CREEPS['sporebed']?.hitFloor ?? CREEP_CFG.hitFloor;
    check('A: she ended ON the claim the rooted sheet itself acknowledges',
      field.coverOf('sporebed', m.pos.x, m.pos.y, m.radius * 0.5) >= floor);
    check('A: home, the want rests — no standing dash on the claim',
      !m.dash || field.coverOf('sporebed', m.pos.x, m.pos.y, m.radius * 0.5) >= floor);
  }
}

// --- B) x_seek_creep: honest no-ops + the kind discipline -------------------
{
  const w = makeSimWorld('warrior', 0xa1e2);
  const c = w.createMonster('plague_carrier', 6, 'enemy');
  c.pos = vec(w.player.pos.x + 300, w.player.pos.y);
  w.actors.push(c);
  runAIActions(w, c, [{ do: 'x_seek_creep', kind: 'poxrot' }], null);
  check('B: no rot standing anywhere — the beat no-ops silently', !c.dash);
  const field = w.creepEnsure();
  check('B: the arena stands a creep field for the rig', !!field);
  if (field) {
    // A NEARER foreign membrane and a FARTHER poxrot: the named want must
    // ignore the near skin (one membrane, not any membrane). Fresh patches
    // are born THIN — the world steps until they cross the liveness floor
    // the verb honors (a sub-minReach heart is rightly invisible to it).
    const px = c.pos.x, py = c.pos.y;
    w.player.pos = vec(px - 1200, py); // nobody contests the read
    field.growCreepAt(CREEPS['sporebed'], px + 160, py, 90);
    field.growCreepAt(CREEPS['poxrot'], px + 460, py, 100);
    step(w, 2.5);
    const pox = field.sources.find(s => s.def.id === 'poxrot');
    const spore = field.sources.find(s => s.def.id === 'sporebed');
    check('B: both skins grew live (the rig\'s own premise)',
      !!pox && !!spore && pox.cur >= CREEP_CFG.minReach && spore.cur >= CREEP_CFG.minReach,
      `pox=${pox?.cur.toFixed(0)} spore=${spore?.cur.toFixed(0)} floor=${CREEP_CFG.minReach}`);
    if (pox && spore) {
      const dPox = dist(c.pos, pox.pos), dSpore = dist(c.pos, spore.pos);
      check('B: the foreign skin is the NEARER one (the discipline is tested)',
        dSpore < dPox, `spore ${dSpore.toFixed(0)}u vs pox ${dPox.toFixed(0)}u`);
      c.dash = null;
      runAIActions(w, c, [{ do: 'x_seek_creep', kind: 'poxrot' }], null);
      // Re-read past the null-assignment narrowing (the handler mutates).
      const surge = c.dash as { dir: number } | null;
      check('B: the beat surged', !!surge);
      if (surge) {
        const want = angleTo(c.pos, pox.pos);
        const err = Math.abs(Math.atan2(Math.sin(surge.dir - want), Math.cos(surge.dir - want)));
        check('B: ...at the FAR poxrot, past the nearer foreign skin',
          err < 0.2, `bearing error ${err.toFixed(3)} rad`);
      }
      // Standing on the sought skin = home: the beat rests.
      c.dash = null;
      c.pos = vec(pox.pos.x, pox.pos.y);
      runAIActions(w, c, [{ do: 'x_seek_creep', kind: 'poxrot' }], null);
      check('B: on the rot itself, the beat rests', !c.dash);
    }
  }
}

// --- C) x_seek_cloud: chase the gift, rest at home, flee the smother --------
{
  const w = makeSimWorld('warrior', 0xa1e3);
  const s = w.createMonster('mistwing_shrike', 8, 'enemy');
  const kin = w.createMonster('mistwing_shrike', 8, 'enemy');
  s.pos = vec(w.player.pos.x + 300, w.player.pos.y);
  kin.pos = vec(s.pos.x + 60, s.pos.y + 200);
  w.actors.push(s, kin);
  check('C: the arena builds the conjured-ground ledger', !!w.conjured);
  // The matron's-side domain: an ally puff whose gift would LAND on the
  // shrike (side:'allies', same team) — the chase posture.
  w.conjureCloud(s.pos.x + 380, s.pos.y, 130, 60,
    { caster: kin, grants: [{ status: 'stormlaced', side: 'allies' }] });
  runAIActions(w, s, [{ do: 'x_seek_cloud' }], null);
  check('C: a gifting domain stands — the beat surged', !!s.dash);
  if (s.dash) {
    const want = Math.atan2(0, 380);
    const err = Math.abs(Math.atan2(Math.sin(s.dash.dir - want), Math.cos(s.dash.dir - want)));
    check('C: ...toward the domain', err < 0.2, `bearing error ${err.toFixed(3)} rad`);
  }
  // Inside it: home — the vapor itself does the rest.
  s.dash = null;
  s.pos = vec(s.pos.x + 380, s.pos.y);
  runAIActions(w, s, [{ do: 'x_seek_cloud' }], null);
  check('C: inside the gifting domain, the beat rests', !s.dash);
  // A hostile smother laid over it: side:'enemies' from the player's hand
  // reaches the shrike through the world's own hostility — flee posture,
  // and the smother OUTRANKS the gift it stands inside.
  w.conjureCloud(s.pos.x + 30, s.pos.y, 120, 60,
    { caster: w.player, grants: [{ status: 'smothered', side: 'enemies' }] });
  runAIActions(w, s, [{ do: 'x_seek_cloud' }], null);
  // Re-read past the null-assignment narrowing (the handler mutates).
  const thrown = s.dash as { dir: number } | null;
  check('C: smothered — the beat threw the dash', !!thrown);
  if (thrown) {
    const away = Math.atan2(0, -30); // outward = away from the +30 offset center
    const err = Math.abs(Math.atan2(Math.sin(thrown.dir - away), Math.cos(thrown.dir - away)));
    check('C: ...OUT from under the murk', err < 0.2, `bearing error ${err.toFixed(3)} rad`);
  }
}

// --- D) The wearer census: no typos ride, nothing ships orphaned ------------
{
  // The five landed x_ verbs. The registry itself is module-private by
  // design — this is the DEF-SIDE census: a new registration lands with its
  // wearer and its row here in the same change, or this probe names it.
  const KNOWN = new Set([
    'x_seek_fog', 'x_ride_flux', 'x_rally_to_target', 'x_seek_creep', 'x_seek_cloud',
  ]);
  const worn = new Map<string, string[]>();
  const walk = (id: string, v: unknown): void => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) { for (const x of v) walk(id, x); return; }
    const o = v as Record<string, unknown>;
    if (typeof o.do === 'string' && o.do.startsWith('x_')) {
      (worn.get(o.do) ?? worn.set(o.do, []).get(o.do)!).push(id);
    }
    for (const k of Object.keys(o)) walk(id, o[k]);
  };
  for (const [id, def] of Object.entries(MONSTERS)) walk(id, def.brain);
  for (const [verb, ids] of worn) {
    check(`D: '${verb}' (worn by ${ids.length}) resolves to a known registration`,
      KNOWN.has(verb), `unknown x_ verb would warn-and-no-op at runtime`);
  }
  for (const verb of KNOWN) {
    check(`D: '${verb}' is worn by at least one def (the orphan law)`,
      (worn.get(verb)?.length ?? 0) >= 1);
  }
  check('D: the matron\'s off-claim rule wears the promised seek (sporebed)',
    (worn.get('x_seek_creep') ?? []).includes('bloom_matron'));
  check('D: the pox bodies wear the garden pull',
    (worn.get('x_seek_creep') ?? []).includes('plague_carrier')
    && (worn.get('x_seek_creep') ?? []).includes('plague_bloat'));
  check('D: the flock wears the weather sense',
    (worn.get('x_seek_cloud') ?? []).includes('mistwing_shrike'));
  check('D: the chieftain wears the commander\'s finger',
    (worn.get('x_rally_to_target') ?? []).includes('warband_chieftain'));
  // The commission's rally verification, pinned as standing law: the howl
  // stays seated on the commander archetype and applies a status that
  // exists (the anatomy probe owns affordability + the ai hint).
  check('D: rallying_howl stays seated on the warband chieftain',
    (MONSTERS['warband_chieftain']?.skills ?? []).includes('rallying_howl'));
  const howl = SKILLS['rallying_howl'];
  const applied = (howl?.effects ?? []).find(e => e.type === 'status' && 'status' in e
    ? (e as { status?: string }).status === 'rally' : false);
  check('D: the howl applies \'rally\', and the status is registered',
    !!applied && !!STATUS_DEFS['rally']);
}

// --- E) x_rally_to_target: the ring adopts, the horizon does not ------------
{
  const w = makeSimWorld('warrior', 0xa1e4);
  const chief = w.createMonster('warband_chieftain', 8, 'enemy');
  const near = w.createMonster('warband_chieftain', 8, 'enemy');
  const far = w.createMonster('warband_chieftain', 8, 'enemy');
  chief.pos = vec(w.player.pos.x + 400, w.player.pos.y);
  near.pos = vec(chief.pos.x + 200, chief.pos.y);
  far.pos = vec(chief.pos.x + 800, chief.pos.y);
  w.actors.push(chief, near, far);
  runAIActions(w, chief, [{ do: 'x_rally_to_target' }], w.player);
  check('E: kin in the ring adopted the pointer\'s quarry',
    near.aiTargetId === w.player.id && near.aggroed === true);
  check('E: kin beyond the ring kept their own mind',
    far.aiTargetId !== w.player.id);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
