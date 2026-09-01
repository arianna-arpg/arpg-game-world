// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE ULTIMATE FABRIC end to end on the real engine
// (engine/ultimates.ts; docs/engine/ultimates.md). Pins:
//   - THE FOLDS: eyecatchElapsed/eyecatchAlive are the one pane clock, and
//     eyecatchHoldSec resolves spec > chrono-zero > side default,
//   - THE CENSUS (THE PRICE FLOOR): every catalog skill wearing `ultimate`
//     carries >= ULT_CFG.minCooldown of cooldown, a real description, a
//     style that resolves in EYECATCH_STYLES (or none — the default), an
//     avatar override that resolves in MONSTERS, and a droppable ultimate
//     carries a level gate; the Vault row gem_skills_ultimates exists and
//     every payload id is a real, marked, droppable art,
//   - THE FLASH + THE HELD BEAT: a player cast arms the pane (side 'ally',
//     the caster's id, the skill's name) and holds the WORLD at scale 0 for
//     the beat under the solo policy — then lets go on schedule; the spent
//     pane is swept a slack after it ends (the wire never ships it stale),
//   - THE EVENT HORIZON: Hollow Star's well drags a rooted body inward
//     through the linger, and the collapse follow-up lands at the same aim
//     after the well closes,
//   - THE THROTTLE ONLY SKIPS THE BANNER: a second ultimate inside the
//     per-caster window casts fine (its chrono still stops the world's
//     bodies, its strikes still land) — only the pane declines to re-run,
//   - THE CHRONO KINDRED: the Hundred Partings arms the pane with NO world
//     hold (its stop IS the cinematic): the victim's clock reads 0, the
//     caster's 1, the victim stands frozen while the cuts land, and moves
//     again when time resumes,
//   - THE SAME DOOR: a MONSTER cast of the same art arms the pane side
//     'enemy' with the monster's own body as avatar, and its (shorter)
//     beat holds the world in solo exactly as the player's does,
//   - THE POLICY: with allowHold refusing (co-op / couch), the pane still
//     plays but the world never stops,
//   - THE SHAPESHIFT ULTIMATE: the Woken Hollow re-points the seat into
//     the form at cast, the pane wears the authored avatar override, and
//     the duration hands the flesh back.
// Run: npx tsx balance/probe_ultimates.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { vec, dist } from '../src/core/math';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';
import {
  eyecatchAlive, eyecatchElapsed, eyecatchHoldSec, ULT_CFG, ULT_QA,
  ultCooldownCap, ultThrottleSec, type EyecatchState,
} from '../src/engine/ultimates';
import { EYECATCH_STYLES } from '../src/render/vis/eyecatch';
import { makeSkillInstance } from '../src/engine/skills';
import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// THE SHIPPED LAW FIRST: the lab branch defaults the iteration lever ON —
// every rig below pins the AUTHORED pacing, so the lever stands down here
// and gets its own rig at the tail (both regimes pinned, neither assumed).
ULT_QA.active = false;

const DT = 1 / 60;
const step = (w: World, n = 1): void => { for (let i = 0; i < n; i++) w.update(DT); };
const secs = (s: number): number => Math.ceil(s / DT);
const feed = (a: Actor): void => { a.sheet.setBase('mana', 400); a.fillResources(); };
const spawn = (w: World, id: string, lv: number, x: number, y: number): Actor => {
  const m = w.createMonster(id, lv, 'enemy');
  m.pos = vec(x, y);
  w.actors.push(m);
  return m;
};

// ------------------------------------------------------------------ the folds
{
  const st: EyecatchState = {
    casterId: 1, skillId: 'x', style: 'sunder', title: 'X', tint: '#fff',
    side: 'ally', t0: 10, paneSec: 1.2,
  };
  check('fold: elapsed is age minus the stamp', eyecatchElapsed(st, 10.5) === 0.5);
  check('fold: alive inside the pane, dead past its edge',
    eyecatchAlive(st, 10.5) && !eyecatchAlive(st, 11.21) && !eyecatchAlive(st, 9.9));
  check('fold: a spec\'d beat always wins',
    eyecatchHoldSec({ holdSec: 0.2 }, true, 'ally') === 0.2);
  check('fold: a chrono skill\'s beat defaults to zero — its stop IS the movie',
    eyecatchHoldSec({}, true, 'ally') === 0);
  check('fold: side defaults — the ally\'s beat and the enemy\'s telegraph',
    eyecatchHoldSec({}, false, 'ally') === ULT_CFG.holdSec
    && eyecatchHoldSec({}, false, 'enemy') === ULT_CFG.enemyHoldSec);
}

