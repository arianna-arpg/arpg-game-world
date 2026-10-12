import {presenceProfile,skillPresenceVoice,PRESENCE_STYLE} from '../data/skillPresenceVisuals';
/** Shared exact native stat, mercenary and teardown derivations. */
import type {World,Seat,PlayerMeta,GrantedSkillRow,WornGraftRow,Projectile,EmergeRecord} from './world';
import {companionCueFlash,companionCueSpec,type CompanionCueEvent} from './companionCues';
import {RECOVERY_CUES,type RecoveryCueKind} from '../data/companionCues';
import {COMPANION_GRANT_PREFIX,companionGrantStat} from './companionGrants';
import {resolveMinionInheritance,applyMinionPlyBonus} from './minionInheritance';
import {throngEvolution,throngClusterPlies} from './throngEvolution';
import {companionRecoverySeconds,COMPANION_CFG} from './companionSpec';
import {vec,type Vec2} from '../core/math';
import {mod,type Attributes,type Modifier} from './stats';
import {STATUS_DEFS} from './status';
import {Actor} from './actor';
import {effectiveSkillLevel,guardBashSpec,instanceDelivery,instanceMods,instanceSummon,instanceTameMod,makeSkillInstance,treeNodeOf,skillContextTags,skillCooldownSeconds,skillMaxLevel,summonCrewOf,supportFitsInstOrCrew,type SummonCrew,MAX_SUPPORT_LEVEL,parseSlotGraftStat,SLOTGRAFT_PREFIX,GRANT_CFG,parseSkillGrantStat,SKILLGRANT_PREFIX,type SkillEffect,type LedgerSpec,type SkillInstance,type SummonDelivery,type ConduitSpec} from './skills';
import {containerBoard,seatAmplification,containerMisfits} from './containers';
import {CONTAINER_DEFS} from '../data/containers';
import {amplifySeatMods} from './seatlaw';
import {packGrantState,restoreGrantState} from './gemitems';
import {empowerRelicMods} from './relicPower';
import {reliquaryPower} from '../meta/reliquary';
import {RELIQUARY_CFG} from '../data/reliquary';
import {compileItemMods,itemLevelReq,rebuildItem} from './itemgen';
import {EQUIP_SLOTS,type ItemInstance} from './items';
import {SKILLS} from '../data/skills';
import {MONSTERS} from '../data/monsters';
import {CLASSES,classOpeningSkills,classSkillStat,PROGRESSION} from '../data/classes';
import {SUPPORTS} from '../data/supports';
import {classStartNode,PASSIVE_ADJACENCY,PASSIVE_NODES} from '../data/passives';
import {choiceOptionOf,chosenOf,graftSourcesOf,sanitizeChoices} from '../data/passiveChoices';
import {ATTRIBUTE_IDS,DAMAGE_COLOR,isAttributeId} from './stats';
import {EMERGE_CFG,emergeFor,emergeGroundFor,emergeSeedOf,type EmergeGroundId,type EmergeSpec} from './emerge';
import {ultCooldownCap} from './ultimates';
import {syncAttributeBequests} from './bequests';
import {combatCueFlash} from './combatCues';
import {DEFAULT_MODE_ID} from '../meta/modes';
import {MERC_CFG,type MercSnapshot} from '../meta/mercs';
import {monsterSkillLevelOf} from './nativePopulationRules';
import {padBar,emptyEssences,emptyAbilityEssences,rebuildSkill} from './nativeProgressionMeta';
type Zone=World['zones'][number];
type InheritedFlight=ReturnType<World['inheritedFlight']>;
export interface NativeSceneProgressionHost {
 clientActionHook:World['clientActionHook'];
 localSeat:World['localSeat'];
 account:World['account'];
 seatHero:World['seatHero'];
 relayStatus:World['relayStatus'];
 companionGrants:World['companionGrants'];
 kill:World['kill'];
 relevelActor:World['relevelActor'];
 bakeMinionOwnerStats:World['bakeMinionOwnerStats'];
 deactivateAura:World['deactivateAura'];
 dismissSummonToggle:World['dismissSummonToggle'];
 summonCrewSkills:World['summonCrewSkills'];
 guardArts:Pick<World['guardArts'],'sync'|'clear'>;
 companionBonds:Pick<World['companionBonds'],'refresh'|'host'>;
 hiredMercs:World['hiredMercs'];
 mercTargetLevel:World['mercTargetLevel'];
 mercSyncedLevel:World['mercSyncedLevel'];
 applyMercNormalization:World['applyMercNormalization'];
 zone:World['zone'];
 player:World['player'];
 normalizeMercMeta:World['normalizeMercMeta'];
 recalcSeat:World['recalcSeat'];
 markMetaDirty:World['markMetaDirty'];
 trimAllocated:World['trimAllocated'];
 stampMonsterLevel:World['stampMonsterLevel'];
 seatOf:World['seatOf'];
 guardBash:World['guardBash'];
 actors:World['actors'];
 time:World['time'];
 executeSkill:World['executeSkill'];
 settleLedger:World['settleLedger'];
 clearSummonReleaseFields:World['clearSummonReleaseFields'];
 minionsOfSkill:World['minionsOfSkill'];
 releaseContract:World['releaseContract'];
 pendingRespawns:World['pendingRespawns'];
 pendingSummons:World['pendingSummons'];
 projectiles:World['projectiles'];
 zones:World['zones'];
 pendingRepeats:World['pendingRepeats'];
 pendingFuses:World['pendingFuses'];
 pendingSalvos:World['pendingSalvos'];
 pendingSteps:World['pendingSteps'];
 pendingFollowUps:World['pendingFollowUps'];
 clearTreeFields:World['clearTreeFields'];
 text:World['text'];
 burstDamage:World['burstDamage'];
 flashes:World['flashes'];
 attackSequences:Pick<World['attackSequences'],'clear'>;
 challenges:Pick<World['challenges'],'clear'>;
 clearTreeConstructs:World['clearTreeConstructs'];
 treeBuffSources:World['treeBuffSources'];
 pendingBlinks:World['pendingBlinks'];
 recallTreeSpears:World['recallTreeSpears'];
 expireZone:World['expireZone'];
 actorById:World['actorById'];
 stampSkillCooldown:World['stampSkillCooldown'];
 recoverCompanion:World['recoverCompanion'];
 showRecoveryCue:World['showRecoveryCue'];
 emergeBody:World['emergeBody'];
 emergeGroundAt:World['emergeGroundAt'];
 emergences:World['emergences'];
 groundAt:World['groundAt'];
 walk:World['walk'];
}

