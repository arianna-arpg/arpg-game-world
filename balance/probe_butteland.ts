// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE BUTTELAND WARDROBE (planned pass #14b): the savannah's
// own kin and dress, end to end on the real engine. The Highlands wore the
// mountain's hand-me-downs (taiga elk, meadow hare, the mountain litter);
// this rig pins the native wardrobe — the registry (five kin, guests gone,
// authored identity kept), the kit (five kinds on standing painters, the
// crop-veil law worn wild), the tileset (needles dress + packs + the gold
// tops), the mint census (kit delivered, deterministic, the grazing pan's
// court standing its numeric contract), the rim watch (post + rim duels),
// and one LIVE mint through the real path.
// Run: npx tsx balance/probe_butteland.ts
// ---------------------------------------------------------------------------

import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { Rng } from '../src/core/rng';
import { vec } from '../src/core/math';
import { TILESETS } from '../src/data/tilesets';
import {
  generateLayout, hasComposition, hasDoodadRule, doodadRuleOf, layoutParam,
  type GeneratedLayout,
} from '../src/engine/levelgen';
import type { StampSpec, ZoneDef } from '../src/data/zones';
import { MONSTERS, WILDLIFE } from '../src/data/monsters';
import { LOOKS } from '../src/data/looks';
import { SKILLS } from '../src/data/skills';
import { DOODAD_VISUALS } from '../src/data/doodadVisuals';
import { PAINTERS, CANOPY_PAINTERS } from '../src/render/vis/painters';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

bootSimEngine();
seedGlobalRandom(0xb0771);

const KIN = ['veld_oryx', 'sun_hyrax', 'dust_pard', 'mesa_baboon', 'pan_jackal'] as const;
const KIT = ['veld_grass', 'spear_grass', 'camelthorn', 'clay_pan', 'termite_spire'] as const;

// --- A) THE WARDROBE REGISTRY ----------------------------------------------
{
  for (const id of KIN) {
    const def = MONSTERS[id];
    check(`registry: '${id}' stands`, !!def);
    if (!def) continue;
    check(`registry: '${id}' wears its own look`, !!def.look && !!LOOKS[def.look]);
    for (const s of def.skills) {
      check(`registry: '${id}' skill '${s}' exists + carries an ai hint`,
        !!SKILLS[s] && (!!SKILLS[s].ai || SKILLS[s].tags.includes('movement')));
    }
  }
  const rows = WILDLIFE.butteland ?? [];
  const ids = rows.map(r => r.id);
  check('wildlife: every butteland row resolves to a def', ids.every(id => !!MONSTERS[id]), ids.join(','));
  check('wildlife: the guests are gone (no taiga elk, no meadow hare, no bloodwing nest)',
    !ids.includes('taiga_elk') && !ids.includes('meadow_hare') && !ids.includes('bloodwing_nest'));
  check('wildlife: the authored identity stays (ibex ledge-graze + the top-only flicker)',
    ids.includes('salt_ibex') && ids.includes('gilded_scamp'));
  const scamp = rows.find(r => r.id === 'gilded_scamp');
  check('wildlife: the scamp keeps the tops (tier 1) and its arrival line',
    scamp?.tier === 1 && !!scamp?.announce);
  const pard = rows.find(r => r.id === 'dust_pard');
  check('wildlife: the pard seats BY the tall grass (near spear_grass — the ambush blind)',
    pard?.near === 'spear_grass');
  check('wildlife: the herd + the baskers are native rows',
    ids.includes('veld_oryx') && ids.includes('sun_hyrax'));
}

