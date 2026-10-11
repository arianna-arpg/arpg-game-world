/** Quest-facing Odyssey operations over the actual shared campaign state and local reward host. */
import {odysseyMilestoneKey} from '../data/powerProgression';
import {QUESTS} from '../quests/defs';
import {revengeFactionOf,revengeCullId,revengeCommanderId} from '../quests/revenge';
import {ODYSSEY_CFG as C,ODYSSEY_SURVEY,ODYSSEY_TUTORIAL_RELEASE,odysseyFaction,odysseyQuestId} from '../data/odyssey';
import {odysseyPressureTier} from '../world/odysseyPressure';
import {defeatOdysseyLeader,odysseyAct,odysseyReadiness,odysseySurvives,type OdysseyState} from '../world/odyssey';
import type {World} from './world';
export interface NativeQuestOdysseyHost extends Pick<World,"account"|"accountDirty"|"dropGemAt"|"enrollOdysseyQuest"|"grantXp"|"graphWorkAvailable"|"keeperCampaign"|"learnQuestDirections"|"ledger"|"localSeat"|"markMetaDirty"|"meta"|"metaProgressionActive"|"notice"|"odysseyLeads"|"player"|"prepareOdysseyGround"|"questHand"|"seatHero"|"sim"|"text"|"zoneMap"> {}
export class NativeQuestOdyssey {
 constructor(private readonly w:NativeQuestOdysseyHost,private readonly stateOwner:Pick<World['odyssey'],'state'>){}
 get state(){return this.stateOwner.state;}
tell(line: string): void { this.w.notice(line, '#6ad8c0', 17, 'world'); }

dirty(): void { this.w.markMetaDirty(this.w.localSeat); }

campaign(): OdysseyState | undefined { return this.state ?? this.w.keeperCampaign(); }

recordPowerMilestones(): void {
    const camp = this.campaign();
    if (!camp || !this.w.metaProgressionActive()) return;
    for (let stage = 1; stage <= odysseyAct(camp); stage++) {
      const key = odysseyMilestoneKey(stage);
      if (this.w.account.ledger[key]) continue;
      this.w.account.ledger[key] = 1;
      this.w.accountDirty = true;
    }
  }

leadsOf(s: OdysseyState): string[] { return this.w.odysseyLeads(s); }

revealRevenge(): void {
    if (!this.w.graphWorkAvailable()) return;
    this.w.learnQuestDirections(`quest_${revengeCommanderId(revengeFactionOf(this.w.account.ledger))}`);
  }

reveal(id: string): void {
    const s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign
    if (!this.w.graphWorkAvailable() || !s || this.leadsOf(s).includes(id) || !s.roster.includes(id)) return;
    this.leadsOf(s).push(id); // THE CHARACTER'S QUESTS: the hand's own lead on a hosted world
    for (const step of ['operation', 'leader'] as const) {
      this.w.learnQuestDirections(`quest_${odysseyQuestId(id, step)}`);
    }
    const f = odysseyFaction(id);
    if (id === revengeFactionOf(this.w.account.ledger)) this.revealRevenge();
    this.tell(`${f.name}: ${f.operation} to remove the leader's escort, or pursue ${f.leaderName} directly. Bearings on your map point toward their country.`);
    this.dirty();
  }

questCompleted(questId: string): void {
    const w = this.w, s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign
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
      if (questId === odysseyQuestId(id, 'leader') && w.localSeat.keeper) { this.leaderQuestDone(s, id); continue; } // THE CHARACTER'S QUESTS
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

leaderQuestDone(s: OdysseyState, id: string): void {
    const w = this.w, hand = w.questHand();
    if (defeatOdysseyLeader(s, id)) {
      this.recordPowerMilestones();
      w.ledger[`odyssey_leader:${id}`] = 1;
      w.ledger.hero_renowned = 1;
      if (id === revengeFactionOf(w.account.ledger) && w.metaProgressionActive()) {
        w.account.ledger[ODYSSEY_TUTORIAL_RELEASE] = 1;
        w.accountDirty = true;
      }
      this.tell(`${odysseyFaction(id).leaderName} falls.`);
      this.tell(odysseyFaction(id).clue);
      if (odysseyPressureTier(s, C.bandit) !== null) this.expandBanditTurf();
      this.reconcileGrounds();
      this.tell(odysseyAct(s) === 4
        ? 'Four fragments share one bearing. Secure the marked survey ground when ready, around level 80.'
        : `Act ${odysseyAct(s) + 1}: surviving leaders prepare their grounds. Expected readiness: level ${odysseyReadiness(s)}. Your completed preparations remain.`);
    }
    if (hand.keeper) return;
    const at = w.seatHero(hand).pos;
    hand.meta.vocationPoints += C.pointsPerLeader;
    hand.meta.passivePoints += C.passivePointsPerLeader;
    w.grantXp(2000 * odysseyAct(s), at, hand);
    for (let i = 0; i < C.gemsPerLeader; i++) w.dropGemAt(at, undefined, true, 'quest');
    w.markMetaDirty(hand);
    w.text({ x: at.x, y: at.y - 64 }, `+${C.pointsPerLeader} Vocation points, +${C.passivePointsPerLeader} passive point`, '#e8c860', 16);
  }

reconcileGrounds(): void {
    const s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign
    if (!s) return;
    for (const id of s.roster) {
      if (!odysseySurvives(s, id)) continue;
      this.w.prepareOdysseyGround(id, odysseyReadiness(s), s.prepared.includes(id), odysseyAct(s));
    }
  }

expandBanditTurf(): void {
    const w = this.w, c = C.bandit;
    const home = w.zoneMap[`quest_${odysseyQuestId('bandit', 'operation')}`];
    if (!home) return;
    const candidates = Object.values(w.zoneMap).filter(z => z.objective.kind !== 'safe'
      && !z.special && !z.id.startsWith('quest_') && !z.floating && !z.concealed)
      .sort((a, b) => Math.hypot(a.map.x - home.map.x, a.map.y - home.map.y)
        - Math.hypot(b.map.x - home.map.x, b.map.y - home.map.y) || a.id.localeCompare(b.id));
    for (const z of candidates.slice(0, c.turfPerAct * odysseyAct(this.campaign()!))) w.sim.faction.reinforce(z.id, 'bandit', c.turfInfluence);
    this.tell('Bandits press their claims around the dispatch route. Watch their roads for messengers.');
  }
hasLocalLeads(): boolean { const s = this.campaign(); return this.w.graphWorkAvailable() && !!s && this.leadsOf(s).length < s.roster.length; }

localLeads(): void {
    const s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign
    if (!s) return;
    for (const id of s.roster) this.reveal(id);
    this.revealRevenge();
  }
}