export function sceneRecalcSeat(nativeHost:NativeSceneProgressionHost,seat: Seat): void {
    if (!nativeHost.clientActionHook) {
      seat.meta.relicEmpowerment = seat === nativeHost.localSeat ? reliquaryPower(nativeHost.account.reliquary) : 0;
      seat.meta.relicEnabled = seat === nativeHost.localSeat ? nativeHost.account.reliquary.enabled : true;
    }
    const p = nativeHost.seatHero(seat);
    p.statusRelay = nativeHost.relayStatus;
    const m = seat.meta;

    // Effective attributes = class base + everything granted by the tree.
    // Seeded over EVERY registered attribute id (missing keys read 0), so a
    // save written before an attribute existed never poisons the math.
    const attrs = {} as Attributes;
    const attrsPct = {} as Attributes;
    for (const a of ATTRIBUTE_IDS) { attrs[a] = m.baseAttrs[a] ?? 0; attrsPct[a] = 0; }
    const passiveMods: Modifier[] = [];
    // ONE folding rule for everything the tree grants — nodes and their chosen
    // options share the payload surface (attributes / attributesPct / mods).
    const fold = (g: { attributes?: Partial<Attributes>; attributesPct?: Partial<Attributes>; mods?: Modifier[] }): void => {
      if (g.attributes) for (const a of ATTRIBUTE_IDS) attrs[a] += g.attributes[a] ?? 0;
      if (g.attributesPct) for (const a of ATTRIBUTE_IDS) attrsPct[a] += g.attributesPct[a] ?? 0;
      if (g.mods) passiveMods.push(...g.mods);
    };
    const wornConduits: ConduitSpec[] = [];
    for (const id of m.allocated) {
      const node = PASSIVE_NODES[id];
      if (!node) continue;
      fold(node);
      if (node.conduit) wornConduits.push(node.conduit);
      // CHOICE NODES: the options picked at this node fold exactly like node
      // grants. An unknown option id (a renamed group entry) drops silently —
      // the same registry-tolerant stance as a removed node id above.
      if (node.choice) {
        for (const oid of chosenOf(m.choices, id)) {
          const opt = choiceOptionOf(node, oid);
          if (opt) {
            fold(opt);
            // WORN CONDUITS (option.conduit): actor-level pumps — derived
            // state exactly like the graft lane below, rebuilt every recalc.
            if (opt.conduit) wornConduits.push(opt.conduit);
          }
        }
      }
    }
    p.wornConduits = wornConduits.length ? wornConduits : undefined;
    // GEAR: attribute-granting lines (+12 Strength — stat names registered in
    // ATTRIBUTES, not STAT_DEFS) are ATTRIBUTE grants, not sheet stats. They
    // join the attrs accumulation here so they flow through the ONE
    // setAttributes artery — derived stats, the char sheet, and skill
    // attribute gates (meetsRequirements reads meta.attrs) all see them.
    // Everything else on the item stays an ordinary per-slot sheet mod.
    // Flat is the only kind with meaning on an attribute (validator enforces).
    const gearSheetMods = new Map<string, Modifier[]>();
    for (const slot of EQUIP_SLOTS) {
      const worn = m.equipped[slot.id];
      if (!worn) continue;
      const sheetMods: Modifier[] = [];
      for (const gm of compileItemMods(worn)) {
        if (isAttributeId(gm.stat)) {
          // Attribute lines join the ONE attrs artery: 'flat' adds points,
          // 'increased' feeds the same percent phase as attributesPct tree
          // grants. Other kinds have no meaning on an attribute (validated).
          if (gm.kind === 'flat') attrs[gm.stat] += gm.value;
          else if (gm.kind === 'increased') attrsPct[gm.stat] += gm.value;
        } else {
          sheetMods.push(gm);
        }
      }
      gearSheetMods.set(slot.id, sheetMods);
    }
    // THE CONTAINER FOLD (engine/containers.ts): every ACTIVE side board's
    // seated pieces compile exactly like worn gear — attribute lines join
    // the one attrs artery, everything else becomes the board's own sheet
    // source ('container:<id>', set below). Only pieces standing on OPEN
    // cells of the board the account owns TODAY count (containerMisfits —
    // the adoption law's read, so a retuned frame can never leave a ghost
    // line folding); an inactive board, an unowned board, an absent board
    // contribute nothing. A relic in the bag is never here — inert.
    // THE SEAT LAW (engine/seatlaw.ts): a seated piece's compiled lines
    // scale by ONE factor its neighbourhood on the board earns — outward
    // power worn by the pieces touching it, solitude per empty open seat
    // against it, communion per piece against it (containers.ts
    // seatAmplification). Amplifier lines are consumed here — never scaled,
    // never emitted — so the law is single-hop by construction. The
    // per-piece rows are kept for the granted-skill host scan below.
    const containerSheetMods = new Map<string, Modifier[]>();
    const containerPieceMods = new Map<ItemInstance, Modifier[]>();
    for (const def of CONTAINER_DEFS) {
      const held = m.containers[def.id];
      if (!def.active || !held?.length) continue;
      if (def.id === 'reliquary' && m.relicEnabled === false) continue;
      const board = containerBoard(def);
      if (!board) continue;
      const misfit = new Set(containerMisfits(board, held));
      const seatedPieces = held.filter(it => !misfit.has(it));
      const compiled = new Map<ItemInstance, Modifier[]>();
      for (const seated of seatedPieces) compiled.set(seated, compileItemMods(seated));
      const amps = seatAmplification(board, seatedPieces, it => compiled.get(it) ?? []);
      const sheetMods: Modifier[] = [];
      for (const seated of seatedPieces) {
        const mods = def.id === 'reliquary'
          ? empowerRelicMods(compiled.get(seated) ?? [], (seat.meta.relicEmpowerment ?? 0), amps.get(seated) ?? 1)
          : amplifySeatMods(compiled.get(seated) ?? [], amps.get(seated) ?? 1);
        containerPieceMods.set(seated, mods);
        for (const gm of mods) {
          if (isAttributeId(gm.stat)) {
            if (gm.kind === 'flat') attrs[gm.stat] += gm.value;
            else if (gm.kind === 'increased') attrsPct[gm.stat] += gm.value;
          } else {
            sheetMods.push(gm);
          }
        }
      }
      containerSheetMods.set(def.id, sheetMods);
    }
    // THE PERCENT PHASE: attributesPct scales the fully-summed flat pool
    // (class base + tree + choices + gear), floored at 0 and rounded so every
    // consumer (skill gates, per-point mods, the char sheet) sees whole points.
    for (const a of ATTRIBUTE_IDS) {
      attrs[a] = Math.max(0, Math.round(attrs[a] * (1 + attrsPct[a])));
    }
    m.attrs = attrs;

    p.setAttributes(attrs);
    p.sheet.setSource('class', m.classDef.innate ?? []);
    p.sheet.setSource('passives', passiveMods);
    // One attributable source per doll slot — equip/unequip/retune all
    // converge here, and removeSource keeps empty slots contributing nothing.
    for (const slot of EQUIP_SLOTS) {
      const mods = gearSheetMods.get(slot.id);
      if (mods) p.sheet.setSource('gear:' + slot.id, mods);
      else p.sheet.removeSource('gear:' + slot.id);
    }
    // One attributable source per side board (THE CONTAINER FOLD above) —
    // seat/unseat/retune all converge here like the doll's slots.
    for (const def of CONTAINER_DEFS) {
      const mods = containerSheetMods.get(def.id);
      if (mods) p.sheet.setSource('container:' + def.id, mods);
      else p.sheet.removeSource('container:' + def.id);
    }
    // THE GRANTED SKILL (skillgrant_<id> — engine/skills.ts; THE LEGEND
    // FABRIC, docs/engine/legends.md): modifier sources GRANT whole skills.
    // Candidates come from the same prefix scan the worn graft runs below
    // (zero cost when the family is absent); each id folds through the ONE
    // stat engine (grantors SUM, floored, clamped to the skill's own max;
    // below 1 grants nothing), and the seat keeps ONE identity-stable
    // SkillInstance per granted id (Seat.grantedInsts — never the learned
    // book: a grant is worn, not owned). THE RESIDENCE ON THE ITEM: the
    // first worn piece carrying the stat HOSTS the instance's sockets and
    // tree picks (ItemInstance.grantState) — written back here from the
    // live instance every recalc (every socket/tree mutation recalcs), so
    // a later equip, load or wire mints the same stones back. THE
    // SEATING: grants are optional manual skills by default (GRANT_CFG.autoSeat);
    // triggers can use them without a bar seat. A grant that LEAVES comes
    // off the bar, its toggles shut, its instance dropped.
    {
      const grantStats = new Set<string>();
      const companionGrantIds = new Set<string>();
      const scanGrants = (mods: readonly Modifier[] | undefined): void => {
        if (!mods) return;
        for (const gm of mods) {
          if (gm.stat.startsWith(SKILLGRANT_PREFIX)) grantStats.add(gm.stat);
          if (gm.stat.startsWith(COMPANION_GRANT_PREFIX)) companionGrantIds.add(gm.stat.slice(COMPANION_GRANT_PREFIX.length));
        }
      };
      scanGrants(m.classDef.innate);
      scanGrants(passiveMods);
      for (const mods of gearSheetMods.values()) scanGrants(mods);
      for (const mods of containerSheetMods.values()) scanGrants(mods); // a seated relic may grant (THE CONTAINER FOLD)
      nativeHost.companionGrants.derive(p, [...companionGrantIds].flatMap(id => SKILLS[id] ? [SKILLS[id]] : []), id => {
        const stat = companionGrantStat(id);
        for (const slot of EQUIP_SLOTS) {
          if (gearSheetMods.get(slot.id)?.some(m => m.stat === stat)) return m.equipped[slot.id]!.name;
        }
        for (const [item, mods] of containerPieceMods) if (mods.some(m => m.stat === stat)) return item.name;
        return 'your passives';
      }, body => nativeHost.kill(body, true), (body, inst) => {
        const fraction = body.life / body.maxLife();
        nativeHost.relevelActor(body, p.level);
        body.radius = MONSTERS[body.defId!]?.radius ?? body.radius;
        nativeHost.bakeMinionOwnerStats(body, p, inst);
        body.life = Math.min(body.maxLife(), fraction * body.maxLife());
      }, id => {
        if ([...gearSheetMods.values()].some(mods => mods.some(m => m.stat === companionGrantStat(id)))) return undefined;
        return [...containerPieceMods].find(([, mods]) => mods.some(m => m.stat === companionGrantStat(id)))?.[0].relicKey;
      });
      const prevInsts = seat.grantedInsts;
      const keep = new Map<string, SkillInstance>();
      const rows: GrantedSkillRow[] = [];
      for (const stat of grantStats) {
        const skillId = parseSkillGrantStat(stat);
        const def = skillId ? SKILLS[skillId] : undefined;
        if (!skillId || !def) continue; // registry-tolerant: a retired skill grants silence
        const level = Math.min(skillMaxLevel(def), Math.floor(p.sheet.get(stat)));
        if (level < 1) continue;
        // THE HOST: the first worn piece whose compiled lines carry the stat.
        let host: ItemInstance | undefined;
        for (const slot of EQUIP_SLOTS) {
          const worn = m.equipped[slot.id];
          if (worn && gearSheetMods.get(slot.id)?.some(gm => gm.stat === stat)) { host = worn; break; }
        }
        // …then the first SEATED container piece carrying it (a relic that
        // grants — its stones live on the relic, THE RESIDENCE ON THE ITEM).
        if (!host) {
          for (const [seated, mods] of containerPieceMods) {
            if (mods.some(gm => gm.stat === stat)) { host = seated; break; }
          }
        }
        const previousGrant = prevInsts?.get(skillId);
        let inst = previousGrant?.grantedHostUid === host?.uid ? previousGrant : undefined;
        if (inst) {
          inst.level = level;
        } else {
          inst = makeSkillInstance(def, level, GRANT_CFG.sockets);
          const state = host?.grantState?.[skillId];
          if (state) restoreGrantState(inst, state);
        }
        inst.grantedBy = host?.name ?? 'your passives';
        inst.grantedHostUid = host?.uid;
        inst.relicSource = host?.relicKey;
        // A new granting item restores its own investment, never copies the old item's stones.
        if (previousGrant && previousGrant !== inst) {
          for (let i = 0; i < p.skills.length; i++) if (p.skills[i] === previousGrant) p.skills[i] = inst;
        }
        keep.set(skillId, inst);
        // A learned copy takes over the old granted seat without losing its investment.
        const beneficiary = m.knownSkills.get(skillId);
        if (beneficiary) {
          for (let i = 0; i < p.skills.length; i++) if (p.skills[i] === inst) {
            p.skills[i] = p.skills.includes(beneficiary) ? null : beneficiary;
          }
        }
        if (host) (host.grantState ??= {})[skillId] = packGrantState(inst);
        rows.push({ def, level, inst, source: inst.grantedBy, hostUid: host?.uid, slot: p.skills.indexOf(inst) });
      }
      // Grants that LEFT: off the bar, workings shut, the instance dropped.
      if (prevInsts) {
        for (const [id, inst] of prevInsts) {
          if (keep.get(id) === inst) continue;
          for (let i = 0; i < p.skills.length; i++) if (p.skills[i] === inst) p.skills[i] = null;
          if (p.activeAuras.get(id)?.inst === inst) nativeHost.deactivateAura(p, id);
          if (p.summonToggles.get(id)?.inst === inst) nativeHost.dismissSummonToggle(p, id);
        }
      }
      if (GRANT_CFG.autoSeat) {
        for (const row of rows) {
          if (row.slot >= 0 || m.knownSkills.has(row.def.id)) continue; // no duplicate grant
          const free = p.skills.indexOf(null);
          if (free < 0) break;
          p.skills[free] = row.inst;
          row.slot = free;
        }
      }
      seat.grantedInsts = keep.size ? keep : undefined;
      seat.grantedSkills = rows.length ? rows.sort((a, b) => a.def.name.localeCompare(b.def.name)) : undefined;
    }
    // Every instance the seat WIELDS — the learned book plus the granted
    // lane — for the per-instance derivations below (bonus levels, tree
    // grafts, worn grafts all reach a granted skill exactly as a learned one).
    const wielded = (): SkillInstance[] => seat.grantedInsts
      ? [...m.knownSkills.values(), ...seat.grantedInsts.values()] : [...m.knownSkills.values()];
    // "+N to <Class> Skills": sum every classSkill_<id> stat whose class can
    // OPEN with this skill — its bar starters AND its mastery alternates
    // (classOpeningSkills) — dynamic against the LIVE registry, so re-barring
    // a class retunes every such affix with zero data edits. Written onto the
    // instance (bonusLevels) so effectiveSkillLevel needs no actor threading.
    for (const inst of wielded()) {
      const grant = seat.grantedInsts?.get(inst.def.id);
      let bonus = grant && grant !== inst && p.skills.includes(inst) ? grant.level : 0;
      for (const c of CLASSES) {
        if (classOpeningSkills(c).includes(inst.def.id)) bonus += p.sheet.get(classSkillStat(c.id));
      }
      inst.bonusLevels = bonus;
    }
    // GRAFTS: rebuild every instance's mutator lane from the bound sources —
    // derived state exactly like bonusLevels above. A binding whose source
    // was never earned (or whose skill left the book) simply injects nothing.
    for (const inst of wielded()) inst.grafts = undefined;
    for (const s of graftSourcesOf(m.allocated, m.choices, PASSIVE_NODES)) {
      const skillId = m.grafts[s.key];
      if (!skillId) continue;
      const inst = m.knownSkills.get(skillId);
      const def = SUPPORTS[s.graft.support];
      if (!inst || !def) continue;
      (inst.grafts ??= []).push({ def, level: s.graft.level ?? 1 });
    }
    // THE SKILL-MODE TREES (M1): a spent node's `graft` payload injects
    // here — derived exactly like the passive lane above (never saved; the
    // Font reset re-derives it away). Authored per-skill, so fit is the
    // AUTHOR's warrant (boot validation warns); the no-second-copy law
    // still yields to a socketed or earlier-grafted twin.
    for (const inst of wielded()) {
      for (const nid of inst.treeNodes ?? []) {
        const g = treeNodeOf(inst.def, nid)?.graft;
        const def = g ? SUPPORTS[g.support] : undefined;
        if (!def) continue; // warn-degrade: an unknown support grants silence
        if (inst.sockets.some(s => s?.def.id === def.id)
          || inst.grafts?.some(r => r.def.id === def.id)) continue;
        (inst.grafts ??= []).push({ def, level: g!.level ?? 1 });
      }
    }
    // THE WORN GRAFT (slotgraft_<slot>_<gem> — engine/skills.ts): modifier
    // sources bind a granted gem to a BAR SEAT; the player aims it by
    // binding skills (bindSkill re-derives). Candidates come from a prefix
    // scan of the recalc-time mod arrays already in hand — class innate,
    // tree grants, worn gear (vestige words included via compileItemMods) —
    // so the pass costs nothing when the family is absent; each found id
    // then folds through the ONE stat engine (sheet.get: every source and
    // increase honored, multiple grantors SUM). Injection mirrors
    // socketSupport: the full crew-aware gate (a misfit stays dormant and
    // self-lifts when a socketed enabler arrives — recalc re-runs it), and
    // the forward lane's no-second-copy law (a gem already socketed, or
    // grafted by an earlier source, wins; the worn copy yields). Level:
    // floored sum, clamped to MAX_SUPPORT_LEVEL; below 1 grants nothing.
    {
      const wornGraftIds = new Set<string>();
      const scanMods = (mods: readonly Modifier[] | undefined): void => {
        if (!mods) return;
        for (const gm of mods) if (gm.stat.startsWith(SLOTGRAFT_PREFIX)) wornGraftIds.add(gm.stat);
      };
      scanMods(m.classDef.innate);
      scanMods(passiveMods);
      for (const mods of gearSheetMods.values()) scanMods(mods);
      const wornRows: WornGraftRow[] = [];
      for (const stat of wornGraftIds) {
        const seatRef = parseSlotGraftStat(stat);
        if (!seatRef) continue;
        const def = SUPPORTS[seatRef.gemId];
        if (!def) continue; // registry-tolerant: a de-registered gem grants silence
        const level = Math.min(MAX_SUPPORT_LEVEL, Math.floor(p.sheet.get(stat)));
        if (level < 1) continue;
        const inst = p.skills[seatRef.slot];
        const state: WornGraftRow['state'] =
          !inst ? 'empty'
            : inst.sockets.some(s => s?.def.id === def.id) || inst.grafts?.some(g => g.def.id === def.id) ? 'duplicate'
              : !supportFitsInstOrCrew(def, inst, nativeHost.summonCrewSkills(inst)) ? 'unfit'
                : 'live';
        wornRows.push({ slot: seatRef.slot, def, level, skillId: inst?.def.id, state });
        if (state === 'live' && inst) (inst.grafts ??= []).push({ def, level });
      }
      // THE FIXPOINT (order-independence): the pass above gates in SCAN
      // order (innate → passives → gear slots), so a worn DEPENDENT read
      // before its worn ENABLER pushed would stay 'unfit' on arrangement
      // alone — permanently, since every recalc scans the same way. Pushes
      // only ADD to the riders pool, so the gate is monotone: re-run it over
      // the unfit rows until none flips and the admitted set matches the
      // socket lane's own sequential admission whatever order the scan dealt.
      // A row can never turn 'duplicate' here (one stat per slot+gem — no
      // two worn rows share a def on one instance), and mutually-dependent
      // pairs still refuse (neither ever fits alone): socket-time semantics
      // untouched, only the order sensitivity gone.
      for (let flipped = true; flipped;) {
        flipped = false;
        for (const row of wornRows) {
          if (row.state !== 'unfit') continue;
          const inst = p.skills[row.slot];
          if (!inst || !supportFitsInstOrCrew(row.def, inst, nativeHost.summonCrewSkills(inst))) continue;
          row.state = 'live';
          (inst.grafts ??= []).push({ def: row.def, level: row.level });
          flipped = true;
        }
      }
      // THE LEDGER (UI read path — panels speak dormancy from these rows in
      // the injection's own verdicts; one derivation, one spelling). Sorted
      // for stable render order (Set order follows scan order otherwise).
      seat.wornGrafts = wornRows.length
        ? wornRows.sort((a, b) => a.slot - b.slot || a.def.id.localeCompare(b.def.id))
        : undefined;
    }
    p.sheet.setSource('level', [
      mod('life', 'flat', (p.level - 1) * PROGRESSION.lifePerLevel),
      mod('mana', 'flat', (p.level - 1) * PROGRESSION.manaPerLevel),
      mod('accuracy', 'flat', (p.level - 1) * 4),
    ]);
    p.life = Math.min(p.life, p.maxLife());
    p.mana = Math.min(p.mana, p.maxMana());
    nativeHost.guardArts.sync(p);
    nativeHost.companionBonds.refresh();
  }

