/** Original native ground rewards, allocation and resource-orb delivery over an explicit host. */
import type {LootResult} from './loot';
import {chance,dist,rand,vec,type Vec2} from '../core/math';
import {type SkillTag} from './stats';
import {Actor} from './actor';
import {makeSkillGem,rollSkillRarity,SKILL_RARITIES,type SkillInstance} from './skills';
import {mintSupportInstance} from './supportbase';
import {containerAccepts} from './containers';
import {CONTAINER_DEFS} from '../data/containers';
import {MEMORY_CFG,MEMORY_KINDS,makeMemoryItem,memoryFormOf,memoryKindForSeed,seedLaneFrac,type MemoryKind,type MemoryPin,type MemoryProvenance} from './memories';
import {abilityEssenceOfTier,ESSENCE_SPILL_CFG,type EssenceCost} from '../data/essences';
import {ITEM_RARITIES,type ItemInstance,type RoughMemoryUnit} from './items';
import {GEM_DROP_CFG,gemFloorFor} from './loot';
import {VESTIGES} from '../data/vestiges';
import {VENDOR_CFG} from '../data/vendors';
import {awakenMemoryFromDrop} from '../meta/memoryUnlocks';
import {SKILLS} from '../data/skills';
import {COOP_SCALING} from '../data/coop';
import {SUPPORTS} from '../data/supports';
import {type ZoneDef} from '../data/zones';
import {Rng} from '../core/rng';
import {ORB_DEFS,ORB_CAP,orbAmount} from '../data/orbs';
import {gemDropKey,LEDGER_GEMDROP_TOTAL,LEDGER_LEGENDARY_SKILL_DROP} from '../meta/account';
import {SIM_TAP} from './tap';
import type {World,GemDrop,Seat} from './world';
type ClampOpts=NonNullable<ReturnType<World['spoilClamp']>>;
/** Seconds a player-DROPPED gem stays un-grabbable so the dropper (standing on
 *  it) doesn't instantly re-pick it up — long enough to step off / hand it over.
 *  Monster & chest drops leave grace undefined → grabbable immediately (unchanged). */
export const DROP_PICKUP_GRACE = 0.8;
export interface NativeSceneLootHost {
 account:World['account'];
 accountDirty:World['accountDirty'];
 dropRuleOf:World['dropRuleOf'];
 drops:World['drops'];
 flashes:World['flashes'];
 orbs:World['orbs'];
 questSeat:World['questSeat'];
 seats:World['seats'];
 spoilStory:World['spoilStory'];
 time:World['time'];
 zone:World['zone'];
 clampPos:World['clampPos'];
 dropAbilityEssenceAt:World['dropAbilityEssenceAt'];
 dropEssenceAt:World['dropEssenceAt'];
 dropGearAt:World['dropGearAt'];
 dropGemAt:World['dropGemAt'];
 dropMemoryUnit:World['dropMemoryUnit'];
 dropPinnedGem:World['dropPinnedGem'];
 dropVestigeAt:World['dropVestigeAt'];
 lootDropCue:World['lootDropCue'];
 lootLevelAt:World['lootLevelAt'];
 metaProgressionActive:World['metaProgressionActive'];
 mintGemAt:World['mintGemAt'];
 noteContainerFind:World['noteContainerFind'];
 noteGemDrop:World['noteGemDrop'];
 ownSpoils:World['ownSpoils'];
 questHand:World['questHand'];
 rollSkillGem:World['rollSkillGem'];
 rollSupportDropGated:World['rollSupportDropGated'];
 sameParty:World['sameParty'];
 seatHero:World['seatHero'];
 spoilClamp:World['spoilClamp'];
 spoilsSealed:World['spoilsSealed'];
 zoneGemFloor:World['zoneGemFloor'];
}

