# Damage number display

Options → Visuals has three independent controls. **Damage Number Display** defaults to **Separate**, which shows one number per payout. **Summed** shows a running total above each target. **Damage Number Size** scales both modes from 60% to 180% in 5% steps. At 100%, summed numbers use a 12 px font. **Damage Effect Labels** defaults to off. Turn it on to see the skill or effect beside each individual number, or a subtotal per effect in Summed mode.

Numbers hold at full opacity for 0.3 seconds and fade smoothly for 0.9 seconds. A hit at any point during that fade updates the same total and restores full opacity. After the total disappears, the next hit starts from zero. With effect labels on, each subtotal has its own lifetime and vertical position. Healing, rewards and other captions have their own display controls. These preferences are saved per viewer and can change during combat.

## Adding damage feedback

Use `World.damageText(target, amount, color, size, source, at?)` for a numeric payout. Pass the unrounded amount and the player-facing skill or effect name. Custom numeric formats can use `World.text` with the same damage receipt. Status ticks share their existing batching interval and retain each ailment's contribution.

`src/world/damageText.ts` owns the timing, size range, total style and transient per-target bookkeeping. Each receipt records the precise cumulative target and source totals. The renderer selects the latest live receipt for each displayed total, so expired individual hits, repeated draws and duplicate co-op snapshots preserve the sum. Clients receiving older snapshots without receipts show the original popups.

Run `npm run check` and the `damagetext`, `infostream` and `combatcues` probes. For the in-client walkthrough, build to `balance/reports/damage-text-dist` and run `npx electron balance/damage-text-ui.cjs`.