export function sceneResyncMercenary(nativeHost:NativeSceneProgressionHost): void {
    if (!nativeHost.hiredMercs.length || !MERC_CFG.scale.trackLevel) return;
    if (nativeHost.mercTargetLevel() === nativeHost.mercSyncedLevel) return;
    for (const hm of nativeHost.hiredMercs) nativeHost.applyMercNormalization(hm.seat, hm.snapshot, false);
  }

export function sceneMercTargetLevel(nativeHost:NativeSceneProgressionHost): number {
    return MERC_CFG.scale.anchor === 'zoneLevel'
      ? Math.max(1, nativeHost.zone.level)
      : Math.max(1, nativeHost.player.level);
  }

export function sceneApplyMercNormalization(nativeHost:NativeSceneProgressionHost,seat: Seat, snapshot: MercSnapshot, firstSpawn: boolean): boolean {
    const targetLevel = nativeHost.mercTargetLevel();
    const meta = nativeHost.normalizeMercMeta(snapshot, targetLevel);
    if (!meta) return false;
    // The blade's given name survives every re-normalization (resyncs replace
    // the whole meta — the identity must not reset to the class name).
    if (seat.merc) meta.name = seat.merc.name;
    const a = seat.actor;
    const frac = a.maxLife() > 0 ? a.life / a.maxLife() : 1;
    seat.meta = meta;
    a.level = targetLevel;
    a.skills = padBar(snapshot.bar.map(id => (id ? meta.knownSkills.get(id) ?? null : null)));
    nativeHost.recalcSeat(seat);
    // THE PATRON'S HAND (the mercVigor stat — Iron Company): the patron's
    // investment rides the blade's own sheet as one named source, re-stamped
    // on every resync exactly like the normalization it follows.
    const vigor = Math.max(0, nativeHost.player.sheet.get('mercVigor'));
    if (vigor > 0) {
      a.sheet.setSource('patron', [mod('life', 'increased', vigor), mod('damage', 'increased', vigor)]);
    } else {
      a.sheet.removeSource('patron');
    }
    if (firstSpawn) a.fillResources();
    else {
      a.life = Math.max(1, a.maxLife() * Math.min(1, frac));
      a.mana = Math.min(a.mana, a.maxMana());
    }
    nativeHost.mercSyncedLevel = targetLevel;
    nativeHost.markMetaDirty(seat);
    return true;
  }

