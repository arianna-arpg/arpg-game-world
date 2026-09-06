// SPEECH GRAMMAR PROBE — generative folk talk as data (engine/speechGrammar.ts
// + data/speechGrammar.ts), pinned headlessly against the same pure functions
// World.residentPrompt composes through, then through the live inn itself.
//
// The failure classes this rig pins:
//   A. THE REGISTRY CENSUS — the corpus lints clean (unique ids, positive
//      weights, every '{slot}' a registered resolver), every debut slot is
//      spoken somewhere, every role a spoken body wears is STOCKED (dozens,
//      never a silent pool), and every haunt piece the inn's bodies keep has
//      a phrase (the '{doing}' tell never reads "by the tavern table").
//   B. THE EMPTY WORLD — against a context that knows nothing, a slotless
//      template resolves to itself and a slotted one SKIPS: never a throw,
//      never a half-filled brace; an unknown slot skips; a resolver that
//      throws skips.
//   C. THE DEAL — decks for one company-day are pairwise DISJOINT (a template
//      lands in one deck, an authored line is claimed once), every fitting
//      template is dealt exactly once, every entry fits its speaker, the
//      deal is a pure function of (company, seed) and turns with the seed;
//      THE FIRST WORD leads each deck, the shared row's line yielding to the
//      next body.
//   D. THE TELLING — composeSpeech walks from the position to the first
//      resolvable entry (own lines always; gated templates skip under the
//      wrong phase / sky and the position advances past them), replays
//      byte-identical per (seed, position), fills '{other}' only from
//      NAMED, PRESENT company members other than the speaker (an absent body
//      is never named), and the slot phrase laws hold: the article, the news
//      clause, the lowercased front without its "the", the renown-gated
//      '{hero}' that resolves to the renderer's literal '{name}' token, the
//      def-named body that never says '{name}'.
//   E. THE LIVE INN — World.residentPrompt: the patron's first telling of the
//      day is his authored directions (probe_speech J14's law kept), every
//      fresh approach ROTATES to a new line, no two bodies of the inn's
//      company say one line in a day, a name from the pools that was not
//      seated is never spoken, '{doing}' reads the piece the AI actually
//      faces, the news / kill / arrival logs feed the context through their
//      windows, and a same-seed world replays the same words. The WARD is a
//      company of its own: the family's first word is its line.
//   F. THE OFF-STREAM LAW — neither grammar file names Math.random.
//
//   npx tsx balance/probe_speechgrammar.ts

