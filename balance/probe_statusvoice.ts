// ---------------------------------------------------------------------------
// ONE-OFF PROBE — THE STATUS VOICE (engine/statusVoice.ts + render/vis/
// statusVoiceLayer.ts; design docs/design/show-dont-tell.md §3e, M-STATUS;
// engine doc docs/engine/statusvoice.md). Pins:
//   A. THE FAMILY RESOLVER — by nature: cold → rime, fire → flare, lightning →
//      spark, physical → flecks, chaos → spiral, hard CC → stars, the mind →
//      spiral, time → ripple, a blessing → wink; a def's own `voice` wins
//      (incl. false); self-drawing states (conceals / flight / ghost) speak none.
//   B. THE FALLBACK LAW — every StatusDef resolves to a REGISTERED voice or
//      false (the effect-voice fallback ring never has to catch a landing).
//   C. THE FRAME DIFF LAW — first sight seeds silently; a fresh id is reported
//      once; an id that left and returns speaks again; duplicates collapse.
//   D. THE RETIREMENT CENSUS (source-lint) — the player-axis captions are gone
//      from world.ts, and the rule-name cries ride the `combat` float kind.
// Run: npx tsx balance/probe_statusvoice.ts
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';
import { bootSimEngine } from '../src/sim/arena';
import { STATUS_DEFS, type StatusDef } from '../src/engine/status';
import { STATUS_VOICE_CFG, statusVoiceDiff, statusVoiceOf } from '../src/engine/statusVoice';
import { effectVoiceOf } from '../src/render/vis/effectVoice';
import '../src/render/vis/statusVoiceLayer'; // registers the nine family voices
import '../src/render/vis/dissolveLayer'; // (the other voices — the registry is shared)

let failed = 0;
const check = (name: string, ok: boolean, detail = ''): void => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failed++;
};
const info = (line: string): void => console.log(`INFO  ${line}`);
bootSimEngine();

const def = (p: Partial<StatusDef>): StatusDef => ({ label: 'qa', color: '#ffffff', duration: 1, ...p });

// ------------------------------------------------- A. the family resolver
{
  check('A1 by element: cold → rime · fire → flare · lightning → spark · physical → flecks · chaos (poison/decay) → spatter',
    statusVoiceOf(def({ dotType: 'cold' })) === 'rime' && statusVoiceOf(def({ element: 'fire' })) === 'flare'
    && statusVoiceOf(def({ dotType: 'lightning' })) === 'spark' && statusVoiceOf(def({ dotType: 'physical' })) === 'flecks'
    && statusVoiceOf(def({ dotType: 'chaos' })) === 'spatter');
  check('A2 by nature: hard CC → stars · the mind (interrupt/scramble/invert/panic) → spiral · time → ripple',
    statusVoiceOf(def({ hardCC: true })) === 'stars' && statusVoiceOf(def({ interruptChance: 0.3 })) === 'spiral'
    && statusVoiceOf(def({ invertMove: true })) === 'spiral' && statusVoiceOf(def({ panic: true })) === 'spiral'
    && statusVoiceOf(def({ timeScale: 0.5 })) === 'ripple');
  check('A3 a blessing (or an uncategorized landing) winks', statusVoiceOf(def({ beneficial: true })) === 'wink' && statusVoiceOf(def({})) === 'wink');
  check("A4 the def's own word wins — a named voice, or false", statusVoiceOf(def({ dotType: 'cold', voice: 'spatter' })) === 'spatter'
    && statusVoiceOf(def({ dotType: 'cold', voice: false })) === false);
  check('A5 self-drawing states speak none (conceals / flight / ghost)', statusVoiceOf(def({ conceals: true })) === false
    && statusVoiceOf(def({ flight: true })) === false && statusVoiceOf(def({ ghostAlpha: 0.4 })) === false && statusVoiceOf(undefined) === false);
  check('A6 precedence: time, then the element (a frozen body is rime, not stars), then hard CC, then the mind',
    statusVoiceOf(def({ timeScale: 0.5, hardCC: true, dotType: 'fire' })) === 'ripple'
    && statusVoiceOf(def({ hardCC: true, dotType: 'cold' })) === 'rime' && statusVoiceOf(def({ hardCC: true, panic: true })) === 'stars');
}

// ------------------------------------------------- B. the fallback law
{
  const bad: string[] = []; const tally: Record<string, number> = {};
  for (const [id, d] of Object.entries(STATUS_DEFS)) {
    const v = statusVoiceOf(d);
    const key = v === false ? '(none)' : v;
    tally[key] = (tally[key] ?? 0) + 1;
    if (v !== false && !effectVoiceOf(v)) bad.push(`${id}:${v}`);
  }
  check('B1 THE FALLBACK LAW: every StatusDef resolves to a registered voice or none', bad.length === 0, bad.join(', '));
  check('B2 the nine family voices stand registered', ['rime', 'flare', 'spark', 'spatter', 'flecks', 'spiral', 'stars', 'ripple', 'wink'].every(v => !!effectVoiceOf(v)));
  info(`B  ${Object.keys(STATUS_DEFS).length} statuses → ${Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(' · ')}`);
}

// ------------------------------------------------- C. the frame diff law
{
  const list = (...ids: string[]): { id: string }[] => ids.map(id => ({ id }));
  check('C1 first sight seeds silently (no memory → nothing fresh)', statusVoiceDiff(undefined, list('chill', 'burn')).length === 0);
  check('C2 a fresh id is reported once; the standing ones are not', JSON.stringify(statusVoiceDiff(new Set(['chill']), list('chill', 'burn'))) === JSON.stringify(['burn']));
  check('C3 an id that left and returned speaks again; duplicates collapse', JSON.stringify(statusVoiceDiff(new Set([]), list('chill', 'chill'))) === JSON.stringify(['chill']));
  check('C4 the dials stand (life, reach, cap)', STATUS_VOICE_CFG.life > 0 && STATUS_VOICE_CFG.radiusScale > 1 && STATUS_VOICE_CFG.maxLive >= 8);
}

// ------------------------------------------------- D. the retirement census (source-lint)
{
  const src = readFileSync('src/engine/world.ts', 'utf8');
  const retired = ["'chilled to the bone!'", "'sunscorched!'", "'befuddled!'", "'maddened!'", "'possessed!'", "'corrupted!'", "'SEEN!'", "'beheld…'",
    "'carried!'", "'torn free!'", "'broke free!'", "'the grip breaks!'", "'UNHORSED'", "'FRENZY!'", "'contagion!'", "'transfused!'",
    "'swallowed by the dark!'", "'over the edge!'", "'renewing'", "'time stops!'", "'time bends!'"];
  const still = retired.filter(l => src.includes(l));
  check("D1 THE RETIREMENT CENSUS: the player-axis status captions are gone from world.ts (the landing's accent + worn face carry them)", still.length === 0, still.join(', '));
  const kinded = ["'addled!'", "'dominated!'", "'snatched!'", "'time slips'", "'DOOM!'", "'TRANSGRESSION!'", "'undying!'", "'hex drawn'", "'hex sheathed'", "'the guise breaks!'", "'primed'", "'marked'", "'cleansed'", "'rung clean'", "'volatile!'"];
  const bare = kinded.filter(l => { const i = src.indexOf(l); if (i < 0) return true; const tail = src.slice(i, src.indexOf(';', i)); return !/'combat'/.test(tail); });
  check("D2 the rule-name cries ride the `combat` float kind (the player's own mute)", bare.length === 0, bare.join(', '));
}

console.log(failed ? `\n${failed} FAILED` : '\nALL PASS');
process.exit(failed ? 1 : 0);