export function sceneNormalizeMercMeta(nativeHost:NativeSceneProgressionHost,snapshot: MercSnapshot, targetLevel: number): PlayerMeta | null {
    const classDef = CLASSES.find(c => c.id === snapshot.classId);
    if (!classDef) return null;
    const scale = MERC_CFG.scale;
    const capNow = scale.gemLevelCap(targetLevel);
    const capThen = Math.max(1, scale.gemLevelCap(Math.max(1, snapshot.level)));
    const gemLevel = (orig: number): number =>
      Math.max(1, Math.min(capNow, Math.round(orig * (capNow / capThen))));

    const knownSkills = new Map<string, SkillInstance>();
    for (const ss of snapshot.knownSkills) {
      const inst = rebuildSkill({
        skillId: ss.skillId, level: gemLevel(ss.level), rarity: ss.rarity,
        empowermentRank: ss.empowermentRank, treeNodes: ss.treeNodes,
        sockets: ss.sockets.map(s => s ? { supportId: s.supportId, level: gemLevel(s.level) } : null),
      });
      if (inst) knownSkills.set(inst.def.id, inst);
    }

    const equipped: Partial<Record<string, ItemInstance>> = {};
    for (const [slot, it] of Object.entries(snapshot.equipped ?? {})) {
      const item = rebuildItem(it);
      if (!item) continue;
      if (scale.respectGearLevelReq && itemLevelReq(item) > targetLevel) continue;
      equipped[slot] = item;
    }

    const allocated = nativeHost.trimAllocated(snapshot, scale.passiveBudget(targetLevel));
    return {
      classDef,
      // THE STAMPED OPENING: a blade's opening is the loadout it was fielded
      // with (the template's or the veteran's own bar) — its own truth.
      opening: [...snapshot.bar],
      stances: {},
      name: classDef.name, // the seat's DISPLAY name is stamped by the spawner
      baseAttrs: { ...snapshot.baseAttrs },
      attrs: { ...snapshot.baseAttrs },
      xp: 0, xpNeeded: PROGRESSION.xpForLevel(targetLevel),
      passivePoints: 0,
      allocated,
      // Choices survive normalization only where their node survived the
      // budget trim (a pick on a trimmed node would be a phantom grant).
      choices: Object.fromEntries(Object.entries(sanitizeChoices(snapshot.choices, PASSIVE_NODES, allocated))
        .filter(([id]) => allocated.has(id))),
      // Veterans field WITHOUT realm currencies or graft bindings (v1) — the
      // trim walks from the class start, so realm constellations fall away.
      realmPoints: {},
      grafts: {},
      vocations: [...(snapshot.vocations ?? [])],
      vocationPoints: 0,
      knownSkills,
      items: [], equipped, containers: {},
      essences: emptyEssences(), abilityEssences: emptyAbilityEssences(), vestiges: {},
      modeId: DEFAULT_MODE_ID, modeStage: 0, charId: '',
    };
  }

