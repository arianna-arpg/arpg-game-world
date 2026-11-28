// ---------------------------------------------------------------------------
// LIVE REFRESH GUARD — eliminates redundant 0.5s DOM rebuilds and forced
// layout reflows on open Character Sheet and Inventory panels when none of
// their underlying inputs changed since the last periodic live refresh.
//
// Explicit user clicks inside panels.ts call refreshCharSheet() /
// refreshInventory() directly (live = false) and bypass this guard completely,
// so interactive gestures remain immediate.
// ---------------------------------------------------------------------------

import { skillGemPayloadOf, supportGemPayloadOf } from '../engine/gemitems';
import type { GrantedSkillState, ItemInstance } from '../engine/items';
import { mimicEntries } from '../engine/mimic';
import { empowermentRank } from '../engine/skillEmpowerment';
import type { SkillInstance } from '../engine/skills';
import { ATTRIBUTE_IDS, type ConditionId, type Modifier, type StatSheet } from '../engine/stats';
import type { Seat, World } from '../engine/world';
import { reliquaryPower } from '../meta/reliquary';
import type { UI } from './panels';
import { installUiPressGuard, uiPressHeld } from './uiPressGuard';

interface ModBundleMeta {
  id: number;
  conds: ConditionId[];
  gauges: string[];
}

const q10 = (v: number): number => Math.round(v * 10);

function grantStateSig(gs: Record<string, GrantedSkillState> | undefined): string {
  if (!gs) return '';
  let out = '';
  for (const [sid, st] of Object.entries(gs)) {
    out += `${sid}[`;
    for (let i = 0; i < st.sockets.length; i++) {
      const s = st.sockets[i];
      if (i > 0) out += ',';
      if (s) out += `${s.supportId}@${s.level}${s.locked ? 'L' : ''}`;
    }
    if (st.treeNodes?.length) out += `#${st.treeNodes.join('+')}`;
    out += ']';
  }
  return out;
}

function itemSig(it: ItemInstance): string {
  const sp = skillGemPayloadOf(it);
  const gp = supportGemPayloadOf(it);
  let gemPart = '';
  if (sp) {
    gemPart = `S:${sp.skillId}:${sp.level}:${sp.rarity}:${empowermentRank(sp)}:${sp.granted ? 1 : 0}:${sp.attunedForm ?? ''}:${sp.treeNodes?.join('+') ?? ''}:`;
    for (let i = 0; i < sp.sockets.length; i++) {
      const s = sp.sockets[i];
      if (i > 0) gemPart += ',';
      if (s) gemPart += `${s.supportId}@${s.level}`;
    }
  } else if (gp) {
    gemPart = `G:${gp.supportId}:${gp.level}`;
  }
  return `${it.uid}@${it.x ?? -1},${it.y ?? -1}:${it.rarity}:${it.locked ? 1 : 0}:${it.craftedSockets ?? 0}:${it.sockets?.join(',') ?? ''}:${it.mem?.length ?? 0}:${gemPart}:${grantStateSig(it.grantState)}`;
}

function skillInstSig(inst: SkillInstance): string {
  let socks = '';
  for (let i = 0; i < inst.sockets.length; i++) {
    const s = inst.sockets[i];
    if (i > 0) socks += ',';
    if (s) socks += `${s.def.id}@${s.level}`;
  }
  return `${inst.def.id}:${inst.level}:${inst.bonusLevels ?? 0}:${inst.rarity ?? ''}:${empowermentRank(inst)}:${inst.grantedBy ?? ''}:${inst.attunedForm ?? ''}:${inst.replenishmentPaused ? 1 : 0}:${inst.summonSchools?.join(',') ?? ''}:${inst.treeNodes?.join('+') ?? ''}[${socks}]`;
}

function recordSig(rec: Record<string, number>): string {
  let out = '';
  for (const [k, v] of Object.entries(rec)) {
    if (v) out += `${k}:${v},`;
  }
  return out;
}

export class LiveRefreshGuard {
  private lastWorld: World | null = null;
  private lastCharSheetSig: string | null = null;
  private lastLearnedSkillSig: string | null = null;
  private lastInventorySig: string | null = null;
  private lastMapSig: string | null = null;
  private nextBundleId = 0;
  private readonly modBundles = new WeakMap<readonly Modifier[], ModBundleMeta>();

