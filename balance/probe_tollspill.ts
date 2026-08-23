// ---------------------------------------------------------------------------
// ONE-OFF PROBE — M-TOLL + M-SPILL (docs/design/show-dont-tell.md §3c/§3d):
// tolls drawn to the lure reach, spills that tumble, no captions. Pins:
//   A. THE TOLL — a struck resonant stone pushes ONE flash wearing the 'toll'
//      voice (or the row's own: the skep thrums) whose radius IS the lure
//      reach (drawn == tested); no text; ResonanceSpec carries no text (census).
//   B. THE TUNE — a tone change speaks no caption; the wash flash wears 'tune'.
//   C. THE SPILL — a breakable's corpses tumble out of the host: each body
//      stamped laidAt + from (the host seat); the pure tumble pose starts at
//      the host and settles on the body's seat; no caption; corpses.text gone.
//   D. THE CHEST — opening stamps openedAt (the lid's clock), the flash wears
//      sparkle, no caption; a mimic BURSTS OUT of the chest (an emergence).
//   E. THE RETIREMENT CENSUS (source-lint): drops loot! · the purse bursts! ·
//      spoils! · the hoard spills! · the chest opens! · MIMIC! are gone.
// Run: npx tsx balance/probe_tollspill.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine, makeSimWorld } from '../src/sim/arena';
import { seedGlobalRandom } from '../src/sim/rng';
import { doodadRuleKinds, doodadRuleOf, normalizeDoodadBound, registerDoodadRule, type Doodad, type DoodadKind } from '../src/engine/levelgen';
import { RESONANCE_CFG, type Chest } from '../src/engine/world';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import { corpseTumblePose } from '../src/render/vis/worldVoices';
import { VIS_CFG } from '../src/render/vis/visConfig';
import { vec } from '../src/core/math';
import type { Actor } from '../src/engine/actor';

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
bootSimEngine();
seedGlobalRandom(0x70115);
const DT = 1 / 60;
const w = makeSimWorld('warrior', 0x70115);
type Priv = { resonate: (o: Doodad, spec: { radius?: number; voice?: string; color?: string }) => void; openChest: (c: Chest) => void; chests: Chest[] };
const priv = w as unknown as Priv;
const hero = w.player;
const place = (kind: string, x: number, y: number, radius: number): Doodad => {
  const d: Doodad = { pos: vec(x, y), radius, kind: kind as DoodadKind, rot: 0 };
  normalizeDoodadBound(d); w.doodads.push(d); w.markDoodadsChanged(); return d;
};
const settle = (n = 1): void => { for (let i = 0; i < n; i++) w.update(DT); };

// ------------------------------------------------- A. the toll
{
  const stone = place('watcher_stone', hero.pos.x + 200, hero.pos.y, 20);
  const spec = doodadRuleOf('watcher_stone').resonance!;
  const textsBefore = w.texts.length, flashesBefore = w.flashes.length;
  priv.resonate(stone, spec);
  const fl = w.flashes.slice(flashesBefore).find(f => (f as { fx?: string }).fx === 'toll');
  check('A1 a struck stone pushes ONE toll flash whose radius IS the lure reach (drawn == tested), no caption',
    !!fl && fl.radius === (spec.radius ?? RESONANCE_CFG.radius) && fl.maxLife === RESONANCE_CFG.tollLife && w.texts.length === textsBefore,
    fl ? `radius ${fl.radius}` : 'no toll flash');
  const skep = place('beehive', hero.pos.x - 200, hero.pos.y, 20);
  const fb = w.flashes.length;
  priv.resonate(skep, doodadRuleOf('beehive').resonance!);
  check('A2 the skep THRUMS (the row\'s own voice)', w.flashes.slice(fb).some(f => (f as { fx?: string }).fx === 'thrum'));
  const speaking = doodadRuleKinds().filter(k => (doodadRuleOf(k as DoodadKind).resonance as { text?: string } | undefined)?.text !== undefined);
  check('A3 THE TOLL CENSUS: no resonance row carries a text (the rings are the toll)', speaking.length === 0, speaking.join(', '));
  check('A4 the toll / thrum / tune voices stand registered', !!effectVoiceOf('toll') && !!effectVoiceOf('thrum') && !!effectVoiceOf('tune'));
}

