import { FEATURE, isVaultAvailable } from '../meta/account';
import { RELIQUARY_CFG } from '../data/reliquary';
import { reliquaryPower } from '../meta/reliquary';
import { isRelic, reliquaryExperience } from '../engine/accountReliquary';
import { describeItem, itemGridSize } from '../engine/itemgen';
import { itemModifierText } from './mechanicReference';
import type { ItemInstance } from '../engine/items';
import type { Seat, World } from '../engine/world';
import { RELIC_STASH } from '../data/stashes';
import { stashOverflow, stashPage } from '../engine/stash';
import { relicReserve } from '../engine/accountReliquary';
import { stashGridHtml } from './stash';
import { RELIC_COPY as copy } from './reliquaryPresentation';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Presentation derives every number from the live owner and shared folds. */
export function reliquarySummaryHtml(w: World, seat: Seat, held: readonly ItemInstance[], cells: number): string {
  const enabled = seat.meta.relicEnabled !== false;
  const power = w.clientActionHook || seat !== w.localSeat ? seat.meta.relicEmpowerment ?? 0 : reliquaryPower(w.account.reliquary);
  const xp = Math.round((1 - reliquaryExperience(held, enabled)) * 100);
  const occupied = held.reduce((n, item) => { const size = itemGridSize(item); return n + size.w * size.h; }, 0);
  const refusal = w.reliquaryRefusal(seat);
  return `<div class="relic-overview" data-relic-active="${enabled}">
    <div class="relic-state"><span class="relic-state-label"><i aria-hidden="true"></i>${enabled ? copy.active : copy.inactive}</span>
      <button type="button" data-reliquary-toggle aria-pressed="${enabled}" title="${esc(refusal ?? copy.toggleHint)}" ${refusal ? 'disabled' : ''}>${enabled ? copy.disable : copy.enable}</button></div>
    <dl class="relic-metrics">
      <div><dt>${copy.empowerment}</dt><dd data-relic-power>+${Math.round(power * 100)}%</dd></div>
      <div><dt>${copy.experience}</dt><dd data-relic-xp>${xp ? '−' + xp : '0'}%</dd></div>
      <div><dt>Cells used</dt><dd data-relic-cells>${occupied}<small> / ${cells}</small></dd></div>
    </dl>
    ${!enabled ? `<p class="relic-caption">${copy.inactiveHint}</p>` : ''}
    ${refusal ? `<p class="relic-refusal" role="status">${esc(refusal)}</p>` : ''}
  </div>`;
}

export function reliquaryRulesHtml(w: World, lockHint: string): string {
  return `<p class="relic-protection">${copy.protection}</p>
    <details class="relic-rules" data-relic-details="rules"><summary>${copy.rules}</summary>
      <p>${copy.calm} ${copy.storageHint}</p>
      <p>While active, each occupied cell reduces player XP by ${Math.round(RELIQUARY_CFG.xpPenaltyPerCell * 100)}%.</p>
      <p>${copy.baseline}</p>${isVaultAvailable(w.account) ? `<p>${copy.expansionHint}</p>` : ''}
      <p>${lockHint}</p>
    </details>`;
}

interface DescribedRelicCacheEntry {
  stamp: string;
  color: string;
  linesHtml: string;
}

const describedRelicCache = new WeakMap<ItemInstance, DescribedRelicCacheEntry>();
const relicSourceByCopy = new WeakMap<ItemInstance, ItemInstance>();

function relicStamp(i: ItemInstance): string {
  let affixSig = '';
  for (let k = 0; k < i.affixes.length; k++) {
    const a = i.affixes[k];
    affixSig += `${a.id}@${a.tier}:${a.rolls.join(',')};`;
  }
  return `${i.baseId}|${i.rarity}|${i.baseRoll}|${i.implicitRolls.join(',')}|${affixSig}|${i.uniqueId ?? ''}|${i.uniqueRolls?.join(',') ?? ''}`;
}

function cachedRelicDescription(i: ItemInstance): DescribedRelicCacheEntry {
  const source = relicSourceByCopy.get(i) ?? i;
  const stamp = relicStamp(source);
  const hit = describedRelicCache.get(source);
  if (hit && hit.stamp === stamp) return hit;
  const d = describeItem(source, itemModifierText);
  const linesHtml = [...d.implicit, ...d.affix.map(a => a.text), ...d.unique].join('<br>');
  const entry: DescribedRelicCacheEntry = { stamp, color: d.color, linesHtml };
  describedRelicCache.set(source, entry);
  return entry;
}