export function sceneDropEssenceAt(host:NativeSceneLootHost, at: Vec2, gain: EssenceCost, contextZone?: Readonly<ZoneDef>): void {
    if (contextZone ? contextZone.spoils === 'none' : host.spoilsSealed()) return; // THE SPOILS LAW — spilled essence is minted wealth
    if (gain.count <= 0) return;
    const s = ESSENCE_SPILL_CFG.scatter;
    const pos = host.clampPos(vec(at.x + rand(-s, s), at.y + rand(-s, s)), 10, undefined, host.spoilClamp());
    host.drops.push({ pos, item: { kind: 'essence', essence: gain.essence, count: gain.count }, bob: rand(0, Math.PI * 2), tier: host.spoilStory });
    // THE OWNER STAMP (card 27): essence a quest pays inside its hand's scope (THE QUEST HAND)
    // is that hand's; every other packet wears its own pass's stamp. Inert off a hosted world.
    if (host.dropRuleOf && host.questSeat) host.ownSpoils(host.drops.length - 1, host.questSeat);
  }

export function sceneDropAbilityEssenceAt(host:NativeSceneLootHost, at: Vec2, tier: number, count: number, rng: () => number = Math.random, contextZone?: Readonly<ZoneDef>): void {
    if (contextZone ? contextZone.spoils === 'none' : host.spoilsSealed()) return; // THE SPOILS LAW — minted wealth
    if (count <= 0) return;
    const def = abilityEssenceOfTier(tier);
    const s = ESSENCE_SPILL_CFG.scatter;
    const pos = host.clampPos(vec(at.x + (rng() * 2 - 1) * s, at.y + (rng() * 2 - 1) * s), 10, undefined, host.spoilClamp());
    host.drops.push({ pos, item: { kind: 'abilityEssence', tier: def.tier, count }, bob: rng() * Math.PI * 2, tier: host.spoilStory });
    host.lootDropCue(at, def.color);
  }

export function sceneDropVestigeAt(host:NativeSceneLootHost, at: Vec2, id: string, count = 1, contextZone?: Readonly<ZoneDef>): void {
    if (contextZone ? contextZone.spoils === 'none' : host.spoilsSealed()) return; // THE SPOILS LAW — vestiges are minted wealth
    if (!VESTIGES[id]) return;
    const pos = host.clampPos(vec(at.x + rand(-14, 14), at.y + rand(-14, 14)), 10, undefined, host.spoilClamp());
    host.drops.push({ pos, item: { kind: 'vestige', id, count }, bob: rand(0, Math.PI * 2), tier: host.spoilStory });
  }

export function sceneDropGearAt(host:NativeSceneLootHost, at: Vec2, item: ItemInstance, droppedBy?: string, owed = false, contextZone?: Readonly<ZoneDef>): void {
    // Lessons gate ambient relics at the shared mint seam, including caches.
    // Earned rewards and owned property always retain their ordinary delivery.
    if (!droppedBy && !owed && CONTAINER_DEFS.some(c => c.dropLedger
      && (host.account.ledger[c.dropLedger] ?? 0) < 1 && containerAccepts(c, item))) return;
    // THE SPOILS LAW: minted gear refuses on sealed ground; a player's own
    // discards (droppedBy) and owed returns are movement and always land.
    if (!droppedBy && !owed && (contextZone ? contextZone.spoils === 'none' : host.spoilsSealed())) return;
    // THE SPOILS STORY: a discard lands on its dropper's story, minted gear
    // on the shedder's (the context) — the clamp confines on that story.
    const dropper = droppedBy ? host.seats.find(s => s.id === droppedBy)?.actor : undefined;
    const story = dropper ? dropper.tier : host.spoilStory;
    const pos = host.clampPos(vec(at.x + rand(-16, 16), at.y + rand(-16, 16)), 10, undefined,
      story !== undefined && story >= 1 ? { tier: story } : undefined);
    delete item.x;
    delete item.y;
    const drop: GemDrop = { pos, item: { kind: 'gear', item }, bob: rand(0, Math.PI * 2), tier: story };
    if (droppedBy) { drop.grace = DROP_PICKUP_GRACE; drop.droppedBy = droppedBy; }
    host.drops.push(drop);
    // THE OWNER STAMP (card 27): a discard wears its dropper beside droppedBy; owed pay wears
    // the seat it is owed to, THE QUEST HAND (a quest's scope names its hand, else the acting seat).
    if (host.dropRuleOf && (droppedBy || owed)) host.ownSpoils(host.drops.length - 1, droppedBy ? host.seats.find(s => s.id === droppedBy) : host.questHand());
    if (!droppedBy) {
      host.lootDropCue(at, ITEM_RARITIES[item.rarity].color);
      // THE DISCOVERY LEDGER (engine/containers.ts ContainerDef.foundLedger):
      // a GENUINE world mint of a piece some side board accepts stamps the
      // account once — the Vault's case for it surfaces only after the
      // world has shown one (never a discard, a reclaim or an owed pay —
      // the gem index's own doctrine).
      if (!owed) host.noteContainerFind(item);
    }
  }

