import { COSMETICS, COSMETIC_SLOTS, type CosmeticLoadout, type CosmeticSlot } from '../engine/cosmetics';
import { SKILLS } from '../data/skills';
import { COSMETIC_CFG } from '../data/cosmetics';
import type { Account } from '../meta/account';
import { applySkillColorCosmetic, buyCosmetic, cosmeticAcquisition, cosmeticCharges, cosmeticPick,
  equipCosmetic, ownsCosmetic, setSkillCosmeticColor, settleCosmetics, skillColorUnlocked } from '../meta/cosmetics';
import { drawCosmeticModelTile, drawCosmeticPreview, drawCosmeticSummonTile, cosmeticPreviewSummon } from '../render/vis/cosmetics';
import { drawCosmeticStyleTile } from '../render/vis/cosmeticEffects';
import type { BodyLook } from '../render/vis/body';

const esc = (s: string): string => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
interface WardrobeOptions {
  account: Account; save: () => void; back: () => void; body: BodyLook;
  skills: readonly { id: string; name: string }[];
}
function installStyles(): void {
  if (document.getElementById('wardrobe-styles')) return;
  const style = document.createElement('style'); style.id = 'wardrobe-styles';
  style.textContent = `
  #escape-menu:has(.wardrobe), #account-screen:has(.wardrobe) { width:min(1080px,94vw); max-width:94vw; max-height:90vh; padding:0; overflow:auto; background:#101820; border:1px solid #596878; }
  .wardrobe { color:#d9e1e8; text-align:left; font:14px/1.5 Georgia,serif; padding:26px; box-sizing:border-box; }
  .wardrobe * { box-sizing:border-box; }
  .wardrobe h1 { font-size:30px; margin:0; color:#f0dfbd; letter-spacing:2px; }
  .wardrobe h2 { color:#ecdfc8; font-size:20px; margin:8px 0; }
  .wardrobe p { margin:8px 0; }
  .wardrobe header { display:flex; gap:20px; justify-content:space-between; align-items:center; margin-bottom:18px; }
  .wardrobe small,.wardrobe .wd-muted { color:#a9b7c4; }
  .wardrobe .wd-eyebrow { font:11px/1.5 sans-serif; text-transform:uppercase; letter-spacing:2px; color:#b8a0d8; }
  .wardrobe .wd-layout { display:grid; grid-template-columns:minmax(255px,0.85fr) minmax(300px,1.4fr); gap:24px; }
  .wardrobe canvas { width:100%; height:auto; border:1px solid #344554; border-radius:8px; display:block; }
  .wardrobe button,.wardrobe select,.wardrobe input { font:13px/1.4 sans-serif; color:#dde6ec; background:#1a2835; border:1px solid #415465; border-radius:5px; padding:9px 12px; }
  .wardrobe button { cursor:pointer; }
  .wardrobe button:hover,.wardrobe button:focus-visible { border-color:#c8b0e7; background:#283748; }
  .wardrobe button:disabled { opacity:0.5; cursor:default; }
  .wardrobe .wd-tabs { display:flex; flex-wrap:wrap; gap:6px; margin:0 0 12px; }
  .wardrobe [aria-selected=true],.wardrobe [aria-pressed=true] { border-color:#d1b8ef; background:#302d44; }
  .wardrobe .wd-tools { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:12px; }
  .wardrobe input { flex:1; min-width:100px; }
  .wardrobe .wd-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; max-height:340px; overflow-y:auto; padding:2px; }
  .wardrobe .wd-card { padding:14px; text-align:left; min-height:115px; position:relative; }
  .wardrobe .wd-card b,.wardrobe .wd-card small { display:block; }
  .wardrobe .wd-swatch { width:28px; height:28px; border-radius:50%; margin-bottom:8px; background:radial-gradient(circle at 35% 25%,#ffffffa0,var(--swatch) 55%,#101820); box-shadow:0 0 18px color-mix(in srgb,var(--swatch) 25%,transparent); }
  .wardrobe canvas.wd-model-thumb { width:100%; height:95px; border:0; background:radial-gradient(ellipse,#31415280,transparent 70%); object-fit:contain; }
  .wardrobe canvas.wd-effect-thumb { width:110px; height:40px; border:0; object-fit:contain; margin-bottom:5px; }
  .wardrobe .wd-color-controls { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:12px; }
  .wardrobe input[type=color] { width:52px; height:42px; padding:3px; flex:0 0 52px; min-width:0; cursor:pointer; }
  .wardrobe input[data-wd-hex] { width:115px; flex:0 0 115px; font-family:monospace; }
  .wardrobe .wd-state { position:absolute; top:12px; right:10px; font:10px sans-serif; text-transform:uppercase; letter-spacing:1px; color:#b8c9d6; }
  .wardrobe .wd-detail { margin-top:14px; padding-top:12px; border-top:1px solid #344554; min-height:175px; }
  .wardrobe .wd-detail.wd-picker-detail { margin:0 0 16px; padding:0 0 14px; border-top:0; border-bottom:1px solid #344554; }
  .wardrobe .wd-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
  .wardrobe .wd-primary { background:#514461; border-color:#ac91c5; }
  .wardrobe .wd-outfit { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0; font-size:12px; }
  .wardrobe .wd-outfit span { border:1px solid #344554; padding:4px 8px; border-radius:12px; }
  .wardrobe .wd-note { color:#b9d7c6; min-height:22px; }
  @media(max-width:760px) { .wardrobe { padding:16px; } .wardrobe .wd-layout { grid-template-columns:1fr; } .wardrobe canvas { max-height:200px; object-fit:contain; } .wardrobe .wd-grid { max-height:260px; } }
  `;
  document.head.appendChild(style);
}

