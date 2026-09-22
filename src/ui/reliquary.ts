import type { Account } from '../meta/account';
import { FEATURE } from '../meta/account';
import { RELIQUARY_CFG } from '../data/reliquary';
import { reliquaryPower } from '../meta/reliquary';
import { isRelic } from '../engine/accountReliquary';
import { describeItem } from '../engine/itemgen';
import type { ItemInstance } from '../engine/items';
import type { Seat, World } from '../engine/world';
import { RELIC_STASH } from '../data/stashes';
import { stashOverflow, stashPage } from '../engine/stash';
import { relicReserve } from '../engine/accountReliquary';
import { stashGridHtml } from './stash';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const empowermentText = (a: Account): string => `Your equipped Relics are empowered: +${Math.round(reliquaryPower(a.reliquary) * 100)}%`;

function relicRow(i: ItemInstance, operation: string, label: string): string {
  const d = describeItem(i);
  const lines = [...d.implicit, ...d.affix.map(a => a.text), ...d.unique].map(esc).join('<br>');
  return `<div class="skill-entry"><b style="color:${d.color}">${esc(i.name)}</b>
    <div class="desc">${lines}</div><button data-relic-operation="${operation}" data-relic-uid="${i.uid}">${label}</button></div>`;
}

export function oracleReliquaryHtml(w: World, seat: Seat, query: string, page = 0): string {
  if (seat !== w.localSeat || w.clientActionHook) return '<div class="desc">Account Relic storage is available in your own hosted journey.</div>';
  if (!w.account.features.has(FEATURE.RELIQUARY)) return '';
  const entries = relicReserve(w.account), stash = w.account.reliquary.stash;
  page = Math.max(0, Math.min(stash.pages - 1, page));
  const matching = stashPage(entries, stash, page).filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  const overflow = stashOverflow(entries, stash);
  return `<h3>Oracle Relic Storage</h3><div class="desc">Store Relics here or withdraw them to your pack. Equip them on the inventory’s Reliquary page.</div>
    ${w.account.ledger[RELIQUARY_CFG.attunement] ? '' : '<button data-oracle-attune>Learn Reliquary Empowerment</button>'}
    <div class="desc">Drag between storage and your pack. Right-click to withdraw.</div>
    <input style="width:100%;box-sizing:border-box;padding:6px;background:#171522;color:inherit;border:1px solid #514866" data-relic-search aria-label="Search stored Relics" placeholder="Search stored Relics" value="${esc(query)}">
    <div class="bind-btns">${Array.from({ length: stash.pages }, (_, n) => `<button data-relic-page="${n}" aria-pressed="${n === page}" class="${n === page ? 'bound' : ''}">Page ${n + 1}${query ? ` (${stashPage(entries, stash, n).filter(i => i.name.toLowerCase().includes(query.toLowerCase())).length})` : ''}</button>`).join('')}<span class="desc">${stash.pages}/${RELIC_STASH.maxPages} pages</span></div>
    ${stashGridHtml(RELIC_STASH.board, stashPage(entries, stash, page), 'relicTile', `relicCell:${page}`, query)}
    <details><summary>Page contents and release</summary>${matching.map(i => relicRow(i, 'withdraw', 'Withdraw to pack') + `<button data-relic-release="${i.uid}" ${i.locked ? 'disabled' : ''}>Release ${esc(i.name)} permanently</button>`).join('') || '<div class="desc">No matching stored Relics on this page.</div>'}</details>
    ${overflow.length ? `<h3>Recovery (${overflow.length})</h3><div class="desc">Your old collection exceeded the new grid. Withdraw or release these Relics, or unlock space. New deposits wait until recovery is empty.</div>${overflow.map(({ item }) => relicRow(item, 'withdraw', 'Recover to pack') + `<button data-relic-release="${item.uid}" ${item.locked ? 'disabled' : ''}>Release ${esc(item.name)} permanently</button>`).join('')}` : ''}
    <h3>Relics in your pack</h3><div class="desc">New finds become account property when stored or equipped. Account Relics cannot be sold or dropped.</div>
    ${seat.meta.items.filter(isRelic).map(i => relicRow(i, 'store', 'Store permanently')).join('') || '<div class="desc">No loose Relics in your pack.</div>'}`;
}
