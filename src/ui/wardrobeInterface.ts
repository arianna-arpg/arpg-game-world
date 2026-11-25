import { reliquaryPaneFieldHtml } from '../render/relicArt';
import { RUNE_FIELD_ACTIVITY } from '../render/runeField';
import { hollowWakeMenuHeader } from './brand';
import { renderInterfacePage } from './interfacePage';
import { decorateInventoryPanel, styleInventorySurface } from './interfaceStyle';
import { DEFAULT_INTERFACE_STYLE, INTERFACE_STYLE_CATEGORIES, normalizeInterfaceStyle, type InterfaceStyle } from './interfaceStyleConfig';
import { mountRuneFields } from './runeField';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export interface WardrobeInterfaceOptions {
  get(): InterfaceStyle;
  save(style: InterfaceStyle): void;
}

// Both Wardrobe entrances can replace the page directly. Tie animation cleanup
// to the sample leaving the document, including escape and account navigation.
function registerRuneSample(): void {
  if (customElements.get('wardrobe-rune-sample')) return;
  customElements.define('wardrobe-rune-sample', class extends HTMLElement {
    private field?: ReturnType<typeof mountRuneFields>;
    static observedAttributes = ['data-activity'];
    connectedCallback(): void {
      this.innerHTML = reliquaryPaneFieldHtml('upper');
      this.field = mountRuneFields(this, [], Number(this.dataset.activity));
    }
    attributeChangedCallback(_name: string, before: string | null, after: string): void {
      if (after !== before) this.field?.setActivity(Number(after));
    }
    disconnectedCallback(): void { this.field?.dispose(); this.field = undefined; }
  });
}

function runeActivityLabel(level: number): string {
  switch (level) {
    case 0: return 'Off · 0';
    case RUNE_FIELD_ACTIVITY.quiet: return `Quiet · ${level}`;
    case RUNE_FIELD_ACTIVITY.lively: return `Lively · ${level}`;
    case RUNE_FIELD_ACTIVITY.torrent: return `Matrix · ${level}`;
    default: return String(level);
  }
}

