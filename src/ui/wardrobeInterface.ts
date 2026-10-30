import { hollowWakeMenuHeader } from './brand';
import { decorateInventoryPanel, styleInventorySurface } from './interfaceStyle';
import { DEFAULT_INTERFACE_STYLE, INTERFACE_STYLE_CATEGORIES, normalizeInterfaceStyle, type InterfaceStyle } from './interfaceStyleConfig';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export interface WardrobeInterfaceOptions {
  get(): InterfaceStyle;
  save(style: InterfaceStyle): void;
}

/** Draft changes stay within this sample. Save alone updates the actual pages. */
export function renderWardrobeInterface(root: HTMLElement, options: WardrobeInterfaceOptions, back: () => void): void {
  let draft = normalizeInterfaceStyle(options.get());
  root.innerHTML = `<section class="wardrobe" aria-label="Interface style">
    ${hollowWakeMenuHeader()}
    <header><div><div class="wd-eyebrow">Wardrobe · Interface</div><h1>Your interface</h1>
      <p class="wd-muted">Choose a frame. Inlay a divider. Find your ribbons.</p></div><button data-interface-back>Back to Wardrobe</button></header>
    <div class="wd-layout"><aside>
      <div class="wd-interface-stage">
        <div class="panel interface-preview" data-interface-preview>
          <h2>Inventory</h2>
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
      <p class="wd-muted">Preview · Inventory and its pages</p>
      <p>Frames, title dividers and page ribbons can be mixed freely. All styles are included.</p>
      <p class="wd-muted">Applies to Inventory, Skills, Passives, Character, skill trees and container pages such as Reliquary. Layouts, item colors and gameplay cues stay intact.</p>
    </aside><div class="wd-interface-choices">
      ${INTERFACE_STYLE_CATEGORIES.map(category => `<label class="wd-interface-choice"><b>${esc(category.label)}</b>
        <select data-interface-choice="${category.key}" aria-label="${esc(category.label)}">${category.choices.map(choice => `<option value="${esc(choice.id)}">${esc(choice.name)}</option>`).join('')}</select>
        <small data-interface-description="${category.key}"></small></label>`).join('')}
      <div class="wd-actions"><button class="wd-primary" data-interface-save>Save interface style</button><button data-interface-default>Restore default preview</button></div>
      <p class="wd-note" data-interface-note role="status">Preview freely before saving.</p>
      <small>Saved with your UI settings on this device, across characters and runs.</small>
    </div></div></section>`;
  const preview = root.querySelector<HTMLElement>('[data-interface-preview]')!;
  decorateInventoryPanel(preview);
  const note = root.querySelector<HTMLElement>('[data-interface-note]')!;
  const paint = (): void => {
    styleInventorySurface(preview, draft);
    for (const category of INTERFACE_STYLE_CATEGORIES) {
      root.querySelector<HTMLSelectElement>(`[data-interface-choice="${category.key}"]`)!.value = draft[category.key];
      const choice = category.choices.find(c => c.id === draft[category.key])!;
      root.querySelector<HTMLElement>(`[data-interface-description="${category.key}"]`)!.textContent = `${choice.description} By ${choice.author}.`;
    }
  };
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
  root.querySelectorAll<HTMLButtonElement>('[data-interface-page]').forEach(button => button.addEventListener('click', () => {
    preview.querySelectorAll('[data-interface-page]').forEach(b => { b.setAttribute('aria-expanded', String(b === button)); b.setAttribute('aria-pressed', String(b === button)); });
  }));
  root.querySelector('[data-interface-highlight]')!.addEventListener('click', event => {
    const button = event.currentTarget as HTMLButtonElement;
    button.classList.toggle('bound');
  });
  paint();
}
