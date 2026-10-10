// ---------------------------------------------------------------------------
// THE VESSEL, the client's half (docs/engine/shard.md "The vessel and the
// corpse"; card 6 as ruled, docs/design/shard-world.md §3.5). The hero is the
// client's: it keeps the save, uploads it at login, takes the shard's
// mirrors home, and runs its own mortal reckoning when the shard reports a
// fall. The shard keeps the ground and remembers where the body lies.
//
//   readTravelingVessel  the hero that travels, its world half dropped (the
//                        couch guest's shape, the `join`'s vessel): the one
//                        the bedside wake NAMES (THE WAKE'S WORD: the run
//                        slot's hero, or its roster card's own slot, so an
//                        Immortal vessel travels too), else the lobby's
//                        run-slot hero, else THE LONE VESSEL (the one standing
//                        roster card while the run slot is empty).
//   ShardVesselLink      bound on the shard transport for the session:
//                        `heroSave` writes the mirror to the hero's own slot
//                        (saveVesselMirror, no world half; THE HOME SLOT: a
//                        roster vessel's card slot, never the shared
//                        Continue); `corpse` is THE
//                        DEATH COVENANT's word (the shard's reckoning minted
//                        into this account, the chronicle row, the death
//                        tally, the contracts released, the run slot wiped,
//                        the death screen staged for the `runEnd` after it);
//                        `corpses` draws this seat's OWN standing bodies on
//                        the render shell and banks its reclaims' deed.
//
// Every row is read through net/vesselWire.ts's sanitizers, and only rows
// about the vessel this client actually sent are honored.
// ---------------------------------------------------------------------------

import type { World } from '../engine/world';
import type { NetTransport, SessionMsg } from '../net/transport';
import type { WsTransport } from '../net/ws';
import { sanitizeBodyRows, sanitizeCorpseNote, sanitizeReckoning, type ShardCorpseNote, type ShardReckoning } from '../net/vesselWire';
import { CLASSES } from '../data/classes';
import { bumpLedger, mergeLedger } from '../packages/ledger';
import {
  applyCredits, LEDGER_ACCOUNT_DEATHS, LEDGER_CORPSES_RECLAIMED, recordRun, RUN_RECORD_SCHEMA, runStanding,
  type Account, type RunRecord,
} from './account';
import {
  CHAR_SLOT, clearCharacter, loadCharacter, readCharacterResume, savedCharacterPatronId, saveVesselMirror,
  type CharacterSave,
} from './character';
import { characterResumeFields, type CharacterFields } from './characterResume';
import { releaseMercsOf } from './mercs';
import { DEFAULT_MODE_ID, modeById, ROSTER_SLOT_BASE, stageOf, type RosterEntry } from './modes';
import { saveAccount, saveAccountDurable } from './persistence';
import { isCurrentCharacterSave } from './saveCompatibility';
import { settleClassUnlocks } from './unlocks';

/** One slot's hero, read the way Continue reads it and NEVER written (never
 *  loadRosterSave's disk-first heal, which rewrites the cache from the disk:
 *  a slot's old disk body would overwrite or wipe the wake's fresh save):
 *  the resume authority first, then the synchronous cache when the authority
 *  holds nothing current, or (asked for `charId`) another hero: the bedside
 *  wake's own write may still be on its way to the disk when its hero travels. */
async function slotHero(slot: number, charId?: string): Promise<CharacterFields | null> {
  const fits = (f: CharacterFields | null): f is CharacterFields =>
    !!f && isCurrentCharacterSave(f) && (charId === undefined || f.charId === charId);
  try {
    const read = await readCharacterResume(slot);
    if (read.status === 'ready') { const f = characterResumeFields(read.resume); if (fits(f)) return f; }
  } catch { /* the cache below */ }
  const cached = loadCharacter(slot);
  return fits(cached) ? cached : null;
}

/** A roster card's hero (THE IMMORTAL TRAVELS): a STANDING card (a FALLEN
 *  vessel is locked out of travel as it is out of Continue and the couch),
 *  still sworn to a roster contract, whose own slot holds THAT character under
 *  the card's contract (Continue's own card law: never a stranger's slot). */
async function rosterHero(card: RosterEntry | undefined): Promise<CharacterFields | null> {
  if (!card || card.fallen || modeById(card.modeId).save !== 'roster' || card.slot < ROSTER_SLOT_BASE) return null;
  const f = await slotHero(card.slot, card.charId);
  return f && (f.modeId ?? DEFAULT_MODE_ID) === card.modeId ? f : null;
}

