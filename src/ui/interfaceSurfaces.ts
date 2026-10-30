/** Shared presentation coverage. Selectors are the opt-in contract: dynamically
 * created surfaces inherit immediately, without observing or rebuilding DOM.
 * Full-screen backdrops stay with their owners; theme the actual card inside. */
export const INTERFACE_SURFACES = {
  frames: [
    '.panel:not(.inventory-surface):not(:has(> .front-screen, > .side-screen, > .wardrobe))',
    '.side-pane', '.wardrobe', '.menu-tray', '.memory-reveal-box',
    '.choice-popup', '.kit-pop', '.seal-box', '.interface-dialog',
    '#story-card', '#mu-card',
  ],
  compact: ['.tooltip', '.vault-toast'],
  controls: [
    '.panel:not(:has(> .front-screen))', '.side-screen', '.wardrobe', '.menu-bar',
    '.memory-reveal', '.choice-popup', '.kit-pop', '.seal-box', '.interface-dialog',
    '#escape-menu', '#story-card', '#death-screen', '#mu-card', '#class-select', '#expedition-setup',
  ],
  headings: [
    '.panel:not(.inventory-surface):not(:has(> .front-screen, > .side-screen, > .wardrobe)) > h2',
    '.panel:not(.inventory-surface):not(:has(> .front-screen, > .side-screen, > .wardrobe)) > h1',
    '.interface-dialog > h2', '.interface-heading', '.wardrobe header h1',
    '.memory-reveal-box > h1', '.seal-box > h2',
  ],
  tabs: [
    '.folio-strip .folio-tab', '.book-tabs button', '.realm-tabs button',
    '.wardrobe .wd-tabs button', '.codex nav button',
  ],
} as const;

const styleId = 'interface-surface-theme';
const scope = (selectors: readonly string[]): string => `:root[data-interface-theme] :is(${selectors.join(',')})`;

/** Every rule changes paint only. Native dimensions, overflow, position,
 * selection, attention, rarity and disabled behavior stay authoritative. */
export function installInterfaceSurfaceStyles(): void {
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style'); style.id = styleId;
  const frame = scope(INTERFACE_SURFACES.frames), compact = scope(INTERFACE_SURFACES.compact);
  const controls = scope(INTERFACE_SURFACES.controls), headings = scope(INTERFACE_SURFACES.headings);
  const tabs = scope(INTERFACE_SURFACES.tabs);
  const neutral = ':not(.bound,.active,.danger,.lit,.selected,.chosen,.locked,.sealed,.skill-tree-link,.rack-unlearn,[aria-pressed=true],[aria-selected=true],[aria-current=true])';
  style.textContent = `
    ${frame}, ${compact}, ${controls} {
      --panel-bg:var(--inv-surface); --panel-border:var(--inv-line);
      --text:var(--inv-text); --text-dim:var(--inv-muted);
      scrollbar-color:var(--inv-edge) var(--inv-surface);
    }
    ${frame} {
      color:var(--inv-text); border-color:var(--inv-edge); border-top-color:var(--inv-light);
      border-radius:var(--inv-frame-radius); background:var(--inv-frame-detail),var(--inv-panel-fill);
      box-shadow:var(--inv-frame-shadow);
    }
    ${compact} { color:var(--inv-text); background:var(--inv-panel-fill); border-color:var(--inv-edge);
      box-shadow:inset 0 0 0 2px #08141a,0 8px 25px #0009; }
    ${headings} { position:relative; border-bottom-color:transparent; }
    ${headings}::after { content:''; position:absolute; pointer-events:none; left:0; right:0; bottom:-5px;
      height:8px; background:var(--inv-divider-art); }
    ${controls} :where(button${neutral}:not(:disabled)) { background:var(--inv-control-fill); }
    ${controls} :where(button${neutral}:hover:not(:disabled)) { background:var(--inv-control-hover); border-color:var(--inv-light); }
    ${controls} :where(input:not([type=range]):not([type=checkbox]):not([type=radio]):not([type=color]),select,textarea) {
      color:var(--inv-text); background:var(--inv-surface); border-color:var(--inv-edge);
    }
    ${controls} :where(select option) { color:var(--inv-text); background:var(--inv-surface); }
    ${controls} :where(.skill-entry) { background:var(--inv-equip-fill); box-shadow:inset 0 1px #b9d5c311,0 2px 4px #0003; }
    ${controls} :where(input[type=checkbox],input[type=radio],input[type=range]) { accent-color:var(--inv-light); }
    ${controls} :where(button,input,select,textarea):focus-visible { outline:2px solid var(--inv-light); outline-offset:2px; }
    ${tabs} { position:relative; color:var(--inv-muted); background:var(--inv-tab-detail),var(--inv-control-fill);
      border-color:var(--inv-edge); border-radius:var(--inv-tab-radius); text-shadow:0 1px 2px #0009; }
    ${tabs}:hover:not(:disabled) { color:var(--inv-text); background:var(--inv-tab-detail),var(--inv-control-hover); border-color:var(--inv-light); }
    ${tabs}:is(.now,.active,[aria-selected=true],[aria-pressed=true],[aria-current=true]) {
      color:#fff0cc; background:var(--inv-tab-detail),var(--inv-tab-active); border-color:var(--inv-light);
    }
    :root[data-interface-theme] .folio-strip .folio-x { color:var(--inv-muted); border-color:var(--inv-edge);
      background:var(--inv-control-fill); border-radius:var(--inv-tab-radius); }
    :root[data-interface-theme] .folio-strip .folio-x:hover { color:var(--inv-text); border-color:var(--inv-light); }
    :root[data-interface-theme] .npc-dialogue::before { border-color:color-mix(in srgb,var(--inv-edge) 35%,transparent); }
    :root[data-interface-theme] .dialogue-layout { scrollbar-color:var(--inv-edge) var(--inv-surface); }
    :root[data-interface-theme] .dialogue-portrait { background:var(--inv-item-fill); border-color:var(--inv-edge); }
    :root[data-interface-theme] :is(.dialogue-progress,.wd-muted,.menu-group) { color:var(--inv-muted); }
    :root[data-interface-theme] .side-pane {
      --side-text:var(--inv-text); --side-muted:var(--inv-muted); --side-accent:var(--inv-light);
      --side-line:var(--inv-line); --side-surface:var(--inv-surface);
    }
    :root[data-interface-theme] .codex {
      --cx-text:var(--inv-text); --cx-muted:var(--inv-muted); --cx-accent:var(--inv-light);
      --cx-line:var(--inv-line); --cx-surface:var(--inv-surface);
    }
    :root[data-interface-theme] .side-head h1::after { background:var(--inv-divider-art); }
    @media(prefers-reduced-motion:reduce) {
      :root[data-interface-theme] .folio-strip .folio-tab.fresh { animation:none; border-color:#e8d49a; }
    }
  `;
  document.head.appendChild(style);
}