// ----------------------------------------------------------------- the census
{
  const marked = Object.values(SKILLS).filter(d => d.ultimate);
  check('census: the catalog fields ultimate arts', marked.length >= 3,
    `${marked.length} marked`);
  for (const d of marked) {
    const u = d.ultimate!;
    check(`census: ${d.id} pays THE PRICE FLOOR (cooldown >= ${ULT_CFG.minCooldown})`,
      (d.cooldown ?? 0) >= ULT_CFG.minCooldown, `cooldown ${d.cooldown}`);
    // THE SPEC IS THE MARK, THE TAG IS THE SCOPE: every marked art wears the
    // 'ultimate' tag so scoped supports/investment find the whole family
    // (payload kin may wear the tag WITHOUT the mark — no reverse law).
    check(`census: ${d.id} wears the 'ultimate' tag`,
      (d.tags ?? []).includes('ultimate'));
    check(`census: ${d.id} speaks (name + description)`,
      d.name.length > 0 && (d.description ?? '').length > 0);
    check(`census: ${d.id} style resolves (or defaults)`,
      u.style === undefined || !!EYECATCH_STYLES[u.style], `style ${u.style}`);
    check(`census: ${d.id} avatar override resolves`,
      u.avatarDefId === undefined || !!MONSTERS[u.avatarDefId], `avatar ${u.avatarDefId}`);
    if (!d.noDrop && (d.dropWeight ?? 0) > 0) {
      check(`census: droppable ${d.id} carries a level gate`,
        (d.minDropLevel ?? 0) > 0);
    }
  }
  check('census: the default style itself resolves', !!EYECATCH_STYLES[ULT_CFG.style]);
  check('census: the flank cut-in stands registered beside the movies',
    !!EYECATCH_STYLES.flank && !!EYECATCH_STYLES.sunder && !!EYECATCH_STYLES.eclipse);
  const row = UNLOCK_CATALOG.find(u => u.id === 'gem_skills_ultimates');
  check('census: the Vault row stands (gem_skills_ultimates, kind skill)',
    !!row && row.kind === 'skill');
  const ids = (row?.payload as { skillIds?: string[] } | undefined)?.skillIds ?? [];
  check('census: the Vault row carries the debut trio', ids.length === 3);
  for (const id of ids) {
    const d = SKILLS[id];
    check(`census: Vault payload ${id} is a real, marked, droppable art`,
      !!d && !!d.ultimate && !d.noDrop && (d.dropWeight ?? 0) > 0);
  }
}

// ------------------------------------- the flash, the held beat, the horizon
{
  seedGlobalRandom(11);
  const w = makeSimWorld('warrior', 11);
  const px = w.player.pos.x, py = w.player.pos.y;
  feed(w.player);
  const aim = vec(px + 400, py);
  // A rooted witness inside the well's grip but outside its burn: any inward
  // motion is the star's, never its own feet.
  const z = spawn(w, 'zombie', 1, aim.x + 230, aim.y);
  z.sheet.setBase('life', 4000); z.fillResources();
  z.sheet.setBase('moveSpeed', 0);
  const cast = w.useSkill(w.player, makeSkillInstance(SKILLS.hollow_star, 1, 2), aim);
  check('flash: the cast is accepted', cast === true);
  check('flash: no pane before the cast commits', w.eyecatch === null);
  step(w, secs(0.85)); // the 0.8s bar completes
  const st = w.eyecatch;
  check('flash: the pane arms as the cast commits',
    !!st && st.skillId === 'hollow_star' && st.casterId === w.player.id);
  check('flash: side ally, the skill\'s own name and color',
    !!st && st.side === 'ally' && st.title === 'Hollow Star' && st.tint === SKILLS.hollow_star.color);
  check('beat: the world holds at scale 0 (solo policy)',
    w.timeflow.worldScale() === 0);
  const zAtHold = vec(z.pos.x, z.pos.y);
  step(w, secs(0.2));
  check('beat: a held world does not move its bodies',
    z.pos.x === zAtHold.x && z.pos.y === zAtHold.y);
  step(w, secs(ULT_CFG.holdSec));
  check('beat: the hold lets go on schedule', w.timeflow.worldScale() === 1);
  // THE EVENT HORIZON: through the linger the well drags the rooted body in.
  const d0 = dist(z.pos, aim);
  step(w, secs(1.2));
  const d1 = dist(z.pos, aim);
  check('horizon: the well drags the witness inward', d1 < d0 - 60,
    `${d0.toFixed(0)} -> ${d1.toFixed(0)}`);
  const lifeBeforeCollapse = z.life;
  step(w, secs(3.2)); // ride out the linger + the follow-up beat
  check('collapse: the follow-up lands at the same aim when the well closes',
    z.life < lifeBeforeCollapse - 20,
    `life ${lifeBeforeCollapse.toFixed(0)} -> ${z.life.toFixed(0)}`);
  check('sweep: the spent pane is nulled a slack after it ends', w.eyecatch === null);

  // THE THROTTLE ONLY SKIPS THE BANNER: a second art inside the window casts
  // in full — its chrono still stops the world's bodies — but no new pane.
  const cast2 = w.useSkill(w.player, makeSkillInstance(SKILLS.hundred_partings, 1, 2), vec(z.pos.x, z.pos.y));
  check('throttle: the second ultimate casts fine', cast2 === true);
  step(w, secs(0.45)); // the 0.4s bar completes
  check('throttle: the banner declines to re-run inside the window',
    w.eyecatch === null || w.eyecatch.skillId !== 'hundred_partings');
  check('throttle: the art itself is untouched — the stop stands',
    w.timeflow.actorScale(z) === 0 && w.timeflow.actorScale(w.player) === 1);
}