/** THE TRAVELING VESSEL: the hero that goes to a server, ready for a `join`
 *  (world half dropped, a fresh copy), or null when there is none to bring.
 *  THE WAKE'S WORD: given a `charId` (the bedside wake names the hero it just
 *  saved), exactly THAT character: the run slot when it holds it, else its
 *  roster card's own slot (an Immortal vessel travels). Without one (the
 *  lobby): the run slot's hero as ever (a roster save never travels out of
 *  the shared slot), and while the run slot is EMPTY, THE LONE VESSEL: the one
 *  standing roster card of `account` (two or more stand: ambiguous, null, and
 *  Mu picks). Null too for a stale schema, no character id, an unknown class.
 *  No `account`: the run slot alone (the roster is the account's to name). */
export async function readTravelingVessel(account?: Account, charId?: string): Promise<CharacterSave | null> {
  const cards = account?.roster ?? [];
  let fields: CharacterFields | null;
  if (charId) {
    const run = await slotHero(CHAR_SLOT, charId);
    fields = run && modeById(run.modeId).save !== 'roster' ? run : await rosterHero(cards.find(r => r.charId === charId));
  } else {
    const run = await slotHero(CHAR_SLOT);
    if (run) fields = modeById(run.modeId).save !== 'roster' ? run : null;
    else {
      const standing = cards.filter(r => !r.fallen && modeById(r.modeId).save === 'roster');
      fields = standing.length === 1 ? await rosterHero(standing[0]) : null;
    }
  }
  if (!fields || typeof fields.charId !== 'string' || !fields.charId) return null;
  const classId = fields.classId;
  if (!CLASSES.some(c => c.id === classId)) return null;
  const { world: _ground, ...hero } = fields as CharacterSave;
  return structuredClone(hero);
}

/** The lobby's one line naming which hero will travel (utility-screen text). */
export function travelNote(vessel: CharacterSave | null, lobbyClassId: string): string {
  if (!vessel) {
    const cls = CLASSES.find(c => c.id === lobbyClassId);
    return `Traveling: a fresh ${cls?.name ?? 'hero'} (you have no saved hero to bring).`;
  }
  const cls = CLASSES.find(c => c.id === vessel.classId);
  const name = vessel.name?.trim() || cls?.name || vessel.classId;
  const who = `${name}, level ${vessel.level} ${cls?.name ?? vessel.classId}`;
  // THE IMMORTAL TRAVELS: a roster vessel names its contract and its rung (the roster card's chip, in words).
  const mode = modeById(vessel.modeId);
  if (mode.save === 'roster') {
    const badge = stageOf(vessel.modeId, vessel.modeStage ?? 0).badge;
    const rung = badge ? `, ${badge.charAt(0)}${badge.slice(1).toLowerCase()}` : '';
    return `Traveling: ${who} (${mode.name}${rung}). Your ${mode.name} vessel goes in place of the class card.`;
  }
  return `Traveling: ${who}. Your saved hero goes in place of the class card.`;
}

/** A fall the shard reported, staged for the death screen. */
export interface ShardDeath {
  /** The death screen's reckoning (ui/panels.ts RunReckoning's shape). */
  reck: {
    rows: ShardReckoning['rows']; carried: number; mult: number; minted: number; renown: number;
    standing: { byEssence: number; byRenown: number; of: number } | null; zoneName: string;
  };
  note: ShardCorpseNote;
  kills: number;
  zones: number;
}

/** The session's vessel link: subscribed on the shard transport for as long
 *  as the transport lives (it outlasts the menu's teardown, so THE FAREWELL's
 *  last mirror still lands while the socket closes). */
export class ShardVesselLink {
  /** The vessel this client sent (then each mirror of it); null once it fell
   *  or when a fresh hero traveled. */
  private current: CharacterSave | null;
  private death: ShardDeath | null = null;
  /** Mirrors written home this session (the rig's read). */
  mirrors = 0;

  constructor(
    readonly net: WsTransport,
    private readonly account: Account,
    vessel: CharacterSave | null,
    private readonly shell: () => World | null,
    private readonly hooks: {
      /** The run slot was wiped (the menu's Continue goes dark): a run-mode
       *  vessel's fall alone (THE HOME SLOT: a roster vessel's mirror and fall
       *  never touch the shared Continue). */
      runWiped?: () => void;
      /** May a mirror land in the slot now? False once another run owns it
       *  (a farewell's late mirror must never overwrite a new run's save). */
      mayWrite?: () => boolean;
    } = {},
  ) {
    this.current = vessel;
    net.farewell = !!vessel; // THE FAREWELL: a traveling hero asks for its last mirror at leave
    net.onSession(m => this.onSession(m));
    // THE IDENTITY goes to disk before the shard keys a single record by it
    // (a compatible boot mints it into the cache only; this is its first use).
    saveAccount(account);
  }

  /** The hero this link speaks for (null: none, or it fell). */
  get traveling(): CharacterSave | null { return this.current; }

