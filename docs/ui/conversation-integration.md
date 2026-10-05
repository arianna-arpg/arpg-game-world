# Conversations and native actions

Active conversations retain their speaker while the player remains within that
speaker's native reach and story/floor rules. Crossing another NPC with the
pointer cannot steal an already open conversation. Closing or leaving releases
that ownership. Pause and unrelated menus suspend the reader; services and the
local inventory can accompany it. World/scene changes and death clear the owner.

The reader offers only actions belonging to its live speaker: optional work,
Mireille's pending flasks, reward choices, and deferred imbues. Reward availability
selects the reward activity on arrival instead of forcing the Journal over the
conversation. Existing Journal access and bubble-mode fallback remain available.
Only an action activity expands the reader. Inventory/services reserve the same
bounds, and Back returns to the text. Keyboard, mouse and the normal controller
pointer use these actual controls. Imbue item details and long lists scroll.

NpcConversationUI is an adapter, not a second progression system. It dispatches
ordinary learn/questAccept/questReward/questImbue commands; native reach, host,
capacity, eligibility, once-only payout and saved offer validation still apply.
Offers are attributed through quest giver definitions and actual actor ids.
Completed actions refresh changed instructions without changing speakers.
Reward amounts, Vault unlock rules, skill pools and quest balance are unchanged.

Silhouette emphasis now uses a 280-unit radius, a 120-degree forward cone,
soft distance/angular edges, native threat eligibility and line of sight. The
existing renderer still governs visibility and wall concealment. This is visual
focus, without changing aim assistance, AI or attack selection.

## Verification

- Frozen r58 client reproduces Brandt losing its active focus when a pointer
  crosses another eligible NPC; the new client retains the same speaker/page.
- conversation-integration-ui.cjs uses an isolated preview profile, native gifts,
  real action buttons, a controlled native garrison completion, once-only payout,
  narrow/scaled layouts, controller selection and exact Save/Continue.
- dialogue-services-ui.cjs covers service dwell, trades, suite tabs, inventory,
  dismissal, pause, roof reach, controller use and player-positioned windows.
- body-contrast-ui.cjs compares actual body pixels against disabled rendering,
  including behind/side/range/threat exclusions and wall concealment.
- Engine probes cover native ownership, departure, speaker attribution, quest
  persistence, full-pack refusal, lesson graduation and deferred Brandt rewards.

These are controlled integration checks, not a fresh ordinary-input playthrough.
Generated screenshots and reports stay under ignored balance/reports/.

## Scope of later passes

Continue with world continuity, encounters, travel, progression and gameplay.
Keep the deliberate classic passive tree and saved optional explanatory captions.
Review additional UI changes individually against the branch audit rather than
adding more standing guidance. Starting-pool and Vault progression work remains
a separate content decision.
