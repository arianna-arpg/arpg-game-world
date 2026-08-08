// ---------------------------------------------------------------------------
// ONE-OFF PROBE — MONSTER INFREQUENTS: the themed drop-pool fabric
// (data/infrequents.ts) held WHOLE. A theme is a string shared by three
// registries — monsters (MONSTER_THEMES / MonsterDef.infrequentTheme), bases
// (the mi_<theme> tag, dropWeight 0), affixes (baseTags gate) — and nothing
// enforces the triangle at build time, so a theme wired on the monster side
// with no bases behind it would roll GENERIC loot forever, silently. This rig
// is that fence.
// Pins:
//   RIG A — THE COMMISSION: the eight defs the 2026-07-26 brief named
//     (bandit_trapsmith, pit_champion, warband_skald, camp_bannerman,
//     barrow_swordsaint, gnoll_impaler, abyssal_horologist, rift_ascetic)
//     each resolve a theme through the reader's OWN precedence expression
//     (def.infrequentTheme ?? MONSTER_THEMES[defId]); every MONSTER_THEMES
//     key names a real MonsterDef (the typo net); MI_CFG.chance is armed.
//   RIG B — THE TRIANGLE CENSUS: every theme any monster resolves names
//     ≥2 mi_<theme>-tagged bases (dropWeight 0 — out of the world pool,
//     ≥2 distinct categories, a signature implicit each) and ≥1 affix
//     family gated on that same tag.
//   RIG C — POOL PURITY: pickThemedBase returns only bases carrying the
//     asked theme's tag (never null for a shipped theme, at shallow and
//     deep ilvl), and null for a theme nobody registered.
//   RIG D — THE LIVE MINT: an unconstrained pull through resolveLootTable
//     with miTheme set actually mints from the theme pool (seeded), never
//     from ANOTHER theme's pool; and with no miTheme the world pool never
//     coughs up an mi_ base (the dropWeight-0 law, end to end).
// Run: npx tsx balance/probe_infrequents.ts
// ---------------------------------------------------------------------------

import { MI_CFG, MONSTER_THEMES } from '../src/data/infrequents';
import { MONSTERS } from '../src/data/monsters';
import { ITEM_BASES } from '../src/data/itembases';
import { ITEM_AFFIXES } from '../src/data/itemaffixes';
import { PROCS, procStat } from '../src/data/procs';
import { SKILLS } from '../src/data/skills';
import { compileItemMods, pickThemedBase, rollItem } from '../src/engine/itemgen';
import { resolveLootTable } from '../src/engine/loot';
import { makeSkillInstance } from '../src/engine/skills';
import { mod } from '../src/engine/stats';
import { setSimTap } from '../src/engine/tap';
import {
  WORN_THRONGS, wornThrongCap, wornThrongCount, wornThrongPeriod,
  wornThrongStat, wornThrongTtl,
} from '../src/engine/throng';
import { vec } from '../src/core/math';
import { updateAI } from '../src/engine/ai';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { deriveSeed, mulberry32, seedGlobalRandom } from '../src/sim/rng';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0x1f2e3d4c);

/** The reader's own precedence (world.ts rollDrops): per-def wins, table falls back. */
const themeOf = (defId: string): string | undefined =>
  MONSTERS[defId]?.infrequentTheme ?? MONSTER_THEMES[defId];

/** Every theme ANY monster resolves — table values + per-def declarations. */
const themes = new Set<string>(Object.values(MONSTER_THEMES));
for (const def of Object.values(MONSTERS)) {
  if (def.infrequentTheme) themes.add(def.infrequentTheme);
}

const basesFor = (theme: string) =>
  Object.values(ITEM_BASES).filter(b => b.tags.includes(`mi_${theme}`));

// ================================================== RIG A — THE COMMISSION
{
  const commissioned = [
    'bandit_trapsmith', 'pit_champion', 'warband_skald', 'camp_bannerman',
    'barrow_swordsaint', 'gnoll_impaler', 'abyssal_horologist', 'rift_ascetic',
  ];
  const unwired = commissioned.filter(id => !MONSTERS[id] || themeOf(id) === undefined);
  check(`commission: the eight named defs each resolve a theme (${commissioned.length} defs)`,
    unwired.length === 0, unwired.join(', '));

  const ghosts = Object.keys(MONSTER_THEMES).filter(id => !MONSTERS[id]);
  check(`typo net: every MONSTER_THEMES key names a real MonsterDef (${Object.keys(MONSTER_THEMES).length} rows)`,
    ghosts.length === 0, ghosts.join(', '));

  check('the fabric is armed: 0 < MI_CFG.chance <= 1',
    MI_CFG.chance > 0 && MI_CFG.chance <= 1, `chance=${MI_CFG.chance}`);
}

