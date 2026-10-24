/** Native event-local kill rules and deeds over real area/campaign capabilities. */
import {DeedTracker,type DeedEvent} from './deeds';
import {COMBAT_DEEDS,DEED_CFG} from '../data/classdeeds';
import {selectContainerLoot} from '../data/containerloot';
import {rollMemoryEssenceTier} from '../data/essences';
import {chance,dist,rand,randInt,vec,type Vec2} from '../core/math';
import {mod} from './stats';
import {Actor} from './actor';
import {COMMAND_CFG} from './ai';
import {normalizeBrain} from './brain';
import {type MemoryProvenance} from './memories';
import {ABILITY_ESSENCE_CFG,ESSENCE_IDS,ESSENCE_SPILL_CFG,rollSpillPacket,spillBudget,type EssenceSpillSpec} from '../data/essences';
import {DROP_CFG,resolveLootTable,rollVestigeId} from './loot';
import {MONSTER_THEMES} from '../data/infrequents';
import {SKILLS} from '../data/skills';
import {MONSTERS} from '../data/monsters';
import {type KillCtx} from './killHandlers';
import {SUPPORTS} from '../data/supports';
import {OFFERING_CFG} from '../data/objectives';
import {sameStory} from './tiers';
import {type BountyPosting} from '../data/bountyboard';
import {Rng} from '../core/rng';
import {SPEECH_GRAMMAR_CFG} from './speechGrammar';
import type {QuickeningField} from '../packages/overlays/quickening';
import {bumpGrudge,resolveNemesisSlain,touchSaga} from '../meta/nemesis';
import {NEMESIS_RANKS} from '../data/nemesis';
import {hashStr} from './nativeSceneConfig';
import type {World,Seat} from './world';
export interface NativeSceneCombatCampaignHost {
 deedCallback<A extends unknown[],R>(hero:Actor,slot:'onLifeHealed'|'onLifeSpent',callback:(...args:A)=>R):(...args:A)=>R;
 clearDeedCallbacks(hero:Actor):void;
 abilityDropRng:World["abilityDropRng"];
 account:World["account"];
 accountDirty:World["accountDirty"];
 actorById:World["actorById"];
 actors:World["actors"];
 altars:World["altars"];
 amalgamSite:World["amalgamSite"];
 bumpDrives:World["bumpDrives"];
 charDirty:World["charDirty"];
 combatDeeds:World["combatDeeds"];
 crusadeRealmContext:World["crusadeRealmContext"];
 cull:World["cull"];
 deedActor:World["deedActor"];
 deedEnemy:World["deedEnemy"];
 deedHands:World["deedHands"];
 deedOwned:World["deedOwned"];
 descentRun:World["descentRun"];
 dropAbilityEssenceAt:World["dropAbilityEssenceAt"];
 dropAmalgamPart:World["dropAmalgamPart"];
 dropEssenceAt:World["dropEssenceAt"];
 dropGearAt:World["dropGearAt"];
 dropGemAt:World["dropGemAt"];
 dropVestigeAt:World["dropVestigeAt"];
 encounters:World["encounters"];
 events:World["events"];
 fractureRealmContext:World["fractureRealmContext"];
 grantEventKillReward:World["grantEventKillReward"];
 handSeats:World["handSeats"];
 hasDeedEnemyNearby:World["hasDeedEnemyNearby"];
 huntBeast:World["huntBeast"];
 localSeat:World["localSeat"];
 lootLevelAt:World["lootLevelAt"];
 manifest:World["manifest"];
 massRuntime:World["massRuntime"];
 meta:World["meta"];
 metaProgressionActive:World["metaProgressionActive"];
 mintLootResult:World["mintLootResult"];
 necropolisRealmContext:World["necropolisRealmContext"];
 nemesisActive:World["nemesisActive"];
 noteBountyReady:World["noteBountyReady"];
 objectiveCountable:World["objectiveCountable"];
 objectiveDone:World["objectiveDone"];
 objectiveFallAt:World["objectiveFallAt"];
 offering:World["offering"];
 openWritHand:World["openWritHand"];
 player:World["player"];
 provenanceOf:World["provenanceOf"];
 questLedgerOf:World["questLedgerOf"];
 realmContext:World["realmContext"];
 recordDeed:World["recordDeed"];
 recordSelfDamage:World["recordSelfDamage"];
 rollAbilityEssenceDrop:World["rollAbilityEssenceDrop"];
 sagaDirty:World["sagaDirty"];
 seatKillTally:World["seatKillTally"];
 seatKills:World["seatKills"];
 seatOfRoot:World["seatOfRoot"];
 sim:World["sim"];
 slainLog:World["slainLog"];
 spoilStory:World["spoilStory"];
 spoilsSealed:World["spoilsSealed"];
 text:World["text"];
 time:World["time"];
 withQuestHand:World["withQuestHand"];
 zone:World["zone"];
}