export function sceneLootDropCue(host:NativeSceneLootHost, at: Vec2, color: string): void {
    const x = at.x + rand(-10, 10);
    host.flashes.push({ pos: vec(x, at.y), radius: 24, color, life: .35, maxLife: .35, fx: 'sparkle' });
  }

export function sceneSpoilClamp(host:NativeSceneLootHost): ClampOpts | undefined {
    const s = host.spoilStory;
    return s !== undefined && s >= 1 ? { tier: s } : undefined;
  }

export function sceneOwnSpoils(host:NativeSceneLootHost, d0: number, seat: Seat | null | undefined, at?: Vec2): void {
    if (!host.dropRuleOf || !seat || seat.keeper || seat.merc || host.drops.length <= d0) return;
    const rule = host.dropRuleOf(seat.id);
    if (!rule || rule.rule === 'free') return;
    let owner = seat.id;
    if (at && rule.allocation === 'rotate' && rule.deal) {
      const r = COOP_SCALING.shareRadius;
      const inReach = host.seats.filter(s => !s.keeper && !s.merc && !s.actor.dead && host.sameParty(seat, s)
        && (r <= 0 || dist(at, host.seatHero(s).pos) <= r)).map(s => s.id); // SOVEREIGNTY: census (the deal is apportioned by reach, never a touch)
      owner = rule.deal(inReach) ?? owner;
    }
    const freeAt = rule.rule === 'timed' ? host.time + Math.max(0, rule.freeAfterSec) : undefined;
    for (let i = d0; i < host.drops.length; i++) {
      const d = host.drops[i];
      if (d.owner !== undefined || (d.item.kind === 'gear' && d.item.item.questId)) continue;
      d.owner = owner;
      if (freeAt !== undefined) d.freeAt = freeAt;
    }
  }

export function sceneDropGemAt(host:NativeSceneLootHost, at: Vec2, bias?: SkillTag[], owed = false, from?: string | MemoryProvenance, memoryKind?: MemoryKind, pin?: MemoryPin, contextZone?: Readonly<ZoneDef>): void {
    const d0 = host.drops.length;
    host.mintGemAt(at, bias, owed, from, memoryKind, pin, contextZone);
    // THE OWNER STAMP (card 27): owed pay wears the seat it is owed to, THE QUEST HAND (a
    // quest's scope names its hand, else the acting seat). Inert off a hosted world.
    if (owed && host.dropRuleOf) host.ownSpoils(d0, host.questHand());
  }