// --- B) THE KIT — five kinds, standing painters, the crop law ---------------
{
  for (const kind of KIT) {
    check(`kit: '${kind}' rule registered`, hasDoodadRule(kind));
    const vis = DOODAD_VISUALS[kind];
    check(`kit: '${kind}' dressed`, !!vis);
    if (!vis) continue;
    check(`kit: '${kind}' painter '${vis.painter}' is a standing painter (zero new painters)`,
      vis.painter in PAINTERS);
    if (vis.canopy) {
      check(`kit: '${kind}' canopy '${vis.canopy.painter}' resolves`,
        vis.canopy.painter in CANOPY_PAINTERS);
    }
  }
  // THE CROP LAW worn wild: walk-through, shoot-through, sight-eating — and
  // its own veil group, so a wild stand never fuses with a farm's wheat.
  const sg = doodadRuleOf('spear_grass');
  check('kit: spear_grass is the crop-veil contract (move+shot free, sight cut)',
    sg.blocksMove === false && sg.blocksShot === false && sg.blocksSight === true);
  check("kit: spear_grass veils in its OWN group ('veld' — never the farm's 'crop')",
    sg.veil?.group === 'veld' && sg.veil?.standStatus === 'canopied');
  check('kit: the grasses burn (fuel kindling — the wildfire law reaches the veld)',
    doodadRuleOf('veld_grass').fuel === 'kindling' && sg.fuel === 'kindling');
  const ts = doodadRuleOf('termite_spire');
  check('kit: the termite spire stands solid (walk around, shoot past)',
    ts.blocksMove === true && ts.blocksShot === false && ts.overlap === 'solid');
  check('kit: the camelthorn is a walk-under crown (trunk body, canopy veil)',
    doodadRuleOf('camelthorn').bodyScale !== undefined && !!doodadRuleOf('camelthorn').veil);
  check('kit: the clay pan is bare ground (the dry waterhole floor)',
    doodadRuleOf('clay_pan').overlap === 'ground');
  check('kit: the composition is registered', hasComposition('grazing_pan'));
}

// --- C) THE TILESET — needles wears the country -----------------------------
{
  const nd = TILESETS.needles;
  check('tileset: needles stands on butteland', nd?.biome === 'butteland');
  // THE BRITTLE-KIT LAW, lived: a tileset with variants rolls a FACE per
  // mint and base-layout-only rows never mint — the wardrobe must ride
  // COMMON (what the biome always IS), never the base layout alone.
  const commonKinds = (nd?.common ?? []).map(r => r.kind);
  for (const kind of KIT) {
    check(`tileset: '${kind}' rides COMMON (worn by every rolled face)`, commonKinds.includes(kind));
  }
  const allKinds = [...commonKinds, ...(nd?.layout ?? []).map(r => r.kind),
    ...(nd?.variants ?? []).flatMap(v => v.layout.map(r => r.kind))];
  check('tileset: the mountain sward is out (no bare grass/brush rows on any face)',
    !allKinds.includes('grass') && !allKinds.includes('brush'));
  check('tileset: the cave mouths + tor stones came back (dead base rows re-homed)',
    commonKinds.includes('cave') && commonKinds.includes('standing_stone'));
  const vnames = (nd?.variants ?? []).map(v => v.name);
  check('tileset: BOTH faces roll (the press stands beside the gaps)',
    vnames.includes('the standing tables') && vnames.includes('the wind gaps'),
    vnames.join(' / '));
  for (const v of nd?.variants ?? []) {
    const eff = [...commonKinds, ...v.layout.map(r => r.kind)];
    check(`tileset: face '${v.name}' wears the whole kit`,
      (KIT as readonly string[]).every(k => eff.includes(k)));
  }
  const table = nd?.packs?.table ?? [];
  const pids = table.map(r => r.id);
  check('tileset: the rim troop + the jackal packs field (the wolf guest replaced)',
    pids.includes('mesa_baboon') && pids.includes('pan_jackal') && !pids.includes('plains_wolf'));
  check('tileset: the moot-holders send their marksmen (gnoll_longshot joins deep)',
    pids.includes('gnoll_longshot'));
  check('tileset: every packs row resolves to a def', pids.every(id => !!MONSTERS[id]), pids.join(','));
  check('tileset: the grazing pan rolls', (nd?.compositions ?? []).some(r => r.composition === 'grazing_pan'));
  const kit = (nd?.layoutParams as Record<string, unknown> | undefined)?.tierKit as { kind: string }[] | undefined;
  check('tileset: the tops go gold (tierKit carries veld_grass)',
    Array.isArray(kit) && kit.some(r => r.kind === 'veld_grass'));
}

