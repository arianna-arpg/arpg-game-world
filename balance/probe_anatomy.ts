// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE ANATOMY GAMUT: composite monsters below boss tier
// (MonsterDef.parts as ordinary spawn-table citizens), the kit pass's
// integrity nets, and the LIMBREAVER lane (stats.ts — the slayer fold's
// fourth axis: MORE damage vs anchored parts, folded once at mitigateTyped).
// Pins:
//   - static integrity: every parts[] entry resolves (def exists, lifeFrac /
//     breakDamage sane, part defs pay no xp), every MonsterDef.skills id is a
//     real, ai-hinted skill (the kit pass can never assign a never-cast id),
//     every skill a def carries is AFFORDABLE from its own base mana pool,
//     every LOOKS part kind resolves to a painter (the 'knife' orphan net),
//     the gamut + worm-retrofit looks all exist,
//   - live rig: a pavise crab grows its boards on the first update tick,
//     anchored in the facing frame; breaking a board pays breakDamage to the
//     root and lays the breakMods source; a dying root sweeps its parts,
//   - the limbreaver fold: same victim, same blow — attacker with the stat
//     lands exactly (1 + v) × the clean attacker's damage on a PART, and
//     exactly 1 × on the part-less ROOT (the lane arms on partLink only),
//   - the marrow whip's chain is real (segments hittable at trash tier) and
//     the coil matriarch's retrofit holds (hittable + looks resolve).
// Run: npx tsx balance/probe_anatomy.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { MONSTERS } from '../src/data/monsters';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import '../src/data/glyphParts'; // side-effect: shipped glyphs register
import { mitigateTyped } from '../src/engine/damage';
import { STAT_DEFS, mod } from '../src/engine/stats';
import { segsHittable } from '../src/engine/segments';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();

// ========================================================= static integrity
{
  // Every composite's parts resolve, with sane break numbers and free parts.
  const bad: string[] = [];
  let composites = 0;
  for (const def of Object.values(MONSTERS)) {
    if (!def.parts?.length) continue;
    composites++;
    for (const pd of def.parts) {
      const part = MONSTERS[pd.monster];
      if (!part) { bad.push(`${def.id}: part '${pd.monster}' missing`); continue; }
      if (part.xp !== 0) bad.push(`${def.id}: part '${pd.monster}' pays xp ${part.xp} (root pays the bounty)`);
      if (pd.lifeFrac !== undefined && !(pd.lifeFrac > 0 && pd.lifeFrac <= 1)) bad.push(`${def.id}: lifeFrac ${pd.lifeFrac}`);
      if (pd.breakDamage !== undefined && !(pd.breakDamage >= 0 && pd.breakDamage < 1)) bad.push(`${def.id}: breakDamage ${pd.breakDamage}`);
      // breakDisables may name a SCRIPT-granted beat (the Iron Bell's toll
      // rides its brain script, not def.skills — the ban silences both), so
      // the pin is existence in the catalog, not presence on the def array.
      for (const sid of pd.breakDisables ?? []) {
        if (!SKILLS[sid]) bad.push(`${def.id}: breakDisables unknown skill '${sid}'`);
      }
    }
  }
  check(`composite integrity: every parts[] entry resolves (${composites} composites)`, bad.length === 0, bad.slice(0, 4).join('; '));
  check('the gamut fields at least 8 non-boss composites',
    Object.values(MONSTERS).filter(d => d.parts?.length && !d.boss).length >= 8);
}

{
  // The kit-pass net: every skills id exists AND carries an ai hint (a
  // monster can only cast what the brain has a hint for).
  const bad: string[] = [];
  for (const def of Object.values(MONSTERS)) {
    for (const sid of def.skills ?? []) {
      const s = SKILLS[sid];
      if (!s) bad.push(`${def.id}: unknown skill '${sid}'`);
      else if (!s.ai) bad.push(`${def.id}: skill '${sid}' has no ai hint (never cast)`);
    }
  }
  check('kit net: every MonsterDef.skills id is a real, ai-hinted skill', bad.length === 0, bad.slice(0, 4).join('; '));
}

