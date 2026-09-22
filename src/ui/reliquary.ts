import type { Account } from '../meta/account';
import { FEATURE } from '../meta/account';
import { RELIQUARY_CFG } from '../data/reliquary';
import { reliquaryCost, reliquaryPower } from '../meta/reliquary';
import { isRelic } from '../engine/accountReliquary';
import { describeItem } from '../engine/itemgen';
import type { ItemInstance } from '../engine/items';
import type { Seat, World } from '../engine/world';
import { RELIC_STASH } from '../data/stashes';
import { stashOverflow, stashPage, stashPageCost } from '../engine/stash';
import { relicReserve } from '../engine/accountReliquary';
import { stashGridHtml } from './stash';
import { CONTAINERS, containerBoard, boardDims } from '../engine/containers';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const empowermentText = (a: Account): string => `Your equipped Relics are empowered: +${Math.round(reliquaryPower(a.reliquary) * 100)}%`;

export function reliquaryInvestmentHtml(a: Account): string {
  const stash = a.reliquary.stash, pageCost = stashPageCost(RELIC_STASH, stash);
  const pages = a.features.has(FEATURE.RELIQUARY) ? `<div class="vault-lesson"><b>Relic stash · ${stash.pages} / ${RELIC_STASH.maxPages} pages</b><br>
    Each page holds a ${RELIC_STASH.board.w} × ${RELIC_STASH.board.h} grid. Stored Relics grant no power until equipped.<br>
    ${stash.pages < RELIC_STASH.maxPages ? `Next page: ${stash.invested} / ${pageCost} Mortal Essence invested.
    <button data-relic-stash-invest ${a.credits > 0 ? '' : 'disabled'}>Invest ${Math.min(Math.max(0, a.credits), pageCost - stash.invested)} Mortal Essence in storage</button><br>Partial investment persists across reckonings.` : 'All stash pages unlocked.'}</div>` : '';
  if (!a.ledger[RELIQUARY_CFG.attunement]) return pages;
  const r = a.reliquary, cost = reliquaryCost(r);
  return `${pages}<div class="vault-lesson"><b>Reliquary · Rank ${r.rank}</b><br>${empowermentText(a)}<br>
    Next rank: +${RELIQUARY_CFG.powerPerRank * 100} percentage points · ${r.invested} / ${cost} Mortal Essence invested.
    <button data-reliquary-invest ${a.credits > 0 && r.rank < RELIQUARY_CFG.maxRank ? '' : 'disabled'}>
      Invest ${Math.min(Math.max(0, a.credits), cost - r.invested)} Mortal Essence</button><br>
    Partial investment persists across reckonings. Costs grow quadratically; each rank grants the same power increase.</div>`;
}

function relicRow(i: ItemInstance, operation: string, label: string): string {
  const d = describeItem(i);
  const lines = [...d.implicit, ...d.affix.map(a => a.text), ...d.unique].map(esc).join('<br>');
  return `<div class="skill-entry"><b style="color:${d.color}">${esc(i.name)}</b>
    <div class="desc">${lines}</div><button data-relic-operation="${operation}" data-relic-uid="${i.uid}">${label}</button></div>`;
}

export function oracleReliquaryHtml(w: World, seat: Seat, query: string, page = 0): string {
  if (seat !== w.localSeat || w.clientActionHook) return '<div class="desc">Account Relic storage is available in your own hosted journey.</div>';
  if (!w.account.features.has(FEATURE.RELIQUARY)) return '';
  const equipped = seat.meta.containers.reliquary ?? [];
  const keys = new Set(equipped.map(i => i.relicKey));
  const reserve = w.account.reliquary.items.filter(i => !keys.has(i.relicKey));
  const entries = relicReserve(w.account), stash = w.account.reliquary.stash;
  page = Math.max(0, Math.min(stash.pages - 1, page));
  const matching = stashPage(entries, stash, page).filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  const overflow = stashOverflow(entries, stash);
  const board = containerBoard(CONTAINERS.reliquary);
  return `<h3>Account Reliquary</h3><div class="desc">${empowermentText(w.account)}<br>
    Equipped and stored Relics survive death and every new life. Exchange them here during a run.
    Lines below show baseline values; empowerment affects eligible numeric bonuses, not grants or reservations.</div>
    ${w.account.ledger[RELIQUARY_CFG.attunement] ? '<div class="desc">Attuned: invest Mortal Essence in the Reliquary at Reckoning.</div>'
      : '<button data-oracle-attune>Teach me to empower the Reliquary</button>'}
    <h3>Equipped across lives (${equipped.length})</h3>
    ${board ? stashGridHtml(boardDims(board), equipped, 'relicTile', 'relicSeat') : ''}
    <details><summary>Equipped contents</summary>${equipped.map(i => relicRow(i, 'unseat', 'Return to stash')).join('') || '<div class="desc">No Relics equipped.</div>'}</details>
    <h3>Relic stash (${reserve.length})</h3><div class="desc">Drag to place or exchange. Right-click a tile to equip or store. Unlock more pages in the Vault.</div>
    <input style="width:100%;box-sizing:border-box;padding:6px;background:#171522;color:inherit;border:1px solid #514866" data-relic-search aria-label="Search stored Relics" placeholder="Search stored Relics" value="${esc(query)}">
    <div class="bind-btns">${Array.from({ length: stash.pages }, (_, n) => `<button data-relic-page="${n}" aria-pressed="${n === page}" class="${n === page ? 'bound' : ''}">Page ${n + 1}${query ? ` (${stashPage(entries, stash, n).filter(i => i.name.toLowerCase().includes(query.toLowerCase())).length})` : ''}</button>`).join('')}<span class="desc">${stash.pages}/${RELIC_STASH.maxPages} pages</span></div>
    ${stashGridHtml(RELIC_STASH.board, stashPage(entries, stash, page), 'relicTile', `relicCell:${page}`, query)}
    <details><summary>Page contents and release</summary>${matching.map(i => relicRow(i, 'equip', 'Equip in an open seat') + `<button data-relic-release="${i.uid}" ${i.locked ? 'disabled' : ''}>Release ${esc(i.name)} permanently</button>`).join('') || '<div class="desc">No matching stored Relics on this page.</div>'}</details>
    ${overflow.length ? `<h3>Recovery (${overflow.length})</h3><div class="desc">Your old collection exceeded the new grid. Equip or release these Relics, or unlock space. New deposits wait until recovery is empty.</div>${overflow.map(({ item }) => relicRow(item, 'equip', 'Equip recovered Relic') + `<button data-relic-release="${item.uid}" ${item.locked ? 'disabled' : ''}>Release ${esc(item.name)} permanently</button>`).join('')}` : ''}
    <h3>Loose finds in this life</h3><div class="desc">Deposit these to keep them across lives. Stored Relics cannot be sold or dropped.</div>
    ${seat.meta.items.filter(isRelic).map(i => relicRow(i, 'store', 'Store permanently')).join('') || '<div class="desc">No loose Relics in your pack.</div>'}`;
}
