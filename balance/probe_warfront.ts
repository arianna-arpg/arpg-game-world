// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE WARFRONT COUNTRY + THE BOMBARDMENT FABRIC end to end
// on the real registries and the real engine: the hell-only biome seat (the
// caul pattern — underworld palette, never BIOME_FIELD), the staging law
// (grindfields rim → siegefront line, the den never field-minting), the
// siege-furniture contracts (rules + stamps + visuals + painters), the
// powder_magazine → ordnance_yard den chain (boss seated, noDeeper, the
// gateway ledger + the Siegecraft pool row), Bhorog's roster growth, the
// war_column event's biome gate — and THE FABRIC LAWS live on a sim world:
// the opening roll, the one-clock-per-gun cadence, the D2 target law (the
// rain follows the SEAT), sky-borne zone posture (hitAll + spareDormant +
// spareRoofed + the lob comet fields + impact dress), THE SILENCE LAW
// (break the arm → the gun goes quiet but still stands), the player-owned
// assist law (a planted hellbore shells only what presses its keeper), the
// impact-dress plant + cap, and the siegebreaker fold's exact ratio.
// Run: npx tsx balance/probe_warfront.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import { doodadRuleOf } from '../src/engine/levelgen';
import { makeSkillInstance } from '../src/engine/skills';
import { mod, STAT_DEFS } from '../src/engine/stats';
import { BOMBARD_CFG } from '../src/engine/bombard';
import { TILESETS, pickTilesetForBiome } from '../src/data/tilesets';
import { BIOMES, BIOME_FIELD } from '../src/world/biomes';
import { dimensionDef } from '../src/world/dimensions';
import { MONSTERS } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { PART_PAINTERS } from '../src/render/vis/parts';
import { PAINTERS } from '../src/render/vis/painters';
import '../src/render/vis/paintersWarfront';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { SKILLS } from '../src/data/skills';
import { SUPPORTS } from '../src/data/supports';
import { sidezoneOf } from '../src/data/sidezones';
import { zoneEventDef } from '../src/engine/events';
import { UNLOCK_CATALOG } from '../src/meta/unlocks';
import { allLords } from '../src/packages/lords';
import type { World } from '../src/engine/world';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xb0ba4d);

const step = (w: World, seconds: number): void => {
  const dt = 1 / 60;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    w.applyInputs(new Map(), dt);
    for (const a of [...w.actors]) updateAI(a, w, dt);
    w.update(dt);
  }
};

// --- 1) The biome seat (hell-only: the caul pattern) -------------------------
{
  const b = BIOMES.warfront;
  check('biome: warfront exists under the demon patron',
    !!b && b.patronFaction === 'demon');
  check('biome: NEVER in the surface field (hell-only, the caul law)',
    !BIOME_FIELD.some(r => r.biome === 'warfront'));
  const uw = dimensionDef('underworld');
  check('biome: seated in the underworld palette at country weight',
    !!uw?.biomes?.some(r => r.biome === 'warfront' && r.weight >= 2));
  check('biome: the crater landmark family pocks the country',
    !!b?.landmarks?.some(l => l.landmark === 'crater' && l.chance >= 0.3));
}

// --- 2) The staging law (shelled rim → active line; the den never mints) -----
{
  const at = (depth: number): Record<string, number> => {
    const rng = new Rng(0x4a11 ^ Math.round(depth * 1000));
    const seen: Record<string, number> = {};
    for (let i = 0; i < 240; i++) {
      const id = pickTilesetForBiome('warfront', rng, depth) ?? 'none';
      seen[id] = (seen[id] ?? 0) + 1;
    }
    return seen;
  };
  const rim = at(0.06), mid = at(0.5), deep = at(0.92);
  check('staging: the rim is shelled approach only (no siegefront yet)',
    (rim.grindfields ?? 0) > 200 && !rim.siegefront, `rim ${JSON.stringify(rim)}`);
  check('staging: the middle mixes approach and line',
    (mid.grindfields ?? 0) > 40 && (mid.siegefront ?? 0) > 40, `mid ${JSON.stringify(mid)}`);
  check('staging: the deep country is the gun line (the approach ends)',
    (deep.siegefront ?? 0) > 200 && !deep.grindfields, `deep ${JSON.stringify(deep)}`);
  check('membership: the ordnance yard never field-mints (frontier:false)',
    TILESETS.ordnance_yard.frontier === false);
  check('perf: the den opts into the standing perf matrix',
    TILESETS.ordnance_yard.perfProbe === true);
  check('objective: both frontier faces make the spawners hunt the SIGNATURE',
    [TILESETS.grindfields, TILESETS.siegefront].every(t =>
      t.spawnerId === 'hell_trebuchet'
      && (t.objectives ?? []).some(o => o.kind === 'spawners'
        && o.weight >= Math.max(...(t.objectives ?? []).map(x => x.weight)))));
}

