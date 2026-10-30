# Save and exit destinations

The pause menu's **Save & Exit** opens a destination prompt: **Exit to Main
Menu**, **Exit to Desktop**, or **Back**. Opening or cancelling the prompt
does not save, forfeit, or end the run. The existing **End Run** action keeps
its separate, destructive confirmation. Scenes and network clients use
**Exit Game**, without promising a character save they do not own.

`src/ui/exitMenu.ts` owns the destination ids, labels and hints. `UI.onSaveExit`
hands the selected id to the shell in `src/main.ts`; panels never call the
engine's destructive `endRun()` for this prompt.

The shell captures the live host character and couch vessels through the
existing persistence owners, stops further simulation, waits for pending disk
writes, and then uses `toStartMenu()` for transport and panel cleanup. That
shared menu transition refreshes the mortal Continue snapshot. Roster Continue
can immediately read the newest disk save. Scenes retain their account state
without serializing the tutorial/Mu world; clients leave without writing their
render shell; dead runs are never resurrected by this action.

`flushPendingDiskSaves()` tracks the existing fetch writers without changing
save formats, slot routing, ordering, autosave cadence, or static-host
localStorage fallback. Ordinary window/tab closes retain the unload beacon
path. The explicit exit waits before shutting down the desktop save server.

`launcher/game-preload.cjs` adds `hollowWakeDesktop.quit()` beside the existing
release save identity and offline status. No launcher-management API is exposed. The launcher
accepts it only from the current game's main frame, and quits the application
without reopening the launcher. Closing the window through its ordinary window
controls still follows the configured `returnToLauncher` policy. The same
preload exposes the performance beat only with the harness's explicit flag.

Browsers attempt to close their tab. If blocked, the saved game remains at a
**Safe to Close** screen with a Back button to the main menu. The start menu's
existing Exit Game button uses the same platform exit and pending-write wait.

Verify `npm run check`, `npx tsx balance/probe_savewriteorder.ts`, and the game
and launcher boot smoke checks. After an isolated build, run
`npx electron balance/save-exit-ui.cjs` with `HOLLOW_WAKE_QA_DIST` pointing to
that build. CI includes it in `test:reliability:ui`. The hidden acceptance uses isolated storage and covers cancellation,
mortal Continue, browser close refusal, scene/client save isolation, delayed
roster saves, and the real desktop preload's quit request after writes finish.
