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
import { updateAI } from '../src/engine/ai';
import { FACTIONS, FIXTURE_IDS, HIGH_COURT, MONSTERS, WAVE_TABLE, WILDLIFE } from '../src/data/monsters';
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
// THE SEAT CENSUS's sources (see the census block at the tail). Every one of
// these registries is already standing after bootSimEngine — these are value
// imports only, deliberately placed LAST so the module graph the live rigs
// boot against keeps its existing order.
import { TILESETS } from '../src/data/tilesets';
import { ZONES } from '../src/data/zones';
// THE AMBIENT CENSUS's sources (the wildlife-pass coverage pin at the tail):
// the biome roster the coverage floor sweeps, and the engine's own
// objective-exemption tag set — the census judges by the predicate the
// scoreboard actually reads, never a copy.
import { BIOMES } from '../src/world/biomes';
import { AMBIENT_TAGS } from '../src/engine/world';
import { SIDEZONES } from '../src/data/sidezones';
import { PROLOGUE_SCENE, SCENES } from '../src/data/scenes';
import { WORLDBOSS_SURGE } from '../src/packages/defs/worldboss';
import { HUNT_SURGE } from '../src/packages/defs/hunt';
import { hasDoodadRule, hasStamp, landmarkDefs } from '../src/engine/levelgen';
import { withSeededRandom } from '../src/core/rng';
// THE DRESS CENSUS's sources: the wayside ledger, the visuals registry, the
// patron-faction map, and the painter registry AS THE GAME DRAWS IT — the
// eight biome kits register into PAINTERS by side effect exactly as
// renderer.ts imports them, so the census judges the live registry, never a
// subset (gourdTotem lives in paintersHallow, coachWreck in paintersGloam).
import { ANATOMY_DRESS } from '../src/data/formations';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { patronFaction } from '../src/world/biomes';
import { PAINTERS } from '../src/render/vis/painters';
import '../src/render/vis/paintersGloam';
import '../src/render/vis/paintersHallow';
import '../src/render/vis/paintersAether';
import '../src/render/vis/paintersHome';
import '../src/render/vis/paintersSea';
import '../src/render/vis/paintersGarden';
import '../src/render/vis/paintersGrove';
import '../src/render/vis/paintersWarfront';

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