// --- 3) The siege furniture contracts ----------------------------------------
{
  for (const kind of ['shell_crater', 'gabion', 'siege_shot', 'siege_wreck', 'war_standard', 'powder_magazine']) {
    const rule = doodadRuleOf(kind);
    const vis = DOODAD_VISUALS[kind];
    check(`furniture: ${kind} wears rule + visual + a real painter`,
      !!rule && !!vis && !!PAINTERS[vis.painter],
      `painter '${vis?.painter}'`);
  }
  check('furniture: the pock is GROUND (you fight across it, never around it)',
    doodadRuleOf('shell_crater').overlap === 'ground');
  check('furniture: the wreck is hard cover (blocks shot, casts sight-shadow)',
    doodadRuleOf('siege_wreck').blocksShot === true);
  check('furniture: the magazine is a trigger doorway, spaced like a gate',
    doodadRuleOf('powder_magazine').overlap === 'trigger'
    && (doodadRuleOf('powder_magazine').spacing ?? 0) >= 200);
}

// --- 4) The siege-works kin (defs, looks, parts, painters) -------------------
{
  const t = MONSTERS.hell_trebuchet;
  check('trebuchet: a wooden SPAWNER structure (objective-counted, corpseless)',
    !!t && t.spawner === true && t.material === 'wood' && t.base.moveSpeed === 0);
  check('trebuchet: wears the bombard clock on its own kit skill',
    t.bombard?.skillId === 'hellshot_volley' && t.skills.includes('hellshot_volley'));
  check('trebuchet: the ARM is its break-lesson (breakDisables the volley)',
    !!t.parts?.some(p => p.monster === 'trebuchet_arm'
      && p.breakDisables?.includes('hellshot_volley')));
  check('bannerman + master + engine + rack: all minted with real looks',
    ['grind_bannerman', 'ordnance_master', 'shot_rack', 'trebuchet_arm', 'hellbore_engine']
      .every(id => !!MONSTERS[id] && !!LOOKS[MONSTERS[id].look ?? id]));
  check('master: the den boss, rack-fed (breakDisables the cannonade)',
    MONSTERS.ordnance_master.boss === true
    && !!MONSTERS.ordnance_master.parts?.some(p => p.monster === 'shot_rack'
      && p.breakDisables?.includes('infernal_cannonade')));
  for (const kind of ['trebuchetRig', 'trebuchetArm', 'shotHopper']) {
    check(`kit part: '${kind}' painter registered`, !!PART_PAINTERS[kind]);
  }
  for (const lookId of ['hell_trebuchet', 'trebuchet_arm', 'hellbore_engine', 'grind_bannerman', 'ordnance_master', 'shot_rack']) {
    const bad = (LOOKS[lookId]?.parts ?? []).filter(p => !PART_PAINTERS[p.kind]);
    check(`look: '${lookId}' resolves every part kind`, bad.length === 0,
      bad.map(p => p.kind).join(','));
  }
  const lord = allLords().find(l => l.id === 'bhorog');
  const roster = (lord as unknown as { roster?: { id: string }[] })?.roster ?? [];
  check('the Iron Grind: Bhorog fields the new kin wherever he rules',
    !!lord && ['grind_bannerman', 'hell_trebuchet'].every(id =>
      roster.some(r => r.id === id)));
}