// ============================================ RIG B — THE TRIANGLE CENSUS
{
  const families = Object.values(ITEM_AFFIXES);
  for (const theme of [...themes].sort()) {
    const tag = `mi_${theme}`;
    const bases = basesFor(theme);
    check(`census '${theme}': >= 2 themed bases`, bases.length >= 2,
      bases.map(b => b.id).join(', ') || 'none');
    const weighted = bases.filter(b => b.dropWeight !== 0);
    check(`census '${theme}': every themed base sits at dropWeight 0`,
      weighted.length === 0, weighted.map(b => b.id).join(', '));
    const cats = new Set(bases.map(b => b.category));
    check(`census '${theme}': >= 2 distinct categories`, cats.size >= 2,
      [...cats].join(', '));
    const bare = bases.filter(b => !b.implicits?.length);
    check(`census '${theme}': every themed base carries a signature implicit`,
      bare.length === 0, bare.map(b => b.id).join(', '));
    // fam() folds FamOpts.baseTags into AffixDef.tags — judge by the field
    // the affix roller actually gates on, never the authoring sugar.
    const fams = families.filter(f => f.tags?.includes(tag));
    check(`census '${theme}': >= 1 affix family gated on '${tag}'`,
      fams.length >= 1, fams.map(f => f.id).join(', ') || 'none');
  }
}

// ================================================ RIG C — POOL PURITY
{
  let lane = 0;
  for (const theme of [...themes].sort()) {
    const tag = `mi_${theme}`;
    for (const ilvl of [10, 40]) {
      const rng = mulberry32(deriveSeed(0x3a11ed, ++lane));
      const picked = new Set<string>();
      let nulls = 0, foreign = 0;
      for (let i = 0; i < 200; i++) {
        const id = pickThemedBase(theme, ilvl, rng);
        if (id === null) { nulls++; continue; }
        picked.add(id);
        if (!ITEM_BASES[id]?.tags.includes(tag)) foreign++;
      }
      check(`purity '${theme}' @ilvl ${ilvl}: 200 picks, none null, all tagged '${tag}'`,
        nulls === 0 && foreign === 0,
        `nulls=${nulls} foreign=${foreign} saw {${[...picked].sort().join(', ')}}`);
    }
  }
  const stranger = pickThemedBase('no_such_theme_registered', 20, mulberry32(7));
  check('purity: an unregistered theme yields null', stranger === null, String(stranger));
}

// ================================================ RIG D — THE LIVE MINT
{
  const DRAWS = 400;
  let lane = 0;
  for (const theme of [...themes].sort()) {
    const tag = `mi_${theme}`;
    const rng = mulberry32(deriveSeed(0xd201, ++lane));
    let themed = 0, leaked = 0;
    for (let i = 0; i < DRAWS; i++) {
      for (const res of resolveLootTable('world_gear', { ilvl: 20, miTheme: theme, rng })) {
        if (res.kind !== 'item') continue;
        const tags = ITEM_BASES[res.item.baseId]?.tags ?? [];
        const mi = tags.filter(t => t.startsWith('mi_'));
        if (mi.includes(tag)) themed++;
        else if (mi.length > 0) leaked++;
      }
    }
    check(`live mint '${theme}': ${DRAWS} world_gear draws mint from the theme pool, never another's`,
      themed > 0 && leaked === 0, `themed=${themed} leaked=${leaked}`);
  }

  // The control: with no miTheme, dropWeight 0 keeps every mi_ base out of
  // the world pool — the whole reason the pools are exclusive.
  const rng = mulberry32(deriveSeed(0xd201, 0x7fff));
  let strays = 0;
  for (let i = 0; i < DRAWS; i++) {
    for (const res of resolveLootTable('world_gear', { ilvl: 20, rng })) {
      if (res.kind !== 'item') continue;
      const tags = ITEM_BASES[res.item.baseId]?.tags ?? [];
      if (tags.some(t => t.startsWith('mi_'))) strays++;
    }
  }
  check(`dropWeight-0 law: ${DRAWS} un-themed world_gear draws mint zero mi_ bases`,
    strays === 0, `strays=${strays}`);
}