// ========================================================== THE SPOKEN VERB
// A carried caster part lives its whole life below holdRange's panic band
// (the MOUNT picks the range), where the kernel once held fire forever —
// the gamut's ranged threats were dead verbs: the idol never once cursed,
// the howdah archers never loosed, the censer never blessed a fight.
// retreatMove's rooted-truth refusal + the panic fall-through make the
// archetype's own promise real: what cannot run PLANTS AND FIRES. Pinned
// GENERICALLY: every non-boss composite part carrying skills + a mana pool
// must SPEND in a melee scrum — a future caster part joins by existing.
// THE BRAIN LOOP LIVES IN THE DRIVER (main.ts rAF / sim runner.ts), never
// in World.update — a rig that wants live conduct drums updateAI itself.
{
  const casterKits: { rootId: string; parts: string[] }[] = [];
  for (const def of Object.values(MONSTERS)) {
    if (!def.parts?.length || def.boss) continue;
    const parts = def.parts
      .map(pd => pd.monster)
      .filter(id => (MONSTERS[id]?.skills?.length ?? 0) > 0 && (MONSTERS[id]?.base?.mana ?? 0) > 0);
    if (parts.length) casterKits.push({ rootId: def.id, parts });
  }
  check('spoken verb: caster parts stand to pin (the idol among them)',
    casterKits.length >= 4 && casterKits.some(k => k.rootId === 'effigy_porter'),
    casterKits.map(k => k.rootId).join(', '));

  const mute: string[] = [];
  let idolCursed = false;
  for (let ki = 0; ki < casterKits.length; ki++) {
    const kit = casterKits[ki];
    const w2 = makeSimWorld('warrior', 0xa11ce ^ ki);
    const hero = w2.player;
    hero.sheet.setBase('life', 90000); hero.life = 90000; // outlives the scrum
    const root2 = w2.createMonster(kit.rootId, 8, 'enemy');
    root2.pos = vec(hero.pos.x + 40, hero.pos.y);         // MELEE: the live regime
    root2.facing = Math.PI;
    w2.actors.push(root2);
    const drum = (n: number): void => {
      for (let i = 0; i < n; i++) {
        for (const a of w2.actors) updateAI(a, w2, 1 / 60);
        w2.update(1 / 60);
      }
    };
    drum(2); // parts lazy-attach; sight opens the fight — no wound needed
    const watch = (root2.partActors ?? []).filter(pa => kit.parts.includes(pa.defId ?? ''));
    if (watch.length !== kit.parts.length) {
      mute.push(`${kit.rootId}: ${watch.length}/${kit.parts.length} caster parts attached`);
      continue;
    }
    // SPOKE = a cast-bar EDGE (catches 0-cost verbs — the sacs' brood, the
    // maws' breath) or cumulative mana spend (catches instant spends the
    // bar-sample could miss). Tracking opens before the first full second
    // so a long-cooldown verb (the censer's 12s) can't hide its only cast
    // in an untracked warmup.
    const spoke = new Map(watch.map(pa => [pa.id, 0]));
    const prev = new Map(watch.map(pa => [pa.id, pa.mana]));
    const wasCasting = new Map(watch.map(pa => [pa.id, false]));
    const wantCurse = kit.rootId === 'effigy_porter';
    for (let i = 0; i < 720; i++) {
      const unspoken = watch.some(pa => (spoke.get(pa.id) ?? 0) <= 0);
      if (!unspoken && !(wantCurse && !idolCursed)) break;
      drum(1);
      for (const pa of watch) {
        const was = prev.get(pa.id) ?? pa.mana;
        if (pa.mana < was) spoke.set(pa.id, (spoke.get(pa.id) ?? 0) + (was - pa.mana));
        prev.set(pa.id, pa.mana);
        const now = !!pa.casting;
        if (now && !wasCasting.get(pa.id)) spoke.set(pa.id, (spoke.get(pa.id) ?? 0) + 1);
        wasCasting.set(pa.id, now);
      }
      if (wantCurse && hero.statuses.some(s => ((s as any).def?.id ?? s.id) === 'bewilder')) {
        idolCursed = true;
      }
    }
    for (const pa of watch) {
      if ((spoke.get(pa.id) ?? 0) <= 0) mute.push(`${kit.rootId}/${pa.defId}`);
    }
  }
  check('spoken verb: every caster part SPENDS in the melee scrum (plant-and-fire)',
    mute.length === 0, mute.join('; '));
  check("spoken verb: the idol's curse LANDS on the hero (bewilder worn)", idolCursed);
}