export function sceneGrantEventKillReward(host:NativeSceneCombatCampaignHost,ctx: KillCtx, r: {
    base: number; mul?: number; gems: number; msg: string;
    color?: string; lift?: number;
  }): void {
    const mul = r.mul ?? 1;
    ctx.grantXp(Math.round((r.base + ctx.zone.level * 52) * mul));
    for (let i = 0; i < r.gems; i++) ctx.dropGemAt(ctx.actor.pos);
    ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - (r.lift ?? 58)),
      r.msg, r.color ?? '#ffd700', 20);
  }

export function sceneRollDrops(host:NativeSceneCombatCampaignHost,actor: Actor): void {
    // THE SPOILS LAW: sealed ground mints nothing — no tables, no gem
    // trickle, no vestige shed (XP + orbs were already paid upstream in
    // kill(); the primitives below each re-check, this is the cheap out).
    if (host.spoilsSealed()) return;
    const def = actor.defId ? MONSTERS[actor.defId] : undefined;
    const rewardLevel = host.lootLevelAt(actor.pos);
    const lootZone = host.massRuntime?.config.progression ? { ...host.zone, level: rewardLevel } : host.zone;
    if (def?.containerLoot) {
      const table = def.loot ?? selectContainerLoot(def.containerLoot, lootZone);
      for (const result of resolveLootTable(table, { ilvl: rewardLevel, sourceId: actor.defId })) {
        host.mintLootResult(actor.pos, result, false, host.provenanceOf(actor));
      }
      return; // the declared container recipe replaces all ordinary kill trickles
    }
    // RICH GROUND: the zone's BOUNTY lever (ZoneDef.bounty, default 1) scales
    // the kill-path CHANCE gates — never the guaranteed paths (boss tables,
    // per-monster hoards, elite bonus rolls). A Holdfast pocket's earned haul,
    // a gilded event's field — one zone-level multiplier, pure data. THE
    // QUICKENING folds in LIVE (never stamped): quick ground pays richer for
    // exactly as long as the window holds, and the def's own bounty survives
    // untouched underneath.
    const bounty = (host.zone.bounty ?? 1)
      * (host.sim.overlayFor<QuickeningField>('quickening', host.zone.dimension)?.bountyMulAt(host.zone.id) ?? 1);
    // THE MEMORY LAW (2026-09-12): every gem this kill lets FALL — the chance
    // trickle, a per-def count, a boss's guarantee — rides dropGemAt whole,
    // which decides memory-vs-bare off the sealed seed at
    // GEM_DROP_CFG.memoryShare and the pouch kind at preformedShare (no draw
    // of its own — the stream is byte-identical whatever either dial says;
    // the seeded sim's determinism is construction, not luck; probe-pinned).
    // The provenance is THIS body: its def id (the kit lean at the recall —
    // kill what you want to learn) and its rolled elite tier (the tier lean).
    let count: number;
    if (def?.drops !== undefined) count = def.drops;
    else if (def?.boss) count = DROP_CFG.bossGemDrops;
    else count = Math.random() < DROP_CFG.killGemChance * bounty ? 1 : 0;
    const prov = host.provenanceOf(actor);
    for (let i = 0; i < count; i++) host.dropGemAt(actor.pos, def?.gemBias, false, prov);
    // GEAR: loot tables. Per-monster hoard > boss table > chance-gated world
    // table; elite leaders add bonus rolls (crowned promote to the apex table).
    // CARRIED GEAR (the Hollowborn) REPLACES the base branch outright: the
    // body drops exactly what it walked in wearing — what you saw is what
    // you get, never a second roll on top. Elite bonus rolls stay (that
    // layer rewards the TIER, not the body).
    const tables: string[] = [];
    if (actor.carriedGear) host.dropGearAt(actor.pos, actor.carriedGear);
    else if (def?.loot) tables.push(def.loot);
    else if (def?.boss) tables.push(DROP_CFG.bossTable);
    else if (chance(DROP_CFG.killItemChance * bounty)) tables.push(DROP_CFG.killTable);
    const tier = actor.rarity ?? 'normal';
    const bonus = DROP_CFG.eliteBonusItemRolls[tier] ?? 0;
    for (let i = 0; i < bonus; i++) tables.push(DROP_CFG.eliteBonusTable[tier]);
    // MONSTER INFREQUENT theme: per-def declaration wins, else the registry.
    const miTheme = def?.infrequentTheme ?? (actor.defId ? MONSTER_THEMES[actor.defId] : undefined);
    for (const t of tables) {
      for (const res of resolveLootTable(t, { ilvl: rewardLevel, miTheme })) {
        host.mintLootResult(actor.pos, res, false, host.provenanceOf(actor));
      }
    }
    // VESTIGES shed on their own low chance — the socket economy's trickle.
    if (chance(DROP_CFG.vestigeChance * bounty)) {
      const vid = rollVestigeId();
      if (vid) host.dropVestigeAt(actor.pos, vid);
    }
    // ABILITY ESSENCES — the skill-food trickle (zone-floored, tier-graded).
    host.rollAbilityEssenceDrop(actor.pos, bounty);
  }