  reset(): void {
    this.lastWorld = null;
    this.lastCharSheetSig = null;
    this.lastLearnedSkillSig = null;
    this.lastInventorySig = null;
    this.lastMapSig = null;
  }

  markDirty(panel?: 'charSheet' | 'inventory' | 'map'): void {
    if (!panel || panel === 'charSheet') this.lastCharSheetSig = null;
    if (!panel || panel === 'inventory') this.lastInventorySig = null;
    if (!panel || panel === 'map') this.lastMapSig = null;
  }

  refreshLivePanels(ui: UI, world: World): void {
    installUiPressGuard();
    if (this.lastWorld !== world) {
      this.lastWorld = world;
      this.lastCharSheetSig = null;
      this.lastLearnedSkillSig = null;
      this.lastInventorySig = null;
      this.lastMapSig = null;
    }

    if (!ui.charSheetOpen) {
      this.lastCharSheetSig = null;
      this.lastLearnedSkillSig = null;
    } else {
      const charPressHeld = ui.isCharSheetPressHeld();
      const sig = this.computeCharSheetSig(world);
      const learnedSig = this.computeLearnedSkillSig(ui, world);
      if (sig !== this.lastCharSheetSig) {
        if (!charPressHeld) {
          this.lastCharSheetSig = sig;
          this.lastLearnedSkillSig = learnedSig;
        }
        ui.refreshCharSheet();
      } else if (!charPressHeld && learnedSig !== this.lastLearnedSkillSig) {
        this.lastLearnedSkillSig = learnedSig;
        ui.refreshLearnedSkill();
      }
    }

    if (!ui.inventoryOpen && !ui.treeOpen) {
      this.lastInventorySig = null;
    } else {
      const invPressHeld = ui.isInventoryPressHeld();
      const hasMemFlash = typeof document !== 'undefined'
        && typeof document.querySelector === 'function'
        && document.querySelector('#inventory .memflash') !== null;
      const sig = this.computeInventorySig(ui, world);
      if (hasMemFlash || sig !== this.lastInventorySig) {
        if (!hasMemFlash && !invPressHeld) this.lastInventorySig = sig;
        ui.refreshInventory(true);
      } else if (!invPressHeld && ui.skillsPaneOpen) {
        ui.refreshSocketReadiness();
      }
    }

    if (!ui.mapOpen) {
      this.lastMapSig = null;
    } else {
      const sig = ui.mapLiveSignature(world);
      if (sig !== this.lastMapSig) {
        if (!uiPressHeld() && !ui.isMapGestureHeld()) this.lastMapSig = sig;
        ui.refreshMap();
      }
    }
  }

  private computeLearnedSkillSig(ui: UI, world: World): string {
    if (world.clientActionHook) {
      // Remote co-op summon inspections poll on their own cadence when expanded.
      const state = ui.learnedSkillChoiceState();
      if (state.expanded) return `remote:${Math.floor(performance.now() / 700)}:${state.skill}:${state.body}`;
    }
    const seat = ui.charSheetOwnerSeat();
    const hero = world.seatHero(seat);
    const state = ui.learnedSkillChoiceState();
    let known = `${seat.meta.knownSkills.size}:`;
    let firstId = '';
    for (const inst of seat.meta.knownSkills.values()) {
      if (!firstId) firstId = inst.def.id;
      known += skillInstSig(inst) + ';';
    }
    const activeSkillId = (state.skill && seat.meta.knownSkills.has(state.skill)) ? state.skill : firstId;
    let summons = '';
    if (state.expanded && activeSkillId) {
      const bodies = world.minionsOfSkill(hero, activeSkillId);
      summons = `${bodies.length}:`;
      for (let i = 0; i < bodies.length; i++) {
        const b = bodies[i];
        let bSkills = '';
        for (let j = 0; j < b.skills.length; j++) {
          const s = b.skills[j];
          if (s) bSkills += skillInstSig(s) + ',';
        }
        summons += `${b.id}@${b.level}:${b.name}:${this.sheetSig(b.sheet)}:${bSkills}:${b.construct?.castInst ? skillInstSig(b.construct.castInst) : ''}:${b.summonArtState?.kit.length ?? 0}:${b.frameState?.kit.length ?? 0}:${b.cohortState?.kit.length ?? 0};`;
      }
    }
    return [
      seat.id,
      hero.id,
      hero.level,
      state.drawn ? 1 : 0,
      state.expanded ? 1 : 0,
      activeSkillId,
      state.body,
      hero.runes.join(','),
      q10(hero.life),
      q10(hero.mana),
      q10(hero.es),
      q10(hero.ward),
      q10(hero.absorb),
      this.sheetSig(hero.sheet),
      known,
      summons,
    ].join('|');
  }