/** Draft changes stay within this sample. Save alone updates the actual pages. */
export function renderWardrobeInterface(root: HTMLElement, options: WardrobeInterfaceOptions, back: () => void): void {
  let draft = normalizeInterfaceStyle(options.get());
  registerRuneSample();
  const sliderId = `${esc(root.id)}-wardrobe-rune-activity`;
  renderInterfacePage(root, { id:'interface-style', className:'wardrobe', label:'Interface style', body:`
    ${hollowWakeMenuHeader()}
    <header><div><div class="wd-eyebrow">Wardrobe · Interface</div><h1>Your interface</h1>
      <p class="wd-muted">Choose a frame. Inlay a divider. Find your ribbons.</p></div></header>
    <div class="wd-layout"><aside>
      <div class="wd-interface-stage">
        <div class="panel interface-preview" data-interface-preview>
          <h2>Inventory</h2>
          <div class="folio-strip" style="position:absolute;left:0;right:0;top:-26px;width:100%" aria-label="Page tab preview">
            <button type="button" class="folio-tab now" data-interface-tab aria-pressed="true">Skills</button>
            <button type="button" class="folio-tab" data-interface-tab aria-pressed="false">Character</button>
          </div>
          <div class="build-ribbons" style="--build-rail:34px">
            <button class="build-ribbon" type="button" data-interface-page="Inventory" aria-pressed="false"><span class="build-ribbon-label">♙ CHARACTER</span></button>
            <button class="build-ribbon" type="button" data-interface-page="Skills" aria-pressed="true" aria-expanded="true"><span class="build-ribbon-label">📖 SKILLS</span></button>
          </div>
          <h3>Equipment &amp; belongings</h3>
          <div class="wd-interface-slots" aria-hidden="true">${Array.from({ length: 12 }, () => '<span></span>').join('')}</div>
          <div class="skill-entry"><b class="name">Silver and shadow</b><p class="tags">A shared style for your pages</p></div>
          <button type="button" data-interface-highlight>Preview highlight</button>
        </div>
      </div>
      <p class="wd-muted">Preview · Shared interface style</p>
      <p>Frames, title dividers and page ribbons can be mixed freely. All styles are included.</p>
      <p class="wd-muted">Shared across character pages, page tabs, conversations, vendors, station windows and menus.</p>
    </aside><div class="wd-interface-choices">
      ${INTERFACE_STYLE_CATEGORIES.map(category => `<label class="wd-interface-choice"><b>${esc(category.label)}</b>
        <select data-interface-choice="${category.key}" aria-label="${esc(category.label)}">${category.choices.map(choice => `<option value="${esc(choice.id)}">${esc(choice.name)}</option>`).join('')}</select>
        <small data-interface-description="${category.key}"></small></label>`).join('')}
      <div class="wd-interface-choice">
        <div class="wd-rune-label"><label for="${sliderId}"><b>Reliquary rune activity</b></label><output for="${sliderId}" aria-live="off"></output></div>
        <wardrobe-rune-sample data-activity="${draft.runeActivity}" aria-hidden="true"></wardrobe-rune-sample>
        <input id="${sliderId}" data-rune-activity type="range" min="0" max="${RUNE_FIELD_ACTIVITY.torrent}" step="1" value="${draft.runeActivity}" aria-describedby="${sliderId}-hint">
        <small id="${sliderId}-hint">Adjust how many runes appear and how quickly they change.</small>
      </div>
      <div class="wd-actions"><button class="wd-primary" data-interface-save>Save interface style</button><button data-interface-default>Restore default preview</button></div>
      <p class="wd-note" data-interface-note role="status">Preview freely before saving.</p>
      <small>Saved with your UI settings on this device, across characters and runs.</small>
    </div></div>`, footer:'<button data-interface-back>Back to Wardrobe</button>' });
  const preview = root.querySelector<HTMLElement>('[data-interface-preview]')!;
  decorateInventoryPanel(preview);
  const note = root.querySelector<HTMLElement>('[data-interface-note]')!;
  const slider = root.querySelector<HTMLInputElement>('[data-rune-activity]')!;
  const readout = root.querySelector<HTMLOutputElement>('.wd-rune-label output')!;
  const sample = root.querySelector<HTMLElement>('wardrobe-rune-sample')!;
  const paintActivity = (): void => {
    const level = String(draft.runeActivity);
    slider.value = level;
    readout.value = runeActivityLabel(draft.runeActivity);
    slider.setAttribute('aria-valuetext', readout.value);
    if (sample.dataset.activity !== level) sample.dataset.activity = level;
  };
  const paint = (): void => {
    styleInventorySurface(preview, draft);
    styleInventorySurface(sample, draft);
    paintActivity();
    for (const category of INTERFACE_STYLE_CATEGORIES) {
      root.querySelector<HTMLSelectElement>(`[data-interface-choice="${category.key}"]`)!.value = draft[category.key];
      const choice = category.choices.find(c => c.id === draft[category.key])!;
      root.querySelector<HTMLElement>(`[data-interface-description="${category.key}"]`)!.textContent = `${choice.description} By ${choice.author}.`;
    }
  };
  slider.addEventListener('input', () => {
    draft.runeActivity = slider.valueAsNumber;
    paintActivity();
    note.textContent = 'Preview only. Save to apply to your pages.';
  });
  root.querySelectorAll<HTMLSelectElement>('[data-interface-choice]').forEach(select => select.addEventListener('change', () => {
    draft = normalizeInterfaceStyle({ ...draft, [select.dataset.interfaceChoice!]: select.value });
    note.textContent = 'Preview only. Save to apply to your pages.'; paint();
  }));
  root.querySelector('[data-interface-save]')!.addEventListener('click', () => {
    options.save({ ...draft }); note.textContent = 'Interface style saved. Your pages now share this style.';
  });
  root.querySelector('[data-interface-default]')!.addEventListener('click', () => {
    draft = { ...DEFAULT_INTERFACE_STYLE }; note.textContent = 'Default preview restored. Save to apply.'; paint();
  });
  root.querySelector('[data-interface-back]')!.addEventListener('click', back);
  preview.querySelectorAll<HTMLButtonElement>('[data-interface-tab]').forEach(button => button.addEventListener('click', () => {
    preview.querySelectorAll('[data-interface-tab]').forEach(b => { b.classList.toggle('now', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-interface-page]').forEach(button => button.addEventListener('click', () => {
    preview.querySelectorAll('[data-interface-page]').forEach(b => { b.setAttribute('aria-expanded', String(b === button)); b.setAttribute('aria-pressed', String(b === button)); });
  }));
  root.querySelector('[data-interface-highlight]')!.addEventListener('click', event => {
    const button = event.currentTarget as HTMLButtonElement;
    button.classList.toggle('bound');
  });
  paint();
}