export function sceneProvenanceOf(host:NativeSceneCombatCampaignHost,actor: Actor | null | undefined): MemoryProvenance | undefined {
    if (!actor?.defId) return undefined;
    return actor.rarity ? { d: actor.defId, e: actor.rarity } : { d: actor.defId };
  }

export function sceneNoteSeatKill(host:NativeSceneCombatCampaignHost,killer: Actor | undefined): void {
    const seat = host.seatOfRoot(killer);
    if (seat) host.seatKillTally.set(seat, host.seatKills(seat) + 1);
  }

export function sceneNoteSlain(host:NativeSceneCombatCampaignHost,defId: string): void {
    host.slainLog.push({ defId, at: host.time });
    while (host.slainLog.length > SPEECH_GRAMMAR_CFG.slainKeep) host.slainLog.shift();
  }

export function sceneNoteNemesisKill(host:NativeSceneCombatCampaignHost,victim: Actor): void {
    if (!host.localSeat || !host.nemesisActive()) return;
    const saga = touchSaga(host.account, host.meta.name);
    if (victim.faction && victim.team === 'enemy' && !victim.owner) {
      bumpGrudge(saga, victim.faction);
      host.sagaDirty();
    }
    const tag = victim.nemesis;
    if (!tag) return;
    const holder = host.account.sagas[tag.sagaKey];
    if (!holder) return;
    const rec = holder.nemeses.find(n => n.id === tag.id);
    const fate = resolveNemesisSlain(holder, tag.id, Math.random);
    if (fate === 'cheated') {
      host.text(vec(victim.pos.x, victim.pos.y - 30), `${victim.name} will not die so easily…`, tag.tint, 15);
      host.events.emit('nemesis/slain', { saga: tag.sagaKey, nemesis: victim.name, cheated: true });
    } else if (fate === 'slain') {
      const rank = NEMESIS_RANKS[Math.max(0, Math.min(rec?.rank ?? 0, NEMESIS_RANKS.length - 1))];
      for (let i = 0; i < rank.gemDrops; i++) host.dropGemAt(victim.pos, undefined, false, host.provenanceOf(victim));
      host.text(vec(victim.pos.x, victim.pos.y - 30), `The grudge dies with ${victim.name}.`, '#ffd700', 16);
      host.events.emit('nemesis/slain', { saga: tag.sagaKey, nemesis: victim.name, cheated: false });
    }
    host.sagaDirty(true);
  }

export function sceneOnSquadDeath(host:NativeSceneCombatCampaignHost,actor: Actor): void {
    // SOVEREIGNTY: census — squad bookkeeping (the derived census, probe_tiers RIG T).
    for (const a of host.actors) {
      if (a.dead || a === actor || a.team !== actor.team || !a.brain) continue;
      // THE FEAR THAT SPREADS (DriveSpec.onAllyDeath): a squadmate falling
      // in earshot jumps the witnesses' meters — dread down a goblin line.
      if (actor.squadId !== undefined && a.squadId === actor.squadId
        && dist(a.pos, actor.pos) <= COMMAND_CFG.earshot) {
        host.bumpDrives(a, 'onAllyDeath');
      }
      const spec = normalizeBrain(a.brain).base;
      if (actor.squadLeader && actor.squadId !== undefined && a.squadId === actor.squadId) {
        const react = spec.squad?.onLeaderDeath;
        if (react === 'scatter') {
          a.aiMoraleUntil = Math.max(a.aiMoraleUntil, host.time + rand(3, 5));
          host.text(vec(a.pos.x, a.pos.y - 18), '!!', '#e8d44a', 13);
        } else if (react === 'frenzy') {
          a.addBuff({
            type: 'buff', id: 'leader_frenzy', duration: 8,
            mods: [
              mod('damage', 'more', 0.25),
              mod('attackSpeed', 'more', 0.3),
              mod('moveSpeed', 'more', 0.3),
            ],
          });
        }
      }
      const p = spec.morale?.panicOnAllyDeath;
      if (p && dist(a.pos, actor.pos) <= p.radius && Math.random() < (p.chance ?? 1)) {
        a.aiMoraleUntil = Math.max(a.aiMoraleUntil, host.time + p.duration);
        host.text(vec(a.pos.x, a.pos.y - 18), '!!', '#e8d44a', 13);
      }
    }
  }

