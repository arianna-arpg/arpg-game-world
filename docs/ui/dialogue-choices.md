# Dialogue responses and actions

[Dialogue](dialogue.md) is the canonical reading/input contract. Responses extend
the same reader; they do not create a separate quest UI or progression system.

## One transition owner

`DialogueSession` in `src/engine/dialogue.ts` owns page advancement, branch
selection, pending content and completion. Every input reaches those methods.
The presentation owns typing/reveal and never selects a response implicitly.

A `DialogueOffer` contains a stable content key, speaker, introductory pages,
optional final-page `choices`, and optional named `nodes`. Each node contains
pages and optional choices. A choice has a stable `id`, visible `label`, optional
`next` node, optional `action`, and optional `disabledReason`.

- Responses appear only after the node's final page is revealed.
- Ordinary advance waits for a response; it never chooses the first answer.
- An accepted choice follows `next`, or completes the exchange if it has no
  destination. A text-only response needs no action handler.
- The session revision identifies the exact state that displayed the buttons.
  Stale, duplicate, disabled, ambiguous or invalid-destination selections cannot
  execute an action. A reentrant action cannot select twice.
- A refused action leaves the same question open. Preview does not authorize
  execution: the action handler rechecks live conditions on selection.
- New functional text waits behind the conversation, including its branches.
  Dismissal, departure or a scene reset cancels reading without executing any
  unselected response. Dismissal includes queued text.
- Existing speaker admission, focus, cooldown, suspension and local ownership
  still apply. The framework adds no automatic rewards or save mutations.

## Authoring

`NpcDialogueDef.responses` attaches responses to an existing authored NPC line.
The director supplies the stable script identity; the same name/bind resolver
and pagination rules process introductory text, response labels and branch pages.
Example fragment for a future NPC definition:

```ts
responses: {
  choices: [
    { id: 'wares', label: 'Show me your wares.', action: { type: 'menu', target: 'vendor' } },
    { id: 'quests', label: 'Let us discuss my work.', action: { type: 'menu', target: 'journal' } },
    { id: 'listen', label: 'I would like to hear your story.', next: 'story' },
    { id: 'leave', label: 'Until next time.' },
  ],
  nodes: {
    story: {
      pages: ['An authored reply goes here.'],
      choices: [{ id: 'thanks', label: 'Thank you for telling me.' }],
    },
  },
}
```

The example is not automatically applied to Brandt or other NPCs. Existing
service dwell and quest offerings keep their behavior until a content change
deliberately adopts response-driven interaction.

## Action authority

`DialogueActions` in `src/engine/dialogueActions.ts` is an extensible registry of
`type` → `refusal` / `run`. Actions carry serializable type and target ids, not
scripts. Duplicate registrations fail; unknown types remain unavailable.
`main.ts` composes the registry with the UI. The initial `menu` handler activates
an entry from the existing menu registry through its existing verb and live
unlock/reach/seal checks. Dialogue contains no parallel station list.
Handlers receive the current world, owning player, speaker, offer key, node id
and choice id so outcomes can retain the provenance of the selected response.

Future quest/alignment/reputation actions should name an authored outcome as
their target and dispatch through the responsible engine's validated command.
That system must own durable receipts, attribution, saves, multiplayer authority
and rejection rules. A reader revision prevents duplicate input in this reading
session; it is **not** an account-wide once-only progression receipt. Do not
award rewards or write alignment ledgers in DOM listeners or text rendering.

## Input and verification

Mouse/touch/controller activation chooses the actual response button. Keyboard
Up/Down/Home/End focuses available responses; Enter/Space activates the focused
button. Generic advance cannot answer for the player. Choice controls live in
the reader's scrolling body; its fixed band, close control and station anchors
remain unchanged. The existing controller pointer also operates standalone
response prompts.

Verify `npm run check`, the `speech`, `townwelcome` and `menubar` probes, and
`balance/dialogue-ui.cjs` / `balance/dialogue-services-ui.cjs` after a build.
The probes cover branch identity, pending state, stale/refused selections,
authoring and text resolution. The UI harness covers native surface clicks,
explicit responses, live service gates, focused keyboard activation, controller
selection, cancellation and normal reading/service coexistence.
