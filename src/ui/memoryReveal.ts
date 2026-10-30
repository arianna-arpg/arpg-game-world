import type { Account } from '../meta/account';
import type { Settings } from '../meta/settings';
import type { MemoryUnlockDef } from '../data/memoryUnlocks';
import { memoryUnlockCandidates, memoryUnlockDef, type MemoryCandidate, type MemoryReceipt } from '../meta/memoryUnlocks';
import { skillIconSvg } from '../render/skillIcons';
import { skillShowcaseMarkup } from '../showcase/host';
import { hideTooltip } from './tooltip';
import { Z_LADDER } from './zorder';
import { MEMORY_REVEAL_CFG as CFG } from './memoryRevealConfig';
import { memoryChanceLabel, memoryPoolOdds, memoryPresentation, memoryRevealReel } from './memoryRevealModel';
import './memoryReveal.css';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Receipt reader, never an economy writer. Each opening owns its timers,
 * input boundary, focus return and showcase mounts. */
export class MemoryReveal {
  private root: HTMLDivElement | null = null;
  private owner: HTMLElement | null = null;
  private returnFocus: (() => HTMLElement | null) | null = null;
  private ownerWasInert = false;
  private timer = 0;
  private animation: Animation | null = null;
  private observer: MutationObserver | null = null;
  private reveal: (() => void) | null = null;
  private changedAt = 0;
  private previewCleanup: (() => void) | null = null;
  private stopPreview: (() => void) | null = null;
  private motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private settings: () => Settings, private saveSettings: () => void) {}
  get isOpen(): boolean { return !!this.root; }

  bindVault(root: HTMLElement, account: Account, defs: MemoryUnlockDef[]): void {
    const tools = root.querySelector<HTMLElement>('[data-memory-tools]');
    if (!tools) return;
    // Earned receipts keep their pool inspectable even after its last draw.
    const knownDefs = [...new Map([...defs, ...Object.keys(account.memoryReceipts)
      .flatMap(id => { const def = memoryUnlockDef(id); return def ? [def] : []; })].map(def => [def.id, def])).values()];
    tools.innerHTML = `<label>Memory reveals <select data-memory-mode aria-label="Memory reveal mode">
      <option value="cinematic">Cinematic</option><option value="instant">Instant</option></select></label>
      ${knownDefs.map(def => `<button data-memory-pool="${esc(def.id)}">${esc(def.label)} · pool &amp; odds</button>`).join('')}
      ${Object.entries(account.memoryReceipts).map(([id, r]) => `<button data-memory-review="${esc(id)}">View last ${r.tier === 'secondary' ? 'awakening' : 'discovery'}</button>`).join('')}`;
    const mode = tools.querySelector<HTMLSelectElement>('[data-memory-mode]')!;
    mode.value = this.settings().memoryReveal;
    mode.onchange = () => {
      this.settings().memoryReveal = mode.value === 'instant' ? 'instant' : 'cinematic'; this.saveSettings();
    };
    tools.querySelectorAll<HTMLButtonElement>('[data-memory-pool]').forEach(button => {
      button.onclick = () => {
        const def = knownDefs.find(d => d.id === button.dataset.memoryPool);
        if (def) this.showPool(root, def, memoryUnlockCandidates(account, def), () => button);
      };
    });
    tools.querySelectorAll<HTMLButtonElement>('[data-memory-review]').forEach(button => {
      button.onclick = () => {
        const receipt = account.memoryReceipts[button.dataset.memoryReview!];
        if (receipt) this.showReceipt(root, receipt, [], false, () => button);
      };
    });
  }

  celebrate(owner: HTMLElement, receipt: MemoryReceipt, pool: readonly MemoryCandidate[], purchaseId: string): boolean {
    if (this.settings().memoryReveal === 'instant') return false;
    this.showReceipt(owner, { ...receipt }, pool, !reducedMotion(), () =>
      owner.querySelector<HTMLElement>(`[data-invest="${CSS.escape(purchaseId)}"]`)
      ?? owner.querySelector<HTMLElement>(`[data-memory-review="${CSS.escape(purchaseId)}"]`));
    return true;
  }

  close = (): void => {
    this.clearRoll();
    this.previewCleanup?.(); this.previewCleanup = null; this.stopPreview = null;
    this.observer?.disconnect(); this.observer = null;
    this.motion.removeEventListener('change', this.onMotion);
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('focusin', this.onFocus, true);
    this.root?.remove(); this.root = null;
    const owner = this.owner;
    if (owner) owner.inert = this.ownerWasInert;
    const mode = owner?.querySelector<HTMLSelectElement>('[data-memory-mode]');
    if (mode) mode.value = this.settings().memoryReveal;
    const target = this.returnFocus?.();
    if (owner?.isConnected && !owner.classList.contains('hidden') && target?.isConnected) target.focus({ preventScroll: true });
    this.owner = null; this.returnFocus = null;
  };

  private clearRoll(): void {
    window.clearTimeout(this.timer); this.timer = 0;
    if (this.animation) { this.animation.onfinish = null; this.animation.cancel(); this.animation = null; }
    this.reveal = null;
  }

  private onMotion = (): void => { if (this.motion.matches) { this.reveal?.(); this.stopPreview?.(); } };
  private onFocus = (e: FocusEvent): void => {
    if (this.root && e.target instanceof Node && !this.root.contains(e.target)) this.focusFirst();
  };
  private focusFirst(): void { this.root?.querySelector<HTMLElement>('button:not(:disabled), input, select')?.focus({ preventScroll: true }); }
  private onKey = (e: KeyboardEvent): void => {
    if (!this.root) return;
    // Includes synthetic Escape from the controller. Keyup still clears the
    // game's held keys. Repeated Enter/Space cannot skip and then dismiss.
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!e.repeat && (this.reveal || performance.now() - this.changedAt >= CFG.settleGuardMs)) {
        if (this.reveal) this.reveal(); else this.close();
      }
    } else if (e.repeat && (e.key === 'Enter' || e.key === ' ')) e.preventDefault();
    else if (e.key === 'Tab') {
      const items = [...this.root.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]')].filter(el => el.getClientRects().length);
      const i = items.indexOf(document.activeElement as HTMLElement);
      if (i < 0 || (e.shiftKey ? i === 0 : i === items.length - 1)) {
        e.preventDefault(); items[e.shiftKey ? items.length - 1 : 0]?.focus();
      }
    }
  };

  private open(owner: HTMLElement, focus: () => HTMLElement | null): HTMLDivElement {
    this.close(); hideTooltip();
    this.owner = owner; this.ownerWasInert = owner.inert; owner.inert = true; this.returnFocus = focus;
    const root = document.createElement('div');
    root.className = 'memory-reveal'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'memory-reveal-title'); root.style.zIndex = String(Z_LADDER.cover);
    this.root = root; document.body.appendChild(root); this.changedAt = performance.now();
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('focusin', this.onFocus, true);
    this.motion.addEventListener('change', this.onMotion);
    this.observer = new MutationObserver(() => { if (!owner.isConnected || owner.classList.contains('hidden')) this.close(); });
    this.observer.observe(owner, { attributes: true, attributeFilter: ['class'] });
    return root;
  }

  private showReceipt(owner: HTMLElement, receipt: MemoryReceipt, pool: readonly MemoryCandidate[], animate: boolean, focus: () => HTMLElement | null): void {
    const root = this.open(owner, focus), tier = CFG.tiers[receipt.tier];
    root.style.setProperty('--memory-accent', tier.color);
    const finish = (): void => {
      if (this.root !== root) return;
      this.clearRoll(); this.changedAt = performance.now(); root.dataset.phase = 'result';
      this.result(root, receipt);
    };
    if (!animate) { finish(); return; }
    const reel = memoryRevealReel(receipt, pool);
    root.dataset.phase = 'rolling';
    root.innerHTML = `<section class="memory-reveal-box">
      <div class="memory-eyebrow">THE VAULT / ${receipt.tier === 'secondary' ? 'AWAKENING' : 'DISCOVERY'}</div>
      <h1 id="memory-reveal-title">${esc(tier.rolling)}</h1>
      <p class="memory-subtitle">One permanent unlock · No duplicates</p>
      <div class="memory-orbit" aria-hidden="true"><i></i><i></i><span>✧</span></div>
      <div class="memory-reel" aria-hidden="true"><div class="memory-reel-track">${reel.cards.map(card => {
        const face = memoryPresentation(card);
        return `<div class="memory-reel-card" style="--card-color:${esc(face.color)}">${skillIconSvg(face.face, 48)}<span>${esc(face.name)}</span><small>${card.kind === 'skill' ? 'SKILL' : 'SUPPORT'}</small></div>`;
      }).join('')}</div><div class="memory-reel-marker"></div></div>
      <div class="memory-reveal-footer"><label><input type="checkbox" data-memory-instant> Use Instant next time</label>
        <button data-memory-skip>Skip reveal</button></div></section>`;
    root.style.setProperty('--memory-card-width', `${CFG.cardWidth}px`);
    root.style.setProperty('--memory-card-gap', `${CFG.cardGap}px`);
    this.reveal = finish;
    root.querySelector<HTMLButtonElement>('[data-memory-skip]')!.onclick = finish;
    root.querySelector<HTMLInputElement>('[data-memory-instant]')!.onchange = e => {
      this.settings().memoryReveal = (e.target as HTMLInputElement).checked ? 'instant' : 'cinematic';
      this.saveSettings(); finish();
    };
    const end = -CFG.cardWidth / 2 - reel.landing * (CFG.cardWidth + CFG.cardGap);
    this.animation = root.querySelector<HTMLElement>('.memory-reel-track')!.animate([
      { transform: `translateX(${-CFG.cardWidth / 2}px)` }, { transform: `translateX(${end}px)` },
    ], { duration: CFG.durationMs, easing: 'cubic-bezier(.12,.62,.12,1)', fill: 'forwards' });
    this.animation.onfinish = finish;
    // A background tab or interrupted animation still reaches its receipt.
    this.timer = window.setTimeout(finish, CFG.durationMs + 150);
    root.querySelector<HTMLButtonElement>('[data-memory-skip]')!.focus();
  }

  private result(root: HTMLElement, receipt: MemoryReceipt): void {
    const face = memoryPresentation(receipt), tier = CFG.tiers[receipt.tier];
    root.innerHTML = `<section class="memory-reveal-box">
      <div class="memory-eyebrow">THE VAULT / ${esc(tier.title).toUpperCase()} / #${receipt.sequence}</div>
      <div class="memory-result-grid"><div class="memory-result-art">
        <div class="memory-emblem" style="--card-color:${esc(face.color)}" aria-hidden="true">${skillIconSvg(face.face, 94)}</div>
        <div data-memory-preview></div></div><div class="memory-result-copy">
        <div class="memory-kind">${receipt.kind === 'skill' ? 'SKILL' : 'SUPPORT'}</div>
        <h1 id="memory-reveal-title">${esc(face.name)}</h1>
        <p class="memory-description">${esc(face.description)}</p>
        <div class="memory-tags">${face.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>
        <div class="memory-benefit"><span aria-hidden="true">✦</span><p>${esc(tier.benefit)}</p></div>
        <p class="memory-note">${esc(tier.note)}</p>
        ${receipt.kind === 'support' ? '<p class="memory-note">Socket this support into a compatible skill to change how it plays.</p>' : ''}
      </div></div>
      <div class="memory-reveal-footer"><div class="memory-preferences">
        <label><input type="checkbox" data-memory-instant ${this.settings().memoryReveal === 'instant' ? 'checked' : ''}> Use Instant next time</label>
        ${face.skillId ? `<label><input type="checkbox" data-memory-autoplay ${this.settings().memoryPreview ? 'checked' : ''}> Autoplay skill previews</label>` : ''}
      </div><button data-memory-done>Return to Vault</button></div>
      <div class="memory-sr" role="status">${esc(tier.title)}: ${esc(face.name)}. ${esc(tier.benefit)}</div>
      </section>`;
    const done = root.querySelector<HTMLButtonElement>('[data-memory-done]')!;
    done.onclick = () => { if (performance.now() - this.changedAt >= CFG.settleGuardMs) this.close(); };
    root.querySelector<HTMLInputElement>('[data-memory-instant]')!.onchange = e => {
      this.settings().memoryReveal = (e.target as HTMLInputElement).checked ? 'instant' : 'cinematic'; this.saveSettings();
      const mode = this.owner?.querySelector<HTMLSelectElement>('[data-memory-mode]');
      if (mode) mode.value = this.settings().memoryReveal;
    };
    let playing = !!face.skillId && this.settings().memoryPreview && !reducedMotion();
    const preview = (): void => {
      this.previewCleanup?.(); this.previewCleanup = null;
      const seat = root.querySelector<HTMLElement>('[data-memory-preview]')!;
      if (!face.skillId) { seat.innerHTML = '<p class="memory-subtitle">A new possibility for your build</p>'; return; }
      seat.innerHTML = `${playing ? `<div class="memory-preview-stage" data-memory-preview-state="loading">${skillShowcaseMarkup({ skillId: face.skillId })}<p class="memory-preview-loading" role="status">Preparing skill preview…</p><p class="memory-preview-fallback" role="status">Preview unavailable. This Memory remains unlocked.</p></div>` : ''}
        <button data-memory-play aria-pressed="${playing}">${playing ? 'Pause' : 'Play'} skill preview</button>`;
      seat.querySelector<HTMLButtonElement>('[data-memory-play]')!.onclick = () => { playing = !playing; preview(); seat.querySelector<HTMLButtonElement>('button')?.focus(); };
      if (playing) {
        const stage = seat.querySelector<HTMLElement>('.memory-preview-stage')!;
        const host = stage.querySelector<HTMLElement>('.skill-showcase');
        const read = (): void => {
          stage.dataset.memoryPreviewState = !host || host.hasAttribute('data-showcase-empty') ? 'unavailable'
            : host.hasAttribute('data-showcase-ready') ? 'ready' : stage.dataset.memoryPreviewState;
        };
        const observer = new MutationObserver(read);
        if (host) observer.observe(host, { attributes: true, attributeFilter: ['data-showcase-empty', 'data-showcase-ready'] });
        const timer = window.setTimeout(() => { if (stage.dataset.memoryPreviewState === 'loading') stage.dataset.memoryPreviewState = 'unavailable'; }, CFG.previewWaitMs);
        this.previewCleanup = () => { window.clearTimeout(timer); observer.disconnect(); };
        read();
      }
    };
    this.stopPreview = () => { if (playing) { playing = false; preview(); } };
    root.querySelector<HTMLInputElement>('[data-memory-autoplay]')?.addEventListener('change', e => {
      this.settings().memoryPreview = (e.target as HTMLInputElement).checked; this.saveSettings();
      playing = this.settings().memoryPreview && !reducedMotion(); preview();
    });
    preview(); done.focus();
  }

  private showPool(owner: HTMLElement, def: MemoryUnlockDef, pool: MemoryCandidate[], focus: () => HTMLElement | null): void {
    const root = this.open(owner, focus), odds = memoryPoolOdds(pool).sort((a, b) => a.name.localeCompare(b.name));
    root.dataset.phase = 'pool';
    root.innerHTML = `<section class="memory-reveal-box memory-pool-box">
      <div class="memory-eyebrow">THE VAULT / POSSIBILITIES</div><h1 id="memory-reveal-title">${esc(def.label)}</h1>
      <p class="memory-subtitle">${pool.length} eligible Memories · ${def.cost} Mortal Essence per unlock · No duplicates</p>
      <p class="memory-note">Each chance is for your next completed purchase, before rounding. Your pool changes as you unlock Memories. Browsing spends nothing.</p>
      <div class="memory-pool-search"><input data-memory-search type="search" aria-label="Search eligible Memories" placeholder="Search names, descriptions or tags…">
        <select data-memory-kind aria-label="Memory kind"><option value="all">All Memories</option><option value="skill">Skills</option><option value="support">Supports</option></select></div>
      <p data-memory-count class="memory-note" role="status"></p><div class="memory-pool-list" data-memory-list></div>
      <div class="memory-reveal-footer"><button data-memory-more>Show more</button><button data-memory-done>Return to Vault</button></div></section>`;
    let limit = CFG.poolPageSize;
    const search = root.querySelector<HTMLInputElement>('[data-memory-search]')!, kind = root.querySelector<HTMLSelectElement>('[data-memory-kind]')!;
    const more = root.querySelector<HTMLButtonElement>('[data-memory-more]')!;
    const draw = (): void => {
      const q = search.value.trim().toLocaleLowerCase();
      const rows = odds.map(c => ({ ...c, face: memoryPresentation(c) })).filter(c => (kind.value === 'all' || c.kind === kind.value)
        && `${c.name} ${c.face.description} ${c.face.tags.join(' ')}`.toLocaleLowerCase().includes(q));
      root.querySelector<HTMLElement>('[data-memory-list]')!.innerHTML = rows.slice(0, limit).map(c =>
        `<article class="memory-pool-row"><div aria-hidden="true">${skillIconSvg(c.face.face, 36)}</div><div><b>${esc(c.name)}</b><small>${c.kind === 'skill' ? 'Skill' : 'Support'}</small><p>${esc(c.face.description)}</p></div><strong>${memoryChanceLabel(c.chance)}</strong></article>`).join('');
      root.querySelector<HTMLElement>('[data-memory-count]')!.textContent = rows.length ? `Showing ${Math.min(rows.length, limit)} of ${rows.length} matches` : pool.length ? 'No matching Memories.' : 'Every eligible Memory in this pool is unlocked.';
      more.hidden = limit >= rows.length;
    };
    search.oninput = kind.onchange = () => { limit = CFG.poolPageSize; draw(); };
    more.onclick = () => { limit += CFG.poolPageSize; draw(); if (more.hidden) root.querySelector<HTMLButtonElement>('[data-memory-done]')!.focus(); };
    root.querySelector<HTMLButtonElement>('[data-memory-done]')!.onclick = this.close;
    draw(); search.focus();
  }
}