export function sceneFeedEncounters(host:NativeSceneCombatCampaignHost,actor: Actor): void {
    for (const e of host.encounters) {
      if (e.phase !== 'open') continue;
      const member = e.spawned.has(actor.id) || dist(actor.pos, e.pos) - actor.radius <= e.radius;
      if (!member) continue;
      e.kills++;
      if (e.bonusUsed < e.scale.maxBonusTime) {
        const add = Math.min(e.def.timePerKill, e.scale.maxBonusTime - e.bonusUsed);
        e.timer = Math.min(e.maxTimer, e.timer + add);
        e.bonusUsed += add;
      }
      // THE WANING LAW's tell: the moment the well runs dry, say so once —
      // from here no clearing rate holds the door; the clock only falls.
      if (!e.waned && e.def.timePerKill > 0 && e.bonusUsed >= e.scale.maxBonusTime) {
        e.waned = true;
        if (e.def.waneText) host.text(vec(e.pos.x, e.pos.y - 30), e.def.waneText, e.def.trigger.color, 16);
      }
      e.radius = Math.min(e.scale.maxRadius, e.radius + e.def.radiusPerKill);
      break; // one breach per kill
    }
  }

export function sceneBindCombatDeeds(host:NativeSceneCombatCampaignHost): void {
    if (host.deedActor === host.player) return;
    if (host.deedActor) {
      host.clearDeedCallbacks(host.deedActor);
    }
    host.combatDeeds.reset();
    const hero = host.deedActor = host.player;
    hero.onLifeSpent = host.deedCallback(hero, 'onLifeSpent', amount => host.recordSelfDamage(hero, amount));
    // Observe immediately, before another hit can change the wound budget.
    hero.onLifeHealed = host.deedCallback(hero, 'onLifeHealed', (amount, silent) => {
      if (hero !== host.player || !host.metaProgressionActive()) return;
      const mended = host.combatDeeds.heal(amount);
      if (!silent && mended > 0) host.recordDeed({ kind: 'heal', value: mended });
      if (host.combatDeeds.recovered(hero.life, hero.maxLife(), DEED_CFG.crisisRecover)) host.recordDeed({ kind: 'crisis' });
    });
  }

export function sceneRecordDeed(host:NativeSceneCombatCampaignHost,event: DeedEvent): void {
    if (host.metaProgressionActive() && host.combatDeeds.record(host.account.ledger, event, host.time)) host.accountDirty = true;
  }

export function sceneRecordIndirectDamage(host:NativeSceneCombatCampaignHost,target: Actor, source: Actor | undefined, before: number): void {
    if (!source || !host.deedOwned(source) || !host.deedEnemy(target)) return;
    const value = Math.max(0, before - Math.max(0, target.life));
    if (value > 0) host.recordDeed({ kind: 'indirect', value });
  }

export function sceneRecordSelfDamage(host:NativeSceneCombatCampaignHost,hero: Actor, amount: number): void {
    if (hero !== host.player || hero.dead || !host.metaProgressionActive()
      || !host.hasDeedEnemyNearby() || amount <= 0) return;
    host.recordDeed({ kind: 'indirect', value: amount });
  }

export function sceneBankEssenceSpill(host:NativeSceneCombatCampaignHost,target: Actor, spill: EssenceSpillSpec, dealt: number): void {
    target.spillBank += dealt;
    if (target.essenceSpilled >= spillBudget(spill)) return;
    if (host.time - target.lastEssenceSpillAt < (spill.cooldown ?? ESSENCE_SPILL_CFG.cooldown)) return;
    const threshold = Math.max(1, target.maxLife() * (spill.per ?? ESSENCE_SPILL_CFG.perLifeLost));
    if (target.spillBank < threshold) return;
    target.spillBank -= threshold;
    target.essenceSpilled++;
    target.lastEssenceSpillAt = host.time;
    const prevSpoil = host.spoilStory;
    host.spoilStory = target.tier; // THE SPOILS STORY: the trail lies on the bleeder's story
    host.dropEssenceAt(target.pos, rollSpillPacket(target.level, spill));
    host.spoilStory = prevSpoil;
  }

