import type { World } from '../engine/world';
import { MONSTERS } from '../data/monsters';
import type { DialogueWorkspace } from './dialogue';

const esc = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** The giver and the reader must be the same live actor. A nearby NPC cannot
 * lend this panel another player's or another giver's choices. */
export function conversationQuests(world: World, speakerId: number) {
  const speaker = world.actors.find(a => a.id === speakerId && !a.dead);
  const belongs = (id: string, returning: boolean) => {
    const q = world.questDefOf(id), giver = returning ? q?.turnIn?.giver ?? q?.giver : q?.giver;
    return !!speaker?.defId && (Array.isArray(giver) ? giver : [giver]).includes(speaker.defId);
  };
  return {
    belongs,
    active: world.questLog().active.filter(q => belongs(q.id, false) || belongs(q.id, true)),
    vocations: world.vocationMenuOffers().filter(q => belongs(q.questId, false)),
    rewards: world.questRewardOffers().filter(q => belongs(q.questId, true)),
    imbues: world.questImbueOffers().filter(q => q.near && belongs(q.questId, true)),
  };
}

export function conversationHasRewards(world: World): boolean {
  return world.actors.some(a => !a.dead && world.npcDialogueReachable(a.id)
    && (() => { const q = conversationQuests(world, a.id); return q.rewards.length || q.imbues.length; })());
}

export function conversationHasVocations(world: World): boolean {
  return world.actors.some(a => !a.dead && world.npcDialogueReachable(a.id)
    && conversationQuests(world, a.id).vocations.length > 0);
}

export interface ConversationWork { questId: string; label: string; target: string; }
interface Host {
  world(): World;
  available(): boolean;
  inventory(): void;
  shopAvailable(speakerId: number): boolean;
  shop(speakerId: number): void;
  /** An optional engine-owned contract source; automatic quests need no adapter. */
  work?(): readonly ConversationWork[];
  acceptWork?(questId: string): void;
  changed(): void;
}

/** Dialogue options only. Shop delegates to the existing vendor, and quest
 * actions use the existing validated commands. This panel never awards items. */
export class NpcConversationUI implements DialogueWorkspace {
  private world: World | null = null;
  private speakerId = -1;
  private scene = -1;
  private activity: string | null = null;
  private signature = '';
  private toolbar: HTMLElement;
  private body: HTMLElement;
  private status: HTMLElement;
  get active(): boolean { return this.activity !== null; }
  get choosing(): boolean { return this.active || this.toolbar.childElementCount > 0; }

  /** Evaluate the current speaker and quest state, including content that
   * became available after dismissal. Service roles always permit a return;
   * a resident or a settled quest giver needs actual attached topics. */
  repeatable(world: World, speakerId: number): boolean {
    const actor = world.actors.find(a => a.id === speakerId && !a.dead);
    const role = actor?.defId && MONSTERS[actor.defId]?.npcRole;
    if (role && role !== 'resident' && role !== 'questgiver') return true;
    const q = conversationQuests(world, speakerId);
    return !!(q.active.length || q.vocations.length || q.rewards.length || q.imbues.length
      || this.host.work?.().some(r => q.belongs(r.questId, false)));
  }