export function sceneTrimAllocated(nativeHost:NativeSceneProgressionHost,snapshot: MercSnapshot, budget: number): Set<string> {
    const want = new Set(snapshot.allocated);
    const seeds = [
      classStartNode(snapshot.classId),
      ...(snapshot.vocations ?? []).map(v => `voc_${v}_root`),
    ].filter(id => want.has(id));
    const out = new Set(seeds);
    const queue = [...seeds];
    let spent = 0;
    while (queue.length && spent < budget) {
      const cur = queue.shift()!;
      for (const nb of PASSIVE_ADJACENCY[cur] ?? []) {
        if (spent >= budget) break;
        if (!want.has(nb) || out.has(nb)) continue;
        out.add(nb);
        queue.push(nb);
        spent++;
      }
    }
    return out;
  }

export type NativeSceneRelevelHost=Pick<NativeSceneProgressionHost,'stampMonsterLevel'>;
export type NativeSceneMinionOwnerStatsHost=Pick<NativeSceneProgressionHost,'account'|'localSeat'|'seatOf'|'relevelActor'>;
export function sceneRelevelActor(nativeHost:NativeSceneRelevelHost,a: Actor, level: number): void {
    const def = a.defId ? MONSTERS[a.defId] : undefined;
    if (!def || a.level === level) return;
    const lifeFrac = a.life / Math.max(1, a.maxLife());
    const plyFrac = a.pliesMax > 0 ? a.plies / a.pliesMax : 1;
    nativeHost.stampMonsterLevel(a, def, level);
    a.life = Math.min(a.maxLife(), Math.max(a.life > 0 ? 1 : 0, a.maxLife() * lifeFrac));
    a.plies = Math.min(a.pliesMax, Math.round(a.pliesMax * plyFrac));
    const skillLevel = monsterSkillLevelOf(level);
    for (const s of a.skills) if (s) s.level = skillLevel;
  }

export function sceneBakeMinionOwnerStats(nativeHost:NativeSceneMinionOwnerStatsHost,minion: Actor, caster: Actor, inst: SkillInstance, scale = 1): void {
    const relic = !!inst.relicSource;
    const inherited = resolveMinionInheritance(caster, inst, minion.defId, scale);
    for (const source of minion.sheet.sourceNames()) if (source.startsWith('relic:')) minion.sheet.removeSource(source);
    if (relic) {
      nativeHost.relevelActor(minion, Math.max(1, Math.floor(caster.level * RELIQUARY_CFG.minion.levelFactor)));
      const power = nativeHost.seatOf(caster) === nativeHost.localSeat ? reliquaryPower(nativeHost.account.reliquary) : 0;
      const factor = 1 + power * RELIQUARY_CFG.minion.empowerment;
      minion.sheet.setSource('relic:' + inst.relicSource, [
        mod('damage', 'more', RELIQUARY_CFG.minion.baseDamage * factor - 1),
        mod('life', 'more', RELIQUARY_CFG.minion.baseLife * factor - 1),
      ]);
    }
    const throngSpentPlies = Math.max(0, minion.pliesMax - minion.plies);
    minion.sheet.setSource('minionCombat', inherited.combatMods);
    minion.sheet.setSource('owner', inherited.ownerMods);
    minion.radius = Math.max(5, ((inst.def.throng || inst.def.hivecall)
      ? MONSTERS[minion.defId!]?.radius ?? minion.radius : minion.radius) * inherited.size);
    syncAttributeBequests(minion, relic ? scale * RELIQUARY_CFG.minion.ordinaryStats : scale, inherited.tags, inherited.extra);
    minion.guardMode = inherited.guard;
    applyMinionPlyBonus(minion, inherited.plyBonus);
    if (!inst.def.throng) return;
    minion.summonInst = inst;
    const evo = throngEvolution(inst), units = minion.throngUnits ?? 1;
    minion.sheet.setSource('throngEvolution:body', [
      mod('life', 'more', units - 1),
      mod('damage', 'more', units - 1),
      mod('damage', 'more', evo.damageMore ?? 0),
    ]);
    if (evo.cluster) {
      const bonus = throngClusterPlies(units);
      minion.pliesMax += bonus;
      minion.plies = Math.max(0, minion.pliesMax - throngSpentPlies);
      minion.radius *= Math.min(8, Math.sqrt(units));
    }
  }

export function sceneSummonCrewSkills(nativeHost:NativeSceneProgressionHost,inst: SkillInstance): SummonCrew {
    const resolved = instanceDelivery(inst);
    const d: SummonDelivery | undefined =
      resolved.type === 'summon' ? resolved : instanceSummon(inst);
    return summonCrewOf(d, id => MONSTERS[id], id => SKILLS[id]);
  }

export function sceneCompanionCapOf(nativeHost:NativeSceneProgressionHost,inst: SkillInstance): number {
    const fx = inst.def.effects.find((f): f is Extract<SkillEffect, { type: 'tame' }> => f.type === 'tame');
    return Math.max(1, (fx?.slots ?? 1) + instanceTameMod(inst).slotsAdd);
  }