{
  // Affordability: a def must be able to pay its own dearest skill from its
  // base mana pool — the "stands there forever" lint, pinned hard.
  const bad: string[] = [];
  for (const def of Object.values(MONSTERS)) {
    const pool = def.base?.mana ?? 0;
    for (const sid of def.skills ?? []) {
      const cost = SKILLS[sid]?.manaCost ?? 0;
      if (cost > 0 && cost > pool) bad.push(`${def.id}: '${sid}' costs ${cost} > pool ${pool}`);
    }
  }
  check('affordability: every kit skill payable from the def\'s own pool', bad.length === 0, bad.slice(0, 4).join('; '));
}

{
  // The 'knife' orphan net, statically: every part kind in every look
  // resolves to a painter (hand-written or registered glyph).
  const bad: string[] = [];
  for (const [id, look] of Object.entries(LOOKS)) {
    for (const p of [...look.parts, ...(look.live ?? [])]) {
      if (!PART_PAINTERS[p.kind]) bad.push(`${id}: '${p.kind}'`);
    }
  }
  check('looks net: every part kind resolves to a painter (0 orphans)', bad.length === 0, bad.slice(0, 4).join('; '));
}

{
  // The gamut's own dress is complete: root + part looks, worm kits.
  const wanted = [
    'pavise_crab', 'pavise_board', 'thurible_bearer', 'swung_censer',
    'siegeback_aurochs', 'howdah_archer', 'mortar_whelk', 'whelk_mortar',
    'vat_sow', 'birthing_sac', 'twinmaw_ettin', 'ogre_maw_ember', 'ogre_maw_rime',
    'effigy_porter', 'carven_idol', 'marrow_whip',
    'marrow_links', 'marrow_ridge', 'marrow_barb', 'serpent_coil', 'serpent_rattle',
  ];
  const missing = wanted.filter(id => !LOOKS[id]);
  check('gamut dress: all root/part/segment looks registered', missing.length === 0, missing.join(', '));
  check('new painters registered (howdahRig, mortarMaw)',
    !!PART_PAINTERS.howdahRig && !!PART_PAINTERS.mortarMaw);
}

{
  // The limbreaver lane's plumbing: stat registered, gem carries it.
  check('limbreaver stat registered (base 0, percent)',
    STAT_DEFS.limbreaver?.base === 0 && STAT_DEFS.limbreaver?.percent === true);
  const gem = SUPPORTS.limbreaver;
  check('limbreaver gem: exists and feeds the stat',
    !!gem && gem.mods.some(m => m.stat === 'limbreaver'));
}

// =============================================================== live rigs
const world = makeSimWorld('warrior', 133742);
const p = world.player;
p.sheet.setBase('life', 9000); p.life = 9000;
const step = (n: number): void => { for (let i = 0; i < n; i++) world.update(1 / 60); };

/** Stand a parked composite up and let its parts lazy-attach. */
function rigComposite(id: string, dx = 340): Actor {
  const root = world.createMonster(id, 8, 'enemy');
  root.pos = vec(p.pos.x + dx, p.pos.y);
  root.facing = 0;
  root.aiCooldown = 99999;
  root.anchored = true;
  world.actors.push(root);
  step(12);
  return root;
}