export function sceneDeedEnemy(host:NativeSceneCombatCampaignHost,a: Actor): boolean {
    return a.team === 'enemy' && !a.passive && !a.noBounty && !a.invulnerable
      && !(a.defId && MONSTERS[a.defId]?.immortal);
  }

export function sceneDeedOwned(host:NativeSceneCombatCampaignHost,a: Actor): boolean {
    return a === host.player || a.ownedBy(host.player);
  }

export function sceneHasDeedEnemyNearby(host:NativeSceneCombatCampaignHost): boolean {
    return host.actors.some(a => !a.dead && a.life > 0 && host.deedEnemy(a)
      && sameStory(a, host.player) && dist(a.pos, host.player.pos) <= DEED_CFG.combatRadius);
  }

export function sceneRollAbilityEssenceDrop(host:NativeSceneCombatCampaignHost,at: Vec2, bounty: number): void {
    const cfg = ABILITY_ESSENCE_CFG;
    const rng = host.abilityDropRng ??= new Rng((host.manifest.seed ^ hashStr('abilitytrickle')) >>> 0);
    if (!rng.chance(cfg.killChance * bounty)) return;
    const tier = rollMemoryEssenceTier(host.lootLevelAt(at), () => rng.next());
    if (tier !== null) host.dropAbilityEssenceAt(at, tier, rng.int(cfg.count[0], cfg.count[1]), () => rng.next());
  }

export function sceneDropAmalgamPart(host:NativeSceneCombatCampaignHost,af: NonNullable<World['sim']['amalgamationField']>, partId: string, at: Vec2, from?: MemoryProvenance): void {
    if (host.spoilsSealed()) return; // THE SPOILS LAW — a part's built spoil is a mint too
    const part = af.partById(partId);
    if (!part) return;
    const lvl = Math.max(1, 1 + Math.floor(host.zone.level / 4));
    if (part.drop.skill && SKILLS[part.drop.skill]) {
      host.dropGemAt(at, undefined, false, from, undefined, { k: 'skill', id: part.drop.skill, r: 'rare', l: lvl });
    }
    if (part.drop.support && SUPPORTS[part.drop.support]) {
      host.dropGemAt(at, undefined, false, from, undefined, { k: 'support', id: part.drop.support, l: 1 });
    }
    for (let i = 0; i < (part.drop.gems ?? 0); i++) host.dropGemAt(at, undefined, false, from);
  }

export function sceneDeedHands(host:NativeSceneCombatCampaignHost,author?: Actor | null): Seat[] {
    if (!host.localSeat.keeper) return [host.localSeat];
    const out: Seat[] = [];
    const own = host.seatOfRoot(author);
    if (own && !own.keeper && !own.merc) out.push(own);
    for (const s of host.handSeats()) if (!out.includes(s)) out.push(s);
    return out;
  }

export function sceneOpenWritHand(host:NativeSceneCombatCampaignHost,kind: 'cull' | 'gather', author: Actor | null): { seat: Seat; p: BountyPosting } | null {
    for (const seat of host.deedHands(author)) {
      const p = host.questLedgerOf(seat).hands.find(h => h.kind === kind && h.zoneId === host.zone.id
        && (kind === 'cull' ? !!h.cull && h.cull.claimed < h.cull.count : !!h.gather && h.gather.claimed < h.gather.count));
      if (p) return { seat, p };
    }
    return null;
  }

export function createNativeCombatDeeds():World["combatDeeds"] { return new DeedTracker(COMBAT_DEEDS); }

