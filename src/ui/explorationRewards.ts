import type { World } from '../engine/world';
import { esc } from './dom';

/** One offer face in both the Journal and the native Skills workspace. */
export function explorationRewardOffersHtml(world: World): string {
  return world.explorationRewardOffers().map(r => `<section data-exploration-offer style="padding:12px;margin:6px 0 16px;background:#211d28;border:1px solid #9b8055;border-radius:6px">
    <h3 style="color:#e4cb97;margin:0 0 8px">${esc(r.label)} · a recovered gem</h3>
    <p style="font-size:12px;line-height:1.6;color:#c9c1b1">Choose one support for your skills. The cache's other spoils are yours as well.</p>
    ${r.choices.map(c => `<button data-exploration-reward="${esc(r.source)}" data-reward-choice="${esc(c.id)}"
      style="display:block;width:100%;text-align:left;white-space:normal;margin:8px 0;padding:12px;line-height:1.5">
      <strong style="color:#e4cb97">${esc(c.name)}</strong> · level ${c.level}<br>
      <span style="color:${c.hosts.length ? '#6fc06f' : '#c8b06a'}">${esc(c.hosts.length
        ? 'Open socket: ' + c.hosts.join(', ') : 'Reserved for ' + c.originalHosts.join(', ') + ' · check your current sockets')}</span><br>
      <span>${esc(c.description)}</span><br><small>1 × 1 · Choose this gem</small></button>`).join('')}
    <p style="font-size:11px;color:#aaa18e">Socket the gem into a matching skill in your inventory. This choice waits if your pack is full. You can return to it in Skills or the Journal.</p>
  </section>`).join('');
}

/** The bag is where a player first inspects recovered loot. */
export function explorationRewardShortcutHtml(world: World): string {
  const offers = world.explorationRewardOffers();
  if (!offers.length) return '';
  return `<button data-exploration-choose style="display:block;width:100%;text-align:left;white-space:normal;
    margin:0 0 8px;padding:8px 10px;border:1px solid #9b8055;background:#211d28;color:#e4cb97">
    <strong>Choose recovered gem</strong><br><small>${esc(offers.map(r => r.label).join(' · '))}</small></button>`;
}

/** Native journal cards retain a separate source/claim identity from quests. */
export function explorationRewardHtml(world: World): string {
  const receipts = world.explorationRewardReceipts().map(r => `<section data-exploration-receipt
    style="padding:12px;margin:6px 0 16px;background:#1b211e;border:1px solid #6c8067;border-radius:6px">
    <h3 style="color:#c7dbbb;margin:0 0 8px">${esc(r.label)} · recovered</h3>
    <p style="margin:6px 0"><strong>${esc(r.name)}</strong> · level ${r.level}</p>
    <p style="font-size:12px;line-height:1.6;color:#c9c1b1">${esc(r.description)}</p>
    <button data-exploration-skills>Open Skills &amp; inventory</button>
  </section>`).join('');
  return explorationRewardOffersHtml(world) + receipts;
}
