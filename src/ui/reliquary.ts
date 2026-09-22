import type { Account } from '../meta/account';
import { FEATURE } from '../meta/account';
import { RELIQUARY_CFG } from '../data/reliquary';
import { reliquaryCost, reliquaryPower } from '../meta/reliquary';
import { isRelic } from '../engine/accountReliquary';
import { describeItem } from '../engine/itemgen';
import type { ItemInstance } from '../engine/items';
import type { Seat, World } from '../engine/world';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const empowermentText = (a: Account): string => `Your equipped Relics are empowered: +${Math.round(reliquaryPower(a.reliquary) * 100)}%`;

export function reliquaryInvestmentHtml(a: Account): string {
  if (!a.ledger[RELIQUARY_CFG.attunement]) return '';
  const r = a.reliquary, cost = reliquaryCost(r);
  return `<div class="vault-lesson"><b>Reliquary · Rank ${r.rank}</b><br>${empowermentText(a)}<br>
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

export function oracleReliquaryHtml(w: World, seat: Seat, query: string): string {
  if (seat !== w.localSeat || w.clientActionHook) return '<div class="desc">Account Relic storage is available in your own hosted journey.</div>';
  if (!w.account.features.has(FEATURE.RELIQUARY)) return '';
  const equipped = seat.meta.containers.reliquary ?? [];
  const keys = new Set(equipped.map(i => i.relicKey));
  const reserve = w.account.reliquary.items.filter(i => !keys.has(i.relicKey));
  const matching = reserve.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  return `<h3>Account Reliquary</h3><div class="desc">${empowermentText(w.account)}<br>
    Equipped and stored Relics survive death and every new life. Exchange them here during a run.
    Lines below show baseline values; empowerment affects eligible numeric bonuses, not grants or reservations.</div>
    ${w.account.ledger[RELIQUARY_CFG.attunement] ? '<div class="desc">Attuned: invest Mortal Essence in the Reliquary at Reckoning.</div>'
      : '<button data-oracle-attune>Teach me to empower the Reliquary</button>'}
    <h3>Equipped across lives (${equipped.length})</h3>
    ${equipped.map(i => relicRow(i, 'unseat', 'Return to reserve')).join('') || '<div class="desc">No Relics equipped.</div>'}
    <h3>Oracle reserve (${reserve.length})</h3>
    <input style="width:100%;box-sizing:border-box;padding:6px;background:#171522;color:inherit;border:1px solid #514866" data-relic-search aria-label="Search stored Relics" placeholder="Search stored Relics" value="${esc(query)}">
    <div style="max-height:260px;overflow:auto">${matching.map(i => relicRow(i, 'equip', 'Equip in an open seat')).join('') || '<div class="desc">No matching stored Relics.</div>'}</div>
    <h3>Loose finds in this life</h3><div class="desc">Deposit these to keep them across lives. Stored Relics cannot be sold or dropped.</div>
    ${seat.meta.items.filter(isRelic).map(i => relicRow(i, 'store', 'Store permanently')).join('') || '<div class="desc">No loose Relics in your pack.</div>'}`;
}