// -------------------------------------------------------- the chrono kindred
{
  seedGlobalRandom(23);
  const w = makeSimWorld('warrior', 23);
  const px = w.player.pos.x, py = w.player.pos.y;
  feed(w.player);
  // A small CLUSTER: atEnemies plants one cut under each body in the disc,
  // so a pack makes the landing statistics honest. Accuracy is pinned high
  // — this rig tests the STOP, not the aim.
  const zs = [
    spawn(w, 'zombie', 1, px + 300, py),
    spawn(w, 'zombie', 1, px + 332, py + 28),
    spawn(w, 'zombie', 1, px + 274, py - 30),
  ];
  for (const z of zs) { z.sheet.setBase('life', 4000); z.fillResources(); }
  w.player.sheet.setBase('accuracy', 5000);
  const cast = w.useSkill(w.player, makeSkillInstance(SKILLS.hundred_partings, 1, 2), vec(px + 300, py));
  check('chrono: the cast is accepted', cast === true);
  step(w, secs(0.45)); // the bar completes; the stop begins
  const st = w.eyecatch;
  check('chrono: the pane arms', !!st && st.skillId === 'hundred_partings');
  check('chrono: NO world hold rides it — the stop is the cinematic',
    w.timeflow.worldScale() === 1);
  check('chrono: the victim\'s clock reads zero, the caster\'s one',
    w.timeflow.actorScale(zs[0]) === 0 && w.timeflow.actorScale(w.player) === 1);
  const total = (): number => zs.reduce((s, z) => s + z.life, 0);
  const lifeAt = total();
  const posAt = vec(zs[0].pos.x, zs[0].pos.y);
  step(w, secs(1.1)); // the cuts fall into stopped time
  check('chrono: the cuts land while the victims stand frozen',
    total() < lifeAt - 50 && zs[0].pos.x === posAt.x && zs[0].pos.y === posAt.y,
    `life ${lifeAt.toFixed(0)} -> ${total().toFixed(0)}`);
  step(w, secs(1.0)); // the stop expires
  check('chrono: time resumes on schedule', w.timeflow.actorScale(zs[0]) === 1);
}

// ------------------------------------------------------------- the same door
{
  seedGlobalRandom(31);
  const w = makeSimWorld('warrior', 31);
  const px = w.player.pos.x, py = w.player.pos.y;
  w.player.pos = vec(px - 300, py);
  const z = spawn(w, 'zombie', 3, px + 200, py);
  feed(z);
  const cast = w.useSkill(z, makeSkillInstance(SKILLS.hollow_star, 1, 2), vec(px - 200, py));
  check('door: the monster cast is accepted (no player special case)', cast === true);
  step(w, secs(0.85));
  const st = w.eyecatch;
  check('door: the pane arms side ENEMY with the monster\'s own body',
    !!st && st.side === 'enemy' && st.casterId === z.id);
  check('door: the telegraph beat holds the world (solo), shorter than the ally\'s',
    w.timeflow.worldScale() === 0);
  step(w, secs(ULT_CFG.enemyHoldSec + 0.05));
  check('door: the shorter beat lets go on schedule', w.timeflow.worldScale() === 1);
}