export function sceneDeactivateAura(nativeHost:NativeSceneProgressionHost,bearer: Actor, skillId: string, quietTreeRelease = false): void {
    const aura = bearer.activeAuras.get(skillId);
    if (!aura) return;
    // A toggle-installed rear-guard shell drops with its toggle (a shell
    // worn as ANATOMY — MonsterDef.shellGuard — has no fromAura and stays).
    if (bearer.shellGuard?.fromAura === skillId) {
      // THE ANSWERING SHELL (guardBash beyond the stance, 2026-07-22):
      // the dropped rear-guard answers with its REMAINING pool — an
      // unspent shell detonates whole, a battered one with what it held,
      // a broken one already did its work.
      const pool = bearer.shellGuard.broken ? 0 : bearer.shellGuard.pool;
      bearer.shellGuard = undefined;
      const sInst = bearer.skills.find(k => k?.def.id === skillId);
      const sBash = sInst ? guardBashSpec(sInst) : undefined;
      if (sInst && sBash && pool > 0 && !quietTreeRelease) nativeHost.guardBash(bearer, sInst, sBash, pool);
    }
    // Strip this aura's modifiers from everyone it touched.
    const sourceName = 'aura:' + skillId + ':' + bearer.id;
    for (const a of nativeHost.actors) {
      if (aura.affected.has(a.id)) a.sheet.removeSource(sourceName);
    }
    if (aura.reserved > 0) {
      // The blood pact frees its LIFE lane; everything else frees mana.
      if (aura.lifeLane) {
        bearer.reservedLife = Math.max(0, bearer.reservedLife - aura.reserved);
      } else {
        bearer.reservedMana = Math.max(0, bearer.reservedMana - aura.reserved);
      }
    }
    // SEALS & FORMS teardown: unlock the sealed pool, strip the dynamic
    // seal source, and — for a LIVING bearer — toll the deactivation
    // payload, scaled by how long the seal held and how deep the wound.
    {
      const dv0 = aura.inst.def.delivery;
      if (dv0.type === 'aura') {
        bearer.sheet.removeSource('auraself:' + skillId); // TreeAuraPatch can add selfMods to a natively empty aura
        if (dv0.seal) {
          // The lock only lifts when the LAST standing seal releases —
          // dropping one of two stacked seals must not free the pool.
          const otherSeal = [...bearer.activeAuras.values()].some(a2 => {
            const d2 = a2.inst.def.delivery;
            return a2.inst.def.id !== skillId && d2.type === 'aura' && !!d2.seal;
          });
          if (!otherSeal) bearer.lifeSealAt = undefined;
          bearer.sheet.removeSource('seal:' + skillId);
        }
        const od = dv0.onDeactivate;
        if (od && !quietTreeRelease && !bearer.dead && SKILLS[od.skillId]) {
          const held = nativeHost.time - (aura.since ?? nativeHost.time);
          const missing = 1 - bearer.life / Math.max(1, bearer.maxLife());
          const mult = Math.min(od.maxScale ?? 5,
            1 + (od.scalePerSec ?? 0) * held)
            * (1 + (od.missingLifeScale ?? 0) * missing);
          const payload = makeSkillInstance(SKILLS[od.skillId],
            effectiveSkillLevel(aura.inst));
          // Bell tolls AFTER the map delete below would be ideal, but the
          // payload never re-enters this aura (distinct skill id) — safe.
          nativeHost.executeSkill(bearer, payload, vec(bearer.pos.x, bearer.pos.y), {
            dmgMult: mult, noCooldown: true, noRepeat: true,
          });
        }
        // THE LEDGER SETTLES (never on death — a corpse owes nothing):
        // the lapse lands the deferred wound or vents the suppressed mana.
        if (dv0.ledger && aura.ledger && !bearer.dead) {
          nativeHost.settleLedger(bearer, dv0.ledger, aura.ledger);
        }
      }
    }
    // Close any overdrive lane this toggle opened. Debt is provably 0 by
    // the canUse lock (except on death) — clear residue defensively.
    const dv = aura.inst.def.delivery;
    if (dv.type === 'aura' && dv.overdrive) {
      const od = bearer.overdrive[dv.overdrive.lane];
      if (od && od.inst.def.id === skillId) {
        if (dv.overdrive.lane === 'mana') {
          bearer.reservedMana = Math.max(0, bearer.reservedMana - od.debt);
        } else {
          bearer.reservedLife = Math.max(0, bearer.reservedLife - od.debt);
        }
        delete bearer.overdrive[dv.overdrive.lane];
      }
    }
    bearer.activeAuras.delete(skillId);
  }

export function sceneDismissSummonToggle(nativeHost:NativeSceneProgressionHost,owner: Actor, skillId: string): void {
    const t = owner.summonToggles.get(skillId);
    if (!t) return;
    owner.summonToggles.delete(skillId);
    nativeHost.clearSummonReleaseFields(owner, t.inst);
    for (const m of nativeHost.minionsOfSkill(owner, skillId)) {
      nativeHost.releaseContract(m, false);
      nativeHost.kill(m, true);
    }
    for (let i = nativeHost.pendingRespawns.length - 1; i >= 0; i--) {
      const pr = nativeHost.pendingRespawns[i];
      if (pr.caster === owner && pr.inst.def.id === skillId) nativeHost.pendingRespawns.splice(i, 1);
    }
    // A sequenced ON-fill still emerging dies with the contract — every
    // ending funnels through here (the OFF-press, the radio-button pool
    // swap, unlearn, owner death), so a dead toggle never keeps birthing.
    for (let i = nativeHost.pendingSummons.length - 1; i >= 0; i--) {
      const ps = nativeHost.pendingSummons[i];
      if (ps.caster === owner && ps.inst.def.id === skillId) nativeHost.pendingSummons.splice(i, 1);
    }
    owner.reservedMana = Math.max(0, owner.reservedMana - t.reserved);
  }

export function sceneClearSummonReleaseFields(nativeHost:NativeSceneProgressionHost,owner: Actor, inst: SkillInstance): void {
    const d = instanceDelivery(inst);
    if (d.type !== 'summon' || !d.strikeRelease) return;
    const payloads = [...nativeHost.projectiles, ...nativeHost.zones, ...nativeHost.pendingRepeats, ...nativeHost.pendingFuses,
      ...nativeHost.pendingSalvos, ...nativeHost.pendingSteps, ...nativeHost.pendingFollowUps];
    const bodies = new Set([...nativeHost.actors, ...payloads.map(p => p.caster)]);
    for (const body of bodies) if (body.owner === owner && body.summonInst === inst) {
      const skills = new Set([...body.skills.filter((s): s is SkillInstance => !!s),
        ...payloads.filter(p => p.caster === body).map(p => p.inst)]);
      for (const skill of skills) nativeHost.clearTreeFields(body, skill);
    }
  }

export function sceneMinionsOfSkill(nativeHost:NativeSceneProgressionHost,owner: Actor, skillId: string): Actor[] {
    return nativeHost.actors.filter(a =>
      a.owner === owner && !a.dead && !a.summonInst?.companionGrant && a.sourceSkillId === skillId);
  }

export function sceneReleaseContract(nativeHost:NativeSceneProgressionHost,minion: Actor, scheduleRespawn: boolean): void {
    const owner = minion.owner;
    if (owner && minion.manaReserved > 0) {
      owner.reservedMana = Math.max(0, owner.reservedMana - minion.manaReserved);
      minion.manaReserved = 0;
    }
    const inst = minion.summonInst;
    if (scheduleRespawn && !inst?.companionGrant && !inst?.def.hivecall && !minion.summonOffspring && owner && !owner.dead && inst
      && inst.def.delivery.type === 'summon' && inst.def.delivery.persistent) {
      const tags = skillContextTags(inst);
      const extra = instanceMods(inst);
      const timer = inst.def.delivery.persistent.respawnTime
        * owner.sheet.get('minionRespawnTime', tags, extra);
      nativeHost.pendingRespawns.push({ caster: owner, inst, timer });
    }
  }