// --- 5) The den chain + the gateway seam -------------------------------------
{
  const door = sidezoneOf('powder_magazine');
  check('den: the magazine door is registered and stamps the gateway ledger',
    !!door && door.ledgerOnEnter === 'ordnance_yard_entered');
  const pool = UNLOCK_CATALOG.find(u => u.id === 'gem_skills_siegecraft');
  const poolSkills = (pool?.payload as { skillIds?: string[] } | undefined)?.skillIds ?? [];
  check('den: the Siegecraft pool waits on the yard walked',
    !!pool && pool.reqLedger === 'ordnance_yard_entered'
    && poolSkills.includes('hellbore_mortar'));
  const col = zoneEventDef('war_column');
  check('war column: registered, biome-gated, and NOT for other countries',
    !!col
    && col.choose({ owner: null, ownerPower: 0, biome: 'warfront', contestants: [], invader: null, isNight: true, hasCamps: true, hasRoute: true, nearHome: true }, 0.1)?.kind === 'war_column'
    && col.choose({ owner: null, ownerPower: 0, biome: 'grove', contestants: [], invader: null, isNight: true, hasCamps: true, hasRoute: true, nearHome: true }, 0.1) === null);
}

// --- 6) The skills + the gems ------------------------------------------------
{
  const v = SKILLS.hellshot_volley;
  const d = v?.delivery;
  check('hellshot: a sky-borne lobbed storm with impact dress, never a gem',
    !!v && v.noDrop === true && d?.type === 'storm' && d.sky === true
    && !!d.lob && d.impactDress?.kind === 'shell_crater'
    && (d.telegraph ?? 0) >= 1 && d.occlusion === 'free');
  const lob = SKILLS.hellbore_lob;
  check('hellbore lob: the keeper-scoped cousin (NO sky — never friendly fire)',
    !!lob && lob.noDrop === true && lob.delivery.type === 'storm'
    && (lob.delivery as { sky?: true }).sky === undefined);
  const m = SKILLS.hellbore_mortar;
  check('hellbore mortar: plants the engine as an ordinary summon',
    !!m && m.delivery.type === 'summon' && m.delivery.monsterId === 'hellbore_engine');
  check('engine minion: wears the SAME fabric (the fabric eats its own tail)',
    MONSTERS.hellbore_engine.bombard?.skillId === 'hellbore_lob'
    && MONSTERS.hellbore_engine.skills.includes('hellbore_lob'));
  check('gems: siegebreaker + sustained_barrage registered with real stats',
    !!SUPPORTS.siegebreaker && !!SUPPORTS.sustained_barrage
    && !!STAT_DEFS.siegebreaker && !!STAT_DEFS.stormCount);
}

// =============================================================================
// THE FABRIC LAWS, LIVE (a sim world; the arena's safe-ground gate flipped —
// the workshop law waives discipline there, but the GUNS need a war).
// =============================================================================
const w = makeSimWorld('warrior', 0xb0ba4d);
w.zone.objective = { kind: 'clear' };
const hero = w.player;
hero.sheet.setSource('probe', [mod('life', 'flat', 99999), mod('mana', 'flat', 999)]);
hero.life = hero.maxLife();
hero.mana = hero.maxMana();
hero.pos = vec(600, 500);

const spawnGun = (x: number, y: number): Actor => {
  const g = (w as unknown as { createMonster(id: string, lv: number, team: string): Actor })
    .createMonster('hell_trebuchet', 10, 'enemy');
  g.pos = vec(x, y);
  w.actors.push(g);
  return g;
};

