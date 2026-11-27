import { reliquaryPaneFieldHtml } from '../render/relicArt';
import { RUNE_FIELD_ACTIVITY } from '../render/runeField';
import { hollowWakeMenuHeader } from './brand';
import { renderInterfacePage } from './interfacePage';
import { decorateInventoryPanel, styleInventorySurface } from './interfaceStyle';
import { DEFAULT_INTERFACE_STYLE, INTERFACE_STYLE_CATEGORIES, INTERFACE_TEMPLATES, matchingInterfaceTemplate, normalizeInterfaceStyle, type InterfaceStyle } from './interfaceStyleConfig';
import { mountRuneFields } from './runeField';
import { iconSvg } from './icons';
import { equipmentFaceHtml } from '../render/itemIcons';
import type { SkillDef } from '../engine/skills';

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
export function renderWardrobeInterface(root: HTMLElement, options: WardrobeInterfaceOptions, sampleSkills: readonly SkillDef[], back: () => void): void {
  let draft = normalizeInterfaceStyle(options.get());
  registerRuneSample();
  const sliderId = `${esc(root.id)}-wardrobe-rune-activity`;
  renderInterfacePage(root, { id:'interface-style', className:'wardrobe', label:'Interface style', body:`
    ${hollowWakeMenuHeader()}
    <header><div><div class="wd-eyebrow">Wardrobe</div><h1>Interface</h1></div></header>
    <fieldset class="wd-templates"><legend>Templates</legend>
      ${INTERFACE_TEMPLATES.map(t => `<button type="button" data-interface-template="${esc(t.id)}" aria-pressed="false" title="${esc(t.description)} · ${esc(t.author)}">
        <span class="wd-template-swatch" aria-hidden="true">${equipmentFaceHtml('helmet')}</span>
        <span><b>${esc(t.name)}</b><small>${esc(t.description)}</small></span></button>`).join('')}
    </fieldset>
    <div class="wd-layout"><aside>
      <div class="wd-interface-stage">
        <div class="panel interface-preview" data-interface-preview>
          <h2><span data-preview-heading>Inventory</span></h2>
          <div class="folio-strip" style="position:absolute;left:0;right:0;top:-26px;width:100%" aria-label="Page tab preview">
            <button type="button" class="folio-tab now" data-interface-tab="Inventory" aria-pressed="true">Inventory</button>
            <button type="button" class="folio-tab" data-interface-tab="Skills" aria-pressed="false">Skills</button>
          </div>
          <div class="build-ribbons" style="--build-rail:34px">
            <button class="build-ribbon" type="button" data-interface-page="Inventory" aria-pressed="true" aria-expanded="true"><span class="build-ribbon-label">${iconSvg('bag','folio-ribbon-icon')} INVENTORY</span></button>
            <button class="build-ribbon" type="button" data-interface-page="Skills" aria-pressed="false" aria-expanded="false"><span class="build-ribbon-label">${iconSvg('book','folio-ribbon-icon')} SKILLS</span></button>
          </div>
          <div data-preview-pane="Inventory"><h3 class="folio-section-title">Equipped</h3>
            <div class="equipment-figure wd-gear-board">${['helmet','chest','gloves'].map(id => `<span>${equipmentFaceHtml(id)}</span>`).join('')}</div>
            <h3 class="folio-section-title">Bag</h3><div class="wd-interface-slots" aria-hidden="true">${['weapon','ring','boots','','','','',''].map(id => `<span>${id ? equipmentFaceHtml(id) : ''}</span>`).join('')}</div>
          </div>
          <div data-preview-pane="Skills" hidden><h3 class="folio-section-title">Learned skills</h3>
            ${sampleSkills.map(skill => `<div class="skill-entry" style="border-left:3px solid ${esc(skill.color)}"><b class="name">${esc(skill.name)}</b><div class="tags">${esc(skill.tags.join(' · '))}</div></div>`).join('')}
          </div>
        </div>
      </div>
      <p class="wd-muted">Preview · <span data-template-name></span></p>
    </aside><div class="wd-interface-choices">
      <div class="wd-appearance-grid">${INTERFACE_STYLE_CATEGORIES.map(category => `<label class="wd-interface-choice"><b>${esc(category.label)}</b>
        <select data-interface-choice="${category.key}" aria-label="${esc(category.label)}">${category.choices.map(choice => `<option value="${esc(choice.id)}">${esc(choice.name)}</option>`).join('')}</select>
        <small data-interface-description="${category.key}"></small></label>`).join('')}</div>
      <div class="wd-interface-choice">
        <div class="wd-rune-label"><label for="${sliderId}"><b>Reliquary rune activity</b></label><output for="${sliderId}" aria-live="off"></output></div>
        <wardrobe-rune-sample data-activity="${draft.runeActivity}" aria-hidden="true"></wardrobe-rune-sample>
        <input id="${sliderId}" data-rune-activity type="range" min="0" max="${RUNE_FIELD_ACTIVITY.torrent}" step="1" value="${draft.runeActivity}" aria-describedby="${sliderId}-hint">
        <small id="${sliderId}-hint">Adjust how many runes appear and how quickly they change.</small>
      </div>
      <button data-interface-default>Restore default preview</button>
      <p class="wd-note" data-interface-note role="status">Saved on this device across characters.</p>
    </div></div>`, footer:'<button class="wd-primary" data-interface-save>Save interface style</button><button data-interface-back>Back to Wardrobe</button>' });
  const preview = root.querySelector<HTMLElement>('[data-interface-preview]')!;
  decorateInventoryPanel(preview);
  const note = root.querySelector<HTMLElement>('[data-interface-note]')!;
  const slider = root.querySelector<HTMLInputElement>('[data-rune-activity]')!;
  const readout = root.querySelector<HTMLOutputElement>('.wd-rune-label output')!;
  const sample = root.querySelector<HTMLElement>('wardrobe-rune-sample')!;
  const templateButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-interface-template]')];
  for (const button of templateButtons) {
    const template = INTERFACE_TEMPLATES.find(t => t.id === button.dataset.interfaceTemplate)!;
    styleInventorySurface(button.querySelector<HTMLElement>('.wd-template-swatch')!, { ...draft, ...template.appearance });
    button.addEventListener('click', () => {
      draft = { ...draft, ...template.appearance };
      note.textContent = 'Preview only. Save to apply.'; paint();
    });
  }
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
    const match = matchingInterfaceTemplate(draft);
    root.querySelector<HTMLElement>('[data-template-name]')!.textContent = match?.name ?? 'Custom mix';
    for (const button of templateButtons) button.setAttribute('aria-pressed', String(button.dataset.interfaceTemplate === match?.id));
    for (const category of INTERFACE_STYLE_CATEGORIES) {
      root.querySelector<HTMLSelectElement>(`[data-interface-choice="${category.key}"]`)!.value = draft[category.key];
      const choice = category.choices.find(c => c.id === draft[category.key])!;
      const description = root.querySelector<HTMLElement>(`[data-interface-description="${category.key}"]`)!;
      description.textContent = choice.description;
      description.title = `By ${choice.author}`;
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
  const pageButtons = [...preview.querySelectorAll<HTMLButtonElement>('[data-interface-tab],[data-interface-page]')];
  for (const button of pageButtons) button.addEventListener('click', () => {
    const page = button.dataset.interfaceTab ?? button.dataset.interfacePage!;
    preview.querySelector<HTMLElement>('[data-preview-heading]')!.textContent = page;
    for (const pane of preview.querySelectorAll<HTMLElement>('[data-preview-pane]')) pane.hidden = pane.dataset.previewPane !== page;
    for (const b of pageButtons) {
      const active = (b.dataset.interfaceTab ?? b.dataset.interfacePage) === page;
      b.setAttribute('aria-pressed',String(active));
      if (b.dataset.interfaceTab) b.classList.toggle('now',active);
      else b.setAttribute('aria-expanded',String(active));
    }
  });
  paint();
}
