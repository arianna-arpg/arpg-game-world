# Damage number display

Options → Visuals → **Damage Number Display** switches between **SEPARATE**
(the default, including older saves) and **SUMMED**. The preference persists
independently of the character. Damage-number visibility and body avoidance
continue to apply.

Summed mode combines numeric damage popups on the same actor, regardless of
skill, attacker or damage type. Each popup arriving within 0.75 seconds of the
previous one extends the total. A longer gap starts a new total. Targets never
share totals, even when standing in the same place. The number stays at the
latest damage location while the burst continues, then rises and fades.
Healing, rewards and outcome captions remain independent.

A lone hit keeps its original color and size. Combined totals use a neutral
style so a critical hit cannot make an entire mixed total appear critical.
Underlying numeric amounts are added before rounding for display.

This sums the existing damage-popup stream, including its existing batched
DoT amounts and timing. It is not a DPS meter or a replacement combat ledger;
it does not change damage calculation, mitigation, rewards or attribution.

## Extension contract

- `src/world/damageText.ts` owns `DAMAGE_TEXT_CFG` (default mode, rolling gap,
  placement and combined style), typed receipts and transient per-target bursts.
  Keep the gap shorter than the ordinary one-second popup lifetime.
- Numeric damage producers call `World.damageText(target, amount, color, size,
  kind, at)`. Existing individual formatting, kind, placement and RNG draws
  are retained. Non-damage text continues through `World.text`; no text is
  parsed to guess whether it is damage. The optional `damage` receipt on
  `World.text` can also accompany an explicitly attributed custom format.
- Each immutable receipt carries the cumulative amount, burst/target identity,
  count and latest target location. Expired raw popups do not erase accumulated
  damage. Bookkeeping expires after idle gaps and clears on zone changes.
- `src/render/vis/damageText.ts` projects the latest receipt of each burst into
  one popup. Separate mode returns the original list unchanged. No renderer
  accumulation means repeated renders and repeated snapshots are safe.
- Co-op copies the optional receipt with each `TextW`. Each viewer chooses
  their own display mode; older hosts without receipts use individual popups.
  No settings or run-save schema bump is needed.

Verification: `npm run check`, `npm run probe -- damagetext`, and the related
`infostream` and `combatcues` probes. Build to
`balance/reports/damage-text-dist`, then run the hidden client walkthrough with
`npx electron balance/damage-text-ui.cjs` for actual option clicks, persistence,
canvas output in both modes, refresh/fade, damage mute and body avoidance.
