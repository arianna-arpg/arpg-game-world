import type { World } from '../engine/world';

const esc = (s: string): string => s.replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

/** Reward cards live inside the journal and inherit its folio, scroll and input. */
export function questRewardHtml(world: World): string {
  return world.questRewardOffers().map(q => `<section style="padding:12px;margin:6px 0 16px;background:#211d28;border:1px solid #9b8055;border-radius:6px">
    <h3 style="color:#e4cb97;margin:0 0 8px">Choose your reward</h3>
    <p style="font-size:12px;line-height:1.6;color:#c9c1b1">${esc(q.prompt)}</p>
    ${q.choices.some(c => c.skillId) ? '<label>Find a skill <input data-reward-search type="search" placeholder="Search unlocked skills" style="width:100%;box-sizing:border-box;margin:8px 0;padding:8px;background:#14131c;color:#eee1c8;border:1px solid #706080;border-radius:3px"></label>' : ''}
    ${q.xp ? `<div style="color:#aaa18e;font-size:11px">Also awarded: ${q.xp} experience</div>` : ''}
    ${q.choices.map(c => `<button data-quest-reward="${esc(q.questId)}" data-reward-choice="${esc(c.id)}"
      style="display:block;width:100%;text-align:left;white-space:normal;margin:8px 0;padding:12px;line-height:1.5">
      <strong style="color:#e4cb97">${esc(c.name)}</strong><br>
      <span style="color:#a8bfff">${c.lines.map(esc).join(' · ')}</span><br>
      <span>${esc(c.description)}</span><br><small>${esc(c.footprint)} · Choose this reward</small></button>`).join('')}
    <div style="font-size:11px;color:#aaa18e">The reward waits if your pack is full. You can close this journal and choose when you return.</div>
  </section>`).join('');
}

export function questImbueHtml(world: World): string {
  return world.questImbueOffers().map(q => `<section style="padding:12px;margin:6px 0 16px;background:#211d28;border:1px solid #9b8055;border-radius:6px">
    <h3 style="color:#e4cb97;margin:0 0 8px">${esc(q.giver)}’s Imbue · quest level ${q.level}</h3>
    <p style="font-size:12px;line-height:1.6;color:#c9c1b1">${esc(q.prompt)}</p>
    <p style="font-size:11px;color:#aaa18e">Choose one added affix. Your existing affixes stay, and the item becomes rare. These choices and their strength are fixed for this life. Close the journal to decide later.</p>
    ${!q.near ? `<p style="color:#e4cb97">Return to ${esc(q.giver)} to use this imbue.</p>` : ''}
    ${q.items.length ? q.items.map(item => `<details style="padding:8px;border-top:1px solid #4a4040">
      <summary style="color:#a8bfff;cursor:pointer">${esc(item.name)}${!item.options.length ? ' · no compatible offer (or item locked)' : ''}</summary>
      <p style="font-size:11px;color:#aaa18e">Keep: ${item.current.map(esc).join(' · ')}</p>
      ${item.options.map(a => `<button data-quest-imbue="${esc(q.questId)}" data-item-uid="${item.uid}" data-affix-id="${esc(a.id)}" ${q.near ? '' : 'disabled'}
        style="display:block;width:100%;white-space:normal;text-align:left;margin:6px 0;padding:9px">
        <span style="color:#e8d44a">Add: ${a.lines.map(esc).join(' · ')}</span><br>
        <small>${a.unstudied ? 'Unstudied family — salvaging the imbued item can teach it' : 'Already studied'} · Imbue this item</small></button>`).join('')}
    </details>`).join('') : '<p style="color:#aaa18e">Carry a magic equipment item in your pack to see its offers. Your imbue will wait.</p>'}
  </section>`).join('');
}
