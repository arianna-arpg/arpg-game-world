/** Exact fresh-character native bodies. Bootstrap ownership is composed separately. */
import type {World,Seat,PlayerMeta} from './world';
import {fillFlaskChargeBanks} from './flaskState';
import {vec,type Vec2} from '../core/math';
import {type Attributes} from './stats';
import {Actor} from './actor';
import {NullInput,type PlayerInputSource} from '../net/intent';
import {makeSkillGem,CLASS_KIT_RARITY} from './skills';
import {findBagGem} from './gemitems';
import {SKILLS} from '../data/skills';
import {MONSTERS} from '../data/monsters';
import {PROGRESSION,type ClassDef} from '../data/classes';
import {classStartNode} from '../data/passives';
import {START_ZONE} from '../data/zones';
import {ULT_QA} from './ultimates';
import {bumpLedger} from '../packages/ledger';
import {LEDGER_FLASK_LESSON} from '../meta/account';
import {planSkillSlots} from '../meta/skillSlotMemory';
import {DEFAULT_MODE_ID} from '../meta/modes';
import {padBar} from './nativeProgressionMeta';
import {emptyEssences} from './nativeProgressionMeta';
import {emptyAbilityEssences} from './nativeProgressionMeta';
const MIREILLE_GIFT_SKILLS = ['life_flask', 'mana_flask'];
const MIREILLE_GIFT_LEDGER = 'mireille_flasks_given';
const MIREILLE_FILL_LEDGER = LEDGER_FLASK_LESSON;
export interface NativeCharacterCreationHost {
 admitCombatBirth:(body:Actor)=>void;
 account:World["account"];
 actors:World["actors"];
 arena:World["arena"];
 bindCombatDeeds:World["bindCombatDeeds"];
 bindSkill:World["bindSkill"];
 charDirty:World["charDirty"];
 clampPos:World["clampPos"];
 companionsOfSkill:World["companionsOfSkill"];
 createMonster:World["createMonster"];
 dealVeteranFlasks:World["dealVeteranFlasks"];
 events:World["events"];
 grantSkillGemItem:World["grantSkillGemItem"];
 grantStartingCompanions:World["grantStartingCompanions"];
 indexSeats:World["indexSeats"];
 learnSkill:World["learnSkill"];
 ledger:World["ledger"];
 loadZone:World["loadZone"];
 localSeat:World["localSeat"];
 makePlayerSeat:World["makePlayerSeat"];
 markMetaDirty:World["markMetaDirty"];
 provisioningFlaskSlots:World["provisioningFlaskSlots"];
 recalcSeat:World["recalcSeat"];
 rememberSkillSlots:World["rememberSkillSlots"];
 restoreAccountRelics:World["restoreAccountRelics"];
 seats:World["seats"];
 tameCompanion:World["tameCompanion"];
 text:World["text"];
 veteranFlaskDeals:World["veteranFlaskDeals"];
}

export function sceneMakePlayerSeat(nativeHost:Pick<NativeCharacterCreationHost,'recalcSeat'>,id: string, classDef: ClassDef, input: PlayerInputSource, pos: Vec2,
    kit?: readonly (string | null)[]): Seat {
    const p = new Actor(classDef.name, 'player', vec(pos.x, pos.y));
    p.color = classDef.color;
    p.radius = 15;
    p.kind = 'player';
    p.look = classDef.look;
    // THE STAMPED OPENING: the resolved kit when one is handed in (an owned
    // mastery alternate standing in for its base, a Master's grant seated),
    // else the class's base bar — recorded on the seat as this run's own truth.
    const bar = kit ?? classDef.bar;
    const meta: PlayerMeta = {
      classDef,
      opening: [...bar],
      stances: {},
      name: classDef.name,
      baseAttrs: { ...classDef.attributes },
      attrs: { ...classDef.attributes },
      xp: 0,
      xpNeeded: PROGRESSION.xpForLevel(1),
      passivePoints: PROGRESSION.startingPassivePoints,
      allocated: new Set([classStartNode(classDef.id)]),
      choices: {},
      realmPoints: {},
      grafts: {},
      vocations: [],
      vocationPoints: 0,
      knownSkills: new Map(),
      items: [],
      equipped: {},
      containers: {},
      essences: emptyEssences(),
      abilityEssences: emptyAbilityEssences(),
      vestiges: {},
      // Ally seats are mode-less passengers of the host's run; only the LOCAL
      // hero's mode drives the death flow (createPlayer stamps the real one).
      modeId: DEFAULT_MODE_ID,
      modeStage: 0,
      charId: '',
    };
    // Class bar skills come pre-learned at the KIT tier — the ladder's floor
    // (1 socket), so the wild economy outdrops the cradle from the first find.
    // An unknown id in the opening is skipped, never a crash.
    for (const sid of bar) {
      if (sid && SKILLS[sid] && !meta.knownSkills.has(sid)) {
        meta.knownSkills.set(sid, makeSkillGem(SKILLS[sid], 1, CLASS_KIT_RARITY));
      }
    }
    p.skills = padBar(bar.map(sid => (sid ? meta.knownSkills.get(sid) ?? null : null)));
    const seat: Seat = { id, actor: p, meta, input, lastActedAt: -999, lastMovedAt: -999, reviveDwellBy: new Map() };
    nativeHost.recalcSeat(seat);
    p.fillResources();
    return seat;
  }

