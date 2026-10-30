/** Exact original quest-facing Odyssey and rescue bodies from the phase28 baseline. */
export const nativeSceneQuestAuxArchive={
  "commit": "55f73fb6",
  "odyssey": {
    "sourceHash": "8232b55203056709a1dd4ec4b680a9def13d29b1df9dec4c4fb2e1923939d381",
    "rows": [
      {
        "name": "tell",
        "before": "private tell(line: string): void { this.w.notice(line, '#6ad8c0', 17, 'world'); }",
        "after": "private tell(line: string): void {return this.nativeQuestCore().tell(line);}"
      },
      {
        "name": "dirty",
        "before": "private dirty(): void { this.w.markMetaDirty(this.w.localSeat); }",
        "after": "private dirty(): void {return this.nativeQuestCore().dirty();}"
      },
      {
        "name": "campaign",
        "before": "private campaign(): OdysseyState | undefined { return this.state ?? this.w.keeperCampaign(); }",
        "after": "private campaign(): OdysseyState | undefined {return this.nativeQuestCore().campaign();}"
      },
      {
        "name": "recordPowerMilestones",
        "before": "private recordPowerMilestones(): void {\n    const camp = this.campaign();\n    if (!camp || !this.w.metaProgressionActive()) return;\n    for (let stage = 1; stage <= odysseyAct(camp); stage++) {\n      const key = odysseyMilestoneKey(stage);\n      if (this.w.account.ledger[key]) continue;\n      this.w.account.ledger[key] = 1;\n      this.w.accountDirty = true;\n    }\n  }",
        "after": "private recordPowerMilestones(): void {return this.nativeQuestCore().recordPowerMilestones();}"
      },
      {
        "name": "leadsOf",
        "before": "private leadsOf(s: OdysseyState): string[] { return this.w.odysseyLeads(s); }",
        "after": "private leadsOf(s: OdysseyState): string[] {return this.nativeQuestCore().leadsOf(s);}"
      },
      {
        "name": "revealRevenge",
        "before": "private revealRevenge(): void {\n    if (!this.w.graphWorkAvailable()) return;\n    this.w.learnQuestDirections(`quest_${revengeCommanderId(revengeFactionOf(this.w.account.ledger))}`);\n  }",
        "after": "private revealRevenge(): void {return this.nativeQuestCore().revealRevenge();}"
      },
      {
        "name": "reveal",
        "before": "reveal(id: string): void {\n    const s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign\n    if (!this.w.graphWorkAvailable() || !s || this.leadsOf(s).includes(id) || !s.roster.includes(id)) return;\n    this.leadsOf(s).push(id); // THE CHARACTER'S QUESTS: the hand's own lead on a hosted world\n    for (const step of ['operation', 'leader'] as const) {\n      this.w.learnQuestDirections(`quest_${odysseyQuestId(id, step)}`);\n    }\n    const f = odysseyFaction(id);\n    if (id === revengeFactionOf(this.w.account.ledger)) this.revealRevenge();\n    this.tell(`${f.name}: ${f.operation} to remove the leader's escort, or pursue ${f.leaderName} directly. Bearings on your map point toward their country.`);\n    this.dirty();\n  }",
        "after": "reveal(id: string): void {return this.nativeQuestCore().reveal(id);}"
      },
      {
        "name": "questCompleted",
        "before": "questCompleted(questId: string): void {\n    const w = this.w, s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign\n    if (!s) return;\n    if (questId === revengeCullId(revengeFactionOf(w.account.ledger))) {\n      this.revealRevenge(); this.reveal(revengeFactionOf(w.account.ledger));\n    }\n    if (questId === ODYSSEY_SURVEY) {\n      s.surveyDone = true;\n      this.tell('The signal is charted. The four fragments agree on its bearing. Your preparations stand; the final undertaking is still to come.');\n    }\n    for (const id of s.roster) {\n      if (questId === odysseyQuestId(id, 'operation') && !s.prepared.includes(id)) {\n        s.prepared.push(id); this.reveal(id); this.reconcileGrounds();\n        this.tell(`${odysseyFaction(id).name}: preparations complete. The leader loses its escort; this work will survive later acts.`);\n      }\n      if (questId === odysseyQuestId(id, 'leader') && w.localSeat.keeper) { this.leaderQuestDone(s, id); continue; } // THE CHARACTER'S QUESTS\n      if (questId !== odysseyQuestId(id, 'leader') || !defeatOdysseyLeader(s, id)) continue;\n      this.recordPowerMilestones();\n      // Receipt first, then pay. Neither ordinary warlords nor account kill\n      // counters can enter this path; the active objective supplies the writer.\n      w.meta.vocationPoints += C.pointsPerLeader;\n      w.meta.passivePoints += C.passivePointsPerLeader;\n      w.grantXp(2000 * odysseyAct(s));\n      for (let i = 0; i < C.gemsPerLeader; i++) w.dropGemAt(w.player.pos, undefined, true, 'quest');\n      w.ledger[`odyssey_leader:${id}`] = 1;\n      w.ledger.hero_renowned = 1;\n      const tutorial = revengeFactionOf(w.account.ledger);\n      if (id === tutorial && w.metaProgressionActive()) {\n        w.account.ledger[ODYSSEY_TUTORIAL_RELEASE] = 1;\n        w.accountDirty = true;\n      }\n      this.tell(`${odysseyFaction(id).leaderName} falls. +${C.pointsPerLeader} Vocation points${w.meta.vocations.length ? '' : ' banked for a future Vocation'}, +${C.passivePointsPerLeader} passive point, and ${C.gemsPerLeader} Memories.`);\n      this.tell(odysseyFaction(id).clue);\n      if (odysseyPressureTier(s, C.bandit) !== null) this.expandBanditTurf();\n      this.reconcileGrounds();\n      if (odysseyAct(s) === 4) {\n        w.enrollOdysseyQuest(QUESTS[ODYSSEY_SURVEY], true);\n        this.tell('Four fragments share one bearing. Secure the marked survey ground when ready, around level 80.');\n      } else this.tell(`Act ${odysseyAct(s) + 1}: surviving leaders prepare their grounds. Expected readiness: level ${odysseyReadiness(s)}. Your completed preparations remain.`);\n    }\n    this.dirty();\n  }",
        "after": "questCompleted(questId: string): void {return this.nativeQuestCore().questCompleted(questId);}"
      },
      {
        "name": "leaderQuestDone",
        "before": "private leaderQuestDone(s: OdysseyState, id: string): void {\n    const w = this.w, hand = w.questHand();\n    if (defeatOdysseyLeader(s, id)) {\n      this.recordPowerMilestones();\n      w.ledger[`odyssey_leader:${id}`] = 1;\n      w.ledger.hero_renowned = 1;\n      if (id === revengeFactionOf(w.account.ledger) && w.metaProgressionActive()) {\n        w.account.ledger[ODYSSEY_TUTORIAL_RELEASE] = 1;\n        w.accountDirty = true;\n      }\n      this.tell(`${odysseyFaction(id).leaderName} falls.`);\n      this.tell(odysseyFaction(id).clue);\n      if (odysseyPressureTier(s, C.bandit) !== null) this.expandBanditTurf();\n      this.reconcileGrounds();\n      this.tell(odysseyAct(s) === 4\n        ? 'Four fragments share one bearing. Secure the marked survey ground when ready, around level 80.'\n        : `Act ${odysseyAct(s) + 1}: surviving leaders prepare their grounds. Expected readiness: level ${odysseyReadiness(s)}. Your completed preparations remain.`);\n    }\n    if (hand.keeper) return;\n    const at = w.seatHero(hand).pos;\n    hand.meta.vocationPoints += C.pointsPerLeader;\n    hand.meta.passivePoints += C.passivePointsPerLeader;\n    w.grantXp(2000 * odysseyAct(s), at, hand);\n    for (let i = 0; i < C.gemsPerLeader; i++) w.dropGemAt(at, undefined, true, 'quest');\n    w.markMetaDirty(hand);\n    w.text({ x: at.x, y: at.y - 64 }, `+${C.pointsPerLeader} Vocation points, +${C.passivePointsPerLeader} passive point`, '#e8c860', 16);\n  }",
        "after": "leaderQuestDone(s: OdysseyState, id: string): void {return this.nativeQuestCore().leaderQuestDone(s,id);}"
      },
      {
        "name": "reconcileGrounds",
        "before": "private reconcileGrounds(): void {\n    const s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign\n    if (!s) return;\n    for (const id of s.roster) {\n      if (!odysseySurvives(s, id)) continue;\n      this.w.prepareOdysseyGround(id, odysseyReadiness(s), s.prepared.includes(id), odysseyAct(s));\n    }\n  }",
        "after": "private reconcileGrounds(): void {return this.nativeQuestCore().reconcileGrounds();}"
      },
      {
        "name": "expandBanditTurf",
        "before": "private expandBanditTurf(): void {\n    const w = this.w, c = C.bandit;\n    const home = w.zoneMap[`quest_${odysseyQuestId('bandit', 'operation')}`];\n    if (!home) return;\n    const candidates = Object.values(w.zoneMap).filter(z => z.objective.kind !== 'safe'\n      && !z.special && !z.id.startsWith('quest_') && !z.floating && !z.concealed)\n      .sort((a, b) => Math.hypot(a.map.x - home.map.x, a.map.y - home.map.y)\n        - Math.hypot(b.map.x - home.map.x, b.map.y - home.map.y) || a.id.localeCompare(b.id));\n    for (const z of candidates.slice(0, c.turfPerAct * odysseyAct(this.campaign()!))) w.sim.faction.reinforce(z.id, 'bandit', c.turfInfluence);\n    this.tell('Bandits press their claims around the dispatch route. Watch their roads for messengers.');\n  }",
        "after": "expandBanditTurf(): void {return this.nativeQuestCore().expandBanditTurf();}"
      }
    ]
  },
  "rescues": {
    "sourceHash": "17d1450e0df55d392426059fc73e05cf89d3b84c9acafad20880f34ed9b6ba6c",
    "rows": [
      {
        "name": "reconcile",
        "before": "reconcile(): void {\n    const w = this.w;\n    if (w.clientActionHook || w.scene || !w.metaProgressionActive()) return;\n    for (const q of Object.values(QUESTS)) {\n      const r = q.rescue;\n      if (!r) continue;\n      const cleared = w.activeQuests.some(a => a.questId === q.id && a.fieldDone && w.completedObjectives.has(a.zoneId));\n      if (!w.account.ledger[r.ledger] && !(r.legacyLedger && w.account.ledger[r.legacyLedger] > 0)\n        && !w.completedQuests.has(q.id) && !cleared) continue;\n      if (!w.account.ledger[r.ledger] || r.features.some(f => !w.account.features.has(f))) {\n        w.account.ledger[r.ledger] = 1;\n        for (const feature of r.features) w.account.features.add(feature);\n        w.accountDirty = true;\n      }\n    }\n  }"
      },
      {
        "name": "free",
        "before": "free(q: QuestDef): void {\n    const w = this.w, r = q.rescue;\n    if (!r || w.clientActionHook || w.scene) return;\n    const aq = w.activeQuests.find(a => a.questId === q.id && a.fieldDone);\n    if (!aq || !w.completedObjectives.has(aq.zoneId)) return;\n    if (w.account.ledger[r.ledger] || w.ledger[r.ledger]) return;\n    // Presence receipts are deliberately idempotent under the death merge.\n    w.ledger[r.ledger] = 1;\n    if (w.metaProgressionActive()) {\n      w.account.ledger[r.ledger] = 1;\n      for (const feature of r.features) w.account.features.add(feature);\n      w.accountDirty = true;\n    }\n    w.markMetaDirty(w.localSeat);\n    w.notice(r.message, '#c7adeb', 17, 'civic');\n  }"
      },
      {
        "name": "update",
        "before": "update(): void {\n    const w = this.w;\n    if (w.clientActionHook || w.scene || !w.player || w.player.dead || w.player.downed) return;\n    // THE CHARACTER'S QUESTS (card 24): on a hosted world the captive stands for the first\n    // hero here whose own ledger holds its rescue, in that hero's hand.\n    if (w.localSeat.keeper) {\n      for (const seat of w.seats) {\n        if (seat.keeper || seat.merc) continue;\n        if (w.withQuestHand(seat, () => w.activeQuests.some(a => a.zoneId === w.zone.id && !!w.questDefOf(a.questId)?.rescue))) {\n          w.withQuestHand(seat, () => this.updateHand());\n          return;\n        }\n      }\n      return;\n    }\n    this.updateHand();\n  }"
      },
      {
        "name": "updateHand",
        "before": "private updateHand(): void {\n    const w = this.w;\n    const aq = w.activeQuests.find(a => a.zoneId === w.zone.id && w.questDefOf(a.questId)?.rescue);\n    const q = aq && w.questDefOf(aq.questId), r = q?.rescue;\n    if (!aq || !q || !r) return;\n    if (aq.fieldDone) this.free(q); // a saved field completion heals the same receipt\n    const freed = !!(w.account.ledger[r.ledger] || w.ledger[r.ledger]);\n    // A resident is never recaptured in a later life.\n    if (freed && !w.ledger[r.ledger]) return;\n    const tag = `quest_rescue:${q.id}`;\n    let npc = w.actors.find(a => a.tag === tag && !a.dead);\n    if (!npc) {\n      npc = w.createMonster(r.npc, 1, 'player');\n      const bossId = w.zone.objective.kind === 'boss' ? w.zone.objective.id : undefined;\n      const boss = w.actors.find(a => a.defId === bossId);\n      const anchor = boss?.pos ?? w.player.pos;\n      npc.pos = w.findFreeSpot({ x: anchor.x + r.offset.x, y: anchor.y + r.offset.y }, npc.radius);\n      npc.tag = tag; npc.fromZoneGen = false; w.actors.push(npc);\n    }\n    npc.name = freed ? MONSTERS[r.npc].name : r.captiveName;\n    npc.look = freed ? r.freeLook : r.captiveLook;\n  }"
      }
    ]
  }
} as const;
export const nativeSceneQuestAuxArchiveHash="b956a55e4d12b50ccac37d41cec76f11dc0c1e93246626759332d9a11e2a2670";
