import type { Actor } from './actor';
import type { World } from './world';
import { OdysseyRisings } from './odysseyRisings';
import { issueCommand } from './ai';
import { angleDiff, angleTo, dist, vec } from '../core/math';
import { START_ZONE } from '../data/zones';
import { MONSTERS } from '../data/monsters';
import { odysseyMilestoneKey } from '../data/powerProgression';
import { ORACLE_RESCUED } from '../data/oracle';
import { QUESTS } from '../quests/defs';
import { revengeFactionOf, revengeCullId, revengeCommanderId, oracleCommanderId } from '../quests/revenge';
import { ODYSSEY_CFG as C, ODYSSEY_SURVEY, ODYSSEY_TUTORIAL_RELEASE, odysseyFaction, odysseyQuestId } from '../data/odyssey';
import { odysseyPressureInterval, odysseyTierValue } from '../data/odysseyPressure';
import { odysseyPressureTier, retimeOdysseyPressure } from '../world/odysseyPressure';
import { newOdyssey, restoreOdyssey, defeatOdysseyLeader, clearDormantOdysseyPressure, odysseyAct, odysseyReadiness, odysseySurvives,
  type OdysseyState, type OdysseyBody } from '../world/odyssey';

/** Host-owned campaign state; bodies use ordinary combat, collision and flee AI.
 * Pressure bodies have their own exact save rows, never duplicate zone memory. */
export class OdysseyRuntime {
  state: OdysseyState | undefined;
  private scoutActor?: Actor;
  private bodies = new Map<string, Actor>();
  private readonly risings: OdysseyRisings;
  constructor(private readonly w: World) { this.risings = new OdysseyRisings(w); }

  restore(raw: OdysseyState | undefined): void {
    this.risings.clear();
    this.state = restoreOdyssey(raw, this.w.manifest.seed, this.w.account.ledger);
    this.recordPowerMilestones();
    this.scoutActor = undefined; this.bodies.clear();
  }
  snapshot(): OdysseyState | undefined {
    this.capture();
    return this.state ? structuredClone(this.state) : undefined;
  }
  private tell(line: string): void { this.w.notice(line, '#6ad8c0', 17, 'world'); }
  private dirty(): void { this.w.markMetaDirty(this.w.localSeat); }

  /** Validated saved receipts also upgrade existing live campaigns. Never infer
   * depth from account faction totals: two first victories are not stage two. */
  private recordPowerMilestones(): void {
    if (!this.state || !this.w.metaProgressionActive()) return;
    for (let stage = 1; stage <= odysseyAct(this.state); stage++) {
      const key = odysseyMilestoneKey(stage);
      if (this.w.account.ledger[key]) continue;
      this.w.account.ledger[key] = 1;
      this.w.accountDirty = true;
    }
  }

