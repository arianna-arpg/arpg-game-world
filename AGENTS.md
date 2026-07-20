# AGENTS.md — Hollow Wake (ARPG)

Guidance for AI coding agents (Codex, etc.) working in this repository.

**Read [CLAUDE.md](CLAUDE.md) — it is the single source of truth** for the
project map, commands, verification harnesses, and commit conventions. It is
maintained continuously; this file deliberately duplicates none of it, because
a copy would only drift stale.

Agent-specific notes:

- Verify before committing: `npm run check` (game + launcher + sim
  type-checks), plus the harness the change touches — `npm run sim -- run
  --suite smoke` for `src/data/`, `npm run genqa` for generation,
  `npm run smoke` / `npm run smoke:launcher` for boot/launcher code.
  `npm run review:context` prints a change summary with suggested checks.
- For cross-model review work, follow `docs/ai/CROSS_MODEL_REVIEW.md`
  (the review-card protocol; agent recipe in
  `.claude/agents/cross-model-reviewer.md`).
- Machine-specific settings belong in `.claude/settings.local.json`
  (gitignored). Never commit `node_modules/`, `dist/`, `saves/`, or
  `release/`.