// --- 7) The opening roll + the one-clock cadence -----------------------------
{
  const gun = spawnGun(1600, 500);
  step(w, 0.1);
  const [o0, o1] = BOMBARD_CFG.opening;
  check('L1 opening: a fresh gun RANGES IN (never an alpha strike)',
    gun.bombardAt !== undefined
    && gun.bombardAt - w.time > o0 - 0.2 && gun.bombardAt - w.time <= o1 + 0.2,
    `bombardAt in ${(gun.bombardAt! - w.time).toFixed(1)}s`);
  check('L1 parts: the arm attached itself to the standing gun',
    (gun.partActors?.length ?? 0) === 1 && gun.partActors![0].defId === 'trebuchet_arm');

  // Force the clock due and let the cast play out.
  gun.bombardAt = w.time;
  step(w, 2.2); // useTime 1.1 + margin
  const shells = w.zones.filter(z => z.caster === gun);
  check('L2 the shot: the volley rides the ONE pipeline (zones from the gun itself)',
    shells.length >= 2, `${shells.length} shells`);
  check('L2 sky posture: hitAll + spareDormant + spareRoofed (weather, not a duel)',
    shells.every(z => z.hitAll === true && z.spareDormant === true && z.spareRoofed === true));
  check('L2 the comet: every shell knows where it was thrown from (lobFrom + delay0)',
    shells.every(z => !!z.lobFrom && (z.delay0 ?? 0) > 0));
  check('L2 impact dress: every shell will pock the ground it strikes',
    shells.every(z => z.impactDress?.kind === 'shell_crater'));
  check('L2 target law: the rain follows the SEAT (scatter centered on the hero)',
    shells.every(z => Math.hypot(z.pos.x - hero.pos.x, z.pos.y - hero.pos.y) <= 130),
    `max off ${Math.max(...shells.map(z => Math.hypot(z.pos.x - hero.pos.x, z.pos.y - hero.pos.y))).toFixed(0)}`);
  const [c0, c1] = MONSTERS.hell_trebuchet.bombard!.cadence;
  check('L3 cadence: the clock re-rolled inside its own jitter window',
    gun.bombardAt! - w.time > 0 && gun.bombardAt! - w.time <= c1 + 0.2
    && gun.bombardAt! - w.time >= c0 - 2.2 - 0.2, // step time already elapsed
    `next in ${(gun.bombardAt! - w.time).toFixed(1)}s`);

  // --- 8) THE SILENCE LAW (break the arm; the hulk still stands) -------------
  const arm = gun.partActors![0];
  (w as unknown as { kill(a: Actor, silent: boolean, killer?: Actor): void }).kill(arm, false, hero);
  step(w, 0.2);
  check('L4 the break: the volley is DISARMED off the root (breakDisables)',
    !gun.skills.some(s => s?.def.id === 'hellshot_volley') && !gun.dead);
  const before = w.zones.filter(z => z.caster === gun).length;
  gun.bombardAt = w.time;
  step(w, 2.4);
  const after = w.zones.filter(z => z.caster === gun).length;
  check('L4 the silence: a due clock on a disarmed gun fires NOTHING',
    after <= before, `${before} -> ${after}`);
  check('L4 the retry: the clock keeps asking (a refusal, never a crash)',
    gun.bombardAt !== undefined && gun.bombardAt > w.time - 1e-9 - BOMBARD_CFG.retrySec);
  check('L4 the hulk: still standing, still a counted spawner for the objective',
    !gun.dead && MONSTERS[gun.defId!].spawner === true);
  (w as unknown as { kill(a: Actor, silent: boolean, killer?: Actor): void }).kill(gun, false, hero);
}

// --- 9) THE ASSIST LAW (the player-owned gun serves its keeper) --------------
{
  step(w, 0.5); // settle
  const inst = makeSkillInstance(SKILLS.hellbore_mortar, 1);
  hero.skills[0] = inst; // the reconciler's law: a standing army needs its skill ON the bar
  const ok = w.useSkill(hero, inst, vec(hero.pos.x + 20, hero.pos.y));
  step(w, 1.4);
  const engine = w.actors.find(a => a.defId === 'hellbore_engine' && !a.dead);
  check('L5 the plant: the mortar summons a real owned engine', ok && !!engine
    && engine!.owner === hero);
  if (engine) {
    // No hostile near the keeper: a due clock holds its fire.
    for (const a of [...w.actors]) {
      if (a.team === 'enemy' && !a.dead) {
        (w as unknown as { kill(a: Actor, silent: boolean): void }).kill(a, true);
      }
    }
    engine.bombardAt = w.time;
    step(w, 1);
    const idle = w.zones.filter(z => z.caster === engine).length;
    check('L5 the discipline: no foe pressing the keeper → the gun holds fire', idle === 0);
    // A hostile inside the assist ring: the gun answers.
    const foe = (w as unknown as { createMonster(id: string, lv: number, team: string): Actor })
      .createMonster('imp', 8, 'enemy');
    foe.pos = vec(hero.pos.x + 180, hero.pos.y);
    w.actors.push(foe);
    engine.bombardAt = w.time;
    step(w, 1.6);
    const answered = w.zones.filter(z => z.caster === engine);
    check('L5 the answer: the engine shells what presses its keeper',
      answered.length >= 1
      && answered.every(z => Math.hypot(z.pos.x - foe.pos.x, z.pos.y - foe.pos.y) <= 90),
      `${answered.length} shells`);
    check('L5 keeper safety: the owned lob is NOT sky-borne (no hitAll)',
      answered.every(z => z.hitAll !== true));
  }
}

