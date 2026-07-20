# Cross-model review relay

Use this protocol when Claude and Codex should independently interrogate the
same change. It is deliberately a review relay, not an autonomous connection:
the durable conversation lives in a GitHub pull-request comment (preferred) or
a committed review note. That keeps every conclusion tied to an exact commit
and makes disagreements visible to the human owner.

## Guardrails

- Both reviewers begin from the same base and commit. Run
  `npm run review:context` and attach its output to the review card.
- Treat working-tree edits as user-owned unless explicitly asked to modify
  them. Reviewers do not commit, push, or alter settings as part of review.
- A reviewer labels evidence as **observed**, **inferred**, or **unknown**.
  “I would change this” is not evidence by itself.
- The author remains the decision-maker. The relay resolves disagreement by
  recording it, not by silently choosing a side.

## Preferred GitHub handoff

Open (or use) the pull request for the branch and post the following Markdown
as a comment. Include the marker exactly; it makes the note easy for the other
assistant to find with GitHub search or the GitHub connector.

```md
<!-- cross-model-review:v1 -->
## Cross-model review card

**Reviewer:** Claude | Codex
**Role:** implementation audit | adversarial review | design audit
**Commit reviewed:** `<full SHA>`
**Base reviewed:** `origin/main @ <full SHA>`

### Context
Paste `npm run review:context` here.

### Findings
| Priority | Observation | Evidence | Suggested action |
| --- | --- | --- | --- |
| P0–P3 | | file/line, command output, or reproducible path | |

### Blind-spot pass
- What assumption in the implementation is least tested?
- What user-visible failure would the existing checks miss?
- What data, save, networking, performance, or rendering contract could drift?

### Questions for the counterpart
1. 
2. 

### Verification actually run
- [ ] command — result

### Confidence and unknowns
```

The counterpart replies beneath that card with a new card and must address
each open question. A short final owner comment should state one of: **accept**,
**fix**, **defer**, or **need reproduction**, with the commit it applies to.

## Local-only fallback

If GitHub comments are unavailable, create a temporary, explicitly requested
review note under `docs/ai/reviews/` and commit it with the work being
reviewed. Do not create one automatically: review notes are project history,
not scratch files.

## Portable reviewer prompt

Give either assistant this prompt:

> Act as the cross-model reviewer for this repository. Read
> `docs/ai/CROSS_MODEL_REVIEW.md`, run `npm run review:context`, inspect the
> actual changed code and its nearest contracts, then write one review card.
> Do not modify production files. Challenge the other reviewer’s assumptions
> with evidence, prioritize defects that current checks would miss, and state
> uncertainty plainly.

For a strong complementary pair, ask Claude to lead with architecture and
player-experience risks, and ask Codex to lead with type, state-transition,
verification, and repository-consistency risks. Then swap the focus for a
second pass when a change is high risk.