export function sceneSettleLedger(nativeHost:NativeSceneProgressionHost,bearer: Actor, spec: LedgerSpec, state: { balance: number }): void {
    const due = state.balance;
    state.balance = 0;
    if (due < 0.5 || bearer.dead) return;
    if (spec.lapse === 'landDamage') {
      bearer.life -= due;
      bearer.hitFlash = 0.2;
      bearer.hitFlashType = undefined; // raw arrears — the flash reads white
      nativeHost.text(bearer.pos, `arrears due: ${Math.round(due)}`, '#d05050', 13);
      if (bearer.life <= 0 && !bearer.dead) nativeHost.kill(bearer);
    } else if (spec.lapse === 'ventMana') {
      bearer.mana = Math.min(bearer.availableMaxMana(), bearer.mana + due);
      const vd = spec.ventDamage;
      if (vd) {
        const tint = DAMAGE_COLOR[vd.damageType ?? 'lightning'];
        nativeHost.burstDamage(vec(bearer.pos.x, bearer.pos.y), vd.radius,
          due * vd.perPoint, vd.damageType ?? 'lightning', tint, bearer.team, bearer.tier);
        nativeHost.flashes.push({
          pos: vec(bearer.pos.x, bearer.pos.y), radius: vd.radius,
          color: tint, life: 0.35, maxLife: 0.35,
        });
      }
      nativeHost.text(bearer.pos, `reclaimed ${Math.round(due)}`, '#4a78d8', 13);
    }
  }

export function sceneClearTreeFields(nativeHost:NativeSceneProgressionHost,caster: Actor, inst: SkillInstance): void {
    nativeHost.guardArts.clear(caster, inst);
    nativeHost.attackSequences.clear(caster, inst);
    nativeHost.challenges.clear(caster, inst);
    const ownsTreePayload = (candidate: SkillInstance) => candidate === inst || candidate.invocationHost === inst || candidate.followUpHost === inst || candidate.challengeHost === inst || candidate.guardArtsHost === inst;
    nativeHost.pendingFollowUps = nativeHost.pendingFollowUps.filter(p => p.caster !== caster || !ownsTreePayload(p.inst));
    caster.primedPours = caster.primedPours.filter(p => p.skillId !== inst.def.id);
    caster.clearTreeChargeClocks(inst);
    if (inst.def.invokes) caster.runes = []; // invocationHost cannot carry old alphabet fuel through a respec
    // quietTreeRelease retires captured aura bonuses and reservations without
    // paying a release attack. Existing resource debts still settle normally.
    if (caster.activeAuras.get(inst.def.id)?.inst === inst) nativeHost.deactivateAura(caster, inst.def.id, true);
    nativeHost.clearTreeConstructs(caster, inst);
    caster.castCycles.delete(inst.def.id);
    for (const [key, step] of caster.metaInsts) if (step.chainOf === inst.def.id) {
      nativeHost.clearTreeFields(caster, step);
      caster.metaInsts.delete(key);
    }
    for (const actor of nativeHost.actors) for (const [id, buff] of actor.buffs) {
      const source = nativeHost.treeBuffSources.get(buff.def);
      if (source?.caster === caster && source.inst === inst) actor.removeBuff(id);
    }
    nativeHost.pendingFuses = nativeHost.pendingFuses.filter(f => f.caster !== caster || !ownsTreePayload(f.inst));
    nativeHost.pendingBlinks = nativeHost.pendingBlinks.filter(b => {
      const keep = b.actor !== caster || !b.inst || !ownsTreePayload(b.inst);
      if (!keep && b.visual) b.visual.life = 0;
      return keep;
    });
    // Scheduled repeats capture the old tree just as delayed fields do.
    nativeHost.pendingRepeats = nativeHost.pendingRepeats.filter(r => r.caster !== caster || !ownsTreePayload(r.inst));
    nativeHost.pendingSalvos = nativeHost.pendingSalvos.filter(r => r.caster !== caster || !ownsTreePayload(r.inst));
    nativeHost.pendingSteps = nativeHost.pendingSteps.filter(r => r.caster !== caster || !ownsTreePayload(r.inst));
    // Flights and their carried ground can outlive the allocation too.
    nativeHost.projectiles = nativeHost.projectiles.filter(p => p.caster !== caster || (!ownsTreePayload(p.inst) && nativeHost.recallTreeSpears.get(p.inst) !== inst));
    for (const p of nativeHost.projectiles) if (p.caster === caster && p.suffuse?.inst === inst) delete p.suffuse;
    // Held casts can snapshot guard pools and derived grafts. Changing the
    // allocation retires that stance without paying a release attack.
    if (caster.casting?.inst === inst) caster.casting = null;
    if (caster.shellGuard?.fromAura === inst.def.id) caster.shellGuard = undefined;
    // Tree fields snapshot radius, timing and reservations: retire them before
    // changing their instance so old powers cannot survive a new allocation.
    for (let i = nativeHost.zones.length - 1; i >= 0; i--) {
      const z = nativeHost.zones[i];
      if (z.caster !== caster || !ownsTreePayload(z.inst)) continue;
      nativeHost.expireZone(z);
      nativeHost.zones.splice(i, 1);
    }
  }

export function sceneClearTreeConstructs(nativeHost:NativeSceneProgressionHost,caster: Actor, inst: SkillInstance): void {
    const bodies = new Set([...nativeHost.actors, ...nativeHost.projectiles.map(p => p.caster),
      ...nativeHost.zones.map(z => z.caster), ...nativeHost.pendingFuses.map(f => f.caster), ...nativeHost.pendingRepeats.map(r => r.caster)]);
    for (const body of bodies) if (body.construct && body.owner === caster && body.summonInst === inst) {
      nativeHost.clearTreeFields(body, inst);
      if (body.construct.castInst && body.construct.castInst !== inst) nativeHost.clearTreeFields(body, body.construct.castInst);
      // Mimics borrow the owner's attack instance; their captured payloads
      // need retirement even when they differ from the summoning instance.
      const capturedTreePayloads = new Set([...nativeHost.projectiles, ...nativeHost.zones, ...nativeHost.pendingFuses, ...nativeHost.pendingRepeats]
        .filter(payload => payload.caster === body).map(payload => payload.inst));
      for (const payload of capturedTreePayloads) nativeHost.clearTreeFields(body, payload);
      // quietTreeRelease also strips the aura sources worn by nearby recipients.
      for (const id of [...body.activeAuras.keys()]) nativeHost.deactivateAura(body, id, true);
      body.casting = null; body.dead = true; body.life = 0;
    }
  }

export function sceneRetireOwnedZone(nativeHost:NativeSceneProgressionHost,zone: Zone): void {
    const index = nativeHost.zones.indexOf(zone);
    if (index < 0) return;
    nativeHost.expireZone(zone);
    nativeHost.zones.splice(index, 1);
  }