  update(): void {
    const w = this.w;
    if (w.clientActionHook || w.scene || !w.player || w.player.dead || w.player.downed) { this.risings.clear(); return; }
    // A safe off-world arena is not a new journey. Real runs begin in Lastlight
    // or resume in the field; the tutorial has stamped its faction by then.
    if (!this.state && w.zone.id !== START_ZONE && w.zone.objective.kind === 'safe') return;
    const s = this.state ??= newOdyssey(w.manifest.seed, w.account.ledger);
    if (!s.initialized) {
      w.questRescues.reconcile();
      s.initialized = true;
      for (const id of s.roster) {
        w.enrollOdysseyQuest(QUESTS[odysseyQuestId(id, 'operation')], false);
        w.enrollOdysseyQuest(QUESTS[odysseyQuestId(id, 'leader')], false);
      }
      if (!w.account.ledger[ORACLE_RESCUED]) {
        const revenge = revengeFactionOf(w.account.ledger);
        w.enrollOdysseyQuest(QUESTS[revengeCullId(revenge)], true);
        w.enrollOdysseyQuest(QUESTS[revengeCommanderId(revenge)], false);
        this.tell('Your old enemy holds the Oracle captive. Follow the old-road lead, or find the commander’s camp.');
      }
      this.reconcileGrounds();
      this.tell('Your Odyssey has four leaders. Explore their operations or seek leads from the Quartermaster. Choose any pursuit in the quest journal.');
      this.dirty();
    }
    // Older initialized campaigns may predate the rescue lead. Enrollment is
    // idempotent and preserves any existing target, directions and progress.
    if (!w.account.ledger[ORACLE_RESCUED]) {
      const revenge = revengeFactionOf(w.account.ledger);
      w.enrollOdysseyQuest(QUESTS[revengeCullId(revenge)], true);
      w.enrollOdysseyQuest(QUESTS[revengeCommanderId(revenge)], false);
    }
    // One commander opportunity per life: rescue OR remembrance, never both.
    const rescuedThisLife = !!w.ledger[ORACLE_RESCUED] || !!w.ledger.revenge_taken
      || w.activeQuests.some(a => !!QUESTS[a.questId]?.rescue)
      || [...w.completedQuests].some(id => !!QUESTS[id]?.rescue);
    if (w.account.ledger[ORACLE_RESCUED] && !rescuedThisLife) {
      w.enrollOdysseyQuest(QUESTS[oracleCommanderId(revengeFactionOf(w.account.ledger))], true);
    }
    // Discover the operation by walking it; local faction kills and the giver
    // are independent ways to learn its target before reaching it.
    for (const id of s.roster) {
      if (w.zone.id === `quest_${odysseyQuestId(id, 'operation')}`) this.reveal(id);
    }
    clearDormantOdysseyPressure(s);
    this.updateScouts(); this.updateSiege(); this.risings.update(s); this.capture();
  }

  /** The giver recognizes existing opportunities; never mints a second target. */
  hasLocalLeads(): boolean { return !!this.state && this.state.leads.length < this.state.roster.length; }
  localLeads(): void {
    const s = this.state;
    if (!s) return;
    for (const id of s.roster) this.reveal(id);
    this.revealRevenge();
  }
  private revealRevenge(): void {
    this.w.learnQuestDirections(`quest_${revengeCommanderId(revengeFactionOf(this.w.account.ledger))}`);
  }
  reveal(id: string): void {
    const s = this.state;
    if (!s || s.leads.includes(id) || !s.roster.includes(id)) return;
    s.leads.push(id);
    for (const step of ['operation', 'leader'] as const) {
      this.w.learnQuestDirections(`quest_${odysseyQuestId(id, step)}`);
    }
    const f = odysseyFaction(id);
    if (id === revengeFactionOf(this.w.account.ledger)) this.revealRevenge();
    this.tell(`${f.name}: ${f.operation} to remove the leader's escort, or pursue ${f.leaderName} directly. Bearings on your map point toward their country.`);
    this.dirty();
  }