export function createNativeWorldKillRules(host:NativeSceneCombatCampaignHost):World["worldKillRules"] { return [
    // GILDED ALTARS (AltarDef.killGems): a death INSIDE any gem-spilling
    // altar's field pays out — credited or not (the field rewards blood,
    // not authorship; a storm-bolt kill under a gilded altar is the jackpot
    // the two rows earn together).
    {
      id: 'altar_kill_gems',
      when: ctx => ctx.actor.team === 'enemy' && host.altars.some(al =>
        al.def.killGems && dist(ctx.actor.pos, al.pos) - ctx.actor.radius <= al.def.radius),
      run: ctx => {
        for (const al of host.altars) {
          const kg = al.def.killGems;
          if (!kg || dist(ctx.actor.pos, al.pos) - ctx.actor.radius > al.def.radius) continue;
          if (rand(0, 1) >= kg.chance) continue;
          const n = randInt(kg.count[0], kg.count[1]);
          for (let k = 0; k < n; k++) ctx.dropGemAt(ctx.actor.pos);
          ctx.flash(ctx.actor.pos, 40, al.def.color, 0.4);
        }
      },
    },
    // THE OFFERING (kind 'offering'): any death inside the hungering altar's
    // field feeds it — credited or not, ambient or not. A migration herd
    // stampeding through, a warband brawl, the storm altar's own bolts: the
    // altar cares only that blood fell inside the light.
    {
      id: 'offering_altar_feed',
      when: ctx => {
        const of = host.offering;
        if (!of || host.objectiveDone || ctx.actor.team !== 'enemy') return false;
        const al = host.altars[of.altarIdx];
        return !!al && of.offered < of.need
          && dist(ctx.actor.pos, al.pos) - ctx.actor.radius <= al.def.radius;
      },
      run: ctx => {
        const of = host.offering!;
        const al = host.altars[of.altarIdx];
        of.offered = Math.min(of.need, of.offered + 1);
        ctx.flash(al.pos, 54, OFFERING_CFG.accent, 0.4);
        ctx.text(vec(al.pos.x, al.pos.y - 26),
          `the altar feeds — ${of.offered}/${of.need}`, OFFERING_CFG.accent, 13);
      },
    },
    // THE CULL (kind 'clear'): every counted body that falls feeds the tally
    // — any hand, credited or not (a faction brawl does your work; the
    // writ's honesty). The predicate is the SAME one countedEnemies runs
    // (objectiveCountable), so the scoreboard and the empty-floor rule can
    // never disagree about who counts. Deliberately silent per kill — the
    // commonest objective must not floater-spam; the HUD line is the
    // scoreboard, and completeObjective is the one loud beat.
    // XP BY PLACE (a hosted world): the field's last counted fall is where a zone's
    // objective was last worked (objectivePlaces' fallback when no fixture names one).
    {
      id: 'objective_fall_place',
      when: ctx => !!host.localSeat.keeper && host.objectiveCountable(ctx.actor),
      run: ctx => { host.objectiveFallAt = { zone: host.zone.id, pos: vec(ctx.actor.pos.x, ctx.actor.pos.y) }; },
    },
    {
      id: 'clear_cull_tally',
      when: ctx => !!host.cull && !host.objectiveDone
        && host.zone.objective.kind === 'clear' && host.objectiveCountable(ctx.actor),
      run: () => {
        const cu = host.cull!;
        cu.kills = Math.min(cu.need, cu.kills + 1);
      },
    },
    // THE CULL's claim (bounty board M1): a felled mark credits the held
    // posting targeting THIS zone — the ledger rides the POSTING itself
    // (readable from anywhere, wipe-proof; the mixed-lane guard keeps
    // every mark here the posting's own). Any hand's kill counts — the
    // writ's honesty; the per-mark XP beat still rides the shared
    // 'bounty_writ_claim' row in data/bounties.ts.
    {
      id: 'bounty_cull_claim',
      tag: 'bounty_mark',
      // THE CHARACTER'S QUESTS: the killer's own open cull here first, then any hand's.
      when: ctx => host.openWritHand('cull', ctx.killer) !== null,
      run: ctx => {
        const h = host.openWritHand('cull', ctx.killer);
        if (!h) return;
        host.withQuestHand(h.seat, () => {
          h.p.cull!.claimed++;
          host.charDirty = true;
          host.noteBountyReady(h.p); // THE READINESS LAW's one announce site
        });
      },
    },
    // DESCENT — THE DEEP LEDGER: a slain brood-member banks essence UNITS
    // (payoutPerKill × the depth multiplier) into the dive's haul; each
    // whole unit mints a PACKET whose tint climbs the payout rung ladder at
    // the CURRENT depth (the essence-spill tierRungs grammar on the depth
    // axis — deep kills pay deep tints). Scoped by the surge's own faction,
    // never a literal; the haul lands in the seats' real wallets on
    // resurface (× keptOnDeath).
    {
      id: 'descent_depthkin',
      when: ctx => !!host.descentRun && ctx.credit
        && ctx.actor.faction === ctx.sim.descentField?.surge().faction,
      run: ctx => {
        const dr = host.descentRun;
        const cfg = ctx.sim.descentField?.surge();
        if (dr && cfg) {
          dr.haulBank += cfg.payoutPerKill * (1 + dr.depth * cfg.payoutDepthBonus);
          while (dr.haulBank >= 1) {
            dr.haulBank -= 1;
            let tier = 0;
            for (const rung of cfg.payoutTierRungs) {
              if (dr.depth < rung.atDepth || Math.random() >= rung.chance) break;
              tier = Math.min(tier + 1, ESSENCE_IDS.length - 1);
            }
            const id = ESSENCE_IDS[tier];
            dr.haul[id] = (dr.haul[id] ?? 0) + 1;
          }
        }
        ctx.bumpLedger('depthkin_slain');
      },
    },
    // THE HUNT: the great beast falls (you ran it down — or out-DPSed a flee).
    // Big payout + the ledger that gates the package tiers (whoever lands it).
    {
      id: 'hunt_beast',
      tag: 'hunt_beast',
      run: ctx => {
        ctx.sim.huntField?.endHunt();
        if (host.huntBeast === ctx.actor) host.huntBeast = null;
        ctx.bumpLedger('hunt_beasts_slain');
        ctx.bumpLedger('hunt_seen');
        host.grantEventKillReward(ctx, {
          base: 300, gems: 5,
          msg: `${ctx.actor.name} is slain — the hunt is won!`,
        });
      },
    },
    // The Balor in its home realm — felling it repels the OVERWORLD invasion it
    // spawned from (off-graph), for the biggest, stage-scaled spoils. The deep
    // risk/reward payoff for letting the invasion fester to a portal.
    {
      id: 'balor_realm',
      tag: 'balor_realm',
      run: ctx => {
        const rctx = host.realmContext;
        host.realmContext = null;
        // The realm could have been entered from any dimension's invasion —
        // resolve on the owner (non-owners no-op on an unknown id).
        if (rctx) for (const f of ctx.sim.demonFieldsAll()) f.resolveInvasionById(rctx.invId);
        const mul = rctx?.rewardMul ?? 1;
        ctx.bumpLedger('demon_invasions_repelled');
        ctx.bumpLedger('balor_slain');
        host.grantEventKillReward(ctx, {
          base: 300, mul, gems: 3 + Math.floor(mul), lift: 56,
          msg: `The demon realm is purged! (×${mul.toFixed(1)} spoils)`,
        });
      },
    },
    // The Crusade LEADER in its sanctum — felling it COLLAPSES the whole crusade
    // (every held zone reverts), for the fattest, network-scaled spoils.
    {
      id: 'crusade_leader',
      tag: 'crusade_leader',
      run: ctx => {
        const rctx = host.crusadeRealmContext;
        host.crusadeRealmContext = null;
        const mul = rctx ? (ctx.sim.crusadeField?.resolveCrusade(rctx.crusadeId) ?? 1) : 1;
        ctx.bumpLedger('crusade_leaders_slain');
        host.grantEventKillReward(ctx, {
          base: 320, mul, gems: 3 + Math.floor(mul), lift: 56,
          msg: `The Crusade is broken! (×${mul.toFixed(1)} spoils)`,
        });
      },
    },
    // THE NECROPOLIS BONELORD (the uber) — purging it DISPERSES every active tide
    // and refreshes the whole cycle, for the combined-event spoils. The climax of
    // letting two Deadwakes fuse and chasing the travelling seat down.
    {
      id: 'necropolis_boss',
      tag: 'necropolis_boss',
      run: ctx => {
        const rctx = host.necropolisRealmContext;
        // The seat is DEFEATED — it holds + stops generating, but only fully crumbles
        // (the tides disperse, the icon vanishes, the cycle resets) when the player
        // LEAVES its halls (handled in loadZone). The spoils land now, for the kill.
        const defeated = ctx.sim.deadwakeField?.markNecropolisDefeated() ?? false;
        if (defeated) ctx.bumpLedger('necropolis_purged');
        const rr = rctx?.reward;
        if (rr) {
          ctx.grantXp(Math.round(rr.xpBase + ctx.zone.level * rr.xpPerLevel));
          for (let i = 0; i < rr.gems; i++) ctx.dropGemAt(ctx.actor.pos);
        }
        // The reward is CONSUMED (sibling handlers' symmetry) — the crumble-on-
        // leave rides the overlay's defeated flag, not this context.
        host.necropolisRealmContext = null;
        ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 58),
          defeated ? 'The Bonelord falls — leave the Necropolis and the cycle breaks anew!' : 'The Bonelord falls!',
          '#f0e8cc', 20);
      },
    },
    // THE FRACTURE CAPSTONE BOSS in its reward rift — felling it claims the
    // realm-scale spoils (the climax of running a full max-span fracture chain).
    {
      id: 'fracture_boss',
      tag: 'fracture_boss',
      run: ctx => {
        const rctx = host.fractureRealmContext;
        host.fractureRealmContext = null;
        ctx.sim.fractureField?.consumeRift(); // the rift is spent — stop re-materializing it
        const mul = rctx?.rewardMul ?? 1.5;
        ctx.bumpLedger('fracture_boss_slain');
        host.grantEventKillReward(ctx, {
          base: 300, mul, gems: 3 + Math.floor(mul),
          msg: `The ${rctx?.variant ?? 'fracture'} rift collapses! (×${mul.toFixed(1)} spoils)`,
          color: rctx?.color,
        });
      },
    },
    // AMALGAMATION: the assembled boss falls — claim the part-themed spoils you
    // BUILT, bank the completion (a future Uber-Bonewright seam), and the
    // Bonewright fades, to re-appear uncharted somewhere new on a later roll.
    {
      id: 'amalgam_boss',
      tag: 'amalgam_boss',
      run: ctx => {
        const af = ctx.sim.amalgamationField;
        const info = af ? af.peek() : null;
        ctx.bumpLedger('amalgamations_completed');
        const cfg = af?.surge();
        if (cfg) {
          ctx.grantXp(Math.round(cfg.bossReward.xpBase + ctx.zone.level * cfg.bossReward.xpPerLevel));
          for (let i = 0; i < cfg.bossReward.gems; i++) ctx.dropGemAt(ctx.actor.pos);
          if (af && info) for (const pid of info.chosenParts) host.dropAmalgamPart(af, pid, ctx.actor.pos, host.provenanceOf(ctx.actor));
        }
        af?.endAmalgamation();
        // The Bonewright was untargetable (it never died in the fight) — despawn it
        // now so the site is gone and a fresh one can re-open uncharted later.
        if (host.amalgamSite) {
          const necro = host.actorById(host.amalgamSite.necroId);
          if (necro) { const i = host.actors.indexOf(necro); if (i >= 0) host.actors.splice(i, 1); }
          host.amalgamSite = null;
        }
        ctx.flash(ctx.actor.pos, 170, '#9ad0b0', 0.9);
        ctx.text(vec(ctx.actor.pos.x, ctx.actor.pos.y - 58),
          'The Amalgamation falls — the Bonewright fades, its study complete.', '#ffd700', 18);
      },
    },
  ]; }