{
  const crab = rigComposite('pavise_crab');
  const boards = crab.partActors ?? [];
  check('pavise crab: two boards lazy-attach on the first update ticks', boards.length === 2);
  check('boards are anchored, xp-free, faction-inherited',
    boards.every(b => b.anchored && b.xpValue === 0 && b.faction === crab.faction));
  // Facing 0 ⇒ +dx is straight ahead: boards sit ahead of the shell.
  check('boards anchor in the FACING frame (ahead of the body)',
    boards.every(b => b.pos.x > crab.pos.x + crab.radius * 0.4)
    && Math.sign(boards[0].pos.y - crab.pos.y) !== Math.sign(boards[1].pos.y - crab.pos.y));
  const before = crab.life;
  const maxLife = crab.maxLife();
  world.kill(boards[0], false, p);
  step(2);
  const paid = before - crab.life;
  check('breaking a board pays breakDamage to the root (~6% max life)',
    Math.abs(paid - maxLife * 0.06) <= maxLife * 0.02, `paid ${paid.toFixed(1)} of ${maxLife.toFixed(0)}`);
  check('breakMods land on the root (damageTaken climbs)', crab.sheet.get('damageTaken') > 1.1,
    `damageTaken ${crab.sheet.get('damageTaken').toFixed(3)}`);
  const other = boards[1];
  world.kill(crab, false, p);
  step(2);
  check('a dying root takes its remaining parts with it', other.dead === true);
}

{
  // The limbreaver fold: same victim, same typed packet — the stat's whole
  // effect is the exact (1 + v) ratio, and it arms ONLY on partLink bodies.
  const sow = rigComposite('vat_sow', 520);
  const sac = (sow.partActors ?? [])[0];
  check('vat sow rigs with sacs', !!sac);
  if (sac) {
    const clean = mitigateTyped(sac, { fire: 100 }, { attacker: p, tags: new Set(['attack']) });
    p.sheet.setSource('probe_limbreaver', [mod('limbreaver', 'flat', 0.5)]);
    const armed = mitigateTyped(sac, { fire: 100 }, { attacker: p, tags: new Set(['attack']) });
    check('limbreaver fold: exactly ×1.5 on an anchored part',
      Math.abs(armed / clean - 1.5) < 1e-6, `ratio ${(armed / clean).toFixed(4)}`);
    // The root A/B needs FRESH victims per call — mitigation is stateful
    // (the poise skim spends the bar), so back-to-back reads on one body
    // measure the bar draining, not the stat. Two identical sows, one read
    // each: the lane must ignore the part-less root exactly.
    const sowArmed = rigComposite('vat_sow', 640);
    const armedRoot = mitigateTyped(sowArmed, { fire: 100 }, { attacker: p, tags: new Set(['attack']) });
    p.sheet.setSource('probe_limbreaver', []);
    const sowBare = rigComposite('vat_sow', 760);
    const bareRoot = mitigateTyped(sowBare, { fire: 100 }, { attacker: p, tags: new Set(['attack']) });
    check('limbreaver never touches the part-less root (×1 exactly)',
      Math.abs(armedRoot / bareRoot - 1) < 1e-6, `ratio ${(armedRoot / bareRoot).toFixed(4)}`);
  }
}

{
  // The marrow whip: the segment fabric at trash tier — the chain is REAL.
  const whip = world.createMonster('marrow_whip', 6, 'enemy');
  whip.pos = vec(p.pos.x - 400, p.pos.y);
  whip.aiCooldown = 99999;
  world.actors.push(whip);
  step(4);
  for (let i = 0; i < 40; i++) { whip.pos.x += 9; world.update(1 / 60); }
  check('marrow whip: 9 hittable segments unspool behind the skull',
    !!whip.worm && segsHittable(whip) && whip.worm.segments.length === 9);
  check('coil matriarch retrofit: hittable + serpent kit looks resolve',
    MONSTERS.coil_matriarch.worm?.hittable === true
    && !!LOOKS[MONSTERS.coil_matriarch.worm?.looks?.body ?? '']
    && !!LOOKS[MONSTERS.coil_matriarch.worm?.looks?.tail ?? '']);
}