function relicRow(i: ItemInstance, operation: string, label: string): string {
  const d = cachedRelicDescription(i);
  return `<div class="relic-storage-row">
    <details data-relic-details="item:${i.uid}"><summary data-tip="item" data-item-uid="${i.uid}" style="color:${d.color}">${esc(i.name)}${i.locked ? ' · Locked' : ''}</summary>
      <div class="relic-caption">${d.linesHtml}</div></details>
    <div class="relic-row-actions"><button type="button" data-relic-operation="${operation}" data-relic-uid="${i.uid}">${label}</button>
    ${operation === 'withdraw' ? `<button type="button" class="relic-release" data-relic-release="${i.uid}" title="${copy.releaseTitle}" aria-label="Release ${esc(i.name)} permanently" ${i.locked ? 'disabled' : ''}>${copy.release}</button>` : ''}</div></div>`;
}

export function oracleReliquaryResultsHtml(w: World, seat: Seat, query: string, page = 0): string {
  const entries = relicReserve(w.account), stash = w.account.reliquary.stash;
  const pageCount = Math.max(1, stash.pages);
  page = Math.max(0, Math.min(pageCount - 1, page));
  const qLower = query.trim().toLowerCase();
  const byPage: ItemInstance[][] = Array.from({ length: pageCount }, () => []);
  const matchCountByPage = new Int32Array(pageCount);
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const cell = stash.cells[entry.key];
    if (!cell || cell.page < 0 || cell.page >= pageCount) continue;
    const placed: ItemInstance = { ...entry.item, x: cell.x, y: cell.y };
    relicSourceByCopy.set(placed, entry.item);
    byPage[cell.page].push(placed);
    if (qLower && entry.item.name.toLowerCase().includes(qLower)) matchCountByPage[cell.page]++;
  }
  const currentPageItems = byPage[page] ?? stashPage(entries, stash, page);
  const matching = qLower ? currentPageItems.filter(i => i.name.toLowerCase().includes(qLower)) : currentPageItems;
  const overflow = stashOverflow(entries, stash);
  const pack = seat.meta.items.filter(isRelic);
  return `<div data-relic-results>
    <div class="relic-pages" role="group" aria-label="Relic storage pages">${Array.from({ length: stash.pages }, (_, n) => `<button type="button" data-relic-page="${n}" aria-pressed="${n === page}" aria-label="Page ${n + 1}${qLower ? `, ${matchCountByPage[n]} matches` : ''}" class="${n === page ? 'bound' : ''}">${n + 1}${qLower ? ` <small>(${matchCountByPage[n]})</small>` : ''}</button>`).join('')}<span class="relic-caption">${stash.pages} / ${RELIC_STASH.maxPages} pages</span></div>
    <div class="relic-storage-grid">${stashGridHtml(RELIC_STASH.board, currentPageItems, 'relicTile', `relicCell:${page}`, qLower)}</div>
    <p class="relic-caption">${copy.storageGesture}</p>
    <details class="relic-rules" data-relic-details="contents"><summary>${copy.contents} · ${matching.length}</summary>${matching.map(i => relicRow(i, 'withdraw', copy.withdraw)).join('') || `<p class="relic-caption">${qLower ? copy.noMatches : copy.emptyPage}</p>`}</details>
    ${overflow.length ? `<div class="relic-recovery"><h3>${copy.recoveryTitle} · ${overflow.length}</h3><p class="relic-caption">${copy.recoveryHint}</p>${overflow.map(({ item }) => relicRow(item, 'withdraw', copy.withdraw)).join('')}</div>` : ''}
    <div class="relic-section-heading"><h3>${copy.packTitle}</h3><span class="relic-caption">${pack.length}</span></div>
    <p class="relic-caption">${copy.packHint} <span class="relic-risk">${copy.packRisk}</span></p>
    ${pack.map(i => relicRow(i, 'store', copy.store)).join('') || `<p class="relic-empty">${copy.emptyPack}</p>`}
  </div>`;
}

export function oracleReliquaryHtml(w: World, seat: Seat, query: string, page = 0): string {
  if (seat !== w.localSeat || w.clientActionHook) return `<p class="relic-caption">${copy.hostOnly}</p>`;
  if (!w.account.features.has(FEATURE.RELIQUARY)) return '';
  const entries = relicReserve(w.account);
  return `<section class="relic-storage">
    <div class="relic-section-heading"><h3>${copy.storageTitle}</h3><span class="relic-caption">${entries.length} stored</span></div>
    <p class="relic-caption">${copy.storageHintShort}</p>
    ${w.account.ledger[RELIQUARY_CFG.attunement] ? '' : `<button type="button" data-oracle-attune title="${copy.attuneHint}">${copy.attune}</button>`}
    <input class="relic-search" data-relic-search aria-label="Search stored Relics" placeholder="${copy.search}" value="${esc(query)}">
    ${oracleReliquaryResultsHtml(w, seat, query, page)}
  </section>`;
}
