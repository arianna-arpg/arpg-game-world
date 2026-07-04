// ---------------------------------------------------------------------------
// SETTINGS — player-customizable keybinds, persisted independently.
//
// One map from ACTION → key. Movement, the six rebindable skill slots (bar
// slots 2–7; slots 0/1 are LMB/RMB and fixed), and the panel toggles are all
// remappable. ESCAPE is deliberately NOT an action — it is hardwired to open
// the menu so you can never lock yourself out of rebinding. Lives in its own
// localStorage key; wipes to defaults on schema mismatch (no migration).
// ---------------------------------------------------------------------------

export const SETTINGS_SCHEMA_VERSION = 1;

export type ActionId =
  | 'moveUp' | 'moveDown' | 'moveLeft' | 'moveRight'
  | 'skillSlot2' | 'skillSlot3' | 'skillSlot4' | 'skillSlot5' | 'skillSlot6' | 'skillSlot7'
  | 'metaModifier'
  | 'panelChar' | 'panelBook' | 'panelTree' | 'panelMap';

export interface Settings {
  schemaVersion: number;
  keybinds: Record<ActionId, string>;
  /** The continuous low-life edge pulse (severity-scaled). OFF is a real
   *  build choice: a 1/1-life or 90%-reserved hero would otherwise live
   *  inside a permanent alarm. */
  lowLifePulse: boolean;
}
export interface SettingsSave {
  schemaVersion: number;
  keybinds: Record<string, string>;
  lowLifePulse?: boolean;
}

export const DEFAULT_KEYBINDS: Record<ActionId, string> = {
  moveUp: 'w', moveDown: 's', moveLeft: 'a', moveRight: 'd',
  skillSlot2: '1', skillSlot3: '2', skillSlot4: '3',
  skillSlot5: '4', skillSlot6: '5', skillSlot7: '6',
  metaModifier: 'shift',
  panelChar: 'c', panelBook: 'b', panelTree: 'p', panelMap: 'm',
};

export const ACTION_IDS = Object.keys(DEFAULT_KEYBINDS) as ActionId[];

/** Human labels for the rebind UI, in display order. */
export const ACTION_LABELS: Record<ActionId, string> = {
  moveUp: 'Move Up', moveDown: 'Move Down', moveLeft: 'Move Left', moveRight: 'Move Right',
  skillSlot2: 'Skill 3', skillSlot3: 'Skill 4', skillSlot4: 'Skill 5',
  skillSlot5: 'Skill 6', skillSlot6: 'Skill 7', skillSlot7: 'Skill 8',
  metaModifier: 'Meta-Skill Modifier',
  panelChar: 'Character Sheet', panelBook: 'Skill Book', panelTree: 'Passive Tree', panelMap: 'World Map',
};

export const makeSettings = (): Settings => ({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  keybinds: { ...DEFAULT_KEYBINDS },
  lowLifePulse: true,
});

export const serializeSettings = (s: Settings): SettingsSave => ({
  schemaVersion: s.schemaVersion,
  keybinds: { ...s.keybinds },
  lowLifePulse: s.lowLifePulse,
});

/** null ⇒ schema mismatch → caller wipes. Unknown/partial keybinds fall back
 *  to the default per-action, so a partial save still yields a complete map. */
export function deserializeSettings(s: SettingsSave): Settings | null {
  if (!s || s.schemaVersion !== SETTINGS_SCHEMA_VERSION) return null;
  const keybinds = { ...DEFAULT_KEYBINDS };
  for (const a of ACTION_IDS) if (s.keybinds?.[a]) keybinds[a] = s.keybinds[a];
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION, keybinds,
    lowLifePulse: s.lowLifePulse ?? true,
  };
}