export function sceneMintGemAt(host:NativeSceneLootHost, at: Vec2, bias?: SkillTag[], owed = false, from?: string | MemoryProvenance, memoryKind?: MemoryKind, pin?: MemoryPin, contextZone?: Readonly<ZoneDef>): void {
    // THE SPOILS LAW: sealed ground refuses the mint — except OWED pay
    // (a quest's payout is earned of the writ, not of this ground).
    if (!owed && (contextZone ? contextZone.spoils === 'none' : host.spoilsSealed())) return;
    const pos = host.clampPos(vec(at.x + rand(-20, 20), at.y + rand(-20, 20)), 10, undefined, host.spoilClamp());
    // THE GEM FLOOR (charter §4): this ground's country may floor its own
    // gems into the mint — found in the scald before the account owns them.
    const floor = contextZone ? gemFloorFor(contextZone.tileset) : host.zoneGemFloor();
    const prov: MemoryProvenance = typeof from === 'string' ? { d: from } : from ?? { d: MEMORY_CFG.foundProvenance };
    // THE FORM: one read off the sealed seed decides memory vs bare gem,
    // then that lane lands it. `direct` is the bare gem's OWN mint (the
    // identity the roll produced), never a second roll.
    const land = (bobF: number, direct: () => void): void => {
      const seed = (bobF * 4294967296) >>> 0;
      const asMemory = memoryKind !== undefined || memoryFormOf(seed, GEM_DROP_CFG.memoryShare);
      if (!asMemory) { direct(); return; }
      const kind: MemoryKind = pin ? 'rough' : memoryKind ?? memoryKindForSeed(seed, GEM_DROP_CFG.preformedShare);
      const floored = !!floor && (floor.skills.size > 0 || floor.supports.size > 0);
      host.dropMemoryUnit(pos, at, prov, seed, kind, bobF, pin, floored ? (contextZone ?? host.zone).tileset : undefined);
    };
    if (pin) {
      // THE PROMISE spends the plain lane's own draw count (jitter + bob) —
      // no pool roll: the identity IS the promise.
      const bobF = Math.random();
      land(bobF, () => host.dropPinnedGem(pos, at, pin, bobF));
      return;
    }
    const dropSkill = (): void => {
      const inst = host.rollSkillGem(bias, contextZone?.level ?? host.lootLevelAt(at), floor);
      const bobF = Math.random(); // rand(0, 2π)'s own draw, raw — the seed site
      land(bobF, () => {
        host.noteGemDrop(inst.def.id, inst.rarity);
        host.drops.push({ pos, item: { kind: 'skill', inst }, bob: bobF * Math.PI * 2, tier: host.spoilStory });
        host.lootDropCue(at, SKILL_RARITIES[inst.rarity ?? 'common'].color);
      });
    };
    if (chance(GEM_DROP_CFG.skillShare)) { dropSkill(); return; }
    const gemDef = host.rollSupportDropGated(bias, contextZone?.level ?? host.lootLevelAt(at), floor);
    if (!gemDef) { dropSkill(); return; } // no supports unlocked → a skill gem instead
    const bobF = Math.random();
    land(bobF, () => {
      host.noteGemDrop(gemDef.id);
      host.drops.push({ pos, item: { kind: 'support', gem: { def: gemDef, level: 1 } }, bob: bobF * Math.PI * 2, tier: host.spoilStory });
      host.lootDropCue(at, gemDef.color);
    });
  }

export function sceneDropPinnedGem(host:NativeSceneLootHost, pos: Vec2, at: Vec2, pin: MemoryPin, bobF: number): void {
    const seed = (bobF * 4294967296) >>> 0;
    if (pin.k === 'skill') {
      const def = SKILLS[pin.id];
      if (!def) { console.warn(`dropGemAt: pinned skill '${pin.id}' is not in the registry`); return; }
      const inst = makeSkillGem(def, pin.l ?? 1, pin.r ?? rollSkillRarity(seedLaneFrac(seed, 'rarity')));
      host.noteGemDrop(inst.def.id, inst.rarity); // a BUILT spoil is a genuine mint too — the drop index sees it
      host.drops.push({ pos, item: { kind: 'skill', inst }, bob: bobF * Math.PI * 2, tier: host.spoilStory });
      host.lootDropCue(at, SKILL_RARITIES[inst.rarity ?? 'common'].color);
      return;
    }
    const def = SUPPORTS[pin.id];
    if (!def) { console.warn(`dropGemAt: pinned support '${pin.id}' is not in the registry`); return; }
    const cutRng = new Rng((seed ^ 0x9e3779b9) >>> 0);
    host.noteGemDrop(def.id);
    host.drops.push({ pos, item: { kind: 'support', gem: mintSupportInstance(def, pin.l ?? 1, () => cutRng.next()) }, bob: bobF * Math.PI * 2, tier: host.spoilStory });
    host.lootDropCue(at, def.color);
  }

export function sceneDropMemoryUnit(host:NativeSceneLootHost, pos: Vec2, at: Vec2, prov: MemoryProvenance, seed: number, kind: MemoryKind, bobF: number, pin?: MemoryPin, tileset?: string): void {
    const unit: RoughMemoryUnit = {
      d: prov.d, s: seed,
      ...(prov.e && prov.e !== 'normal' ? { e: prov.e } : {}),
      ...(tileset ? { t: tileset } : {}),
      ...(pin ? { g: { ...pin } } : {}),
    };
    host.drops.push({ pos, item: { kind: 'gear', item: makeMemoryItem(kind, [unit]) }, bob: bobF * Math.PI * 2, tier: host.spoilStory });
    host.lootDropCue(at, MEMORY_KINDS[kind].color);
  }

