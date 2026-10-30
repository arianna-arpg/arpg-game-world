/** Pause-menu destinations. Presentation stays separate from the shell's save
 * and session lifecycle; adding a destination requires an explicit host verb. */
export type SaveExitDestination = 'main-menu' | 'desktop';

export const SAVE_EXIT_DESTINATIONS: readonly {
  id: SaveExitDestination;
  label: string;
  hint: string;
}[] = [
  { id: 'main-menu', label: 'Exit to Main Menu', hint: 'Return to the title screen.' },
  { id: 'desktop', label: 'Exit to Desktop', hint: 'Close the game. In a browser, you may need to close the tab yourself.' },
];

declare global {
  interface Window {
    /** The desktop preload exposes only the explicit quit capability. */
    hollowWakeDesktop?: { quit: () => void };
  }
}

/** Browsers may refuse close(); callers retain a safe-to-close screen. */
export function requestAppExit(): void {
  if (window.hollowWakeDesktop) window.hollowWakeDesktop.quit();
  else window.close();
}