  constructor(root: HTMLElement, private host: Host, private changed: () => void) {
    const style = document.createElement('style');
    style.textContent = '.conversation-toolbar{display:grid;gap:7px;margin-top:12px}'
      + '.conversation-toolbar button{text-align:left;white-space:normal}'
      + '.conversation-content{font:12px/1.5 Verdana,sans-serif;overflow-wrap:anywhere}'
      + '.conversation-content h3{font-size:14px;margin:6px 0}.conversation-content p{margin:8px 0}'
      + '.conversation-content button[data-conversation-reward]{display:block;width:100%;text-align:left;margin:6px 0;white-space:normal}'
      + '.conversation-content small{color:#c5baa5}.conversation-status{font:11px/1.5 Verdana,sans-serif;color:#e0be8a}'
      + '.conversation-content[hidden],.conversation-toolbar[hidden]{display:none}';
    document.head.appendChild(style);
    root.innerHTML = '<nav class="conversation-toolbar" aria-label="Conversation topics"></nav><div class="conversation-content" hidden></div><div class="conversation-status" role="status"></div>';
    this.toolbar = root.querySelector('.conversation-toolbar')!;
    this.body = root.querySelector('.conversation-content')!;
    this.status = root.querySelector('.conversation-status')!;
    root.addEventListener('click', event => {
      event.stopPropagation();
      const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null;
      if (!button || button.disabled || !this.valid()) return;
      if (button.hasAttribute('data-conversation-shop')) { this.host.shop(this.speakerId); return; }
      if (button.hasAttribute('data-conversation-inventory')) { this.host.inventory(); return; }
      if (button.dataset.conversationActivity) {
        this.activity = button.dataset.conversationActivity; this.signature = ''; this.status.textContent = ''; this.draw(); return;
      }
      this.perform(button);
    });
  }

