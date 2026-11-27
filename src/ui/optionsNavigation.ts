import { ACTION_IDS, ACTION_LABELS, PAD_ACTION_IDS, PAD_ACTION_LABELS, keyDisplay, type ActionId, type Settings } from '../meta/settings';
import type { SaveImportPlan } from '../meta/portage';
import { AIM_ASSIST_MODES, padDisplay } from '../core/gamepad';
import { MEMORY_CFG } from '../engine/memories';
import { CAMERA_MODES, cameraModeOf } from '../render/camera';
import { DAMAGE_TEXT_CFG } from '../world/damageText';
import { floatKindOn, floatKinds, noticeChannelOn, noticeChannels, NOTICE_ANCHORS, NOTICE_CFG, PICKUP_FEED_CFG } from '../world/bulletins';
import { ESCAPE_MODES, escapeModeOf } from './escapeConfig';
import { MAP_LABEL_MODES } from './mapConfig';
import { MENU_ANCHORS } from './menuConfig';
import { PORTAL_ANCHORS, PORTAL_VISIBILITY } from './portalConfig';
import { UI_SCALE_CFG } from './uiScale';
import { esc } from './dom';

interface OptionsContext {
  settings: Settings;
  pending: SaveImportPlan | null;
  note: string | null;
}

function keyboardRow(s: Settings, action: ActionId, help?: string): string {
  return `<div class="rebind-row"${help ? ' data-ui-hint="'+esc(help)+'"' : ''}><span>${esc(ACTION_LABELS[action])}</span>
    <button type="button" data-rebind="${action}"${help ? ' aria-label="'+esc(ACTION_LABELS[action])+'" aria-description="'+esc(help)+'"' : ''}>${esc(keyDisplay(s.keybinds[action]) || 'Unbound')}</button></div>`;
}

function saveRows(sp: SaveImportPlan | null, note: string | null): string {
  const savePortImportRow = sp ? `
      <div class="rebind-row">
        <span>File holds ${sp.summary.characters === 1 ? '1 hero' : `${sp.summary.characters} heroes`}, account level ${sp.summary.accountLevel}${sp.summary.exportedAt ? `, exported ${new Date(sp.summary.exportedAt).toLocaleDateString()}` : ''}</span>
        <span><button id="opt-saveport-confirm" title="No way back: the moment this is pressed, everything on this device is replaced by the file's contents and the game restarts into them.">OVERWRITE &amp; RESTART</button>
        <button id="opt-saveport-cancel" style="margin-left:5px">CANCEL</button></span>
      </div>` : `
      <div class="rebind-row">
        <span>Import Saves</span>
        <button id="opt-importsave" title="Pick a Hollow Wake save file to restore. The file is checked whole before anything is touched — a malformed or mismatched file is refused outright and changes nothing. Nothing merges: importing replaces this device's account, characters, and settings with the file's, then restarts the game.">CHOOSE FILE…</button>
      </div>`;
  return `
      <div class="acct-head">Your progress as one portable file: account, settings, and every character.
        Importing replaces what stands on this device, whole, then restarts the game.</div>
      ${note ? `<div class="acct-head" style="color:var(--gold)">${esc(note)}</div>` : ''}
      <div class="rebind-row">
        <span>Export Saves</span>
        <button id="opt-exportsave" title="Bundles the last-saved state of everything — account, settings, the Continue character, and every roster vessel — into one .json file named for the day and who's inside. The file holds what a relaunch would load, so quit to menu (or let the autosave land) if you want this exact moment in it.">DOWNLOAD</button>
      </div>
      ${savePortImportRow}`;
}

