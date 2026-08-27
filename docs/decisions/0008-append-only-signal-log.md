# 0008: Append-only signal log with reasoning as a first-class artifact

## Status

Accepted (Milestone 2, 2026-08-27)

## Context

The primary goal is a system worth watching ([`docs/goals.md`](../goals.md)), and the thing that
makes an LLM trader worth watching rather than a rules engine is that it can say _why_. If the
rationale is a debug log line, that value is thrown away.

There is a second, harder reason. Because backtesting is unavailable
([ADR 0004](./0004-no-llm-backtests.md)), the forward record **is** the entire evidence base. If
signals can be edited or overwritten, the evidence base is not trustworthy, and the project has no
way to answer any question about its own behaviour.

Alternatives considered:

1. **Log rationale as text, store the decision as structured data.** Rejected — the two drift, and
   joining a log line to a trade after the fact is guesswork.
2. **Mutable signals updated as new information arrives.** Rejected — destroys the record of what
   was believed at decision time, which is the only thing worth measuring.
3. **Append-only signals with mandatory provenance.** Chosen.

## Decision

1. **Signals are append-only.** No updates, no deletes. A changed view is a new signal that
   references its predecessor.
2. **`rationale` and `sourceIds` are non-nullable.** A signal that cannot name the documents that
   caused it fails schema validation. This is enforced in the Zod schema, so it cannot be bypassed.
3. **Raw source documents are immutable and content-hashed**, stored before any processing. The
   trail from a trade back to the exact bytes the analyst read must never break, even if the
   original URL rots or is edited.
4. **Analyst identity is recorded per signal** — model id plus prompt version. Without it, the
   scoreboard cannot attribute anything, and a prompt change silently contaminates the history.
5. **Outcomes are written once**, to a separate `signal_results` table, when the horizon elapses.
   Predictions and outcomes never share a row.
6. **Gate decisions are stored on the same terms**, accept and reject alike, with reasons. Rejections
   are part of the record, not exhaust.
7. **The reasoning trail is a UI surface**, not a debugging affordance. Every trade in the dashboard
   expands to sources → rationale → proposal → gate decision → fill.

## Consequences

- The signal table grows monotonically. Fine at Sonde's volume; partition by month if it ever is not.
- Storage cost is higher because raw documents are retained. Cheap, and it buys full replayability.
- Any pipeline change can be re-run against the exact historical inputs, and the two runs compared.
  This is what makes shadow analysts (Milestone 7) possible.
- Requiring `sourceIds` constrains prompt design: analysts must return document references, and
  those references must be validated against documents actually supplied. A model citing a source it
  was not given is a caught error rather than a silent fabrication.
- The audit trail is complete by construction, so "why did it do that?" is always answerable.

## Milestones touched

- Milestone 2 (Opinion)
- Milestone 3 (Scorekeeping)
- Milestone 7 (Iterate)

## References

- [`docs/architecture.md`](../architecture.md) — Storage
- [ADR 0004](./0004-no-llm-backtests.md)
