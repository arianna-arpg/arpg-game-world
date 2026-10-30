/** Immutable native216005a8 members and exact reviewed post-projectile integration. */
export const nativeSceneQuestInteractionArchive={
  "originalCommit": "216005a896e43932661ceda34c95b78f8de5083a",
  "integrationCommit": "8c7ab5fae732b49e29e6aa756ad9b98670be16e0",
  "integrationSourceHash": "35f5af8d0d14cd74b08564b9abb12a344d5deb418cd76d345296e5cc922aafd4",
  "integrationOdysseyHash": "65561156377e1fd1b93d6830ba1e4e5def8d08c14e441fa3e66b966da7da206b",
  "originalSourceHash": "15e9f003218369e16b338ab1a50419afcf61a41c76f3f77115b39aadfe2cce35",
  "rows": [
    {
      "name": "nearQuestGiver",
      "before": "nearQuestGiver(): boolean { return this.getQuestGiver() !== null; }",
      "after": "nearQuestGiver(): boolean { return sceneNearQuestGiver(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "7e8d001e418d6643af537d44d23cc771987a93ebace06c0e8960d6ea4bdb4de0",
      "bodyHash": "80bd854959d5f4e4f9c0245eedde961a2cb441143a7ceaa4b708ff2673cd30b0",
      "signature": [],
      "returnType": "boolean"
    },
    {
      "name": "nearAnyQuestGiver",
      "before": "nearAnyQuestGiver(): boolean {\n    const givers = this.massRuntime ? QUEST_GIVER_IDS : ZONE_QUEST_GIVER_IDS;\n    const p = this.questHand().actor; // THE QUEST HAND\n    return this.actors.some(a => !a.dead && a.defId && givers.has(a.defId)\n      && dist(a.pos, p.pos) <= QUESTGIVER_RADIUS\n      && this.dwellReachable(p.pos, a.pos, npcDwellReach('questgiver'), this.storyPair(p, a)));\n  }",
      "after": "nearAnyQuestGiver(): boolean { return sceneNearAnyQuestGiver(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "5a441b0124356ab82901fc73f8da9d3d716c988c5ccf795d33ec1f4ae1b3e3da",
      "bodyHash": "5ff0c6ac68f97eaf314a32a62e4c6859e539b8a615418290307900afd0984258",
      "signature": [],
      "returnType": "boolean"
    },
    {
      "name": "questGiverPrompt",
      "before": "questGiverPrompt(): string | null {\n    if (!this.nearAnyQuestGiver()) return null;\n    if (this.questImbues.some(r => this.giverPresent(QUESTS[r.questId]?.turnIn?.giver ?? []) !== null)) return 'Your imbue awaits. Show me the magic piece you would like me to work on.';\n    if (this.questRewardOffers().length) return 'Your keepsake awaits. Choose what you will carry.';\n    if (this.reliquaryLesson()) return 'A keepsake needs a home. Open your inventory and seat your charm in the Reliquary.';\n    if (this.graphWorkAvailable() && this.nearQuestGiver() && this.odyssey.hasLocalLeads()) return 'Linger — I can mark the Odyssey leaders and their supply operations.';\n    if (this.pendingTurnIns().length) return 'Linger — a bounty is yours to claim.';\n    if (this.questOfferChoices().length) return 'I have work if you want it.';\n    if (this.nextAcceptableQuest()) return this.heroKnown()\n      ? 'Linger, {name} — I have work for you…'\n      : 'Linger, and I have work for you…';\n    if (this.vocationChoiceOffers().length) return this.heroKnown()\n      ? 'Linger — a CALLING awaits you, {name}.'\n      : 'Linger — a CALLING awaits you.';\n    if (this.activeQuests.some(q => !this.massRuntime || q.placeId)) return 'Your hunts await out in the wilds.';\n    const upcoming = this.eligibleQuestCandidates().filter(q => q.offerLevelHint && this.questOfferLevel(q) > this.player.level)\n      .sort((a,b) => this.questOfferLevel(a) - this.questOfferLevel(b) || a.id.localeCompare(b.id))[0];\n    if (upcoming) return upcoming.offerLevelHint!.replaceAll('{level}', String(this.questOfferLevel(upcoming)));\n    if (!this.graphWorkAvailable()) return 'No hunts are posted for this country yet.';\n    return 'No work for you yet, traveller.';\n  }",
      "after": "questGiverPrompt(): string | null { return sceneQuestGiverPrompt(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "4911379a91c6d4d45a144cd908b4aceb9e5f0cd3f46d0ce30b2a8b462b33f14b",
      "bodyHash": "634e76b04954b6b4b2e1c91c3e95132b81263e94ef84343b35fa8a195126d309",
      "signature": [],
      "returnType": "string | null"
    },
    {
      "name": "activeCategoryCounts",
      "before": "private activeCategoryCounts(): Record<string, number> {\n    const c: Record<string, number> = {};\n    for (const e of this.activeQuests) {\n      const cat = this.questDefOf(e.questId)?.category ?? DEFAULT_QUEST_CATEGORY;\n      c[cat] = (c[cat] ?? 0) + 1;\n    }\n    return c;\n  }",
      "after": "private activeCategoryCounts(): Record<string, number> { return sceneActiveCategoryCounts(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "b3744860673f2e7c6f324a8f2f9b5a929854d25e511a9ca3bf5ba752baab6685",
      "bodyHash": "c2f4732217b1ba6c9c3f362df2d132254b1185fa5b1db96f48a2b5d889ca108e",
      "signature": [],
      "returnType": "Record<string, number>"
    },
    {
      "name": "questGateCtx",
      "before": "private questGateCtx(): QuestGateCtx {\n    const m = this.questHand().meta; // THE QUEST HAND\n    return {\n      features: this.account.features,\n      classId: m.classDef.id,\n      vocations: m.vocations,\n      runLedger: this.questRunLedger(), // THE CHARACTER'S QUESTS: the hand's own quest keys over the run ledger\n      accountLedger: this.account.ledger,\n    };\n  }",
      "after": "private questGateCtx(): QuestGateCtx { return sceneQuestGateCtx(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "7c4cd492c8ab514ac9c6d9b679c94cf688bb68e99fa8751f61639f7d0e9aa4e3",
      "bodyHash": "614ee1136631a91fff32ee0865299b7d4a0f47a90edbcccd1dc41382321b5583",
      "signature": [],
      "returnType": "QuestGateCtx"
    },
    {
      "name": "questOfferLevel",
      "before": "questOfferLevel(q: QuestDef): number {\n    const range = q.offerLevelRange;\n    return range ? range[0] + Math.floor(new Rng((this.manifest.seed ^ hashStr(`offer:${q.id}`)) >>> 0).next()\n      * (range[1] - range[0] + 1)) : q.offerAtLevel;\n  }",
      "after": "questOfferLevel(q: QuestDef): number { return sceneQuestOfferLevel(this.nativeSceneQuestInteractionHost(),q); }",
      "memberHash": "9bb6c8c26c09784411f636dc1ec171b1b8cebaa56ad73a9c21409045b44d2d03",
      "bodyHash": "bb86ad65285f30d17d4c1c531c685c4d43c50614f142c692ee8a874d6ec5a6f2",
      "signature": [
        "q: QuestDef"
      ],
      "returnType": "number"
    },
    {
      "name": "acceptableQuests",
      "before": "private acceptableQuests(): QuestDef[] {\n    const level = this.questHand().actor.level; // THE QUEST HAND: work opens at the asking seat's level\n    return this.eligibleQuestCandidates().filter(q => level >= this.questOfferLevel(q));\n  }",
      "after": "private acceptableQuests(): QuestDef[] { return sceneAcceptableQuests(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "3847b5aa4cc9477216444526c9541b485356af7c90b3e6401141ea55623f6e43",
      "bodyHash": "def4fd30c23af61dbac8d0b907125a9767873966cfe1ed133f180ab3441159e9",
      "signature": [],
      "returnType": "QuestDef[]"
    },
    {
      "name": "eligibleQuestCandidates",
      "before": "private eligibleQuestCandidates(): QuestDef[] {\n    const counts = this.activeCategoryCounts();\n    const gateCtx = this.questGateCtx();\n    return Object.values(QUESTS).filter(q => {\n      if (q.geographies && !q.geographies.includes(this.massRuntime ? 'continuous' : 'zones')) return false;\n      if (this.massRuntime && !massQuestDestination(this.massRuntime, q.id)) return false;\n      if (this.completedQuests.has(q.id)) return false;\n      if (this.activeQuests.some(e => e.questId === q.id)) return false;\n      if (this.giverPresent(q.giver) === null) return false; // one of its offering NPCs must be present\n      if (q.requiresLedger\n        && (gateCtx.runLedger[q.requiresLedger] ?? 0) < 1 // THE CHARACTER'S QUESTS: the hand's own keys (questGateCtx)\n        && (this.account.ledger[q.requiresLedger] ?? 0) < 1) return false;\n      if (q.requiresQuests?.some(id => !this.completedQuests.has(id))) return false;\n      if (q.gate && !q.gate(gateCtx)) return false;\n      const cat = q.category ?? DEFAULT_QUEST_CATEGORY;\n      const cap = QUEST_CATEGORY_CAPS[cat];\n      if (cap != null && (counts[cat] ?? 0) >= cap) return false;\n      return true;\n    });\n  }",
      "after": "private eligibleQuestCandidates(): QuestDef[] { return sceneEligibleQuestCandidates(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "19bfd2811040694415c5784f05a6caf57a225de4595f424239b26cd6ca95d78b",
      "bodyHash": "49415703981c6de697d4a75227e2b0206e52ba7accac2bbbdf64072d0870c82b",
      "signature": [],
      "returnType": "QuestDef[]"
    },
    {
      "name": "vocationEngaged",
      "before": "private vocationEngaged(vocId: string): boolean {\n    const v = VOCATIONS[vocId];\n    if (!v) return false;\n    return v.quest.steps.some((_, i) => (this.questRunLedger()[vocationStepKey(vocId, i + 1)] ?? 0) >= 1); // THE CHARACTER'S QUESTS\n  }",
      "after": "private vocationEngaged(vocId: string): boolean { return sceneVocationEngaged(this.nativeSceneQuestInteractionHost(),vocId); }",
      "memberHash": "6f22a1ddc228c8d94251b6c5252149c48b9ae34f6bc3e98c6f3ba6e44ad74830",
      "bodyHash": "8bb1fb014f252e580d8c70ce082cab902a545dff5d6d65158a3f43e2caef38a2",
      "signature": [
        "vocId: string"
      ],
      "returnType": "boolean"
    },
    {
      "name": "isVocationChoice",
      "before": "private isVocationChoice(q: QuestDef): boolean {\n    return q.vocation !== undefined && !this.vocationEngaged(q.vocation);\n  }",
      "after": "private isVocationChoice(q: QuestDef): boolean { return sceneIsVocationChoice(this.nativeSceneQuestInteractionHost(),q); }",
      "memberHash": "bde2ab1d696cf20c02ae2190c6afd3214924d6b9b3278e36ee1f12916370202c",
      "bodyHash": "04677aee8b6e822c7e295551167741dbffabf667b9afc0770778eec934651e0f",
      "signature": [
        "q: QuestDef"
      ],
      "returnType": "boolean"
    },
    {
      "name": "vocationChoiceOffers",
      "before": "private vocationChoiceOffers(): QuestDef[] {\n    return this.acceptableQuests().filter(q => this.isVocationChoice(q));\n  }",
      "after": "private vocationChoiceOffers(): QuestDef[] { return sceneVocationChoiceOffers(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "2af371043a1b31d38fc7b0145e63772275b5252a1c436149d3e69d196bc2e70f",
      "bodyHash": "b3ce05132a074b2aab075119176d5868d5b7e0098af3c9f26848d3f79f33614a",
      "signature": [],
      "returnType": "QuestDef[]"
    },
    {
      "name": "nextAcceptableQuest",
      "before": "private nextAcceptableQuest(): QuestDef | null {\n    if (this.massRuntime?.config.settlement?.quests?.acceptance === 'journal') return null;\n    const avail = this.acceptableQuests().filter(q => !this.isVocationChoice(q));\n    if (!avail.length) return null;\n    for (let i = avail.length - 1; i > 0; i--) { const j = randInt(0, i); [avail[i], avail[j]] = [avail[j], avail[i]]; }\n    avail.sort((a, b) => a.offerAtLevel - b.offerAtLevel); // stable → equal-level ties keep shuffled order\n    return avail[0];\n  }",
      "after": "private nextAcceptableQuest(): QuestDef | null { return sceneNextAcceptableQuest(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "f4cf1a356c0efa6f2fa04c30c949d3653dbdece67d0196049cbf016a93a96e99",
      "bodyHash": "8f630825c8c5397bf348c030ad152c9fd1fd2cde163b48ec78096a45c5226ea1",
      "signature": [],
      "returnType": "QuestDef | null"
    },
    {
      "name": "updateQuestGiver",
      "before": "private updateQuestGiver(dt: number): void {\n    this.ensureQuestCargo();\n    // THE QUEST HAND (a hosted world): every standing player lingers at the giver for\n    // itself, on its own clock; the act and its pay are its own (the keeper never asks).\n    if (this.localSeat.keeper) {\n      for (const seat of this.handSeats()) this.questGiverStep(seat, dt);\n      // THE CHARACTER'S QUESTS on the Unbroken Wilds: every hero's own country quests settle\n      // at their places (the runtime's own settle walks the run's one ledger, the keeper's).\n      if (this.massRuntime) this.settleHeroMassQuests();\n      return;\n    }\n    if (!this.nearAnyQuestGiver()) this.questRewardShown = null;\n    if (this.player.dead || this.player.downed || !this.playerIdle()) {\n      this.questGiverDwell = 0;\n      // Stepping away re-arms the choice menu (a decline lasts one visit).\n      this.vocationOfferDeclined = false;\n      return;\n    }\n    const turnIns = this.pendingTurnIns();\n    const next = turnIns.length ? null : this.nextAcceptableQuest();\n    const choices = (!turnIns.length && !next && !this.vocationOfferDeclined)\n      ? this.vocationChoiceOffers() : [];\n    const odysseyLeads = this.graphWorkAvailable() && this.odyssey.hasLocalLeads() && this.nearQuestGiver();\n    if (!turnIns.length && !next && !choices.length && !odysseyLeads) { this.questGiverDwell = 0; return; }\n    this.questGiverDwell += dt;\n    if (this.questGiverDwell < QUESTGIVER_DWELL) return;\n    this.questGiverDwell = 0;\n    if (odysseyLeads) this.odyssey.localLeads();\n    if (turnIns.length) this.onQuestZoneCleared(turnIns[0]);\n    else if (next) this.acceptQuest(next);\n    else if (choices.length) this.vocationOfferRequested = true; // main loop opens the menu (once per dwell)\n  }",
      "after": "private updateQuestGiver(dt: number): void { return sceneUpdateQuestGiver(this.nativeSceneQuestInteractionHost(),dt); }",
      "memberHash": "592b7fa5d6b4fde9c119bc8cd3450515e7c884566cd85f2e34bc1182956802e4",
      "bodyHash": "7ff9e66b774cc272d7a9b7b1533f006973072538de1e5c5f579f4c304061937b",
      "signature": [
        "dt: number"
      ],
      "returnType": "void"
    },
    {
      "name": "questGiverStep",
      "before": "private questGiverStep(seat: Seat, dt: number): void {\n    this.withQuestHand(seat, () => {\n      if (!this.seatIdle(seat) || !this.nearAnyQuestGiver()) { this.questGiverDwells.delete(seat); return; }\n      const turnIns = this.pendingTurnIns();\n      const next = turnIns.length ? null : this.nextAcceptableQuest();\n      const leads = this.graphWorkAvailable() && this.odyssey.hasLocalLeads() && this.nearQuestGiver();\n      if (!turnIns.length && !next && !leads) { this.questGiverDwells.delete(seat); return; }\n      const t = (this.questGiverDwells.get(seat) ?? 0) + dt;\n      if (t < QUESTGIVER_DWELL) { this.questGiverDwells.set(seat, t); return; }\n      this.questGiverDwells.delete(seat);\n      const was = this.actingSeat;\n      this.actingSeat = seat; // THE ACTING SEAT: the linger is this seat's act (its party hears the news)\n      try {\n        if (leads) this.odyssey.localLeads();\n        if (turnIns.length) this.onQuestZoneCleared(turnIns[0]);\n        else if (next) this.acceptQuest(next);\n      } finally { this.actingSeat = was; }\n      this.journalDirty.add(seat.id); // THE JOURNAL ROW: the act re-ships at once\n    });\n  }",
      "after": "private questGiverStep(seat: Seat, dt: number): void { return sceneQuestGiverStep(this.nativeSceneQuestInteractionHost(),seat,dt); }",
      "memberHash": "fdbe46cbab45186479c2f0094e4fd28d640fc50744bc175e313a0698be1b63fa",
      "bodyHash": "51d7577d44863beec824a63c3ad074c3a432e4066f9a71e5a7f56e9bcdfa39d0",
      "signature": [
        "seat: Seat",
        "dt: number"
      ],
      "returnType": "void"
    },
    {
      "name": "questOfferChoices",
      "before": "questOfferChoices(): import('../net/journalWire').JournalOfferW[] {\n    if (this.clientActionHook) return this.netJournal?.offers ?? []; // THE JOURNAL ROW: the host's judgment for this seat\n    const mass = this.massRuntime;\n    const hand = this.questHand().actor; // THE QUEST HAND\n    if (mass?.config.settlement?.quests?.acceptance !== 'journal'\n      || hand.dead || hand.downed) return [];\n    return this.acceptableQuests().filter(q => !this.isVocationChoice(q))\n      .sort((a,b) => this.questOfferLevel(a) - this.questOfferLevel(b) || a.id.localeCompare(b.id))\n      .map(q => {\n        const place = massQuestDestination(mass, q.id)!;\n        const giver = this.giverPresent(q.giver)!;\n        return {\n          questId: q.id, label: q.offerLabel, giver: MONSTERS[giver.defId!]?.name ?? giver.name,\n          target: massQuestTarget(mass, {questId:q.id,zoneId:MASS_ZONE,placeId:place.id,fieldDone:false}, hand.pos)!,\n          returnTo: q.turnIn ? (Array.isArray(q.turnIn.giver) ? q.turnIn.giver : [q.turnIn.giver])\n            .map(id => MONSTERS[id]?.name ?? id).join(' or ') : null,\n          xp: q.reward.xp ?? 0, passivePoints: q.reward.passivePoints ?? 0,\n          rewards: q.reward.choices?.map(c => c.name) ?? [],\n        };\n      });\n  }",
      "after": "questOfferChoices(): import('../net/journalWire').JournalOfferW[] { return sceneQuestOfferChoices(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "260c9f5425e94edbebd0935b5c1dddb0ae928cb0e057d4d79035466b348f4f9f",
      "bodyHash": "0c482e2a9dacccfc07f64931ecc5ba5b0ef16b5ce3b2e0789e701816fdee502a",
      "signature": [],
      "returnType": "import('../net/journalWire').JournalOfferW[]"
    },
    {
      "name": "acceptQuestOffer",
      "before": "acceptQuestOffer(questId: string, seat: Seat = this.localSeat): boolean {\n    if (seat !== this.localSeat && !this.localSeat.keeper) return false; // keeperSeat: on a shard any seat may take a contract\n    return this.withQuestHand(seat, () => { // THE QUEST HAND: the giver, the gates and the level are the taker's\n      if (!this.questOfferChoices().some(q => q.questId === questId)) return false;\n      this.acceptQuest(QUESTS[questId]);\n      return this.activeQuests.some(q => q.questId === questId);\n    });\n  }",
      "after": "acceptQuestOffer(questId: string, seat: Seat = this.localSeat): boolean { return sceneAcceptQuestOffer(this.nativeSceneQuestInteractionHost(),questId,seat); }",
      "memberHash": "a4e1b921d8b7ce87e54576f3b757b4e49cb9e75059be6511aaccf0a4397b7a0d",
      "bodyHash": "70dcfdb5872e6d864b5236c8ba5c56a552a42f4c6fbde85918926d2016a516c8",
      "signature": [
        "questId: string",
        "seat: Seat = this.localSeat"
      ],
      "returnType": "boolean"
    },
    {
      "name": "acceptVocationQuest",
      "before": "acceptVocationQuest(questId: string, seat: Seat = this.localSeat): boolean {\n    const q = QUESTS[questId];\n    if (!q || q.vocation === undefined) return false;\n    // THE QUEST HAND (a hosted world): the chain opens to the asking seat's gates and level.\n    return this.withQuestHand(this.localSeat.keeper ? seat : this.localSeat, () => {\n      if (!this.acceptableQuests().some(x => x.id === questId)) return false;\n      this.acceptQuest(q);\n      return true;\n    });\n  }",
      "after": "acceptVocationQuest(questId: string, seat: Seat = this.localSeat): boolean { return sceneAcceptVocationQuest(this.nativeSceneQuestInteractionHost(),questId,seat); }",
      "memberHash": "d8f02569f8c4e66ffa29f195d32831a63761c2aa6b4fb638af218e5df5008789",
      "bodyHash": "fb03c5dae5a2b8e49c1712436d3e6e67f2b8ca82bb01db0cec93a2cd914651e7",
      "signature": [
        "questId: string",
        "seat: Seat = this.localSeat"
      ],
      "returnType": "boolean"
    },
    {
      "name": "vocationMenuOffers",
      "before": "vocationMenuOffers(): {\n    questId: string; vocationId: string; name: string; blurb: string; color: string;\n    className: string; ownClass: boolean; steps: number; offerLabel: string;\n    secret: boolean; flavor?: string;\n  }[] {\n    return this.vocationChoiceOffers().map(q => {\n      const v = VOCATIONS[q.vocation!];\n      return {\n        questId: q.id, vocationId: v.id, name: v.name, blurb: v.blurb, color: v.color,\n        className: CLASSES.find(c => c.id === v.classId)?.name ?? v.classId,\n        ownClass: v.classId === this.meta.classDef.id,\n        steps: v.quest.steps.length, offerLabel: q.offerLabel,\n        secret: v.secret !== undefined, flavor: v.secret?.offerFlavor,\n      };\n    });\n  }",
      "after": "vocationMenuOffers(): {\n    questId: string; vocationId: string; name: string; blurb: string; color: string;\n    className: string; ownClass: boolean; steps: number; offerLabel: string;\n    secret: boolean; flavor?: string;\n  }[] { return sceneVocationMenuOffers(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "61bae482f78e2ccf87c0906cb43f2d566d813d9e1f2db0745da1fa06b3b55585",
      "bodyHash": "7b89fe8fed7e65b9ba5260472dd185ff6af7b7560c115be6d71f733090fdbf7e",
      "signature": [],
      "returnType": "{\n    questId: string; vocationId: string; name: string; blurb: string; color: string;\n    className: string; ownClass: boolean; steps: number; offerLabel: string;\n    secret: boolean; flavor?: string;\n  }[]"
    },
    {
      "name": "declineVocationOffer",
      "before": "declineVocationOffer(): void { this.vocationOfferDeclined = true; }",
      "after": "declineVocationOffer(): void { return sceneDeclineVocationOffer(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "e86237e0b746acd117a621ee21c410a022053dcebaacdb6391ab1705fa281d1e",
      "bodyHash": "da6de2bbeca689aab4b75c33877df15bc38e1d47e465fc545f17140b829ba423",
      "signature": [],
      "returnType": "void"
    },
    {
      "name": "acceptQuest",
      "before": "private acceptQuest(q: QuestDef): void {\n    if (this.massRuntime) {\n      const place = massQuestDestination(this.massRuntime, q.id);\n      if (!place || this.completedQuests.has(q.id) || this.activeQuests.some(e => e.questId === q.id)) return;\n      const entry: SavedQuestEntry = { questId: q.id, zoneId: MASS_ZONE, placeId: place.id,\n        fieldDone: false, directionsKnown: true };\n      this.activeQuests.push(entry);\n      this.questStamp('quests_accepted'); this.charDirty = true; // THE CHARACTER'S QUESTS\n      this.notice('Quest: ' + q.offerLabel + ' · ' + massQuestTarget(this.massRuntime, entry, this.questHand().actor.pos), '#c8a8e8', 16, 'civic'); // THE QUEST HAND\n      return;\n    }\n    if (q.geographies && !q.geographies.includes('zones')) return;\n    this.acceptOdysseyCompatibleQuest(q, true);\n  }",
      "after": "private acceptQuest(q: QuestDef): void { return sceneAcceptQuest(this.nativeSceneQuestInteractionHost(),q); }",
      "memberHash": "acd129ce5ef192cbc61157f31caf9ea439677a3d194ea84290a89dcb02999888",
      "bodyHash": "85483183333d4a2dce525a231618b81c5e522970d01c3c9559b96899c0ef8393",
      "signature": [
        "q: QuestDef"
      ],
      "returnType": "void"
    },
    {
      "name": "questRewardOffers",
      "before": "questRewardOffers(): { questId: string; label: string; prompt: string; xp: number;\n    choices: (NonNullable<QuestDef['reward']['choices']>[number] & { lines: string[]; footprint: string })[] }[] {\n    if (this.clientActionHook && this.netJournal) return this.netJournal.rewards; // THE JOURNAL ROW\n    return this.pendingTurnIns().flatMap(aq => {\n      const q = this.questDefOf(aq.questId);\n      return q && (q.reward.choices?.length || q.reward.skillChoice) ? [{ questId: q.id, label: q.offerLabel,\n        prompt: q.reward.choicePrompt ?? 'Choose one item as your quest reward.', xp: q.reward.xp ?? 0,\n        choices: questRewardChoices(this.account, q).map(c => {\n          const item = this.questRewardItem(q, c.id, c);\n          const size = item ? itemGridSize(item) : { w: 1, h: 1 };\n          const rewardDescription = item ? describeItem(item) : undefined;\n          return { ...c, lines: rewardDescription ? [...rewardDescription.defense.map(l => l.text),\n            ...rewardDescription.implicit, ...rewardDescription.affix.map(l => l.text), ...rewardDescription.unique] : [],\n            footprint: `${size.w} × ${size.h}` };\n        }) }] : [];\n    });\n  }",
      "after": "questRewardOffers(): { questId: string; label: string; prompt: string; xp: number;\n    choices: (NonNullable<QuestDef['reward']['choices']>[number] & { lines: string[]; footprint: string })[] }[] { return sceneQuestRewardOffers(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "df80d5c3f1e689feeedd1b61e1c897ee21328e0ea04955922b47534d083f6e7d",
      "bodyHash": "a28d16fe8724574bbbe3f4d690d90a40bdb7e6970918f14927b930350af43e34",
      "signature": [],
      "returnType": "{ questId: string; label: string; prompt: string; xp: number;\n    choices: (NonNullable<QuestDef['reward']['choices']>[number] & { lines: string[]; footprint: string })[] }[]"
    },
    {
      "name": "questImbueOffers",
      "before": "questImbueOffers(): import('../net/journalWire').JournalImbueW[] {\n    if (this.clientActionHook && this.netJournal) return this.netJournal.imbues; // THE JOURNAL ROW\n    const items = this.questHand().meta.items; // THE QUEST HAND: the asking seat's own magic pieces\n    return this.questImbues.map(reward => {\n      const q = QUESTS[reward.questId];\n      const near = !!q && this.giverPresent(q.turnIn?.giver ?? q.giver) !== null;\n      const givers = q?.turnIn?.giver ?? q?.giver;\n      const giverId = Array.isArray(givers) ? givers[0] : givers;\n      const giver = giverId ? MONSTERS[giverId]?.name ?? 'The giver' : 'The giver';\n      return { questId: reward.questId, level: reward.level, near, giver,\n        prompt: q?.reward.imbue?.prompt ?? 'Choose a magic piece to make finer.',\n        items: items.filter(item => item.rarity === 'magic' && !item.gem && !item.mem).map(item => ({\n          uid: item.uid, name: item.name, current: describeItem(item).affix.map(l => l.text),\n          options: imbueOptions(reward, item).map(a => ({ id: a.id,\n            lines: describeItem({ ...item, affixes: [a] }).affix.map(l => l.text),\n            unstudied: expertiseRank(this.account.craftLore, ITEM_AFFIXES[a.id].family) < 1,\n          })),\n        })),\n      };\n    });\n  }",
      "after": "questImbueOffers(): import('../net/journalWire').JournalImbueW[] { return sceneQuestImbueOffers(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "0ded263358b58418b3942ade3d7e2c4cd0a32acc1434609812ebf3ff30869604",
      "bodyHash": "67bf5cbd52009809b1f4d88b7bf6e1810296bc126270b34b186b5302ac257113",
      "signature": [],
      "returnType": "import('../net/journalWire').JournalImbueW[]"
    },
    {
      "name": "claimQuestImbue",
      "before": "claimQuestImbue(questId: string, uid: number, affixId: string, seat: Seat = this.localSeat): boolean {\n    if ((seat !== this.localSeat && !this.localSeat.keeper) || this.clientActionHook || seat.actor.dead || seat.actor.downed) return false; // keeperSeat\n    const book = this.questLedgerOf(seat); // THE CHARACTER'S QUESTS: the claimant's own imbues (the run's one off a hosted world)\n    const reward = book.imbues.find(r => r.questId === questId), q = QUESTS[questId];\n    const giver = q && this.withQuestHand(seat, () => this.giverPresent(q.turnIn?.giver ?? q.giver)); // THE QUEST HAND: the giver by the claimant\n    if (!reward || !q || !giver) return false;\n    const item = this.bagItem(seat, uid);\n    const affix = item && imbueOptions(reward, item).find(a => a.id === affixId);\n    if (!item || !affix) return false;\n    const result = imbuedItem(item, affix);\n    seat.meta.items = seat.meta.items.map(i => i.uid === uid ? result : i);\n    book.imbues = book.imbues.filter(r => r !== reward);\n    this.markMetaDirty(seat);\n    this.notice(`${result.name} — ${giver.name ?? 'the giver'}’s promise is kept.`, ITEM_RARITIES.rare.color, 16, 'civic');\n    saveCharacter(this);\n    return true;\n  }",
      "after": "claimQuestImbue(questId: string, uid: number, affixId: string, seat: Seat = this.localSeat): boolean { return sceneClaimQuestImbue(this.nativeSceneQuestInteractionHost(),questId,uid,affixId,seat); }",
      "memberHash": "c4d1d8320cb1a4aef89c09dbef049bbb5af77ee064879eb1c33fdfaedcb3203e",
      "bodyHash": "256bef38235240f46a816e06748ee63e48ba2a4848b864f5e18a1a3b6760fb02",
      "signature": [
        "questId: string",
        "uid: number",
        "affixId: string",
        "seat: Seat = this.localSeat"
      ],
      "returnType": "boolean"
    },
    {
      "name": "reliquaryLesson",
      "before": "reliquaryLesson(): boolean {\n    return this.account.features.has(FEATURE.RELIQUARY)\n      && (this.account.ledger[RELIQUARY_LESSON] ?? 0) < 1;\n  }",
      "after": "reliquaryLesson(): boolean { return sceneReliquaryLesson(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "8ea6dd621db5cf3cfbff83fb4bdacfdc5d8fc987a7a674ef3fa4fe065200ed92",
      "bodyHash": "a83d256aed2ccf3dfb7bda77a2e5f11b88b29fd4420c63681805a3b65a8c230f",
      "signature": [],
      "returnType": "boolean"
    },
    {
      "name": "seatIdle",
      "before": "seatIdle(seat: Seat): boolean {\n    return this.time - seat.lastActedAt >= DWELL_IDLE_GRACE\n      && seat.actor.isQuiescent();\n  }",
      "after": "seatIdle(seat: Seat): boolean { return sceneSeatIdle(this.nativeSceneQuestInteractionHost(),seat); }",
      "memberHash": "21034941a4786dfbfc0499ad5e0ba4acceaf376bac706890a11b41de59b09212",
      "bodyHash": "2ae2260b937a5fd55af1ecf423ce9b7b4667febb344304294b0cee7f143e72d6",
      "signature": [
        "seat: Seat"
      ],
      "returnType": "boolean"
    },
    {
      "name": "playerIdle",
      "before": "playerIdle(): boolean {\n    return this.seatIdle(this.localSeat);\n  }",
      "after": "playerIdle(): boolean { return scenePlayerIdle(this.nativeSceneQuestInteractionHost()); }",
      "memberHash": "311c2f4b9bf82d2643dc89c4fa50cdcf36b68f3592ef19cd369964cd70f0e5ef",
      "bodyHash": "ad58d8b88db7ceb8effa2312240eca74654126e2f88655e72ea18c83d0520a9a",
      "signature": [],
      "returnType": "boolean"
    }
  ],
  "auxiliary": [
    {
      "name": "hasLocalLeads",
      "before": "hasLocalLeads(): boolean { const s = this.campaign(); return this.w.graphWorkAvailable() && !!s && this.leadsOf(s).length < s.roster.length; }",
      "after": "hasLocalLeads(): boolean {return this.nativeQuestCore().hasLocalLeads();}",
      "memberHash": "9dd67f4284ff60a4915dab8c1e6819ac824f7ac3da7b755bee6f7d6a7a8065d1"
    },
    {
      "name": "localLeads",
      "before": "localLeads(): void {\n    const s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign\n    if (!s) return;\n    for (const id of s.roster) this.reveal(id);\n    this.revealRevenge();\n  }",
      "after": "localLeads(): void {return this.nativeQuestCore().localLeads();}",
      "memberHash": "144ffd74410cfdab999f21ee23b90d75ba5caff268add4ff0f4b74f25363bb1b"
    }
  ],
  "config": [
    "const QUESTGIVER_RADIUS = 150;",
    "const QUESTGIVER_DWELL = 0.9;",
    "const DWELL_IDLE_GRACE = 0.15;"
  ],
  "integration": [
    {
      "before": "import './nativeSceneBootstrap';\n",
      "after": "import './nativeSceneBootstrap';\nimport {sceneNearQuestGiver,sceneNearAnyQuestGiver,sceneQuestGiverPrompt,sceneActiveCategoryCounts,sceneQuestGateCtx,sceneQuestOfferLevel,sceneAcceptableQuests,sceneEligibleQuestCandidates,sceneVocationEngaged,sceneIsVocationChoice,sceneVocationChoiceOffers,sceneNextAcceptableQuest,sceneUpdateQuestGiver,sceneQuestGiverStep,sceneQuestOfferChoices,sceneAcceptQuestOffer,sceneAcceptVocationQuest,sceneVocationMenuOffers,sceneDeclineVocationOffer,sceneAcceptQuest,sceneQuestRewardOffers,sceneQuestImbueOffers,sceneClaimQuestImbue,sceneReliquaryLesson,sceneSeatIdle,scenePlayerIdle,QUESTGIVER_DWELL,type NativeSceneQuestInteractionHost} from './nativeSceneQuestInteraction';\n"
    },
    {
      "before": "import {type NativeSceneQuestHost,sceneOnQuestZoneFieldCleared,sceneDeedHand,sceneCompleteQuestField,sceneEnsureQuestCargo,sceneEnsureSeatCargo,sceneOnQuestZoneCleared,sceneQuestRewardItem,sceneClaimQuestReward,sceneQuestStanding,scenePendingTurnIns,sceneGiverPresent,sceneGetQuestGiver,sceneGrantVocation,sceneQuestHand,sceneWithQuestHand,sceneQuestLedger,sceneQuestStamp,sceneQuestRunLedger,sceneCreditedHands,sceneHandSeats,sceneNearestHand,sceneLocalHumanSeats,sceneFailNote,sceneLearnQuestDirections,scenePrepareOdysseyGround,sceneEnrollOdysseyQuest,sceneAcceptOdysseyCompatibleQuest,sceneQuestLocalAnchor,sceneFindBandCoord,sceneRevealQuestGround,sceneGraphWorkAvailable} from './nativeSceneQuests';",
      "after": "import {QUESTGIVER_RADIUS,type NativeSceneQuestHost,sceneOnQuestZoneFieldCleared,sceneDeedHand,sceneCompleteQuestField,sceneEnsureQuestCargo,sceneEnsureSeatCargo,sceneOnQuestZoneCleared,sceneQuestRewardItem,sceneClaimQuestReward,sceneQuestStanding,scenePendingTurnIns,sceneGiverPresent,sceneGetQuestGiver,sceneGrantVocation,sceneQuestHand,sceneWithQuestHand,sceneQuestLedger,sceneQuestStamp,sceneQuestRunLedger,sceneCreditedHands,sceneHandSeats,sceneNearestHand,sceneLocalHumanSeats,sceneFailNote,sceneLearnQuestDirections,scenePrepareOdysseyGround,sceneEnrollOdysseyQuest,sceneAcceptOdysseyCompatibleQuest,sceneQuestLocalAnchor,sceneFindBandCoord,sceneRevealQuestGround,sceneGraphWorkAvailable} from './nativeSceneQuests';"
    },
    {
      "before": "const QUESTGIVER_RADIUS = 150;   // how close to stand to the quartermaster\nconst QUESTGIVER_DWELL = 0.9;    // seconds lingering before he hands you a quest\n/** Cadence of the attunement",
      "after": "/** Cadence of the attunement"
    },
    {
      "before": "const DWELL_IDLE_GRACE = 0.15;   // a dwell only builds once the player has been\n                                 // INPUT-free (no move/attack/cast press) this long\n                                 // AND the body is quiescent (seatIdle's second\n                                 // clause — no cast/leap/shove still resolving), so\n                                 // passing by, fighting, or a cast that outlives its\n                                 // press never counts as dwelling\n\nconst CORPSE_RADIUS",
      "after": "const CORPSE_RADIUS"
    },
    {
      "before": "nearQuestGiver(): boolean { return this.getQuestGiver() !== null; }",
      "after": "nearQuestGiver(): boolean { return sceneNearQuestGiver(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "nearAnyQuestGiver(): boolean {\n    const givers = this.massRuntime ? QUEST_GIVER_IDS : ZONE_QUEST_GIVER_IDS;\n    const p = this.questHand().actor; // THE QUEST HAND\n    return this.actors.some(a => !a.dead && a.defId && givers.has(a.defId)\n      && dist(a.pos, p.pos) <= QUESTGIVER_RADIUS\n      && this.dwellReachable(p.pos, a.pos, npcDwellReach('questgiver'), this.storyPair(p, a)));\n  }",
      "after": "nearAnyQuestGiver(): boolean { return sceneNearAnyQuestGiver(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "questGiverPrompt(): string | null {\n    if (!this.nearAnyQuestGiver()) return null;\n    if (this.questImbues.some(r => this.giverPresent(QUESTS[r.questId]?.turnIn?.giver ?? []) !== null)) return 'Your imbue awaits. Show me the magic piece you would like me to work on.';\n    if (this.questRewardOffers().length) return 'Your keepsake awaits. Choose what you will carry.';\n    if (this.reliquaryLesson()) return 'A keepsake needs a home. Open your inventory and seat your charm in the Reliquary.';\n    if (this.graphWorkAvailable() && this.nearQuestGiver() && this.odyssey.hasLocalLeads()) return 'Linger — I can mark the Odyssey leaders and their supply operations.';\n    if (this.pendingTurnIns().length) return 'Linger — a bounty is yours to claim.';\n    if (this.questOfferChoices().length) return 'I have work if you want it.';\n    if (this.nextAcceptableQuest()) return this.heroKnown()\n      ? 'Linger, {name} — I have work for you…'\n      : 'Linger, and I have work for you…';\n    if (this.vocationChoiceOffers().length) return this.heroKnown()\n      ? 'Linger — a CALLING awaits you, {name}.'\n      : 'Linger — a CALLING awaits you.';\n    if (this.activeQuests.some(q => !this.massRuntime || q.placeId)) return 'Your hunts await out in the wilds.';\n    const upcoming = this.eligibleQuestCandidates().filter(q => q.offerLevelHint && this.questOfferLevel(q) > this.player.level)\n      .sort((a,b) => this.questOfferLevel(a) - this.questOfferLevel(b) || a.id.localeCompare(b.id))[0];\n    if (upcoming) return upcoming.offerLevelHint!.replaceAll('{level}', String(this.questOfferLevel(upcoming)));\n    if (!this.graphWorkAvailable()) return 'No hunts are posted for this country yet.';\n    return 'No work for you yet, traveller.';\n  }",
      "after": "questGiverPrompt(): string | null { return sceneQuestGiverPrompt(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "private activeCategoryCounts(): Record<string, number> {\n    const c: Record<string, number> = {};\n    for (const e of this.activeQuests) {\n      const cat = this.questDefOf(e.questId)?.category ?? DEFAULT_QUEST_CATEGORY;\n      c[cat] = (c[cat] ?? 0) + 1;\n    }\n    return c;\n  }",
      "after": "private activeCategoryCounts(): Record<string, number> { return sceneActiveCategoryCounts(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "private questGateCtx(): QuestGateCtx {\n    const m = this.questHand().meta; // THE QUEST HAND\n    return {\n      features: this.account.features,\n      classId: m.classDef.id,\n      vocations: m.vocations,\n      runLedger: this.questRunLedger(), // THE CHARACTER'S QUESTS: the hand's own quest keys over the run ledger\n      accountLedger: this.account.ledger,\n    };\n  }",
      "after": "private questGateCtx(): QuestGateCtx { return sceneQuestGateCtx(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "questOfferLevel(q: QuestDef): number {\n    const range = q.offerLevelRange;\n    return range ? range[0] + Math.floor(new Rng((this.manifest.seed ^ hashStr(`offer:${q.id}`)) >>> 0).next()\n      * (range[1] - range[0] + 1)) : q.offerAtLevel;\n  }",
      "after": "questOfferLevel(q: QuestDef): number { return sceneQuestOfferLevel(this.nativeSceneQuestInteractionHost(),q); }"
    },
    {
      "before": "private acceptableQuests(): QuestDef[] {\n    const level = this.questHand().actor.level; // THE QUEST HAND: work opens at the asking seat's level\n    return this.eligibleQuestCandidates().filter(q => level >= this.questOfferLevel(q));\n  }",
      "after": "private acceptableQuests(): QuestDef[] { return sceneAcceptableQuests(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "private eligibleQuestCandidates(): QuestDef[] {\n    const counts = this.activeCategoryCounts();\n    const gateCtx = this.questGateCtx();\n    return Object.values(QUESTS).filter(q => {\n      if (q.geographies && !q.geographies.includes(this.massRuntime ? 'continuous' : 'zones')) return false;\n      if (this.massRuntime && !massQuestDestination(this.massRuntime, q.id)) return false;\n      if (this.completedQuests.has(q.id)) return false;\n      if (this.activeQuests.some(e => e.questId === q.id)) return false;\n      if (this.giverPresent(q.giver) === null) return false; // one of its offering NPCs must be present\n      if (q.requiresLedger\n        && (gateCtx.runLedger[q.requiresLedger] ?? 0) < 1 // THE CHARACTER'S QUESTS: the hand's own keys (questGateCtx)\n        && (this.account.ledger[q.requiresLedger] ?? 0) < 1) return false;\n      if (q.requiresQuests?.some(id => !this.completedQuests.has(id))) return false;\n      if (q.gate && !q.gate(gateCtx)) return false;\n      const cat = q.category ?? DEFAULT_QUEST_CATEGORY;\n      const cap = QUEST_CATEGORY_CAPS[cat];\n      if (cap != null && (counts[cat] ?? 0) >= cap) return false;\n      return true;\n    });\n  }",
      "after": "private eligibleQuestCandidates(): QuestDef[] { return sceneEligibleQuestCandidates(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "private vocationEngaged(vocId: string): boolean {\n    const v = VOCATIONS[vocId];\n    if (!v) return false;\n    return v.quest.steps.some((_, i) => (this.questRunLedger()[vocationStepKey(vocId, i + 1)] ?? 0) >= 1); // THE CHARACTER'S QUESTS\n  }",
      "after": "private vocationEngaged(vocId: string): boolean { return sceneVocationEngaged(this.nativeSceneQuestInteractionHost(),vocId); }"
    },
    {
      "before": "private isVocationChoice(q: QuestDef): boolean {\n    return q.vocation !== undefined && !this.vocationEngaged(q.vocation);\n  }",
      "after": "private isVocationChoice(q: QuestDef): boolean { return sceneIsVocationChoice(this.nativeSceneQuestInteractionHost(),q); }"
    },
    {
      "before": "private vocationChoiceOffers(): QuestDef[] {\n    return this.acceptableQuests().filter(q => this.isVocationChoice(q));\n  }",
      "after": "private vocationChoiceOffers(): QuestDef[] { return sceneVocationChoiceOffers(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "private nextAcceptableQuest(): QuestDef | null {\n    if (this.massRuntime?.config.settlement?.quests?.acceptance === 'journal') return null;\n    const avail = this.acceptableQuests().filter(q => !this.isVocationChoice(q));\n    if (!avail.length) return null;\n    for (let i = avail.length - 1; i > 0; i--) { const j = randInt(0, i); [avail[i], avail[j]] = [avail[j], avail[i]]; }\n    avail.sort((a, b) => a.offerAtLevel - b.offerAtLevel); // stable → equal-level ties keep shuffled order\n    return avail[0];\n  }",
      "after": "private nextAcceptableQuest(): QuestDef | null { return sceneNextAcceptableQuest(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "private updateQuestGiver(dt: number): void {\n    this.ensureQuestCargo();\n    // THE QUEST HAND (a hosted world): every standing player lingers at the giver for\n    // itself, on its own clock; the act and its pay are its own (the keeper never asks).\n    if (this.localSeat.keeper) {\n      for (const seat of this.handSeats()) this.questGiverStep(seat, dt);\n      // THE CHARACTER'S QUESTS on the Unbroken Wilds: every hero's own country quests settle\n      // at their places (the runtime's own settle walks the run's one ledger, the keeper's).\n      if (this.massRuntime) this.settleHeroMassQuests();\n      return;\n    }\n    if (!this.nearAnyQuestGiver()) this.questRewardShown = null;\n    if (this.player.dead || this.player.downed || !this.playerIdle()) {\n      this.questGiverDwell = 0;\n      // Stepping away re-arms the choice menu (a decline lasts one visit).\n      this.vocationOfferDeclined = false;\n      return;\n    }\n    const turnIns = this.pendingTurnIns();\n    const next = turnIns.length ? null : this.nextAcceptableQuest();\n    const choices = (!turnIns.length && !next && !this.vocationOfferDeclined)\n      ? this.vocationChoiceOffers() : [];\n    const odysseyLeads = this.graphWorkAvailable() && this.odyssey.hasLocalLeads() && this.nearQuestGiver();\n    if (!turnIns.length && !next && !choices.length && !odysseyLeads) { this.questGiverDwell = 0; return; }\n    this.questGiverDwell += dt;\n    if (this.questGiverDwell < QUESTGIVER_DWELL) return;\n    this.questGiverDwell = 0;\n    if (odysseyLeads) this.odyssey.localLeads();\n    if (turnIns.length) this.onQuestZoneCleared(turnIns[0]);\n    else if (next) this.acceptQuest(next);\n    else if (choices.length) this.vocationOfferRequested = true; // main loop opens the menu (once per dwell)\n  }",
      "after": "private updateQuestGiver(dt: number): void { return sceneUpdateQuestGiver(this.nativeSceneQuestInteractionHost(),dt); }"
    },
    {
      "before": "private questGiverStep(seat: Seat, dt: number): void {\n    this.withQuestHand(seat, () => {\n      if (!this.seatIdle(seat) || !this.nearAnyQuestGiver()) { this.questGiverDwells.delete(seat); return; }\n      const turnIns = this.pendingTurnIns();\n      const next = turnIns.length ? null : this.nextAcceptableQuest();\n      const leads = this.graphWorkAvailable() && this.odyssey.hasLocalLeads() && this.nearQuestGiver();\n      if (!turnIns.length && !next && !leads) { this.questGiverDwells.delete(seat); return; }\n      const t = (this.questGiverDwells.get(seat) ?? 0) + dt;\n      if (t < QUESTGIVER_DWELL) { this.questGiverDwells.set(seat, t); return; }\n      this.questGiverDwells.delete(seat);\n      const was = this.actingSeat;\n      this.actingSeat = seat; // THE ACTING SEAT: the linger is this seat's act (its party hears the news)\n      try {\n        if (leads) this.odyssey.localLeads();\n        if (turnIns.length) this.onQuestZoneCleared(turnIns[0]);\n        else if (next) this.acceptQuest(next);\n      } finally { this.actingSeat = was; }\n      this.journalDirty.add(seat.id); // THE JOURNAL ROW: the act re-ships at once\n    });\n  }",
      "after": "private questGiverStep(seat: Seat, dt: number): void { return sceneQuestGiverStep(this.nativeSceneQuestInteractionHost(),seat,dt); }"
    },
    {
      "before": "questOfferChoices(): import('../net/journalWire').JournalOfferW[] {\n    if (this.clientActionHook) return this.netJournal?.offers ?? []; // THE JOURNAL ROW: the host's judgment for this seat\n    const mass = this.massRuntime;\n    const hand = this.questHand().actor; // THE QUEST HAND\n    if (mass?.config.settlement?.quests?.acceptance !== 'journal'\n      || hand.dead || hand.downed) return [];\n    return this.acceptableQuests().filter(q => !this.isVocationChoice(q))\n      .sort((a,b) => this.questOfferLevel(a) - this.questOfferLevel(b) || a.id.localeCompare(b.id))\n      .map(q => {\n        const place = massQuestDestination(mass, q.id)!;\n        const giver = this.giverPresent(q.giver)!;\n        return {\n          questId: q.id, label: q.offerLabel, giver: MONSTERS[giver.defId!]?.name ?? giver.name,\n          target: massQuestTarget(mass, {questId:q.id,zoneId:MASS_ZONE,placeId:place.id,fieldDone:false}, hand.pos)!,\n          returnTo: q.turnIn ? (Array.isArray(q.turnIn.giver) ? q.turnIn.giver : [q.turnIn.giver])\n            .map(id => MONSTERS[id]?.name ?? id).join(' or ') : null,\n          xp: q.reward.xp ?? 0, passivePoints: q.reward.passivePoints ?? 0,\n          rewards: q.reward.choices?.map(c => c.name) ?? [],\n        };\n      });\n  }",
      "after": "questOfferChoices(): import('../net/journalWire').JournalOfferW[] { return sceneQuestOfferChoices(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "acceptQuestOffer(questId: string, seat: Seat = this.localSeat): boolean {\n    if (seat !== this.localSeat && !this.localSeat.keeper) return false; // keeperSeat: on a shard any seat may take a contract\n    return this.withQuestHand(seat, () => { // THE QUEST HAND: the giver, the gates and the level are the taker's\n      if (!this.questOfferChoices().some(q => q.questId === questId)) return false;\n      this.acceptQuest(QUESTS[questId]);\n      return this.activeQuests.some(q => q.questId === questId);\n    });\n  }",
      "after": "acceptQuestOffer(questId: string, seat: Seat = this.localSeat): boolean { return sceneAcceptQuestOffer(this.nativeSceneQuestInteractionHost(),questId,seat); }"
    },
    {
      "before": "acceptVocationQuest(questId: string, seat: Seat = this.localSeat): boolean {\n    const q = QUESTS[questId];\n    if (!q || q.vocation === undefined) return false;\n    // THE QUEST HAND (a hosted world): the chain opens to the asking seat's gates and level.\n    return this.withQuestHand(this.localSeat.keeper ? seat : this.localSeat, () => {\n      if (!this.acceptableQuests().some(x => x.id === questId)) return false;\n      this.acceptQuest(q);\n      return true;\n    });\n  }",
      "after": "acceptVocationQuest(questId: string, seat: Seat = this.localSeat): boolean { return sceneAcceptVocationQuest(this.nativeSceneQuestInteractionHost(),questId,seat); }"
    },
    {
      "before": "vocationMenuOffers(): {\n    questId: string; vocationId: string; name: string; blurb: string; color: string;\n    className: string; ownClass: boolean; steps: number; offerLabel: string;\n    secret: boolean; flavor?: string;\n  }[] {\n    return this.vocationChoiceOffers().map(q => {\n      const v = VOCATIONS[q.vocation!];\n      return {\n        questId: q.id, vocationId: v.id, name: v.name, blurb: v.blurb, color: v.color,\n        className: CLASSES.find(c => c.id === v.classId)?.name ?? v.classId,\n        ownClass: v.classId === this.meta.classDef.id,\n        steps: v.quest.steps.length, offerLabel: q.offerLabel,\n        secret: v.secret !== undefined, flavor: v.secret?.offerFlavor,\n      };\n    });\n  }",
      "after": "vocationMenuOffers(): {\n    questId: string; vocationId: string; name: string; blurb: string; color: string;\n    className: string; ownClass: boolean; steps: number; offerLabel: string;\n    secret: boolean; flavor?: string;\n  }[] { return sceneVocationMenuOffers(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "declineVocationOffer(): void { this.vocationOfferDeclined = true; }",
      "after": "declineVocationOffer(): void { return sceneDeclineVocationOffer(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "private acceptQuest(q: QuestDef): void {\n    if (this.massRuntime) {\n      const place = massQuestDestination(this.massRuntime, q.id);\n      if (!place || this.completedQuests.has(q.id) || this.activeQuests.some(e => e.questId === q.id)) return;\n      const entry: SavedQuestEntry = { questId: q.id, zoneId: MASS_ZONE, placeId: place.id,\n        fieldDone: false, directionsKnown: true };\n      this.activeQuests.push(entry);\n      this.questStamp('quests_accepted'); this.charDirty = true; // THE CHARACTER'S QUESTS\n      this.notice('Quest: ' + q.offerLabel + ' · ' + massQuestTarget(this.massRuntime, entry, this.questHand().actor.pos), '#c8a8e8', 16, 'civic'); // THE QUEST HAND\n      return;\n    }\n    if (q.geographies && !q.geographies.includes('zones')) return;\n    this.acceptOdysseyCompatibleQuest(q, true);\n  }",
      "after": "private acceptQuest(q: QuestDef): void { return sceneAcceptQuest(this.nativeSceneQuestInteractionHost(),q); }"
    },
    {
      "before": "questRewardOffers(): { questId: string; label: string; prompt: string; xp: number;\n    choices: (NonNullable<QuestDef['reward']['choices']>[number] & { lines: string[]; footprint: string })[] }[] {\n    if (this.clientActionHook && this.netJournal) return this.netJournal.rewards; // THE JOURNAL ROW\n    return this.pendingTurnIns().flatMap(aq => {\n      const q = this.questDefOf(aq.questId);\n      return q && (q.reward.choices?.length || q.reward.skillChoice) ? [{ questId: q.id, label: q.offerLabel,\n        prompt: q.reward.choicePrompt ?? 'Choose one item as your quest reward.', xp: q.reward.xp ?? 0,\n        choices: questRewardChoices(this.account, q).map(c => {\n          const item = this.questRewardItem(q, c.id, c);\n          const size = item ? itemGridSize(item) : { w: 1, h: 1 };\n          const rewardDescription = item ? describeItem(item) : undefined;\n          return { ...c, lines: rewardDescription ? [...rewardDescription.defense.map(l => l.text),\n            ...rewardDescription.implicit, ...rewardDescription.affix.map(l => l.text), ...rewardDescription.unique] : [],\n            footprint: `${size.w} × ${size.h}` };\n        }) }] : [];\n    });\n  }",
      "after": "questRewardOffers(): { questId: string; label: string; prompt: string; xp: number;\n    choices: (NonNullable<QuestDef['reward']['choices']>[number] & { lines: string[]; footprint: string })[] }[] { return sceneQuestRewardOffers(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "questImbueOffers(): import('../net/journalWire').JournalImbueW[] {\n    if (this.clientActionHook && this.netJournal) return this.netJournal.imbues; // THE JOURNAL ROW\n    const items = this.questHand().meta.items; // THE QUEST HAND: the asking seat's own magic pieces\n    return this.questImbues.map(reward => {\n      const q = QUESTS[reward.questId];\n      const near = !!q && this.giverPresent(q.turnIn?.giver ?? q.giver) !== null;\n      const givers = q?.turnIn?.giver ?? q?.giver;\n      const giverId = Array.isArray(givers) ? givers[0] : givers;\n      const giver = giverId ? MONSTERS[giverId]?.name ?? 'The giver' : 'The giver';\n      return { questId: reward.questId, level: reward.level, near, giver,\n        prompt: q?.reward.imbue?.prompt ?? 'Choose a magic piece to make finer.',\n        items: items.filter(item => item.rarity === 'magic' && !item.gem && !item.mem).map(item => ({\n          uid: item.uid, name: item.name, current: describeItem(item).affix.map(l => l.text),\n          options: imbueOptions(reward, item).map(a => ({ id: a.id,\n            lines: describeItem({ ...item, affixes: [a] }).affix.map(l => l.text),\n            unstudied: expertiseRank(this.account.craftLore, ITEM_AFFIXES[a.id].family) < 1,\n          })),\n        })),\n      };\n    });\n  }",
      "after": "questImbueOffers(): import('../net/journalWire').JournalImbueW[] { return sceneQuestImbueOffers(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "claimQuestImbue(questId: string, uid: number, affixId: string, seat: Seat = this.localSeat): boolean {\n    if ((seat !== this.localSeat && !this.localSeat.keeper) || this.clientActionHook || seat.actor.dead || seat.actor.downed) return false; // keeperSeat\n    const book = this.questLedgerOf(seat); // THE CHARACTER'S QUESTS: the claimant's own imbues (the run's one off a hosted world)\n    const reward = book.imbues.find(r => r.questId === questId), q = QUESTS[questId];\n    const giver = q && this.withQuestHand(seat, () => this.giverPresent(q.turnIn?.giver ?? q.giver)); // THE QUEST HAND: the giver by the claimant\n    if (!reward || !q || !giver) return false;\n    const item = this.bagItem(seat, uid);\n    const affix = item && imbueOptions(reward, item).find(a => a.id === affixId);\n    if (!item || !affix) return false;\n    const result = imbuedItem(item, affix);\n    seat.meta.items = seat.meta.items.map(i => i.uid === uid ? result : i);\n    book.imbues = book.imbues.filter(r => r !== reward);\n    this.markMetaDirty(seat);\n    this.notice(`${result.name} — ${giver.name ?? 'the giver'}’s promise is kept.`, ITEM_RARITIES.rare.color, 16, 'civic');\n    saveCharacter(this);\n    return true;\n  }",
      "after": "claimQuestImbue(questId: string, uid: number, affixId: string, seat: Seat = this.localSeat): boolean { return sceneClaimQuestImbue(this.nativeSceneQuestInteractionHost(),questId,uid,affixId,seat); }"
    },
    {
      "before": "reliquaryLesson(): boolean {\n    return this.account.features.has(FEATURE.RELIQUARY)\n      && (this.account.ledger[RELIQUARY_LESSON] ?? 0) < 1;\n  }",
      "after": "reliquaryLesson(): boolean { return sceneReliquaryLesson(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "seatIdle(seat: Seat): boolean {\n    return this.time - seat.lastActedAt >= DWELL_IDLE_GRACE\n      && seat.actor.isQuiescent();\n  }",
      "after": "seatIdle(seat: Seat): boolean { return sceneSeatIdle(this.nativeSceneQuestInteractionHost(),seat); }"
    },
    {
      "before": "playerIdle(): boolean {\n    return this.seatIdle(this.localSeat);\n  }",
      "after": "playerIdle(): boolean { return scenePlayerIdle(this.nativeSceneQuestInteractionHost()); }"
    },
    {
      "before": "export class World {\n",
      "after": "export class World {\n  declare private nativeSceneQuestInteractionView?:NativeSceneQuestInteractionHost;\n  private nativeSceneQuestInteractionHost():NativeSceneQuestInteractionHost {\n   if(this.nativeSceneQuestInteractionView)return this.nativeSceneQuestInteractionView;\n   const world=this;\n   const host:NativeSceneQuestInteractionHost={\n  get time(){return world.time;},\n  get acceptOdysseyCompatibleQuest(){const fn=world.acceptOdysseyCompatibleQuest;return(...args:Parameters<NativeSceneQuestInteractionHost['acceptOdysseyCompatibleQuest']>)=>fn.apply(world,args);},\n  get acceptQuest(){const fn=world.acceptQuest;return(...args:Parameters<NativeSceneQuestInteractionHost['acceptQuest']>)=>fn.apply(world,args);},\n  get acceptableQuests(){const fn=world.acceptableQuests;return(...args:Parameters<NativeSceneQuestInteractionHost['acceptableQuests']>)=>fn.apply(world,args);},\n  get account(){return world.account;},\n  get actingSeat(){return world.actingSeat;},set actingSeat(value){world.actingSeat=value;},\n  get activeCategoryCounts(){const fn=world.activeCategoryCounts;return(...args:Parameters<NativeSceneQuestInteractionHost['activeCategoryCounts']>)=>fn.apply(world,args);},\n  get activeQuests(){return world.activeQuests;},\n  get actors(){return world.actors;},\n  get bagItem(){const fn=world.bagItem;return(...args:Parameters<NativeSceneQuestInteractionHost['bagItem']>)=>fn.apply(world,args);},\n  get charDirty(){return world.charDirty;},set charDirty(value){world.charDirty=value;},\n  get clientActionHook(){return world.clientActionHook;},\n  get completedQuests(){return world.completedQuests;},\n  get dwellReachable(){const fn=world.dwellReachable;return(...args:Parameters<NativeSceneQuestInteractionHost['dwellReachable']>)=>fn.apply(world,args);},\n  get eligibleQuestCandidates(){const fn=world.eligibleQuestCandidates;return(...args:Parameters<NativeSceneQuestInteractionHost['eligibleQuestCandidates']>)=>fn.apply(world,args);},\n  get ensureQuestCargo(){const fn=world.ensureQuestCargo;return(...args:Parameters<NativeSceneQuestInteractionHost['ensureQuestCargo']>)=>fn.apply(world,args);},\n  get getQuestGiver(){const fn=world.getQuestGiver;return(...args:Parameters<NativeSceneQuestInteractionHost['getQuestGiver']>)=>fn.apply(world,args);},\n  get giverPresent(){const fn=world.giverPresent;return(...args:Parameters<NativeSceneQuestInteractionHost['giverPresent']>)=>fn.apply(world,args);},\n  get graphWorkAvailable(){const fn=world.graphWorkAvailable;return(...args:Parameters<NativeSceneQuestInteractionHost['graphWorkAvailable']>)=>fn.apply(world,args);},\n  get handSeats(){const fn=world.handSeats;return(...args:Parameters<NativeSceneQuestInteractionHost['handSeats']>)=>fn.apply(world,args);},\n  get heroKnown(){const fn=world.heroKnown;return(...args:Parameters<NativeSceneQuestInteractionHost['heroKnown']>)=>fn.apply(world,args);},\n  get isVocationChoice(){const fn=world.isVocationChoice;return(...args:Parameters<NativeSceneQuestInteractionHost['isVocationChoice']>)=>fn.apply(world,args);},\n  get journalDirty(){return world.journalDirty;},\n  get localSeat(){return world.localSeat;},\n  get manifest(){return world.manifest;},\n  get markMetaDirty(){const fn=world.markMetaDirty;return(...args:Parameters<NativeSceneQuestInteractionHost['markMetaDirty']>)=>fn.apply(world,args);},\n  get massRuntime(){return world.massRuntime;},\n  get meta(){return world.meta;},\n  get nearAnyQuestGiver(){const fn=world.nearAnyQuestGiver;return(...args:Parameters<NativeSceneQuestInteractionHost['nearAnyQuestGiver']>)=>fn.apply(world,args);},\n  get nearQuestGiver(){const fn=world.nearQuestGiver;return(...args:Parameters<NativeSceneQuestInteractionHost['nearQuestGiver']>)=>fn.apply(world,args);},\n  get netJournal(){return world.netJournal;},\n  get nextAcceptableQuest(){const fn=world.nextAcceptableQuest;return(...args:Parameters<NativeSceneQuestInteractionHost['nextAcceptableQuest']>)=>fn.apply(world,args);},\n  get notice(){const fn=world.notice;return(...args:Parameters<NativeSceneQuestInteractionHost['notice']>)=>fn.apply(world,args);},\n  get odyssey(){return world.odyssey;},\n  get onQuestZoneCleared(){const fn=world.onQuestZoneCleared;return(...args:Parameters<NativeSceneQuestInteractionHost['onQuestZoneCleared']>)=>fn.apply(world,args);},\n  get pendingTurnIns(){const fn=world.pendingTurnIns;return(...args:Parameters<NativeSceneQuestInteractionHost['pendingTurnIns']>)=>fn.apply(world,args);},\n  get player(){return world.player;},\n  get playerIdle(){const fn=world.playerIdle;return(...args:Parameters<NativeSceneQuestInteractionHost['playerIdle']>)=>fn.apply(world,args);},\n  get questDefOf(){const fn=world.questDefOf;return(...args:Parameters<NativeSceneQuestInteractionHost['questDefOf']>)=>fn.apply(world,args);},\n  get questGateCtx(){const fn=world.questGateCtx;return(...args:Parameters<NativeSceneQuestInteractionHost['questGateCtx']>)=>fn.apply(world,args);},\n  get questGiverDwell(){return world.questGiverDwell;},set questGiverDwell(value){world.questGiverDwell=value;},\n  get questGiverDwells(){return world.questGiverDwells;},\n  get questGiverStep(){const fn=world.questGiverStep;return(...args:Parameters<NativeSceneQuestInteractionHost['questGiverStep']>)=>fn.apply(world,args);},\n  get questHand(){const fn=world.questHand;return(...args:Parameters<NativeSceneQuestInteractionHost['questHand']>)=>fn.apply(world,args);},\n  get questImbues(){return world.questImbues;},\n  get questLedgerOf(){const fn=world.questLedgerOf;return(...args:Parameters<NativeSceneQuestInteractionHost['questLedgerOf']>)=>fn.apply(world,args);},\n  get questOfferChoices(){const fn=world.questOfferChoices;return(...args:Parameters<NativeSceneQuestInteractionHost['questOfferChoices']>)=>fn.apply(world,args);},\n  get questOfferLevel(){const fn=world.questOfferLevel;return(...args:Parameters<NativeSceneQuestInteractionHost['questOfferLevel']>)=>fn.apply(world,args);},\n  get questRewardItem(){const fn=world.questRewardItem;return(...args:Parameters<NativeSceneQuestInteractionHost['questRewardItem']>)=>fn.apply(world,args);},\n  get questRewardOffers(){const fn=world.questRewardOffers;return(...args:Parameters<NativeSceneQuestInteractionHost['questRewardOffers']>)=>fn.apply(world,args);},\n  get questRewardShown(){return world.questRewardShown;},set questRewardShown(value){world.questRewardShown=value;},\n  get questRunLedger(){const fn=world.questRunLedger;return(...args:Parameters<NativeSceneQuestInteractionHost['questRunLedger']>)=>fn.apply(world,args);},\n  get questStamp(){const fn=world.questStamp;return(...args:Parameters<NativeSceneQuestInteractionHost['questStamp']>)=>fn.apply(world,args);},\n  get reliquaryLesson(){const fn=world.reliquaryLesson;return(...args:Parameters<NativeSceneQuestInteractionHost['reliquaryLesson']>)=>fn.apply(world,args);},\n  get seatIdle(){const fn=world.seatIdle;return(...args:Parameters<NativeSceneQuestInteractionHost['seatIdle']>)=>fn.apply(world,args);},\n  get settleHeroMassQuests(){const fn=world.settleHeroMassQuests;return(...args:Parameters<NativeSceneQuestInteractionHost['settleHeroMassQuests']>)=>fn.apply(world,args);},\n  get storyPair(){const fn=world.storyPair;return(...args:Parameters<NativeSceneQuestInteractionHost['storyPair']>)=>fn.apply(world,args);},\n  get vocationChoiceOffers(){const fn=world.vocationChoiceOffers;return(...args:Parameters<NativeSceneQuestInteractionHost['vocationChoiceOffers']>)=>fn.apply(world,args);},\n  get vocationEngaged(){const fn=world.vocationEngaged;return(...args:Parameters<NativeSceneQuestInteractionHost['vocationEngaged']>)=>fn.apply(world,args);},\n  get vocationOfferDeclined(){return world.vocationOfferDeclined;},set vocationOfferDeclined(value){world.vocationOfferDeclined=value;},\n  get vocationOfferRequested(){return world.vocationOfferRequested;},set vocationOfferRequested(value){world.vocationOfferRequested=value;},\n  get withQuestHand(){const fn=world.withQuestHand;return <T>(seat:Seat,action:()=>T):T=>fn.call(world,seat,action) as T;},\n  get characterWriter(){return world;},\n   };\n   Object.defineProperty(this,'nativeSceneQuestInteractionView',{value:host,writable:true,configurable:true,enumerable:false});\n   return host;\n  }\n"
    },
    {
      "before": "import {nextItemUid,compileItemMods,itemLevelReq,rebuildItem,rollItem,describeItem,itemGridSize} from './itemgen';",
      "after": "import {nextItemUid,compileItemMods,itemLevelReq,rebuildItem,rollItem,itemGridSize} from './itemgen';"
    },
    {
      "before": "import {VOCATIONS,VOCATION_CFG,vocationDiscoveryKey,vocationLedgerKey,vocationStepKey,type VocationSiteFilter} from '../data/vocations';",
      "after": "import {VOCATIONS,VOCATION_CFG,vocationDiscoveryKey,vocationLedgerKey,type VocationSiteFilter} from '../data/vocations';"
    },
    {
      "before": "import {imbuedItem,imbueOptions,restoreQuestImbues,type QuestImbue} from './questImbue';",
      "after": "import {restoreQuestImbues,type QuestImbue} from './questImbue';"
    },
    {
      "before": "import { questRewardChoices } from './questRewardChoices';\nimport { passiveRefund } from './passiveRefund';",
      "after": "import { passiveRefund } from './passiveRefund';"
    }
  ],
  "originalBehaviorReceipt": "62af559419c7458b97e815ba77176fca502d8441f885bf3088a3682058e10d6b",
  "originalExactReceipt": "7b15c1be7496f4664d5e658b6d530a1c6177f8599f05184bed80d7c326c85ee1",
  "odysseyIntegration": [
    {
      "before": "hasLocalLeads(): boolean { const s = this.campaign(); return this.w.graphWorkAvailable() && !!s && this.leadsOf(s).length < s.roster.length; }",
      "after": "hasLocalLeads(): boolean {return this.nativeQuestCore().hasLocalLeads();}"
    },
    {
      "before": "localLeads(): void {\n    const s = this.campaign(); // THE WORLD'S HALF: a unit reads the keeper's campaign\n    if (!s) return;\n    for (const id of s.roster) this.reveal(id);\n    this.revealRevenge();\n  }",
      "after": "localLeads(): void {return this.nativeQuestCore().localLeads();}"
    },
    {
      "before": "  /** THE CHARACTER'S QUESTS: the leads a read or act answers (the hand's own on a hosted world). */\n  private leadsOf(s: OdysseyState): string[] {return this.nativeQuestCore().leadsOf(s);}\n\n  /** The giver recognizes existing opportunities; never mints a second target. */",
      "after": "  /** The giver recognizes existing opportunities; never mints a second target. */"
    },
    {
      "before": "  private revealRevenge(): void {return this.nativeQuestCore().revealRevenge();}\n  reveal(id: string): void {return this.nativeQuestCore().reveal(id);}",
      "after": "  reveal(id: string): void {return this.nativeQuestCore().reveal(id);}"
    }
  ],
  "removedOdysseyWrappers": [
    {
      "name": "leadsOf",
      "member": "private leadsOf(s: OdysseyState): string[] {return this.nativeQuestCore().leadsOf(s);}"
    },
    {
      "name": "revealRevenge",
      "member": "private revealRevenge(): void {return this.nativeQuestCore().revealRevenge();}"
    }
  ]
} as const;
export const nativeSceneQuestInteractionArchiveHash="dcdc21017987adfb27a47f6f30fd38cde65486a059643d9a55a96899f1604042";
