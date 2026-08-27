# 0003: Paper and testnet execution only, until an explicit live gate

## Status

Accepted (Milestone 0, 2026-08-27)

## Context

Sonde is autonomous by design, LLM-driven, and its primary stated goal is to be interesting to
operate rather than profitable ([`docs/goals.md`](../goals.md)). Those three facts together mean
real capital should not be reachable by default.

The usual failure mode is not a dramatic one. It is a boolean flag that starts as `false`, gets
flipped during debugging, and never gets flipped back — with no record that a decision was ever
made.

There is also a second argument, independent of safety: venue fees are one of the few costs in this
project we can drive to exactly zero, and doing so lets the entire cost model focus on inference
(see [`docs/architecture.md`](../architecture.md)).

## Decision

1. **Execution is paper/testnet-only.** `SONDE_EXECUTION_MODE` must equal the literal string
   `paper`. The venue adapter refuses to construct in any other mode.
2. **Live trading is not a config change.** It requires:
   - a new ADR superseding this one, stating the capital at risk as a sum that can be lost entirely;
   - risk-gate limits denominated in that sum;
   - a completed Milestone 5 exit criterion — an unattended week with a legible audit trail;
   - a resolved-signal track record from Milestone 3 that is at minimum not negative.
3. **Live credentials never enter the repository or `.env.example`.** The example file ships with
   `paper` hard-coded and no key fields for a live venue.
4. **Paper results are labelled as paper everywhere they are displayed.** No chart in the dashboard
   shows a P&L figure without the mode alongside it.

## Consequences

- Simulated fills are optimistic: no partial fills, no market impact, no queue position. A paper
  result is an upper bound, not an estimate. The dashboard says so.
- Some venue behaviour cannot be exercised on testnet — rejections, throttling under load, exotic
  order states. These are stubbed in tests rather than discovered live.
- Zero venue cost, so the budget in `architecture.md` is entirely inference.
- Going live becomes a documented event with a date and a rationale, which is the point.

## Milestones touched

- Milestone 0 (Pipe)
- Milestone 5 (Hands)

## References

- [`docs/goals.md`](../goals.md) — non-goals
- [`docs/roadmap.md`](../roadmap.md) — Beyond
- [ADR 0005](./0005-llm-proposes-code-disposes.md)
