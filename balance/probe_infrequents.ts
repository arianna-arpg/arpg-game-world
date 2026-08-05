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
import { pickThemedBase } from '../src/engine/itemgen';
import { resolveLootTable } from '../src/engine/loot';
import { bootSimEngine } from '../src/sim/arena';
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

console.log(failed === 0 ? '\nprobe_infrequents: ALL GREEN' : `\nprobe_infrequents: ${failed} FAILURE(S)`);
process.exit(failed === 0 ? 0 : 1);