export function sceneCreatePlayer(nativeHost:Pick<NativeCharacterCreationHost,'localSeat'|'makePlayerSeat'|'arena'|'bindCombatDeeds'|'seats'|'indexSeats'|'restoreAccountRelics'|'recalcSeat'|'actors'|'events'|'loadZone'|'grantStartingCompanions'|'dealVeteranFlasks'>,classDef: ClassDef, opts?: { modeId?: string; charId?: string; name?: string;
    /** Resume shells and isolated test arenas suppress fresh-character gifts. */
    startingCompanions?: boolean;
    startingFlasks?: boolean;
    /** THE OPENING (meta/classkit.ts): the resolved kit bar — see makePlayerSeat. */
    kit?: readonly (string | null)[];
    /** THE UNIT WARDEN (shard M1, engine/shardUnits.ts): false stands the hero
     *  without loading the hearth; a sim unit loads its own zone after. */
    load?: boolean }): void {
    // The local seat is this client's own hero (camera + input anchor). Input is
    // a placeholder until main.ts wires the OS reader (Phase 4); single-player
    // reads it through the `player`/`meta` getters exactly as before.
    nativeHost.localSeat = nativeHost.makePlayerSeat('p0', classDef, new NullInput(), vec(nativeHost.arena.w / 2, nativeHost.arena.h / 2), opts?.kit);
    // The LIFE-CONTRACT (meta/modes.ts): stamped at creation; a resumed save
    // overwrites it via applySavedCharacter (the save is the authority).
    if (opts?.modeId) nativeHost.localSeat.meta.modeId = opts.modeId;
    if (opts?.charId) nativeHost.localSeat.meta.charId = opts.charId;
    // THE NAME: the world remembers it (meta/nemesis.ts sagas key off it).
    if (opts?.name?.trim()) {
      nativeHost.localSeat.meta.name = opts.name.trim();
      nativeHost.localSeat.actor.name = nativeHost.localSeat.meta.name;
    }
    nativeHost.bindCombatDeeds();
    nativeHost.seats = [nativeHost.localSeat];
    nativeHost.indexSeats();
    nativeHost.restoreAccountRelics(nativeHost.localSeat);
    nativeHost.recalcSeat(nativeHost.localSeat);
    nativeHost.localSeat.actor.fillResources();
    nativeHost.actors.push(nativeHost.localSeat.actor);
    // Roster lifecycle: the local hero joins the party (drives the party UI).
    nativeHost.events.emit('party/join', { actor: nativeHost.localSeat.actor, seat: 'p0' });
    if (opts?.load !== false) nativeHost.loadZone(START_ZONE); // THE UNIT WARDEN (shardUnits): a unit loads its own zone
    if (opts?.startingCompanions !== false) nativeHost.grantStartingCompanions();
    if (opts?.startingFlasks !== false) nativeHost.dealVeteranFlasks();
  }

export function sceneGrantStartingCompanions(nativeHost:Pick<NativeCharacterCreationHost,'companionsOfSkill'|'createMonster'|'clampPos'|'actors'|'tameCompanion'|'admitCombatBirth'|'localSeat'>,seat: Seat = nativeHost.localSeat): void {
    for (const gift of seat.meta.classDef.startingCompanions ?? []) {
      const inst = seat.actor.skills.find(s => s?.def.id === gift.skillId);
      if (!inst || !MONSTERS[gift.monsterId] || nativeHost.companionsOfSkill(seat.actor, gift.skillId).length) continue;
      const companion = nativeHost.createMonster(gift.monsterId, 1, seat.actor.team, seat.actor);
      companion.pos = nativeHost.clampPos(vec(seat.actor.pos.x + 36, seat.actor.pos.y + 24), companion.radius);
      companion.tier = seat.actor.tier;
      nativeHost.actors.push(companion);
      nativeHost.admitCombatBirth(companion);
      nativeHost.tameCompanion(seat.actor, companion, gift.skillId);
    }
  }