// ============================================ RIG E — THE SIGNATURE LANE
// (2026-08-07, the MI-levers pass): each debut theme's proc carries the
// source monster's OWN kit verb as a 'cast' payload, granted ONLY by a
// suffix family gated on that theme's bases — the farm law, proc form.
{
  const LANE = [
    { theme: 'gnoll', proc: 'mi_gnoll_impale', fam: 'mi_gnoll_impalement', skill: 'pinning_spear' },
    { theme: 'goblin', proc: 'mi_goblin_fan', fam: 'mi_goblin_knifefan', skill: 'fan_of_blades' },
    { theme: 'bandit', proc: 'mi_bandit_caltrops', fam: 'mi_bandit_toll', skill: 'caltrops' },
  ];
  for (const row of LANE) {
    const proc = PROCS[row.proc];
    check(`signature '${row.theme}': the proc carries the kit verb as a cast payload`,
      !!proc && proc.effect.type === 'cast' && proc.effect.cast.skillId === row.skill
      && !!SKILLS[row.skill] && proc.oncePerCast === true && (proc.icd ?? 0) > 0,
      proc ? `${proc.effect.type} → ${proc.effect.type === 'cast' ? proc.effect.cast.skillId : '?'}` : 'missing');
    const famDef = ITEM_AFFIXES[row.fam];
    check(`signature '${row.theme}': a theme-gated suffix grants the chance stat`,
      !!famDef && famDef.kind === 'suffix'
      && famDef.tags?.length === 1 && famDef.tags[0] === `mi_${row.theme}`
      && famDef.lines.length === 1 && famDef.lines[0].stat === procStat(row.proc),
      famDef ? `${famDef.kind} tags=${famDef.tags?.join(',')}` : 'missing');
    const elsewhere = Object.values(ITEM_AFFIXES).filter(f =>
      f.id !== row.fam && f.lines.some(l => l.stat === procStat(row.proc)));
    check(`signature '${row.theme}': the chance stat rolls NOWHERE outside the theme`,
      elsewhere.length === 0, elsewhere.map(f => f.id).join(', '));
  }
  const ring = rollItem({
    ilvl: 20, rarity: 'magic', baseId: 'ring_mi_gnoll', withFamily: 'mi_gnoll_impalement',
  });
  const mods = ring ? compileItemMods(ring) : [];
  check("signature roll: withFamily mints a live chance line on the Impaler's Fang",
    mods.some(m => m.stat === procStat('mi_gnoll_impale') && m.value > 0),
    mods.filter(m => m.stat.startsWith('proc_')).map(m => `${m.stat}=${m.value.toFixed(3)}`).join(','));
}

// =========================================== RIG F — THE LIVE TRANSPLANT
// The whole lane end to end on the real engine: a sheet-granted chance
// (the affix's stat, pinned to 1 — the roll caps at 0.95, so each verb
// retries across icd-spaced strikes) fires the monster's REAL skill from
// the wearer's hit. Spear = ONE bolt; fan = its authored 3-5 knives;
// caltrops = a true caltrops cast at the mark (the cast tap sees it).
{
  const w = makeSimWorld('warrior', 0x1a7e);
  const p = w.player;
  const DT = 1 / 60;
  const step = (sec: number): void => {
    for (let t = 0; t < sec; t += DT) {
      for (const a of w.actors) updateAI(a, w, DT);
      w.update(DT);
    }
  };
  // Pin BOTH sides of the hit roll (the probe_throng lesson): the lane
  // must test the PROC, never the accuracy dice.
  p.sheet.setSource('probeacc', [mod('accuracy', 'increased', 50)]);
  const claw = makeSkillInstance(SKILLS.claw, 1);
  const strike = (): void => {
    const prey = w.createMonster('zombie', 8, 'enemy');
    prey.sheet.setBase('evasion', 0);
    prey.pos = vec(p.pos.x + 40, p.pos.y);
    w.actors.push(prey);
    w.executeSkill(p, claw, vec(prey.pos.x, prey.pos.y));
  };
  /** Strike up to `tries` times (icd waited out between), until the
   *  payload observer reports ≥1 — the 0.95 chance cap made honest. */
  const fireUntil = (statId: string, icd: number, tries: number, count: () => number): number => {
    p.sheet.setSource('probeproc', [mod(statId, 'flat', 1)]);
    let seen = 0;
    for (let i = 0; i < tries && seen <= 0; i++) {
      const before = count();
      strike();
      seen = count() - before;
      if (seen <= 0) step(icd + 0.15);
    }
    return seen;
  };
  const spear = fireUntil(procStat('mi_gnoll_impale'), 2.5, 3, () => w.projectiles.length);
  check("live: Impaler's Steel hurls exactly ONE pinning spear from the wearer",
    spear === 1, `${spear} projectiles`);
  const fan = fireUntil(procStat('mi_goblin_fan'), 3, 3, () => w.projectiles.length);
  check("live: Scrapper's Fan flings its authored 3-5 knives",
    fan >= 3 && fan <= 5, `${fan} projectiles`);
  let calCasts = 0;
  setSimTap({ onCast: (_c, i2) => { if (i2.def.id === 'caltrops') calCasts++; } });
  const cal = fireUntil(procStat('mi_bandit_caltrops'), 4, 3, () => calCasts);
  setSimTap(null);
  check("live: Snaresetter's Toll strews a real caltrops cast at the mark",
    cal === 1, `${cal} casts`);
}