  private onSession(m: SessionMsg): void {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'heroSave') this.onMirror(m.save);
    else if (m.t === 'corpse') this.onFell(m.note, m.reckoning);
    else if (m.t === 'corpses') this.onBodies(m.bodies, m.reclaimed);
  }

  /** THE MIRROR lands: honored only for the vessel this client sent, under
   *  the same class and life-contract; written to the hero's own slot (THE
   *  HOME SLOT: the shared Continue for a run-mode vessel, the roster card's
   *  slot for a roster vessel, its card refreshed beside it). */
  private onMirror(raw: unknown): void {
    const v = this.current, s = raw as CharacterSave | null;
    if (!v || !s || typeof s !== 'object' || s.charId !== v.charId || s.classId !== v.classId
      || (s.modeId ?? DEFAULT_MODE_ID) !== (v.modeId ?? DEFAULT_MODE_ID)) return;
    if (this.hooks.mayWrite && !this.hooks.mayWrite()) return;
    if (saveVesselMirror(this.account, s) < 0) return;
    this.current = s;
    this.mirrors++;
  }

  /** THE DEATH COVENANT's word: the vessel fell on the shard. The client runs
   *  the mortal reckoning main.ts runs at a solo death (the shard appraised
   *  the carry; the corpse stays on the shard, never on this account's ring),
   *  wipes the run slot, and stages the death screen for the `runEnd`. */
  private onFell(rawNote: unknown, rawReck: unknown): void {
    const v = this.current;
    const note = sanitizeCorpseNote(rawNote), reck = sanitizeReckoning(rawReck);
    if (!v || !note || !reck || note.charId !== v.charId || this.death) return;
    const a = this.account;
    const stage = stageOf(v.modeId, reck.modeStage);
    // THE WIPE first (permadeath): a crash between the halves may lose the
    // reckoning, never repeat it (a surviving slot would upload again and
    // hear THE LATE WORD a second time). THE HOME SLOT: a roster vessel's
    // conclusion keeps its own slot (main.ts's roster law), never the Continue's.
    if (modeById(v.modeId).save !== 'roster') {
      const held = savedCharacterPatronId();
      if (held === undefined || held === v.charId) { clearCharacter(); this.hooks.runWiped?.(); }
    }
    applyCredits(a, reck.minted);
    let record: RunRecord | null = null;
    if (stage.metaProgression) {
      record = {
        schema: RUN_RECORD_SCHEMA, at: Date.now(), name: v.name?.trim() || note.name, classId: v.classId,
        level: reck.level, zones: reck.zones, kills: reck.kills, reason: 'death', essence: reck.minted, renown: reck.renown,
      };
      recordRun(a, record);
      // The vessel's own run counters fold home exactly as its solo run's would.
      if (v.ledger) mergeLedger(a.ledger, v.ledger);
      settleClassUnlocks(a);
    }
    if (stage.countsAccountDeath) bumpLedger(a.ledger, LEDGER_ACCOUNT_DEATHS);
    releaseMercsOf(a, v.charId);
    saveAccountDurable(a);
    this.current = null;
    this.net.farewell = false;
    this.death = {
      reck: {
        rows: reck.rows, carried: reck.carried, mult: reck.mult, minted: reck.minted, renown: reck.renown,
        standing: record ? runStanding(a, record) : null, zoneName: note.zoneName,
      },
      note, kills: reck.kills, zones: reck.zones,
    };
  }

  /** This seat's OWN standing bodies, drawn on the render shell as ordinary
   *  player corpses (the shard's dwell clock rides each row: drawn == dwelt);
   *  a completed reclaim banks the account's corpse deed. */
  private onBodies(raw: unknown, reclaimed: unknown): void {
    const n = typeof reclaimed === 'number' && Number.isInteger(reclaimed) && reclaimed > 0 && reclaimed <= 64 ? reclaimed : 0;
    if (n) { bumpLedger(this.account.ledger, LEDGER_CORPSES_RECLAIMED, n); saveAccount(this.account); }
    const w = this.shell();
    if (!w) return;
    w.playerCorpses = sanitizeBodyRows(raw).map(b => ({
      pos: { x: b.x, y: b.y }, recordIndex: -1, owner: w.clientSeatId,
      who: { classId: b.classId, level: b.level }, dwell: b.dwell, reclaimed: false,
    }));
  }

  /** The staged fall, once, for the death screen; null for every other run
   *  end. The dead shell is dressed as the fallen vessel (it is torn down at
   *  the rejoin): its name, and the journey the shard counted. */
  takeDeath(net: NetTransport, world: World | null): ShardDeath | null {
    if (net !== this.net || !this.death) return null;
    const d = this.death;
    this.death = null;
    if (world) {
      world.meta.name = d.note.name;
      world.kills = d.kills;
      world.visited = new Set(Array.from({ length: d.zones }, (_, i) => `shard:${i}`));
    }
    return d;
  }
}