// ----------------------------------------------------------------- the policy
{
  seedGlobalRandom(43);
  const w = makeSimWorld('warrior', 43);
  w.timeflow.allowHold = () => false; // co-op / couch: never one player's to stop
  feed(w.player);
  const cast = w.useSkill(w.player, makeSkillInstance(SKILLS.hollow_star, 1, 2),
    vec(w.player.pos.x + 300, w.player.pos.y));
  check('policy: the cast is accepted', cast === true);
  step(w, secs(0.85));
  check('policy: the pane still plays over a living world',
    !!w.eyecatch && w.timeflow.worldScale() === 1);
  step(w, secs(0.4));
  check('policy: the world never stopped', w.timeflow.worldScale() === 1);
}

// ------------------------------------------------------ the shapeshift ultimate
{
  seedGlobalRandom(57);
  const w = makeSimWorld('warrior', 57);
  feed(w.player);
  const seat = w.seats[0];
  const home = seat.actor;
  const cast = w.useSkill(w.player, makeSkillInstance(SKILLS.woken_hollow, 1, 2),
    vec(w.player.pos.x, w.player.pos.y));
  check('form: the cast is accepted', cast === true);
  step(w, secs(0.6)); // the 0.5s bar completes
  check('form: the seat re-points into the Woken Hollow',
    seat.actor !== home && seat.actor.defId === 'ult_woken_hollow');
  check('form: the pane wears the authored avatar override',
    !!w.eyecatch && w.eyecatch.avatarDefId === 'ult_woken_hollow'
    && w.eyecatch.skillId === 'woken_hollow');
  check('form: the hollow stands on the player\'s side',
    seat.actor.team === 'player');
  step(w, secs(15)); // the 14s duration lapses
  check('form: the duration hands the flesh back', seat.actor === home);
}

// --------------------------------------------------------------- the lab lever
// ULT_QA — iteration builds cap the STAMPED clock and run the banner eagerly.
// Pinned OFF above for every shipped-law rig; pinned ON here, then restored.
{
  seedGlobalRandom(71);
  const w = makeSimWorld('warrior', 71);
  feed(w.player);
  ULT_QA.active = true;
  check('lever: the folds answer the lever',
    ultCooldownCap() === ULT_QA.cooldownCap && ultThrottleSec() === ULT_QA.throttleSec);
  const aim = vec(w.player.pos.x + 300, w.player.pos.y);
  check('lever: the first art casts',
    w.useSkill(w.player, makeSkillInstance(SKILLS.hollow_star, 1, 2), aim) === true);
  step(w, secs(0.85)); // the 0.8s bar completes; the clock stamps capped
  check('lever: the ULTIMATE clock is capped for iteration',
    (w.player.cooldowns.get('hollow_star') ?? 99) <= ULT_QA.cooldownCap + 0.01,
    `cd ${(w.player.cooldowns.get('hollow_star') ?? 99).toFixed(2)}`);
  check('lever: the first pane armed',
    !!w.eyecatch && w.eyecatch.skillId === 'hollow_star');
  // ride past the held beat + the eager window, then the SECOND banner runs
  step(w, secs(Math.max(ULT_CFG.holdSec, ULT_QA.throttleSec, ULT_QA.globalGapSec) + 0.2));
  feed(w.player);
  check('lever: the second art casts back-to-back',
    w.useSkill(w.player, makeSkillInstance(SKILLS.hundred_partings, 1, 2), aim) === true);
  step(w, secs(0.45)); // the 0.4s bar completes
  check('lever: the eager throttle re-runs the banner back-to-back',
    !!w.eyecatch && w.eyecatch.skillId === 'hundred_partings');
  // an ORDINARY skill's clock never crosses the lever. Step clear of the
  // partings' swing recovery and its stop first — a refusal there is the
  // standing cast-commitment law's business, not the lever's.
  step(w, secs(1.3));
  feed(w.player);
  check('lever: a plain art casts',
    w.useSkill(w.player, makeSkillInstance(SKILLS.teleport, 1, 2), aim) === true);
  check('lever: a plain art\'s clock is never capped',
    (w.player.cooldowns.get('teleport') ?? 0) > ULT_QA.cooldownCap,
    `cd ${(w.player.cooldowns.get('teleport') ?? 0).toFixed(2)}`);
  ULT_QA.active = false;
  check('lever: standing down restores the shipped folds',
    ultCooldownCap() === Infinity && ultThrottleSec() === ULT_CFG.throttleSec);
}

console.log(failed ? `\n${failed} FAILURES` : '\nALL PASS');
process.exit(failed ? 1 : 0);