  questCompleted(questId: string): void {
    const w = this.w, s = this.state;
    if (!s) return;
    if (questId === revengeCullId(revengeFactionOf(w.account.ledger))) {
      this.revealRevenge(); this.reveal(revengeFactionOf(w.account.ledger));
    }
    if (questId === ODYSSEY_SURVEY) {
      s.surveyDone = true;
      this.tell('The signal is charted. The four fragments agree on its bearing. Your preparations stand; the final undertaking is still to come.');
    }
    for (const id of s.roster) {
      if (questId === odysseyQuestId(id, 'operation') && !s.prepared.includes(id)) {
        s.prepared.push(id); this.reveal(id); this.reconcileGrounds();
        this.tell(`${odysseyFaction(id).name}: preparations complete. The leader loses its escort; this work will survive later acts.`);
      }
      if (questId !== odysseyQuestId(id, 'leader') || !defeatOdysseyLeader(s, id)) continue;
      this.recordPowerMilestones();
      // Receipt first, then pay. Neither ordinary warlords nor account kill
      // counters can enter this path; the active objective supplies the writer.
      w.meta.vocationPoints += C.pointsPerLeader;
      w.meta.passivePoints += C.passivePointsPerLeader;
      w.grantXp(2000 * odysseyAct(s));
      for (let i = 0; i < C.gemsPerLeader; i++) w.dropGemAt(w.player.pos, undefined, true, 'quest');
      w.ledger[`odyssey_leader:${id}`] = 1;
      w.ledger.hero_renowned = 1;
      const tutorial = revengeFactionOf(w.account.ledger);
      if (id === tutorial && w.metaProgressionActive()) {
        w.account.ledger[ODYSSEY_TUTORIAL_RELEASE] = 1;
        w.accountDirty = true;
      }
      this.tell(`${odysseyFaction(id).leaderName} falls. +${C.pointsPerLeader} Vocation points${w.meta.vocations.length ? '' : ' banked for a future Vocation'}, +${C.passivePointsPerLeader} passive point, and ${C.gemsPerLeader} Memories.`);
      this.tell(odysseyFaction(id).clue);
      if (odysseyPressureTier(s, C.bandit) !== null) this.expandBanditTurf();
      this.reconcileGrounds();
      if (odysseyAct(s) === 4) {
        w.enrollOdysseyQuest(QUESTS[ODYSSEY_SURVEY], true);
        this.tell('Four fragments share one bearing. Secure the marked survey ground when ready, around level 80.');
      } else this.tell(`Act ${odysseyAct(s) + 1}: surviving leaders prepare their grounds. Expected readiness: level ${odysseyReadiness(s)}. Your completed preparations remain.`);
    }
    this.dirty();
  }

  private reconcileGrounds(): void {
    const s = this.state;
    if (!s) return;
    for (const id of s.roster) {
      if (!odysseySurvives(s, id)) continue;
      this.w.prepareOdysseyGround(id, odysseyReadiness(s), s.prepared.includes(id), odysseyAct(s));
    }
  }
  /** A surviving road faction presses its operation's existing neighbouring
   * ground through the territory simulator, once per player-caused act. */
  private expandBanditTurf(): void {
    const w = this.w, c = C.bandit;
    const home = w.zoneMap[`quest_${odysseyQuestId('bandit', 'operation')}`];
    if (!home) return;
    const candidates = Object.values(w.zoneMap).filter(z => z.objective.kind !== 'safe'
      && !z.special && !z.id.startsWith('quest_') && !z.floating && !z.concealed)
      .sort((a, b) => Math.hypot(a.map.x - home.map.x, a.map.y - home.map.y)
        - Math.hypot(b.map.x - home.map.x, b.map.y - home.map.y) || a.id.localeCompare(b.id));
    for (const z of candidates.slice(0, c.turfPerAct * odysseyAct(this.state!))) w.sim.faction.reinforce(z.id, 'bandit', c.turfInfluence);
    this.tell('Bandits press their claims around the dispatch route. Watch their roads for messengers.');
  }

  killed(a: Actor, credited: boolean): void {
    const s = this.state;
    if (!s) return;
    if (a.tag === 'odyssey_scout') {
      delete s.scout; this.scoutActor = undefined;
      this.tell('Messenger intercepted — no report leaves this zone.');
    }
    for (const group of [s.report, s.siege]) {
      if (!group || !a.tag || !group.remaining.includes(a.tag)) continue;
      group.remaining = group.remaining.filter(id => id !== a.tag);
      this.bodies.delete(a.tag);
      if (group === s.siege && !group.remaining.length) s.siege.nextWaveAt = this.w.time + C.goblin.waveGapSec;
    }
    if (credited && a.faction && s.roster.includes(a.faction) && !a.owner && !a.noBounty) {
      s.kills[a.faction] = (s.kills[a.faction] ?? 0) + 1;
      if (s.kills[a.faction] >= C.leadsFromKills) this.reveal(a.faction);
    }
  }