// ------------------------------------------------- B. the tune (via the attunement fabric)
{
  // A tunable body takes the blow's tone: attuneCrystal is private — drive it
  // through the real hit path by striking a Resonant Crystal with a fire hit.
  const crystal = (w as unknown as { createMonster: (id: string, lv: number, team: 'enemy') => Actor }).createMonster('resonant_crystal', Math.max(1, w.zone.level), 'enemy');
  crystal.pos = w.clampPos(vec(hero.pos.x + 80, hero.pos.y + 80), crystal.radius);
  w.actors.push(crystal);
  const textsBefore = w.texts.length, flashesBefore = w.flashes.length;
  (w as unknown as { attuneCrystal: (a: Actor, tone: 'fire', s?: Actor | null) => void }).attuneCrystal(crystal, 'fire', hero);
  const tuned = w.flashes.slice(flashesBefore).some(f => (f as { fx?: string }).fx === 'tune');
  check('B1 a tone change speaks no caption; the wash flash wears the tune voice', tuned && w.texts.length === textsBefore && crystal.tone === 'fire');
}

// ------------------------------------------------- C. the spill
registerDoodadRule('qa_spill_cart', { overlap: 'inert', spacing: 0,
  brittle: { on: ['touch'], color: '#8a7a58', corpses: { monster: 'zombie', count: [2, 2], chance: 1 } },
  dissolve: { material: 'wood' } });
{
  const at = vec(hero.pos.x, hero.pos.y);
  const cart = place('qa_spill_cart', at.x, at.y, 18);
  const before = w.corpses.length, textsBefore = w.texts.length;
  settle(1);
  const spilled = w.corpses.slice(before);
  check('C1 the spill mints its bodies at the break, each stamped laidAt (the break clock) + from (the host seat); no caption',
    cart.gone === true && spilled.length === 2 && spilled.every(c => c.laidAt !== undefined && Math.abs(c.laidAt - w.time) < 0.05 && !!c.from && Math.abs(c.from.x - at.x) < 1e-6 && Math.abs(c.from.y - at.y) < 1e-6)
    && w.texts.length === textsBefore, `spilled ${spilled.length}`);
  const c0 = spilled[0];
  const p0 = corpseTumblePose(0, c0.from!, c0.pos, 10), p1 = corpseTumblePose(VIS_CFG.corpseTumble.seconds, c0.from!, c0.pos, 10);
  const pm = corpseTumblePose(VIS_CFG.corpseTumble.seconds * 0.5, c0.from!, c0.pos, 10);
  check('C2 the tumble pose starts at the host seat, arcs UP mid-flight, spins, and SETTLES on the body\'s own seat (pure f(age))',
    Math.abs(p0.x - at.x) < 1e-6 && Math.abs(p0.y - at.y) < 1e-6 && p0.settled === 0 && p0.rot !== 0
    && pm.y < Math.min(at.y, c0.pos.y) && Math.abs(p1.x - c0.pos.x) < 1e-6 && Math.abs(p1.y - c0.pos.y) < 1e-6 && p1.settled === 1 && Math.abs(p1.rot) < 1e-9);
  const spec = doodadRuleOf('plague_cart').brittle?.corpses as { text?: string } | undefined;
  check('C3 THE SPILL CENSUS: the charnel kit\'s spill rows carry no text (the tumble is the sentence)', !!spec && spec.text === undefined
    && (doodadRuleOf('shallow_grave').brittle?.corpses as { text?: string } | undefined)?.text === undefined);
}

// ------------------------------------------------- D. the chest
{
  const chest: Chest = { pos: vec(hero.pos.x + 120, hero.pos.y - 120), kind: 'timed', mimic: false, opened: false, lockTime: 0, maxLock: 1 };
  priv.chests.push(chest);
  const textsBefore = w.texts.length, flashesBefore = w.flashes.length;
  priv.openChest(chest);
  // (The drop NAMES still float — the 'drop' float kind is precision, never a caption.)
  const spoke = w.texts.slice(textsBefore).filter(t => /chest opens|spoils!/.test(t.text));
  check('D1 opening a chest stamps openedAt (the lid\'s clock), flashes sparkle, speaks no caption (the drop names stay)',
    chest.opened && chest.openedAt !== undefined && Math.abs(chest.openedAt - w.time) < 1e-9
    && w.flashes.slice(flashesBefore).some(f => (f as { fx?: string }).fx === 'sparkle') && spoke.length === 0, spoke.map(t => t.text).join(' | '));
}

// ------------------------------------------------- E. the retirement census (source-lint)
{
  const src = readFileSync('src/engine/world.ts', 'utf8') + readFileSync('src/engine/killHandlers.ts', 'utf8');
  const gone = ["'drops loot!'", "'the purse bursts!'", "spoils!`", "'the hoard spills!'", "'the chest opens!'", "'MIMIC!'"];
  const still = gone.filter(l => src.includes(l));
  check('E1 THE RETIREMENT CENSUS: the loot / chest / mimic captions are gone (the drops, the lid, the emergence carry them)', still.length === 0, still.join(', '));
  check('E2 the mimic BURSTS OUT of its chest (the emergence grammar, host lane)', /this\.emergeBody\(m, \{ host: true \}\); \/\/ THE EMERGENCE GRAMMAR: it was never a chest/.test(src));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