import { readFileSync } from 'node:fs';
import {
  SPEECH_GRAMMAR_CFG, composeSpeech, dealSpeechDecks, emptySpeechContext, hauntPhrase, hauntPhraseKinds,
  registerSpeechSlot, resolveTemplate, speechSlotNames, speechTemplates, templateFits, templateSlots,
  validateSpeechGrammar, withArticle, newsClause,
  type SpeechContext, type SpeechDeckEntry, type SpeechSpeaker, type SpeechSpeakerRow, type SpeechTemplate,
} from '../src/engine/speechGrammar';
import { SPEECH_TEMPLATES } from '../src/data/speechGrammar';
import { Rng } from '../src/core/rng';
import { bootSimEngine, classById } from '../src/sim/arena';
import { World } from '../src/engine/world';
import { SPEECH_CFG } from '../src/engine/speech';
import { resetActorIdCounter } from '../src/engine/actor';
import { updateAI } from '../src/engine/ai';
import { buildManifest } from '../src/packages/manifest';
import { makeAccount, type Account } from '../src/meta/account';
import { CLASSES } from '../src/data/classes';
import { START_ZONE } from '../src/data/zones';
import { MONSTERS } from '../src/data/monsters';
import { folkPool, folkPoolIds } from '../src/data/innfolk';
import { TOWN_RESIDENTS, noteSoulsSheltered } from '../src/data/boroughs';
import { townStationFeatures } from '../src/data/townBuild';
import { DAY_LENGTH } from '../src/world/daynight';

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`); }
}

const DEBUT_SLOTS = ['name', 'other', 'doing', 'phase', 'weather', 'lastEvent', 'from', 'heroClass', 'town', 'zone', 'monster', 'hero'];
const DEBUT_ROLES = ['any', 'patron', 'lodger', 'merchant', 'warden', 'pilgrim', 'resident', 'mercenary', 'camper', 'traveler', 'visitor'];

// ------------------------------------------------------ A. THE REGISTRY CENSUS
{
  const problems = validateSpeechGrammar();
  check('A1 the corpus lints clean (unique ids, positive weights, every slot registered)', problems.length === 0, problems.slice(0, 3).join(' | '));
  const all = speechTemplates();
  check('A2 the corpus is registered whole (every data row stands in the registry)', SPEECH_TEMPLATES.every(t => all.includes(t)) && all.length >= SPEECH_TEMPLATES.length, `${all.length} registered, ${SPEECH_TEMPLATES.length} authored`);
  const spoken = new Set<string>();
  for (const t of all) for (const s of templateSlots(t.text)) spoken.add(s);
  const names = speechSlotNames();
  check('A3 every debut slot is registered AND spoken by at least one template',
    DEBUT_SLOTS.every(s => names.includes(s) && spoken.has(s)), DEBUT_SLOTS.filter(s => !names.includes(s) || !spoken.has(s)).join(','));
  const usedRoles = new Set<string>();
  for (const t of all) for (const r of t.roles) usedRoles.add(r);
  check('A4 every role the corpus names is a debut role (the typo net)', [...usedRoles].every(r => DEBUT_ROLES.includes(r)), [...usedRoles].filter(r => !DEBUT_ROLES.includes(r)).join(','));
  // The roles spoken bodies wear: the inn's rows + the plan seats + the ward.
  const worn = new Set<string>();
  for (const id of folkPoolIds()) for (const r of folkPool(id)?.rows ?? []) for (const x of r.roles ?? []) worn.add(x);
  for (const d of Object.values(MONSTERS)) for (const x of d.speechRoles ?? []) worn.add(x);
  const stock = (role: string): number => all.filter(t => t.roles.includes(role)).length;
  check('A5 every role a spoken body wears is STOCKED with at least eight templates (dozens across the pool)',
    worn.size >= 6 && [...worn].every(r => stock(r) >= 8), [...worn].map(r => `${r}:${stock(r)}`).join(' '));
  check('A6 the floor every body stands on (the any pool) is the deepest', stock(SPEECH_GRAMMAR_CFG.anyRole) >= 30, `${stock('any')}`);
  check('A7 every folk row wears roles (no guest talks from the any pool alone)',
    folkPoolIds().every(id => (folkPool(id)?.rows ?? []).every(r => (r.roles ?? []).length > 0)));
  // Every haunt kind the inn's bodies keep has a phrase — the tell reads true.
  const kinds = new Set<string>();
  for (const id of folkPoolIds()) for (const r of folkPool(id)?.rows ?? []) for (const k of r.haunt.kinds) kinds.add(k);
  for (const d of ['townsfolk_patron', 'townsfolk_lodger']) for (const k of MONSTERS[d]?.brain?.behavior?.haunt?.kinds ?? []) kinds.add(k);
  const phrased = hauntPhraseKinds();
  check('A8 every haunt piece the inn\'s bodies keep has a registered {doing} phrase', kinds.size >= 8 && [...kinds].every(k => phrased.includes(k)), [...kinds].filter(k => !phrased.includes(k)).join(','));
  check('A9 an unphrased piece still reads (the fallback names the kind in plain words)', hauntPhrase('wine_rack') === 'by the wine rack');
}

// ------------------------------------------------------- B. THE EMPTY WORLD
const mkSpeaker = (key: string, company: string, name: string | null, roles: string[], own: string[] = []): SpeechSpeaker =>
  ({ key, company, name, roles, own, present: true });
{
  const empty = emptySpeechContext();
  const nobody = mkSpeaker('x:seat0', 'x', null, ['patron']);
  // (The hour is never unknown — a template that needs only '{phase}'
  //  resolves in the emptiest world; everything else skips.)
  let threw = 0, slotless = 0, skipped = 0, halfFilled = 0, hourOnly = 0, wrong = 0;
  for (const t of speechTemplates()) {
    let out: string | null = null;
    try { out = resolveTemplate(t.text, nobody, [nobody], empty, new Rng(1)); } catch { threw++; continue; }
    const slots = templateSlots(t.text);
    if (!slots.length) { if (out === t.text) slotless++; else wrong++; }
    else if (out === null) { if (slots.every(s => s === 'phase')) wrong++; else skipped++; }
    else if (/\{[A-Za-z_]+\}/.test(out)) halfFilled++;
    else if (slots.every(s => s === 'phase')) hourOnly++;
    else wrong++;
  }
  check('B1 against a world that knows nothing every slotted template SKIPS (the hour alone excepted) and every slotless one stands — nothing throws, nothing half-fills',
    threw === 0 && halfFilled === 0 && wrong === 0 && slotless > 0 && skipped > 0 && slotless + skipped + hourOnly === speechTemplates().length,
    `threw ${threw}, half ${halfFilled}, wrong ${wrong}, slotless ${slotless}, skipped ${skipped}, hour-only ${hourOnly}`);
  check('B2 an unregistered slot skips', resolveTemplate('the {nope} is loose', nobody, [nobody], empty, new Rng(1)) === null);
  registerSpeechSlot('probe_boom', () => { throw new Error('boom'); });
  check('B3 a resolver that throws skips (one bad slot never silences the room)', resolveTemplate('{probe_boom}!', nobody, [nobody], empty, new Rng(1)) === null);
  // The deck over the whole corpus, walked from every position: every answer
  // is a slotless template, and the walk never dies while one exists.
  const deck: SpeechDeckEntry[] = speechTemplates().map(tpl => ({ kind: 'tpl', tpl }));
  let bad = 0, answered = 0;
  for (let pos = 0; pos < deck.length; pos++) {
    const r = composeSpeech(nobody, [nobody], deck, pos, empty, 7);
    if (!r) { bad++; continue; }
    answered++;
    if (templateSlots(r.text).length) bad++;
  }
  check('B4 composeSpeech over the whole corpus answers a slotless line from every position in the empty world', bad === 0 && answered === deck.length, `${bad} bad of ${answered}`);
}

// ------------------------------------------------------------- C. THE DEAL
const DROVER = ['Drove forty head down from the fells. Lost two to the dark.', 'The road past the crossroads is quieter than it was.'];
const mkCompany = (): SpeechSpeaker[] => [
  mkSpeaker('inn#0:folk0', 'inn#0', 'Corran Vale', ['patron', 'traveler'], DROVER),
  mkSpeaker('inn#0:folk1', 'inn#0', 'Old Hesk', ['patron', 'traveler'], DROVER),
  mkSpeaker('inn#0:folk3', 'inn#0', 'Idris Maw', ['lodger', 'visitor'], ['Took the corner room for the light.']),
  mkSpeaker('inn#0:seat1:townsfolk_patron', 'inn#0', null, ['patron'], ['Rooms upstairs, if you want a bed. Mind the stair.']),
  mkSpeaker('inn#0:seat2:townsfolk_lodger', 'inn#0', null, ['lodger'], ['Took the corner room. Quietest bed between here and the coast.']),
];
{
  const company = mkCompany();
  const decks = dealSpeechDecks(company, 0x5eed);
  const entryKey = (e: SpeechDeckEntry): string => (e.kind === 'own' ? `own:${e.text}` : `tpl:${e.tpl.id}`);
  const seen = new Map<string, string>();
  let dup = 0, misfit = 0, total = 0;
  for (const s of company) {
    for (const e of decks.get(s.key) ?? []) {
      const k = entryKey(e);
      if (seen.has(k)) dup++; else seen.set(k, s.key);
      if (e.kind === 'tpl') { total++; if (!templateFits(e.tpl, s)) misfit++; }
    }
  }
  check('C1 decks are pairwise DISJOINT — no template and no authored line lands in two decks', dup === 0, `${dup} shared`);
  const fitting = speechTemplates().filter(t => company.some(s => templateFits(t, s))).length;
  check('C2 every template someone here may say is dealt exactly once (the union is exhausted, nothing invented)', total === fitting, `${total} dealt of ${fitting}`);
  check('C3 every dealt entry fits its speaker\'s roles (a lodger never holds a patron\'s line)', misfit === 0, `${misfit}`);
  const again = dealSpeechDecks(mkCompany(), 0x5eed);
  const flat = (d: Map<string, SpeechDeckEntry[]>): string => [...d.entries()].map(([k, v]) => `${k}=${v.map(entryKey).join(',')}`).join(';');
  check('C4 the deal is a pure function of (company, seed) — twice the same, byte for byte', flat(decks) === flat(again));
  check('C5 …and turns with the seed (another day, another deal)', flat(decks) !== flat(dealSpeechDecks(mkCompany(), 0x5eee)));
  const d0 = decks.get('inn#0:folk0') ?? [], d1 = decks.get('inn#0:folk1') ?? [];
  check('C6 THE FIRST WORD leads every deck — the drover\'s own line first, the patron\'s directions first',
    d0[0]?.kind === 'own' && d0[0].text === DROVER[0]
    && (decks.get('inn#0:seat1:townsfolk_patron') ?? [])[0]?.kind === 'own');
  check('C7 a row\'s line shared by two bodies is claimed ONCE — the second drover opens with the row\'s next line',
    d1[0]?.kind === 'own' && d1[0].text === DROVER[1] && !d1.some(e => e.kind === 'own' && e.text === DROVER[0]));
  check('C8 every speaker holds a deck (no silent seat)', company.every(s => (decks.get(s.key) ?? []).length >= 4), company.map(s => `${s.key}:${decks.get(s.key)?.length}`).join(' '));
  const order1 = dealSpeechDecks([...company].reverse(), 0x5eed);
  check('C9 the deal walks speakers in KEY order — spawn order never changes a deck', flat(order1) === flat(decks));
}

// ---------------------------------------------------------- D. THE TELLING
const fullCtx = (over: Partial<SpeechContext> = {}): SpeechContext => ({
  day: 3, phase: 'night', town: 'Lastlight', zone: 'Lastlight', weather: 'Rain', lastEvent: 'Warband storms Ashford!',
  from: 'Sallow Fen', heroClass: 'Warrior', heroKnown: true, monster: 'Undead Knight', doingOf: () => 'at the keg', ...over,
});
{
  const company = mkCompany();
  const decks = dealSpeechDecks(company, 0x5eed);
  const A = company[0];
  const deckA = decks.get(A.key) ?? [];
  const ctx = fullCtx();
  const r0 = composeSpeech(A, company, deckA, 0, ctx, 11);
  check('D1 position 0 tells the FIRST WORD verbatim', r0?.text === DROVER[0] && r0.pos === 1);
  const r1 = composeSpeech(A, company, deckA, 1, ctx, 11);
  check('D2 the next telling is a grammar line with every slot filled (only the renderer\'s {name} address may remain)',
    !!r1 && r1.text !== DROVER[0] && !/\{(?!name\})[A-Za-z_]+\}/.test(r1.text), r1?.text);
  const r1b = composeSpeech(A, company, deckA, 1, fullCtx(), 11);
  check('D3 a telling replays byte-identical per (seed, position)', r1?.text === r1b?.text);
  // THE COMPANY LAW, SPOKEN: walk the whole deck; every name spoken is a
  // present, named member other than the speaker.
  const others = company.filter(s => s.key !== A.key && s.name).map(s => s.name!);
  const walk = (co: SpeechSpeaker[]): string[] => {
    const out: string[] = [];
    for (let pos = 0; pos < deckA.length; pos++) { const r = composeSpeech(A, co, deckA, pos, ctx, 11); if (r) out.push(r.text); }
    return out;
  };
  const lines = walk(company);
  const named = lines.filter(l => others.some(n => l.includes(n)));
  check('D4 {other} lines name only company members (never the speaker as another)', named.length > 0 && named.every(l => !l.includes(A.name!) || l.includes('call me')), `${named.length} named`);
  const absent = mkCompany();
  absent[1].present = false; // Old Hesk stepped out
  const lines2 = walk(absent);
  check('D5 an ABSENT body is never named — the pick reads presence at the telling', lines2.length > 0 && lines2.every(l => !l.includes('Old Hesk')), lines2.filter(l => l.includes('Old Hesk'))[0]);
  const alone = [A, company[3], company[4]]; // only def-named company left
  const lines3 = walk(alone);
  check('D6 with no named company at all every {other} template skips and the rest still speak', lines3.length > 0 && lines3.every(l => !others.some(n => l.includes(n))));
  // Gates: a front-gated template under a clear sky is skipped and the
  // position advances PAST it to the entry actually told.
  const front = speechTemplates().find(t => t.sky === 'front' && !templateSlots(t.text).length)
    ?? speechTemplates().find(t => t.sky === 'front')!;
  const clear = speechTemplates().find(t => !t.sky && !t.phase && !templateSlots(t.text).length)!;
  const deckG: SpeechDeckEntry[] = [{ kind: 'tpl', tpl: front }, { kind: 'tpl', tpl: clear }];
  const g = composeSpeech(A, company, deckG, 0, fullCtx({ weather: null }), 3);
  check('D7 a sky-gated template skips under a clear sky and the position lands past it', g?.text === clear.text && g.pos === 2, `${g?.pos}`);
  const nightOnly = speechTemplates().find(t => t.phase?.length === 1 && t.phase[0] === 'night' && !templateSlots(t.text).length)!;
  const deckP: SpeechDeckEntry[] = [{ kind: 'tpl', tpl: nightOnly }];
  check('D8 a phase-gated template skips off its hour and tells on it',
    composeSpeech(A, company, deckP, 0, fullCtx({ phase: 'day' }), 3) === null && composeSpeech(A, company, deckP, 0, fullCtx({ phase: 'night' }), 3)?.text === nightOnly.text);
  const deckW: SpeechDeckEntry[] = [{ kind: 'tpl', tpl: clear }, { kind: 'own', text: 'x' }];
  check('D9 a position past the end WRAPS (a spent deck starts over, never falls silent)', composeSpeech(A, company, deckW, 5, ctx, 3)?.text === 'x');
  // The slot phrase laws.
  const one = (text: string, over: Partial<SpeechContext> = {}, sp: SpeechSpeaker = A): string | null => resolveTemplate(text, sp, company, fullCtx(over), new Rng(5));
  check('D10 {monster} wears its article ("an undead knight", "a ghoul")', one('{monster}') === 'an undead knight' && one('{monster}', { monster: 'Ghoul' }) === 'a ghoul' && withArticle('') === '');
  check('D11 {lastEvent} is the news as a clause (its shout trimmed)', one('"{lastEvent}"') === '"Warband storms Ashford"' && newsClause('Sea found…') === 'Sea found');
  check('D12 {weather} is the front lowercased without its "the"', one('{weather}') === 'rain' && one('{weather}', { weather: 'The Pall' }) === 'pall');
  check('D13 {hero} is the renderer\'s literal {name} token when the hero is known, and a skip before renown', one('{hero}.') === '{name}.' && one('{hero}.', { heroKnown: false }) === null);
  check('D14 {name} is the SPEAKER; a def-named body (the patron) never says it', one('I am {name}') === 'I am Corran Vale' && one('I am {name}', {}, company[3]) === null);
  check('D15 {phase} / {heroClass} / {town} / {zone} / {from} read their words', one('{phase}|{heroClass}|{town}|{zone}|{from}') === 'night|warrior|Lastlight|Lastlight|Sallow Fen');
  check('D16 {doing} reads the chosen other\'s piece, and skips when it keeps no piece',
    one('{other} is {doing}')?.endsWith(' is at the keg') === true && one('{other} is {doing}', { doingOf: () => null }) === null);
  check('D17 {hero} beside {name} never crosses — the speaker fills first, the address stays a token', one('{hero}, I am {name}.') === '{name}, I am Corran Vale.');
}

// ---------------------------------------------------------- E. THE LIVE INN
bootSimEngine();
const SEED = 0x5eec;
function mkWorld(account: Account, seed = SEED): World {
  resetActorIdCounter();
  for (const c of CLASSES) account.unlockedClasses.add(c.id);
  const manifest = buildManifest(account, seed);
  for (const p of manifest.packages) p.enabled = false;
  const w = new World(account, Object.freeze(manifest));
  w.createPlayer(classById('warrior'));
  w.loadZone(START_ZONE);
  return w;
}
type Body = World['actors'][number];
const beside = (w: World, a: Body): void => { w.player.pos.x = a.pos.x + 24; w.player.pos.y = a.pos.y + 24; w.player.tier = a.tier ?? 0; };
const away = (w: World): void => { w.player.pos.x = -4000; w.player.pos.y = -4000; };
/** A generous gap: the longest window + the longest cooldown + the stale gap. */
const GAP = SPEECH_CFG.window.holdSec + SPEECH_CFG.window.holdPerChar * 240 + SPEECH_CFG.window.cooldownSec + 2;
const rowsOf = (w: World): SpeechSpeakerRow[] => [...((w as unknown as { speakerRows: Map<number, SpeechSpeakerRow> }).speakerRows.values())];
const ctxOf = (w: World, rows: SpeechSpeakerRow[] = rowsOf(w)): SpeechContext =>
  (w as unknown as { speechContext(r: SpeechSpeakerRow[]): SpeechContext }).speechContext(rows);
{
  const w = mkWorld(makeAccount());
  const rows = rowsOf(w);
  const patron = w.actors.find(a => a.defId === 'townsfolk_patron')!;
  const lodger = w.actors.find(a => a.defId === 'townsfolk_lodger')!;
  const folk = w.actors.filter(a => a.defId?.startsWith('folk_'));
  check('E1 the inn seats its spoken company (the patron, the lodger, rostered folk) as speaker rows',
    !!patron && !!lodger && folk.length >= 2 && [patron, lodger, ...folk].every(a => rows.some(r => r.actorId === a.id)), `${folk.length} folk`);
  const innRow = rows.find(r => r.actorId === patron.id)!;
  check('E2 the plan\'s seats and the rolled folk share ONE company (the placed inn), the patron unnamed, the guests named',
    !!innRow && innRow.speaker.name === null && folk.every(f => rows.find(r => r.actorId === f.id)?.speaker.company === innRow.speaker.company)
    && folk.every(f => rows.find(r => r.actorId === f.id)?.speaker.name === f.name));
  // The first telling of the day: the authored directions (probe_speech J14).
  beside(w, patron);
  const first = w.residentPrompt(patron);
  check('E3 THE FIRST WORD — the patron\'s first telling is his authored directions', !!first && first.includes('stair'), first ?? '-');
  beside(w, lodger);
  check('E4 …and the lodger\'s is his corner room', (w.residentPrompt(lodger) ?? '').includes('room'));
  // THE ROTATION + THE COMPANY LAW across one day: every fresh approach a new
  // line, no line under two bodies. Rounds share a clock (each body keeps
  // its own memory); five rounds fit inside day 0.
  const speakers = [patron, lodger, ...folk];
  const said = new Map<number, string[]>(speakers.map(a => [a.id, []]));
  const ROUNDS = 5;
  w.time = 0.5;
  for (let round = 0; round < ROUNDS; round++) {
    for (const a of speakers) {
      away(w); w.residentPrompt(a); // a read away, so the next is an edge
      beside(w, a);
      const line = w.residentPrompt(a);
      if (line) said.get(a.id)!.push(line);
    }
    w.time += GAP;
  }
  check('E5 five rounds fit in one day (the rig\'s clock law)', w.time < DAY_LENGTH, `${w.time.toFixed(1)}`);
  const patronLines = said.get(patron.id)!;
  check('E6 THE ROTATION — the patron says five different things on five fresh approaches', patronLines.length === ROUNDS && new Set(patronLines).size === ROUNDS, patronLines.map(l => l.slice(0, 24)).join(' / '));
  check('E7 every speaker tells on every approach (a stocked deck never falls silent)', speakers.every(a => said.get(a.id)!.length === ROUNDS));
  const owner = new Map<string, number>();
  let shared = 0;
  for (const [id, lines] of said) for (const l of lines) { const o = owner.get(l); if (o !== undefined && o !== id) shared++; owner.set(l, id); }
  check('E8 THE COMPANY LAW — no line is said by two bodies of the inn in one day', shared === 0, `${shared} shared`);
  // Names never seated are never spoken; names spoken are present bodies.
  const seated = new Set(folk.map(f => f.name));
  const unseated: string[] = [];
  for (const id of folkPoolIds()) for (const r of folkPool(id)?.rows ?? []) for (const n of r.names) if (!seated.has(n)) unseated.push(n);
  const everyLine = [...said.values()].flat();
  const ghost = everyLine.find(l => unseated.some(n => l.includes(n)));
  check('E9 {other} names only bodies actually seated — a pool name that was not dealt today is never spoken', !ghost && unseated.length > 0, ghost);
  const spokeOf = everyLine.filter(l => [...seated].some(n => l.includes(n as string)));
  check('E10 …and the company does talk about each other (at least one guest is named by another body)', spokeOf.length >= 1, `${spokeOf.length}`);
  // '{doing}' reads the piece the AI faces: drive the haunts, find an arrived
  // body, and the context names the doodad at its seat's centre.
  for (let i = 0; i < 900; i++) { for (const a of w.actors) updateAI(a, w, 1 / 30); w.time += 1 / 30; }
  const arrived = folk.find(f => f.hauntSeat && f.hauntSeat.until !== undefined && w.doodadsNear(f.hauntSeat.fx, f.hauntSeat.fy, 4).some(d => Math.abs(d.pos.x - f.hauntSeat!.fx) < 1 && Math.abs(d.pos.y - f.hauntSeat!.fy) < 1));
  if (arrived) {
    const seat = arrived.hauntSeat!;
    const piece = w.doodadsNear(seat.fx, seat.fy, 4).find(d => Math.abs(d.pos.x - seat.fx) < 1 && Math.abs(d.pos.y - seat.fy) < 1)!;
    const row = rows.find(r => r.actorId === arrived.id)!;
    check('E11 {doing} reads the piece the body actually faces (drawn == told)', ctxOf(w, rows).doingOf(row.speaker) === hauntPhrase(piece.kind), `${piece.kind} → ${ctxOf(w, rows).doingOf(row.speaker)}`);
  } else {
    check('E11 {doing} reads the piece the body actually faces (drawn == told)', false, 'no guest arrived at a piece in 30 s');
  }
  const resting = folk.find(f => !f.hauntSeat || f.hauntSeat.until === undefined);
  if (resting) check('E11b a body between pieces keeps no {doing}', ctxOf(w, rows).doingOf(rows.find(r => r.actorId === resting.id)!.speaker) === null);
  // THE EMPTY WORLD at the inn: a fresh run knows no news, no kills, no arrival.
  const c0 = ctxOf(w);
  check('E12 a fresh run\'s context knows the town, the class and the hour — and nothing that has not happened', c0.town === 'Lastlight' && c0.zone === 'Lastlight' && c0.heroClass === 'Warrior' && c0.lastEvent === null && c0.monster === null && c0.from === null && !c0.heroKnown);
}
// The logs feed the context through their windows; a same-seed world replays.
{
  const w = mkWorld(makeAccount());
  const patron = w.actors.find(a => a.defId === 'townsfolk_patron')!;
  const guest = w.actors.find(a => a.defId?.startsWith('folk_'))!;
  const replay = (world: World, a: Body, n: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < n; i++) { away(world); world.residentPrompt(a); beside(world, a); out.push(world.residentPrompt(a) ?? ''); world.time += GAP; }
    return out;
  };
  const w2 = mkWorld(makeAccount());
  const p1 = replay(w, patron, 4), p2 = replay(w2, w2.actors.find(a => a.defId === 'townsfolk_patron')!, 4);
  const g1 = replay(w, guest, 3), g2 = replay(w2, w2.actors.find(a => a.name === guest.name)!, 3);
  check('E13 a same-seed world replays the same words for the same approaches (patron + a guest)', p1.join('|') === p2.join('|') && g1.join('|') === g2.join('|') && p1.every(Boolean), p1.map(l => l.slice(0, 20)).join(' / '));
  w2.notice('Warband storms Ashford!');
  check('E14 {lastEvent} is the newest notice inside its window', ctxOf(w2).lastEvent === 'Warband storms Ashford!');
  w2.time += SPEECH_GRAMMAR_CFG.newsWindowSec + 1;
  check('E15 …and old news is not repeated', ctxOf(w2).lastEvent === null);
  const g = w2.createMonster('goblin_skirmisher', 1, 'enemy');
  g.pos.x = w2.player.pos.x + 60; g.pos.y = w2.player.pos.y;
  w2.actors.push(g);
  w2.kill(g, true, w2.player);
  check('E16 {monster} remembers the hero\'s credited kill by the kind\'s name', ctxOf(w2).monster === MONSTERS.goblin_skirmisher.name, `${ctxOf(w2).monster}`);
  // A rival's kill (an enemy killer) earns the folk nothing to gossip about;
  // an environmental death (no killer — the pit's credit law) does.
  const rival = w2.createMonster('goblin_brute', 1, 'enemy');
  rival.pos.x = w2.player.pos.x + 90; rival.pos.y = w2.player.pos.y;
  w2.actors.push(rival);
  const g3 = w2.createMonster('goblin_shaman', 1, 'enemy');
  g3.pos.x = w2.player.pos.x + 60; g3.pos.y = w2.player.pos.y;
  w2.actors.push(g3);
  w2.kill(g3, true, rival);
  check('E16b a rival faction\'s kill is not the hero\'s deed (the credit law)', ctxOf(w2).monster === MONSTERS.goblin_skirmisher.name, `${ctxOf(w2).monster}`);
  const g4 = w2.createMonster('goblin_shaman', 1, 'enemy');
  g4.pos.x = w2.player.pos.x + 60; g4.pos.y = w2.player.pos.y;
  w2.actors.push(g4);
  w2.kill(g4, true, undefined);
  check('E16c an environmental death is credited (the pit\'s kill law)', ctxOf(w2).monster === MONSTERS.goblin_shaman.name, `${ctxOf(w2).monster}`);
  w2.time += SPEECH_GRAMMAR_CFG.slainWindowSec + 1;
  check('E17 …and a kill past the window is forgotten', ctxOf(w2).monster === null);
  const elsewhere = Object.values(w2.zoneMap).find(z => z.id !== START_ZONE)!;
  w2.entryFrom = elsewhere.id;
  check('E18 {from} is the zone the hero arrived from, by name', ctxOf(w2).from === elsewhere.name);
  w2.entryFrom = null;
  check('E19 …and null when the run began here', ctxOf(w2).from === null);
}
// THE WARD is a company of its own.
{
  const acct = makeAccount();
  for (const f of townStationFeatures()) acct.features.add(f);
  noteSoulsSheltered(acct, 999);
  const w = mkWorld(acct, 0x70a1);
  const rows = rowsOf(w);
  const families = w.actors.filter(a => TOWN_RESIDENTS.some(r => r.name === a.name));
  check('W1 every family stands as a named speaker of the ward company', families.length === TOWN_RESIDENTS.length
    && families.every(f => rows.find(r => r.actorId === f.id)?.speaker.company === 'ward' && rows.find(r => r.actorId === f.id)?.speaker.name === f.name));
  const first = families.find(a => a.name === TOWN_RESIDENTS[0].name)!;
  beside(w, first);
  check('W2 a family\'s first word is its line (probe_towngrowth I kept)', w.residentPrompt(first) === TOWN_RESIDENTS[0].line);
  w.time += GAP; away(w); w.residentPrompt(first); beside(w, first);
  const second = w.residentPrompt(first);
  check('W3 …and its second approach rotates to a resident line', !!second && second !== TOWN_RESIDENTS[0].line, second ?? '-');
  const innNames = w.actors.filter(a => a.defId?.startsWith('folk_')).map(a => a.name);
  const wardLines: string[] = [];
  for (const f of families) { away(w); w.residentPrompt(f); beside(w, f); const l = w.residentPrompt(f); if (l) wardLines.push(l); }
  check('W4 the ward never names the inn\'s guests (companies do not cross)', wardLines.length === families.length && wardLines.every(l => !innNames.some(n => n && l.includes(n))));
}

// ---------------------------------------------------- F. THE OFF-STREAM LAW
{
  const files = ['src/engine/speechGrammar.ts', 'src/data/speechGrammar.ts'];
  const dirty = files.filter(f => /Math\s*\.\s*random/.test(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')));
  check('F1 neither grammar file so much as names the global die (every roll rides a seeded local stream)', dirty.length === 0, dirty.join(','));
  const t: SpeechTemplate | undefined = speechTemplates().find(x => x.id === 'any_01');
  check('F2 the corpus keeps its ids stable (any_01 stands — the deal\'s keys are the ids)', !!t);
}

console.log(`\n${fail === 0 ? 'ALL PASS' : 'FAILURES'} — ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