// ========================================================== THE SEAT CENSUS
// A composite that nothing can reach is an EXPENSIVE ghost: full defs for the
// root and every part, looks, painters, break numbers — all of it exercised
// by the static rigs above, none of it ever met in play. The Marsh Leviathan
// (the framework's own exemplar) lived exactly that way for years, and the
// only reason anyone noticed was a grep. So: every `boss: true` def carrying
// a `parts` array must resolve to a REACHABLE SEAT — a row in some standing
// registry that can put the body on the ground.
//
// The sweep is registry-only and deliberately EXPLICIT (a blind deep-walk
// would seat a def off any string that merely names it — including the very
// reserve list below). One named line per placement lane:
//   tilesets (packs/fauna/scenery/caveFaces/variants/lite pours) · zone defs
//   (packs/fauna/scenery/objective) · landmark spawn tables (the lair fabric's
//   in-zone lane rides this one) · faction rosters + high-court champions ·
//   the wave + wildlife tables · SIDEZONE MINTS, harvested by calling each
//   registered mint (the den bosses live inside those closures — the roost
//   dragon and the ordnance master are reachable no other way) · scene stages
//   (the prologue's Hordefather) · world-boss package defs, escorts, roamers.
//
// THE RESERVE EXEMPTION is itself a registry read, never a hand-kept list:
// HIGH_COURT zeniths and apexes are authored COMPLETE and deliberately
// DOORLESS by the reserves-and-remnants doctrine (data/monsters.ts says so on
// the registry), exactly like the Descent's weight-0 affix families. Reserved
// is not orphaned — but nothing else gets that grace.
//
// LAST in the file on purpose: the sidezone mints are the only lane that
// EXECUTES anything, and they run inside withSeededRandom so no other stream
// moves. Census law: `probe_` defs a probe injects into MONSTERS are its own
// process's business and never count as content.
{
  const seats = new Map<string, string>();
  const add = (id: unknown, where: string): void => {
    if (typeof id === 'string' && MONSTERS[id] && !seats.has(id)) seats.set(id, where);
  };
  const table = (t: unknown, where: string): void => {
    if (!Array.isArray(t)) return;
    for (const e of t as { id?: string }[]) add(e?.id, where);
  };
  /* eslint-disable @typescript-eslint/no-explicit-any */

  // 1 · TILESETS — packs, fauna, scenery, lite pours, down every cave face
  //     and every variant (a variant's own pack table is a real door).
  for (const t of Object.values(TILESETS) as any[]) {
    const eat = (o: any, where: string): void => {
      if (!o) return;
      table(o.packs?.table, where);
      table(o.fauna, where);
      for (const s of o.scenery ?? []) add(s?.monster, where);
      for (const sw of o.lite?.swarms ?? []) add(sw?.monsterId, where);
      for (const cf of o.caveFaces ?? []) eat(cf, where);
      for (const v of o.variants ?? []) eat(v, where);
    };
    eat(t, `tileset:${t.id}`);
  }
  // 2 · AUTHORED ZONES — the hand-built country's own populations + asks.
  for (const z of Object.values(ZONES) as any[]) {
    table(z.packs?.table, `zone:${z.id}`);
    table(z.fauna, `zone:${z.id}`);
    for (const s of z.scenery ?? []) add(s?.monster, `zone:${z.id}`);
    add(z.objective?.id, `zone:${z.id}`);
    add(z.objective?.spawnerId, `zone:${z.id}`);
  }
  // 3 · LANDMARK SPAWNS — the lair fabric's in-zone lane and every pit
  //     dweller: the cairn giant, the wellspring naiad, the drowned wallow.
  //     3b · BUILDER-SEATED RESIDENTS (the storm_crown debut): a builder
  //     that authors its own spawn row names WHO in the def's params — the
  //     resident param contract makes the seat data the census can read.
  for (const lm of landmarkDefs()) {
    table(lm.spawns?.table, `landmark:${lm.id}`);
    add((lm.params as { resident?: string } | undefined)?.resident, `landmark:${lm.id}`);
  }
  // 4 · FACTION ROSTERS + the high court's tabled CHAMPIONS.
  for (const [fid, f] of Object.entries(FACTIONS) as [string, any][]) table(f.table, `faction:${fid}`);
  for (const [fid, court] of Object.entries(HIGH_COURT)) add(court.champion, `court:${fid}`);
  // 5 · WAVE + WILDLIFE tables.
  for (const [k, rows] of Object.entries(WAVE_TABLE as any)) table(rows, `wave:${k}`);
  for (const [k, rows] of Object.entries(WILDLIFE)) table(rows, `wildlife:${k}`);
  // 6 · SIDEZONE MINTS — the den lane. A den's boss lives inside the mint
  //     CLOSURE, so the only honest read is to call it (pure by contract —
  //     probe_lairs pins byte-equal mints on one ctx) under a swapped stream.
  const parent = world.zoneMap[world.zone.id];
  let mintsRead = 0;
  const mintsRefused: string[] = [];
  withSeededRandom(0x5ea7, () => {
    for (const [kind, sz] of Object.entries(SIDEZONES)) {
      try {
        const def = sz.mint({
          parent, seed: 1234, id: `census_${kind}`,
          pos: { x: 0, y: 0 }, playerLevel: 10, pkgActive: () => false,
        }) as any;
        mintsRead++;
        add(def?.objective?.id, `sidezone:${kind}`);
        table(def?.fauna, `sidezone:${kind}`);
        table(def?.packs?.table, `sidezone:${kind}`);
      } catch (e) {
        mintsRefused.push(`${kind}: ${(e as Error).message.slice(0, 50)}`);
      }
    }
  });
  // A refused mint is a BLIND SPOT in the census, not a pass — say so loudly
  // rather than let an unread lane quietly manufacture a false orphan.
  check(`seat census: every sidezone mint reads (${mintsRead} dens harvested)`,
    mintsRefused.length === 0, mintsRefused.slice(0, 3).join('; '));
  // 7 · SCENE STAGES — scripted ground is a seat (the prologue's Hordefather).
  for (const sc of [PROLOGUE_SCENE, ...Object.values(SCENES)] as any[]) {
    for (const st of sc.stages ?? []) {
      add(st?.def, `scene:${sc.id}`);
      for (const s of st?.spawns ?? []) add(s?.def, `scene:${sc.id}`);
      for (const wv of st?.waves ?? []) for (const s of wv?.spawns ?? []) add(s?.def, `scene:${sc.id}`);
    }
  }
  // 8 · WORLD-BOSS package defs — the roamers, their passing bodies, escorts.
  for (const d of ((WORLDBOSS_SURGE as any).defs ?? []) as any[]) {
    add(d?.monster, `worldboss:${d?.id}`);
    add(d?.roam?.passingMonster, `worldboss:${d?.id}`);
    table(d?.escort?.table, `worldboss:${d?.id}`);
  }
  // 9 · THE HUNT'S QUARRY POOL — a HuntBeast row is a seat (the package
  //     materializes the quarry at the trail's end; no spawn table ever will).
  for (const b of HUNT_SURGE.beasts) add(b.defId, 'hunt:quarry');
  /* eslint-enable @typescript-eslint/no-explicit-any */

  const reserved = new Set<string>();
  for (const court of Object.values(HIGH_COURT)) {
    if (court.zenith) reserved.add(court.zenith);
    if (court.apex) reserved.add(court.apex);
  }
  const gamut = Object.values(MONSTERS)
    .filter(d => d.boss && d.parts?.length && !d.id.startsWith('probe_'));
  const orphans = gamut.filter(d => !seats.has(d.id) && !reserved.has(d.id));
  check(`seat census: every boss composite is REACHABLE (${gamut.length} judged, `
    + `${gamut.filter(d => reserved.has(d.id)).length} reserved by the high court)`,
    orphans.length === 0,
    orphans.map(d => `${d.id} — no spawn row, landmark, den, scene or roster seats it`).join('; '));
  // The census must be able to FAIL: a sweep that seats everything by accident
  // (a bug turning `add` into a no-op check, say) would pass in silence
  // forever. Pin that the marsh leviathan's seat is the landmark lane it was
  // actually given, and that the sweep found real ground for real bodies.
  check('seat census: the sweep resolves real seats (the leviathan on its wallow)',
    seats.get('marsh_leviathan') === 'landmark:leviathan_wallow' && seats.size > 300,
    `${seats.size} seated; leviathan → ${seats.get('marsh_leviathan') ?? 'NOWHERE'}`);
}