// --- D) THE MINT CENSUS — the kit delivered, deterministic, the court held --
const arena = { w: 3400, h: 2600 };
const entry = vec(150, arena.h / 2);
const exits = [vec(arena.w - 150, arena.h / 2), vec(arena.w / 2, 150)];
function needlesDef(seed: number, forcePan: boolean): ZoneDef {
  // The worldgen fold: common rows ride along whichever face rolls — the
  // probe composes them the way the mint does (base face here).
  const nd = TILESETS.needles;
  return {
    id: `qa_butteland_${seed}`, name: 'QA Butteland', level: 8,
    size: { w: arena.w, h: arena.h },
    theme: nd.theme as ZoneDef['theme'],
    layout: [...(nd.common ?? []), ...nd.layout] as StampSpec[],
    layoutType: 'needles',
    layoutParams: nd.layoutParams,
    compositions: forcePan ? [{ composition: 'grazing_pan', chance: 1 }] : nd.compositions,
    objective: { kind: 'clear' }, exits: [], map: { x: 0, y: 0 },
    seed,
  };
}
function gen(seed: number, forcePan: boolean): { def: ZoneDef; out: GeneratedLayout } {
  const def = needlesDef(seed, forcePan);
  const out = generateLayout(def, arena, new Rng(seed), entry, exits);
  return { def, out };
}
{
  const seeds = [11213, 40427, 75011];
  let kitZones = 0, courts = 0, topSward = 0;
  for (const seed of seeds) {
    const { out } = gen(seed, true);
    const byKind = new Map<string, { x: number; y: number }[]>();
    for (const d of out.doodads) {
      const list = byKind.get(d.kind) ?? [];
      list.push({ x: d.pos.x, y: d.pos.y });
      byKind.set(d.kind, list);
    }
    if (KIT.some(k => (byKind.get(k)?.length ?? 0) > 0)) kitZones++;
    // THE COURT SIGNATURE: a pan with worked spires AND a grass bank within
    // the cluster's ring — scattered pieces don't huddle like this.
    const pans = byKind.get('clay_pan') ?? [];
    const spires = byKind.get('termite_spire') ?? [];
    const grasses = [...(byKind.get('spear_grass') ?? []), ...(byKind.get('veld_grass') ?? [])];
    const near = (a: { x: number; y: number }, list: { x: number; y: number }[], r: number): number =>
      list.filter(b => Math.hypot(a.x - b.x, a.y - b.y) <= r).length;
    if (pans.some(p => near(p, spires, 170) >= 2 && near(p, grasses, 160) >= 1)) courts++;
    // The gold tops: veld_grass laid by the tier kit (any sward standing on
    // a butte_top cell — read through the layout's own grid).
    const gw = out.walk as unknown as { kindAt?: (x: number, y: number) => string | undefined } | undefined;
    if (gw?.kindAt) {
      const sward = byKind.get('veld_grass') ?? [];
      if (sward.some(p => gw.kindAt!(p.x, p.y) === 'butte_top')) topSward++;
    }
  }
  check('mint: every seed fields the kit', kitZones === seeds.length, `${kitZones}/${seeds.length}`);
  check('mint: the forced grazing pan stands its court (pan + spires + grass huddle)',
    courts >= 2, `${courts}/${seeds.length} seeds`);
  check('mint: the tops carry the gold sward (tier kit delivered)',
    topSward >= 2, `${topSward}/${seeds.length} seeds`);
  // Determinism: the same seed twice is the same country, byte for byte.
  const a = gen(seeds[0], true).out.doodads.map(d => `${d.kind}:${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)},${d.radius.toFixed(2)}`).join('|');
  const b = gen(seeds[0], true).out.doodads.map(d => `${d.kind}:${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)},${d.radius.toFixed(2)}`).join('|');
  check('mint: determinism (same seed → identical dress)', a === b);
}