  private scoutExit(a: Actor) {
    const field = this.w.pathField(a.tier);
    return this.w.exits.filter(e => e.to !== '?' && e.to !== START_ZONE
      && this.w.zoneMap[e.to] && this.w.zoneMap[e.to].objective.kind !== 'safe'
      && (!field?.reachable || field.reachable(a.pos, e.pos)))
      .sort((a1, b) => dist(a.pos, a1.pos) - dist(a.pos, b.pos))[0];
  }
  private updateScouts(): void {
    const w = this.w, s = this.state!, c = C.bandit, tier = odysseyPressureTier(s, c);
    if (tier === null) { s.nextScoutAt = 0; delete s.scoutInterval; return; }
    const interval = odysseyPressureInterval(c, tier, s.prepared.includes(c.faction));
    s.nextScoutAt = retimeOdysseyPressure(s.nextScoutAt, s.scoutInterval, interval, w.time);
    s.scoutInterval = interval;
    const field = w.zone.objective.kind !== 'safe' && !w.zone.special && !w.zone.id.startsWith('quest_');
    const territory = w.sim.faction.owner(w.zone.id).faction === 'bandit'
      || w.zone.packs?.table.some(e => MONSTERS[e.id]?.faction === 'bandit')
      || w.actors.some(a => !a.dead && a.faction === 'bandit');
    if (!s.scout && !s.report && field && territory && w.time >= s.nextScoutAt) {
      const exit = this.scoutExit(w.player);
      if (exit) {
        const at = w.findFreeSpot(vec(w.player.pos.x + Math.cos(angleTo(w.player.pos, exit.pos)) * c.spawnDistance,
          w.player.pos.y + Math.sin(angleTo(w.player.pos, exit.pos)) * c.spawnDistance), 14);
        s.scout = { id: 'odyssey_messenger', zoneId: w.zone.id, x: at.x, y: at.y, life: 1, phase: 'watch' };
        this.scoutActor = undefined;
        s.nextScoutAt = w.time + interval;
      }
    }
    const scout = s.scout;
    if (scout && scout.zoneId === w.zone.id) {
      let a = this.scoutActor;
      if (!a || !w.actors.includes(a)) {
        a = this.spawn(scout.id, 'odyssey_scout', w.zone.level, scout);
        a.facing = angleTo(a.pos, w.player.pos); this.scoutActor = a;
      }
      if (scout.phase === 'watch') {
        const seen = w.seats.some(seat => !seat.actor.dead && !seat.actor.downed
          && !seat.actor.untargetable && seat.actor.sheet.get('invisible') <= 0
          && dist(a!.pos, seat.actor.pos) <= c.sightRange * Math.max(0, seat.actor.sheet.get('detectability'))
          && Math.abs(angleDiff(a!.facing, angleTo(a!.pos, seat.actor.pos))) <= c.sightArc / 2
          && w.losCached(a!, seat.actor));
        const exit = seen ? this.scoutExit(a) : undefined;
        if (seen && exit) {
          scout.phase = 'spotted'; scout.fleeAt = w.time + c.warningSec;
          scout.exitX = exit.pos.x; scout.exitY = exit.pos.y; scout.exitTo = exit.to;
          scout.seenX = w.player.pos.x; scout.seenY = w.player.pos.y;
          w.text(vec(a.pos.x, a.pos.y - 35), 'SPOTTED! Stop the messenger!', '#ffcb55', 19);
          this.tell('A Bandit messenger spotted you! Intercept it before it reaches the exit.');
        }
      }
      if (scout.phase === 'spotted' && w.time >= (scout.fleeAt ?? Infinity)) scout.phase = 'flee';
      a.aiFleeing = scout.phase === 'flee';
      if (a.aiFleeing) a.aiFleeGoal = vec(scout.exitX!, scout.exitY!);
    }
    if (s.report && s.report.zoneId === w.zone.id && w.time >= s.report.arrivesAt) {
      this.spawnGroup(s.report.remaining, s.report.bodies, c.huntRoster, w.zone.level, vec(s.report.x, s.report.y));
      if (!s.report.remaining.length) { delete s.report; this.tell('The reported-zone hunt is broken.'); }
    }
  }