  private sheetSig(sheet: StatSheet): string {
    const names = sheet.sourceNames();
    let out = `${names.length}|${Math.round(sheet.get('moveSpeed') * 1000)}|`;
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const mods = sheet.getSourceMods(name);
      if (!mods) continue;
      let meta = this.modBundles.get(mods);
      if (!meta) {
        const condSet = new Set<ConditionId>();
        const gaugeSet = new Set<string>();
        for (let j = 0; j < mods.length; j++) {
          const m = mods[j];
          if (m.when) condSet.add(m.when);
          if (m.unless) condSet.add(m.unless);
          if (m.gauge) gaugeSet.add(m.gauge);
        }
        meta = { id: ++this.nextBundleId, conds: [...condSet], gauges: [...gaugeSet] };
        this.modBundles.set(mods, meta);
      }
      out += `${name}#${meta.id}:${mods.length}:${mods[0]?.value ?? 0}:${mods[mods.length - 1]?.value ?? 0}`;
      for (let c = 0; c < meta.conds.length; c++) {
        out += sheet.hasCondition(meta.conds[c]) ? '1' : '0';
      }
      for (let g = 0; g < meta.gauges.length; g++) {
        const gid = meta.gauges[g];
        out += `,${gid}=${sheet.gauge(gid)}`;
      }
      out += ';';
    }
    return out;
  }

  private computeCharSheetSig(world: World): string {
    let out = '';
    for (const seat of world.seats.values()) {
      out += this.seatCharSheetSig(seat) + '||';
    }
    return out;
  }

  private seatCharSheetSig(seat: Seat): string {
    const p = seat.actor;
    const m = seat.meta;
    let attrs = '';
    for (let i = 0; i < ATTRIBUTE_IDS.length; i++) {
      const aid = ATTRIBUTE_IDS[i];
      attrs += `${m.attrs[aid] ?? 0}/${m.baseAttrs[aid] ?? 0},`;
    }
    let opening = '';
    for (let i = 0; i < m.opening.length; i++) {
      const sid = m.opening[i];
      if (!sid) continue;
      const carried = m.knownSkills.has(sid) || m.items.some(it => skillGemPayloadOf(it)?.skillId === sid);
      opening += `${sid}:${carried ? 1 : 0},`;
    }
    let statuses = `${p.statuses.length}:`;
    for (let i = 0; i < p.statuses.length; i++) {
      const s = p.statuses[i];
      statuses += `${s.id}x${s.stacks},`;
    }
    let buffs = `${p.buffs.size}:`;
    for (const [id, b] of p.buffs) {
      buffs += `${id}x${b.stacks ?? 1},`;
    }
    return [
      seat.id,
      m.classDef.id,
      p.level,
      Math.floor(m.xp),
      Math.floor(m.xpNeeded),
      m.passivePoints,
      m.vocationPoints,
      m.vocations.join(','),
      attrs,
      opening,
      q10(p.life),
      q10(p.maxLife()),
      q10(p.mana),
      q10(p.availableMaxMana()),
      q10(p.es),
      q10(p.maxEs()),
      q10(p.ward),
      q10(p.absorb),
      q10(p.poise),
      p.poiseBroken ? 1 : 0,
      statuses,
      buffs,
      this.sheetSig(p.sheet),
    ].join('|');
  }

  private computeInventorySig(ui: UI, world: World): string {
    let out = [
      ui.inventoryOpen ? 1 : 0,
      ui.treeOpen ? 1 : 0,
      ui.charSheetOpen ? 1 : 0,
      ui.salvageOpen ? 1 : 0,
      ui.vendorOpen ? 1 : 0,
      ui.oracleOpen ? 1 : 0,
      ui.getPadActive?.() ? 1 : 0,
      world.mireilleGiftLesson() ?? '',
      world.reliquaryLesson() ? 1 : 0,
      world.account.features.size,
      Math.round(reliquaryPower(world.account.reliquary) * 1000),
    ].join('|');
    for (const seat of world.seats.values()) {
      out += '||' + this.seatInventorySig(seat, world, ui.treeOpen);
    }
    return out;
  }

  private seatInventorySig(seat: Seat, world: World, treeOpen = false): string {
    const p = seat.actor;
    const hero = world.seatHero(seat);
    const m = seat.meta;
    let attrs = '';
    for (let i = 0; i < ATTRIBUTE_IDS.length; i++) {
      const aid = ATTRIBUTE_IDS[i];
      attrs += `${m.attrs[aid] ?? 0},`;
    }
    let items = `${m.items.length}:`;
    for (let i = 0; i < m.items.length; i++) {
      items += itemSig(m.items[i]) + ';';
    }
    let equipped = '';
    for (const [slot, it] of Object.entries(m.equipped)) {
      if (it) equipped += `${slot}=${itemSig(it)};`;
    }
    let containers = '';
    for (const [cid, held] of Object.entries(m.containers)) {
      containers += `${cid}[`;
      for (let i = 0; i < held.length; i++) containers += itemSig(held[i]) + ';';
      containers += ']';
    }
    let bar = '';
    for (let i = 0; i < hero.skills.length; i++) {
      const s = hero.skills[i];
      bar += (s ? `${s.def.id}:${s.level}:${s.grantedBy ?? ''}` : '_') + ',';
    }
    let known = `${m.knownSkills.size}:`;
    for (const inst of m.knownSkills.values()) {
      known += skillInstSig(inst) + ';';
    }
    let grantedInsts = '';
    if (seat.grantedInsts) {
      for (const inst of seat.grantedInsts.values()) {
        grantedInsts += skillInstSig(inst) + ';';
      }
    }
    let grantedSkills = '';
    const gs = seat.grantedSkills ?? [];
    for (let i = 0; i < gs.length; i++) {
      const r = gs[i];
      grantedSkills += `${r.def.id}:${r.level}:${r.slot}:${r.source},`;
    }
    let wornGrafts = '';
    const wg = seat.wornGrafts ?? [];
    for (let i = 0; i < wg.length; i++) {
      const r = wg[i];
      wornGrafts += `${r.def.id}:${r.level}:${r.slot}:${r.state},`;
    }
    let grafts = '';
    for (const [k, v] of Object.entries(m.grafts)) grafts += `${k}->${v},`;
    let choices = '';
    for (const [k, v] of Object.entries(m.choices)) choices += `${k}:${v.join('+')},`;

    const sockRefusal = world.swapRefusal(seat, 'socket') ?? '';
    const unsockRefusal = world.swapRefusal(seat, 'unsocket') ?? '';
    const swapReason = world.swapReadiness(seat, 'socket').reason ?? 'ready';

    let mimic = '';
    if (p.mimicWatch || p.mimicBank) {
      const entries = mimicEntries(p, world.time);
      mimic = `${p.mimicSel ?? ''}:`;
      for (let i = 0; i < entries.length; i++) mimic += `${entries[i].sid}@${entries[i].src},`;
    }

    return [
      seat.id,
      m.classDef.id,
      p.level,
      m.allocated.size,
      m.passivePoints,
      m.vocationPoints,
      m.vocations.join(','),
      treeOpen && world.starAstrolabeUnlocked(seat) ? (world.starAstrolabeRefusal(seat) ?? 'OK') : '',
      m.relicEnabled !== false ? 1 : 0,
      Math.round((m.relicEmpowerment ?? 0) * 1000),
      world.memoryRecallLesson(seat) ? 1 : 0,
      attrs,
      items,
      equipped,
      containers,
      recordSig(m.essences),
      recordSig(m.abilityEssences),
      recordSig(m.vestiges),
      bar,
      known,
      grantedInsts,
      grantedSkills,
      wornGrafts,
      grafts,
      choices,
      sockRefusal,
      unsockRefusal,
      swapReason,
      mimic,
    ].join('|');
  }
}