// ========================================================== THE DRESS CENSUS
// The wayside doctrine's own gate. howdah_wreck shipped FULLY BUILT — painter
// row, rule, stamp — and stood in ZERO tilesets for a month, because no gate
// asked. Now the ledger asks: every kin ANATOMY_DRESS declares (the wayside
// ledger, data/formations.ts) must have a COMPLETE kit — a visuals row on a
// REGISTERED painter (zero renderer edits is the recipe's whole point), a
// placement rule + a stamp — AND a tileset reference on ground the kin can
// actually roll: a direct spawn seat on any face (the seat census's tileset
// lanes), or a tileset whose biome's PATRON faction fields the kin (the
// land's own power walks its own country — world/biomes.ts patronFaction →
// FACTIONS[pf].table: the graves field the Host, the flesh fields the Glut).
// Declaring a pair without placing it stops the build; an undeclared kit is
// invisible here, so the ledger row ships WITH the kit.
{
  const rollGround = new Map<string, Set<string>>();   // kin id → tilesets it can roll in
  const dressGround = new Map<string, Set<string>>();  // dress kind → tilesets referencing it
  const note = (m: Map<string, Set<string>>, k: string, tid: string): void => {
    const s = m.get(k) ?? new Set<string>();
    s.add(tid); m.set(k, s);
  };
  /* eslint-disable @typescript-eslint/no-explicit-any */
  for (const [tid, t] of Object.entries(TILESETS) as [string, any][]) {
    const eat = (o: any): void => {
      if (!o) return;
      for (const e of o.packs?.table ?? []) if (e?.id) note(rollGround, e.id, tid);
      for (const e of o.fauna ?? []) if (e?.id) note(rollGround, e.id, tid);
      for (const s of o.scenery ?? []) if (s?.monster) note(rollGround, s.monster, tid);
      for (const row of o.layout ?? []) if (row?.kind) note(dressGround, row.kind, tid);
      for (const row of o.common ?? []) if (row?.kind) note(dressGround, row.kind, tid);
      for (const cf of o.caveFaces ?? []) eat(cf);
      for (const v of o.variants ?? []) eat(v);
    };
    eat(t);
    const pf = t.biome ? patronFaction(t.biome) : null;
    if (pf) for (const e of (FACTIONS as Record<string, any>)[pf]?.table ?? []) {
      if (e?.id) note(rollGround, e.id, tid);
    }
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const bad: string[] = [];
  for (const [kin, dress] of Object.entries(ANATOMY_DRESS)) {
    if (!MONSTERS[kin]) { bad.push(`${kin}: ledger names an unknown kin`); continue; }
    const vis = DOODAD_VISUALS[dress];
    if (!vis) { bad.push(`${kin}: dress '${dress}' has no DOODAD_VISUALS row`); continue; }
    if (!PAINTERS[vis.painter]) { bad.push(`${kin}: dress '${dress}' painter '${vis.painter}' unregistered`); continue; }
    if (!hasDoodadRule(dress)) { bad.push(`${kin}: dress '${dress}' has no doodad rule`); continue; }
    if (!hasStamp(dress)) { bad.push(`${kin}: dress '${dress}' has no stamp`); continue; }
    const home = [...(rollGround.get(kin) ?? [])].filter(t2 => dressGround.get(dress)?.has(t2));
    if (home.length === 0) bad.push(`${kin}: dress '${dress}' stands in NO tileset the kin can roll in`);
  }
  check(`dress census: every declared wayside kit is complete AND placed on its kin's own ground (${Object.keys(ANATOMY_DRESS).length} pairs)`,
    bad.length === 0, bad.slice(0, 4).join('; '));
  // The census must be able to FAIL (the seat census's law): pin one known
  // pairing end-to-end — the crab's midden stands on the crab's own shore.
  check("dress census: the sweep resolves real ground (whelk_midden on the pavise crab's shore)",
    [...(rollGround.get('pavise_crab') ?? [])].some(t2 => dressGround.get('whelk_midden')?.has(t2)));
}

// ================================== THE AMBIENT CENSUS (wildlife pass 2)
// Every biome breathes or carries a written ruling — the coverage floor the
// ambient expansion promised, pinned so a NEW biome can never fall silent by
// accident and no ambience can ever wall an objective unnoticed.
{
  const RULED_SILENT = new Set([
    'eldritch', // dead air IS the blight's ambience (the Incursion pours its own kin)
    'ocean',    // structurally unreadable: sea zones are `special` — spawnWildlife never looks
    'river',    // virtual course biome worn by NO zone — a row could never spawn
  ]);
  // 1 · The coverage floor: every registered biome keeps a roster or a ruling,
  //     and no roster runs thin. ('plains' is the untagged-zone fallback key.)
  const silent = Object.keys(BIOMES).filter(b => !WILDLIFE[b] && !RULED_SILENT.has(b));
  check(`wildlife census: every biome breathes or is ruled silent (${Object.keys(BIOMES).length} biomes)`,
    silent.length === 0, silent.join(','));
  const thin = Object.entries(WILDLIFE).filter(([, rows]) => rows.length < 3).map(([k]) => k);
  check('wildlife census: no roster runs thinner than 3 rows', thin.length === 0, thin.join(','));
  const ruledYetRostered = [...RULED_SILENT].filter(b => WILDLIFE[b]);
  check('wildlife census: a ruling and a roster never coexist', ruledYetRostered.length === 0,
    ruledYetRostered.join(','));
  const strayKeys = Object.keys(WILDLIFE).filter(k => k !== 'plains' && !BIOMES[k]);
  check('wildlife census: every roster key names a real biome (plus the plains fallback)',
    strayKeys.length === 0, strayKeys.join(','));

  // 2 · The ambient-tag contract: a wildlife body is objective-exempt (tag in
  //     AMBIENT_TAGS, or def-level noObjective/passive) or stands on the FROZEN
  //     counted-texture allowlist — killable, reachable ordinary population the
  //     design deliberately counts (crows, folk, the gilded pair, two re-seated
  //     fighters). Growing that list is a deliberate act, never drift.
  const COUNTED_TEXTURE = new Set([
    'gilded_scamp', 'gilded_hoarder', // the payout pair ('gilded_hoard' keys the spill)
    'crofter', 'village_warden',      // farmland folk (warden = live holdfast guardian tag)
    'carrion_crow', 'quag_gel', 'bloat_mother', 'pale_watcher', // legacy counted texture
    'tide_skitter', 'crag_condor',    // re-seated fighters (shore skirmisher, dive-wheel)
  ]);
  const tagBreaches: string[] = [];
  for (const [k, rows] of Object.entries(WILDLIFE)) {
    for (const r of rows) {
      const d = MONSTERS[r.id];
      if (!d) { tagBreaches.push(`${k}:${r.id} MISSING`); continue; }
      const exempt = (d.tag && AMBIENT_TAGS.has(d.tag)) || d.noObjective || d.passive;
      if (!exempt && !COUNTED_TEXTURE.has(r.id)) tagBreaches.push(`${k}:${r.id} tag '${d.tag ?? '(none)'}'`);
    }
  }
  check('wildlife census: every body is objective-exempt or frozen counted texture',
    tagBreaches.length === 0, tagBreaches.slice(0, 5).join('; '));

  // 3 · The differentiation debuts hold their shape (the census must be able
  //     to FAIL — pin the marquee levers, not just existence):
  //     the sea murmurates, the lamps stay lit, the waltzers stay slow, the
  //     mouser drowses, and the thief still steals-and-exits.
  const flocked = (id: string): boolean => !!(MONSTERS[id]?.brain as any)?.behavior?.flock;
  check('wildlife debuts: the drowned country murmurates (silver_shoal flocks in deepsea)',
    flocked('silver_shoal') && (WILDLIFE.deepsea ?? []).some(r => r.id === 'silver_shoal'));
  check('wildlife debuts: the sky-realm family flies its three moods (dove/darter/star)',
    ['aether', 'aether_drift', 'aether_vesper', 'aether_civitas', 'aether_stream']
      .every(k => (WILDLIFE[k] ?? []).length >= 3) && flocked('gleam_dove') && flocked('zephyr_darter'));
  check('wildlife debuts: the carried lamps stay lit (moth/jelly/minnow wear light)',
    ['cinder_moth', 'star_moth', 'soul_moth', 'moon_jelly', 'soul_minnow'].every(id => !!MONSTERS[id]?.light));
  check('wildlife debuts: the waltzers stay slow (snail/polyp/salamander/jelly ≤ 60)',
    ['dripstone_snail', 'wandering_polyp', 'vent_salamander', 'moon_jelly', 'spore_puff']
      .every(id => (MONSTERS[id]?.base.moveSpeed ?? 999) <= 60));
  check('wildlife debuts: the mouser drowses on watch and hunts by hunger (the manor drama)',
    !!MONSTERS.manor_mouser?.watch?.sleep && !!MONSTERS.manor_mouser?.brain?.drives?.hunger
    && (WILDLIFE.manor ?? []).some(r => r.id === 'manor_mouser')
    && (WILDLIFE.manor ?? []).some(r => r.id === 'gutter_rat'));
  check('wildlife debuts: the tailthief steals and exits (looter + refuge, critter-tagged)',
    !!MONSTERS.ruin_tailthief?.looter && !!MONSTERS.ruin_tailthief?.refuge
    && MONSTERS.ruin_tailthief?.tag === 'critter');

  // 4 · THE SCENERY CONTRACT (World.bootScenery; data/validate.ts): every
  //     scenery row — tileset AND authored zone — names a def that is
  //     passive (an object-actor: the crystal country's voices) or
  //     ambient-exempt (fauna: the garden's marching ant files). The lane
  //     plants at LOAD inside the zoneGenTagging window, so a breach here
  //     would be a load-time body that COUNTS toward objectives — walling
  //     clears invisibly on every fresh mint. Judged by the SAME predicate
  //     as census 2 (AMBIENT_TAGS / noObjective / passive) — the validator,
  //     the scoreboard and this census can never disagree.
  const sceneryBreaches: string[] = [];
  const sceneryRows: { where: string; monster: string }[] = [];
  for (const t of Object.values(TILESETS)) {
    for (const row of t.scenery ?? []) sceneryRows.push({ where: `tileset:${t.id}`, monster: row.monster });
  }
  for (const z of Object.values(ZONES)) {
    for (const row of z.scenery ?? []) sceneryRows.push({ where: `zone:${z.id}`, monster: row.monster });
  }
  for (const { where, monster } of sceneryRows) {
    const d = MONSTERS[monster];
    if (!d) { sceneryBreaches.push(`${where}:${monster} MISSING`); continue; }
    const exempt = (d.tag && AMBIENT_TAGS.has(d.tag)) || d.noObjective || d.passive;
    if (!exempt) sceneryBreaches.push(`${where}:${monster} tag '${d.tag ?? '(none)'}'`);
  }
  check('scenery contract: every planted row is passive or ambient-exempt (never objective-counting)',
    sceneryBreaches.length === 0, sceneryBreaches.slice(0, 5).join('; '));
  check('scenery contract: the garden\'s marching files are the blessed-fauna debut (rows exist + critter-tagged)',
    sceneryRows.some(r => r.monster === 'ant_trail')
    && MONSTERS.ant_trail.tag === 'critter' && AMBIENT_TAGS.has('critter'));
}

// ================================== THE FIXTURE CENSUS (FIXTURE_IDS)
// Every monster id the ENGINE mints as standing furniture (world.ts
// createMonster / config literals — town fixtures, event bodies, hold wards,
// cache floors) lives in data/monsters.ts FIXTURE_IDS and must resolve to a
// real def. The validate net warns at boot; this census GATES — a renamed
// def under a fixture key, or a key drifting from its id (one grep finds
// def + registry + mint sites only while they match), stops the build here.
{
  const missing = Object.entries(FIXTURE_IDS).filter(([, fid]) => !MONSTERS[fid]);
  check(`fixture census: every FIXTURE_IDS entry resolves to a real MonsterDef (${Object.keys(FIXTURE_IDS).length} fixtures)`,
    missing.length === 0, missing.map(([k, fid]) => `${k}→'${fid}'`).join(', '));
  const drifted = Object.entries(FIXTURE_IDS).filter(([k, fid]) => k !== fid);
  check('fixture census: keys equal ids (the one-grep law)',
    drifted.length === 0, drifted.map(([k, fid]) => `${k}→'${fid}'`).join(', '));
}

console.log(failed === 0 ? '\nprobe_anatomy: ALL GREEN' : `\nprobe_anatomy: ${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
