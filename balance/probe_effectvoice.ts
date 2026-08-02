// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE EFFECT VOICE (render/vis/effectVoice.ts): the open
// kind→painter registry for flash moments (the doodadVisuals precedent), and
// the 2026-08-02 ruling it ships: mortars burst ('blast'), spore pods puff
// ('sporeburst'), treed critters flick leaves ('scramble') — while 'bolt'
// stays the lightning voice and the generic ring stays the honored fallback.
// THE SECOND WAVE (same day, the census Arianna ratified): falling skies
// streak ('comet' — blizzard's icy comet, starfall's shard), stone chips
// ('shatter' — the petrified tree), small bodies take the water ('plunge' —
// the reed frog's dive); the five brittle fume pops join 'sporeburst', the
// munitions kegs and the player's hellbore join 'blast', hellsear's
// hate_eruption stays ADJUDICATED-JAGGED (a sky-tear reads okay as a tear),
// and FlashW ships fx/bolt/meteor so remote seats hear the voices too.
// Pins (the anatomy probe's every-look-part-resolves precedent):
//   - RIG A — RESOLUTION: every authored fx kind across the data seams
//     (StormDelivery.fx on skills, WeatherStrike.fx on weather fronts and
//     shrine bolts, MonsterDef.refuge.fx, and the second wave's
//     BrittleSpec.fume.fx swept through the doodad-rule registry — built-in
//     rows AND runtime registrants like the formations kegs) resolves to a
//     registered painter — a typo'd or unregistered kind fails HERE, not
//     silently in a player's face (the fallback law keeps the live game
//     safe; this pin keeps the data honest). The sweep must also FIND the
//     commissioned keys — a refactor that moves the rows out of reach reads
//     as a miss, not a pass.
//   - RIG B — THE RESERVED WORDS: 'bolt' and 'meteor' are NOT registry
//     kinds — those voices belong to the flag machinery (Flash.bolt /
//     Flash.meteor: storm lightning, demon meteors). Together with RIG A
//     this makes the reservation structural: an authored fx: 'bolt' cannot
//     resolve, so no row can wear the sky's jag by name.
//   - RIG C — THE COMMISSIONED REROUTES: hellshot_volley speaks 'blast'
//     (with its sky posture untouched — the costume changed, never the
//     laws), and the four treed/brush critters (squirrel, gutter_rat,
//     canopy_screecher, ruin_tailthief) speak 'scramble'. The spore pod's
//     'sporeburst' key lives in a generation-time literal (levelgen
//     stampSporePod) out of static reach — this rig pins the KIND it names
//     exists, and the fallback law bounds the residue at worst-generic.
//     THE SECOND-WAVE REROUTES each pin fx + the underlying posture
//     unmoved (a costume never edits the laws), and the hellsear
//     adjudication pins the ABSENCE of a key — the census closed by
//     decision, not by drift.
//   - RIG D — PAINTER SMOKE: every registered painter draws its whole life
//     (t = 1 → 0.05) against a no-op ctx without throwing — a voice that
//     dies mid-flash would take the rAF loop's frame with it. Sweeps
//     effectVoiceKinds(), so the second wave enrolls itself.
// Run: npx tsx balance/probe_effectvoice.ts
// ---------------------------------------------------------------------------

import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { WEATHER_DEFS } from '../src/world/weather';
import { ALTARS } from '../src/data/shrines';
import { doodadRuleKinds, doodadRuleOf, type DoodadKind } from '../src/engine/levelgen';
// Side-effect import ON PURPOSE (the settled-import trap): the munitions
// kegs' rules live in data/formations.ts as RUNTIME registrants — without
// this import the registry sweep would silently never see them.
import '../src/data/formations';
import { effectVoiceKinds, effectVoiceOf } from '../src/render/vis/effectVoice';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};

