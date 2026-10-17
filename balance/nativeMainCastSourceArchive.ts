/** Exact reviewed casting-visual successor and prior source boundaries. */
export const nativeMainCastSourceArchive = {
  "parent": "a5a0266946e17a9de0a326be3596992245b6bc70",
  "main": "dc56030f3594533fec8712d55977d17f5bd03d1b",
  "rows": [
    {
      "file": "balance/probe_companioncues.ts",
      "beforeHash": "8abeca0a35f01b7a367ae2d0a5a002a6b640c2d9732ca1b4184630b367970bc6",
      "afterHash": "f1cf75ad3be66da265ca838d2852fb938c56aaf7421eeb5c9f939b4cd5767037",
      "rawBeforeHash": "8abeca0a35f01b7a367ae2d0a5a002a6b640c2d9732ca1b4184630b367970bc6",
      "rawAfterHash": "f1cf75ad3be66da265ca838d2852fb938c56aaf7421eeb5c9f939b4cd5767037",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { seedGlobalRandom } from '../src/sim/rng';\nimport { makeSkillInstance, type TameEffect } from '../src/engine/skills';\nimport { mod } from '../src/engine/stats';\nimport { companionCueState, companionCueFlash, companionMaterial } from '../src/engine/companionCues';\nimport { procCueRows } from '../src/engine/procCues';\nimport { SKILLS } from '../src/data/skills';\nimport { SUPPORTS } from '../src/data/supports';\nimport { MONSTERS } from '../src/data/monsters';\n",
          "after": "import { seedGlobalRandom } from '../src/sim/rng';\nimport { makeSkillInstance, type TameEffect } from '../src/engine/skills';\nimport { mod } from '../src/engine/stats';\nimport { companionCueState, companionCueFlash, companionMaterial } from '../src/engine/companionCues';\nimport { updateAI } from '../src/engine/ai';\nimport { procCueRows } from '../src/engine/procCues';\nimport { SKILLS } from '../src/data/skills';\nimport { SUPPORTS } from '../src/data/supports';\nimport { MONSTERS } from '../src/data/monsters';\n"
        },
        {
          "before": "  w['tryTame'](p, inst, a, fx);\n  check('hard rejection preserves wildness and snaps a binding', !a.owner && w.flashes.some(f => f.companionCue?.event === 'reject'));\n  check('tame rejection never uses the damage-resistance cue', !w.flashes.some(f => f.combatCue?.style === 'resist'));\n  w.flashes = []; a.life *= .1; w['tryTame'](p, inst, a, fx);\n  check('successful claim wears the real keeper endpoint', a.companion && a.owner === p && companionCueState(a, w).links[0]?.to.id === p.id);\n  check('settled claim records a distinct bind event and collar', w.flashes.some(f => f.companionCue?.event === 'bind') && a.extraParts?.some(x => x.kind === 'collar'));\n  for (const [id, profile] of [['aggressive','hunt'], ['defensive','guard'], ['passive','heel']]) {\n    w.setCompanionStance(w.localSeat, inst.def.id, id);\n    check(id + ' has a distinct persistent posture', companionCueState(a, w).stance?.profile === profile);\n  }\n  const before = JSON.stringify([a.life, a.sheet.sourceNames(), a.standingOrder]); companionCueState(a, w);\n  check('presentation reads cannot change conduct or stats', before === JSON.stringify([a.life, a.sheet.sourceNames(), a.standingOrder]));\n  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);\n  const mirror = client.actors[snap.actors.findIndex(x => x.id === a.id)];\n  check('co-op resolves keeper identity through local actor IDs', companionCueState(mirror, client).links[0]?.to.id === client.player.id && companionCueState(mirror, client).stance?.profile === 'heel');\n  client.player.pos.x += 31;\n",
          "after": "  w['tryTame'](p, inst, a, fx);\n  check('hard rejection preserves wildness and snaps a binding', !a.owner && w.flashes.some(f => f.companionCue?.event === 'reject'));\n  check('tame rejection never uses the damage-resistance cue', !w.flashes.some(f => f.combatCue?.style === 'resist'));\n  w.flashes = []; a.life *= .1; w['tryTame'](p, inst, a, fx);\n  check('successful claim preserves ownership without a permanent leash', a.companion && a.owner === p && !companionCueState(a, w).links.length);\n  check('settled claim records a distinct bind event and collar', w.flashes.some(f => f.companionCue?.event === 'bind') && a.extraParts?.some(x => x.kind === 'collar'));\n  for (const [id, profile] of [['aggressive','hunt'], ['defensive','guard'], ['passive','heel']]) {\n    w.setCompanionStance(w.localSeat, inst.def.id, id);\n    check(id + ' has a distinct persistent posture', companionCueState(a, w).stance?.profile === profile);\n  }\n  const before = JSON.stringify([a.life, a.sheet.sourceNames(), a.standingOrder]); companionCueState(a, w);\n  check('presentation reads cannot change conduct or stats', before === JSON.stringify([a.life, a.sheet.sourceNames(), a.standingOrder]));\n  a.anchored = false; a.pos.x += 300; w.walk = null;\n  updateAI(a, w, .05);\n  check('real passive heel movement shows the keeper endpoint', companionCueState(a, w).links[0]?.to.id === p.id);\n  const client = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(client, snap);\n  const mirror = client.actors[snap.actors.findIndex(x => x.id === a.id)];\n  check('co-op resolves keeper identity through local actor IDs', companionCueState(mirror, client).links[0]?.to.id === client.player.id && companionCueState(mirror, client).stance?.profile === 'heel');\n  client.player.pos.x += 31;\n"
        },
        {
          "before": "  snap.actors.find(x => x.id === a.id)!.companionCues!.links[0].to.x = -99;\n  check('nested wire endpoint copies cannot mutate the host', companionCueState(a, w).links[0].to.x === p.pos.x);\n  w.kill(a);\n  check('companion down remains incapacitation, not death', a.downed && !a.dead && !w.corpses.length && w.flashes.some(f => f.companionCue?.event === 'down'));\n  check('fallen bodies retain ownership but stop showing active stance', !!companionCueState(a, w).links.length && !companionCueState(a, w).stance);\n  w.reviveCompanion(a);\n  check('revival keeps the established life fraction and immunity budget', !a.downed && near(a.life, a.maxLife() * .5) && a.statuses.some(s => s.id === 'companion_recovery' && near(s.remaining, 3)));\n  check('revival adds a motion without a new targetability/AI hold', w.emergences.some(e => e.actorId === a.id && e.spec.motion === 'stir' && !e.held) && a.emergeUntil === undefined);\n  const recoveredSnap = serializeSnapshot(w, 2); applySnapshot(client, recoveredSnap);\n",
          "after": "  snap.actors.find(x => x.id === a.id)!.companionCues!.links[0].to.x = -99;\n  check('nested wire endpoint copies cannot mutate the host', companionCueState(a, w).links[0].to.x === p.pos.x);\n  w.kill(a);\n  check('companion down remains incapacitation, not death', a.downed && !a.dead && !w.corpses.length && w.flashes.some(f => f.companionCue?.event === 'down'));\n  check('fallen bodies retain ownership but stop showing active stance', !companionCueState(a, w).links.length && !companionCueState(a, w).stance);\n  w.reviveCompanion(a);\n  check('revival keeps the established life fraction and immunity budget', !a.downed && near(a.life, a.maxLife() * .5) && a.statuses.some(s => s.id === 'companion_recovery' && near(s.remaining, 3)));\n  check('revival adds a motion without a new targetability/AI hold', w.emergences.some(e => e.actorId === a.id && e.spec.motion === 'stir' && !e.held) && a.emergeUntil === undefined);\n  const recoveredSnap = serializeSnapshot(w, 2); applySnapshot(client, recoveredSnap);\n"
        },
        {
          "before": "  a.addBuff({ type: 'buff', id: 'life_bond_probe', duration: 4, mods: [] }); p.bond = { targetId: a.id, buffId: 'life_bond_probe' };\n  check('life-sharing tether follows its actual buff recipient', companionCueState(p, w).links.some(l => l.kind === 'mend' && l.to.id === a.id));\n  a.removeBuff('life_bond_probe');\n  check('expired life-sharing buff clears its line immediately', !companionCueState(p, w).links.length);\n  b.owner = p; b.sourceSkillId = '__dominate:probe';\n  check('dominated allegiance has chained ownership geometry', companionCueState(b, w).links[0].profile === 'thrall');\n  const mark = makeSkillInstance(Object.values(SKILLS).find(s => s.delivery.type === 'mark')!); p.skills = [mark];\n  check('Mark fixture exists', !!mark.def);\n  w.executeSkill(p, mark, { x: 750, y: 700 });\n",
          "after": "  a.addBuff({ type: 'buff', id: 'life_bond_probe', duration: 4, mods: [] }); p.bond = { targetId: a.id, buffId: 'life_bond_probe' };\n  check('life-sharing tether follows its actual buff recipient', companionCueState(p, w).links.some(l => l.kind === 'mend' && l.to.id === a.id));\n  a.removeBuff('life_bond_probe');\n  check('expired life-sharing buff clears its line immediately', !companionCueState(p, w).links.length);\n  b.owner = p; b.sourceSkillId = '__dominate:probe'; b.companionReturnTo = p.id;\n  check('dominated allegiance has chained ownership geometry', companionCueState(b, w).links[0].profile === 'thrall');\n  const mark = makeSkillInstance(Object.values(SKILLS).find(s => s.delivery.type === 'mark')!); p.skills = [mark];\n  check('Mark fixture exists', !!mark.def);\n  w.executeSkill(p, mark, { x: 750, y: 700 });\n"
        },
        {
          "before": "  const ctx = new Proxy({ globalAlpha: 1, save: () => { depth++; }, restore: () => { depth--; }, stroke: () => { strokes++; }, fillText: () => { labels++; } },\n    { get: (o, k) => k in o ? o[k as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;\n  const { w, p, inst, beast } = rig(), a = beast(); w.tameCompanion(p, a, inst.def.id);\n  for (const s of Object.keys(COMPANION_STANCES)) { w.setCompanionStance(w.localSeat, inst.def.id, s); drawCompanionCueBody(ctx, companionCueState(a, w), 16, 0); }\n  drawCompanionCueLinks(ctx, { ...a.pos, radius: a.radius }, companionCueState(a, w).links[0], 1);\n  const f = companionCueFlash(a, 'sever', p)!; drawCompanionCueFlash(ctx, f);\n  check('relationship shapes draw without captions or leaked context', strokes > 5 && depth === 0 && labels === 0);\n  check('new outcomes survive the existing flash wire', serializeSnapshot(w, 1).flashes.some(f => f.companionCue?.event === 'bind'));\n",
          "after": "  const ctx = new Proxy({ globalAlpha: 1, save: () => { depth++; }, restore: () => { depth--; }, stroke: () => { strokes++; }, fillText: () => { labels++; } },\n    { get: (o, k) => k in o ? o[k as keyof typeof o] : () => {} }) as unknown as CanvasRenderingContext2D;\n  const { w, p, inst, beast } = rig(), a = beast(); w.tameCompanion(p, a, inst.def.id);\n  for (const s of Object.keys(COMPANION_STANCES)) { w.setCompanionStance(w.localSeat, inst.def.id, s); drawCompanionCueBody(ctx, companionCueState(a, w), 16, 0); }\n  a.companionReturnTo = p.id;\n  drawCompanionCueLinks(ctx, { ...a.pos, radius: a.radius }, companionCueState(a, w).links[0], 1);\n  const f = companionCueFlash(a, 'sever', p)!; drawCompanionCueFlash(ctx, f);\n  check('relationship shapes draw without captions or leaked context', strokes > 5 && depth === 0 && labels === 0);\n  check('new outcomes survive the existing flash wire', serializeSnapshot(w, 1).flashes.some(f => f.companionCue?.event === 'bind'));\n"
        },
        {
          "before": "  const hit = makeSkillInstance(SKILLS.claw);\n  hit.sockets = [{ def: { ...SUPPORTS.dominating_blow, dominate: { chance: 1, duration: 12, max: 3 } }, level: 1 }];\n  w['resolveHit'](p, hit, victim, 100, 0, undefined, true);\n  const thrall = w.actors.find(a => a.owner === p && a.sourceSkillId === '__dominate:claw');\n  check('actual dominating kill gives its replacement a keeper and unheld arrival', victim.dead && !!thrall && companionCueState(thrall, w).links[0]?.profile === 'thrall'\n    && w.emergences.some(e => e.actorId === thrall.id && !e.held));\n}\n{\n  const { w, beast } = rig(), matron = beast('gnoll_matron', 800), ward = beast('gnoll_prowler', 850);\n",
          "after": "  const hit = makeSkillInstance(SKILLS.claw);\n  hit.sockets = [{ def: { ...SUPPORTS.dominating_blow, dominate: { chance: 1, duration: 12, max: 3 } }, level: 1 }];\n  w['resolveHit'](p, hit, victim, 100, 0, undefined, true);\n  const thrall = w.actors.find(a => a.owner === p && a.sourceSkillId === '__dominate:claw');\n  check('actual dominating kill gives its replacement a keeper and unheld arrival', victim.dead && !!thrall && !companionCueState(thrall, w).links.length\n    && w.emergences.some(e => e.actorId === thrall.id && !e.held));\n}\n{\n  const { w, beast } = rig(), matron = beast('gnoll_matron', 800), ward = beast('gnoll_prowler', 850);\n"
        }
      ]
    },
    {
      "file": "balance/probe_selfvisuals.ts",
      "beforeHash": "5d99c07ec30b8a64ef3c7bac2144321b2187980f0dc158f5ecb3244ed77888c1",
      "afterHash": "583c43c9aa28adbfc4fb1aa002b26f6b8880cda692b9e070d54e88fdccdec7c8",
      "rawBeforeHash": "5d99c07ec30b8a64ef3c7bac2144321b2187980f0dc158f5ecb3244ed77888c1",
      "rawAfterHash": "583c43c9aa28adbfc4fb1aa002b26f6b8880cda692b9e070d54e88fdccdec7c8",
      "crlfLines": [],
      "hunks": [
        {
          "before": "for (const id of ['war_cry', 'surgewind', 'shield_up', 'spiked_bulwark', 'cold_snap']) {\n  const { w, p, skill } = rig(), inst = skill(id); p.skills = [inst];\n  assert(w.useSkill(p, inst, { x: 820, y: 700 }), id);\n  for (let i = 0; i < 8; i++) w.update(1 / 60);\n  const cue = castingCueOf(p); check(id + ': native held/charging signature', cue?.skillId === id);\n  if (id === 'surgewind') assert.equal(cue!.fill, castingCompletion(p));\n  const peer = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(peer, snap);\n  const mirror = peer.actors[snap.actors.findIndex(a => a.id === p.id)];\n  assert.deepEqual(castingCueOf(mirror), cue); check(id + ': co-op uses the host-resolved preparation', true);\n",
          "after": "for (const id of ['war_cry', 'surgewind', 'shield_up', 'spiked_bulwark', 'cold_snap']) {\n  const { w, p, skill } = rig(), inst = skill(id); p.skills = [inst];\n  assert(w.useSkill(p, inst, { x: 820, y: 700 }), id);\n  for (let i = 0; i < 8; i++) w.update(1 / 60);\n  const cue = castingCueOf(p);\n  if (id === 'war_cry') check('ordinary nonspell War Cry keeps its body animation without spell preparation', !cue);\n  else check(id + ': native spell/guard signature', cue?.skillId === id);\n  if (id === 'surgewind') assert.equal(cue!.fill, castingCompletion(p));\n  const peer = rig().w, snap = serializeSnapshot(w, 1); applySnapshot(peer, snap);\n  const mirror = peer.actors[snap.actors.findIndex(a => a.id === p.id)];\n  assert.deepEqual(castingCueOf(mirror), cue); check(id + ': co-op uses the host-resolved preparation', true);\n"
        }
      ]
    },
    {
      "file": "docs/design/skill-visual-sweep.md",
      "beforeHash": "c091e5324ecfafb75fe276409cd610dfedf1acca1b1bcd098572fd0b008091f7",
      "afterHash": "3e63bc77edc94362ae0b6bc6dc944ae0c1e43db7145098c4735d2f9025d5658d",
      "rawBeforeHash": "c091e5324ecfafb75fe276409cd610dfedf1acca1b1bcd098572fd0b008091f7",
      "rawAfterHash": "3e63bc77edc94362ae0b6bc6dc944ae0c1e43db7145098c4735d2f9025d5658d",
      "crlfLines": [],
      "hunks": [
        {
          "before": "- Existing hidden `balance/feeding-cues-ui.cjs` after its probe and build.\n\nBefore transferring to seamless, re-run integration checks against its current\nhead. Do not merge the entire content-divergent branch to carry these visuals.\n",
          "after": "- Existing hidden `balance/feeding-cues-ui.cjs` after its probe and build.\n\nBefore transferring to seamless, re-run integration checks against its current\nhead. Do not merge the entire content-divergent branch to carry these visuals.\n\n## Seamless preparation and return follow-up\n\nThe [seamless in-game sweep](seamless-visual-sweep.md) records the 954-skill\ncoverage census, 22 real cast courses, player-only preparation families, the\nsaved Wardrobe switch and return-only summon links. It is a focused follow-up\non a separate seamless-based branch; ongoing native-area work stays isolated.\n"
        }
      ]
    },
    {
      "file": "src/engine/actor.ts",
      "beforeHash": "ad850f64944a0801d2d5b99a66ce984f4e79f9c0dfebb00078e23d48648c2880",
      "afterHash": "0d5769530cb899fe0328158d70312b80e916753f014e9fec02e1874bdf570dcf",
      "rawBeforeHash": "ad850f64944a0801d2d5b99a66ce984f4e79f9c0dfebb00078e23d48648c2880",
      "rawAfterHash": "0d5769530cb899fe0328158d70312b80e916753f014e9fec02e1874bdf570dcf",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  /** EXPONENTIAL UNLIFE (decay minions): stamped at spawn; life drains at\n   *  dps0 × growth^t once t > 0 — a survival meter, not damage. */\n  decay?: { t: number; dps0: number; growth: number };\n  /** Leash-recall scratch: progress sampling + re-port cooldown. */\n  recallTimer = 0;\n  lastProgress?: { x: number; y: number; at: number };\n  /** OVERDRIVE lanes (debt-as-reservation, the inverted energy shield):\n   *  idle counts DOWN to the repayment window; debt melts in updateTimers. */\n",
          "after": "  /** EXPONENTIAL UNLIFE (decay minions): stamped at spawn; life drains at\n   *  dps0 × growth^t once t > 0 — a survival meter, not damage. */\n  decay?: { t: number; dps0: number; growth: number };\n  /** Leash-recall scratch: progress sampling + re-port cooldown. */\n  /** Paint-only return intent, refreshed by the real AI each tick; never saved. */\n  companionReturnTo?: number;\n  recallTimer = 0;\n  lastProgress?: { x: number; y: number; at: number };\n  /** OVERDRIVE lanes (debt-as-reservation, the inverted energy shield):\n   *  idle counts DOWN to the repayment window; debt melts in updateTimers. */\n"
        }
      ]
    },
    {
      "file": "src/engine/ai.ts",
      "beforeHash": "b52d0a692f20325022a65ae5fb5c82084222151145fa30aa2d638e4125b04eaf",
      "afterHash": "244e71f3c54ec57692bdaaab55e1ef243abc84344de8296caf26721cb3a09148",
      "rawBeforeHash": "b52d0a692f20325022a65ae5fb5c82084222151145fa30aa2d638e4125b04eaf",
      "rawAfterHash": "244e71f3c54ec57692bdaaab55e1ef243abc84344de8296caf26721cb3a09148",
      "crlfLines": [],
      "hunks": [
        {
          "before": "    actor.aiTargetId = undefined;\n    throngHeelOffset(actor, world.time, THRONG_HEEL_OFF);\n    const goal = { x: keeper.pos.x + THRONG_HEEL_OFF.x,\n      y: keeper.pos.y + THRONG_HEEL_OFF.y, tier: keeper.tier };\n    if (dist(actor.pos, goal) > 24) moveToward(actor, world, goal, dt);\n    return 'consumed';\n  },\n});\n\n",
          "after": "    actor.aiTargetId = undefined;\n    throngHeelOffset(actor, world.time, THRONG_HEEL_OFF);\n    const goal = { x: keeper.pos.x + THRONG_HEEL_OFF.x,\n      y: keeper.pos.y + THRONG_HEEL_OFF.y, tier: keeper.tier };\n    if (dist(actor.pos, goal) > 24) {\n      actor.companionReturnTo = keeper.id;\n      moveToward(actor, world, goal, dt);\n    }\n    return 'consumed';\n  },\n});\n\n"
        },
        {
          "before": "\n// === THE PIPELINE ==============================================================\n\nexport function updateAI(actor: Actor, world: NativeSceneAIHost, dt: number): void {\n  actor.feedingMeal = undefined; // feedingCue posture ends even on an early AI refusal.\n  if (actor.summonReform) return;\n  ensureMovementTether(actor);\n  if (refreshMovementTether(actor, world)?.returning) return;\n",
          "after": "\n// === THE PIPELINE ==============================================================\n\nexport function updateAI(actor: Actor, world: NativeSceneAIHost, dt: number): void {\n  actor.companionReturnTo = undefined; // no stale return line through any early exit\n  actor.feedingMeal = undefined; // feedingCue posture ends even on an early AI refusal.\n  if (actor.summonReform) return;\n  ensureMovementTether(actor);\n  if (refreshMovementTether(actor, world)?.returning) return;\n"
        },
        {
          "before": "      // a reserved golem must never rot in a wall. Safe by construction:\n      // this branch only runs with NO target, and an armed bomber fuse\n      // early-returns long before the heel.\n      if (actor.isMinion() && updateRecall(actor, world, dt)) return;\n      actor.facing = angleTo(actor.pos, heelGoal);\n      moveToward(actor, world, heelGoal, dt);\n    }\n    if (!target) {\n",
          "after": "      // a reserved golem must never rot in a wall. Safe by construction:\n      // this branch only runs with NO target, and an armed bomber fuse\n      // early-returns long before the heel.\n      if (actor.isMinion() && updateRecall(actor, world, dt)) return;\n      // Small throng orbit corrections are idle formation, not a leash return.\n      if (!isThrongBody(actor) || dist(actor.pos, heelGoal) > 90) actor.companionReturnTo = actor.owner!.id;\n      actor.facing = angleTo(actor.pos, heelGoal);\n      moveToward(actor, world, heelGoal, dt);\n    }\n    if (!target) {\n"
        }
      ]
    },
    {
      "file": "src/engine/castingCues.ts",
      "beforeHash": "2050417c1e477a22897166c96a99881222b26e9ac9dcc32952e1af519ef37f97",
      "afterHash": "632d556e856f6d7c2e1af6e1a9fc21725aa6a2f4c50b6ff7cfc55807c8d5c071",
      "rawBeforeHash": "2050417c1e477a22897166c96a99881222b26e9ac9dcc32952e1af519ef37f97",
      "rawAfterHash": "632d556e856f6d7c2e1af6e1a9fc21725aa6a2f4c50b6ff7cfc55807c8d5c071",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { guardBashReady, instanceChannel, instanceMods, skillContextTags } from './skills';\nimport { selfProfile, SELF_VISUAL_STYLE as S } from '../data/skillSelfVisuals';\nimport { castingCueStyle } from '../data/castingCues';\nimport { combatCueFlash } from './combatCues';\n\nexport interface CastingCue { fill: number; facing: number; style: string; color: string; skillId?: string; }\nconst unit = (v: number) => Math.max(0, Math.min(1, v));\n\n",
          "after": "import { guardBashReady, instanceChannel, instanceMods, skillContextTags } from './skills';\nimport { selfProfile, SELF_VISUAL_STYLE as S } from '../data/skillSelfVisuals';\nimport { castingCueStyle } from '../data/castingCues';\nimport { combatCueFlash } from './combatCues';\nimport { hasDecorativeCast } from '../data/skillCastVisuals';\n\nexport interface CastingCue { fill: number; facing: number; style: string; color: string; skillId?: string; }\nconst unit = (v: number) => Math.max(0, Math.min(1, v));\n\n"
        },
        {
          "before": "  if (!cs || a.dead || a.downed || a.isStunned() || cs.inst.def.castingCue === false) return;\n  // Client stubs cannot derive identities or finite-channel clocks. The host\n  // supplies the whole resolved cue, including ordinary casts and guards.\n  if (cs.castingCue) return cs.castingCue;\n  const skillId = selfProfile(cs.inst.def.id) ? cs.inst.def.id : undefined;\n  let fill = castingCompletion(a);\n  if (fill === undefined && skillId) {\n    if (cs.mode === 'guard') {\n      const ready = guardBashReady(cs);\n",
          "after": "  if (!cs || a.dead || a.downed || a.isStunned() || cs.inst.def.castingCue === false) return;\n  // Client stubs cannot derive identities or finite-channel clocks. The host\n  // supplies the whole resolved cue, including ordinary casts and guards.\n  if (cs.castingCue) return cs.castingCue;\n  const decorative = hasDecorativeCast(cs.inst.def) || cs.mode === 'guard';\n  const skillId = decorative && selfProfile(cs.inst.def.id) ? cs.inst.def.id : undefined;\n  let fill = castingCompletion(a);\n  if (fill === undefined && skillId) {\n    if (cs.mode === 'guard') {\n      const ready = guardBashReady(cs);\n"
        }
      ]
    },
    {
      "file": "src/engine/companionCues.ts",
      "beforeHash": "71b92b41ddb1897568e1da009d6f7814e47fc944dbfe36f0c61d7e6570b77688",
      "afterHash": "3d686e8f0befbd5485ad487c364b338d0d755ba539fde6f645d1d1dc4cf12340",
      "rawBeforeHash": "71b92b41ddb1897568e1da009d6f7814e47fc944dbfe36f0c61d7e6570b77688",
      "rawAfterHash": "3d686e8f0befbd5485ad487c364b338d0d755ba539fde6f645d1d1dc4cf12340",
      "crlfLines": [],
      "hunks": [
        {
          "before": "    return to && companionCueVisible(to) ? [{ ...l, to: point(to) }] : [];\n  }) };\n  const links: CompanionCueLink[] = [], marks: CompanionCueState['marks'] = [];\n  const spec = companionCueSpec(a);\n  if (spec !== false && a.owner && !a.construct && companionCueVisible(a.owner))\n    links.push({ kind: 'owner', to: point(a.owner), ...companionMaterial(spec, a.sourceSkillId?.startsWith('__dominate:') ? 'thrall' : 'bond') });\n  if (!a.downed && a.bond) {\n    const b = w.actorById(a.bond.targetId);\n    if (b && companionCueVisible(b) && b.buffs.has(a.bond.buffId)) links.push({ kind: 'mend', to: point(b), ...companionMaterial(undefined, 'mend') });\n  }\n",
          "after": "    return to && companionCueVisible(to) ? [{ ...l, to: point(to) }] : [];\n  }) };\n  const links: CompanionCueLink[] = [], marks: CompanionCueState['marks'] = [];\n  const spec = companionCueSpec(a);\n  const keeper = a.companionReturnTo === undefined ? undefined : w.actorById(a.companionReturnTo);\n  if (spec !== false && a.owner && !a.construct && !a.downed && !a.isStunned()\n    && keeper && !keeper.downed && companionCueVisible(keeper))\n    links.push({ kind: 'owner', to: point(keeper), ...companionMaterial(spec, a.sourceSkillId?.startsWith('__dominate:') ? 'thrall' : 'bond') });\n  if (!a.downed && a.bond) {\n    const b = w.actorById(a.bond.targetId);\n    if (b && companionCueVisible(b) && b.buffs.has(a.bond.buffId)) links.push({ kind: 'mend', to: point(b), ...companionMaterial(undefined, 'mend') });\n  }\n"
        }
      ]
    },
    {
      "file": "src/engine/companionStances.ts",
      "beforeHash": "a73edaceb9be437becdd098b2294f74c5d7a3ca12973ab6e61cfc196c60f8116",
      "afterHash": "fa851ff05dd2b05dd16365ffd31f14850464618f26e1a3fb014fdbd911e384b3",
      "rawBeforeHash": "a73edaceb9be437becdd098b2294f74c5d7a3ca12973ab6e61cfc196c60f8116",
      "rawAfterHash": "fa851ff05dd2b05dd16365ffd31f14850464618f26e1a3fb014fdbd911e384b3",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  actor.aggroed = false;\n  const owner = actor.owner;\n  if (owner && !owner.dead && dist(actor.pos, owner.pos) > COMPANION_STANCE_CFG.heelDist) {\n    if (aiHeelRecall(actor, world, dt)) return 'consumed';\n    actor.facing = angleTo(actor.pos, owner.pos);\n    aiMoveToward(actor, world, { x: owner.pos.x, y: owner.pos.y, tier: owner.tier }, dt);\n  } else actor.lastProgress = undefined; // standing at heel is not being stuck\n  return 'consumed';\n",
          "after": "  actor.aggroed = false;\n  const owner = actor.owner;\n  if (owner && !owner.dead && dist(actor.pos, owner.pos) > COMPANION_STANCE_CFG.heelDist) {\n    if (aiHeelRecall(actor, world, dt)) return 'consumed';\n    actor.companionReturnTo = owner.id;\n    actor.facing = angleTo(actor.pos, owner.pos);\n    aiMoveToward(actor, world, { x: owner.pos.x, y: owner.pos.y, tier: owner.tier }, dt);\n  } else actor.lastProgress = undefined; // standing at heel is not being stuck\n  return 'consumed';\n"
        }
      ]
    },
    {
      "file": "src/engine/cosmetics.ts",
      "beforeHash": "f065d234e21a692228e3b5f8c9e0afa5fa7d74faa111fc8adb38e1304365d78d",
      "afterHash": "1694f6d439af6b33a821b9c549af8b1e53e1319c6472e9af451264205ab4397e",
      "rawBeforeHash": "f065d234e21a692228e3b5f8c9e0afa5fa7d74faa111fc8adb38e1304365d78d",
      "rawAfterHash": "1694f6d439af6b33a821b9c549af8b1e53e1319c6472e9af451264205ab4397e",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  slots: Partial<Record<CosmeticSlot, string>>;\n  /** Explicit null restores native visuals for this skill instead of inheriting. */\n  skills: Record<string, Partial<Record<'skillSkin' | 'skillRecolor', string | null>>>;\n  customColors?: Record<string, string>;\n}\nexport interface CosmeticGrant { id: string; source: string; reference: string }\nexport interface CosmeticApplication extends CosmeticGrant { skill: string }\nexport interface CosmeticState { grants: CosmeticGrant[]; loadout: CosmeticLoadout; applications?: CosmeticApplication[] }\n",
          "after": "  slots: Partial<Record<CosmeticSlot, string>>;\n  /** Explicit null restores native visuals for this skill instead of inheriting. */\n  skills: Record<string, Partial<Record<'skillSkin' | 'skillRecolor', string | null>>>;\n  customColors?: Record<string, string>;\n  /** Local player preparation art; functional cast bars remain visible. Defaults on. */\n  castingEffects?: boolean;\n}\nexport interface CosmeticGrant { id: string; source: string; reference: string }\nexport interface CosmeticApplication extends CosmeticGrant { skill: string }\nexport interface CosmeticState { grants: CosmeticGrant[]; loadout: CosmeticLoadout; applications?: CosmeticApplication[] }\n"
        }
      ]
    },
    {
      "file": "src/meta/cosmetics.ts",
      "beforeHash": "425bfee6146bbe0b2e9dde4550cd86085bfc146ee611f0bcc8c9eb9943a2d4fa",
      "afterHash": "3254605cbba2a0f57c1bbdd5814bd0f468f937f79d323931bf1a882e0a875ed1",
      "rawBeforeHash": "425bfee6146bbe0b2e9dde4550cd86085bfc146ee611f0bcc8c9eb9943a2d4fa",
      "rawAfterHash": "3254605cbba2a0f57c1bbdd5814bd0f468f937f79d323931bf1a882e0a875ed1",
      "crlfLines": [],
      "hunks": [
        {
          "before": "        && (!COSMETICS[id].skills || COSMETICS[id].skills!.includes(skill))) row[slot] = id;\n    }\n    if (Object.keys(row).length) out.skills[skill] = row;\n  }\n  if (record(raw.customColors)) for (const [skill, color] of Object.entries(raw.customColors).slice(0, 512)) {\n    if (word(skill) && colorHex(color) && colorAllowed(skill)) (out.customColors ??= {})[skill] = color.toLowerCase();\n  }\n  return out;\n",
          "after": "        && (!COSMETICS[id].skills || COSMETICS[id].skills!.includes(skill))) row[slot] = id;\n    }\n    if (Object.keys(row).length) out.skills[skill] = row;\n  }\n  if (raw.castingEffects === false) out.castingEffects = false;\n  if (record(raw.customColors)) for (const [skill, color] of Object.entries(raw.customColors).slice(0, 512)) {\n    if (word(skill) && colorHex(color) && colorAllowed(skill)) (out.customColors ??= {})[skill] = color.toLowerCase();\n  }\n  return out;\n"
        }
      ]
    },
    {
      "file": "src/net/snapshot.ts",
      "beforeHash": "402d3054993a9c3ae9fa143ab6ad13b6240fa820e096eb3a480f8e0ad2f9c9c0",
      "afterHash": "1818765334fe6a259615a30483519197460984ea086f17b243d9002b735846c2",
      "rawBeforeHash": "402d3054993a9c3ae9fa143ab6ad13b6240fa820e096eb3a480f8e0ad2f9c9c0",
      "rawAfterHash": "1818765334fe6a259615a30483519197460984ea086f17b243d9002b735846c2",
      "crlfLines": [],
      "hunks": [
        {
          "before": "  // resource maxes + derived stats before the per-frame patch runs. THE ECHO LAW: a\n  // shell's gate holds back a build older than its own newest optimistic action.\n  const myMeta = snap.seatMeta?.[world.clientSeatId];\n  if (myMeta && (!opts?.metaGate || opts.metaGate(myMeta))) applySeatMeta(world, world.localSeat, myMeta);\n  const me = snap.seats[world.clientSeatId];\n  if (me) applyOwnClocks(world, snap, me); // THE WIRE'S EYES: the own hero's cooldown and gauge rows\n  if (me) {\n    const p = world.player;\n",
          "after": "  // resource maxes + derived stats before the per-frame patch runs. THE ECHO LAW: a\n  // shell's gate holds back a build older than its own newest optimistic action.\n  const myMeta = snap.seatMeta?.[world.clientSeatId];\n  if (myMeta && (!opts?.metaGate || opts.metaGate(myMeta))) applySeatMeta(world, world.localSeat, myMeta);\n  // Local preparation uses the replicated build, after this packet's metadata.\n  // Remote actors and unknown/old-host casts retain their render-only stubs.\n  const ownCastId = snap.actors.find(row => row.seat === world.clientSeatId)?.cast?.sk;\n  const refreshedOwnCastInst = own?.casting && ownCastId ? ownCastInst(world, own, ownCastId) : undefined;\n  if (own?.casting && refreshedOwnCastInst) own.casting.inst = refreshedOwnCastInst;\n  const me = snap.seats[world.clientSeatId];\n  if (me) applyOwnClocks(world, snap, me); // THE WIRE'S EYES: the own hero's cooldown and gauge rows\n  if (me) {\n    const p = world.player;\n"
        }
      ]
    },
    {
      "file": "src/render/renderer.ts",
      "beforeHash": "9af5f08f417db6afcd55a926699223aee0d64767d74ccec7dc746da7b7734e02",
      "afterHash": "4d66a199592f38ecd5275d4426c0ce43f20dad57af633a8aba7ab52e51e8c0f6",
      "rawBeforeHash": "9af5f08f417db6afcd55a926699223aee0d64767d74ccec7dc746da7b7734e02",
      "rawAfterHash": "4d66a199592f38ecd5275d4426c0ce43f20dad57af633a8aba7ab52e51e8c0f6",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import { reactiveCueOf, wardCueActive } from '../engine/combatReadability';\nimport { REACTIVE_CUE_CFG } from '../data/combatReadability';\nimport { drawReactiveCue, drawGaspSpark, drawWardBody, drawWardLinks, drawWardBar } from './vis/combatReadabilityLayer';\nimport { drawCastingCue, drawFocusFrame } from './vis/castingCueLayer';\nimport { castingCompletion } from '../engine/castingCues';\nimport { chestReadout, drawChestReadout } from './vis/chestReadout';\nimport { castMovementHeld, drawCastName, drawCastSlot } from './vis/castReadout';\nimport { COMBAT_CUE_CFG } from '../data/combatCues';\n",
          "after": "import { reactiveCueOf, wardCueActive } from '../engine/combatReadability';\nimport { REACTIVE_CUE_CFG } from '../data/combatReadability';\nimport { drawReactiveCue, drawGaspSpark, drawWardBody, drawWardLinks, drawWardBar } from './vis/combatReadabilityLayer';\nimport { drawCastingCue, drawFocusFrame } from './vis/castingCueLayer';\nimport { drawCastPreparation } from './vis/skillCastPreparation';\nimport { playerCastPreparation } from '../engine/playerCastVisual';\nimport { castingCompletion } from '../engine/castingCues';\nimport { chestReadout, drawChestReadout } from './vis/chestReadout';\nimport { castMovementHeld, drawCastName, drawCastSlot } from './vis/castReadout';\nimport { COMBAT_CUE_CFG } from '../data/combatCues';\n"
        },
        {
          "before": "      // Cast/strike posture owns the torso; mobile skills may still take steps.\n      if (!actionPose) applyWalkBodyPose(ctx, a.radius, lookDef.walk, walkPose);\n    }\n    applyBodyActionPose(ctx, actionPose, a.radius);\n    if (rot !== 0) ctx.rotate(rot);\n    this.drawCombatBodyEdge(a, world, look);\n    ctx.drawImage(bodySprite(look), -half, -half);\n    // THE HIT FLASH rides the body's own pose — a white wash or rim OVER\n",
          "after": "      // Cast/strike posture owns the torso; mobile skills may still take steps.\n      if (!actionPose) applyWalkBodyPose(ctx, a.radius, lookDef.walk, walkPose);\n    }\n    applyBodyActionPose(ctx, actionPose, a.radius);\n    const ownCastPreparation = a.casting && (a === world.localSeat.actor || world.seats.some(s => s.couch && s.actor === a))\n      && world.account.cosmetics.loadout.castingEffects !== false ? playerCastPreparation(a) : undefined;\n    const castPreparationColor = ownCastPreparation\n      ? cosmeticSkillPaint(world, a, ownCastPreparation.profile.skillId).color ?? a.casting!.inst.def.color ?? a.color : a.color;\n    if (ownCastPreparation) drawCastPreparation(ctx, ownCastPreparation, castPreparationColor, 'behind');\n    if (rot !== 0) ctx.rotate(rot);\n    this.drawCombatBodyEdge(a, world, look);\n    ctx.drawImage(bodySprite(look), -half, -half);\n    // THE HIT FLASH rides the body's own pose — a white wash or rim OVER\n"
        },
        {
          "before": "      ctx.drawImage(adornImg, -half, -half);\n      if (flashA > 0) drawAdornHitFlash(ctx, look, baseAlpha * flashA);\n      ctx.rotate(-a.facing);\n    }\n    ctx.restore();\n    if (a.construct?.kind === 'echo') {\n      ctx.setLineDash([4, 3]);\n      ctx.strokeStyle = 'rgba(255,255,255,0.55)';\n",
          "after": "      ctx.drawImage(adornImg, -half, -half);\n      if (flashA > 0) drawAdornHitFlash(ctx, look, baseAlpha * flashA);\n      ctx.rotate(-a.facing);\n    }\n    if (ownCastPreparation) drawCastPreparation(ctx, ownCastPreparation, castPreparationColor, 'front');\n    ctx.restore();\n    if (a.construct?.kind === 'echo') {\n      ctx.setLineDash([4, 3]);\n      ctx.strokeStyle = 'rgba(255,255,255,0.55)';\n"
        },
        {
          "before": "      ctx.save(); ctx.setTransform(armedGround); ctx.globalAlpha = baseAlpha;\n      drawArmedCues(ctx, a.radius, armedCues, world.time); ctx.restore();\n    }\n    drawParryReady(ctx, a);\n    drawCastingCue(ctx, a);\n    drawSelfBanks(ctx, selfBankCuesOf(a, world.time), a.radius);\n    if (!a.dead) drawPresenceBadge(ctx, a.presenceBadge, a.radius);\n    if (comboCueGround) {\n      ctx.save(); ctx.setTransform(comboCueGround); ctx.globalAlpha = baseAlpha;\n",
          "after": "      ctx.save(); ctx.setTransform(armedGround); ctx.globalAlpha = baseAlpha;\n      drawArmedCues(ctx, a.radius, armedCues, world.time); ctx.restore();\n    }\n    drawParryReady(ctx, a);\n    if (!ownCastPreparation) drawCastingCue(ctx, a);\n    drawSelfBanks(ctx, selfBankCuesOf(a, world.time), a.radius);\n    if (!a.dead) drawPresenceBadge(ctx, a.presenceBadge, a.radius);\n    if (comboCueGround) {\n      ctx.save(); ctx.setTransform(comboCueGround); ctx.globalAlpha = baseAlpha;\n"
        }
      ]
    },
    {
      "file": "src/ui/wardrobe.ts",
      "beforeHash": "26055523c2abdb8298187ac41b61dc60f679a351a245868accf7c8e157fd7920",
      "afterHash": "3a55335ae08341135c4b6e1dcd47fa311d4dd415f3d86d62e165ada55d834161",
      "rawBeforeHash": "26055523c2abdb8298187ac41b61dc60f679a351a245868accf7c8e157fd7920",
      "rawAfterHash": "3a55335ae08341135c4b6e1dcd47fa311d4dd415f3d86d62e165ada55d834161",
      "crlfLines": [],
      "hunks": [
        {
          "before": "    const owned = !!def && (def.consume ? bound : ownsCosmetic(account.cosmetics, def.id));\n    const charges = def?.consume ? cosmeticCharges(account.cosmetics, def.id) : 0;\n    const preview: CosmeticLoadout = { slots: { ...account.cosmetics.loadout.slots },\n      skills: Object.fromEntries(Object.entries(account.cosmetics.loadout.skills).map(([id, picks]) => [id, { ...picks }])),\n      customColors: { ...account.cosmetics.loadout.customColors } };\n    if (skill && (slot === 'skillSkin' || slot === 'skillRecolor')) (preview.skills[skill] ??= {})[slot] = selected;\n    else if (selected) preview.slots[slot] = selected; else delete preview.slots[slot];\n    if (!skill && slot === 'skillSkin' && def?.skills?.[0]) (preview.skills[def.skills[0]] ??= {}).skillSkin = selected;\n    let draftColor = account.cosmetics.loadout.customColors?.[skill] ?? def?.paint.color ?? '#c4b2f2';\n",
          "after": "    const owned = !!def && (def.consume ? bound : ownsCosmetic(account.cosmetics, def.id));\n    const charges = def?.consume ? cosmeticCharges(account.cosmetics, def.id) : 0;\n    const preview: CosmeticLoadout = { slots: { ...account.cosmetics.loadout.slots },\n      skills: Object.fromEntries(Object.entries(account.cosmetics.loadout.skills).map(([id, picks]) => [id, { ...picks }])),\n      customColors: { ...account.cosmetics.loadout.customColors }, castingEffects: account.cosmetics.loadout.castingEffects };\n    if (skill && (slot === 'skillSkin' || slot === 'skillRecolor')) (preview.skills[skill] ??= {})[slot] = selected;\n    else if (selected) preview.slots[slot] = selected; else delete preview.slots[slot];\n    if (!skill && slot === 'skillSkin' && def?.skills?.[0]) (preview.skills[def.skills[0]] ??= {}).skillSkin = selected;\n    let draftColor = account.cosmetics.loadout.customColors?.[skill] ?? def?.paint.color ?? '#c4b2f2';\n"
        },
        {
          "before": "        ${previewBodies.length > 1 ? `<div class=\"wd-tools\"><label>Preview form <select data-wd-body>${previewBodies.map(body => `<option value=\"${esc(body.id)}\" ${previewBody === body.id ? 'selected' : ''}>${esc(body.name)}</option>`).join('')}</select></label><small>Your skill determines which form appears in play.</small></div>` : ''}\n        <div class=\"wd-outfit\">${Object.values(account.cosmetics.loadout.slots).map(id => `<span>${esc(COSMETICS[id]?.name ?? id)}</span>`).join('') || '<span>Original appearance</span>'}</div>\n        <p>Owned choices stay with your account through every run. Wear them freely, in any combination.</p>\n        <p class=\"wd-muted\">Models change your silhouette; skins layer color and texture over it. Mu wisps have their own silhouettes. Your class, skills and attributes remain your own.</p>\n        <p><b>${account.credits}</b> Mortal Essence available</p>\n        <small>Spend a run’s Mortal Essence here from the Reckoning, before sealing it.</small>\n        <p class=\"wd-note\" role=\"status\">${esc(note)}</p>\n      </aside><div>\n",
          "after": "        ${previewBodies.length > 1 ? `<div class=\"wd-tools\"><label>Preview form <select data-wd-body>${previewBodies.map(body => `<option value=\"${esc(body.id)}\" ${previewBody === body.id ? 'selected' : ''}>${esc(body.name)}</option>`).join('')}</select></label><small>Your skill determines which form appears in play.</small></div>` : ''}\n        <div class=\"wd-outfit\">${Object.values(account.cosmetics.loadout.slots).map(id => `<span>${esc(COSMETICS[id]?.name ?? id)}</span>`).join('') || '<span>Original appearance</span>'}</div>\n        <p>Owned choices stay with your account through every run. Wear them freely, in any combination.</p>\n        <p class=\"wd-muted\">Models change your silhouette; skins layer color and texture over it. Mu wisps have their own silhouettes. Your class, skills and attributes remain your own.</p>\n        <p><button data-wd-casting aria-pressed=\"${account.cosmetics.loadout.castingEffects !== false}\">Casting effects: ${account.cosmetics.loadout.castingEffects === false ? 'Off' : 'On'}</button></p>\n        <small>Extra preparation shapes for your casts. Cast bars and readiness cues stay visible.</small>\n        <p><b>${account.credits}</b> Mortal Essence available</p>\n        <small>Spend a run’s Mortal Essence here from the Reckoning, before sealing it.</small>\n        <p class=\"wd-note\" role=\"status\">${esc(note)}</p>\n      </aside><div>\n"
        },
        {
          "before": "      const detail = root.querySelector<HTMLElement>('.wd-detail')!;\n      detail.classList.add('wd-picker-detail');\n      detail.parentElement!.insertBefore(detail, root.querySelector('.wd-grid'));\n    }\n    root.querySelector('[data-wd-back]')!.addEventListener('click', () => { cancelAnimationFrame(frame); opts.back(); });\n    root.querySelectorAll<HTMLElement>('[data-wd-slot]').forEach(btn => btn.addEventListener('click', () => {\n      slot = btn.dataset.wdSlot as CosmeticSlot;\n      if (slot !== 'skillSkin' && slot !== 'skillRecolor') skill = '';\n",
          "after": "      const detail = root.querySelector<HTMLElement>('.wd-detail')!;\n      detail.classList.add('wd-picker-detail');\n      detail.parentElement!.insertBefore(detail, root.querySelector('.wd-grid'));\n    }\n    root.querySelector('[data-wd-casting]')!.addEventListener('click', () => {\n      account.cosmetics.loadout.castingEffects = account.cosmetics.loadout.castingEffects === false;\n      save(); draw();\n    });\n    root.querySelector('[data-wd-back]')!.addEventListener('click', () => { cancelAnimationFrame(frame); opts.back(); });\n    root.querySelectorAll<HTMLElement>('[data-wd-slot]').forEach(btn => btn.addEventListener('click', () => {\n      slot = btn.dataset.wdSlot as CosmeticSlot;\n      if (slot !== 'skillSkin' && slot !== 'skillRecolor') skill = '';\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativecampaigncompositionsource.ts",
      "beforeHash": "09a8440cd612c4ad8eba32693acdb47b7efaac059653801fdc117c4fb9a8218c",
      "afterHash": "740e037f9403690f15f8e41048d7693ba19f82dd8f89837ffacaa96ea058c4be",
      "rawBeforeHash": "132727979b7c6f319ab2aecee82c8fa4aed6f51be9675af54e974e5f6d8b37b7",
      "rawAfterHash": "740e037f9403690f15f8e41048d7693ba19f82dd8f89837ffacaa96ea058c4be",
      "crlfLines": [
        7
      ],
      "hunks": [
        {
          "before": "import {nativeJourneyCompositionArchive as journeyArchive} from './nativeJourneyCompositionArchive';import {beforeNativeJourney,beforeNativeJourneyRaw,beforeNativeJourneyRawOnly} from './nativeJourneyCompositionFixture';\nimport assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import ts from 'typescript';\nimport {nativeCampaignCompositionArchive as archive} from './nativeCampaignCompositionArchive';import {beforeNativeCampaign as project,beforeNativeCampaignRaw as rawProject} from './nativeCampaignCompositionFixture';import {nativeCampaignReaderAssertions as readerAudit} from './nativeCampaignReaderAssertions';import {writeCombatProof} from './probe_nativecombatcycle';\nconst hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0,portable=0,outside=0,rawChecks=0;const rows=[];\nfor(const [lane,items]of [...Object.entries(archive.lanes),['proof',archive.rootRows]] as [string,typeof archive.rootRows][])for(const row of items){const raw=readFileSync(new URL('../'+row.file,import.meta.url),'utf8'),source=raw.replace(/\\r\\n?/g,'\\n'),run=(s:string)=>project(lane,row.file,s);assert.equal(hash(source),row.afterHash);assert.equal(hash(run(source)),row.beforeHash);assert.equal(run(run(source)),run(source));let line=0;for(const variant of [source,source.replace(/\\n/g,'\\r\\n'),source.replace(/\\n/g,()=>++line%2?'\\r\\n':'\\n')]){assert.equal(hash(run(variant)),row.beforeHash);assert.equal(hash(rawProject(lane,row.file,variant)),row.rawBeforeHash);portable++;rawChecks++;}for(const h of row.hunks){assert.equal(source.split(h.after).length,2);const bad=h.after.replace(/\\S/,x=>x==='!'?'?':'!');assert.notEqual(bad,h.after);assert.throws(()=>run(source.replace(h.after,bad)),/Native campaign/);mutations++;assert.throws(()=>run(source.replace(h.after,h.after+h.after)),/Native campaign/);duplicates++;}assert.throws(()=>run(source+'\\n// unexplained final campaign edit\\n'),/Native campaign/);outside++;rows.push({lane,file:row.file,before:row.beforeHash,after:row.afterHash,rawBefore:row.rawBeforeHash,hunks:row.hunks.length});}\nlet assertionCount=0;for(const row of readerAudit.rows){const source=readFileSync(new URL('../'+row.file,import.meta.url),'utf8');assert.equal(hash(source),row.afterHash);const sf=ts.createSourceFile(row.file,source,ts.ScriptTarget.Latest,true),printer=ts.createPrinter({removeComments:true}),calls:string[]=[];function visit(n:ts.Node):void{if(ts.isCallExpression(n)&&/^(assert(?:\\.|$)|must$|check$)/.test(n.expression.getText(sf))){const transformed=ts.transform(n,[ctx=>node=>{const walk=(x:ts.Node):ts.VisitResult<ts.Node>=>ts.isCallExpression(x)&&ts.isIdentifier(x.expression)&&['rawCampaign','beforeNativeCampaign','beforeNativeCampaignRaw'].includes(x.expression.text)&&x.arguments.length===3?ts.visitNode(x.arguments[2],walk)!:ts.visitEachChild(x,walk,ctx);return ts.visitNode(node,walk) as ts.CallExpression;}]);calls.push(printer.printNode(ts.EmitHint.Unspecified,transformed.transformed[0],sf));transformed.dispose();}n.forEachChild(visit);}visit(sf);assert.equal(calls.length,row.assertions);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assertionCount+=calls.length;}assert.equal(assertionCount,readerAudit.assertions);\n",
          "after": "import {nativeJourneyCompositionArchive as journeyArchive} from './nativeJourneyCompositionArchive';import {beforeNativeJourney,beforeNativeJourneyRaw,beforeNativeJourneyRawOnly} from './nativeJourneyCompositionFixture';\nimport {readNativeMainCastSource as readFileSync} from './nativeMainCastSourceFixture';\nimport assert from 'node:assert/strict';import {createHash} from 'node:crypto';import ts from 'typescript';\nimport {nativeCampaignCompositionArchive as archive} from './nativeCampaignCompositionArchive';import {beforeNativeCampaign as project,beforeNativeCampaignRaw as rawProject} from './nativeCampaignCompositionFixture';import {nativeCampaignReaderAssertions as readerAudit} from './nativeCampaignReaderAssertions';import {writeCombatProof} from './probe_nativecombatcycle';\nconst hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0,portable=0,outside=0,rawChecks=0;const rows=[];\nfor(const [lane,items]of [...Object.entries(archive.lanes),['proof',archive.rootRows]] as [string,typeof archive.rootRows][])for(const row of items){const raw=readFileSync(new URL('../'+row.file,import.meta.url),'utf8'),source=raw.replace(/\\r\\n?/g,'\\n'),run=(s:string)=>project(lane,row.file,s);assert.equal(hash(source),row.afterHash);assert.equal(hash(run(source)),row.beforeHash);assert.equal(run(run(source)),run(source));let line=0;for(const variant of [source,source.replace(/\\n/g,'\\r\\n'),source.replace(/\\n/g,()=>++line%2?'\\r\\n':'\\n')]){assert.equal(hash(run(variant)),row.beforeHash);assert.equal(hash(rawProject(lane,row.file,variant)),row.rawBeforeHash);portable++;rawChecks++;}for(const h of row.hunks){assert.equal(source.split(h.after).length,2);const bad=h.after.replace(/\\S/,x=>x==='!'?'?':'!');assert.notEqual(bad,h.after);assert.throws(()=>run(source.replace(h.after,bad)),/Native campaign/);mutations++;assert.throws(()=>run(source.replace(h.after,h.after+h.after)),/Native campaign/);duplicates++;}assert.throws(()=>run(source+'\\n// unexplained final campaign edit\\n'),/Native campaign/);outside++;rows.push({lane,file:row.file,before:row.beforeHash,after:row.afterHash,rawBefore:row.rawBeforeHash,hunks:row.hunks.length});}\nlet assertionCount=0;for(const row of readerAudit.rows){const source=readFileSync(new URL('../'+row.file,import.meta.url),'utf8');assert.equal(hash(source),row.afterHash);const sf=ts.createSourceFile(row.file,source,ts.ScriptTarget.Latest,true),printer=ts.createPrinter({removeComments:true}),calls:string[]=[];function visit(n:ts.Node):void{if(ts.isCallExpression(n)&&/^(assert(?:\\.|$)|must$|check$)/.test(n.expression.getText(sf))){const transformed=ts.transform(n,[ctx=>node=>{const walk=(x:ts.Node):ts.VisitResult<ts.Node>=>ts.isCallExpression(x)&&ts.isIdentifier(x.expression)&&['rawCampaign','beforeNativeCampaign','beforeNativeCampaignRaw'].includes(x.expression.text)&&x.arguments.length===3?ts.visitNode(x.arguments[2],walk)!:ts.visitEachChild(x,walk,ctx);return ts.visitNode(node,walk) as ts.CallExpression;}]);calls.push(printer.printNode(ts.EmitHint.Unspecified,transformed.transformed[0],sf));transformed.dispose();}n.forEachChild(visit);}visit(sf);assert.equal(calls.length,row.assertions);assert.equal(hash(JSON.stringify(calls)),row.assertionHash);assertionCount+=calls.length;}assert.equal(assertionCount,readerAudit.assertions);\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativeaisource.ts",
      "beforeHash": "84a7253eff67db6a1a1ba052aaf5df41e86ea4f9aba2ad9eeed90ae7606956a4",
      "afterHash": "8f92bf2a51d58b9026ee4492bb029e9403ee157a1763dcbd4dd43f3e276f3e65",
      "rawBeforeHash": "f248f04d809c558e5eefe19c0ec0362354282c78baa0c9e46ddf3560e43cac2c",
      "rawAfterHash": "8f92bf2a51d58b9026ee4492bb029e9403ee157a1763dcbd4dd43f3e276f3e65",
      "crlfLines": [
        39
      ],
      "hunks": [
        {
          "before": "import {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';\nimport {beforeNativeAreaViewQueries as originalBeforeNativeAreaViewQueries} from './nativeAreaViewQueryFixture';\nfunction beforeNativeAreaViewQueries(file:string,source:string):string {return originalBeforeNativeAreaViewQueries(file,projectClientPublication('view',file,source));}\nimport {nativeAICompositionArchive as composition} from './nativeAICompositionArchive';\nimport {beforeNativeAIComposition} from './nativeAICompositionFixture';\nimport {beforeNativeAITargetContinuity} from './nativeAITargetContinuityFixture';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport {nativeSceneAIArchive as archive} from './nativeSceneAIArchive';\nimport {beforeNativeAI} from './nativeAIExtractionFixture';\nconst hash=(s:string)=>createHash('sha256').update(s).digest('hex'),read=(f:string)=>beforeNativeAITargetContinuity(f,beforeNativeAIComposition(f,beforeNativeAreaViewQueries(f,fs.readFileSync(new URL('../'+f,import.meta.url),'utf8')))),parse=(s:string)=>ts.createSourceFile('source.ts',s,ts.ScriptTarget.Latest,true),printer=ts.createPrinter({removeComments:true});\nconst print=(n:ts.Node,sf:ts.SourceFile)=>printer.printNode(ts.EmitHint.Unspecified,n,sf);\nconst emit=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;\nconst world=execFileSync('git',['show',archive.pin+':src/engine/world.ts'],{maxBuffer:20*1024*1024}).toString().replaceAll('\\r\\n','\\n');assert.equal(hash(world),archive.worldHash);const wsf=parse(world),klass=wsf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;\nconst core=read('src/engine/nativeSceneAIPreparation.ts');let pure=core.replace(\"import {observeNativeCombatRetirement,finishNativeCombatRetirement,cancelNativeCombatRetirement} from './nativeCombatRecordObservation';\\n\",'');\n",
          "after": "import fs from 'node:fs';\nimport {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';\nimport {beforeNativeAreaViewQueries as originalBeforeNativeAreaViewQueries} from './nativeAreaViewQueryFixture';\nfunction beforeNativeAreaViewQueries(file:string,source:string):string {return originalBeforeNativeAreaViewQueries(file,projectClientPublication('view',file,source));}\nimport {nativeAICompositionArchive as composition} from './nativeAICompositionArchive';\nimport {beforeNativeAIComposition} from './nativeAICompositionFixture';\nimport {beforeNativeAITargetContinuity} from './nativeAITargetContinuityFixture';\nimport assert from 'node:assert/strict';\nimport {readNativeMainCastSource} from './nativeMainCastSourceFixture';\nimport {execFileSync} from 'node:child_process';\nimport {createHash} from 'node:crypto';\nimport ts from 'typescript';\nimport {nativeSceneAIArchive as archive} from './nativeSceneAIArchive';\nimport {beforeNativeAI} from './nativeAIExtractionFixture';\nconst hash=(s:string)=>createHash('sha256').update(s).digest('hex'),read=(f:string)=>beforeNativeAITargetContinuity(f,beforeNativeAIComposition(f,beforeNativeAreaViewQueries(f,readNativeMainCastSource(new URL('../'+f,import.meta.url),'utf8')))),parse=(s:string)=>ts.createSourceFile('source.ts',s,ts.ScriptTarget.Latest,true),printer=ts.createPrinter({removeComments:true});\nconst print=(n:ts.Node,sf:ts.SourceFile)=>printer.printNode(ts.EmitHint.Unspecified,n,sf);\nconst emit=(source:string)=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,removeComments:true}}).outputText;\nconst world=execFileSync('git',['show',archive.pin+':src/engine/world.ts'],{maxBuffer:20*1024*1024}).toString().replaceAll('\\r\\n','\\n');assert.equal(hash(world),archive.worldHash);const wsf=parse(world),klass=wsf.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='World') as ts.ClassDeclaration;\nconst core=read('src/engine/nativeSceneAIPreparation.ts');let pure=core.replace(\"import {observeNativeCombatRetirement,finishNativeCombatRetirement,cancelNativeCombatRetirement} from './nativeCombatRecordObservation';\\n\",'');\n"
        },
        {
          "before": "let mutations=0,duplicates=0;for(const row of archive.shared){const source=read(row.file);assert.equal(source,row.after);assert.equal(beforeNativeAI(row.file,source),row.before);for(const h of row.changes){assert.throws(()=>beforeNativeAI(row.file,source.replace(h.after,h.after+'\\n/* mutation */')));mutations++;assert.throws(()=>beforeNativeAI(row.file,source.replace(h.after,h.after+'\\n'+h.after)));duplicates++;}}\nfor(const row of archive.fresh)assert.equal(read(row.file),row.after);\nfor(const row of archive.typeOnlyChanges){assert.equal(emit(row.before),emit(row.after),row.file+' type-only emit');if(row.file.endsWith('/perception.ts'))assert.equal(read(row.file),row.after);else{const lifetime=archive.lifetime.find(r=>r.file===row.file)!;assert.equal(lifetime.before,row.after);assert.equal(read(row.file),lifetime.after);}}\nconst actions=archive.lifetime.find(r=>r.file.endsWith('/aiActions.ts'))!;assert.equal(read(actions.file),actions.after);for(const file of ['src/engine/ai.ts','src/engine/perception.ts','src/engine/aiActions.ts']){const original=execFileSync('git',['show',archive.pin+':'+file],{maxBuffer:10*1024*1024}).toString();const before=archive.shared.find(r=>r.file===file)!.before;assert.equal(emit(original),emit(before),'immutable runtime predecessor '+file);}\nassert.equal(hash(fs.readFileSync(new URL('./nativeAICompositionArchive.ts',import.meta.url),'utf8')),'9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f','immutable declared AI composition');\nlet compositionMutations=0,compositionDuplicates=0;\nfor(const row of composition){const raw=beforeNativeAreaViewQueries(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8')).replaceAll('\\r\\n','\\n');assert.equal(hash(raw),row.afterHash);const projected=beforeNativeAIComposition(row.file,raw);assert.equal(hash(projected),row.beforeHash);assert.equal(beforeNativeAIComposition(row.file,raw.replaceAll('\\n','\\r\\n')),projected);\n const check=(source:string)=>beforeNativeAI(row.file,beforeNativeAITargetContinuity(row.file,beforeNativeAIComposition(row.file,source)));check(raw);\n for(const edit of row.changes){const at=Math.floor(edit.after.length/2),changed=edit.after.slice(0,at)+(edit.after[at]==='X'?'Y':'X')+edit.after.slice(at+1);assert.notEqual(changed,edit.after);assert.throws(()=>check(raw.replace(edit.after,changed)));compositionMutations++;assert.throws(()=>check(raw+'\\n'+edit.after));compositionDuplicates++;}\n const mark='\\n/* unknown outside composition edit */';assert.equal(beforeNativeAIComposition(row.file,raw+mark),projected+mark);assert.throws(()=>check(raw+mark));\n}\n",
          "after": "let mutations=0,duplicates=0;for(const row of archive.shared){const source=read(row.file);assert.equal(source,row.after);assert.equal(beforeNativeAI(row.file,source),row.before);for(const h of row.changes){assert.throws(()=>beforeNativeAI(row.file,source.replace(h.after,h.after+'\\n/* mutation */')));mutations++;assert.throws(()=>beforeNativeAI(row.file,source.replace(h.after,h.after+'\\n'+h.after)));duplicates++;}}\nfor(const row of archive.fresh)assert.equal(read(row.file),row.after);\nfor(const row of archive.typeOnlyChanges){assert.equal(emit(row.before),emit(row.after),row.file+' type-only emit');if(row.file.endsWith('/perception.ts'))assert.equal(read(row.file),row.after);else{const lifetime=archive.lifetime.find(r=>r.file===row.file)!;assert.equal(lifetime.before,row.after);assert.equal(read(row.file),lifetime.after);}}\nconst actions=archive.lifetime.find(r=>r.file.endsWith('/aiActions.ts'))!;assert.equal(read(actions.file),actions.after);for(const file of ['src/engine/ai.ts','src/engine/perception.ts','src/engine/aiActions.ts']){const original=execFileSync('git',['show',archive.pin+':'+file],{maxBuffer:10*1024*1024}).toString();const before=archive.shared.find(r=>r.file===file)!.before;assert.equal(emit(original),emit(before),'immutable runtime predecessor '+file);}\nassert.equal(hash(readNativeMainCastSource(new URL('./nativeAICompositionArchive.ts',import.meta.url),'utf8')),'9d04f472dd7e89ced1738e1f964fafad814366f3f2971649692209731157b14f','immutable declared AI composition');\nlet compositionMutations=0,compositionDuplicates=0;\nfor(const row of composition){const raw=beforeNativeAreaViewQueries(row.file,readNativeMainCastSource(new URL('../'+row.file,import.meta.url),'utf8')).replaceAll('\\r\\n','\\n');assert.equal(hash(raw),row.afterHash);const projected=beforeNativeAIComposition(row.file,raw);assert.equal(hash(projected),row.beforeHash);assert.equal(beforeNativeAIComposition(row.file,raw.replaceAll('\\n','\\r\\n')),projected);\n const check=(source:string)=>beforeNativeAI(row.file,beforeNativeAITargetContinuity(row.file,beforeNativeAIComposition(row.file,source)));check(raw);\n for(const edit of row.changes){const at=Math.floor(edit.after.length/2),changed=edit.after.slice(0,at)+(edit.after[at]==='X'?'Y':'X')+edit.after.slice(at+1);assert.notEqual(changed,edit.after);assert.throws(()=>check(raw.replace(edit.after,changed)));compositionMutations++;assert.throws(()=>check(raw+'\\n'+edit.after));compositionDuplicates++;}\n const mark='\\n/* unknown outside composition edit */';assert.equal(beforeNativeAIComposition(row.file,raw+mark),projected+mark);assert.throws(()=>check(raw+mark));\n}\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativescenehistory.ts",
      "beforeHash": "b81a44e49950cb5f89079abc598c20484ba344cca175fc1ec5cf8cacf5102b8d",
      "afterHash": "0a5337f04f7487e4951ec2e1dfde9663f7c2172ad9770a351b77ad4d820b1f65",
      "rawBeforeHash": "b81a44e49950cb5f89079abc598c20484ba344cca175fc1ec5cf8cacf5102b8d",
      "rawAfterHash": "0a5337f04f7487e4951ec2e1dfde9663f7c2172ad9770a351b77ad4d820b1f65",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';\nimport {beforeNativeHistoryArrival} from './nativeHistoryArrivalFixture';\nimport {assertHistoricalActorSlots,beforeHistoricalActorSlots} from './nativeHistoricalActorReceipt';\nimport {readFileSync as readActorSource} from 'node:fs';\nassertHistoricalActorSlots(readActorSource(new URL('../src/engine/actor.ts',import.meta.url),'utf8'));\nimport {assertHistoricalCleaveSource,beforeHistoricalCleaveReceipt} from './nativeHistoricalCleaveReceipt';\nimport assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';\nimport {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';\nimport {makeSimWorld} from '../src/sim/arena';import {World,NAV_CFG} from '../src/engine/world';import {Actor,resetActorIdCounter} from '../src/engine/actor';\n",
          "after": "import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';\nimport {beforeNativeHistoryArrival} from './nativeHistoryArrivalFixture';\nimport {assertHistoricalActorSlots,beforeHistoricalActorSlots as originalBeforeHistoricalActorSlots} from './nativeHistoricalActorReceipt';\nimport {beforeMainCastActorSlot,assertMainCastActorSlot} from './nativeMainCastActorReceipt';\nfunction beforeHistoricalActorSlots<T>(receipt:T):T{return originalBeforeHistoricalActorSlots(beforeMainCastActorSlot(receipt));}\nimport {readFileSync as readActorSource} from 'node:fs';\nassertHistoricalActorSlots(readActorSource(new URL('../src/engine/actor.ts',import.meta.url),'utf8'));\nassertMainCastActorSlot(readActorSource(new URL('../src/engine/actor.ts',import.meta.url),'utf8'));\nimport {assertHistoricalCleaveSource,beforeHistoricalCleaveReceipt} from './nativeHistoricalCleaveReceipt';\nimport assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';\nimport {gzipSync,gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';\nimport {makeSimWorld} from '../src/sim/arena';import {World,NAV_CFG} from '../src/engine/world';import {Actor,resetActorIdCounter} from '../src/engine/actor';\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativeaitargetcontinuitysource.ts",
      "beforeHash": "7b2c0657f11391db3868c14a2800906e5457b4510c537f99234ab6f8f49eeabd",
      "afterHash": "8ebe5f79598b06e86961151ca0bfae5ef886d949e8dd9e79b8493e9584b15d6b",
      "rawBeforeHash": "7b2c0657f11391db3868c14a2800906e5457b4510c537f99234ab6f8f49eeabd",
      "rawAfterHash": "8ebe5f79598b06e86961151ca0bfae5ef886d949e8dd9e79b8493e9584b15d6b",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';\nimport {beforeNativeAreaViewQueries as originalBeforeNativeAreaViewQueries} from './nativeAreaViewQueryFixture';\nfunction beforeNativeAreaViewQueries(file:string,source:string):string {return originalBeforeNativeAreaViewQueries(file,projectClientPublication('view',file,source));}\nimport {beforeNativeAIComposition} from './nativeAICompositionFixture';\n",
          "after": "import {readNativeMainCastSource} from './nativeMainCastSourceFixture';\nimport {beforeNativeClientPublicationComposition as projectClientPublication} from './nativeClientPublicationCompositionFixture';\nimport {beforeNativeAreaViewQueries as originalBeforeNativeAreaViewQueries} from './nativeAreaViewQueryFixture';\nfunction beforeNativeAreaViewQueries(file:string,source:string):string {return originalBeforeNativeAreaViewQueries(file,projectClientPublication('view',file,source));}\nimport {beforeNativeAIComposition} from './nativeAICompositionFixture';\n"
        },
        {
          "before": "import {createHash} from 'node:crypto';\nimport {nativeAITargetContinuityArchive as archive} from './nativeAITargetContinuityArchive';\nimport {beforeNativeAITargetContinuity} from './nativeAITargetContinuityFixture';\nconst hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0;\nfor(const row of archive.files){const source=beforeNativeAIComposition(row.file,beforeNativeAreaViewQueries(row.file,fs.readFileSync(new URL('../'+row.file,import.meta.url),'utf8')));assert.equal(source,row.after);assert.equal(beforeNativeAITargetContinuity(row.file,source),row.before);for(const h of row.changes){assert.throws(()=>beforeNativeAITargetContinuity(row.file,source.replace(h.after,h.after+'\\n/* mutation */')));mutations++;assert.throws(()=>beforeNativeAITargetContinuity(row.file,source.replace(h.after,h.after+'\\n'+h.after)));duplicates++;}}\nconst result={files:archive.files.length,hunks:archive.files.reduce((n,r)=>n+r.changes.length,0),mutations,duplicates,originalArchiveUntouched:true};const report={result,receipt:hash(JSON.stringify(result))};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-ai-target-continuity-source.json',import.meta.url),JSON.stringify(report,null,2)+'\\n');console.log(JSON.stringify(report));\n",
          "after": "import {createHash} from 'node:crypto';\nimport {nativeAITargetContinuityArchive as archive} from './nativeAITargetContinuityArchive';\nimport {beforeNativeAITargetContinuity} from './nativeAITargetContinuityFixture';\nconst hash=(s:string)=>createHash('sha256').update(s).digest('hex');let mutations=0,duplicates=0;\nfor(const row of archive.files){const source=beforeNativeAIComposition(row.file,beforeNativeAreaViewQueries(row.file,readNativeMainCastSource(new URL('../'+row.file,import.meta.url),'utf8')));assert.equal(source,row.after);assert.equal(beforeNativeAITargetContinuity(row.file,source),row.before);for(const h of row.changes){assert.throws(()=>beforeNativeAITargetContinuity(row.file,source.replace(h.after,h.after+'\\n/* mutation */')));mutations++;assert.throws(()=>beforeNativeAITargetContinuity(row.file,source.replace(h.after,h.after+'\\n'+h.after)));duplicates++;}}\nconst result={files:archive.files.length,hunks:archive.files.reduce((n,r)=>n+r.changes.length,0),mutations,duplicates,originalArchiveUntouched:true};const report={result,receipt:hash(JSON.stringify(result))};fs.mkdirSync(new URL('./reports/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('./reports/native-ai-target-continuity-source.json',import.meta.url),JSON.stringify(report,null,2)+'\\n');console.log(JSON.stringify(report));\n"
        }
      ]
    },
    {
      "file": "balance/probe_nativejourneycompositionsource.ts",
      "beforeHash": "06a780b2c49eb6e1522b2614ff3cfe7a5120cc63da9b351e37b821bff13d521b",
      "afterHash": "557efda73da720b514f8fc5f654b94fa817451be083d73d4bd280e7ca9abd998",
      "rawBeforeHash": "06a780b2c49eb6e1522b2614ff3cfe7a5120cc63da9b351e37b821bff13d521b",
      "rawAfterHash": "557efda73da720b514f8fc5f654b94fa817451be083d73d4bd280e7ca9abd998",
      "crlfLines": [],
      "hunks": [
        {
          "before": "import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';\nimport assert from 'node:assert/strict';\nimport {readFileSync} from 'node:fs';\nimport {createHash} from 'node:crypto';\nimport {nativeJourneyCompositionArchive as archive} from './nativeJourneyCompositionArchive';\nimport {beforeNativeJourneyOnly as project,beforeNativeJourneyRawOnly as rawProject,type NativeJourneyLane} from './nativeJourneyCompositionFixture';\nimport {writeCombatProof} from './probe_nativecombatcycle';\n",
          "after": "import {beforeNativeCampaignRaw as rawCampaign} from './nativeCampaignCompositionFixture';\nimport assert from 'node:assert/strict';\nimport {readNativeMainCastSource as readFileSync} from './nativeMainCastSourceFixture';\nimport {createHash} from 'node:crypto';\nimport {nativeJourneyCompositionArchive as archive} from './nativeJourneyCompositionArchive';\nimport {beforeNativeJourneyOnly as project,beforeNativeJourneyRawOnly as rawProject,type NativeJourneyLane} from './nativeJourneyCompositionFixture';\nimport {writeCombatProof} from './probe_nativecombatcycle';\n"
        }
      ]
    }
  ],
  "fresh": [
    {
      "file": "balance/caster-vessel-study.cjs",
      "sha256": "d8887a9abab15d7eec94ec6804a6fbcdfb68629b3950200a4f40215afd6d78a9"
    },
    {
      "file": "balance/caster-vessel-ui.cjs",
      "sha256": "0c2624296fdf1203637ff86773cf5935767cb43feaa1f31a6f8f36ebb4ca68b0"
    },
    {
      "file": "balance/probe_playercastvisuals.ts",
      "sha256": "235492844bcb466cef80ab6d3532afd4182ee917a3b937e54dc8fb574169bc1d"
    },
    {
      "file": "balance/seamless-visual-sweep-ui.cjs",
      "sha256": "dad68f7dc946ead650163214c7327a0a08e65c1b73a244057b2d2a76091acbc1"
    },
    {
      "file": "balance/skill-visual-harness.cjs",
      "sha256": "9670645ccd8107d04937cf79d01fecdd4faf3d4d28bebd3086599b2b7c7f588c"
    },
    {
      "file": "docs/design/seamless-visual-sweep.md",
      "sha256": "df9269f923d6955f73ba85bb014f634f6f91118c779fcddd896df689dd38965f"
    },
    {
      "file": "src/data/skillCastVisuals.ts",
      "sha256": "782e347ef0e8a57768e6671a2643e447b0bf417d7d195946f530226ba734f800"
    },
    {
      "file": "src/engine/playerCastVisual.ts",
      "sha256": "e5bd8f331b1d7aa7674986633f9333fc1560ebb221c51ece6930503c214d5d37"
    },
    {
      "file": "src/render/vis/skillCastPreparation.ts",
      "sha256": "96e632dd1f99294e441e81ec2b0dc52a12c3b7565bbce0c2c92e219cb3f56d45"
    }
  ]
};
