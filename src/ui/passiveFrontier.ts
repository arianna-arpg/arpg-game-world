import { esc } from './dom';

/** Presentation only. The caller supplies the same native eligibility and tooltip
 * as the graph; every click still goes through the ordinary allocation intent.
 * Settings.passiveAvailableList / passiveAllocatedList independently opt in;
 * both default off so the authored graph keeps its original space. */
export const PASSIVE_FRONTIER_VIEW = { enabled: true, maxHeight: 190, ownedHeight: 135, minCardWidth: 210 };
export interface PassiveFrontierCard {
  id: string; title: string; description: string; action: string;
}
/** An allocation keeps its native name, chosen attribute and granted text visible. */
export function passiveOwnedHtml(cards: PassiveFrontierCard[]): string {
  if(!PASSIVE_FRONTIER_VIEW.enabled || !cards.length)return '';
  return `<details data-passive-owned open style="margin:8px 0;border:1px solid #65593f;border-radius:6px;background:#201e26">
    <summary style="padding:8px 12px;color:#d8c58f;cursor:pointer">Your choices · ${cards.length}</summary>
    <div style="max-height:${PASSIVE_FRONTIER_VIEW.ownedHeight}px;overflow:auto;padding:0 12px 8px">
    ${cards.map(n=>`<div data-passive-owned-node="${esc(n.id)}" style="padding:5px 0;font-size:12px;line-height:1.4">
      <strong style="color:#ead3a1">✓ ${esc(n.title)}</strong><br>${n.description}</div>`).join('')}
    </div></details>`;
}
export function passiveFrontierHtml(cards: PassiveFrontierCard[]): string {
  const c=PASSIVE_FRONTIER_VIEW;
  if(!c.enabled || !cards.length)return '';
  return `<style>#passive-tree:has([data-passive-frontier]),[data-passive-frontier] div { scrollbar-width:thin;scrollbar-color:#766249 #201e26 }</style><details data-passive-frontier open style="margin:8px 0 12px;border:1px solid #756448;border-radius:6px;background:#201e26">
    <summary style="padding:9px 12px;cursor:pointer;color:#eedbaa">Available now · ${cards.length} paths</summary>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(${c.minCardWidth}px,1fr));gap:7px;padding:4px 9px 9px;max-height:${c.maxHeight}px;overflow:auto">
      ${cards.map(n=>`<button data-passive-choice="${esc(n.id)}"
        style="text-align:left;white-space:normal;padding:10px;line-height:1.5;background:#2c2832;border:1px solid #766249;border-radius:5px">
        <strong style="color:#ead3a1">${esc(n.title)}</strong><br>
        <span style="font-size:12px;color:#cdc6b9">${n.description}</span><br>
        <small style="color:#a9d3a5">${esc(n.action)}</small>
      </button>`).join('')}
    </div></details>`;
}