export function sceneExpireZone(nativeHost:NativeSceneProgressionHost,z: Zone): void {
    if (!z.presenceRetired && (!z.exploded || z.pulse) && presenceProfile(z.inst.def.id)?.family === 'storm') {
      z.presenceRetired = true;
      nativeHost.flashes.push({ pos: { ...z.pos }, radius: z.radius, color: z.color,
        life: PRESENCE_STYLE.expire, maxLife: PRESENCE_STYLE.expire,
        fx: skillPresenceVoice(z.inst.def.id, 'expire'), shape: z.shape, facing: z.facing,
        arcRad: z.arcRad, edgeFrac: z.edgeFrac, onGround: z.onGround?.slice(), recoveryCueTier: z.tier ?? z.caster.tier });
    }
    if (z.fieldCue) {
      nativeHost.flashes.push({ ...combatCueFlash(z.pos, z.fieldCue.release ?? 'field_release', z.radius, 0, z.fieldCue.color ?? z.color), recoveryCueTier: z.tier ?? z.caster.tier ?? 0 });
      z.fieldCue = undefined; // One retirement, even when cleanup paths converge.
    }
    // A toggled field's reservation refunds here — expireZone runs on all
    // three cleanup paths (expiry/toggle, caster death, zone load).
    if (z.reserved && z.reserved > 0) {
      z.caster.reservedMana = Math.max(0, z.caster.reservedMana - z.reserved);
      z.reserved = 0;
    }
    // THE MADNESS BANK outlives its placements (one bank per skill), so it
    // forgets the departed as they retire: dead or unloaded bodies leave
    // the ledger instead of collecting for the whole run.
    if (z.madden) {
      for (const id of z.madden.dwell.keys()) {
        const a = nativeHost.actorById(id);
        if (!a || a.dead) { z.madden.dwell.delete(id); z.madden.credited.delete(id); }
      }
    }
    if (!z.domainAffected || !z.domainKey) return;
    for (const a of z.domainAffected) a.sheet.removeSource(z.domainKey);
    z.domainAffected.clear();
  }

export function sceneGuardArtCooldown(nativeHost:NativeSceneProgressionHost,a: Actor, inst: SkillInstance): void { nativeHost.stampSkillCooldown(a, inst, inst.def.cooldown); }

export function sceneStampSkillCooldown(nativeHost:NativeSceneProgressionHost,caster: Actor, inst: SkillInstance, base: number): void {
    // The formula lives in skills.ts so the TOOLTIP waits on the same clock
    // it prints (skillCooldownSeconds — one resolver, two readers).
    let cdSet = skillCooldownSeconds(caster, inst, base);
    // THE LAB LEVER (ULT_QA, engine/ultimates.ts): iteration builds cap an
    // ULTIMATE's stamped clock so the arts re-fire back-to-back — a ceiling
    // on the fold's answer, never a rewrite of the authored price (THE
    // PRICE FLOOR stays census-pinned; shipped builds cap at Infinity).
    if (inst.def.ultimate) cdSet = Math.min(cdSet, ultCooldownCap());
    if (cdSet <= 0) return;
    caster.cooldowns.set(inst.def.id, cdSet);
    caster.cooldownTotals.set(inst.def.id, cdSet); // the HUD sweep's denominator
  }

export function sceneShowCompanionCue(nativeHost:NativeSceneProgressionHost,a: Actor, event: CompanionCueEvent, from?: Actor, spec = companionCueSpec(a)): void {
    const companionCue = companionCueFlash(a, event, from, spec);
    if (companionCue) nativeHost.flashes.push(companionCue);
  }

export function sceneInheritedFlight(nativeHost:NativeSceneProgressionHost,p: Projectile, specInherit?: number): InheritedFlight | undefined {
    const frac = Math.min(1, p.inheritFrac + (specInherit ?? 0));
    if (frac <= 0) return undefined;
    return {
      homing: p.homing * frac, erratic: p.erratic * frac,
      spiral: p.spiral * frac, orbit: p.orbit * frac,
      spin: p.spin * frac, weave: p.weave * frac,
      amp: p.amp * frac, orbitR0: p.orbitR0 * frac,
    };
  }

export function sceneReviveCompanion(nativeHost:NativeSceneProgressionHost,a: Actor, frac = 0.5): void {
    if (!a.companion || a.dead || !a.downed || a.companionDormant) return;
    a.downed = false;
    a.companionReviveRemaining = undefined;
    a.companionReviveDwell = 0;
    nativeHost.recoverCompanion(a);
    a.life = Math.max(1, a.maxLife() * frac);
    nativeHost.showRecoveryCue(a, 'revive', nativeHost.companionBonds.host(a));
  }

export function sceneRecoverCompanion(nativeHost:NativeSceneProgressionHost,a: Actor): void {
    if (!a.companion || a.dead || a.downed || a.companionDormant || !a.owner) return;
    const cfg = COMPANION_CFG.recovery;
    if (cfg.cleanse) {
      a.cleanseDebuffs();
      // An expiry queued on the lethal frame cannot rupture after revival.
      a.expiredStatuses = a.expiredStatuses.filter(s => STATUS_DEFS[s.id]?.beneficial);
    }
    const count = nativeHost.actors.filter(b => b.companion && !b.dead && !b.companionDormant && b.owner === a.owner).length;
    const seconds = companionRecoverySeconds(count);
    const status = STATUS_DEFS[cfg.status];
    // Reapplication refreshes one window, never adds or keeps a longer old
    // window when the pack grew. No effect-duration multiplier expands it.
    a.endStatus(cfg.status);
    if (seconds > 0 && status?.duration > 0) a.applyStatus(cfg.status, 0, seconds / status.duration, a.owner.name);
  }

export function sceneShowRecoveryCue(nativeHost:NativeSceneProgressionHost,a: Actor, kind: RecoveryCueKind, inst?: SkillInstance): void {
    const recoveryCue = (inst ?? a.summonInst)?.def.recoveryCues?.[kind]
      ?? (a.defId ? MONSTERS[a.defId]?.recoveryCues?.[kind] : undefined);
    if (recoveryCue === false) return;
    const recoveryCueFlashAt = nativeHost.flashes.length;
    const recoveryCueBody = nativeHost.emergeBody(a, { spec: { ...RECOVERY_CUES[kind], ...recoveryCue, hold: false } });
    if (recoveryCueBody) recoveryCueBody.recoveryCueTier = a.tier ?? 0;
    if (nativeHost.flashes[recoveryCueFlashAt]) nativeHost.flashes[recoveryCueFlashAt].recoveryCueTier = a.tier ?? 0;
  }

export function sceneEmergeBody(nativeHost:NativeSceneProgressionHost,a: Actor, opts: { host?: boolean; spec?: EmergeSpec; ground?: EmergeGroundId } = {}): EmergeRecord | null {
    if (a.dead) return null;
    const def = a.defId ? MONSTERS[a.defId] : undefined;
    const ground = opts.ground ?? nativeHost.emergeGroundAt(a.pos, a.tier);
    const spec = emergeFor([opts.spec, def?.emerge], ground, !!opts.host);
    if (!spec) return null;
    // The arrival's accent rides the pop channel: the voice, or the haze ring.
    nativeHost.flashes.push({
      pos: vec(a.pos.x, a.pos.y), radius: a.radius * 2.2, color: a.color, life: 0.35, maxLife: 0.35,
      ...(spec.haze ? { haze: spec.haze } : spec.voice ? { fx: spec.voice } : {}),
    });
    if (nativeHost.emergences.length >= EMERGE_CFG.maxLive) return null;
    const seed = emergeSeedOf(a.pos.x, a.pos.y, a.id);
    const rec: EmergeRecord = {
      actorId: a.id, pos: vec(a.pos.x, a.pos.y), radius: a.radius, seed, spec,
      at: nativeHost.time, life: spec.life, maxLife: spec.life, held: spec.hold,
    };
    if (spec.hold) {
      a.emergeHeldTargetable = a.untargetable;
      a.untargetable = true;
      a.emergeUntil = nativeHost.time + spec.life;
    }
    nativeHost.emergences.push(rec);
    return rec;
  }

export function sceneEmergeGroundAt(nativeHost:NativeSceneProgressionHost,p: Vec2, tier = 0): EmergeGroundId {
    const g = nativeHost.groundAt(p, tier)?.kind;
    const gk = g ?? nativeHost.walk?.regionAt?.(p.x, p.y);
    return emergeGroundFor(nativeHost.zone.biome, gk);
  }
