/**
 * What a support gem should be worth, set by the owner on 2026-11-01: on average, about a
 * 10 to 15% damage multiplier at the end of the day, to keep stacked gems from growing
 * exponentially. It is a target for tuning numbers, not a rule the engine enforces, and a gem
 * with another job can sit outside it. The balance farm measures every gem against it, and
 * an effect that could otherwise run away takes its ceiling from it (Echoing Might).
 */
export const SUPPORT_POWER_TARGET = { low: 1.1, high: 1.15 };