{
  // The support-parts wire truths the counterplay copy: the censer CARRIES
  // the blessing, the idol the curse, the mortar the barrage, the sacs the
  // brood — each part def owns its verb (its death silences it for free).
  const verbs: [string, string][] = [
    ['swung_censer', 'thurible'], ['carven_idol', 'bewilder'],
    ['whelk_mortar', 'rolling_cannonade'], ['birthing_sac', 'spew_grubs'],
    ['howdah_archer', 'piercing_arrow'],
  ];
  const bad = verbs.filter(([id, sk]) => !MONSTERS[id]?.skills.includes(sk));
  check('every support-part owns its verb (break = silence, by construction)',
    bad.length === 0, bad.map(([id]) => id).join(', '));
  check('object-parts leave no corpse (remains: false)',
    ['pavise_board', 'swung_censer', 'whelk_mortar', 'carven_idol']
      .every(id => MONSTERS[id]?.remains === false));
}

// ============================================================ THE DRIFT LAW
// A composite must STAND STILL when its brain does. Parts are position-
// slaved into the root's facing frame every tick (updateParts), so any
// root↔part overlap re-arms every frame — if the shoulder pass treats the
// pair as strangers, the anchored part hands the mobile root its FULL share
// each tick and the creature surfs its own hitboxes at overlap × 60 px/s
// (the Gloamwood fly-by: an effigy porter thrown forward by the idol on its
// back, the idol casting the whole way). Pinned GENERICALLY over every
// registry composite — a new parts[] def joins the law with no probe edit —
// and stood up FREE: the old rig's root.anchored park is exactly what
// masked this (both-fixed pairs skip the sweep).
{
  const composites = Object.values(MONSTERS).filter(d => d.parts?.length);
  const drifted: string[] = [];
  let stood = 0;
  for (const def of composites) {
    const root = world.createMonster(def.id, 8, 'enemy');
    root.pos = vec(1250, 600);
    root.facing = 0;
    root.aiCooldown = 99999;              // brain parked — but the body FREE
    root.sheet.setBase('moveSpeed', 0);   // belt: no idle stroll reads as drift
    world.actors.push(root);
    step(2);                              // parts lazy-attach + first sweep
    if (root.partActors?.length) {
      stood++;
      const x0 = root.pos.x, y0 = root.pos.y;
      step(120);                          // two parked seconds
      const moved = Math.hypot(root.pos.x - x0, root.pos.y - y0);
      if (moved > 2) drifted.push(`${def.id} ${moved.toFixed(0)}px`);
    }
    // Sweep the rig slot clean — dead bodies leave the shoulder pass.
    root.dead = true;
    for (const part of root.partActors ?? []) part.dead = true;
  }
  check(`drift law: no composite is propelled by its own parts (${stood} stood)`,
    stood > 0 && drifted.length === 0, drifted.join('; '));
}

{
  // The exemption is KINSHIP-scoped, never a solid-body leak: a STRANGER
  // overlapping an anchored part is still shouldered out of it.
  const porter = world.createMonster('effigy_porter', 8, 'enemy');
  porter.pos = vec(500, 900);
  porter.facing = 0;
  porter.aiCooldown = 99999;
  porter.sheet.setBase('moveSpeed', 0);
  world.actors.push(porter);
  step(2);
  const idol = porter.partActors?.[0];
  const stranger = world.createMonster('verminkin_skulker', 8, 'enemy');
  stranger.aiCooldown = 99999;
  stranger.sheet.setBase('moveSpeed', 0);
  world.actors.push(stranger);
  if (idol) stranger.pos = vec(idol.pos.x, idol.pos.y + 2);
  step(30);
  const parted = idol ? Math.hypot(stranger.pos.x - idol.pos.x, stranger.pos.y - idol.pos.y) : 0;
  check('strangers still shoulder off an anchored part (no over-exemption)',
    !!idol && parted >= idol.radius + stranger.radius - 1,
    idol ? `ended ${parted.toFixed(1)}px vs rims ${(idol.radius + stranger.radius).toFixed(0)}px` : 'no idol attached');
  porter.dead = true;
  stranger.dead = true;
  for (const part of porter.partActors ?? []) part.dead = true;
}

console.log(failed === 0 ? '\nprobe_anatomy: ALL GREEN' : `\nprobe_anatomy: ${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