// --- E) THE RIM WATCH — post + rim duels ------------------------------------
{
  const { def } = gen(20261, false);
  check('rim: the minted country stacks (tiers seated, open exposure)',
    def.tiers?.kind === 'over' && def.tiers?.exposure === 'open', def.tiers?.label ?? 'no tiers');
  check('rim: rim duels referee the needle country', def.tiers?.rimDuels === true);
  check('rim: the pack split seats troops aloft',
    (layoutParam(def, 'tierPackSplit', 0) as number) > 0);
  const bab = MONSTERS.mesa_baboon;
  check('rim: the baboon KEEPS ITS STATION (the sentry fabric — post)', bab?.post === true);
  check('rim: the troop throws the standing rock (hurl_debris in kit, affordable)',
    !!bab && bab.skills.includes('hurl_debris')
    && (SKILLS.hurl_debris?.manaCost ?? 99) <= (bab.base.mana ?? 0));
  check('rim: the troop is a troop (packSize bakes the family)',
    Array.isArray(bab?.packSize) && (bab!.packSize![0] ?? 0) >= 2);
}

// --- F) THE HERD + THE CAT — the food chain's wiring ------------------------
{
  const oryx = MONSTERS.veld_oryx;
  const flock = oryx?.brain?.behavior?.flock;
  check('herd: the oryx wheels as one body (the flocking fabric on the GROUND)',
    !!flock && flock.kin === 'def' && !oryx?.flier,
    flock ? `weave ${flock.weave}` : 'no flock');
  check('herd: hooves, not wings (the ground herd keeps a low weave)',
    (flock?.weave ?? 9) <= 2);
  const pard = MONSTERS.dust_pard;
  const hungerRule = pard?.brain?.rules?.find(r => !!r.when?.drive);
  check('cat: the pard hunts the chain (hunger drive → prey critters)',
    !!pard?.brain?.drives?.hunger && !!hungerRule?.use?.target?.prey?.includes('critter'));
  check('cat: the stalk reads before it costs you (the shared predator lean)',
    Array.isArray(pard?.tells) && (pard!.tells as unknown[]).length > 0);
  check('cat: the leap is a standing verb (crushing_leap affordable from its own pool)',
    !!pard && pard.skills.includes('crushing_leap')
    && (SKILLS.crushing_leap?.manaCost ?? 99) <= (pard.base.mana ?? 0));
  const jack = MONSTERS.pan_jackal;
  check('jackal: the pack runs the herds (pack brain + hunger + prey)',
    jack?.brain?.type === 'pack' && !!jack?.brain?.drives?.hunger);
}

// --- G) THE LIVE COUNTRY — one real mint through the real path --------------
{
  const world = makeSimWorld('warrior', 47251);
  const id = world.devMintTileset('needles', 0, 9, { seed: 6151 });
  const there = !!id && world.devTravelTo(id!);
  check('live: a needles zone mints + loads through the real path', there, id ?? 'no mint');
  if (there) {
    const kitCount = world.doodads.filter(d => (KIT as readonly string[]).includes(d.kind)).length;
    check('live: the country wears the wardrobe (kit doodads standing)', kitCount >= 4, `${kitCount} pieces`);
    check('live: the tall grass stands (the pard\'s near-row has ground to fire on)',
      world.doodads.some(d => d.kind === 'spear_grass'));
    const zd = world.zoneMap[world.zone.id];
    check('live: the stack stands (tiers on the loaded def)', zd?.tiers?.kind === 'over');
    check('live: the mint wears a rolled FACE (the two-variant law)',
      zd?.variantName === 'the standing tables' || zd?.variantName === 'the wind gaps',
      zd?.variantName ?? 'none');
    const natives = (world.actors as Actor[]).filter(a =>
      (KIN as readonly string[]).includes(a.defId ?? '') || a.defId === 'salt_ibex' || a.defId === 'gilded_scamp');
    check('live: the natives walk it (wardrobe kin among the spawned)',
      natives.length >= 1, natives.map(a => a.defId).slice(0, 8).join(','));
  }
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
