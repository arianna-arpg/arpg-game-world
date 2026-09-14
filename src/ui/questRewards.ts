import type { World } from '../engine/world';

const esc = (s: string): string => s.replace(/[&<>"']/g, ch =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

/** Reward cards live inside the journal and inherit its folio, scroll and input. */
export function questRewardHtml(world: World): string {
  return world.questRewardOffers().map(q => `<section style="padding:12px;margin:6px 0 16px;background:#211d28;border:1px solid #9b8055;border-radius:6px">
    <h3 style="color:#e4cb97;margin:0 0 8px">Choose your reward</h3>
    <p style="font-size:12px;line-height:1.6;color:#c9c1b1">${esc(q.prompt)}</p>
    ${q.xp ? `<div style="color:#aaa18e;font-size:11px">Also awarded: ${q.xp} experience</div>` : ''}
    ${q.choices.map(c => `<button data-quest-reward="${esc(q.questId)}" data-reward-choice="${esc(c.id)}"
      style="display:block;width:100%;text-align:left;white-space:normal;margin:8px 0;padding:12px;line-height:1.5">
      <strong style="color:#e4cb97">${esc(c.name)}</strong><br>
      <span style="color:#a8bfff">${c.lines.map(esc).join(' · ')}</span><br>
      <span>${esc(c.description)}</span><br><small>${esc(c.footprint)} · Choose this reward</small></button>`).join('')}
    <div style="font-size:11px;color:#aaa18e">The reward waits if your pack is full. You can close this journal and choose when you return.</div>
  </section>`).join('');
}