// --- RIG A — RESOLUTION: every authored fx kind resolves --------------------
{
  const authored: { where: string; fx: string }[] = [];
  for (const s of Object.values(SKILLS)) {
    // Voice keys are STRINGS — ConstructDelivery.fx is a different fabric
    // (ConstructFxSpec, the innate pulse/burst object) sharing only the
    // field name; the discriminated union keeps the types apart and this
    // sweep keeps the pin on the voice grammar alone.
    const d = s.delivery as { type: string; fx?: unknown };
    if (typeof d.fx === 'string') authored.push({ where: `skill ${s.id} (${d.type})`, fx: d.fx });
  }
  for (const [kind, def] of Object.entries(WEATHER_DEFS)) {
    if (def.strike?.fx) authored.push({ where: `weather ${kind}.strike`, fx: def.strike.fx });
  }
  for (const al of ALTARS) {
    if (al.bolts?.fx) authored.push({ where: `altar ${al.id}.bolts`, fx: al.bolts.fx });
  }
  for (const m of Object.values(MONSTERS)) {
    if (m.refuge?.fx) authored.push({ where: `monster ${m.id}.refuge`, fx: m.refuge.fx });
  }
  // THE SECOND WAVE's seam: BrittleSpec.fume.fx, swept through the doodad-
  // rule registry — reaches the levelgen built-ins (pods, the petrified
  // tree) AND runtime registrants (the formations kegs, via the side-effect
  // import above). This closes the old "generation-time literal" gap for
  // FUME voices: a fume key is static data, and a typo fails here.
  for (const kind of doodadRuleKinds()) {
    const fume = doodadRuleOf(kind as DoodadKind).brittle?.fume;
    if (fume?.fx) authored.push({ where: `doodad ${kind}.fume`, fx: fume.fx });
  }
  const orphans = authored.filter(a => !effectVoiceOf(a.fx));
  check('A1 every authored fx kind resolves to a registered painter',
    orphans.length === 0,
    orphans.map(o => `${o.where} → '${o.fx}'`).join('; ') || `${authored.length} keys swept`);
  // The sweep must see the commissioned keys — wave 1's 1 mortar + 4
  // critters, plus the second wave: hellbore (1), the comet strikes (2),
  // the frog (1), and the eight fume rows (5 sporeburst + 2 blast kegs +
  // 1 shatter) = 17. A sweep that finds fewer has lost a whole seam, and
  // would pass A1 vacuously.
  check('A2 the sweep reaches the commissioned keys (≥17 authored)',
    authored.length >= 17, `found ${authored.length}`);
}

// --- RIG B — THE RESERVED WORDS ---------------------------------------------
{
  check("B1 'bolt' is not a registry kind (the lightning flags own it)",
    effectVoiceOf('bolt') === undefined);
  check("B2 'meteor' is not a registry kind (the demon-storm flag owns it)",
    effectVoiceOf('meteor') === undefined);
}

