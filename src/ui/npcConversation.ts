import type { World } from '../engine/world';
import type { DialogueWorkspace } from './dialogue';
import { skillPreparationHtml } from './skillPreparation';

const esc = (s: string): string => s.replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Offer provenance is the live actor, never the display name or another nearby giver. */
export function conversationQuests(world: World, speakerId: number) {
  const speaker = world.actors.find(a => a.id === speakerId && !a.dead);
  const belongs = (id: string, returning: boolean) => {
    const q = world.questDefOf(id), giver = returning ? q?.turnIn?.giver ?? q?.giver : q?.giver;
    return !!speaker?.defId && (Array.isArray(giver) ? giver : [giver]).includes(speaker.defId);
  };
  return {
    work: world.questOfferChoices().filter(q => belongs(q.questId, false)),
    rewards: world.questRewardOffers().filter(q => belongs(q.questId, true)),
    imbues: world.questImbueOffers().filter(q => q.near && belongs(q.questId, true)),
  };
}

export function conversationHasRewards(world: World): boolean {
  const pending = [...world.questRewardOffers(), ...world.questImbueOffers().filter(q => q.near)];
  const givers = new Set(pending.flatMap(r => {
    const q = world.questDefOf(r.questId), ids = q?.turnIn?.giver ?? q?.giver;
    return Array.isArray(ids) ? ids : ids ? [ids] : [];
  }));
  return world.actors.some(a => !a.dead && !!a.defId && givers.has(a.defId) && world.npcDialogueReachable(a.id));
}

type Activity = 'work' | 'rewards' | 'imbues' | 'flasks';
interface Host {
  world(): World;
  available(): boolean;
  inventory(): void;
  slotLabels(): readonly string[];
  changed(): void;
}

/** NPC actions share the reader's owner, scroll area, keyboard and lifetime.
 * Every mutation still travels through the ordinary, validated meta command. */
export class NpcConversationUI implements DialogueWorkspace {
  private world: World | null = null;
  private speakerId = -1;
  private scene = -1;
  private activity: Activity | null = null;
  private signature = '';
  private toolbar: HTMLElement;
  private body: HTMLElement;
  private status: HTMLElement;
  private rewardSeen = '';
  get active(): boolean { return this.activity !== null; }
  get choosing(): boolean { return this.active || this.toolbar.childElementCount > 0; }

  constructor(root: HTMLElement, private host: Host, private changed: () => void) {
    const style = document.createElement('style');
    style.textContent = '.conversation-toolbar{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}'
      + '.conversation-content{font:12px/1.5 Verdana,sans-serif;overflow-wrap:anywhere}'
      + '.conversation-content h3{font-size:13px;margin:6px 0}.conversation-content p{margin:4px 0}'
      + '.conversation-content button[data-conversation-reward]{display:block;width:100%;text-align:left;margin:5px 0;white-space:normal}'
      + '.conversation-content small{color:#c5baa5}.conversation-status{font:11px/1.5 Verdana,sans-serif;color:#e0be8a}'
      + '.conversation-content[hidden],.conversation-content button[hidden]{display:none}';
    document.head.appendChild(style);
    root.innerHTML = '<nav class="conversation-toolbar" aria-label="Conversation actions"></nav><div class="conversation-content" hidden></div><div class="conversation-status" role="status"></div>';
    this.toolbar = root.querySelector('.conversation-toolbar')!;
    this.body = root.querySelector('.conversation-content')!;
    this.status = root.querySelector('.conversation-status')!;
    root.addEventListener('click', event => {
      event.stopPropagation();
      const button = (event.target as Element).closest<HTMLButtonElement>('button');
      if (!button || button.disabled || !this.valid()) return;
      if (button.dataset.conversationActivity) {
        this.activity = button.dataset.conversationActivity as Activity; this.signature = ''; this.status.textContent = ''; this.draw(); return;
      }
      if (button.hasAttribute('data-conversation-inventory') || button.hasAttribute('data-prepare-inventory')) { this.host.inventory(); return; }
      this.perform(button);
    });
    root.addEventListener('input', event => {
      if (!(event.target instanceof HTMLInputElement)) return;
      const term = event.target.value.toLocaleLowerCase();
      for (const button of this.body.querySelectorAll<HTMLButtonElement>('[data-conversation-reward]'))
        button.hidden = !button.textContent?.toLocaleLowerCase().includes(term);
    });
  }

