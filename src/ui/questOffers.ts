import type { World } from '../engine/world';

const esc = (s: string): string => s.replace(/[&<>"']/g, ch =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]!));

/** Nearby offers share the journal's existing scrolling and native input path. */
export function questOfferHtml(world: World): string {
  const offers = world.questOfferChoices();
  if (!offers.length) return '';
  return '<section data-quest-offers style="padding:12px;margin:6px 0 16px;background:#1d2028;border:1px solid #657285;border-radius:6px">'
    + '<h3 style="color:#c8d7ed;margin:0 0 8px">Work offered nearby</h3>'
    + '<p style="font-size:12px;color:#b8b4a8">Choose a contract, or close the journal and follow your own road. Offers wait with their giver.</p>'
    + offers.map(q => '<article style="padding:10px 0;border-top:1px solid #454551;overflow-wrap:anywhere">'
      + '<strong style="color:#e4cb97">' + esc(q.label) + '</strong>'
      + '<p style="font-size:12px;line-height:1.5;margin:6px 0">Offered by ' + esc(q.giver)
      + '<br>' + esc(q.target) + '</p>'
      + (q.returnTo ? '<div style="font-size:11px;color:#c1b99f">Return to ' + esc(q.returnTo) + ' after the deed.</div>' : '')
      + (q.xp || q.passivePoints ? '<div style="font-size:11px;color:#b4c6d8">On completion: '
        + [q.xp ? q.xp + ' experience' : '', q.passivePoints ? q.passivePoints + ' passive point' + (q.passivePoints === 1 ? '' : 's') : ''].filter(Boolean).join(' · ') + '</div>' : '')
      + (q.rewards.length ? '<div style="font-size:11px;color:#b4c6d8">Choose one reward: ' + q.rewards.map(esc).join(' · ') + '</div>' : '')
      + '<button data-quest-accept="' + esc(q.questId) + '" style="margin:10px 0 0;padding:8px 16px;white-space:normal">Accept contract</button>'
      + '</article>').join('') + '</section>';
}