export function sceneDealVeteranFlasks(nativeHost:Pick<NativeCharacterCreationHost,'veteranFlaskDeals'|'localSeat'|'ledger'|'account'|'provisioningFlaskSlots'|'grantSkillGemItem'|'learnSkill'|'bindSkill'|'rememberSkillSlots'|'charDirty'|'markMetaDirty'>,seat: Seat = nativeHost.localSeat, owed = !!(nativeHost.account.ledger[LEDGER_FLASK_LESSON] ?? 0)): void {
    if (!owed || nativeHost.veteranFlaskDeals.has(seat)) return;
    if (seat === nativeHost.localSeat && nativeHost.ledger[MIREILLE_FILL_LEDGER]) return;
    const p = seat.actor, m = seat.meta;
    const slots = planSkillSlots(MIREILLE_GIFT_SKILLS, p.skills.map(inst => inst?.def.id ?? null), nativeHost.account.skillSlotMemory);
    let complete = true;
    // Automatic fallback seating must not replace a remembered preference.
    nativeHost.provisioningFlaskSlots.add(seat);
    try {
      for (const sid of MIREILLE_GIFT_SKILLS) {
        if (!SKILLS[sid]) { complete = false; continue; }
        const slot = slots.get(sid) ?? -1;
        if (!m.knownSkills.has(sid)) {
          const item = findBagGem(m.items, 'skill', sid)
            ?? nativeHost.grantSkillGemItem(seat, makeSkillGem(SKILLS[sid], 1, 'magic'), true);
          if (!item || !nativeHost.learnSkill(item.uid, seat, slot)) { complete = false; continue; }
        }
        if (!p.skills.some(inst => inst?.def.id === sid)) {
          if (slot < 0 || !nativeHost.bindSkill(slot, sid, seat)) complete = false;
        }
      }
    } finally {
      nativeHost.provisioningFlaskSlots.delete(seat);
      nativeHost.rememberSkillSlots(seat, undefined, false);
    }
    fillFlaskChargeBanks(p, m.knownSkills.values());
    if (!complete) return; // keep carried gifts recoverable; never stamp a refused deal
    nativeHost.veteranFlaskDeals.add(seat);
    if (seat === nativeHost.localSeat) {
      bumpLedger(nativeHost.ledger, MIREILLE_GIFT_LEDGER);
      bumpLedger(nativeHost.ledger, MIREILLE_FILL_LEDGER);
      nativeHost.charDirty = true;
    }
    nativeHost.markMetaDirty(seat);
  }

export function sceneDealLabArts(nativeHost:Pick<NativeCharacterCreationHost,'localSeat'|'grantSkillGemItem'|'recalcSeat'>,force = false): number {
    if (!force && !(ULT_QA.active && ULT_QA.grantArts)) return 0;
    const seat = nativeHost.localSeat;
    const m = seat.meta;
    let bumped = false;
    let dealt = 0;
    for (const def of Object.values(SKILLS)) {
      if (!(def.ultimate || def.gauge) || def.noDrop) continue;
      if (ULT_QA.kitExclude.includes(def.id)) continue; // the tab's exclusions
      // THE LAB HERO IS BUILT TO WIELD ITS KIT: the build's BASE attributes
      // rise to every dealt art's requirement — the learn gate and the
      // cast-time gate both read the DERIVED meta.attrs, which recalc folds
      // from these (a direct attrs write would not survive the next fold).
      for (const [attr, need] of Object.entries(def.requirements ?? {})) {
        const k = attr as keyof Attributes;
        if ((m.baseAttrs[k] ?? 0) < (need ?? 0)) { m.baseAttrs[k] = need!; bumped = true; }
      }
      if (m.knownSkills.has(def.id) || findBagGem(m.items, 'skill', def.id)) continue;
      if (nativeHost.grantSkillGemItem(seat, makeSkillGem(def, 1, 'magic'), true)) dealt++;
    }
    if (bumped) nativeHost.recalcSeat(seat);
    return dealt;
  }

export function sceneApplySkillGraft(nativeHost:Pick<NativeCharacterCreationHost,'localSeat'|'grantSkillGemItem'|'learnSkill'|'recalcSeat'|'markMetaDirty'|'text'>,skillId: string): boolean {
    const def = SKILLS[skillId];
    if (!def) return false;
    const seat = nativeHost.localSeat;
    const m = seat.meta;
    const gem = makeSkillGem(def, 1, 'common');
    // THE RESIDENCE: the graft's gem lands as a bag item (ground spill on a
    // full pack — a run's first breath is never silently shorted), and a
    // kit with a free seat learns it in the one gesture (learn = seat).
    const item = nativeHost.grantSkillGemItem(seat, gem, true);
    if (item && !m.knownSkills.has(skillId)) nativeHost.learnSkill(item.uid, seat);
    nativeHost.recalcSeat(seat);
    nativeHost.markMetaDirty(seat);
    nativeHost.text(vec(seat.actor.pos.x, seat.actor.pos.y - 30),
      `${def.name} rides with you — the graft takes`, '#7fe0d8', 14);
    return true;
  }