  /** Called only by the real flee-path arrival, validated against the chosen
   *  connected portal. Leaving a zone or merely being seen is never escape. */
  escaped(a: Actor): boolean {
    if (a.tag !== 'odyssey_scout') return false;
    const s = this.state, scout = s?.scout;
    if (!s || !scout || scout.phase !== 'flee' || a.dead || scout.zoneId !== this.w.zone.id) return true;
    const tier = odysseyPressureTier(s, C.bandit);
    if (tier === null) return true;
    const exit = this.w.exits.find(e => e.to === scout.exitTo && e.to !== '?'
      && dist(e.pos, vec(scout.exitX!, scout.exitY!)) < 1);
    if (!exit || dist(a.pos, exit.pos) >= 70) return true;
    const count = Math.max(1, odysseyTierValue(C.bandit.hunters, tier) - (s.prepared.includes('bandit') ? 2 : 0));
    s.report = { zoneId: scout.zoneId, arrivesAt: this.w.time + C.bandit.responseDelaySec,
      x: scout.seenX ?? this.w.player.pos.x, y: scout.seenY ?? this.w.player.pos.y,
      remaining: Array.from({ length: count }, (_, i) => `odyssey_hunt:${i}`) };
    delete s.scout; this.scoutActor = undefined;
    this.w.slipAway(a, 'The messenger escaped!');
    this.tell(`The messenger escaped. A Bandit hunting party is coming to ${this.w.zone.name}.`);
    this.dirty(); return true;
  }

  private updateSiege(): void {
    const w = this.w, s = this.state!, c = C.goblin, tier = odysseyPressureTier(s, c);
    if (tier === null) { s.nextSiegeAt = 0; delete s.siegeInterval; return; }
    const interval = odysseyPressureInterval(c, tier, s.prepared.includes(c.faction));
    s.nextSiegeAt = retimeOdysseyPressure(s.nextSiegeAt, s.siegeInterval, interval, w.time);
    s.siegeInterval = interval;
    if (!s.siege && w.time >= s.nextSiegeAt) {
      s.siege = { phase: 'warning', deadline: w.time + c.warningSec, wave: 0,
        waves: Math.max(1, odysseyTierValue(c.waves, tier) - (s.prepared.includes(c.faction) ? c.preparedWaveReduction : 0)),
        remaining: [], nextWaveAt: 0, level: odysseyTierValue(C.readiness, tier - 1) };
      this.tell(`Goblins march on Lastlight! Return within ${c.warningSec} seconds to defend town. Town portals remain open.`);
    }
    const siege = s.siege;
    if (!siege) return;
    if (siege.phase === 'warning' && w.time >= siege.deadline) {
      siege.phase = 'active'; siege.deadline = w.time + c.defenseSec;
      this.tell('Lastlight is under attack! Return and break the Goblin waves before the stores fall.');
    }
    if (siege.phase === 'active' && w.time >= siege.deadline) {
      siege.phase = 'raided'; s.raids++;
      this.tell('Goblins raided Lastlight’s stores. Trade is closed until you return and defeat the remaining raiders.');
    }
    if (siege.phase === 'warning' || w.zone.id !== START_ZONE) return;
    if (!siege.remaining.length && w.time >= siege.nextWaveAt) {
      if (siege.wave >= siege.waves) {
        s.defenses++; delete s.siege;
        s.nextSiegeAt = w.time + interval;
        for (let i = 0; i < c.rewardGems; i++) w.dropGemAt(w.player.pos, undefined, true, 'quest');
        this.tell('Lastlight is secure. Trade resumes; the recovered supplies are yours. The Goblins withdraw for a time.');
        this.dirty(); return;
      }
      siege.wave++;
      siege.remaining = Array.from({ length: c.waveSize }, (_, i) => `odyssey_siege:${siege.wave}:${i}`);
      siege.bodies = undefined;
      this.tell(`Defend Lastlight — Goblin wave ${siege.wave}/${siege.waves}.`);
    }
    this.spawnGroup(siege.remaining, siege.bodies, c.roster, siege.level, vec(w.arena.w / 2, w.arena.h / 2));
  }