  reset(): void {
    this.world = null; this.speakerId = -1; this.scene = -1; this.activity = null; this.signature = ''; this.rewardSeen = '';
    this.toolbar.replaceChildren(); this.body.replaceChildren(); this.body.hidden = true; this.status.textContent = '';
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
      && !w.clientActionHook && !w.player.dead && !w.player.downed && w.npcDialogueReachable(this.speakerId);
  }
  private draw(): void {
    const w = this.world;
    if (!w) return;
    const q = conversationQuests(w, this.speakerId);
    const innkeep = w.actors.some(a => a.id === this.speakerId && a.defId === 'townsfolk_innkeep');
    const flasks = innkeep ? skillPreparationHtml(w, this.host.slotLabels()) : '';
    const rewards = q.rewards.map(r => r.questId).concat(q.imbues.map(r => r.questId)).join('|');
    if (rewards && rewards !== this.rewardSeen) this.activity = q.rewards.length ? 'rewards' : 'imbues';
    this.rewardSeen = rewards;
    const activities: [Activity, string][] = [];
    if (flasks) activities.push(['flasks', 'Flasks']);
    if (q.work.length) activities.push(['work', 'Work']);
    if (q.rewards.length) activities.push(['rewards', 'Rewards']);
    if (q.imbues.length) activities.push(['imbues', 'Imbue']);
    // Keep a completed activity's acknowledgement until Back, without stale buttons.
    const signature = JSON.stringify([q, flasks, this.activity]);
    if (signature === this.signature) return;
    this.signature = signature;
    this.toolbar.innerHTML = activities.map(([id, label]) => '<button type="button" data-conversation-activity="' + id + '" aria-pressed="' + (this.activity === id) + '">' + label + '</button>').join('')
      + (flasks || q.imbues.length || q.rewards.length ? '<button type="button" data-conversation-inventory>Inventory</button>' : '');
    let content = '';
    if (this.activity === 'flasks') content = flasks || '<p>Your flasks are ready.</p>';
    if (this.activity === 'work') content = q.work.map(r => '<section><h3>' + esc(r.label) + '</h3><p>' + esc(r.target)
      + '</p><small>' + [r.xp ? r.xp + ' experience' : '', r.passivePoints ? r.passivePoints + ' passive points' : '', ...r.rewards].filter(Boolean).map(esc).join(' · ')
      + '</small><p><button type="button" data-conversation-accept="' + esc(r.questId) + '">Accept</button></p></section>').join('') || '<p>The work is marked in your Journal.</p>';
    if (this.activity === 'rewards') content = q.rewards.map(r => '<section><h3>' + esc(r.label) + '</h3><p>' + esc(r.prompt) + '</p>'
      + (r.choices.some(c => c.skillId) ? '<label>Find a skill <input type="search" aria-label="Find a reward skill"></label>' : '')
      + r.choices.map(c => '<button type="button" data-conversation-reward="' + esc(r.questId) + '" data-choice="' + esc(c.id) + '"><strong>' + esc(c.name) + '</strong><br>'
        + esc(c.description) + '<br><small>' + c.lines.map(esc).join(' · ') + ' · ' + esc(c.footprint) + '</small></button>').join('') + '</section>').join('') || '<p>Your reward is in your pack.</p>';
    if (this.activity === 'imbues') content = q.imbues.map(r => '<section><h3>' + esc(r.prompt) + '</h3>' + (r.items.map(item => '<details><summary>' + esc(item.name) + '</summary><small>'
      + item.current.map(esc).join(' · ') + '</small>' + item.options.map(a => '<p><button type="button" data-conversation-imbue="' + esc(r.questId) + '" data-uid="' + item.uid + '" data-affix="' + esc(a.id) + '">Add ' + a.lines.map(esc).join(' · ') + '</button></p>').join('') + '</details>').join('')
      || '<p>Bring a magic piece from your pack.</p>') + '</section>').join('') || '<p>The work is done.</p>';
    this.body.innerHTML = content; this.body.hidden = !this.active;
  }
  private perform(button: HTMLButtonElement): void {
    const w = this.world!, q = conversationQuests(w, this.speakerId), d = button.dataset;
    if (d.conversationAccept && q.work.some(r => r.questId === d.conversationAccept))
      w.requestMeta({ t: 'questAccept', questId: d.conversationAccept });
    else if (d.conversationReward && q.rewards.some(r => r.questId === d.conversationReward && r.choices.some(c => c.id === d.choice))) {
      w.requestMeta({ t: 'questReward', questId: d.conversationReward, choiceId: d.choice! });
      this.status.textContent = w.questRewardOffers().some(r => r.questId === d.conversationReward) ? 'Make room in your pack, then choose again.' : '';
    } else if (d.conversationImbue && q.imbues.some(r => r.questId === d.conversationImbue && r.items.some(i => i.uid === Number(d.uid) && i.options.some(a => a.id === d.affix))))
      w.requestMeta({ t: 'questImbue', questId: d.conversationImbue, uid: Number(d.uid), affixId: d.affix! });
    else if (d.prepareSkill && w.actors.some(a => a.id === this.speakerId && a.defId === 'townsfolk_innkeep'))
      w.requestMeta({ t: 'learn', uid: Number(d.prepareSkill), slot: Number(d.prepareSlot), emptyOnly: true });
    else return;
    this.host.changed(); this.changed(); this.signature = ''; this.draw();
  }
}