/** Reuses the pause/Vault surface, including its existing Esc, controller and timeflow policy. */
export function renderWardrobe(root: HTMLElement, opts: WardrobeOptions): void {
  installStyles();
  const { account } = opts;
  if (settleCosmetics(account).length) opts.save();
  let slot: CosmeticSlot = 'playerSkin', selected: string | null = null, skill = '', query = '', ownedOnly = false;
  let note = '', frame = 0;
  const save = (): void => { opts.save(); };
  // A restricted default is still equipped even without a specific skill in view.
  const effectiveId = (): string | null => skill ? cosmeticPick(account.cosmetics.loadout, slot, skill)?.id ?? null
    : account.cosmetics.loadout.slots[slot] ?? null;
  selected = effectiveId();
  const draw = (): void => {
    cancelAnimationFrame(frame);
    const candidates = Object.values(COSMETICS).filter(d => d.slot === slot
      && (!skill || !d.skills || d.skills.includes(skill))
      && (!ownedOnly || ownsCosmetic(account.cosmetics, d.id))
      && `${d.name} ${d.collection}`.toLowerCase().includes(query.toLowerCase()));
    const def = selected ? COSMETICS[selected] : undefined;
    const previewSummon = slot === 'skillSkin' ? cosmeticPreviewSummon(skill || def?.skills?.[0]) : undefined;
    const bound = !!def?.consume && !!skill && skillColorUnlocked(account.cosmetics, def.id, skill);
    const owned = !!def && (def.consume ? bound : ownsCosmetic(account.cosmetics, def.id));
    const charges = def?.consume ? cosmeticCharges(account.cosmetics, def.id) : 0;
    const preview: CosmeticLoadout = { slots: { ...account.cosmetics.loadout.slots },
      skills: Object.fromEntries(Object.entries(account.cosmetics.loadout.skills).map(([id, picks]) => [id, { ...picks }])),
      customColors: { ...account.cosmetics.loadout.customColors } };
    if (skill && (slot === 'skillSkin' || slot === 'skillRecolor')) (preview.skills[skill] ??= {})[slot] = selected;
    else if (selected) preview.slots[slot] = selected; else delete preview.slots[slot];
    if (!skill && slot === 'skillSkin' && def?.skills?.[0]) (preview.skills[def.skills[0]] ??= {}).skillSkin = selected;
    let draftColor = account.cosmetics.loadout.customColors?.[skill] ?? def?.paint.color ?? '#c4b2f2';
    if (def?.consume && skill) preview.customColors![skill] = draftColor;
    root.innerHTML = `<section class="wardrobe" aria-label="Wardrobe">
      <header><div><div class="wd-eyebrow">Your account · your identity</div><h1>Wardrobe</h1>
      <p class="wd-muted">A different life. An unmistakable you.</p></div><button data-wd-back>Back</button></header>
      <div class="wd-layout"><aside>
        <canvas width="${COSMETIC_CFG.preview.width}" height="${COSMETIC_CFG.preview.height}" aria-label="Appearance preview"></canvas>
        <p class="wd-muted">Preview · ${previewSummon ? esc(previewSummon.name) : slot === 'wispSkin' ? 'your Mu vessel' : slot === 'portalSkin' || slot === 'portalRecolor' ? 'your Town Portal' : slot === 'hotbarSkin' ? 'your skill bar' : 'character, companion &amp; skill effects'}</p>
        <div class="wd-outfit">${Object.values(account.cosmetics.loadout.slots).map(id => `<span>${esc(COSMETICS[id]?.name ?? id)}</span>`).join('') || '<span>Original appearance</span>'}</div>
        <p>Owned choices stay with your account through every run. Wear them freely, in any combination.</p>
        <p class="wd-muted">Models change your silhouette; skins layer color and texture over it. Mu wisps have their own silhouettes. Your class, skills and attributes remain your own.</p>
        <p><b>${account.credits}</b> Mortal Essence available</p>
        <small>Spend a run’s Mortal Essence here from the Reckoning, before sealing it.</small>
        <p class="wd-note" role="status">${esc(note)}</p>
      </aside><div>
        <nav class="wd-tabs" aria-label="Cosmetic categories">${Object.entries(COSMETIC_SLOTS).map(([id, label]) => `<button data-wd-slot="${id}" aria-pressed="${id === slot}">${label}</button>`).join('')}</nav>
        <div class="wd-tools"><input data-wd-search type="search" aria-label="Search cosmetics" placeholder="Find a look…" value="${esc(query)}">
          <button data-wd-owned aria-pressed="${ownedOnly}">Owned only</button></div>
        ${slot === 'skillSkin' || slot === 'skillRecolor' ? `<div class="wd-tools"><label>Apply to <select data-wd-skill><option value="">All skills by default</option>${opts.skills.map(s => `<option value="${esc(s.id)}" ${skill === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label></div>` : ''}
        <div class="wd-grid"><button class="wd-card" data-wd-id="" aria-pressed="${selected === null}"><div class="wd-swatch" style="--swatch:#8995a0"></div><b>Original appearance</b><small>Clear this cosmetic</small></button>
        ${candidates.map(d => `<button class="wd-card" data-wd-id="${esc(d.id)}" aria-pressed="${selected === d.id}">
          <span class="wd-state">${effectiveId() === d.id ? 'Equipped' : d.consume ? `${cosmeticCharges(account.cosmetics, d.id)} ink${cosmeticCharges(account.cosmetics, d.id) === 1 ? '' : 's'}` : ownsCosmetic(account.cosmetics, d.id) ? 'Owned' : 'Locked'}</span>
          ${d.slot === 'playerModel' || d.slot === 'wispSkin' ? `<canvas class="wd-model-thumb" data-wd-model="${esc(d.id)}" width="170" height="110" aria-hidden="true"></canvas>`
            : d.paint.summonBodies ? `<canvas class="wd-model-thumb" data-wd-summon="${esc(d.id)}" width="170" height="110" aria-hidden="true"></canvas>`
            : d.paint.projectile || d.paint.portal || d.paint.hotbar ? `<canvas class="wd-effect-thumb" data-wd-effect="${esc(d.id)}" width="160" height="60" aria-hidden="true"></canvas>`
            : `<div class="wd-swatch" style="--swatch:${d.paint.color ?? '#c4b2f2'}"></div>`}<b>${esc(d.name)}</b><small>${esc(d.collection)}</small></button>`).join('')}</div>
        <div class="wd-detail"><div class="wd-eyebrow">${def ? esc(def.collection) : 'Your original look'}</div>
          <h2>${def ? esc(def.name) : 'Original appearance'}</h2><p>${def ? esc(def.description) : 'Use the character or skill’s own appearance in this slot.'}</p>
          ${def?.skills ? `<p class="wd-muted">Only for ${def.skills.map(id => esc(SKILLS[id]?.name ?? id)).join(', ')}. Other skills keep their own appearance.</p>` : ''}
          <small>${def ? esc(cosmeticAcquisition(def.id)) + ' · By ' + esc(def.author) : 'Always available'}</small>
          ${def?.consume ? `<p><b>${charges}</b> ink${charges === 1 ? '' : 's'} remaining · ${bound ? 'Color picker permanently unlocked for this skill.' : skill ? 'One ink unlocks this skill permanently.' : 'Choose a specific skill above to use an ink.'}</p>
            ${skill ? `<div class="wd-color-controls"><label for="wd-color">Your color</label><input id="wd-color" data-wd-color type="color" value="${draftColor}"><input data-wd-hex aria-label="Hex color" maxlength="7" value="${draftColor}" spellcheck="false"><small>Preview freely before saving</small></div>` : ''}` : ''}
          <div class="wd-actions">${def?.consume && !bound ? `<button class="wd-primary" data-wd-bind ${!skill || !charges ? 'disabled' : ''}>Use 1 ink · unlock this skill</button>` : `<button class="wd-primary" data-wd-equip ${def && !owned ? 'disabled' : ''}>${def?.consume ? 'Save color & equip' : effectiveId() === selected ? 'Equipped' : 'Equip'}</button>`}
          ${def?.acquire.kind === 'credits' && (!owned || def.consume) ? `<button data-wd-buy ${account.credits < def.acquire.cost ? 'disabled' : ''}>${def.consume ? 'Buy 1 ink' : 'Unlock'} · ${def.acquire.cost} Mortal Essence</button>` : ''}
          ${skill ? '<button data-wd-inherit>Use account default</button>' : ''}</div>
        </div>
      </div></div></section>`;
    // Keep the active picker and its explicit spend/save action above the catalogue.
    if (def?.consume) {
      const detail = root.querySelector<HTMLElement>('.wd-detail')!;
      detail.classList.add('wd-picker-detail');
      detail.parentElement!.insertBefore(detail, root.querySelector('.wd-grid'));
    }
    root.querySelector('[data-wd-back]')!.addEventListener('click', () => { cancelAnimationFrame(frame); opts.back(); });
    root.querySelectorAll<HTMLElement>('[data-wd-slot]').forEach(btn => btn.addEventListener('click', () => {
      slot = btn.dataset.wdSlot as CosmeticSlot;
      if (slot !== 'skillSkin' && slot !== 'skillRecolor') skill = '';
      query = ''; selected = effectiveId(); note = ''; draw();
    }));
    root.querySelectorAll<HTMLElement>('[data-wd-id]').forEach(btn => btn.addEventListener('click', () => { selected = btn.dataset.wdId || null; draw(); }));
    root.querySelector<HTMLInputElement>('[data-wd-search]')!.addEventListener('input', e => {
      const input = e.target as HTMLInputElement; query = input.value; draw();
      const next = root.querySelector<HTMLInputElement>('[data-wd-search]')!; next.focus();
    });
    root.querySelector('[data-wd-owned]')!.addEventListener('click', () => { ownedOnly = !ownedOnly; draw(); });
    root.querySelector<HTMLSelectElement>('[data-wd-skill]')?.addEventListener('change', e => { skill = (e.target as HTMLSelectElement).value; selected = effectiveId(); draw(); });
    root.querySelector('[data-wd-equip]')?.addEventListener('click', () => {
      const ok = def?.consume ? setSkillCosmeticColor(account, def.id, skill, draftColor) : equipCosmetic(account, slot, selected, skill || undefined);
      if (ok) { note = `${def?.name ?? 'Original appearance'} equipped. Saved to your account.`; save(); draw(); }
    });
    root.querySelector('[data-wd-bind]')?.addEventListener('click', () => {
      if (def && applySkillColorCosmetic(account, def.id, skill, opts.skills.map(s => s.id))) {
        setSkillCosmeticColor(account, def.id, skill, draftColor);
        note = 'Color picker unlocked for this skill. Future color changes cost no ink.'; save(); draw();
      }
    });
    const updateColor = (value: string): void => {
      const valid = /^#[0-9a-f]{6}$/i.test(value);
      root.querySelector<HTMLInputElement>('[data-wd-hex]')?.setCustomValidity(valid ? '' : 'Use six hexadecimal digits, such as #7ac4ff.');
      for (const action of ['[data-wd-equip]', '[data-wd-bind]']) {
        const button = root.querySelector<HTMLButtonElement>(action);
        if (button) button.disabled = !valid || (action === '[data-wd-bind]' && (!skill || !charges));
      }
      if (!valid) return;
      draftColor = value.toLowerCase(); preview.customColors![skill] = draftColor;
      root.querySelector<HTMLInputElement>('[data-wd-color]')!.value = draftColor;
    };
    root.querySelector<HTMLInputElement>('[data-wd-color]')?.addEventListener('input', e => {
      const value = (e.target as HTMLInputElement).value;
      root.querySelector<HTMLInputElement>('[data-wd-hex]')!.value = value; updateColor(value);
    });
    root.querySelector<HTMLInputElement>('[data-wd-hex]')?.addEventListener('input', e => {
      updateColor((e.target as HTMLInputElement).value);
    });
    root.querySelector('[data-wd-buy]')?.addEventListener('click', () => {
      if (selected && buyCosmetic(account, selected)) { note = def?.consume ? 'One ink added to your account.' : `${def!.name} unlocked for your account.`; save(); draw(); }
    });
    root.querySelector('[data-wd-inherit]')?.addEventListener('click', () => {
      if (equipCosmetic(account, slot, undefined, skill)) { selected = effectiveId(); note = 'Using your account default.'; save(); draw(); }
    });
    const canvas = root.querySelector<HTMLCanvasElement>('canvas')!;
    root.querySelectorAll<HTMLCanvasElement>('[data-wd-model]').forEach(tile => drawCosmeticModelTile(tile, opts.body, tile.dataset.wdModel!, slot === 'wispSkin'));
    root.querySelectorAll<HTMLCanvasElement>('[data-wd-summon]').forEach(tile => {
      const def = COSMETICS[tile.dataset.wdSummon!];
      drawCosmeticSummonTile(tile, def.id, skill || def.skills?.[0]);
    });
    root.querySelectorAll<HTMLCanvasElement>('[data-wd-effect]').forEach(tile => {
      const effect = COSMETICS[tile.dataset.wdEffect!];
      drawCosmeticStyleTile(tile, effect, account.cosmetics.loadout, SKILLS[skill || effect.skills?.[0] || '']?.color ?? '#b8cee9');
    });
    const animate = (ms: number): void => {
      if (!canvas.isConnected || !root.contains(canvas) || root.classList.contains('hidden')) return;
      drawCosmeticPreview(canvas, opts.body, preview, ms / 1000, skill || def?.skills?.[0], slot);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
  };
  draw();
}