export const OPTIONS_TABS = {
  gameplay: {
    label: 'Gameplay',
    render: ({settings:s}: OptionsContext) => `
      <section class="options-section"><h2>Combat & loot</h2>
      <div class="rebind-row">
        <span>Improvised Strike (empty slots swing)</span>
        <button id="opt-improvised" title="Pressing an EMPTY bar slot swings a fixed, gemless improvised strike, the floor no kit falls beneath. Turn OFF to make empty slots dead keys (a stray press mid-dodge costs the swing's half-second; the risk budget is yours).">${s.improvisedStrike ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Gear Pickup</span>
        <button id="opt-gearpickup">${s.gearPickup === 'key'
          ? `PRESS ${keyDisplay(s.keybinds.pickup)}` : 'WALK OVER'}</button>
      </div>
      <div class="rebind-row">
        <span>Confirm Memory Sales</span>
        <button id="opt-memsell" title="With a scrap counter's wheel armed, clicking a STACKED Memory pouch (${MEMORY_CFG.sell.confirmFrom} or more memories) sells the whole stack at once. ON: a prompt confirms first and prints the pay. OFF: the plain click sells. The prompt's own 'don't ask again' turns this OFF; single memories never ask.">${s.confirmMemorySale ? 'ON' : 'OFF'}</button>
      </div>
      </section>
      <section class="options-section"><h2>Progression</h2>
      <div class="rebind-row">
        <span>Ability point prompt</span>
        <button id="opt-treeprompt" title="When a skill completes a level band and mints an Ability point. OFF: the bar slot's gold pip blooms and keeps breathing, the SKILLS drawer and the Menu button wear the pip, and you spend it from the drawer or the tree whenever you like. ON: the chooser popup also opens at the next calm moment.">${s.treePrompt ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Reawaken After Quit</span>
        <button id="opt-resume" title="Where a relaunched save wakes:
WHERE YOU STOOD: the exact spot, situation, and wounds the save captured (quitting out of trouble hands the trouble back)
IN LASTLIGHT: the sanctuary; the world stays explored, only you walk home
(A character mode may pin this choice.)">${s.resumeSpawn === 'town'
          ? 'IN LASTLIGHT' : 'WHERE YOU STOOD'}</button>
      </div>
      </section>
      <section class="options-section"><h2>Exploration</h2>
      <div class="rebind-row">
        <span>Destination labels</span>
        <button id="opt-destinationLabels" title="Near cursor reveals travel destinations when the mouse or controller reticle is near the passage. Always visible keeps destination names on screen.">${s.destinationLabels === 'always' ? 'ALWAYS VISIBLE' : 'NEAR CURSOR'}</button>
      </div>
      <div class="rebind-row">
        <span>Map Zone Names</span>
        <button id="opt-maplabels" title="How the world map wears its name cards:
${MAP_LABEL_MODES.map(m => `${m.name}: ${m.blurb}`).join('\n')}
Towns keep their card in every mode, and cards never block a waypoint's click.">${(MAP_LABEL_MODES.find(m => m.id === s.mapLabels) ?? MAP_LABEL_MODES[0]).name}</button>
      </div>
      </section>`,
  },
  controls: {
    label: 'Keyboard',
    render: ({settings:s}: OptionsContext) => `
      <section class="options-section"><h2>Movement</h2>
      <div class="rebind-row">
        <span>Invert Movement</span>
        <button id="opt-invertmove" title="Up walks down, left walks right: movement keys and the move stick alike (Swap Sticks trades WHICH stick moves; this flips WHICH WAY movement goes). Fair warning: the widdershins hex inverts controls too, so wearing it while this is ON plays standard for the duration; two turns make a true.">${s.invertMove ? 'ON' : 'OFF'}</button>
      </div>
      </section>
      <section class="options-section"><h2>Keybindings</h2>
      <p class="options-note">Choose a binding and press a key. Escape cancels. The mouse buttons use skills 1 and 2.</p>
      <div class="rebind-list">${ACTION_IDS.filter(a => a !== 'focusItemTooltip').map(a => keyboardRow(s,a)).join('')}</div>
      </section>`,
  },
  controller: {
    label: 'Controller',
    render: ({settings:s}: OptionsContext) => `
      <section class="options-section"><h2>Sticks & aim</h2>
      <div class="rebind-row">
        <span>Stick Deadzone</span>
        <span class="pad-opt"><input type="range" id="opt-deadzone" min="5" max="50" step="1"
          value="${Math.round(s.pad.deadzone * 100)}"> <b id="val-deadzone">${Math.round(s.pad.deadzone * 100)}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Reach (full tilt)</span>
        <span class="pad-opt"><input type="range" id="opt-aimreach" min="150" max="900" step="10"
          value="${Math.round(s.pad.aimRadius)}"> <b id="val-aimreach">${Math.round(s.pad.aimRadius)}</b></span>
      </div>
      <div class="rebind-row">
        <span>Menu Pointer Speed</span>
        <span class="pad-opt"><input type="range" id="opt-padspeed" min="300" max="2500" step="50"
          value="${Math.round(s.pad.pointerSpeed)}"> <b id="val-padspeed">${Math.round(s.pad.pointerSpeed)}</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Sensitivity (right stick)</span>
        <span class="pad-opt"><input type="range" id="opt-aimsens" min="0" max="100" step="5"
          value="${Math.round(s.pad.aimSensitivity * 100)}"> <b id="val-aimsens">${Math.round(s.pad.aimSensitivity * 100)}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Assist (reticle magnetism)</span>
        <span class="pad-opt"><input type="range" id="opt-aimassist" min="0" max="100" step="5"
          value="${Math.round(s.pad.aimAssist * 100)}"> <b id="val-aimassist">${s.pad.aimAssist <= 0 ? 'OFF' : `${Math.round(s.pad.aimAssist * 100)}%`}</b></span>
      </div>
      <div class="rebind-row">
        <span>Aim Assist Style</span>
        <button id="opt-assistmode" title="${AIM_ASSIST_MODES.map(m => `${m.name}: ${m.blurb}`).join('\n')}">${(AIM_ASSIST_MODES.find(m => m.id === s.pad.assistMode) ?? AIM_ASSIST_MODES[0]).name}</button>
      </div>
      <div class="rebind-row">
        <span>Swap Sticks (southpaw)</span>
        <button id="opt-swapsticks">${s.pad.swapSticks ? 'ON' : 'OFF'}</button>
      </div>
      </section>
      <section class="options-section"><h2>Button bindings</h2>
      <p class="options-note" role="status" data-pad-bind-help>Choose a binding and press a controller button. Menu or Escape cancels.</p>
      <div class="rebind-list">${PAD_ACTION_IDS.map(a => `<div class="rebind-row"><span>${esc(PAD_ACTION_LABELS[a])}</span><button data-padrebind="${a}">${esc(padDisplay(s.padBinds[a]) || 'Unbound')}</button></div>`).join('')}</div>
      </section>`,
  },
  interface: {
    label: 'Interface',
    render: ({settings:s}: OptionsContext) => `
      <section class="options-section"><h2>Tooltips</h2>
      <div class="rebind-row">
        <span>Tooltip detail</span>
        <button id="opt-tooltipDetail" title="Compact keeps the short card. Full includes skill breakdowns and equipment comparisons from the moment a card opens. Neither expands while you read.">${s.tooltipDetail === 'full' ? 'FULL' : 'COMPACT'}</button>
      </div>
      <div class="rebind-row">
        <span>Advanced tooltips by default</span>
        <button id="opt-inspectionAlways" aria-pressed="${s.inspectionAlways}">${s.inspectionAlways ? 'On' : 'Off'}</button>
      </div>
      ${keyboardRow(s,'inspectTooltips')}
      ${keyboardRow(s,'focusItemTooltip','On a hovered or keyboard-focused item, press this key to select the first linked stat or effect. Enter opens its details. Escape steps back. Press Delete while assigning to clear the shortcut.')}
      <p class="options-note">${s.inspectionAlways ? 'Links stay visible and item tooltips stay open for inspection.' : s.keybinds.inspectTooltips ? 'Hold '+esc(keyDisplay(s.keybinds.inspectTooltips))+' to reveal links and inspect an item under the pointer.' : 'Assign an inspection key to reveal links on demand.'}</p>
      </section>
      <section class="options-section"><h2>Windows & scale</h2>
      <div class="rebind-row">
        <span>UI Scale</span>
        <span class="pad-opt"><input type="range" id="opt-uiscale" min="${Math.round(UI_SCALE_CFG.min * 100)}" max="${Math.round(UI_SCALE_CFG.max * 100)}" step="${Math.round(UI_SCALE_CFG.step * 100)}"
          value="${Math.round(s.uiScale * 100)}"
          title="Grows the whole interface together (panels, tooltips, popups, and the on-screen HUD) so text stays readable at any eyesight. World text (damage numbers, nameplates) keeps battlefield scale."> <b id="val-uiscale">${Math.round(s.uiScale * 100)}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Escape closes</span>
        <button id="opt-escapecloses" title="What one Esc press clears, once the pause menu and the menu tray are down:
${ESCAPE_MODES.map(m => `${m.name}: ${m.blurb}`).join('\n')}">${escapeModeOf(s.escapeCloses).name}</button>
      </div>
      <div class="rebind-row">
        <span>Movable UI</span>
        <button id="opt-uimove" title="ON: drag any panel by its top ribbon; a lock glyph beside each panel's ✕ pins it in place, and the layout is remembered across sessions. OFF: every panel stands at its classic seat, and your saved layout waits for the next ON. Double-click a ribbon to return that one panel to its default seat.">${s.layout.movable ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>UI Layout</span>
        <span><button id="opt-uireset" title="Return every panel to its default seat and unlock them all; the remembered layout is cleared.">RESET TO DEFAULT</button>
          <span style="color:var(--text-dim);font-size:11px;margin-left:8px">${Object.keys(s.layout.seats).length} moved · ${Object.keys(s.layout.locked).length} locked</span></span>
      </div>
      </section>
      <section class="options-section"><h2>Menu bar & Town Portal</h2>
      <div class="rebind-row">
        <span>Menu Bar Seat</span>
        <button id="opt-menuanchor" title="Where the Menu button stands by default. ${MENU_ANCHORS.map(a => `${a.label}: ${a.blurb}`).join(' ')} With Movable UI on, drag it by its grip anywhere; a dragged seat wins until the layout is reset.">${esc(MENU_ANCHORS.find(a => a.id === s.menuBar.anchor)?.label ?? s.menuBar.anchor)}</button>
      </div>
      <div class="rebind-row">
        <span>Page Icons</span>
        <button id="opt-menudock" title="ON: every unlocked page stands as an icon tile beside the Menu button, greyed where it cannot be used from here. OFF: the one button, with the pages in its tray.">${s.menuBar.dock ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Town Portal Seat</span>
        <button id="opt-portalanchor" title="Where the Town Portal button stands. ${PORTAL_ANCHORS.map(a => `${a.label}: ${a.blurb}`).join(' ')}">${esc(PORTAL_ANCHORS.find(a => a.id === s.portalButton.anchor)?.label ?? s.portalButton.anchor)}</button>
      </div>
      <div class="rebind-row">
        <span>Town Portal Visibility</span>
        <button id="opt-portalvisibility" title="${esc(PORTAL_VISIBILITY.map(v => `${v.label}: ${v.blurb}`).join(' '))}">${esc(PORTAL_VISIBILITY.find(v => v.id === s.portalButton.visibility)?.label ?? s.portalButton.visibility)}</button>
      </div>
      </section>`,
  },
  visuals: {
    label: 'Combat feedback',
    render: ({settings:s}: OptionsContext) => `
      <section class="options-section"><h2>Damage numbers</h2>
      <div class="rebind-row">
        <span>Damage Number Display</span>
        <button id="opt-damagesum" title="Keep one running total per target until it finishes fading.">${s.summedDamageText ? 'SUMMED' : 'SEPARATE'}</button>
      </div>
      <div class="rebind-row">
        <label for="opt-damagesize">Damage Number Size</label>
        <span class="pad-opt"><input type="range" id="opt-damagesize" min="${DAMAGE_TEXT_CFG.sizePercent.min}" max="${DAMAGE_TEXT_CFG.sizePercent.max}"
          step="${DAMAGE_TEXT_CFG.sizePercent.step}" value="${s.damageNumberSize}"> <b id="val-damagesize">${s.damageNumberSize}%</b></span>
      </div>
      <div class="rebind-row">
        <span>Damage Effect Labels</span>
        <button id="opt-damagelabels" aria-label="Damage effect labels" aria-pressed="${s.damageEffectLabels}" title="Name the skill or effect beside each number. In Summed mode, each effect has its own total.">${s.damageEffectLabels ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Floating Number Placement</span>
        <button id="opt-floatavoid" title="FIXED keeps original positions. AVOID BODIES shifts numbers away from visible bodies.">${s.floatingTextAvoidance ? 'AVOID BODIES' : 'FIXED'}</button>
      </div>
      </section>
      <section class="options-section"><h2>Combat cues</h2>
      <div class="rebind-row">
        <span>Foresight (enemy cast markers)</span>
        <button id="opt-foresight">${s.castTelegraphs ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Debuff Names &amp; Durations</span>
        <button id="opt-statusreadout" title="Hover an icon near Life for details. Optional standing text can appear near your hero or in the upper corner. OFF hides the details; icons and screen effects keep their own behavior.">${s.statusReadout === 'hover' ? 'ON HOVER' : s.statusReadout === 'focus' ? 'NEAR HERO' : s.statusReadout === 'corner' ? 'UPPER CORNER' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Poise/Insight Arcs</span>
        <button id="opt-poolbars" title="When the poise/insight pool arcs show on the life orb:
SMART: around a recent change, or while dented on builds where the pool carries serious weight (default)
ON CHANGE: strictly around a recent change to the pool
ALWAYS: pinned on (the min-maxer's steady readout)">${{
          smart: 'SMART', recent: 'ON CHANGE', always: 'ALWAYS',
        }[s.poolBars]}</button>
      </div>
      <div class="rebind-row">
        <span>Health &amp; Cast Bar Placement</span>
        <button id="opt-crowdedmeters" title="FIXED keeps bars at their usual position above each body. AVOID CROWD moves overlapping groups with a line to their owner.">${s.crowdedMeters ? 'AVOID CROWD' : 'FIXED'}</button>
      </div>
      <div class="rebind-row">
        <span>Skill Cast Name</span>
        <button id="opt-castname" title="Show the skill name above your hero while casting.">${s.castNameHint ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Active Cast Slot Outline</span>
        <button id="opt-castslot" title="Outline the hotbar slot owning the current cast.">${s.castSlotHint ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Feet Planted Caption</span>
        <button id="opt-castmovement" title="Show a caption during casts that hold your hero in place.">${s.castMovementHint ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Hover Nameplates</span>
        <button id="opt-hovernames" title="Which bodies show the cursor nameplate. NAMED: distinctly-named enemies only, the classic elite read. ALL: every creature, minion, townsfolk and critter names itself under the cursor (name over kind + tier), so you can identify the exact entity without recalling its look. One plate at a time either way, and hidden bodies never tell.">${s.hoverNameplates === 'all' ? 'ALL' : 'NAMED'}</button>
      </div>
      </section>
      <section class="options-section"><h2>Item labels</h2>
      <div class="rebind-row">
        <span>Ground Item Label Placement</span>
        <button id="opt-rewardavoid" title="FIXED keeps classic item names. AVOID BODIES packs names around visible bodies and links them to their items.">${s.rewardLabelAvoidance ? 'AVOID BODIES' : 'FIXED'}</button>
      </div>
      </section>`,
  },
  display: {
    label: 'Display & motion',
    render: ({settings:s}: OptionsContext) => `
      <section class="options-section"><h2>World view</h2>
      <div class="rebind-row">
        <span>Camera</span>
        <button id="opt-cameramode" title="${CAMERA_MODES.map(m => `${m.name}: ${m.blurb}`).join('\n')}">${cameraModeOf(s.cameraMode).name}</button>
      </div>
      <div class="rebind-row">
        <span>Render Scale</span>
        <button id="opt-renderscale" title="Internal rendering resolution (render/renderScale.ts). The world view is identical at any setting; only pixel density changes.
AUTO: watches your live frame rate and steps down/up so the game holds smooth even on weak or degraded graphics paths (default)
Fixed %: pins the buffer at that share of the window">${s.renderScale === 'auto' ? 'AUTO' : `${Math.round((s.renderScale as number) * 100)}%`}</button>
      </div>
      <div class="rebind-row">
        <span>Line-of-Sight Shade</span>
        <span class="pad-opt"><input type="range" id="opt-veildark" min="0" max="100" step="5"
          value="${Math.round(s.veilDarkness * 100)}"
          title="How dark the sight veil paints what your hero cannot see: walls, trunks and roofs throw the same shadow shapes at any setting, and hidden nameplates dim with the pixels. 100% is the authored night; dim it to admire what the world builds atop its structures (spire gardens, canopy work). Purely visual: enemy eyes read the engine's own sightline, never this slider."> <b id="val-veildark">${s.veilDarkness <= 0 ? 'LIFTED' : `${Math.round(s.veilDarkness * 100)}%`}</b></span>
      </div>
      </section>
      <section class="options-section"><h2>Screen effects</h2>
      <div class="rebind-row">
        <span>Low-Life Screen Pulse</span>
        <button id="opt-lowlife" title="Blood seeps in at the screen edge while life is low, pressing inward on a slow heartbeat at the last sliver. OFF: only the struck-while-low surge shows (the sane pick for 1/1-life or heavy-reservation builds).">${s.lowLifePulse ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Ailment Screen Effects</span>
        <button id="opt-affliction" title="Blood drips, rising kindling, poison haze, mire and befuddlement appear together, each scaling with its own severity. STILL stops their motion; OFF hides these layers. Status icons, body effects, frost, stun and the separate low-life pulse keep their own behavior.">${s.afflictionOverlays.toUpperCase()}</button>
      </div>
      <div class="rebind-row">
        <span>Faintness Frame-Falter</span>
        <button id="opt-falter" title="While light-headed (faintness / a swoon), the picture itself deliberately skips: brief, simulated lag spikes, on purpose: your hero's head is going light, so your frames seem to. The game underneath never stutters (movement, casts and co-op keep running at full rate). OFF for comfort or motion sensitivity; the grey pall still shows.">${s.statusFalter ? 'ON' : 'OFF'}</button>
      </div>
      </section>
      <section class="options-section"><h2>Dialogue & Memory reveals</h2>
      <div class="rebind-row">
        <span>NPC Talk Typing</span>
        <button id="opt-speechtyping" title="Townsfolk tell their talk-bubble lines glyph by glyph, as if speaking. OFF shows each line whole at once: same words, no wait.">${s.speechTyping ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Vault Memory Reveals</span>
        <button id="opt-memoryreveal" title="CINEMATIC reveals each Memory with a skippable animation. INSTANT unlocks immediately; View last result remains available in the Vault.">${s.memoryReveal === 'instant' ? 'INSTANT' : 'CINEMATIC'}</button>
      </div>
      <div class="rebind-row">
        <span>Autoplay Memory Skill Previews</span>
        <button id="opt-memorypreview" title="Automatically play the unlocked skill on the reveal screen. Reduced-motion preferences always require pressing Play.">${s.memoryPreview ? 'ON' : 'OFF'}</button>
      </div>
      </section>`,
  },
  news: {
    label: 'Notifications',
    render: ({settings:s}: OptionsContext) => `
      <section class="options-section"><h2>World news</h2>
      <div class="rebind-row">
        <span>World News Time</span>
        <span class="pad-opt"><input type="range" id="opt-noticesec" min="${NOTICE_CFG.secMin * 10}" max="${NOTICE_CFG.secMax * 10}" step="5"
          value="${Math.round(s.noticeSec * 10)}"
          title="How long each world-news line stands in the screen feed: held legible, then fading out by this clock. Every line runs its own timer, and the stack keeps the newest on top so nothing overprints."> <b id="val-noticesec">${s.noticeSec.toFixed(1)}s</b></span>
      </div>
      <div class="rebind-row">
        <span>World News Position</span>
        <button id="opt-noticeanchor" title="${NOTICE_ANCHORS.map(a => `${a.label}: ${a.blurb}`).join('\n')}">${(NOTICE_ANCHORS.find(a => a.id === s.noticeAnchor) ?? NOTICE_ANCHORS[0]).label.toUpperCase()}</button>
      </div>
      <div class="rebind-row">
        <span>News Channels</span>
        <span>${noticeChannels().map(c =>
          `<button data-notice-ch="${c.id}" aria-pressed="${noticeChannelOn(s.noticeChannels,c.id)}" title="${c.blurb}" style="margin-left:5px;${noticeChannelOn(s.noticeChannels, c.id)
            ? 'border-color:var(--gold);color:var(--gold)' : 'opacity:0.55'}">${c.label}</button>`).join('')}</span>
      </div>
      </section>
      <section class="options-section"><h2>Combat & pickups</h2>
      <div class="rebind-row">
        <span>Battlefield Text</span>
        <span>${floatKinds().map(k =>
          `<button data-float-kind="${k.id}" aria-pressed="${floatKindOn(s.floatKinds,k.id)}" title="${k.blurb}" style="margin-left:5px;${floatKindOn(s.floatKinds, k.id)
            ? 'border-color:var(--gold);color:var(--gold)' : 'opacity:0.55'}">${k.label}</button>`).join('')}</span>
      </div>
      <div class="rebind-row">
        <span>Support ready message</span>
        <button id="opt-supportready" title="Show a message in Skills when supports can be changed. Restrictions remain visible either way.">${s.supportReadyHint ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Pickup Feed (right flank)</span>
        <button id="opt-pickupfeed" title="Lists exactly what entered your bags ('Warcry (Common) x1') stacked on the right where the inventory opens, coalescing repeat grabs into one row. Drawn beneath every panel: an open inventory always covers it, never the reverse.">${s.pickupFeed ? 'ON' : 'OFF'}</button>
      </div>
      <div class="rebind-row">
        <span>Pickup Feed Time</span>
        <span class="pad-opt"><input type="range" id="opt-pickupsec" min="${PICKUP_FEED_CFG.secMin * 10}" max="${PICKUP_FEED_CFG.secMax * 10}" step="5"
          value="${Math.round(s.pickupFeedSec * 10)}"
          title="How long each pickup row stands before it fades (a repeat grab refreshes its row's clock)."> <b id="val-pickupsec">${s.pickupFeedSec.toFixed(1)}s</b></span>
      </div>
      </section>`,
  },
  saves: {
    label: 'Save data',
    render: ({pending,note}: OptionsContext) => `
      <section class="options-section"><h2>Transfer saves</h2>${saveRows(pending,note)}</section>`,
  },
};
export type OptionsTab = keyof typeof OPTIONS_TABS;

/** Give each setting its visible row name, including switches whose face only says On or Off. */
export function labelOptionControls(panel: HTMLElement): void {
  const rows = panel.querySelectorAll('.rebind-row');
  rows.forEach((row,index) => {
    const label = row.firstElementChild;
    if (!label) return;
    label.id ||= panel.id+'-label-'+index;
    const controls = row.querySelectorAll<HTMLElement>('button,input,select');
    if (controls.length > 1) {
      row.setAttribute('role','group'); row.setAttribute('aria-labelledby',label.id);
    } else if (controls.length === 1) {
      const control = controls[0];
      control.id ||= label.id+'-control';
      control.setAttribute('aria-labelledby',control.tagName === 'BUTTON' ? label.id+' '+control.id : label.id);
    }
  });
}

export function optionsNavigation(tab: OptionsTab, rootId: string): string {
  return `<nav class="book-tabs options-tabs" role="tablist" aria-label="Options">${Object.entries(OPTIONS_TABS).map(([id,entry]) =>
    `<button type="button" class="book-tab${tab === id ? ' active' : ''}" role="tab" data-opttab="${id}" id="${rootId}-tab-${id}" aria-controls="${rootId}-options-page" aria-selected="${tab === id}" tabindex="${tab === id ? 0 : -1}">${entry.label}</button>`).join('')}</nav>`;
}