// --- RIG C — THE COMMISSIONED REROUTES --------------------------------------
{
  const hv = SKILLS['hellshot_volley'];
  const d = hv?.delivery as { type: string; sky?: true; fx?: string } | undefined;
  check("C1 hellshot_volley speaks 'blast'", d?.fx === 'blast', `fx=${d?.fx}`);
  check('C2 …with its sky posture untouched (the laws kept, the costume changed)',
    d?.type === 'storm' && d?.sky === true);
  for (const id of ['squirrel', 'gutter_rat', 'canopy_screecher', 'ruin_tailthief']) {
    check(`C3 ${id} exits in 'scramble'`, MONSTERS[id]?.refuge?.fx === 'scramble',
      `fx=${MONSTERS[id]?.refuge?.fx}`);
  }
  for (const kind of ['blast', 'sporeburst', 'scramble', 'comet', 'shatter', 'plunge']) {
    check(`C4 voice '${kind}' is registered`, !!effectVoiceOf(kind));
  }

  // --- THE SECOND WAVE (each: the fx key + the posture unmoved) -------------
  // hellbore_lob joins its family: the player mortar bursts like the
  // trebuchet's shells — and stays keeper-scoped ground ordnance (type
  // 'storm' with a lob and NO sky posture: the assist law never became
  // weather by wearing a costume).
  {
    const d = SKILLS['hellbore_lob']?.delivery as
      { type: string; sky?: true; fx?: string; lob?: unknown } | undefined;
    check("C5 hellbore_lob speaks 'blast' (family unity with hellshot_volley)",
      d?.fx === 'blast', `fx=${d?.fx}`);
    check('C5b …still a lobbed keeper-scoped storm, never sky-borne',
      d?.type === 'storm' && d?.sky === undefined && !!d?.lob);
  }
  // The falling skies: both comet strikes speak 'comet' with their skills
  // unmoved — the costume changed, the strike machinery did not.
  for (const [front, skillId] of [['blizzard', 'icy_comet'], ['starfall', 'starfall_shard']] as const) {
    const s = WEATHER_DEFS[front]?.strike;
    check(`C6 ${front} strike speaks 'comet'`, s?.fx === 'comet', `fx=${s?.fx}`);
    check(`C6b …still landing ${skillId}`, s?.skillId === skillId, `skillId=${s?.skillId}`);
  }
  // THE ADJUDICATION (2026-08-02): hellsear's hate_eruption keeps the
  // derived jag ON PURPOSE — a sky-tear reads okay jagged. This pins the
  // ABSENCE of a key: the census row is closed by decision, and a future
  // hand keying it must come back through this pin with a new ruling.
  check("C7 hellsear stays unkeyed (adjudicated: the tear reads okay jagged)",
    WEATHER_DEFS['hellsear']?.strike?.fx === undefined,
    `fx=${WEATHER_DEFS['hellsear']?.strike?.fx}`);
  // The brittle fume pops: five gentle gas releases speak 'sporeburst'
  // (the painter rides each row's own color — marsh green, fungal purple,
  // pale tan, acid green, sour olive), fumes themselves unmoved.
  for (const kind of ['gas_pod', 'burst_sac', 'puffcap_cluster', 'venom_bloom', 'gas_polyp']) {
    const fume = doodadRuleOf(kind as DoodadKind).brittle?.fume;
    check(`C8 ${kind} pops in 'sporeburst'`, fume?.fx === 'sporeburst', `fx=${fume?.fx}`);
    check(`C8b …fume posture unmoved (radius ${fume?.radius})`,
      (fume?.radius ?? 0) > 0 && !!fume?.color);
  }
  check("C8c venom_bloom still seeps its own venom", // the one pod with a bespoke payload
    doodadRuleOf('venom_bloom' as DoodadKind).brittle?.fume?.skillId === 'venom_seep');
  // The munitions: both keg rows detonate in 'blast', still minting the
  // infernal rift — ordnance was always a mortar wearing scenery.
  for (const kind of ['powder_keg', 'munition_cache']) {
    const fume = doodadRuleOf(kind as DoodadKind).brittle?.fume;
    check(`C9 ${kind} goes up in 'blast'`, fume?.fx === 'blast', `fx=${fume?.fx}`);
    check(`C9b …still minting infernal_rift`, fume?.skillId === 'infernal_rift');
  }
  // The stone tree: 'shatter' (chips, no gas, no hot core), shards unmoved.
  {
    const fume = doodadRuleOf('petrified_tree' as DoodadKind).brittle?.fume;
    check("C10 petrified_tree breaks in 'shatter'", fume?.fx === 'shatter', `fx=${fume?.fx}`);
    check("C10b …still raining stone_shards", fume?.skillId === 'stone_shards');
  }
  // The reed frog: 'plunge' (small, water-toned), the water refuge unmoved.
  check("C11 reed_frog dives in 'plunge'", MONSTERS['reed_frog']?.refuge?.fx === 'plunge',
    `fx=${MONSTERS['reed_frog']?.refuge?.fx}`);
  check("C11b …still a water refuge", MONSTERS['reed_frog']?.refuge?.kind === 'water');
}

// --- RIG D — PAINTER SMOKE (whole-life draw, no throws) ---------------------
{
  // A no-op ctx: every property read yields the sink, every call returns it,
  // every set is swallowed — gradients, paths and style writes all land soft.
  const mkSink = (): CanvasRenderingContext2D => {
    const sink: unknown = new Proxy(function () { /* noop */ }, {
      get: (_t, p) => (p === Symbol.toPrimitive ? () => 0 : sink),
      set: () => true,
      apply: () => sink,
    });
    return sink as CanvasRenderingContext2D;
  };
  const f = { pos: { x: 137, y: 411 }, radius: 60, color: '#ff6a2a', life: 0.2, maxLife: 0.35 };
  let threw = '';
  for (const kind of effectVoiceKinds()) {
    const p = effectVoiceOf(kind)!;
    for (const t of [1, 0.66, 0.33, 0.05]) {
      try { p(mkSink(), f, t); } catch (e) { threw = `'${kind}' at t=${t}: ${e}`; }
    }
  }
  check('D1 every registered painter draws its whole life without throwing',
    threw === '', threw);
}

console.log(failed ? `\nprobe_effectvoice: ${failed} FAILED` : '\nprobe_effectvoice: all pins hold');
process.exit(failed ? 1 : 0);