export function createNativeRouseRules(host:NativeSceneCombatCampaignHost):World["rouseRules"] { return {
    // A ritual cultist turns once wounded past the rouse threshold — and only
    // that one (its kin keep the rite going). Fires whoever struck it.
    ritual_cultist: () => {
      const rf = host.sim.conclaveField?.surge().ritual;
      return rf ? { woundFrac: rf.rouseFrac, radius: 0, toast: 'The cultist turns on you!', color: '#d85a6a', size: 13 } : null;
    },
    // Striking a herd member PROVOKES the whole local herd — the adults turn
    // and gore, the young keep fleeing (their flee brain).
    migrant: () => {
      const mf = host.sim.migrationField;
      return mf ? { woundFrac: 1, radius: mf.surge().rouseRadius, toast: 'The herd turns — the adults charge!', color: '#d8a24a', size: 14 } : null;
    },
    // (Holdfast guardian tags resolve GENERICALLY in rouseOnWound — the live
    // site's GuardianSpec carries the wound/radius knobs for ANY guardian def,
    // so no per-tag row can rot here as new tolls join the registry.)
    // Neutral HUMANS on the roads: strike one and the nearby band answers —
    // hunters draw bows, pilgrims scatter (their morale). They forgive
    // (NEUTRAL_RESET) once you break off.
    wayfarer: () => ({
      woundFrac: 1, radius: 260,
      toast: 'The wayfarers cry out!', color: '#d8c08a', size: 13,
    }),
    // A WARY extraction leaver: it was going home, but a wound on the way out
    // turns it for good (no reset row — the grudge latches; its 'resolute'
    // sibling tag has NO rouse rule and never wakes: it keeps walking).
    extraction_leaver: () => ({
      woundFrac: 1, radius: 0,
      toast: 'It rounds on you!', color: '#a5e3b4', size: 13,
    }),
    // The settled belt's POSTED WATCH (village wardens — the sentry fabric's
    // civil face): strike one and the local watch answers together; they
    // forgive (NEUTRAL_RESET row registered beside the tag, data/settled.ts)
    // once you break off — a watchman holds a grudge only as long as you do.
    freehold_watch: () => ({
      woundFrac: 1, radius: 300,
      toast: 'The watch turns out!', color: '#d8c08a', size: 13,
    }),
    // The harborhold's SIEGE-CAMP WATCH (world/harborholds.ts): strike one
    // and the camp answers together — texture with teeth, not the muster
    // itself (the horn stays the event; these are its sleeping edge).
    hold_camp: () => ({
      woundFrac: 1, radius: 240,
      toast: 'The camp stirs!', color: '#e8a050', size: 13,
    }),
  }; }