  reset(): void {
    this.world = null; this.speakerId = -1; this.scene = -1; this.activity = null; this.signature = '';
    this.toolbar.replaceChildren(); this.body.replaceChildren(); this.status.textContent = '';
  }
  back(): void { this.activity = null; this.signature = ''; this.status.textContent = ''; this.draw(); }
  sync(world: World, speakerId: number): void {
    if (world !== this.world || speakerId !== this.speakerId || world.dialogueScene !== this.scene) {
      this.reset(); this.world = world; this.speakerId = speakerId; this.scene = world.dialogueScene;
    }
    this.draw();
  }
  private valid(): boolean {
    const w = this.world;
    return !!w && w === this.host.world() && this.scene === w.dialogueScene && this.host.available()
      && !w.player.dead && !w.player.downed && w.npcDialogueReachable(this.speakerId);
  }
  private draw(): void {
    const w = this.world;
    if (!w) return;
    const q = conversationQuests(w, this.speakerId);
    const work = (this.host.work?.() ?? []).filter(r => q.belongs(r.questId, false));
    const flasks = w.actors.some(a => a.id === this.speakerId && a.defId === 'townsfolk_innkeep')
      && (w.mireilleLessonSkills().length > 0 || w.mireilleGiftOwed());
    const shop = this.host.shopAvailable(this.speakerId);
    const topics: [string, string][] = [
      ...(flasks ? [['flasks', 'About my flasks'] as [string, string]] : []),
      ...work.map(r => ['work:' + r.questId, r.label] as [string, string]),
      ...q.vocations.map(r => ['vocation:' + r.questId, r.offerLabel] as [string, string]),
      ...q.active.map(r => ['quest:' + r.id, r.label] as [string, string]),
      ...q.rewards.map(r => ['reward:' + r.questId, 'Choose a reward · ' + r.label] as [string, string]),
      ...q.imbues.map(r => ['imbue:' + r.questId, r.prompt] as [string, string]),
    ];
    const signature = JSON.stringify([q, work, flasks, shop, this.activity]);
    if (signature === this.signature) return;
    this.signature = signature;
    const focus = document.activeElement instanceof HTMLElement && this.toolbar.contains(document.activeElement)
      ? document.activeElement.dataset.conversationActivity : undefined;
    this.toolbar.innerHTML = (shop ? '<button type="button" data-conversation-shop>Shop</button>' : '')
      + topics.map(([id, label]) => '<button type="button" data-conversation-activity="' + esc(id) + '">' + esc(label) + '</button>').join('');
    this.toolbar.hidden = this.active;
    let content = '';
    if (this.activity === 'flasks') content = '<h3>Your flask Memories</h3><p>'
      + (w.mireilleGiftOwed() ? 'Make room for two flask Memories in your pack, then linger here to receive them.'
        : 'Find the highlighted flask Memories in your pack. Open Skills and drag each Memory onto an empty skill slot. You choose its binding.')
      + '</p><button type="button" data-conversation-inventory>Open Inventory</button>';
    for (const r of work) if (this.activity === 'work:' + r.questId) content = '<h3>' + esc(r.label) + '</h3><p>' + esc(r.target)
      + '</p><button type="button" data-conversation-accept="' + esc(r.questId) + '">Accept</button>';
    for (const r of q.vocations) if (this.activity === 'vocation:' + r.questId) content = '<h3>' + esc(r.name) + '</h3><p>' + esc(r.blurb)
      + '</p><button type="button" data-conversation-vocation="' + esc(r.questId) + '">Accept this calling</button>';
    for (const r of q.active) if (this.activity === 'quest:' + r.id) content = '<h3>' + esc(r.label) + '</h3><p>'
      + [r.line, r.ask, r.target].filter(Boolean).map(s => esc(s!)).join('<br>') + '</p>';
    for (const r of q.rewards) if (this.activity === 'reward:' + r.questId) content = '<h3>' + esc(r.label) + '</h3><p>' + esc(r.prompt) + '</p>'
      + r.choices.map(c => '<button type="button" data-conversation-reward="' + esc(r.questId) + '" data-choice="' + esc(c.id)
        + '"><strong>' + esc(c.name) + '</strong><br>' + esc(c.description) + '<br><small>' + c.lines.map(esc).join(' · ') + '</small></button>').join('');
    for (const r of q.imbues) if (this.activity === 'imbue:' + r.questId) content = '<h3>' + esc(r.prompt) + '</h3>'
      + (r.items.map(item => '<details><summary>' + esc(item.name) + '</summary>' + item.options.map(a => '<p><button type="button" data-conversation-imbue="'
        + esc(r.questId) + '" data-uid="' + item.uid + '" data-affix="' + esc(a.id) + '">Add ' + a.lines.map(esc).join(' · ') + '</button></p>').join('') + '</details>').join('')
        || '<p>Bring a magic piece from your pack.</p>') + '<button type="button" data-conversation-inventory>Open Inventory</button>';
    this.body.innerHTML = content || (this.active ? '<p>This topic is settled. Return to the available topics.</p>' : '');
    this.body.hidden = !this.active;
    if (focus) [...this.toolbar.querySelectorAll<HTMLButtonElement>('button')].find(b => b.dataset.conversationActivity === focus)?.focus({ preventScroll: true });
  }
  private perform(button: HTMLButtonElement): void {
    const w = this.world!, q = conversationQuests(w, this.speakerId), d = button.dataset;
    if (d.conversationAccept && (this.host.work?.() ?? []).some(r => r.questId === d.conversationAccept && q.belongs(r.questId, false)))
      this.host.acceptWork?.(d.conversationAccept);
    else if (d.conversationVocation && q.vocations.some(r => r.questId === d.conversationVocation))
      w.requestMeta({ t: 'vocationQuest', questId: d.conversationVocation });
    else if (d.conversationReward && q.rewards.some(r => r.questId === d.conversationReward && r.choices.some(c => c.id === d.choice))) {
      w.requestMeta({ t: 'questReward', questId: d.conversationReward, choiceId: d.choice! });
      this.status.textContent = w.questRewardOffers().some(r => r.questId === d.conversationReward) ? 'Your reward is still available. Check the space in your pack.' : 'Your reward is in your pack.';
    } else if (d.conversationImbue && q.imbues.some(r => r.questId === d.conversationImbue && r.items.some(i => i.uid === Number(d.uid) && i.options.some(a => a.id === d.affix))))
      w.requestMeta({ t: 'questImbue', questId: d.conversationImbue, uid: Number(d.uid), affixId: d.affix! });
    else return;
    this.host.changed(); this.changed(); this.signature = ''; this.draw();
  }
}
