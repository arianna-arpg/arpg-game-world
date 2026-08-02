// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE EFFECT VOICE (render/vis/effectVoice.ts): the open
// kind→painter registry for flash moments (the doodadVisuals precedent), and
// the 2026-08-02 ruling it ships: mortars burst ('blast'), spore pods puff
// ('sporeburst'), treed critters flick leaves ('scramble') — while 'bolt'
// stays the lightning voice and the generic ring stays the honored fallback.
// Pins (the anatomy probe's every-look-part-resolves precedent):
//   - RIG A — RESOLUTION: every authored fx kind across the data seams
//     (StormDelivery.fx on skills, WeatherStrike.fx on weather fronts and
//     shrine bolts, MonsterDef.refuge.fx) resolves to a registered painter —
//     a typo'd or unregistered kind fails HERE, not silently in a player's
//     face (the fallback law keeps the live game safe; this pin keeps the
//     data honest). The sweep must also FIND the commissioned keys — a
//     refactor that moves the rows out of reach reads as a miss, not a pass.
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
//   - RIG D — PAINTER SMOKE: every registered painter draws its whole life
//     (t = 1 → 0.05) against a no-op ctx without throwing — a voice that
//     dies mid-flash would take the rAF loop's frame with it.
// Run: npx tsx balance/probe_effectvoice.ts
// ---------------------------------------------------------------------------

import { SKILLS } from '../src/data/skills';
import { MONSTERS } from '../src/data/monsters';
import { WEATHER_DEFS } from '../src/world/weather';
import { ALTARS } from '../src/data/shrines';
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
  const orphans = authored.filter(a => !effectVoiceOf(a.fx));
  check('A1 every authored fx kind resolves to a registered painter',
    orphans.length === 0,
    orphans.map(o => `${o.where} → '${o.fx}'`).join('; ') || `${authored.length} keys swept`);
  // The sweep must see the commissioned keys — 1 mortar + 4 critters. A
  // sweep that finds fewer has lost a seam, and would pass A1 vacuously.
  check('A2 the sweep reaches the commissioned keys (≥5 authored)',
    authored.length >= 5, `found ${authored.length}`);
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
  for (const kind of ['blast', 'sporeburst', 'scramble']) {
    check(`C4 debut voice '${kind}' is registered`, !!effectVoiceOf(kind));
  }
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