  tradeRefusal(): string | null {
    return this.w.zone.id === START_ZONE && this.state?.siege?.phase === 'raided'
      ? 'Goblins hold the stores — defeat the remaining raiders in Lastlight to reopen trade.' : null;
  }
  pressureText(): string | null {
    const siege = this.state?.siege;
    if (!siege) return null;
    const sec = Math.max(0, Math.ceil(siege.deadline - this.w.time));
    if (siege.phase === 'warning') return `Return to Lastlight — Goblins arrive in ${sec}s`;
    if (siege.phase === 'raided') return 'Lastlight raided — defeat the Goblin waves to restore trade';
    return `Defend Lastlight — ${sec}s to save the stores (${siege.wave}/${siege.waves} waves)`;
  }
  status(): string {
    const s = this.state;
    if (!s) return 'Your Odyssey begins after the prologue.';
    const siege = s.siege;
    const pressure = siege ? ` Lastlight: ${siege.phase === 'warning' ? `Goblins arrive in ${Math.max(0, Math.ceil(siege.deadline - this.w.time))}s` : siege.phase === 'raided' ? 'stores raided — clear the remaining waves to restore trade' : `under attack — ${Math.max(0, Math.ceil(siege.deadline - this.w.time))}s to save the stores`}.` : '';
    return `${s.defeated.length}/4 leaders defeated. ${s.defeated.length < 4 ? `Expected leader readiness: level ${odysseyReadiness(s)}; any order. Optional operations remove escorts.` : s.surveyDone ? 'Signal charted; final undertaking to come.' : 'Trace the shared signal at the marked survey ground.'}${pressure} ${this.w.meta.vocationPoints} unspent Vocation points${this.w.meta.vocations.length ? '' : ' banked for a future Vocation'}.`;
  }
  clues(): string[] { return this.state?.defeated.map(id => `${odysseyFaction(id).name}: ${odysseyFaction(id).clue}`) ?? []; }
  private spawn(id: string, tag: string, level: number, saved?: OdysseyBody): Actor {
    const w = this.w, a = w.createMonster(id, level, 'enemy');
    const at = saved ? vec(saved.x, saved.y) : w.exits[0]?.pos ?? vec(w.arena.w * 0.75, w.arena.h * 0.5);
    a.pos = w.findFreeSpot(at, a.radius); a.tag = tag; a.fromZoneGen = false;
    a.life = a.maxLife() * Math.max(0.001, Math.min(1, saved?.life ?? 1));
    a.aiTargetId = w.player.id;
    w.actors.push(a); return a;
  }
  private spawnGroup(ids: string[], saved: OdysseyBody[] | undefined, roster: string[], level: number, goal: { x: number; y: number }): void {
    ids.forEach(tag => {
      const existing = this.bodies.get(tag);
      if (existing && this.w.actors.includes(existing)) return;
      // Casualties must not change surviving hunters' kits on zone re-entry.
      const slot = Number(tag.slice(tag.lastIndexOf(':') + 1));
      const a = this.spawn(roster[slot % roster.length], tag, level, saved?.find(b => b.id === tag));
      issueCommand(a, { kind: 'assault', pos: { ...goal }, until: this.w.time + C.bandit.orderSec });
      this.bodies.set(tag, a);
    });
  }
  capture(): void {
    const s = this.state;
    if (!s) return;
    const save = (a: Actor, id: string): OdysseyBody => ({ id, x: a.pos.x, y: a.pos.y, life: a.life / a.maxLife() });
    if (s.scout && this.scoutActor && this.w.actors.includes(this.scoutActor) && !this.scoutActor.dead)
      Object.assign(s.scout, { ...save(this.scoutActor, 'odyssey_messenger') });
    for (const group of [s.report, s.siege]) {
      if (!group) continue;
      const live = group.remaining.map(id => this.bodies.get(id)).filter((a): a is Actor => !!a && !a.dead && this.w.actors.includes(a));
      if (live.length) group.bodies = live.map(a => save(a, a.tag!));
    }
  }
  leaveZone(): void { this.capture(); this.risings.clear(); this.scoutActor = undefined; this.bodies.clear(); }
}
