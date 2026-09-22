import { NPC_DIALOGUES, NPC_DIALOGUE_FACTS, NPC_APPEARANCES, type DialogueCondition, type NpcDialogueDef } from '../data/npcDialogues';
import { MONSTERS } from '../data/monsters';
import { dist } from '../core/math';
import { Rng } from '../core/rng';
import type { Actor } from './actor';
import type { NpcSpeechLine, World } from './world';

export const npcDialogueReceipt = (id: string): string => `dialogue_seen:${id}`;
const hashStr = (s: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) hash = Math.imul(hash ^ s.charCodeAt(i), 16777619);
  return hash >>> 0;
};

export function dialogueConditionMet(w: World, c: DialogueCondition): boolean {
  if ('quest' in c) return w.activeQuests.some(q => q.questId === c.quest && (c.state !== 'ready' || w.questStanding(q) === 'ready'));
  if ('fact' in c) {
    const fact = NPC_DIALOGUE_FACTS[c.fact];
    return !!fact && fact(w) === (c.is ?? true);
  }
  if ('feature' in c) return w.account.features.has(c.feature);
  if ('accountLevel' in c) return w.account.level >= c.accountLevel;
  const n = c.atLeast ?? 1;
  return (c.scope !== 'run' && (w.account.ledger[c.ledger] ?? 0) >= n)
    || (c.scope !== 'account' && (w.ledger[c.ledger] ?? 0) >= n);
}

export function npcDialogueEligible(w: World, def: NpcDialogueDef): boolean {
  if (def.zone && w.zone.id !== def.zone) return false;
  if (def.once && (def.once === 'account' ? w.account.ledger : w.ledger)[npcDialogueReceipt(def.id)]) return false;
  return (def.all ?? []).every(c => dialogueConditionMet(w, c))
    && (!def.any?.length || def.any.some(c => dialogueConditionMet(w, c)))
    && !(def.none ?? []).some(c => dialogueConditionMet(w, c));
}

/** Per-world authored conversation selection. The ordinary reader still owns
 * pages and input; this director owns conditions, variation and trigger life. */
export class NpcDialogueDirector {
  private choices = new Map<number, { id: string; text: string }>();
  private visits = new Map<string, number>();
  private armed = new Set<string>();
  private admittedVisits = new Map<number, string>();
  private calling?: { def: NpcDialogueDef; line: NpcSpeechLine; until: number };
  constructor(private readonly w: World) {}

  appearanceFor(defId: string): string | undefined {
    const rule = NPC_APPEARANCES[defId];
    return rule?.variants.find(v => v.all.every(c => dialogueConditionMet(this.w, c)))?.look ?? rule?.base;
  }

  refreshAppearances(): void {
    if (this.w.clientActionHook) return; // host ships the authoritative actor look
    for (const a of this.w.actors) if (a.defId && NPC_APPEARANCES[a.defId]) a.look = this.appearanceFor(a.defId);
  }

  leaveZone(): void { this.choices.clear(); this.admittedVisits.clear(); this.armed.clear(); this.calling = undefined; }

  private matches(a: Actor, def: NpcDialogueDef): boolean {
    return !a.dead && !!a.defId && (!def.speaker.defId || a.defId === def.speaker.defId)
      && (!def.speaker.role || MONSTERS[a.defId]?.npcRole === def.speaker.role);
  }
  private text(a: Actor, def: NpcDialogueDef): string {
    const old = this.choices.get(a.id);
    if (old?.id === def.id) return old.text;
    const visit = this.visits.get(def.id) ?? 0;
    this.visits.set(def.id, visit + 1);
    const rng = new Rng(this.w.manifest.seed ^ hashStr(`dialogue:${def.id}:${visit}`));
    const lines = def.lines.filter(l => l.text.trim() && Number.isFinite(l.weight ?? 1) && (l.weight ?? 1) > 0);
    let roll = rng.next() * lines.reduce((n, l) => n + (l.weight ?? 1), 0);
    const text = lines.find(l => { roll -= l.weight ?? 1; return roll < 0; })?.text ?? '';
    this.choices.set(a.id, { id: def.id, text });
    return text;
  }
  private record(def: NpcDialogueDef): void {
    if (!def.once) return;
    if (def.once === 'account') {
      if (!this.w.metaProgressionActive()) return;
      this.w.account.ledger[npcDialogueReceipt(def.id)] = 1; this.w.accountDirty = true;
    } else { this.w.ledger[npcDialogueReceipt(def.id)] = 1; this.w.charDirty = true; }
  }

  dwell(a: Actor): { def: NpcDialogueDef; text: string; radius: number; seconds: number } | null {
    const defs = NPC_DIALOGUES.filter(d => d.trigger.kind === 'dwell' && this.matches(a, d)
      && npcDialogueEligible(this.w, this.admittedVisits.get(a.id) === d.id ? { ...d, once: undefined } : d))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
    const def = defs.find(d => d.trigger.kind === 'dwell' && dist(a.pos, this.w.player.pos) <= d.trigger.radius);
    if (!def || def.trigger.kind !== 'dwell') { this.choices.delete(a.id); this.admittedVisits.delete(a.id); return null; }
    return { def, text: this.text(a, def), radius: def.trigger.radius, seconds: def.trigger.seconds };
  }

  /** Called only after attention/dwell admits the selected authored line. */
  admitted(a: Actor): void {
    const choice = this.choices.get(a.id), def = NPC_DIALOGUES.find(d => d.id === choice?.id);
    if (def) { this.record(def); this.admittedVisits.set(a.id, def.id); }
  }

  finish(actorId: number): void {
    if (this.calling?.line.a.id === actorId) this.calling = undefined;
  }

  callout(admit: boolean): NpcSpeechLine | null {
    const w = this.w;
    if (w.scene || w.clientActionHook || !w.player || w.player.dead || w.player.downed) { this.calling = undefined; return null; }
    if (this.calling) {
      const { def, line, until } = this.calling;
      // Ignore only the receipt we just wrote; a completed lesson or departed
      // speaker still withdraws a stale invitation immediately.
      if (w.time < until && this.matches(line.a, def) && w.actors.includes(line.a)
        && npcDialogueEligible(w, { ...def, once: undefined })) return admit ? line : null;
      this.calling = undefined;
    }
    for (const def of [...NPC_DIALOGUES].sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))) {
      if (def.trigger.kind !== 'exitApproach' || !npcDialogueEligible(w, def)) continue;
      const trigger = def.trigger;
      const exits = w.exits.filter(e => e.to === trigger.to && (w.player.tier ?? 0) === 0);
      const distance = Math.min(...exits.map(e => dist(w.player.pos, e.pos)));
      if (distance > trigger.radius) { this.armed.add(def.id); continue; }
      if (!admit || !this.armed.has(def.id)) continue;
      const a = w.actors.find(a => this.matches(a, def));
      if (!a) continue;
      const text = this.text(a, def);
      if (!text) continue;
      const line: NpcSpeechLine = { a, text, color: def.color ?? MONSTERS[a.defId!]?.color ?? '#d8b87a', seatId: w.localSeat.id, delivery: 'callout' };
      this.record(def); this.armed.delete(def.id);
      this.calling = { def, line, until: w.time + trigger.holdSec };
      return line;
    }
    return null;
  }
}
