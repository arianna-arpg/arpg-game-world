import type { World } from '../engine/world';
import { esc } from './dom';

/** Native journal cards, with a separate source/claim identity from quest ledgers. */
export function explorationRewardHtml(world: World): string {
  return world.explorationRewardOffers().map(r => `<section data-exploration-offer style="padding:12px;margin:6px 0 16px;background:#211d28;border:1px solid #9b8055;border-radius:6px">
    <h3 style="color:#e4cb97;margin:0 0 8px">${esc(r.label)} · a recovered gem</h3>
    <p style="font-size:12px;line-height:1.6;color:#c9c1b1">Choose one support for your skills. The cache's other spoils are yours as well.</p>
    ${r.choices.map(c => `<button data-exploration-reward="${esc(r.source)}" data-reward-choice="${esc(c.id)}"
      style="display:block;width:100%;text-align:left;white-space:normal;margin:8px 0;padding:12px;line-height:1.5">
      <strong style="color:#e4cb97">${esc(c.name)}</strong> · level ${c.level}<br>
      <span style="color:${c.hosts.length ? '#6fc06f' : '#c8b06a'}">${esc(c.hosts.length
        ? 'Open socket: ' + c.hosts.join(', ') : 'Reserved for ' + c.originalHosts.join(', ') + ' · check your current sockets')}</span><br>
      <span>${esc(c.description)}</span><br><small>1 × 1 · Choose this gem</small></button>`).join('')}
    <p style="font-size:11px;color:#aaa18e">Socket the gem into a matching skill in your inventory. This choice waits if your pack is full, and remains here when you close the journal.</p>
  </section>`).join('');
}