export function sceneNoteGemDrop(host:NativeSceneLootHost, gemId: string, skillRarity?: SkillInstance['rarity']): void {
    if (!host.metaProgressionActive()) return;
    if (awakenMemoryFromDrop(host.account, gemId, skillRarity)) host.accountDirty = true;
    const key = gemDropKey(gemId);
    const after = (host.account.ledger[key] ?? 0) + 1;
    host.account.ledger[key] = after;
    host.account.ledger[LEDGER_GEMDROP_TOTAL] = (host.account.ledger[LEDGER_GEMDROP_TOTAL] ?? 0) + 1;
    if (after === VENDOR_CFG.commission.need) host.accountDirty = true;
    // THE DEED GATE (LEDGER_LEGENDARY_SKILL_DROP): the account's first
    // legendary SKILL gem, stamped here at the one genuine mint chokepoint —
    // every skill-mint site hands its rarity in, so a future legendary from
    // ANY of them lands the deed. One-shot; persisted immediately (a Vault
    // row hangs on it — the flask lesson's own quit-proof precedent).
    if (skillRarity === 'legendary' && !(host.account.ledger[LEDGER_LEGENDARY_SKILL_DROP] ?? 0)) {
      host.account.ledger[LEDGER_LEGENDARY_SKILL_DROP] = 1;
      host.accountDirty = true;
    }
  }

export function sceneNoteContainerFind(host:NativeSceneLootHost, item: ItemInstance): void {
    if (!host.metaProgressionActive()) return;
    for (const def of CONTAINER_DEFS) {
      if (!def.foundLedger || !containerAccepts(def, item)) continue;
      if ((host.account.ledger[def.foundLedger] ?? 0) >= 1) continue;
      host.account.ledger[def.foundLedger] = 1;
      host.accountDirty = true;
    }
  }

export function sceneMintLootResult(host:NativeSceneLootHost, at: Vec2, result: LootResult, owed = false, from?: string | MemoryProvenance, contextZone?: Readonly<ZoneDef>): void {
    switch (result.kind) {
      // THE MEMORY LAW: a table's gem rides the drop chokepoint whole — its
      // Memory wears the PAYING body's provenance (or the caller's word).
      case 'gem': host.dropGemAt(at, undefined, owed, from, undefined, undefined, contextZone); break;
      case 'item': host.dropGearAt(at, result.item, undefined, owed, contextZone); break;
      case 'vestige': host.dropVestigeAt(at, result.id, result.count, contextZone); break;
      case 'essence': host.dropEssenceAt(at, result.gain, contextZone); break;
      case 'memoryEssence': host.dropAbilityEssenceAt(at, result.tier, result.count, Math.random, contextZone); break;
    }
  }

export function sceneShedOrb(host:NativeSceneLootHost, kind: string, at: Vec2, opts?: {
    scatter?: number; amount?: number; life?: number; homeTo?: Actor;
    /** false: keep the raw scatter point (siphon orbs fly home anyway). */
    clamp?: boolean;
    /** THE SPOILS STORY: the shedder's story (a struck body's, a breakable's
     *  own tier) — absent, the sweep reads the floor under the orb. */
    tier?: number;
  }): void {
    const def = ORB_DEFS[kind];
    if (!def || host.orbs.length >= ORB_CAP) return;
    const s = opts?.scatter ?? 0;
    const p = vec(at.x + (s ? rand(-s, s) : 0), at.y + (s ? rand(-s, s) : 0));
    const story = opts?.tier ?? host.spoilStory; // THE SPOILS STORY: the shedder's word, else the context's
    host.orbs.push({
      pos: opts?.clamp === false ? p
        : host.clampPos(p, 8, undefined, story !== undefined && story >= 1 ? { tier: story } : undefined),
      kind, amount: opts?.amount ?? orbAmount(def, host.lootLevelAt(at)),
      bob: rand(0, Math.PI * 2), life: opts?.life ?? def.life ?? 12,
      homeTo: opts?.homeTo,
      tier: story,
    });
    SIM_TAP.current?.onOrbShed?.(kind);
  }