// ====================================== RIG G — THE UNTAMED BROOD (wiring)
// The abyssal theme's throng rework at the registry grain (the live claim/
// hunt lane runs on the real engine in probe_throng.ts): the worn def, the
// base implicit, the INTEGER rank ladder, and the pure rank folds.
{
  const def = WORN_THRONGS['abyssal_brood'];
  check('brood: the worn throng is registered and its body resolves',
    !!def && !!MONSTERS[def.monsterId], def ? def.monsterId : 'missing');
  const cuffs = ITEM_BASES['gloves_mi_abyssal'];
  check('brood: the Riftbound Cuffs seed rank 1 at the base (the theme IS the brood)',
    cuffs?.implicits?.some(l => l.stat === wornThrongStat('abyssal_brood')) === true);
  const famDef = ITEM_AFFIXES['mi_abyssal_teeming'];
  check('brood: the Teeming suffix is an INTEGER ladder on the theme tag (whole ranks only)',
    !!famDef && famDef.kind === 'suffix' && famDef.tags?.length === 1
    && famDef.tags[0] === 'mi_abyssal'
    && famDef.tiers.every(t2 => t2.ranges[0][0] === t2.ranges[0][1]
      && Number.isInteger(t2.ranges[0][0]))
    && famDef.tiers[0].magicOnly === true,
    famDef ? famDef.tiers.map(t2 => `[${t2.ranges[0][0]}]`).join('') : 'missing');
  if (def) {
    const ranks = [1, 2, 3, 4];
    const periods = ranks.map(r => wornThrongPeriod(def, r));
    const counts = ranks.map(r => wornThrongCount(def, r));
    const caps = ranks.map(r => wornThrongCap(def, r));
    const ttls = ranks.map(r => wornThrongTtl(def, r));
    check('brood folds: frequency quickens with rank, never past the floor',
      periods.every((v, i) => i === 0 || v <= periods[i - 1])
      && periods.every(v => v >= def.everyFloorSec), periods.map(v => v.toFixed(1)).join(' '));
    check('brood folds: count + cap climb in WHOLE bodies (the quanta law)',
      counts.every((v, i) => Number.isInteger(v) && v >= 1 && (i === 0 || v >= counts[i - 1]))
      && caps.every((v, i) => Number.isInteger(v) && v >= 1 && (i === 0 || v >= caps[i - 1])),
      `counts ${counts.join(' ')} caps ${caps.join(' ')}`);
    check('brood folds: the husk linger grows with rank (the density axis)',
      ttls.every((v, i) => i === 0 || v >= ttls[i - 1]), ttls.map(v => v.toFixed(0)).join(' '));
    check('brood folds: an absurd rank floors the clock and still counts whole bodies',
      wornThrongPeriod(def, 99) === def.everyFloorSec
      && Number.isInteger(wornThrongCount(def, 99)));
  }
}

console.log(failed === 0 ? '\nprobe_infrequents: ALL GREEN' : `\nprobe_infrequents: ${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