// --- 10) IMPACT DRESS: the pock, the drying, the cap -------------------------
{
  const dressCount = (): number => w.doodads.filter(d => d.blastDress && !d.gone).length;
  const base = dressCount();
  const plant = (x: number, y: number): void =>
    (w as unknown as { plantImpactDress(z: { pos: { x: number; y: number }; radius: number; impactDress?: { kind: string; evapAfter?: [number, number]; chance?: number } }): void })
      .plantImpactDress({ pos: { x, y }, radius: 30, impactDress: { kind: 'shell_crater', chance: 1 } });
  plant(700, 500);
  check('L6 the pock: an impact plants a drying shell_crater (evap armed)',
    dressCount() === base + 1
    && w.doodads.some(d => d.blastDress && !!d.evap && d.evap.t > 0));
  for (let i = 0; i < BOMBARD_CFG.dressCap + 4; i++) {
    plant(400 + (i % 24) * 28, 300 + Math.floor(i / 24) * 30);
  }
  const standing = dressCount();
  const forced = w.doodads.filter(d => d.blastDress && d.evap && d.evap.t === 0).length;
  check('L6 the cap: past the budget the OLDEST pocks dry NOW',
    standing >= BOMBARD_CFG.dressCap && forced >= 4,
    `${standing} standing, ${forced} forced dry`);
}

// --- 11) THE SIEGEBREAKER FOLD (exact ratio via same-seed replay) ------------
{
  const mk = (id: string): Actor => {
    const a = (w as unknown as { createMonster(id: string, lv: number, team: string): Actor })
      .createMonster(id, 10, 'enemy');
    a.pos = vec(hero.pos.x + 40, hero.pos.y);
    w.actors.push(a);
    return a;
  };
  hero.sheet.setSource('probe_siege', [mod('siegebreaker', 'flat', 1.0)]);
  const inst = makeSkillInstance(SKILLS.firebolt ?? SKILLS.cleave, 1);
  const hit = (victim: Actor): number => {
    const before = victim.life;
    seedGlobalRandom(0x5ea1);
    (w as unknown as { resolveHit(c: Actor, i: unknown, v: Actor): void }).resolveHit(hero, inst, victim);
    return before - victim.life;
  };
  const rooted = mk('hell_trebuchet');   // stationary by mint (moveSpeed 0)
  const walker = mk('hellhound');        // same blow, a body that can walk
  const dr = hit(rooted);
  const dw = hit(walker);
  // Different defs mitigate differently — so compare each against ITSELF
  // with the stat stripped (the honest A/B: one variable).
  hero.sheet.setSource('probe_siege', []);
  const rooted2 = mk('hell_trebuchet');
  const walker2 = mk('hellhound');
  const dr0 = hit(rooted2);
  const dw0 = hit(walker2);
  check('L7 siegebreaker: doubles the blow into the ROOTED body only',
    dr > dr0 * 1.85 && dr < dr0 * 2.15 && Math.abs(dw - dw0) < Math.max(1, dw0 * 0.1),
    `rooted ${dr0.toFixed(1)}->${dr.toFixed(1)}, walker ${dw0.toFixed(1)}->${dw.toFixed(1)}`);
  check('L7 the stamp: minted engines wear stationary; walkers never do',
    rooted.stationary === true && walker.stationary === undefined);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
